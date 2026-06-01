/**
 * 房间状态管理 (Zustand)
 * 管理房间信息、玩家列表、聊天消息
 */

import { create } from 'zustand';
import { emit } from '../services/socket.js';

export const useRoomStore = create((set, get) => ({
  /** @type {string|null} 房间号 */
  roomCode: null,
  /** @type {Array} 房间内玩家列表 */
  players: [],
  /** @type {string|null} 房主ID */
  hostPlayerId: null,
  /** @type {boolean} 自己是否已准备 */
  isReady: false,
  /** @type {Array} 聊天消息 */
  chatMessages: [],
  /** @type {string} 房间状态: waiting | ready | playing */
  status: 'waiting',

  /** 设置完整房间状态 */
  setRoomState: (state) => {
    set({
      roomCode: state.roomCode,
      players: state.players || [],
      hostPlayerId: state.hostPlayerId,
      status: state.status || 'waiting',
    });
  },

  /** 添加玩家 */
  addPlayer: (player) => {
    set((state) => ({
      players: [...state.players, player],
    }));
  },

  /** 移除玩家 */
  removePlayer: (playerId) => {
    set((state) => ({
      players: state.players.filter((p) => p.playerId !== playerId),
    }));
  },

  /** 更新玩家准备状态 */
  updatePlayerReady: (playerId, ready) => {
    set((state) => ({
      players: state.players.map((p) =>
        p.playerId === playerId ? { ...p, isReady: ready } : p
      ),
    }));
  },

  /** 添加聊天消息 */
  addChatMessage: (msg) => {
    set((state) => ({
      chatMessages: [...state.chatMessages.slice(-49), msg],
    }));
  },

  /** 清除房间状态 */
  clearRoom: () => {
    set({
      roomCode: null,
      players: [],
      hostPlayerId: null,
      isReady: false,
      chatMessages: [],
      status: 'waiting',
    });
  },

  // ==================== 操作方法 ====================

  /** 创建房间 */
  createRoom: () => {
    emit('room:create', {});
  },

  /** 加入房间 */
  joinRoom: (roomCode) => {
    emit('room:join', { roomCode });
  },

  /** 离开房间 */
  leaveRoom: () => {
    emit('room:leave', {});
    get().clearRoom();
  },

  /** 切换准备状态 */
  toggleReady: () => {
    const newReady = !get().isReady;
    set({ isReady: newReady });
    emit('room:ready', { ready: newReady });
  },

  /** 发送聊天消息 */
  sendChat: (message) => {
    emit('room:chat', { message });
  },

  /** 快速匹配 */
  quickMatch: () => {
    emit('room:quick_match', {});
  },
}));
