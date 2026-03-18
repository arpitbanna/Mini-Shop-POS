import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'outline' | 'ghost' | 'warning';

type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const variantClass: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-r from-teal-500 to-cyan-500 text-white hover:from-teal-400 hover:to-cyan-400 shadow-lg shadow-teal-500/20 active:scale-95',
  secondary:
    'bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-400 hover:to-indigo-400 shadow-lg shadow-blue-500/20 active:scale-95',
  success:
    'bg-gradient-to-r from-emerald-500 to-lime-400 text-slate-900 font-semibold hover:from-emerald-400 hover:to-lime-300 shadow-lg shadow-emerald-500/20 active:scale-95',
  danger:
    'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-400 hover:to-red-400 shadow-lg shadow-orange-500/20 active:scale-95',
  warning:
    'bg-gradient-to-r from-amber-300 to-yellow-300 text-slate-900 font-semibold hover:from-amber-200 hover:to-yellow-200 shadow-lg shadow-amber-300/20 active:scale-95',
  outline:
    'bg-transparent text-white border-1.5 border-white/30 hover:bg-white/10 hover:border-white/50 active:text-teal-300',
  ghost:
    'bg-transparent text-slate-300 hover:text-white hover:bg-white/5 active:text-teal-200',
};

const sizeClass: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3 py-1.5 text-xs font-semibold rounded-lg gap-1.5',
  md: 'min-h-11 px-4 py-2.5 text-sm font-semibold rounded-xl gap-2',
  lg: 'min-h-12 px-6 py-3 text-base font-semibold rounded-xl gap-2.5',
};

export function Button({ 
  variant = 'primary', 
  size = 'md',
  className = '', 
  disabled = false,
  ...props 
}: ButtonProps) {
  return (
    <button
      disabled={disabled}
      className={`inline-flex items-center justify-center tracking-wide transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 ${sizeClass[size]} ${variantClass[variant]} ${className}`.trim()}
      {...props}
    />
  );
}
