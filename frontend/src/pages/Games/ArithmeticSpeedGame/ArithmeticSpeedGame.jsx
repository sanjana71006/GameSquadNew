import { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../../../context/AuthContext';
import { motion } from 'framer-motion';
import { SFX } from '../../../utils/sounds';

const LEVELS = [
  { level: 1, targetScore: 10, timeLimit: 30, maxNum: 10, ops: ['+'] },
  { level: 2, targetScore: 15, timeLimit: 35, maxNum: 20, ops: ['+', '-'] },
  { level: 3, targetScore: 20, timeLimit: 40, maxNum: 30, ops: ['+', '-', '*'] },
  { level: 4, targetScore: 25, timeLimit: 45, maxNum: 50, ops: ['+', '-', '*'] },
  { level: 5, targetScore: 30, timeLimit: 50, maxNum: 100, ops: ['+', '-', '*'] }, // division can cause non-integers, keep simple
];

const ArithmeticSpeedGame = () => {
  const { token, user, updateProgress } = useContext(AuthContext);
  const userProgress = user?.progress || {};
  const currentUnlocked = userProgress['arithmetic-speed'] || 1;

  const [level, setLevel] = useState(currentUnlocked);
  const [isPlaying, setIsPlaying] = useState(false);
  const [phase, setPhase] = useState('idle'); 
  const [timeLeft, setTimeLeft] = useState(LEVELS[level-1].timeLimit);
  
  const [equation, setEquation] = useState({ q: '', a: 0 });
  const [inputVal, setInputVal] = useState('');
  const [correctCount, setCorrectCount] = useState(0);
  const [totalAttempted, setTotalAttempted] = useState(0);
  
  const inputRef = useRef(null);

  const config = LEVELS[level-1];

  const generateEquation = () => {
    const op = config.ops[Math.floor(Math.random() * config.ops.length)];
    let n1 = Math.floor(Math.random() * config.maxNum) + 1;
    let n2 = Math.floor(Math.random() * config.maxNum) + 1;
    
    // Ensure no negative results for simplicity
    if (op === '-' && n1 < n2) {
      [n1, n2] = [n2, n1];
    }
    // Limit multiplication numbers slightly for sanity
    if (op === '*') {
       n1 = Math.floor(Math.random() * (config.maxNum/2)) + 1;
       n2 = Math.floor(Math.random() * 10) + 1;
    }

    let a = 0;
    if (op === '+') a = n1 + n2;
    if (op === '-') a = n1 - n2;
    if (op === '*') a = n1 * n2;

    setEquation({ q: `${n1} ${op} ${n2} = ?`, a });
  };

  const startGame = () => {
    SFX.gameStart();
    setCorrectCount(0);
    setTotalAttempted(0);
    setIsPlaying(true);
    setPhase('playing');
    setTimeLeft(config.timeLimit);
    generateEquation();
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  useEffect(() => {
    let timer;
    if (phase === 'playing' && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (phase === 'playing' && timeLeft === 0) {
      // Time up, check win/loss
      if (correctCount >= config.targetScore) {
        endGame('win');
      } else {
        endGame('loss');
      }
    }
    return () => clearInterval(timer);
  }, [phase, timeLeft, correctCount, config.targetScore]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (phase !== 'playing' || inputVal === '') return;
    
    setTotalAttempted(prev => prev + 1);
    
    if (parseInt(inputVal) === equation.a) {
      const newCount = correctCount + 1;
      setCorrectCount(newCount);
      
      // If reached target score early
      if (newCount >= config.targetScore) {
          endGame('win');
          return;
      }
    } 

    setInputVal('');
    generateEquation();
  };

  const endGame = async (result) => {
    if (result === 'win') SFX.bonus();
    if (result === 'loss') SFX.gameOver();
    setPhase(result); // 'win' or 'loss'
    setIsPlaying(false);

    const score = result === 'win' ? (correctCount * 50) + (timeLeft * 20) : (correctCount * 10);
    const accuracy = totalAttempted > 0 ? Math.floor((correctCount / totalAttempted) * 100) : 0;

    try {
      const res = await fetch('/api/games/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          gameId: 'arithmetic-speed',
          level,
          score: score,
          timeToComplete: config.timeLimit - timeLeft,
          result,
          accuracy,
          moves: totalAttempted
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
      <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', marginBottom: '26px', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h2 className="text-gradient">Arithmetic Speed</h2>
          <select 
            className="form-input game-level-select" 
            style={{ width: 'min(150px, 46vw)', padding: '8px' }} 
            value={level} 
            onChange={(e) => {
              const nextLevel = Number(e.target.value);
              if (nextLevel > currentUnlocked && currentUnlocked < 5) return;
              setLevel(nextLevel);
            }}
            disabled={isPlaying}
          >
            {[1, 2, 3, 4, 5].map(l => (
              <option key={l} value={l}>
                Level {l} {l > currentUnlocked ? '🔒' : ''}
              </option>
            ))}
          </select>
          <div style={{ marginTop: 6, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Unlocked: Level {currentUnlocked}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: 'var(--accent-green)', fontSize: '1.5rem', fontWeight: 'bold' }}>00:{timeLeft.toString().padStart(2, '0')}</div>
          {phase === 'playing' && <div style={{ color: 'var(--text-primary)' }}>Target: {correctCount} / {config.targetScore}</div>}
        </div>
      </div>

      {phase === 'idle' && (
        <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
          <button className="btn-primary" style={{ padding: '15px 40px', fontSize: '1.2rem', background: 'linear-gradient(45deg, var(--accent-green), var(--accent-blue))' }} onClick={startGame}>
            Start Level {level}
          </button>
        </motion.div>
      )}

      {phase === 'playing' && (
        <motion.div 
          className="glass-panel" 
          style={{ width: '100%', maxWidth: '500px', padding: 'clamp(16px, 4vw, 40px)', textAlign: 'center' }}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <div style={{ fontSize: 'clamp(1.6rem, 7vw, 3rem)', fontWeight: 'bold', letterSpacing: '1px', marginBottom: '24px' }}>
            {equation.q}
          </div>
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <input 
              ref={inputRef}
              type="number" 
              className="form-input" 
              style={{ fontSize: 'clamp(1.1rem, 4vw, 1.5rem)', textAlign: 'center', flex: '1 1 220px' }} 
              value={inputVal} 
              onChange={e => setInputVal(e.target.value)} 
            />
            <button type="submit" className="btn-primary">Submit</button>
          </form>
          
          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '5px' }}>
              {/* Progress bar */}
              <div style={{ width: '100%', height: '10px', background: 'rgba(255,255,255,0.1)', borderRadius: '5px', overflow: 'hidden' }}>
                  <div style={{ 
                      height: '100%', 
                      background: 'var(--accent-green)', 
                      width: `${(correctCount / config.targetScore) * 100}%`,
                      transition: 'width 0.3s'
                  }}></div>
              </div>
          </div>
        </motion.div>
      )}

      {/* Status Overlay */}
      {phase === 'win' && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }} 
          animate={{ opacity: 1, scale: 1 }}
          style={{ position: 'absolute', background: 'rgba(0,0,0,0.85)', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10, backdropFilter: 'blur(10px)' }}
        >
            <h1 style={{ color: 'var(--accent-green)', fontSize: '4rem', textShadow: 'var(--glow-green)' }}>SPEED DEMON!</h1>
            <p style={{ fontSize: '1.5rem' }}>Successfully solved {correctCount} equations.</p>
            <button className="btn-primary" style={{ marginTop: '20px' }} onClick={() => { setPhase('idle'); setIsPlaying(false); }}>Next Challenge</button>
        </motion.div>
      )}

      {phase === 'loss' && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }} 
          animate={{ opacity: 1, scale: 1 }}
          style={{ position: 'absolute', background: 'rgba(50,0,0,0.85)', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10, backdropFilter: 'blur(10px)' }}
        >
            <h1 style={{ color: 'var(--accent-red)', fontSize: '4rem' }}>TIME'S UP</h1>
            <p style={{ fontSize: '1.5rem' }}>You solved {correctCount} out of {config.targetScore} needed.</p>
            <button className="btn-outline" style={{ marginTop: '20px', borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }} onClick={() => { setPhase('idle'); setIsPlaying(false); }}>Retry</button>
        </motion.div>
      )}

    </div>
  );
};

export default ArithmeticSpeedGame;
