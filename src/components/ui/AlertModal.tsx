import React from 'react';

interface AlertModalProps {
  isOpen: boolean;
  message: string;
  onClose: () => void;
  title?: string; // Optional, e.g., "localhost:5173 says"
}

const AlertModal: React.FC<AlertModalProps> = ({ isOpen, message, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex justify-center items-start bg-black bg-opacity-40">
      <div
        className="mt-8 bg-[#444] text-white rounded-lg shadow-2xl min-w-[400px] max-w-[95vw]"
        style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}
      >
        {/* Removed the title section */}
        <div className="px-6 pb-4 pt-5 text-base text-white">
          {message}
        </div>
        <div className="px-6 pb-5 flex justify-end">
          <button
            onClick={onClose}
            className="bg-[#1976d2] hover:bg-[#1565c0] text-white font-semibold px-7 py-2 rounded focus:outline-none text-base"
            autoFocus
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertModal; 