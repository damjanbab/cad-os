import * as THREE from 'three';
import { createStaircase } from '../models/staircase.js'; // Import the staircase model function

let offScreenCanvas = null;
let offScreenRenderer = null;
let offScreenScene = null;
let offScreenCamera = null;
let controls = null; // May need OrbitControls if camera manipulation is complex
let currentMesh = null; // To hold the currently rendered mesh

const setupOffScreenEnvironment = (width, height, pixelRatio, cameraSettings) => {
  if (offScreenRenderer) return; // Already initialized

  console.log("Setting up off-screen video frame generator environment...");

  // 1. Canvas
  offScreenCanvas = document.createElement('canvas');
  offScreenCanvas.width = width;
  offScreenCanvas.height = height;

  // 2. Renderer
  offScreenRenderer = new THREE.WebGLRenderer({
    canvas: offScreenCanvas,
    antialias: true, // Keep antialias for quality
    preserveDrawingBuffer: true, // Needed for toDataURL/toBlob
    alpha: false,
    precision: 'highp', // Use high precision
  });
  offScreenRenderer.setPixelRatio(pixelRatio);
  offScreenRenderer.setSize(width, height);
  offScreenRenderer.setClearColor(new THREE.Color("#121212")); // Match main background
  // Enable shadows if needed, but might impact performance
  // offScreenRenderer.shadowMap.enabled = true;

  // 3. Scene
  offScreenScene = new THREE.Scene();
  THREE.Object3D.DEFAULT_UP.set(0, 0, 1); // Set Z-up

  // 4. Camera (Use settings from main camera initially)
  offScreenCamera = new THREE.PerspectiveCamera(
    cameraSettings.fov,
    width / height,
    cameraSettings.near,
    cameraSettings.far
  );
  offScreenScene.add(offScreenCamera);

  // 5. Lighting (Similar to RenderingView)
  offScreenScene.add(new THREE.AmbientLight(0xffffff, 1.5));
  const dirLight1 = new THREE.DirectionalLight(0xffffff, 3);
  dirLight1.position.set(10, 10, 10);
  // dirLight1.castShadow = true; // Optional performance consideration
  offScreenScene.add(dirLight1);
  const dirLight2 = new THREE.DirectionalLight(0xffffff, 1);
  dirLight2.position.set(-10, -10, 5);
  offScreenScene.add(dirLight2);
  offScreenScene.add(new THREE.HemisphereLight(0xffffff, 0x555555, 1));

  // TODO: Add Environment if needed (like in RenderingView)
  // Requires loading, might be complex here. Start without?

  console.log("Off-screen environment setup complete.");
};

/**
 * Generates a single frame for the video.
 * @param {object} modelInfo - Information about the model to render { type: string, params: object }
 * @param {object} cameraState - Desired camera state { position: THREE.Vector3, quaternion: THREE.Quaternion }
 * @param {string} format - 'image/jpeg' or 'image/png'
 * @param {number} quality - JPEG quality (0-1)
 * @returns {Promise<string>} A promise resolving with the frame as a Data URL.
 */
export const generateFrame = async (modelInfo, cameraState, format = 'image/jpeg', quality = 0.8) => {
  if (!offScreenRenderer || !offScreenScene || !offScreenCamera) {
    throw new Error("Off-screen environment not initialized. Call setup first.");
  }
  if (!modelInfo || !modelInfo.type || !modelInfo.params) {
     throw new Error("Invalid modelInfo provided to generateFrame.");
  }
   if (!cameraState || !cameraState.position || !cameraState.quaternion) {
     throw new Error("Invalid cameraState provided to generateFrame.");
   }

  try {
    // --- Update Camera ---
    offScreenCamera.position.copy(cameraState.position);
    offScreenCamera.quaternion.copy(cameraState.quaternion);
    // FOV might also change per frame if needed: offScreenCamera.fov = cameraState.fov;
    offScreenCamera.updateProjectionMatrix(); // Important after changes

    // --- Update Model ---
    // --- Update Model ---
    // Remove previous mesh and dispose resources
    if (currentMesh) {
      offScreenScene.remove(currentMesh);
      // Dispose geometry and materials to prevent memory leaks
      if (currentMesh.geometry) {
        currentMesh.geometry.dispose();
      }
      if (currentMesh.material) {
        if (Array.isArray(currentMesh.material)) {
          currentMesh.material.forEach(mat => mat.dispose());
        } else {
          currentMesh.material.dispose();
        }
      }
      // If it's a group, traverse and dispose
      currentMesh.traverse(child => {
        if (child.isMesh) {
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
      currentMesh = null; // Clear reference
    }

    // Generate new mesh based on modelInfo.type and modelInfo.params
    // This is where the logic to call the correct model function goes
    console.log(`Generating frame for model type: ${modelInfo.type} with params:`, modelInfo.params);

    let modelOutput;
    if (modelInfo.type === 'staircase') {
      // Call createStaircase, ensuring showHelper is false to avoid rendering helpers
      modelOutput = createStaircase({ ...modelInfo.params, showHelper: false });
      currentMesh = modelOutput.main; // Get the main shape
    } else {
      console.error(`Unsupported model type for video frame generation: ${modelInfo.type}`);
      // Create a fallback placeholder (e.g., small red sphere) to indicate error
      const errorGeometry = new THREE.SphereGeometry(10, 16, 8);
      const errorMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000, roughness: 0.8 });
      currentMesh = new THREE.Mesh(errorGeometry, errorMaterial);
    }
    // --- End Model Generation ---

    if (!currentMesh) {
        console.error("Model generation function did not return a valid mesh/group.");
        // Create a fallback placeholder
        const errorGeometry = new THREE.SphereGeometry(10, 16, 8);
        const errorMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000, roughness: 0.8 });
        currentMesh = new THREE.Mesh(errorGeometry, errorMaterial);
    }

    offScreenScene.add(currentMesh);

    // --- Render ---
    offScreenRenderer.render(offScreenScene, offScreenCamera);

    // --- Capture ---
    const dataURL = offScreenRenderer.domElement.toDataURL(format, quality);
    return dataURL;

  } catch (error) {
    console.error("Error generating video frame:", error);
    throw error; // Re-throw to be caught by the caller
  }
};

/**
 * Cleans up the off-screen rendering environment.
 */
export const cleanupOffScreenEnvironment = () => {
  console.log("Cleaning up off-screen video frame generator environment...");
  // Ensure final mesh is removed and disposed
  if (currentMesh) {
      offScreenScene.remove(currentMesh);
       if (currentMesh.geometry) {
        currentMesh.geometry.dispose();
      }
      if (currentMesh.material) {
        if (Array.isArray(currentMesh.material)) {
          currentMesh.material.forEach(mat => mat.dispose());
        } else {
          currentMesh.material.dispose();
        }
      }
      currentMesh.traverse(child => {
        if (child.isMesh) {
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
      currentMesh = null;
  }
  // Dispose renderer and scene resources
  if (offScreenRenderer) {
    offScreenRenderer.dispose();
    offScreenRenderer = null;
  }
  if (offScreenScene) {
    // TODO: Traverse and dispose all objects?
    offScreenScene = null;
  }
  if (offScreenCamera) {
    offScreenCamera = null;
  }
  if (offScreenCanvas) {
    // Optional: Remove canvas from memory if created dynamically
    offScreenCanvas = null;
  }
  console.log("Off-screen cleanup complete.");
};

// Initial setup function to be called from RenderingView
export const initializeVideoFrameGenerator = (width, height, pixelRatio, cameraSettings) => {
    setupOffScreenEnvironment(width, height, pixelRatio, cameraSettings);
};
