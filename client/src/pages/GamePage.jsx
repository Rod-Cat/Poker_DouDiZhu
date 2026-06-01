/**
 * 游戏主页面
 * 渲染游戏桌面、手牌区、操作按钮、结算弹窗
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../stores/auth-store.js';
import { getSocket } from '../services/socket.js';
import { GAME } from '@shared/events.js';
import { useToast } from '../components/common/Toast.jsx';
import GameTable from '../components/game/GameTable.jsx';
import SettlementModal from './SettlementModal.jsx';
import '../styles/theme.css';
import '../styles/animations.css';

export default function GamePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const player = useAuthStore((s) => s.player);
  const { showToast } = useToast();
  const socket = getSocket();

  // 游戏核心状态
  const [phase, setPhase] = useState('waiting');
  const [hand, setHand] = useState([]);
  const [bottomCards, setBottomCards] = useState([]);
  const [landlordId, setLandlordId] = useState(null);
  const [currentTurnId, setCurrentTurnId] = useState(null);
  const [multiplier, setMultiplier] = useState(1);
  const [multiplierBreakdown, setMultiplierBreakdown] = useState(null);
  const [lastPlayed, setLastPlayed] = useState(null);
  const [playerCardsCount, setPlayerCardsCount] = useState({});
  const [playerInfo, setPlayerInfo] = useState({});
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [freePlay, setFreePlay] = useState(false);
  const [turnTimeout, setTurnTimeout] = useState(30);
  const [selectedIndices, setSelectedIndices] = useState(new Set());
  const [settlement, setSettlement] = useState(null);

  // 监听所有游戏事件
  useEffect(() => {
    const handlePhase = (data) => {
      setPhase(data.phase);
      if (data.phase === 'playing') {
        showToast('对局开始！请出牌', 'info');
      }
    };

    const handleDeal = (data) => {
      // 服务端发送的是卡牌数组
      if (Array.isArray(data)) {
        setHand(data);
      } else if (data.cards) {
        setHand(data.cards);
      }
      // 额外信息
      if (data.players) {
        const info = {};
        const counts = {};
        data.players.forEach((p) => {
          info[p.playerId] = { nickname: p.nickname, avatar: p.avatar };
          counts[p.playerId] = p.handSize || 17;
        });
        setPlayerInfo(info);
        setPlayerCardsCount(counts);
      }
    };

    const handleBottomCards = (data) => {
      setBottomCards(data.cards || data);
    };

    const handleLandlord = (data) => {
      setLandlordId(data.playerId);
      // 地主手牌加入底牌
      if (data.bottomCards) {
        setBottomCards(data.bottomCards);
      }
    };

    const handleBidTurn = (data) => {
      setCurrentTurnId(data.playerId);
      setIsMyTurn(data.playerId === player.id);
      setTurnTimeout(data.timeout || 30);
    };

    const handleBidResult = (data) => {
      showToast(`${data.nickname} ${data.action === 'bid' ? '抢地主！' : '不抢'}`, 'info');
    };

    const handleDoubleTurn = (data) => {
      setCurrentTurnId(data.playerId);
      setIsMyTurn(data.playerId === player.id);
      setTurnTimeout(data.timeout || 30);
    };

    const handleDoubleResult = (data) => {
      showToast(`${data.nickname} ${data.action === 'double' ? '加倍！' : '不加倍'}`, 'info');
    };

    const handlePlayTurn = (data) => {
      setCurrentTurnId(data.playerId);
      setIsMyTurn(data.playerId === player.id);
      setFreePlay(data.freePlay || false);
      setTurnTimeout(data.timeout || 30);
    };

    const handleCardsPlayed = (data) => {
      setLastPlayed({
        playerId: data.playerId,
        cards: data.cards,
        comboType: data.comboType,
      });
      // 更新剩余手牌数
      if (data.cardsRemaining !== undefined) {
        setPlayerCardsCount((prev) => ({
          ...prev,
          [data.playerId]: data.cardsRemaining,
        }));
      }
      // 如果是自己出的牌，从手牌中移除
      if (data.playerId === player.id && data.cards) {
        const playedIds = new Set(data.cards.map((c) => c.id));
        setHand((prev) => prev.filter((c) => !playedIds.has(c.id)));
        setSelectedIndices(new Set());
      }
    };

    const handlePassNotify = (data) => {
      showToast(`${data.nickname || '玩家'} 不出`, 'info');
    };

    const handleMultiplier = (data) => {
      setMultiplier(data.value || data.multiplier);
      if (data.breakdown) setMultiplierBreakdown(data.breakdown);
    };

    const handleCardsRemaining = (data) => {
      setPlayerCardsCount((prev) => ({
        ...prev,
        [data.playerId]: data.count,
      }));
    };

    const handleInvalidPlay = (data) => {
      showToast(data.reason || '出牌不合法', 'error');
    };

    const handleGameOver = (data) => {
      setSettlement(data);
    };

    const handleError = (data) => {
      showToast(data.message || '游戏错误', 'error');
    };

    socket.on(GAME.PHASE, handlePhase);
    socket.on(GAME.DEAL, handleDeal);
    socket.on(GAME.BOTTOM_CARDS, handleBottomCards);
    socket.on(GAME.LANDLORD, handleLandlord);
    socket.on(GAME.BID_TURN, handleBidTurn);
    socket.on(GAME.BID_RESULT, handleBidResult);
    socket.on(GAME.DOUBLE_TURN, handleDoubleTurn);
    socket.on(GAME.DOUBLE_RESULT, handleDoubleResult);
    socket.on(GAME.PLAY_TURN, handlePlayTurn);
    socket.on(GAME.CARDS_PLAYED, handleCardsPlayed);
    socket.on(GAME.PASS_NOTIFY, handlePassNotify);
    socket.on(GAME.MULTIPLIER, handleMultiplier);
    socket.on(GAME.CARDS_REMAINING, handleCardsRemaining);
    socket.on(GAME.INVALID_PLAY, handleInvalidPlay);
    socket.on(GAME.OVER, handleGameOver);
    socket.on(GAME.ERROR, handleError);

    return () => {
      socket.off(GAME.PHASE, handlePhase);
      socket.off(GAME.DEAL, handleDeal);
      socket.off(GAME.BOTTOM_CARDS, handleBottomCards);
      socket.off(GAME.LANDLORD, handleLandlord);
      socket.off(GAME.BID_TURN, handleBidTurn);
      socket.off(GAME.BID_RESULT, handleBidResult);
      socket.off(GAME.DOUBLE_TURN, handleDoubleTurn);
      socket.off(GAME.DOUBLE_RESULT, handleDoubleResult);
      socket.off(GAME.PLAY_TURN, handlePlayTurn);
      socket.off(GAME.CARDS_PLAYED, handleCardsPlayed);
      socket.off(GAME.PASS_NOTIFY, handlePassNotify);
      socket.off(GAME.MULTIPLIER, handleMultiplier);
      socket.off(GAME.CARDS_REMAINING, handleCardsRemaining);
      socket.off(GAME.INVALID_PLAY, handleInvalidPlay);
      socket.off(GAME.OVER, handleGameOver);
      socket.off(GAME.ERROR, handleError);
    };
  }, [player.id, socket]);

  // 操作处理
  const handleBid = (action) => {
    socket.emit(GAME.BID, { action });
  };

  const handleDouble = (action) => {
    socket.emit(GAME.DOUBLE, { action });
  };

  const handlePlayCards = () => {
    const indices = Array.from(selectedIndices).sort((a, b) => a - b);
    if (indices.length === 0) return;
    const cards = indices.map((i) => hand[i]);
    socket.emit(GAME.PLAY, { cards });
  };

  const handlePass = () => {
    socket.emit(GAME.PASS, {});
    setSelectedIndices(new Set());
  };

  const toggleCard = (index) => {
    const next = new Set(selectedIndices);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setSelectedIndices(next);
  };

  const handlePlayAgain = () => {
    setSettlement(null);
    setHand([]);
    setSelectedIndices(new Set());
    setLastPlayed(null);
    setPhase('waiting');
    socket.emit('room:ready', { ready: true });
  };

  const handleBackToLobby = () => {
    setSettlement(null);
    navigate('/lobby');
  };

  if (!player) return null;

  return (
    <div className="page" style={{ background: '#1a5c2a', overflow: 'hidden' }}>
      {/* 游戏桌面 */}
      <GameTable
        phase={phase}
        hand={hand}
        bottomCards={bottomCards}
        landlordId={landlordId}
        currentTurnId={currentTurnId}
        multiplier={multiplier}
        lastPlayed={lastPlayed}
        playerCardsCount={playerCardsCount}
        playerInfo={playerInfo}
        playerId={player.id}
        isMyTurn={isMyTurn}
        freePlay={freePlay}
        turnTimeout={turnTimeout}
        selectedIndices={selectedIndices}
        onToggleCard={toggleCard}
        onBid={handleBid}
        onDouble={handleDouble}
        onPlayCards={handlePlayCards}
        onPass={handlePass}
      />

      {/* 结算弹窗 */}
      {settlement && (
        <SettlementModal
          settlement={settlement}
          playerId={player.id}
          onPlayAgain={handlePlayAgain}
          onBackToLobby={handleBackToLobby}
        />
      )}
    </div>
  );
}
