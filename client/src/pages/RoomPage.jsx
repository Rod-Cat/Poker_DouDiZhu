/**
 * 房间等待页面
 * 显示房间内玩家列表、准备按钮、房间号、聊天
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../stores/auth-store.js';
import { getSocket } from '../services/socket.js';
import { ROOM, GAME } from '@shared/events.js';
import Button from '../components/common/Button.jsx';
import Avatar from '../components/common/Avatar.jsx';
import { useToast } from '../components/common/Toast.jsx';
import '../styles/theme.css';

export default function RoomPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const player = useAuthStore((s) => s.player);
  const { showToast } = useToast();
  const socket = getSocket();

  const [room, setRoom] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [gameStarting, setGameStarting] = useState(false);

  useEffect(() => {
    // 监听房间状态
    const handleRoomState = (state) => {
      setRoom(state);
      // 同步自己的准备状态
      const me = state.players?.find((p) => p.playerId === player.id);
      if (me) setIsReady(me.isReady);
    };

    const handlePlayerJoined = (data) => {
      showToast(`${data.player.nickname} 加入了房间`, 'info');
    };

    const handlePlayerLeft = (data) => {
      showToast(`玩家离开了房间`, 'info');
    };

    const handleChat = (data) => {
      setChatMessages((prev) => [...prev.slice(-49), data]);
    };

    const handleGameStarting = (data) => {
      setGameStarting(true);
      showToast(`游戏即将开始！`, 'success');
      setTimeout(() => {
        navigate(`/game?room=${room?.roomCode || searchParams.get('code')}`);
      }, 2000);
    };

    const handleRoomError = (data) => {
      showToast(data.message || '操作失败', 'error');
    };

    const handleDissolved = (data) => {
      showToast('房间已解散', 'info');
      navigate('/lobby');
    };

    // 监听游戏：发牌
    const handleDeal = () => {
      navigate(`/game?room=${room?.roomCode || searchParams.get('code')}`);
    };

    socket.on(ROOM.STATE, handleRoomState);
    socket.on(ROOM.PLAYER_JOINED, handlePlayerJoined);
    socket.on(ROOM.PLAYER_LEFT, handlePlayerLeft);
    socket.on(ROOM.CHAT_MESSAGE, handleChat);
    socket.on(ROOM.GAME_STARTING, handleGameStarting);
    socket.on(ROOM.ERROR, handleRoomError);
    socket.on(ROOM.DISSOLVED, handleDissolved);
    socket.on(GAME.DEAL, handleDeal);

    return () => {
      socket.off(ROOM.STATE, handleRoomState);
      socket.off(ROOM.PLAYER_JOINED, handlePlayerJoined);
      socket.off(ROOM.PLAYER_LEFT, handlePlayerLeft);
      socket.off(ROOM.CHAT_MESSAGE, handleChat);
      socket.off(ROOM.GAME_STARTING, handleGameStarting);
      socket.off(ROOM.ERROR, handleRoomError);
      socket.off(ROOM.DISSOLVED, handleDissolved);
      socket.off(GAME.DEAL, handleDeal);
    };
  }, [navigate, player.id, socket]);

  const handleReady = () => {
    const newReady = !isReady;
    setIsReady(newReady);
    socket.emit(ROOM.READY, { ready: newReady });
  };

  const handleLeave = () => {
    socket.emit(ROOM.LEAVE, {});
    navigate('/lobby');
  };

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    socket.emit(ROOM.CHAT, { message: chatInput.trim() });
    setChatInput('');
  };

  const handleChatKeyDown = (e) => {
    if (e.key === 'Enter') handleSendChat();
  };

  const roomCode = room?.roomCode || searchParams.get('code') || '------';
  const players = room?.players || [];
  const allReady = players.length === 3 && players.every((p) => p.isReady);
  const isHost = room?.hostPlayerId === player.id;

  return (
    <div className="page" style={{
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    }}>
      {/* 顶部 */}
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
        <div style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
          房间号: <span style={{ color: '#f0c040', letterSpacing: 4, fontSize: 24 }}>{roomCode}</span>
        </div>
        <Button variant="outline" size="sm" onClick={handleLeave}>离开房间</Button>
      </div>

      {/* 玩家区域 */}
      <div style={{
        display: 'flex',
        gap: 24,
        alignItems: 'center',
        zIndex: 1,
      }}>
        {[0, 1, 2].map((slot) => {
          const p = players[slot];
          return (
            <div key={slot} style={{
              width: 180,
              padding: 24,
              borderRadius: 16,
              background: p ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
              border: p ? '2px solid rgba(255,255,255,0.2)' : '2px dashed rgba(255,255,255,0.1)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
            }}>
              {p ? (
                <>
                  <Avatar nickname={p.nickname} />
                  <div style={{ color: '#fff', fontSize: 15, fontWeight: 'bold' }}>{p.nickname}</div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
                    🪙 {p.gold?.toLocaleString()}
                  </div>
                  {p.isHost && (
                    <span style={{
                      color: '#f0c040',
                      fontSize: 11,
                      background: 'rgba(240,192,64,0.2)',
                      padding: '2px 10px',
                      borderRadius: 10,
                    }}>房主</span>
                  )}
                  {p.isReady ? (
                    <span style={{ color: '#27ae60', fontSize: 14, fontWeight: 'bold' }}>
                      ✅ 已准备
                    </span>
                  ) : (
                    <span style={{ color: '#e74c3c', fontSize: 14 }}>
                      ⏳ 等待中
                    </span>
                  )}
                </>
              ) : (
                <>
                  <div style={{
                    width: 64, height: 64, borderRadius: '50%',
                    border: '2px dashed rgba(255,255,255,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'rgba(255,255,255,0.3)', fontSize: 28,
                  }}>?</div>
                  <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>等待加入...</div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* 提示 & 按钮 */}
      <div style={{ marginTop: 32, textAlign: 'center', zIndex: 1 }}>
        {players.length < 3 ? (
          <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>
            等待更多玩家加入...（{players.length}/3）
          </p>
        ) : allReady ? (
          <p style={{ color: '#27ae60', fontWeight: 'bold', fontSize: 18 }}>
            所有玩家已准备，游戏即将开始！
          </p>
        ) : (
          <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>
            请所有玩家准备
          </p>
        )}

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Button
            variant={isReady ? 'outline' : 'primary'}
            size="lg"
            onClick={handleReady}
          >
            {isReady ? '取消准备' : '准 备'}
          </Button>
          {isHost && (
            <Button variant="outline" size="lg" onClick={() => {
              socket.emit(ROOM.LEAVE, {});
              navigate('/lobby');
            }}>
              解散房间
            </Button>
          )}
        </div>
      </div>

      {/* 聊天区域 */}
      <div style={{
        position: 'absolute',
        right: 20,
        bottom: 20,
        width: 260,
        background: 'rgba(0,0,0,0.3)',
        borderRadius: 12,
        padding: 12,
        zIndex: 10,
      }}>
        <div style={{
          height: 150,
          overflowY: 'auto',
          marginBottom: 8,
        }}>
          {chatMessages.map((msg, i) => (
            <div key={i} style={{
              color: 'rgba(255,255,255,0.7)',
              fontSize: 12,
              marginBottom: 4,
              animation: 'slide-in-left 0.2s ease',
            }}>
              <span style={{ color: '#f0c040' }}>{msg.nickname}: </span>
              {msg.message}
            </div>
          ))}
          {chatMessages.length === 0 && (
            <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, textAlign: 'center', marginTop: 50 }}>
              暂无消息
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            className="input"
            type="text"
            placeholder="输入聊天消息..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={handleChatKeyDown}
            maxLength={100}
            style={{ flex: 1, fontSize: 12, padding: '6px 10px' }}
          />
          <Button variant="primary" size="sm" onClick={handleSendChat}>发送</Button>
        </div>
      </div>
    </div>
  );
}
