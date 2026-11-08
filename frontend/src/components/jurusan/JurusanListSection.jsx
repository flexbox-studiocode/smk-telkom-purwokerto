import { useLanguage } from '../../context/LanguageContext';
import { ArrowRight, Code2, Gamepad2, Network, RadioTower } from 'lucide-react';
import { Link } from 'react-router-dom';
import { jurusanData, jurusanTags } from '../../data/dummyData';

const icons = { code: Code2, gamepad: Gamepad2, network: Network, tower: RadioTower };

const JurusanListSection = () => {
  const { t } = useLanguage();
  return (
    <section id="daftar-jurusan" className="bg-white py-8 lg:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 [container-type:inline-size]">
        <h2 className="font-heading text-[clamp(1.25rem,2.296cqw,2.5rem)] font-extrabold tracking-[.05em] text-dark-900">{t("Jelajahi Jurusan Kami")} </h2>

        <div className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {jurusanData.items.map((item) => {
            const Icon = icons[item.icon];
            return (
              <article
                key={item.name}
                className="group flex flex-col overflow-hidden [container-type:inline-size] rounded-2xl border border-dark-100 bg-white shadow-card transition-all hover:border-primary hover:shadow-lg"
              >
                <div className="relative">
                  <div className="overflow-hidden">
                    <img
                      src={item.image}
                      alt={t(item.name)}
                      className="w-full aspect-[2/1] object-cover object-top transition-transform duration-500 group-hover:scale-110"
                    />
                  </div>
                  <span className="absolute -bottom-4 left-4 flex h-9 w-9 items-center justify-center rounded-lg bg-primary shadow-md">
                    <Icon className="h-4 w-4 text-white" />
                  </span>
                </div>

                <div className="flex flex-1 flex-col px-4 pb-4 pt-7">
                  <h3 className="font-heading text-[clamp(.8125rem,5.65cqw,1.5rem)] font-bold leading-normal text-primary">
                    {t(item.name)}
                  </h3>
                  <p className="mt-1.5 text-[clamp(.625rem,3.529cqw,.9375rem)] font-medium leading-normal text-dark-500">{t(item.desc)}</p>

                  <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
                    {jurusanTags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded bg-dark-50 px-2 py-1 text-[clamp(.5625rem,3.529cqw,.9375rem)] font-extrabold tracking-[.12em] text-dark-600"
                      >
                        {t(tag)}
                      </span>
                    ))}
                  </div>

                  <Link
                    to={`/jurusan/${item.slug}`}
                    className="mt-4 inline-flex items-center gap-1.5 text-[clamp(.625rem,3.059cqw,.8125rem)] font-medium tracking-[.08em] text-primary hover:underline"
                  >{t("Selengkapnya")} <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default JurusanListSection;
