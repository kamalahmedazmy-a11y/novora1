import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { School, Plus, Power, Users, Globe, Settings, ShieldAlert, Sparkles } from 'lucide-react';

const AdminDashboard = () => {
    const { user, logout } = useAuth();
    const [schools, setSchools] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Form states
    const [schoolName, setSchoolName] = useState('');
    const [subdomain, setSubdomain] = useState('');
    const [adminName, setAdminName] = useState('');
    const [adminEmail, setAdminEmail] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        fetchSchools();
    }, []);

    const fetchSchools = async () => {
        try {
            const res = await fetch('/api/admin/schools', {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            const data = await res.json();
            if (res.ok) {
                setSchools(data);
            } else {
                setError(data.message || 'Failed to fetch schools');
            }
        } catch (err) {
            setError('Failed to connect to server');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSchool = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/auth/register-school', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${user.token}`
                },
                body: JSON.stringify({
                    schoolName,
                    subdomain,
                    adminName,
                    adminEmail,
                    adminPassword
                })
            });
            const data = await res.json();
            if (res.ok) {
                setShowModal(false);
                setSchoolName('');
                setSubdomain('');
                setAdminName('');
                setAdminEmail('');
                setAdminPassword('');
                fetchSchools();
            } else {
                alert(data.message || 'Error creating school');
            }
        } catch (err) {
            alert('Failed to connect to server');
        }
    };

    const toggleSchoolStatus = async (id, currentStatus) => {
        try {
            const res = await fetch(`/api/admin/schools/${id}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${user.token}`
                },
                body: JSON.stringify({ isActive: !currentStatus })
            });
            if (res.ok) {
                fetchSchools();
            } else {
                alert('Failed to update status');
            }
        } catch (err) {
            alert('Failed to connect to server');
        }
    };

    return (
        <div className="admin-container">
            <header className="admin-header glass">
                <div className="header-content">
                    <div className="logo-area">
                        <img src="/novora-logo.png" alt="Novora" className="brand-logo" />
                        <div className="brand-divider" />
                        <h1 className="logo-text">Novora Central</h1>
                    </div>
                    <div className="user-area">
                        <div className="user-badge">Super Admin</div>
                        <span className="user-name">{user.name}</span>
                        <button onClick={logout} className="btn-logout">Logout</button>
                    </div>
                </div>
            </header>

            <main className="admin-main">
                <div className="page-header">
                    <h2>Schools Administration</h2>
                    <button className="btn-primary" onClick={() => setShowModal(true)}>
                        <Plus size={18} /> Register School
                    </button>
                </div>

                {loading ? (
                    <div className="loading">Loading schools data...</div>
                ) : error ? (
                    <div className="error-box"><ShieldAlert size={20} /> {error}</div>
                ) : (
                    <div className="schools-grid">
                        {schools.map((school) => (
                            <div key={school._id} className={`school-card card ${!school.isActive ? 'suspended' : ''}`}>
                                <div className="card-header">
                                    <div className="school-info-main">
                                        <div className="school-icon">
                                            <School size={24} />
                                        </div>
                                        <div>
                                            <h3>{school.name}</h3>
                                            <span className="subdomain-tag"><Globe size={12} /> {school.subdomain}.novora.com</span>
                                        </div>
                                    </div>
                                    <button 
                                        className={`btn-status ${school.isActive ? 'active' : 'suspended'}`}
                                        onClick={() => toggleSchoolStatus(school._id, school.isActive)}
                                        title={school.isActive ? "Suspend School" : "Activate School"}
                                    >
                                        <Power size={18} />
                                    </button>
                                </div>

                                <div className="card-stats">
                                    <div className="stat-item">
                                        <Users size={16} />
                                        <span><strong>{school.stats?.students || 0}</strong> Students</span>
                                    </div>
                                    <div className="stat-item">
                                        <Settings size={16} />
                                        <span><strong>{school.stats?.teachers || 0}</strong> Teachers</span>
                                    </div>
                                </div>

                                <div className="card-footer">
                                    <span className={`status-pill ${school.isActive ? 'active' : 'inactive'}`}>
                                        {school.isActive ? 'Active' : 'Suspended'}
                                    </span>
                                    <span className="plan-pill">{school.subscriptionPlan}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {showModal && (
                <div className="modal-backdrop">
                    <div className="modal-content glass fade-in">
                        <div className="modal-header">
                            <h3>Register New School</h3>
                            <button className="btn-close" onClick={() => setShowModal(false)}>&times;</button>
                        </div>
                        <form onSubmit={handleCreateSchool} className="admin-form">
                            <div className="form-section-title">School Details</div>
                            <div className="form-group">
                                <label>School Name</label>
                                <input type="text" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} required placeholder="e.g. Stanford Academy" />
                            </div>
                            <div className="form-group">
                                <label>Subdomain</label>
                                <div className="input-group">
                                    <input type="text" value={subdomain} onChange={(e) => setSubdomain(e.target.value)} required placeholder="e.g. stanford" />
                                    <span className="suffix">.novora.com</span>
                                </div>
                            </div>

                            <div className="form-section-title">Admin Account Details</div>
                            <div className="form-group">
                                <label>Administrator Name</label>
                                <input type="text" value={adminName} onChange={(e) => setAdminName(e.target.value)} required placeholder="e.g. John Doe" />
                            </div>
                            <div className="form-group">
                                <label>Administrator Email</label>
                                <input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} required placeholder="e.g. admin@school.com" />
                            </div>
                            <div className="form-group">
                                <label>Administrator Password</label>
                                <input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} required placeholder="e.g. SecurePassword123!" />
                            </div>

                            <button type="submit" className="btn-primary w-full">Create School Instance</button>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                .admin-container {
                    min-height: 100vh;
                    background: var(--nv-bg);
                    color: var(--nv-text);
                    padding-bottom: 3rem;
                    font-family: var(--nv-font);
                }
                .admin-header {
                    padding: 0.9rem 2rem; margin-bottom: 2rem;
                    background: var(--nv-surface);
                    border-bottom: 1px solid var(--nv-border-2);
                }
                .header-content { display: flex; justify-content: space-between; align-items: center; }
                .logo-area { display: flex; align-items: center; gap: 0.85rem; }
                .brand-logo { height: 26px; width: auto; display: block; }
                .brand-divider { width: 1px; height: 26px; background: #d8cfe6; }
                .logo-text { font-size: 1.2rem; font-weight: 800; color: var(--nv-text); letter-spacing: -0.01em; }
                .user-area { display: flex; align-items: center; gap: 1rem; }
                .user-badge {
                    background: var(--nv-chip); color: var(--nv-primary);
                    padding: 0.3rem 0.8rem; border-radius: 999px; font-size: 0.78rem; font-weight: 700;
                }
                .user-name { color: var(--nv-soft); font-weight: 600; font-size: 0.9rem; }
                .btn-logout {
                    background: transparent; border: 1px solid var(--nv-border-3);
                    color: var(--nv-muted); padding: 0.4rem 1rem; border-radius: 9px;
                    cursor: pointer; font-weight: 600; transition: all 0.2s;
                }
                .btn-logout:hover { background: var(--nv-red); color: #fff; border-color: var(--nv-red); }
                .admin-main { max-width: 1200px; margin: 0 auto; padding: 0 1.5rem; }
                .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
                .page-header h2 { font-size: 1.6rem; font-weight: 800; color: var(--nv-text); }
                .btn-primary {
                    display: flex; align-items: center; gap: 0.5rem; padding: 0.65rem 1.2rem;
                    background: var(--nv-primary); color: #fff; border: none; border-radius: 9px;
                    cursor: pointer; font-weight: 700; box-shadow: 0 6px 16px -4px rgba(102,51,153,.5);
                    font-family: var(--nv-font); transition: all 0.2s;
                }
                .btn-primary:hover { background: #59308a; transform: translateY(-1px); }
                .schools-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 1.5rem; }
                .school-card {
                    background: var(--nv-surface); border: 1px solid var(--nv-border);
                    border-radius: var(--nv-radius); padding: 1.5rem;
                    box-shadow: var(--nv-shadow-sm); transition: all 0.25s;
                }
                .school-card:hover { border-color: #e0d3f3; box-shadow: 0 12px 28px -16px rgba(102,51,153,.45); transform: translateY(-3px); }
                .school-card.suspended { opacity: 0.6; }
                .card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; }
                .school-info-main { display: flex; gap: 1rem; }
                .school-icon {
                    width: 48px; height: 48px; background: var(--nv-chip);
                    border-radius: 12px; display: flex; align-items: center; justify-content: center; color: var(--nv-primary);
                }
                .school-card.suspended .school-icon { color: var(--nv-muted); }
                .school-info-main h3 { font-size: 1.15rem; font-weight: 700; color: var(--nv-text); margin-bottom: 0.25rem; }
                .subdomain-tag { font-size: 0.8rem; color: var(--nv-muted); display: flex; align-items: center; gap: 0.25rem; }
                .btn-status {
                    background: var(--nv-surface-2); border: none; width: 36px; height: 36px;
                    border-radius: 50%; display: flex; align-items: center; justify-content: center;
                    cursor: pointer; color: var(--nv-green); transition: all 0.2s;
                }
                .btn-status.suspended { color: var(--nv-red); }
                .btn-status:hover { background: var(--nv-chip); }
                .card-stats { display: flex; gap: 1.5rem; border-top: 1px solid var(--nv-border-2); padding: 1rem 0; }
                .stat-item { display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; color: var(--nv-muted); }
                .card-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem; }
                .status-pill { font-size: 0.74rem; padding: 0.25rem 0.5rem; border-radius: 6px; font-weight: 700; }
                .status-pill.active { background: var(--nv-green-bg); color: var(--nv-green); }
                .status-pill.inactive { background: var(--nv-red-bg); color: var(--nv-red); }
                .plan-pill {
                    font-size: 0.74rem; text-transform: uppercase; background: var(--nv-surface-2);
                    color: var(--nv-soft); padding: 0.25rem 0.5rem; border-radius: 6px; font-weight: 700; letter-spacing: 0.5px;
                }
                .modal-backdrop {
                    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                    background: rgba(42, 31, 56, 0.45); display: flex; align-items: center; justify-content: center;
                    z-index: 1000; backdrop-filter: blur(4px);
                }
                .modal-content {
                    width: 100%; max-width: 500px; background: var(--nv-surface);
                    border: 1px solid var(--nv-border); border-radius: 20px; padding: 2rem;
                    box-shadow: var(--nv-shadow);
                }
                .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; border-bottom: 1px solid var(--nv-border-2); padding-bottom: 0.75rem; }
                .modal-header h3 { font-size: 1.25rem; font-weight: 700; color: var(--nv-text); }
                .btn-close { background: transparent; border: none; color: var(--nv-muted); font-size: 1.5rem; cursor: pointer; }
                .admin-form { display: flex; flex-direction: column; gap: 1.2rem; }
                .form-section-title { font-size: 0.85rem; text-transform: uppercase; color: var(--nv-primary); font-weight: 700; letter-spacing: 0.5px; margin-top: 0.5rem; }
                .form-group { display: flex; flex-direction: column; gap: 0.5rem; }
                .form-group label { font-size: 0.85rem; font-weight: 600; color: var(--nv-muted); }
                .form-group input {
                    padding: 0.7rem 0.8rem; background: var(--nv-surface-2); border: 1px solid var(--nv-border-3);
                    border-radius: 9px; color: var(--nv-text); outline: none; font-family: var(--nv-font);
                }
                .form-group input:focus { border-color: var(--nv-light); }
                .input-group { display: flex; }
                .input-group input { flex-grow: 1; border-top-right-radius: 0; border-bottom-right-radius: 0; }
                .input-group .suffix {
                    background: var(--nv-surface-2); border: 1px solid var(--nv-border-3); border-left: none;
                    display: flex; align-items: center; padding: 0 0.75rem; font-size: 0.9rem; color: var(--nv-muted);
                    border-top-right-radius: 9px; border-bottom-right-radius: 9px;
                }
                .w-full { width: 100%; }
                .loading, .error-box { text-align: center; padding: 3rem; color: var(--nv-muted); font-size: 1.1rem; }
                .error-box { color: var(--nv-red); display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
            
            `}</style>
        </div>
    );
};

export default AdminDashboard;
