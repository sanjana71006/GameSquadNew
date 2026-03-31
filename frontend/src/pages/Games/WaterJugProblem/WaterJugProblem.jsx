import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AuthContext } from '../../../context/AuthContext';

const INITIAL_TIMER = 300; // 5 minutes
const INITIAL_HINTS = 2;

const LEVELS = [
  { a: 4, b: 3, target: 2 },
  { a: 5, b: 3, target: 4 },
  { a: 7, b: 4, target: 5 },
  { a: 8, b: 5, target: 3 },
  { a: 9, b: 6, target: 7 },
];

const DESCRIBE_MOVE = {
  fillA: 'Fill Jug A',
  fillB: 'Fill Jug B',
  emptyA: 'Empty Jug A',
  emptyB: 'Empty Jug B',
  pourAB: 'Pour from A to B',
  pourBA: 'Pour from B to A',
};

const gcd = (x, y) => {
  let a = Math.abs(x);
  let b = Math.abs(y);
  while (b !== 0) {
    const t = a % b;
    a = b;
    b = t;
  }
  return a;
};

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const getPossibleMoves = (a, b, capA, capB) => {
  const moves = [];
  if (a < capA) moves.push('fillA');
  if (b < capB) moves.push('fillB');
  if (a > 0) moves.push('emptyA');
  if (b > 0) moves.push('emptyB');
  if (a > 0 && b < capB) moves.push('pourAB');
  if (b > 0 && a < capA) moves.push('pourBA');
  return moves;
};

const applyMove = (move, a, b, capA, capB) => {
  let newA = a;
  let newB = b;

  switch (move) {
    case 'fillA':
      newA = capA;
      break;
    case 'fillB':
      newB = capB;
      break;
    case 'emptyA':
      newA = 0;
      break;
    case 'emptyB':
      newB = 0;
      break;
    case 'pourAB': {
      const pour = Math.min(a, capB - b);
      newA = a - pour;
      newB = b + pour;
      break;
    }
    case 'pourBA': {
      const pour = Math.min(b, capA - a);
      newB = b - pour;
      newA = a + pour;
      break;
    }
    default:
      break;
  }

  return [newA, newB];
};

const findSolution = (startA, startB, capA, capB, target) => {
  // BFS shortest path from current state to target.
  const startKey = `${startA},${startB}`;
  const queue = [{ state: [startA, startB], path: [] }];
  const visited = new Set([startKey]);

  while (queue.length > 0) {
    const { state, path } = queue.shift();
    const [a, b] = state;

    if (a === target || b === target) return path;

    const moves = getPossibleMoves(a, b, capA, capB);
    for (const move of moves) {
      const [newA, newB] = applyMove(move, a, b, capA, capB);
      const key = `${newA},${newB}`;
      if (visited.has(key)) continue;
      visited.add(key);
      queue.push({ state: [newA, newB], path: [...path, move] });
    }
  }

  return null;
};

const computeScore = ({
  steps,
  optimalSteps,
  mistakes,
  timeLeft,
}) => {
  const timeBonus = Math.max(0, timeLeft);
  const stepPenalty = Math.max(0, steps - optimalSteps) * 10;
  const mistakePenalty = mistakes * 50;
  return Math.max(0, 1000 + timeBonus - stepPenalty - mistakePenalty);
};

const storageKeyForLevel = (level) => `water-jug-problem_level_${level}`;

const WaterJugProblem = () => {
  const { token } = useContext(AuthContext);

  const [setupVisible, setSetupVisible] = useState(true);
  const [setupA, setSetupA] = useState(4);
  const [setupB, setSetupB] = useState(3);
  const [setupTarget, setSetupTarget] = useState(2);

  const [level, setLevel] = useState(1);

  const [capA, setCapA] = useState(4);
  const [capB, setCapB] = useState(3);
  const [target, setTarget] = useState(2);

  const [a, setA] = useState(0);
  const [b, setB] = useState(0);
  const [steps, setSteps] = useState(0);
  const [timerLeft, setTimerLeft] = useState(INITIAL_TIMER);
  const [optimalSteps, setOptimalSteps] = useState(0);
  const [hintCount, setHintCount] = useState(INITIAL_HINTS);
  const [mistakes, setMistakes] = useState(0);
  const [score, setScore] = useState(0);
  const [won, setWon] = useState(false);
  const [ended, setEnded] = useState(false);
  const [message, setMessage] = useState('');

  const [leaderboardOpen, setLeaderboardOpen] = useState(false);

  const timerRef = useRef(null);
  const actionLockRef = useRef(false);

  const isSolvable = useMemo(() => {
    if (target <= 0) return false;
    if (target > Math.max(capA, capB)) return false;
    return target % gcd(capA, capB) === 0;
  }, [capA, capB, target]);

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startTimer = () => {
    stopTimer();
    timerRef.current = setInterval(() => {
      setTimerLeft((t) => {
        if (t <= 1) {
          stopTimer();
          setEnded(true);
          setWon(false);
          setMessage("Time's up! Game over.");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  const resetRun = ({ startCountdown }) => {
    setA(0);
    setB(0);
    setSteps(0);
    setTimerLeft(INITIAL_TIMER);
    setHintCount(INITIAL_HINTS);
    setMistakes(0);
    setScore(0);
    setWon(false);
    setEnded(false);
    setMessage('');

    if (startCountdown) startTimer();
    else stopTimer();
  };

  useEffect(() => {
    return () => {
      stopTimer();
    };
  }, []);

  const submitProgress = async ({
    result,
    stepsTaken,
    computedScore,
    elapsed,
    accuracy,
  }) => {
    if (!token) return;

    try {
      await fetch('/api/games/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          gameId: 'water-jug-problem',
          level,
          score: computedScore,
          timeToComplete: elapsed,
          result,
          moves: stepsTaken,
          accuracy,
        }),
      });
    } catch (err) {
      // Non-blocking
      console.error('Error submitting progress:', err);
    }
  };

  const saveLocalScore = ({ stepsTaken, timeRemaining }) => {
    try {
      const key = storageKeyForLevel(level);
      const scores = JSON.parse(localStorage.getItem(key) || '[]');
      // Match original: store remaining time (lower elapsed => higher remaining).
      scores.push({ steps: stepsTaken, time: timeRemaining });
      scores.sort((x, y) => x.steps - y.steps || y.time - x.time);
      scores.splice(5);
      localStorage.setItem(key, JSON.stringify(scores));
    } catch {
      // ignore
    }
  };

  const startGame = () => {
    const nextA = Math.max(1, Number.parseInt(setupA, 10) || 1);
    const nextB = Math.max(1, Number.parseInt(setupB, 10) || 1);
    const nextTarget = Math.max(1, Number.parseInt(setupTarget, 10) || 1);

    if (nextTarget > Math.max(nextA, nextB)) {
      setMessage('Target cannot be larger than the largest jug!');
      return;
    }

    if (nextTarget % gcd(nextA, nextB) !== 0) {
      setMessage('No solution exists for this setup. Try different capacities/target.');
      return;
    }

    setLevel(1);
    setCapA(nextA);
    setCapB(nextB);
    setTarget(nextTarget);

    const solution = findSolution(0, 0, nextA, nextB, nextTarget);
    setOptimalSteps(solution ? solution.length : 0);

    setSetupVisible(false);
    resetRun({ startCountdown: true });
  };

  const nextLevel = () => {
    if (level >= LEVELS.length) {
      setMessage('Congratulations! You completed all levels!');
      return;
    }

    const next = level + 1;
    const lvl = LEVELS[next - 1];

    setLevel(next);
    setCapA(lvl.a);
    setCapB(lvl.b);
    setTarget(lvl.target);

    const solution = findSolution(0, 0, lvl.a, lvl.b, lvl.target);
    setOptimalSteps(solution ? solution.length : 0);

    resetRun({ startCountdown: true });
    setMessage(`Level ${next} started: ${lvl.a}L A, ${lvl.b}L B, target ${lvl.target}L.`);
  };

  const performAction = async (action) => {
    // Prevent rapid multi-clicks from applying moves against stale render state.
    if (actionLockRef.current) return;
    actionLockRef.current = true;
    queueMicrotask(() => {
      actionLockRef.current = false;
    });

    if (won || ended) return;

    const prevA = a;
    const prevB = b;
    const [newA, newB] = applyMove(action, prevA, prevB, capA, capB);

    if (newA === prevA && newB === prevB) {
      const nextMistakes = mistakes + 1;
      setMistakes(nextMistakes);
      setMessage(`Invalid move! No change in state. Mistake count: ${nextMistakes}`);
      return;
    }

    const nextSteps = steps + 1;
    setA(newA);
    setB(newB);
    setSteps(nextSteps);

    if (newA === target || newB === target) {
      stopTimer();
      setWon(true);
      setEnded(true);

      const elapsed = INITIAL_TIMER - timerLeft;
      const computedScore = computeScore({
        steps: nextSteps,
        optimalSteps,
        mistakes,
        timeLeft: timerLeft,
      });

      const accuracy = optimalSteps > 0
        ? Math.max(0, Math.min(100, Math.round((optimalSteps / nextSteps) * 100)))
        : 100;

      setScore(computedScore);
      saveLocalScore({ stepsTaken: nextSteps, timeRemaining: timerLeft });

      void submitProgress({
        result: 'win',
        stepsTaken: nextSteps,
        computedScore,
        elapsed,
        accuracy,
      });

      setMessage(
        `Congratulations! You solved it in ${nextSteps} steps (${optimalSteps} optimal), ${formatTime(elapsed)} time, ${mistakes} mistakes. Score: ${computedScore}!`
      );
    } else {
      setMessage('');
    }
  };

  const getHint = () => {
    if (won || ended) return;

    if (hintCount <= 0) {
      setMessage('No hints left!');
      return;
    }

    if (a === target || b === target) {
      setMessage('You already reached the target!');
      return;
    }

    const solution = findSolution(a, b, capA, capB, target);
    if (!solution || solution.length === 0) {
      setMessage('No solution found!');
      return;
    }

    const nextHintCount = hintCount - 1;
    setHintCount(nextHintCount);
    const nextMove = solution[0];
    setMessage(`Hint (${nextHintCount} left): Try ${DESCRIBE_MOVE[nextMove] || nextMove}`);
  };

  const scores = useMemo(() => {
    try {
      const key = storageKeyForLevel(level);
      const raw = JSON.parse(localStorage.getItem(key) || '[]');
      if (!Array.isArray(raw)) return [];
      return raw;
    } catch {
      return [];
    }
  }, [level, leaderboardOpen]);

  const jugStyle = {
    width: '86px',
    height: '220px',
    border: '1px solid var(--border-light)',
    borderRadius: '0 0 12px 12px',
    position: 'relative',
    overflow: 'hidden',
    background: 'rgba(255,255,255,0.04)',
  };

  const waterStyle = (current, cap) => ({
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: `${cap > 0 ? (current / cap) * 100 : 0}%`,
    background: 'linear-gradient(180deg, rgba(0,240,255,0.85), rgba(0,240,255,0.35))',
    transition: 'height 250ms ease',
  });

  const actionButtonStyle = {
    background: 'linear-gradient(45deg, rgba(0, 240, 255, 0.22), rgba(176, 38, 255, 0.14))',
    border: '1px solid var(--border-light)',
    color: 'var(--text-primary)',
    padding: '10px 10px',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: 600,
  };

  const disabledActionButtonStyle = {
    ...actionButtonStyle,
    opacity: 0.5,
    cursor: 'not-allowed',
  };

  return (
    <div style={{ padding: 'clamp(10px, 2.4vw, 20px)' }}>
      <motion.h2
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          color: 'var(--accent-blue)',
          fontSize: 'clamp(1.6rem, 5vw, 2.2rem)',
          marginBottom: '12px',
          textAlign: 'center',
        }}
      >
        Water Jug Puzzle
      </motion.h2>

      {setupVisible ? (
        <div className="glass-panel" style={{ padding: '16px', maxWidth: '860px', margin: '0 auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
            alignItems: 'end',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>Jug A Capacity</label>
              <input
                type="number"
                min={1}
                value={setupA}
                onChange={(e) => setSetupA(e.target.value)}
                style={{
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-light)',
                  background: 'rgba(255,255,255,0.06)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>Jug B Capacity</label>
              <input
                type="number"
                min={1}
                value={setupB}
                onChange={(e) => setSetupB(e.target.value)}
                style={{
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-light)',
                  background: 'rgba(255,255,255,0.06)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>Target Amount</label>
              <input
                type="number"
                min={1}
                value={setupTarget}
                onChange={(e) => setSetupTarget(e.target.value)}
                style={{
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-light)',
                  background: 'rgba(255,255,255,0.06)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button className="btn-primary" onClick={startGame} style={{ width: '100%', maxWidth: '200px' }}>
                Start Game
              </button>
            </div>
          </div>

          {!!message && (
            <div style={{ marginTop: '12px', color: 'var(--accent-red)', fontWeight: 700, textAlign: 'center' }}>
              {message}
            </div>
          )}

          <div style={{ marginTop: '12px', color: 'var(--text-secondary)', textAlign: 'center', fontSize: '0.95rem' }}>
            Goal: get exactly <strong>{setupTarget}</strong>L in Jug A or Jug B.
          </div>
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '16px', maxWidth: '900px', margin: '0 auto' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '18px',
            flexWrap: 'wrap',
            marginBottom: '14px',
            color: 'var(--text-secondary)',
            fontWeight: 600,
          }}>
            <div><strong style={{ color: 'var(--text-primary)' }}>Level:</strong> {level}/{LEVELS.length}</div>
            <div><strong style={{ color: 'var(--text-primary)' }}>Steps:</strong> {steps}</div>
            <div><strong style={{ color: 'var(--text-primary)' }}>Optimal:</strong> {optimalSteps}</div>
            <div><strong style={{ color: 'var(--text-primary)' }}>Time:</strong> {formatTime(timerLeft)}</div>
            <div><strong style={{ color: 'var(--text-primary)' }}>Target:</strong> {target}L</div>
          </div>

          {!isSolvable && (
            <div style={{ marginBottom: '12px', color: 'var(--accent-red)', fontWeight: 700, textAlign: 'center' }}>
              This setup has no solution.
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'center', gap: '42px', flexWrap: 'wrap', margin: '20px 0' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>Jug A ({capA}L)</div>
              <div style={jugStyle}>
                <div style={waterStyle(a, capA)} />
              </div>
              <div style={{ fontWeight: 800, color: 'var(--text-secondary)' }}>{a}L</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>Jug B ({capB}L)</div>
              <div style={jugStyle}>
                <div style={waterStyle(b, capB)} />
              </div>
              <div style={{ fontWeight: 800, color: 'var(--text-secondary)' }}>{b}L</div>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '10px',
            marginBottom: '12px',
          }}>
            {[
              { key: 'fillA', label: 'Fill A' },
              { key: 'fillB', label: 'Fill B' },
              { key: 'emptyA', label: 'Empty A' },
              { key: 'emptyB', label: 'Empty B' },
              { key: 'pourAB', label: 'Pour A→B' },
              { key: 'pourBA', label: 'Pour B→A' },
            ].map((btn) => {
              const disabled = won || ended || !isSolvable;
              return (
                <button
                  key={btn.key}
                  onClick={() => void performAction(btn.key)}
                  disabled={disabled}
                  style={disabled ? disabledActionButtonStyle : actionButtonStyle}
                >
                  {btn.label}
                </button>
              );
            })}
          </div>

          {!!message && (
            <div style={{
              minHeight: '28px',
              margin: '10px 0 6px',
              textAlign: 'center',
              fontWeight: 700,
              color: won ? 'var(--accent-green)' : 'var(--accent-red)',
            }}>
              {message}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
            <button className="btn-primary" onClick={getHint} disabled={won || ended || !isSolvable}>
              Get Hint
            </button>
            <button className="btn-primary" onClick={() => resetRun({ startCountdown: true })}>
              Reset
            </button>
            <button
              className="btn-primary"
              onClick={nextLevel}
              style={{ display: won ? 'inline-block' : 'none' }}
            >
              Next Level
            </button>
            <button className="btn-primary" onClick={() => setLeaderboardOpen(true)}>
              Leaderboard
            </button>
          </div>

          {leaderboardOpen && (
            <div
              role="dialog"
              aria-modal="true"
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.55)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px',
                zIndex: 50,
              }}
              onClick={() => setLeaderboardOpen(false)}
            >
              <div
                className="glass-panel"
                style={{
                  width: 'min(560px, 100%)',
                  padding: '16px',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                    Level {level} Leaderboard
                  </h3>
                  <button
                    onClick={() => setLeaderboardOpen(false)}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--border-light)',
                      color: 'var(--text-primary)',
                      borderRadius: '10px',
                      padding: '6px 10px',
                      cursor: 'pointer',
                      fontWeight: 800,
                    }}
                  >
                    ✕
                  </button>
                </div>

                <div style={{ marginTop: '12px' }}>
                  {scores.length === 0 ? (
                    <div style={{ color: 'var(--text-secondary)' }}>No scores yet!</div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-primary)' }}>
                      <thead>
                        <tr style={{ textAlign: 'left', color: 'var(--text-secondary)' }}>
                          <th style={{ padding: '8px 6px' }}>Rank</th>
                          <th style={{ padding: '8px 6px' }}>Steps</th>
                          <th style={{ padding: '8px 6px' }}>Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scores.map((row, idx) => (
                          <tr key={`${row.steps}-${row.time ?? row.elapsed ?? idx}-${idx}`} style={{ borderTop: '1px solid var(--border-light)' }}>
                            <td style={{ padding: '8px 6px' }}>{idx + 1}</td>
                            <td style={{ padding: '8px 6px' }}>{row.steps}</td>
                            <td style={{ padding: '8px 6px' }}>
                              {formatTime(
                                typeof row.time === 'number'
                                  ? row.time
                                  : typeof row.elapsed === 'number'
                                    ? Math.max(0, INITIAL_TIMER - row.elapsed)
                                    : 0
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WaterJugProblem;
