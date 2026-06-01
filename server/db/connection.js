/**
 * 数据库连接管理
 * 使用 sql.js（纯 JavaScript SQLite 实现，无需原生编译）
 * 支持指定 WASM 文件路径（用于打包发布场景）
 */

import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * 查找 sql.js WASM 文件
 * 按优先级在多个位置搜索
 */
function findWasmFile() {
  const candidates = [
    // 1. 环境变量指定
    process.env.SQL_WASM_PATH,
    // 2. 与启动文件同目录（打包后）
    path.join(process.cwd(), 'sql-wasm.wasm'),
    // 3. 开发环境 node_modules
    path.join(__dirname, '..', '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
    path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
    // 4. 项目根目录
    path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
  ];

  for (const p of candidates) {
    if (p && fs.existsSync(p)) {
      console.log(`[数据库] 找到 WASM: ${p}`);
      return p;
    }
  }
  return null;
}

/**
 * 初始化数据库连接
 * @param {string} dbPath - 数据库文件路径
 * @returns {Promise<object>} 数据库实例 { db, save }
 */
export async function initDatabase(dbPath) {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  console.log(`[数据库] 连接数据库: ${dbPath}`);

  const wasmPath = findWasmFile();
  const sqlConfig = {};
  if (wasmPath) {
    sqlConfig.locateFile = (file) => {
      if (file.endsWith('.wasm')) return wasmPath;
      return file;
    };
  }

  SQL = await initSqlJs(sqlConfig);

  let db;
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
    console.log('[数据库] 已加载现有数据库');
  } else {
    db = new SQL.Database();
    console.log('[数据库] 已创建新数据库');
  }

  db.run('PRAGMA foreign_keys = ON');

  function save() {
    const data = db.export();
    fs.writeFileSync(dbPath, Buffer.from(data));
  }

  return { db, save };
}
