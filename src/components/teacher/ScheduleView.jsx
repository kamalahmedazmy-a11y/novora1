import React, { useState, useEffect } from 'react';
import { Calendar, Clock, BookOpen } from 'lucide-react';

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const ScheduleView = ({ schedule }) => {
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());

  // Group schedule by day
  const scheduleByDay = {};
  dayNames.forEach((_, idx) => { scheduleByDay[idx] = []; });
  schedule.forEach(s => {
    const day = s.dayOfWeek !== undefined ? s.dayOfWeek : 0;
    if (!scheduleByDay[day]) scheduleByDay[day] = [];
    scheduleByDay[day].push(s);
  });

  // Days that have classes
  const activeDays = Object.keys(scheduleByDay).filter(d => scheduleByDay[d].length > 0).map(Number);
  const todaySchedule = scheduleByDay[selectedDay] || [];

  return (
    <div>
      <h2 style={styles.sectionTitle}>
        <Calendar size={24} style={{ color: 'var(--brand-primary)' }} />
        Weekly Schedule
      </h2>

      {/* Day Selector */}
      <div style={styles.daySelector}>
        {dayNames.map((name, idx) => (
          <button
            key={idx}
            onClick={() => setSelectedDay(idx)}
            style={{
              ...styles.dayBtn,
              ...(selectedDay === idx ? styles.dayBtnActive : {}),
              ...(activeDays.includes(idx) ? {} : styles.dayBtnEmpty)
            }}
          >
            <span style={styles.dayShort}>{name.slice(0, 3)}</span>
            {activeDays.includes(idx) && (
              <span style={styles.dayDot} />
            )}
          </button>
        ))}
      </div>

      {/* Day Label */}
      <h3 style={styles.dayLabel}>{dayNames[selectedDay]}</h3>

      {/* Schedule Items */}
      {todaySchedule.length === 0 ? (
        <div style={styles.emptyDay}>
          <Calendar size={40} style={{ color: '#cbd5e1' }} />
          <p>No classes on {dayNames[selectedDay]}</p>
        </div>
      ) : (
        <div style={styles.scheduleList}>
          {todaySchedule.map((item, idx) => (
            <div key={item._id || idx} style={styles.scheduleCard} className="card">
              <div style={styles.timeStrip}>
                <Clock size={14} />
                <span>{item.startTime || '--:--'} – {item.endTime || '--:--'}</span>
              </div>
              <div style={styles.scheduleBody}>
                <h4 style={styles.subjectName}>
                  <BookOpen size={18} style={{ color: 'var(--brand-primary)' }} />
                  {item.subjectId?.title || 'Unknown Subject'}
                </h4>
                <p style={styles.classroomName}>
                  {item.classroomId?.name || 'Unknown Classroom'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const styles = {
  sectionTitle: {
    fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)',
    marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem'
  },
  daySelector: {
    display: 'flex', gap: '0.5rem', marginBottom: '1.5rem',
    overflowX: 'auto', paddingBottom: '0.5rem'
  },
  dayBtn: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: '0.25rem', padding: '0.75rem 1rem', borderRadius: 12,
    background: 'white', border: '1px solid #e2e8f0', cursor: 'pointer',
    fontWeight: 600, color: '#475569', transition: 'all 0.2s',
    minWidth: 60, position: 'relative'
  },
  dayBtnActive: {
    background: 'var(--brand-primary)', color: 'white',
    borderColor: 'var(--brand-primary)',
    boxShadow: '0 4px 12px rgba(124,58,237,0.3)'
  },
  dayBtnEmpty: { opacity: 0.5 },
  dayShort: { fontSize: '0.85rem' },
  dayDot: {
    width: 6, height: 6, borderRadius: '50%',
    background: 'currentColor', opacity: 0.6
  },
  dayLabel: {
    fontSize: '1.1rem', fontWeight: 600, color: '#64748b',
    marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px'
  },
  emptyDay: {
    textAlign: 'center', padding: '3rem', color: '#94a3b8',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem'
  },
  scheduleList: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  scheduleCard: {
    display: 'flex', gap: '1rem', alignItems: 'stretch',
    padding: '0 !important', overflow: 'hidden'
  },
  timeStrip: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: '0.25rem', padding: '1rem',
    background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
    color: 'white', fontWeight: 700, fontSize: '0.85rem',
    minWidth: 130, borderRadius: '16px 0 0 16px'
  },
  scheduleBody: { padding: '1.25rem', flex: 1 },
  subjectName: {
    fontSize: '1.1rem', fontWeight: 700, color: '#1e293b',
    display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem'
  },
  classroomName: { fontSize: '0.9rem', color: '#64748b' }
};

export default ScheduleView;
