/**
 * VR Video Converter
 * Version: v.1.0.4
 *
 * utils.js - Funções utilitárias auxiliares
 */

/**
 * Formata bytes em formato legível (KB, MB, GB)
 * @param {number} bytes
 * @param {number} decimals
 * @returns {string}
 */
export function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Formata segundos em formato HH:MM:SS ou MM:SS
 * @param {number} seconds
 * @returns {string}
 */
export function formatDuration(seconds) {
  if (isNaN(seconds) || seconds === null || seconds === undefined) return '00:00';
  const sec = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(sec / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  const secs = sec % 60;

  const pad = (n) => String(n).padStart(2, '0');

  if (hrs > 0) {
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}

/**
 * Calcula a proporção de aspecto simplificada (Ex: 16:9, 2:1, 4:3, 1:1)
 * @param {number} width
 * @param {number} height
 * @returns {string}
 */
export function calculateAspectRatio(width, height) {
  if (!width || !height) return 'Desconhecida';

  // Maior divisor comum
  const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(width, height);
  const ratioW = width / divisor;
  const ratioH = height / divisor;

  // Verifica aproximações conhecidas de vídeo
  const floatRatio = width / height;
  if (Math.abs(floatRatio - 2.0) < 0.05) return '2:1 (Equirretangular 360)';
  if (Math.abs(floatRatio - 1.0) < 0.05) return '1:1 (Quadrado / Top-Bottom)';
  if (Math.abs(floatRatio - 16 / 9) < 0.05) return '16:9';
  if (Math.abs(floatRatio - 4 / 3) < 0.05) return '4:3';
  if (Math.abs(floatRatio - 32 / 9) < 0.05) return '32:9 (SBS)';

  if (ratioW <= 32 && ratioH <= 32) {
    return `${ratioW}:${ratioH}`;
  }

  return `${floatRatio.toFixed(2)}:1`;
}

/**
 * Converte string de tempo do FFmpeg (ex: 00:01:23.45) para segundos
 * @param {string} timeStr
 * @returns {number}
 */
export function parseFFmpegTime(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(':');
  if (parts.length === 3) {
    const hours = parseFloat(parts[0]) || 0;
    const minutes = parseFloat(parts[1]) || 0;
    const seconds = parseFloat(parts[2]) || 0;
    return hours * 3600 + minutes * 60 + seconds;
  }
  return 0;
}

/**
 * Constrói o nome de arquivo de saída de acordo com o padrão exigido na V3
 * Ex: video.mp4 -> video_VR_SBS.mp4, video_VR_360_SBS.mp4, video_VR_360_TB.mp4, video_Cardboard_SBS.mp4
 * @param {string} originalName
 * @param {string} outputFormat ('sbs_half' | 'sbs_full' | 'top_bottom' | 'cardboard' | 'vr180' | 'vr360')
 * @param {string} videoType ('2d' | '180' | '360')
 * @param {string} [extension='mp4']
 * @returns {string}
 */
export function buildOutputFileName(originalName, outputFormat, videoType, extension = 'mp4') {
  const baseName = originalName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');

  let suffix = 'VR_SBS';

  if (outputFormat === 'cardboard') {
    suffix = 'Cardboard_SBS';
  } else if (outputFormat === 'top_bottom') {
    if (videoType === '360') {
      suffix = 'VR_360_TB';
    } else if (videoType === '180') {
      suffix = 'VR_180_TB';
    } else {
      suffix = 'VR_TB';
    }
  } else if (videoType === '360' || outputFormat === 'vr360') {
    suffix = outputFormat === 'sbs_full' ? 'VR_360_SBS_Full' : 'VR_360_SBS';
  } else if (videoType === '180' || outputFormat === 'vr180') {
    suffix = outputFormat === 'sbs_full' ? 'VR_180_SBS_Full' : 'VR_180_SBS';
  } else if (outputFormat === 'sbs_full') {
    suffix = 'VR_SBS_Full';
  } else {
    suffix = 'VR_SBS';
  }

  return `${baseName}_${suffix}.${extension}`;
}

/**
 * Sanitiza texto para inserção segura no DOM
 * @param {string} text
 * @returns {string}
 */
export function sanitizeText(text) {
  if (typeof text !== 'string') return '';
  return text.replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[m]);
}

/**
 * Atalho seletor de elemento único
 * @param {string} selector
 * @param {Element|Document} context
 * @returns {Element|null}
 */
export const $ = (selector, context = document) => context.querySelector(selector);

/**
 * Atalho seletor de múltiplos elementos
 * @param {string} selector
 * @param {Element|Document} context
 * @returns {NodeListOf<Element>}
 */
export const $$ = (selector, context = document) => context.querySelectorAll(selector);
