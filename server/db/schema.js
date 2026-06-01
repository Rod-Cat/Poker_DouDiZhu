/**
 * 数据库表结构定义
 * 在服务启动时执行，确保所有表存在
 */

/**
 * 创建所有数据库表
 * @param {object} sqlDb - sql.js 数据库实例 (包含 db 和 save 方法)
 */
export function runSchema(sqlDb) {
  const db = sqlDb.db || sqlDb;
  console.log('[数据库] 开始初始化表结构...');

  // ==================== 玩家表 ====================
  db.run(`
    CREATE TABLE IF NOT EXISTS players (
      id              TEXT PRIMARY KEY,                  -- UUID v4
      username        TEXT UNIQUE,                       -- 用户名（游客为NULL）
      password        TEXT,                              -- bcrypt加密密码（游客为NULL）
      nickname        TEXT NOT NULL,                     -- 显示昵称
      avatar          TEXT NOT NULL DEFAULT 'default',   -- 头像标识
      gold            INTEGER NOT NULL DEFAULT 1000,     -- 当前金币
      is_guest        INTEGER NOT NULL DEFAULT 0,        -- 0=注册用户, 1=游客
      settings        TEXT NOT NULL DEFAULT '{}',        -- 设置JSON
      created_at      TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at      TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      total_games     INTEGER NOT NULL DEFAULT 0,        -- 总局数
      total_wins      INTEGER NOT NULL DEFAULT 0         -- 胜场数
    );
  `);

  // ==================== 对局记录表 ====================
  db.run(`
    CREATE TABLE IF NOT EXISTS game_records (
      id                TEXT PRIMARY KEY,                 -- UUID v4
      room_code         TEXT NOT NULL,                    -- 房间号
      landlord_id       TEXT NOT NULL,                    -- 地主玩家ID
      winner_camp       TEXT NOT NULL,                    -- 获胜阵营: 'landlord' 或 'farmer'
      base_multiplier   INTEGER NOT NULL DEFAULT 1,       -- 基础倍数
      double_multiplier INTEGER NOT NULL DEFAULT 1,       -- 加倍倍数
      bomb_count        INTEGER NOT NULL DEFAULT 0,       -- 炸弹次数
      rocket_count      INTEGER NOT NULL DEFAULT 0,       -- 王炸次数
      final_multiplier  INTEGER NOT NULL,                 -- 最终总倍数
      base_gold         INTEGER NOT NULL DEFAULT 100,     -- 底金
      started_at        TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      ended_at          TEXT
    );
  `);

  // ==================== 玩家对局记录表 ====================
  db.run(`
    CREATE TABLE IF NOT EXISTS game_player_records (
      id              TEXT PRIMARY KEY,                   -- UUID v4
      game_id         TEXT NOT NULL,                      -- 对局ID
      player_id       TEXT NOT NULL,                      -- 玩家ID
      camp            TEXT NOT NULL,                      -- 阵营: 'landlord' 或 'farmer'
      cards_remaining INTEGER NOT NULL DEFAULT 0,         -- 剩余手牌数
      gold_change     INTEGER NOT NULL,                   -- 金币变动（正=赢, 负=输）
      won             INTEGER NOT NULL DEFAULT 0,         -- 0=输, 1=赢
      FOREIGN KEY (game_id) REFERENCES game_records(id),
      FOREIGN KEY (player_id) REFERENCES players(id)
    );
  `);

  // 创建索引
  db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_players_username ON players(username);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_gpr_game ON game_player_records(game_id);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_gpr_player ON game_player_records(player_id);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_game_records_room ON game_records(room_code);`);

  // 保存数据库
  if (sqlDb.save) sqlDb.save();

  console.log('[数据库] 表结构初始化完成');
}
