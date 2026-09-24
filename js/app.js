/**
 * VR Video Converter
 * Version: v.1.0.1
 *
 * app.js - Ponto de entrada e orquestrador da aplicação VR Video Converter
 */

import { APP_VERSION } from './version.js';
import { extractVideoMetadata } from './video-info.js';
import { convertVideo, cancelConversion } from './converter.js';
import { UIManager } from './ui.js';
import { VRViewer } from './vr-viewer.js';
import { ffmpegManager } from './ffmpeg.js';

class App {
  constructor() {
    this.ui = new UIManager();
    this.currentFile = null;
    this.currentMetadata = null;
    this.currentResult = null;
    this.inputPreviewUrl = null;
    this.conversionStartTime = 0;
    this.vrViewer = null;

    this.init();
  }

  /**
   * Inicializa ouvintes de eventos e estado inicial
   */
  init() {
    this._syncAppVersion();
    this._setupFFmpegStatusMonitoring();
    this._setupDropzone();
    this._setupFormEvents();
    this._setupConversionEvents();
    this._setupVrViewerEvents();

    // Aplica preset inicial (Google Cardboard por padrão)
    this.ui.applyPresetToForm('cardboard');

    // Inicializa carregamento antecipado do FFmpeg em segundo plano
    ffmpegManager.init().catch((err) => {
      console.warn('[App] Pré-carregamento do FFmpeg:', err.message);
    });
  }

  /**
   * Sincroniza a versão oficial em todos os elementos da interface
   * @private
   */
  _syncAppVersion() {
    const footerVer = document.getElementById('app-footer-version');
    if (footerVer) {
      footerVer.textContent = APP_VERSION;
    }
    document.querySelectorAll('.sidebar-footer-version, .app-version').forEach((el) => {
      el.textContent = APP_VERSION;
    });
    console.log(`[App] VR Video Converter ${APP_VERSION} inicializado.`);
  }

  /**
   * Monitora alterações de estado do FFmpeg para atualizar o selo na interface
   * @private
   */
  _setupFFmpegStatusMonitoring() {
    const statusBadge = document.getElementById('ffmpeg-global-status');
    ffmpegManager.onStatusChange((label, state) => {
      if (statusBadge) {
        statusBadge.textContent = label;
        statusBadge.dataset.state = state;
      }
    });
  }

  /**
   * Configura área de drag and drop e seletor de arquivos
   * @private
   */
  _setupDropzone() {
    const { dropzone, fileInput, selectBtn } = this.ui.elements;

    selectBtn.addEventListener('click', () => {
      fileInput.click();
    });

    dropzone.addEventListener('click', (e) => {
      if (e.target !== selectBtn) {
        fileInput.click();
      }
    });

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) {
        this.handleFileSelected(file);
      }
    });

    // Drag & Drop
    ['dragenter', 'dragover'].forEach((eventName) => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach((eventName) => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('dragover');
      });
    });

    dropzone.addEventListener('drop', (e) => {
      const file = e.dataTransfer?.files?.[0];
      if (file) {
        this.handleFileSelected(file);
      }
    });
  }

  /**
   * Processa o arquivo de vídeo selecionado
   * @param {File} file
   */
  async handleFileSelected(file) {
    if (!file) return;

    try {
      console.log(`[App] Arquivo recebido: ${file.name} (${file.size} bytes)`);

      // Limpa URL de preview anterior
      if (this.inputPreviewUrl) {
        URL.revokeObjectURL(this.inputPreviewUrl);
      }

      this.currentFile = file;
      this.inputPreviewUrl = URL.createObjectURL(file);
      this.ui.elements.inputPreviewVideo.src = this.inputPreviewUrl;

      // Extrai metadados do vídeo
      this.currentMetadata = await extractVideoMetadata(file);
      console.log('[App] Metadados extraídos:', this.currentMetadata);

      // Exibe metadados na interface
      this.ui.showVideoMetadata(this.currentMetadata);

      // Ajusta sugestão de preset com base na detecção (Seção 6)
      if (this.currentMetadata.detectedType === '360') {
        if (this.currentMetadata.detectedStereo === 'tb') {
          this.ui.applyPresetToForm('vr360_tb');
        } else if (this.currentMetadata.detectedStereo === 'sbs') {
          this.ui.applyPresetToForm('vr360_stereo');
        } else {
          this.ui.applyPresetToForm('vr360_mono');
        }
      } else if (this.currentMetadata.detectedType === '180') {
        if (this.currentMetadata.detectedStereo === 'sbs') {
          this.ui.applyPresetToForm('vr180_stereo');
        } else {
          this.ui.applyPresetToForm('vr180_mono');
        }
      } else {
        if (this.currentMetadata.detectedStereo === 'sbs') {
          this.ui.applyPresetToForm('sbs_half');
        } else {
          this.ui.applyPresetToForm('cardboard');
        }
      }

      this.ui.updateContextualVisibility();
      this.ui.updateStereoscopyNotice();
      this.ui.updateUpscaleNotice();
      this.ui.updateVrMetadataPanel();

    } catch (err) {
      console.error('[App] Erro ao analisar o vídeo:', err);
      alert(`Não foi possível carregar o vídeo: ${err.message}`);
    }
  }

  /**
   * Configura eventos do formulário de opções
   * @private
   */
  _setupFormEvents() {
    const {
      selectPreset,
      selectVideoType,
      selectOutputFormat,
      selectStereoscopy,
      selectProjection,
      selectResolution,
      customWidth,
      customHeight,
      selectQuality,
      logToggleBtn,
      logContainer
    } = this.ui.elements;

    selectPreset.addEventListener('change', (e) => {
      this.ui.applyPresetToForm(e.target.value);
    });

    selectVideoType.addEventListener('change', () => {
      this.ui.updateContextualVisibility();
      this.ui.updateStereoscopyNotice();
      this.ui.updateProjectionNotice();
      this.ui.updateVrMetadataPanel();
    });

    selectOutputFormat.addEventListener('change', () => {
      this.ui.updateStereoscopyNotice();
      this.ui.updateVrMetadataPanel();
    });

    selectStereoscopy.addEventListener('change', () => {
      this.ui.updateStereoscopyNotice();
      this.ui.updateVrMetadataPanel();
    });

    selectProjection.addEventListener('change', () => {
      this.ui.updateContextualVisibility();
      this.ui.updateProjectionNotice();
      this.ui.updateVrMetadataPanel();
    });

    selectResolution.addEventListener('change', () => {
      this.ui.toggleCustomResolutionInputs();
      this.ui.updateUpscaleNotice();
    });

    customWidth.addEventListener('input', () => {
      this.ui.updateUpscaleNotice();
    });

    customHeight.addEventListener('input', () => {
      this.ui.updateUpscaleNotice();
    });

    selectQuality.addEventListener('change', () => {
      this.ui.toggleCustomQualityInputs();
    });

    // Alternar visibilidade do console de log FFmpeg
    logToggleBtn.addEventListener('click', () => {
      const isVisible = logContainer.style.display === 'block';
      logContainer.style.display = isVisible ? 'none' : 'block';
      logToggleBtn.textContent = isVisible ? 'Mostrar console FFmpeg' : 'Ocultar console FFmpeg';
    });
  }

  /**
   * Configura eventos de conversão e download
   * @private
   */
  _setupConversionEvents() {
    const {
      btnConvert,
      btnCancel,
      btnDownload,
      btnNewConversion
    } = this.ui.elements;

    // Disparar conversão
    btnConvert.addEventListener('click', async () => {
      await this.startConversion();
    });

    // Cancelar conversão
    btnCancel.addEventListener('click', () => {
      if (confirm('Deseja realmente cancelar a conversão em andamento?')) {
        cancelConversion();
        this.ui.updateStatus('Conversão cancelada pelo usuário.');
        btnCancel.disabled = true;
        btnConvert.disabled = false;
        alert('Conversão cancelada.');
      }
    });

    // Download do resultado
    btnDownload.addEventListener('click', () => {
      if (this.currentResult && this.currentResult.url) {
        console.log('[App] Disparando download do arquivo:', this.currentResult.outputFileName);
        this.ui.triggerDownload(this.currentResult.url, this.currentResult.outputFileName);
      }
    });

    // Nova conversão
    btnNewConversion.addEventListener('click', () => {
      this.resetConversion();
    });
  }

  /**
   * Executa a conversão completa
   */
  async startConversion() {
    if (!this.currentFile || !this.currentMetadata) {
      alert('Por favor, selecione um arquivo de vídeo primeiro.');
      return;
    }

    const options = this.ui.getFormOptions();
    this.conversionStartTime = Date.now();

    this.ui.showProgress();

    try {
      console.log('[App] Iniciando conversão V3 com opções:', options);

      const result = await convertVideo(
        this.currentFile,
        this.currentMetadata,
        options,
        (progress) => {
          this.ui.updateProgress(progress, this.conversionStartTime);
        },
        (log) => {
          this.ui.appendLog(log);
        },
        (status) => {
          this.ui.updateStatus(status);
        }
      );

      console.log('[App] Conversão concluída com sucesso:', result);
      this.currentResult = result;
      this.ui.showResult(result, this.currentMetadata, options);

    } catch (err) {
      console.error('[App] Falha na conversão:', err);
      this.ui.updateStatus(`Erro: ${err.message}`);
      alert(`Ocorreu um erro durante a conversão:\n\n${err.message}`);
      this.ui.elements.btnConvert.disabled = false;
      this.ui.elements.btnCancel.disabled = true;
    }
  }

  /**
   * Reseta o estado para uma nova conversão
   */
  resetConversion() {
    if (this.inputPreviewUrl) {
      URL.revokeObjectURL(this.inputPreviewUrl);
      this.inputPreviewUrl = null;
    }

    ffmpegManager.revokeUrls();

    this.currentFile = null;
    this.currentMetadata = null;
    this.currentResult = null;
    this.conversionStartTime = 0;

    if (this.vrViewer) {
      this.vrViewer.destroy();
      this.vrViewer = null;
    }

    this.ui.resetAll();
    this.ui.applyPresetToForm('cardboard');
    console.log('[App] Estado resetado para nova conversão.');
  }

  /**
   * Configura eventos do visualizador VR e Google Cardboard
   * @private
   */
  _setupVrViewerEvents() {
    const {
      btnOpenVrViewer,
      btnOpenCardboard,
      vrModal,
      vrModalClose,
      vrCanvasContainer,
      vrCardboardToggle,
      vrGyroToggle,
      vrResetViewBtn,
      vrWebXrBtn,
      vrZoomSlider,
      vrZoomVal,
      vrViewModeBadge,
      resultPreviewVideo
    } = this.ui.elements;

    const openViewer = (initialCardboard = false) => {
      if (!this.currentResult || !this.currentResult.url) {
        alert('Nenhum vídeo convertido disponível para visualização.');
        return;
      }

      vrModal.style.display = 'flex';

      const options = this.ui.getFormOptions();
      // Modo VR automático (Seção 60 da V3)
      const projection = options.videoType === '360' ? '360' : (options.videoType === '180' ? '180' : 'flat');
      const stereoLayout = (options.outputLayout === 'top_bottom' || options.outputFormat === 'top_bottom') ? 'tb' : 'sbs';

      let modeLabel = '360° Esférico';
      if (projection === '180') modeLabel = '180° Hemisférico';
      if (projection === 'flat') modeLabel = stereoLayout === 'tb' ? 'Plano Top/Bottom' : 'Plano SBS';
      if (vrViewModeBadge) vrViewModeBadge.textContent = modeLabel;

      if (this.vrViewer) {
        this.vrViewer.destroy();
      }

      this.vrViewer = new VRViewer({
        videoElement: resultPreviewVideo,
        containerElement: vrCanvasContainer,
        projection,
        stereoLayout,
        isStereo: true
      });

      this.vrViewer.init();

      if (vrZoomSlider) {
        vrZoomSlider.value = 75;
        if (vrZoomVal) vrZoomVal.textContent = '75°';
      }

      if (initialCardboard) {
        this.vrViewer.toggleCardboardMode(true);
        this.ui.elements.vrOrientationPrompt.style.display = 'block';
      } else {
        this.ui.elements.vrOrientationPrompt.style.display = 'none';
      }

      resultPreviewVideo.play().catch(() => {});
    };

    btnOpenVrViewer.addEventListener('click', () => openViewer(false));
    btnOpenCardboard.addEventListener('click', () => openViewer(true));

    vrModalClose.addEventListener('click', () => {
      vrModal.style.display = 'none';
      if (this.vrViewer) {
        this.vrViewer.stop();
      }
      resultPreviewVideo.pause();
    });

    vrCardboardToggle.addEventListener('click', () => {
      if (this.vrViewer) {
        this.vrViewer.toggleCardboardMode();
        const active = this.vrViewer.cardboardMode;
        this.ui.elements.vrOrientationPrompt.style.display = active ? 'block' : 'none';
      }
    });

    vrGyroToggle.addEventListener('click', async () => {
      if (this.vrViewer) {
        const ok = await this.vrViewer.enableGyroscope();
        if (ok) {
          alert('Giroscópio ativado! Mova o dispositivo para olhar ao redor.');
        } else {
          alert('Giroscópio indisponível ou permissão negada. O controle por toque/mouse continuará disponível.');
        }
      }
    });

    if (vrResetViewBtn) {
      vrResetViewBtn.addEventListener('click', () => {
        if (this.vrViewer) {
          this.vrViewer.resetView();
          if (vrZoomSlider) vrZoomSlider.value = 75;
          if (vrZoomVal) vrZoomVal.textContent = '75°';
        }
      });
    }

    if (vrZoomSlider) {
      vrZoomSlider.addEventListener('input', (e) => {
        const fov = parseFloat(e.target.value);
        if (this.vrViewer) {
          this.vrViewer.setFov(fov);
        }
        if (vrZoomVal) vrZoomVal.textContent = `${Math.round(fov)}°`;
      });
    }

    // Detecção WebXR (Seção 29, 30 da V3)
    if ('xr' in navigator) {
      vrWebXrBtn.style.display = 'inline-flex';
      vrWebXrBtn.addEventListener('click', async () => {
        try {
          const isSupported = await navigator.xr.isSessionSupported('immersive-vr');
          if (isSupported) {
            alert('Modo WebXR Imersivo suportado! Conecte seu headset compatível.');
          } else {
            alert('Este dispositivo não suporta sessões "immersive-vr". Utilize o modo Google Cardboard (Side-by-Side).');
          }
        } catch (e) {
          alert('WebXR não disponível neste navegador. O modo Cardboard SBS continuará disponível.');
        }
      });
    } else {
      vrWebXrBtn.title = 'WebXR não disponível neste navegador. O modo SBS funcionará normalmente.';
    }
  }
}

// Inicializa a aplicação ao carregar o DOM
window.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
