import { useRef, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import StatCard from '../../../components/dashboard/StatCard';
import Modal from '../../../components/dashboard/Modal';
import useSpmbInformation from '../../../hooks/useSpmbInformation';
import { createSpmbInformation, updateSpmbInformation, deleteSpmbInformation, spmbInformationError } from '../../../services/spmbInformationService';
import { emptySpmbInfo, spmbGroups, spmbStatisticsId, registrationForSpmb } from '../../../utils/spmbInformation';
import { registrationCountdown, registrationState } from '../../../utils/spmbSchedule';
import SpmbInformationForm from './SpmbInformationForm';
import SpmbInformationPanel from './SpmbInformationPanel';

const stateLabels = { unknown: 'Belum diumumkan', upcoming: 'Akan Dibuka', open: 'Berlangsung', closed: 'Ditutup' };
export default function SpmbInformationPage() {
  const { items, stats, loading, error, refresh } = useSpmbInformation();
  const [modal, setModal] = useState(null), [submitting, setSubmitting] = useState(false), [feedback, setFeedback] = useState(null);
  const lock = useRef(false);
  const schedule = registrationForSpmb(items, stats), state = registrationState(schedule), countdown = registrationCountdown(schedule);
  const quota = items.find(item => item.id === spmbStatisticsId);
  const close = () => { if (!lock.current) setModal(null); };
  const save = async (data, id) => {
    if (lock.current) return 'Penyimpanan sedang berjalan.';
    lock.current = true; setSubmitting(true); setFeedback(null);
    try {
      if (modal.type === 'edit' || modal.type === 'quota') await updateSpmbInformation(modal.item.id, data);
      else await createSpmbInformation(data, id);
      setModal(null); setFeedback({ ok: true, message: 'Informasi SPMB berhasil disimpan.' }); await refresh(true);
    } catch (cause) { const message = spmbInformationError(cause); setFeedback({ ok: false, message }); return message; }
    finally { lock.current = false; setSubmitting(false); }
  };
  const remove = async () => {
    if (lock.current) return; lock.current = true; setSubmitting(true); setFeedback(null);
    try { await deleteSpmbInformation(modal.item.id); setModal(null); setFeedback({ ok: true, message: 'Informasi SPMB berhasil dihapus.' }); await refresh(true); }
    catch (cause) { setFeedback({ ok: false, message: spmbInformationError(cause) }); }
    finally { lock.current = false; setSubmitting(false); }
  };
  const group = spmbGroups.find(item => item.value === modal?.jenis);
  const count = value => value === null || value === undefined ? 'Belum tersedia' : new Intl.NumberFormat('id-ID').format(value);
  return <section aria-labelledby="spmb-admin-title">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold leading-[normal] uppercase tracking-[0.2em] text-primary">Panel Admin</p><h1 id="spmb-admin-title" className="mt-2 font-heading text-2xl font-extrabold leading-[normal] tracking-[.03em] text-dark-900 sm:text-[32.42px]">Informasi SPMB</h1><p className="mt-2 text-sm leading-[normal] tracking-[.03em] text-dark-500">Kelola informasi penerimaan peserta didik baru SMK Telkom Purwokerto.</p></div><button type="button" disabled={loading} onClick={() => refresh()} aria-label="Muat ulang informasi SPMB" className="grid size-10 place-items-center rounded-lg border border-dark-200 text-dark-600 disabled:opacity-50"><RefreshCw className="size-4" /></button></div>
    {feedback && <div role={feedback.ok ? 'status' : 'alert'} className={`mt-4 flex items-start gap-3 rounded-lg border p-3 text-sm ${feedback.ok ? 'border-green-200 bg-green-50 text-green-700' : 'border-primary-200 bg-primary-50 text-primary-800'}`}><span className="flex-1">{feedback.message}</span><button aria-label="Tutup notifikasi" onClick={() => setFeedback(null)}><X className="size-4" /></button></div>}
    {loading && <p role="status" className="mt-4 text-sm text-dark-500">Memuat informasi SPMB...</p>}
    {error && <p role="alert" className="mt-4 rounded-lg bg-primary-50 p-4 text-sm text-primary-800">{error}</p>}
    <div className="mt-6 grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div data-spmb-stat="total" className="h-full [&>div]:h-full"><StatCard label="Total Pendaftar" value={<span className="text-lg">{count(stats?.total_pendaftar)}</span>} icon="ppdb" description="Dihitung dari seluruh pendaftaran tersimpan." /></div>
      <div data-spmb-stat="quota" className="h-full [&>div]:h-full"><StatCard label="Kuota Tersedia" value={<span className="text-lg">{count(stats?.kuota_tersedia)}</span>} icon="baru" description={stats?.kuota_total === null || !stats ? 'Kuota resmi belum diisi.' : `Dari ${count(stats.kuota_total)}; dikurangi siswa Diterima.`}><button type="button" disabled={!quota || loading || Boolean(error)} onClick={() => setModal({ type: 'quota', jenis: 'statistik', item: { ...emptySpmbInfo, ...quota } })} className="mt-2 text-[10px] font-bold text-primary hover:underline disabled:opacity-50">Atur Kuota</button></StatCard></div>
      <StatCard label="Status Gelombang" value={<span className="text-sm leading-relaxed">{stateLabels[state]}</span>} icon="verifikasi" description={schedule.wave || 'Jadwal resmi belum tersedia.'} />
      <StatCard label="Waktu Pendaftaran" value={<span className="text-sm leading-relaxed">{countdown ? `${countdown[0]} hari lagi` : state === 'closed' ? 'Selesai' : 'Belum tersedia'}</span>} icon="tunggu" description={state === 'upcoming' ? 'Menuju pembukaan pendaftaran.' : state === 'open' ? 'Menuju penutupan pendaftaran.' : 'Mengikuti tanggal gelombang yang dipublikasikan.'} />
    </div>
    <div className="mt-5 grid items-start gap-4 xl:grid-cols-2">{spmbGroups.slice(0, 2).map(group => <SpmbInformationPanel key={group.value} group={group} items={items.filter(item => item.jenis === group.value)} loading={loading} disabled={loading || Boolean(error)} onManage={setModal} />)}</div>
    <div className="mt-4 grid items-start gap-4 lg:grid-cols-2 xl:grid-cols-3">{spmbGroups.slice(2).map(group => <SpmbInformationPanel key={group.value} group={group} items={items.filter(item => item.jenis === group.value)} loading={loading} disabled={loading || Boolean(error)} onManage={setModal} />)}</div>
    <Modal terbuka={Boolean(modal)} onTutup={close} busy={submitting} judul={modal?.type === 'quota' ? 'Atur Kuota Pendaftaran' : `${modal?.type === 'create' ? 'Tambah' : modal?.type === 'edit' ? 'Edit' : 'Hapus'} ${group?.label || 'Informasi'}`} lebar="max-w-2xl">
      <div className="max-h-[70dvh] overflow-y-auto pr-1" data-lenis-prevent>
        {['create', 'edit', 'quota'].includes(modal?.type) && <SpmbInformationForm key={modal.item?.id || modal.jenis} initialData={modal.item} jenis={modal.jenis} onSave={save} onCancel={close} submitting={submitting} />}
        {modal?.type === 'delete' && <><p className="text-sm leading-relaxed text-dark-600">Hapus informasi “{modal.item.judul}”? Informasi ini juga akan dihapus dari halaman SPMB publik.</p><div className="mt-5 flex justify-end gap-2"><button type="button" disabled={submitting} onClick={close} className="rounded-lg border border-dark-200 px-4 py-2 text-xs font-semibold">Batal</button><button type="button" disabled={submitting} onClick={remove} className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{submitting ? 'Menghapus...' : 'Ya, Hapus'}</button></div></>}
      </div>
    </Modal>
  </section>;
}
