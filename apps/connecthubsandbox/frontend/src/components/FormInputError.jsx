import React from 'react';
import icons from '../constants/icon';
import "./styles/FormInputError.css";

const { login_input_error } = icons;

const FormInputError = ({message}) => {
    return (
        <div className="FormInputError">
            <img src={login_input_error} alt="" className="FormInputError_icon" />
            <p className="FormInputError_text">
                {message}
            </p>
        </div>
    )
}

export default FormInputError