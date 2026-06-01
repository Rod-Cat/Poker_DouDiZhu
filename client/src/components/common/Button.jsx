/**
 * 通用按钮组件
 */

import React from 'react';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  block = false,
  disabled = false,
  onClick,
  style,
  className = '',
}) {
  const classes = [
    'btn',
    variant !== 'primary' ? `btn-${variant}` : '',
    size !== 'md' ? `btn-${size}` : '',
    block ? 'btn-block' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      className={classes}
      disabled={disabled}
      onClick={onClick}
      style={style}
    >
      {children}
    </button>
  );
}
