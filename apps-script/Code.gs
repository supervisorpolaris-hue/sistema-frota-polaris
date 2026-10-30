/**
 * SISTEMA FROTA POLARIS — v2
 * App web (Google Apps Script) ligado à planilha Controle_Frota_Polaris.
 *
 * Abas lidas:   REGISTRO DIÁRIO, Frota, Configurações, ESCALA, CAMISAS
 * Abas criadas: ABASTECIMENTOS, RECEITAS, MANUTENÇÕES, ENTREGADORES, DOCUMENTOS
 *
 * Primeira vez: rode a função "configurar" no editor (cria abas, pastas e compartilha a pasta
 * de arquivos com quem já tem acesso de edição à planilha).
 */

var PROP_SS = 'SS_ID';
var PROP_ROOT = 'ROOT_FOLDER_ID';
var ROOT_FOLDER_NAME = 'Frota Polaris — Arquivos';

var SHEET = {
  REG: 'REGISTRO DIÁRIO', FROTA: 'Frota', CONF: 'Configurações', CAMISAS: 'CAMISAS', ESCALA: 'ESCALA',
  ABAST: 'ABASTECIMENTOS', REC: 'RECEITAS', MANUT: 'MANUTENÇÕES', ENT: 'ENTREGADORES', DOCS: 'DOCUMENTOS'
};

// Abas novas: [chave, cabeçalho, tipo]. Tipos: date, datetime, int, num, money, link (padrão: texto).
var SCHEMA = {
  ABAST: [['data', 'Data', 'date'], ['hora', 'Hora'], ['moto', 'Moto'], ['km', 'KM', 'int'], ['litros', 'Litros', 'num'],
    ['valor', 'Valor (R$)', 'money'], ['preco', 'Preço/L (R$)', 'money'], ['posto', 'Posto'], ['cheio', 'Tanque cheio'],
    ['entregador', 'Entregador'], ['fotoCupom', 'Foto cupom', 'link'], ['fotoPainel', 'Foto painel', 'link'],
    ['obs', 'Observação'], ['por', 'Lançado por'], ['em', 'Lançado em', 'datetime']],
  REC: [['data', 'Data', 'date'], ['valor', 'Valor (R$)', 'money'], ['descricao', 'Descrição'],
    ['por', 'Lançado por'], ['em', 'Lançado em', 'datetime']],
  MANUT: [['data', 'Data', 'date'], ['moto', 'Moto'], ['km', 'KM', 'int'], ['tipo', 'Tipo'], ['descricao', 'Descrição'],
    ['pecas', 'Peças (R$)', 'money'], ['maoObra', 'Mão de obra (R$)', 'money'], ['total', 'Total (R$)', 'money'],
    ['oficina', 'Oficina'], ['foto', 'Foto nota', 'link'], ['por', 'Lançado por'], ['em', 'Lançado em', 'datetime']],
  ENT: [['id', 'ID'], ['nome', 'Nome'], ['cpf', 'CPF'], ['rg', 'RG'], ['nascimento', 'Data nascimento', 'date'],
    ['telefone', 'Telefone'], ['endereco', 'Endereço'], ['emergencia', 'Contato de emergência'],
    ['cnhNumero', 'CNH número'], ['cnhCategoria', 'CNH categoria'], ['cnhValidade', 'CNH validade', 'date'],
    ['admissao', 'Data admissão', 'date'], ['desligamento', 'Data desligamento', 'date'],
    ['salario', 'Salário mensal (R$)', 'money'], ['pix', 'Chave PIX'], ['camisa', 'Tamanho camisa'], ['status', 'Status'],
    ['obs', 'Observações'], ['pasta', 'Pasta documentos', 'link'], ['atualizadoEm', 'Atualizado em', 'datetime'],
    ['atualizadoPor', 'Atualizado por']],
  DOCS: [['data', 'Data envio', 'datetime'], ['entId', 'ID entregador'], ['entregador', 'Entregador'], ['tipo', 'Tipo'],
    ['validade', 'Validade', 'date'], ['arquivo', 'Arquivo', 'link'], ['nomeArquivo', 'Nome do arquivo'], ['por', 'Enviado por']]
};

// Campos do entregador que o app edita (o resto é controle interno)
var ENT_FIELDS = ['nome', 'cpf', 'rg', 'nascimento', 'telefone', 'endereco', 'emergencia', 'cnhNumero', 'cnhCategoria',
  'cnhValidade', 'admissao', 'desligamento', 'salario', 'pix', 'camisa', 'status', 'obs'];

var DOC_TIPOS = ['CNH', 'RG / CPF', 'Comprovante de residência', 'Contrato / termo da moto'];
var MANUT_TIPOS = ['Revisão', 'Troca de óleo', 'Pneu', 'Freio', 'Corrente / relação', 'Elétrica', 'Avaria / funilaria', 'Outro'];

// Aba REGISTRO DIÁRIO (existente). A coluna de data tem "." como cabeçalho.
var COL = {
  data: '.', moto: 'Moto (ID)', entregador: 'Entregador responsável', turno: 'Turno',
  kmIni: 'KM Início', kmFim: 'KM Fim', kmRod: 'KM Rodado', litros: 'Litros abastecidos',
  valor: 'Valor abastecido (R$)', consumo: 'Consumo (km/l)', corridas: 'Corridas realizadas', meta: 'Meta (turno)',
  atingiu: 'Atingiu meta?', recebido: 'Recebido por', devolvido: 'Devolvido por', status: 'Status',
  ocorrencia: 'Ocorrência/Avaria', custo: 'Custo por corrida (R$)', receita: 'Receita estimada (R$)',
  lucro: 'Lucro estimado (R$)',
  // colunas novas, criadas no fim da aba quando usadas pela primeira vez
  horaSaida: 'Hora saída', horaRetorno: 'Hora retorno', checklist: 'Checklist',
  fotoIni: 'Foto KM Início', fotoFim: 'Foto KM Fim', por: 'Lançado por'
};
var REG_EXTRA = ['horaSaida', 'horaRetorno', 'checklist', 'fotoIni', 'fotoFim', 'por'];
var REG_LINKS = ['fotoIni', 'fotoFim'];
var COMPUTED = ['kmRod', 'consumo', 'meta', 'atingiu', 'custo']; // mantém fórmula se existir
var NEVER_WRITE = ['receita', 'lucro', 'litros', 'valor'];      // combustível agora vai para ABASTECIMENTOS

var LINK_TEXT = '📎 Abrir';
var FILE_MAX_BYTES = 10 * 1024 * 1024;
var STATUS_ABERTO = 'RODANDO';
var DEFAULT_STATUS = ['RODANDO', 'FINALIZADO', 'MANUTENÇÃO', 'PARADA'];
var ALERTA_KM = 300;          // "revisão próxima" quando faltar menos que isso
var ALERTA_DIAS = 15;         // idem, em dias
var ALERTA_CNH_DIAS = 30;     // CNH vencendo
var KM_TURNO_SUSPEITO = 300;
var MESES = { janeiro: 1, fevereiro: 2, marco: 3, abril: 4, maio: 5, junho: 6, julho: 7, agosto: 8,
  setembro: 9, outubro: 10, novembro: 11, dezembro: 12 };

/* ============================== WEB ============================== */

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Frota · Polaris Entregas')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

function include(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}

/* ============================== CONFIGURAÇÃO (rodar no editor) ============================== */

/** Cria as abas novas, as pastas no Drive e compartilha a pasta com os editores da planilha. */
function configurar() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Abra o editor pela planilha (Extensões → Apps Script) e rode de novo.');
  PropertiesService.getScriptProperties().setProperty(PROP_SS, ss.getId());
  ['ABAST', 'REC', 'MANUT', 'ENT', 'DOCS'].forEach(function (k) { table_(ss, k); });
  var c = ctx_();
  var drivers = drivers_(c);
  var root = rootFolder_(ss);
  subFolder_(root, 'Fotos');
  subFolder_(root, 'Documentos dos entregadores');
  var shared = compartilharPasta();
  Logger.log('Planilha: ' + ss.getUrl());
  Logger.log('Entregadores cadastrados: ' + drivers.length);
  Logger.log('Pasta de arquivos: ' + root.getUrl());
  Logger.log('Pasta compartilhada com: ' + (shared.length ? shared.join(', ') : '(ninguém além de você)'));
}

/** Dá acesso de edição à pasta de arquivos para todos os editores da planilha. Rode de novo ao adicionar pessoas. */
function compartilharPasta() {
  var ss = ss_();
  var root = rootFolder_(ss);
  var owner = (ss.getOwner() && ss.getOwner().getEmail()) || '';
  var atuais = root.getEditors().map(function (u) { return u.getEmail(); });
  var novos = ss.getEditors().map(function (u) { return u.getEmail(); }).filter(function (e) {
    return e && e !== owner && atuais.indexOf(e) < 0;
  });
  if (novos.length) root.addEditors(novos);
  return atuais.concat(novos).filter(function (e) { return e !== owner; });
}

/** Teste rápido no editor: mostra no registro o que o app enxerga. */
function testeSistema() {
  var a = getApp();
  Logger.log('Motos: ' + a.motos.map(function (m) { return m.id + ' (' + m.lastKm + ' km)'; }).join(', '));
  Logger.log('Entregadores ativos: ' + a.entregadores.join(', '));
  Logger.log('Turnos abertos: ' + a.openShifts.length);
  var d = getDashboard('30');
  Logger.log('30 dias: ' + JSON.stringify(d.cur));
  Logger.log('Alertas: ' + d.alertas.map(function (x) { return x.titulo; }).join(' | '));
  Logger.log('Insights: ' + d.insights.map(function (x) { return x.texto; }).join(' | '));
}

/* ============================== API: DADOS DO APP ============================== */

function getApp() {
  var c = ctx_();
  var fuel = fuelRows_(c);
  var manut = rows_(table_(c.ss, 'MANUT')).map(manutEntry_(c));
  var rec = rows_(table_(c.ss, 'REC')).map(recEntry_(c));
  var drivers = drivers_(c);
  var lastKm = lastKmByMoto_(c.reg.rows, fuel, manut);
  var open = openShifts_(c.reg.rows, c.today);
  var mes = c.today.slice(0, 7);

  var motoIds = c.frota.length ? c.frota.map(function (f) { return f.id; }) : distinct_(c.reg.rows, 'moto');
  var motos = motoIds.map(function (id) {
    var f = c.frota.filter(function (x) { return x.id === id; })[0] || {};
    return {
      id: id, modelo: f.modelo || '', lastKm: lastKm[id] == null ? null : lastKm[id],
      open: open.filter(function (o) { return o.moto === id; })[0] || null
    };
  });

  var consumos = consumoPorAbastecimento_(fuel);
  return {
    user: userEmail_(),
    sheetUrl: c.ss.getUrl(),
    folderUrl: folderUrlSafe_(c.ss),
    regGid: c.reg.sheet.getSheetId(),
    today: c.today,
    config: c.config,
    motos: motos,
    entregadores: drivers.filter(ativo_).map(function (d) { return d.nome; }),
    turnos: byFrequency_(c.reg.rows, 'turno'),
    responsaveis: byFrequency_(c.reg.rows.map(function (r) { return { x: r.recebido }; })
      .concat(c.reg.rows.map(function (r) { return { x: r.devolvido }; })), 'x'),
    ocorrencias: byFrequency_(c.reg.rows, 'ocorrencia').slice(0, 12),
    statusOptions: statusOptions_(c.reg),
    postos: byFrequency_(fuel.filter(function (f) { return f.origem === 'abast'; }), 'posto').slice(0, 12),
    manutTipos: MANUT_TIPOS,
    docTipos: DOC_TIPOS,
    openShifts: open,
    recentTurnos: c.reg.rows.slice(-8).reverse().map(publicRow_),
    recentFuel: fuel.filter(function (f) { return f.origem === 'abast'; }).slice(-8).reverse().map(function (f) {
      var o = pick_(f, ['row', 'dataFmt', 'hora', 'moto', 'km', 'litros', 'valor', 'preco', 'posto', 'cheio', 'entregador', 'fotoCupom', 'fotoPainel']);
      o.consumo = consumos[f.row] || null;
      return o;
    }),
    recentRec: rec.slice(-8).reverse(),
    recentManut: manut.slice(-8).reverse(),
    receitaMes: sum_(rec.filter(function (r) { return r.key.slice(0, 7) === mes; }), 'valor'),
    combustivelMes: sum_(fuel.filter(function (f) { return f.key.slice(0, 7) === mes; }), 'valor')
  };
}

/* ============================== API: TURNOS ============================== */

function openShift(p) {
  return withLock_(function () {
    var c = ctx_();
    var d = validateBase_(p);
    if (d.kmIni == null) throw new Error('Informe o KM de início.');
    var jaAberto = openShifts_(c.reg.rows, c.today).filter(function (o) { return o.moto === d.moto; })[0];
    if (jaAberto && !p.forcar) {
      throw new Error('A moto ' + d.moto + ' já está com turno aberto (' + jaAberto.entregador + ', ' +
        jaAberto.dataFmt + '). Registre o retorno antes ou confirme para abrir mesmo assim.');
    }
    var values = {
      data: d.data, moto: d.moto, entregador: d.entregador, turno: d.turno, kmIni: d.kmIni, meta: c.config.meta,
      recebido: d.recebido, status: STATUS_ABERTO, horaSaida: hora_(c.tz), checklist: checklistTxt_(p.checklist),
      por: userEmail_()
    };
    if (p.fotoIni) values.fotoIni = savePhoto_(c.ss, p.fotoIni, d.data, d.moto + '_saida_km' + d.kmIni);
    var row = nextRow_(c.reg);
    writeRow_(c.reg, row, values, true);
    return { ok: true, msg: 'Saída registrada: ' + d.moto + ' com ' + d.entregador + '.' };
  });
}

function closeShift(rowNumber, p) {
  return withLock_(function () {
    var c = ctx_();
    var r = c.reg.rows.filter(function (x) { return x.row === rowNumber; })[0];
    if (!r) throw new Error('Turno não encontrado. Atualize a tela.');
    if (r.moto !== p.moto) throw new Error('A planilha mudou (a linha agora é de outra moto). Atualize a tela.');
    if (r.kmFim != null) throw new Error('Este turno já foi fechado. Atualize a tela.');
    var fim = validateFechamento_(p, r.kmIni);
    var values = closingValues_(r.kmIni, fim, c.config);
    values.horaRetorno = hora_(c.tz);
    if (p.fotoFim) values.fotoFim = savePhoto_(c.ss, p.fotoFim, new Date(), r.moto + '_retorno_km' + fim.kmFim);
    writeRow_(c.reg, rowNumber, values, false);
    return { ok: true, msg: 'Retorno registrado: ' + r.moto + ' — ' + values.kmRod + ' km, ' + fim.corridas + ' corridas.' };
  });
}

function saveFullShift(p) {
  return withLock_(function () {
    var c = ctx_();
    var d = validateBase_(p);
    if (d.kmIni == null) throw new Error('Informe o KM de início.');
    var fim = validateFechamento_(p, d.kmIni);
    var values = closingValues_(d.kmIni, fim, c.config);
    values.data = d.data; values.moto = d.moto; values.entregador = d.entregador; values.turno = d.turno;
    values.kmIni = d.kmIni; values.recebido = d.recebido; values.por = userEmail_();
    if (p.fotoIni) values.fotoIni = savePhoto_(c.ss, p.fotoIni, d.data, d.moto + '_saida_km' + d.kmIni);
    if (p.fotoFim) values.fotoFim = savePhoto_(c.ss, p.fotoFim, d.data, d.moto + '_retorno_km' + fim.kmFim);
    var row = nextRow_(c.reg);
    writeRow_(c.reg, row, values, true);
    return { ok: true, msg: 'Turno lançado: ' + d.moto + ' — ' + values.kmRod + ' km.' };
  });
}

/* ============================== API: ABASTECIMENTO, RECEITA, MANUTENÇÃO ============================== */

function saveFuel(p) {
  return withLock_(function () {
    var c = ctx_();
    var data = parseDate_(p.data);
    if (!data) throw new Error('Data inválida.');
    var moto = String(p.moto || '').trim();
    if (!moto) throw new Error('Escolha a moto.');
    var litros = toNumber_(p.litros), valor = toNumber_(p.valor), km = toNumber_(p.km);
    if (!(valor > 0)) throw new Error('Informe o valor abastecido.');
    if (litros != null && litros <= 0) throw new Error('Litros inválido.');
    if (km != null && km < 0) throw new Error('KM inválido.');
    var t = table_(c.ss, 'ABAST');
    var o = {
      data: data, hora: hora_(c.tz), moto: moto, km: km == null ? '' : km, litros: litros == null ? '' : litros,
      valor: valor, preco: litros > 0 ? round_(valor / litros, 3) : '', posto: String(p.posto || '').trim(),
      cheio: p.cheio === false ? 'Não' : 'Sim', entregador: String(p.entregador || '').trim(),
      obs: String(p.obs || '').trim(), por: userEmail_(), em: new Date()
    };
    if (p.fotoCupom) o.fotoCupom = savePhoto_(c.ss, p.fotoCupom, data, moto + '_cupom');
    if (p.fotoPainel) o.fotoPainel = savePhoto_(c.ss, p.fotoPainel, data, moto + '_abast_km' + (km == null ? '' : km));
    var row = append_(t, o);
    var msg = 'Abastecimento salvo: ' + moto + ' — ' + fmtMoney_(valor);
    var cons = consumoPorAbastecimento_(fuelRows_(c))[row];
    if (cons) msg += ' · consumo ' + fmtNum_(cons.kml, 1) + ' km/l desde o último tanque cheio';
    return { ok: true, msg: msg };
  });
}

function saveRevenue(p) {
  return withLock_(function () {
    var c = ctx_();
    var data = parseDate_(p.data);
    if (!data) throw new Error('Data inválida.');
    var valor = toNumber_(p.valor);
    if (!(valor > 0)) throw new Error('Informe o valor recebido.');
    append_(table_(c.ss, 'REC'), {
      data: data, valor: valor, descricao: String(p.descricao || '').trim(), por: userEmail_(), em: new Date()
    });
    return { ok: true, msg: 'Receita salva: ' + fmtMoney_(valor) + ' em ' + fmtDate_(data, c.tz) + '.' };
  });
}

function saveMaintenance(p) {
  return withLock_(function () {
    var c = ctx_();
    var data = parseDate_(p.data);
    if (!data) throw new Error('Data inválida.');
    var moto = String(p.moto || '').trim();
    if (!moto) throw new Error('Escolha a moto.');
    var tipo = String(p.tipo || '').trim();
    if (!tipo) throw new Error('Escolha o tipo de manutenção.');
    var km = toNumber_(p.km), pecas = toNumber_(p.pecas), mao = toNumber_(p.maoObra);
    var total = (pecas || 0) + (mao || 0);
    if (!(total > 0)) total = toNumber_(p.total) || 0;
    var o = {
      data: data, moto: moto, km: km == null ? '' : km, tipo: tipo, descricao: String(p.descricao || '').trim(),
      pecas: pecas == null ? '' : pecas, maoObra: mao == null ? '' : mao, total: total,
      oficina: String(p.oficina || '').trim(), por: userEmail_(), em: new Date()
    };
    if (p.foto) o.foto = savePhoto_(c.ss, p.foto, data, moto + '_manutencao');
    append_(table_(c.ss, 'MANUT'), o);
    var msg = 'Manutenção salva: ' + moto + ' — ' + tipo + '.';
    if (norm_(tipo) === 'revisao' && km != null) {
      var prox = registrarRevisaoFrota_(c, moto, km, data);
      if (prox) msg += ' Próxima revisão em ' + fmtInt_(prox) + ' km.';
    }
    return { ok: true, msg: msg };
  });
}

/* ============================== API: ENTREGADORES ============================== */

function getDrivers() {
  var c = ctx_();
  var drivers = drivers_(c);
  var docs = rows_(table_(c.ss, 'DOCS'));
  var start = addDaysKey_(c.today, -29);
  var perf = perfByDriver_(c, drivers, start, c.today);
  return {
    docTipos: DOC_TIPOS,
    drivers: drivers.map(function (d) {
      var st = docStatus_(d, docs, c.today);
      var p = perf[d.id] || {};
      return {
        id: d.id, nome: d.nome, status: d.status || 'Ativo', telefone: String(d.telefone || ''),
        cnhValidade: d.cnhKey || '', cnhDias: d.cnhKey ? daysBetween_(c.today, d.cnhKey) : null,
        docsOk: st.ok, docsFaltando: st.faltando, turnos: p.turnos || 0, corridas: p.corridas || 0,
        pctMeta: p.pctMeta == null ? null : p.pctMeta, salario: toNumber_(d.salario)
      };
    })
  };
}

function getDriver(id) {
  var c = ctx_();
  var d = drivers_(c).filter(function (x) { return x.id === id; })[0];
  if (!d) throw new Error('Entregador não encontrado.');
  var docs = rows_(table_(c.ss, 'DOCS')).filter(function (x) { return x.entId === id; }).map(function (x) {
    var vk = parseDate_(x.validade) ? dateKey_(parseDate_(x.validade), c.tz) : '';
    return { tipo: x.tipo, validade: vk, dias: vk ? daysBetween_(c.today, vk) : null, url: x.arquivo,
      nome: x.nomeArquivo, data: x.data ? fmtDate_(parseDate_(x.data) || new Date(x.data), c.tz) : '', por: x.por };
  }).reverse();
  var data = {};
  ENT_FIELDS.forEach(function (k) {
    var v = d[k];
    var tipo = colType_('ENT', k);
    if (tipo === 'date') { var dt = parseDate_(v); data[k] = dt ? dateKey_(dt, c.tz) : ''; }
    else if (tipo === 'money') data[k] = toNumber_(v) == null ? '' : toNumber_(v);
    else data[k] = v == null ? '' : String(v);
  });
  data.id = d.id;
  var perf = perfByDriver_(c, [d], addDaysKey_(c.today, -29), c.today)[d.id] || {};
  return { data: data, docs: docs, docTipos: DOC_TIPOS, perf: perf, pasta: d.pasta || '' };
}

function saveDriver(p) {
  return withLock_(function () {
    var c = ctx_();
    var t = table_(c.ss, 'ENT');
    var rows = rows_(t);
    var nome = String(p.nome || '').trim().replace(/\s+/g, ' ');
    if (!nome) throw new Error('Informe o nome do entregador.');
    var cpf = String(p.cpf || '').replace(/\D/g, '');
    if (cpf && cpf.length !== 11) throw new Error('CPF deve ter 11 números.');
    var o = {};
    ENT_FIELDS.forEach(function (k) {
      var tipo = colType_('ENT', k), v = p[k];
      if (tipo === 'date') o[k] = v ? (parseDate_(v) || '') : '';
      else if (tipo === 'money') o[k] = toNumber_(v) == null ? '' : toNumber_(v);
      else o[k] = String(v == null ? '' : v).trim();
    });
    o.nome = nome;
    if (cpf) o.cpf = cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    o.status = o.status || 'Ativo';
    o.atualizadoEm = new Date();
    o.atualizadoPor = userEmail_();
    var id = String(p.id || '');
    if (id) {
      var r = rows.filter(function (x) { return x.id === id; })[0];
      if (!r) throw new Error('Entregador não encontrado. Atualize a tela.');
      writeObj_(t, r._row, o);
    } else {
      var dup = rows.filter(function (x) { return norm_(x.nome) === norm_(nome); })[0];
      if (dup) throw new Error('Já existe um entregador com esse nome (' + dup.id + ').');
      id = nextDriverId_(rows);
      o.id = id;
      append_(t, o);
    }
    return { ok: true, id: id, msg: 'Cadastro salvo: ' + nome + '.' };
  });
}

function uploadDriverDoc(p) {
  return withLock_(function () {
    var c = ctx_();
    var t = table_(c.ss, 'ENT');
    var d = rows_(t).filter(function (x) { return x.id === p.entId; })[0];
    if (!d) throw new Error('Entregador não encontrado.');
    var tipo = String(p.tipo || '').trim() || 'Outro';
    var validade = p.validade ? parseDate_(p.validade) : null;
    var folder = driverFolder_(c, t, d);
    var ext = extFromMime_(p.file && p.file.mime);
    var nomeArq = tipo.replace(/[\/\\]/g, '-') + ' - ' + d.nome + ' - ' + c.today + '.' + ext;
    var url = saveFile_(p.file, folder, nomeArq, ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
    append_(table_(c.ss, 'DOCS'), {
      data: new Date(), entId: d.id, entregador: d.nome, tipo: tipo, validade: validade || '',
      arquivo: url, nomeArquivo: nomeArq, por: userEmail_()
    });
    if (tipo === 'CNH' && validade) writeObj_(t, d._row, { cnhValidade: validade });
    return { ok: true, msg: tipo + ' enviado para ' + d.nome + '.' };
  });
}

/* ============================== API: PAINEL ============================== */

function getDashboard(period) {
  var c = ctx_();
  var P = periodo_(String(period || '7'), c.today);
  var turnos = c.reg.rows;
  var fuel = fuelRows_(c);
  var manut = rows_(table_(c.ss, 'MANUT')).map(manutEntry_(c));
  var rec = rows_(table_(c.ss, 'REC')).map(recEntry_(c));
  var drivers = drivers_(c);
  var docs = rows_(table_(c.ss, 'DOCS'));
  var escala = readEscala_(c.ss, c.today);
  var meta = c.config.meta;
  var inR = function (k, a, b) { return k && k >= a && k <= b; };

  function totals(a, b) {
    var t = turnos.filter(function (r) { return inR(r.key, a, b); });
    var f = fuel.filter(function (r) { return inR(r.key, a, b); });
    var m = manut.filter(function (r) { return inR(r.key, a, b); });
    var rc = rec.filter(function (r) { return inR(r.key, a, b); });
    var cc = t.filter(function (r) { return r.corridas != null; });
    var corridas = sum_(cc, 'corridas');
    var bateu = cc.filter(function (r) { return r.corridas >= (r.meta || meta); }).length;
    var km = sum_(t, 'kmRodCalc');
    var comb = sum_(f, 'valor'), man = sum_(m, 'total'), sal = salarios_(drivers, a, b, c.tz), receita = sum_(rc, 'valor');
    var custos = comb + man + sal;
    var fl = f.filter(function (r) { return r.litros > 0; });
    var litros = sum_(fl, 'litros');
    var cons = consumoFrota_(fuel, turnos, a, b);
    return {
      turnos: t.length, km: km, corridas: corridas, turnosComCorridas: cc.length, turnosSemCorridas: t.length - cc.length,
      pctMeta: cc.length ? Math.round(100 * bateu / cc.length) : null,
      mediaCorridas: cc.length ? round_(corridas / cc.length, 1) : null,
      receita: round_(receita, 2), combustivel: round_(comb, 2), manutencao: round_(man, 2), salarios: round_(sal, 2),
      custos: round_(custos, 2), resultado: round_(receita - custos, 2),
      margem: receita > 0 ? Math.round(100 * (receita - custos) / receita) : null,
      custoCorrida: corridas > 0 ? round_(custos / corridas, 2) : null,
      receitaCorrida: corridas > 0 && receita > 0 ? round_(receita / corridas, 2) : null,
      custoKm: km > 0 ? round_((comb + man) / km, 3) : null,
      litros: round_(litros, 2), precoLitro: litros > 0 ? round_(sum_(fl, 'valor') / litros, 2) : null,
      consumo: cons
    };
  }

  var cur = totals(P.start, P.end), prev = totals(P.prevStart, P.prevEnd), hoje = totals(c.today, c.today);

  // Série diária (para "hoje", mostra os últimos 7 dias)
  var sStart = P.key === 'hoje' ? addDaysKey_(c.today, -6) : P.start;
  var serie = [];
  for (var k = sStart; k <= P.end; k = addDaysKey_(k, 1)) {
    var dayT = turnos.filter(function (r) { return r.key === k; });
    var custoDia = sum_(fuel.filter(function (r) { return r.key === k; }), 'valor') +
      sum_(manut.filter(function (r) { return r.key === k; }), 'total') + salarios_(drivers, k, k, c.tz);
    serie.push({
      key: k, receita: round_(sum_(rec.filter(function (r) { return r.key === k; }), 'valor'), 2), custo: round_(custoDia, 2),
      corridas: sum_(dayT, 'corridas'), km: sum_(dayT, 'kmRodCalc'), turnos: dayT.length
    });
  }

  // Motos
  var lastKm = lastKmByMoto_(turnos, fuel, manut);
  var open = openShifts_(turnos, c.today);
  var k14 = addDaysKey_(c.today, -13);
  var motos = c.frota.map(function (f) {
    var mt = turnos.filter(function (r) { return r.moto === f.id && inR(r.key, P.start, P.end); });
    var kmP = sum_(mt, 'kmRodCalc');
    var comb = sum_(fuel.filter(function (r) { return r.moto === f.id && inR(r.key, P.start, P.end); }), 'valor');
    var man = sum_(manut.filter(function (r) { return r.moto === f.id && inR(r.key, P.start, P.end); }), 'total');
    var km = lastKm[f.id] == null ? null : lastKm[f.id];
    var faltam = km == null || f.proxRevKm == null ? null : f.proxRevKm - km;
    var kmDia = sum_(turnos.filter(function (r) { return r.moto === f.id && inR(r.key, k14, c.today); }), 'kmRodCalc') / 14;
    var diasPrev = faltam != null && faltam > 0 && kmDia > 0 ? Math.ceil(faltam / kmDia) : null;
    var diasRevData = f.proxRevData ? daysBetween_(c.today, f.proxRevData) : null;
    var alerta = 'OK';
    if (km == null) alerta = 'SEM DADOS';
    else if ((faltam != null && faltam <= 0) || (diasRevData != null && diasRevData < 0)) alerta = 'VENCIDA';
    else if ((faltam != null && faltam < ALERTA_KM) || (diasRevData != null && diasRevData <= ALERTA_DIAS) ||
      (diasPrev != null && diasPrev <= 10)) alerta = 'PRÓXIMA';
    var ab = open.filter(function (o) { return o.moto === f.id; })[0];
    var cons = consumoMoto_(fuel, turnos, f.id, P.start, P.end);
    var consPrev = consumoMoto_(fuel, turnos, f.id, P.prevStart, P.prevEnd);
    return {
      id: f.id, modelo: f.modelo, kmAtual: km, proxRevKm: f.proxRevKm, faltam: faltam, alerta: alerta,
      proxRevData: f.proxRevData, diasRevData: diasRevData, kmDia: round_(kmDia, 0),
      diasPrevisao: diasPrev, previsao: diasPrev != null ? addDaysKey_(c.today, diasPrev) : null,
      km: kmP, corridas: sum_(mt, 'corridas'), turnos: mt.length, combustivel: round_(comb, 2), manutencao: round_(man, 2),
      custoKm: kmP > 0 ? round_((comb + man) / kmP, 3) : null, consumo: cons, consumoAnterior: consPrev,
      rodando: ab ? { entregador: ab.entregador, turno: ab.turno, desde: ab.dataFmt } : null
    };
  });
  var comCusto = motos.filter(function (m) { return m.custoKm != null; });
  var frotaMedia = {
    custoKm: comCusto.length ? round_(sum_(comCusto, 'custoKm') / comCusto.length, 3) : null,
    consumo: cur.consumo
  };

  // Entregadores
  var perf = perfByDriver_(c, drivers, P.start, P.end, escala);
  var ranking = drivers.filter(function (d) { return perf[d.id] && (perf[d.id].turnos || perf[d.id].escalados); })
    .map(function (d) { var p = perf[d.id]; p.id = d.id; p.nome = d.nome; return p; })
    .sort(function (a, b) { return b.corridas - a.corridas || b.turnos - a.turnos; });

  // Escala de hoje
  var escalaHoje = (escala[c.today] || []).map(function (n) {
    var d = matchDriver_(n, drivers);
    var nome = d ? d.nome : titleCase_(n);
    var emTurno = turnos.some(function (r) { return r.key === c.today && sameName_(r.entregador, nome); });
    return { nome: nome, emTurno: emTurno };
  });

  var alertas = buildAlerts_(c, motos, drivers, docs, turnos, rec, P, cur);
  var insights = buildInsights_(c, P, cur, prev, motos, frotaMedia, ranking, drivers);

  return {
    period: P.key, label: P.label, start: P.start, end: P.end, prevStart: P.prevStart, prevEnd: P.prevEnd,
    today: c.today, config: c.config, cur: cur, prev: prev, hoje: hoje, serie: serie, motos: motos,
    frotaMedia: frotaMedia, ranking: ranking, escalaHoje: escalaHoje, alertas: alertas, insights: insights,
    pendencias: pendencias_(c).slice(0, 40), totalPendencias: pendencias_(c).length,
    sheetUrl: c.ss.getUrl(), regGid: c.reg.sheet.getSheetId()
  };
}

/* ============================== PAINEL: REGRAS ============================== */

function periodo_(key, today) {
  var p = today.split('-'), y = +p[0], m = +p[1], d = +p[2];
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var ymd = function (yy, mm, dd) { return yy + '-' + pad(mm) + '-' + pad(dd); };
  var lastDay = function (yy, mm) { return new Date(Date.UTC(yy, mm, 0)).getUTCDate(); };
  var start, end = today, label, prevStart, prevEnd;
  if (key === 'hoje') { start = today; label = 'Hoje'; }
  else if (key === '30') { start = addDaysKey_(today, -29); label = 'Últimos 30 dias'; }
  else if (key === 'mes') {
    start = ymd(y, m, 1); label = 'Este mês';
    var pm = m === 1 ? 12 : m - 1, py = m === 1 ? y - 1 : y;
    prevStart = ymd(py, pm, 1); prevEnd = ymd(py, pm, Math.min(d, lastDay(py, pm)));
  } else if (key === 'mesant') {
    var am = m === 1 ? 12 : m - 1, ay = m === 1 ? y - 1 : y;
    start = ymd(ay, am, 1); end = ymd(ay, am, lastDay(ay, am)); label = 'Mês passado';
    var bm = am === 1 ? 12 : am - 1, by = am === 1 ? ay - 1 : ay;
    prevStart = ymd(by, bm, 1); prevEnd = ymd(by, bm, lastDay(by, bm));
  } else { key = '7'; start = addDaysKey_(today, -6); label = 'Últimos 7 dias'; }
  if (!prevStart) {
    var n = daysBetween_(start, end) + 1;
    prevEnd = addDaysKey_(start, -1); prevStart = addDaysKey_(start, -n);
  }
  return { key: key, label: label, start: start, end: end, prevStart: prevStart, prevEnd: prevEnd };
}

function buildAlerts_(c, motos, drivers, docs, turnos, rec, P, cur) {
  var out = [];
  motos.forEach(function (m) {
    if (m.alerta === 'VENCIDA') {
      out.push({ nivel: 'crit', icone: 'wrench', titulo: 'Revisão vencida — ' + m.id,
        texto: m.faltam != null && m.faltam <= 0 ? 'Passou ' + fmtInt_(-m.faltam) + ' km da revisão (' + fmtInt_(m.proxRevKm) + ' km).' : 'Passou da data da revisão.',
        acao: { view: 'manutencao', moto: m.id, tipo: 'Revisão' } });
    } else if (m.alerta === 'PRÓXIMA') {
      out.push({ nivel: 'warn', icone: 'wrench', titulo: 'Revisão próxima — ' + m.id,
        texto: 'Faltam ' + fmtInt_(m.faltam) + ' km' + (m.previsao ? ' (previsão ' + fmtKey_(m.previsao) + ')' : '') + '.',
        acao: { view: 'manutencao', moto: m.id, tipo: 'Revisão' } });
    }
    if (m.consumo && m.consumoAnterior && m.consumo < m.consumoAnterior * 0.85) {
      out.push({ nivel: 'warn', icone: 'fuel', titulo: 'Consumo piorou — ' + m.id,
        texto: 'Caiu de ' + fmtNum_(m.consumoAnterior, 1) + ' para ' + fmtNum_(m.consumo, 1) + ' km/l. Vale checar a moto e os abastecimentos.' });
    }
  });
  var ativos = drivers.filter(ativo_);
  ativos.forEach(function (d) {
    if (!d.cnhKey) return;
    var dias = daysBetween_(c.today, d.cnhKey);
    if (dias < 0) out.push({ nivel: 'crit', icone: 'id', titulo: 'CNH vencida — ' + d.nome, texto: 'Venceu em ' + fmtKey_(d.cnhKey) + '.', acao: { view: 'entregador', id: d.id } });
    else if (dias <= ALERTA_CNH_DIAS) out.push({ nivel: 'warn', icone: 'id', titulo: 'CNH vence em ' + dias + ' dias — ' + d.nome, texto: 'Validade ' + fmtKey_(d.cnhKey) + '.', acao: { view: 'entregador', id: d.id } });
  });
  var semDocs = ativos.filter(function (d) { return docStatus_(d, docs, c.today).faltando > 0; });
  if (semDocs.length) out.push({ nivel: 'warn', icone: 'doc', titulo: semDocs.length + ' entregador(es) com documentos faltando',
    texto: semDocs.slice(0, 3).map(function (d) { return d.nome.split(' ')[0]; }).join(', ') + (semDocs.length > 3 ? '…' : ''), acao: { view: 'equipe' } });
  var velhos = turnos.filter(function (r) { return r.kmIni != null && r.kmFim == null && r.key && r.key < c.today; });
  if (velhos.length) out.push({ nivel: 'warn', icone: 'clock', titulo: velhos.length + ' turno(s) sem retorno de dias anteriores',
    texto: 'Registre o retorno ou corrija na planilha.', acao: { view: 'turnos', modo: 'retorno' } });
  var ult7 = addDaysKey_(c.today, -7), ontem = addDaysKey_(c.today, -1);
  var diasSemReceita = {};
  turnos.forEach(function (r) { if (r.key >= ult7 && r.key <= ontem) diasSemReceita[r.key] = true; });
  rec.forEach(function (r) { delete diasSemReceita[r.key]; });
  var nSem = Object.keys(diasSemReceita).length;
  if (nSem) out.push({ nivel: 'info', icone: 'money', titulo: nSem + ' dia(s) trabalhados sem receita lançada',
    texto: 'Últimos 7 dias. Sem receita o lucro fica incompleto.', acao: { view: 'receita' } });
  if (cur.turnosSemCorridas > 0) out.push({ nivel: 'info', icone: 'list', titulo: cur.turnosSemCorridas + ' turno(s) sem corridas lançadas',
    texto: 'No período. As metas e o custo por corrida ficam incompletos.' });
  if (ativos.length && !ativos.some(function (d) { return toNumber_(d.salario) > 0; })) {
    out.push({ nivel: 'info', icone: 'users', titulo: 'Salários não informados', texto: 'Cadastre o salário dos entregadores para o painel calcular o lucro.', acao: { view: 'equipe' } });
  }
  var ordem = { crit: 0, warn: 1, info: 2 };
  return out.sort(function (a, b) { return ordem[a.nivel] - ordem[b.nivel]; });
}

function buildInsights_(c, P, cur, prev, motos, frotaMedia, ranking, drivers) {
  var out = [];
  var pct = function (a, b) { return b ? Math.round(100 * (a - b) / Math.abs(b)) : null; };
  if (cur.receita > 0) {
    out.push({ tipo: cur.resultado >= 0 ? 'good' : 'bad', texto: (cur.resultado >= 0 ? 'Lucro de ' : 'Prejuízo de ') +
      fmtMoney_(Math.abs(cur.resultado)) + ' no período' + (cur.margem != null ? ' (margem de ' + cur.margem + '%)' : '') +
      '. Receita ' + fmtMoney_(cur.receita) + ' − custos ' + fmtMoney_(cur.custos) + '.' });
  } else {
    out.push({ tipo: 'info', texto: 'Custos do período: ' + fmtMoney_(cur.custos) + ' (combustível ' + fmtMoney_(cur.combustivel) +
      ', manutenção ' + fmtMoney_(cur.manutencao) + ', salários ' + fmtMoney_(cur.salarios) + '). Lance a receita do dia para ver o lucro.' });
  }
  if (cur.corridas || prev.corridas) {
    var dc = pct(cur.corridas, prev.corridas);
    out.push({ tipo: dc == null ? 'info' : dc >= 0 ? 'good' : 'bad', texto: fmtInt_(cur.corridas) + ' corridas' +
      (dc == null ? '' : ' — ' + (dc >= 0 ? '+' : '') + dc + '% em relação ao período anterior (' + fmtInt_(prev.corridas) + ')') + '.' });
  }
  if (cur.custoCorrida != null) {
    var dcc = prev.custoCorrida ? pct(cur.custoCorrida, prev.custoCorrida) : null;
    out.push({ tipo: dcc == null ? 'info' : dcc <= 0 ? 'good' : 'bad', texto: 'Cada corrida custou ' + fmtMoney_(cur.custoCorrida) +
      (cur.receitaCorrida ? ' e rendeu ' + fmtMoney_(cur.receitaCorrida) : '') + (dcc == null ? '' : ' (' + (dcc > 0 ? '+' : '') + dcc + '% no custo)') + '.' });
  }
  var cm = motos.filter(function (m) { return m.custoKm != null && m.km > 50; }).sort(function (a, b) { return b.custoKm - a.custoKm; });
  if (cm.length >= 2 && frotaMedia.custoKm) {
    var acima = pct(cm[0].custoKm, frotaMedia.custoKm);
    if (acima >= 15) out.push({ tipo: 'bad', texto: 'A ' + cm[0].id + ' é a moto mais cara: ' + fmtMoney_(cm[0].custoKm) + '/km, ' + acima + '% acima da média da frota.' });
  }
  var comMeta = ranking.filter(function (r) { return r.pctMeta != null && r.turnosComCorridas >= 3; });
  if (comMeta.length) {
    var best = comMeta.slice().sort(function (a, b) { return b.pctMeta - a.pctMeta; })[0];
    out.push({ tipo: 'good', texto: 'Destaque: ' + best.nome.split(' ').slice(0, 2).join(' ') + ' bateu a meta em ' + best.pctMeta + '% dos turnos (' + fmtNum_(best.media, 1) + ' corridas/turno).' });
    var worst = comMeta.slice().sort(function (a, b) { return a.pctMeta - b.pctMeta; })[0];
    if (worst.id !== best.id && worst.pctMeta < 50) out.push({ tipo: 'bad', texto: 'Atenção: ' + worst.nome.split(' ').slice(0, 2).join(' ') + ' bateu a meta em só ' + worst.pctMeta + '% dos turnos.' });
  }
  var faltas = ranking.filter(function (r) { return r.faltas > 0; }).sort(function (a, b) { return b.faltas - a.faltas; });
  if (faltas.length) out.push({ tipo: 'bad', texto: faltas[0].nome.split(' ').slice(0, 2).join(' ') + ' tem ' + faltas[0].faltas + ' falta(s) na escala no período.' });
  var prox = motos.filter(function (m) { return m.diasPrevisao != null; }).sort(function (a, b) { return a.diasPrevisao - b.diasPrevisao; })[0];
  if (prox) out.push({ tipo: prox.diasPrevisao <= 10 ? 'bad' : 'info', texto: 'No ritmo atual (' + fmtInt_(prox.kmDia) + ' km/dia), a ' + prox.id + ' chega à revisão em ~' + prox.diasPrevisao + ' dias (' + fmtKey_(prox.previsao) + ').' });
  if (P.key === 'mes') {
    var d = +c.today.slice(8, 10), y = +c.today.slice(0, 4), m = +c.today.slice(5, 7);
    var diasMes = new Date(Date.UTC(y, m, 0)).getUTCDate();
    if (d >= 3) out.push({ tipo: 'info', texto: 'Projeção do mês: combustível ~' + fmtMoney_(cur.combustivel / d * diasMes) +
      (cur.receita > 0 ? ', receita ~' + fmtMoney_(cur.receita / d * diasMes) : '') + ', ' + fmtInt_(cur.km / d * diasMes) + ' km.' });
  }
  return out.slice(0, 7);
}

function perfByDriver_(c, drivers, a, b, escala) {
  var meta = c.config.meta, out = {};
  drivers.forEach(function (d) { out[d.id] = { turnos: 0, corridas: 0, turnosComCorridas: 0, bateu: 0, km: 0, dias: {}, escalados: 0, faltas: 0 }; });
  c.reg.rows.forEach(function (r) {
    if (!r.key || r.key < a || r.key > b) return;
    var d = matchDriver_(r.entregador, drivers);
    if (!d) return;
    var p = out[d.id];
    p.turnos++; p.km += r.kmRodCalc || 0; p.dias[r.key] = true;
    if (r.corridas != null) { p.corridas += r.corridas; p.turnosComCorridas++; if (r.corridas >= (r.meta || meta)) p.bateu++; }
  });
  if (escala) {
    Object.keys(escala).forEach(function (k) {
      if (k < a || k > b || k > c.today) return;
      escala[k].forEach(function (n) {
        var d = matchDriver_(n, drivers);
        if (!d) return;
        out[d.id].escalados++;
        if (k < c.today && !out[d.id].dias[k]) out[d.id].faltas++;
      });
    });
  }
  Object.keys(out).forEach(function (id) {
    var p = out[id];
    p.media = p.turnosComCorridas ? round_(p.corridas / p.turnosComCorridas, 1) : null;
    p.pctMeta = p.turnosComCorridas ? Math.round(100 * p.bateu / p.turnosComCorridas) : null;
    delete p.dias;
  });
  return out;
}

function salarios_(drivers, a, b, tz) {
  var total = 0;
  var ativos = drivers.filter(function (d) { return toNumber_(d.salario) > 0; });
  if (!ativos.length) return 0;
  for (var k = a; k <= b; k = addDaysKey_(k, 1)) {
    var y = +k.slice(0, 4), m = +k.slice(5, 7);
    var diasMes = new Date(Date.UTC(y, m, 0)).getUTCDate();
    ativos.forEach(function (d) {
      var adm = parseDate_(d.admissao), des = parseDate_(d.desligamento);
      if (adm && dateKey_(adm, tz) > k) return;
      if (des && dateKey_(des, tz) < k) return;
      if (!des && norm_(d.status) === 'inativo') return;
      total += toNumber_(d.salario) / diasMes;
    });
  }
  return total;
}

function docStatus_(d, docs, today) {
  var meus = docs.filter(function (x) { return x.entId === d.id; });
  var ok = {};
  DOC_TIPOS.forEach(function (t) { ok[t] = meus.some(function (x) { return x.tipo === t; }); });
  var faltando = DOC_TIPOS.filter(function (t) { return !ok[t]; }).length;
  return { ok: ok, faltando: faltando };
}

function pendencias_(c) {
  if (c._pend) return c._pend;
  var start60 = addDaysKey_(c.today, -59), pend = [];
  c.reg.rows.forEach(function (r) {
    if (!r.key || r.key < start60) return;
    var pr = [];
    if (!cleanName_(r.entregador)) pr.push('sem entregador');
    if (!r.turno) pr.push('sem turno');
    if (r.kmFim == null && r.key < addDaysKey_(c.today, -1)) pr.push('turno não fechado');
    if (r.kmFim != null && r.corridas == null) pr.push('sem corridas');
    if (r.kmFim != null && r.kmIni != null && r.kmFim < r.kmIni) pr.push('KM fim menor que início');
    if (r.kmRodCalc != null && r.kmRodCalc > KM_TURNO_SUSPEITO) pr.push('KM rodado alto (' + r.kmRodCalc + ')');
    if (pr.length) pend.push({ row: r.row, dataFmt: r.dataFmt, moto: r.moto, entregador: r.entregador || '', problemas: pr });
  });
  c._pend = pend.reverse();
  return c._pend;
}

/* ============================== COMBUSTÍVEL / CONSUMO ============================== */

/** Abastecimentos da aba nova + os que estavam lançados nos turnos antigos. */
function fuelRows_(c) {
  var t = table_(c.ss, 'ABAST');
  var novos = rows_(t).map(function (r) {
    var d = parseDate_(r.data);
    return {
      origem: 'abast', row: r._row, key: d ? dateKey_(d, c.tz) : '', dataFmt: d ? fmtDate_(d, c.tz) : '', hora: String(r.hora || ''),
      moto: String(r.moto || '').trim(), km: toNumber_(r.km), litros: toNumber_(r.litros), valor: toNumber_(r.valor) || 0,
      preco: toNumber_(r.preco), posto: String(r.posto || '').trim(), cheio: norm_(r.cheio) !== 'nao',
      entregador: String(r.entregador || ''), fotoCupom: r.fotoCupom, fotoPainel: r.fotoPainel
    };
  }).filter(function (r) { return r.moto && r.key; });
  var antigos = c.reg.rows.filter(function (r) { return r.litros > 0 || r.valor > 0; }).map(function (r) {
    return { origem: 'turno', row: -r.row, key: r.key, dataFmt: r.dataFmt, moto: r.moto, km: r.kmFim, litros: r.litros,
      valor: r.valor || 0, kmRod: r.kmRodCalc, cheio: false };
  });
  return antigos.concat(novos).sort(function (a, b) { return a.key < b.key ? -1 : a.key > b.key ? 1 : 0; });
}

/** Método do tanque cheio: km entre dois "tanque cheio" ÷ litros colocados nesse intervalo. */
function tanqueCheio_(fuel, moto) {
  var list = fuel.filter(function (f) { return f.origem === 'abast' && f.moto === moto && f.km != null && f.litros > 0; })
    .sort(function (a, b) { return a.km - b.km; });
  var res = [], last = null, acum = 0;
  list.forEach(function (f) {
    if (last) acum += f.litros;
    if (f.cheio) {
      if (last && acum > 0 && f.km > last.km) res.push({ row: f.row, key: f.key, km: f.km - last.km, litros: acum, kml: round_((f.km - last.km) / acum, 1) });
      last = f; acum = 0;
    }
  });
  return res;
}

function consumoPorAbastecimento_(fuel) {
  var out = {};
  distinct_(fuel, 'moto').forEach(function (m) { tanqueCheio_(fuel, m).forEach(function (r) { out[r.row] = { kml: r.kml, km: r.km }; }); });
  return out;
}

function consumoMoto_(fuel, turnos, moto, a, b) {
  var tc = tanqueCheio_(fuel, moto).filter(function (r) { return r.key >= a && r.key <= b; });
  if (tc.length) return round_(sum_(tc, 'km') / sum_(tc, 'litros'), 1);
  var old = fuel.filter(function (f) { return f.origem === 'turno' && f.moto === moto && f.key >= a && f.key <= b && f.litros > 0 && f.kmRod != null; });
  var l = sum_(old, 'litros');
  return l > 0 ? round_(sum_(old, 'kmRod') / l, 1) : null;
}

function consumoFrota_(fuel, turnos, a, b) {
  var km = 0, l = 0;
  distinct_(fuel, 'moto').forEach(function (m) {
    var tc = tanqueCheio_(fuel, m).filter(function (r) { return r.key >= a && r.key <= b; });
    if (tc.length) { km += sum_(tc, 'km'); l += sum_(tc, 'litros'); return; }
    var old = fuel.filter(function (f) { return f.origem === 'turno' && f.moto === m && f.key >= a && f.key <= b && f.litros > 0 && f.kmRod != null; });
    km += sum_(old, 'kmRod'); l += sum_(old, 'litros');
  });
  return l > 0 ? round_(km / l, 1) : null;
}

function manutEntry_(c) {
  return function (r) {
    var d = parseDate_(r.data);
    return { row: r._row, key: d ? dateKey_(d, c.tz) : '', dataFmt: d ? fmtDate_(d, c.tz) : '', moto: String(r.moto || '').trim(),
      km: toNumber_(r.km), tipo: String(r.tipo || ''), descricao: String(r.descricao || ''), total: toNumber_(r.total) || 0,
      oficina: String(r.oficina || ''), foto: r.foto };
  };
}

function recEntry_(c) {
  return function (r) {
    var d = parseDate_(r.data);
    return { row: r._row, key: d ? dateKey_(d, c.tz) : '', dataFmt: d ? fmtDate_(d, c.tz) : '', valor: toNumber_(r.valor) || 0,
      descricao: String(r.descricao || ''), por: String(r.por || '') };
  };
}

function lastKmByMoto_(turnos, fuel, manut) {
  var out = {};
  var put = function (m, v) { if (v == null || !m) return; if (out[m] == null || v > out[m]) out[m] = v; };
  turnos.forEach(function (r) { put(r.moto, r.kmIni); put(r.moto, r.kmFim); });
  (fuel || []).forEach(function (f) { put(f.moto, f.km); });
  (manut || []).forEach(function (m) { put(m.moto, m.km); });
  return out;
}

/* ============================== ENTREGADORES (interno) ============================== */

/** Lista de entregadores da aba ENTREGADORES. Na primeira vez, importa os nomes já usados na planilha. */
function drivers_(c) {
  if (c._drivers) return c._drivers;
  var t = table_(c.ss, 'ENT');
  var rows = rows_(t);
  if (!rows.length) {
    var nomes = nomesConhecidos_(c);
    if (nomes.length) {
      var matrix = nomes.map(function (n, i) {
        var o = { id: 'E' + pad3_(i + 1), nome: n.nome, camisa: n.camisa || '', status: 'Ativo', atualizadoEm: new Date(), atualizadoPor: 'importação automática' };
        var linha = [];
        for (var j = 0; j < t.lastCol; j++) linha.push('');
        Object.keys(o).forEach(function (k) { if (t.idx[k] != null) linha[t.idx[k]] = o[k]; });
        return linha;
      });
      t.sheet.getRange(2, 1, matrix.length, t.lastCol).setValues(matrix);
      rows = rows_(t);
    }
  }
  c._drivers = rows.map(function (r) {
    var cnh = parseDate_(r.cnhValidade);
    r.cnhKey = cnh ? dateKey_(cnh, c.tz) : '';
    r.nome = String(r.nome || '').trim();
    r.id = String(r.id || '').trim();
    return r;
  }).filter(function (r) { return r.nome && r.id; });
  return c._drivers;
}

function nomesConhecidos_(c) {
  var lista = [];
  c.reg.rows.forEach(function (r) { lista.push({ nome: r.entregador }); });
  c.frota.forEach(function (f) { lista.push({ nome: f.entregador }); });
  var cam = c.ss.getSheetByName(SHEET.CAMISAS);
  if (cam && cam.getLastRow() > 1) {
    cam.getRange(2, 1, cam.getLastRow() - 1, 2).getValues().forEach(function (r) { lista.push({ nome: r[0], camisa: String(r[1] || '').trim() }); });
  }
  var out = [];
  lista.forEach(function (x) {
    var nome = cleanName_(x.nome);
    if (!nome) return;
    var ja = out.filter(function (o) { return sameName_(o.nome, nome); })[0];
    if (ja) {
      if (nome.length > ja.nome.length) ja.nome = nome;
      if (x.camisa && !ja.camisa) ja.camisa = x.camisa;
    } else out.push({ nome: nome, camisa: x.camisa || '' });
  });
  return out.sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); });
}

function nextDriverId_(rows) {
  var max = 0;
  rows.forEach(function (r) { var n = +(String(r.id || '').replace(/\D/g, '')); if (n > max) max = n; });
  return 'E' + pad3_(max + 1);
}

function ativo_(d) { return norm_(d.status || 'ativo') !== 'inativo'; }

/** Mesmo nome se todas as palavras do nome menor aparecem no maior ("MAILSON" = "Rafael Mailson"). */
function sameName_(a, b) {
  var ta = norm_(a).split(' ').filter(Boolean), tb = norm_(b).split(' ').filter(Boolean);
  if (!ta.length || !tb.length) return false;
  var menor = ta.length <= tb.length ? ta : tb, maior = menor === ta ? tb : ta;
  return menor.every(function (w) { return maior.indexOf(w) >= 0; });
}

function matchDriver_(nome, drivers) {
  if (!cleanName_(nome)) return null;
  var exato = drivers.filter(function (d) { return norm_(d.nome) === norm_(nome); })[0];
  if (exato) return exato;
  var parecidos = drivers.filter(function (d) { return sameName_(d.nome, nome); });
  return parecidos.length === 1 ? parecidos[0] : null;
}

function driverFolder_(c, t, d) {
  var m = String(d.pasta || '').match(/folders\/([\w-]+)/);
  if (m) { try { return DriveApp.getFolderById(m[1]); } catch (e) { /* recria */ } }
  var base = subFolder_(rootFolder_(c.ss), 'Documentos dos entregadores');
  var f = subFolder_(base, d.nome + ' (' + d.id + ')');
  writeObj_(t, d._row, { pasta: f.getUrl() });
  return f;
}

/* ============================== ESCALA ============================== */

/** Lê a aba ESCALA (blocos "ESCALA MÊS DE SETEMBRO 2026") → { 'aaaa-mm-dd': [nomes com TR] }. */
function readEscala_(ss, today) {
  var sh = ss.getSheetByName(SHEET.ESCALA);
  var out = {};
  if (!sh || sh.getLastRow() < 2) return out;
  var v = sh.getDataRange().getValues();
  var anoAtual = +today.slice(0, 4), cur = null, dias = null;
  v.forEach(function (row) {
    var a = norm_(row[0]);
    var m = a.match(/escala\s+(?:do\s+)?mes\s+de\s+([a-z]+)\s*(\d{4})?/);
    if (m && MESES[m[1]]) { cur = { mes: MESES[m[1]], ano: m[2] ? +m[2] : anoAtual }; dias = null; return; }
    if (!cur) return;
    if (a.indexOf('dias do mes') === 0) { dias = row.map(function (x, i) { return i ? toNumber_(x) : null; }); return; }
    if (!a || a.indexOf('dia da semana') === 0 || !dias) return;
    row.forEach(function (x, i) {
      if (!i || !dias[i] || norm_(x) !== 'tr') return;
      var k = cur.ano + '-' + (cur.mes < 10 ? '0' : '') + cur.mes + '-' + (dias[i] < 10 ? '0' : '') + dias[i];
      (out[k] = out[k] || []).push(String(row[0]).trim());
    });
  });
  return out;
}

/* ============================== VALIDAÇÃO / CÁLCULOS DE TURNO ============================== */

function validateBase_(p) {
  p = p || {};
  var data = parseDate_(p.data);
  if (!data) throw new Error('Data inválida.');
  var moto = String(p.moto || '').trim();
  if (!moto) throw new Error('Escolha a moto.');
  var entregador = String(p.entregador || '').trim();
  if (!cleanName_(entregador)) throw new Error('Informe o entregador.');
  var turno = String(p.turno || '').trim();
  if (!turno) throw new Error('Informe o turno.');
  var kmIni = toNumber_(p.kmIni);
  if (kmIni != null && kmIni < 0) throw new Error('KM de início inválido.');
  return { data: data, moto: moto, entregador: entregador, turno: turno, kmIni: kmIni, recebido: String(p.recebido || '').trim() };
}

function validateFechamento_(p, kmIni) {
  var kmFim = toNumber_(p.kmFim);
  if (kmFim == null) throw new Error('Informe o KM final.');
  if (kmIni != null && kmFim < kmIni) throw new Error('KM final (' + kmFim + ') menor que o KM de início (' + kmIni + ').');
  var corridas = toNumber_(p.corridas);
  if (corridas == null) throw new Error('Informe as corridas realizadas (0 se nenhuma).');
  if (corridas < 0 || Math.floor(corridas) !== corridas) throw new Error('Corridas deve ser um número inteiro.');
  return {
    kmFim: kmFim, corridas: corridas, devolvido: String(p.devolvido || '').trim(),
    status: String(p.status || '').trim(), ocorrencia: String(p.ocorrencia || '').trim() || 'TUDO OK'
  };
}

function closingValues_(kmIni, f, config) {
  return {
    kmFim: f.kmFim, kmRod: kmIni != null ? f.kmFim - kmIni : null, corridas: f.corridas, meta: config.meta,
    atingiu: f.corridas >= config.meta ? 'Sim' : 'Não', devolvido: f.devolvido,
    status: f.status || STATUS_ABERTO, ocorrencia: f.ocorrencia
  };
}

function checklistTxt_(ch) {
  if (!ch) return '';
  var problemas = Object.keys(ch).filter(function (k) { return ch[k] === false; });
  return problemas.length ? 'Problema: ' + problemas.join(', ') : 'OK';
}

/* ============================== LEITURA: ABAS EXISTENTES ============================== */

function ss_() {
  var id = PropertiesService.getScriptProperties().getProperty(PROP_SS);
  var ss;
  try {
    ss = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {
    throw new Error('SEM_ACESSO: sua conta não tem acesso à planilha do sistema. Peça ao administrador para compartilhar com você.');
  }
  if (!ss) throw new Error('O sistema ainda não foi configurado. Rode a função "configurar" no editor do Apps Script.');
  return ss;
}

function ctx_() {
  var ss = ss_();
  var tz = ss.getSpreadsheetTimeZone();
  var config = readConfig_(ss);
  return { ss: ss, tz: tz, today: dateKey_(new Date(), tz), config: config, frota: readFrota_(ss, config), reg: readRegistro_(ss) };
}

function readRegistro_(ss) {
  var sheet = ss.getSheetByName(SHEET.REG);
  if (!sheet) throw new Error('Aba "' + SHEET.REG + '" não encontrada na planilha.');
  var tz = ss.getSpreadsheetTimeZone();
  var lastCol = sheet.getLastColumn();
  var lastRow = sheet.getLastRow();
  var header = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var idx = headerIndex_(header, COL);
  if (idx.data == null) idx.data = 0; // cabeçalho da data é "."
  ['moto', 'kmIni', 'kmFim'].forEach(function (k) {
    if (idx[k] == null) throw new Error('Coluna "' + COL[k] + '" não encontrada na aba ' + SHEET.REG + '.');
  });
  var values = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, lastCol).getValues() : [];
  var links = {};
  REG_LINKS.forEach(function (k) {
    if (idx[k] == null || lastRow < 2) return;
    links[k] = sheet.getRange(2, idx[k] + 1, lastRow - 1, 1).getRichTextValues().map(function (r, i) {
      var url = r[0] && r[0].getLinkUrl();
      var raw = String(values[i][idx[k]] || '');
      return url || (/^https?:\/\//.test(raw) ? raw : '');
    });
  });
  var rows = [], lastUsed = 1;
  values.forEach(function (v, i) {
    var get = function (k) { return idx[k] == null ? '' : v[idx[k]]; };
    var moto = String(get('moto') || '').trim();
    var entregador = String(get('entregador') || '').trim();
    var kmIni = toNumber_(get('kmIni')), kmFim = toNumber_(get('kmFim'));
    if (moto || entregador || kmIni != null || kmFim != null) lastUsed = i + 2;
    if (!moto || norm_(moto) === 'folga' || norm_(get('turno')) === 'folga') return; // FOLGA não é turno
    var date = parseDate_(get('data'));
    rows.push({
      row: i + 2, key: date ? dateKey_(date, tz) : '', dataFmt: date ? fmtDate_(date, tz) : '',
      moto: moto, entregador: entregador, turno: String(get('turno') || '').trim(),
      kmIni: kmIni, kmFim: kmFim, kmRodCalc: kmIni != null && kmFim != null && kmFim >= kmIni ? kmFim - kmIni : null,
      litros: toNumber_(get('litros')), valor: toNumber_(get('valor')), corridas: toNumber_(get('corridas')),
      meta: toNumber_(get('meta')), recebido: String(get('recebido') || '').trim(), devolvido: String(get('devolvido') || '').trim(),
      status: String(get('status') || '').trim(), ocorrencia: String(get('ocorrencia') || '').trim(),
      horaSaida: String(get('horaSaida') || ''), horaRetorno: String(get('horaRetorno') || ''),
      checklist: String(get('checklist') || ''),
      fotoIni: links.fotoIni ? links.fotoIni[i] : '', fotoFim: links.fotoFim ? links.fotoFim[i] : ''
    });
  });
  return { sheet: sheet, idx: idx, lastCol: lastCol, lastUsed: lastUsed, rows: rows };
}

function readConfig_(ss) {
  var config = { meta: 12, revKm: 3000, revMeses: 3 };
  var sh = ss.getSheetByName(SHEET.CONF);
  if (!sh || sh.getLastRow() < 2) return config;
  sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues().forEach(function (r) {
    var nome = norm_(r[0]), val = toNumber_(r[1]);
    if (val == null) return;
    if (nome.indexOf('meta') >= 0) config.meta = val;
    else if (nome.indexOf('revis') >= 0 && nome.indexOf('km') >= 0) config.revKm = val;
    else if (nome.indexOf('revis') >= 0 && nome.indexOf('mes') >= 0) config.revMeses = val;
  });
  return config;
}

var FROTA_COLS = {
  id: 'Moto (ID)', modelo: 'Modelo', placa: 'Placa', entregador: 'Entregador vinculado', inicio: 'Data início de uso',
  kmInicial: 'KM inicial', ultRevKm: 'Última revisão (KM)', ultRevData: 'Última revisão (data)', proxRevKm: 'Próxima revisão (KM)'
};

function readFrota_(ss, config) {
  var sh = ss.getSheetByName(SHEET.FROTA);
  if (!sh || sh.getLastRow() < 2) return [];
  var tz = ss.getSpreadsheetTimeZone();
  var data = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getValues();
  var idx = headerIndex_(data[0], FROTA_COLS);
  return data.slice(1).map(function (v, i) {
    var get = function (k) { return idx[k] == null ? '' : v[idx[k]]; };
    var id = String(get('id') || '').trim();
    if (!id) return null;
    var ultRevKm = toNumber_(get('ultRevKm')), kmInicial = toNumber_(get('kmInicial')), prox = toNumber_(get('proxRevKm'));
    if (prox == null) prox = (ultRevKm != null ? ultRevKm : (kmInicial || 0)) + config.revKm;
    var base = parseDate_(get('ultRevData')) || parseDate_(get('inicio'));
    var proxData = null;
    if (base && config.revMeses) { proxData = new Date(base.getTime()); proxData.setMonth(proxData.getMonth() + config.revMeses); }
    return { row: i + 2, id: id, modelo: String(get('modelo') || '').trim(), entregador: String(get('entregador') || '').trim(),
      proxRevKm: prox, proxRevData: proxData ? dateKey_(proxData, tz) : null };
  }).filter(Boolean);
}

function registrarRevisaoFrota_(c, moto, km, data) {
  var sh = c.ss.getSheetByName(SHEET.FROTA);
  if (!sh) return null;
  var header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var idx = headerIndex_(header, FROTA_COLS);
  var f = c.frota.filter(function (x) { return x.id === moto; })[0];
  if (!f) return null;
  var prox = km + c.config.revKm;
  if (idx.ultRevKm != null) sh.getRange(f.row, idx.ultRevKm + 1).setValue(km);
  if (idx.ultRevData != null) sh.getRange(f.row, idx.ultRevData + 1).setValue(data).setNumberFormat('dd/mm/yyyy');
  if (idx.proxRevKm != null) sh.getRange(f.row, idx.proxRevKm + 1).setValue(prox);
  return prox;
}

function statusOptions_(reg) {
  if (reg.idx.status != null) {
    try {
      var rule = reg.sheet.getRange(2, reg.idx.status + 1).getDataValidation();
      if (rule && rule.getCriteriaType() === SpreadsheetApp.DataValidationCriteria.VALUE_IN_LIST) {
        var list = rule.getCriteriaValues()[0];
        if (list && list.length) return list.map(String);
      }
    } catch (e) { /* sem validação */ }
  }
  var used = byFrequency_(reg.rows, 'status');
  return DEFAULT_STATUS.concat(used.filter(function (s) { return DEFAULT_STATUS.indexOf(s) < 0; }));
}

/** Turnos com KM início e sem KM fim (últimos 7 dias; os mais antigos vão para pendências). */
function openShifts_(rows, today) {
  var min = addDaysKey_(today, -7);
  return rows.filter(function (r) { return r.kmIni != null && r.kmFim == null && r.key && r.key >= min; }).map(publicRow_).reverse();
}

function publicRow_(r) {
  return pick_(r, ['row', 'dataFmt', 'key', 'moto', 'entregador', 'turno', 'kmIni', 'kmFim', 'kmRodCalc', 'corridas', 'recebido',
    'status', 'ocorrencia', 'horaSaida', 'horaRetorno', 'checklist', 'fotoIni', 'fotoFim']);
}

/* ============================== ESCRITA: REGISTRO DIÁRIO ============================== */

function nextRow_(reg) {
  var row = reg.lastUsed + 1;
  if (row > reg.sheet.getMaxRows()) reg.sheet.insertRowsAfter(reg.sheet.getMaxRows(), 50);
  return row;
}

/** Grava na linha mantendo fórmulas existentes. Cria colunas novas (hora, checklist, fotos) quando precisa. */
function writeRow_(reg, rowNumber, values, isNew) {
  var sheet = reg.sheet;
  ensureRegCols_(reg, Object.keys(values).filter(function (k) { return REG_EXTRA.indexOf(k) >= 0 && values[k] !== '' && values[k] != null; }));
  var range = sheet.getRange(rowNumber, 1, 1, reg.lastCol);
  var current = range.getValues()[0];
  var formulas = range.getFormulas()[0];
  var out = current.map(function (v, i) { return formulas[i] || v; });
  var links = [];
  Object.keys(values).forEach(function (k) {
    var c = reg.idx[k];
    if (c == null || NEVER_WRITE.indexOf(k) >= 0) return;
    if (COMPUTED.indexOf(k) >= 0 && formulas[c]) return;
    var v = values[k];
    if (REG_LINKS.indexOf(k) >= 0) { if (v) { links.push([c, v]); out[c] = LINK_TEXT; } return; }
    out[c] = v == null ? '' : v;
  });
  range.setValues([out]);
  links.forEach(function (l) {
    sheet.getRange(rowNumber, l[0] + 1).setRichTextValue(SpreadsheetApp.newRichTextValue().setText(LINK_TEXT).setLinkUrl(l[1]).build());
  });
  if (isNew && reg.idx.data != null) sheet.getRange(rowNumber, reg.idx.data + 1).setNumberFormat('dd/mm/yyyy');
  SpreadsheetApp.flush();
}

function ensureRegCols_(reg, keys) {
  var sheet = reg.sheet;
  var missing = keys.filter(function (k) { return reg.idx[k] == null; });
  if (!missing.length) return;
  var need = reg.lastCol + missing.length;
  if (sheet.getMaxColumns() < need) sheet.insertColumnsAfter(sheet.getMaxColumns(), need - sheet.getMaxColumns());
  missing.forEach(function (k) {
    var col = reg.lastCol + 1;
    var cell = sheet.getRange(1, col);
    sheet.getRange(1, reg.lastCol).copyTo(cell, SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
    cell.setValue(COL[k]);
    reg.idx[k] = col - 1;
    reg.lastCol = col;
  });
}

/* ============================== TABELAS NOVAS (genérico) ============================== */

function colType_(key, field) {
  var c = SCHEMA[key].filter(function (x) { return x[0] === field; })[0];
  return c ? c[2] || 'text' : 'text';
}

/** Garante a aba com os cabeçalhos do SCHEMA (cria a aba ou acrescenta colunas que faltarem). */
function table_(ss, key) {
  var cache = ss_cache_(ss);
  if (cache[key]) return cache[key];
  var name = SHEET[key], schema = SCHEMA[key];
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  var lastCol = sh.getLastColumn();
  var header = lastCol ? sh.getRange(1, 1, 1, lastCol).getValues()[0] : [];
  var pos = {};
  header.forEach(function (h, i) { var k = norm_(h); if (k && pos[k] == null) pos[k] = i; });
  var idx = {}, missing = [];
  schema.forEach(function (c) { var i = pos[norm_(c[1])]; if (i == null) missing.push(c); else idx[c[0]] = i; });
  if (missing.length) {
    var start = header.filter(String).length ? lastCol + 1 : 1;
    if (sh.getMaxColumns() < start + missing.length - 1) sh.insertColumnsAfter(sh.getMaxColumns(), start + missing.length - 1 - sh.getMaxColumns());
    missing.forEach(function (c, j) {
      var col = start + j;
      idx[c[0]] = col - 1;
      sh.getRange(1, col).setValue(c[1]);
      var fmt = { date: 'dd/mm/yyyy', datetime: 'dd/mm/yyyy hh:mm', int: '0', num: '0.00', money: '"R$" #,##0.00' }[c[2]] || '@';
      if (c[2] !== 'link') sh.getRange(2, col, sh.getMaxRows() - 1, 1).setNumberFormat(fmt);
      sh.setColumnWidth(col, c[2] === 'link' ? 90 : c[1].length > 14 ? 150 : 110);
    });
    var hdr = sh.getRange(1, 1, 1, start + missing.length - 1);
    hdr.setFontWeight('bold').setFontColor('#ffffff').setBackground('#fd4502').setVerticalAlignment('middle');
    sh.setFrozenRows(1);
    sh.setRowHeight(1, 30);
  }
  var t = { sheet: sh, idx: idx, schema: schema, key: key, lastCol: Math.max(sh.getLastColumn(), schema.length) };
  cache[key] = t;
  return t;
}

var __cache = {};
function ss_cache_(ss) { var id = ss.getId(); return __cache[id] = __cache[id] || {}; }

function rows_(t) {
  var sh = t.sheet, n = sh.getLastRow() - 1;
  if (n < 1) return [];
  var vals = sh.getRange(2, 1, n, t.lastCol).getValues();
  var links = {};
  t.schema.forEach(function (c) {
    if (c[2] !== 'link') return;
    links[c[0]] = sh.getRange(2, t.idx[c[0]] + 1, n, 1).getRichTextValues().map(function (r) { return (r[0] && r[0].getLinkUrl()) || ''; });
  });
  var out = [];
  vals.forEach(function (v, r) {
    if (!v.some(function (x) { return x !== '' && x != null; })) return;
    var o = { _row: r + 2 };
    t.schema.forEach(function (c) {
      var x = v[t.idx[c[0]]];
      if (c[2] === 'link') x = links[c[0]][r] || (/^https?:/.test(String(x)) ? String(x) : '');
      o[c[0]] = x;
    });
    out.push(o);
  });
  return out;
}

function writeObj_(t, row, obj) {
  var range = t.sheet.getRange(row, 1, 1, t.lastCol);
  var cur = range.getValues()[0], f = range.getFormulas()[0];
  var out = cur.map(function (v, i) { return f[i] || v; });
  var links = [];
  Object.keys(obj).forEach(function (k) {
    var i = t.idx[k];
    if (i == null) return;
    if (colType_(t.key, k) === 'link') { if (obj[k]) { links.push([i, obj[k]]); out[i] = LINK_TEXT; } return; }
    out[i] = obj[k] == null ? '' : obj[k];
  });
  range.setValues([out]);
  links.forEach(function (l) {
    t.sheet.getRange(row, l[0] + 1).setRichTextValue(SpreadsheetApp.newRichTextValue().setText(LINK_TEXT).setLinkUrl(l[1]).build());
  });
  SpreadsheetApp.flush();
}

function append_(t, obj) {
  var row = Math.max(t.sheet.getLastRow(), 1) + 1;
  if (row > t.sheet.getMaxRows()) t.sheet.insertRowsAfter(t.sheet.getMaxRows(), 50);
  writeObj_(t, row, obj);
  return row;
}

/* ============================== ARQUIVOS NO DRIVE ============================== */

function rootFolder_(ss) {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty(PROP_ROOT);
  if (id) { try { var f = DriveApp.getFolderById(id); if (!f.isTrashed()) return f; } catch (e) { /* recria */ } }
  var parent;
  try { var ps = DriveApp.getFileById(ss.getId()).getParents(); parent = ps.hasNext() ? ps.next() : DriveApp.getRootFolder(); }
  catch (e) { parent = DriveApp.getRootFolder(); }
  var folder = subFolder_(parent, ROOT_FOLDER_NAME);
  props.setProperty(PROP_ROOT, folder.getId());
  return folder;
}

function folderUrlSafe_(ss) {
  var id = PropertiesService.getScriptProperties().getProperty(PROP_ROOT);
  return id ? 'https://drive.google.com/drive/folders/' + id : '';
}

function subFolder_(parent, name) {
  var it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

/** Foto de painel/cupom/nota → pasta Fotos/aaaa-mm. */
function savePhoto_(ss, foto, data, nomeBase) {
  var tz = ss.getSpreadsheetTimeZone();
  var dia = Utilities.formatDate(data, tz, 'yyyy-MM-dd');
  var folder = subFolder_(subFolder_(rootFolder_(ss), 'Fotos'), dia.slice(0, 7));
  var nome = dia + '_' + Utilities.formatDate(new Date(), tz, 'HHmm') + '_' + nomeBase + '.' + extFromMime_(foto && foto.mime);
  return saveFile_(foto, folder, nome, ['image/jpeg', 'image/png', 'image/webp']);
}

function saveFile_(file, folder, nome, tipos) {
  var mime = String(file && file.mime || '');
  if (!file || typeof file.data !== 'string' || tipos.indexOf(mime) < 0) throw new Error('Arquivo inválido. Envie foto (JPG/PNG) ou PDF.');
  var bytes = Utilities.base64Decode(file.data);
  if (bytes.length > FILE_MAX_BYTES) throw new Error('Arquivo muito grande (máximo 10 MB).');
  var f = folder.createFile(Utilities.newBlob(bytes, mime, nome));
  f.setDescription('Enviado por ' + (userEmail_() || '?') + ' pelo Sistema Frota Polaris');
  return f.getUrl();
}

function extFromMime_(mime) {
  return { 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' }[mime] || 'jpg';
}

/* ============================== UTILITÁRIOS ============================== */

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) throw new Error('Outra pessoa está salvando agora. Tente de novo em alguns segundos.');
  try { return fn(); } finally { lock.releaseLock(); }
}

function userEmail_() {
  try { return Session.getActiveUser().getEmail() || ''; } catch (e) { return ''; }
}

function headerIndex_(header, map) {
  var pos = {};
  header.forEach(function (h, i) { var k = norm_(h); if (k && pos[k] == null) pos[k] = i; });
  var idx = {};
  Object.keys(map).forEach(function (k) { var i = pos[norm_(map[k])]; if (i != null) idx[k] = i; });
  return idx;
}

function norm_(s) {
  return String(s == null ? '' : s).trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ');
}

function cleanName_(n) {
  var s = String(n == null ? '' : n).trim().replace(/\s+/g, ' ');
  var k = norm_(s);
  if (!s || k === 'nao sei' || k === '-' || k === '.' || k === 'entregador' || k === 'folga') return '';
  return s;
}

function titleCase_(s) {
  return String(s || '').toLowerCase().replace(/(^|\s)\S/g, function (x) { return x.toUpperCase(); });
}

/** Aceita número, "12,67", "R$ 69,80", "-R$ 69,80", "1.234,50". */
function toNumber_(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return isFinite(v) ? v : null;
  var s = String(v).replace(/R\$/gi, '').replace(/\s/g, '').replace(/\\/g, '');
  if (!s) return null;
  if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
  var n = Number(s);
  return isFinite(n) ? n : null;
}

/** Date, "dd/mm/aaaa", "dd/mm/aa" ou "aaaa-mm-dd" → Date ao meio-dia (evita troca de dia por fuso). */
function parseDate_(v) {
  if (!v) return null;
  if (Object.prototype.toString.call(v) === '[object Date]') return isNaN(v.getTime()) ? null : v;
  var s = String(v).trim();
  var m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3], 12);
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (m) { var y = +m[3]; if (y < 100) y += 2000; return new Date(y, +m[2] - 1, +m[1], 12); }
  return null;
}

function dateKey_(d, tz) { return Utilities.formatDate(d, tz, 'yyyy-MM-dd'); }
function fmtDate_(d, tz) { return Utilities.formatDate(d, tz, 'dd/MM/yyyy'); }
function hora_(tz) { return Utilities.formatDate(new Date(), tz, 'HH:mm'); }
function fmtKey_(k) { return k ? k.slice(8, 10) + '/' + k.slice(5, 7) : ''; }
function pad3_(n) { return ('00' + n).slice(-3); }

function addDaysKey_(key, n) {
  var p = key.split('-');
  return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n)).toISOString().slice(0, 10);
}

function daysBetween_(fromKey, toKey) {
  var a = fromKey.split('-'), b = toKey.split('-');
  return Math.round((Date.UTC(+b[0], +b[1] - 1, +b[2]) - Date.UTC(+a[0], +a[1] - 1, +a[2])) / 86400000);
}

function fmtInt_(n) { return n == null ? '—' : Math.round(n).toLocaleString('pt-BR'); }
function fmtNum_(n, d) { return n == null ? '—' : Number(n).toFixed(d).replace('.', ','); }
function fmtMoney_(n) {
  if (n == null) return '—';
  var s = Math.abs(n).toFixed(2).split('.');
  return (n < 0 ? '-' : '') + 'R$ ' + s[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + s[1];
}

function sum_(list, k) { return list.reduce(function (acc, r) { return acc + (r[k] || 0); }, 0); }
function round_(n, d) { var f = Math.pow(10, d); return Math.round(n * f) / f; }

function pick_(o, keys) { var r = {}; keys.forEach(function (k) { r[k] = o[k] == null ? null : o[k]; }); return r; }

function distinct_(rows, k) {
  var seen = {};
  return rows.map(function (r) { return r[k]; }).filter(function (v) { if (!v || seen[v]) return false; seen[v] = true; return true; });
}

function byFrequency_(rows, k) {
  var count = {};
  rows.forEach(function (r) { var v = String(r[k] || '').trim(); if (!v || v === '.' || norm_(v) === 'folga') return; count[v] = (count[v] || 0) + 1; });
  return Object.keys(count).sort(function (a, b) { return count[b] - count[a]; });
}
