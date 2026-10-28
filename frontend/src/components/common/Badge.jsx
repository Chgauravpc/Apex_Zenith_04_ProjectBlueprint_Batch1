import React from 'react';

/**
 * Google-inspired Badge / Chip component with maroon accents and semantic states.
 * Follows modern web accessibility guidance by optionally pairing color with dot/icon indicators.
 */
export function Badge({
  children,
  variant = 'maroon',
  size = 'md',
  dot = false,
  icon = null,
  className = '',
  ...props
}) {
  const variants = {
    maroon: 'bg-maroon-50 text-maroon-800 border-maroon-200',
    default: 'bg-maroon-50 text-maroon-800 border-maroon-200',
    secondary: 'bg-slate-100 text-slate-700 border-slate-200',
    safe: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    caution: 'bg-amber-50 text-amber-800 border-amber-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    critical: 'bg-rose-50 text-rose-800 border-rose-200',
    danger: 'bg-rose-50 text-rose-800 border-rose-200',
    outline: 'bg-transparent text-slate-700 border-slate-300',
  };

  const dotColors = {
    maroon: 'bg-maroon-700',
    default: 'bg-maroon-700',
    secondary: 'bg-slate-500',
    safe: 'bg-emerald-600',
    success: 'bg-emerald-600',
    caution: 'bg-amber-600',
    warning: 'bg-amber-600',
    critical: 'bg-rose-600',
    danger: 'bg-rose-600',
    outline: 'bg-slate-600',
  };

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  };

  const selectedVariant = variants[variant] || variants.maroon;
  const selectedDotColor = dotColors[variant] || dotColors.maroon;
  const selectedSize = sizes[size] || sizes.md;

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border transition-colors select-none ${selectedVariant} ${selectedSize} ${className}`}
      {...props}
    >
      {dot && (
        <span
          className={`h-1.5 w-1.5 rounded-full shrink-0 ${selectedDotColor}`}
          aria-hidden="true"
        />
      )}
      {icon && <span className="inline-flex shrink-0" aria-hidden="true">{icon}</span>}
      {children}
    </span>
  );
}

export default Badge;
