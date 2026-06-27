import React, { useState } from 'react';
import { Play, RotateCcw, CheckCircle, XCircle, Zap, Info } from 'lucide-react';

const DFAVisualizer = () => {
    const [pattern, setPattern] = useState('ab*c');
    const [testString, setTestString] = useState('abc');
    const [currentState, setCurrentState] = useState(null);
    const [isRunning, setIsRunning] = useState(false);
    const [result, setResult] = useState(null);
    const [stateHistory, setStateHistory] = useState([]);

    // Simple DFA states for pattern 'ab*c'
    const dfaStates = {
        'ab*c': {
            states: ['q0', 'q1', 'q2', 'q3'],
            startState: 'q0',
            acceptStates: ['q3'],
            transitions: {
                'q0': { 'a': 'q1' },
                'q1': { 'b': 'q2' },
                'q2': { 'b': 'q2', 'c': 'q3' },
                'q3': {}
            },
            positions: {
                'q0': { x: 50, y: 150 },
                'q1': { x: 200, y: 150 },
                'q2': { x: 350, y: 150 },
                'q3': { x: 500, y: 150 }
            }
        },
        'a+': {
            states: ['q0', 'q1'],
            startState: 'q0',
            acceptStates: ['q1'],
            transitions: {
                'q0': { 'a': 'q1' },
                'q1': { 'a': 'q1' }
            },
            positions: {
                'q0': { x: 150, y: 150 },
                'q1': { x: 400, y: 150 }
            }
        },
        '(a|b)*': {
            states: ['q0'],
            startState: 'q0',
            acceptStates: ['q0'],
            transitions: {
                'q0': { 'a': 'q0', 'b': 'q0' }
            },
            positions: {
                'q0': { x: 275, y: 150 }
            }
        }
    };

    const getCurrentDFA = () => {
        return dfaStates[pattern] || dfaStates['ab*c'];
    };

    const simulateString = async () => {
        const dfa = getCurrentDFA();
        let state = dfa.startState;
        const history = [state];

        setIsRunning(true);
        setCurrentState(state);
        setStateHistory([state]);
        setResult(null);

        for (let i = 0; i < testString.length; i++) {
            await new Promise(resolve => setTimeout(resolve, 600));

            const char = testString[i];
            const nextState = dfa.transitions[state]?.[char];

            if (!nextState) {
                setResult({ accepted: false, reason: `No transition for '${char}' from ${state}` });
                setIsRunning(false);
                return;
            }

            state = nextState;
            history.push(state);
            setCurrentState(state);
            setStateHistory([...history]);
        }

        const accepted = dfa.acceptStates.includes(state);
        setResult({ accepted, reason: accepted ? 'String accepted!' : 'Not in accept state' });
        setIsRunning(false);
    };

    const reset = () => {
        setCurrentState(null);
        setResult(null);
        setStateHistory([]);
        setIsRunning(false);
    };

    const dfa = getCurrentDFA();

    return (
        <div className="dfa-visualizer card">
            <div className="dfa-header">
                <h3 className="dfa-title">
                    <Zap size={20} className="pulse-glow" /> DFA Visualizer
                </h3>
                <p className="dfa-subtitle">
                    Visualize how Deterministic Finite Automata process strings
                </p>
            </div>

            {/* Controls */}
            <div className="dfa-controls">
                <div className="control-group">
                    <label>Pattern</label>
                    <select
                        value={pattern}
                        onChange={(e) => { setPattern(e.target.value); reset(); }}
                        disabled={isRunning}
                        className="pattern-select"
                    >
                        <option value="ab*c">ab*c (a, then any b's, then c)</option>
                        <option value="a+">a+ (one or more a's)</option>
                        <option value="(a|b)*">(a|b)* (any a's or b's)</option>
                    </select>
                </div>

                <div className="control-group">
                    <label>Test String</label>
                    <input
                        type="text"
                        value={testString}
                        onChange={(e) => setTestString(e.target.value)}
                        disabled={isRunning}
                        placeholder="Enter string to test"
                        className="test-input"
                    />
                </div>

                <div className="control-actions">
                    <button
                        onClick={simulateString}
                        disabled={isRunning || !testString}
                        className="btn-primary"
                    >
                        <Play size={18} /> Simulate
                    </button>
                    <button onClick={reset} className="btn-secondary">
                        <RotateCcw size={18} /> Reset
                    </button>
                </div>
            </div>

            {/* DFA Visualization */}
            <div className="dfa-canvas">
                <svg width="600" height="300" className="dfa-svg">
                    {/* Draw transitions */}
                    {Object.entries(dfa.transitions).map(([fromState, transitions]) =>
                        Object.entries(transitions).map(([symbol, toState]) => {
                            const from = dfa.positions[fromState];
                            const to = dfa.positions[toState];

                            // Self-loop
                            if (fromState === toState) {
                                return (
                                    <g key={`${fromState}-${symbol}`}>
                                        <path
                                            d={`M ${from.x + 30} ${from.y - 40} Q ${from.x + 60} ${from.y - 70} ${from.x + 30} ${from.y - 40}`}
                                            fill="none"
                                            stroke={currentState === fromState ? '#7c3aed' : '#cbd5e1'}
                                            strokeWidth="2"
                                            markerEnd="url(#arrowhead)"
                                        />
                                        <text x={from.x + 50} y={from.y - 60} className="transition-label">
                                            {symbol}
                                        </text>
                                    </g>
                                );
                            }

                            return (
                                <g key={`${fromState}-${symbol}-${toState}`}>
                                    <line
                                        x1={from.x + 40}
                                        y1={from.y}
                                        x2={to.x - 40}
                                        y2={to.y}
                                        stroke={stateHistory.includes(fromState) && stateHistory.includes(toState) ? '#7c3aed' : '#cbd5e1'}
                                        strokeWidth="2"
                                        markerEnd="url(#arrowhead)"
                                    />
                                    <text
                                        x={(from.x + to.x) / 2}
                                        y={(from.y + to.y) / 2 - 10}
                                        className="transition-label"
                                    >
                                        {symbol}
                                    </text>
                                </g>
                            );
                        })
                    )}

                    {/* Arrow marker */}
                    <defs>
                        <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                            <polygon points="0 0, 10 3, 0 6" fill="#7c3aed" />
                        </marker>
                    </defs>

                    {/* Draw states */}
                    {dfa.states.map(state => {
                        const pos = dfa.positions[state];
                        const isStart = state === dfa.startState;
                        const isAccept = dfa.acceptStates.includes(state);
                        const isCurrent = state === currentState;

                        return (
                            <g key={state}>
                                {isStart && (
                                    <line x1={pos.x - 60} y1={pos.y} x2={pos.x - 40} y2={pos.y} stroke="#64748b" strokeWidth="2" markerEnd="url(#arrowhead)" />
                                )}
                                <circle
                                    cx={pos.x}
                                    cy={pos.y}
                                    r="35"
                                    fill={isCurrent ? '#ede9fe' : 'white'}
                                    stroke={isCurrent ? '#7c3aed' : '#cbd5e1'}
                                    strokeWidth={isCurrent ? '4' : '2'}
                                    className={isCurrent ? 'pulse-glow' : ''}
                                />
                                {isAccept && (
                                    <circle
                                        cx={pos.x}
                                        cy={pos.y}
                                        r="30"
                                        fill="none"
                                        stroke={isCurrent ? '#7c3aed' : '#cbd5e1'}
                                        strokeWidth="2"
                                    />
                                )}
                                <text
                                    x={pos.x}
                                    y={pos.y + 5}
                                    textAnchor="middle"
                                    className="state-label"
                                    fill={isCurrent ? '#7c3aed' : '#1e293b'}
                                >
                                    {state}
                                </text>
                            </g>
                        );
                    })}
                </svg>
            </div>

            {/* Result */}
            {result && (
                <div className={`result-panel ${result.accepted ? 'accepted' : 'rejected'}`}>
                    {result.accepted ? (
                        <CheckCircle size={24} className="result-icon" />
                    ) : (
                        <XCircle size={24} className="result-icon" />
                    )}
                    <div className="result-text">
                        <strong>{result.accepted ? 'Accepted' : 'Rejected'}</strong>
                        <p>{result.reason}</p>
                    </div>
                </div>
            )}

            <div className="info-panel">
                <Info size={16} />
                <span>States are highlighted as the automaton processes your input string.</span>
            </div>

            <style>{`
                .dfa-visualizer {
                    border-top: 4px solid var(--brand-primary);
                }

                .dfa-header {
                    margin-bottom: 1.5rem;
                }

                .dfa-title {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    color: var(--brand-primary);
                    font-size: 1.5rem;
                    margin-bottom: 0.5rem;
                }

                .dfa-subtitle {
                    color: var(--text-secondary);
                    font-size: 0.95rem;
                }

                .dfa-controls {
                    display: grid;
                    grid-template-columns: 1fr 1fr auto;
                    gap: 1rem;
                    margin-bottom: 2rem;
                }

                .control-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .control-group label {
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: var(--text-primary);
                }

                .pattern-select,
                .test-input {
                    padding: 0.75rem;
                    border: 2px solid #e2e8f0;
                    border-radius: 8px;
                    font-size: 0.95rem;
                    transition: all 0.2s;
                }

                .pattern-select:focus,
                .test-input:focus {
                    border-color: var(--brand-primary);
                    outline: none;
                    box-shadow: 0 0 0 3px var(--color-lavender);
                }

                .control-actions {
                    display: flex;
                    gap: 0.5rem;
                    align-items: flex-end;
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

                .dfa-canvas {
                    background: #f8fafc;
                    border-radius: 12px;
                    padding: 2rem;
                    margin-bottom: 1.5rem;
                    overflow-x: auto;
                }

                .dfa-svg {
                    display: block;
                    margin: 0 auto;
                }

                .state-label {
                    font-size: 1rem;
                    font-weight: 700;
                    font-family: monospace;
                }

                .transition-label {
                    font-size: 0.875rem;
                    font-weight: 600;
                    fill: var(--brand-primary);
                    font-family: monospace;
                }

                .result-panel {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    padding: 1.25rem;
                    border-radius: 12px;
                    margin-bottom: 1rem;
                    animation: scaleUp 0.3s ease-out;
                }

                .result-panel.accepted {
                    background: #d1fae5;
                    border: 2px solid #10b981;
                    color: #065f46;
                }

                .result-panel.rejected {
                    background: #fee2e2;
                    border: 2px solid #ef4444;
                    color: #991b1b;
                }

                .result-icon {
                    flex-shrink: 0;
                }

                .result-text strong {
                    display: block;
                    font-size: 1.1rem;
                    margin-bottom: 0.25rem;
                }

                .result-text p {
                    margin: 0;
                    font-size: 0.9rem;
                }

                .info-panel {
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
                    .dfa-controls {
                        grid-template-columns: 1fr;
                    }

                    .control-actions {
                        flex-direction: column;
                        align-items: stretch;
                    }
                }
            `}</style>
        </div>
    );
};

export default DFAVisualizer;
