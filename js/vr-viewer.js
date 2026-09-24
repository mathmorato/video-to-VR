/**
 * VR Video Converter
 * Version: v.1.0.1
 *
 * vr-viewer.js - Visualizador Interativo VR e Modo Google Cardboard (WebGL)
 * Implementa renderização WebGL para panoramas 360°, hemisférios 180° e planos SBS/TB,
 * com suporte a controle por Mouse (arrasto + zoom no scroll), Toque (arrasto + pinça para zoom),
 * Giroscópio (DeviceOrientation) e WebXR.
 */

export class VRViewer {
  /**
   * @param {Object} config
   * @param {HTMLVideoElement} config.videoElement
   * @param {HTMLElement} config.containerElement
   * @param {string} [config.projection] - '360' | '180' | 'flat'
   * @param {string} [config.stereoLayout] - 'sbs' | 'tb' | 'mono'
   * @param {boolean} [config.isStereo]
   */
  constructor(config) {
    this.video = config.videoElement;
    this.container = config.containerElement;
    this.projection = config.projection || 'flat';
    this.stereoLayout = config.stereoLayout || (config.isStereo ? 'sbs' : 'mono');
    this.isStereo = !!config.isStereo;

    this.canvas = null;
    this.gl = null;
    this.program = null;
    this.texture = null;

    // Ângulos de rotação da câmera (radianos)
    this.yaw = 0;
    this.pitch = 0;
    this.fov = 75; // Graus (zoom)

    // Controle de interação
    this.isDragging = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    this.initialPinchDistance = null;

    // Giroscópio
    this.gyroActive = false;

    // Modo Cardboard
    this.cardboardMode = false;
    this.animationFrameId = null;

    this._bindEvents();
  }

  /**
   * Inicializa o canvas e o contexto WebGL
   */
  init() {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'vr-viewer-canvas';
    this.container.innerHTML = '';
    this.container.appendChild(this.canvas);

    const gl = this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl');
    if (!gl) {
      this.container.innerHTML = '<div class="vr-fallback-msg">WebGL não é suportado neste navegador. Reproduzindo no player padrão.</div>';
      this.container.appendChild(this.video);
      return false;
    }
    this.gl = gl;

    this._initShaders();
    this._initBuffers();
    this._initTexture();
    this.resize();

    window.addEventListener('resize', () => this.resize());
    this.start();
    return true;
  }

  /**
   * Redimensiona o canvas para preencher o container
   */
  resize() {
    if (!this.canvas || !this.gl) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.canvas.width = width;
    this.canvas.height = height;
    this.gl.viewport(0, 0, width, height);
  }

  /**
   * Compila os shaders WebGL
   * @private
   */
  _initShaders() {
    const gl = this.gl;

    const vsSource = `
      attribute vec2 aPosition;
      varying vec2 vUv;
      void main() {
        vUv = (aPosition + 1.0) * 0.5;
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }
    `;

    // Fragment Shader com suporte a 360°, 180°, SBS e Top/Bottom (Seção 20, 21, 25, 27, 28)
    const fsSource = `
      precision mediump float;
      varying vec2 vUv;
      uniform sampler2D uSampler;
      uniform int uMode; // 0: Flat, 1: 360 Mono, 2: 360 SBS, 3: 180 SBS, 4: 360 Top/Bottom
      uniform float uYaw;
      uniform float uPitch;
      uniform float uAspect;
      uniform float uFov;
      uniform bool uCardboard;

      #define PI 3.14159265359

      vec3 getRay(vec2 screenCoord) {
        float fovRad = uFov * PI / 180.0;
        float tanHalfFov = tan(fovRad * 0.5);
        vec3 ray = normalize(vec3(screenCoord.x * tanHalfFov * uAspect, screenCoord.y * tanHalfFov, 1.0));

        // Rotação Pitch (X)
        float cp = cos(uPitch);
        float sp = sin(uPitch);
        mat3 rotX = mat3(
          1.0, 0.0, 0.0,
          0.0, cp, -sp,
          0.0, sp, cp
        );

        // Rotação Yaw (Y)
        float cy = cos(uYaw);
        float sy = sin(uYaw);
        mat3 rotY = mat3(
          cy, 0.0, sy,
          0.0, 1.0, 0.0,
          -sy, 0.0, cy
        );

        return rotY * rotX * ray;
      }

      void main() {
        vec2 uv = vUv;

        // Modo Cardboard: tela dividida ao meio para olho esquerdo e direito
        bool isRightEye = false;
        if (uCardboard) {
          if (uv.x < 0.5) {
            uv.x = uv.x * 2.0; // Olho esquerdo expande 0..1
          } else {
            uv.x = (uv.x - 0.5) * 2.0; // Olho direito expande 0..1
            isRightEye = true;
          }
        }

        if (uMode == 0) {
          // Exibição Direta (Plana ou SBS nativo)
          gl_FragColor = texture2D(uSampler, uv);
          return;
        }

        // Converte coordenadas de tela normalizadas (-1 a 1)
        vec2 screenCoord = (uv - 0.5) * 2.0;
        vec3 ray = getRay(screenCoord);

        // Coordenadas esféricas
        float lon = atan(ray.x, ray.z); // -PI a PI
        float lat = asin(clamp(ray.y, -1.0, 1.0)); // -PI/2 a PI/2

        float texU = (lon / (2.0 * PI)) + 0.5;
        float texV = (lat / PI) + 0.5;

        // Inversão vertical do vídeo para orientação padrão
        texV = 1.0 - texV;

        if (uMode == 2) {
          // 360 SBS: metade esquerda da textura é olho esquerdo, metade direita é olho direito
          if (isRightEye) {
            texU = 0.5 + texU * 0.5;
          } else {
            texU = texU * 0.5;
          }
        } else if (uMode == 3) {
          // 180 SBS: limita longitude a [-PI/2, PI/2]
          if (abs(lon) > PI * 0.5) {
            gl_FragColor = vec4(0.04, 0.04, 0.04, 1.0);
            return;
          }
          float u180 = (lon / PI) + 0.5;
          if (isRightEye) {
            texU = 0.5 + u180 * 0.5;
          } else {
            texU = u180 * 0.5;
          }
        } else if (uMode == 4) {
          // 360 Top/Bottom: metade superior é olho esquerdo, metade inferior é olho direito
          if (isRightEye) {
            texV = 0.5 + texV * 0.5;
          } else {
            texV = texV * 0.5;
          }
        }

        gl_FragColor = texture2D(uSampler, vec2(clamp(texU, 0.0, 1.0), clamp(texV, 0.0, 1.0)));
      }
    `;

    const vs = this._compileShader(gl.VERTEX_SHADER, vsSource);
    const fs = this._compileShader(gl.FRAGMENT_SHADER, fsSource);

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Falha ao linkar shaders WebGL:', gl.getProgramInfoLog(program));
      return;
    }

    this.program = program;
  }

  /**
   * Compila shader individual
   * @private
   */
  _compileShader(type, source) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Erro de compilação shader:', gl.getShaderInfoLog(shader));
    }
    return shader;
  }

  /**
   * Inicializa buffers de vértice
   * @private
   */
  _initBuffers() {
    const gl = this.gl;
    const vertices = new Float32Array([
      -1.0, -1.0,
       1.0, -1.0,
      -1.0,  1.0,
      -1.0,  1.0,
       1.0, -1.0,
       1.0,  1.0
    ]);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const aPosition = gl.getAttribLocation(this.program, 'aPosition');
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
  }

  /**
   * Inicializa textura WebGL
   * @private
   */
  _initTexture() {
    const gl = this.gl;
    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  }

  /**
   * Configura eventos de interação (Mouse, Scroll Wheel Zoom, Touch, Pinch Zoom, Giroscópio)
   * @private
   */
  _bindEvents() {
    // Mouse Drag (Yaw e Pitch)
    const onMouseDown = (e) => {
      this.isDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    };

    const onMouseMove = (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;

      const sensitivity = 0.003;
      this.yaw -= dx * sensitivity;
      this.pitch -= dy * sensitivity;
      this.pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.pitch));
    };

    const onMouseUp = () => {
      this.isDragging = false;
    };

    // Zoom via Scroll do Mouse (Seção 22)
    const onWheel = (e) => {
      e.preventDefault();
      const zoomSpeed = 0.05;
      this.fov = Math.max(30, Math.min(110, this.fov + e.deltaY * zoomSpeed));
    };

    // Touch em Smartphones (Arrasto e Pinça para Zoom - Seção 23)
    const onTouchStart = (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.lastMouseX = e.touches[0].clientX;
        this.lastMouseY = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        this.isDragging = false;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        this.initialPinchDistance = Math.hypot(dx, dy);
      }
    };

    const onTouchMove = (e) => {
      if (e.touches.length === 1 && this.isDragging) {
        const dx = e.touches[0].clientX - this.lastMouseX;
        const dy = e.touches[0].clientY - this.lastMouseY;
        this.lastMouseX = e.touches[0].clientX;
        this.lastMouseY = e.touches[0].clientY;

        const sensitivity = 0.004;
        this.yaw -= dx * sensitivity;
        this.pitch -= dy * sensitivity;
        this.pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.pitch));
      } else if (e.touches.length === 2 && this.initialPinchDistance) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const currentDistance = Math.hypot(dx, dy);
        const diff = this.initialPinchDistance - currentDistance;

        this.fov = Math.max(30, Math.min(110, this.fov + diff * 0.1));
        this.initialPinchDistance = currentDistance;
      }
    };

    const onTouchEnd = () => {
      this.isDragging = false;
      this.initialPinchDistance = null;
    };

    this.container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    this.container.addEventListener('wheel', onWheel, { passive: false });

    this.container.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);
  }

  /**
   * Reseta a orientação e o zoom para os valores padrão
   */
  resetView() {
    this.yaw = 0;
    this.pitch = 0;
    this.fov = 75;
  }

  /**
   * Ajusta o campo de visão (Zoom)
   * @param {number} value (30 a 110)
   */
  setFov(value) {
    this.fov = Math.max(30, Math.min(110, value));
  }

  /**
   * Solicita e ativa o controle por Giroscópio (orientação do dispositivo - Seção 24)
   * @returns {Promise<boolean>}
   */
  async enableGyroscope() {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const response = await DeviceOrientationEvent.requestPermission();
        if (response !== 'granted') {
          return false;
        }
      } catch (err) {
        console.warn('Permissão de giroscópio recusada ou indisponível:', err);
        return false;
      }
    }

    const onDeviceOrientation = (event) => {
      if (event.alpha === null) return;
      this.gyroActive = true;

      // Conversão de ângulos de Euler para orientação esférica
      const alphaRad = (event.alpha || 0) * (Math.PI / 180);
      const betaRad = (event.beta || 0) * (Math.PI / 180);

      this.yaw = -alphaRad;
      this.pitch = (betaRad - Math.PI / 2);
      this.pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.pitch));
    };

    window.addEventListener('deviceorientation', onDeviceOrientation);
    return true;
  }

  /**
   * Alterna o modo Google Cardboard (tela dividida estéreo - Seção 25)
   * @param {boolean} [enable]
   */
  toggleCardboardMode(enable) {
    this.cardboardMode = typeof enable === 'boolean' ? enable : !this.cardboardMode;
    if (this.cardboardMode) {
      this.container.classList.add('cardboard-active');
      this.resize();
    } else {
      this.container.classList.remove('cardboard-active');
      this.resize();
    }
  }

  /**
   * Inicia o loop de renderização
   */
  start() {
    const gl = this.gl;
    if (!gl) return;

    const render = () => {
      if (this.video && this.video.readyState >= this.video.HAVE_CURRENT_DATA) {
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.video);
      }

      gl.useProgram(this.program);

      // Determinação de modo de shader:
      // 0: Flat
      // 1: 360 Mono
      // 2: 360 SBS Stereo
      // 3: 180 SBS Stereo
      // 4: 360 Top/Bottom Stereo
      let mode = 0;
      if (this.projection === '360') {
        if (this.stereoLayout === 'tb') {
          mode = 4;
        } else if (this.stereoLayout === 'sbs' || this.isStereo) {
          mode = 2;
        } else {
          mode = 1;
        }
      } else if (this.projection === '180') {
        mode = 3;
      }

      const uMode = gl.getUniformLocation(this.program, 'uMode');
      const uYaw = gl.getUniformLocation(this.program, 'uYaw');
      const uPitch = gl.getUniformLocation(this.program, 'uPitch');
      const uAspect = gl.getUniformLocation(this.program, 'uAspect');
      const uFov = gl.getUniformLocation(this.program, 'uFov');
      const uCardboard = gl.getUniformLocation(this.program, 'uCardboard');

      const width = this.canvas.width;
      const height = this.canvas.height;
      const aspect = this.cardboardMode ? (width * 0.5) / height : width / height;

      gl.uniform1i(uMode, mode);
      gl.uniform1f(uYaw, this.yaw);
      gl.uniform1f(uPitch, this.pitch);
      gl.uniform1f(uAspect, aspect);
      gl.uniform1f(uFov, this.fov);
      gl.uniform1i(uCardboard, this.cardboardMode ? 1 : 0);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      this.animationFrameId = requestAnimationFrame(render);
    };

    render();
  }

  /**
   * Para o loop de renderização e libera recursos
   */
  stop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Destrói a instância do viewer
   */
  destroy() {
    this.stop();
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }
}
