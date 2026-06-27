import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    BookOpen,
    Lock,
    CheckCircle,
    PlayCircle,
    LogOut,
    Zap,
    Activity,
    User,
    BarChart2,
    X,
    Calendar,
    Clock,
    FileText
} from 'lucide-react';
import StatsOverview from '../components/dashboard/StatsOverview';
import ProgressDashboard from '../components/dashboard/ProgressDashboard';
import { useAuth } from '../context/AuthContext';
import { useProgress } from '../context/ProgressContext';
import { useSchool } from '../context/SchoolContext';
import LanguageToggle from '../components/common/LanguageToggle';
import NotificationBell from '../components/common/NotificationBell';

const Dashboard = () => {
    const { user, logout } = useAuth();
    const { school } = useSchool();
    const {
        chapters,
        completedChapters,
        examScores,
        isChapterLocked,
        getProgressPercentage,
        selectedSubjectId,
        setSelectedSubjectId,
        loading: progressLoading
    } = useProgress();

    const [classroom, setClassroom] = useState(null);
    const [schedule, setSchedule] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [showStats, setShowStats] = useState(false);
    const [homework, setHomework] = useState([]);
    const [studentExams, setStudentExams] = useState([]);
    const [taking, setTaking] = useState(null);   // exam being taken
    const [answers, setAnswers] = useState({});
    const navigate = useNavigate();

    const token = user?.token;
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    useEffect(() => {
        if (!token) return;
        fetch('/api/homework', { headers })
            .then(r => r.ok ? r.json() : [])
            .then(setHomework)
            .catch(() => {});
        loadExams();
    }, [token]);

    const loadExams = () => {
        fetch('/api/student/exams', { headers })
            .then(r => r.ok ? r.json() : [])
            .then(d => setStudentExams(Array.isArray(d) ? d : []))
            .catch(() => {});
    };

    const submitExam = async () => {
        const res = await fetch(`/api/student/exams/${taking._id}/submit`, {
            method: 'POST', headers, body: JSON.stringify({ answers }),
        });
        const d = await res.json();
        if (res.ok) {
            alert(`✅ Score: ${d.score}% — ${d.passed ? 'Passed' : 'Failed'}`);
            setTaking(null); setAnswers({}); loadExams();
        } else alert(d.message || 'Submit failed');
    };

    useEffect(() => {
        if (!user) {
            navigate('/auth');
            return;
        }

        // Redirect non-students to their respective dashboards
        if (user.role === 'super_admin') {
            navigate('/admin');
            return;
        } else if (user.role === 'school_admin') {
            navigate('/school');
            return;
        } else if (user.role === 'teacher') {
            navigate('/teacher');
            return;
        } else if (user.role === 'parent') {
            navigate('/parent');
            return;
        } else if (user.role === 'bus_supervisor') {
            navigate('/bus');
            return;
        }

        fetchStudentContext();
    }, [user, navigate]);

    const fetchStudentContext = async () => {
        try {
            // Fetch student classroom info
            const classRes = await fetch('/api/student/classroom', { headers });
            if (classRes.ok) {
                const classData = await classRes.json();
                setClassroom(classData);
            }

            // Fetch weekly schedule
            const schedRes = await fetch('/api/student/schedule', { headers });
            if (schedRes.ok) {
                const schedData = await schedRes.json();
                setSchedule(Array.isArray(schedData) ? schedData : []);

                // Extract unique subjects from schedule
                const uniqueSubjects = [];
                const seenSubjectIds = new Set();
                (Array.isArray(schedData) ? schedData : []).forEach(s => {
                    const subject = s.subjectId;
                    if (subject && subject._id && !seenSubjectIds.has(subject._id)) {
                        seenSubjectIds.add(subject._id);
                        uniqueSubjects.push(subject);
                    }
                });
                setSubjects(uniqueSubjects);

                // Set default subject if none selected yet
                if (uniqueSubjects.length > 0 && !selectedSubjectId) {
                    setSelectedSubjectId(uniqueSubjects[0]._id);
                }
            }
        } catch (err) {
            console.error('Failed to fetch student context details', err);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/auth');
    };

    if (!user) return null;

    // Progress details for the selected subject
    const completedCount = chapters.filter(c => completedChapters.includes(c.id)).length;
    const totalChaptersCount = chapters.length;
    const progressPercent = getProgressPercentage();

    // Map day numbers to day names
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return (
        <div className="dashboard-container fade-in">
            {/* Header */}
            <header className="dashboard-header glass">
                <div className="container header-content">
                    <div className="logo-area">
                        <img src="/novora-logo.png" alt="Novora" style={{ height: 26, width: 'auto', display: 'block' }} />
                        {school && <span style={styles.schoolBadge}>{school.name}</span>}
                    </div>
                    <div className="user-area">
                        <LanguageToggle />
                        <NotificationBell />
                        <button
                            className={`btn-stats ${showStats ? 'active' : ''}`}
                            onClick={() => setShowStats(!showStats)}
                            title="View Statistics"
                        >
                            {showStats ? <X size={20} /> : <BarChart2 size={20} />}
                            <span className="btn-text">{showStats ? 'Close Stats' : 'My Stats'}</span>
                        </button>
                        <div className="divider"></div>
                        <div className="user-avatar">
                            <User size={20} />
                        </div>
                        <span className="user-name">{user.name}</span>
                        <button onClick={handleLogout} className="btn-logout" title="Logout">
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </header>

            <main className="container dashboard-main">
                <section className="welcome-section slide-in-down">
                    <h1>Ready to learn, <span className="text-gradient">{user.name.split(' ')[0]}</span>?</h1>
                    {classroom ? (
                        <p>Classroom: <strong>{classroom.name}</strong> • Homeroom Teacher: <strong>{classroom.homeroomTeacherId?.name || 'N/A'}</strong></p>
                    ) : (
                        <p>Welcome to Novora Multi-Tenant LMS portal.</p>
                    )}
                </section>

                <section className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
                    <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <BookOpen size={20} style={{ color: 'var(--brand-primary)' }} /> Homework ({homework.length})
                    </h3>
                    {homework.length === 0 ? (
                        <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '0.5rem 0 0' }}>
                            No homework assigned.
                        </p>
                    ) : (
                        homework.map(h => (
                            <div key={h._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0', borderTop: '1px solid #f0ecf6' }}>
                                <div>
                                    <strong>{h.title}</strong>
                                    <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                                        {h.subjectId?.title || ''}
                                        {h.teacherId?.name ? ' · ' + h.teacherId.name : ''}
                                        {h.description ? ' · ' + h.description : ''}
                                    </div>
                                </div>
                                <span style={{ fontSize: '0.8rem', color: '#7c3aed', whiteSpace: 'nowrap' }}>
                                    {h.dueDate ? new Date(h.dueDate).toLocaleDateString() : ''}
                                </span>
                            </div>
                        ))
                    )}
                </section>

                {/* Exams */}
                <section className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
                    <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileText size={20} style={{ color: 'var(--brand-primary)' }} /> Exams ({studentExams.length})
                    </h3>
                    {studentExams.length === 0 ? (
                        <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '0.5rem 0 0' }}>No exams available.</p>
                    ) : (
                        studentExams.map(ex => {
                            const lastScore = ex.attempts && ex.attempts.length ? ex.attempts[0].score : null;
                            return (
                                <div key={ex._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0', borderTop: '1px solid #f0ecf6' }}>
                                    <div>
                                        <strong>{ex.title}</strong>
                                        <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                                            {ex.subjectId?.title || ''}{ex.teacherId?.name ? ' · ' + ex.teacherId.name : ''} · {ex.questions?.length || 0} Qs
                                        </div>
                                    </div>
                                    {lastScore !== null ? (
                                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: lastScore >= (ex.passingScore || 50) ? '#10b981' : '#ef4444' }}>{lastScore}%</span>
                                    ) : (ex.questions && ex.questions.length > 0) ? (
                                        <button onClick={() => { setTaking(ex); setAnswers({}); }} style={{ padding: '0.4rem 0.9rem', background: 'var(--brand-primary)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.85rem' }}>Take</button>
                                    ) : (
                                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>No questions yet</span>
                                    )}
                                </div>
                            );
                        })
                    )}
                </section>

                {showStats ? (
                    <ProgressDashboard progress={{ completedChapters, examScores }} chapters={chapters} />
                ) : (
                    <>
                        {/* Subject Navigation Tabs */}
                        {subjects.length > 0 && (
                            <div style={styles.tabsRow}>
                                {subjects.map((sub) => (
                                    <button
                                        key={sub._id}
                                        onClick={() => setSelectedSubjectId(sub._id)}
                                        style={{
                                            ...styles.tabBtn,
                                            ...(selectedSubjectId === sub._id ? styles.tabBtnActive : {})
                                        }}
                                    >
                                        <BookOpen size={18} />
                                        <span>{sub.title}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        <div style={styles.dashboardSplitGrid}>
                            <div style={{ flex: 2, minWidth: '300px' }}>
                                {/* Progress Section */}
                                <section className="progress-section card scale-in">
                                    <div className="progress-header">
                                        <div className="ph-left">
                                            <div className="icon-box">
                                                <Activity size={24} />
                                            </div>
                                            <div>
                                                <h2>Subject Progression</h2>
                                                <p className="subtitle">
                                                    {completedCount} of {totalChaptersCount} modules completed
                                                </p>
                                            </div>
                                        </div>
                                        <div className="ph-right">
                                            <span className="percent-badge text-gradient">{progressPercent}%</span>
                                        </div>
                                    </div>

                                    <div className="progress-bar-container">
                                        <div className="progress-bar" style={{ width: `${progressPercent}%` }}>
                                            <div className="shimmer"></div>
                                        </div>
                                    </div>
                                </section>

                                {/* Course Modules Grid */}
                                <h2 className="section-title fade-in-up">Course Modules</h2>
                                {progressLoading ? (
                                    <p style={{ color: '#64748b' }}>Loading modules...</p>
                                ) : chapters.length === 0 ? (
                                    <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                                        No chapters uploaded for this subject yet.
                                    </div>
                                ) : (
                                    <section className="chapters-grid">
                                        {chapters.map((chapter, index) => {
                                            const locked = isChapterLocked(chapter.id);
                                            const completed = completedChapters.includes(chapter.id);

                                            return (
                                                <div
                                                    key={chapter._id}
                                                    className={`chapter-card card ${locked ? 'locked' : ''} ${completed ? 'completed' : ''} fade-in-up`}
                                                    style={{ animationDelay: `${index * 100}ms` }}
                                                >
                                                    <div className="card-status-bar">
                                                        <span className="chapter-id">Order {chapter.order || index + 1}</span>
                                                        {completed ? (
                                                            <CheckCircle size={20} className="status-icon completed" />
                                                        ) : locked ? (
                                                            <Lock size={20} className="status-icon locked" />
                                                        ) : (
                                                            <div className="status-icon pending" />
                                                        )}
                                                    </div>

                                                    <h3 className="card-title">{chapter.title}</h3>
                                                    <p className="card-desc">{chapter.description}</p>

                                                    <div className="card-footer">
                                                        {!locked ? (
                                                            <Link to={`/chapter/${chapter._id}`} className="btn-start">
                                                                {completed ? (
                                                                    <>
                                                                        <div className="icon-gradient-wrapper">
                                                                            <BookOpen size={18} />
                                                                        </div>
                                                                        Review
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <PlayCircle size={18} /> Start
                                                                    </>
                                                                )}
                                                            </Link>
                                                        ) : (
                                                            <button disabled className="btn-locked">
                                                                <Lock size={16} /> Locked
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </section>
                                )}
                            </div>

                            {/* Weekly timings sidebar schedule */}
                            <div style={{ flex: 1, minWidth: '260px' }}>
                                <div className="card" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.7)' }}>
                                    <h3 style={styles.sidebarTitle}>
                                        <Calendar size={18} style={{ color: 'var(--brand-primary)' }} />
                                        Weekly Timetable
                                    </h3>
                                    {schedule.length === 0 ? (
                                        <p style={{ color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center', marginTop: '1rem' }}>
                                            No weekly lectures scheduled.
                                        </p>
                                    ) : (
                                        <div style={styles.scheduleTimeline}>
                                            {schedule.map((s, idx) => (
                                                <div key={idx} style={styles.scheduleItem}>
                                                    <div style={styles.scheduleDayBadge}>
                                                        {dayNames[s.dayOfWeek]?.slice(0, 3)}
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <strong style={{ fontSize: '0.95rem', color: '#1e293b' }}>
                                                            {s.subjectId?.title || 'Lecture'}
                                                        </strong>
                                                        <span style={styles.scheduleTime}>
                                                            <Clock size={12} /> {s.startTime} – {s.endTime}
                                                        </span>
                                                        <span style={styles.scheduleTeacher}>
                                                            Teacher: {s.teacherId?.name || 'Staff'}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </main>

            {taking && (
                <div onClick={() => setTaking(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(42,31,56,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '1rem' }}>
                    <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 18, padding: '1.5rem', width: '100%', maxWidth: 520, maxHeight: '85vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ margin: 0 }}>{taking.title}</h3>
                            <button onClick={() => setTaking(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
                        </div>
                        {(taking.questions || []).map((q, i) => (
                            <div key={q._id} style={{ marginBottom: '1rem' }}>
                                <strong style={{ fontSize: '0.95rem' }}>{i + 1}. {q.text}</strong>
                                <div style={{ marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                    {q.options.map((opt, idx) => (
                                        <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.6rem', background: answers[q._id] === idx ? '#f3edfb' : '#f6f3fb', borderRadius: 8, cursor: 'pointer', fontSize: '0.88rem' }}>
                                            <input type="radio" name={q._id} checked={answers[q._id] === idx} onChange={() => setAnswers(a => ({ ...a, [q._id]: idx }))} />
                                            {opt}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ))}
                        <button onClick={submitExam} style={{ width: '100%', padding: '0.7rem', background: 'var(--brand-primary)', color: '#fff', border: 'none', borderRadius: 9, fontWeight: 700, cursor: 'pointer', marginTop: '0.5rem' }}>Submit Exam</button>
                    </div>
                </div>
            )}

            <style>{`
                /* Animations */
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes slideInDown {
                    from { opacity: 0; transform: translateY(-20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes scaleIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }

                .fade-in { animation: fadeInUp 0.6s ease-out forwards; }
                .slide-in-down { animation: slideInDown 0.6s ease-out forwards; }
                .scale-in { animation: scaleIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; opacity: 0; animation-delay: 0.2s; }
                .fade-in-up { animation: fadeInUp 0.6s ease-out forwards; opacity: 0; }

                /* Dashboard Container */
                .dashboard-container {
                    padding-bottom: 4rem;
                }

                /* Header */
                .dashboard-header {
                    padding: 1rem 0;
                    margin-bottom: 3rem;
                    position: sticky;
                    top: 0;
                    z-index: 100;
                }
                .header-content {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .logo-area {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }
                .logo-icon {
                    width: 40px;
                    height: 40px;
                    background: var(--brand-primary);
                    color: white;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transform: rotate(-5deg);
                    box-shadow: var(--shadow-glow);
                }
                .logo-text {
                    font-size: 1.5rem;
                    font-weight: 800;
                    letter-spacing: -0.5px;
                }
                .user-area {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    background: rgba(255, 255, 255, 0.8);
                    padding: 0.5rem 1rem;
                    border-radius: 99px;
                    border: 1px solid white;
                    box-shadow: var(--shadow-sm);
                    backdrop-filter: blur(8px);
                }
                .divider {
                    width: 1px;
                    height: 20px;
                    background: var(--color-slate-100);
                }
                .user-avatar {
                    width: 32px;
                    height: 32px;
                    background: var(--color-bg-purple);
                    color: var(--brand-primary);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .user-name {
                    font-weight: 600;
                    color: var(--text-primary);
                }
                .btn-logout {
                    background: none;
                    border: none;
                    color: var(--text-secondary);
                    cursor: pointer;
                    padding: 0.25rem;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                }
                .btn-logout:hover {
                    color: #ef4444;
                    background: #fee2e2;
                }
                
                .btn-stats {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem 1rem;
                    border-radius: 99px;
                    background: transparent;
                    color: var(--text-secondary);
                    font-weight: 600;
                    font-size: 0.9rem;
                    transition: all 0.2s;
                    border: none;
                    cursor: pointer;
                }
                .btn-stats:hover {
                    background: var(--color-bg-purple);
                    color: var(--brand-primary);
                }
                .btn-stats.active {
                    background: var(--brand-primary);
                    color: white;
                }
                .btn-text {
                    display: none;
                }
                @media(min-width: 640px) {
                    .btn-text { display: inline; }
                }

                /* Main Area */
                .welcome-section {
                    margin-bottom: 2rem;
                }
                .welcome-section h1 {
                    font-size: 2rem;
                    font-weight: 800;
                    color: var(--color-slate-800);
                    margin-bottom: 0.5rem;
                }
                .welcome-section p {
                    color: var(--text-secondary);
                    font-size: 1.1rem;
                }

                /* Progress Section */
                .progress-section {
                    margin-bottom: 3rem;
                }
                .progress-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                    margin-bottom: 1.5rem;
                }
                .ph-left {
                    display: flex;
                    gap: 1.5rem;
                    align-items: center;
                }
                .icon-box {
                    width: 50px;
                    height: 50px;
                    background: #ecfdf5;
                    color: #10b981;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .ph-left h2 {
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin: 0;
                }
                .ph-left .subtitle {
                    color: var(--text-secondary);
                    margin: 0;
                    font-size: 0.95rem;
                }
                .percent-badge {
                    font-size: 2rem;
                    font-weight: 800;
                }
                .progress-bar-container {
                    background: var(--color-slate-100);
                    height: 16px;
                    border-radius: 99px;
                    overflow: hidden;
                    position: relative;
                }
                .progress-bar {
                    background: linear-gradient(90deg, var(--brand-dark), var(--brand-primary));
                    height: 100%;
                    border-radius: 99px;
                    position: relative;
                    transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 0 10px rgba(124, 58, 237, 0.5);
                }
                .shimmer {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.3) 50%, rgba(255, 255, 255, 0) 100%);
                    animation: shimmer 2s infinite linear;
                }

                /* Modules Grid */
                .section-title {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin-bottom: 1.5rem;
                    padding-left: 0.5rem;
                    border-left: 4px solid var(--brand-secondary);
                    line-height: 1.2;
                }
                .chapters-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: 1.5rem;
                    padding-bottom: 2rem;
                }
                .chapter-card {
                    transition: all 0.3s ease;
                    display: flex;
                    flex-direction: column;
                    position: relative;
                    overflow: hidden;
                    background: rgba(255, 255, 255, 0.8);
                }
                .chapter-card:hover {
                    transform: translateY(-8px);
                    box-shadow: var(--shadow-lg);
                    border-color: var(--brand-accent);
                }
                .card-status-bar {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1rem;
                }
                .chapter-id {
                    font-size: 0.75rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    color: var(--text-secondary);
                    background: var(--color-slate-50);
                    padding: 0.25rem 0.75rem;
                    border-radius: 99px;
                }
                .status-icon.completed { color: #10b981; }
                .status-icon.locked { color: var(--color-slate-600); }
                
                .card-title {
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin-bottom: 0.75rem;
                    line-height: 1.4;
                }
                .card-desc {
                    color: var(--text-secondary);
                    font-size: 0.95rem;
                    margin-bottom: 2rem;
                    flex-grow: 1;
                    line-height: 1.6;
                }
                
                .card-footer {
                    margin-top: auto;
                }
                .btn-start {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    width: 100%;
                    padding: 0.75rem;
                    background: var(--color-slate-50);
                    color: var(--brand-primary);
                    font-weight: 600;
                    border-radius: 12px;
                    transition: all 0.2s;
                    border: 1px solid transparent;
                }
                .btn-start:hover {
                    background: var(--brand-primary);
                    color: white;
                    box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
                }
                .chapter-card.completed .btn-start {
                    background: #ecfdf5;
                    color: #10b981;
                }
                .chapter-card.completed .btn-start:hover {
                    background: #10b981;
                    color: white;
                    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
                }

                .chapter-card.locked {
                    opacity: 0.8;
                    background: var(--color-slate-50);
                    border-style: dashed;
                }
                .btn-locked {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    width: 100%;
                    padding: 0.75rem;
                    background: var(--color-slate-100);
                    color: var(--text-secondary);
                    font-weight: 600;
                    border-radius: 12px;
                    cursor: not-allowed;
                    border: none;
                }

                .icon-gradient-wrapper {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    padding: 0.35rem;
                    border-radius: 8px;
                    background: linear-gradient(135deg, #7c3aed, #a855f7);
                    color: white;
                    box-shadow: 0 2px 8px rgba(124, 58, 237, 0.3);
                }

                .btn-start:hover .icon-gradient-wrapper {
                    background: linear-gradient(135deg, #6d28d9, #9333ea);
                    box-shadow: 0 4px 12px rgba(124, 58, 237, 0.4);
                }
            `}</style>
        </div>
    );
};

const styles = {
    schoolBadge: {
        fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '1px', padding: '0.25rem 0.75rem',
        background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
        color: 'white', borderRadius: 99
    },
    tabsRow: {
        display: 'flex', gap: '0.5rem', marginBottom: '2rem',
        overflowX: 'auto', paddingBottom: '0.5rem'
    },
    tabBtn: {
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        padding: '0.75rem 1.25rem', borderRadius: '12px',
        background: 'white', border: '1px solid #e2e8f0', cursor: 'pointer',
        fontWeight: 600, color: '#475569', transition: 'all 0.2s',
        whiteSpace: 'nowrap'
    },
    tabBtnActive: {
        background: 'var(--brand-primary)', color: 'white',
        borderColor: 'var(--brand-primary)',
        boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)'
    },
    dashboardSplitGrid: {
        display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-start'
    },
    sidebarTitle: {
        fontSize: '1rem', fontWeight: 700, color: '#475569',
        marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
        textTransform: 'uppercase', letterSpacing: '0.5px'
    },
    scheduleTimeline: {
        display: 'flex', flexDirection: 'column', gap: '1rem'
    },
    scheduleItem: {
        display: 'flex', gap: '0.75rem', padding: '0.75rem',
        background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9'
    },
    scheduleDayBadge: {
        padding: '0.25rem 0.5rem', background: '#e9d5ff', color: '#7c3aed',
        borderRadius: '6px', fontWeight: 700, fontSize: '0.8rem', height: 'fit-content'
    },
    scheduleTime: {
        display: 'flex', alignItems: 'center', gap: '0.25rem',
        fontSize: '0.8rem', color: '#64748b', marginTop: '0.15rem'
    },
    scheduleTeacher: {
        display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.1rem'
    }
};

export default Dashboard;
