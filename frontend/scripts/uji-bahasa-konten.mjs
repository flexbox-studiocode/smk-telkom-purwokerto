import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { createServer } from 'vite';
import { buatInstruksi, jawabanFaqCepat, tanyaAI } from '../../supabase/functions/stela/inti.mjs';
import { buatPenjaga } from '../../supabase/functions/stela/penjaga-biaya.mjs';

const server = await createServer({ appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } });
try {
  const { translate } = await server.ssrLoadModule('/src/utils/language.js');
  const { default: english } = await server.ssrLoadModule('/src/data/translations.js');
  const data = await server.ssrLoadModule('/src/data/dummyData.js');
  const { LanguageContext } = await server.ssrLoadModule('/src/context/LanguageContext.js');
  const { PpdbProvider } = await server.ssrLoadModule('/src/context/PpdbContext.jsx');
  const publicContent = await server.ssrLoadModule('/src/utils/publicContent.js');
  const unknown = new Set();
  const failures = [];
  const t = (text, vars) => {
    const result = translate(text, 'en', vars);
    if (typeof text === 'string' && text === result && !Object.hasOwn(english, text)) unknown.add(text);
    return result;
  };
  const value = { language: 'en', locale: 'en-US', t, setLanguage: () => {} };
  const protectedNames = [data.footerData.kontak.alamat, 'Peduli Lingkungan', 'Pekan Pelajar Banyumas', 'Yayasan Pendidikan Telkom', 'Lintas Jaringan Indonesia (Demo)', 'Ruang Gim Studio (Demo)', 'Cinta, Bangga, dan Paham Rupiah'].filter(Boolean);
  const residual = /\b(dan|yang|untuk|dengan|tidak|belum|siswa|tahun|jurusan|prestasi|pilih|silakan|sudah|tersedia|pelajari|memiliki|daftar|temukan|kami|kamu|kegiatan|berita|pengumuman|pendaftaran|menjadi|mengembangkan|membantu|melalui|segera|keahlian|terbaru|lainnya|kembali|lanjutkan|berkas|terima|kasih|lulusan|jaringan|perangkat|seluruh|menggunakan|masukkan|periksa|tenggat|diproses|diterima|ditolak|menunggu|pendidik|kompetensi|layanan|ketentuan|berbasis|mengenal|pembelajaran|ruang|laboratorium|terletak|dipakai|dilakukan|oleh|pengajar|olahraga|harapan|membuka|diperlukan|dicari|selamat)\b/i;
  const clean = text => protectedNames.reduce((s, name) => s.replaceAll(name, ''), text).replaceAll('SMK Telkom Purwokerto', '').replace(/https?:\/\/[^\s<>]+/g, '');
  const render = async (module, props = {}, path = '/', route = '*') => {
    const { default: Component } = await server.ssrLoadModule(`/src/${module}.jsx`);
    const markup = renderToStaticMarkup(h(LanguageContext.Provider, { value }, h(MemoryRouter, { initialEntries: [path] }, h(PpdbProvider, null, h(Routes, null, h(Route, { path: route, element: h(Component, props) }))))));
    const visible = markup.replace(/<[^>]+>/g, ' ').replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, '&');
    assert.doesNotMatch(visible, /\bPPDB\b/, `${module}: legacy admissions label remains visible`);
    assert.doesNotMatch(markup, /href="\/(?:ppdb|dashboard\/ppdb|ketentuan-ppdb)(?:\/|[?#]|&quot;|")/, `${module}: legacy admissions link remains visible`);
    const match = clean(visible).match(residual);
    if (match) failures.push(`${module}: ${clean(visible).slice(Math.max(0, match.index - 30), match.index + 100)}`);
    return markup;
  };
  let views = 0;
  for (const page of ['LandingPage','TentangPage','JurusanPage','PrestasiPage','BeritaPage','PengumumanPage','BkkPage','GaleriPage','PanduanPage','JurusanFaqPage','JurusanPerbandinganPage','GuruPage','KetentuanPpdbPage','StelaPage','NextTelPage','EkstrakurikulerPage','SegeraHadirPage']) {
    await render(`pages/${page}`); views++;
  }
  for (const page of ['RegisterPage','LoginPage','VerifyEmailPage','ConfirmEmailPage','AturSandiPage','RegistrationFormPage','UploadDocumentsPage','SubmitSuccessPage','PpdbStatusPage','DokumenPesertaPage','LupaSandiPage']) {
    await render(`pages/ppdb/${page}`); views++;
  }
  for (const item of data.jurusanDetail) {
    await render('pages/JurusanDetailPage', {}, `/jurusan/${item.slug}`, '/jurusan/:slug'); views++;
  }
  for (const [jenis, entries] of Object.entries({ agenda: data.agendaDetail, galeri: data.galeriDetail, panduan: data.panduanDetail, pkl: data.pklDetailLengkap, roadmap: data.roadmapDetail, project: data.projectDetail, guru: data.guruDetail })) {
    for (const item of entries) { await render('pages/DetailPelengkapPage', {jenis}, `/detail/${item.slug}`, '/detail/:slug'); views++; }
  }
  const live = {};
  if (process.argv.includes('--live')) {
    for (const [name, fn] of [['berita','getPublishedBerita'],['pengumuman','getPublishedPengumuman'],['prestasi','getPrestasi'],['bkk','getActiveBkk']]) {
      const service = await server.ssrLoadModule(`/src/services/${name}Service.js`);
      live[name] = await service[fn]();
    }
  } else {
    live.berita = [{judul:'SMK Darussalam Karangpucung Pelajari Pengembangan Program PPLG',ringkasan:'Ringkasan sumber resmi sekolah',konten:'Sumber: https://example.com/berita',slug:'news',created_at:'2026-10-02'}];
    live.pengumuman = [{judul:'Ketentuan dan Model Seragam Siswa Tahun 2026',ringkasan:'Lihat Info PPDB',konten:'Sumber: https://example.com/notice',slug:'notice',tanggal:'2026-10-02'}];
    live.prestasi = [{judul:'Hanif Raih Awardee Green Environment Leadership melalui Inovasi IoT',kategori:'Teknologi',tingkat:'Lainnya',deskripsi:'Belum terverifikasi',slug:'award',tanggal:'2026-10-02'}];
    live.bkk = [{posisi:'Teknisi telekomunikasi',perusahaan:'Example',lokasi:'Purwokerto, Jawa Tengah',tipe_pekerjaan:'Magang'}];
  }
  for (const [name, rows] of Object.entries(live)) {
    const map = publicContent[{berita:'toBeritaItem',pengumuman:'toPengumumanItem',prestasi:'toPrestasiItem',bkk:'toBkkItem'}[name]];
    const items = rows.map(map);
    const modules = {berita:['berita/BeritaHeroSection','berita/BeritaSorotSection','berita/BeritaKategoriSection','berita/BeritaAgendaSection'],pengumuman:['pengumuman/PengumumanCard','pengumuman/PengumumanPopulerCard','pengumuman/PengumumanTimelineSection','pengumuman/PengumumanPpdbSection'],prestasi:['prestasi/PrestasiGaleriSection','prestasi/PrestasiUnggulanSection'],bkk:['bkk/BkkLowonganSection']}[name];
    for (const module of modules) { await render(`components/${module}`, {items,item:items[0]}); views++; }
    for (const item of items) {
      if (name === 'bkk') continue;
      const markup = await render('components/DetailLayout', {item,backTo:`/${name}`,backLabel:name}); views++;
      assert.ok(markup.includes(`Source: https://`) || !item.sourceUrl);
      assert.ok(markup.includes(`href="/${name}"`));
    }
  }
  // Paragraph boundaries and URLs must survive translation; unknown text stays intact.
  const content = 'Belum terverifikasi\n\nSumber: https://example.com/berita';
  assert.equal(translate(content,'en'), 'Unverified\n\nSource: https://example.com/berita');
  assert.equal(translate(content,'id'),content);
  assert.equal(translate('\n\n','en'),'\n\n');
  assert.equal(translate('Unknown proper name','en'),'Unknown proper name');
  for (const text of unknown) if (residual.test(clean(text))) failures.push(`Missing translation: ${text}`);
  assert.deepEqual(failures, [], 'English content audit failures');
  assert.match(jawabanFaqCepat('Apa saja jurusan di SMK Telkom?', 'en'), /Software Engineering/);
  assert.match(jawabanFaqCepat('What majors are available?', 'en'), /Game Development/);
  assert.equal(jawabanFaqCepat('What study programs are available at this school?', 'en'), null);
  assert.match(buatInstruksi('', undefined, 'en'), /Respond entirely in friendly, concise English/);
  assert.match(buatInstruksi('', undefined, 'en'), /Jika informasi belum tersedia, sarankan pengunjung untuk menghubungi pihak Tata Usaha/);
  const fast = await tanyaAI({pesan:[{role:'user',content:'Apa saja jurusan di SMK Telkom?'}],language:'en'});
  assert.equal(fast.modelDipakai,'faq');
  assert.match(fast.teks, /Software Engineering/);
  for (const [content, language, expected] of [['halo','en',/Hello/], ['siapa kamu','en',/I am STELA/], ['terima kasih','en',/welcome/], ['hello','id',/Halo/], ['hi',undefined,/Hello/]]) {
    assert.match((await tanyaAI({pesan:[{role:'user',content}],language})).teks, expected);
  }
  const guard = buatPenjaga();
  const messages = [{role:'user',content:'school programs'}];
  guard.simpanCache(messages,'Indonesian reply','id');
  assert.equal(guard.ambilCache(messages,'en'),null);
  guard.simpanCache(messages,'English reply','en');
  assert.equal(guard.ambilCache(messages,'id'),'Indonesian reply');
  assert.equal(guard.ambilCache(messages,'en'),'English reply');
  const originalFetch = globalThis.fetch;
  const originalDocument = globalThis.document;
  try {
    globalThis.document = { cookie: 'csrf_token=language-test' };
    const { tanyaStela } = await server.ssrLoadModule('/src/services/stela.js');
    const { jelaskanRekomendasiNextTel } = await server.ssrLoadModule('/src/services/nexttel.js');
    globalThis.fetch = async (_url, options) => {
      assert.equal(options.headers['x-csrf-token'], 'language-test');
      assert.equal(JSON.parse(options.body).language, 'en');
      return Response.json({reply:'English reply',explanation:'English explanation',strengths:[],learningSuggestions:[]});
    };
    assert.equal(await tanyaStela(messages,{language:'en'}),'English reply');
    assert.equal((await jelaskanRekomendasiNextTel({answers:[],language:'en'})).explanation,'English explanation');
    globalThis.fetch = async (_url, options) => {
      const payload = JSON.parse(options.body);
      assert.match(payload.messages[0].content, /Respond entirely in friendly, concise English/);
      return Response.json({choices:[{message:{content:'English response'}}],usage:{}});
    };
    const generated = await tanyaAI({penyedia:'ninerouter',apiKey:'sk-test',model:'test-model',baseUrl:'https://example.com',pesan:[{role:'user',content:'School achievements'}],language:'en'});
    assert.equal(generated.teks,'English response');
    let calls = 0;
    globalThis.fetch = async (url, options) => {
      calls++;
      const payload = JSON.parse(options.body);
      assert.equal(payload.messages[0].content, 'Return only recommendation JSON.');
      return String(url).startsWith('https://example.com') ? new Response('Unavailable', {status:503}) : Response.json({choices:[{message:{content:'{"explanation":"English recommendation"}'}}],usage:{}});
    };
    const recommendation = await tanyaAI({pesan:[{role:'user',content:'jurusan RPL'}],language:'en',instruksiKustom:'Return only recommendation JSON.',daftarPenyedia:[{penyedia:'ninerouter',apiKey:'sk-test',model:'first-model',baseUrl:'https://example.com'},{penyedia:'groq',apiKey:'gsk_test',model:'second-model'}]});
    assert.ok(calls >= 2,'NextTel custom instructions must bypass FAQ and retain provider failover');
    assert.equal(recommendation.penyediaDipakai,'groq');
    assert.equal(JSON.parse(recommendation.teks).explanation,'English recommendation');
  } finally {
    globalThis.fetch = originalFetch;
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
  }
  console.log(`English content: ${views} rendered views, ${Object.values(live).flat().length} content records, paragraph/URL preservation, FAQ language and cache separation pass.`);
} finally { await server.close(); }
