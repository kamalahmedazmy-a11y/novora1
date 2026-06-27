import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';
import { useLocale } from '../../context/LocaleContext';
import LanguageToggle from '../../components/common/LanguageToggle';
import NotificationBell from '../../components/common/NotificationBell';
import * as XLSX from 'xlsx';
import { Users, GraduationCap, Calendar, Clock, BookOpen, Clipboard, Plus, Eye, UserPlus, FileText, Search, MessageSquare, ClipboardList, Briefcase, Send, Radio, UserX, AlertTriangle, Trash2, Megaphone, ShieldAlert, Pin, DollarSign, Award, X, Printer } from 'lucide-react';

const SchoolDashboard = () => {
    const { user, logout } = useAuth();
    const { school, loading: schoolLoading } = useSchool();
    const { t } = useLocale();
    const [activeTab, setActiveTab] = useState('overview');

    // Data lists
    const [usersList, setUsersList] = useState([]);
    const [academicYears, setAcademicYears] = useState([]);
    const [classrooms, setClassrooms] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [schedules, setSchedules] = useState([]);
    const [attendanceReport, setAttendanceReport] = useState([]);

    // Dashboard feature states (Phase 1-3)
    const [classOverview, setClassOverview] = useState(null);   // current period per class
    const [teachers, setTeachers] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [taskForm, setTaskForm] = useState({ teacherId: '', description: '' });
    const [inbox, setInbox] = useState([]);
    const [msgSearch, setMsgSearch] = useState('');
    const [activeThread, setActiveThread] = useState(null);     // { parentId, parentName }
    const [thread, setThread] = useState([]);
    const [replyText, setReplyText] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState(null);
    const [staffList, setStaffList] = useState([]);

    // Substitutes / absences (Group A #1-2)
    const todayISO = new Date().toISOString().slice(0, 10);
    const [subDate, setSubDate] = useState(todayISO);
    const [absences, setAbsences] = useState([]);
    const [uncovered, setUncovered] = useState([]);
    const [conflicts, setConflicts] = useState([]);
    const [absenceForm, setAbsenceForm] = useState({ teacherId: '', reason: '' });

    // Announcements (#4) + Incidents (#5)
    const [announcements, setAnnouncements] = useState([]);
    const [annForm, setAnnForm] = useState({ title: '', body: '', audience: 'all', pinned: false });
    const [incidents, setIncidents] = useState([]);
    const [students, setStudents] = useState([]);
    const [incForm, setIncForm] = useState({ studentId: '', type: 'behavior', severity: 'low', description: '', actionTaken: '' });
    const [leaveRequests, setLeaveRequests] = useState([]);

    // Fees (#7) + Report card (#8)
    const [feeStructures, setFeeStructures] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [feeSummary, setFeeSummary] = useState(null);
    const [feeForm, setFeeForm] = useState({ gradeLevel: 1, term: 'Term1', label: 'Tuition', amount: '' });
    const [genFeeId, setGenFeeId] = useState('');
    const [reportCard, setReportCard] = useState(null); // modal data

    // Excel import (#B1)
    const [importRole, setImportRole] = useState('student');
    const [importRows, setImportRows] = useState([]);
    const [importResult, setImportResult] = useState(null);

    // Group C: calendar (#C2), homework (#C1), certificate (#C3)
    const [calEvents, setCalEvents] = useState([]);
    const [calForm, setCalForm] = useState({ title: '', description: '', date: todayISO, type: 'event', audience: 'all' });
    const [homeworkList, setHomeworkList] = useState([]);
    const [certData, setCertData] = useState(null);

    // Creation forms states
    const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'student', parentOf: '' });
    const [yearForm, setYearForm] = useState({ name: '', startDate: '', endDate: '', isActive: true });
    const [classForm, setClassForm] = useState({ academicYearId: '', name: '', homeroomTeacherId: '' });
    const [enrollForm, setEnrollForm] = useState({ studentId: '', classroomId: '', academicYearId: '' });
    const [scheduleForm, setScheduleForm] = useState({ teacherId: '', classroomId: '', subjectId: '', dayOfWeek: 1, startTime: '', endTime: '', room: '' });
    const [subjectForm, setSubjectForm] = useState({ title: '', description: '' });

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user, activeTab, subDate]);

    const fetchData = async () => {
        const token = user.token;
        const headers = { Authorization: `Bearer ${token}` };

        try {
            if (activeTab === 'users') {
                const res = await fetch('/api/school/users', { headers });
                if (res.ok) setUsersList(await res.json());
            } else if (activeTab === 'classrooms') {
                const resYears = await fetch('/api/school/academic-years', { headers });
                if (resYears.ok) {
                    const years = await resYears.json();
                    setAcademicYears(years);
                    // Select first active year in forms
                    const activeY = years.find(y => y.isActive);
                    if (activeY) {
                        setClassForm(prev => ({ ...prev, academicYearId: activeY._id }));
                        setEnrollForm(prev => ({ ...prev, academicYearId: activeY._id }));
                    }
                }
                const resClasses = await fetch('/api/school/classrooms', { headers });
                if (resClasses.ok) setClassrooms(await resClasses.json());
                const resTeachers = await fetch('/api/school/users?role=teacher', { headers });
                const resStudents = await fetch('/api/school/users?role=student', { headers });
                // We'll filter user lists from fetched users in state or just store
            } else if (activeTab === 'schedule') {
                const resSched = await fetch('/api/school/schedule', { headers });
                if (resSched.ok) setSchedules(await resSched.json());
                const resClasses = await fetch('/api/school/classrooms', { headers });
                if (resClasses.ok) setClassrooms(await resClasses.json());
                const resTeachers = await fetch('/api/school/users?role=teacher', { headers });
                if (resTeachers.ok) setUsersList(await resTeachers.json());
                const resSubjs = await fetch('/api/school/subjects', { headers });
                if (resSubjs.ok) setSubjects(await resSubjs.json());
            } else if (activeTab === 'reports') {
                const resRep = await fetch('/api/school/reports/attendance', { headers });
                if (resRep.ok) setAttendanceReport(await resRep.json());
            } else if (activeTab === 'overview') {
                const res = await fetch('/api/dashboard/classes', { headers });
                if (res.ok) setClassOverview(await res.json());
            } else if (activeTab === 'tasks') {
                const resT = await fetch('/api/dashboard/tasks', { headers });
                if (resT.ok) setTasks(await resT.json());
                const resTe = await fetch('/api/school/users?role=teacher', { headers });
                if (resTe.ok) setTeachers(await resTe.json());
            } else if (activeTab === 'messages') {
                // Unified messaging (ChatMessage) — connects admin ↔ parents ↔ teachers
                const resC = await fetch('/api/messages/contacts', { headers });
                const contacts = resC.ok ? await resC.json() : [];
                const resI = await fetch('/api/messages', { headers });
                const inboxRows = resI.ok ? await resI.json() : [];
                // merge: show every contact, enriched with last message + unread from inbox
                const byId = Object.fromEntries(inboxRows.map(r => [String(r.contactId), r]));
                const merged = contacts.map(c => ({
                    contactId: c.id, name: c.name, role: c.role,
                    lastBody: byId[String(c.id)]?.lastBody || '',
                    unread: byId[String(c.id)]?.unread || 0,
                    lastAt: byId[String(c.id)]?.lastAt || null,
                }));
                merged.sort((a, b) => (b.unread - a.unread) || ((b.lastAt ? 1 : 0) - (a.lastAt ? 1 : 0)));
                setInbox(merged);
            } else if (activeTab === 'staff') {
                const res = await fetch('/api/dashboard/staff', { headers });
                if (res.ok) setStaffList(await res.json());
            } else if (activeTab === 'substitutes') {
                const resTe = await fetch('/api/school/users?role=teacher', { headers });
                if (resTe.ok) setTeachers(await resTe.json());
                const resA = await fetch(`/api/staffing/absences?date=${subDate}`, { headers });
                if (resA.ok) setAbsences(await resA.json());
                const resU = await fetch(`/api/staffing/uncovered?date=${subDate}`, { headers });
                if (resU.ok) setUncovered((await resU.json()).periods || []);
                const resC = await fetch('/api/dashboard/schedule/conflicts', { headers });
                if (resC.ok) setConflicts((await resC.json()).conflicts || []);
            } else if (activeTab === 'announcements') {
                const res = await fetch('/api/announcements', { headers });
                if (res.ok) setAnnouncements(await res.json());
            } else if (activeTab === 'incidents') {
                const resI = await fetch('/api/incidents', { headers });
                if (resI.ok) setIncidents(await resI.json());
                const resS = await fetch('/api/school/users?role=student', { headers });
                if (resS.ok) setStudents(await resS.json());
            } else if (activeTab === 'leave') {
                const res = await fetch('/api/leave', { headers });
                if (res.ok) setLeaveRequests(await res.json());
            } else if (activeTab === 'calendar') {
                const res = await fetch('/api/calendar', { headers });
                if (res.ok) setCalEvents(await res.json());
            } else if (activeTab === 'homework') {
                const res = await fetch('/api/homework', { headers });
                if (res.ok) setHomeworkList(await res.json());
            } else if (activeTab === 'fees') {
                const resF = await fetch('/api/finance/fees', { headers });
                if (resF.ok) setFeeStructures(await resF.json());
                const resI = await fetch('/api/finance/invoices', { headers });
                if (resI.ok) setInvoices(await resI.json());
                const resS = await fetch('/api/finance/summary', { headers });
                if (resS.ok) setFeeSummary(await resS.json());
            }
        } catch (err) {
            console.error('Failed to load school dashboard tab:', activeTab, err);
        }
    };

    // Form handlers
    const handleUserCreate = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...userForm };
            if (payload.role === 'parent' && payload.parentOf) {
                payload.parentOf = payload.parentOf.split(',').map(s => s.trim());
            } else {
                delete payload.parentOf;
            }
            const res = await fetch('/api/school/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                setUserForm({ name: '', email: '', password: '', role: 'student', parentOf: '' });
                fetchData();
                alert('User created successfully!');
            } else {
                const data = await res.json();
                alert(data.message || 'Error creating user');
            }
        } catch (err) {
            alert('Failed to connect to server');
        }
    };

    const handleYearCreate = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/school/academic-years', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
                body: JSON.stringify(yearForm)
            });
            if (res.ok) {
                setYearForm({ name: '', startDate: '', endDate: '', isActive: true });
                fetchData();
            }
        } catch (err) {
            alert('Error');
        }
    };

    const handleClassCreate = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/school/classrooms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
                body: JSON.stringify(classForm)
            });
            if (res.ok) {
                setClassForm(prev => ({ ...prev, name: '', homeroomTeacherId: '' }));
                fetchData();
            }
        } catch (err) {
            alert('Error');
        }
    };

    const handleEnroll = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/school/enrollments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
                body: JSON.stringify(enrollForm)
            });
            if (res.ok) {
                setEnrollForm(prev => ({ ...prev, studentId: '' }));
                fetchData();
                alert('Student enrolled successfully!');
            }
        } catch (err) {
            alert('Error');
        }
    };

    const handleScheduleCreate = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/school/schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
                body: JSON.stringify(scheduleForm)
            });
            if (res.ok) {
                setScheduleForm({ teacherId: '', classroomId: '', subjectId: '', dayOfWeek: 1, startTime: '', endTime: '', room: '' });
                fetchData();
                alert('Schedule assigned!');
            } else {
                const data = await res.json();
                alert(data.message || 'Error saving schedule');
            }
        } catch (err) {
            alert('Error');
        }
    };

    const handleSubjectCreate = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/school/subjects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
                body: JSON.stringify(subjectForm)
            });
            if (res.ok) {
                setSubjectForm({ title: '', description: '' });
                fetchData();
                alert('Subject created successfully!');
            }
        } catch (err) {
            alert('Error');
        }
    };

    // ---- Phase 2.3: assign a task to a teacher (logs location automatically)
    const handleAssignTask = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/dashboard/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
                body: JSON.stringify(taskForm)
            });
            if (res.ok) {
                setTaskForm({ teacherId: '', description: '' });
                fetchData();
            } else {
                const d = await res.json();
                alert(d.message || 'Error assigning task');
            }
        } catch (err) { alert('Failed to connect to server'); }
    };

    const updateTaskStatus = async (id, status) => {
        await fetch(`/api/dashboard/tasks/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
            body: JSON.stringify({ status })
        });
        fetchData();
    };

    // ---- Unified messaging (ChatMessage)
    const openThread = async (parentId, parentName) => {
        setActiveThread({ parentId, parentName });
        const res = await fetch(`/api/messages/${parentId}`, {
            headers: { Authorization: `Bearer ${user.token}` }
        });
        if (res.ok) setThread(await res.json());
    };

    const handleSendReply = async (e) => {
        e.preventDefault();
        if (!replyText.trim() || !activeThread) return;
        const res = await fetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
            body: JSON.stringify({ toId: activeThread.parentId, body: replyText })
        });
        if (res.ok) {
            setReplyText('');
            openThread(activeThread.parentId, activeThread.parentName);
            fetchData();
        }
    };

    // ---- Phase 3: global search
    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        const res = await fetch(`/api/dashboard/search?q=${encodeURIComponent(searchQuery)}&limit=15`, {
            headers: { Authorization: `Bearer ${user.token}` }
        });
        if (res.ok) setSearchResults(await res.json());
    };

    // ---- Group A #1: absences + substitutes
    const authJson = { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` };
    const handleReportAbsent = async (e) => {
        e.preventDefault();
        if (!absenceForm.teacherId) return;
        const res = await fetch('/api/staffing/absences', {
            method: 'POST', headers: authJson,
            body: JSON.stringify({ ...absenceForm, date: subDate })
        });
        if (res.ok) { setAbsenceForm({ teacherId: '', reason: '' }); fetchData(); }
        else { const d = await res.json(); alert(d.message || 'Error'); }
    };
    const assignSub = async (scheduleId, substituteId) => {
        if (!substituteId) return;
        const res = await fetch('/api/staffing/substitutes', {
            method: 'POST', headers: authJson,
            body: JSON.stringify({ scheduleId, date: subDate, substituteId })
        });
        if (res.ok) fetchData();
        else { const d = await res.json(); alert(d.message || 'Error'); }
    };
    const removeSub = async (scheduleId) => {
        await fetch(`/api/staffing/substitutes/${scheduleId}?date=${subDate}`, { method: 'DELETE', headers: authJson });
        fetchData();
    };
    const removeAbsence = async (id) => {
        await fetch(`/api/staffing/absences/${id}`, { method: 'DELETE', headers: authJson });
        fetchData();
    };

    // ---- Group A #4 announcements + #5 incidents
    const postAnnouncement = async (e) => {
        e.preventDefault();
        const res = await fetch('/api/announcements', { method: 'POST', headers: authJson, body: JSON.stringify(annForm) });
        if (res.ok) { setAnnForm({ title: '', body: '', audience: 'all', pinned: false }); fetchData(); }
        else { const d = await res.json(); alert(d.message || 'Error'); }
    };
    const deleteAnnouncement = async (id) => {
        await fetch(`/api/announcements/${id}`, { method: 'DELETE', headers: authJson });
        fetchData();
    };
    const saveIncident = async (e) => {
        e.preventDefault();
        const res = await fetch('/api/incidents', { method: 'POST', headers: authJson, body: JSON.stringify(incForm) });
        if (res.ok) { setIncForm({ studentId: '', type: 'behavior', severity: 'low', description: '', actionTaken: '' }); fetchData(); }
        else { const d = await res.json(); alert(d.message || 'Error'); }
    };
    const deleteIncident = async (id) => {
        await fetch(`/api/incidents/${id}`, { method: 'DELETE', headers: authJson });
        fetchData();
    };
    const reviewLeave = async (id, status) => {
        await fetch(`/api/leave/${id}`, { method: 'PATCH', headers: authJson, body: JSON.stringify({ status }) });
        fetchData();
    };
    // ---- Group A #7 fees
    const createFee = async (e) => {
        e.preventDefault();
        const res = await fetch('/api/finance/fees', { method: 'POST', headers: authJson, body: JSON.stringify({ ...feeForm, amount: Number(feeForm.amount) }) });
        if (res.ok) { setFeeForm({ gradeLevel: 1, term: 'Term1', label: 'Tuition', amount: '' }); fetchData(); }
        else { const d = await res.json(); alert(d.message || 'Error'); }
    };
    const generateInvoices = async () => {
        if (!genFeeId) return;
        const res = await fetch('/api/finance/invoices/generate', { method: 'POST', headers: authJson, body: JSON.stringify({ feeStructureId: genFeeId, dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10) }) });
        if (res.ok) { const d = await res.json(); alert(`${d.created} ${t('school.fees.invoices')}`); fetchData(); }
    };
    const payInvoice = async (inv) => {
        await fetch(`/api/finance/invoices/${inv._id}/pay`, { method: 'PATCH', headers: authJson, body: JSON.stringify({ amount: inv.amount - (inv.paidAmount || 0) }) });
        fetchData();
    };
    // ---- Group A #8 report card
    const openReportCard = async (studentId) => {
        const res = await fetch(`/api/reportcard/${studentId}`, { headers: { Authorization: `Bearer ${user.token}` } });
        if (res.ok) setReportCard(await res.json());
    };
    // ---- Group C: calendar + homework + certificate
    const createEvent = async (e) => {
        e.preventDefault();
        const res = await fetch('/api/calendar', { method: 'POST', headers: authJson, body: JSON.stringify(calForm) });
        if (res.ok) { setCalForm({ title: '', description: '', date: todayISO, type: 'event', audience: 'all' }); fetchData(); }
        else { const d = await res.json(); alert(d.message || 'Error'); }
    };
    const deleteEvent = async (id) => { await fetch(`/api/calendar/${id}`, { method: 'DELETE', headers: authJson }); fetchData(); };
    const openCertificate = () => {
        if (!reportCard) return;
        setCertData({ name: reportCard.student.name, class: reportCard.student.class, average: reportCard.overallAverage });
    };

    // ---- Group B #1 Excel import
    const handleImportFile = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImportResult(null);
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const wb = XLSX.read(ev.target.result, { type: 'array' });
                const sheet = wb.Sheets[wb.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
                // normalize header casing/spacing to the exact keys the API expects
                const keyMap = { name: 'name', email: 'email', classname: 'className', class: 'className', childemail: 'childEmail', child: 'childEmail' };
                const norm = rows.map(r => {
                    const o = {};
                    for (const [k, v] of Object.entries(r)) {
                        const key = keyMap[String(k).trim().toLowerCase().replace(/\s+/g, '')] || String(k).trim();
                        o[key] = typeof v === 'string' ? v.trim() : v;
                    }
                    return o;
                });
                setImportRows(norm);
            } catch { alert('Could not read file'); }
        };
        reader.readAsArrayBuffer(file);
    };
    const runImport = async () => {
        if (!importRows.length) return;
        const res = await fetch('/api/import/users', { method: 'POST', headers: authJson, body: JSON.stringify({ role: importRole, rows: importRows }) });
        const d = await res.json();
        if (res.ok) { setImportResult(d); setImportRows([]); }
        else alert(d.message || 'Import failed');
    };

    const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <div className="school-container">
            <header className="school-header glass">
                <div className="header-content">
                    <div className="logo-area">
                        <img src="/novora-logo.png" alt="Novora" className="brand-logo" />
                        <div className="brand-divider" />
                        <h1 className="logo-text">{school ? school.name : t('school.panel')}</h1>
                    </div>
                    <div className="user-area">
                        <LanguageToggle />
                        <NotificationBell />
                        <div className="role-tag">{t('roles.school_admin')}</div>
                        <span className="user-name">{user.name}</span>
                        <button onClick={logout} className="btn-logout">{t('common.logout')}</button>
                    </div>
                </div>
            </header>

            <div className="school-layout">
                <aside className="school-sidebar glass">
                    <nav className="nav-menu">
                        <button className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
                            <Radio size={18} /> {t('school.nav.overview')}
                        </button>
                        <button className={`nav-item ${activeTab === 'tasks' ? 'active' : ''}`} onClick={() => setActiveTab('tasks')}>
                            <ClipboardList size={18} /> {t('school.nav.tasks')}
                        </button>
                        <button className={`nav-item ${activeTab === 'substitutes' ? 'active' : ''}`} onClick={() => setActiveTab('substitutes')}>
                            <UserX size={18} /> {t('school.subs.nav')}
                        </button>
                        <button className={`nav-item ${activeTab === 'messages' ? 'active' : ''}`} onClick={() => { setActiveTab('messages'); setActiveThread(null); }}>
                            <MessageSquare size={18} /> {t('school.nav.messages')}
                        </button>
                        <button className={`nav-item ${activeTab === 'announcements' ? 'active' : ''}`} onClick={() => setActiveTab('announcements')}>
                            <Megaphone size={18} /> {t('school.ann.nav')}
                        </button>
                        <button className={`nav-item ${activeTab === 'incidents' ? 'active' : ''}`} onClick={() => setActiveTab('incidents')}>
                            <ShieldAlert size={18} /> {t('school.inc.nav')}
                        </button>
                        <button className={`nav-item ${activeTab === 'leave' ? 'active' : ''}`} onClick={() => setActiveTab('leave')}>
                            <Calendar size={18} /> {t('school.leave.nav')}
                        </button>
                        <button className={`nav-item ${activeTab === 'fees' ? 'active' : ''}`} onClick={() => setActiveTab('fees')}>
                            <DollarSign size={18} /> {t('school.fees.nav')}
                        </button>
                        <button className={`nav-item ${activeTab === 'calendar' ? 'active' : ''}`} onClick={() => setActiveTab('calendar')}>
                            <Calendar size={18} /> {t('school.cal.nav')}
                        </button>
                        <button className={`nav-item ${activeTab === 'homework' ? 'active' : ''}`} onClick={() => setActiveTab('homework')}>
                            <BookOpen size={18} /> {t('school.hw.nav')}
                        </button>
                        <button className={`nav-item ${activeTab === 'search' ? 'active' : ''}`} onClick={() => setActiveTab('search')}>
                            <Search size={18} /> {t('school.nav.search')}
                        </button>
                        <button className={`nav-item ${activeTab === 'staff' ? 'active' : ''}`} onClick={() => setActiveTab('staff')}>
                            <Briefcase size={18} /> {t('school.nav.staff')}
                        </button>
                        <div className="nav-divider" />
                        <button className={`nav-item ${activeTab === 'import' ? 'active' : ''}`} onClick={() => { setActiveTab('import'); setImportResult(null); }}>
                            <UserPlus size={18} /> {t('school.imp.nav')}
                        </button>
                        <button className={`nav-item ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
                            <Users size={18} /> {t('school.nav.users')}
                        </button>
                        <button className={`nav-item ${activeTab === 'classrooms' ? 'active' : ''}`} onClick={() => setActiveTab('classrooms')}>
                            <GraduationCap size={18} /> {t('school.nav.classes')}
                        </button>
                        <button className={`nav-item ${activeTab === 'schedule' ? 'active' : ''}`} onClick={() => setActiveTab('schedule')}>
                            <Clock size={18} /> {t('school.nav.schedule')}
                        </button>
                        <button className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}>
                            <FileText size={18} /> {t('school.nav.reports')}
                        </button>
                    </nav>
                </aside>

                <main className="school-main">
                    {/* ===== PHASE 1.3/1.4 — LIVE OVERVIEW ===== */}
                    {activeTab === 'overview' && (
                        <div className="tab-pane fade-in">
                            <div className="overview-head">
                                <h2>{t('school.overview.title')}</h2>
                                {classOverview && (
                                    <div className="as-of">
                                        <strong>{classOverview.totalClasses}</strong> {t('school.overview.classes')} &nbsp;·&nbsp;
                                        {t('school.overview.now')}: {classOverview.asOf.day} {classOverview.asOf.time}
                                    </div>
                                )}
                            </div>
                            <div className="overview-grid">
                                {classOverview && classOverview.classes.map(c => (
                                    <div key={c.classroomId} className="card glass class-card">
                                        <div className="class-card-top">
                                            <h4>{c.name}</h4>
                                            <span className="student-count"><Users size={14} /> {c.studentCount}</span>
                                        </div>
                                        <div className="subtext">{t('school.overview.homeroom')}: {c.homeroomTeacher ? c.homeroomTeacher.name : '—'}</div>
                                        {c.currentPeriod ? (
                                            <div className="now-playing">
                                                <span className="live-dot" /> {t('school.overview.inSession')}
                                                <div className="np-subject">{c.currentPeriod.subject}</div>
                                                <div className="np-teacher">{c.currentPeriod.teacher}</div>
                                                <div className="np-time">{c.currentPeriod.startTime}–{c.currentPeriod.endTime} · {c.currentPeriod.room}</div>
                                            </div>
                                        ) : (
                                            <div className="no-class">{t('school.overview.noClass')}</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            {classOverview && classOverview.classes.every(c => !c.currentPeriod) && (
                                <p className="hint">{t('school.overview.hint')}</p>
                            )}
                        </div>
                    )}

                    {/* ===== PHASE 2.3 — TEACHER TASKS ===== */}
                    {activeTab === 'tasks' && (
                        <div className="tab-pane fade-in">
                            <div className="grid-split">
                                <div className="card glass">
                                    <h3><ClipboardList size={20} /> {t('school.tasks.assign')}</h3>
                                    <form onSubmit={handleAssignTask} className="school-form">
                                        <div className="form-group">
                                            <label>{t('school.tasks.teacher')}</label>
                                            <select value={taskForm.teacherId} onChange={(e) => setTaskForm(p => ({ ...p, teacherId: e.target.value }))} required>
                                                <option value="">{t('school.tasks.selectTeacher')}</option>
                                                {teachers.map(te => <option key={te._id} value={te._id}>{te.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>{t('school.tasks.description')}</label>
                                            <textarea rows={3} value={taskForm.description} onChange={(e) => setTaskForm(p => ({ ...p, description: e.target.value }))} required />
                                        </div>
                                        <p className="hint">{t('school.tasks.autoLog')}</p>
                                        <button type="submit" className="btn-primary"><Send size={16} /> {t('school.tasks.send')}</button>
                                    </form>
                                </div>
                                <div className="card glass">
                                    <h3>{t('school.tasks.list')}</h3>
                                    <div className="list-container">
                                        <table className="school-table">
                                            <thead><tr><th>{t('school.tasks.teacher')}</th><th>{t('school.tasks.task')}</th><th>{t('school.tasks.location')}</th><th>{t('school.tasks.status')}</th></tr></thead>
                                            <tbody>
                                                {tasks.map(tk => (
                                                    <tr key={tk._id}>
                                                        <td>{tk.teacherId?.name}</td>
                                                        <td>{tk.description}</td>
                                                        <td className="loc-note">{tk.locationNote}</td>
                                                        <td>
                                                            <select className="status-select" value={tk.status} onChange={(e) => updateTaskStatus(tk._id, e.target.value)}>
                                                                <option value="pending">{t('school.status.pending')}</option>
                                                                <option value="in_progress">{t('school.status.in_progress')}</option>
                                                                <option value="done">{t('school.status.done')}</option>
                                                                <option value="cancelled">{t('school.status.cancelled')}</option>
                                                            </select>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ===== GROUP A #1-2 — ABSENCE & SUBSTITUTES ===== */}
                    {activeTab === 'substitutes' && (
                        <div className="tab-pane fade-in">
                            <div className="overview-head">
                                <h2><UserX size={22} style={{ verticalAlign: '-4px' }} /> {t('school.subs.nav')}</h2>
                                <div className="as-of">
                                    {t('school.subs.date')}:&nbsp;
                                    <input type="date" className="date-input" value={subDate} onChange={(e) => setSubDate(e.target.value)} />
                                </div>
                            </div>

                            {conflicts.length > 0 && (
                                <div className="conflict-banner">
                                    <AlertTriangle size={18} />
                                    <div>
                                        <strong>{t('school.subs.conflictsTitle')} ({conflicts.length})</strong>
                                        {conflicts.slice(0, 4).map((c, i) => (
                                            <div key={i} className="conflict-line">
                                                {c.entity} — {c.day} {c.time} ({t('school.subs.conflictDouble')}: {c.slots.map(s => s.class).join(', ')})
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="grid-split">
                                <div className="card glass">
                                    <h3><UserX size={20} /> {t('school.subs.report')}</h3>
                                    <form onSubmit={handleReportAbsent} className="school-form">
                                        <div className="form-group">
                                            <label>{t('school.subs.teacher')}</label>
                                            <select value={absenceForm.teacherId} onChange={(e) => setAbsenceForm(p => ({ ...p, teacherId: e.target.value }))} required>
                                                <option value="">{t('school.subs.selectTeacher')}</option>
                                                {teachers.map(te => <option key={te._id} value={te._id}>{te.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>{t('school.subs.reason')}</label>
                                            <input type="text" value={absenceForm.reason} onChange={(e) => setAbsenceForm(p => ({ ...p, reason: e.target.value }))} />
                                        </div>
                                        <button type="submit" className="btn-primary"><UserX size={16} /> {t('school.subs.reportBtn')}</button>
                                    </form>

                                    <h3 style={{ marginTop: '1.5rem' }}>{t('school.subs.absentList')}</h3>
                                    {absences.length === 0 ? (
                                        <p className="subtext">{t('school.subs.noAbsent')}</p>
                                    ) : absences.map(a => (
                                        <div key={a._id} className="absent-row">
                                            <span><strong>{a.teacherId?.name}</strong>{a.reason ? ` — ${a.reason}` : ''}</span>
                                            <button className="icon-btn" onClick={() => removeAbsence(a._id)} title={t('school.subs.undo')}><Trash2 size={15} /></button>
                                        </div>
                                    ))}
                                </div>

                                <div className="card glass">
                                    <h3><Clock size={20} /> {t('school.subs.uncovered')}</h3>
                                    {uncovered.length === 0 ? (
                                        <p className="subtext">{t('school.subs.allCovered')}</p>
                                    ) : (
                                        <div className="list-container">
                                            <table className="school-table">
                                                <thead><tr><th>{t('school.subs.class')}</th><th>{t('school.subs.time')}</th><th>{t('school.subs.original')}</th><th>{t('school.subs.assign')}</th></tr></thead>
                                                <tbody>
                                                    {uncovered.map(p => (
                                                        <tr key={p.scheduleId}>
                                                            <td>{p.class}<div className="subtext">{p.subject}</div></td>
                                                            <td>{p.time}</td>
                                                            <td>{p.originalTeacher}</td>
                                                            <td>
                                                                {p.covered ? (
                                                                    <span className="covered-tag">
                                                                        ✅ {p.substitute?.name}
                                                                        <button className="icon-btn" onClick={() => removeSub(p.scheduleId)} title={t('school.subs.remove')}><Trash2 size={13} /></button>
                                                                    </span>
                                                                ) : (
                                                                    <select className="status-select" defaultValue="" onChange={(e) => assignSub(p.scheduleId, e.target.value)}>
                                                                        <option value="">{t('school.subs.assign')}</option>
                                                                        {p.freeTeachers.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                                                    </select>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ===== PHASE 2.4 — PARENT MESSAGES ===== */}
                    {activeTab === 'messages' && (
                        <div className="tab-pane fade-in">
                            <div className="messages-layout">
                                <div className="card glass inbox-col">
                                    <h3><MessageSquare size={20} /> {t('school.messages.inbox')}</h3>
                                    <input type="text" className="msg-search" placeholder={`🔍 ${t('common.search')}`} value={msgSearch} onChange={(e) => setMsgSearch(e.target.value)} />
                                    <div className="inbox-list">
                                        {inbox.length === 0 && <p className="subtext">{t('school.messages.none')}</p>}
                                        {inbox.filter(m => m.name.toLowerCase().includes(msgSearch.toLowerCase())).map(m => (
                                            <button key={m.contactId} className={`inbox-item ${activeThread?.parentId === m.contactId ? 'active' : ''}`} onClick={() => openThread(m.contactId, m.name)}>
                                                <div className="inbox-top">
                                                    <strong>{m.name}</strong>
                                                    {m.unread > 0 && <span className="unread-badge">{m.unread}</span>}
                                                </div>
                                                <div className="inbox-preview"><span className={`role-pill ${m.role}`} style={{ fontSize: '0.62rem' }}>{m.role}</span> {m.lastBody}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="card glass thread-col">
                                    {activeThread ? (
                                        <>
                                            <h3>{activeThread.parentName}</h3>
                                            <div className="thread-box">
                                                {thread.map(msg => (
                                                    <div key={msg._id} className={`bubble ${msg.mine ? 'mine' : 'theirs'}`}>
                                                        <div>{msg.body}</div>
                                                        <div className="bubble-time">{new Date(msg.createdAt).toLocaleString()}</div>
                                                    </div>
                                                ))}
                                            </div>
                                            <form onSubmit={handleSendReply} className="reply-bar">
                                                <input type="text" placeholder={t('school.messages.type')} value={replyText} onChange={(e) => setReplyText(e.target.value)} />
                                                <button type="submit" className="btn-primary"><Send size={16} /></button>
                                            </form>
                                        </>
                                    ) : (
                                        <div className="empty-thread">{t('school.messages.select')}</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ===== GROUP A #4 — ANNOUNCEMENTS ===== */}
                    {activeTab === 'announcements' && (
                        <div className="tab-pane fade-in">
                            <div className="grid-split">
                                <div className="card glass">
                                    <h3><Megaphone size={20} /> {t('school.ann.create')}</h3>
                                    <form onSubmit={postAnnouncement} className="school-form">
                                        <div className="form-group">
                                            <label>{t('school.ann.title')}</label>
                                            <input type="text" value={annForm.title} onChange={(e) => setAnnForm(p => ({ ...p, title: e.target.value }))} required />
                                        </div>
                                        <div className="form-group">
                                            <label>{t('school.ann.body')}</label>
                                            <textarea rows={4} value={annForm.body} onChange={(e) => setAnnForm(p => ({ ...p, body: e.target.value }))} required />
                                        </div>
                                        <div className="form-group">
                                            <label>{t('school.ann.audience')}</label>
                                            <select value={annForm.audience} onChange={(e) => setAnnForm(p => ({ ...p, audience: e.target.value }))}>
                                                <option value="all">{t('school.ann.all')}</option>
                                                <option value="teachers">{t('school.ann.teachers')}</option>
                                                <option value="parents">{t('school.ann.parents')}</option>
                                                <option value="students">{t('school.ann.students')}</option>
                                            </select>
                                        </div>
                                        <label className="checkbox-row">
                                            <input type="checkbox" checked={annForm.pinned} onChange={(e) => setAnnForm(p => ({ ...p, pinned: e.target.checked }))} />
                                            <Pin size={14} /> {t('school.ann.pin')}
                                        </label>
                                        <button type="submit" className="btn-primary"><Send size={16} /> {t('school.ann.post')}</button>
                                    </form>
                                </div>
                                <div className="card glass">
                                    <h3>{t('school.ann.list')}</h3>
                                    {announcements.length === 0 ? <p className="subtext">{t('school.ann.none')}</p> : announcements.map(a => (
                                        <div key={a._id} className="ann-card">
                                            <div className="ann-head">
                                                <strong>{a.pinned && <Pin size={13} style={{ verticalAlign: '-1px' }} />} {a.title}</strong>
                                                <button className="icon-btn" onClick={() => deleteAnnouncement(a._id)}><Trash2 size={14} /></button>
                                            </div>
                                            <div className="subtext" style={{ margin: '0.3rem 0' }}>{a.body}</div>
                                            <span className="type-pill teacher">{t('school.ann.' + (a.audience === 'all' ? 'all' : a.audience))}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ===== GROUP A #5 — INCIDENTS ===== */}
                    {activeTab === 'incidents' && (
                        <div className="tab-pane fade-in">
                            <div className="grid-split">
                                <div className="card glass">
                                    <h3><ShieldAlert size={20} /> {t('school.inc.log')}</h3>
                                    <form onSubmit={saveIncident} className="school-form">
                                        <div className="form-group">
                                            <label>{t('school.inc.student')}</label>
                                            <select value={incForm.studentId} onChange={(e) => setIncForm(p => ({ ...p, studentId: e.target.value }))} required>
                                                <option value="">{t('school.inc.selectStudent')}</option>
                                                {students.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="form-row">
                                            <select value={incForm.type} onChange={(e) => setIncForm(p => ({ ...p, type: e.target.value }))}>
                                                <option value="behavior">behavior</option>
                                                <option value="discipline">discipline</option>
                                                <option value="health">health</option>
                                                <option value="achievement">achievement</option>
                                                <option value="other">other</option>
                                            </select>
                                            <select value={incForm.severity} onChange={(e) => setIncForm(p => ({ ...p, severity: e.target.value }))}>
                                                <option value="low">low</option>
                                                <option value="medium">medium</option>
                                                <option value="high">high</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>{t('school.inc.desc')}</label>
                                            <textarea rows={3} value={incForm.description} onChange={(e) => setIncForm(p => ({ ...p, description: e.target.value }))} required />
                                        </div>
                                        <div className="form-group">
                                            <label>{t('school.inc.action')}</label>
                                            <input type="text" value={incForm.actionTaken} onChange={(e) => setIncForm(p => ({ ...p, actionTaken: e.target.value }))} />
                                        </div>
                                        <button type="submit" className="btn-primary"><Send size={16} /> {t('school.inc.save')}</button>
                                    </form>
                                </div>
                                <div className="card glass">
                                    <h3>{t('school.inc.list')}</h3>
                                    <div className="list-container">
                                        <table className="school-table">
                                            <thead><tr><th>{t('school.inc.student')}</th><th>{t('school.inc.type')}</th><th>{t('school.inc.desc')}</th><th></th></tr></thead>
                                            <tbody>
                                                {incidents.length === 0 && <tr><td colSpan={4} className="subtext">{t('school.inc.none')}</td></tr>}
                                                {incidents.map(it => (
                                                    <tr key={it._id}>
                                                        <td>{it.studentId?.name}</td>
                                                        <td><span className={`sev-pill sev-${it.severity}`}>{it.type}</span></td>
                                                        <td>{it.description}<div className="subtext">{it.actionTaken}</div></td>
                                                        <td><button className="icon-btn" onClick={() => deleteIncident(it._id)}><Trash2 size={14} /></button></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ===== GROUP C #2 — CALENDAR ===== */}
                    {activeTab === 'calendar' && (
                        <div className="tab-pane fade-in">
                            <div className="grid-split">
                                <div className="card glass">
                                    <h3><Calendar size={20} /> {t('school.cal.create')}</h3>
                                    <form onSubmit={createEvent} className="school-form">
                                        <div className="form-group"><label>{t('school.cal.title')}</label>
                                            <input type="text" value={calForm.title} onChange={(e) => setCalForm(p => ({ ...p, title: e.target.value }))} required /></div>
                                        <div className="form-row">
                                            <input type="date" value={calForm.date} onChange={(e) => setCalForm(p => ({ ...p, date: e.target.value }))} required />
                                            <select value={calForm.type} onChange={(e) => setCalForm(p => ({ ...p, type: e.target.value }))}>
                                                <option value="event">{t('school.cal.event')}</option>
                                                <option value="holiday">{t('school.cal.holiday')}</option>
                                                <option value="exam">{t('school.cal.exam')}</option>
                                                <option value="meeting">{t('school.cal.meeting')}</option>
                                            </select>
                                        </div>
                                        <div className="form-group"><label>{t('school.cal.audience')}</label>
                                            <select value={calForm.audience} onChange={(e) => setCalForm(p => ({ ...p, audience: e.target.value }))}>
                                                <option value="all">{t('school.ann.all')}</option>
                                                <option value="teachers">{t('school.ann.teachers')}</option>
                                                <option value="parents">{t('school.ann.parents')}</option>
                                                <option value="students">{t('school.ann.students')}</option>
                                            </select></div>
                                        <div className="form-group"><label>{t('school.cal.desc')}</label>
                                            <textarea rows={2} value={calForm.description} onChange={(e) => setCalForm(p => ({ ...p, description: e.target.value }))} /></div>
                                        <button type="submit" className="btn-primary"><Plus size={16} /> {t('school.cal.add')}</button>
                                    </form>
                                </div>
                                <div className="card glass">
                                    <h3>{t('school.cal.upcoming')}</h3>
                                    {calEvents.length === 0 ? <p className="subtext">{t('school.cal.none')}</p> : calEvents.map(ev => (
                                        <div key={ev._id} className="absent-row">
                                            <span><span className={`sev-pill cal-${ev.type}`}>{t('school.cal.' + ev.type)}</span> <strong>{ev.title}</strong> · {new Date(ev.date).toLocaleDateString()}</span>
                                            <button className="icon-btn" onClick={() => deleteEvent(ev._id)}><Trash2 size={14} /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ===== GROUP C #1 — HOMEWORK (admin overview) ===== */}
                    {activeTab === 'homework' && (
                        <div className="tab-pane fade-in">
                            <div className="card glass">
                                <h3><BookOpen size={20} /> {t('school.hw.list')}</h3>
                                <div className="list-container">
                                    <table className="school-table">
                                        <thead><tr><th>{t('school.hw.title')}</th><th>{t('school.hw.class')}</th><th>{t('school.hw.subject')}</th><th>{t('school.hw.teacher')}</th><th>{t('school.hw.due')}</th></tr></thead>
                                        <tbody>
                                            {homeworkList.length === 0 && <tr><td colSpan={5} className="subtext">{t('school.hw.none')}</td></tr>}
                                            {homeworkList.map(h => (
                                                <tr key={h._id}>
                                                    <td>{h.title}<div className="subtext">{h.description}</div></td>
                                                    <td>{h.classroomId?.name}</td>
                                                    <td>{h.subjectId?.title || '—'}</td>
                                                    <td>{h.teacherId?.name}</td>
                                                    <td>{h.dueDate ? new Date(h.dueDate).toLocaleDateString() : '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ===== GROUP B #1 — EXCEL IMPORT ===== */}
                    {activeTab === 'import' && (
                        <div className="tab-pane fade-in">
                            <div className="card glass">
                                <h3><UserPlus size={20} /> {t('school.imp.nav')}</h3>
                                <p className="hint">{t('school.imp.hint')}</p>
                                <div className="form-row" style={{ alignItems: 'center', marginBottom: '1rem' }}>
                                    <select className="status-select" value={importRole} onChange={(e) => setImportRole(e.target.value)}>
                                        <option value="student">{t('school.ann.students')}</option>
                                        <option value="teacher">{t('school.ann.teachers')}</option>
                                        <option value="parent">{t('school.ann.parents')}</option>
                                    </select>
                                    <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImportFile} />
                                </div>

                                {importRows.length > 0 && (
                                    <>
                                        <div className="subtext" style={{ marginBottom: '0.5rem' }}><strong>{importRows.length}</strong> {t('school.imp.detected')}</div>
                                        <div className="list-container">
                                            <table className="school-table">
                                                <thead><tr><th>{t('school.imp.name')}</th><th>{t('school.imp.email')}</th><th>{t('school.imp.extra')}</th></tr></thead>
                                                <tbody>
                                                    {importRows.slice(0, 5).map((r, i) => (
                                                        <tr key={i}><td>{r.name}</td><td>{r.email}</td><td className="subtext">{r.className || r.childEmail || ''}</td></tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        <button className="btn-primary" style={{ marginTop: '1rem' }} onClick={runImport}><UserPlus size={16} /> {t('school.imp.importBtn')} ({importRows.length})</button>
                                    </>
                                )}

                                {importResult && (
                                    <div className="import-result">
                                        ✅ {importResult.created} {t('school.imp.created')} · {importResult.skipped} {t('school.imp.skipped')}
                                        {importResult.errors?.length ? ` · ${importResult.errors.length} ${t('school.imp.issues')}` : ''}
                                        {importResult.errors?.slice(0, 5).map((e, i) => <div key={i} className="subtext">• {e.row}: {e.message}</div>)}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ===== GROUP A #7 — FEES & FINANCE ===== */}
                    {activeTab === 'fees' && (
                        <div className="tab-pane fade-in">
                            {feeSummary && (
                                <div className="fee-stats">
                                    <div className="fee-stat"><div className="fs-val">{feeSummary.totalInvoiced.toLocaleString()}</div><div className="fs-lbl">{t('school.fees.invoiced')}</div></div>
                                    <div className="fee-stat green"><div className="fs-val">{feeSummary.totalCollected.toLocaleString()}</div><div className="fs-lbl">{t('school.fees.collected')}</div></div>
                                    <div className="fee-stat amber"><div className="fs-val">{feeSummary.totalOutstanding.toLocaleString()}</div><div className="fs-lbl">{t('school.fees.outstanding')}</div></div>
                                    <div className="fee-stat red"><div className="fs-val">{feeSummary.overdueCount}</div><div className="fs-lbl">{t('school.fees.overdue')}</div></div>
                                </div>
                            )}
                            <div className="grid-split">
                                <div className="card glass">
                                    <h3><DollarSign size={20} /> {t('school.fees.createFee')}</h3>
                                    <form onSubmit={createFee} className="school-form">
                                        <div className="form-row">
                                            <input type="number" placeholder={t('school.fees.grade')} value={feeForm.gradeLevel} onChange={(e) => setFeeForm(p => ({ ...p, gradeLevel: e.target.value }))} required />
                                            <input type="text" placeholder={t('school.fees.term')} value={feeForm.term} onChange={(e) => setFeeForm(p => ({ ...p, term: e.target.value }))} required />
                                        </div>
                                        <div className="form-row">
                                            <input type="text" placeholder={t('school.fees.label')} value={feeForm.label} onChange={(e) => setFeeForm(p => ({ ...p, label: e.target.value }))} />
                                            <input type="number" placeholder={t('school.fees.amount')} value={feeForm.amount} onChange={(e) => setFeeForm(p => ({ ...p, amount: e.target.value }))} required />
                                        </div>
                                        <button type="submit" className="btn-primary"><Plus size={16} /> {t('school.fees.create')}</button>
                                    </form>
                                    <h3 style={{ marginTop: '1.4rem' }}>{t('school.fees.generate')}</h3>
                                    <div className="form-row">
                                        <select className="status-select" style={{ flexGrow: 1 }} value={genFeeId} onChange={(e) => setGenFeeId(e.target.value)}>
                                            <option value="">{t('school.fees.selectFee')}</option>
                                            {feeStructures.map(f => <option key={f._id} value={f._id}>{`G${f.gradeLevel} · ${f.label} · ${f.term} · ${f.amount}`}</option>)}
                                        </select>
                                        <button className="btn-primary" onClick={generateInvoices}>{t('school.fees.genBtn')}</button>
                                    </div>
                                </div>
                                <div className="card glass">
                                    <h3>{t('school.fees.invoices')}</h3>
                                    <div className="list-container" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                                        <table className="school-table">
                                            <thead><tr><th>{t('school.fees.student')}</th><th>{t('school.fees.amount')}</th><th>{t('school.fees.status')}</th><th></th></tr></thead>
                                            <tbody>
                                                {invoices.length === 0 && <tr><td colSpan={4} className="subtext">{t('school.fees.none')}</td></tr>}
                                                {invoices.map(inv => (
                                                    <tr key={inv._id}>
                                                        <td>{inv.studentId?.name}<div className="subtext">{inv.description}</div></td>
                                                        <td>{inv.amount}{inv.paidAmount ? <div className="subtext">{inv.paidAmount} paid</div> : null}</td>
                                                        <td><span className={`sev-pill inv-${inv.status}`}>{inv.status}</span></td>
                                                        <td>{inv.status !== 'paid' && <button className="mini-btn approve" onClick={() => payInvoice(inv)}>{t('school.fees.pay')}</button>}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ===== GROUP A #6 — LEAVE REQUESTS ===== */}
                    {activeTab === 'leave' && (
                        <div className="tab-pane fade-in">
                            <div className="card glass">
                                <h3><Calendar size={20} /> {t('school.leave.nav')}</h3>
                                <div className="list-container">
                                    <table className="school-table">
                                        <thead><tr><th>{t('school.leave.requester')}</th><th>{t('school.leave.dates')}</th><th>{t('school.leave.reason')}</th><th>{t('school.leave.status')}</th><th></th></tr></thead>
                                        <tbody>
                                            {leaveRequests.length === 0 && <tr><td colSpan={5} className="subtext">{t('school.leave.none')}</td></tr>}
                                            {leaveRequests.map(lr => (
                                                <tr key={lr._id}>
                                                    <td>{lr.requesterId?.name}</td>
                                                    <td>{new Date(lr.fromDate).toLocaleDateString()} → {new Date(lr.toDate).toLocaleDateString()}</td>
                                                    <td>{lr.reason || '—'}</td>
                                                    <td><span className={`sev-pill leave-${lr.status}`}>{t('school.leave.' + lr.status)}</span></td>
                                                    <td>
                                                        {lr.status === 'pending' && (
                                                            <span style={{ display: 'inline-flex', gap: '0.4rem' }}>
                                                                <button className="mini-btn approve" onClick={() => reviewLeave(lr._id, 'approved')}>{t('school.leave.approve')}</button>
                                                                <button className="mini-btn reject" onClick={() => reviewLeave(lr._id, 'rejected')}>{t('school.leave.reject')}</button>
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ===== PHASE 3 — GLOBAL SEARCH ===== */}
                    {activeTab === 'search' && (
                        <div className="tab-pane fade-in">
                            <div className="card glass">
                                <h3><Search size={20} /> {t('school.search.title')}</h3>
                                <form onSubmit={handleSearch} className="search-bar">
                                    <input type="text" placeholder={t('school.search.placeholder')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} autoFocus />
                                    <button type="submit" className="btn-primary"><Search size={16} /> {t('school.search.button')}</button>
                                </form>
                                {searchResults && (
                                    <div className="search-results">
                                        <div className="subtext mb-4">{searchResults.count} {t('school.search.results')} "{searchResults.query}"</div>
                                        {searchResults.results.length === 0 && <p className="subtext">{t('school.search.noMatches')}</p>}
                                        {searchResults.results.map((r, i) => (
                                            <div key={i} className="result-item">
                                                <span className={`type-pill ${r.type}`}>{t(`school.types.${r.type}`)}</span>
                                                <div className="result-body">
                                                    <strong>{r.name}</strong>
                                                    <div className="subtext">{r.info}</div>
                                                </div>
                                                {r.type === 'student' && (
                                                    <button className="mini-btn approve" onClick={() => openReportCard(r.id)}><Award size={13} /> {t('school.report.view')}</button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ===== GROUP C #2 — CALENDAR ===== */}
                    {activeTab === 'calendar' && (
                        <div className="tab-pane fade-in">
                            <div className="grid-split">
                                <div className="card glass">
                                    <h3><Calendar size={20} /> {t('school.cal.create')}</h3>
                                    <form onSubmit={createEvent} className="school-form">
                                        <div className="form-group"><label>{t('school.cal.title')}</label>
                                            <input type="text" value={calForm.title} onChange={(e) => setCalForm(p => ({ ...p, title: e.target.value }))} required /></div>
                                        <div className="form-group"><label>{t('school.cal.desc')}</label>
                                            <input type="text" value={calForm.description} onChange={(e) => setCalForm(p => ({ ...p, description: e.target.value }))} /></div>
                                        <div className="form-row">
                                            <input type="date" value={calForm.date} onChange={(e) => setCalForm(p => ({ ...p, date: e.target.value }))} required />
                                            <select value={calForm.type} onChange={(e) => setCalForm(p => ({ ...p, type: e.target.value }))}>
                                                <option value="event">{t('school.cal.event')}</option>
                                                <option value="holiday">{t('school.cal.holiday')}</option>
                                                <option value="exam">{t('school.cal.exam')}</option>
                                                <option value="meeting">{t('school.cal.meeting')}</option>
                                            </select>
                                        </div>
                                        <select value={calForm.audience} onChange={(e) => setCalForm(p => ({ ...p, audience: e.target.value }))}>
                                            <option value="all">{t('school.ann.all')}</option>
                                            <option value="teachers">{t('school.ann.teachers')}</option>
                                            <option value="parents">{t('school.ann.parents')}</option>
                                            <option value="students">{t('school.ann.students')}</option>
                                        </select>
                                        <button type="submit" className="btn-primary"><Plus size={16} /> {t('school.cal.add')}</button>
                                    </form>
                                </div>
                                <div className="card glass">
                                    <h3>{t('school.cal.upcoming')}</h3>
                                    {calEvents.length === 0 ? <p className="subtext">{t('school.cal.none')}</p> : calEvents.map(ev => (
                                        <div key={ev._id} className="absent-row">
                                            <span><span className={`sev-pill inv-${ev.type === 'holiday' ? 'paid' : ev.type === 'exam' ? 'overdue' : 'unpaid'}`}>{t('school.cal.' + ev.type)}</span> <strong>{ev.title}</strong> · {new Date(ev.date).toLocaleDateString()}</span>
                                            <button className="icon-btn" onClick={() => deleteEvent(ev._id)}><Trash2 size={14} /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ===== GROUP C #1 — HOMEWORK (admin overview) ===== */}
                    {activeTab === 'homework' && (
                        <div className="tab-pane fade-in">
                            <div className="card glass">
                                <h3><BookOpen size={20} /> {t('school.hw.list')}</h3>
                                <table className="school-table">
                                    <thead><tr><th>{t('school.hw.title')}</th><th>{t('school.hw.class')}</th><th>{t('school.hw.subject')}</th><th>{t('school.hw.teacher')}</th><th>{t('school.hw.due')}</th></tr></thead>
                                    <tbody>
                                        {homeworkList.length === 0 && <tr><td colSpan={5} className="subtext">{t('school.hw.none')}</td></tr>}
                                        {homeworkList.map(h => (
                                            <tr key={h._id}><td>{h.title}</td><td>{h.classroomId?.name}</td><td>{h.subjectId?.title}</td><td>{h.teacherId?.name}</td><td>{h.dueDate ? new Date(h.dueDate).toLocaleDateString() : '—'}</td></tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ===== PHASE 3.5 — STAFF ===== */}
                    {activeTab === 'staff' && (
                        <div className="tab-pane fade-in">
                            <div className="card glass">
                                <h3><Briefcase size={20} /> {t('school.staffPane.title')}</h3>
                                <table className="school-table">
                                    <thead><tr><th>{t('school.staffPane.name')}</th><th>{t('school.staffPane.role')}</th><th>{t('school.staffPane.phone')}</th><th>{t('school.staffPane.email')}</th></tr></thead>
                                    <tbody>
                                        {staffList.map(s => (
                                            <tr key={s._id}>
                                                <td>{s.name}</td>
                                                <td><span className="role-pill staff">{s.role}</span></td>
                                                <td>{s.phone || '—'}</td>
                                                <td>{s.email || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'users' && (
                        <div className="tab-pane fade-in">
                            <div className="grid-split">
                                <div className="card glass">
                                    <h3><UserPlus size={20} /> Register User Account</h3>
                                    <form onSubmit={handleUserCreate} className="school-form">
                                        <div className="form-group">
                                            <label>Full Name</label>
                                            <input type="text" value={userForm.name} onChange={(e) => setUserForm(prev => ({ ...prev, name: e.target.value }))} required />
                                        </div>
                                        <div className="form-group">
                                            <label>Email Address</label>
                                            <input type="email" value={userForm.email} onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))} required />
                                        </div>
                                        <div className="form-group">
                                            <label>Password</label>
                                            <input type="password" value={userForm.password} onChange={(e) => setUserForm(prev => ({ ...prev, password: e.target.value }))} required />
                                        </div>
                                        <div className="form-group">
                                            <label>Role</label>
                                            <select value={userForm.role} onChange={(e) => setUserForm(prev => ({ ...prev, role: e.target.value }))}>
                                                <option value="student">Student</option>
                                                <option value="teacher">Teacher</option>
                                                <option value="parent">Parent</option>
                                                <option value="school_admin">School Admin</option>
                                            </select>
                                        </div>
                                        {userForm.role === 'parent' && (
                                            <div className="form-group">
                                                <label>Children (Student User IDs, comma separated)</label>
                                                <input type="text" value={userForm.parentOf} onChange={(e) => setUserForm(prev => ({ ...prev, parentOf: e.target.value }))} placeholder="e.g. 648f3b..., 648f3c..." />
                                            </div>
                                        )}
                                        <button type="submit" className="btn-primary">Register User</button>
                                    </form>
                                </div>

                                <div className="card glass">
                                    <h3>Registered Accounts</h3>
                                    <div className="list-container">
                                        <table className="school-table">
                                            <thead>
                                                <tr>
                                                    <th>Name</th>
                                                    <th>Email</th>
                                                    <th>Role</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {usersList.map((u) => (
                                                    <tr key={u._id}>
                                                        <td>{u.name}</td>
                                                        <td>{u.email}</td>
                                                        <td><span className={`role-pill ${u.role}`}>{u.role}</span></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'classrooms' && (
                        <div className="tab-pane fade-in">
                            <div className="grid-split">
                                <div className="column-left">
                                    <div className="card glass mb-4">
                                        <h3><Plus size={20} /> Academic Year Setup</h3>
                                        <form onSubmit={handleYearCreate} className="school-form inline-form">
                                            <input type="text" placeholder="Year (e.g. 2025-2026)" value={yearForm.name} onChange={(e) => setYearForm(prev => ({ ...prev, name: e.target.value }))} required />
                                            <input type="date" value={yearForm.startDate} onChange={(e) => setYearForm(prev => ({ ...prev, startDate: e.target.value }))} required />
                                            <input type="date" value={yearForm.endDate} onChange={(e) => setYearForm(prev => ({ ...prev, endDate: e.target.value }))} required />
                                            <button type="submit" className="btn-primary">Create Year</button>
                                        </form>
                                    </div>

                                    <div className="card glass mb-4">
                                        <h3><Plus size={20} /> Classroom Creation</h3>
                                        <form onSubmit={handleClassCreate} className="school-form">
                                            <div className="form-group">
                                                <label>Academic Year</label>
                                                <select value={classForm.academicYearId} onChange={(e) => setClassForm(prev => ({ ...prev, academicYearId: e.target.value }))} required>
                                                    <option value="">Select Academic Year</option>
                                                    {academicYears.map(y => <option key={y._id} value={y._id}>{y.name}</option>)}
                                                </select>
                                            </div>
                                            <div className="form-group">
                                                <label>Classroom Name</label>
                                                <input type="text" placeholder="e.g. Grade 10-B" value={classForm.name} onChange={(e) => setClassForm(prev => ({ ...prev, name: e.target.value }))} required />
                                            </div>
                                            <button type="submit" className="btn-primary">Create Classroom</button>
                                        </form>
                                    </div>

                                    <div className="card glass">
                                        <h3><UserPlus size={20} /> Student Enrollment</h3>
                                        <form onSubmit={handleEnroll} className="school-form">
                                            <div className="form-group">
                                                <label>Classroom</label>
                                                <select value={enrollForm.classroomId} onChange={(e) => setEnrollForm(prev => ({ ...prev, classroomId: e.target.value }))} required>
                                                    <option value="">Select Classroom</option>
                                                    {classrooms.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                                </select>
                                            </div>
                                            <div className="form-group">
                                                <label>Student User ID</label>
                                                <input type="text" placeholder="Paste Student ID" value={enrollForm.studentId} onChange={(e) => setEnrollForm(prev => ({ ...prev, studentId: e.target.value }))} required />
                                            </div>
                                            <button type="submit" className="btn-primary">Enroll Student</button>
                                        </form>
                                    </div>
                                </div>

                                <div className="column-right">
                                    <div className="card glass h-full">
                                        <h3>Active Classrooms</h3>
                                        <div className="classroom-list">
                                            {classrooms.map((c) => (
                                                <div key={c._id} className="classroom-item">
                                                    <div>
                                                        <h4>{c.name}</h4>
                                                        <span className="subtext">Year: {academicYears.find(y => y._id === c.academicYearId)?.name || 'Default'}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'schedule' && (
                        <div className="tab-pane fade-in">
                            <div className="grid-split">
                                <div className="card glass">
                                    <h3><Plus size={20} /> Subject Management</h3>
                                    <form onSubmit={handleSubjectCreate} className="school-form">
                                        <input type="text" placeholder="Subject Title (e.g. Physics)" value={subjectForm.title} onChange={(e) => setSubjectForm(prev => ({ ...prev, title: e.target.value }))} required />
                                        <input type="text" placeholder="Description" value={subjectForm.description} onChange={(e) => setSubjectForm(prev => ({ ...prev, description: e.target.value }))} />
                                        <button type="submit" className="btn-primary">Create Subject</button>
                                    </form>
                                </div>

                                <div className="card glass">
                                    <h3><Clock size={20} /> Assign Schedule</h3>
                                    <form onSubmit={handleScheduleCreate} className="school-form">
                                        <div className="form-row">
                                            <select value={scheduleForm.classroomId} onChange={(e) => setScheduleForm(prev => ({ ...prev, classroomId: e.target.value }))} required>
                                                <option value="">Select Classroom</option>
                                                {classrooms.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                            </select>
                                            <select value={scheduleForm.teacherId} onChange={(e) => setScheduleForm(prev => ({ ...prev, teacherId: e.target.value }))} required>
                                                <option value="">Select Teacher</option>
                                                {usersList.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="form-row">
                                            <select value={scheduleForm.subjectId} onChange={(e) => setScheduleForm(prev => ({ ...prev, subjectId: e.target.value }))} required>
                                                <option value="">Select Subject</option>
                                                {subjects.map(s => <option key={s._id} value={s._id}>{s.title}</option>)}
                                            </select>
                                            <select value={scheduleForm.dayOfWeek} onChange={(e) => setScheduleForm(prev => ({ ...prev, dayOfWeek: Number(e.target.value) }))} required>
                                                <option value={1}>Monday</option>
                                                <option value={2}>Tuesday</option>
                                                <option value={3}>Wednesday</option>
                                                <option value={4}>Thursday</option>
                                                <option value={5}>Friday</option>
                                                <option value={6}>Saturday</option>
                                                <option value={0}>Sunday</option>
                                            </select>
                                        </div>
                                        <div className="form-row">
                                            <input type="text" placeholder="Start Time (HH:MM)" value={scheduleForm.startTime} onChange={(e) => setScheduleForm(prev => ({ ...prev, startTime: e.target.value }))} required />
                                            <input type="text" placeholder="End Time (HH:MM)" value={scheduleForm.endTime} onChange={(e) => setScheduleForm(prev => ({ ...prev, endTime: e.target.value }))} required />
                                        </div>
                                        <input type="text" placeholder="Room/Location (e.g. 201)" value={scheduleForm.room} onChange={(e) => setScheduleForm(prev => ({ ...prev, room: e.target.value }))} />
                                        <button type="submit" className="btn-primary">Save Schedule Assignment</button>
                                    </form>
                                </div>
                            </div>

                            <div className="card glass mt-4">
                                <h3>Master Weekly Schedule</h3>
                                <table className="school-table">
                                    <thead>
                                        <tr>
                                            <th>Class</th>
                                            <th>Subject</th>
                                            <th>Teacher</th>
                                            <th>Time</th>
                                            <th>Location</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {schedules.map((s) => (
                                            <tr key={s._id}>
                                                <td>{s.classroomId?.name}</td>
                                                <td>{s.subjectId?.title}</td>
                                                <td>{s.teacherId?.name}</td>
                                                <td>Day {s.dayOfWeek} @ {s.startTime} - {s.endTime}</td>
                                                <td>{s.room || '--'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'reports' && (
                        <div className="tab-pane fade-in">
                            <div className="card glass">
                                <h3>School-Wide Attendance Log</h3>
                                <table className="school-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Classroom</th>
                                            <th>Student</th>
                                            <th>Status</th>
                                            <th>Taken By</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {attendanceReport.map((a) => (
                                            <tr key={a._id}>
                                                <td>{new Date(a.date).toLocaleDateString()}</td>
                                                <td>{a.classroomId?.name}</td>
                                                <td>{a.studentId?.name}</td>
                                                <td><span className={`status-pill ${a.status}`}>{a.status}</span></td>
                                                <td>{a.takenBy?.name}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {reportCard && (
                <div className="rc-backdrop" onClick={() => setReportCard(null)}>
                    <div className="rc-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="rc-head">
                            <div>
                                <h3><Award size={20} /> {t('school.report.card')}</h3>
                                <div className="subtext">{reportCard.student.name} · {reportCard.student.class || '—'}</div>
                            </div>
                            <button className="icon-btn" onClick={() => setReportCard(null)}><X size={18} /></button>
                        </div>
                        <div className="rc-stats">
                            <div className="rc-stat"><div className="rc-val">{reportCard.overallAverage ?? '—'}</div><div className="fs-lbl">{t('school.report.overall')}</div></div>
                            <div className="rc-stat"><div className="rc-val">{reportCard.attendance.rate}%</div><div className="fs-lbl">{t('school.report.attendance')}</div></div>
                            <div className="rc-stat"><div className="rc-val">{reportCard.incidents.length}</div><div className="fs-lbl">{t('school.report.incidents')}</div></div>
                        </div>
                        {reportCard.subjects.length === 0 ? (
                            <p className="subtext">{t('school.report.noData')}</p>
                        ) : (
                            <table className="school-table">
                                <thead><tr><th>{t('school.report.subject')}</th><th>{t('school.report.average')}</th></tr></thead>
                                <tbody>
                                    {reportCard.subjects.map((s, i) => (
                                        <tr key={i}><td>{s.subject}</td><td><strong>{s.average}</strong></td></tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                            <button className="btn-primary" onClick={() => window.print()}><Printer size={16} /> {t('school.report.print')}</button>
                            <button className="mini-btn approve" onClick={openCertificate}><Award size={14} /> {t('school.cert.issue')}</button>
                        </div>
                    </div>
                </div>
            )}

            {certData && (
                <div className="rc-backdrop" onClick={() => setCertData(null)}>
                    <div className="cert-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="icon-btn cert-close" onClick={() => setCertData(null)}><X size={18} /></button>
                        <div className="cert-paper">
                            <img src="/novora-logo.png" alt="Novora" className="cert-logo" />
                            <div className="cert-title">{t('school.cert.title')}</div>
                            <div className="cert-intro">{t('school.cert.intro')}</div>
                            <div className="cert-name">{certData.name}</div>
                            <div className="cert-body">{t('school.cert.body')} <strong>{certData.average ?? '—'}</strong> — {certData.class || ''}</div>
                            <div className="cert-foot">
                                <div><div className="cert-line">{new Date().toLocaleDateString()}</div><div className="cert-cap">{t('school.cert.date')}</div></div>
                                <div><div className="cert-line">{school?.name || 'Novora'}</div><div className="cert-cap">{t('school.cert.principal')}</div></div>
                            </div>
                        </div>
                        <button className="btn-primary" style={{ marginTop: '1rem', width: '100%' }} onClick={() => window.print()}><Printer size={16} /> {t('school.cert.print')}</button>
                    </div>
                </div>
            )}

            <style>{`
                .school-container {
                    min-height: 100vh;
                    background: var(--nv-bg);
                    color: var(--nv-text);
                    font-family: var(--nv-font);
                }
                .school-header {
                    padding: 0.9rem 2rem;
                    background: var(--nv-surface);
                    border-bottom: 1px solid var(--nv-border-2);
                    position: relative;
                    z-index: 200;
                }
                .header-content { display: flex; justify-content: space-between; align-items: center; }
                .logo-area { display: flex; align-items: center; gap: 0.85rem; }
                .brand-logo { height: 26px; width: auto; display: block; }
                .brand-divider { width: 1px; height: 26px; background: #d8cfe6; }
                .logo-text { font-size: 1.15rem; font-weight: 800; color: var(--nv-text); letter-spacing: -0.01em; }
                .user-area { display: flex; align-items: center; gap: 1rem; }
                .role-tag {
                    background: var(--nv-chip); color: var(--nv-primary);
                    padding: 0.3rem 0.8rem; border-radius: 999px; font-size: 0.78rem; font-weight: 700;
                }
                .user-name { color: var(--nv-soft); font-weight: 600; font-size: 0.9rem; }
                .btn-logout {
                    background: transparent; border: 1px solid var(--nv-border);
                    color: var(--nv-muted); padding: 0.4rem 1rem; border-radius: 9px;
                    cursor: pointer; font-weight: 600; transition: all 0.2s;
                }
                .btn-logout:hover { background: var(--nv-red); color: #fff; border-color: var(--nv-red); }

                .school-layout { display: flex; min-height: calc(100vh - 64px); }
                .school-sidebar {
                    width: 248px; background: var(--nv-surface);
                    border-inline-end: 1px solid var(--nv-border-2); padding: 1.5rem 1rem;
                }
                .nav-menu { display: flex; flex-direction: column; gap: 0.35rem; }
                .nav-item {
                    display: flex; align-items: center; gap: 0.75rem; width: 100%;
                    padding: 0.7rem 0.85rem; background: transparent; border: none;
                    border-radius: 11px; color: var(--nv-soft); font-weight: 600;
                    font-size: 0.9rem; cursor: pointer; text-align: start;
                    font-family: var(--nv-font); transition: all 0.18s;
                }
                .nav-item:hover { background: var(--nv-hover); color: var(--nv-text); }
                .nav-item.active {
                    background: var(--nv-primary); color: #fff;
                    box-shadow: 0 6px 16px -4px rgba(102,51,153,.5);
                }
                .nav-divider { height: 1px; background: var(--nv-border); margin: 0.75rem 0.4rem; }

                .school-main { flex-grow: 1; padding: 2rem; max-width: 1280px; }
                .grid-split { display: grid; grid-template-columns: repeat(auto-fit, minmax(420px, 1fr)); gap: 1.5rem; }
                .card {
                    background: var(--nv-surface); border: 1px solid var(--nv-border);
                    border-radius: var(--nv-radius); padding: 1.5rem; box-shadow: var(--nv-shadow-sm);
                }
                .card h3 {
                    display: flex; align-items: center; gap: 0.5rem; font-size: 1.1rem;
                    font-weight: 700; color: var(--nv-text); margin-bottom: 1.1rem;
                }
                .card h3 svg { color: var(--nv-primary); }
                .school-form { display: flex; flex-direction: column; gap: 1rem; }
                .form-row { display: flex; gap: 1rem; }
                .form-row select, .form-row input { flex-grow: 1; width: 50%; }
                .form-group { display: flex; flex-direction: column; gap: 0.4rem; }
                .form-group label { font-size: 0.83rem; color: var(--nv-muted); font-weight: 600; }
                .school-form input, .school-form select, .school-form textarea {
                    padding: 0.7rem 0.8rem; background: var(--nv-surface-2);
                    border: 1px solid var(--nv-border); border-radius: 9px;
                    color: var(--nv-text); outline: none; font-family: var(--nv-font);
                }
                .school-form textarea { resize: vertical; }
                .school-form input:focus, .school-form select:focus, .school-form textarea:focus { border-color: var(--nv-primary-2); }
                .school-form input::placeholder, .school-form textarea::placeholder { color: #b3a8c6; }
                .btn-primary {
                    display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem;
                    padding: 0.7rem 1rem; background: var(--nv-primary); color: #fff;
                    border: none; border-radius: 9px; cursor: pointer; font-weight: 700;
                    font-family: var(--nv-font); transition: all 0.2s;
                }
                .btn-primary:hover { background: #59308a; box-shadow: 0 8px 18px -6px rgba(102,51,153,.5); }
                .list-container { overflow-x: auto; }
                .school-table { width: 100%; border-collapse: collapse; text-align: start; }
                .school-table th, .school-table td { padding: 0.7rem; border-bottom: 1px solid var(--nv-border-2); }
                .school-table th { color: var(--nv-muted); font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.03em; }
                .school-table td { color: var(--nv-soft); font-size: 0.9rem; }

                .role-pill, .status-pill { font-size: 0.74rem; padding: 0.2rem 0.55rem; border-radius: 6px; font-weight: 700; }
                .role-pill.student { background: var(--nv-blue-bg); color: var(--nv-blue); }
                .role-pill.teacher { background: var(--nv-chip); color: var(--nv-primary); }
                .role-pill.parent { background: var(--nv-amber-bg); color: var(--nv-amber); }
                .role-pill.school_admin { background: var(--nv-green-bg); color: var(--nv-green); }
                .role-pill.staff { background: var(--nv-teal-bg); color: var(--nv-teal); }
                .status-pill.present { background: var(--nv-green-bg); color: var(--nv-green); }
                .status-pill.absent { background: var(--nv-red-bg); color: var(--nv-red); }
                .status-pill.late { background: var(--nv-amber-bg); color: var(--nv-amber); }
                .status-pill.excused { background: var(--nv-blue-bg); color: var(--nv-blue); }

                .classroom-list { display: flex; flex-direction: column; gap: 0.7rem; }
                .classroom-item { padding: 1rem; background: var(--nv-surface-2); border: 1px solid var(--nv-border); border-radius: 11px; }
                .classroom-item h4 { font-weight: 700; color: var(--nv-text); margin-bottom: 0.25rem; }
                .subtext { font-size: 0.8rem; color: var(--nv-muted); }
                .mb-4 { margin-bottom: 1rem; } .mt-4 { margin-top: 1rem; } .h-full { height: 100%; }
                .fade-in { animation: fadeIn 0.4s ease forwards; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

                .hint { font-size: 0.8rem; color: var(--nv-muted); margin: 0.4rem 0; }
                .status-select { background: var(--nv-surface-2); border: 1px solid var(--nv-border); color: var(--nv-text); border-radius: 7px; padding: 0.3rem 0.5rem; font-size: 0.8rem; font-family: var(--nv-font); }
                .loc-note { font-size: 0.82rem; color: var(--nv-primary); font-weight: 600; }

                .overview-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 1.25rem; }
                .overview-head h2 { font-size: 1.35rem; font-weight: 800; color: var(--nv-text); }
                .as-of { color: var(--nv-muted); font-size: 0.9rem; }
                .as-of strong { color: var(--nv-primary); }
                .overview-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1rem; }
                .class-card { padding: 1.1rem; }
                .class-card-top { display: flex; justify-content: space-between; align-items: center; }
                .class-card-top h4 { font-size: 1.1rem; font-weight: 700; color: var(--nv-text); }
                .student-count { display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.85rem; color: var(--nv-muted); }
                .now-playing { margin-top: 0.85rem; padding: 0.75rem; border-radius: 11px; background: var(--nv-chip); border: 1px solid #e6dbf5; font-size: 0.78rem; color: var(--nv-muted); }
                .now-playing .np-subject { font-size: 1rem; font-weight: 700; color: var(--nv-text); margin-top: 0.35rem; }
                .now-playing .np-teacher { color: var(--nv-primary); font-weight: 600; }
                .now-playing .np-time { color: var(--nv-soft); margin-top: 0.2rem; }
                .live-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--nv-green); margin-inline-end: 6px; animation: pulse 1.6s infinite; }
                @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
                .no-class { margin-top: 0.85rem; padding: 0.75rem; border-radius: 11px; background: var(--nv-surface-2); color: var(--nv-muted); font-size: 0.82rem; }

                .messages-layout { display: grid; grid-template-columns: 320px 1fr; gap: 1.25rem; height: 70vh; }
                .inbox-col, .thread-col { display: flex; flex-direction: column; overflow: hidden; }
                .inbox-list { display: flex; flex-direction: column; gap: 0.4rem; overflow-y: auto; }
                .msg-search { width: 100%; padding: 0.5rem 0.7rem; margin-bottom: 0.6rem; background: var(--nv-surface-2); border: 1px solid var(--nv-border-3); border-radius: 9px; color: var(--nv-text); outline: none; font-family: var(--nv-font); font-size: 0.85rem; }
                .msg-search:focus { border-color: var(--nv-primary-2); }
                .inbox-item { text-align: start; background: var(--nv-surface-2); border: 1px solid var(--nv-border); border-radius: 11px; padding: 0.7rem; cursor: pointer; color: var(--nv-soft); font-family: var(--nv-font); }
                .inbox-item:hover, .inbox-item.active { background: var(--nv-chip); border-color: #e0d3f3; }
                .inbox-top { display: flex; justify-content: space-between; align-items: center; }
                .inbox-top strong { color: var(--nv-text); }
                .inbox-preview { font-size: 0.8rem; color: var(--nv-muted); margin-top: 0.2rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .unread-badge { background: var(--nv-primary); color: #fff; border-radius: 999px; font-size: 0.7rem; padding: 0.05rem 0.45rem; }
                .thread-box { flex-grow: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 0.6rem; padding: 0.5rem 0; }
                .bubble { max-width: 75%; padding: 0.6rem 0.85rem; border-radius: 12px; font-size: 0.9rem; }
                .bubble.mine { align-self: flex-end; background: var(--nv-primary); color: #fff; }
                .bubble.theirs { align-self: flex-start; background: var(--nv-chip); color: var(--nv-text); }
                .bubble-subj { font-weight: 700; font-size: 0.78rem; margin-bottom: 0.2rem; opacity: 0.85; }
                .bubble-time { font-size: 0.65rem; opacity: 0.6; margin-top: 0.3rem; }
                .reply-bar { display: flex; gap: 0.5rem; margin-top: 0.75rem; }
                .reply-bar input { flex-grow: 1; padding: 0.65rem 0.8rem; background: var(--nv-surface-2); border: 1px solid var(--nv-border); border-radius: 9px; color: var(--nv-text); outline: none; font-family: var(--nv-font); }
                .reply-bar input:focus { border-color: var(--nv-primary-2); }
                .empty-thread { display: flex; align-items: center; justify-content: center; height: 100%; color: var(--nv-muted); }

                .search-bar { display: flex; gap: 0.5rem; margin-bottom: 1.25rem; }
                .search-bar input { flex-grow: 1; padding: 0.75rem 0.85rem; background: var(--nv-surface-2); border: 1px solid var(--nv-border); border-radius: 9px; color: var(--nv-text); outline: none; font-family: var(--nv-font); }
                .search-bar input:focus { border-color: var(--nv-primary-2); }
                .search-results { display: flex; flex-direction: column; gap: 0.5rem; }
                .result-item { display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.75rem; background: var(--nv-surface-2); border: 1px solid var(--nv-border); border-radius: 11px; }
                .result-body strong { color: var(--nv-text); }
                .type-pill { flex-shrink: 0; font-size: 0.7rem; font-weight: 700; padding: 0.2rem 0.55rem; border-radius: 999px; text-transform: uppercase; }
                .type-pill.student { background: var(--nv-blue-bg); color: var(--nv-blue); }
                .type-pill.parent { background: var(--nv-amber-bg); color: var(--nv-amber); }
                .type-pill.teacher { background: var(--nv-chip); color: var(--nv-primary); }
                .type-pill.class { background: var(--nv-green-bg); color: var(--nv-green); }
                .type-pill.staff { background: var(--nv-teal-bg); color: var(--nv-teal); }

                /* substitutes / absences */
                .date-input { padding: 0.4rem 0.6rem; background: var(--nv-surface-2); border: 1px solid var(--nv-border-3); border-radius: 8px; color: var(--nv-text); font-family: var(--nv-font); }
                .conflict-banner { display: flex; gap: 0.6rem; align-items: flex-start; background: var(--nv-amber-bg); border: 1px solid #f3d59a; color: #8a5a00; padding: 0.85rem 1rem; border-radius: 12px; margin-bottom: 1.25rem; }
                .conflict-banner svg { flex: none; margin-top: 2px; }
                .conflict-line { font-size: 0.82rem; margin-top: 0.2rem; }
                .absent-row { display: flex; justify-content: space-between; align-items: center; padding: 0.6rem 0.7rem; background: var(--nv-surface-2); border: 1px solid var(--nv-border); border-radius: 9px; margin-bottom: 0.4rem; font-size: 0.9rem; }
                .icon-btn { background: transparent; border: none; color: var(--nv-text-faint); cursor: pointer; padding: 2px; display: inline-flex; align-items: center; }
                .icon-btn:hover { color: var(--nv-red); }
                .covered-tag { display: inline-flex; align-items: center; gap: 0.4rem; color: var(--nv-green); font-weight: 600; font-size: 0.85rem; }
                .checkbox-row { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; color: var(--nv-text-muted); cursor: pointer; }
                .ann-card { padding: 0.85rem; background: var(--nv-surface-2); border: 1px solid var(--nv-border); border-radius: 11px; margin-bottom: 0.6rem; }
                .ann-head { display: flex; justify-content: space-between; align-items: flex-start; }
                .ann-head strong { color: var(--nv-text); }
                .sev-pill { font-size: 0.72rem; font-weight: 700; padding: 0.15rem 0.5rem; border-radius: 6px; }
                .sev-low { background: var(--nv-blue-bg); color: var(--nv-blue); }
                .sev-medium { background: var(--nv-amber-bg); color: var(--nv-amber); }
                .sev-high { background: var(--nv-red-bg); color: var(--nv-red); }
                .leave-pending { background: var(--nv-amber-bg); color: var(--nv-amber); }
                .leave-approved { background: var(--nv-green-bg); color: var(--nv-green); }
                .leave-rejected { background: var(--nv-red-bg); color: var(--nv-red); }
                .mini-btn { border: none; border-radius: 7px; padding: 0.3rem 0.7rem; font-size: 0.78rem; font-weight: 700; cursor: pointer; font-family: var(--nv-font); }
                .mini-btn.approve { background: var(--nv-green-bg); color: var(--nv-green); }
                .mini-btn.reject { background: var(--nv-red-bg); color: var(--nv-red); }
                .mini-btn:hover { filter: brightness(0.95); }
                .inv-unpaid { background: var(--nv-amber-bg); color: var(--nv-amber); }
                .inv-overdue { background: var(--nv-red-bg); color: var(--nv-red); }
                .inv-paid { background: var(--nv-green-bg); color: var(--nv-green); }
                .inv-partial { background: var(--nv-blue-bg); color: var(--nv-blue); }

                /* fees stats */
                .fee-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
                .fee-stat { background: var(--nv-surface); border: 1px solid var(--nv-border); border-radius: 14px; padding: 1.1rem; box-shadow: var(--nv-shadow-sm); }
                .fee-stat .fs-val { font-size: 1.5rem; font-weight: 800; color: var(--nv-text); }
                .fee-stat .fs-lbl { font-size: 0.8rem; color: var(--nv-muted); margin-top: 0.2rem; }
                .fee-stat.green .fs-val { color: var(--nv-green); }
                .fee-stat.amber .fs-val { color: var(--nv-amber); }
                .fee-stat.red .fs-val { color: var(--nv-red); }

                /* report card modal */
                .rc-backdrop { position: fixed; inset: 0; background: rgba(42,31,56,0.45); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 3000; }
                .rc-modal { width: 100%; max-width: 460px; background: var(--nv-surface); border-radius: 18px; padding: 1.5rem; box-shadow: var(--nv-shadow); max-height: 85vh; overflow-y: auto; }
                .rc-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.1rem; }
                .rc-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin-bottom: 1.1rem; }
                .rc-stat { background: var(--nv-surface-2); border-radius: 12px; padding: 0.9rem; text-align: center; }
                .rc-stat .rc-val { font-size: 1.4rem; font-weight: 800; color: var(--nv-primary); }
                .import-result { margin-top: 1rem; padding: 0.85rem 1rem; background: var(--nv-green-bg); border: 1px solid #bfe3cb; border-radius: 11px; color: #176a35; font-weight: 600; }
                .import-result .subtext { color: #8a5a00; font-weight: 500; }
                .cal-event { background: var(--nv-blue-bg); color: var(--nv-blue); }
                .cal-holiday { background: var(--nv-green-bg); color: var(--nv-green); }
                .cal-exam { background: var(--nv-red-bg); color: var(--nv-red); }
                .cal-meeting { background: var(--nv-amber-bg); color: var(--nv-amber); }

                /* certificate */
                .cert-modal { width: 100%; max-width: 600px; background: var(--nv-surface); border-radius: 18px; padding: 1.25rem; box-shadow: var(--nv-shadow); position: relative; }
                .cert-close { position: absolute; top: 1rem; inset-inline-end: 1rem; z-index: 2; }
                .cert-paper { border: 3px double var(--nv-primary); border-radius: 12px; padding: 2.2rem 1.5rem; text-align: center; background: linear-gradient(160deg, #fff, #faf7ff); }
                .cert-logo { height: 30px; margin-bottom: 1rem; }
                .cert-title { font-size: 1.5rem; font-weight: 800; color: var(--nv-primary); letter-spacing: 0.02em; }
                .cert-intro { color: var(--nv-text-soft); margin-top: 1rem; font-size: 0.9rem; }
                .cert-name { font-size: 1.8rem; font-weight: 800; color: var(--nv-text); margin: 0.5rem 0 0.75rem; font-family: 'Plus Jakarta Sans', serif; }
                .cert-body { color: var(--nv-text-muted); font-size: 0.95rem; }
                .cert-foot { display: flex; justify-content: space-between; margin-top: 2.2rem; }
                .cert-line { border-top: 1.5px solid var(--nv-border-3); padding-top: 0.3rem; min-width: 120px; font-weight: 600; color: var(--nv-text); font-size: 0.85rem; }
                .cert-cap { font-size: 0.72rem; color: var(--nv-text-faint); }

            `}</style>
        </div>
    );
};

export default SchoolDashboard;
