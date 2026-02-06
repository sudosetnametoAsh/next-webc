"use client";
import { useState } from "react";

export default function DepartmentPreview() {
    const [selectedCourse, setSelectedCourse] = useState<string>("BSCS");
    const [selectedSection, setSelectedSection] = useState<string>("BSCS 2/1-1");
    const [expandedStudent, setExpandedStudent] = useState<string>("");
    const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
    const [students, setStudents] = useState<Record<string, any[]>>({});
    const [bulkSignModal, setBulkSignModal] = useState(false);
    const [bulkSignWarning, setBulkSignWarning] = useState(false);
    const [incompleteInBulk, setIncompleteInBulk] = useState<Set<string>>(new Set());
    const [addTaskModal, setAddTaskModal] = useState(false);
    const [addPresetModal, setAddPresetModal] = useState(false);
    const [managePresetsModal, setManagePresetsModal] = useState(false);
    const [filterType, setFilterType] = useState<"all" | "signed" | "unsigned" | "pending" | "alpha">("all");
    const [signOutDropdown, setSignOutDropdown] = useState(false);
    const [selectedPreset, setSelectedPreset] = useState<any>(null);
    const [presets, setPresets] = useState<any[]>([
        { id: 1, name: "Missing Exam" },
        { id: 2, name: "Missing DSAI exam" },
        { id: 3, name: "Incomplete Requirements" }
    ]);
    const [newPresetName, setNewPresetName] = useState("");
    const [taskTitle, setTaskTitle] = useState("");
    const [taskDescription, setTaskDescription] = useState("");

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

    // Initialize students with better data
    const generateStudents = (section: string) => {
        if (students[section]) return students[section];
        
        const statuses = ["Signed", "Incomplete", "Pending"];
        const firstNames = ["Jobert", "Bench", "Josie", "Juan", "Maria", "Carlos", "Rosa", "Miguel", "Sofia", "Diego", "Elena", "Anna", "James", "Patricia", "Robert", "Jennifer", "Michael", "Linda", "William", "Barbara"];
        const lastNames = ["Baldovino", "Canzana", "Jato", "Cruz", "Santos", "Lopez", "Rivera", "Reyes", "Moreno", "Fernandez", "Gutierrez", "Garcia", "Martinez", "Rodriguez", "Johnson", "Williams", "Brown", "Jones", "Miller", "Davis"];
        
        let count = Math.floor(Math.random() * (20 - 5 + 1)) + 5;
        const newStudents: any[] = [];
        
        for (let i = 0; i < count; i++) {
            const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
            const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
            const status = statuses[Math.floor(Math.random() * statuses.length)];
            const studentId = `2022${String(Math.floor(Math.random() * 100000)).padStart(5, "0")}`;
            
            let tasksDone = 0;
            const tasks = [];
            for (let j = 0; j < 3; j++) {
                const done = Math.random() > 0.6;
                if (done) tasksDone++;
                tasks.push({ id: j + 1, desc: presets[j]?.name || `Task ${j + 1}`, done });
            }
            
            newStudents.push({
                id: studentId,
                name: `${firstName} ${lastName}`,
                email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@lcsandemo.universiti.edu`,
                status: tasksDone === 3 ? "Signed" : (tasksDone >= 1 ? "Incomplete" : "Pending"),
                signedDate: tasksDone === 3 ? new Date(2025, Math.floor(Math.random() * 10), Math.floor(Math.random() * 28) + 1).toLocaleDateString() : null,
                tasks
            });
        }
        
        setStudents(prev => ({ ...prev, [section]: newStudents as any[] }));
        return newStudents;
    };

    const currentStudents = students[selectedSection] || generateStudents(selectedSection);
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
        const updatedStudents = students[selectedSection]?.map(student => {
            if (student.id === studentId) {
                return {
                    ...student,
                    tasks: student.tasks.map((task: any) => 
                        task.id === taskId ? { ...task, done: !task.done } : task
                    )
                };
            }
            return student;
        }) || [];
        
        setStudents(prev => ({ ...prev, [selectedSection]: updatedStudents }));
    };

    const allTasksDone = (student: any) => {
        return student.tasks && student.tasks.length > 0 && student.tasks.every((t: any) => t.done);
    };

    const markAsSignedStudent = (studentId: string) => {
        const updatedStudents = students[selectedSection]?.map(student => {
            if (student.id === studentId) {
                return { ...student, status: "Signed", signedDate: new Date().toLocaleDateString() };
            }
            return student;
        }) || [];
        setStudents(prev => ({ ...prev, [selectedSection]: updatedStudents }));
    };

    const addTasksToStudents = () => {
        if (selectedStudents.size === 0 || !taskTitle.trim()) return;
        const updatedStudents = students[selectedSection]?.map(student => {
            if (selectedStudents.has(student.id)) {
                const newTaskId = student.tasks.length > 0 ? Math.max(...student.tasks.map((t: any) => t.id)) + 1 : 1;
                return {
                    ...student,
                    tasks: [...student.tasks, { id: newTaskId, desc: taskTitle, detail: taskDescription, done: false }]
                };
            }
            return student;
        }) || [];
        setStudents(prev => ({ ...prev, [selectedSection]: updatedStudents }));
        setAddTaskModal(false);
        setTaskTitle("");
        setTaskDescription("");
        setSelectedStudents(new Set());
    };

    const addPresetsToStudents = () => {
        if (selectedStudents.size === 0 || presets.length === 0) return;
        const selectedPreset = presets[0];
        const updatedStudents = students[selectedSection]?.map(student => {
            if (selectedStudents.has(student.id)) {
                const hasTask = student.tasks.some((t: any) => t.desc === selectedPreset.name);
                if (!hasTask) {
                    return {
                        ...student,
                        tasks: [...student.tasks, { id: Math.max(...student.tasks.map((t: any) => t.id)) + 1, desc: selectedPreset.name, done: false }]
                    };
                }
            }
            return student;
        }) || [];
        setStudents(prev => ({ ...prev, [selectedSection]: updatedStudents }));
        setAddPresetModal(false);
    };

    const bulkSignStudents = () => {
        if (selectedStudents.size === 0) return;
        const updatedStudents = students[selectedSection]?.map(student => {
            if (selectedStudents.has(student.id)) {
                return { ...student, status: "Signed", signedDate: new Date().toLocaleDateString() };
            }
            return student;
        }) || [];
        setStudents(prev => ({ ...prev, [selectedSection]: updatedStudents }));
        setSelectedStudents(new Set());
        setBulkSignModal(false);
    };

    const getFilteredStudents = () => {
        let filtered = currentStudents;
        
        if (filterType === "signed") {
            filtered = filtered.filter(s => s.status === "Signed");
        } else if (filterType === "unsigned") {
            filtered = filtered.filter(s => s.status !== "Signed");
        } else if (filterType === "pending") {
            filtered = filtered.filter(s => s.status === "Pending");
        } else if (filterType === "alpha") {
            filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
        }
        
        return filtered;
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

    return (
        <>
            <div style={{ padding: "20px", backgroundColor: "#f9f9f9", minHeight: "100vh" }}>
                {/* User Header */}
                <div style={{ background: "white", border: "1px solid #e0e0e0", borderRadius: "8px", padding: "16px", marginBottom: "24px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{ width: "40px", height: "40px", background: "#1976d2", color: "white", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "14px", cursor: "pointer", position: "relative" }} onClick={() => setSignOutDropdown(!signOutDropdown)}>
                            NM
                            {signOutDropdown && (
                                <div style={{ position: "absolute", top: "50px", left: "0", background: "white", border: "1px solid #e0e0e0", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", zIndex: 1000, minWidth: "180px" }}>
                                    <button onClick={() => { window.location.href = "/"; }} style={{ padding: "12px 16px", background: "none", border: "none", color: "#f44336", cursor: "pointer", fontSize: "14px", fontWeight: "500", width: "100%", textAlign: "left" }}>Sign Out</button>
                                </div>
                            )}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                            <p style={{ margin: "0", fontWeight: "600", fontSize: "14px", color: "#333" }}>Noemi Martillano</p>
                            <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#666" }}>martillano.noemi@sti.edu</p>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "30px" }}>
                    <div style={{ background: "white", border: "1px solid #e0e0e0", borderRadius: "8px", padding: "20px", textAlign: "center" }}>
                        <p style={{ margin: "0", fontSize: "12px", color: "#666", fontWeight: "500" }}>Total Students</p>
                        <p style={{ margin: "8px 0 0 0", fontSize: "32px", fontWeight: "bold", color: "#333" }}>{totalStudents}</p>
                    </div>
                    <div style={{ background: "#e8f5e9", border: "2px solid #4caf50", borderRadius: "8px", padding: "20px", textAlign: "center" }}>
                        <p style={{ margin: "0", fontSize: "12px", color: "#666", fontWeight: "500" }}>Signed</p>
                        <p style={{ margin: "8px 0 0 0", fontSize: "32px", fontWeight: "bold", color: "#4caf50" }}>{signedCount}</p>
                    </div>
                    <div style={{ background: "#fff8e1", border: "2px solid #fbc02d", borderRadius: "8px", padding: "20px", textAlign: "center" }}>
                        <p style={{ margin: "0", fontSize: "12px", color: "#666", fontWeight: "500" }}>Incomplete</p>
                        <p style={{ margin: "8px 0 0 0", fontSize: "32px", fontWeight: "bold", color: "#fbc02d" }}>{incompleteCount}</p>
                    </div>
                    <div style={{ background: "#ffebee", border: "2px solid #f44336", borderRadius: "8px", padding: "20px", textAlign: "center" }}>
                        <p style={{ margin: "0", fontSize: "12px", color: "#666", fontWeight: "500" }}>Pending</p>
                        <p style={{ margin: "8px 0 0 0", fontSize: "32px", fontWeight: "bold", color: "#f44336" }}>{pendingCount}</p>
                    </div>
                </div>

                {/* Manage Students Section */}
                <div style={{ background: "white", border: "1px solid #e0e0e0", borderRadius: "8px", padding: "24px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                        <h2 style={{ margin: "0", fontSize: "18px" }}>Manage Students</h2>
                        <button onClick={() => setManagePresetsModal(true)} style={{ padding: "8px 16px", background: "white", border: "1px solid #e0e0e0", borderRadius: "4px", cursor: "pointer", fontSize: "12px", color: "#666" }}>
                            Manage Presets
                        </button>
                    </div>

                    {/* Course Filters - Horizontal Scrollable */}
                    <div style={{ overflowX: "auto", marginBottom: "12px", paddingBottom: "8px" }}>
                        <div style={{ display: "flex", gap: "8px", minWidth: "min-content" }}>
                            {Object.keys(courseSections).map((course) => (
                                <button
                                    key={course}
                                    onClick={() => {
                                        setSelectedCourse(course);
                                        setSelectedSection(courseSections[course][0]);
                                    }}
                                    style={{
                                        padding: "8px 16px",
                                        background: selectedCourse === course ? "#1976d2" : "#f5f5f5",
                                        color: selectedCourse === course ? "white" : "#333",
                                        border: selectedCourse === course ? "1px solid #1976d2" : "1px solid #ddd",
                                        borderRadius: "4px",
                                        cursor: "pointer",
                                        fontSize: "12px",
                                        fontWeight: "600",
                                        whiteSpace: "nowrap",
                                        transition: "all 0.2s ease"
                                    }}
                                >
                                    {course}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Sections - Horizontal Scrollable */}
                    <div style={{ overflowX: "auto", marginBottom: "16px", paddingBottom: "8px" }}>
                        <div style={{ display: "flex", gap: "8px", minWidth: "min-content" }}>
                            {courseSections[selectedCourse].map((section) => (
                                <button
                                    key={section}
                                    onClick={() => setSelectedSection(section)}
                                    style={{
                                        padding: "6px 12px",
                                        background: selectedSection === section ? "white" : "#f9f9f9",
                                        color: selectedSection === section ? "#1976d2" : "#666",
                                        border: selectedSection === section ? "1px solid #1976d2" : "1px solid #e0e0e0",
                                        borderRadius: "4px",
                                        cursor: "pointer",
                                        fontSize: "11px",
                                        whiteSpace: "nowrap",
                                        fontWeight: selectedSection === section ? "600" : "normal",
                                        transition: "all 0.2s ease"
                                    }}
                                >
                                    {section}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Selection Bar */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", padding: "12px", background: "#f9f9f9", borderRadius: "4px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <span style={{ fontSize: "14px", color: "#666" }}>{selectedStudents.size} student{selectedStudents.size !== 1 ? "s" : ""} selected</span>
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
                        <div style={{ display: "flex", gap: "8px" }}>
                            <button onClick={() => { 
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
                            }} style={{ padding: "8px 16px", background: selectedStudents.size > 0 ? "#1976d2" : "#ccc", color: "white", border: "none", borderRadius: "4px", cursor: selectedStudents.size > 0 ? "pointer" : "not-allowed", fontSize: "12px", fontWeight: "500" }} disabled={selectedStudents.size === 0}>Bulk Sign</button>
                            <button onClick={() => { if (selectedStudents.size > 0) setAddTaskModal(true); }} style={{ padding: "8px 16px", background: selectedStudents.size > 0 ? "#1976d2" : "#ccc", color: "white", border: "none", borderRadius: "4px", cursor: selectedStudents.size > 0 ? "pointer" : "not-allowed", fontSize: "12px", fontWeight: "500" }} disabled={selectedStudents.size === 0}>Add Task</button>
                            <button onClick={() => { if (selectedStudents.size > 0) setAddPresetModal(true); }} style={{ padding: "8px 16px", background: selectedStudents.size > 0 ? "#1976d2" : "#ccc", color: "white", border: "none", borderRadius: "4px", cursor: selectedStudents.size > 0 ? "pointer" : "not-allowed", fontSize: "12px", fontWeight: "500" }} disabled={selectedStudents.size === 0}>Add Preset</button>
                            {selectedStudents.size > 0 && (
                                <button onClick={() => setSelectedStudents(new Set())} style={{ padding: "8px 16px", background: "#e0e0e0", color: "#333", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "12px", fontWeight: "500" }}>Clear Selection</button>
                            )}
                        </div>
                    </div>

                    {/* Filter Bar */}
                    <div style={{ display: "flex", gap: "8px", marginBottom: "20px", padding: "12px", background: "#f0f0f0", borderRadius: "4px" }}>
                        <span style={{ fontSize: "13px", fontWeight: "600", color: "#333", display: "flex", alignItems: "center" }}>Filter:</span>
                        {(["all", "signed", "unsigned", "pending", "alpha"] as const).map(filter => (
                            <button
                                key={filter}
                                onClick={() => setFilterType(filter)}
                                style={{
                                    padding: "6px 12px",
                                    background: filterType === filter ? "#1976d2" : "white",
                                    color: filterType === filter ? "white" : "#666",
                                    border: filterType === filter ? "none" : "1px solid #ddd",
                                    borderRadius: "4px",
                                    cursor: "pointer",
                                    fontSize: "11px",
                                    fontWeight: "500",
                                    textTransform: "capitalize"
                                }}
                            >
                                {filter === "alpha" ? "A-Z" : filter}
                            </button>
                        ))}
                    </div>

                    {/* Student Cards */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {getFilteredStudents().map((student, index) => {
                            const statusColor = getStatusColor(student.status);
                            const tasksComplete = allTasksDone(student);
                            const tasksDoneCount = student.tasks.filter((t: any) => t.done).length;
                            
                            // Auto-update status to Pending when all tasks are done
                            if (tasksComplete && student.status !== "Signed" && student.status !== "Pending") {
                                const updatedStudents = students[selectedSection].map((s: any) => 
                                    s.id === student.id ? { ...s, status: "Pending" } : s
                                );
                                setStudents(prev => ({ ...prev, [selectedSection]: updatedStudents }));
                            }
                            
                            return (
                                <div key={index} style={{ border: "1px solid #e0e0e0", borderRadius: "8px", background: "white", overflow: "hidden", borderLeftColor: statusColor.border, borderLeftWidth: "4px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px", cursor: "pointer", gap: "16px" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                            <input 
                                                type="checkbox" 
                                                style={{ width: "18px", height: "18px", cursor: "pointer" }}
                                                checked={selectedStudents.has(student.id)}
                                                onChange={() => toggleStudentSelect(student.id)}
                                            />
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                <strong style={{ fontSize: "14px", color: "#333" }}>{student.name}</strong>
                                                <span style={{ padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "600", background: statusColor.bg, color: statusColor.color }}>
                                                    {student.status}
                                                </span>
                                            </div>
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "12px", flex: "1" }}>
                                            <span style={{ color: "#999" }}>#{student.id}</span>
                                            <a href={`mailto:${student.email}`} style={{ textDecoration: "none", cursor: "pointer" }}>📧</a>
                                            {student.signedDate && (
                                                <span style={{ color: "#4caf50", fontWeight: "500" }}>✓ Signed: {student.signedDate}</span>
                                            )}
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
                                                onClick={() => setExpandedStudent(expandedStudent === student.id ? "" : student.id)}
                                                style={{ padding: "6px 12px", background: "#e3f2fd", color: "#1976d2", border: "1px solid #1976d2", borderRadius: "4px", cursor: "pointer", fontSize: "12px", fontWeight: "500", whiteSpace: "nowrap" }}
                                            >
                                                {expandedStudent === student.id ? "Hide" : "Show"} Tasks ({tasksDoneCount}/{student.tasks.length})
                                            </button>
                                        </div>
                                    </div>

                                    {expandedStudent === student.id && (
                                        <div style={{ padding: "12px 16px", background: "#fafafa", borderTop: "1px solid #f0f0f0", display: "flex", flexDirection: "column", gap: "8px" }}>
                                            {student.tasks.map((task: any) => (
                                                <div key={task.id} style={{ display: "flex", alignItems: "flex-start", gap: "8px", padding: "8px", background: "white", borderRadius: "4px" }}>
                                                    <input 
                                                        type="checkbox"
                                                        style={{ width: "16px", height: "16px", cursor: "pointer", marginTop: "2px" }}
                                                        checked={task.done}
                                                        onChange={() => toggleTaskDone(student.id, task.id)}
                                                    />
                                                    <span style={{ fontSize: "13px", color: "#333", fontWeight: "500" }}>{task.desc}</span>
                                                    {!task.done && <span style={{ fontSize: "12px", color: "#999", marginLeft: "auto" }}>Follow up on missed {task.desc.toLowerCase()}</span>}
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
                    <div style={{ position: "fixed", inset: "0", background: "rgba(0, 0, 0, 0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
                        <div style={{ background: "white", borderRadius: "12px", padding: "28px", minWidth: "450px", maxHeight: "80vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                                <h3 style={{ margin: "0", fontSize: "18px", fontWeight: "600", color: "#f44336" }}>⚠️ Incomplete Students</h3>
                                <button onClick={() => setBulkSignWarning(false)} style={{ background: "none", border: "none", fontSize: "24px", cursor: "pointer", color: "#666" }}>✕</button>
                            </div>
                            <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "#999" }}>The following {incompleteInBulk.size} student{incompleteInBulk.size !== 1 ? "s" : ""} cannot be signed because they still have incomplete tasks:</p>
                            
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
                                <button onClick={() => { setBulkSignWarning(false); setIncompleteInBulk(new Set()); }} style={{ padding: "10px 20px", background: "#f0f0f0", color: "#333", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "14px", fontWeight: "500" }}>Cancel</button>
                                <button onClick={() => { setBulkSignWarning(false); setBulkSignModal(true); setIncompleteInBulk(new Set()); }} style={{ padding: "10px 20px", background: "#1976d2", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "14px", fontWeight: "500" }}>Continue with {selectedStudents.size - incompleteInBulk.size} student{selectedStudents.size - incompleteInBulk.size !== 1 ? "s" : ""}</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Bulk Sign Modal */}
                {bulkSignModal && (
                    <div style={{ position: "fixed", inset: "0", background: "rgba(0, 0, 0, 0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
                        <div style={{ background: "white", borderRadius: "12px", padding: "28px", minWidth: "450px", maxHeight: "80vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                                <h3 style={{ margin: "0", fontSize: "18px", fontWeight: "600" }}>Bulk Sign Students</h3>
                                <button onClick={() => setBulkSignModal(false)} style={{ background: "none", border: "none", fontSize: "24px", cursor: "pointer", color: "#666" }}>✕</button>
                            </div>
                            <p style={{ margin: "0 0 16px 0", fontSize: "14px", color: "#666" }}>Sign {selectedStudents.size} selected student{selectedStudents.size !== 1 ? "s" : ""} at once</p>
                            <div style={{ background: "#f0f8ff", padding: "12px", borderRadius: "6px", marginBottom: "20px" }}>
                                <p style={{ margin: "0", fontSize: "13px", color: "#1976d2" }}>✓ All selected students will be marked as "Signed" with today's date</p>
                            </div>
                            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                                <button onClick={() => setBulkSignModal(false)} style={{ padding: "10px 20px", background: "#f0f0f0", color: "#333", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "14px", fontWeight: "500" }}>Cancel</button>
                                <button onClick={bulkSignStudents} style={{ padding: "10px 20px", background: "#4caf50", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "14px", fontWeight: "500" }}>Sign All ({selectedStudents.size})</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Add Task Modal */}
                {addTaskModal && (
                    <div style={{ position: "fixed", inset: "0", background: "rgba(0, 0, 0, 0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
                        <div style={{ background: "white", borderRadius: "12px", padding: "28px", minWidth: "450px", maxHeight: "80vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                                <h3 style={{ margin: "0", fontSize: "18px", fontWeight: "600" }}>Add Task to Multiple Students</h3>
                                <button onClick={() => setAddTaskModal(false)} style={{ background: "none", border: "none", fontSize: "24px", cursor: "pointer", color: "#666" }}>✕</button>
                            </div>
                            <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "#999" }}>Add a task to {selectedStudents.size} selected student{selectedStudents.size !== 1 ? "s" : ""}</p>
                            
                            <div style={{ marginBottom: "16px" }}>
                                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#333" }}>Task Title</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Return Library Books"
                                    value={taskTitle}
                                    onChange={(e) => setTaskTitle(e.target.value)}
                                    style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px", boxSizing: "border-box" }} 
                                />
                            </div>

                            <div style={{ marginBottom: "20px" }}>
                                <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500", color: "#333" }}>Description</label>
                                <textarea 
                                    placeholder="Provide details about the task..."
                                    value={taskDescription}
                                    onChange={(e) => setTaskDescription(e.target.value)}
                                    style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px", minHeight: "100px", boxSizing: "border-box", fontFamily: "inherit" }} 
                                />
                            </div>

                            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                                <button onClick={() => setAddTaskModal(false)} style={{ padding: "10px 20px", background: "#f0f0f0", color: "#333", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "14px", fontWeight: "500" }}>Cancel</button>
                                <button onClick={addTasksToStudents} style={{ padding: "10px 20px", background: "#1976d2", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "14px", fontWeight: "500" }}>Add to {selectedStudents.size} student{selectedStudents.size !== 1 ? "s" : ""}</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Add Preset Modal */}
                {addPresetModal && (
                    <div style={{ position: "fixed", inset: "0", background: "rgba(0, 0, 0, 0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
                        <div style={{ background: "white", borderRadius: "12px", padding: "28px", minWidth: "450px", maxHeight: "80vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                                <h3 style={{ margin: "0", fontSize: "18px", fontWeight: "600" }}>Add Preset to Multiple Students</h3>
                                <button onClick={() => setAddPresetModal(false)} style={{ background: "none", border: "none", fontSize: "24px", cursor: "pointer", color: "#666" }}>✕</button>
                            </div>
                            <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "#999" }}>This preset will be added to {selectedStudents.size} selected student{selectedStudents.size !== 1 ? "s" : ""}</p>
                            
                            <div style={{ background: "#f9f9f9", borderRadius: "8px", padding: "12px", marginBottom: "20px", maxHeight: "300px", overflowY: "auto" }}>
                                {presets.map((preset) => (
                                    <div key={preset.id} onClick={() => setSelectedPreset(preset)} style={{ padding: "10px", background: selectedPreset?.id === preset.id ? "#1976d2" : "white", borderRadius: "6px", marginBottom: "8px", cursor: "pointer", border: selectedPreset?.id === preset.id ? "1px solid #1565c0" : "1px solid #e0e0e0", transition: "all 0.2s" }} onMouseEnter={(e) => { if (selectedPreset?.id !== preset.id) e.currentTarget.style.background = "#f0f8ff"; }} onMouseLeave={(e) => { if (selectedPreset?.id !== preset.id) e.currentTarget.style.background = "white"; }}>
                                        <p style={{ margin: "0", fontSize: "14px", fontWeight: "500", color: selectedPreset?.id === preset.id ? "white" : "#333" }}>{preset.name}</p>
                                    </div>
                                ))}
                            </div>

                            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                                <button onClick={() => { setAddPresetModal(false); setSelectedPreset(null); }} style={{ padding: "10px 20px", background: "#f0f0f0", color: "#333", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "14px", fontWeight: "500" }}>Cancel</button>
                                <button onClick={() => { if (selectedPreset) { const preset = presets.find(p => p.id === selectedPreset.id); if (preset) { const updatedStudents = students[selectedSection]?.map((student: any) => { if (selectedStudents.has(student.id)) { const hasTask = student.tasks.some((t: any) => t.desc === preset.name); if (!hasTask) { const newTaskId = student.tasks.length > 0 ? Math.max(...student.tasks.map((t: any) => t.id)) + 1 : 1; return { ...student, tasks: [...student.tasks, { id: newTaskId, desc: preset.name, done: false }] }; } } return student; }) || []; setStudents(prev => ({ ...prev, [selectedSection]: updatedStudents })); setAddPresetModal(false); setSelectedPreset(null); setSelectedStudents(new Set()); } } }} disabled={!selectedPreset} style={{ padding: "10px 20px", background: selectedPreset ? "#1976d2" : "#ccc", color: "white", border: "none", borderRadius: "6px", cursor: selectedPreset ? "pointer" : "not-allowed", fontSize: "14px", fontWeight: "500" }}>Add to {selectedStudents.size} student{selectedStudents.size !== 1 ? "s" : ""}</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Manage Presets Modal */}
                {managePresetsModal && (
                    <div style={{ position: "fixed", inset: "0", background: "rgba(0, 0, 0, 0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
                        <div style={{ background: "white", borderRadius: "12px", padding: "28px", minWidth: "500px", maxHeight: "80vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                                <h3 style={{ margin: "0", fontSize: "18px", fontWeight: "600" }}>Task Preset Manager</h3>
                                <button onClick={() => setManagePresetsModal(false)} style={{ background: "none", border: "none", fontSize: "24px", cursor: "pointer", color: "#666" }}>✕</button>
                            </div>
                            <p style={{ margin: "0 0 20px 0", fontSize: "13px", color: "#999" }}>Create and manage task presets for quick assignment</p>

                            <div style={{ marginBottom: "28px" }}>
                                <h4 style={{ margin: "0 0 12px 0", fontSize: "14px", fontWeight: "600", color: "#333" }}>Existing Presets</h4>
                                <div style={{ background: "#f9f9f9", borderRadius: "8px", padding: "12px", maxHeight: "200px", overflowY: "auto" }}>
                                    {presets.map((preset) => (
                                        <div key={preset.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px", background: "white", borderRadius: "6px", marginBottom: "8px", border: "1px solid #e0e0e0" }}>
                                            <p style={{ margin: "0", fontSize: "14px", color: "#333" }}>{preset.name}</p>
                                            <div style={{ display: "flex", gap: "6px" }}>
                                                <button style={{ padding: "4px 8px", background: "#f0f0f0", color: "#333", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>✎</button>
                                                <button onClick={() => setPresets(presets.filter(p => p.id !== preset.id))} style={{ padding: "4px 8px", background: "#ffebee", color: "#f44336", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>🗑</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h4 style={{ margin: "0 0 12px 0", fontSize: "14px", fontWeight: "600", color: "#333" }}>Create New Preset</h4>
                                <div style={{ marginBottom: "16px" }}>
                                    <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", fontWeight: "500", color: "#666" }}>Preset Name</label>
                                    <input 
                                        type="text"
                                        placeholder="e.g. Missing Exam"
                                        value={newPresetName}
                                        onChange={(e) => setNewPresetName(e.target.value)}
                                        style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: "6px", fontSize: "14px", boxSizing: "border-box" }} 
                                    />
                                </div>
                                <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                                    <button onClick={() => setManagePresetsModal(false)} style={{ padding: "10px 16px", background: "#f0f0f0", color: "#333", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "14px", fontWeight: "500" }}>Cancel</button>
                                    <button onClick={() => {
                                        if (newPresetName.trim()) {
                                            setPresets([...presets, { id: Math.max(...presets.map(p => p.id)) + 1, name: newPresetName }]);
                                            setNewPresetName("");
                                        }
                                    }} style={{ padding: "10px 16px", background: "#1976d2", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "14px", fontWeight: "500" }}>Create Preset</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
