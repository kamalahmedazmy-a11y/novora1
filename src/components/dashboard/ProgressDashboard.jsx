import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Award, Target, BarChart3, Calendar, Zap, Trophy } from 'lucide-react';
import BadgeDisplay from './BadgeDisplay';
import RankingChart from './RankingChart';
import { useAuth } from '../../context/AuthContext';

const ProgressDashboard = ({ progress, chapters }) => {
    const { user } = useAuth();
    const [examHistory, setExamHistory] = useState([]);
    const [trend, setTrend] = useState('neutral');
    const [averageScore, setAverageScore] = useState(0);
    const [bestScore, setBestScore] = useState(0);
    const [leaderboard, setLeaderboard] = useState([]);
    const [totalStudents, setTotalStudents] = useState(0);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [leaderboardLoading, setLeaderboardLoading] = useState(true);
    const [leaderboardError, setLeaderboardError] = useState(null);

    useEffect(() => {
        console.log('ProgressDashboard received progress:', progress);
        console.log('Chapters:', chapters);

        if (progress?.examScores) {
            // examScores is stored as a Map/Object: { chapterId: score }
            // Convert to array format: [{ chapterId, score, date }]
            let scoresArray = [];

            if (typeof progress.examScores === 'object') {
                // Use updatedAt or createdAt as the base date, then offset for each exam
                const baseDate = progress.updatedAt ? new Date(progress.updatedAt) : new Date();

                scoresArray = Object.entries(progress.examScores).map(([chapterId, score], index) => {
                    // Create dates going backwards from most recent
                    const examDate = new Date(baseDate);
                    examDate.setDate(examDate.getDate() - (Object.keys(progress.examScores).length - index - 1) * 2);

                    return {
                        chapterId: parseInt(chapterId),
                        score: score,
                        date: examDate.toISOString()
                    };
                });
            }

            console.log('Converted scores array:', scoresArray);

            if (scoresArray.length > 0) {
                setExamHistory(scoresArray);

                // Calculate average
                const avg = scoresArray.reduce((sum, exam) => sum + exam.score, 0) / scoresArray.length;
                setAverageScore(Math.round(avg));

                // Find best score
                const best = Math.max(...scoresArray.map(exam => exam.score));
                setBestScore(best);

                // Calculate trend (last 3 vs previous 3)
                if (scoresArray.length >= 6) {
                    const recent = scoresArray.slice(-3).reduce((sum, exam) => sum + exam.score, 0) / 3;
                    const previous = scoresArray.slice(-6, -3).reduce((sum, exam) => sum + exam.score, 0) / 3;
                    setTrend(recent > previous ? 'up' : recent < previous ? 'down' : 'neutral');
                } else if (scoresArray.length >= 2) {
                    const recent = scoresArray[scoresArray.length - 1].score;
                    const previous = scoresArray[scoresArray.length - 2].score;
                    setTrend(recent > previous ? 'up' : recent < previous ? 'down' : 'neutral');
                }
            } else {
                // Reset to defaults if no exam data
                setExamHistory([]);
                setAverageScore(0);
                setBestScore(0);
                setTrend('neutral');
            }
        } else {
            // Reset to defaults if no exam data
            setExamHistory([]);
            setAverageScore(0);
            setBestScore(0);
            setTrend('neutral');
        }
    }, [progress, chapters]);

    // Fetch leaderboard — use the same auth source as ProtectedRoute (useAuth hook)
    useEffect(() => {
        const token = user?.token;
        const userId = user?._id || user?.id;
        if (userId) setCurrentUserId(userId);

        if (!token) {
            setLeaderboardLoading(false);
            setLeaderboardError('Not logged in — please log in to see the leaderboard.');
            return;
        }

        fetch('/api/progress/leaderboard', {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(r => {
                if (!r.ok) throw new Error(`Server returned HTTP ${r.status}`);
                return r.json();
            })
            .then(data => {
                setLeaderboardError(null);
                setLeaderboard(data.leaderboard ?? []);
                setTotalStudents(data.totalStudents ?? 0);
            })
            .catch(err => {
                console.error('[leaderboard] fetch failed:', err.message);
                setLeaderboardError(`Could not load leaderboard: ${err.message}`);
                setLeaderboard([]);
            })
            .finally(() => setLeaderboardLoading(false));
    }, [user]);

    // Early return if no data
    if (!progress || !chapters || chapters.length === 0) {
        return (
            <div className="progress-dashboard">
                <div className="empty-state-full">
                    <p>Loading your progress data...</p>
                </div>
            </div>
        );
    }

    const hasExamData = examHistory.length > 0;

    // Completion % for badge system
    const totalChapters = chapters.length;
    const completedCount = progress?.completedChapters?.length || 0;
    const completionPercent = totalChapters > 0 ? Math.round((completedCount / totalChapters) * 100) : 0;

    const getChapterProgress = (chapterId) => {
        const chapterScores = examHistory.filter(exam => exam.chapterId === chapterId);
        if (chapterScores.length === 0) return 0;
        const latestScore = chapterScores[chapterScores.length - 1].score;
        return latestScore;
    };

    const getChapterStatus = (chapterId) => {
        const score = getChapterProgress(chapterId);
        const chapter = chapters.find(ch => ch.id === chapterId);
        const passingScore = chapter?.passingScore || 70;

        if (score >= passingScore) return 'completed';
        if (score > 0) return 'in-progress';
        return 'not-started';
    };

    return (
        <div className="progress-dashboard">
            {/* Stats Cards */}
            <div className="stats-grid">
                <div className="stat-card purple-gradient">
                    <div className="stat-icon">
                        <BarChart3 size={28} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{hasExamData ? `${averageScore}%` : '--'}</div>
                        <div className="stat-label">Average Score</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon trophy">
                        <Trophy size={28} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{hasExamData ? `${bestScore}%` : '--'}</div>
                        <div className="stat-label">Best Score</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">
                        <Target size={28} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{examHistory.length}</div>
                        <div className="stat-label">Exams Taken</div>
                    </div>
                </div>

                <div className={`stat-card ${hasExamData ? `trend-${trend}` : ''}`}>
                    <div className="stat-icon">
                        {trend === 'up' ? <TrendingUp size={28} /> : trend === 'down' ? <TrendingDown size={28} /> : <Zap size={28} />}
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">
                            {hasExamData ? (trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→') : '--'} Trend
                        </div>
                        <div className="stat-label">
                            {hasExamData ? (trend === 'up' ? 'Improving' : trend === 'down' ? 'Needs Focus' : 'Steady') : 'No data yet'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Badge + Ranking */}
            <BadgeDisplay completionPercent={completionPercent} />
            <RankingChart
                leaderboard={leaderboard}
                totalStudents={totalStudents}
                currentUserId={currentUserId}
                loading={leaderboardLoading}
                error={leaderboardError}
            />

            {/* Chapter Progress */}
            <div className="chapter-progress-section">
                <h3 className="section-title">
                    <Award size={20} /> Chapter Progress
                </h3>
                <div className="chapter-progress-grid">
                    {chapters.map((chapter) => {
                        const progress = getChapterProgress(chapter.id);
                        const status = getChapterStatus(chapter.id);

                        return (
                            <div key={chapter.id} className={`chapter-progress-card ${status}`}>
                                <div className="chapter-header">
                                    <span className="chapter-number">Ch {chapter.id}</span>
                                    <span className={`status-badge ${status}`}>
                                        {status === 'completed' ? '✓ Complete' : status === 'in-progress' ? '⟳ In Progress' : '○ Not Started'}
                                    </span>
                                </div>
                                <h4 className="chapter-title">{chapter.title}</h4>
                                <div className="progress-bar-wrapper">
                                    <div className="progress-bar-bg">
                                        <div
                                            className="progress-bar-fill"
                                            style={{ width: `${progress}%` }}
                                        >
                                            <div className="shimmer"></div>
                                        </div>
                                    </div>
                                    <span className="progress-percentage">{progress}%</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Exam History */}
            <div className="exam-history-section">
                <h3 className="section-title">
                    <Calendar size={20} /> Recent Exam History
                </h3>
                <div className="exam-history-list">
                    {examHistory.slice(-5).reverse().map((exam, index) => {
                        const chapter = chapters.find(ch => ch.id === exam.chapterId);
                        const passed = exam.score >= (chapter?.passingScore || 70);

                        return (
                            <div key={index} className={`exam-history-item ${passed ? 'passed' : 'failed'}`}>
                                <div className="exam-info">
                                    <div className="exam-chapter">Chapter {exam.chapterId}: {chapter?.title}</div>
                                    <div className="exam-date">{new Date(exam.date).toLocaleDateString()}</div>
                                </div>
                                <div className={`exam-score ${passed ? 'passed' : 'failed'}`}>
                                    {exam.score}%
                                </div>
                            </div>
                        );
                    })}
                    {examHistory.length === 0 && (
                        <div className="empty-state">
                            <p>No exam history yet. Complete your first chapter exam to see your progress!</p>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .progress-dashboard {
                    padding: 1rem 0;
                }

                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 1.5rem;
                    margin-bottom: 2rem;
                }

                .stat-card {
                    background: white;
                    border-radius: 16px;
                    padding: 1.5rem;
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
                    border: 1px solid #f1f5f9;
                    transition: all 0.3s;
                }

                .stat-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
                }

                .stat-card.purple-gradient {
                    background: var(--gradient-purple-1);
                    color: white;
                    border: none;
                }

                .stat-card.trend-up {
                    background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
                    color: white;
                    border: none;
                }

                .stat-card.trend-down {
                    background: linear-gradient(135deg, #ef4444 0%, #f87171 100%);
                    color: white;
                    border: none;
                }

                .stat-icon {
                    width: 56px;
                    height: 56px;
                    background: rgba(255, 255, 255, 0.2);
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .stat-card.purple-gradient .stat-icon,
                .stat-card.trend-up .stat-icon,
                .stat-card.trend-down .stat-icon {
                    background: rgba(255, 255, 255, 0.2);
                }

                .stat-icon.trophy {
                    background: #fef3c7;
                    color: #f59e0b;
                }

                .stat-content {
                    flex-grow: 1;
                }

                .stat-value {
                    font-size: 1.75rem;
                    font-weight: 800;
                    line-height: 1;
                    margin-bottom: 0.25rem;
                }

                .stat-label {
                    font-size: 0.875rem;
                    opacity: 0.9;
                    font-weight: 500;
                }

                .section-title {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin-bottom: 1.5rem;
                }

                .chapter-progress-section,
                .exam-history-section {
                    background: white;
                    border-radius: 20px;
                    padding: 2rem;
                    margin-bottom: 2rem;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
                }

                .chapter-progress-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                    gap: 1.5rem;
                }

                .chapter-progress-card {
                    background: #f8fafc;
                    border-radius: 12px;
                    padding: 1.25rem;
                    border: 2px solid #e2e8f0;
                    transition: all 0.3s;
                }

                .chapter-progress-card:hover {
                    border-color: var(--brand-primary);
                    transform: translateY(-2px);
                }

                .chapter-progress-card.completed {
                    background: #f0fdf4;
                    border-color: #86efac;
                }

                .chapter-progress-card.in-progress {
                    background: #fef3c7;
                    border-color: #fcd34d;
                }

                .chapter-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 0.75rem;
                }

                .chapter-number {
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: var(--brand-primary);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .status-badge {
                    font-size: 0.75rem;
                    padding: 0.25rem 0.5rem;
                    border-radius: 99px;
                    font-weight: 600;
                }

                .status-badge.completed {
                    background: #d1fae5;
                    color: #065f46;
                }

                .status-badge.in-progress {
                    background: #fef3c7;
                    color: #92400e;
                }

                .status-badge.not-started {
                    background: #f1f5f9;
                    color: #64748b;
                }

                .chapter-title {
                    font-size: 1rem;
                    font-weight: 600;
                    color: var(--text-primary);
                    margin-bottom: 1rem;
                }

                .progress-bar-wrapper {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }

                .progress-bar-bg {
                    flex-grow: 1;
                    height: 8px;
                    background: #e2e8f0;
                    border-radius: 99px;
                    overflow: hidden;
                    position: relative;
                }

                .progress-bar-fill {
                    height: 100%;
                    background: var(--gradient-purple-2);
                    border-radius: 99px;
                    transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
                    position: relative;
                    overflow: hidden;
                }

                .shimmer {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
                    animation: shimmer 2s infinite;
                }

                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }

                .progress-percentage {
                    font-size: 0.875rem;
                    font-weight: 700;
                    color: var(--brand-primary);
                    min-width: 40px;
                    text-align: right;
                }

                .exam-history-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                }

                .exam-history-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1rem 1.25rem;
                    background: #f8fafc;
                    border-radius: 12px;
                    border-left: 4px solid #e2e8f0;
                    transition: all 0.2s;
                }

                .exam-history-item:hover {
                    background: #f1f5f9;
                    transform: translateX(4px);
                }

                .exam-history-item.passed {
                    border-left-color: #10b981;
                }

                .exam-history-item.failed {
                    border-left-color: #ef4444;
                }

                .exam-info {
                    flex-grow: 1;
                }

                .exam-chapter {
                    font-weight: 600;
                    color: var(--text-primary);
                    margin-bottom: 0.25rem;
                }

                .exam-date {
                    font-size: 0.85rem;
                    color: var(--text-secondary);
                    font-weight: 500;
                }

                .exam-score {
                    font-size: 1.5rem;
                    font-weight: 700;
                    padding: 0.5rem 1rem;
                    border-radius: 8px;
                    min-width: 70px;
                    text-align: center;
                }

                .exam-score.passed {
                    color: #10b981;
                    background: #d1fae5;
                }

                .exam-score.failed {
                    color: #ef4444;
                    background: #fee2e2;
                }

                .empty-state {
                    text-align: center;
                    padding: 3rem 1rem;
                    color: var(--text-secondary);
                }

                .empty-state-full {
                    text-align: center;
                    padding: 4rem 2rem;
                    color: var(--text-secondary);
                    font-size: 1.1rem;
                }

                @media (max-width: 768px) {
                    .stats-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }
                    
                    .chapter-progress-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </div>
    );
};

export default ProgressDashboard;
