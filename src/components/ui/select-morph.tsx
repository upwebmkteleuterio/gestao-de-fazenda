import { Check, ChevronDown } from 'lucide-react';
import {
  AnimatePresence,
  motion,
  type Transition,
  useReducedMotion,
  type Variants,
} from 'motion/react';
import { createPortal } from 'react-dom';
import {
  createContext,
  type ButtonHTMLAttributes,
  type ReactNode,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { cn } from '@/lib/utils';

const MORPH: Transition = { type: 'spring', duration: 0.5, bounce: 0.22 };
const ROW = 'flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-sm';

const LIST: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.035, delayChildren: 0.08 } },
};
const ITEM: Variants = {
  hidden: { opacity: 0, y: -6, filter: 'blur(3px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)' },
};

type PanelPosition = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

interface MorphContextValue {
  value: string | undefined;
  open: boolean;
  setOpen: (open: boolean) => void;
  select: (value: string) => void;
  register: (value: string, label: string) => void;
  unregister: (value: string) => void;
  labelFor: (value: string | undefined) => string | undefined;
  placeholder: string;
  setPlaceholder: (placeholder: string) => void;
  reduce: boolean;
  triggerId: string;
  listId: string;
  panelPosition: PanelPosition | null;
  anchorRef: RefObject<HTMLDivElement | null>;
  panelRef: RefObject<HTMLDivElement | null>;
  disabled: boolean;
}

const MorphContext = createContext<MorphContextValue | null>(null);

function useMorphContext(component: string) {
  const context = useContext(MorphContext);
  if (!context) throw new Error(`${component} must be used within <MorphSelect>`);
  return context;
}

export interface MorphSelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
  children: ReactNode;
}

export function MorphSelect({
  value,
  defaultValue,
  onValueChange,
  disabled = false,
  className,
  id,
  children,
}: MorphSelectProps) {
  const reduce = useReducedMotion() ?? false;
  const baseId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [internal, setInternal] = useState(defaultValue);
  const [labels, setLabels] = useState<Map<string, { label: string; count: number }>>(new Map());
  const [placeholder, setPlaceholder] = useState('Select');
  const [panelPosition, setPanelPosition] = useState<PanelPosition | null>(null);

  const controlled = value !== undefined;
  const current = controlled ? value : internal;

  const select = useCallback(
    (next: string) => {
      if (!controlled) setInternal(next);
      onValueChange?.(next);
      setOpen(false);
    },
    [controlled, onValueChange],
  );

  const register = useCallback((valueToRegister: string, label: string) => {
    setLabels((currentLabels) => {
      const next = new Map(currentLabels);
      next.set(valueToRegister, {
        label,
        count: (currentLabels.get(valueToRegister)?.count ?? 0) + 1,
      });
      return next;
    });
  }, []);

  const unregister = useCallback((valueToUnregister: string) => {
    setLabels((currentLabels) => {
      const entry = currentLabels.get(valueToUnregister);
      if (!entry) return currentLabels;
      const next = new Map(currentLabels);
      if (entry.count <= 1) next.delete(valueToUnregister);
      else next.set(valueToUnregister, { label: entry.label, count: entry.count - 1 });
      return next;
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !panelRef.current?.contains(target)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open) {
      setPanelPosition(null);
      return;
    }

    const updatePanelPosition = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;

      const margin = 8;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const width = Math.min(rect.width, Math.max(0, viewportWidth - margin * 2));
      const maxLeft = Math.max(margin, viewportWidth - width - margin);
      const left = Math.min(Math.max(rect.left, margin), maxLeft);
      const spaceBelow = Math.max(0, viewportHeight - rect.top - margin);
      const spaceAbove = Math.max(0, rect.bottom - margin);
      const desiredHeight = panelRef.current?.scrollHeight ?? 0;
      const placeAbove = desiredHeight > spaceBelow && spaceAbove > spaceBelow;
      const maxHeight = Math.max(0, placeAbove ? spaceAbove : spaceBelow);
      const height = Math.min(desiredHeight || maxHeight, maxHeight);
      const top = placeAbove
        ? Math.max(margin, rect.bottom - height)
        : Math.min(Math.max(rect.top, margin), Math.max(margin, viewportHeight - margin));
      const nextPosition = { top, left, width, maxHeight };

      setPanelPosition((currentPosition) => {
        if (
          currentPosition &&
          currentPosition.top === nextPosition.top &&
          currentPosition.left === nextPosition.left &&
          currentPosition.width === nextPosition.width &&
          currentPosition.maxHeight === nextPosition.maxHeight
        ) {
          return currentPosition;
        }
        return nextPosition;
      });
    };

    updatePanelPosition();
    window.addEventListener('resize', updatePanelPosition);
    window.addEventListener('scroll', updatePanelPosition, true);
    return () => {
      window.removeEventListener('resize', updatePanelPosition);
      window.removeEventListener('scroll', updatePanelPosition, true);
    };
  }, [open]);

  const context = useMemo<MorphContextValue>(
    () => ({
      value: current,
      open,
      setOpen,
      select,
      register,
      unregister,
      labelFor: (valueToLabel) => (valueToLabel === undefined ? undefined : labels.get(valueToLabel)?.label),
      placeholder,
      setPlaceholder,
      reduce,
      triggerId: id ?? `${baseId}-trigger`,
      listId: `${baseId}-list`,
      panelPosition,
      anchorRef,
      panelRef,
      disabled,
    }),
    [current, open, select, register, unregister, labels, placeholder, reduce, baseId, id, panelPosition, anchorRef, panelRef, disabled],
  );

  return (
    <MorphContext.Provider value={context}>
      <div ref={rootRef} className={cn('relative', className)}>
        {children}
      </div>
    </MorphContext.Provider>
  );
}

export interface MorphSelectValueProps {
  placeholder?: string;
  className?: string;
}

export function MorphSelectValue({ placeholder, className }: MorphSelectValueProps) {
  const context = useMorphContext('MorphSelectValue');
  useEffect(() => {
    if (placeholder) context.setPlaceholder(placeholder);
  }, [placeholder, context.setPlaceholder]);
  const label = context.labelFor(context.value);
  return <span className={cn(label ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400', className)}>{label ?? placeholder ?? 'Select'}</span>;
}

export interface MorphSelectTriggerProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  children: ReactNode;
}

export function MorphSelectTrigger({ className, children, ...buttonProps }: MorphSelectTriggerProps) {
  const context = useMorphContext('MorphSelectTrigger');
  return (
    <>
      <div
        ref={context.anchorRef}
        aria-hidden
        inert
        className={cn(ROW, 'invisible rounded-xl border border-gray-300 dark:border-gray-700', className)}
      >
        {children}
        <ChevronDown className="h-4 w-4" />
      </div>

      <AnimatePresence initial={false} mode="popLayout">
        {!context.open ? (
          <motion.button
            key="trigger"
            type="button"
            id={context.triggerId}
            disabled={context.disabled}
            aria-haspopup="listbox"
            aria-expanded={context.open}
            aria-controls={context.listId}
            onClick={() => context.setOpen(true)}
            transition={context.reduce ? { duration: 0 } : MORPH}
            style={{ borderRadius: 12 }}
            className={cn(
              ROW,
              'absolute inset-x-0 top-0 z-10 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm outline-none transition-colors',
              'hover:border-emerald-400 focus-visible:ring-2 focus-visible:ring-emerald-500/30',
              'disabled:pointer-events-none disabled:opacity-50',
              className,
            )}
            {...buttonProps}
          >
            <span className="min-w-0 truncate">
              {children}
            </span>
            <span className="text-gray-500 dark:text-gray-400">
              <ChevronDown className="h-4 w-4" />
            </span>
          </motion.button>
        ) : null}
      </AnimatePresence>
    </>
  );
}

export interface MorphSelectContentProps {
  className?: string;
  children: ReactNode;
}

export function MorphSelectContent({ className, children }: MorphSelectContentProps) {
  const context = useMorphContext('MorphSelectContent');
  const label = context.labelFor(context.value);
  return (
    <>
      <div className="hidden">{children}</div>
      {createPortal(
        <AnimatePresence initial={false} mode="popLayout">
          {context.open ? (
          <motion.div
            ref={context.panelRef}
            key="panel"
            id={context.listId}
            role="listbox"
            aria-labelledby={context.triggerId}
            transition={context.reduce ? { duration: 0 } : MORPH}
            style={{
              borderRadius: 12,
              top: context.panelPosition?.top ?? 0,
              left: context.panelPosition?.left ?? 0,
              width: context.panelPosition?.width ?? 'max-content',
              maxHeight: context.panelPosition?.maxHeight,
              visibility: context.panelPosition ? 'visible' : 'hidden',
            }}
            className={cn('fixed z-[9999] max-w-[calc(100vw-1rem)] overflow-y-auto border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-lg', className)}
          >
            <motion.button
              type="button"
              aria-expanded
              onClick={() => context.setOpen(false)}
              className={cn(ROW, 'outline-none')}
            >
              <span className={cn('min-w-0 truncate', label ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400')}>
                {label ?? context.placeholder}
              </span>
              <motion.span
                animate={{ rotate: 180 }}
                transition={context.reduce ? { duration: 0 } : MORPH}
                className="text-gray-500 dark:text-gray-400"
              >
                <ChevronDown className="h-4 w-4" />
              </motion.span>
            </motion.button>
            <div className="h-px bg-gray-200 dark:bg-gray-700" />
            <motion.ul
              initial="hidden"
              animate="show"
              variants={context.reduce ? undefined : LIST}
              className="p-1"
            >
              {children}
            </motion.ul>
          </motion.div>
          ) : null}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}

export interface MorphSelectItemProps {
  value: string;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
  key?: string;
}

export function MorphSelectItem({ value, disabled = false, className, children }: MorphSelectItemProps) {
  const context = useMorphContext('MorphSelectItem');
  const selected = context.value === value;
  const label = typeof children === 'string' ? children : value;

  useLayoutEffect(() => {
    context.register(value, label);
    return () => context.unregister(value);
  }, [context.register, context.unregister, value, label]);

  return (
    <motion.li variants={context.reduce ? undefined : ITEM}>
      <button
        type="button"
        role="option"
        aria-selected={selected}
        disabled={disabled}
        onClick={() => context.select(value)}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm outline-none transition-colors',
          selected
            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-gray-900 dark:text-gray-100'
            : 'text-gray-600 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white focus-visible:bg-emerald-50 dark:focus-visible:bg-gray-700',
          'disabled:pointer-events-none disabled:opacity-50',
          className,
        )}
      >
        {children}
        {selected ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
      </button>
    </motion.li>
  );
}
