import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../context/AuthContext';
import {
    BookOpen,
    ArrowLeft,
    Brain,
    CheckCircle,
    AlertTriangle,
    Trophy,
    ChevronRight,
    Lightbulb,
    Target
} from 'lucide-react';

import RegexTester from '../components/interactives/RegexTester';
import TuringMachineTape from '../components/interactives/TuringMachineTape';
import LogicGateDemo from '../components/interactives/LogicGateDemo';
import DFAVisualizer from '../components/interactives/DFAVisualizer';
import NFAVisualizer from '../components/interactives/NFAVisualizer';
import ComplexityVisualizer from '../components/interactives/ComplexityVisualizer';
import PDAVisualizer from '../components/interactives/PDAVisualizer';

const ChapterView = () => {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [chapter, setChapter] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [mode, setMode] = useState('read'); // 'read' or 'exam'

    // Exam state
    const [answers, setAnswers] = useState({});
    const [score, setScore] = useState(null);
    const [examResult, setExamResult] = useState(null);

    useEffect(() => {
        const fetchChapter = async () => {
            const token = user?.token;
            try {
                const res = await fetch(`/api/chapters/${id}`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {}
                });

                if (!res.ok) {
                    if (res.status === 403) {
                        alert('This chapter is locked!');
                        navigate('/dashboard');
                        return;
                    }
                    console.warn('API failed, falling back to local content');
                    throw new Error('API Error');
                }

                const data = await res.json();

                // Validate data. If empty/invalid, force fallback.
                if (!data || !data.title || !data.content) {
                    console.warn('API returned incomplete data, falling back to local content');
                    throw new Error('Incomplete data');
                }

                setChapter(data);
                setLoading(false);
            } catch (err) {
                console.error('Failed to load chapter', id, err);
                setError(err.message || 'Failed to load chapter');
                setLoading(false);
            }
        };
        fetchChapter();
    }, [id, navigate]);

    const handleAnswerChange = (questionIndex, optionIndex) => {
        setAnswers({ ...answers, [questionIndex]: optionIndex });
    };

    const submitExam = async () => {
        let correctCount = 0;
        chapter.questions.forEach((q, index) => {
            if (answers[index] === q.correctIndex) {
                correctCount++;
            }
        });

        const calculatedScore = Math.round((correctCount / chapter.questions.length) * 100);
        const token = user?.token;

        try {
            const res = await fetch('/api/progress/submit-exam', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    chapterId: chapter.id,
                    score: calculatedScore
                })
            });

            const data = await res.json();
            setScore(calculatedScore);
            setExamResult(data);

        } catch (err) {
            console.error(err);
            alert('Error submitting exam');
        }
    };

    if (loading) return (
        <div className="loading-container">
            <div className="loader"></div>
            <p>Loading Chapter...</p>
        </div>
    );

    if (error) return (
        <div className="error-container">
            <AlertTriangle size={48} className="error-icon" />
            <h2>Error Loading Content</h2>
            <p>{error}</p>
            <button onClick={() => navigate('/dashboard')} className="btn-secondary">Return to Dashboard</button>
        </div>
    );

    // Custom Markdown Components with enhanced animations
    const MarkdownComponents = {
        h1: ({ children }) => <h1 className="md-h1 slide-in-left">{children}</h1>,
        h2: ({ children }) => <h2 className="md-h2 slide-in-left delay-100"><span className="icon-wrapper"><Target size={24} /></span>{children}</h2>,
        h3: ({ children }) => <h3 className="md-h3 slide-in-left delay-200">{children}</h3>,
        p: ({ children }) => <p className="md-p fade-in-up">{children}</p>,
        ul: ({ children }) => <ul className="md-ul fade-in-up delay-300">{children}</ul>,
        li: ({ children }) => <li className="md-li"><ChevronRight size={16} className="li-icon" /><span>{children}</span></li>,
        blockquote: ({ children }) => (
            <blockquote className="md-quote scale-in delay-200">
                <Lightbulb className="quote-icon" size={24} />
                <div className="quote-content">{children}</div>
            </blockquote>
        ),
        code: ({ inline, children }) => (
            inline
                ? <code className="inline-code">{children}</code>
                : <code className="code-block">{children}</code>
        ),
        strong: ({ children }) => <strong className="highlight-text">{children}</strong>,
        em: ({ children }) => <em className="emphasis-text">{children}</em>,
    };

    const renderInteractiveComponent = () => {
        // Render based on string id (from URL params) or numeric id (from chapter data)
        const chapterId = String(chapter.id);

        switch (chapterId) {
            case '1':
                return (
                    <>
                        <DFAVisualizer />
                        <div style={{ marginTop: '2rem' }}>
                            <NFAVisualizer />
                        </div>
                        <div style={{ marginTop: '2rem' }}>
                            <RegexTester />
                        </div>
                    </>
                );
            case '2':
                return <PDAVisualizer />;
            case '3':
                return <TuringMachineTape />;
            case '6':
                return <ComplexityVisualizer />;
            default:
                return null;
        }
    };

    const interactiveComponent = renderInteractiveComponent();

    return (
        <div className="chapter-view-container">
            <div className="container">

                <button onClick={() => navigate('/dashboard')} className="btn-back">
                    <ArrowLeft size={18} />
                    <span>Back to Dashboard</span>
                </button>

                {mode === 'read' ? (
                    <div className="content-wrapper fade-in">
                        <header className="chapter-hero">
                            <div className="hero-content">
                                <span className="chapter-badge">Chapter {chapter.id}</span>
                                <h1 className="chapter-title">{chapter.title}</h1>
                                <p className="chapter-desc">{chapter.description}</p>
                            </div>
                            <div className="hero-decoration">
                                <BookOpen size={120} strokeWidth={1} />
                            </div>
                        </header>

                        <div className="markdown-content card">
                            <ReactMarkdown components={MarkdownComponents}>
                                {chapter.content}
                            </ReactMarkdown>
                        </div>

                        {interactiveComponent && (
                            <div className="interactive-wrapper fade-in-up delay-300">
                                {interactiveComponent}
                            </div>
                        )}

                        <div className="action-bar slide-up-reveal">
                            <div className="completion-status">
                                <span>Read the material thoroughly before starting the exam.</span>
                            </div>
                            <button onClick={() => setMode('exam')} className="btn-primary btn-lg shine-effect">
                                <Brain size={20} />
                                <span>Take Exam</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="exam-wrapper fade-in">
                        <div className="exam-card card">
                            <header className="exam-header">
                                <Brain size={32} className="text-primary" />
                                <h2>Assessment: {chapter.title}</h2>
                                <p>Answer all questions to complete this chapter.</p>
                            </header>

                            {score !== null ? (
                                <div className="result-container scale-in">
                                    <div className={`score-ring ${examResult?.passed ? 'success' : 'failure'}`}>
                                        <svg viewBox="0 0 36 36" className="circular-chart">
                                            <path className="circle-bg"
                                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                            />
                                            <path className="circle"
                                                strokeDasharray={`${score}, 100`}
                                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                            />
                                        </svg>
                                        <div className="percentage-text">
                                            {score}%
                                        </div>
                                    </div>

                                    <div className="result-message">
                                        {examResult?.passed ? (
                                            <>
                                                <Trophy size={48} className="trophy-icon pop-in" />
                                                <h3 className="text-success">Chapter Completed!</h3>
                                                <p>You've successfully mastered this topic.</p>
                                            </>
                                        ) : (
                                            <>
                                                <AlertTriangle size={48} className="fail-icon shake" />
                                                <h3 className="text-danger">Keep Trying</h3>
                                                <p>Review the material and try again. Passing score: {chapter.passingScore}%</p>
                                            </>
                                        )}
                                    </div>

                                    <div className="exam-actions">
                                        <button onClick={() => {
                                            setMode('read');
                                            setScore(null);
                                            setAnswers({});
                                        }} className="btn-secondary">
                                            <BookOpen size={18} /> Review Material
                                        </button>

                                        {examResult?.passed ? (
                                            <button onClick={() => navigate('/dashboard')} className="btn-primary">
                                                Continue Dashboard <ChevronRight size={18} />
                                            </button>
                                        ) : (
                                            <button onClick={() => {
                                                setScore(null);
                                                setAnswers({});
                                            }} className="btn-primary">
                                                Try Again
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="questions-list">
                                    {chapter.questions.map((q, qIndex) => (
                                        <div key={qIndex} className="question-block slide-in-right" style={{ animationDelay: `${qIndex * 100}ms` }}>
                                            <div className="question-number">Q{qIndex + 1}</div>
                                            <div className="question-content">
                                                <p className="question-text">{q.question}</p>
                                                <div className="options-group">
                                                    {q.options.map((opt, optIndex) => (
                                                        <label key={optIndex} className={`option-item ${answers[qIndex] === optIndex ? 'selected' : ''}`}>
                                                            <div className="radio-indicator">
                                                                {answers[qIndex] === optIndex && <div className="radio-dot" />}
                                                            </div>
                                                            <input
                                                                type="radio"
                                                                name={`question-${qIndex}`}
                                                                value={optIndex}
                                                                checked={answers[qIndex] === optIndex}
                                                                onChange={() => handleAnswerChange(qIndex, optIndex)}
                                                            />
                                                            <span className="option-text">{opt}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    <div className="submit-area">
                                        <button
                                            onClick={submitExam}
                                            className={`btn-primary btn-block ${Object.keys(answers).length === chapter.questions.length ? 'pulse' : ''}`}
                                            disabled={Object.keys(answers).length !== chapter.questions.length}
                                        >
                                            Submit Final Answers
                                        </button>
                                        {Object.keys(answers).length !== chapter.questions.length && (
                                            <p className="helper-text">Please answer all {chapter.questions.length} questions</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                /* Animations */
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes slideInLeft {
                    from { opacity: 0; transform: translateX(-30px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                @keyframes slideInRight {
                    from { opacity: 0; transform: translateX(30px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                @keyframes scaleIn {
                    from { opacity: 0; transform: scale(0.9); }
                    to { opacity: 1; transform: scale(1); }
                }
                @keyframes pulse {
                    0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(var(--primary-rgb), 0.7); }
                    70% { transform: scale(1.02); box-shadow: 0 0 0 10px rgba(var(--primary-rgb), 0); }
                    100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(var(--primary-rgb), 0); }
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                @keyframes shimmer {
                    0% { background-position: -1000px 0; }
                    100% { background-position: 1000px 0; }
                }
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
                @keyframes popIn {
                    0% { transform: scale(0); opacity: 0; }
                    80% { transform: scale(1.1); opacity: 1; }
                    100% { transform: scale(1); opacity: 1; }
                }

                /* Layout & Utility */
                .chapter-view-container {
                    padding: 2rem 0 4rem;
                    min-height: 90vh;
                    background-color: #f8fafc;
                }
                
                .btn-back {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    background: white;
                    border: 1px solid #e2e8f0;
                    padding: 0.5rem 1rem;
                    border-radius: 99px;
                    color: #64748b;
                    font-weight: 500;
                    margin-bottom: 2rem;
                    transition: all 0.2s;
                    cursor: pointer;
                }
                .btn-back:hover {
                    color: var(--brand-primary);
                    border-color: var(--brand-primary);
                    transform: translateX(-5px);
                }

                /* Hero Section */
                .chapter-hero {
                    position: relative;
                    background: linear-gradient(135deg, var(--brand-primary) 0%, var(--color-deep-purple) 100%);
                    color: white;
                    padding: 3rem;
                    border-radius: 20px;
                    margin-bottom: 2rem;
                    overflow: hidden;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                }
                .hero-content {
                    position: relative;
                    z-index: 10;
                    max-width: 70%;
                }
                .chapter-badge {
                    display: inline-block;
                    background: rgba(255, 255, 255, 0.2);
                    backdrop-filter: blur(5px);
                    padding: 0.25rem 0.75rem;
                    border-radius: 99px;
                    font-size: 0.8rem;
                    font-weight: 700;
                    margin-bottom: 1rem;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                .chapter-title {
                    font-size: 2.5rem;
                    font-weight: 800;
                    line-height: 1.1;
                    margin-bottom: 1rem;
                }
                .chapter-desc {
                    font-size: 1.1rem;
                    opacity: 0.9;
                    line-height: 1.6;
                }
                .hero-decoration {
                    position: absolute;
                    right: -20px;
                    bottom: -30px;
                    color: rgba(255, 255, 255, 0.1);
                    transform: rotate(-15deg);
                }
                .hero-decoration svg {
                    animation: float 6s ease-in-out infinite;
                }

                /* Markdown Content */
                .markdown-content {
                    background: white;
                    padding: 3rem;
                    border-radius: 20px;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
                    margin-bottom: 2rem;
                    position: relative;
                }
                .md-h1, .md-h2, .md-h3 {
                    color: #1e293b;
                    font-weight: 800;
                    margin-top: 2rem;
                    margin-bottom: 1rem;
                    letter-spacing: -0.02em;
                }
                .md-h2 {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    font-size: 1.8rem;
                    border-bottom: 2px solid #f1f5f9;
                    padding-bottom: 0.5rem;
                    color: var(--brand-primary);
                }
                .md-p {
                    font-size: 1.1rem;
                    line-height: 1.8;
                    color: #475569;
                    margin-bottom: 1.5rem;
                }
                .md-ul {
                    list-style: none;
                    margin: 0 0 2rem 0;
                    padding: 0;
                }
                .md-li {
                    display: flex;
                    align-items: flex-start;
                    gap: 0.75rem;
                    margin-bottom: 0.75rem;
                    color: #334155;
                    font-size: 1.05rem;
                    background: #f8fafc;
                    padding: 1rem;
                    border-radius: 12px;
                    transition: all 0.2s;
                    border: 1px solid transparent;
                }
                .md-li:hover {
                    background: #f1f5f9;
                    transform: translateX(5px);
                    border-color: #e2e8f0;
                }
                .li-icon {
                    color: var(--brand-primary);
                    margin-top: 4px;
                    flex-shrink: 0;
                }
                .md-quote {
                    background: #fffbeb;
                    border-left: 4px solid #f59e0b;
                    padding: 1.5rem;
                    margin: 2rem 0;
                    border-radius: 0 12px 12px 0;
                    display: flex;
                    gap: 1rem;
                }
                .quote-icon {
                    color: #f59e0b;
                    flex-shrink: 0;
                }
                .quote-content {
                    font-style: italic;
                    color: #78350f;
                    font-weight: 500;
                }

                /* Code Styling */
                .inline-code {
                    background: var(--color-lavender);
                    color: var(--color-deep-purple);
                    padding: 0.2rem 0.4rem;
                    border-radius: 4px;
                    font-family: 'Courier New', monospace;
                    font-size: 0.9em;
                    font-weight: 600;
                }

                .code-block {
                    display: block;
                    background: #1e293b;
                    color: #e2e8f0;
                    padding: 1.5rem;
                    border-radius: 12px;
                    font-family: 'Courier New', monospace;
                    font-size: 0.95rem;
                    line-height: 1.6;
                    overflow-x: auto;
                    margin: 1.5rem 0;
                    border-left: 4px solid var(--brand-primary);
                }

                .highlight-text {
                    background: linear-gradient(90deg, transparent 0%, var(--color-lavender) 50%, transparent 100%);
                    background-size: 200% 100%;
                    padding: 0 0.25rem;
                    font-weight: 700;
                    color: var(--color-deep-purple);
                }

                .emphasis-text {
                    color: var(--brand-primary);
                    font-style: italic;
                    font-weight: 600;
                }

                /* Action Bar */
                .action-bar {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: white;
                    padding: 1.5rem 2rem;
                    border-radius: 16px;
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
                    border: 1px solid #e2e8f0;
                }
                .completion-status {
                    color: #64748b;
                    font-size: 0.9rem;
                    font-weight: 500;
                }
                .btn-lg {
                    padding: 0.75rem 2rem;
                    font-size: 1.1rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                /* Animation Classes */
                .fade-in { animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .fade-in-up { animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .slide-in-left { animation: slideInLeft 0.5s ease-out forwards; opacity: 0; }
                .slide-in-right { animation: slideInRight 0.5s ease-out forwards; opacity: 0; }
                .scale-in { animation: scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; opacity: 0; }
                .pop-in { animation: popIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
                .shake { animation: shake 0.5s ease-in-out; }
                .slide-up-reveal { animation: fadeInUp 0.8s ease-out forwards; opacity: 0; animation-delay: 0.5s; }
                
                .delay-100 { animation-delay: 100ms; }
                .delay-200 { animation-delay: 200ms; }
                .delay-300 { animation-delay: 300ms; }

                /* Loading */
                .loading-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 50vh;
                    color: #64748b;
                }
                .loader {
                    width: 40px;
                    height: 40px;
                    border: 3px solid #e2e8f0;
                    border-top-color: var(--brand-primary);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin-bottom: 1rem;
                }

                /* Exam Views - Simplified for brevity but matches theme */
                .exam-header {
                    text-align: center;
                    margin-bottom: 2rem;
                }
                .question-block {
                    background: white;
                    padding: 1.5rem;
                    border-radius: 12px;
                    border: 1px solid #e2e8f0;
                    margin-bottom: 1.5rem;
                    display: flex;
                    gap: 1.5rem;
                    transition: transform 0.2s;
                }
                .question-block:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
                }
                .question-number {
                    width: 40px;
                    height: 40px;
                    background: var(--color-lavender);
                    color: var(--brand-primary);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 700;
                    flex-shrink: 0;
                }
                .question-content {
                    flex-grow: 1;
                }
                .question-text {
                    font-size: 1.1rem;
                    font-weight: 600;
                    color: #1e293b;
                    margin-bottom: 1rem;
                }
                .option-item {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    padding: 0.75rem 1rem;
                    border: 2px solid #e2e8f0;
                    border-radius: 8px;
                    cursor: pointer;
                    margin-bottom: 0.5rem;
                    transition: all 0.2s;
                }
                .option-item:hover {
                    border-color: #cbd5e1;
                    background: #f8fafc;
                }
                .option-item.selected {
                    border-color: var(--brand-primary);
                    background: var(--color-lavender);
                    color: var(--brand-primary);
                    font-weight: 600;
                }
                .option-item input { display: none; }
                .radio-indicator {
                    width: 20px;
                    height: 20px;
                    border: 2px solid currentColor;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .radio-dot {
                    width: 10px;
                    height: 10px;
                    background: currentColor;
                    border-radius: 50%;
                }
                
                /* Results Chart */
                .score-ring {
                    width: 150px;
                    height: 150px;
                    margin: 0 auto 2rem;
                    position: relative;
                }
                .circular-chart {
                    display: block;
                    margin: 0 auto;
                    max-width: 100%;
                    max-height: 250px;
                }
                .circle-bg {
                    fill: none;
                    stroke: #e2e8f0;
                    stroke-width: 2.5;
                }
                .circle {
                    fill: none;
                    stroke-width: 2.5;
                    stroke-linecap: round;
                    animation: progress 1s ease-out forwards;
                }
                .score-ring.success .circle { stroke: #10b981; }
                .score-ring.failure .circle { stroke: #ef4444; }
                .percentage-text {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    font-size: 2.5rem;
                    font-weight: 800;
                    color: #1e293b;
                }

            `}</style>
        </div>
    );
};

export default ChapterView;
