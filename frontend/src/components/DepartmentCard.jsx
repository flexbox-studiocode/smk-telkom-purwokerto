import { useLanguage } from '../context/LanguageContext';
import { ArrowRight, Code2, Gamepad2, Network, RadioTower } from 'lucide-react';
import { Link } from 'react-router-dom';

const icons = {
  code: Code2,
  gamepad: Gamepad2,
  network: Network,
  tower: RadioTower,
};

const DepartmentCard = ({ icon, name, desc, image, slug }) => {
  const { t } = useLanguage();
  const Icon = icons[icon];

  return (
    <article className="home-department-card group flex h-full flex-col overflow-hidden rounded-2xl border border-dark-100 bg-white shadow-card">
      <div className="relative">
        <div className="overflow-hidden">
          <img
            src={image}
            alt={t(name)}
            width={900}
            height={450}
            loading="lazy"
            decoding="async"
            className="department-photo w-full aspect-[2/1] object-cover object-top motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-105"
          />
        </div>
        <span className="absolute -bottom-4 left-4 flex h-9 w-9 items-center justify-center rounded-lg bg-primary shadow-md">
          <Icon className="h-4 w-4 text-white" />
        </span>
      </div>

      <div className="flex flex-1 flex-col px-4 pb-3 pt-7">
        <h3 className="font-heading text-base font-bold leading-snug text-primary">
          {t(name)}
        </h3>
        <p className="mt-1.5 text-xs leading-relaxed text-dark-500">{t(desc)}</p>
        <Link
          to={`/jurusan/${slug}`}
          className="mt-auto inline-flex items-center justify-between gap-2 pt-3 text-xs font-semibold text-primary hover:underline"
        >{t("Selengkapnya")} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </article>
  );
};

export default DepartmentCard;
