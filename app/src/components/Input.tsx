import React from 'react';

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', ...props }, ref) => {
    const finalClassName = `ops-input${className ? ` ${className}` : ''}`;

    return (
      <input
        ref={ref}
        className={finalClassName}
        {...props}
      />
    );
  },
);

Input.displayName = 'Input';
