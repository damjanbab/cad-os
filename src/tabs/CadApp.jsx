import React, { useState, useEffect, useCallback } from "react"; // Import useCallback
import { wrap } from "comlink";

import ThreeContext from "../ThreeContext.jsx";
import ReplicadMesh from "../ReplicadMesh.jsx";
import TechnicalDrawingCanvas from "../components/technical-drawing/TechnicalDrawingCanvas.jsx"; // Updated import
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
  const [projections, setProjections] = useState(null);
  const [bomData, setBomData] = useState(null); // Add state for BoM data
  const [validationErrors, setValidationErrors] = useState([]);
  const [activeTab, setActiveTab] = useState('3d');
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
        setProjections(null);
        setBomData(null); // Clear BoM data on error
      } else {
        setMesh(result);
        setBomData(result.componentData || null); // Set BoM data if available

        // REMOVE projection generation from here - it's handled by the other useEffect now
        // if (activeTab === 'technical') { ... }

      }
    } catch (error) { // Catch errors ONLY from cad.createMesh
        console.error("Error creating model or projections:", error); // Updated error message
        setValidationErrors(["An error occurred while generating the model."]);
        setMesh(null);
        setProjections(null);
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

// When tab changes TO technical, generate projections using the NEW worker
  useEffect(() => {
    // Only trigger if switching TO technical tab AND projections aren't already loaded/loading
    if (activeTab === 'technical' && !projections) {
      console.log("[INFO] Technical tab active, requesting projections from techDrawWorker...");
      setProjections(null); // Clear old/stale projections immediately
      setValidationErrors([]); // Clear potential previous errors

      // Prepare params (explosion factor is NOT needed for projections)
      const modelParams = { ...params };
      // delete modelParams.explosionFactor; // Remove explosion factor if present

      // Call the NEW worker
      techDrawWorker.generateProjections(selectedModel, modelParams)
        .then(result => {
          console.log("[INFO] Received projections result from techDrawWorker:", result);
          if (result && result.error) {
            console.error("[ERROR] Error generating projections:", result.validationErrors || result.message);
            setValidationErrors(result.validationErrors || [result.message || "Projection generation failed."]);
            setProjections({ error: true }); // Set error state for projections
          } else {
            setProjections(result); // Set the successful projections data
          }
        })
        .catch(error => {
          console.error("[ERROR] Failed to call techDrawWorker.generateProjections:", error);
          setValidationErrors([`Projection worker error: ${error.message}`]);
          setProjections({ error: true }); // Set error state
        });
    } else if (activeTab !== 'technical') {
        // Clear projections if we navigate away from the technical tab
        if (projections) { // Only clear if they exist
            console.log("[INFO] Clearing projections as tab is not 'technical'.");
            setProjections(null);
        }
    }
    // Dependencies: Only trigger when tab changes, or model/params change *while* on the technical tab
  }, [activeTab, selectedModel, params]); // Removed mesh, projections, explosionFactor dependencies

  const handleModelChange = (e) => {
    const newModel = e.target.value;
    // const newModel = e.target.value; // Remove duplicate declaration
    setSelectedModel(newModel);
    setParams(createDefaultParams(modelRegistry[newModel]));
    setExplosionFactor(0);
    setProjections(null); // Clear projections
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
              projections ? (
                <TechnicalDrawingCanvas // Updated component name
                  projections={projections}
                  isMobile={isMobile}
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
                  Loading technical drawings...
                </div>
              )
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
