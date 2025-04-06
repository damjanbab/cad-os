import React, { useState, useEffect, useCallback } from "react"; // Import useCallback
import { wrap } from "comlink";

import { usePasswordVerification } from "../hooks/usePasswordVerification.js"; // Import the hook
import ThreeContext from "../ThreeContext.jsx";
import ReplicadMesh from "../ReplicadMesh.jsx";
import TechnicalDrawingCanvas from "../components/technical-drawing/TechnicalDrawingCanvas.jsx"; // Updated import
import RenderingView from "../RenderingView.jsx";
import BillOfMaterials from "../components/bom/BillOfMaterials.jsx"; // Import BoM component

import cadWorker from "../worker.js?worker";
import { modelRegistry, createDefaultParams } from "../models";

const cad = wrap(new cadWorker());

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
  const [verifiedModels, setVerifiedModels] = useState({}); // State for verified passwords
  const { isPasswordRequired, verifyPasswordAttempt } = usePasswordVerification(verifiedModels, setVerifiedModels); // Use the updated hook

  // State for password input UI
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [passwordInputValue, setPasswordInputValue] = useState('');

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

    // --- Check if Password Input is Needed ---
    const modelDefinition = modelRegistry[selectedModel];
    if (isPasswordRequired(selectedModel, modelDefinition)) {
      setShowPasswordInput(true); // Show the input field
      setMesh(null); // Clear potentially stale mesh/data
      setProjections(null);
      setBomData(null);
      // Optionally set a specific error message like "Password required"
      // setValidationErrors(["Password required for this model."]);
      console.timeEnd(`[PERF] worker call for ${selectedModel}`); // End timer here
      return; // Stop execution until password is submitted
    } else {
      // If password is not required or already verified, ensure input is hidden
      setShowPasswordInput(false);
    }
    // --- End Password Check ---

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
        
        // Also generate technical drawings if needed
        if (activeTab === 'technical') {
          const projectionsResult = await cad.createProjections(selectedModel, modelParams);
          setProjections(projectionsResult);
        } else {
          // Clear projections if not on the technical tab
          setProjections(null); 
        }
      } 
    } catch (error) { // Catch errors from cad.createMesh or cad.createProjections
        console.error("Error creating model or projections:", error); // Updated error message
        setValidationErrors(["An error occurred while generating the model."]);
        setMesh(null);
        setProjections(null);
        setBomData(null);
        console.timeEnd(`[PERF] worker call for ${selectedModel}`); // End timer on catch
      }
    }, [selectedModel, params, explosionFactor, activeTab, verifiedModels, isPasswordRequired]); // Update dependencies

  // useEffect hook to call the memoized function when dependencies change
  useEffect(() => {
    // Call the memoized function
    createModelMesh();
  }, [createModelMesh]); // useEffect depends on the memoized function
  
  // When tab changes, generate the required view data
  useEffect(() => {
    if (activeTab === 'technical' && mesh && !projections) {
      const modelParams = { ...params };
      if (modelRegistry[selectedModel].hasExplosion) {
        modelParams.explosionFactor = explosionFactor;
      }
      
      cad.createProjections(selectedModel, modelParams).then(projections => {
        setProjections(projections);
      });
    }
  }, [activeTab, mesh, projections, selectedModel, params, explosionFactor]); // Added dependencies based on usage

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

  // Handler for submitting the password from the input field
  const handlePasswordSubmit = () => {
    const modelDefinition = modelRegistry[selectedModel];
    const result = verifyPasswordAttempt(selectedModel, passwordInputValue);

    if (result.success) {
      setPasswordInputValue(''); // Clear input
      setShowPasswordInput(false); // Hide input
      setValidationErrors([]); // Clear errors
      // Re-trigger mesh creation now that password is verified
      // Need to ensure this doesn't cause infinite loops.
      // Calling createModelMesh directly might be okay if dependencies are stable.
      // Or rely on useEffect triggering due to verifiedModels change.
      // Let's try calling directly for explicitness, assuming createModelMesh deps are correct.
      createModelMesh();
    } else {
      setValidationErrors([result.error || "Verification failed"]);
    }
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

        {/* Conditionally render Password Input Area */}
        {showPasswordInput && (
          <div style={{
            marginTop: "10px",
            padding: "10px",
            backgroundColor: "#fffbe6", // Light yellow background
            border: "1px solid #ffe58f", // Yellow border
            borderRadius: "4px",
            display: "flex",
            alignItems: "center",
            gap: "10px"
          }}>
            <label htmlFor="passwordInput" style={{ fontWeight: "bold", color: "#d46b08" }}>
              Password for {selectedModel}:
            </label>
            <input
              id="passwordInput"
              type="password"
              value={passwordInputValue}
              onChange={(e) => setPasswordInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()} // Submit on Enter
              style={{
                padding: "5px 8px",
                border: "1px solid #ccc",
                borderRadius: "4px",
                flexGrow: 1
              }}
            />
            <button
              onClick={handlePasswordSubmit}
              style={{
                padding: "5px 15px",
                border: "none",
                borderRadius: "4px",
                backgroundColor: "#4a90e2",
                color: "white",
                cursor: "pointer",
                fontWeight: "bold"
              }}
            >
              Verify
            </button>
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
            {showPasswordInput ? "Enter password above to view model" : "Fix parameters to see model"}
          </div>
        ) : showPasswordInput ? (
           // Show message instead of model/loaders when password input is visible
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
             Enter password in the control panel above.
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
                  mesh={mesh} 
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
