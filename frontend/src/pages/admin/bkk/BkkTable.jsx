import { Eye, Pencil, Trash2 } from 'lucide-react';
import { formatDateOnly, toDateKey } from '../../../utils/date';

const formatDate = (date) => formatDateOnly(date);
const isPastDeadline = (deadline) => {
  const key = toDateKey(deadline);
  return key ? key < new Date().toISOString().slice(0, 10) : false;
};

const StatusBadge = ({ status }) => (
  <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${status === 'aktif' ? 'bg-green-100 text-green-700' : 'bg-dark-100 text-dark-600'}`}>
    {status === 'aktif' ? 'Aktif' : 'Ditutup'}
  </span>
);

const ActionButtons = ({ item, onDetail, onEdit, onDelete }) => (
  <div className="flex items-center gap-1">
    <button type="button" onClick={() => onDetail(item)} className="rounded-lg p-2 text-dark-400 hover:bg-dark-50 hover:text-dark-700" aria-label={`Lihat detail ${item.posisi} di ${item.perusahaan}`} title="Detail"><Eye className="h-4 w-4" /></button>
    <button type="button" onClick={() => onEdit(item)} className="rounded-lg p-2 text-dark-400 hover:bg-primary-50 hover:text-primary" aria-label={`Edit ${item.posisi} di ${item.perusahaan}`} title="Edit"><Pencil className="h-4 w-4" /></button>
    <button type="button" onClick={() => onDelete(item)} className="rounded-lg p-2 text-dark-400 hover:bg-primary-50 hover:text-primary" aria-label={`Hapus ${item.posisi} di ${item.perusahaan}`} title="Hapus"><Trash2 className="h-4 w-4" /></button>
  </div>
);

const BkkTable = ({ items, onDetail, onEdit, onDelete }) => (
  <div className="overflow-hidden rounded-2xl border border-dark-100 bg-white shadow-card">
    <div className="overflow-x-auto">
      <table className="w-full min-w-[850px] text-left">
        <thead className="border-b border-dark-100 bg-dark-50">
          <tr className="text-[11px] font-bold uppercase tracking-wide text-dark-500">
            <th className="px-4 py-3 sm:px-5">Perusahaan / Posisi</th>
            <th className="px-4 py-3 sm:px-5">Lokasi</th>
            <th className="px-4 py-3 sm:px-5">Status</th>
            <th className="px-4 py-3 sm:px-5">Deadline</th>
            <th className="px-4 py-3 text-right sm:px-5">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-dark-100">
          {items.map((item) => {
            const overdue = isPastDeadline(item.deadline);
            return <tr key={item.id} className="text-sm text-dark-700 transition-colors hover:bg-dark-50/60">
              <td className="max-w-xs px-4 py-4 sm:px-5"><button type="button" onClick={() => onDetail(item)} className="text-left font-semibold text-dark-900 hover:text-primary">{item.perusahaan}</button><p className="mt-1 text-xs text-dark-500">{item.posisi}</p></td>
              <td className="px-4 py-4 text-xs sm:px-5">{item.lokasi || '-'}</td>
              <td className="px-4 py-4 sm:px-5"><StatusBadge status={item.status} /></td>
              <td className="whitespace-nowrap px-4 py-4 text-xs sm:px-5"><span className={overdue ? 'font-semibold text-primary-700' : 'text-dark-500'}>{formatDate(item.deadline)}</span>{overdue && <span className="mt-1 block text-[10px] font-semibold text-primary-700">Deadline terlewat</span>}</td>
              <td className="px-4 py-4 sm:px-5"><div className="flex justify-end"><ActionButtons item={item} onDetail={onDetail} onEdit={onEdit} onDelete={onDelete} /></div></td>
            </tr>;
          })}
        </tbody>
      </table>
    </div>
  </div>
);

export default BkkTable;

