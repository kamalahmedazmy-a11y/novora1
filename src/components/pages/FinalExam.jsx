import { useNavigate } from 'react-router-dom';
import { useProgress } from '../../context/ProgressContext';
import { chapterContent } from '../../data/content';
import Navbar from '../layout/Navbar';
import { useState, useEffect } from 'react';
import { Award, ArrowLeft } from 'lucide-react';

export default function FinalExam() {
    const navigate = useNavigate();
    const { isFinalExamUnlocked } = useProgress();
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState({});
    const [score, setScore] = useState(null);
    const [showResults, setShowResults] = useState(false);

    // Gather all questions from all chapters
    const allQuestions = Object.values(chapterContent).flatMap(ch => ch.questions);

    useEffect(() => {
        if (!isFinalExamUnlocked()) {
            navigate('/');
        }
    }, [isFinalExamUnlocked, navigate]);

    const handleAnswer = (optionIndex) => {
        setAnswers({ ...answers, [currentQuestion]: optionIndex });
    };

    const calculateScore = () => {
        let correct = 0;
        allQuestions.forEach((q, idx) => {
            // Need to track question to correct answer mapping carefully if order persists
            // Ideally we would flatMap questions with their definitions.
            // Here q includes correctAnswer (index).
            if (answers[idx] === q.correctAnswer) correct++;
        });
        const finalScore = Math.round((correct / allQuestions.length) * 100);
        setScore(finalScore);
        setShowResults(true);
    };

    const nextQuestion = () => {
        if (currentQuestion < allQuestions.length - 1) {
            setCurrentQuestion(currentQuestion + 1);
        } else {
            calculateScore();
        }
    };

    return (
        <div className="app-layout">
            <Navbar />
            <div className="container main-content">
                {!showResults ? (
                    <div className="exam-container final-exam-mode">
                        <h2>Final Certification Exam</h2>
                        <div className="progress-bar-thin">
                            <div
                                className="fill"
                                style={{ width: `${((currentQuestion + 1) / allQuestions.length) * 100}%` }}
                            />
                        </div>

                        <div className="question-card">
                            <h3>Question {currentQuestion + 1} of {allQuestions.length}</h3>
                            <p className="question-text">{allQuestions[currentQuestion].text}</p>

                            <div className="options-grid">
                                {allQuestions[currentQuestion].options.map((opt, idx) => (
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
                            {currentQuestion === allQuestions.length - 1 ? 'Submit Final Exam' : 'Next Question'}
                        </button>
                    </div>
                ) : (
                    <div className="results-container certificate-view">
                        <Award size={64} className="certificate-icon" />
                        <h1>Certificate of Completion</h1>
                        <p>This certifies that the user has successfully completed the</p>
                        <h2>Theory of Computation Course</h2>
                        <div className="final-score">Final Score: {score}%</div>
                        <button onClick={() => navigate('/')} className="btn-primary mt-4">
                            Return to Dashboard
                        </button>
                    </div>
                )}
            </div>
        </div >
    );
}
