import React, { useEffect, useRef } from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error';
  isOpen: boolean;
  onClose: () => void;
  duration?: number; // in ms
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'success',
  isOpen,
  onClose,
  duration = 3000,
}) => {
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    // Animate progress bar
    if (progressRef.current) {
      progressRef.current.style.transition = 'none';
      progressRef.current.style.width = '100%';
      setTimeout(() => {
        if (progressRef.current) {
          progressRef.current.style.transition = `width ${duration}ms linear`;
          progressRef.current.style.width = '0%';
        }
      }, 10);
    }
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [isOpen, duration, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed z-[100000] px-4 py-2 rounded-md shadow flex items-center gap-2 transition-all min-w-[220px] max-w-[360px] top-6 right-6 ${
        type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
      }`}
      role="alert"
      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.10)' }}
    >
      {/* Icon */}
      <span className="flex items-center justify-center">
        {type === 'error' ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="mr-1" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="#ffffff" strokeWidth="2" fill="none" />
            <path d="M12 7v6" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="16" r="1.2" fill="#ffffff" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="mr-1" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="#ffffff" strokeWidth="2" fill="none" />
            <path d="M7 12.5l3 3 7-7" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className="flex-1 text-sm font-medium">{message}</span>
      <button
        onClick={onClose}
        className="ml-2 focus:outline-none text-lg font-bold text-white hover:text-gray-200"
        aria-label="Close notification"
        style={{ lineHeight: 1 }}
      >
        ×
      </button>
      {/* Progress bar */}
      <div
        ref={progressRef}
        className={`absolute left-0 bottom-0 h-0.5 rounded-b ${type === 'error' ? 'bg-white/70' : 'bg-white/70'}`}
        style={{ width: '100%', transition: 'width 0ms' }}
      />
    </div>
  );
}; 