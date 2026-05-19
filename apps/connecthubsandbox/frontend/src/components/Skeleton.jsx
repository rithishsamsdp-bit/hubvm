import React from 'react';
import './styles/Skeleton.css';

const Skeleton = ({ variant = 'text', width, height, className = '', style = {} }) => {
    const skeletonClass = `skeleton skeleton-${variant} ${className}`;
    
    const inlineStyle = {
        width,
        height,
        ...style
    };

    return <div className={skeletonClass} style={inlineStyle} />;
};

export default Skeleton;
