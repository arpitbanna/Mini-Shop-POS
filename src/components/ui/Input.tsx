import type { InputHTMLAttributes } from 'react';

type InputVariant = 'default' | 'subtle' | 'ghost';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  variant?: InputVariant;
};

const variantClass: Record<InputVariant, string> = {
  default: 'border border-white/15 bg-white/[0.045] hover:border-white/25 focus:border-teal-400/60 focus:bg-white/[0.08] focus:ring-2 focus:ring-teal-500/30',
  subtle: 'border border-white/10 bg-white/[0.03] hover:border-white/20 focus:border-cyan-400/50 focus:bg-white/[0.06] focus:ring-2 focus:ring-cyan-500/20',
  ghost: 'border-b border-white/20 bg-transparent hover:border-white/30 focus:border-teal-400 focus:ring-0',
};

export function Input({ 
  variant = 'default',
  className = '', 
  ...props 
}: InputProps) {
  return (
    <input
      className={`w-full rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-400/60 transition-all focus:outline-none ${variantClass[variant]} ${className}`.trim()}
      {...props}
    />
  );
}
