import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AuthContext } from '../../../context/AuthContext';
import { motion } from 'framer-motion';

const ASSET_BASE = '/media/missionaries-cannibals';
const IMG = {
  bg: `${ASSET_BASE}/images/bg1.png`,
  boat: `${ASSET_BASE}/images/boat.png`,
  missionary: `${ASSET_BASE}/images/missionary.png`,
  missionaryHover: `${ASSET_BASE}/images/missionary1.png`,
  cannibal: `${ASSET_BASE}/images/cannibal.png`,
  cannibalHover: `${ASSET_BASE}/images/cannibal1.png`,
  startScreen: `${ASSET_BASE}/images/newgame.png`,
  gameOverScreen: `${ASSET_BASE}/images/gameover.png`,
  winScreen: `${ASSET_BASE}/images/winner.png`,
  soundOn: `${ASSET_BASE}/images/soundon.png`,
  soundOff: `${ASSET_BASE}/images/soundoff.png`,
};

const SND = {
  bg: `${ASSET_BASE}/music/bgmusic.mp3`,
  win: `${ASSET_BASE}/music/won.wav`,
  lose: `${ASSET_BASE}/music/gameover.wav`,
};

const LEVELS = [
  { level: 1, missionaries: 2, cannibals: 2, capacity: 2 },
  { level: 2, missionaries: 3, cannibals: 3, capacity: 2 },
  { level: 3, missionaries: 3, cannibals: 3, capacity: 3 },
  { level: 4, missionaries: 4, cannibals: 4, capacity: 3 },
  { level: 5, missionaries: 4, cannibals: 4, capacity: 4 },
];

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

const MissionariesCannibals = () => {
  const { token, user, updateProgress } = useContext(AuthContext);
  const userProgress = user?.progress || {};
  const currentUnlocked = userProgress['missionaries-cannibals'] || 1;

  const [level, setLevel] = useState(clamp(currentUnlocked, 1, LEVELS.length));
  const [status, setStatus] = useState('idle'); // idle | playing | won | lost
  const [startedAt, setStartedAt] = useState(null);
  const [moves, setMoves] = useState(0);

  const [leftM, setLeftM] = useState(0);
  const [leftC, setLeftC] = useState(0);
  const [rightM, setRightM] = useState(0);
  const [rightC, setRightC] = useState(0);
  const [boatSide, setBoatSide] = useState('left');
  const [boatM, setBoatM] = useState(0);
  const [boatC, setBoatC] = useState(0);

  const [soundEnabled, setSoundEnabled] = useState(true);

  const bgMusicRef = useRef(null);
  const winSfxRef = useRef(null);
  const loseSfxRef = useRef(null);

  const config = LEVELS[level - 1];
  const totalM = config.missionaries;
  const totalC = config.cannibals;
  const capacity = config.capacity;

  const boatCount = boatM + boatC;

  useEffect(() => {
    // Create audio elements once. Playback is triggered by user gesture.
    bgMusicRef.current = new Audio(SND.bg);
    bgMusicRef.current.loop = true;
    bgMusicRef.current.volume = 0.55;

    winSfxRef.current = new Audio(SND.win);
    winSfxRef.current.volume = 0.9;

    loseSfxRef.current = new Audio(SND.lose);
    loseSfxRef.current.volume = 0.9;

    return () => {
      try {
        bgMusicRef.current?.pause();
        bgMusicRef.current = null;
        winSfxRef.current = null;
        loseSfxRef.current = null;
      } catch {
        // ignore
      }
    };
  }, []);

  const stopBg = useCallback(() => {
    const bg = bgMusicRef.current;
    if (!bg) return;
    try {
      bg.pause();
      bg.currentTime = 0;
    } catch {
      // ignore
    }
  }, []);

  const playBg = useCallback(async () => {
    const bg = bgMusicRef.current;
    if (!bg || !soundEnabled) return;
    try {
      await bg.play();
    } catch {
      // ignore
    }
  }, [soundEnabled]);

  const playWin = useCallback(async () => {
    if (!soundEnabled) return;
    try {
      if (winSfxRef.current) winSfxRef.current.currentTime = 0;
      await winSfxRef.current?.play();
    } catch {
      // ignore
    }
  }, [soundEnabled]);

  const playLose = useCallback(async () => {
    if (!soundEnabled) return;
    try {
      if (loseSfxRef.current) loseSfxRef.current.currentTime = 0;
      await loseSfxRef.current?.play();
    } catch {
      // ignore
    }
  }, [soundEnabled]);

  const bankUnsafe = useCallback((m, c) => m > 0 && c > m, []);

  const reset = useCallback(() => {
    stopBg();
    setLeftM(totalM);
    setLeftC(totalC);
    setRightM(0);
    setRightC(0);
    setBoatSide('left');
    setBoatM(0);
    setBoatC(0);
    setMoves(0);
    setStartedAt(Date.now());
    setStatus('playing');
    void playBg();
  }, [stopBg, totalM, totalC, playBg]);

  const onToggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      if (!next) {
        stopBg();
      } else if (status === 'playing') {
        void playBg();
      }
      return next;
    });
  };

  const canLoadFromLeft = boatSide === 'left' && status === 'playing';
  const canLoadFromRight = boatSide === 'right' && status === 'playing';

  const loadMissionary = () => {
    if (status !== 'playing') return;
    if (boatCount >= capacity) return;

    if (boatSide === 'left') {
      if (leftM <= 0) return;
      setLeftM((v) => v - 1);
    } else {
      if (rightM <= 0) return;
      setRightM((v) => v - 1);
    }
    setBoatM((v) => v + 1);
  };

  const loadCannibal = () => {
    if (status !== 'playing') return;
    if (boatCount >= capacity) return;

    if (boatSide === 'left') {
      if (leftC <= 0) return;
      setLeftC((v) => v - 1);
    } else {
      if (rightC <= 0) return;
      setRightC((v) => v - 1);
    }
    setBoatC((v) => v + 1);
  };

  const unloadMissionary = () => {
    if (status !== 'playing') return;
    if (boatM <= 0) return;

    setBoatM((v) => v - 1);
    if (boatSide === 'left') setLeftM((v) => v + 1);
    else setRightM((v) => v + 1);
  };

  const unloadCannibal = () => {
    if (status !== 'playing') return;
    if (boatC <= 0) return;

    setBoatC((v) => v - 1);
    if (boatSide === 'left') setLeftC((v) => v + 1);
    else setRightC((v) => v + 1);
  };

  const saveProgress = useCallback(async (finalResult, timeToCompleteSec, finalMoves, score) => {
    if (!token) return;
    try {
      const res = await fetch('/api/games/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          gameId: 'missionaries-cannibals',
          level,
          score,
          timeToComplete: timeToCompleteSec,
          result: finalResult,
          accuracy: finalResult === 'win' ? 100 : 0,
          moves: finalMoves,
        }),
      });
      const data = await res.json();
      if (data?.progress) updateProgress(data.progress);
    } catch (err) {
      console.error(err);
    }
  }, [token, level, updateProgress]);

  const computeScore = useCallback((timeToCompleteSec, finalMoves, finalResult) => {
    const difficulty = totalM + totalC + capacity; // small scaling factor
    const base = 900 + (difficulty * 120);
    const timePenalty = timeToCompleteSec * 6;
    const movePenalty = finalMoves * 35;
    const resultBonus = finalResult === 'win' ? 250 : 0;
    return Math.max(50, Math.round(base - timePenalty - movePenalty + resultBonus));
  }, [totalM, totalC, capacity]);

  const cross = useCallback(async () => {
    if (status !== 'playing') return;
    if (boatCount <= 0) return;

    const nextSide = boatSide === 'left' ? 'right' : 'left';

    // Transfer boat passengers to the other side
    if (nextSide === 'right') {
      setRightM((v) => v + boatM);
      setRightC((v) => v + boatC);
    } else {
      setLeftM((v) => v + boatM);
      setLeftC((v) => v + boatC);
    }

    const nextMoves = moves + 1;
    setMoves(nextMoves);
    setBoatSide(nextSide);
    setBoatM(0);
    setBoatC(0);

    // Evaluate end-state based on the post-move totals.
    // Since React state updates are async, compute derived values locally.
    const newLeftM = nextSide === 'left' ? leftM + boatM : leftM;
    const newLeftC = nextSide === 'left' ? leftC + boatC : leftC;
    const newRightM = nextSide === 'right' ? rightM + boatM : rightM;
    const newRightC = nextSide === 'right' ? rightC + boatC : rightC;

    const lost = bankUnsafe(newLeftM, newLeftC) || bankUnsafe(newRightM, newRightC);
    const won = newRightM === totalM && newRightC === totalC;

    if (lost || won) {
      const end = Date.now();
      const duration = startedAt ? Math.max(1, Math.round((end - startedAt) / 1000)) : 1;
      const finalResult = won ? 'win' : 'lose';
      const score = computeScore(duration, nextMoves, finalResult);

      if (won) {
        setStatus('won');
        stopBg();
        await playWin();
      } else {
        setStatus('lost');
        stopBg();
        await playLose();
      }

      await saveProgress(finalResult, duration, nextMoves, score);
    }
  }, [status, boatCount, boatSide, boatM, boatC, moves, leftM, leftC, rightM, rightC, totalM, totalC, bankUnsafe, startedAt, computeScore, saveProgress, stopBg, playWin, playLose]);

  const hint = useMemo(() => {
    if (status === 'idle') return 'Pick a level, press Start.';
    if (status === 'playing') return `Load 1–${capacity} passengers, then Cross.`;
    if (status === 'won') return 'You solved it! Start again or try a harder level.';
    return 'Game over — cannibals outnumbered missionaries on a bank.';
  }, [status, capacity]);

  const Scene = () => {
    const endScreen = status === 'idle'
      ? IMG.startScreen
      : status === 'lost'
        ? IMG.gameOverScreen
        : status === 'won'
          ? IMG.winScreen
          : null;

    return (
      <div
        className="glass-panel"
        style={{
          position: 'relative',
          padding: 0,
          overflow: 'hidden',
          borderRadius: '16px',
          minHeight: '360px',
          backgroundImage: `url(${IMG.bg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          border: '1px solid var(--border-light)',
          marginBottom: '14px'
        }}
      >
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.18), rgba(0,0,0,0.35))' }} />

        <button
          type="button"
          onClick={onToggleSound}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 3,
            width: 46,
            height: 46,
            borderRadius: 14,
            border: '1px solid rgba(255,255,255,0.22)',
            background: 'rgba(0,0,0,0.35)',
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer'
          }}
          aria-label={soundEnabled ? 'Sound on' : 'Sound off'}
          title={soundEnabled ? 'Sound on' : 'Sound off'}
        >
          <img src={soundEnabled ? IMG.soundOn : IMG.soundOff} alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} />
        </button>

        {/* Boat */}
        <motion.div
          initial={false}
          animate={{ x: boatSide === 'left' ? -220 : 220 }}
          transition={{ type: 'spring', stiffness: 120, damping: 18 }}
          style={{
            position: 'absolute',
            left: '50%',
            bottom: 18,
            transform: 'translateX(-50%)',
            zIndex: 2,
            width: 190,
            height: 95,
            pointerEvents: 'none'
          }}
        >
          <img src={IMG.boat} alt="Boat" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 10px 12px rgba(0,0,0,0.45))' }} />

          {/* Passengers on boat */}
          <div style={{ position: 'absolute', left: 0, right: 0, top: 18, display: 'flex', justifyContent: 'center', gap: 6 }}>
            {Array.from({ length: boatM }).map((_, idx) => (
              <img key={`scene-bm-${idx}`} src={IMG.missionaryHover} alt="" style={{ width: 26, height: 26, objectFit: 'contain' }} />
            ))}
            {Array.from({ length: boatC }).map((_, idx) => (
              <img key={`scene-bc-${idx}`} src={IMG.cannibalHover} alt="" style={{ width: 26, height: 26, objectFit: 'contain' }} />
            ))}
          </div>
        </motion.div>

        {/* Left/right counts as sprites */}
        <div style={{ position: 'absolute', left: 14, bottom: 30, zIndex: 2, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', maxWidth: 240 }}>
            {Array.from({ length: leftM }).map((_, idx) => (
              <img key={`scene-lm-${idx}`} src={IMG.missionary} alt="" style={{ width: 30, height: 30, objectFit: 'contain' }} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', maxWidth: 240 }}>
            {Array.from({ length: leftC }).map((_, idx) => (
              <img key={`scene-lc-${idx}`} src={IMG.cannibal} alt="" style={{ width: 30, height: 30, objectFit: 'contain' }} />
            ))}
          </div>
        </div>

        <div style={{ position: 'absolute', right: 14, bottom: 30, zIndex: 2, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', maxWidth: 240, justifyContent: 'flex-end' }}>
            {Array.from({ length: rightM }).map((_, idx) => (
              <img key={`scene-rm-${idx}`} src={IMG.missionary} alt="" style={{ width: 30, height: 30, objectFit: 'contain' }} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', maxWidth: 240, justifyContent: 'flex-end' }}>
            {Array.from({ length: rightC }).map((_, idx) => (
              <img key={`scene-rc-${idx}`} src={IMG.cannibal} alt="" style={{ width: 30, height: 30, objectFit: 'contain' }} />
            ))}
          </div>
        </div>

        {/* Hint */}
        <div style={{ position: 'absolute', left: 12, right: 12, bottom: 8, zIndex: 2, display: 'flex', justifyContent: 'center' }}>
          <div style={{ padding: '8px 12px', borderRadius: 12, background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.92)', fontSize: '0.92rem' }}>
            {hint}
          </div>
        </div>

        {/* Start/Win/Lose overlay screenshots */}
        {endScreen && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 4, display: 'grid', placeItems: 'center' }}>
            <div style={{ padding: 14, borderRadius: 16, background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.18)' }}>
              <img src={endScreen} alt="" style={{ width: 'min(720px, 88vw)', height: 'auto', borderRadius: 14, display: 'block' }} />
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
                <button className="btn-primary" onClick={reset}>
                  {status === 'idle' ? 'New Game' : 'Play Again'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const BoatVisual = () => (
    <div
      className="glass-panel"
      style={{
        padding: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        alignItems: 'center',
        minWidth: '260px',
      }}
    >
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
        <div style={{ color: 'var(--text-secondary)' }}>
          Boat: <strong style={{ color: 'var(--text-primary)' }}>{boatSide.toUpperCase()}</strong>
        </div>
        <div style={{ color: 'var(--text-secondary)' }}>
          Capacity: <strong style={{ color: 'var(--text-primary)' }}>{capacity}</strong>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <img
            src={IMG.missionary}
            alt="Missionary"
            style={{ width: 28, height: 28, objectFit: 'contain', opacity: boatM ? 1 : 0.55 }}
          />
          <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{boatM}</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <img
            src={IMG.cannibal}
            alt="Cannibal"
            style={{ width: 28, height: 28, objectFit: 'contain', opacity: boatC ? 1 : 0.55 }}
          />
          <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{boatC}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button className="btn-outline" onClick={unloadMissionary} disabled={status !== 'playing' || boatM <= 0}>Unload M</button>
        <button className="btn-outline" onClick={unloadCannibal} disabled={status !== 'playing' || boatC <= 0}>Unload C</button>
        <button className="btn-primary" onClick={cross} disabled={status !== 'playing' || boatCount <= 0}>Cross</button>
      </div>

      <div style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', textAlign: 'center' }}>{hint}</div>
    </div>
  );

  const BankPanel = ({ title, side, m, c, canLoad, unsafe }) => (
    <div
      className="glass-panel"
      style={{
        padding: '16px',
        flex: 1,
        minWidth: '260px',
        borderLeft: unsafe ? '4px solid var(--accent-red)' : '4px solid var(--border-light)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '10px', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>{title}</h3>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{side === boatSide ? 'Boat here' : ''}</span>
      </div>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <img
            src={IMG.missionary}
            alt="Missionary"
            style={{ width: 30, height: 30, objectFit: 'contain' }}
          />
          <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{m}</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <img
            src={IMG.cannibal}
            alt="Cannibal"
            style={{ width: 30, height: 30, objectFit: 'contain' }}
          />
          <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{c}</span>
        </div>

        {unsafe && (
          <span style={{ color: 'var(--accent-red)', fontWeight: 700 }}>Unsafe</span>
        )}
      </div>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button
          className="btn-outline"
          onClick={loadMissionary}
          disabled={!canLoad || boatCount >= capacity || m <= 0}
          title="Load a missionary onto the boat"
        >
          Load M
        </button>
        <button
          className="btn-outline"
          onClick={loadCannibal}
          disabled={!canLoad || boatCount >= capacity || c <= 0}
          title="Load a cannibal onto the boat"
        >
          Load C
        </button>
      </div>
    </div>
  );

  const leftUnsafe = bankUnsafe(leftM, leftC);
  const rightUnsafe = bankUnsafe(rightM, rightC);

  return (
    <div style={{ padding: 'clamp(10px, 2.4vw, 20px)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '14px' }}>
        <div>
          <h2 className="text-gradient" style={{ marginBottom: 6 }}>Missionaries & Cannibals</h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            Move everyone to the right bank. Don\'t ever leave cannibals outnumbering missionaries on either bank.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            className="form-input game-level-select"
            style={{ width: '220px', padding: '8px' }}
            value={level}
            disabled={status === 'playing'}
            onChange={(e) => {
              const nextLevel = Number(e.target.value);
              if (nextLevel > currentUnlocked && currentUnlocked < 5) return;
              setLevel(nextLevel);
            }}
          >
            {LEVELS.map((lvl) => (
              <option key={lvl.level} value={lvl.level}>
                Level {lvl.level} ({lvl.missionaries}M/{lvl.cannibals}C, boat {lvl.capacity}) {lvl.level > currentUnlocked ? '🔒' : ''}
              </option>
            ))}
          </select>

          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Unlocked: Level {currentUnlocked}</span>

          <button className="btn-primary" onClick={reset}>Start</button>
          <button className="btn-outline" onClick={reset} disabled={status !== 'playing'}>Restart</button>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '14px 16px', marginBottom: '14px', display: 'flex', gap: '14px', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div style={{ color: 'var(--text-secondary)' }}>
          Status: <strong style={{ color: 'var(--text-primary)' }}>{status}</strong>
        </div>
        <div style={{ color: 'var(--text-secondary)' }}>
          Moves: <strong style={{ color: 'var(--text-primary)' }}>{moves}</strong>
        </div>
        <div style={{ color: 'var(--text-secondary)' }}>
          Target: <strong style={{ color: 'var(--text-primary)' }}>{totalM}M / {totalC}C</strong>
        </div>
      </div>

      <Scene />

      <div style={{ display: 'flex', gap: '14px', alignItems: 'stretch', flexWrap: 'wrap' }}>
        <BankPanel title="Left Bank" side="left" m={leftM} c={leftC} canLoad={canLoadFromLeft} unsafe={leftUnsafe} />
        <BoatVisual />
        <BankPanel title="Right Bank" side="right" m={rightM} c={rightC} canLoad={canLoadFromRight} unsafe={rightUnsafe} />
      </div>
    </div>
  );
};

export default MissionariesCannibals;
