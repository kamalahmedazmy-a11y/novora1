import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Users, FileText, BarChart2, LogOut, Zap, User,
  Clock, BookOpen, CheckCircle, XCircle, AlertCircle, Plus, Send, ChevronDown, Mail
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import LanguageToggle from '../../components/common/LanguageToggle';
import NotificationBell from '../../components/common/NotificationBell';
import AttendanceForm from '../../components/teacher/AttendanceForm';
import ExamBuilder from '../../components/teacher/ExamBuilder';
import ScheduleView from '../../components/teacher/ScheduleView';

const TeacherDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('schedule');
  const [schedule, setSchedule] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = user?.token;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    if (!user || user.role !== 'teacher') {
      navigate('/auth');
      return;
    }
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch schedule
      const schedRes = await fetch('/api/teacher/schedule', { headers });
      const schedData = await schedRes.json();
      setSchedule(Array.isArray(schedData) ? schedData : []);

      // Extract unique classrooms from schedule
      const uniqueClassrooms = [];
      const seenIds = new Set();
      (Array.isArray(schedData) ? schedData : []).forEach(s => {
        const id = s.classroomId?._id || s.classroomId;
        if (id && !seenIds.has(id)) {
          seenIds.add(id);
          uniqueClassrooms.push({
            _id: id,
            name: s.classroomId?.name || 'Unnamed Classroom'
          });
        }
      });
      setClassrooms(uniqueClassrooms);
    } catch (err) {
      console.error('Failed to fetch teacher data:', err);
    }
    setLoading(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const tabs = [
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'attendance', label: 'Attendance', icon: Users },
    { id: 'exams', label: 'Exams', icon: FileText },
    { id: 'results', label: 'Results', icon: BarChart2 },
    { id: 'homework', label: 'Homework', icon: BookOpen },
    { id: 'messages', label: 'Messages', icon: Mail },
  ];

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <p style={{ color: '#64748b', marginTop: '1rem' }}>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header} className="glass">
        <div className="container" style={styles.headerContent}>
          <div style={styles.logoArea}>
            <img src="/novora-logo.png" alt="Novora" style={{ height: 26, width: 'auto', display: 'block' }} />
            <span style={styles.roleBadge}>Teacher</span>
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

      {/* Tab Navigation */}
      <nav style={styles.tabNav}>
        <div className="container" style={styles.tabContainer}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                ...styles.tabBtn,
                ...(activeTab === tab.id ? styles.tabBtnActive : {})
              }}
            >
              <tab.icon size={18} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Content Area */}
      <main className="container" style={styles.main}>
        {activeTab === 'schedule' && (
          <ScheduleView schedule={schedule} />
        )}
        {activeTab === 'attendance' && (
          <AttendanceForm classrooms={classrooms} token={token} />
        )}
        {activeTab === 'exams' && (
          <ExamBuilder classrooms={classrooms} schedule={schedule} token={token} onCreated={fetchDashboardData} />
        )}
        {activeTab === 'results' && (
          <ExamResults classrooms={classrooms} token={token} />
        )}
        {activeTab === 'homework' && (
          <HomeworkPanel schedule={schedule} token={token} />
        )}
        {activeTab === 'messages' && (
          <MessagesPanel token={token} />
        )}
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

/* ========================
   Exam Results Sub-Component
   ======================== */
const ExamResults = ({ classrooms, token }) => {
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    setLoading(true);
    try {
      // Fetch exams from each classroom
      const allExams = [];
      for (const cls of classrooms) {
        try {
          const res = await fetch(`/api/teacher/exams?classroomId=${cls._id}`, { headers });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
              allExams.push(...data.map(e => ({ ...e, classroomName: cls.name })));
            }
          }
        } catch (e) {
          // Try a broader endpoint
        }
      }
      setExams(allExams);
    } catch (err) {
      console.error('Failed to fetch exams:', err);
    }
    setLoading(false);
  };

  const fetchResults = async (examId) => {
    try {
      const res = await fetch(`/api/teacher/exams/${examId}/results`, { headers });
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
      setSelectedExam(examId);
    } catch (err) {
      console.error('Failed to fetch results:', err);
    }
  };

  const avgScore = results.length > 0
    ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length)
    : 0;
  const passRate = results.length > 0
    ? Math.round((results.filter(r => r.passed).length / results.length) * 100)
    : 0;

  return (
    <div>
      <h2 style={styles.sectionTitle}>
        <BarChart2 size={24} style={{ color: 'var(--brand-primary)' }} />
        Exam Results
      </h2>

      {exams.length === 0 && !loading ? (
        <div style={styles.emptyState}>
          <FileText size={48} style={{ color: '#cbd5e1' }} />
          <p>No exams created yet. Create an exam from the Exams tab.</p>
        </div>
      ) : (
        <div style={styles.resultsLayout}>
          {/* Exam List */}
          <div style={styles.examList}>
            {exams.map(exam => (
              <button
                key={exam._id}
                onClick={() => fetchResults(exam._id)}
                style={{
                  ...styles.examListItem,
                  ...(selectedExam === exam._id ? styles.examListItemActive : {})
                }}
              >
                <FileText size={18} />
                <div>
                  <strong>{exam.title}</strong>
                  <small style={{ display: 'block', color: '#94a3b8' }}>{exam.classroomName}</small>
                </div>
              </button>
            ))}
          </div>

          {/* Results Table */}
          {selectedExam && (
            <div style={styles.resultsPanel}>
              <div style={styles.statsRow}>
                <div style={styles.statCard}>
                  <span style={styles.statValue}>{results.length}</span>
                  <span style={styles.statLabel}>Submissions</span>
                </div>
                <div style={styles.statCard}>
                  <span style={{ ...styles.statValue, color: '#7c3aed' }}>{avgScore}%</span>
                  <span style={styles.statLabel}>Avg Score</span>
                </div>
                <div style={styles.statCard}>
                  <span style={{ ...styles.statValue, color: '#10b981' }}>{passRate}%</span>
                  <span style={styles.statLabel}>Pass Rate</span>
                </div>
              </div>

              {results.length > 0 ? (
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Student</th>
                      <th style={styles.th}>Score</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map(r => (
                      <tr key={r._id} style={styles.tr}>
                        <td style={styles.td}>{r.userId?.name || 'N/A'}</td>
                        <td style={styles.td}>
                          <span style={{
                            ...styles.scoreBadge,
                            background: r.score >= 70 ? '#ecfdf5' : '#fef2f2',
                            color: r.score >= 70 ? '#10b981' : '#ef4444'
                          }}>{r.score}%</span>
                        </td>
                        <td style={styles.td}>
                          {r.passed ? (
                            <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <CheckCircle size={16} /> Passed
                            </span>
                          ) : (
                            <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <XCircle size={16} /> Failed
                            </span>
                          )}
                        </td>
                        <td style={styles.td}>{new Date(r.takenAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={styles.emptyState}>
                  <p>No submissions yet for this exam.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ========================
   Styles
   ======================== */
const HomeworkPanel = ({ schedule, token }) => {
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const [list, setList] = React.useState([]);
  const [form, setForm] = React.useState({ classroomId: '', subjectId: '', title: '', description: '', dueDate: '' });

  // unique classrooms + subjects from the teacher's schedule
  const uniq = (key, nameKey) => {
    const seen = new Set(); const out = [];
    (schedule || []).forEach(s => {
      const o = s[key]; const id = o?._id || o;
      if (id && !seen.has(String(id))) { seen.add(String(id)); out.push({ _id: id, name: o?.[nameKey] || '—' }); }
    });
    return out;
  };
  const classrooms = uniq('classroomId', 'name');
  const subjects = uniq('subjectId', 'title');

  const load = React.useCallback(async () => {
    const res = await fetch('/api/homework', { headers });
    if (res.ok) setList(await res.json());
  }, [token]);
  React.useEffect(() => { load(); }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/homework', { method: 'POST', headers, body: JSON.stringify(form) });
    if (res.ok) { setForm({ classroomId: '', subjectId: '', title: '', description: '', dueDate: '' }); load(); }
    else { const d = await res.json(); alert(d.message || 'Error'); }
  };
  const del = async (id) => { await fetch(`/api/homework/${id}`, { method: 'DELETE', headers }); load(); };

  const inp = { width: '100%', padding: '0.6rem 0.7rem', border: '1px solid #e9e2f3', borderRadius: '9px', fontFamily: 'inherit', marginBottom: '0.6rem', background: '#faf8ff' };
  const btn = { padding: '0.6rem 1rem', background: 'var(--brand-primary)', color: '#fff', border: 'none', borderRadius: '9px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px,1fr))', gap: '1.5rem' }}>
      <div className="card" style={{ padding: '1.5rem' }}>
        <h3 style={{ marginTop: 0, display: 'flex', gap: '0.5rem', alignItems: 'center' }}><BookOpen size={20} style={{ color: 'var(--brand-primary)' }} /> Assign Homework</h3>
        <form onSubmit={submit}>
          <select style={inp} value={form.classroomId} onChange={e => setForm(p => ({ ...p, classroomId: e.target.value }))} required>
            <option value="">Select class</option>
            {classrooms.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
          <select style={inp} value={form.subjectId} onChange={e => setForm(p => ({ ...p, subjectId: e.target.value }))}>
            <option value="">Select subject (optional)</option>
            {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
          <input style={inp} placeholder="Title" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required />
          <textarea style={{ ...inp, minHeight: 70 }} placeholder="Description" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          <input style={inp} type="date" value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} />
          <button type="submit" style={btn}><Send size={16} /> Assign (notifies students)</button>
        </form>
      </div>
      <div className="card" style={{ padding: '1.5rem' }}>
        <h3 style={{ marginTop: 0 }}>My Homework</h3>
        {list.length === 0 ? <p style={{ color: '#94a3b8' }}>No homework assigned yet.</p> : list.map(h => (
          <div key={h._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem', background: '#faf8ff', borderRadius: '9px', marginBottom: '0.5rem' }}>
            <div><strong>{h.title}</strong><div style={{ fontSize: '0.8rem', color: '#64748b' }}>{h.classroomId?.name} · due {h.dueDate ? new Date(h.dueDate).toLocaleDateString() : '—'}</div></div>
            <button onClick={() => del(h._id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><XCircle size={16} /></button>
          </div>
        ))}
      </div>
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
    padding: '1rem 0', marginBottom: '0', position: 'sticky',
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
  tabNav: {
    background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(255,255,255,0.3)', marginBottom: '2rem',
    position: 'sticky', top: 72, zIndex: 90
  },
  tabContainer: {
    display: 'flex', gap: '0.25rem', overflowX: 'auto', padding: '0.75rem 0'
  },
  tabBtn: {
    display: 'flex', alignItems: 'center', gap: '0.5rem',
    padding: '0.6rem 1.25rem', borderRadius: 99,
    background: 'transparent', color: '#64748b',
    fontWeight: 600, fontSize: '0.9rem', border: 'none', cursor: 'pointer',
    transition: 'all 0.2s', whiteSpace: 'nowrap'
  },
  tabBtnActive: {
    background: 'var(--brand-primary)', color: 'white',
    boxShadow: '0 4px 12px rgba(124,58,237,0.3)'
  },
  main: { paddingBottom: '2rem' },
  sectionTitle: {
    fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)',
    marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem'
  },
  emptyState: {
    textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem'
  },
  resultsLayout: { display: 'flex', gap: '1.5rem', flexWrap: 'wrap' },
  examList: {
    flex: '0 0 280px', display: 'flex', flexDirection: 'column', gap: '0.5rem'
  },
  examListItem: {
    display: 'flex', alignItems: 'center', gap: '0.75rem',
    padding: '1rem', borderRadius: 12, background: 'white',
    border: '1px solid #e2e8f0', cursor: 'pointer', textAlign: 'left',
    transition: 'all 0.2s'
  },
  examListItemActive: {
    borderColor: '#7c3aed', background: '#f5f3ff',
    boxShadow: '0 0 0 3px rgba(124,58,237,0.1)'
  },
  resultsPanel: { flex: 1, minWidth: 0 },
  statsRow: { display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' },
  statCard: {
    flex: 1, minWidth: 120, padding: '1.25rem', background: 'white',
    borderRadius: 16, boxShadow: 'var(--shadow-sm)',
    border: '1px solid #f1f5f9', textAlign: 'center'
  },
  statValue: { fontSize: '1.75rem', fontWeight: 800, display: 'block', color: '#1e293b' },
  statLabel: { fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' },
  table: { width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' },
  th: {
    textAlign: 'left', padding: '1rem', fontSize: '0.8rem',
    fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
    color: '#64748b', background: '#f8fafc', borderBottom: '1px solid #f1f5f9'
  },
  tr: { borderBottom: '1px solid #f8fafc' },
  td: { padding: '0.875rem 1rem', fontSize: '0.95rem' },
  scoreBadge: {
    padding: '0.25rem 0.75rem', borderRadius: 99, fontWeight: 700, fontSize: '0.85rem'
  }
};

// Teacher messaging — connects to admins + parents of the teacher's students
const MessagesPanel = ({ token }) => {
  const [contacts, setContacts] = useState([]);
  const [active, setActive] = useState(null);
  const [thread, setThread] = useState([]);
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    fetch('/api/messages/contacts', { headers }).then(r => r.ok ? r.json() : []).then(setContacts).catch(() => {});
  }, []);

  const open = async (c) => {
    setActive(c);
    const r = await fetch(`/api/messages/${c.id}`, { headers });
    if (r.ok) setThread(await r.json());
  };
  const send = async (e) => {
    e.preventDefault();
    if (!text.trim() || !active) return;
    const r = await fetch('/api/messages', { method: 'POST', headers, body: JSON.stringify({ toId: active.id, body: text }) });
    if (r.ok) { setText(''); open(active); }
  };

  return (
    <div className="card" style={{ display: 'flex', gap: '1rem', minHeight: 360 }}>
      <div style={{ width: 200, borderInlineEnd: '1px solid #f0ecf6', paddingInlineEnd: '0.75rem', overflowY: 'auto', maxHeight: 420 }}>
        <h3 style={{ marginTop: 0, fontSize: '1rem' }}><Mail size={16} /> Messages</h3>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search name…" style={{ width: '100%', padding: '0.4rem 0.6rem', marginBottom: '0.5rem', background: '#f6f3fb', border: '1px solid #efeaf7', borderRadius: 8, outline: 'none', fontFamily: 'inherit', fontSize: '0.82rem' }} />
        {contacts.length === 0 && <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No contacts.</p>}
        {contacts.filter(c => c.name.toLowerCase().includes(search.toLowerCase())).map(c => (
          <button key={c.id} onClick={() => open(c)} style={{
            display: 'block', width: '100%', textAlign: 'left', padding: '0.5rem', marginBottom: '0.3rem',
            background: active?.id === c.id ? '#f3edfb' : '#f6f3fb', border: '1px solid #efeaf7',
            borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.83rem'
          }}>
            <strong>{c.name}</strong><br /><small style={{ color: '#94a3b8' }}>{c.role}</small>
          </button>
        ))}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {!active ? (
          <p style={{ color: '#94a3b8', margin: 'auto' }}>Select a contact to message.</p>
        ) : (
          <>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem', overflowY: 'auto', maxHeight: 320, padding: '0.5rem' }}>
              {thread.map(m => (
                <div key={m._id} style={{
                  maxWidth: '75%', padding: '0.45rem 0.7rem', borderRadius: 11, fontSize: '0.88rem',
                  alignSelf: m.mine ? 'flex-end' : 'flex-start',
                  background: m.mine ? 'var(--brand-primary)' : '#ece6f4', color: m.mine ? '#fff' : '#2a1f38'
                }}>{m.body}</div>
              ))}
            </div>
            <form onSubmit={send} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <input value={text} onChange={e => setText(e.target.value)} placeholder="Type a message…" style={{ flex: 1, padding: '0.5rem 0.7rem', background: '#f6f3fb', border: '1px solid #efeaf7', borderRadius: 8, outline: 'none', fontFamily: 'inherit' }} />
              <button type="submit" style={{ padding: '0.5rem 1rem', background: 'var(--brand-primary)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}><Send size={16} /></button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default TeacherDashboard;
