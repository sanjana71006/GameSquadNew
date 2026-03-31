import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AuthContext } from '../../../context/AuthContext';

const LEVELS = [
  { name: 'Ninja Aspirant', role: 'Trainee' },
  { name: 'Digital Specialist', role: 'Developer' },
  { name: 'Prime Architect', role: 'Lead' },
  { name: 'Innovation Head', role: 'Manager' },
  { name: 'Global Delivery Chief', role: 'Executive' },
];

const DEPTS = ['R&D', 'Cloud', 'HR', 'UX Lab', 'Finance', 'Sales', 'AI Lab', 'Security', 'Support'];

const pickTreasureSpots = () => {
  const all = Array.from({ length: 9 }, (_, i) => i);
  for (let i = all.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all.slice(0, 3);
};

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

const createAudioContext = () => {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  return new Ctx();
};

const playSfx = (audioCtx, frequency, type, volume = 0.1) => {
  if (!audioCtx) return;

  try {
    if (audioCtx.state === 'suspended') {
      void audioCtx.resume();
    }

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
    gain.gain.setValueAtTime(volume, audioCtx.currentTime);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
  } catch {
    // ignore
  }
};

const TcsCareerAscent = () => {
  const { token, user, updateProgress } = useContext(AuthContext);
  const userProgress = user?.progress || {};
  const currentUnlocked = userProgress['tcs-career-ascent'] || 1;

  const [level, setLevel] = useState(clamp(currentUnlocked, 1, 5));
  const [found, setFound] = useState(0);
  const [treasureSpots, setTreasureSpots] = useState(() => pickTreasureSpots());
  const [statusMsg, setStatusMsg] = useState('Find 3 Knowledge Tokens to impress the panel!');
  const [gridState, setGridState] = useState(() => Array.from({ length: 9 }, () => 'idle'));
  const [showProceed, setShowProceed] = useState(false);

  const [clicks, setClicks] = useState(0);
  const startedAtRef = useRef(Date.now());

  const audioCtxRef = useRef(null);

  const interviewerActive = useMemo(() => {
    return [found >= 1, found >= 2, found >= 3];
  }, [found]);

  const initLevel = (nextLevel) => {
    setFound(0);
    setClicks(0);
    startedAtRef.current = Date.now();

    setTreasureSpots(pickTreasureSpots());
    setGridState(Array.from({ length: 9 }, () => 'idle'));

    setStatusMsg('Scanning for tokens...');
    setShowProceed(false);

    // Match the original vibe: after init, show the prompt message.
    setTimeout(() => {
      setStatusMsg('Find 3 Knowledge Tokens to impress the panel!');
    }, 250);

    setLevel(nextLevel);
  };

  useEffect(() => {
    audioCtxRef.current = createAudioContext();
    return () => {
      try {
        audioCtxRef.current?.close();
      } catch {
        // ignore
      }
      audioCtxRef.current = null;
    };
  }, []);

  useEffect(() => {
    initLevel(clamp(currentUnlocked, 1, 5));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUnlocked]);

  const submitProgress = async ({ clearedLevel, moves, seconds }) => {
    if (!token) return;

    const accuracy = moves > 0 ? Math.floor((3 / moves) * 100) : 100;
    const score = Math.max(0, 1000 - (moves * 60) - (seconds * 2));

    try {
      const res = await fetch('/api/games/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          gameId: 'tcs-career-ascent',
          level: clearedLevel,
          score,
          timeToComplete: seconds,
          result: 'win',
          accuracy,
          moves,
        }),
      });

      const data = await res.json().catch(() => null);
      if (data?.progress) updateProgress?.(data.progress);
    } catch (err) {
      console.error(err);
    }
  };

  const onScan = (idx) => {
    if (gridState[idx] !== 'idle') return;

    setClicks((c) => c + 1);

    const isTreasure = treasureSpots.includes(idx);

    if (isTreasure) {
      setGridState((prev) => {
        const next = [...prev];
        next[idx] = 'found';
        return next;
      });

      setFound((prevFound) => {
        const nextFound = prevFound + 1;

        playSfx(audioCtxRef.current, 600 + (nextFound * 100), 'sine');

        if (nextFound === 3) {
          setStatusMsg('Panel Impressed! Round Cleared.');
          setShowProceed(true);
          playSfx(audioCtxRef.current, 800, 'triangle', 0.2);

          const seconds = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
          const moves = clicks + 1;
          void submitProgress({ clearedLevel: level, moves, seconds });
        }

        return nextFound;
      });
    } else {
      setGridState((prev) => {
        const next = [...prev];
        next[idx] = 'miss';
        return next;
      });

      playSfx(audioCtxRef.current, 150, 'square', 0.05);
    }
  };

  const nextLevel = () => {
    if (!showProceed) return;

    if (level < LEVELS.length) {
      initLevel(level + 1);
      return;
    }

    // Match original: alert then reset.
    // eslint-disable-next-line no-alert
    alert('OFFER CONFIRMED!\n\nYou have successfully completed all 5 levels of the TCS Recruitment Journey.');
    initLevel(1);
  };

  return (
    <div style={{ padding: 'clamp(10px, 2.4vw, 20px)' }}>
      <div style={{ textAlign: 'center', marginBottom: '12px' }}>
        <div
          style={{
            fontSize: '28px',
            fontWeight: 900,
            color: 'var(--accent-blue)',
            letterSpacing: '2px',
            fontFamily: 'var(--font-display)',
          }}
        >
          TCS
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '-8px' }}>Building on Belief</div>
      </div>

      <div className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto', padding: '18px' }}>
        <div style={{ fontWeight: 800, color: 'var(--accent-blue)', fontSize: '18px', marginBottom: '10px' }}>
          Level {level}: {LEVELS[level - 1].name}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '20px',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid var(--border-light)',
            padding: '12px',
            borderRadius: '12px',
            marginBottom: '16px',
          }}
        >
          {[{ id: 1, icon: '👨‍💼' }, { id: 2, icon: '👩‍💻' }, { id: 3, icon: '👨‍💻' }].map((x, i) => (
            <div
              key={x.id}
              style={{
                fontSize: '40px',
                filter: interviewerActive[i] ? 'grayscale(0%)' : 'grayscale(100%)',
                transform: interviewerActive[i] ? 'scale(1.1)' : 'scale(1)',
                transition: 'transform 180ms ease, filter 180ms ease',
              }}
            >
              {x.icon}
            </div>
          ))}
        </div>

        <div style={{ marginBottom: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
          {statusMsg}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            marginBottom: '16px',
          }}
        >
          {DEPTS.map((dept, idx) => {
            const s = gridState[idx];
            const isFound = s === 'found';
            const isMiss = s === 'miss';

            return (
              <motion.button
                key={dept}
                type="button"
                onClick={() => onScan(idx)}
                disabled={isMiss || isFound || showProceed}
                whileHover={{ scale: isMiss || isFound || showProceed ? 1 : 1.02 }}
                whileTap={{ scale: isMiss || isFound || showProceed ? 1 : 0.98 }}
                style={{
                  padding: '14px 6px',
                  background: isFound
                    ? 'linear-gradient(45deg, rgba(255, 215, 0, 0.95), rgba(255, 215, 0, 0.6))'
                    : 'rgba(255,255,255,0.06)',
                  border: '1px solid var(--border-light)',
                  borderColor: isFound ? 'rgba(255, 215, 0, 0.85)' : 'var(--border-light)',
                  borderRadius: '10px',
                  cursor: isMiss || isFound || showProceed ? 'default' : 'pointer',
                  fontWeight: 700,
                  fontSize: '14px',
                  color: isFound ? '#121212' : 'var(--text-primary)',
                  opacity: isMiss ? 0.35 : 1,
                }}
              >
                {isFound ? '💎' : dept}
              </motion.button>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '16px' }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '999px',
                background: found >= i ? 'rgba(255, 215, 0, 0.9)' : 'rgba(255,255,255,0.12)',
                boxShadow: found >= i ? '0 0 10px rgba(255, 215, 0, 0.35)' : 'none',
                border: '1px solid var(--border-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                color: found >= i ? '#121212' : 'transparent',
              }}
            >
              {found >= i ? '✔' : ''}
            </div>
          ))}
        </div>

        <button
          className="btn-primary"
          onClick={nextLevel}
          style={{ display: showProceed ? 'inline-block' : 'none' }}
        >
          PROCEED TO NEXT ROUND
        </button>
      </div>
    </div>
  );
};

export default TcsCareerAscent;
