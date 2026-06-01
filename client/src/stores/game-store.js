/**
 * 游戏状态管理 (Zustand)
 * 管理游戏对局中的所有状态：手牌、阶段、倍数、出牌等
 */

import { create } from 'zustand';
import { emit } from '../services/socket.js';

export const useGameStore = create((set, get) => ({
  // ==================== 游戏状态 ====================

  /** @type {string} 当前游戏阶段 */
  phase: 'waiting',
  /** @type {Array} 自己的手牌 */
  hand: [],
  /** @type {Array} 底牌 */
  bottomCards: [],
  /** @type {string|null} 地主玩家ID */
  landlordPlayerId: null,
  /** @type {string|null} 当前轮到哪个玩家 */
  currentTurnPlayerId: null,
  /** @type {object|null} 上一轮出的牌 */
  lastPlayedCards: null,
  /** @type {number} 当前倍数 */
  multiplier: 1,
  /** @type {object|null} 倍数明细 */
  multiplierBreakdown: null,
  /** @type {Set} 已选择的卡牌索引 */
  selectedCardIndices: new Set(),
  /** @type {object|null} 结算数据 */
  settlement: null,
  /** @type {object} 各玩家剩余手牌数 */
  playerCardsCount: {},
  /** @type {object} 玩家信息映射 */
  playerInfoMap: {},
  /** @type {boolean} 是否是当前玩家的回合 */
  isMyTurn: false,
  /** @type {boolean} 是否可以自由出牌（新一轮） */
  freePlay: false,
  /** @type {number} 回合倒计时（秒） */
  turnTimeout: 30,

  // ==================== 状态更新方法 ====================

  setPhase: (phase) => set({ phase }),
  setHand: (hand) => set({ hand }),
  setBottomCards: (cards) => set({ bottomCards: cards }),
  setLandlord: (playerId) => set({ landlordPlayerId: playerId }),
  setCurrentTurn: (playerId) => set({ currentTurnPlayerId: playerId }),
  setMultiplier: (value, breakdown) => set({ multiplier: value, multiplierBreakdown: breakdown }),
  setSettlement: (data) => set({ settlement: data }),
  setPlayerCardsCount: (counts) => set({ playerCardsCount: counts }),
  setPlayerInfoMap: (info) => set({ playerInfoMap: info }),
  setIsMyTurn: (val) => set({ isMyTurn: val }),
  setFreePlay: (val) => set({ freePlay: val }),
  setTurnTimeout: (val) => set({ turnTimeout: val }),

  /** 设置上次出牌记录 */
  setLastPlayedCards: (record) => set({ lastPlayedCards: record }),

  /** 清除本轮出牌 */
  clearRound: () => set({ lastPlayedCards: null, freePlay: true }),

  // ==================== 卡牌选择 ====================

  toggleCardSelection: (index) => {
    const selected = new Set(get().selectedCardIndices);
    if (selected.has(index)) {
      selected.delete(index);
    } else {
      selected.add(index);
    }
    set({ selectedCardIndices: selected });
  },

  clearSelection: () => set({ selectedCardIndices: new Set() }),

  // ==================== 游戏操作 ====================

  /** 抢地主/不抢 */
  bid: (action) => {
    emit('game:bid', { action });
  },

  /** 加倍/不加倍 */
  double: (action) => {
    emit('game:double', { action });
  },

  /** 出牌 */
  playCards: () => {
    const indices = Array.from(get().selectedCardIndices).sort((a, b) => a - b);
    if (indices.length === 0) return;
    const cards = indices.map((i) => get().hand[i]);
    emit('game:play', { cards });
    set({ selectedCardIndices: new Set() });
  },

  /** 不出/过 */
  pass: () => {
    emit('game:pass', {});
    set({ selectedCardIndices: new Set() });
  },

  /** 从手牌中移除已出的牌 */
  removePlayedCards: (playedCards) => {
    const playedIds = new Set(playedCards.map((c) => c.id));
    set((state) => ({
      hand: state.hand.filter((c) => !playedIds.has(c.id)),
    }));
  },

  /** 重置游戏状态 */
  reset: () => {
    set({
      phase: 'waiting',
      hand: [],
      bottomCards: [],
      landlordPlayerId: null,
      currentTurnPlayerId: null,
      lastPlayedCards: null,
      multiplier: 1,
      multiplierBreakdown: null,
      selectedCardIndices: new Set(),
      settlement: null,
      playerCardsCount: {},
      playerInfoMap: {},
      isMyTurn: false,
      freePlay: false,
      turnTimeout: 30,
    });
  },
}));
