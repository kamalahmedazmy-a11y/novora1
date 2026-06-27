import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const ProgressContext = createContext();

export const useProgress = () => useContext(ProgressContext);

export const ProgressProvider = ({ children }) => {
    const { user } = useAuth();
    const [completedChapters, setCompletedChapters] = useState([]);
    const [examScores, setExamScores] = useState({});
    const [totalChapters, setTotalChapters] = useState(0);
    const [chapters, setChapters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSubjectId, setSelectedSubjectId] = useState(null);

    const fetchProgress = async (subjectId = null) => {
        if (user && user._id) {
            try {
                const token = user.token;
                const headers = token ? { Authorization: `Bearer ${token}` } : {};

                // Fetch global progress (completed chapters and scores)
                const res = await fetch('/api/progress', { headers });
                const data = await res.json();
                setCompletedChapters(data.completedChapters || []);
                setExamScores(data.examScores || {});

                // Fetch chapters for the active subject
                let chapUrl = '/api/chapters';
                if (subjectId) {
                    chapUrl += `?subjectId=${subjectId}`;
                }
                const chapRes = await fetch(chapUrl, { headers });
                const chapData = await chapRes.json();
                if (Array.isArray(chapData)) {
                    setChapters(chapData);
                    setTotalChapters(chapData.length);
                } else {
                    setChapters([]);
                    setTotalChapters(0);
                }
            } catch (err) {
                console.error("Failed to fetch progress", err);
            }
        } else {
            setCompletedChapters([]);
            setExamScores({});
            setTotalChapters(0);
            setChapters([]);
        }
        setLoading(false);
    };

    // Load progress when user changes or selectedSubjectId changes
    useEffect(() => {
        fetchProgress(selectedSubjectId);
    }, [user, selectedSubjectId]);

    // A chapter is locked if it is not the first one, and the previous one in the list is not completed
    const isChapterLocked = (chapterId) => {
        const index = chapters.findIndex(c => c.id === chapterId);
        if (index <= 0) return false; // First chapter is always unlocked
        const prevChapter = chapters[index - 1];
        return !completedChapters.includes(prevChapter.id);
    };

    const completeChapter = async (chapterId, score) => {
        const token = user?.token;
        try {
            const res = await fetch('/api/progress/submit-exam', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ chapterId, score })
            });
            const data = await res.json();

            if (data.progress) {
                setCompletedChapters(data.progress.completedChapters || []);
                setExamScores(data.progress.examScores || {});
            }

            // Reload chapters state to reflect completion status
            await fetchProgress(selectedSubjectId);

            return data.passed;
        } catch (err) {
            console.error("Failed to submit exam", err);
            return false;
        }
    };

    const getProgressPercentage = () => {
        if (totalChapters === 0) return 0;
        const currentSubjectCompletedCount = chapters.filter(c => completedChapters.includes(c.id)).length;
        return Math.round((currentSubjectCompletedCount / totalChapters) * 100);
    };

    const isFinalExamUnlocked = () => {
        if (totalChapters === 0) return false;
        const currentSubjectCompletedCount = chapters.filter(c => completedChapters.includes(c.id)).length;
        return currentSubjectCompletedCount >= totalChapters;
    };

    return (
        <ProgressContext.Provider value={{
            completedChapters,
            examScores,
            totalChapters,
            chapters,
            selectedSubjectId,
            setSelectedSubjectId,
            isChapterLocked,
            completeChapter,
            getProgressPercentage,
            isFinalExamUnlocked,
            loading,
            refreshProgress: () => fetchProgress(selectedSubjectId)
        }}>
            {children}
        </ProgressContext.Provider>
    );
};
