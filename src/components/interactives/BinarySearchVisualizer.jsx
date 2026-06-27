import React, { useState, useEffect } from 'react';
import { Play, RotateCcw, Info, Search } from 'lucide-react';

const BinarySearchVisualizer = () => {
    const [array] = useState([2, 5, 8, 12, 16, 23, 28, 31, 35, 42, 48, 55, 61, 68, 74]);
    const [target, setTarget] = useState(35);
    const [isSearching, setIsSearching] = useState(false);
    const [left, setLeft] = useState(null);
    const [right, setRight] = useState(null);
    const [mid, setMid] = useState(null);
    const [found, setFound] = useState(null);
    const [steps, setSteps] = useState(0);

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const binarySearch = async () => {
        setIsSearching(true);
        setFound(null);
        setSteps(0);

        let l = 0;
        let r = array.length - 1;
        let stepCount = 0;

        while (l <= r) {
            stepCount++;
            setSteps(stepCount);
            setLeft(l);
            setRight(r);

            await sleep(800);

            const m = Math.floor((l + r) / 2);
            setMid(m);

            await sleep(800);

            if (array[m] === target) {
                setFound(m);
                setIsSearching(false);
                return;
            }

            if (array[m] < target) {
                l = m + 1;
            } else {
                r = m - 1;
            }

            await sleep(400);
        }

        setIsSearching(false);
        setFound(-1); // Not found
    };

    const reset = () => {
        setLeft(null);
        setRight(null);
        setMid(null);
        setFound(null);
        setSteps(0);
        setIsSearching(false);
    };

    return (
        <div className="binary-search-visualizer">
            <div className="bs-controls">
                <div className="control-group">
                    <label>Target Number</label>
                    <select
                        value={target}
                        onChange={(e) => { setTarget(Number(e.target.value)); reset(); }}
                        disabled={isSearching}
                        className="target-select"
                    >
                        {array.map(num => (
                            <option key={num} value={num}>{num}</option>
                        ))}
                    </select>
                </div>

                <div className="control-actions">
                    <button
                        onClick={binarySearch}
                        disabled={isSearching}
                        className="btn-primary btn-sm"
                    >
                        <Play size={16} /> Start Search
                    </button>
                    <button onClick={reset} className="btn-secondary btn-sm">
                        <RotateCcw size={16} /> Reset
                    </button>
                </div>
            </div>

            {/* Array Visualization */}
            <div className="array-container">
                {array.map((num, idx) => {
                    let className = 'array-cell';
                    if (idx === found && found !== -1) className += ' found';
                    else if (idx === mid) className += ' mid';
                    else if (left !== null && right !== null && idx >= left && idx <= right) className += ' in-range';
                    else if (left !== null || right !== null) className += ' out-range';

                    return (
                        <div key={idx} className={className}>
                            <div className="cell-value">{num}</div>
                            {idx === left && <div className="boundary-label left">L</div>}
                            {idx === right && <div className="boundary-label right">R</div>}
                            {idx === mid && <div className="mid-label">M</div>}
                        </div>
                    );
                })}
            </div>

            {/* Status */}
            {steps > 0 && (
                <div className="search-status">
                    <strong>Steps: {steps}</strong>
                    {found !== null && (
                        <span className={found === -1 ? 'not-found' : 'found-msg'}>
                            {found === -1 ? 'Not Found' : `Found at index ${found}!`}
                        </span>
                    )}
                </div>
            )}

            {/* Info Panel */}
            <div className="info-panel complexity-info">
                <div className="info-header">
                    <Info size={16} />
                    <strong>P Class Algorithm</strong>
                </div>
                <div className="info-content">
                    <p><strong>Complexity:</strong> O(log n)</p>
                    <p><strong>Strategy:</strong> Divide and conquer - eliminates half the search space each step</p>
                    <p><strong>Efficiency:</strong> For 1 million items, only ~20 comparisons needed!</p>
                </div>
            </div>

            <style>{`
                .binary-search-visualizer {
                    background: white;
                    border-radius: 12px;
                    padding: 1.5rem;
                    border: 2px solid #e2e8f0;
                }

                .bs-controls {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                    margin-bottom: 2rem;
                    gap: 1rem;
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

                .target-select {
                    padding: 0.5rem 0.75rem;
                    border: 2px solid #e2e8f0;
                    border-radius: 6px;
                    font-size: 0.95rem;
                    min-width: 120px;
                }

                .target-select:focus {
                    border-color: #10b981;
                    outline: none;
                }

                .control-actions {
                    display: flex;
                    gap: 0.5rem;
                }

                .btn-sm {
                    padding: 0.5rem 1rem;
                    font-size: 0.875rem;
                }

                .array-container {
                    display: flex;
                    gap: 0.5rem;
                    margin-bottom: 1.5rem;
                    overflow-x: auto;
                    padding: 1rem 0;
                }

                .array-cell {
                    position: relative;
                    min-width: 50px;
                    height: 50px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #f8fafc;
                    border: 2px solid #cbd5e1;
                    border-radius: 8px;
                    transition: all 0.3s ease;
                }

                .array-cell.in-range {
                    background: #dbeafe;
                    border-color: #3b82f6;
                }

                .array-cell.out-range {
                    background: #f1f5f9;
                    border-color: #e2e8f0;
                    opacity: 0.4;
                }

                .array-cell.mid {
                    background: #fef3c7;
                    border-color: #f59e0b;
                    border-width: 3px;
                    transform: scale(1.1);
                    box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
                }

                .array-cell.found {
                    background: #d1fae5;
                    border-color: #10b981;
                    border-width: 3px;
                    transform: scale(1.15);
                    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
                    animation: pulse 0.5s ease-in-out;
                }

                .cell-value {
                    font-weight: 700;
                    font-size: 1rem;
                    color: var(--text-primary);
                }

                .boundary-label {
                    position: absolute;
                    top: -20px;
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: #3b82f6;
                    background: white;
                    padding: 2px 6px;
                    border-radius: 4px;
                    border: 1px solid #3b82f6;
                }

                .boundary-label.left {
                    left: 0;
                }

                .boundary-label.right {
                    right: 0;
                }

                .mid-label {
                    position: absolute;
                    bottom: -20px;
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: #f59e0b;
                    background: white;
                    padding: 2px 6px;
                    border-radius: 4px;
                    border: 1px solid #f59e0b;
                }

                .search-status {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1rem;
                    background: #f8fafc;
                    border-radius: 8px;
                    margin-bottom: 1rem;
                }

                .found-msg {
                    color: #10b981;
                    font-weight: 600;
                }

                .not-found {
                    color: #ef4444;
                    font-weight: 600;
                }

                .complexity-info {
                    background: #ecfdf5;
                    border-left: 4px solid #10b981;
                    padding: 1rem;
                    border-radius: 8px;
                }

                .info-header {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    color: #10b981;
                    margin-bottom: 0.75rem;
                }

                .info-content p {
                    margin: 0.5rem 0;
                    font-size: 0.875rem;
                    color: var(--text-secondary);
                }

                .info-content strong {
                    color: var(--text-primary);
                }

                @keyframes pulse {
                    0%, 100% { transform: scale(1.15); }
                    50% { transform: scale(1.25); }
                }

                @media (max-width: 768px) {
                    .bs-controls {
                        flex-direction: column;
                        align-items: stretch;
                    }

                    .array-container {
                        justify-content: flex-start;
                    }

                    .array-cell {
                        min-width: 45px;
                        height: 45px;
                    }
                }
            `}</style>
        </div>
    );
};

export default BinarySearchVisualizer;
