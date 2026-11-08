import { useLanguage } from '../../context/LanguageContext';
import { profilePathways } from '../../data/profilePathway';
import lightbulb from '../../assets/tentang/profile/pathway-lightbulb.svg';
import graduation from '../../assets/tentang/profile/pathway-graduation.svg';
import briefcase from '../../assets/tentang/profile/pathway-briefcase.png';
import motif from '../../assets/tentang/profile/pathway-motif.svg';
import outline from '../../assets/tentang/profile/pathway-outline.png';
import rays from '../../assets/tentang/profile/pathway-rays.png';

const icons = { founder: lightbulb, scholar: graduation, professional: briefcase };

export default function TentangPathwaySection() {
  const { t } = useLanguage();
  return (
    <section id="stematel-next-pathway" className="profile-section profile-pathway" aria-labelledby="profile-pathway-title">
      <div className="profile-container">
        <img className="profile-pathway-motif" src={motif} alt="" aria-hidden="true" loading="lazy" />
        <div className="profile-pathway-pattern" aria-hidden="true">
          {[0, 1, 2, 3].map(index => <img key={index} src={outline} alt="" loading="lazy" />)}
        </div>
        <h2 id="profile-pathway-title">Stematel <span>Next Pathway</span></h2>
        <div className="profile-pathway-list">
          {profilePathways.map(pathway => (
            <article key={pathway.title} className={`profile-pathway-card profile-pathway-${pathway.variant}`}>
              <div className="profile-pathway-student">
                <div className="profile-pathway-cutout"><img src={pathway.image} alt={t(pathway.alt)} loading="lazy" /></div>
                <div className="profile-pathway-rays"><img src={rays} alt="" aria-hidden="true" loading="lazy" /></div>
              </div>
              <div className="profile-pathway-copy">
                <h3>{pathway.title}</h3>
                <p>{t(pathway.description)}</p>
              </div>
              <div className="profile-pathway-icon" aria-hidden="true">
                <img src={icons[pathway.variant]} alt="" loading="lazy" />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
