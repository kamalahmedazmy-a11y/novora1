import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const SchoolContext = createContext();

export const useSchool = () => useContext(SchoolContext);

export const SchoolProvider = ({ children }) => {
    const { user } = useAuth();
    const [school, setSchool] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSchoolInfo = async () => {
            if (user && user.schoolId) {
                try {
                    const token = user.token;
                    const res = await fetch('/api/auth/school', {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        setSchool(data);
                    } else {
                        setSchool(null);
                    }
                } catch (err) {
                    console.error('Failed to fetch school details', err);
                    setSchool(null);
                }
            } else {
                setSchool(null);
            }
            setLoading(false);
        };

        fetchSchoolInfo();
    }, [user]);

    return (
        <SchoolContext.Provider value={{ school, loading }}>
            {children}
        </SchoolContext.Provider>
    );
};
