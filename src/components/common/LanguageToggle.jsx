import { useLocale } from '../../context/LocaleContext';

/* EN / ع pill toggle — matches the mockup's language switcher. */
export default function LanguageToggle() {
  const { lang, setLang } = useLocale();

  const pill = (active) => ({
    border: 'none',
    background: active ? 'var(--nv-primary)' : 'transparent',
    color: active ? '#fff' : 'var(--nv-text-soft)',
    fontWeight: 700,
    fontSize: 13,
    padding: '6px 14px',
    borderRadius: 9,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background .15s ease',
  });

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: 4,
        background: '#fff',
        border: '1px solid var(--nv-border-3)',
        borderRadius: 12,
        boxShadow: '0 2px 8px rgba(80,40,120,.05)',
      }}
    >
      <button onClick={() => setLang('en')} style={pill(lang === 'en')}>EN</button>
      <button onClick={() => setLang('ar')} style={pill(lang === 'ar')}>ع</button>
    </div>
  );
}
