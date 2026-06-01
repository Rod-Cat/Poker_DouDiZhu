/**
 * 认证服务模块
 * 处理玩家注册、登录、游客登录、会话管理
 */

import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import * as playerRepo from '../db/player-repo.js';

const SALT_ROUNDS = 10;

/**
 * 注册新玩家
 * @param {string} username - 用户名
 * @param {string} password - 密码
 * @param {string} nickname - 昵称
 * @returns {{ success: boolean, player?: object, error?: string }}
 */
export function register(username, password, nickname) {
  // 验证用户名
  if (!username || username.trim().length < 3 || username.trim().length > 20) {
    return { success: false, error: '用户名长度需要3-20个字符' };
  }
  if (!/^[a-zA-Z0-9_一-龥]+$/.test(username.trim())) {
    return { success: false, error: '用户名只能包含中英文、数字和下划线' };
  }

  // 验证密码
  if (!password || password.length < 6) {
    return { success: false, error: '密码至少需要6个字符' };
  }

  // 验证昵称
  if (!nickname || nickname.trim().length < 1 || nickname.trim().length > 12) {
    return { success: false, error: '昵称长度需要1-12个字符' };
  }

  // 检查用户名是否已存在
  const existing = playerRepo.findByUsername(username.trim());
  if (existing) {
    return { success: false, error: '用户名已被注册' };
  }

  // 加密密码
  const hashedPassword = bcrypt.hashSync(password, SALT_ROUNDS);

  // 创建玩家
  const player = playerRepo.createPlayer({
    username: username.trim(),
    password: hashedPassword,
    nickname: nickname.trim(),
  });

  return { success: true, player: playerRepo.toPublic(player) };
}

/**
 * 玩家登录
 * @param {string} username - 用户名
 * @param {string} password - 密码
 * @returns {{ success: boolean, player?: object, token?: string, error?: string }}
 */
export function login(username, password) {
  if (!username || !password) {
    return { success: false, error: '请输入用户名和密码' };
  }

  const player = playerRepo.findByUsername(username.trim());
  if (!player) {
    return { success: false, error: '用户名不存在' };
  }

  if (!bcrypt.compareSync(password, player.password)) {
    return { success: false, error: '密码错误' };
  }

  return { success: true, player: playerRepo.toPublic(player) };
}

/**
 * 游客登录
 * @returns {{ success: boolean, player?: object, token?: string }}
 */
export function guestLogin() {
  const player = playerRepo.createGuestPlayer();
  return { success: true, player: playerRepo.toPublic(player) };
}

/**
 * 生成会话Token
 * @param {string} playerId - 玩家ID
 * @returns {string} token
 */
export function generateToken(playerId) {
  const token = uuidv4();
  global.sessionTokens.set(token, playerId);
  return token;
}

/**
 * 通过Token获取玩家ID
 * @param {string} token - 会话token
 * @returns {string|null} 玩家ID或null
 */
export function getPlayerIdByToken(token) {
  return global.sessionTokens.get(token) || null;
}

/**
 * 移除会话Token
 * @param {string} token - 会话token
 */
export function removeToken(token) {
  global.sessionTokens.delete(token);
}

/**
 * 恢复会话
 * @param {string} playerId - 玩家ID
 * @param {string} token - 会话token
 * @returns {{ success: boolean, player?: object, error?: string }}
 */
export function restoreSession(playerId, token) {
  const storedPlayerId = global.sessionTokens.get(token);
  if (!storedPlayerId || storedPlayerId !== playerId) {
    return { success: false, error: '会话已过期，请重新登录' };
  }

  const player = playerRepo.findById(playerId);
  if (!player) {
    return { success: false, error: '玩家不存在' };
  }

  return { success: true, player: playerRepo.toPublic(player) };
}
