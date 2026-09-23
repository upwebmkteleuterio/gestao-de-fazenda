import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, X, AlertCircle, Info } from 'lucide-react';

export interface ToastProps {
  isVisible?: boolean;
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  isVisible = true,
  message,
  type = 'success',
  onClose,
}) => {
  const [shouldRender, setShouldRender] = useState(isVisible);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    let hideTimer: NodeJS.Timeout;
    if (isVisible) {
      setShouldRender(true);
      const timer = requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsAnimating(true));
      });
      hideTimer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => {
        cancelAnimationFrame(timer);
        clearTimeout(hideTimer);
      };
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible || !shouldRender) return null;

  const icons = {
    success: <Check className="w-5 h-5" />,
    error: <AlertCircle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />,
  };

  const colors = {
    success: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    error: 'bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800',
    info: 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  };

  return createPortal(
    <div
      className={`fixed top-5 left-1/2 -translate-x-1/2 z-[10001] transform transition-all duration-300 ease-out flex items-center shadow-2xl rounded-xl border p-3.5 max-w-md w-11/12 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 ${
        isAnimating ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-6 opacity-0 scale-95'
      }`}
    >
      <div className={`p-2 rounded-full mr-3 shrink-0 ${colors[type]}`}>
        {icons[type]}
      </div>
      <p className="text-sm font-medium text-gray-800 dark:text-gray-100 flex-1">{message}</p>
      <button
        type="button"
        onClick={onClose}
        className="ml-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors shrink-0 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <X className="w-4 h-4" />
      </button>
    </div>,
    document.body
  );
};
