import React, { useState, useEffect, useCallback } from "react"; // Import useCallback
import { wrap } from "comlink";

import ThreeContext from "../ThreeContext.jsx";
import ReplicadMesh from "../ReplicadMesh.jsx";
import TechnicalDrawingCanvas from "../components/technical-drawing/TechnicalDrawingCanvas.jsx";
import RenderingView from "../RenderingView.jsx";
import BillOfMaterials from "../components/bom/BillOfMaterials.jsx"; // Import BoM component

// Import BOTH workers
import cadWorker from "../worker.js?worker"; // Original worker for 3D Mesh
import TechDrawWorker from "../technicalDrawing.worker.js?worker"; // New worker for Tech Drawings
import { modelRegistry, createDefaultParams } from "../models";

// Create proxies for both workers
const cad = wrap(new cadWorker());
const techDrawWorker = wrap(new TechDrawWorker());

export default function CadApp() {
  const [selectedModel, setSelectedModel] = useState(Object.keys(modelRegistry)[0]);
  const [params, setParams] = useState(createDefaultParams(modelRegistry[selectedModel]));
  const [explosionFactor, setExplosionFactor] = useState(0);
  const [mesh, setMesh] = useState(null);
  // const [projections, setProjections] = useState(null); // Removed old projections state
  const [viewboxes, setViewboxes] = useState([]); // New state for user-defined viewboxes
  const [bomData, setBomData] = useState(null); // Add state for BoM data
  const [validationErrors, setValidationErrors] = useState([]);
  const [activeTab, setActiveTab] = useState('3d');
  const [selectedLayout, setSelectedLayout] = useState('1x1'); // New state for selected layout
  const [selectedViewToAdd, setSelectedViewToAdd] = useState('Front'); // State for the view type to add
  const [includeHiddenLines, setIncludeHiddenLines] = useState(false); // State for hidden lines option
  const [selectedTarget, setSelectedTarget] = useState(null); // State for { viewboxId, cellIndex }
  const [controlsExpanded, setControlsExpanded] = useState(true);
const [isMobile, setIsMobile] = useState(false);

  // Detect mobile devices
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      // Auto-collapse controls on mobile
      if (window.innerWidth < 768) {
        setControlsExpanded(false);
      } else {
        setControlsExpanded(true);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Use useCallback to memoize the mesh creation logic
  // Define it *before* the useEffect that calls it
  const createModelMesh = useCallback(async () => {
    // Note: Errors are cleared later inside the try block or if password fails
    console.time(`[PERF] worker call for ${selectedModel}`);
console.log(`[INFO] Creating ${selectedModel} with params:`, params);

// If model supports explosion and we have an explosion factor, include it
    const modelParams = { ...params };
    if (modelRegistry[selectedModel].hasExplosion) {
      modelParams.explosionFactor = explosionFactor;
    }

      // Proceed with mesh creation
      try {
        // Clear any previous validation errors now that we are proceeding
        setValidationErrors([]);

        const result = await cad.createMesh(selectedModel, modelParams);
        console.timeEnd(`[PERF] worker call for ${selectedModel}`);

        if (result.error && result.validationErrors) {
        setValidationErrors(result.validationErrors);
        setMesh(null);
        // setProjections(null); // Removed
        setBomData(null); // Clear BoM data on error
      } else {
        setMesh(result);
        setBomData(result.componentData || null); // Set BoM data if available

        // REMOVE projection generation from here - it's handled by the other useEffect now
        // if (activeTab === 'technical') { ... }

      }
    } catch (error) { // Catch errors ONLY from cad.createMesh
        console.error("Error creating model:", error); // Updated error message
        setValidationErrors(["An error occurred while generating the model."]);
        setMesh(null);
        // setProjections(null); // Removed
    setBomData(null);
    console.timeEnd(`[PERF] worker call for ${selectedModel}`); // End timer on catch
  }
}, [selectedModel, params, explosionFactor, activeTab]); // Update dependencies

// useEffect hook to call the memoized function when dependencies change
  useEffect(() => {
    // Call the memoized function
    createModelMesh();
  }, [createModelMesh]); // useEffect depends on the memoized function

// Function to request high-detail mesh from worker
const requestHighDetailMesh = useCallback(async () => {
  console.log(`[INFO] Requesting high-detail mesh for ${selectedModel}`);
  console.time(`[PERF] worker call for ${selectedModel} (high detail)`);
    try {
      // Include explosion factor if applicable
      const modelParams = { ...params };
      if (modelRegistry[selectedModel].hasExplosion) {
        modelParams.explosionFactor = explosionFactor;
      }
      // Call worker with 'high' quality setting
      const result = await cad.createMesh(selectedModel, modelParams, 'high'); 
      console.timeEnd(`[PERF] worker call for ${selectedModel} (high detail)`);
      
      if (result.error) {
        console.error("Error generating high-detail mesh:", result.validationErrors);
        setValidationErrors(result.validationErrors || ["Error generating high-detail mesh."]);
        return null;
      }
      return result; // Return the high-detail mesh data
    } catch (error) {
      console.error("Error requesting high-detail mesh:", error);
      setValidationErrors(["An error occurred while generating the high-detail model."]);
  console.timeEnd(`[PERF] worker call for ${selectedModel} (high detail)`);
  return null;
}
}, [selectedModel, params, explosionFactor, cad]); // Added dependencies

// REMOVED useEffect hook that automatically generated projections on tab switch

  // Handler to add a new viewbox
  const handleAddViewbox = useCallback(() => {
    // For now, just add a placeholder object. We'll define the structure later.
    const newViewbox = {
      id: `vb-${Date.now()}-${Math.random().toString(16).slice(2)}`, // Simple unique ID
      layout: selectedLayout, // Use the selected layout from state
      // Initialize with the correct fields
      titleBlock: {
        project: 'Project Name', // Default placeholder
        partName: 'Part Name',   // Default placeholder
        scale: 'CALCULATED ON PDF', // Default scale text reflecting PDF behavior
        material: 'Steel',       // Default material (or make dynamic later)
        drawnBy: 'CAD-OS',       // Corrected default drawer
        date: new Date().toLocaleDateString() // Current date
      },
      items: [] // Array to hold views/elements
    };
    console.log("[DEBUG] handleAddViewbox - Before setViewboxes. Current viewboxes:", viewboxes);
    setViewboxes(prev => {
      const updated = [...prev, newViewbox];
      console.log("[DEBUG] handleAddViewbox - Inside setViewboxes callback. Updated viewboxes:", updated);
      return updated;
    });
    console.log(`[INFO] Added new viewbox with layout ${selectedLayout}:`, newViewbox);
  }, [selectedLayout, viewboxes]); // Add viewboxes to dependency array for logging purposes

  // Handler to update the selected layout
  const handleLayoutChange = (newLayout) => { // Removed useCallback
    setSelectedLayout(newLayout);
    console.log(`[INFO] Selected layout changed to: ${newLayout}`);
  }; // Removed useCallback wrapper

  // Handler to update the selected view type
  const handleViewSelectionChange = (newViewType) => {
    setSelectedViewToAdd(newViewType);
    console.log(`[INFO] Selected view to add changed to: ${newViewType}`);
  };

  // Handler to toggle hidden lines
  const handleHiddenLinesToggle = (isChecked) => {
    setIncludeHiddenLines(isChecked);
    console.log(`[INFO] Include hidden lines toggled to: ${isChecked}`);
  };

  // Handler to update the selected target cell
  const handleCellSelection = useCallback((viewboxId, cellIndex) => {
    setSelectedTarget({ viewboxId, cellIndex });
    console.log(`[INFO] Selected target cell: Viewbox ${viewboxId}, Cell ${cellIndex}`);
  }, []);

  // Handler for updating title block fields
  const handleTitleBlockChange = useCallback((viewboxId, fieldName, value) => {
    setViewboxes(prevViewboxes =>
      prevViewboxes.map(vb =>
        vb.id === viewboxId
          ? { ...vb, titleBlock: { ...vb.titleBlock, [fieldName]: value } }
          : vb
      )
    );
    console.log(`[INFO] Updated title block for Viewbox ${viewboxId}: Field=${fieldName}, Value=${value}`);
  }, []); // No dependencies needed as setViewboxes handles closure

  // Handler to remove a viewbox
  const handleRemoveViewbox = useCallback((viewboxIdToRemove) => {
    setViewboxes(prevViewboxes => {
      const updatedViewboxes = prevViewboxes.filter(vb => vb.id !== viewboxIdToRemove);
      console.log(`[INFO] Removed Viewbox ${viewboxIdToRemove}. Remaining:`, updatedViewboxes);
      // Also clear selection if the removed viewbox was selected
      if (selectedTarget?.viewboxId === viewboxIdToRemove) {
        setSelectedTarget(null);
      }
      return updatedViewboxes;
    });
  }, [selectedTarget]); // Add selectedTarget dependency


  // --- Handler for Setting Up Standard Views (Assembly & Parts) ---
  const handleSetupStandardViews = useCallback(async () => {
    console.log(`[ACTION] Setting up standard views for ${selectedModel}`);
    setIncludeHiddenLines(true); // Ensure hidden lines are on for this operation

    const modelDefinition = modelRegistry[selectedModel];
    const standardViews = ['Front', 'Left', 'Bottom'];
    const layout = '2x2';
    const includeHidden = true; // Explicitly true for this function

    // 1. Determine entities to process (Assembly + Parts)
    const entitiesToProcess = [{ id: null, name: modelDefinition.name || selectedModel }]; // Start with assembly

    if (modelDefinition?.hasTechnicalDrawingParts && Array.isArray(modelDefinition.componentDataStructure)) {
      modelDefinition.componentDataStructure.forEach(partInfo => {
        if (partInfo.id) {
          entitiesToProcess.push({ id: partInfo.id, name: partInfo.name || partInfo.id });
        } else {
          console.warn("[WARN] Skipping part due to missing ID in componentDataStructure:", partInfo);
        }
      });
    }
    console.log("[INFO] Entities to process for standard views:", entitiesToProcess);

    // 2. Generate view data for all entities and views concurrently
    try {
      const allViewboxDataPromises = entitiesToProcess.map(async (entity) => {
        console.log(`[INFO] Generating standard views for entity: ${entity.name} (ID: ${entity.id || 'Assembly'})`);
        const viewPromises = standardViews.map(viewType =>
          techDrawWorker.generateSingleProjection(
            selectedModel,
            { ...params },
            viewType,
            includeHidden,
            entity.id // Pass null for assembly, partId for parts
          ).catch(err => { // Add individual catch for robustness
            console.error(`[ERROR] Worker failed for ${entity.name} - ${viewType}:`, err);
            return null; // Return null on error for this specific view
          })
        );
        const projectionResults = await Promise.all(viewPromises);
        console.log(`[INFO] Received projection results for ${entity.name}:`, projectionResults);
        return { entity, projectionResults }; // Return entity info along with results
      });

      const allViewboxData = await Promise.all(allViewboxDataPromises);

      // 3. Construct new viewbox objects from the results
      const newViewboxes = allViewboxData.map(({ entity, projectionResults }) => {
        const viewboxId = `vb-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const items = new Array(4).fill(null); // Initialize 2x2 grid (4 cells)

        projectionResults.forEach((result, index) => {
          if (result && !result.error && result.paths) { // Check if result is valid
            items[index] = { // Place in cells 0, 1, 2
              id: `view-${viewboxId}-${standardViews[index]}-${entity.id || 'asm'}`,
              type: 'projection',
              viewType: standardViews[index],
              partName: entity.id, // Store part ID (null for assembly)
              includeHiddenLines: includeHidden,
              params: { ...params },
              svgData: {
                paths: result.paths,
                viewBox: result.viewBox,
              },
            };
          } else {
            console.warn(`[WARN] Skipping invalid/error result for ${entity.name} - ${standardViews[index]}`);
            // items[index] remains null
          }
        });

        return {
          id: viewboxId,
          layout: layout,
          titleBlock: { // Basic title block, adjust as needed
            project: selectedModel,
            partName: entity.name, // Use entity name
            scale: 'NTS',
            material: 'N/A',
            drawnBy: 'CAD-OS', // Corrected default drawer here too
            date: new Date().toLocaleDateString()
          },
          items: items,
        };
      }).filter(vb => vb !== null); // Filter out any potential nulls if all views failed for an entity

      console.log("[INFO] Constructed new viewboxes:", newViewboxes);

      // 4. Update state, replacing existing viewboxes
      setViewboxes(newViewboxes);
      setSelectedLayout(layout); // Also update the layout dropdown to match
      console.log("[INFO] Viewboxes state updated with standard views.");

    } catch (error) {
      console.error("[ERROR] Failed to generate standard views:", error);
      // TODO: Show a user-friendly error message
      alert("An error occurred while generating the standard views. Please check the console for details.");
    }
  }, [selectedModel, params, techDrawWorker, setViewboxes, setSelectedLayout, setIncludeHiddenLines]); // Add dependencies
  // --- End Handler ---


  // Handler for adding the selected view to the selected cell
  const handleAddViewToCell = async () => { // Make async
    if (!selectedTarget) {
      console.warn("[WARN] No target cell selected to add view.");
      alert("Please click on a cell in a viewbox first to select where to add the view."); // User feedback
      return;
    }

    const { viewboxId: targetViewboxId, cellIndex: targetCellIndex } = selectedTarget;

    // --- Parse selectedViewToAdd to determine if it's a part view ---
    let viewTypeToAdd = selectedViewToAdd; // Default to the whole value
    let partIdForWorker = null; // Changed from partNameForWorker
    const separator = " - ";

    // Check if the selected value contains the separator (indicating a part view)
    if (selectedViewToAdd.includes(separator)) {
      const parts = selectedViewToAdd.split(separator);
      if (parts.length === 2) {
        partIdForWorker = parts[0].trim(); // e.g., "SS001"
        viewTypeToAdd = parts[1].trim(); // e.g., "Top"
        console.log(`[INFO] Parsed part view: Part ID='${partIdForWorker}', View='${viewTypeToAdd}'`);
      } else {
        // Handle unexpected format if necessary, maybe default to whole model view
        console.warn(`[WARN] Unexpected format for part view selection: ${selectedViewToAdd}. Treating as whole model view.`);
        viewTypeToAdd = selectedViewToAdd; // Use the original value as view type
        partIdForWorker = null;
      }
    } else {
      // It's a standard whole model view (e.g., "Front", "Isometric")
      console.log(`[INFO] Adding whole model view: ${viewTypeToAdd}`);
      partIdForWorker = null; // Ensure partId is null for whole model views
    }
    // --- End Parsing ---

    console.log(`[ACTION] Attempting to add view to Viewbox ${targetViewboxId}, Cell ${targetCellIndex}: View='${viewTypeToAdd}', Part ID='${partIdForWorker || 'Whole Model'}', Hidden: ${includeHiddenLines}, Params:`, params);


    // 1. Generate the projection data using the worker
    let projectionResult;
    try {
      console.log(`[INFO] Calling techDrawWorker.generateSingleProjection for ${selectedModel} (Part ID: ${partIdForWorker || 'N/A'})...`);
      projectionResult = await techDrawWorker.generateSingleProjection(
        selectedModel,
        { ...params }, // Pass a copy of current params
        viewTypeToAdd, // Use the parsed view type
        includeHiddenLines,
        partIdForWorker // Pass the extracted part ID (or null)
      );
      console.log("[INFO] Received projection result from worker:", projectionResult);

      if (!projectionResult || projectionResult.error) {
        console.error("[ERROR] Worker failed to generate single projection:", projectionResult?.message || "Unknown worker error");
        // TODO: Show error to user
        return;
      }
    } catch (workerError) {
      console.error("[ERROR] Error calling techDrawWorker.generateSingleProjection:", workerError);
      // TODO: Show error to user
      return;
    }

    // 2. Update the state with the generated data
    setViewboxes(prevViewboxes => {
      // Find the correct viewbox index using the selected target ID
      const currentTargetViewboxIndex = prevViewboxes.findIndex(vb => vb.id === targetViewboxId);

      if (currentTargetViewboxIndex === -1) {
        console.warn(`[WARN] Target viewbox ${targetViewboxId} not found in current state.`);
        return prevViewboxes; // Target viewbox no longer exists
      }

      // Use the selected cell index
      const currentTargetCellIndex = targetCellIndex;

      // Create a deep copy to avoid direct state mutation issues
      const updatedViewboxes = JSON.parse(JSON.stringify(prevViewboxes));
      const targetViewbox = updatedViewboxes[currentTargetViewboxIndex]; // Get the target viewbox

      // Ensure items array exists
      if (!targetViewbox.items) {
        targetViewbox.items = [];
      }

      // Create the new view item object with data from the worker
      const newViewItem = {
        id: `view-${Date.now()}-${Math.random().toString(16).slice(2)}`, // Unique ID
        type: 'projection',
        viewType: viewTypeToAdd, // Use parsed view type
        partName: partIdForWorker, // Store the part ID (or null) - might rename state later if confusing
        includeHiddenLines: includeHiddenLines,
        params: { ...params }, // Store parameters used for this specific view
        // Store the generated SVG data
        svgData: {
          paths: projectionResult.paths,
          viewBox: projectionResult.viewBox,
        },
      };

      console.log("[INFO] Adding generated view item:", newViewItem);

      // Place the new item into the *selected* target cell index
      // Ensure the items array is long enough, fill with null if needed
      while (targetViewbox.items.length <= currentTargetCellIndex) {
        targetViewbox.items.push(null);
      }
      targetViewbox.items[currentTargetCellIndex] = newViewItem;

      // The targetViewbox object within updatedViewboxes is already updated by reference

      console.log(`[INFO] View added to Viewbox ${targetViewboxId}, Cell ${currentTargetCellIndex}. Final state:`, updatedViewboxes);
      return updatedViewboxes;
    });
  }; // End handleAddViewToCell


  const handleModelChange = (e) => {
    const newModel = e.target.value;
    // const newModel = e.target.value; // Remove duplicate declaration
    setSelectedModel(newModel);
    setParams(createDefaultParams(modelRegistry[newModel]));
    setExplosionFactor(0);
    // setProjections(null); // Clear projections - Removed
    setViewboxes([]); // Clear custom viewboxes when model changes
    setBomData(null); // Clear BoM data
    // NOTE: We don't reset verifiedModels here. Verification is per-session, per-model.
    // Reset to 3D tab if the new model doesn't support the current tab
    if (activeTab === 'bom' && !modelRegistry[newModel]?.hasBoM) {
      setActiveTab('3d');
    }
  };
  
  const handleParamChange = (paramName, value) => {
    setParams(prev => ({
      ...prev,
      [paramName]: value
    }));
  };
  
  const handleExplosionChange = (e) => {
    setExplosionFactor(parseFloat(e.target.value));
  };
  
  const toggleControls = () => {
setControlsExpanded(!controlsExpanded);
};

return (
<>
      {/* Control Panel - DIRECT CHILD with no parent div for spacing */}
      <div style={{
        padding: isMobile ? "8px" : "10px", 
        borderBottom: "1px solid #eee", 
        backgroundColor: "#f8f8f8",
        fontSize: isMobile ? "11px" : "12px",
        margin: 0,
        flexShrink: 0 // Prevent flex container from squeezing this
      }}>
        <div style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "flex-start" : "center",
          marginBottom: "10px",
          gap: isMobile ? "8px" : "0"
        }}>
          <div style={{ 
            display: "flex",
            alignItems: "center",
            width: isMobile ? "100%" : "auto"
          }}>
            <span style={{ marginRight: "5px", fontWeight: "bold" }}>Model:</span>
            <select 
              value={selectedModel} 
              onChange={handleModelChange}
              style={{ 
                marginRight: "10px", 
                height: isMobile ? "30px" : "24px", 
                fontSize: isMobile ? "14px" : "12px",
                flex: isMobile ? "1" : "auto"
              }}
            >
              {Object.keys(modelRegistry).map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </div>
          
          {/* View tabs */}
          <div style={{ 
            display: "flex", 
            marginLeft: isMobile ? "0" : "20px", 
            borderRadius: "4px", 
            overflow: "hidden", 
            border: "1px solid #ccc",
            width: isMobile ? "100%" : "auto"
          }}>
            <button 
              onClick={() => setActiveTab('3d')} 
              style={{
                padding: isMobile ? "8px 12px" : "4px 12px",
                border: "none",
                background: activeTab === '3d' ? "#4a90e2" : "#f0f0f0",
                color: activeTab === '3d' ? "white" : "#333",
                cursor: "pointer",
                fontWeight: activeTab === '3d' ? "bold" : "normal",
                flex: isMobile ? "1" : "auto",
                fontSize: isMobile ? "14px" : "inherit"
              }}
            >
              3D View
            </button>
            <button 
              onClick={() => setActiveTab('technical')} 
              style={{
                padding: isMobile ? "8px 12px" : "4px 12px",
                border: "none",
                background: activeTab === 'technical' ? "#4a90e2" : "#f0f0f0",
                color: activeTab === 'technical' ? "white" : "#333",
                cursor: "pointer",
                fontWeight: activeTab === 'technical' ? "bold" : "normal",
                flex: isMobile ? "1" : "auto",
                fontSize: isMobile ? "14px" : "inherit"
              }}
            >
              Technical Drawing
            </button>
            <button 
              onClick={() => setActiveTab('rendering')} 
              style={{
                padding: isMobile ? "8px 12px" : "4px 12px",
                border: "none",
                background: activeTab === 'rendering' ? "#4a90e2" : "#f0f0f0",
                color: activeTab === 'rendering' ? "white" : "#333",
                cursor: "pointer",
                fontWeight: activeTab === 'rendering' ? "bold" : "normal",
                flex: isMobile ? "1" : "auto",
                fontSize: isMobile ? "14px" : "inherit"
              }}
            >
              360° Rendering
            </button>
            {/* Conditionally render BoM tab */}
            {modelRegistry[selectedModel]?.hasBoM && (
              <button 
                onClick={() => setActiveTab('bom')} 
                style={{
                  padding: isMobile ? "8px 12px" : "4px 12px",
                  border: "none",
                  background: activeTab === 'bom' ? "#4a90e2" : "#f0f0f0",
                  color: activeTab === 'bom' ? "white" : "#333",
                  cursor: "pointer",
                  fontWeight: activeTab === 'bom' ? "bold" : "normal",
                  flex: isMobile ? "1" : "auto",
                  fontSize: isMobile ? "14px" : "inherit"
                }}
              >
                Bill of Materials
              </button>
            )}
          </div>
          
          {/* Toggle controls button (mobile only) */}
          {isMobile && (
            <div style={{ 
              width: "100%", 
              display: "flex", 
              justifyContent: "center", 
              marginTop: "4px" 
            }}>
              <button 
                onClick={toggleControls}
                style={{
                  padding: "8px 16px",
                  background: "#eee",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  fontSize: "14px",
                  cursor: "pointer",
                  width: "100%"
                }}
              >
                {controlsExpanded ? "Hide Parameters ▲" : "Show Parameters ▼"}
              </button>
            </div>
          )}
          
          {/* Explosion factor slider - only show in 3D view */}
          {activeTab === '3d' && modelRegistry[selectedModel].hasExplosion && (
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              marginLeft: isMobile ? "0" : "15px",
              backgroundColor: "#e6f7ff",
              padding: "5px 10px",
              borderRadius: "4px",
              width: isMobile ? "100%" : "auto",
              marginTop: isMobile ? "4px" : "0"
            }}>
              <span style={{ marginRight: "8px", fontWeight: "bold" }}>Explosion:</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={explosionFactor}
                onChange={handleExplosionChange}
                style={{ 
                  width: isMobile ? "calc(100% - 100px)" : "150px",
                  height: isMobile ? "24px" : "auto"
                }}
              />
              <span style={{ marginLeft: "5px", minWidth: "40px" }}>
                {Math.round(explosionFactor * 100)}%
              </span>
            </div>
          )}
        </div>
        
        {/* Parameters section - collapsible on mobile */}
        <div style={{ 
          display: controlsExpanded ? "flex" : "none",
          flexWrap: "wrap", 
          gap: "10px",
          margin: 0,
          padding: 0
        }}>
          {modelRegistry[selectedModel].params.map(paramDef => {
            const { name, defaultValue } = paramDef;
            
            // Skip explosionFactor as we handle it separately
            if (name === 'explosionFactor') return null;
            
            const value = params[name];
            const isBoolean = typeof defaultValue === 'boolean';
            
            return (
              <div key={name} style={{ 
                display: "flex", 
                alignItems: "center",
                backgroundColor: "#fff",
                border: "1px solid #ccc",
                padding: isMobile ? "8px" : "5px 8px",
                borderRadius: "4px",
                width: isMobile ? "calc(50% - 5px)" : "auto"
              }}>
                <span style={{ 
                  marginRight: "8px", 
                  fontWeight: "bold",
                  color: "#333",
                  fontSize: isMobile ? "13px" : "inherit"
                }}>
                  {name}:
                </span>
                
                {isBoolean ? (
                  <input
                    id={`param-${name}`}
                    type="checkbox"
                    checked={value}
                    onChange={(e) => handleParamChange(name, e.target.checked)}
                    style={{
                      width: isMobile ? "20px" : "auto",
                      height: isMobile ? "20px" : "auto",
                    }}
                  />
                ) : (
                  <input
                    id={`param-${name}`}
                    type="number"
                    value={value}
                    onChange={(e) => handleParamChange(name, parseFloat(e.target.value))}
                    style={{ 
                      width: isMobile ? "calc(100% - 50px)" : "60px", 
                      height: isMobile ? "30px" : "20px", 
                      fontSize: isMobile ? "14px" : "12px",
                      flex: isMobile ? "1" : "none"
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
        
        {validationErrors.length > 0 && (
          <div style={{
            marginTop: "10px",
            padding: "8px 12px",
            backgroundColor: "#f8d7da",
            color: "#721c24",
            borderRadius: "4px",
            fontSize: isMobile ? "13px" : "12px"
          }}>
            <div style={{ fontWeight: "bold", marginBottom: "4px" }}>Invalid parameters:</div>
            <ul style={{ margin: "0", paddingLeft: "20px" }}>
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
      </div>
    )}
  </div>

  {/* Visualization Area - Second DIRECT CHILD with explicit flex styling */}
      <div style={{
        flex: 1, 
        position: "relative",
        overflow: "hidden",
        display: "flex",
        margin: 0,
        padding: 0
      }}>
        {validationErrors.length > 0 ? (
          <div style={{ 
            height: "100%", 
            width: "100%",
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            fontSize: isMobile ? "14px" : "12px",
            color: "#999",
            padding: "0 20px",
        textAlign: "center"
      }}>
        Fix parameters to see model
      </div>
    ) : (
      <>
        {/* 3D View */}
            {activeTab === '3d' && mesh ? (
              <ThreeContext>
                <ReplicadMesh 
                  edges={mesh.edges} 
                  faces={mesh.faces} 
                  helperSpaces={mesh.helperSpaces || []} 
                />
              </ThreeContext>
            ) : null}
            
            {/* Technical Drawing View */}
            {activeTab === 'technical' ? (
              // Always render canvas, pass viewboxes state
              <TechnicalDrawingCanvas
                selectedModelName={selectedModel} // Pass the selected model name
                viewboxes={viewboxes} // Pass new state
                isMobile={isMobile}
                onAddViewbox={handleAddViewbox} // Pass the handler down
                selectedLayout={selectedLayout} // Pass selected layout state
                onLayoutChange={handleLayoutChange} // Pass layout change handler
                // Pass view selection state and handlers
                selectedViewToAdd={selectedViewToAdd}
                onViewSelectionChange={handleViewSelectionChange}
                includeHiddenLines={includeHiddenLines}
                onHiddenLinesToggle={handleHiddenLinesToggle}
                onAddViewToCell={handleAddViewToCell} // Pass view add handler
                selectedTarget={selectedTarget} // Pass selection state
                onCellSelection={handleCellSelection} // Pass cell selection handler
                onTitleBlockChange={handleTitleBlockChange} // Pass title block update handler
                onRemoveViewbox={handleRemoveViewbox} // Pass remove handler
                onSetupStandardViews={handleSetupStandardViews} // Pass the new handler
                // Pass functions to update viewboxes later
                // onViewboxesChange={setViewboxes}
              />
              // Removed old conditional loading/error logic based on 'projections'
              /*
              projections ? ( ... ) : (
                <div style={{
                  height: "100%",
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: isMobile ? "14px" : "12px",
                  color: "#999"
                }}>
                  Loading technical drawings...
                </div>
              )
              */
            ) : null}

            {/* 360° Rendering View */}
            {activeTab === 'rendering' ? (
              mesh ? (
                <RenderingView
                  mesh={mesh} // Pass the standard mesh for display
                  isMobile={isMobile}
                  // Pass down the function and necessary data for high-detail export
                  requestHighDetailMesh={requestHighDetailMesh}
                  selectedModel={selectedModel}
                  params={params} // Pass current params
                />
              ) : (
                <div style={{
                  height: "100%",
                  width: "100%", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center",
                  fontSize: isMobile ? "14px" : "12px",
                  color: "#999"
                }}>
                  Loading 360° rendering...
                </div>
              )
            ) : null}
            
            {/* Bill of Materials View */}
            {activeTab === 'bom' ? (
              bomData ? (
                <BillOfMaterials 
                  data={bomData} 
                  modelName={selectedModel} 
                />
              ) : (
                <div style={{ 
                  height: "100%",
                  width: "100%", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center",
                  fontSize: isMobile ? "14px" : "12px",
                  color: "#999"
                }}>
                  Loading Bill of Materials...
                </div>
              )
            ) : null}
          </>
        )}
      </div>
    </>
  );
}
