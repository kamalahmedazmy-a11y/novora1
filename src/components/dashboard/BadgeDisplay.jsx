import React, { useEffect, useState } from 'react';
import { Award } from 'lucide-react';

const BADGES = [
    {
        key: 'master',
        minPercent: 100,
        emoji: '👑',
        name: 'Master',
        description: 'Automata Champion — you completed every chapter!',
        gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
        glow: 'rgba(245, 158, 11, 0.4)',
        textColor: '#92400e'
    },
    {
        key: 'gold',
        minPercent: 75,
        emoji: '🥇',
        name: 'Gold',
        description: 'Almost a Master — you\'re in the top tier!',
        gradient: 'linear-gradient(135deg, #d97706, #fcd34d)',
        glow: 'rgba(217, 119, 6, 0.35)',
        textColor: '#78350f'
    },
    {
        key: 'silver',
        minPercent: 50,
        emoji: '🥈',
        name: 'Silver',
        description: 'Halfway There — great progress so far!',
        gradient: 'linear-gradient(135deg, #64748b, #94a3b8)',
        glow: 'rgba(100, 116, 139, 0.35)',
        textColor: '#334155'
    },
    {
        key: 'bronze',
        minPercent: 25,
        emoji: '🥉',
        name: 'Bronze',
        description: 'Getting Started — keep up the momentum!',
        gradient: 'linear-gradient(135deg, #b45309, #d97706)',
        glow: 'rgba(180, 83, 9, 0.35)',
        textColor: '#7c2d12'
    }
];

const getEarnedBadge = (completionPercent) => {
    for (const badge of BADGES) {
        if (completionPercent >= badge.minPercent) return badge;
    }
    return null;
};

const getNextBadge = (completionPercent) => {
    // Walk BADGES in reverse (lowest first) to find the very next unlockable
    for (let i = BADGES.length - 1; i >= 0; i--) {
        if (completionPercent < BADGES[i].minPercent) return BADGES[i];
    }
    return null;
};

const BadgeDisplay = ({ completionPercent = 0 }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setVisible(true), 100);
        return () => clearTimeout(t);
    }, [completionPercent]);

    const earned = getEarnedBadge(completionPercent);
    const next = getNextBadge(completionPercent);

    // Progress toward next milestone
    const prevThreshold = earned ? earned.minPercent : 0;
    const nextThreshold = next ? next.minPercent : 100;
    const progressToNext = nextThreshold > prevThreshold
        ? Math.round(((completionPercent - prevThreshold) / (nextThreshold - prevThreshold)) * 100)
        : 100;

    return (
        <div className="badge-section">
            <div className="badge-section-header">
                <Award size={22} />
                <h3 className="badge-section-title">Achievement Badge</h3>
            </div>

            <div className="badge-display-grid">
                {/* Earned Badge Card */}
                <div
                    className={`badge-card ${visible ? 'badge-card-visible' : ''}`}
                    style={earned ? { '--badge-glow': earned.glow } : {}}
                >
                    {earned ? (
                        <>
                            <div
                                className="badge-icon-ring"
                                style={{ background: earned.gradient, boxShadow: `0 0 24px ${earned.glow}` }}
                            >
                                <span className="badge-emoji">{earned.emoji}</span>
                            </div>
                            <div className="badge-info">
                                <span className="badge-name" style={{ color: earned.textColor }}>
                                    {earned.name} Badge
                                </span>
                                <span className="badge-desc">{earned.description}</span>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="badge-icon-ring badge-icon-locked">
                                <span className="badge-emoji">🔒</span>
                            </div>
                            <div className="badge-info">
                                <span className="badge-name badge-name-locked">No Badge Yet</span>
                                <span className="badge-desc">Complete 25% of the course to earn your first badge!</span>
                            </div>
                        </>
                    )}
                </div>

                {/* Milestone Progress Card */}
                <div className="milestone-card">
                    <div className="milestone-header">
                        <span className="milestone-label">
                            {next ? `Progress to ${next.emoji} ${next.name}` : '🎉 All badges unlocked!'}
                        </span>
                        {next && (
                            <span className="milestone-pct">{progressToNext}%</span>
                        )}
                    </div>

                    {next && (
                        <div className="milestone-bar-track">
                            <div
                                className="milestone-bar-fill"
                                style={{ width: visible ? `${progressToNext}%` : '0%' }}
                            />
                        </div>
                    )}

                    <div className="all-badges-row">
                        {BADGES.slice().reverse().map(badge => {
                            const unlocked = completionPercent >= badge.minPercent;
                            return (
                                <div
                                    key={badge.key}
                                    className={`mini-badge ${unlocked ? 'unlocked' : 'locked'}`}
                                    title={`${badge.name} — ${badge.minPercent}%`}
                                >
                                    <span className="mini-badge-emoji">{badge.emoji}</span>
                                    <span className="mini-badge-pct">{badge.minPercent}%</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <style>{`
                .badge-section {
                    background: white;
                    border-radius: 20px;
                    padding: 2rem;
                    margin-bottom: 2rem;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
                }

                .badge-section-header {
                    display: flex;
                    align-items: center;
                    gap: 0.6rem;
                    margin-bottom: 1.5rem;
                    color: var(--text-primary);
                }

                .badge-section-title {
                    font-size: 1.25rem;
                    font-weight: 700;
                    margin: 0;
                    color: var(--text-primary);
                }

                .badge-display-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1.5rem;
                }

                @media (max-width: 600px) {
                    .badge-display-grid {
                        grid-template-columns: 1fr;
                    }
                }

                /* Earned Badge Card */
                .badge-card {
                    background: #f8fafc;
                    border: 2px solid #e2e8f0;
                    border-radius: 16px;
                    padding: 1.5rem;
                    display: flex;
                    align-items: center;
                    gap: 1.25rem;
                    opacity: 0;
                    transform: scale(0.88);
                    transition: opacity 0.5s ease, transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s ease;
                }

                .badge-card-visible {
                    opacity: 1;
                    transform: scale(1);
                }

                .badge-card-visible:not(:has(.badge-icon-locked)) {
                    box-shadow: 0 0 20px var(--badge-glow, rgba(0,0,0,0.08));
                    border-color: transparent;
                }

                .badge-icon-ring {
                    width: 72px;
                    height: 72px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .badge-icon-locked {
                    background: #e2e8f0;
                }

                .badge-emoji {
                    font-size: 2rem;
                    line-height: 1;
                }

                .badge-info {
                    display: flex;
                    flex-direction: column;
                    gap: 0.35rem;
                }

                .badge-name {
                    font-size: 1.1rem;
                    font-weight: 800;
                }

                .badge-name-locked {
                    color: #64748b;
                }

                .badge-desc {
                    font-size: 0.825rem;
                    color: var(--text-secondary);
                    line-height: 1.4;
                }

                /* Milestone Card */
                .milestone-card {
                    background: #f8fafc;
                    border: 2px solid #e2e8f0;
                    border-radius: 16px;
                    padding: 1.5rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }

                .milestone-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .milestone-label {
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: var(--text-primary);
                }

                .milestone-pct {
                    font-size: 0.875rem;
                    font-weight: 800;
                    color: #7c3aed;
                }

                .milestone-bar-track {
                    height: 10px;
                    background: #e2e8f0;
                    border-radius: 99px;
                    overflow: hidden;
                }

                .milestone-bar-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #7c3aed, #a855f7);
                    border-radius: 99px;
                    transition: width 0.9s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 0 8px rgba(124, 58, 237, 0.4);
                }

                .all-badges-row {
                    display: flex;
                    justify-content: space-between;
                    gap: 0.5rem;
                    margin-top: 0.25rem;
                }

                .mini-badge {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.2rem;
                    flex: 1;
                    padding: 0.5rem 0.25rem;
                    border-radius: 10px;
                    transition: all 0.2s;
                }

                .mini-badge.unlocked {
                    background: rgba(124, 58, 237, 0.08);
                }

                .mini-badge.locked {
                    opacity: 0.35;
                    filter: grayscale(1);
                }

                .mini-badge-emoji {
                    font-size: 1.4rem;
                }

                .mini-badge-pct {
                    font-size: 0.65rem;
                    font-weight: 700;
                    color: var(--text-secondary);
                }
            `}</style>
        </div>
    );
};

export default BadgeDisplay;
