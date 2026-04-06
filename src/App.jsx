import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
const sb = createClient(
  "https://dehtoknkzxqycwuqhces.supabase.co",
  "sb_publishable_lnyEsUdJmIAoK2Yvo8OwNQ_oUD0PkwH"
);

const STORAGE_KEY = "coachlog-v2";  // separate storage key so v1 and v2 don't collide
const uid = () => Math.random().toString(36).slice(2, 9);
const fmtClock = (ms) => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`; };
const fmtMins  = (ms) => `${Math.round(ms / 60000)}m`;
const initials = (name) => name.trim().split(/\s+/).map(w => w[0]).join("").toUpperCase().slice(0, 2);
// Short display name for pitch tokens: first name, or first+last-initial if ambiguous
const shortName = (name, allNames) => {
  const parts = name.trim().split(/\s+/);
  const first = parts[0];
  const dupes = allNames.filter(n => n.trim().split(/\s+/)[0].toLowerCase() === first.toLowerCase());
  if (dupes.length > 1 && parts.length > 1) return first + " " + parts[parts.length - 1][0] + ".";
  return first;
};

// ── FORMATIONS ──
// Pitch viewBox: 0 0 100 150  (portrait, attacking = top, defending = bottom)
const FORMATIONS = {
  // ── 7v7 ──
  "2-3-1": {
    label: "2-3-1", size: 7, slots: [
      { id: "GK",  label: "GK", x: 65, y: 134 },
      { id: "LB",  label: "LB", x: 36, y: 110 },
      { id: "RB",  label: "RB", x: 94, y: 110 },
      { id: "LM",  label: "LM", x: 26, y: 65  },
      { id: "CM",  label: "CM", x: 65, y: 71  },
      { id: "RM",  label: "RM", x: 104, y: 65  },
      { id: "ST",  label: "ST", x: 65, y: 28  },
    ]
  },
  "3-2-1": {
    label: "3-2-1", size: 7, slots: [
      { id: "GK",  label: "GK",  x: 65, y: 134 },
      { id: "LCB", label: "CB",  x: 29, y: 110 },
      { id: "CB",  label: "CB",  x: 65, y: 107 },
      { id: "RCB", label: "CB",  x: 101, y: 110 },
      { id: "LM",  label: "LM",  x: 42, y: 74  },
      { id: "RM",  label: "RM",  x: 88, y: 74  },
      { id: "ST",  label: "ST",  x: 65, y: 28  },
    ]
  },
  "2-2-2": {
    label: "2-2-2", size: 7, slots: [
      { id: "GK",  label: "GK",  x: 65, y: 134 },
      { id: "LB",  label: "LB",  x: 36, y: 110 },
      { id: "RB",  label: "RB",  x: 94, y: 110 },
      { id: "LM",  label: "LM",  x: 42, y: 76  },
      { id: "RM",  label: "RM",  x: 88, y: 76  },
      { id: "LST", label: "ST",  x: 39, y: 30  },
      { id: "RST", label: "ST",  x: 91, y: 30  },
    ]
  },
  "1-3-2": {
    label: "1-3-2", size: 7, slots: [
      { id: "GK",  label: "GK",  x: 65, y: 134 },
      { id: "SW",  label: "SW",  x: 65, y: 112 },
      { id: "LM",  label: "LM",  x: 26, y: 69  },
      { id: "CM",  label: "CM",  x: 65, y: 75  },
      { id: "RM",  label: "RM",  x: 104, y: 69  },
      { id: "LST", label: "ST",  x: 42, y: 28  },
      { id: "RST", label: "ST",  x: 88, y: 28  },
    ]
  },
  "3-1-2": {
    label: "3-1-2", size: 7, slots: [
      { id: "GK",  label: "GK",  x: 65, y: 134 },
      { id: "LCB", label: "CB",  x: 29, y: 110 },
      { id: "CB",  label: "CB",  x: 65, y: 107 },
      { id: "RCB", label: "CB",  x: 101, y: 110 },
      { id: "CM",  label: "CM",  x: 65, y: 76  },
      { id: "LST", label: "ST",  x: 42, y: 28  },
      { id: "RST", label: "ST",  x: 88, y: 28  },
    ]
  },
  // ── 9v9 ──
  "3-2-3": {
    label: "3-2-3", size: 9, slots: [
      { id: "GK",  label: "GK",  x: 65, y: 134 },
      { id: "LCB", label: "CB",  x: 29, y: 110 },
      { id: "CB",  label: "CB",  x: 65, y: 107 },
      { id: "RCB", label: "CB",  x: 101, y: 110 },
      { id: "LM",  label: "LM",  x: 39, y: 78  },
      { id: "RM",  label: "RM",  x: 91, y: 78  },
      { id: "LW",  label: "LW",  x: 21, y: 36  },
      { id: "ST",  label: "ST",  x: 65, y: 28  },
      { id: "RW",  label: "RW",  x: 109, y: 36  },
    ]
  },
  "3-3-2": {
    label: "3-3-2", size: 9, slots: [
      { id: "GK",  label: "GK",  x: 65, y: 134 },
      { id: "LCB", label: "CB",  x: 29, y: 110 },
      { id: "CB",  label: "CB",  x: 65, y: 107 },
      { id: "RCB", label: "CB",  x: 101, y: 110 },
      { id: "LM",  label: "LM",  x: 23, y: 67  },
      { id: "CM",  label: "CM",  x: 65, y: 73  },
      { id: "RM",  label: "RM",  x: 107, y: 67  },
      { id: "LST", label: "ST",  x: 44, y: 30  },
      { id: "RST", label: "ST",  x: 86, y: 30  },
    ]
  },
  "2-3-3": {
    label: "2-3-3", size: 9, slots: [
      { id: "GK",  label: "GK",  x: 65, y: 134 },
      { id: "LB",  label: "LB",  x: 36, y: 111 },
      { id: "RB",  label: "RB",  x: 94, y: 111 },
      { id: "LM",  label: "LM",  x: 23, y: 67  },
      { id: "CM",  label: "CM",  x: 65, y: 73  },
      { id: "RM",  label: "RM",  x: 107, y: 67  },
      { id: "LW",  label: "LW",  x: 21, y: 36  },
      { id: "ST",  label: "ST",  x: 65, y: 28  },
      { id: "RW",  label: "RW",  x: 109, y: 36  },
    ]
  },
  "4-3-1": {
    label: "4-3-1", size: 9, slots: [
      { id: "GK",  label: "GK",  x: 65, y: 134 },
      { id: "LB",  label: "LB",  x: 21, y: 108 },
      { id: "LCB", label: "CB",  x: 47, y: 113 },
      { id: "RCB", label: "CB",  x: 83, y: 113 },
      { id: "RB",  label: "RB",  x: 109, y: 108 },
      { id: "LM",  label: "LM",  x: 23, y: 76  },
      { id: "CM",  label: "CM",  x: 65, y: 73  },
      { id: "RM",  label: "RM",  x: 107, y: 76  },
      { id: "ST",  label: "ST",  x: 65, y: 28  },
    ]
  },
  // ── 11v11 ──
  "4-3-3": {
    label: "4-3-3", size: 11, slots: [
      { id: "GK",  label: "GK",  x: 65, y: 134 },
      { id: "LB",  label: "LB",  x: 21, y: 108 },
      { id: "CB1", label: "CB",  x: 47, y: 113 },
      { id: "CB2", label: "CB",  x: 83, y: 113 },
      { id: "RB",  label: "RB",  x: 109, y: 108 },
      { id: "LM",  label: "LM",  x: 21, y: 64  },
      { id: "CM",  label: "CM",  x: 65, y: 70  },
      { id: "RM",  label: "RM",  x: 109, y: 64  },
      { id: "LW",  label: "LW",  x: 23, y: 36  },
      { id: "ST",  label: "ST",  x: 65, y: 26  },
      { id: "RW",  label: "RW",  x: 107, y: 36  },
    ]
  },
  "4-4-2": {
    label: "4-4-2", size: 11, slots: [
      { id: "GK",  label: "GK",  x: 65, y: 134 },
      { id: "LB",  label: "LB",  x: 21, y: 108 },
      { id: "CB1", label: "CB",  x: 47, y: 113 },
      { id: "CB2", label: "CB",  x: 83, y: 113 },
      { id: "RB",  label: "RB",  x: 109, y: 108 },
      { id: "LM",  label: "LM",  x: 21, y: 64  },
      { id: "CM1", label: "CM",  x: 49, y: 70  },
      { id: "CM2", label: "CM",  x: 81, y: 70  },
      { id: "RM",  label: "RM",  x: 109, y: 64  },
      { id: "ST1", label: "ST",  x: 47, y: 28  },
      { id: "ST2", label: "ST",  x: 83, y: 28  },
    ]
  },
  "4-2-3-1": {
    label: "4-2-3-1", size: 11, slots: [
      { id: "GK",  label: "GK",  x: 65, y: 134 },
      { id: "LB",  label: "LB",  x: 21, y: 108 },
      { id: "CB1", label: "CB",  x: 47, y: 113 },
      { id: "CB2", label: "CB",  x: 83, y: 113 },
      { id: "RB",  label: "RB",  x: 109, y: 108 },
      { id: "DM1", label: "DM",  x: 47, y: 84  },
      { id: "DM2", label: "DM",  x: 83, y: 84  },
      { id: "LW",  label: "LW",  x: 21, y: 57  },
      { id: "AM",  label: "AM",  x: 65, y: 54  },
      { id: "RW",  label: "RW",  x: 109, y: 57  },
      { id: "ST",  label: "ST",  x: 65, y: 26  },
    ]
  },
  "3-5-2": {
    label: "3-5-2", size: 11, slots: [
      { id: "GK",  label: "GK",  x: 65, y: 134 },
      { id: "LCB", label: "CB",  x: 29, y: 108 },
      { id: "CB",  label: "CB",  x: 65, y: 106 },
      { id: "RCB", label: "CB",  x: 101, y: 108 },
      { id: "LWB", label: "LWB", x: 21, y: 76  },
      { id: "LCM", label: "CM",  x: 43, y: 70  },
      { id: "CM",  label: "CM",  x: 65, y: 67  },
      { id: "RCM", label: "CM",  x: 87, y: 70  },
      { id: "RWB", label: "RWB", x: 109, y: 76  },
      { id: "ST1", label: "ST",  x: 47, y: 28  },
      { id: "ST2", label: "ST",  x: 83, y: 28  },
    ]
  },
  "5-3-2": {
    label: "5-3-2", size: 11, slots: [
      { id: "GK",  label: "GK",  x: 65, y: 134 },
      { id: "LWB", label: "LWB", x: 19, y: 106 },
      { id: "LCB", label: "CB",  x: 43, y: 112 },
      { id: "CB",  label: "CB",  x: 65, y: 112 },
      { id: "RCB", label: "CB",  x: 87, y: 112 },
      { id: "RWB", label: "RWB", x: 111, y: 106 },
      { id: "LM",  label: "LM",  x: 29, y: 64  },
      { id: "CM",  label: "CM",  x: 65, y: 70  },
      { id: "RM",  label: "RM",  x: 101, y: 64  },
      { id: "ST1", label: "ST",  x: 47, y: 28  },
      { id: "ST2", label: "ST",  x: 83, y: 28  },
    ]
  },
};

const POSITION_COLORS = {
  GK:  "#FFD600", LB: "#2979FF", CB: "#2979FF", CB1: "#2979FF", CB2: "#2979FF",
  RB:  "#2979FF", LCB:"#2979FF", RCB:"#2979FF", LWB:"#00E676",  RWB:"#00E676",
  LM:  "#D500F9", RM: "#D500F9", CM: "#D500F9", CM1:"#D500F9",  CM2:"#D500F9",
  DM1: "#00B0FF", DM2:"#00B0FF", AM: "#FF4081", LW: "#FF1744",  RW: "#FF1744",
  LCM: "#D500F9", RCM:"#D500F9", ST: "#FF1744", ST1:"#FF1744",  ST2:"#FF1744",
  SW:  "#2979FF",
};
const posColor = (slotId) => POSITION_COLORS[slotId] || "#94a3b8";
// Playing time color: red 0-25%, amber 26-49%, green 50%+
const timeColor = (pct, C) => pct === null ? C.textMuted : pct >= 50 ? C.green : pct >= 26 ? C.amber : C.red;
const timeBg    = (pct, C) => pct === null ? C.surfaceAlt : pct >= 50 ? C.greenBg : pct >= 26 ? C.amberBg : C.redBg;
const timeBorder = (pct, C) => pct === null ? C.borderMed : pct >= 50 ? C.greenBorder : pct >= 26 ? "rgba(255,214,0,0.35)" : C.redBorder;

const GAME_TYPES = {
  dark: {
    league:     { label: "League",      color: "#60a5fa", bg: "rgba(59,130,246,0.13)",  border: "rgba(96,165,250,0.28)",  icon: "🏅" },
    tournament: { label: "Tournament",  color: "#fbbf24", bg: "rgba(251,191,36,0.12)",  border: "rgba(251,191,36,0.28)",  icon: "🏆" },
    final:      { label: "Final / 3rd", color: "#f87171", bg: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.28)", icon: "🥇" },
  },
  light: {
    league:     { label: "League",      color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe", icon: "🏅" },
    tournament: { label: "Tournament",  color: "#b45309", bg: "#fffbeb", border: "#fde68a", icon: "🏆" },
    final:      { label: "Final / 3rd", color: "#dc2626", bg: "#fff1f2", border: "#fecaca", icon: "🥇" },
  },
};

const TEAM_COLORS = ["#02C39A","#05668D","#028090","#00A896","#2563eb","#b45309","#7c3aed","#be185d"];
const SPORTS = [
  { emoji: "⚽", label: "Soccer" }, { emoji: "🏀", label: "Basketball" }, { emoji: "🏈", label: "Football" },
  { emoji: "⚾", label: "Baseball" }, { emoji: "🏒", label: "Hockey" }, { emoji: "🥍", label: "Lacrosse" },
  { emoji: "🏐", label: "Volleyball" }, { emoji: "🎾", label: "Tennis" }, { emoji: "🏑", label: "Field Hockey" },
  { emoji: "🏉", label: "Rugby" }, { emoji: "🥏", label: "Ultimate" }, { emoji: "🏸", label: "Badminton" },
];

// ── CSV EXPORT ──
function escapeCSV(val) {
  const s = String(val === null || val === undefined ? "" : val);
  if (s.indexOf(",") >= 0 || s.indexOf('"') >= 0 || s.indexOf("\n") >= 0) {
    return '"' + s.split('"').join('""') + '"';
  }
  return s;
}
function downloadCSV(filename, rows, onSuccess, onFallback) {
  const csv = rows.map(r => r.map(escapeCSV).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const file = new File([blob], filename, { type: "text/csv;charset=utf-8;" });

  // Strategy 1: Web Share API with File — works on Android Chrome/PWA and modern desktop
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    navigator.share({ files: [file], title: filename })
      .then(() => { if (onSuccess) onSuccess(); })
      .catch(err => {
        // User cancelled share — that's fine, not an error
        if (err.name === "AbortError") return;
        // Share failed — fall through to blob download
        tryBlobDownload();
      });
    return;
  }
  tryBlobDownload();

  function tryBlobDownload() {
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename; a.style.display = "none";
      document.body.appendChild(a); a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
      if (onSuccess) onSuccess();
    } catch(e) {
      // Last resort: clipboard
      if (navigator.clipboard) {
        navigator.clipboard.writeText(csv)
          .then(() => { if (onFallback) onFallback("copied"); })
          .catch(() => { if (onFallback) onFallback("manual"); });
      } else {
        if (onFallback) onFallback("manual");
      }
    }
  }
}

function getSeasonMs(id, games) {
  let played = 0, avail = 0;
  games.forEach(g => { if (g.attendees.includes(id)) { avail += g.totalGameMs; played += g.minutesMs[id] || 0; } });
  return { played, avail };
}
function gameResult(g) {
  const us = parseInt(g.scoreUs), them = parseInt(g.scoreThem);
  if (isNaN(us) || isNaN(them)) return null;
  return us > them ? "W" : us < them ? "L" : "D";
}

function SignInScreen() {
  const [loading, setLoading] = useState(false);
  const handleSignIn = async () => {
    setLoading(true);
    await sb.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
        scopes: "https://www.googleapis.com/auth/spreadsheets",
        queryParams: { access_type: "offline", prompt: "consent" },
      }
    });
  };
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, background: "radial-gradient(ellipse at 60% -5%, rgba(0,168,150,0.35) 0%, rgba(5,102,141,0.20) 25%, rgba(2,128,144,0.08) 45%, #030d0b 70%)" }}>
      <div style={{ fontSize: 52, marginBottom: 12, filter: "drop-shadow(0 0 16px rgba(2,195,154,0.35))" }}>⚽</div>
      <div style={{ fontSize: 30, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em", marginBottom: 6, textShadow: "0 0 30px rgba(2,195,154,0.5)" }}>CoachLog</div>
      <div style={{ fontSize: 15, color: "#888", marginBottom: 52, textAlign: "center", lineHeight: 1.5 }}>
        Track player minutes.<br />Build fair teams.
      </div>
      <button onClick={handleSignIn} disabled={loading}
        style={{ display: "flex", alignItems: "center", gap: 12, padding: "15px 28px",
          background: "#fff", border: "none", borderRadius: 14, fontSize: 16, fontWeight: 700,
          cursor: loading ? "wait" : "pointer", opacity: loading ? 0.7 : 1, color: "#111",
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>
        <svg width="20" height="20" viewBox="0 0 48 48">
          <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
          <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
          <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
          <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
        </svg>
        {loading ? "Signing in…" : "Sign in with Google"}
      </button>
      <div style={{ marginTop: 28, fontSize: 12, color: "#555", textAlign: "center", lineHeight: 1.6 }}>
        Your data syncs across all your devices.<br />No passwords. Free to use.
      </div>
    </div>
  );
}

export default function CoachLog() {
  const [teams, setTeams]     = useState([]);
  const [players, setPlayers] = useState([]);
  const [games, setGames]     = useState([]);
  const [cg, setCg]           = useState(null);

  const [activeTeamId, setActiveTeamId]     = useState(null);
  const [page, setPage]                     = useState("teams");
  const [statsView, setStatsView]           = useState("players");
  const [selectedGame, setSelectedGame]     = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [darkMode, setDarkMode]             = useState(true);

  const [newName, setNewName]           = useState("");
  const [newTeamName, setNewTeamName]   = useState("");
  const [newTeamColor, setNewTeamColor] = useState(TEAM_COLORS[0]);
  const [newTeamSport, setNewTeamSport] = useState(SPORTS[0].emoji);
  const [editingTeam, setEditingTeam]   = useState(null);
  const [editVal, setEditVal]           = useState("");

  const [attendees, setAttendees]   = useState([]);
  const [opponent, setOpponent]     = useState("");
  const [gameType, setGameType]     = useState("league");
  const [formation, setFormation]   = useState("4-3-3");
  const [halfMins, setHalfMins]     = useState(25);   // length of each period in minutes
  const [numPeriods, setNumPeriods] = useState(2);    // 2 = halves, 4 = quarters
  const [scoreUs, setScoreUs]       = useState("");
  const [scoreThem, setScoreThem]   = useState("");
  const [guestName, setGuestName]   = useState("");
  const [guests, setGuests]         = useState([]);
  const [homeAway, setHomeAway]     = useState("Home");    // "Home" | "Away"
  const [dnpReasons, setDnpReasons] = useState({});         // { playerId: "DNP - Absent"|"DNP - Injury"|"DNP - Suspension" }

  const [editingScore, setEditingScore]   = useState(null);
  const [editScoreUs, setEditScoreUs]     = useState("");
  const [editScoreThem, setEditScoreThem] = useState("");

  const [loaded, setLoaded]                         = useState(false);
  const [, setTick]                                 = useState(0);
  const [confirmEnd, setConfirmEnd]                 = useState(false);
  const [confirmDiscardGame, setConfirmDiscardGame] = useState(false);
  const [confirmDeleteTeam, setConfirmDeleteTeam]   = useState(null);
  const [confirmDeleteGame, setConfirmDeleteGame]   = useState(null);

  // Tactical board UI state (not persisted — session only)
  const [pendingPlayer, setPendingPlayer] = useState(null); // playerId awaiting slot tap
  const [formationExpanded, setFormationExpanded] = useState(false); // formation switcher in game
  const [showExport, setShowExport]               = useState(false);  // export sheet
  const [exportMsg, setExportMsg]                 = useState(null);   // fallback message
  const [user, setUser]                           = useState(null);   // signed-in user
  const [authLoaded, setAuthLoaded]               = useState(false);  // auth check complete
  const [syncing, setSyncing]                     = useState(false);  // cloud sync in progress
  const [providerToken, setProviderToken]         = useState(null);   // Google access token for Sheets
  const [sheetUrl, setSheetUrl]                   = useState(() => localStorage.getItem("cl_sheet_url") || "");
  const [sheetsStatus, setSheetsStatus]           = useState(null);   // null | "pushing" | "ok" | "error"
  const [showSheetSetup, setShowSheetSetup]       = useState(false);
  const userRef = useRef(null);
  const providerTokenRef = useRef(null);
  const [subMode, setSubMode]             = useState(false);  // batch sub mode active
  const [subQueue, setSubQueue]           = useState([]);     // [{benchId,fieldId,slotId,slotLabel,benchName,fieldName}]
  const [subPending, setSubPending]       = useState(null);   // benchId selected first in a sub pair
  const [boardFormation, setBoardFormation] = useState("2-3-1"); // can change mid-game

  // Setup lineup state (new game draft — not persisted)
  const [setupDraft, setSetupDraft]       = useState({}); // {playerId: slotId}
  const [setupPending, setSetupPending]   = useState(null); // playerId selected via tap
  const [dragState, setDragState]         = useState(null); // {playerId, clientX, clientY}
  const [pendingDrag, setPendingDrag]      = useState(null); // {playerId, startX, startY}
  const pitchSvgRef = useRef(null);

  // ── Supabase helpers ──
  const sbLoad = async (uid) => {
    const [{ data: td }, { data: pd }, { data: gd }] = await Promise.all([
      sb.from("cl_teams").select("data").eq("user_id", uid),
      sb.from("cl_players").select("data").eq("user_id", uid),
      sb.from("cl_games").select("data").eq("user_id", uid),
    ]);
    return {
      teams: (td || []).map(r => r.data),
      players: (pd || []).map(r => r.data),
      games: (gd || []).map(r => r.data),
    };
  };

  const sbSave = async (te, pl, ga) => {
    const uid = userRef.current?.id; if (!uid) return;
    const ops = [];
    if (te.length) ops.push(sb.from("cl_teams").upsert(te.map(t => ({ id: t.id, user_id: uid, data: t })), { onConflict: "id" }));
    if (pl.length) ops.push(sb.from("cl_players").upsert(pl.map(p => ({ id: p.id, user_id: uid, data: p })), { onConflict: "id" }));
    if (ga.length) ops.push(sb.from("cl_games").upsert(ga.map(g => ({ id: g.id, user_id: uid, data: g })), { onConflict: "id" }));
    await Promise.all(ops);
  };

  const sbDelete = async (table, id) => {
    if (!userRef.current) return;
    await sb.from(table).delete().eq("id", id);
  };

  const applyData = (d, atid) => {
    if (d.teams)   setTeams(d.teams);
    if (d.players) setPlayers(d.players);
    if (d.games)   setGames(d.games);
    if (d.cg) {
      setCg(d.cg); setActiveTeamId(d.cg.teamId); setPage("game");
      if (d.cg.formation) setBoardFormation(d.cg.formation);
    } else if (atid || d.activeTeamId) {
      setActiveTeamId(atid || d.activeTeamId);
      if (d.teams?.length > 0) setPage("roster");
    }
  };

  // Initial load — check auth, then load from Supabase or localStorage
  useEffect(() => {
    // Safety net: if auth check hangs (common on mobile cold-start), unblock after 8s
    const fallback = setTimeout(() => {
      setAuthLoaded(true);
      setLoaded(true);
    }, 8000);

    (async () => {
      try {
        // 1. Check for existing Supabase session (race against 7s timeout)
        const timeoutSession = new Promise(res => setTimeout(() => res({ data: { session: null } }), 7000));
        const { data: { session } } = await Promise.race([sb.auth.getSession(), timeoutSession]);
        if (session?.user) {
          userRef.current = session.user;
          setUser(session.user);
          if (session.provider_token) {
            providerTokenRef.current = session.provider_token;
            setProviderToken(session.provider_token);
          }
          const cloud = await sbLoad(session.user.id);
          if (cloud.teams.length > 0) {
            applyData(cloud, cloud.teams[0]?.id);
          } else {
            // First sign-in — auto-migrate any localStorage data
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
              const local = JSON.parse(raw);
              if (local.teams?.length > 0) {
                setSyncing(true);
                await sbSave(local.teams || [], local.players || [], local.games || []);
                setSyncing(false);
                applyData(local, null);
              }
            }
          }
        } else {
          // Not signed in — load from localStorage (offline mode)
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) { const d = JSON.parse(raw); applyData(d, null); }
        }
      } catch (e) { console.error("Load error:", e); }
      clearTimeout(fallback);
      setAuthLoaded(true);
      setLoaded(true);
    })();
  }, []);

  // Listen for auth changes (sign-in redirect callback)
  useEffect(() => {
    const { data: { subscription } } = sb.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        userRef.current = session.user;
        setUser(session.user);
        if (session.provider_token) {
          providerTokenRef.current = session.provider_token;
          setProviderToken(session.provider_token);
        }
        const cloud = await sbLoad(session.user.id);
        if (cloud.teams.length > 0) {
          applyData(cloud, cloud.teams[0]?.id);
        } else {
          // Migrate localStorage on first sign-in
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) {
            const local = JSON.parse(raw);
            if (local.teams?.length > 0) {
              setSyncing(true);
              await sbSave(local.teams || [], local.players || [], local.games || []);
              setSyncing(false);
            }
          }
        }
        setLoaded(true);
      } else if (event === "SIGNED_OUT") {
        userRef.current = null;
        setUser(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Auto-select all players when navigating to New Game
  useEffect(() => {
    if (page === "newgame" && !cg && teamPlayers.length > 0 && attendees.length === 0) {
      setAttendees(teamPlayers.map(p => p.id));
    }
  }, [page, activeTeamId]);

  // Tick every 500ms — also auto-stops clock at end of each period
  const cgRef = useRef(null);
  cgRef.current = cg;
  const storeRef = useRef({});
  storeRef.current = { teams, players, games, activeTeamId };
  useEffect(() => {
    const t = setInterval(() => {
      setTick(x => x + 1);
      const g = cgRef.current;
      if (!g || !g.clockRunning || !g.periodLengthMs) return;
      const elapsed = g.clockOffset + (Date.now() - g.clockPeriodStart);
      const periodEnd = g.currentPeriod * g.periodLengthMs;
      if (elapsed >= periodEnd) {
        // Auto-stop: freeze clock at exact period boundary
        const n = Date.now();
        const newAcc = { ...g.accumulated }, newOnField = { ...g.onField };
        Object.keys(g.onField).forEach(id => {
          if (g.onField[id] !== null) { newAcc[id] = (newAcc[id] || 0) + (n - g.onField[id]); newOnField[id] = null; }
        });
        const stopped = {
          ...g, accumulated: newAcc, onField: newOnField,
          clockRunning: false,
          clockOffset: periodEnd,   // snap to exact period boundary
          clockPeriodStart: null,
          periodEndedAt: periodEnd,
        };
        setCg(stopped);
        // Full persist — read other data from refs
        const snap = storeRef.current;
        // Persist clock stop — localStorage + Supabase
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify({
          teams: snap.teams, players: snap.players, games: snap.games,
          cg: stopped, activeTeamId: snap.activeTeamId,
        })); } catch {}
        if (userRef.current) sbSave(snap.teams, snap.players, snap.games).catch(() => {});
      }
    }, 500);
    return () => clearInterval(t);
  }, []);

  const persist = (te, pl, ga, c, atid) => {
    // Always write to localStorage (instant, offline)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ teams: te, players: pl, games: ga, cg: c, activeTeamId: atid })); } catch {}
    // Fire-and-forget Supabase sync when signed in
    if (userRef.current) sbSave(te, pl, ga).catch(e => console.error("Sync error:", e));
  };

  // ── TEAM / PLAYER OPS (unchanged from v1) ──
  const addTeam = () => {
    const name = newTeamName.trim(); if (!name) return;
    const team = { id: uid(), name, color: newTeamColor, sport: newTeamSport };
    const updated = [...teams, team];
    setTeams(updated); persist(updated, players, games, cg, activeTeamId);
    setNewTeamName(""); setNewTeamColor(TEAM_COLORS[updated.length % TEAM_COLORS.length]);
  };
  const deleteTeam = (id) => {
    const nT = teams.filter(t => t.id !== id), nP = players.filter(p => p.teamId !== id);
    const nG = games.filter(g => g.teamId !== id), nC = cg?.teamId === id ? null : cg;
    const nA = activeTeamId === id ? null : activeTeamId;
    setTeams(nT); setPlayers(nP); setGames(nG); setCg(nC); setActiveTeamId(nA);
    persist(nT, nP, nG, nC, nA); setConfirmDeleteTeam(null);
    if (activeTeamId === id) setPage("teams");
    // Delete from Supabase
    if (userRef.current) {
      sbDelete("cl_teams", id);
      players.filter(p => p.teamId === id).forEach(p => sbDelete("cl_players", p.id));
      games.filter(g => g.teamId === id).forEach(g => sbDelete("cl_games", g.id));
    }
  };
  const renameTeam = (id) => {
    const name = editVal.trim(); if (!name) { setEditingTeam(null); return; }
    const updated = teams.map(t => t.id === id ? { ...t, name } : t);
    setTeams(updated); persist(updated, players, games, cg, activeTeamId); setEditingTeam(null);
  };
  const selectTeam = (id) => { setActiveTeamId(id); persist(teams, players, games, cg, id); setPage("roster"); };
  const addPlayer = () => {
    const name = newName.trim(); if (!name || !activeTeamId) return;
    const updated = [...players, { id: uid(), teamId: activeTeamId, name, number: "" }];
    setPlayers(updated); persist(teams, updated, games, cg, activeTeamId); setNewName("");
  };
  const removePlayer = (id) => {
    const updated = players.filter(p => p.id !== id);
    setPlayers(updated); persist(teams, updated, games, cg, activeTeamId);
    if (userRef.current) sbDelete("cl_players", id);
  };
  const updatePlayerNumber = (id, number) => {
    const updated = players.map(p => p.id === id ? { ...p, number } : p);
    setPlayers(updated); persist(teams, updated, games, cg, activeTeamId);
  };

  // ── CLOCK ──
  const now = Date.now();
  const getGameClock = () => !cg ? 0 : cg.clockRunning ? cg.clockOffset + (now - cg.clockPeriodStart) : cg.clockOffset;
  const getPlayerMs  = (id) => {
    if (!cg) return 0;
    const acc = cg.accumulated[id] || 0;
    return (id in cg.onField && cg.clockRunning && cg.onField[id] !== null) ? acc + (now - cg.onField[id]) : acc;
  };

  // Time in current position slot (since last position change)
  const getCurrentPositionMs = (id) => {
    if (!cg || !cg.positionLog) return 0;
    const entry = [...cg.positionLog].reverse().find(e => e.playerId === id && e.endMs === null);
    if (!entry) return 0;
    return cg.clockRunning ? Math.max(0, getGameClock() - entry.startMs) : Math.max(0, cg.clockOffset - entry.startMs);
  };

  // All positions played so far this game (closed + current open entry)
  const getLivePositionSummary = (id) => {
    if (!cg || !cg.positionLog) return [];
    const summary = {};
    const gc = getGameClock();
    cg.positionLog.forEach(e => {
      if (e.playerId !== id) return;
      const dur = e.endMs !== null ? (e.endMs - e.startMs) : Math.max(0, gc - e.startMs);
      if (!summary[e.slotId]) summary[e.slotId] = { label: e.label, slotId: e.slotId, durationMs: 0 };
      summary[e.slotId].durationMs += dur;
    });
    return Object.values(summary).sort((a, b) => b.durationMs - a.durationMs);
  };

  const startGame = () => {
    if (!attendees.length && !guests.length) return;
    const guestPlayers = guests.map(g => ({ id: g.id, teamId: activeTeamId, name: g.name + " (guest)", guest: true }));
    const updatedPlayers = [...players, ...guestPlayers];
    const allAttendees = [...attendees, ...guests.map(g => g.id)];
    const n = Date.now();
    // Init positions + onField from setupDraft
    const initPositions = { ...setupDraft }; // {playerId: slotId}
    const initOnField = {};
    const initPositionLog = [];
    Object.entries(initPositions).forEach(([pid, slotId]) => {
      initOnField[pid] = null; // placed but clock not running yet
      const slot = FORMATIONS[formation]?.slots.find(s => s.id === slotId);
      if (slot) initPositionLog.push({ playerId: pid, slotId, label: slot.label, startMs: 0, endMs: null });
    });
    const game = {
      id: uid(), teamId: activeTeamId, date: new Date().toLocaleDateString(),
      opponent: opponent.trim() || "Opponent", gameType, formation,
      homeAway,                                               // "Home" | "Away"
      dnpReasons: { ...dnpReasons },                          // { playerId: reason string }
      attendees: allAttendees, onField: initOnField, accumulated: {},
      playerPositions: initPositions,
      positionLog: initPositionLog,
      positionsLocked: Object.keys(initPositions).length > 0, // lock if lineup was set
      clockRunning: false, clockOffset: 0, clockPeriodStart: null,
      periodLengthMs: halfMins * 60 * 1000,  // auto-stop after this many ms per period
      numPeriods,                              // 2 = halves, 4 = quarters
      currentPeriod: 1,                        // which period we're in (1-based)
      periodEndedAt: null,                     // timestamp when last period auto-ended
    };
    setPlayers(updatedPlayers); setCg(game); setBoardFormation(formation);
    persist(teams, updatedPlayers, games, game, activeTeamId);
    setAttendees([]); setOpponent(""); setGameType("league"); setGuests([]); setGuestName(""); setHomeAway("Home"); setDnpReasons({});
    setSetupDraft({}); setSetupPending(null);
    setPage("game");
  };

  const discardGame = () => {
    setCg(null); persist(teams, players, games, null, activeTeamId);
    setConfirmDiscardGame(false); setConfirmEnd(false); setScoreUs(""); setScoreThem("");
    setPendingPlayer(null); setSetupDraft({}); setSetupPending(null); setPage("newgame");
  };

  const toggleLock = () => {
    const u = { ...cg, positionsLocked: !cg.positionsLocked };
    setCg(u); persist(teams, players, games, u, activeTeamId);
  };

  const toggleClock = () => {
    const n = Date.now();
    if (cg.clockRunning) {
      // Manual pause
      const newAcc = { ...cg.accumulated }, newOnField = { ...cg.onField };
      Object.keys(cg.onField).forEach(id => {
        if (cg.onField[id] !== null) { newAcc[id] = (newAcc[id] || 0) + (n - cg.onField[id]); newOnField[id] = null; }
      });
      const u = { ...cg, accumulated: newAcc, onField: newOnField, clockRunning: false, clockOffset: cg.clockOffset + (n - cg.clockPeriodStart), clockPeriodStart: null };
      setCg(u); persist(teams, players, games, u, activeTeamId);
    } else {
      // Start / resume — if a period just ended, advance to next period first
      const justEndedPeriod = cg.periodEndedAt !== null && cg.periodEndedAt !== undefined;
      const newPeriod = justEndedPeriod ? (cg.currentPeriod + 1) : cg.currentPeriod;
      const newOnField = { ...cg.onField };
      Object.keys(cg.onField).forEach(id => { newOnField[id] = n; });
      const u = { ...cg, onField: newOnField, clockRunning: true, clockPeriodStart: n,
        currentPeriod: newPeriod, periodEndedAt: null };
      setCg(u); persist(teams, players, games, u, activeTeamId);
    }
  };

  // ── HELPERS ──
  const closePositionLog = (positionLog, playerId, gameClock) => {
    const entry = positionLog.findLast
      ? positionLog.findLast(e => e.playerId === playerId && e.endMs === null)
      : [...positionLog].reverse().find(e => e.playerId === playerId && e.endMs === null);
    if (entry) entry.endMs = gameClock;
  };
  const openPositionLog = (positionLog, playerId, slotId, label, gameClock) => {
    positionLog.push({ playerId, slotId, label, startMs: gameClock, endMs: null });
  };

  // Bench → empty slot: sub player onto field
  const placePlayer = (playerId, slotId) => {
    const slot = FORMATIONS[boardFormation].slots.find(s => s.id === slotId);
    const n = Date.now(), gc = getGameClock();
    const positionLog = [...(cg.positionLog || [])];
    closePositionLog(positionLog, playerId, gc);
    openPositionLog(positionLog, playerId, slotId, slot.label, gc);
    const u = { ...cg, onField: { ...cg.onField, [playerId]: cg.clockRunning ? n : null }, playerPositions: { ...cg.playerPositions, [playerId]: slotId }, positionLog, formation: boardFormation };
    setCg(u); persist(teams, players, games, u, activeTeamId); setPendingPlayer(null);
  };

  // Field → different empty slot: move position, timing unaffected
  const movePosition = (playerId, newSlotId) => {
    const slot = FORMATIONS[boardFormation].slots.find(s => s.id === newSlotId);
    const gc = getGameClock();
    const positionLog = [...(cg.positionLog || [])];
    closePositionLog(positionLog, playerId, gc);
    openPositionLog(positionLog, playerId, newSlotId, slot.label, gc);
    const u = { ...cg, playerPositions: { ...cg.playerPositions, [playerId]: newSlotId }, positionLog, formation: boardFormation };
    setCg(u); persist(teams, players, games, u, activeTeamId); setPendingPlayer(null);
  };

  // Field ↔ Field: swap positions, no timing change for either player
  const swapPositions = (playerA, playerB) => {
    const slotA = cg.playerPositions?.[playerA], slotB = cg.playerPositions?.[playerB];
    if (!slotA || !slotB) return;
    const infoA = FORMATIONS[boardFormation].slots.find(s => s.id === slotA);
    const infoB = FORMATIONS[boardFormation].slots.find(s => s.id === slotB);
    const gc = getGameClock();
    const positionLog = [...(cg.positionLog || [])];
    closePositionLog(positionLog, playerA, gc); closePositionLog(positionLog, playerB, gc);
    openPositionLog(positionLog, playerA, slotB, infoB.label, gc);
    openPositionLog(positionLog, playerB, slotA, infoA.label, gc);
    const u = { ...cg, playerPositions: { ...cg.playerPositions, [playerA]: slotB, [playerB]: slotA }, positionLog };
    setCg(u); persist(teams, players, games, u, activeTeamId); setPendingPlayer(null);
  };

  // Bench ↔ Field: traditional sub — bench player takes field player's position
  const subAndPlace = (benchId, fieldId) => {
    const fieldSlot = cg.playerPositions?.[fieldId]; if (!fieldSlot) return;
    const slot = FORMATIONS[boardFormation].slots.find(s => s.id === fieldSlot);
    const n = Date.now(), gc = getGameClock();
    const newAcc = { ...cg.accumulated };
    if (cg.clockRunning && cg.onField[fieldId] !== null) newAcc[fieldId] = (newAcc[fieldId] || 0) + (n - cg.onField[fieldId]);
    const positionLog = [...(cg.positionLog || [])];
    closePositionLog(positionLog, fieldId, gc); closePositionLog(positionLog, benchId, gc);
    openPositionLog(positionLog, benchId, fieldSlot, slot.label, gc);
    const newOnField = { ...cg.onField }; delete newOnField[fieldId]; newOnField[benchId] = cg.clockRunning ? n : null;
    const newPositions = { ...cg.playerPositions }; delete newPositions[fieldId]; newPositions[benchId] = fieldSlot;
    const u = { ...cg, onField: newOnField, accumulated: newAcc, playerPositions: newPositions, positionLog, formation: boardFormation };
    setCg(u); persist(teams, players, games, u, activeTeamId); setPendingPlayer(null);
  };

  // Apply all queued batch subs atomically at the same timestamp
  const applyBatchSubs = (queue) => {
    if (!queue.length) return;
    const n = Date.now(), gc = getGameClock();
    let state = { ...cg };

    queue.forEach(({ benchId, fieldId }) => {
      const fieldSlot = state.playerPositions?.[fieldId]; if (!fieldSlot) return;
      const slot = FORMATIONS[boardFormation].slots.find(s => s.id === fieldSlot); if (!slot) return;

      const newAcc = { ...state.accumulated };
      if (state.clockRunning && state.onField[fieldId] !== null) {
        newAcc[fieldId] = (newAcc[fieldId] || 0) + (n - state.onField[fieldId]);
      }
      const positionLog = [...(state.positionLog || [])];
      // Close open entries
      const closeEntry = (pid) => {
        const entry = [...positionLog].reverse().find(e => e.playerId === pid && e.endMs === null);
        if (entry) entry.endMs = gc;
      };
      closeEntry(fieldId); closeEntry(benchId);
      positionLog.push({ playerId: benchId, slotId: fieldSlot, label: slot.label, startMs: gc, endMs: null });

      const newOnField = { ...state.onField }; delete newOnField[fieldId]; newOnField[benchId] = state.clockRunning ? n : null;
      const newPositions = { ...state.playerPositions }; delete newPositions[fieldId]; newPositions[benchId] = fieldSlot;
      state = { ...state, onField: newOnField, accumulated: newAcc, playerPositions: newPositions, positionLog };
    });

    setCg(state); persist(teams, players, games, state, activeTeamId);
    setSubMode(false); setSubQueue([]); setSubPending(null); setPendingPlayer(null);
  };

  // Remove a player from the field entirely (send to bench, no replacement)
  const removeFromField = (playerId) => {
    const n = Date.now(), newAcc = { ...cg.accumulated };
    if (cg.clockRunning && cg.onField[playerId] !== null) newAcc[playerId] = (newAcc[playerId] || 0) + (n - cg.onField[playerId]);
    const positionLog = [...(cg.positionLog || [])];
    closePositionLog(positionLog, playerId, getGameClock());
    const newOnField = { ...cg.onField }; delete newOnField[playerId];
    const newPositions = { ...cg.playerPositions }; delete newPositions[playerId];
    const u = { ...cg, onField: newOnField, accumulated: newAcc, playerPositions: newPositions, positionLog };
    setCg(u); persist(teams, players, games, u, activeTeamId); setPendingPlayer(null);
  };

  // Add a late-arriving player
  const addLatePlayer = (id) => {
    if (!cg || cg.attendees.includes(id)) return;
    const u = { ...cg, attendees: [...cg.attendees, id] };
    setCg(u); persist(teams, players, games, u, activeTeamId);
  };

  const endGame = () => {
    const n = Date.now(), finalAcc = { ...cg.accumulated };
    if (cg.clockRunning) Object.keys(cg.onField).forEach(id => { if (cg.onField[id] !== null) finalAcc[id] = (finalAcc[id] || 0) + (n - cg.onField[id]); });
    const totalGameMs = cg.clockRunning ? cg.clockOffset + (n - cg.clockPeriodStart) : cg.clockOffset;

    // Close all open position log entries
    const positionLog = (cg.positionLog || []).map(e => e.endMs === null ? { ...e, endMs: totalGameMs } : e);

    // Build per-player position summary: {playerId: [{label, durationMs}]}
    const positionSummary = {};
    positionLog.forEach(e => {
      if (!positionSummary[e.playerId]) positionSummary[e.playerId] = {};
      if (!positionSummary[e.playerId][e.slotId]) positionSummary[e.playerId][e.slotId] = { label: e.label, durationMs: 0, slotId: e.slotId };
      positionSummary[e.playerId][e.slotId].durationMs += (e.endMs - e.startMs);
    });

    const completed = {
      id: cg.id, teamId: cg.teamId, date: cg.date, opponent: cg.opponent,
      gameType: cg.gameType, formation: boardFormation,
      scoreUs: scoreUs.trim(), scoreThem: scoreThem.trim(),
      attendees: cg.attendees, minutesMs: finalAcc, totalGameMs,
      positionLog, positionSummary,
    };
    const newGames = [...games, completed];
    setGames(newGames); setCg(null); persist(teams, players, newGames, null, activeTeamId);
    setConfirmEnd(false); setScoreUs(""); setScoreThem(""); setPendingPlayer(null);
    setSelectedGame(completed.id); setStatsView("games"); setPage("stats");
  };

  const deleteGame = (id) => {
    const updated = games.filter(g => g.id !== id);
    setGames(updated); persist(teams, players, updated, cg, activeTeamId); setSelectedGame(null); setConfirmDeleteGame(null);
    if (userRef.current) sbDelete("cl_games", id);
  };
  // ── GOOGLE SHEETS PUSH ──
  const extractSheetId = (url) => {
    const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return m ? m[1] : null;
  };

  const sheetsRequest = async (spreadsheetId, range, values) => {
    const token = providerTokenRef.current;
    if (!token) throw new Error("No Google token — please sign out and sign in again");
    // First clear the range
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:clear`,
      { method: "POST", headers: { Authorization: "Bearer " + token } }
    );
    // Then write new data
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
      { method: "PUT",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({ values }) }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Sheets API error ${res.status}`);
    }
    return res.json();
  };

  const pushToSheets = async () => {
    const sid = extractSheetId(sheetUrl);
    if (!sid) { setSheetsStatus("error:Invalid spreadsheet URL — paste the full URL from your browser"); return; }
    if (!providerTokenRef.current) { setSheetsStatus("error:No Google token — sign out and sign back in"); return; }
    setSheetsStatus("pushing");
    try {
      // ── Game Log ──
      const glHeader = ["Game #","Player Name","Opponent","Minutes Played","Status","Date","Home/Away","Result","Score","Positions","Notes"];
      const glRows = [glHeader];
      teamGames.forEach((g, gi) => {
        const result = gameResult(g);
        const score = (g.scoreUs !== "" || g.scoreThem !== "") ? (g.scoreUs || "?") + "-" + (g.scoreThem || "?") : "";
        players.filter(p => p.teamId === activeTeamId).forEach(p => {
          const attended = g.attendees.includes(p.id);
          const ms = attended ? (g.minutesMs?.[p.id] || 0) : 0;
          const mins = Math.round(ms / 60000);
          const status = !attended
            ? (g.dnpReasons?.[p.id] || "DNP - Absent")
            : mins === 0
              ? (g.dnpReasons?.[p.id] || "DNP - Coach")
              : "Played";
          const posStr = g.positionSummary?.[p.id]
            ? Object.values(g.positionSummary[p.id]).sort((a,b) => b.durationMs - a.durationMs)
                .map(pe => pe.label + "(" + Math.round(pe.durationMs/60000) + "m)").join(" ")
            : "";
          glRows.push([gi+1, p.name, g.opponent, mins, status, g.date, g.homeAway || "", result || "", score, posStr, ""]);
        });
      });

      // ── Game Summary ──
      const gsHeader = ["Game #","Date","Opponent","H/A","Result","Score","Players w/ Min","Total Team Min","DNP Count","Avg Min/Player","Formation"];
      const gsRows = [gsHeader];
      teamGames.forEach((g, gi) => {
        const result = gameResult(g);
        const score = (g.scoreUs !== "" || g.scoreThem !== "") ? (g.scoreUs || "?") + "-" + (g.scoreThem || "?") : "";
        const withMin = g.attendees.filter(id => (g.minutesMs?.[id] || 0) > 0).length;
        const dnpCount = g.attendees.length - withMin;
        const totalMins = Math.round(Object.values(g.minutesMs || {}).reduce((s,v) => s+v, 0) / 60000);
        const avgMins = withMin > 0 ? (totalMins / withMin).toFixed(1) : "0.0";
        gsRows.push([gi+1, g.date, g.opponent, g.homeAway || "", result || "", score, withMin, totalMins, dnpCount, avgMins, g.formation || ""]);
      });

      // ── Dashboard ──
      const dbHeader = ["#","Player Name","Position","Games Available","Games Played","Total Minutes","Avg Min/Game","% of Max Min"];
      const dbRows = [dbHeader];
      players.filter(p => p.teamId === activeTeamId).forEach((p, i) => {
        const { played, avail } = getSeasonMs(p.id, teamGames);
        const gamesPlayed = teamGames.filter(g => g.attendees.includes(p.id) && (g.minutesMs?.[p.id] || 0) > 0).length;
        const totalMins = Math.round(played / 60000);
        const avgMins = gamesPlayed > 0 ? (totalMins / gamesPlayed).toFixed(1) : "0.0";
        const pctOfMax = avail > 0 ? Math.round((played / avail) * 100) : 0;
        const allPos = {};
        teamGames.forEach(g => { const ps = g.positionSummary?.[p.id]; if (ps) Object.values(ps).forEach(pe => { allPos[pe.label] = (allPos[pe.label] || 0) + pe.durationMs; }); });
        const topPos = Object.entries(allPos).sort((a,b) => b[1]-a[1])[0]?.[0] || "";
        dbRows.push([i+1, p.name, topPos, teamGames.length, gamesPlayed, totalMins, avgMins, pctOfMax + "%"]);
      });

      // ── Config (player roster — drives Player Profile dropdown) ──
      const cfgHeader = ["Player Names", "Jersey #", "Position"];
      const cfgRows = [cfgHeader];
      players.filter(p => p.teamId === activeTeamId).forEach(p => {
        const allPos = {};
        teamGames.forEach(g => { const ps = g.positionSummary?.[p.id]; if (ps) Object.values(ps).forEach(pe => { allPos[pe.label] = (allPos[pe.label] || 0) + pe.durationMs; }); });
        const topPos = Object.entries(allPos).sort((a,b) => b[1]-a[1])[0]?.[0] || "";
        cfgRows.push([p.name, p.number || "", topPos]);
      });

      // Push all four tabs.
      // Game Log: row 1 is the header — push from A1 to replace it each time.
      // Dashboard: rows 1-5 are the title/config/column-headers block — push
      //   data-only starting at row 6 so that block is never overwritten.
      // Game Summary: rows 1-4 are the title/header block — push data-only
      //   starting at row 5.
      // Config: row 1 is the header — push from A1, same as Game Log.
      await sheetsRequest(sid, "Game Log!A:K",       glRows);
      await sheetsRequest(sid, "Game Summary!A5:K",   gsRows.slice(1));
      await sheetsRequest(sid, "Dashboard!A6:H",      dbRows.slice(1));
      await sheetsRequest(sid, "Config!A:C",          cfgRows);

      setSheetsStatus("ok");
      setTimeout(() => setSheetsStatus(null), 4000);
    } catch (e) {
      setSheetsStatus("error:" + e.message);
    }
  };

  // ── EXPORT FUNCTIONS ──
  const exportGameLog = () => {
    const header = ["Game #","Player Name","Opponent","Minutes Played","Status","Date","Home/Away","Result","Score","Positions","Notes"];
    const rows = [header];
    teamGames.forEach((g, gi) => {
      const result = gameResult(g);
      const score = (g.scoreUs !== "" || g.scoreThem !== "") ? (g.scoreUs || "?") + "-" + (g.scoreThem || "?") : "";
      // All rostered players — attended or not
      const allPlayers = players.filter(p => p.teamId === activeTeamId);
      allPlayers.forEach(p => {
        const attended = g.attendees.includes(p.id);
        const ms = attended ? (g.minutesMs?.[p.id] || 0) : null;
        const mins = ms !== null ? Math.round(ms / 60000) : 0;
        const status = !attended ? "Not Available" : mins === 0 ? "DNP" : "Played";
        // Position summary for this game
        const posSummary = g.positionSummary?.[p.id];
        const posStr = posSummary
          ? Object.values(posSummary).sort((a,b) => b.durationMs - a.durationMs)
              .map(pe => pe.label + "(" + Math.round(pe.durationMs/60000) + "m)").join(" ")
          : "";
        rows.push([gi+1, p.name, g.opponent, mins, status, g.date, "", result || "", score, posStr, ""]);
      });
    });
    const teamName = activeTeam?.name?.replace(/[^a-z0-9]/gi, "_") || "team";
    downloadCSV(teamName + "_game_log.csv", rows, () => setExportMsg("✓ Download started"), (type) => setExportMsg(type === "copied" ? "✓ Copied to clipboard — paste into your spreadsheet" : "Download unavailable — try opening in Chrome"));
  };

  const exportGameSummary = () => {
    const header = ["Game #","Date","Opponent","H/A","Result","Score","Players w/ Min","Total Team Min","DNP Count","Avg Min/Player","Formation"];
    const rows = [header];
    teamGames.forEach((g, gi) => {
      const result = gameResult(g);
      const score = (g.scoreUs !== "" || g.scoreThem !== "") ? (g.scoreUs || "?") + "-" + (g.scoreThem || "?") : "";
      const attended = g.attendees.length;
      const withMin = g.attendees.filter(id => (g.minutesMs?.[id] || 0) > 0).length;
      const dnpCount = attended - withMin;
      const totalMs = Object.values(g.minutesMs || {}).reduce((s, v) => s + v, 0);
      const totalMins = Math.round(totalMs / 60000);
      const avgMins = withMin > 0 ? (totalMins / withMin).toFixed(1) : "0.0";
      rows.push([gi+1, g.date, g.opponent, "", result || "", score, withMin, totalMins, dnpCount, avgMins, g.formation || ""]);
    });
    const teamName = activeTeam?.name?.replace(/[^a-z0-9]/gi, "_") || "team";
    downloadCSV(teamName + "_game_summary.csv", rows, () => setExportMsg("✓ Download started"), (type) => setExportMsg(type === "copied" ? "✓ Copied to clipboard — paste into your spreadsheet" : "Download unavailable — try opening in Chrome"));
  };

  const exportSeasonDashboard = () => {
    const header = ["#","Player Name","Position","Games Available","Games Played","Total Minutes","Avg Min/Game","% of Max Min"];
    const rows = [header];
    const allPlayers = players.filter(p => p.teamId === activeTeamId);
    allPlayers.forEach((p, i) => {
      const { played, avail } = getSeasonMs(p.id, teamGames);
      const gamesAvail = teamGames.length;
      const gamesPlayed = teamGames.filter(g => g.attendees.includes(p.id) && (g.minutesMs?.[p.id] || 0) > 0).length;
      const totalMins = Math.round(played / 60000);
      const availMins = Math.round(avail / 60000);
      const avgMins = gamesPlayed > 0 ? (totalMins / gamesPlayed).toFixed(1) : "0.0";
      const pctOfMax = availMins > 0 ? Math.round((played / avail) * 100) : 0;
      // Best position from season
      const allPos = {};
      teamGames.forEach(g => {
        const ps = g.positionSummary?.[p.id];
        if (ps) Object.values(ps).forEach(pe => { allPos[pe.label] = (allPos[pe.label] || 0) + pe.durationMs; });
      });
      const topPos = Object.entries(allPos).sort((a,b) => b[1]-a[1])[0]?.[0] || "";
      rows.push([i+1, p.name, topPos, gamesAvail, gamesPlayed, totalMins, avgMins, pctOfMax + "%"]);
    });
    const teamName = activeTeam?.name?.replace(/[^a-z0-9]/gi, "_") || "team";
    downloadCSV(teamName + "_season_dashboard.csv", rows, () => setExportMsg("✓ Download started"), (type) => setExportMsg(type === "copied" ? "✓ Copied to clipboard — paste into your spreadsheet" : "Download unavailable — try opening in Chrome"));
  };


  const loadDemoData = () => {
    const tid = "demo_team_1";
    const pids = ["p1","p2","p3","p4","p5","p6","p7","p8","p9","p10","p11"];
    const pnames = ["Emma Rodriguez","Sofia Patel","Aisha Johnson","Mia Chen",
                    "Olivia Kim","Layla Hassan","Priya Sharma","Zoe Williams",
                    "Amara Osei","Isabel Nguyen","Fatima Al-Rashid"];

    const demoTeam = { id: tid, name: "Demo FC", color: "#02C39A", sport: "⚽" };
    const demoPlayers = pids.map((id, i) => ({ id, teamId: tid, name: pnames[i] }));

    // result param removed — result is computed from scoreUs/scoreThem by the app
    const mkGame = (id, date, opponent, gameType, formation, scoreUs, scoreThem, attendeeIdxs, minuteMins, positions) => {
      const totalMs = 50 * 60 * 1000;
      const attendees = attendeeIdxs.map(i => pids[i]);
      const minutesMs = {};
      attendeeIdxs.forEach((pi, j) => { minutesMs[pids[pi]] = (minuteMins[j] || 0) * 60 * 1000; });
      const positionLog = [];
      const positionSummary = {};
      attendeeIdxs.forEach((pi, j) => {
        const playerId = pids[pi];
        const pos = (positions && positions[j]) ? positions[j] : "MID";
        const ms = minutesMs[playerId] || 0;
        if (ms > 0) {
          positionLog.push({ playerId, slotId: pos, label: pos, startMs: 0, endMs: ms });
          positionSummary[playerId] = { [pos]: { label: pos, durationMs: ms, slotId: pos } };
        }
      });
      return { id, teamId: tid, date, opponent, gameType, formation,
               scoreUs: String(scoreUs), scoreThem: String(scoreThem),
               attendees, minutesMs, totalGameMs: totalMs, positionLog, positionSummary };
    };

    const demoGames = [
      mkGame("g1","3/1/2025","Riverside United","league","4-3-3","2","1",
        [0,1,2,3,4,5,6,7,8,9,10],[50,0,45,42,50,38,50,22,45,50,30],
        ["GK","GK","CB","CB","LB","LM","CM","RM","LW","ST","RW"]),
      mkGame("g2","3/8/2025","North Shore SC","league","4-3-3","1","1",
        [0,1,2,3,4,5,6,7,8,9,10],[50,0,50,50,35,50,44,28,50,40,50],
        ["GK","GK","CB","CB","RB","LM","CM","RM","LW","ST","RW"]),
      mkGame("g3","3/15/2025","East Bay FC","tournament","4-4-2","3","0",
        [0,2,3,4,5,6,7,8,9,10],[50,48,50,42,50,50,30,50,20,50],
        ["GK","CB","CB","LB","LM","CM","RM","LW","ST","RW"]),
      mkGame("g4","3/22/2025","Valley Storm","league","4-3-3","0","2",
        [0,1,2,3,4,5,6,7,8,9,10],[50,0,40,50,50,20,50,50,35,45,28],
        ["GK","GK","CB","CB","RB","LM","CM","RM","LW","ST","RW"]),
    ];

    const newTeams = [...teams.filter(t => t.id !== tid), demoTeam];
    const newPlayers = [...players.filter(p => p.teamId !== tid), ...demoPlayers];
    const newGames = [...games.filter(g => g.teamId !== tid), ...demoGames];

    setTeams(newTeams);
    setPlayers(newPlayers);
    setGames(newGames);
    setActiveTeamId(tid);
    persist(newTeams, newPlayers, newGames, null, tid);
    setPage("stats");
    setStatsView("players");
  };

  const saveEditedScore = (id) => {
    const updated = games.map(g => g.id === id ? { ...g, scoreUs: editScoreUs.trim(), scoreThem: editScoreThem.trim() } : g);
    setGames(updated); persist(teams, players, updated, cg, activeTeamId); setEditingScore(null);
  };

  // ── DERIVED ──
  const activeTeam   = teams.find(t => t.id === activeTeamId);
  const teamPlayers  = players.filter(p => p.teamId === activeTeamId);
  const teamGames    = games.filter(g => g.teamId === activeTeamId);
  const fieldIds     = cg ? Object.keys(cg.onField) : [];
  const benchIds     = cg ? cg.attendees.filter(id => !fieldIds.includes(id)) : [];
  const notInGame    = cg ? teamPlayers.filter(p => !cg.attendees.includes(p.id)) : [];
  const gameClock    = getGameClock();
  const gameDetail   = selectedGame ? teamGames.find(g => g.id === selectedGame) : null;
  const teamColor    = activeTeam?.color || TEAM_COLORS[0];
  const teamSport    = activeTeam?.sport || "🏅";
  const liveForTeam  = cg && cg.teamId === activeTeamId;
  const inTeam       = !!activeTeamId && page !== "teams";
  const gtInfo       = (key) => (darkMode ? GAME_TYPES.dark : GAME_TYPES.light)[key] || (darkMode ? GAME_TYPES.dark : GAME_TYPES.light).league;

  // Slot → player lookup
  const slotToPlayer = cg ? Object.fromEntries(Object.entries(cg.playerPositions || {}).map(([pid, sid]) => [sid, pid])) : {};

  const seasonStats = teamPlayers.map(p => {
    const { played, avail } = getSeasonMs(p.id, teamGames);
    const pct = avail > 0 ? Math.round((played / avail) * 100) : null;
    const gamesAttended = teamGames.filter(g => g.attendees.includes(p.id)).length;
    return { ...p, playedMs: played, availableMs: avail, pct, gamesAttended };
  }).sort((a, b) => (a.pct ?? 999) - (b.pct ?? 999));
  const underFifty = seasonStats.filter(s => s.pct !== null && s.pct < 50);

  // ── DESIGN TOKENS ──
  const C = darkMode ? {
    // ── AR GLASS DARK THEME ──
    bg: "#030d0b", surface: "rgba(2,195,154,0.07)", surfaceHigh: "rgba(2,195,154,0.12)", surfaceAlt: "rgba(2,195,154,0.04)",
    border: "rgba(2,195,154,0.18)", borderMed: "rgba(2,195,154,0.28)", borderStrong: "rgba(2,195,154,0.45)",
    text: "#ffffff", textSub: "#cccccc", textMuted: "rgba(255,255,255,0.4)", navBg: "rgba(3,13,11,0.85)",
    green: "#02C39A", greenBg: "rgba(2,195,154,0.15)", greenBorder: "rgba(2,195,154,0.45)",
    red: "#FF1744", redBg: "rgba(255,23,68,0.12)", redBorder: "rgba(255,23,68,0.40)",
    amber: "#FFD600", amberBg: "rgba(255,214,0,0.12)",
    purple: "#D500F9", purpleBg: "rgba(213,0,249,0.12)", purpleBorder: "rgba(213,0,249,0.40)",
    shadow: "0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(2,195,154,0.15), inset 0 1px 0 rgba(255,255,255,0.06)", shadowSm: "0 2px 12px rgba(0,0,0,0.5), 0 0 0 1px rgba(2,195,154,0.10)",
    inputBg: "rgba(2,195,154,0.05)",
    pitch: { bg1: "#0a2e18", bg2: "#0d3a1e", line: "rgba(255,255,255,0.40)", stripe: "rgba(255,255,255,0.04)" },
  } : {
    bg: "#f0f2f8", surface: "#ffffff", surfaceHigh: "#ffffff", surfaceAlt: "#eaecf5",
    border: "rgba(0,0,0,0.07)", borderMed: "rgba(0,0,0,0.11)", borderStrong: "rgba(0,0,0,0.20)",
    text: "#0d1022", textSub: "#3a4060", textMuted: "#7a85a0", navBg: "rgba(240,242,248,0.95)",
    green: "#02C39A", greenBg: "#e6f9f5", greenBorder: "#7edfc9",
    red: "#dc2626", redBg: "#fee2e2", redBorder: "#fca5a5",
    amber: "#b45309", amberBg: "#fef3c7",
    purple: "#7c3aed", purpleBg: "#ede9fe", purpleBorder: "#c4b5fd",
    shadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.07)", shadowSm: "0 1px 3px rgba(0,0,0,0.05)",
    inputBg: "#f5f6fb",
    pitch: { bg1: "#2d6a3f", bg2: "#2a6039", line: "rgba(255,255,255,0.55)", stripe: "rgba(255,255,255,0.06)" },
  };

  const F = { h: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", m: "'JetBrains Mono', monospace" };

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { background: ${C.bg}; }
    .tap { cursor: pointer; user-select: none; -webkit-tap-highlight-color: transparent; transition: opacity .12s, transform .1s; }
    .tap:active { opacity: .6; transform: scale(.97); }
    input:focus { outline: none; border-color: ${teamColor} !important; box-shadow: 0 0 0 3px ${teamColor}28 !important; }
    input::placeholder { color: ${C.textMuted}; }
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-thumb { background: ${C.borderMed}; border-radius: 4px; }
    .pulse { animation: pulse 1.5s ease-in-out infinite; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.2} }
    .slide { animation: slide .18s cubic-bezier(.22,.68,0,1.2); }
    @keyframes slide { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
    .nav-glass { backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
    .field-token { transition: transform .15s, filter .15s; cursor: pointer; }
    .field-token:hover { filter: brightness(1.2); }
  `;

  const inp = (extra = {}) => ({
    background: C.inputBg, border: `1.5px solid ${C.borderMed}`, borderRadius: 12,
    padding: "12px 14px", fontFamily: F.h, fontSize: 15, color: C.text, width: "100%", fontWeight: 500,
    ...(darkMode ? { backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" } : {}),
    ...extra,
  });
  const card = (extra = {}) => ({
    background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, boxShadow: C.shadow,
    ...(darkMode ? { backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" } : {}),
    ...extra,
  });
  const lbl = (extra = {}) => ({
    fontFamily: F.m, fontSize: 10, fontWeight: 700, color: C.textMuted,
    letterSpacing: "0.09em", display: "block", textTransform: "uppercase", ...extra,
  });
  const Chip = ({ children, color, bg, border: bdr, onClick, style = {} }) => (
    <span onClick={onClick} style={{ display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 999, fontFamily: F.m, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", color: color || C.textMuted, background: bg || C.surfaceAlt, border: `1px solid ${bdr || C.borderMed}`, cursor: onClick ? "pointer" : "default", ...style }}>
      {children}
    </span>
  );
  const Avatar = ({ name, color, size = 38 }) => (
    <div style={{ width: size, height: size, borderRadius: "50%", background: darkMode ? "#000" : color + "18", border: `2px solid ${color}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontFamily: F.h, fontSize: size * 0.33, fontWeight: 800, color: darkMode ? color : color, letterSpacing: "-0.01em" }}>
      {initials(name)}
    </div>
  );
  const ResultBadge = ({ r }) => {
    if (!r) return null;
    const s = { W: { c: C.green, bg: C.greenBg, b: C.greenBorder }, L: { c: C.red, bg: C.redBg, b: C.redBorder }, D: { c: C.textMuted, bg: C.surfaceAlt, b: C.borderMed } }[r];
    return <span style={{ fontFamily: F.m, fontSize: 10, fontWeight: 700, color: s.c, background: s.bg, border: `1px solid ${s.b}`, borderRadius: 999, padding: "2px 9px", marginLeft: 5 }}>{r}</span>;
  };
  const PctBar = ({ pct, color, height = 8 }) => (
    <div style={{ background: C.surfaceAlt, borderRadius: 999, height, overflow: "hidden", position: "relative" }}>
      {pct !== null && pct > 0 && <div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", background: color, borderRadius: 999 }} />}
      <div style={{ position: "absolute", left: "50%", top: 0, width: "1.5px", height: "100%", background: C.borderStrong, opacity: 0.4 }} />
    </div>
  );

  // ── SOCCER PITCH SVG ──
  const SoccerPitch = ({ formation: fm, slotToPlayer: s2p, onSlotTap, onPlayerTap, pendingId, getPlayerMs: gpMs, gameClock: gc, teamColor: tc, players: pl, queuedOff = [], onCancel }) => {
    const slots = FORMATIONS[fm]?.slots || [];
    const P = C.pitch;
    return (
      <svg viewBox="0 0 130 150" style={{ height: "50vh", width: "100%", maxWidth: "calc(50vh * 0.867)", display: "block", borderRadius: 14, margin: "0 auto" }} onClick={e => { if (e.target.tagName === "svg" || e.target.tagName === "rect" && e.target.getAttribute("data-bg")) { if (onCancel) onCancel(); } }}>
        {/* Pitch stripes */}
        {[0,1,2,3,4,5,6].map(i => (
          <rect key={i} x="8" y={5 + i * 20} width="114" height="10" fill={P.stripe} />
        ))}
        {/* Pitch background */}
        <rect x="8" y="5" width="114" height="140" rx="4" fill="transparent" stroke={P.line} strokeWidth="0.7" data-bg="1" />
        {/* Halfway line */}
        <line x1="8" y1="75" x2="122" y2="75" stroke={P.line} strokeWidth="0.6" />
        {/* Center circle */}
        <circle cx="65" cy="75" r="14" fill="none" stroke={P.line} strokeWidth="0.6" />
        <circle cx="65" cy="75" r="0.9" fill={P.line} />
        {/* Top penalty area */}
        <rect x="39" y="5" width="70" height="22" rx="1" fill="none" stroke={P.line} strokeWidth="0.6" />
        {/* Top goal area */}
        <rect x="52" y="5" width="26" height="11" rx="1" fill="none" stroke={P.line} strokeWidth="0.6" />
        {/* Top penalty spot */}
        <circle cx="65" cy="20" r="0.8" fill={P.line} />
        {/* Top goal box (behind line) */}
        <rect x="52" y="3" width="26" height="3.5" rx="0.5" fill="none" stroke={P.line} strokeWidth="0.6" />
        {/* Bottom penalty area */}
        <rect x="39" y="123" width="70" height="22" rx="1" fill="none" stroke={P.line} strokeWidth="0.6" />
        {/* Bottom goal area */}
        <rect x="52" y="134" width="26" height="11" rx="1" fill="none" stroke={P.line} strokeWidth="0.6" />
        {/* Bottom penalty spot */}
        <circle cx="65" cy="130" r="0.8" fill={P.line} />
        {/* Bottom goal box (behind line) */}
        <rect x="52" y="143.5" width="26" height="3.5" rx="0.5" fill="none" stroke={P.line} strokeWidth="0.6" />
        {/* Corner arcs — inward quarter-circles at each corner */}
        <path d="M 11,5 A 3,3 0 0 1 8,8"   fill="none" stroke={P.line} strokeWidth="0.6" />
        <path d="M 119,5 A 3,3 0 0 0 122,8"  fill="none" stroke={P.line} strokeWidth="0.6" />
        <path d="M 11,145 A 3,3 0 0 0 8,142"  fill="none" stroke={P.line} strokeWidth="0.6" />
        <path d="M 119,145 A 3,3 0 0 1 122,142" fill="none" stroke={P.line} strokeWidth="0.6" />

        {/* Position slots */}
        {slots.map(slot => {
          const occupantId = s2p[slot.id];
          const occupant   = occupantId ? pl.find(p => p.id === occupantId) : null;
          const isPending  = pendingId === occupantId && occupantId;
          const ms         = occupantId ? gpMs(occupantId) : 0;
          const pct        = gc > 0 && ms > 0 ? Math.round((ms / gc) * 100) : 0;
          const sc         = posColor(slot.id);

          if (occupant) {
            // Text-only pill: name + time stacked, no circle
            const ringColor = pct >= 50 ? "#00E676" : pct >= 26 ? "#FFD600" : pct > 0 ? "#FF1744" : "rgba(255,255,255,0.55)";
            const isQOff = queuedOff.includes(occupantId);
            const allNames = pl.map(p => p.name);
            const sName = shortName(occupant.name, allNames);
            const displayName = sName.length > 9 ? sName.slice(0, 8) + "…" : sName;
            // Pill dimensions
            const pillW = 21, pillH = 12;
            const bgFill = isQOff ? "rgba(160,0,20,0.92)" : "rgba(0,0,0,0.82)";
            const borderCol = isQOff ? "#FF1744" : isPending ? tc : "rgba(255,255,255,0.3)";
            const borderW = isPending ? "1.6" : "0.8";
            return (
              <g key={slot.id} className="field-token" onClick={() => onPlayerTap(occupantId)}
                transform={`translate(${slot.x}, ${slot.y})`}>
                {/* Dark pill background */}
                <rect x={-pillW/2} y={-pillH/2} width={pillW} height={pillH} rx="3.0"
                  fill={bgFill} stroke={borderCol} strokeWidth={borderW} />
                {/* Player name — white */}
                <text textAnchor="middle" y="-1.2" fontSize="3.9"
                  fontFamily="Inter, sans-serif" fontWeight="800" fill="#ffffff">
                  {displayName}
                </text>
                {/* Time — same size, color-coded */}
                <text textAnchor="middle" y="3.6" fontSize="3.9"
                  fontFamily="JetBrains Mono, monospace" fontWeight="800"
                  fill={ringColor}>
                  {ms > 0 ? fmtClock(ms) : "0:00"}
                </text>
                {/* Position badge — small pill below */}
                <rect x="-4.6" y="7.0" width="9.2" height="3.6" rx="1.8" fill={sc} />
                <text textAnchor="middle" y="9.6" fontSize="2.8"
                  fontFamily="JetBrains Mono, monospace" fontWeight="800" fill="#000000">
                  {slot.label}
                </text>
              </g>
            );
          } else {
            // Empty slot — dashed pill
            const isTarget = !!pendingId;
            return (
              <g key={slot.id} className="field-token" onClick={() => onSlotTap(slot.id)}
                transform={`translate(${slot.x}, ${slot.y})`}
                style={{ opacity: isTarget ? 0.9 : 0.45 }}>
                <rect x="-10.5" y="-6" width="21" height="12" rx="3.0"
                  fill={isTarget ? sc + "22" : "rgba(0,0,0,0.35)"}
                  stroke={isTarget ? sc : "rgba(255,255,255,0.4)"}
                  strokeWidth={isTarget ? "1.4" : "0.8"}
                  strokeDasharray={isTarget ? "none" : "2,1.5"} />
                <text textAnchor="middle" y="1.0" fontSize="3.7"
                  fontFamily="JetBrains Mono, monospace" fontWeight="700"
                  fill={isTarget ? sc : "rgba(255,255,255,0.6)"}>
                  {slot.label}
                </text>
              </g>
            );
          }
        })}

        {/* Direction arrows (subtle) */}
        <text x="65" y="10" textAnchor="middle" fontSize="3.5" fill={P.line} fontFamily="sans-serif">▲ Attack</text>
        <text x="65" y="143" textAnchor="middle" fontSize="3.5" fill={P.line} fontFamily="sans-serif">▼ Defend</text>
      </svg>
    );
  };

  if (!authLoaded) return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#555", fontFamily: "monospace", fontSize: 12 }}>Loading…</div>
    </div>
  );

  if (!user) return <SignInScreen />;

  if (!loaded) return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{css}</style>
      <div style={{ color: C.textMuted, fontFamily: F.m, fontSize: 12 }}>Loading…</div>
    </div>
  );

  const navTabs = inTeam
    ? [["roster", "Roster"], [liveForTeam ? "game" : "newgame", liveForTeam ? "Game" : "New Game"], ["stats", "Stats"]]
    : [];

  return (
    <div style={{ background: darkMode ? `radial-gradient(ellipse at 60% -5%, rgba(0,168,150,0.35) 0%, rgba(5,102,141,0.20) 25%, rgba(2,128,144,0.08) 45%, ${C.bg} 70%)` : C.bg, minHeight: "100vh", color: C.text, fontFamily: F.h, maxWidth: 480, margin: "0 auto", paddingBottom: 40 }}>
      <style>{css}</style>

      {/* ── NAV ── */}
      <div className="nav-glass" style={{ background: C.navBg, borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ padding: "14px 18px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: inTeam ? 12 : 14 }}>
            {inTeam && (
              <button className="tap" onClick={() => setPage("teams")}
                style={{ background: C.surfaceAlt, border: `1px solid ${C.borderMed}`, borderRadius: 999, color: C.textSub, fontFamily: F.h, fontSize: 12, fontWeight: 600, cursor: "pointer", padding: "5px 12px", flexShrink: 0 }}>
                ← All
              </button>
            )}
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              {inTeam
                ? <><div style={{ width: 9, height: 9, borderRadius: "50%", background: teamColor, flexShrink: 0, boxShadow: `0 0 8px ${teamColor}80` }} />
                    <span style={{ fontSize: 17, fontWeight: 700, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{teamSport} {activeTeam?.name}</span></>
                : <span style={{ fontSize: 17, fontWeight: 800, color: C.text }}>📋 CoachLog</span>}
            </div>
            {liveForTeam && <Chip color="#030d0b" bg={C.green} border="transparent" style={{ gap: 5, boxShadow: `0 0 12px ${C.green}66` }}><span className="pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: "#030d0b", display: "inline-block" }} /> Live</Chip>}
            <button className="tap" onClick={() => setDarkMode(m => !m)}
              style={{ background: C.surfaceAlt, border: `1px solid ${C.borderMed}`, borderRadius: 999, padding: "5px 10px", fontSize: 15, cursor: "pointer", lineHeight: 1 }}>
              {darkMode ? "☀️" : "🌙"}
            </button>
            {/* User avatar — tap to sign out */}
            {user && (
              <button className="tap" onClick={() => sb.auth.signOut()}
                title={`Signed in as ${user.email}\nTap to sign out`}
                style={{ width: 32, height: 32, borderRadius: "50%", border: `2px solid ${teamColor || C.borderMed}`, padding: 0, cursor: "pointer", overflow: "hidden", flexShrink: 0, background: C.surfaceAlt }}>
                {user.user_metadata?.avatar_url
                  ? <img src={user.user_metadata.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <span style={{ fontSize: 13, fontWeight: 700, color: C.textSub }}>{(user.email || "?")[0].toUpperCase()}</span>}
              </button>
            )}
            {syncing && <span style={{ fontFamily: F.m, fontSize: 10, color: C.textMuted }}>↑</span>}
          </div>
          {inTeam ? (
            <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${C.border}` }}>
              {navTabs.map(([key, tabLabel]) => {
                const active = page === key;
                const showDot = liveForTeam && key === "game" && !active;
                return (
                  <button key={key} className="tap" onClick={() => setPage(key)}
                    style={{ flex: 1, padding: "10px 4px", background: "transparent", border: "none", color: active ? teamColor : C.textMuted, fontFamily: F.h, fontSize: 14, fontWeight: active ? 700 : 500, borderBottom: `2px solid ${active ? teamColor : "transparent"}`, marginBottom: -1, cursor: "pointer", position: "relative" }}>
                    {tabLabel}
                    {showDot && <span className="pulse" style={{ position: "absolute", top: 6, right: 8, width: 6, height: 6, borderRadius: "50%", background: C.green }} />}
                  </button>
                );
              })}
            </div>
          ) : <div style={{ height: 3 }} />}
        </div>
      </div>

      <div style={{ padding: "16px 16px 0" }}>

        {/* ════ TEAMS ════ */}
        {page === "teams" && (
          <div className="slide">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>My Teams</span>
              <Chip>{teams.length} team{teams.length !== 1 ? "s" : ""}</Chip>
            </div>
            <div style={{ ...card(), padding: 16, marginBottom: 14 }}>
              <span style={{ ...lbl(), marginBottom: 10 }}>New Team</span>
              <input value={newTeamName} onChange={e => setNewTeamName(e.target.value)} onKeyDown={e => e.key === "Enter" && addTeam()} placeholder="Team name…" style={inp({ marginBottom: 12 })} />
              <span style={{ ...lbl(), marginBottom: 8 }}>Sport</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                {SPORTS.map(s => {
                  const sel = newTeamSport === s.emoji;
                  return (
                    <button key={s.emoji} className="tap" onClick={() => setNewTeamSport(s.emoji)} title={s.label}
                      style={{ width: 42, height: 42, borderRadius: 12, background: sel ? newTeamColor + "22" : C.surfaceAlt, border: `1.5px solid ${sel ? newTeamColor : C.borderMed}`, fontSize: 21, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {s.emoji}
                    </button>
                  );
                })}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", gap: 8 }}>
                  {TEAM_COLORS.map(c => (
                    <div key={c} className="tap" onClick={() => setNewTeamColor(c)}
                      style={{ width: 24, height: 24, borderRadius: "50%", background: c, boxShadow: newTeamColor === c ? `0 0 0 2px ${C.bg}, 0 0 0 4px ${c}` : "none", cursor: "pointer" }} />
                  ))}
                </div>
                <button className="tap" onClick={addTeam} disabled={!newTeamName.trim()}
                  style={{ padding: "10px 22px", background: newTeamName.trim() ? newTeamColor : C.surfaceAlt, color: "#fff", border: "none", borderRadius: 999, fontFamily: F.h, fontSize: 14, fontWeight: 700, cursor: newTeamName.trim() ? "pointer" : "default" }}>
                  + Add
                </button>
              </div>
            </div>
            {teams.length === 0
              ? <div style={{ textAlign: "center", padding: "56px 20px", color: C.textMuted, fontSize: 14 }}>No teams yet — create one above</div>
              : teams.map(t => {
                const tP = players.filter(p => p.teamId === t.id), tG = games.filter(g => g.teamId === t.id);
                const hasLive = cg?.teamId === t.id, isEd = editingTeam === t.id;
                return (
                  <div key={t.id} style={{ ...card({ border: `1px solid ${hasLive ? t.color + "60" : C.border}` }), marginBottom: 10, overflow: "hidden" }}>
                    {isEd
                      ? <div style={{ padding: "12px 14px", display: "flex", gap: 8 }}>
                          <input autoFocus value={editVal} onChange={e => setEditVal(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") renameTeam(t.id); if (e.key === "Escape") setEditingTeam(null); }} style={inp({ flex: 1 })} />
                          <button className="tap" onClick={() => renameTeam(t.id)} style={{ padding: "10px 16px", background: t.color, color: "#fff", border: "none", borderRadius: 10, fontFamily: F.h, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Save</button>
                          <button className="tap" onClick={() => setEditingTeam(null)} style={{ padding: "10px 12px", background: C.surfaceAlt, color: C.textSub, border: `1px solid ${C.borderMed}`, borderRadius: 10, fontFamily: F.h, fontSize: 14, cursor: "pointer" }}>✕</button>
                        </div>
                      : <div className="tap" onClick={() => selectTeam(t.id)} style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 14 }}>
                          <div style={{ width: 48, height: 48, borderRadius: 14, background: t.color + "1e", border: `1.5px solid ${t.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>{t.sport || "🏅"}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 3 }}>{t.name}</div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontFamily: F.m, fontSize: 11, color: C.textMuted }}>{tP.length} players · {tG.length} games</span>
                              {hasLive && <span className="pulse" style={{ color: C.green, fontFamily: F.m, fontSize: 11, fontWeight: 700 }}>● Live</span>}
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button className="tap" onClick={e => { e.stopPropagation(); setEditVal(t.name); setEditingTeam(t.id); }} style={{ background: C.surfaceAlt, border: `1px solid ${C.borderMed}`, color: C.textSub, padding: "7px 10px", borderRadius: 10, fontSize: 13, cursor: "pointer" }}>✏</button>
                            {confirmDeleteTeam === t.id
                              ? <><button className="tap" onClick={e => { e.stopPropagation(); deleteTeam(t.id); }} style={{ background: C.red, border: "none", color: "#fff", padding: "7px 12px", borderRadius: 10, fontFamily: F.h, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Del</button>
                                  <button className="tap" onClick={e => { e.stopPropagation(); setConfirmDeleteTeam(null); }} style={{ background: C.surfaceAlt, border: `1px solid ${C.borderMed}`, color: C.textSub, padding: "7px 10px", borderRadius: 10, fontSize: 13, cursor: "pointer" }}>✕</button></>
                              : <button className="tap" onClick={e => { e.stopPropagation(); setConfirmDeleteTeam(t.id); }} style={{ background: C.surfaceAlt, border: `1px solid ${C.borderMed}`, color: C.textMuted, padding: "7px 10px", borderRadius: 10, fontSize: 13, cursor: "pointer" }}>🗑</button>}
                          </div>
                        </div>}
                  </div>
                );
              })}
            {/* Demo data button — always visible at bottom of teams page */}
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.border}`, textAlign: "center" }}>
              <button className="tap" onClick={loadDemoData}
                style={{ padding: "10px 22px", background: C.surfaceAlt, border: `1.5px solid ${C.borderMed}`, borderRadius: 12, color: C.textMuted, fontFamily: F.h, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                ⚽ Load Demo Data
              </button>
              <div style={{ color: C.textMuted, fontSize: 11, marginTop: 6 }}>11 players · 4 games · ready to export</div>
            </div>
          </div>
        )}

        {/* ════ ROSTER ════ */}
        {page === "roster" && activeTeam && (
          <div className="slide">
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <input value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === "Enter" && addPlayer()} placeholder="Player name…" style={inp({ flex: 1 })} />
              <button className="tap" onClick={addPlayer} style={{ padding: "12px 20px", background: teamColor, color: "#fff", borderRadius: 12, border: "none", fontFamily: F.h, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>+ Add</button>
            </div>
            {teamPlayers.length === 0
              ? <div style={{ textAlign: "center", padding: "60px 20px", color: C.textMuted, fontSize: 14 }}>No players yet — add them above</div>
              : teamPlayers.map((p, i) => (
                <div key={p.id} style={{ ...card(), display: "flex", alignItems: "center", gap: 12, marginBottom: 8, padding: "12px 14px" }}>
                  <Avatar name={p.name} color={teamColor} size={38} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{p.name}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3 }}>
                      <span style={{ fontFamily: F.m, fontSize: 10, color: C.textMuted }}>#</span>
                      <input value={p.number || ""} onChange={e => updatePlayerNumber(p.id, e.target.value.replace(/\D/g, "").slice(0, 2))} placeholder="–" style={{ width: 28, fontFamily: F.m, fontSize: 11, background: "transparent", border: "none", borderBottom: `1px solid ${C.borderMed}`, color: C.textMuted, padding: "0 2px", textAlign: "center", outline: "none" }} />
                    </div>
                  </div>
                  <button className="tap" onClick={() => removePlayer(p.id)} style={{ background: C.redBg, border: `1px solid ${C.redBorder}`, color: C.red, fontSize: 14, padding: "6px 10px", borderRadius: 9, cursor: "pointer" }}>✕</button>
                </div>
              ))}
          </div>
        )}

        {/* ════ NEW GAME ════ */}
        {page === "newgame" && activeTeam && !liveForTeam && (() => {
          const allSetupIds = [...attendees, ...guests.map(g => g.id)];
          const allSetupPlayers = [...teamPlayers.filter(p => attendees.includes(p.id)), ...guests];
          const draftSlotToPlayer = Object.fromEntries(Object.entries(setupDraft).map(([pid, sid]) => [sid, pid]));
          const placedIds = Object.keys(setupDraft);
          const unplacedIds = allSetupIds.filter(id => !placedIds.includes(id));
          const slots = FORMATIONS[formation]?.slots || [];
          const hasPending = !!setupPending || !!dragState;

          const toSvgCoords = (clientX, clientY) => {
            const el = pitchSvgRef.current;
            if (!el) return null;
            const rect = el.getBoundingClientRect();
            return { x: ((clientX - rect.left) / rect.width) * 100, y: ((clientY - rect.top) / rect.height) * 150 };
          };
          const findNearestSlot = (clientX, clientY) => {
            const coords = toSvgCoords(clientX, clientY);
            if (!coords || coords.y < 0 || coords.y > 150) return null;
            let nearest = null, minDist = 13;
            slots.forEach(slot => {
              const d = Math.hypot(slot.x - coords.x, slot.y - coords.y);
              if (d < minDist) { minDist = d; nearest = slot.id; }
            });
            return nearest;
          };
          const applyDraftDrop = (playerId, slotId) => {
            const newDraft = Object.fromEntries(Object.entries(setupDraft).filter(([pid]) => pid !== playerId));
            Object.keys(newDraft).forEach(pid => { if (newDraft[pid] === slotId) delete newDraft[pid]; });
            newDraft[playerId] = slotId;
            setSetupDraft(newDraft); setSetupPending(null);
          };

          const P = C.pitch;
          return (
          <div className="slide">
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 18 }}>New Game</div>

            {/* Opponent */}
            <div style={{ marginBottom: 14 }}>
              <span style={{ ...lbl(), marginBottom: 7 }}>Opponent</span>
              <input value={opponent} onChange={e => setOpponent(e.target.value)} placeholder="Opponent name…" style={inp({})} />
            </div>

            {/* Home / Away */}
            <div style={{ marginBottom: 14 }}>
              <span style={{ ...lbl(), marginBottom: 7 }}>Home / Away</span>
              <div style={{ display: "flex", gap: 8 }}>
                {[["Home","🏠"],["Away","✈️"]].map(([ha, icon]) => {
                  const sel = homeAway === ha;
                  return (
                    <button key={ha} className="tap" onClick={() => setHomeAway(ha)}
                      style={{ flex: 1, padding: "12px 6px", background: sel ? teamColor + "22" : C.surfaceAlt, border: `1.5px solid ${sel ? teamColor : C.borderMed}`, borderRadius: 14, color: sel ? teamColor : C.textMuted, fontFamily: F.h, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                      {icon} {ha}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Game Type */}
            <div style={{ marginBottom: 14 }}>
              <span style={{ ...lbl(), marginBottom: 8 }}>Game Type</span>
              <div style={{ display: "flex", gap: 8 }}>
                {Object.entries(darkMode ? GAME_TYPES.dark : GAME_TYPES.light).map(([key, d]) => {
                  const sel = gameType === key;
                  return (
                    <button key={key} className="tap" onClick={() => setGameType(key)}
                      style={{ flex: 1, padding: "12px 6px", background: sel ? d.bg : C.surfaceAlt, border: `1.5px solid ${sel ? d.border : C.borderMed}`, borderRadius: 14, color: sel ? d.color : C.textMuted, fontFamily: F.h, fontSize: 12, fontWeight: 700, cursor: "pointer", lineHeight: 1.6 }}>
                      <div style={{ fontSize: 18, marginBottom: 4 }}>{d.icon}</div>{d.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Formation picker — 7v7 first, then 11v11 */}
            <div style={{ marginBottom: 16 }}>
              <span style={{ ...lbl(), marginBottom: 8 }}>Formation</span>
              {[7, 9, 11].map(size => {
                const group = Object.entries(FORMATIONS).filter(([, f]) => f.size === size);
                return (
                  <div key={size} style={{ marginBottom: 8 }}>
                    <div style={{ fontFamily: F.m, fontSize: 9, fontWeight: 700, color: C.textMuted, letterSpacing: "0.08em", marginBottom: 5 }}>{size}v{size}</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {group.map(([key]) => {
                        const sel = formation === key;
                        return (
                          <button key={key} className="tap" onClick={() => { setFormation(key); setSetupDraft({}); setSetupPending(null); setHalfMins({ 7: 25, 9: 30, 11: 45 }[FORMATIONS[key].size] || 25); }}
                            style={{ padding: "7px 14px", background: sel ? teamColor : C.surfaceAlt, border: `1.5px solid ${sel ? teamColor : C.borderMed}`, borderRadius: 999, color: sel ? "#fff" : C.textMuted, fontFamily: F.m, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                            {key}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Game Time */}
            <div style={{ marginBottom: 16 }}>
              <span style={{ ...lbl(), marginBottom: 8 }}>Game Time</span>
              <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
                {/* Period structure */}
                <div style={{ display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
                  <span style={{ fontFamily: F.m, fontSize: 9, fontWeight: 700, color: C.textMuted, letterSpacing: "0.08em" }}>STRUCTURE</span>
                  <div style={{ display: "flex", gap: 6 }}>
                    {[[2, "2 Halves"], [4, "4 Qtrs"]].map(([n, label]) => {
                      const sel = numPeriods === n;
                      return (
                        <button key={n} className="tap" onClick={() => setNumPeriods(n)}
                          style={{ flex: 1, padding: "10px 6px", background: sel ? teamColor + "22" : C.surfaceAlt, border: `1.5px solid ${sel ? teamColor : C.borderMed}`, borderRadius: 12, color: sel ? teamColor : C.textMuted, fontFamily: F.h, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {/* Half/Quarter length */}
                <div style={{ display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
                  <span style={{ fontFamily: F.m, fontSize: 9, fontWeight: 700, color: C.textMuted, letterSpacing: "0.08em" }}>{numPeriods === 4 ? "QTR LENGTH" : "HALF LENGTH"}</span>
                  <div style={{ display: "flex", gap: 6 }}>
                    {(numPeriods === 4 ? [10, 12, 15] : [20, 25, 30, 35, 40, 45]).map(m => {
                      const sel = halfMins === m;
                      return (
                        <button key={m} className="tap" onClick={() => setHalfMins(m)}
                          style={{ flex: 1, padding: "10px 4px", background: sel ? teamColor + "22" : C.surfaceAlt, border: `1.5px solid ${sel ? teamColor : C.borderMed}`, borderRadius: 12, color: sel ? teamColor : C.textMuted, fontFamily: F.m, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                          {m}m
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 8, fontFamily: F.m, fontSize: 10, color: C.textMuted, textAlign: "center" }}>
                Auto-pauses at {halfMins}:00 · {fmtClock(numPeriods * halfMins * 60 * 1000)} total
              </div>
            </div>

            {/* Attendance */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ ...lbl() }}>Attendance — {attendees.length} of {teamPlayers.length}</span>
              {teamPlayers.length > 0 && (
                <button className="tap" onClick={() => { setAttendees(attendees.length === teamPlayers.length ? [] : teamPlayers.map(p => p.id)); setSetupDraft({}); setSetupPending(null); }}
                  style={{ background: attendees.length === teamPlayers.length ? teamColor : C.surfaceAlt, border: `1px solid ${attendees.length === teamPlayers.length ? teamColor : C.borderMed}`, color: attendees.length === teamPlayers.length ? "#fff" : C.textMuted, padding: "4px 12px", borderRadius: 999, fontFamily: F.h, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  {attendees.length === teamPlayers.length ? "✓ All" : "Select All"}
                </button>
              )}
            </div>
            {teamPlayers.length === 0
              ? <div style={{ ...card(), padding: 20, textAlign: "center", color: C.textMuted, fontSize: 14, marginBottom: 14 }}>Add players to the roster first</div>
              : teamPlayers.map(p => {
                const sel = attendees.includes(p.id);
                const dnpR = dnpReasons[p.id];
                return (
                  <div key={p.id} style={{ marginBottom: 7 }}>
                    <div className="tap"
                      onClick={() => { setAttendees(prev => sel ? prev.filter(x => x !== p.id) : [...prev, p.id]); setSetupDraft(prev => { const n = { ...prev }; delete n[p.id]; return n; }); if (sel) setDnpReasons(prev => { const n = {...prev}; delete n[p.id]; return n; }); }}
                      style={{ display: "flex", alignItems: "center", gap: 12, background: sel ? teamColor + "18" : C.surface, border: `1.5px solid ${sel ? teamColor + "80" : C.border}`, borderRadius: 14, padding: "11px 14px", cursor: "pointer", boxShadow: C.shadowSm }}>
                      <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${sel ? teamColor : C.borderStrong}`, background: sel ? teamColor : "transparent", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, flexShrink: 0, fontWeight: 800 }}>{sel ? "✓" : ""}</div>
                      <Avatar name={p.name} color={teamColor} size={34} />
                      <span style={{ fontSize: 15, fontWeight: 600 }}>{p.name}</span>
                      {sel && setupDraft[p.id] && <Chip color={teamColor} bg={teamColor + "18"} border={teamColor + "55"}>{FORMATIONS[formation]?.slots.find(s => s.id === setupDraft[p.id])?.label || "?"}</Chip>}
                      {!sel && dnpR && <Chip color={C.amber} bg={C.amberBg} border={C.amber + "44"}>{dnpR.replace("DNP - ", "")}</Chip>}
                    </div>
                    {!sel && (
                      <div style={{ display: "flex", gap: 5, paddingLeft: 46, paddingTop: 4 }}>
                        {[["Absent","DNP - Absent","🚫"],["Injury","DNP - Injury","🩹"],["Suspension","DNP - Suspension","⚖️"]].map(([label, val, icon]) => {
                          const active = dnpReasons[p.id] === val;
                          return (
                            <button key={val} className="tap" onClick={e => { e.stopPropagation(); setDnpReasons(prev => { const n = {...prev}; if (active) delete n[p.id]; else n[p.id] = val; return n; }); }}
                              style={{ padding: "3px 8px", background: active ? C.amberBg : "transparent", border: `1px solid ${active ? C.amber + "66" : C.borderMed}`, borderRadius: 999, color: active ? C.amber : C.textMuted, fontFamily: F.h, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>
                              {icon} {label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

            {/* Guests */}
            <div style={{ marginTop: 14, marginBottom: 4 }}>
              <span style={{ ...lbl(), marginBottom: 8 }}>Guest Players — {guests.length}</span>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input value={guestName} onChange={e => setGuestName(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && guestName.trim()) { setGuests(prev => [...prev, { id: uid(), name: guestName.trim() }]); setGuestName(""); }}}
                  placeholder="Guest name…" style={inp({ flex: 1 })} />
                <button className="tap" onClick={() => { if (guestName.trim()) { setGuests(prev => [...prev, { id: uid(), name: guestName.trim() }]); setGuestName(""); }}}
                  style={{ padding: "12px 18px", background: guestName.trim() ? C.purple : C.surfaceAlt, color: "#fff", borderRadius: 12, border: "none", fontFamily: F.h, fontSize: 14, fontWeight: 700, cursor: guestName.trim() ? "pointer" : "default" }}>
                  + Add
                </button>
              </div>
              {guests.map(g => (
                <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 10, background: C.purpleBg, border: `1.5px solid ${C.purpleBorder}`, borderRadius: 14, marginBottom: 7, padding: "11px 14px" }}>
                  <Avatar name={g.name} color={C.purple} size={34} />
                  <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: C.purple }}>{g.name}</span>
                  <Chip color={C.purple} bg="transparent" border={C.purpleBorder}>Guest</Chip>
                  <button className="tap" onClick={() => { setGuests(prev => prev.filter(x => x.id !== g.id)); setSetupDraft(prev => { const n = {...prev}; delete n[g.id]; return n; }); }} style={{ background: "transparent", border: "none", color: C.purple, fontSize: 15, cursor: "pointer", padding: "2px 4px" }}>✕</button>
                </div>
              ))}
            </div>

            {/* ── STARTING LINEUP PITCH ── */}
            {allSetupIds.length > 0 && (
              <div style={{ marginTop: 18, marginBottom: 4 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ ...lbl() }}>Starting Lineup — {placedIds.length} of {slots.length}</span>
                  {placedIds.length > 0 && (
                    <button className="tap" onClick={() => { setSetupDraft({}); setSetupPending(null); }}
                      style={{ background: C.surfaceAlt, border: `1px solid ${C.borderMed}`, color: C.textMuted, padding: "3px 10px", borderRadius: 999, fontFamily: F.m, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>Clear</button>
                  )}
                </div>
                <div style={{ color: C.textMuted, fontSize: 11, marginBottom: 10 }}>
                  {setupPending
                    ? `Tap a position on the pitch for ${allSetupPlayers.find(p => p.id === setupPending)?.name}`
                    : "Drag players from bench below onto the pitch · or tap a player then tap a slot"}
                </div>

                {/* Drag container — wraps pitch + bench */}
                <div
                  style={{ touchAction: dragState ? "none" : "pan-y", userSelect: "none", position: "relative" }}
                  onPointerMove={e => {
                    if (dragState) { e.preventDefault(); setDragState(prev => ({ ...prev, clientX: e.clientX, clientY: e.clientY })); return; }
                    if (pendingDrag) {
                      const dx = e.clientX - pendingDrag.startX, dy = e.clientY - pendingDrag.startY;
                      if (Math.sqrt(dx*dx + dy*dy) > 8) { e.preventDefault(); setDragState({ playerId: pendingDrag.playerId, clientX: e.clientX, clientY: e.clientY }); setPendingDrag(null); }
                    }
                  }}
                  onPointerUp={e => {
                    setPendingDrag(null);
                    if (!dragState) return;
                    const slotId = findNearestSlot(e.clientX, e.clientY);
                    if (slotId) applyDraftDrop(dragState.playerId, slotId);
                    setDragState(null);
                  }}
                  onPointerCancel={() => { setDragState(null); setPendingDrag(null); }}
                >
                  {/* Pitch SVG */}
                  <div style={{ background: `linear-gradient(180deg, ${P.bg1} 0%, ${P.bg2} 100%)`, borderRadius: 16, padding: 4, marginBottom: 12, boxShadow: darkMode ? "0 8px 32px rgba(0,0,0,0.5)" : "0 4px 16px rgba(0,0,0,0.15)", border: `1.5px solid ${P.line}` }}>
                    <svg ref={pitchSvgRef} viewBox="0 0 130 150" style={{ width: "100%", display: "block", borderRadius: 14 }}>
                      {[0,1,2,3,4,5,6].map(i => <rect key={i} x="8" y={5 + i * 20} width="114" height="10" fill={P.stripe} />)}
                      <rect x="8" y="5" width="114" height="140" rx="4" fill="none" stroke={P.line} strokeWidth="0.7" />
                      <line x1="8" y1="75" x2="122" y2="75" stroke={P.line} strokeWidth="0.6" />
                      <circle cx="65" cy="75" r="14" fill="none" stroke={P.line} strokeWidth="0.6" />
                      <circle cx="65" cy="75" r="0.9" fill={P.line} />
                      <rect x="39" y="5" width="70" height="22" rx="1" fill="none" stroke={P.line} strokeWidth="0.6" />
                      <rect x="52" y="5" width="26" height="11" rx="1" fill="none" stroke={P.line} strokeWidth="0.6" />
                      <circle cx="65" cy="20" r="0.8" fill={P.line} />
                      <rect x="52" y="3" width="26" height="3.5" rx="0.5" fill="none" stroke={P.line} strokeWidth="0.6" />
                      <rect x="39" y="123" width="70" height="22" rx="1" fill="none" stroke={P.line} strokeWidth="0.6" />
                      <rect x="52" y="134" width="26" height="11" rx="1" fill="none" stroke={P.line} strokeWidth="0.6" />
                      <circle cx="65" cy="130" r="0.8" fill={P.line} />
                      <rect x="52" y="143.5" width="26" height="3.5" rx="0.5" fill="none" stroke={P.line} strokeWidth="0.6" />
                      <path d="M 11,5 A 3,3 0 0 1 8,8"    fill="none" stroke={P.line} strokeWidth="0.6" />
                      <path d="M 119,5 A 3,3 0 0 0 122,8"   fill="none" stroke={P.line} strokeWidth="0.6" />
                      <path d="M 11,145 A 3,3 0 0 0 8,142"   fill="none" stroke={P.line} strokeWidth="0.6" />
                      <path d="M 119,145 A 3,3 0 0 1 122,142"  fill="none" stroke={P.line} strokeWidth="0.6" />
                      <text x="65" y="10" textAnchor="middle" fontSize="3.5" fill={P.line} fontFamily="sans-serif">▲ Attack</text>
                      <text x="65" y="143" textAnchor="middle" fontSize="3.5" fill={P.line} fontFamily="sans-serif">▼ Defend</text>

                      {/* Slots */}
                      {slots.map(slot => {
                        const occupantId = draftSlotToPlayer[slot.id];
                        const occupant = occupantId ? allSetupPlayers.find(p => p.id === occupantId) : null;
                        const sc = posColor(slot.id);
                        const isOccupantDragging = dragState?.playerId === occupantId;
                        if (occupant && !isOccupantDragging) {
                          return (
                            <g key={slot.id} transform={`translate(${slot.x},${slot.y})`}
                              style={{ cursor: "pointer" }}
                              onPointerDown={e => { e.stopPropagation(); setPendingDrag({ playerId: occupantId, startX: e.clientX, startY: e.clientY }); setSetupPending(null); }}
                              onClick={() => { if (!dragState) { const n = { ...setupDraft }; delete n[occupantId]; setSetupDraft(n); setSetupPending(null); } }}>
                              <circle r="9" fill={teamColor + "22"} />
                              <circle r="7.5" fill={teamColor + "33"} />
                              <circle r="6.5" fill="#000000" />
                              <text textAnchor="middle" dy="0.38em" fontSize="3.5" fontFamily="Inter, sans-serif" fontWeight="800" fill="#ffffff">{initials(occupant.name)}</text>
                              <rect x="-5.2" y="9" width="10.4" height="5" rx="2.5" fill={sc} />
                              <text textAnchor="middle" y="12.5" fontSize="2.9" fontFamily="JetBrains Mono, monospace" fontWeight="800" fill="#000000">{slot.label}</text>
                            </g>
                          );
                        } else {
                          // Empty slot (or slot whose occupant is being dragged)
                          const isTarget = hasPending;
                          return (
                            <g key={slot.id} transform={`translate(${slot.x},${slot.y})`}
                              style={{ cursor: setupPending ? "pointer" : "default", opacity: isTarget ? 1 : 0.7 }}
                              onClick={() => { if (setupPending) applyDraftDrop(setupPending, slot.id); }}>
                              <circle r="7" fill={isTarget ? sc + "22" : "rgba(0,0,0,0.5)"}
                                stroke={isTarget ? sc : "rgba(255,255,255,0.55)"}
                                strokeWidth={isTarget ? "1.5" : "1.0"}
                                strokeDasharray={isTarget ? "none" : "2.5,1.5"} />
                              <text textAnchor="middle" dy="0.38em" fontSize="3.2" fontFamily="JetBrains Mono, monospace" fontWeight="700" fill={isTarget ? sc : "rgba(255,255,255,0.8)"}>{slot.label}</text>
                            </g>
                          );
                        }
                      })}
                    </svg>
                  </div>

                  {/* Bench strip — unplaced players */}
                  {unplacedIds.length > 0 && (
                    <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 6, paddingTop: 2 }}>
                      {unplacedIds.map(id => {
                        const p = allSetupPlayers.find(pl => pl.id === id); if (!p) return null;
                        const isPendingThis = setupPending === id;
                        const isDragging = dragState?.playerId === id;
                        return (
                          <div key={id}
                            style={{ flexShrink: 0, textAlign: "center", cursor: "grab", opacity: isDragging ? 0.35 : 1, transition: "opacity 0.1s" }}
                            onPointerDown={e => { setPendingDrag({ playerId: id, startX: e.clientX, startY: e.clientY }); setSetupPending(null); }}
                            onClick={() => { if (!dragState) setSetupPending(isPendingThis ? null : id); }}>
                            <div style={{ width: 48, height: 48, borderRadius: "50%", background: isPendingThis ? teamColor : teamColor + "22", border: `2.5px solid ${isPendingThis ? teamColor : teamColor + "55"}`, display: "flex", alignItems: "center", justifyContent: "center", color: isPendingThis ? "#fff" : teamColor, fontFamily: F.h, fontWeight: 700, fontSize: 15, margin: "0 auto", boxShadow: isPendingThis ? `0 0 0 3px ${teamColor}44` : "none" }}>
                              {initials(p.name)}
                            </div>
                            <div style={{ fontSize: 10, fontWeight: 600, marginTop: 4, color: isPendingThis ? teamColor : C.textSub, maxWidth: 52, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name.split(" ")[0]}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {unplacedIds.length === 0 && allSetupIds.length > 0 && (
                    <div style={{ textAlign: "center", color: C.green, fontFamily: F.m, fontSize: 11, fontWeight: 700, padding: "8px 0" }}>✓ All players placed</div>
                  )}

                  {/* Drag ghost */}
                  {dragState && (() => {
                    const dp = allSetupPlayers.find(p => p.id === dragState.playerId);
                    return (
                      <div style={{ position: "fixed", left: dragState.clientX - 24, top: dragState.clientY - 24, width: 48, height: 48, borderRadius: "50%", background: teamColor, border: "3px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 15, zIndex: 9999, pointerEvents: "none", boxShadow: "0 6px 24px rgba(0,0,0,0.5)", fontFamily: F.h }}>
                        {initials(dp?.name || "?")}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            <button className="tap" onClick={startGame} disabled={!attendees.length && !guests.length}
              style={{ width: "100%", marginTop: 18, padding: 16, background: (attendees.length || guests.length) ? teamColor : C.surfaceAlt, color: (attendees.length || guests.length) ? "#fff" : C.textMuted, border: "none", borderRadius: 16, fontFamily: F.h, fontSize: 17, fontWeight: 800, cursor: (attendees.length || guests.length) ? "pointer" : "default" }}>
              {placedIds.length > 0 ? `▶ Start · Lineup Set (${placedIds.length}/${slots.length})` : `▶ Start · ${attendees.length + guests.length} Players`}
            </button>
          </div>
          );
        })()}

        {/* ════ GAME (no active) ════ */}
        {page === "game" && activeTeam && !liveForTeam && (
          <div style={{ textAlign: "center", padding: "64px 20px" }}>
            <div style={{ color: C.textMuted, fontSize: 14, marginBottom: 20 }}>No active game for {activeTeam.name}</div>
            <button className="tap" onClick={() => setPage("newgame")} style={{ padding: "14px 32px", background: teamColor, color: "#fff", border: "none", borderRadius: 999, fontFamily: F.h, fontSize: 16, fontWeight: 700, cursor: "pointer" }}>Start a Game</button>
          </div>
        )}

        {/* ════ GAME (TACTICAL BOARD) ════ */}
        {page === "game" && activeTeam && liveForTeam && (() => {
          const gt = gtInfo(cg.gameType);
          const slots = FORMATIONS[boardFormation]?.slots || [];

          // Bench: in attendance but not on field
          // Sort bench by ascending game minutes — lowest playtime floats to top
          const benchPlayerIds = cg.attendees
            .filter(id => !fieldIds.includes(id))
            .sort((a, b) => getPlayerMs(a) - getPlayerMs(b));

          // Unified: tap any player → select; tap again to resolve
          const isLocked = !!cg.positionsLocked;
          // Unified tap: bench→field always queues; field→field swaps (if unlocked)
          const handleAnyPlayerTap = (tappedId) => {
            const tappedOnField  = fieldIds.includes(tappedId);
            const alreadyQueued  = subQueue.some(s => s.benchId === tappedId || s.fieldId === tappedId);

            // ── If a bench player is pending (subPending) ──
            if (subPending) {
              if (subPending === tappedId) { setSubPending(null); return; } // deselect
              if (alreadyQueued) return;
              if (tappedOnField) {
                // Queue the sub pair
                const fieldSlot   = cg.playerPositions?.[tappedId];
                const slotInfo    = fieldSlot ? FORMATIONS[boardFormation].slots.find(s => s.id === fieldSlot) : null;
                const benchPlayer = teamPlayers.find(p => p.id === subPending);
                const fieldPlayer = teamPlayers.find(p => p.id === tappedId);
                setSubQueue(q => [...q, {
                  benchId: subPending, fieldId: tappedId,
                  slotId: fieldSlot, slotLabel: slotInfo?.label || fieldSlot,
                  benchName: benchPlayer?.name || "?", fieldName: fieldPlayer?.name || "?",
                }]);
                setSubPending(null);
              } else {
                setSubPending(tappedId); // switch to different bench player
              }
              return;
            }

            // ── If a field player is pending (pendingPlayer) ──
            if (pendingPlayer) {
              if (pendingPlayer === tappedId) { setPendingPlayer(null); return; }
              const pendingOnField = fieldIds.includes(pendingPlayer);
              if (pendingOnField && tappedOnField) {
                swapPositions(pendingPlayer, tappedId);
                setPendingPlayer(null);
              } else if (pendingOnField && !tappedOnField) {
                // Field player pending, tapped bench player — switch to queuing a sub
                if (!alreadyQueued) setSubPending(tappedId);
                setPendingPlayer(null);
              } else {
                setPendingPlayer(tappedId);
              }
              return;
            }

            // ── Nothing pending ──
            if (alreadyQueued) return;
            if (!tappedOnField) {
              setSubPending(tappedId); // bench player → start sub queue
            } else {
              setPendingPlayer(tappedId); // field player → select for swap/move/pull
            }
          };

          const handleSlotTap = (slotId) => {
            const slotOccupied = !!slotToPlayer[slotId];
            if (subPending) {
              // Bench player selected — if slot is empty, place them directly; if occupied, ignore (must tap the player)
              if (!slotOccupied) { placePlayer(subPending, slotId); setSubPending(null); }
              return;
            }
            if (!pendingPlayer) return;
            if (slotToPlayer[slotId] === pendingPlayer) { setPendingPlayer(null); return; }
            if (slotOccupied) return;
            if (fieldIds.includes(pendingPlayer)) {
              if (!isLocked) movePosition(pendingPlayer, slotId);
            } else {
              placePlayer(pendingPlayer, slotId);
            }
          };

          // Period info for compact bar
          const periodName = cg.periodLengthMs > 0
            ? (cg.numPeriods === 4
                ? ["Q1","Q2","Q3","Q4"][cg.currentPeriod - 1] || "OT"
                : ["1st","2nd"][cg.currentPeriod - 1] || "OT")
            : null;
          const periodEnd = cg.periodLengthMs > 0 ? cg.currentPeriod * cg.periodLengthMs : 0;
          const periodRemaining = periodEnd > 0 ? Math.max(0, periodEnd - gameClock) : 0;
          const periodPct = periodEnd > 0 ? Math.min(100, (gameClock - (cg.currentPeriod - 1) * cg.periodLengthMs) / cg.periodLengthMs * 100) : 0;
          const clockLabel = cg.clockRunning ? "⏸ Pause"
            : cg.periodEndedAt != null
              ? cg.currentPeriod >= cg.numPeriods ? "▶ OT" : `▶ ${cg.numPeriods === 4 ? ["Q2","Q3","Q4"][cg.currentPeriod-1] : "2nd Half"}`
              : "▶ Start";

          return (
            <div className="slide">
              {/* ── COMPACT GAME BAR ── single row: opponent · period · clock · controls */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "10px 14px" }}>
                {/* Left: opponent + period */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>vs {cg.opponent}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                    {periodName && <span style={{ fontFamily: F.m, fontSize: 11, fontWeight: 700, color: C.amber }}>{periodName}</span>}
                    {periodName && periodRemaining > 0 && cg.clockRunning && <span style={{ fontFamily: F.m, fontSize: 11, color: C.textMuted }}>{fmtClock(periodRemaining)}</span>}
                    <button className="tap" onClick={() => setFormationExpanded(e => !e)}
                      style={{ background: "transparent", border: "none", fontFamily: F.m, fontSize: 11, fontWeight: 700, color: C.textMuted, cursor: "pointer", padding: 0 }}>
                      {boardFormation} {formationExpanded ? "▲" : "▼"}
                    </button>
                  </div>
                  {/* Period progress bar */}
                  {periodName && <div style={{ width: "100%", height: 2, background: C.surfaceAlt, borderRadius: 999, overflow: "hidden", marginTop: 4 }}><div style={{ width: `${periodPct}%`, height: "100%", background: C.amber, borderRadius: 999, transition: "width 0.5s linear" }} /></div>}
                </div>
                {/* Center: clock */}
                <div style={{ fontFamily: F.m, fontSize: 32, fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1,
                  color: cg.clockRunning ? C.amber : C.text,
                  textShadow: cg.clockRunning ? `0 0 16px ${C.amber}66` : "none", flexShrink: 0 }}>
                  {fmtClock(gameClock)}
                </div>
                {/* Right: Start/Pause + lock */}
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button className="tap" onClick={toggleLock}
                    style={{ padding: "8px 10px", background: cg.positionsLocked ? C.amberBg : C.surfaceAlt, border: `1.5px solid ${cg.positionsLocked ? C.amber : C.borderMed}`, color: cg.positionsLocked ? C.amber : C.textMuted, borderRadius: 10, fontSize: 15, cursor: "pointer" }}>
                    {cg.positionsLocked ? "🔒" : "🔓"}
                  </button>
                  <button className="tap" onClick={toggleClock}
                    style={{ padding: "8px 16px", background: cg.clockRunning ? C.redBg : C.green + "22", border: `2px solid ${cg.clockRunning ? C.red : C.green}`, color: cg.clockRunning ? C.red : C.green, borderRadius: 10, fontFamily: F.h, fontSize: 14, fontWeight: 900, cursor: "pointer", whiteSpace: "nowrap" }}>
                    {clockLabel}
                  </button>
                </div>
              </div>
              {/* Formation picker — slides open under the bar */}
              {formationExpanded && (
                <div style={{ display: "flex", gap: 5, marginBottom: 8, overflowX: "auto", paddingBottom: 2 }}>
                  {Object.keys(FORMATIONS).map(key => {
                    const sel = boardFormation === key;
                    return (
                      <button key={key} className="tap" onClick={() => { setBoardFormation(key); setPendingPlayer(null); setFormationExpanded(false); }}
                        style={{ padding: "5px 12px", background: sel ? teamColor : C.surfaceAlt, border: `1px solid ${sel ? teamColor : C.borderMed}`, borderRadius: 999, color: sel ? "#fff" : C.textMuted, fontFamily: F.m, fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
                        {key}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* ── PERIOD ENDED BANNER ── */}
              {cg.periodEndedAt !== null && cg.periodEndedAt !== undefined && !cg.clockRunning && (() => {
                const isLastPeriod = cg.currentPeriod >= cg.numPeriods;
                const nextName = cg.numPeriods === 4
                  ? ["2nd Qtr","3rd Qtr","4th Qtr","OT"][cg.currentPeriod - 1] || "OT"
                  : cg.currentPeriod === 1 ? "2nd Half" : "OT";
                const curName = cg.numPeriods === 4
                  ? ["1st Qtr","2nd Qtr","3rd Qtr","4th Qtr"][cg.currentPeriod - 1] || "Period"
                  : cg.currentPeriod === 1 ? "1st Half" : "2nd Half";
                return (
                  <div style={{ background: C.amberBg, border: `2px solid ${C.amber}`, borderRadius: 14, padding: "10px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: C.amber }}>{curName} Over</div>
                      <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                        {isLastPeriod ? "Game time complete" : `Make subs, then start ${nextName}`}
                      </div>
                    </div>
                    <button className="tap" onClick={toggleClock}
                      style={{ padding: "10px 18px", background: C.amber, color: "#000", border: "none", borderRadius: 10, fontFamily: F.h, fontSize: 14, fontWeight: 800, cursor: "pointer", flexShrink: 0 }}>
                      {isLastPeriod ? "▶ OT" : `▶ ${nextName}`}
                    </button>
                  </div>
                );
              })()}

              {/* Sub queue — appears automatically as soon as a bench player is selected */}
              {(subPending || subQueue.length > 0) && (
                <div style={{ background: teamColor + "14", border: `2px solid ${teamColor}55`, borderRadius: 16, padding: "12px 14px", marginBottom: 10 }}>
                  {subPending && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: subQueue.length > 0 ? 10 : 0 }}>
                      <div>
                        <span style={{ fontSize: 16, fontWeight: 800, color: teamColor }}>↑ {teamPlayers.find(p => p.id === subPending)?.name}</span>
                        <div style={{ fontSize: 13, color: C.textMuted, marginTop: 2 }}>Tap the player they're replacing</div>
                      </div>
                      <button className="tap" onClick={() => setSubPending(null)}
                        style={{ background: C.surfaceAlt, border: `1.5px solid ${C.borderMed}`, color: C.textSub, fontSize: 18, width: 36, height: 36, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginLeft: 10 }}>✕</button>
                    </div>
                  )}
                  {subQueue.length > 0 && (
                    <>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                        {subQueue.map((s, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, background: darkMode ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.6)", borderRadius: 10, padding: "8px 10px" }}>
                            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                              <span style={{ fontFamily: F.h, fontSize: 14, fontWeight: 800, color: C.green }}>↑ {s.benchName}</span>
                              <span style={{ color: C.textMuted, fontSize: 13 }}>for</span>
                              <span style={{ fontFamily: F.h, fontSize: 14, fontWeight: 800, color: C.red }}>↓ {s.fieldName}</span>
                              <span style={{ fontFamily: F.m, fontSize: 10, fontWeight: 800, color: posColor(s.slotId), background: posColor(s.slotId) + "22", border: `1px solid ${posColor(s.slotId)}44`, borderRadius: 999, padding: "2px 7px" }}>{s.slotLabel}</span>
                            </div>
                            <button className="tap" onClick={() => setSubQueue(q => q.filter((_, j) => j !== i))}
                              style={{ background: C.redBg, border: `1px solid ${C.redBorder}`, color: C.red, fontSize: 14, width: 30, height: 30, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>✕</button>
                          </div>
                        ))}
                      </div>
                      <button className="tap" onClick={() => applyBatchSubs(subQueue)}
                        style={{ width: "100%", padding: "14px", background: teamColor, color: "#fff", border: "none", borderRadius: 12, fontFamily: F.h, fontSize: 17, fontWeight: 900, cursor: "pointer", letterSpacing: "-0.01em" }}>
                        ⇄ Apply {subQueue.length} Sub{subQueue.length !== 1 ? "s" : ""}
                      </button>
                    </>
                  )}
                </div>
              )}
              {pendingPlayer ? (() => {
                const selPlayer = teamPlayers.find(p => p.id === pendingPlayer);
                const selOnField = fieldIds.includes(pendingPlayer);
                const selSlot = selOnField ? (FORMATIONS[boardFormation].slots.find(s => s.id === cg.playerPositions?.[pendingPlayer])?.label || "?") : null;
                return (
                  <div style={{ background: teamColor + (darkMode ? "18" : "12"), border: `1.5px solid ${teamColor}55`, borderRadius: 12, padding: "9px 14px", marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: teamColor }}>
                        {selOnField ? `⇄ ${selPlayer?.name} (${selSlot})` : `↑ ${selPlayer?.name}`}
                      </div>
                      <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                        {selOnField
                          ? isLocked ? "Tap another field player to swap · tap bench player to sub in" : "Tap an empty slot to move · tap another player to swap"
                          : "Tap an empty slot to place · tap a field player to sub in"}
                      </div>
                    </div>
                    <button className="tap" onClick={() => setPendingPlayer(null)} style={{ background: "transparent", border: "none", color: C.textMuted, fontSize: 18, cursor: "pointer", lineHeight: 1, flexShrink: 0 }}>✕</button>
                  </div>
                );
              })() : null}

              {/* ⚽ PITCH — SVG height-constrained so aspect ratio is preserved and bench stays visible */}
              <div style={{ background: `linear-gradient(180deg, ${C.pitch.bg1} 0%, ${C.pitch.bg2} 100%)`, borderRadius: 16, padding: 4, marginBottom: 8, boxShadow: darkMode ? "0 8px 32px rgba(0,0,0,0.5)" : "0 4px 16px rgba(0,0,0,0.15)", border: `1.5px solid ${C.pitch.line}` }}>
                <SoccerPitch
                  formation={boardFormation}
                  slotToPlayer={slotToPlayer}
                  onSlotTap={handleSlotTap}
                  onPlayerTap={handleAnyPlayerTap}
                  pendingId={pendingPlayer || subPending}
                  getPlayerMs={getPlayerMs}
                  gameClock={gameClock}
                  teamColor={teamColor}
                  players={teamPlayers}
                  queuedOff={subQueue.map(s => s.fieldId)}
                  onCancel={() => { setPendingPlayer(null); setSubPending(null); }}
                />
              </div>


              {/* Pull-off strip — shown when a field player is selected */}
              {pendingPlayer && fieldIds.includes(pendingPlayer) && (() => {
                const sel = teamPlayers.find(p => p.id === pendingPlayer);
                const slotId = cg.playerPositions?.[pendingPlayer];
                const slotLabel = slotId ? (FORMATIONS[boardFormation].slots.find(s => s.id === slotId)?.label || slotId) : "?";
                return (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, background: teamColor + "12", border: `2px solid ${teamColor}44`, borderRadius: 14, padding: "12px 14px", marginBottom: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: teamColor }}>{sel?.name}</div>
                      <div style={{ fontSize: 13, color: C.textMuted, marginTop: 2 }}>{slotLabel} · tap another field player to swap · tap bench player to sub</div>
                    </div>
                    <button className="tap" onClick={() => { removeFromField(pendingPlayer); setPendingPlayer(null); }}
                      style={{ background: C.redBg, border: `1.5px solid ${C.redBorder}`, color: C.red, borderRadius: 10, padding: "9px 16px", fontFamily: F.h, fontSize: 14, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                      Pull off
                    </button>
                    <button className="tap" onClick={() => setPendingPlayer(null)}
                      style={{ background: C.surfaceAlt, border: `1.5px solid ${C.borderMed}`, color: C.textSub, width: 36, height: 36, borderRadius: "50%", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>✕</button>
                  </div>
                );
              })()}

              {/* Bench */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 15, fontWeight: 800 }}>🪑 Bench — {benchPlayerIds.length}</span>
                  <span style={{ fontFamily: F.m, fontSize: 10, color: C.textMuted }}>lowest minutes first</span>
                </div>
                {benchPlayerIds.length === 0
                  ? <div style={{ ...card({ boxShadow: "none" }), padding: 14, textAlign: "center", color: C.textMuted, fontSize: 13 }}>Everyone is on the pitch</div>
                  : benchPlayerIds.map(id => {
                    const player = teamPlayers.find(p => p.id === id); if (!player) return null;
                    const ms          = getPlayerMs(id);
                    const ss          = getSeasonMs(id, teamGames);
                    const sPct        = ss.avail > 0 ? Math.round(((ss.played + ms) / ss.avail) * 100) : null;
                    const livePos     = getLivePositionSummary(id);
                    const gGamePct    = gameClock > 0 ? Math.round((ms / gameClock) * 100) : 0;
                    const isPending   = pendingPlayer === id;
                    const isSubPend   = subPending === id;
                    const isQueuedOn  = subQueue.some(s => s.benchId === id);
                    const queuedOffName = subQueue.find(s => s.benchId === id)?.fieldName;
                    const subHighlight = isSubPend || isQueuedOn;
                    return (
                      <div key={id} className="tap" onClick={() => handleAnyPlayerTap(id)}
                        style={{ ...card({ border: `2px solid ${isQueuedOn ? C.green : isSubPend ? teamColor : isPending ? teamColor : C.border}`, boxShadow: subHighlight ? `0 0 0 3px ${C.green}33` : isPending ? `0 0 0 3px ${teamColor}33` : C.shadow, opacity: isQueuedOn ? 0.65 : 1 }), marginBottom: 6, padding: "10px 14px", cursor: "pointer" }}>
                        {isQueuedOn && (
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>
                            <span style={{ fontFamily: F.h, fontSize: 12, fontWeight: 800, color: C.green }}>↑ Coming on</span>
                            <span style={{ fontSize: 12, color: C.textMuted }}>for</span>
                            <span style={{ fontFamily: F.h, fontSize: 12, fontWeight: 800, color: C.red }}>↓ {queuedOffName}</span>
                          </div>
                        )}
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <Avatar name={player.name} color={isQueuedOn ? C.green : isSubPend ? teamColor : isPending ? teamColor : C.textMuted} size={42} />
                          <div style={{ flex: 1 }}>
                            {/* Name and time — equal weight on one line */}
                            <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                              <span style={{ fontSize: 16, fontWeight: 700, color: isSubPend ? teamColor : isPending ? teamColor : C.text }}>{player.name}</span>
                              <span style={{ fontFamily: F.m, fontSize: 16, fontWeight: 800, color: timeColor(gGamePct, C) }}>{ms > 0 ? fmtClock(ms) : "0:00"}</span>
                            </div>
                            {/* Secondary: season % smaller below */}
                            {sPct !== null && <div style={{ marginTop: 2 }}><span style={{ fontFamily: F.m, fontSize: 11, fontWeight: 600, color: timeColor(sPct, C) }}>Season {sPct}%</span></div>}
                          </div>
                          {(isSubPend || isPending) && (
                            <button className="tap" onClick={e => { e.stopPropagation(); setSubPending(null); setPendingPlayer(null); }}
                              style={{ background: C.surfaceAlt, border: `1.5px solid ${C.borderMed}`, color: C.textSub, width: 36, height: 36, borderRadius: "50%", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>✕</button>
                          )}
                        </div>
                        {livePos.length > 0 && (
                          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
                            {livePos.map(pe => (
                              <div key={pe.slotId} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: posColor(pe.slotId) + "18", border: `1px solid ${posColor(pe.slotId)}44`, borderRadius: 999, padding: "2px 8px" }}>
                                <div style={{ width: 6, height: 6, borderRadius: "50%", background: posColor(pe.slotId), flexShrink: 0 }} />
                                <span style={{ fontFamily: F.m, fontSize: 9, fontWeight: 800, color: posColor(pe.slotId) }}>{pe.label}</span>
                                <span style={{ fontFamily: F.m, fontSize: 9, color: posColor(pe.slotId), opacity: 0.8 }}>{fmtClock(pe.durationMs)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>

              {/* Late arrivals */}
              {notInGame.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <span style={{ ...lbl(), marginBottom: 8 }}>➕ Late Arrival</span>
                  {notInGame.map(p => (
                    <div key={p.id} className="tap" onClick={() => addLatePlayer(p.id)}
                      style={{ ...card({ border: `1.5px dashed ${C.borderMed}`, boxShadow: "none" }), display: "flex", alignItems: "center", gap: 12, marginBottom: 6, padding: "10px 14px", cursor: "pointer", opacity: 0.8 }}>
                      <Avatar name={p.name} color={C.textMuted} size={34} />
                      <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: C.textMuted }}>{p.name}</span>
                      <Chip>+ Add</Chip>
                    </div>
                  ))}
                </div>
              )}

              {/* End / Discard — compact, at bottom */}
              {!confirmEnd && !confirmDiscardGame && (
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <button className="tap" onClick={() => setConfirmDiscardGame(true)}
                    style={{ padding: "10px 16px", background: C.surfaceAlt, color: C.textMuted, border: `1px solid ${C.borderMed}`, borderRadius: 12, fontFamily: F.h, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>🗑 Discard</button>
                  <button className="tap" onClick={() => setConfirmEnd(true)}
                    style={{ flex: 1, padding: "10px 16px", background: C.redBg, color: C.red, border: `2px solid ${C.redBorder}`, borderRadius: 12, fontFamily: F.h, fontSize: 15, fontWeight: 800, cursor: "pointer" }}>■ End Game</button>
                </div>
              )}
              {/* Score entry shown directly — no intermediate confirm step */}
              {confirmDiscardGame && (
                <div style={{ ...card({ border: `1.5px solid ${C.redBorder}` }), padding: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.red, marginBottom: 12, textAlign: "center" }}>Discard this game? No data will be saved.</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="tap" onClick={() => setConfirmDiscardGame(false)} style={{ flex: 1, padding: 12, background: C.surfaceAlt, border: `1px solid ${C.borderMed}`, color: C.textSub, borderRadius: 12, fontFamily: F.h, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                    <button className="tap" onClick={discardGame} style={{ flex: 1, padding: 12, background: C.red, border: "none", color: "#fff", borderRadius: 12, fontFamily: F.h, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Discard</button>
                  </div>
                </div>
              )}
              {confirmEnd && (
                <div style={{ ...card({ border: `1.5px solid ${C.redBorder}` }), padding: 16 }}>
                  <div style={{ fontFamily: F.m, fontSize: 10, fontWeight: 700, color: C.red, marginBottom: 14, textAlign: "center", letterSpacing: "0.08em" }}>FINAL SCORE (OPTIONAL)</div>
                  <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14 }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ ...lbl(), marginBottom: 6 }}>Your score</span>
                      <input value={scoreUs} onChange={e => setScoreUs(e.target.value)} placeholder="0" type="number" style={inp({ textAlign: "center", fontSize: 32, fontWeight: 800, padding: "10px", color: teamColor, border: `2px solid ${teamColor}60`, fontFamily: F.m })} />
                    </div>
                    <div style={{ paddingTop: 24, color: C.textMuted, fontSize: 20, fontWeight: 300, flexShrink: 0 }}>—</div>
                    <div style={{ flex: 1 }}>
                      <span style={{ ...lbl(), marginBottom: 6 }}>Their score</span>
                      <input value={scoreThem} onChange={e => setScoreThem(e.target.value)} placeholder="0" type="number" style={inp({ textAlign: "center", fontSize: 32, fontWeight: 800, padding: "10px", color: C.red, border: `2px solid ${C.redBorder}`, fontFamily: F.m })} />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="tap" onClick={() => setConfirmEnd(false)} style={{ flex: 1, padding: 13, background: C.surfaceAlt, border: `1px solid ${C.borderMed}`, color: C.textSub, borderRadius: 12, fontFamily: F.h, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                    <button className="tap" onClick={endGame} style={{ flex: 2, padding: 13, background: C.red, border: "none", color: "#fff", borderRadius: 12, fontFamily: F.h, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>■ Save & End</button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ════ STATS ════ */}
        {page === "stats" && activeTeam && (
          <div className="slide">
            {gameDetail ? (
              <>
                <button className="tap" onClick={() => { setSelectedGame(null); setConfirmDeleteGame(null); setEditingScore(null); }}
                  style={{ background: "transparent", border: "none", color: teamColor, fontFamily: F.h, fontSize: 14, fontWeight: 600, cursor: "pointer", padding: "2px 0", marginBottom: 14 }}>← Back</button>

                <div style={{ ...card({ border: `1.5px solid ${gtInfo(gameDetail.gameType).border}` }), padding: "16px", marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>vs {gameDetail.opponent}</div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <Chip color={gtInfo(gameDetail.gameType).color} bg={gtInfo(gameDetail.gameType).bg} border={gtInfo(gameDetail.gameType).border}>{gtInfo(gameDetail.gameType).icon} {gtInfo(gameDetail.gameType).label} · {gameDetail.date}</Chip>
                        {gameDetail.formation && <Chip>⚽ {gameDetail.formation}</Chip>}
                      </div>
                    </div>
                    {(gameDetail.scoreUs !== "" || gameDetail.scoreThem !== "") && (
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <div style={{ fontSize: 26, fontWeight: 900, fontFamily: F.m }}>
                          <span style={{ color: teamColor }}>{gameDetail.scoreUs || "?"}</span>
                          <span style={{ color: C.textMuted, fontSize: 20, fontWeight: 300, margin: "0 4px" }}>–</span>
                          <span style={{ color: C.red }}>{gameDetail.scoreThem || "?"}</span>
                        </div>
                        <ResultBadge r={gameResult(gameDetail)} />
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                    <div style={{ display: "flex", gap: 20 }}>
                      <div><span style={{ ...lbl(), marginBottom: 3 }}>Clock</span><div style={{ fontFamily: F.m, fontSize: 14, fontWeight: 700, color: C.textSub }}>{fmtClock(gameDetail.totalGameMs)}</div></div>
                      <div><span style={{ ...lbl(), marginBottom: 3 }}>Players</span><div style={{ fontFamily: F.m, fontSize: 14, fontWeight: 700, color: C.textSub }}>{gameDetail.attendees.length}</div></div>
                    </div>
                    {editingScore !== gameDetail.id && (
                      <button className="tap" onClick={() => { setEditScoreUs(gameDetail.scoreUs || ""); setEditScoreThem(gameDetail.scoreThem || ""); setEditingScore(gameDetail.id); }}
                        style={{ background: C.surfaceAlt, border: `1px solid ${C.borderMed}`, color: C.textMuted, padding: "6px 14px", borderRadius: 999, fontFamily: F.h, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                        ✏ Edit Score
                      </button>
                    )}
                  </div>
                  {editingScore === gameDetail.id && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                        <input value={editScoreUs} onChange={e => setEditScoreUs(e.target.value)} placeholder="Us" type="number" style={inp({ flex: 1, textAlign: "center", fontSize: 22, fontWeight: 800, padding: "8px", color: teamColor, border: `2px solid ${teamColor}60`, fontFamily: F.m })} />
                        <span style={{ color: C.textMuted, fontSize: 18 }}>—</span>
                        <input value={editScoreThem} onChange={e => setEditScoreThem(e.target.value)} placeholder="Them" type="number" style={inp({ flex: 1, textAlign: "center", fontSize: 22, fontWeight: 800, padding: "8px", color: C.red, border: `2px solid ${C.redBorder}`, fontFamily: F.m })} />
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button className="tap" onClick={() => setEditingScore(null)} style={{ flex: 1, padding: 10, background: C.surfaceAlt, border: `1px solid ${C.borderMed}`, color: C.textSub, borderRadius: 10, fontFamily: F.h, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                        <button className="tap" onClick={() => saveEditedScore(gameDetail.id)} style={{ flex: 2, padding: 10, background: teamColor, border: "none", color: "#fff", borderRadius: 10, fontFamily: F.h, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Save Score</button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Player splits + position history */}
                <span style={{ ...lbl(), marginBottom: 10 }}>Player Time Splits</span>
                {gameDetail.attendees
                  .map(id => { const p = teamPlayers.find(x => x.id === id); const ms = gameDetail.minutesMs[id] || 0; const gPct = gameDetail.totalGameMs > 0 ? Math.round((ms / gameDetail.totalGameMs) * 100) : 0; return { p, ms, gPct }; })
                  .filter(({ p }) => p).sort((a, b) => b.ms - a.ms)
                  .map(({ p, ms, gPct }) => {
                    const posSummary = gameDetail.positionSummary?.[p.id];
                    const posEntries = posSummary ? Object.values(posSummary).sort((a, b) => b.durationMs - a.durationMs) : [];
                    return (
                      <div key={p.id} style={{ ...card(), marginBottom: 8, padding: "12px 14px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <Avatar name={p.name} color={timeColor(gPct, C)} size={36} />
                            <div>
                              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{p.name}</div>
                              {/* Position chips */}
                              {posEntries.length > 0 && (
                                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                                  {posEntries.map(pe => (
                                    <div key={pe.slotId} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: posColor(pe.slotId) + "22", border: `1px solid ${posColor(pe.slotId)}55`, borderRadius: 999, padding: "2px 7px" }}>
                                      <span style={{ fontFamily: F.m, fontSize: 9, fontWeight: 800, color: posColor(pe.slotId) }}>{pe.label}</span>
                                      <span style={{ fontFamily: F.m, fontSize: 9, color: posColor(pe.slotId), opacity: 0.75 }}>{fmtMins(pe.durationMs)}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontFamily: F.m, fontSize: 16, fontWeight: 700, color: timeColor(gPct, C) }}>{fmtClock(ms)}</span>
                            <Chip color={timeColor(gPct, C)} bg={timeBg(gPct, C)} border={timeBorder(gPct, C)}>{gPct}%</Chip>
                          </div>
                        </div>
                        <div style={{ background: C.surfaceAlt, borderRadius: 999, height: 10, overflow: "hidden", position: "relative" }}>
                          {gPct > 0 && <div style={{ width: `${Math.min(gPct, 100)}%`, height: "100%", background: timeColor(gPct, C), borderRadius: 999 }} />}
                          <div style={{ position: "absolute", left: "50%", top: 0, width: "1.5px", height: "100%", background: C.borderStrong, opacity: 0.4 }} />
                        </div>
                      </div>
                    );
                  })}

                <div style={{ marginTop: 12 }}>
                  {confirmDeleteGame === gameDetail.id
                    ? <div style={{ ...card({ border: `1.5px solid ${C.redBorder}` }), padding: 14 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.red, textAlign: "center", marginBottom: 12 }}>Delete this game? Cannot be undone.</div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button className="tap" onClick={() => setConfirmDeleteGame(null)} style={{ flex: 1, padding: 11, background: C.surfaceAlt, border: `1px solid ${C.borderMed}`, color: C.textSub, borderRadius: 10, fontFamily: F.h, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                          <button className="tap" onClick={() => deleteGame(gameDetail.id)} style={{ flex: 1, padding: 11, background: C.red, border: "none", color: "#fff", borderRadius: 10, fontFamily: F.h, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Delete</button>
                        </div>
                      </div>
                    : <button className="tap" onClick={() => setConfirmDeleteGame(gameDetail.id)} style={{ width: "100%", padding: 12, background: C.redBg, color: C.red, border: `1px solid ${C.redBorder}`, borderRadius: 12, fontFamily: F.h, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>🗑 Delete Game</button>}
                </div>
              </>
            ) : (
              <>
                <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
                  <div style={{ flex: 1, display: "flex", background: C.surfaceAlt, padding: 4, borderRadius: 14, border: `1px solid ${C.border}` }}>
                    {[["players", "By Player"], ["games", "By Game"]].map(([key, tabLbl]) => (
                      <button key={key} className="tap" onClick={() => setStatsView(key)}
                        style={{ flex: 1, padding: "9px", background: statsView === key ? (darkMode ? C.surfaceHigh : "#fff") : "transparent", color: statsView === key ? C.text : C.textMuted, border: `1px solid ${statsView === key ? C.borderMed : "transparent"}`, borderRadius: 11, fontFamily: F.h, fontSize: 14, fontWeight: statsView === key ? 700 : 500, cursor: "pointer", boxShadow: statsView === key ? C.shadowSm : "none" }}>
                        {tabLbl}
                      </button>
                    ))}
                  </div>
                  {teamGames.length > 0 && (
                    <button className="tap" onClick={() => setShowExport(e => !e)}
                      style={{ padding: "10px 14px", background: showExport ? teamColor : C.surfaceAlt, border: `1.5px solid ${showExport ? teamColor : C.borderMed}`, borderRadius: 12, color: showExport ? "#fff" : C.textSub, fontFamily: F.h, fontSize: 13, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                      ⬇ Export
                    </button>
                  )}
                </div>
                {/* Export sheet */}
                {showExport && teamGames.length > 0 && (
                  <div style={{ ...card({ border: `1.5px solid ${teamColor}44` }), padding: 16, marginBottom: 14 }}>
                    {/* ── Google Sheets Push ── */}
                    <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: `1px solid ${C.border}` }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Push to Google Sheets</div>
                          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>Writes directly to your spreadsheet — no download needed</div>
                        </div>
                        <button className="tap" onClick={() => setShowSheetSetup(s => !s)}
                          style={{ padding: "6px 12px", background: C.surfaceAlt, border: `1px solid ${C.borderMed}`, borderRadius: 10, fontSize: 12, fontWeight: 600, color: C.textSub, cursor: "pointer" }}>
                          {sheetUrl ? "⚙ Change" : "+ Setup"}
                        </button>
                      </div>
                      {showSheetSetup && (
                        <div style={{ marginBottom: 10 }}>
                          <input
                            value={sheetUrl}
                            onChange={e => { setSheetUrl(e.target.value); localStorage.setItem("cl_sheet_url", e.target.value); setSheetsStatus(null); }}
                            placeholder="Paste your Google Sheets URL…"
                            style={{ width: "100%", padding: "10px 12px", background: C.surfaceAlt, border: `1px solid ${C.borderMed}`, borderRadius: 10, color: C.text, fontFamily: F.h, fontSize: 13, boxSizing: "border-box" }}
                          />
                          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>Paste the full URL from your browser address bar</div>
                        </div>
                      )}
                      {sheetUrl && extractSheetId(sheetUrl) && (
                        <button className="tap" onClick={pushToSheets}
                          disabled={sheetsStatus === "pushing"}
                          style={{ width: "100%", padding: "13px", background: sheetsStatus === "ok" ? C.greenBg : "#1a73e8", border: `1.5px solid ${sheetsStatus === "ok" ? C.greenBorder : "#1a73e8"}`, borderRadius: 12, color: sheetsStatus === "ok" ? C.green : "#fff", fontFamily: F.h, fontSize: 15, fontWeight: 800, cursor: sheetsStatus === "pushing" ? "wait" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                          {sheetsStatus === "pushing" ? "⏳ Pushing to Sheets…"
                            : sheetsStatus === "ok" ? "✓ Sheets Updated"
                            : "Push to Google Sheets"}
                        </button>
                      )}
                      {!providerToken && sheetUrl && (
                        <div style={{ fontSize: 11, color: C.amber, marginTop: 6 }}>⚠ Sign out and sign back in to enable Sheets access</div>
                      )}
                      {sheetsStatus?.startsWith("error:") && (
                        <div style={{ fontSize: 12, color: C.red, marginTop: 8, padding: "8px 10px", background: C.redBg, borderRadius: 8 }}>
                          {sheetsStatus.replace("error:", "")}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>Export to CSV</div>
                    <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 14 }}>
                      Download data to paste into your spreadsheet. Column names match your sheet tabs.
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <button className="tap" onClick={() => { setExportMsg(null); exportGameLog(); setShowExport(false); }}
                        style={{ padding: "13px 16px", background: C.surfaceAlt, border: `1px solid ${C.borderMed}`, borderRadius: 12, color: C.text, fontFamily: F.h, fontSize: 14, fontWeight: 600, cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontWeight: 700 }}>Game Log</div>
                          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>One row per player per game · matches Game Log tab</div>
                        </div>
                        <span style={{ color: teamColor, fontSize: 18, flexShrink: 0 }}>⬇</span>
                      </button>
                      <button className="tap" onClick={() => { setExportMsg(null); exportGameSummary(); setShowExport(false); }}
                        style={{ padding: "13px 16px", background: C.surfaceAlt, border: `1px solid ${C.borderMed}`, borderRadius: 12, color: C.text, fontFamily: F.h, fontSize: 14, fontWeight: 600, cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontWeight: 700 }}>Game Summary</div>
                          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>One row per game · matches Game Summary tab</div>
                        </div>
                        <span style={{ color: teamColor, fontSize: 18, flexShrink: 0 }}>⬇</span>
                      </button>
                      <button className="tap" onClick={() => { setExportMsg(null); exportSeasonDashboard(); setShowExport(false); }}
                        style={{ padding: "13px 16px", background: C.surfaceAlt, border: `1px solid ${C.borderMed}`, borderRadius: 12, color: C.text, fontFamily: F.h, fontSize: 14, fontWeight: 600, cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontWeight: 700 }}>Season Dashboard</div>
                          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>Season totals per player · matches Dashboard tab</div>
                        </div>
                        <span style={{ color: teamColor, fontSize: 18, flexShrink: 0 }}>⬇</span>
                      </button>
                    </div>
                  </div>
                )}
                {exportMsg && (
                  <div style={{ background: C.greenBg, border: `1.5px solid ${C.greenBorder}`, borderRadius: 12, padding: "12px 16px", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.green }}>{exportMsg}</span>
                    <button onClick={() => setExportMsg(null)} style={{ background: "transparent", border: "none", color: C.green, fontSize: 16, cursor: "pointer", flexShrink: 0 }}>✕</button>
                  </div>
                )}

                {statsView === "players" && (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <span style={{ fontSize: 18, fontWeight: 800 }}>Season Overview</span>
                      <Chip>{teamGames.length} games · 50% target</Chip>
                    </div>

                    {underFifty.length > 0 && teamGames.length > 0 && (
                      <div style={{ background: C.redBg, border: `1.5px solid ${C.redBorder}`, borderRadius: 14, padding: "12px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ fontSize: 22, flexShrink: 0 }}>⚠️</span>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: C.red, marginBottom: 2 }}>{underFifty.length} player{underFifty.length !== 1 ? "s" : ""} under 50%</div>
                          <div style={{ fontFamily: F.m, fontSize: 11, color: C.red, opacity: 0.75 }}>{underFifty.map(s => s.name).join(", ")}</div>
                        </div>
                      </div>
                    )}
                    {teamGames.length === 0
                      ? <div style={{ textAlign: "center", padding: "50px 20px", color: C.textMuted, fontSize: 14 }}>No games recorded yet.</div>
                      : seasonStats.map(s => {
                        const pct = s.pct, exp = selectedPlayer === s.id;
                        const rows = teamGames.filter(g => g.attendees.includes(s.id));

                        // Aggregate position history across all games
                        const allPositions = {};
                        rows.forEach(g => {
                          const ps = g.positionSummary?.[s.id];
                          if (ps) Object.values(ps).forEach(pe => {
                            if (!allPositions[pe.slotId]) allPositions[pe.slotId] = { label: pe.label, slotId: pe.slotId, durationMs: 0, count: 0 };
                            allPositions[pe.slotId].durationMs += pe.durationMs;
                            allPositions[pe.slotId].count++;
                          });
                        });
                        const sortedPositions = Object.values(allPositions).sort((a, b) => b.durationMs - a.durationMs);

                        return (
                          <div key={s.id} className="tap" onClick={() => setSelectedPlayer(exp ? null : s.id)}
                            style={{ ...card({ border: `1px solid ${exp ? teamColor + "60" : C.border}` }), marginBottom: 10, padding: "14px 14px", cursor: "pointer" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                              <Avatar name={s.name} color={timeColor(pct, C)} size={40} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                                  <span style={{ fontSize: 15, fontWeight: 700 }}>{s.name}</span>
                                  {pct !== null && pct < 50 && <Chip color={C.red} bg={C.redBg} border={C.redBorder}>Under 50%</Chip>}
                                </div>
                                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                                  {sortedPositions.slice(0, 5).map(pe => (
                                    <div key={pe.slotId} style={{ display: "inline-flex", alignItems: "center", gap: 3, background: posColor(pe.slotId) + "22", border: `1px solid ${posColor(pe.slotId)}44`, borderRadius: 999, padding: "2px 8px" }}>
                                      <div style={{ width: 5, height: 5, borderRadius: "50%", background: posColor(pe.slotId), flexShrink: 0 }} />
                                      <span style={{ fontFamily: F.m, fontSize: 9, fontWeight: 800, color: posColor(pe.slotId) }}>{pe.label}</span>
                                      <span style={{ fontFamily: F.m, fontSize: 9, color: posColor(pe.slotId), opacity: 0.75 }}>{fmtMins(pe.durationMs)}</span>
                                    </div>
                                  ))}
                                  {pct === null && <span style={{ fontFamily: F.m, fontSize: 10, color: C.textMuted }}>No games yet</span>}
                                </div>
                              </div>
                              <div style={{ textAlign: "right" }}>
                                <div style={{ fontSize: 20, fontWeight: 800, fontFamily: F.m, color: timeColor(pct, C) }}>{pct === null ? "—" : `${pct}%`}</div>
                                <div style={{ fontFamily: F.m, fontSize: 10, color: exp ? teamColor : C.textMuted, fontWeight: 700 }}>{exp ? "▲ hide" : "▼ detail"}</div>
                              </div>
                            </div>
                            <div style={{ background: C.surfaceAlt, borderRadius: 999, height: 8, overflow: "hidden", position: "relative" }}>
                              {pct !== null && pct > 0 && <div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", background: timeColor(pct, C), borderRadius: 999 }} />}
                              <div style={{ position: "absolute", left: "50%", top: 0, width: "1.5px", height: "100%", background: C.borderStrong, opacity: 0.4 }} />
                            </div>
                            <div style={{ marginTop: 6, fontFamily: F.m, fontSize: 11, color: C.textMuted }}>
                              {pct !== null ? `${fmtMins(s.playedMs)} of ${fmtMins(s.availableMs)} · ${s.gamesAttended}/${teamGames.length} games` : "Not in any games yet"}
                            </div>

                            {exp && (
                              <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 12, paddingTop: 12 }}>
                                {/* Season position breakdown */}
                                {sortedPositions.length > 0 && (
                                  <div style={{ marginBottom: 14 }}>
                                    <span style={{ ...lbl(), marginBottom: 8 }}>Season Position Breakdown</span>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                                      {sortedPositions.map(pe => {
                                        const posTotal = s.playedMs > 0 ? Math.round((pe.durationMs / s.playedMs) * 100) : 0;
                                        return (
                                          <div key={pe.slotId}>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                <div style={{ width: 8, height: 8, borderRadius: "50%", background: posColor(pe.slotId), flexShrink: 0 }} />
                                                <span style={{ fontFamily: F.m, fontSize: 10, fontWeight: 800, color: posColor(pe.slotId) }}>{pe.label}</span>
                                                <span style={{ fontFamily: F.m, fontSize: 9, color: C.textMuted }}>{pe.count} game{pe.count !== 1 ? "s" : ""}</span>
                                              </div>
                                              <span style={{ fontFamily: F.m, fontSize: 10, fontWeight: 700, color: C.textSub }}>{fmtMins(pe.durationMs)} · {posTotal}%</span>
                                            </div>
                                            <div style={{ background: C.surfaceAlt, borderRadius: 999, height: 5, overflow: "hidden" }}>
                                              <div style={{ width: `${posTotal}%`, height: "100%", background: posColor(pe.slotId), borderRadius: 999 }} />
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                                <span style={{ ...lbl(), marginBottom: 10 }}>Game by Game</span>
                                {rows.length === 0
                                  ? <div style={{ color: C.textMuted, fontSize: 13, textAlign: "center" }}>Not in any games yet</div>
                                  : rows.map(g => {
                                    const gMs = g.minutesMs[s.id] || 0, gPct = g.totalGameMs > 0 ? Math.round((gMs / g.totalGameMs) * 100) : 0;
                                    const gt = gtInfo(g.gameType), res = gameResult(g);
                                    const sc = (g.scoreUs !== "" || g.scoreThem !== "") ? `${g.scoreUs || "?"}–${g.scoreThem || "?"}` : "";
                                    const gPS = g.positionSummary?.[s.id];
                                    const gPositions = gPS ? Object.values(gPS).sort((a, b) => b.durationMs - a.durationMs) : [];
                                    return (
                                      <div key={g.id} style={{ marginBottom: 12 }} onClick={e => { e.stopPropagation(); setSelectedGame(g.id); }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                                          <div>
                                            <span style={{ fontSize: 13, fontWeight: 500, color: C.textSub }}>{gt.icon} vs {g.opponent}</span>
                                            {sc && <span style={{ fontFamily: F.m, fontSize: 11, color: C.textMuted }}> {sc}</span>}
                                            {res && <ResultBadge r={res} />}
                                          </div>
                                          <span style={{ fontFamily: F.m, fontSize: 11, fontWeight: 700, color: timeColor(gPct, C) }}>{fmtClock(gMs)} ({gPct}%)</span>
                                        </div>
                                        {gPositions.length > 0 && (
                                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 5 }}>
                                            {gPositions.map(pe => (
                                              <div key={pe.slotId} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: posColor(pe.slotId) + "22", border: `1px solid ${posColor(pe.slotId)}55`, borderRadius: 999, padding: "2px 7px" }}>
                                                <span style={{ fontFamily: F.m, fontSize: 9, fontWeight: 800, color: posColor(pe.slotId) }}>{pe.label}</span>
                                                <span style={{ fontFamily: F.m, fontSize: 9, color: posColor(pe.slotId), opacity: 0.75 }}>{fmtMins(pe.durationMs)}</span>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                        <div style={{ background: C.surfaceAlt, borderRadius: 999, height: 6, overflow: "hidden", position: "relative" }}>
                                          {gPct > 0 && <div style={{ width: `${gPct}%`, height: "100%", background: timeColor(gPct, C), borderRadius: 999 }} />}
                                          <div style={{ position: "absolute", left: "50%", top: 0, width: "1.5px", height: "100%", background: C.borderStrong, opacity: 0.4 }} />
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </>
                )}

                {statsView === "games" && (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                      <span style={{ fontSize: 18, fontWeight: 800 }}>Game Log</span>
                      <Chip>{teamGames.length} game{teamGames.length !== 1 ? "s" : ""}</Chip>
                    </div>
                    {teamGames.length === 0
                      ? <div style={{ textAlign: "center", padding: "50px 20px", color: C.textMuted, fontSize: 14 }}>No games recorded yet.</div>
                      : [...teamGames].reverse().map((g, ri) => {
                        const gNum = teamGames.length - ri, gt = gtInfo(g.gameType), res = gameResult(g);
                        const sc = (g.scoreUs !== "" || g.scoreThem !== "");
                        const top = g.attendees.map(id => ({ p: teamPlayers.find(x => x.id === id), ms: g.minutesMs[id] || 0 })).filter(({ p }) => p).sort((a, b) => b.ms - a.ms).slice(0, 4);
                        return (
                          <div key={g.id} className="tap" onClick={() => setSelectedGame(g.id)} style={{ ...card(), marginBottom: 10, padding: "14px 16px", cursor: "pointer" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                              <div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                                  <span style={{ fontFamily: F.m, fontSize: 10, fontWeight: 700, color: C.textMuted, background: C.surfaceAlt, padding: "2px 7px", borderRadius: 999 }}>G{gNum}</span>
                                  <span style={{ fontSize: 16, fontWeight: 700 }}>vs {g.opponent}</span>
                                </div>
                                <div style={{ display: "flex", gap: 6 }}>
                                  <Chip color={gt.color} bg={gt.bg} border={gt.border}>{gt.icon} {gt.label} · {g.date}</Chip>
                                  {g.formation && <Chip>⚽ {g.formation}</Chip>}
                                </div>
                              </div>
                              <div style={{ textAlign: "right" }}>
                                {sc && (
                                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", marginBottom: 4 }}>
                                    <div style={{ fontSize: 20, fontWeight: 900, fontFamily: F.m }}>
                                      <span style={{ color: teamColor }}>{g.scoreUs || "?"}</span>
                                      <span style={{ color: C.textMuted, fontWeight: 300 }}>–</span>
                                      <span style={{ color: C.red }}>{g.scoreThem || "?"}</span>
                                    </div>
                                    <ResultBadge r={res} />
                                  </div>
                                )}
                                <div style={{ fontFamily: F.m, fontSize: 11, color: C.textMuted }}>{fmtClock(g.totalGameMs)}</div>
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                              {top.map(({ p, ms }) => {
                                const gPct = g.totalGameMs > 0 ? Math.round((ms / g.totalGameMs) * 100) : 0;
                                return (
                                  <div key={p.id} style={{ background: C.surfaceAlt, border: `1px solid ${C.borderMed}`, borderRadius: 999, padding: "4px 10px", display: "flex", alignItems: "center", gap: 5 }}>
                                    <span style={{ fontFamily: F.h, fontSize: 12, fontWeight: 600, color: C.textSub }}>{p.name}</span>
                                    <span style={{ fontFamily: F.m, fontSize: 10, fontWeight: 700, color: gPct >= 50 ? C.green : C.amber }}>{fmtClock(ms)}</span>
                                  </div>
                                );
                              })}
                              {g.attendees.length > 4 && <div style={{ background: C.surfaceAlt, border: `1px solid ${C.borderMed}`, borderRadius: 999, padding: "4px 10px" }}><span style={{ fontFamily: F.m, fontSize: 10, color: C.textMuted }}>+{g.attendees.length - 4}</span></div>}
                            </div>
                          </div>
                        );
                      })}
                  </>
                )}
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
