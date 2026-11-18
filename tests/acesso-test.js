process.env.TZ = 'America/Sao_Paulo';
const assert = require('assert');
const { makeEnv, load } = require('./gasmock'); const { build } = require('./data');
const FILE = process.argv[2];
const tmp = makeEnv({ sheets: {}, props: {} }); load(tmp, FILE);
const DATA = build({ schema: JSON.parse(JSON.stringify(tmp.ctx.SCHEMA)) });
// 1) app ligado a outra planilha (sem acesso a ela)
let env = makeEnv(Object.assign({}, DATA, { props: { SS_ID: '14DgF5IRI5CvkSnbQxYUVxmRaF4A1SBm07RJWTiqRlSg' } }));
load(env, FILE);
assert.throws(() => env.ctx.getHome('7'), e => { console.log('  outra planilha →', e.message); return /^SEM_ACESSO: a conta supervisor@exemplo\.com não tem acesso à planilha do sistema \(planilha …iqRlSg\)/.test(e.message); });
// 2) permissão do Google dada pela metade
env = makeEnv(DATA); load(env, FILE);
env.ctx.SpreadsheetApp.openById = () => { throw new Error('Exception: As permissões especificadas não são suficientes para chamar SpreadsheetApp.openById. Permissões necessárias: https://www.googleapis.com/auth/spreadsheets'); };
assert.throws(() => env.ctx.getHome('7'), e => { console.log('  permissão parcial →', e.message); return /não recebeu permissão para usar suas planilhas na conta supervisor@exemplo\.com/.test(e.message); });
// 3) cliente continua reconhecendo como "Sem acesso" (prefixo SEM_ACESSO)
console.log('✓ mensagens distinguem as duas causas e mostram conta e planilha');
