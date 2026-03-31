import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../../context/AuthContext';
import { motion } from 'framer-motion';
import { SFX } from '../../../utils/sounds';

// difficulty scaling: grid size, number of highlighted squares, time limit
const LEVELS = [
  { level: 1, gridSize: 3, targetCount: 3, showTime: 2000, timeLimit: 15 },
  { level: 2, gridSize: 4, targetCount: 5, showTime: 2500, timeLimit: 20 },
  { level: 3, gridSize: 5, targetCount: 8, showTime: 3000, timeLimit: 30 },
  { level: 4, gridSize: 6, targetCount: 12, showTime: 3500, timeLimit: 40 },
  { level: 5, gridSize: 7, targetCount: 18, showTime: 4000, timeLimit: 50 },
];

const MemoryGridGame = () => {
  const { token, user, updateProgress } = useContext(AuthContext);
  const userProgress = user?.progress || {};
  const currentUnlocked = userProgress['memory-grid'] || 1;

  const [level, setLevel] = useState(currentUnlocked);
  const [isPlaying, setIsPlaying] = useState(false);
  const [phase, setPhase] = useState('idle'); // idle, memorizing, guessing, won, lost
  const [targets, setTargets] = useState([]);
  const [guessed, setGuessed] = useState([]);
  const [timeLeft, setTimeLeft] = useState(LEVELS[level-1].timeLimit);
  const [score, setScore] = useState(0);

  const config = LEVELS[level-1];
  const totalSquares = config.gridSize * config.gridSize;

  const startGame = () => {
    SFX.gameStart();
    // Generate random targets
    const newTargets = [];
    while (newTargets.length < config.targetCount) {
      const idx = Math.floor(Math.random() * totalSquares);
      if (!newTargets.includes(idx)) {
        newTargets.push(idx);
      }
    }
    setTargets(newTargets);
    setGuessed([]);
    setScore(0);
    setIsPlaying(true);
    setPhase('memorizing');
    setTimeLeft(config.timeLimit);

    setTimeout(() => {
      setPhase('guessing');
    }, config.showTime);
  };

  useEffect(() => {
    let timer;
    if (phase === 'guessing' && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (phase === 'guessing' && timeLeft === 0) {
      endGame('loss');
    }
    return () => clearInterval(timer);
  }, [phase, timeLeft]);

  const handleSquareClick = (idx) => {
    if (phase !== 'guessing' || guessed.includes(idx)) return;

    const isCorrect = targets.includes(idx);
    const newGuessed = [...guessed, idx];
    setGuessed(newGuessed);

    if (!isCorrect) {
      endGame('loss');
    } else {
      // Check win
      const correctGuesses = newGuessed.filter(g => targets.includes(g));
      if (correctGuesses.length === config.targetCount) {
        setScore((config.timeLimit * 15) + (level * 150));
        endGame('win');
      }
    }
  };

  const endGame = async (result) => {
    if (result === 'win') SFX.bonus();
    if (result === 'loss') SFX.gameOver();
    setPhase(result); // 'win' or 'loss'
    setIsPlaying(false);

    const finalScore = result === 'win' ? (timeLeft * 15) + (level * 150) : 0;
    const correctGuesses = guessed.filter(g => targets.includes(g)).length;
    const accuracy = Math.floor((correctGuesses / config.targetCount) * 100);

    try {
      const res = await fetch('/api/games/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          gameId: 'memory-grid',
          level,
          score: finalScore,
          timeToComplete: config.timeLimit - timeLeft,
          result,
          accuracy,
          moves: guessed.length
        })
      });
      const data = await res.json();
      if (data?.progress) updateProgress(data.progress);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 'clamp(12px, 2.8vw, 20px)' }}>
      {/* Header */}
      <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', marginBottom: '20px', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h2 className="text-gradient">Memory Grid</h2>
          <select 
            className="form-input" 
            style={{ width: 'min(150px, 46vw)', padding: '8px' }} 
            value={level} 
            onChange={(e) => setLevel(Number(e.target.value))}
            disabled={isPlaying}
          >
            {[1, 2, 3, 4, 5].map(l => (
              <option key={l} value={l} disabled={l > currentUnlocked && currentUnlocked < 5}>
                Level {l} {l > currentUnlocked ? '🔒' : ''}
              </option>
            ))}
          </select>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: 'var(--accent-purple)', fontSize: '1.5rem', fontWeight: 'bold' }}>00:{timeLeft.toString().padStart(2, '0')}</div>
          {score > 0 && <div style={{ color: 'var(--accent-green)' }}>Score: {score}</div>}
        </div>
      </div>

      {phase === 'idle' && (
        <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
          <button className="btn-primary" style={{ padding: '15px 40px', fontSize: '1.2rem', background: 'linear-gradient(45deg, var(--accent-purple), #ff3366)' }} onClick={startGame}>
            Start Level {level}
          </button>
        </motion.div>
      )}

      {(isPlaying || phase === 'win' || phase === 'loss') && (
        <div style={{ 
          display: 'grid', 
          width: `min(92vw, ${config.gridSize * 72}px)`,
          gridTemplateColumns: `repeat(${config.gridSize}, minmax(30px, 1fr))`, 
          gap: '8px',
          background: 'rgba(0,0,0,0.3)',
          padding: 'clamp(10px, 2vw, 20px)',
          borderRadius: '16px',
          border: '1px solid var(--border-light)'
        }}>
          {Array.from({ length: totalSquares }).map((_, idx) => {
            const isTarget = targets.includes(idx);
            const isGuessed = guessed.includes(idx);
            
            let bg = 'rgba(255,255,255,0.05)';
            let glow = 'none';

            if (phase === 'memorizing' && isTarget) {
              bg = 'var(--accent-purple)';
              glow = 'var(--glow-purple)';
            } else if (isGuessed) {
              if (isTarget) {
                bg = 'var(--accent-green)';
                glow = 'var(--glow-green)';
              } else {
                bg = 'var(--accent-red)';
                glow = '0 0 15px rgba(255, 51, 102, 0.5)';
              }
            } else if ((phase === 'win' || phase === 'loss') && isTarget) {
               // Show targets at the end
               bg = 'rgba(176, 38, 255, 0.4)';
               glow = 'var(--glow-purple)';
            }

            return (
              <motion.div 
                key={idx}
                style={{
                  width: '100%', aspectRatio: '1 / 1', borderRadius: '10px',
                  background: bg,
                  boxShadow: glow,
                  border: '1px solid var(--border-light)',
                  cursor: phase === 'guessing' ? 'pointer' : 'default',
                  transition: 'background 0.3s'
                }}
                whileHover={phase === 'guessing' && !isGuessed ? { scale: 1.05, background: 'rgba(255,255,255,0.2)' } : {}}
                onClick={() => handleSquareClick(idx)}
              />
            );
          })}
        </div>
      )}

      {/* Messages */}
      {phase === 'memorizing' && <h3 style={{ marginTop: '20px', color: 'var(--accent-purple)', animation: 'pulse 1s infinite' }}>MEMORIZE TARGETS...</h3>}
      {phase === 'guessing' && <h3 style={{ marginTop: '20px', color: 'var(--accent-blue)' }}>SELECT THE TARGETS</h3>}

      {/* Status Overlay */}
      {phase === 'win' && (
        <motion.div 
          initial={{ opacity: 0, y: 50 }} 
          animate={{ opacity: 1, y: 0 }}
          style={{ position: 'absolute', background: 'rgba(0,0,0,0.8)', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10, backdropFilter: 'blur(10px)' }}
        >
            <h1 style={{ color: 'var(--accent-green)', fontSize: '4rem', textShadow: 'var(--glow-green)' }}>LEVEL CLEARED!</h1>
            <p>Score: {score}</p>
            <button className="btn-primary" style={{ marginTop: '20px' }} onClick={() => { setPhase('idle'); setIsPlaying(false); }}>Next Challenge</button>
        </motion.div>
      )}

      {phase === 'loss' && (
        <motion.div 
          initial={{ opacity: 0, y: -50 }} 
          animate={{ opacity: 1, y: 0 }}
          style={{ position: 'absolute', background: 'rgba(50,0,0,0.8)', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10, backdropFilter: 'blur(10px)' }}
        >
            <h1 style={{ color: 'var(--accent-red)', fontSize: '4rem' }}>MISSION FAILED</h1>
            <p>Incorrect square selected.</p>
            <button className="btn-outline" style={{ marginTop: '20px', borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }} onClick={() => { setPhase('idle'); setIsPlaying(false); }}>Retry</button>
        </motion.div>
      )}

      <style>{`
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
      `}</style>
    </div>
  );
};

export default MemoryGridGame;
