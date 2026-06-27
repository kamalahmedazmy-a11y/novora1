import React, { useEffect, useState } from 'react';
import { Trophy, Users, Loader } from 'lucide-react';

/* ─── helpers ──────────────────────────────────────────────── */
const getBarStyle = (entry, index) => {
    if (entry.isCurrentUser)
        return { bar: 'linear-gradient(180deg, #a855f7 0%, #7c3aed 100%)', isUser: true };
    if (index === 0) return { bar: 'linear-gradient(180deg, #fbbf24 0%, #f59e0b 100%)', medal: '🥇' };
    if (index === 1) return { bar: 'linear-gradient(180deg, #e2e8f0 0%, #94a3b8 100%)', medal: '🥈' };
    if (index === 2) return { bar: 'linear-gradient(180deg, #d97706 0%, #b45309 100%)', medal: '🥉' };
    return { bar: 'linear-gradient(180deg, #818cf8 0%, #6366f1 100%)' };
};

/* ─── sub-components ─────────────────────────────────────────── */
const Wrapper = ({ children }) => (
    <div className="rc-wrap">{children}<RCStyles /></div>
);

const Header = ({ currentUser, totalStudents }) => (
    <div className="rc-header">
        <div className="rc-title-area">
            <span className="rc-title-icon"><Trophy size={20} /></span>
            <h3 className="rc-title">Student Ranking</h3>
        </div>
        {currentUser && (
            <div className="rc-rank-pill">
                <span className="rc-rank-num">Rank #{currentUser.rank}</span>
                <span className="rc-rank-of">out of {totalStudents} student{totalStudents !== 1 ? 's' : ''}</span>
            </div>
        )}
    </div>
);

/* ─── main component ─────────────────────────────────────────── */
const RankingChart = ({ leaderboard = [], totalStudents = 0, loading = false, error = null }) => {
    const [animated, setAnimated] = useState(false);

    useEffect(() => {
        if (loading) return; // don't animate while still loading
        setAnimated(false);
        const t = setTimeout(() => setAnimated(true), 120);
        return () => clearTimeout(t);
    }, [leaderboard, loading]);

    /* ── State 1: Loading ── */
    if (loading) {
        return (
            <Wrapper>
                <div className="rc-header">
                    <div className="rc-title-area">
                        <span className="rc-title-icon"><Trophy size={20} /></span>
                        <h3 className="rc-title">Student Ranking</h3>
                    </div>
                </div>
                <div className="rc-empty">
                    <div className="rc-spinner"><Loader size={32} /></div>
                    <p>Loading leaderboard…</p>
                </div>
            </Wrapper>
        );
    }

    /* ── State 2: Fetch error ── */
    if (error) {
        return (
            <Wrapper>
                <div className="rc-header">
                    <div className="rc-title-area">
                        <span className="rc-title-icon"><Trophy size={20} /></span>
                        <h3 className="rc-title">Student Ranking</h3>
                    </div>
                </div>
                <div className="rc-empty" style={{ color: '#ef4444' }}>
                    <span style={{ fontSize: '2rem' }}>⚠️</span>
                    <p style={{ color: '#ef4444' }}>{error}</p>
                </div>
            </Wrapper>
        );
    }

    /* ── State 3: No data at all ── */
    if (!leaderboard || leaderboard.length === 0) {
        return (
            <Wrapper>
                <div className="rc-header">
                    <div className="rc-title-area">
                        <span className="rc-title-icon"><Trophy size={20} /></span>
                        <h3 className="rc-title">Student Ranking</h3>
                    </div>
                </div>
                <div className="rc-empty">
                    <Users size={40} />
                    <p>No students found yet. Log in and visit the dashboard to appear here.</p>
                </div>
            </Wrapper>
        );
    }

    /* ── State 3: Render chart ── */
    const currentUser = leaderboard.find(e => e.isCurrentUser);

    // Show top-15, always keep current user visible
    let displayList = leaderboard.slice(0, 15);
    if (currentUser && !displayList.find(e => e.isCurrentUser)) {
        displayList = [...displayList.slice(0, 14), currentUser];
    }

    const CHART_H = 240; // max bar height px

    return (
        <Wrapper>
            <Header currentUser={currentUser} totalStudents={totalStudents} />

            <div className="rc-chart-area" style={{ '--chart-h': `${CHART_H}px` }}>
                {displayList.map((entry, index) => {
                    const style = getBarStyle(entry, index);
                    const isUser = !!style.isUser;
                    // At least 3px visible even for 0%
                    const heightPx = animated
                        ? Math.max(Math.round((entry.completionPercent / 100) * CHART_H), 3)
                        : 0;

                    return (
                        <div
                            key={entry.userId}
                            className="rc-col"
                            style={{ animationDelay: `${index * 35}ms` }}
                        >
                            {/* % label */}
                            <span className={`rc-pct-label ${isUser ? 'rc-pct-user' : ''}`}>
                                {entry.completionPercent}%
                            </span>

                            {/* Bar */}
                            <div className="rc-bar-track">
                                <div
                                    className={`rc-bar ${isUser ? 'rc-bar-user' : ''}`}
                                    style={{
                                        height: `${heightPx}px`,
                                        background: style.bar,
                                        boxShadow: isUser
                                            ? '0 0 20px rgba(124,58,237,0.6), 0 0 40px rgba(168,85,247,0.3)'
                                            : index < 3
                                                ? '0 4px 12px rgba(0,0,0,0.15)'
                                                : '0 2px 8px rgba(99,102,241,0.2)',
                                    }}
                                >
                                    {isUser && <div className="rc-shimmer" />}
                                </div>
                            </div>

                            {/* Medal / rank */}
                            <div className="rc-medal">
                                {style.medal
                                    ? <span className="rc-medal-emoji">{style.medal}</span>
                                    : <span className={`rc-rank-idx ${isUser ? 'rc-rank-idx-user' : ''}`}>#{entry.rank}</span>
                                }
                            </div>

                            {/* Name */}
                            <div className={`rc-name ${isUser ? 'rc-name-user' : ''}`}>
                                <span className="rc-name-text" title={entry.name}>
                                    {entry.name.split(' ')[0]}
                                </span>
                                {isUser && <span className="rc-you-badge">YOU</span>}
                            </div>
                        </div>
                    );
                })}
            </div>

            <p className="rc-axis-label">← Sorted by highest completion</p>
        </Wrapper>
    );
};

/* ─── styles ─────────────────────────────────────────────────── */
const RCStyles = () => (
    <style>{`
        .rc-wrap {
            background: white;
            border-radius: 20px;
            padding: 2rem 2rem 1.25rem;
            margin-bottom: 2rem;
            box-shadow: 0 4px 16px rgba(0,0,0,0.06);
        }
        .rc-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 0.75rem;
            margin-bottom: 2rem;
        }
        .rc-title-area {
            display: flex;
            align-items: center;
            gap: 0.55rem;
        }
        .rc-title-icon { display: flex; align-items: center; color: #f59e0b; }
        .rc-title {
            font-size: 1.25rem;
            font-weight: 700;
            margin: 0;
            color: var(--text-primary, #1e293b);
        }
        .rc-rank-pill {
            display: flex;
            align-items: baseline;
            gap: 0.4rem;
            background: linear-gradient(135deg, #7c3aed, #a855f7);
            color: white;
            padding: 0.45rem 1.1rem;
            border-radius: 99px;
            box-shadow: 0 4px 14px rgba(124,58,237,0.35);
        }
        .rc-rank-num  { font-size: 1.05rem; font-weight: 800; }
        .rc-rank-of   { font-size: 0.78rem; opacity: 0.85; font-weight: 500; }

        /* Chart */
        .rc-chart-area {
            display: flex;
            align-items: flex-end;
            justify-content: center;
            gap: clamp(4px, 1.2vw, 16px);
            min-height: calc(var(--chart-h, 240px) + 80px);
            padding: 0 0.5rem;
            overflow-x: auto;
            border-bottom: 2px solid #e2e8f0;
        }
        .rc-col {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 5px;
            flex: 1;
            min-width: 32px;
            max-width: 64px;
            animation: rcColIn 0.3s ease-out both;
        }
        @keyframes rcColIn {
            from { opacity: 0; transform: translateY(10px); }
            to   { opacity: 1; transform: translateY(0); }
        }

        /* % label */
        .rc-pct-label {
            font-size: 0.68rem;
            font-weight: 700;
            color: #64748b;
        }
        .rc-pct-user { color: #7c3aed; font-size: 0.75rem; }

        /* Bar track */
        .rc-bar-track {
            width: 100%;
            height: 240px;
            display: flex;
            align-items: flex-end;
        }
        .rc-bar {
            width: 100%;
            border-radius: 8px 8px 3px 3px;
            transition: height 0.9s cubic-bezier(0.34, 1.56, 0.64, 1);
            position: relative;
            overflow: hidden;
            cursor: pointer;
            min-height: 3px;
        }
        .rc-bar:hover { filter: brightness(1.08); transform: scaleX(1.03); }
        .rc-bar-user {
            animation: rcPulse 2.5s ease-in-out infinite;
        }
        @keyframes rcPulse {
            0%, 100% { box-shadow: 0 0 20px rgba(124,58,237,0.6), 0 0 40px rgba(168,85,247,0.3); }
            50%       { box-shadow: 0 0 32px rgba(124,58,237,0.8), 0 0 60px rgba(168,85,247,0.5); }
        }
        .rc-shimmer {
            position: absolute;
            inset: 0;
            background: linear-gradient(180deg, rgba(255,255,255,0.28) 0%, transparent 60%);
            animation: rcSh 2s linear infinite;
            pointer-events: none;
        }
        @keyframes rcSh {
            0%   { transform: translateY(-100%); }
            100% { transform: translateY(200%); }
        }

        /* Medal / rank */
        .rc-medal { height: 22px; display: flex; align-items: center; justify-content: center; }
        .rc-medal-emoji { font-size: 1.1rem; }
        .rc-rank-idx {
            font-size: 0.7rem;
            font-weight: 700;
            color: #94a3b8;
        }
        .rc-rank-idx-user { color: #7c3aed; }

        /* Name */
        .rc-name {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 2px;
            max-width: 100%;
        }
        .rc-name-user .rc-name-text { color: #7c3aed; font-weight: 700; }
        .rc-name-text {
            font-size: 0.67rem;
            font-weight: 600;
            color: #475569;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 56px;
        }
        .rc-you-badge {
            font-size: 0.58rem;
            font-weight: 800;
            background: linear-gradient(135deg, #7c3aed, #a855f7);
            color: white;
            padding: 1px 6px;
            border-radius: 99px;
            letter-spacing: 0.5px;
        }

        /* Axis label */
        .rc-axis-label {
            text-align: center;
            font-size: 0.75rem;
            color: #94a3b8;
            margin-top: 1rem;
        }

        /* Loading spinner */
        .rc-spinner {
            color: #7c3aed;
            animation: spin 1s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Empty / info state */
        .rc-empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.75rem;
            padding: 3rem 1rem;
            color: #94a3b8;
            text-align: center;
        }
        .rc-empty p { font-size: 0.9rem; max-width: 300px; }

        /* Responsive */
        @media (max-width: 480px) {
            .rc-col { min-width: 22px; }
            .rc-name-text { max-width: 30px; font-size: 0.58rem; }
            .rc-pct-label { font-size: 0.58rem; }
            .rc-you-badge { display: none; }
        }
    `}</style>
);

export default RankingChart;
