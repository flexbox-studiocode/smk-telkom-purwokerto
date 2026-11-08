/* global document, window, getComputedStyle */
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const output = process.env.QA_OUTPUT || '../outputs/profile-certificate';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ reducedMotion: 'reduce' });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
await page.addInitScript(() => localStorage.setItem('stela-reminder-dismissed-at', String(Date.now())));
await page.route('**/api/**', route => route.fulfill({ contentType: 'application/json', body: '[]' }));
const url = `${process.env.QA_URL || 'http://127.0.0.1:5181'}/profil-sekolah`;
try {
  for (const width of (process.env.QA_WIDTHS || '1920,1518,1440,1024,768,640,390,320').split(',').map(Number)) {
    await page.setViewportSize({ width, height: width < 768 ? 780 : 1000 });
    await page.goto(url);
    for (const language of ['id', 'en']) {
      if (await page.locator('html').getAttribute('lang') !== language) await page.getByRole('button', { name: /^Switch to / }).first().click();
      const trigger = page.getByRole('button', { name: language === 'id' ? 'Lihat Sertifikat' : 'View Certificate', exact: true });
      const closeName = language === 'id' ? 'Tutup sertifikat' : 'Close certificate';
      const dialog = page.getByRole('dialog');
      await trigger.waitFor({ state: 'visible' });
      assert.equal(await trigger.count(), 1);
      assert.equal(await page.locator('.profile-timeline li').nth(1).locator('button').count(), 1);
      await trigger.scrollIntoViewIfNeeded();
      const before = await page.evaluate(() => ({ overflow: document.body.style.overflow, scrollY: window.scrollY }));
      await trigger.focus();
      await trigger.press('Enter');
      await dialog.waitFor({ state: 'visible' });
      await dialog.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await dialog.getAttribute('aria-modal'), 'true');
      assert.equal(await dialog.locator('#school-certificate-title').innerText(), 'SMKS TELEKOMUNIKASI SANDHY PUTRA PURWOKERTO');
      assert.equal(await dialog.locator('.certificate-number').innerText(), '20301902');
      assert.match(await dialog.locator('.certificate-address').textContent(), /Jl\. Di Panjaitan No\.128 Purwokerto, Kabupaten Banyumas, Jawa Tengah/);
      assert.equal(await dialog.locator('time').getAttribute('datetime'), '2026-12-31');
      assert.match(await dialog.locator('.certificate-validity').innerText(), language === 'id' ? /Sertifikat ini berlaku sampai dengan tanggal 31 Desember 2026/ : /This certificate is valid until 31 December 2026/);
      assert.match(await dialog.locator('.certificate-badge').innerText(), language === 'id' ? /Terakreditasi A\n\(Unggul\)/ : /Accredited A\n\(Excellent\)/);
      assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden');
      assert.equal(await page.evaluate(() => document.documentElement.classList.contains('lenis-stopped')), true);
      assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), closeName);
      for (const key of ['Tab', 'Shift+Tab']) {
        await page.keyboard.press(key);
        assert(await dialog.evaluate(node => node.contains(document.activeElement)), `${width}/${language}: native focus trap ${key}`);
      }
      const geometry = await dialog.evaluate(node => {
        const box = node.getBoundingClientRect();
        const image = node.querySelector('.certificate-preview > img');
        const rendered = image.getBoundingClientRect();
        return {
          horizontal: node.scrollWidth <= node.clientWidth + 1 && document.documentElement.scrollWidth <= window.innerWidth,
          bounds: box.left >= 0 && box.right <= window.innerWidth && box.top >= 0 && box.bottom <= window.innerHeight,
          textFits: [...node.querySelectorAll('h2,dd,p')].every(text => text.scrollWidth <= text.clientWidth + 1),
          imageRatio: Math.abs(rendered.width / rendered.height - image.naturalWidth / image.naturalHeight),
          columns: getComputedStyle(node.querySelector('.certificate-content')).gridTemplateColumns.split(' ').length,
          assets: [...node.querySelectorAll('img')].every(asset => asset.complete && asset.naturalWidth > 0),
        };
      });
      assert(geometry.horizontal && geometry.bounds && geometry.textFits && geometry.assets, `${width}/${language}: dialog containment ${JSON.stringify(geometry)}`);
      assert(geometry.imageRatio < .01, 'The original document must not be cropped or distorted');
      assert.equal(geometry.columns, width >= 768 ? 2 : 1);
      await page.mouse.move(0, 0);
      await page.mouse.wheel(0, 500);
      assert(Math.abs((await page.evaluate(() => window.scrollY)) - before.scrollY) < 2, 'Background scroll remains locked');
      await dialog.screenshot({ path: `${output}/certificate-${width}-${language}.png` });
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'detached' });
      assert(await trigger.evaluate(node => document.activeElement === node), 'Esc restores trigger focus');
      assert.equal(await page.evaluate(() => document.body.style.overflow), before.overflow);
      assert.equal(await page.evaluate(() => document.documentElement.classList.contains('lenis-stopped')), false);
      assert(Math.abs((await page.evaluate(() => window.scrollY)) - before.scrollY) < 2, 'Close preserves background position');

      await trigger.click();
      await dialog.waitFor({ state: 'visible' });
      // Interior padding is not the backdrop.
      const box = await dialog.boundingBox();
      await page.mouse.click(box.x + 8, box.y + 8);
      assert(await dialog.isVisible());
      await dialog.getByRole('button', { name: closeName }).click();
      await dialog.waitFor({ state: 'detached' });
      assert(await trigger.evaluate(node => document.activeElement === node), 'Close button restores focus');

      await trigger.click();
      await dialog.waitFor({ state: 'visible' });
      await page.mouse.click(2, 2);
      await dialog.waitFor({ state: 'detached' });
      assert(await trigger.evaluate(node => document.activeElement === node), 'Backdrop restores focus');
      assert.equal(await page.evaluate(() => document.body.style.overflow), before.overflow);
      await page.locator('#perjalanan').screenshot({ path: `${output}/timeline-${width}-${language}.png`, style: 'header,nav {visibility:hidden}' });
      console.log(`PASS certificate placement, image, ID/EN, layout, focus, scroll and close methods ${width}/${language}`);
    }
  }
  // Exercise normal enter/exit animation and cleanup while an open modal's route unmounts.
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(url);
  const trigger = page.locator('.profile-certificate-action');
  await trigger.click();
  await page.getByRole('dialog').waitFor({ state: 'visible' });
  await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('dialog')).opacity) === 1);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => {
    const node = document.querySelector('#school-certificate');
    if (!node) return false;
    const backdrop = getComputedStyle(node, '::backdrop');
    return backdrop.animationName === 'certificate-backdrop-exit' && Number(backdrop.opacity) < 1;
  });
  await page.getByRole('dialog').waitFor({ state: 'detached' });
  assert.equal(await page.evaluate(() => document.body.style.overflow), '');
  await trigger.click();
  await page.getByRole('dialog').waitFor({ state: 'visible' });
  await page.evaluate(() => { window.history.pushState({}, '', '/fasilitas'); window.dispatchEvent(new window.PopStateEvent('popstate')); });
  await page.waitForFunction(() => !document.querySelector('#school-certificate'));
  assert.equal(await page.evaluate(() => document.body.style.overflow), '');
  await page.setViewportSize({ width: 640, height: 360 });
  await page.goto(url);
  await page.locator('.profile-certificate-action').click();
  const shortDialog = page.getByRole('dialog');
  await shortDialog.waitFor({ state: 'visible' });
  await shortDialog.evaluate(node => { node.scrollTop = node.scrollHeight; });
  const closeBox = await shortDialog.getByRole('button').boundingBox();
  assert(closeBox.y >= 0 && closeBox.y + closeBox.height <= 360, 'Close remains reachable while short-screen content scrolls');
  await shortDialog.getByRole('button').click();
  await shortDialog.waitFor({ state: 'detached' });
  assert.equal(await page.evaluate(() => document.body.style.overflow), '');
  assert.deepEqual(errors, []);
  console.log('PASS motion, unmount cleanup and no browser exceptions');
} finally {
  await browser.close();
}
