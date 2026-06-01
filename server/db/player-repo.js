/**
 * 玩家数据访问层
 * 封装所有 players 表的CRUD操作
 * 适配 sql.js API（与 better-sqlite3 略有不同）
 */

import { v4 as uuidv4 } from 'uuid';

/** 获取数据库实例 */
function getDb() {
  return global.db.db || global.db;
}

/** 保存数据库到文件 */
function saveDb() {
  if (global.db.save) {
    global.db.save();
  }
}

/**
 * 根据ID查找玩家
 * @param {string} id - 玩家ID
 * @returns {object|undefined} 玩家对象
 */
export function findById(id) {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM players WHERE id = ?');
  stmt.bind([id]);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return undefined;
}

/**
 * 根据用户名查找玩家
 * @param {string} username - 用户名
 * @returns {object|undefined} 玩家对象
 */
export function findByUsername(username) {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM players WHERE username = ?');
  stmt.bind([username]);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return undefined;
}

/**
 * 创建新玩家（注册用户）
 * @param {object} params
 * @returns {object} 创建的玩家对象
 */
export function createPlayer({ username, password, nickname }) {
  const db = getDb();
  const id = uuidv4();
  db.run(
    'INSERT INTO players (id, username, password, nickname, is_guest, gold) VALUES (?, ?, ?, ?, 0, 1000)',
    [id, username, password, nickname]
  );
  saveDb();
  return findById(id);
}

/**
 * 创建游客玩家
 * @returns {object} 创建的玩家对象
 */
export function createGuestPlayer() {
  const db = getDb();
  const id = uuidv4();
  const guestNum = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  const nickname = `游客${guestNum}`;
  db.run(
    'INSERT INTO players (id, username, password, nickname, is_guest, gold) VALUES (?, NULL, NULL, ?, 1, 1000)',
    [id, nickname]
  );
  saveDb();
  return findById(id);
}

/**
 * 更新玩家金币
 * @param {string} id - 玩家ID
 * @param {number} delta - 金币变动（正数加，负数减）
 * @returns {object} 更新后的玩家对象
 */
export function updateGold(id, delta) {
  const db = getDb();
  db.run(
    "UPDATE players SET gold = gold + ?, updated_at = datetime('now', 'localtime') WHERE id = ?",
    [delta, id]
  );
  saveDb();
  return findById(id);
}

/**
 * 更新玩家设置
 * @param {string} id - 玩家ID
 * @param {object} settings - 设置对象
 */
export function updateSettings(id, settings) {
  const db = getDb();
  db.run(
    "UPDATE players SET settings = ?, updated_at = datetime('now', 'localtime') WHERE id = ?",
    [JSON.stringify(settings), id]
  );
  saveDb();
}

/**
 * 更新玩家昵称
 * @param {string} id - 玩家ID
 * @param {string} nickname - 新昵称
 */
export function updateNickname(id, nickname) {
  const db = getDb();
  db.run(
    "UPDATE players SET nickname = ?, updated_at = datetime('now', 'localtime') WHERE id = ?",
    [nickname, id]
  );
  saveDb();
}

/**
 * 更新玩家战绩
 * @param {string} id - 玩家ID
 * @param {boolean} won - 是否获胜
 */
export function updateStats(id, won) {
  const db = getDb();
  db.run(
    "UPDATE players SET total_games = total_games + 1, total_wins = total_wins + ?, updated_at = datetime('now', 'localtime') WHERE id = ?",
    [won ? 1 : 0, id]
  );
  saveDb();
}

/**
 * 获取玩家公开信息（不包含密码等敏感字段）
 * @param {object} player - 数据库玩家对象
 * @returns {object} 公开的玩家信息
 */
export function toPublic(player) {
  if (!player) return null;
  return {
    id: player.id,
    username: player.username,
    nickname: player.nickname,
    avatar: player.avatar,
    gold: player.gold,
    is_guest: !!player.is_guest,
    total_games: player.total_games || 0,
    total_wins: player.total_wins || 0,
    settings: safeParseJSON(player.settings, {}),
    created_at: player.created_at,
  };
}

/**
 * 安全解析JSON
 */
function safeParseJSON(str, fallback) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}
