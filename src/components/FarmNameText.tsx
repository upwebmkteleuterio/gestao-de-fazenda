import React from 'react';
import { useAppSettings } from '@/hooks/useAppSettings';

interface FarmNameTextProps {
  className?: string;
  skeletonClassName?: string;
  testId?: string;
}

export const FarmNameText: React.FC<FarmNameTextProps> = ({
  className = '',
  skeletonClassName = 'inline-block h-6 w-40 align-middle',
  testId = 'farm-name',
}) => {
  const { farmName, isLoading } = useAppSettings();

  if (isLoading) {
    return (
      <span
        role="status"
        aria-label="Carregando nome da fazenda"
        className={`${skeletonClassName} animate-pulse rounded bg-gray-200/80`}
      />
    );
  }

  return (
    <span data-testid={testId} className={className}>
      {farmName}
    </span>
  );
};
