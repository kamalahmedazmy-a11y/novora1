import { useAuth } from '../../context/AuthContext';
import { useProgress } from '../../context/ProgressContext';
const logo = '/vite.svg';
import { LogOut } from 'lucide-react';

export default function Navbar() {
    const { user, logout } = useAuth();
    const { getProgressPercentage } = useProgress();

    return (
        <nav className="navbar">
            <div className="container navbar-content">
                <div className="navbar-brand">
                    <img src={logo} alt="Novora" className="navbar-logo" />
                    <span className="navbar-title">Novora</span>
                </div>

                <div className="navbar-actions">
                    <div className="progress-indicator">
                        <div className="progress-bar-bg">
                            <div
                                className="progress-bar-fill"
                                style={{ width: `${getProgressPercentage()}%` }}
                            />
                        </div>
                        <span className="progress-text">{getProgressPercentage()}% Complete</span>
                    </div>

                    <div className="user-profile">
                        <span className="user-name">{user?.name}</span>
                        <button onClick={logout} className="btn-icon" title="Log Out">
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
}
