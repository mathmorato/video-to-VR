/**
 * verify_v5.js - Script de verificação automatizada de conformidade V5
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testFetch(urlPath) {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:8000' + urlPath, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
      res.on('error', reject);
    });
  });
}

async function verifyAll() {
  console.log('--- INICIANDO VERIFICAÇÃO DE CONFORMIDADE V5 ---');

  // 1. Fetch index.html
  const { status, body } = await testFetch('/index.html');
  assert.strictEqual(status, 200, 'index.html deve retornar status 200');
  console.log('✓ index.html acessível (status 200)');

  // 2. Versionamento
  assert.ok(body.includes('id="app-footer-version">v.1.0.3</span>'), 'Rodapé principal deve ter v.1.0.3');
  assert.ok(body.includes('sidebar-footer-version">v.1.0.3</span>'), 'Rodapé lateral deve ter v.1.0.3');
  console.log('✓ Rodapés com versão v.1.0.3 confirmados.');

  // 3. Regra Zero Emojis
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  assert.strictEqual(emojiRegex.test(body), false, 'index.html não pode conter emojis');

  const css = fs.readFileSync(path.join(__dirname, '../css/style.css'), 'utf8');
  assert.strictEqual(emojiRegex.test(css), false, 'style.css não pode conter emojis');

  const jsDir = path.join(__dirname, '../js');
  const jsFiles = fs.readdirSync(jsDir).filter(f => f.endsWith('.js'));
  for (const f of jsFiles) {
    const jsContent = fs.readFileSync(path.join(jsDir, f), 'utf8');
    assert.strictEqual(emojiRegex.test(jsContent), false, `${f} não pode conter emojis`);
  }
  console.log('✓ REGRA ZERO EMOJIS: Verificada em 100% dos arquivos (.html, .css, .js).');

  // 4. Elementos visuais da V6 no HTML
  assert.ok(body.includes('conversion-hourglass'), 'Ampulheta animada deve existir no HTML');
  assert.ok(body.includes('modal-heavy-conversion'), 'Modal de conversão pesada deve existir no HTML');
  assert.ok(body.includes('quick_test'), 'Preset quick_test deve existir no HTML');
  assert.ok(body.includes('progress-total-est'), 'Card de tempo total estimado deve existir no HTML');
  assert.ok(body.includes('progress-speed-badge'), 'Selo de desempenho da velocidade deve existir');
  assert.ok(body.includes('progress-slow-notice'), 'Aviso de processamento lento deve existir');
  assert.ok(body.includes('progress-completion-container'), 'Container de previsão de conclusão deve existir');
  assert.ok(body.includes('progress-stats-container'), 'Container de cards independentes deve existir no HTML');
  assert.ok(body.includes('progress-stat-card'), 'Cards individuais devem existir no HTML');
  console.log('✓ Elementos V6 (ampulheta, modal, métricas, selos, avisos, cards separados) presentes no DOM.');

  // 5. CSS da ampulheta e animações
  assert.ok(css.includes('@keyframes conversion-hourglass-spin'), 'Animação conversion-hourglass-spin deve existir no CSS');
  assert.ok(css.includes('.conversion-hourglass'), 'Classe .conversion-hourglass deve existir no CSS');
  assert.ok(css.includes('.conversion-hourglass.is-active'), 'Classe .conversion-hourglass.is-active deve existir no CSS');
  assert.ok(css.includes('prefers-reduced-motion'), 'Suporte a prefers-reduced-motion deve existir no CSS');
  assert.ok(css.includes('.progress-stat-card'), 'Classe .progress-stat-card deve existir no CSS');
  console.log('✓ CSS: @keyframes conversion-hourglass-spin, acessibilidade e classes visuais validadas.');

  // 6. Teste de lógica do TimeEstimator
  const { TimeEstimator } = await import('../js/time-estimator.js');
  const meta = { width: 3840, height: 2160, fps: 60, duration: 238 };
  const complexity = TimeEstimator.calculateComplexity(meta);
  assert.strictEqual(complexity.isHeavy, true);
  assert.strictEqual(complexity.pixelsPerSecond, 497664000);
  assert.strictEqual(complexity.totalFrames, 14280);

  const estimator = new TimeEstimator(meta);
  const metrics = estimator.update({ speed: 0.0217, frame: 397, time: 6.04 });
  assert.ok(metrics.remainingSeconds > 0);
  assert.strictEqual(metrics.speedRating.label, 'Muito lento');
  assert.strictEqual(metrics.speedRating.slow, true);
  console.log('✓ TimeEstimator: complexidade e estimativa validadas com sucesso.');

  console.log('\n====================================================');
  console.log('  TODAS AS VERIFICAÇÕES DE CONFORMIDADE V5 PASSARAM! ');
  console.log('====================================================');
}

verifyAll().catch(err => {
  console.error('Falha na verificação:', err);
  process.exit(1);
});
