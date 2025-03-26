# CAD-OS

A parametric CAD application built with Replicad, React, and Three.js. This project allows interactive 3D model creation and visualization with support for technical drawings and exploded views.

## Features

-   Interactive 3D model visualization with Three.js
-   Parametric model creation and modification
-   Technical drawing generation with orthographic projections
-   Explosion view for assembly visualization
-   Multiple pre-built model types:
    -   Basic shapes (Cuboid, Sphere, Cylinder, Ellipsoid)
    -   Compound shapes (L-Profile, Frustum, Drill)
    -   Pattern generation (Linear and Grid arrangements)
    -   Complex assemblies with helper spaces

## Technology Stack

-   [Replicad](https://replicad.xyz/): JavaScript CAD framework based on OpenCascade geometry kernel
-   React and React DOM for UI
-   Three.js with React Three Fiber for 3D visualization
-   Web Workers with Comlink for background processing
-   Vite for building and development

## Getting Started

### Running Locally


npm install

npm start

The application will be available at [http://localhost:4444](http://localhost:4444)

## Structure

The application is structured with:

-   **3D View**: Interactive model visualization with pan, rotate and zoom
-   **Technical Drawing View**: 2D orthographic projections with front, top, and side views
-   **Parameter Controls**: UI for modifying model dimensions and properties
-   **Model Selection**: Choose from various model types
