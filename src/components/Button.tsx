import type { ButtonHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'rounded-xl font-medium transition-all duration-200',
        {
          'bg-blue-600 hover:bg-blue-700 text-white': variant === 'primary',
          'bg-dark-surface2 hover:bg-dark-surface3 text-dark-text border border-dark-border':
            variant === 'secondary',
          'bg-transparent hover:bg-dark-surface2 text-dark-textSecondary':
            variant === 'ghost',
        },
        {
          'px-3 py-1.5 text-sm': size === 'sm',
          'px-4 py-2 text-base': size === 'md',
          'px-6 py-3 text-lg': size === 'lg',
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
