/**
 * 牌型校验器 (核心模块)
 * 识别和验证全部10种斗地主合法牌型
 *
 * 牌力排序: 大王(17) > 小王(16) > 2(15) > A(14) > K(13) > Q(12) > J(11) > 10(10) > ... > 3(3)
 *
 * 10种牌型:
 * 1. 单张 (single)
 * 2. 对子 (pair)
 * 3. 三张 (triple)
 * 4. 三带一 (triple_one)
 * 5. 三带对 (triple_pair)
 * 6. 顺子 (straight): 5+张连续, 范围3-A(14)
 * 7. 连对/钢板 (consecutive_pairs): 3+对连续, 范围3-A(14)
 * 8. 飞机 (airplane): 2+连续三张, 可带单/对/不带
 * 9. 炸弹 (bomb): 四张相同
 * 10. 王炸/火箭 (rocket): 大王+小王
 */

import { COMBO_TYPE } from '../../shared/constants.js';

/**
 * 按rank值分组卡牌
 * @param {Array} cards - 卡牌数组
 * @returns {Map<number, Array>} rank → 该rank的卡牌数组
 */
function groupByRank(cards) {
  const map = new Map();
  for (const card of cards) {
    if (!map.has(card.rank)) map.set(card.rank, []);
    map.get(card.rank).push(card);
  }
  return map;
}

/**
 * 检查rank数组是否连续
 * @param {Array<number>} ranks - 排序后的rank数组
 * @param {number} minLength - 最小连续长度
 * @returns {boolean}
 */
function isConsecutive(ranks, minLength) {
  if (ranks.length < minLength) return false;
  for (let i = 1; i < ranks.length; i++) {
    if (ranks[i] !== ranks[i - 1] + 1) return false;
  }
  return true;
}

/**
 * 检查所有rank是否在允许范围内
 * @param {Array<number>} ranks
 * @param {number} min
 * @param {number} max
 * @returns {boolean}
 */
function allInRange(ranks, min, max) {
  return ranks.every((r) => r >= min && r <= max);
}

/**
 * 验证一组牌是否构成合法牌型
 * @param {Array} cards - 要验证的卡牌数组
 * @returns {{ type: string, mainRank: number, length: number } | null}
 *   合法牌型返回信息对象，非法返回null
 */
export function validateHand(cards) {
  if (!cards || cards.length === 0) return null;

  const n = cards.length;
  // 按rank从小到大排序（方便判断连续性）
  const sorted = [...cards].sort((a, b) => a.rank - b.rank);

  // ==================== 王炸 (rocket) ====================
  if (n === 2 && sorted[0].rank === 16 && sorted[1].rank === 17) {
    return { type: COMBO_TYPE.ROCKET, mainRank: 17, length: 2 };
  }

  // ==================== 按rank分组统计 ====================
  const groups = groupByRank(cards);
  const rankCounts = [...groups.entries()]
    .map(([rank, groupCards]) => ({ rank, count: groupCards.length }))
    .sort((a, b) => a.rank - b.rank);

  const singles = rankCounts.filter((rc) => rc.count === 1);
  const pairs = rankCounts.filter((rc) => rc.count === 2);
  const triples = rankCounts.filter((rc) => rc.count === 3);
  const quads = rankCounts.filter((rc) => rc.count === 4);

  // ==================== 炸弹 (bomb) ====================
  if (n === 4 && quads.length === 1) {
    return { type: COMBO_TYPE.BOMB, mainRank: quads[0].rank, length: 4 };
  }

  // ==================== 单张 (single) ====================
  if (n === 1) {
    return { type: COMBO_TYPE.SINGLE, mainRank: sorted[0].rank, length: 1 };
  }

  // ==================== 对子 (pair) ====================
  if (n === 2 && pairs.length === 1) {
    return { type: COMBO_TYPE.PAIR, mainRank: pairs[0].rank, length: 2 };
  }

  // ==================== 三张 (triple) ====================
  if (n === 3 && triples.length === 1) {
    return { type: COMBO_TYPE.TRIPLE, mainRank: triples[0].rank, length: 3 };
  }

  // ==================== 三带一 (triple_one) ====================
  // 三张同点 + 一张任意单张
  if (n === 4 && triples.length === 1) {
    // 三张 + 要么有一张单张(即这张卡和triple不同rank)，要么有4张相同但只出了3+1的情况
    // 这里我们确认是1个三张+1个单张（或者1个三张+另一个三张中的1张...）
    // 实际上三带一：有且仅有1个三张，剩余的1张是单张
    if (singles.length === 1 || (rankCounts.length === 2 && triples.length === 1)) {
      return { type: COMBO_TYPE.TRIPLE_ONE, mainRank: triples[0].rank, length: 4 };
    }
  }

  // ==================== 三带对 (triple_pair) ====================
  // 三张同点 + 一对对子
  if (n === 5 && triples.length === 1 && pairs.length === 1) {
    return { type: COMBO_TYPE.TRIPLE_PAIR, mainRank: triples[0].rank, length: 5 };
  }

  // ==================== 顺子 (straight) ====================
  // 5+张连续单张，范围3-A(14)，不含2(15)、大小王
  if (n >= 5 && singles.length === n) {
    const ranks = rankCounts.map((rc) => rc.rank);
    if (isConsecutive(ranks, 5) && allInRange(ranks, 3, 14)) {
      return { type: COMBO_TYPE.STRAIGHT, mainRank: ranks[ranks.length - 1], length: n };
    }
  }

  // ==================== 连对/钢板 (consecutive_pairs) ====================
  // 3+对连续对子，范围3-A(14)
  if (n >= 6 && n % 2 === 0 && pairs.length === n / 2 && singles.length === 0 && triples.length === 0) {
    const ranks = pairs.map((p) => p.rank);
    if (isConsecutive(ranks, 3) && allInRange(ranks, 3, 14)) {
      return { type: COMBO_TYPE.CONSECUTIVE_PAIRS, mainRank: ranks[ranks.length - 1], length: pairs.length };
    }
  }

  // ==================== 飞机 (airplane) ====================
  // 2+连续三张，可带单/带对/不带
  if (triples.length >= 2) {
    const tripleRanks = triples.map((t) => t.rank);

    // 三张必须连续且范围在3-A(14)，2不能入飞机
    if (!isConsecutive(tripleRanks, 2) || !allInRange(tripleRanks, 3, 14)) {
      return null;
    }

    const tripleCount = triples.length;
    const extraCount = n - tripleCount * 3;

    // 飞机不带 (bare airplane)
    if (extraCount === 0) {
      return { type: COMBO_TYPE.AIRPLANE, mainRank: tripleRanks[tripleRanks.length - 1], length: tripleCount };
    }

    // 飞机带单：额外牌数等于三张组数
    if (extraCount === tripleCount) {
      // 需要验证额外的牌都是单张，并且不与三张的rank重复
      // （实际上额外单张的rank可以与三张重复，规则允许）
      return { type: COMBO_TYPE.AIRPLANE_SINGLES, mainRank: tripleRanks[tripleRanks.length - 1], length: tripleCount };
    }

    // 飞机带对：额外牌数等于三张组数×2
    if (extraCount === tripleCount * 2) {
      // 验证额外牌都是成对的
      const nonTripleCards = rankCounts.filter((rc) => !tripleRanks.includes(rc.rank));
      const extraPairs = nonTripleCards.filter((rc) => rc.count === 2);
      const extraSingles = nonTripleCards.filter((rc) => rc.count === 1);
      // 额外的对子数量应该等于三张组数，且不能有单张
      if (extraPairs.length === tripleCount && extraSingles.length === 0) {
        return { type: COMBO_TYPE.AIRPLANE_PAIRS, mainRank: tripleRanks[tripleRanks.length - 1], length: tripleCount };
      }
    }
  }

  // ==================== 不合法牌型 ====================
  return null;
}

/**
 * 获取牌型的中文描述
 * @param {string} comboType - 牌型枚举值
 * @returns {string} 中文描述
 */
export function getComboDescription(comboType) {
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
    bomb: '炸弹',
    rocket: '王炸',
  };
  return names[comboType] || '未知牌型';
}
