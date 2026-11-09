import mask from '../../assets/pengumuman/featured/MaskGroup.svg';
import e187 from '../../assets/pengumuman/featured/Ellipse187.svg';
import e188 from '../../assets/pengumuman/featured/Ellipse188.svg';
import e192 from '../../assets/pengumuman/featured/Ellipse192.svg';
import e193 from '../../assets/pengumuman/featured/Ellipse193.svg';
import e194 from '../../assets/pengumuman/featured/Ellipse194.svg';
import e195 from '../../assets/pengumuman/featured/Ellipse195.svg';
import v71 from '../../assets/pengumuman/featured/Vector71.svg';
import v76 from '../../assets/pengumuman/featured/Vector76.svg';
import v77 from '../../assets/pengumuman/featured/Vector77.svg';
import v81 from '../../assets/pengumuman/featured/Vector81.svg';
import v60 from '../../assets/pengumuman/featured/Vector60.svg';
import v61 from '../../assets/pengumuman/featured/Vector61.svg';
import v62 from '../../assets/pengumuman/featured/Vector62.svg';
import v63 from '../../assets/pengumuman/featured/Vector63.svg';
import v64 from '../../assets/pengumuman/featured/Vector64.svg';
import v65 from '../../assets/pengumuman/featured/Vector65.svg';
import v66 from '../../assets/pengumuman/featured/Vector66.svg';
import v67 from '../../assets/pengumuman/featured/Vector67.svg';
import v68 from '../../assets/pengumuman/featured/Vector68.svg';
import v69 from '../../assets/pengumuman/featured/Vector69.svg';

// Local coordinates reproduce the Figma ornaments without scaling page content.
const top = [[v81, 642, 2, 62, 48, -90], [v77, 656, 40, 59, 44, 90], [v76, 683, 6, 58, 45, -90], [v71, 694, 40, 62, 48, 90], [e194, 742, 2, 48, 52, 180], [e193, 742, 51, 51, 48, 90], [e195, 790, 2, 52, 52, -90], [e192, 790, 51, 52, 51, 0], [e188, 842, 2, 100, 52, 90], [e187, 894, 2, 100, 48, -90]];
const corners = [[v60, 1221, 49, 45, 41, 90, true], [v61, 1221, 4, 45, 41, -90], [v62, 1266, 0, 49, 48, -90, true], [v63, 1266, 49, 48, 45, 90], [v64, 1349, 21, 44, 45, -90]];
const bottom = [[v65, 1477, 452, 45, 41, -90, true], [v66, 1477, 497, 42, 33, 90], [v67, 1425, 497, 49, 48, 90, true], [v68, 1425, 452, 48, 45, -90], [v69, 1346, 480, 44, 45, 90]];
function Pieces({ pieces }) {
  return pieces.map(([src, x, y, width, height, rotation, flip], index) => {
    const turned = Math.abs(rotation) === 90;
    const boxWidth = turned ? height : width;
    const boxHeight = turned ? width : height;
    return <image key={index} href={src} x={-width / 2} y={-height / 2} width={width} height={height} transform={`translate(${x + boxWidth / 2} ${y + boxHeight / 2}) rotate(${rotation}) scale(1 ${flip ? -1 : 1})`} />;
  });
}
function Diamonds({ x, y }) {
  return <g fill="#bdbdbd">
    {[0, 1, 2, 3].map(index => <path key={index} d="M24 0 48 23 24 46 0 23Z" transform={`translate(${x + index % 2 * 48} ${y + Math.floor(index / 2) * 46})`} />)}
    <rect x={x - 104} y={y} width="104" height="94" />
    <path d={`M${x - 52} ${y} l52 47 -52 47 -52 -47Z`} fill="white" />
    <path d={`M${x - 52} ${y + 25} l23 22 -23 22 -23 -22Z`} fill="#cd091d" />
  </g>;
}
export default function FeaturedAnnouncementAccents() {
  return <div className="announcement-accents" aria-hidden="true">
    <svg viewBox="0 0 1514 548" preserveAspectRatio="none" focusable="false">
      <image href={mask} width="1521" height="548" />
      <path className="announcement-white-end" d="M942 0H1514V548H942Z" fill="white" />
      <g className="announcement-top-ornaments"><Pieces pieces={top} /></g>
      <g className="announcement-right-ornaments"><Diamonds x={1418} y={2} /><Pieces pieces={corners} /><Diamonds x={1225} y={452} /><Pieces pieces={bottom} /></g>
    </svg>
  </div>;
}
