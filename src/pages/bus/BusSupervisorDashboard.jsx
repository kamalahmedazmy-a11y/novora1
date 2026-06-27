import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bus, MapPin, Users, CheckCircle, Clock, LogOut, User,
  AlertCircle, Navigation, Flag, Phone
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../../context/AuthContext';
import LanguageToggle from '../../components/common/LanguageToggle';
import NotificationBell from '../../components/common/NotificationBell';

const BusSupervisorDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [route, setRoute] = useState(null);
  const [bus, setBus] = useState(null);
  const [students, setStudents] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const token = user?.token;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersLayer = useRef(null);

  useEffect(() => {
    if (!user || user.role !== 'bus_supervisor') {
      navigate('/auth');
      return;
    }
    loadAll();
  }, [user]);

  const loadAll = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchRoute(), fetchStudents(), fetchDashboard()]);
    } catch (err) {
      console.error('Failed to load bus dashboard:', err);
      setError('Connection error loading the bus dashboard.');
    }
    setLoading(false);
  };

  const fetchRoute = async () => {
    try {
      const res = await fetch('/api/bus/my-route', { headers });
      if (res.ok) {
        const data = await res.json();
        setRoute(data.route || null);
        setBus(data.bus || null);
      }
    } catch (err) {
      console.error('Failed to fetch route:', err);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await fetch('/api/bus/students', { headers });
      if (res.ok) {
        const data = await res.json();
        setStudents(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch students:', err);
    }
  };

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/bus/dashboard', { headers });
      if (res.ok) {
        setDashboard(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch dashboard:', err);
    }
  };

  const refresh = async () => {
    await Promise.all([fetchStudents(), fetchDashboard()]);
  };

  const onTheWay = async () => {
    try {
      const res = await fetch('/api/bus/on-the-way', { method: 'POST', headers });
      const d = await res.json();
      if (res.ok) {
        alert(`Notified ${d.notified ?? 0} parent(s)`);
        await refresh();
      } else {
        alert(d.message || 'Failed to notify parents');
      }
    } catch (err) {
      console.error(err);
      alert('Connection error');
    }
  };

  const arrived = async () => {
    try {
      const res = await fetch('/api/bus/arrived', { method: 'POST', headers });
      const d = await res.json();
      if (res.ok) {
        alert(`${d.arrived ?? 0} student(s) marked arrived`);
        await refresh();
      } else {
        alert(d.message || 'Failed to mark arrived');
      }
    } catch (err) {
      console.error(err);
      alert('Connection error');
    }
  };

  const pickup = async (studentId) => {
    try {
      const res = await fetch(`/api/bus/students/${studentId}/pickup`, { method: 'POST', headers });
      const d = await res.json();
      if (res.ok) {
        await refresh();
      } else {
        alert(d.message || 'Failed to mark pickup');
      }
    } catch (err) {
      console.error(err);
      alert('Connection error');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  // ---- Init map once
  // Init the map once the container is actually in the DOM (after loading flips
  // to false). Depending on `loading` ensures this re-runs when the div mounts.
  useEffect(() => {
    if (loading || !mapRef.current || mapInstance.current) return;
    const map = L.map(mapRef.current).setView([29.97, 31.27], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(map);
    markersLayer.current = L.layerGroup().addTo(map);
    mapInstance.current = map;
    // size can be wrong if container animated in — recalc next tick
    setTimeout(() => { try { map.invalidateSize(); } catch (e) { /* ignore */ } }, 200);
  }, [loading]);

  // ---- Redraw markers whenever students change
  useEffect(() => {
    if (!mapInstance.current || !markersLayer.current) return;
    markersLayer.current.clearLayers();
    const pts = [];
    students.forEach(s => {
      if (s.homeLat == null || s.homeLng == null || s.willRide === false) return;
      const marker = L.circleMarker([s.homeLat, s.homeLng], {
        radius: 9, color: '#663399', fillColor: '#9370DB', fillOpacity: 0.9
      });
      marker.bindPopup(
        `<strong>${s.name || 'Student'}</strong><br/>Grade: ${s.grade ?? '—'}<br/>Stop #${s.stopOrder ?? '—'}`
      );
      marker.on('click', () => setSelected(s.studentId));
      marker.addTo(markersLayer.current);
      pts.push([s.homeLat, s.homeLng]);
    });
    if (pts.length > 0) {
      try { mapInstance.current.fitBounds(pts, { padding: [40, 40], maxZoom: 15 }); } catch (e) { /* ignore */ }
    }
  }, [students, loading]);

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <p style={{ color: '#64748b', marginTop: '1rem' }}>Loading bus dashboard...</p>
      </div>
    );
  }

  const sorted = [...students].sort((a, b) => (a.stopOrder ?? 0) - (b.stopOrder ?? 0));

  const statTiles = [
    { label: 'Registered', value: dashboard?.registered ?? 0, icon: Users, color: 'var(--brand-primary)', bg: 'var(--color-bg-purple)' },
    { label: 'Expected Today', value: dashboard?.expectedToday ?? 0, icon: Clock, color: '#0ea5e9', bg: '#e0f2fe' },
    { label: 'Picked Up', value: dashboard?.pickedUp ?? 0, icon: CheckCircle, color: '#10b981', bg: '#ecfdf5' },
    { label: 'Remaining', value: dashboard?.remaining ?? 0, icon: MapPin, color: '#f59e0b', bg: '#fef3c7' },
    { label: 'Arrived', value: dashboard?.arrived ?? 0, icon: Flag, color: '#7c3aed', bg: '#f5f3ff' },
  ];

  const statusStyle = (status) => {
    switch (status) {
      case 'picked_up': return { background: '#ecfdf5', color: '#10b981' };
      case 'arrived': return { background: '#f5f3ff', color: '#7c3aed' };
      case 'absent': return { background: '#fef2f2', color: '#ef4444' };
      default: return { background: '#fef3c7', color: '#b45309' };
    }
  };

  const statusLabel = (status) => {
    switch (status) {
      case 'picked_up': return 'Picked up';
      case 'arrived': return 'Arrived';
      case 'absent': return 'Absent';
      default: return 'Expected';
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header} className="glass">
        <div className="container" style={styles.headerContent}>
          <div style={styles.logoArea}>
            <img src="/novora-logo.png" alt="Novora" style={{ height: 26, width: 'auto', display: 'block' }} />
            <span style={styles.roleBadge}>Bus Supervisor</span>
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
        {/* Sub-line: bus number + route */}
        <div style={styles.subLine} className="card">
          <div style={styles.busIcon}><Bus size={26} /></div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.3rem' }}>
              {bus?.busNumber ? `Bus ${bus.busNumber}` : 'Bus'} <span style={{ color: '#cbd5e1' }}>·</span>{' '}
              <span className="text-gradient">{route?.name || 'My Route'}</span>
            </h2>
            <p style={{ color: '#64748b', margin: '0.2rem 0 0', fontSize: '0.9rem' }}>
              {bus?.plate ? `Plate ${bus.plate}` : ''}{bus?.capacity ? ` · Capacity ${bus.capacity}` : ''}
              {route?.notifyLeadMinutes != null ? ` · Notify ${route.notifyLeadMinutes} min ahead` : ''}
            </p>
          </div>
        </div>

        {error && (
          <div style={styles.errorBox}>
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {/* Stat cards */}
        <div style={styles.statsRow}>
          {statTiles.map(t => (
            <div key={t.label} style={styles.statCard} className="card">
              <div style={{ ...styles.statIcon, color: t.color, background: t.bg }}><t.icon size={24} /></div>
              <div>
                <span style={styles.statLabel}>{t.label}</span>
                <span style={styles.statValue}>{t.value}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div style={styles.actionRow}>
          <button onClick={onTheWay} style={styles.actionBtnPrimary}>
            <Navigation size={18} /> 🚌 I'm on the way
          </button>
          <button onClick={arrived} style={styles.actionBtnSecondary}>
            <Flag size={18} /> 🏫 Arrived at School
          </button>
        </div>

        {/* Map */}
        <div style={styles.reportCard} className="card">
          <h3 style={styles.cardTitle}>
            <MapPin size={20} style={{ color: 'var(--brand-primary)' }} />
            Route Map
          </h3>
          <div ref={mapRef} style={{ height: 360, borderRadius: 14, overflow: 'hidden', border: '1px solid #f1f5f9' }} />
          <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '0.6rem', marginBottom: 0 }}>
            Showing {students.filter(s => s.homeLat != null && s.homeLng != null && s.willRide !== false).length} riding student(s). Absent students are hidden.
          </p>
        </div>

        {/* Student list */}
        <div style={styles.reportCard} className="card">
          <h3 style={styles.cardTitle}>
            <Users size={20} style={{ color: 'var(--brand-primary)' }} />
            Students (by stop order)
          </h3>
          {sorted.length === 0 ? (
            <div style={styles.emptyState}>
              <Users size={48} style={{ color: '#cbd5e1' }} />
              <p>No students assigned to this route yet.</p>
            </div>
          ) : (
            <div style={styles.historyList}>
              {sorted.map(s => {
                const isSelected = selected === s.studentId;
                return (
                  <div
                    key={s.studentId}
                    onClick={() => {
                      setSelected(s.studentId);
                      if (s.homeLat != null && s.homeLng != null && s.willRide !== false && mapInstance.current) {
                        mapInstance.current.setView([s.homeLat, s.homeLng], 15);
                      }
                    }}
                    style={{
                      ...styles.studentRow,
                      ...(isSelected ? styles.studentRowActive : {})
                    }}
                  >
                    <div style={styles.stopBadge}>{s.stopOrder ?? '–'}</div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <strong>{s.name || 'Student'}</strong>
                        {s.grade != null && <small style={{ color: '#94a3b8' }}>Grade {s.grade}</small>}
                        <span style={{ ...styles.statusBadge, ...statusStyle(s.willRide === false ? 'absent' : s.status) }}>
                          {statusLabel(s.willRide === false ? 'absent' : s.status)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.25rem', fontSize: '0.82rem', color: '#64748b' }}>
                        {s.parentPhone && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <Phone size={13} /> {s.parentPhone}
                          </span>
                        )}
                        {s.homeAddress && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <MapPin size={13} /> {s.homeAddress}
                          </span>
                        )}
                        {s.homeLat != null && s.homeLng != null && (
                          <a
                            href={`https://www.google.com/maps?q=${s.homeLat},${s.homeLng}`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={e => e.stopPropagation()}
                            style={styles.mapsLink}
                          >
                            📍 Google Maps
                          </a>
                        )}
                      </div>
                    </div>

                    <div onClick={e => e.stopPropagation()} style={{ flexShrink: 0 }}>
                      {s.willRide === false ? (
                        <span style={styles.absentPill}>Absent</span>
                      ) : s.status === 'expected' ? (
                        <button onClick={() => pickup(s.studentId)} style={styles.pickupBtn}>
                          Mark as Picked Up
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'right', display: 'block' }}>
                          {statusLabel(s.status)}
                          <br />
                          <small style={{ color: '#94a3b8' }}>
                            {s.status === 'arrived' && s.arrivedAt
                              ? new Date(s.arrivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : s.status === 'picked_up' && s.pickedUpAt
                                ? new Date(s.pickedUpAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : ''}
                          </small>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .leaflet-container { font-family: inherit; }
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
  main: { paddingBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  subLine: {
    display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem 1.5rem'
  },
  busIcon: {
    width: 52, height: 52, borderRadius: 14, background: 'var(--color-bg-purple)',
    color: 'var(--brand-primary)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', flexShrink: 0
  },
  statsRow: { display: 'flex', gap: '1.25rem', flexWrap: 'wrap' },
  statCard: { flex: 1, minWidth: '170px', display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' },
  statIcon: {
    width: 48, height: 48, borderRadius: '12px', background: 'var(--color-bg-purple)',
    color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
  },
  statLabel: { display: 'block', fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' },
  statValue: { display: 'block', fontSize: '1.75rem', fontWeight: 800, color: '#1e293b' },
  actionRow: { display: 'flex', gap: '1rem', flexWrap: 'wrap' },
  actionBtnPrimary: {
    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
    padding: '0.85rem 1.5rem', background: 'var(--brand-primary)', color: '#fff',
    border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer',
    fontFamily: 'inherit', fontSize: '0.95rem', boxShadow: '0 4px 12px rgba(124,58,237,0.3)'
  },
  actionBtnSecondary: {
    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
    padding: '0.85rem 1.5rem', background: '#fff', color: 'var(--brand-primary)',
    border: '2px solid var(--brand-primary)', borderRadius: '12px', fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.95rem'
  },
  reportCard: { minWidth: '300px' },
  cardTitle: { fontSize: '1.15rem', fontWeight: 700, color: '#1e293b', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' },
  historyList: { display: 'flex', flexDirection: 'column', gap: '0.6rem' },
  studentRow: {
    display: 'flex', alignItems: 'center', gap: '0.85rem',
    padding: '0.85rem', background: '#f8fafc', borderRadius: '10px',
    border: '1px solid #f1f5f9', cursor: 'pointer', transition: 'all 0.15s'
  },
  studentRowActive: {
    background: '#f5f3ff', borderColor: '#ddd0f7', boxShadow: '0 0 0 3px rgba(124,58,237,0.08)'
  },
  stopBadge: {
    width: 34, height: 34, borderRadius: '50%', background: 'var(--brand-primary)',
    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 800, fontSize: '0.9rem', flexShrink: 0
  },
  statusBadge: { padding: '0.2rem 0.55rem', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700 },
  mapsLink: { color: 'var(--brand-primary)', fontWeight: 600, textDecoration: 'none', fontSize: '0.82rem' },
  pickupBtn: {
    padding: '0.5rem 0.9rem', background: 'var(--brand-primary)', color: '#fff',
    border: 'none', borderRadius: '9px', fontWeight: 700, cursor: 'pointer',
    fontFamily: 'inherit', fontSize: '0.83rem', whiteSpace: 'nowrap'
  },
  absentPill: {
    padding: '0.35rem 0.8rem', background: '#fef2f2', color: '#ef4444',
    borderRadius: 99, fontWeight: 700, fontSize: '0.8rem', whiteSpace: 'nowrap'
  },
  errorBox: {
    display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem',
    background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '12px',
    color: '#ef4444'
  },
  emptyState: {
    textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem'
  }
};

export default BusSupervisorDashboard;
