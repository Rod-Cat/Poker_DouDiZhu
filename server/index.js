/**
 * 服务端入口文件
 * 负责：启动HTTP服务器、初始化数据库、注册Socket.io事件、提供静态文件服务
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import path from 'path';
import os from 'os';

import config from './config.js';
import { initDatabase } from './db/connection.js';
import { runSchema } from './db/schema.js';
import { registerAllHandlers } from './socket/handler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ==================== 创建Express和HTTP服务器 ====================

const app = express();
const httpServer = createServer(app);

// ==================== 创建Socket.io服务器 ====================

const io = new Server(httpServer, {
  cors: {
    origin: config.isDev ? config.CORS_ORIGINS : '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 10000,
});

// ==================== Express中间件 ====================

app.use(express.json());

// 在生产环境中提供静态文件
if (!config.isDev) {
  app.use(express.static(config.PUBLIC_DIR));
  // SPA fallback: 所有非API路由返回index.html
  app.get('*', (req, res) => {
    res.sendFile(path.join(config.PUBLIC_DIR, 'index.html'));
  });
}

// ==================== 获取本机局域网IP ====================

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

// ==================== 启动服务器 ====================

async function start() {
  // 初始化数据库
  const sqlDb = await initDatabase(config.DB_PATH);
  runSchema(sqlDb);

  // 存储全局实例引用
  global.db = sqlDb;
  global.io = io;
  global.playerSockets = new Map();  // playerId → socketId
  global.socketPlayers = new Map();  // socketId → playerId
  global.sessionTokens = new Map();  // token → playerId
  global.rooms = new Map();          // roomCode → RoomState

  // ==================== 注册Socket.io事件处理器 ====================

  io.on('connection', (socket) => {
    console.log(`[连接] 新客户端连接: ${socket.id}`);
    registerAllHandlers(socket);

    socket.on('disconnect', (reason) => {
      console.log(`[断开] ${socket.id} 断开连接, 原因: ${reason}`);
    });
  });

  // ==================== 启动HTTP服务器 ====================

  httpServer.listen(config.PORT, () => {
    const localIP = getLocalIP();
    console.log('═══════════════════════════════════════════');
    console.log('  🃏  联机斗地主游戏服务端已启动！');
    console.log('═══════════════════════════════════════════');
    console.log(`  本地访问:  http://localhost:${config.PORT}`);
    console.log(`  局域网访问: http://${localIP}:${config.PORT}`);
    console.log(`  数据目录:  ${config.DB_PATH}`);
    console.log(`  运行模式:  ${config.isDev ? '开发模式' : '生产模式'}`);
    console.log('═══════════════════════════════════════════');
    if (config.isDev) {
      console.log('  提示: 开发模式下请同时启动 client (cd client && npm run dev)');
    }
  });
}

start().catch((err) => {
  console.error('[启动失败]', err);
  process.exit(1);
});

export { app, io, httpServer };
