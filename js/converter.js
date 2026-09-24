/**
 * VR Video Converter
 * Version: v.1.0.1
 *
 * converter.js - Orquestrador de conversão de vídeo
 * Responsável pela validação de parâmetros, montagem programática dos comandos
 * FFmpeg, leitura do arquivo em memória e despacho para o FFmpegManager.
 */

import { ffmpegManager } from './ffmpeg.js';
import { buildVRFilter, validateVRConfiguration, getQualityArgs } from './vr-processing.js';
import { buildOutputFileName } from './utils.js';

/**
 * Valida o arquivo e as configurações antes de disparar o FFmpeg
 * @param {File} file
 * @param {Object} options
 * @param {Object} [metadata]
 * @returns {{ valid: boolean, error?: string, warnings?: string[] }}
 */
export function validateConversionParams(file, options, metadata = {}) {
  if (!file) {
    return { valid: false, error: 'Nenhum arquivo de vídeo foi selecionado.' };
  }

  if (file.size === 0) {
    return { valid: false, error: 'O arquivo selecionado está vazio (0 bytes).' };
  }

  // Alerta preventivo de memória para WebAssembly em navegadores (limite seguro ~2GB)
  if (file.size > 2 * 1024 * 1024 * 1024) {
    return {
      valid: false,
      error: 'O arquivo é maior que 2 GB. O WebAssembly no navegador possui limites de memória virtual de 2 GB. Selecione um arquivo menor ou reduza a duração.'
    };
  }

  if (!options) {
    return { valid: false, error: 'As configurações de conversão são inválidas.' };
  }

  const validFormats = ['sbs_half', 'sbs_full', 'top_bottom', 'cardboard', 'vr180', 'vr360'];
  if (!validFormats.includes(options.outputFormat)) {
    return { valid: false, error: `Formato de saída '${options.outputFormat}' inválido.` };
  }

  const vrValidation = validateVRConfiguration(options, metadata);
  if (!vrValidation.valid) {
    return { valid: false, error: vrValidation.errors.join(' ') };
  }

  return { valid: true, warnings: vrValidation.warnings };
}

/**
 * Constrói a lista programática de argumentos para o FFmpeg
 * @param {Object} params
 * @returns {{ args: string[], outputFileName: string, targetWidth: number, targetHeight: number }}
 */
export function buildFFmpegCommand(params) {
  const {
    inputFileName,
    inputWidth,
    inputHeight,
    videoType,
    projection,
    stereoscopy,
    outputFormat,
    outputLayout,
    resolution,
    customWidth,
    customHeight,
    fps,
    codec,
    audio,
    quality,
    customCrf,
    fisheyeParams
  } = params;

  // Determina layout de saída efetivo
  const layout = outputLayout || (outputFormat === 'top_bottom' ? 'top_bottom' :
    (outputFormat === 'sbs_full' ? 'sbs_full' : 'sbs_half'));

  // 1. Gera o filtro de vídeo espacial VR unificado (SBS, Split, Scale, TB)
  const { filter, targetWidth, targetHeight } = buildVRFilter({
    inputWidth,
    inputHeight,
    videoType,
    projection,
    stereoscopy,
    outputLayout: layout,
    resolution,
    customWidth,
    customHeight,
    fisheyeParams
  });

  // 2. Determina o nome do arquivo de saída
  const ext = codec === 'vp9' ? 'webm' : 'mp4';
  const outputFileName = buildOutputFileName(inputFileName, outputFormat, videoType, ext);

  // 3. Monta os argumentos programaticamente como array
  const args = [
    '-i', inputFileName,
    '-vf', filter
  ];

  // Configuração de FPS
  if (fps && fps !== 'original') {
    args.push('-r', String(fps));
  }

  // Configuração de Codec de Vídeo
  if (codec === 'h265') {
    args.push('-c:v', 'libx265', '-tag:v', 'hvc1');
  } else if (codec === 'vp9') {
    args.push('-c:v', 'libvpx-vp9');
  } else {
    // Padrão universal H.264
    args.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p');
  }

  // Configuração de Qualidade (CRF + Preset)
  const qualityArgs = getQualityArgs(quality, customCrf);
  args.push(...qualityArgs);

  // Configuração de Áudio
  if (audio === 'remove') {
    args.push('-an');
  } else {
    // AAC estéreo compatível
    args.push('-c:a', 'aac', '-b:a', '128k', '-ac', '2');
  }

  // Força flag faststart para permitir streaming e preview imediato
  if (ext === 'mp4') {
    args.push('-movflags', '+faststart');
  }

  // Sobrescrever se existir
  args.push('-y', outputFileName);

  return {
    args,
    outputFileName,
    targetWidth,
    targetHeight
  };
}

/**
 * Executa todo o processo de conversão
 * @param {File} file
 * @param {Object} metadata
 * @param {Object} options
 * @param {Function} [onProgress]
 * @param {Function} [onLog]
 * @param {Function} [onStatus]
 * @returns {Promise<{ blob: Blob, url: string, outputFileName: string, size: number, targetWidth: number, targetHeight: number }>}
 */
export async function convertVideo(file, metadata, options, onProgress, onLog, onStatus) {
  // Validação preliminar
  const validation = validateConversionParams(file, options, metadata);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  if (onStatus) onStatus('Lendo arquivo de vídeo em memória local...');

  // Lê o arquivo como ArrayBuffer
  const buffer = await file.arrayBuffer();
  const inputData = new Uint8Array(buffer);

  // Sanitiza nome temporário do arquivo de entrada no sistema virtual
  const inputExtension = file.name.split('.').pop() || 'mp4';
  const virtualInputName = `input_${Date.now()}.${inputExtension}`;

  // Monta comando
  const { args, outputFileName, targetWidth, targetHeight } = buildFFmpegCommand({
    inputFileName: virtualInputName,
    inputWidth: metadata.width,
    inputHeight: metadata.height,
    videoType: options.videoType,
    projection: options.projection,
    stereoscopy: options.stereoscopy,
    outputFormat: options.outputFormat,
    outputLayout: options.outputLayout,
    resolution: options.resolution,
    customWidth: options.customWidth,
    customHeight: options.customHeight,
    fps: options.fps,
    codec: options.codec,
    audio: options.audio,
    quality: options.quality,
    customCrf: options.customCrf,
    fisheyeParams: options.fisheyeParams
  });

  console.log('[Converter] Comando gerado:', args.join(' '));

  // Executa no FFmpeg Web Worker
  const result = await ffmpegManager.convert({
    inputData,
    inputFileName: virtualInputName,
    outputFileName,
    ffmpegArgs: args,
    videoDuration: metadata.duration
  }, onProgress, onLog, onStatus);

  // Validação de integridade estrita (Seção 53)
  if (!result || !result.blob || result.blob.size === 0 || result.size === 0) {
    throw new Error('Falha de integridade: O arquivo gerado pelo conversor possui 0 bytes.');
  }

  return {
    ...result,
    targetWidth,
    targetHeight
  };
}

/**
 * Cancela a conversão atual
 */
export function cancelConversion() {
  ffmpegManager.cancel();
}
