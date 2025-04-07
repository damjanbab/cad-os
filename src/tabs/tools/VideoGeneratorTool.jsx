import React, { useState, useEffect, useRef, useCallback } from 'react';
import { wrap } from "comlink";
import * as THREE from 'three'; // Import THREE
import Worker from '../../workers/videoFrame.worker.js?worker'; // Import the dedicated worker
import { modelRegistry, createDefaultParams } from '../../models'; // Import model registry and default params helper

// Helper Functions (copied from RenderingView initially)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export default function VideoGeneratorTool() {
  const [selectedModel, setSelectedModel] = useState(Object.keys(modelRegistry)[0] || ''); // Default to first model
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0); // Progress 0-100
  const [statusMessage, setStatusMessage] = useState('');
  const [videoDownloadUrl, setVideoDownloadUrl] = useState(null);
  const workerApiRef = useRef(null);

  // Initialize worker
  useEffect(() => {
    const workerInstance = new Worker();
    workerApiRef.current = wrap(workerInstance);
    console.log("[VideoTool] Video Frame Worker API wrapped with Comlink.");
    return () => {
      console.log("[VideoTool] Terminating Video Frame worker.");
      workerApiRef.current?.cleanupOffscreenRenderer?.();
      workerInstance.terminate();
      workerApiRef.current = null;
    };
  }, []);

  const handleGenerateVideo = useCallback(async () => {
    if (!workerApiRef.current) {
      alert("Video generation worker is not available.");
      return;
    }
    if (!selectedModel) {
      alert("Please select a model.");
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setStatusMessage('Starting video generation...');
    setVideoDownloadUrl(null);

    const modelDefinition = modelRegistry[selectedModel];
    if (!modelDefinition) {
        alert(`Model definition for "${selectedModel}" not found.`);
        setIsGenerating(false);
        return;
    }

    // --- Configuration ---
    const frameRate = 30;
    const durationSeconds = 5;
    const totalFrames = frameRate * durationSeconds;
    const exportWidth = 1280; // Lower resolution for faster testing
    const exportHeight = 720;
    const exportPixelRatio = 1;

    // --- Core Logic (Adapted from RenderingView's triggerVideoExport) ---
    // 1. Get base parameters for the selected model
    const baseModelParams = createDefaultParams(modelDefinition); // Use default params for now

    // 2. Loop `totalFrames` times:
    //    a. Calculate camera state (360 rotation)
    //    b. Calculate model parameters (e.g., animate explosionFactor if available)
    //    c. Call worker: `workerApiRef.current.generateVideoFrame(...)`
    //    d. Store returned ImageBitmap
    //    e. Update progress/status
    // 3. Assemble frames using MediaRecorder and temporary canvas
    // 4. Set download URL
    // 5. Handle errors
    const capturedFrames = []; // To store ImageBitmaps from worker

    // Define camera animation parameters (similar to RenderingView)
    // We need a reference point; let's assume a default camera setup for the tool
    const defaultCamPos = new THREE.Vector3(0, -300, 150); // Example default position
    const target = new THREE.Vector3(0, 0, 0); // Look at origin
    const radius = defaultCamPos.distanceTo(target);
    const initialHeight = defaultCamPos.y;
    const angleIncrement = (Math.PI * 2) / totalFrames;

    // Define initial camera settings for worker setup (if needed)
    const initialCameraSettings = { fov: 45, near: 0.1, far: 2000 };

    try {
        // Phase 1: Generate Frames via Worker
        setStatusMessage(`Generating ${totalFrames} frames for ${selectedModel}...`);
        for (let i = 0; i < totalFrames; i++) {
            const progressRatio = i / (totalFrames - 1); // 0 to 1
            console.log(`[VideoTool] Starting frame ${i + 1}/${totalFrames}`);

            // Calculate Camera State
            const currentAngle = i * angleIncrement;
            const camX = target.x + radius * Math.cos(currentAngle);
            const camZ = target.z + radius * Math.sin(currentAngle);
            const camPos = new THREE.Vector3(camX, initialHeight, camZ);
            const tempCam = new THREE.PerspectiveCamera();
            tempCam.position.copy(camPos);
            tempCam.lookAt(target);
            const camQuat = tempCam.quaternion;
            const cameraState = {
                position: { x: camPos.x, y: camPos.y, z: camPos.z },
                quaternion: { _x: camQuat.x, _y: camQuat.y, _z: camQuat.z, _w: camQuat.w }
            };

            // Calculate Model Parameters
            let animatedParams = { ...baseModelParams };
            if (modelDefinition.hasExplosion) { // Check if model supports explosion
                 const animatedExplosionFactor = Math.sin(progressRatio * Math.PI) * 0.2;
                 animatedParams.explosionFactor = animatedExplosionFactor;
            }
            // Add other animations here if needed based on modelDefinition.params

            const modelInfo = { type: selectedModel, params: animatedParams };

            // Call Worker
            let frameBitmap = null;
            try {
                console.log(`[VideoTool] Calling worker.generateVideoFrame for frame ${i + 1}`);
                frameBitmap = await workerApiRef.current.generateVideoFrame(
                    modelInfo.type,
                    modelInfo.params,
                    cameraState,
                    'standard',
                    exportWidth,
                    exportHeight,
                    exportPixelRatio,
                    initialCameraSettings // Pass initial settings for first frame setup
                );
                console.log(`[VideoTool] Received frameBitmap for frame ${i + 1}`);
            } catch (workerError) {
                 console.error(`[VideoTool] Error generating frame ${i + 1} in worker:`, workerError);
                 alert(`Error generating frame ${i + 1}. See console for details.`);
                 throw workerError;
            }
            capturedFrames.push(frameBitmap);

            // Update Progress
            const frameGenProgress = Math.round(((i + 1) / totalFrames) * 50);
            setProgress(frameGenProgress);
            setStatusMessage(`Generated frame ${i + 1}/${totalFrames}`);

            if (i % 10 === 0) await delay(1); // Prevent freezing
        }
        console.log("[VideoTool] Off-screen frame generation complete.");

        // Phase 2: Assemble Video
        setStatusMessage('Assembling video...');
        setProgress(51);

        const assemblyCanvas = document.createElement('canvas');
        assemblyCanvas.width = exportWidth;
        assemblyCanvas.height = exportHeight;
        const ctx = assemblyCanvas.getContext('2d');
        if (!ctx) throw new Error("Could not get 2D context for assembly canvas");

        let mimeType = 'video/webm;codecs=vp9';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
           console.warn(`${mimeType} not supported, trying video/webm...`);
           mimeType = 'video/webm';
           if (!MediaRecorder.isTypeSupported(mimeType)) {
             throw new Error("No supported video/webm MIME type found for MediaRecorder.");
           }
        }

        const stream = assemblyCanvas.captureStream(frameRate);
        const recorder = new MediaRecorder(stream, { mimeType });
        const recordedChunks = [];

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            recordedChunks.push(event.data);
          }
        };

        const recordingPromise = new Promise((resolve, reject) => {
          recorder.onstop = () => {
            console.log("[VideoTool] Recording stopped.");
            try {
              const blob = new Blob(recordedChunks, { type: mimeType });
              const url = URL.createObjectURL(blob);
              setVideoDownloadUrl(url);
              resolve();
            } catch (error) {
              reject(error);
            }
          };
          recorder.onerror = (event) => {
            console.error("[VideoTool] MediaRecorder error:", event.error);
            reject(event.error || new Error("MediaRecorder encountered an error."));
          };
        });

        recorder.start();
        console.log("[VideoTool] MediaRecorder started.");

        console.log("[VideoTool] Starting to draw frames onto assembly canvas...");
        for (let i = 0; i < capturedFrames.length; i++) {
          const bitmap = capturedFrames[i];
          if (bitmap) {
              ctx.drawImage(bitmap, 0, 0, assemblyCanvas.width, assemblyCanvas.height);
              bitmap.close();
          } else {
              console.warn(`[VideoTool] Frame ${i + 1} was null or undefined. Skipping draw.`);
          }
          const assemblyProgress = 51 + Math.round(((i + 1) / capturedFrames.length) * 49);
          setProgress(assemblyProgress);
          setStatusMessage(`Assembling frame ${i + 1}/${totalFrames}`);
          await delay(1000 / frameRate);
        }

        console.log("[VideoTool] Finished drawing frames to assembly canvas.");
        recorder.stop();
        await recordingPromise;
        console.log("[VideoTool] Video assembly complete.");
        setStatusMessage('Video generation complete.');

    } catch (error) {
        console.error("[VideoTool] Error during video export:", error);
        alert(`Failed to export video: ${error.message}`);
        setVideoDownloadUrl(null);
        setStatusMessage(`Error: ${error.message}`);
    } finally {
        console.log("[VideoTool] Cleaning up worker renderer...");
        await workerApiRef.current?.cleanupOffscreenRenderer?.();
        console.log("[VideoTool] Worker renderer cleanup attempted.");
        setIsGenerating(false);
        // Don't reset progress to 0 immediately, keep it at 100 or show final status
    }

  }, [selectedModel]); // Dependency on selectedModel

  return (
    <div>
      <h2>360 Animated Video Generator</h2>
      <div style={{ marginBottom: '15px' }}>
        <label htmlFor="model-select" style={{ marginRight: '10px' }}>Select Model:</label>
        <select
          id="model-select"
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          disabled={isGenerating}
        >
          {Object.keys(modelRegistry).map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>

      <button onClick={handleGenerateVideo} disabled={isGenerating}>
        {isGenerating ? `Generating... (${progress}%)` : 'Generate 360 Video'}
      </button>

      {isGenerating && (
        <div style={{ marginTop: '15px' }}>
          <progress value={progress} max="100" style={{ width: '100%' }}></progress>
          <p>{statusMessage}</p>
        </div>
      )}

      {videoDownloadUrl && !isGenerating && (
         <div style={{ marginTop: '15px', background: '#e0ffe0', padding: '10px', borderRadius: '5px' }}>
           <p>Video ready!</p>
           <a href={videoDownloadUrl} download={`${selectedModel}-360-video.webm`} onClick={() => setVideoDownloadUrl(null)}>
             Download Video (WEBM)
           </a>
           <button onClick={() => setVideoDownloadUrl(null)} style={{ marginLeft: '10px' }}>Close</button>
         </div>
       )}
    </div>
  );
}
