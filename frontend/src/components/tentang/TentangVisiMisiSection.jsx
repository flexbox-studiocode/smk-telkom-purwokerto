import { useLanguage } from '../../context/LanguageContext';
import { profileMissions, profilePillars } from '../../data/profilePathway';
import vision from '../../assets/tentang/profile/vision.svg';
import mission from '../../assets/tentang/profile/mission.svg';
import schoolPhoto from '../../assets/tentang/profile/vision-school.png';
import classroomPhoto from '../../assets/tentang/profile/mission-classroom.png';
import visionAccent from '../../assets/tentang/profile/vision-accent.png';

const Card = ({ icon, title, desc }) => {
  const { t } = useLanguage();
  return (
    <article className="profile-value-card">
      <div className="profile-value-icon"><img src={icon} alt="" aria-hidden="true" /></div>
      <div className="profile-value-copy">
        <h3>{t(title)}</h3>
        <p>{t(desc)}</p>
      </div>
    </article>
  );
};

const TentangVisiMisiSection = () => {
  const { t } = useLanguage();
  return (
    <section className="profile-section profile-principles-section" aria-label={t('Visi, Misi, dan Tiga Pilar Stematel')}>
      <div className="profile-container profile-principles">
        <div className="profile-vision">
          <div className="profile-vision-grid">
            <article className="profile-principle-card profile-principle-vision">
              <img className="profile-principle-photo" src={schoolPhoto} alt="" aria-hidden="true" loading="lazy" />
              <img className="profile-vision-accent" src={visionAccent} alt="" aria-hidden="true" loading="lazy" />
              <div className="profile-principle-copy">
                <div className="profile-principle-header">
                  <img src={vision} alt="" aria-hidden="true" />
                  <div>
                    <h2>{t('Visi')}</h2>
                  </div>
                </div>
                <p className="profile-principle-description">
                  {t('Menjadi sekolah vokasi berbasis teknologi yang mencetak talenta ')}
                  <strong>{t('teknologi berstandar global')}</strong>
                </p>
              </div>
            </article>
            <article className="profile-principle-card profile-principle-mission">
              <div className="profile-mission-photo">
                <img className="profile-principle-photo" src={classroomPhoto} alt="" aria-hidden="true" loading="lazy" />
              </div>
              <div className="profile-principle-copy">
                <div className="profile-principle-header">
                  <img src={mission} alt="" aria-hidden="true" />
                  <div>
                    <h2>{t('Misi')}</h2>
                  </div>
                </div>
                <ul className="profile-missions">
                  {profileMissions.map(([before, highlight, after]) => (
                    <li key={before}>{t(before)}<strong>{t(highlight)}</strong>{t(after)}</li>
                  ))}
                </ul>
              </div>
            </article>
          </div>
        </div>
        <div className="profile-values">
          <h2 className="profile-section-heading">{t('Tiga Pilar Stematel')}</h2>
          <div className="profile-values-grid">
            {profilePillars.map(pillar => <Card key={pillar.title} {...pillar} />)}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TentangVisiMisiSection;
