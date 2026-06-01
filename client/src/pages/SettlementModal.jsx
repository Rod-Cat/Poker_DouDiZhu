/**
 * 结算弹窗页面
 * 显示胜负结果、倍数明细、金币变动
 */

import React from 'react';
import Button from '../components/common/Button.jsx';
import '../styles/animations.css';

export default function SettlementModal({ settlement, playerId, onPlayAgain, onBackToLobby }) {
  const { winnerCamp, winnerPlayerId, settlement: data } = settlement;
  const isWin = winnerCamp === data?.myCamp || winnerPlayerId === playerId;

  // 从 settlement 数据中提取信息
  const myRecord = data?.records?.find((r) => r.playerId === playerId);
  const goldChange = myRecord?.goldChange || data?.goldChange || 0;
  const multiplier = data?.multiplier || settlement.multiplier || 1;

  return (
    <div className="modal-overlay" onClick={() => {}}>
      <div className="modal-content" style={{
        width: 420,
        maxWidth: '95vw',
        textAlign: 'center',
        animation: 'scale-in 0.4s ease',
        background: 'linear-gradient(180deg, #fff 0%, #f8f9fa 100%)',
      }}>
        {/* 胜负横幅 */}
        <div style={{
          marginBottom: 24,
          animation: isWin ? 'victory-glow 2s ease-in-out infinite' : 'none',
        }}>
          <div style={{
            fontSize: isWin ? 64 : 48,
            marginBottom: 8,
          }}>
            {isWin ? '🎉' : '😢'}
          </div>
          <h2 style={{
            color: isWin ? '#f0c040' : '#95a5a6',
            fontSize: 28,
            textShadow: isWin
              ? '0 0 20px rgba(240,192,64,0.5), 0 0 60px rgba(240,192,64,0.3)'
              : 'none',
          }}>
            {isWin ? '胜 利 ！' : '失 败...'}
          </h2>
          <p style={{ color: '#666', fontSize: 14, marginTop: 4 }}>
            {isWin
              ? (winnerCamp === 'landlord' ? '地主阵营获胜' : '农民阵营获胜')
              : (winnerCamp === 'landlord' ? '地主阵营获胜' : '农民阵营获胜')
            }
          </p>
        </div>

        {/* 倍数明细 */}
        <div style={{
          background: 'rgba(0,0,0,0.04)',
          borderRadius: 12,
          padding: 16,
          marginBottom: 20,
          textAlign: 'left',
        }}>
          <h4 style={{ color: '#333', marginBottom: 12, fontSize: 15 }}>倍数明细</h4>
          {data?.breakdown ? (
            <div style={{ fontSize: 14, color: '#555', lineHeight: 2 }}>
              <div>底分：<span style={{ float: 'right', fontWeight: 'bold' }}>{data.breakdown.base || 1}</span></div>
              {data.breakdown.doubleLandlord > 1 && (
                <div>地主加倍：<span style={{ float: 'right', color: '#e74c3c' }}>×{data.breakdown.doubleLandlord}</span></div>
              )}
              {data.breakdown.doubleFarmer > 1 && (
                <div>农民加倍：<span style={{ float: 'right', color: '#e74c3c' }}>×{data.breakdown.doubleFarmer}</span></div>
              )}
              {data.breakdown.bombMultiplier > 1 && (
                <div>炸弹加成：<span style={{ float: 'right', color: '#e67e22' }}>×{data.breakdown.bombMultiplier}</span></div>
              )}
              {data.breakdown.rocketMultiplier > 1 && (
                <div>王炸加成：<span style={{ float: 'right', color: '#e74c3c' }}>×{data.breakdown.rocketMultiplier}</span></div>
              )}
              <div style={{ borderTop: '1px solid #ddd', marginTop: 8, paddingTop: 8 }}>
                总倍数：<span style={{ float: 'right', fontWeight: 'bold', fontSize: 18, color: '#f0c040' }}>
                  ×{multiplier}
                </span>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#999' }}>
              总倍数 ×{multiplier}
            </div>
          )}
        </div>

        {/* 金币变动 */}
        <div style={{
          marginBottom: 24,
          animation: goldChange !== 0 ? 'fade-in-up 0.6s ease 0.3s both' : 'none',
        }}>
          <div style={{
            fontSize: 14,
            color: '#999',
            marginBottom: 4,
          }}>
            金币变动
          </div>
          <div style={{
            fontSize: 36,
            fontWeight: 'bold',
            color: goldChange >= 0 ? '#f0c040' : '#e74c3c',
            textShadow: goldChange >= 0
              ? '0 0 12px rgba(240,192,64,0.4)'
              : '0 0 12px rgba(231,76,60,0.4)',
          }}>
            {goldChange >= 0 ? '+' : ''}{goldChange.toLocaleString()}
          </div>
          <div style={{ fontSize: 20 }}>
            🪙
          </div>
        </div>

        {/* 按钮 */}
        <div style={{
          display: 'flex',
          gap: 12,
          justifyContent: 'center',
        }}>
          <Button variant="primary" size="lg" onClick={onPlayAgain}>
            再来一局
          </Button>
          <Button variant="outline" size="lg" onClick={onBackToLobby}
            style={{ color: '#666', borderColor: '#ddd' }}>
            返回大厅
          </Button>
        </div>
      </div>
    </div>
  );
}
