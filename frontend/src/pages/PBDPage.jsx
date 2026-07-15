import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { pageIdToPath } from "../lib/nav.js";
import { useAppStore } from "../state/useAppStore.js";
import { apiRequest, apiPost, apiPut } from "../services/api.js";
import { downloadTextFile } from "../lib/lesson.js";
import { initialStudents, tpDistribution } from "../lib/fixtures.js";
import { Card, PageHeader, Tabs, Metric, BarSet, Badge } from "../components/ui.jsx";
import {
  RefreshCw,
  Download,
  Plus,
  CheckCircle2,
  ArrowRight,
  Save,
  BookOpen,
  Paperclip,
} from "lucide-react";

export default function PBDPage() {
  const navigate = useNavigate();
  const classes = useAppStore((s) => s.classes);
  const liveMode = useAppStore((s) => {
    const cu = s.currentUser;
    const isDemo = cu?.email === "demo@test.com" || cu?.role === "demo" || String(cu?._id) === "000000000000000000000001";
    return typeof window !== "undefined" && (window.location.pathname.startsWith("/testing") || window.location.search.includes("live=1") || (cu && !isDemo));
  });

  const [tab, setTab] = useState("templates");
  const [templates, setTemplates] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?._id || "");
  const [activeTemplateId, setActiveTemplateId] = useState("");
  const [classStudents, setClassStudents] = useState(liveMode ? [] : initialStudents.map((student) => ({
    _id: student.id,
    studentName: student.name,
    proficiency: `TP${student.tp}`,
    notes: student.comment,
  })));
  const [records, setRecords] = useState([]);
  const [notice, setNotice] = useState("");
  const [templateForm, setTemplateForm] = useState({
    title: "Reading observation checklist",
    year: "Year 5",
    subject: "English",
    assessmentType: "PBD observation",
    evidenceType: "Teacher observation and pupil response",
    scaleType: "tp",
    criteria: "Can identify main idea; Can support answer with detail; Can respond using simple English.",
  });
  const selectedClass = classes.find((item) => item._id === selectedClassId);
  const activeTemplate = templates.find((item) => item._id === activeTemplateId) || templates[0];

  const refreshTemplates = async () => {
    try {
      const query = selectedClassId ? `?classId=${selectedClassId}` : "";
      const data = await apiRequest(`/assessment${query}`);
      setTemplates(data);
      if (!activeTemplateId && data[0]?._id) setActiveTemplateId(data[0]._id);
    } catch {
      setTemplates([]);
    }
  };

  useEffect(() => {
    if (!selectedClassId && classes[0]?._id) setSelectedClassId(classes[0]._id);
  }, [classes, selectedClassId]);

  useEffect(() => {
    refreshTemplates();
  }, [selectedClassId]);

  useEffect(() => {
    if (!selectedClassId) {
      setClassStudents(liveMode ? [] : classStudents);
      return;
    }
    apiRequest(`/students?classId=${selectedClassId}`)
      .then(setClassStudents)
      .catch(() => setClassStudents([]));
  }, [selectedClassId]);

  useEffect(() => {
    const saved = activeTemplate?.records || [];
    const rows = classStudents.map((student) => {
      const existing = saved.find((record) => String(record.studentId || "") === String(student._id || ""));
      return existing || {
        studentId: student._id,
        studentName: student.studentName || student.name,
        value: "",
        tp: "TP3",
        remarks: "",
      };
    });
    setRecords(rows);
  }, [classStudents, activeTemplateId, templates.length]);

  const updateTemplateForm = (key, value) => setTemplateForm((current) => ({ ...current, [key]: value }));
  const createTemplate = async () => {
    if (!templateForm.title.trim()) return;
    try {
      const payload = {
        ...templateForm,
        classId: selectedClassId || undefined,
        questions: templateForm.criteria.split(";").map((criterion) => criterion.trim()).filter(Boolean),
      };
      const saved = await apiPost("/assessment", payload);
      setTemplates((items) => [saved, ...items]);
      setActiveTemplateId(saved._id);
      setTab("assess");
      setNotice("PBD template created. You can now assess pupils with it.");
    } catch (err) {
      setNotice(err.message || "Could not create PBD template.");
    }
  };
  const updateRecord = (index, key, value) => {
    setRecords((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row));
  };
  const saveAssessmentRecords = async () => {
    if (!activeTemplate?._id) {
      setNotice("Create or select a PBD template first.");
      return;
    }
    try {
      const saved = await apiPut(`/assessment/${activeTemplate._id}`, { records });
      setTemplates((items) => items.map((item) => item._id === saved._id ? saved : item));
      setNotice("PBD records saved to the selected template.");
    } catch (err) {
      setNotice(err.message || "Could not save PBD records.");
    }
  };
  const exportCsv = () => {
    const rows = [["Template", activeTemplate?.title || ""], ["Student", "Evidence", "TP", "Remarks"], ...records.map((record) => [record.studentName, record.value, record.tp, record.remarks])];
    downloadTextFile("pbd-records.csv", rows.map((row) => row.map((cell) => `"${String(cell || "").replace(/"/g, '""')}"`).join(",")).join("\n"));
  };

  return (
    <div className="page-stack">
      <PageHeader eyebrow="PBD & Assessment" title="Template-first classroom assessment." subtitle="Create the assessment form first, then assess pupils from the selected class using that template." />
      <section className="page-toolbar">
        <button className="secondary-btn" onClick={refreshTemplates}><RefreshCw /> Refresh</button>
        <button className="secondary-btn" onClick={exportCsv}><Download /> Export</button>
        <button className="primary-btn" onClick={() => setTab("templates")}><Plus /> New template</button>
      </section>
      {notice && <div className="success-note"><CheckCircle2 /> {notice}</div>}
      <Tabs tabs={["templates", "assess", "analytics"]} active={tab} setActive={setTab} />

      {tab === "templates" && (
        <section className="dashboard-grid">
          <Card title="Create PBD Template" subtitle="Design how pupils will be assessed before recording evidence." className="span-2">
            <div className="form-row">
              <label className="field"><span>Class</span><select value={selectedClassId} onChange={(event) => setSelectedClassId(event.target.value)}><option value="">No class selected</option>{classes.map((schoolClass) => <option key={schoolClass._id} value={schoolClass._id}>{schoolClass.name} · {schoolClass.year}</option>)}</select></label>
              <label className="field"><span>Template title</span><input value={templateForm.title} onChange={(event) => updateTemplateForm("title", event.target.value)} /></label>
            </div>
            <div className="form-row">
              <label className="field"><span>Assessment type</span><select value={templateForm.assessmentType} onChange={(event) => updateTemplateForm("assessmentType", event.target.value)}><option>PBD observation</option><option>Oral presentation rubric</option><option>Reading checklist</option><option>Writing sample review</option><option>Exit ticket</option></select></label>
              <label className="field"><span>Scale</span><select value={templateForm.scaleType} onChange={(event) => updateTemplateForm("scaleType", event.target.value)}><option value="tp">TP selector</option><option value="score">Score selector</option><option value="checkbox">Checklist</option><option value="remarks">Remarks only</option></select></label>
            </div>
            <label className="field"><span>Evidence type</span><input value={templateForm.evidenceType} onChange={(event) => updateTemplateForm("evidenceType", event.target.value)} /></label>
            <label className="field"><span>Criteria, separated with semicolons</span><textarea rows="4" value={templateForm.criteria} onChange={(event) => updateTemplateForm("criteria", event.target.value)} /></label>
            <button className="primary-btn full" onClick={createTemplate}><Save /> Save template</button>
          </Card>
          <Card title="Saved Templates" subtitle={`${templates.length} template${templates.length === 1 ? "" : "s"}`}>
            <div className="class-list">
              {templates.map((template) => (
                <button key={template._id} className={`class-row indigo ${template._id === activeTemplateId ? "active-row" : ""}`} onClick={() => { setActiveTemplateId(template._id); setTab("assess"); }}>
                  <span>{template.scaleType || "tp"}<small>{template.assessmentType}</small></span>
                  <div><strong>{template.title}</strong><small>{template.evidenceType || "Evidence collection"}</small></div>
                  <ArrowRight />
                </button>
              ))}
              {!templates.length && <p className="body-copy">No live templates yet. Create one to begin PBD recording.</p>}
            </div>
          </Card>
        </section>
      )}

      {tab === "assess" && (
        <Card title="Assess Students" subtitle={activeTemplate ? `${activeTemplate.title} · ${selectedClass?.name || "No class"}` : "Select a template first"}>
          <div className="form-row">
            <label className="field"><span>Class</span><select value={selectedClassId} onChange={(event) => setSelectedClassId(event.target.value)}><option value="">Choose class</option>{classes.map((schoolClass) => <option key={schoolClass._id} value={schoolClass._id}>{schoolClass.name} · {schoolClass.year}</option>)}</select></label>
            <label className="field"><span>PBD template</span><select value={activeTemplateId} onChange={(event) => setActiveTemplateId(event.target.value)}><option value="">Choose template</option>{templates.map((template) => <option key={template._id} value={template._id}>{template.title}</option>)}</select></label>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>#</th><th>Student</th><th>Evidence / value</th><th>TP</th><th>Remarks</th></tr></thead>
              <tbody>
                {records.map((record, index) => (
                  <tr key={record.studentId || index}>
                    <td>{index + 1}</td>
                    <td>{record.studentName}</td>
                    <td><input className="comment-input" value={record.value || ""} onChange={(event) => updateRecord(index, "value", event.target.value)} placeholder={activeTemplate?.scaleType === "checkbox" ? "Done / not yet" : "Evidence or score"} /></td>
                    <td><select className="score-input" value={record.tp || "TP3"} onChange={(event) => updateRecord(index, "tp", event.target.value)}><option>TP1</option><option>TP2</option><option>TP3</option><option>TP4</option><option>TP5</option><option>TP6</option></select></td>
                    <td><input className="comment-input" value={record.remarks || ""} onChange={(event) => updateRecord(index, "remarks", event.target.value)} /></td>
                  </tr>
                ))}
                {!records.length && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center", padding: 28 }}>
                      <p className="body-copy" style={{ marginBottom: 12 }}>Nothing to show, you can start select a class and template to record PBD.</p>
                      <button type="button" className="secondary-btn" onClick={() => navigate(pageIdToPath("classes"))} style={{ margin: "0 auto" }}><Plus /> + Create Class</button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <button className="primary-btn" onClick={saveAssessmentRecords}><Save /> Save PBD assessment</button>
        </Card>
      )}

      {tab === "analytics" && <PBDOverview liveMode={liveMode} classes={classes} />}
    </div>
  );
}

function PBDOverview({ liveMode, classes = [] }) {
  const navigate = useNavigate();
  if (liveMode && !classes.length) {
    return (
      <div className="page-stack">
        <section className="stat-grid three">
          <Metric title="Avg English TP" value="0" note="Nothing to show, start creating your class." tone="indigo" actionLabel="+ Create Class" onAction={() => navigate(pageIdToPath("classes"))} />
          <Metric title="Evidence Completion" value="0%" note="Nothing to show, start recording PBD." tone="emerald" actionLabel="+ Record PBD" onAction={() => navigate(pageIdToPath("pbd"))} />
          <Metric title="Vocabulary Risk" value="0" note="Nothing to show, start evaluating pupils." tone="rose" actionLabel="+ Create Class" onAction={() => navigate(pageIdToPath("classes"))} />
        </section>
        <section className="dashboard-grid">
          <Card className="span-2" title="English TP Distribution">
            <div className="empty-state-box" style={{ padding: "16px", textAlign: "center" }}>
              <p className="body-copy" style={{ marginBottom: 12 }}>Nothing to show, you can start create your class to view TP distribution.</p>
              <button type="button" className="primary-btn" onClick={() => navigate(pageIdToPath("classes"))} style={{ margin: "0 auto" }}><Plus /> + Create Class</button>
            </div>
          </Card>
          <Card title="AI Insight">
            <div className="empty-state-box" style={{ padding: "16px", textAlign: "center" }}>
              <p className="body-copy" style={{ marginBottom: 12 }}>Nothing to show, you can start record PBD assessments to receive AI pupil insights.</p>
              <button type="button" className="secondary-btn" onClick={() => navigate(pageIdToPath("pbd"))} style={{ margin: "0 auto" }}><BookOpen /> + Record PBD</button>
            </div>
          </Card>
        </section>
      </div>
    );
  }
  return (
    <div className="page-stack">
      <section className="stat-grid three">
        <Metric title="Avg English TP" value="3.8" note="+0.4 from last assessment" tone="indigo" />
        <Metric title="Evidence Completion" value="87%" note="28 / 32 pupils assessed" tone="emerald" />
        <Metric title="Vocabulary Risk" value="5" note="TP1-TP2, needs intervention" tone="rose" />
      </section>
      <section className="dashboard-grid">
        <Card className="span-2" title="English TP Distribution"><BarSet data={tpDistribution} /></Card>
        <Card title="AI Insight"><p className="body-copy">5 Bestari improved in reading main ideas, but five pupils still need vocabulary pre-teaching and sentence frames before independent comprehension tasks.</p></Card>
      </section>
    </div>
  );
}

function KeyInTable({ students, updateScore }) {
  const [saved, setSaved] = useState(false);
  return (
    <Card title="Key-in English Marks" subtitle="Autosave active · TP updates automatically" action="Save" onAction={() => setSaved(true)}>
      {saved && <div className="success-note"><CheckCircle2 /> English PBD marks saved locally.</div>}
      <div className="table-wrap">
        <table>
          <thead><tr><th>#</th><th>Pupil Name</th><th>Attendance</th><th>Score</th><th>TP</th><th>Comment</th><th>Evidence</th></tr></thead>
          <tbody>
            {students.map((student, index) => (
              <tr key={student.id}>
                <td>{index + 1}</td><td>{student.name}</td><td><Badge tone={student.attendance === "Present" ? "emerald" : "amber"}>{student.attendance}</Badge></td>
                <td><input className="score-input" type="number" value={student.score} onChange={(event) => updateScore(student.id, Number(event.target.value))} /></td>
                <td><Badge tone={student.tp >= 5 ? "emerald" : student.tp >= 3 ? "indigo" : "rose"}>TP{student.tp}</Badge></td>
                <td><input className="comment-input" defaultValue={student.comment} /></td><td><button className="icon-btn"><Paperclip /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
