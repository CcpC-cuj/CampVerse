import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';

// Modal Context for global access
const ModalContext = createContext(null);

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

// Modal Provider Component
export const ModalProvider = ({ children }) => {
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: 'alert', // 'alert', 'confirm', 'prompt'
    title: '',
    message: '',
    placeholder: '',
    defaultValue: '',
    confirmText: 'OK',
    cancelText: 'Cancel',
    variant: 'default', // 'default', 'success', 'warning', 'danger'
    onConfirm: null,
    onCancel: null,
  });

  const [inputValue, setInputValue] = useState('');

  // Alert - just shows message with OK button
  const showAlert = useCallback((message, options = {}) => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        type: 'alert',
        title: options.title || 'Notice',
        message,
        confirmText: options.confirmText || 'OK',
        cancelText: 'Cancel',
        variant: options.variant || 'default',
        onConfirm: () => {
          setModalState(prev => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onCancel: null,
      });
    });
  }, []);

  // Confirm - shows message with OK and Cancel buttons
  const showConfirm = useCallback((message, options = {}) => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        type: 'confirm',
        title: options.title || 'Confirm',
        message,
        confirmText: options.confirmText || 'OK',
        cancelText: options.cancelText || 'Cancel',
        variant: options.variant || 'default',
        onConfirm: () => {
          setModalState(prev => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onCancel: () => {
          setModalState(prev => ({ ...prev, isOpen: false }));
          resolve(false);
        },
      });
    });
  }, []);

  // Prompt - shows message with input field, OK and Cancel buttons
  const showPrompt = useCallback((message, options = {}) => {
    setInputValue(options.defaultValue || '');
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        type: 'prompt',
        title: options.title || 'Input',
        message,
        placeholder: options.placeholder || '',
        defaultValue: options.defaultValue || '',
        confirmText: options.confirmText || 'OK',
        cancelText: options.cancelText || 'Cancel',
        variant: options.variant || 'default',
        onConfirm: (value) => {
          setModalState(prev => ({ ...prev, isOpen: false }));
          resolve(value);
        },
        onCancel: () => {
          setModalState(prev => ({ ...prev, isOpen: false }));
          resolve(null);
        },
      });
    });
  }, []);

  // Success alert shorthand
  const showSuccess = useCallback((message, options = {}) => {
    return showAlert(message, { ...options, variant: 'success', title: options.title || 'Success' });
  }, [showAlert]);

  // Error alert shorthand
  const showError = useCallback((message, options = {}) => {
    return showAlert(message, { ...options, variant: 'danger', title: options.title || 'Error' });
  }, [showAlert]);

  // Warning confirm shorthand
  const showWarning = useCallback((message, options = {}) => {
    return showConfirm(message, { ...options, variant: 'warning', title: options.title || 'Warning' });
  }, [showConfirm]);

  // Danger confirm shorthand (for delete confirmations)
  const showDanger = useCallback((message, options = {}) => {
    return showConfirm(message, { 
      ...options, 
      variant: 'danger', 
      title: options.title || 'Are you sure?',
      confirmText: options.confirmText || 'Delete',
    });
  }, [showConfirm]);

  const closeModal = useCallback(() => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  }, []);

  const handleConfirm = () => {
    if (modalState.type === 'prompt') {
      modalState.onConfirm?.(inputValue);
    } else {
      modalState.onConfirm?.();
    }
  };

  const handleCancel = () => {
    modalState.onCancel?.();
  };

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!modalState.isOpen) return;
      if (e.key === 'Escape') {
        if (modalState.type === 'alert') {
          handleConfirm();
        } else {
          handleCancel();
        }
      } else if (e.key === 'Enter' && modalState.type !== 'prompt') {
        handleConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalState.isOpen, modalState.type]);

  const getVariantStyles = () => {
    switch (modalState.variant) {
      case 'success':
        return {
          icon: 'ri-checkbox-circle-fill',
          iconColor: 'text-green-400',
          iconBg: 'bg-green-500/20',
          confirmBtn: 'bg-green-600 hover:bg-green-500',
        };
      case 'warning':
        return {
          icon: 'ri-alert-fill',
          iconColor: 'text-yellow-400',
          iconBg: 'bg-yellow-500/20',
          confirmBtn: 'bg-yellow-600 hover:bg-yellow-500',
        };
      case 'danger':
        return {
          icon: 'ri-error-warning-fill',
          iconColor: 'text-red-400',
          iconBg: 'bg-red-500/20',
          confirmBtn: 'bg-red-600 hover:bg-red-500',
        };
      default:
        return {
          icon: 'ri-information-fill',
          iconColor: 'text-purple-400',
          iconBg: 'bg-purple-500/20',
          confirmBtn: 'bg-purple-600 hover:bg-purple-500',
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <ModalContext.Provider value={{ 
      showAlert, 
      showConfirm, 
      showPrompt, 
      showSuccess, 
      showError, 
      showWarning, 
      showDanger,
      closeModal 
    }}>
      {children}

      {/* Modal Overlay */}
      {modalState.isOpen && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget && modalState.type !== 'alert') {
              handleCancel();
            }
          }}
        >
          <div 
            className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-md p-6 shadow-2xl transform animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className={`w-16 h-16 rounded-full ${styles.iconBg} flex items-center justify-center`}>
                <i className={`${styles.icon} text-3xl ${styles.iconColor}`}></i>
              </div>
            </div>

            {/* Title */}
            <h3 className="text-xl font-bold text-white text-center mb-2">
              {modalState.title}
            </h3>

            {/* Message */}
            <p className="text-gray-300 text-center mb-6 whitespace-pre-wrap">
              {modalState.message}
            </p>

            {/* Input for prompt type */}
            {modalState.type === 'prompt' && (
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={modalState.placeholder}
                autoFocus
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 mb-6"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleConfirm();
                  }
                }}
              />
            )}

            {/* Buttons */}
            <div className={`flex gap-3 ${modalState.type === 'alert' ? 'justify-center' : ''}`}>
              {modalState.type !== 'alert' && (
                <button
                  onClick={handleCancel}
                  className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
                >
                  {modalState.cancelText}
                </button>
              )}
              <button
                onClick={handleConfirm}
                autoFocus={modalState.type !== 'prompt'}
                className={`flex-1 px-4 py-3 ${styles.confirmBtn} text-white rounded-lg transition-colors font-medium`}
              >
                {modalState.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.15s ease-out;
        }
        .animate-scaleIn {
          animation: scaleIn 0.15s ease-out;
        }
      `}</style>
    </ModalContext.Provider>
  );
};

export default ModalProvider;
