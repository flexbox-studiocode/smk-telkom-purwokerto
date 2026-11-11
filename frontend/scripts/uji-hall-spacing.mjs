/* global document, window */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const output = process.env.QA_OUTPUT || '../outputs/hall-spacing/after';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ reducedMotion: 'reduce' });
const failures = [];
const results = [];
const alumni = ['Prof. Dr. Ir. Moh. Khairudin, M.T., Ph.D.', 'Dr. Tenia Wahyuningrum, S.Kom., M.T.', 'Alfa Putra Kurnia'];
page.on('pageerror', error => failures.push(error.message));
await page.addInitScript(() => localStorage.setItem('stela-reminder-dismissed-at', String(Date.now())));
await page.route('**/api/**', route => route.fulfill({ contentType: 'application/json', body: '[]' }));
try {
  for (const route of ['/', '/prestasi']) {
    await page.goto(`${process.env.QA_URL || 'http://localhost:5173'}${route}`);
    const section = page.locator('#hall-of-fame');
    const group = section.locator('#hall-of-fame-cards');
    const buttons = section.locator('button[aria-controls="hall-of-fame-cards"]');
    const firstName = () => group.locator('h3').first().textContent();
    const move = async action => {
      const before = await firstName();
      await action();
      await page.waitForFunction(name => document.querySelector('#hall-of-fame-cards h3').textContent !== name, before);
    };
    for (const width of (process.env.QA_WIDTHS || '320,360,375,390,412,430,639,640,768,1024,1440,1920').split(',').map(Number)) {
      await page.setViewportSize({ width, height: 1000 });
      const count = width < 640 ? 1 : width < 1024 ? 2 : 3;
      await page.waitForFunction(count => document.querySelectorAll('#hall-of-fame article').length === count, count);
      for (const language of ['id', 'en']) {
        if (await page.locator('html').getAttribute('lang') !== language) await page.getByRole('button', { name: /^Switch to / }).first().click();
        await section.scrollIntoViewIfNeeded();
        await page.waitForFunction(() => document.querySelector('#hall-of-fame').closest('.reveal').classList.contains('visible'));
        await page.evaluate(() => document.fonts.ready);
        const seen = new Set();
        const startName = await firstName();
        for (let slide = 0; slide < (count < alumni.length ? alumni.length : 1); slide++) {
          await section.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
          const layout = await section.evaluate(section => {
            const rect = element => {
              const { x, y, width, height, right, bottom } = element.getBoundingClientRect();
              return { x, y, width, height, right, bottom };
            };
            const separate = (a, b) => a.right <= b.x + 1 || b.right <= a.x + 1 || a.bottom <= b.y + 1 || b.bottom <= a.y + 1;
            const box = rect(section);
            const group = rect(section.querySelector('#hall-of-fame-cards'));
            const cards = [...section.querySelectorAll('article')].map(card => {
              const box = rect(card);
              const photo = rect(card.firstElementChild);
              const name = rect(card.querySelector('h3'));
              const year = rect(card.querySelector(':scope > p'));
              const details = card.querySelector(':scope > div');
              const icon = rect(details.querySelector('span'));
              const role = rect(details.querySelector('p'));
              const content = [photo, name, year, icon, role];
              const gaps = { top: photo.y-box.y, photoName: name.y-photo.bottom, nameYear: year.y-name.bottom,
                yearIcon: icon.y-year.bottom, iconRole: role.y-icon.bottom, bottom: box.bottom-role.bottom };
              return { name: card.querySelector('h3').textContent, box, photo, icon, content, gaps,
                fits: content.every(r => r.x >= box.x-1 && r.right <= box.right+1 && r.y >= box.y-1 && r.bottom <= box.bottom+1)
                  && [...card.querySelectorAll('h3,p')].every(el => el.scrollWidth <= el.clientWidth),
                centered: content.every(r => Math.abs(r.x+r.width/2-box.x-box.width/2) < 1),
                ordered: Object.values(gaps).every(gap => gap >= -1),
                compact: window.innerWidth >= 640 || (gaps.top <= 13 && gaps.photoName <= 9 && gaps.nameYear <= 3
                  && gaps.yearIcon <= 13 && gaps.iconRole <= 7 && gaps.bottom <= 17),
              };
            });
            const arrows = [...section.querySelectorAll('button[aria-controls]')].map(button => ({ ...rect(button), disabled: button.disabled }));
            return { cards, arrows, overflow: document.documentElement.scrollWidth > window.innerWidth,
              arrowsClear: arrows.every(a => a.x >= box.x && a.right <= box.right && a.y >= box.y && a.bottom <= box.bottom
                && Math.abs(a.y+a.height/2-group.y-group.height/2) < 1
                && cards.every(card => card.content.every(item => separate(a, item)))),
            };
          });
          for (const card of layout.cards) seen.add(card.name);
          results.push({ route, width, language, slide, ...layout });
          if (layout.overflow || !layout.arrowsClear || layout.cards.some(c => !c.fits || !c.centered || !c.ordered || !c.compact)) failures.push(`${route} ${width}/${language}/${slide}: ${JSON.stringify(layout)}`);
          if (layout.cards.some(card => card.name === alumni[1]) && slide <= 1) await section.screenshot({ path: `${output}/${route === '/' ? 'home' : 'prestasi'}-${width}-${language}.png`, style: 'header,nav,.fixed.bottom-4 {opacity:0!important}' });
          if (count < alumni.length) await move(() => buttons.last().click());
        }
        assert.deepEqual([...seen].sort(), [...alumni].sort(), 'Every original alumni profile must be checked');
        assert.equal(await firstName(), startName, 'Next arrow must wrap back to the first slide');
        assert.equal(await buttons.first().isDisabled(), count === alumni.length);
        assert.equal(await buttons.last().isDisabled(), count === alumni.length);
        if (count < alumni.length) {
          await move(() => buttons.first().click());
          await move(() => buttons.last().click());
          await group.focus();
          await move(() => group.press('ArrowRight'));
          await move(() => group.press('ArrowLeft'));
          assert.equal(await firstName(), startName, 'Previous/next buttons and keyboard navigation must preserve ordering');
        }
      }
    }
  }
  await writeFile(`${output}/results.json`, JSON.stringify({ results, failures }, null, 2));
  assert.deepEqual(failures, [], 'Hall cards must be compact, readable, centered, contained and clear of navigation');
  console.log(`PASS ${results.length} Hall slide checks across both routes, ID/EN, all alumni, button wrap, keyboard navigation and responsive spacing.`);
} finally {
  await browser.close();
}
