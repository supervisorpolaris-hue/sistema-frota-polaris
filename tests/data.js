// Gera uma planilha sintética realista (set → hoje) para testar o código.
'use strict';
process.env.TZ = 'America/Sao_Paulo';

function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function build(opts) {
  opts = opts || {};
  const R = rng(opts.seed || 42);
  const pick = a => a[Math.floor(R() * a.length)];
  const int = (a, b) => a + Math.floor(R() * (b - a + 1));
  const D = (y, m, d) => new Date(y, m - 1, d);
  const key = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const today = D(2026, 11, 17);
  const start = D(2026, 9, 5);
  const motos = ['MOTO 01', 'MOTO 02', 'MOTO 03', 'MOTO 04', 'MOTO 05', 'MOTO 06'];
  const nomes = ['Rafael Mailson', 'João Pedro Silva', 'Carlos Eduardo', 'Ana Paula Souza', 'Bruno Lima', 'Diego Santos', 'Felipe Rocha', 'Marcos Vinícius', 'Thiago Alves'];
  const L = '📎 Abrir';
  let fileSeq = 0;
  const link = () => 'https://drive.google.com/file/d/SEED' + (++fileSeq) + '/view';

  const sheets = {};
  const mk = (name, header, maxCols) => (sheets[name] = { rows: [header], links: {}, formulas: {}, maxRows: 1000, maxCols: maxCols || Math.max(header.length, 26) });

  // ---------------- REGISTRO DIÁRIO ----------------
  const REGH = ['.', 'Moto (ID)', 'Entregador responsável', 'Turno', 'KM Início', 'KM Fim', 'KM Rodado', 'Litros abastecidos', 'Valor abastecido (R$)',
    'Consumo (km/l)', 'Corridas realizadas', 'Meta (turno)', 'Atingiu meta?', 'Recebido por', 'Devolvido por', 'Status', 'Ocorrência/Avaria',
    'Custo por corrida (R$)', 'Receita estimada (R$)', 'Lucro estimado (R$)', 'Hora saída', 'Hora retorno', 'Checklist', 'Foto KM Início', 'Foto KM Fim', 'Lançado por'];
  const reg = mk('REGISTRO DIÁRIO', REGH, 26);
  reg.validation = { 16: ['RODANDO', 'FINALIZADO', 'MANUTENÇÃO', 'PARADA'] };
  const odo = {}; motos.forEach((m, i) => { odo[m] = 10000 + i * 3500; });
  const odoByDay = {};
  for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    const k = key(d);
    const isToday = k === key(today);
    if (R() < 0.08) { const folga = [new Date(d), 'FOLGA', pick(nomes), 'FOLGA', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']; if (!opts.semFolgas) reg.rows.push(folga); }
    motos.forEach(m => {
      ['MANHÃ', 'NOITE'].forEach(turno => {
        if (R() > (turno === 'MANHÃ' ? 0.85 : 0.6)) return;
        const ini = odo[m], rod = int(60, 180), fim = ini + rod;
        const open = (isToday && turno === 'NOITE') || (isToday && R() < 0.4) || (k === '2026-11-14' && m === 'MOTO 03' && turno === 'NOITE');
        const corr = R() < 0.05 ? '' : int(4, 20);
        const old = k < '2026-10-01';
        const litros = old && R() < 0.3 ? +(int(50, 120) / 10).toFixed(1) : '';
        const row = [new Date(d), m, pick(nomes), turno, ini, open ? '' : fim, open ? '' : rod, litros, litros ? +(litros * 6.19).toFixed(2) : '',
          '', open ? '' : corr, 12, open ? '' : (corr >= 12 ? 'Sim' : 'Não'), pick(nomes), open ? '' : pick(nomes), open ? 'RODANDO' : 'FINALIZADO',
          open ? '' : pick(['TUDO OK', 'TUDO OK', 'TUDO OK', 'PNEU FURADO', 'RETROVISOR']), '', '', '',
          k >= '2026-10-15' ? (turno === 'MANHÃ' ? '08:0' + int(0, 9) : '18:1' + int(0, 9)) : '', !open && k >= '2026-10-15' ? '14:3' + int(0, 9) : '',
          k >= '2026-10-15' ? pick(['OK', 'OK', 'OK', 'Problema: freios']) : '', '', '', k >= '2026-10-15' ? 'supervisor@exemplo.com' : ''];
        reg.rows.push(row);
        const r = reg.rows.length;
        reg.formulas[r + ',7'] = '=IF(F' + r + '="";"";F' + r + '-E' + r + ')';
        if (k >= '2026-11-01') { row[23] = L; reg.links[r + ',24'] = link(); if (!open) { row[24] = L; reg.links[r + ',25'] = link(); } }
        if (!open) odo[m] = fim;
      });
    });
    odoByDay[k] = Object.assign({}, odo);
  }
  reg.maxRows = reg.rows.length + 15;

  // ---------------- Frota / Configurações / ESCALA / CAMISAS ----------------
  const frota = mk('Frota', ['Moto (ID)', 'Modelo', 'Placa', 'Entregador vinculado', 'Data início de uso', 'KM inicial', 'Última revisão (KM)', 'Última revisão (data)', 'Próxima revisão (KM)']);
  motos.forEach((m, i) => frota.rows.push([m, pick(['CG 160', 'Factor 150', 'Pop 110']), 'ABC' + (1000 + i), nomes[i], D(2026, 6, 1), 10000 + i * 3500,
    i % 2 ? '' : 10000 + i * 3500 + 2500, i % 2 ? '' : D(2026, 9, 20), '']));
  const conf = mk('Configurações', ['Parâmetro', 'Valor']);
  conf.rows.push(['Meta de corridas por turno', 12], ['Revisão a cada (km)', 3000], ['Revisão a cada (meses)', 3]);
  const esc = mk('ESCALA', ['ESCALA MÊS DE OUTUBRO 2026'], 40);
  const bloco = (mes, ano, dias) => {
    esc.rows.push(['ESCALA MÊS DE ' + mes + ' ' + ano]);
    esc.rows.push(['DIAS DO MÊS'].concat(Array.from({ length: dias }, (_, i) => i + 1)));
    esc.rows.push(['DIA DA SEMANA'].concat(Array.from({ length: dias }, () => 'x')));
    nomes.slice(0, 8).forEach(n => esc.rows.push([n.split(' ')[0].toUpperCase()].concat(Array.from({ length: dias }, () => (R() < 0.7 ? 'TR' : 'F')))));
  };
  esc.rows = [];
  bloco('OUTUBRO', 2026, 31); esc.rows.push([]); bloco('NOVEMBRO', 2026, 30);
  const cam = mk('CAMISAS', ['Nome', 'Tamanho']);
  nomes.forEach(n => cam.rows.push([n, pick(['P', 'M', 'G', 'GG'])]));

  // ---------------- Abas do app ----------------
  const H = opts.schema; // headers por chave
  const fill = (name, schemaKey, objs) => {
    const sc = H[schemaKey];
    const s = mk(name, sc.map(c => c[1]), Math.max(sc.length, 26));
    objs.forEach(o => {
      const row = sc.map(c => (o[c[0]] == null ? '' : o[c[0]]));
      s.rows.push(row);
      const r = s.rows.length;
      sc.forEach((c, j) => { if (c[2] === 'link' && o[c[0]]) { row[j] = L; s.links[r + ',' + (j + 1)] = o[c[0]]; } });
    });
    return s;
  };
  const ab = [];
  for (let d = D(2026, 10, 1); d <= today; d.setDate(d.getDate() + 1)) {
    const k = key(d);
    motos.forEach(m => {
      if (R() > 0.33) return;
      const l = +(int(55, 125) / 10).toFixed(1);
      ab.push({ data: new Date(d), hora: '1' + int(0, 9) + ':' + int(10, 59), moto: m, km: odoByDay[k][m] + int(0, 30), litros: l, valor: +(l * 6.29).toFixed(2), preco: 6.29,
        posto: pick(['Posto Shell Centro', 'Ipiranga BR', 'Posto Avenida']), cheio: R() < 0.85 ? 'Sim' : 'Não', entregador: pick(nomes),
        fotoCupom: k >= '2026-11-01' ? link() : '', fotoPainel: k >= '2026-11-05' ? link() : '', obs: '', por: 'supervisor@exemplo.com', em: new Date(d) });
    });
  }
  fill('ABASTECIMENTOS', 'ABAST', ab);
  const rec = [];
  for (let d = D(2026, 10, 1); d < today; d.setDate(d.getDate() + 1)) if (R() > 0.12) rec.push({ data: new Date(d), valor: int(900, 1600), descricao: 'Repasse do dia', por: 'supervisor@exemplo.com', em: new Date(d) });
  fill('RECEITAS', 'REC', rec);
  const man = [];
  for (let i = 0; i < 12; i++) {
    const d = D(2026, 9 + Math.floor(i / 5), 3 + i * 2), m = motos[i % 6], tipo = i % 3 === 0 ? 'Revisão' : pick(['Troca de óleo', 'Pneu', 'Freio']);
    const pe = int(40, 300), mo = int(30, 120);
    man.push({ data: d, moto: m, km: odoByDay[key(d)] ? odoByDay[key(d)][m] : '', tipo, descricao: tipo, pecas: pe, maoObra: mo, total: pe + mo, oficina: 'Oficina do Zé', foto: i > 6 ? link() : '', por: 'supervisor@exemplo.com', em: d });
  }
  fill('MANUTENÇÕES', 'MANUT', man);
  const ents = nomes.map((n, i) => ({ id: 'E00' + (i + 1), nome: n, cpf: '123.456.789-0' + i, rg: '', nascimento: D(1995, 1 + i, 10), telefone: '(11) 9' + (8000 + i) + '-0000',
    endereco: 'Rua ' + i, emergencia: '', cnhNumero: '0000' + i, cnhCategoria: 'A', cnhValidade: i === 1 ? D(2026, 11, 1) : i === 2 ? D(2026, 12, 5) : i === 4 ? '' : D(2028, 3, 1),
    admissao: D(2026, 6, 1), desligamento: i === 8 ? D(2026, 10, 20) : '', salario: i < 7 ? 2000 + i * 50 : '', pix: '', camisa: 'M', status: i === 8 ? 'Inativo' : 'Ativo', obs: '',
    pasta: i < 5 ? 'https://drive.google.com/drive/folders/PASTA' + i : '', atualizadoEm: D(2026, 10, 1), atualizadoPor: 'supervisor@exemplo.com' }));
  fill('ENTREGADORES', 'ENT', ents);
  const docs = [];
  ents.slice(0, 6).forEach((e, i) => ['CNH', 'RG / CPF', 'Comprovante de residência', 'Contrato / termo da moto'].slice(0, 1 + (i % 4)).forEach(t => docs.push({
    data: D(2026, 10, 2 + i), entId: e.id, entregador: e.nome, tipo: t, validade: t === 'CNH' ? e.cnhValidade : '', arquivo: link(), nomeArquivo: t + ' - ' + e.nome + '.jpg', por: 'supervisor@exemplo.com' })));
  fill('DOCUMENTOS', 'DOCS', docs);

  return { sheets, props: { SS_ID: 'SSID' } };
}

module.exports = { build };
