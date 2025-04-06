// RenderingView.jsx
import React, { useRef, useState, useEffect, Suspense, forwardRef, useImperativeHandle, useCallback } from "react"; // Added useCallback
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import * as THREE from "three";

// Set Z as the up direction for ReplicAD models (consistent with main app)
THREE.Object3D.DEFAULT_UP.set(0, 0, 1);

// Camera controller component (auto-rotation removed)
function CameraController({
  target = [0, 0, 0],
  modelSize = 100,
  controlsRef // Pass ref from parent
}) {
  const { camera } = useThree();
  const initialPositionSetRef = useRef(false); // Ref to track initial positioning

  // Position camera initially - ONLY ONCE
  useEffect(() => {
    if (!initialPositionSetRef.current) { // Check the flag
      // Position camera based on model size
      const distance = modelSize * 2.5;
    camera.position.set(
      distance * Math.sin(Math.PI / 4),
      -distance * Math.cos(Math.PI / 4), 
      distance * 0.7
      );
      camera.lookAt(target[0], target[1], target[2]);
      camera.updateProjectionMatrix();
      initialPositionSetRef.current = true; // Set the flag
    }
  }, [camera, modelSize, target]); // Dependencies remain the same

  // Update target when it changes
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.target.set(target[0], target[1], target[2]);
      controlsRef.current.update();
    }
  }, [controlsRef, target]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableRotate={true}
      enablePan={false} // Keep pan disabled? Or enable? User can decide later.
      enableZoom={true}
      autoRotate={false} // Explicitly disable autoRotate
      maxPolarAngle={Math.PI * 0.75} // Keep angle limits
      minPolarAngle={Math.PI * 0.25}
      makeDefault // Make these the default controls
    />
  );
}

// Enhanced lighting for better visuals
function EnhancedLighting() {
  return (
    <>
      <ambientLight intensity={1.5} />
      <directionalLight 
        position={[10, 10, 10]} 
        intensity={3} 
        castShadow
      />
      <directionalLight 
        position={[-10, -10, 5]} 
        intensity={1} 
      />
      <hemisphereLight groundColor="#555" intensity={1} />
    </>
  );
}

// Floor grid component
function FloorGrid({ modelSize = 100 }) {
  // Scale grid based on model size
  const gridSize = Math.max(modelSize * 5, 500);
  const gridDivisions = Math.floor(gridSize / 20);
  
  return (
    <group position={[0, 0, -0.01]}>
      <gridHelper 
        args={[gridSize, gridDivisions, 0x888888, 0x444444]} 
        rotation={[Math.PI/2, 0, 0]}
      />
    </group>
  );
}

// Model component to render the actual 3D content
function ModelDisplay({ mesh, highQuality, modelId }) {
  if (!mesh || !mesh.faces) return null;
  
  return (
    <group key={`model-${modelId}`}>
      {/* Faces */}
      {mesh.faces && mesh.faces.vertices && mesh.faces.normals && mesh.faces.triangles && (
        <mesh>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={mesh.faces.vertices.length / 3}
              array={new Float32Array(mesh.faces.vertices)}
              itemSize={3}
            />
            <bufferAttribute
              attach="attributes-normal"
              count={mesh.faces.normals.length / 3}
              array={new Float32Array(mesh.faces.normals)}
              itemSize={3}
            />
            <bufferAttribute
              attach="index"
              count={mesh.faces.triangles.length}
              array={new Uint32Array(mesh.faces.triangles)}
              itemSize={1}
            />
          </bufferGeometry>
          <meshStandardMaterial
            color={highQuality ? "#6a92a6" : "#5a8296"}
            metalness={highQuality ? 0.4 : 0}
            roughness={highQuality ? 0.3 : 0.5}
            envMapIntensity={highQuality ? 0.8 : 0.2}
            flatShading={false}
          />
        </mesh>
      )}
      
      {/* Edges */}
      {mesh.edges && mesh.edges.vertices && (
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={mesh.edges.vertices.length / 3}
              array={new Float32Array(mesh.edges.vertices)}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial
            color={highQuality ? "#304352" : "#3c5a6e"}
            linewidth={1}
          />
        </lineSegments>
      )}
      
      {/* Note: Helper spaces are intentionally not rendered in 360° view */}
    </group>
  );
}

// Scene component to organize all 3D elements
function Scene({ mesh, modelSize, showFloor, highQuality, modelId, controlsRef }) {
  return (
    <>
      <CameraController
        modelSize={modelSize}
        controlsRef={controlsRef} // Pass down the ref
      />

      <EnhancedLighting />
      
      {showFloor && (
        <FloorGrid modelSize={modelSize} />
      )}
      
      <ModelDisplay mesh={mesh} highQuality={highQuality} modelId={modelId} />
      
      {highQuality && (
        <Environment preset="studio" />
      )}
    </>
  );
}


// Internal component to handle export logic using hooks inside Canvas
// Removed getControls from props as we capture state earlier
const ExportHandler = forwardRef(({ requestHighDetailMesh, setIsExporting }, ref) => { 
  // We still need mainCamera for FOV, near, far
  const { camera: mainCamera } = useThree(); 

  useImperativeHandle(ref, () => ({
    // Accept capturedCameraState as the second argument
    handleExportImage: async (format = 'png', capturedCameraState) => { 
      if (!requestHighDetailMesh) {
        console.error("High detail mesh request function not available.");
        alert("Export function not properly configured.");
        return;
      }
      // Check if we received the captured state
      if (!capturedCameraState) {
        console.error("Captured camera state not provided for export.");
        alert("Failed to capture camera state for export.");
        return; 
      } // Added missing closing brace
      // We still need mainCamera for some properties like near/far if not captured
      if (!mainCamera) { 
        console.error("Main camera reference not available for export.");
        return;
      }

      setIsExporting(true); // Show loading indicator

      let offScreenCanvas = null;
      let offScreenRenderer = null;
      let offScreenScene = null;
      let offScreenCamera = null;
      let geometryFaces = null;
      let geometryEdges = null;
      let materialFaces = null;
      let materialEdges = null;
      let meshFaces = null;
      let meshEdges = null;

      try {
        console.log("Requesting high detail mesh for export...");
        const highDetailMesh = await requestHighDetailMesh();

        if (!highDetailMesh || !highDetailMesh.faces || !highDetailMesh.faces.vertices) {
          console.error("Failed to retrieve high detail mesh or mesh is invalid.");
          alert("Failed to generate high-detail model for export.");
          setIsExporting(false);
          return;
        }
        console.log("High detail mesh received.");

        // --- Create Off-Screen Rendering Environment ---
        // Calculate aspect ratio from main camera
        const aspect = mainCamera.aspect; 
        const exportHeight = 4096; // Keep height fixed
        const exportWidth = Math.round(exportHeight * aspect); // Calculate width based on aspect

        // 1. Canvas
        offScreenCanvas = document.createElement('canvas');
        offScreenCanvas.width = exportWidth;
        offScreenCanvas.height = exportHeight;

        // 2. Renderer
        offScreenRenderer = new THREE.WebGLRenderer({
          canvas: offScreenCanvas,
          antialias: true,
          preserveDrawingBuffer: true, // Keep buffer for toDataURL
          alpha: false, // Assuming opaque background is fine
          precision: 'highp', // Use high precision
        });
        offScreenRenderer.setSize(exportWidth, exportHeight);
        offScreenRenderer.setClearColor(new THREE.Color("#121212")); // Match main background
        offScreenRenderer.shadowMap.enabled = true; // Enable shadows for high quality

        // 3. Scene
        offScreenScene = new THREE.Scene();

        // 4. Lighting & Environment (similar to main scene's high quality)
        offScreenScene.add(new THREE.AmbientLight(0xffffff, 1.5));
        const dirLight1 = new THREE.DirectionalLight(0xffffff, 3);
        dirLight1.position.set(10, 10, 10);
        dirLight1.castShadow = true; // Enable shadow casting
        offScreenScene.add(dirLight1);
        const dirLight2 = new THREE.DirectionalLight(0xffffff, 1); // Create the light first
        dirLight2.position.set(-10, -10, 5); // Set its position
        offScreenScene.add(dirLight2); // Add the light object to the scene
        offScreenScene.add(new THREE.HemisphereLight(0xffffff, 0x555555, 1));
        // Note: Environment component needs React context, manually add env map if needed or skip

        // 5. Geometry & Materials (using high detail mesh data)
        // Faces
        if (highDetailMesh.faces && highDetailMesh.faces.vertices && highDetailMesh.faces.normals && highDetailMesh.faces.triangles) {
          geometryFaces = new THREE.BufferGeometry();
          geometryFaces.setAttribute('position', new THREE.BufferAttribute(new Float32Array(highDetailMesh.faces.vertices), 3));
          geometryFaces.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(highDetailMesh.faces.normals), 3));
          geometryFaces.setIndex(new THREE.BufferAttribute(new Uint32Array(highDetailMesh.faces.triangles), 1));
          
          materialFaces = new THREE.MeshStandardMaterial({
            color: "#6a92a6", // High quality color
            metalness: 0.4,
            roughness: 0.3,
            envMapIntensity: 0.8,
            flatShading: false,
          });
          
          meshFaces = new THREE.Mesh(geometryFaces, materialFaces);
          meshFaces.castShadow = true; // Allow casting shadows
          meshFaces.receiveShadow = true; // Allow receiving shadows
          offScreenScene.add(meshFaces);
        }

        // Edges
        if (highDetailMesh.edges && highDetailMesh.edges.vertices) {
          geometryEdges = new THREE.BufferGeometry();
          geometryEdges.setAttribute('position', new THREE.BufferAttribute(new Float32Array(highDetailMesh.edges.vertices), 3));
          
          materialEdges = new THREE.LineBasicMaterial({
            color: "#304352", // High quality color
            linewidth: 1, // Note: linewidth > 1 might not work on all systems
          });
          
          meshEdges = new THREE.LineSegments(geometryEdges, materialEdges);
          offScreenScene.add(meshEdges);
        }

        // 6. Camera (Sync with main camera)
        // Use captured FOV, calculated aspect, and mainCamera's near/far
        offScreenCamera = new THREE.PerspectiveCamera(
          capturedCameraState.fov, 
          exportWidth / exportHeight, // Use calculated aspect ratio
          mainCamera.near, 
          mainCamera.far  
        );
        
        // --- Use Captured Camera State ---
        // console.log("[EXPORT LOG] Using captured camera state:", capturedCameraState); // Removed log

        // Copy position and orientation from the captured state
        offScreenCamera.position.copy(capturedCameraState.position);
        offScreenCamera.quaternion.copy(capturedCameraState.quaternion);
        // FOV is set in constructor
        
        offScreenCamera.updateProjectionMatrix(); // Apply all changes
        
        // console.log("[EXPORT LOG] offScreenCamera state after sync:", { pos: offScreenCamera.position.clone(), quat: offScreenCamera.quaternion.clone(), fov: offScreenCamera.fov }); // Removed log
        // --- End Camera Sync ---

        // --- Render and Export ---
        // console.log("Rendering off-screen scene..."); // Removed log
        offScreenRenderer.render(offScreenScene, offScreenCamera);
        // console.log("Rendering complete."); // Removed log

        const mimeType = `image/${format}`;
        const quality = format === 'jpeg' ? 0.95 : undefined; // Quality for JPG
        const dataURL = offScreenRenderer.domElement.toDataURL(mimeType, quality);

        // Trigger download
        const link = document.createElement('a');
        link.download = `cad-render-high-quality.${format}`;
        link.href = dataURL;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log(`High quality image exported as ${format}`);

      } catch (error) {
        console.error(`Error exporting high quality image as ${format}:`, error);
        alert(`Failed to export high quality image as ${format}. See console for details.`);
      } finally {
        // --- Cleanup ---
        // console.log("Cleaning up export resources..."); // Removed log
        if (offScreenRenderer) offScreenRenderer.dispose();
        if (geometryFaces) geometryFaces.dispose();
        if (geometryEdges) geometryEdges.dispose();
        if (materialFaces) materialFaces.dispose();
        if (materialEdges) materialEdges.dispose();
        // Dispose textures if Environment was used and added textures
        // offScreenScene.traverse(obj => { if (obj.dispose) obj.dispose(); }); // More aggressive cleanup if needed
        offScreenCanvas = null; // Allow garbage collection
        offScreenRenderer = null;
        offScreenScene = null;
        offScreenCamera = null;
        geometryFaces = null;
        geometryEdges = null;
        materialFaces = null;
        materialEdges = null;
        meshFaces = null;
        meshEdges = null;

        setIsExporting(false); // Hide loading indicator
        // console.log("Cleanup complete."); // Removed log
      }
    }
  }));

  return null; // This component doesn't render anything itself
});


// Main 360° rendering view component
export default function RenderingView({ mesh, isMobile, requestHighDetailMesh, selectedModel, params }) { // Added new props
  const [modelSize, setModelSize] = useState(100);
  const [showFloor, setShowFloor] = useState(true);
  const [highQuality, setHighQuality] = useState(!isMobile); // For interactive view quality
  const [modelId, setModelId] = useState(Date.now()); // Unique ID for the current model
  const [isExporting, setIsExporting] = useState(false); // State for loading indicator
  const controlsRef = useRef(); // Ref for OrbitControls
  const exportHandlerRef = useRef(); // Ref for the ExportHandler component

  // Function to trigger export via the ref - NOW CAPTURES STATE
  const triggerExport = useCallback((format) => {
    const controls = controlsRef.current;
    if (!controls || !controls.object) {
      console.error("OrbitControls or camera not available for state capture.");
      alert("Cannot capture camera state for export.");
      return;
    }
    
    // Update controls to ensure internal state is current
    controls.update(); 
    
    // Capture state SYNCHRONOUSLY
    const capturedCameraState = {
      position: controls.object.position.clone(),
      quaternion: controls.object.quaternion.clone(),
      fov: controls.object.fov, // Capture FOV from controls camera too
    };
    // console.log("[EXPORT TRIGGER] Captured State:", capturedCameraState); // Removed log

    // Call handleExportImage with the captured state
    exportHandlerRef.current?.handleExportImage(format, capturedCameraState);

  }, []); // controlsRef is stable, no dependency needed

  // Update model ID when mesh changes to force scene re-creation
  useEffect(() => {
    setModelId(Date.now());
  }, [mesh]);
  
  // Calculate model size from mesh
  useEffect(() => {
    if (mesh && mesh.faces && mesh.faces.vertices) {
      try {
        // Calculate approximate size from vertices
        const vertices = mesh.faces.vertices;
        if (vertices && vertices.length > 0) {
          const xValues = [];
          const yValues = [];
          const zValues = [];
          
          for (let i = 0; i < vertices.length; i += 3) {
            xValues.push(vertices[i]);
            yValues.push(vertices[i + 1]);
            zValues.push(vertices[i + 2]);
          }
          
          if (xValues.length > 0 && yValues.length > 0 && zValues.length > 0) {
            const xRange = Math.max(...xValues) - Math.min(...xValues);
            const yRange = Math.max(...yValues) - Math.min(...yValues);
            const zRange = Math.max(...zValues) - Math.min(...zValues);
            
            const maxDimension = Math.max(xRange, yRange, zRange);
            setModelSize(maxDimension > 0 ? maxDimension : 100);
          }
        }
      } catch (error) {
        console.error("Error calculating model size:", error);
        setModelSize(100); // Fallback to default size
      }
    }
  }, [mesh]);

  // Pixel ratio based on quality setting
  const pixelRatio = highQuality ? Math.min(window.devicePixelRatio, 2) : 1;
  
  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      {/* Use key to force canvas recreation when model changes */}
      <Canvas
        key={`canvas-${modelId}`}
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: "#121212",
          touchAction: "none"
        }}
        dpr={pixelRatio}
        gl={{
          preserveDrawingBuffer: true, // Needed for image export
          antialias: highQuality,
          logarithmicDepthBuffer: true,
          alpha: false,
          precision: highQuality ? "highp" : "mediump"
        }}
        shadows={highQuality}
        camera={{
          fov: 45,
          near: 0.1,
          far: 2000,
          position: [0, -300, 200],
        }}
      >
        <Suspense fallback={null}>
          <Scene
            mesh={mesh}
            // isPlaying and rotationSpeed props removed
            modelSize={modelSize}
            showFloor={showFloor}
            highQuality={highQuality}
            modelId={modelId}
            controlsRef={controlsRef} // Pass ref to Scene
          />
          {/* Render the ExportHandler inside Canvas */}
          {/* Render the ExportHandler inside Canvas - no longer needs getControls */}
          <ExportHandler
            ref={exportHandlerRef}
            requestHighDetailMesh={requestHighDetailMesh} 
            setIsExporting={setIsExporting} 
          />
        </Suspense>
      </Canvas>

      {/* Loading Indicator Overlay */}
      {isExporting && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          color: 'white',
          fontSize: '1.5em',
          zIndex: 10 // Ensure it's above the canvas
        }}>
          Generating High Quality Export...
        </div>
      )}

      {/* Controls overlay */}
      <div style={{
        position: "absolute",
        bottom: isMobile ? "10px" : "20px",
        left: "0",
        right: "0",
        display: "flex",
        justifyContent: "center",
        gap: isMobile ? "8px" : "15px",
        background: "rgba(0,0,0,0.5)",
        padding: isMobile ? "8px" : "10px",
        borderRadius: "8px",
        margin: "0 auto",
        width: isMobile ? "95%" : "auto",
        maxWidth: "500px" // Adjust max-width if needed after removing controls
      }}>
        {/* Removed Play/Pause Button */}

        {/* Removed Speed Control */}

        <button
          onClick={() => setShowFloor(!showFloor)}
          style={{
            background: "rgba(255,255,255,0.2)",
            border: "none",
            color: "white",
            padding: isMobile ? "8px 12px" : "6px 12px",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: isMobile ? "14px" : "12px"
          }}
        >
          {showFloor ? "Hide Grid" : "Show Grid"}
        </button>

        {!isMobile && (
          <button
            onClick={() => setHighQuality(!highQuality)}
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "none",
              color: "white",
              padding: "6px 12px",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px"
            }}
          >
            {highQuality ? "Standard Quality" : "High Quality"}
          </button>
        )}

        {/* Export Buttons - Use triggerExport */}
        <button
          onClick={() => triggerExport('jpeg')}
          style={{
            background: "rgba(255,255,255,0.2)",
            border: "none",
            color: "white",
            padding: isMobile ? "8px 12px" : "6px 12px",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: isMobile ? "14px" : "12px"
          }}
          disabled={isExporting} // Disable button while exporting
        >
          {isExporting ? "Exporting..." : "Export JPG"}
        </button>
        <button
          onClick={() => triggerExport('png')}
          style={{
            background: "rgba(255,255,255,0.2)",
            border: "none",
            color: "white",
            padding: isMobile ? "8px 12px" : "6px 12px",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: isMobile ? "14px" : "12px"
          }}
          disabled={isExporting} // Disable button while exporting
        >
          {isExporting ? "Exporting..." : "Export PNG"}
        </button>
      </div>
    </div>
  );
}
