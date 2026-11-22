import { Link } from 'react-router-dom';

// Tautan CTA yang bisa internal maupun eksternal. Alamat absolut (mis. portal
// resmi SPMB Telkom Schools) wajib memakai anchor asli agar browser melakukan
// navigasi normal, bukan dianggap route internal oleh React Router. Route
// internal tetap memakai navigasi client-side.
const isExternal = (href) => /^[a-z][a-z0-9+.-]*:\/\//i.test(href || '');

export default function CtaLink({ href, to, children, ...props }) {
  const target = href ?? to;
  if (isExternal(target)) return <a href={target} {...props}>{children}</a>;
  return <Link to={target} {...props}>{children}</Link>;
}
