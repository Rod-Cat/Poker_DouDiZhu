/**
 * 启动登录页面
 * 支持账号登录、注册和游客体验三种入口
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth-store.js';
import Button from '../components/common/Button.jsx';
import { useToast } from '../components/common/Toast.jsx';
import '../styles/theme.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, register, guestLogin, isLoggedIn, restore } = useAuthStore();
  const { showToast } = useToast();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);

  // 尝试恢复会话
  useEffect(() => {
    const tryRestore = async () => {
      const restored = await restore();
      if (restored) {
        navigate('/lobby', { replace: true });
      }
    };
    tryRestore();
  }, []);

  // 已登录则跳转大厅
  useEffect(() => {
    if (isLoggedIn) {
      navigate('/lobby', { replace: true });
    }
  }, [isLoggedIn]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      let result;
      if (mode === 'register') {
        if (!nickname.trim()) {
          showToast('请输入昵称', 'error');
          setLoading(false);
          return;
        }
        result = await register(username, password, nickname);
      } else {
        result = await login(username, password);
      }

      if (result.success) {
        showToast(`欢迎, ${result.player.nickname}!`, 'success');
        navigate('/lobby');
      } else {
        showToast(result.error, 'error');
      }
    } catch (err) {
      showToast('网络连接失败，请检查服务器是否启动', 'error');
    }
    setLoading(false);
  };

  const handleGuest = async () => {
    setLoading(true);
    try {
      const result = await guestLogin();
      if (result.success) {
        showToast(`欢迎, ${result.player.nickname}!`, 'success');
        navigate('/lobby');
      } else {
        showToast(result.error, 'error');
      }
    } catch (err) {
      showToast('网络连接失败，请检查服务器是否启动', 'error');
    }
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <div className="page" style={{
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    }}>
      {/* 装饰背景 */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(circle at 30% 50%, rgba(231, 76, 60, 0.08) 0%, transparent 50%), radial-gradient(circle at 70% 50%, rgba(240, 192, 64, 0.08) 0%, transparent 50%)',
      }} />

      {/* 游戏Logo */}
      <div style={{
        textAlign: 'center',
        marginBottom: 32,
        animation: 'fade-in-up 0.8s ease',
        zIndex: 1,
      }}>
        <div style={{
          fontSize: 64,
          marginBottom: 8,
          filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
        }}>🃏</div>
        <h1 style={{
          fontSize: 42,
          color: '#f0c040',
          textShadow: '0 2px 16px rgba(240, 192, 64, 0.4), 0 4px 8px rgba(0,0,0,0.5)',
          fontWeight: 'bold',
          letterSpacing: 12,
        }}>斗 地 主</h1>
        <p style={{
          color: 'rgba(255,255,255,0.5)',
          fontSize: 14,
          marginTop: 8,
          letterSpacing: 4,
        }}>联机休闲对战</p>
      </div>

      {/* 登录表单 */}
      <div className="card-box" style={{
        width: 360,
        maxWidth: '90vw',
        background: 'rgba(255,255,255,0.97)',
        animation: 'fade-in-up 0.6s ease 0.2s both',
        zIndex: 1,
      }}>
        {/* 模式切换 */}
        <div style={{
          display: 'flex',
          marginBottom: 24,
          borderBottom: '2px solid #eee',
        }}>
          <button
            onClick={() => setMode('login')}
            style={{
              flex: 1,
              padding: '10px 0',
              background: 'none',
              border: 'none',
              borderBottom: mode === 'login' ? '3px solid #e74c3c' : '3px solid transparent',
              color: mode === 'login' ? '#e74c3c' : '#999',
              fontSize: 16,
              fontWeight: mode === 'login' ? 'bold' : 'normal',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontFamily: 'inherit',
            }}
          >登录</button>
          <button
            onClick={() => setMode('register')}
            style={{
              flex: 1,
              padding: '10px 0',
              background: 'none',
              border: 'none',
              borderBottom: mode === 'register' ? '3px solid #e74c3c' : '3px solid transparent',
              color: mode === 'register' ? '#e74c3c' : '#999',
              fontSize: 16,
              fontWeight: mode === 'register' ? 'bold' : 'normal',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontFamily: 'inherit',
            }}
          >注册</button>
        </div>

        {/* 表单输入 */}
        <div className="flex-col gap-md">
          <input
            className="input"
            type="text"
            placeholder="用户名"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{ color: '#333' }}
          />
          <input
            className="input"
            type="password"
            placeholder="密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{ color: '#333' }}
          />
          {mode === 'register' && (
            <input
              className="input"
              type="text"
              placeholder="昵称（游戏中显示的名称）"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={12}
              style={{ color: '#333' }}
            />
          )}

          <Button
            variant="primary"
            size="lg"
            block
            disabled={loading}
            onClick={handleSubmit}
          >
            {loading ? '处理中...' : (mode === 'register' ? '注 册' : '登 录')}
          </Button>

          <div style={{ textAlign: 'center' }}>
            <span style={{ color: '#999' }}>或</span>
          </div>

          <Button
            variant="outline"
            size="lg"
            block
            disabled={loading}
            onClick={handleGuest}
            style={{ color: '#333', borderColor: '#ddd' }}
          >
            游客体验
          </Button>
        </div>
      </div>

      {/* 底部版本信息 */}
      <p style={{
        position: 'absolute',
        bottom: 20,
        color: 'rgba(255,255,255,0.25)',
        fontSize: 12,
        zIndex: 1,
      }}>
        v1.0.0 · 局域网联机斗地主
      </p>
    </div>
  );
}
