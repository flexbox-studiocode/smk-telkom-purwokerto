import { Eye, Pencil, Trash2 } from 'lucide-react';
import { formatDateOnly } from '../../../utils/date';

const formatDate = (date) => (date ? formatDateOnly(date) : '-');

const ActionButtons = ({ item, onDetail, onEdit, onDelete }) => (
  <div className="flex items-center gap-1">
    <button type="button" onClick={() => onDetail(item)} className="rounded-lg p-2 text-dark-400 hover:bg-dark-50 hover:text-dark-700" aria-label={`Lihat detail ${item.judul}`} title="Detail"><Eye className="h-4 w-4" /></button>
    <button type="button" onClick={() => onEdit(item)} className="rounded-lg p-2 text-dark-400 hover:bg-primary-50 hover:text-primary" aria-label={`Edit ${item.judul}`} title="Edit"><Pencil className="h-4 w-4" /></button>
    <button type="button" onClick={() => onDelete(item)} className="rounded-lg p-2 text-dark-400 hover:bg-primary-50 hover:text-primary" aria-label={`Hapus ${item.judul}`} title="Hapus"><Trash2 className="h-4 w-4" /></button>
  </div>
);

const PrestasiTable = ({ items, onDetail, onEdit, onDelete }) => (
  <div className="overflow-hidden rounded-2xl border border-dark-100 bg-white shadow-card">
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left">
        <thead className="border-b border-dark-100 bg-dark-50">
          <tr className="text-[11px] font-bold uppercase tracking-wide text-dark-500">
            <th className="px-4 py-3 sm:px-5">Judul</th>
            <th className="px-4 py-3 sm:px-5">Kategori</th>
            <th className="px-4 py-3 sm:px-5">Tingkat</th>
            <th className="px-4 py-3 sm:px-5">Tanggal</th>
            <th className="px-4 py-3 text-right sm:px-5">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-dark-100">
          {items.map((item) => (
            <tr key={item.id} className="text-sm text-dark-700 transition-colors hover:bg-dark-50/60">
              <td className="max-w-xs px-4 py-4 sm:px-5"><button type="button" onClick={() => onDetail(item)} className="text-left font-semibold text-dark-900 hover:text-primary">{item.judul}</button><p className="mt-1 truncate text-[11px] text-dark-400">/{item.slug}</p></td>
              <td className="px-4 py-4 text-xs sm:px-5">{item.kategori || '-'}</td>
              <td className="px-4 py-4 text-xs sm:px-5">{item.tingkat || '-'}</td>
              <td className="whitespace-nowrap px-4 py-4 text-xs text-dark-500 sm:px-5">{formatDate(item.tanggal)}</td>
              <td className="px-4 py-4 sm:px-5"><div className="flex justify-end"><ActionButtons item={item} onDetail={onDetail} onEdit={onEdit} onDelete={onDelete} /></div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default PrestasiTable;

