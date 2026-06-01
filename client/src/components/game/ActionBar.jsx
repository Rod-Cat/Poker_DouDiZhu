/**
 * 操作按钮栏
 * 根据当前游戏阶段显示对应的操作按钮
 */

import React from 'react';
import Button from '../common/Button.jsx';

export default function ActionBar({
  phase,
  isMyTurn,
  freePlay,
  selectedCount,
  turnTimeout,
  canBid,
  canDouble,
  onBid,
  onDouble,
  onPlayCards,
  onPass,
}) {
  // 抢地主阶段按钮
  if (phase === 'bidding') {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 16,
        padding: '8px 0',
      }}>
        {canBid ? (
          <>
            <Button variant="primary" size="lg" onClick={() => onBid('bid')}>
              抢地主
            </Button>
            <Button variant="outline" size="lg" onClick={() => onBid('pass')}>
              不抢
            </Button>
          </>
        ) : (
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
            等待其他玩家抢地主...
          </span>
        )}
      </div>
    );
  }

  // 加倍阶段按钮
  if (phase === 'doubling') {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 16,
        padding: '8px 0',
      }}>
        {canDouble ? (
          <>
            <Button variant="warning" size="lg" onClick={() => onDouble('double')}>
              加倍
            </Button>
            <Button variant="outline" size="lg" onClick={() => onDouble('pass')}>
              不加倍
            </Button>
          </>
        ) : (
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
            等待其他玩家加倍...
          </span>
        )}
      </div>
    );
  }

  // 出牌阶段按钮
  if (phase === 'playing') {
    const canPlay = isMyTurn && selectedCount > 0;

    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 12,
        padding: '8px 0',
      }}>
        {isMyTurn ? (
          <>
            <Button
              variant="primary"
              size="lg"
              disabled={!canPlay}
              onClick={onPlayCards}
            >
              出牌
            </Button>
            {!freePlay && (
              <Button variant="outline" size="lg" onClick={onPass}>
                不出
              </Button>
            )}
            <Button variant="outline" size="lg" onClick={() => {}}>
              提示
            </Button>
          </>
        ) : (
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
            等待其他玩家出牌...
          </span>
        )}
        {selectedCount > 0 && (
          <span style={{ color: '#f0c040', fontSize: 13, alignSelf: 'center' }}>
            已选 {selectedCount} 张
          </span>
        )}
      </div>
    );
  }

  // 等待阶段
  return (
    <div style={{
      textAlign: 'center',
      padding: '8px 0',
      color: 'rgba(255,255,255,0.3)',
      fontSize: 14,
    }}>
      等待中...
    </div>
  );
}
