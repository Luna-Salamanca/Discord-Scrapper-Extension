import { ReactNode } from 'react';

type CardProps = {
  children?: ReactNode;
  title?: string;
  subtitle?: string;
};

export default function Card({ children, title, subtitle }: CardProps) {
  return (
    <div className="w-full bg-secondary hover:bg-secondary/75 rounded-2xl flex-row gap-1 px-6 py-4">
      {title && (
        <div className="flex flex-col gap-1">
          <p className="font-semibold text">{title}</p>
          {subtitle && <p className="text-xs py-2">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
}
