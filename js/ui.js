/**
 * VR Video Converter
 * Version: v.1.0.4
 *
 * ui.js - Gerenciador de interface de usuário e eventos DOM
 */

import { formatBytes, formatDuration, $ } from './utils.js';
import { PRESETS } from './vr-processing.js';
import {
  SVG_HOURGLASS,
  SVG_CHECK,
  SVG_ERROR,
  SVG_WARNING,
  SVG_INFO,
  SVG_LIGHTBULB,
  SVG_CANCEL
} from './icons.js';

export class UIManager {
  constructor() {
    this.elements = {};
    this.currentMetadata = null;
    this.currentConversionState = 'idle';
    this._cacheElements();
  }

  /**
   * Armazena referências dos elementos DOM principais
   * @private
   */
  _cacheElements() {
    this.elements = {
      // Área de upload
      dropzone: $('#dropzone'),
      fileInput: $('#file-input'),
      selectBtn: $('#select-btn'),

      // Seções
      sectionInfo: $('#section-info'),
      sectionConfig: $('#section-config'),
      sectionProgress: $('#section-progress'),
      sectionResult: $('#section-result'),

      // Preview de entrada
      inputPreviewVideo: $('#input-preview-video'),
      previewPlaceholder: $('#preview-placeholder'),

      // Informações do vídeo
      infoFileName: $('#info-file-name'),
      infoFileSize: $('#info-file-size'),
      infoFormat: $('#info-format'),
      infoDuration: $('#info-duration'),
      infoResolution: $('#info-resolution'),
      infoFps: $('#info-fps'),
      infoAspect: $('#info-aspect'),
      infoDetectionNotice: $('#info-detection-notice'),

      // Configurações básicas
      selectPreset: $('#select-preset'),
      selectVideoType: $('#select-video-type'),
      selectOutputFormat: $('#select-output-format'),
      selectResolution: $('#select-resolution'),
      customResWrapper: $('#custom-res-wrapper'),
      customWidth: $('#custom-width'),
      customHeight: $('#custom-height'),
      selectFps: $('#select-fps'),
      selectCodec: $('#select-codec'),
      selectAudio: $('#select-audio'),
      selectQuality: $('#select-quality'),
      customQualityWrapper: $('#custom-quality-wrapper'),
      customCrf: $('#custom-crf'),
      presetDescription: $('#preset-description'),

      // Configuração VR Avançada
      sectionAdvancedVr: $('#section-advanced-vr'),
      groupProjection: $('#group-projection'),
      selectProjection: $('#select-projection'),
      groupStereoscopy: $('#group-stereoscopy'),
      selectStereoscopy: $('#select-stereoscopy'),
      groupFov: $('#group-fov'),
      inputFov: $('#input-fov'),
      groupFisheyeCalib: $('#group-fisheye-calib'),
      fisheyeCenterX: $('#fisheye-center-x'),
      fisheyeCenterY: $('#fisheye-center-y'),
      fisheyeRadius: $('#fisheye-radius'),
      fisheyeLensFov: $('#fisheye-lens-fov'),

      // Painel de Metadados VR
      vrMetadataPanel: $('#vr-metadata-panel'),
      tagMetaType: $('#tag-meta-type'),
      tagMetaProj: $('#tag-meta-proj'),
      tagMetaStereo: $('#tag-meta-stereo'),
      tagMetaLayout: $('#tag-meta-layout'),

      // Avisos
      stereoscopyNotice: $('#stereoscopy-notice'),
      projectionNotice: $('#projection-notice'),
      upscaleNotice: $('#upscale-notice'),

      // Botões principais
      btnConvert: $('#btn-convert'),
      btnCancel: $('#btn-cancel'),
      btnDownload: $('#btn-download'),
      btnNewConversion: $('#btn-new-conversion'),
      btnOpenVrViewer: $('#btn-open-vr-viewer'),
      btnOpenCardboard: $('#btn-open-cardboard'),

      // Progresso e Ampulheta
      progressIconWrap: $('#progress-icon-wrap'),
      conversionHourglass: $('#conversion-hourglass'),
      progressBarFill: $('#progress-bar-fill'),
      progressPercent: $('#progress-percent'),
      progressStatusText: $('#progress-status-text'),
      progressElapsed: $('#progress-elapsed'),
      progressRemaining: $('#progress-remaining'),
      progressTotalEst: $('#progress-total-est'),
      progressSpeed: $('#progress-speed'),
      progressSpeedBadge: $('#progress-speed-badge'),
      progressSlowNotice: $('#progress-slow-notice'),
      progressFrame: $('#progress-frame'),
      progressCompletionContainer: $('#progress-completion-container'),
      progressCompletionTime: $('#progress-completion-time'),
      logOutput: $('#log-output'),
      logToggleBtn: $('#log-toggle-btn'),
      logContainer: $('#log-container'),

      // Modal de Conversão Pesada
      modalHeavyConversion: $('#modal-heavy-conversion'),
      heavyVideoDetails: $('#heavy-video-details'),
      btnHeavyContinue: $('#btn-heavy-continue'),
      btnHeavyRecommend: $('#btn-heavy-recommend'),
      btnHeavyCancel: $('#btn-heavy-cancel'),

      // Resultado
      resultPreviewVideo: $('#result-preview-video'),
      resultFileName: $('#result-file-name'),
      resultFormat: $('#result-format'),
      resultResolution: $('#result-resolution'),
      resultDuration: $('#result-duration'),
      resultSize: $('#result-size'),
      resultCodec: $('#result-codec'),
      resultLayout: $('#result-layout'),

      // Modal VR / Cardboard
      vrModal: $('#vr-modal'),
      vrModalClose: $('#vr-modal-close'),
      vrCanvasContainer: $('#vr-canvas-container'),
      vrOrientationPrompt: $('#vr-orientation-prompt'),
      vrCardboardToggle: $('#vr-cardboard-toggle'),
      vrGyroToggle: $('#vr-gyro-toggle'),
      vrResetViewBtn: $('#vr-reset-view-btn'),
      vrWebXrBtn: $('#vr-webxr-btn'),
      vrZoomSlider: $('#vr-zoom-slider'),
      vrZoomVal: $('#vr-zoom-val'),
      vrViewModeBadge: $('#vr-view-mode-badge')
    };
  }

  /**
   * Exibe informações do vídeo de entrada na interface
   * @param {Object} metadata
   */
  showVideoMetadata(metadata) {
    this.currentMetadata = metadata;
    this.elements.infoFileName.textContent = metadata.name;
    this.elements.infoFileSize.textContent = formatBytes(metadata.size);
    this.elements.infoFormat.textContent = metadata.format;
    this.elements.infoDuration.textContent = formatDuration(metadata.duration);
    this.elements.infoResolution.textContent = `${metadata.width} × ${metadata.height}`;
    this.elements.infoFps.textContent = `${metadata.fps} FPS`;
    this.elements.infoAspect.textContent = metadata.aspectRatio;

    if (metadata.detectionReason) {
      this.elements.infoDetectionNotice.innerHTML = `
        <span class="notice-icon" aria-hidden="true">${SVG_LIGHTBULB(18)}</span>
        <span>Sugestão automática: ${metadata.detectionReason}</span>
      `;
      this.elements.infoDetectionNotice.style.display = 'flex';
    } else {
      this.elements.infoDetectionNotice.style.display = 'none';
    }

    // Configura preview
    this.elements.sectionInfo.style.display = 'block';
    this.elements.sectionConfig.style.display = 'block';
    this.elements.btnConvert.disabled = false;

    this.updateContextualVisibility();
    this.updateVrMetadataPanel();
    this.updateUpscaleNotice();

    this.elements.sectionInfo.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /**
   * Aplica um preset na interface
   * @param {string} presetKey
   */
  applyPresetToForm(presetKey) {
    const preset = PRESETS[presetKey];
    if (!preset) return;

    if (this.elements.presetDescription) {
      this.elements.presetDescription.textContent = preset.description;
    }

    if (presetKey === 'custom') {
      return;
    }

    this.elements.selectOutputFormat.value = preset.outputFormat;
    this.elements.selectVideoType.value = preset.videoType;
    this.elements.selectProjection.value = preset.projection;
    this.elements.selectStereoscopy.value = preset.stereoscopy;
    this.elements.selectResolution.value = preset.resolution;
    this.elements.selectFps.value = preset.fps;
    this.elements.selectCodec.value = preset.codec;
    this.elements.selectAudio.value = preset.audio;
    this.elements.selectQuality.value = preset.quality;

    this.updateContextualVisibility();
    this.updateStereoscopyNotice();
    this.updateProjectionNotice();
    this.updateUpscaleNotice();
    this.updateVrMetadataPanel();
    this.toggleCustomResolutionInputs();
  }

  /**
   * Gerencia a visibilidade de campos conforme o tipo de vídeo selecionado
   */
  updateContextualVisibility() {
    const videoType = this.elements.selectVideoType.value;
    const proj = this.elements.selectProjection.value;

    if (videoType === '2d') {
      if (this.elements.groupProjection) this.elements.groupProjection.style.display = 'none';
      if (this.elements.groupFov) this.elements.groupFov.style.display = 'none';
      if (this.elements.groupFisheyeCalib) this.elements.groupFisheyeCalib.style.display = 'none';
    } else if (videoType === '180') {
      if (this.elements.groupProjection) this.elements.groupProjection.style.display = 'flex';
      if (this.elements.groupFov) this.elements.groupFov.style.display = 'flex';
      if (this.elements.groupFisheyeCalib) {
        this.elements.groupFisheyeCalib.style.display = proj.includes('fisheye') ? 'block' : 'none';
      }
    } else if (videoType === '360') {
      if (this.elements.groupProjection) this.elements.groupProjection.style.display = 'flex';
      if (this.elements.groupFov) this.elements.groupFov.style.display = 'none';
      if (this.elements.groupFisheyeCalib) {
        this.elements.groupFisheyeCalib.style.display = proj.includes('fisheye') ? 'block' : 'none';
      }
    }

    this.updateVrMetadataPanel();
  }

  /**
   * Atualiza as tags do painel de Metadados VR em tempo real
   */
  updateVrMetadataPanel() {
    const type = this.elements.selectVideoType.value.toUpperCase();
    const proj = this.elements.selectProjection.options[this.elements.selectProjection.selectedIndex]?.text || 'Equirretangular';
    const stereo = this.elements.selectStereoscopy.options[this.elements.selectStereoscopy.selectedIndex]?.text || 'Mono';
    const layout = this.elements.selectOutputFormat.options[this.elements.selectOutputFormat.selectedIndex]?.text || 'SBS Half';

    if (this.elements.tagMetaType) this.elements.tagMetaType.textContent = `Tipo: ${type}`;
    if (this.elements.tagMetaProj) this.elements.tagMetaProj.textContent = `Projeção: ${proj}`;
    if (this.elements.tagMetaStereo) this.elements.tagMetaStereo.textContent = `Estéreo Entrada: ${stereo}`;
    if (this.elements.tagMetaLayout) this.elements.tagMetaLayout.textContent = `Layout Saída: ${layout}`;
  }

  /**
   * Atualiza o aviso explicativo sobre estereoscopia
   */
  updateStereoscopyNotice() {
    const stereoscopy = this.elements.selectStereoscopy.value;
    const videoType = this.elements.selectVideoType.value;
    const notice = this.elements.stereoscopyNotice;

    if (stereoscopy === 'mono') {
      let desc = 'Este vídeo não contém informações estereoscópicas. Na saída SBS/TB, a imagem será duplicada para os dois olhos.';
      if (videoType === '360') {
        desc = 'Vídeo 360° monoscópico. A saída SBS duplica o mesmo panorama para ambos os olhos. Isso não cria profundidade estereoscópica real.';
      } else if (videoType === '180') {
        desc = 'Vídeo 180° monoscópico. A saída SBS duplica a imagem hemisférica para os dois olhos sem profundidade 3D.';
      } else {
        desc = 'Vídeo 2D convencional. A saída estéreo duplica a imagem plana, não criando profundidade 3D real.';
      }

      notice.innerHTML = `
        <span class="notice-icon" aria-hidden="true">${SVG_INFO(18)}</span>
        <span>${desc}</span>
      `;
      notice.style.display = 'flex';
    } else {
      notice.style.display = 'none';
    }
  }

  /**
   * Atualiza o aviso de projeção
   */
  updateProjectionNotice() {
    const proj = this.elements.selectProjection.value;
    const videoType = this.elements.selectVideoType.value;
    const notice = this.elements.projectionNotice;

    if (videoType !== '2d' && (proj === 'fisheye' || proj === 'dual_fisheye')) {
      notice.innerHTML = `
        <span class="notice-icon" aria-hidden="true">${SVG_WARNING(18)}</span>
        <span>Aviso: A projeção Fisheye requer parâmetros ópticos da câmera (calibração geométrica abaixo) e funciona em modo experimental.</span>
      `;
      notice.style.display = 'flex';
    } else {
      notice.style.display = 'none';
    }
  }

  /**
   * Atualiza o aviso de upscaling se a resolução alvo for maior que a original
   */
  updateUpscaleNotice() {
    if (!this.currentMetadata || !this.currentMetadata.width) {
      this.elements.upscaleNotice.style.display = 'none';
      return;
    }

    const res = this.elements.selectResolution.value;
    let targetW = 0;
    let targetH = 0;

    if (res === 'custom') {
      targetW = parseInt(this.elements.customWidth.value, 10) || 0;
      targetH = parseInt(this.elements.customHeight.value, 10) || 0;
    } else if (res !== 'original') {
      const parts = res.split('x');
      if (parts.length === 2) {
        targetW = parseInt(parts[0], 10);
        targetH = parseInt(parts[1], 10);
      }
    }

    if (targetW > this.currentMetadata.width || targetH > this.currentMetadata.height) {
      this.elements.upscaleNotice.innerHTML = `
        <span class="notice-icon" aria-hidden="true">${SVG_LIGHTBULB(18)}</span>
        <span>A resolução selecionada (${targetW}×${targetH}) é superior à original (${this.currentMetadata.width}×${this.currentMetadata.height}). Isso aumenta o tamanho do arquivo, mas não recupera detalhes ausentes na captura original.</span>
      `;
      this.elements.upscaleNotice.style.display = 'flex';
    } else {
      this.elements.upscaleNotice.style.display = 'none';
    }
  }

  /**
   * Exibe ou oculta campos de resolução customizada
   */
  toggleCustomResolutionInputs() {
    const isCustom = this.elements.selectResolution.value === 'custom';
    this.elements.customResWrapper.style.display = isCustom ? 'grid' : 'none';
    this.updateUpscaleNotice();
  }

  /**
   * Exibe ou oculta campo de CRF personalizado
   */
  toggleCustomQualityInputs() {
    const isCustom = this.elements.selectQuality.value === 'custom';
    this.elements.customQualityWrapper.style.display = isCustom ? 'block' : 'none';
  }

  /**
   * Coleta as opções preenchidas no formulário
   * @returns {Object}
   */
  getFormOptions() {
    const outputFormat = this.elements.selectOutputFormat.value;
    let outputLayout = 'sbs_half';

    if (outputFormat === 'top_bottom') {
      outputLayout = 'top_bottom';
    } else if (outputFormat === 'sbs_full') {
      outputLayout = 'sbs_full';
    } else if (outputFormat === 'cardboard') {
      outputLayout = 'sbs_half';
    }

    return {
      preset: this.elements.selectPreset.value,
      videoType: this.elements.selectVideoType.value,
      projection: this.elements.selectProjection.value,
      stereoscopy: this.elements.selectStereoscopy.value,
      outputFormat,
      outputLayout,
      resolution: this.elements.selectResolution.value,
      customWidth: parseInt(this.elements.customWidth.value, 10) || null,
      customHeight: parseInt(this.elements.customHeight.value, 10) || null,
      fps: this.elements.selectFps.value,
      codec: this.elements.selectCodec.value,
      audio: this.elements.selectAudio.value,
      quality: this.elements.selectQuality.value,
      customCrf: parseInt(this.elements.customCrf.value, 10) || 23,
      fov: parseFloat(this.elements.inputFov?.value) || 180,
      fisheyeParams: {
        centerX: parseFloat(this.elements.fisheyeCenterX?.value) || 50,
        centerY: parseFloat(this.elements.fisheyeCenterY?.value) || 50,
        radius: parseFloat(this.elements.fisheyeRadius?.value) || 50,
        fov: parseFloat(this.elements.fisheyeLensFov?.value) || 180
      }
    };
  }

  /**
   * Atualiza o estado visual da conversão e a ampulheta
   * Estados: idle, loading, processing, slow, finishing, completed, error, cancelled
   * @param {string} state
   * @param {string} [customMessage]
   */
  setConversionState(state, customMessage = '') {
    const iconWrap = this.elements.progressIconWrap;
    if (!iconWrap) return;

    const spinningStates = ['loading', 'processing', 'slow', 'finishing'];
    const isSpinningState = spinningStates.includes(state);
    const wasSpinningState = spinningStates.includes(this.currentConversionState);

    // Se a ampulheta já está girando e o novo estado também é de rotação,
    // apenas atualizamos a mensagem de status sem recriar o elemento SVG no DOM.
    // Isso impede que a animação CSS (conversion-hourglass-spin) trave ou reinicie do zero.
    if (isSpinningState && wasSpinningState) {
      this.currentConversionState = state;
      if (customMessage) {
        this.updateStatus(customMessage);
      }
      return;
    }

    // Se o estado não mudou, apenas atualiza a mensagem textual
    if (this.currentConversionState === state) {
      if (customMessage) {
        this.updateStatus(customMessage);
      }
      return;
    }

    this.currentConversionState = state;

    switch (state) {
      case 'loading':
        iconWrap.innerHTML = SVG_HOURGLASS(true, 24);
        this.updateStatus(customMessage || 'Carregando FFmpeg WebAssembly...');
        break;

      case 'processing':
        iconWrap.innerHTML = SVG_HOURGLASS(true, 24);
        this.updateStatus(customMessage || 'Processando vídeo...');
        break;

      case 'slow':
        iconWrap.innerHTML = SVG_HOURGLASS(true, 24);
        this.updateStatus(customMessage || 'Processamento lento em andamento...');
        break;

      case 'finishing':
        iconWrap.innerHTML = SVG_HOURGLASS(true, 24);
        this.updateStatus(customMessage || 'Finalizando arquivo...');
        break;

      case 'completed':
        iconWrap.innerHTML = SVG_CHECK('ui-icon text-success', 24);
        this.updateStatus(customMessage || 'Conversão concluída com sucesso!');
        this.elements.btnCancel.disabled = true;
        this.elements.btnConvert.disabled = false;
        break;

      case 'error':
        iconWrap.innerHTML = SVG_ERROR('ui-icon text-danger', 24);
        this.updateStatus(customMessage || 'Não foi possível concluir a conversão.');
        this.elements.btnCancel.disabled = true;
        this.elements.btnConvert.disabled = false;
        break;

      case 'cancelled':
        iconWrap.innerHTML = SVG_CANCEL('ui-icon text-danger', 24);
        this.updateStatus(customMessage || 'Conversão cancelada.');
        this.elements.btnCancel.disabled = true;
        this.elements.btnConvert.disabled = false;
        break;

      case 'idle':
      default:
        iconWrap.innerHTML = SVG_HOURGLASS(false, 24);
        if (customMessage) this.updateStatus(customMessage);
        break;
    }
  }

  /**
   * Prepara e exibe a seção de progresso
   */
  showProgress() {
    this.elements.sectionProgress.style.display = 'block';
    this.elements.btnConvert.disabled = true;
    this.elements.btnCancel.disabled = false;
    this.elements.progressBarFill.style.width = '0%';
    this.elements.progressPercent.textContent = '0%';
    this.elements.progressElapsed.textContent = '00:00';
    this.elements.progressRemaining.textContent = 'Calculando estimativa...';
    if (this.elements.progressTotalEst) {
      this.elements.progressTotalEst.textContent = 'Calculando estimativa...';
    }
    this.elements.progressSpeed.textContent = '-';
    if (this.elements.progressSpeedBadge) {
      this.elements.progressSpeedBadge.className = 'speed-badge badge-normal';
      this.elements.progressSpeedBadge.textContent = 'Normal';
    }
    if (this.elements.progressSlowNotice) {
      this.elements.progressSlowNotice.style.display = 'none';
    }
    if (this.elements.progressCompletionContainer) {
      this.elements.progressCompletionContainer.style.display = 'none';
    }
    this.elements.progressFrame.textContent = '-';
    this.elements.logOutput.textContent = '';

    this.setConversionState('loading', 'Inicializando conversão...');
    this.elements.sectionProgress.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /**
   * Atualiza a barra e métricas com base no objeto de métricas reais do TimeEstimator
   * @param {Object} metrics
   */
  updateProgress(metrics) {
    if (!metrics) return;

    const percent = Math.min(100, Math.max(0, metrics.percent || 0));
    this.elements.progressBarFill.style.width = `${percent}%`;
    this.elements.progressPercent.textContent = `${percent}%`;

    // Tempo decorrido
    if (metrics.elapsedFormatted) {
      this.elements.progressElapsed.textContent = metrics.elapsedFormatted;
    }

    // Tempo restante estimado
    if (this.elements.progressRemaining) {
      this.elements.progressRemaining.textContent = metrics.remainingFormatted || 'Calculando estimativa...';
    }

    // Tempo total estimado
    if (this.elements.progressTotalEst) {
      this.elements.progressTotalEst.textContent = metrics.totalEstimatedFormatted || 'Calculando...';
    }

    // Velocidade
    if (metrics.speed !== null && metrics.speed !== undefined) {
      const speedStr = metrics.speed < 0.1 ? metrics.speed.toFixed(4) : metrics.speed.toFixed(2);
      this.elements.progressSpeed.textContent = `${speedStr}x`;
    }

    // Selo de desempenho da velocidade
    if (this.elements.progressSpeedBadge && metrics.speedRating) {
      this.elements.progressSpeedBadge.className = `speed-badge ${metrics.speedRating.className}`;
      this.elements.progressSpeedBadge.textContent = metrics.speedRating.label;
    }

    // Aviso discreto para velocidade muito baixa (< 0.1x)
    if (this.elements.progressSlowNotice) {
      if (metrics.speedRating && metrics.speedRating.slow) {
        this.elements.progressSlowNotice.style.display = 'flex';
      } else {
        this.elements.progressSlowNotice.style.display = 'none';
      }
    }

    // Quadro atual / total
    if (this.elements.progressFrame) {
      if (metrics.totalFrames && metrics.frame) {
        this.elements.progressFrame.textContent = `${metrics.frame} / ${metrics.totalFrames}`;
      } else if (metrics.frame) {
        this.elements.progressFrame.textContent = String(metrics.frame);
      }
    }

    // Previsão de horário de conclusão
    if (this.elements.progressCompletionContainer && this.elements.progressCompletionTime) {
      if (metrics.completionEstimated) {
        this.elements.progressCompletionContainer.style.display = 'block';
        this.elements.progressCompletionTime.textContent = metrics.completionEstimated;
      } else {
        this.elements.progressCompletionContainer.style.display = 'none';
      }
    }
  }

  /**
   * Atualiza mensagem textual de status
   * @param {string} msg
   */
  updateStatus(msg) {
    this.elements.progressStatusText.textContent = msg;
  }

  /**
   * Adiciona linha de log
   * @param {string} line
   */
  appendLog(line) {
    if (!line) return;
    const output = this.elements.logOutput;
    output.textContent += line + '\n';
    output.scrollTop = output.scrollHeight;
  }

  /**
   * Exibe modal de alerta de conversão pesada
   * @param {Object} complexity
   * @param {Function} onContinue
   * @param {Function} onRecommend
   * @param {Function} onCancel
   */
  showHeavyConversionModal(complexity, onContinue, onRecommend, onCancel) {
    const modal = this.elements.modalHeavyConversion;
    const details = this.elements.heavyVideoDetails;
    if (!modal) return;

    if (details) {
      details.innerHTML = `
        <div class="heavy-detail-item">
          <strong>Resolução:</strong> ${complexity.width} × ${complexity.height} (${complexity.pixelsPerFrame.toLocaleString('pt-BR')} pixels/quadro)
        </div>
        <div class="heavy-detail-item">
          <strong>Taxa de Quadros:</strong> ${complexity.fps} FPS (${complexity.pixelsPerSecond.toLocaleString('pt-BR')} pixels/segundo)
        </div>
        <div class="heavy-detail-item">
          <strong>Duração:</strong> ${formatDuration(complexity.duration)} (${complexity.totalFrames.toLocaleString('pt-BR')} quadros totais)
        </div>
        <div class="heavy-detail-item">
          <strong>Classificação de Carga:</strong> <span class="badge badge-heavy">${complexity.tier.toUpperCase()}</span>
        </div>
      `;
    }

    // Configura ouvintes dos botões do modal
    const continueHandler = () => {
      this.hideHeavyConversionModal();
      cleanup();
      if (onContinue) onContinue();
    };

    const recommendHandler = () => {
      this.hideHeavyConversionModal();
      cleanup();
      if (onRecommend) onRecommend();
    };

    const cancelHandler = () => {
      this.hideHeavyConversionModal();
      cleanup();
      if (onCancel) onCancel();
    };

    const cleanup = () => {
      this.elements.btnHeavyContinue?.removeEventListener('click', continueHandler);
      this.elements.btnHeavyRecommend?.removeEventListener('click', recommendHandler);
      this.elements.btnHeavyCancel?.removeEventListener('click', cancelHandler);
    };

    this.elements.btnHeavyContinue?.addEventListener('click', continueHandler);
    this.elements.btnHeavyRecommend?.addEventListener('click', recommendHandler);
    this.elements.btnHeavyCancel?.addEventListener('click', cancelHandler);

    modal.style.display = 'flex';
  }

  /**
   * Oculta modal de alerta de conversão pesada
   */
  hideHeavyConversionModal() {
    if (this.elements.modalHeavyConversion) {
      this.elements.modalHeavyConversion.style.display = 'none';
    }
  }

  /**
   * Exibe a seção de resultado final
   * @param {Object} result
   * @param {Object} metadata
   * @param {Object} options
   */
  showResult(result, metadata, options) {
    this.elements.sectionProgress.style.display = 'none';
    this.elements.sectionResult.style.display = 'block';

    // Configura vídeo de preview do resultado
    this.elements.resultPreviewVideo.src = result.url;
    this.elements.resultPreviewVideo.load();

    // Informações resumidas
    this.elements.resultFileName.textContent = result.outputFileName;
    this.elements.resultFormat.textContent = result.outputFileName.endsWith('.webm') ? 'WEBM' : 'MP4';
    this.elements.resultResolution.textContent = `${result.targetWidth} × ${result.targetHeight}`;
    this.elements.resultDuration.textContent = formatDuration(metadata.duration);
    this.elements.resultSize.textContent = formatBytes(result.size);
    this.elements.resultCodec.textContent = options.codec.toUpperCase();

    let layoutName = 'Side-by-Side Half';
    if (options.outputLayout === 'top_bottom' || options.outputFormat === 'top_bottom') {
      layoutName = 'Top-and-Bottom (Acima / Abaixo)';
    } else if (options.outputLayout === 'sbs_full' || options.outputFormat === 'sbs_full') {
      layoutName = 'Side-by-Side Full';
    } else if (options.outputFormat === 'cardboard') {
      layoutName = 'Google Cardboard (SBS Half)';
    } else if (options.outputFormat === 'vr180') {
      layoutName = 'VR 180° SBS';
    } else if (options.outputFormat === 'vr360') {
      layoutName = 'VR 360° SBS';
    }
    this.elements.resultLayout.textContent = layoutName;

    // Habilita botão de download real
    this.elements.btnDownload.disabled = false;

    this.elements.sectionResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /**
   * Dispara o download real do Blob gerado
   * @param {string} url
   * @param {string} fileName
   */
  triggerDownload(url, fileName) {
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Reseta toda a interface para uma nova conversão
   */
  resetAll() {
    this.elements.sectionInfo.style.display = 'none';
    this.elements.sectionConfig.style.display = 'none';
    this.elements.sectionProgress.style.display = 'none';
    this.elements.sectionResult.style.display = 'none';

    this.elements.fileInput.value = '';
    this.elements.inputPreviewVideo.src = '';
    this.elements.resultPreviewVideo.src = '';

    this.elements.btnConvert.disabled = true;
    this.elements.btnDownload.disabled = true;
    this.elements.btnCancel.disabled = true;

    this.elements.progressBarFill.style.width = '0%';
    this.elements.progressPercent.textContent = '0%';
    this.elements.logOutput.textContent = '';
    this.setConversionState('idle', 'Aguardando conversão...');

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
