import { useLanguage } from '../context/LanguageContext';
import MainLayout from '../layouts/MainLayout';
import HalamanHeader from '../components/HalamanHeader';
import Reveal from '../components/Reveal';

const privacySections = {
  id: [
    {
      title: '1. Informasi yang Kami Kumpulkan',
      items: [
        {
          subtitle: 'Informasi Data Diri (Sukarela)',
          text: 'Nama lengkap, alamat email, nomor telepon, atau data pendaftaran saat pengguna mengisi formulir pendaftaran ekskul, pengajuan layanan kesiswaan, atau kontak PPDB.',
        },
        {
          subtitle: 'Penggunaan Asisten AI (NEXA & NextTel)',
          text: 'Pertanyaan yang diajukan kepada sistem AI diproses untuk menghasilkan respons informasi sekolah. Riwayat percakapan tidak disimpan secara permanen dan hanya digunakan selama sesi aktif berlangsung.',
        },
        {
          subtitle: 'Data Log & Analitik (Otomatis)',
          text: 'Jenis peramban (browser), halaman yang dikunjungi, waktu akses, dan data lalu lintas web untuk keperluan optimalisasi performa server dan keamanan. Data pengunjung dicatat menggunakan identifier anonim dan tidak menyimpan alamat IP secara permanen.',
        },
      ],
    },
    {
      title: '2. Penggunaan Informasi',
      intro: 'Informasi yang dikumpulkan digunakan secara eksklusif untuk kepentingan operasional dan peningkatan layanan sekolah, antara lain:',
      bullets: [
        'Memproses pendaftaran ekstrakurikuler, organisasi, dan kegiatan kesiswaan.',
        'Memberikan respons otomatis dan layanan informasi 24/7 melalui fitur cerdas AI.',
        'Mengirimkan notifikasi resmi, pengumuman sekolah, atau konfirmasi pendaftaran.',
        'Menganalisis dan meningkatkan kualitas UI/UX serta keamanan portal web.',
      ],
    },
    {
      title: '3. Perlindungan & Keamanan Data',
      paragraphs: [
        'Kami berkomitmen menjaga keamanan data pribadi pengguna. Seluruh transmisi data dilakukan melalui enkripsi standar SSL/HTTPS.',
        'Kami tidak akan menjual, menyewakan, atau membagikan data pribadi pengguna kepada pihak ketiga tanpa persetujuan, kecuali diwajibkan oleh ketentuan hukum yang berlaku.',
      ],
    },
    {
      title: '4. Layanan Pihak Ketiga',
      paragraphs: [
        'Portal web kami menggunakan layanan pihak ketiga untuk operasional, termasuk Cloudflare Turnstile sebagai layanan verifikasi keamanan anti-bot pada halaman login administrator dan portal SPMB. Data operasional disimpan pada database MySQL yang dikelola sekolah; cadangan terenkripsi disimpan pada layanan penyimpanan eksternal.',
        'Website kami juga dapat menggunakan cookies untuk menyimpan preferensi sesi pengguna dan mengoptimalkan pengalaman navigasi web. Pengguna memiliki opsi untuk mematikan cookies melalui pengaturan peramban masing-masing.',
      ],
    },
    {
      title: '5. Tautan ke Website Pihak Ketiga',
      paragraphs: [
        'Website kami mungkin memuat tautan menuju situs luar seperti sistem pembayaran resmi, media sosial sekolah, atau portal kementerian.',
        'Kami tidak bertanggung jawab atas isi atau kebijakan privasi dari situs luar tersebut.',
      ],
    },
    {
      title: '6. Hubungi Kami',
      contact: true,
    },
  ],
  en: [
    {
      title: '1. Information We Collect',
      items: [
        {
          subtitle: 'Personal Information (Voluntary)',
          text: 'Full name, email address, phone number, or registration data when users fill in extracurricular registration forms, student services requests, or PPDB contact forms.',
        },
        {
          subtitle: 'AI Assistant Usage (NEXA & NextTel)',
          text: 'Questions submitted to the AI system are processed to generate school information responses. Conversation history is not stored permanently and is only used during the active session.',
        },
        {
          subtitle: 'Log & Analytics Data (Automatic)',
          text: 'Browser type, pages visited, access time, and web traffic data are collected for server performance optimization and security purposes. Visitor data is recorded using anonymous identifiers and does not permanently store IP addresses.',
        },
      ],
    },
    {
      title: '2. Use of Information',
      intro: 'The collected information is used exclusively for operational purposes and improvement of school services, including:',
      bullets: [
        'Processing extracurricular, organizational, and student activity registrations.',
        'Providing automated responses and 24/7 information services through AI-powered features.',
        'Sending official notifications, school announcements, or registration confirmations.',
        'Analyzing and improving UI/UX quality and web portal security.',
      ],
    },
    {
      title: '3. Data Protection & Security',
      paragraphs: [
        'We are committed to maintaining the security of users\' personal data. All data transmissions are conducted through standard SSL/HTTPS encryption.',
        'We will not sell, rent, or share users\' personal data with third parties without consent, unless required by applicable law.',
      ],
    },
    {
      title: '4. Third-Party Services',
      paragraphs: [
        'Our web portal uses third-party services for operations, including Cloudflare Turnstile as a security verification service for the administrator login page and SPMB portal. Operational data is stored on a MySQL database managed by the school; encrypted backups are kept on an external storage service.',
        'Our website may also use cookies to store user session preferences and optimize the web navigation experience. Users have the option to disable cookies through their respective browser settings.',
      ],
    },
    {
      title: '5. Links to Third-Party Websites',
      paragraphs: [
        'Our website may contain links to external sites such as official payment systems, school social media, or ministry portals.',
        'We are not responsible for the content or privacy policies of those external sites.',
      ],
    },
    {
      title: '6. Contact Us',
      contact: true,
    },
  ],
};

const contactInfo = {
  id: {
    intro: 'Jika Anda memiliki pertanyaan mengenai Kebijakan Privasi ini atau pengelolaan data di website flexbox.smktelkom-pwt.sch.id, silakan hubungi kami melalui:',
    team: 'Tim Pengembang',
    teamValue: 'Tim Flex.Box \u2013 SMK Telkom Purwokerto',
    emailLabel: 'Email',
    addressLabel: 'Alamat',
  },
  en: {
    intro: 'If you have any questions regarding this Privacy Policy or data management on the website flexbox.smktelkom-pwt.sch.id, please contact us through:',
    team: 'Development Team',
    teamValue: 'Flex.Box Team \u2013 SMK Telkom Purwokerto',
    emailLabel: 'Email',
    addressLabel: 'Address',
  },
};

const KebijakanPrivasiPage = () => {
  const { language, t } = useLanguage();
  const lang = language === 'en' ? 'en' : 'id';
  const sections = privacySections[lang];
  const contact = contactInfo[lang];
  const lastUpdated = lang === 'id' ? 'Terakhir Diperbarui: Oktober 2026' : 'Last Updated: October 2026';

  return (
    <MainLayout>
      <HalamanHeader
        eyebrow={lang === 'id' ? 'Dokumen Resmi' : 'Official Document'}
        title={t('Kebijakan Privasi')}
        deskripsi={lang === 'id'
          ? 'Di SMK Telkom Purwokerto, privasi pengunjung dan pengguna portal digital kami adalah hal yang sangat penting. Dokumen ini menjelaskan jenis informasi yang kami kumpulkan, bagaimana informasi tersebut digunakan, serta langkah-langkah perlindungan data yang kami terapkan.'
          : 'At SMK Telkom Purwokerto, the privacy of our visitors and digital portal users is of the utmost importance. This document explains the types of information we collect, how that information is used, and the data protection measures we implement.'}
      />

      <section className="bg-white px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <p className="text-[11px] text-dark-400">{lastUpdated}</p>
          <p className="mt-1 text-[11px] text-dark-400">
            Website: flexbox.smktelkom-pwt.sch.id (SMK Telkom Purwokerto)
          </p>

          <div className="mt-6 space-y-6">
            {sections.map((section, i) => (
              <Reveal key={section.title} className={i % 2 ? 'delay-100' : ''}>
                <div className="rounded-2xl border border-dark-100 bg-white p-6 shadow-card">
                  <h2 className="flex items-center gap-3 font-heading text-sm font-extrabold text-dark-900">
                    <span aria-hidden="true" className="h-5 w-1 rounded-full bg-primary" />
                    {section.title}
                  </h2>

                  {section.items && (
                    <div className="mt-4 space-y-4">
                      {section.items.map((item) => (
                        <div key={item.subtitle}>
                          <h3 className="text-xs font-bold text-dark-800">{item.subtitle}</h3>
                          <p className="mt-1 text-xs leading-relaxed text-dark-600">{item.text}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {section.intro && (
                    <p className="mt-4 text-xs leading-relaxed text-dark-600">{section.intro}</p>
                  )}

                  {section.bullets && (
                    <ul className="mt-3 space-y-2 pl-4">
                      {section.bullets.map((bullet) => (
                        <li key={bullet} className="list-disc text-xs leading-relaxed text-dark-600">
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  )}

                  {section.paragraphs && (
                    <div className="mt-4 space-y-3">
                      {section.paragraphs.map((para) => (
                        <p key={para.slice(0, 40)} className="text-xs leading-relaxed text-dark-600">{para}</p>
                      ))}
                    </div>
                  )}

                  {section.contact && (
                    <div className="mt-4 space-y-3 text-xs leading-relaxed text-dark-600">
                      <p>{contact.intro}</p>
                      <div className="space-y-2">
                        <p>
                          <span className="font-semibold text-dark-800">{contact.team}:</span>{' '}
                          {contact.teamValue}
                        </p>
                        <p>
                          <span className="font-semibold text-dark-800">{contact.emailLabel}:</span>{' '}
                          <a href="mailto:office@smktelkom-pwt.sch.id" className="text-primary underline-offset-2 hover:underline">office@smktelkom-pwt.sch.id</a>
                          {' / '}
                          <a href="mailto:flexbox.code@gmail.com" className="text-primary underline-offset-2 hover:underline">flexbox.code@gmail.com</a>
                        </p>
                        <p>
                          <span className="font-semibold text-dark-800">{contact.addressLabel}:</span>{' '}
                          Jl. DI Panjaitan No.128, Purwokerto, Jawa Tengah
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </MainLayout>
  );
};

export default KebijakanPrivasiPage;
