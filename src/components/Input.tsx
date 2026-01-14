import type { InputHTMLAttributes } from 'react';
import clsx from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-sm font-medium text-dark-textSecondary">
          {label}
        </label>
      )}
      <input
        className={clsx(
          'px-4 py-2.5 rounded-xl bg-dark-surface2 border border-dark-border text-dark-text',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
          'transition-all duration-200',
          'placeholder:text-dark-textTertiary',
          className
        )}
        {...props}
      />
    </div>
  );
}
