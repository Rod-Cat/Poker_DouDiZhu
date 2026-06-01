/**
 * 分数/倍数计算模块
 * 负责计算游戏倍数和金币结算
 */

import { BOMB_MULTIPLIER, ROCKET_MULTIPLIER, DOUBLE_MULTIPLIER, BASE_GOLD } from '../../shared/constants.js';

/**
 * 计算最终倍数
 *
 * 倍数构成:
 * - 基础倍数: 叫地主轮次 (1/2/3)
 * - 地主加倍: 加倍×2，不加倍×1
 * - 每个农民加倍: 加倍×2，不加倍×1
 * - 每个炸弹: ×2
 * - 每个王炸: ×4
 *
 * @param {object} params
 * @param {number} params.bidLevel - 叫地主轮次 (1, 2, 3)
 * @param {boolean} params.landlordDoubled - 地主是否加倍
 * @param {Array<boolean>} params.farmerDoubled - 两个农民是否加倍 [bool, bool]
 * @param {number} params.bombCount - 炸弹数量
 * @param {number} params.rocketCount - 王炸数量
 * @returns {{ total: number, breakdown: object }}
 */
export function calculateMultiplier({
  bidLevel = 1,
  landlordDoubled = false,
  farmerDoubled = [false, false],
  bombCount = 0,
  rocketCount = 0,
}) {
  let total = bidLevel;

  const doubleLandlord = landlordDoubled ? DOUBLE_MULTIPLIER : 1;
  total *= doubleLandlord;

  let doubleFarmer = 1;
  for (const doubled of farmerDoubled) {
    if (doubled) doubleFarmer *= DOUBLE_MULTIPLIER;
  }
  total *= doubleFarmer;

  const bombMult = Math.pow(BOMB_MULTIPLIER, bombCount);
  const rocketMult = Math.pow(ROCKET_MULTIPLIER, rocketCount);
  total = total * bombMult * rocketMult;

  return {
    total,
    breakdown: {
      base: bidLevel,
      doubleLandlord,
      doubleFarmer,
      bombMultiplier: bombMult,
      rocketMultiplier: rocketMult,
      bombCount,
      rocketCount,
    },
  };
}

/**
 * 计算金币变动
 *
 * 斗地主金币规则：
 * - 地主赢：每个农民支付 底金×总倍数 给地主，地主总共赚 底金×总倍数×2
 * - 农民赢：地主支付 底金×总倍数 给每个农民，地主总共亏 底金×总倍数×2
 * - 底金默认100
 *
 * @param {object} params
 * @param {number} params.multiplier - 最终总倍数
 * @param {string} params.camp - 玩家阵营: 'landlord' 或 'farmer'
 * @param {boolean} params.won - 玩家是否获胜
 * @param {number} [params.baseGold=100] - 底金
 * @returns {number} 金币变动（正=赢，负=输）
 */
export function calculateGoldChange({ multiplier, camp, won, baseGold = BASE_GOLD }) {
  const amount = multiplier * baseGold;

  if (camp === 'landlord') {
    // 地主输赢都是2倍（因为涉及两个农民）
    return won ? amount * 2 : -amount * 2;
  } else {
    // 农民输赢是1倍（只涉及一个农民对地主的关系）
    return won ? amount : -amount;
  }
}

/**
 * 获取默认倍数明细
 * @returns {object}
 */
export function getDefaultBreakdown() {
  return {
    base: 1,
    doubleLandlord: 1,
    doubleFarmer: 1,
    bombMultiplier: 1,
    rocketMultiplier: 1,
    bombCount: 0,
    rocketCount: 0,
  };
}
