import { createContext, useContext, useEffect, useState } from 'react';
import { getAppConfig } from '../services/appConfigService';
import { OFFICIAL_ADMISSIONS_URL } from '../utils/admissions';

const Context = createContext({ spmbInternalEnabled: false, officialAdmissionsUrl: OFFICIAL_ADMISSIONS_URL, loading: true });

export function AppConfigProvider({ children }) {
  // null berarti "belum diketahui". Default aman saat gagal adalah nonaktif.
  const [config, setConfig] = useState(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    getAppConfig({ signal: controller.signal })
      .then((value) => { if (active) setConfig(value); })
      .catch(() => { if (active) setConfig({ spmbInternalEnabled: false, officialAdmissionsUrl: OFFICIAL_ADMISSIONS_URL }); })
      .finally(() => clearTimeout(timer));
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, []);

  const value = {
    spmbInternalEnabled: config?.spmbInternalEnabled === true,
    officialAdmissionsUrl: config?.officialAdmissionsUrl || OFFICIAL_ADMISSIONS_URL,
    loading: config === null,
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAppConfig = () => useContext(Context);