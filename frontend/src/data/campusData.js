import { fasilitasData } from './fasilitasData';
import { fasilitasViews } from './fasilitasPageData';
import { facilityPhotoCovers } from './facilityPhotoCovers';
import { campusFieldPhotos } from './campusFieldPhotos';
import lineD1 from '../assets/fasilitas/campus/node-205-1122.svg';
import lineD2 from '../assets/fasilitas/campus/node-205-1115.svg';
import linePark from '../assets/fasilitas/campus/node-205-1121.svg';
import lineC from '../assets/fasilitas/campus/node-205-1137.svg';
import lineB from '../assets/fasilitas/campus/node-205-1113.svg';
import lineRpsSouth from '../assets/fasilitas/campus/node-205-1116.svg';
import lineRpsNorth from '../assets/fasilitas/campus/node-205-1149.svg';
import lineLapangan from '../assets/fasilitas/campus/node-205-1119.svg';
import lineA from '../assets/fasilitas/campus/node-205-1118.svg';
import lineLibrary from '../assets/fasilitas/campus/node-205-1903.svg';
import lineDlg from '../assets/fasilitas/campus/node-205-1922.svg';
import lineAula from '../assets/fasilitas/campus/node-205-1928.svg';
import diagonalSouth from '../assets/fasilitas/campus/node-205-1117.svg';
import diagonalNorth from '../assets/fasilitas/campus/node-205-1150.svg';

const existing = id => fasilitasData.find(item => item.id === id);
// `type` is the modal title when it differs from the map name; `preview` is a description, never a copy of the name.
const knownPlace = (id, name, { type = '', preview = '' } = {}) => ({ id, name, type, preview, description: '', image: null });
const classroomGroup = id => fasilitasViews.Kelas.find(group => group.id === id).items;
const cardPreview = (category, group, name) => fasilitasViews[category].find(item => item.id === group).items.find(card => card.name === name).preview;
export const campusFacilities = {
  'kelas-a': { content: existing('kelas-a'), rooms: classroomGroup('kelas-a'), location: 'Gedung A', list: { category: 'Kelas', group: 'kelas-a' } },
  'kelas-b': { content: existing('kelas-b'), rooms: classroomGroup('kelas-b'), location: 'Gedung B', list: { category: 'Kelas', group: 'kelas-b' } },
  'kelas-c': { content: existing('kelas-c'), rooms: classroomGroup('kelas-c'), location: 'Gedung C', list: { category: 'Kelas', group: 'kelas-c' } },
  'kelas-d': { content: existing('kelas-d'), rooms: classroomGroup('kelas-d'), location: 'Gedung D', list: { category: 'Kelas', group: 'kelas-d' } },
  gor: { content: knownPlace('gor', 'GOR', { type: 'Gedung Olahraga', preview: 'Gedung Olahraga sekolah yang memiliki lapangan futsal, lapangan basket, toilet, dan pintu masuk.' }), photos: [...facilityPhotoCovers['Lapangan Futsal'], ...facilityPhotoCovers['Lapangan Basket'], ...facilityPhotoCovers.Toilet, ...facilityPhotoCovers['Pintu Masuk']], location: 'Fasilitas Sekolah', list: { category: 'GOR', group: 'gor' } },
  perpustakaan: { content: existing('perpustakaan'), photos: [...facilityPhotoCovers['Tempat Baca'], ...facilityPhotoCovers['Rak Buku'], ...facilityPhotoCovers['Rak Tas']], list: { category: 'Perpustakaan', group: 'perpustakaan' } },
  'rps-selatan': { content: knownPlace('rps-selatan', 'RPS Selatan', { type: 'Ruang Praktik Siswa', preview: cardPreview('Laboratorium', 'lab', 'RPS. Selatan') }), photos: facilityPhotoCovers['RPS. Selatan'], list: { category: 'Laboratorium', group: 'lab', item: 'lab-6' } },
  'rps-utara': { content: knownPlace('rps-utara', 'RPS Utara', { type: 'Ruang Praktik Siswa', preview: cardPreview('Laboratorium', 'lab', 'RPS. Utara') }), photos: facilityPhotoCovers['RPS. Utara'], list: { category: 'Laboratorium', group: 'lab', item: 'lab-5' } },
  dlg: { content: knownPlace('dlg', 'DLG', { type: 'Digital Literacy Garden', preview: cardPreview('Perpustakaan', 'literasi', 'DLG') }), photos: facilityPhotoCovers.DLG, list: { category: 'Perpustakaan', group: 'literasi' } },
  'lapangan-apel': { content: knownPlace('lapangan-apel', 'Lapangan Apel'), photos: campusFieldPhotos, list: null },
  aula: { content: knownPlace('aula', 'Aula', { preview: 'Aula sekolah dengan panggung permanen di bagian depan. Aula ini juga berfungsi sebagai Gedung Olahraga (GOR) indoor dengan lapangan serbaguna untuk kegiatan olahraga siswa.' }), photos: [...facilityPhotoCovers.Panggung, ...facilityPhotoCovers['Halaman Depan'], ...facilityPhotoCovers['Area Integrasi GOR'], ...facilityPhotoCovers['Ruangan yang Luas']], list: { category: 'Aula', group: 'aula' } },
  parkiran: { content: knownPlace('parkiran', 'Parkiran', { preview: 'Area parkir kendaraan di lingkungan sekolah.' }), photos: [...facilityPhotoCovers['Parkiran Timur'], ...facilityPhotoCovers['Parkiran Utara'], ...facilityPhotoCovers['Parkiran Selatan'], ...facilityPhotoCovers['Parkiran Barat']], list: { category: 'Parkiran', group: 'parkiran' } },
};

// Pin tips normalized against the Figma image, not the page viewport. Static classes keep Tailwind aware of coordinates.
export const campusHotspots = [
  { id: 'gedung-d-1', facilityId: 'gor', label: 'GOR', node: '205:1108', x: 0.13461, y: 0.43102, position: 'left-[13.461%] top-[43.102%]' },
  { id: 'gedung-d-2', facilityId: 'kelas-d', label: 'Gedung D', node: '205:1114', x: 0.21704, y: 0.41199, position: 'left-[21.704%] top-[41.199%]' },
  { id: 'parkiran', facilityId: 'parkiran', label: 'Parkiran', node: '205:1107', x: 0.16357, y: 0.49382, position: 'left-[16.357%] top-[49.382%]' },
  { id: 'gedung-c', facilityId: 'kelas-c', label: 'Gedung C', node: '205:1136', x: 0.25714, y: 0.34158, position: 'left-[25.714%] top-[34.158%]' },
  { id: 'gedung-b', facilityId: 'kelas-b', label: 'Gedung B', node: '205:1109', x: 0.33148, y: 0.36061, position: 'left-[33.148%] top-[36.061%]' },
  { id: 'rps-selatan', facilityId: 'rps-selatan', label: 'RPS Selatan', node: '205:1111', x: 0.43285, y: 0.42531, position: 'left-[43.285%] top-[42.531%]' },
  { id: 'rps-utara', facilityId: 'rps-utara', label: 'RPS Utara', node: '205:1148', x: 0.43525, y: 0.51760, position: 'left-[43.525%] top-[51.760%]' },
  { id: 'lapangan-apel', facilityId: 'lapangan-apel', label: 'Lapangan Apel', node: '205:1112', x: 0.33116, y: 0.52141, position: 'left-[33.116%] top-[52.141%]' },
  { id: 'gedung-a', facilityId: 'kelas-a', label: 'Gedung A', node: '205:1110', x: 0.51144, y: 0.34919, position: 'left-[51.144%] top-[34.919%]' },
  { id: 'dlg', facilityId: 'dlg', label: 'DLG', node: '205:1921', x: 0.55759, y: 0.44053, position: 'left-[55.759%] top-[44.053%]' },
  { id: 'perpustakaan', facilityId: 'perpustakaan', label: 'Perpustakaan', node: '205:1902', x: 0.61106, y: 0.53473, position: 'left-[61.106%] top-[53.473%]' },
  { id: 'aula', facilityId: 'aula', label: 'Aula', node: '205:1927', x: 0.75778, y: 0.41579, position: 'left-[75.778%] top-[41.579%]' },
];
// Figma label bottom / connector endpoints, measured from the pin tip in the 3142 × 1051 image.
export const campusAnnotations = {
  'gedung-d-1': { line: lineD1, classes: '[--label-x:-1] [--label-gap:78] [--line-gap:37]' },
  'gedung-d-2': { line: lineD2, classes: '[--label-x:0] [--label-gap:93] [--line-gap:35]' },
  parkiran: { line: linePark, classes: '[--label-x:13] [--label-gap:76] [--line-gap:37]' },
  'gedung-c': { line: lineC, classes: '[--label-x:0] [--label-gap:93] [--line-gap:35]' },
  'gedung-b': { line: lineB, classes: '[--label-x:1.5] [--label-gap:117] [--line-gap:32]' },
  'rps-selatan': { line: lineRpsSouth, diagonal: diagonalSouth, subtitle: 'Ruang Praktik Siswa', classes: 'campus-rps-south [--label-x:75.5] [--dot-x:46] [--label-gap:76] [--line-gap:38]' },
  'rps-utara': { line: lineRpsNorth, diagonal: diagonalNorth, subtitle: 'Ruang Praktik Siswa', classes: 'campus-rps-north [--label-x:114] [--dot-x:38.5] [--label-gap:75] [--line-gap:38]' },
  'lapangan-apel': { line: lineLapangan, classes: '[--label-x:1.5] [--label-gap:103] [--line-gap:34]' },
  'gedung-a': { line: lineA, classes: '[--label-x:1.5] [--label-gap:78] [--line-gap:37]' },
  dlg: { line: lineDlg, subtitle: 'Digital Literacy Garden', classes: '[--label-x:23.5] [--label-gap:81] [--line-gap:37]' },
  perpustakaan: { line: lineLibrary, classes: '[--label-x:-12] [--label-gap:81] [--line-gap:37]' },
  aula: { line: lineAula, classes: '[--label-x:0] [--label-gap:78] [--line-gap:37]' },
};
export function campusIdForCard(item) {
  if (item.id?.startsWith('gor-')) return 'gor';
  const building = item.name?.match(/^Kelas ([ABCD]) /)?.[1];
  if (building) return `kelas-${building.toLowerCase()}`;
  return ({ 'RPS. Utara': 'rps-utara', 'RPS. Selatan': 'rps-selatan' })[item.name] || null;
}
