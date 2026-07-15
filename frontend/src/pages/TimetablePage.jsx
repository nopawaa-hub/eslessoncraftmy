import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { pageIdToPath } from "../lib/nav.js";
import { useAppStore } from "../state/useAppStore.js";
import { apiPost, apiPut, apiDelete, apiRequest, apiUpload } from "../services/api.js";
import { Card, PageHeader } from "../components/ui.jsx";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Settings,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { weekClasses, todayClasses, scheduleColors } from "../lib/fixtures.js";

export default function TimetablePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const lessons = useAppStore((s) => s.lessons);
  const savedClasses = useAppStore((s) => s.classes);
  const currentUser = useAppStore((s) => s.currentUser);
  const setCopilotOpen = useAppStore((s) => s.setCopilotOpen);

  // Compute liveMode
  const isDemoUser = currentUser?.email === "demo@test.com" || currentUser?.role === "demo" || String(currentUser?._id) === "000000000000000000000001";
  const liveMode = typeof window !== "undefined" && (window.location.pathname.startsWith("/testing") || searchParams.get("live") === "1" || (currentUser && !isDemoUser));

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const [tableSettings, setTableSettings] = useState({
    startTime: "08:00",
    endTime: "15:00",
    snapMinutes: 15,
    rowHeight: 110,
    dayWidth: 130,
  });
  const [tableSettingsOpen, setTableSettingsOpen] = useState(false);
  const buildSlots = (startTime, endTime) => {
    const toMinutes = (time) => {
      const [hour = "0", minute = "0"] = String(time || "08:00").split(":");
      return Number(hour) * 60 + Number(minute);
    };
    const start = toMinutes(startTime);
    const end = Math.max(start + 60, toMinutes(endTime));
    const built = [];
    for (let minute = start; minute <= end; minute += 60) {
      built.push(`${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`);
    }
    return built;
  };
  const slots = buildSlots(tableSettings.startTime, tableSettings.endTime);
  const hourRowHeight = Number(tableSettings.rowHeight || 110);
  const resizeStepMinutes = Number(tableSettings.snapMinutes || 15);
  const resizeStepPixels = hourRowHeight / (60 / resizeStepMinutes);
  const [classes, setClasses] = useState(liveMode ? [] : weekClasses);
  const [notice, setNotice] = useState("");
  const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  // Map a backend Period to the local schedule-block shape the grid renders.
  const periodToBlock = (period, slotIndex) => {
    const dayIndex = dayNames.indexOf(period.day);
    const startTime = period.startTime || "08:00";
    const startMinutes = timeToMinutes(startTime);
    return {
      id: String(period._id),
      _id: period._id,
      subject: period.subject || "English",
      className: period.className || "",
      year: period.year || "Year 5",
      skill: period.skill || "Reading",
      time: startTime,
      durationMinutes: Math.max(15, timeToMinutes(period.endTime || "09:00") - startMinutes) || 60,
      topic: period.topic || "English RPH",
      tone: period.tone || "indigo",
      day: dayIndex >= 0 ? dayIndex : 0,
      slot: slotIndex ?? slotForMinutes(startMinutes),
      status: period.status || "Needs RPH",
      lessonPlan: period.lessonPlan || "",
      lessonPlanId: period.link?.lessonPlanId?._id || period.link?.lessonPlanId || "",
      material: period.material || "",
      assessment: period.assessment || "",
      notes: period.notes || "",
    };
  };
  // Inverse: local block -> backend period payload (day as name, start/end times).
  const blockToPeriodPayload = (block) => ({
    day: dayNames[Number(block.day)] || "Monday",
    startTime: block.time || slots[block.slot] || "08:00",
    endTime: addMinutesToTime(block.time || slots[block.slot] || "08:00", Number(block.durationMinutes || 60)),
    className: block.className || "General",
    subject: block.subject || "English",
    year: block.year || "Year 4",
    recurring: true,
    notes: block.notes || "",
    tone: block.tone || "indigo",
    skill: block.skill || "",
    topic: block.topic || "",
    status: block.status || "",
    material: block.material || "",
    assessment: block.assessment || "",
    lessonPlan: block.lessonPlan || "",
  });
  const loadSchedule = async () => {
    if (!liveMode) return;
    try {
      const data = await apiRequest("/schedule/overview");
      const blocks = (data.periods || []).map((period) => periodToBlock(period));
      setClasses(blocks);
    } catch {
      setClasses([]);
    }
  };
  const persistNewPeriod = async (block) => {
    if (!liveMode) return block;
    try {
      const saved = await apiPost("/schedule/periods", blockToPeriodPayload(block));
      return periodToBlock(saved);
    } catch (err) {
      setNotice(err.message || "Could not save schedule block.");
      return block;
    }
  };
  const persistUpdatedPeriod = async (block) => {
    if (!liveMode || !block._id) return block;
    try {
      const saved = await apiPut(`/schedule/periods/${block._id}`, blockToPeriodPayload(block));
      return periodToBlock(saved);
    } catch (err) {
      setNotice(err.message || "Could not update schedule block.");
      return block;
    }
  };
  const deletePeriodRemote = async (periodId) => {
    if (!liveMode || !periodId) return;
    try {
      await apiDelete(`/schedule/periods/${periodId}`);
    } catch (err) {
      setNotice(err.message || "Could not delete schedule block.");
    }
  };
  useEffect(() => {
    loadSchedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveMode]);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [periodForm, setPeriodForm] = useState(null);
  const [resizeModeId, setResizeModeId] = useState("");
  const [resizePrompt, setResizePrompt] = useState("");
  const [resizePreview, setResizePreview] = useState(null);
  const [dragPreview, setDragPreview] = useState(null);
  const [draggingId, setDraggingId] = useState("");
  const [scheduleView, setScheduleView] = useState("week");
  const [calendarDate, setCalendarDate] = useState(() => new Date(2026, 4, 5));
  const [deletedOccurrences, setDeletedOccurrences] = useState([]);
  const [pendingDelete, setPendingDelete] = useState(null);
  const materialImageRef = useRef(null);
  const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const formatDateLabel = (date) => date.toLocaleDateString("en-MY", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const startOfWeek = (date) => {
    const copy = new Date(date);
    const diff = (copy.getDay() + 6) % 7;
    copy.setDate(copy.getDate() - diff);
    copy.setHours(0, 0, 0, 0);
    return copy;
  };
  const addDays = (date, daysToAdd) => {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + daysToAdd);
    return copy;
  };
  const weekStart = startOfWeek(calendarDate);
  const weekDates = days.map((_, index) => addDays(weekStart, index));
  const monthYear = calendarDate.getFullYear();
  const monthIndex = calendarDate.getMonth();
  const monthLabel = calendarDate.toLocaleDateString("en-MY", { month: "long", year: "numeric" });
  const weekLabel = `${weekDates[0].toLocaleDateString("en-MY", { day: "numeric", month: "short" })} - ${weekDates[4].toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })}`;
  const occurrenceKey = (item, date) => `${item.id}:${dateKey(date)}`;
  const isOccurrenceDeleted = (item, date) => date ? deletedOccurrences.includes(occurrenceKey(item, date)) : false;
  const moveCalendar = (direction) => {
    setCalendarDate((current) => {
      const next = new Date(current);
      if (scheduleView === "month") {
        next.setMonth(next.getMonth() + direction);
      } else {
        next.setDate(next.getDate() + direction * 7);
      }
      return next;
    });
  };
  const addMinutesToTime = (time, minutes) => {
    const [hour = "0", minute = "0"] = String(time || "08:00").split(":");
    const date = new Date(2026, 0, 1, Number(hour), Number(minute) + minutes);
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  };
  const timeToMinutes = (time) => {
    const [hour = "0", minute = "0"] = String(time || "08:00").split(":");
    return Number(hour) * 60 + Number(minute);
  };
  const minutesToTime = (totalMinutes) => {
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  };
  const slotForMinutes = (totalMinutes) => {
    let found = 0;
    slots.forEach((slot, index) => {
      if (timeToMinutes(slot) <= totalMinutes) found = index;
    });
    return found;
  };
  const timeRange = (item) => `${item.time || slots[item.slot] || "08:00"} - ${addMinutesToTime(item.time || slots[item.slot] || "08:00", Number(item.durationMinutes || 60))}`;
  const minutesIntoHour = (time) => {
    const minute = Number(String(time || "08:00").split(":")[1] || 0);
    return Number.isFinite(minute) ? minute : 0;
  };
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const updateTableSetting = (key, value) => {
    setTableSettings((current) => ({ ...current, [key]: value }));
  };
  const periodStyle = (item) => {
    const duration = Number(item.durationMinutes || 60);
    const start = timeToMinutes(item.time || slots[item.slot]);
    const base = timeToMinutes(slots[item.slot] || tableSettings.startTime);
    const topOffset = Math.max(0, ((start - base) / 60) * hourRowHeight);
    const visualHeight = Math.max(28, (duration / 60) * hourRowHeight);
    return {
      minHeight: `${visualHeight}px`,
      top: `${topOffset}px`,
      height: `${visualHeight}px`,
    };
  };
  const buildMonthCells = () => {
    const firstDay = new Date(monthYear, monthIndex, 1);
    const leadingBlanks = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(monthYear, monthIndex + 1, 0).getDate();
    return Array.from({ length: 42 }, (_, index) => {
      const dateNumber = index - leadingBlanks + 1;
      if (dateNumber < 1 || dateNumber > daysInMonth) return null;
      return new Date(monthYear, monthIndex, dateNumber);
    });
  };
  const monthCells = buildMonthCells();
  const lessonsForCalendarDate = (date) => {
    if (!date) return [];
    const weekdayIndex = (date.getDay() + 6) % 7;
    if (weekdayIndex > 4) return [];
    return classes
      .filter((item) => Number(item.day) === weekdayIndex && !isOccurrenceDeleted(item, date))
      .sort((a, b) => timeToMinutes(a.time || slots[a.slot]) - timeToMinutes(b.time || slots[b.slot]));
  };
  const getSnapFromPointer = (clientX, clientY) => {
    const grid = document.querySelector(".timetable-grid");
    if (!grid) return null;
    const rect = grid.getBoundingClientRect();
    const timeColumnWidth = 72;
    const headerHeight = hourRowHeight;
    const dayWidth = (rect.width - timeColumnWidth) / days.length;
    const x = clientX - rect.left - timeColumnWidth;
    const y = clientY - rect.top - headerHeight;
    const day = clamp(Math.floor(x / dayWidth), 0, days.length - 1);
    let row = clamp(Math.floor(y / hourRowHeight), 0, slots.length - 1);
    const yInRow = y - row * hourRowHeight;
    const stepsPerHour = Math.max(1, 60 / resizeStepMinutes);
    let step = Math.round(yInRow / resizeStepPixels);
    if (step >= stepsPerHour && row < slots.length - 1) {
      row += 1;
      step = 0;
    }
    step = clamp(step, 0, stepsPerHour - 1);
    const startMinutes = timeToMinutes(slots[row]) + step * resizeStepMinutes;
    return {
      day,
      slot: slotForMinutes(startMinutes),
      time: minutesToTime(startMinutes),
      startMinutes,
    };
  };
  const hasScheduleOverlap = (items, candidate, movingId) => {
    const start = timeToMinutes(candidate.time);
    const end = start + Number(candidate.durationMinutes || 60);
    return items.some((item) => {
      if (item.id === movingId || Number(item.day) !== Number(candidate.day)) return false;
      const itemStart = timeToMinutes(item.time || slots[item.slot]);
      const itemEnd = itemStart + Number(item.durationMinutes || 60);
      return start < itemEnd && end > itemStart;
    });
  };
  const openPeriod = (item, occurrenceDate = null) => {
    const matchedClass = savedClasses.find((schoolClass) => schoolClass._id === item.classId || schoolClass.name === item.className);
    setSelectedPeriod({
      ...item,
      occurrenceDateKey: occurrenceDate ? dateKey(occurrenceDate) : "",
      occurrenceDateLabel: occurrenceDate ? formatDateLabel(occurrenceDate) : "",
    });
    setPeriodForm({
      ...item,
      classId: item.classId || matchedClass?._id || "",
      className: item.className || matchedClass?.name || "",
      year: item.year || matchedClass?.year || "Year 5",
      tone: item.tone || "indigo",
      lessonPlan: item.lessonPlan || "",
      material: item.material || "",
      assessment: item.assessment || "",
      notes: item.notes || "",
    });
  };
  const updatePeriodForm = (key, value) => setPeriodForm((current) => ({ ...current, [key]: value }));
  const availableLessons = lessons.filter((lesson) => {
    if (!periodForm?.classId) return true;
    const lessonClassId = String(lesson.classId?._id || lesson.classId || "");
    return !lessonClassId || lessonClassId === String(periodForm.classId);
  });
  const applyScheduleClass = (classId) => {
    const schoolClass = savedClasses.find((item) => item._id === classId);
    setPeriodForm((current) => ({
      ...current,
      classId,
      className: schoolClass?.name || "",
      year: schoolClass?.year || current.year || "Year 5",
      subject: schoolClass?.subject || current.subject || "English",
    }));
  };
  const attachLessonPlan = (lessonId) => {
    const lesson = lessons.find((item) => item._id === lessonId);
    setPeriodForm((current) => ({
      ...current,
      lessonPlanId: lessonId,
      lessonPlan: lesson?.title || "",
      topic: lesson?.topic || lesson?.lessonDetails?.topic || current.topic,
      skill: lesson?.skill || lesson?.lessonDetails?.skill || current.skill,
      year: lesson?.year || lesson?.lessonDetails?.year || current.year,
      status: lessonId ? "Ready" : current.status,
    }));
  };
  const attachMaterialImage = (file) => {
    if (!file) return;
    if (!file.type?.startsWith("image/")) {
      setNotice("Material attachment must be an image file.");
      if (materialImageRef.current) materialImageRef.current.value = "";
      return;
    }
    setPeriodForm((current) => ({
      ...current,
      materialImageName: file.name,
      materialImageUrl: URL.createObjectURL(file),
      material: file.name,
    }));
    if (materialImageRef.current) materialImageRef.current.value = "";
  };
  const savePeriod = () => {
    const nextBlock = { ...selectedPeriod, ...periodForm };
    setClasses((items) => items.map((item) => item.id === selectedPeriod.id ? nextBlock : item));
    setSelectedPeriod(null);
    setNotice("Schedule block updated.");
    persistUpdatedPeriod(nextBlock).then((saved) => {
      setClasses((items) => items.map((item) => item.id === selectedPeriod.id ? { ...nextBlock, ...saved } : item));
    });
  };
  const duplicatePeriod = () => {
    const copy = { ...periodForm, _id: undefined, id: `copy-${Date.now()}`, slot: Math.min((Number(periodForm.slot) || 0) + 1, slots.length - 1), status: "Needs RPH" };
    setClasses((items) => [...items, copy]);
    setNotice("Schedule block duplicated.");
    setSelectedPeriod(null);
    persistNewPeriod(copy).then((saved) => {
      setClasses((items) => items.map((item) => item.id === copy.id ? { ...copy, ...saved } : item));
    });
  };
  const deletePeriod = () => {
    setPendingDelete(selectedPeriod);
  };
  const requestDelete = (item, occurrenceDate = null) => {
    setPendingDelete({
      ...item,
      occurrenceDateKey: occurrenceDate ? dateKey(occurrenceDate) : "",
      occurrenceDateLabel: occurrenceDate ? formatDateLabel(occurrenceDate) : "",
    });
  };
  const deleteSeries = () => {
    const id = pendingDelete?.id;
    if (!id) return;
    const remoteId = pendingDelete._id;
    setClasses((items) => items.filter((item) => item.id !== id));
    setDeletedOccurrences((items) => items.filter((key) => !key.startsWith(`${id}:`)));
    setNotice("All recurring schedule blocks deleted.");
    setPendingDelete(null);
    if (selectedPeriod?.id === id) setSelectedPeriod(null);
    deletePeriodRemote(remoteId);
  };
  const deleteSingleOccurrence = () => {
    if (!pendingDelete?.id || !pendingDelete.occurrenceDateKey) return;
    const key = `${pendingDelete.id}:${pendingDelete.occurrenceDateKey}`;
    setDeletedOccurrences((items) => items.includes(key) ? items : [...items, key]);
    setNotice(`Only the ${pendingDelete.occurrenceDateLabel} occurrence was deleted.`);
    setPendingDelete(null);
    if (selectedPeriod?.id === pendingDelete.id) setSelectedPeriod(null);
  };
  const addSlot = () => {
    const occupied = new Set(classes.map((item) => `${item.day}-${item.slot}`));
    let day = 0;
    let slot = 0;
    for (let d = 0; d < days.length; d += 1) {
      const found = slots.findIndex((_, s) => !occupied.has(`${d}-${s}`));
      if (found >= 0) {
        day = d;
        slot = found;
        break;
      }
    }
    const newItem = {
      id: `new-${Date.now()}`,
      subject: "English",
      className: "",
      year: "Year 5",
      skill: "Reading",
      time: slots[slot],
      durationMinutes: 60,
      topic: "New English RPH",
      tone: "indigo",
      day,
      slot,
      status: "Needs RPH",
      lessonPlan: "",
      material: "",
      assessment: "",
      notes: "",
    };
    setClasses((items) => [...items, newItem]);
    openPeriod(newItem);
    setNotice("New English slot added. Complete the block details in the modal.");
    persistNewPeriod(newItem).then((saved) => {
      setClasses((items) => items.map((item) => item.id === newItem.id ? { ...newItem, ...saved } : item));
    });
  };
  const startResize = (item, event) => {
    event.preventDefault();
    event.stopPropagation();
    const startY = event.clientY;
    const startDuration = Number(item.durationMinutes || 60);
    setResizeModeId(item.id);
    setResizePrompt("Hold the clock and drag down to extend time, or drag up to shorten it. Time changes in 15-minute steps.");
    setResizePreview({ id: item.id, text: timeRange(item) });
    const onMove = (moveEvent) => {
      const delta = moveEvent.clientY - startY;
      const steps = Math.round(delta / resizeStepPixels);
      const durationMinutes = Math.min(240, Math.max(resizeStepMinutes, startDuration + steps * resizeStepMinutes));
      setClasses((items) => items.map((current) => current.id === item.id ? { ...current, durationMinutes } : current));
      setResizePreview({ id: item.id, text: `${item.time || slots[item.slot]} - ${addMinutesToTime(item.time || slots[item.slot], durationMinutes)}` });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setNotice("Schedule block time adjusted.");
      setResizeModeId("");
      setTimeout(() => setResizePrompt(""), 2600);
      setTimeout(() => setResizePreview(null), 1000);
      setClasses((items) => {
        const updated = items.find((current) => current.id === item.id);
        if (updated) persistUpdatedPeriod(updated);
        return items;
      });
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };
  const startTopResize = (item, event) => {
    event.preventDefault();
    event.stopPropagation();
    const startY = event.clientY;
    const originalStart = timeToMinutes(item.time || slots[item.slot]);
    const originalEnd = originalStart + Number(item.durationMinutes || 60);
    setResizeModeId(item.id);
    setResizePrompt("Top resize: drag down to start later, or up to start earlier. End time stays fixed.");
    setResizePreview({ id: item.id, text: timeRange(item) });
    const onMove = (moveEvent) => {
      const delta = moveEvent.clientY - startY;
      const steps = Math.round(delta / resizeStepPixels);
      const earliestStart = timeToMinutes(slots[0]);
      const latestStart = originalEnd - resizeStepMinutes;
      const newStart = Math.min(latestStart, Math.max(earliestStart, originalStart + steps * resizeStepMinutes));
      const durationMinutes = originalEnd - newStart;
      const time = minutesToTime(newStart);
      setClasses((items) => items.map((current) => current.id === item.id ? { ...current, time, slot: slotForMinutes(newStart), durationMinutes } : current));
      setResizePreview({ id: item.id, text: `${time} - ${minutesToTime(originalEnd)}` });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setNotice("Schedule block start time adjusted.");
      setResizeModeId("");
      setTimeout(() => setResizePrompt(""), 2600);
      setTimeout(() => setResizePreview(null), 1000);
      setClasses((items) => {
        const updated = items.find((current) => current.id === item.id);
        if (updated) persistUpdatedPeriod(updated);
        return items;
      });
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };
  const armResizeMode = (item, event) => {
    event.preventDefault();
    event.stopPropagation();
    setResizeModeId(item.id);
    setResizePrompt("Resize mode on: drag the lesson block down to extend time, or up to shorten it. Time changes in 15-minute steps.");
    setResizePreview({ id: item.id, text: timeRange(item) });
  };
  const startMovePeriod = (item, event) => {
    event.preventDefault();
    event.stopPropagation();
    const durationMinutes = Number(item.durationMinutes || 60);
    let lastSnap = {
      day: item.day,
      slot: item.slot,
      time: item.time || slots[item.slot],
      startMinutes: timeToMinutes(item.time || slots[item.slot]),
      invalid: false,
    };
    setResizeModeId("");
    setResizePrompt("");
    setResizePreview(null);
    setDraggingId(item.id);
    setDragPreview({ id: item.id, text: `${days[item.day]} ${timeRange(item)}`, invalid: false });
    const onMove = (moveEvent) => {
      const snap = getSnapFromPointer(moveEvent.clientX, moveEvent.clientY);
      if (!snap) return;
      const candidate = { ...item, ...snap, durationMinutes };
      const blocked = hasScheduleOverlap(classes, candidate, item.id);
      if (!blocked) {
        setClasses((items) => items.map((current) => current.id === item.id ? { ...current, day: snap.day, slot: snap.slot, time: snap.time } : current));
      }
      lastSnap = { ...snap, invalid: blocked };
      setDragPreview({
        id: item.id,
        text: blocked ? "Time overlaps another block" : `${days[snap.day]} ${snap.time} - ${addMinutesToTime(snap.time, durationMinutes)}`,
        invalid: blocked,
      });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setDraggingId("");
      setDragPreview(null);
      if (lastSnap.invalid) {
        setNotice("That time overlaps another schedule block, so the move was not applied.");
        return;
      }
      setNotice(`Schedule block moved to ${days[lastSnap.day]} ${lastSnap.time}.`);
      setClasses((items) => {
        const updated = items.find((current) => current.id === item.id);
        if (updated) persistUpdatedPeriod(updated);
        return items;
      });
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };
  const handlePeriodPointerDown = (item, event) => {
    if (event.target.closest?.(".period-actions") || event.target.closest?.(".period-top-resize-zone")) return;
    if (resizeModeId === item.id) {
      startResize(item, event);
      return;
    }
    startMovePeriod(item, event);
  };
  return (
    <div className="page-stack">
      <PageHeader eyebrow="English Timetable" title={scheduleView === "week" ? "Weekly English Schedule" : "Monthly English Calendar"} subtitle="Click any period to edit links, notes and lesson details without leaving the timetable." />
      <div className="schedule-toolbar">
        <div className="view-toggle" aria-label="Timetable view">
          <button className={scheduleView === "week" ? "active" : ""} onClick={() => setScheduleView("week")} type="button">Week</button>
          <button className={scheduleView === "month" ? "active" : ""} onClick={() => setScheduleView("month")} type="button">Month</button>
        </div>
        <div className="calendar-nav" aria-label="Calendar navigation">
          <button type="button" onClick={() => moveCalendar(-1)}><ChevronLeft /></button>
          <strong>{scheduleView === "week" ? weekLabel : monthLabel}</strong>
          <button type="button" onClick={() => moveCalendar(1)}><ChevronRight /></button>
        </div>
        <button className="primary-btn" onClick={addSlot}><Plus /> New slot</button>
      </div>
      {notice && <div className="success-note"><CheckCircle2 /> {notice}</div>}
      {resizePrompt && <div className="resize-instruction"><Clock /> {resizePrompt}</div>}
      <section className="schedule-layout">
        <Card title={scheduleView === "week" ? "This week" : monthLabel} subtitle={scheduleView === "week" ? `English periods · ${weekLabel}` : "Recurring English lessons from the weekly timetable"} className="span-3">
          {scheduleView === "week" ? (
            <div className="timetable-shell">
              <div className="timetable-grid" style={{ "--hour-row-height": `${hourRowHeight}px`, "--day-min-width": `${Number(tableSettings.dayWidth || 130)}px` }}>
                <div className="time-head" />
                {days.map((day, index) => <div className="day-head" key={day}>{day}<small>{weekDates[index].toLocaleDateString("en-MY", { day: "numeric", month: "short" })}</small></div>)}
                {slots.map((slot, row) => (
                  <React.Fragment key={slot}>
                    <div className="time-cell">{slot}</div>
                    {days.map((day, column) => {
                      const cellDate = weekDates[column];
                      const cellItems = classes.filter((c) => c.day === column && c.slot === row && !isOccurrenceDeleted(c, cellDate));
                      return (
                        <div className="period-cell" key={`${day}-${slot}`}>
                          {cellItems.map((item) => (
                            <div key={item.id} className={`period ${item.tone} duration-${Number(item.durationMinutes || 60) <= 30 ? "short" : Number(item.durationMinutes || 60) <= 60 ? "medium" : "long"} ${resizeModeId === item.id ? "is-resizing" : ""} ${draggingId === item.id ? "is-dragging" : ""}`} style={periodStyle(item)} onPointerDown={(event) => handlePeriodPointerDown(item, event)}>
                              {resizeModeId === item.id && <button type="button" className="period-top-resize-zone" aria-label="Adjust start time" onPointerDown={(event) => startTopResize(item, event)} />}
                              <div className="period-main">
                                <strong>{item.className || "Unassigned class"}</strong>
                                <span className="period-topic">{item.topic}</span>
                                <small className="period-meta">{item.skill} · {item.year}</small>
                                <em>{item.status}</em>
                                <i className="period-time">{timeRange(item)}</i>
                              </div>
                              <div className="period-actions" aria-label="Schedule block actions">
                                <button type="button" title="Edit block" onClick={() => openPeriod(item, cellDate)}><Pencil /></button>
                                <button type="button" title="Delete block" onClick={() => requestDelete(item, cellDate)}><Trash2 /></button>
                                <button type="button" title="Resize time" className="resize-btn" onClick={(event) => armResizeMode(item, event)}><Clock /></button>
                              </div>
                              {resizePreview?.id === item.id && <div className="resize-tooltip">{resizePreview.text}</div>}
                              {dragPreview?.id === item.id && <div className={`resize-tooltip ${dragPreview.invalid ? "invalid" : ""}`}>{dragPreview.text}</div>}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
              <div className="timetable-footer">
                <button className="table-settings-fab" type="button" onClick={() => setTableSettingsOpen(true)} aria-label="Open timetable settings"><Settings /> Table settings</button>
              </div>
            </div>
          ) : (
            <div className="month-calendar">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <div className="month-day-head" key={day}>{day}</div>)}
              {monthCells.map((date, index) => {
                const dayLessons = lessonsForCalendarDate(date);
                return (
                  <div className={`month-cell ${date ? "" : "empty"} ${dayLessons.length ? "has-lessons" : ""}`} key={`${date?.toISOString() || "empty"}-${index}`}>
                    {date && <strong>{date.getDate()}</strong>}
                    <div className="month-lessons">
                      {dayLessons.slice(0, 4).map((item) => (
                        <button key={`${date?.getDate()}-${item.id}`} className={`month-lesson ${item.tone}`} onClick={() => openPeriod(item, date)} type="button">
                          <span>{item.time || slots[item.slot]}</span>
                          <b>{item.className || "Unassigned class"}</b>
                          <small>{item.topic}</small>
                        </button>
                      ))}
                      {dayLessons.length > 4 && <em>+{dayLessons.length - 4} more</em>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </section>
      {selectedPeriod && periodForm && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card">
            <div className="modal-header">
              <div><p className="eyebrow">Schedule Block</p><h2>{periodForm.topic || "Untitled period"}</h2></div>
              <button className="icon-btn" onClick={() => setSelectedPeriod(null)}><X /></button>
            </div>
            <div className="modal-color-picker" aria-label="Schedule block color">
              <span>Color</span>
              {scheduleColors.map((color) => (
                <button
                  key={color.id}
                  type="button"
                  className={`color-pill ${color.id} ${periodForm.tone === color.id ? "selected" : ""}`}
                  onClick={() => updatePeriodForm("tone", color.id)}
                >
                  <i /> {color.label}
                </button>
              ))}
            </div>
            <div className="form-row">
              <label className="field"><span>Day</span><select value={periodForm.day} onChange={(event) => updatePeriodForm("day", Number(event.target.value))}>{days.map((day, index) => <option key={day} value={index}>{day}</option>)}</select></label>
              <label className="field"><span>Time</span><select value={periodForm.slot} onChange={(event) => { const slot = Number(event.target.value); updatePeriodForm("slot", slot); updatePeriodForm("time", slots[slot]); }}>{slots.map((slot, index) => <option key={slot} value={index}>{slot}</option>)}</select></label>
            </div>
            <div className="form-row">
              <label className="field">
                <span>Class</span>
                <select value={periodForm.classId || ""} onChange={(event) => applyScheduleClass(event.target.value)}>
                  <option value="">Select from class database</option>
                  {savedClasses.map((schoolClass) => <option key={schoolClass._id} value={schoolClass._id}>{schoolClass.name} · {schoolClass.year}</option>)}
                </select>
              </label>
              <label className="field"><span>Year</span><select value={periodForm.year || "Year 5"} onChange={(event) => updatePeriodForm("year", event.target.value)}><option>Year 1</option><option>Year 2</option><option>Year 3</option><option>Year 4</option><option>Year 5</option><option>Year 6</option></select></label>
            </div>
            <div className="form-row">
              <label className="field"><span>Skill</span><select value={periodForm.skill || "Reading"} onChange={(event) => updatePeriodForm("skill", event.target.value)}><option>Reading</option><option>Writing</option><option>Speaking</option><option>Listening</option><option>Grammar</option><option>Phonics</option></select></label>
              <label className="field"><span>Status</span><select value={periodForm.status || "Needs RPH"} onChange={(event) => updatePeriodForm("status", event.target.value)}><option>Needs RPH</option><option>Draft</option><option>Ready</option><option>PBD due</option><option>Completed</option></select></label>
            </div>
            <label className="field"><span>Topic</span><input value={periodForm.topic || ""} onChange={(event) => updatePeriodForm("topic", event.target.value)} /></label>
            <label className="field">
              <span>Attach RPH from library</span>
              <select value={periodForm.lessonPlanId || ""} onChange={(event) => attachLessonPlan(event.target.value)}>
                <option value="">No RPH attached</option>
                {availableLessons.map((lesson) => (
                  <option key={lesson._id} value={lesson._id}>
                    {lesson.title || "Untitled RPH"} · {lesson.className || lesson.classId?.name || "General"}
                  </option>
                ))}
              </select>
            </label>
            {!availableLessons.length && <p className="body-copy">No saved RPH found for this class yet. Generate one first, then attach it here.</p>}
            <div className="form-row">
              <label className="field">
                <span>Material image</span>
                <input ref={materialImageRef} type="file" accept="image/*" onChange={(event) => attachMaterialImage(event.target.files?.[0])} />
              </label>
              <label className="field"><span>Assessment</span><input value={periodForm.assessment || ""} onChange={(event) => updatePeriodForm("assessment", event.target.value)} placeholder="PBD checklist, exit ticket..." /></label>
            </div>
            {periodForm.materialImageName && (
              <div className="image-attachment-preview">
                {periodForm.materialImageUrl && <img src={periodForm.materialImageUrl} alt={periodForm.materialImageName} />}
                <div><strong>{periodForm.materialImageName}</strong><span>Image attached to this schedule block</span></div>
                <button className="icon-btn" onClick={() => updatePeriodForm("materialImageName", "")}><X /></button>
              </div>
            )}
            <label className="field"><span>Notes</span><textarea rows="3" value={periodForm.notes || ""} onChange={(event) => updatePeriodForm("notes", event.target.value)} placeholder="Teacher notes, class constraints, intervention reminders" /></label>
            <div className="modal-actions">
              <button className="secondary-btn" onClick={() => { setSelectedPeriod(null); navigate(pageIdToPath("lesson-planner")); }}><Sparkles /> Create lesson plan</button>
              <button className="secondary-btn" onClick={duplicatePeriod}><Plus /> Duplicate</button>
              <button className="secondary-btn" onClick={deletePeriod}><X /> Delete</button>
              <button className="primary-btn" onClick={savePeriod}><Save /> Save block</button>
            </div>
          </div>
        </div>
      )}
      {pendingDelete && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card delete-choice-modal">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Delete Schedule Block</p>
                <h2>{pendingDelete.topic || "Untitled period"}</h2>
              </div>
              <button className="icon-btn" onClick={() => setPendingDelete(null)}><X /></button>
            </div>
            <p className="body-copy">
              This lesson repeats across the calendar. Choose whether to remove only this occurrence or the whole recurring class block.
            </p>
            {pendingDelete.occurrenceDateLabel && (
              <div className="delete-date-note"><CalendarDays /> Selected occurrence: <strong>{pendingDelete.occurrenceDateLabel}</strong></div>
            )}
            <div className="delete-choice-grid">
              <button className="secondary-btn" disabled={!pendingDelete.occurrenceDateKey} onClick={deleteSingleOccurrence}><CalendarDays /> Delete this one only</button>
              <button className="danger-btn" onClick={deleteSeries}><Trash2 /> Delete all classes</button>
            </div>
          </div>
        </div>
      )}
      {tableSettingsOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card table-settings-modal">
            <div className="modal-header">
              <div><p className="eyebrow">Timetable Settings</p><h2>Adjust table layout</h2></div>
              <button className="icon-btn" onClick={() => setTableSettingsOpen(false)}><X /></button>
            </div>
            <div className="form-row">
              <label className="field"><span>School starts</span><input type="time" value={tableSettings.startTime} onChange={(event) => updateTableSetting("startTime", event.target.value)} /></label>
              <label className="field"><span>School ends</span><input type="time" value={tableSettings.endTime} onChange={(event) => updateTableSetting("endTime", event.target.value)} /></label>
            </div>
            <label className="field">
              <span>Time adjustment interval: {tableSettings.snapMinutes} min</span>
              <input type="range" min="1" max="60" step="1" value={tableSettings.snapMinutes} onChange={(event) => updateTableSetting("snapMinutes", Number(event.target.value))} />
            </label>
            <div className="quick-intervals">
              {[1, 5, 10, 15, 30, 60].map((minutes) => (
                <button key={minutes} type="button" className={tableSettings.snapMinutes === minutes ? "active" : ""} onClick={() => updateTableSetting("snapMinutes", minutes)}>{minutes} min</button>
              ))}
            </div>
            <label className="field">
              <span>Table row height: {tableSettings.rowHeight}px</span>
              <input type="range" min="72" max="150" step="2" value={tableSettings.rowHeight} onChange={(event) => updateTableSetting("rowHeight", Number(event.target.value))} />
            </label>
            <label className="field">
              <span>Day column width: {tableSettings.dayWidth}px</span>
              <input type="range" min="110" max="240" step="5" value={tableSettings.dayWidth} onChange={(event) => updateTableSetting("dayWidth", Number(event.target.value))} />
            </label>
            <div className="modal-actions">
              <button className="secondary-btn" onClick={() => setTableSettings({ startTime: "08:00", endTime: "15:00", snapMinutes: 15, rowHeight: 110, dayWidth: 130 })}><RefreshCw /> Reset</button>
              <button className="primary-btn" onClick={() => setTableSettingsOpen(false)}><Save /> Apply settings</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
