import React from 'react';
import { LucideIcon, Plus } from 'lucide-react';
import { Button } from './Button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyStackedCards,
  EmptyTitle,
  EmptyContent,
} from './ui/cnippet-empty';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: LucideIcon;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  actionIcon = Plus,
  secondaryActionLabel,
  onSecondaryAction,
  className = '',
}) => {
  return (
    <Empty className={`rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-8 transition-all dark:border-gray-800 dark:bg-gray-900/30 sm:p-12 ${className}`}>
      <EmptyHeader>
        <EmptyMedia>
          <EmptyStackedCards />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>

      {(actionLabel || secondaryActionLabel) && (
        <EmptyContent className="mt-1 flex-row flex-wrap justify-center">
          {actionLabel && onAction && (
            <Button variant="primary" icon={actionIcon} onClick={onAction}>
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <Button variant="secondary" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>
          )}
        </EmptyContent>
      )}
    </Empty>
  );
};
