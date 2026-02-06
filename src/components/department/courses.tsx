"use client";
import { useFetchCourses } from "@/hooks/department/fetch-courses";
import StudentList from "./student-list";
import { useState } from "react";
import { useFetchPreset } from "@/hooks/department/fetch-preset";

export default function Courses() {
    const { data: courses = [], isPending, error } = useFetchCourses();
    const { data: preset } = useFetchPreset();
    const [selectedCourse, setSelectedCourse] = useState<string>("BSCS");
    const [selectedSection, setSelectedSection] = useState<string>("BSCS 3/1-1");
    const [expandedStudent, setExpandedStudent] = useState<string>("");
    const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
    const [addPresetModal, setAddPresetModal] = useState(false);
    const [bulkSignModal, setBulkSignModal] = useState(false);
    const [bulkSignWarning, setBulkSignWarning] = useState(false);
    const [incompleteInBulk, setIncompleteInBulk] = useState<Set<string>>(new Set());
    const [addTaskModal, setAddTaskModal] = useState(false);
    const [managePresetsModal, setManagePresetsModal] = useState(false);
    const [signOutDropdown, setSignOutDropdown] = useState(false);
    const [selectedPreset, setSelectedPreset] = useState<any>(null);
    const [filterType, setFilterType] = useState<"all" | "signed" | "unsigned" | "pending" | "alpha">("all");
    const [taskTitle, setTaskTitle] = useState("");
    const [taskDescription, setTaskDescription] = useState("");
    const [presets, setPresets] = useState<any[]>([
        { id: 1, name: "Missing Exam" },
        { id: 2, name: "Missing DSAI exam" },
        { id: 3, name: "Incomplete Requirements" }
    ]);
    const [newPresetName, setNewPresetName] = useState("");

    // Course sections structure
    const courseSections: Record<string, string[]> = {
        "BSCS": ["BSCS 2/1-1", "BSCS 3/1-1", "BSCS 4/1-1"],
        "BSTM": ["BSTM 1/1-1", "BSTM 1/1-2", "BSTM 1/1-3", "BSTM 1/1-4", "BSTM 2/1-1", "BSTM 2/1-2", "BSTM 2/1-3", "BSTM 2/1-4", "BSTM 3/1-1", "BSTM 3/1-2", "BSTM 3/1-3", "BSTM 3/1-4", "BSTM 4/1-1", "BSTM 4/1-2", "BSTM 4/1-3", "BSTM 4/1-4"],
        "BSIT": ["BSIT 1/1-1", "BSIT 1/1-2", "BSIT 1/1-3", "BSIT 1/1-4", "BSIT 2/1-1", "BSIT 2/1-2", "BSIT 2/1-3", "BSIT 2/1-4", "BSIT 3/1-1", "BSIT 3/1-2", "BSIT 3/1-3", "BSIT 3/1-4", "BSIT 4/1-1", "BSIT 4/1-2", "BSIT 4/1-3", "BSIT 4/1-4"],
        "BSCPE": ["BSCPE 1/1-1", "BSCPE 1/1-2", "BSCPE 2/1-1", "BSCPE 2/1-2", "BSCPE 3/1-1", "BSCPE 3/1-2", "BSCPE 4/1-1", "BSCPE 4/1-2"],
        "BMMA": ["BMMA 1/1-1", "BMMA 1/1-2", "BMMA 2/1-1", "BMMA 2/1-2", "BMMA 3/1-1", "BMMA 3/1-2", "BMMA 4/1-1", "BMMA 4/1-2"],
        "BSCM": ["BSCM 1/1-1", "BSCM 1/1-2", "BSCM 1/1-3", "BSCM 1/1-4", "BSCM 2/1-1", "BSCM 2/1-2", "BSCM 2/1-3", "BSCM 2/1-4", "BSCM 3/1-1", "BSCM 3/1-2", "BSCM 3/1-3", "BSCM 3/1-4", "BSCM 4/1-1", "BSCM 4/1-2", "BSCM 4/1-3", "BSCM 4/1-4"],
        "BSA": ["BSA 1/1-1", "BSA 2/1-1", "BSA 3/1-1", "BSA 4/1-1"]
    };

    // Mock student data per section
    const mockStudentsBySection: Record<string, any[]> = {
        "BSCS 3/1-1": [
            { id: "202208812", name: "Jobert Baldovino", email: "baldovino.jobert@lcsandemo.universiti.edu", status: "Signed", signedDate: "10/01/2025", tasks: [{ id: 1, desc: "Missing Exam", done: true }, { id: 2, desc: "Missing DSAI exam", done: true }] },
            { id: "2022036103", name: "Bench Canzana", email: "canzana.bench@lcsandemo.universiti.edu", status: "Incomplete", signedDate: null, tasks: [{ id: 1, desc: "Missing Exam", done: false }, { id: 2, desc: "Missing DSAI exam", done: true }] },
        ],
        "BSCS 2/1-1": [
            { id: "202209001", name: "Josie Jato", email: "jato.josie@lcsandemo.universiti.edu", status: "Pending", signedDate: null, tasks: [{ id: 1, desc: "Missing Exam", done: false }, { id: 2, desc: "Missing DSAI exam", done: false }] },
        ],
        "BSCS 4/1-1": [
            { id: "202207001", name: "Juan Dela Cruz", email: "delacruz.juan@lcsandemo.universiti.edu", status: "Signed", signedDate: "09/15/2025", tasks: [{ id: 1, desc: "Missing Exam", done: true }, { id: 2, desc: "Missing DSAI exam", done: true }] },
        ],
        "BSTM 1/1-1": [
            { id: "202400001", name: "Maria Santos", email: "santos.maria@lcsandemo.universiti.edu", status: "Incomplete", signedDate: null, tasks: [{ id: 1, desc: "Complete registration", done: false }] },
        ],
        "BSIT 1/1-1": [
            { id: "202400101", name: "Carlos Lopez", email: "lopez.carlos@lcsandemo.universiti.edu", status: "Signed", signedDate: "10/05/2025", tasks: [{ id: 1, desc: "Complete registration", done: true }] },
        ],
    };

    if (isPending || !preset) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>{error.message}</div>;
    }

    const currentStudents = mockStudentsBySection[selectedSection] || [];
    const totalStudents = currentStudents.length;
    const signedCount = currentStudents.filter(s => s.status === "Signed").length;
    const incompleteCount = currentStudents.filter(s => s.status === "Incomplete").length;
    const pendingCount = currentStudents.filter(s => s.status === "Pending").length;

    const toggleStudentSelect = (id: string) => {
        const newSelected = new Set(selectedStudents);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedStudents(newSelected);
    };

    const toggleTaskDone = (studentId: string, taskId: number) => {
        const updatedStudents = mockStudentsBySection[selectedSection]?.map(student => {
            if (student.id === studentId) {
                return {
                    ...student,
                    tasks: student.tasks.map((task: any) => 
                        task.id === taskId ? { ...task, done: !task.done } : task
                    ),
                    status: student.tasks.every((t: any) => t.id === taskId ? !t.done : t.done) ? "Signed" : student.status
                };
            }
            return student;
        }) || [];
    };

    const allTasksDone = (student: any) => {
        return student.tasks && student.tasks.length > 0 && student.tasks.every((t: any) => t.done);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "Signed":
                return { bg: "#e8f5e9", color: "#4caf50", border: "#4caf50" };
            case "Incomplete":
                return { bg: "#fff8e1", color: "#fbc02d", border: "#fbc02d" };
            case "Pending":
                return { bg: "#ffebee", color: "#f44336", border: "#f44336" };
            default:
                return { bg: "#f5f5f5", color: "#999", border: "#ddd" };
        }
    };

    const markAsSignedStudent = (studentId: string) => {
        const updatedStudents = mockStudentsBySection[selectedSection]?.map(student => {
            if (student.id === studentId && student.status === "Pending") {
                return { ...student, status: "Signed", signedDate: new Date().toLocaleDateString() };
            }
            return student;
        }) || [];
        mockStudentsBySection[selectedSection] = updatedStudents;
    };

    const bulkSignStudents = () => {
        if (selectedStudents.size === 0) return;
        const updatedStudents = mockStudentsBySection[selectedSection]?.map(student => {
            if (selectedStudents.has(student.id)) {
                return { ...student, status: "Signed", signedDate: new Date().toLocaleDateString() };
            }
            return student;
        }) || [];
        mockStudentsBySection[selectedSection] = updatedStudents;
        setSelectedStudents(new Set());
        setBulkSignModal(false);
    };

    const addTasksToStudents = () => {
        if (selectedStudents.size === 0 || !taskTitle.trim()) return;
        const updatedStudents = mockStudentsBySection[selectedSection]?.map(student => {
            if (selectedStudents.has(student.id)) {
                const newTaskId = student.tasks.length > 0 ? Math.max(...student.tasks.map((t: any) => t.id)) + 1 : 1;
                return {
                    ...student,
                    tasks: [...student.tasks, { id: newTaskId, desc: taskTitle, detail: taskDescription, done: false }]
                };
            }
            return student;
        }) || [];
        mockStudentsBySection[selectedSection] = updatedStudents;
        setAddTaskModal(false);
        setTaskTitle("");
        setTaskDescription("");
        setSelectedStudents(new Set());
    };

    const addPresetsToStudents = () => {
        if (selectedStudents.size === 0 || presets.length === 0) return;
        const selectedPresetData = presets.find(p => p.id === selectedPreset?.id);
        if (!selectedPresetData) return;
        const updatedStudents = mockStudentsBySection[selectedSection]?.map(student => {
            if (selectedStudents.has(student.id)) {
                const hasTask = student.tasks.some((t: any) => t.desc === selectedPresetData.name);
                if (!hasTask) {
                    const newTaskId = student.tasks.length > 0 ? Math.max(...student.tasks.map((t: any) => t.id)) + 1 : 1;
                    return {
                        ...student,
                        tasks: [...student.tasks, { id: newTaskId, desc: selectedPresetData.name, done: false }]
                    };
                }
            }
            return student;
        }) || [];
        mockStudentsBySection[selectedSection] = updatedStudents;
        setAddPresetModal(false);
        setSelectedPreset(null);
        setSelectedStudents(new Set());
    };

    return (
        <>
            <div className="courses-container">
                {/* User Header */}
                <div className="user-header" style={{ justifyContent: "space-between", position: "relative" }}>
                    <div className="user-info">
                        <div className="user-avatar" onClick={() => setSignOutDropdown(!signOutDropdown)} style={{ cursor: "pointer", position: "relative" }}>
                            NM
                            {signOutDropdown && (
                                <div style={{ position: "absolute", top: "50px", left: "0", background: "white", border: "1px solid #e0e0e0", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", zIndex: 1000, minWidth: "180px" }}>
                                    <button onClick={() => { window.location.href = "/"; }} style={{ padding: "12px 16px", background: "none", border: "none", color: "#f44336", cursor: "pointer", fontSize: "14px", fontWeight: "500", width: "100%", textAlign: "left" }}>Sign Out</button>
                                </div>
                            )}
                        </div>
                        <div className="user-details">
                            <p className="user-name">Normi Marikieno</p>
                            <p className="user-email">marikieno.normi@lcsandemo.universiti.edu</p>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="stats-section">
                    <div className="stat-card">
                        <p className="stat-label">Total Students</p>
                        <p className="stat-value">{totalStudents}</p>
                    </div>
                    <div className="stat-card signed">
                        <p className="stat-label">Signed</p>
                        <p className="stat-value">{signedCount}</p>
                    </div>
                    <div className="stat-card incomplete">
                        <p className="stat-label">Incomplete</p>
                        <p className="stat-value">{incompleteCount}</p>
                    </div>
                    <div className="stat-card pending">
                        <p className="stat-label">Pending</p>
                        <p className="stat-value">{pendingCount}</p>
                    </div>
                </div>

                {/* Manage Students Section */}
                <div className="manage-section">
                    <div className="manage-header">
                        <h2>Manage Students</h2>
                        <button 
                            className="manage-presets-btn"
                            onClick={() => setManagePresetsModal(true)}
                        >
                            Manage Presets
                        </button>
                    </div>

                    {/* Course Filters - Horizontal Scrollable */}
                    <div className="courses-scroll-container">
                        <div className="courses-filter">
                            {Object.keys(courseSections).map((course) => (
                                <button
                                    key={course}
                                    className={`course-btn ${selectedCourse === course ? "active" : ""}`}
                                    onClick={() => {
                                        setSelectedCourse(course);
                                        setSelectedSection(courseSections[course][0]);
                                    }}
                                >
                                    {course}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Sections - Horizontal Scrollable */}
                    <div className="sections-scroll-container">
                        <div className="sections-filter">
                            {courseSections[selectedCourse].map((section) => (
                                <button
                                    key={section}
                                    className={`section-btn ${selectedSection === section ? "active" : ""}`}
                                    onClick={() => setSelectedSection(section)}
                                >
                                    {section}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Selection Info and Actions */}
                    <div className="selection-bar">
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <span className="selection-count">
                                {selectedStudents.size} student{selectedStudents.size !== 1 ? "s" : ""} selected
                            </span>
                            <button 
                                onClick={() => {
                                    if (selectedStudents.size === currentStudents.length) {
                                        setSelectedStudents(new Set());
                                    } else {
                                        setSelectedStudents(new Set(currentStudents.map(s => s.id)));
                                    }
                                }} 
                                style={{ padding: "6px 12px", background: "#e0e0e0", color: "#333", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "12px", fontWeight: "500" }}>
                                {selectedStudents.size === currentStudents.length ? "Deselect All" : "Select All"}
                            </button>
                        </div>
                        <div className="action-buttons">
                            <button className="action-btn bulk-sign" onClick={() => { 
                                if (selectedStudents.size > 0) {
                                    const incomplete = new Set(Array.from(selectedStudents).filter(id => {
                                        const student = currentStudents.find(s => s.id === id);
                                        return student && student.status !== "Pending" && student.status !== "Signed";
                                    }));
                                    if (incomplete.size > 0) {
                                        setIncompleteInBulk(incomplete);
                                        setBulkSignWarning(true);
                                    } else {
                                        setBulkSignModal(true);
                                    }
                                }
                            }}>Bulk Sign</button>
                            <button className="action-btn add-task" onClick={() => setAddTaskModal(true)}>Add Task</button>
                            <button className="action-btn add-preset" onClick={() => setAddPresetModal(true)}>Add Preset</button>
                            {selectedStudents.size > 0 && (
                                <button 
                                    className="action-btn clear-selection"
                                    onClick={() => setSelectedStudents(new Set())}
                                >
                                    Clear Selection
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Student Cards */}
                    <div className="student-cards-section">
                        {currentStudents.map((student, index) => {
                            const statusColor = getStatusColor(student.status);
                            const tasksComplete = allTasksDone(student);
                            const tasksDoneCount = student.tasks.filter((t: any) => t.done).length;
                            
                            // Auto-update status to Pending when all tasks are done
                            if (tasksComplete && student.status !== "Signed" && student.status !== "Pending") {
                                const updatedStudents = mockStudentsBySection[selectedSection].map((s: any) => 
                                    s.id === student.id ? { ...s, status: "Pending" } : s
                                );
                                mockStudentsBySection[selectedSection] = updatedStudents;
                            }
                            
                            return (
                                <div key={index} className="student-card" style={{ borderLeftColor: statusColor.border, borderLeftWidth: "4px" }}>
                                    <div className="card-header">
                                        <div className="student-header-left">
                                            <input 
                                                type="checkbox" 
                                                className="student-checkbox"
                                                checked={selectedStudents.has(student.id)}
                                                onChange={() => toggleStudentSelect(student.id)}
                                            />
                                            <div className="student-name-section">
                                                <strong className="student-name">{student.name}</strong>
                                                <span className="status-badge" style={{ background: statusColor.bg, color: statusColor.color }}>
                                                    {student.status}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="student-details-inline">
                                            <span className="student-id">#{student.id}</span>
                                            <a href={`mailto:${student.email}`} className="email-link">📧</a>
                                            {student.signedDate && (
                                                <span className="signed-date">✓ Signed: {student.signedDate}</span>
                                            )}
                                        </div>
                                        <div className="student-header-right">
                                            <button 
                                                onClick={() => markAsSignedStudent(student.id)}
                                                disabled={student.status !== "Pending"}
                                                style={{ 
                                                    padding: "6px 12px", 
                                                    background: student.status === "Signed" ? "#4caf50" : student.status === "Pending" ? "#2196f3" : "#e0e0e0", 
                                                    color: student.status === "Signed" || student.status === "Pending" ? "white" : "#999", 
                                                    border: "none", 
                                                    borderRadius: "4px", 
                                                    cursor: student.status === "Pending" ? "pointer" : "not-allowed", 
                                                    fontSize: "12px", 
                                                    fontWeight: "500" 
                                                }}>
                                                {student.status === "Signed" ? "✓ Signed" : "Mark as Signed"}
                                            </button>
                                            <button 
                                                className="tasks-btn"
                                                onClick={() => setExpandedStudent(expandedStudent === student.id ? "" : student.id)}
                                            >
                                                {expandedStudent === student.id ? "Hide" : "Show"} Tasks ({tasksDoneCount}/{student.tasks.length})
                                            </button>
                                        </div>
                                    </div>

                                    {expandedStudent === student.id && (
                                        <div className="card-body">
                                            {student.tasks.map((task: any) => (
                                                <div key={task.id} className="task-item">
                                                    <input 
                                                        type="checkbox"
                                                        className="task-checkbox"
                                                        checked={task.done}
                                                        onChange={() => toggleTaskDone(student.id, task.id)}
                                                    />
                                                    <span className="task-desc">{task.desc}</span>
                                                    {!task.done && <span className="task-note">Follow up on missed {task.desc.toLowerCase()}</span>}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Bulk Sign Warning Modal */}
                {bulkSignWarning && (
                    <div className="modal-overlay">
                        <div className="modal" style={{ minWidth: "450px" }}>
                            <div className="modal-header">
                                <h3 style={{ color: "#f44336" }}>⚠️ Incomplete Students</h3>
                                <button className="close-btn" onClick={() => setBulkSignWarning(false)}>✕</button>
                            </div>
                            <div className="modal-content">
                                <p>The following {incompleteInBulk.size} student{incompleteInBulk.size !== 1 ? "s" : ""} cannot be signed because they still have incomplete tasks:</p>
                                <div style={{ background: "#fff8e1", borderRadius: "8px", padding: "12px", marginBottom: "20px", maxHeight: "200px", overflowY: "auto" }}>
                                    {Array.from(incompleteInBulk).map(studentId => {
                                        const student = currentStudents.find(s => s.id === studentId);
                                        return student ? (
                                            <div key={studentId} style={{ padding: "8px", background: "white", borderRadius: "4px", marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                <div>
                                                    <p style={{ margin: "0", fontSize: "13px", fontWeight: "500", color: "#333" }}>{student.name}</p>
                                                    <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: "#999" }}>Status: {student.status}</p>
                                                </div>
                                                <button onClick={() => { setIncompleteInBulk(prev => { const newSet = new Set(prev); newSet.delete(studentId); return newSet; }); setSelectedStudents(prev => { const newSet = new Set(prev); newSet.delete(studentId); return newSet; }); }} style={{ padding: "4px 8px", background: "#f44336", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "11px" }}>Remove</button>
                                            </div>
                                        ) : null;
                                    })}
                                </div>
                                <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                                    <button className="modal-btn" style={{ background: "#f0f0f0", color: "#333" }} onClick={() => { setBulkSignWarning(false); setIncompleteInBulk(new Set()); }}>Cancel</button>
                                    <button className="modal-btn" onClick={() => { setBulkSignWarning(false); setBulkSignModal(true); setIncompleteInBulk(new Set()); }}>Continue with {selectedStudents.size - incompleteInBulk.size} student{selectedStudents.size - incompleteInBulk.size !== 1 ? "s" : ""}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Bulk Sign Modal */}
                {bulkSignModal && (
                    <div className="modal-overlay">
                        <div className="modal">
                            <div className="modal-header">
                                <h3>Bulk Sign</h3>
                                <button className="close-btn" onClick={() => setBulkSignModal(false)}>✕</button>
                            </div>
                            <div className="modal-content">
                                <p>Upload an Excel file to bulk sign students</p>
                                <input type="file" accept=".xlsx,.xls" />
                                <button className="modal-btn">Upload</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Add Task Modal */}
                {addTaskModal && (
                    <div className="modal-overlay">
                        <div className="modal">
                            <div className="modal-header">
                                <h3>Add Task</h3>
                                <button className="close-btn" onClick={() => setAddTaskModal(false)}>✕</button>
                            </div>
                            <div className="modal-content">
                                <p>Add a task for selected students</p>
                                <input type="text" placeholder="Task title..." value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} style={{ width: "100%", padding: "8px", marginTop: "8px", borderRadius: "4px", border: "1px solid #ddd", boxSizing: "border-box" }} />
                                <textarea placeholder="Task description..." value={taskDescription} onChange={(e) => setTaskDescription(e.target.value)} style={{ width: "100%", padding: "8px", marginTop: "8px", borderRadius: "4px", border: "1px solid #ddd", boxSizing: "border-box", minHeight: "80px" }} />
                                <button className="modal-btn" onClick={addTasksToStudents}>Add Task</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Add Preset Modal */}
                {addPresetModal && (
                    <div className="modal-overlay">
                        <div className="modal">
                            <div className="modal-header">
                                <h3>Add Preset</h3>
                                <button className="close-btn" onClick={() => { setAddPresetModal(false); setSelectedPreset(null); }}>✕</button>
                            </div>
                            <div className="modal-content">
                                <p>Select a preset task to add to {selectedStudents.size} selected student{selectedStudents.size !== 1 ? "s" : ""}</p>
                                <div style={{ marginTop: "16px", background: "#f9f9f9", borderRadius: "8px", padding: "12px", maxHeight: "300px", overflowY: "auto" }}>
                                    {presets.length > 0 ? (
                                        presets.map(preset => (
                                            <div key={preset.id} onClick={() => setSelectedPreset(preset)} style={{ padding: "10px", background: selectedPreset?.id === preset.id ? "#1976d2" : "white", borderRadius: "6px", marginBottom: "8px", cursor: "pointer", border: selectedPreset?.id === preset.id ? "1px solid #1565c0" : "1px solid #e0e0e0", transition: "all 0.2s" }} onMouseEnter={(e) => { if (selectedPreset?.id !== preset.id) e.currentTarget.style.background = "#f0f8ff"; }} onMouseLeave={(e) => { if (selectedPreset?.id !== preset.id) e.currentTarget.style.background = "white"; }}>
                                                <p style={{ margin: "0", fontWeight: "500", fontSize: "12px", color: selectedPreset?.id === preset.id ? "white" : "#333" }}>{preset.name}</p>
                                            </div>
                                        ))
                                    ) : (
                                        <p style={{ fontSize: "12px", color: "#999" }}>No presets available</p>
                                    )}
                                </div>
                                <div style={{ display: "flex", gap: "8px", marginTop: "16px", justifyContent: "flex-end" }}>
                                    <button className="modal-btn" style={{ background: "#f0f0f0", color: "#333" }} onClick={() => { setAddPresetModal(false); setSelectedPreset(null); }}>Cancel</button>
                                    <button className="modal-btn" onClick={addPresetsToStudents} disabled={!selectedPreset} style={{ background: selectedPreset ? "#1976d2" : "#ccc", cursor: selectedPreset ? "pointer" : "not-allowed" }}>Add Preset</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Manage Presets Modal */}
                {managePresetsModal && (
                    <div className="modal-overlay">
                        <div className="modal">
                            <div className="modal-header">
                                <h3>Manage Presets</h3>
                                <button className="close-btn" onClick={() => setManagePresetsModal(false)}>✕</button>
                            </div>
                            <div className="modal-content">
                                <p>Add or remove courses/sections</p>
                                <div style={{ marginTop: "16px" }}>
                                    <p>Current courses: {Object.keys(courseSections).join(", ")}</p>
                                    <input type="text" placeholder="Add new course..." style={{ width: "100%", padding: "8px", marginTop: "8px", borderRadius: "4px", border: "1px solid #ddd" }} />
                                    <button className="modal-btn">Add Course</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style jsx>{`
                .courses-container {
                    padding: 20px;
                    background: #f9f9f9;
                    min-height: 100vh;
                }

                .user-header {
                    background: white;
                    border: 1px solid #e0e0e0;
                    border-radius: 8px;
                    padding: 16px;
                    margin-bottom: 24px;
                    display: flex;
                    align-items: center;
                }

                .user-info {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .user-avatar {
                    width: 40px;
                    height: 40px;
                    background: #1976d2;
                    color: white;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    font-size: 14px;
                }

                .user-details {
                    display: flex;
                    flex-direction: column;
                }

                .user-name {
                    margin: 0;
                    font-weight: 600;
                    font-size: 14px;
                    color: #333;
                }

                .user-email {
                    margin: 2px 0 0 0;
                    font-size: 12px;
                    color: #666;
                }

                .stats-section {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 16px;
                    margin-bottom: 30px;
                }

                .stat-card {
                    background: white;
                    border: 1px solid #e0e0e0;
                    border-radius: 8px;
                    padding: 20px;
                    text-align: center;
                }

                .stat-card.signed {
                    background: #e8f5e9;
                    border: 2px solid #4caf50;
                }

                .stat-card.incomplete {
                    background: #fff8e1;
                    border: 2px solid #fbc02d;
                }

                .stat-card.pending {
                    background: #ffebee;
                    border: 2px solid #f44336;
                }

                .stat-label {
                    margin: 0;
                    font-size: 12px;
                    color: #666;
                    font-weight: 500;
                    text-transform: capitalize;
                }

                .stat-value {
                    margin: 8px 0 0 0;
                    font-size: 32px;
                    font-weight: bold;
                    color: #333;
                }

                .stat-card.signed .stat-value {
                    color: #4caf50;
                }

                .stat-card.incomplete .stat-value {
                    color: #fbc02d;
                }

                .stat-card.pending .stat-value {
                    color: #f44336;
                }

                .manage-section {
                    background: white;
                    border: 1px solid #e0e0e0;
                    border-radius: 8px;
                    padding: 24px;
                }

                .manage-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                }

                .manage-header h2 {
                    margin: 0;
                    font-size: 18px;
                }

                .manage-presets-btn {
                    padding: 8px 16px;
                    background: white;
                    border: 1px solid #e0e0e0;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                    color: #666;
                    transition: all 0.2s ease;
                }

                .manage-presets-btn:hover {
                    background: #f5f5f5;
                }

                .courses-scroll-container {
                    overflow-x: auto;
                    margin-bottom: 12px;
                    padding-bottom: 8px;
                }

                .courses-filter {
                    display: flex;
                    gap: 8px;
                    min-width: min-content;
                }

                .course-btn {
                    padding: 8px 16px;
                    background: #f5f5f5;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                    font-weight: 600;
                    white-space: nowrap;
                    transition: all 0.2s ease;
                    color: #333;
                }

                .course-btn:hover {
                    background: #efefef;
                }

                .course-btn.active {
                    background: #1976d2;
                    color: white;
                    border-color: #1976d2;
                }

                .sections-scroll-container {
                    overflow-x: auto;
                    margin-bottom: 16px;
                    padding-bottom: 8px;
                }

                .sections-filter {
                    display: flex;
                    gap: 8px;
                    min-width: min-content;
                }

                .section-btn {
                    padding: 6px 12px;
                    background: #f9f9f9;
                    border: 1px solid #e0e0e0;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 11px;
                    white-space: nowrap;
                    transition: all 0.2s ease;
                    color: #666;
                }

                .section-btn:hover {
                    background: #f0f0f0;
                }

                .section-btn.active {
                    background: white;
                    border: 1px solid #1976d2;
                    color: #1976d2;
                    font-weight: 600;
                }

                .selection-bar {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    padding: 12px;
                    background: #f9f9f9;
                    border-radius: 4px;
                }

                .selection-count {
                    font-size: 14px;
                    color: #666;
                }

                .action-buttons {
                    display: flex;
                    gap: 8px;
                }

                .action-btn {
                    padding: 8px 16px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                    font-weight: 500;
                    transition: all 0.2s ease;
                }

                .action-btn.bulk-sign,
                .action-btn.add-task,
                .action-btn.add-preset {
                    background: #1976d2;
                    color: white;
                }

                .action-btn:hover {
                    opacity: 0.9;
                }

                .action-btn.clear-selection {
                    background: #e0e0e0;
                    color: #333;
                }

                .student-cards-section {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    margin-top: 20px;
                }

                .student-card {
                    border: 1px solid #e0e0e0;
                    border-radius: 8px;
                    background: white;
                    overflow: hidden;
                }

                .card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 16px;
                    cursor: pointer;
                    transition: background 0.2s ease;
                    gap: 16px;
                }

                .card-header:hover {
                    background: #fafafa;
                }

                .student-header-left {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .student-checkbox {
                    width: 18px;
                    height: 18px;
                    cursor: pointer;
                }

                .student-name-section {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .student-name {
                    font-size: 14px;
                    color: #333;
                }

                .status-badge {
                    padding: 2px 8px;
                    border-radius: 4px;
                    font-size: 11px;
                    font-weight: 600;
                }

                .student-details-inline {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    font-size: 12px;
                    flex: 1;
                }

                .student-id {
                    color: #999;
                }

                .email-link {
                    text-decoration: none;
                    cursor: pointer;
                }

                .signed-date {
                    color: #4caf50;
                    font-weight: 500;
                }

                .student-header-right {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .signed-btn {
                    padding: 6px 12px;
                    background: #4caf50;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                    font-weight: 500;
                    transition: all 0.2s ease;
                }

                .signed-btn:hover {
                    background: #45a049;
                }

                .tasks-btn {
                    padding: 6px 12px;
                    background: #e3f2fd;
                    color: #1976d2;
                    border: 1px solid #1976d2;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                    font-weight: 500;
                    white-space: nowrap;
                    transition: all 0.2s ease;
                }

                .tasks-btn:hover {
                    background: #1976d2;
                    color: white;
                }

                .card-body {
                    padding: 12px 16px;
                    background: #fafafa;
                    border-top: 1px solid #f0f0f0;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .task-item {
                    display: flex;
                    align-items: flex-start;
                    gap: 8px;
                    padding: 8px;
                    background: white;
                    border-radius: 4px;
                }

                .task-checkbox {
                    width: 16px;
                    height: 16px;
                    cursor: pointer;
                    margin-top: 2px;
                }

                .task-desc {
                    font-size: 13px;
                    color: #333;
                    font-weight: 500;
                }

                .task-note {
                    font-size: 12px;
                    color: #999;
                    margin-left: auto;
                }

                .modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 1000;
                }

                .modal {
                    background: white;
                    border-radius: 8px;
                    padding: 24px;
                    min-width: 400px;
                    max-height: 80vh;
                    overflow-y: auto;
                }

                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                }

                .modal-header h3 {
                    margin: 0;
                }

                .close-btn {
                    background: none;
                    border: none;
                    font-size: 20px;
                    cursor: pointer;
                    color: #666;
                }

                .modal-content {
                    margin-top: 16px;
                }

                .modal-content p {
                    margin: 0 0 12px 0;
                    font-size: 14px;
                    color: #666;
                }

                .modal-content input {
                    width: 100%;
                    padding: 8px 12px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-size: 14px;
                    margin: 8px 0;
                }

                .modal-btn {
                    padding: 10px 16px;
                    background: #1976d2;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                    margin-top: 8px;
                }

                .modal-btn:hover {
                    opacity: 0.9;
                }
            `}</style>
        </>
    );
}
