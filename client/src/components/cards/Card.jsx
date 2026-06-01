/**
 * CSS绘制的扑克牌组件
 * 纯CSS实现54张牌，无图片依赖
 */

import React from 'react';
import './Card.css';

export default function Card({ card, selected = false, faceDown = false, small = false, onClick, style }) {
  if (faceDown) {
    return <CardBack small={small} />;
  }

  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
  const isJoker = card.suit === 'joker';
  const isBigJoker = card.rank === 17; // 大王

  const suitSymbol = getSuitSymbol(card.suit);
  const colorClass = isJoker ? (isBigJoker ? 'card-red' : 'card-black') : (isRed ? 'card-red' : 'card-black');

  const classes = [
    'poker-card',
    colorClass,
    selected ? 'card-selected' : '',
    small ? 'card-small' : '',
    isJoker ? 'card-joker' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} onClick={onClick} style={style} title={`${card.displayRank} ${suitSymbol}`}>
      {/* 左上角 */}
      <div className="card-corner card-corner-tl">
        <span className="card-rank-text">{card.displayRank}</span>
        {!isJoker && <span className="card-suit-text">{suitSymbol}</span>}
      </div>

      {/* 中央花色 */}
      <div className="card-center-suit">
        {isJoker ? (
          <span className="card-joker-icon">{isBigJoker ? '🃏' : '🃏'}</span>
        ) : (
          <span className="card-center-icon">{suitSymbol}</span>
        )}
      </div>

      {/* 右下角（翻转） */}
      <div className="card-corner card-corner-br">
        <span className="card-rank-text">{card.displayRank}</span>
        {!isJoker && <span className="card-suit-text">{suitSymbol}</span>}
      </div>
    </div>
  );
}

function CardBack({ small }) {
  return (
    <div className={`poker-card card-back ${small ? 'card-small' : ''}`}>
      <div className="card-back-inner" />
    </div>
  );
}

function getSuitSymbol(suit) {
  const symbols = {
    spades: '♠',
    hearts: '♥',
    clubs: '♣',
    diamonds: '♦',
    joker: '🃏',
  };
  return symbols[suit] || '?';
}
