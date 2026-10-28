/* eslint-disable react/no-unknown-property */
import React, { useState, useRef, useEffect } from 'react';

/**
 * Interactive 3D component mesh container.
 * Handles independent raycast clicks, hover states, cursor feedback,
 * and high-visibility 3D selection/hover bounding highlights.
 * Reference: PRD.md §9.4 and TASKS.md T21.
 */
export default function ComponentMesh({
  componentId,
  name,
  risk = 'none',
  isSelected = false,
  isHighlighted = false,
  bounds = null,
  onClick,
  onHover,
  children,
}) {
  const [hovered, setHovered] = useState(false);
  const groupRef = useRef();

  useEffect(() => {
    if (hovered) {
      document.body.style.cursor = 'pointer';
    } else {
      document.body.style.cursor = 'auto';
    }
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, [hovered]);

  const handlePointerOver = (e) => {
    e.stopPropagation();
    setHovered(true);
    if (onHover) {
      onHover(componentId, name, true);
    }
  };

  const handlePointerOut = (e) => {
    e.stopPropagation();
    setHovered(false);
    if (onHover) {
      onHover(componentId, name, false);
    }
  };

  const handleClick = (e) => {
    e.stopPropagation();
    if (onClick) {
      onClick(componentId, name);
    }
  };

  // Determine highlight colors based on selection, risk or hover
  let highlightColor = '#38bdf8'; // Default cyan hover
  if (isSelected) {
    highlightColor = '#00f0ff'; // Bright electric cyan for active selection
  } else if (isHighlighted) {
    highlightColor = '#ef4444'; // Red for Guardian risk alerts
  } else if (hovered) {
    highlightColor = risk === 'high' ? '#f87171' : risk === 'medium' ? '#fbbf24' : '#67e8f9';
  }

  const isVisualActive = isSelected || hovered || isHighlighted;

  return (
    <group
      ref={groupRef}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
      name={componentId}
    >
      {children}

      {/* 3D Visual Bounding Highlight Box & Illumination */}
      {isVisualActive && bounds && (
        <group position={bounds.center}>
          {/* Glowing wireframe bounding box */}
          <mesh>
            <boxGeometry args={bounds.size} />
            <meshBasicMaterial
              color={highlightColor}
              wireframe
              transparent
              opacity={isSelected ? 0.95 : 0.65}
            />
          </mesh>

          {/* Additional accent corner bracket / inner ring for selected parts */}
          {isSelected && (
            <mesh scale={[1.02, 1.02, 1.02]}>
              <boxGeometry args={bounds.size} />
              <meshBasicMaterial
                color="#ffffff"
                wireframe
                transparent
                opacity={0.35}
              />
            </mesh>
          )}

          {/* Focused local spotlight / pointlight to brighten the hovered/selected component */}
          <pointLight
            color={highlightColor}
            intensity={isSelected ? 2.2 : 1.2}
            distance={2.4}
            decay={2}
          />
        </group>
      )}
    </group>
  );
}
