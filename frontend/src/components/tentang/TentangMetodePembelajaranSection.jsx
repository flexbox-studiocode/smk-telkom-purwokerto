import { useLanguage } from '../../context/LanguageContext';
import { learningMethods, learningStages } from '../../data/profileLearning';

const TentangMetodePembelajaranSection = () => {
  const { t } = useLanguage();
  return (
    <section id="metode-pembelajaran" className="profile-section profile-learning" aria-labelledby="learning-title">
      <div className="profile-container">
        <header className="profile-learning-header">
          <div>
            <p className="profile-learning-eyebrow">{t('METODE PEMBELAJARAN')}</p>
            <h2 id="learning-title">{t('Belajar Aktif.')}<span>{t('Bertumbuh Adaptif.')}</span></h2>
          </div>
          <p className="profile-learning-intro">{t('Ekosistem Smart School yang memadukan pengalaman nyata dan teknologi.')}</p>
        </header>
        <div className="profile-learning-methods">
          {learningMethods.map(method => (
            <article className="profile-learning-method" key={method.title}>
              <img className="profile-learning-photo" src={method.image} width={method.width} height={method.height} alt={t(method.alt)} loading="lazy" />
              <div className="profile-learning-detail">
                <img className="profile-learning-icon" src={method.icon} alt="" aria-hidden="true" loading="lazy" />
                <div>
                  <h3>{t(method.title)}</h3>
                  <p>{t(method.description)}</p>
                  {method.platforms && <ul className="profile-learning-platforms" aria-label={t('Platform digital')}>
                    {method.platforms.map(({ label, href }) => <li key={label}>{href ? <a href={href} target="_blank" rel="noopener noreferrer">{label}</a> : label}</li>)}
                  </ul>}
                </div>
              </div>
            </article>
          ))}
        </div>
        <div className="profile-learning-journey">
          <h3>{t('Perjalanan Talenta Digital')}</h3>
          <ol className="profile-learning-stages">
            {learningStages.map(stage => (
              <li key={stage.grade}>
                <img src={stage.icon} width="87" height="85" alt="" aria-hidden="true" loading="lazy" />
                <div>
                  <h4>{t(stage.grade)}</h4>
                  <p className="profile-learning-stage-title">{t(stage.title)}</p>
                  <p>{t(stage.description)}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
};

export default TentangMetodePembelajaranSection;
