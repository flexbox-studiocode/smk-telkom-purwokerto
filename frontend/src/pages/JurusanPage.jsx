import MainLayout from '../layouts/MainLayout';
import Reveal from '../components/Reveal';
import RibbonDivider from '../components/RibbonDivider';
import WaveMarquee from '../components/WaveMarquee';
import JurusanHeroSection from '../components/jurusan/JurusanHeroSection';
import JurusanListSection from '../components/jurusan/JurusanListSection';
import JurusanQuizSection from '../components/jurusan/JurusanQuizSection';
import PartnersSection from '../components/PartnersSection';
import JurusanCompareSection from '../components/jurusan/JurusanCompareSection';
import JurusanShowcaseSection from '../components/jurusan/JurusanShowcaseSection';
import JurusanFaqSection from '../components/jurusan/JurusanFaqSection';

const JurusanPage = () => (
  <MainLayout showOpeningMarquee={false}>
    <JurusanHeroSection />
    <RibbonDivider className="w-full min-h-12 sm:min-h-16" />
    <Reveal>
      <JurusanListSection />
    </Reveal>
    <WaveMarquee />
    <Reveal>
      <JurusanQuizSection />
    </Reveal>
    <Reveal>
      <JurusanCompareSection />
    </Reveal>
    <Reveal>
      <PartnersSection />
    </Reveal>
    <Reveal>
      <JurusanShowcaseSection />
    </Reveal>
    <Reveal>
      <JurusanFaqSection />
    </Reveal>
  </MainLayout>
);

export default JurusanPage;
