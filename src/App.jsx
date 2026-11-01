import React, { useState, useEffect, useMemo } from "react";
import {
  Home,
  Dumbbell,
  TrendingUp,
  Play,
  Pause,
  Check,
  Plus,
  X,
  Trophy,
  Flame,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Trash2,
  ArrowLeftRight,
  GripVertical,
  Footprints,
  Sunrise,
  Apple,
  Wallet,
  Layers,
  Armchair,
  LayoutGrid,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Design tokens — soft autumn palette
// ---------------------------------------------------------------------------
const COLORS = {
  bg: "#EDE7DA",
  card: "#FBF8F1",
  border: "#DED2BB",
  ink: "#3B342B",
  muted: "#96897A",
  sage: "#7C8560",
  rust: "#B26A4C",
  ochre: "#C3963F",
  plum: "#7C4E45",
  green: "#5C6B45",
  red: "#A24B3E",
};

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------
const buildSets = (n, prev, defaultWeight, defaultReps) =>
  Array.from({ length: n }, (_, i) => ({ set: i + 1, prev: prev || "—", weight: defaultWeight != null ? String(defaultWeight) : "", reps: defaultReps != null ? String(defaultReps) : "", done: false }));
function fmtDate(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function todayISO(d = new Date()) {
  return d.toISOString().slice(0, 10);
}
function addWeeks(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + 7 * n);
  return d;
}
function getWeekDates(base = new Date()) {
  const day = base.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(base);
  monday.setDate(base.getDate() + mondayOffset);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return { iso: todayISO(d), weekday: d.getDay(), label: d.toLocaleDateString("en-US", { weekday: "short" }), dayNum: d.getDate() };
  });
}
function mondayIso(offsetWeeks = 0) {
  return getWeekDates(addWeeks(new Date(), offsetWeeks))[0].iso;
}
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
// Migrates a saved schedule from the old single-session-per-day shape
// ({type:"strength",...} or {type:"rest"}) to the current sessions-array
// shape ([{type:"strength",...}]) so weeks customized before double-booking
// existed still load correctly instead of crashing on the first .find() call.
// Saved libraries replace the defaults wholesale, so newly shipped default
// entries would never show up. Merge: keep everything saved (incl. custom),
// then append any default entry whose id isn't there yet.
function mergeLibrary(saved, defaults) {
  const base = Array.isArray(saved) ? saved : [];
  const ids = new Set(base.map((x) => x.id));
  return [...base, ...defaults.filter((d) => !ids.has(d.id))];
}
// Bump whenever the default day templates change shape/content in a way that
// older saved copies can't be patched safely (v2: power → plyoId, 1 prehab,
// 1 core on 3/4-day with rotating focus).
const TEMPLATES_VERSION = 2;
function migrateScheduleDay(day) {
  if (Array.isArray(day)) return day;
  if (day && day.type && day.type !== "rest") return [day];
  return [];
}
function migrateScheduleByWeek(raw) {
  const next = {};
  Object.keys(raw || {}).forEach((weekKey) => {
    const week = raw[weekKey] || {};
    const migratedWeek = {};
    for (let d = 0; d <= 6; d++) migratedWeek[d] = migrateScheduleDay(week[d]);
    next[weekKey] = migratedWeek;
  });
  return next;
}

// ---------------------------------------------------------------------------
// Exercise Library — the single source of truth for every exercise, tagged
// by movement-pattern category. Custom exercises added in the Exercise
// Overview tab live in this same array (custom: true) and immediately
// become available as swap/template alternatives everywhere.
// ---------------------------------------------------------------------------
const CATEGORY_META = {
  squat: { label: "Squat / Knee-Dominant", color: COLORS.sage },
  hinge: { label: "Hinge / Hip-Dominant", color: COLORS.rust },
  vertPush: { label: "Vertical Push", color: COLORS.ochre },
  vertPull: { label: "Vertical Pull", color: COLORS.plum },
  horzPush: { label: "Horizontal Push", color: COLORS.ochre },
  horzPull: { label: "Horizontal Pull", color: COLORS.plum },
  coreFlexion: { label: "Core — Flexion", color: COLORS.green },
  coreRotation: { label: "Core — Rotation", color: COLORS.green },
  coreAntiRotation: { label: "Core — Anti-Rotation / Stability", color: COLORS.green },
  coreExtension: { label: "Core — Extension / Anti-Flexion", color: COLORS.green },
  arms: { label: "Arms & Shoulders (Isolation)", color: COLORS.red },
  calves: { label: "Calves", color: COLORS.muted },
  carry: { label: "Carry / Full-Body", color: COLORS.rust },
};
const CATEGORY_ORDER = ["squat", "hinge", "vertPush", "vertPull", "horzPush", "horzPull", "coreFlexion", "coreRotation", "coreAntiRotation", "coreExtension", "arms", "calves", "carry"];

const EXERCISE_LIBRARY_DEFAULT = [
  // Squat / knee-dominant
  { id: "ex-backSquat", name: "Back Squat", category: "squat", muscle: "Quads/Glutes", sets: 4, reps: "50kg x5", custom: false },
  { id: "ex-frontSquat", name: "Front Squat", category: "squat", muscle: "Quads/Glutes", sets: 4, reps: "—", custom: false },
  { id: "ex-bulgarianSplitSquat", name: "Bulgarian Split Squat", category: "squat", muscle: "Legs", sets: 3, reps: "10kg DBs x10/side", custom: false },
  { id: "ex-legPress", name: "Leg Press", category: "squat", muscle: "Quads", sets: 3, reps: "70kg x10", custom: false },
  { id: "ex-gobletSquat", name: "Goblet Squat", category: "squat", muscle: "Quads", sets: 3, reps: "—", custom: false },
  { id: "ex-walkingLunges", name: "Walking Lunges", category: "squat", muscle: "Quads/Glutes", sets: 3, reps: "12kg DBs x10/side", custom: false },
  { id: "ex-stepUps", name: "Step-Ups", category: "squat", muscle: "Legs", sets: 3, reps: "—", custom: false },
  { id: "ex-hackSquat", name: "Hack Squat", category: "squat", muscle: "Quads", sets: 4, reps: "—", custom: false },
  { id: "ex-cossackSquat", name: "Cossack Squat", category: "squat", muscle: "Quads/Adductors", sets: 3, reps: "—", custom: false },
  // Hinge / hip-dominant
  { id: "ex-deadlift", name: "Deadlift", category: "hinge", muscle: "Full Body/Posterior", sets: 4, reps: "60kg x5", custom: false },
  { id: "ex-trapBarDeadlift", name: "Trap Bar Deadlift", category: "hinge", muscle: "Full Body/Posterior", sets: 4, reps: "—", custom: false },
  { id: "ex-romanianDeadlift", name: "Romanian Deadlift", category: "hinge", muscle: "Hamstrings/Glutes", sets: 3, reps: "55kg x8", custom: false },
  { id: "ex-singleLegRDL", name: "Single-Leg RDL", category: "hinge", muscle: "Hamstrings/Glutes", sets: 3, reps: "—", custom: false },
  { id: "ex-hamstringCurl", name: "Hamstring Curl", category: "hinge", muscle: "Hamstrings", sets: 3, reps: "25kg x12", custom: false },
  { id: "ex-nordicCurl", name: "Nordic Curl", category: "hinge", muscle: "Hamstrings", sets: 3, reps: "—", custom: false },
  { id: "ex-hipThrust", name: "Hip Thrust", category: "hinge", muscle: "Glutes", sets: 3, reps: "—", custom: false },
  { id: "ex-goodMorning", name: "Good Morning", category: "hinge", muscle: "Hamstrings/Lower Back", sets: 3, reps: "—", custom: false },
  { id: "ex-gluteHamRaise", name: "Glute Ham Raise", category: "hinge", muscle: "Hamstrings", sets: 3, reps: "—", custom: false },
  // Vertical pull
  { id: "ex-weightedPullupNeg", name: "Weighted Pull-Up Negative", category: "vertPull", muscle: "Back", sets: 4, reps: "BW x5 neg, 4s", custom: false },
  { id: "ex-latPulldown", name: "Lat Pulldown", category: "vertPull", muscle: "Back", sets: 3, reps: "32kg x10", custom: false },
  { id: "ex-neutralGripPulldown", name: "Neutral-Grip Pulldown", category: "vertPull", muscle: "Back", sets: 3, reps: "—", custom: false },
  { id: "ex-chinUp", name: "Chin-Up", category: "vertPull", muscle: "Back/Biceps", sets: 3, reps: "-10kg assist x5", custom: false },
  { id: "ex-bandedAssistedPullup", name: "Banded Assisted Pull-Up", category: "vertPull", muscle: "Back", sets: 4, reps: "—", custom: false },
  { id: "ex-assistedPullupLadder", name: "Assisted Pull-Up Ladder", category: "vertPull", muscle: "Back", sets: 4, reps: "-14kg assist x6", custom: false },
  { id: "ex-straightArmPulldown", name: "Straight-Arm Pulldown", category: "vertPull", muscle: "Lats", sets: 3, reps: "—", custom: false },
  // Vertical push
  { id: "ex-pushPress", name: "Push Press", category: "vertPush", muscle: "Shoulders/Power", sets: 4, reps: "22kg x6", custom: false },
  { id: "ex-dbOverheadPress", name: "DB Overhead Press", category: "vertPush", muscle: "Shoulders", sets: 3, reps: "12kg x10", custom: false },
  { id: "ex-seatedDbShoulderPress", name: "Seated DB Shoulder Press", category: "vertPush", muscle: "Shoulders", sets: 3, reps: "—", custom: false },
  { id: "ex-arnoldPress", name: "Arnold Press", category: "vertPush", muscle: "Shoulders", sets: 3, reps: "—", custom: false },
  { id: "ex-landminePress", name: "Landmine Press", category: "vertPush", muscle: "Shoulders", sets: 3, reps: "—", custom: false },
  // Horizontal push
  { id: "ex-dbBenchPress", name: "DB Bench Press", category: "horzPush", muscle: "Chest", sets: 4, reps: "18kg x8", custom: false },
  { id: "ex-barbellBenchPress", name: "Barbell Bench Press", category: "horzPush", muscle: "Chest", sets: 4, reps: "—", custom: false },
  { id: "ex-inclineDbPress", name: "Incline DB Press", category: "horzPush", muscle: "Chest", sets: 3, reps: "14kg x10", custom: false },
  { id: "ex-flatDbPress", name: "Flat DB Press", category: "horzPush", muscle: "Chest", sets: 3, reps: "—", custom: false },
  { id: "ex-cableFly", name: "Cable Fly", category: "horzPush", muscle: "Chest", sets: 3, reps: "—", custom: false },
  // Horizontal pull
  { id: "ex-chestSupportedRow", name: "Chest-Supported Row", category: "horzPull", muscle: "Back", sets: 4, reps: "—", custom: false },
  { id: "ex-seatedCableRow", name: "Seated Cable Row", category: "horzPull", muscle: "Back", sets: 3, reps: "40kg x10", custom: false },
  { id: "ex-cableRow", name: "Cable Row", category: "horzPull", muscle: "Back", sets: 3, reps: "35kg x12", custom: false },
  { id: "ex-singleArmDbRow", name: "Single-Arm DB Row", category: "horzPull", muscle: "Back", sets: 3, reps: "—", custom: false },
  { id: "ex-ringRows", name: "Ring Rows", category: "horzPull", muscle: "Back", sets: 3, reps: "—", custom: false },
  { id: "ex-tBarRow", name: "T-Bar Row", category: "horzPull", muscle: "Back", sets: 3, reps: "—", custom: false },
  // Core — flexion
  { id: "ex-cableCrunch", name: "Cable Crunch", category: "coreFlexion", muscle: "Core", sets: 3, reps: "—", custom: false },
  { id: "ex-weightedSitup", name: "Weighted Sit-Up", category: "coreFlexion", muscle: "Core", sets: 3, reps: "—", custom: false },
  { id: "ex-hangingKneeRaise", name: "Hanging Knee Raise", category: "coreFlexion", muscle: "Core", sets: 3, reps: "—", custom: false },
  // Core — rotation
  { id: "ex-russianTwist", name: "Russian Twist", category: "coreRotation", muscle: "Core/Obliques", sets: 2, reps: "12/side", custom: false },
  { id: "ex-cableWoodchop", name: "Cable Woodchop", category: "coreRotation", muscle: "Core/Obliques", sets: 2, reps: "12/side", custom: false },
  { id: "ex-landmineRotation", name: "Landmine Rotation", category: "coreRotation", muscle: "Core/Obliques", sets: 2, reps: "10/side", custom: false },
  // Core — anti-rotation / stability
  { id: "ex-palloffPress", name: "Pallof Press", category: "coreAntiRotation", muscle: "Core", sets: 2, reps: "10/side", custom: false },
  { id: "ex-deadBug", name: "Dead Bug", category: "coreAntiRotation", muscle: "Core", sets: 2, reps: "10/side", custom: false },
  { id: "ex-plank", name: "Plank", category: "coreAntiRotation", muscle: "Core", sets: 2, reps: "40s", custom: false },
  { id: "ex-sidePlank", name: "Side Plank", category: "coreAntiRotation", muscle: "Core", sets: 2, reps: "30s/side", custom: false },
  { id: "ex-renegadeRow", name: "Renegade Row", category: "coreAntiRotation", muscle: "Core/Back", sets: 2, reps: "8/side", custom: false },
  // Core — extension / anti-flexion
  { id: "ex-birdDog", name: "Bird Dog", category: "coreExtension", muscle: "Core/Lower Back", sets: 2, reps: "10/side", custom: false },
  { id: "ex-supermanHold", name: "Superman Hold", category: "coreExtension", muscle: "Lower Back", sets: 2, reps: "20s", custom: false },
  { id: "ex-backExtension", name: "Back Extension", category: "coreExtension", muscle: "Lower Back", sets: 3, reps: "—", custom: false },
  // Arms & shoulders (isolation)
  { id: "ex-bicepCurl", name: "Bicep Curl", category: "arms", muscle: "Arms", sets: 2, reps: "10kg x12", custom: false },
  { id: "ex-hammerCurl", name: "Hammer Curl", category: "arms", muscle: "Arms", sets: 2, reps: "—", custom: false },
  { id: "ex-preacherCurl", name: "Preacher Curl", category: "arms", muscle: "Arms", sets: 2, reps: "—", custom: false },
  { id: "ex-tricepsPushdown", name: "Triceps Pushdown", category: "arms", muscle: "Arms", sets: 2, reps: "20kg x12", custom: false },
  { id: "ex-skullCrusher", name: "Skull Crusher", category: "arms", muscle: "Arms", sets: 2, reps: "—", custom: false },
  { id: "ex-overheadTricepsExt", name: "Overhead Triceps Extension", category: "arms", muscle: "Arms", sets: 2, reps: "—", custom: false },
  { id: "ex-lateralRaise", name: "Lateral Raise", category: "arms", muscle: "Shoulders", sets: 2, reps: "6kg x15", custom: false },
  { id: "ex-cableLateralRaise", name: "Cable Lateral Raise", category: "arms", muscle: "Shoulders", sets: 2, reps: "—", custom: false },
  { id: "ex-facePull", name: "Face Pull", category: "arms", muscle: "Shoulders", sets: 2, reps: "15kg x15", custom: false },
  { id: "ex-reversePecDeck", name: "Reverse Pec Deck", category: "arms", muscle: "Shoulders", sets: 2, reps: "—", custom: false },
  // Calves
  { id: "ex-standingCalfRaise", name: "Standing Calf Raise", category: "calves", muscle: "Calves", sets: 3, reps: "30kg x15", custom: false },
  { id: "ex-seatedCalfRaise", name: "Seated Calf Raise", category: "calves", muscle: "Calves", sets: 3, reps: "—", custom: false },
  { id: "ex-donkeyCalfRaise", name: "Donkey Calf Raise", category: "calves", muscle: "Calves", sets: 3, reps: "—", custom: false },
  // Carry / full body
  { id: "ex-farmersCarry", name: "Farmer's Carry", category: "carry", muscle: "Full Body/Grip", sets: 3, reps: "16kg DBs x40m", custom: false },
  { id: "ex-suitcaseCarry", name: "Suitcase Carry", category: "carry", muscle: "Full Body/Grip", sets: 3, reps: "—", custom: false },
  { id: "ex-overheadCarry", name: "Overhead Carry", category: "carry", muscle: "Full Body/Shoulders", sets: 3, reps: "—", custom: false },
];

function resolveEx(library, id) {
  return (library || []).find((e) => e.id === id) || { id, name: "(exercise removed — pick a new one)", category: "squat", muscle: "—", sets: 3, reps: "—", custom: false };
}

// ---------------------------------------------------------------------------
// Warmup & Prehab libraries — kept separate from the main Exercise Library
// (and from Core work, which now lives in the main library's core-* slots)
// so each day template's warmup checklist and prehab block can be authored
// and swapped from the Exercise tab, the same way main/secondary/accessory
// slots already can be.
// ---------------------------------------------------------------------------
const WARMUP_LIBRARY_DEFAULT = [
  { id: "wu-bike", name: "5 min stationary bike, easy pace", custom: false },
  { id: "wu-row", name: "5 min easy row", custom: false },
  { id: "wu-legSwings", name: "Leg swings x15/side", custom: false },
  { id: "wu-armCircles", name: "Arm circles x15 each direction", custom: false },
  { id: "wu-bwSquats", name: "Bodyweight squats x15", custom: false },
  { id: "wu-scapPullups", name: "Scapular pull-ups x8", custom: false },
  { id: "wu-catCow", name: "Cat-cow x10", custom: false },
  { id: "wu-bandPullAparts", name: "Band pull-aparts x15", custom: false },
  { id: "wu-scapWallSlides", name: "Scapular wall slides x10", custom: false },
  { id: "wu-bwRDL", name: "Bodyweight RDL x10", custom: false },
  { id: "wu-shoulderDislocates", name: "Band shoulder dislocates x10", custom: false },
  { id: "wu-hipCircles", name: "Hip circles x10/side", custom: false },
  { id: "wu-inchworm", name: "Inchworm to cobra x8", custom: false },
  { id: "wu-ankleCircles", name: "Ankle circles x10/side", custom: false },
  { id: "wu-worldsGreatest", name: "World's Greatest Stretch x5/side", custom: false },
];
function resolveWarmup(library, id) {
  const found = (library || []).find((w) => w.id === id);
  return found ? found.name : id;
}

const PREHAB_LIBRARY_DEFAULT = [
  { id: "prehab-gluteBridge", name: "Glute Bridge", targetSets: 2, targetReps: "15", custom: false },
  { id: "prehab-bandFacePull", name: "Band Face Pull", targetSets: 2, targetReps: "15", custom: false },
  { id: "prehab-rotatorCuffExtRot", name: "Rotator Cuff External Rotation", targetSets: 2, targetReps: "15/side", custom: false },
  { id: "prehab-bandedShoulderExtRot", name: "Banded Shoulder Ext. Rotation", targetSets: 2, targetReps: "12/side", custom: false },
  { id: "prehab-hip9090", name: "90/90 Hip Switch", targetSets: 2, targetReps: "8/side", custom: false },
  { id: "prehab-thoracicRotation", name: "Thoracic Rotation", targetSets: 2, targetReps: "10/side", custom: false },
  { id: "prehab-ankleMobility", name: "Ankle Mobility Drill", targetSets: 2, targetReps: "10/side", custom: false },
  { id: "prehab-hipFlexorActivation", name: "Hip Flexor Activation", targetSets: 2, targetReps: "12/side", custom: false },
  { id: "prehab-scapularRetraction", name: "Scapular Retraction Hold", targetSets: 2, targetReps: "10s x8", custom: false },
];
function resolvePrehab(library, id) {
  return (library || []).find((p) => p.id === id) || { id, name: "(prehab removed — pick a new one)", targetSets: 2, targetReps: "—", custom: false };
}

// ---------------------------------------------------------------------------
// Plyo/Power library — the Power/Plyometrics slot is now swappable the same
// way prehab is, instead of being a fixed single exercise per day template.
// ---------------------------------------------------------------------------
const PLYO_LIBRARY_DEFAULT = [
  { id: "plyo-boxJumps", name: "Box Jumps", targetSets: 3, targetReps: "5", custom: false },
  { id: "plyo-kettlebellSwings", name: "Kettlebell Swings", targetSets: 4, targetReps: "12", custom: false },
  { id: "plyo-medBallSlams", name: "Med Ball Slams", targetSets: 3, targetReps: "8", custom: false },
  { id: "plyo-explosivePushups", name: "Explosive Push-Ups", targetSets: 3, targetReps: "5", custom: false },
  { id: "plyo-broadJumps", name: "Broad Jumps", targetSets: 3, targetReps: "5", custom: false },
  { id: "plyo-jumpSquats", name: "Jump Squats", targetSets: 3, targetReps: "8", custom: false },
  { id: "plyo-depthDrops", name: "Depth Drops", targetSets: 3, targetReps: "5", custom: false },
];
function resolvePlyo(library, id) {
  return (library || []).find((p) => p.id === id) || { id, name: "(plyo removed — pick a new one)", targetSets: 3, targetReps: "—", custom: false };
}

// ---------------------------------------------------------------------------
// Auto-adjustment — after a session, look at how each exercise actually went
// (all sets logged, reps met vs the previous target) and suggest a next-time
// weight change. Compound lift categories move in 2.5kg steps; smaller
// isolation/calf/core work moves in 1kg steps.
// ---------------------------------------------------------------------------
function incrementForCategory(category) {
  if (category === "arms" || category === "calves" || (category || "").startsWith("core")) return 1;
  return 2.5;
}
function parseTargetReps(prevText) {
  if (!prevText) return null;
  const m = String(prevText).match(/x\s*(\d+)/i);
  return m ? parseInt(m[1], 10) : null;
}
function parseTargetWeight(text) {
  if (!text) return null;
  const m = String(text).match(/^([\d.]+)\s*kg/i);
  return m ? parseFloat(m[1]) : null;
}

// ---------------------------------------------------------------------------
// Strength periodization — an 8-week repeating block for the main compound
// lifts, alternating hypertrophy accumulation (higher reps, moderate load)
// and strength (lower reps, heavier load), each capped by a deload week.
// Isolation / accessory categories (arms, calves, core-*) are deliberately
// NOT phase-periodized — they stay in a steady moderate-rep range year
// round, since cycling accessory work through strength ranges isn't
// standard practice and isn't the goal here.
// ---------------------------------------------------------------------------
const STRENGTH_CYCLE_START_DATE = "2026-08-24"; // Monday — anchors cycle week 1
const STRENGTH_CYCLE = [
  { week: 1, phase: "Hypertrophy", repRange: "8-12", repMin: 8, deload: false },
  { week: 2, phase: "Hypertrophy", repRange: "8-12", repMin: 8, deload: false },
  { week: 3, phase: "Hypertrophy", repRange: "8-12", repMin: 8, deload: false },
  { week: 4, phase: "Deload", repRange: "8-10", repMin: 8, deload: true },
  { week: 5, phase: "Strength", repRange: "4-6", repMin: 4, deload: false },
  { week: 6, phase: "Strength", repRange: "4-6", repMin: 4, deload: false },
  { week: 7, phase: "Strength", repRange: "4-6", repMin: 4, deload: false },
  { week: 8, phase: "Deload", repRange: "5-6", repMin: 5, deload: true },
];
const COMPOUND_PHASE_CATEGORIES = ["squat", "hinge", "vertPush", "vertPull", "horzPush", "horzPull", "carry"];
function computeCurrentStrengthPhase() {
  const start = new Date(STRENGTH_CYCLE_START_DATE + "T00:00:00");
  const diffDays = Math.floor((new Date() - start) / 86400000);
  const idx = (((Math.floor(diffDays / 7)) % STRENGTH_CYCLE.length) + STRENGTH_CYCLE.length) % STRENGTH_CYCLE.length;
  return STRENGTH_CYCLE[idx];
}
const CURRENT_STRENGTH_PHASE = computeCurrentStrengthPhase();
function phaseForCategory(category) {
  return COMPOUND_PHASE_CATEGORIES.includes(category) ? CURRENT_STRENGTH_PHASE : null;
}
function nextPhaseLabel(phase) {
  const idx = STRENGTH_CYCLE.indexOf(phase);
  const next = STRENGTH_CYCLE[(idx + 1) % STRENGTH_CYCLE.length];
  return next.phase.toLowerCase();
}

// Session-feedback bias — a lightweight "how did that feel?" check-in
// (Easy / Right / Too Hard) applied on top of the formula-based suggestion
// below, so progression can respond to how the session actually felt
// without needing per-set RPE logging.
function applyFeedbackBias(suggestion, category, rating) {
  if (!suggestion || !rating || rating === "right") return suggestion;
  const increment = incrementForCategory(category);
  const bump = rating === "easy" ? increment : -increment;
  const adjusted = Math.max(0, Math.round((suggestion.suggestedWeight + bump) * 100) / 100);
  const tag = rating === "easy" ? " (felt easy — nudged up a bit more)" : " (felt too hard — pulled back a bit more)";
  return { ...suggestion, suggestedWeight: adjusted, note: suggestion.note + tag };
}

function computeWeightSuggestion(ex) {
  // Warm-up ramp sets are deliberately light, so they never count toward
  // progression — only the actual work sets do.
  const workSets = ex.sets.filter((s) => !s.isWarmup);
  const loggedSets = workSets.filter((s) => s.weight !== "" && s.weight != null && s.reps !== "" && s.reps != null && !isNaN(parseFloat(s.weight)));
  if (!loggedSets.length) return null;
  const increment = incrementForCategory(ex.category);
  const phase = phaseForCategory(ex.category);
  const bestWeight = Math.max(...loggedSets.map((s) => parseFloat(s.weight)));
  const allDone = workSets.every((s) => s.done);

  // Deload sessions don't feed the normal progression logic and must not
  // overwrite the stored working-weight suggestion with the reduced deload
  // number — returning null leaves the last real suggestion untouched, so
  // the next Hypertrophy/Strength session correctly resumes at full load
  // instead of quietly restarting from ~70%.
  if (phase && phase.deload) {
    return null;
  }

  const targetReps = phase ? phase.repMin : parseTargetReps(workSets[0] && workSets[0].prev);
  const repsMissed = targetReps ? loggedSets.filter((s) => parseInt(s.reps, 10) < targetReps).length : 0;
  const repsMetOrBeat = targetReps ? loggedSets.every((s) => parseInt(s.reps, 10) >= targetReps) : allDone;
  const phaseTag = phase ? `[${phase.phase}] ` : "";

  if (allDone && repsMetOrBeat) {
    return {
      delta: increment,
      suggestedWeight: Math.round((bestWeight + increment) * 100) / 100,
      note: `${phaseTag}All sets hit ${targetReps ? targetReps + "+" : ""} reps — try +${increment}kg next time`,
    };
  }
  if (!allDone || repsMissed >= 2) {
    return {
      delta: -increment,
      suggestedWeight: Math.max(0, Math.round((bestWeight - increment) * 100) / 100),
      note: `${phaseTag}Missed reps on ${repsMissed >= 2 ? repsMissed + " sets" : "a set or two"} — hold or drop to ${Math.max(0, bestWeight - increment)}kg next time`,
    };
  }
  return {
    delta: 0,
    suggestedWeight: bestWeight,
    note: `${phaseTag}Close to target — repeat ${bestWeight}kg and aim for full reps across all sets`,
  };
}

// ---------------------------------------------------------------------------
// Smart swap — for a "not feeling it today" moment. First checks a small
// hand-picked easier-variation map for the exercise; falls back to another
// exercise in the same category that hasn't shown up in recent history, so
// the suggestion isn't just the first alphabetical match.
// ---------------------------------------------------------------------------
const EASIER_ALT_MAP = {
  "ex-backSquat": "ex-gobletSquat",
  "ex-frontSquat": "ex-gobletSquat",
  "ex-deadlift": "ex-romanianDeadlift",
  "ex-trapBarDeadlift": "ex-romanianDeadlift",
  "ex-weightedPullupNeg": "ex-bandedAssistedPullup",
  "ex-chinUp": "ex-bandedAssistedPullup",
  "ex-assistedPullupLadder": "ex-bandedAssistedPullup",
  "ex-pushPress": "ex-seatedDbShoulderPress",
  "ex-dbBenchPress": "ex-inclineDbPress",
  "ex-barbellBenchPress": "ex-dbBenchPress",
  "ex-chestSupportedRow": "ex-seatedCableRow",
};
function getSmartSwap(exerciseId, category, library, history) {
  const mappedId = EASIER_ALT_MAP[exerciseId];
  if (mappedId) {
    const mapped = library.find((e) => e.id === mappedId);
    if (mapped) return { exercise: mapped, reason: "A lighter-demand variation in the same pattern — good for a day you're not feeling 100%." };
  }
  const recentNames = new Set((history || []).slice(-3).flatMap((w) => w.exercises.map((e) => e.name)));
  const sameCategory = library.filter((e) => e.category === category && e.id !== exerciseId);
  const fresh = sameCategory.filter((e) => !recentNames.has(e.name));
  const pick = fresh[0] || sameCategory[0];
  if (!pick) return null;
  return { exercise: pick, reason: fresh.length ? "Same movement pattern, and you haven't done this one recently." : "Same movement pattern — a change of stimulus." };
}

// ---------------------------------------------------------------------------
// Day templates — organized by movement pattern per split, not body part.
// Each day keeps: warmup → prehab+core → power/plyo → main lift(s) →
// secondary lift(s) → accessories (with optional supersets) → optional core
// → finisher → cooldown. Slot "sets" encode the 4 / 3 / 2-3 convention
// (main/secondary/accessory) independent of whichever exercise fills them.
// ---------------------------------------------------------------------------
function slot(id, exerciseId, sets, extra) {
  return { slot: id, exerciseId, sets, ...(extra || {}) };
}

function prehabSlot(id, prehabId) {
  return { slot: id, prehabId };
}

const DAY_TEMPLATES_DEFAULT = {
  "2": [
    {
      id: "s2-a", label: "Day A", name: "Quad + Pull", color: COLORS.sage,
      warmup: ["wu-bike", "wu-legSwings", "wu-bwSquats"],
      prehab: [prehabSlot("p1", "prehab-gluteBridge")],
      power: { plyoId: "plyo-boxJumps" },
      mainLifts: [slot("m1", "ex-backSquat", 4), slot("m2", "ex-weightedPullupNeg", 4)],
      secondaryLifts: [slot("s1", "ex-legPress", 3), slot("s2", "ex-latPulldown", 3)],
      accessories: [slot("a1", "ex-walkingLunges", 3, { superset: "sup1" }), slot("a2", "ex-bicepCurl", 2, { superset: "sup1" }), slot("a3", "ex-hamstringCurl", 3)],
      core: [slot("c1", "ex-deadBug", 2), slot("c2", "ex-russianTwist", 2)],
      finisher: "5 min bike sprints — 30s hard / 90s easy x4",
      cooldown: ["Deep lunge stretch 30s/side (splits work)", "Lat stretch 30s/side", "Hip flexor stretch 30s/side", "Pigeon pose 45s/side"],
    },
    {
      id: "s2-b", label: "Day B", name: "Hinge + Push", color: COLORS.rust,
      warmup: ["wu-bike", "wu-shoulderDislocates", "wu-armCircles", "wu-catCow"],
      prehab: [prehabSlot("p1", "prehab-bandFacePull")],
      power: { plyoId: "plyo-medBallSlams" },
      mainLifts: [slot("m1", "ex-deadlift", 4), slot("m2", "ex-dbBenchPress", 4)],
      secondaryLifts: [slot("s1", "ex-romanianDeadlift", 3), slot("s2", "ex-inclineDbPress", 3)],
      accessories: [slot("a1", "ex-dbOverheadPress", 3, { superset: "sup1" }), slot("a2", "ex-tricepsPushdown", 2, { superset: "sup1" }), slot("a3", "ex-standingCalfRaise", 3)],
      core: [slot("c1", "ex-palloffPress", 2), slot("c2", "ex-cableCrunch", 2)],
      finisher: "5 min row intervals — 20s hard / 40s easy x6",
      cooldown: ["Doorway chest stretch 30s/side", "Hamstring stretch 30s/side", "Hip flexor stretch 30s/side", "Cross-body shoulder stretch 30s/side"],
    },
  ],
  "3": [
    {
      id: "s3-a", label: "Day 1", name: "Squat + Horizontal Push", color: COLORS.sage,
      warmup: ["wu-bike", "wu-legSwings", "wu-armCircles", "wu-bwSquats"],
      prehab: [prehabSlot("p1", "prehab-gluteBridge")],
      power: { plyoId: "plyo-boxJumps" },
      mainLifts: [slot("m1", "ex-backSquat", 4), slot("m2", "ex-dbBenchPress", 4)],
      secondaryLifts: [slot("s1", "ex-bulgarianSplitSquat", 3), slot("s2", "ex-inclineDbPress", 3)],
      accessories: [slot("a1", "ex-walkingLunges", 3, { superset: "sup1" }), slot("a2", "ex-tricepsPushdown", 2, { superset: "sup1" })],
      core: [slot("c1", "ex-palloffPress", 2)],
      finisher: "5 min bike sprints — 30s hard / 90s easy x4",
      cooldown: ["Deep lunge stretch 30s/side (splits work)", "Doorway chest stretch 30s/side", "Pigeon pose 45s/side"],
    },
    {
      id: "s3-b", label: "Day 2", name: "Hinge + Vertical Pull", color: COLORS.rust,
      warmup: ["wu-bike", "wu-legSwings", "wu-scapPullups", "wu-catCow"],
      prehab: [prehabSlot("p1", "prehab-hipFlexorActivation")],
      power: { plyoId: "plyo-kettlebellSwings" },
      mainLifts: [slot("m1", "ex-deadlift", 4), slot("m2", "ex-weightedPullupNeg", 4)],
      secondaryLifts: [slot("s1", "ex-singleLegRDL", 3), slot("s2", "ex-latPulldown", 3)],
      accessories: [slot("a1", "ex-standingCalfRaise", 3, { superset: "sup1" }), slot("a2", "ex-hammerCurl", 2, { superset: "sup1" })],
      core: [slot("c1", "ex-cableWoodchop", 2)],
      finisher: "5 min row intervals — 20s hard / 40s easy x6",
      cooldown: ["Hamstring stretch 30s/side", "Hip flexor stretch 30s/side", "Lat stretch 30s/side"],
    },
    {
      id: "s3-c", label: "Day 3", name: "Horizontal Pull + Vertical Push", color: COLORS.ochre,
      warmup: ["wu-row", "wu-bandPullAparts", "wu-armCircles", "wu-scapWallSlides"],
      prehab: [prehabSlot("p1", "prehab-rotatorCuffExtRot")],
      power: { plyoId: "plyo-explosivePushups" },
      mainLifts: [slot("m1", "ex-chestSupportedRow", 4), slot("m2", "ex-pushPress", 4)],
      secondaryLifts: [slot("s1", "ex-seatedCableRow", 3), slot("s2", "ex-dbOverheadPress", 3)],
      accessories: [slot("a1", "ex-facePull", 2, { superset: "sup1" }), slot("a2", "ex-lateralRaise", 2, { superset: "sup1" })],
      core: [slot("c1", "ex-supermanHold", 2)],
      finisher: "5 min row, cooldown pace with 3x20s pickups",
      cooldown: ["Lat stretch 30s/side", "Cross-body shoulder stretch 30s/side", "Supported child pose 45s"],
    },
  ],
  "4": [
    {
      id: "s4-a", label: "Day 1", name: "Squat", color: COLORS.sage,
      warmup: ["wu-bike", "wu-legSwings", "wu-bwSquats"],
      prehab: [prehabSlot("p1", "prehab-gluteBridge")],
      power: { plyoId: "plyo-boxJumps" },
      mainLifts: [slot("m1", "ex-backSquat", 4)],
      secondaryLifts: [slot("s1", "ex-bulgarianSplitSquat", 3), slot("s2", "ex-legPress", 3)],
      accessories: [slot("a1", "ex-walkingLunges", 3, { superset: "sup1" }), slot("a2", "ex-standingCalfRaise", 2, { superset: "sup1" })],
      core: [slot("c1", "ex-russianTwist", 2)],
      finisher: "5 min bike sprints — 30s hard / 90s easy x4",
      cooldown: ["Deep lunge stretch 30s/side (splits work)", "Hip flexor stretch 30s/side", "Pigeon pose 45s/side"],
    },
    {
      id: "s4-b", label: "Day 2", name: "Hinge", color: COLORS.rust,
      warmup: ["wu-row", "wu-legSwings", "wu-bwRDL", "wu-catCow"],
      prehab: [prehabSlot("p1", "prehab-bandFacePull")],
      power: { plyoId: "plyo-kettlebellSwings" },
      mainLifts: [slot("m1", "ex-deadlift", 4)],
      secondaryLifts: [slot("s1", "ex-romanianDeadlift", 3), slot("s2", "ex-singleLegRDL", 3)],
      accessories: [slot("a1", "ex-hamstringCurl", 3, { superset: "sup1" }), slot("a2", "ex-hipThrust", 3, { superset: "sup1" })],
      core: [slot("c1", "ex-deadBug", 2)],
      finisher: "5 min AMRAP — 10 KB swings + 10 mountain climbers/side",
      cooldown: ["Hamstring stretch 30s/side", "Hip flexor stretch 30s/side", "Pigeon pose 45s/side"],
    },
    {
      id: "s4-c", label: "Day 3", name: "Horizontal Push + Pull", color: COLORS.ochre,
      warmup: ["wu-row", "wu-armCircles", "wu-bandPullAparts", "wu-catCow"],
      prehab: [prehabSlot("p1", "prehab-rotatorCuffExtRot")],
      power: { plyoId: "plyo-explosivePushups" },
      mainLifts: [slot("m1", "ex-dbBenchPress", 4), slot("m2", "ex-chestSupportedRow", 4)],
      secondaryLifts: [slot("s1", "ex-inclineDbPress", 3), slot("s2", "ex-seatedCableRow", 3)],
      accessories: [slot("a1", "ex-tricepsPushdown", 2, { superset: "sup1" }), slot("a2", "ex-bicepCurl", 2, { superset: "sup1" })],
      core: [slot("c1", "ex-cableCrunch", 2)],
      finisher: "5 min row intervals — 20s hard / 40s easy x6",
      cooldown: ["Doorway chest stretch 30s/side", "Lat stretch 30s/side", "Cross-body shoulder stretch 30s/side"],
    },
    {
      id: "s4-d", label: "Day 4", name: "Vertical Push + Pull", color: COLORS.plum,
      warmup: ["wu-bike", "wu-shoulderDislocates", "wu-scapPullups", "wu-armCircles"],
      prehab: [prehabSlot("p1", "prehab-bandedShoulderExtRot")],
      power: { plyoId: "plyo-medBallSlams" },
      mainLifts: [slot("m1", "ex-pushPress", 4), slot("m2", "ex-weightedPullupNeg", 4)],
      secondaryLifts: [slot("s1", "ex-dbOverheadPress", 3), slot("s2", "ex-latPulldown", 3)],
      accessories: [slot("a1", "ex-lateralRaise", 2, { superset: "sup1" }), slot("a2", "ex-facePull", 2, { superset: "sup1" })],
      core: [slot("c1", "ex-birdDog", 2)],
      finisher: "5 min easy row, cooldown pace",
      cooldown: ["Lat stretch 30s/side", "Shoulder cross stretch 30s/side", "Supported child pose 45s"],
    },
  ],
};
const allDayExercises = (day) => [...day.mainLifts, ...day.secondaryLifts, ...day.accessories, ...(day.core || [])];
const KEY_LIFTS = ["Back Squat", "Deadlift", "DB Bench Press"];

// ---------------------------------------------------------------------------
// Weekly schedule — leg-dominant days always land away from Fri/Sat/Sun
// (cheerleading recovery rule), matching the original slot pattern.
// ---------------------------------------------------------------------------
// Default weekday for each day template, per split. This is the editable
// source of truth (Exercises → Edit Workouts → weekday picker) — the schedule
// builder reads it instead of guessing from day names. Defaults keep the
// cheer-recovery rule: no heavy leg day on Fri/Sat.
const DEFAULT_DAY_WEEKDAYS = {
  "2": { "s2-a": 1, "s2-b": 4 },
  "3": { "s3-b": 1, "s3-a": 3, "s3-c": 5 },
  "4": { "s4-a": 1, "s4-b": 2, "s4-c": 4, "s4-d": 5 },
};
function isLegHeavyDay(day) {
  return /squat|hinge|quad/i.test(day.name) || (day.mainLifts || []).some((s) => /squat|deadlift/i.test(s.exerciseId));
}
function buildDefaultSchedule(splitCount, days, runsPerWeek = 1, offset = 0, weekdayMap) {
  const base = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
  if (!days || !days.length) return base;
  const map = { ...(DEFAULT_DAY_WEEKDAYS[String(splitCount)] || {}), ...((weekdayMap && weekdayMap[String(splitCount)]) || {}) };
  const strengthWeekdays = [];
  days.forEach((d, i) => {
    let wd = map[d.id];
    if (wd === undefined || strengthWeekdays.includes(wd)) {
      // Safety net for a missing/duplicate assignment: first free weekday.
      wd = [1, 3, 5, 2, 4, 6, 0].find((x) => !strengthWeekdays.includes(x));
    }
    base[wd] = [{ type: "strength", dayId: d.id, time: "AM" }];
    strengthWeekdays.push(wd);
  });
  // Pure run days = whatever isn't a strength day: Saturday first (long-run
  // anchor), other weekdays next, Sunday last (cheer day).
  const rank = (d) => (d === 6 ? 0 : d === 0 ? 9 : 1);
  const freeDays = [0, 1, 2, 3, 4, 5, 6].filter((d) => !strengthWeekdays.includes(d)).sort((a, b) => rank(a) - rank(b) || a - b);
  // Peak-week doubles only on strength days that are NOT leg-heavy.
  const safeDoubles = days.filter((d) => !isLegHeavyDay(d)).map((d) => map[d.id]).filter((wd) => wd !== undefined && wd !== 5);
  const runOrder = [...freeDays, ...safeDoubles];
  const macro = computeMacroPhase(offset);
  const cap = macro.phase === "Peak" ? 5 : 3;
  const n = clamp(runsPerWeek, 1, Math.min(cap, runOrder.length));
  const runDays = runOrder.slice(0, n);
  const roleMap = assignRunRoles(runDays, n);
  runDays.forEach((day) => { base[day] = [...base[day], { type: "run", role: roleMap[day] }]; });
  return base;
}
// Assigns fixed roles to a set of weekdays once, at schedule-build time, so
// the role travels WITH the day when the person drags/swaps it elsewhere —
// rather than being recalculated from scratch by position on every render.
// Long Run lands on the latest (most weekend-adjacent) day, Quality Run takes
// the earliest (freshest legs), Easy Run fills whatever's left — including
// any 4th/5th peak-week day, which adds easy aerobic volume rather than
// another hard effort.
function assignRunRoles(weekdays, n) {
  if (n === 1) return { [weekdays[0]]: "Run" };
  // Order Monday..Sunday (Sunday = 7) so "earliest" really is the freshest-legs
  // day; Sunday is cheer day, so it never gets the Long or Quality role if any
  // other day is available.
  const ord = (d) => (d === 0 ? 7 : d);
  const sorted = [...weekdays].sort((a, b) => ord(a) - ord(b));
  const nonSun = sorted.filter((d) => d !== 0);
  const map = {};
  const longDay = sorted.includes(6) ? 6 : (nonSun.length ? nonSun[nonSun.length - 1] : sorted[sorted.length - 1]);
  map[longDay] = "Long Run";
  const remaining = sorted.filter((d) => d !== longDay);
  if (n >= 3) {
    const pool = remaining.filter((d) => d !== 0);
    const qd = pool.length ? pool[0] : remaining[0];
    map[qd] = "Quality Run";
  }
  remaining.forEach((d) => { if (!map[d]) map[d] = "Easy Run"; });
  return map;
}
function getMorningMovement(weekday, schedule, dayById, overrideTime) {
  if (weekday === 2) return { name: "Yoga Flow", time: overrideTime || "AM", context: "Weekly ritual" };
  if (weekday === 4) return { name: "Core / Ab Pilates", time: overrideTime || "AM", context: "Weekly ritual" };
  if (weekday === 6) return { name: "Full-Body Pilates", time: overrideTime || "AM", context: "Weekly ritual" };
  if (weekday === 0) return { name: "Yoga Flow", time: overrideTime || "AM", context: "Weekly ritual — stay fresh for cheer" };
  const sessions = schedule[weekday] || [];
  const strengthEntry = sessions.find((s) => s.type === "strength");
  const runEntry = sessions.find((s) => s.type === "run");
  if (strengthEntry) {
    const d = dayById[strengthEntry.dayId];
    const dName = d ? d.name : "Strength";
    const defaultTime = strengthEntry.time === "PM" ? "AM" : "PM";
    const context = strengthEntry.time === "PM" ? `Lifting later — ${dName}` : `Paired after ${dName}`;
    return { name: "Mobility Flow", time: overrideTime || defaultTime, context };
  }
  if (runEntry) return { name: "Mobility Mix (Yoga / Pilates)", time: overrideTime || "AM", context: "Standalone, run is later" };
  return { name: "Mobility Mix (Yoga / Pilates)", time: overrideTime || "AM", context: "Standalone rest-day session" };
}

// ---------------------------------------------------------------------------
// Naming — Power/Plyo is always "A". Everything after (Main, Secondary,
// Accessories, optional Core) is lettered sequentially in that order.
// Superset partners share a letter with a 1/2 suffix (e.g. F1 / F2).
// ---------------------------------------------------------------------------
const LETTERS = "BCDEFGHIJKLMNOPQRSTUVWXYZ";
function computeLetters(session) {
  let idx = 0;
  const map = {};
  session.mainLift.forEach((ex) => { map[ex.id] = LETTERS[idx]; idx++; });
  session.secondaryLifts.forEach((ex) => { map[ex.id] = LETTERS[idx]; idx++; });
  const supersetLetters = {};
  const supersetCounts = {};
  session.accessories.forEach((ex) => {
    if (ex.superset) {
      if (!supersetLetters[ex.superset]) { supersetLetters[ex.superset] = LETTERS[idx]; idx++; supersetCounts[ex.superset] = 0; }
      supersetCounts[ex.superset]++;
      map[ex.id] = `${supersetLetters[ex.superset]}${supersetCounts[ex.superset]}`;
    } else {
      map[ex.id] = LETTERS[idx]; idx++;
    }
  });
  (session.core || []).forEach((ex) => { map[ex.id] = LETTERS[idx]; idx++; });
  return map;
}
function groupBySuperset(list) {
  const groups = [];
  const map = {};
  list.forEach((ex) => {
    if (ex.superset) {
      if (!map[ex.superset]) { map[ex.superset] = { type: "superset", key: ex.superset, items: [] }; groups.push(map[ex.superset]); }
      map[ex.superset].items.push(ex);
    } else {
      groups.push({ type: "single", ex });
    }
  });
  return groups.map((g) => (g.type === "superset" && g.items.length === 1 ? { type: "single", ex: g.items[0] } : g));
}

// ---------------------------------------------------------------------------
// Half-Marathon Macrocycle — replaces the old fixed 12-week 10K block that
// just clamped/repeated forever once it ran out. Counts backward from race
// day so Taper/Peak/Build durations stay fixed even if the race date moves;
// everything earlier than that collapses into one long, repeating Base
// phase rather than needing to be hand-authored week by week for a year.
//
// Phases (counting back from race day):
//   Taper      3 weeks  — sharp volume drop, race day at the end
//   Peak       4 weeks  — long run peaks 17-19km, up to 5 runs/week allowed
//   Build      10 weeks — long run climbs 13.5-17km, quality shifts to HM pace, cutback every 4th week
//   Build Base 6 weeks  — rebuilding frequency/volume, long run 12-13.5km
//   Base       everything earlier — flexible 1-3x/week, long run 5-12km
//
// Same two-track structure as before: a "Long Run" track (this section) and
// a separate Quality Run track for speed/threshold work, with a fixed,
// low-key Easy Run filling any remaining weekly slot.
// ---------------------------------------------------------------------------
const RUNNING_PROGRAM_START_DATE = "2026-08-24"; // Monday — anchors the Base phase's own progression
const HALF_MARATHON_RACE_DATE = "2027-08-07"; // placeholder — first weekend of Aug 2027; update once a real race is booked
const HALF_MARATHON_DISTANCE = 21.1;

function computeMacroPhase(offsetWeeks = 0) {
  const race = new Date(HALF_MARATHON_RACE_DATE + "T00:00:00");
  const ref = new Date(Date.now() + offsetWeeks * 7 * 86400000);
  const wUntil = Math.ceil((race - ref) / (7 * 86400000));
  if (wUntil <= 0) return { phase: "Race Week", weekInPhase: 1, totalWeeks: 1, weeksUntilRace: Math.max(wUntil, 0) };
  if (wUntil <= 3) return { phase: "Taper", weekInPhase: 4 - wUntil, totalWeeks: 3, weeksUntilRace: wUntil };
  if (wUntil <= 7) return { phase: "Peak", weekInPhase: 8 - wUntil, totalWeeks: 4, weeksUntilRace: wUntil };
  if (wUntil <= 17) return { phase: "Build", weekInPhase: 18 - wUntil, totalWeeks: 10, weeksUntilRace: wUntil };
  if (wUntil <= 23) return { phase: "Build Base", weekInPhase: 24 - wUntil, totalWeeks: 6, weeksUntilRace: wUntil };
  const start = new Date(RUNNING_PROGRAM_START_DATE + "T00:00:00");
  const weekInPhase = Math.floor((ref - start) / (7 * 86400000)) + 1;
  return { phase: "Base", weekInPhase, totalWeeks: null, weeksUntilRace: wUntil };
}
const CURRENT_MACRO_PHASE = computeMacroPhase();
const MACRO_PHASE_ORDER = ["Base", "Build Base", "Build", "Peak", "Taper", "Race Week"];
const MACRO_PHASE_COLOR = { "Base": COLORS.sage, "Build Base": COLORS.ochre, "Build": COLORS.rust, "Peak": COLORS.plum, "Taper": COLORS.red, "Race Week": COLORS.ochre };

function longRunTargetKm(macro) {
  if (macro.phase === "Base") {
    const BASE_LENGTH = 25; // assumed length for a smooth ramp; harmless once Build Base actually starts, since the date math takes over there regardless
    const progress = clamp(macro.weekInPhase / BASE_LENGTH, 0, 1);
    return Math.round((5 + progress * (12 - 5)) * 2) / 2;
  }
  if (macro.phase === "Build Base") {
    const progress = clamp(macro.weekInPhase / macro.totalWeeks, 0, 1);
    return Math.round((12 + progress * (13.5 - 12)) * 2) / 2;
  }
  if (macro.phase === "Build") {
    const progress = clamp(macro.weekInPhase / macro.totalWeeks, 0, 1);
    let dist = 13.5 + progress * (17 - 13.5);
    if (macro.weekInPhase % 4 === 0) dist *= 0.75; // cutback week
    return Math.round(dist * 2) / 2;
  }
  if (macro.phase === "Peak") {
    const progress = clamp(macro.weekInPhase / macro.totalWeeks, 0, 1);
    return Math.round((17 + progress * (19 - 17)) * 2) / 2;
  }
  if (macro.phase === "Taper") {
    return [11, 7.5, 4][clamp(macro.weekInPhase, 1, 3) - 1];
  }
  if (macro.phase === "Race Week") return HALF_MARATHON_DISTANCE;
  return 8;
}
function longRunSessionForMacroPhase(macro) {
  const distance = longRunTargetKm(macro);
  let target = "Easy-moderate pace, stay relaxed";
  let description = "Steady aerobic builder.";
  if (macro.phase === "Build Base" || macro.phase === "Build") { target = "Easy-moderate pace, negative-split the last few km if it feels good"; description = "Building toward half-marathon distance."; }
  if (macro.phase === "Peak") { target = "Easy pace, last 20-30 min at goal half-marathon pace"; description = "Peak long run — practice race-day fueling and pacing."; }
  if (macro.phase === "Taper") { target = "Easy, short and relaxed — the work is done"; description = "Taper — protect freshness for race day."; }
  if (macro.phase === "Race Week") { target = "Race pace or easy — your call"; description = "Race day — 21.1km!"; }
  return { type: macro.phase === "Race Week" ? "Race" : "Long Run", color: COLORS.ochre, distance, target, description };
}
function qualitySessionForMacroPhase(macro) {
  if (macro.phase === "Base") return { type: "Interval Run", target: "6 x 400m @ 5K effort, 90s jog rest", distance: 5 };
  if (macro.phase === "Build Base") return { type: "Tempo Run", target: "20 min @ comfortably hard", distance: 5.5 };
  if (macro.phase === "Build") return { type: "Tempo Run", target: "25-30 min @ half-marathon effort", distance: 7 };
  if (macro.phase === "Peak") return { type: "Tempo Run", target: "35-40 min @ half-marathon goal pace", distance: 8 };
  if (macro.phase === "Taper") return { type: "Tempo Run", target: "15 min @ half-marathon pace — stay sharp, not tired", distance: 4 };
  return { type: "Recovery Run", target: "Easy shakeout, short strides", distance: 3 };
}
function easyRunForMacroPhase(macro, longRunDist) {
  const distance = clamp(Math.round(longRunDist * 0.4 * 2) / 2, 3, 6);
  return { type: "Recovery Run", color: COLORS.sage, distance, target: "Easy, conversational pace", description: "Supporting mileage — keep effort relaxed and low-impact." };
}
const RUN_TYPES = ["Recovery Run", "Long Run", "Interval Run", "Tempo Run"];
const RUN_TYPE_COLOR = { "Recovery Run": COLORS.sage, "Long Run": COLORS.ochre, "Interval Run": COLORS.rust, "Tempo Run": COLORS.plum, "Race": COLORS.ochre };

// Pacing narration + tool suggestions, tailored to the session's type rather
// than a generic "warm up and go". Falls back to the Recovery Run guidance
// for any type not explicitly covered (e.g. a manually logged run).
const PACING_STRATEGY = {
  "Interval Run": {
    strategy: "Run each rep at 5K effort — hard and controlled, not an all-out sprint. Aim for even splits across all reps rather than fading; if the last two reps slow down noticeably, that's useful data for adjusting next time. Recover fully during the jog between reps — it's part of the workout, not a punishment.",
    tools: ["An interval timer (phone stopwatch, or a free app like Seconds) so you're not eyeballing rest periods mid-effort.", "A GPS watch or running app to confirm your distance markers if you're not on a track."],
  },
  "Tempo Run": {
    strategy: "Settle into 'comfortably hard' — you should be able to speak in short phrases, not full sentences. An even effort start to finish is more useful than a fast first half that fades. Resist checking your pace every 30 seconds; let effort guide you instead.",
    tools: ["A running watch with a lap or pace alert helps you hold steady effort without constantly checking your wrist."],
  },
  "Long Run": {
    strategy: "Start conservatively — the first kilometer should feel almost too easy. If you have the legs for it, aim to run the second half slightly faster than the first rather than fading late.",
    tools: ["A hydration option (belt, vest, or a planned water stop) for anything over ~7–8km.", "A GPS watch or running app to track distance if you're not on a familiar route."],
  },
  "Race": {
    strategy: "Trust the training — settle into goal pace within the first 2km and hold it. A slightly negative split (second half faster than the first) beats going out hot and fading.",
    tools: ["Race-day fueling plan rehearsed during Peak-phase long runs.", "A GPS watch to check pace at each km marker without obsessing over it."],
  },
  "Recovery Run": {
    strategy: "Pace genuinely doesn't matter here — if you're checking your watch, you're taking this too seriously. Relaxed form, easy nasal breathing if you can manage it, and stopping to walk is completely fine.",
    tools: ["Nothing special needed — that's the point of a recovery run."],
  },
  "Easy Strides": {
    strategy: "Keep the base minutes conversational, then treat the strides as a light gear-shift, not a sprint — accelerate smoothly to about 85–90% effort, then ease back down just as smoothly.",
    tools: ["A flat, open stretch of path or grass for the strides — you want room to accelerate without weaving around people."],
  },
};
function pacingStrategyFor(type) {
  return PACING_STRATEGY[type] || PACING_STRATEGY["Recovery Run"];
}

// Builds this week's actual run session(s) with fixed roles:
// 1x = the Long Run track's session as-is.
// 2x = Long Run + Easy Run.
// 3x+ = Long Run + Quality Run (dedicated speed/threshold) + Easy Run(s) —
// extra frequency during Peak weeks adds easy aerobic volume, not more hard
// efforts, since stacking intensity that close to race day isn't the point.
function buildWeekRunSessions(macro, runsPerWeek) {
  const cap = macro.phase === "Peak" ? 5 : 3;
  const n = clamp(runsPerWeek, 1, cap);
  const main = longRunSessionForMacroPhase(macro);
  if (n === 1) {
    return [{ ...main, role: "Run", warmup: "10–15 min easy jog, building gradually into pace", cooldown: "5 min walk + calf and hamstring stretch" }];
  }
  const sessions = [{ ...main, role: "Long Run", warmup: "10–15 min easy jog, building gradually into pace", cooldown: "5 min walk + calf and hamstring stretch" }];
  const easy = easyRunForMacroPhase(macro, main.distance);
  if (n === 2) {
    sessions.push({ ...easy, role: "Easy Run", warmup: "5 min brisk walk into an easy jog", cooldown: "5 min walk + hip flexor stretch" });
  } else {
    const quality = qualitySessionForMacroPhase(macro);
    sessions.push({ type: quality.type, color: COLORS.rust, distance: quality.distance, target: quality.target, description: "Dedicated speed/threshold work, separate from this week's Long Run.", role: "Quality Run", warmup: "10–15 min easy jog + 4 x 20s strides", cooldown: "5–10 min easy jog + full-body stretch" });
    sessions.push({ ...easy, role: "Easy Run", warmup: "5 min brisk walk into an easy jog", cooldown: "5 min walk + hip flexor stretch" });
  }
  return sessions;
}
// Maps this week's built sessions onto weekdays using each day's STORED role
// (set once in buildDefaultSchedule, and carried along whenever the person
// drags/swaps a run day elsewhere) — so reordering run days in the Overview
// tab genuinely swaps which one is the Long Run vs Quality Run, instead of
// the role just snapping back based on weekday position. Any weekday beyond
// the 3 distinct session types (a Peak-week 4th/5th run day) shares the
// Easy Run role — extra frequency, not extra intensity.
function weekRunAssignments(schedule, macro) {
  const runWeekdays = Object.keys(schedule).map(Number).filter((wd) => (schedule[wd] || []).some((s) => s.type === "run"));
  if (!runWeekdays.length) return {};
  const n = runWeekdays.length;
  const sessions = buildWeekRunSessions(macro, n);
  const byRole = {};
  sessions.forEach((s) => { byRole[s.role] = s; });
  const fallbackRoles = assignRunRoles(runWeekdays, n);
  const map = {};
  runWeekdays.forEach((wd) => {
    const runEntry = (schedule[wd] || []).find((s) => s.type === "run");
    const role = (runEntry && runEntry.role) || fallbackRoles[wd];
    map[wd] = byRole[role] || byRole["Easy Run"] || sessions[0];
  });
  return map;
}

// ---------------------------------------------------------------------------
// Weekly meal plan — vegan, GF-leaning, €50/week, built around tofu, tempeh,
// lentils, chickpeas, protein powder, edamame. ~2,250–2,350 kcal / ~105g
// protein per day (~2g/kg) to support strength + running + daily mobility.
// ---------------------------------------------------------------------------
const DAILY_TARGET = { kcal: 2300, kcalRange: "2,250–2,350", protein: 105, proteinNote: "≈2g/kg bodyweight" };
// Scales the flat daily target by what's actually on the calendar that day
// — a rest day, a lifting day, a run day (sized by distance), or a peak-week
// double session — instead of the same fixed number every day regardless of
// load. Portions themselves aren't auto-scaled (that would mean rewriting
// each recipe's ingredient amounts); this adjusts the target and leaves it
// to you to add a portion/snack to close the gap on higher-demand days.
function nutritionLoadForDay(sessions, runSession) {
  const hasStrength = (sessions || []).some((s) => s.type === "strength");
  const hasRun = (sessions || []).some((s) => s.type === "run");
  if (hasStrength && hasRun) return { kcalAdjust: 400, note: "Double session day (lift + run) — extra fuel needed, add a portion or two." };
  if (hasStrength) return { kcalAdjust: 150, note: "Lifting day — slightly higher target." };
  if (hasRun) {
    const dist = runSession ? runSession.distance : 5;
    return { kcalAdjust: Math.round(dist * 30), note: `Run day (${dist}km) — target scaled for mileage.` };
  }
  return { kcalAdjust: -100, note: "Rest day — baseline target, no extra needed." };
}
const MEAL_PLAN = [
  {
    day: "Monday", note: "Lifting day",
    meals: [
      { type: "Breakfast", name: "Peanut Butter Protein Oats", desc: "GF oats + soy milk, cooked, stirred with 1 scoop protein powder, sliced banana, 1 tbsp peanut butter", kcal: 540, protein: 27 },
      { type: "Lunch", name: "Lentil & Rice Buddha Bowl", desc: "Cooked lentils + rice, roasted frozen veg, tahini-lemon drizzle", kcal: 640, protein: 26 },
      { type: "Snack", name: "Edamame + GF Crackers", desc: "Steamed edamame in pods with a little salt, side of GF crackers", kcal: 270, protein: 17 },
      { type: "Dinner", name: "Tofu & Rice Noodle Stir-Fry", desc: "Pan-fried firm tofu, rice noodles, frozen stir-fry veg, tamari + garlic", kcal: 710, protein: 33 },
    ],
  },
  {
    day: "Tuesday", note: "Mobility only",
    meals: [
      { type: "Breakfast", name: "Turmeric Tofu Scramble", desc: "Crumbled firm tofu, turmeric, nutritional yeast, spinach, with GF toast + avocado", kcal: 560, protein: 24 },
      { type: "Lunch", name: "Chickpea Salad Wrap", desc: "Mashed chickpeas + hummus + veg in a GF tortilla", kcal: 610, protein: 22 },
      { type: "Snack", name: "Protein Smoothie", desc: "Protein powder, banana, soy milk, 1 tsp peanut butter, ice", kcal: 340, protein: 25 },
      { type: "Dinner", name: "Tempeh & Sweet Potato Tray Bake", desc: "Cubed tempeh + sweet potato roasted, served over greens with tahini", kcal: 730, protein: 33 },
    ],
  },
  {
    day: "Wednesday", note: "Run day",
    meals: [
      { type: "Breakfast", name: "Chia Protein Pudding", desc: "Chia seeds soaked in soy milk overnight, protein powder stirred in, berries + peanut butter on top", kcal: 520, protein: 24 },
      { type: "Lunch", name: "Red Lentil Soup + GF Bread", desc: "Lentils, carrot, onion, cumin, simmered; side of GF bread", kcal: 590, protein: 24 },
      { type: "Snack", name: "Roasted Chickpeas + Edamame", desc: "Oven-roasted chickpeas (batch-cooked) mixed with steamed edamame", kcal: 310, protein: 20 },
      { type: "Dinner", name: "Chickpea & Spinach Curry", desc: "Chickpeas, spinach, canned tomato, coconut milk, curry spices, over rice", kcal: 750, protein: 28 },
    ],
  },
  {
    day: "Thursday", note: "Lifting day",
    meals: [
      { type: "Breakfast", name: "Cocoa Protein Overnight Oats", desc: "GF oats + soy milk soaked overnight, cocoa powder, protein powder, banana", kcal: 550, protein: 27 },
      { type: "Lunch", name: "Tempeh & Rice Stir-Fry Bowl", desc: "Crumbled tempeh, rice, frozen veg, soy-ginger sauce", kcal: 660, protein: 30 },
      { type: "Snack", name: "Hummus, GF Crackers & Carrots", desc: "Store-bought or blended chickpea hummus with veg sticks", kcal: 290, protein: 13 },
      { type: "Dinner", name: "Lentil Bolognese over GF Pasta", desc: "Lentils simmered in canned tomato + herbs, tossed with GF pasta", kcal: 720, protein: 30 },
    ],
  },
  {
    day: "Friday", note: "Lifting day — light legs",
    meals: [
      { type: "Breakfast", name: "Tofu Scramble Burrito", desc: "Turmeric tofu scramble, black beans, salsa in a GF tortilla", kcal: 570, protein: 26 },
      { type: "Lunch", name: "Chickpea & Quinoa Salad", desc: "Chickpeas, quinoa, cucumber, tomato, lemon-olive oil dressing", kcal: 620, protein: 24 },
      { type: "Snack", name: "Protein Smoothie", desc: "Protein powder, frozen berries, soy milk", kcal: 320, protein: 25 },
      { type: "Dinner", name: "Tofu & Chickpea Tray Bake", desc: "Cubed tofu, chickpeas, potatoes, roasted with paprika, side salad", kcal: 730, protein: 32 },
    ],
  },
  {
    day: "Saturday", note: "Lifting day — light legs",
    meals: [
      { type: "Breakfast", name: "Peanut Butter Protein Pancakes", desc: "GF oat-flour pancakes blended with banana + protein powder, PB drizzle", kcal: 560, protein: 26 },
      { type: "Lunch", name: "Lentil & Rice Bowl (Leftovers)", desc: "Batch-cooked lentils + rice from earlier in the week, fresh veg added", kcal: 640, protein: 26 },
      { type: "Snack", name: "Edamame + Rice Cakes", desc: "Steamed edamame, 2 GF rice cakes", kcal: 270, protein: 17 },
      { type: "Dinner", name: "Tempeh Tacos", desc: "Crumbled tempeh seasoned taco-style, black beans, salsa, GF corn tortillas", kcal: 720, protein: 31 },
    ],
  },
  {
    day: "Sunday", note: "Cheerleading — keep it light & easy",
    meals: [
      { type: "Breakfast", name: "Protein Smoothie Bowl", desc: "Protein powder + banana + soy milk blended, topped with GF granola", kcal: 540, protein: 26 },
      { type: "Lunch", name: "Chickpea Salad Sandwich", desc: "Mashed chickpeas, vegan mayo, celery, on GF bread", kcal: 600, protein: 22 },
      { type: "Snack", name: "Trail Mix", desc: "Peanuts, pumpkin seeds, dried fruit — small handful", kcal: 300, protein: 10 },
      { type: "Dinner", name: "Quick Tofu & Veg Rice Bowl", desc: "Pre-cooked tofu + steamed frozen veg + rice, simple soy-sesame sauce — minimal effort", kcal: 680, protein: 30 },
    ],
  },
];
const GROCERY_LIST = [
  { category: "Protein staples", items: "Firm tofu, tempeh, dry/canned lentils, canned chickpeas, frozen edamame, protein powder (on hand)", est: "€18" },
  { category: "Grains & GF starches", items: "GF oats, rice, GF pasta, GF bread, GF tortillas, rice cakes", est: "€10" },
  { category: "Produce", items: "Bananas, spinach, carrots, sweet potato, potatoes, frozen stir-fry veg, avocado", est: "€12" },
  { category: "Pantry & flavor", items: "Peanut butter, tahini, soy milk, nutritional yeast, tamari, canned tomatoes, spices", est: "€10" },
];
const USUAL_BREAKFAST_DEFAULT = {
  name: "Peanut Butter Protein Oats",
  ingredients: ["60g GF oats", "250ml soy milk", "1 scoop protein powder", "1 banana", "1 tbsp peanut butter"],
  kcal: 540, protein: 27,
};

// ---------------------------------------------------------------------------
// Date helper used by the leftover-lunch logic below
// ---------------------------------------------------------------------------
function addDaysIso(iso, n) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return todayISO(d);
}

// ---------------------------------------------------------------------------
// Mobility blueprints — inspired by structured, loaded end-range training
// (assess → prep → end-range strength → PNF/passive → measure), one routine
// per goal so each stretch can be tapped complete like a workout set.
// ---------------------------------------------------------------------------
const MOBILITY_CATALOG = ["90/90 hip switches x8/side", "Worldwide stretch x6/side", "Ankle circles x10/side", "Thoracic windmills x8/side", "Hip CARs x5/side", "Cossack squat x8/side", "Scapular wall slides x10", "Inchworm to cobra x8"];
const STRETCH_CATALOG = ["Figure-4 glute stretch 30s/side", "Seated forward fold 45s", "Butterfly stretch 45s", "Standing quad stretch 30s/side", "Frog stretch 45s", "Wall calf stretch 30s/side", "Thread-the-needle 30s/side", "Cobra stretch 30s"];
const FLEX_PLAN = [
  {
    id: "splitL", name: "Front Split Blueprint — Left", metric: "Front Split (L)", color: COLORS.plum,
    warmup: ["5 min light cardio to raise tissue temperature", "Leg swings x15/side", "90/90 hip switches x8/side", "Walking lunge to hamstring reach x8"],
    strength: [
      { name: "Loaded Half-Split Isometric Hold (L front)", targetSets: 3, targetReps: "20s, light DB on front thigh" },
      { name: "Elevated Hip Flexor Lunge — Active Squeeze (L)", targetSets: 3, targetReps: "8 reps, 3s squeeze" },
    ],
    pnf: [
      { name: "PNF Hamstring Contract-Relax (L front leg)", targetSets: 3, targetReps: "6s contract / 20s relax" },
      { name: "Couch Stretch — Hip Flexor (L rear leg)", targetSets: 2, targetReps: "45s" },
    ],
    cooldown: ["Front split hold attempt, hands supported 40s", "Pigeon pose (L) 45s", "Deep breathing in end position x10 breaths"],
  },
  {
    id: "splitR", name: "Front Split Blueprint — Right", metric: "Front Split (R)", color: COLORS.rust,
    warmup: ["5 min light cardio to raise tissue temperature", "Leg swings x15/side", "90/90 hip switches x8/side", "Walking lunge to hamstring reach x8"],
    strength: [
      { name: "Loaded Half-Split Isometric Hold (R front)", targetSets: 3, targetReps: "20s, light DB on front thigh" },
      { name: "Elevated Hip Flexor Lunge — Active Squeeze (R)", targetSets: 3, targetReps: "8 reps, 3s squeeze" },
    ],
    pnf: [
      { name: "PNF Hamstring Contract-Relax (R front leg)", targetSets: 3, targetReps: "6s contract / 20s relax" },
      { name: "Couch Stretch — Hip Flexor (R rear leg)", targetSets: 2, targetReps: "45s" },
    ],
    cooldown: ["Front split hold attempt, hands supported 40s", "Pigeon pose (R) 45s", "Deep breathing in end position x10 breaths"],
  },
  {
    id: "pancake", name: "Pancake Blueprint", metric: "Pancake Fold", color: COLORS.sage,
    warmup: ["5 min light cardio", "Cat-cow x10", "Seated butterfly pulses x15", "Hip circles x10/side"],
    strength: [
      { name: "Loaded Pancake Fold Hold (DB on back)", targetSets: 3, targetReps: "20s hold" },
      { name: "Standing Pike Fold — Active Compression", targetSets: 3, targetReps: "8 reps, 3s hold at bottom" },
    ],
    pnf: [
      { name: "PNF Adductor Contract-Relax", targetSets: 3, targetReps: "6s contract / 20s relax" },
      { name: "Frog Stretch", targetSets: 2, targetReps: "45s" },
    ],
    cooldown: ["Pancake fold, reach for feet 45s", "Butterfly stretch 45s", "Deep breathing in end position x10 breaths"],
  },
];

// ---------------------------------------------------------------------------
// Mobility-in-strength-day — folds the relevant Flexibility Blueprint(s)
// straight into a strength session: front splits (both sides) ride along on
// squat day, pancake rides along on hinge day, so the flexibility work
// actually gets done instead of competing with it for a separate slot in
// the week. Matched by day name, same pattern as the weekday pinning above.
// ---------------------------------------------------------------------------
function relevantMobilityForDay(day) {
  const mains = day.mainLifts || [];
  const hasSquatMain = /squat/i.test(day.name) || mains.some((s) => /squat/i.test(s.exerciseId));
  const hasHingeMain = /hinge/i.test(day.name) || mains.some((s) => /deadlift/i.test(s.exerciseId));
  if (hasSquatMain) return [FLEX_PLAN.find((b) => b.id === "splitL"), FLEX_PLAN.find((b) => b.id === "splitR")].filter(Boolean);
  if (hasHingeMain) return [FLEX_PLAN.find((b) => b.id === "pancake")].filter(Boolean);
  return [];
}
function buildMobilitySession(bp) {
  return {
    ...bp,
    measurement: "",
    strength: bp.strength.map((e) => ({ ...e, completed: Array(e.targetSets).fill(false) })),
    pnf: bp.pnf.map((e) => ({ ...e, completed: Array(e.targetSets).fill(false) })),
  };
}

// ---------------------------------------------------------------------------
// Desk Movement Snacks — 4 checkable stretch/mobility moves for the work day,
// rotating daily so it's not the same routine every time (index 0 = Sunday
// .. 6 = Saturday, matching Date.getDay()).
// ---------------------------------------------------------------------------
const DESK_SNACKS = [
  { day: "Sunday", exercises: [
    { name: "Neck Rolls", detail: "8 slow reps each direction" },
    { name: "Seated Forward Reach", detail: "30s hold" },
    { name: "Ankle Circles", detail: "10 each direction, each foot" },
    { name: "Shoulder Blade Squeezes", detail: "15 reps" },
  ]},
  { day: "Monday", exercises: [
    { name: "Seated Spinal Twist", detail: "30s hold, each side" },
    { name: "Shoulder Rolls", detail: "10 reps each direction" },
    { name: "Seated Figure-4 Stretch", detail: "30s hold, each side" },
    { name: "Standing Calf Raises", detail: "15 reps" },
  ]},
  { day: "Tuesday", exercises: [
    { name: "Neck Side Stretch", detail: "20s hold, each side" },
    { name: "Seated Cat-Cow", detail: "8 reps" },
    { name: "Wrist & Forearm Stretch", detail: "20s hold, each side" },
    { name: "Chair Squats (stand-sit)", detail: "12 reps" },
  ]},
  { day: "Wednesday", exercises: [
    { name: "Doorway Chest Opener", detail: "30s hold" },
    { name: "Seated Hip Flexor Stretch", detail: "30s hold, each side" },
    { name: "Incline Desk Push-Ups", detail: "10 reps" },
    { name: "Ankle Circles", detail: "10 each direction, each foot" },
  ]},
  { day: "Thursday", exercises: [
    { name: "Thoracic Extension Over Chair Back", detail: "8 reps" },
    { name: "Seated Hamstring Stretch", detail: "30s hold, each leg" },
    { name: "Scapular Squeezes", detail: "15 reps" },
    { name: "Standing Side Bend", detail: "20s hold, each side" },
  ]},
  { day: "Friday", exercises: [
    { name: "Standing Torso Rotations", detail: "10 reps each side" },
    { name: "Seated Glute Squeeze", detail: "15 reps, 3s hold" },
    { name: "Overhead Reach & Stretch", detail: "20s hold, each side" },
    { name: "March in Place", detail: "30s" },
  ]},
  { day: "Saturday", exercises: [
    { name: "Wall Angels", detail: "10 reps" },
    { name: "Seated Twist & Reach", detail: "30s hold, each side" },
    { name: "Calf Stretch at Desk", detail: "20s hold, each side" },
    { name: "Deep Breathing + Shoulder Reset", detail: "5 slow breaths" },
  ]},
];

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------
const SEED_HISTORY = [
  { id: "h1", dayId: "s4-a", name: "Squat", color: COLORS.sage, date: "2026-07-21", duration: 58, totalSets: 18, exercises: [{ name: "Back Squat", isPR: true }, { name: "Bulgarian Split Squat", isPR: false }, { name: "Leg Press", isPR: false }, { name: "Walking Lunges", isPR: false }, { name: "Standing Calf Raise", isPR: false }] },
  { id: "h2", dayId: "s4-c", name: "Horizontal Push + Pull", color: COLORS.ochre, date: "2026-07-22", duration: 50, totalSets: 20, exercises: [{ name: "DB Bench Press", isPR: false }, { name: "Chest-Supported Row", isPR: false }, { name: "Incline DB Press", isPR: false }, { name: "Seated Cable Row", isPR: false }, { name: "Triceps Pushdown", isPR: false }, { name: "Bicep Curl", isPR: false }] },
  { id: "h3", dayId: "s4-b", name: "Hinge", color: COLORS.rust, date: "2026-07-23", duration: 52, totalSets: 16, exercises: [{ name: "Deadlift", isPR: true }, { name: "Romanian Deadlift", isPR: false }, { name: "Single-Leg RDL", isPR: false }, { name: "Hamstring Curl", isPR: false }, { name: "Hip Thrust", isPR: false }] },
  { id: "h4", dayId: "s4-d", name: "Vertical Push + Pull", color: COLORS.plum, date: "2026-07-24", duration: 45, totalSets: 18, exercises: [{ name: "Push Press", isPR: false }, { name: "Weighted Pull-Up Negative", isPR: false }, { name: "DB Overhead Press", isPR: false }, { name: "Lat Pulldown", isPR: false }, { name: "Lateral Raise", isPR: false }, { name: "Face Pull", isPR: false }] },
  { id: "h5", dayId: "s4-a", name: "Squat", color: COLORS.sage, date: "2026-07-28", duration: 55, totalSets: 18, exercises: [{ name: "Back Squat", isPR: true }, { name: "Bulgarian Split Squat", isPR: false }, { name: "Leg Press", isPR: false }, { name: "Walking Lunges", isPR: false }, { name: "Standing Calf Raise", isPR: false }] },
];
const SEED_PRS = { "Back Squat": { weight: 52.5, reps: 5, date: "2026-07-28" }, Deadlift: { weight: 60, reps: 5, date: "2026-07-23" }, "DB Bench Press": { weight: 18, reps: 8, date: "2026-07-22" } };
const SEED_TRENDS = { "Back Squat": [42.5, 45, 47.5, 50, 52.5], Deadlift: [50, 52.5, 55, 57.5, 60], "DB Bench Press": [12, 14, 14, 16, 18] };
const VOLUME_BY_MUSCLE = [{ muscle: "Legs", volume: 4550 }, { muscle: "Back", volume: 3200 }, { muscle: "Chest", volume: 1440 }, { muscle: "Shoulders", volume: 1320 }, { muscle: "Arms", volume: 720 }];
const SEED_RUNS = [
  { id: "r1", date: "2026-07-15", distance: 5.0, duration: 34.5, type: "Recovery Run" },
  { id: "r2", date: "2026-07-22", distance: 5.0, duration: 33.75, type: "Recovery Run" },
  { id: "r3", date: "2026-07-29", distance: 5.5, duration: 36.7, type: "Long Run" },
];
const SEED_FLEX_TRENDS = { "Front Split (L)": [18, 15, 13, 11, 9], "Front Split (R)": [20, 17, 14, 12, 10], "Pancake Fold": [25, 22, 19, 16, 13] };

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------
async function loadState(key) {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}
async function saveState(key, value) {
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
}

// ---------------------------------------------------------------------------
// Shared UI
// ---------------------------------------------------------------------------
function StatBox({ label, value, icon: Icon, accent }) {
  return (
    <div className="flex-1 rounded-2xl p-4 flex flex-col gap-1" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{label}</span>
        <Icon size={14} style={{ color: accent }} />
      </div>
      <span className="text-4xl font-bold leading-none" style={{ color: COLORS.ink, fontFamily: "Oswald, sans-serif" }}>{value}</span>
      <div className="h-1 w-8 rounded-full mt-1" style={{ background: accent }} />
    </div>
  );
}
function Pill({ children, color }) {
  return <span className="text-[11px] px-2 py-1 rounded-full font-semibold whitespace-nowrap" style={{ background: color ? `${color}1A` : COLORS.bg, color: color || COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{children}</span>;
}
function Sparkline({ data, color }) {
  const w = 150, h = 44;
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
  const pts = data.map((v, i) => { const x = (i / (data.length - 1)) * (w - 8) + 4; const y = h - 6 - ((v - min) / range) * (h - 12); return `${x},${y}`; }).join(" ");
  const lastY = h - 6 - ((data[data.length - 1] - min) / range) * (h - 12);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={w - 4} cy={lastY} r="3.5" fill={color} />
    </svg>
  );
}
function Segmented({ options, value, onChange, color }) {
  return (
    <div className="flex rounded-xl p-1 gap-1" style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}` }}>
      {options.map((opt) => (
        <button key={opt.value} onClick={() => onChange(opt.value)} className="flex-1 rounded-lg py-1.5 text-xs font-bold" style={{ background: value === opt.value ? color : "transparent", color: value === opt.value ? "#fff" : COLORS.muted, fontFamily: "Poppins, sans-serif" }}>
          {opt.label}
        </button>
      ))}
    </div>
  );
}
function SectionLabel({ children, color }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="w-1 h-4 rounded-full" style={{ background: color }} />
      <span className="text-[11px] uppercase tracking-widest font-bold" style={{ color, fontFamily: "Poppins, sans-serif" }}>{children}</span>
    </div>
  );
}
function CollapsibleCard({ title, color, subtitle, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between" style={{ marginBottom: open ? "8px" : 0 }}>
        <div className="flex items-center gap-2">
          <SectionLabelInline color={color}>{title}</SectionLabelInline>
          {subtitle && <span className="text-[10px]" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{subtitle}</span>}
        </div>
        {open ? <ChevronUp size={15} style={{ color: COLORS.muted }} /> : <ChevronDown size={15} style={{ color: COLORS.muted }} />}
      </button>
      {open && children}
    </div>
  );
}
function SectionLabelInline({ children, color }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-1 h-4 rounded-full" style={{ background: color }} />
      <span className="text-[11px] uppercase tracking-widest font-bold" style={{ color, fontFamily: "Poppins, sans-serif" }}>{children}</span>
    </div>
  );
}
function EditableChecklist({ items, doneMap, onToggle, onRemove, onAdd, catalog }) {
  const [showAdd, setShowAdd] = useState(false);
  const available = catalog.filter((c) => !items.includes(c));
  return (
    <div className="flex flex-col gap-2">
      {items.map((item, i) => {
        const done = !!doneMap[i];
        return (
          <div key={i} className="flex items-center gap-2">
            <button onClick={() => onToggle(i)} className="flex-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors" style={{ background: done ? `${COLORS.green}1A` : COLORS.bg, border: `1px solid ${done ? COLORS.green : COLORS.border}` }}>
              <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: done ? COLORS.green : "#fff", border: `1.5px solid ${done ? COLORS.green : COLORS.border}` }}>{done && <Check size={12} color="#fff" />}</div>
              <span className="text-sm" style={{ color: done ? COLORS.green : COLORS.ink, fontFamily: "Poppins, sans-serif", textDecoration: done ? "line-through" : "none" }}>{item}</span>
            </button>
            <button onClick={() => onRemove(i)} className="p-1 shrink-0" style={{ color: COLORS.muted, opacity: 0.6 }}><X size={13} /></button>
          </div>
        );
      })}
      <button onClick={() => setShowAdd((s) => !s)} className="text-xs font-medium self-start mt-0.5" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{showAdd ? "Cancel" : "+ Add"}</button>
      {showAdd && (
        <div className="flex flex-col gap-1.5 rounded-xl p-2 mt-1" style={{ background: COLORS.bg }}>
          {available.map((c) => (<button key={c} onClick={() => { onAdd(c); setShowAdd(false); }} className="text-left text-xs px-2 py-1.5 rounded-lg" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif", background: "#fff" }}>{c}</button>))}
        </div>
      )}
    </div>
  );
}
function MiniExerciseBlock({ ex, letter, onTapSet }) {
  return (
    <div className="rounded-xl p-3" style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}` }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>{letter ? `${letter} — ` : ""}{ex.name}</span>
        <span className="text-xs" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{ex.targetSets} x {ex.targetReps}</span>
      </div>
      <div className="flex gap-2 flex-wrap">
        {Array.from({ length: ex.targetSets }).map((_, i) => {
          const done = !!ex.completed[i];
          return (<button key={i} onClick={() => onTapSet(i)} className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs" style={{ background: done ? COLORS.green : "#fff", color: done ? "#fff" : COLORS.muted, border: `1.5px solid ${done ? COLORS.green : COLORS.border}`, fontFamily: "Oswald, sans-serif" }}>{i + 1}</button>);
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exercise card — full weight/reps grid, per-set delete, whole-exercise
// delete-with-confirm, and a swap picker sourced from the shared library.
// ---------------------------------------------------------------------------
function ExerciseCard({ ex, color, letter, library, history, onChangeSet, onToggleDone, onToggleAll, onAddSet, onRemoveSet, onRemove, onSwap }) {
  const [showSwap, setShowSwap] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [smartSuggestion, setSmartSuggestion] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const allDone = ex.sets.length > 0 && ex.sets.every((s) => s.done);
  const sameCategory = library.filter((l) => l.category === ex.category && l.id !== ex.exerciseId);
  const otherCategory = library.filter((l) => l.category !== ex.category);
  const swapList = showAll ? [...sameCategory, ...otherCategory] : sameCategory;
  const catLabel = CATEGORY_META[ex.category]?.label || "";

  const tryNotFeelingIt = () => {
    setShowSwap(false);
    setSmartSuggestion(getSmartSwap(ex.exerciseId, ex.category, library, history));
  };
  const handleToggleAll = () => {
    onToggleAll();
    setCollapsed(!allDone);
  };

  if (collapsed && allDone) {
    const workOnly = ex.sets.filter((x) => !x.isWarmup);
    const summaryWeight = (workOnly[0] && workOnly[0].weight) || "—";
    return (
      <button onClick={() => setCollapsed(false)} className="w-full rounded-2xl p-3.5 flex items-center gap-3 text-left" style={{ background: `${COLORS.green}1A`, border: `1px solid ${COLORS.green}` }}>
        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: COLORS.green }}><Check size={15} color="#fff" /></div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-bold truncate block" style={{ color: COLORS.ink, fontFamily: "Oswald, sans-serif" }}>{letter ? `${letter} — ` : ""}{ex.name}</span>
          <span className="text-[11px]" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{workOnly.length} sets done{summaryWeight !== "—" ? ` · ${summaryWeight}kg` : ""}</span>
        </div>
        <ChevronDown size={15} style={{ color: COLORS.muted }} />
      </button>
    );
  }

  return (
    <div className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
      <div className="flex items-start justify-between mb-1 gap-2">
        <div>
          <span className="text-base font-bold" style={{ color: COLORS.ink, fontFamily: "Oswald, sans-serif" }}>{letter ? `${letter} — ` : ""}{ex.name}</span>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <Pill color={color}>{ex.muscle}</Pill>
            {catLabel && <span className="text-[10px] uppercase tracking-wide" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{catLabel}</span>}
          </div>
          {ex.suggestion && (
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp size={11} style={{ color: ex.suggestion.delta > 0 ? COLORS.sage : ex.suggestion.delta < 0 ? COLORS.red : COLORS.muted }} />
              <span className="text-[11px]" style={{ color: ex.suggestion.delta > 0 ? COLORS.sage : ex.suggestion.delta < 0 ? COLORS.red : COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{ex.suggestion.note}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={handleToggleAll} title="Mark whole exercise done" className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: allDone ? COLORS.green : "#fff", border: `1.5px solid ${allDone ? COLORS.green : COLORS.border}` }}>{allDone && <Check size={14} color="#fff" />}</button>
          <button onClick={() => setShowSwap((s) => !s)} className="p-1.5 rounded-lg" style={{ color: COLORS.muted, opacity: 0.6 }} title="Swap exercise"><ArrowLeftRight size={14} /></button>
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button onClick={onRemove} className="text-[10px] font-bold px-2 py-1.5 rounded-lg" style={{ background: COLORS.red, color: "#fff", fontFamily: "Poppins, sans-serif" }}>Delete</button>
              <button onClick={() => setConfirmDelete(false)} className="text-[10px] font-bold px-2 py-1.5 rounded-lg" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>Cancel</button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="p-1.5 rounded-lg" style={{ color: COLORS.muted, opacity: 0.6 }}><Trash2 size={14} /></button>
          )}
        </div>
      </div>

      {!showSwap && !smartSuggestion && (
        <button onClick={tryNotFeelingIt} className="text-[11px] font-medium mb-2" style={{ color: COLORS.plum, fontFamily: "Poppins, sans-serif" }}>Not feeling it today? →</button>
      )}
      {smartSuggestion && (
        <div className="rounded-xl px-3 py-2.5 mb-2 flex flex-col gap-1.5" style={{ background: `${COLORS.plum}0F`, border: `1px solid ${COLORS.plum}` }}>
          <span className="text-xs font-semibold" style={{ color: COLORS.plum, fontFamily: "Poppins, sans-serif" }}>Try {smartSuggestion.exercise.name} instead?</span>
          <span className="text-[11px]" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{smartSuggestion.reason}</span>
          <div className="flex gap-2 mt-0.5">
            <button onClick={() => { onSwap(smartSuggestion.exercise); setSmartSuggestion(null); }} className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{ background: COLORS.plum, color: "#fff", fontFamily: "Poppins, sans-serif" }}>Swap it in</button>
            <button onClick={() => setSmartSuggestion(null)} className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>Never mind</button>
          </div>
        </div>
      )}

      {showSwap && (
        <div className="rounded-xl px-3 py-2 mb-2 flex flex-col gap-1.5" style={{ background: COLORS.bg }}>
          <button onClick={() => setShowAll((s) => !s)} className="text-left text-xs underline self-start" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{showAll ? "Show same category only" : "Show all exercises"}</button>
          <div className="flex flex-col gap-1 max-h-40 overflow-y-auto mt-1">
            {swapList.map((c) => (<button key={c.id} onClick={() => { onSwap(c); setShowSwap(false); setShowAll(false); }} className="text-left text-xs px-2 py-1.5 rounded-lg" style={{ background: "#fff", color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>{c.name} <span style={{ color: COLORS.muted }}>· {c.muscle}</span></button>))}
            {!swapList.length && <span className="text-xs px-2 py-1" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>No other exercises in this category yet.</span>}
          </div>
        </div>
      )}

      <div className="grid grid-cols-[22px_1fr_58px_48px_26px_16px] gap-1.5 items-center mt-2 mb-1 px-1">
        <span className="text-[10px] uppercase font-bold" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>Set</span>
        <span className="text-[10px] uppercase font-bold" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>Previous</span>
        <span className="text-[10px] uppercase font-bold" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>Kg</span>
        <span className="text-[10px] uppercase font-bold" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>Reps</span>
        <span></span><span></span>
      </div>
      <div className="flex flex-col gap-1.5">
        {ex.sets.map((s, i) => (
          <div key={i} className="grid grid-cols-[22px_1fr_58px_48px_26px_16px] gap-1.5 items-center rounded-xl px-1 py-1.5 transition-colors" style={{ background: s.done ? `${COLORS.green}1A` : s.isWarmup ? `${COLORS.muted}14` : "transparent", border: s.isWarmup && !s.done ? `1px dashed ${COLORS.border}` : "1px solid transparent" }}>
            <span className="text-sm font-bold text-center" style={{ color: s.done ? COLORS.green : s.isWarmup ? COLORS.muted : COLORS.ink, fontFamily: "Oswald, sans-serif", fontSize: s.isWarmup ? "11px" : undefined }}>{s.set}</span>
            <span className="text-xs truncate" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{s.prev}</span>
            <input type="number" inputMode="decimal" value={s.weight} onChange={(e) => onChangeSet(i, "weight", e.target.value)} placeholder="0" className="w-full rounded-lg px-1.5 py-1.5 text-sm text-center outline-none" style={{ background: "#fff", border: `1px solid ${COLORS.border}`, fontFamily: "Poppins, sans-serif" }} />
            <input type="number" inputMode="numeric" value={s.reps} onChange={(e) => onChangeSet(i, "reps", e.target.value)} placeholder="0" className="w-full rounded-lg px-1.5 py-1.5 text-sm text-center outline-none" style={{ background: "#fff", border: `1px solid ${COLORS.border}`, fontFamily: "Poppins, sans-serif" }} />
            <button onClick={() => onToggleDone(i)} className="w-7 h-7 rounded-full flex items-center justify-center mx-auto" style={{ background: s.done ? COLORS.green : "#fff", border: `1.5px solid ${s.done ? COLORS.green : COLORS.border}` }}>{s.done && <Check size={14} color="#fff" />}</button>
            {(s.isWarmup || ex.sets.filter((x) => !x.isWarmup).length > 1) ? (<button onClick={() => onRemoveSet(i)} className="flex items-center justify-center" style={{ color: COLORS.muted, opacity: 0.5 }}><X size={12} /></button>) : <span />}
          </div>
        ))}
      </div>
      <button onClick={onAddSet} className="mt-3 w-full rounded-xl py-2 text-xs font-semibold flex items-center justify-center gap-1.5" style={{ border: `1.5px dashed ${COLORS.border}`, color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}><Plus size={13} /> Add Set</button>
    </div>
  );
}
function SupersetBox({ letter, color, children }) {
  return (
    <div className="rounded-2xl p-3" style={{ border: `2px dashed ${color}`, background: `${color}0D` }}>
      <div className="flex items-center gap-2 mb-2 px-1">
        <ArrowLeftRight size={13} style={{ color }} />
        <span className="text-[11px] uppercase tracking-widest font-bold" style={{ color, fontFamily: "Poppins, sans-serif" }}>Superset {letter}</span>
      </div>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}
function ExerciseGroup({ title, color, list, letters, library, history, onChangeSet, onToggleDone, onToggleAll, onAddSet, onRemoveSet, onRemove, onSwap }) {
  const [open, setOpen] = useState(true);
  if (!list.length) return null;
  return (
    <div className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between" style={{ marginBottom: open ? "8px" : 0 }}>
        <SectionLabelInline color={color}>{title}</SectionLabelInline>
        {open ? <ChevronUp size={15} style={{ color: COLORS.muted }} /> : <ChevronDown size={15} style={{ color: COLORS.muted }} />}
      </button>
      {open && (
        <div className="flex flex-col gap-3">
          {list.map((ex) => (<ExerciseCard key={ex.id} ex={ex} color={color} letter={letters[ex.id]} library={library} history={history} onChangeSet={(i, f, v) => onChangeSet(ex.id, i, f, v)} onToggleDone={(i) => onToggleDone(ex.id, i)} onToggleAll={() => onToggleAll(ex.id)} onAddSet={() => onAddSet(ex.id)} onRemoveSet={(i) => onRemoveSet(ex.id, i)} onRemove={() => onRemove(ex.id)} onSwap={(data) => onSwap(ex.id, data)} />))}
        </div>
      )}
    </div>
  );
}
function AccessoriesSection({ title, color, list, letters, library, history, onChangeSet, onToggleDone, onToggleAll, onAddSet, onRemoveSet, onRemove, onSwap }) {
  const [open, setOpen] = useState(true);
  if (!list.length) return null;
  const groups = groupBySuperset(list);
  return (
    <div className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between" style={{ marginBottom: open ? "8px" : 0 }}>
        <SectionLabelInline color={color}>{title}</SectionLabelInline>
        {open ? <ChevronUp size={15} style={{ color: COLORS.muted }} /> : <ChevronDown size={15} style={{ color: COLORS.muted }} />}
      </button>
      {open && (
        <div className="flex flex-col gap-3">
          {groups.map((g, gi) => {
            if (g.type === "superset") {
              const boxLetter = (letters[g.items[0].id] || "").replace(/\d+$/, "");
              return (
                <SupersetBox key={gi} letter={boxLetter} color={color}>
                  {g.items.map((ex) => (<ExerciseCard key={ex.id} ex={ex} color={color} letter={letters[ex.id]} library={library} history={history} onChangeSet={(i, f, v) => onChangeSet(ex.id, i, f, v)} onToggleDone={(i) => onToggleDone(ex.id, i)} onToggleAll={() => onToggleAll(ex.id)} onAddSet={() => onAddSet(ex.id)} onRemoveSet={(i) => onRemoveSet(ex.id, i)} onRemove={() => onRemove(ex.id)} onSwap={(data) => onSwap(ex.id, data)} />))}
                </SupersetBox>
              );
            }
            const ex = g.ex;
            return (<ExerciseCard key={ex.id} ex={ex} color={color} letter={letters[ex.id]} library={library} history={history} onChangeSet={(i, f, v) => onChangeSet(ex.id, i, f, v)} onToggleDone={(i) => onToggleDone(ex.id, i)} onToggleAll={() => onToggleAll(ex.id)} onAddSet={() => onAddSet(ex.id)} onRemoveSet={(i) => onRemoveSet(ex.id, i)} onRemove={() => onRemove(ex.id)} onSwap={(data) => onSwap(ex.id, data)} />);
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Workout screen
// ---------------------------------------------------------------------------
// Ramp-up sets for the heavy compound slots (main + secondary): two lighter
// sets at ~50% and ~75% of the working weight, flagged isWarmup so they never
// count toward progression, PRs, or the "sets done" total.
function buildWarmupSets(workingWeight) {
  if (workingWeight == null || !(workingWeight > 0)) return [];
  return [0.5, 0.75].map((pct, i) => ({
    set: `W${i + 1}`,
    prev: "Warm-up",
    weight: String(Math.round(workingWeight * pct * 2) / 2),
    reps: "5",
    done: false,
    isWarmup: true,
  }));
}
function renumberWorkSets(sets) {
  let n = 0;
  return sets.map((s) => (s.isWarmup ? s : { ...s, set: ++n }));
}
function buildSlotExercise(library, slotDef, weightSuggestions, includeWarmup) {
  const ex = resolveEx(library, slotDef.exerciseId);
  const suggestion = weightSuggestions && weightSuggestions[ex.name];
  const phase = phaseForCategory(ex.category);
  let prevText, defaultWeight, defaultReps;
  if (phase && phase.deload) {
    const baseWeight = suggestion ? suggestion.suggestedWeight : parseTargetWeight(ex.reps);
    const deloadWeight = baseWeight != null ? Math.round(baseWeight * 0.7 * 2) / 2 : null;
    prevText = deloadWeight != null ? `Deload — try ~${deloadWeight}kg x ${phase.repRange}` : `Deload week — go lighter, x${phase.repRange}`;
    defaultWeight = deloadWeight;
    defaultReps = phase.repMin;
  } else if (phase) {
    const baseWeight = suggestion ? suggestion.suggestedWeight : parseTargetWeight(ex.reps);
    prevText = suggestion ? `Suggested ${suggestion.suggestedWeight}kg x ${phase.repRange} (${phase.phase})` : `${ex.reps || "—"} → aim x${phase.repRange} (${phase.phase})`;
    defaultWeight = baseWeight;
    defaultReps = phase.repMin;
  } else {
    const baseWeight = suggestion ? suggestion.suggestedWeight : parseTargetWeight(ex.reps);
    prevText = suggestion ? `Suggested ${suggestion.suggestedWeight}kg` : (ex.reps || "—");
    defaultWeight = baseWeight;
    defaultReps = parseTargetReps(ex.reps);
  }
  return {
    id: slotDef.slot,
    exerciseId: slotDef.exerciseId,
    name: ex.name,
    muscle: ex.muscle,
    category: ex.category,
    superset: slotDef.superset || null,
    sets: [
      ...(includeWarmup && !(phase && phase.deload) ? buildWarmupSets(defaultWeight) : []),
      ...buildSets(slotDef.sets, prevText, defaultWeight, defaultReps),
    ],
    suggestion: suggestion || null,
    phase: phase || null,
  };
}
function makeSession(day, library, weightSuggestions, warmupLibrary, prehabLibrary, plyoLibrary) {
  return {
    id: day.id, name: day.name, color: day.color,
    warmup: day.warmup.map((id) => resolveWarmup(warmupLibrary, id)), warmupDone: {},
    prehab: day.prehab.map((s) => {
      const p = resolvePrehab(prehabLibrary, s.prehabId);
      return { ...p, completed: Array(p.targetSets).fill(false) };
    }),
    power: (() => {
      const p = resolvePlyo(plyoLibrary, day.power && day.power.plyoId);
      return [{ ...p, completed: Array(p.targetSets).fill(false) }];
    })(),
    mainLift: day.mainLifts.map((s) => buildSlotExercise(library, s, weightSuggestions, true)),
    secondaryLifts: day.secondaryLifts.map((s) => buildSlotExercise(library, s, weightSuggestions, true)),
    accessories: day.accessories.map((s) => buildSlotExercise(library, s, weightSuggestions)),
    core: (day.core || []).map((s) => buildSlotExercise(library, s, weightSuggestions)),
    mobility: relevantMobilityForDay(day).map(buildMobilitySession),
    finisher: day.finisher,
    cooldown: [...day.cooldown], cooldownDone: {},
  };
}
function WorkoutScreen({ session, setSession, exerciseLibrary, history, onFinish, onDiscard }) {
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [paused]);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  const categories = ["mainLift", "secondaryLifts", "accessories", "core"];
  const letters = computeLetters(session);

  const changeSet = (cat, exId, i, field, val) => setSession((prev) => ({ ...prev, [cat]: prev[cat].map((ex) => (ex.id === exId ? { ...ex, sets: ex.sets.map((s, si) => (si === i ? { ...s, [field]: val } : s)) } : ex)) }));
  const toggleDone = (cat, exId, i) => setSession((prev) => ({ ...prev, [cat]: prev[cat].map((ex) => (ex.id === exId ? { ...ex, sets: ex.sets.map((s, si) => (si === i ? { ...s, done: !s.done } : s)) } : ex)) }));
  const toggleAllDone = (cat, exId) => setSession((prev) => ({
    ...prev,
    [cat]: prev[cat].map((ex) => {
      if (ex.id !== exId) return ex;
      const allDone = ex.sets.length > 0 && ex.sets.every((s) => s.done);
      return { ...ex, sets: ex.sets.map((s) => ({ ...s, done: !allDone })) };
    }),
  }));
  const addSet = (cat, exId) => setSession((prev) => ({ ...prev, [cat]: prev[cat].map((ex) => (ex.id === exId ? { ...ex, sets: [...ex.sets, { set: ex.sets.filter((x) => !x.isWarmup).length + 1, prev: "—", weight: "", reps: "", done: false }] } : ex)) }));
  const removeSet = (cat, exId, i) => setSession((prev) => ({ ...prev, [cat]: prev[cat].map((ex) => (ex.id === exId ? { ...ex, sets: renumberWorkSets(ex.sets.filter((_, si) => si !== i)) } : ex)) }));
  const removeEx = (cat, exId) => setSession((prev) => ({ ...prev, [cat]: prev[cat].filter((ex) => ex.id !== exId) }));
  const swapEx = (cat, exId, data) => setSession((prev) => ({ ...prev, [cat]: prev[cat].map((ex) => (ex.id === exId ? { ...ex, name: data.name, muscle: data.muscle, category: data.category, exerciseId: data.id, sets: buildSets(ex.sets.filter((x) => !x.isWarmup).length, data.reps || "—") } : ex)) }));

  const toggleChecklist = (field, index) => setSession((prev) => { const doneMap = { ...prev[field] }; doneMap[index] = !doneMap[index]; return { ...prev, [field]: doneMap }; });
  const removeChecklistItem = (field, index) => setSession((prev) => {
    const items = prev[field].filter((_, i) => i !== index);
    const oldDone = prev[field + "Done"];
    const newDone = {}; let ni = 0;
    prev[field].forEach((_, i) => { if (i === index) return; newDone[ni] = oldDone[i] || false; ni++; });
    return { ...prev, [field]: items, [field + "Done"]: newDone };
  });
  const addChecklistItem = (field, item) => setSession((prev) => ({ ...prev, [field]: [...prev[field], item] }));
  const toggleMini = (field, exIndex, setIndex) => setSession((prev) => ({ ...prev, [field]: prev[field].map((ex, i) => { if (i !== exIndex) return ex; const completed = [...ex.completed]; completed[setIndex] = !completed[setIndex]; return { ...ex, completed }; }) }));
  const toggleMobilityMini = (bpIndex, phase, exIndex, setIndex) => setSession((prev) => ({
    ...prev,
    mobility: prev.mobility.map((bp, bi) => {
      if (bi !== bpIndex) return bp;
      return { ...bp, [phase]: bp[phase].map((ex, ei) => { if (ei !== exIndex) return ex; const completed = [...ex.completed]; completed[setIndex] = !completed[setIndex]; return { ...ex, completed }; }) };
    }),
  }));
  const setMobilityMeasurement = (bpIndex, val) => setSession((prev) => ({ ...prev, mobility: prev.mobility.map((bp, bi) => (bi === bpIndex ? { ...bp, measurement: val } : bp)) }));
  const addExerciseFromCatalog = (item) => { setSession((prev) => ({ ...prev, accessories: [...prev.accessories, { id: `custom-${Date.now()}`, exerciseId: item.id, name: item.name, muscle: item.muscle, category: item.category, superset: null, sets: buildSets(item.sets || 3, item.reps || "—") }] })); setShowPicker(false); };
  const totalSetsDone = categories.reduce((acc, cat) => acc + session[cat].reduce((a, ex) => a + ex.sets.filter((s) => s.done && !s.isWarmup).length, 0), 0);

  return (
    <div className="flex flex-col gap-5 pb-16">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</div>
          <div className="text-2xl font-bold" style={{ color: COLORS.ink, fontFamily: "Oswald, sans-serif" }}>{session.name}</div>
          <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>Target ~45 min</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setPaused((p) => !p)} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: `${session.color}1A`, color: session.color }}>{paused ? <Play size={15} fill={session.color} /> : <Pause size={15} />}</button>
          <div className="text-right">
            <div className="text-3xl font-bold tabular-nums" style={{ color: paused ? COLORS.muted : session.color, fontFamily: "Oswald, sans-serif" }}>{mm}:{ss}</div>
            <span className="text-[10px] uppercase tracking-widest" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{paused ? "paused" : "elapsed"}</span>
          </div>
        </div>
      </div>

      <CollapsibleCard title="Warmup" color={session.color}>
        <EditableChecklist items={session.warmup} doneMap={session.warmupDone} onToggle={(i) => toggleChecklist("warmupDone", i)} onRemove={(i) => removeChecklistItem("warmup", i)} onAdd={(item) => addChecklistItem("warmup", item)} catalog={MOBILITY_CATALOG} />
      </CollapsibleCard>
      <CollapsibleCard title="Prehab" color={session.color} subtitle="do this first">
        <div className="flex flex-col gap-2">{session.prehab.map((ex, i) => (<MiniExerciseBlock key={i} ex={ex} onTapSet={(si) => toggleMini("prehab", i, si)} />))}</div>
      </CollapsibleCard>
      <CollapsibleCard title="Power / Plyometrics" color={session.color}>
        <div className="flex flex-col gap-2">{session.power.map((ex, i) => (<MiniExerciseBlock key={i} ex={ex} letter="A" onTapSet={(si) => toggleMini("power", i, si)} />))}</div>
      </CollapsibleCard>

      <ExerciseGroup title="Main Lift" color={session.color} list={session.mainLift} letters={letters} library={exerciseLibrary} history={history} onChangeSet={(id, i, f, v) => changeSet("mainLift", id, i, f, v)} onToggleDone={(id, i) => toggleDone("mainLift", id, i)} onToggleAll={(id) => toggleAllDone("mainLift", id)} onAddSet={(id) => addSet("mainLift", id)} onRemoveSet={(id, i) => removeSet("mainLift", id, i)} onRemove={(id) => removeEx("mainLift", id)} onSwap={(id, d) => swapEx("mainLift", id, d)} />
      <ExerciseGroup title="Secondary Lifts" color={session.color} list={session.secondaryLifts} letters={letters} library={exerciseLibrary} history={history} onChangeSet={(id, i, f, v) => changeSet("secondaryLifts", id, i, f, v)} onToggleDone={(id, i) => toggleDone("secondaryLifts", id, i)} onToggleAll={(id) => toggleAllDone("secondaryLifts", id)} onAddSet={(id) => addSet("secondaryLifts", id)} onRemoveSet={(id, i) => removeSet("secondaryLifts", id, i)} onRemove={(id) => removeEx("secondaryLifts", id)} onSwap={(id, d) => swapEx("secondaryLifts", id, d)} />
      <AccessoriesSection title="Accessories" color={session.color} list={session.accessories} letters={letters} library={exerciseLibrary} history={history} onChangeSet={(id, i, f, v) => changeSet("accessories", id, i, f, v)} onToggleDone={(id, i) => toggleDone("accessories", id, i)} onToggleAll={(id) => toggleAllDone("accessories", id)} onAddSet={(id) => addSet("accessories", id)} onRemoveSet={(id, i) => removeSet("accessories", id, i)} onRemove={(id) => removeEx("accessories", id)} onSwap={(id, d) => swapEx("accessories", id, d)} />

      <button onClick={() => setShowPicker((s) => !s)} className="w-full rounded-2xl py-3 text-sm font-semibold flex items-center justify-center gap-2" style={{ background: `${session.color}1A`, color: session.color, fontFamily: "Poppins, sans-serif" }}><Plus size={16} /> Add Exercise</button>
      {showPicker && (
        <div className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1.5px solid ${session.color}` }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold uppercase tracking-widest" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>Add Exercise</span>
            <button onClick={() => setShowPicker(false)} style={{ color: COLORS.muted }}><X size={18} /></button>
          </div>
          <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
            {exerciseLibrary.map((item) => (<button key={item.id} onClick={() => addExerciseFromCatalog(item)} className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ background: COLORS.bg }}><span className="text-sm font-medium" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>{item.name}</span><Pill color={session.color}>{item.muscle}</Pill></button>))}
          </div>
        </div>
      )}

      <div className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
        <SectionLabel color={session.color}>Finisher</SectionLabel>
        <p className="text-sm" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>{session.finisher}</p>
      </div>

      <ExerciseGroup title="Core (rotation / anti-rotation / flexion)" color={session.color} list={session.core} letters={letters} library={exerciseLibrary} history={history} onChangeSet={(id, i, f, v) => changeSet("core", id, i, f, v)} onToggleDone={(id, i) => toggleDone("core", id, i)} onToggleAll={(id) => toggleAllDone("core", id)} onAddSet={(id) => addSet("core", id)} onRemoveSet={(id, i) => removeSet("core", id, i)} onRemove={(id) => removeEx("core", id)} onSwap={(id, d) => swapEx("core", id, d)} />

      <CollapsibleCard title="Cooldown" color={session.color}>
        <EditableChecklist items={session.cooldown} doneMap={session.cooldownDone} onToggle={(i) => toggleChecklist("cooldownDone", i)} onRemove={(i) => removeChecklistItem("cooldown", i)} onAdd={(item) => addChecklistItem("cooldown", item)} catalog={STRETCH_CATALOG} />
      </CollapsibleCard>

      {session.mobility && session.mobility.length > 0 && (
        <CollapsibleCard title="Mobility Work" color={COLORS.plum} subtitle="optional add-on" defaultOpen={false}>
          <div className="flex flex-col gap-4">
            {session.mobility.map((bp, bi) => (
              <div key={bp.id} className="flex flex-col gap-2">
                <span className="text-sm font-bold" style={{ color: COLORS.ink, fontFamily: "Oswald, sans-serif" }}>{bp.name}</span>
                {bp.strength.map((ex, ei) => (<MiniExerciseBlock key={`s-${ei}`} ex={ex} onTapSet={(si) => toggleMobilityMini(bi, "strength", ei, si)} />))}
                {bp.pnf.map((ex, ei) => (<MiniExerciseBlock key={`p-${ei}`} ex={ex} onTapSet={(si) => toggleMobilityMini(bi, "pnf", ei, si)} />))}
                <div className="rounded-xl p-3" style={{ background: COLORS.bg }}>
                  <span className="text-xs" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{bp.metric} — cm from floor, lower is deeper.</span>
                  <input type="number" inputMode="decimal" placeholder="cm from floor" value={bp.measurement} onChange={(e) => setMobilityMeasurement(bi, e.target.value)} className="w-full mt-1.5 rounded-xl px-3 py-2 text-sm outline-none" style={{ background: "#fff", border: `1px solid ${COLORS.border}`, fontFamily: "Poppins, sans-serif" }} />
                </div>
              </div>
            ))}
          </div>
        </CollapsibleCard>
      )}

      <div className="fixed bottom-16 left-0 right-0 px-4 py-3 flex gap-3" style={{ background: `${COLORS.bg}F5` }}>
        <button onClick={onDiscard} className="flex-1 rounded-2xl py-3.5 text-sm font-bold uppercase tracking-wider" style={{ background: "#fff", color: COLORS.red, border: `1.5px solid ${COLORS.red}`, fontFamily: "Poppins, sans-serif" }}>Discard</button>
        <button onClick={() => onFinish(elapsed, totalSetsDone)} className="flex-1 rounded-2xl py-3.5 text-sm font-bold uppercase tracking-wider" style={{ background: session.color, color: "#fff", fontFamily: "Poppins, sans-serif" }}>Finish</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Multi-week calendar (embedded in Workout tab)
// ---------------------------------------------------------------------------
function WorkoutHome({ weeklySplit, setWeeklySplit, days, onStartDay, overviewProps }) {
  const phase = CURRENT_STRENGTH_PHASE;
  const phaseColor = phase.deload ? COLORS.muted : phase.phase === "Strength" ? COLORS.rust : COLORS.sage;
  return (
    <div className="flex flex-col gap-5 pb-6">
      <div className="rounded-xl px-4 py-2.5 flex items-center justify-between" style={{ background: `${phaseColor}1A`, border: `1px solid ${phaseColor}` }}>
        <span className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: phaseColor, fontFamily: "Poppins, sans-serif" }}>{phase.deload ? "Deload Week" : `${phase.phase} Phase`} · Cycle Week {phase.week}/8</span>
        <span className="text-xs font-bold" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>Target x{phase.repRange}</span>
      </div>
      <div>
        <h2 className="text-sm uppercase tracking-widest font-bold mb-2" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>This Week's Split</h2>
        <Segmented options={[{ value: 2, label: "2-Day" }, { value: 3, label: "3-Day" }, { value: 4, label: "4-Day" }]} value={weeklySplit} onChange={(v) => setWeeklySplit(v)} color={COLORS.rust} />
        <p className="text-[11px] mt-2" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>Changing this updates the calendar below immediately for any week you haven't manually customized.</p>
      </div>
      <div>
        <h2 className="text-sm uppercase tracking-widest font-bold mb-3 flex items-center gap-2" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}><LayoutGrid size={15} /> Calendar</h2>
        <OverviewScreen {...overviewProps} />
      </div>
      <div>
        <h2 className="text-sm uppercase tracking-widest font-bold mb-3" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>Quick Launch</h2>
        <div className="flex flex-col gap-3">
          {days.map((d) => (
            <button key={d.id} onClick={() => onStartDay(d)} className="rounded-2xl p-4 flex items-center gap-4 text-left active:scale-[0.98] transition-transform" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
              <div className="w-1.5 self-stretch rounded-full" style={{ background: d.color }} />
              <div className="flex-1">
                <span className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: d.color, fontFamily: "Poppins, sans-serif" }}>{d.label}</span>
                <div className="text-xl font-bold" style={{ color: COLORS.ink, fontFamily: "Oswald, sans-serif" }}>{d.name}</div>
                <span className="text-xs" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{allDayExercises(d).length} exercises · ~45 min</span>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `${d.color}1A` }}><Play size={16} style={{ color: d.color }} fill={d.color} /></div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overview — the big weekly picture across every activity type: strength,
// running, morning mobility, and desk snacks, plus a shortcut into the
// day-agnostic Flexibility blueprints. This tab is read-first: tapping an
// activity opens or launches it, but completion toggling stays on that
// activity's own tab so there's exactly one place each habit lives. The
// grip handle keeps the old "move a day's schedule" ability alive.
// ---------------------------------------------------------------------------
function OverviewScreen({ getSchedule, setSchedule, isCustom, onReset, dayById, history, runHistory, onStartDay, onStartRun }) {
  const [offset, setOffset] = useState(0);
  const [moveSource, setMoveSource] = useState(null);
  const schedule = getSchedule(offset);
  const weekDates = getWeekDates(addWeeks(new Date(), offset));
  const todayIso = todayISO();
  const macroPhase = computeMacroPhase(offset);
  const runAssignments = weekRunAssignments(schedule, macroPhase);
  const historyDates = new Set(history.map((h) => h.date));
  const runDates = new Set(runHistory.map((r) => r.date));

  const handleHeaderTap = (weekday) => {
    if (moveSource === null) return;
    if (moveSource === weekday) { setMoveSource(null); return; }
    const next = { ...schedule };
    const a = next[moveSource], b = next[weekday];
    next[moveSource] = b; next[weekday] = a;
    setSchedule(offset, next);
    setMoveSource(null);
  };

  return (
    <div className="flex flex-col gap-4 pb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutGrid size={16} style={{ color: COLORS.ink }} />
          <span className="text-sm uppercase tracking-widest font-bold" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>{offset === 0 ? "This Week" : `Week of ${fmtDate(weekDates[0].iso)}`}</span>
          {isCustom(offset) && <Pill color={COLORS.ochre}>Customized</Pill>}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => { setOffset((o) => Math.max(0, o - 1)); setMoveSource(null); }} disabled={offset === 0} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ color: offset === 0 ? COLORS.border : COLORS.muted }}><ChevronLeft size={18} /></button>
          <button onClick={() => { setOffset((o) => Math.min(11, o + 1)); setMoveSource(null); }} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ color: COLORS.muted }}><ChevronRight size={18} /></button>
        </div>
      </div>
      {moveSource !== null ? (
        <div className="text-xs px-3 py-2 rounded-xl flex items-center justify-between" style={{ background: `${COLORS.ochre}1A`, color: COLORS.ochre, fontFamily: "Poppins, sans-serif" }}>
          <span>Tap another day to move it there</span>
          <button onClick={() => setMoveSource(null)}><X size={13} /></button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] flex-1" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>Tap the grip handle, then tap another day to move a workout or run there.</p>
          {isCustom(offset) && (<button onClick={() => onReset(offset)} className="text-[11px] font-semibold shrink-0" style={{ color: COLORS.ochre, fontFamily: "Poppins, sans-serif" }}>Reset week</button>)}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {weekDates.map(({ iso, weekday, label, dayNum }) => {
          const isToday = iso === todayIso;
          const isSelected = moveSource === weekday;
          const sessions = schedule[weekday] || [];
          const strengthEntry = sessions.find((s) => s.type === "strength");
          const runEntry = sessions.find((s) => s.type === "run");
          const strengthDay = strengthEntry ? dayById[strengthEntry.dayId] : null;
          const strengthComplete = strengthDay ? historyDates.has(iso) : false;
          const runSessionForDay = runEntry ? runAssignments[weekday] : null;
          const runComplete = runSessionForDay ? runDates.has(iso) : false;
          const isRest = sessions.length === 0;

          return (
            <div key={iso} className="rounded-2xl p-3" style={{ background: COLORS.card, border: `1.5px solid ${isSelected ? COLORS.ink : isToday ? COLORS.sage : COLORS.border}` }}>
              <div className="flex items-center gap-3">
                <button onClick={() => handleHeaderTap(weekday)} className="flex items-center gap-2 shrink-0" style={{ minWidth: "64px" }}>
                  <div className="flex flex-col items-start">
                    <span className="text-xs font-bold uppercase" style={{ color: isToday ? COLORS.sage : COLORS.ink, fontFamily: "Oswald, sans-serif" }}>{label}</span>
                    <span className="text-[10px]" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{dayNum}{isToday ? " · Today" : ""}</span>
                  </div>
                </button>

                <div className="flex-1 flex flex-col gap-1.5">
                  {strengthDay && (
                    <button onClick={() => onStartDay(strengthDay)} className="w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left" style={{ background: `${strengthDay.color}1A` }}>
                      <Dumbbell size={14} style={{ color: strengthDay.color }} />
                      <span className="text-xs flex-1 font-medium truncate" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>{strengthDay.name} <span style={{ color: COLORS.muted }}>· {strengthEntry.time}</span></span>
                      {strengthComplete ? <Check size={13} style={{ color: strengthDay.color }} /> : <Play size={11} style={{ color: strengthDay.color }} />}
                    </button>
                  )}
                  {runSessionForDay && (
                    <button onClick={() => onStartRun(runSessionForDay)} className="w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left" style={{ background: `${runSessionForDay.color}1A` }}>
                      <Footprints size={14} style={{ color: runSessionForDay.color }} />
                      <span className="text-xs flex-1 font-medium truncate" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>{runSessionForDay.role} · {runSessionForDay.distance}km</span>
                      {runComplete ? <Check size={13} style={{ color: runSessionForDay.color }} /> : <Play size={11} style={{ color: runSessionForDay.color }} />}
                    </button>
                  )}
                  {isRest && (<span className="text-xs px-2.5" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>Rest</span>)}
                </div>

                {!isRest && moveSource === null && (<button onClick={() => setMoveSource(weekday)} className="shrink-0" style={{ color: COLORS.muted, opacity: 0.5 }}><GripVertical size={15} /></button>)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
function buildTodayAgenda(weekday, schedule, dayById, overrideTime) {
  const items = [];
  const move = getMorningMovement(weekday, schedule, dayById, overrideTime);
  items.push({ kind: "morning", order: move.time === "AM" ? 1 : 5, move });
  const sessions = schedule[weekday] || [];
  const strengthEntry = sessions.find((s) => s.type === "strength");
  const runEntry = sessions.find((s) => s.type === "run");
  if (strengthEntry && dayById[strengthEntry.dayId]) items.push({ kind: "strength", order: strengthEntry.time === "PM" ? 3 : 2, day: dayById[strengthEntry.dayId], time: strengthEntry.time });
  if (runEntry) { const assignments = weekRunAssignments(schedule, CURRENT_MACRO_PHASE); items.push({ kind: "run", order: 4, run: assignments[weekday] || longRunSessionForMacroPhase(CURRENT_MACRO_PHASE) }); }
  if (!strengthEntry && !runEntry) items.push({ kind: "rest", order: 3 });
  return items.sort((x, y) => x.order - y.order);
}
function BodyweightBadge({ log, onLog }) {
  const [showForm, setShowForm] = useState(false);
  const [val, setVal] = useState("");
  const sorted = [...log].sort((a, b) => (a.date < b.date ? -1 : 1));
  const latest = sorted[sorted.length - 1];
  const prev = sorted[sorted.length - 2];
  const delta = latest && prev ? Math.round((latest.weight - prev.weight) * 10) / 10 : null;
  const submit = () => { const n = parseFloat(val); if (isNaN(n)) return; onLog(n); setVal(""); setShowForm(false); };
  return (
    <div className="rounded-xl px-4 py-2.5" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
      <button onClick={() => setShowForm((s) => !s)} className="w-full flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>Bodyweight</span>
        <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>
          {latest ? `${latest.weight}kg` : "Log your first entry"}
          {delta !== null && delta !== 0 && <span style={{ color: delta > 0 ? COLORS.ochre : COLORS.sage }}>{delta > 0 ? "+" : ""}{delta}kg</span>}
          <Plus size={12} style={{ color: COLORS.muted }} />
        </span>
      </button>
      {showForm && (
        <div className="flex gap-2 mt-2">
          <input type="number" inputMode="decimal" step="0.1" value={val} onChange={(e) => setVal(e.target.value)} placeholder="kg" className="flex-1 rounded-lg px-3 py-1.5 text-sm outline-none" style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, fontFamily: "Poppins, sans-serif" }} />
          <button onClick={submit} className="rounded-lg px-3 py-1.5 text-xs font-bold" style={{ background: COLORS.sage, color: "#fff", fontFamily: "Poppins, sans-serif" }}>Log</button>
        </div>
      )}
    </div>
  );
}
function Dashboard({ streak, weekCount, total, prs, schedule, dayById, days, morningDone, onToggleMorning, onStartDay, onOpenRun, mobilityOverrides, bodyweightLog, onLogBodyweight, overviewProps }) {
  const [showOthers, setShowOthers] = useState(false);
  const todayWeekday = new Date().getDay();
  const todayIso = todayISO();
  const agenda = buildTodayAgenda(todayWeekday, schedule, dayById, mobilityOverrides[todayIso]);

  return (
    <div className="flex flex-col gap-5 pb-6">
      <div className="rounded-xl px-4 py-2.5 flex items-center justify-between" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
        <span className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>Half Marathon · {CURRENT_MACRO_PHASE.phase} Phase{CURRENT_MACRO_PHASE.totalWeeks ? ` · Wk ${CURRENT_MACRO_PHASE.weekInPhase}/${CURRENT_MACRO_PHASE.totalWeeks}` : ""}</span>
        <span className="text-xs font-semibold" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>{CURRENT_MACRO_PHASE.weeksUntilRace}w to race</span>
      </div>
      <div className="rounded-xl px-4 py-2.5 flex items-center justify-between" style={{ background: CURRENT_STRENGTH_PHASE.deload ? `${COLORS.muted}1A` : CURRENT_STRENGTH_PHASE.phase === "Strength" ? `${COLORS.rust}1A` : `${COLORS.sage}1A`, border: `1px solid ${CURRENT_STRENGTH_PHASE.deload ? COLORS.muted : CURRENT_STRENGTH_PHASE.phase === "Strength" ? COLORS.rust : COLORS.sage}` }}>
        <span className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: CURRENT_STRENGTH_PHASE.deload ? COLORS.muted : CURRENT_STRENGTH_PHASE.phase === "Strength" ? COLORS.rust : COLORS.sage, fontFamily: "Poppins, sans-serif" }}>{CURRENT_STRENGTH_PHASE.deload ? "Deload Week" : `${CURRENT_STRENGTH_PHASE.phase} Phase`} · Strength Cycle Wk {CURRENT_STRENGTH_PHASE.week}/8</span>
        <span className="text-xs font-semibold" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>Target x{CURRENT_STRENGTH_PHASE.repRange}</span>
      </div>
      <BodyweightBadge log={bodyweightLog} onLog={onLogBodyweight} />

      <div className="flex gap-3">
        <StatBox label="Streak" value={streak} icon={Flame} accent={COLORS.rust} />
        <StatBox label="This Week" value={weekCount} icon={Dumbbell} accent={COLORS.sage} />
        <StatBox label="Total" value={total} icon={Trophy} accent={COLORS.ochre} />
      </div>

      <div>
        <h2 className="text-sm uppercase tracking-widest font-bold mb-3" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>Today's Plan</h2>
        <div className="flex flex-col gap-2.5">
          {agenda.map((item, idx) => {
            if (item.kind === "morning") {
              const done = !!morningDone[todayIso];
              return (
                <button key={idx} onClick={() => onToggleMorning(todayIso)} className="w-full rounded-2xl p-3.5 flex items-center gap-3 text-left" style={{ background: done ? `${COLORS.sage}1A` : COLORS.card, border: `1px solid ${done ? COLORS.sage : COLORS.border}` }}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: done ? COLORS.sage : "#fff", border: `1.5px solid ${done ? COLORS.sage : COLORS.border}` }}>{done ? <Check size={15} color="#fff" /> : <Sunrise size={15} style={{ color: COLORS.muted }} />}</div>
                  <div className="flex-1">
                    <span className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: COLORS.sage, fontFamily: "Poppins, sans-serif" }}>{item.move.time} · Morning Movement</span>
                    <div className="text-base font-bold" style={{ color: COLORS.ink, fontFamily: "Oswald, sans-serif" }}>{item.move.name}</div>
                  </div>
                </button>
              );
            }
            if (item.kind === "strength") {
              const d = item.day;
              return (
                <button key={idx} onClick={() => onStartDay(d)} className="w-full rounded-2xl p-4 flex items-center gap-4 text-left active:scale-[0.98] transition-transform" style={{ background: COLORS.card, border: `1.5px solid ${d.color}` }}>
                  <div className="w-1.5 self-stretch rounded-full" style={{ background: d.color }} />
                  <div className="flex-1">
                    <span className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: d.color, fontFamily: "Poppins, sans-serif" }}>{item.time} · {d.label}</span>
                    <div className="text-xl font-bold" style={{ color: COLORS.ink, fontFamily: "Oswald, sans-serif" }}>{d.name}</div>
                  </div>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `${d.color}1A` }}><Play size={16} style={{ color: d.color }} fill={d.color} /></div>
                </button>
              );
            }
            if (item.kind === "run") {
              return (
                <button key={idx} onClick={() => onOpenRun(item.run)} className="w-full rounded-2xl p-4 flex items-center gap-4 text-left" style={{ background: COLORS.card, border: `1.5px solid ${item.run.color}` }}>
                  <div className="w-1.5 self-stretch rounded-full" style={{ background: item.run.color }} />
                  <div className="flex-1">
                    <span className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: item.run.color, fontFamily: "Poppins, sans-serif" }}>After Work · {item.run.type}</span>
                    <div className="text-xl font-bold" style={{ color: COLORS.ink, fontFamily: "Oswald, sans-serif" }}>{item.run.distance}km Run</div>
                  </div>
                  <Footprints size={20} style={{ color: item.run.color }} />
                </button>
              );
            }
            return (
              <div key={idx} className="w-full rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
                <span className="text-sm" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>{todayWeekday === 0 ? "Rest — stay fresh for cheerleading today." : "Rest day. Light mobility only."}</span>
              </div>
            );
          })}
        </div>

        <button onClick={() => setShowOthers((s) => !s)} className="mt-2 text-xs font-medium flex items-center gap-1" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{showOthers ? <ChevronUp size={13} /> : <ChevronDown size={13} />} Choose a different workout</button>
        {showOthers && (
          <div className="flex flex-col gap-2 mt-2">
            {days.map((d) => (<button key={d.id} onClick={() => onStartDay(d)} className="rounded-xl p-3 flex items-center gap-3 text-left" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}><div className="w-1 self-stretch rounded-full" style={{ background: d.color }} /><span className="text-sm font-semibold flex-1" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>{d.name}</span><Play size={13} style={{ color: d.color }} /></button>))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-sm uppercase tracking-widest font-bold mb-3" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>Top Personal Records</h2>
        <div className="flex flex-col gap-2">
          {KEY_LIFTS.map((lift, i) => {
            const pr = prs[lift];
            if (!pr) return null;
            return (
              <div key={lift} className="rounded-2xl p-3.5 flex items-center gap-3" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0" style={{ background: `${COLORS.ochre}22`, color: COLORS.ochre, fontFamily: "Oswald, sans-serif" }}>{i + 1}</div>
                <div className="flex-1">
                  <div className="text-sm font-semibold" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>{lift}</div>
                  <div className="text-xs" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{fmtDate(pr.date)}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold leading-none" style={{ color: COLORS.ink, fontFamily: "Oswald, sans-serif" }}>{pr.weight}kg</div>
                  <div className="text-xs" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>x{pr.reps} reps</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="text-sm uppercase tracking-widest font-bold mb-3 flex items-center gap-2" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}><LayoutGrid size={15} /> Calendar</h2>
        <OverviewScreen {...overviewProps} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Workout Summary — shown right after Finish, before landing on History.
// Surfaces PRs earned and, for every exercise with logged sets, a next-time
// weight suggestion based on how the sets actually went.
// ---------------------------------------------------------------------------
function WorkoutSummaryScreen({ summary, onContinue, onCheckIn }) {
  const [rating, setRating] = useState(null);
  const prCount = summary.exercises.filter((e) => e.isPR).length;
  const withSuggestions = summary.exercises.filter((e) => e.suggestion);
  const submitCheckIn = (r) => { setRating(r); onCheckIn(r); };
  return (
    <div className="flex flex-col gap-5 pb-16">
      <div className="rounded-2xl p-5 text-center" style={{ background: `${summary.color}1A`, border: `1.5px solid ${summary.color}` }}>
        <Check size={28} style={{ color: summary.color, margin: "0 auto 8px" }} />
        <div className="text-2xl font-bold" style={{ color: COLORS.ink, fontFamily: "Oswald, sans-serif" }}>{summary.name} Complete</div>
        <div className="flex items-center justify-center gap-4 mt-2">
          <span className="text-xs" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{summary.duration} min</span>
          <span className="text-xs" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{summary.totalSets} sets</span>
          {prCount > 0 && <span className="text-xs font-bold flex items-center gap-1" style={{ color: COLORS.ochre, fontFamily: "Poppins, sans-serif" }}><Trophy size={12} /> {prCount} PR{prCount > 1 ? "s" : ""}</span>}
        </div>
      </div>

      {withSuggestions.length > 0 && (
        <div>
          <h2 className="text-sm uppercase tracking-widest font-bold mb-3" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>Next-Session Suggestions</h2>
          <div className="flex flex-col gap-2.5">
            {withSuggestions.map((e) => (
              <div key={e.name} className="rounded-2xl p-3.5 flex items-center gap-3" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
                <TrendingUp size={16} style={{ color: e.suggestion.delta > 0 ? COLORS.sage : e.suggestion.delta < 0 ? COLORS.red : COLORS.muted }} />
                <div className="flex-1">
                  <div className="text-sm font-semibold" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>{e.name}{e.isPR && <span style={{ color: COLORS.ochre }}> · PR</span>}</div>
                  <div className="text-xs mt-0.5" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{e.suggestion.note}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {withSuggestions.length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1.5px solid ${summary.color}` }}>
          <SectionLabel color={summary.color}>How Did That Feel?</SectionLabel>
          <p className="text-xs mb-2.5" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>One tap nudges the suggestions above for next time — no per-set logging needed.</p>
          <div className="flex gap-2">
            {[{ v: "tooHard", l: "Too Hard" }, { v: "right", l: "Just Right" }, { v: "easy", l: "Easy" }].map((opt) => (
              <button key={opt.v} onClick={() => submitCheckIn(opt.v)} disabled={!!rating} className="flex-1 rounded-xl py-2.5 text-xs font-bold" style={{ background: rating === opt.v ? summary.color : COLORS.bg, color: rating === opt.v ? "#fff" : COLORS.muted, fontFamily: "Poppins, sans-serif", opacity: rating && rating !== opt.v ? 0.5 : 1 }}>{opt.l}</button>
            ))}
          </div>
          {rating && <p className="text-[11px] mt-2" style={{ color: summary.color, fontFamily: "Poppins, sans-serif" }}>Got it — applied to next session's targets above.</p>}
        </div>
      )}

      <button onClick={onContinue} className="w-full rounded-2xl py-3.5 text-sm font-bold uppercase tracking-wider" style={{ background: summary.color, color: "#fff", fontFamily: "Poppins, sans-serif" }}>Continue to History</button>
    </div>
  );
}

function ProgressHistoryScreen({ prs, trends, bodyweightLog, flexTrends, history, onDeleteWorkout, mode, setMode }) {
  const maxVol = Math.max(...VOLUME_BY_MUSCLE.map((v) => v.volume));
  const muscleColors = [COLORS.rust, COLORS.sage, COLORS.ochre, COLORS.plum, COLORS.red];
  const sortedBw = [...bodyweightLog].sort((a, b) => (a.date < b.date ? -1 : 1));
  const bwTrend = sortedBw.slice(-8).map((e) => e.weight);
  const latestBw = sortedBw[sortedBw.length - 1];
  const [confirmId, setConfirmId] = useState(null);
  const sortedHistory = [...history].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div className="flex flex-col gap-4 pb-6">
      <Segmented options={[{ value: "trends", label: "Trends" }, { value: "history", label: "History" }]} value={mode} onChange={setMode} color={COLORS.ochre} />
      {mode === "trends" ? (
        <div className="flex flex-col gap-5">
          {latestBw && (
            <div className="rounded-2xl p-4 flex items-center justify-between" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
              <div>
                <div className="text-sm font-semibold" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>Bodyweight</div>
                <div className="text-2xl font-bold" style={{ color: COLORS.rust, fontFamily: "Oswald, sans-serif" }}>{latestBw.weight}kg</div>
                <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{fmtDate(latestBw.date)}</span>
              </div>
              {bwTrend.length >= 2 ? <Sparkline data={bwTrend} color={COLORS.rust} /> : <span className="text-[11px]" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>Log a few more entries to see a trend</span>}
            </div>
          )}
          <div className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
            <h2 className="text-sm uppercase tracking-widest font-bold mb-4" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>Weekly Volume by Muscle Group</h2>
            <div className="flex flex-col gap-3">
              {VOLUME_BY_MUSCLE.map((v, i) => (
                <div key={v.muscle}>
                  <div className="flex justify-between mb-1"><span className="text-xs font-semibold" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>{v.muscle}</span><span className="text-xs font-bold" style={{ color: COLORS.muted, fontFamily: "Oswald, sans-serif" }}>{v.volume.toLocaleString()} kg</span></div>
                  <div className="h-3 rounded-full w-full" style={{ background: COLORS.bg }}><div className="h-3 rounded-full" style={{ width: `${(v.volume / maxVol) * 100}%`, background: muscleColors[i % muscleColors.length] }} /></div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-sm uppercase tracking-widest font-bold mb-3" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>Strength Trends</h2>
            <div className="flex flex-col gap-3">
              {Object.keys(trends).map((name, i) => {
                const pr = prs[name]; const color = muscleColors[i % muscleColors.length];
                return (
                  <div key={name} className="rounded-2xl p-4 flex items-center justify-between" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
                    <div>
                      <div className="text-sm font-semibold" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>{name}</div>
                      <div className="text-2xl font-bold" style={{ color, fontFamily: "Oswald, sans-serif" }}>{pr.weight}kg <span className="text-sm" style={{ color: COLORS.muted }}>x{pr.reps}</span></div>
                      <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: COLORS.ochre, fontFamily: "Poppins, sans-serif" }}>current PR</span>
                    </div>
                    <Sparkline data={trends[name]} color={color} />
                  </div>
                );
              })}
            </div>
          </div>
          {Object.keys(flexTrends).length > 0 && (
            <div>
              <h2 className="text-sm uppercase tracking-widest font-bold mb-3" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>Flexibility Trends</h2>
              <p className="text-[11px] mb-3" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>Logged from the Mobility Work section on Squat/Hinge days.</p>
              <div className="flex flex-col gap-3">
                {Object.keys(flexTrends).map((name, i) => {
                  const data = flexTrends[name]; const best = Math.min(...data); const color = muscleColors[(i + 2) % muscleColors.length];
                  return (
                    <div key={name} className="rounded-2xl p-4 flex items-center justify-between" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
                      <div>
                        <div className="text-sm font-semibold" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>{name}</div>
                        <div className="text-2xl font-bold" style={{ color, fontFamily: "Oswald, sans-serif" }}>{best}cm <span className="text-xs" style={{ color: COLORS.muted }}>best gap</span></div>
                      </div>
                      {data.length >= 2 ? <Sparkline data={data.map((v) => -v)} color={color} /> : <span className="text-[11px]" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>Log more to see a trend</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm uppercase tracking-widest font-bold mb-1" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>Workout History</h2>
          {sortedHistory.map((w) => (
            <div key={w.id} className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
              <div className="flex items-start gap-3">
                <div className="w-1.5 self-stretch rounded-full" style={{ background: w.color }} />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold" style={{ color: COLORS.ink, fontFamily: "Oswald, sans-serif" }}>{w.name}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-semibold" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{fmtDate(w.date)}</span>
                      <button onClick={() => setConfirmId((c) => (c === w.id ? null : w.id))} className="p-1" style={{ color: COLORS.muted, opacity: 0.6 }}><Trash2 size={14} /></button>
                    </div>
                  </div>
                  {confirmId === w.id && (
                    <div className="flex items-center gap-2 rounded-xl px-3 py-2 mt-1.5 mb-1" style={{ background: `${COLORS.red}1A` }}>
                      <span className="text-xs flex-1" style={{ color: COLORS.red, fontFamily: "Poppins, sans-serif" }}>Delete this workout?</span>
                      <button onClick={() => setConfirmId(null)} className="text-xs font-semibold" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>Cancel</button>
                      <button onClick={() => { onDeleteWorkout(w.id); setConfirmId(null); }} className="text-xs font-bold" style={{ color: COLORS.red, fontFamily: "Poppins, sans-serif" }}>Delete</button>
                    </div>
                  )}
                  <div className="flex gap-4 mt-1 mb-2">
                    <span className="text-xs" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{w.duration} min</span>
                    <span className="text-xs" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{w.totalSets} sets</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">{w.exercises.map((ex) => (<span key={ex.name} className="text-[11px] px-2 py-1 rounded-full font-semibold flex items-center gap-1" style={{ background: ex.isPR ? `${COLORS.ochre}22` : COLORS.bg, color: ex.isPR ? COLORS.ochre : COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{ex.isPR && <Trophy size={11} />}{ex.name}</span>))}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Running
// ---------------------------------------------------------------------------
function RunningScreen({ runHistory, weeksDone, onLogRun, onToggleWeek, onDeleteRun, runsPerWeek, setRunsPerWeek, onStartRun }) {
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");
  const macro = CURRENT_MACRO_PHASE;
  const current = longRunSessionForMacroPhase(macro);
  const [type, setType] = useState(RUN_TYPES.includes(current.type) ? current.type : "Long Run");
  const [confirmId, setConfirmId] = useState(null);
  const pace = distance && duration ? parseFloat(duration) / parseFloat(distance) : null;
  const sorted = [...runHistory].sort((a, b) => (a.date < b.date ? 1 : -1));
  const maxDist = Math.max(...runHistory.map((r) => r.distance), 1);
  const maxRuns = macro.phase === "Peak" ? 5 : 3;
  const weekSessions = buildWeekRunSessions(macro, runsPerWeek);
  const thisWeekKey = mondayIso(0);
  const thisWeekDone = !!weeksDone[thisWeekKey];

  const submit = () => {
    if (!distance || !duration) return;
    onLogRun({ id: `r-${Date.now()}`, date: todayISO(), distance: parseFloat(distance), duration: parseFloat(duration), type });
    setDistance(""); setDuration("");
  };

  return (
    <div className="flex flex-col gap-5 pb-6">
      <div className="rounded-2xl p-4" style={{ background: `${MACRO_PHASE_COLOR[macro.phase]}1A`, border: `1.5px solid ${MACRO_PHASE_COLOR[macro.phase]}` }}>
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-widest font-bold" style={{ color: MACRO_PHASE_COLOR[macro.phase], fontFamily: "Poppins, sans-serif" }}>{macro.phase} Phase{macro.totalWeeks ? ` · Wk ${macro.weekInPhase}/${macro.totalWeeks}` : ""}</span>
          <span className="text-xs font-bold" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>{macro.weeksUntilRace}w to race</span>
        </div>
        <p className="text-[11px] mt-1" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>Half Marathon · {HALF_MARATHON_DISTANCE}km target</p>
      </div>

      <div className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
        <h2 className="text-sm uppercase tracking-widest font-bold mb-2" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>Runs Per Week</h2>
        <Segmented options={Array.from({ length: maxRuns }, (_, i) => ({ value: i + 1, label: `${i + 1}x` }))} value={clamp(runsPerWeek, 1, maxRuns)} onChange={(v) => setRunsPerWeek(v)} color={COLORS.ochre} />
        <p className="text-[11px] mt-2" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{macro.phase === "Peak" ? "Peak week — up to 5x unlocked. Extra frequency adds easy aerobic volume, not more hard efforts." : "Sets how many run days show up here and on the Workout calendar for weeks you haven't customized."} Sunday stays reserved for cheer whenever possible.</p>
      </div>

      <div>
        <h2 className="text-sm uppercase tracking-widest font-bold mb-3" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>This Week's Runs</h2>
        <div className="flex flex-col gap-3">
          {weekSessions.map((s, i) => (
            <button key={i} onClick={() => onStartRun(s)} className="rounded-2xl p-4 flex items-center gap-4 text-left active:scale-[0.98] transition-transform" style={{ background: COLORS.card, border: `1.5px solid ${s.color}` }}>
              <div className="w-1.5 self-stretch rounded-full" style={{ background: s.color }} />
              <div className="flex-1">
                <span className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: s.color, fontFamily: "Poppins, sans-serif" }}>{s.role}</span>
                <div className="text-xl font-bold" style={{ color: COLORS.ink, fontFamily: "Oswald, sans-serif" }}>{s.type} — {s.distance}km</div>
                <span className="text-xs" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{s.target}</span>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: `${s.color}1A` }}><Play size={16} style={{ color: s.color }} fill={s.color} /></div>
            </button>
          ))}
        </div>
        <button onClick={() => onToggleWeek(thisWeekKey)} className="mt-3 w-full rounded-xl py-2.5 text-sm font-bold flex items-center justify-center gap-2" style={{ background: thisWeekDone ? COLORS.green : "#fff", color: thisWeekDone ? "#fff" : COLORS.muted, border: thisWeekDone ? "none" : `1.5px solid ${COLORS.border}`, fontFamily: "Poppins, sans-serif" }}>
          {thisWeekDone ? (<><Check size={15} /> Week Marked Done</>) : "Mark This Week Done"}
        </button>
      </div>

      <div>
        <h2 className="text-sm uppercase tracking-widest font-bold mb-2" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>Half Marathon Macrocycle</h2>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {MACRO_PHASE_ORDER.map((p) => {
            const isCurrent = p === macro.phase;
            return (
              <div key={p} className="rounded-xl px-3 py-2 flex flex-col items-center shrink-0" style={{ minWidth: "80px", background: isCurrent ? `${MACRO_PHASE_COLOR[p]}1A` : COLORS.card, border: `1.5px solid ${isCurrent ? MACRO_PHASE_COLOR[p] : COLORS.border}` }}>
                <span className="text-xs font-bold text-center leading-tight" style={{ color: MACRO_PHASE_COLOR[p], fontFamily: "Poppins, sans-serif" }}>{p}</span>
                {isCurrent && <span className="text-[9px] uppercase font-bold mt-0.5" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>you are here</span>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
        <h2 className="text-sm uppercase tracking-widest font-bold mb-3" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>Log a Run</h2>
        <div className="flex gap-1.5 mb-2 flex-wrap">
          {RUN_TYPES.map((t) => (<button key={t} onClick={() => setType(t)} className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: type === t ? RUN_TYPE_COLOR[t] : COLORS.bg, color: type === t ? "#fff" : COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{t.replace(" Run", "")}</button>))}
        </div>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <input type="number" inputMode="decimal" placeholder="Distance (km)" value={distance} onChange={(e) => setDistance(e.target.value)} className="rounded-xl px-3 py-2 text-sm outline-none" style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, fontFamily: "Poppins, sans-serif" }} />
          <input type="number" inputMode="decimal" placeholder="Duration (min)" value={duration} onChange={(e) => setDuration(e.target.value)} className="rounded-xl px-3 py-2 text-sm outline-none" style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, fontFamily: "Poppins, sans-serif" }} />
        </div>
        {pace && <p className="text-xs mb-2" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>Pace: {pace.toFixed(2)} min/km</p>}
        <button onClick={submit} className="w-full rounded-xl py-2.5 text-sm font-bold" style={{ background: RUN_TYPE_COLOR[type], color: "#fff", fontFamily: "Poppins, sans-serif" }}>Log Run</button>
      </div>

      <div className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
        <h2 className="text-sm uppercase tracking-widest font-bold mb-3" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>Recent Distance</h2>
        <div className="flex flex-col gap-2">
          {sorted.slice(0, 6).map((r) => (
            <div key={r.id} className="flex items-center gap-2">
              <span className="text-xs w-14 shrink-0" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{fmtDate(r.date)}</span>
              <div className="flex-1 h-2.5 rounded-full" style={{ background: COLORS.bg }}><div className="h-2.5 rounded-full" style={{ width: `${(r.distance / maxDist) * 100}%`, background: RUN_TYPE_COLOR[r.type] || COLORS.ochre }} /></div>
              <span className="text-xs font-bold w-16 text-right shrink-0" style={{ color: COLORS.ink, fontFamily: "Oswald, sans-serif" }}>{r.distance}km</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm uppercase tracking-widest font-bold mb-2" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>History</h2>
        <div className="flex flex-col gap-2">
          {sorted.map((r) => (
            <div key={r.id} className="rounded-xl p-3 flex flex-col gap-1.5" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold w-14 shrink-0" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{fmtDate(r.date)}</span>
                <Pill color={RUN_TYPE_COLOR[r.type] || COLORS.ochre}>{(r.type || "Run").replace(" Run", "")}</Pill>
                <span className="text-sm font-bold flex-1 text-center" style={{ color: COLORS.ink, fontFamily: "Oswald, sans-serif" }}>{r.distance}km</span>
                <span className="text-xs" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{r.duration}min</span>
                <span className="text-xs" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{(r.duration / r.distance).toFixed(2)}/km</span>
                <button onClick={() => setConfirmId((c) => (c === r.id ? null : r.id))} className="p-1 shrink-0" style={{ color: COLORS.muted, opacity: 0.6 }}><Trash2 size={13} /></button>
              </div>
              {confirmId === r.id && (
                <div className="flex items-center gap-2 rounded-lg px-2.5 py-1.5" style={{ background: `${COLORS.red}1A` }}>
                  <span className="text-xs flex-1" style={{ color: COLORS.red, fontFamily: "Poppins, sans-serif" }}>Delete this run?</span>
                  <button onClick={() => setConfirmId(null)} className="text-xs font-semibold" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>Cancel</button>
                  <button onClick={() => { onDeleteRun(r.id); setConfirmId(null); }} className="text-xs font-bold" style={{ color: COLORS.red, fontFamily: "Poppins, sans-serif" }}>Delete</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
// ---------------------------------------------------------------------------
// Run session — a single planned run, shown like a workout: warm-up, target,
// cooldown, a timer, and a place to log the result. Includes a best-effort
// "share the plan" option since Apple doesn't allow web apps to push
// structured workouts straight into the Watch's Workout app.
// ---------------------------------------------------------------------------
function RunSessionScreen({ runSession, onFinish, onDiscard }) {
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [distance, setDistance] = useState(runSession.distance != null ? String(runSession.distance) : "");
  const [duration, setDuration] = useState("");
  const [shareMsg, setShareMsg] = useState("");

  useEffect(() => { if (paused) return; const id = setInterval(() => setElapsed((e) => e + 1), 1000); return () => clearInterval(id); }, [paused]);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  const pacing = pacingStrategyFor(runSession.type);

  const shareText = `${runSession.type} — ${runSession.distance}km\nTarget: ${runSession.target}\n${runSession.description || ""}\nWarm-up: ${runSession.warmup || "Easy jog to build into pace"}\nCooldown: ${runSession.cooldown || "Easy walk + stretch"}`;

  const shareRun = async () => {
    setShareMsg("");
    if (navigator.share) {
      try { await navigator.share({ title: `${runSession.type} — ${runSession.distance}km`, text: shareText }); }
      catch (e) { /* cancelled or unsupported — no action needed */ }
      return;
    }
    try {
      await navigator.clipboard.writeText(shareText);
      setShareMsg("Copied — paste it into Notes or Reminders so it's on your Watch to glance at.");
    } catch (e) {
      setShareMsg("Couldn't copy automatically — you can select and copy the text above manually.");
    }
  };

  const finish = () => {
    const finalDuration = duration ? parseFloat(duration) : Math.round((elapsed / 60) * 10) / 10;
    const finalDistance = distance ? parseFloat(distance) : runSession.distance;
    onFinish({ id: `r-${Date.now()}`, date: todayISO(), distance: finalDistance, duration: finalDuration || 1, type: runSession.type });
  };

  return (
    <div className="flex flex-col gap-5 pb-16">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</div>
          <div className="text-2xl font-bold" style={{ color: COLORS.ink, fontFamily: "Oswald, sans-serif" }}>{runSession.type}</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setPaused((p) => !p)} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: `${runSession.color}1A`, color: runSession.color }}>{paused ? <Play size={15} fill={runSession.color} /> : <Pause size={15} />}</button>
          <div className="text-right">
            <div className="text-3xl font-bold tabular-nums" style={{ color: paused ? COLORS.muted : runSession.color, fontFamily: "Oswald, sans-serif" }}>{mm}:{ss}</div>
            <span className="text-[10px] uppercase tracking-widest" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{paused ? "paused" : "elapsed"}</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1.5px solid ${runSession.color}` }}>
        <span className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: runSession.color, fontFamily: "Poppins, sans-serif" }}>{runSession.role || "Run"} · {runSession.distance}km target</span>
        <p className="text-sm mt-1" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>{runSession.target}</p>
        {runSession.description && <p className="text-xs mt-1" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{runSession.description}</p>}
      </div>

      <div className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
        <SectionLabel color={runSession.color}>Pacing Strategy</SectionLabel>
        <p className="text-sm leading-relaxed" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>{pacing.strategy}</p>
      </div>

      <div className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
        <SectionLabel color={runSession.color}>Warm-up</SectionLabel>
        <p className="text-sm" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>{runSession.warmup || "10–15 min easy jog, building into pace"}</p>
      </div>
      <div className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
        <SectionLabel color={runSession.color}>Cooldown</SectionLabel>
        <p className="text-sm" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>{runSession.cooldown || "5 min walk + light stretching"}</p>
      </div>
      <div className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
        <SectionLabel color={COLORS.ochre}>Helpful Tools</SectionLabel>
        <ul className="flex flex-col gap-1.5">
          {pacing.tools.map((t, i) => (<li key={i} className="text-xs leading-relaxed flex gap-2" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}><span style={{ color: COLORS.ochre }}>·</span><span>{t}</span></li>))}
        </ul>
      </div>

      <div className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
        <SectionLabel color={runSession.color}>Log Your Result</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          <input type="number" inputMode="decimal" placeholder="Distance (km)" value={distance} onChange={(e) => setDistance(e.target.value)} className="rounded-xl px-3 py-2 text-sm outline-none" style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, fontFamily: "Poppins, sans-serif" }} />
          <input type="number" inputMode="decimal" placeholder="Duration (min)" value={duration} onChange={(e) => setDuration(e.target.value)} className="rounded-xl px-3 py-2 text-sm outline-none" style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, fontFamily: "Poppins, sans-serif" }} />
        </div>
        <p className="text-[11px] mt-2" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>Leave blank to use the target distance and the timer above.</p>
      </div>

      <div className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
        <SectionLabel color={COLORS.plum}>Take It With You</SectionLabel>
        <p className="text-xs mb-2 leading-relaxed" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>There's no way for a web app like this one to push a structured workout straight into the Apple Watch Workout app — that requires a native app with HealthKit access, which Apple doesn't open up to browser-based tools. This shares the plan as text instead, so you can drop it in Notes for a quick glance before you head out.</p>
        <button onClick={shareRun} className="w-full rounded-xl py-2.5 text-sm font-bold" style={{ background: `${COLORS.plum}1A`, color: COLORS.plum, fontFamily: "Poppins, sans-serif" }}>Share Run Details</button>
        {shareMsg && <p className="text-xs mt-2" style={{ color: COLORS.plum, fontFamily: "Poppins, sans-serif" }}>{shareMsg}</p>}
      </div>

      <div className="fixed bottom-16 left-0 right-0 px-4 py-3 flex gap-3" style={{ background: `${COLORS.bg}F5` }}>
        <button onClick={onDiscard} className="flex-1 rounded-2xl py-3.5 text-sm font-bold uppercase tracking-wider" style={{ background: "#fff", color: COLORS.red, border: `1.5px solid ${COLORS.red}`, fontFamily: "Poppins, sans-serif" }}>Discard</button>
        <button onClick={finish} className="flex-1 rounded-2xl py-3.5 text-sm font-bold uppercase tracking-wider" style={{ background: runSession.color, color: "#fff", fontFamily: "Poppins, sans-serif" }}>Finish</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Nutrition — weekly plan linked to Notion, with leftover-lunch logic and
// an ingredients-in / macros-out editor for logging what was actually eaten.
// ---------------------------------------------------------------------------
function MealEditor({ initial, onCancel, onSave }) {
  const [name, setName] = useState(initial?.name || "");
  const [rows, setRows] = useState(initial?.ingredients?.length ? initial.ingredients : [""]);
  const [kcal, setKcal] = useState(initial?.kcal != null ? String(initial.kcal) : "");
  const [protein, setProtein] = useState(initial?.protein != null ? String(initial.protein) : "");
  const [error, setError] = useState("");
  const [asUsual, setAsUsual] = useState(false);

  const updateRow = (i, val) => setRows((prev) => prev.map((r, ri) => (ri === i ? val : r)));
  const addRow = () => setRows((prev) => [...prev, ""]);
  const removeRow = (i) => setRows((prev) => prev.filter((_, ri) => ri !== i));

  const save = () => {
    if (!name.trim()) { setError("Add a meal name."); return; }
    if (!kcal || !protein) { setError("Add calories and protein."); return; }
    setError("");
    onSave({ name: name.trim(), ingredients: rows.filter((r) => r.trim()), kcal: Math.round(parseFloat(kcal)), protein: Math.round(parseFloat(protein)) }, asUsual);
  };

  return (
    <div className="rounded-2xl p-4 flex flex-col gap-2.5" style={{ background: COLORS.bg, border: `1.5px solid ${COLORS.green}` }}>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Meal name" className="w-full rounded-xl px-3 py-2 text-sm font-semibold outline-none" style={{ background: "#fff", border: `1px solid ${COLORS.border}`, fontFamily: "Poppins, sans-serif" }} />
      <span className="text-[10px] uppercase font-bold tracking-wide" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>Ingredients (optional, one per line)</span>
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-2">
          <input value={r} onChange={(e) => updateRow(i, e.target.value)} placeholder="e.g. 150g firm tofu" className="flex-1 rounded-xl px-3 py-2 text-sm outline-none" style={{ background: "#fff", border: `1px solid ${COLORS.border}`, fontFamily: "Poppins, sans-serif" }} />
          {rows.length > 1 && (<button onClick={() => removeRow(i)} style={{ color: COLORS.muted }}><X size={14} /></button>)}
        </div>
      ))}
      <button onClick={addRow} className="text-xs font-semibold self-start" style={{ color: COLORS.green, fontFamily: "Poppins, sans-serif" }}>+ Add ingredient</button>
      <div className="grid grid-cols-2 gap-2 mt-1">
        <input type="number" inputMode="decimal" value={kcal} onChange={(e) => setKcal(e.target.value)} placeholder="Calories" className="rounded-xl px-3 py-2 text-sm outline-none" style={{ background: "#fff", border: `1px solid ${COLORS.border}`, fontFamily: "Poppins, sans-serif" }} />
        <input type="number" inputMode="decimal" value={protein} onChange={(e) => setProtein(e.target.value)} placeholder="Protein (g)" className="rounded-xl px-3 py-2 text-sm outline-none" style={{ background: "#fff", border: `1px solid ${COLORS.border}`, fontFamily: "Poppins, sans-serif" }} />
      </div>
      <label className="flex items-center gap-2 mt-1 text-xs" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>
        <input type="checkbox" checked={asUsual} onChange={(e) => setAsUsual(e.target.checked)} />
        Make this my usual breakfast going forward
      </label>
      {error && <p className="text-xs" style={{ color: COLORS.red, fontFamily: "Poppins, sans-serif" }}>{error}</p>}
      <div className="flex gap-2 mt-1">
        <button onClick={onCancel} className="flex-1 rounded-xl py-2 text-xs font-bold" style={{ background: "#fff", color: COLORS.muted, border: `1px solid ${COLORS.border}`, fontFamily: "Poppins, sans-serif" }}>Cancel</button>
        <button onClick={save} className="flex-1 rounded-xl py-2 text-xs font-bold" style={{ background: COLORS.green, color: "#fff", fontFamily: "Poppins, sans-serif" }}>Save</button>
      </div>
    </div>
  );
}
function MealCard({ meal, color, onEdit, onResetToUsual }) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (<MealEditor initial={meal} onCancel={() => setEditing(false)} onSave={(m, asUsual) => { onEdit(m, asUsual); setEditing(false); }} />);
  }
  return (
    <div className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Pill color={color}>{meal.type}</Pill>
          {meal.leftover && <Pill color={COLORS.ochre}>Leftover</Pill>}
          {meal.isUsual && <Pill>Usual</Pill>}
          {meal.edited && <Pill color={COLORS.sage}>Logged</Pill>}
        </div>
        <div className="text-right shrink-0">
          <div className="text-sm font-bold" style={{ color: COLORS.ink, fontFamily: "Oswald, sans-serif" }}>{meal.kcal} kcal</div>
          <div className="text-[11px]" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{meal.protein}g protein</div>
        </div>
      </div>
      <div className="text-base font-bold mt-1" style={{ color: COLORS.ink, fontFamily: "Oswald, sans-serif" }}>{meal.name}</div>
      {meal.leftover && <p className="text-xs mt-0.5" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>Cooked the evening before — {meal.leftoverFrom}</p>}
      {meal.desc && <p className="text-xs mt-1 leading-relaxed" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{meal.desc}</p>}
      {meal.ingredients && meal.ingredients.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {meal.ingredients.map((ing, i) => (<li key={i} className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: COLORS.bg, color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{ing}</li>))}
        </ul>
      )}
      <div className="flex items-center gap-3 mt-2.5">
        <button onClick={() => setEditing(true)} className="text-xs font-semibold" style={{ color: color, fontFamily: "Poppins, sans-serif" }}>I ate something different →</button>
        {onResetToUsual && <button onClick={onResetToUsual} className="text-xs font-medium" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>Reset to usual</button>}
      </div>
    </div>
  );
}
function NutritionScreen({ usualBreakfast, setUsualBreakfast, dayOverrides, setDayOverrides, getSchedule }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [showGrocery, setShowGrocery] = useState(false);
  const weekDates = getWeekDates(addWeeks(new Date(), weekOffset));
  const todayIso = todayISO();
  const initialIndex = weekDates.findIndex((d) => d.iso === todayIso);
  const [dayIndex, setDayIndex] = useState(initialIndex >= 0 ? initialIndex : 0);
  const dayColor = COLORS.green;
  const activeDate = weekDates[dayIndex];
  const iso = activeDate.iso;
  const prevIso = addDaysIso(iso, -1);

  const schedule = getSchedule ? getSchedule(weekOffset) : null;
  const macro = computeMacroPhase(weekOffset);
  const runAssignments = schedule ? weekRunAssignments(schedule, macro) : {};
  const daySessions = schedule ? (schedule[activeDate.weekday] || []) : [];
  const dayRunSession = runAssignments[activeDate.weekday];
  const load = nutritionLoadForDay(daySessions, dayRunSession);
  const adjustedKcal = DAILY_TARGET.kcal + load.kcalAdjust;
  const adjustedProtein = DAILY_TARGET.protein + Math.round(load.kcalAdjust / 40);

  const overrideFor = (type, dateIso) => dayOverrides[`${dateIso}:${type}`];

  const resolveDinner = (dateIso, planIdx) => {
    const ov = overrideFor("dinner", dateIso);
    if (ov) return { ...ov, type: "Dinner", edited: true };
    const fallback = MEAL_PLAN[planIdx].meals.find((m) => m.type === "Dinner");
    return { ...fallback };
  };
  const resolveLunch = () => {
    const ov = overrideFor("lunch", iso);
    if (ov) return { ...ov, type: "Lunch", edited: true };
    const prevPlanIdx = (dayIndex + 6) % 7;
    const prevDinner = resolveDinner(prevIso, prevPlanIdx);
    return { ...prevDinner, type: "Lunch", leftover: true, leftoverFrom: `${fmtDate(prevIso)}'s dinner`, edited: false };
  };
  const resolveBreakfast = () => {
    const ov = overrideFor("breakfast", iso);
    if (ov) return { ...ov, type: "Breakfast", edited: true };
    return { ...usualBreakfast, type: "Breakfast", isUsual: true };
  };
  const resolveSnack = () => {
    const ov = overrideFor("snack", iso);
    if (ov) return { ...ov, type: "Snack", edited: true };
    return { ...MEAL_PLAN[dayIndex].meals.find((m) => m.type === "Snack") };
  };

  const breakfast = resolveBreakfast();
  const lunch = resolveLunch();
  const dinner = resolveDinner(iso, dayIndex);
  const snack = resolveSnack();
  const meals = [breakfast, lunch, snack, dinner];
  const totals = meals.reduce((acc, m) => ({ kcal: acc.kcal + m.kcal, protein: acc.protein + m.protein }), { kcal: 0, protein: 0 });

  const saveOverride = (type, meal, asUsual) => {
    setDayOverrides((prev) => ({ ...prev, [`${iso}:${type}`]: meal }));
    if (type === "breakfast" && asUsual) setUsualBreakfast(meal);
  };
  const resetBreakfast = () => setDayOverrides((prev) => { const next = { ...prev }; delete next[`${iso}:breakfast`]; return next; });

  return (
    <div className="flex flex-col gap-5 pb-6">
      <div className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
        <h2 className="text-sm uppercase tracking-widest font-bold mb-1" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>Daily Targets</h2>
        <p className="text-xs mb-3" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>Vegan, gluten-conscious. Dinner is cooked each evening and carries over as the next day's lunch automatically.</p>
        <div className="flex gap-3">
          <StatBox label="Calories" value={`${adjustedKcal}`} icon={Flame} accent={COLORS.rust} />
          <StatBox label="Protein" value={`${adjustedProtein}g`} icon={Dumbbell} accent={COLORS.sage} />
        </div>
        <p className="text-[11px] mt-2.5" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{load.note}</p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm uppercase tracking-widest font-bold" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>{weekOffset === 0 ? "This Week" : `Week of ${fmtDate(weekDates[0].iso)}`}</h2>
          <div className="flex items-center gap-1">
            <button onClick={() => { setWeekOffset((o) => o - 1); setDayIndex(6); }} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ color: COLORS.muted }}><ChevronLeft size={16} /></button>
            <button onClick={() => { setWeekOffset((o) => o + 1); setDayIndex(0); }} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ color: COLORS.muted }}><ChevronRight size={16} /></button>
          </div>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {weekDates.map((d, i) => {
            const active = i === dayIndex; const isToday = d.iso === todayIso;
            return (
              <button key={d.iso} onClick={() => setDayIndex(i)} className="rounded-xl px-3 py-2 flex flex-col items-center shrink-0" style={{ minWidth: "56px", background: active ? dayColor : COLORS.card, border: `1.5px solid ${active ? dayColor : isToday ? dayColor : COLORS.border}` }}>
                <span className="text-[10px] font-bold uppercase" style={{ color: active ? "#fff" : COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{d.label}</span>
                <span className="text-[10px]" style={{ color: active ? "#fff" : COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{d.dayNum}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl px-4 py-2.5 flex items-center justify-between" style={{ background: `${dayColor}1A`, border: `1px solid ${dayColor}` }}>
        <span className="text-xs font-semibold" style={{ color: dayColor, fontFamily: "Poppins, sans-serif" }}>{fmtDate(iso)}</span>
        <span className="text-xs font-bold" style={{ color: COLORS.ink, fontFamily: "Oswald, sans-serif" }}>{totals.kcal} / {adjustedKcal} kcal · {totals.protein} / {adjustedProtein}g protein</span>
      </div>

      <div className="flex flex-col gap-3">
        <MealCard meal={breakfast} color={dayColor} onEdit={(m, asUsual) => saveOverride("breakfast", m, asUsual)} onResetToUsual={overrideFor("breakfast", iso) ? resetBreakfast : null} />
        <MealCard meal={lunch} color={dayColor} onEdit={(m) => saveOverride("lunch", m)} />
        <MealCard meal={snack} color={dayColor} onEdit={(m) => saveOverride("snack", m)} />
        <MealCard meal={dinner} color={dayColor} onEdit={(m) => saveOverride("dinner", m)} />
      </div>

      <div className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
        <button onClick={() => setShowGrocery((s) => !s)} className="w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet size={15} style={{ color: COLORS.ochre }} />
            <span className="text-sm font-bold" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>Weekly Grocery List — ~€50</span>
          </div>
          {showGrocery ? <ChevronUp size={15} style={{ color: COLORS.muted }} /> : <ChevronDown size={15} style={{ color: COLORS.muted }} />}
        </button>
        {showGrocery && (
          <div className="flex flex-col gap-2.5 mt-3">
            {GROCERY_LIST.map((g) => (
              <div key={g.category} className="flex items-start justify-between gap-3 rounded-xl p-3" style={{ background: COLORS.bg }}>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wide" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>{g.category}</div>
                  <div className="text-xs mt-0.5" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{g.items}</div>
                </div>
                <span className="text-sm font-bold shrink-0" style={{ color: COLORS.ochre, fontFamily: "Oswald, sans-serif" }}>{g.est}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exercise Overview — a library of every exercise grouped by movement
// pattern, plus a template editor that keeps the Workout tab in sync.
// ---------------------------------------------------------------------------
function CustomExerciseForm({ onCancel, onSave }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("squat");
  const [muscle, setMuscle] = useState("");
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState("");
  const [error, setError] = useState("");

  const save = () => {
    if (!name.trim()) { setError("Add a name."); return; }
    onSave({ id: `custom-${Date.now()}`, name: name.trim(), category, muscle: muscle.trim() || "—", sets: clamp(parseInt(sets) || 3, 1, 6), reps: reps.trim() || "—", custom: true });
  };

  return (
    <div className="rounded-2xl p-4 flex flex-col gap-2.5" style={{ background: COLORS.bg, border: `1.5px solid ${COLORS.sage}` }}>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Exercise name" className="w-full rounded-xl px-3 py-2 text-sm outline-none" style={{ background: "#fff", border: `1px solid ${COLORS.border}`, fontFamily: "Poppins, sans-serif" }} />
      <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-xl px-3 py-2 text-sm outline-none" style={{ background: "#fff", border: `1px solid ${COLORS.border}`, fontFamily: "Poppins, sans-serif" }}>
        {CATEGORY_ORDER.map((k) => (<option key={k} value={k}>{CATEGORY_META[k].label}</option>))}
      </select>
      <input value={muscle} onChange={(e) => setMuscle(e.target.value)} placeholder="Muscle group" className="w-full rounded-xl px-3 py-2 text-sm outline-none" style={{ background: "#fff", border: `1px solid ${COLORS.border}`, fontFamily: "Poppins, sans-serif" }} />
      <div className="grid grid-cols-2 gap-2">
        <input type="number" min="1" max="6" value={sets} onChange={(e) => setSets(e.target.value)} placeholder="Default sets" className="rounded-xl px-3 py-2 text-sm outline-none" style={{ background: "#fff", border: `1px solid ${COLORS.border}`, fontFamily: "Poppins, sans-serif" }} />
        <input value={reps} onChange={(e) => setReps(e.target.value)} placeholder="Default reps e.g. 10-12" className="rounded-xl px-3 py-2 text-sm outline-none" style={{ background: "#fff", border: `1px solid ${COLORS.border}`, fontFamily: "Poppins, sans-serif" }} />
      </div>
      {error && <p className="text-xs" style={{ color: COLORS.red, fontFamily: "Poppins, sans-serif" }}>{error}</p>}
      <div className="flex gap-2 mt-1">
        <button onClick={onCancel} className="flex-1 rounded-xl py-2 text-xs font-bold" style={{ background: "#fff", color: COLORS.muted, border: `1px solid ${COLORS.border}`, fontFamily: "Poppins, sans-serif" }}>Cancel</button>
        <button onClick={save} className="flex-1 rounded-xl py-2 text-xs font-bold" style={{ background: COLORS.sage, color: "#fff", fontFamily: "Poppins, sans-serif" }}>Save Exercise</button>
      </div>
    </div>
  );
}
function CustomWarmupForm({ onCancel, onSave }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const save = () => { if (!name.trim()) { setError("Add a name."); return; } onSave({ id: `wu-custom-${Date.now()}`, name: name.trim(), custom: true }); };
  return (
    <div className="rounded-2xl p-4 flex flex-col gap-2.5" style={{ background: COLORS.bg, border: `1.5px solid ${COLORS.sage}` }}>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Warmup move e.g. 'Ankle circles x10/side'" className="w-full rounded-xl px-3 py-2 text-sm outline-none" style={{ background: "#fff", border: `1px solid ${COLORS.border}`, fontFamily: "Poppins, sans-serif" }} />
      {error && <p className="text-xs" style={{ color: COLORS.red, fontFamily: "Poppins, sans-serif" }}>{error}</p>}
      <div className="flex gap-2 mt-1">
        <button onClick={onCancel} className="flex-1 rounded-xl py-2 text-xs font-bold" style={{ background: "#fff", color: COLORS.muted, border: `1px solid ${COLORS.border}`, fontFamily: "Poppins, sans-serif" }}>Cancel</button>
        <button onClick={save} className="flex-1 rounded-xl py-2 text-xs font-bold" style={{ background: COLORS.sage, color: "#fff", fontFamily: "Poppins, sans-serif" }}>Save</button>
      </div>
    </div>
  );
}
function CustomPrehabForm({ onCancel, onSave, idPrefix = "prehab-custom", accent = COLORS.plum, placeholder = "Prehab exercise name" }) {
  const [name, setName] = useState("");
  const [sets, setSets] = useState(2);
  const [reps, setReps] = useState("");
  const [error, setError] = useState("");
  const save = () => { if (!name.trim()) { setError("Add a name."); return; } onSave({ id: `${idPrefix}-${Date.now()}`, name: name.trim(), targetSets: clamp(parseInt(sets) || 2, 1, 5), targetReps: reps.trim() || "—", custom: true }); };
  return (
    <div className="rounded-2xl p-4 flex flex-col gap-2.5" style={{ background: COLORS.bg, border: `1.5px solid ${accent}` }}>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder={placeholder} className="w-full rounded-xl px-3 py-2 text-sm outline-none" style={{ background: "#fff", border: `1px solid ${COLORS.border}`, fontFamily: "Poppins, sans-serif" }} />
      <div className="grid grid-cols-2 gap-2">
        <input type="number" min="1" max="5" value={sets} onChange={(e) => setSets(e.target.value)} placeholder="Sets" className="rounded-xl px-3 py-2 text-sm outline-none" style={{ background: "#fff", border: `1px solid ${COLORS.border}`, fontFamily: "Poppins, sans-serif" }} />
        <input value={reps} onChange={(e) => setReps(e.target.value)} placeholder="Reps e.g. 15/side" className="rounded-xl px-3 py-2 text-sm outline-none" style={{ background: "#fff", border: `1px solid ${COLORS.border}`, fontFamily: "Poppins, sans-serif" }} />
      </div>
      {error && <p className="text-xs" style={{ color: COLORS.red, fontFamily: "Poppins, sans-serif" }}>{error}</p>}
      <div className="flex gap-2 mt-1">
        <button onClick={onCancel} className="flex-1 rounded-xl py-2 text-xs font-bold" style={{ background: "#fff", color: COLORS.muted, border: `1px solid ${COLORS.border}`, fontFamily: "Poppins, sans-serif" }}>Cancel</button>
        <button onClick={save} className="flex-1 rounded-xl py-2 text-xs font-bold" style={{ background: accent, color: "#fff", fontFamily: "Poppins, sans-serif" }}>Save</button>
      </div>
    </div>
  );
}
function ExerciseLibraryList({ library, warmupLibrary, prehabLibrary, plyoLibrary, onAddCustom, onDeleteCustom, onAddCustomWarmup, onDeleteCustomWarmup, onAddCustomPrehab, onDeleteCustomPrehab, onAddCustomPlyo, onDeleteCustomPlyo }) {
  const [showPlyoForm, setShowPlyoForm] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showWarmupForm, setShowWarmupForm] = useState(false);
  const [showPrehabForm, setShowPrehabForm] = useState(false);
  return (
    <div className="flex flex-col gap-5 pb-6">
      <button onClick={() => setShowForm((s) => !s)} className="w-full rounded-2xl py-3 text-sm font-semibold flex items-center justify-center gap-2" style={{ background: `${COLORS.sage}1A`, color: COLORS.sage, fontFamily: "Poppins, sans-serif" }}><Plus size={16} /> {showForm ? "Cancel" : "Add Custom Exercise"}</button>
      {showForm && <CustomExerciseForm onCancel={() => setShowForm(false)} onSave={(ex) => { onAddCustom(ex); setShowForm(false); }} />}
      {CATEGORY_ORDER.map((cat) => {
        const items = library.filter((l) => l.category === cat);
        if (!items.length) return null;
        const meta = CATEGORY_META[cat];
        return (
          <div key={cat}>
            <SectionLabel color={meta.color}>{meta.label}</SectionLabel>
            <div className="flex flex-col gap-2">
              {items.map((ex) => (
                <div key={ex.id} className="rounded-xl p-3 flex items-center justify-between gap-2" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>{ex.name}{ex.custom && <span style={{ color: COLORS.ochre }}> · custom</span>}</div>
                    <div className="text-xs" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{ex.muscle} · {ex.sets} sets x {ex.reps}</div>
                  </div>
                  {ex.custom && (<button onClick={() => onDeleteCustom(ex.id)} className="p-1.5 shrink-0" style={{ color: COLORS.muted, opacity: 0.6 }}><Trash2 size={14} /></button>)}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <div>
        <SectionLabel color={COLORS.sage}>Warmup Moves</SectionLabel>
        <p className="text-[11px] mb-2" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>These populate each day's warmup checklist in "Edit Workouts" below.</p>
        <button onClick={() => setShowWarmupForm((s) => !s)} className="w-full rounded-2xl py-2.5 text-xs font-semibold flex items-center justify-center gap-2 mb-2" style={{ background: `${COLORS.sage}1A`, color: COLORS.sage, fontFamily: "Poppins, sans-serif" }}><Plus size={14} /> {showWarmupForm ? "Cancel" : "Add Warmup Move"}</button>
        {showWarmupForm && <CustomWarmupForm onCancel={() => setShowWarmupForm(false)} onSave={(w) => { onAddCustomWarmup(w); setShowWarmupForm(false); }} />}
        <div className="flex flex-col gap-2 mt-2">
          {warmupLibrary.map((w) => (
            <div key={w.id} className="rounded-xl p-3 flex items-center justify-between gap-2" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
              <div className="text-sm font-semibold" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>{w.name}{w.custom && <span style={{ color: COLORS.ochre }}> · custom</span>}</div>
              {w.custom && (<button onClick={() => onDeleteCustomWarmup(w.id)} className="p-1.5 shrink-0" style={{ color: COLORS.muted, opacity: 0.6 }}><Trash2 size={14} /></button>)}
            </div>
          ))}
        </div>
      </div>

      <div>
        <SectionLabel color={COLORS.plum}>Prehab Exercises</SectionLabel>
        <p className="text-[11px] mb-2" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>Pure prehab, done first in the session — core work now lives in the main library's Core categories above and is swapped in the same way as accessories.</p>
        <button onClick={() => setShowPrehabForm((s) => !s)} className="w-full rounded-2xl py-2.5 text-xs font-semibold flex items-center justify-center gap-2 mb-2" style={{ background: `${COLORS.plum}1A`, color: COLORS.plum, fontFamily: "Poppins, sans-serif" }}><Plus size={14} /> {showPrehabForm ? "Cancel" : "Add Prehab Exercise"}</button>
        {showPrehabForm && <CustomPrehabForm onCancel={() => setShowPrehabForm(false)} onSave={(p) => { onAddCustomPrehab(p); setShowPrehabForm(false); }} />}
        <div className="flex flex-col gap-2 mt-2">
          {prehabLibrary.map((p) => (
            <div key={p.id} className="rounded-xl p-3 flex items-center justify-between gap-2" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
              <div>
                <div className="text-sm font-semibold" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>{p.name}{p.custom && <span style={{ color: COLORS.ochre }}> · custom</span>}</div>
                <div className="text-xs" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{p.targetSets} sets x {p.targetReps}</div>
              </div>
              {p.custom && (<button onClick={() => onDeleteCustomPrehab(p.id)} className="p-1.5 shrink-0" style={{ color: COLORS.muted, opacity: 0.6 }}><Trash2 size={14} /></button>)}
            </div>
          ))}
        </div>
      </div>

      <div>
        <SectionLabel color={COLORS.ochre}>Power / Plyo Exercises</SectionLabel>
        <p className="text-[11px] mb-2" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>One explosive movement per workout, done right after prehab. Swap it per day in "Edit Workouts".</p>
        <button onClick={() => setShowPlyoForm((v) => !v)} className="w-full rounded-2xl py-2.5 text-xs font-semibold flex items-center justify-center gap-2 mb-2" style={{ background: `${COLORS.ochre}1A`, color: COLORS.ochre, fontFamily: "Poppins, sans-serif" }}><Plus size={14} /> {showPlyoForm ? "Cancel" : "Add Plyo Exercise"}</button>
        {showPlyoForm && <CustomPrehabForm idPrefix="plyo-custom" accent={COLORS.ochre} placeholder="Plyo / power exercise name" onCancel={() => setShowPlyoForm(false)} onSave={(p) => { onAddCustomPlyo(p); setShowPlyoForm(false); }} />}
        <div className="flex flex-col gap-2 mt-2">
          {plyoLibrary.map((p) => (
            <div key={p.id} className="rounded-xl p-3 flex items-center justify-between gap-2" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
              <div>
                <div className="text-sm font-semibold" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>{p.name}{p.custom && <span style={{ color: COLORS.ochre }}> · custom</span>}</div>
                <div className="text-xs" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{p.targetSets} sets x {p.targetReps}</div>
              </div>
              {p.custom && (<button onClick={() => onDeleteCustomPlyo(p.id)} className="p-1.5 shrink-0" style={{ color: COLORS.muted, opacity: 0.6 }}><Trash2 size={14} /></button>)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
function SlotRow({ label, ex, onChange, onDelete }) {
  return (
    <div className="rounded-xl p-3 flex items-center justify-between gap-2" style={{ background: COLORS.bg }}>
      <div className="min-w-0">
        <div className="text-[10px] uppercase font-bold tracking-wide" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{label}</div>
        <div className="text-sm font-semibold truncate" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>{ex.name}</div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button onClick={onChange} className="text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: `${COLORS.sage}1A`, color: COLORS.sage, fontFamily: "Poppins, sans-serif" }}>Change</button>
        {onDelete && <button onClick={onDelete} className="p-1.5" style={{ color: COLORS.muted, opacity: 0.6 }} title="Remove from this workout"><Trash2 size={14} /></button>}
      </div>
    </div>
  );
}
function SlotPicker({ library, category, onPick, onClose }) {
  const [showAll, setShowAll] = useState(!category);
  const isCore = category && category.startsWith("core");
  const matches = library.filter((l) => (showAll ? true : isCore ? l.category.startsWith("core") : l.category === category));
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(59,52,43,0.4)" }} onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl p-4 max-h-[70vh] flex flex-col" style={{ background: COLORS.card }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-bold uppercase tracking-widest" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>Choose Exercise</span>
          <button onClick={onClose} style={{ color: COLORS.muted }}><X size={18} /></button>
        </div>
        <button onClick={() => setShowAll((s) => !s)} className="text-xs font-medium self-start mb-2" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{showAll ? "Show matching category only" : "Show all exercises"}</button>
        <div className="flex flex-col gap-1.5 overflow-y-auto">
          {matches.map((ex) => (
            <button key={ex.id} onClick={() => onPick(ex.id)} className="flex items-center justify-between rounded-xl px-3 py-2.5 text-left" style={{ background: COLORS.bg }}>
              <span className="text-sm font-medium" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>{ex.name}</span>
              <Pill color={CATEGORY_META[ex.category]?.color}>{ex.muscle}</Pill>
            </button>
          ))}
          {!matches.length && <p className="text-xs px-1" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>No exercises here yet — add one from the Library tab.</p>}
        </div>
      </div>
    </div>
  );
}
function PrehabPicker({ prehabLibrary, onPick, onClose, title = "Choose Prehab Exercise" }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(59,52,43,0.4)" }} onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl p-4 max-h-[70vh] flex flex-col" style={{ background: COLORS.card }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-bold uppercase tracking-widest" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>{title}</span>
          <button onClick={onClose} style={{ color: COLORS.muted }}><X size={18} /></button>
        </div>
        <div className="flex flex-col gap-1.5 overflow-y-auto">
          {prehabLibrary.map((p) => (
            <button key={p.id} onClick={() => onPick(p.id)} className="flex items-center justify-between rounded-xl px-3 py-2.5 text-left" style={{ background: COLORS.bg }}>
              <span className="text-sm font-medium" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>{p.name}</span>
              <span className="text-xs" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{p.targetSets}x{p.targetReps}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
function WarmupPicker({ warmupLibrary, currentIds, onPick, onClose }) {
  const available = warmupLibrary.filter((w) => !currentIds.includes(w.id));
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(59,52,43,0.4)" }} onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl p-4 max-h-[70vh] flex flex-col" style={{ background: COLORS.card }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-bold uppercase tracking-widest" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>Add Warmup Move</span>
          <button onClick={onClose} style={{ color: COLORS.muted }}><X size={18} /></button>
        </div>
        <div className="flex flex-col gap-1.5 overflow-y-auto">
          {available.map((w) => (<button key={w.id} onClick={() => onPick(w.id)} className="text-left text-sm px-3 py-2.5 rounded-xl" style={{ background: COLORS.bg, color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>{w.name}</button>))}
          {!available.length && <p className="text-xs px-1" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>All warmup library moves are already on this day.</p>}
        </div>
      </div>
    </div>
  );
}
const WEEKDAY_BUTTONS = [{ wd: 1, label: "Mo" }, { wd: 2, label: "Di" }, { wd: 3, label: "Mi" }, { wd: 4, label: "Do" }, { wd: 5, label: "Fr" }, { wd: 6, label: "Sa" }, { wd: 0, label: "So" }];
function TemplateEditor({ dayTemplates, library, warmupLibrary, prehabLibrary, plyoLibrary, dayWeekdayMap, onUpdateSlot, onUpdatePrehabSlot, onUpdatePlyo, onUpdateFinisher, onAddSlot, onRemoveSlot, onSetWeekday, onAddWarmup, onRemoveWarmup }) {
  const [split, setSplit] = useState(3);
  const [expanded, setExpanded] = useState(null);
  const [picking, setPicking] = useState(null);
  const [adding, setAdding] = useState(null);
  const [pickingPrehab, setPickingPrehab] = useState(null);
  const [pickingPlyo, setPickingPlyo] = useState(null);
  const [pickingWarmup, setPickingWarmup] = useState(null);
  const days = dayTemplates[String(split)];
  const weekdayFor = (dayId) => ({ ...(DEFAULT_DAY_WEEKDAYS[String(split)] || {}), ...((dayWeekdayMap && dayWeekdayMap[String(split)]) || {}) })[dayId];

  const groups = [
    { key: "mainLifts", title: "Main Lifts", label: (s, i) => `Main Lift ${i + 1}`, addCategory: null },
    { key: "secondaryLifts", title: "Secondary Lifts", label: (s, i) => `Secondary ${i + 1}`, addCategory: null },
    { key: "accessories", title: "Accessories", label: (s, i) => (s.superset ? "Accessory (Superset)" : `Accessory ${i + 1}`), addCategory: null },
    { key: "core", title: "Core (at the end)", label: (s, i, ex) => `Core ${i + 1} (${CATEGORY_META[ex.category]?.label || "Core"})`, addCategory: "core" },
  ];

  return (
    <div className="flex flex-col gap-4 pb-6">
      <Segmented options={[{ value: 2, label: "2-Day" }, { value: 3, label: "3-Day" }, { value: 4, label: "4-Day" }]} value={split} onChange={(v) => { setSplit(v); setExpanded(null); setPicking(null); setAdding(null); }} color={COLORS.rust} />
      <p className="text-[11px]" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>Changes here update the same plan shown in the Workout tab and on the calendar.</p>
      <div className="flex flex-col gap-3">
        {days.map((day) => {
          const wd = weekdayFor(day.id);
          const legHeavy = isLegHeavyDay(day);
          const warnLegOnCheerWeekend = legHeavy && (wd === 5 || wd === 6);
          return (
            <div key={day.id} className="rounded-2xl overflow-hidden" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
              <button onClick={() => setExpanded(expanded === day.id ? null : day.id)} className="w-full p-4 flex items-center gap-3 text-left">
                <div className="w-1.5 self-stretch rounded-full" style={{ background: day.color }} />
                <div className="flex-1">
                  <span className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: day.color, fontFamily: "Poppins, sans-serif" }}>{day.label} · {(WEEKDAY_BUTTONS.find((b) => b.wd === wd) || {}).label || "—"}</span>
                  <div className="text-lg font-bold" style={{ color: COLORS.ink, fontFamily: "Oswald, sans-serif" }}>{day.name}</div>
                </div>
                {expanded === day.id ? <ChevronUp size={16} style={{ color: COLORS.muted }} /> : <ChevronDown size={16} style={{ color: COLORS.muted }} />}
              </button>
              {expanded === day.id && (
                <div className="px-4 pb-4 flex flex-col gap-4">
                  <div>
                    <div className="text-[10px] uppercase font-bold tracking-wide mb-1.5" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>Weekday on the calendar</div>
                    <div className="flex gap-1">
                      {WEEKDAY_BUTTONS.map((b) => (
                        <button key={b.wd} onClick={() => onSetWeekday(String(split), day.id, b.wd)} className="flex-1 rounded-lg py-2 text-xs font-bold" style={{ background: wd === b.wd ? day.color : COLORS.bg, color: wd === b.wd ? "#fff" : COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{b.label}</button>
                      ))}
                    </div>
                    <p className="text-[11px] mt-1.5" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>If another workout already sits on that day, the two swap places. Weeks you've dragged by hand on the calendar keep their own layout until you reset them.</p>
                    {warnLegOnCheerWeekend && <p className="text-[11px] mt-1.5 font-semibold" style={{ color: COLORS.red, fontFamily: "Poppins, sans-serif" }}>Heads-up: this is a heavy leg day on {wd === 5 ? "Friday" : "Saturday"} — you wanted fresh legs for Sunday cheer. Your call, just flagging it.</p>}
                  </div>

                  <div>
                    <div className="text-[10px] uppercase font-bold tracking-wide mb-1.5" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>Warmup</div>
                    <div className="flex flex-col gap-1.5">
                      {day.warmup.map((wid, i) => (
                        <div key={i} className="rounded-xl px-3 py-2 flex items-center justify-between gap-2" style={{ background: COLORS.bg }}>
                          <span className="text-sm" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>{resolveWarmup(warmupLibrary, wid)}</span>
                          <button onClick={() => onRemoveWarmup(String(split), day.id, i)} style={{ color: COLORS.muted, opacity: 0.6 }}><X size={13} /></button>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => setPickingWarmup(day.id)} className="text-xs font-semibold mt-1.5" style={{ color: COLORS.sage, fontFamily: "Poppins, sans-serif" }}>+ Add warmup move</button>
                  </div>

                  <div>
                    <div className="text-[10px] uppercase font-bold tracking-wide mb-1.5" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>Prehab (one per workout)</div>
                    <div className="flex flex-col gap-2">
                      {day.prehab.slice(0, 1).map((s) => {
                        const p = resolvePrehab(prehabLibrary, s.prehabId);
                        return <SlotRow key={s.slot} label="Prehab" ex={p} onChange={() => setPickingPrehab({ dayId: day.id, slotId: s.slot })} />;
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] uppercase font-bold tracking-wide mb-1.5" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>Power / Plyo</div>
                    <SlotRow label="Power / Plyo" ex={resolvePlyo(plyoLibrary, day.power && day.power.plyoId)} onChange={() => setPickingPlyo({ dayId: day.id })} />
                  </div>

                  {groups.map((g) => (
                    <div key={g.key}>
                      <div className="text-[10px] uppercase font-bold tracking-wide mb-1.5" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{g.title}</div>
                      <div className="flex flex-col gap-2">
                        {(day[g.key] || []).map((s, i) => {
                          const ex = resolveEx(library, s.exerciseId);
                          return <SlotRow key={s.slot} label={g.label(s, i, ex)} ex={ex} onChange={() => setPicking({ dayId: day.id, group: g.key, slotId: s.slot, category: ex.category })} onDelete={() => onRemoveSlot(String(split), day.id, g.key, s.slot)} />;
                        })}
                        {!(day[g.key] || []).length && <span className="text-xs px-1" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>Nothing here yet.</span>}
                      </div>
                      <button onClick={() => setAdding({ dayId: day.id, group: g.key, category: g.addCategory })} className="text-xs font-semibold mt-1.5" style={{ color: COLORS.sage, fontFamily: "Poppins, sans-serif" }}>+ Add exercise</button>
                    </div>
                  ))}

                  <div>
                    <div className="text-[10px] uppercase font-bold tracking-wide mb-1.5" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>Finisher</div>
                    <textarea value={day.finisher} onChange={(e) => onUpdateFinisher(String(split), day.id, e.target.value)} rows={2} className="w-full rounded-xl px-3 py-2 text-sm outline-none resize-none" style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, color: COLORS.ink, fontFamily: "Poppins, sans-serif" }} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {picking && (
        <SlotPicker
          library={library}
          category={picking.category}
          onPick={(exId) => { onUpdateSlot(String(split), picking.dayId, picking.group, picking.slotId, exId); setPicking(null); }}
          onClose={() => setPicking(null)}
        />
      )}
      {adding && (
        <SlotPicker
          library={library}
          category={adding.category}
          onPick={(exId) => { onAddSlot(String(split), adding.dayId, adding.group, exId); setAdding(null); }}
          onClose={() => setAdding(null)}
        />
      )}
      {pickingPrehab && (
        <PrehabPicker
          prehabLibrary={prehabLibrary}
          onPick={(pid) => { onUpdatePrehabSlot(String(split), pickingPrehab.dayId, pickingPrehab.slotId, pid); setPickingPrehab(null); }}
          onClose={() => setPickingPrehab(null)}
        />
      )}
      {pickingPlyo && (
        <PrehabPicker
          title="Choose Power / Plyo Exercise"
          prehabLibrary={plyoLibrary}
          onPick={(pid) => { onUpdatePlyo(String(split), pickingPlyo.dayId, pid); setPickingPlyo(null); }}
          onClose={() => setPickingPlyo(null)}
        />
      )}
      {pickingWarmup && (
        <WarmupPicker
          warmupLibrary={warmupLibrary}
          currentIds={(days.find((d) => d.id === pickingWarmup) || {}).warmup || []}
          onPick={(wid) => { onAddWarmup(String(split), pickingWarmup, wid); setPickingWarmup(null); }}
          onClose={() => setPickingWarmup(null)}
        />
      )}
    </div>
  );
}
function ExerciseOverviewScreen({ library, warmupLibrary, prehabLibrary, plyoLibrary, dayTemplates, dayWeekdayMap, onAddCustom, onDeleteCustom, onAddCustomWarmup, onDeleteCustomWarmup, onAddCustomPrehab, onDeleteCustomPrehab, onAddCustomPlyo, onDeleteCustomPlyo, onUpdateSlot, onUpdatePrehabSlot, onUpdatePlyo, onUpdateFinisher, onAddSlot, onRemoveSlot, onSetWeekday, onAddWarmup, onRemoveWarmup }) {
  const [mode, setMode] = useState("library");
  return (
    <div className="flex flex-col gap-4 pb-6">
      <Segmented options={[{ value: "library", label: "Library" }, { value: "edit", label: "Edit Workouts" }]} value={mode} onChange={setMode} color={COLORS.plum} />
      {mode === "library" ? (
        <ExerciseLibraryList library={library} warmupLibrary={warmupLibrary} prehabLibrary={prehabLibrary} plyoLibrary={plyoLibrary} onAddCustom={onAddCustom} onDeleteCustom={onDeleteCustom} onAddCustomWarmup={onAddCustomWarmup} onDeleteCustomWarmup={onDeleteCustomWarmup} onAddCustomPrehab={onAddCustomPrehab} onDeleteCustomPrehab={onDeleteCustomPrehab} onAddCustomPlyo={onAddCustomPlyo} onDeleteCustomPlyo={onDeleteCustomPlyo} />
      ) : (
        <TemplateEditor dayTemplates={dayTemplates} library={library} warmupLibrary={warmupLibrary} prehabLibrary={prehabLibrary} plyoLibrary={plyoLibrary} dayWeekdayMap={dayWeekdayMap} onUpdateSlot={onUpdateSlot} onUpdatePrehabSlot={onUpdatePrehabSlot} onUpdatePlyo={onUpdatePlyo} onUpdateFinisher={onUpdateFinisher} onAddSlot={onAddSlot} onRemoveSlot={onRemoveSlot} onSetWeekday={onSetWeekday} onAddWarmup={onAddWarmup} onRemoveWarmup={onRemoveWarmup} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Morning Movement — today dominant, week plan below
// ---------------------------------------------------------------------------
function MorningMovementScreen({ schedule, dayById, morningDone, onToggle, mobilityOverrides, onSetMobilityTime }) {
  const weekDates = getWeekDates();
  const todayIso = todayISO();
  const todayInfo = weekDates.find((d) => d.iso === todayIso) || weekDates[0];
  const todayMove = getMorningMovement(todayInfo.weekday, schedule, dayById, mobilityOverrides[todayIso]);
  const todayDone = !!morningDone[todayIso];

  return (
    <div className="flex flex-col gap-5 pb-6">
      <div>
        <h2 className="text-sm uppercase tracking-widest font-bold mb-3" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>Today's Session</h2>
        <button onClick={() => onToggle(todayIso)} className="w-full rounded-2xl p-5 flex items-center gap-4 text-left" style={{ background: todayDone ? `${COLORS.sage}1A` : COLORS.card, border: `1.5px solid ${COLORS.sage}` }}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center shrink-0" style={{ background: todayDone ? COLORS.sage : "#fff", border: `1.5px solid ${COLORS.sage}` }}>{todayDone ? <Check size={22} color="#fff" /> : <Sunrise size={22} style={{ color: COLORS.sage }} />}</div>
          <div className="flex-1">
            <span className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: COLORS.sage, fontFamily: "Poppins, sans-serif" }}>{todayMove.time} · {todayDone ? "Completed" : "Tap when done"}</span>
            <div className="text-2xl font-bold" style={{ color: COLORS.ink, fontFamily: "Oswald, sans-serif" }}>{todayMove.name}</div>
            <span className="text-xs" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{todayMove.context}</span>
          </div>
        </button>
        <div className="flex items-center gap-3 mt-2 px-1">
          <span className="text-xs font-medium shrink-0" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>Move to:</span>
          <div className="w-32">
            <Segmented options={[{ value: "AM", label: "AM" }, { value: "PM", label: "PM" }]} value={todayMove.time} onChange={(v) => onSetMobilityTime(todayIso, v)} color={COLORS.sage} />
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-sm uppercase tracking-widest font-bold mb-3" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>This Week's Plan</h2>
        <div className="flex flex-col gap-2">
          {weekDates.map(({ iso, weekday, label, dayNum }) => {
            const move = getMorningMovement(weekday, schedule, dayById, mobilityOverrides[iso]);
            const done = !!morningDone[iso];
            const isToday = iso === todayIso;
            return (
              <div key={iso} className="rounded-2xl p-3 flex items-center gap-3" style={{ background: done ? `${COLORS.sage}1A` : COLORS.card, border: `1.5px solid ${isToday ? COLORS.sage : done ? COLORS.sage : COLORS.border}` }}>
                <button onClick={() => onToggle(iso)} className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: done ? COLORS.sage : "#fff", border: `1.5px solid ${done ? COLORS.sage : COLORS.border}` }}>{done ? <Check size={14} color="#fff" /> : <span className="text-[10px] font-bold" style={{ color: COLORS.muted, fontFamily: "Oswald, sans-serif" }}>{dayNum}</span>}</button>
                <button onClick={() => onToggle(iso)} className="flex-1 text-left min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{label}</span>
                    <Pill color={COLORS.sage}>{move.time}</Pill>
                  </div>
                  <div className="text-sm font-bold truncate" style={{ color: COLORS.ink, fontFamily: "Oswald, sans-serif" }}>{move.name}</div>
                </button>
                <div className="w-24 shrink-0">
                  <Segmented options={[{ value: "AM", label: "AM" }, { value: "PM", label: "PM" }]} value={move.time} onChange={(v) => onSetMobilityTime(iso, v)} color={COLORS.sage} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Desk Movement Snacks — 4 checkable stretch/mobility moves for the work day,
// rotating daily so it stays fresh.
// ---------------------------------------------------------------------------
function DeskSnackScreen({ deskSnackDone, onToggle }) {
  const todayIso = todayISO();
  const weekday = new Date().getDay();
  const today = DESK_SNACKS[weekday];
  const doneCount = today.exercises.filter((_, i) => !!deskSnackDone[`${todayIso}:${i}`]).length;
  const weekDates = getWeekDates();

  return (
    <div className="flex flex-col gap-5 pb-6">
      <div className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
        <h2 className="text-sm uppercase tracking-widest font-bold mb-1" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>Desk Movement Snacks</h2>
        <p className="text-xs" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>Four quick moves to break up sitting at work — no gear needed. The routine rotates daily so it stays fresh.</p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm uppercase tracking-widest font-bold" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>Today · {today.day}</h2>
          <span className="text-xs font-bold" style={{ color: doneCount === today.exercises.length ? COLORS.sage : COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{doneCount}/{today.exercises.length} done</span>
        </div>
        <div className="flex flex-col gap-2.5">
          {today.exercises.map((ex, i) => {
            const done = !!deskSnackDone[`${todayIso}:${i}`];
            return (
              <button key={i} onClick={() => onToggle(todayIso, i)} className="w-full rounded-2xl p-3.5 flex items-center gap-3 text-left" style={{ background: done ? `${COLORS.sage}1A` : COLORS.card, border: `1.5px solid ${done ? COLORS.sage : COLORS.border}` }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: done ? COLORS.sage : "#fff", border: `1.5px solid ${done ? COLORS.sage : COLORS.border}` }}>{done ? <Check size={16} color="#fff" /> : <span className="text-xs font-bold" style={{ color: COLORS.muted, fontFamily: "Oswald, sans-serif" }}>{i + 1}</span>}</div>
                <div className="flex-1">
                  <div className="text-base font-bold" style={{ color: done ? COLORS.sage : COLORS.ink, fontFamily: "Oswald, sans-serif", textDecoration: done ? "line-through" : "none" }}>{ex.name}</div>
                  <span className="text-xs" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{ex.detail}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="text-sm uppercase tracking-widest font-bold mb-3" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>This Week</h2>
        <div className="flex flex-col gap-2">
          {weekDates.map(({ iso, weekday: wd, label, dayNum }) => {
            const dayPlan = DESK_SNACKS[wd];
            const dayDone = dayPlan.exercises.filter((_, i) => !!deskSnackDone[`${iso}:${i}`]).length;
            const isToday = iso === todayIso;
            const complete = dayDone === dayPlan.exercises.length;
            return (
              <div key={iso} className="rounded-xl p-3 flex items-center gap-3" style={{ background: complete ? `${COLORS.sage}1A` : COLORS.card, border: `1.5px solid ${isToday ? COLORS.sage : complete ? COLORS.sage : COLORS.border}` }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: complete ? COLORS.sage : "#fff", border: `1.5px solid ${complete ? COLORS.sage : COLORS.border}` }}>{complete ? <Check size={14} color="#fff" /> : <span className="text-[10px] font-bold" style={{ color: COLORS.muted, fontFamily: "Oswald, sans-serif" }}>{dayNum}</span>}</div>
                <div className="flex-1">
                  <span className="text-[10px] font-bold uppercase" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{label}</span>
                  <div className="text-sm font-semibold" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>{dayDone}/{dayPlan.exercises.length} done</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root app
// ---------------------------------------------------------------------------
export default function FitnessTracker() {
  const [screen, setScreen] = useState("dashboard");
  const [session, setSession] = useState(null);
  const [runSession, setRunSession] = useState(null);
  const [history, setHistory] = useState(SEED_HISTORY);
  const [prs, setPrs] = useState(SEED_PRS);
  const [trends, setTrends] = useState(SEED_TRENDS);
  const [weeklySplit, setWeeklySplit] = useState(4);
  const [scheduleByWeek, setScheduleByWeek] = useState({});
  const [runHistory, setRunHistory] = useState(SEED_RUNS);
  const [runWeeksDone, setRunWeeksDone] = useState({});
  const [flexTrends, setFlexTrends] = useState(SEED_FLEX_TRENDS);
  const [morningDone, setMorningDone] = useState({});
  const [usualBreakfast, setUsualBreakfast] = useState(USUAL_BREAKFAST_DEFAULT);
  const [dayOverrides, setDayOverrides] = useState({});
  const [exerciseLibrary, setExerciseLibrary] = useState(EXERCISE_LIBRARY_DEFAULT);
  const [warmupLibrary, setWarmupLibrary] = useState(WARMUP_LIBRARY_DEFAULT);
  const [prehabLibrary, setPrehabLibrary] = useState(PREHAB_LIBRARY_DEFAULT);
  const [plyoLibrary, setPlyoLibrary] = useState(PLYO_LIBRARY_DEFAULT);
  const [dayWeekdayMap, setDayWeekdayMap] = useState(DEFAULT_DAY_WEEKDAYS);
  const [dayTemplates, setDayTemplates] = useState(DAY_TEMPLATES_DEFAULT);
  const [runsPerWeek, setRunsPerWeek] = useState(1);
  const [mobilityOverrides, setMobilityOverrides] = useState({});
  const [deskSnackDone, setDeskSnackDone] = useState({});
  const [weightSuggestions, setWeightSuggestions] = useState({});
  const [bodyweightLog, setBodyweightLog] = useState([]);
  const [lastWorkoutSummary, setLastWorkoutSummary] = useState(null);
  const [progressMode, setProgressMode] = useState("trends");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await loadState("trackerState");
      if (saved) {
        if (saved.history) setHistory(saved.history);
        if (saved.prs) setPrs(saved.prs);
        if (saved.trends) setTrends(saved.trends);
        if (saved.weeklySplit) setWeeklySplit(saved.weeklySplit);
        if (saved.scheduleByWeek) setScheduleByWeek(migrateScheduleByWeek(saved.scheduleByWeek));
        if (saved.runHistory) setRunHistory(saved.runHistory);
        if (saved.runWeeksDone) setRunWeeksDone(saved.runWeeksDone);
        if (saved.flexTrends) setFlexTrends(saved.flexTrends);
        if (saved.morningDone) setMorningDone(saved.morningDone);
        if (saved.usualBreakfast) setUsualBreakfast(saved.usualBreakfast);
        if (saved.dayOverrides) setDayOverrides(saved.dayOverrides);
        if (saved.exerciseLibrary) setExerciseLibrary(mergeLibrary(saved.exerciseLibrary, EXERCISE_LIBRARY_DEFAULT));
        if (saved.warmupLibrary) setWarmupLibrary(mergeLibrary(saved.warmupLibrary, WARMUP_LIBRARY_DEFAULT));
        if (saved.prehabLibrary) setPrehabLibrary(mergeLibrary(saved.prehabLibrary, PREHAB_LIBRARY_DEFAULT));
        if (saved.plyoLibrary) setPlyoLibrary(mergeLibrary(saved.plyoLibrary, PLYO_LIBRARY_DEFAULT));
        if (saved.dayTemplates && saved.templatesVersion === TEMPLATES_VERSION) setDayTemplates(saved.dayTemplates);
        if (saved.dayWeekdayMap) setDayWeekdayMap({ ...DEFAULT_DAY_WEEKDAYS, ...saved.dayWeekdayMap });
        if (saved.runsPerWeek) setRunsPerWeek(saved.runsPerWeek);
        if (saved.mobilityOverrides) setMobilityOverrides(saved.mobilityOverrides);
        if (saved.deskSnackDone) setDeskSnackDone(saved.deskSnackDone);
        if (saved.weightSuggestions) setWeightSuggestions(saved.weightSuggestions);
        if (saved.bodyweightLog) setBodyweightLog(saved.bodyweightLog);
      }
      setLoaded(true);
    })();
  }, []);
  useEffect(() => {
    if (!loaded) return;
    saveState("trackerState", { history, prs, trends, weeklySplit, scheduleByWeek, runHistory, runWeeksDone, flexTrends, morningDone, usualBreakfast, dayOverrides, exerciseLibrary, warmupLibrary, prehabLibrary, plyoLibrary, dayTemplates, templatesVersion: TEMPLATES_VERSION, dayWeekdayMap, runsPerWeek, mobilityOverrides, deskSnackDone, weightSuggestions, bodyweightLog });
  }, [history, prs, trends, weeklySplit, scheduleByWeek, runHistory, runWeeksDone, flexTrends, morningDone, usualBreakfast, dayOverrides, exerciseLibrary, warmupLibrary, prehabLibrary, plyoLibrary, dayTemplates, dayWeekdayMap, runsPerWeek, mobilityOverrides, deskSnackDone, weightSuggestions, bodyweightLog, loaded]);

  const streak = 6;
  const weekCount = history.filter((h) => { const d = new Date(h.date + "T00:00:00"); const now = new Date(); const diffDays = (now - d) / 86400000; return diffDays >= 0 && diffDays < 7; }).length;
  const total = 47 + history.length - SEED_HISTORY.length;

  const dayById = useMemo(() => {
    const map = {};
    Object.values(dayTemplates).forEach((arr) => arr.forEach((d) => { map[d.id] = d; }));
    return map;
  }, [dayTemplates]);
  const currentDays = dayTemplates[String(weeklySplit)];

  const getScheduleForOffset = (offset) => scheduleByWeek[mondayIso(offset)] || buildDefaultSchedule(weeklySplit, currentDays, runsPerWeek, offset, dayWeekdayMap);
  const setScheduleForOffset = (offset, newSchedule) => setScheduleByWeek((prev) => ({ ...prev, [mondayIso(offset)]: newSchedule }));
  const isScheduleCustom = (offset) => !!scheduleByWeek[mondayIso(offset)];
  const resetScheduleForOffset = (offset) => setScheduleByWeek((prev) => { const next = { ...prev }; delete next[mondayIso(offset)]; return next; });
  const todaySchedule = getScheduleForOffset(0);

  const startDay = (day) => { setSession(makeSession(day, exerciseLibrary, weightSuggestions, warmupLibrary, prehabLibrary, plyoLibrary)); setScreen("workout"); };
  const startRunSession = (rs) => { setRunSession(rs); setScreen("running"); };
  const overviewProps = { getSchedule: getScheduleForOffset, setSchedule: setScheduleForOffset, isCustom: isScheduleCustom, onReset: resetScheduleForOffset, dayById, history, runHistory, onStartDay: startDay, onStartRun: startRunSession };

  const addCustomExercise = (ex) => setExerciseLibrary((prev) => [...prev, ex]);
  const deleteCustomExercise = (id) => setExerciseLibrary((prev) => prev.filter((e) => e.id !== id));
  const addCustomWarmup = (w) => setWarmupLibrary((prev) => [...prev, w]);
  const deleteCustomWarmup = (id) => setWarmupLibrary((prev) => prev.filter((w) => w.id !== id));
  const addCustomPrehab = (p) => setPrehabLibrary((prev) => [...prev, p]);
  const deleteCustomPrehab = (id) => setPrehabLibrary((prev) => prev.filter((p) => p.id !== id));
  const updateTemplateSlot = (splitKey, dayId, group, slotId, exerciseId) => {
    setDayTemplates((prev) => ({
      ...prev,
      [splitKey]: prev[splitKey].map((day) => {
        if (day.id !== dayId) return day;
        return { ...day, [group]: day[group].map((s) => (s.slot === slotId ? { ...s, exerciseId } : s)) };
      }),
    }));
  };
  const updateTemplatePrehabSlot = (splitKey, dayId, slotId, prehabId) => {
    setDayTemplates((prev) => ({
      ...prev,
      [splitKey]: prev[splitKey].map((day) => (day.id !== dayId ? day : { ...day, prehab: day.prehab.map((s) => (s.slot === slotId ? { ...s, prehabId } : s)) })),
    }));
  };
  const addCustomPlyo = (p) => setPlyoLibrary((prev) => [...prev, p]);
  const deleteCustomPlyo = (id) => setPlyoLibrary((prev) => prev.filter((p) => p.id !== id));
  const updateTemplatePlyo = (splitKey, dayId, plyoId) => {
    setDayTemplates((prev) => ({
      ...prev,
      [splitKey]: prev[splitKey].map((day) => (day.id !== dayId ? day : { ...day, power: { plyoId } })),
    }));
  };
  const updateTemplateFinisher = (splitKey, dayId, text) => {
    setDayTemplates((prev) => ({
      ...prev,
      [splitKey]: prev[splitKey].map((day) => (day.id !== dayId ? day : { ...day, finisher: text })),
    }));
  };
  // Add / delete whole exercise slots in any lift section (main, secondary,
  // accessories, core). The new slot's set count comes from the exercise's own default.
  const addTemplateSlot = (splitKey, dayId, group, exerciseId) => {
    const ex = resolveEx(exerciseLibrary, exerciseId);
    setDayTemplates((prev) => ({
      ...prev,
      [splitKey]: prev[splitKey].map((day) => (day.id !== dayId ? day : { ...day, [group]: [...(day[group] || []), slot(`${group.slice(0, 1)}x${Date.now()}`, exerciseId, ex.sets || 3)] })),
    }));
  };
  const removeTemplateSlot = (splitKey, dayId, group, slotId) => {
    setDayTemplates((prev) => ({
      ...prev,
      [splitKey]: prev[splitKey].map((day) => (day.id !== dayId ? day : { ...day, [group]: (day[group] || []).filter((s) => s.slot !== slotId) })),
    }));
  };
  // Pick the weekday a workout lands on. If another workout of the same split
  // already holds that weekday, the two swap — never two lifts on one day.
  const setDayWeekday = (splitKey, dayId, weekday) => {
    setDayWeekdayMap((prev) => {
      const current = { ...(DEFAULT_DAY_WEEKDAYS[splitKey] || {}), ...(prev[splitKey] || {}) };
      const oldWd = current[dayId];
      const other = Object.keys(current).find((id) => id !== dayId && current[id] === weekday);
      const next = { ...current, [dayId]: weekday };
      if (other !== undefined && oldWd !== undefined) next[other] = oldWd;
      return { ...prev, [splitKey]: next };
    });
  };
  const addTemplateWarmup = (splitKey, dayId, warmupId) => {
    setDayTemplates((prev) => ({
      ...prev,
      [splitKey]: prev[splitKey].map((day) => (day.id !== dayId || day.warmup.includes(warmupId) ? day : { ...day, warmup: [...day.warmup, warmupId] })),
    }));
  };
  const removeTemplateWarmup = (splitKey, dayId, index) => {
    setDayTemplates((prev) => ({
      ...prev,
      [splitKey]: prev[splitKey].map((day) => (day.id !== dayId ? day : { ...day, warmup: day.warmup.filter((_, i) => i !== index) })),
    }));
  };

  const finishWorkout = (elapsedSeconds, totalSetsDone) => {
    const dateISO = todayISO();
    const allEx = [...session.mainLift, ...session.secondaryLifts, ...session.accessories, ...session.core];
    const exResults = allEx.map((ex) => {
      const weights = ex.sets.filter((s) => !s.isWarmup).map((s) => parseFloat(s.weight)).filter((n) => !isNaN(n) && n > 0);
      const bestWeight = weights.length ? Math.max(...weights) : null;
      const priorPR = prs[ex.name];
      const isPR = bestWeight !== null && (!priorPR || bestWeight > priorPR.weight);
      const bestSet = ex.sets.find((s) => !s.isWarmup && parseFloat(s.weight) === bestWeight);
      const suggestion = computeWeightSuggestion(ex);
      return { name: ex.name, category: ex.category, isPR, bestWeight, bestReps: bestSet ? bestSet.reps : null, suggestion };
    });
    if (session.mobility && session.mobility.length) {
      setFlexTrends((prev) => {
        const next = { ...prev };
        session.mobility.forEach((bp) => {
          const val = parseFloat(bp.measurement);
          if (!isNaN(val)) { const existing = next[bp.metric] || []; next[bp.metric] = [...existing, val].slice(-8); }
        });
        return next;
      });
    }
    setPrs((prev) => { const next = { ...prev }; exResults.forEach((r) => { if (r.isPR && r.bestWeight !== null) next[r.name] = { weight: r.bestWeight, reps: r.bestReps || "-", date: dateISO }; }); return next; });
    setTrends((prev) => { const next = { ...prev }; exResults.forEach((r) => { if (r.bestWeight !== null) { const existing = next[r.name] || []; next[r.name] = [...existing, r.bestWeight].slice(-8); } }); return next; });
    setHistory((prev) => [...prev, { id: `h-${Date.now()}`, dayId: session.id, name: session.name, color: session.color, date: dateISO, duration: Math.max(1, Math.round(elapsedSeconds / 60)), totalSets: totalSetsDone, exercises: exResults.map((r) => ({ name: r.name, isPR: r.isPR })) }]);
    setWeightSuggestions((prev) => {
      const next = { ...prev };
      exResults.forEach((r) => { if (r.suggestion) next[r.name] = { ...r.suggestion, date: dateISO }; });
      return next;
    });
    setLastWorkoutSummary({ name: session.name, color: session.color, duration: Math.max(1, Math.round(elapsedSeconds / 60)), totalSets: totalSetsDone, exercises: exResults });
    setSession(null);
    setScreen("summary");
  };
  const discardWorkout = () => { setSession(null); setScreen("dashboard"); };

  const applySessionCheckIn = (rating) => {
    if (!lastWorkoutSummary) return;
    setWeightSuggestions((prev) => {
      const next = { ...prev };
      lastWorkoutSummary.exercises.forEach((r) => {
        if (r.suggestion && next[r.name]) next[r.name] = applyFeedbackBias(next[r.name], r.category, rating);
      });
      return next;
    });
    setLastWorkoutSummary((prev) => ({
      ...prev,
      exercises: prev.exercises.map((r) => (r.suggestion ? { ...r, suggestion: applyFeedbackBias(r.suggestion, r.category, rating) } : r)),
    }));
  };

  const logRun = (entry) => setRunHistory((prev) => [...prev, entry]);
  const toggleRunWeek = (i) => setRunWeeksDone((prev) => ({ ...prev, [i]: !prev[i] }));
  const finishRunSession = (entry) => { setRunHistory((prev) => [...prev, entry]); setRunSession(null); setScreen("running"); };
  const discardRunSession = () => setRunSession(null);
  const toggleMorning = (iso) => setMorningDone((prev) => ({ ...prev, [iso]: !prev[iso] }));
  const deleteWorkout = (id) => setHistory((prev) => prev.filter((h) => h.id !== id));
  const deleteRun = (id) => setRunHistory((prev) => prev.filter((r) => r.id !== id));
  const setMobilityTime = (iso, time) => setMobilityOverrides((prev) => ({ ...prev, [iso]: time }));
  const toggleDeskSnack = (iso, i) => setDeskSnackDone((prev) => { const key = `${iso}:${i}`; return { ...prev, [key]: !prev[key] }; });
  const logBodyweight = (weight) => setBodyweightLog((prev) => {
    const dateISO = todayISO();
    const withoutToday = prev.filter((e) => e.date !== dateISO);
    return [...withoutToday, { date: dateISO, weight }].sort((a, b) => (a.date < b.date ? -1 : 1));
  });

  const navItems = [
    { id: "dashboard", label: "Home", icon: Home },
    { id: "morning", label: "Morning", icon: Sunrise },
    { id: "workout", label: "Workout", icon: Dumbbell },
    { id: "running", label: "Running", icon: Footprints },
    { id: "desk", label: "Desk", icon: Armchair },
    { id: "nutrition", label: "Nutrition", icon: Apple },
    { id: "exercises", label: "Exercises", icon: Layers },
    { id: "progress", label: "Progress", icon: TrendingUp },
  ];

  return (
    <div className="w-full flex flex-col items-center" style={{ background: COLORS.bg, fontFamily: "Poppins, sans-serif", minHeight: "100vh", maxHeight: "100vh", overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Oswald:wght@500;600;700&display=swap');
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .nav-scroll::-webkit-scrollbar { display: none; }
      `}</style>
      <div className="w-full max-w-md px-4 pt-5 pb-28">
        {screen === "dashboard" && <Dashboard streak={streak} weekCount={weekCount} total={total} prs={prs} schedule={todaySchedule} dayById={dayById} days={currentDays} morningDone={morningDone} onToggleMorning={toggleMorning} onStartDay={startDay} onOpenRun={startRunSession} mobilityOverrides={mobilityOverrides} bodyweightLog={bodyweightLog} onLogBodyweight={logBodyweight} overviewProps={overviewProps} />}
        {screen === "workout" && (session ? (
          <WorkoutScreen session={session} setSession={setSession} exerciseLibrary={exerciseLibrary} history={history} onFinish={finishWorkout} onDiscard={discardWorkout} />
        ) : (
          <WorkoutHome weeklySplit={weeklySplit} setWeeklySplit={setWeeklySplit} days={currentDays} onStartDay={startDay} overviewProps={overviewProps} />
        ))}
        {screen === "exercises" && <ExerciseOverviewScreen library={exerciseLibrary} warmupLibrary={warmupLibrary} prehabLibrary={prehabLibrary} plyoLibrary={plyoLibrary} dayTemplates={dayTemplates} dayWeekdayMap={dayWeekdayMap} onAddCustom={addCustomExercise} onDeleteCustom={deleteCustomExercise} onAddCustomWarmup={addCustomWarmup} onDeleteCustomWarmup={deleteCustomWarmup} onAddCustomPrehab={addCustomPrehab} onDeleteCustomPrehab={deleteCustomPrehab} onAddCustomPlyo={addCustomPlyo} onDeleteCustomPlyo={deleteCustomPlyo} onUpdateSlot={updateTemplateSlot} onUpdatePrehabSlot={updateTemplatePrehabSlot} onUpdatePlyo={updateTemplatePlyo} onUpdateFinisher={updateTemplateFinisher} onAddSlot={addTemplateSlot} onRemoveSlot={removeTemplateSlot} onSetWeekday={setDayWeekday} onAddWarmup={addTemplateWarmup} onRemoveWarmup={removeTemplateWarmup} />}
        {screen === "nutrition" && <NutritionScreen usualBreakfast={usualBreakfast} setUsualBreakfast={setUsualBreakfast} dayOverrides={dayOverrides} setDayOverrides={setDayOverrides} getSchedule={getScheduleForOffset} />}
        {screen === "running" && (runSession ? (
          <RunSessionScreen runSession={runSession} onFinish={finishRunSession} onDiscard={discardRunSession} />
        ) : (
          <RunningScreen runHistory={runHistory} weeksDone={runWeeksDone} onLogRun={logRun} onToggleWeek={toggleRunWeek} onDeleteRun={deleteRun} runsPerWeek={runsPerWeek} setRunsPerWeek={setRunsPerWeek} onStartRun={startRunSession} />
        ))}
        {screen === "morning" && <MorningMovementScreen schedule={todaySchedule} dayById={dayById} morningDone={morningDone} onToggle={toggleMorning} mobilityOverrides={mobilityOverrides} onSetMobilityTime={setMobilityTime} />}
        {screen === "desk" && <DeskSnackScreen deskSnackDone={deskSnackDone} onToggle={toggleDeskSnack} />}
        {screen === "summary" && lastWorkoutSummary && <WorkoutSummaryScreen summary={lastWorkoutSummary} onContinue={() => { setProgressMode("history"); setScreen("progress"); }} onCheckIn={applySessionCheckIn} />}
        {screen === "progress" && <ProgressHistoryScreen prs={prs} trends={trends} bodyweightLog={bodyweightLog} flexTrends={flexTrends} history={history} onDeleteWorkout={deleteWorkout} mode={progressMode} setMode={setProgressMode} />}
      </div>
      <div className="fixed bottom-0 left-0 right-0 flex justify-center border-t" style={{ background: "#FFFFFF", borderColor: COLORS.border }}>
        <div className="w-full max-w-md flex overflow-x-auto nav-scroll" style={{ scrollbarWidth: "none" }}>
          {navItems.map((item) => {
            const active = screen === item.id;
            const Icon = item.icon;
            return (
              <button key={item.id} onClick={() => setScreen(item.id)} className="flex flex-col items-center gap-1 py-2.5 shrink-0" style={{ minWidth: "68px" }}>
                <Icon size={19} style={{ color: active ? COLORS.sage : COLORS.muted }} />
                <span className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: active ? COLORS.sage : COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
