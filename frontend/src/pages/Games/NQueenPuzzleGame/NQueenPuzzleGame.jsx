import { useCallback, useContext, useMemo, useState } from 'react';
import { AuthContext } from '../../../context/AuthContext';
import { motion } from 'framer-motion';
import { SFX } from '../../../utils/sounds';

const LEVELS = [
  { level: 1, size: 4 },
  { level: 2, size: 5 },
  { level: 3, size: 6 },
  { level: 4, size: 7 },
  { level: 5, size: 8 },
];

const keyOf = (r, c) => `${r}-${c}`;

const NQueenPuzzleGame = () => {
  const { token, user, updateProgress } = useContext(AuthContext);
  const userProgress = user?.progress || {};
  const currentUnlocked = userProgress['n-queen-puzzle'] || 1;

  const [level, setLevel] = useState(Math.min(LEVELS.length, currentUnlocked));
  const [status, setStatus] = useState('idle');
  const [queens, setQueens] = useState([]);
  const [startedAt, setStartedAt] = useState(null);
  const [usedHint, setUsedHint] = useState(false);

  const config = LEVELS[level - 1];
  const size = config.size;

  const blockedSet = useMemo(() => {
    const blocked = new Set();
    queens.forEach(({ r, c }) => {
      for (let i = 0; i < size; i++) {
        blocked.add(keyOf(r, i));
        blocked.add(keyOf(i, c));
      }
      for (let dr = -size; dr <= size; dr++) {
        const nr = r + dr;
        const nc = c + dr;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) blocked.add(keyOf(nr, nc));
      }
      for (let dr = -size; dr <= size; dr++) {
        const nr = r + dr;
        const nc = c - dr;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) blocked.add(keyOf(nr, nc));
      }
    });
    return blocked;
  }, [queens, size]);

  const isCellBlocked = useCallback((r, c) => blockedSet.has(keyOf(r, c)), [blockedSet]);

  const clearBoard = useCallback(() => {
    setQueens([]);
    setStatus('playing');
    setStartedAt(Date.now());
    setUsedHint(false);
    SFX.gameStart();
  }, []);

  const saveProgress = useCallback(async (finalResult, timeToComplete, moves, score) => {
    if (!token) return;
    try {
      const res = await fetch('/api/games/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          gameId: 'n-queen-puzzle',
          level,
          score,
          timeToComplete,
          result: finalResult,
          accuracy: Math.max(0, Math.min(100, Math.floor((queens.length / size) * 100))),
          moves,
        }),
      });
      const data = await res.json();
      if (data?.progress) updateProgress(data.progress);
    } catch (error) {
      console.error(error);
    }
  }, [token, level, queens.length, size]);

  const onWin = useCallback(async (nextQueens) => {
    const end = Date.now();
    const duration = startedAt ? Math.max(1, Math.round((end - startedAt) / 1000)) : 1;
    const score = Math.max(100, (size * 300) - (duration * 8) - (usedHint ? 120 : 0));
    setStatus('won');
    SFX.bonus();
    await saveProgress('win', duration, nextQueens.length, score);
  }, [saveProgress, size, startedAt, usedHint]);

  const startGame = () => {
    setQueens([]);
    setStatus('playing');
    setStartedAt(Date.now());
    setUsedHint(false);
    SFX.gameStart();
  };

  const placeQueen = async (r, c) => {
    if (status !== 'playing') return;

    const exists = queens.some((q) => q.r === r && q.c === c);
    if (exists) {
      const filtered = queens.filter((q) => !(q.r === r && q.c === c));
      setQueens(filtered);
      return;
    }

    if (isCellBlocked(r, c)) {
      SFX.gameOver();
      return;
    }

    const nextQueens = [...queens, { r, c }];
    setQueens(nextQueens);

    if (nextQueens.length === size) {
      await onWin(nextQueens);
    }
  };

  const solveNQueen = useCallback((n) => {
    const board = Array.from({ length: n }, () => Array(n).fill(0));

    const safe = (row, col) => {
      for (let i = 0; i < col; i++) if (board[row][i]) return false;
      for (let i = row, j = col; i >= 0 && j >= 0; i--, j--) if (board[i][j]) return false;
      for (let i = row, j = col; i < n && j >= 0; i++, j--) if (board[i][j]) return false;
      return true;
    };

    const solver = (col) => {
      if (col >= n) return true;
      for (let i = 0; i < n; i++) {
        if (safe(i, col)) {
          board[i][col] = 1;
          if (solver(col + 1)) return true;
          board[i][col] = 0;
        }
      }
      return false;
    };

    if (!solver(0)) return null;
    const result = [];
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (board[r][c] === 1) result.push({ r, c });
      }
    }
    return result;
  }, []);

  const getHelp = () => {
    if (status !== 'playing') return;
    const solved = solveNQueen(size);
    if (!solved) {
      SFX.gameOver();
      return;
    }
    setQueens(solved);
    setUsedHint(true);
    void onWin(solved);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', padding: '20px' }}>
      <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', marginBottom: '18px', gap: '10px', flexWrap: 'wrap' }}>
        <div>
          <h2 className="text-gradient">N-Queen Puzzle</h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Place {size} queens so no two attack each other.</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <select
            className="form-input"
            style={{ width: '150px', padding: '8px' }}
            value={level}
            disabled={status === 'playing'}
            onChange={(e) => setLevel(Number(e.target.value))}
          >
            {LEVELS.map((lvl) => (
              <option key={lvl.level} value={lvl.level} disabled={lvl.level > currentUnlocked && currentUnlocked < 5}>
                Level {lvl.level} ({lvl.size}x{lvl.size}) {lvl.level > currentUnlocked ? '🔒' : ''}
              </option>
            ))}
          </select>

          <button className="btn-primary" onClick={startGame}>Start</button>
          <button className="btn-outline" onClick={clearBoard}>Clear Grid</button>
          <button className="btn-outline" onClick={getHelp}>Get Help</button>
        </div>
      </div>

      <div className="glass-panel" style={{ width: '100%', maxWidth: '840px', padding: '20px', marginBottom: '16px' }}>
        <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
          <span>Status: <strong style={{ color: 'var(--text-primary)' }}>{status}</strong></span>
          <span>Queens Placed: <strong style={{ color: 'var(--text-primary)' }}>{queens.length}/{size}</strong></span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${size}, minmax(36px, 1fr))`,
            gap: '4px',
            background: 'rgba(0,0,0,0.25)',
            padding: '10px',
            borderRadius: '12px'
          }}
        >
          {Array.from({ length: size * size }).map((_, idx) => {
            const r = Math.floor(idx / size);
            const c = idx % size;
            const dark = (r + c) % 2 === 1;
            const hasQueen = queens.some((q) => q.r === r && q.c === c);
            const blocked = isCellBlocked(r, c) && !hasQueen;

            return (
              <motion.button
                key={`${r}-${c}`}
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={() => placeQueen(r, c)}
                style={{
                  aspectRatio: '1 / 1',
                  borderRadius: '8px',
                  border: hasQueen ? '1px solid var(--accent-green)' : '1px solid var(--border-light)',
                  cursor: status === 'playing' ? 'pointer' : 'not-allowed',
                  background: hasQueen
                    ? 'rgba(57, 255, 20, 0.2)'
                    : blocked
                      ? 'rgba(255, 255, 255, 0.12)'
                      : dark
                        ? 'rgba(255, 255, 255, 0.06)'
                        : 'rgba(255, 255, 255, 0.02)',
                  color: hasQueen ? 'var(--accent-green)' : 'var(--text-secondary)',
                  fontSize: '1.15rem',
                  fontWeight: 700,
                  lineHeight: 1
                }}
              >
                {hasQueen ? '♛' : blocked ? '·' : ''}
              </motion.button>
            );
          })}
        </div>
      </div>

      {status === 'won' && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel"
          style={{ padding: '16px 20px', textAlign: 'center' }}
        >
          <h3 style={{ marginBottom: '6px', color: 'var(--accent-green)' }}>Puzzle Solved</h3>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            Great job. You arranged all queens safely.
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default NQueenPuzzleGame;
