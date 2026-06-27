import React, { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw, SkipForward, CheckCircle, XCircle, Info, ArrowRight, Zap } from 'lucide-react';

const PDAVisualizer = () => {
    // PDA for L = {0^n 1^n | n >= 0}
    // States: q0 (start), q1 (pushing 0s), q2 (popping 0s for 1s), q3 (accept)
    const [inputString, setInputString] = useState('0011');
    const [stack, setStack] = useState(['Z']); // Z is bottom marker
    const [currentState, setCurrentState] = useState('q0');
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [simulationResult, setSimulationResult] = useState(null); // 'accepted', 'rejected'
    const [history, setHistory] = useState([]);
    const [message, setMessage] = useState('Ready to simulate. Enter a string of 0s and 1s.');

    const [mode, setMode] = useState('pda'); // 'pda' (0^n 1^n) or 'regex'
    const [regexInput, setRegexInput] = useState('(a|b)*abb');

    const speed = 1000; // ms per step

    // PDA Definition
    const pda = {
        states: ['q0', 'q1', 'q2', 'q3'],
        startState: 'q0',
        acceptStates: ['q3', 'q0'], // Empty string is accepted in q0
        transitions: {
            'q0': [
                { input: '0', pop: 'Z', push: ['0', 'Z'], next: 'q1' },
                { input: '', pop: 'Z', push: ['Z'], next: 'q3' } // Epsilon transition to accept empty
            ],
            'q1': [
                { input: '0', pop: '0', push: ['0', '0'], next: 'q1' }, // Stay in q1, push 0
                { input: '0', pop: 'Z', push: ['0', 'Z'], next: 'q1' }, // First 0 (if coming from q0 logic handled there, but generic)
                { input: '1', pop: '0', push: [], next: 'q2' } // First 1, pop 0, go to q2
            ],
            'q2': [
                { input: '1', pop: '0', push: [], next: 'q2' }, // Match 1s, pop 0s
                { input: '', pop: 'Z', push: ['Z'], next: 'q3' } // Stack empty (except Z), accept
            ]
        }
    };

    // Regex Test Logic
    const testRegex = () => {
        try {
            const regex = new RegExp(`^${regexInput}$`);
            if (regex.test(inputString)) {
                setSimulationResult('accepted');
                setMessage('String matches the Regular Expression!');
            } else {
                setSimulationResult('rejected');
                setMessage('String does not match the Regular Expression.');
            }
        } catch (e) {
            setSimulationResult('rejected');
            setMessage('Invalid Regular Expression syntax.');
        }
    };

    // Helper to find valid transition
    const findTransition = (state, char, topStack) => {
        // Special logic for this specific PDA structure to simplify simulation
        // The standard definition above is a bit complex to parse generically without a full engine.
        // We'll implement the logic directly for the 0^n 1^n visualization to ensure it's robust and educational.

        // q0: Start
        if (state === 'q0') {
            if (char === '0') return { action: 'push', next: 'q1', desc: 'Read 0, Push 0' };
            if (char === '' && topStack === 'Z') return { action: 'none', next: 'q3', desc: 'Empty input, Accept' };
        }

        // q1: Reading 0s
        if (state === 'q1') {
            if (char === '0') return { action: 'push', next: 'q1', desc: 'Read 0, Push 0' };
            if (char === '1') return { action: 'pop', next: 'q2', desc: 'Read 1, Pop 0' };
        }

        // q2: Reading 1s
        if (state === 'q2') {
            if (char === '1' && topStack === '0') return { action: 'pop', next: 'q2', desc: 'Read 1, Pop 0' };
            if (char === '' && topStack === 'Z') return { action: 'none', next: 'q3', desc: 'End of input, Stack empty (Z), Accept' };
        }

        return null; // Reject
    };

    const step = () => {
        if (simulationResult) return;

        const char = currentStep < inputString.length ? inputString[currentStep] : '';
        const topStack = stack[stack.length - 1];
        const result = findTransition(currentState, char, topStack);

        if (result) {
            // Apply transition
            const newHistory = [...history, {
                state: currentState,
                input: char || 'ε',
                stack: [...stack],
                action: result.desc
            }];
            setHistory(newHistory);

            setCurrentState(result.next);

            // Stack ops
            if (result.action === 'push') {
                setStack(prev => [...prev, '0']);
            } else if (result.action === 'pop') {
                setStack(prev => prev.slice(0, -1));
            }

            // Advance input if not epsilon transition
            if (char !== '') {
                setCurrentStep(prev => prev + 1);
            }

            setMessage(result.desc);

            // Check for immediate acceptance state if we just transitioned to it
            // Logic: if we hit q3, we accept.
            // Also need to handle the case where we just finished the string.

        } else {
            // No transition found -> Reject
            setIsPlaying(false);
            setSimulationResult('rejected');
            setMessage('No valid transition. String Rejected.');
        }
    };

    useEffect(() => {
        // Check for acceptance/rejection after state update
        if (currentState === 'q3') {
            setIsPlaying(false);
            setSimulationResult('accepted');
            setMessage('Reached Accept State (q3). String Accepted!');
        } else if (currentStep === inputString.length && !simulationResult && currentState !== 'q3') {
            // We finished input but aren't in q3. 
            // Need to check if there's an epsilon transition to q3 (handled in findTransition usually)
            // But for this simulation step logic, let's trigger one final "step" if needed or fail.
            // If we are in q0 or q2 and stack is Z, the next step should handle the epsilon transition.
        }
    }, [currentState, currentStep, inputString, simulationResult]);


    useEffect(() => {
        let interval;
        if (isPlaying && !simulationResult) {
            interval = setInterval(() => {
                // If we finished input, try one last epsilon transition
                if (currentStep > inputString.length) {
                    setIsPlaying(false);
                    return;
                }
                step();
            }, speed);
        }
        return () => clearInterval(interval);
    }, [isPlaying, simulationResult, currentStep, stack, currentState]);


    const reset = () => {
        setStack(['Z']);
        setCurrentState('q0');
        setCurrentStep(0);
        setIsPlaying(false);
        setSimulationResult(null);
        setHistory([]);
        setMessage('Ready to simulate.');
    };

    const handlePlay = () => {
        if (simulationResult) reset();

        if (mode === 'regex') {
            testRegex();
            return;
        }

        setIsPlaying(!isPlaying);
    };

    // Visualization Coordinates
    const statePos = {
        q0: { x: 100, y: 150 },
        q1: { x: 250, y: 150 },
        q2: { x: 400, y: 150 },
        q3: { x: 550, y: 150 }
    };

    return (
        <div className="pda-visualizer card">
            <div className="pda-header">
                <h3><Zap className="icon" /> Pushdown Automaton Visualization</h3>
                <p>Recognizes language L = {'{ 0^n 1^n | n ≥ 0 }'} (Equal zeros followed by equal ones)</p>
            </div>

            <div className="pda-controls">
                <div className="control-group">
                    <label>Mode:</label>
                    <select value={mode} onChange={(e) => { setMode(e.target.value); reset(); }} className="pda-select">
                        <option value="pda">Standard PDA (0ⁿ1ⁿ)</option>
                        <option value="regex">Regex Tester</option>
                    </select>
                </div>

                {mode === 'regex' && (
                    <div className="control-group">
                        <label>Regex:</label>
                        <input
                            type="text"
                            value={regexInput}
                            onChange={(e) => { setRegexInput(e.target.value); reset(); }}
                            placeholder="e.g. (a|b)*abb"
                            className="pda-input regex-input"
                        />
                    </div>
                )}

                <div className="control-group">
                    <label>Input:</label>
                    <input
                        type="text"
                        value={inputString}
                        onChange={(e) => {
                            // If in PDA mode, restrict to 0s and 1s. Regex mode allows any.
                            const val = mode === 'pda' ? e.target.value.replace(/[^01]/g, '') : e.target.value;
                            setInputString(val);
                            reset();
                        }}
                        placeholder={mode === 'pda' ? "Enter 0s and 1s" : "Enter test string"}
                        disabled={isPlaying || currentStep > 0}
                        className="pda-input"
                    />
                </div>

                <div className="button-group">
                    <button className="btn-primary" onClick={handlePlay}>
                        {isPlaying ? 'Pause' : <><Play size={16} /> {mode === 'regex' ? 'Check' : 'Run'}</>}
                    </button>
                    {mode === 'pda' && (
                        <button className="btn-secondary" onClick={step} disabled={isPlaying || simulationResult}>
                            <SkipForward size={16} /> Step
                        </button>
                    )}
                    <button className="btn-secondary" onClick={reset}>
                        <RotateCcw size={16} /> Reset
                    </button>
                </div>
            </div>

            <div className="simulation-area">
                {/* Graph Visualization */}
                <div className="graph-container">
                    <svg width="650" height="250" viewBox="0 0 650 250">
                        {/* Transitions */}
                        {/* q0 -> q1 */}
                        <path d="M 130 150 L 220 150" stroke="#cbd5e1" strokeWidth="2" markerEnd="url(#arrow)" />
                        <text x="175" y="140" textAnchor="middle" fontSize="12" fill="#64748b">0, Z → 0Z</text>

                        {/* q1 -> q1 Loop */}
                        <path d="M 250 120 C 220 50, 280 50, 250 120" stroke="#cbd5e1" strokeWidth="2" fill="none" markerEnd="url(#arrow)" />
                        <text x="250" y="60" textAnchor="middle" fontSize="12" fill="#64748b">0, 0 → 00</text>

                        {/* q1 -> q2 */}
                        <path d="M 280 150 L 370 150" stroke="#cbd5e1" strokeWidth="2" markerEnd="url(#arrow)" />
                        <text x="325" y="140" textAnchor="middle" fontSize="12" fill="#64748b">1, 0 → ε</text>

                        {/* q2 -> q2 Loop */}
                        <path d="M 400 120 C 370 50, 430 50, 400 120" stroke="#cbd5e1" strokeWidth="2" fill="none" markerEnd="url(#arrow)" />
                        <text x="400" y="60" textAnchor="middle" fontSize="12" fill="#64748b">1, 0 → ε</text>

                        {/* q2 -> q3 */}
                        <path d="M 430 150 L 520 150" stroke="#cbd5e1" strokeWidth="2" markerEnd="url(#arrow)" />
                        <text x="475" y="140" textAnchor="middle" fontSize="12" fill="#64748b">ε, Z → Z</text>

                        {/* q0 -> q3 (Epsilon for empty string) */}
                        <path d="M 100 180 Q 325 240 550 180" stroke="#cbd5e1" strokeWidth="2" fill="none" markerEnd="url(#arrow)" strokeDasharray="5,5" />
                        <text x="325" y="220" textAnchor="middle" fontSize="12" fill="#64748b">ε, Z → Z</text>

                        {/* Defs for arrow */}
                        <defs>
                            <marker id="arrow" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
                                <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
                            </marker>
                        </defs>

                        {/* States */}
                        {Object.entries(statePos).map(([id, pos]) => (
                            <g key={id}>
                                <circle
                                    cx={pos.x}
                                    cy={pos.y}
                                    r="30"
                                    fill={currentState === id ? '#ede9fe' : 'white'}
                                    stroke={currentState === id ? '#7c3aed' : '#94a3b8'}
                                    strokeWidth={currentState === id ? '3' : '2'}
                                />
                                {id === 'q3' && (
                                    <circle
                                        cx={pos.x}
                                        cy={pos.y}
                                        r="24"
                                        fill="none"
                                        stroke={currentState === id ? '#7c3aed' : '#94a3b8'}
                                        strokeWidth="1"
                                    />
                                )}
                                <text
                                    x={pos.x}
                                    y={pos.y + 5}
                                    textAnchor="middle"
                                    fontWeight="bold"
                                    fill={currentState === id ? '#7c3aed' : '#475569'}
                                >
                                    {id}
                                </text>
                            </g>
                        ))}
                    </svg>
                </div>

                {/* Status & Stack Panel */}
                <div className="status-panel">
                    <div className="tape-display">
                        <h4>Input Tape</h4>
                        <div className="tape-cells">
                            {inputString.split('').map((char, idx) => (
                                <div key={idx} className={`tape-cell ${idx === currentStep ? 'active' : ''} ${idx < currentStep ? 'processed' : ''}`}>
                                    {char}
                                </div>
                            ))}
                            <div className={`tape-cell ${currentStep === inputString.length ? 'active' : ''}`}>ε</div>
                        </div>
                    </div>

                    <div className="stack-display">
                        <h4>Stack</h4>
                        <div className="stack-container">
                            {stack.length === 0 ? (
                                <div className="empty-stack">Empty</div>
                            ) : (
                                [...stack].reverse().map((item, idx) => (
                                    <div key={idx} className="stack-item slide-in">
                                        {item}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className={`pda-footer ${simulationResult}`}>
                <div className="message">
                    <Info size={18} />
                    <span>{message}</span>
                </div>
                {simulationResult === 'accepted' && (
                    <div className="result-badge success">
                        <CheckCircle size={18} /> Accepted
                    </div>
                )}
                {simulationResult === 'rejected' && (
                    <div className="result-badge error">
                        <XCircle size={18} /> Rejected
                    </div>
                )}
            </div>

            <style>{`
                .pda-visualizer {
                    padding: 1.5rem;
                    background: white;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    margin-top: 2rem;
                }
                .pda-header {
                    margin-bottom: 1.5rem;
                }
                .pda-header h3 {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    color: var(--brand-primary);
                    margin-bottom: 0.25rem;
                }
                .pda-header p {
                    color: var(--text-secondary);
                    font-size: 0.9rem;
                }
                .pda-controls {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 1.5rem;
                    align-items: flex-end;
                    margin-bottom: 2rem;
                    padding-bottom: 1.5rem;
                    border-bottom: 1px solid #e2e8f0;
                }
                .control-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                .control-group label {
                    font-size: 0.85rem;
                    font-weight: 600;
                    color: var(--text-secondary);
                    text-transform: uppercase;
                }
                .pda-select, .pda-input {
                    padding: 0.5rem 1rem;
                    border: 1px solid #cbd5e1;
                    border-radius: 6px;
                    font-family: monospace;
                    font-size: 1rem;
                }
                .regex-input {
                    min-width: 200px;
                }
                .button-group {
                    display: flex;
                    gap: 0.5rem;
                }
                .simulation-area {
                    display: grid;
                    grid-template-columns: 2fr 1fr;
                    gap: 2rem;
                    margin-bottom: 1.5rem;
                }
                .graph-container {
                    background: #f8fafc;
                    border-radius: 8px;
                    border: 1px solid #e2e8f0;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 250px;
                }
                .status-panel {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }
                .tape-display h4, .stack-display h4 {
                    font-size: 0.9rem;
                    text-transform: uppercase;
                    color: var(--text-secondary);
                    margin-bottom: 0.5rem;
                    font-weight: 600;
                }
                .tape-cells {
                    display: flex;
                    gap: 4px;
                    overflow-x: auto;
                    padding-bottom: 4px;
                }
                .tape-cell {
                    width: 32px;
                    height: 32px;
                    border: 1px solid #cbd5e1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-family: monospace;
                    border-radius: 4px;
                    color: #64748b;
                }
                .tape-cell.active {
                    border-color: var(--brand-primary);
                    background: #ede9fe;
                    color: var(--brand-primary);
                    font-weight: bold;
                    transform: scale(1.1);
                    box-shadow: 0 0 10px rgba(124, 58, 237, 0.2);
                }
                .tape-cell.processed {
                    background: #f1f5f9;
                    color: #94a3b8;
                }
                .stack-container {
                    background: #f1f5f9;
                    border: 2px solid #cbd5e1;
                    border-top: none;
                    border-radius: 0 0 8px 8px;
                    height: 200px;
                    width: 80px;
                    margin: 0 auto;
                    display: flex;
                    flex-direction: column;
                    justify-content: flex-end;
                    padding: 4px;
                    overflow: hidden;
                    position: relative;
                }
                .stack-item {
                    background: var(--brand-secondary);
                    color: white;
                    border-radius: 4px;
                    margin-bottom: 4px;
                    height: 30px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    font-family: monospace;
                    animation: slideDown 0.3s ease-out;
                }
                .pda-footer {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1rem;
                    background: #f8fafc;
                    border-radius: 8px;
                    border: 1px solid #e2e8f0;
                }
                .pda-footer.accepted {
                    background: #ecfdf5;
                    border-color: #34d399;
                }
                .pda-footer.rejected {
                    background: #fef2f2;
                    border-color: #fca5a5;
                }
                .message {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    color: var(--text-primary);
                }
                .result-badge {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem 1rem;
                    border-radius: 20px;
                    font-weight: bold;
                    font-size: 0.9rem;
                }
                .result-badge.success {
                    background: white;
                    color: #059669;
                    box-shadow: 0 2px 4px rgba(16, 185, 129, 0.1);
                }
                .result-badge.error {
                    background: white;
                    color: #dc2626;
                    box-shadow: 0 2px 4px rgba(239, 68, 68, 0.1);
                }
                @keyframes slideDown {
                    from { transform: translateY(-20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @media (max-width: 768px) {
                    .simulation-area {
                        grid-template-columns: 1fr;
                    }
                    .pda-controls {
                        flex-wrap: wrap;
                    }
                }
            `}</style>
        </div>
    );
};

export default PDAVisualizer;
