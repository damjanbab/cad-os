import * as THREE from "three";

/**
 * Generates a Data URL for a 3D model image using off-screen rendering.
 *
 * @param {object} highDetailMesh - The mesh data containing faces (vertices, normals, triangles) and optionally edges.
 * @param {object} capturedCameraState - Object with camera's { position: THREE.Vector3, quaternion: THREE.Quaternion, fov: number }.
 * @param {THREE.PerspectiveCamera} mainCamera - The main scene camera (used for aspect, near, far).
 * @param {'png' | 'jpeg'} format - The desired image format.
 * @returns {Promise<string>} A promise that resolves with the image data URL.
 * @throws {Error} If rendering fails or required data is missing.
 */
export const generate3DModelImageDataUrl = async (highDetailMesh, capturedCameraState, mainCamera, format = 'png') => {
  // --- Off-screen rendering logic will be moved here ---
  console.log("generate3DModelImageDataUrl called with format:", format); // Placeholder

  if (!highDetailMesh || !highDetailMesh.faces || !highDetailMesh.faces.vertices) {
    throw new Error("Invalid or missing high detail mesh data.");
  }
  if (!capturedCameraState) {
    throw new Error("Captured camera state is required.");
  }
  if (!mainCamera) {
    throw new Error("Main camera reference is required.");
  }

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
    // --- Create Off-Screen Rendering Environment ---
    const aspect = mainCamera.aspect;
    const exportHeight = 4096; // High resolution for export
    const exportWidth = Math.round(exportHeight * aspect);

    // 1. Canvas
    offScreenCanvas = document.createElement('canvas');
    offScreenCanvas.width = exportWidth;
    offScreenCanvas.height = exportHeight;

    // 2. Renderer
    offScreenRenderer = new THREE.WebGLRenderer({
      canvas: offScreenCanvas,
      antialias: true,
      preserveDrawingBuffer: true,
      alpha: false,
      precision: 'highp',
    });
    offScreenRenderer.setSize(exportWidth, exportHeight);
    offScreenRenderer.setClearColor(new THREE.Color("#121212")); // Match main background
    offScreenRenderer.shadowMap.enabled = true;

    // 3. Scene
    offScreenScene = new THREE.Scene();

    // 4. Lighting & Environment (High quality)
    offScreenScene.add(new THREE.AmbientLight(0xffffff, 1.5));
    const dirLight1 = new THREE.DirectionalLight(0xffffff, 3);
    dirLight1.position.set(10, 10, 10);
    dirLight1.castShadow = true;
    offScreenScene.add(dirLight1);
    const dirLight2 = new THREE.DirectionalLight(0xffffff, 1);
    dirLight2.position.set(-10, -10, 5);
    offScreenScene.add(dirLight2);
    offScreenScene.add(new THREE.HemisphereLight(0xffffff, 0x555555, 1));
    // Note: Environment component needs React context, manually add env map if needed or skip for simplicity in service

    // 5. Geometry & Materials
    // Faces
    if (highDetailMesh.faces && highDetailMesh.faces.vertices && highDetailMesh.faces.normals && highDetailMesh.faces.triangles) {
      geometryFaces = new THREE.BufferGeometry();
      geometryFaces.setAttribute('position', new THREE.BufferAttribute(new Float32Array(highDetailMesh.faces.vertices), 3));
      geometryFaces.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(highDetailMesh.faces.normals), 3));
      geometryFaces.setIndex(new THREE.BufferAttribute(new Uint32Array(highDetailMesh.faces.triangles), 1));

      materialFaces = new THREE.MeshStandardMaterial({
        color: "#6a92a6", metalness: 0.4, roughness: 0.3, envMapIntensity: 0.8, flatShading: false,
      });

      meshFaces = new THREE.Mesh(geometryFaces, materialFaces);
      meshFaces.castShadow = true;
      meshFaces.receiveShadow = true;
      offScreenScene.add(meshFaces);
    }

    // Edges
    if (highDetailMesh.edges && highDetailMesh.edges.vertices) {
      geometryEdges = new THREE.BufferGeometry();
      geometryEdges.setAttribute('position', new THREE.BufferAttribute(new Float32Array(highDetailMesh.edges.vertices), 3));

      materialEdges = new THREE.LineBasicMaterial({ color: "#304352", linewidth: 1 });

      meshEdges = new THREE.LineSegments(geometryEdges, materialEdges);
      offScreenScene.add(meshEdges);
    }

    // 6. Camera (Sync with captured state)
    offScreenCamera = new THREE.PerspectiveCamera(
      capturedCameraState.fov,
      exportWidth / exportHeight, // Use calculated aspect ratio
      mainCamera.near,
      mainCamera.far
    );

    offScreenCamera.position.copy(capturedCameraState.position);
    offScreenCamera.quaternion.copy(capturedCameraState.quaternion);
    offScreenCamera.updateProjectionMatrix();

    // --- Render and Export ---
    offScreenRenderer.render(offScreenScene, offScreenCamera);

    const mimeType = `image/${format}`;
    const quality = format === 'jpeg' ? 0.95 : undefined;
    const dataURL = offScreenRenderer.domElement.toDataURL(mimeType, quality);

    return dataURL; // Resolve the promise with the data URL

  } catch (error) {
    console.error(`Error generating 3D model image data URL:`, error);
    throw error; // Re-throw the error to be caught by the caller
  } finally {
    // --- Cleanup ---
    if (offScreenRenderer) offScreenRenderer.dispose();
    if (geometryFaces) geometryFaces.dispose();
    if (geometryEdges) geometryEdges.dispose();
    if (materialFaces) materialFaces.dispose();
    if (materialEdges) materialEdges.dispose();
    // More aggressive cleanup if needed: offScreenScene.traverse(obj => { if (obj.dispose) obj.dispose(); });
    offScreenCanvas = null;
    offScreenRenderer = null;
    offScreenScene = null;
    offScreenCamera = null;
    geometryFaces = null;
    geometryEdges = null;
    materialFaces = null;
    materialEdges = null;
    meshFaces = null;
    meshEdges = null;
  }
};
