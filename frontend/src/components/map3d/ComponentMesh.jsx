/* eslint-disable react/no-unknown-property */
import React, { useState, useRef, useEffect } from 'react';

/**
 * Interactive 3D component mesh container.
 * Handles hover states, click selection, cursor feedback, and risk highlights.
 * Reference: PRD.md §9.4 and TASKS.md T21.
 */
export default function ComponentMesh({
  componentId,
  name,
  risk = 'none',
  isSelected = false,
  isHighlighted = false,
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

  // Determine highlight ring/halo color based on risk or selection
  let haloColor = null;
  if (isSelected) {
    haloColor = '#38bdf8'; // Cyan
  } else if (isHighlighted) {
    haloColor = '#ef4444'; // Guardian Red
  } else if (hovered) {
    haloColor = risk === 'high' ? '#f87171' : risk === 'medium' ? '#fbbf24' : '#67e8f9';
  }

  return (
    <group
      ref={groupRef}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
      name={componentId}
    >
      {children}

      {/* Visual selection / hover boundary ring */}
      {(isSelected || hovered || isHighlighted) && (
        <group>
          {/* Subtle bounding accent glow */}
          <pointLight
            color={haloColor || '#38bdf8'}
            intensity={isSelected ? 1.5 : hovered ? 1.0 : 0.8}
            distance={1.2}
            decay={2}
          />
        </group>
      )}
    </group>
  );
}
