import { useEffect, useState } from 'react';
import MainLayout from '../layouts/MainLayout';
import { useLanguage } from '../context/LanguageContext';

const privacySections = {
  id: [
    {
      slug: 'koleksi',
      title: '1. Informasi yang Kami Kumpulkan',
      items: [
        {
          subtitle: 'Informasi Data Diri (Sukarela)',
          text: 'Nama lengkap, alamat email, nomor telepon, atau data pendaftaran saat pengguna mengisi formulir pendaftaran ekskul, pengajuan layanan kesiswaan, atau kontak PPDB.',
        },
        {
          subtitle: 'Penggunaan Asisten AI (NEXA & NextTel)',
          text: 'Pertanyaan yang diajukan kepada sistem AI diproses untuk menghasilkan respons informasi sekolah. Riwayat percakapan tidak disimpan secara permanen dan hanya digunakan selama sesi aktif berlangsung. Sebelum memakai NEXA, pengguna mengisi nama, nomor HP, usia, kategori (sekolah atau instansi), dan nama sekolah/instansi bila ingin. Data ini hanya dipakai untuk mengenali kategori pengguna dan menyesuaikan jawaban, tidak dipakai untuk pemasaran, dan dihapus otomatis setelah sesi berakhir (maksimal 24 jam).',
        },
        {
          subtitle: 'Data Log & Analitik (Otomatis)',
          text: 'Jenis peramban (browser), halaman yang dikunjungi, waktu akses, dan data lalu lintas web untuk keperluan optimalisasi performa server dan keamanan. Data pengunjung dicatat menggunakan identifier anonim dan tidak menyimpan alamat IP secara permanen.',
        },
      ],
    },
    {
      slug: 'penggunaan',
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
      slug: 'perlindungan',
      title: '3. Perlindungan & Keamanan Data',
      paragraphs: [
        'Kami berkomitmen menjaga keamanan data pribadi pengguna. Seluruh transmisi data dilakukan melalui enkripsi standar SSL/HTTPS.',
        'Kami tidak akan menjual, menyewakan, atau membagikan data pribadi pengguna kepada pihak ketiga tanpa persetujuan, kecuali diwajibkan oleh ketentuan hukum yang berlaku.',
      ],
      callout: true,
    },
    {
      slug: 'pihak-ketiga',
      title: '4. Layanan Pihak Ketiga & Cookies',
      paragraphs: [
        'Portal web kami menggunakan layanan pihak ketiga untuk operasional, termasuk Cloudflare Turnstile sebagai layanan verifikasi keamanan anti-bot pada halaman login administrator dan portal SPMB. Data operasional disimpan pada database MySQL yang dikelola sekolah; cadangan terenkripsi disimpan pada layanan penyimpanan eksternal.',
        'Website kami juga dapat menggunakan cookies untuk menyimpan preferensi sesi pengguna dan mengoptimalkan pengalaman navigasi web. Pengguna memiliki opsi untuk mematikan cookies melalui pengaturan peramban masing-masing.',
      ],
    },
    {
      slug: 'retensi',
      title: '5. Retensi Data',
      intro: 'Kami menyimpan data hanya selama diperlukan untuk tujuan pengumpulannya, lalu menghapusnya secara otomatis:',
      bullets: [
        'Data profil sesi NEXA (nama, nomor telepon, usia, kategori, dan nama sekolah/instansi bila diisi) disimpan paling lama 24 jam sejak sesi dimulai, lalu dihapus otomatis oleh sistem.',
        'Isi percakapan NEXA diproses selama sesi berlangsung dan tidak disimpan server sebagai riwayat permanen.',
        'Data pendaftaran SPMB/PPDB serta data akun disimpan selama diperlukan untuk proses layanan dan kewajiban administratif sekolah.',
        'Cadangan (backup) basis data terenkripsi disimpan bergilir sesuai jadwal retensi sistem, lalu dihapus otomatis.',
        'Data statistik pengunjung dicatat secara anonim dan agregat, tanpa menyimpan alamat IP secara permanen.',
      ],
    },
    {
      slug: 'hak-pengguna',
      title: '6. Hak Pengguna',
      intro: 'Anda berhak mengajukan permintaan terkait data pribadi Anda. Permintaan dapat diajukan melalui kanal pada bagian Kontak di bawah:',
      bullets: [
        'Meminta salinan data pribadi yang kami simpan tentang Anda.',
        'Meminta perbaikan data yang tidak akurat atau tidak lengkap.',
        'Meminta penghapusan data, sepanjang tidak bertentangan dengan kewajiban hukum sekolah.',
        'Mengajukan pertanyaan atau keberatan atas pengelolaan data.',
      ],
    },
    {
      slug: 'tautan',
      title: '7. Tautan ke Website Pihak Ketiga',
      paragraphs: [
        'Website kami mungkin memuat tautan menuju situs luar seperti sistem pembayaran resmi, media sosial sekolah, atau portal kementerian.',
        'Kami tidak bertanggung jawab atas isi atau kebijakan privasi dari situs luar tersebut.',
      ],
    },
    {
      slug: 'kontak',
      title: '8. Hubungi Kami',
      contact: true,
    },
  ],
  en: [
    {
      slug: 'koleksi',
      title: '1. Information We Collect',
      items: [
        {
          subtitle: 'Personal Information (Voluntary)',
          text: 'Full name, email address, phone number, or registration data when users fill in extracurricular registration forms, student services requests, or PPDB contact forms.',
        },
        {
          subtitle: 'AI Assistant Usage (NEXA & NextTel)',
          text: 'Questions submitted to the AI system are processed to generate school information responses. Conversation history is not stored permanently and is only used during the active session. Before using NEXA, users provide their name, phone number, age, category (school or institution), and optionally a school/institution name. This information is only used to identify the type of user and tailor answers, is not used for marketing, and is deleted automatically after the session ends (24 hours at most).',
        },
        {
          subtitle: 'Log & Analytics Data (Automatic)',
          text: 'Browser type, pages visited, access time, and web traffic data are collected for server performance optimization and security purposes. Visitor data is recorded using anonymous identifiers and does not permanently store IP addresses.',
        },
      ],
    },
    {
      slug: 'penggunaan',
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
      slug: 'perlindungan',
      title: '3. Data Protection & Security',
      paragraphs: [
        'We are committed to maintaining the security of users\' personal data. All data transmissions are conducted through standard SSL/HTTPS encryption.',
        'We will not sell, rent, or share users\' personal data with third parties without consent, unless required by applicable law.',
      ],
      callout: true,
    },
    {
      slug: 'pihak-ketiga',
      title: '4. Third-Party Services & Cookies',
      paragraphs: [
        'Our web portal uses third-party services for operations, including Cloudflare Turnstile as a security verification service for the administrator login page and SPMB portal. Operational data is stored on a MySQL database managed by the school; encrypted backups are kept on an external storage service.',
        'Our website may also use cookies to store user session preferences and optimize the web navigation experience. Users have the option to disable cookies through their respective browser settings.',
      ],
    },
    {
      slug: 'retensi',
      title: '5. Data Retention',
      intro: 'We keep data only as long as needed for the purpose it was collected, then remove it automatically:',
      bullets: [
        'NEXA session profile data (name, phone number, age, category, and optionally school/institution name) is kept for at most 24 hours from session start, then deleted automatically by the system.',
        'NEXA conversation content is processed while the session is active and is not stored by the server as a permanent history.',
        'SPMB/PPDB registration data and account data are kept as long as needed for the service process and the school\'s administrative obligations.',
        'Encrypted database backups are retained on a rotating schedule according to the system retention policy, then deleted automatically.',
        'Visitor statistics are recorded anonymously and in aggregate, without permanently storing IP addresses.',
      ],
    },
    {
      slug: 'hak-pengguna',
      title: '6. Your Rights',
      intro: 'You have the right to make requests regarding your personal data. Requests can be submitted through the channels in the Contact section below:',
      bullets: [
        'Request a copy of the personal data we hold about you.',
        'Request correction of inaccurate or incomplete data.',
        'Request deletion of data, as long as it does not conflict with the school\'s legal obligations.',
        'Ask questions or raise objections about how data is managed.',
      ],
    },
    {
      slug: 'tautan',
      title: '7. Links to Third-Party Websites',
      paragraphs: [
        'Our website may contain links to external sites such as official payment systems, school social media, or ministry portals.',
        'We are not responsible for the content or privacy policies of those external sites.',
      ],
    },
    {
      slug: 'kontak',
      title: '8. Contact Us',
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
  const { language } = useLanguage();
  const lang = language === 'en' ? 'en' : 'id';
  const sections = privacySections[lang];
  const contact = contactInfo[lang];
  const lastUpdated = lang === 'id' ? 'Oktober 2026' : 'October 2026';
  const tocLabel = lang === 'id' ? 'Daftar isi' : 'Table of contents';
  const hero = lang === 'id'
    ? {
        eyebrow: 'Dokumen Resmi',
        title: 'Kebijakan Privasi',
        description: 'Penjelasan mengenai bagaimana SMK Telkom Purwokerto mengumpulkan, menggunakan, menyimpan, dan melindungi informasi pengguna website.',
        meta: [['Terakhir diperbarui', lastUpdated], ['Pengelola', 'SMK Telkom Purwokerto'], ['Bahasa dokumen', 'Indonesia & Inggris']],
      }
    : {
        eyebrow: 'Official Document',
        title: 'Privacy Policy',
        description: 'How SMK Telkom Purwokerto collects, uses, stores, and protects website user information.',
        meta: [['Last updated', lastUpdated], ['Managed by', 'SMK Telkom Purwokerto'], ['Document language', 'Indonesian & English']],
      };
  const summary = lang === 'id'
    ? 'Ringkasan: kami mengumpulkan data yang diperlukan untuk layanan sekolah, menjaga keamanan portal, dan tidak menjual data pribadi.'
    : 'Summary: we collect data needed for school services, protect the portal, and never sell personal data.';

  const [activeId, setActiveId] = useState(sections[0].slug);

  useEffect(() => {
    const nodes = sections.map((section) => document.getElementById(section.slug)).filter(Boolean);
    if (!nodes.length) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-96px 0px -66% 0px', threshold: [0, 1] }
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [sections]);

  return (
    <MainLayout showMarquees={false}>
      <section className="relative overflow-hidden border-b border-dark-100 bg-dark-50">
        <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-primary sm:w-1.5" />
        <div className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <p className="text-[0.8125rem] font-semibold uppercase tracking-[0.2em] text-primary">{hero.eyebrow}</p>
          <h1 className="mt-4 max-w-4xl font-heading text-[2rem] font-bold leading-[1.2] text-dark-900 sm:text-[2.375rem] lg:text-[2.625rem]">{hero.title}</h1>
          <p className="mt-5 max-w-3xl text-[1.0625rem] leading-[1.7] text-dark-600 lg:text-[1.125rem]">{hero.description}</p>
          <dl className="mt-8 grid gap-x-8 gap-y-5 border-t border-dark-200 pt-6 sm:grid-cols-3">
            {hero.meta.map(([label, value]) => (
              <div key={label}>
                <dt className="text-[0.8125rem] font-semibold uppercase tracking-[0.12em] text-dark-400">{label}</dt>
                <dd className="mt-1 text-sm font-semibold text-dark-800">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12">
            <aside className="mb-10 lg:mb-0" aria-label={tocLabel}>
              <div className="lg:sticky lg:top-28">
                <p className="text-[0.8125rem] font-bold uppercase tracking-[0.18em] text-primary">{tocLabel}</p>
                <nav className="mt-4 border-l border-dark-100 pl-4">
                  <ol className="space-y-3.5">
                    {sections.map((section) => (
                      <li key={section.slug}>
                        <a
                          href={`#${section.slug}`}
                          aria-current={activeId === section.slug ? 'true' : undefined}
                          className={`block text-[0.9375rem] leading-snug transition-colors ${
                            activeId === section.slug ? 'font-semibold text-primary' : 'text-dark-500 hover:text-primary'
                          }`}
                        >
                          {section.title.replace(/^\d+\.\s*/, '')}
                        </a>
                      </li>
                    ))}
                  </ol>
                </nav>
                <p className="mt-8 text-[0.8125rem] leading-normal text-dark-400">
                  {lang === 'id' ? 'Diperbarui' : 'Updated'} {lastUpdated}<br />
                  flexbox.smktelkom-pwt.sch.id
                </p>
              </div>
            </aside>

            <div className="min-w-0 max-w-[850px]">
              <div className="rounded-2xl bg-primary-50 p-5 ring-1 ring-primary/10 sm:p-6">
                <p className="text-base font-semibold leading-[1.7] text-dark-800">{summary}</p>
              </div>

              <div className="mt-12 space-y-12">
                {sections.map((section) => (
                  <section key={section.slug} id={section.slug} className="scroll-mt-28">
                    <h2 className="font-heading text-xl font-bold leading-snug text-dark-900 sm:text-2xl">{section.title}</h2>

                    {section.items && (
                      <div className="mt-5 space-y-5">
                        {section.items.map((item) => (
                          <div key={item.subtitle}>
                            <h3 className="text-[1.0625rem] font-semibold text-dark-800 sm:text-[1.125rem]">{item.subtitle}</h3>
                            <p className="mt-2 text-base leading-[1.75] text-dark-600">{item.text}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {section.intro && <p className="mt-4 text-base leading-[1.75] text-dark-600">{section.intro}</p>}

                    {section.bullets && (
                      <ul className="mt-4 space-y-2.5 pl-5">
                        {section.bullets.map((bullet) => (
                          <li key={bullet} className="list-disc text-base leading-[1.75] text-dark-600">{bullet}</li>
                        ))}
                      </ul>
                    )}

                    {section.paragraphs && (
                      <div className="mt-4 space-y-4">
                        {section.paragraphs.map((para) => (
                          <p key={para.slice(0, 40)} className="text-base leading-[1.75] text-dark-600">{para}</p>
                        ))}
                      </div>
                    )}

                    {section.callout && (
                      <div className="mt-5 border-l-4 border-primary bg-primary-50 px-4 py-3 text-sm leading-relaxed text-dark-700">
                        {lang === 'id' ? 'Kami tidak menjual atau menyewakan data pribadi pengguna.' : 'We do not sell or rent users\' personal data.'}
                      </div>
                    )}

                    {section.contact && (
                      <div className="mt-5 space-y-3 text-base leading-[1.75] text-dark-600">
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
                  </section>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </MainLayout>
  );
};

export default KebijakanPrivasiPage;
