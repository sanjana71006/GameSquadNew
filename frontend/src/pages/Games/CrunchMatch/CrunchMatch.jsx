import React, { useState, useEffect, useRef, useContext } from 'react';
import { AuthContext } from '../../../context/AuthContext';
import './CrunchMatch.css';
import { SFX } from '../../../utils/sounds';

const LEVEL_CONFIG = {
  easy: { label: "Easy", bubblesMin: 5, bubblesMax: 6, timeMs: 30000, scoreMult: 1 },
  medium: { label: "Medium", bubblesMin: 7, bubblesMax: 9, timeMs: 20000, scoreMult: 1.5 },
  hard: { label: "Hard", bubblesMin: 10, bubblesMax: 12, timeMs: 14000, scoreMult: 2 }
};

const COMBO_WINDOW_MS = 2000;
const COMBO_MAX_TIER = 5;
const WRONG_TIME_PENALTY_MS = 2000;
const BASE_POINTS = 10;
const WALL_PADDING = 0;

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randPick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const valueKey = (n) => String(Math.round(n * 1e8) / 1e8);
const formatNumber = (n) => {
  if (!Number.isFinite(n)) return String(n);
  if (Math.abs(n) < 1e-10) return "0";
  const rounded = Math.round(n * 1e6) / 1e6;
  if (Math.abs(rounded - Math.round(rounded)) < 1e-9) return String(Math.round(rounded));
  return String(rounded).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
};

// Generators
const buildBinaryExpression = (op, l, r) => `${l} ${op} ${r}`;
const genLiteral = (diff) => {
  let v;
  if (diff === "easy") v = randPick([-0.9, -2, -1, 0.5, 1.25, 2.5, 3.7, -3.2, 4, 7]);
  else if (diff === "medium") v = (Math.random() < 0.45 ? -1 : 1) * (Math.round(Math.random() * 180) / 10 + 0.05);
  else v = (Math.random() < 0.5 ? -1 : 1) * (randInt(50, 999) + Math.round(Math.random() * 99) / 100);
  return { expression: formatNumber(v), value: v };
};
const genAddSub = (diff, preferAdd) => {
  let a, b, isAdd = preferAdd !== false ? Math.random() < 0.55 : !preferAdd;
  if (diff === "easy") { a = randInt(-12, 25); b = randInt(-12, 25); }
  else if (diff === "medium") { a = randInt(-40, 60); b = randInt(-40, 60); }
  else { a = randInt(-200, 800); b = randInt(-200, 800); }
  return isAdd ? { expression: buildBinaryExpression("+", formatNumber(a), formatNumber(b)), value: a + b }
               : { expression: buildBinaryExpression("−", formatNumber(a), formatNumber(b)), value: a - b };
};
const genMul = (diff) => {
  let a, b;
  if (diff === "easy") { a = randInt(-9, 12); b = randInt(-9, 12); }
  else if (diff === "medium") { a = randInt(-15, 18); b = randInt(-15, 18); }
  else { a = randInt(-25, 25); b = randInt(-25, 25); }
  if (a === 0) a = 1; if (b === 0) b = 1;
  return { expression: buildBinaryExpression("×", formatNumber(a), formatNumber(b)), value: a * b };
};
const genDiv = (diff) => {
  let a, b;
  if (diff === "easy") { b = randInt(2, 11); const q = randInt(1, 14); a = b * q; if (Math.random() < 0.35) a += randInt(1, Math.max(1, b - 1)); }
  else if (diff === "medium") { b = randInt(2, 18); a = randInt(20, 400); }
  else { b = randInt(2, 25); a = randInt(1500, 9999); }
  if (b === 0) b = 2;
  return { expression: buildBinaryExpression("÷", formatNumber(a), formatNumber(b)), value: a / b };
};
const randomBubble = (diff) => {
  const r = Math.random();
  if (r < 0.1) return genLiteral(diff);
  const w = diff === "easy" ? randPick(["add", "add", "sub", "mul", "div"]) : diff === "medium" ? randPick(["add", "sub", "mul", "div"]) : randPick(["add", "sub", "mul", "mul", "div", "div"]);
  if (w === "add") return genAddSub(diff, true); if (w === "sub") return genAddSub(diff, false);
  if (w === "mul") return genMul(diff); return genDiv(diff);
};
const generateRound = (diff, forcedCount) => {
  const cfg = LEVEL_CONFIG[diff];
  const count = typeof forcedCount === "number" ? forcedCount : randInt(cfg.bubblesMin, cfg.bubblesMax);
  const used = new Set(); const out = []; let guard = 0;
  while (out.length < count && guard < 9000) { guard++; const b = randomBubble(diff); const k = valueKey(b.value); if (used.has(k)) continue; used.add(k); out.push(b); }
  let fallback = 0;
  while (out.length < count && fallback < 500) {
    fallback++; const base = randomBubble(diff); let v = base.value; let delta = 0.0001; let tries = 0;
    while (used.has(valueKey(v)) && tries < 80) { tries++; v = base.value + delta * (out.length % 2 === 0 ? 1 : -1); delta *= 1.9; }
    if (!used.has(valueKey(v))) { used.add(valueKey(v)); out.push({ expression: formatNumber(v), value: v }); }
  }
  return out;
};

// SFX
const Sfx = {
  ctx: null, ensure() { if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); return this.ctx; },
  play(freq, duration, type) { try { const ctx = this.ensure(); const osc = ctx.createOscillator(); const g = ctx.createGain(); osc.type = type || "sine"; osc.frequency.value = freq; g.gain.value = 0.08; osc.connect(g); g.connect(ctx.destination); const t = ctx.currentTime; g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.001, t + duration); osc.start(t); osc.stop(t + duration); } catch (_) {} },
  ok() { this.play(660, 0.07, "sine"); setTimeout(() => this.play(880, 0.09, "sine"), 60); },
  err() { this.play(190, 0.14, "triangle"); }, pop() { this.play(520, 0.05, "square"); }
};

const CrunchMatch = () => {
  const {
    token,
    user,
    updateProgress,
    sendGameInvite,
    invitationEvents,
    clearInvitationEvent,
    pendingGameStart,
    clearPendingGameStart
  } = useContext(AuthContext);
  
  // App UI State
  const [appMode, setAppMode] = useState('CHOOSE'); // CHOOSE, SP_SETUP, MP_SETUP, MP_WAIT, GAME, OVER
  const [friendUsername, setFriendUsername] = useState('');
  const [pendingInviteId, setPendingInviteId] = useState(null);
  const [inviteError, setInviteError] = useState('');
  const [inviteInfo, setInviteInfo] = useState('');
  const [isMulti, setIsMulti] = useState(false);
  
  // Game Render State
  const [toasts, setToasts] = useState([]);
  const [timers, setTimers] = useState({ left: 1, p1: 1, p2: 1 });
  const [uiState, setUiState] = useState({ diff: 'easy', round: 1, p1: {}, p2: {} });
  const [winnerText, setWinnerText] = useState('');

  const field1Ref = useRef(null);
  const field2Ref = useRef(null);

  const initPlayer = (id, name) => ({
    id, name, score: 0, brainScore: 0, combo: 1, comboTier: 0,
    lastCorrectAt: 0, correctTaps: 0, wrongTaps: 0,
    bubbles: [], expectedOrder: [], nextIndex: 0, movingBubbles: [],
    finished: false, finishAt: 0, finishReason: ""
  });

  const stateRef = useRef({
    running: false, difficulty: "easy", roundIndex: 0, order: "asc",
    timeLeftMs: 0, maxTimeMs: 0, timerId: null, moveRafId: null,
    players: []
  });

  const accuracy = (p) => { const t = p.correctTaps + p.wrongTaps; return t === 0 ? 100 : Math.round((p.correctTaps / t) * 1000) / 10; };

  const showToast = (msg, kind) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev.slice(-2), { id, msg, kind }]);
    setTimeout(() => { setToasts(p => p.filter(t => t.id !== id)); }, 2200);
  };

  const updateReactState = () => {
    const sr = stateRef.current;
    if (!sr) return;
    setUiState({
      diff: sr.difficulty, round: sr.roundIndex + 1,
      orderTxt: sr.order === 'asc' ? 'Ascending' : 'Descending',
      p1: sr.players[0] ? { name: sr.players[0].name, score: sr.players[0].score, brain: sr.players[0].brainScore, combo: sr.players[0].combo, acc: accuracy(sr.players[0]) } : {},
      p2: sr.players[1] ? { name: sr.players[1].name, score: sr.players[1].score, brain: sr.players[1].brainScore, combo: sr.players[1].combo, acc: accuracy(sr.players[1]) } : {}
    });
    setTimers({ 
      left: sr.maxTimeMs > 0 ? sr.timeLeftMs / sr.maxTimeMs : 1,
      p1: sr.maxTimeMs > 0 ? sr.timeLeftMs / sr.maxTimeMs : 1,
      p2: sr.maxTimeMs > 0 ? sr.timeLeftMs / sr.maxTimeMs : 1
    });
  };

  const stopTimer = () => {
    stateRef.current.running = false;
    cancelAnimationFrame(stateRef.current.timerId);
    cancelAnimationFrame(stateRef.current.moveRafId);
  };

  const handleGameOver = () => {
    SFX.gameOver();
    stopTimer();
    const sr = stateRef.current;
    const p1 = sr.players[0]; const p2 = sr.players[1];
    let win = "Tie";
    if (isMulti) {
      if (p1.finished && !p2.finished) win = `${p1.name} wins`;
      else if (p2.finished && !p1.finished) win = `${p2.name} wins`;
      else if (p1.finished && p2.finished) win = Math.abs(p1.finishAt - p2.finishAt) <= 150 ? "Tie" : (p1.finishAt < p2.finishAt ? `${p1.name} wins` : `${p2.name} wins`);
      else win = p1.score === p2.score ? "Tie" : (p1.score > p2.score ? `${p1.name} wins` : `${p2.name} wins`);
    } else {
      win = `Brain Score: ${Math.round(p1.brainScore)} | Accuracy: ${accuracy(p1)}%`;
    }
    setWinnerText(win);
    setAppMode('OVER');
    
    // Save backend progress for P1
    if (token) {
      let lvl = sr.difficulty === 'easy' ? 1 : (sr.difficulty === 'medium' ? 3 : 5);
      fetch('/api/games/progress', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ gameId: 'crunch-match', level: lvl, score: p1.score, timeToComplete: Math.round((sr.maxTimeMs - sr.timeLeftMs)/1000) || 1, result: 'win', accuracy: accuracy(p1) })
      })
        .then((r) => r.json())
        .then((data) => {
          if (data?.progress) updateProgress(data.progress);
        })
        .catch(()=>{});
    }
  };

  const onBubbleTap = (playerIndex, el, bubbleObj) => {
    const sr = stateRef.current;
    if (!sr.running) return;
    const p = sr.players[playerIndex];
    if (p.finished) return;

    const expected = p.expectedOrder[p.nextIndex];
    if (valueKey(bubbleObj.value) === expected) {
      Sfx.ok(); p.correctTaps++;
      const now = Date.now();
      if (now - p.lastCorrectAt < COMBO_WINDOW_MS && p.lastCorrectAt > 0) {
        p.comboTier = Math.min(COMBO_MAX_TIER, p.comboTier + 1);
        p.combo = Math.min(5, 1 + p.comboTier * 0.4);
      } else { p.comboTier = 0; p.combo = 1; }
      p.lastCorrectAt = now;

      const pts = Math.round(BASE_POINTS * LEVEL_CONFIG[sr.difficulty].scoreMult * p.combo * (1 + accuracy(p)/200));
      p.score += pts; p.brainScore += pts * 0.15 + p.comboTier * 2;
      showToast(`${p.name}: ${bubbleObj.expression} = ${formatNumber(bubbleObj.value)}`, 'ok');

      if (el._bubbleObj) el._bubbleObj.active = false;
      el.classList.add('crunch-bubble--correct', 'crunch-bubble--pop');
      el.disabled = true; setTimeout(() => el.remove(), 420);

      p.nextIndex++;
      updateReactState();
      if (p.nextIndex >= p.expectedOrder.length) {
        p.finished = true; p.finishAt = Date.now();
        if (!isMulti) { stopTimer(); sr.roundIndex++; setTimeout(() => startRound(), 450); }
        else {
          if (sr.players[0].finished || sr.players[1].finished) handleGameOver();
        }
      }
    } else {
      Sfx.err(); p.wrongTaps++; p.combo = 1; p.comboTier = 0; p.lastCorrectAt = 0;
      sr.timeLeftMs = Math.max(0, sr.timeLeftMs - WRONG_TIME_PENALTY_MS);
      showToast(`${p.name}: Wrong order`, 'err');
      el.classList.add('crunch-bubble--wrong'); setTimeout(() => el.classList.remove('crunch-bubble--wrong'), 450);
      updateReactState();
      if (sr.timeLeftMs <= 0) handleGameOver();
    }
  };

  const spawnBubblesFor = (playerIndex, field) => {
    if (!field) return;
    field.innerHTML = '';
    const sr = stateRef.current;
    const p = sr.players[playerIndex];
    p.movingBubbles = [];
    const w = field.clientWidth; const h = field.clientHeight;

    p.bubbles.forEach((b, idx) => {
      const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'crunch-bubble';
      const sp = document.createElement('span'); sp.className = 'crunch-bubble__expr'; sp.textContent = b.expression;
      btn.appendChild(sp); field.appendChild(btn);
      
      const size = btn.offsetWidth || 60;
      let x = randInt(0, Math.max(0, w - size - WALL_PADDING)); let y = randInt(0, Math.max(0, h - size - WALL_PADDING));
      
      let tries = 0;
      while(tries < 80) {
        tries++; let ok = true;
        for(let i=0; i<p.movingBubbles.length; i++){
          let ob = p.movingBubbles[i];
          if(Math.hypot(ob.x - x, ob.y - y) < size * 0.98) { ok = false; break; }
        }
        if(ok) break;
        x = randInt(0, Math.max(0, w - size - WALL_PADDING)); y = randInt(0, Math.max(0, h - size - WALL_PADDING));
      }

      const a = Math.random() * Math.PI*2; 
      const speedBase = sr.difficulty === 'easy' ? randInt(18, 34) : (sr.difficulty === 'medium' ? randInt(26, 46) : randInt(36, 62));
      const spd = speedBase + randInt(-6, 10);
      
      const obj = {
        el: btn, active: true, x, y, size, vx: Math.cos(a)*spd, vy: Math.sin(a)*spd, baseSpeed: speedBase,
        wobbleFreq: 0.35 + Math.random(), wobbleAmpX: (1.8 + Math.random()*2) * (Math.random()<0.5?-1:1), wobbleAmpY: (1.8 + Math.random()*2) * (Math.random()<0.5?-1:1),
        phaseX: Math.random()*10, phaseY: Math.random()*10
      };
      btn._bubbleObj = obj; p.movingBubbles.push(obj);
      btn.style.left = obj.x + 'px'; btn.style.top = obj.y + 'px';
      btn.onclick = () => onBubbleTap(playerIndex, btn, b);
    });
  };

  const resolveCollisions = (p, w, h) => {
    const bubbles = p.movingBubbles;
    for (let i = 0; i < bubbles.length; i++) {
      const a = bubbles[i]; if (!a.active || !a.el.isConnected) continue;
      for (let j = i+1; j < bubbles.length; j++) {
        const b = bubbles[j]; if (!b.active || !b.el.isConnected) continue;
        const dx = (b.x + b.size/2) - (a.x + a.size/2); const dy = (b.y + b.size/2) - (a.y + a.size/2);
        const dist = Math.hypot(dx, dy); const minDist = (a.size + b.size) / 2 * 0.98;
        if (dist > 0 && dist < minDist) {
          const nx = dx/dist; const ny = dy/dist; const overlap = minDist - dist; const half = overlap/2;
          a.x -= nx*half; a.y -= ny*half; b.x += nx*half; b.y += ny*half;
          const delta = (b.vx*nx + b.vy*ny) - (a.vx*nx + a.vy*ny);
          a.vx += delta*nx; a.vy += delta*ny; b.vx -= delta*nx; b.vy -= delta*ny;
          a.vx *= 0.99; a.vy *= 0.99; b.vx *= 0.99; b.vy *= 0.99;
          a.x = clamp(a.x, 0, w - a.size); a.y = clamp(a.y, 0, h - a.size);
          b.x = clamp(b.x, 0, w - b.size); b.y = clamp(b.y, 0, h - b.size);
        }
      }
    }
  };

  const movementLoop = () => {
    const sr = stateRef.current;
    let last = performance.now();
    const tick = (now) => {
      if (!sr.running) return;
      const dtSec = Math.min(50, now - last) / 1000; last = now; const tSec = now/1000;
      
      const fields = [[sr.players[0], field1Ref.current], [sr.players[1], field2Ref.current]];
      fields.forEach(([p, f]) => {
        if (!p || !f) return;
        const w = f.clientWidth; const h = f.clientHeight;
        p.movingBubbles.forEach(b => {
          if (!b.active || !b.el.isConnected) return;
          b.vx += Math.cos(tSec*b.wobbleFreq + b.phaseX) * b.wobbleAmpX * dtSec;
          b.vy += Math.sin(tSec*b.wobbleFreq + b.phaseY) * b.wobbleAmpY * dtSec;
          const spd = Math.hypot(b.vx, b.vy); if (spd > b.baseSpeed*1.08) { b.vx *= (b.baseSpeed*1.08)/spd; b.vy *= (b.baseSpeed*1.08)/spd; }
          b.x += b.vx*dtSec; b.y += b.vy*dtSec;
          if (b.x <= 0) { b.x = 0; b.vx = Math.abs(b.vx); } else if (b.x + b.size >= w) { b.x = w - b.size; b.vx = -Math.abs(b.vx); }
          if (b.y <= 0) { b.y = 0; b.vy = Math.abs(b.vy); } else if (b.y + b.size >= h) { b.y = h - b.size; b.vy = -Math.abs(b.vy); }
          b.el.style.left = b.x + 'px'; b.el.style.top = b.y + 'px';
        });
        resolveCollisions(p, w, h);
      });
      sr.moveRafId = requestAnimationFrame(tick);
    };
    sr.moveRafId = requestAnimationFrame(tick);
  };

  const startRound = () => {
    const sr = stateRef.current;
    sr.order = Math.random() < 0.5 ? 'asc' : 'desc';
    const cfg = LEVEL_CONFIG[sr.difficulty];
    sr.maxTimeMs = cfg.timeMs; sr.timeLeftMs = cfg.timeMs; sr.running = true;
    
    const count = randInt(cfg.bubblesMin, cfg.bubblesMax);
    sr.players.forEach(p => {
      if(!p) return;
      p.bubbles = generateRound(sr.difficulty, isMulti ? count : undefined);
      const sorted = [...p.bubbles].sort((a,b)=>a.value - b.value);
      p.expectedOrder = (sr.order==='asc'?sorted:sorted.reverse()).map(x => valueKey(x.value));
      p.nextIndex = 0; p.finished = false; p.movingBubbles = [];
    });
    
    updateReactState();
    if(sr.players[0]) spawnBubblesFor(0, field1Ref.current);
    if(sr.players[1]) spawnBubblesFor(1, field2Ref.current);

    movementLoop();
    let last = performance.now();
    const tickTime = (now) => {
      if(!sr.running) return;
      sr.timeLeftMs -= (now - last); last = now;
      setTimers({ left: sr.timeLeftMs/sr.maxTimeMs, p1: sr.timeLeftMs/sr.maxTimeMs, p2: sr.timeLeftMs/sr.maxTimeMs });
      if(sr.timeLeftMs <= 0) { sr.timeLeftMs = 0; handleGameOver(); return; }
      sr.timerId = requestAnimationFrame(tickTime);
    };
    sr.timerId = requestAnimationFrame(tickTime);
  };

  const beginGame = (diffParam, multi) => {
    SFX.gameStart();
    try { Sfx.ensure(); if(Sfx.ctx && Sfx.ctx.state==="suspended") Sfx.ctx.resume(); } catch(_) {}
    setIsMulti(multi);
    const p1Name = user?.name || "Player 1";
    const p2Name = multi ? (friendUsername || "Player 2") : null;
    stateRef.current = {
      running: false, difficulty: diffParam, roundIndex: 0, order: "asc",
      timeLeftMs: 0, maxTimeMs: 0, timerId: null, moveRafId: null,
      players: multi ? [initPlayer(0, p1Name), initPlayer(1, p2Name)] : [initPlayer(0, p1Name)]
    };
    setAppMode('GAME');
    setTimeout(() => startRound(), 50); // delay to let refs mount
  };

  // --- RENDER ---
  useEffect(() => { return stopTimer; }, []);

  useEffect(() => {
    if (!pendingInviteId) return;
    const event = invitationEvents.find((entry) => entry.invitationId === pendingInviteId);
    if (!event) return;

    if (event.status === 'accepted') {
      setFriendUsername(event.friendName || friendUsername || 'Player 2');
      setInviteInfo(`${event.friendName || 'Your friend'} accepted. Starting match...`);
      setInviteError('');
      setAppMode('GAME');
      setTimeout(() => beginGame('medium', true), 120);
    } else {
      setAppMode('MP_SETUP');
      setInviteInfo('');
      setInviteError(`${event.friendName || 'Your friend'} is busy right now. Try some other time.`);
      showToast('Invite rejected. Try some other time.', 'err');
    }

    clearInvitationEvent(event.invitationId);
    setPendingInviteId(null);
  }, [pendingInviteId, invitationEvents]);

  useEffect(() => {
    if (!pendingGameStart || pendingGameStart.gameId !== 'crunch-match') return;

    setFriendUsername(pendingGameStart.friendName || 'Player 2');
    setInviteInfo(`${pendingGameStart.friendName || 'Friend'} joined. Starting match...`);
    setInviteError('');
    setAppMode('GAME');
    setTimeout(() => beginGame('medium', true), 120);
    clearPendingGameStart();
  }, [pendingGameStart]);

  const sendInviteAndWait = async () => {
    const friend = friendUsername.trim();
    if (!friend) {
      setInviteError('Enter your friend username to send an invite.');
      return;
    }

    try {
      setInviteError('');
      setInviteInfo('Sending invite...');
      setAppMode('MP_WAIT');
      const data = await sendGameInvite({ friendUsername: friend, gameId: 'crunch-match' });
      setPendingInviteId(data?.notification?.id || null);
      setInviteInfo(`Invite sent to ${friend}. Waiting for response...`);
    } catch (error) {
      setAppMode('MP_SETUP');
      setInviteInfo('');
      setInviteError(error.message || 'Could not send invite. Please try again.');
    }
  };

  if (appMode === 'CHOOSE') {
    return (
      <div className="crunch-app crunch-app--menu">
         <main className="crunch-stage"><section className="crunch-panel crunch-panel--start">
            <h1 className="crunch-logo">Crunch</h1>
            <p className="crunch-tagline">Tap mental math bubbles in order — by value, not by looks.</p>
            <h2 style={{color: 'var(--text)', marginBottom: '15px'}}>Select Game Mode</h2>
            <div className="crunch-difficulty-grid">
               <button className="crunch-btn crunch-btn-diff" onClick={() => setAppMode('SP_SETUP')}>
                 <span className="crunch-btn-diff__title">Single Player</span>
                 <span className="crunch-btn-diff__meta">Practice against the clock</span>
               </button>
               <button className="crunch-btn crunch-btn-diff" onClick={() => setAppMode('MP_SETUP')}>
                 <span className="crunch-btn-diff__title">Two Players (Versus)</span>
                 <span className="crunch-btn-diff__meta">Play against an online friend</span>
               </button>
            </div>
         </section></main>
      </div>
    );
  }

  if (appMode === 'MP_SETUP') {
    return (
      <div className="crunch-app crunch-app--menu">
         <main className="crunch-stage"><section className="crunch-panel crunch-panel--start crunch-invite-card">
            <h1 className="crunch-logo">Multiplayer Arena</h1>
            <h2 className="crunch-invite-title">Invite Online Friend</h2>
            <p className="crunch-invite-subtitle">Your friend receives a real-time notification and can accept or reject instantly.</p>

            <input
              type="text"
              placeholder="Enter friend's username"
              className="crunch-invite-input"
              onChange={e => setFriendUsername(e.target.value)}
              value={friendUsername}
            />

            {inviteError && <p className="crunch-invite-error">{inviteError}</p>}
            {!inviteError && inviteInfo && <p className="crunch-invite-info">{inviteInfo}</p>}

            <div className="crunch-invite-actions">
               <button
                 className="crunch-btn crunch-invite-back"
                 onClick={() => {
                   setInviteError('');
                   setInviteInfo('');
                   setPendingInviteId(null);
                   setAppMode('CHOOSE');
                 }}
               >
                 Back
               </button>
               <button className="crunch-btn crunch-btn-primary crunch-invite-send" onClick={sendInviteAndWait}>Send Invite</button>
            </div>
         </section></main>
      </div>
    );
  }

  if (appMode === 'MP_WAIT') {
    return (
      <div className="crunch-app crunch-app--menu">
         <main className="crunch-stage"><section className="crunch-panel crunch-panel--start crunch-invite-card">
            <h2 className="crunch-invite-title" style={{marginBottom: '10px'}}>Waiting For Response...</h2>
            <p className="crunch-invite-subtitle">Invite sent to <strong>{friendUsername}</strong>. Ask your friend to check the notifications bell.</p>
            {inviteInfo && <p className="crunch-invite-info">{inviteInfo}</p>}
            <div className="crunch-invite-actions" style={{marginTop: '16px'}}>
              <button className="crunch-btn crunch-invite-back" onClick={() => {
                setAppMode('MP_SETUP');
                setPendingInviteId(null);
                setInviteInfo('');
              }}>
                Back
              </button>
            </div>
         </section></main>
      </div>
    );
  }

  if (appMode === 'SP_SETUP') {
    return (
      <div className="crunch-app crunch-app--menu">
         <main className="crunch-stage"><section className="crunch-panel crunch-panel--start">
            <h1 className="crunch-logo">Single Player</h1>
            <div className="crunch-difficulty-grid" style={{marginTop: '20px'}}>
              <button className="crunch-btn crunch-btn-diff" onClick={() => beginGame('easy', false)}><span className="crunch-btn-diff__title">Easy</span></button>
              <button className="crunch-btn crunch-btn-diff" onClick={() => beginGame('medium', false)}><span className="crunch-btn-diff__title">Medium</span></button>
              <button className="crunch-btn crunch-btn-diff" onClick={() => beginGame('hard', false)}><span className="crunch-btn-diff__title">Hard</span></button>
            </div>
            <button className="crunch-btn" style={{marginTop: '20px', padding: '10px', background: 'transparent', color: 'var(--text)', border: 'none', textDecoration: 'underline'}} onClick={() => setAppMode('CHOOSE')}>Back to Modes</button>
         </section></main>
      </div>
    );
  }

  return (
    <div className="crunch-app">
      {appMode === 'GAME' && !isMulti && (
        <header className="crunch-top-bar" id="topBar">
          <div className="crunch-top-bar__row">
            <div className="crunch-stat"><span className="crunch-stat__label">Brain</span><span className="crunch-stat__value">{Math.round(uiState.p1?.brain||0)}</span></div>
            <div className="crunch-stat"><span className="crunch-stat__label">Score</span><span className="crunch-stat__value">{uiState.p1?.score||0}</span></div>
            <div className="crunch-stat"><span className="crunch-stat__label">Combo</span><span className="crunch-stat__value combo">×{(uiState.p1?.combo||1).toFixed(1)}</span></div>
            <div className="crunch-stat"><span className="crunch-stat__label">Accuracy</span><span className="crunch-stat__value">{uiState.p1?.acc||100}%</span></div>
          </div>
          <div className="crunch-instruction">{uiState.orderTxt}</div>
          <div className="crunch-timer-wrap"><div className="crunch-timer-bar" style={{ transform: `scaleX(${timers.left})` }}></div></div>
          <div className="crunch-round-meta"><span>Round {uiState.round}</span><span className="crunch-diff-pill">{LEVEL_CONFIG[uiState.diff]?.label}</span></div>
        </header>
      )}

      <main className="crunch-stage">
        {appMode === 'GAME' && (
          <section className="crunch-game-area">
            <div className={`crunch-split-board ${isMulti ? 'crunch-split-board--multi' : ''}`}>
              
              {/* Player 1 Field */}
              <section className="crunch-player-panel" aria-label="Player 1 section">
                <div className="crunch-player-header">
                  <div className="crunch-player-name">{uiState.p1?.name||"Player 1"}</div>
                  {isMulti && <div className="crunch-player-instruction">{uiState.orderTxt}</div>}
                </div>
                {isMulti && <div className="crunch-timer-wrap"><div className="crunch-timer-bar" style={{ transform: `scaleX(${timers.p1})` }}></div></div>}
                <div className="crunch-player-scoreline">Score: {uiState.p1?.score||0}</div>
                <div className="crunch-bubble-field" ref={field1Ref}></div>
              </section>

              {/* Player 2 Field (Multiplayer Only) */}
              {isMulti && (
                <section className="crunch-player-panel" aria-label="Player 2 section">
                  <div className="crunch-player-header">
                    <div className="crunch-player-name">{uiState.p2?.name||friendUsername}</div>
                    <div className="crunch-player-instruction">{uiState.orderTxt}</div>
                  </div>
                  <div className="crunch-timer-wrap"><div className="crunch-timer-bar" style={{ transform: `scaleX(${timers.p2})` }}></div></div>
                  <div className="crunch-player-scoreline">Score: {uiState.p2?.score||0}</div>
                  <div className="crunch-bubble-field" ref={field2Ref}></div>
                </section>
              )}

            </div>
          </section>
        )}

        {appMode === 'OVER' && (
          <section className="crunch-panel crunch-panel--over">
            <h2 className="crunch-panel__title">Time's up</h2>
            <div className="crunch-panel__stats" dangerouslySetInnerHTML={{__html: winnerText}}></div>
            <button type="button" className="crunch-btn crunch-btn-primary" onClick={() => setAppMode('CHOOSE')}>Back to Main Menu</button>
          </section>
        )}
      </main>

      <div className="crunch-toast-stack">
        {toasts.map(t => <div key={t.id} className={`crunch-toast toast--${t.kind}`}>{t.msg}</div>)}
      </div>
    </div>
  );
};

export default CrunchMatch;
