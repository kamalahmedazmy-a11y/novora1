import { useParams, useNavigate } from 'react-router-dom';
import { useProgress } from '../../context/ProgressContext';
import { chapterContent } from '../../data/content';
import Navbar from '../layout/Navbar';
import { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';

export default function ChapterView() {
    const { id } = useParams();
    const chapterId = parseInt(id, 10);
    const navigate = useNavigate();
    const { isChapterLocked, completeChapter } = useProgress();

    const [mode, setMode] = useState('reading'); // 'reading' | 'exam'
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState({});
    const [score, setScore] = useState(null);
    const [showResults, setShowResults] = useState(false);

    const data = chapterContent[chapterId];

    useEffect(() => {
        if (isChapterLocked(chapterId)) {
            navigate('/');
        }
        // Reset state when chapter changes
        setMode('reading');
        setScore(null);
        setAnswers({});
        setShowResults(false);
        setCurrentQuestion(0);
    }, [chapterId, isChapterLocked, navigate]);

    if (!data) return <div>Chapter not found</div>;

    const handleStartExam = () => {
        setMode('exam');
        setCurrentQuestion(0);
        setAnswers({});
        setShowResults(false);
    };

    const handleAnswer = (optionIndex) => {
        setAnswers({ ...answers, [currentQuestion]: optionIndex });
    };

    const calculateScore = () => {
        let correct = 0;
        data.questions.forEach((q, idx) => {
            if (answers[idx] === q.correctAnswer) correct++;
        });
        const finalScore = Math.round((correct / data.questions.length) * 100);
        setScore(finalScore);
        const passed = completeChapter(chapterId, finalScore);
        setShowResults(true);
    };

    const nextQuestion = () => {
        if (currentQuestion < data.questions.length - 1) {
            setCurrentQuestion(currentQuestion + 1);
        } else {
            calculateScore();
        }
    };

    const isPassed = score >= 70;

    return (
        <div className="app-layout">
            <Navbar />
            <div className="container main-content">
                <button onClick={() => navigate('/')} className="btn-back">
                    <ArrowLeft size={16} /> Back to Dashboard
                </button>

                <div className="chapter-content-card">
                    {mode === 'reading' && (
                        <>
                            <h1>{data.title}</h1>
                            <div
                                className="content-body"
                                dangerouslySetInnerHTML={{ __html: data.content }}
                            />
                            <div className="action-area">
                                <button onClick={handleStartExam} className="btn-primary">
                                    Take Chapter Exam
                                </button>
                            </div>
                        </>
                    )}

                    {mode === 'exam' && !showResults && (
                        <div className="exam-container">
                            <h2>Chapter Exam: {data.title}</h2>
                            <div className="progress-bar-thin">
                                <div
                                    className="fill"
                                    style={{ width: `${((currentQuestion + 1) / data.questions.length) * 100}%` }}
                                />
                            </div>

                            <div className="question-card">
                                <h3>Question {currentQuestion + 1} of {data.questions.length}</h3>
                                <p className="question-text">{data.questions[currentQuestion].text}</p>

                                <div className="options-grid">
                                    {data.questions[currentQuestion].options.map((opt, idx) => (
                                        <button
                                            key={idx}
                                            className={`option-btn ${answers[currentQuestion] === idx ? 'selected' : ''}`}
                                            onClick={() => handleAnswer(idx)}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                className="btn-primary mt-4"
                                onClick={nextQuestion}
                                disabled={answers[currentQuestion] === undefined}
                            >
                                {currentQuestion === data.questions.length - 1 ? 'Submit Exam' : 'Next Question'}
                            </button>
                        </div>
                    )}

                    {showResults && (
                        <div className="results-container">
                            <div className="score-circle">
                                <span className="score-val">{score}%</span>
                                <span className="score-label">Score</span>
                            </div>

                            {isPassed ? (
                                <>
                                    <h2 className="pass-text"><CheckCircle size={32} /> Chapter Completed!</h2>
                                    <p>You have unlocked the next chapter.</p>
                                    <button onClick={() => navigate('/')} className="btn-primary">
                                        Return to Dashboard
                                    </button>
                                </>
                            ) : (
                                <>
                                    <h2 className="fail-text"><XCircle size={32} /> Try Again</h2>
                                    <p>You need 70% to pass. Review the material and retry.</p>
                                    <button onClick={() => setMode('reading')} className="btn-secondary">
                                        Review Material
                                    </button>
                                    <button onClick={handleStartExam} className="btn-primary ml-2">
                                        Retry Exam
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
}
