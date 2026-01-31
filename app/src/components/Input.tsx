// client/src/components/Input.jsx
import React from 'react';

export const Input = ({ style = {}, ...props }) => {
  const baseStyle = {
    padding: '0.5rem',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '1rem',
    ...style
  };

  return (
    <input
      style={baseStyle}
      {...props}
    />
  );
};