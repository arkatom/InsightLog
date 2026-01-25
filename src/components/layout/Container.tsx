import type { ReactNode } from 'react';

interface ContainerProps {
  children: ReactNode;
}

export function Container({ children }: ContainerProps) {
  return (
    <div className="bg-primary-100 min-h-screen p-4">
      <div className="max-w-lg mx-auto space-y-4">{children}</div>
    </div>
  );
}
