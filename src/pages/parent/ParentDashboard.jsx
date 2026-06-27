import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, BarChart2, Calendar, LogOut, Zap, User,
  CheckCircle, XCircle, AlertCircle, BookOpen, Clock, FileText, Mail
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import LanguageToggle from '../../components/common/LanguageToggle';
import NotificationBell from '../../components/common/NotificationBell';

const ParentDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [classroom, setClassroom] = useState(null);
  const [progress, setProgress] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [reportCard, setReportCard] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [thread, setThread] = useState([]);
  const [msgText, setMsgText] = useState('');
  const [msgSearch, setMsgSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const token = user?.token;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    if (!user || user.role !== 'parent') {
      navigate('/auth');
      return;
    }
    fetchChildren();
  }, [user]);

  const fetchChildren = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/parent/children', { headers });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setChildren(data);
        if (data.length > 0) {
          fetchChildDetails(data[0]._id);
        }
      } else {
        setError(data.message || 'Failed to fetch children');
      }
    } catch (err) {
      console.error(err);
      setError('Connection error fetching children profile');
    }
    setLoading(false);
  };

  const fetchChildDetails = async (childId) => {
    const child = children.find(c => c._id === childId) || children[0];
    setSelectedChild(child || { _id: childId, name: 'Student' });
    setClassroom(null);
    setProgress([]);
    setAttendance([]);

    try {
      // Fetch classroom
      const classRes = await fetch(`/api/parent/children/${childId}/classroom`, { headers });
      if (classRes.ok) {
        const classData = await classRes.json();
        setClassroom(classData);
      }

      // Fetch progress
      const progRes = await fetch(`/api/parent/children/${childId}/progress`, { headers });
      if (progRes.ok) {
        const progData = await progRes.json();
        setProgress(progData);
      }

      // Fetch attendance
      const attRes = await fetch(`/api/parent/children/${childId}/attendance`, { headers });
      if (attRes.ok) {
        const attData = await attRes.json();
        setAttendance(attData);
      }

      // Fetch invoices (parent endpoint returns all children's; filter to this child)
      const invRes = await fetch('/api/finance/invoices', { headers });
      if (invRes.ok) {
        const all = await invRes.json();
        setInvoices(all.filter(i => String(i.studentId?._id || i.studentId) === String(childId)));
      }
    } catch (err) {
      console.error('Error fetching child details:', err);
    }
  };

  const payNow = async (invoiceId) => {
    const res = await fetch(`/api/finance/invoices/${invoiceId}/checkout`, { method: 'POST', headers });
    const d = await res.json();
    if (res.ok) {
      alert(`✅ Paid (test mode). Ref: ${d.reference}`);
      fetchChildDetails(selectedChild._id);
    } else alert(d.message || 'Payment failed');
  };

  const viewReportCard = async (childId) => {
    const res = await fetch(`/api/reportcard/${childId}`, { headers });
    if (res.ok) setReportCard(await res.json());
  };

  // ---- Messaging
  useEffect(() => {
    if (user?.role === 'parent') {
      fetch('/api/messages/contacts', { headers })
        .then(r => r.ok ? r.json() : []).then(setContacts).catch(() => {});
    }
  }, [user]);

  const openChat = async (contact) => {
    setActiveChat(contact);
    const res = await fetch(`/api/messages/${contact.id}`, { headers });
    if (res.ok) setThread(await res.json());
  };

  const sendMsg = async (e) => {
    e.preventDefault();
    if (!msgText.trim() || !activeChat) return;
    const res = await fetch('/api/messages', { method: 'POST', headers, body: JSON.stringify({ toId: activeChat.id, body: msgText }) });
    if (res.ok) { setMsgText(''); openChat(activeChat); }
  };

  // ---- School bus: report child won't ride tomorrow
  const markBusAbsentTomorrow = async () => {
    if (!selectedChild) return;
    const res = await fetch('/api/bus/absence', { method: 'POST', headers, body: JSON.stringify({ studentId: selectedChild._id }) });
    const d = await res.json();
    if (res.ok) alert(`✅ ${selectedChild.name} has been removed from tomorrow's bus route. The supervisor's list and map are updated.`);
    else alert(d.message || 'This student is not registered on a school bus.');
  };

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <p style={{ color: '#64748b', marginTop: '1rem' }}>Loading children details...</p>
      </div>
    );
  }

  // Calculate attendance rates
  const totalDays = attendance.length;
  const presentDays = attendance.filter(a => a.status === 'present').length;
  const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100;

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header} className="glass">
        <div className="container" style={styles.headerContent}>
          <div style={styles.logoArea}>
            <img src="/novora-logo.png" alt="Novora" style={{ height: 26, width: 'auto', display: 'block' }} />
            <span style={styles.roleBadge}>Parent</span>
          </div>
          <div style={styles.userArea}>
            <LanguageToggle />
            <NotificationBell />
            <div style={styles.userAvatar}><User size={20} /></div>
            <span style={styles.userName}>{user?.name}</span>
            <button onClick={handleLogout} style={styles.btnLogout} title="Logout"><LogOut size={20} /></button>
          </div>
        </div>
      </header>

      <main className="container" style={styles.main}>
        {error ? (
          <div style={styles.errorBox}>
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        ) : children.length === 0 ? (
          <div style={styles.emptyState}>
            <Users size={48} style={{ color: '#cbd5e1' }} />
            <p>No student profiles linked to this parent account.</p>
          </div>
        ) : (
          <div style={styles.dashboardGrid}>
            {/* Sidebar with children selector */}
            <div style={styles.sidebar}>
              <h3 style={styles.sidebarTitle}>Your Children</h3>
              <div style={styles.childrenList}>
                {children.map(child => (
                  <button
                    key={child._id}
                    onClick={() => fetchChildDetails(child._id)}
                    style={{
                      ...styles.childBtn,
                      ...(selectedChild?._id === child._id ? styles.childBtnActive : {})
                    }}
                  >
                    <div style={{
                      ...styles.avatarSmall,
                      background: selectedChild?._id === child._id ? 'white' : 'var(--color-bg-purple)'
                    }}><User size={16} /></div>
                    <span style={styles.childName}>{child.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Main Area showing selected child stats & reports */}
            <div style={styles.detailsArea}>
              <div style={styles.welcomeCard} className="card">
                <h2>Tracking performance for <span className="text-gradient">{selectedChild?.name}</span></h2>
                {classroom ? (
                  <p style={{ color: '#64748b', marginTop: '0.25rem' }}>
                    Enrolled in: <strong>{classroom.name}</strong>
                  </p>
                ) : (
                  <p style={{ color: '#94a3b8', marginTop: '0.25rem' }}>No active classroom enrollment found.</p>
                )}
                <button onClick={() => viewReportCard(selectedChild._id)} style={styles.reportCardBtn}>
                  <FileText size={16} /> View Report Card
                </button>
              </div>

              {/* Stats Overview */}
              <div style={styles.statsRow}>
                <div style={styles.statCard} className="card">
                  <div style={styles.statIcon}><BarChart2 size={24} /></div>
                  <div>
                    <span style={styles.statLabel}>Completed Chapters</span>
                    <span style={styles.statValue}>{progress.length}</span>
                  </div>
                </div>

                <div style={styles.statCard} className="card">
                  <div style={{ ...styles.statIcon, color: '#10b981', background: '#ecfdf5' }}><Calendar size={24} /></div>
                  <div>
                    <span style={styles.statLabel}>Attendance Rate</span>
                    <span style={styles.statValue}>{attendanceRate}%</span>
                  </div>
                </div>
              </div>

              <div style={styles.reportRow}>
                {/* Chapters Progress */}
                <div style={{ ...styles.reportCard, flex: 1.5 }} className="card">
                  <h3 style={styles.cardTitle}>
                    <BookOpen size={20} style={{ color: 'var(--brand-primary)' }} />
                    Chapter Progression
                  </h3>
                  {progress.length === 0 ? (
                    <p style={styles.emptyText}>No chapter progression history available.</p>
                  ) : (
                    <div style={styles.historyList}>
                      {progress.map((p, idx) => (
                        <div key={p._id || idx} style={styles.historyItem}>
                          <div style={styles.historyMeta}>
                            <strong>{p.chapterId?.title || 'General Module'}</strong>
                            <small>{p.completedAt ? new Date(p.completedAt).toLocaleDateString() : 'Active'}</small>
                          </div>
                          <span style={styles.xpBadge}>+{p.xp} XP</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Attendance Log */}
                <div style={{ ...styles.reportCard, flex: 1 }} className="card">
                  <h3 style={styles.cardTitle}>
                    <Clock size={20} style={{ color: '#10b981' }} />
                    Recent Attendance
                  </h3>
                  {attendance.length === 0 ? (
                    <p style={styles.emptyText}>No attendance records registered yet.</p>
                  ) : (
                    <div style={styles.historyList}>
                      {attendance.slice(0, 10).map((a, idx) => (
                        <div key={a._id || idx} style={styles.historyItem}>
                          <span>{new Date(a.date).toLocaleDateString()}</span>
                          <span style={{
                            ...styles.statusBadge,
                            background: a.status === 'present' ? '#ecfdf5' : '#fef2f2',
                            color: a.status === 'present' ? '#10b981' : '#ef4444'
                          }}>
                            {a.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Fees & invoices */}
              <div style={styles.reportCard} className="card">
                <h3 style={styles.cardTitle}>
                  <BarChart2 size={20} style={{ color: 'var(--brand-primary)' }} />
                  Fees & Invoices
                </h3>
                {invoices.length === 0 ? (
                  <p style={styles.emptyText}>No invoices for this student.</p>
                ) : (
                  <div style={styles.historyList}>
                    {invoices.map(inv => (
                      <div key={inv._id} style={styles.historyItem}>
                        <div style={styles.historyMeta}>
                          <strong>{inv.description}</strong>
                          <small>Due {new Date(inv.dueDate).toLocaleDateString()} · {inv.amount}</small>
                        </div>
                        {inv.status === 'paid' ? (
                          <span style={{ ...styles.statusBadge, background: '#ecfdf5', color: '#10b981' }}>paid</span>
                        ) : (
                          <button onClick={() => payNow(inv._id)} style={styles.payBtn}>Pay now</button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* School Bus */}
              <div style={styles.reportCard} className="card">
                <h3 style={styles.cardTitle}>
                  <Calendar size={20} style={{ color: 'var(--brand-primary)' }} />
                  School Bus
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0 0 0.75rem' }}>
                  If <strong>{selectedChild?.name}</strong> will not use the school bus tomorrow, let the supervisor know — they'll be removed from tomorrow's route and map.
                </p>
                <button onClick={markBusAbsentTomorrow} style={{ ...styles.payBtn, background: '#ef4444' }}>
                  🚌 My child will not use the bus tomorrow
                </button>
              </div>

              {/* Messages with school */}
              <div style={styles.reportCard} className="card">
                <h3 style={styles.cardTitle}>
                  <Mail size={20} style={{ color: 'var(--brand-primary)' }} />
                  Messages
                </h3>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 160 }}>
                    <input type="text" value={msgSearch} onChange={e => setMsgSearch(e.target.value)} placeholder="🔍 Search name…" style={{ ...styles.msgInput, marginBottom: '0.5rem', width: '100%' }} />
                    {contacts.length === 0 && <p style={styles.emptyText}>No contacts.</p>}
                    {contacts.filter(c => c.name.toLowerCase().includes(msgSearch.toLowerCase())).map(c => (
                      <button key={c.id} onClick={() => openChat(c)} style={{
                        ...styles.contactBtn,
                        ...(activeChat?.id === c.id ? styles.contactBtnActive : {})
                      }}>
                        <strong>{c.name}</strong><br /><small style={{ color: '#94a3b8' }}>{c.role}</small>
                      </button>
                    ))}
                  </div>
                  <div style={{ flex: 1, minWidth: 240 }}>
                    {!activeChat ? (
                      <p style={styles.emptyText}>Select a contact to message.</p>
                    ) : (
                      <>
                        <div style={styles.threadBox}>
                          {thread.map(m => (
                            <div key={m._id} style={{ ...styles.bubble, ...(m.mine ? styles.bubbleMine : styles.bubbleTheirs) }}>{m.body}</div>
                          ))}
                        </div>
                        <form onSubmit={sendMsg} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                          <input value={msgText} onChange={e => setMsgText(e.target.value)} placeholder="Type a message…" style={styles.msgInput} />
                          <button type="submit" style={styles.payBtn}>Send</button>
                        </form>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {reportCard && (
        <div style={styles.modalBackdrop} onClick={() => setReportCard(null)}>
          <div style={styles.modalCard} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Report Card — {reportCard.student.name}</h3>
            <p style={{ color: '#64748b', marginTop: '-0.5rem' }}>{reportCard.student.class || '—'}</p>
            <div style={styles.rcStats}>
              <div style={styles.rcStat}><strong style={{ fontSize: '1.4rem', color: 'var(--brand-primary)' }}>{reportCard.overallAverage ?? '—'}</strong><div>Average</div></div>
              <div style={styles.rcStat}><strong style={{ fontSize: '1.4rem', color: 'var(--brand-primary)' }}>{reportCard.attendance.rate}%</strong><div>Attendance</div></div>
              <div style={styles.rcStat}><strong style={{ fontSize: '1.4rem', color: 'var(--brand-primary)' }}>{reportCard.incidents.length}</strong><div>Incidents</div></div>
            </div>
            {reportCard.subjects.length === 0 ? (
              <p style={styles.emptyText}>No grades recorded yet.</p>
            ) : (
              <div style={styles.historyList}>
                {reportCard.subjects.map((s, i) => (
                  <div key={i} style={styles.historyItem}><span>{s.subject}</span><strong>{s.average}</strong></div>
                ))}
              </div>
            )}
            <button onClick={() => setReportCard(null)} style={{ ...styles.payBtn, marginTop: '1rem' }}>Close</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

const styles = {
  container: { paddingBottom: '4rem' },
  loadingContainer: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', minHeight: '100vh'
  },
  spinner: {
    width: 40, height: 40, border: '4px solid #e2e8f0',
    borderTopColor: '#7c3aed', borderRadius: '50%',
    animation: 'spin 0.8s linear infinite'
  },
  header: {
    padding: '1rem 0', marginBottom: '2rem', position: 'sticky',
    top: 0, zIndex: 100
  },
  headerContent: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
  },
  logoArea: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  logoIcon: {
    width: 40, height: 40, background: 'var(--brand-primary)',
    color: 'white', borderRadius: 12, display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    transform: 'rotate(-5deg)', boxShadow: 'var(--shadow-glow)'
  },
  logoText: { fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.5px' },
  roleBadge: {
    fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '1px', padding: '0.25rem 0.75rem',
    background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
    color: 'white', borderRadius: 99
  },
  userArea: {
    display: 'flex', alignItems: 'center', gap: '0.75rem',
    background: 'rgba(255,255,255,0.8)', padding: '0.5rem 1rem',
    borderRadius: 99, border: '1px solid white',
    boxShadow: 'var(--shadow-sm)', backdropFilter: 'blur(8px)'
  },
  userAvatar: {
    width: 32, height: 32, background: 'var(--color-bg-purple)',
    color: 'var(--brand-primary)', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  userName: { fontWeight: 600, color: 'var(--text-primary)' },
  btnLogout: {
    background: 'none', border: 'none', color: '#94a3b8',
    cursor: 'pointer', padding: '0.25rem', borderRadius: '50%', display: 'flex'
  },
  main: { paddingBottom: '2rem' },
  dashboardGrid: { display: 'flex', gap: '2rem', flexWrap: 'wrap' },
  sidebar: { flex: '0 0 250px', minWidth: '220px' },
  sidebarTitle: { fontSize: '1.1rem', fontWeight: 700, color: '#475569', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.5px' },
  childrenList: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  childBtn: {
    display: 'flex', alignItems: 'center', gap: '0.75rem',
    padding: '0.75rem 1rem', borderRadius: '12px', background: 'white',
    border: '1px solid #e2e8f0', cursor: 'pointer', width: '100%',
    textAlign: 'left', transition: 'all 0.2s'
  },
  childBtnActive: {
    borderColor: '#7c3aed', background: 'var(--brand-primary)',
    color: 'white', boxShadow: '0 4px 12px rgba(124,58,237,0.3)'
  },
  avatarSmall: {
    width: 28, height: 28, borderRadius: '50%', color: 'var(--brand-primary)',
    display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center'
  },
  childName: { fontWeight: 600, fontSize: '0.95rem' },
  detailsArea: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  welcomeCard: { padding: '1.5rem' },
  statsRow: { display: 'flex', gap: '1.5rem', flexWrap: 'wrap' },
  statCard: { flex: 1, minWidth: '220px', display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' },
  statIcon: {
    width: 48, height: 48, borderRadius: '12px', background: 'var(--color-bg-purple)',
    color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  statLabel: { display: 'block', fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' },
  statValue: { display: 'block', fontSize: '1.75rem', fontWeight: 800, color: '#1e293b' },
  reportRow: { display: 'flex', gap: '1.5rem', flexWrap: 'wrap' },
  reportCard: { minWidth: '300px' },
  cardTitle: { fontSize: '1.15rem', fontWeight: 700, color: '#1e293b', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' },
  historyList: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  historyItem: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9'
  },
  historyMeta: { display: 'flex', flexDirection: 'column', gap: '0.15rem' },
  xpBadge: { fontSize: '0.85rem', fontWeight: 700, color: '#7c3aed' },
  statusBadge: { padding: '0.25rem 0.5rem', borderRadius: 99, fontSize: '0.75rem', fontWeight: 700, textTransform: 'capitalize' },
  emptyText: { color: '#94a3b8', fontSize: '0.95rem', textAlign: 'center', padding: '2rem 0' },
  reportCardBtn: { display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.75rem', padding: '0.5rem 1rem', background: 'var(--brand-primary)', color: '#fff', border: 'none', borderRadius: '9px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  payBtn: { padding: '0.4rem 0.9rem', background: 'var(--brand-primary)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.85rem' },
  contactBtn: { display: 'block', width: '100%', textAlign: 'left', padding: '0.5rem 0.6rem', marginBottom: '0.35rem', background: '#f6f3fb', border: '1px solid #efeaf7', borderRadius: '9px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.85rem' },
  contactBtnActive: { background: '#f3edfb', borderColor: '#d8cfe6' },
  threadBox: { display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '220px', overflowY: 'auto', padding: '0.5rem', background: '#faf8fe', borderRadius: '10px' },
  bubble: { maxWidth: '80%', padding: '0.45rem 0.7rem', borderRadius: '11px', fontSize: '0.88rem' },
  bubbleMine: { alignSelf: 'flex-end', background: 'var(--brand-primary)', color: '#fff' },
  bubbleTheirs: { alignSelf: 'flex-start', background: '#ece6f4', color: '#2a1f38' },
  msgInput: { flex: 1, padding: '0.5rem 0.7rem', background: '#f6f3fb', border: '1px solid #efeaf7', borderRadius: '8px', outline: 'none', fontFamily: 'inherit' },
  modalBackdrop: { position: 'fixed', inset: 0, background: 'rgba(42,31,56,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 },
  modalCard: { width: '100%', maxWidth: '460px', background: '#fff', borderRadius: '18px', padding: '1.5rem', boxShadow: '0 24px 60px -24px rgba(80,40,120,.4)', maxHeight: '85vh', overflowY: 'auto' },
  rcStats: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.75rem', margin: '1rem 0', textAlign: 'center' },
  rcStat: { background: 'var(--color-bg-purple, #f6f3fb)', borderRadius: '12px', padding: '0.9rem', fontSize: '0.8rem', color: '#64748b' },
  errorBox: {
    display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem',
    background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '12px',
    color: '#ef4444', marginBottom: '1.5rem'
  },
  emptyState: {
    textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem'
  }
};

export default ParentDashboard;
