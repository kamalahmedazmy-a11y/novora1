import React, { useState } from 'react';
import { Settings, Zap, CheckCircle } from 'lucide-react';

const LogicGateDemo = () => {
    const [inputA, setInputA] = useState(false);
    const [inputB, setInputB] = useState(false);
    const [gateType, setGateType] = useState('AND');

    const computeOutput = () => {
        switch (gateType) {
            case 'AND': return inputA && inputB;
            case 'OR': return inputA || inputB;
            case 'XOR': return inputA !== inputB;
            case 'NAND': return !(inputA && inputB);
            case 'NOR': return !(inputA || inputB);
            default: return false;
        }
    };

    const output = computeOutput();

    return (
        <div className="logic-demo-container card">
            <h3 className="demo-title">
                <Settings size={20} className="spin-slow" /> Logic Gate Explorer
            </h3>
            <p className="demo-desc">
                Select a logic gate and toggle inputs to see the truth table in action.
            </p>

            <div className="demo-workspace">
                {/* Inputs */}
                <div className="inputs-column">
                    <div className="io-node">
                        <label>Input A</label>
                        <button
                            className={`toggle-switch ${inputA ? 'on' : 'off'}`}
                            onClick={() => setInputA(!inputA)}
                        >
                            {inputA ? '1' : '0'}
                        </button>
                    </div>
                    <div className="io-node">
                        <label>Input B</label>
                        <button
                            className={`toggle-switch ${inputB ? 'on' : 'off'}`}
                            onClick={() => setInputB(!inputB)}
                        >
                            {inputB ? '1' : '0'}
                        </button>
                    </div>
                </div>

                {/* Gate Visual */}
                <div className="gate-column">
                    <div className="gate-selector">
                        <select value={gateType} onChange={(e) => setGateType(e.target.value)} className="gate-select">
                            <option value="AND">AND Gate</option>
                            <option value="OR">OR Gate</option>
                            <option value="XOR">XOR Gate</option>
                            <option value="NAND">NAND Gate</option>
                            <option value="NOR">NOR Gate</option>
                        </select>
                    </div>

                    <div className={`gate-visual ${output ? 'active' : ''}`}>
                        <div className="gate-body">
                            <span className="gate-label">{gateType}</span>
                        </div>
                        {/* Wires */}
                        <div className={`wire input-wire-a ${inputA ? 'powered' : ''}`}></div>
                        <div className={`wire input-wire-b ${inputB ? 'powered' : ''}`}></div>
                        <div className={`wire output-wire ${output ? 'powered' : ''}`}></div>
                    </div>
                </div>

                {/* Output */}
                <div className="outputs-column">
                    <div className="io-node">
                        <label>Output</label>
                        <div className={`output-indicator ${output ? 'on' : 'off'} ${output ? 'glow' : ''}`}>
                            {output ? '1' : '0'}
                            {output && <Zap size={14} className="zap-icon" />}
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .logic-demo-container {
                    background: #1e293b;
                    color: white;
                    border: 1px solid #334155;
                }
                .demo-title {
                    color: var(--color-light-purple);
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                .demo-desc {
                    color: #94a3b8;
                    font-size: 0.9rem;
                    margin-bottom: 2rem;
                }
                .spin-slow {
                    animation: spin 3s linear infinite;
                }

                .demo-workspace {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 2rem 1rem;
                    background: #0f172a;
                    border-radius: 12px;
                    position: relative;
                }

                /* Inputs/Outputs */
                .inputs-column, .outputs-column {
                    display: flex;
                    flex-direction: column;
                    gap: 2rem;
                    z-index: 10;
                }
                .io-node {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.5rem;
                }
                .io-node label {
                    font-size: 0.8rem;
                    text-transform: uppercase;
                    color: #64748b;
                    font-weight: 700;
                }
                .toggle-switch, .output-indicator {
                    width: 50px;
                    height: 50px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.5rem;
                    font-weight: 800;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    border: 2px solid transparent;
                }
                
                .toggle-switch.off {
                    background: #334155;
                    color: #94a3b8;
                    box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);
                }
                .toggle-switch.on {
                    background: var(--brand-primary);
                    color: white;
                    box-shadow: 0 0 15px rgba(139, 92, 246, 0.5);
                    transform: translateY(-2px);
                }

                .output-indicator.off {
                    background: #334155;
                    color: #64748b;
                    border-color: #475569;
                }
                .output-indicator.on {
                    background: #10b981;
                    color: white;
                    box-shadow: 0 0 20px rgba(16, 185, 129, 0.6);
                    border-color: #34d399;
                }
                .zap-icon {
                    position: absolute;
                    top: -10px;
                    right: -10px;
                    color: #fbbf24;
                    filter: drop-shadow(0 0 5px orange);
                }

                /* Gate */
                .gate-column {
                    flex-grow: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    position: relative;
                }
                .gate-selector {
                    margin-bottom: 2rem;
                }
                .gate-select {
                    background: #334155;
                    color: white;
                    border: 1px solid #475569;
                    padding: 0.5rem 1rem;
                    border-radius: 8px;
                    cursor: pointer;
                }
                .gate-visual {
                    position: relative;
                    width: 120px;
                    height: 100px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .gate-body {
                    width: 100px;
                    height: 80px;
                    background: white;
                    border-radius: 8px 40px 40px 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 5;
                    border: 3px solid #cbd5e1;
                    transition: all 0.3s;
                }
                .gate-visual.active .gate-body {
                    border-color: var(--brand-primary);
                    box-shadow: 0 0 20px rgba(139, 92, 246, 0.3);
                }
                .gate-label {
                    color: #1e293b;
                    font-weight: 800;
                    font-size: 1.2rem;
                }

                /* Wires */
                .wire {
                    position: absolute;
                    background: #334155;
                    transition: background 0.3s;
                    z-index: 1;
                }
                .wire.powered {
                    background: var(--brand-primary);
                    box-shadow: 0 0 10px var(--brand-primary);
                }
                .input-wire-a {
                    top: 25px;
                    left: -80px;
                    width: 80px;
                    height: 4px;
                }
                .input-wire-b {
                    bottom: 25px;
                    left: -80px;
                    width: 80px;
                    height: 4px;
                }
                .output-wire {
                    top: 48px;
                    right: -80px;
                    width: 80px;
                    height: 4px;
                }
            `}</style>
        </div>
    );
};

export default LogicGateDemo;
