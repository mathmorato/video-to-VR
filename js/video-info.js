/**
 * VR Video Converter
 * Version: v.1.0.1
 *
 * video-info.js - Extração de metadados e detecção de tipo de vídeo
 */

import { calculateAspectRatio } from './utils.js';

/**
 * @typedef {Object} VideoMetadata
 * @property {string} name - Nome do arquivo
 * @property {number} size - Tamanho em bytes
 * @property {string} format - Extensão ou MIME type
 * @property {number} duration - Duração em segundos
 * @property {number} width - Largura em pixels
 * @property {number} height - Altura em pixels
 * @property {number} fps - Taxa de quadros estimada
 * @property {string} aspectRatio - Proporção de aspecto
 * @property {string} detectedType - Tipo sugerido (2d, 180, 360, unknown)
 * @property {string} detectedStereo - Estereoscopia sugerida (mono, sbs, tb)
 * @property {string} detectionReason - Justificativa da sugestão
 */

/**
 * Lê os metadados de um arquivo de vídeo via HTMLVideoElement
 * @param {File} file
 * @returns {Promise<VideoMetadata>}
 */
export async function extractVideoMetadata(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('video/') && !isVideoExtension(file.name)) {
      reject(new Error('O arquivo selecionado não é um vídeo válido.'));
      return;
    }

    const video = document.createElement('video');
    video.preload = 'metadata';
    video.playsInline = true;
    video.muted = true;

    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;

    const timeoutId = setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Tempo limite excedido ao ler os metadados do vídeo.'));
    }, 15000);

    video.onloadedmetadata = async () => {
      clearTimeout(timeoutId);

      const width = video.videoWidth || 0;
      const height = video.videoHeight || 0;
      const duration = video.duration || 0;
      const aspectRatio = calculateAspectRatio(width, height);

      // Estima FPS de forma leve
      const fps = await estimateVideoFps(video, duration);

      const ext = file.name.split('.').pop()?.toUpperCase() || 'MP4';

      const detection = detectVideoType({
        fileName: file.name,
        width,
        height,
        duration,
        aspectRatio
      });

      URL.revokeObjectURL(objectUrl);

      resolve({
        name: file.name,
        size: file.size,
        format: ext,
        duration,
        width,
        height,
        fps,
        aspectRatio,
        detectedType: detection.type,
        detectedStereo: detection.stereoscopy,
        detectionReason: detection.reason
      });
    };

    video.onerror = () => {
      clearTimeout(timeoutId);
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Não foi possível decodificar os metadados do vídeo. Formato ou codec incompatível no navegador.'));
    };
  });
}

/**
 * Verifica extensão de arquivo de vídeo comum
 * @param {string} fileName
 * @returns {boolean}
 */
function isVideoExtension(fileName) {
  const validExts = ['.mp4', '.mov', '.webm', '.mkv', '.avi', '.m4v', '.3gp', '.ts'];
  const lower = fileName.toLowerCase();
  return validExts.some(ext => lower.endsWith(ext));
}

/**
 * Estima a taxa de quadros (FPS) aproximada
 * @param {HTMLVideoElement} video
 * @param {number} duration
 * @returns {Promise<number>}
 */
async function estimateVideoFps(video, duration) {
  // Padrão seguro para a web caso não consiga aferir
  const defaultFps = 30;

  // Se o navegador suporta requestVideoFrameCallback
  if ('requestVideoFrameCallback' in video && duration > 0.5) {
    return new Promise((resolve) => {
      let frameCount = 0;
      let startTime = 0;
      let timeout;

      const onFrame = (now, metadata) => {
        if (startTime === 0) startTime = now;
        frameCount++;

        if (frameCount >= 10 || (now - startTime) > 300) {
          const elapsedSec = (now - startTime) / 1000;
          const calculatedFps = Math.round(frameCount / elapsedSec);
          video.pause();
          clearTimeout(timeout);
          // Normaliza para framerates de vídeo padrão conhecidos
          resolve(normalizeFps(calculatedFps));
          return;
        }
        video.requestVideoFrameCallback(onFrame);
      };

      timeout = setTimeout(() => {
        video.pause();
        resolve(defaultFps);
      }, 500);

      video.currentTime = Math.min(0.5, duration / 2);
      video.play().then(() => {
        video.requestVideoFrameCallback(onFrame);
      }).catch(() => {
        clearTimeout(timeout);
        resolve(defaultFps);
      });
    });
  }

  return defaultFps;
}

/**
 * Normaliza valores de FPS aproximados para valores padrão de vídeo
 * @param {number} fps
 * @returns {number}
 */
function normalizeFps(fps) {
  if (fps >= 58 && fps <= 62) return 60;
  if (fps >= 48 && fps <= 52) return 50;
  if (fps >= 28 && fps <= 31) return 30;
  if (fps >= 23 && fps <= 26) return 24;
  if (fps > 0) return Math.round(fps);
  return 30;
}

/**
 * Detecta sugestão de tipo de vídeo (2D, 180°, 360°, unknown) com base em heurísticas.
 * ATENÇÃO (Regra V3): A detecção nunca é considerada certeza absoluta e serve apenas como sugestão.
 * @param {Object} metadata
 * @returns {{ type: '2d'|'180'|'360'|'unknown', confidence: 'high'|'medium'|'low', projection: string, stereoscopy: 'mono'|'sbs'|'tb', reason: string }}
 */
export function detectVideoType(metadata) {
  const { fileName = '', width = 0, height = 0 } = metadata;
  const name = fileName.toLowerCase();

  // 1. Verificação por nome de arquivo (padrão de câmeras VR comuns: Insta360, GoPro Max, VR180)
  if (name.includes('360') || name.includes('sphere') || name.includes('pano')) {
    if (name.includes('tb') || name.includes('ou') || name.includes('overunder') || name.includes('topbottom')) {
      return {
        type: '360',
        confidence: 'high',
        projection: 'equirectangular',
        stereoscopy: 'tb',
        reason: 'Nome do arquivo sugere vídeo 360° estereoscópico Top-and-Bottom.'
      };
    }
    if (name.includes('sbs') || name.includes('half-sbs')) {
      return {
        type: '360',
        confidence: 'high',
        projection: 'equirectangular',
        stereoscopy: 'sbs',
        reason: 'Nome do arquivo sugere vídeo 360° estereoscópico Side-by-Side.'
      };
    }
    return {
      type: '360',
      confidence: 'medium',
      projection: 'equirectangular',
      stereoscopy: 'mono',
      reason: 'Nome do arquivo sugere possível vídeo panorâmico 360°.'
    };
  }

  if (name.includes('180') || name.includes('vr180')) {
    if (name.includes('sbs')) {
      return {
        type: '180',
        confidence: 'high',
        projection: 'equirectangular',
        stereoscopy: 'sbs',
        reason: 'Nome do arquivo sugere formato VR 180° Side-by-Side.'
      };
    }
    if (name.includes('tb') || name.includes('topbottom')) {
      return {
        type: '180',
        confidence: 'high',
        projection: 'equirectangular',
        stereoscopy: 'tb',
        reason: 'Nome do arquivo sugere formato VR 180° Top-and-Bottom.'
      };
    }
    return {
      type: '180',
      confidence: 'medium',
      projection: 'equirectangular',
      stereoscopy: 'mono',
      reason: 'Nome do arquivo sugere possível formato VR 180°.'
    };
  }

  // 2. Verificação por resolução e proporção geométrica
  if (width > 0 && height > 0) {
    const ratio = width / height;

    // Proporção 2:1 exata ou próxima (ex: 3840x1920, 4096x2048, 1920x960) é o padrão equirretangular 360° mono
    if (Math.abs(ratio - 2.0) < 0.05 && width >= 1280) {
      return {
        type: '360',
        confidence: 'medium',
        projection: 'equirectangular',
        stereoscopy: 'mono',
        reason: 'Detectado possivelmente como 360° equirretangular (proporção 2:1). Confirme a configuração abaixo.'
      };
    }

    // Proporção 1:1 com alta resolução (ex: 3840x3840, 2880x2880) frequentemente é 360° estereoscópico Top-and-Bottom
    if (Math.abs(ratio - 1.0) < 0.05 && width >= 1280) {
      return {
        type: '360',
        confidence: 'medium',
        projection: 'equirectangular',
        stereoscopy: 'tb',
        reason: 'Detectado possivelmente como 360° Top-and-Bottom (proporção 1:1). Confirme a configuração abaixo.'
      };
    }

    // Proporção ultra-wide 32:9 ou ~3.55:1 (ex: 3840x1080) sugere SBS
    if (Math.abs(ratio - (32 / 9)) < 0.1) {
      return {
        type: '2d',
        confidence: 'medium',
        projection: 'equirectangular',
        stereoscopy: 'sbs',
        reason: 'Detectado possivelmente como vídeo já formatado em Side-by-Side (proporção 32:9).'
      };
    }

    // Vídeo 16:9 tradicional (ex: 1920x1080, 1280x720, 3840x2160)
    if (Math.abs(ratio - (16 / 9)) < 0.05) {
      return {
        type: '2d',
        confidence: 'medium',
        projection: 'equirectangular',
        stereoscopy: 'mono',
        reason: 'Detectado possivelmente como 2D convencional (proporção 16:9).'
      };
    }
  }

  return {
    type: '2d',
    confidence: 'low',
    projection: 'equirectangular',
    stereoscopy: 'mono',
    reason: 'Vídeo detectado preliminarmente como 2D monoscópico. O usuário pode alterar livremente.'
  };
}
