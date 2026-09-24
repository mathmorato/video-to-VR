/**
 * VR Video Converter
 * Version: v.1.0.1
 *
 * ui.js - Gerenciador de interface de usuário e eventos DOM
 */

import { formatBytes, formatDuration, $ } from './utils.js';
import { PRESETS } from './vr-processing.js';

export class UIManager {
  constructor() {
    this.elements = {};
    this.currentMetadata = null;
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

      // Configuração VR Avançada (Seção 4 da V3)
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

      // Painel de Metadados VR (Seção 31)
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

      // Progresso
      progressBarFill: $('#progress-bar-fill'),
      progressPercent: $('#progress-percent'),
      progressStatusText: $('#progress-status-text'),
      progressElapsed: $('#progress-elapsed'),
      progressRemaining: $('#progress-remaining'),
      progressSpeed: $('#progress-speed'),
      progressFrame: $('#progress-frame'),
      logOutput: $('#log-output'),
      logToggleBtn: $('#log-toggle-btn'),
      logContainer: $('#log-container'),

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
      this.elements.infoDetectionNotice.textContent = `💡 Sugestão automática: ${metadata.detectionReason}`;
      this.elements.infoDetectionNotice.style.display = 'block';
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
   * Aplica um preset na interface (Seção 33 e 34)
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
   * Gerencia a visibilidade de campos conforme o tipo de vídeo selecionado (Seção 5 da V3)
   */
  updateContextualVisibility() {
    const videoType = this.elements.selectVideoType.value;
    const proj = this.elements.selectProjection.value;

    if (videoType === '2d') {
      // 2D: oculta projeção esférica, FOV e calibração fisheye
      if (this.elements.groupProjection) this.elements.groupProjection.style.display = 'none';
      if (this.elements.groupFov) this.elements.groupFov.style.display = 'none';
      if (this.elements.groupFisheyeCalib) this.elements.groupFisheyeCalib.style.display = 'none';
    } else if (videoType === '180') {
      // 180°: mostra projeção, estereoscopia e FOV
      if (this.elements.groupProjection) this.elements.groupProjection.style.display = 'flex';
      if (this.elements.groupFov) this.elements.groupFov.style.display = 'flex';
      if (this.elements.groupFisheyeCalib) {
        this.elements.groupFisheyeCalib.style.display = proj.includes('fisheye') ? 'block' : 'none';
      }
    } else if (videoType === '360') {
      // 360°: mostra projeção e estereoscopia, oculta FOV
      if (this.elements.groupProjection) this.elements.groupProjection.style.display = 'flex';
      if (this.elements.groupFov) this.elements.groupFov.style.display = 'none';
      if (this.elements.groupFisheyeCalib) {
        this.elements.groupFisheyeCalib.style.display = proj.includes('fisheye') ? 'block' : 'none';
      }
    }

    this.updateVrMetadataPanel();
  }

  /**
   * Atualiza as tags do painel de Metadados VR em tempo real (Seção 31)
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
   * Atualiza o aviso explicativo sobre estereoscopia (Seção 8, 15, 20)
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
        <span class="notice-icon">ℹ️</span>
        <span>${desc}</span>
      `;
      notice.style.display = 'flex';
    } else {
      notice.style.display = 'none';
    }
  }

  /**
   * Atualiza o aviso de projeção (Seção 17, 18)
   */
  updateProjectionNotice() {
    const proj = this.elements.selectProjection.value;
    const videoType = this.elements.selectVideoType.value;
    const notice = this.elements.projectionNotice;

    if (videoType !== '2d' && (proj === 'fisheye' || proj === 'dual_fisheye')) {
      notice.innerHTML = `
        <span class="notice-icon">⚠️</span>
        <span>Aviso: A projeção Fisheye requer parâmetros ópticos da câmera (calibração geométrica abaixo) e funciona em modo experimental.</span>
      `;
      notice.style.display = 'flex';
    } else {
      notice.style.display = 'none';
    }
  }

  /**
   * Atualiza o aviso de upscaling se a resolução alvo for maior que a original (Seção 48)
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
        <span class="notice-icon">💡</span>
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
   * Prepara e exibe a seção de progresso
   */
  showProgress() {
    this.elements.sectionProgress.style.display = 'block';
    this.elements.btnConvert.disabled = true;
    this.elements.btnCancel.disabled = false;
    this.elements.progressBarFill.style.width = '0%';
    this.elements.progressPercent.textContent = '0%';
    this.elements.progressStatusText.textContent = 'Inicializando conversão...';
    this.elements.progressElapsed.textContent = '00:00';
    this.elements.progressRemaining.textContent = '--:--';
    this.elements.progressSpeed.textContent = '-';
    this.elements.progressFrame.textContent = '-';
    this.elements.logOutput.textContent = '';
    this.elements.sectionProgress.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /**
   * Atualiza a barra e métricas reais de progresso
   * @param {Object} data
   * @param {number} startTime
   */
  updateProgress(data, startTime) {
    const percent = Math.min(100, Math.max(0, data.percent || 0));
    this.elements.progressBarFill.style.width = `${percent}%`;
    this.elements.progressPercent.textContent = `${percent}%`;

    // Tempo decorrido real
    if (startTime) {
      const elapsedSec = (Date.now() - startTime) / 1000;
      this.elements.progressElapsed.textContent = formatDuration(elapsedSec);

      // Estimativa restante
      if (percent > 0 && percent < 100) {
        const totalEstimated = elapsedSec / (percent / 100);
        const remainingSec = Math.max(0, totalEstimated - elapsedSec);
        this.elements.progressRemaining.textContent = formatDuration(remainingSec);
      }
    }

    if (data.speed) {
      this.elements.progressSpeed.textContent = `${data.speed}x`;
    }
    if (data.frame) {
      this.elements.progressFrame.textContent = String(data.frame);
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
   * Exibe a seção de resultado final (Seção 33, 57)
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

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
