import React, { useState, useEffect, useRef } from "react";
import { useAppStore } from "../state/useAppStore.js";
import { AUTH_TOKEN_KEY, apiUpload, apiPost, apiDelete } from "../services/api.js";
import { PageHeader, MaterialTile } from "../components/ui.jsx";
import { staticMaterials } from "../lib/fixtures.js";
import { Upload, FileText, CheckCircle2, X, Plus } from "lucide-react";

export default function MaterialsPage() {
  const materials = useAppStore((s) => s.materials);
  const refreshMaterials = useAppStore((s) => s.refreshMaterials);
  const currentUser = useAppStore((s) => s.currentUser);
  const isDemoUser = currentUser?.email === "demo@test.com" || currentUser?.role === "demo" || String(currentUser?._id) === "000000000000000000000001";
  const liveMode = typeof window !== "undefined" && (window.location.pathname.startsWith("/testing") || window.location.search.includes("live=1") || (currentUser && !isDemoUser));

  const [items, setItems] = useState(materials.length ? materials : liveMode ? [] : staticMaterials);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkForm, setLinkForm] = useState({ title: "", url: "", type: "DRIVE", folder: "Reading Support", year: "Year 4" });
  const uploadRef = useRef(null);

  useEffect(() => {
    if (materials.length > 0) {
      setItems(materials);
    } else if (!liveMode && items.length === 0) {
      setItems(staticMaterials);
    }
  }, [materials, liveMode]);

  const uploadMaterial = async (file) => {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      if (liveMode || localStorage.getItem(AUTH_TOKEN_KEY)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("subject", "English");
        formData.append("folder", "General");
        await apiUpload("/materials/upload", formData);
        await refreshMaterials?.();
        setNotice(`${file.name} successfully uploaded and linked to MongoDB.`);
      } else {
        const newItem = {
          _id: `local_${Date.now()}`,
          title: file.name,
          name: file.name,
          type: file.name.split(".").pop()?.toUpperCase() || "FILE",
          size: `${Math.max(1, Math.round(file.size / 1024))} KB`,
          subject: "English",
          updated: "Just now",
        };
        setItems((current) => [newItem, ...current]);
        setNotice(`${file.name} added (local testing).`);
      }
    } catch (err) {
      setError(err.message || "Failed to upload material.");
    } finally {
      setUploading(false);
      if (uploadRef.current) uploadRef.current.value = "";
    }
  };

  const handleAddLink = async (e) => {
    e?.preventDefault();
    if (!linkForm.title || !linkForm.url) {
      setError("Please enter both title and URL.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      if (liveMode || localStorage.getItem(AUTH_TOKEN_KEY)) {
        await apiPost("/materials/link", linkForm);
        await refreshMaterials?.();
        setNotice(`Attached link: ${linkForm.title}`);
      } else {
        setItems((current) => [{
          _id: `link_${Date.now()}`,
          title: linkForm.title,
          name: linkForm.title,
          type: linkForm.type,
          size: "External Link",
          subject: "English",
          url: linkForm.url,
          updated: "Just now",
        }, ...current]);
        setNotice(`Attached link: ${linkForm.title}`);
      }
      setShowLinkModal(false);
      setLinkForm({ title: "", url: "", type: "DRIVE", folder: "Reading Support", year: "Year 4" });
    } catch (err) {
      setError(err.message || "Failed to save link.");
    } finally {
      setUploading(false);
    }
  };

  const deleteMaterialItem = async (item) => {
    if (!confirm(`Are you sure you want to delete "${item.title || item.name}"?`)) return;
    try {
      if (item._id && !item._id.toString().startsWith("local_") && !item._id.toString().startsWith("link_") && (liveMode || localStorage.getItem(AUTH_TOKEN_KEY))) {
        await apiDelete(`/materials/${item._id}`);
        await refreshMaterials?.();
      } else {
        setItems((current) => current.filter((m) => (m._id || m.name) !== (item._id || item.name)));
      }
      setNotice(`Deleted "${item.title || item.name}".`);
    } catch (err) {
      setError(err.message || "Failed to delete material.");
    }
  };

  return (
    <div className="page-stack">
      <PageHeader eyebrow="Hybrid Materials Library" title="English teaching materials & Google Drive storage." subtitle="Store files up to 15MB directly or attach zero-cost Google Drive / Canva / Wordwall sharing links." />
      <section className="page-toolbar" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input ref={uploadRef} className="hidden-file" type="file" onChange={(event) => uploadMaterial(event.target.files?.[0])} />
        <button type="button" className="primary-btn" disabled={uploading} onClick={() => uploadRef.current?.click()}>
          <Upload /> {uploading ? "Uploading..." : "Upload File"}
        </button>
        <button type="button" className="secondary-btn" onClick={() => setShowLinkModal(true)}>
          <FileText /> + Attach Google Drive / External Link
        </button>
      </section>

      {notice && <div className="success-note"><CheckCircle2 /> {notice}</div>}
      {error && <div className="error-banner" style={{ background: "var(--rose-light)", color: "var(--rose)", padding: "12px 16px", borderRadius: 10, border: "1px solid var(--rose)" }}><strong>Error:</strong> {error}</div>}

      {showLinkModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <div><p className="eyebrow">Zero-Cost Cloud Storage</p><h2>Attach Google Drive or External Link</h2></div>
              <button type="button" className="icon-btn" onClick={() => setShowLinkModal(false)}><X /></button>
            </div>
            <form onSubmit={handleAddLink} className="form-stack" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <p className="body-copy" style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
                Paste any Google Drive sharing link, Canva slide URL, Wordwall quiz, or YouTube resource. This consumes 0 MB of server storage!
              </p>
              <label className="field">
                <span>Material Title</span>
                <input required placeholder="e.g. Unit 3 Reading Worksheet (Google Docs)" value={linkForm.title} onChange={(e) => setLinkForm({ ...linkForm, title: e.target.value })} />
              </label>
              <label className="field">
                <span>Sharing URL</span>
                <input required type="url" placeholder="https://drive.google.com/..." value={linkForm.url} onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })} />
              </label>
              <div className="form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label className="field">
                  <span>Resource Type</span>
                  <select value={linkForm.type} onChange={(e) => setLinkForm({ ...linkForm, type: e.target.value })}>
                    <option value="DRIVE">Google Drive / Docs</option>
                    <option value="CANVA">Canva Presentation</option>
                    <option value="WORDWALL">Wordwall Quiz</option>
                    <option value="YOUTUBE">YouTube Video</option>
                    <option value="LINK">External Website</option>
                  </select>
                </label>
                <label className="field">
                  <span>Folder / Category</span>
                  <select value={linkForm.folder} onChange={(e) => setLinkForm({ ...linkForm, folder: e.target.value })}>
                    <option value="Reading Support">Reading Support</option>
                    <option value="Writing Support">Writing Support</option>
                    <option value="Speaking Rubrics">Speaking Rubrics</option>
                    <option value="Interactive Activities">Interactive Activities</option>
                  </select>
                </label>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                <button type="button" className="secondary-btn" onClick={() => setShowLinkModal(false)}>Cancel</button>
                <button type="submit" className="primary-btn" disabled={uploading}><Plus /> Save Link to MongoDB</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <section className="material-grid wide">
        {items.map((item) => <MaterialTile key={item._id || item.name || item.title} item={item} onDelete={deleteMaterialItem} />)}
        {!items.length && (
          <div className="empty-state-box wide" style={{ padding: "32px 16px", textAlign: "center", border: "1px dashed var(--border)", borderRadius: 12, width: "100%" }}>
            <p className="body-copy" style={{ marginBottom: 14 }}>Nothing to show, you can start upload your materials or attach a Google Drive link.</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <button type="button" className="primary-btn" onClick={() => uploadRef.current?.click()}><Upload /> + Upload Material</button>
              <button type="button" className="secondary-btn" onClick={() => setShowLinkModal(true)}><FileText /> + Google Drive Link</button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
