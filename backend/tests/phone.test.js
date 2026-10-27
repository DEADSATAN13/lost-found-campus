import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhone, isValidPhone } from '../utils/phone.js';

test('Phone normalizer unit tests', async (t) => {
  await t.test('accepts plain 10-digit numbers starting with 6, 7, 8, or 9', () => {
    assert.equal(normalizePhone('9876543210'), '9876543210');
    assert.equal(normalizePhone('8123456789'), '8123456789');
    assert.equal(normalizePhone('7000000000'), '7000000000');
    assert.equal(normalizePhone('6999999999'), '6999999999');
    assert.equal(isValidPhone('9876543210'), true);
  });

  await t.test('strips +91 prefix and formatting characters', () => {
    assert.equal(normalizePhone('+91 98765 43210'), '9876543210');
    assert.equal(normalizePhone('+91-98765-43210'), '9876543210');
    assert.equal(normalizePhone('+91(98765)43210'), '9876543210');
  });

  await t.test('strips 91 prefix when total length is 12 digits', () => {
    assert.equal(normalizePhone('919876543210'), '9876543210');
    assert.equal(normalizePhone('91 98765 43210'), '9876543210');
  });

  await t.test('strips 0 trunk prefix when total length is 11 digits', () => {
    assert.equal(normalizePhone('09876543210'), '9876543210');
    assert.equal(normalizePhone('0 98765 43210'), '9876543210');
  });

  await t.test('rejects numbers starting with invalid digits (1-5)', () => {
    assert.equal(normalizePhone('5876543210'), null);
    assert.equal(normalizePhone('1234567890'), null);
    assert.equal(isValidPhone('5876543210'), false);
  });

  await t.test('rejects inputs with incorrect length or letters', () => {
    assert.equal(normalizePhone('987654321'), null); // 9 digits
    assert.equal(normalizePhone('98765432101'), null); // 11 digits without prefix
    assert.equal(normalizePhone('98765abcde'), null);
    assert.equal(normalizePhone(''), null);
    assert.equal(normalizePhone(null), null);
    assert.equal(normalizePhone(undefined), null);
  });
});
