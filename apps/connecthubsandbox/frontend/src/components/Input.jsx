// src/components/Input/Input.jsx
import { useState } from 'react';
import PropTypes from 'prop-types';
import icons from '../constants/icon';
import './styles/Input.css';
import Icon from '../constants/Icon.jsx'

const Input = ({
    id,
    name,                // ← now passed through
    type = 'text',
    value,               // controlled value (optional)
    onChange,            // controlled onChange (optional)
    placeholder,
    maxLength,
    allow,               // RegExp to filter allowed chars
    prefixIcon,
    prefixIconColor = "#000000",       // React node or image URL
    suffixIcon,          // React node or image URL
    suffixIconColor = "#000000",
    rows,                // for textarea
    defaultValue = '',   // uncontrolled initial value
    width,               // CSS width (e.g. '200px' or '100%')
    required = false,    // HTML5 required
    autoComplete,
    ...rest
}) => {
    // controlled vs uncontrolled
    const isControlled = value !== undefined;
    const [internalValue, setInternalValue] = useState(defaultValue);
    const safeValue = isControlled ? value : internalValue;

    // show/hide for password
    const [showPassword, setShowPassword] = useState(false);
    const { Eye, login_pass_hide } = icons;

    const isTextarea = type === 'textarea';
    const actualType = type === 'password' && showPassword ? 'text' : type;

    const handleChange = e => {
        const next = e.target.value;
        if (allow && !allow.test(next)) return;
        if (isControlled) {
            onChange(e);
        } else {
            setInternalValue(next);
            if (typeof onChange === 'function') onChange(e);
        }
    };

    // padding for icons
    const padLeft = prefixIcon ? '2.5rem' : undefined;
    const padRight = (type === 'password' || suffixIcon || isTextarea) ? '2.5rem' : undefined;
    const wrapperStyle = width ? { width } : undefined;

    return (
        <div className="input-wrapper" style={wrapperStyle}>
            {prefixIcon && (
                <span className="input-icon input-icon-prefix">
                    {typeof prefixIcon === 'string'
                        ? <Icon name={prefixIcon} color={prefixIconColor} />
                        : prefixIcon}
                </span>
            )}

            {isTextarea ? (
                <textarea
                    id={id}
                    name={name}
                    value={safeValue}
                    onChange={handleChange}
                    placeholder={placeholder}
                    maxLength={maxLength}
                    rows={rows}
                    required={required}
                    className="textarea-field"
                    autoComplete={autoComplete}
                    style={{ paddingLeft: padLeft, paddingRight: padRight }}
                    {...rest}
                />
            ) : (
                <input
                    id={id}
                    name={name}
                    type={actualType}
                    value={safeValue}
                    onChange={handleChange}
                    autoComplete={autoComplete}
                    placeholder={placeholder}
                    maxLength={maxLength}
                    required={required}
                    className="input-field"
                    style={{ paddingLeft: padLeft, paddingRight: padRight }}
                    {...rest}
                />
            )}

            {suffixIcon && type !== 'password' && (
                <span className="input-icon input-icon-suffix">
                    {typeof suffixIcon === 'string'
                        ? <Icon name={suffixIcon} color={suffixIconColor} />
                        : suffixIcon}
                </span>
            )}

            {type === 'password' && (
                <button
                    type="button"
                    className="input-password-toggle"
                    onClick={() => setShowPassword(p => !p)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                    <img
                        src={showPassword ? login_pass_hide : Eye}
                        alt="toggle visibility"
                    />
                </button>
            )}
        </div>
    );
};

Input.propTypes = {
    id: PropTypes.string,
    name: PropTypes.string,
    type: PropTypes.string,
    value: PropTypes.string,
    onChange: PropTypes.func,
    placeholder: PropTypes.string,
    maxLength: PropTypes.number,
    allow: PropTypes.instanceOf(RegExp),
    prefixIcon: PropTypes.oneOfType([PropTypes.node, PropTypes.string]),
    suffixIcon: PropTypes.oneOfType([PropTypes.node, PropTypes.string]),
    rows: PropTypes.number,
    defaultValue: PropTypes.string,
    width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    required: PropTypes.bool,
};

export default Input;
