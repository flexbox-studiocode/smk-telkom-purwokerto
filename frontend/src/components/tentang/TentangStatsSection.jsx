import { useLanguage } from '../../context/LanguageContext';
import { useEffect, useRef, useState } from 'react';
import { Briefcase, Building2, GraduationCap, Trophy, Users } from 'lucide-react';
import { aboutStats } from '../../data/dummyData';
import CountUp from '../CountUp';

const icons = { users: Users, graduationCap: GraduationCap, building: Building2, briefcase: Briefcase, trophy: Trophy };

const TentangStatsSection = () => {
  const { t } = useLanguage();
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    // Section ini di atas lipatan, jadi cek langsung dulu — kalau hanya mengandalkan
    // observer, angkanya tertinggal di 0 saat observer tidak pernah menyala.
    if (el.getBoundingClientRect().top < window.innerHeight) {
      setVisible(true);
      return undefined;
    }
    const io = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setVisible(true),
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
        <div
          ref={ref}
          className="hero-floating hero-floating--stats [container-type:inline-size]"
        >
          <div className="grid grid-cols-2 gap-y-1 px-2 py-2 sm:px-3 lg:grid-cols-4 lg:divide-x lg:divide-dark-100 lg:py-3">
            {aboutStats.map((stat) => {
              const Icon = icons[stat.icon];
              return (
                <div key={stat.label} className="flex min-w-0 items-center gap-2 px-2 py-3 sm:gap-3 sm:px-4">
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary sm:h-10 sm:w-10">
                    <Icon aria-hidden="true" className="h-4 w-4 text-white sm:h-5 sm:w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-heading text-[clamp(1.25rem,2.296cqw,2.5rem)] font-extrabold tracking-[.05em] text-dark-900">
                      <CountUp value={stat.value} run={visible} duration={900} />
                    </p>
                    <p className="text-[clamp(.625rem,1.148cqw,1.25rem)] font-medium tracking-[.08em] leading-normal text-dark-500">{t(stat.label)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
  );
};

export default TentangStatsSection;
