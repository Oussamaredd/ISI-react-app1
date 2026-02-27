import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'ops-btn ops-btn-primary',
  secondary: 'ops-btn ops-btn-outline',
  danger: 'ops-btn ops-btn-danger',
};

export const Button = ({
  children,
  variant = 'primary',
  className = '',
  ...props
}: ButtonProps) => {
  const variantClass = BUTTON_VARIANTS[variant] ?? BUTTON_VARIANTS.primary;
  const finalClassName = `${variantClass}${className ? ` ${className}` : ''}`;

  return (
    <button className={finalClassName} {...props}>
      {children}
    </button>
  );
};
