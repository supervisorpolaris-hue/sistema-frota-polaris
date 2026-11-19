// Pasta de fotos com vários usuários: dono, editor com acesso e editor novo sem acesso (o caso real de 18/11).
'use strict';
process.env.TZ = 'America/Sao_Paulo';
const assert = require('assert');
const { makeEnv, load } = require('./gasmock');
const { build } = require('./data');
const FILE = process.argv[2];
const ok = m => console.log('✓', m);

const DONO = 'dono@polaris.com', GUS = 'gustavo@polaris.com', RAY = 'rayssa@polaris.com';
const tmp = makeEnv({ sheets: {}, props: {} }); load(tmp, FILE);
const DATA = build({ schema: JSON.parse(JSON.stringify(tmp.ctx.SCHEMA)) });
const ui = { answers: [] };
const env = makeEnv(DATA, { ui, user: DONO, owner: DONO });
env.quem.editores = [GUS];
const como = (u, fn, ...a) => { env.setUser(u); load(env, FILE); const r = env.ctx[fn](...a); return r == null ? r : JSON.parse(JSON.stringify(r)); };
const F = { data: 'eA==', mime: 'image/jpeg' };
const saida = (moto, km) => ({ data: '2026-11-17', moto, entregador: 'Bruno Lima', turno: '18h-00h', kmIni: km, checklist: {}, forcar: true, fotoIni: F });
const ultimoArquivo = () => env.db.files[env.db.files.length - 1];
const dentroDe = (fid, raiz) => { for (let f = env.folders[fid]; f; f = f.parent ? env.folders[f.parent] : null) if (f.id === raiz) return true; return false; };
const donoVe = fid => { const u = env.quem.usuario; env.setUser(DONO); const r = env.temAcesso(fid); env.setUser(u); return r; };

// dono configura: pasta oficial no Drive dele, compartilhada com o Gustavo
como(DONO, 'configurar');
const OFICIAL = env.props.ROOT_FOLDER_ID;
assert(OFICIAL && env.folders[OFICIAL].owner === DONO && env.folders[OFICIAL].editors.includes(GUS));
ok('configurar (dono): pasta oficial no Drive do dono, compartilhada com os editores');

// Rayssa entra como editora da planilha, mas a pasta não foi liberada para ela
env.quem.editores.push(RAY);
let r = como(RAY, 'openShift', saida('MOTO 05', 90000));
assert(r.ok && /ainda não tem acesso à pasta de fotos/.test(r.msg), r.msg);
assert.strictEqual(env.props.ROOT_FOLDER_ID, OFICIAL, 'pasta oficial NÃO foi trocada');
let arq = ultimoArquivo();
assert.strictEqual(arq.owner, RAY); assert.strictEqual(env.folders[arq.folderId].name, 'Frota Polaris — arquivos aguardando liberação');
assert(donoVe(arq.folderId), 'dono consegue abrir a foto');
ok('Rayssa sem acesso: saída gravada, foto no plano B já compartilhado com o dono, aviso na tela, pasta oficial intacta');

// Gustavo (com acesso) continua salvando na pasta oficial
r = como(GUS, 'openShift', saida('MOTO 06', 91000));
assert(!/ainda não tem acesso/.test(r.msg)); arq = ultimoArquivo();
assert(dentroDe(arq.folderId, OFICIAL) && donoVe(arq.folderId));
ok('Gustavo (com acesso): foto na pasta oficial (Fotos/aaaa-mm), dono vê');

// dono abre o app: quem entrou na planilha ganha acesso sozinho
como(DONO, 'getHome', '7');
assert(env.folders[OFICIAL].editors.includes(RAY));
ok('dono abriu o app: Rayssa ganhou acesso à pasta automaticamente');
r = como(RAY, 'openShift', saida('MOTO 04', 92000));
assert(!/ainda não tem acesso/.test(r.msg)); arq = ultimoArquivo();
assert(dentroDe(arq.folderId, OFICIAL) && donoVe(arq.folderId));
ok('depois disso, a foto da Rayssa vai para a pasta oficial');

// estado bagunçado pelo código antigo: propriedades apontando para pastas no Drive da Rayssa
env.setUser(RAY);
const raizRay = env.folders['ROOT_' + RAY] ? 'ROOT_' + RAY : null;
const priv = 'PRIV1', privMes = 'PRIV2';
env.folders[priv] = { id: priv, name: 'Frota Polaris — Arquivos', parent: raizRay, trashed: false, children: [privMes], files: [], owner: RAY, editors: [] };
env.folders[privMes] = { id: privMes, name: '2026-11', parent: priv, trashed: false, children: [], files: [], owner: RAY, editors: [] };
env.props.ROOT_FOLDER_ID = priv;
Object.keys(env.props).filter(k => k.startsWith('PASTA_MES_')).forEach(k => { env.props[k] = privMes; });
r = como(RAY, 'openShift', saida('MOTO 03', 93000)); arq = ultimoArquivo();
assert(!dentroDe(arq.folderId, priv), 'não usa a pasta particular dela'); assert(donoVe(arq.folderId));
ok('com a configuração bagunçada (pasta "oficial" no Drive da Rayssa), a foto dela não vai para lá e o dono vê');
como(DONO, 'getHome', '7');
assert.strictEqual(env.props.ROOT_FOLDER_ID, OFICIAL);
r = como(GUS, 'openShift', saida('MOTO 02', 94000)); arq = ultimoArquivo();
assert(dentroDe(arq.folderId, OFICIAL) && !/ainda não tem acesso/.test(r.msg));
ok('dono abriu o app: pasta oficial restaurada; Gustavo volta a salvar nela');

// menus de manutenção: só a conta dona
ui.answers = []; como(GUS, 'padronizarPlanilha');
assert(/Só a conta dona/.test(ui.log[ui.log.length - 1]));
como(GUS, 'liberarPasta'); assert(/Só a conta dona/.test(ui.log[ui.log.length - 1]));
assert.throws(() => como(GUS, 'configurar'), /conta dona/);
como(DONO, 'liberarPasta'); assert(/Pasta de fotos liberada/.test(ui.log[ui.log.length - 1]));
ok('Padronizar, Liberar pasta, Zerar e configurar: só a conta dona (outros recebem aviso)');

// documentos: mesma regra
env.quem.editores.push('novo@polaris.com');
r = como('novo@polaris.com', 'uploadDriverDoc', { entId: 'E004', tipo: 'Outro', file: F });
assert(/ainda não tem acesso/.test(r.msg)); assert(donoVe(ultimoArquivo().folderId));
r = como(DONO, 'uploadDriverDoc', { entId: 'E004', tipo: 'CNH', file: F });
assert(dentroDe(ultimoArquivo().folderId, OFICIAL));
ok('documentos: sem acesso vai para o plano B compartilhado; dono salva na pasta oficial');
console.log('\nOK: pasta de fotos');
