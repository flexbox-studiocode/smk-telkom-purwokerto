import { useLanguage } from '../../context/LanguageContext';
import { useState } from 'react';
import { Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { jurusanCompare } from '../../data/dummyData';

const Stars = ({ score }) => {
  const { t } = useLanguage();
  return (
  <span className="inline-flex items-center gap-0.5" aria-label={t('{score} dari 5', { score })}>
    {[1, 2, 3, 4, 5].map((n) => {
      const filled = score >= n;
      const half = !filled && score >= n - 0.5;
      return (
        <span key={n} className="relative inline-block">
          <Star className="h-3 w-3 text-dark-200" fill="currentColor" strokeWidth={0} />
          {(filled || half) && (
            <span
              className="absolute inset-0 overflow-hidden"
              style={{ width: filled ? '100%' : '50%' }}
            >
              <Star className="h-3 w-3 text-primary" fill="currentColor" strokeWidth={0} />
            </span>
          )}
        </span>
      );
    })}
  </span>
  );
};

const JurusanCompareSection = () => {
  const { t } = useLanguage();
  const [active, setActive] = useState(null);

  return (
    <section className="bg-white py-8 lg:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 [container-type:inline-size]">
        <h2 className="font-heading text-[clamp(1.25rem,2.296cqw,2.5rem)] font-extrabold text-dark-900">
          {t(jurusanCompare.title)} <span className="text-primary">{t(jurusanCompare.titleAccent)}</span>
        </h2>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[44rem] border-collapse text-left">
            <thead>
              <tr className="bg-dark-50">
                <th className="border border-dark-100 px-4 py-2.5 text-[11px] font-bold text-dark-700">{t("Aspek")} </th>
                {jurusanCompare.columns.map((col, i) => (
                  <th
                    key={col}
                    onMouseEnter={() => setActive(i)}
                    onMouseLeave={() => setActive(null)}
                    className={`cursor-default border border-dark-100 px-4 py-2.5 text-center text-[11px] font-bold transition-colors ${
                      active === i ? 'bg-primary text-white' : 'text-dark-700'
                    }`}
                  >
                    {t(col)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {jurusanCompare.rows.map((row) => (
                <tr key={row.aspek}>
                  <th
                    scope="row"
                    className="border border-dark-100 px-4 py-2.5 text-[10px] font-medium text-dark-600"
                  >
                    {t(row.aspek)}
                  </th>
                  {row.values.map((val, i) => (
                    <td
                      key={`${row.aspek}-${jurusanCompare.columns[i]}`}
                      onMouseEnter={() => setActive(i)}
                      onMouseLeave={() => setActive(null)}
                      className={`border border-dark-100 px-4 py-2.5 text-center text-[10px] text-dark-600 transition-colors ${
                        active === i ? 'bg-primary-50' : ''
                      }`}
                    >
                      {row.type === 'stars' && <Stars score={val} />}
                      {row.type === 'badge' && (
                        <span className="inline-block rounded bg-dark-50 px-2 py-1 text-[9px] font-semibold text-dark-600">
                          {t(val)}
                        </span>
                      )}
                      {row.type === 'text' && t(val)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-center">
          <Link
            to="/jurusan/perbandingan"
            className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-white px-6 py-2.5 text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-white"
          >
            {t(jurusanCompare.ctaText)}
          </Link>
        </div>
      </div>
    </section>
  );
};

export default JurusanCompareSection;
