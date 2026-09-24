/**
 * VR Video Converter
 * Version: v.1.0.2
 *
 * time-estimator.js - Sistema de Estimativa de Tempo Realista e Análise de Complexidade
 *
 * Responsável por:
 * 1. Calcular a complexidade do vídeo (pixels/frame, pixels/segundo, frames totais).
 * 2. Estimar o tempo restante combinando velocidade do FFmpeg e contagem de frames.
 * 3. Aplicar suavização (moving average) para eliminar oscilações bruscas.
 * 4. Avaliar o índice de desempenho (Muito lento, Lento, Normal, Rápido).
 * 5. Prever o horário aproximado de conclusão.
 */

import { formatDuration } from './utils.js';

export class TimeEstimator {
  /**
   * @param {Object} options
   * @param {number} options.totalDuration - Duração do vídeo em segundos
   * @param {number} [options.fps] - Taxa de quadros
   * @param {number} [options.width] - Largura
   * @param {number} [options.height] - Altura
   */
  constructor(options = {}) {
    this.totalDuration = Math.max(0, options.totalDuration || options.duration || 0);
    this.fps = Math.max(1, options.fps || 30);
    this.width = options.width || 1920;
    this.height = options.height || 1080;

    this.totalFrames = Math.round(this.totalDuration * this.fps);
    this.startTime = Date.now();
    this.lastUpdateTime = 0;

    // Amostras para média móvel e suavização
    this.speedSamples = [];
    this.remainingSamples = [];
    this.maxSamples = 8;

    this.lastRemainingSeconds = null;
    this.currentSmoothedSpeed = 0;
  }

  /**
   * Reseta os contadores para uma nova conversão
   * @param {number} totalDuration
   * @param {number} [fps]
   * @param {number} [width]
   * @param {number} [height]
   */
  reset(totalDuration, fps, width, height) {
    this.totalDuration = Math.max(0, totalDuration || 0);
    this.fps = Math.max(1, fps || 30);
    this.width = width || this.width;
    this.height = height || this.height;

    this.totalFrames = Math.round(this.totalDuration * this.fps);
    this.startTime = Date.now();
    this.lastUpdateTime = 0;
    this.speedSamples = [];
    this.remainingSamples = [];
    this.lastRemainingSeconds = null;
    this.currentSmoothedSpeed = 0;
  }

  /**
   * Calcula a complexidade do vídeo para classificação prévia
   * @param {Object} metadata
   * @returns {{
   *   pixelsPerFrame: number,
   *   pixelsPerSecond: number,
   *   totalFrames: number,
   *   classification: 'rapido'|'moderado'|'pesado'|'muito_pesado',
   *   classificationLabel: string,
   *   isHeavy: boolean,
   *   isVeryHeavy: boolean
   * }}
   */
  static calculateComplexity(metadata = {}) {
    const width = metadata.width || 1920;
    const height = metadata.height || 1080;
    const fps = Math.max(1, metadata.fps || 30);
    const duration = Math.max(1, metadata.duration || 0);

    const pixelsPerFrame = width * height;
    const pixelsPerSecond = pixelsPerFrame * fps;
    const totalFrames = Math.round(duration * fps);

    // 4K 60fps = ~497.664.000 pixels/s (Muito pesado)
    // 4K 30fps = ~248.832.000 pixels/s (Pesado / Muito pesado)
    // 1080p 60fps = ~124.416.000 pixels/s (Pesado)
    // 1080p 30fps = ~62.208.000 pixels/s (Moderado)
    // 720p 30fps = ~27.648.000 pixels/s (Rápido)
    let classification = 'rapido';
    let classificationLabel = 'Rápido';
    let isHeavy = false;
    let isVeryHeavy = false;

    if (pixelsPerSecond >= 200000000 || (width >= 3840 && fps >= 50)) {
      classification = 'muito_pesado';
      classificationLabel = 'Muito pesado';
      isHeavy = true;
      isVeryHeavy = true;
    } else if (pixelsPerSecond >= 100000000 || (width >= 3840 && height >= 2160)) {
      classification = 'pesado';
      classificationLabel = 'Pesado';
      isHeavy = true;
    } else if (pixelsPerSecond >= 40000000) {
      classification = 'moderado';
      classificationLabel = 'Moderado';
    }

    return {
      pixelsPerFrame,
      pixelsPerSecond,
      totalFrames,
      classification,
      classificationLabel,
      tier: classificationLabel,
      isHeavy,
      isVeryHeavy,
      width,
      height,
      fps,
      duration
    };
  }

  /**
   * Atualiza as métricas com novos dados recebidos do FFmpeg
   * @param {Object} data
   * @param {number} [data.currentTime] - Tempo processado do vídeo em segundos
   * @param {number} [data.frame] - Frame atual processado
   * @param {number} [data.speed] - Velocidade do FFmpeg (ex: 0.0217x)
   * @param {number} [data.fps] - FPS real de codificação
   * @returns {Object} Métricas formatadas e calculadas
   */
  update(data = {}) {
    const now = Date.now();
    const elapsedSeconds = Math.max(0, (now - this.startTime) / 1000);

    const currentTime = typeof data.currentTime === 'number' ? Math.max(0, data.currentTime) : 0;
    const frame = typeof data.frame === 'number' ? Math.max(0, data.frame) : 0;
    const rawSpeed = typeof data.speed === 'number' ? Math.max(0, data.speed) : 0;

    // Atualiza amostras de velocidade
    if (rawSpeed > 0) {
      this.speedSamples.push(rawSpeed);
      if (this.speedSamples.length > this.maxSamples) {
        this.speedSamples.shift();
      }
    }

    // Calcula velocidade suavizada (média simples das amostras válidas)
    if (this.speedSamples.length > 0) {
      const sum = this.speedSamples.reduce((a, b) => a + b, 0);
      this.currentSmoothedSpeed = sum / this.speedSamples.length;
    } else {
      this.currentSmoothedSpeed = rawSpeed;
    }

    // 1. Estimativa baseada na velocidade do FFmpeg
    let speedBasedEstimate = null;
    if (this.currentSmoothedSpeed > 0.0001 && this.totalDuration > 0) {
      const remainingVideoDuration = Math.max(0, this.totalDuration - currentTime);
      speedBasedEstimate = remainingVideoDuration / this.currentSmoothedSpeed;
    }

    // 2. Estimativa baseada na contagem de frames processados
    let frameBasedEstimate = null;
    if (this.totalFrames > 0 && frame > 5 && elapsedSeconds > 2) {
      const remainingFrames = Math.max(0, this.totalFrames - frame);
      const effectiveFrameRate = frame / elapsedSeconds;
      if (effectiveFrameRate > 0) {
        frameBasedEstimate = remainingFrames / effectiveFrameRate;
      }
    }

    // Combina as estimativas de forma ponderada
    let rawEstimate = null;
    if (speedBasedEstimate !== null && frameBasedEstimate !== null) {
      // 60% peso para velocidade declarada pelo FFmpeg, 40% para taxa de frames decorrida
      rawEstimate = speedBasedEstimate * 0.6 + frameBasedEstimate * 0.4;
    } else if (speedBasedEstimate !== null) {
      rawEstimate = speedBasedEstimate;
    } else if (frameBasedEstimate !== null) {
      rawEstimate = frameBasedEstimate;
    }

    // Suavização do tempo restante (filtra oscilações bruscas)
    let smoothedRemaining = null;
    if (rawEstimate !== null && rawEstimate >= 0 && rawEstimate < 86400 * 3) {
      this.remainingSamples.push(rawEstimate);
      if (this.remainingSamples.length > this.maxSamples) {
        this.remainingSamples.shift();
      }

      // Ordena para remover extremos (trimmed median)
      const sorted = [...this.remainingSamples].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      smoothedRemaining = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

      // Se já tínhamos um valor anterior, suaviza suavemente com peso exponencial
      if (this.lastRemainingSeconds !== null) {
        smoothedRemaining = this.lastRemainingSeconds * 0.7 + smoothedRemaining * 0.3;
      }
      this.lastRemainingSeconds = smoothedRemaining;
    }

    // Calcula tempo total estimado (decorrido + restante)
    let totalEstimatedSeconds = null;
    let completionFormatted = '';
    if (smoothedRemaining !== null && smoothedRemaining > 0) {
      totalEstimatedSeconds = elapsedSeconds + smoothedRemaining;

      const completionDate = new Date(now + smoothedRemaining * 1000);
      const hours = String(completionDate.getHours()).padStart(2, '0');
      const minutes = String(completionDate.getMinutes()).padStart(2, '0');
      completionFormatted = `aproximadamente às ${hours}:${minutes} (estimativa sujeita a variação)`;
    }

    // Classificação de desempenho pela velocidade real
    let speedRating = 'Normal';
    let isSlow = false;
    if (this.currentSmoothedSpeed > 0) {
      if (this.currentSmoothedSpeed < 0.1) {
        speedRating = 'Muito lento';
        isSlow = true;
      } else if (this.currentSmoothedSpeed < 0.5) {
        speedRating = 'Lento';
      } else if (this.currentSmoothedSpeed <= 1.5) {
        speedRating = 'Normal';
      } else {
        speedRating = 'Rápido';
      }
    }

    const speedRatingObj = {
      label: speedRating,
      className: isSlow ? 'badge-muito-lento' : (speedRating === 'Lento' ? 'badge-lento' : (speedRating === 'Normal' ? 'badge-normal' : 'badge-rapido')),
      slow: isSlow,
      toString() { return this.label; }
    };

    // Percentual real (prioridade: duração processada / duração total)
    let percent = 0;
    if (this.totalDuration > 0 && currentTime > 0) {
      percent = Math.min(99, Math.round((currentTime / this.totalDuration) * 100));
    } else if (this.totalFrames > 0 && frame > 0) {
      percent = Math.min(99, Math.round((frame / this.totalFrames) * 100));
    }

    // Formatações legíveis
    const elapsedFormatted = formatDuration(elapsedSeconds);

    let remainingFormatted = 'Calculando estimativa...';
    if (elapsedSeconds < 3 && !smoothedRemaining) {
      remainingFormatted = 'Calculando estimativa...';
    } else if (smoothedRemaining !== null && smoothedRemaining > 0) {
      remainingFormatted = formatDuration(smoothedRemaining);
    } else if (percent > 95) {
      remainingFormatted = 'Finalizando arquivo...';
    }

    const totalEstimatedFormatted = totalEstimatedSeconds !== null
      ? formatDuration(totalEstimatedSeconds)
      : 'Calculando...';

    const speedFormatted = this.currentSmoothedSpeed > 0
      ? `${this.currentSmoothedSpeed.toFixed(this.currentSmoothedSpeed < 0.1 ? 4 : 2)}x`
      : (rawSpeed > 0 ? `${rawSpeed.toFixed(2)}x` : '-');

    const frameFormatted = this.totalFrames > 0
      ? `${frame.toLocaleString('pt-BR')} / ${this.totalFrames.toLocaleString('pt-BR')}`
      : `${frame.toLocaleString('pt-BR')}`;

    return {
      elapsedSeconds,
      elapsedFormatted,
      remainingSeconds: smoothedRemaining,
      remainingFormatted,
      totalEstimatedSeconds,
      totalEstimatedFormatted,
      completionFormatted,
      currentSpeed: this.currentSmoothedSpeed || rawSpeed,
      speedFormatted,
      speedRating: speedRatingObj,
      isSlow,
      frame,
      totalFrames: this.totalFrames,
      frameFormatted,
      percent,
      currentTime,
      totalDuration: this.totalDuration
    };
  }
}
