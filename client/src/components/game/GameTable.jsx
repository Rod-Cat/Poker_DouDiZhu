/**
 * 游戏桌面主组件
 * 绿色桌面背景、三玩家布局、手牌区、底牌区、操作栏
 */

import React from 'react';
import Card from '../cards/Card.jsx';
import CardHand from '../cards/CardHand.jsx';
import PlayerArea from './PlayerArea.jsx';
import ActionBar from './ActionBar.jsx';
import '../../styles/animations.css';

export default function GameTable({
  phase,
  hand,
  bottomCards,
  landlordId,
  currentTurnId,
  multiplier,
  multiplierBreakdown,
  lastPlayed,
  playerCardsCount,
  playerInfo,
  playerId,
  isMyTurn,
  freePlay,
  turnTimeout,
  selectedIndices,
  onToggleCard,
  onBid,
  onDouble,
  onPlayCards,
  onPass,
}) {
  // 获取其他玩家信息
  const otherPlayers = Object.entries(playerInfo || {})
    .filter(([id]) => id !== playerId)
    .sort((a, b) => a[0].localeCompare(b[0]));

  // 自身在底部的布局中，上方左右各一个玩家
  const leftPlayer = otherPlayers[0];
  const rightPlayer = otherPlayers[1];

  const isMyLandlord = landlordId === playerId;

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'radial-gradient(ellipse at center, #2d6a2d 0%, #1a5c2a 40%, #14521f 80%, #0d3b1a 100%)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* 桌面纹理 */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
        pointerEvents: 'none',
      }} />

      {/* ==================== 上方区域：左右两个对手 ==================== */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: '16px 40px',
        height: '30%',
        position: 'relative',
        zIndex: 2,
      }}>
        {/* 左侧玩家 */}
        <div style={{ width: 240 }}>
          {leftPlayer ? (
            <PlayerArea
              playerId={leftPlayer[0]}
              info={leftPlayer[1]}
              cardsCount={playerCardsCount[leftPlayer[0]] || 0}
              isLandlord={landlordId === leftPlayer[0]}
              currentTurnId={currentTurnId}
              lastPlayed={lastPlayed?.playerId === leftPlayer[0] ? lastPlayed : null}
            />
          ) : (
            <EmptySeat />
          )}
        </div>

        {/* 中央：底牌 + 倍数 + 阶段提示 */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
        }}>
          {/* 底牌区域 */}
          <div style={{
            display: 'flex',
            gap: 6,
            padding: '8px 16px',
            background: 'rgba(0,0,0,0.2)',
            borderRadius: 12,
            minHeight: 60,
            alignItems: 'center',
          }}>
            {bottomCards.length > 0 ? (
              bottomCards.map((card, i) => (
                <Card key={i} card={card} small />
              ))
            ) : (
              <>
                {/* 未揭示的底牌 */}
                {[0, 1, 2].map((i) => (
                  <Card key={i} card={null} faceDown small />
                ))}
              </>
            )}
          </div>

          {/* 倍数显示 */}
          {multiplier > 1 && (
            <div style={{
              background: 'rgba(240,192,64,0.15)',
              border: '1px solid rgba(240,192,64,0.4)',
              borderRadius: 16,
              padding: '4px 16px',
              color: '#f0c040',
              fontSize: 14,
              fontWeight: 'bold',
            }}>
              ×{multiplier}
            </div>
          )}

          {/* 阶段提示 */}
          {phase !== 'playing' && (
            <PhaseIndicator phase={phase} />
          )}
        </div>

        {/* 右侧玩家 */}
        <div style={{ width: 240 }}>
          {rightPlayer ? (
            <PlayerArea
              playerId={rightPlayer[0]}
              info={rightPlayer[1]}
              cardsCount={playerCardsCount[rightPlayer[0]] || 0}
              isLandlord={landlordId === rightPlayer[0]}
              currentTurnId={currentTurnId}
              lastPlayed={lastPlayed?.playerId === rightPlayer[0] ? lastPlayed : null}
            />
          ) : (
            <EmptySeat />
          )}
        </div>
      </div>

      {/* ==================== 中央出牌展示区 ==================== */}
      <div style={{
        position: 'absolute',
        top: '33%',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 20,
        zIndex: 3,
      }}>
        {/* 左侧玩家出的牌 */}
        {leftPlayer && lastPlayed?.playerId === leftPlayer[0] && (
          <div style={{ position: 'absolute', left: -240, display: 'flex', gap: 4 }}>
            {lastPlayed.cards.map((c, i) => (
              <Card key={i} card={c} small />
            ))}
          </div>
        )}

        {/* 当前轮到自己且上一手不是自己出的牌（或自由出牌）*/}
        {isMyTurn && lastPlayed && lastPlayed.playerId !== playerId && !freePlay && (
          <div style={{
            display: 'flex',
            gap: 4,
            padding: '8px 16px',
            background: 'rgba(255,255,255,0.08)',
            borderRadius: 10,
            border: '2px dashed rgba(255,255,255,0.2)',
          }}>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
              需要大过 {lastPlayed.comboType ? getComboName(lastPlayed.comboType) : '此牌型'}
            </span>
          </div>
        )}

        {/* 右侧玩家出的牌 */}
        {rightPlayer && lastPlayed?.playerId === rightPlayer[0] && (
          <div style={{ position: 'absolute', right: -240, display: 'flex', gap: 4 }}>
            {lastPlayed.cards.map((c, i) => (
              <Card key={i} card={c} small />
            ))}
          </div>
        )}
      </div>

      {/* ==================== 底部：自己的手牌 + 操作按钮 ==================== */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '0 20px 12px 20px',
        zIndex: 2,
      }}>
        {/* 自己的标识 */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 20,
          marginBottom: 4,
        }}>
          {isMyLandlord && (
            <span style={{
              color: '#f0c040',
              fontSize: 14,
              fontWeight: 'bold',
              background: 'rgba(240,192,64,0.2)',
              padding: '2px 12px',
              borderRadius: 10,
              animation: 'crown-bounce 1.5s ease-in-out infinite',
            }}>
              👑 地主
            </span>
          )}
          {isMyTurn && (
            <span style={{
              color: '#27ae60',
              fontSize: 13,
              background: 'rgba(39,174,96,0.2)',
              padding: '2px 12px',
              borderRadius: 10,
            }}>
              轮到你了
            </span>
          )}
        </div>

        {/* 手牌 */}
        <CardHand
          cards={hand}
          selectedIndices={selectedIndices}
          onToggleCard={onToggleCard}
          isMyTurn={isMyTurn && phase === 'playing'}
          freePlay={freePlay}
        />

        {/* 操作按钮 */}
        <ActionBar
          phase={phase}
          isMyTurn={isMyTurn}
          freePlay={freePlay}
          selectedCount={selectedIndices.size}
          turnTimeout={turnTimeout}
          canBid={phase === 'bidding' && isMyTurn}
          canDouble={phase === 'doubling' && isMyTurn}
          onBid={onBid}
          onDouble={onDouble}
          onPlayCards={onPlayCards}
          onPass={onPass}
        />
      </div>

      {/* ==================== 倒计时显示 ==================== */}
      {isMyTurn && turnTimeout <= 10 && (
        <div style={{
          position: 'absolute',
          bottom: '50%',
          left: '50%',
          transform: 'translate(-50%, 50%)',
          zIndex: 100,
        }}>
          <span className={`${turnTimeout <= 5 ? 'countdown-urgent' : ''}`} style={{
            fontSize: 48,
            color: turnTimeout <= 5 ? '#e74c3c' : '#f0c040',
            fontWeight: 'bold',
            textShadow: '0 2px 16px rgba(0,0,0,0.5)',
            pointerEvents: 'none',
          }}>
            {turnTimeout}
          </span>
        </div>
      )}
    </div>
  );
}

function EmptySeat() {
  return (
    <div style={{
      textAlign: 'center',
      padding: 16,
      color: 'rgba(255,255,255,0.2)',
    }}>
      <div style={{ fontSize: 40 }}>🪑</div>
      <div style={{ fontSize: 12 }}>空位</div>
    </div>
  );
}

function PhaseIndicator({ phase }) {
  const texts = {
    dealing: '发牌中...',
    bidding: '抢地主阶段',
    doubling: '加倍阶段',
    playing: '出牌阶段',
    settlement: '结算中...',
  };
  return (
    <div style={{
      color: '#f0c040',
      fontSize: 14,
      fontWeight: 'bold',
      animation: 'countdown-pulse 1.5s ease-in-out infinite',
      textShadow: '0 1px 8px rgba(240,192,64,0.3)',
    }}>
      {texts[phase] || phase}
    </div>
  );
}

function getComboName(type) {
  const names = {
    single: '单张',
    pair: '对子',
    triple: '三张',
    triple_one: '三带一',
    triple_pair: '三带对',
    straight: '顺子',
    consecutive_pairs: '连对',
    airplane: '飞机',
    airplane_singles: '飞机带单',
    airplane_pairs: '飞机带对',
    bomb: '💣炸弹',
    rocket: '🚀王炸',
  };
  return names[type] || type;
}
