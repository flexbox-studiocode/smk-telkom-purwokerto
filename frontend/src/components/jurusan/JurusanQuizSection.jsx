import { useLanguage } from '../../context/LanguageContext';
import { useState } from 'react';
import { ArrowRight, Check, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { jurusanData, jurusanQuiz } from '../../data/dummyData';
import nexaMotif from '../../assets/jurusan/nexa-motif.png';
const stelaBot = '/assets/branding/nexa-mark.png';

// Rekomendasi = jurusan dengan skor tertinggi dari opsi yang dipilih.
const recommend = (picked) => {
  const totals = {};
  picked.forEach((i) => {
    Object.entries(jurusanQuiz.options[i].scores).forEach(([key, n]) => {
      totals[key] = (totals[key] ?? 0) + n;
    });
  });
  const best = Object.entries(totals).sort((a, b) => b[1] - a[1])[0];
  return best ? best[0] : null;
};

const JurusanQuizSection = () => {
  const { t } = useLanguage();
  const [started, setStarted] = useState(false);
  const [picked, setPicked] = useState([]);

  const toggle = (i) =>
    setPicked((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));

  const key = recommend(picked);
  const result = key ? jurusanQuiz.results[key] : !started ? jurusanQuiz.results.RPL : null;
  // Tujuan tombol hasil diambil dari kartu jurusan yang namanya cocok, jadi
  // rekomendasi selalu mendarat di halaman detail jurusan yang benar.
  const cocok = jurusanData.items.find((item) => item.name === result?.name);
  const resultHref = cocok ? `/jurusan/${cocok.slug}` : '/jurusan';

  return (
    <section id="quiz-jurusan" className="relative overflow-hidden bg-white py-8 lg:py-12">
      {/* Aksen resmi di margin kanan, di luar tepi kotak (50% + 608px = tepi konten max-w-7xl) dengan jarak 1rem; overflow-hidden section mengunci dan memotongnya, z-0 di bawah konten (relative). Hanya tampil saat ada margin (>=1440px). */}
      <img src={nexaMotif} alt="" aria-hidden="true" width="427" height="643" className="pointer-events-none absolute left-[calc(50%+608px+1rem)] top-1/2 hidden h-auto w-[min(calc(50%-608px-1.5rem),10rem)] max-w-none -translate-y-1/2 select-none min-[1440px]:block" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 [container-type:inline-size]">
        <div className="grid grid-cols-1 items-center gap-6 rounded-2xl bg-primary/7 p-5 sm:p-6 lg:grid-cols-[1.4fr_1fr_0.8fr] lg:gap-5 lg:p-4 xl:gap-6 xl:p-5">
          {/* Ajakan */}
          <div className="flex min-w-0 flex-col items-start gap-4 min-[400px]:flex-row min-[400px]:items-center">
            <img src={stelaBot} alt="" aria-hidden="true" width="250" height="250" className="aspect-square h-auto w-24 flex-none rounded-2xl bg-primary object-contain p-4 sm:w-32 sm:p-5 lg:w-36 xl:w-44 xl:p-7" />
            <div className="min-w-0">
              <h2 className="font-heading text-[clamp(.875rem,1.378cqw,1.5rem)] font-bold leading-normal text-dark-900">{t("Belum Tahu Memilih")} <span className="text-primary">{t("Jurusan?")}</span>
              </h2>
              <p className="mt-3 text-[clamp(.75rem,1.148cqw,1.25rem)] font-medium leading-normal text-dark-600">
                {t(jurusanQuiz.description)}
              </p>
              <button
                type="button"
                onClick={() => setStarted(true)}
                className="mt-5 inline-flex min-h-11 items-center justify-center gap-3 rounded-xl bg-primary px-6 py-3 text-[clamp(.75rem,1.378cqw,1.5rem)] font-semibold tracking-[.12em] text-white transition-colors hover:bg-primary-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {t(jurusanQuiz.ctaText)}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Pilihan minat */}
          <div className="flex min-w-0 flex-col items-start gap-4">
            {jurusanQuiz.options.map((opt, i) => {
              const on = picked.includes(i);
              const highlighted = started ? on : i === 1;
              return (
                <button
                  key={opt.text}
                  type="button"
                  disabled={!started}
                  aria-pressed={on}
                  onClick={() => toggle(i)}
                  className={`min-h-11 max-w-full rounded-xl px-5 py-3 text-left text-[clamp(.75rem,1.148cqw,1.25rem)] font-medium leading-normal text-dark-900 transition-colors disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${i % 2 === 1 ? 'self-end' : ''} ${
                    highlighted
                      ? 'bg-primary/10'
                      : 'bg-white enabled:hover:bg-primary/10'
                  }`}
                >
                  {t(opt.text)}
                </button>
              );
            })}
          </div>

          {/* Hasil rekomendasi */}
          <div aria-live="polite" className="relative min-w-0 rounded-2xl border-2 border-primary/20 bg-white p-4 shadow-[0_0_12px_2px_rgba(200,16,46,0.18)] lg:p-4 xl:p-5">
            {result && (
              <span aria-hidden="true" className="absolute right-3 top-0 grid h-7 w-7 -translate-y-1/4 place-items-center rounded-full bg-primary text-white">
                <Check className="h-4 w-4" strokeWidth={3} />
              </span>
            )}
            <p className="text-[9px] font-bold text-primary">{t(jurusanQuiz.resultLabel)}</p>

            {result ? (
              <>
                <h3 className="mt-1.5 font-heading text-base font-extrabold leading-tight text-dark-900">
                  {t(result.name)}
                </h3>
                <p className="mt-2 text-[11px] text-dark-600">{t(jurusanQuiz.resultNote)}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Link
                    to={resultHref}
                    className="inline-flex min-h-11 items-center gap-2 rounded-md border border-primary/60 px-3 py-2 text-[11px] font-semibold text-primary transition-colors hover:bg-primary hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    {t(result.cta)}
                    <ArrowRight className="h-2.5 w-2.5" />
                  </Link>
                  {started && <button
                    type="button"
                    onClick={() => setPicked([])}
                    aria-label={t(jurusanQuiz.resetText)}
                    className="grid h-11 w-11 place-items-center rounded-md text-dark-500 transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>}
                </div>
              </>
            ) : (
              <p className="mt-2 text-[9px] leading-relaxed text-dark-400">
                {t(started
                  ? 'Pilih minat di samping untuk melihat rekomendasi.'
                  : 'Tekan “Mulai Sekarang” untuk mulai menjawab.')}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default JurusanQuizSection;
