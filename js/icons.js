/**
 * VR Video Converter
 * Version: v.1.0.4
 *
 * icons.js - Biblioteca de Ícones SVG Inline do VR Video Converter
 *
 * Garante fidelidade visual, conformidade com a regra "Zero Emojis",
 * funcionamento 100% offline (sem CDNs externas) e total acessibilidade.
 */

/**
 * Cria elemento SVG formatado com atributos padrões
 * @param {string} innerPaths Conteúdo interno do SVG
 * @param {string} [className='ui-icon']
 * @param {number} [size=20]
 * @param {string} [ariaLabel='']
 * @returns {string} Código HTML do SVG
 */
export function createSvg(innerPaths, className = 'ui-icon', size = 20, ariaLabel = '') {
  const ariaAttr = ariaLabel ? `aria-label="${ariaLabel}" role="img"` : 'aria-hidden="true"';
  return `<svg class="${className}" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${ariaAttr}>${innerPaths}</svg>`;
}

/**
 * Normaliza argumentos para className e size
 */
function resolveClassAndSize(defaultClass, defaultSize, arg1, arg2) {
  if (typeof arg1 === 'number') {
    return { className: defaultClass, size: arg1 };
  }
  return { className: arg1 || defaultClass, size: arg2 || defaultSize };
}

// Ampulheta para monitoramento de conversão em tempo real
export function SVG_HOURGLASS(options = true, maybeSize = 24) {
  let isActive = true;
  let size = 24;
  let className = 'conversion-hourglass';

  if (typeof options === 'boolean') {
    isActive = options;
    size = maybeSize || 24;
  } else if (typeof options === 'object' && options !== null) {
    isActive = options.isActive ?? options.isSpinning ?? options.spinning ?? true;
    size = options.size || 24;
    className = options.className || 'conversion-hourglass';
  } else if (typeof options === 'string') {
    className = options;
    isActive = maybeSize !== false;
  }

  const activeClasses = isActive ? 'is-active is-spinning' : '';
  const fullClass = `${className} ${activeClasses}`.trim();
  return `<svg class="${fullClass}" id="conversion-hourglass" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg>`;
}

// Sucesso / Concluído
export const SVG_CHECK = (arg1 = 'ui-icon text-success', arg2 = 20) => {
  const { className, size } = resolveClassAndSize('ui-icon text-success', 20, arg1, arg2);
  return createSvg('<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>', className, size, 'Sucesso');
};

// Erro
export const SVG_ERROR = (arg1 = 'ui-icon text-danger', arg2 = 20) => {
  const { className, size } = resolveClassAndSize('ui-icon text-danger', 20, arg1, arg2);
  return createSvg('<polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>', className, size, 'Erro');
};

// Alerta / Atenção
export const SVG_WARNING = (arg1 = 'ui-icon text-warning', arg2 = 20) => {
  const { className, size } = resolveClassAndSize('ui-icon text-warning', 20, arg1, arg2);
  return createSvg('<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>', className, size, 'Atenção');
};

// Informação
export const SVG_INFO = (arg1 = 'ui-icon text-info', arg2 = 20) => {
  const { className, size } = resolveClassAndSize('ui-icon text-info', 20, arg1, arg2);
  return createSvg('<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>', className, size, 'Informação');
};

// Sugestão / Dica
export const SVG_LIGHTBULB = (arg1 = 'ui-icon text-warning', arg2 = 20) => {
  const { className, size } = resolveClassAndSize('ui-icon text-warning', 20, arg1, arg2);
  return createSvg('<path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5.76.76 1.23 1.52 1.41 2.5"/>', className, size, 'Dica');
};

// Bússola / Calibração
export const SVG_COMPASS = (className = 'ui-icon', size = 20) =>
  createSvg('<circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>', className, size, 'Calibração');

// Antena / Metadados
export const SVG_RADAR = (className = 'ui-icon', size = 20) =>
  createSvg('<path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1"/>', className, size, 'Metadados');

// Configurações (Engrenagem)
export const SVG_SETTINGS = (className = 'ui-icon', size = 20) =>
  createSvg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z"/>', className, size, 'Configurações');

// Relógio / Tempo
export const SVG_CLOCK = (className = 'ui-icon', size = 20) =>
  createSvg('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>', className, size, 'Tempo');

// Velocímetro / Desempenho
export const SVG_SPEED = (className = 'ui-icon', size = 20) =>
  createSvg('<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>', className, size, 'Velocidade');

// Quadro de Vídeo
export const SVG_FRAME = (className = 'ui-icon', size = 20) =>
  createSvg('<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 3v18M17 3v18M3 7.5h4M3 12h18M3 16.5h4M17 7.5h4M17 16.5h4"/>', className, size, 'Quadro');

// Cancelar / Fechar
export const SVG_CANCEL = (arg1 = 'ui-icon text-danger', arg2 = 20) => {
  const { className, size } = resolveClassAndSize('ui-icon text-danger', 20, arg1, arg2);
  return createSvg('<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>', className, size, 'Cancelar');
};

// Upload
export const SVG_UPLOAD = (className = 'ui-icon', size = 20) =>
  createSvg('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>', className, size, 'Upload');

// Download
export const SVG_DOWNLOAD = (className = 'ui-icon', size = 20) =>
  createSvg('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>', className, size, 'Download');

// Spinner circular de processamento
export const SVG_SPINNER = (className = 'ui-spinner is-spinning', size = 20) =>
  createSvg('<line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>', className, size, 'Carregando');
