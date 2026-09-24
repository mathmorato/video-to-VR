/**
 * VR Video Converter
 * Version: v.1.0.3
 *
 * ffmpeg.js - Gerenciador do FFmpeg Web Worker na thread principal
 * Responsável por gerenciar o ciclo de vida do Worker, timeouts, cancelamento,
 * rastreamento formal de status (estados), conversão de ArrayBuffer e liberação de recursos.
 */

export class FFmpegManager {
  constructor() {
    /** @type {Worker|null} */
    this.worker = null;
    this.isLoaded = false;
    this.isConverting = false;
    /** @type {'not_loaded'|'loading'|'validating'|'ready'|'processing'|'error'} */
    this.statusState = 'not_loaded';
    this.currentReject = null;
    this.currentResolve = null;
    this.activeObjectUrls = new Set();
    this.globalStatusListeners = new Set();
  }

  /**
   * Registra um ouvinte para alterações globais de estado do FFmpeg
   * @param {Function} listener
   */
  onStatusChange(listener) {
    if (typeof listener === 'function') {
      this.globalStatusListeners.add(listener);
      listener(this.getStatusLabel(), this.statusState);
    }
  }

  /**
   * Retorna o texto formatado do estado atual do FFmpeg
   * @returns {string}
   */
  getStatusLabel() {
    switch (this.statusState) {
      case 'not_loaded': return 'FFmpeg: não carregado';
      case 'loading': return 'FFmpeg: carregando';
      case 'validating': return 'FFmpeg: validando WebAssembly';
      case 'ready': return 'FFmpeg: pronto';
      case 'processing': return 'FFmpeg: processando';
      case 'error': return 'FFmpeg: erro';
      default: return 'FFmpeg: desconhecido';
    }
  }

  /**
   * Atualiza o estado interno e notifica ouvintes
   * @private
   */
  _setState(state, customMessage) {
    this.statusState = state;
    const label = customMessage || this.getStatusLabel();
    for (const listener of this.globalStatusListeners) {
      try {
        listener(label, state);
      } catch (_) {}
    }
  }

  /**
   * Inicializa o Web Worker e carrega o FFmpeg
   * @param {Function} [onStatus]
   * @returns {Promise<void>}
   */
  async init(onStatus) {
    if (this.isLoaded && this.worker) {
      return;
    }

    this._setState('loading', 'FFmpeg: carregando');

    return new Promise((resolve, reject) => {
      this._createWorker();

      const handleInitMessage = (event) => {
        const { type, message, state, error } = event.data;

        if (type === 'STATUS') {
          if (state) this._setState(state, message);
          if (onStatus) onStatus(message, state);
        }

        if (type === 'LOADED') {
          this.isLoaded = true;
          this._setState('ready', 'FFmpeg: pronto');
          this.worker.removeEventListener('message', handleInitMessage);
          resolve();
        }

        if (type === 'ERROR' && event.data.fatal) {
          this._setState('error', 'FFmpeg: erro');
          this.worker.removeEventListener('message', handleInitMessage);
          reject(new Error(error));
        }
      };

      this.worker.addEventListener('message', handleInitMessage);
      this.worker.postMessage({
        type: 'INIT',
        data: { basePath: '../lib/ffmpeg/' }
      });
    });
  }

  /**
   * Cria uma nova instância de Worker
   * @private
   */
  _createWorker() {
    if (this.worker) {
      this.worker.terminate();
    }
    this.worker = new Worker('js/ffmpeg-worker.js');
    this.worker.onerror = (e) => {
      console.error('[FFmpegManager] Erro no Worker:', e);
      if (this.currentReject) {
        this.currentReject(new Error(`Erro fatal no Worker: ${e.message || 'desconhecido'}`));
        this.currentReject = null;
        this.currentResolve = null;
        this.isConverting = false;
      }
    };
  }

  /**
   * Executa a conversão de um arquivo de vídeo
   * @param {Object} options
   * @param {Uint8Array} options.inputData
   * @param {string} options.inputFileName
   * @param {string} options.outputFileName
   * @param {string[]} options.ffmpegArgs
   * @param {number} options.videoDuration
   * @param {Function} [onProgress]
   * @param {Function} [onLog]
   * @param {Function} [onStatus]
   * @returns {Promise<{ blob: Blob, url: string, outputFileName: string, size: number }>}
   */
  async convert(options, onProgress, onLog, onStatus) {
    if (this.isConverting) {
      throw new Error('Uma conversão já está em andamento.');
    }

    if (!this.isLoaded) {
      await this.init(onStatus);
    }

    this.isConverting = true;

    return new Promise((resolve, reject) => {
      this.currentResolve = resolve;
      this.currentReject = reject;

      const messageHandler = (event) => {
        const { type } = event.data;

        switch (type) {
          case 'STATUS':
            if (onStatus) onStatus(event.data.message);
            break;

          case 'LOG':
            if (onLog) onLog(event.data.message);
            break;

          case 'PROGRESS':
            if (onProgress) onProgress(event.data);
            break;

          case 'SUCCESS': {
            this.isConverting = false;
            this.worker.removeEventListener('message', messageHandler);

            const { outputData, outputFileName, size } = event.data;
            const mimeType = outputFileName.endsWith('.webm') ? 'video/webm' : 'video/mp4';
            const blob = new Blob([outputData], { type: mimeType });
            const url = URL.createObjectURL(blob);
            this.activeObjectUrls.add(url);

            this.currentResolve = null;
            this.currentReject = null;

            resolve({
              blob,
              url,
              outputFileName,
              size
            });
            break;
          }

          case 'ERROR': {
            this.isConverting = false;
            this.worker.removeEventListener('message', messageHandler);

            const err = new Error(event.data.error || 'Erro desconhecido na conversão.');
            this.currentResolve = null;
            this.currentReject = null;
            reject(err);
            break;
          }
        }
      };

      this.worker.addEventListener('message', messageHandler);

      // Envia os dados para o Worker com transferência de buffer
      this.worker.postMessage({
        type: 'CONVERT',
        data: {
          inputData: options.inputData,
          inputFileName: options.inputFileName,
          outputFileName: options.outputFileName,
          ffmpegArgs: options.ffmpegArgs,
          videoDuration: options.videoDuration
        }
      }, [options.inputData.buffer]);
    });
  }

  /**
   * Cancela imediatamente a conversão em andamento
   */
  cancel() {
    if (!this.isConverting && !this.worker) {
      return;
    }

    console.log('[FFmpegManager] Cancelando conversão...');

    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    this.isLoaded = false;
    this.isConverting = false;

    if (this.currentReject) {
      this.currentReject(new Error('Conversão cancelada pelo usuário.'));
      this.currentReject = null;
      this.currentResolve = null;
    }

    // Reinicia o worker em plano de fundo para a próxima conversão
    this._createWorker();
  }

  /**
   * Revoga todas as URLs criadas para liberar memória
   */
  revokeUrls() {
    for (const url of this.activeObjectUrls) {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {}
    }
    this.activeObjectUrls.clear();
  }

  /**
   * Revoga uma URL específica
   * @param {string} url
   */
  revokeUrl(url) {
    if (this.activeObjectUrls.has(url)) {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {}
      this.activeObjectUrls.delete(url);
    }
  }
}

// Instância singleton para uso em todo o aplicativo
export const ffmpegManager = new FFmpegManager();
