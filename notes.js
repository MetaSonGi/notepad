// 메모 데이터 로직 (UI 없음) — 브라우저와 Node 테스트에서 같이 사용
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Notes = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const VERSION = 1;

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function create(text = '', now = Date.now()) {
    return { id: uid(), text: String(text), pinned: false, created: now, updated: now };
  }

  function title(note) {
    const first = (note.text || '').split('\n').find(l => l.trim()) || '';
    return first.trim().slice(0, 60) || '(빈 메모)';
  }

  function update(notes, id, text, now = Date.now()) {
    return notes.map(n => (n.id === id ? { ...n, text: String(text), updated: now } : n));
  }

  function togglePin(notes, id) {
    return notes.map(n => (n.id === id ? { ...n, pinned: !n.pinned } : n));
  }

  function remove(notes, id) {
    return notes.filter(n => n.id !== id);
  }

  // 고정 메모 먼저, 그다음 최근 수정 순
  function sort(notes) {
    return [...notes].sort((a, b) => (b.pinned - a.pinned) || (b.updated - a.updated));
  }

  // 공백으로 나눈 모든 단어가 들어 있는 메모만 (대소문자 무시)
  function search(notes, query) {
    const words = String(query || '').toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return notes;
    return notes.filter(n => {
      const t = (n.text || '').toLowerCase();
      return words.every(w => t.includes(w));
    });
  }

  function stats(text) {
    const s = String(text || '');
    return {
      chars: [...s].length,
      words: (s.match(/\S+/g) || []).length,
      lines: s ? s.split('\n').length : 0,
    };
  }

  function exportJSON(notes) {
    return JSON.stringify({ app: 'notepad', version: VERSION, notes }, null, 2);
  }

  // 가져오기: 형식이 틀린 항목은 버리고, 같은 id는 더 최근 수정본을 유지
  function importJSON(existing, json) {
    let data;
    try { data = JSON.parse(json); } catch (e) { throw new Error('JSON 형식이 아닙니다'); }
    const list = Array.isArray(data) ? data : data && data.notes;
    if (!Array.isArray(list)) throw new Error('notes 배열이 없습니다');
    const valid = list.filter(n => n && typeof n.id === 'string' && typeof n.text === 'string')
      .map(n => ({
        id: n.id, text: n.text, pinned: !!n.pinned,
        created: Number(n.created) || Date.now(), updated: Number(n.updated) || Date.now(),
      }));
    const byId = new Map(existing.map(n => [n.id, n]));
    let added = 0, replaced = 0;
    for (const n of valid) {
      const cur = byId.get(n.id);
      if (!cur) { byId.set(n.id, n); added++; }
      else if (n.updated > cur.updated) { byId.set(n.id, n); replaced++; }
    }
    return { notes: [...byId.values()], added, replaced, skipped: list.length - valid.length };
  }

  function fileName(note) {
    const base = title(note).replace(/[\\/:*?"<>|\n\r\t]/g, '_').slice(0, 40) || 'memo';
    return base + '.txt';
  }

  return { create, title, update, togglePin, remove, sort, search, stats, exportJSON, importJSON, fileName };
});
