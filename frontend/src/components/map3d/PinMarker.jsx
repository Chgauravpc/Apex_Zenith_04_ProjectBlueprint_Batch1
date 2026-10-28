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
  _author,
  risk = 'none',
  isSelected = false,
  isHighlighted = false,
  isComponentHovered = false,
  noteCount = 0,
  pinMode = 'compact',
  onClick,
}) {
  const [isSelfHovered, setIsSelfHovered] = useState(false);
  const isHovered = isSelfHovered || isComponentHovered;

  const icon = COMPONENT_ICONS[componentId] || '📍';
  const label =
    componentName ||
    COMPONENT_SHORT_NAMES[componentId] ||
    (title && title.length > 15 ? title.slice(0, 15) + '…' : title) ||
    'Component';

  // Badge/Pill only shows after hover or click/selection (or if explicit pinMode === 'all' / 'expanded')
  const isBadgeVisible = isHovered || isSelected || isHighlighted || pinMode === 'all' || pinMode === 'expanded';
  const isHighRisk = risk === 'high';
  const isMediumRisk = risk === 'medium';

  // Visual styling based on risk & active state
  const getBadgeColors = () => {
    if (isSelected || isHighlighted) {
      return {
        pill: 'bg-maroon-800 text-white border-rose-300 ring-2 ring-rose-400 shadow-xl',
        stem: 'bg-rose-400',
        dot: 'bg-rose-400 animate-ping',
        badge: 'bg-rose-500/30 text-rose-100 border-rose-400/50',
      };
    }
    if (isHighRisk) {
      return {
        pill: 'bg-slate-900/95 text-rose-100 border-rose-500/80 shadow-rose-950/40',
        stem: 'bg-rose-500',
        dot: 'bg-rose-400 animate-ping',
        badge: 'bg-rose-500/25 text-rose-200 border-rose-500/40',
      };
    }
    if (isMediumRisk) {
      return {
        pill: 'bg-slate-900/95 text-amber-100 border-amber-500/80 shadow-amber-950/40',
        stem: 'bg-amber-400',
        dot: 'bg-amber-400 animate-pulse',
        badge: 'bg-amber-500/25 text-amber-200 border-amber-500/40',
      };
    }
    return {
      pill: 'bg-slate-900/90 text-slate-100 border-slate-700/80 shadow-slate-950/40',
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
        zIndexRange={isSelected || isHighlighted ? [250, 180] : isHovered ? [200, 120] : [90, 0]}
        style={{
          pointerEvents: 'none',
          transition: 'transform 0.15s ease',
        }}
      >
        <div
          onMouseEnter={() => setIsSelfHovered(true)}
          onMouseLeave={() => setIsSelfHovered(false)}
          onClick={(e) => {
            e.stopPropagation();
            if (onClick) onClick(componentId);
          }}
          className={`pointer-events-auto cursor-pointer select-none flex flex-col items-center transition-all duration-200 transform ${
            isSelected || isHighlighted
              ? 'scale-105 z-50'
              : isHovered
              ? 'scale-100 z-40'
              : 'z-10'
          }`}
          title={`${label}${title ? `: ${title}` : ''} (Click to inspect in side panel)`}
        >
          {/* Active State (Hovered or Selected): Sleek, compact single CAD inspection badge */}
          {isBadgeVisible ? (
            <>
              {/* Single Sleek CAD Callout Pill Badge */}
              <div
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full border backdrop-blur-md shadow-lg transition-all duration-150 animate-fade-in ${
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

                {/* Icon + Component Label */}
                <span className="text-xs font-semibold whitespace-nowrap flex items-center space-x-1 tracking-tight">
                  <span>{icon}</span>
                  <span>{label}</span>
                </span>

                {/* Knowledge Count Tag */}
                {noteCount > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full border ${colors.badge} font-mono font-bold`}
                  >
                    {noteCount}
                  </span>
                )}
              </div>

              {/* Vertical Leader Line Stem connecting to 3D mesh surface */}
              <div className={`w-0.5 h-3 ${colors.stem} opacity-80 shadow-xs`} />
              <div className={`w-1.5 h-1.5 rounded-full ${colors.stem} -mt-0.5 shadow-sm`} />
            </>
          ) : (
            /* Idle State: Sleek, microscopic CAD waypoint probe dot (Zero clutter) */
            <div
              className="flex flex-col items-center group cursor-pointer"
              title={`${label} (Hover or click to inspect know-how)`}
            >
              <div
                className={`relative flex items-center justify-center w-3 h-3 rounded-full border backdrop-blur-md shadow-xs transition-transform duration-200 group-hover:scale-150 ${
                  isHighRisk
                    ? 'bg-rose-950/80 border-rose-500/80'
                    : isMediumRisk
                    ? 'bg-amber-950/80 border-amber-500/80'
                    : 'bg-slate-900/80 border-slate-600/80'
                }`}
              >
                <span className="relative flex h-1.5 w-1.5">
                  <span
                    className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${colors.dot}`}
                  />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
                </span>
              </div>
              <div className={`w-px h-2 ${colors.stem} opacity-70`} />
              <div className={`w-0.5 h-0.5 rounded-full ${colors.stem} -mt-0.5`} />
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}
