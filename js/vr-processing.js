/**
 * VR Video Converter
 * Version: v.1.0.4
 *
 * vr-processing.js - Motor de Processamento Espacial VR, Filtros FFmpeg e Presets
 * Implementa o pipeline de transformação por olho:
 * INPUT -> STEREO SPLIT (Mono/SBS/TB) -> PER-EYE PROCESSING -> COMBINE EYES (SBS/TB) -> ENCODE
 */

/**
 * Garante que uma dimensão seja um número par (requisito estrito do encoder H.264 / yuv420p)
 * @param {number} val
 * @returns {number}
 */
export function makeEven(val) {
  const rounded = Math.round(val);
  return rounded % 2 === 0 ? rounded : rounded - 1;
}

/**
 * Perfis e Presets da Versão
 */
export const PRESETS = {
  quick_test: {
    name: 'Teste Rápido (720p - Validação)',
    format: 'sbs_half',
    outputFormat: 'sbs_half',
    outputLayout: 'sbs_half',
    videoType: '2d',
    projection: 'equirectangular',
    stereoscopy: 'mono',
    resolution: '1280x720',
    fps: 'original',
    codec: 'h264',
    audio: 'keep',
    quality: 'fast',
    description: 'Conversão ultra-rápida em 720p com preset veloz para validar rapidamente o pipeline e download.'
  },
  cardboard: {
    name: 'Google Cardboard 2D (Recomendado)',
    format: 'cardboard',
    outputFormat: 'cardboard',
    outputLayout: 'sbs_half',
    videoType: '2d',
    projection: 'equirectangular',
    stereoscopy: 'mono',
    resolution: '1920x1080',
    fps: 'original',
    codec: 'h264',
    audio: 'keep',
    quality: 'high',
    description: 'Otimizado para smartphones e headsets Google Cardboard (H.264 + AAC + SBS Half).'
  },
  cardboard_180: {
    name: 'Google Cardboard 180° VR',
    format: 'cardboard',
    outputFormat: 'cardboard',
    outputLayout: 'sbs_half',
    videoType: '180',
    projection: 'equirectangular',
    stereoscopy: 'mono',
    resolution: '1920x1080',
    fps: 'original',
    codec: 'h264',
    audio: 'keep',
    quality: 'high',
    description: 'Vídeo 180° formatado para exibição estéreo em headsets Google Cardboard.'
  },
  cardboard_360: {
    name: 'Google Cardboard 360° VR',
    format: 'cardboard',
    outputFormat: 'cardboard',
    outputLayout: 'sbs_half',
    videoType: '360',
    projection: 'equirectangular',
    stereoscopy: 'mono',
    resolution: '1920x1080',
    fps: 'original',
    codec: 'h264',
    audio: 'keep',
    quality: 'high',
    description: 'Panorama 360° formatado para navegação imersiva em headsets Google Cardboard.'
  },
  sbs_half: {
    name: 'SBS Half (Half Side-by-Side)',
    format: 'sbs_half',
    outputFormat: 'sbs_half',
    outputLayout: 'sbs_half',
    videoType: '2d',
    projection: 'equirectangular',
    stereoscopy: 'mono',
    resolution: 'original',
    fps: 'original',
    codec: 'h264',
    audio: 'keep',
    quality: 'medium',
    description: 'Divide a largura horizontal final entre os dois olhos (ex: 1920x1080 -> 960x1080 por olho).'
  },
  sbs_full: {
    name: 'SBS Full (Full Side-by-Side)',
    format: 'sbs_full',
    outputFormat: 'sbs_full',
    outputLayout: 'sbs_full',
    videoType: '2d',
    projection: 'equirectangular',
    stereoscopy: 'mono',
    resolution: 'original',
    fps: 'original',
    codec: 'h264',
    audio: 'keep',
    quality: 'high',
    description: 'Mantém a resolução horizontal total para cada olho (ex: 1920x1080 -> 3840x1080 total).'
  },
  top_bottom: {
    name: 'Top-and-Bottom (Acima / Abaixo)',
    format: 'top_bottom',
    outputFormat: 'top_bottom',
    outputLayout: 'top_bottom',
    videoType: '2d',
    projection: 'equirectangular',
    stereoscopy: 'mono',
    resolution: 'original',
    fps: 'original',
    codec: 'h264',
    audio: 'keep',
    quality: 'medium',
    description: 'Empilha os olhos verticalmente (metade superior = olho esquerdo, inferior = direito).'
  },
  vr180_mono: {
    name: 'VR 180° Monoscópico',
    format: 'vr180',
    outputFormat: 'vr180',
    outputLayout: 'sbs_half',
    videoType: '180',
    projection: 'equirectangular',
    stereoscopy: 'mono',
    resolution: 'original',
    fps: 'original',
    codec: 'h264',
    audio: 'keep',
    quality: 'high',
    description: 'Hemisfério 180° monoscópico duplicado para visão estéreo em óculos VR.'
  },
  vr180_stereo: {
    name: 'VR 180° Estereoscópico (SBS)',
    format: 'vr180',
    outputFormat: 'vr180',
    outputLayout: 'sbs_half',
    videoType: '180',
    projection: 'equirectangular',
    stereoscopy: 'sbs',
    resolution: 'original',
    fps: 'original',
    codec: 'h264',
    audio: 'keep',
    quality: 'high',
    description: 'Preserva as perspectivas 3D reais dos olhos esquerdo e direito em 180°.'
  },
  vr360_mono: {
    name: 'VR 360° Monoscópico (Panorama 2:1)',
    format: 'vr360',
    outputFormat: 'vr360',
    outputLayout: 'sbs_half',
    videoType: '360',
    projection: 'equirectangular',
    stereoscopy: 'mono',
    resolution: 'original',
    fps: 'original',
    codec: 'h264',
    audio: 'keep',
    quality: 'high',
    description: 'Panorama 360° esférico com duplicação para visualizadores VR e Cardboard.'
  },
  vr360_stereo: {
    name: 'VR 360° Estéreo (Side-by-Side)',
    format: 'vr360',
    outputFormat: 'vr360',
    outputLayout: 'sbs_half',
    videoType: '360',
    projection: 'equirectangular',
    stereoscopy: 'sbs',
    resolution: 'original',
    fps: 'original',
    codec: 'h264',
    audio: 'keep',
    quality: 'high',
    description: 'Panorama 360° 3D estereoscópico com canais independentes por olho.'
  },
  vr360_tb: {
    name: 'VR 360° Estéreo (Top-and-Bottom)',
    format: 'vr360',
    outputFormat: 'top_bottom',
    outputLayout: 'top_bottom',
    videoType: '360',
    projection: 'equirectangular',
    stereoscopy: 'tb',
    resolution: 'original',
    fps: 'original',
    codec: 'h264',
    audio: 'keep',
    quality: 'high',
    description: 'Panorama 360° 3D em layout vertical Top/Bottom (padrão de câmeras VR profissionais).'
  },
  vr4k: {
    name: 'VR 4K Ultra HD (3840 × 2160)',
    format: 'custom',
    outputFormat: 'sbs_half',
    outputLayout: 'sbs_half',
    videoType: '360',
    projection: 'equirectangular',
    stereoscopy: 'mono',
    resolution: '3840x2160',
    fps: 'original',
    codec: 'h264',
    audio: 'keep',
    quality: 'very_high',
    description: 'Resolução 4K máxima para displays VR de alta densidade (verifique resolução de origem).'
  },
  custom: {
    name: 'Personalizado',
    format: 'custom',
    outputFormat: 'sbs_half',
    outputLayout: 'sbs_half',
    videoType: '2d',
    projection: 'equirectangular',
    stereoscopy: 'mono',
    resolution: 'original',
    fps: 'original',
    codec: 'h264',
    audio: 'keep',
    quality: 'custom',
    description: 'Controle manual completo de codec, resolução, taxa de quadros e filtros.'
  }
};

/**
 * Validação abrangente da configuração VR antes do processamento (Seção 36)
 * @param {Object} config
 * @param {Object} [metadata]
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export function validateVRConfiguration(config, metadata = {}) {
  const errors = [];
  const warnings = [];

  const {
    videoType = '2d',
    projection = 'equirectangular',
    stereoscopy = 'mono',
    outputLayout = 'sbs_half',
    resolution = 'original',
    customWidth,
    customHeight
  } = config;

  // 1. Incompatibilidades estruturais
  if (videoType === '2d' && (projection === 'fisheye' || projection === 'dual_fisheye')) {
    errors.push('Vídeo 2D convencional não é compatível com projeção Fisheye.');
  }

  if (resolution === 'custom') {
    if (!customWidth || !customHeight || customWidth <= 0 || customHeight <= 0) {
      errors.push('As dimensões de resolução personalizada devem ser maiores que zero.');
    }
  }

  // 2. Avisos contextuais inteligentes (Seção 35)
  if (videoType === '2d' && (outputLayout === 'sbs_half' || outputLayout === 'sbs_full')) {
    warnings.push('A saída é monoscópica duplicada. Ela permite visualização em VR/Cardboard, mas não cria profundidade 3D real.');
  }

  if (videoType === '360' && stereoscopy === 'mono' && (outputLayout === 'sbs_half' || outputLayout === 'sbs_full' || outputLayout === 'top_bottom')) {
    warnings.push('Vídeo 360° monoscópico. A saída duplica o mesmo panorama para ambos os olhos sem profundidade 3D.');
  }

  if (videoType === '180' && stereoscopy === 'mono') {
    warnings.push('Vídeo 180° monoscópico. O campo hemisférico será duplicado para ambos os olhos.');
  }

  if (projection === 'fisheye' || projection === 'dual_fisheye') {
    warnings.push('A projeção fisheye requer parâmetros de câmera específicos e opera em modo experimental.');
  }

  // 3. Verificação de Upscaling desnecessário (Seção 48)
  if (metadata.width && metadata.height && resolution !== 'original') {
    let targetW = 0;
    let targetH = 0;
    if (resolution === 'custom' && customWidth && customHeight) {
      targetW = customWidth;
      targetH = customHeight;
    } else {
      const parts = resolution.split('x');
      if (parts.length === 2) {
        targetW = parseInt(parts[0], 10);
        targetH = parseInt(parts[1], 10);
      }
    }

    if (targetW > metadata.width || targetH > metadata.height) {
      warnings.push(`A resolução selecionada (${targetW}×${targetH}) é superior à resolução original (${metadata.width}×${metadata.height}). Isso aumentará o arquivo sem recuperar detalhes ausentes na captura.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Constrói os passos do pipeline por olho:
 * Left Eye e Right Eye são extraídos e processados isoladamente antes da fusão.
 * @param {string} inputStereo - 'mono' | 'sbs' | 'tb'
 * @returns {{ leftCrop: string, rightCrop: string, isSplitNeeded: boolean }}
 */
export function getPerEyeFilters(inputStereo) {
  switch (inputStereo) {
    case 'tb':
      // Top-and-Bottom: topo é olho esquerdo, base é olho direito
      return {
        leftCrop: 'crop=iw:ih/2:0:0',
        rightCrop: 'crop=iw:ih/2:0:ih/2',
        isSplitNeeded: true
      };

    case 'sbs':
      // Side-by-Side: metade esquerda é olho esquerdo, metade direita é olho direito
      return {
        leftCrop: 'crop=iw/2:ih:0:0',
        rightCrop: 'crop=iw/2:ih:iw/2:0',
        isSplitNeeded: true
      };

    case 'mono':
    default:
      // Monoscópico: a mesma imagem original alimenta os dois olhos
      return {
        leftCrop: '',
        rightCrop: '',
        isSplitNeeded: true
      };
  }
}

/**
 * Constrói a cadeia unificada de filtros de vídeo para VR (Seção 38)
 * @param {Object} config
 * @returns {{ filter: string, targetWidth: number, targetHeight: number }}
 */
export function buildVRFilter(config) {
  const {
    inputWidth,
    inputHeight,
    videoType = '2d',
    projection = 'equirectangular',
    stereoscopy = 'mono',
    outputLayout = 'sbs_half',
    resolution = 'original',
    customWidth,
    customHeight,
    fisheyeParams
  } = config;

  // 1. Determina a resolução base de destino
  let baseWidth = inputWidth;
  let baseHeight = inputHeight;

  if (resolution !== 'original') {
    if (resolution === 'custom' && customWidth && customHeight) {
      baseWidth = makeEven(customWidth);
      baseHeight = makeEven(customHeight);
    } else {
      const parts = resolution.split('x');
      if (parts.length === 2) {
        baseWidth = parseInt(parts[0], 10);
        baseHeight = parseInt(parts[1], 10);
      }
    }
  }

  baseWidth = makeEven(baseWidth);
  baseHeight = makeEven(baseHeight);

  // 2. Extração e combinação por olho
  const { leftCrop, rightCrop } = getPerEyeFilters(stereoscopy);

  // 3. Monta filtros de acordo com o Layout de Saída
  if (outputLayout === 'top_bottom') {
    // SAÍDA TOP-AND-BOTTOM:
    // Altura total = baseHeight, dividida entre os dois olhos (cada olho = baseHeight / 2)
    // Largura total = baseWidth
    const eyeHeight = makeEven(baseHeight / 2);
    const finalWidth = baseWidth;
    const finalHeight = eyeHeight * 2;

    if (stereoscopy === 'mono') {
      // Duplica imagem verticalmente
      const filter = `scale=${finalWidth}:${eyeHeight},split=2[t][b];[t][b]vstack`;
      return { filter, targetWidth: finalWidth, targetHeight: finalHeight };
    }

    if (stereoscopy === 'sbs') {
      // Converte Side-by-Side para Top-and-Bottom (Seção 11)
      const filter = `split=2[l_in][r_in];[l_in]${leftCrop},scale=${finalWidth}:${eyeHeight}[t];[r_in]${rightCrop},scale=${finalWidth}:${eyeHeight}[b];[t][b]vstack`;
      return { filter, targetWidth: finalWidth, targetHeight: finalHeight };
    }

    if (stereoscopy === 'tb') {
      // Normaliza resolução Top-and-Bottom
      const filter = `split=2[t_in][b_in];[t_in]${leftCrop},scale=${finalWidth}:${eyeHeight}[t];[b_in]${rightCrop},scale=${finalWidth}:${eyeHeight}[b];[t][b]vstack`;
      return { filter, targetWidth: finalWidth, targetHeight: finalHeight };
    }
  }

  if (outputLayout === 'sbs_full') {
    // SAÍDA SBS FULL:
    // Cada olho mantém a resolução horizontal completa (baseWidth x baseHeight)
    // Largura total = 2 * baseWidth
    const eyeWidth = baseWidth;
    const finalWidth = eyeWidth * 2;
    const finalHeight = baseHeight;

    if (stereoscopy === 'mono') {
      const filter = `scale=${eyeWidth}:${finalHeight},split=2[l][r];[l][r]hstack`;
      return { filter, targetWidth: finalWidth, targetHeight: finalHeight };
    }

    if (stereoscopy === 'tb') {
      // Converte Top-and-Bottom para SBS Full
      const filter = `split=2[t_in][b_in];[t_in]${leftCrop},scale=${eyeWidth}:${finalHeight}[l];[b_in]${rightCrop},scale=${eyeWidth}:${finalHeight}[r];[l][r]hstack`;
      return { filter, targetWidth: finalWidth, targetHeight: finalHeight };
    }

    if (stereoscopy === 'sbs') {
      // Normaliza SBS para Full
      const filter = `split=2[l_in][r_in];[l_in]${leftCrop},scale=${eyeWidth}:${finalHeight}[l];[r_in]${rightCrop},scale=${eyeWidth}:${finalHeight}[r];[l][r]hstack`;
      return { filter, targetWidth: finalWidth, targetHeight: finalHeight };
    }
  }

  // PADRÃO: SBS HALF / GOOGLE CARDBOARD
  // Largura total = baseWidth, dividida entre os dois olhos (cada olho = baseWidth / 2)
  // Altura total = baseHeight
  const eyeWidth = makeEven(baseWidth / 2);
  const finalWidth = eyeWidth * 2;
  const finalHeight = baseHeight;

  if (stereoscopy === 'mono') {
    const filter = `scale=${eyeWidth}:${finalHeight},split=2[l][r];[l][r]hstack`;
    return { filter, targetWidth: finalWidth, targetHeight: finalHeight };
  }

  if (stereoscopy === 'tb') {
    // Converte Top-and-Bottom para SBS Half (Seção 10)
    const filter = `split=2[t_in][b_in];[t_in]${leftCrop},scale=${eyeWidth}:${finalHeight}[l];[b_in]${rightCrop},scale=${eyeWidth}:${finalHeight}[r];[l][r]hstack`;
    return { filter, targetWidth: finalWidth, targetHeight: finalHeight };
  }

  if (stereoscopy === 'sbs') {
    // Normaliza SBS de entrada para SBS Half de saída
    const filter = `split=2[l_in][r_in];[l_in]${leftCrop},scale=${eyeWidth}:${finalHeight}[l];[r_in]${rightCrop},scale=${eyeWidth}:${finalHeight}[r];[l][r]hstack`;
    return { filter, targetWidth: finalWidth, targetHeight: finalHeight };
  }

  const filter = `scale=${eyeWidth}:${finalHeight},split=2[l][r];[l][r]hstack`;
  return { filter, targetWidth: finalWidth, targetHeight: finalHeight };
}

/**
 * Função mantida para retrocompatibilidade (encaminha para buildVRFilter)
 * @param {Object} options
 * @returns {{ filter: string, targetWidth: number, targetHeight: number }}
 */
export function buildSbsFilter(options) {
  const outputLayout = options.outputFormat === 'top_bottom' ? 'top_bottom' :
    (options.outputFormat === 'sbs_full' ? 'sbs_full' : 'sbs_half');

  return buildVRFilter({
    ...options,
    outputLayout
  });
}

/**
 * Mapeia opção de qualidade para argumentos do encoder libx264
 * @param {string} quality - 'fast' | 'balanced' | 'high' | 'max' | 'low' | 'medium' | 'very_high' | 'custom'
 * @param {number} [customCrf]
 * @returns {string[]} Argumentos do FFmpeg
 */
export function getQualityArgs(quality, customCrf = 22) {
  switch (quality) {
    case 'fast':
    case 'low':
      // Modo rápido: prioriza velocidade de conversão
      return ['-crf', '26', '-preset', 'ultrafast'];
    case 'balanced':
    case 'medium':
      // Modo equilibrado: balanceia fidelidade e tempo de processamento
      return ['-crf', '22', '-preset', 'veryfast'];
    case 'high':
      // Alta qualidade: recomendado para VR nítido
      return ['-crf', '18', '-preset', 'veryfast'];
    case 'max':
    case 'very_high':
      // Máxima qualidade: maior fidelidade visual
      return ['-crf', '15', '-preset', 'faster'];
    case 'custom':
      return ['-crf', String(customCrf || 22), '-preset', 'veryfast'];
    case 'auto':
    default:
      return ['-crf', '22', '-preset', 'veryfast'];
  }
}
