import React, { createContext, useContext, useState, useCallback } from 'react';

/**
 * Toast Notification System
 * Provides global toast notifications for success, error, warning, and info messages
 */

const ToastContext = createContext(null);

// Toast types with their styling
const toastStyles = {
  success: {
    bg: 'bg-green-500/20',
    border: 'border-green-500/30',
    icon: 'ri-checkbox-circle-fill',
    iconColor: 'text-green-400',
  },
  error: {
    bg: 'bg-red-500/20',
    border: 'border-red-500/30',
    icon: 'ri-error-warning-fill',
    iconColor: 'text-red-400',
  },
  warning: {
    bg: 'bg-yellow-500/20',
    border: 'border-yellow-500/30',
    icon: 'ri-alert-fill',
    iconColor: 'text-yellow-400',
  },
  info: {
    bg: 'bg-blue-500/20',
    border: 'border-blue-500/30',
    icon: 'ri-information-fill',
    iconColor: 'text-blue-400',
  },
};

// Individual Toast Component
function Toast({ id, type, message, title, onClose }) {
  const style = toastStyles[type] || toastStyles.info;

  return (
    <div
      className={`${style.bg} ${style.border} border backdrop-blur-xl rounded-xl p-4 shadow-lg flex items-start gap-3 min-w-[300px] max-w-[400px] animate-slide-in`}
      role="alert"
    >
      <i className={`${style.icon} ${style.iconColor} text-xl mt-0.5`}></i>
      <div className="flex-1 min-w-0">
        {title && (
          <h4 className="font-semibold text-white mb-1">{title}</h4>
        )}
        <p className="text-gray-300 text-sm">{message}</p>
      </div>
      <button
        onClick={() => onClose(id)}
        className="text-gray-400 hover:text-white transition-colors p-1"
        aria-label="Close notification"
      >
        <i className="ri-close-line text-lg"></i>
      </button>
    </div>
  );
}

// Toast Container Component
function ToastContainer({ toasts, removeToast }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onClose={removeToast} />
      ))}
    </div>
  );
}

// Toast Provider Component
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ type = 'info', message, title, duration = 5000 }) => {
    const id = Date.now() + Math.random();
    
    setToasts((prev) => [...prev, { id, type, message, title }]);

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  // Convenience methods
  const toast = {
    success: (message, title) => addToast({ type: 'success', message, title }),
    error: (message, title) => addToast({ type: 'error', message, title }),
    warning: (message, title) => addToast({ type: 'warning', message, title }),
    info: (message, title) => addToast({ type: 'info', message, title }),
    custom: addToast,
    dismiss: removeToast,
    dismissAll: () => setToasts([]),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

// Hook to use toast notifications
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// Add animation styles to index.css
// @keyframes slide-in {
//   from {
//     transform: translateX(100%);
//     opacity: 0;
//   }
//   to {
//     transform: translateX(0);
//     opacity: 1;
//   }
// }
// .animate-slide-in {
//   animation: slide-in 0.3s ease-out;
// }

export default ToastProvider;
