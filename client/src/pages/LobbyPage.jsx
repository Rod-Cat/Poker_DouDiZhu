/**
 * 游戏大厅页面
 * 快速匹配、创建房间、加入房间、金币展示
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth-store.js';
import { useRoomStore } from '../stores/room-store.js';
import { getSocket } from '../services/socket.js';
import { ROOM } from '@shared/events.js';
import Button from '../components/common/Button.jsx';
import Avatar from '../components/common/Avatar.jsx';
import { useToast } from '../components/common/Toast.jsx';
import '../styles/theme.css';
import '../styles/animations.css';

export default function LobbyPage() {
  const navigate = useNavigate();
  const player = useAuthStore((s) => s.player);
  const logout = useAuthStore((s) => s.logout);
  const { showToast } = useToast();
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);

  const socket = getSocket();

  // 监听房间创建成功 -> 跳转到房间页
  useEffect(() => {
    const handleRoomState = (state) => {
      if (state && state.roomCode) {
        navigate(`/room?code=${state.roomCode}`);
      }
    };
    const handleRoomError = (data) => {
      showToast(data.message || '操作失败', 'error');
      setLoading(false);
    };

    socket.on(ROOM.STATE, handleRoomState);
    socket.on(ROOM.ERROR, handleRoomError);

    return () => {
      socket.off(ROOM.STATE, handleRoomState);
      socket.off(ROOM.ERROR, handleRoomError);
    };
  }, [navigate, socket]);

  const handleCreateRoom = () => {
    setLoading(true);
    socket.emit(ROOM.CREATE, {});
  };

  const handleJoinRoom = () => {
    if (!joinCode.trim()) {
      showToast('请输入房间号', 'error');
      return;
    }
    setLoading(true);
    socket.emit(ROOM.JOIN, { roomCode: joinCode.trim().toUpperCase() });
  };

  const handleQuickMatch = () => {
    setLoading(true);
    socket.emit(ROOM.QUICK_MATCH, {});
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!player) return null;

  return (
    <div className="page" style={{
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    }}>
      {/* 顶部栏 */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(0,0,0,0.2)',
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar nickname={player.nickname} />
          <div>
            <div style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>{player.nickname}</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
              {player.is_guest ? '游客账号' : player.username}
            </div>
          </div>
        </div>

        {/* 金币展示 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(240,192,64,0.15)',
          border: '1px solid rgba(240,192,64,0.3)',
          borderRadius: 20,
          padding: '8px 20px',
        }}>
          <span style={{ fontSize: 20 }}>🪙</span>
          <span style={{ color: '#f0c040', fontSize: 18, fontWeight: 'bold' }}>
            {player.gold?.toLocaleString()}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="outline" size="sm" onClick={() => navigate('/settings')}>
            ⚙ 设置
          </Button>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            退出
          </Button>
        </div>
      </div>

      {/* 中央内容 */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20,
        zIndex: 1,
      }}>
        {/* Logo */}
        <div style={{ fontSize: 80, marginBottom: 8 }}>🃏</div>
        <h2 style={{
          color: '#f0c040',
          fontSize: 32,
          letterSpacing: 8,
          textShadow: '0 2px 12px rgba(240,192,64,0.3)',
        }}>斗 地 主</h2>

        {/* 操作按钮 */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          width: 300,
          marginTop: 12,
        }}>
          <Button variant="primary" size="lg" block onClick={handleQuickMatch} disabled={loading}>
            ⚡ 快速匹配
          </Button>

          <Button variant="success" size="lg" block onClick={handleCreateRoom} disabled={loading}>
            🏠 创建房间
          </Button>

          <div style={{
            display: 'flex',
            gap: 8,
            background: 'rgba(255,255,255,0.05)',
            borderRadius: 12,
            padding: 8,
          }}>
            <input
              className="input"
              type="text"
              placeholder="输入房间号"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
              style={{ flex: 1 }}
            />
            <Button variant="warning" onClick={handleJoinRoom} disabled={loading || !joinCode.trim()}>
              加入
            </Button>
          </div>
        </div>

        {/* 提示信息 */}
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 8 }}>
          创建房间后，将房间号分享给好友即可加入
        </p>
      </div>

      {/* 底部装饰 */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 120,
        background: 'linear-gradient(to top, rgba(0,0,0,0.3), transparent)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>
          需要3名玩家才能开始对局
        </p>
      </div>
    </div>
  );
}
