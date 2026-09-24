/**
 * VR Video Converter
 * Version: v.1.0.2
 *
 * app.js - Ponto de entrada e orquestrador da aplicação VR Video Converter
 */

import { APP_VERSION } from './version.js';
import { extractVideoMetadata } from './video-info.js';
import { convertVideo, cancelConversion } from './converter.js';
import { UIManager } from './ui.js';
import { VRViewer } from './vr-viewer.js';
import { ffmpegManager } from './ffmpeg.js';
import { TimeEstimator } from './time-estimator.js';

class App {
  constructor() {
    this.ui = new UIManager();
    this.currentFile = null;
    this.currentMetadata = null;
    this.currentResult = null;
    this.inputPreviewUrl = null;
    this.conversionStartTime = 0;
    this.vrViewer = null;
    this.timeEstimator = null;
    this.heavyBypassed = false;
    this.isConverting = false;

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
      this.heavyBypassed = false;
      this.inputPreviewUrl = URL.createObjectURL(file);
      this.ui.elements.inputPreviewVideo.src = this.inputPreviewUrl;

      // Extrai metadados do vídeo
      this.currentMetadata = await extractVideoMetadata(file);
      console.log('[App] Metadados extraídos:', this.currentMetadata);

      // Exibe metadados na interface
      this.ui.showVideoMetadata(this.currentMetadata);

      // Ajusta sugestão de preset com base na detecção
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
   * Aplica configurações recomendadas para vídeos pesados (Seção 23)
   */
  applyRecommendedSettings() {
    this.ui.elements.selectResolution.value = '1920x1080';
    this.ui.elements.selectOutputFormat.value = 'sbs_half';
    this.ui.elements.selectCodec.value = 'h264';
    this.ui.elements.selectQuality.value = 'balanced';
    this.ui.elements.selectFps.value = 'original';
    this.ui.elements.selectAudio.value = 'aac';
    this.ui.toggleCustomResolutionInputs();
    this.ui.toggleCustomQualityInputs();
    this.ui.updateUpscaleNotice();
    this.ui.updateStereoscopyNotice();
    this.ui.updateVrMetadataPanel();
    console.log('[App] Configuração recomendada aplicada: 1080p, SBS Half, H.264, Equilibrado.');
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
        this.isConverting = false;
        this.ui.setConversionState('cancelled', 'Conversão cancelada pelo usuário.');
        btnCancel.disabled = true;
        btnConvert.disabled = false;
        if (this.timeEstimator) {
          this.timeEstimator.reset();
        }
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
   * Executa a conversão completa com validação e estimativa contínua
   */
  async startConversion() {
    if (this.isConverting) {
      console.warn('[App] Uma conversão já está em andamento.');
      return;
    }

    if (!this.currentFile || !this.currentMetadata) {
      alert('Por favor, selecione um arquivo de vídeo primeiro.');
      return;
    }

    // Calcula complexidade do processamento (Seções 19, 20, 21, 22)
    const complexity = TimeEstimator.calculateComplexity(this.currentMetadata);
    console.log(`[VR] Versão: ${APP_VERSION}`);
    console.log(`[VR] Entrada: ${this.currentMetadata.name}`);
    console.log(`[VR] Duração: ${this.currentMetadata.duration}s`);
    console.log(`[VR] Resolução: ${this.currentMetadata.width}x${this.currentMetadata.height}`);
    console.log(`[VR] FPS: ${this.currentMetadata.fps}`);
    console.log(`[VR] Frames: ${complexity.totalFrames}`);
    console.log(`[VR] Carga: ${complexity.tier}`);

    // Exibe alerta de conversão pesada se necessário e ainda não ignorado pelo usuário
    if (complexity.isHeavy && !this.heavyBypassed) {
      this.ui.showHeavyConversionModal(
        complexity,
        () => {
          // Continuar mesmo assim
          this.heavyBypassed = true;
          this.startConversion();
        },
        () => {
          // Usar configuração recomendada
          this.heavyBypassed = true;
          this.applyRecommendedSettings();
          this.startConversion();
        },
        () => {
          // Cancelar
          console.log('[App] Conversão pesada cancelada pelo usuário no modal.');
        }
      );
      return;
    }

    const options = this.ui.getFormOptions();
    console.log('[VR] Configuração:', options);

    this.isConverting = true;
    this.conversionStartTime = Date.now();
    this.timeEstimator = new TimeEstimator(this.currentMetadata);

    this.ui.showProgress();
    this.ui.setConversionState('loading', 'Inicializando FFmpeg WebAssembly...');

    let lastUiUpdateTime = 0;

    try {
      const result = await convertVideo(
        this.currentFile,
        this.currentMetadata,
        options,
        (progress) => {
          // Atualiza o estimador de tempo real
          const metrics = this.timeEstimator.update(progress);

          const now = performance.now();
          // Throttling: Atualiza a interface a cada ~500ms para evitar sobrecarga na main thread
          if (metrics.percent >= 100 || (now - lastUiUpdateTime >= 500)) {
            lastUiUpdateTime = now;
            this.ui.updateProgress(metrics);

            if (metrics.speedRating && metrics.speedRating.slow) {
              this.ui.setConversionState('slow', 'Processamento lento em andamento...');
            } else {
              this.ui.setConversionState('processing', 'Processando vídeo...');
            }

            console.log(`[VR] FFmpeg: ${progress.timeFormatted || ''} | Velocidade: ${metrics.speed ? metrics.speed + 'x' : '-'} | Progresso: ${metrics.percent}% | Estimativa: ${metrics.remainingFormatted}`);
          }
        },
        (log) => {
          this.ui.appendLog(log);
        },
        (status) => {
          if (status.includes('Carregando')) {
            this.ui.setConversionState('loading', status);
          } else if (status.includes('Finalizando') || status.includes('Salvando')) {
            this.ui.setConversionState('finishing', status);
          } else {
            this.ui.updateStatus(status);
          }
        }
      );

      console.log('[VR] Output:', result);
      this.isConverting = false;
      this.currentResult = result;
      this.ui.setConversionState('completed', 'Conversão concluída com sucesso!');
      this.ui.showResult(result, this.currentMetadata, options);

    } catch (err) {
      console.error('[App] Falha na conversão:', err);
      this.isConverting = false;
      this.ui.setConversionState('error', `Não foi possível concluir a conversão: ${err.message}`);
      alert(`Ocorreu um erro durante a conversão:\n\n${err.message}`);
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
    this.heavyBypassed = false;
    this.isConverting = false;

    if (this.timeEstimator) {
      this.timeEstimator.reset();
      this.timeEstimator = null;
    }

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

    // Detecção WebXR
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
