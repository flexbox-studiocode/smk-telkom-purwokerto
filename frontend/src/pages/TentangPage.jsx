import MainLayout from '../layouts/MainLayout';
import RibbonDivider from '../components/RibbonDivider';
import WaveMarquee from '../components/WaveMarquee';
import Reveal from '../components/Reveal';
import FacilitiesSection from '../components/FacilitiesSection';
import '../styles/profile.css';
import TentangHeroSection from '../components/tentang/TentangHeroSection';
import TentangAboutSection from '../components/tentang/TentangAboutSection';
import TentangVisiMisiSection from '../components/tentang/TentangVisiMisiSection';
import TentangTimelineSection from '../components/tentang/TentangTimelineSection';
import TentangKepalaSekolahSection from '../components/tentang/TentangKepalaSekolahSection';
import TentangMetodePembelajaranSection from '../components/tentang/TentangMetodePembelajaranSection';
import TentangPathwaySection from '../components/tentang/TentangPathwaySection';

const ProfileSekolahPage = () => (
  <MainLayout showOpeningMarquee={false}>
    <TentangHeroSection />
    <RibbonDivider />
    <Reveal>
      <TentangAboutSection />
    </Reveal>
    <Reveal>
      <TentangVisiMisiSection />
    </Reveal>
    <Reveal>
      <TentangTimelineSection />
    </Reveal>
    <WaveMarquee />
    <Reveal>
      <TentangKepalaSekolahSection />
    </Reveal>
    <Reveal>
      <TentangMetodePembelajaranSection />
    </Reveal>
    <FacilitiesSection variant="profile" />
    <Reveal>
      <TentangPathwaySection />
    </Reveal>
  </MainLayout>
);

export default ProfileSekolahPage;
