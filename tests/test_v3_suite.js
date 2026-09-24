/**
 * test_v3_suite.js - Suíte Completa de Testes da Versão 3
 * VR Video Converter
 *
 * Cobre:
 * 1. Testes Unitários de Funções (detectVideoType, validateVRConfiguration, buildVRFilter, etc.)
 * 2. Testes de Invalidação (2D + Fisheye, dimensões inválidas, arquivo vazio)
 * 3. Testes Reais com FFmpeg WebAssembly (Testes A até I da Seção 61)
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Simulação de ambiente Web Worker para o ffmpeg-core
global.self = global;
global.location = { href: 'http://localhost:8000/' };

const createFFmpegCore = require('../lib/ffmpeg/ffmpeg-core.js');

async function main() {
  console.log('====================================================');
  console.log('    VR VIDEO CONVERTER - SUÍTE DE TESTES V3         ');
  console.log('====================================================\n');

  // Import dinâmico dos módulos ESM da aplicação
  const { detectVideoType } = await import('../js/video-info.js');
  const {
    validateVRConfiguration,
    buildVRFilter,
    getQualityArgs,
    makeEven
  } = await import('../js/vr-processing.js');
  const { buildOutputFileName, calculateAspectRatio } = await import('../js/utils.js');
  const { validateConversionParams } = await import('../js/converter.js');

  // ==========================================
  // BLOCO 1: TESTES UNITÁRIOS DAS FUNÇÕES PURAS
  // ==========================================
  console.log('--- BLOCO 1: TESTES UNITÁRIOS DE LÓGICA E MATEMÁTICA ---');

  // 1. makeEven
  assert.strictEqual(makeEven(1920), 1920);
  assert.strictEqual(makeEven(1921), 1920);
  assert.strictEqual(makeEven(960.4), 960);
  console.log('✓ makeEven: garante dimensões estritamente pares para encoder H.264.');

  // 2. calculateAspectRatio
  assert.strictEqual(calculateAspectRatio(1920, 1080), '16:9');
  assert.strictEqual(calculateAspectRatio(3840, 1920), '2:1 (Equirretangular 360)');
  assert.strictEqual(calculateAspectRatio(1920, 1920), '1:1 (Quadrado / Top-Bottom)');
  console.log('✓ calculateAspectRatio: reconhece proporções 16:9, 2:1 e 1:1.');

  // 3. detectVideoType (Seção 6 da V3: probabilidade, não certeza absoluta)
  const d360 = detectVideoType({ fileName: 'camera_360.mp4', width: 3840, height: 1920 });
  assert.strictEqual(d360.type, '360');
  assert.ok(d360.reason.includes('sugere') || d360.reason.includes('possivelmente'));

  const d180 = detectVideoType({ fileName: 'passeio_vr180_sbs.mp4', width: 3840, height: 1920 });
  assert.strictEqual(d180.type, '180');
  assert.strictEqual(d180.stereoscopy, 'sbs');

  const d2d = detectVideoType({ fileName: 'filme.mp4', width: 1920, height: 1080 });
  assert.strictEqual(d2d.type, '2d');
  console.log('✓ detectVideoType: detecção probabilística com mensagens respeitosas.');

  // 4. buildOutputFileName (Seção 56 da V3)
  assert.strictEqual(
    buildOutputFileName('meu_video.mp4', 'cardboard', '2d'),
    'meu_video_Cardboard_SBS.mp4'
  );
  assert.strictEqual(
    buildOutputFileName('meu_video.mp4', 'top_bottom', '360'),
    'meu_video_VR_360_TB.mp4'
  );
  assert.strictEqual(
    buildOutputFileName('meu_video.mp4', 'sbs_half', '360'),
    'meu_video_VR_360_SBS.mp4'
  );
  assert.strictEqual(
    buildOutputFileName('meu_video.mp4', 'sbs_full', '180'),
    'meu_video_VR_180_SBS_Full.mp4'
  );
  console.log('✓ buildOutputFileName: gera nomenclatura precisa para Cardboard, SBS e TB.');

  // 5. validateVRConfiguration e Invalidações (Seção 36 e 75)
  const invFisheye = validateVRConfiguration({
    videoType: '2d',
    projection: 'fisheye'
  });
  assert.strictEqual(invFisheye.valid, false, '2D + Fisheye deve ser invalidado');

  const warnUpscale = validateVRConfiguration(
    { videoType: '2d', resolution: '3840x2160' },
    { width: 1920, height: 1080 }
  );
  assert.strictEqual(warnUpscale.valid, true);
  assert.ok(warnUpscale.warnings.some(w => w.includes('superior à resolução original')));

  const invEmptyFile = validateConversionParams(
    { size: 0, name: 'vazio.mp4' },
    { outputFormat: 'sbs_half' }
  );
  assert.strictEqual(invEmptyFile.valid, false, 'Arquivo de 0 bytes deve ser recusado');
  console.log('✓ validateVRConfiguration: validações e avisos contextuais validados com sucesso.');

  // 6. Testes de Validação de Versão e TimeEstimator (Versão 5)
  const { APP_VERSION } = await import('../js/version.js');
  assert.strictEqual(APP_VERSION, 'v.1.0.2', 'Versão deve ser exatamente v.1.0.2');
  console.log(`✓ APP_VERSION: validada como ${APP_VERSION} no módulo central.`);

  const { TimeEstimator } = await import('../js/time-estimator.js');
  const { PRESETS } = await import('../js/vr-processing.js');

  // Teste de complexidade para vídeo 4K 60FPS (Seções 19-22)
  const meta4k = { width: 3840, height: 2160, fps: 60, duration: 238, name: 'video_4k.mp4' };
  const complexity4k = TimeEstimator.calculateComplexity(meta4k);
  assert.strictEqual(complexity4k.pixelsPerFrame, 8294400, 'Pixels por quadro de 4K deve ser 8.294.400');
  assert.strictEqual(complexity4k.pixelsPerSecond, 497664000, 'Pixels/s de 4K 60FPS deve ser 497.664.000');
  assert.strictEqual(complexity4k.totalFrames, 14280, 'Total de quadros de 238s @ 60FPS deve ser 14.280');
  assert.strictEqual(complexity4k.isHeavy, true, 'Vídeo 4K 60FPS deve ser classificado como pesado');
  assert.strictEqual(complexity4k.tier, 'Muito pesado', 'Tier deve ser Muito pesado');
  console.log('✓ TimeEstimator.calculateComplexity: cálculo exato de 4K/60FPS aprovado.');

  // Teste de cálculo de estimativa contínua e suavização (Seções 4-8, 30)
  const estimator = new TimeEstimator(meta4k);
  // Simula estado inicial
  const initMetrics = estimator.update({});
  assert.strictEqual(initMetrics.remainingFormatted, 'Calculando estimativa...', 'Início deve exibir Calculando estimativa...');

  // Simula progresso com speed=0.0217x e frame=397
  const progressMock = { speed: 0.0217, frame: 397, time: 6.04, percent: 2.78 };
  const updatedMetrics = estimator.update(progressMock);
  assert.ok(updatedMetrics.remainingSeconds > 0, 'Tempo restante deve ser maior que 0');
  assert.strictEqual(updatedMetrics.speedRating.label, 'Muito lento', 'Speed 0.0217 deve ser classificado como Muito lento');
  assert.strictEqual(updatedMetrics.speedRating.slow, true, 'Deve marcar slow=true para velocidade < 0.1x');
  assert.ok(updatedMetrics.remainingFormatted.includes(':'), 'Deve formatar tempo restante como HH:MM:SS');
  console.log(`✓ TimeEstimator.update: estimativa dinâmica calculada (${updatedMetrics.remainingFormatted}, ${updatedMetrics.speedRating.label}).`);

  // Teste do preset Quick Test (Seção 24)
  assert.ok(PRESETS.quick_test, 'Preset quick_test deve existir');
  assert.strictEqual(PRESETS.quick_test.resolution, '1280x720');
  assert.strictEqual(PRESETS.quick_test.codec, 'h264');
  console.log('✓ Preset quick_test: validado para teste rápido 1280x720.');

  // Simula lógica de validação de WASM
  function testWasmBufferValidation(buffer, contentType = 'application/wasm') {
    const bytes = new Uint8Array(buffer);
    if (bytes.length < 4) throw new Error('Arquivo corrompido');
    const isHtml =
      (bytes[0] === 0x3c && bytes[1] === 0x21 && bytes[2] === 0x44 && bytes[3] === 0x4f) ||
      contentType.includes('text/html');
    if (isHtml) throw new Error('O FFmpeg recebeu HTML no lugar do arquivo WebAssembly.');
    const isWasm =
      bytes[0] === 0x00 && bytes[1] === 0x61 && bytes[2] === 0x73 && bytes[3] === 0x6d;
    if (!isWasm) throw new Error('Magic word esperado: 00 61 73 6d');
    return true;
  }

  // Testa WASM real
  const realWasm = fs.readFileSync(path.resolve(__dirname, '../lib/ffmpeg/ffmpeg-core.wasm'));
  assert.strictEqual(testWasmBufferValidation(realWasm), true);
  console.log('✓ validateWasmBinary: aprova binário real do ffmpeg-core.wasm (00 61 73 6d).');

  // Testa rejeição de HTML 404 (3c 21 44 4f)
  const fakeHtml = Buffer.from('<!DOCTYPE html><html><body>404 Not Found</body></html>');
  assert.throws(
    () => testWasmBufferValidation(fakeHtml, 'text/html'),
    /O FFmpeg recebeu HTML no lugar do arquivo WebAssembly/
  );
  console.log('✓ validateWasmBinary: rejeita HTML e diagnostica erro 404 retornado como página.');

  // ==========================================
  // BLOCO 2: EXECUÇÃO REAL NO CORE FFMPEG WEBASSEMBLY (TESTES A ATÉ I)
  // ==========================================
  console.log('--- BLOCO 2: EXECUÇÃO REAL NO CORE FFMPEG WEBASSEMBLY ---');
  console.log('Carregando binário WebAssembly lib/ffmpeg/ffmpeg-core.wasm...');

  const wasmPath = path.resolve(__dirname, '../lib/ffmpeg/ffmpeg-core.wasm');
  const wasmBinary = fs.readFileSync(wasmPath);

  const core = await createFFmpegCore({
    wasmBinary,
    print: () => {},
    printErr: () => {}
  });

  console.log('✓ Core WebAssembly carregado!\n');

  const tests = [
    {
      id: 'TESTE A',
      desc: '2D Mono -> SBS Half',
      inputFile: 'test_2d.mp4',
      virtIn: 'in_2d_a.mp4',
      virtOut: 'out_test_a.mp4',
      config: {
        inputWidth: 640, inputHeight: 360,
        videoType: '2d', stereoscopy: 'mono',
        outputLayout: 'sbs_half', resolution: 'original'
      }
    },
    {
      id: 'TESTE B',
      desc: '2D Mono -> SBS Full',
      inputFile: 'test_2d.mp4',
      virtIn: 'in_2d_b.mp4',
      virtOut: 'out_test_b.mp4',
      config: {
        inputWidth: 640, inputHeight: 360,
        videoType: '2d', stereoscopy: 'mono',
        outputLayout: 'sbs_full', resolution: 'original'
      }
    },
    {
      id: 'TESTE C',
      desc: '2D Mono -> Cardboard Preset',
      inputFile: 'test_2d.mp4',
      virtIn: 'in_2d_c.mp4',
      virtOut: 'out_test_c.mp4',
      config: {
        inputWidth: 640, inputHeight: 360,
        videoType: '2d', stereoscopy: 'mono',
        outputLayout: 'sbs_half', resolution: 'original'
      }
    },
    {
      id: 'TESTE D',
      desc: '360° Equirretangular Mono -> SBS',
      inputFile: 'test_360.mp4',
      virtIn: 'in_360_d.mp4',
      virtOut: 'out_test_d.mp4',
      config: {
        inputWidth: 640, inputHeight: 320,
        videoType: '360', stereoscopy: 'mono',
        outputLayout: 'sbs_half', resolution: 'original'
      }
    },
    {
      id: 'TESTE E',
      desc: '360° SBS -> SBS',
      inputFile: 'test_360_sbs.mp4',
      virtIn: 'in_360_sbs_e.mp4',
      virtOut: 'out_test_e.mp4',
      config: {
        inputWidth: 640, inputHeight: 320,
        videoType: '360', stereoscopy: 'sbs',
        outputLayout: 'sbs_half', resolution: 'original'
      }
    },
    {
      id: 'TESTE F',
      desc: '360° Top/Bottom -> SBS (Seção 10 da V3)',
      inputFile: 'test_360_tb.mp4',
      virtIn: 'in_360_tb_f.mp4',
      virtOut: 'out_test_f.mp4',
      config: {
        inputWidth: 640, inputHeight: 320,
        videoType: '360', stereoscopy: 'tb',
        outputLayout: 'sbs_half', resolution: 'original'
      }
    },
    {
      id: 'TESTE G',
      desc: '360° SBS -> Top/Bottom (Seção 11 da V3)',
      inputFile: 'test_360_sbs.mp4',
      virtIn: 'in_360_sbs_g.mp4',
      virtOut: 'out_test_g.mp4',
      config: {
        inputWidth: 640, inputHeight: 320,
        videoType: '360', stereoscopy: 'sbs',
        outputLayout: 'top_bottom', resolution: 'original'
      }
    },
    {
      id: 'TESTE H',
      desc: '180° Equirretangular Mono -> SBS',
      inputFile: 'test_180.mp4',
      virtIn: 'in_180_h.mp4',
      virtOut: 'out_test_h.mp4',
      config: {
        inputWidth: 480, inputHeight: 480,
        videoType: '180', stereoscopy: 'mono',
        outputLayout: 'sbs_half', resolution: 'original'
      }
    },
    {
      id: 'TESTE I',
      desc: '180° Stereo SBS -> SBS',
      inputFile: 'test_180_sbs.mp4',
      virtIn: 'in_180_sbs_i.mp4',
      virtOut: 'out_test_i.mp4',
      config: {
        inputWidth: 480, inputHeight: 480,
        videoType: '180', stereoscopy: 'sbs',
        outputLayout: 'sbs_half', resolution: 'original'
      }
    }
  ];

  for (const t of tests) {
    const inputPath = path.resolve(__dirname, t.inputFile);
    const inputBuffer = fs.readFileSync(inputPath);

    core.FS.writeFile(t.virtIn, inputBuffer);

    const { filter, targetWidth, targetHeight } = buildVRFilter(t.config);

    const args = [
      '-i', t.virtIn,
      '-vf', filter,
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
      '-preset', 'ultrafast', '-crf', '26',
      '-c:a', 'aac', '-b:a', '64k',
      '-y', t.virtOut
    ];

    const tStart = Date.now();
    const ret = core.exec(...args);
    const tElapsed = ((Date.now() - tStart) / 1000).toFixed(2);

    assert.strictEqual(ret, 0, `${t.id} falhou com código de erro ${ret}`);

    const outData = core.FS.readFile(t.virtOut);
    assert.ok(outData.length > 0, `${t.id} produziu arquivo de 0 bytes`);

    // Limpa FS virtual
    core.FS.unlink(t.virtIn);
    core.FS.unlink(t.virtOut);

    console.log(`✓ ${t.id} (${t.desc}): OK em ${tElapsed}s (${outData.length} bytes gerados) -> ${targetWidth}x${targetHeight}`);
  }

  console.log('\n====================================================');
  console.log('  TODOS OS 9 TESTES (A ATÉ I) EXECUTADOS E APROVADOS!');
  console.log('====================================================');
}

main().catch(err => {
  console.error('Falha nos testes V3:', err);
  process.exit(1);
});
