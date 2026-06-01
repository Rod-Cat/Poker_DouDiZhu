/**
 * SFX 自解压打包脚本
 *
 * 生成自解压的 .bat 文件，包含完整游戏
 * 原理：BAT提取器 + 二进制ZIP数据追加
 * 双击后自动解压并运行游戏
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RELEASE_DIR = path.join(__dirname, '斗地主联机版');
const OUTPUT_DIR = path.join(__dirname, 'poker-exe');

console.log('═══════════════════════════════════════');
console.log('  📦 斗地主 - SFX 自解压打包');
console.log('═══════════════════════════════════════\n');

// 创建输出目录（如果已存在则跳过清理）
try {
  if (fs.existsSync(OUTPUT_DIR)) {
    fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
  }
} catch (e) {
  console.log('  (无法清理旧目录，将使用新目录)');
}
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// ==================== 第一步：创建 ZIP ====================

console.log('[1/3] 使用 PowerShell 压缩游戏文件...');
const zipPath = path.join(OUTPUT_DIR, 'game.zip');

try {
  execSync(
    `powershell -Command "Compress-Archive -Path '${RELEASE_DIR}\\*' -DestinationPath '${zipPath}' -CompressionLevel Optimal -Force"`,
    { stdio: 'pipe', maxBuffer: 100 * 1024 * 1024 }
  );
  console.log(`  ✓ game.zip (${(fs.statSync(zipPath).size / 1024 / 1024).toFixed(1)} MB)`);
} catch (err) {
  console.error('  PowerShell 压缩失败，尝试无压缩模式...');
  try {
    execSync(
      `powershell -Command "Compress-Archive -Path '${RELEASE_DIR}\\*' -DestinationPath '${zipPath}' -CompressionLevel NoCompression -Force"`,
      { stdio: 'pipe', maxBuffer: 100 * 1024 * 1024 }
    );
  } catch (err2) {
    console.error('  压缩完全失败:', err2.message);
    process.exit(1);
  }
}

// ==================== 第二步：生成 SFX .bat ====================

console.log('\n[2/3] 生成自解压启动器...');

// 提取脚本 - 使用 PowerShell 从自身提取 ZIP
const extractorScript = `@echo off
setlocal enabledelayedexpansion
title 斗地主 - 联机对战

set "GAME_DIR=%TEMP%\\doudizhu"
set "MARKER=%GAME_DIR%\\.installed"

:: 已解压则直接运行
if exist "%MARKER%" goto run

echo.
echo ================================================
echo    斗地主 - 联机对战  v1.0
echo ================================================
echo.
echo    [*] 首次运行，正在安装（约1分钟）...
echo.

:: 使用 PowerShell 从自身提取 ZIP 数据
powershell -Command ^
"$self = [System.IO.File]::ReadAllBytes('%0'); ^
$marker = [System.Text.Encoding]::ASCII.GetBytes('===GAME_ZIP==='); ^
$pos = -1; ^
for ($i = $self.Length - $marker.Length; $i -ge 0; $i--) { ^
  $match = $true; ^
  for ($j = 0; $j -lt $marker.Length; $j++) { ^
    if ($self[$i+$j] -ne $marker[$j]) { $match = $false; break } ^
  } ^
  if ($match) { $pos = $i + $marker.Length; break } ^
} ^
if ($pos -gt 0) { ^
  while ($pos -lt $self.Length -and ($self[$pos] -eq 13 -or $self[$pos] -eq 10)) { $pos++ } ^
  $zipData = $self[$pos..($self.Length-1)]; ^
  $zipFile = [System.IO.Path]::GetTempFileName() + '.zip'; ^
  [System.IO.File]::WriteAllBytes($zipFile, $zipData); ^
  Write-Host '    [*] 正在解压游戏文件...'; ^
  if (Test-Path $env:TEMP\\doudizhu) { Remove-Item $env:TEMP\\doudizhu -Recurse -Force }; ^
  Expand-Archive -Path $zipFile -DestinationPath $env:TEMP\\doudizhu -Force; ^
  Remove-Item $zipFile; ^
  if (Test-Path $env:TEMP\\doudizhu\\启动游戏.bat) { ^
    '' ^| Out-File -FilePath '%MARKER%' -Encoding UTF8; ^
    Write-Host '    [OK] 安装完成！'; ^
  } ^
} else { ^
  Write-Host '    [X] 提取失败：找不到游戏数据'; ^
  exit 1 ^
}"

if not exist "%MARKER%" (
    echo.
    echo ================================================
    echo   [X] 安装失败，请检查：
    echo   1. 磁盘空间是否足够（需要约200MB）
    echo   2. 是否被杀毒软件拦截
    echo   3. 尝试右键 - 以管理员身份运行
    echo ================================================
    echo.
    pause
    exit /b 1
)

echo.
echo    [*] 安装完成，正在启动游戏...
echo.

:run
:: 启动服务端
cd /d "%GAME_DIR%"
set NODE_ENV=production
start "Doudizhu Server" "%GAME_DIR%\\nodejs\\node.exe" "%GAME_DIR%\\server\\index.js"

:: 等待启动
timeout /t 4 /nobreak >nul

:: 打开浏览器
start http://localhost:3000

echo.
echo ================================================
echo   [OK] 游戏已启动！
echo.
echo   下次直接双击本文件即可快速启动
echo ================================================
timeout /t 2 /nobreak >nul
exit /b 0
===GAME_ZIP===
`;

// ==================== 第三步：组装最终文件 ====================

console.log('\n[3/3] 组装最终文件...');

const zipData = fs.readFileSync(zipPath);
const extractorBuffer = Buffer.from(extractorScript, 'utf-8');

// 拼接：提取器 + ZIP 数据
const finalBuffer = Buffer.concat([extractorBuffer, zipData]);

// 写入 bat
const outputPath = path.join(OUTPUT_DIR, '斗地主联机版.bat');
fs.writeFileSync(outputPath, finalBuffer);
const finalSizeMB = (finalBuffer.length / 1024 / 1024).toFixed(1);

console.log(`  ✓ 斗地主联机版.bat (${finalSizeMB} MB)`);

// 生成说明
fs.writeFileSync(path.join(OUTPUT_DIR, '使用说明.txt'),
`斗地主 - 联机对战 v1.0
══════════════════════════

【使用方法】
双击 "斗地主联机版.bat" 启动游戏

【首次运行】
自动解压安装，约需30-60秒
之后每次启动秒开

【分享】
仅需发送这一个文件给朋友！

【文件大小】
约 ${finalSizeMB} MB

【最低配置】
- Windows 10/11 64位
- 局域网连接
- 浏览器 Chrome/Edge
`, 'utf-8');

console.log('\n═══════════════════════════════════════');
console.log('  ✅ SFX 打包完成！');
console.log(`  文件: ${outputPath}`);
console.log(`  大小: ${finalSizeMB} MB`);
console.log('  只需分享这一个文件！');
console.log('═══════════════════════════════════════');
