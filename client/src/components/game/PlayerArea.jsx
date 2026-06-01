/**
 * 对手玩家区域组件
 * 显示头像、昵称、剩余牌数、地主标识、回合高亮
 */

import React from 'react';
import Avatar from '../common/Avatar.jsx';
import Card from '../cards/Card.jsx';

export default function PlayerArea({
  playerId,
  info,
  cardsCount,
  isLandlord,
  currentTurnId,
  lastPlayed,
}) {
  const isCurrentTurn = currentTurnId === playerId;
  const nickname = info?.nickname || '玩家';

  return (
    <div style={{
      textAlign: 'center',
      padding: 12,
      borderRadius: 16,
      background: isCurrentTurn
        ? 'rgba(255,215,0,0.12)'
        : 'rgba(0,0,0,0.15)',
      border: isCurrentTurn
        ? '2px solid rgba(255,215,0,0.5)'
        : '2px solid transparent',
      transition: 'all 0.3s ease',
      position: 'relative',
    }}>
      {/* 地主标识 */}
      {isLandlord && (
        <div style={{
          position: 'absolute',
          top: -8,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 20,
          animation: 'crown-bounce 1.5s ease-in-out infinite',
        }}>
          👑
        </div>
      )}

      {/* 头像 */}
      <Avatar nickname={nickname} />

      {/* 昵称 */}
      <div style={{
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
        marginTop: 8,
        textShadow: '0 1px 4px rgba(0,0,0,0.5)',
      }}>
        {nickname}
      </div>

      {/* 剩余手牌数 */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 4,
        marginTop: 8,
      }}>
        {Array.from({ length: Math.min(cardsCount, 20) }, (_, i) => (
          <div key={i} style={{
            width: 14,
            height: 20,
            background: 'linear-gradient(135deg, #1a5276, #2471a3)',
            borderRadius: 2,
            border: '1px solid rgba(255,255,255,0.2)',
          }} />
        ))}
        {cardsCount > 20 && (
          <span style={{ color: '#fff', fontSize: 13, marginLeft: 4 }}>
            +{cardsCount - 20}
          </span>
        )}
      </div>
      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 4 }}>
        {cardsCount} 张
      </div>

      {/* 最近出的牌 */}
      {lastPlayed && (
        <div style={{
          marginTop: 8,
          display: 'flex',
          justifyContent: 'center',
          gap: 2,
          flexWrap: 'wrap',
        }}>
          {lastPlayed.cards.map((c, i) => (
            <Card key={i} card={c} small />
          ))}
        </div>
      )}
    </div>
  );
}
