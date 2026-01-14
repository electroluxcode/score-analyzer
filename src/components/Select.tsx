import type { SelectHTMLAttributes } from 'react';
import clsx from 'clsx';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export function Select({ label, className, children, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-sm font-medium text-dark-textSecondary">
          {label}
        </label>
      )}
      <select
        className={clsx(
          'px-4 py-2.5 rounded-xl bg-dark-surface2 border border-dark-border text-dark-text',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
          'transition-all duration-200',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-dark-surface3',
          className
        )}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}
