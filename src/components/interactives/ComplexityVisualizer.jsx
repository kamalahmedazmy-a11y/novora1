import React, { useState, useEffect } from 'react';
import { Play, RotateCcw, CheckCircle, Info, Zap } from 'lucide-react';
import BinarySearchVisualizer from './BinarySearchVisualizer';
import SubsetSumVisualizer from './SubsetSumVisualizer';
import TSPVisualizer from './TSPVisualizer';

const ComplexityVisualizer = () => {
    const [isAnimating, setIsAnimating] = useState(false);
    const [completedWaves, setCompletedWaves] = useState({
        p: false,
        np: false,
        npHard: false
    });
    const [hoveredWave, setHoveredWave] = useState(null);

    const waves = [
        {
            id: 'p',
            label: 'P',
            color: '#10b981',
            duration: 2,
            tooltip: 'Polynomial time (efficiently solvable)',
            description: 'Problems solvable in polynomial time'
        },
        {
            id: 'np',
            label: 'NP',
            color: '#7c3aed',
            duration: 4,
            tooltip: 'Polynomial-time verification',
            description: 'Solutions verifiable in polynomial time'
        },
        {
            id: 'npHard',
            label: 'NP-Hard',
            color: '#ef4444',
            duration: 6,
            tooltip: 'At least as hard as NP problems',
            description: 'No known polynomial-time solution'
        }
    ];

    const startAnimation = () => {
        setIsAnimating(true);
        setCompletedWaves({ p: false, np: false, npHard: false });

        // Set completion times for each wave
        waves.forEach(wave => {
            setTimeout(() => {
                setCompletedWaves(prev => ({ ...prev, [wave.id]: true }));
            }, wave.duration * 1000);
        });

        // Stop animation after longest wave completes
        setTimeout(() => {
            setIsAnimating(false);
        }, 6000);
    };

    const reset = () => {
        setIsAnimating(false);
        setCompletedWaves({ p: false, np: false, npHard: false });
    };

    return (
        <div className="complexity-visualizer card">
            <div className="complexity-header">
                <h3 className="complexity-title">
                    <Zap size={20} className="pulse-glow" /> Complexity Class Speed Comparison
                </h3>
                <p className="complexity-subtitle">
                    Watch how different complexity classes solve problems at different speeds
                </p>
            </div>

            {/* Controls */}
            <div className="complexity-controls">
                <button
                    onClick={startAnimation}
                    disabled={isAnimating}
                    className="btn-primary"
                >
                    <Play size={18} /> Start Animation
                </button>
                <button onClick={reset} className="btn-secondary">
                    <RotateCcw size={18} /> Reset
                </button>
            </div>

            {/* Visualization Area */}
            <div className="problem-space">
                <div className="space-label">Problem Space</div>

                {waves.map((wave, index) => (
                    <div
                        key={wave.id}
                        className="wave-track"
                        onMouseEnter={() => setHoveredWave(wave.id)}
                        onMouseLeave={() => setHoveredWave(null)}
                    >
                        <div className="wave-info">
                            <span className="wave-label" style={{ color: wave.color }}>
                                {wave.label}
                            </span>
                            {hoveredWave === wave.id && (
                                <div className="wave-tooltip">
                                    <strong>{wave.tooltip}</strong>
                                    <p>{wave.description}</p>
                                </div>
                            )}
                        </div>

                        <div className="wave-container">
                            <div
                                className={`wave ${isAnimating ? 'animating' : ''}`}
                                style={{
                                    background: `linear-gradient(90deg, ${wave.color}, ${wave.color}dd)`,
                                    animationDuration: `${wave.duration}s`,
                                    boxShadow: `0 0 15px ${wave.color}66`
                                }}
                            />

                            {completedWaves[wave.id] && (
                                <div className="completion-indicator">
                                    <CheckCircle size={24} color={wave.color} />
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Legend */}
            <div className="complexity-legend">
                <Info size={16} />
                <span>Hover over each complexity class to learn more. All waves start simultaneously.</span>
            </div>

            {/* Algorithm Demonstrations */}
            <div className="algorithm-demos">
                <h3 className="demos-title">Algorithm Demonstrations</h3>
                <p className="demos-subtitle">
                    See how each complexity class solves real problems step-by-step
                </p>

                {/* P Class - Binary Search */}
                <section className="algo-section">
                    <div className="section-header p-header">
                        <h4>P Class: Binary Search</h4>
                        <span className="complexity-badge p-badge">O(log n)</span>
                    </div>
                    <BinarySearchVisualizer />
                </section>

                {/* NP Class - Subset Sum */}
                <section className="algo-section">
                    <div className="section-header np-header">
                        <h4>NP Class: Subset Sum</h4>
                        <span className="complexity-badge np-badge">O(2^n)</span>
                    </div>
                    <SubsetSumVisualizer />
                </section>

                {/* NP-Hard - Traveling Salesman */}
                <section className="algo-section">
                    <div className="section-header nphard-header">
                        <h4>NP-Hard: Traveling Salesman Problem</h4>
                        <span className="complexity-badge nphard-badge">O(n!)</span>
                    </div>
                    <TSPVisualizer />
                </section>
            </div>

            <style>{`
                .complexity-visualizer {
                    border-top: 4px solid var(--brand-primary);
                }

                .complexity-header {
                    margin-bottom: 1.5rem;
                }

                .complexity-title {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    color: var(--brand-primary);
                    font-size: 1.5rem;
                    margin-bottom: 0.5rem;
                }

                .complexity-subtitle {
                    color: var(--text-secondary);
                    font-size: 0.95rem;
                }

                .complexity-controls {
                    display: flex;
                    gap: 0.75rem;
                    margin-bottom: 2rem;
                }

                .btn-primary,
                .btn-secondary {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.75rem 1.25rem;
                    border-radius: 8px;
                    font-weight: 600;
                    font-size: 0.95rem;
                    transition: all 0.2s;
                    white-space: nowrap;
                }

                .btn-primary {
                    background: var(--gradient-purple-1);
                    color: white;
                    border: none;
                }

                .btn-primary:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
                }

                .btn-primary:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .btn-secondary {
                    background: white;
                    color: var(--text-primary);
                    border: 2px solid #e2e8f0;
                }

                .btn-secondary:hover {
                    border-color: var(--brand-primary);
                    color: var(--brand-primary);
                }

                .problem-space {
                    background: linear-gradient(135deg, #f8fafc 0%, #f5f3ff 100%);
                    border: 2px solid #e2e8f0;
                    border-radius: 16px;
                    padding: 2rem;
                    margin-bottom: 1.5rem;
                    position: relative;
                    min-height: 300px;
                }

                .space-label {
                    position: absolute;
                    top: 1rem;
                    left: 50%;
                    transform: translateX(-50%);
                    font-size: 0.875rem;
                    font-weight: 700;
                    color: var(--text-secondary);
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }

                .wave-track {
                    margin-bottom: 2.5rem;
                    position: relative;
                }

                .wave-track:last-child {
                    margin-bottom: 0;
                }

                .wave-info {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    margin-bottom: 0.75rem;
                    position: relative;
                }

                .wave-label {
                    font-size: 1.1rem;
                    font-weight: 700;
                    font-family: monospace;
                    min-width: 80px;
                }

                .wave-tooltip {
                    position: absolute;
                    left: 100px;
                    top: -10px;
                    background: white;
                    border: 2px solid var(--brand-primary);
                    border-radius: 8px;
                    padding: 0.75rem 1rem;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                    z-index: 10;
                    min-width: 250px;
                    animation: fadeIn 0.2s ease-out;
                }

                .wave-tooltip strong {
                    display: block;
                    color: var(--brand-primary);
                    margin-bottom: 0.25rem;
                    font-size: 0.95rem;
                }

                .wave-tooltip p {
                    margin: 0;
                    font-size: 0.875rem;
                    color: var(--text-secondary);
                }

                .wave-container {
                    position: relative;
                    height: 40px;
                    background: rgba(255, 255, 255, 0.5);
                    border-radius: 20px;
                    overflow: hidden;
                    border: 1px solid #e2e8f0;
                }

                .wave {
                    position: absolute;
                    left: 0;
                    top: 0;
                    height: 100%;
                    width: 60px;
                    border-radius: 20px;
                    transition: left 0.1s linear;
                }

                .wave.animating {
                    animation: moveWave linear forwards;
                }

                @keyframes moveWave {
                    from {
                        left: 0;
                    }
                    to {
                        left: calc(100% - 60px);
                    }
                }

                .completion-indicator {
                    position: absolute;
                    right: 10px;
                    top: 50%;
                    transform: translateY(-50%);
                    animation: popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                }

                @keyframes popIn {
                    0% {
                        transform: translateY(-50%) scale(0);
                        opacity: 0;
                    }
                    80% {
                        transform: translateY(-50%) scale(1.2);
                        opacity: 1;
                    }
                    100% {
                        transform: translateY(-50%) scale(1);
                        opacity: 1;
                    }
                }

                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(-5px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .complexity-legend {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.75rem 1rem;
                    background: #fffbeb;
                    border-left: 3px solid #f59e0b;
                    border-radius: 4px;
                    font-size: 0.875rem;
                    color: #92400e;
                }

                @media (max-width: 768px) {
                    .complexity-controls {
                        flex-direction: column;
                    }

                    .wave-tooltip {
                        left: 0;
                        top: 30px;
                    }

                    .problem-space {
                        padding: 1.5rem 1rem;
                    }
                }

                /* Algorithm Demonstrations Section */
                .algorithm-demos {
                    margin-top: 3rem;
                    padding-top: 2rem;
                    border-top: 2px solid #e2e8f0;
                }

                .demos-title {
                    font-size: 1.5rem;
                    color: var(--brand-primary);
                    margin-bottom: 0.5rem;
                }

                .demos-subtitle {
                    color: var(--text-secondary);
                    margin-bottom: 2rem;
                }

                .algo-section {
                    margin-bottom: 2.5rem;
                }

                .section-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1rem;
                    padding-bottom: 0.75rem;
                    border-bottom: 2px solid #e2e8f0;
                }

                .section-header h4 {
                    font-size: 1.25rem;
                    margin: 0;
                }

                .p-header h4 {
                    color: #10b981;
                }

                .np-header h4 {
                    color: #7c3aed;
                }

                .nphard-header h4 {
                    color: #ef4444;
                }

                .complexity-badge {
                    padding: 0.25rem 0.75rem;
                    border-radius: 6px;
                    font-size: 0.875rem;
                    font-weight: 700;
                    font-family: monospace;
                }

                .p-badge {
                    background: #d1fae5;
                    color: #065f46;
                }

                .np-badge {
                    background: #f5f3ff;
                    color: #6b21a8;
                }

                .nphard-badge {
                    background: #fee2e2;
                    color: #991b1b;
                }
            `}</style>
        </div>
    );
};

export default ComplexityVisualizer;
