// Dedicated worker for generating video frames off-screen
import * as THREE from 'three';
import opencascade from "replicad-opencascadejs/src/replicad_single.js";
import opencascadeWasm from "replicad-opencascadejs/src/replicad_single.wasm?url";
import { setOC } from "replicad";
import { expose } from "comlink";

// Import model registry and validation function (relative path from new location)
import { modelRegistry, createModelWithValidation } from "../models";

// --- OpenCascade Initialization ---
let loaded = false;
const init = async () => {
  if (loaded) return Promise.resolve(true);
  console.log("[VideoWorker] Initializing OpenCascade...");
  const OC = await opencascade({
    locateFile: () => opencascadeWasm,
  });
  loaded = true;
  setOC(OC);
  console.log("[VideoWorker] OpenCascade Initialized.");
  return true;
};
const started = init();

// --- Off-Screen Rendering Environment (Persistent in Worker) ---
let offScreenRenderer = null;
let offScreenScene = null;
let offScreenCamera = null;
let currentOffScreenMeshGroup = null; // Group to hold faces and edges

function setupOffscreenRenderer(width, height, pixelRatio, cameraSettings) {
  if (offScreenRenderer) {
    console.log("[VideoWorker] Off-screen renderer already initialized.");
    // Ensure size is updated if necessary
    if (offScreenRenderer.domElement.width !== width || offScreenRenderer.domElement.height !== height) {
        console.log(`[VideoWorker] Resizing off-screen renderer to ${width}x${height}`);
        offScreenRenderer.setSize(width, height, false);
        offScreenCamera.aspect = width / height;
        offScreenCamera.updateProjectionMatrix();
    }
    return;
  }

  console.log("[VideoWorker] Setting up off-screen rendering environment...");
  const canvas = new OffscreenCanvas(width, height); // Use OffscreenCanvas

  offScreenRenderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    preserveDrawingBuffer: false, // Don't need preserve for transferToImageBitmap
    alpha: false,
    precision: 'highp',
  });
  offScreenRenderer.setPixelRatio(pixelRatio);
  offScreenRenderer.setSize(width, height, false); // Add false to prevent style update
  offScreenRenderer.setClearColor(new THREE.Color("#121212"));

  offScreenScene = new THREE.Scene();
  THREE.Object3D.DEFAULT_UP.set(0, 0, 1); // Set Z-up

  offScreenCamera = new THREE.PerspectiveCamera(
    cameraSettings.fov,
    width / height,
    cameraSettings.near,
    cameraSettings.far
  );
  offScreenScene.add(offScreenCamera); // Add camera to scene

  // Basic Lighting
  offScreenScene.add(new THREE.AmbientLight(0xffffff, 1.5));
  const dirLight1 = new THREE.DirectionalLight(0xffffff, 3);
  dirLight1.position.set(10, 10, 10);
  offScreenScene.add(dirLight1);
  const dirLight2 = new THREE.DirectionalLight(0xffffff, 1);
  dirLight2.position.set(-10, -10, 5);
  offScreenScene.add(dirLight2);
  offScreenScene.add(new THREE.HemisphereLight(0xffffff, 0x555555, 1));

  currentOffScreenMeshGroup = new THREE.Group();
  offScreenScene.add(currentOffScreenMeshGroup);

  console.log("[VideoWorker] Off-screen rendering environment setup complete.");
}

function cleanupOffscreenRenderer() {
  console.log("[VideoWorker] Cleaning up off-screen rendering environment...");
  if (currentOffScreenMeshGroup) {
     currentOffScreenMeshGroup.traverse(child => {
        if (child.isMesh || child.isLineSegments) {
          child.geometry?.dispose();
          if (child.material) {
             if (Array.isArray(child.material)) {
               child.material.forEach(mat => mat.dispose());
             } else {
               child.material.dispose();
             }
          }
        }
      });
    if(offScreenScene) offScreenScene.remove(currentOffScreenMeshGroup); // Check if scene exists
    currentOffScreenMeshGroup = null;
  }
  if (offScreenRenderer) {
    offScreenRenderer.dispose();
    offScreenRenderer = null;
  }
  offScreenScene = null;
  offScreenCamera = null;
  console.log("[VideoWorker] Off-screen cleanup complete.");
}

// --- Generate Video Frame Function (Off-Screen in Worker) ---
async function generateVideoFrame(modelName, params, cameraState, quality = 'standard', renderWidth, renderHeight, pixelRatio, initialCameraSettings) {
  await started; // Ensure OpenCascade is loaded

  // Setup renderer if not already done
  // Pass camera settings only if initializing
  setupOffscreenRenderer(renderWidth, renderHeight, pixelRatio, offScreenRenderer ? null : initialCameraSettings);


  if (!offScreenRenderer || !offScreenScene || !offScreenCamera) {
    throw new Error("[VideoWorker] Off-screen environment failed to initialize.");
  }

  console.log(`[VideoWorker] Starting generateVideoFrame for ${modelName}`);
  try {
    // --- 1. Generate Replicad Shape using OpenCascade ---
    console.log("[VideoWorker] Generating shape...");
    const result = createModelWithValidation(modelName, params);
    if (result && result.error) {
      console.error("[VideoWorker] Model validation failed:", result.validationErrors);
      throw new Error(`Model validation failed: ${JSON.stringify(result.validationErrors)}`);
    }
    const shape = result.main || result; // Handle different return structures
    console.log("[VideoWorker] Shape generated.");

    // --- 2. Generate Mesh Data ---
    console.log("[VideoWorker] Generating mesh data...");
    const meshOptions = quality === 'high'
        ? { tolerance: 0.01, angularTolerance: 1 }
        : { tolerance: 0.1, angularTolerance: 15 };
    const facesData = shape.mesh(meshOptions);
    const edgesData = shape.meshEdges(meshOptions);
    console.log("[VideoWorker] Mesh data generated.");

    // --- 3. Update Three.js Scene ---
    console.log("[VideoWorker] Updating Three.js scene...");
    // Clear previous meshes from the group
    while (currentOffScreenMeshGroup.children.length > 0) {
        const child = currentOffScreenMeshGroup.children[0];
        child.geometry?.dispose();
         if (child.material) {
             if (Array.isArray(child.material)) {
               child.material.forEach(mat => mat.dispose());
             } else {
               child.material.dispose();
             }
          }
        currentOffScreenMeshGroup.remove(child);
    }

    // Add Faces Mesh
    if (facesData && facesData.vertices && facesData.normals && facesData.triangles) {
        const geometryFaces = new THREE.BufferGeometry();
        geometryFaces.setAttribute('position', new THREE.BufferAttribute(new Float32Array(facesData.vertices), 3));
        geometryFaces.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(facesData.normals), 3));
        geometryFaces.setIndex(new THREE.BufferAttribute(new Uint32Array(facesData.triangles), 1));
        const materialFaces = new THREE.MeshStandardMaterial({
            color: "#6a92a6", metalness: 0.4, roughness: 0.3, envMapIntensity: 0.8, flatShading: false, side: THREE.DoubleSide
        });
        const meshFaces = new THREE.Mesh(geometryFaces, materialFaces);
        currentOffScreenMeshGroup.add(meshFaces);
    }

    // Add Edges Mesh
    if (edgesData && edgesData.vertices) {
        const geometryEdges = new THREE.BufferGeometry();
        geometryEdges.setAttribute('position', new THREE.BufferAttribute(new Float32Array(edgesData.vertices), 3));
        const materialEdges = new THREE.LineBasicMaterial({ color: "#304352", linewidth: 1 });
        const meshEdges = new THREE.LineSegments(geometryEdges, materialEdges);
        currentOffScreenMeshGroup.add(meshEdges);
    }
    console.log("[VideoWorker] Three.js scene updated.");

    // --- 4. Update Camera ---
    console.log("[VideoWorker] Updating camera...");
    // Note: cameraState received from main thread might not be THREE.Vector3/Quaternion instances
    offScreenCamera.position.set(cameraState.position.x, cameraState.position.y, cameraState.position.z);
    offScreenCamera.quaternion.set(cameraState.quaternion._x, cameraState.quaternion._y, cameraState.quaternion._z, cameraState.quaternion._w);
    offScreenCamera.updateProjectionMatrix();
    console.log("[VideoWorker] Camera updated.");

    // --- 5. Render Scene ---
    console.log("[VideoWorker] Rendering scene...");
    offScreenRenderer.render(offScreenScene, offScreenCamera);
    console.log("[VideoWorker] Scene rendered.");

    // --- 6. Capture Frame ---
    console.log("[VideoWorker] Capturing frame (transferToImageBitmap)...");
    // Use transferToImageBitmap for better performance in workers
    const imageBitmap = offScreenRenderer.domElement.transferToImageBitmap();
    console.log("[VideoWorker] Frame captured.");
    return imageBitmap;

  } catch (error) {
    console.error("[VideoWorker] Error generating video frame:", error);
    // cleanupOffscreenRenderer(); // Don't cleanup here, let main thread decide
    throw error; // Re-throw to be handled by the main thread
  }
}

// Export only the functions needed by the main thread for video generation
expose({ generateVideoFrame, cleanupOffscreenRenderer });
