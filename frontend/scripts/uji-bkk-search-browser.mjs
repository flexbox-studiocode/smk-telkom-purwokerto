/* global document, window */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const output = process.env.QA_OUTPUT;
assert(output, 'Set QA_OUTPUT to a local output directory.');
await mkdir(output, { recursive: true });
const fixtures = [
  { id: 'qa-backend', posisi: 'Backend Engineer', perusahaan: 'QA Telkom', lokasi: 'Jakarta', tipePekerjaan: 'Magang', deskripsi: 'Programming', linkPendaftaran: 'https://example.com/backend' },
  { id: 'qa-network', posisi: 'Network Engineer', perusahaan: 'QA Network', lokasi: 'Purwokerto', tipePekerjaan: 'Full Time', deskripsi: 'Networking' },
  { id: 'qa-game', posisi: 'Game Developer', perusahaan: 'QA Studio', lokasi: 'Jakarta Selatan', tipePekerjaan: 'Full Time', deskripsi: 'Game' },
];
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [], errors = [];
try {
  for (const language of ['id', 'en']) {
    for (const width of [1847, 1440, 1024, 768, 390, 320]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
      page.on('pageerror', (error) => errors.push(error.message));
      await page.route('**/api/**', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(route.request().url().includes('/bkk') ? { data: fixtures } : []) }));
      await page.addInitScript((lang) => {
        sessionStorage.setItem('smk-telkom-language', lang);
        localStorage.setItem('stela-reminder-dismissed-at', String(Date.now()));
      }, language);
      await page.goto(`${process.env.QA_URL || 'http://127.0.0.1:5173'}/bkk`);
      const company = page.locator('[data-bkk-search="perusahaan"]');
      const talent = page.locator('[data-bkk-search="talenta"]');
      const jobs = page.locator('#hasil-lowongan article');
      await company.scrollIntoViewIfNeeded();
      await page.evaluate(() => document.fonts.ready);
      await page.waitForFunction(() => document.querySelectorAll('#hasil-lowongan article').length === 3);
      assert.equal(await company.getByRole('combobox').count(), 3);
      assert.equal(await talent.getByRole('combobox').count(), 3);
      assert.equal(await company.locator('h2').innerText(), language === 'id' ? 'Temukan Perusahaan Terbaik' : 'Find the Best Company');
      await page.locator('#lowongan').screenshot({ path: join(output, `bkk-${width}-${language}.png`) });
      const layout = await page.evaluate(() => {
        const panels = [...document.querySelectorAll('[data-bkk-search]')];
        const controls = panels.flatMap((panel) => [...panel.querySelectorAll('input, select, button, h2')]);
        const companyImage = panels[0].querySelector('img[data-figma-node="328:1425"]');
        const crop = companyImage.parentElement;
        const slot = crop.parentElement;
        return {
          overflow: document.documentElement.scrollWidth > window.innerWidth,
          companyCrop: { width: crop.clientWidth, height: crop.clientHeight, slotWidth: slot.clientWidth, overflow: window.getComputedStyle(crop).overflow },
          clipped: controls.filter((el) => el.scrollWidth > el.clientWidth + 1 || el.getBoundingClientRect().right > window.innerWidth + 1 || el.getBoundingClientRect().left < 0).map((el) => el.textContent),
          ordered: panels[0].getBoundingClientRect().top < panels[1].getBoundingClientRect().top && panels[1].getBoundingClientRect().bottom < document.querySelector('#hasil-lowongan').getBoundingClientRect().top,
          assets: panels.flatMap((panel) => [...panel.querySelectorAll('img')].map((img) => ({ loaded: img.complete && img.naturalWidth > 0, width: img.clientWidth, height: img.clientHeight }))),
        };
      });
      assert.equal(layout.overflow, false, `${width}/${language}: horizontal overflow`);
      assert.equal(layout.companyCrop.width, layout.companyCrop.slotWidth, 'Company image crop stays within the red frame.');
      assert(Math.abs(layout.companyCrop.height / layout.companyCrop.width - 150 / 204) < .01, 'Company crop follows the Figma 204 × 150 visible frame.');
      assert.equal(layout.companyCrop.overflow, 'hidden');
      assert.deepEqual(layout.clipped, [], `${width}/${language}: clipped controls`);
      assert(layout.ordered);
      assert(layout.assets.every((asset) => asset.loaded && asset.width > 0 && asset.height > 0));
      const select = company.getByRole('combobox');
      await select.nth(0).selectOption('Jakarta');
      assert.equal(await jobs.count(), 1);
      await select.nth(1).selectOption('Programming');
      await select.nth(2).selectOption('Magang');
      assert.equal(await jobs.count(), 1);
      assert.equal(await company.getByRole('button', { name: 'Programming', exact: true }).getAttribute('aria-pressed'), 'true');
      await company.getByRole('searchbox').fill('QA Telkom');
      await company.getByRole('searchbox').press('Enter');
      assert.equal(await company.getByRole('searchbox').inputValue(), 'QA Telkom', 'Search must not reset the input.');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'hasil-lowongan');
      await company.getByRole('button', { name: language === 'id' ? 'Atur Ulang' : 'Reset', exact: true }).click();
      assert.equal(await jobs.count(), 3);
      for (const category of ['Nasional', 'Internasional', 'LKS', 'Robotik', 'Programming', 'UI/UX', 'AI', 'Game', 'Networking']) {
        await company.getByRole('button', { name: category === 'Nasional' && language === 'en' ? 'National' : category === 'Internasional' && language === 'en' ? 'International' : category === 'Robotik' && language === 'en' ? 'Robotics' : category, exact: true }).click();
        assert.equal(await select.nth(1).inputValue(), category, 'Chip and dropdown share the same category.');
        assert.equal(await jobs.count(), ['Programming', 'Game', 'Networking'].includes(category) ? 1 : 0);
      }
      await company.getByRole('button', { name: language === 'id' ? 'Atur Ulang' : 'Reset', exact: true }).click();
      await talent.locator('button[type="submit"]').click();
      const profiles = page.locator('#hasil-talenta article');
      assert.equal(await profiles.count(), 3);
      await talent.getByRole('searchbox').fill('ALFA');
      assert.equal(await profiles.count(), 1);
      await talent.getByRole('combobox').nth(0).selectOption('Belum dicantumkan');
      await talent.getByRole('combobox').nth(2).selectOption('Belum dicantumkan');
      await talent.getByRole('button', { name: 'Networking', exact: true }).click();
      assert.equal(await profiles.count(), 1);
      assert.equal(await jobs.count(), 3, 'Talent filters do not affect vacancies.');
      await talent.getByRole('searchbox').fill('unknown-profile');
      assert.equal(await profiles.count(), 0);
      assert.match(await page.locator('#hasil-talenta').innerText(), language === 'id' ? /Tidak ada talenta/ : /No matching talent/);
      await talent.getByRole('button', { name: language === 'id' ? 'Atur Ulang' : 'Reset', exact: true }).click();
      assert.equal(await profiles.count(), 3);
      assert.equal(await profiles.first().getByRole('link').getAttribute('href'), 'https://smktelkom-pwt.sch.id/');
      for (const category of ['LKS', 'Robotik', 'Programming', 'UI/UX', 'AI', 'Game', 'Networking']) {
        await talent.getByRole('button', { name: category === 'Robotik' && language === 'en' ? 'Robotics' : category, exact: true }).click();
        assert.equal(await talent.getByRole('combobox').nth(1).inputValue(), category);
        assert.equal(await profiles.count(), category === 'Networking' ? 1 : 0);
      }
      await talent.getByRole('button', { name: language === 'id' ? 'Atur Ulang' : 'Reset', exact: true }).click();
      assert.equal(await page.getByRole('heading', { name: language === 'id' ? 'Kisah Sukses Alumni' : 'Alumni Success Stories', exact: true }).count(), 1);
      const switchLanguage = page.getByRole('button', { name: language === 'id' ? 'Switch to English' : 'Switch to Indonesian', exact: true }).first();
      if (width >= 1024) {
        await switchLanguage.click();
        assert.match(await talent.locator('h2').innerText(), language === 'id' ? /Find the Best Talent/ : /Temukan Talenta Terbaik/);
        assert.equal(await profiles.count(), 3);
      }
      results.push({ language, width, ...layout });
      await page.close();
    }
  }
  assert.deepEqual(errors, []);
  await writeFile(join(output, 'results.json'), JSON.stringify({ results, errors }, null, 2));
  console.log(`BKK: ${results.length} viewport/language scenarios passed; filters, chips, search, reset, empty states, assets, and i18n verified.`);
} finally {
  await browser.close();
}
