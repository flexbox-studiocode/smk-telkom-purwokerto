import { useLanguage } from '../../context/LanguageContext';
import { timelineData } from '../../data/dummyData';
import school from '../../assets/tentang/profile/school.svg';
import accreditation from '../../assets/tentang/profile/accreditation.svg';
import industry from '../../assets/tentang/profile/industry.svg';
import smartSchool from '../../assets/tentang/profile/smart-school.svg';
import ai from '../../assets/tentang/profile/ai.svg';

const icons = [school, accreditation, industry, smartSchool, ai];

const TentangTimelineSection = () => {
  const { t } = useLanguage();
  return (
    <section id="perjalanan" className="profile-section profile-history" aria-labelledby="profile-history-title">
      <div className="profile-container">
        <h2 id="profile-history-title" className="profile-section-heading">{t('Perjalanan Kami')}</h2>
        <ol className="profile-timeline">
          {timelineData.map((item, i) => (
            <li key={item.year}>
              <div className="profile-milestone">
                <span className="profile-milestone-icon"><img src={icons[i]} alt="" aria-hidden="true" /></span>
                <span className="profile-milestone-content">
                  <span className="profile-milestone-year">{item.year}</span>
                  <span className="profile-milestone-track" aria-hidden="true"><i /></span>
                  <span className="profile-milestone-title">{t(item.title)}</span>
                  <span className="profile-milestone-description">{t(item.desc)}</span>
                </span>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
};

export default TentangTimelineSection;
