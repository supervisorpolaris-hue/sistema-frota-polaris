process.env.TZ = 'America/Sao_Paulo';
const assert = require('assert');
const { makeEnv, load } = require('./gasmock'); const { build } = require('./data');
const FILE = process.argv[2]; const ok = m => console.log('✓', m);
const tmp = makeEnv({ sheets: {}, props: {} }); load(tmp, FILE);
const DATA = build({ schema: JSON.parse(JSON.stringify(tmp.ctx.SCHEMA)) });
const env = makeEnv(DATA, { parseTime: true });
const exec = (fn, ...a) => { load(env, FILE); const r = env.ctx[fn](...a); return r == null ? r : JSON.parse(JSON.stringify(r)); };

let a = exec('getApp');
const th = Object.fromEntries(a.turnoHoras.map(t => [t.turno, t.min]));
assert(th['MANHÃ'] >= 480 && th['MANHÃ'] <= 489 && th['NOITE'] >= 1090 && th['NOITE'] <= 1099, JSON.stringify(a.turnoHoras));
ok('horário típico: MANHÃ ~08:0x, NOITE ~18:1x (mediana dos últimos 60 dias)');
const frota = env.db.sheets['Frota'].rows.slice(1);
a.motos.forEach((m, i) => assert.strictEqual(m.vinculado, frota[i][3]));
ok('entregador vinculado de cada moto vem do cadastro (' + a.motos.map(m => m.id + '→' + m.vinculado.split(' ')[0]).join(', ') + ')');
// entregador inativo nunca é sugerido
const ents = env.db.sheets['ENTREGADORES']; const iSt = ents.rows[0].indexOf('Status'), iNome = ents.rows[0].indexOf('Nome');
const inativos = ents.rows.slice(1).filter(r => r[iSt] === 'Inativo').map(r => r[iNome]);
assert(inativos.length);
env.db.sheets['Frota'].rows[1][3] = inativos[0];
a = exec('getApp');
assert.strictEqual(a.motos[0].vinculado, ''); assert(a.motos.every(m => !inativos.includes(m.ultimoEntregador)));
ok('entregador inativo (' + inativos[0] + ') não é sugerido');
// último entregador = último turno da moto na planilha
const reg = env.db.sheets['REGISTRO DIÁRIO'].rows; const last = {};
reg.slice(1).forEach(r => { if (r[1] && r[1] !== 'FOLGA' && r[2]) last[r[1]] = r[2]; });
a.motos.forEach(m => { if (!inativos.includes(last[m.id])) assert.strictEqual(m.ultimoEntregador, last[m.id]); });
ok('"último a usar a moto" confere com a planilha');

// hora gravada pelo app e convertida pela planilha em horário (Date de 1899)
exec('openShift', { data: '2026-11-17', moto: 'MOTO 06', entregador: 'Diego Santos', turno: '18h-00h', kmIni: 70000, checklist: {}, forcar: true, fotoIni: { data: 'eA==', mime: 'image/jpeg' } });
const row = env.db.sheets['REGISTRO DIÁRIO'].rows.find(r => r[1] === 'MOTO 06' && r[4] === 70000);
assert(row[20] instanceof Date, 'planilha converteu em horário');
a = exec('getApp');
const o = a.openShifts.find(x => x.moto === 'MOTO 06' && x.kmIni === 70000);
assert.strictEqual(o.horaSaida, '15:30');
ok('hora de saída convertida em horário pela planilha volta como "15:30" (antes viraria "Sat Dec 30 1899 …")');
console.log('\nOK: sugestões e horário');
