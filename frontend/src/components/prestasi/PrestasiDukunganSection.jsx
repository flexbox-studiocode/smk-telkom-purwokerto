import { useLanguage } from '../../context/LanguageContext';
import VideoEmbed from '../VideoEmbed';
import partnersCard from '../../assets/prestasi-remake/partnersCard.png';
import partnersCardEn from '../../assets/prestasi-remake/partnersCard-en.png';
import { videoHighlight } from '../../data/dummyData';

const PrestasiDukunganSection = () => {
  const { t, language } = useLanguage();
  return (
    <section aria-labelledby="prestasi-video-title" className="bg-white pb-6 pt-8 font-[family-name:'Plus_Jakarta_Sans',var(--font-sans)] lg:pb-[1.5184vw] lg:pt-[2.2777vw]">
      <div className="mx-auto grid w-[calc(100%-2rem)] max-w-[1769px] grid-cols-1 items-end gap-6 sm:w-[calc(100%-3rem)] lg:w-[91.76%] lg:grid-cols-[41.017%_1fr] lg:gap-[3.1726%]">
        <figure className="overflow-hidden rounded-[20px] lg:rounded-[1.0846vw]">
          <img src={language === 'en' ? partnersCardEn : partnersCard} alt={t('Didukung & Diakui Oleh. Bersama Mitra Terbaik. Didukung oleh berbagai institusi dan perusahaan ternama untuk membuka lebih banyak peluang bagi masa depan siswa. Huawei, Astra, Microsoft, Cisco, AWS, Dicoding, dan Telkom Indonesia.')} width="786" height="506" loading="lazy" className="aspect-[694/456] w-full object-cover" />
        </figure>
        <div className="min-w-0">
          <p className="flex items-center gap-3 text-sm font-semibold leading-tight text-[#cd091d] lg:gap-[0.65vw] lg:text-[clamp(0.875rem,1.0846vw,1.25rem)]">
            <span aria-hidden="true" className="h-px w-8 bg-[#cd091d] lg:w-[2.618vw]" />
            {t(videoHighlight.title)}
          </p>
          <h2 id="prestasi-video-title" className="mt-1 text-[clamp(1.25rem,2.1692vw,2.5rem)] font-bold leading-tight text-black">
            {language === 'en' ? 'Our' : 'Moment'} <span className="text-[#cd091d]">{language === 'en' ? 'Best' : 'Terbaik'}</span> {language === 'en' ? 'Moments' : 'Kami'}
          </h2>
          <div className="mt-5 lg:mt-[1.6811vw]">
            <VideoEmbed videoSrc={videoHighlight.video.videoSrc} videoId={videoHighlight.video.videoId} poster={videoHighlight.video.poster} title={t(videoHighlight.videoTitle)} desc={t(videoHighlight.videoDesc)} rasio="aspect-[535/404]" layout="horizontal" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default PrestasiDukunganSection;
