/**
 * test_v6_progress.js - Teste automatizado dos requisitos da Versão 6
 * Valida a ampulheta animada em todos os estados e a separação dos cards de progresso.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testV6() {
  console.log('====================================================');
  console.log('   VR VIDEO CONVERTER - SUÍTE DE TESTES V6 (CARDS)   ');
  console.log('====================================================\n');

  // 1. Testa gerador SVG_HOURGLASS
  const { SVG_HOURGLASS, SVG_CHECK, SVG_ERROR, SVG_CANCEL } = await import('../js/icons.js');

  const spinningHourglass = SVG_HOURGLASS(true, 24);
  assert.ok(spinningHourglass.includes('is-active'), 'Ampulheta ativa deve conter classe is-active');
  assert.ok(spinningHourglass.includes('is-spinning'), 'Ampulheta ativa deve conter classe is-spinning');
  assert.ok(spinningHourglass.includes('conversion-hourglass'), 'Deve conter classe conversion-hourglass');
  assert.ok(spinningHourglass.includes('viewBox="0 0 24 24"'), 'Deve conter viewBox 24x24');

  const stoppedHourglass = SVG_HOURGLASS(false, 24);
  assert.strictEqual(stoppedHourglass.includes('is-active'), false, 'Ampulheta inativa NÃO deve conter is-active');
  assert.strictEqual(stoppedHourglass.includes('is-spinning'), false, 'Ampulheta inativa NÃO deve conter is-spinning');
  console.log('✓ SVG_HOURGLASS: estados ativo (girando) e inativo (parado) validados.');

  // 2. Testa ícones de conclusão, erro e cancelamento
  const checkIcon = SVG_CHECK('ui-icon text-success', 24);
  assert.ok(checkIcon.includes('text-success') && checkIcon.includes('width="24"'), 'SVG_CHECK formatado');

  const errorIcon = SVG_ERROR('ui-icon text-danger', 24);
  assert.ok(errorIcon.includes('text-danger') && errorIcon.includes('width="24"'), 'SVG_ERROR formatado');

  const cancelIcon = SVG_CANCEL('ui-icon text-danger', 24);
  assert.ok(cancelIcon.includes('text-danger') && cancelIcon.includes('width="24"'), 'SVG_CANCEL formatado');
  console.log('✓ Ícones de estado (check, error, cancel): validados.');

  // 3. Testa CSS de animação e separação dos cards
  const css = fs.readFileSync(path.join(__dirname, '../css/style.css'), 'utf8');

  assert.ok(css.includes('@keyframes conversion-hourglass-spin'), 'Deve conter keyframe conversion-hourglass-spin');
  assert.ok(css.includes('animation: conversion-hourglass-spin 1.5s linear infinite;'), 'Deve ter rotação 1.5s linear infinite');
  assert.ok(css.includes('.progress-stats-container'), 'Deve conter .progress-stats-container');
  assert.ok(css.includes('.stats-row-3') && css.includes('.stats-row-2'), 'Deve conter divisão hierárquica em linhas 3 + 2');
  assert.ok(css.includes('.progress-stat-card'), 'Deve conter .progress-stat-card');
  assert.ok(css.includes('gap: 16px'), 'Deve conter gap de 16px para separação evidente');
  assert.ok(css.includes('box-shadow: 0 4px 12px'), 'Deve conter sombra discreta nos cards');
  assert.ok(css.includes('border: 1px solid rgba(255, 255, 255, 0.12)'), 'Deve conter borda própria para cada card');
  assert.ok(css.includes('.progress-stat-card:hover'), 'Deve conter hover suave nos cards');
  console.log('✓ CSS V6: animação da ampulheta, separação por gap, bordas e sombras validadas.');

  // 4. Testa HTML dos cards e do alerta de lentidão
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');

  assert.ok(html.includes('id="progress-elapsed"'), 'Deve conter id progress-elapsed');
  assert.ok(html.includes('id="progress-remaining"'), 'Deve conter id progress-remaining');
  assert.ok(html.includes('id="progress-total-est"'), 'Deve conter id progress-total-est');
  assert.ok(html.includes('id="progress-speed"'), 'Deve conter id progress-speed');
  assert.ok(html.includes('id="progress-frame"'), 'Deve conter id progress-frame');
  assert.ok(html.includes('notice-slow-warning'), 'Deve conter caixa de aviso notice-slow-warning com SVG');
  console.log('✓ HTML V6: todos os 5 cards e IDs de métricas confirmados.');

  console.log('\n====================================================');
  console.log('   TODOS OS TESTES DA VERSÃO 6 FORAM APROVADOS!      ');
  console.log('====================================================');
}

testV6().catch(err => {
  console.error('Falha nos testes V6:', err);
  process.exit(1);
});
