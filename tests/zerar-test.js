// Testa "Zerar o sistema" e o recomeço com cadastro manual.
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
const call = (fn, ...a) => { load(env, FILE); return JSON.parse(JSON.stringify(env.ctx[fn](...a) === undefined ? null : env.ctx[fn] && null)); };
const exec = (fn, ...a) => { load(env, FILE); const r = env.ctx[fn](...a); return r === undefined ? null : JSON.parse(JSON.stringify(r)); };
const PHOTO = { data: Buffer.from('x').toString('base64'), mime: 'image/jpeg' };

// Estado antes: cria a pasta de arquivos com uma foto
exec('openShift', { data: '2026-11-17', moto: 'MOTO 02', entregador: 'Bruno Lima', turno: '18h-00h', kmIni: 99000, fotoIni: PHOTO, forcar: true });
const antes = exec('getHome', '7');
assert(antes.app.motos.length === 6 && antes.app.entregadores.length > 5);
const rootAntigo = env.props.ROOT_FOLDER_ID;
assert(rootAntigo && Object.keys(env.props).some(k => k.startsWith('FOTOS_')));
const confAntes = JSON.stringify(env.db.sheets['Configurações']);
const regFormulasAntes = Object.keys(env.db.sheets['REGISTRO DIÁRIO'].formulas).length;

// 1) Pelo app (google.script.run) o zerar NÃO pode rodar
const envWeb = makeEnv(DATA); load(envWeb, FILE);
assert.throws(() => envWeb.ctx.zerarSistema(), /getUi/);
assert.strictEqual(envWeb.db.sheets['REGISTRO DIÁRIO'].rows.length, DATA.sheets['REGISTRO DIÁRIO'].rows.length);
ok('chamado de fora da planilha (pelo app), não apaga nada');

// 2) Respondeu NÃO na primeira pergunta: nada muda
ui.answers = ['NO']; exec('zerarSistema');
assert(env.db.sheets['RECEITAS'].rows.length > 2 && !env.db.backups);
ok('respondendo NÃO, nada é apagado');

// 3) SIM + SIM (lixeira)
ui.answers = ['YES', 'YES', 'OK']; exec('zerarSistema');
assert.strictEqual(env.db.backups.length, 1); assert(/^BACKUP Controle_Frota_Polaris \(TESTE DO SISTEMA\) — 17-11-2026 15h30$/.test(env.db.backups[0].name), env.db.backups[0].name);
assert(env.db.backups[0].sheets['REGISTRO DIÁRIO'].rows.length > 600, 'backup com os dados');
ok('cópia de segurança criada antes de apagar: ' + env.db.backups[0].name);
const vazia = n => env.db.sheets[n].rows.slice(1).every(r => r.every(v => v === '' || v == null)) && !Object.keys(env.db.sheets[n].links).length;
['REGISTRO DIÁRIO', 'Frota', 'CAMISAS', 'ABASTECIMENTOS', 'RECEITAS', 'MANUTENÇÕES', 'ENTREGADORES', 'DOCUMENTOS'].forEach(n => {
  assert(vazia(n), n + ' não ficou vazia');
  assert(env.db.sheets[n].rows[0].some(v => v), n + ' perdeu o cabeçalho');
});
ok('dados apagados, cabeçalhos mantidos em todas as abas');
assert.strictEqual(Object.keys(env.db.sheets['REGISTRO DIÁRIO'].formulas).length, regFormulasAntes);
ok('fórmulas da aba REGISTRO DIÁRIO mantidas (' + regFormulasAntes + ')');
assert.deepStrictEqual(env.db.sheets['Configurações'].rows.slice(0, JSON.parse(confAntes).rows.length), JSON.parse(confAntes).rows);
assert.deepStrictEqual(env.db.sheets['Configurações'].rows.filter(r => r[0] === 'Turno').map(r => r[1]), ['08h-14h', '12h-18h', '18h-00h']);
ok('aba Configurações mantida (meta e revisão) e com as linhas dos turnos fixos');
const esc = env.db.sheets['ESCALA'].rows.filter(r => r.some(v => v !== ''));
assert.strictEqual(esc.length, 3); assert.strictEqual(esc[0][0], 'ESCALA MÊS DE NOVEMBRO 2026');
assert.strictEqual(esc[1].length >= 31, true); assert.strictEqual(esc[1][17], 17);
const dow = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'][new Date(2026, 10, 17).getDay()];
assert.strictEqual(esc[2][17], dow);
ok('escala com modelo de novembro/2026 (17/11 = ' + dow + ')');
assert(env.folders[rootAntigo].trashed, 'pasta antiga na lixeira');
assert(env.props.ROOT_FOLDER_ID && env.props.ROOT_FOLDER_ID !== rootAntigo, 'pasta nova');
assert(!Object.keys(env.props).some(k => k.startsWith('FOTOS_')));
assert.strictEqual(env.props.SEM_IMPORTACAO, '1');
ok('pasta antiga de fotos/documentos na lixeira; pasta nova criada');
console.log('  mensagem final:', ui.log[ui.log.length - 1].replace(/\n+/g, ' | '));

// 4) App depois de zerar
let h = exec('getHome', '7');
assert.deepStrictEqual([h.app.motos.length, h.app.entregadores.length, h.app.openShifts.length, h.app.recentTurnos.length, h.app.recentFuel.length, h.app.recentRec.length, h.app.recentManut.length], [0, 0, 0, 0, 0, 0, 0]);
assert.strictEqual(h.dash.cur.turnos, 0); assert.strictEqual(h.dash.ranking.length, 0);
ok('app abre vazio e sem erro (painel zerado)');

// 5) Cadastro manual: moto na aba Frota com entregador vinculado → NÃO pode criar entregador sozinho
env.db.sheets['Frota'].rows[1] = ['MOTO 10', 'CG 160', 'XYZ1A23', 'Fulano de Tal', new Date(2026, 10, 17), 25000, 24000, new Date(2026, 9, 1), ''];
h = exec('getHome', '7');
assert.strictEqual(h.app.motos.length, 1); assert.strictEqual(h.app.entregadores.length, 0);
assert.strictEqual(h.dash.motos[0].proxRevKm, 27000);
ok('moto cadastrada na Frota aparece; nenhum entregador criado automaticamente; próxima revisão 27.000 km');
const r1 = exec('saveDriver', { nome: 'Fulano de Tal', cpf: '12345678901', cnhValidade: '2027-05-01', salario: '2200', status: 'Ativo', admissao: '2026-11-17' });
assert.strictEqual(r1.id, 'E001');
const r2 = exec('openShift', { data: '2026-11-17', moto: 'MOTO 10', entregador: 'Fulano de Tal', turno: '08h-14h', kmIni: 25010, recebido: 'Supervisor', checklist: {}, fotoIni: PHOTO });
assert(r2.ok);
assert.strictEqual(env.db.sheets['REGISTRO DIÁRIO'].rows[1][1], 'MOTO 10', 'primeiro turno na linha 2');
// escala: nome com TR hoje
env.db.sheets['ESCALA'].rows[3] = ['FULANO'].concat(Array.from({ length: 30 }, (_, i) => (i + 1 === 17 ? 'TR' : 'F')));
h = exec('getHome', '7');
assert.deepStrictEqual(h.app.entregadores, ['Fulano de Tal']);
assert.strictEqual(h.app.openShifts.length, 1);
assert.strictEqual(h.dash.escalaHoje.length, 1); assert.strictEqual(h.dash.escalaHoje[0].emTurno, true);
ok('cadastro manual funciona: entregador E001, saída na linha 2, escala de hoje reconhecida');

// 6) Zerar de novo, agora sem lixeira
ui.answers = ['YES', 'NO', 'OK']; const rootAtual = env.props.ROOT_FOLDER_ID; exec('zerarSistema');
assert.strictEqual(env.db.backups.length, 2); assert(!env.folders[rootAtual].trashed); assert.strictEqual(env.props.ROOT_FOLDER_ID, rootAtual);
ok('zerar sem lixeira mantém a pasta do Drive');
ui.answers = ['YES', 'CANCEL']; exec('zerarSistema'); assert.strictEqual(env.db.backups.length, 2);
ok('cancelar na segunda pergunta não apaga nada');
console.log('\nOK: todos os testes do zerar passaram');
