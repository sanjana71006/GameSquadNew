import { useEffect, useMemo, useState, useCallback, useContext } from 'react';
import { motion } from 'framer-motion';
import { SFX } from '../../../utils/sounds';
import { AuthContext } from '../../../context/AuthContext';

const LEVELS = [
  {
    id: 'easy',
    name: 'Easy',
    gridSize: 5,
    timer: 130,
    requiredKeys: ['a'],
  },
  {
    id: 'medium',
    name: 'Medium',
    gridSize: 6,
    timer: 150,
    requiredKeys: ['a', 'b'],
  },
  {
    id: 'hard',
    name: 'Hard',
    gridSize: 7,
    timer: 180,
    requiredKeys: ['a', 'b', 'c'],
  },
];

const charToTile = (char) => {
  switch (char) {
    case '#': return { type: 'wall' };
    case 'S': return { type: 'start' };
    case 'E': return { type: 'exit' };
    case 't': return { type: 'trap', revealed: false };
    case 'a': return { type: 'key', keyId: 'a' };
    case 'b': return { type: 'key', keyId: 'b' };
    case 'c': return { type: 'key', keyId: 'c' };
    case 'A': return { type: 'door', keyId: 'a' };
    case 'B': return { type: 'door', keyId: 'b' };
    case 'C': return { type: 'door', keyId: 'c' };
    default: return { type: 'empty' };
  }
};

const directionMap = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
};

const pickRandom = (items) => items[Math.floor(Math.random() * items.length)];

const buildPath = (start, end) => {
  const path = [];
  let r = start.row;
  let c = start.col;

  while (r !== end.row || c !== end.col) {
    if (r < end.row) r += 1;
    else if (r > end.row) r -= 1;
    else if (c < end.col) c += 1;
    else if (c > end.col) c -= 1;

    path.push({ row: r, col: c });
  }

  return path;
};

const generateLayout = (level) => {
  const n = level.gridSize;
  const grid = Array.from({ length: n }, () => Array.from({ length: n }, () => '.'));

  const start = { row: 0, col: 0 };
  const exit = { row: n - 1, col: n - 1 };
  grid[start.row][start.col] = 'S';
  grid[exit.row][exit.col] = 'E';

  const used = new Set([`${start.row}-${start.col}`, `${exit.row}-${exit.col}`]);

  const randomCell = () => {
    const r = Math.floor(Math.random() * n);
    const c = Math.floor(Math.random() * n);
    return { row: r, col: c };
  };

  let current = start;

  for (const keyId of level.requiredKeys) {
    let keyCell = randomCell();
    while (used.has(`${keyCell.row}-${keyCell.col}`) || (keyCell.row === start.row && keyCell.col === start.col) || (keyCell.row === exit.row && keyCell.col === exit.col)) {
      keyCell = randomCell();
    }
    grid[keyCell.row][keyCell.col] = keyId;
    used.add(`${keyCell.row}-${keyCell.col}`);

    let doorCell = randomCell();
    while (used.has(`${doorCell.row}-${doorCell.col}`) || (doorCell.row === start.row && doorCell.col === start.col) || (doorCell.row === exit.row && doorCell.col === exit.col)) {
      doorCell = randomCell();
    }
    grid[doorCell.row][doorCell.col] = keyId.toUpperCase();
    used.add(`${doorCell.row}-${doorCell.col}`);

    const keyPath = buildPath(current, keyCell);
    keyPath.forEach((p) => {
      if (grid[p.row][p.col] === '.') grid[p.row][p.col] = '.';
      used.add(`${p.row}-${p.col}`);
    });

    const doorPath = buildPath(keyCell, doorCell);
    doorPath.forEach((p) => {
      if (grid[p.row][p.col] === '.') grid[p.row][p.col] = '.';
      used.add(`${p.row}-${p.col}`);
    });

    current = doorCell;
  }

  const finalPath = buildPath(current, exit);
  finalPath.forEach((p) => {
    if (grid[p.row][p.col] === '.') grid[p.row][p.col] = '.';
    used.add(`${p.row}-${p.col}`);
  });

  const maxTraps = Math.max(1, Math.floor(n * 1.2));
  let trapsPlaced = 0;
  while (trapsPlaced < maxTraps) {
    const cell = randomCell();
    const key = `${cell.row}-${cell.col}`;
    if (!used.has(key) && grid[cell.row][cell.col] === '.') {
      grid[cell.row][cell.col] = 't';
      trapsPlaced += 1;
      used.add(key);
    }
  }

  return grid.map((row) => row.map((ch) => (ch === '.' ? '.' : ch)));
};

const KeyQuest = () => {
  const { token, updateProgress } = useContext(AuthContext);
  const [selectedLevelId, setSelectedLevelId] = useState('easy');
  const [grid, setGrid] = useState([]);
  const [playerPos, setPlayerPos] = useState({ row: 0, col: 0 });
  const [keys, setKeys] = useState({});
  const [moves, setMoves] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [status, setStatus] = useState('ready');
  const [message, setMessage] = useState('Ready to begin your Key Quest.');
  const [hintSteps, setHintSteps] = useState([]);

  const level = useMemo(() => LEVELS.find((l) => l.id === selectedLevelId), [selectedLevelId]);

  const levelToBackendLevel = useMemo(() => {
    return { easy: 1, medium: 2, hard: 3 };
  }, []);

  const initializeLevel = useCallback(() => {
    const layout = generateLayout(level);
    const parsed = layout.map((row) => row.map((ch) => charToTile(ch)));
    let startRow = 0;
    let startCol = 0;
    parsed.forEach((r, i) => {
      r.forEach((cell, j) => {
        if (cell.type === 'start') {
          startRow = i;
          startCol = j;
        }
      });
    });

    setGrid(parsed);
    setPlayerPos({ row: startRow, col: startCol });
    setKeys({});
    setMoves(0);
    setTimeLeft(level.timer);
    setStatus('playing');
    setMessage(`Play ${level.name}. Collect keys, open doors, avoid hidden traps.`);
    setHintSteps([]);
  }, [level]);

  const hasRequiredKeys = useCallback(() => {
    return level.requiredKeys.every((keyId) => keys[keyId]);
  }, [keys, level.requiredKeys]);

  const getTile = (row, col) => {
    if (row < 0 || col < 0 || row >= grid.length || col >= grid[0].length) return { type: 'wall' };
    return grid[row][col];
  };

  const setTile = (row, col, newTile) => {
    setGrid((prevGrid) => {
      const next = prevGrid.map((r) => r.map((c) => ({ ...c })));
      next[row][col] = { ...next[row][col], ...newTile };
      return next;
    });
  };

  const teleportStart = () => {
    const startCell = grid.flatMap((r, i) => r.map((c, j) => ({ c, i, j }))).find(({ c }) => c.type === 'start');
    if (startCell) setPlayerPos({ row: startCell.i, col: startCell.j });
  };

  const endGame = (result, text) => {
    if (result === 'won') SFX.bonus();
    if (result === 'lost') SFX.gameOver();
    setStatus(result);
    setMessage(text);
    if (result === 'won') setHintSteps([]);
  };

  const movePlayer = (dRow, dCol) => {
    if (status !== 'playing') return;
    const newRow = playerPos.row + dRow;
    const newCol = playerPos.col + dCol;

    const target = getTile(newRow, newCol);
    if (target.type === 'wall') {
      setMessage('Cannot walk through walls.');
      return;
    }

    if (target.type === 'door') {
      if (!keys[target.keyId]) {
        setMessage(`Door requires key '${target.keyId.toUpperCase()}' to open.`);
        return;
      } else {
        setMessage(`Unlocked door ${target.keyId.toUpperCase()}.`);
        setTile(newRow, newCol, { type: 'empty' });
      }
    }

    if (target.type === 'trap') {
      setMoves((m) => m + 1);
      setMessage('Trap hit! Returning to start.');
      teleportStart();
      return;
    }

    setPlayerPos({ row: newRow, col: newCol });
    setMoves((m) => m + 1);

    if (target.type === 'key') {
      if (!keys[target.keyId]) {
        setKeys((prevKeys) => ({ ...prevKeys, [target.keyId]: true }));
        setMessage(`Collected key ${target.keyId.toUpperCase()}!`);
        setTile(newRow, newCol, { type: 'empty' });
      }
    }

    if (target.type === 'exit') {
      if (hasRequiredKeys()) {
        endGame('won', `Victory! Reached exit in ${moves + 1} moves.`);
      } else {
        setMessage(`Collect all keys first: ${level.requiredKeys.join(', ').toUpperCase()}`);
      }
    }
  };

  const onKeyPress = useCallback((event) => {
    if (directionMap[event.key]) {
      event.preventDefault();
      const [dr, dc] = directionMap[event.key];
      movePlayer(dr, dc);
    }
  }, [movePlayer, status, playerPos, keys, grid]);

  const computeHint = () => {
    if (status !== 'playing') return;

    const start = playerPos;
    const queue = [{ row: start.row, col: start.col, keys: new Set(Object.keys(keys)), path: [] }];
    const visited = new Set();

    while (queue.length > 0) {
      const current = queue.shift();
      const keyString = [...current.keys].sort().join('');
      const visitedKey = `${current.row}-${current.col}-${keyString}`;
      if (visited.has(visitedKey)) continue;
      visited.add(visitedKey);

      if (getTile(current.row, current.col).type === 'exit' && level.requiredKeys.every((k) => current.keys.has(k))) {
        setHintSteps(current.path);
        setMessage('Hint generated. Follow the arrows.');
        return;
      }

      for (const [dir, [dr, dc]] of Object.entries(directionMap)) {
        const nr = current.row + dr;
        const nc = current.col + dc;
        const tile = getTile(nr, nc);

        if (tile.type === 'wall') continue;
        if (tile.type === 'door' && !current.keys.has(tile.keyId)) continue;
        if (tile.type === 'trap') continue;

        const nextKeys = new Set(current.keys);
        if (tile.type === 'key') nextKeys.add(tile.keyId);

        queue.push({ row: nr, col: nc, keys: nextKeys, path: [...current.path, dir] });
      }
    }

    setMessage('No safe path to exit found from current state.');
  };

  useEffect(() => {
    if (status !== 'won' && status !== 'lost') return;
    if (!token) return;

    const saveProgress = async () => {
      const backendLevel = levelToBackendLevel[selectedLevelId] || 1;
      const keysCollected = Object.values(keys).filter(Boolean).length;
      const keyAccuracy = level.requiredKeys.length > 0
        ? Math.floor((keysCollected / level.requiredKeys.length) * 100)
        : 0;

      const result = status === 'won' ? 'win' : 'loss';
      const score = result === 'win'
        ? Math.max(100, (timeLeft * 10) + (backendLevel * 120) - moves)
        : Math.max(0, (backendLevel * 20) + keysCollected * 10);

      try {
        const res = await fetch('/api/games/progress', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            gameId: 'key-quest',
            level: backendLevel,
            score,
            timeToComplete: Math.max(1, level.timer - timeLeft),
            result,
            accuracy: Math.max(0, Math.min(100, keyAccuracy)),
            moves
          })
        });
        const data = await res.json();
        if (data?.progress) updateProgress(data.progress);
      } catch (error) {
        console.error(error);
      }
    };

    saveProgress();
  }, [status, token, levelToBackendLevel, selectedLevelId, level.requiredKeys.length, level.timer, keys, timeLeft, moves]);

  useEffect(() => {
    initializeLevel();
  }, [initializeLevel]);

  useEffect(() => {
    if (status !== 'playing') return;
    if (timeLeft <= 0) {
      endGame('lost', 'Time up! You lost the level.');
      return;
    }

    const timer = setTimeout(() => setTimeLeft((v) => v - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, status]);

  useEffect(() => {
    window.addEventListener('keydown', onKeyPress);
    return () => window.removeEventListener('keydown', onKeyPress);
  }, [onKeyPress]);

  const boardMaxWidth = `min(95vw, ${level.gridSize * 72}px)`;

  const tileForCell = (cell, r, c) => {
    const isPlayer = playerPos.row === r && playerPos.col === c;
    const style = {
      width: '100%', aspectRatio: '1 / 1', border: '2px solid #ddd',
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold',
      color: '#333', fontSize: 'clamp(0.78rem, 2.5vw, 1rem)', position: 'relative', transition: 'all 0.1s ease',
      background: '#ffffff',
      boxShadow: '0 1px 0 0 rgba(0,0,0,0.05)',
    };

    if (cell.type === 'wall') style.background = '#b3b3b3';
    if (cell.type === 'start') style.background = '#d4edff';
    if (cell.type === 'exit') style.background = '#dcffd2';

    if (cell.type === 'key') style.background = '#fff4b3';
    if (cell.type === 'door') style.background = '#d3d3ff';
    if (cell.type === 'trap') {
      // Trap remains invisible to force memory-based play
      style.background = '#ffffff';
    }

    if (isPlayer) {
      style.background = 'linear-gradient(135deg, rgba(255,255,255,0.7), rgba(44,212,255,0.9))';
      style.boxShadow = '0 0 10px rgba(0,255,255,0.8)';
      return <div style={style}>👤</div>;
    }

    let display = '';
    if (cell.type === 'key') display = '🔑';
    if (cell.type === 'door') display = '🚪';
    if (cell.type === 'trap') display = '';
    if (cell.type === 'exit') display = '🏁';
    if (cell.type === 'start') display = '👤';

    return <div style={style}>{display}</div>;
  };

  return (
    <div style={{ width: '100%', minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', padding: 'clamp(12px, 2.8vw, 20px)' }}>
      <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <h2 className="text-gradient">Key Quest</h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <span>Level:</span>
          <select value={selectedLevelId} onChange={(e) => setSelectedLevelId(e.target.value)} style={{ minWidth: '110px', padding: '8px' }}>
            {LEVELS.map((lvl) => (<option key={lvl.id} value={lvl.id}>{lvl.name}</option>))}
          </select>
          <button className="btn-primary" onClick={() => { SFX.gameStart(); initializeLevel(); }}>Restart</button>
        </div>
      </div>

      <div style={{ width: boardMaxWidth, display: 'grid', gridTemplateColumns: `repeat(${level.gridSize}, minmax(30px, 1fr))`, gap: '4px', justifyContent: 'center' }}>
        {grid.map((row, r) => row.map((cell, c) => <div key={`${r}-${c}`}>{tileForCell(cell, r, c)}</div>))}
      </div>

      <div style={{ width: '100%', maxWidth: '720px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px,1fr))', gap: '10px' }}>
        <div className="glass-panel" style={{ padding: '12px' }}>Moves: <strong>{moves}</strong></div>
        <div className="glass-panel" style={{ padding: '12px' }}>Time: <strong>{timeLeft}s</strong></div>
        <div className="glass-panel" style={{ padding: '12px' }}>
          Keys: <strong>{level.requiredKeys.map((k) => `${k.toUpperCase()}:${keys[k] ? '✓' : '✗'}`).join(' ')}</strong>
        </div>
        <div className="glass-panel" style={{ padding: '12px' }}>
          Status: <strong>{status}</strong>
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: '720px', display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button className="btn-outline" onClick={() => movePlayer(-1, 0)}>Up</button>
        <button className="btn-outline" onClick={() => movePlayer(0, -1)}>Left</button>
        <button className="btn-outline" onClick={() => movePlayer(0, 1)}>Right</button>
        <button className="btn-outline" onClick={() => movePlayer(1, 0)}>Down</button>
        <button className="btn-primary" onClick={computeHint}>Hint</button>
      </div>

      {hintSteps.length > 0 && (
        <div className="glass-panel" style={{ width: '100%', maxWidth: '720px', padding: '12px' }}>
          Hint path: {hintSteps.length} moves: {hintSteps.join(' → ')}
        </div>
      )}

      <div className="glass-panel" style={{ width: '100%', maxWidth: '720px', padding: '12px', textAlign: 'center', color: '#ffe', background: 'rgba(0,0,0,0.3)' }}>
        {message}
      </div>

      {status === 'won' && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ position: 'fixed', inset: 0, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}>
          <div className="glass-panel" style={{ padding: '25px', maxWidth: '460px', textAlign: 'center' }}>
            <h1>🎉 You Win!</h1>
            <p>Level complete with {moves} moves.</p>
            <button className="btn-primary" onClick={() => { SFX.gameStart(); setStatus('playing'); initializeLevel(); }}>Next Level</button>
          </div>
        </motion.div>
      )}

      {status === 'lost' && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ position: 'fixed', inset: 0, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}>
          <div className="glass-panel" style={{ padding: '25px', maxWidth: '460px', textAlign: 'center' }}>
            <h1>💀 Game Over</h1>
            <p>{message}</p>
            <button className="btn-primary" onClick={() => { SFX.gameStart(); initializeLevel(); }}>Retry Level</button>
          </div>
        </motion.div>
      )}

    </div>
  );
};

export default KeyQuest;
