/* eslint-disable react/no-unknown-property */
import React, { useState } from 'react';
import { Html } from '@react-three/drei';

const COMPONENT_ICONS = {
  spindle: '⚙️',
  tool_holder: '🔧',
  worktable: '📐',
  vise: '🗜️',
  control_panel: '🖥️',
  doors: '🚪',
  coolant_tank: '💧',
};

const COMPONENT_SHORT_NAMES = {
  spindle: 'Spindle',
  tool_holder: 'Tool ATC',
  worktable: 'Worktable',
  vise: 'Vise',
  control_panel: 'Pendant',
  doors: 'Doors',
  coolant_tank: 'Coolant',
};

/**
 * 3D knowledge pin marker rendered in 3D space on top of machine components.
 * Designed with a compact, collision-free footprint to prevent visual overlap
 * and keep the 3D model unobstructed. Smoothly expands on hover or selection.
 * Reference: PRD.md §9.4 and TASKS.md T21.
 */
export default function PinMarker({
  position,
  componentId,
  componentName,
  title,
  author,
  risk = 'none',
  isSelected = false,
  isHighlighted = false,
  noteCount = 0,
  pinMode = 'compact',
  onClick,
}) {
  const [isHovered, setIsHovered] = useState(false);

  const icon = COMPONENT_ICONS[componentId] || '📍';
  const label =
    componentName ||
    COMPONENT_SHORT_NAMES[componentId] ||
    (title && title.length > 15 ? title.slice(0, 15) + '…' : title) ||
    'Component';

  const isExpanded = pinMode === 'expanded' || isHovered || isSelected || isHighlighted;
  const isHighRisk = risk === 'high';
  const isMediumRisk = risk === 'medium';

  // Visual styling based on risk & active state
  const getBadgeColors = () => {
    if (isSelected || isHighlighted) {
      return {
        pill: 'bg-maroon-900/95 text-white border-rose-400 ring-2 ring-rose-400 shadow-rose-950/60',
        stem: 'bg-rose-400',
        dot: 'bg-rose-400 animate-ping',
        badge: 'bg-rose-500/20 text-rose-200 border-rose-500/40',
      };
    }
    if (isHighRisk) {
      return {
        pill: 'bg-slate-900/95 hover:bg-red-950/95 text-red-100 border-red-500/80 shadow-red-950/40',
        stem: 'bg-red-500',
        dot: 'bg-red-400 animate-ping',
        badge: 'bg-red-500/25 text-red-200 border-red-500/40',
      };
    }
    if (isMediumRisk) {
      return {
        pill: 'bg-slate-900/95 hover:bg-amber-950/95 text-amber-100 border-amber-500/80 shadow-amber-950/40',
        stem: 'bg-amber-400',
        dot: 'bg-amber-400 animate-pulse',
        badge: 'bg-amber-500/25 text-amber-200 border-amber-500/40',
      };
    }
    return {
      pill: 'bg-slate-900/90 hover:bg-slate-800 text-slate-100 border-slate-700/80 shadow-slate-950/40',
      stem: 'bg-cyan-400',
      dot: 'bg-cyan-300',
      badge: 'bg-slate-800 text-slate-300 border-slate-600',
    };
  };

  const colors = getBadgeColors();

  return (
    <group position={position}>
      <Html
        center
        distanceFactor={6.2}
        zIndexRange={isSelected || isHighlighted ? [250, 180] : isHovered ? [200, 120] : [90, 0]}
        style={{
          pointerEvents: 'none',
          transition: 'transform 0.15s ease',
        }}
      >
        <div
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={(e) => {
            e.stopPropagation();
            if (onClick) onClick(componentId);
          }}
          className={`pointer-events-auto cursor-pointer select-none flex flex-col items-center transition-all duration-200 transform ${
            isSelected || isHighlighted
              ? 'scale-110 z-50'
              : isHovered
              ? 'scale-105 z-40'
              : 'z-10'
          }`}
          title={`${label}${title ? `: ${title}` : ''}`}
        >
          {/* Expanded Rich Knowledge Tooltip Card */}
          {isExpanded && (
            <div
              className={`mb-2 w-52 sm:w-60 p-3 rounded-xl border backdrop-blur-md shadow-2xl animate-fade-in text-left pointer-events-auto ${
                isSelected || isHighlighted
                  ? 'bg-slate-950/95 border-rose-500/80 text-white shadow-rose-950/50'
                  : 'bg-slate-950/95 border-slate-700 text-slate-100'
              }`}
            >
              <div className="flex items-center justify-between gap-1.5 mb-1.5">
                <span className="flex items-center space-x-1.5 font-bold text-xs truncate">
                  <span>{icon}</span>
                  <span className="truncate">{componentName || label}</span>
                </span>
                {isHighRisk && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40 shrink-0">
                    High Risk
                  </span>
                )}
                {isMediumRisk && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                    Caution
                  </span>
                )}
              </div>

              {title && (
                <p className="text-[11px] text-slate-200 font-medium line-clamp-2 leading-relaxed">
                  {title}
                </p>
              )}

              <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                <span className="truncate">{author || 'Old Employee'}</span>
                <span className="text-rose-400 font-semibold shrink-0">Inspect →</span>
              </div>
            </div>
          )}

          {/* Compact Pill Badge (Default state: sleek, non-overlapping) */}
          <div
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full border backdrop-blur-md shadow-lg transition-all duration-200 ${
              colors.pill
            }`}
          >
            {/* Risk / Active Pulsing Dot */}
            <span className="relative flex h-2 w-2 shrink-0">
              <span
                className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${colors.dot}`}
              />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
            </span>

            {/* Icon + Compact Label */}
            <span className="text-xs font-semibold whitespace-nowrap flex items-center space-x-1">
              <span>{icon}</span>
              <span>{label}</span>
            </span>

            {/* Knowledge Count Tag (when not expanded) */}
            {noteCount > 0 && !isExpanded && (
              <span className={`text-[10px] px-1 py-0.2 rounded-full border ${colors.badge} font-mono font-bold`}>
                {noteCount}
              </span>
            )}
          </div>

          {/* Vertical Leader Line Stem connecting to 3D mesh surface */}
          <div className={`w-0.5 h-3.5 ${colors.stem} opacity-80 shadow-xs`} />
          <div className={`w-1.5 h-1.5 rounded-full ${colors.stem} -mt-0.5 shadow-sm`} />
        </div>
      </Html>
    </group>
  );
}
