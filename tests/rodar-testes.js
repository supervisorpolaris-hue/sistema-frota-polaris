// Roda todos os testes do servidor (Code.gs) num simulador do Google Apps Script, com dados fictícios.
// Uso: node tests/rodar-testes.js   (usado também pela automação do GitHub antes de publicar)
'use strict';
const path = require('path');
const { spawnSync } = require('child_process');
const code = path.join(__dirname, '..', 'apps-script', 'Code.gs');
const testes = ['zerar', 'moto', 'sugestao', 'foto', 'acesso', 'turno', 'escala', 'padronizar', 'pasta'];
let falhas = 0;
for (const t of testes) {
  const r = spawnSync(process.execPath, [path.join(__dirname, t + '-test.js'), code], { encoding: 'utf8', env: Object.assign({}, process.env, { TZ: 'America/Sao_Paulo' }) });
  const ok = r.status === 0;
  if (!ok) falhas++;
  console.log((ok ? '✓ ' : '✗ ') + t);
  if (!ok) console.log((r.stdout || '') + (r.stderr || ''));
}
console.log(falhas ? '\n' + falhas + ' teste(s) falharam' : '\nTodos os testes passaram');
process.exit(falhas ? 1 : 0);
