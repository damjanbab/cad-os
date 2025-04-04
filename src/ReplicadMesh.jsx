import React, { useRef, useLayoutEffect, useEffect, useState } from "react";
import { useThree } from "@react-three/fiber";
import { BufferGeometry } from "three";
import {
  syncFaces,
  syncLines,
  syncLinesFromFaces,
} from "replicad-threejs-helper";

export default React.memo(function ShapeMeshes({ faces, edges, helperSpaces = [], highQuality = false }) {
  const { invalidate } = useThree();
  const [helperGeometries, setHelperGeometries] = useState([]);
  
  const body = useRef(new BufferGeometry());
  const lines = useRef(new BufferGeometry());

  // Initialize or update helper geometries
  useEffect(() => {
    // Clean up previous geometries if needed
    helperGeometries.forEach(geo => {
      geo.body.dispose();
      geo.lines.dispose();
    });
    
    // Create new geometries for each helper space
    const newGeometries = helperSpaces.map(() => ({
      body: new BufferGeometry(),
      lines: new BufferGeometry()
    }));
    
    setHelperGeometries(newGeometries);
  }, [helperSpaces.length]);

  useLayoutEffect(() => {
    // Main model
    if (faces) {
      try {
        console.time('[PERF] syncFaces');
        syncFaces(body.current, faces);
        console.timeEnd('[PERF] syncFaces');
      } catch (error) {
        console.error('[ERROR] Error in syncFaces:', error);
      }
    }

    if (edges) {
      try {
        console.time('[PERF] syncLines');
        syncLines(lines.current, edges);
        console.timeEnd('[PERF] syncLines');
      } catch (error) {
        console.error('[ERROR] Error in syncLines:', error);
      }
    } else if (faces) {
      try {
        console.time('[PERF] syncLinesFromFaces');
        syncLinesFromFaces(lines.current, body.current);
        console.timeEnd('[PERF] syncLinesFromFaces');
      } catch (error) {
        console.error('[ERROR] Error in syncLinesFromFaces:', error);
      }
    }

    // Helper spaces (only sync if geometries are available)
    if (helperGeometries.length === helperSpaces.length) {
      helperSpaces.forEach((helper, index) => {
        if (helper.faces) {
          syncFaces(helperGeometries[index].body, helper.faces);
        }
        if (helper.edges) {
          syncLines(helperGeometries[index].lines, helper.edges);
        } else if (helper.faces) {
          syncLinesFromFaces(helperGeometries[index].lines, helperGeometries[index].body);
        }
      });
    }

    invalidate();
  }, [faces, edges, helperSpaces, helperGeometries, invalidate]);

  useEffect(() => {
    return () => {
      body.current.dispose();
      lines.current.dispose();
      helperGeometries.forEach(geo => {
        geo.body.dispose();
        geo.lines.dispose();
      });
    };
  }, [helperGeometries]);

  // Enhanced material settings for high quality rendering
  const bodyMaterial = highQuality ? {
    color: "#6a92a6",
    metalness: 0.4,
    roughness: 0.3,
    envMapIntensity: 0.8,
    flatShading: false,
    polygonOffset: true,
    polygonOffsetFactor: 2.0,
    polygonOffsetUnits: 1.0,
    castShadow: true,
    receiveShadow: true
  } : {
    color: "#5a8296",
    polygonOffset: true,
    polygonOffsetFactor: 2.0,
    polygonOffsetUnits: 1.0
  };

  // Enhanced line material for high quality
  const lineMaterial = highQuality ? {
    color: "#304352",
    linewidth: 1.5
  } : {
    color: "#3c5a6e"
  };

  return (
    <group>
      {/* Main model */}
      <mesh geometry={body.current} castShadow receiveShadow>
        {highQuality ? (
          <meshStandardMaterial {...bodyMaterial} />
        ) : (
          <meshStandardMaterial {...bodyMaterial} />
        )}
      </mesh>
      <lineSegments geometry={lines.current}>
        <lineBasicMaterial {...lineMaterial} />
      </lineSegments>

      {/* Helper spaces - only render if geometries are available */}
      {helperGeometries.length === helperSpaces.length && 
        helperGeometries.map((geo, index) => (
          <group key={`helper-${index}`}>
            <mesh geometry={geo.body} castShadow>
              <meshStandardMaterial
                color="#ff0000"
                transparent={true}
                opacity={0.3}
                depthWrite={false}
                polygonOffset
                polygonOffsetFactor={1.0}
                polygonOffsetUnits={1.0}
                roughness={0.7}
                metalness={0.0}
              />
            </mesh>
            <lineSegments geometry={geo.lines}>
              <lineBasicMaterial color="#ff3333" />
            </lineSegments>
          </group>
        ))
      }
    </group>
  );
});