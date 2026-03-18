import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'outline' | 'danger';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variantClass: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 hover:shadow-lg',
  outline:
    'bg-white/5 text-white border border-white/10 hover:bg-white/10',
  danger:
    'bg-red-500/20 text-red-300 border border-red-400/30 hover:bg-red-500/30',
};

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-semibold transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 ${variantClass[variant]} ${className}`.trim()}
      {...props}
    />
  );
}
