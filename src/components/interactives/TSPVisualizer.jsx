import React, { useState } from 'react';
import { Play, RotateCcw, Info } from 'lucide-react';

const TSPVisualizer = () => {
    const [cities] = useState([
        { id: 0, name: 'A', x: 100, y: 100 },
        { id: 1, name: 'B', x: 300, y: 80 },
        { id: 2, name: 'C', x: 350, y: 250 },
        { id: 3, name: 'D', x: 150, y: 280 },
        { id: 4, name: 'E', x: 220, y: 180 }
    ]);

    const [isSearching, setIsSearching] = useState(false);
    const [currentPath, setCurrentPath] = useState([]);
    const [currentCost, setCurrentCost] = useState(0);
    const [bestPath, setBestPath] = useState([]);
    const [bestCost, setBestCost] = useState(Infinity);
    const [permutationsChecked, setPermutationsChecked] = useState(0);

    const distance = (city1, city2) => {
        const dx = city1.x - city2.x;
        const dy = city1.y - city2.y;
        return Math.sqrt(dx * dx + dy * dy);
    };

    const calculatePathCost = (path) => {
        let cost = 0;
        for (let i = 0; i < path.length - 1; i++) {
            cost += distance(cities[path[i]], cities[path[i + 1]]);
        }
        // Return to start
        cost += distance(cities[path[path.length - 1]], cities[path[0]]);
        return cost;
    };

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const permute = async (arr, start = 0) => {
        if (start === arr.length - 1) {
            const cost = calculatePathCost(arr);
            setCurrentPath([...arr]);
            setCurrentCost(cost);
            setPermutationsChecked(prev => prev + 1);

            await sleep(400);

            if (cost < bestCost) {
                setBestCost(cost);
                setBestPath([...arr]);
            }
            return;
        }

        for (let i = start; i < arr.length; i++) {
            [arr[start], arr[i]] = [arr[i], arr[start]];
            await permute(arr, start + 1);
            [arr[start], arr[i]] = [arr[i], arr[start]];
        }
    };

    const solveTSP = async () => {
        setIsSearching(true);
        setBestPath([]);
        setBestCost(Infinity);
        setPermutationsChecked(0);

        const indices = cities.map((_, i) => i);
        await permute(indices);

        setIsSearching(false);
        setCurrentPath([]);
    };

    const reset = () => {
        setCurrentPath([]);
        setBestPath([]);
        setBestCost(Infinity);
        setPermutationsChecked(0);
        setIsSearching(false);
        setCurrentCost(0);
    };

    const factorial = (n) => {
        let result = 1;
        for (let i = 2; i <= n; i++) result *= i;
        return result;
    };

    return (
        <div className="tsp-visualizer">
            <div className="tsp-controls">
                <div className="control-actions">
                    <button
                        onClick={solveTSP}
                        disabled={isSearching}
                        className="btn-primary btn-sm"
                    >
                        <Play size={16} /> Find Shortest Route
                    </button>
                    <button onClick={reset} className="btn-secondary btn-sm">
                        <RotateCcw size={16} /> Reset
                    </button>
                </div>
            </div>

            {/* Graph Visualization */}
            <div className="graph-container">
                <svg width="450" height="350" className="tsp-svg">
                    {/* Draw current path */}
                    {currentPath.length > 0 && currentPath.map((cityIdx, i) => {
                        const nextIdx = i < currentPath.length - 1 ? currentPath[i + 1] : currentPath[0];
                        const city1 = cities[cityIdx];
                        const city2 = cities[nextIdx];

                        return (
                            <line
                                key={`current-${i}`}
                                x1={city1.x}
                                y1={city1.y}
                                x2={city2.x}
                                y2={city2.y}
                                stroke="#f59e0b"
                                strokeWidth="2"
                                strokeDasharray="5,5"
                                opacity="0.6"
                            />
                        );
                    })}

                    {/* Draw best path */}
                    {bestPath.length > 0 && bestPath.map((cityIdx, i) => {
                        const nextIdx = i < bestPath.length - 1 ? bestPath[i + 1] : bestPath[0];
                        const city1 = cities[cityIdx];
                        const city2 = cities[nextIdx];

                        return (
                            <line
                                key={`best-${i}`}
                                x1={city1.x}
                                y1={city1.y}
                                x2={city2.x}
                                y2={city2.y}
                                stroke="#10b981"
                                strokeWidth="3"
                                opacity="0.8"
                            />
                        );
                    })}

                    {/* Draw cities */}
                    {cities.map((city, idx) => (
                        <g key={city.id}>
                            <circle
                                cx={city.x}
                                cy={city.y}
                                r="20"
                                fill={
                                    bestPath.includes(idx) ? '#d1fae5' :
                                        currentPath.includes(idx) ? '#fef3c7' :
                                            'white'
                                }
                                stroke={
                                    bestPath.includes(idx) ? '#10b981' :
                                        currentPath.includes(idx) ? '#f59e0b' :
                                            '#cbd5e1'
                                }
                                strokeWidth="3"
                            />
                            <text
                                x={city.x}
                                y={city.y + 5}
                                textAnchor="middle"
                                fontSize="16"
                                fontWeight="700"
                                fill={currentPath.includes(idx) || bestPath.includes(idx) ? '#1e293b' : '#64748b'}
                            >
                                {city.name}
                            </text>
                        </g>
                    ))}
                </svg>
            </div>

            {/* Status Display */}
            <div className="tsp-status">
                {isSearching && (
                    <div className="status-item current">
                        <strong>Current Route:</strong> {currentPath.map(i => cities[i].name).join(' → ')} → {cities[currentPath[0]]?.name}
                        <span className="cost">Cost: {currentCost.toFixed(1)}</span>
                    </div>
                )}
                {bestPath.length > 0 && (
                    <div className="status-item best">
                        <strong>✓ Best Route:</strong> {bestPath.map(i => cities[i].name).join(' → ')} → {cities[bestPath[0]].name}
                        <span className="cost best-cost">Cost: {bestCost.toFixed(1)}</span>
                    </div>
                )}
                {permutationsChecked > 0 && (
                    <div className="status-item stats">
                        <strong>Routes Checked:</strong> {permutationsChecked} / {factorial(cities.length)} total permutations
                    </div>
                )}
            </div>

            {/* Info Panel */}
            <div className="info-panel complexity-info nphard-info">
                <div className="info-header">
                    <Info size={16} />
                    <strong>NP-Hard Problem</strong>
                </div>
                <div className="info-content">
                    <p><strong>Complexity:</strong> O(n!) - Factorial time</p>
                    <p><strong>Strategy:</strong> Check all possible route permutations to find the shortest</p>
                    <p><strong>Intractability:</strong> No known polynomial-time algorithm exists</p>
                    <p><strong>Growth:</strong> 5 cities = 120 routes, 10 cities = 3,628,800 routes, 20 cities = 2.4×10¹⁸ routes!</p>
                </div>
            </div>

            <style>{`
                .tsp-visualizer {
                    background: white;
                    border-radius: 12px;
                    padding: 1.5rem;
                    border: 2px solid #e2e8f0;
                }

                .tsp-controls {
                    margin-bottom: 1.5rem;
                }

                .graph-container {
                    background: #f8fafc;
                    border-radius: 12px;
                    padding: 1.5rem;
                    margin-bottom: 1.5rem;
                    display: flex;
                    justify-content: center;
                }

                .tsp-svg {
                    display: block;
                }

                .tsp-status {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                    margin-bottom: 1.5rem;
                }

                .status-item {
                    padding: 0.75rem 1rem;
                    border-radius: 8px;
                    font-size: 0.95rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                }

                .status-item.current {
                    background: #fef3c7;
                    border-left: 4px solid #f59e0b;
                }

                .status-item.best {
                    background: #d1fae5;
                    border-left: 4px solid #10b981;
                    color: #065f46;
                    animation: slideIn 0.3s ease-out;
                }

                .status-item.stats {
                    background: #f8fafc;
                    border-left: 4px solid #64748b;
                }

                .cost {
                    font-family: monospace;
                    font-weight: 700;
                    color: #f59e0b;
                }

                .best-cost {
                    color: #10b981;
                }

                .nphard-info {
                    background: #fef2f2;
                    border-left: 4px solid #ef4444;
                }

                .nphard-info .info-header {
                    color: #ef4444;
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
                    .tsp-svg {
                        width: 100%;
                        height: auto;
                    }

                    .graph-container {
                        padding: 1rem;
                    }

                    .status-item {
                        flex-direction: column;
                        align-items: flex-start;
                    }
                }
            `}</style>
        </div>
    );
};

export default TSPVisualizer;
