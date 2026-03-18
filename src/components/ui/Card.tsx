import type { HTMLAttributes } from 'react';

type CardVariant = 'default' | 'elevated' | 'outlined';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant;
};

const variantClass: Record<CardVariant, string> = {
  default: 'rounded-2xl border border-white/12 bg-white/[0.045] backdrop-blur-[22px] shadow-[0_18px_32px_-24px_rgba(0,0,0,0.95)]',
  elevated: 'rounded-2xl border border-white/15 bg-white/[0.06] backdrop-blur-[24px] shadow-[0_24px_48px_-28px_rgba(0,0,0,0.98)]',
  outlined: 'rounded-2xl border-1.5 border-white/20 bg-transparent shadow-none',
};

export function Card({ 
  variant = 'default',
  className = '', 
  ...props 
}: CardProps) {
  return (
    <div
      className={`transition-all duration-300 hover:border-white/20 hover:shadow-[0_20px_40px_-26px_rgba(0,0,0,1)] ${variantClass[variant]} ${className}`.trim()}
      {...props}
    />
  );
}
