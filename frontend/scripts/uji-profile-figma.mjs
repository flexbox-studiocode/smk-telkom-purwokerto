/* global document, window, getComputedStyle */
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const output = process.env.QA_OUTPUT || '../outputs/profile-figma-redesign';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ reducedMotion: 'reduce' });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
await page.addInitScript(() => localStorage.setItem('stela-reminder-dismissed-at', String(Date.now())));
await page.route('**/api/**', route => route.fulfill({ contentType: 'application/json', body: '[]' }));
try {
  for (const width of (process.env.QA_WIDTHS || '1920,1847,1440,1280,1024,768,390,320').split(',').map(Number)) {
    await page.setViewportSize({ width, height: 1100 });
    await page.goto(`${process.env.QA_URL || 'http://127.0.0.1:5181'}/profil-sekolah`);
    for (const language of ['id', 'en']) {
      if (await page.locator('html').getAttribute('lang') !== language) await page.getByRole('button', { name: /^Switch to / }).first().click();
      await page.locator('#profil').scrollIntoViewIfNeeded();
      await page.locator('#profil').screenshot({ path: `${output}/about-${width}-${language}.png`, style: 'header,nav,.fixed.bottom-4 {visibility:hidden}' });
      const principles = page.locator('section[aria-label]').filter({ has: page.locator('.profile-vision-grid') });
      await principles.scrollIntoViewIfNeeded();
      assert.equal(await principles.locator('.profile-principle-photo').count(), 2, 'Both vision/mission cards need their Figma photo');
      await principles.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await principles.locator('.profile-missions li').count(), 5);
      if (width >= 768) assert.notEqual(await principles.locator('.profile-value-card').first().evaluate(card => getComputedStyle(card, '::after').backgroundImage), 'none', 'The pillars must be connected by the red ribbon');
      const cards = await principles.locator('.profile-principle-card').first().boundingBox();
      assert.ok(cards.width > 200);
      const aboutPanel = await page.locator('.profile-about-panel').boundingBox();
      const visionGrid = await principles.locator('.profile-vision-grid').boundingBox();
      assert.ok(Math.abs(aboutPanel.x - visionGrid.x) < 1 && Math.abs(aboutPanel.width - visionGrid.width) < 1, 'The redesign must share the existing About container width');
      if (width < 768) {
        for (const card of await principles.locator('.profile-principle-card').all()) {
          const description = await card.locator('.profile-principle-copy').boundingBox();
          const photo = await card.locator('.profile-principle-photo').boundingBox();
          assert.ok(photo.y + photo.height * .25 > description.y + description.height, `The readable copy must sit above the photo on smaller screens: ${JSON.stringify({ width, language, photo, description })}`);
        }
      }
      const valueLayout = await principles.locator('.profile-values-grid').evaluate(grid => ({
        columns: getComputedStyle(grid).gridTemplateColumns.split(' ').length,
        heights: [...grid.children].map(card => card.getBoundingClientRect().height),
        contained: [...grid.children].every(card => {
          const box = card.getBoundingClientRect();
          return [...card.querySelectorAll('h3, p')].every(text => {
            const rect = text.getBoundingClientRect();
            return rect.left >= box.left && rect.right <= box.right + 1 && rect.bottom <= box.bottom;
          });
        }),
      }));
      assert.equal(valueLayout.columns, width >= 768 ? 3 : 1);
      assert.ok(Math.max(...valueLayout.heights) - Math.min(...valueLayout.heights) < 1);
      assert.ok(valueLayout.contained, `${width}/${language}: value text must fit its card`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, `${width}/${language}: page overflow`);
      await principles.screenshot({ path: `${output}/principles-${width}-${language}.png`, style: 'header,nav,.fixed.bottom-4 {visibility:hidden}' });
      const history = page.locator('#perjalanan');
      await history.scrollIntoViewIfNeeded();
      await history.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
      assert.deepEqual(await history.locator('.profile-milestone-year').allTextContents(), ['1993', '2016', '2020', '2023', '2026']);
      assert.equal(await history.locator('button').count(), 0, 'Static milestones should not be misleading controls');
      const milestones = await history.locator('.profile-milestone').evaluateAll(items => items.map(item => {
        const box = item.getBoundingClientRect();
        return { x: box.x, y: box.y, right: box.right, bottom: box.bottom, textFits: [...item.querySelectorAll('.profile-milestone-title, .profile-milestone-description')].every(text => text.scrollWidth <= text.clientWidth && text.getBoundingClientRect().right <= box.right + 1) };
      }));
      assert.ok(milestones.every(item => item.textFits), `${width}/${language}: timeline text fits`);
      for (let i = 1; i < milestones.length; i++) {
        if (width >= 1024) {
          assert.ok(Math.abs(milestones[i].y - milestones[0].y) < 1);
          assert.ok(milestones[i].x >= milestones[i - 1].right);
        } else assert.ok(milestones[i].y > milestones[i - 1].bottom);
      }
      await history.screenshot({ path: `${output}/history-${width}-${language}.png`, style: 'header,nav,.fixed.bottom-4 {visibility:hidden}' });
      const pathway = page.locator('#stematel-next-pathway');
      await pathway.scrollIntoViewIfNeeded();
      await pathway.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
      assert.deepEqual(await pathway.locator('h3').allTextContents(), ['The Founder', 'The Scholar', 'Professional']);
      const geometry = await pathway.locator('article').evaluateAll(cards => cards.map(card => {
        const box = card.getBoundingClientRect();
        const student = card.querySelector('.profile-pathway-student').getBoundingClientRect();
        const texts = [...card.querySelectorAll('h3,p')];
        return {
          textFits: texts.every(text => text.scrollWidth <= text.clientWidth && text.getBoundingClientRect().bottom <= box.bottom + 1),
          separate: texts.every(text => { const copy = text.getBoundingClientRect(); return copy.left >= student.right - 1 || copy.right <= student.left + 1 || copy.top >= student.bottom - 1; }),
          visible: student.width > 60 && student.left >= 0 && student.right <= window.innerWidth,
        };
      }));
      assert(geometry.every(item => item.textFits && item.separate && item.visible), `${width}/${language}: pathway copy and cutouts fit without overlap ${JSON.stringify(geometry)}`);
      assert.equal(await pathway.locator('.profile-pathway-cutout img').evaluateAll(images => images.every(image => image.alt && image.naturalWidth > 0)), true);
      await pathway.screenshot({ path: `${output}/pathway-${width}-${language}.png`, style: 'header,nav,.fixed.bottom-4 {visibility:hidden}' });
      console.log(`PASS profile vision, values, history ${width}/${language}`);
    }
  }
  for (const language of ['id', 'en']) {
    await page.goto(`${process.env.QA_URL || 'http://127.0.0.1:5181'}/profil-sekolah`);
    if (await page.locator('html').getAttribute('lang') !== language) await page.getByRole('button', { name: /^Switch to / }).first().click();
    assert.equal(await page.locator('.profile-video video').count(), 0, 'The video loads only after activation');
    const play = page.locator('.profile-video button');
    assert.match(await play.getAttribute('aria-label'), language === 'id' ? /^Putar video:/ : /^Play video:/);
    await play.focus();
    await play.press('Enter');
    await page.waitForFunction(() => document.querySelector('.profile-video video')?.currentTime > 0, null, { timeout: 20000 });
    assert.equal(await page.locator('.profile-video video').getAttribute('controls'), '');
    await page.locator('.profile-video video').evaluate(video => video.pause());
    console.log(`PASS native school video playback and keyboard activation ${language}`);
  }
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of ['/', '/fasilitas', '/profil-sekolah/guru']) {
      await page.goto(`${process.env.QA_URL || 'http://127.0.0.1:5181'}${route}`);
      await page.locator('h1').first().waitFor();
      for (const language of ['id', 'en']) {
        if (await page.locator('html').getAttribute('lang') !== language) await page.getByRole('button', { name: /^Switch to / }).first().click();
        assert.equal(await page.getByRole('banner').count(), 1);
        assert.equal(await page.getByRole('contentinfo').count(), 1);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, `${route}/${width}/${language}: regression overflow`);
      }
      console.log(`PASS adjacent route smoke ${route} ${width} ID/EN`);
    }
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}

