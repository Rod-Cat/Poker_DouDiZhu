/**
 * 个人设置页面
 * 音效/音乐开关、出牌速度、字体大小、账号信息
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth-store.js';
import { useSettingsStore } from '../stores/settings-store.js';
import Button from '../components/common/Button.jsx';
import Avatar from '../components/common/Avatar.jsx';
import '../styles/theme.css';

export default function SettingsPage() {
  const navigate = useNavigate();
  const player = useAuthStore((s) => s.player);
  const logout = useAuthStore((s) => s.logout);
  const settings = useSettingsStore();

  const winRate = player.total_games > 0
    ? Math.round((player.total_wins / player.total_games) * 100)
    : 0;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="page" style={{
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    }}>
      {/* 顶部栏 */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(0,0,0,0.2)',
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button variant="outline" size="sm" onClick={() => navigate('/lobby')}>
            ← 返回
          </Button>
          <span style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>设置</span>
        </div>
      </div>

      {/* 设置内容 */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        width: 420,
        maxWidth: '90vw',
        zIndex: 1,
      }}>
        {/* ===== 账号信息 ===== */}
        <div className="card-box" style={{ background: 'rgba(255,255,255,0.95)' }}>
          <h3 style={{ color: '#333', marginBottom: 16, fontSize: 16 }}>👤 账号信息</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <Avatar nickname={player.nickname} size="lg" />
            <div>
              <div style={{ fontSize: 18, fontWeight: 'bold', color: '#333' }}>{player.nickname}</div>
              <div style={{ color: '#999', fontSize: 13 }}>
                {player.is_guest ? '游客账号' : `@${player.username}`}
              </div>
              <div style={{ color: '#f0c040', fontSize: 14, marginTop: 4 }}>
                🪙 {player.gold?.toLocaleString()} 金币
              </div>
            </div>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-around',
            padding: '12px 0',
            borderTop: '1px solid #eee',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 'bold', color: '#333' }}>{player.total_games || 0}</div>
              <div style={{ color: '#999', fontSize: 12 }}>总局数</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 'bold', color: '#27ae60' }}>{player.total_wins || 0}</div>
              <div style={{ color: '#999', fontSize: 12 }}>胜场</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 'bold', color: '#f39c12' }}>{winRate}%</div>
              <div style={{ color: '#999', fontSize: 12 }}>胜率</div>
            </div>
          </div>
        </div>

        {/* ===== 音效设置 ===== */}
        <div className="card-box" style={{ background: 'rgba(255,255,255,0.95)' }}>
          <h3 style={{ color: '#333', marginBottom: 16, fontSize: 16 }}>🔊 音效设置</h3>
          <ToggleRow label="背景音乐" value={settings.musicEnabled} onChange={settings.toggleMusic} />
          <ToggleRow label="游戏音效" value={settings.soundEnabled} onChange={settings.toggleSound} />
        </div>

        {/* ===== 显示设置 ===== */}
        <div className="card-box" style={{ background: 'rgba(255,255,255,0.95)' }}>
          <h3 style={{ color: '#333', marginBottom: 16, fontSize: 16 }}>🖥 显示设置</h3>
          <SelectRow
            label="出牌速度"
            value={settings.cardSpeed}
            options={[
              { value: 'slow', label: '慢速' },
              { value: 'normal', label: '正常' },
              { value: 'fast', label: '快速' },
            ]}
            onChange={settings.setCardSpeed}
          />
          <SelectRow
            label="字体大小"
            value={settings.fontSize}
            options={[
              { value: 'small', label: '小' },
              { value: 'medium', label: '中' },
              { value: 'large', label: '大' },
            ]}
            onChange={settings.setFontSize}
          />
        </div>

        {/* ===== 操作按钮 ===== */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Button variant="outline" size="lg" block onClick={settings.reset}
            style={{ color: '#666', borderColor: '#ddd', background: 'rgba(255,255,255,0.9)' }}>
            恢复默认设置
          </Button>
          <Button variant="primary" size="lg" block onClick={handleLogout}>
            退出登录
          </Button>
        </div>
      </div>
    </div>
  );
}

/** 开关行组件 */
function ToggleRow({ label, value, onChange }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '10px 0',
    }}>
      <span style={{ color: '#333', fontSize: 15 }}>{label}</span>
      <button
        onClick={onChange}
        style={{
          width: 52,
          height: 28,
          borderRadius: 14,
          border: 'none',
          background: value ? '#27ae60' : '#bdc3c7',
          position: 'relative',
          cursor: 'pointer',
          transition: 'background 0.3s',
        }}
      >
        <div style={{
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: '#fff',
          position: 'absolute',
          top: 3,
          left: value ? 27 : 3,
          transition: 'left 0.3s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }} />
      </button>
    </div>
  );
}

/** 选择行组件 */
function SelectRow({ label, value, options, onChange }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '10px 0',
    }}>
      <span style={{ color: '#333', fontSize: 15 }}>{label}</span>
      <div style={{ display: 'flex', gap: 4 }}>
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              padding: '4px 14px',
              borderRadius: 14,
              border: value === opt.value ? '2px solid #e74c3c' : '2px solid #ddd',
              background: value === opt.value ? 'rgba(231,76,60,0.1)' : 'transparent',
              color: value === opt.value ? '#e74c3c' : '#999',
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.2s',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
