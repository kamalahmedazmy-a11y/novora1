import React, { useState } from 'react';
import { Play, RotateCcw, Info } from 'lucide-react';

const SubsetSumVisualizer = () => {
    const [numbers] = useState([3, 7, 2, 9, 5]);
    const [targetSum, setTargetSum] = useState(12);
    const [isSearching, setIsSearching] = useState(false);
    const [currentPath, setCurrentPath] = useState([]);
    const [testedPaths, setTestedPaths] = useState([]);
    const [solution, setSolution] = useState(null);
    const [pathsExplored, setPathsExplored] = useState(0);

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const subsetSum = async (arr, target, index = 0, current = [], sum = 0) => {
        setCurrentPath([...current]);
        setPathsExplored(prev => prev + 1);
        await sleep(300);

        if (sum === target) {
            setSolution([...current]);
            setTestedPaths(prev => [...prev, { path: [...current], valid: true }]);
            return true;
        }

        if (index >= arr.length || sum > target) {
            setTestedPaths(prev => [...prev, { path: [...current], valid: false }]);
            return false;
        }

        // Include current number
        if (await subsetSum(arr, target, index + 1, [...current, arr[index]], sum + arr[index])) {
            return true;
        }

        // Exclude current number
        if (await subsetSum(arr, target, index + 1, current, sum)) {
            return true;
        }

        return false;
    };

    const startSearch = async () => {
        setIsSearching(true);
        setSolution(null);
        setTestedPaths([]);
        setCurrentPath([]);
        setPathsExplored(0);

        await subsetSum(numbers, targetSum);

        setIsSearching(false);
        setCurrentPath([]);
    };

    const reset = () => {
        setSolution(null);
        setTestedPaths([]);
        setCurrentPath([]);
        setPathsExplored(0);
        setIsSearching(false);
    };

    const getSum = (path) => path.reduce((a, b) => a + b, 0);

    return (
        <div className="subset-sum-visualizer">
            <div className="ss-controls">
                <div className="control-group">
                    <label>Target Sum</label>
                    <input
                        type="number"
                        value={targetSum}
                        onChange={(e) => { setTargetSum(Number(e.target.value)); reset(); }}
                        disabled={isSearching}
                        className="target-input"
                        min="1"
                        max="30"
                    />
                </div>

                <div className="control-actions">
                    <button
                        onClick={startSearch}
                        disabled={isSearching}
                        className="btn-primary btn-sm"
                    >
                        <Play size={16} /> Find Subset
                    </button>
                    <button onClick={reset} className="btn-secondary btn-sm">
                        <RotateCcw size={16} /> Reset
                    </button>
                </div>
            </div>

            {/* Numbers Display */}
            <div className="numbers-display">
                <div className="numbers-label">Available Numbers:</div>
                <div className="numbers-list">
                    {numbers.map((num, idx) => (
                        <div
                            key={idx}
                            className={`number-box ${currentPath.includes(num) ? 'current' :
                                    solution?.includes(num) ? 'solution' : ''
                                }`}
                        >
                            {num}
                        </div>
                    ))}
                </div>
            </div>

            {/* Current Path */}
            {(currentPath.length > 0 || solution) && (
                <div className="current-search">
                    {isSearching && currentPath.length > 0 && (
                        <div className="search-info">
                            <strong>Testing:</strong> [{currentPath.join(', ')}] = {getSum(currentPath)}
                        </div>
                    )}
                    {solution && (
                        <div className="solution-found">
                            <strong>✓ Solution Found:</strong> [{solution.join(', ')}] = {getSum(solution)}
                        </div>
                    )}
                </div>
            )}

            {/* Tree Visualization */}
            <div className="tree-container">
                <svg width="100%" height="300" className="tree-svg">
                    {/* Simplified tree representation */}
                    {testedPaths.slice(0, 15).map((item, idx) => {
                        const x = 50 + (idx % 5) * 120;
                        const y = 50 + Math.floor(idx / 5) * 80;
                        const isValid = item.valid;

                        return (
                            <g key={idx}>
                                <circle
                                    cx={x}
                                    cy={y}
                                    r="25"
                                    fill={isValid ? '#d1fae5' : '#fee2e2'}
                                    stroke={isValid ? '#10b981' : '#ef4444'}
                                    strokeWidth="2"
                                    opacity={isValid ? 1 : 0.5}
                                />
                                <text
                                    x={x}
                                    y={y + 5}
                                    textAnchor="middle"
                                    fontSize="11"
                                    fontWeight="600"
                                    fill={isValid ? '#065f46' : '#991b1b'}
                                >
                                    {getSum(item.path)}
                                </text>
                            </g>
                        );
                    })}
                </svg>
                {testedPaths.length > 15 && (
                    <div className="tree-overflow">+ {testedPaths.length - 15} more paths explored...</div>
                )}
            </div>

            {/* Stats */}
            {pathsExplored > 0 && (
                <div className="search-stats">
                    <strong>Paths Explored:</strong> {pathsExplored} / {Math.pow(2, numbers.length)} possible
                </div>
            )}

            {/* Info Panel */}
            <div className="info-panel complexity-info np-info">
                <div className="info-header">
                    <Info size={16} />
                    <strong>NP Class Problem</strong>
                </div>
                <div className="info-content">
                    <p><strong>Complexity:</strong> O(2^n) - Exponential time</p>
                    <p><strong>Strategy:</strong> Explore all possible subsets recursively</p>
                    <p><strong>Key Insight:</strong> Solutions can be <em>verified</em> in polynomial time, but <em>finding</em> them requires exponential time</p>
                    <p><strong>Growth:</strong> 5 numbers = 32 subsets, 10 numbers = 1,024 subsets!</p>
                </div>
            </div>

            <style>{`
                .subset-sum-visualizer {
                    background: white;
                    border-radius: 12px;
                    padding: 1.5rem;
                    border: 2px solid #e2e8f0;
                }

                .ss-controls {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                    margin-bottom: 1.5rem;
                    gap: 1rem;
                }

                .target-input {
                    padding: 0.5rem 0.75rem;
                    border: 2px solid #e2e8f0;
                    border-radius: 6px;
                    font-size: 0.95rem;
                    width: 100px;
                }

                .target-input:focus {
                    border-color: #7c3aed;
                    outline: none;
                }

                .numbers-display {
                    background: #f8fafc;
                    padding: 1rem;
                    border-radius: 8px;
                    margin-bottom: 1rem;
                }

                .numbers-label {
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: var(--text-secondary);
                    margin-bottom: 0.75rem;
                }

                .numbers-list {
                    display: flex;
                    gap: 0.75rem;
                    flex-wrap: wrap;
                }

                .number-box {
                    width: 50px;
                    height: 50px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: white;
                    border: 2px solid #cbd5e1;
                    border-radius: 8px;
                    font-weight: 700;
                    font-size: 1.1rem;
                    transition: all 0.3s ease;
                }

                .number-box.current {
                    background: #fef3c7;
                    border-color: #f59e0b;
                    transform: scale(1.1);
                    box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
                }

                .number-box.solution {
                    background: #d1fae5;
                    border-color: #10b981;
                    transform: scale(1.1);
                    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
                }

                .current-search {
                    margin-bottom: 1rem;
                }

                .search-info {
                    padding: 0.75rem 1rem;
                    background: #fef3c7;
                    border-left: 4px solid #f59e0b;
                    border-radius: 6px;
                    font-size: 0.95rem;
                }

                .solution-found {
                    padding: 0.75rem 1rem;
                    background: #d1fae5;
                    border-left: 4px solid #10b981;
                    border-radius: 6px;
                    font-size: 0.95rem;
                    color: #065f46;
                    animation: slideIn 0.3s ease-out;
                }

                .tree-container {
                    background: #f8fafc;
                    border-radius: 8px;
                    padding: 1rem;
                    margin-bottom: 1rem;
                    min-height: 300px;
                    position: relative;
                }

                .tree-svg {
                    display: block;
                }

                .tree-overflow {
                    text-align: center;
                    color: var(--text-secondary);
                    font-size: 0.875rem;
                    margin-top: 0.5rem;
                }

                .search-stats {
                    padding: 0.75rem 1rem;
                    background: #f8fafc;
                    border-radius: 6px;
                    margin-bottom: 1rem;
                    font-size: 0.95rem;
                }

                .np-info {
                    background: #f5f3ff;
                    border-left: 4px solid #7c3aed;
                }

                .np-info .info-header {
                    color: #7c3aed;
                }

                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @media (max-width: 768px) {
                    .ss-controls {
                        flex-direction: column;
                        align-items: stretch;
                    }

                    .tree-svg {
                        height: 250px;
                    }
                }
            `}</style>
        </div>
    );
};

export default SubsetSumVisualizer;
