// models/metadata.js
// Explicitly define parameter metadata for each model

export const modelMetadata = {
    "Cuboid": {
      params: [
        { name: "width", defaultValue: 100 },
        { name: "depth", defaultValue: 100 },
        { name: "height", defaultValue: 100 }
      ],
      hasExplosion: false
    },
    "Sphere": {
      params: [
        { name: "radius", defaultValue: 50 }
      ],
      hasExplosion: false
    },
    "Cylinder": {
      params: [
        { name: "radius", defaultValue: 50 },
        { name: "height", defaultValue: 100 }
      ],
      hasExplosion: false
    },
    "Ellipsoid": {
      params: [
        { name: "aLength", defaultValue: 80 },
        { name: "bLength", defaultValue: 50 },
        { name: "cLength", defaultValue: 30 }
      ],
      hasExplosion: false
    },
    "DiagonalCuboidPattern": {
      params: [
        { name: "count", defaultValue: 5 },
        { name: "vectorX", defaultValue: 0 },
        { name: "vectorY", defaultValue: 50 },
        { name: "vectorZ", defaultValue: 50 },
        { name: "originX", defaultValue: 0 },
        { name: "originY", defaultValue: 0 },
        { name: "originZ", defaultValue: 0 },
        { name: "boxWidth", defaultValue: 10 },
        { name: "boxDepth", defaultValue: 10 },
        { name: "boxHeight", defaultValue: 10 },
        { name: "orientationX", defaultValue: 0 },
        { name: "orientationY", defaultValue: 0 },
        { name: "orientationZ", defaultValue: 1 }
      ],
      hasExplosion: false
    },
    "RectangularCuboidGrid": {
      params: [
        { name: "originX", defaultValue: 0 },
        { name: "originY", defaultValue: 0 },
        { name: "originZ", defaultValue: 0 },
        { name: "directionX", defaultValue: 1 },
        { name: "directionY", defaultValue: 0 },
        { name: "directionZ", defaultValue: 0 },
        { name: "normalX", defaultValue: 0 },
        { name: "normalY", defaultValue: 0 },
        { name: "normalZ", defaultValue: 1 },
        { name: "rowCount", defaultValue: 3 },
        { name: "colCount", defaultValue: 3 },
        { name: "xSpacing", defaultValue: 30 },
        { name: "ySpacing", defaultValue: 30 },
        { name: "boxWidth", defaultValue: 10 },
        { name: "boxDepth", defaultValue: 10 },
        { name: "boxHeight", defaultValue: 10 },
        { name: "orientationX", defaultValue: 0 },
        { name: "orientationY", defaultValue: 0 },
        { name: "orientationZ", defaultValue: 1 }
      ],
      hasExplosion: false
    },
    "LProfile": {
      params: [
        { name: "depth", defaultValue: 100 },
        { name: "flangeXLenght", defaultValue: 50 },
        { name: "flangeYLenght", defaultValue: 50 },
        { name: "thickness", defaultValue: 5 }
      ],
      hasExplosion: false
    },
    "Frustum": {
      params: [
        { name: "bottomRadius", defaultValue: 50 },
        { name: "topRadius", defaultValue: 25 },
        { name: "height", defaultValue: 100 }
      ],
      hasExplosion: false
    },
    "Drill": {
      params: [
        { name: "bottomRadius", defaultValue: 50 },
        { name: "topRadius", defaultValue: 25 },
        { name: "frustumHeight", defaultValue: 80 },
        { name: "cylinderHeight", defaultValue: 40 }
      ],
      hasExplosion: false
    },
    "HelperCuboid": {
      params: [
        { name: "width", defaultValue: 50 },
        { name: "depth", defaultValue: 100 },
        { name: "height", defaultValue: 200 },
        { name: "showHelper", defaultValue: true },
        { name: "explosionFactor", defaultValue: 0 }
      ],
      hasExplosion: true
    }
  };