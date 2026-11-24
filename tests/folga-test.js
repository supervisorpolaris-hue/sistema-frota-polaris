// Folga pelo app: linha FOLGA no REGISTRO DIÁRIO + F na escala; não conta como falta; bloqueia saída.
'use strict';
process.env.TZ = 'America/Sao_Paulo';
const assert = require('assert');
const { makeEnv, load } = require('./gasmock');
const { build } = require('./data');
const FILE = process.argv[2];
const ok = m => console.log('✓', m);
const tmp = makeEnv({ sheets: {}, props: {} }); load(tmp, FILE);
const DATA = build({ schema: JSON.parse(JSON.stringify(tmp.ctx.SCHEMA)), semFolgas: true });
const env = makeEnv(DATA);
const exec = (fn, ...a) => { load(env, FILE); const r = env.ctx[fn](...a); return r == null ? r : JSON.parse(JSON.stringify(r)); };
const REG = () => env.db.sheets['REGISTRO DIÁRIO'].rows;
const ESC = () => env.db.sheets['ESCALA'].rows;
const tNov = () => ESC().findIndex(r => /NOVEMBRO 2026/.test(r[0]));
const linhaEsc = primeiro => ESC().findIndex((r, i) => i > tNov() && String(r[0]).toUpperCase() === primeiro);
const F = { data: 'eA==', mime: 'image/jpeg' };

// 1) lançar folga para amanhã (sem turnos): linha FOLGA + F na escala
ESC()[linhaEsc('RAFAEL')][18] = '12h-18h';
let r = exec('saveFolga', { entregador: 'rafael', data: '2026-11-18', obs: 'folga da semana' });
assert(/Folga lançada: Rafael Mailson em 18\/11\. Marcada também na escala\./.test(r.msg), r.msg);
const ult = REG().filter(x => x[2]).slice(-1)[0];
assert.strictEqual(ult[1], 'FOLGA'); assert.strictEqual(ult[2], 'Rafael Mailson'); assert.strictEqual(ult[3], 'FOLGA');
assert.strictEqual(ult[16], 'folga da semana'); assert.strictEqual(ult[25], 'supervisor@exemplo.com');
assert(ult[0] instanceof Date && ult[0].getDate() === 18);
assert.strictEqual(ESC()[linhaEsc('RAFAEL')][18], 'F');
const notaKey = (linhaEsc('RAFAEL') + 1) + ',19';
assert.strictEqual(env.db.sheets['ESCALA'].notes[notaKey], 'Folga lançada pelo app. Antes: 12h-18h');
ok('folga vira linha FOLGA no REGISTRO DIÁRIO (data, FOLGA em Moto e Turno, entregador completo, observação, lançado por) e F na escala (com nota do valor anterior)');

// 2) validações
assert.throws(() => exec('saveFolga', { entregador: 'Rafael Mailson', data: '2026-11-18' }), /já tem folga lançada em 18\/11/);
const comTurno = REG().find((x, i) => i && x[1] && x[1] !== 'FOLGA' && x[0] instanceof Date && x[0].getDate() === 16 && x[0].getMonth() === 10 && x[2] !== 'Thiago Alves');
assert.throws(() => exec('saveFolga', { entregador: comTurno[2], data: '2026-11-16' }), /tem turno lançado em 16\/11/);
assert.throws(() => exec('saveFolga', { entregador: 'Zé Ninguém', data: '2026-11-18' }), /não está cadastrado/);
assert.throws(() => exec('saveFolga', { entregador: 'Rafael Mailson', data: '' }), /Data inválida/);
ok('não deixa: folga repetida, folga em dia com turno, entregador não cadastrado, sem data');

// 3) saída de quem está de folga é bloqueada
assert.throws(() => exec('openShift', { data: '2026-11-18', moto: 'MOTO 01', entregador: 'Rafael Mailson', turno: '08h-14h', kmIni: 99999, checklist: {}, forcar: true, fotoIni: F }), /está de folga em 18\/11/);
assert.throws(() => exec('saveFullShift', { data: '2026-11-18', moto: 'MOTO 03', entregador: 'Rafael Mailson', turno: '08h-14h', kmIni: 99999, kmFim: 100080, corridas: 8, fotoIni: F, fotoFim: F, forcar: true }), /está de folga em 18\/11/);
ok('saída (e turno completo lançado depois) de quem está de folga no dia é recusada (com a orientação de excluir a folga)');

// 4) app: lista de folgas; turnos não mudam
let a = exec('getApp');
assert.deepStrictEqual([a.recentFolgas[0].entregador, a.recentFolgas[0].key, a.recentFolgas[0].obs], ['Rafael Mailson', '2026-11-18', 'folga da semana']);
assert(!a.recentTurnos.some(t => t.turno === 'FOLGA'));
ok('app mostra as últimas folgas; folga não aparece como turno');

// 5) folga não conta como falta
const passado = (() => {   // dia passado em que alguém da escala (TR) não teve turno = falta
  for (let d = 16; d >= 1; d--) for (let i = tNov() + 3; i < ESC().length && ESC()[i][0]; i++) {
    if (ESC()[i][d] !== 'TR') continue;
    const prim = ESC()[i][0], nome = ['Rafael Mailson', 'João Pedro Silva', 'Carlos Eduardo', 'Ana Paula Souza', 'Bruno Lima', 'Diego Santos', 'Felipe Rocha', 'Marcos Vinícius'].find(n => n.toUpperCase().startsWith(prim));
    const trabalhou = REG().some(x => x[2] === nome && x[0] instanceof Date && x[0].getDate() === d && x[0].getMonth() === 10 && x[1]);
    if (!trabalhou) return { d, nome, linha: i };
  }
})();
assert(passado, 'cenário de falta encontrado');
const faltas = () => (exec('getDashboard', 'mes').ranking.find(x => x.nome === passado.nome) || {}).faltas || 0;
const antes = faltas();
exec('saveFolga', { entregador: passado.nome, data: '2026-11-' + String(passado.d).padStart(2, '0') });
ESC()[passado.linha][passado.d] = 'TR'; // mesmo que a escala continue dizendo TR
assert.strictEqual(faltas(), antes - 1);
ok('falta vira folga: ' + passado.nome + ' em ' + passado.d + '/11 deixa de contar como falta (' + antes + ' → ' + (antes - 1) + ')');

// 6) folga hoje: some da escala de hoje e não é sugerido
const semTurnoHoje = ['Ana Paula Souza', 'Bruno Lima', 'Carlos Eduardo', 'Diego Santos', 'Felipe Rocha', 'João Pedro Silva', 'Marcos Vinícius']
  .find(n => !REG().some(x => x[2] === n && x[0] instanceof Date && x[0].getDate() === 17 && x[0].getMonth() === 10));
if (semTurnoHoje) {
  ESC()[linhaEsc(semTurnoHoje.split(' ')[0].toUpperCase())][17] = '18h-00h';
  assert(exec('getApp').escalaHoje.some(e => e.nome === semTurnoHoje));
  exec('saveFolga', { entregador: semTurnoHoje, data: '2026-11-17' });
  a = exec('getApp');
  assert(!a.escalaHoje.some(e => e.nome === semTurnoHoje)); assert(a.folgasHoje.includes(semTurnoHoje));
  ok('folga hoje: ' + semTurnoHoje + ' sai da "Escala de hoje" e entra em folgasHoje (não é sugerido na saída)');
}

// 7) excluir folga lançada por engano
a = exec('getApp');
const fg = a.recentFolgas.find(x => x.entregador === 'Rafael Mailson' && x.key === '2026-11-18');
assert.deepStrictEqual(a.recentFolgas.map(x => x.key), a.recentFolgas.map(x => x.key).slice().sort().reverse(), 'ordenado pela data da folga');
assert.throws(() => exec('deleteFolga', { row: fg.row, key: '2026-11-19', entregador: 'Rafael Mailson' }), /Folga não encontrada/);
r = exec('deleteFolga', { row: fg.row, key: fg.key, entregador: fg.entregador });
assert(/Folga excluída: Rafael Mailson em 18\/11\. A escala voltou para 12h-18h\./.test(r.msg), r.msg);
assert.strictEqual(ESC()[linhaEsc('RAFAEL')][18], '12h-18h'); assert(!env.db.sheets['ESCALA'].notes[notaKey]);
assert(!exec('getApp').recentFolgas.some(x => x.entregador === 'Rafael Mailson' && x.key === '2026-11-18'));
assert(exec('openShift', { data: '2026-11-18', moto: 'MOTO 01', entregador: 'Rafael Mailson', turno: '08h-14h', kmIni: 99999, checklist: {}, forcar: true, fotoIni: F }).ok);
ok('excluir folga: confere a linha antes de apagar, devolve a escala ao que era (12h-18h) e a saída volta a ser permitida');

// 8) F posto à mão na escala não é desfeito pela exclusão
ESC()[linhaEsc('RAFAEL')][19] = 'F';
exec('saveFolga', { entregador: 'Rafael Mailson', data: '2026-11-19' });
assert(!env.db.sheets['ESCALA'].notes[(linhaEsc('RAFAEL') + 1) + ',20']);
const fg2 = exec('getApp').recentFolgas.find(x => x.key === '2026-11-19');
r = exec('deleteFolga', fg2);
assert.strictEqual(ESC()[linhaEsc('RAFAEL')][19], 'F'); assert(/continua F/.test(r.msg));
ok('folga que já estava F na escala: excluir o lançamento não mexe no F de quem montou a escala');
console.log('\nOK: folga');
