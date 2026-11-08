import { Languages } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function LanguageToggle() {
  const { language, setLanguage } = useLanguage();
  return (
    <button
      type="button"
      onClick={() => setLanguage(language === 'id' ? 'en' : 'id')}
      aria-label={language === 'id' ? 'Switch to English' : 'Switch to Indonesian'}
      className="language-toggle inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-dark-200 bg-white px-3 text-xs font-medium text-dark-700 transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <Languages className="h-4 w-4" aria-hidden="true" />
      <span lang="en">{language.toUpperCase()}</span>
    </button>
  );
}
