import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';
import sharp from 'sharp';

const server = await createServer({ appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } });
try {
  const { LanguageContext } = await server.ssrLoadModule('/src/context/LanguageContext.js');
  const { translate } = await server.ssrLoadModule('/src/utils/language.js');
  const { formatStelaPublicText } = await server.ssrLoadModule('/src/services/stela.js');
  assert.equal(formatStelaPublicText('STELA (Stematel Learning Assistant) siap.'), 'NEXA siap.');
  assert.equal(formatStelaPublicText('https://example.test/stela /api/stela stela_history'), 'https://example.test/stela /api/stela stela_history');
  const render = async (module, language, props = {}) => {
    const { default: Component } = await server.ssrLoadModule(`/src/${module}.jsx`);
    return renderToStaticMarkup(h(LanguageContext.Provider, { value: { language, locale: language === 'en' ? 'en-US' : 'id-ID', t: text => translate(text, language) } }, h(MemoryRouter, null, h(Component, props))));
  };
  for (const language of ['id', 'en']) {
    const banner = await render('components/StelaAISection', language);
    assert.match(banner, /href="\/nexa"/);
    assert.doesNotMatch(banner, /\bSTELA\b/);
    assert.ok(banner.includes(`nexa-${language}-desktop-1540.webp`));
    assert.ok(banner.includes(`nexa-${language}-mobile-1024.webp`));
    assert.ok(!banner.includes(`nexa-${language === 'id' ? 'en' : 'id'}-`), 'Only the selected language artwork is rendered');
    assert.match(banner, /<source media="\(max-width: 767px\)"/);
    assert.match(banner, /srcSet="[^"]*480w[^"]*768w[^"]*1024w"/);
    assert.match(banner, /srcSet="[^"]*960w[^"]*1540w[^"]*2172w"/);
    assert.match(banner, /width="1024" height="1536"/);
    assert.match(banner, /width="2172" height="724"/);
    assert.match(banner, /loading="lazy" decoding="async"/);
    assert.ok(banner.includes(language === 'en' ? 'Ask NEXA Now' : 'Tanya NEXA Sekarang'));
    const faq = await render('components/jurusan/JurusanFaqSection', language, { variant: 'home' });
    assert.doesNotMatch(faq, /aria-expanded="true"/);
    assert.match(faq, /aria-expanded="false"/);
    assert.match(faq, /href="\/jurusan\/faq"/);
    assert.match(faq, /href="\/nexa"/);
    const stats = await render('components/HomeStatistics', language);
    for (const number of [language === 'en' ? '1,030+' : '1.030+', '57+', '59+', '45+']) assert.ok(stats.includes(number));
    const cta = await render('components/CTASection', language, { href: '/custom-admissions' });
    assert.match(cta, /href="\/custom-admissions"/);
    assert.match(cta, /spmb-target.svg/);
  }
  const home = await readFile(new URL('../src/pages/LandingPage.jsx', import.meta.url), 'utf8');
  const order = ['<HeroSection', '<RibbonDivider', '<AboutSection', '<HomeStatistics', '<WaveMarquee', '<DepartmentsSection', '<FacilitiesSection', '<PartnersSection', '<AchievementsSection', '<HallOfFameSection', '<JurusanFaqSection'];
  let previous = -1;
  for (const component of order) { const index = home.indexOf(component); assert.ok(index > previous, `Homepage order: ${component}`); previous = index; }
  for (const asset of ['about-background.png', 'nexa-banner-1540.webp', 'nexa-mark.png', 'nexttel-mark.png', 'spmb-target.svg']) assert.ok((await stat(new URL(`../public/assets/branding/${asset}`, import.meta.url))).size > 0);
  for (const language of ['id', 'en']) for (const device of ['desktop', 'mobile']) for (const width of device === 'desktop' ? [960, 1540, 2172] : [480, 768, 1024]) {
    const asset = new URL(`../public/assets/branding/nexa-${language}-${device}-${width}.webp`, import.meta.url);
    const metadata = await sharp(await readFile(asset)).metadata();
    assert.equal(metadata.width, width);
    assert.equal(metadata.hasAlpha, true, 'Banner transparency must be preserved');
    assert.ok((await stat(asset)).size < 250000, `NEXA ${language}/${device}/${width}px exceeds image budget`);
  }
  console.log('Nexa/home: ID/EN banner, safe branding normalization, FAQ defaults, statistics, CTA override, section order and local assets pass.');
} finally { await server.close(); }
