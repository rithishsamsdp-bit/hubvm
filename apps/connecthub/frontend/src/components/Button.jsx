import React from 'react';
import './styles/Button.css';

const Button = ({
    variant = 'primary',   // 'primary' | 'secondary'
    children,
    onClick,
    type = 'button',
    disabled = false,
    className = '',
    ...rest
}) => {
    const classes = `btn btn--${variant} ${className}`.trim();

    return (
        <button
            type={type}
            className={classes}
            onClick={onClick}
            disabled={disabled}
            {...rest}
        >
            {children}
        </button>
    );
};

export default Button;
