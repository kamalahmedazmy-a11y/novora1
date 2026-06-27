import { Lock, Unlock, CheckCircle, ArrowRight } from 'lucide-react';

export default function ChapterCard({ chapter, isLocked, isCompleted, onStart }) {
    return (
        <div className={`chapter-card ${isLocked ? 'locked' : ''} ${isCompleted ? 'completed' : ''}`}>
            <div className="chapter-header">
                <span className="chapter-id">Chapter {chapter.id}</span>
                {isCompleted ? (
                    <CheckCircle className="status-icon completed" size={24} />
                ) : isLocked ? (
                    <Lock className="status-icon locked" size={24} />
                ) : (
                    <Unlock className="status-icon unlocked" size={24} />
                )}
            </div>

            <h3 className="chapter-title">{chapter.title}</h3>
            <p className="chapter-desc">{chapter.description}</p>

            <div className="chapter-footer">
                {!isLocked && (
                    <button onClick={onStart} className="btn-start">
                        {isCompleted ? 'Review' : 'Start Learning'} <ArrowRight size={16} />
                    </button>
                )}
                {isLocked && <span className="locked-msg">Complete previous chapter to unlock</span>}
            </div>
        </div>
    );
}
