import { useLanguage } from '../../context/LanguageContext';
import { useId, useState } from 'react';
import { ArrowRight, ArrowUpRight, CircleHelp } from 'lucide-react';
import './JurusanFaqSection.css';
import { Link } from 'react-router-dom';
import { jurusanFaq } from '../../data/dummyData';

const JurusanFaqSection = ({ variant = 'default' }) => {
  const { t, language } = useLanguage();
  const home = variant === 'home';
  const [open, setOpen] = useState(null);
  const id = useId();
  const copy = (indonesian, english) => language === 'en' ? english : indonesian;

  return (
    <section id="faq-jurusan" className={`bg-white ${home ? 'py-16 lg:py-24' : 'jurusan-faq-listing py-8 lg:py-12'}`}>
      <div className={`mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 sm:px-6 lg:px-8 ${home ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1.95fr)] lg:gap-16' : ''}`}>
        {home && <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/50 bg-primary-50 px-4 py-1 text-xs font-extrabold uppercase tracking-wide text-primary"><CircleHelp aria-hidden="true" className="size-4" />{copy('Pusat Bantuan', 'Help Center')}</p>
          <h2 className="mt-6 font-heading text-3xl font-extrabold leading-tight tracking-tight text-dark-900 sm:text-4xl">{copy('Kenali Jurusan, Temukan', 'Explore Programs, Find')} <span className="text-primary">{copy('Jawabanmu.', 'Your Answers.')}</span></h2>
          <p className="mt-4 text-base leading-relaxed text-dark-500">{copy('Masih punya pertanyaan tentang jurusan? Temukan jawabannya di sini.', 'Still have questions about our programs? Find your answers here.')}</p>
          <Link to="/jurusan/faq" className="mt-5 inline-flex min-h-11 items-center gap-3 text-sm font-extrabold text-primary hover:underline">{t(jurusanFaq.ctaText)}<ArrowRight aria-hidden="true" className="size-4" /></Link>
          <div className="mt-6 border-t border-dark-200 pt-6">
            <p className="text-xs text-dark-500">{copy('Butuh bantuan lebih lanjut?', 'Need more help?')}</p>
            <Link to="/nexa" className="mt-3 inline-flex min-h-11 items-center gap-3 rounded-xl border border-primary px-5 py-2 text-xs font-extrabold text-primary hover:bg-primary-50">{copy('Tanya NEXA', 'Ask NEXA')}<ArrowUpRight aria-hidden="true" className="size-4" /></Link>
          </div>
        </div>}
        <div>
          <h2 className="font-heading text-xl font-extrabold text-primary sm:text-2xl"><span>{home ? 'FAQ' : t(jurusanFaq.title)}</span> <span className="text-dark-900">{home ? copy('tentang jurusan', 'about our programs') : t(jurusanFaq.titleAccent)}</span></h2>
          <div className="mt-6 space-y-4">
            {jurusanFaq.items.map((item, i) => {
              const isOpen = i === open;
              return <div key={item.q} className={`rounded-xl border transition-colors ${isOpen ? 'border-primary/50 bg-primary-50/60' : 'border-dark-200 bg-white'}`}>
                <h3><button type="button" onClick={() => setOpen(isOpen ? null : i)} aria-expanded={isOpen} aria-controls={`${id}-panel-${i}`} id={`${id}-question-${i}`} className="flex min-h-14 w-full items-center justify-between gap-4 px-5 py-4 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary sm:px-6">
                  <span className={`text-sm text-dark-900 sm:text-base ${home ? 'font-extrabold' : 'font-bold'}`}>{t(item.q)}</span>
                  <span data-open={isOpen} className={`faq-toggle flex size-8 shrink-0 items-center justify-center rounded-full ${isOpen ? 'bg-primary text-white' : 'bg-primary-50 text-primary'}`}><svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14" /><path className="faq-toggle-vertical" d="M12 5v14" /></svg></span>
                </button></h3>
                <div id={`${id}-panel-${i}`} role="region" aria-labelledby={`${id}-question-${i}`} aria-hidden={!isOpen} inert={!isOpen} data-open={isOpen} className="faq-panel">
                  <div className="faq-panel-clip">
                    <div className="mx-5 border-t border-primary/15 py-4 sm:mx-6">
                      <p className="text-sm leading-relaxed text-dark-500 sm:text-base">{home && i === 0 ? copy('Materi coding berbeda di setiap jurusan. Kenali mata pelajaran dan kompetensi masing-masing jurusan untuk menemukan pilihan yang sesuai minatmu.', 'Coding content differs across programs. Explore the subjects and competencies of each program to find the right fit for your interests.') : t(item.a)}</p>
                    </div>
                  </div>
                </div>
              </div>;
            })}
          </div>
          {!home && <Link to="/jurusan/faq" className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-primary hover:underline">{t(jurusanFaq.ctaText)}<ArrowRight aria-hidden="true" className="size-4" /></Link>}
        </div>
      </div>
    </section>
  );
};

export default JurusanFaqSection;
