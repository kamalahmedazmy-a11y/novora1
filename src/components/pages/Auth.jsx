import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User as UserIcon, Zap, ArrowRight } from 'lucide-react';

export default function Auth() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login, register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email || !password || (!isLogin && !name)) return;

        setIsLoading(true);
        try {
            if (isLogin) {
                await login(email, password);
            } else {
                await register(name, email, password);
            }
            navigate('/');
        } catch (error) {
            console.error('Auth error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-background">
                <div className="gradient-orb orb-1"></div>
                <div className="gradient-orb orb-2"></div>
                <div className="gradient-orb orb-3"></div>
            </div>

            <div className="auth-card">
                <div className="auth-header">
                    <div className="logo-icon">
                        <Zap size={32} fill="currentColor" />
                    </div>
                    <h1 className="logo-text">Novora</h1>
                    <p className="tagline">Master Theory of Computation</p>
                </div>

                <div className="auth-tabs">
                    <button
                        className={`tab ${isLogin ? 'active' : ''}`}
                        onClick={() => setIsLogin(true)}
                    >
                        Log In
                    </button>
                    <button
                        className={`tab ${!isLogin ? 'active' : ''}`}
                        onClick={() => setIsLogin(false)}
                    >
                        Sign Up
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    {!isLogin && (
                        <div className="input-group">
                            <div className="input-icon">
                                <UserIcon size={20} />
                            </div>
                            <input
                                type="text"
                                placeholder="Full Name"
                                className="auth-input"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required={!isLogin}
                            />
                        </div>
                    )}

                    <div className="input-group">
                        <div className="input-icon">
                            <Mail size={20} />
                        </div>
                        <input
                            type="email"
                            placeholder="Email Address"
                            className="auth-input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <div className="input-icon">
                            <Lock size={20} />
                        </div>
                        <input
                            type="password"
                            placeholder="Password"
                            className="auth-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="btn-submit" disabled={isLoading}>
                        {isLoading ? (
                            <span>Processing...</span>
                        ) : (
                            <>
                                <span>{isLogin ? 'Log In' : 'Create Account'}</span>
                                <ArrowRight size={20} />
                            </>
                        )}
                    </button>
                </form>
            </div>

            <style>{`
                .auth-container {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 2rem;
                    position: relative;
                    overflow: hidden;
                    background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 50%, #ddd6fe 100%);
                }

                .auth-background {
                    position: absolute;
                    inset: 0;
                    overflow: hidden;
                    z-index: 0;
                }

                .gradient-orb {
                    position: absolute;
                    border-radius: 50%;
                    filter: blur(80px);
                    opacity: 0.6;
                    animation: float 20s ease-in-out infinite;
                }

                .orb-1 {
                    width: 400px;
                    height: 400px;
                    background: radial-gradient(circle, #a855f7, transparent);
                    top: -200px;
                    left: -200px;
                    animation-delay: 0s;
                }

                .orb-2 {
                    width: 500px;
                    height: 500px;
                    background: radial-gradient(circle, #7c3aed, transparent);
                    bottom: -250px;
                    right: -250px;
                    animation-delay: 7s;
                }

                .orb-3 {
                    width: 300px;
                    height: 300px;
                    background: radial-gradient(circle, #c084fc, transparent);
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    animation-delay: 14s;
                }

                @keyframes float {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    33% { transform: translate(30px, -30px) scale(1.1); }
                    66% { transform: translate(-20px, 20px) scale(0.9); }
                }

                .auth-card {
                    position: relative;
                    z-index: 1;
                    width: 100%;
                    max-width: 440px;
                    background: rgba(255, 255, 255, 0.95);
                    backdrop-filter: blur(20px);
                    border-radius: 24px;
                    padding: 3rem 2.5rem;
                    box-shadow: 0 20px 60px rgba(124, 58, 237, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.5);
                    animation: slideUp 0.6s ease-out;
                }

                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .auth-header {
                    text-align: center;
                    margin-bottom: 2rem;
                }

                .logo-icon {
                    width: 64px;
                    height: 64px;
                    background: linear-gradient(135deg, #7c3aed, #a855f7);
                    color: white;
                    border-radius: 16px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 1rem;
                    box-shadow: 0 8px 24px rgba(124, 58, 237, 0.3);
                    transform: rotate(-5deg);
                    animation: pulse 2s ease-in-out infinite;
                }

                @keyframes pulse {
                    0%, 100% { transform: rotate(-5deg) scale(1); }
                    50% { transform: rotate(-5deg) scale(1.05); }
                }

                .logo-text {
                    font-size: 2rem;
                    font-weight: 800;
                    background: linear-gradient(135deg, #7c3aed, #a855f7);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    margin: 0 0 0.5rem 0;
                }

                .tagline {
                    color: var(--text-secondary);
                    font-size: 0.95rem;
                    margin: 0;
                }

                .auth-tabs {
                    display: flex;
                    gap: 0.5rem;
                    background: #f1f5f9;
                    padding: 0.5rem;
                    border-radius: 12px;
                    margin-bottom: 2rem;
                }

                .tab {
                    flex: 1;
                    padding: 0.75rem;
                    border: none;
                    background: transparent;
                    color: var(--text-secondary);
                    font-weight: 600;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.3s;
                }

                .tab.active {
                    background: white;
                    color: var(--brand-primary);
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                }

                .auth-form {
                    display: flex;
                    flex-direction: column;
                    gap: 1.25rem;
                }

                .input-group {
                    position: relative;
                    animation: fadeIn 0.4s ease-out;
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .input-icon {
                    position: absolute;
                    left: 1rem;
                    top: 50%;
                    transform: translateY(-50%);
                    color: var(--text-secondary);
                    pointer-events: none;
                    transition: all 0.3s;
                    z-index: 1;
                }

                .auth-input {
                    width: 100%;
                    padding: 1rem 1rem 1rem 3rem;
                    border: 2px solid #e2e8f0;
                    border-radius: 12px;
                    font-size: 1rem;
                    background: white;
                    transition: all 0.3s;
                    outline: none;
                }

                .auth-input:focus {
                    border-color: var(--brand-primary);
                    box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.1);
                    transform: translateY(-2px);
                }

                .auth-input:focus + .input-icon,
                .input-group:focus-within .input-icon {
                    color: var(--brand-primary);
                    transform: translateY(-50%) scale(1.1);
                }

                .btn-submit {
                    width: 100%;
                    padding: 1rem;
                    border: none;
                    border-radius: 12px;
                    background: linear-gradient(135deg, #7c3aed, #a855f7);
                    color: white;
                    font-size: 1rem;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    transition: all 0.3s;
                    box-shadow: 0 4px 16px rgba(124, 58, 237, 0.3);
                    margin-top: 0.5rem;
                }

                .btn-submit:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 24px rgba(124, 58, 237, 0.4);
                }

                .btn-submit:active:not(:disabled) {
                    transform: translateY(0);
                }

                .btn-submit:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                }

                @media (max-width: 640px) {
                    .auth-card {
                        padding: 2rem 1.5rem;
                    }

                    .gradient-orb {
                        filter: blur(60px);
                    }
                }
            `}</style>
        </div>
    );
}
