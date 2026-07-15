import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { pageIdToPath } from "../lib/nav.js";
import { useAppStore } from "../state/useAppStore.js";
import { apiRequest, apiPost, apiPut, apiDelete } from "../services/api.js";
import { Card, PageHeader, Badge, MaterialTile } from "../components/ui.jsx";
import {
  RefreshCw,
  Plus,
  Sparkles,
  Save,
  X,
  CheckCircle2,
  Users,
  BookOpen,
} from "lucide-react";

const emptyClassForm = {
  name: "",
  year: "Year 5",
  subject: "English",
  studentCount: 0,
  studentProficiency: "Mixed ability",
  classroomEnvironment: "Standard classroom with limited ICT",
  teachingNotes: "",
  tags: "",
  status: "active",
};

export default function ClassesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const classes = useAppStore((s) => s.classes);
  const refreshClasses = useAppStore((s) => s.refreshClasses);
  const setSelectedClassId = useAppStore((s) => s.setSelectedClassId);
  const lessons = useAppStore((s) => s.lessons);
  const refreshLessons = useAppStore((s) => s.refreshLessons);
  const liveMode = useAppStore((s) => {
    const cu = s.currentUser;
    const isDemo = cu?.email === "demo@test.com" || cu?.role === "demo" || String(cu?._id) === "000000000000000000000001";
    return typeof window !== "undefined" && (window.location.pathname.startsWith("/testing") || window.location.search.includes("live=1") || (cu && !isDemo));
  });

  // activePage comes from the URL now
  const activePage = location.pathname.startsWith("/students") ? "students" : "classes";

  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState(emptyClassForm);
  const [editingId, setEditingId] = useState("");
  const [students, setStudents] = useState([]);
  const [studentDrafts, setStudentDrafts] = useState([]);
  const [showClassForm, setShowClassForm] = useState(!classes.length);
  const [openClassPanel, setOpenClassPanel] = useState("");
  const [notice, setNotice] = useState("");

  const selectedClass = classes.find((item) => item._id === selectedId);
  const classLessons = lessons.filter((lesson) => String(lesson.classId?._id || lesson.classId || "") === String(selectedClass?._id || ""));

  useEffect(() => {
    if (activePage === "students" && classes.length > 0) {
      if (!selectedId) setSelectedId(classes[0]._id);
      setOpenClassPanel("students");
    }
  }, [activePage, classes, selectedId]);

  useEffect(() => {
    if (selectedId && !classes.some((schoolClass) => schoolClass._id === selectedId)) setSelectedId("");
  }, [classes, selectedId]);

  useEffect(() => {
    if (!selectedClass?._id) {
      setStudents([]);
      return;
    }
    apiRequest(`/students?classId=${selectedClass._id}`)
      .then((data) => {
        setStudents(data);
        const count = Math.max(Number(selectedClass.studentCount || 0), data.length, 1);
        const rows = Array.from({ length: count }, (_, index) => data[index] || {
          studentName: "",
          proficiency: selectedClass.studentProficiency || "Mixed ability",
          notes: "",
          status: "active",
        });
        setStudentDrafts(rows);
      })
      .catch(() => {
        setStudents([]);
        setStudentDrafts([]);
      });
  }, [selectedClass?._id, openClassPanel]);


  const updateClassForm = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const resetClassForm = () => {
    setEditingId("");
    setForm(emptyClassForm);
    setShowClassForm(false);
  };
  const startEdit = (schoolClass) => {
    setEditingId(schoolClass._id);
    setShowClassForm(true);
    setForm({
      name: schoolClass.name || "",
      year: schoolClass.year || "Year 5",
      subject: schoolClass.subject || "English",
      studentCount: schoolClass.studentCount || 0,
      studentProficiency: schoolClass.studentProficiency || "Mixed ability",
      classroomEnvironment: schoolClass.classroomEnvironment || "Standard classroom with limited ICT",
      teachingNotes: schoolClass.teachingNotes || "",
      tags: (schoolClass.tags || []).join(", "),
      status: schoolClass.status || "active",
    });
  };
  const saveClass = async () => {
    try {
      const payload = { ...form, studentCount: Number(form.studentCount || 0) };
      const saved = editingId ? await apiPut(`/classes/${editingId}`, payload) : await apiPost("/classes", payload);
      setNotice(editingId ? "Class updated." : "Class created.");
      setSelectedId(saved._id);
      setSelectedClassId?.(saved._id);
      setShowClassForm(false);
      setStudentDrafts(Array.from({ length: Math.max(Number(saved.studentCount || 0), 1) }, () => ({
        studentName: "",
        proficiency: saved.studentProficiency || "Mixed ability",
        notes: "",
        status: "active",
      })));
      resetClassForm();
      refreshClasses?.();
      refreshLessons?.();
    } catch (err) {
      setNotice(err.message || "Could not save class.");
    }
  };
  const deleteClass = async (id) => {
    if (!window.confirm("Delete this class? Existing lesson plans will not be deleted.")) return;
    await apiDelete(`/classes/${id}`);
    setNotice("Class deleted. Linked lessons were kept.");
    if (selectedId === id) setSelectedId("");
    refreshClasses?.();
  };
  const updateStudentDraft = (index, key, value) => {
    setStudentDrafts((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row));
  };
  const addRosterRow = () => {
    setStudentDrafts((rows) => [...rows, { studentName: "", proficiency: selectedClass?.studentProficiency || "Mixed ability", notes: "", status: "active" }]);
  };
  const saveRoster = async () => {
    if (!selectedClass?._id) return;
    const savedRows = [];
    for (const draft of studentDrafts) {
      const studentName = draft.studentName?.trim();
      if (!studentName && draft._id) {
        await apiDelete(`/students/${draft._id}`);
        continue;
      }
      if (!studentName) continue;
      const payload = {
        classId: selectedClass._id,
        studentName,
        proficiency: draft.proficiency || selectedClass.studentProficiency || "Mixed ability",
        notes: draft.notes || "",
        status: draft.status || "active",
      };
      const saved = draft._id ? await apiPut(`/students/${draft._id}`, payload) : await apiPost("/students", payload);
      savedRows.push(saved);
    }
    const latest = await apiRequest(`/students?classId=${selectedClass._id}`);
    setStudents(latest);
    setStudentDrafts(Array.from({ length: Math.max(Number(selectedClass.studentCount || 0), latest.length, 1) }, (_, index) => latest[index] || {
      studentName: "",
      proficiency: selectedClass.studentProficiency || "Mixed ability",
      notes: "",
      status: "active",
    }));
    setNotice(`${savedRows.length} student record${savedRows.length === 1 ? "" : "s"} saved.`);
    refreshClasses?.();
  };
  const planForClass = () => {
    if (selectedClass?._id) setSelectedClassId?.(selectedClass._id);
    navigate(pageIdToPath("lesson-planner"));
  };

  return (
    <div className="page-stack">
      <PageHeader eyebrow="Class Management" title="Class Database." subtitle="Create English classes, manage pupils, and generate class-owned KSSR lesson plans." />

      <section className="page-toolbar">
        <button className="secondary-btn" onClick={refreshClasses}><RefreshCw /> Refresh</button>
        <button className="secondary-btn" onClick={() => { setForm(emptyClassForm); setEditingId(""); setShowClassForm(true); }}><Plus /> Add class</button>
        <button className="primary-btn" onClick={planForClass} disabled={!selectedClass}><Sparkles /> Plan for class</button>
      </section>

      <section className="dashboard-grid">
        {showClassForm && <Card title={editingId ? "Edit Class" : "Add Class"} subtitle="Enter the class first. The student database form appears after the class is saved.">
          <div className="form-row">
            <label className="field"><span>Class name</span><input value={form.name} onChange={(event) => updateClassForm("name", event.target.value)} placeholder="5 Bestari" /></label>
            <label className="field"><span>Year</span><select value={form.year} onChange={(event) => updateClassForm("year", event.target.value)}><option>Year 1</option><option>Year 2</option><option>Year 3</option><option>Year 4</option><option>Year 5</option><option>Year 6</option></select></label>
          </div>
          <div className="form-row">
            <label className="field"><span>Subject</span><input value={form.subject} onChange={(event) => updateClassForm("subject", event.target.value)} /></label>
            <label className="field"><span>Pupil count</span><input type="number" min="1" value={form.studentCount} onChange={(event) => updateClassForm("studentCount", event.target.value)} /></label>
          </div>
          <label className="field"><span>Student proficiency</span><input value={form.studentProficiency} onChange={(event) => updateClassForm("studentProficiency", event.target.value)} /></label>
          <label className="field"><span>Classroom environment</span><textarea rows="2" value={form.classroomEnvironment} onChange={(event) => updateClassForm("classroomEnvironment", event.target.value)} /></label>
          <label className="field"><span>Teaching notes</span><textarea rows="2" value={form.teachingNotes} onChange={(event) => updateClassForm("teachingNotes", event.target.value)} /></label>
          <label className="field"><span>Tags</span><input value={form.tags} onChange={(event) => updateClassForm("tags", event.target.value)} placeholder="support, vocabulary, no projector" /></label>
          <div className="form-row">
            <button className="primary-btn full" onClick={saveClass}><Save /> {editingId ? "Update class" : "Create class"}</button>
            <button className="secondary-btn full" onClick={resetClassForm}><X /> Cancel</button>
          </div>
          {notice && <div className="success-note"><CheckCircle2 /> {notice}</div>}
        </Card>}

        <Card title="Class List" subtitle={`${classes.length} saved class${classes.length === 1 ? "" : "es"}`} className="span-3">
          <div className="material-grid wide">
            {classes.map((schoolClass) => (
              <button key={schoolClass._id} className={`student-card ${selectedId === schoolClass._id ? "selected-card" : ""}`} onClick={() => { setSelectedId(schoolClass._id); setOpenClassPanel(""); }}>
                <div>{schoolClass.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</div>
                <strong>{schoolClass.name}</strong>
                <span>{schoolClass.year} · {schoolClass.subject} · {schoolClass.studentCount || 0} pupils</span>
                <small>{schoolClass.studentProficiency}</small>
                <em>Open class database</em>
              </button>
            ))}
            {!classes.length && (
              <div className="empty-state-box wide" style={{ padding: "24px 16px", textAlign: "center", border: "1px dashed var(--border)", borderRadius: 12, width: "100%" }}>
                <p className="body-copy" style={{ marginBottom: 14 }}>Nothing to show, you can start create your class.</p>
                <button type="button" className="primary-btn" onClick={() => setShowClassForm(true)} style={{ margin: "0 auto" }}><Plus /> + Create Class</button>
              </div>
            )}
          </div>
        </Card>
        {!showClassForm && notice && <div className="success-note span-2"><CheckCircle2 /> {notice}</div>}
      </section>

      {selectedClass && (
        <div className="fullscreen-modal-backdrop" role="dialog" aria-modal="true">
          <section className="fullscreen-modal">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Class Database</p>
                <h2>{selectedClass.name}</h2>
                <p className="body-copy">{selectedClass.year} · {selectedClass.subject} · {selectedClass.studentProficiency}</p>
              </div>
              <button className="icon-btn" onClick={() => { setSelectedId(""); setOpenClassPanel(""); }}><X /></button>
            </div>
            <Card title={selectedClass.name} subtitle={`${selectedClass.year} · ${selectedClass.subject} · ${selectedClass.studentProficiency}`}>
            <p className="body-copy">{selectedClass.classroomEnvironment}</p>
            {selectedClass.teachingNotes && <p className="body-copy">{selectedClass.teachingNotes}</p>}
            <div className="form-row">
              <button className="secondary-btn" onClick={() => startEdit(selectedClass)}><Save /> Edit class</button>
              <button className="secondary-btn" onClick={() => deleteClass(selectedClass._id)}><X /> Delete class</button>
              <button className="primary-btn" onClick={planForClass}><Sparkles /> Generate RPH</button>
            </div>
            <div className="class-panel-actions">
              <button className={`student-card compact ${openClassPanel === "students" ? "selected-card" : ""}`} onClick={() => setOpenClassPanel("students")}>
                <div><Users /></div>
                <strong>Student database</strong>
                <span>{students.length} saved pupils · {selectedClass.studentCount || 0} expected</span>
                <em>Open form</em>
              </button>
              <button className={`student-card compact ${openClassPanel === "lessons" ? "selected-card" : ""}`} onClick={() => setOpenClassPanel("lessons")}>
                <div><BookOpen /></div>
                <strong>Lesson library</strong>
                <span>{classLessons.length} class-owned RPH</span>
                <em>Open library</em>
              </button>
            </div>
          </Card>

          </section>
        </div>
      )}

      {selectedClass && openClassPanel === "students" && (
        <div className="modal-backdrop gaussian-blur-modal" onClick={() => setOpenClassPanel("")}>
          <div className="modal-card wide-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">{selectedClass.name} — {selectedClass.year}</p>
                <h2>Student Database Form</h2>
                <small className="muted">{`Fill or edit the pupil rows for ${selectedClass.name} (${students.length} saved · ${selectedClass.studentCount || 0} target). Blank rows are automatically cleaned up when saved.`}</small>
              </div>
              <button className="secondary-btn" onClick={() => setOpenClassPanel("")} aria-label="Close modal"><X /> Close form</button>
            </div>
            <div className="form-row" style={{ marginTop: "12px", marginBottom: "16px" }}>
              <button className="secondary-btn" onClick={addRosterRow} style={{ border: "none", background: "rgba(255,255,255,0.05)", padding: "8px 16px" }}><Plus size={16} /> Add student</button>
            </div>
            <div className="table-wrap" style={{ maxHeight: "55vh", overflowY: "auto" }}>
              <table>
                <thead><tr><th>#</th><th>Student name</th><th>Proficiency</th><th>Notes</th><th>Status</th></tr></thead>
                <tbody>
                  {studentDrafts.map((student, index) => (
                    <tr key={student._id || `draft-${index}`}>
                      <td>{index + 1}</td>
                      <td><input className="comment-input" value={student.studentName || ""} onChange={(event) => updateStudentDraft(index, "studentName", event.target.value)} placeholder="Student name" /></td>
                      <td><input className="comment-input" value={student.proficiency || ""} onChange={(event) => updateStudentDraft(index, "proficiency", event.target.value)} placeholder="Mixed ability" /></td>
                      <td><input className="comment-input" value={student.notes || ""} onChange={(event) => updateStudentDraft(index, "notes", event.target.value)} placeholder="Notes, support needs, language profile" /></td>
                      <td><Badge tone={student._id ? "emerald" : "amber"}>{student._id ? "saved" : "new"}</Badge></td>
                    </tr>
                  ))}
                  {!studentDrafts.length && <tr><td colSpan="5">Save a class with a pupil count to create empty student rows.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="form-row" style={{ marginTop: "20px", justifyContent: "flex-end" }}>
              <button className="primary-btn" onClick={saveRoster}><Save /> Save student database</button>
            </div>
          </div>
        </div>
      )}

      {selectedClass && openClassPanel === "lessons" && (
        <div className="modal-backdrop gaussian-blur-modal" onClick={() => setOpenClassPanel("")}>
          <div className="modal-card wide-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">{selectedClass.name} — {selectedClass.year}</p>
                <h2>Class Lesson Library</h2>
                <small className="muted">{`${classLessons.length} lesson plans saved for ${selectedClass.name}`}</small>
              </div>
              <button className="icon-btn" onClick={() => setOpenClassPanel("")} aria-label="Close library"><X /></button>
            </div>
            <div className="form-row" style={{ marginTop: "12px", marginBottom: "16px" }}>
              <button className="secondary-btn" onClick={() => setOpenClassPanel("")}><X /> Close library</button>
              <button className="primary-btn" onClick={() => { setOpenClassPanel(""); planForClass(); }}><Sparkles /> Generate RPH for this class</button>
            </div>
            <div className="material-grid">
              {classLessons.slice(0, 8).map((lesson) => <MaterialTile key={lesson._id} item={{ name: lesson.title, subject: lesson.className || selectedClass.name, size: lesson.year, updated: String(lesson.updatedAt || lesson.createdAt || "").slice(0, 10) }} />)}
              {!classLessons.length && <p className="body-copy">No lessons linked yet. Generate one from this class to save it here.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
