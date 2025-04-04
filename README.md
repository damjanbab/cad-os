# CAD-OS

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-0.18.1-blue.svg)](package.json)

A parametric CAD application built with Replicad, React, and Three.js. This project allows interactive 3D model creation and visualization, featuring advanced technical drawing generation and web worker-based performance optimizations.

**[Live Demo](https://damjanbab.github.io/cad-os/)**

## Features

*   **Interactive 3D Parametric Modeling:** Create and modify 3D models using parameters, powered by the [Replicad](https://replicad.xyz/) geometry kernel (based on OpenCascade).
*   **Real-time 3D Rendering:** Visualize models interactively using [Three.js](https://threejs.org/) and [React Three Fiber](https://docs.pmnd.rs/react-three-fiber/getting-started/introduction). Includes camera controls (pan, zoom, rotate) and enhanced lighting.
*   **Advanced Technical Drawing Generation:**
    *   Generates standard orthographic views (Front, Top, Right).
    *   Supports models composed of multiple parts/components.
    *   Ensures consistent scaling across all views for accurate representation.
    *   Renders both visible and hidden lines.
    *   Optimizes SVG output by merging collinear line segments and detecting circles.
    *   Provides interactive path elements, enabling features like measurements.
*   **Measurements:** Ability to measure distances on the technical drawings (implementation details may vary).
*   **Web Worker Offloading:** Utilizes Web Workers via [Comlink](https://github.com/GoogleChromeLabs/comlink) to perform computationally intensive tasks (mesh generation, technical drawing processing) in the background, keeping the UI responsive.
*   **Parametric Model Library:** Includes several pre-built parametric models (e.g., Cuboid, Sphere, Cylinder, L-Profile, Staircase).
*   **Explosion View:** Visualize assembly structures with exploded views (currently implemented within specific models like the Staircase assembly due to Replicad's garbage collection behavior).

## Technology Stack

*   **CAD Kernel:** [Replicad](https://replicad.xyz/) (v0.18.1) / [Opencascade.js](https://github.com/occt-web-viewer/opencascade.js)
*   **Frontend Framework:** [React](https://reactjs.org/) (v18.2.0)
*   **3D Rendering:** [Three.js](https://threejs.org/), [React Three Fiber](https://docs.pmnd.rs/react-three-fiber/getting-started/introduction), [@react-three/drei](https://github.com/pmndrs/drei)
*   **Asynchronous Processing:** Web Workers, [Comlink](https://github.com/GoogleChromeLabs/comlink)
*   **Build Tool:** [Vite](https://vitejs.dev/)
*   **Deployment:** [gh-pages](https://github.com/tschaub/gh-pages)

## Getting Started

### Prerequisites

*   [Node.js](https://nodejs.org/) (LTS version recommended)
*   [pnpm](https://pnpm.io/) (recommended) or npm (comes with Node.js)

### Installation

```bash
# Using pnpm (recommended)
pnpm install

# Or using npm
npm install
```

### Running Locally

```bash
# Using pnpm
pnpm start

# Or using npm
npm start
```

The application will typically be available at `http://localhost:5173` (Vite's default) or the port specified in your Vite config.

### Building for Production

```bash
# Using pnpm
pnpm build

# Or using npm
npm run build
```

This command generates the production-ready static files in the `dist` directory (or as configured in `vite.config.js`).

## Project Structure Overview

```
/
├── public/             # Static assets
├── src/
│   ├── components/     # React components (UI, 3D scene elements, technical drawing parts)
│   ├── helpers/        # Utility functions for geometry, positioning, etc.
│   ├── logic/          # Core application logic (e.g., technicalDrawingProcessor.js)
│   ├── models/         # Definitions for parametric models
│   ├── tabs/           # Components representing different application tabs/views
│   ├── utils/          # General utility functions (SVG, geometry)
│   ├── App.jsx         # Main application component
│   ├── index.jsx       # Application entry point
│   ├── worker.js       # Web worker implementation
│   └── ...             # Other source files
├── .gitignore
├── index.html          # HTML entry point
├── LICENSE             # Project License (MIT)
├── package.json        # Project metadata and dependencies
├── README.md           # This file
└── vite.config.js      # Vite build configuration
```

## Core Concepts

*   **Parametric Modeling:** Models are defined in `src/models/` using Replicad's API. Changes to parameters trigger regeneration of the model geometry.
*   **Rendering Pipeline:** React components in `src/components/` use React Three Fiber to render the 3D scene. The `RenderingView.jsx` manages the main 3D canvas setup.
*   **Web Worker Communication:** The main thread communicates with `src/worker.js` using Comlink to request mesh generation (`createMesh`) or technical drawings (`createProjections`) based on model parameters.
*   **Technical Drawing Generation:** `src/logic/technicalDrawingProcessor.js` takes a Replicad model, generates orthographic projections using `replicad.drawProjection`, processes the results into SVG paths, applies optimizations, and prepares data for rendering by components in `src/components/technical-drawing/`.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
