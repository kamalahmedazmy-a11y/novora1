import React, { useState, useEffect } from 'react';
import { Play, RotateCcw, Check, X } from 'lucide-react';

const RegexTester = () => {
    const [regex, setRegex] = useState('^a*b+$');
    const [testInfos, setTestInfos] = useState([
        { id: 1, text: 'aaabb', result: null },
        { id: 2, text: 'aaaa', result: null },
        { id: 3, text: 'b', result: null },
    ]);
    const [error, setError] = useState(null);

    const runTests = () => {
        try {
            const re = new RegExp(regex);
            const newInfos = testInfos.map(info => ({
                ...info,
                result: re.test(info.text)
            }));
            setTestInfos(newInfos);
            setError(null);
        } catch (e) {
            setError('Invalid Regex: ' + e.message);
        }
    };

    useEffect(() => {
        runTests();
    }, []);

    const handleTestChange = (id, newText) => {
        setTestInfos(prev => prev.map(p => p.id === id ? { ...p, text: newText, result: null } : p));
    };

    const addTestCase = () => {
        const newId = Math.max(...testInfos.map(t => t.id), 0) + 1;
        setTestInfos([...testInfos, { id: newId, text: '', result: null }]);
    };

    return (
        <div className="interactive-playground card">
            <h3 className="playground-title">
                <Play size={20} className="icon-pulse" /> Interactive Playground: Regex Tester
            </h3>
            <p className="playground-desc">
                Experiment with Regular Expressions. The default pattern <code>^a*b+$</code> matches any number of 'a's followed by at least one 'b'.
            </p>

            <div className="regex-input-group">
                <label>Pattern (Regex):</label>
                <div className="input-wrapper">
                    <span className="regex-slash">/</span>
                    <input
                        type="text"
                        value={regex}
                        onChange={(e) => setRegex(e.target.value)}
                        className={error ? 'error' : ''}
                    />
                    <span className="regex-slash">/</span>
                </div>
                {error && <span className="error-msg">{error}</span>}
            </div>

            <div className="test-cases">
                <label>Test Strings:</label>
                {testInfos.map((test) => (
                    <div key={test.id} className="test-row fade-in">
                        <input
                            type="text"
                            value={test.text}
                            onChange={(e) => handleTestChange(test.id, e.target.value)}
                            placeholder="Enter test string..."
                        />
                        <div className={`status-indicator ${test.result === null ? 'pending' : test.result ? 'pass' : 'fail'}`}>
                            {test.result === null ? '...' : test.result ? <Check size={16} /> : <X size={16} />}
                            <span>{test.result === null ? 'Pending' : test.result ? 'Match' : 'No Match'}</span>
                        </div>
                    </div>
                ))}

                <div className="actions">
                    <button onClick={addTestCase} className="btn-secondary small">+ Add Test Case</button>
                    <button onClick={runTests} className="btn-primary small">
                        <Play size={16} /> Run Tests
                    </button>
                </div>
            </div>

            <style>{`
                .interactive-playground {
                    border: 1px solid var(--color-primary-purple);
                    background: linear-gradient(to bottom right, #fff, #f5f3ff);
                    margin: 2rem 0;
                }
                .playground-title {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    color: var(--brand-primary);
                    margin-bottom: 0.5rem;
                }
                .icon-pulse {
                    animation: pulse 2s infinite;
                }
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.1); opacity: 0.8; }
                    100% { transform: scale(1); opacity: 1; }
                }
                .playground-desc {
                    color: var(--text-secondary);
                    font-size: 0.9rem;
                    margin-bottom: 1.5rem;
                }
                code {
                    background: #f1f5f9;
                    padding: 0.2rem 0.4rem;
                    border-radius: 4px;
                    color: #d63384;
                    font-family: monospace;
                }

                .regex-input-group {
                    margin-bottom: 1.5rem;
                }
                .regex-input-group label {
                    display: block;
                    font-weight: 600;
                    margin-bottom: 0.5rem;
                    color: var(--text-primary);
                }
                .input-wrapper {
                    display: flex;
                    align-items: center;
                    background: white;
                    border: 2px solid var(--color-slate-100);
                    border-radius: var(--radius-sm);
                    padding: 0 0.5rem;
                    font-family: monospace;
                    font-size: 1.1rem;
                }
                .input-wrapper:focus-within {
                    border-color: var(--brand-primary);
                    box-shadow: 0 0 0 3px var(--brand-accent);
                }
                .regex-slash {
                    color: #94a3b8;
                    font-weight: bold;
                }
                .input-wrapper input {
                    border: none;
                    box-shadow: none;
                    flex: 1;
                    font-family: monospace;
                    font-size: 1.1rem;
                    padding: 0.75rem 0.25rem;
                }
                .input-wrapper input:focus {
                    outline: none;
                }
                .input-wrapper input.error {
                    color: #dc2626;
                }
                .error-msg {
                    color: #dc2626;
                    font-size: 0.85rem;
                    margin-top: 0.5rem;
                    display: block;
                }

                .test-cases {
                    background: white;
                    padding: 1rem;
                    border-radius: var(--radius-sm);
                    border: 1px solid var(--color-slate-100);
                }
                .test-cases label {
                    display: block;
                    font-weight: 600;
                    margin-bottom: 0.75rem;
                }
                .test-row {
                    display: flex;
                    gap: 1rem;
                    margin-bottom: 0.75rem;
                    align-items: center;
                }
                .test-row input {
                    flex: 1;
                    padding: 0.5rem;
                    font-family: monospace;
                }
                .status-indicator {
                    width: 100px;
                    display: flex;
                    align-items: center;
                    gap: 0.25rem;
                    font-size: 0.85rem;
                    font-weight: 600;
                    padding: 0.25rem 0.5rem;
                    border-radius: 99px;
                }
                .status-indicator.pending { background: #f1f5f9; color: #64748b; }
                .status-indicator.pass { background: #dcfce7; color: #16a34a; }
                .status-indicator.fail { background: #fee2e2; color: #dc2626; }

                .actions {
                    display: flex;
                    gap: 1rem;
                    margin-top: 1rem;
                }
                .btn-secondary {
                    background: white;
                    border: 1px solid var(--color-slate-100);
                    color: var(--text-secondary);
                }
                .btn-secondary:hover {
                    background: var(--color-slate-50);
                    border-color: #cbd5e1;
                }
                .small {
                    padding: 0.5rem 1rem;
                    font-size: 0.9rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    border-radius: var(--radius-sm);
                }
            `}</style>
        </div>
    );
};

export default RegexTester;
