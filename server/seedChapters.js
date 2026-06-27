import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import connectDB from './config/db.js';
import School from './models/School.js';
import User from './models/User.js';
import Subject from './models/Subject.js';
import Chapter from './models/Chapter.js';
import AcademicYear from './models/AcademicYear.js';
import Classroom from './models/Classroom.js';
import Enrollment from './models/Enrollment.js';
import Schedule from './models/Schedule.js';
import Exam from './models/Exam.js';
import Question from './models/Question.js';
import Progress from './models/Progress.js';
import ExamAttempt from './models/ExamAttempt.js';

dotenv.config();

const chaptersData = [
    {
        id: 0,
        title: "Introduction to Computation",
        description: "Define computation and why it is fundamental to computer science.",
        content: `
# Introduction to Computation

**Detailed Explanation:**

*   **Define computation and why it is fundamental to computer science:**
    Computation is the process of calculating a result from given inputs using a well-defined sequence of steps (an algorithm). It is the bedrock of computer science because it allows us to formalize what "solving a problem" means. It's not just about writing code; it's about understanding the fundamental capabilities and limitations of information processing.

*   **Introduce the concept of problems that computers can solve (computable) and problems that are impossible (uncomputable):**
    Not every problem has a solution. Identifying *computable* problems (those for which an algorithm exists) versus *uncomputable* problems (those that no algorithm can ever solve) is a core part of this theory.

*   **Explain abstract machine models and why they are used instead of actual programming languages:**
    Real computers are complex and change constantly. Abstract models (like DFAs, PDAs, and Turing Machines) strip away the hardware details (memory limits, speed) to focus purely on logic. This allows us to prove theorems that hold true for *any* computer, past, present, or future.

*   **Introduce complexity and the difference between solvable problems and efficiently solvable problems:**
    Even if a problem is solvable, it might take billions of years to compute. Complexity theory categorizes problems by how "hard" they are (Time and Space complexity), distinguishing between those we can solve efficiently (P) and those that are intractable (NP-Hard).

*   **Set the mindset of formal reasoning for the whole course:**
    This course requires precise definitions and logical proofs. We move from vague intuition to rigorous mathematical certainty.
        `,
        questions: [
            {
                question: "What is the main goal of Theory of Computation?",
                options: [
                    "To learn how to build faster computers",
                    "To understand the fundamental capabilities and limitations of computers",
                    "To write better Python code",
                    "To study computer hardware architecture"
                ],
                correctIndex: 1
            },
            {
                question: "What is the difference between computability and complexity?",
                options: [
                    "Computability asks 'can it be solved?', Complexity asks 'how efficiently?'",
                    "Computability asks 'how fast?', Complexity asks 'can it be solved?'",
                    "They are the same thing",
                    "Computability is about hardware, Complexity is about software"
                ],
                correctIndex: 0
            },
            {
                question: "Why do we use abstract machine models?",
                options: [
                    "Because real computers are too expensive",
                    "To ignore hardware details and focus on fundamental logic",
                    "Because they are faster than real computers",
                    "To make programming easier"
                ],
                correctIndex: 1
            }
        ]
    },
    {
        id: 1,
        title: "Regular Languages",
        description: "Introduce Deterministic Finite Automata (DFA) and Nondeterministic Finite Automata (NFA).",
        content: `
# Regular Languages

**Detailed Explanation:**

*   **Introduce Deterministic Finite Automata (DFA):**
    A DFA is the simplest computational model. It has a finite set of states and transitions based on input symbols. It processes a string one symbol at a time, moving deterministically from state to state. It has no memory other than its current state.

*   **Introduce Nondeterministic Finite Automata (NFA):**
    An NFA is like a DFA but can move to multiple states simultaneously for the same input, or make "guessing" moves (epsilon transitions). This models parallel computation paths.

*   **Show equivalence between DFA and NFA:**
    Surprisingly, NFAs are not more powerful than DFAs. Any NFA can be converted into an equivalent DFA (though the DFA might have exponentially more states).

*   **Introduce Regular Expressions:**
    Regex is a declarative way to describe patterns (like email addresses). Regular expressions are exactly equivalent to Finite Automata.

*   **Explain the Pumping Lemma for Regular Languages:**
    This is a mathematical tool used to prove that a specific language is *not* regular (e.g., the language of balanced parentheses). If a language requires "counting" or "infinite memory," it likely isn't regular.
        `,
        questions: [
            {
                question: "What is the difference between DFA and NFA?",
                options: [
                    "DFA allows multiple next states, NFA does not",
                    "NFA allows multiple next states for an input, DFA has exactly one",
                    "DFA has infinite memory, NFA has finite",
                    "NFA cannot handle epsilon transitions"
                ],
                correctIndex: 1
            },
            {
                question: "Are DFA and NFA equivalent in power?",
                options: [
                    "No, NFA is more powerful",
                    "No, DFA is more powerful",
                    "Yes, they recognize the same class of languages",
                    "It depends on the language"
                ],
                correctIndex: 2
            },
            {
                question: "What is the purpose of the Pumping Lemma?",
                options: [
                    "To prove a language is Regular",
                    "To optimize a DFA",
                    "To prove a language is NOT Regular",
                    "To convert NFA to DFA"
                ],
                correctIndex: 2
            }
        ]
    },
    {
        id: 2,
        title: "Context-Free Languages",
        description: "Define Context-Free Grammars (CFG) and Pushdown Automata (PDA).",
        content: `
# Context-Free Languages

**Detailed Explanation:**

*   **Define Context-Free Grammars (CFG):**
    CFGs are used to describe languages with recursive or nested structures (like matching parentheses or HTML tags). They consist of variables and substitution rules.

*   **Introduce Pushdown Automata (PDA):**
    A PDA is essentially a Finite Automaton + a Stack (infinite memory). The stack allows it to "remember" things in a Last-In-First-Out (LIFO) order, which is crucial for parsing nested structures.

*   **Relationship between CFGs and PDAs:**
    They are equivalent. Any language generated by a CFG can be recognized by a PDA.

*   **Explain the Pumping Lemma for CFLs:**
    Similar to the regular version, but adapted for the tree-like structure of CFGs. Used to prove languages (like $a^n b^n c^n$) are not Context-Free.
        `,
        questions: [
            {
                question: "What type of memory does a PDA use?",
                options: [
                    "Random Access Memory",
                    "Queue",
                    "Stack (LIFO)",
                    "Tape"
                ],
                correctIndex: 2
            },
            {
                question: "What problems can CFGs describe?",
                options: [
                    "Only simple patterns",
                    "Nested structures like balanced parentheses",
                    "Any computational problem",
                    "Only numbers"
                ],
                correctIndex: 1
            },
            {
                question: "Why is CFL more powerful than Regular Languages?",
                options: [
                    "Because of the Stack memory",
                    "Because it has more states",
                    "Because it is nondeterministic",
                    "It is not more powerful"
                ],
                correctIndex: 0
            }
        ]
    },
    {
        id: 3,
        title: "Turing Machines",
        description: "Explain the components of a Turing Machine and the Church-Turing Thesis.",
        content: `
# Turing Machines

**Detailed Explanation:**

*   **Components of a Turing Machine:**
    An infinite tape (memory), a read/write head that can move left or right, a finite set of states, and a transition function.

*   **Simulate any algorithmic computation:**
    Despite its simplicity, a TM can do anything a modern supercomputer can do (given enough time and tape). It is the universal model of computation.

*   **Infinite Tape:**
    This infinite memory is what separates TMs from FA (finite memory) and PDAs (stack memory).

*   **Church-Turing Thesis:**
    A philosophical/mathematical hypothesis stating that "Algorithm" coincides exactly with "Turing Machine computable." If it can be computed, a TM can do it.
        `,
        questions: [
            {
                question: "What makes a Turing Machine powerful?",
                options: [
                    "It runs on electricity",
                    "It has infinite tape memory and can move freely",
                    "It has a faster processor",
                    "It never halts"
                ],
                correctIndex: 1
            },
            {
                question: "What does the Church-Turing Thesis state?",
                options: [
                    "Turing Machines are efficient",
                    "Anything computable is computable by a Turing Machine",
                    "Turing Machines can solve the Halting Problem",
                    "Computers will overtake humans"
                ],
                correctIndex: 1
            },
            {
                question: "Can all algorithms be simulated by a Turing Machine?",
                options: [
                    "Yes, by definition",
                    "No, only mathematical ones",
                    "Only if they don't use recursion",
                    "No, quantum algorithms cannot"
                ],
                correctIndex: 0
            }
        ]
    },
    {
        id: 4,
        title: "Decidability",
        description: "Define decidable and undecidable problems, and the Halting Problem.",
        content: `
# Decidability

**Detailed Explanation:**

*   **Decidable vs Undecidable:**
    A problem is *decidable* if an algorithm exists that always gives the correct Yes/No answer in finite time. It is *undecidable* if no such algorithm can exist.

*   **The Halting Problem:**
    "Given a program and an input, will the program eventually stop or run forever?" Alan Turing proved this is mathematically impossible to solve for all general cases.

*   **Limits of Computation:**
    This proves there are hard limits to what computers can do. We cannot write a program to debug all other programs perfectly.
        `,
        questions: [
            {
                question: "What is an undecidable problem?",
                options: [
                    "A problem that takes a long time to solve",
                    "A problem for which no algorithm exists that always solves it",
                    "A problem with no solution",
                    "A problem that humans can't solve"
                ],
                correctIndex: 1
            },
            {
                question: "Why is the Halting Problem impossible to solve?",
                options: [
                    "Computers aren't fast enough yet",
                    "Because of a logical contradiction (self-reference)",
                    "We don't have the right programming language",
                    "It is solvable, just hard"
                ],
                correctIndex: 1
            },
            {
                question: "What does decidability mean?",
                options: [
                    "A problem is easy",
                    "An algorithm exists to solve it in finite time",
                    "The answer is always Yes",
                    "The answer is always No"
                ],
                correctIndex: 1
            }
        ]
    },
    {
        id: 5,
        title: "Reducibility",
        description: "Introduce the concept of problem reductions and mapping reductions.",
        content: `
# Reducibility

**Detailed Explanation:**

*   **Problem Reductions:**
    A way of converting Problem A into Problem B. If we can solve B, we can solve A.
    "If I can build a house (B), I can certainly build a doghouse (A)."

*   **Proving Undecidability:**
    Used in reverse: "If A is impossible, and A reduces to B, then B must also be impossible." (If B were easy, A would be easy, which is a contradiction).

*   **Understanding Strategy:**
    It's about relating new problems to known ones. To prove a new problem is undecidable, show that it's "at least as hard as" the Halting Problem.
        `,
        questions: [
            {
                question: "What is a reduction?",
                options: [
                    "Making a problem smaller",
                    "Transforming one problem into another",
                    "Removing code comments",
                    "Compressing data"
                ],
                correctIndex: 1
            },
            {
                question: "Why are reductions useful?",
                options: [
                    "They make code faster",
                    "They allow us to leverage known solutions or proofs",
                    "They reduce memory usage",
                    "They simplify the UI"
                ],
                correctIndex: 1
            },
            {
                question: "How do reductions prove undecidability?",
                options: [
                    "By showing a problem is equivalent to a known undecidable problem",
                    "By attempting to solve it and failing",
                    "By running it on a supercomputer",
                    "They don't"
                ],
                correctIndex: 0
            }
        ]
    },
    {
        id: 7,
        title: "Complexity Theory",
        description: "Define time complexity, P, NP, and NP-Complete classes.",
        content: `
# Complexity Theory

**Detailed Explanation:**

*   **Time Complexity:**
    How the runtime of an algorithm grows as the input size grows (Big O notation). Polynomial time ($O(n^k)$) is considered "efficient". Exponential time ($O(2^n)$) is "intractable".

*   **Content Classes:**
    *   **P (Polynomial):** Solvable quickly.
    *   **NP (Nondeterministic Polynomial):** Verifiable quickly (if given a solution, we can check it fast).
    *   **NP-Complete:** The hardest problems in NP. If you solve one efficiently, you solve them all.

*   **P vs NP:**
    The biggest open question in Computer Science. Does $P = NP$? (Can every problem whose solution is easy to check also be verified easy to solve?) Most believe the answer is No.
        `,
        questions: [
            {
                question: "What defines class P?",
                options: [
                    "Problems solvable in polynomial time",
                    "Problems solvable in exponential time",
                    "Problems that are impossible",
                    "Problems that require a supercomputer"
                ],
                correctIndex: 0
            },
            {
                question: "What is NP?",
                options: [
                    "Not Possible",
                    "Nondeterministic Polynomial (Verifiable in polynomial time)",
                    "Never Polynomial",
                    "New Problems"
                ],
                correctIndex: 1
            },
            {
                question: "Why are NP-Complete problems important?",
                options: [
                    "They are easy to solve",
                    "They relate all NP problems; solving one solves all",
                    "They are rare",
                    "They are only theoretical"
                ],
                correctIndex: 1
            }
        ]
    },
    {
        id: 8,
        title: "FINAL EXAM",
        description: "Comprehensive evaluation of all topics.",
        content: `
# FINAL EXAM

**Detailed Explanation:**

Congratulations on reaching the end of the course! This exam covers everything from Automata to Complexity.

*   **Format:**
    This exam combines questions from all previous chapters to test your holistic understanding of the Theory of Computation.
*   **Goal:**
    Prove your mastery of the material.
        `,
        questions: [
            {
                question: "Which of the following classes is closed under complement?",
                options: ["Regular Languages", "Recursively Enumerable Languages", "Turing-Recognizable Languages", "None of the above"],
                correctIndex: 0
            },
            {
                question: "Which model is equivalent to a Restricted Turing Machine with a Read-Only Tape?",
                options: ["DFA", "PDA", "LBA", "Turing Machine"],
                correctIndex: 0
            },
            {
                question: "What is the time complexity of the Traveling Salesman Problem?",
                options: ["P", "NP-Complete", "O(n log n)", "O(1)"],
                correctIndex: 1
            },
            {
                question: "If L is a regular language, then L is also:",
                options: [
                    "Context-Free",
                    "Decidable",
                    "Turing-Recognizable",
                    "All of the above"
                ],
                correctIndex: 3
            }
        ]
    }
];

const seedChapters = async () => {
    try {
        await connectDB();

        console.log('Clearing all collections...');
        await School.deleteMany({});
        await Subject.deleteMany({});
        await AcademicYear.deleteMany({});
        await Classroom.deleteMany({});
        await Enrollment.deleteMany({});
        await Schedule.deleteMany({});
        await Chapter.deleteMany({});
        await Exam.deleteMany({});
        await Question.deleteMany({});
        await User.deleteMany({});
        await Progress.deleteMany({});
        await ExamAttempt.deleteMany({});

        console.log('Collections cleared.');

        // 1. Create School
        const school = await School.create({
            name: 'Novora High',
            subdomain: 'novora'
        });
        console.log('Seeded School:', school.name);

        // 2. Create Subject
        const subject = await Subject.create({
            schoolId: school._id,
            title: 'Theory of Computation',
            description: 'Core computer science curriculum on automata, decidability, and complexity.'
        });
        console.log('Seeded Subject:', subject.title);

        // 3. Create Academic Year
        const academicYear = await AcademicYear.create({
            schoolId: school._id,
            name: '2025-2026',
            startDate: new Date('2025-09-01'),
            endDate: new Date('2026-06-30'),
            isActive: true
        });
        console.log('Seeded Academic Year:', academicYear.name);

        // 4. Create Users (School Admin, Teacher, Student)
        const salt = await bcrypt.genSalt(10);
        const adminPassword = await bcrypt.hash('Admin123!', salt);
        const teacherPassword = await bcrypt.hash('Teacher123!', salt);
        const studentPassword = await bcrypt.hash('Student123!', salt);

        const schoolAdmin = await User.create({
            schoolId: school._id,
            name: 'Novora Admin',
            email: 'admin@novora.com',
            password: adminPassword,
            role: 'school_admin'
        });

        const teacher = await User.create({
            schoolId: school._id,
            name: 'Professor Turing',
            email: 'teacher@novora.com',
            password: teacherPassword,
            role: 'teacher'
        });

        const student = await User.create({
            schoolId: school._id,
            name: 'Ada Lovelace',
            email: 'student@novora.com',
            password: studentPassword,
            role: 'student'
        });
        console.log('Seeded Users: admin@novora.com, teacher@novora.com, student@novora.com');

        // 5. Create Classroom & Enroll Student
        const classroom = await Classroom.create({
            schoolId: school._id,
            academicYearId: academicYear._id,
            name: 'TOC Class A',
            homeroomTeacherId: teacher._id
        });
        console.log('Seeded Classroom:', classroom.name);

        await Enrollment.create({
            schoolId: school._id,
            studentId: student._id,
            classroomId: classroom._id,
            academicYearId: academicYear._id,
            status: 'active'
        });
        console.log('Enrolled student in classroom.');

        // 6. Create Schedule
        const schedule = await Schedule.create({
            schoolId: school._id,
            teacherId: teacher._id,
            classroomId: classroom._id,
            subjectId: subject._id,
            dayOfWeek: 1, // Monday
            startTime: '09:00',
            endTime: '10:30',
            room: 'Lab 302'
        });
        console.log('Created teacher schedule assignment.');

        // 7. Seed Chapters, Exams, and Questions
        console.log('Seeding chapters and exams...');
        for (const data of chaptersData) {
            // A. Create Chapter
            const chapter = await Chapter.create({
                subjectId: subject._id,
                id: data.id,
                title: data.title,
                description: data.description,
                content: data.content,
                contentType: 'markdown',
                order: data.id
            });

            // B. Create Exam/Quiz for the Chapter
            const exam = await Exam.create({
                schoolId: school._id,
                subjectId: subject._id,
                teacherId: teacher._id,
                classroomId: classroom._id,
                chapterId: chapter._id,
                title: `${data.title} Quiz`,
                passingScore: 70
            });

            // C. Create Questions for this Exam
            const questionDocs = data.questions.map((q, idx) => ({
                schoolId: school._id,
                examId: exam._id,
                text: q.question,
                options: q.options,
                correctAnswer: q.correctIndex,
                order: idx
            }));

            await Question.insertMany(questionDocs);
        }

        console.log('Seeding process completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error(`Error seeding: ${error.message}`);
        process.exit(1);
    }
};

seedChapters();
