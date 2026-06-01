/**
 * 头像组件
 */

import React from 'react';

export default function Avatar({ nickname = '?', size = 'md', avatarType = 'default' }) {
  const initial = nickname ? nickname.charAt(0) : '?';
  const sizeClass = size === 'sm' ? 'avatar-sm' : '';

  // 基于昵称生成固定的颜色
  const colors = [
    'linear-gradient(135deg, #667eea, #764ba2)',
    'linear-gradient(135deg, #f093fb, #f5576c)',
    'linear-gradient(135deg, #4facfe, #00f2fe)',
    'linear-gradient(135deg, #43e97b, #38f9d7)',
    'linear-gradient(135deg, #fa709a, #fee140)',
    'linear-gradient(135deg, #a18cd1, #fbc2eb)',
    'linear-gradient(135deg, #fccb90, #d57eeb)',
    'linear-gradient(135deg, #e0c3fc, #8ec5fc)',
  ];
  const colorIndex = nickname.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length;

  return (
    <div
      className={`avatar ${sizeClass}`}
      style={{ background: colors[colorIndex] }}
      title={nickname}
    >
      {initial}
    </div>
  );
}
