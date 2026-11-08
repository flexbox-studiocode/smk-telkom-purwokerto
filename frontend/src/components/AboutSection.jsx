import './AboutSection.css';
import { useLanguage } from '../context/LanguageContext';
import { Link } from 'react-router-dom';
import VideoEmbed from './VideoEmbed';
import AboutPhotoAccents from './AboutPhotoAccents';
import berandaPoster from '../assets/landing/beranda-poster.webp';
import aboutPlay from '../assets/landing/about-play.svg';
import aboutArrow from '../assets/landing/about-arrow.svg';
import Reveal from './Reveal';
import TextReveal from './TextReveal';
import { landingAbout } from '../data/dummyData';
import accreditation from '../assets/landing/about-accreditation.png';
import facilitiesIcon from '../assets/landing/about-facilities.svg';
import teacherIcon from '../assets/landing/about-teacher.svg';
import curriculumIcon from '../assets/landing/about-curriculum.svg';

const badgeDelays = ['delay-0', 'delay-100', 'delay-200', 'delay-300'];

const AboutSection = () => {
  const { t, language } = useLanguage();
  const [titleLead, ...titleRest] = t(landingAbout.title).split(' ');
  return (
  <section id="tentang" className="relative isolate bg-white pb-10 pt-8 sm:pb-12 lg:pb-14 lg:pt-0">
    <img src="/assets/branding/about-background.png" alt="" aria-hidden="true" loading="lazy" className="about-background pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover object-right" />
    {/* Preserve Figma's 715:694 columns and 111/1609 gap inside the site's 80rem container. */}
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="[container-type:inline-size]">
      <div className="grid grid-cols-1 items-start gap-y-8 pl-[6.294%] lg:grid-cols-[minmax(0,715fr)_minmax(0,694fr)] lg:gap-x-[6.899cqw] lg:gap-y-0 lg:pl-[3.045%] lg:pr-[2.486%]">
        {/* Video profil asli baru dimuat setelah tombol putar ditekan. */}
        <Reveal className="relative isolate [container-type:inline-size] lg:mt-[2.362cqw]">
          <span aria-hidden="true" className="pointer-events-none absolute -left-[2.517%] -top-[3.357cqw] bottom-0 right-[0.14%] rounded-[clamp(0.5rem,2.797cqw,1.25rem)] bg-[#cd091d]" />
          <VideoEmbed
            videoSrc={landingAbout.video.videoSrc}
            videoId={landingAbout.video.videoId}
            poster={berandaPoster}
            appearance="about"
            playIcon={aboutPlay}
            posterCaption={language === 'en' ? t('Selain itu, kami juga memfasilitasi pembelajaran mandiri') : undefined}
            title={t(landingAbout.video.title)}
            desc={t(landingAbout.video.desc)}
            rasio="aspect-[715/474]"
            className="relative"
            showCaption={false}
          />
          <AboutPhotoAccents />
        </Reveal>

        {/* Teks + badge */}
        <div className="min-w-0">
          <div>
            <h2 className="font-heading text-[1.75rem] font-extrabold leading-normal tracking-normal text-dark-900 sm:text-[2rem] lg:text-[clamp(1.75rem,2.983cqw,3rem)]">
              {titleLead} <span className="text-[#cd0b20]">{titleRest.join(' ')}</span>
            </h2>
            <TextReveal
              text={t(landingAbout.description)}
              className="mt-2 text-base font-medium leading-normal text-dark-900 lg:mt-[0.497cqw] lg:min-h-[5.159cqw] lg:max-w-[94.67%] lg:text-[clamp(0.875rem,1.243cqw,1.25rem)]"
            />
          </div>

          <div className="mt-6 grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 lg:-ml-[0.249cqw] lg:mr-[0.249cqw] lg:mt-[1.864cqw] lg:gap-x-[1.554cqw] lg:gap-y-[1.243cqw]">
            {landingAbout.badges.map((badge, index) => (
              <Reveal
                key={badge.title}
                className={`${badgeDelays[index % badgeDelays.length]} flex min-w-0 items-center gap-3 rounded-2xl border border-primary bg-white p-3 text-left lg:min-h-[7.769cqw] lg:gap-[1.243cqw] lg:rounded-[1.243cqw] lg:p-[1.119cqw]`}
              >
                <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center lg:size-[clamp(2.5rem,4.972cqw,5rem)]">
                  <img src={[accreditation, facilitiesIcon, teacherIcon, curriculumIcon][index]} alt="" className={`h-auto object-contain ${index === 0 ? 'w-full' : 'w-[80%]'}`} />
                </span>
                <div className="min-w-0">
                  <p className="font-heading text-base font-bold leading-tight text-primary lg:text-[clamp(0.875rem,1.492cqw,1.5rem)]">
                    {t(badge.title)}
                  </p>
                  <p className="mt-1 text-sm font-bold leading-normal text-dark-600 lg:text-[clamp(0.75rem,0.994cqw,1rem)]">
                    {t(badge.desc)}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>

          <Link
            to="/profil-sekolah"
            className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-primary-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary lg:-ml-[0.249cqw] lg:mt-[1.368cqw] lg:min-h-[4.413cqw] lg:min-w-[20.759cqw] lg:justify-center lg:rounded-[1.243cqw] lg:text-[clamp(0.875rem,1.492cqw,1.5rem)]"
          >
            {t(landingAbout.ctaText)}
            <img src={aboutArrow} alt="" className="h-auto w-5 shrink-0 lg:w-[2.051cqw]" />
          </Link>
        </div>
      </div>
      </div>
    </div>
  </section>
  );
};

export default AboutSection;
