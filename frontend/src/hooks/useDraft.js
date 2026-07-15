import { useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAppStore } from "../state/useAppStore.js";
import { useDebouncedCallback } from "./useDebounce.js";
import { emptyLessonForm } from "../lib/fixtures.js";

/**
 * Draft lifecycle hook for the Lesson Planner page.
 *
 * - On `/lesson-planner` (no :draftId): creates a new draft and replaces
 *   the URL to `/lesson-planner/:draftId` so the draft is immediately
 *   deep-linkable and Back-button friendly.
 * - On `/lesson-planner/:draftId`: loads the persisted draft from the
 *   Zustand store (which rehydrates from localStorage on boot). If the
 *   draft doesn't exist (e.g. old/corrupt ID), redirects to `/lesson-planner`
 *   to start fresh.
 * - Returns the draft + { saveDraftSync, saveDraftDebounced } so the page
 *   can push form changes to the store (debounced for form fields,
 *   immediate for generate() results).
 *
 * @returns {{ draft: object|null, draftId: string|null, form: object,
 *             saveForm: (form) => void, saveResult: (result) => void,
 *             saveDraft: (patch) => void }}
 */
export function useDraft() {
  const { draftId: paramDraftId } = useParams();
  const navigate = useNavigate();

  const drafts = useAppStore((s) => s.drafts);
  const createDraft = useAppStore((s) => s.createDraft);
  const loadDraft = useAppStore((s) => s.loadDraft);
  const saveDraft = useAppStore((s) => s.saveDraft);

  const creatingRef = useRef(false);

  // If no :draftId param, create a new draft immediately and replace the URL.
  useEffect(() => {
    if (creatingRef.current) return;
    if (!paramDraftId) {
      creatingRef.current = true;
      const id = createDraft();
      navigate(`/lesson-planner/${id}`, { replace: true });
    }
  }, [paramDraftId, createDraft, navigate]);

  // Load the draft when the param changes.
  useEffect(() => {
    if (!paramDraftId) return;
    const draft = loadDraft(paramDraftId);
    if (!draft && !creatingRef.current) {
      // Draft doesn't exist (deleted / corrupt / old link) → start fresh.
      navigate("/lesson-planner", { replace: true });
    }
  }, [paramDraftId, loadDraft, navigate]);

  const draft = paramDraftId ? drafts[paramDraftId] || null : null;

  // Debounced form save — fires 500ms after the last keystroke.
  const [saveFormDebounced, flushSave] = useDebouncedCallback(
    (id, form) => {
      saveDraft(id, { form });
    },
    500,
  );

  // Flush any pending debounced save on unmount (e.g. navigating away).
  useEffect(() => () => flushSave(), [flushSave]);

  const saveForm = useCallback(
    (form) => {
      if (!paramDraftId) return;
      saveFormDebounced(paramDraftId, form);
    },
    [paramDraftId, saveFormDebounced],
  );

  // Immediate save for generated results (low frequency, no need to debounce).
  const saveResult = useCallback(
    (result) => {
      if (!paramDraftId) return;
      flushSave(); // flush any pending form changes first
      saveDraft(paramDraftId, {
        result,
        title: result?.title || "Untitled RPH",
        serverId: result?.lessonPlanId || null,
      });
    },
    [paramDraftId, saveDraft, flushSave],
  );

  return {
    draft,
    draftId: paramDraftId,
    form: draft?.form || emptyLessonForm,
    saveForm,
    saveResult,
    saveDraft: (patch) => paramDraftId && saveDraft(paramDraftId, patch),
  };
}
