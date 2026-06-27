import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipForward, RotateCcw, ArrowRight, ArrowLeft } from 'lucide-react';

const TuringMachineTape = () => {
    const [tape, setTape] = useState(['B', '1', '1', '0', '1', '0', 'B', 'B', 'B', 'B']);
    const [headPos, setHeadPos] = useState(1);
    const [state, setState] = useState('q0');
    const [isRunning, setIsRunning] = useState(false);
    const [speed, setSpeed] = useState(1000);

    // Simple program: Flip bits (0->1, 1->0) and move right
    const program = {
        'q0': {
            '0': { write: '1', move: 'R', next: 'q0' },
            '1': { write: '0', move: 'R', next: 'q0' },
            'B': { write: 'B', move: 'L', next: 'halt' },
        }
    };

    const step = () => {
        if (state === 'halt') {
            setIsRunning(false);
            return;
        }

        const symbol = tape[headPos] || 'B';
        const transition = program[state]?.[symbol];

        if (transition) {
            // Write
            const newTape = [...tape];
            newTape[headPos] = transition.write;
            setTape(newTape);

            // Move
            let newHeadPos = headPos + (transition.move === 'R' ? 1 : -1);

            // Expand tape if needed
            if (newHeadPos < 0) {
                newTape.unshift('B');
                newHeadPos = 0;
                setTape(['B', ...tape]);
            } else if (newHeadPos >= tape.length) {
                setTape([...newTape, 'B']);
            }

            setHeadPos(newHeadPos);
            setState(transition.next);
        } else {
            setIsRunning(false); // No transition defined = halt/crash
        }
    };

    useEffect(() => {
        let interval;
        if (isRunning) {
            interval = setInterval(step, speed);
        }
        return () => clearInterval(interval);
    }, [isRunning, tape, headPos, state, speed]);

    const reset = () => {
        setTape(['B', '1', '1', '0', '1', '0', 'B', 'B', 'B', 'B']);
        setHeadPos(1);
        setState('q0');
        setIsRunning(false);
    };

    return (
        <div className="tm-container card">
            <h3 className="tm-title">
                <RotateCcw size={20} className="spin-on-hover" /> Turing Machine Simulator
            </h3>
            <p className="tm-desc">
                Current State: <span className="badge">{state}</span> |
                Program: <span className="code-text">Bit Flipper</span>
            </p>

            <div className="tape-window">
                <div className="tape-track" style={{ transform: `translateX(calc(50% - ${headPos * 50 + 25}px))` }}>
                    {tape.map((cell, index) => (
                        <div key={index} className={`tape-cell ${index === headPos ? 'active' : ''}`}>
                            {cell}
                        </div>
                    ))}
                </div>
                <div className="tape-head-marker">
                    <div className="marker-arrow"></div>
                    <div className="marker-label">HEAD</div>
                </div>
            </div>

            <div className="tm-controls">
                <button onClick={() => setIsRunning(!isRunning)} className="btn-icon">
                    {isRunning ? <Pause size={20} /> : <Play size={20} />}
                    {isRunning ? 'Pause' : 'Run'}
                </button>
                <button onClick={step} className="btn-icon" disabled={isRunning || state === 'halt'}>
                    <SkipForward size={20} /> Step
                </button>
                <button onClick={reset} className="btn-icon">
                    <RotateCcw size={20} /> Reset
                </button>
            </div>

            <div className="program-display">
                <h4>Program Rules (Transition Function)</h4>
                <div className="rule-grid">
                    <div className="rule-header">State</div>
                    <div className="rule-header">Read</div>
                    <div className="rule-header">Write</div>
                    <div className="rule-header">Move</div>
                    <div className="rule-header">Next</div>

                    {/* Render program rules */}
                    <div className="rule-row">q0</div>
                    <div className="rule-row">0</div>
                    <div className="rule-row">1</div>
                    <div className="rule-row">R</div>
                    <div className="rule-row">q0</div>

                    <div className="rule-row">q0</div>
                    <div className="rule-row">1</div>
                    <div className="rule-row">0</div>
                    <div className="rule-row">R</div>
                    <div className="rule-row">q0</div>

                    <div className="rule-row">q0</div>
                    <div className="rule-row">B</div>
                    <div className="rule-row">B</div>
                    <div className="rule-row">L</div>
                    <div className="rule-row">halt</div>
                </div>
            </div>

            <style>{`
                .tm-container {
                    border-top: 4px solid var(--brand-accent);
                    background: linear-gradient(to bottom, #fff, #f8fafc);
                }
                .tm-title {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    color: var(--brand-primary);
                }
                .tm-desc {
                    color: var(--text-secondary);
                    margin-bottom: 1.5rem;
                }
                .badge {
                    background: var(--color-light-purple);
                    color: white;
                    padding: 0.1rem 0.5rem;
                    border-radius: 4px;
                    font-family: monospace;
                }
                .code-text {
                    font-family: monospace;
                    font-weight: 600;
                    color: var(--color-deep-purple);
                }

                /* Tape Visualization */
                .tape-window {
                    position: relative;
                    height: 100px;
                    background: #e2e8f0;
                    border-radius: 8px;
                    overflow: hidden;
                    margin-bottom: 1.5rem;
                    box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
                    display: flex;
                    align-items: center;
                }
                .tape-track {
                    display: flex;
                    transition: transform 0.3s cubic-bezier(0.25, 1, 0.5, 1);
                    position: absolute;
                    left: 0;
                }
                .tape-cell {
                    width: 50px;
                    height: 50px;
                    background: white;
                    border: 1px solid #cbd5e1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-family: monospace;
                    font-size: 1.2rem;
                    font-weight: 700;
                    flex-shrink: 0;
                    color: #475569;
                }
                .tape-cell.active {
                    background: #f0f9ff;
                    color: var(--brand-primary);
                    box-shadow: inset 0 0 0 2px var(--brand-primary);
                    z-index: 1;
                }
                .tape-head-marker {
                    position: absolute;
                    bottom: 0;
                    left: 50%;
                    transform: translateX(-50%);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    z-index: 2;
                }
                .marker-arrow {
                    width: 0;
                    height: 0;
                    border-left: 10px solid transparent;
                    border-right: 10px solid transparent;
                    border-bottom: 15px solid var(--brand-dark);
                }
                .marker-label {
                    background: var(--brand-dark);
                    color: white;
                    font-size: 0.7rem;
                    padding: 2px 6px;
                    border-radius: 4px;
                    margin-top: -2px;
                    font-weight: 700;
                }

                .tm-controls {
                    display: flex;
                    gap: 1rem;
                    justify-content: center;
                    margin-bottom: 1.5rem;
                }
                .btn-icon {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem 1rem;
                    background: white;
                    border: 1px solid #cbd5e1;
                    border-radius: 8px;
                    font-weight: 600;
                    color: #475569;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .btn-icon:hover:not(:disabled) {
                    background: var(--color-slate-100);
                    color: var(--brand-primary);
                    border-color: var(--brand-primary);
                }
                .btn-icon:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .program-display {
                    background: white;
                    padding: 1rem;
                    border-radius: 8px;
                    border: 1px solid #e2e8f0;
                }
                .program-display h4 {
                    font-size: 0.9rem;
                    color: var(--text-secondary);
                    margin-bottom: 0.5rem;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .rule-grid {
                    display: grid;
                    grid-template-columns: repeat(5, 1fr);
                    gap: 0.5rem;
                    text-align: center;
                    font-size: 0.9rem;
                }
                .rule-header {
                    font-weight: 700;
                    color: var(--brand-primary);
                    border-bottom: 1px solid #e2e8f0;
                    padding-bottom: 0.25rem;
                }
                .rule-row {
                    font-family: monospace;
                    padding: 0.25rem;
                }
                
                .spin-on-hover:hover {
                    animation: spin 1s linear infinite;
                }
            `}</style>
        </div>
    );
};

export default TuringMachineTape;
