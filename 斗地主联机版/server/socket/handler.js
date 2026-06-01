/**
 * Socket.io 事件处理器注册
 * 为每个连接的客户端socket注册所有事件处理器
 * 认证、房间、游戏三大模块的完整集成
 */

import { AUTH, ROOM, GAME, CONNECTION } from '../../shared/events.js';
import { register, login, guestLogin, generateToken, restoreSession } from '../auth/auth.js';
import * as playerRepo from '../db/player-repo.js';
import {
  createRoom, joinRoom, leaveRoom, toggleReady, sendChat,
  quickMatch, getPlayerRoom, getPlayerGame,
} from '../room/room-manager.js';

/**
 * 注册所有事件处理器
 * @param {import('socket.io').Socket} socket
 */
export function registerAllHandlers(socket) {

  // ==================== 辅助函数 ====================

  /** 获取当前socket对应的玩家信息 */
  function getPlayer() {
    const playerId = socket.data.playerId;
    if (!playerId) return null;
    return playerRepo.findById(playerId);
  }

  /** 获取当前socket对应的公开玩家信息 */
  function getPublicPlayer() {
    const player = getPlayer();
    return playerRepo.toPublic(player);
  }

  // ==================== 认证事件处理 ====================

  socket.on(AUTH.REGISTER, (data, callback) => {
    const { username, password, nickname } = data;
    const result = register(username, password, nickname);
    if (result.success) {
      const token = generateToken(result.player.id);
      global.playerSockets.set(result.player.id, socket.id);
      global.socketPlayers.set(socket.id, result.player.id);
      socket.data.playerId = result.player.id;
      callback({ success: true, player: result.player, token });
    } else {
      callback({ success: false, error: result.error });
    }
  });

  socket.on(AUTH.LOGIN, (data, callback) => {
    const { username, password } = data;
    const result = login(username, password);
    if (result.success) {
      const token = generateToken(result.player.id);
      global.playerSockets.set(result.player.id, socket.id);
      global.socketPlayers.set(socket.id, result.player.id);
      socket.data.playerId = result.player.id;
      callback({ success: true, player: result.player, token });
    } else {
      callback({ success: false, error: result.error });
    }
  });

  socket.on(AUTH.GUEST, (data, callback) => {
    const result = guestLogin();
    const token = generateToken(result.player.id);
    global.playerSockets.set(result.player.id, socket.id);
    global.socketPlayers.set(socket.id, result.player.id);
    socket.data.playerId = result.player.id;
    callback({ success: true, player: result.player, token });
  });

  socket.on(AUTH.RESTORE, (data, callback) => {
    const { playerId, token } = data;
    const result = restoreSession(playerId, token);
    if (result.success) {
      global.playerSockets.set(playerId, socket.id);
      global.socketPlayers.set(socket.id, playerId);
      socket.data.playerId = playerId;
      callback({ success: true, player: result.player });
    } else {
      callback({ success: false, error: result.error });
    }
  });

  // ==================== 心跳事件 ====================

  socket.on(CONNECTION.PING, () => {
    socket.emit(CONNECTION.PONG, { serverTime: Date.now() });
  });

  // ==================== 房间事件处理 ====================

  /** 创建房间 */
  socket.on(ROOM.CREATE, (data) => {
    const playerId = socket.data.playerId;
    if (!playerId) {
      socket.emit(ROOM.ERROR, { code: 'AUTH', message: '请先登录' });
      return;
    }
    const publicPlayer = getPublicPlayer();
    if (!publicPlayer) return;

    // 如果已在其他房间，先离开
    const existing = getPlayerRoom(playerId);
    if (existing) {
      leaveRoom(playerId);
    }

    const room = createRoom(playerId, publicPlayer.nickname);
    socket.emit(ROOM.STATE, {
      roomCode: room.roomCode,
      hostPlayerId: room.hostPlayerId,
      players: room.players.map((p) => ({
        playerId: p.playerId,
        nickname: p.nickname,
        avatar: p.avatar,
        gold: p.gold,
        isReady: p.isReady,
        seatIndex: p.seatIndex,
        isHost: p.isHost,
        isConnected: p.isConnected,
      })),
      status: room.status,
    });
  });

  /** 加入房间 */
  socket.on(ROOM.JOIN, (data) => {
    const playerId = socket.data.playerId;
    if (!playerId) {
      socket.emit(ROOM.ERROR, { code: 'AUTH', message: '请先登录' });
      return;
    }
    const { roomCode } = data;
    if (!roomCode) {
      socket.emit(ROOM.ERROR, { code: 'PARAM', message: '请输入房间号' });
      return;
    }

    const publicPlayer = getPublicPlayer();
    if (!publicPlayer) return;

    // 如果已在其他房间，先离开
    const existing = getPlayerRoom(playerId);
    if (existing && existing.roomCode !== roomCode) {
      leaveRoom(playerId);
    }

    const result = joinRoom(roomCode.trim().toUpperCase(), playerId, publicPlayer.nickname);
    if (!result.success) {
      socket.emit(ROOM.ERROR, { code: 'ROOM', message: result.error });
    }
    // joinRoom内部已经发送了ROOM.STATE给加入的玩家
  });

  /** 离开房间 */
  socket.on(ROOM.LEAVE, (data) => {
    const playerId = socket.data.playerId;
    if (!playerId) return;
    leaveRoom(playerId);
    socket.emit(ROOM.STATE, null); // 清空客户端房间状态
  });

  /** 准备/取消准备 */
  socket.on(ROOM.READY, (data) => {
    const playerId = socket.data.playerId;
    if (!playerId) return;
    const { ready } = data;
    toggleReady(playerId, ready !== false); // 默认true（准备）
  });

  /** 发送聊天消息 */
  socket.on(ROOM.CHAT, (data) => {
    const playerId = socket.data.playerId;
    if (!playerId) return;
    const { message } = data;
    if (message && typeof message === 'string' && message.trim()) {
      sendChat(playerId, message.trim());
    }
  });

  /** 快速匹配 */
  socket.on(ROOM.QUICK_MATCH, (data) => {
    const playerId = socket.data.playerId;
    if (!playerId) {
      socket.emit(ROOM.ERROR, { code: 'AUTH', message: '请先登录' });
      return;
    }
    const publicPlayer = getPublicPlayer();
    if (!publicPlayer) return;

    // 如果已在其他房间，先离开
    const existing = getPlayerRoom(playerId);
    if (existing) {
      leaveRoom(playerId);
    }

    const result = quickMatch(playerId, publicPlayer.nickname);
    if (!result.success) {
      socket.emit(ROOM.ERROR, { code: 'ROOM', message: result.error });
    }
    // quickMatch内部已经发送了ROOM.STATE给玩家
  });

  // ==================== 游戏事件处理 ====================

  /** 抢地主 */
  socket.on(GAME.BID, (data) => {
    const playerId = socket.data.playerId;
    if (!playerId) return;
    const engine = getPlayerGame(playerId);
    if (engine) {
      engine.handleBid(playerId, data.action);
    }
  });

  /** 加倍 */
  socket.on(GAME.DOUBLE, (data) => {
    const playerId = socket.data.playerId;
    if (!playerId) return;
    const engine = getPlayerGame(playerId);
    if (engine) {
      engine.handleDouble(playerId, data.action);
    }
  });

  /** 出牌 */
  socket.on(GAME.PLAY, (data) => {
    const playerId = socket.data.playerId;
    if (!playerId) return;
    const engine = getPlayerGame(playerId);
    if (engine) {
      engine.handlePlay(playerId, data.cards);
    }
  });

  /** 不出/过 */
  socket.on(GAME.PASS, (data) => {
    const playerId = socket.data.playerId;
    if (!playerId) return;
    const engine = getPlayerGame(playerId);
    if (engine) {
      engine.handlePass(playerId);
    }
  });

  // ==================== 断线处理 ====================

  socket.on('disconnect', () => {
    const playerId = global.socketPlayers.get(socket.id);
    if (playerId) {
      global.playerSockets.delete(playerId);
      global.socketPlayers.delete(socket.id);
      console.log(`[会话] 玩家 ${playerId} 离线`);
    }
  });

  console.log(`[事件] 已为 socket ${socket.id} 注册所有处理器`);
}
