import type { ReactNode } from 'react';
import clsx from 'clsx';

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
}

export function Card({ children, className, title, subtitle }: CardProps) {
  return (
    <div
      className={clsx(
        'bg-dark-surface rounded-2xl border border-dark-border p-6 shadow-lg',
        className
      )}
    >
      {(title || subtitle) && (
        <div className="mb-6">
          {title && (
            <h2 className="text-xl font-semibold text-dark-text mb-1">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="text-sm text-dark-textTertiary">{subtitle}</p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
