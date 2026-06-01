/**
 * 服务端配置文件
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

export default {
  /** 服务端监听端口 */
  PORT: process.env.PORT || 3000,

  /** 数据库文件路径 */
  DB_PATH: path.join(ROOT_DIR, 'server', 'data', 'poker.db'),

  /** 客户端生产构建目录 */
  CLIENT_DIST: path.join(ROOT_DIR, 'client', 'dist'),

  /** 客户端开发时Vite地址 */
  VITE_DEV_URL: 'http://localhost:5173',

  /** 静态文件根目录 */
  PUBLIC_DIR: path.join(ROOT_DIR, 'client', 'dist'),

  /** 是否开发模式 */
  isDev: process.env.NODE_ENV !== 'production',

  /** CORS 允许的来源 */
  CORS_ORIGINS: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:3000'],
};
