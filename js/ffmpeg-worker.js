/**
 * VR Video Converter
 * Version: v.1.0.3
 *
 * ffmpeg-worker.js - Web Worker dedicado para processamento FFmpeg WebAssembly
 *
 * Responsável por carregar o FFmpeg, validar a integridade do binário WebAssembly,
 * gerenciar o sistema de arquivos virtual, executar conversões em segundo plano,
 * reportar progresso em tempo real e transferir o arquivo resultante.
 */

/* global importScripts, createFFmpegCore */

let core = null;
let isConverting = false;
let totalDurationSeconds = 0;

/**
 * Envia mensagem para a thread principal
 * @param {string} type
 * @param {Object} payload
 * @param {Transferable[]} [transfer]
 */
function send(type, payload = {}, transfer = []) {
  self.postMessage({ type, ...payload }, transfer);
}

/**
 * Converte tempo HH:MM:SS.xx para segundos
 * @param {string} str
 * @returns {number}
 */
function parseTime(str) {
  if (!str) return 0;
  const parts = str.trim().split(':');
  if (parts.length === 3) {
    const h = parseFloat(parts[0]) || 0;
    const m = parseFloat(parts[1]) || 0;
    const s = parseFloat(parts[2]) || 0;
    return h * 3600 + m * 60 + s;
  }
  return 0;
}

/**
 * Valida a integridade do binário WebAssembly antes de carregar no core
 * Verifica assinatura mágica 00 61 73 6d e diagnostica respostas HTML (ex: 404 retornado como HTML).
 * @param {string} url Caminho ou URL para o arquivo .wasm
 * @returns {Promise<ArrayBuffer>}
 */
async function validateWasmBinary(url) {
  let response;
  try {
    response = await fetch(url, { credentials: 'same-origin' });
  } catch (netErr) {
    throw new Error(`Não foi possível conectar ao arquivo WebAssembly local: ${netErr.message}`);
  }

  if (!response.ok) {
    throw new Error(`Não foi possível carregar o WebAssembly: HTTP ${response.status} ao acessar "${url}".`);
  }

  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  if (bytes.length < 4) {
    throw new Error(`Arquivo WebAssembly corrompido ou vazio (tamanho: ${bytes.length} bytes).`);
  }

  // Detecta se o servidor retornou HTML no lugar do binário (ex: <!DOCTYPE ...> ou <html...)
  // Bytes 0x3c 0x21 0x44 0x4f correspondem a '<!DO'
  const isHtml =
    (bytes[0] === 0x3c && bytes[1] === 0x21 && bytes[2] === 0x44 && bytes[3] === 0x4f) ||
    contentType.includes('text/html');

  if (isHtml) {
    throw new Error(
      'Falha ao carregar o módulo WebAssembly do FFmpeg.\n' +
      'O navegador recebeu HTML no lugar do arquivo WebAssembly (resposta 404 retornada como página HTML).\n' +
      `URL acessada: ${url}\n` +
      'Verifique o caminho local dos arquivos do FFmpeg (lib/ffmpeg/ffmpeg-core.wasm).'
    );
  }

  // Verifica magic word padrão WebAssembly: 0x00 0x61 0x73 0x6d (\0asm)
  const isWasm =
    bytes[0] === 0x00 &&
    bytes[1] === 0x61 &&
    bytes[2] === 0x73 &&
    bytes[3] === 0x6d;

  if (!isWasm) {
    const hexFound = Array.from(bytes.slice(0, 4))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join(' ');
    throw new Error(
      `O arquivo carregado não é um WebAssembly válido. Magic word esperado: 00 61 73 6d, encontrado: ${hexFound}.`
    );
  }

  return buffer;
}

/**
 * Inicializa o FFmpeg WebAssembly
 * @param {string} basePath Caminho base para os arquivos da biblioteca
 */
async function initFFmpeg(basePath = '../lib/ffmpeg/') {
  if (core) {
    send('LOADED', { message: 'FFmpeg já está inicializado.' });
    return;
  }

  send('STATUS', {
    state: 'loading',
    message: 'Carregando biblioteca FFmpeg WebAssembly...'
  });

  try {
    let wasmUrl = basePath + 'ffmpeg-core.wasm';
    let coreScriptUrl = basePath + 'ffmpeg-core.js';

    if (typeof self !== 'undefined' && self.location && self.location.href) {
      try {
        wasmUrl = new URL(basePath + 'ffmpeg-core.wasm', self.location.href).href;
        coreScriptUrl = new URL(basePath + 'ffmpeg-core.js', self.location.href).href;
      } catch (_) {}
    }

    send('STATUS', {
      state: 'validating',
      message: 'Validando WebAssembly...'
    });
    send('LOG', { message: `[Worker] Validando binário WebAssembly em: ${wasmUrl}` });

    const wasmBinary = await validateWasmBinary(wasmUrl);
    send('LOG', { message: `[Worker] WebAssembly validado com sucesso (${wasmBinary.byteLength} bytes).` });

    importScripts(coreScriptUrl);

    if (typeof createFFmpegCore !== 'function') {
      throw new Error('createFFmpegCore não foi encontrado no script importado.');
    }

    // Configura metadados para @ffmpeg/core
    const mainScriptUrlOrBlob = '#' + btoa(JSON.stringify({ wasmURL: wasmUrl, workerURL: '' }));

    core = await createFFmpegCore({
      wasmBinary,
      mainScriptUrlOrBlob,
      locateFile: (path) => {
        if (path.endsWith('.wasm')) return wasmUrl;
        return basePath + path;
      },
      print: (text) => {
        send('LOG', { message: text });
      },
      printErr: (text) => {
        handleStderrLog(text);
      }
    });

    // Configura o logger oficial se disponível
    if (typeof core.setLogger === 'function') {
      core.setLogger((log) => {
        if (log && log.message) {
          send('LOG', { message: log.message });
          handleStderrLog(log.message);
        }
      });
    }

    // Configura o callback de progresso oficial
    if (typeof core.setProgress === 'function') {
      core.setProgress((p) => {
        if (p && typeof p.progress === 'number') {
          if (p.progress >= 0 && p.progress <= 1) {
            send('PROGRESS', {
              ratio: p.progress,
              percent: Math.min(100, Math.max(0, Math.round(p.progress * 100))),
              time: p.time ? p.time / 1000000 : 0
            });
          }
        }
      });
    }

    send('STATUS', {
      state: 'ready',
      message: 'FFmpeg pronto'
    });
    send('LOADED', { message: 'FFmpeg WebAssembly inicializado com sucesso.' });
  } catch (err) {
    send('STATUS', {
      state: 'error',
      message: 'FFmpeg: erro'
    });
    send('ERROR', {
      error: `Falha ao inicializar o FFmpeg WebAssembly: ${err.message || err}`,
      fatal: true
    });
  }
}

/**
 * Analisa as linhas de log para capturar tempo, fps e velocidade
 * Exemplo: frame=  120 fps= 24 q=23.0 size= 1024kB time=00:00:04.80 bitrate=1747.6kbits/s speed=1.24x
 * @param {string} text
 */
function handleStderrLog(text) {
  if (!text) return;
  send('LOG', { message: text });

  // Captura duration do vídeo de entrada se ainda não conhecido
  const durationMatch = text.match(/Duration:\s*(\d{2}:\d{2}:\d{2}(?:\.\d+)?)/i);
  if (durationMatch && !totalDurationSeconds) {
    totalDurationSeconds = parseTime(durationMatch[1]);
  }

  // Captura linha de status do FFmpeg
  if (text.includes('time=') && (text.includes('frame=') || text.includes('size='))) {
    const timeMatch = text.match(/time=(\d{2}:\d{2}:\d{2}(?:\.\d+)?)/);
    const speedMatch = text.match(/speed=\s*([0-9.]+)x/);
    const fpsMatch = text.match(/fps=\s*([0-9.]+)/);
    const frameMatch = text.match(/frame=\s*([0-9]+)/);

    let currentTime = 0;
    if (timeMatch) {
      currentTime = parseTime(timeMatch[1]);
    }

    const speed = speedMatch ? parseFloat(speedMatch[1]) : 0;
    const fps = fpsMatch ? parseFloat(fpsMatch[1]) : 0;
    const frame = frameMatch ? parseInt(frameMatch[1], 10) : 0;

    let ratio = 0;
    if (totalDurationSeconds > 0 && currentTime > 0) {
      ratio = Math.min(0.99, currentTime / totalDurationSeconds);
    }

    send('PROGRESS', {
      ratio,
      percent: Math.round(ratio * 100),
      currentTime,
      totalDuration: totalDurationSeconds,
      speed,
      fps,
      frame
    });
  }
}

/**
 * Executa conversão de vídeo
 * @param {Object} data
 */
async function convertVideo(data) {
  if (!core) {
    send('ERROR', { error: 'FFmpeg ainda não foi inicializado.' });
    return;
  }

  if (isConverting) {
    send('ERROR', { error: 'Uma conversão já está em andamento.' });
    return;
  }

  isConverting = true;
  const {
    inputData,
    inputFileName,
    outputFileName,
    ffmpegArgs,
    videoDuration
  } = data;

  totalDurationSeconds = videoDuration || 0;

  try {
    send('STATUS', {
      state: 'processing',
      message: 'Preparando arquivos no sistema de arquivos virtual...'
    });

    // Grava o arquivo de entrada no FS do Emscripten
    core.FS.writeFile(inputFileName, inputData);

    send('STATUS', {
      state: 'processing',
      message: 'Iniciando processamento FFmpeg...'
    });
    send('PROGRESS', { ratio: 0, percent: 0, currentTime: 0, totalDuration: totalDurationSeconds });

    // Chama core.exec com os argumentos fornecidos
    const exitCode = core.exec(...ffmpegArgs);

    if (exitCode !== 0) {
      throw new Error(`FFmpeg finalizou com código de erro ${exitCode}.`);
    }

    send('STATUS', {
      state: 'processing',
      message: 'Lendo arquivo gerado...'
    });

    // Lê os dados do arquivo de saída do FS
    const outputData = core.FS.readFile(outputFileName);

    if (!outputData || outputData.length === 0) {
      throw new Error('O arquivo de saída gerado pelo FFmpeg está vazio.');
    }

    send('STATUS', {
      state: 'processing',
      message: 'Limpando arquivos temporários...'
    });

    // Remove arquivos do FS virtual para liberar memória
    try {
      core.FS.unlink(inputFileName);
    } catch (e) {}

    try {
      core.FS.unlink(outputFileName);
    } catch (e) {}

    // Envia o resultado com transferência direta de ArrayBuffer
    send('SUCCESS', {
      outputData,
      outputFileName,
      size: outputData.length
    }, [outputData.buffer]);

  } catch (err) {
    try {
      core.FS.unlink(inputFileName);
    } catch (e) {}
    try {
      core.FS.unlink(outputFileName);
    } catch (e) {}

    send('ERROR', {
      error: `Erro durante a conversão: ${err.message || err}`
    });
  } finally {
    isConverting = false;
    totalDurationSeconds = 0;
  }
}

// Receptor de mensagens da thread principal
self.onmessage = async (event) => {
  const { type, data } = event.data;

  switch (type) {
    case 'INIT':
      await initFFmpeg(data?.basePath);
      break;

    case 'CONVERT':
      await convertVideo(data);
      break;

    default:
      console.warn(`[Worker] Tipo de mensagem não reconhecido: ${type}`);
  }
};
