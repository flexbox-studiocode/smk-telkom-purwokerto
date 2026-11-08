import { createContext, useContext, useEffect, useState } from 'react';
import { getAppConfig } from '../services/appConfigService';

const Context = createContext({ spmbInternalEnabled: false, officialAdmissionsUrl: 'https://ppdb.telkomschools.sch.id/welcome', loading: true });

export function AppConfigProvider({ children }) {
  // null berarti "belum diketahui". Default aman saat gagal adalah nonaktif.
  const [config, setConfig] = useState(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    getAppConfig({ signal: controller.signal })
      .then((value) => { if (active) setConfig(value); })
      .catch(() => { if (active) setConfig({ spmbInternalEnabled: false, officialAdmissionsUrl: 'https://ppdb.telkomschools.sch.id/welcome' }); })
      .finally(() => clearTimeout(timer));
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, []);

  const value = {
    spmbInternalEnabled: config?.spmbInternalEnabled === true,
    officialAdmissionsUrl: config?.officialAdmissionsUrl || 'https://ppdb.telkomschools.sch.id/welcome',
    loading: config === null,
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAppConfig = () => useContext(Context);