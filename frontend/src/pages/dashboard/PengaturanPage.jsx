import { useEffect, useRef, useState } from 'react';
import FormInput from '../../components/dashboard/FormInput';
import Logo from '../../components/Logo';
import Modal from '../../components/dashboard/Modal';
import PageHeader from '../../components/dashboard/PageHeader';
import { useAuth } from '../../context/AuthContext';
import { adminTabPengaturan } from '../../data/dummyData';
import { getSiteSettings, saveAdminAccount, saveSiteSettings } from '../../services/siteSettingsService';
import { apiMe } from '../../services/apiAuthService';
import { generalFields, schoolFields, validateSettings } from '../../utils/siteSettings';
import useUnsavedSettings from '../../hooks/useUnsavedSettings';

const button = 'rounded-xl bg-primary px-5 py-3 text-xs font-bold text-white disabled:opacity-50';
const accountValue = user => ({full_name: typeof user?.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : typeof user?.user_metadata?.name === 'string' ? user.user_metadata.name : '', email:user?.email || ''});
export function AkunAdmin({value,onChange,errors={}}) {
  const {user,isAdmin} = useAuth();
  const data = value || accountValue(user);
  return <div className="mt-6 space-y-5">
    <FormInput label="Nama Lengkap" value={data.full_name} maxLength={150} onChange={e=>onChange?.({...data,full_name:e.target.value})} error={errors.full_name} />
    <FormInput label="Email" type="email" value={data.email} onChange={e=>onChange?.({...data,email:e.target.value})} error={errors.email} />
    <FormInput label="Peran" value={isAdmin ? 'Administrator' : 'Belum terverifikasi sebagai admin'} readOnly />
    <p className="text-xs text-dark-500">Perubahan email memerlukan verifikasi melalui email. Peran tidak dapat diubah melalui pengaturan akun.</p>
    {user?.new_email && <p role="status" className="text-xs text-primary">Menunggu verifikasi email: {user.new_email}</p>}
  </div>;
}
export function PengaturanUmum({value,onChange,errors={}}) {
  if (!value) return <p>Pengaturan belum dimuat dari server.</p>;
  return <div className="mt-6 space-y-5">
    <FormInput label="Tahun Ajaran" value={value.academic_year} onChange={e=>onChange({...value,academic_year:e.target.value})} error={errors.academic_year} />
    <FormInput label="Status SPMB" as="select" value={String(value.spmb_open)} options={[{value:'true',label:'Dibuka'},{value:'false',label:'Ditutup'}]} onChange={e=>onChange({...value,spmb_open:e.target.value==='true'})} />
    <FormInput label="Berita per Halaman" type="number" min={1} max={50} step={1} value={value.news_page_size} onChange={e=>onChange({...value,news_page_size:e.target.value})} error={errors.news_page_size} />
  </div>;
}
export default function PengaturanPage() {
  const {user,isAdmin} = useAuth();
  const [tab,setTab] = useState(0), [record,setRecord] = useState(null), [draft,setDraft] = useState(null);
  const [account,setAccount] = useState(accountValue(user)), [savedAccount,setSavedAccount] = useState(accountValue(user));
  const [file,setFile] = useState(null), [loading,setLoading] = useState(true), [busy,setBusy] = useState(false);
  const [error,setError] = useState(''), [notice,setNotice] = useState(''), [errors,setErrors] = useState({}), [pending,setPending] = useState(null);
  const [version,setVersion] = useState(0); const lock = useRef(false); const fileInput = useRef(null);
  useEffect(()=>{
    let active=true;
    Promise.resolve().then(()=>Promise.all([getSiteSettings(),apiMe()])).then(([row,result])=>{
      if (!active) return;
      setRecord(row);setDraft(row); const value=accountValue(result.user);setAccount(value);setSavedAccount(value);setFile(null);
    }).catch(cause=>{if(active)setError(`Gagal memuat pengaturan: ${cause.message}`);}).finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[user?.id,version]);
  const dirty = !!file || Object.keys({...schoolFields,...generalFields}).some(key=>String(draft?.[key]??'')!==String(record?.[key]??'')) || Object.keys(account).some(key=>account[key]!==savedAccount[key]);
  useUnsavedSettings(dirty, busy);
  const group = tab===0?'school':tab===1?'account':'general';
  const fields = group==='school'?schoolFields:group==='general'?generalFields:{full_name:'Nama Lengkap',email:'Email Akun'};
  const current=group==='account'?account:draft, baseline=group==='account'?savedAccount:record;
  const changes = current && baseline ? Object.keys(fields).filter(key=>String(current[key]??'')!==String(baseline[key]??'')).map(key=>({label:fields[key],from:String(baseline[key]??'—'),to:String(current[key]??'—')})) : [];
  if(group==='school'&&file)changes.push({label:'Logo Sekolah',from:'Logo tersimpan',to:file.name});
  const requestSave = event => {
    event.preventDefault();setNotice('');setError('');
    const found=group==='account'?{...(!account.full_name.trim()||account.full_name.length>150?{full_name:'Isi nama lengkap (maksimal 150 karakter).'}:{}),...(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account.email)?{email:'Email tidak valid.'}:{})}:validateSettings(file && group==='school' ? {...draft,logo_url:null} : draft,group);
    setErrors(found); if(Object.keys(found).length||!changes.length)return;
    setPending({group,data:{...current},file,revision:record.revision,changes});
  };
  const confirm = async () => {
    if(lock.current||!pending)return;lock.current=true;setBusy(true);setError('');
    try {
      if(pending.group==='account') {
        const result=await saveAdminAccount(pending.data,`${window.location.origin}/dashboard/pengaturan`);
        const value=accountValue(result.user);setAccount(value);setSavedAccount(value);
        setNotice(result.emailPending?'Nama tersimpan. Periksa email lama dan baru untuk verifikasi; email login belum dianggap berubah sampai dikonfirmasi.':'Akun tersimpan dan telah dibaca ulang dari database.');
      } else {
        const verified=await saveSiteSettings(pending.data,pending.group,pending.revision,pending.file);
        setRecord(verified);
        setDraft(previous=>({...verified,...Object.fromEntries(Object.keys(pending.group==='school'?generalFields:schoolFields).map(key=>[key,previous[key]]))}));
        if(pending.group==='school') { setFile(null); if(fileInput.current) fileInput.current.value=''; }
        setNotice('Pengaturan tersimpan dan telah dibaca ulang dari database.');
      }
      setPending(null);
    } catch(cause) {setPending(null);setError(`Penyimpanan belum dapat dipastikan: ${cause.message}`);}
    finally {lock.current=false;setBusy(false);}
  };
  return <section>
    <PageHeader judul="Pengaturan" breadcrumb={[{label:'Dashboard',to:'/dashboard'},{label:'Pengaturan'}]} />
    {error&&<div role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-800">{error} {!dirty&&<button type="button" className="ml-3 underline" onClick={()=>setVersion(v=>v+1)}>Muat ulang</button>}</div>}
    {notice&&<p role="status" className="mb-4 rounded-xl bg-green-50 p-4 text-sm text-green-800">{notice}</p>}
    <div className="rounded-2xl border border-dark-100 bg-white p-6 shadow-card sm:p-8">
      <div role="tablist" className="flex flex-wrap gap-2 border-b border-dark-100 pb-6">{adminTabPengaturan.map((name,index)=><button key={name} role="tab" type="button" disabled={busy} aria-selected={tab===index} onClick={()=>{setTab(index);setErrors({});}} className={`rounded-xl px-6 py-3 text-xs font-bold ${tab===index?'bg-primary text-white':'text-dark-700 hover:bg-dark-50'}`}>{name}</button>)}</div>
      {loading?<p role="status" className="py-8">Memuat pengaturan dari server...</p>:draft&&<form onSubmit={requestSave}>
        <fieldset disabled={busy||!!pending||!isAdmin} className="mt-8 grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-[1fr_20rem]">
          <div className="min-w-0"><h2 className="font-heading text-lg font-extrabold text-dark-900">{adminTabPengaturan[tab]}</h2>
            {tab===0&&<div className="mt-6 space-y-5">{Object.entries(schoolFields).map(([key,label])=><FormInput key={key} label={label} as={key==='address'?'textarea':'input'} type={key==='email'?'email':key==='website'||key==='logo_url'?'url':'text'} value={draft[key]??''} onChange={e=>setDraft({...draft,[key]:e.target.value})} error={errors[key]} />)}<FormInput ref={fileInput} label="Unggah Logo Sekolah" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={e=>{setFile(e.target.files?.[0]||null);}} /><p className="text-xs text-dark-500">Logo dapat diunggah atau menggunakan URL HTTPS. Jika keduanya diisi, unggahan digunakan.</p></div>}
            {tab===1&&<AkunAdmin value={account} onChange={setAccount} errors={errors} />}
            {tab===2&&<PengaturanUmum value={draft} onChange={setDraft} errors={errors} />}
          </div>
          <aside><h2 className="font-heading text-lg font-extrabold text-dark-900">Logo Sekolah</h2><div className="mt-6 flex flex-col items-center rounded-2xl bg-dark-50 px-6 py-8">{record.logo_url?<img src={record.logo_url} alt="Logo sekolah tersimpan" className="h-16 w-32 object-contain" />:<Logo className="h-12 w-12" />}<p className="mt-3 text-center font-heading text-lg font-extrabold">{record.school_name}</p></div><p className="mt-4 text-center text-xs text-dark-400">Pratinjau data yang telah tersimpan di server.</p></aside>
        </fieldset>
        <div className="mt-8 flex flex-wrap items-center gap-4"><button type="submit" disabled={busy||!isAdmin||!changes.length} className={button}>{busy?'Menyimpan...':'Simpan Perubahan'}</button>{dirty&&<span className="text-xs text-dark-500">Ada perubahan belum disimpan.</span>}<button type="button" disabled={busy} className="text-xs underline" onClick={()=>{if(!dirty||window.confirm('Buang perubahan dan muat data server?')){setLoading(true);setError('');setVersion(v=>v+1);}}}>Muat ulang data</button></div>
      </form>}
    </div>
    <Modal terbuka={!!pending} busy={busy} onTutup={()=>{if(!lock.current)setPending(null);}} judul="Konfirmasi perubahan" deskripsi="Periksa perubahan berikut sebelum menyimpan ke server." footer={<><button type="button" disabled={busy} onClick={()=>setPending(null)} className="rounded-xl border px-5 py-3 text-xs">Batal</button><button type="button" disabled={busy} onClick={confirm} className={button}>{busy?'Menyimpan...':'Konfirmasi & Simpan'}</button></>}>
      <ul className="max-h-72 space-y-3 overflow-y-auto text-xs">{pending?.changes.map(change=><li key={change.label} className="break-words"><p className="font-bold">{change.label}</p><p className="text-dark-500">Sebelum: {change.from}</p><p>Sesudah: {change.to}</p></li>)}</ul>
    </Modal>
  </section>;
}
