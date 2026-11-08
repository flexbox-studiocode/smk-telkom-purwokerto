import { useLanguage } from '../../context/LanguageContext';

export default function NextTelOption({ questionId, option, selected, onAnswer }) {
  const { t } = useLanguage();
  const active = selected === option.id;
  return (
    <label className="relative block cursor-pointer">
      <input type="radio" name={questionId} value={option.id} checked={active} aria-checked={active}
        onChange={() => onAnswer(questionId, option.id)} className="peer sr-only" />
      <span className="nexttel-option flex min-h-16 items-center gap-4 rounded-2xl border border-dark-300 bg-white px-4 py-4 text-sm font-semibold text-dark-600 transition-colors hover:border-primary hover:bg-primary-50/50 peer-checked:border-primary peer-checked:bg-primary-50 peer-checked:text-primary peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-primary sm:min-h-20 sm:gap-6 sm:px-5">
        <span aria-hidden="true" className={`nexttel-option__badge flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${active ? 'bg-primary text-white' : 'bg-dark-100 text-dark-600'}`}>
          {option.id.toUpperCase()}
        </span>
        <span>{t(option.label)}</span>
      </span>
    </label>
  );
}
