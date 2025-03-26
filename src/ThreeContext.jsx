import React, { Suspense, useRef, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

// Set Z as the up direction for ReplicAD models
THREE.Object3D.DEFAULT_UP.set(0, 0, 1);

// Camera setup component that forcibly configures the camera
function CameraSetup() {
  const { camera, set } = useThree();
  
  useEffect(() => {
    // Force camera to be orthographic
    if (!(camera instanceof THREE.OrthographicCamera)) {
      console.log("Converting to orthographic camera");
      const aspect = window.innerWidth / window.innerHeight;
      const frustumSize = 1000;
      const newCamera = new THREE.OrthographicCamera(
        frustumSize * aspect / -2,
        frustumSize * aspect / 2,
        frustumSize / 2,
        frustumSize / -2,
        0.01,
        10000
      );
      newCamera.position.set(0, -400, 200);
      newCamera.lookAt(0, 0, 0);
      newCamera.updateProjectionMatrix();
      set({ camera: newCamera });
    } else {
      console.log("Camera is already orthographic");
      camera.position.set(0, -400, 200);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
    }
  }, [camera, set]);
  
  return null;
}

// Coordinate system visualization component
function CoordinateSystem() {
  return (
    <>
      {/* Axes helper to show the X, Y, Z axes - Red is X, Green is Y, Blue is Z */}
      <axesHelper args={[200]} />
      
      {/* Grid in XY plane (since Z is up, this is the "ground plane") */}
      <gridHelper args={[400, 40, 0x888888, 0x444444]} rotation={[Math.PI/2, 0, 0]} />
    </>
  );
}

export default function ThreeContext({ children }) {
  const dpr = Math.min(window.devicePixelRatio, 2);

  return (
    <Suspense fallback={null}>
      <Canvas
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: "#f5f5f5",
        }}
        dpr={dpr}
        frameloop="demand"
        orthographic
        camera={{
          position: [0, -400, 200],
          zoom: 1,
          far: 10000,
          near: 0.01
        }}
      >
        <CameraSetup />
        <OrbitControls
          enableRotate={true}
          enablePan={true}
          enableZoom={true}
          mouseButtons={{
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.PAN
          }}
          zoomToCursor={true}
        />
        <ambientLight intensity={4} />
        <pointLight position={[100, 100, 100]} />
        
        {/* Add coordinate system */}
        <CoordinateSystem />
        
        {children}
      </Canvas>
    </Suspense>
  );
}