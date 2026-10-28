import React, { forwardRef } from 'react';

/**
 * Google-inspired clean white Card primitives (shadcn/ui pattern).
 */
export const Card = forwardRef(function Card(
  { className = '', children, hoverable = false, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={`bg-white text-slate-900 border border-[#DADCE0] rounded-xl shadow-xs transition-shadow duration-200 ${
        hoverable ? 'hover:shadow-sm hover:border-slate-300' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});

export const CardHeader = forwardRef(function CardHeader(
  { className = '', children, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={`flex flex-col space-y-1.5 p-5 sm:p-6 border-b border-[#F1F3F4] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});

export const CardTitle = forwardRef(function CardTitle(
  { className = '', children, as: Tag = 'h3', ...props },
  ref
) {
  return (
    <Tag
      ref={ref}
      className={`text-base sm:text-lg font-semibold text-slate-900 tracking-tight ${className}`}
      {...props}
    >
      {children}
    </Tag>
  );
});

export const CardDescription = forwardRef(function CardDescription(
  { className = '', children, ...props },
  ref
) {
  return (
    <p
      ref={ref}
      className={`text-xs sm:text-sm text-slate-500 leading-relaxed ${className}`}
      {...props}
    >
      {children}
    </p>
  );
});

export const CardContent = forwardRef(function CardContent(
  { className = '', children, ...props },
  ref
) {
  return (
    <div ref={ref} className={`p-5 sm:p-6 pt-4 ${className}`} {...props}>
      {children}
    </div>
  );
});

export const CardFooter = forwardRef(function CardFooter(
  { className = '', children, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={`flex items-center p-5 sm:p-6 pt-0 border-t border-[#F1F3F4] mt-2 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});

export default Card;
