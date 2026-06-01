/**
 * 共享常量定义 - 斗地主核心常量
 * 被服务端和客户端共同引用
 */

// ==================== 卡牌相关 ====================

/** 花色枚举 */
export const SUITS = {
  SPADES: 'spades',     // ♠ 黑桃
  HEARTS: 'hearts',     // ♥ 红桃
  CLUBS: 'clubs',       // ♣ 梅花
  DIAMONDS: 'diamonds', // ♦ 方块
  JOKER: 'joker',       // 大小王
};

/** 花色符号映射 */
export const SUIT_SYMBOLS = {
  spades: '♠',
  hearts: '♥',
  clubs: '♣',
  diamonds: '♦',
  joker: '🃏',
};

/** 花色颜色 */
export const SUIT_COLORS = {
  spades: 'black',
  hearts: 'red',
  clubs: 'black',
  diamonds: 'red',
  joker: 'red',
};

/**
 * 牌面rank值映射（从大到小排序）
 * 大王(17) > 小王(16) > 2(15) > A(14) > K(13) > Q(12) > J(11) > 10(10) > ... > 3(3)
 */
export const RANK_VALUES = {
  '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14, '2': 15,
  '小王': 16, '大王': 17,
};

/** rank值反查 */
export const RANK_DISPLAY = {
  3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8',
  9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K', 14: 'A', 15: '2',
  16: '小', 17: '大',
};

/** 普通牌的13个等级对应的rank值（3到2），顺子/连对/飞机只能使用这些 */
export const NORMAL_RANKS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

/** 顺子可用rank范围（3-A，即3-14） */
export const STRAIGHT_MIN_RANK = 3;
export const STRAIGHT_MAX_RANK = 14; // A=14, 2=15不能入顺子

// ==================== 牌型枚举 ====================

/** 所有合法牌型 */
export const COMBO_TYPE = {
  SINGLE: 'single',                   // 单张
  PAIR: 'pair',                       // 对子
  TRIPLE: 'triple',                   // 三张
  TRIPLE_ONE: 'triple_one',           // 三带一
  TRIPLE_PAIR: 'triple_pair',         // 三带对
  STRAIGHT: 'straight',               // 顺子
  CONSECUTIVE_PAIRS: 'consecutive_pairs', // 连对（钢板）
  AIRPLANE: 'airplane',               // 飞机（不带）
  AIRPLANE_SINGLES: 'airplane_singles',   // 飞机带单
  AIRPLANE_PAIRS: 'airplane_pairs',       // 飞机带对
  BOMB: 'bomb',                       // 炸弹
  ROCKET: 'rocket',                   // 王炸（火箭）
};

/** 牌型中文名 */
export const COMBO_NAME = {
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
  bomb: '炸弹',
  rocket: '王炸',
};

// ==================== 游戏阶段 ====================

export const GAME_PHASE = {
  WAITING: 'waiting',       // 等待玩家
  DEALING: 'dealing',       // 发牌中
  BIDDING: 'bidding',       // 抢地主阶段
  DOUBLING: 'doubling',     // 加倍阶段
  PLAYING: 'playing',       // 出牌阶段
  SETTLEMENT: 'settlement', // 结算阶段
};

// ==================== 游戏配置 ====================

/** 初始金币 */
export const INITIAL_GOLD = 1000;

/** 底金（每倍对应的金币） */
export const BASE_GOLD = 100;

/** 初始倍数 */
export const DEFAULT_MULTIPLIER = 1;

/** 炸弹倍数加成 */
export const BOMB_MULTIPLIER = 2;

/** 王炸倍数加成 */
export const ROCKET_MULTIPLIER = 4;

/** 加倍倍数 */
export const DOUBLE_MULTIPLIER = 2;

/** 手牌数量 */
export const HAND_SIZE = 17;

/** 底牌数量 */
export const BOTTOM_CARD_COUNT = 3;

/** 最大玩家数 */
export const MAX_PLAYERS = 3;

/** 出牌超时时间(秒) */
export const TURN_TIMEOUT = 30;

/** 房间超时时间(毫秒) - 30分钟无活动自动解散 */
export const ROOM_TIMEOUT = 30 * 60 * 1000;

// ==================== 阵营 ====================

export const CAMP = {
  LANDLORD: 'landlord',
  FARMER: 'farmer',
};

// ==================== 房间状态 ====================

export const ROOM_STATUS = {
  WAITING: 'waiting',
  READY: 'ready',
  PLAYING: 'playing',
};

// ==================== 卡牌视觉 ====================

/** 卡牌宽度(CSS变量参考) */
export const CARD_WIDTH = 70;
export const CARD_HEIGHT = 100;
export const CARD_SMALL_WIDTH = 50;
export const CARD_SMALL_HEIGHT = 72;
