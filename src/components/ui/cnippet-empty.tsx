import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Empty({ className, children, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex min-w-0 flex-1 flex-col items-center justify-center gap-6 text-center', className)}
      data-slot="empty"
      {...props}
    >
      {children}
    </div>
  );
}

export function EmptyHeader({ className, children, ...props }: ComponentProps<'div'>) {
  return (
    <div className={cn('flex max-w-md flex-col items-center text-center', className)} data-slot="empty-header" {...props}>
      {children}
    </div>
  );
}

interface EmptyMediaProps {
  className?: string;
  children?: ReactNode;
  variant?: 'default' | 'icon';
}

export function EmptyMedia({ className, variant: _variant, children }: EmptyMediaProps) {
  return (
    <div className={cn('relative mb-5', className)} data-slot="empty-media">
      {children}
    </div>
  );
}

export function EmptyTitle({ className, children, ...props }: ComponentProps<'h3'>) {
  return (
    <h3 className={cn('text-base font-bold tracking-tight text-gray-900 dark:text-white', className)} data-slot="empty-title" {...props}>
      {children}
    </h3>
  );
}

export function EmptyDescription({ className, children, ...props }: ComponentProps<'p'>) {
  return (
    <p className={cn('mt-1.5 max-w-md text-xs leading-relaxed text-gray-500 dark:text-gray-400 sm:text-sm', className)} data-slot="empty-description" {...props}>
      {children}
    </p>
  );
}

export function EmptyContent({ className, children, ...props }: ComponentProps<'div'>) {
  return (
    <div className={cn('flex w-full min-w-0 flex-col items-center gap-4', className)} data-slot="empty-content" {...props}>
      {children}
    </div>
  );
}

export function EmptyStackedCards() {
  return (
    <div aria-hidden="true" className="relative h-20 w-48">
      <div className="absolute inset-x-10 top-0 h-6 rounded-t-lg border border-emerald-100 bg-emerald-50/70 dark:border-emerald-900/60 dark:bg-emerald-950/40" />
      <div className="absolute inset-x-5 top-3 h-6 rounded-t-lg border border-emerald-100/80 bg-emerald-50 dark:border-emerald-900/70 dark:bg-emerald-950/60" />
      <div className="absolute inset-x-0 top-6 flex h-14 items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="h-8 w-8 shrink-0 rounded-md bg-emerald-100 dark:bg-emerald-900/70" />
        <div className="flex flex-1 flex-col gap-1.5">
          <div className="h-2.5 w-4/5 rounded-full bg-gray-200 dark:bg-gray-600" />
          <div className="h-2 w-1/2 rounded-full bg-gray-100 dark:bg-gray-700" />
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-7 bg-gradient-to-b from-white/0 to-gray-50 dark:from-gray-800/0 dark:to-gray-900/30" />
    </div>
  );
}

export default Empty;
