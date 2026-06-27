import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import LanguageToggle from '../components/common/LanguageToggle';

const AuthPages = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t, isAr } = useLocale();

  const { email, password } = formData;

  const onChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || t('common.somethingWrong'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        position: 'relative',
      }}
    >
      {/* Language toggle, pinned to the top inline-end corner */}
      <div style={{ position: 'absolute', top: 24, insetInlineEnd: 24 }}>
        <LanguageToggle />
      </div>

      <div
        className="nv-fade-in"
        style={{
          width: '100%',
          maxWidth: 420,
          background: 'var(--nv-surface)',
          border: '1px solid var(--nv-border)',
          borderRadius: 'var(--nv-r-2xl)',
          boxShadow: 'var(--nv-shadow-frame)',
          padding: '36px 32px',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          <img src="/novora-logo-full.png" alt="Novora" style={{ height: 88, width: 'auto' }} />
        </div>

        <h1
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: 'var(--nv-text)',
            textAlign: 'center',
            margin: '4px 0 4px',
          }}
        >
          {t('auth.welcome')}
        </h1>
        <p
          style={{
            fontSize: 13.5,
            color: 'var(--nv-text-soft)',
            textAlign: 'center',
            margin: '0 0 26px',
          }}
        >
          {t('auth.signInSub')}
        </p>

        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: '#fdecec',
              color: '#b3261e',
              border: '1px solid #f6d2d0',
              borderRadius: 'var(--nv-r-md)',
              padding: '10px 13px',
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 16,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={onSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>{t('auth.email')}</label>
            <input
              className="nv-input"
              type="email"
              name="email"
              value={email}
              onChange={onChange}
              dir="ltr"
              placeholder="name@school.com"
              required
              autoComplete="email"
            />
          </div>
          <div style={{ marginBottom: 22 }}>
            <label style={labelStyle}>{t('auth.password')}</label>
            <input
              className="nv-input"
              type="password"
              name="password"
              value={password}
              onChange={onChange}
              dir="ltr"
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="nv-btn nv-btn--primary"
            disabled={submitting}
            style={{ width: '100%', padding: 13, fontSize: 14, opacity: submitting ? 0.7 : 1 }}
          >
            {submitting ? t('auth.signingIn') : t('auth.signIn')}
          </button>
        </form>

        <div
          style={{
            textAlign: 'center',
            marginTop: 22,
            fontSize: 11.5,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--nv-light)',
          }}
        >
          {t('tagline')}
        </div>
      </div>
    </div>
  );
};

const labelStyle = {
  display: 'block',
  marginBottom: 7,
  fontSize: 13,
  fontWeight: 700,
  color: 'var(--nv-text-2)',
};

export default AuthPages;
