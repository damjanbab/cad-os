// Worker for main app tasks (mesh generation, projections)
import opencascade from "replicad-opencascadejs/src/replicad_single.js";
import opencascadeWasm from "replicad-opencascadejs/src/replicad_single.wasm?url";
import { setOC } from "replicad";
import { expose } from "comlink";

// Import our model registry
import { modelRegistry, createModelWithValidation } from "./models";
// Removed imports for technical drawing processor functions

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

// REMOVED createProjections function - moved to technicalDrawing.worker.js

// Generic function to create a mesh for any model
function createMesh(modelName, params, quality = 'standard') { // Add quality parameter
  console.time(`[PERF] Total ${modelName} creation (Quality: ${quality})`);
  
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

    // Determine the primary shape to mesh
    // Prioritize result.main if it exists (handles models returning { main: ..., ... })
    // Otherwise, assume the result itself is the shape.
    const shapeToMesh = (result && result.main) ? result.main : result;

    // Check if the determined shape is valid before meshing
    if (!shapeToMesh || typeof shapeToMesh.mesh !== 'function') {
      console.error("Invalid shape determined for meshing:", shapeToMesh);
      console.timeEnd(`[PERF] Total ${modelName} creation (Quality: ${quality})`);
      return { error: true, message: "Invalid model shape generated." };
    }

    // Handle helper spaces if they exist alongside the main model
    const helperSpaces = (result && result.main && Array.isArray(result.helperSpaces)) ? result.helperSpaces : [];

    // --- Mesh Generation ---
    // Define mesh options based on quality
    const meshOptions = quality === 'high'
      ? { tolerance: 0.01, angularTolerance: 1 } // High quality settings
      : { tolerance: 0.1, angularTolerance: 15 }; // Standard quality settings

    console.log(`[INFO] Using mesh options for ${quality} quality:`, meshOptions);

    // Generate main model mesh (using shapeToMesh)
    console.time(`[PERF] ${modelName} main model generation (Quality: ${quality})`);
    const faces = shapeToMesh.mesh(meshOptions);
    const edges = shapeToMesh.meshEdges(meshOptions);
    console.timeEnd(`[PERF] ${modelName} main model generation (Quality: ${quality})`);

    // Generate helper spaces meshes (if any)
    let helperMeshes = [];
    if (helperSpaces.length > 0) {
      console.time(`[PERF] ${modelName} helper spaces generation (Quality: ${quality})`);
      helperMeshes = helperSpaces.map(helper => {
        // Add safety check for helper shape validity
        if (!helper || typeof helper.mesh !== 'function') {
          console.warn("Skipping invalid helper space shape:", helper);
          return null; // Or return an empty mesh structure
        }
        return {
          faces: helper.mesh(meshOptions),
          edges: helper.meshEdges(meshOptions)
        };
      }).filter(mesh => mesh !== null); // Filter out any nulls from invalid helpers
      console.timeEnd(`[PERF] ${modelName} helper spaces generation (Quality: ${quality})`);
    }

    console.timeEnd(`[PERF] Total ${modelName} creation (Quality: ${quality})`);

    // Return mesh data, including helpers if they existed
    return {
      faces: faces,
      edges: edges,
      helperSpaces: helperMeshes, // Will be empty array if no valid helpers
      componentData: result.componentData // Pass componentData if it exists on the original result
    };


    /* --- Old Logic ---
    // Handle if the result includes both main model and helper spaces
    if (result && result.main && Array.isArray(result.helperSpaces)) {
      const mainModel = result.main;
      const helperSpaces = result.helperSpaces;

      // Define mesh options based on quality
      const meshOptions = quality === 'high' 
        ? { tolerance: 0.01, angularTolerance: 1 } // High quality settings
        : { tolerance: 0.1, angularTolerance: 15 }; // Standard quality settings
      
      console.log(`[INFO] Using mesh options for ${quality} quality:`, meshOptions);

      // Generate main model mesh
      console.time(`[PERF] ${modelName} main model generation (Quality: ${quality})`);
      const faces = mainModel.mesh(meshOptions);
      const edges = mainModel.meshEdges(meshOptions);
      console.timeEnd(`[PERF] ${modelName} main model generation (Quality: ${quality})`);
      
      // Generate helper spaces meshes
      console.time(`[PERF] ${modelName} helper spaces generation (Quality: ${quality})`);
      const helperMeshes = helperSpaces.map(helper => {
        return {
          faces: helper.mesh(meshOptions),
          edges: helper.meshEdges(meshOptions)
        };
      });
      console.timeEnd(`[PERF] ${modelName} helper spaces generation (Quality: ${quality})`);
      
      console.timeEnd(`[PERF] Total ${modelName} creation (Quality: ${quality})`);

      // Return both main model and helper spaces
      return {
        faces: faces,
        edges: edges,
        helperSpaces: helperMeshes,
        componentData: result.componentData
      };
    }

    // Regular case - just a single model
    // Define mesh options based on quality
    const meshOptions = quality === 'high' 
      ? { tolerance: 0.01, angularTolerance: 1 } // High quality settings
      : { tolerance: 0.1, angularTolerance: 15 }; // Standard quality settings
      
    console.log(`[INFO] Using mesh options for ${quality} quality:`, meshOptions);
    
    // Generate and time mesh operations
    console.time(`[PERF] ${modelName} faces generation (Quality: ${quality})`);
    const faces = result.mesh(meshOptions);
    console.timeEnd(`[PERF] ${modelName} faces generation (Quality: ${quality})`);
    
    if (faces && faces.triangles) {
      console.log(`[INFO] ${modelName} (Quality: ${quality}) triangles: ${faces.triangles.length/3}, vertices: ${faces.vertices.length/3}`);
    }
    
    console.time(`[PERF] ${modelName} edges generation (Quality: ${quality})`);
    const edges = result.meshEdges(meshOptions);
    console.timeEnd(`[PERF] ${modelName} edges generation (Quality: ${quality})`);
    
    console.timeEnd(`[PERF] Total ${modelName} creation (Quality: ${quality})`);

    // Return the mesh data
    return {
      faces: faces,
      edges: edges,
      componentData: result.componentData // Pass componentData if it exists
    };
    */ // --- End Old Logic ---
  });
}

// Export only the mesh creation function
expose({ createMesh });
