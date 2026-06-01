/**
 * Socket.io 客户端单例
 * 管理 WebSocket 连接的生命周期
 */

import { io } from 'socket.io-client';

/** @type {import('socket.io-client').Socket|null} */
let socket = null;

/**
 * 获取当前socket实例，如果没有则创建
 * @returns {import('socket.io-client').Socket}
 */
export function getSocket() {
  if (!socket) {
    // 开发模式下通过Vite代理连接，意味着同源
    // 生产模式下也是同源（由Express同时提供静态文件和WebSocket）
    socket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      timeout: 20000,
    });

    socket.on('connect', () => {
      console.log('[Socket] 已连接到服务器');
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] 与服务器断开连接:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('[Socket] 连接错误:', error.message);
    });
  }
  return socket;
}

/**
 * 发送认证请求
 * @param {string} event - 事件名
 * @param {object} data - 请求数据
 * @returns {Promise<object>} 响应数据
 */
export function sendAuth(event, data = {}) {
  return new Promise((resolve) => {
    const s = getSocket();
    s.emit(event, data, (response) => {
      resolve(response);
    });
  });
}

/**
 * 发送普通事件（无回调）
 * @param {string} event - 事件名
 * @param {object} data - 事件数据
 */
export function emit(event, data = {}) {
  const s = getSocket();
  s.emit(event, data);
}

/**
 * 断开socket连接
 */
export function disconnect() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
