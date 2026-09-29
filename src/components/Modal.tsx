import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  contentOverflowVisible?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  actions,
  contentOverflowVisible = false,
}) => {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      const timer = requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsVisible(true));
      });
      return () => cancelAnimationFrame(timer);
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => setShouldRender(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!shouldRender) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div
          className={`fixed inset-0 transition-opacity duration-200 ease-in-out bg-gray-900/60 dark:bg-black/75 backdrop-blur-xs ${
            isVisible ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={onClose}
        />
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

        {/* Modal Box */}
        <div
          className={`inline-block align-bottom bg-white dark:bg-gray-900 rounded-xl text-left shadow-2xl transform transition-all duration-200 ease-out sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-gray-100 dark:border-gray-800 relative z-[10000] ${
            contentOverflowVisible ? 'overflow-visible' : 'overflow-hidden'
          } ${
            isVisible ? 'opacity-100 translate-y-0 sm:scale-100' : 'opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95'
          }`}
        >
          <div className={`bg-white dark:bg-gray-900 px-6 pt-6 pb-4 relative ${contentOverflowVisible ? 'overflow-visible' : 'overflow-hidden'}`}>
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-gray-100 dark:bg-gray-800 rounded-full opacity-50 pointer-events-none" />

            <div className="relative z-10">
              <h3 className="text-lg leading-6 font-bold text-gray-900 dark:text-white mb-3">{title}</h3>
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">{children}</div>
            </div>
          </div>
          {actions && (
            <div className="bg-gray-50 dark:bg-gray-950 px-6 py-3.5 flex flex-row-reverse space-x-3 space-x-reverse border-t border-gray-100 dark:border-gray-800">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
