(function () {
  'use strict';
  const KEY = 'notepad.notes.v1';
  const $ = id => document.getElementById(id);
  const el = { list: $('list'), editor: $('editor'), search: $('search'), status: $('status'), stats: $('stats'),
    pin: $('pinBtn'), del: $('deleteBtn'), dl: $('downloadBtn') };

  let notes = load();
  let currentId = null;
  let saveTimer = null;

  function load() {
    try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : []; }
    catch (e) { return []; }
  }
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(notes)); flash('저장됨'); }
    catch (e) { flash('저장 실패: 브라우저 저장소를 쓸 수 없습니다'); }
  }
  function flash(msg) { el.status.textContent = msg; }
  const current = () => notes.find(n => n.id === currentId) || null;

  function fmt(ts) {
    const d = new Date(ts);
    return d.toLocaleDateString('ko-KR') + ' ' + d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  }

  function renderList() {
    const shown = Notes.sort(Notes.search(notes, el.search.value));
    el.list.textContent = '';
    if (!shown.length) {
      const li = document.createElement('li');
      li.className = 'empty';
      li.textContent = notes.length ? '검색 결과가 없습니다' : '메모가 없습니다';
      el.list.appendChild(li);
      return;
    }
    for (const n of shown) {
      const li = document.createElement('li');
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', String(n.id === currentId));
      li.dataset.id = n.id;
      const t = document.createElement('div'); t.className = 't'; t.textContent = (n.pinned ? '📌 ' : '') + Notes.title(n);
      const d = document.createElement('div'); d.className = 'd'; d.textContent = fmt(n.updated);
      li.append(t, d);
      el.list.appendChild(li);
    }
  }

  function renderEditor() {
    const n = current();
    const has = !!n;
    el.editor.disabled = !has; el.pin.disabled = !has; el.del.disabled = !has; el.dl.disabled = !has;
    el.editor.value = has ? n.text : '';
    el.pin.textContent = has && n.pinned ? '고정 해제' : '고정';
    renderStats();
  }
  function renderStats() {
    const s = Notes.stats(el.editor.value);
    el.stats.textContent = current() ? `${s.chars}자 · ${s.words}단어 · ${s.lines}줄` : '';
  }

  function select(id) { flushSave(); currentId = id; renderList(); renderEditor(); if (id) el.editor.focus(); }

  function flushSave() {
    if (!saveTimer) return;
    clearTimeout(saveTimer); saveTimer = null;
    const n = current();
    if (n && n.text !== el.editor.value) { notes = Notes.update(notes, n.id, el.editor.value); persist(); renderList(); }
  }

  $('newBtn').onclick = () => {
    const n = Notes.create('');
    notes = [n, ...notes];
    el.search.value = '';
    persist(); select(n.id);
  };
  el.list.onclick = e => { const li = e.target.closest('li[data-id]'); if (li) select(li.dataset.id); };
  el.editor.oninput = () => {
    flash('입력 중…'); renderStats();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flushSave, 400);
  };
  el.search.oninput = renderList;
  el.pin.onclick = () => { flushSave(); notes = Notes.togglePin(notes, currentId); persist(); renderList(); renderEditor(); };
  el.del.onclick = () => {
    const n = current(); if (!n) return;
    if (!confirm(`"${Notes.title(n)}" 메모를 삭제할까요?`)) return;
    notes = Notes.remove(notes, n.id); currentId = null; persist(); renderList(); renderEditor();
  };
  el.dl.onclick = () => { flushSave(); const n = current(); if (n) download(Notes.fileName(n), n.text, 'text/plain'); };
  $('exportBtn').onclick = () => { flushSave(); download('notepad-backup-' + new Date().toISOString().slice(0, 10) + '.json', Notes.exportJSON(notes), 'application/json'); };
  $('importFile').onchange = async e => {
    const f = e.target.files[0]; e.target.value = '';
    if (!f) return;
    try {
      const r = Notes.importJSON(notes, await f.text());
      notes = r.notes; persist(); renderList();
      flash(`가져옴: 새 ${r.added} · 갱신 ${r.replaced} · 건너뜀 ${r.skipped}`);
    } catch (err) { flash('가져오기 실패: ' + err.message); }
  };

  function download(name, text, type) {
    const url = URL.createObjectURL(new Blob([text], { type: type + ';charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); flushSave(); }
    if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'n') { e.preventDefault(); $('newBtn').click(); }
  });
  window.addEventListener('beforeunload', flushSave);
  // 다른 탭에서 바뀐 내용 반영
  window.addEventListener('storage', e => { if (e.key === KEY) { notes = load(); renderList(); if (!current()) currentId = null; renderEditor(); } });

  renderList(); renderEditor();
})();
