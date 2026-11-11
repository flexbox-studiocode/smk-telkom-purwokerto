/* global document, window */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const output = process.env.QA_OUTPUT || '../outputs/pathway-mobile/after';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ reducedMotion: 'reduce' });
const failures = [];
const results = [];
page.on('pageerror', error => failures.push(error.message));
await page.addInitScript(() => localStorage.setItem('stela-reminder-dismissed-at', String(Date.now())));
await page.route('**/api/**', route => route.fulfill({ contentType: 'application/json', body: '[]' }));
try {
  await page.goto(`${process.env.QA_URL || 'http://localhost:5173'}/profil-sekolah`);
  const section = page.locator('#stematel-next-pathway');
  for (const width of [320, 360, 375, 390, 412, 430, 640, 767, 768, 820, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const language of ['id', 'en']) {
      if (await page.locator('html').getAttribute('lang') !== language) await page.getByRole('button', { name: /^Switch to / }).first().click();
      await section.scrollIntoViewIfNeeded();
      await section.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
      await page.evaluate(() => document.fonts.ready);
      const geometry = await section.evaluate(section => {
        const rect = element => {
          const { x, y, width, height, right, bottom } = element.getBoundingClientRect();
          return { x, y, width, height, right, bottom };
        };
        const separate = (a, b, gap = 0) => a.right + gap <= b.x + 1 || b.right + gap <= a.x + 1 || a.bottom + gap <= b.y + 1 || b.bottom + gap <= a.y + 1;
        return {
          overflow: document.documentElement.scrollWidth > window.innerWidth,
          cards: [...section.querySelectorAll('article')].map(card => {
            const box = rect(card);
            const photo = rect(card.querySelector('.profile-pathway-student'));
            const badge = rect(card.querySelector('h3'));
            const text = rect(card.querySelector('p'));
            const icon = rect(card.querySelector('.profile-pathway-icon img'));
            const rays = rect(card.querySelector('.profile-pathway-rays'));
            const elements = [photo, badge, text, icon, ...(window.innerWidth < 768 ? [rays] : [])];
            const range = document.createRange();
            range.selectNodeContents(card.querySelector('h3'));
            return {
              title: card.querySelector('h3').textContent, box, photo, badge, text, icon, rays,
              contained: elements.every(r => r.x >= box.x - 1 && r.right <= box.right + 1 && r.y >= box.y - 1 && r.bottom <= box.bottom + 1),
              readable: [...card.querySelectorAll('h3, p')].every(el => el.scrollWidth <= el.clientWidth),
              badgeSingleLine: range.getClientRects().length === 1,
              clear: separate(photo, badge, 12) && separate(photo, text, 16) && separate(icon, badge, 16) && separate(icon, text, 16) && separate(icon, photo, 12) && separate(rays, badge, 8) && separate(rays, text, 8),
            };
          }),
        };
      });
      await section.screenshot({ path: `${output}/pathway-${width}-${language}.png`, style: 'header,nav,.fixed.bottom-4 {visibility:hidden}' });
      results.push({ width, language, ...geometry });
      if (geometry.overflow || geometry.cards.length !== 3 || geometry.cards.some(c => !c.contained || !c.readable || !c.badgeSingleLine || !c.clear)) failures.push(`${width}/${language}: ${geometry.cards.map(c => `${c.title} contained=${c.contained} clear=${c.clear} singleLine=${c.badgeSingleLine}`).join('; ')} overflow=${geometry.overflow}`);
    }
  }
  await writeFile(`${output}/results.json`, JSON.stringify({ results, failures }, null, 2));
  assert.deepEqual(failures, [], 'Pathway layout must fit without collisions');
  console.log(`PASS ${results.length} pathway viewport/language checks, decoded images, clear badges/photos/icons, contained content and no horizontal overflow.`);
} finally {
  await browser.close();
}
