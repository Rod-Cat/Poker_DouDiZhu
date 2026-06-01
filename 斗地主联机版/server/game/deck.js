/**
 * 卡牌牌组模块
 * 负责创建54张标准扑克牌、洗牌、发牌
 */

import { SUITS, SUIT_SYMBOLS, SUIT_COLORS, RANK_DISPLAY } from '../../shared/constants.js';

/**
 * 创建标准54张扑克牌牌组
 * 0-12: 黑桃3-2  (rank 3-15)
 * 13-25: 红桃3-2 (rank 3-15)
 * 26-38: 梅花3-2 (rank 3-15)
 * 39-51: 方块3-2 (rank 3-15)
 * 52: 小王 (rank 16)
 * 53: 大王 (rank 17)
 *
 * @returns {Array<object>} 54张牌的数组
 */
export function createDeck() {
  const suits = [SUITS.SPADES, SUITS.HEARTS, SUITS.CLUBS, SUITS.DIAMONDS];
  const rankEntries = [
    [3, '3'], [4, '4'], [5, '5'], [6, '6'], [7, '7'],
    [8, '8'], [9, '9'], [10, '10'], [11, 'J'], [12, 'Q'],
    [13, 'K'], [14, 'A'], [15, '2'],
  ];

  const cards = [];
  let id = 0;

  // 创建52张普通花色牌
  for (const suit of suits) {
    for (const [rank, display] of rankEntries) {
      cards.push({
        id: id++,
        suit,
        rank,
        displayRank: display,
        displaySuit: SUIT_SYMBOLS[suit],
        color: SUIT_COLORS[suit],
      });
    }
  }

  // 添加大小王
  cards.push({
    id: 52,
    suit: SUITS.JOKER,
    rank: 16,
    displayRank: '小',
    displaySuit: '🃏',
    color: 'black',
  });
  cards.push({
    id: 53,
    suit: SUITS.JOKER,
    rank: 17,
    displayRank: '大',
    displaySuit: '🃏',
    color: 'red',
  });

  return cards;
}

/**
 * Fisher-Yates 洗牌算法
 * @param {Array} deck - 牌组
 * @returns {Array} 洗好的牌组
 */
export function shuffle(deck) {
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * 发牌：3名玩家各17张，剩余3张为底牌
 * @param {Array} shuffled - 已洗好的牌组
 * @returns {{ hands: [Array, Array, Array], bottom: Array }}
 */
export function deal(shuffled) {
  const hands = [[], [], []];
  // 前51张按顺序发：玩家0,1,2,0,1,2...
  for (let i = 0; i < 51; i++) {
    hands[i % 3].push(shuffled[i]);
  }
  // 最后3张是底牌
  const bottom = shuffled.slice(51, 54);
  return { hands, bottom };
}

/**
 * 对手牌排序（按rank从大到小，相同rank按花色排序）
 * @param {Array} cards - 手牌数组
 * @returns {Array} 排序后的手牌
 */
export function sortHand(cards) {
  return [...cards].sort((a, b) => {
    if (b.rank !== a.rank) return b.rank - a.rank;
    // 同rank按花色排序: 黑桃 > 红桃 > 梅花 > 方块 > 王
    const suitOrder = { spades: 0, hearts: 1, clubs: 2, diamonds: 3, joker: 4 };
    return (suitOrder[a.suit] || 5) - (suitOrder[b.suit] || 5);
  });
}
