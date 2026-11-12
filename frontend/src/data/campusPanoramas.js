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
export const campusPanoramas = {};
