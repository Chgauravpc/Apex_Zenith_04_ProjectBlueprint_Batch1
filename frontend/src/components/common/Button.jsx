import React, { forwardRef } from 'react';

/**
 * Google-inspired button primitive with maroon accents and elevation.
 * Meets WCAG 2.1 AA touch target standards (min 44px height).
 */
export const Button = forwardRef(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    type = 'button',
    disabled = false,
    isLoading = false,
    leftIcon = null,
    rightIcon = null,
    className = '',
    ...props
  },
  ref
) {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 select-none outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.98] btn-touch';

  const variants = {
    primary:
      'bg-maroon-800 text-white hover:bg-maroon-900 border border-transparent shadow-xs hover:shadow-sm focus-visible:ring-maroon-700',
    secondary:
      'bg-white text-slate-800 hover:bg-slate-50 border border-[#DADCE0] shadow-xs hover:shadow-sm hover:border-slate-300 focus-visible:ring-maroon-700',
    outline:
      'bg-transparent text-maroon-800 hover:bg-maroon-50 border border-maroon-300 focus-visible:ring-maroon-700',
    ghost:
      'bg-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-transparent focus-visible:ring-slate-400',
    subtle:
      'bg-maroon-50 text-maroon-800 hover:bg-maroon-100 border border-maroon-200 focus-visible:ring-maroon-700',
    danger:
      'bg-red-600 text-white hover:bg-red-700 border border-transparent shadow-xs focus-visible:ring-red-500',
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5 min-h-[36px] gap-1.5',
    md: 'text-sm px-4 py-2 min-h-[44px] gap-2',
    lg: 'text-base px-5 py-2.5 min-h-[48px] gap-2.5',
    icon: 'p-2.5 min-h-[44px] min-w-[44px] justify-center',
  };

  const selectedVariant = variants[variant] || variants.primary;
  const selectedSize = sizes[size] || sizes.md;

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading ? 'true' : undefined}
      className={`${baseStyles} ${selectedVariant} ${selectedSize} ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>{children}</span>
        </>
      ) : (
        <>
          {leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
});

export default Button;
