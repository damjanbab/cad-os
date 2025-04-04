// RenderingView.jsx
import React, { useRef, useState, useEffect, Suspense, forwardRef, useImperativeHandle } from "react";
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

  // Position camera initially
  useEffect(() => {
    // Position camera based on model size
    const distance = modelSize * 2.5;
    camera.position.set(
      distance * Math.sin(Math.PI / 4),
      -distance * Math.cos(Math.PI / 4), 
      distance * 0.7
    );
    camera.lookAt(target[0], target[1], target[2]);
    camera.updateProjectionMatrix();
  }, [camera, modelSize, target]);
  
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
const ExportHandler = forwardRef(({ getControls }, ref) => { // Removed isPlaying related props
  const { gl, scene, camera } = useThree();

  useImperativeHandle(ref, () => ({
    handleExportImage: (format = 'png') => {
      if (!gl || !scene || !camera) {
        console.error("Renderer, scene, or camera not available for export.");
        return;
      }
      const controls = getControls(); // Get controls ref from parent

      // Ensure controls and camera are up-to-date before rendering
      if (controls) {
        controls.update(); // Update controls state internally
      }
      camera.updateProjectionMatrix(); // Ensure camera matrix is current

      // Render the scene *now* with the current camera state
      gl.render(scene, camera);

      // Capture data URL immediately after render
      try {
          const mimeType = `image/${format}`;
          const quality = format === 'jpeg' ? 0.95 : undefined;
          const dataURL = gl.domElement.toDataURL(mimeType, quality);

          // Trigger download
          const link = document.createElement('a');
          link.download = `cad-render.${format}`;
          link.href = dataURL;
          document.body.appendChild(link); // Required for Firefox
          link.click();
          document.body.removeChild(link);

          console.log(`Image exported as ${format}`);

        } catch (error) {
          console.error(`Error exporting image as ${format}:`, error);
          alert(`Failed to export image as ${format}. See console for details.`);
        }
      // No need for finally block to restore rotation state
    }
  }));

  return null; // This component doesn't render anything itself
});


// Main 360° rendering view component
export default function RenderingView({ mesh, isMobile }) {
  // Removed isPlaying and rotationSpeed state
  const [modelSize, setModelSize] = useState(100);
  const [showFloor, setShowFloor] = useState(true);
  const [highQuality, setHighQuality] = useState(!isMobile);
  const [modelId, setModelId] = useState(Date.now()); // Unique ID for the current model
  const controlsRef = useRef(); // Ref for OrbitControls
  const exportHandlerRef = useRef(); // Ref for the ExportHandler component

  // Function to trigger export via the ref
  const triggerExport = (format) => {
    exportHandlerRef.current?.handleExportImage(format);
  };

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
          <ExportHandler
            ref={exportHandlerRef}
            getControls={() => controlsRef.current}
            // Removed isPlaying related props
          />
        </Suspense>
      </Canvas>

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
        >
          Export JPG
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
        >
          Export PNG
        </button>
      </div>
    </div>
  );
}
