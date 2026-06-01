/**
 * 游戏引擎 (核心状态机)
 *
 * 管理完整的斗地主对局流程：
 * WAITING → DEALING → BIDDING → DOUBLING → PLAYING → SETTLEMENT
 *
 * 所有游戏逻辑在服务端执行（服务端权威），客户端只渲染UI
 */

import { GAME_PHASE, COMBO_TYPE, TURN_TIMEOUT, BOTTOM_CARD_COUNT, CAMP } from '../../shared/constants.js';
import { GAME } from '../../shared/events.js';
import { createDeck, shuffle, deal, sortHand } from './deck.js';
import { validateHand, getComboDescription } from './validator.js';
import { canPlayOver } from './can-play.js';
import { calculateMultiplier, calculateGoldChange, getDefaultBreakdown } from './scoring.js';
import * as playerRepo from '../db/player-repo.js';
import { v4 as uuidv4 } from 'uuid';

export class GameEngine {
  /**
   * @param {string} roomCode - 房间号
   * @param {Array} players - 房间玩家列表 [{playerId, nickname, avatar, gold, seatIndex}]
   */
  constructor(roomCode, players) {
    this.roomCode = roomCode;
    this.phase = GAME_PHASE.WAITING;

    // 按座位排序的玩家信息
    this.playerList = [...players].sort((a, b) => a.seatIndex - b.seatIndex);
    this.playerMap = {}; // playerId → playerState
    this.playerList.forEach((p) => {
      this.playerMap[p.playerId] = {
        playerId: p.playerId,
        nickname: p.nickname,
        seatIndex: p.seatIndex,
        hand: [],
        isLandlord: false,
        bidAction: null,
        doubleAction: null,
        isOnline: true,
      };
    });

    // 牌组相关
    this.deck = [];
    this.bottomCards = []; // 3张底牌
    this.hands = [[], [], []]; // 三个玩家的手牌（按seatIndex索引）

    // 回合管理
    this.currentTurnSeat = 0; // 当前回合的座位索引
    this.bidOrder = []; // 抢地主顺序
    this.bidResults = []; // 抢地主记录
    this.bidRound = 0; // 当前抢地主轮次
    this.landlordSeat = -1; // 地主座位索引
    this.landlordPlayerId = null;

    // 加倍
    this.doubleResults = [];
    this.landlordDoubled = false;
    this.farmerDoubled = [false, false];

    // 出牌
    this.lastPlayedCards = null; // { seatIndex, cards, comboInfo }
    this.lastPlayedBy = -1; // 最后出牌的座位索引
    this.passCount = 0; // 连续不出次数
    this.isNewRound = true; // 是否新一轮（自由出牌）

    // 倍数
    this.multiplier = 1;
    this.multiplierBreakdown = getDefaultBreakdown();
    this.bombCount = 0;
    this.rocketCount = 0;

    // 超时
    this.turnTimer = null;
    this.turnTimeout = TURN_TIMEOUT;

    // 对局ID
    this.gameId = uuidv4();
  }

  /**
   * 获取指定座位的玩家ID
   */
  getPlayerId(seatIndex) {
    if (seatIndex < 0 || seatIndex >= this.playerList.length) return null;
    return this.playerList[seatIndex].playerId;
  }

  /**
   * 获取指定座位的玩家状态
   */
  getPlayerState(seatIndex) {
    const pid = this.getPlayerId(seatIndex);
    return pid ? this.playerMap[pid] : null;
  }

  // ==================== 阶段1: 发牌 ====================

  /**
   * 开始发牌
   */
  startDealing() {
    this.phase = GAME_PHASE.DEALING;

    // 创建牌组、洗牌、发牌
    const freshDeck = createDeck();
    const shuffled = shuffle(freshDeck);
    const { hands, bottom } = deal(shuffled);

    this.hands = hands;
    this.bottomCards = bottom;
    this.deck = shuffled;

    // 分配手牌给各玩家
    for (let seat = 0; seat < 3; seat++) {
      const pState = this.getPlayerState(seat);
      if (pState) {
        pState.hand = sortHand(hands[seat]);
      }
    }

    // 通知每个玩家他们的手牌（只发自己的）
    for (let seat = 0; seat < 3; seat++) {
      const pid = this.getPlayerId(seat);
      const socketId = global.playerSockets.get(pid);
      if (socketId) {
        const playerData = this.getPublicPlayerData();
        global.io.to(socketId).emit(GAME.DEAL, {
          cards: this.hands[seat],
          players: playerData,
        });
      }
    }

    // 通知阶段变更
    this.broadcast(GAME.PHASE, { phase: GAME_PHASE.DEALING });

    // 发牌动画结束后(延迟)进入抢地主阶段
    setTimeout(() => this.startBidding(), 1000);
  }

  // ==================== 阶段2: 抢地主 ====================

  /**
   * 开始抢地主
   */
  startBidding() {
    this.phase = GAME_PHASE.BIDDING;
    this.bidRound = 0;
    this.bidResults = [];

    // 随机决定抢地主起始座位
    const startSeat = Math.floor(Math.random() * 3);
    this.bidOrder = [startSeat, (startSeat + 1) % 3, (startSeat + 2) % 3];

    this.broadcast(GAME.PHASE, { phase: GAME_PHASE.BIDDING });
    this.nextBidTurn();
  }

  /**
   * 进入下一个抢地主回合
   */
  nextBidTurn() {
    if (this.bidRound >= 3) {
      // 三轮都没人抢，重新发牌
      this.redeal();
      return;
    }

    const seat = this.bidOrder[this.bidRound];
    const pid = this.getPlayerId(seat);

    this.currentTurnSeat = seat;
    this.broadcast(GAME.BID_TURN, {
      playerId: pid,
      timeout: TURN_TIMEOUT,
      nickname: this.playerMap[pid]?.nickname,
    });

    this.startTurnTimer(() => {
      // 超时自动不抢
      this.handleBid(pid, 'pass');
    });
  }

  /**
   * 处理玩家抢地主操作
   * @param {string} playerId
   * @param {string} action - 'bid' 或 'pass'
   */
  handleBid(playerId, action) {
    const pState = this.playerMap[playerId];
    if (!pState) return;
    if (this.phase !== GAME_PHASE.BIDDING) return;

    const seat = this.bidOrder[this.bidRound];
    if (this.getPlayerId(seat) !== playerId) return; // 不是当前回合玩家

    this.clearTurnTimer();

    pState.bidAction = action;
    this.bidResults.push({ playerId, action, round: this.bidRound });

    // 通知所有玩家抢地主结果
    this.broadcast(GAME.BID_RESULT, {
      playerId,
      nickname: pState.nickname,
      action,
    });

    if (action === 'bid') {
      // 有人抢了地主！
      this.landlordSeat = seat;
      this.landlordPlayerId = playerId;
      pState.isLandlord = true;

      // 基础倍数 = 轮次 + 1
      const bidLevel = this.bidRound + 1;
      this.multiplier = bidLevel;

      // 地主获得底牌
      pState.hand = sortHand([...pState.hand, ...this.bottomCards]);

      // 揭示底牌
      this.broadcast(GAME.BOTTOM_CARDS, { cards: this.bottomCards });
      this.broadcast(GAME.LANDLORD, {
        playerId,
        bottomCards: this.bottomCards,
      });

      // 进入加倍阶段
      setTimeout(() => this.startDoubling(), 800);
    } else {
      // 不抢，下一轮
      this.bidRound++;
      setTimeout(() => this.nextBidTurn(), 400);
    }
  }

  /**
   * 重新发牌（全员不抢时）
   */
  redeal() {
    this.broadcast(GAME.PHASE, { phase: GAME_PHASE.DEALING });
    // 短暂延迟后重新发牌
    setTimeout(() => this.startDealing(), 1200);
  }

  // ==================== 阶段3: 加倍 ====================

  /**
   * 开始加倍阶段
   */
  startDoubling() {
    this.phase = GAME_PHASE.DOUBLING;
    this.doubleResults = [];
    this.currentTurnSeat = 0;

    this.broadcast(GAME.PHASE, { phase: GAME_PHASE.DOUBLING });
    this.nextDoubleTurn();
  }

  /**
   * 进入下一个加倍回合
   */
  nextDoubleTurn() {
    if (this.doubleResults.length >= 3) {
      // 加倍完成，开始出牌
      setTimeout(() => this.startPlaying(), 600);
      return;
    }

    const seat = (this.currentTurnSeat + this.doubleResults.length) % 3;
    // 跳过已经加倍过的
    const pid = this.getPlayerId(seat);

    this.currentTurnSeat = seat;
    this.broadcast(GAME.DOUBLE_TURN, {
      playerId: pid,
      timeout: TURN_TIMEOUT,
      nickname: this.playerMap[pid]?.nickname,
    });

    this.startTurnTimer(() => {
      this.handleDouble(pid, 'pass');
    });
  }

  /**
   * 处理玩家加倍操作
   */
  handleDouble(playerId, action) {
    const pState = this.playerMap[playerId];
    if (!pState) return;
    if (this.phase !== GAME_PHASE.DOUBLING) return;

    this.clearTurnTimer();

    pState.doubleAction = action;
    this.doubleResults.push({ playerId, action });

    const isDouble = action === 'double';
    if (pState.isLandlord) {
      this.landlordDoubled = isDouble;
    } else {
      // 农民
      const farmerIndex = this.getFarmerIndex(playerId);
      if (farmerIndex >= 0) {
        this.farmerDoubled[farmerIndex] = isDouble;
      }
    }

    // 重新计算倍数
    const multResult = calculateMultiplier({
      bidLevel: this.multiplier,
      landlordDoubled: this.landlordDoubled,
      farmerDoubled: this.farmerDoubled,
      bombCount: this.bombCount,
      rocketCount: this.rocketCount,
    });
    this.multiplier = multResult.total;
    this.multiplierBreakdown = multResult.breakdown;

    this.broadcast(GAME.DOUBLE_RESULT, {
      playerId,
      nickname: pState.nickname,
      action,
    });
    this.broadcast(GAME.MULTIPLIER, {
      value: this.multiplier,
      breakdown: this.multiplierBreakdown,
    });

    setTimeout(() => this.nextDoubleTurn(), 400);
  }

  /**
   * 获取农民玩家在农民数组中的索引
   */
  getFarmerIndex(playerId) {
    const pState = this.playerMap[playerId];
    if (!pState || pState.isLandlord) return -1;
    // 找到这个农民是非地主的第几个
    let idx = 0;
    for (const p of this.playerList) {
      if (p.playerId === playerId) return idx;
      if (p.playerId !== this.landlordPlayerId) idx++;
    }
    return -1;
  }

  // ==================== 阶段4: 出牌 ====================

  /**
   * 开始出牌阶段，地主先出
   */
  startPlaying() {
    this.phase = GAME_PHASE.PLAYING;
    this.lastPlayedCards = null;
    this.lastPlayedBy = -1;
    this.passCount = 0;
    this.isNewRound = true;

    // 地主先出牌
    this.currentTurnSeat = this.landlordSeat;

    this.broadcast(GAME.PHASE, { phase: GAME_PHASE.PLAYING });
    this.broadcastPlayTurn(true);
  }

  /**
   * 广播轮到谁出牌
   * @param {boolean} freePlay - 是否自由出牌（新一轮）
   */
  broadcastPlayTurn(freePlay) {
    const pid = this.getPlayerId(this.currentTurnSeat);
    this.broadcast(GAME.PLAY_TURN, {
      playerId: pid,
      timeout: TURN_TIMEOUT,
      freePlay: freePlay || this.isNewRound,
    });

    this.startTurnTimer(() => {
      // 超时自动pass（如果是新一轮则随机出一张最小的单牌）
      if (this.isNewRound) {
        // 自动出最小的单张
        const pState = this.getPlayerState(this.currentTurnSeat);
        if (pState && pState.hand.length > 0) {
          const minCard = pState.hand[pState.hand.length - 1]; // 已从大到小排，最后是最小的
          this.handlePlay(pid, [minCard]);
          return;
        }
      }
      this.handlePass(pid);
    });
  }

  /**
   * 处理玩家出牌
   * @param {string} playerId
   * @param {Array} cards - 要出的卡牌数组
   */
  handlePlay(playerId, cards) {
    const pState = this.playerMap[playerId];
    if (!pState) return;
    if (this.phase !== GAME_PHASE.PLAYING) return;

    const seat = pState.seatIndex;
    if (seat !== this.currentTurnSeat) return; // 不是当前回合

    this.clearTurnTimer();

    // 验证卡牌是否在手牌中
    const handIds = new Set(pState.hand.map((c) => c.id));
    const playIds = cards.map((c) => c.id);
    const allInHand = playIds.every((id) => handIds.has(id));
    if (!allInHand) {
      this.sendError(playerId, '出牌不在手牌中');
      return;
    }

    // 验证牌型
    const comboInfo = validateHand(cards);
    if (!comboInfo) {
      this.sendError(playerId, '不合法牌型，请重新选择');
      return;
    }

    // 验证是否能压制当前牌
    if (!this.isNewRound && this.lastPlayedCards) {
      if (!canPlayOver(comboInfo, this.lastPlayedCards.comboInfo)) {
        this.sendError(playerId, `出牌无法大过${getComboDescription(this.lastPlayedCards.comboInfo.type)}`);
        return;
      }
    }

    // 出牌合法！执行出牌
    // 从手牌中移除
    pState.hand = pState.hand.filter((c) => !playIds.includes(c.id));

    // 检测炸弹和王炸
    if (comboInfo.type === COMBO_TYPE.BOMB) {
      this.bombCount++;
    } else if (comboInfo.type === COMBO_TYPE.ROCKET) {
      this.rocketCount++;
    }

    // 重新计算倍数
    const multResult = calculateMultiplier({
      bidLevel: this.multiplierBreakdown.base,
      landlordDoubled: this.landlordDoubled,
      farmerDoubled: this.farmerDoubled,
      bombCount: this.bombCount,
      rocketCount: this.rocketCount,
    });
    this.multiplier = multResult.total;
    this.multiplierBreakdown = multResult.breakdown;

    // 更新记录
    this.lastPlayedCards = {
      seatIndex: seat,
      cards,
      comboInfo,
    };
    this.lastPlayedBy = seat;
    this.passCount = 0;
    this.isNewRound = false;

    // 广播出牌
    const cardsRemaining = pState.hand.length;
    this.broadcast(GAME.CARDS_PLAYED, {
      playerId,
      cards,
      comboType: comboInfo.type,
      comboRank: comboInfo.mainRank,
      cardsRemaining,
    });
    this.broadcast(GAME.MULTIPLIER, {
      value: this.multiplier,
      breakdown: this.multiplierBreakdown,
    });

    // 检查是否出完所有手牌（胜利！）
    if (pState.hand.length === 0) {
      setTimeout(() => this.endGame(playerId), 600);
      return;
    }

    // 进入下一回合
    this.currentTurnSeat = (seat + 1) % 3;
    this.broadcastPlayTurn(false);
  }

  /**
   * 处理玩家不出/过
   * @param {string} playerId
   */
  handlePass(playerId) {
    const pState = this.playerMap[playerId];
    if (!pState) return;
    if (this.phase !== GAME_PHASE.PLAYING) return;

    const seat = pState.seatIndex;
    if (seat !== this.currentTurnSeat) return;

    this.clearTurnTimer();
    this.passCount++;

    this.broadcast(GAME.PASS_NOTIFY, {
      playerId,
      nickname: pState.nickname,
    });

    // 两个人连续不出 → 新一轮，由最后出牌的人开始
    if (this.passCount >= 2) {
      this.lastPlayedCards = null;
      this.isNewRound = true;
      this.passCount = 0;
      this.currentTurnSeat = this.lastPlayedBy;
      this.broadcastPlayTurn(true);
      return;
    }

    // 下一人出牌
    this.currentTurnSeat = (seat + 1) % 3;
    this.broadcastPlayTurn(false);
  }

  // ==================== 阶段5: 结算 ====================

  /**
   * 游戏结束
   * @param {string} winnerPlayerId - 最先出完牌的玩家
   */
  endGame(winnerPlayerId) {
    this.phase = GAME_PHASE.SETTLEMENT;
    this.clearTurnTimer();

    const winnerState = this.playerMap[winnerPlayerId];
    const winnerCamp = winnerState.isLandlord ? CAMP.LANDLORD : CAMP.FARMER;

    // 计算每个玩家的金币变动
    const settlementData = {
      winnerPlayerId,
      winnerCamp,
      multiplier: this.multiplier,
      breakdown: this.multiplierBreakdown,
      records: [],
    };

    // 金币底盘：每个倍数100金币
    for (const pState of Object.values(this.playerMap)) {
      const camp = pState.isLandlord ? CAMP.LANDLORD : CAMP.FARMER;
      const won = (camp === winnerCamp);
      const goldChange = calculateGoldChange({
        multiplier: this.multiplier,
        camp,
        won,
      });

      settlementData.records.push({
        playerId: pState.playerId,
        nickname: pState.nickname,
        camp,
        won,
        goldChange,
        cardsRemaining: pState.hand.length,
      });

      // 更新数据库中的金币
      try {
        playerRepo.updateGold(pState.playerId, goldChange);
        playerRepo.updateStats(pState.playerId, won);

        // 通知玩家金币变动
        const socketId = global.playerSockets.get(pState.playerId);
        if (socketId) {
          const playerData = playerRepo.findById(pState.playerId);
          global.io.to(socketId).emit('player:gold', {
            gold: playerData ? playerData.gold : 0,
            change: goldChange,
          });
        }
      } catch (err) {
        console.error('[结算] 金币更新失败:', err);
      }
    }

    // 保存对局记录
    try {
      const gameId = this.gameId;
      global.db.prepare(`
        INSERT INTO game_records (id, room_code, landlord_id, winner_camp, base_multiplier,
          double_multiplier, bomb_count, rocket_count, final_multiplier, base_gold, ended_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
      `).run(
        gameId,
        this.roomCode,
        this.landlordPlayerId,
        winnerCamp,
        this.multiplierBreakdown.base,
        this.multiplierBreakdown.doubleLandlord * this.multiplierBreakdown.doubleFarmer,
        this.bombCount,
        this.rocketCount,
        this.multiplier,
        100
      );

      // 插入每个玩家的记录
      for (const record of settlementData.records) {
        global.db.prepare(`
          INSERT INTO game_player_records (id, game_id, player_id, camp, cards_remaining, gold_change, won)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          uuidv4(),
          gameId,
          record.playerId,
          record.camp,
          record.cardsRemaining,
          record.goldChange,
          record.won ? 1 : 0
        );
      }
    } catch (err) {
      console.error('[结算] 保存对局记录失败:', err);
    }

    // 广播结算
    this.broadcast(GAME.OVER, {
      winnerPlayerId: winnerPlayerId,
      winnerCamp: winnerCamp,
      multiplier: this.multiplier,
      breakdown: this.multiplierBreakdown,
      settlement: {
        multiplier: this.multiplier,
        breakdown: this.multiplierBreakdown,
        records: settlementData.records,
      },
    });
  }

  // ==================== 工具方法 ====================

  /**
   * 获取公开的玩家数据（用于发送给客户端）
   */
  getPublicPlayerData() {
    return this.playerList.map((p) => {
      const ps = this.playerMap[p.playerId];
      return {
        playerId: p.playerId,
        nickname: p.nickname,
        avatar: p.avatar,
        seatIndex: p.seatIndex,
        handSize: ps ? ps.hand.length : 0,
      };
    });
  }

  /**
   * 向房间内所有玩家广播
   * @param {string} event - 事件名
   * @param {object} data - 事件数据
   */
  broadcast(event, data) {
    const io = global.io;
    if (!io) return;
    for (const p of this.playerList) {
      const socketId = global.playerSockets.get(p.playerId);
      if (socketId) {
        io.to(socketId).emit(event, data);
      }
    }
  }

  /**
   * 向单个玩家发送错误消息
   */
  sendError(playerId, reason) {
    const socketId = global.playerSockets.get(playerId);
    if (socketId && global.io) {
      global.io.to(socketId).emit(GAME.INVALID_PLAY, { reason });
    }
  }

  /**
   * 启动回合计时器
   * @param {Function} onTimeout - 超时回调
   */
  startTurnTimer(onTimeout) {
    this.clearTurnTimer();
    this.turnTimer = setTimeout(onTimeout, TURN_TIMEOUT * 1000);
  }

  /**
   * 清除回合计时器
   */
  clearTurnTimer() {
    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
      this.turnTimer = null;
    }
  }

  /**
   * 获取游戏摘要信息
   */
  getSummary() {
    return {
      phase: this.phase,
      roomCode: this.roomCode,
      playerCount: this.playerList.length,
      multiplier: this.multiplier,
    };
  }

  /**
   * 清理资源
   */
  destroy() {
    this.clearTurnTimer();
  }
}
