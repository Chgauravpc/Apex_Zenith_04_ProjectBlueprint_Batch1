/* eslint-disable react/no-unknown-property */
import React from 'react';
import { Html } from '@react-three/drei';

/**
 * 3D knowledge pin marker rendered in 3D space on top of machine components.
 * Reference: PRD.md §9.4 and TASKS.md T21.
 */
export default function PinMarker({
  position,
  componentId,
  title,
  author,
  risk = 'none',
  isSelected = false,
  onClick,
}) {
  const getBadgeStyle = () => {
    switch (risk) {
      case 'high':
        return {
          bg: 'bg-red-500/90 text-white border-red-400',
          dot: 'bg-red-400 animate-ping',
          icon: '⚠️',
        };
      case 'medium':
        return {
          bg: 'bg-amber-500/90 text-white border-amber-400',
          dot: 'bg-amber-400 animate-pulse',
          icon: '⚡',
        };
      default:
        return {
          bg: 'bg-cyan-600/90 text-white border-cyan-400',
          dot: 'bg-cyan-300',
          icon: '💡',
        };
    }
  };

  const style = getBadgeStyle();

  return (
    <group position={position}>
      <Html center distanceFactor={8} zIndexRange={[100, 0]}>
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (onClick) onClick(componentId);
          }}
          className={`group cursor-pointer select-none transition-all duration-200 transform hover:scale-110 ${
            isSelected ? 'scale-110 ring-2 ring-cyan-300' : ''
          }`}
          title={`${title} • By ${author || 'Old Employee'}`}
        >
          {/* Main Pin Capsule */}
          <div
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full shadow-lg border backdrop-blur-sm ${style.bg}`}
          >
            <span className="relative flex h-2 w-2">
              <span
                className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${style.dot}`}
              />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
            </span>
            <span className="text-xs font-semibold whitespace-nowrap">{title}</span>
          </div>

          {/* Pointer stem */}
          <div className="w-0.5 h-3 bg-cyan-400/80 mx-auto shadow-sm" />
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mx-auto -mt-0.5" />
        </div>
      </Html>
    </group>
  );
}
