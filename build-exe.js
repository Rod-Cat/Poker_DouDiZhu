/**
 * EXE 打包脚本 (完整自动化)
 *
 * 输出: 斗地主联机版.exe (单个文件，~31MB)
 *
 * 步骤:
 * 1. PowerShell 压缩整个游戏目录为 ZIP
 * 2. 编译 C# 自解压启动器
 * 3. 将 ZIP 追加到启动器末尾
 * 4. 输出最终的 .exe 文件
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RELEASE_DIR = path.join(__dirname, '斗地主联机版');
const OUTPUT_DIR = path.join(__dirname, 'poker-exe');

console.log('═══════════════════════════════════════');
console.log('  📦 斗地主 EXE 打包');
console.log('═══════════════════════════════════════\n');

// 创建输出目录
try { fs.mkdirSync(OUTPUT_DIR, { recursive: true }); } catch {}

// ==================== 第一步: 压缩游戏文件 ====================

console.log('[1/3] 压缩游戏文件为 ZIP...');
const zipPath = path.join(OUTPUT_DIR, 'game.zip');

try {
  execSync(
    `powershell -Command "Compress-Archive -Path '${RELEASE_DIR}\\*' -DestinationPath '${zipPath}' -CompressionLevel Optimal -Force"`,
    { stdio: 'pipe', maxBuffer: 100 * 1024 * 1024 }
  );
} catch (err) {
  console.error('  压缩失败:', err.message);
  process.exit(1);
}

const zipSizeMB = (fs.statSync(zipPath).size / 1024 / 1024).toFixed(1);
console.log(`  ✓ game.zip (${zipSizeMB} MB)`);

// ==================== 第二步: 编译 C# 启动器 ====================

console.log('\n[2/3] 编译 C# 自解压启动器...');

const launcherCode = `using System;
using System.IO;
using System.IO.Compression;
using System.Diagnostics;
using System.Reflection;
using System.Text;
using System.Threading;

class DoudizhuLauncher {
    [STAThread]
    static void Main() {
        string extractDir = Path.Combine(Path.GetTempPath(), "doudizhu");
        string installedFile = Path.Combine(extractDir, ".installed");
        string marker = "===GAME_ZIP===";

        try {
            string selfPath = Assembly.GetExecutingAssembly().Location;
            byte[] self = File.ReadAllBytes(selfPath);
            byte[] markerBytes = Encoding.ASCII.GetBytes(marker);

            int pos = -1;
            for (int i = self.Length - markerBytes.Length; i >= 0; i--) {
                bool match = true;
                for (int j = 0; j < markerBytes.Length; j++) {
                    if (self[i + j] != markerBytes[j]) { match = false; break; }
                }
                if (match) { pos = i + markerBytes.Length; break; }
            }

            if (pos < 0) {
                ShowError("Cannot find game data. File may be corrupted.");
                return;
            }

            while (pos < self.Length && (self[pos] == 13 || self[pos] == 10)) pos++;

            if (!File.Exists(installedFile)) {
                Console.WriteLine("斗地主 - 联机对战 v1.0");
                Console.WriteLine("================================================");
                Console.WriteLine("[*] First run: extracting game files...");
                Console.WriteLine("");

                string zipPath2 = Path.GetTempFileName() + ".zip";
                using (var fs2 = new FileStream(zipPath2, FileMode.Create)) {
                    fs2.Write(self, pos, self.Length - pos);
                }

                if (Directory.Exists(extractDir)) {
                    try { Directory.Delete(extractDir, true); } catch { }
                }
                ZipFile.ExtractToDirectory(zipPath2, extractDir);
                File.Delete(zipPath2);
                File.WriteAllText(installedFile, DateTime.Now.ToString());

                Console.WriteLine("[OK] Extraction complete!");
                Console.WriteLine("");
            } else {
                Console.WriteLine("[*] Game already installed, starting...");
            }

            string nodeExe = Path.Combine(extractDir, "nodejs", "node.exe");
            string serverJs = Path.Combine(extractDir, "server", "index.js");
            if (!File.Exists(nodeExe) || !File.Exists(serverJs)) {
                ShowError("Game files incomplete. Please delete\\n" + extractDir + "\\nand try again.");
                return;
            }

            Environment.SetEnvironmentVariable("NODE_ENV", "production");

            Console.WriteLine("[*] Starting game server...");
            var proc = new Process();
            proc.StartInfo.FileName = nodeExe;
            proc.StartInfo.Arguments = "\\"" + serverJs + "\\"";
            proc.StartInfo.WorkingDirectory = extractDir;
            proc.StartInfo.UseShellExecute = true;
            proc.StartInfo.WindowStyle = ProcessWindowStyle.Minimized;
            proc.Start();

            Console.WriteLine("[*] Waiting for server to initialize (4s)...");
            Thread.Sleep(4000);

            Console.WriteLine("[*] Opening browser...");
            Process.Start("http://localhost:3000");

            Console.WriteLine("");
            Console.WriteLine("================================================");
            Console.WriteLine("  Game started!");
            Console.WriteLine("  Local:  http://localhost:3000");
            Console.WriteLine("");
            Console.WriteLine("  You can close this window.");
            Console.WriteLine("  Next run starts instantly.");
            Console.WriteLine("================================================");
            Console.WriteLine("");
            Console.WriteLine("Press any key to close...");
            Console.ReadKey();

        } catch (Exception ex) {
            ShowError("Error: " + ex.Message + "\\n\\n" + ex.StackTrace);
        }
    }

    static void ShowError(string msg) {
        Console.WriteLine("");
        Console.WriteLine("================================================");
        Console.WriteLine("  [X] " + msg);
        Console.WriteLine("================================================");
        Console.WriteLine("");
        Console.WriteLine("Press any key to exit...");
        Console.ReadKey();
    }
}
`;

const launcherPath = path.join(OUTPUT_DIR, 'launcher.cs');
fs.writeFileSync(launcherPath, launcherCode, 'utf-8');

// 查找 C# 编译器
const cscPaths = [
  'C:/Windows/Microsoft.NET/Framework64/v4.0.30319/csc.exe',
  'C:/Windows/Microsoft.NET/Framework/v4.0.30319/csc.exe',
];
let csc = null;
for (const p of cscPaths) {
  if (fs.existsSync(p)) { csc = p; break; }
}
if (!csc) {
  console.error('  找不到 C# 编译器 (csc.exe)！');
  process.exit(1);
}

try {
  execSync(
    `"${csc}" /target:exe /out:"${path.join(OUTPUT_DIR, 'launcher.exe')}" /reference:System.IO.Compression.FileSystem.dll "${launcherPath}"`,
    { stdio: 'pipe', timeout: 30000 }
  );
} catch (err) {
  console.error('  编译失败:', err.stderr?.toString() || err.message);
  process.exit(1);
}
console.log('  ✓ launcher.exe (7.5 KB)');

// ==================== 第三步: 组装最终 EXE ====================

console.log('\n[3/3] 生成最终 EXE...');

const launcherData = fs.readFileSync(path.join(OUTPUT_DIR, 'launcher.exe'));
const zipData = fs.readFileSync(zipPath);
const marker = Buffer.from('\r\n===GAME_ZIP===\r\n', 'ascii');
const finalExe = Buffer.concat([launcherData, marker, zipData]);

const outputPath = path.join(OUTPUT_DIR, '斗地主联机版.exe');
fs.writeFileSync(outputPath, finalExe);

// 验证
const verify = fs.readFileSync(outputPath);
const searchMarker = Buffer.from('===GAME_ZIP===');
const markerPos = verify.lastIndexOf(searchMarker);
let after = markerPos + searchMarker.length;
while (after < verify.length && (verify[after] === 13 || verify[after] === 10)) after++;
const validZip = verify.slice(after, after + 2).toString() === 'PK';

// 清理临时文件
fs.unlinkSync(launcherPath);
fs.unlinkSync(path.join(OUTPUT_DIR, 'launcher.exe'));
fs.unlinkSync(zipPath);

const sizeMB = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(1);
console.log(`  ✓ 斗地主联机版.exe (${sizeMB} MB)`);
console.log(`  ZIP 头验证: ${validZip ? '✅' : '❌'}`);

console.log('\n═══════════════════════════════════════');
console.log('  ✅ EXE 打包完成！');
console.log(`  文件: ${outputPath}`);
console.log(`  大小: ${sizeMB} MB`);
console.log('');
console.log('  分享: 只需发送这一个文件！');
console.log('  使用: 双击运行，首次自动安装');
console.log('═══════════════════════════════════════');
