/**
 * test_conversions.js - Teste automatizado de conversão usando o FFmpeg WebAssembly local
 * VR Video Converter
 */

const fs = require('fs');
const path = require('path');

// Simula ambiente de Worker para o ffmpeg-core
global.self = global;
global.location = { href: 'http://localhost:8000/' };

const createFFmpegCore = require('../lib/ffmpeg/ffmpeg-core.js');

async function runTests() {
  console.log('=== INICIANDO TESTES DO VR VIDEO CONVERTER ===\n');

  console.log('1. Carregando FFmpeg WebAssembly local...');
  const wasmPath = path.resolve(__dirname, '../lib/ffmpeg/ffmpeg-core.wasm');
  const wasmBinary = fs.readFileSync(wasmPath);

  const core = await createFFmpegCore({
    wasmBinary,
    print: (msg) => {},
    printErr: (msg) => {}
  });

  console.log('✓ FFmpeg WebAssembly carregado com sucesso!\n');

  const testCases = [
    {
      name: 'TESTE 1: 2D -> SBS Half (Cardboard)',
      input: path.resolve(__dirname, 'test_2d.mp4'),
      output: 'out_2d_sbs_half.mp4',
      // scale to half width per eye, duplicate and hstack
      args: [
        '-i', 'input_2d.mp4',
        '-vf', 'scale=320:360,split=2[l][r];[l][r]hstack',
        '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
        '-preset', 'ultrafast', '-crf', '26',
        '-c:a', 'aac', '-b:a', '64k',
        '-y', 'out_2d_sbs_half.mp4'
      ],
      virtualInput: 'input_2d.mp4'
    },
    {
      name: 'TESTE 2: 2D -> SBS Full',
      input: path.resolve(__dirname, 'test_2d.mp4'),
      output: 'out_2d_sbs_full.mp4',
      args: [
        '-i', 'input_2d_full.mp4',
        '-vf', 'scale=640:360,split=2[l][r];[l][r]hstack',
        '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
        '-preset', 'ultrafast', '-crf', '26',
        '-c:a', 'aac', '-b:a', '64k',
        '-y', 'out_2d_sbs_full.mp4'
      ],
      virtualInput: 'input_2d_full.mp4'
    },
    {
      name: 'TESTE 3: 360° Equirretangular -> SBS',
      input: path.resolve(__dirname, 'test_360.mp4'),
      output: 'out_360_sbs.mp4',
      args: [
        '-i', 'input_360.mp4',
        '-vf', 'scale=320:320,split=2[l][r];[l][r]hstack',
        '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
        '-preset', 'ultrafast', '-crf', '26',
        '-c:a', 'aac', '-b:a', '64k',
        '-y', 'out_360_sbs.mp4'
      ],
      virtualInput: 'input_360.mp4'
    }
  ];

  for (const tc of testCases) {
    console.log(`Executando: ${tc.name}`);
    const inputBuf = fs.readFileSync(tc.input);

    core.FS.writeFile(tc.virtualInput, inputBuf);

    let lastProgress = 0;
    core.setProgress((p) => {
      if (p && p.progress) {
        lastProgress = Math.round(p.progress * 100);
      }
    });

    const startTime = Date.now();
    const ret = core.exec(...tc.args);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    if (ret !== 0) {
      console.error(`✗ Erro na execução! Código: ${ret}`);
      process.exit(1);
    }

    const outBuf = core.FS.readFile(tc.output);
    console.log(`✓ Concluído em ${duration}s!`);
    console.log(`✓ Arquivo gerado: ${tc.output}`);
    console.log(`✓ Tamanho do arquivo: ${outBuf.length} bytes (> 0: ${outBuf.length > 0})`);

    // Salva arquivo no disco para inspeção
    const diskPath = path.resolve(__dirname, tc.output);
    fs.writeFileSync(diskPath, Buffer.from(outBuf));

    // Limpeza no FS
    core.FS.unlink(tc.virtualInput);
    core.FS.unlink(tc.output);
    console.log(`✓ Arquivos temporários removidos do FS virtual.\n`);
  }

  console.log('=== TODOS OS TESTES PASSARAM COM SUCESSO! ===');
}

runTests().catch((err) => {
  console.error('Falha nos testes:', err);
  process.exit(1);
});
