// Simple worker.js with minimal safe logging
import opencascade from "replicad-opencascadejs/src/replicad_single.js";
import opencascadeWasm from "replicad-opencascadejs/src/replicad_single.wasm?url";
import { setOC } from "replicad";
import { expose } from "comlink";

// Import our model registry
import { modelRegistry, createModelWithValidation } from "./models";
import { createOrthographicProjections, processProjectionsForRendering } from "./helpers/technicalDrawing.js";

// Initialize OpenCascade
let loaded = false;
const init = async () => {
  if (loaded) return Promise.resolve(true);

  const OC = await opencascade({
    locateFile: () => opencascadeWasm,
  });

  loaded = true;
  setOC(OC);

  return true;
};
const started = init();

// Function to create orthographic projections for technical drawings
function createProjections(modelName, params) {
  console.log(`[LOG] createProjections called for model: ${modelName}`);
  console.time(`[PERF] Total ${modelName} projections creation`);
  
  return started.then(() => {
    // Create model
    const result = createModelWithValidation(modelName, params);
    
    // Check if validation failed
    if (result && result.error) {
      return {
        error: true,
        validationErrors: result.validationErrors
      };
    }
    
    // Create orthographic projections
    console.time(`[PERF] ${modelName} projections generation`);
    const projections = createOrthographicProjections(result);
    console.timeEnd(`[PERF] ${modelName} projections generation`);
    
    // Process projections for rendering
    console.time(`[PERF] ${modelName} projections processing`);
    const processedProjections = processProjectionsForRendering(projections);
    console.timeEnd(`[PERF] ${modelName} projections processing`);
    
    console.timeEnd(`[PERF] Total ${modelName} projections creation`);
    
    // Pass component data if available (for BOM)
    if (result && result.componentData) {
      // Filter out any non-serializable properties before passing
      const serializedComponentData = result.componentData.map(component => ({
        id: component.id,
        name: component.name,
        quantity: component.quantity,
        dimensions: component.dimensions,
        material: component.material
      }));
      processedProjections.componentData = serializedComponentData;
    }
    
    return processedProjections;
  });
}

// Generic function to create a mesh for any model
function createMesh(modelName, params) {
  console.time(`[PERF] Total ${modelName} creation`);
  
  return started.then(() => {
    console.time(`[PERF] ${modelName} model function`);
    // Use the new validation and creation function
    const result = createModelWithValidation(modelName, params);
    console.timeEnd(`[PERF] ${modelName} model function`);
    
    // Check if validation failed
    if (result && result.error) {
      return {
        error: true,
        validationErrors: result.validationErrors
      };
    }
    
    // Handle if the result includes both main model and helper spaces
    if (result && result.main && Array.isArray(result.helperSpaces)) {
      const mainModel = result.main;
      const helperSpaces = result.helperSpaces;
      
      // Apply universal tessellation parameters to all models
      // This controls the precision vs performance tradeoff
      const meshOptions = { 
        tolerance: 0.1,          // Maximum distance between real surface and its triangulation
        angularTolerance: 15     // Maximum angle between adjacent segments (in degrees)
      };
      
      // Generate main model mesh
      console.time(`[PERF] ${modelName} main model generation`);
      const faces = mainModel.mesh(meshOptions);
      const edges = mainModel.meshEdges(meshOptions);
      console.timeEnd(`[PERF] ${modelName} main model generation`);
      
      // Generate helper spaces meshes
      console.time(`[PERF] ${modelName} helper spaces generation`);
      const helperMeshes = helperSpaces.map(helper => {
        return {
          faces: helper.mesh(meshOptions),
          edges: helper.meshEdges(meshOptions)
        };
      });
      console.timeEnd(`[PERF] ${modelName} helper spaces generation`);
      
      console.timeEnd(`[PERF] Total ${modelName} creation`);
      
      // Return both main model and helper spaces
      return {
        faces: faces,
        edges: edges,
        helperSpaces: helperMeshes,
        componentData: result.componentData
      };
    }
    
    // Regular case - just a single model
    // Apply universal tessellation parameters
    const meshOptions = { 
      tolerance: 0.1,
      angularTolerance: 15
    };
    
    // Generate and time mesh operations
    console.time(`[PERF] ${modelName} faces generation`);
    const faces = result.mesh(meshOptions);
    console.timeEnd(`[PERF] ${modelName} faces generation`);
    
    if (faces && faces.triangles) {
      console.log(`[INFO] ${modelName} triangles: ${faces.triangles.length/3}, vertices: ${faces.vertices.length/3}`);
    }
    
    console.time(`[PERF] ${modelName} edges generation`);
    const edges = result.meshEdges(meshOptions);
    console.timeEnd(`[PERF] ${modelName} edges generation`);
    
    console.timeEnd(`[PERF] Total ${modelName} creation`);
    
    // Return the mesh data
    return {
      faces: faces,
      edges: edges,
      componentData: result.componentData
    };
  });
}

// Export the functions needed
expose({ createMesh, createProjections });