import { useAuth } from '../../context/AuthContext';
import { useProgress } from '../../context/ProgressContext';
import { chapters } from '../../data/chapters';
import Navbar from '../layout/Navbar';
import ChapterCard from '../common/ChapterCard';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
    const { user } = useAuth();
    const { isChapterLocked, completedChapters, isFinalExamUnlocked } = useProgress();
    const navigate = useNavigate();

    const handleStartChapter = (id) => {
        navigate(`/chapter/${id}`);
    };

    return (
        <div className="app-layout">
            <Navbar />

            <main className="container main-content">
                <header className="dashboard-header">
                    <h1>Course Curriculum</h1>
                    <p>Master the Theory of Computation step by step.</p>
                </header>

                <div className="chapters-grid">
                    {chapters.map((chapter) => (
                        <ChapterCard
                            key={chapter.id}
                            chapter={chapter}
                            isLocked={isChapterLocked(chapter.id)}
                            isCompleted={completedChapters.includes(chapter.id)}
                            onStart={() => handleStartChapter(chapter.id)}
                        />
                    ))}

                    {/* Final Exam Card */}
                    <div className={`chapter-card final-exam ${!isFinalExamUnlocked() ? 'locked' : ''}`}>
                        <div className="chapter-header">
                            <span className="chapter-id">Final Assessment</span>
                        </div>
                        <h3 className="chapter-title">Final Exam</h3>
                        <p className="chapter-desc">Comprehensive evaluation of all topics.</p>
                        <div className="chapter-footer">
                            {isFinalExamUnlocked() ? (
                                <button className="btn-start final-btn" onClick={() => navigate('/final-exam')}>Take Exam</button>
                            ) : (
                                <span className="locked-msg">Complete all chapters to unlock</span>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
