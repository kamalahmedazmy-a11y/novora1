import React from 'react';
import { TrendingUp, TrendingDown, Target, BarChart2, Award } from 'lucide-react';

const StatsOverview = ({ progress, chapters }) => {
    if (!progress || !chapters) return null;

    // Process data
    const scores = progress.examScores || {}; // Map of chapterId -> score
    const scoresList = Object.entries(scores).map(([id, score]) => ({
        id,
        title: chapters.find(c => String(c.id) === String(id))?.title || `Chapter ${id}`,
        score
    }));

    // Calculate Average
    const totalScore = scoresList.reduce((acc, curr) => acc + curr.score, 0);
    const avgScore = scoresList.length > 0 ? Math.round(totalScore / scoresList.length) : 0;

    // Calculate Trend (compare last 2 exams if available)
    // Assuming scoresList order is insertion order (not guaranteed in standard object, but usually works for simple keys)
    // Better to have timestamps, but we'll work with what we have.
    // Let's just assume the last two taken are the "trend".
    let trend = 'neutral';
    if (scoresList.length >= 2) {
        const last = scoresList[scoresList.length - 1].score;
        const prev = scoresList[scoresList.length - 2].score;
        if (last > prev) trend = 'positive';
        else if (last < prev) trend = 'negative';
    }

    return (
        <div className="stats-container fade-in-up">
            <h3 className="stats-title">
                <BarChart2 size={24} /> Performance Analytics
            </h3>

            <div className="stats-grid">
                {/* Average Score Card */}
                <div className="stat-card glass">
                    <div className="icon-wrapper purple">
                        <Target size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Average Score</span>
                        <span className="stat-value">{avgScore}%</span>
                    </div>
                </div>

                {/* Exams Taken Card */}
                <div className="stat-card glass">
                    <div className="icon-wrapper blue">
                        <Award size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Exams Completed</span>
                        <span className="stat-value">{scoresList.length}</span>
                    </div>
                </div>

                {/* Trend Card */}
                <div className="stat-card glass">
                    <div className={`icon-wrapper ${trend === 'positive' ? 'green' : trend === 'negative' ? 'red' : 'gray'}`}>
                        {trend === 'positive' ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Recent Trend</span>
                        <span className={`stat-value ${trend}`}>{trend === 'positive' ? 'Improving' : trend === 'negative' ? 'Declining' : 'Stable'}</span>
                    </div>
                </div>
            </div>

            <h4 className="subsection-title">Chapter Performance</h4>
            <div className="scores-list">
                {chapters.map(chapter => {
                    const score = scores[chapter.id];
                    const isCompleted = progress.completedChapters.includes(chapter.id);

                    return (
                        <div key={chapter.id} className="score-item glass">
                            <div className="score-info">
                                <span className="score-chapter">Chapter {chapter.id}</span>
                                <span className="score-title">{chapter.title}</span>
                            </div>

                            {score !== undefined ? (
                                <div className="score-visual">
                                    <div className="score-bar-bg">
                                        <div
                                            className={`score-bar-fill ${score >= 80 ? 'high' : score >= 60 ? 'mid' : 'low'}`}
                                            style={{ width: `${score}%` }}
                                        ></div>
                                    </div>
                                    <span className="score-badge">{score}%</span>
                                </div>
                            ) : (
                                <span className="not-taken">Not taken yet</span>
                            )}
                        </div>
                    );
                })}
            </div>

            <style>{`
                .stats-container {
                    margin-top: 2rem;
                    margin-bottom: 3rem;
                }
                .stats-title {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: var(--color-slate-800);
                    margin-bottom: 1.5rem;
                }
                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 1.5rem;
                    margin-bottom: 2rem;
                }
                .stat-card {
                    padding: 1.5rem;
                    border-radius: var(--radius-md);
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    transition: transform 0.2s;
                }
                .stat-card:hover {
                    transform: translateY(-5px);
                }
                .icon-wrapper {
                    width: 48px;
                    height: 48px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .icon-wrapper.purple { background: var(--color-bg-purple); color: var(--brand-primary); }
                .icon-wrapper.blue { background: #e0f2fe; color: #0284c7; }
                .icon-wrapper.green { background: #dcfce7; color: #16a34a; }
                .icon-wrapper.red { background: #fee2e2; color: #dc2626; }
                .icon-wrapper.gray { background: #f1f5f9; color: #64748b; }

                .stat-content {
                    display: flex;
                    flex-direction: column;
                }
                .stat-label {
                    font-size: 0.85rem;
                    color: var(--text-secondary);
                    font-weight: 500;
                }
                .stat-value {
                    font-size: 1.5rem;
                    font-weight: 800;
                    color: var(--text-primary);
                    line-height: 1.2;
                }
                .stat-value.positive { color: #16a34a; }
                .stat-value.negative { color: #dc2626; }

                .subsection-title {
                    font-size: 1.1rem;
                    color: var(--text-secondary);
                    margin-bottom: 1rem;
                    font-weight: 600;
                }

                .scores-list {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }
                .score-item {
                    padding: 1rem 1.5rem;
                    border-radius: var(--radius-sm);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 1rem;
                }
                .score-info {
                    display: flex;
                    flex-direction: column;
                }
                .score-chapter {
                    font-size: 0.75rem;
                    text-transform: uppercase;
                    color: var(--text-secondary);
                    font-weight: 700;
                    letter-spacing: 0.5px;
                }
                .score-title {
                    font-weight: 600;
                    color: var(--text-primary);
                }
                .score-visual {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    flex: 1;
                    max-width: 300px;
                }
                .score-bar-bg {
                    flex: 1;
                    height: 8px;
                    background: var(--color-slate-100);
                    border-radius: 99px;
                    overflow: hidden;
                }
                .score-bar-fill {
                    height: 100%;
                    border-radius: 99px;
                    transition: width 1s ease-out;
                }
                .score-bar-fill.high { background: #10b981; }
                .score-bar-fill.mid { background: #f59e0b; }
                .score-bar-fill.low { background: #ef4444; }
                
                .score-badge {
                    font-weight: 700;
                    color: var(--text-primary);
                    min-width: 3rem;
                    text-align: right;
                }
                .not-taken {
                    font-size: 0.85rem;
                    color: #94a3b8;
                    font-style: italic;
                }
                
                @media (max-width: 640px) {
                    .score-item {
                        flex-direction: column;
                        align-items: flex-start;
                    }
                    .score-visual {
                        width: 100%;
                        max-width: none;
                    }
                }
            `}</style>
        </div>
    );
};

export default StatsOverview;
