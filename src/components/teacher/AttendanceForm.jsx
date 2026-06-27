import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Check, ClipboardList, ShieldAlert } from 'lucide-react';

const AttendanceForm = ({ classroomId }) => {
    const { user } = useAuth();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
    const [statuses, setStatuses] = useState({}); // studentId -> status

    useEffect(() => {
        if (classroomId) {
            fetchStudents();
        }
    }, [classroomId]);

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/teacher/classrooms/${classroomId}/students`, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            const data = await res.json();
            if (res.ok) {
                setStudents(data);
                // Initialize default status to 'present' for all students
                const initialStatuses = {};
                data.forEach(s => {
                    initialStatuses[s._id] = 'present';
                });
                setStatuses(initialStatuses);
                setError(null);
            } else {
                setError(data.message || 'Failed to load students');
            }
        } catch (err) {
            setError('Error loading students');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = (studentId, status) => {
        setStatuses(prev => ({
            ...prev,
            [studentId]: status
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const records = Object.entries(statuses).map(([studentId, status]) => ({
            studentId,
            status
        }));

        try {
            const res = await fetch('/api/teacher/attendance', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${user.token}`
                },
                body: JSON.stringify({
                    classroomId,
                    date: attendanceDate,
                    records
                })
            });

            if (res.ok) {
                alert('Attendance submitted successfully!');
            } else {
                const data = await res.json();
                alert(data.message || 'Error submitting attendance');
            }
        } catch (err) {
            alert('Failed to submit attendance');
        }
    };

    if (loading) return <div>Loading students for attendance...</div>;
    if (error) return <div className="error-box"><ShieldAlert size={16} /> {error}</div>;
    if (students.length === 0) return <div>No active students enrolled in this class.</div>;

    return (
        <div className="attendance-form-container">
            <div className="attendance-header">
                <h3><ClipboardList size={18} /> Take Attendance</h3>
                <input 
                    type="date" 
                    value={attendanceDate} 
                    onChange={(e) => setAttendanceDate(e.target.value)} 
                    className="date-picker"
                />
            </div>

            <form onSubmit={handleSubmit}>
                <div className="students-list">
                    {students.map((student) => (
                        <div key={student._id} className="student-attendance-row">
                            <span className="student-name">{student.name}</span>
                            <div className="status-options">
                                {['present', 'absent', 'late', 'excused'].map((status) => (
                                    <label key={status} className={`status-label ${status} ${statuses[student._id] === status ? 'checked' : ''}`}>
                                        <input 
                                            type="radio" 
                                            name={`status-${student._id}`} 
                                            value={status}
                                            checked={statuses[student._id] === status}
                                            onChange={() => handleStatusChange(student._id, status)}
                                        />
                                        <span className="status-text">{status}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <button type="submit" className="btn-submit">
                    <Check size={18} /> Save Attendance
                </button>
            </form>

            <style>{`
                .attendance-form-container {
                    background: rgba(30, 41, 59, 0.4);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 16px;
                    padding: 1.5rem;
                }
                .attendance-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1.5rem;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                    padding-bottom: 0.75rem;
                }
                .attendance-header h3 {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    color: white;
                }
                .date-picker {
                    padding: 0.4rem 0.8rem;
                    background: rgba(15, 23, 42, 0.6);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 8px;
                    color: white;
                    outline: none;
                }
                .students-list {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    margin-bottom: 1.5rem;
                }
                .student-attendance-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0.75rem;
                    background: rgba(255, 255, 255, 0.02);
                    border-radius: 10px;
                    border: 1px solid rgba(255, 255, 255, 0.03);
                }
                .student-name {
                    font-weight: 600;
                    color: #E2E8F0;
                }
                .status-options {
                    display: flex;
                    gap: 0.5rem;
                }
                .status-label {
                    cursor: pointer;
                    padding: 0.3rem 0.75rem;
                    border-radius: 6px;
                    font-size: 0.8rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    border: 1px solid transparent;
                    transition: all 0.2s;
                }
                .status-label input {
                    display: none;
                }
                .status-label.present { background: rgba(16, 185, 129, 0.05); color: #10B981; border-color: rgba(16, 185, 129, 0.1); }
                .status-label.absent { background: rgba(239, 68, 68, 0.05); color: #EF4444; border-color: rgba(239, 68, 68, 0.1); }
                .status-label.late { background: rgba(245, 158, 11, 0.05); color: #F59E0B; border-color: rgba(245, 158, 11, 0.1); }
                .status-label.excused { background: rgba(99, 102, 241, 0.05); color: #6366F1; border-color: rgba(99, 102, 241, 0.1); }

                .status-label.present.checked { background: #10B981; color: white; }
                .status-label.absent.checked { background: #EF4444; color: white; }
                .status-label.late.checked { background: #F59E0B; color: white; }
                .status-label.excused.checked { background: #6366F1; color: white; }

                .btn-submit {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    width: 100%;
                    padding: 0.75rem;
                    background: linear-gradient(90deg, #10B981, #059669);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .btn-submit:hover {
                    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
                }
            `}</style>
        </div>
    );
};

export default AttendanceForm;
