// Enhanced Toast context for global notifications
import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext();

// Toast types with different styles
const TOAST_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
};

// Default durations for different toast types
const TOAST_DURATIONS = {
  [TOAST_TYPES.SUCCESS]: 3000,
  [TOAST_TYPES.ERROR]: 5000,
  [TOAST_TYPES.WARNING]: 4000,
  [TOAST_TYPES.INFO]: 3000,
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = TOAST_TYPES.INFO, options = {}) => {
    const id = Date.now() + Math.random(); // Ensure unique IDs
    const toast = {
      id,
      message,
      type,
      persistent: options.persistent || false,
      action: options.action || null,
      duration: options.duration || TOAST_DURATIONS[type],
    };

    setToasts(prev => [...prev, toast]);

    // Auto-remove if not persistent
    if (!toast.persistent) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, toast.duration);
    }

    return id; // Return ID for manual removal
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Convenience methods for different toast types
  const success = useCallback((message, options) => 
    addToast(message, TOAST_TYPES.SUCCESS, options), [addToast]);
  
  const error = useCallback((message, options) => 
    addToast(message, TOAST_TYPES.ERROR, options), [addToast]);
  
  const warning = useCallback((message, options) => 
    addToast(message, TOAST_TYPES.WARNING, options), [addToast]);
  
  const info = useCallback((message, options) => 
    addToast(message, TOAST_TYPES.INFO, options), [addToast]);

  const value = {
    toasts,
    addToast,
    removeToast,
    clearAllToasts,
    success,
    error,
    warning,
    info,
    TOAST_TYPES,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

// Toast container component
const ToastContainer = ({ toasts, onRemove }) => {
  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      maxWidth: '400px',
    }}>
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
};

// Individual toast component
const Toast = ({ toast, onRemove }) => {
  const getToastStyle = (type) => {
    const baseStyle = {
      padding: '12px 16px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      minWidth: '300px',
      animation: 'slideInRight 0.3s ease-out',
      fontSize: '14px',
      fontWeight: '500',
    };

    const typeStyles = {
      [TOAST_TYPES.SUCCESS]: {
        backgroundColor: '#d4edda',
        color: '#155724',
        border: '1px solid #c3e6cb',
      },
      [TOAST_TYPES.ERROR]: {
        backgroundColor: '#f8d7da',
        color: '#721c24',
        border: '1px solid #f5c6cb',
      },
      [TOAST_TYPES.WARNING]: {
        backgroundColor: '#fff3cd',
        color: '#856404',
        border: '1px solid #ffeaa7',
      },
      [TOAST_TYPES.INFO]: {
        backgroundColor: '#d1ecf1',
        color: '#0c5460',
        border: '1px solid #bee5eb',
      },
    };

    return { ...baseStyle, ...typeStyles[type] };
  };

  const getIcon = (type) => {
    const icons = {
      [TOAST_TYPES.SUCCESS]: '✓',
      [TOAST_TYPES.ERROR]: '✕',
      [TOAST_TYPES.WARNING]: '⚠',
      [TOAST_TYPES.INFO]: 'ℹ',
    };
    return icons[type] || icons[TOAST_TYPES.INFO];
  };

  return (
    <div style={getToastStyle(toast.type)}>
      <span style={{ fontSize: '18px', flexShrink: 0 }}>
        {getIcon(toast.type)}
      </span>
      <div style={{ flex: 1 }}>
        {toast.message}
        {toast.action && (
          <button
            onClick={toast.action.handler}
            style={{
              marginLeft: '8px',
              padding: '2px 8px',
              fontSize: '12px',
              backgroundColor: 'rgba(0, 0, 0, 0.1)',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            {toast.action.label}
          </button>
        )}
      </div>
      {!toast.persistent && (
        <button
          onClick={() => onRemove(toast.id)}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '16px',
            cursor: 'pointer',
            opacity: 0.7,
            padding: '0',
            width: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseEnter={(e) => e.target.style.opacity = '1'}
          onMouseLeave={(e) => e.target.style.opacity = '0.7'}
        >
          ×
        </button>
      )}
    </div>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

// Add animation styles to head
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideInRight {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    @keyframes slideOutRight {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }
  `;
  if (document.head) {
    document.head.appendChild(style);
  }
}