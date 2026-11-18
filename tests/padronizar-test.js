process.env.TZ = 'America/Sao_Paulo';
const assert = require('assert');
const { makeEnv, load, clone } = require('./gasmock'); const { build } = require('./data');
const FILE = process.argv[2]; const ok = m => console.log('✓', m);
const tmp = makeEnv({ sheets: {}, props: {} }); load(tmp, FILE);
const DATA = build({ schema: JSON.parse(JSON.stringify(tmp.ctx.SCHEMA)) });
// como na planilha real: aba Painel antiga, linha obsoleta em Configurações e uma aba qualquer do usuário
DATA.sheets['Painel'] = { rows: [['Moto (ID)', 'Linha ref. (auxiliar)'], ['MOTO 01', 2]], links: {}, formulas: { '2,2': '=MATCH(1;1;0)' }, maxRows: 50, maxCols: 12 };
DATA.sheets['Configurações'].rows.push(['Receita líquida média por corrida (R$)', 0]);
DATA.sheets['Minhas notas'] = { rows: [['anotação']], links: {}, formulas: {}, maxRows: 10, maxCols: 3 };
const ui = { answers: [] };
const env = makeEnv(DATA, { ui });
const exec = (fn, ...a) => { load(env, FILE); const r = env.ctx[fn](...a); return r == null ? r : JSON.parse(JSON.stringify(r)); };

const w = makeEnv(DATA); load(w, FILE); assert.throws(() => w.ctx.padronizarPlanilha(), /getUi/); assert(w.db.sheets['Painel']);
ok('pelo app não faz nada');
ui.answers = ['NO']; exec('padronizarPlanilha');
assert(env.db.sheets['Painel'] && env.db.sheets['Configurações'].rows.length === 5);
assert(/APAGA as abas que o sistema não usa: Painel/.test(ui.log[0]) && /Receita líquida média por corrida \(R\$\)/.test(ui.log[0]) && /NÃO mexe nestas abas.*Minhas notas/.test(ui.log[0]), ui.log[0]);
ok('mostra o plano antes (apaga Painel, remove a linha, não mexe em "Minhas notas") e com NÃO nada muda');
ui.answers = ['YES', 'OK']; exec('padronizarPlanilha');
assert(!env.db.sheets['Painel']); assert(env.db.sheets['Minhas notas']);
const conf = env.db.sheets['Configurações'].rows;
assert.deepStrictEqual(conf.map(r => r[0]), ['Parâmetro', 'Meta de corridas por turno', 'Revisão a cada (km)', 'Revisão a cada (meses)', 'Turno', 'Turno', 'Turno']);
assert.deepStrictEqual(conf.slice(-3).map(r => r[1]), ['08h-14h', '12h-18h', '18h-00h']);
ok('Painel apagado; "Minhas notas" intacta; linha obsoleta removida, meta/revisão mantidas e linhas de turno criadas');
['REGISTRO DIÁRIO', 'Frota', 'Configurações', 'ABASTECIMENTOS', 'RECEITAS', 'MANUTENÇÕES', 'ENTREGADORES', 'DOCUMENTOS', 'CAMISAS', 'ESCALA'].forEach(n => {
  const S = env.db.sheets[n]; assert.strictEqual(S.tabColor, '#fd4502', n);
  if (n !== 'ESCALA') { assert.strictEqual(S.bg['1,1'], '#fd4502', n); assert.strictEqual(S.frozenRows, 1, n); }
});
assert(!env.db.sheets['Minhas notas'].tabColor);
ok('todas as abas do sistema com cabeçalho e aba laranja (1ª linha fixa); aba do usuário sem mudança');
const h = exec('getHome', '7'); assert.strictEqual(h.app.config.meta, 12); assert.strictEqual(h.app.config.revKm, 3000);
ok('app continua lendo a configuração normalmente');
// rodar de novo: nada a apagar
ui.answers = ['YES', 'OK']; exec('padronizarPlanilha'); assert(!/APAGA/.test(ui.log[ui.log.length - 2]));
ok('rodar de novo só reformata');
// configurar também formata (sem apagar nada)
const env2 = makeEnv(DATA, { ui: { answers: [] } }); load(env2, FILE); env2.ctx.configurar();
assert.strictEqual(env2.db.sheets['REGISTRO DIÁRIO'].bg['1,1'], '#fd4502'); assert(env2.db.sheets['Painel']);
ok('configurar já deixa os cabeçalhos laranja (e não apaga nada)');
console.log('\nOK: padronizar');
