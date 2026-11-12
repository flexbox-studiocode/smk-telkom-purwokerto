import assert from 'node:assert/strict';
import { createServer } from 'vite';
const server = await createServer({ appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } });
try {
  const { campusGeometry, clampPan, panLimit, centerCampusPoint, gestureAxis, meaningfulPan, readCampusHint, saveCampusHint, campusHintKey } = await server.ssrLoadModule('/src/utils/campusPan.js');
  const desktop = campusGeometry(1280);
  assert.equal(desktop.width, 1600);
  assert.equal(desktop.initial, 0); assert.equal(desktop.inset, 83 * desktop.unit);
  assert.ok(Math.abs(desktop.maximum - (320 - 125 * desktop.unit)) < 1e-9);
  assert.equal(desktop.height, 1600 * 1314 / 3142);
  const mobile = campusGeometry(390);
  assert.equal(mobile.width, 960); assert.ok(Math.abs(mobile.maximum - (570 - 125 * mobile.unit)) < 1e-9);
  assert.ok(Math.abs(mobile.height / mobile.width - 1314 / 3142) < 0.00001);
  assert.equal(campusGeometry(3840).maximum, 0);
  assert.equal(campusGeometry(3840).initial, 0);
  assert.equal(panLimit(1200, 2100), 900);
  assert.equal(panLimit(1500, 1200), 0);
  assert.equal(clampPan(-300, 900), 0);
  assert.equal(clampPan(1300, 900), 900);
  assert.equal(clampPan(0, 0), 0);
  assert.equal(centerCampusPoint(0.75, 2000, 1000), 1000);
  assert.equal(centerCampusPoint(0.1, 2000, 1000), 0);
  assert.equal(centerCampusPoint(0.4, 2000, 1000), 300);
  assert.equal(gestureAxis(6, 1), 'pending');
  assert.equal(gestureAxis(20, 3), 'horizontal');
  assert.equal(gestureAxis(3, 20), 'vertical');
  assert.equal(gestureAxis(15, 15), 'pending');
  assert.equal(meaningfulPan(50, 50), false, 'Dragging against a bound does not move the map');
  assert.equal(meaningfulPan(50, 65), false);
  assert.equal(meaningfulPan(50, 75), true);
  const store = new Map(), storage = { getItem: key => store.get(key), setItem: (key, value) => store.set(key, value) };
  assert.equal(readCampusHint(storage), false);
  assert.equal(saveCampusHint(storage), true);
  assert.equal(readCampusHint(storage), true);
  assert.equal(store.get(campusHintKey), '1');
  const blocked = { getItem() { throw new Error('Blocked'); }, setItem() { throw new Error('Blocked'); } };
  assert.equal(readCampusHint(blocked), false);
  assert.equal(saveCampusHint(blocked), false);
  const { campusHotspots, campusFacilities, campusIdForCard } = await server.ssrLoadModule('/src/data/campusData.js');
  const { fasilitasData } = await server.ssrLoadModule('/src/data/fasilitasData.js');
  assert.equal(campusHotspots.length, 12);
  assert.equal(new Set(campusHotspots.map(point => point.id)).size, 12);
  assert.equal(new Set(campusHotspots.map(point => point.facilityId)).size, 12);
  for (const point of campusHotspots) { assert.ok(campusFacilities[point.facilityId]); assert.ok(point.x > 0 && point.x < 1 && point.y > 0 && point.y < 1); }
  for (const id of ['kelas-a', 'kelas-b', 'kelas-c', 'perpustakaan']) assert.equal(campusFacilities[id].content, fasilitasData.find(item => item.id === id), 'Reuse canonical facility record');
  assert.ok(campusFacilities['lapangan-apel'].photos.every(photo => photo.source.includes('Lapangan Upacara')), 'Field photos come from the supplied ZIP');
  for (const building of ['a', 'b', 'c', 'd']) {
    const facility = campusFacilities['kelas-' + building];
    assert.equal(facility.rooms.length, 4);
    assert.ok(facility.rooms.every(room => room.name.startsWith('Kelas ' + building.toUpperCase() + ' ')));
    assert.ok(facility.rooms[0].photos?.length, 'Each default room has a verified photo.');
  }
  assert.equal(campusFacilities['kelas-c'].rooms.find(room => room.name === 'Kelas C 2.1').photoKey, 'Kelas C 2.2');
  assert.equal(campusIdForCard({ name: 'Kelas B 1.4' }), 'kelas-b');
  assert.equal(campusIdForCard({ name: 'RPS. Utara' }), 'rps-utara');
  assert.equal(campusIdForCard({ name: 'Lab. RPL' }), null, 'Do not infer a lab location from an example card');
  const { campusPanoramas } = await server.ssrLoadModule('/src/data/campusPanoramas.js');
  const checkPanoramas = panoramas => {
    for (const [id, pano] of Object.entries(panoramas)) {
      assert.ok(!pano.src !== !pano.embed, `${id}: exactly one of src or embed`);
      if (pano.src) assert.match(pano.src, /^\/panorama\/[\w-]+\.(jpe?g|webp)$/, `${id}: src is a local panorama`);
      if (pano.embed) assert.match(pano.embed, /^https:\/\/www\.google\.com\/maps\/embed\?pb=/, `${id}: embed is an official Google Maps embed`);
      if (!campusHotspots.some(point => point.id === id)) assert.ok(pano.label && pano.description, `${id}: off-map place needs label and description`);
      for (const link of pano.links || []) { assert.ok(panoramas[link.to] && link.to !== id, `${id}: link to ${link.to} must reach another panorama`); assert.ok(pano.src && Number.isFinite(link.yaw), `${id}: link needs yaw on a photo panorama`); }
    }
  };
  checkPanoramas(campusPanoramas);
  assert.throws(() => checkPanoramas({ koridor: { src: '/panorama/koridor.webp' } }), /label and description/);
  assert.throws(() => checkPanoramas({ 'gedung-a': { src: '/panorama/a.webp', links: [{ to: 'nowhere', yaw: 0 }] } }), /must reach/);
  assert.throws(() => checkPanoramas({ 'gedung-a': { embed: 'https://example.com/fake' } }), /official Google/);
  console.log('PASS campus bounds/centering, gesture threshold/axis, real movement hint persistence/storage failure, verified hotspot IDs and shared facility data.');
} finally { await server.close(); }
