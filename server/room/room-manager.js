/**
 * 房间管理器
 * 管理所有房间的生命周期：创建、加入、离开、准备、解散
 */

import { v4 as uuidv4 } from 'uuid';
import { ROOM_STATUS, MAX_PLAYERS, ROOM_TIMEOUT } from '../../shared/constants.js';
import { ROOM, GAME } from '../../shared/events.js';
import { GameEngine } from '../game/engine.js';
import * as playerRepo from '../db/player-repo.js';

/**
 * 生成房间码
 * 5位大写字母数字，排除易混淆字符(0/O, 1/I/L)
 */
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function generateRoomCode() {
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
  }
  // 避免生成重复的房间码
  if (global.rooms && global.rooms.has(code)) {
    return generateRoomCode();
  }
  return code;
}

/**
 * 初始化全局房间存储
 */
function ensureRoomStore() {
  if (!global.rooms) {
    global.rooms = new Map(); // roomCode → RoomState
  }
}

/**
 * 创建房间
 * @param {string} playerId - 房主ID
 * @param {string} nickname - 房主昵称
 * @returns {object} 房间状态
 */
export function createRoom(playerId, nickname) {
  ensureRoomStore();

  const roomCode = generateRoomCode();
  const player = playerRepo.findById(playerId);
  const publicPlayer = playerRepo.toPublic(player);

  const room = {
    roomCode,
    hostPlayerId: playerId,
    players: [{
      playerId,
      nickname: nickname || publicPlayer?.nickname || '玩家',
      avatar: publicPlayer?.avatar || 'default',
      gold: publicPlayer?.gold || 1000,
      isReady: false,
      seatIndex: 0,
      isHost: true,
      isConnected: true,
    }],
    status: ROOM_STATUS.WAITING,
    chatMessages: [],
    createdAt: Date.now(),
    gameEngine: null,
  };

  global.rooms.set(roomCode, room);

  console.log(`[房间] ${nickname} 创建了房间 ${roomCode}`);
  return room;
}

/**
 * 加入房间
 * @param {string} roomCode - 房间号
 * @param {string} playerId - 玩家ID
 * @param {string} nickname - 玩家昵称
 * @returns {{ success: boolean, room?: object, error?: string }}
 */
export function joinRoom(roomCode, playerId, nickname) {
  ensureRoomStore();

  const room = global.rooms.get(roomCode);

  if (!room) {
    return { success: false, error: '房间不存在' };
  }

  if (room.status === ROOM_STATUS.PLAYING) {
    return { success: false, error: '游戏已开始，无法加入' };
  }

  if (room.players.length >= MAX_PLAYERS) {
    return { success: false, error: '房间已满' };
  }

  // 检查是否已在房间中
  if (room.players.some((p) => p.playerId === playerId)) {
    return { success: true, room }; // 已在房间中
  }

  const player = playerRepo.findById(playerId);
  const publicPlayer = playerRepo.toPublic(player);

  const newPlayer = {
    playerId,
    nickname: nickname || publicPlayer?.nickname || '玩家',
    avatar: publicPlayer?.avatar || 'default',
    gold: publicPlayer?.gold || 1000,
    isReady: false,
    seatIndex: room.players.length,
    isHost: false,
    isConnected: true,
  };

  room.players.push(newPlayer);

  console.log(`[房间] ${newPlayer.nickname} 加入了房间 ${roomCode}`);

  // 广播玩家加入
  broadcastToRoom(roomCode, ROOM.PLAYER_JOINED, {
    player: {
      playerId: newPlayer.playerId,
      nickname: newPlayer.nickname,
      avatar: newPlayer.avatar,
      gold: newPlayer.gold,
      seatIndex: newPlayer.seatIndex,
      isReady: false,
      isHost: false,
    },
  }, playerId);

  // 发送完整房间状态给加入的玩家
  const socketId = global.playerSockets.get(playerId);
  if (socketId && global.io) {
    global.io.to(socketId).emit(ROOM.STATE, getRoomStateForClient(room));
  }

  return { success: true, room };
}

/**
 * 离开房间
 * @param {string} playerId - 玩家ID
 */
export function leaveRoom(playerId) {
  ensureRoomStore();

  let foundRoomCode = null;
  let foundRoom = null;

  for (const [code, room] of global.rooms) {
    if (room.players.some((p) => p.playerId === playerId)) {
      foundRoomCode = code;
      foundRoom = room;
      break;
    }
  }

  if (!foundRoom) return;

  const leavingPlayer = foundRoom.players.find((p) => p.playerId === playerId);

  // 如果游戏正在进行中，结束游戏
  if (foundRoom.gameEngine && foundRoom.status === ROOM_STATUS.PLAYING) {
    foundRoom.gameEngine.destroy();
    foundRoom.gameEngine = null;
    foundRoom.status = ROOM_STATUS.WAITING;
  }

  // 移除玩家
  foundRoom.players = foundRoom.players.filter((p) => p.playerId !== playerId);

  // 重新分配座位
  foundRoom.players.forEach((p, i) => {
    p.seatIndex = i;
  });

  // 如果房间为空，删除房间
  if (foundRoom.players.length === 0) {
    global.rooms.delete(foundRoomCode);
    console.log(`[房间] 房间 ${foundRoomCode} 已解散（无玩家）`);
    return;
  }

  // 如果房主离开，转让房主
  if (foundRoom.hostPlayerId === playerId) {
    foundRoom.hostPlayerId = foundRoom.players[0].playerId;
    foundRoom.players[0].isHost = true;
  }

  // 广播玩家离开
  broadcastToRoom(foundRoomCode, ROOM.PLAYER_LEFT, {
    playerId,
    nickname: leavingPlayer?.nickname,
    reason: '主动离开',
  });

  // 重置所有玩家的准备状态
  foundRoom.players.forEach((p) => {
    p.isReady = false;
  });

  // 更新房主离开后的状态
  broadcastRoomState(foundRoomCode);
}

/**
 * 切换准备状态
 * @param {string} playerId - 玩家ID
 * @param {boolean} ready - 是否准备
 */
export function toggleReady(playerId, ready) {
  ensureRoomStore();

  for (const [code, room] of global.rooms) {
    const player = room.players.find((p) => p.playerId === playerId);
    if (player) {
      player.isReady = ready;

      // 广播状态更新
      broadcastToRoom(code, ROOM.STATE, getRoomStateForClient(room));

      // 检查是否所有人都准备好了（满3人且都准备了）
      if (room.players.length === MAX_PLAYERS && room.players.every((p) => p.isReady)) {
        startGame(code);
      }
      return;
    }
  }
}

/**
 * 发送聊天消息
 * @param {string} playerId - 玩家ID
 * @param {string} message - 消息内容
 */
export function sendChat(playerId, message) {
  ensureRoomStore();

  for (const [code, room] of global.rooms) {
    const player = room.players.find((p) => p.playerId === playerId);
    if (player) {
      const chatMsg = {
        playerId,
        nickname: player.nickname,
        message,
        timestamp: new Date().toISOString(),
      };
      room.chatMessages.push(chatMsg);
      // 只保留最近50条
      if (room.chatMessages.length > 50) {
        room.chatMessages = room.chatMessages.slice(-50);
      }

      broadcastToRoom(code, ROOM.CHAT_MESSAGE, chatMsg);
      return;
    }
  }
}

/**
 * 快速匹配
 * @param {string} playerId - 玩家ID
 * @param {string} nickname - 玩家昵称
 */
export function quickMatch(playerId, nickname) {
  ensureRoomStore();

  // 找一个等待中的有空位的房间
  for (const [code, room] of global.rooms) {
    if (room.status === ROOM_STATUS.WAITING && room.players.length < MAX_PLAYERS) {
      return joinRoom(code, playerId, nickname);
    }
  }

  // 没有可用房间，创建一个
  const room = createRoom(playerId, nickname);
  const socketId = global.playerSockets.get(playerId);
  if (socketId && global.io) {
    global.io.to(socketId).emit(ROOM.STATE, getRoomStateForClient(room));
  }
  return { success: true, room };
}

/**
 * 开始游戏
 * @param {string} roomCode - 房间号
 */
function startGame(roomCode) {
  const room = global.rooms.get(roomCode);
  if (!room) return;

  room.status = ROOM_STATUS.PLAYING;

  // 广播游戏即将开始
  broadcastToRoom(roomCode, ROOM.GAME_STARTING, { countdown: 3 });

  // 创建游戏引擎并启动
  const gameEngine = new GameEngine(roomCode, room.players);
  room.gameEngine = gameEngine;

  // 3秒后发牌
  setTimeout(() => {
    gameEngine.startDealing();
  }, 3000);

  console.log(`[游戏] 房间 ${roomCode} 游戏开始`);
}

/**
 * 获取当前玩家所在的房间
 * @param {string} playerId
 * @returns {{ roomCode: string, room: object } | null}
 */
export function getPlayerRoom(playerId) {
  ensureRoomStore();
  for (const [code, room] of global.rooms) {
    if (room.players.some((p) => p.playerId === playerId)) {
      return { roomCode: code, room };
    }
  }
  return null;
}

/**
 * 获取当前玩家所在的游戏引擎
 * @param {string} playerId
 * @returns {GameEngine|null}
 */
export function getPlayerGame(playerId) {
  const result = getPlayerRoom(playerId);
  if (result && result.room && result.room.gameEngine) {
    return result.room.gameEngine;
  }
  return null;
}

// ==================== 辅助函数 ====================

/**
 * 获取发送给客户端的房间状态
 */
function getRoomStateForClient(room) {
  return {
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
  };
}

/**
 * 向房间内所有玩家广播（排除指定玩家）
 */
function broadcastToRoom(roomCode, event, data, excludePlayerId = null) {
  const room = global.rooms?.get(roomCode);
  if (!room || !global.io) return;

  for (const p of room.players) {
    if (p.playerId === excludePlayerId) continue;
    const socketId = global.playerSockets.get(p.playerId);
    if (socketId) {
      global.io.to(socketId).emit(event, data);
    }
  }
}

/**
 * 向房间内所有玩家广播完整房间状态
 */
function broadcastRoomState(roomCode) {
  const room = global.rooms?.get(roomCode);
  if (!room) return;

  const state = getRoomStateForClient(room);
  for (const p of room.players) {
    const socketId = global.playerSockets.get(p.playerId);
    if (socketId && global.io) {
      global.io.to(socketId).emit(ROOM.STATE, state);
    }
  }
}

/**
 * 定时清理过期房间
 */
setInterval(() => {
  if (!global.rooms) return;
  const now = Date.now();
  for (const [code, room] of global.rooms) {
    if (room.status !== ROOM_STATUS.PLAYING && now - room.createdAt > ROOM_TIMEOUT) {
      // 通知所有玩家房间已解散
      broadcastToRoom(code, ROOM.DISSOLVED, { reason: '房间超时解散' });
      if (room.gameEngine) {
        room.gameEngine.destroy();
      }
      global.rooms.delete(code);
      console.log(`[房间] 房间 ${code} 超时解散`);
    }
  }
}, 5 * 60 * 1000); // 每5分钟检查一次
