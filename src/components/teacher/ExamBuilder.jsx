import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Send, AlertCircle, FileText, CheckCircle } from 'lucide-react';

const ExamBuilder = ({ classrooms, schedule, token, onCreated }) => {
  const [subjects, setSubjects] = useState([]);
  const [selectedClassroom, setSelectedClassroom] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [title, setTitle] = useState('');
  const [passingScore, setPassingScore] = useState(70);
  const [timeLimit, setTimeLimit] = useState(60);
  const [questions, setQuestions] = useState([
    { text: '', options: ['', '', '', ''], correctAnswer: 0 }
  ]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Extract subjects matching the schedule or classrooms
  useEffect(() => {
    const uniqueSubjects = [];
    const seenSubjectIds = new Set();
    schedule.forEach(s => {
      const subject = s.subjectId;
      if (subject && subject._id && !seenSubjectIds.has(subject._id)) {
        seenSubjectIds.add(subject._id);
        uniqueSubjects.push(subject);
      }
    });
    setSubjects(uniqueSubjects);
    if (uniqueSubjects.length > 0) {
      setSelectedSubject(uniqueSubjects[0]._id);
    }
  }, [schedule]);

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      { text: '', options: ['', '', '', ''], correctAnswer: 0 }
    ]);
  };

  const handleRemoveQuestion = (index) => {
    if (questions.length === 1) return;
    setQuestions(questions.filter((_, idx) => idx !== index));
  };

  const handleQuestionTextChange = (index, value) => {
    const newQuestions = [...questions];
    newQuestions[index].text = value;
    setQuestions(newQuestions);
  };

  const handleOptionChange = (qIndex, oIndex, value) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options[oIndex] = value;
    setQuestions(newQuestions);
  };

  const handleCorrectAnswerChange = (qIndex, value) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].correctAnswer = parseInt(value, 10);
    setQuestions(newQuestions);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!selectedClassroom) {
      setError('Please select a classroom');
      setLoading(false);
      return;
    }
    if (!selectedSubject) {
      setError('Please select a subject');
      setLoading(false);
      return;
    }
    if (!title.trim()) {
      setError('Exam title is required');
      setLoading(false);
      return;
    }

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text.trim()) {
        setError(`Question ${i + 1} has no text`);
        setLoading(false);
        return;
      }
      for (let j = 0; j < q.options.length; j++) {
        if (!q.options[j].trim()) {
          setError(`Question ${i + 1}, Option ${j + 1} is empty`);
          setLoading(false);
          return;
        }
      }
    }

    try {
      const res = await fetch('/api/teacher/exams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          subjectId: selectedSubject,
          classroomId: selectedClassroom,
          title,
          passingScore,
          timeLimit,
          questions
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to create exam');
      }

      setSuccess('Exam created and published successfully!');
      setTitle('');
      setQuestions([{ text: '', options: ['', '', '', ''], correctAnswer: 0 }]);
      if (onCreated) onCreated();
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.sectionTitle}>
        <FileText size={24} style={{ color: 'var(--brand-primary)' }} />
        Exam Builder
      </h2>

      {error && (
        <div style={styles.errorBox}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div style={styles.successBox}>
          <CheckCircle size={20} />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card" style={styles.form}>
        <div style={styles.metaRow}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Classroom</label>
            <select
              value={selectedClassroom}
              onChange={(e) => setSelectedClassroom(e.target.value)}
              style={styles.select}
            >
              <option value="">Select Classroom</option>
              {classrooms.map(c => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Subject</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              style={styles.select}
            >
              <option value="">Select Subject</option>
              {subjects.map(s => (
                <option key={s._id} value={s._id}>{s.title}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Exam Title</label>
          <input
            type="text"
            placeholder="e.g., Chapter 1: Finite Automata Quiz"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={styles.input}
          />
        </div>

        <div style={styles.metaRow}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Passing Score (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={passingScore}
              onChange={(e) => setPassingScore(parseInt(e.target.value, 10))}
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Time Limit (Minutes)</label>
            <input
              type="number"
              min="0"
              value={timeLimit}
              onChange={(e) => setTimeLimit(parseInt(e.target.value, 10))}
              style={styles.input}
            />
          </div>
        </div>

        <hr style={styles.hr} />

        <h3 style={styles.subtitle}>Questions</h3>

        {questions.map((q, qIdx) => (
          <div key={qIdx} style={styles.questionBlock}>
            <div style={styles.qbHeader}>
              <h4 style={styles.qNum}>Question {qIdx + 1}</h4>
              {questions.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveQuestion(qIdx)}
                  style={styles.btnRemove}
                  title="Remove Question"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            <div style={styles.formGroup}>
              <input
                type="text"
                placeholder="Enter question text"
                value={q.text}
                onChange={(e) => handleQuestionTextChange(qIdx, e.target.value)}
                style={styles.input}
              />
            </div>

            <div style={styles.optionsGrid}>
              {q.options.map((option, oIdx) => (
                <div key={oIdx} style={styles.optionRow}>
                  <span style={styles.optionLabel}>{String.fromCharCode(65 + oIdx)}</span>
                  <input
                    type="text"
                    placeholder={`Option ${oIdx + 1}`}
                    value={option}
                    onChange={(e) => handleOptionChange(qIdx, oIdx, e.target.value)}
                    style={{ ...styles.input, flex: 1 }}
                  />
                </div>
              ))}
            </div>

            <div style={styles.correctSelectRow}>
              <label style={{ ...styles.label, marginBottom: 0 }}>Correct Answer:</label>
              <select
                value={q.correctAnswer}
                onChange={(e) => handleCorrectAnswerChange(qIdx, e.target.value)}
                style={styles.selectCorrect}
              >
                {q.options.map((_, oIdx) => (
                  <option key={oIdx} value={oIdx}>
                    Option {String.fromCharCode(65 + oIdx)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}

        <div style={styles.btnRow}>
          <button
            type="button"
            onClick={handleAddQuestion}
            style={styles.btnAdd}
          >
            <Plus size={18} /> Add Question
          </button>

          <button
            type="submit"
            disabled={loading}
            style={styles.btnSubmit}
          >
            <Send size={18} /> {loading ? 'Saving...' : 'Create & Publish Exam'}
          </button>
        </div>
      </form>
    </div>
  );
};

const styles = {
  container: { maxWidth: '800px', margin: '0 auto' },
  sectionTitle: {
    fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)',
    marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem'
  },
  form: { padding: '2rem' },
  metaRow: { display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' },
  formGroup: { flex: 1, minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' },
  label: { fontSize: '0.9rem', fontWeight: 600, color: '#475569' },
  select: {
    padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0',
    background: 'white', fontSize: '0.95rem', outline: 'none'
  },
  input: {
    padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0',
    fontSize: '0.95rem', outline: 'none'
  },
  hr: { border: 'none', borderBottom: '1px solid #f1f5f9', margin: '2rem 0' },
  subtitle: { fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', color: '#1e293b' },
  questionBlock: {
    background: '#f8fafc', padding: '1.5rem', borderRadius: '12px',
    border: '1px solid #e2e8f0', marginBottom: '1.5rem'
  },
  qbHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  qNum: { fontSize: '1rem', fontWeight: 700, color: '#475569' },
  btnRemove: {
    background: '#fef2f2', color: '#ef4444', border: 'none',
    padding: '0.5rem', borderRadius: '8px', display: 'flex', cursor: 'pointer'
  },
  optionsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' },
  optionRow: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  optionLabel: { fontWeight: 700, color: '#94a3b8' },
  correctSelectRow: { display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem' },
  selectCorrect: {
    padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0',
    background: 'white', fontWeight: 600, color: '#7c3aed'
  },
  btnRow: { display: 'flex', justifyContent: 'space-between', gap: '1rem', marginTop: '2rem' },
  btnAdd: {
    display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem',
    borderRadius: '12px', background: '#f5f3ff', color: '#7c3aed',
    fontWeight: 600, cursor: 'pointer'
  },
  btnSubmit: {
    display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem',
    borderRadius: '12px', background: 'var(--brand-primary)', color: 'white',
    fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(124,58,237,0.3)'
  },
  errorBox: {
    display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem',
    background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '12px',
    color: '#ef4444', marginBottom: '1.5rem'
  },
  successBox: {
    display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem',
    background: '#ecfdf5', border: '1px solid #d1fae5', borderRadius: '12px',
    color: '#10b981', marginBottom: '1.5rem'
  }
};

export default ExamBuilder;
