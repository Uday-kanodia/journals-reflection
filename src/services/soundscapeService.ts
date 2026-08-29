import { SoundscapeType, SoundscapePreset } from '../types';

export const SOUNDSCAPE_PRESETS: SoundscapePreset[] = [
  {
    id: 'lofi',
    name: 'Lofi Warmth & Vinyl',
    description: 'Analog vinyl crackle, warm sub-harmonic chord drone, and soothing warmth.',
    tag: 'Calm Focus',
    color: '#5A5A40',
  },
  {
    id: 'binaural',
    name: 'Binaural Alpha Wave',
    description: '10Hz Alpha & 6Hz Theta dual-ear binaural frequencies for deep flow states.',
    tag: 'Flow State',
    color: '#456b3e',
  },
  {
    id: 'rain',
    name: 'Forest Canopy Rain',
    description: 'Procedural pink-noise rain simulation with randomized soft water droplets.',
    tag: 'Restorative',
    color: '#4a6572',
  },
  {
    id: 'stream',
    name: 'Mountain Brook & Breeze',
    description: 'Gentle low-pass filtered rippling water with subtle resonant wind.',
    tag: 'Serenity',
    color: '#607d8b',
  },
  {
    id: 'zen',
    name: 'Zen Singing Bowl Drone',
    description: 'Pure fundamental frequency with rich resonant meditation harmonics.',
    tag: 'Meditation',
    color: '#8c7438',
  },
];

class SoundscapeEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isPlaying: boolean = false;
  private currentPreset: SoundscapeType = 'lofi';
  private activeNodes: { stop: () => void }[] = [];
  private timerInterval: NodeJS.Timeout | null = null;
  private remainingSeconds: number = 0;
  private onTimerTick?: (secondsLeft: number) => void;
  private onPlaybackStateChange?: (playing: boolean) => void;

  public init() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.5, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
  }

  public setCallbacks(
    onTick: (secondsLeft: number) => void,
    onStateChange: (playing: boolean) => void
  ) {
    this.onTimerTick = onTick;
    this.onPlaybackStateChange = onStateChange;
  }

  public setVolume(volume: number) {
    // volume is 0.0 to 1.0
    if (this.masterGain && this.ctx) {
      const clamped = Math.max(0, Math.min(1, volume));
      this.masterGain.gain.setTargetAtTime(clamped, this.ctx.currentTime, 0.05);
    }
  }

  public async play(presetId?: SoundscapeType) {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    if (presetId) {
      this.currentPreset = presetId;
    }

    this.stopActiveNodes();
    this.buildPresetNodes(this.currentPreset);

    this.isPlaying = true;
    if (this.onPlaybackStateChange) this.onPlaybackStateChange(true);
  }

  public pause() {
    if (!this.isPlaying) return;
    this.stopActiveNodes();
    this.isPlaying = false;
    if (this.onPlaybackStateChange) this.onPlaybackStateChange(false);
  }

  public toggle(presetId?: SoundscapeType) {
    if (this.isPlaying && (!presetId || presetId === this.currentPreset)) {
      this.pause();
    } else {
      this.play(presetId || this.currentPreset);
    }
  }

  public startTimer(durationMinutes: number) {
    this.stopTimer();
    if (durationMinutes <= 0) {
      this.remainingSeconds = 0;
      if (this.onTimerTick) this.onTimerTick(0);
      return;
    }

    this.remainingSeconds = durationMinutes * 60;
    if (this.onTimerTick) this.onTimerTick(this.remainingSeconds);

    if (!this.isPlaying) {
      this.play();
    }

    this.timerInterval = setInterval(() => {
      this.remainingSeconds -= 1;
      if (this.onTimerTick) this.onTimerTick(this.remainingSeconds);

      if (this.remainingSeconds <= 0) {
        this.stopTimer();
        this.pause();
      }
    }, 1000);
  }

  public stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.remainingSeconds = 0;
    if (this.onTimerTick) this.onTimerTick(0);
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getCurrentPreset(): SoundscapeType {
    return this.currentPreset;
  }

  private stopActiveNodes() {
    this.activeNodes.forEach((node) => {
      try {
        node.stop();
      } catch (e) {
        // ignore
      }
    });
    this.activeNodes = [];
  }

  private buildPresetNodes(preset: SoundscapeType) {
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const master = this.masterGain;

    if (preset === 'binaural') {
      // Binaural Alpha (10 Hz beat difference)
      // Left ear 200 Hz, Right ear 210 Hz
      const merger = ctx.createChannelMerger(2);
      const oscL = ctx.createOscillator();
      const oscR = ctx.createOscillator();
      const gainL = ctx.createGain();
      const gainR = ctx.createGain();

      oscL.type = 'sine';
      oscL.frequency.setValueAtTime(196, ctx.currentTime); // G3

      oscR.type = 'sine';
      oscR.frequency.setValueAtTime(206, ctx.currentTime); // 10Hz Alpha pulse

      gainL.gain.setValueAtTime(0.3, ctx.currentTime);
      gainR.gain.setValueAtTime(0.3, ctx.currentTime);

      oscL.connect(gainL);
      gainL.connect(merger, 0, 0); // Left channel

      oscR.connect(gainR);
      gainR.connect(merger, 0, 1); // Right channel

      merger.connect(master);
      oscL.start();
      oscR.start();

      // Warm background sub drone
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'triangle';
      subOsc.frequency.setValueAtTime(98, ctx.currentTime); // G2
      subGain.gain.setValueAtTime(0.15, ctx.currentTime);
      subOsc.connect(subGain);
      subGain.connect(master);
      subOsc.start();

      this.activeNodes.push({
        stop: () => {
          oscL.stop();
          oscR.stop();
          subOsc.stop();
        },
      });
    } else if (preset === 'lofi') {
      // Lofi: Low warm chord pads + filtered crackle
      const chordFreqs = [130.81, 164.81, 196.0, 246.94]; // C3, E3, G3, B3 (Cmaj7)
      const oscillators: OscillatorNode[] = [];

      chordFreqs.forEach((freq) => {
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, ctx.currentTime);

        oscGain.gain.setValueAtTime(0.08, ctx.currentTime);

        osc.connect(filter);
        filter.connect(oscGain);
        oscGain.connect(master);
        osc.start();
        oscillators.push(osc);
      });

      // Procedural Vinyl Crackle (Buffer Noise Generator)
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const isCrackle = Math.random() > 0.998;
        output[i] = isCrackle ? (Math.random() * 2 - 1) * 0.4 : (Math.random() * 2 - 1) * 0.015;
      }

      const noiseNode = ctx.createBufferSource();
      noiseNode.buffer = noiseBuffer;
      noiseNode.loop = true;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(1200, ctx.currentTime);
      noiseFilter.Q.setValueAtTime(1.5, ctx.currentTime);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.18, ctx.currentTime);

      noiseNode.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(master);
      noiseNode.start();

      this.activeNodes.push({
        stop: () => {
          oscillators.forEach((o) => o.stop());
          noiseNode.stop();
        },
      });
    } else if (preset === 'rain') {
      // Rain: Pink Noise with gentle resonant filtering
      const bufferSize = ctx.sampleRate * 3;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.08;
        b6 = white * 0.115926;
      }

      const rainSource = ctx.createBufferSource();
      rainSource.buffer = noiseBuffer;
      rainSource.loop = true;

      const rainFilter = ctx.createBiquadFilter();
      rainFilter.type = 'lowpass';
      rainFilter.frequency.setValueAtTime(900, ctx.currentTime);

      const rainGain = ctx.createGain();
      rainGain.gain.setValueAtTime(0.4, ctx.currentTime);

      rainSource.connect(rainFilter);
      rainFilter.connect(rainGain);
      rainGain.connect(master);
      rainSource.start();

      this.activeNodes.push({
        stop: () => rainSource.stop(),
      });
    } else if (preset === 'stream') {
      // Gentle stream: Bandpassed modulated noise + soft harmonics
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * 0.1;
      }

      const streamSource = ctx.createBufferSource();
      streamSource.buffer = noiseBuffer;
      streamSource.loop = true;

      const filter1 = ctx.createBiquadFilter();
      filter1.type = 'bandpass';
      filter1.frequency.setValueAtTime(550, ctx.currentTime);
      filter1.Q.setValueAtTime(3.0, ctx.currentTime);

      const filter2 = ctx.createBiquadFilter();
      filter2.type = 'lowpass';
      filter2.frequency.setValueAtTime(1400, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.35, ctx.currentTime);

      streamSource.connect(filter1);
      filter1.connect(filter2);
      filter2.connect(gain);
      gain.connect(master);
      streamSource.start();

      this.activeNodes.push({
        stop: () => streamSource.stop(),
      });
    } else if (preset === 'zen') {
      // Zen Singing Bowl: 432 Hz fundamental with overtone resonance
      const bowlFreqs = [216, 432, 864, 1296];
      const bowlOscs: OscillatorNode[] = [];

      bowlFreqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        const volume = idx === 0 ? 0.2 : idx === 1 ? 0.25 : 0.08 / idx;
        oscGain.gain.setValueAtTime(volume, ctx.currentTime);

        osc.connect(oscGain);
        oscGain.connect(master);
        osc.start();
        bowlOscs.push(osc);
      });

      this.activeNodes.push({
        stop: () => bowlOscs.forEach((o) => o.stop()),
      });
    }
  }
}

export const soundscape = new SoundscapeEngine();
