// 360° School Tour panoramas. Only real captures of SMK Telkom Purwokerto belong here — never a flat photo,
// a stock sphere, or another place. A location without an entry shows an honest "not available yet" state.
//
// Key: a `campusHotspots` id (name, description and map pin come from campusData), or a new id for a place that
// is not on the map, e.g. a corridor; such an entry must set `label` and `description` (Indonesian, add the
// English text to translationsSchool.js).
// Entry, one source:
//   src:   equirectangular 2:1 JPEG/WebP (≈ 6000×3000, ≤ 3 MB) in public/panorama/, e.g. '/panorama/gedung-a.webp'.
//   embed: an official Google Maps embed URL for an existing Street View view (Maps → Share → Embed a map),
//          'https://www.google.com/maps/embed?pb=…'. Check the view really shows the school before adding it.
// Optional: yaw/pitch (radians, starting camera), zoom (0–100), and links: [{ to: '<id>', yaw, pitch }] — a link is
// a walkable path photographed in `src`, its yaw/pitch measured on that photo, and `to` an id in this object.
export const campusPanoramas = {
  // Official Google Street View (panorama Y3W9_ytV2b4JNiByYaVUqg, Apr 2026) at the gate of the school's Google
  // listing (Jl. DI Panjaitan No.128, -7.435273, 109.248963); the view shows the "Kawasan Pendidikan Telkom
  // Purwokerto" gate and the SMK Telkom Purwokerto building. Embed code from Maps → Share → Embed a map.
  gerbang: {
    label: 'Gerbang Sekolah',
    description: 'Street View Google di depan gerbang Kawasan Pendidikan Telkom Purwokerto, Jl. DI Panjaitan No.128. Geser untuk melihat sekeliling dan gunakan panah di jalan untuk berpindah posisi.',
    embed: 'https://www.google.com/maps/embed?pb=!4v1794490241590!6m8!1m7!1sY3W9_ytV2b4JNiByYaVUqg!2m2!1d-7.435289089523783!2d109.2488148231973!3f91.38260463967154!4f2.211934567099121!5f0.5387650308502678',
  },
};
