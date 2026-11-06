// 실행: node --test
const test = require('node:test');
const assert = require('node:assert/strict');
const N = require('./notes.js');

test('제목은 첫 번째 비어 있지 않은 줄', () => {
  assert.equal(N.title({ text: '\n\n  장보기 목록 \n우유' }), '장보기 목록');
  assert.equal(N.title({ text: '   ' }), '(빈 메모)');
});

test('정렬: 고정 먼저, 그다음 최근 수정', () => {
  const a = { ...N.create('a', 1), updated: 1 };
  const b = { ...N.create('b', 2), updated: 3 };
  const c = { ...N.create('c', 3), updated: 2, pinned: true };
  assert.deepEqual(N.sort([a, b, c]).map(n => n.text), ['c', 'b', 'a']);
});

test('검색: 모든 단어 포함, 대소문자 무시', () => {
  const list = [N.create('회의 메모 Project'), N.create('회의 일정'), N.create('project 정리')];
  assert.equal(N.search(list, 'project 회의').length, 1);
  assert.equal(N.search(list, '').length, 3);
});

test('수정·고정·삭제는 원본을 바꾸지 않는다', () => {
  const n = N.create('x', 1);
  const list = [n];
  const u = N.update(list, n.id, 'y', 5);
  assert.equal(list[0].text, 'x');
  assert.equal(u[0].text, 'y');
  assert.equal(u[0].updated, 5);
  assert.equal(N.togglePin(u, n.id)[0].pinned, true);
  assert.equal(N.remove(u, n.id).length, 0);
});

test('통계: 한글·이모지 글자 수', () => {
  assert.deepEqual(N.stats('안녕 👋\n둘째 줄'), { chars: 9, words: 4, lines: 2 });
  assert.deepEqual(N.stats(''), { chars: 0, words: 0, lines: 0 });
});

test('내보내기 → 가져오기 왕복, 같은 id는 최신본 유지', () => {
  const old = { ...N.create('old', 1), id: 'same', updated: 1 };
  const newer = { ...old, text: 'new', updated: 9 };
  const json = N.exportJSON([newer, N.create('extra')]);
  const r = N.importJSON([old], json);
  assert.equal(r.added, 1);
  assert.equal(r.replaced, 1);
  assert.equal(r.notes.find(n => n.id === 'same').text, 'new');
});

test('가져오기: 잘못된 형식은 거부하거나 건너뜀', () => {
  assert.throws(() => N.importJSON([], 'not json'), /JSON/);
  assert.throws(() => N.importJSON([], '{"x":1}'), /notes/);
  const r = N.importJSON([], JSON.stringify({ notes: [{ id: 1, text: 'bad' }, { id: 'ok', text: 'good' }] }));
  assert.equal(r.skipped, 1);
  assert.equal(r.notes.length, 1);
});

test('파일 이름에서 금지 문자 제거', () => {
  assert.equal(N.fileName({ text: 'a/b:c*?' }), 'a_b_c__.txt');
});
