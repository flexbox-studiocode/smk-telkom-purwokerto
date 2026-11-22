// Parser SQL dump phpMyAdmin (khusus tabel tunggal `ic_posts`).
//
// Strategi: baca file sebagai teks UTF-8, cari statement INSERT lalu urai
// tuple VALUES-nya dengan mesin status (state machine) yang sadar string,
// escape, dan komentar. Tidak memakai eval/Function agar dump tetap diperlakukan
// sebagai data, bukan kode yang dapat dieksekusi.
//
// Catatan charset: dump asli adalah utf8mb4. Namun urutan byte-nya di beberapa
// tempat memuat mojibake hasil double-encoding (mis. tanda kutip pintar),
// sehingga buffer dibaca sebagai latin1 agar setiap byte dipetakan 1:1 ke
// code point U+0000..U+00FF tanpa karakter replacement U+FFFD. Teks ASCII
// (judul, konten utama) tidak terpengaruh.

const STATE = {
  SCAN: 'scan',
  WAIT_TUPLE: 'wait',
  IN_TUPLE: 'inTuple',
  IN_STRING: 'inString',
  ESCAPE: 'escape',
  LINE_COMMENT: 'lineComment',
  BLOCK_COMMENT: 'blockComment',
};

function unescapeMysqlString(raw) {
  let out = '';
  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i];
    if (ch !== '\\') {
      out += ch;
      continue;
    }
    const next = raw[i + 1];
    if (next === undefined) {
      out += '\\';
      break;
    }
    i += 1;
    switch (next) {
      case '0': out += '\0'; break;
      case 'n': out += '\n'; break;
      case 'r': out += '\r'; break;
      case 't': out += '\t'; break;
      case 'b': out += '\b'; break;
      case 'Z': out += '\u001a'; break;
      case '\\': out += '\\'; break;
      case "'": out += "'"; break;
      case '"': out += '"'; break;
      case '%': out += '\\%'; break;
      case '_': out += '\\_'; break;
      default: out += next; break;
    }
  }
  return out;
}

function decodeValue(token, quoted) {
  if (!quoted) {
    const t = token.trim();
    if (t === 'NULL') return null;
    if (t === 'TRUE') return 1;
    if (t === 'FALSE') return 0;
    return t;
  }
  return unescapeMysqlString(token);
}

// Mengurai satu tuple "(v1,'v2',...)" menjadi array nilai.
// Mengembalikan null bila tuple tidak lengkap.
export function parseTuple(text) {
  const values = [];
  let current = '';
  let quoted = false;
  let state = STATE.IN_TUPLE;
  let closed = false;
  let i = 0;
  if (text[0] !== '(') return null;
  i = 1;
  for (; i < text.length; i += 1) {
    const ch = text[i];
    if (state === STATE.ESCAPE) {
      current += ch;
      state = STATE.IN_STRING;
      continue;
    }
    if (state === STATE.IN_STRING) {
      if (ch === '\\') { state = STATE.ESCAPE; continue; }
      if (ch === "'") {
        if (text[i + 1] === "'") { current += "'"; i += 1; continue; }
        state = STATE.IN_TUPLE;
        continue;
      }
      current += ch;
      continue;
    }
    // state IN_TUPLE
    if (ch === "'") { quoted = true; state = STATE.IN_STRING; continue; }
    if (ch === ',') { values.push(decodeValue(current, quoted)); current = ''; quoted = false; continue; }
    if (ch === ')') { values.push(decodeValue(current, quoted)); closed = true; i += 1; break; }
    current += ch;
  }
  if (!closed) return null;
  return { values, end: i };
}

// Menghasilkan seluruh tuple dari satu blok VALUES (tanpa kurung pembuka statement).
export function parseValuesBlock(block) {
  const tuples = [];
  let i = 0;
  const n = block.length;
  while (i < n) {
    // cari '(' berikutnya, lompati spasi/koma/newline
    while (i < n && block[i] !== '(') i += 1;
    if (i >= n) break;
    const parsed = parseTuple(block.slice(i));
    if (!parsed) break;
    tuples.push(parsed.values);
    i += parsed.end;
  }
  return tuples;
}

// Mengekstrak daftar kolom dari header "INSERT INTO `t` (`a`, `b`) VALUES".
export function parseInsertColumns(header) {
  const paren = header.indexOf('(');
  if (paren === -1) return null;
  const close = header.indexOf(')', paren);
  if (close === -1) return null;
  return header
    .slice(paren + 1, close)
    .split(',')
    .map((c) => c.trim().replace(/^`|`$/g, '').trim())
    .filter(Boolean);
}

// Menjalankan callback per baris objek {column: value} dari seluruh INSERT.
// Mengembalikan statistik parsing.
export function streamInserts(text, onRow) {
  const stats = { inserts: 0, rows: 0, skippedTuples: 0 };
  let i = 0;
  const n = text.length;
  const UPPER_SNIPPET = 2000;

  while (i < n) {
    const idx = text.indexOf('INSERT INTO', i);
    if (idx === -1) break;
    const headerEnd = text.indexOf('VALUES', idx);
    if (headerEnd === -1) break;
    const columns = parseInsertColumns(text.slice(idx, headerEnd));
    stats.inserts += 1;
    if (!columns) { i = headerEnd + 6; continue; }

    // Cari batas akhir statement: ';' pada level luar string.
    let j = headerEnd + 6;
    let state = STATE.SCAN;
    let blockStart = j;
    while (j < n) {
      const ch = text[j];
      if (state === STATE.SCAN) {
        if (ch === "'") state = STATE.IN_STRING;
        else if (ch === ';') break;
      } else if (state === STATE.IN_STRING) {
        if (ch === '\\') j += 1;
        else if (ch === "'" && text[j + 1] === "'") j += 1;
        else if (ch === "'") state = STATE.SCAN;
      }
      j += 1;
    }
    const block = text.slice(blockStart, j);
    for (const values of parseValuesBlock(block)) {
      if (values.length !== columns.length) { stats.skippedTuples += 1; continue; }
      const row = {};
      for (let k = 0; k < columns.length; k += 1) {
        const value = values[k];
        // Nilai TEXT/VARCHAR di dump pihak ketiga memuat spasi pembungkus
        // (mis. post_type "post"). Rapikan tanpa menyentuh NULL/angka.
        row[columns[k]] = typeof value === 'string' ? value.trim() : value;
      }
      onRow(row);
      stats.rows += 1;
    }
    i = j + 1;
  }
  return stats;
}

// Membaca file SQL sebagai latin1 (byte-preserving) dan mengembalikan seluruh baris.
export function readSqlFile(fs, filePath) {
  const text = fs.readFileSync(filePath, 'latin1');
  const rows = [];
  const stats = streamInserts(text, (row) => rows.push(row));
  return { rows, stats };
}
