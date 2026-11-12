import assert from 'node:assert/strict';
import test from 'node:test';
import { compareLabels, evaluateQuotes } from './labels.mjs';

test('combines the colder temperature and records the real inference source passed by SDK', async () => {
  const labels = ['Machine wash at 30°C.', 'Machine wash at 40°C.'];
  const value = await compareLabels({ labels, allowCloud: true, privateNotes: 'secret' }, async (prompt, options) => {
    assert.deepEqual(options, { allowCloud: true });
    assert.doesNotMatch(prompt, /secret/);
    return { text: JSON.stringify(labels), inferenceSource: 'in_cloud' };
  });
  assert.deepEqual(value, { kind: 'temperature', ceilingC: 30, quotes: labels, inferenceSource: 'in_cloud' });
});

test('full-label restriction survives a cherry-picked model quote', () => {
  const labels = ['Machine wash at 30°C. Hand wash only for this item.', 'Machine wash at 40°C.'];
  assert.equal(evaluateQuotes(labels, '["Machine wash at 30°C.", "Machine wash at 40°C."]').kind, 'separate');
});

test('unsupported and separate-wash instructions do not become temperature advice', () => {
  for (const label of ['Wash cold.', 'Machine wash at 30°C. Wash separately.']) {
    assert.equal(evaluateQuotes([label, 'Machine wash at 40°C.'], JSON.stringify([label, 'Machine wash at 40°C.'])).kind, 'check');
  }
});

test('rejects a temperature quote that did not appear on the label', () => {
  assert.throws(() => evaluateQuotes(['Machine wash at 30°C.', 'Machine wash at 40°C.'], '["Machine wash at 60°C.", "Machine wash at 40°C."]'), /exact quote/);
});

test('does not adopt a partial quote from a label with conflicting temperatures', () => {
  const labels = ['Machine wash at 60°C. Everyday maximum 30°C.', 'Machine wash at 40°C.'];
  assert.equal(evaluateQuotes(labels, '["Machine wash at 60°C.", "Machine wash at 40°C."]').kind, 'check');
});

test('does not use an ironing temperature as the machine-wash limit', () => {
  for (const label of ['Machine wash at 30°F. Iron at 40°C.', 'Machine wash cold. Iron at 40°C.']) {
    const labels = [label, 'Machine wash at 60°C.'];
    assert.equal(evaluateQuotes(labels, JSON.stringify(labels)).kind, 'check', label);
  }
});

test('reads the full machine-wash clause before using a partial quote', () => {
  const quote = 'Machine wash at 30°C';
  for (const label of [
    'Machine wash at 30°C separately.',
    'Machine wash at 30°C only in a mesh bag.',
    'Machine wash at 30°C. Wash with like colours.'
  ]) {
    const labels = [label, 'Machine wash at 40°C.'];
    assert.equal(evaluateQuotes(labels, JSON.stringify([quote, labels[1]])).kind, 'check', label);
  }
  const labels = ['Never machine wash at 30°C.', 'Machine wash at 40°C.'];
  assert.equal(evaluateQuotes(labels, JSON.stringify(['machine wash at 30°C', labels[1]])).kind, 'separate');
});

test('accepts a complete washing limit with a named cycle', () => {
  const labels = ['Machine wash gentle at 30°C. Line dry.', 'Machine wash at 40°C on a normal cycle.'];
  const quotes = ['Machine wash gentle at 30°C.', labels[1]];
  assert.deepEqual(evaluateQuotes(labels, JSON.stringify(quotes)), { kind: 'temperature', ceilingC: 30, quotes });
});
