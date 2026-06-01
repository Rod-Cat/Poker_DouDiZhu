/**
 * 音频服务模块
 * 使用 Web Audio API 程序化生成所有游戏音效
 * 无需任何外部音频文件
 */

class AudioService {
  constructor() {
    /** @type {AudioContext|null} */
    this.ctx = null;
    /** @type {GainNode|null} */
    this.masterGain = null;
    /** @type {boolean} */
    this.soundEnabled = true;
    /** @type {boolean} */
    this.musicEnabled = true;
    /** @type {Array<OscillatorNode>} */
    this.musicNodes = [];
    /** @type {boolean} */
    this.musicPlaying = false;
    /** @type {number|null} */
    this.musicTimer = null;
  }

  /**
   * 获取或创建 AudioContext
   */
  getCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.5;
      this.masterGain.connect(this.ctx.destination);
    }
    // 恢复被浏览器暂停的上下文
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * 设置总音量
   */
  setMasterVolume(value) {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, value));
    }
  }

  // ==================== 音效 ====================

  /** 发牌音效 - 清脆的点击声 */
  playDealCard() {
    if (!this.soundEnabled) return;
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(ctx.currentTime + 0.06);
  }

  /** 出牌音效 - 轻拍声 */
  playCardPlace() {
    if (!this.soundEnabled) return;
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  }

  /** 抢地主音效 - 洪亮的短音 */
  playBid() {
    if (!this.soundEnabled) return;
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.setValueAtTime(800, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  }

  /** 炸弹音效 - 爆炸效果 */
  playBomb() {
    if (!this.soundEnabled) return;
    const ctx = this.getCtx();

    // 低频隆隆声
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(150, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.5);
    gain1.gain.setValueAtTime(0.4, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc1.connect(gain1);
    gain1.connect(this.masterGain);
    osc1.start();
    osc1.stop(ctx.currentTime + 0.6);

    // 噪声成分
    const bufferSize = ctx.sampleRate * 0.5;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0.3, ctx.currentTime);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, ctx.currentTime);
    noise.connect(filter);
    filter.connect(gain2);
    gain2.connect(this.masterGain);
    noise.start();
  }

  /** 王炸音效 - 更强烈的爆炸 */
  playRocket() {
    if (!this.soundEnabled) return;
    const ctx = this.getCtx();

    // 更强的低频
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(200, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.7);
    gain1.gain.setValueAtTime(0.5, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc1.connect(gain1);
    gain1.connect(this.masterGain);
    osc1.start();
    osc1.stop(ctx.currentTime + 0.8);

    // 白噪声
    const bufferSize = ctx.sampleRate * 0.6;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0.4, ctx.currentTime);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
    noise.connect(gain2);
    gain2.connect(this.masterGain);
    noise.start();
  }

  /** 胜利音效 - 上升琶音 C-E-G-C */
  playVictory() {
    if (!this.soundEnabled) return;
    const ctx = this.getCtx();
    const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const startTime = ctx.currentTime + i * 0.15;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(startTime);
      osc.stop(startTime + 0.35);
    });
  }

  /** 失败音效 - 下行两音 */
  playDefeat() {
    if (!this.soundEnabled) return;
    const ctx = this.getCtx();
    [400, 300].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      const startTime = ctx.currentTime + i * 0.3;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.15, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(startTime);
      osc.stop(startTime + 0.4);
    });
  }

  /** 按钮点击音效 */
  playClick() {
    if (!this.soundEnabled) return;
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 1000;
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(ctx.currentTime + 0.03);
  }

  /** 不出/过音效 */
  playPass() {
    if (!this.soundEnabled) return;
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  }

  // ==================== 背景音乐 ====================

  /** 开启背景音乐 - 中国风五声音阶循环 */
  startMusic() {
    if (!this.musicEnabled || this.musicPlaying) return;
    this.musicPlaying = true;
    this.playMusicLoop();
  }

  /** 停止背景音乐 */
  stopMusic() {
    this.musicPlaying = false;
    if (this.musicTimer) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
    this.musicNodes.forEach((n) => { try { n.stop(); } catch {} });
    this.musicNodes = [];
  }

  /** 播放音乐循环 */
  playMusicLoop() {
    if (!this.musicPlaying) return;
    const ctx = this.getCtx();

    // 中国五声音阶: 宫商角徵羽 (C D E G A)
    const scale = [262, 294, 330, 392, 440, 523, 588, 660, 784, 880];
    const note = scale[Math.floor(Math.random() * scale.length)];

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = note;
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(ctx.currentTime + 0.8);
    this.musicNodes.push(osc);

    // 清理旧节点
    this.musicNodes = this.musicNodes.filter((n) => {
      try { return n.context?.currentTime !== undefined; } catch { return false; }
    });

    this.musicTimer = setTimeout(() => this.playMusicLoop(), 600 + Math.random() * 500);
  }

  /** 切换音效开关 */
  setSoundEnabled(enabled) {
    this.soundEnabled = enabled;
  }

  /** 切换音乐开关 */
  setMusicEnabled(enabled) {
    this.musicEnabled = enabled;
    if (enabled) {
      this.startMusic();
    } else {
      this.stopMusic();
    }
  }
}

/** 全局单例 */
export const audioService = new AudioService();
