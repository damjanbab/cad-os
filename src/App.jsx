import React, { useState, useEffect } from "react";
import { wrap } from "comlink";

import ThreeContext from "./ThreeContext.jsx";
import ReplicadMesh from "./ReplicadMesh.jsx";
import TechnicalDrawingView from "./TechnicalDrawingView.jsx";
import RenderingView from "./RenderingView.jsx";

import cadWorker from "./worker.js?worker";
import { modelRegistry, createDefaultParams } from "./models";

const cad = wrap(new cadWorker());

export default function App() {
  const [selectedModel, setSelectedModel] = useState(Object.keys(modelRegistry)[0]);
  const [params, setParams] = useState(createDefaultParams(modelRegistry[selectedModel]));
  const [explosionFactor, setExplosionFactor] = useState(0);
  const [mesh, setMesh] = useState(null);
  const [projections, setProjections] = useState(null);
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
  
  useEffect(() => {
    setValidationErrors([]);
    console.time(`[PERF] worker call for ${selectedModel}`);
    console.log(`[INFO] Creating ${selectedModel} with params:`, params);
    
    // If model supports explosion and we have an explosion factor, include it
    const modelParams = { ...params };
    if (modelRegistry[selectedModel].hasExplosion) {
      modelParams.explosionFactor = explosionFactor;
    }
    
    cad.createMesh(selectedModel, modelParams).then(result => {
      console.timeEnd(`[PERF] worker call for ${selectedModel}`);
      
      if (result.error && result.validationErrors) {
        setValidationErrors(result.validationErrors);
        setMesh(null);
        setProjections(null);
      } else {
        setMesh(result);
        
        // Also generate technical drawings for the valid model
        if (activeTab === 'technical') {
          cad.createProjections(selectedModel, modelParams).then(projections => {
            setProjections(projections);
          });
        }
      }
    });
  }, [selectedModel, params, explosionFactor]);
  
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
  }, [activeTab]);
  
  const handleModelChange = (e) => {
    const newModel = e.target.value;
    setSelectedModel(newModel);
    setParams(createDefaultParams(modelRegistry[newModel]));
    setExplosionFactor(0);
    setProjections(null);
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
    <div style={{ 
      height: "100vh", 
      display: "flex", 
      flexDirection: "column",
      overflow: "hidden"
    }}>
      <div style={{ 
        padding: isMobile ? "8px" : "10px", 
        borderBottom: "1px solid #eee", 
        backgroundColor: "#f8f8f8",
        fontSize: isMobile ? "11px" : "12px"
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
          gap: "10px"
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
      
      <div style={{ flex: 1, position: "relative" }}>
        {validationErrors.length > 0 ? (
          <div style={{ 
            height: "100%", 
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
                <TechnicalDrawingView 
                  projections={projections} 
                  isMobile={isMobile}
                />
              ) : (
                <div style={{ 
                  height: "100%", 
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
          </>
        )}
      </div>
    </div>
  );
}