// Simulador mínimo dos serviços do Google Apps Script, com contador de chamadas.
'use strict';
process.env.TZ = 'America/Sao_Paulo';
const vm = require('vm');
const fs = require('fs');

function clone(x) {
  if (x instanceof Date) return new Date(x.getTime());
  if (Array.isArray(x)) return x.map(clone);
  if (x && typeof x === 'object') { const o = {}; for (const k of Object.keys(x)) o[k] = clone(x[k]); return o; }
  return x;
}

function makeEnv(data, opts) {
  opts = opts || {};
  const FIXED = opts.now || new Date(2026, 10, 17, 15, 30, 0).getTime();
  const calls = {};
  const hit = (n, cells) => { calls[n] = calls[n] || { n: 0, cells: 0 }; calls[n].n++; calls[n].cells += cells || 0; };
  const db = clone(data); // { sheets: {name: {rows: [[...]], links: {"r,c": url}, formulas: {"r,c": f}, maxRows, maxCols, validation: {col: [list]}}}, props }
  let sheetIdSeq = 100;
  const ids = { folder: 0, file: 0 };
  const quem = { usuario: opts.user || 'supervisor@exemplo.com', dono: opts.owner || opts.user || 'supervisor@exemplo.com', editores: ['dono@exemplo.com', 'supervisor@exemplo.com'] };

  function Sheet(name) {
    const S = db.sheets[name];
    if (S.id == null) S.id = sheetIdSeq++;
    const lastRow = () => { for (let r = S.rows.length; r >= 1; r--) { const row = S.rows[r - 1] || []; if (row.some(v => v !== '' && v != null)) return r; if (Object.keys(S.formulas).some(k => +k.split(',')[0] === r)) return r; } return 0; };
    const lastCol = () => { let m = 0; S.rows.forEach(row => { for (let c = (row || []).length; c >= 1; c--) if (row[c - 1] !== '' && row[c - 1] != null) { m = Math.max(m, c); break; } }); return m; };
    const get = (r, c) => { const row = S.rows[r - 1]; return row && row[c - 1] != null ? row[c - 1] : ''; };
    const set = (r, c, v) => { while (S.rows.length < r) S.rows.push([]); const row = S.rows[r - 1]; while (row.length < c) row.push(''); row[c - 1] = v; };
    function Range(r, c, nr, nc) {
      nr = nr == null ? 1 : nr; nc = nc == null ? 1 : nc;
      if (r < 1 || c < 1 || nr < 1 || nc < 1) throw new Error('Range inválido ' + [name, r, c, nr, nc]);
      if (r + nr - 1 > S.maxRows || c + nc - 1 > S.maxCols) throw new Error('As coordenadas do intervalo estão fora das dimensões da página (' + name + ' ' + [r, c, nr, nc] + ' max ' + S.maxRows + 'x' + S.maxCols + ')');
      const each = fn => { const out = []; for (let i = 0; i < nr; i++) { const row = []; for (let j = 0; j < nc; j++) row.push(fn(r + i, c + j)); out.push(row); } return out; };
      const R = {
        getValues() { hit('Range.getValues', nr * nc); return each((a, b) => { const v = get(a, b); return v instanceof Date ? new Date(v.getTime()) : v; }); },
        getFormulas() { hit('Range.getFormulas', nr * nc); return each((a, b) => S.formulas[a + ',' + b] || ''); },
        getRichTextValues() {
          hit('Range.getRichTextValues', nr * nc);
          return each((a, b) => { const v = get(a, b); if (typeof v !== 'string') return null; const url = S.links[a + ',' + b] || null; return { getLinkUrl: () => url, getText: () => v }; });
        },
        setValues(m) {
          hit('Range.setValues', nr * nc);
          if (m.length !== nr || m.some(x => x.length !== nc)) throw new Error('setValues: dimensões não batem');
          m.forEach((row, i) => row.forEach((v, j) => {
            const k = (r + i) + ',' + (c + j);
            if (typeof v === 'string' && v.charAt(0) === '=') { S.formulas[k] = v; } else { delete S.formulas[k]; const t = opts.parseTime && typeof v === 'string' && /^(\d{1,2}):(\d{2})$/.exec(v); set(r + i, c + j, t ? new Date(1899, 11, 30, +t[1], +t[2]) : v); }
            if (typeof v !== 'string' || v !== get(r + i, c + j)) delete S.links[k];
          }));
          return R;
        },
        clearContent() { hit('Range.clearContent', nr * nc); for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) { const k = (r + i) + ',' + (c + j); if (get(r + i, c + j) !== '') set(r + i, c + j, ''); delete S.formulas[k]; delete S.links[k]; } return R; },
        setFormulas(m) { hit('Range.setFormulas', nr * nc); m.forEach((row, i) => row.forEach((f, j) => { const k = (r + i) + ',' + (c + j); if (f) S.formulas[k] = f; else delete S.formulas[k]; })); return R; },
        setValue(v) { hit('Range.setValue', 1); set(r, c, v); delete S.links[r + ',' + c]; return R; },
        setRichTextValue(rt) { hit('Range.setRichTextValue', 1); set(r, c, rt.text); if (rt.url) S.links[r + ',' + c] = rt.url; else delete S.links[r + ',' + c]; return R; },
        setNumberFormat(f) { hit('Range.setNumberFormat'); S.formats = S.formats || {}; for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) S.formats[(r + i) + ',' + (c + j)] = f; return R; },
        setFontWeight() { hit('Range.format'); return R; }, setFontColor() { hit('Range.format'); return R; },
        setBackground(cor) { hit('Range.format'); S.bg = S.bg || {}; for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) S.bg[(r + i) + ',' + (c + j)] = cor; return R; }, setVerticalAlignment() { hit('Range.format'); return R; },
        copyTo() { hit('Range.copyTo'); return R; },
        setDataValidation(rule) { hit('Range.setDataValidation'); S.dv = S.dv || {}; for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) S.dv[(r + i) + ',' + (c + j)] = rule; return R; },
        clearDataValidations() { hit('Range.clearDataValidations'); S.dv = S.dv || {}; for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) delete S.dv[(r + i) + ',' + (c + j)]; return R; },
        _area: { r, c, nr, nc, sheet: name },
        getDataValidation() {
          hit('Range.getDataValidation');
          const list = S.validation && S.validation[c];
          if (!list) return null;
          return { getCriteriaType: () => 'VALUE_IN_LIST', getCriteriaValues: () => [list.slice()] };
        }
      };
      return R;
    }
    return {
      getName: () => name,
      getLastRow() { hit('Sheet.getLastRow'); return lastRow(); },
      getLastColumn() { hit('Sheet.getLastColumn'); return lastCol(); },
      getMaxRows() { hit('Sheet.getMaxRows'); return S.maxRows; },
      getMaxColumns() { hit('Sheet.getMaxColumns'); return S.maxCols; },
      getRange(r, c, nr, nc) { hit('Sheet.getRange'); return Range(r, c, nr, nc); },
      getDataRange() { hit('Sheet.getDataRange'); return Range(1, 1, Math.max(lastRow(), 1), Math.max(lastCol(), 1)); },
      insertRowsAfter(a, n) {
        hit('Sheet.insertRowsAfter'); S.maxRows += n;
        if (a < S.rows.length) {
          S.rows.splice(a, 0, ...Array.from({ length: n }, () => []));
          const shift = m => { const o = {}; Object.keys(m || {}).forEach(k => { const [x, y] = k.split(',').map(Number); o[(x > a ? x + n : x) + ',' + y] = m[k]; }); return o; };
          S.formulas = shift(S.formulas); S.links = shift(S.links); S.dv = shift(S.dv); S.formats = shift(S.formats);
        }
      },
      insertColumnsAfter(a, n) { hit('Sheet.insertColumnsAfter'); S.maxCols += n; },
      setColumnWidth() { hit('Sheet.format'); }, setFrozenRows(n) { hit('Sheet.format'); S.frozenRows = n; }, setRowHeight() { hit('Sheet.format'); },
      getSheetId() { hit('Sheet.getSheetId'); return S.id; },
      deleteRow(r) {
        hit('Sheet.deleteRow'); S.rows.splice(r - 1, 1);
        const shift = m => { const o = {}; Object.keys(m).forEach(k => { const [a, b] = k.split(',').map(Number); if (a < r) o[k] = m[k]; else if (a > r) o[(a - 1) + ',' + b] = m[k]; }); return o; };
        S.formulas = shift(S.formulas); S.links = shift(S.links); return this;
      },
      setFrozenColumns(n) { hit('Sheet.format'); S.frozenCols = n; },
      setTabColor(cor) { hit('Sheet.format'); S.tabColor = cor; return this; },
      setColumnWidths() { hit('Sheet.format'); },
      setConditionalFormatRules(rules) { hit('Sheet.setConditionalFormatRules'); S.cf = Array.from(rules); },
      getConditionalFormatRules() { return (S.cf || []).slice(); },
      clear() { hit('Sheet.clear'); S.rows = S.rows.map(row => row.map(() => '')); S.formulas = {}; S.links = {}; S.formats = {}; return this; },
      clearContents() { hit('Sheet.clearContents'); S.rows = S.rows.map(row => row.map(() => '')); S.formulas = {}; S.links = {}; return this; }
    };
  }

  const SS = {
    getId() { return 'SSID'; },
    getName() { return 'Controle_Frota_Polaris (TESTE DO SISTEMA)'; },
    getSheets() { hit('Spreadsheet.getSheets'); return Object.keys(db.sheets).map(n => Sheet(n)); },
    copy(name) { hit('Spreadsheet.copy'); db.backups = db.backups || []; db.backups.push({ name, sheets: clone(db.sheets) }); return { getName: () => name }; },
    getUrl() { hit('Spreadsheet.getUrl'); return 'https://docs.google.com/spreadsheets/d/SSID/edit'; },
    getSheetByName(n) { hit('Spreadsheet.getSheetByName'); return db.sheets[n] ? Sheet(n) : null; },
    deleteSheet(sh) { hit('Spreadsheet.deleteSheet'); delete db.sheets[sh.getName()]; },
    insertSheet(n) { hit('Spreadsheet.insertSheet'); db.sheets[n] = { rows: [], links: {}, formulas: {}, maxRows: 1000, maxCols: 26 }; return Sheet(n); },
    getSpreadsheetTimeZone() { hit('Spreadsheet.getSpreadsheetTimeZone'); return 'America/Sao_Paulo'; },
    getOwner() { hit('Spreadsheet.getOwner'); return { getEmail: () => quem.dono }; },
    getEditors() { hit('Spreadsheet.getEditors'); return quem.editores.map(e => ({ getEmail: () => e })); }
  };

  const folders = {};
  function Folder(id, nameF, parent) {
    const F = folders[id] = folders[id] || { id, name: nameF, parent, trashed: false, children: [], files: [], owner: quem.usuario, editors: [] };
    return {
      getId() { return id; },
      getUrl() { return 'https://drive.google.com/drive/folders/' + id; },
      isTrashed() { hit('Drive.isTrashed'); return F.trashed; },
      setTrashed(v) { hit('Drive.setTrashed'); F.trashed = !!v; return this; },
      getFoldersByName(n) {
        hit('Drive.getFoldersByName');
        const list = F.children.filter(cid => folders[cid].name === n && !folders[cid].trashed);
        let i = 0;
        return { hasNext: () => i < list.length, next: () => Folder(list[i++]) };
      },
      createFolder(n) { hit('Drive.createFolder'); const cid = 'FOLDER' + (++ids.folder); folders[cid] = { id: cid, name: n, parent: id, trashed: false, children: [], files: [], owner: quem.usuario, editors: [] }; F.children.push(cid); return Folder(cid); },
      getOwner() { hit('Drive.getOwner'); return { getEmail: () => F.owner }; },
      getParents() { hit('Drive.getParents'); const l = F.parent && folders[F.parent] ? [F.parent] : []; let i = 0; return { hasNext: () => i < l.length, next: () => Folder(l[i++]) }; },
      addEditor(e) { hit('Drive.addEditor'); if (F.editors.indexOf(e) < 0) F.editors.push(e); return this; },
      createFile(blob) {
        hit('Drive.createFile');
        const fid = 'FILE' + (++ids.file);
        F.files.push({ id: fid, name: blob.name, size: blob.bytes.length, owner: quem.usuario });
        db.files = db.files || []; db.files.push({ id: fid, name: blob.name, folder: F.name, folderId: id, owner: quem.usuario });
        return { setDescription() { hit('Drive.setDescription'); }, getUrl() { return 'https://drive.google.com/file/d/' + fid + '/view'; } };
      },
      getEditors() { hit('Drive.getEditors'); return F.editors.map(e => ({ getEmail: () => e })); },
      addEditors(l) { hit('Drive.addEditors'); l.forEach(e => { if (F.editors.indexOf(e) < 0) F.editors.push(e); }); }
    };
  }
  folders.ROOTDRIVE = { id: 'ROOTDRIVE', name: 'Meu Drive', parent: null, trashed: false, children: [], files: [], owner: quem.dono, editors: [] };
  const temAcesso = fid => { for (let f = folders[fid]; f; f = f.parent ? folders[f.parent] : null) if (f.owner === quem.usuario || f.editors.indexOf(quem.usuario) >= 0) return true; return false; };
  const raizDe = u => { const id = u === quem.dono ? 'ROOTDRIVE' : 'ROOT_' + u; if (!folders[id]) folders[id] = { id, name: 'Meu Drive', parent: null, trashed: false, children: [], files: [], owner: u, editors: [] }; return id; };

  const props = Object.assign({}, db.props || { SS_ID: 'SSID' });
  const ctx = {
    console, JSON, Math, Object, Array, String, Number, isFinite, isNaN, RegExp, Error, parseInt, parseFloat,
    SpreadsheetApp: {
      openById(id) { hit('SpreadsheetApp.openById'); if (id !== 'SSID') throw new Error('no access'); return SS; },
      getActiveSpreadsheet() { hit('SpreadsheetApp.getActiveSpreadsheet'); return SS; },
      getUi() {
        if (!opts.ui) throw new Error('Cannot call SpreadsheetApp.getUi() from this context.');
        const B = { YES: 'YES', NO: 'NO', CANCEL: 'CANCEL', CLOSE: 'CLOSE', OK: 'OK' };
        return { Button: B, ButtonSet: { YES_NO: 'YN', YES_NO_CANCEL: 'YNC', OK: 'OK' },
          alert(t, msg) { (opts.ui.log = opts.ui.log || []).push(t + ': ' + msg); return opts.ui.answers.shift() || 'OK'; },
          createMenu() { const m = { itens: [], addItem(t, f) { m.itens.push([t, f]); (opts.ui.menu = m.itens); return m; }, addSeparator() { return m; }, addToUi() {} }; return m; } };
      },
      flush() { hit('SpreadsheetApp.flush'); },
      newRichTextValue() { const o = { text: '', url: null }; const b = { setText(t) { o.text = t; return b; }, setLinkUrl(u) { o.url = u; return b; }, build() { return o; } }; return b; },
      DataValidationCriteria: { VALUE_IN_LIST: 'VALUE_IN_LIST' },
      newDataValidation() { const o = {}; const b = { requireValueInList(l) { o.lista = Array.from(l); return b; }, requireValueInRange(rg) { o.intervalo = rg._area; return b; }, setAllowInvalid(x) { o.permiteInvalido = x; return b; }, setHelpText(t) { o.ajuda = t; return b; }, build() { return o; } }; return b; },
      newConditionalFormatRule() { const o = {}; const b = { whenTextEqualTo(t) { o.texto = t; return b; }, setBackground(c) { o.fundo = c; return b; }, setFontColor(c) { o.fonte = c; return b; }, setRanges(rs) { o.areas = rs.map(x => x._area); return b; }, build() { return o; } }; return b; },
      CopyPasteType: { PASTE_FORMAT: 'PASTE_FORMAT' }
    },
    PropertiesService: { getScriptProperties() { hit('PropertiesService.getScriptProperties'); return { getProperty(k) { hit('Properties.getProperty'); return props[k] == null ? null : props[k]; }, setProperty(k, v) { hit('Properties.setProperty'); props[k] = v; }, getKeys() { return Object.keys(props); }, deleteProperty(k) { hit('Properties.deleteProperty'); delete props[k]; } }; } },
    LockService: { getScriptLock() { return { tryLock() { return true; }, releaseLock() {} }; } },
    Session: { getActiveUser() { hit('Session.getActiveUser'); return { getEmail: () => quem.usuario }; } },
    DriveApp: {
      getFolderById(id) { hit('Drive.getFolderById'); if (!folders[id]) throw new Error('not found'); if (!temAcesso(id)) throw new Error('Access denied: DriveApp.'); return Folder(id); },
      getFileById() { hit('Drive.getFileById'); const ve = temAcesso('ROOTDRIVE'); return { getParents() { let done = !ve; return { hasNext: () => !done, next: () => { done = true; return Folder('ROOTDRIVE'); } }; } }; },
      getRootFolder() { hit('Drive.getRootFolder'); return Folder(raizDe(quem.usuario)); }
    },
    Utilities: {
      formatDate(d, tz, fmt) {
        hit('Utilities.formatDate');
        const p = {}; new Intl.DateTimeFormat('en-GB', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
          .formatToParts(d).forEach(x => { p[x.type] = x.value; });
        if (p.hour === '24') p.hour = '00';
        return fmt.replace('yyyy', p.year).replace('MM', p.month).replace('dd', p.day).replace('HH', p.hour).replace('mm', p.minute);
      },
      base64Decode(s) { return Array.from(Buffer.from(s, 'base64')); },
      newBlob(bytes, mime, name) { return { bytes, mime, name }; }
    },
    HtmlService: { createHtmlOutputFromFile() { return { getContent: () => '' }; }, createTemplateFromFile() { return {}; }, XFrameOptionsMode: {} },
    Logger: { log() {} }
  };
  class FDate extends Date { constructor(...a) { if (a.length === 0) super(FIXED); else super(...a); } static now() { return FIXED; } }
  ctx.Date = FDate;
  vm.createContext(ctx);
  return { ctx, calls, db, props, folders, quem, setUser(u) { quem.usuario = u; }, temAcesso, resetCalls() { for (const k of Object.keys(calls)) delete calls[k]; } };
}

function load(env, file) { vm.runInContext(fs.readFileSync(file, 'utf8'), env.ctx, { filename: file }); return env.ctx; }

function summarize(calls) {
  const keys = Object.keys(calls).sort();
  const tot = keys.reduce((a, k) => a + calls[k].n, 0);
  return { total: tot, byType: Object.fromEntries(keys.map(k => [k, calls[k].n])), cells: Object.fromEntries(keys.filter(k => calls[k].cells).map(k => [k, calls[k].cells])) };
}

module.exports = { makeEnv, load, clone, summarize };
