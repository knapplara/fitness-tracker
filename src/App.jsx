import React, { useState, useEffect, useMemo } from "react";
import {
  Home,
  Dumbbell,
  History as HistoryIcon,
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
  Waves,
  Moon,
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
// programWeek is computed further below, once RUN_PLAN exists.

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------
const buildSets = (n, prev) =>
  Array.from({ length: n }, (_, i) => ({ set: i + 1, prev: prev || "—", weight: "", reps: "", done: false }));
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
  arms: { label: "Arms & Shoulders (Isolation)", color: COLORS.red },
  calves: { label: "Calves", color: COLORS.muted },
  carry: { label: "Carry / Full-Body", color: COLORS.rust },
};
const CATEGORY_ORDER = ["squat", "hinge", "vertPush", "vertPull", "horzPush", "horzPull", "coreFlexion", "coreRotation", "coreAntiRotation", "arms", "calves", "carry"];

const EXERCISE_LIBRARY_DEFAULT = [
  // Squat / knee-dominant
  { id: "ex-backSquat", name: "Back Squat", category: "squat", muscle: "Quads/Glutes", sets: 4, reps: "50kg x5", custom: false },
  { id: "ex-frontSquat", name: "Front Squat", category: "squat", muscle: "Quads/Glutes", sets: 4, reps: "—", custom: false },
  { id: "ex-bulgarianSplitSquat", name: "Bulgarian Split Squat", category: "squat", muscle: "Legs", sets: 3, reps: "10kg DBs x10/side", custom: false },
  { id: "ex-legPress", name: "Leg Press", category: "squat", muscle: "Quads", sets: 3, reps: "70kg x10", custom: false },
  { id: "ex-gobletSquat", name: "Goblet Squat", category: "squat", muscle: "Quads", sets: 3, reps: "—", custom: false },
  { id: "ex-walkingLunges", name: "Walking Lunges", category: "squat", muscle: "Quads/Glutes", sets: 3, reps: "12kg DBs x10/side", custom: false },
  { id: "ex-stepUps", name: "Step-Ups", category: "squat", muscle: "Legs", sets: 3, reps: "—", custom: false },
  // Hinge / hip-dominant
  { id: "ex-deadlift", name: "Deadlift", category: "hinge", muscle: "Full Body/Posterior", sets: 4, reps: "60kg x5", custom: false },
  { id: "ex-trapBarDeadlift", name: "Trap Bar Deadlift", category: "hinge", muscle: "Full Body/Posterior", sets: 4, reps: "—", custom: false },
  { id: "ex-romanianDeadlift", name: "Romanian Deadlift", category: "hinge", muscle: "Hamstrings/Glutes", sets: 3, reps: "55kg x8", custom: false },
  { id: "ex-singleLegRDL", name: "Single-Leg RDL", category: "hinge", muscle: "Hamstrings/Glutes", sets: 3, reps: "—", custom: false },
  { id: "ex-hamstringCurl", name: "Hamstring Curl", category: "hinge", muscle: "Hamstrings", sets: 3, reps: "25kg x12", custom: false },
  { id: "ex-nordicCurl", name: "Nordic Curl", category: "hinge", muscle: "Hamstrings", sets: 3, reps: "—", custom: false },
  { id: "ex-hipThrust", name: "Hip Thrust", category: "hinge", muscle: "Glutes", sets: 3, reps: "—", custom: false },
  // Vertical pull
  { id: "ex-weightedPullupNeg", name: "Weighted Pull-Up Negative", category: "vertPull", muscle: "Back", sets: 4, reps: "BW x5 neg, 4s", custom: false },
  { id: "ex-latPulldown", name: "Lat Pulldown", category: "vertPull", muscle: "Back", sets: 3, reps: "32kg x10", custom: false },
  { id: "ex-neutralGripPulldown", name: "Neutral-Grip Pulldown", category: "vertPull", muscle: "Back", sets: 3, reps: "—", custom: false },
  { id: "ex-chinUp", name: "Chin-Up", category: "vertPull", muscle: "Back/Biceps", sets: 3, reps: "-10kg assist x5", custom: false },
  { id: "ex-bandedAssistedPullup", name: "Banded Assisted Pull-Up", category: "vertPull", muscle: "Back", sets: 4, reps: "—", custom: false },
  { id: "ex-assistedPullupLadder", name: "Assisted Pull-Up Ladder", category: "vertPull", muscle: "Back", sets: 4, reps: "-14kg assist x6", custom: false },
  // Vertical push
  { id: "ex-pushPress", name: "Push Press", category: "vertPush", muscle: "Shoulders/Power", sets: 4, reps: "22kg x6", custom: false },
  { id: "ex-dbOverheadPress", name: "DB Overhead Press", category: "vertPush", muscle: "Shoulders", sets: 3, reps: "12kg x10", custom: false },
  { id: "ex-seatedDbShoulderPress", name: "Seated DB Shoulder Press", category: "vertPush", muscle: "Shoulders", sets: 3, reps: "—", custom: false },
  { id: "ex-arnoldPress", name: "Arnold Press", category: "vertPush", muscle: "Shoulders", sets: 3, reps: "—", custom: false },
  // Horizontal push
  { id: "ex-dbBenchPress", name: "DB Bench Press", category: "horzPush", muscle: "Chest", sets: 4, reps: "18kg x8", custom: false },
  { id: "ex-barbellBenchPress", name: "Barbell Bench Press", category: "horzPush", muscle: "Chest", sets: 4, reps: "—", custom: false },
  { id: "ex-inclineDbPress", name: "Incline DB Press", category: "horzPush", muscle: "Chest", sets: 3, reps: "14kg x10", custom: false },
  { id: "ex-flatDbPress", name: "Flat DB Press", category: "horzPush", muscle: "Chest", sets: 3, reps: "—", custom: false },
  // Horizontal pull
  { id: "ex-chestSupportedRow", name: "Chest-Supported Row", category: "horzPull", muscle: "Back", sets: 4, reps: "—", custom: false },
  { id: "ex-seatedCableRow", name: "Seated Cable Row", category: "horzPull", muscle: "Back", sets: 3, reps: "40kg x10", custom: false },
  { id: "ex-cableRow", name: "Cable Row", category: "horzPull", muscle: "Back", sets: 3, reps: "35kg x12", custom: false },
  { id: "ex-singleArmDbRow", name: "Single-Arm DB Row", category: "horzPull", muscle: "Back", sets: 3, reps: "—", custom: false },
  { id: "ex-ringRows", name: "Ring Rows", category: "horzPull", muscle: "Back", sets: 3, reps: "—", custom: false },
  // Core — flexion
  { id: "ex-cableCrunch", name: "Cable Crunch", category: "coreFlexion", muscle: "Core", sets: 3, reps: "—", custom: false },
  { id: "ex-weightedSitup", name: "Weighted Sit-Up", category: "coreFlexion", muscle: "Core", sets: 3, reps: "—", custom: false },
  // Core — rotation
  { id: "ex-russianTwist", name: "Russian Twist", category: "coreRotation", muscle: "Core/Obliques", sets: 2, reps: "12/side", custom: false },
  { id: "ex-cableWoodchop", name: "Cable Woodchop", category: "coreRotation", muscle: "Core/Obliques", sets: 2, reps: "12/side", custom: false },
  // Core — anti-rotation / stability
  { id: "ex-palloffPress", name: "Pallof Press", category: "coreAntiRotation", muscle: "Core", sets: 2, reps: "10/side", custom: false },
  { id: "ex-deadBug", name: "Dead Bug", category: "coreAntiRotation", muscle: "Core", sets: 2, reps: "10/side", custom: false },
  { id: "ex-plank", name: "Plank", category: "coreAntiRotation", muscle: "Core", sets: 2, reps: "40s", custom: false },
  { id: "ex-sidePlank", name: "Side Plank", category: "coreAntiRotation", muscle: "Core", sets: 2, reps: "30s/side", custom: false },
  // Arms & shoulders (isolation)
  { id: "ex-bicepCurl", name: "Bicep Curl", category: "arms", muscle: "Arms", sets: 2, reps: "10kg x12", custom: false },
  { id: "ex-hammerCurl", name: "Hammer Curl", category: "arms", muscle: "Arms", sets: 2, reps: "—", custom: false },
  { id: "ex-tricepsPushdown", name: "Triceps Pushdown", category: "arms", muscle: "Arms", sets: 2, reps: "20kg x12", custom: false },
  { id: "ex-skullCrusher", name: "Skull Crusher", category: "arms", muscle: "Arms", sets: 2, reps: "—", custom: false },
  { id: "ex-lateralRaise", name: "Lateral Raise", category: "arms", muscle: "Shoulders", sets: 2, reps: "6kg x15", custom: false },
  { id: "ex-cableLateralRaise", name: "Cable Lateral Raise", category: "arms", muscle: "Shoulders", sets: 2, reps: "—", custom: false },
  { id: "ex-facePull", name: "Face Pull", category: "arms", muscle: "Shoulders", sets: 2, reps: "15kg x15", custom: false },
  { id: "ex-reversePecDeck", name: "Reverse Pec Deck", category: "arms", muscle: "Shoulders", sets: 2, reps: "—", custom: false },
  // Calves
  { id: "ex-standingCalfRaise", name: "Standing Calf Raise", category: "calves", muscle: "Calves", sets: 3, reps: "30kg x15", custom: false },
  { id: "ex-seatedCalfRaise", name: "Seated Calf Raise", category: "calves", muscle: "Calves", sets: 3, reps: "—", custom: false },
  // Carry / full body
  { id: "ex-farmersCarry", name: "Farmer's Carry", category: "carry", muscle: "Full Body/Grip", sets: 3, reps: "16kg DBs x40m", custom: false },
  { id: "ex-suitcaseCarry", name: "Suitcase Carry", category: "carry", muscle: "Full Body/Grip", sets: 3, reps: "—", custom: false },
];

function resolveEx(library, id) {
  return (library || []).find((e) => e.id === id) || { id, name: "(exercise removed — pick a new one)", category: "squat", muscle: "—", sets: 3, reps: "—", custom: false };
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
function computeWeightSuggestion(ex) {
  const loggedSets = ex.sets.filter((s) => s.weight !== "" && s.weight != null && s.reps !== "" && s.reps != null && !isNaN(parseFloat(s.weight)));
  if (!loggedSets.length) return null;
  const increment = incrementForCategory(ex.category);
  const targetReps = parseTargetReps(ex.sets[0] && ex.sets[0].prev);
  const bestWeight = Math.max(...loggedSets.map((s) => parseFloat(s.weight)));
  const allDone = ex.sets.every((s) => s.done);
  const repsMissed = targetReps ? loggedSets.filter((s) => parseInt(s.reps, 10) < targetReps).length : 0;
  const repsMetOrBeat = targetReps ? loggedSets.every((s) => parseInt(s.reps, 10) >= targetReps) : allDone;

  if (allDone && repsMetOrBeat) {
    return {
      delta: increment,
      suggestedWeight: Math.round((bestWeight + increment) * 100) / 100,
      note: targetReps ? `All sets hit ${targetReps}+ reps — try +${increment}kg next time` : `All sets completed — try +${increment}kg next time`,
    };
  }
  if (!allDone || repsMissed >= 2) {
    return {
      delta: -increment,
      suggestedWeight: Math.max(0, Math.round((bestWeight - increment) * 100) / 100),
      note: `Missed reps on ${repsMissed >= 2 ? repsMissed + " sets" : "a set or two"} — hold or drop to ${Math.max(0, bestWeight - increment)}kg next time`,
    };
  }
  return {
    delta: 0,
    suggestedWeight: bestWeight,
    note: `Close to target — repeat ${bestWeight}kg and aim for full reps across all sets`,
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

const DAY_TEMPLATES_DEFAULT = {
  "2": [
    {
      id: "s2-a", label: "Day A", name: "Quad + Pull", color: COLORS.sage,
      warmup: ["5 min stationary bike, easy pace", "Leg swings x15/side", "Walking lunges x10", "Bodyweight squats x15"],
      prehabCore: [{ name: "Glute Bridge", targetSets: 2, targetReps: "15" }, { name: "Dead Bug", targetSets: 2, targetReps: "10/side" }],
      power: { name: "Box Jumps", targetSets: 3, targetReps: "5" },
      mainLifts: [slot("m1", "ex-backSquat", 4), slot("m2", "ex-weightedPullupNeg", 4)],
      secondaryLifts: [slot("s1", "ex-legPress", 3), slot("s2", "ex-latPulldown", 3)],
      accessories: [slot("a1", "ex-walkingLunges", 3, { superset: "sup1" }), slot("a2", "ex-bicepCurl", 2, { superset: "sup1" }), slot("a3", "ex-hamstringCurl", 3)],
      optionalCore: slot("c1", "ex-russianTwist", 2),
      finisher: "5 min bike sprints — 30s hard / 90s easy x4",
      cooldown: ["Deep lunge stretch 30s/side (splits work)", "Lat stretch 30s/side", "Hip flexor stretch 30s/side", "Pigeon pose 45s/side"],
    },
    {
      id: "s2-b", label: "Day B", name: "Hinge + Push", color: COLORS.rust,
      warmup: ["5 min easy bike", "Band shoulder dislocates x10", "Arm swings x15", "Cat-cow x10"],
      prehabCore: [{ name: "Band Face Pull", targetSets: 2, targetReps: "15" }, { name: "Pallof Press", targetSets: 2, targetReps: "10/side" }],
      power: { name: "Med Ball Slams", targetSets: 3, targetReps: "8" },
      mainLifts: [slot("m1", "ex-deadlift", 4), slot("m2", "ex-dbBenchPress", 4)],
      secondaryLifts: [slot("s1", "ex-romanianDeadlift", 3), slot("s2", "ex-inclineDbPress", 3)],
      accessories: [slot("a1", "ex-dbOverheadPress", 3, { superset: "sup1" }), slot("a2", "ex-tricepsPushdown", 2, { superset: "sup1" }), slot("a3", "ex-standingCalfRaise", 3)],
      optionalCore: slot("c1", "ex-cableCrunch", 2),
      finisher: "5 min row intervals — 20s hard / 40s easy x6",
      cooldown: ["Doorway chest stretch 30s/side", "Hamstring stretch 30s/side", "Hip flexor stretch 30s/side", "Cross-body shoulder stretch 30s/side"],
    },
  ],
  "3": [
    {
      id: "s3-a", label: "Day 1", name: "Squat + Vertical Pull", color: COLORS.sage,
      warmup: ["5 min stationary bike, easy pace", "Leg swings x15/side", "Scapular pull-ups x8", "Bodyweight squats x15"],
      prehabCore: [{ name: "Glute Bridge", targetSets: 2, targetReps: "15" }, { name: "Cable Crunch", targetSets: 2, targetReps: "—" }],
      power: { name: "Box Jumps", targetSets: 3, targetReps: "5" },
      mainLifts: [slot("m1", "ex-backSquat", 4), slot("m2", "ex-weightedPullupNeg", 4)],
      secondaryLifts: [slot("s1", "ex-bulgarianSplitSquat", 3), slot("s2", "ex-latPulldown", 3)],
      accessories: [slot("a1", "ex-walkingLunges", 3, { superset: "sup1" }), slot("a2", "ex-hammerCurl", 2, { superset: "sup1" })],
      optionalCore: slot("c1", "ex-palloffPress", 2),
      finisher: "5 min bike sprints — 30s hard / 90s easy x4",
      cooldown: ["Deep lunge stretch 30s/side (splits work)", "Lat stretch 30s/side", "Pigeon pose 45s/side"],
    },
    {
      id: "s3-b", label: "Day 2", name: "Hinge + Horizontal Push", color: COLORS.rust,
      warmup: ["5 min stationary bike, easy pace", "Leg swings x15/side", "Arm circles x20", "Cat-cow x10"],
      prehabCore: [{ name: "Pallof Press", targetSets: 2, targetReps: "10/side" }, { name: "Band Face Pull", targetSets: 2, targetReps: "15" }],
      power: { name: "Kettlebell Swings", targetSets: 4, targetReps: "12" },
      mainLifts: [slot("m1", "ex-deadlift", 4), slot("m2", "ex-dbBenchPress", 4)],
      secondaryLifts: [slot("s1", "ex-singleLegRDL", 3), slot("s2", "ex-inclineDbPress", 3)],
      accessories: [slot("a1", "ex-standingCalfRaise", 3, { superset: "sup1" }), slot("a2", "ex-tricepsPushdown", 2, { superset: "sup1" })],
      optionalCore: slot("c1", "ex-cableWoodchop", 2),
      finisher: "5 min row intervals — 20s hard / 40s easy x6",
      cooldown: ["Hamstring stretch 30s/side", "Hip flexor stretch 30s/side", "Doorway chest stretch 30s/side"],
    },
    {
      id: "s3-c", label: "Day 3", name: "Horizontal Pull + Vertical Push", color: COLORS.ochre,
      warmup: ["5 min easy row", "Band pull-aparts x15", "Arm swings x15", "Scapular wall slides x10"],
      prehabCore: [{ name: "Rotator Cuff External Rotation", targetSets: 2, targetReps: "15/side" }, { name: "Cable Crunch", targetSets: 2, targetReps: "—" }],
      power: { name: "Explosive Push-Ups", targetSets: 3, targetReps: "5" },
      mainLifts: [slot("m1", "ex-chestSupportedRow", 4), slot("m2", "ex-pushPress", 4)],
      secondaryLifts: [slot("s1", "ex-seatedCableRow", 3), slot("s2", "ex-dbOverheadPress", 3)],
      accessories: [slot("a1", "ex-facePull", 2, { superset: "sup1" }), slot("a2", "ex-lateralRaise", 2, { superset: "sup1" })],
      optionalCore: slot("c1", "ex-sidePlank", 2),
      finisher: "5 min row, cooldown pace with 3x20s pickups",
      cooldown: ["Lat stretch 30s/side", "Cross-body shoulder stretch 30s/side", "Supported child pose 45s"],
    },
  ],
  "4": [
    {
      id: "s4-a", label: "Day 1", name: "Squat", color: COLORS.sage,
      warmup: ["5 min stationary bike, easy pace", "Leg swings x15/side", "Walking lunges x10", "Bodyweight squats x15"],
      prehabCore: [{ name: "Glute Bridge", targetSets: 2, targetReps: "15" }, { name: "Pallof Press", targetSets: 2, targetReps: "10/side" }],
      power: { name: "Box Jumps", targetSets: 3, targetReps: "5" },
      mainLifts: [slot("m1", "ex-backSquat", 4)],
      secondaryLifts: [slot("s1", "ex-bulgarianSplitSquat", 3), slot("s2", "ex-legPress", 3)],
      accessories: [slot("a1", "ex-walkingLunges", 3, { superset: "sup1" }), slot("a2", "ex-standingCalfRaise", 2, { superset: "sup1" })],
      optionalCore: slot("c1", "ex-cableCrunch", 2),
      finisher: "5 min bike sprints — 30s hard / 90s easy x4",
      cooldown: ["Deep lunge stretch 30s/side (splits work)", "Hip flexor stretch 30s/side", "Pigeon pose 45s/side"],
    },
    {
      id: "s4-b", label: "Day 2", name: "Hinge", color: COLORS.rust,
      warmup: ["5 min row, easy pace", "Leg swings x15/side", "Bodyweight RDL x10", "Cat-cow x10"],
      prehabCore: [{ name: "Band Face Pull", targetSets: 2, targetReps: "15" }, { name: "Cable Crunch", targetSets: 2, targetReps: "—" }],
      power: { name: "Kettlebell Swings", targetSets: 4, targetReps: "12" },
      mainLifts: [slot("m1", "ex-deadlift", 4)],
      secondaryLifts: [slot("s1", "ex-romanianDeadlift", 3), slot("s2", "ex-singleLegRDL", 3)],
      accessories: [slot("a1", "ex-hamstringCurl", 3, { superset: "sup1" }), slot("a2", "ex-hipThrust", 3, { superset: "sup1" })],
      optionalCore: slot("c1", "ex-deadBug", 2),
      finisher: "5 min AMRAP — 10 KB swings + 10 mountain climbers/side",
      cooldown: ["Hamstring stretch 30s/side", "Hip flexor stretch 30s/side", "Pigeon pose 45s/side"],
    },
    {
      id: "s4-c", label: "Day 3", name: "Horizontal Push + Pull", color: COLORS.ochre,
      warmup: ["5 min rowing machine, easy pace", "Arm circles x20 each direction", "Band pull-aparts x15", "Cat-cow x10"],
      prehabCore: [{ name: "Rotator Cuff External Rotation", targetSets: 2, targetReps: "15/side" }, { name: "Side Plank", targetSets: 2, targetReps: "30s/side" }],
      power: { name: "Explosive Push-Ups", targetSets: 3, targetReps: "5" },
      mainLifts: [slot("m1", "ex-dbBenchPress", 4), slot("m2", "ex-chestSupportedRow", 4)],
      secondaryLifts: [slot("s1", "ex-inclineDbPress", 3), slot("s2", "ex-seatedCableRow", 3)],
      accessories: [slot("a1", "ex-tricepsPushdown", 2, { superset: "sup1" }), slot("a2", "ex-bicepCurl", 2, { superset: "sup1" })],
      optionalCore: slot("c1", "ex-russianTwist", 2),
      finisher: "5 min row intervals — 20s hard / 40s easy x6",
      cooldown: ["Doorway chest stretch 30s/side", "Lat stretch 30s/side", "Cross-body shoulder stretch 30s/side"],
    },
    {
      id: "s4-d", label: "Day 4", name: "Vertical Push + Pull", color: COLORS.plum,
      warmup: ["5 min easy bike", "Band shoulder dislocates x10", "Scapular pull-ups x8", "Arm swings x15"],
      prehabCore: [{ name: "Banded Shoulder Ext. Rotation", targetSets: 2, targetReps: "12/side" }, { name: "Cable Woodchop", targetSets: 2, targetReps: "12/side" }],
      power: { name: "Med Ball Slams", targetSets: 3, targetReps: "8" },
      mainLifts: [slot("m1", "ex-pushPress", 4), slot("m2", "ex-weightedPullupNeg", 4)],
      secondaryLifts: [slot("s1", "ex-dbOverheadPress", 3), slot("s2", "ex-latPulldown", 3)],
      accessories: [slot("a1", "ex-lateralRaise", 2, { superset: "sup1" }), slot("a2", "ex-facePull", 2, { superset: "sup1" })],
      optionalCore: slot("c1", "ex-plank", 2),
      finisher: "5 min easy row, cooldown pace",
      cooldown: ["Lat stretch 30s/side", "Shoulder cross stretch 30s/side", "Supported child pose 45s"],
    },
  ],
};
const allDayExercises = (day) => [...day.mainLifts, ...day.secondaryLifts, ...day.accessories, ...(day.optionalCore ? [day.optionalCore] : [])];
const KEY_LIFTS = ["Back Squat", "Deadlift", "DB Bench Press"];

// ---------------------------------------------------------------------------
// Weekly schedule — leg-dominant days always land away from Fri/Sat/Sun
// (cheerleading recovery rule), matching the original slot pattern.
// ---------------------------------------------------------------------------
function buildDefaultSchedule(splitCount, days, runsPerWeek = 1) {
  const base = { 0: { type: "rest" }, 1: { type: "rest" }, 2: { type: "rest" }, 3: { type: "rest" }, 4: { type: "rest" }, 5: { type: "rest" }, 6: { type: "rest" } };
  if (!days || !days.length) return base;
  let runOrder;
  if (splitCount === 2) {
    base[1] = { type: "strength", dayId: days[0].id, time: "AM" };
    base[3] = { type: "strength", dayId: days[1].id, time: "AM" };
    runOrder = [2, 5, 6, 4, 0];
  } else if (splitCount === 3) {
    base[1] = { type: "strength", dayId: days[0].id, time: "AM" };
    base[3] = { type: "strength", dayId: days[1].id, time: "AM" };
    base[5] = { type: "strength", dayId: days[2].id, time: "AM" };
    runOrder = [2, 6, 4, 0];
  } else {
    base[1] = { type: "strength", dayId: days[0].id, time: "AM" };
    base[2] = { type: "strength", dayId: days[1].id, time: "AM" };
    base[3] = { type: "strength", dayId: days[2].id, time: "AM" };
    base[5] = { type: "strength", dayId: days[3].id, time: "AM" };
    runOrder = [6, 4, 0];
  }
  const n = clamp(runsPerWeek, 1, 3);
  const runDays = runOrder.slice(0, n);
  const roleMap = assignRunRoles(runDays, n);
  runDays.forEach((day) => { base[day] = { type: "run", role: roleMap[day] }; });
  return base;
}
// Assigns fixed roles to a set of weekdays once, at schedule-build time, so
// the role travels WITH the day when the person drags/swaps it elsewhere —
// rather than being recalculated from scratch by position on every render.
// Long Run lands on the latest (most weekend-adjacent) day, Quality Run takes
// the earliest (freshest legs), Easy Run fills whatever's left.
function assignRunRoles(weekdays, n) {
  const sorted = [...weekdays].sort((a, b) => a - b);
  if (n === 1) return { [sorted[0]]: "Run" };
  const map = {};
  const remaining = [...sorted];
  const longDay = remaining.pop();
  map[longDay] = "Long Run";
  if (n === 3) { const qd = remaining.shift(); map[qd] = "Quality Run"; }
  remaining.forEach((d) => { map[d] = "Easy Run"; });
  return map;
}
// ---------------------------------------------------------------------------
// Daily movement — two slots per day (AM + PM). Done-state keys: the plain ISO
// date for AM (same as before, so old check-offs survive) and "<iso>:pm" for PM.
//  - Gym day AM: 5–15 min pre-gym mobility (Tuesday: Core Pilates instead).
//  - Gym day PM: Split mobility after a squat-pattern day, Pancake mobility
//    after a hinge-pattern day, Yoga after any other day.
//  - Thursday (no gym): Full-Body Pilates in the morning.
//  - Sat/Sun: Stretching in the morning; Sat afternoon Mobility, Sun Yoga.
// ---------------------------------------------------------------------------
const moveKey = (iso, slot) => (slot === "am" ? iso : `${iso}:pm`);
function mobilityFocusForDay(day, library) {
  if (!day || !day.mainLifts || !day.mainLifts.length) return null;
  const cat = resolveEx(library, day.mainLifts[0].exerciseId).category;
  if (cat === "squat") return "split";
  if (cat === "hinge") return "pancake";
  return null;
}
function getDayMovement(weekday, schedule, dayById, library) {
  const entry = schedule[weekday];
  const gymDay = entry && entry.type === "strength" ? dayById[entry.dayId] : null;
  const isRun = !!entry && entry.type === "run";
  if (!gymDay && weekday === 6) {
    return [
      { slot: "am", time: "AM", name: "Stretching", context: "Easy weekend start" },
      { slot: "pm", time: "PM", name: "Mobility", context: "Afternoon — after sport" },
    ];
  }
  if (!gymDay && weekday === 0) {
    return [
      { slot: "am", time: "AM", name: "Stretching", context: "Keep it easy — cheer later" },
      { slot: "pm", time: "PM", name: "Yoga Flow", context: "Afternoon — after cheer" },
    ];
  }
  let am;
  if (weekday === 2) am = { name: "Core Pilates", context: gymDay ? `Instead of mobility — before ${gymDay.name}` : "Weekly Core Pilates session" };
  else if (weekday === 4 && !gymDay) am = { name: "Full-Body Pilates", context: "No gym today" };
  else if (gymDay) am = { name: "Pre-Gym Mobility", context: `5–15 min before ${gymDay.name}` };
  else am = { name: "Morning Mobility", context: isRun ? "5–15 min — run is later" : "5–15 min, easy start" };
  const focus = gymDay ? mobilityFocusForDay(gymDay, library) : null;
  let pm;
  if (focus === "split") pm = { name: "Split Mobility", context: `Front splits — evening after ${gymDay.name}` };
  else if (focus === "pancake") pm = { name: "Pancake Mobility", context: `Pancake fold — evening after ${gymDay.name}` };
  else pm = { name: "Yoga Flow", context: isRun ? "Evening — after your run" : "Evening wind-down" };
  return [{ slot: "am", time: "AM", ...am }, { slot: "pm", time: "PM", ...pm }];
}

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
  (session.optionalCore || []).forEach((ex) => { map[ex.id] = LETTERS[idx]; idx++; });
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
// Running plan — a 12-week progression toward the 10K, anchored to the
// program start date so the current week always advances on its own.
//
// This is genuinely two layers, not one:
// 1) RUN_PLAN is the "Long Run" track — the single session used when running
//    1x/week, and the dedicated Long Run role when running 2x or 3x/week.
// 2) QUALITY_PLAN is a separate speed/threshold progression, only used as the
//    "Quality Run" role at 3x/week — distinct pacing, distinct purpose,
//    periodized on its own (interval/tempo alternating, with deload weeks).
// A fixed, low-key "Easy Run" role fills any remaining weekly run slot.
// ---------------------------------------------------------------------------
const PROGRAM_START_DATE = "2026-08-03"; // Monday — anchors week 1
const RUN_PLAN = [
  { week: 1, type: "Recovery Run", color: COLORS.sage, distance: 4.5, target: "Easy, conversational pace", description: "Shake out the legs, relaxed form." },
  { week: 2, type: "Long Run", color: COLORS.ochre, distance: 6, target: "Easy-moderate, negative-split the last km", description: "Steady aerobic builder." },
  { week: 3, type: "Interval Run", color: COLORS.rust, distance: 5, target: "6 x 400m @ 5K effort, 90s jog rest", description: "Warm up 1km before intervals." },
  { week: 4, type: "Recovery Run", color: COLORS.sage, distance: 4.5, target: "Easy, conversational pace", description: "Active recovery after speed work." },
  { week: 5, type: "Long Run", color: COLORS.ochre, distance: 7, target: "Easy-moderate pace", description: "Push the distance, stay relaxed." },
  { week: 6, type: "Tempo Run", color: COLORS.plum, distance: 5.5, target: "20 min @ comfortably hard", description: "Continuous effort, no walk breaks." },
  { week: 7, type: "Long Run", color: COLORS.ochre, distance: 7.5, target: "Easy-moderate pace", description: "Longest run yet — fuel beforehand." },
  { week: 8, type: "Recovery Run", color: COLORS.sage, distance: 5, target: "Easy, conversational pace", description: "Deload week, keep it light." },
  { week: 9, type: "Interval Run", color: COLORS.rust, distance: 6, target: "8 x 400m @ 5K effort, 90s jog rest", description: "Warm up 1.5km before intervals." },
  { week: 10, type: "Long Run", color: COLORS.ochre, distance: 8.5, target: "Easy-moderate pace", description: "Practice race-day fueling." },
  { week: 11, type: "Tempo Run", color: COLORS.plum, distance: 6, target: "25 min @ comfortably hard", description: "Final speed sharpener." },
  { week: 12, type: "Long Run", color: COLORS.ochre, distance: 10, target: "Race pace or easy — your call", description: "Goal day — 10K!" },
];
function runForProgramWeek(week) {
  return RUN_PLAN[clamp(week, 1, RUN_PLAN.length) - 1];
}
function computeCurrentProgramWeek() {
  const start = new Date(PROGRAM_START_DATE + "T00:00:00");
  const diffDays = Math.floor((new Date() - start) / 86400000);
  const week = Math.floor(diffDays / 7) + 1;
  return clamp(week, 1, RUN_PLAN.length);
}
const TOTAL_PROGRAM_WEEKS = RUN_PLAN.length;

// Strength phases across the 12 weeks. Deloads land on weeks 4, 8 and 12 (same
// rhythm as the run plan); the final deload doubles as the 1RM test week.
const PHASE_BUILD = { label: "Build", short: "Build", color: COLORS.sage, deload: false, test: false, note: "Work sets with 2–3 reps in reserve. Add weight only when every set hits its reps." };
const PHASE_BUILD2 = { label: "Build+", short: "Build+", color: COLORS.rust, deload: false, test: false, note: "Loads climb now — leave about 1–2 reps in reserve on the main lifts." };
const PHASE_PEAK = { label: "Peak", short: "Peak", color: COLORS.plum, deload: false, test: false, note: "Heaviest block. Main lifts close to your limit with clean form — about 1 rep in reserve on the last set." };
const PHASE_DELOAD = { label: "Deload", short: "Deload", color: COLORS.ochre, deload: true, test: false, note: "About 60% of the usual sets and loads ~10% lighter. Move well and leave fresh — progression suggestions are paused." };
const PHASE_TEST = { label: "Deload + 1RM Test", short: "1RM", color: COLORS.ochre, deload: true, test: true, note: "Test day for Back Squat, Deadlift and DB Bench: ramp ~50% → 70% → 85% → 1RM. Everything else stays light. Use safety bars or a spotter, and if a true 1RM with dumbbells feels unsafe, test a 3–5RM instead." };
const STRENGTH_PHASES = [PHASE_BUILD, PHASE_BUILD, PHASE_BUILD, PHASE_DELOAD, PHASE_BUILD2, PHASE_BUILD2, PHASE_BUILD2, PHASE_DELOAD, PHASE_PEAK, PHASE_PEAK, PHASE_PEAK, PHASE_TEST].map((p, i) => ({ ...p, week: i + 1 }));
function phaseForWeek(week) {
  return STRENGTH_PHASES[clamp(week, 1, TOTAL_PROGRAM_WEEKS) - 1];
}
// The week can be set by hand (anchor = { week, monday }). From that Monday on
// it keeps advancing by itself, so you set it once and it follows along.
// Without an anchor it falls back to counting from PROGRAM_START_DATE.
function resolveProgramWeek(anchor) {
  if (!anchor) return computeCurrentProgramWeek();
  const then = new Date(anchor.monday + "T00:00:00");
  const now = new Date(mondayIso(0) + "T00:00:00");
  const weeksPassed = Math.round((now - then) / (7 * 86400000));
  return clamp(anchor.week + weeksPassed, 1, TOTAL_PROGRAM_WEEKS);
}
const RUN_TYPES = ["Recovery Run", "Long Run", "Interval Run", "Tempo Run"];
const RUN_TYPE_COLOR = { "Recovery Run": COLORS.sage, "Long Run": COLORS.ochre, "Interval Run": COLORS.rust, "Tempo Run": COLORS.plum };

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

// Dedicated speed/threshold progression — only surfaces as the "Quality Run"
// role at 3x/week, separate from the Long Run track above. Interval and
// tempo work alternate, with an easy-strides deload every 4th week.
const QUALITY_PLAN = [
  { week: 1, type: "Interval Run", target: "5 x 400m @ 5K effort, 90s jog rest", distance: 4 },
  { week: 2, type: "Tempo Run", target: "15 min @ comfortably hard", distance: 4.5 },
  { week: 3, type: "Interval Run", target: "6 x 400m @ 5K effort, 90s jog rest", distance: 4.5 },
  { week: 4, type: "Easy Strides", target: "20 min easy + 4 x 20s strides", distance: 4 },
  { week: 5, type: "Tempo Run", target: "18 min @ comfortably hard", distance: 5 },
  { week: 6, type: "Interval Run", target: "6 x 400m @ 5K effort, 75s jog rest", distance: 5 },
  { week: 7, type: "Tempo Run", target: "20 min @ comfortably hard", distance: 5.5 },
  { week: 8, type: "Easy Strides", target: "20 min easy + 4 x 20s strides", distance: 4.5 },
  { week: 9, type: "Interval Run", target: "8 x 400m @ 5K effort, 75s jog rest", distance: 5.5 },
  { week: 10, type: "Tempo Run", target: "22 min @ comfortably hard", distance: 6 },
  { week: 11, type: "Interval Run", target: "8 x 400m @ 5K effort, 60s jog rest", distance: 6 },
  { week: 12, type: "Tempo Run", target: "10 min @ race pace — tune-up", distance: 5 },
];
function qualityForProgramWeek(week) {
  return QUALITY_PLAN[clamp(week, 1, QUALITY_PLAN.length) - 1];
}
// Easy Run role — deliberately not periodized hard; supporting mileage only,
// with a gentle bump every 4 weeks rather than tracking the harder sessions.
function easyRunForProgramWeek(week) {
  const phase = week <= 4 ? 0 : week <= 8 ? 1 : 2;
  const distance = [4, 4.5, 5][phase];
  return { type: "Recovery Run", color: COLORS.sage, distance, target: "Easy, conversational pace", description: "Supporting mileage — keep effort relaxed and low-impact." };
}
// Builds this week's actual run session(s) with fixed roles:
// 1x = the Long Run track's session as-is (unchanged from before).
// 2x = Long Run + Easy Run.
// 3x = Long Run + Quality Run (dedicated speed/threshold) + Easy Run.
function buildWeekRunSessions(programWeek, runsPerWeek) {
  const main = runForProgramWeek(programWeek);
  const n = clamp(runsPerWeek, 1, 3);
  if (n === 1) {
    return [{ ...main, role: "Run", warmup: "10–15 min easy jog, building gradually into pace", cooldown: "5 min walk + calf and hamstring stretch" }];
  }
  const sessions = [{ ...main, role: "Long Run", warmup: "10–15 min easy jog, building gradually into pace", cooldown: "5 min walk + calf and hamstring stretch" }];
  if (n === 2) {
    const easy = easyRunForProgramWeek(programWeek);
    sessions.push({ ...easy, role: "Easy Run", warmup: "5 min brisk walk into an easy jog", cooldown: "5 min walk + hip flexor stretch" });
  } else {
    const quality = qualityForProgramWeek(programWeek);
    const easy = easyRunForProgramWeek(programWeek);
    sessions.push({ type: quality.type, color: COLORS.rust, distance: quality.distance, target: quality.target, description: "Dedicated speed/threshold work, separate from this week's Long Run.", role: "Quality Run", warmup: "10–15 min easy jog + 4 x 20s strides", cooldown: "5–10 min easy jog + full-body stretch" });
    sessions.push({ ...easy, role: "Easy Run", warmup: "5 min brisk walk into an easy jog", cooldown: "5 min walk + hip flexor stretch" });
  }
  return sessions;
}
// Maps this week's built sessions onto weekdays using each day's STORED role
// (set once in buildDefaultSchedule, and carried along whenever the person
// drags/swaps a run day elsewhere) — so reordering two run days in the
// Overview tab genuinely swaps which one is the Long Run vs Quality Run,
// instead of the role just snapping back based on weekday position.
function weekRunAssignments(schedule, programWeek) {
  const runWeekdays = Object.keys(schedule).map(Number).filter((wd) => schedule[wd] && schedule[wd].type === "run");
  if (!runWeekdays.length) return {};
  const n = runWeekdays.length;
  const sessions = buildWeekRunSessions(programWeek, n);
  const byRole = {};
  sessions.forEach((s) => { byRole[s.role] = s; });
  // Fallback role assignment (by position) covers any legacy/edge-case entry
  // that's missing a stored role, so nothing ever renders blank.
  const fallbackRoles = assignRunRoles(runWeekdays, n);
  const map = {};
  runWeekdays.forEach((wd) => {
    const role = schedule[wd].role || fallbackRoles[wd];
    map[wd] = byRole[role] || sessions[0];
  });
  return map;
}

// ---------------------------------------------------------------------------
// Quick mobility moves and stretches that can be added to any warmup or cooldown checklist.
// ---------------------------------------------------------------------------
const MOBILITY_CATALOG = ["90/90 hip switches x8/side", "Worldwide stretch x6/side", "Ankle circles x10/side", "Thoracic windmills x8/side", "Hip CARs x5/side", "Cossack squat x8/side", "Scapular wall slides x10", "Inchworm to cobra x8"];
const WARMUP_CATALOG = [...MOBILITY_CATALOG, "5 min stationary bike, easy pace", "5 min easy row", "5 min rowing machine, easy pace", "Leg swings x15/side", "Walking lunges x10", "Bodyweight squats x15", "Bodyweight RDL x10", "Band shoulder dislocates x10", "Band pull-aparts x15", "Arm swings x15", "Arm circles x20", "Cat-cow x10", "Scapular pull-ups x8"];
const COOLDOWN_EXTRAS = ["Deep lunge stretch 30s/side (splits work)", "Lat stretch 30s/side", "Hip flexor stretch 30s/side", "Pigeon pose 45s/side", "Hamstring stretch 30s/side", "Doorway chest stretch 30s/side", "Cross-body shoulder stretch 30s/side", "Supported child pose 45s"];
const PLYO_CATALOG = [
  { name: "Box Jumps", targetSets: 3, targetReps: "5" },
  { name: "Broad Jumps", targetSets: 3, targetReps: "5" },
  { name: "Jump Squats", targetSets: 3, targetReps: "6" },
  { name: "Skater Jumps", targetSets: 3, targetReps: "6/side" },
  { name: "Split Squat Jumps", targetSets: 3, targetReps: "5/side" },
  { name: "Kettlebell Swings", targetSets: 4, targetReps: "12" },
  { name: "Med Ball Slams", targetSets: 3, targetReps: "8" },
  { name: "Med Ball Chest Pass", targetSets: 3, targetReps: "6" },
  { name: "Explosive Push-Ups", targetSets: 3, targetReps: "5" },
  { name: "Pogo Hops", targetSets: 3, targetReps: "10" },
];
const PREHAB_CATALOG = [
  { name: "Glute Bridge", targetSets: 2, targetReps: "15" },
  { name: "Single-Leg Glute Bridge", targetSets: 2, targetReps: "10/side" },
  { name: "Dead Bug", targetSets: 2, targetReps: "10/side" },
  { name: "Bird Dog", targetSets: 2, targetReps: "10/side" },
  { name: "Pallof Press", targetSets: 2, targetReps: "10/side" },
  { name: "Cable Crunch", targetSets: 2, targetReps: "12" },
  { name: "Cable Woodchop", targetSets: 2, targetReps: "12/side" },
  { name: "Side Plank", targetSets: 2, targetReps: "30s/side" },
  { name: "Band Face Pull", targetSets: 2, targetReps: "15" },
  { name: "Band Pull-Apart", targetSets: 2, targetReps: "15" },
  { name: "Rotator Cuff External Rotation", targetSets: 2, targetReps: "15/side" },
  { name: "Banded Shoulder Ext. Rotation", targetSets: 2, targetReps: "12/side" },
  { name: "Monster Walk", targetSets: 2, targetReps: "12/side" },
];
const STRETCH_CATALOG = ["Figure-4 glute stretch 30s/side", "Seated forward fold 45s", "Butterfly stretch 45s", "Standing quad stretch 30s/side", "Frog stretch 45s", "Wall calf stretch 30s/side", "Thread-the-needle 30s/side", "Cobra stretch 30s"];
const COOLDOWN_CATALOG = [...STRETCH_CATALOG, ...COOLDOWN_EXTRAS];

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
function EditableChecklist({ items, doneMap, onToggle, onRemove, onAdd, onSwap, catalog }) {
  const [showAdd, setShowAdd] = useState(false);
  const [swapIndex, setSwapIndex] = useState(null);
  const available = catalog.filter((c) => !items.includes(c));
  return (
    <div className="flex flex-col gap-2">
      {items.map((item, i) => {
        const done = !!doneMap[i];
        return (
          <div key={i} className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <button onClick={() => onToggle(i)} className="flex-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors" style={{ background: done ? `${COLORS.green}1A` : COLORS.bg, border: `1px solid ${done ? COLORS.green : COLORS.border}` }}>
              <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: done ? COLORS.green : "#fff", border: `1.5px solid ${done ? COLORS.green : COLORS.border}` }}>{done && <Check size={12} color="#fff" />}</div>
              <span className="text-sm" style={{ color: done ? COLORS.green : COLORS.ink, fontFamily: "Poppins, sans-serif", textDecoration: done ? "line-through" : "none" }}>{item}</span>
            </button>
            {onSwap && <button onClick={() => setSwapIndex((c) => (c === i ? null : i))} className="p-1 shrink-0" style={{ color: swapIndex === i ? COLORS.plum : COLORS.muted, opacity: swapIndex === i ? 1 : 0.6 }} title="Swap"><ArrowLeftRight size={13} /></button>}
            <button onClick={() => onRemove(i)} className="p-1 shrink-0" style={{ color: COLORS.muted, opacity: 0.6 }}><X size={13} /></button>
          </div>
          {onSwap && swapIndex === i && (
            <div className="flex flex-col gap-1 rounded-xl p-2 max-h-40 overflow-y-auto" style={{ background: COLORS.bg }}>
              {catalog.filter((c) => !items.includes(c)).map((c) => (<button key={c} onClick={() => { onSwap(i, c); setSwapIndex(null); }} className="text-left text-xs px-2 py-1.5 rounded-lg" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif", background: "#fff" }}>{c}</button>))}
            </div>
          )}
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
function MiniExerciseBlock({ ex, letter, onTapSet, options, onSwap }) {
  const [showSwap, setShowSwap] = useState(false);
  const choices = (options || []).filter((o) => o.name !== ex.name);
  return (
    <div className="rounded-xl p-3" style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}` }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>{letter ? `${letter} — ` : ""}{ex.name}</span>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{ex.targetSets} x {ex.targetReps}</span>
          {onSwap && <button onClick={() => setShowSwap((v) => !v)} className="p-1" style={{ color: showSwap ? COLORS.plum : COLORS.muted, opacity: showSwap ? 1 : 0.6 }} title="Swap exercise"><ArrowLeftRight size={13} /></button>}
        </div>
      </div>
      {onSwap && showSwap && (
        <div className="flex flex-col gap-1 rounded-xl p-2 mb-2 max-h-40 overflow-y-auto" style={{ background: "#fff" }}>
          {choices.map((o) => (<button key={o.name} onClick={() => { onSwap(o); setShowSwap(false); }} className="text-left text-xs px-2 py-1.5 rounded-lg" style={{ background: COLORS.bg, color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>{o.name} <span style={{ color: COLORS.muted }}>· {o.targetSets} x {o.targetReps}</span></button>))}
        </div>
      )}
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
function ExerciseCard({ ex, color, letter, library, history, onChangeSet, onToggleDone, onAddSet, onRemoveSet, onRemove, onSwap }) {
  const [showSwap, setShowSwap] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [smartSuggestion, setSmartSuggestion] = useState(null);
  const sameCategory = library.filter((l) => l.category === ex.category && l.id !== ex.exerciseId);
  const otherCategory = library.filter((l) => l.category !== ex.category);
  const swapList = showAll ? [...sameCategory, ...otherCategory] : sameCategory;
  const catLabel = CATEGORY_META[ex.category]?.label || "";

  const tryNotFeelingIt = () => {
    setShowSwap(false);
    setSmartSuggestion(getSmartSwap(ex.exerciseId, ex.category, library, history));
  };

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
          <div key={i} className="grid grid-cols-[22px_1fr_58px_48px_26px_16px] gap-1.5 items-center rounded-xl px-1 py-1.5 transition-colors" style={{ background: s.done ? `${COLORS.green}1A` : "transparent" }}>
            <span className="text-sm font-bold text-center" style={{ color: s.done ? COLORS.green : COLORS.ink, fontFamily: "Oswald, sans-serif" }}>{s.set}</span>
            <span className="text-xs truncate" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{s.prev}</span>
            <input type="number" inputMode="decimal" value={s.weight} onChange={(e) => onChangeSet(i, "weight", e.target.value)} placeholder="0" className="w-full rounded-lg px-1.5 py-1.5 text-sm text-center outline-none" style={{ background: "#fff", border: `1px solid ${COLORS.border}`, fontFamily: "Poppins, sans-serif" }} />
            <input type="number" inputMode="numeric" value={s.reps} onChange={(e) => onChangeSet(i, "reps", e.target.value)} placeholder="0" className="w-full rounded-lg px-1.5 py-1.5 text-sm text-center outline-none" style={{ background: "#fff", border: `1px solid ${COLORS.border}`, fontFamily: "Poppins, sans-serif" }} />
            <button onClick={() => onToggleDone(i)} className="w-7 h-7 rounded-full flex items-center justify-center mx-auto" style={{ background: s.done ? COLORS.green : "#fff", border: `1.5px solid ${s.done ? COLORS.green : COLORS.border}` }}>{s.done && <Check size={14} color="#fff" />}</button>
            {ex.sets.length > 1 ? (<button onClick={() => onRemoveSet(i)} className="flex items-center justify-center" style={{ color: COLORS.muted, opacity: 0.5 }}><X size={12} /></button>) : <span />}
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
function ExerciseGroup({ title, color, list, letters, library, history, onChangeSet, onToggleDone, onAddSet, onRemoveSet, onRemove, onSwap }) {
  if (!list.length) return null;
  return (
    <div>
      <SectionLabel color={color}>{title}</SectionLabel>
      <div className="flex flex-col gap-3">
        {list.map((ex) => (<ExerciseCard key={ex.id} ex={ex} color={color} letter={letters[ex.id]} library={library} history={history} onChangeSet={(i, f, v) => onChangeSet(ex.id, i, f, v)} onToggleDone={(i) => onToggleDone(ex.id, i)} onAddSet={() => onAddSet(ex.id)} onRemoveSet={(i) => onRemoveSet(ex.id, i)} onRemove={() => onRemove(ex.id)} onSwap={(data) => onSwap(ex.id, data)} />))}
      </div>
    </div>
  );
}
function AccessoriesSection({ title, color, list, letters, library, history, onChangeSet, onToggleDone, onAddSet, onRemoveSet, onRemove, onSwap }) {
  if (!list.length) return null;
  const groups = groupBySuperset(list);
  return (
    <div>
      <SectionLabel color={color}>{title}</SectionLabel>
      <div className="flex flex-col gap-3">
        {groups.map((g, gi) => {
          if (g.type === "superset") {
            const boxLetter = (letters[g.items[0].id] || "").replace(/\d+$/, "");
            return (
              <SupersetBox key={gi} letter={boxLetter} color={color}>
                {g.items.map((ex) => (<ExerciseCard key={ex.id} ex={ex} color={color} letter={letters[ex.id]} library={library} history={history} onChangeSet={(i, f, v) => onChangeSet(ex.id, i, f, v)} onToggleDone={(i) => onToggleDone(ex.id, i)} onAddSet={() => onAddSet(ex.id)} onRemoveSet={(i) => onRemoveSet(ex.id, i)} onRemove={() => onRemove(ex.id)} onSwap={(data) => onSwap(ex.id, data)} />))}
              </SupersetBox>
            );
          }
          const ex = g.ex;
          return (<ExerciseCard key={ex.id} ex={ex} color={color} letter={letters[ex.id]} library={library} history={history} onChangeSet={(i, f, v) => onChangeSet(ex.id, i, f, v)} onToggleDone={(i) => onToggleDone(ex.id, i)} onAddSet={() => onAddSet(ex.id)} onRemoveSet={(i) => onRemoveSet(ex.id, i)} onRemove={() => onRemove(ex.id)} onSwap={(data) => onSwap(ex.id, data)} />);
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Workout screen
// ---------------------------------------------------------------------------
function buildSlotExercise(library, slotDef, weightSuggestions) {
  const ex = resolveEx(library, slotDef.exerciseId);
  const suggestion = weightSuggestions && weightSuggestions[ex.name];
  const prevText = suggestion ? `Suggested ${suggestion.suggestedWeight}kg` : (ex.reps || "—");
  return {
    id: slotDef.slot,
    exerciseId: slotDef.exerciseId,
    name: ex.name,
    muscle: ex.muscle,
    category: ex.category,
    superset: slotDef.superset || null,
    sets: buildSets(slotDef.sets, prevText),
    suggestion: suggestion || null,
  };
}
// Deload weeks trim volume and pause progression nudges. In the final week the
// key lifts become a 1RM ramp instead.
function adjustForPhase(ex, phase, isMain) {
  if (!phase || !phase.deload) return ex;
  if (phase.test && isMain && KEY_LIFTS.includes(ex.name)) {
    const ramp = ["Warm-up ~50% x5", "~70% x3", "~85% x1–2", "Test: 1RM x1", "Test: 1RM x1 (opt.)"];
    return { ...ex, oneRmTest: true, suggestion: null, sets: ramp.map((prev, i) => ({ set: i + 1, prev, weight: "", reps: "", done: false })) };
  }
  const n = Math.max(2, Math.round(ex.sets.length * 0.6));
  return { ...ex, suggestion: null, sets: ex.sets.slice(0, n).map((s) => ({ ...s, prev: "Deload ~-10%" })) };
}
function makeSession(day, library, weightSuggestions, phase) {
  return {
    id: day.id, name: day.name, color: day.color, phase: phase || null,
    warmup: [...day.warmup], warmupDone: {},
    prehabCore: day.prehabCore.map((e) => ({ ...e, completed: Array(e.targetSets).fill(false) })),
    power: [{ ...day.power, completed: Array(day.power.targetSets).fill(false) }],
    mainLift: day.mainLifts.map((s) => adjustForPhase(buildSlotExercise(library, s, weightSuggestions), phase, true)),
    secondaryLifts: day.secondaryLifts.map((s) => adjustForPhase(buildSlotExercise(library, s, weightSuggestions), phase, false)),
    accessories: day.accessories.map((s) => adjustForPhase(buildSlotExercise(library, s, weightSuggestions), phase, false)),
    optionalCore: day.optionalCore ? [adjustForPhase(buildSlotExercise(library, day.optionalCore, weightSuggestions), phase, false)] : [],
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
  const categories = ["mainLift", "secondaryLifts", "accessories", "optionalCore"];
  const letters = computeLetters(session);

  const changeSet = (cat, exId, i, field, val) => setSession((prev) => ({ ...prev, [cat]: prev[cat].map((ex) => (ex.id === exId ? { ...ex, sets: ex.sets.map((s, si) => (si === i ? { ...s, [field]: val } : s)) } : ex)) }));
  const toggleDone = (cat, exId, i) => setSession((prev) => ({ ...prev, [cat]: prev[cat].map((ex) => (ex.id === exId ? { ...ex, sets: ex.sets.map((s, si) => (si === i ? { ...s, done: !s.done } : s)) } : ex)) }));
  const addSet = (cat, exId) => setSession((prev) => ({ ...prev, [cat]: prev[cat].map((ex) => (ex.id === exId ? { ...ex, sets: [...ex.sets, { set: ex.sets.length + 1, prev: "—", weight: "", reps: "", done: false }] } : ex)) }));
  const removeSet = (cat, exId, i) => setSession((prev) => ({ ...prev, [cat]: prev[cat].map((ex) => (ex.id === exId ? { ...ex, sets: ex.sets.filter((_, si) => si !== i).map((s, si2) => ({ ...s, set: si2 + 1 })) } : ex)) }));
  const removeEx = (cat, exId) => setSession((prev) => ({ ...prev, [cat]: prev[cat].filter((ex) => ex.id !== exId) }));
  const swapEx = (cat, exId, data) => setSession((prev) => ({ ...prev, [cat]: prev[cat].map((ex) => (ex.id === exId ? { ...ex, name: data.name, muscle: data.muscle, category: data.category, exerciseId: data.id, sets: buildSets(ex.sets.length, data.reps || "—") } : ex)) }));

  const toggleChecklist = (field, index) => setSession((prev) => { const doneMap = { ...prev[field] }; doneMap[index] = !doneMap[index]; return { ...prev, [field]: doneMap }; });
  const removeChecklistItem = (field, index) => setSession((prev) => {
    const items = prev[field].filter((_, i) => i !== index);
    const oldDone = prev[field + "Done"];
    const newDone = {}; let ni = 0;
    prev[field].forEach((_, i) => { if (i === index) return; newDone[ni] = oldDone[i] || false; ni++; });
    return { ...prev, [field]: items, [field + "Done"]: newDone };
  });
  const addChecklistItem = (field, item) => setSession((prev) => ({ ...prev, [field]: [...prev[field], item] }));
  const swapChecklistItem = (field, index, item) => setSession((prev) => ({ ...prev, [field]: prev[field].map((x, i) => (i === index ? item : x)), [field + "Done"]: { ...prev[field + "Done"], [index]: false } }));
  const swapMini = (field, exIndex, option) => setSession((prev) => ({ ...prev, [field]: prev[field].map((ex, i) => (i === exIndex ? { ...ex, name: option.name, targetSets: option.targetSets, targetReps: option.targetReps, completed: Array(option.targetSets).fill(false) } : ex)) }));
  const toggleMini = (field, exIndex, setIndex) => setSession((prev) => ({ ...prev, [field]: prev[field].map((ex, i) => { if (i !== exIndex) return ex; const completed = [...ex.completed]; completed[setIndex] = !completed[setIndex]; return { ...ex, completed }; }) }));
  const addExerciseFromCatalog = (item) => { setSession((prev) => ({ ...prev, accessories: [...prev.accessories, { id: `custom-${Date.now()}`, exerciseId: item.id, name: item.name, muscle: item.muscle, category: item.category, superset: null, sets: buildSets(item.sets || 3, item.reps || "—") }] })); setShowPicker(false); };
  const totalSetsDone = categories.reduce((acc, cat) => acc + session[cat].reduce((a, ex) => a + ex.sets.filter((s) => s.done).length, 0), 0);

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

      {session.phase && session.phase.deload && (
        <div className="rounded-2xl p-4" style={{ background: `${session.phase.color}1A`, border: `1.5px solid ${session.phase.color}` }}>
          <span className="text-[11px] uppercase tracking-widest font-bold" style={{ color: session.phase.color, fontFamily: "Poppins, sans-serif" }}>Week {session.phase.week} · {session.phase.label}</span>
          <p className="text-xs mt-1 leading-relaxed" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>{session.phase.note}</p>
        </div>
      )}
      <div className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
        <SectionLabel color={session.color}>Warmup</SectionLabel>
        <EditableChecklist items={session.warmup} doneMap={session.warmupDone} onToggle={(i) => toggleChecklist("warmupDone", i)} onRemove={(i) => removeChecklistItem("warmup", i)} onAdd={(item) => addChecklistItem("warmup", item)} onSwap={(i, item) => swapChecklistItem("warmup", i, item)} catalog={WARMUP_CATALOG} />
      </div>
      <div className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
        <SectionLabel color={session.color}>Prehab + Core Superset</SectionLabel>
        <div className="flex flex-col gap-2">{session.prehabCore.map((ex, i) => (<MiniExerciseBlock key={i} ex={ex} options={PREHAB_CATALOG} onSwap={(o) => swapMini("prehabCore", i, o)} onTapSet={(si) => toggleMini("prehabCore", i, si)} />))}</div>
      </div>
      <div className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
        <SectionLabel color={session.color}>Power / Plyometrics</SectionLabel>
        <div className="flex flex-col gap-2">{session.power.map((ex, i) => (<MiniExerciseBlock key={i} ex={ex} letter="A" options={PLYO_CATALOG} onSwap={(o) => swapMini("power", i, o)} onTapSet={(si) => toggleMini("power", i, si)} />))}</div>
      </div>

      <ExerciseGroup title="Main Lift" color={session.color} list={session.mainLift} letters={letters} library={exerciseLibrary} history={history} onChangeSet={(id, i, f, v) => changeSet("mainLift", id, i, f, v)} onToggleDone={(id, i) => toggleDone("mainLift", id, i)} onAddSet={(id) => addSet("mainLift", id)} onRemoveSet={(id, i) => removeSet("mainLift", id, i)} onRemove={(id) => removeEx("mainLift", id)} onSwap={(id, d) => swapEx("mainLift", id, d)} />
      <ExerciseGroup title="Secondary Lifts" color={session.color} list={session.secondaryLifts} letters={letters} library={exerciseLibrary} history={history} onChangeSet={(id, i, f, v) => changeSet("secondaryLifts", id, i, f, v)} onToggleDone={(id, i) => toggleDone("secondaryLifts", id, i)} onAddSet={(id) => addSet("secondaryLifts", id)} onRemoveSet={(id, i) => removeSet("secondaryLifts", id, i)} onRemove={(id) => removeEx("secondaryLifts", id)} onSwap={(id, d) => swapEx("secondaryLifts", id, d)} />
      <AccessoriesSection title="Accessories" color={session.color} list={session.accessories} letters={letters} library={exerciseLibrary} history={history} onChangeSet={(id, i, f, v) => changeSet("accessories", id, i, f, v)} onToggleDone={(id, i) => toggleDone("accessories", id, i)} onAddSet={(id) => addSet("accessories", id)} onRemoveSet={(id, i) => removeSet("accessories", id, i)} onRemove={(id) => removeEx("accessories", id)} onSwap={(id, d) => swapEx("accessories", id, d)} />
      <ExerciseGroup title="Core" color={session.color} list={session.optionalCore} letters={letters} library={exerciseLibrary} history={history} onChangeSet={(id, i, f, v) => changeSet("optionalCore", id, i, f, v)} onToggleDone={(id, i) => toggleDone("optionalCore", id, i)} onAddSet={(id) => addSet("optionalCore", id)} onRemoveSet={(id, i) => removeSet("optionalCore", id, i)} onRemove={(id) => removeEx("optionalCore", id)} onSwap={(id, d) => swapEx("optionalCore", id, d)} />

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
      <div className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
        <SectionLabel color={session.color}>Cooldown</SectionLabel>
        <EditableChecklist items={session.cooldown} doneMap={session.cooldownDone} onToggle={(i) => toggleChecklist("cooldownDone", i)} onRemove={(i) => removeChecklistItem("cooldown", i)} onAdd={(item) => addChecklistItem("cooldown", item)} onSwap={(i, item) => swapChecklistItem("cooldown", i, item)} catalog={COOLDOWN_CATALOG} />
      </div>

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
function ProgramWeekPicker({ programWeek, isManual, onSelect, onAuto }) {
  const phase = phaseForWeek(programWeek);
  return (
    <div className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
      <div className="flex items-center justify-between mb-3 gap-2">
        <h2 className="text-sm uppercase tracking-widest font-bold" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>12-Week Program</h2>
        <Pill color={phase.color}>Week {programWeek} · {phase.label}</Pill>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {STRENGTH_PHASES.map((p) => {
          const active = p.week === programWeek;
          const past = p.week < programWeek;
          return (
            <button key={p.week} onClick={() => onSelect(p.week)} className="rounded-xl px-3 py-2 flex flex-col items-center shrink-0" style={{ minWidth: "58px", background: active ? p.color : past ? `${p.color}1A` : COLORS.bg, border: `1.5px solid ${active || past ? p.color : COLORS.border}` }}>
              <span className="text-[9px] uppercase font-bold" style={{ color: active ? "#fff" : COLORS.muted, fontFamily: "Poppins, sans-serif" }}>Wk</span>
              <span className="text-lg font-bold leading-none" style={{ color: active ? "#fff" : COLORS.ink, fontFamily: "Oswald, sans-serif" }}>{p.week}</span>
              <span className="text-[9px] font-semibold mt-0.5" style={{ color: active ? "#fff" : p.color, fontFamily: "Poppins, sans-serif" }}>{p.short}</span>
            </button>
          );
        })}
      </div>
      <p className="text-xs mt-3 leading-relaxed" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{phase.note}</p>
      <div className="flex items-center justify-between mt-2 gap-2">
        <span className="text-[11px]" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{isManual ? "Set by you — moves on automatically each Monday." : "Following the calendar from the program start."}</span>
        {isManual && <button onClick={onAuto} className="text-[11px] font-semibold shrink-0" style={{ color: COLORS.ochre, fontFamily: "Poppins, sans-serif" }}>Back to auto</button>}
      </div>
    </div>
  );
}
function WorkoutHome({ weeklySplit, setWeeklySplit, days, onStartDay, onOpenOverview, programWeek, isManualWeek, onSelectWeek, onAutoWeek }) {
  return (
    <div className="flex flex-col gap-5 pb-6">
      <ProgramWeekPicker programWeek={programWeek} isManual={isManualWeek} onSelect={onSelectWeek} onAuto={onAutoWeek} />
      <div>
        <h2 className="text-sm uppercase tracking-widest font-bold mb-2" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>This Week's Split</h2>
        <Segmented options={[{ value: 2, label: "2-Day" }, { value: 3, label: "3-Day" }, { value: 4, label: "4-Day" }]} value={weeklySplit} onChange={(v) => setWeeklySplit(v)} color={COLORS.rust} />
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
      <button onClick={onOpenOverview} className="w-full rounded-2xl py-3 text-sm font-semibold flex items-center justify-center gap-2" style={{ background: `${COLORS.plum}1A`, color: COLORS.plum, fontFamily: "Poppins, sans-serif" }}><LayoutGrid size={16} /> View Full Weekly Overview</button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overview — the big weekly picture across every activity type: strength,
// running, morning mobility, and desk snacks,  This tab is read-first: tapping an
// activity opens or launches it, but completion toggling stays on that
// activity's own tab so there's exactly one place each habit lives. The
// grip handle keeps the old "move a day's schedule" ability alive.
// ---------------------------------------------------------------------------
function OverviewScreen({ getSchedule, setSchedule, isCustom, onReset, dayById, history, runHistory, onStartDay, onStartRun, currentProgramWeek }) {
  const [offset, setOffset] = useState(0);
  const [moveSource, setMoveSource] = useState(null);
  const schedule = getSchedule(offset);
  const weekDates = getWeekDates(addWeeks(new Date(), offset));
  const todayIso = todayISO();
  const programWeek = clamp(currentProgramWeek + offset, 1, RUN_PLAN.length);
  const runAssignments = weekRunAssignments(schedule, programWeek);
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
          const a = schedule[weekday];
          const strengthDay = a.type === "strength" ? dayById[a.dayId] : null;
          const strengthComplete = strengthDay ? historyDates.has(iso) : false;
          const runSessionForDay = a.type === "run" ? runAssignments[weekday] : null;
          const runComplete = runSessionForDay ? runDates.has(iso) : false;
          const isRest = a.type === "rest";

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
                      <span className="text-xs flex-1 font-medium truncate" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>{strengthDay.name} <span style={{ color: COLORS.muted }}>· {a.time}</span></span>
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
function buildTodayAgenda(weekday, schedule, dayById, library, programWeek) {
  const items = [];
  const [am, pm] = getDayMovement(weekday, schedule, dayById, library);
  items.push({ kind: "movement", order: 1, move: am });
  const a = schedule[weekday];
  if (a.type === "strength" && dayById[a.dayId]) items.push({ kind: "strength", order: a.time === "PM" ? 3 : 2, day: dayById[a.dayId], time: a.time });
  else if (a.type === "run") { const assignments = weekRunAssignments(schedule, programWeek); items.push({ kind: "run", order: 4, run: assignments[weekday] || runForProgramWeek(programWeek) }); }
  else items.push({ kind: "rest", order: 3 });
  items.push({ kind: "movement", order: 5, move: pm });
  return items.sort((x, y) => x.order - y.order);
}
function Dashboard({ streak, weekCount, total, prs, schedule, dayById, days, morningDone, onToggleMorning, onStartDay, onOpenRun, exerciseLibrary, programWeek }) {
  const [showOthers, setShowOthers] = useState(false);
  const todayWeekday = new Date().getDay();
  const todayIso = todayISO();
  const agenda = buildTodayAgenda(todayWeekday, schedule, dayById, exerciseLibrary, programWeek);

  return (
    <div className="flex flex-col gap-5 pb-6">
      <div className="rounded-xl px-4 py-2.5 flex items-center justify-between" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
        <span className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>12-Week Program · Week {programWeek} · {phaseForWeek(programWeek).label}</span>
      </div>

      <div className="flex gap-3">
        <StatBox label="Streak" value={streak} icon={Flame} accent={COLORS.rust} />
        <StatBox label="This Week" value={weekCount} icon={Dumbbell} accent={COLORS.sage} />
        <StatBox label="Total" value={total} icon={Trophy} accent={COLORS.ochre} />
      </div>

      <div>
        <h2 className="text-sm uppercase tracking-widest font-bold mb-3" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>Today's Plan</h2>
        <div className="flex flex-col gap-2.5">
          {agenda.map((item, idx) => {
            if (item.kind === "movement") {
              const m = item.move;
              const accent = m.slot === "am" ? COLORS.sage : COLORS.plum;
              const done = !!morningDone[moveKey(todayIso, m.slot)];
              return (
                <button key={idx} onClick={() => onToggleMorning(moveKey(todayIso, m.slot))} className="w-full rounded-2xl p-3.5 flex items-center gap-3 text-left" style={{ background: done ? `${accent}1A` : COLORS.card, border: `1px solid ${done ? accent : COLORS.border}` }}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: done ? accent : "#fff", border: `1.5px solid ${done ? accent : COLORS.border}` }}>{done ? <Check size={15} color="#fff" /> : m.slot === "am" ? <Sunrise size={15} style={{ color: COLORS.muted }} /> : <Moon size={15} style={{ color: COLORS.muted }} />}</div>
                  <div className="flex-1">
                    <span className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: accent, fontFamily: "Poppins, sans-serif" }}>{m.time} · {m.slot === "am" ? "Morning Movement" : "Evening Movement"}</span>
                    <div className="text-base font-bold" style={{ color: COLORS.ink, fontFamily: "Oswald, sans-serif" }}>{m.name}</div>
                    <span className="text-xs" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{m.context}</span>
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
function WorkoutSummaryScreen({ summary, onContinue }) {
  const prCount = summary.exercises.filter((e) => e.isPR).length;
  const withSuggestions = summary.exercises.filter((e) => e.suggestion);
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

      <button onClick={onContinue} className="w-full rounded-2xl py-3.5 text-sm font-bold uppercase tracking-wider" style={{ background: summary.color, color: "#fff", fontFamily: "Poppins, sans-serif" }}>Continue to History</button>
    </div>
  );
}

function HistoryScreen({ history, onDelete }) {
  const [confirmId, setConfirmId] = useState(null);
  const sorted = [...history].sort((a, b) => (a.date < b.date ? 1 : -1));
  return (
    <div className="flex flex-col gap-3 pb-6">
      <h2 className="text-sm uppercase tracking-widest font-bold mb-1" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>Workout History</h2>
      {sorted.map((w) => (
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
                  <button onClick={() => { onDelete(w.id); setConfirmId(null); }} className="text-xs font-bold" style={{ color: COLORS.red, fontFamily: "Poppins, sans-serif" }}>Delete</button>
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
  );
}

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------
function ProgressScreen({ prs, trends }) {
  const maxVol = Math.max(...VOLUME_BY_MUSCLE.map((v) => v.volume));
  const muscleColors = [COLORS.rust, COLORS.sage, COLORS.ochre, COLORS.plum, COLORS.red];
  return (
    <div className="flex flex-col gap-5 pb-6">
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
    </div>
  );
}

// ---------------------------------------------------------------------------
// Running
// ---------------------------------------------------------------------------
function RunningScreen({ runHistory, weeksDone, onLogRun, onToggleWeek, onDeleteRun, runsPerWeek, setRunsPerWeek, onStartRun, programWeek }) {
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");
  const current = runForProgramWeek(programWeek);
  const [type, setType] = useState(current.type);
  const [confirmId, setConfirmId] = useState(null);
  const pace = distance && duration ? parseFloat(duration) / parseFloat(distance) : null;
  const sorted = [...runHistory].sort((a, b) => (a.date < b.date ? 1 : -1));
  const maxDist = Math.max(...runHistory.map((r) => r.distance), 1);
  const weekSessions = buildWeekRunSessions(programWeek, runsPerWeek);

  const submit = () => {
    if (!distance || !duration) return;
    onLogRun({ id: `r-${Date.now()}`, date: todayISO(), distance: parseFloat(distance), duration: parseFloat(duration), type });
    setDistance(""); setDuration("");
  };

  return (
    <div className="flex flex-col gap-5 pb-6">
      <div className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
        <h2 className="text-sm uppercase tracking-widest font-bold mb-2" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>Runs Per Week</h2>
        <Segmented options={[{ value: 1, label: "1x" }, { value: 2, label: "2x" }, { value: 3, label: "3x" }]} value={runsPerWeek} onChange={(v) => setRunsPerWeek(v)} color={COLORS.ochre} />
        <p className="text-[11px] mt-2" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>Sets how many run days show up here and on the Workout calendar for weeks you haven't customized. Sunday stays reserved for cheer whenever possible.</p>
      </div>

      <div>
        <h2 className="text-sm uppercase tracking-widest font-bold mb-3" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>This Week's Runs · Week {programWeek} of 12</h2>
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
        <button onClick={() => onToggleWeek(programWeek - 1)} className="mt-3 w-full rounded-xl py-2.5 text-sm font-bold flex items-center justify-center gap-2" style={{ background: weeksDone[programWeek - 1] ? COLORS.green : "#fff", color: weeksDone[programWeek - 1] ? "#fff" : COLORS.muted, border: weeksDone[programWeek - 1] ? "none" : `1.5px solid ${COLORS.border}`, fontFamily: "Poppins, sans-serif" }}>
          {weeksDone[programWeek - 1] ? (<><Check size={15} /> Program Week Marked Done</>) : "Mark Program Week Done"}
        </button>
      </div>

      <div>
        <h2 className="text-sm uppercase tracking-widest font-bold mb-2" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>12-Week Plan</h2>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {RUN_PLAN.map((w, i) => {
            const done = !!weeksDone[i];
            const isCurrent = w.week === programWeek;
            return (
              <button key={i} onClick={() => onToggleWeek(i)} className="rounded-xl px-3 py-2 flex flex-col items-center shrink-0" style={{ minWidth: "76px", background: done ? `${w.color}1A` : COLORS.card, border: `1.5px solid ${isCurrent ? w.color : done ? w.color : COLORS.border}` }}>
                <span className="text-[9px] uppercase font-bold" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>Wk {w.week}</span>
                <span className="text-xs font-bold text-center leading-tight" style={{ color: w.color, fontFamily: "Poppins, sans-serif" }}>{w.type.replace(" Run", "")}</span>
                <span className="text-sm font-bold" style={{ color: COLORS.ink, fontFamily: "Oswald, sans-serif" }}>{w.distance}k</span>
              </button>
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
function ExerciseLibraryList({ library, onAddCustom, onDeleteCustom }) {
  const [showForm, setShowForm] = useState(false);
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
    </div>
  );
}
function SlotRow({ label, ex, onChange }) {
  return (
    <div className="rounded-xl p-3 flex items-center justify-between gap-2" style={{ background: COLORS.bg }}>
      <div>
        <div className="text-[10px] uppercase font-bold tracking-wide" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{label}</div>
        <div className="text-sm font-semibold" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>{ex.name}</div>
      </div>
      <button onClick={onChange} className="text-xs font-bold px-3 py-1.5 rounded-full shrink-0" style={{ background: `${COLORS.sage}1A`, color: COLORS.sage, fontFamily: "Poppins, sans-serif" }}>Change</button>
    </div>
  );
}
function SlotPicker({ library, category, onPick, onClose }) {
  const [showAll, setShowAll] = useState(false);
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
function TemplateEditor({ dayTemplates, library, onUpdateSlot }) {
  const [split, setSplit] = useState(4);
  const [expanded, setExpanded] = useState(null);
  const [picking, setPicking] = useState(null);
  const days = dayTemplates[String(split)];

  return (
    <div className="flex flex-col gap-4 pb-6">
      <Segmented options={[{ value: 2, label: "2-Day" }, { value: 3, label: "3-Day" }, { value: 4, label: "4-Day" }]} value={split} onChange={(v) => { setSplit(v); setExpanded(null); setPicking(null); }} color={COLORS.rust} />
      <p className="text-[11px]" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>Editing here updates the same plan shown in the Workout tab.</p>
      <div className="flex flex-col gap-3">
        {days.map((day) => (
          <div key={day.id} className="rounded-2xl overflow-hidden" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
            <button onClick={() => setExpanded(expanded === day.id ? null : day.id)} className="w-full p-4 flex items-center gap-3 text-left">
              <div className="w-1.5 self-stretch rounded-full" style={{ background: day.color }} />
              <div className="flex-1">
                <span className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: day.color, fontFamily: "Poppins, sans-serif" }}>{day.label}</span>
                <div className="text-lg font-bold" style={{ color: COLORS.ink, fontFamily: "Oswald, sans-serif" }}>{day.name}</div>
              </div>
              {expanded === day.id ? <ChevronUp size={16} style={{ color: COLORS.muted }} /> : <ChevronDown size={16} style={{ color: COLORS.muted }} />}
            </button>
            {expanded === day.id && (
              <div className="px-4 pb-4 flex flex-col gap-2">
                {day.mainLifts.map((s, i) => {
                  const ex = resolveEx(library, s.exerciseId);
                  return <SlotRow key={s.slot} label={`Main Lift ${i + 1}`} ex={ex} onChange={() => setPicking({ dayId: day.id, group: "mainLifts", slotId: s.slot, category: ex.category })} />;
                })}
                {day.secondaryLifts.map((s, i) => {
                  const ex = resolveEx(library, s.exerciseId);
                  return <SlotRow key={s.slot} label={`Secondary ${i + 1}`} ex={ex} onChange={() => setPicking({ dayId: day.id, group: "secondaryLifts", slotId: s.slot, category: ex.category })} />;
                })}
                {day.accessories.map((s, i) => {
                  const ex = resolveEx(library, s.exerciseId);
                  return <SlotRow key={s.slot} label={s.superset ? `Accessory (Superset)` : `Accessory ${i + 1}`} ex={ex} onChange={() => setPicking({ dayId: day.id, group: "accessories", slotId: s.slot, category: ex.category })} />;
                })}
                {day.optionalCore && (() => {
                  const ex = resolveEx(library, day.optionalCore.exerciseId);
                  return <SlotRow label="Optional Core" ex={ex} onChange={() => setPicking({ dayId: day.id, group: "optionalCore", slotId: day.optionalCore.slot, category: "core" })} />;
                })()}
              </div>
            )}
          </div>
        ))}
      </div>
      {picking && (
        <SlotPicker
          library={library}
          category={picking.category}
          onPick={(exId) => { onUpdateSlot(String(split), picking.dayId, picking.group, picking.slotId, exId); setPicking(null); }}
          onClose={() => setPicking(null)}
        />
      )}
    </div>
  );
}
function ExerciseOverviewScreen({ library, dayTemplates, onAddCustom, onDeleteCustom, onUpdateSlot }) {
  const [mode, setMode] = useState("library");
  return (
    <div className="flex flex-col gap-4 pb-6">
      <Segmented options={[{ value: "library", label: "Library" }, { value: "edit", label: "Edit Workouts" }]} value={mode} onChange={setMode} color={COLORS.plum} />
      {mode === "library" ? (
        <ExerciseLibraryList library={library} onAddCustom={onAddCustom} onDeleteCustom={onDeleteCustom} />
      ) : (
        <TemplateEditor dayTemplates={dayTemplates} library={library} onUpdateSlot={onUpdateSlot} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Movement — AM + PM sessions for today, and the week at a glance. Which
// session lands where follows the gym schedule (see getDayMovement).
// ---------------------------------------------------------------------------
function MovementScreen({ schedule, dayById, library, morningDone, onToggle }) {
  const weekDates = getWeekDates();
  const todayIso = todayISO();
  const todayInfo = weekDates.find((d) => d.iso === todayIso) || weekDates[0];
  const todaySlots = getDayMovement(todayInfo.weekday, schedule, dayById, library);
  const slotColor = (slot) => (slot === "am" ? COLORS.sage : COLORS.plum);

  return (
    <div className="flex flex-col gap-5 pb-6">
      <div className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
        <h2 className="text-sm uppercase tracking-widest font-bold mb-1" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>Daily Movement</h2>
        <p className="text-xs" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>A short session in the morning and a longer one in the evening. Split and pancake mobility land on your squat and hinge days. Tap a session when it's done.</p>
      </div>

      <div>
        <h2 className="text-sm uppercase tracking-widest font-bold mb-3" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>Today</h2>
        <div className="flex flex-col gap-3">
          {todaySlots.map((m) => {
            const done = !!morningDone[moveKey(todayIso, m.slot)];
            const accent = slotColor(m.slot);
            return (
              <button key={m.slot} onClick={() => onToggle(moveKey(todayIso, m.slot))} className="w-full rounded-2xl p-5 flex items-center gap-4 text-left" style={{ background: done ? `${accent}1A` : COLORS.card, border: `1.5px solid ${accent}` }}>
                <div className="w-14 h-14 rounded-full flex items-center justify-center shrink-0" style={{ background: done ? accent : "#fff", border: `1.5px solid ${accent}` }}>{done ? <Check size={22} color="#fff" /> : m.slot === "am" ? <Sunrise size={22} style={{ color: accent }} /> : <Moon size={22} style={{ color: accent }} />}</div>
                <div className="flex-1">
                  <span className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: accent, fontFamily: "Poppins, sans-serif" }}>{m.time} · {done ? "Completed" : "Tap when done"}</span>
                  <div className="text-2xl font-bold" style={{ color: COLORS.ink, fontFamily: "Oswald, sans-serif" }}>{m.name}</div>
                  <span className="text-xs" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{m.context}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="text-sm uppercase tracking-widest font-bold mb-3" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>This Week's Plan</h2>
        <div className="flex flex-col gap-2">
          {weekDates.map(({ iso, weekday, label, dayNum }) => {
            const slots = getDayMovement(weekday, schedule, dayById, library);
            const isToday = iso === todayIso;
            return (
              <div key={iso} className="rounded-2xl p-3 flex flex-col gap-2" style={{ background: COLORS.card, border: `1.5px solid ${isToday ? COLORS.sage : COLORS.border}` }}>
                <div className="flex items-center gap-2 px-1">
                  <span className="text-xs font-bold uppercase" style={{ color: isToday ? COLORS.sage : COLORS.ink, fontFamily: "Oswald, sans-serif" }}>{label}</span>
                  <span className="text-[10px]" style={{ color: COLORS.muted, fontFamily: "Poppins, sans-serif" }}>{dayNum}{isToday ? " · Today" : ""}</span>
                </div>
                {slots.map((m) => {
                  const done = !!morningDone[moveKey(iso, m.slot)];
                  const accent = slotColor(m.slot);
                  return (
                    <button key={m.slot} onClick={() => onToggle(moveKey(iso, m.slot))} className="flex items-center gap-3 text-left rounded-xl px-2.5 py-2" style={{ background: done ? `${accent}1A` : COLORS.bg }}>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: done ? accent : "#fff", border: `1.5px solid ${done ? accent : COLORS.border}` }}>{done && <Check size={13} color="#fff" />}</div>
                      <Pill color={accent}>{m.time}</Pill>
                      <span className="text-sm font-semibold flex-1 truncate" style={{ color: COLORS.ink, fontFamily: "Poppins, sans-serif" }}>{m.name}</span>
                    </button>
                  );
                })}
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
  const [morningDone, setMorningDone] = useState({});
  const [exerciseLibrary, setExerciseLibrary] = useState(EXERCISE_LIBRARY_DEFAULT);
  const [dayTemplates, setDayTemplates] = useState(DAY_TEMPLATES_DEFAULT);
  const [runsPerWeek, setRunsPerWeek] = useState(1);
  const [deskSnackDone, setDeskSnackDone] = useState({});
  const [weightSuggestions, setWeightSuggestions] = useState({});
  const [programAnchor, setProgramAnchor] = useState(null);
  const [lastWorkoutSummary, setLastWorkoutSummary] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await loadState("trackerState");
      if (saved) {
        if (saved.history) setHistory(saved.history);
        if (saved.prs) setPrs(saved.prs);
        if (saved.trends) setTrends(saved.trends);
        if (saved.weeklySplit) setWeeklySplit(saved.weeklySplit);
        if (saved.scheduleByWeek) setScheduleByWeek(saved.scheduleByWeek);
        if (saved.runHistory) setRunHistory(saved.runHistory);
        if (saved.runWeeksDone) setRunWeeksDone(saved.runWeeksDone);
        if (saved.morningDone) setMorningDone(saved.morningDone);
        if (saved.exerciseLibrary) setExerciseLibrary(saved.exerciseLibrary);
        if (saved.dayTemplates) setDayTemplates(saved.dayTemplates);
        if (saved.runsPerWeek) setRunsPerWeek(saved.runsPerWeek);
        if (saved.deskSnackDone) setDeskSnackDone(saved.deskSnackDone);
        if (saved.weightSuggestions) setWeightSuggestions(saved.weightSuggestions);
        if (saved.programAnchor) setProgramAnchor(saved.programAnchor);
      }
      setLoaded(true);
    })();
  }, []);
  useEffect(() => {
    if (!loaded) return;
    saveState("trackerState", { history, prs, trends, weeklySplit, scheduleByWeek, runHistory, runWeeksDone, morningDone, exerciseLibrary, dayTemplates, runsPerWeek, deskSnackDone, weightSuggestions, programAnchor });
  }, [history, prs, trends, weeklySplit, scheduleByWeek, runHistory, runWeeksDone, morningDone, exerciseLibrary, dayTemplates, runsPerWeek, deskSnackDone, weightSuggestions, programAnchor, loaded]);

  const streak = 6;
  const weekCount = history.filter((h) => { const d = new Date(h.date + "T00:00:00"); const now = new Date(); const diffDays = (now - d) / 86400000; return diffDays >= 0 && diffDays < 7; }).length;
  const total = 47 + history.length - SEED_HISTORY.length;

  const dayById = useMemo(() => {
    const map = {};
    Object.values(dayTemplates).forEach((arr) => arr.forEach((d) => { map[d.id] = d; }));
    return map;
  }, [dayTemplates]);
  const currentDays = dayTemplates[String(weeklySplit)];

  const getScheduleForOffset = (offset) => scheduleByWeek[mondayIso(offset)] || buildDefaultSchedule(weeklySplit, currentDays, runsPerWeek);
  const setScheduleForOffset = (offset, newSchedule) => setScheduleByWeek((prev) => ({ ...prev, [mondayIso(offset)]: newSchedule }));
  const isScheduleCustom = (offset) => !!scheduleByWeek[mondayIso(offset)];
  const resetScheduleForOffset = (offset) => setScheduleByWeek((prev) => { const next = { ...prev }; delete next[mondayIso(offset)]; return next; });
  const todaySchedule = getScheduleForOffset(0);

  const programWeek = resolveProgramWeek(programAnchor);
  const selectProgramWeek = (w) => setProgramAnchor({ week: w, monday: mondayIso(0) });
  const autoProgramWeek = () => setProgramAnchor(null);

  const startDay = (day) => { setSession(makeSession(day, exerciseLibrary, weightSuggestions, phaseForWeek(programWeek))); setScreen("workout"); };
  const startRunSession = (rs) => { setRunSession(rs); setScreen("running"); };

  const addCustomExercise = (ex) => setExerciseLibrary((prev) => [...prev, ex]);
  const deleteCustomExercise = (id) => setExerciseLibrary((prev) => prev.filter((e) => e.id !== id));
  const updateTemplateSlot = (splitKey, dayId, group, slotId, exerciseId) => {
    setDayTemplates((prev) => ({
      ...prev,
      [splitKey]: prev[splitKey].map((day) => {
        if (day.id !== dayId) return day;
        if (group === "optionalCore") return { ...day, optionalCore: { ...day.optionalCore, exerciseId } };
        return { ...day, [group]: day[group].map((s) => (s.slot === slotId ? { ...s, exerciseId } : s)) };
      }),
    }));
  };

  const finishWorkout = (elapsedSeconds, totalSetsDone) => {
    const dateISO = todayISO();
    const allEx = [...session.mainLift, ...session.secondaryLifts, ...session.accessories, ...session.optionalCore];
    const exResults = allEx.map((ex) => {
      const weights = ex.sets.map((s) => parseFloat(s.weight)).filter((n) => !isNaN(n) && n > 0);
      const bestWeight = weights.length ? Math.max(...weights) : null;
      const priorPR = prs[ex.name];
      const isPR = bestWeight !== null && (!priorPR || bestWeight > priorPR.weight);
      const bestSet = ex.sets.find((s) => parseFloat(s.weight) === bestWeight);
      const suggestion = ex.oneRmTest || (session.phase && session.phase.deload) ? null : computeWeightSuggestion(ex);
      return { name: ex.name, isPR, bestWeight, bestReps: bestSet ? bestSet.reps : null, suggestion, oneRmTest: !!ex.oneRmTest };
    });
    setPrs((prev) => { const next = { ...prev }; exResults.forEach((r) => { if (r.isPR && r.bestWeight !== null) next[r.name] = { weight: r.bestWeight, reps: r.bestReps || "-", date: dateISO }; }); return next; });
    setTrends((prev) => { const next = { ...prev }; exResults.forEach((r) => { if (r.bestWeight !== null && (!(session.phase && session.phase.deload) || r.oneRmTest)) { const existing = next[r.name] || []; next[r.name] = [...existing, r.bestWeight].slice(-8); } }); return next; });
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


  const logRun = (entry) => setRunHistory((prev) => [...prev, entry]);
  const toggleRunWeek = (i) => setRunWeeksDone((prev) => ({ ...prev, [i]: !prev[i] }));
  const finishRunSession = (entry) => { setRunHistory((prev) => [...prev, entry]); setRunSession(null); setScreen("running"); };
  const discardRunSession = () => setRunSession(null);
  const toggleMorning = (iso) => setMorningDone((prev) => ({ ...prev, [iso]: !prev[iso] }));
  const deleteWorkout = (id) => setHistory((prev) => prev.filter((h) => h.id !== id));
  const deleteRun = (id) => setRunHistory((prev) => prev.filter((r) => r.id !== id));
  const toggleDeskSnack = (iso, i) => setDeskSnackDone((prev) => { const key = `${iso}:${i}`; return { ...prev, [key]: !prev[key] }; });

  const navItems = [
    { id: "dashboard", label: "Home", icon: Home },
    { id: "overview", label: "Overview", icon: LayoutGrid },
    { id: "workout", label: "Workout", icon: Dumbbell },
    { id: "exercises", label: "Exercises", icon: Layers },
    { id: "morning", label: "Movement", icon: Waves },
    { id: "desk", label: "Desk", icon: Armchair },
    { id: "running", label: "Running", icon: Footprints },
    { id: "progress", label: "Progress", icon: TrendingUp },
    { id: "history", label: "History", icon: HistoryIcon },
  ];

  return (
    <div className="w-full flex flex-col items-center" style={{ background: COLORS.bg, fontFamily: "Poppins, sans-serif", minHeight: "100vh", maxHeight: "100vh", overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Oswald:wght@500;600;700&display=swap');
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .nav-scroll::-webkit-scrollbar { display: none; }
      `}</style>
      <div className="w-full max-w-md px-4 pt-5 pb-28">
        {screen === "dashboard" && <Dashboard streak={streak} weekCount={weekCount} total={total} prs={prs} schedule={todaySchedule} dayById={dayById} days={currentDays} morningDone={morningDone} onToggleMorning={toggleMorning} onStartDay={startDay} onOpenRun={startRunSession} exerciseLibrary={exerciseLibrary} programWeek={programWeek} />}
        {screen === "overview" && <OverviewScreen getSchedule={getScheduleForOffset} setSchedule={setScheduleForOffset} isCustom={isScheduleCustom} onReset={resetScheduleForOffset} dayById={dayById} history={history} runHistory={runHistory} onStartDay={startDay} onStartRun={startRunSession} currentProgramWeek={programWeek} />}
        {screen === "workout" && (session ? (
          <WorkoutScreen session={session} setSession={setSession} exerciseLibrary={exerciseLibrary} history={history} onFinish={finishWorkout} onDiscard={discardWorkout} />
        ) : (
          <WorkoutHome weeklySplit={weeklySplit} setWeeklySplit={setWeeklySplit} days={currentDays} onStartDay={startDay} onOpenOverview={() => setScreen("overview")} programWeek={programWeek} isManualWeek={!!programAnchor} onSelectWeek={selectProgramWeek} onAutoWeek={autoProgramWeek} />
        ))}
        {screen === "exercises" && <ExerciseOverviewScreen library={exerciseLibrary} dayTemplates={dayTemplates} onAddCustom={addCustomExercise} onDeleteCustom={deleteCustomExercise} onUpdateSlot={updateTemplateSlot} />}
        {screen === "running" && (runSession ? (
          <RunSessionScreen runSession={runSession} onFinish={finishRunSession} onDiscard={discardRunSession} />
        ) : (
          <RunningScreen runHistory={runHistory} weeksDone={runWeeksDone} onLogRun={logRun} onToggleWeek={toggleRunWeek} onDeleteRun={deleteRun} runsPerWeek={runsPerWeek} setRunsPerWeek={setRunsPerWeek} onStartRun={startRunSession} programWeek={programWeek} />
        ))}
        {screen === "morning" && <MovementScreen schedule={todaySchedule} dayById={dayById} library={exerciseLibrary} morningDone={morningDone} onToggle={toggleMorning} />}
        {screen === "desk" && <DeskSnackScreen deskSnackDone={deskSnackDone} onToggle={toggleDeskSnack} />}
        {screen === "summary" && lastWorkoutSummary && <WorkoutSummaryScreen summary={lastWorkoutSummary} onContinue={() => setScreen("history")} />}
        {screen === "history" && <HistoryScreen history={history} onDelete={deleteWorkout} />}
        {screen === "progress" && <ProgressScreen prs={prs} trends={trends} />}
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
