/**
 * 出牌比对逻辑
 * 判断新出的牌是否能压制当前牌桌上的牌
 */

import { COMBO_TYPE } from '../../shared/constants.js';

/**
 * 判断 challengerCombo 是否能压制 currentCombo
 *
 * @param {{ type: string, mainRank: number, length: number } | null} challenger - 挑战者牌型
 * @param {{ type: string, mainRank: number, length: number } | null} current - 当前牌桌上的牌型
 * @returns {boolean} 是否能压制
 */
export function canPlayOver(challenger, current) {
  // 无当前牌型（新一轮，自由出牌），任何合法牌型都能出
  if (current === null || current === undefined) {
    return challenger !== null;
  }

  // 挑战者必须合法
  if (challenger === null) return false;

  // ==================== 王炸通杀一切 ====================
  if (challenger.type === COMBO_TYPE.ROCKET) return true;

  // 当前是王炸，什么都打不过
  if (current.type === COMBO_TYPE.ROCKET) return false;

  // ==================== 炸弹能打非炸弹 ====================
  if (challenger.type === COMBO_TYPE.BOMB && current.type !== COMBO_TYPE.BOMB) return true;

  // 非炸弹打不过炸弹
  if (current.type === COMBO_TYPE.BOMB && challenger.type !== COMBO_TYPE.BOMB) return false;

  // ==================== 炸弹对炸弹：比大小 ====================
  if (challenger.type === COMBO_TYPE.BOMB && current.type === COMBO_TYPE.BOMB) {
    return challenger.mainRank > current.mainRank;
  }

  // ==================== 同类型比较 ====================
  // 对于顺子、连对、飞机：类型相同 + 长度相同 + mainRank更大
  if (challenger.type === current.type) {
    // 顺子/连对/飞机需要长度相同
    if (
      challenger.type === COMBO_TYPE.STRAIGHT ||
      challenger.type === COMBO_TYPE.CONSECUTIVE_PAIRS ||
      challenger.type === COMBO_TYPE.AIRPLANE ||
      challenger.type === COMBO_TYPE.AIRPLANE_SINGLES ||
      challenger.type === COMBO_TYPE.AIRPLANE_PAIRS
    ) {
      if (challenger.length !== current.length) return false;
    }
    // 比大小
    return challenger.mainRank > current.mainRank;
  }

  // ==================== 不同类型不能互相压制 ====================
  return false;
}

/**
 * 判断是否必须是同类型才能出（新一轮可以出任意合法牌型）
 * @param {boolean} freePlay - 是否是新一轮（自由出牌）
 * @param {boolean} isSameType - 是否是相同牌型
 * @returns {boolean}
 */
export function isPlayAllowed(challengerValid, current, freePlay) {
  if (freePlay) return challengerValid !== null;
  if (current === null) return challengerValid !== null;
  if (challengerValid === null) return false;
  return canPlayOver(challengerValid, current);
}
