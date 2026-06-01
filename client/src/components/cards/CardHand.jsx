/**
 * 手牌区域组件
 * 扇形排列手牌，支持点击选中/取消选中
 */

import React from 'react';
import Card from './Card.jsx';

export default function CardHand({ cards, selectedIndices, onToggleCard, isMyTurn, freePlay }) {
  if (!cards || cards.length === 0) {
    return (
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        height: 110, color: 'rgba(255,255,255,0.2)', fontSize: 14,
      }}>
        暂无手牌
      </div>
    );
  }

  // 按rank值排序手牌
  const sorted = [...cards].sort((a, b) => b.rank - a.rank);

  // 计算卡牌重叠间距
  const cardWidth = 72;
  const maxOverlap = 42; // 最大重叠像素
  let overlap = maxOverlap;

  // 根据卡牌数量动态调整overlap使手牌适应容器
  const totalWidth = cardWidth + (sorted.length - 1) * (cardWidth - overlap);
  const containerWidth = Math.min(window.innerWidth - 40, 1200);
  if (totalWidth > containerWidth) {
    overlap = Math.max(10, cardWidth - (containerWidth - cardWidth) / (sorted.length - 1));
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-end',
      padding: '10px 20px',
      flexWrap: 'nowrap',
      position: 'relative',
      height: 130,
    }}>
      {sorted.map((card, index) => {
        const isSelected = selectedIndices.has(cards.indexOf(card));
        const isPlayable = isMyTurn;

        return (
          <div
            key={card.id}
            style={{
              marginLeft: index === 0 ? 0 : -overlap,
              position: 'relative',
              zIndex: isSelected ? 100 : index,
            }}
          >
            <Card
              card={card}
              selected={isSelected}
              onClick={() => isPlayable && onToggleCard(cards.indexOf(card))}
            />
          </div>
        );
      })}
    </div>
  );
}
