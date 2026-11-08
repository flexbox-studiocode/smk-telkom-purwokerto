import RichContent from '../components/RichContent';
import { useSiteSettings } from '../context/SiteSettingsContext';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MessageCircle } from 'lucide-react';
import MainLayout from '../layouts/MainLayout';
import HeroSection from '../components/HeroSection';
import Reveal from '../components/Reveal';
import PartnersSection from '../components/PartnersSection';
import SpmbOrnaments from '../components/ppdb/SpmbOrnaments';
import PublicDataState from '../components/PublicDataState';
import useSpmbInformation from '../hooks/useSpmbInformation';
import { useLanguage } from '../context/LanguageContext';
import { ppdbMeta, quickLinks, mitraIndustri } from '../data/dummyData';
import { spmbContact } from '../data/spmbInfo';
import { registrationForSpmb, safeSpmbLink, toSpmbWave } from '../utils/spmbInformation';
import { registrationCountdown, registrationState } from '../utils/spmbSchedule';
import { OFFICIAL_ADMISSIONS_URL } from '../utils/admissions';
import hero from '../assets/spmb/hero-1248.webp';
import hero640 from '../assets/spmb/hero-640.webp';
import hero960 from '../assets/spmb/hero-960.webp';
import timelineLeft from '../assets/spmb/timeline-left.png';
import timelineRight from '../assets/spmb/timeline-right.png';
import tableLeft from '../assets/spmb/table-left.png';
import tableCorner from '../assets/spmb/table-corner.png';
import account from '../assets/spmb/step-account.svg';
import data from '../assets/spmb/step-data.svg';
import upload from '../assets/spmb/step-upload.svg';
import program from '../assets/spmb/step-program.svg';
import selection from '../assets/spmb/step-selection.svg';
import result from '../assets/spmb/step-result.svg';
import register from '../assets/spmb/step-register.svg';
import easy from '../assets/spmb/scheme-easy.svg';
import digitest from '../assets/spmb/scheme-digitest.svg';
import service from '../assets/spmb/scheme-service.svg';
import documents from '../assets/spmb/documents.svg';
import requirements from '../assets/spmb/requirements.svg';
import check from '../assets/spmb/check.svg';
import './SpmbPage.css';

const icons = { account, data, upload, program, selection, result, register, easy, digitest, service };
const stateLabels = { unknown: 'Jadwal belum tersedia', upcoming: 'Akan Dibuka', open: 'Sedang Berlangsung', closed: 'Ditutup' };
const admissionLinks = [{ title: 'Alur SPMB', desc: 'Lihat langkah dari buat akun sampai daftar ulang.', linkLabel: 'Lihat Alur', href: '/spmb#alur-spmb', icon: 'userPlus' }, ...quickLinks.slice(1)];
const content = {
  hashtags: ['#NextGen', '#GlobalTechnopreneur'], title: 'Wujudkan Mimpimu', titleAccent: 'di Dunia Digital',
  description: `Daftar SPMB SMK Telkom Purwokerto Tahun Ajaran ${ppdbMeta.tahun}/${Number(ppdbMeta.tahun) + 1} dan mulai langkah pertamamu menuju karier di bidang teknologi.`,
  primaryCta: { label: 'Daftar SPMB', href: OFFICIAL_ADMISSIONS_URL }, secondaryCta: { label: 'Lihat Jurusan', href: '/jurusan' },
};

function InformationLink({ href, className, children }) {
  if (!safeSpmbLink(href)) return <div className={className}>{children}</div>;
  return href.startsWith('/') ? <Link to={href} className={className}>{children}</Link> : <a href={href} target="_blank" rel="noopener noreferrer" className={className}>{children}</a>;
}
function RegistrationInfo({ schedule, closed = false }) {
  const { t } = useLanguage();
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!schedule.opensAt && !schedule.closesAt) return;
    const tick = () => { if (document.visibilityState === 'visible') setNow(Date.now()); };
    const timer = setInterval(tick, 1000); document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', tick); };
  }, [schedule.opensAt, schedule.closesAt]);
  const state = closed ? 'closed' : registrationState(schedule, now), countdown = closed ? null : registrationCountdown(schedule, now);
  return <Reveal as="section" className="spmb-container spmb-information" aria-label={t('Informasi Pendaftaran')}>
    <div className="spmb-information-bar" aria-hidden="true" />
    <div className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="spmb-info-card"><h2>{t('Status')} <span aria-hidden="true">•</span></h2><p>{t(stateLabels[state])}</p><strong>{t(state === 'unknown' ? 'Menunggu jadwal resmi' : state === 'upcoming' ? 'Pendaftaran belum dibuka' : state === 'open' ? 'Pendaftaran dibuka' : 'Pendaftaran ditutup')}</strong></div>
      <div className="spmb-info-card"><h2>{t('Gelombang Aktif')}</h2><p>{schedule.wave || t('Belum tersedia')}</p>{countdown ? <div className="spmb-countdown" role="timer" aria-label={t('Sisa waktu pendaftaran')}>{countdown.map((value, index) => <span key={index}><strong>{String(value).padStart(2, '0')}</strong><small>{t(['Hari', 'Jam', 'Menit', 'Detik'][index])}</small></span>)}</div> : <strong>{t(state === 'closed' ? 'Pendaftaran ditutup' : 'Jadwal belum tersedia')}</strong>}</div>
      <div className="spmb-info-card"><h2>{t('Total Pendaftar')}</h2><p>{t('Jumlah Calon Siswa')}</p><strong>{schedule.applicants === null ? t('Data belum tersedia') : new Intl.NumberFormat('id-ID').format(schedule.applicants)}</strong>{schedule.quota !== null && <small className="mt-2 block text-dark-500">{t('Kuota tersedia: {count}', { count: new Intl.NumberFormat('id-ID').format(schedule.quota) })}</small>}</div>
      <div className="spmb-info-card"><h2>{t('Kontak Langsung')}</h2><p>{t('Hubungi Panitia SPMB')}</p><a href={spmbContact.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 font-semibold text-primary"><MessageCircle className="size-5" />WhatsApp</a><small className="block text-dark-500">{spmbContact.number}</small></div>
    </div>
  </Reveal>;
}

export default function SpmbPage({ initialData }) {
  const { settings } = useSiteSettings();
  const { t, locale } = useLanguage();
  const spmbOpen = settings?.spmbOpen ?? settings?.spmb_open;
  const academicYear = settings?.academicYear ?? settings?.academic_year ?? `${ppdbMeta.tahun}/${Number(ppdbMeta.tahun) + 1}`;
  const schoolName = settings?.schoolName ?? settings?.school_name ?? 'SMK Telkom Purwokerto';
  const liveContent = {...content, description: t(content.description).replace(`${ppdbMeta.tahun}/${Number(ppdbMeta.tahun) + 1}`, academicYear).replace('SMK Telkom Purwokerto', schoolName), primaryCta: spmbOpen === false ? { label: t('Pendaftaran ditutup'), href: '/spmb#informasi-pendaftaran' } : content.primaryCta};
  const { items, stats, loading, error, refresh } = useSpmbInformation(true, initialData);
  const schedule = registrationForSpmb(items, stats);
  const spmbSteps = items.filter(item => item.jenis === 'timeline');
  const spmbSchemes = items.filter(item => item.jenis === 'skema');
  const spmbWaves = items.filter(item => item.jenis === 'jadwal').map(toSpmbWave);
  const ppdbDokumen = items.filter(item => item.jenis === 'persyaratan');
  const terms = items.filter(item => item.jenis === 'syarat');
  const empty = <p role="status" className="py-6 text-center text-xs leading-relaxed text-dark-500">{t('Informasi belum dipublikasikan.')}</p>;
  const formatDate = value => value ? new Intl.DateTimeFormat(locale, { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value)) : t('Belum diumumkan');
  return <MainLayout className="spmb-page" ctaHref={OFFICIAL_ADMISSIONS_URL}>
    <HeroSection page="spmb" content={liveContent} links={admissionLinks} breadcrumb={{ current: 'SPMB', parent: 'Informasi', parentTo: null }} media={{ src: hero, srcSet: `${hero640} 640w, ${hero960} 960w, ${hero} 1248w`, width: 1248, height: 676, className: 'spmb-hero-image', composition: 'admissions' }} />
    {settings && <p id="informasi-pendaftaran" role="status" className="mx-auto max-w-7xl px-4 py-3 text-sm">{academicYear} · {t(spmbOpen ? "Pendaftaran dibuka" : "Pendaftaran ditutup")}</p>}
    <div className="spmb-container"><PublicDataState loading={loading} error={error ? t('Informasi pendaftaran belum tersedia. Silakan coba lagi nanti.') : ''} onRetry={() => refresh()} label={t('informasi SPMB')} /></div>
    <RegistrationInfo schedule={schedule} closed={spmbOpen === false} />
    <section id="alur-spmb" className="spmb-section relative overflow-hidden scroll-mt-28" aria-labelledby="spmb-timeline-title">
      <img src={timelineLeft} alt="" aria-hidden="true" loading="lazy" className="spmb-deco spmb-deco-timeline-left" />
      <img src={timelineRight} alt="" aria-hidden="true" loading="lazy" className="spmb-deco spmb-deco-timeline-right" />
      <Reveal className="spmb-container relative"><h2 id="spmb-timeline-title" className="spmb-section-title">{t('Timeline Penerimaan')}</h2>
        {spmbSteps.length ? <ol className="spmb-timeline">{spmbSteps.map(step => <li key={step.id}><div className="spmb-timeline-link"><span className="spmb-step-icon"><img src={icons[step.ikon] || data} alt="" /></span><h3><InformationLink href={step.tautan_url}>{t(step.judul)}</InformationLink></h3><RichContent value={t(step.deskripsi)} />{(step.tanggal_mulai || step.tanggal_selesai) && <small className="mt-2 block text-dark-500">{formatDate(step.tanggal_mulai ? `${step.tanggal_mulai}T00:00:00+07:00` : null)}{step.tanggal_selesai && ` – ${formatDate(`${step.tanggal_selesai}T00:00:00+07:00`)}`}</small>}</div></li>)}</ol> : empty}
        <p className="mx-auto mt-5 max-w-xl text-center text-xs leading-relaxed text-dark-500">{t('Pilihan jurusan dilengkapi bersama biodata di portal. Jadwal seleksi dan daftar ulang mengikuti informasi panitia.')}</p>
      </Reveal>
    </section>
    <Reveal as="section" className="spmb-container spmb-section" aria-labelledby="spmb-schemes-title">
      <h2 id="spmb-schemes-title" className="spmb-section-title">{t('Skema Masuk')}</h2><p className="mx-auto mt-2 max-w-md text-center text-xs leading-relaxed text-dark-500">{t('Temukan jalur penerimaan dan informasi pendaftaran yang sesuai.')}</p>
      {spmbSchemes.length ? <div className="mt-9 grid items-stretch gap-7 md:grid-cols-3">{spmbSchemes.map(scheme => <article className={`spmb-raised-card spmb-scheme ${scheme.ikon === 'digitest' ? 'spmb-scheme-featured' : ''}`} key={scheme.id}>
        <span className="spmb-square-icon"><img src={icons[scheme.ikon] || service} alt="" /></span><h3 className="mt-3 break-words font-heading text-lg font-bold text-dark-900">{t(scheme.judul)}</h3><RichContent className="mt-2 whitespace-pre-wrap break-words text-xs leading-relaxed text-dark-500" value={t(scheme.deskripsi)} />{safeSpmbLink(scheme.tautan_url) && <InformationLink href={scheme.tautan_url} className="mt-4 flex min-h-11 items-center justify-between gap-2 border-t border-primary-200 pt-3 text-xs font-semibold text-primary">{t('Lihat informasi')}<ArrowRight className="size-4 shrink-0" /></InformationLink>}
      </article>)}</div> : empty}
    </Reveal>
    <section className="spmb-section relative overflow-hidden" aria-labelledby="spmb-waves-title">
      <img src={tableLeft} alt="" aria-hidden="true" loading="lazy" className="spmb-deco spmb-deco-table-left" /><img src={tableCorner} alt="" aria-hidden="true" loading="lazy" className="spmb-deco spmb-deco-table-corner" />
      <Reveal className="spmb-container relative"><h2 id="spmb-waves-title" className="sr-only">{t('Gelombang Pendaftaran')}</h2>
        <div className="spmb-wave-table-wrap" tabIndex={0} role="region" aria-label={t('Gelombang Pendaftaran')} data-lenis-prevent>
          <table className="spmb-wave-table"><caption className="sr-only">{t('Jadwal gelombang penerimaan 2027/2028')}</caption><thead><tr>{['Gelombang', 'Buka', 'Tutup', 'Seleksi', 'Pengumuman', 'Status'].map(label => <th scope="col" key={label}>{t(label)}</th>)}</tr></thead><tbody>{spmbWaves.map(wave => <tr key={wave.id}>
            <th scope="row"><span className="font-bold text-dark-900">{wave.name}</span>{wave.description && <RichContent className="mt-1 whitespace-pre-wrap break-words text-xs font-normal leading-relaxed text-dark-500" value={t(wave.description)} />}{wave.source ? <a href={wave.source} target="_blank" rel="noopener noreferrer" className="mt-2 block text-xs font-medium text-primary hover:underline">{t('Pengumuman sekolah')} ↗</a> : <span className="mt-2 block text-xs font-normal text-dark-500">{t('Menunggu informasi panitia')}</span>}</th>
            {[wave.opensAt, wave.closesAt, wave.selectionAt, wave.resultAt].map((date, index) => <td key={index}>{formatDate(date)}</td>)}<td><span className={`spmb-status ${registrationState(wave) === 'closed' ? 'bg-dark-100 text-dark-600' : 'bg-primary-50 text-primary'}`}>{t(stateLabels[registrationState(wave)])}</span></td>
          </tr>)}{!spmbWaves.length && <tr><td colSpan={6} className="py-8 text-center">{t('Informasi belum dipublikasikan.')}</td></tr>}</tbody></table>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-dark-500">{t('Tanggal yang belum dipublikasikan tidak ditampilkan sebagai jadwal resmi. Konfirmasikan gelombang yang tersedia kepada panitia.')}</p>
      </Reveal>
    </section>
    <section className="spmb-section relative overflow-hidden" aria-label={t('Berkas dan Persyaratan')}><SpmbOrnaments />
      <Reveal className="spmb-container"><div className="grid items-stretch gap-8 md:grid-cols-2">
        <article className="spmb-raised-card"><header className="flex items-center gap-4"><span className="spmb-square-icon"><img src={documents} alt="" /></span><div><h2 className="font-heading text-lg font-bold text-dark-900">{t('Berkas Yang Disiapkan')}</h2><p className="mt-1 text-xs leading-relaxed text-primary">{t('Satu PDF gabungan, maksimal 10 MB')}</p></div></header>{ppdbDokumen.length ? <ul className="mt-6 space-y-5">{ppdbDokumen.map(item => <li key={item.id} className="flex items-start gap-3"><img src={check} alt="" className="mt-1 size-5 shrink-0" /><div className="min-w-0"><p className="break-words text-sm font-semibold leading-relaxed text-dark-700">{t(item.judul)}</p>{item.deskripsi && <RichContent className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-dark-500" value={t(item.deskripsi)} />}</div></li>)}</ul> : empty}<Link to="/spmb/masuk" className="mt-6 inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-primary">{t('Lanjutkan di portal SPMB')}<ArrowRight className="size-4" /></Link></article>
        <article className="spmb-raised-card"><header className="flex items-center gap-4"><span className="spmb-square-icon"><img src={requirements} alt="" /></span><div><h2 className="font-heading text-lg font-bold text-dark-900">{t('Syarat Umum')}</h2><p className="mt-1 text-xs leading-relaxed text-primary">{t('Persiapan menggunakan portal SPMB')}</p></div></header>{terms.length ? <div className="mt-6 space-y-3">{terms.map(item => <div className="rounded-xl bg-dark-100 p-4" key={item.id}><h3 className="break-words text-sm font-bold text-dark-900">{t(item.judul)}</h3><RichContent className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-dark-500" value={t(item.deskripsi)} /></div>)}</div> : empty}<a href={spmbContact.href} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-primary">{t('Konfirmasi persyaratan')}<ArrowRight className="size-4" /></a></article>
      </div></Reveal>
    </section>
    <Reveal><PartnersSection items={mitraIndustri.filter(item => item.name !== 'Huawei')} animated={false} /></Reveal>
  </MainLayout>;
}
