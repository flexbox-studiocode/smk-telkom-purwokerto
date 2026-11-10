// Run: npm run nexa:prechat. Form rules on the client must agree with the server's.
import assert from 'node:assert/strict';
import { validasiPrechat, telepon } from '../src/utils/nexaPrechat.js';
import { prechatSchema } from '../../backend/src/modules/stela/prechat.mjs';

const dasar = { nama: 'Budi Santoso', telepon: '081234567890', usia: '16', kategori: 'sekolah' };
const kasus = [
  [{}, true],
  [{ nama: '' }, false], [{ nama: '   ' }, false], [{ nama: 'A' }, false], [{ nama: '12345' }, false], [{ nama: "Dewi O'Neil-Putri" }, true], [{ nama: 'Siti Nur’aini' }, true],
  [{ telepon: '' }, false], [{ telepon: '123' }, false], [{ telepon: 'abc' }, false], [{ telepon: '+6281234567890' }, true], [{ telepon: '6281234567890' }, true],
  [{ telepon: '0812-3456-7890' }, true], [{ telepon: '(0812) 3456 7890' }, true], [{ telepon: '+1 202 555 0100' }, false], [{ telepon: '08123456789012345' }, false],
  [{ usia: '' }, false], [{ usia: '4' }, false], [{ usia: '5' }, true], [{ usia: '100' }, true], [{ usia: '101' }, false], [{ usia: '16.5' }, false], [{ usia: '-3' }, false], [{ usia: '1e1' }, false],
  [{ kategori: '' }, false], [{ kategori: 'umum' }, false], [{ kategori: 'instansi' }, true],
];
for (const [override, valid] of kasus) {
  const input = { ...dasar, ...override };
  const klien = Object.keys(validasiPrechat(input)).length === 0;
  const server = prechatSchema.safeParse({ nama: input.nama, telepon: input.telepon, usia: /^\d+$/.test(input.usia) ? Number(input.usia) : Number.NaN, kategori: input.kategori }).success;
  assert.equal(klien, valid, `klien: ${JSON.stringify(override)}`);
  assert.equal(server, valid, `server: ${JSON.stringify(override)}`);
}
// Category is only demanded once the age is valid (it is hidden before that).
assert.deepEqual(Object.keys(validasiPrechat({ ...dasar, usia: '3', kategori: '' })), ['usia']);
assert.deepEqual(Object.keys(validasiPrechat({ ...dasar, kategori: '' })), ['kategori']);
// The phone stays a string: the leading zero is never lost.
assert.equal(telepon('0812-3456 7890'), '081234567890');
console.log('NEXA pre-chat: client and server validation agree on', kasus.length, 'cases.');
