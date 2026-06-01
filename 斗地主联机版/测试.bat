@echo off
echo ================================================
echo   斗地主 - 联机对战 v1.0
echo ================================================
echo.
echo   如果你看到这个窗口，说明bat可以正常运行。
echo   请检查 nodejs\node.exe 是否存在...
echo.
if exist "nodejs\node.exe" (
    echo   [OK] node.exe 存在
    nodejs\node.exe -e "console.log('Node.js 版本: ' + process.version)"
) else (
    echo   [X] node.exe 不存在！
    dir nodejs\ 2>/dev/null
)
echo.
pause
