/**
 * 认证状态管理 (Zustand)
 * 管理玩家登录状态、个人信息、金币
 */

import { create } from 'zustand';
import { sendAuth } from '../services/socket.js';

export const useAuthStore = create((set, get) => ({
  /** @type {object|null} 当前玩家信息 */
  player: null,
  /** @type {string|null} 会话token */
  token: null,
  /** @type {boolean} 是否已登录 */
  isLoggedIn: false,

  /**
   * 注册新账号
   */
  register: async (username, password, nickname) => {
    const result = await sendAuth('auth:register', { username, password, nickname });
    if (result.success) {
      set({
        player: result.player,
        token: result.token,
        isLoggedIn: true,
      });
      // 保存到sessionStorage以便刷新后恢复
      sessionStorage.setItem('poker_playerId', result.player.id);
      sessionStorage.setItem('poker_token', result.token);
    }
    return result;
  },

  /**
   * 账号密码登录
   */
  login: async (username, password) => {
    const result = await sendAuth('auth:login', { username, password });
    if (result.success) {
      set({
        player: result.player,
        token: result.token,
        isLoggedIn: true,
      });
      sessionStorage.setItem('poker_playerId', result.player.id);
      sessionStorage.setItem('poker_token', result.token);
    }
    return result;
  },

  /**
   * 游客登录
   */
  guestLogin: async () => {
    const result = await sendAuth('auth:guest', {});
    if (result.success) {
      set({
        player: result.player,
        token: result.token,
        isLoggedIn: true,
      });
      sessionStorage.setItem('poker_playerId', result.player.id);
      sessionStorage.setItem('poker_token', result.token);
    }
    return result;
  },

  /**
   * 从sessionStorage恢复会话
   */
  restore: async () => {
    const playerId = sessionStorage.getItem('poker_playerId');
    const token = sessionStorage.getItem('poker_token');
    if (!playerId || !token) return false;

    const result = await sendAuth('auth:restore', { playerId, token });
    if (result.success) {
      set({
        player: result.player,
        token,
        isLoggedIn: true,
      });
      return true;
    }
    // 恢复失败，清除存储
    sessionStorage.removeItem('poker_playerId');
    sessionStorage.removeItem('poker_token');
    return false;
  },

  /**
   * 更新金币
   */
  updateGold: (gold, change) => {
    const player = get().player;
    if (player) {
      set({
        player: { ...player, gold },
      });
    }
  },

  /**
   * 退出登录
   */
  logout: () => {
    set({
      player: null,
      token: null,
      isLoggedIn: false,
    });
    sessionStorage.removeItem('poker_playerId');
    sessionStorage.removeItem('poker_token');
  },
}));
