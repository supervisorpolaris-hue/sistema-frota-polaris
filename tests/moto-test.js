// Testa cadastro, edição e exclusão de moto (servidor).
'use strict';
process.env.TZ = 'America/Sao_Paulo';
const assert = require('assert');
const { makeEnv, load } = require('./gasmock');
const { build } = require('./data');
const FILE = process.argv[2];
const ok = m => console.log('✓', m);

const tmp = makeEnv({ sheets: {}, props: {} }); load(tmp, FILE);
const DATA = build({ schema: JSON.parse(JSON.stringify(tmp.ctx.SCHEMA)) });
const ui = { answers: [] };
const env = makeEnv(DATA, { ui });
const exec = (fn, ...a) => { load(env, FILE); const r = env.ctx[fn](...a); return r === undefined ? null : JSON.parse(JSON.stringify(r)); };
const erro = (fn, args, re, label) => { assert.throws(() => exec(fn, ...args), re, label); };
const frota = () => env.db.sheets['Frota'];
const hdr = () => frota().rows[0];
const col = n => hdr().indexOf(n);

// Começa zerado (como vai ser na prática)
ui.answers = ['YES', 'NO', 'OK']; exec('zerarSistema');

exec('saveDriver', { nome: 'Fulano de Tal', status: 'Ativo' });
// --- cadastro ---
let r = exec('saveMoto', { id: '  MOTO   01 ', placa: 'abc-1d23', modelo: 'CG 160', entregador: '', kmInicial: 25000, inicio: '', ultRevKm: 24000, ultRevData: '2026-10-01' });
assert.strictEqual(r.msg, 'Moto cadastrada: MOTO 01.');
let row = frota().rows[1];
assert.strictEqual(row[col('Moto (ID)')], 'MOTO 01'); assert.strictEqual(row[col('Placa')], 'ABC1D23'); assert.strictEqual(row[col('KM inicial')], 25000);
assert.strictEqual(row[col('Última revisão (KM)')], 24000);
assert(row[col('Data início de uso')] instanceof Date, 'início de uso = hoje');
assert.strictEqual(frota().formats['2,' + (col('Data início de uso') + 1)], 'dd/mm/yyyy');
ok('cadastra na linha 2 com placa normalizada (ABC1D23), início = hoje e datas formatadas');

let h = exec('getHome', '7');
assert.deepStrictEqual(h.app.motos.map(m => [m.id, m.lastKm]), [['MOTO 01', 25000]]);
const dm = h.dash.motos[0];
assert.deepStrictEqual([dm.kmAtual, dm.proxRevKm, dm.faltam, dm.alerta, dm.proxRevData], [25000, 27000, 2000, 'OK', '2027-01-01']);
assert.strictEqual(h.app.frota[0].lancamentos, 0);
ok('logo depois do cadastro: KM atual 25.000, revisão em 27.000 km ou 01/01/2027, alerta OK (antes ficaria "Sem dados")');

// --- validações ---
erro('saveMoto', [{ id: 'moto 01', kmInicial: 1 }], /Já existe a moto MOTO 01/, 'duplicado');
erro('saveMoto', [{ id: 'MOTO01', kmInicial: 1 }], /Já existe a moto MOTO 01/, 'duplicado sem espaço');
erro('saveMoto', [{ id: 'MOTO 02', placa: 'ABC1D23', kmInicial: 1 }], /placa ABC1D23 já está cadastrada na MOTO 01/);
erro('saveMoto', [{ id: 'MOTO 02', placa: 'AB12', kmInicial: 1 }], /Placa inválida/);
erro('saveMoto', [{ id: 'MOTO 02' }], /Informe o KM atual/);
erro('saveMoto', [{ id: 'MOTO 02', kmInicial: -5 }], /KM inválido/);
erro('saveMoto', [{ id: 'MOTO 02', kmInicial: 100.5 }], /KM inválido/);
erro('saveMoto', [{ id: 'MOTO 02', kmInicial: 1000, ultRevKm: 2000 }], /maior que o KM atual da moto \(1\.000\)/);
erro('saveMoto', [{ id: 'MOTO 02', kmInicial: 1000, ultRevData: '2026-12-01' }], /não pode ser no futuro/);
erro('saveMoto', [{ id: 'FOLGA', kmInicial: 1000 }], /FOLGA/);
erro('saveMoto', [{ id: '', kmInicial: 1000 }], /Informe a identificação/);
assert.strictEqual(frota().rows.filter(x => x.some(v => v !== '')).length, 2);
ok('recusa: ID e placa repetidos, placa inválida, sem KM, KM negativo/quebrado, revisão > KM atual, data futura, "FOLGA", sem ID');

// --- edição ---
r = exec('saveMoto', { original: 'MOTO 01', id: 'MOTO 01', placa: 'ABC1D23', modelo: 'CG 160 Fan', entregador: 'fulano', kmInicial: 25000, inicio: '2026-11-01', ultRevKm: 24000, ultRevData: '2026-10-01' });
assert.strictEqual(r.msg, 'Moto atualizada: MOTO 01.');
assert.strictEqual(frota().rows[1][col('Modelo')], 'CG 160 Fan');
assert.strictEqual(frota().rows.filter(x => x.some(v => v !== '')).length, 2, 'não duplicou linha');
erro('saveMoto', [{ original: 'MOTO 01', id: 'MOTO 99', kmInicial: 1 }], /não pode ser mudada/);
ok('edita na mesma linha; não deixa trocar a identificação');

// revisão pelo app grava "Próxima revisão" na planilha; editar a base da revisão recalcula
exec('saveMaintenance', { data: '2026-11-17', moto: 'MOTO 01', km: 25100, tipo: 'Revisão', descricao: '', pecas: 100, maoObra: 50 });
assert.strictEqual(frota().rows[1][col('Próxima revisão (KM)')], 28100);
exec('saveMoto', { original: 'MOTO 01', id: 'MOTO 01', placa: 'ABC1D23', modelo: 'CG 160 Fan', kmInicial: 25000, inicio: '2026-11-01', ultRevKm: 25000, ultRevData: '2026-11-17' });
assert.strictEqual(frota().rows[1][col('Próxima revisão (KM)')], '');
h = exec('getHome', '7'); assert.strictEqual(h.dash.motos[0].proxRevKm, 28000);
ok('corrigir a última revisão recalcula a próxima (28.100 → 28.000)');

// --- exclusão ---
exec('saveMoto', { id: 'MOTO 02', kmInicial: 1000 });
assert.strictEqual(exec('getHome', '7').app.motos.length, 2);
assert.strictEqual(exec('deleteMoto', 'MOTO 02').msg, 'Moto excluída: MOTO 02.');
assert.strictEqual(exec('getHome', '7').app.motos.length, 1);
erro('deleteMoto', ['MOTO 01'], /tem 1 lançamento\(s\) e não pode ser excluída/);
ok('exclui moto sem lançamentos; recusa excluir moto com histórico');

// saída usa o KM do cadastro e a moto continua com tudo certo
exec('openShift', { data: '2026-11-17', moto: 'MOTO 01', entregador: 'Fulano', turno: '08h-14h', kmIni: 25100, checklist: {}, fotoIni: { data: 'eA==', mime: 'image/jpeg' } });
h = exec('getHome', '7');
assert.strictEqual(h.app.frota[0].lancamentos, 2); assert.strictEqual(h.app.openShifts.length, 1);
ok('saída lançada normalmente depois do cadastro');

// --- aba Frota com fórmula e sem algumas colunas ---
const F2 = frota();
F2.formulas['3,' + (col('Próxima revisão (KM)') + 1)] = '=G3+3000';
exec('saveMoto', { id: 'MOTO 03', kmInicial: 5000 });
assert.strictEqual(F2.formulas['3,' + (col('Próxima revisão (KM)') + 1)], '=G3+3000');
ok('fórmula que já existia na aba Frota é mantida');
const E = makeEnv({ sheets: { 'REGISTRO DIÁRIO': DATA.sheets['REGISTRO DIÁRIO'], 'Configurações': DATA.sheets['Configurações'],
  Frota: { rows: [['Moto (ID)', 'Modelo']], links: {}, formulas: {}, maxRows: 50, maxCols: 3 } }, props: { SS_ID: 'SSID' } });
load(E, FILE); E.ctx.saveMoto({ id: 'MOTO 77', placa: 'XYZ9999', kmInicial: 777 });
const fr = E.db.sheets['Frota'];
assert(fr.rows[0].indexOf('Placa') > 1 && fr.rows[0].indexOf('KM inicial') > 1);
const rr = fr.rows.filter(x => x[0] === 'MOTO 77')[0];
assert.strictEqual(rr[fr.rows[0].indexOf('Placa')], 'XYZ9999'); assert.strictEqual(rr[fr.rows[0].indexOf('KM inicial')], 777);
ok('aba Frota sem colunas (Placa, KM…): o app cria as colunas no fim e grava');
const E2 = makeEnv({ sheets: { 'REGISTRO DIÁRIO': DATA.sheets['REGISTRO DIÁRIO'], 'Configurações': DATA.sheets['Configurações'] }, props: { SS_ID: 'SSID' } });
load(E2, FILE); E2.ctx.saveMoto({ id: 'MOTO 88', kmInicial: 888 });
assert.strictEqual(E2.db.sheets['Frota'].rows[1][0], 'MOTO 88');
ok('sem aba Frota: o app cria a aba');
console.log('\nOK: todos os testes de moto passaram');
