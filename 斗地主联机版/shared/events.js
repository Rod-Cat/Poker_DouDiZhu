/**
 * Socket.io 事件名常量定义
 * 统一管理所有网络通信事件名，避免拼写错误
 */

// ==================== 认证事件 ====================

export const AUTH = {
  REGISTER: 'auth:register',     // C→S 注册
  LOGIN: 'auth:login',           // C→S 登录
  GUEST: 'auth:guest',           // C→S 游客登录
  RESTORE: 'auth:restore',       // C→S 恢复会话
};

// ==================== 房间事件 ====================

export const ROOM = {
  CREATE: 'room:create',                // C→S 创建房间
  JOIN: 'room:join',                    // C→S 加入房间
  LEAVE: 'room:leave',                  // C→S 离开房间
  READY: 'room:ready',                  // C→S 切换准备状态
  CHAT: 'room:chat',                    // C→S 发送聊天
  QUICK_MATCH: 'room:quick_match',      // C→S 快速匹配

  STATE: 'room:state',                  // S→C 房间状态更新（发送给单个玩家）
  PLAYER_JOINED: 'room:player_joined',  // S→C 玩家加入通知（广播）
  PLAYER_LEFT: 'room:player_left',      // S→C 玩家离开通知（广播）
  CHAT_MESSAGE: 'room:chat_message',    // S→C 聊天消息（广播）
  GAME_STARTING: 'room:game_starting',  // S→C 游戏即将开始
  DISSOLVED: 'room:dissolved',          // S→C 房间已解散
  ERROR: 'room:error',                  // S→C 房间错误
};

// ==================== 游戏事件 ====================

export const GAME = {
  // 客户端 → 服务端
  BID: 'game:bid',          // 抢地主/不抢
  DOUBLE: 'game:double',    // 加倍/不加倍
  PLAY: 'game:play',        // 出牌
  PASS: 'game:pass',        // 不出/过

  // 服务端 → 客户端
  PHASE: 'game:phase',              // 阶段变更通知
  DEAL: 'game:deal',                // 发牌（每个玩家收到自己的17张）
  BOTTOM_CARDS: 'game:bottom_cards',// 底牌展示（地主确定后揭示）
  BID_TURN: 'game:bid_turn',        // 轮到谁抢地主
  BID_RESULT: 'game:bid_result',    // 抢地主结果
  LANDLORD: 'game:landlord',        // 地主确定通知
  DOUBLE_TURN: 'game:double_turn',  // 轮到谁加倍
  DOUBLE_RESULT: 'game:double_result', // 加倍结果
  PLAY_TURN: 'game:play_turn',      // 轮到谁出牌
  CARDS_PLAYED: 'game:cards_played',// 有玩家出了牌
  PASS_NOTIFY: 'game:pass_notify',  // 有玩家选择不出
  MULTIPLIER: 'game:multiplier',    // 倍数更新
  CARDS_REMAINING: 'game:cards_remaining', // 玩家剩余手牌数
  INVALID_PLAY: 'game:invalid_play',// 出牌不合法
  OVER: 'game:over',                // 游戏结束
  ERROR: 'game:error',              // 游戏错误
};

// ==================== 玩家事件 ====================

export const PLAYER = {
  GOLD: 'player:gold',           // S→C 金币变动通知
  DATA: 'player:data',           // S→C 玩家数据更新
};

// ==================== 连接事件 ====================

export const CONNECTION = {
  KICK: 'connection:kick',       // S→C 被踢出
  PING: 'connection:ping',       // C→S 心跳
  PONG: 'connection:pong',       // S→C 心跳回应
  DISCONNECT: 'disconnect',      // 内置事件：断线
  CONNECT: 'connect',            // 内置事件：连接成功
  CONNECT_ERROR: 'connect_error', // 内置事件：连接错误
};
