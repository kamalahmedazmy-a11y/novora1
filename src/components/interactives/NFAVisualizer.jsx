import React, { useState } from 'react';
import { Play, RotateCcw, ChevronRight } from 'lucide-react';

const NFAVisualizer = () => {
    const [selectedPattern, setSelectedPattern] = useState('ab*');
    const [inputString, setInputString] = useState('');
    const [currentStates, setCurrentStates] = useState([0]);
    const [isSimulating, setIsSimulating] = useState(false);
    const [result, setResult] = useState(null);
    const [processedIndex, setProcessedIndex] = useState(-1);

    // NFA patterns with non-deterministic transitions
    const nfaPatterns = {
        'ab*': {
            name: 'ab* (a followed by zero or more b)',
            states: [
                { id: 0, x: 100, y: 150, isStart: true, isAccept: false },
                { id: 1, x: 250, y: 150, isStart: false, isAccept: true }
            ],
            transitions: [
                { from: 0, to: 1, symbol: 'a' },
                { from: 1, to: 1, symbol: 'b' },
                { from: 1, to: 1, symbol: 'ε' } // Epsilon transition
            ]
        },
        '(a|b)*': {
            name: '(a|b)* (zero or more a or b)',
            states: [
                { id: 0, x: 200, y: 150, isStart: true, isAccept: true }
            ],
            transitions: [
                { from: 0, to: 0, symbol: 'a' },
                { from: 0, to: 0, symbol: 'b' }
            ]
        },
        'a*b*': {
            name: 'a*b* (zero or more a, then zero or more b)',
            states: [
                { id: 0, x: 100, y: 150, isStart: true, isAccept: true },
                { id: 1, x: 250, y: 150, isStart: false, isAccept: true }
            ],
            transitions: [
                { from: 0, to: 0, symbol: 'a' },
                { from: 0, to: 1, symbol: 'b' },
                { from: 0, to: 1, symbol: 'ε' },
                { from: 1, to: 1, symbol: 'b' }
            ]
        }
    };

    const currentNFA = nfaPatterns[selectedPattern];

    const simulateNFA = async () => {
        setIsSimulating(true);
        setResult(null);
        let activeStates = [0]; // Start with initial state
        setCurrentStates(activeStates);

        for (let i = 0; i < inputString.length; i++) {
            setProcessedIndex(i);
            await new Promise(resolve => setTimeout(resolve, 800));

            const symbol = inputString[i];
            const nextStates = new Set();

            // Process each active state
            for (const state of activeStates) {
                // Find all transitions for this symbol
                const validTransitions = currentNFA.transitions.filter(
                    t => t.from === state && (t.symbol === symbol || t.symbol === 'ε')
                );

                validTransitions.forEach(t => nextStates.add(t.to));
            }

            activeStates = Array.from(nextStates);
            setCurrentStates(activeStates);

            if (activeStates.length === 0) {
                setResult('rejected');
                setIsSimulating(false);
                return;
            }
        }

        // Check if any final state is an accept state
        const accepted = activeStates.some(state =>
            currentNFA.states.find(s => s.id === state)?.isAccept
        );

        setResult(accepted ? 'accepted' : 'rejected');
        setIsSimulating(false);
    };

    const reset = () => {
        setCurrentStates([0]);
        setResult(null);
        setProcessedIndex(-1);
        setIsSimulating(false);
    };

    return (
        <div className="nfa-visualizer">
            <div className="visualizer-header">
                <h3>NFA Visualizer</h3>
                <p>Non-deterministic Finite Automaton with multiple active states</p>
            </div>

            <div className="controls">
                <div className="control-group">
                    <label>Select Pattern:</label>
                    <select
                        value={selectedPattern}
                        onChange={(e) => {
                            setSelectedPattern(e.target.value);
                            reset();
                        }}
                        disabled={isSimulating}
                    >
                        {Object.entries(nfaPatterns).map(([key, pattern]) => (
                            <option key={key} value={key}>{pattern.name}</option>
                        ))}
                    </select>
                </div>

                <div className="control-group">
                    <label>Input String:</label>
                    <input
                        type="text"
                        value={inputString}
                        onChange={(e) => setInputString(e.target.value)}
                        placeholder="Enter string (e.g., 'abb')"
                        disabled={isSimulating}
                    />
                </div>

                <div className="button-group">
                    <button
                        onClick={simulateNFA}
                        disabled={!inputString || isSimulating}
                        className="btn-simulate"
                    >
                        <Play size={18} /> Simulate
                    </button>
                    <button onClick={reset} className="btn-reset">
                        <RotateCcw size={18} /> Reset
                    </button>
                </div>
            </div>

            {result && (
                <div className={`result ${result}`}>
                    {result === 'accepted' ? '✓ String Accepted' : '✗ String Rejected'}
                    <p className="result-detail">
                        {result === 'accepted'
                            ? 'The string matches the pattern and ended in an accept state.'
                            : 'The string does not match the pattern or no valid path exists.'}
                    </p>
                </div>
            )}

            <div className="nfa-diagram">
                <svg width="400" height="300" viewBox="0 0 400 300">
                    {/* Transitions */}
                    {currentNFA.transitions.map((trans, idx) => {
                        const fromState = currentNFA.states.find(s => s.id === trans.from);
                        const toState = currentNFA.states.find(s => s.id === trans.to);

                        if (trans.from === trans.to) {
                            // Self-loop
                            return (
                                <g key={idx}>
                                    <path
                                        d={`M ${fromState.x + 20} ${fromState.y - 30} 
                                            Q ${fromState.x + 50} ${fromState.y - 60} 
                                            ${fromState.x + 20} ${fromState.y - 30}`}
                                        fill="none"
                                        stroke={currentStates.includes(trans.from) ? '#7c3aed' : '#94a3b8'}
                                        strokeWidth="2"
                                        markerEnd="url(#arrowhead)"
                                    />
                                    <text
                                        x={fromState.x + 50}
                                        y={fromState.y - 60}
                                        fill="#475569"
                                        fontSize="14"
                                        fontWeight="600"
                                    >
                                        {trans.symbol}
                                    </text>
                                </g>
                            );
                        }

                        return (
                            <g key={idx}>
                                <line
                                    x1={fromState.x + 30}
                                    y1={fromState.y}
                                    x2={toState.x - 30}
                                    y2={toState.y}
                                    stroke={currentStates.includes(trans.from) ? '#7c3aed' : '#94a3b8'}
                                    strokeWidth="2"
                                    markerEnd="url(#arrowhead)"
                                />
                                <text
                                    x={(fromState.x + toState.x) / 2}
                                    y={(fromState.y + toState.y) / 2 - 10}
                                    fill="#475569"
                                    fontSize="14"
                                    fontWeight="600"
                                >
                                    {trans.symbol}
                                </text>
                            </g>
                        );
                    })}

                    {/* Arrow marker */}
                    <defs>
                        <marker
                            id="arrowhead"
                            markerWidth="10"
                            markerHeight="10"
                            refX="9"
                            refY="3"
                            orient="auto"
                        >
                            <polygon points="0 0, 10 3, 0 6" fill="#7c3aed" />
                        </marker>
                    </defs>

                    {/* States */}
                    {currentNFA.states.map((state) => (
                        <g key={state.id}>
                            {/* Outer circle for accept states */}
                            {state.isAccept && (
                                <circle
                                    cx={state.x}
                                    cy={state.y}
                                    r="35"
                                    fill="none"
                                    stroke={currentStates.includes(state.id) ? '#7c3aed' : '#94a3b8'}
                                    strokeWidth="2"
                                />
                            )}
                            {/* Main state circle */}
                            <circle
                                cx={state.x}
                                cy={state.y}
                                r="30"
                                fill={currentStates.includes(state.id) ? '#e9d5ff' : 'white'}
                                stroke={currentStates.includes(state.id) ? '#7c3aed' : '#cbd5e1'}
                                strokeWidth="3"
                                className={currentStates.includes(state.id) ? 'active-state' : ''}
                            />
                            <text
                                x={state.x}
                                y={state.y + 5}
                                textAnchor="middle"
                                fill="#1e293b"
                                fontSize="18"
                                fontWeight="700"
                            >
                                q{state.id}
                            </text>
                            {/* Start arrow */}
                            {state.isStart && (
                                <line
                                    x1={state.x - 60}
                                    y1={state.y}
                                    x2={state.x - 35}
                                    y2={state.y}
                                    stroke="#7c3aed"
                                    strokeWidth="2"
                                    markerEnd="url(#arrowhead)"
                                />
                            )}
                        </g>
                    ))}
                </svg>

                <div className="active-states-info">
                    <strong>Active States:</strong> {currentStates.map(s => `q${s}`).join(', ')}
                </div>
            </div>

            <style>{`
                .nfa-visualizer {
                    background: white;
                    border-radius: 16px;
                    padding: 2rem;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
                    margin: 2rem 0;
                }

                .visualizer-header h3 {
                    font-size: 1.5rem;
                    color: var(--brand-primary);
                    margin-bottom: 0.5rem;
                }

                .visualizer-header p {
                    color: var(--text-secondary);
                    margin-bottom: 1.5rem;
                }

                .controls {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    margin-bottom: 2rem;
                }

                .control-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .control-group label {
                    font-weight: 600;
                    color: var(--text-primary);
                    font-size: 0.9rem;
                }

                .control-group select,
                .control-group input {
                    padding: 0.75rem;
                    border: 2px solid #e2e8f0;
                    border-radius: 8px;
                    font-size: 1rem;
                    transition: all 0.2s;
                }

                .control-group select:focus,
                .control-group input:focus {
                    border-color: var(--brand-primary);
                    outline: none;
                    box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
                }

                .button-group {
                    display: flex;
                    gap: 1rem;
                    margin-top: 0.5rem;
                }

                .btn-simulate,
                .btn-reset {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.75rem 1.5rem;
                    border-radius: 8px;
                    font-weight: 600;
                    transition: all 0.2s;
                }

                .btn-simulate {
                    background: var(--gradient-purple-1);
                    color: white;
                }

                .btn-simulate:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
                }

                .btn-simulate:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .btn-reset {
                    background: #f1f5f9;
                    color: var(--text-primary);
                }

                .btn-reset:hover {
                    background: #e2e8f0;
                }

                .result {
                    padding: 1rem 1.5rem;
                    border-radius: 12px;
                    margin-bottom: 1.5rem;
                    font-weight: 600;
                    font-size: 1.1rem;
                }

                .result.accepted {
                    background: #d1fae5;
                    color: #065f46;
                    border: 2px solid #10b981;
                }

                .result.rejected {
                    background: #fee2e2;
                    color: #991b1b;
                    border: 2px solid #ef4444;
                }

                .result-detail {
                    font-size: 0.9rem;
                    font-weight: 400;
                    margin-top: 0.5rem;
                    opacity: 0.9;
                }

                .nfa-diagram {
                    background: #f8fafc;
                    border-radius: 12px;
                    padding: 1.5rem;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }

                .nfa-diagram svg {
                    max-width: 100%;
                    height: auto;
                }

                .active-state {
                    animation: pulse-glow 1.5s ease-in-out infinite;
                }

                @keyframes pulse-glow {
                    0%, 100% {
                        filter: drop-shadow(0 0 8px rgba(124, 58, 237, 0.6));
                    }
                    50% {
                        filter: drop-shadow(0 0 16px rgba(124, 58, 237, 0.9));
                    }
                }

                .active-states-info {
                    margin-top: 1rem;
                    padding: 0.75rem 1.25rem;
                    background: white;
                    border-radius: 8px;
                    border: 2px solid var(--brand-primary);
                    color: var(--brand-primary);
                    font-weight: 600;
                }

                @media (max-width: 640px) {
                    .button-group {
                        flex-direction: column;
                    }

                    .nfa-diagram svg {
                        width: 100%;
                    }
                }
            `}</style>
        </div>
    );
};

export default NFAVisualizer;
