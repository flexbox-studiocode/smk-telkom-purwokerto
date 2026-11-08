import accent from '../../assets/fasilitas/nametag-accent.svg';

// Red category label for the facility lists (Figma "FASILITAS SEKOLAH", nodes 405:1300 / 405:1301).
// The body grows with the text; the darker accent tab on the right keeps its own shape.
export default function FacilityNametag({ children, as: Tag = 'h3', className = '' }) {
  return (
    <Tag className={`facility-nametag ${className}`.trim()}>
      <span className="facility-nametag__body">{children}</span>
      <img src={accent} alt="" aria-hidden="true" width="57" height="68" className="facility-nametag__accent" />
    </Tag>
  );
}
