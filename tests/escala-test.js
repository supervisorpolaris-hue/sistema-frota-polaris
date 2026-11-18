// Testa a aba ESCALA: montar pelo menu, completar sem apagar, leitura com turno e escala de hoje.
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
const exec = (fn, ...a) => { load(env, FILE); const r = env.ctx[fn](...a); return r == null ? r : JSON.parse(JSON.stringify(r)); };
const E = () => env.db.sheets['ESCALA'];
const linha = re => E().rows.findIndex(r => re.test(String(r[0])));
const ultimoAviso = () => ui.log[ui.log.length - 1];

// menu
exec('onOpen');
assert.deepStrictEqual(ui.menu.map(x => x[1]), ['escalaEsteMes', 'escalaProximoMes', 'padronizarPlanilha', 'zerarSistema']);
ok('menu: Montar escala deste mês / do próximo mês / Padronizar abas / Zerar o sistema');

// pelo app (sem planilha aberta) não faz nada
const envWeb = makeEnv(DATA); load(envWeb, FILE);
assert.throws(() => envWeb.ctx.escalaProximoMes(), /getUi/);
ok('chamado pelo app, não mexe na planilha');

// próximo mês (dezembro/2026): bloco novo no fim da aba
const antes = E().rows.filter(r => r.some(v => v !== '')).length;
exec('escalaProximoMes');
const t = linha(/^ESCALA MÊS DE DEZEMBRO 2026$/);
assert(t > 0 && E().rows[t - 1].every(v => v === '' || v == null), 'linha em branco antes do bloco');
const dias = E().rows[t + 1], sem = E().rows[t + 2];
assert.strictEqual(dias[0], 'DIAS DO MÊS'); assert.strictEqual(dias[31], 31); assert.strictEqual(sem[25], 'SEX'); assert.strictEqual(sem[0], 'DIA DA SEMANA');
const nomes = E().rows.slice(t + 3, t + 3 + 8).map(r => r[0]);
assert.deepStrictEqual(nomes, ['Ana Paula Souza', 'Bruno Lima', 'Carlos Eduardo', 'Diego Santos', 'Felipe Rocha', 'João Pedro Silva', 'Marcos Vinícius', 'Rafael Mailson']);
assert(!E().rows.slice(t + 3).some(r => r[0] === 'Thiago Alves'), 'inativo fora');
const R1 = t + 4; // linha (1-based) da Ana
const dvDia = E().dv[R1 + ',2'], dvNome = E().dv[R1 + ',1'];
assert.deepStrictEqual(dvDia.lista, ['08h-14h', '12h-18h', '18h-00h', 'F']); assert.strictEqual(dvDia.permiteInvalido, false);
assert.strictEqual(E().dv[R1 + ',32'].lista.length, 4, '31 dias em dezembro');
assert.strictEqual(dvNome.intervalo.sheet, 'ENTREGADORES'); assert.strictEqual(dvNome.intervalo.c, 2);
assert.deepStrictEqual(E().cf.map(x => x.texto), ['F', '08h-14h', '12h-18h', '18h-00h']);
assert.strictEqual(E().frozenCols, 1);
assert(/Grade criada na aba ESCALA com 8 entregador/.test(ultimoAviso()), ultimoAviso());
ok('dezembro/2026 criado: 31 dias, dia da semana certo (25/12 = SEX), 8 ativos em ordem, listas de turno/F e de nomes, cores e 1ª coluna fixa');

// preenche e roda de novo: nada é apagado nem duplicado
E().rows[R1 - 1][1] = '18h-00h';               // Ana, dia 1
const rRafa = E().rows.findIndex((r, i) => i > t && r[0] === 'Rafael Mailson');
E().rows[rRafa][1] = '08h-14h'; E().rows[rRafa][2] = 'F';
const qtd = E().rows.length;
exec('escalaProximoMes');
assert.strictEqual(E().rows.length, qtd);
assert.strictEqual(E().rows[R1 - 1][1], '18h-00h'); assert.strictEqual(E().rows[rRafa][2], 'F');
assert(/já existia\. Nenhum entregador novo/.test(ultimoAviso()), ultimoAviso());
ok('rodar de novo não apaga o que foi preenchido nem duplica');

// entregador novo: entra no fim do bloco, com as listas
exec('saveDriver', { nome: 'Zeca Novo', status: 'Ativo' });
exec('escalaProximoMes');
const rZeca = E().rows.findIndex((r, i) => i > t && r[0] === 'Zeca Novo');
assert.strictEqual(rZeca, t + 3 + 8, 'logo depois do último');
assert.deepStrictEqual(E().dv[(rZeca + 1) + ',2'].lista, ['08h-14h', '12h-18h', '18h-00h', 'F']);
assert.strictEqual(E().rows[R1 - 1][1], '18h-00h');
assert(/Incluídos: Zeca Novo/.test(ultimoAviso()));
ok('entregador cadastrado depois entra no fim do mês, com as listas, sem mexer no resto');

// mês que já existe no formato antigo (novembro, só primeiro nome com TR/F) e NÃO é o último bloco
const tNov = linha(/^ESCALA MÊS DE NOVEMBRO 2026$/);
const nomesNov = () => { const out = []; for (let i = tNov + 3; i < E().rows.length && !/^ESCALA/.test(String(E().rows[i][0])); i++) if (E().rows[i][0]) out.push(E().rows[i][0]); return out; };
const nov0 = nomesNov();
const dezAntes = linha(/^ESCALA MÊS DE DEZEMBRO 2026$/);
const anaDez = JSON.stringify(E().rows[R1 - 1]);
exec('escalaEsteMes');
const nov1 = nomesNov();
assert.deepStrictEqual(nov1.slice(0, nov0.length), nov0);
const novos = nov1.slice(nov0.length);
assert.deepStrictEqual(novos.sort(), ['Zeca Novo'].sort(), 'só quem não estava (por primeiro nome também): ' + novos);
assert.strictEqual(linha(/^ESCALA MÊS DE DEZEMBRO 2026$/), dezAntes + novos.length, 'dezembro desceu junto');
assert.strictEqual(JSON.stringify(E().rows[R1 - 1 + novos.length]), anaDez, 'dados de dezembro intactos');
ok('novembro (formato antigo "RAFAEL"=Rafael Mailson) só ganhou quem faltava; dezembro desceu sem perder nada');

// leitura: turno do dia + TR antigo + folga
const tN = linha(/^ESCALA MÊS DE NOVEMBRO 2026$/);
const rowRafaNov = E().rows.findIndex((r, i) => i > tN && /^RAFAEL/i.test(r[0]));
E().rows[rowRafaNov][17] = '12h-18h';                 // hoje (17/11), turno com horário
const rowZecaNov = E().rows.findIndex((r, i) => i > tN && r[0] === 'Zeca Novo');
E().rows[rowZecaNov][17] = 'F';                       // folga
let h = exec('getHome', '7');
const rafa = h.dash.escalaHoje.find(e => e.nome === 'Rafael Mailson');
assert.strictEqual(rafa.turno, '12h-18h');
assert(!h.dash.escalaHoje.some(e => e.nome === 'Zeca Novo'), 'folga não aparece');
assert(h.dash.escalaHoje.some(e => e.turno === ''), 'TR antigo continua valendo (sem horário)');
const posRafa = h.dash.escalaHoje.indexOf(rafa);
assert(h.dash.escalaHoje.slice(posRafa + 1).every(e => e.turno === '' || e.turno >= '12h-18h'), 'ordenado por turno');
const appRafa = h.app.escalaHoje.find(e => e.nome === 'Rafael Mailson');
assert.deepStrictEqual(Object.keys(appRafa).sort(), ['nome', 'saiu', 'turno']);
ok('escala de hoje: turno lido da célula (12h-18h), folga fora, TR antigo aceito, ordem por turno; app recebe nome/turno/saiu');

// zerar: aba volta só com o cabeçalho do mês, sem listas velhas
ui.answers = ['YES', 'NO', 'OK']; exec('zerarSistema');
const cheias = E().rows.filter(r => r.some(v => v !== '' && v != null));
assert.strictEqual(cheias.length, 3); assert.strictEqual(cheias[0][0], 'ESCALA MÊS DE NOVEMBRO 2026');
assert.strictEqual(Object.keys(E().dv || {}).length, 0);
ok('Zerar deixa a escala só com o cabeçalho do mês atual');
console.log('\nOK: escala');
