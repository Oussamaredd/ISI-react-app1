// Loading skeleton component
export const Skeleton = ({ width = '100%', height = '20px', className = '' }) => (
  <div 
    className={`animate-pulse bg-gray-200 rounded ${className}`}
    style={{ width, height }}
  />
);

// Loading overlay for async operations
export const LoadingOverlay = ({ isLoading, children }) => {
  if (!isLoading) return children;
  
  return (
    <div className="relative">
      {children}
      <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center">
        <div className="text-lg font-medium">Loading...</div>
      </div>
    </div>
  );
};

// Empty state component
export const EmptyState = ({ title = 'No data found', description, action }) => (
  <div className="text-center py-12">
    <div className="text-gray-500 text-6xl mb-4">📋</div>
    <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
    {description && <p className="text-gray-600 mb-4">{description}</p>}
    {action && (
      <div className="mt-6">
        {action}
      </div>
    )}
  </div>
);

// Toast notification component
export const Toast = ({ message, type = 'info', onClose }) => {
  const bgColor = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500'
  }[type];

  return (
    <div className={`fixed top-4 right-4 p-4 rounded-lg text-white ${bgColor} shadow-lg max-w-sm z-50`}>
      <div className="flex items-center justify-between">
        <span>{message}</span>
        <button 
          onClick={onClose}
          className="ml-4 text-white hover:text-gray-200"
        >
          ✕
        </button>
      </div>
    </div>
  );
};