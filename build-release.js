/**
 * 发布打包脚本
 * 创建可直接分发的游戏包
 * 包含: Node.js运行时 + 服务端 + 客户端 + 依赖
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RELEASE_DIR = path.join(__dirname, '斗地主联机版');

// 要复制到发布包的内容
const INCLUDE = [
  // 服务端源码
  'server',
  // 共享模块
  'shared',
  // 客户端构建产物
  'client/dist',
  // 生产依赖
  'node_modules',
  // package.json
  'package.json',
];

// 不需要复制的文件/目录模式
const SKIP_PATTERNS = [
  /node_modules[\\/]\.cache/,
  /node_modules[\\/]\.package-lock/,
  /node_modules[\\/]\.bin/,
  /node_modules[\\/]esbuild/,
  /node_modules[\\/]concurrently/,
  /node_modules[\\/]@esbuild/,
  /\.map$/,
  /\.md$/,
  /LICENSE$/,
  /CHANGELOG/,
  /\.ts$/,
  /\.tsx$/,
  /__tests__/,
  /test$/,
  /tests$/,
  /\.test\./,
  /\.spec\./,
  /examples$/,
  /docs$/,
  /doc$/,
];

function shouldSkip(filePath) {
  return SKIP_PATTERNS.some((pattern) => pattern.test(filePath));
}

function copyDir(src, dest, depth = 0) {
  if (!fs.existsSync(src)) return 0;
  fs.mkdirSync(dest, { recursive: true });

  let count = 0;
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    const relPath = path.relative(__dirname, srcPath);

    // 检查是否应该跳过
    if (shouldSkip(srcPath) || shouldSkip(relPath)) continue;

    if (entry.isDirectory()) {
      count += copyDir(srcPath, destPath, depth + 1);
    } else {
      fs.copyFileSync(srcPath, destPath);
      count++;
    }
  }
  return count;
}

async function buildRelease() {
  console.log('═══════════════════════════════════');
  console.log('  📦 斗地主游戏 - 发布打包');
  console.log('═══════════════════════════════════\n');

  // 清空旧目录
  if (fs.existsSync(RELEASE_DIR)) {
    console.log('[清理] 删除旧的 release 目录...');
    fs.rmSync(RELEASE_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(RELEASE_DIR, { recursive: true });

  // 复制文件
  let totalFiles = 0;
  for (const item of INCLUDE) {
    const srcPath = path.join(__dirname, item);
    const destPath = path.join(RELEASE_DIR, item);

    if (!fs.existsSync(srcPath)) {
      console.log(`  ⚠ 跳过（不存在）: ${item}`);
      continue;
    }

    if (fs.statSync(srcPath).isDirectory()) {
      const count = copyDir(srcPath, destPath);
      console.log(`  ✓ ${item}/ (${count} 个文件)`);
      totalFiles += count;
    } else {
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.copyFileSync(srcPath, destPath);
      console.log(`  ✓ ${item}`);
      totalFiles++;
    }
  }

  // 复制 Node.js 运行时
  console.log('\n[运行时] 复制 Node.js...');
  const nodeDests = [
    { src: path.join(process.env.HOME || '', 'bin', 'node.exe'), label: 'home bin' },
    { src: 'C:/Program Files/Microsoft Visual Studio/2022/Community/MSBuild/Microsoft/VisualStudio/NodeJs/node.exe', label: 'VS2022' },
    { src: 'C:/Program Files/nodejs/node.exe', label: 'system' },
  ];

  let nodeFound = false;
  for (const { src, label } of nodeDests) {
    if (fs.existsSync(src)) {
      const dest = path.join(RELEASE_DIR, 'nodejs', 'node.exe');
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
      console.log(`  ✓ node.exe (${label}): ${(fs.statSync(src).size/1024/1024).toFixed(1)} MB`);
      nodeFound = true;
      break;
    }
  }

  if (!nodeFound) {
    console.log('  ⚠ 未找到 node.exe！');
    console.log('  请手动复制 node.exe 到 release/nodejs/ 目录');
  }

  // 创建启动脚本
  console.log('\n[脚本] 生成启动脚本...');

  const batContent = `@echo off
title 斗地主 - 联机对战

:: switch to bat directory
cd /d "%~dp0"

:: check node.exe exists
if not exist "nodejs\\node.exe" (
    echo.
    echo ================================================
    echo   [X] Error: nodejs\\node.exe not found
    echo   Please keep nodejs folder next to this bat
    echo ================================================
    echo.
    pause
    exit
)

echo.
echo ================================================
echo    斗地主 - 联机对战  v1.0
echo ================================================
echo.
echo   [*] Starting server, please wait...
echo.

:: start server in its own visible window
set NODE_ENV=production
start "Doudizhu Server" /D "%~dp0" nodejs\\node.exe server\\index.js

:: wait for server to start
echo   [*] Waiting for server (5 seconds)...
timeout /t 5 /nobreak >nul

:: check if server is running
curl -s -o NUL http://localhost:3000 2>NUL
if errorlevel 1 (
    echo.
    echo   [!] Still initializing, waiting 5 more seconds...
    timeout /t 5 /nobreak >nul
    curl -s -o NUL http://localhost:3000 2>NUL
    if errorlevel 1 (
        echo.
        echo ================================================
        echo   [X] Server failed to start!
        echo   Check the "Doudizhu Server" window for errors
        echo   Common issues:
        echo   1. Port 3000 is in use by another app
        echo   2. Database corrupted (delete server\\data folder)
        echo ================================================
        echo.
        pause
        exit
    )
)

:: open browser
echo   [*] Opening browser...
start http://localhost:3000

echo.
echo ================================================
echo   [OK] Server started successfully!
echo.
echo   Local URL:  http://localhost:3000
echo   LAN  URL:   see server window above
echo.
echo   Close this window to stop the server
echo ================================================
echo.
pause

:: cleanup server process
taskkill /FI "WINDOWTITLE eq Doudizhu Server" /F >NUL 2>&1`;

  // 转换为 CRLF 换行符（Windows cmd.exe 需要）
  const batContentCRLF = batContent.replace(/\r?\n/g, '\r\n');
  fs.writeFileSync(path.join(RELEASE_DIR, '启动游戏.bat'), batContentCRLF, 'utf-8');
  console.log('  ✓ 启动游戏.bat (CRLF)');

  // 使用说明
  const helpContent = `斗地主 - 联机对战 v1.0
══════════════════════

【主机操作】
1. 双击「启动游戏.bat」启动服务端
2. 浏览器自动打开，登录后创建房间
3. 将屏幕上的局域网地址发给其他玩家

【其他玩家】
1. 在浏览器输入主机分享的地址
2. 登录后输入房间号加入
3. 所有人准备后自动开始

【最低配置】
• Windows 10/11 64位
• 局域网连接
• 现代浏览器 (Chrome/Edge/Firefox)

【文件说明】
• 启动游戏.bat   ← 双击启动
• nodejs/         Node.js 运行环境
• server/         服务端程序
• client/dist/    网页游戏
• node_modules/   依赖库
`;

  fs.writeFileSync(path.join(RELEASE_DIR, '使用说明.txt'), helpContent, 'utf-8');
  console.log('  ✓ 使用说明.txt');

  // 统计
  console.log('\n[统计] 计算包大小...');
  const totalSize = getDirSize(RELEASE_DIR);
  const nodeSize = getDirSize(path.join(RELEASE_DIR, 'nodejs'));
  const modSize = getDirSize(path.join(RELEASE_DIR, 'node_modules'));
  const appSize = totalSize - nodeSize - modSize;

  console.log(`  Node.js 运行时: ${(nodeSize/1024/1024).toFixed(1)} MB`);
  console.log(`  依赖库:         ${(modSize/1024/1024).toFixed(1)} MB`);
  console.log(`  游戏程序:       ${(appSize/1024).toFixed(0)} KB`);
  console.log(`  ───────────────────────`);
  console.log(`  总大小:         ${(totalSize/1024/1024).toFixed(1)} MB`);

  console.log(`\n  共复制 ${totalFiles} 个文件`);
  console.log(`\n═══════════════════════════════════`);
  console.log(`  ✅ 发布包创建完成！`);
  console.log(`  位置: ${RELEASE_DIR}`);
  console.log(`  入口: 启动游戏.bat`);
  console.log(`═══════════════════════════════════`);
}

function getDirSize(dirPath) {
  if (!fs.existsSync(dirPath)) return 0;
  let size = 0;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      size += getDirSize(fullPath);
    } else {
      try { size += fs.statSync(fullPath).size; } catch {}
    }
  }
  return size;
}

buildRelease().catch((err) => {
  console.error('[错误]', err.message);
  process.exit(1);
});
