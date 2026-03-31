import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../../context/AuthContext';
import { motion } from 'framer-motion';
import { SFX } from '../../../utils/sounds';

const LEVELS = [
  { level: 1, targetScore: 5, timeLimit: 45, type: 'basic-linear' },
  { level: 2, targetScore: 7, timeLimit: 50, type: 'quadratic' },
  { level: 3, targetScore: 10, timeLimit: 60, type: 'fibonacci-like' },
  { level: 4, targetScore: 12, timeLimit: 70, type: 'alternating' },
  { level: 5, targetScore: 15, timeLimit: 80, type: 'mixed' }
];

const NumberSeriesGame = () => {
  const { token, user, updateProgress } = useContext(AuthContext);
  const userProgress = user?.progress || {};
  const currentUnlocked = userProgress['number-series'] || 1;

  const [level, setLevel] = useState(currentUnlocked);
  const [isPlaying, setIsPlaying] = useState(false);
  const [phase, setPhase] = useState('idle');
  const [timeLeft, setTimeLeft] = useState(LEVELS[level-1].timeLimit);
  
  const [series, setSeries] = useState({ seq: [], answer: 0, options: [] });
  const [correctCount, setCorrectCount] = useState(0);
  const [totalAttempted, setTotalAttempted] = useState(0);

  const config = LEVELS[level-1];

  const generateSeries = () => {
    let seq = [];
    let ans = 0;
    
    // Choose mode based on level progression
    const types = ['basic-linear', 'quadratic', 'fibonacci-like', 'alternating'];
    let mode = config.type;
    if (mode === 'mixed') {
        mode = types[Math.floor(Math.random() * types.length)];
    }

    const start = Math.floor(Math.random() * 10) + 1;
    const missingIndex = Math.floor(Math.random() * 4) + 1; // 1 to 4 (leave 0 and 5 intact if possible, 6 total)
    
    if (mode === 'basic-linear') {
        const step = Math.floor(Math.random() * 10) + 2;
        for (let i=0; i<6; i++) {
            seq.push(start + (i * step));
        }
    } else if (mode === 'quadratic') {
        const step = Math.floor(Math.random() * 5) + 1;
        for (let i=0; i<6; i++) {
            seq.push(start + Math.pow(i * step, 2));
        }
    } else if (mode === 'fibonacci-like') {
        let a = Math.floor(Math.random() * 5) + 1;
        let b = Math.floor(Math.random() * 5) + 1;
        seq.push(a); seq.push(b);
        for(let i=2; i<6; i++) {
            const next = seq[i-1] + seq[i-2];
            seq.push(next);
        }
    } else if (mode === 'alternating') {
        const step1 = Math.floor(Math.random() * 5) + 2;
        const step2 = Math.floor(Math.random() * 5) + 2;
        for(let i=0; i<6; i++) {
            if(i%2===0) seq.push(start + (i*step1));
            else seq.push(start - (i*step2));
        }
    }

    ans = seq[missingIndex];
    seq[missingIndex] = '?';

    // Generate options including correct answer
    let opts = new Set([ans]);
    while(opts.size < 4) {
        const variance = Math.floor(Math.random() * 20) - 10;
        if(variance !== 0 && ans + variance > 0) opts.add(ans + variance);
    }
    const optionsArray = Array.from(opts).sort(() => Math.random() - 0.5);

    setSeries({ seq, answer: ans, options: optionsArray });
  };

  const startGame = () => {
    SFX.gameStart();
    setCorrectCount(0);
    setTotalAttempted(0);
    setIsPlaying(true);
    setPhase('playing');
    setTimeLeft(config.timeLimit);
    generateSeries();
  };

  useEffect(() => {
    let timer;
    if (phase === 'playing' && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (phase === 'playing' && timeLeft === 0) {
      if (correctCount >= config.targetScore) endGame('win');
      else endGame('loss');
    }
    return () => clearInterval(timer);
  }, [phase, timeLeft, correctCount]);

  const handleGuess = (val) => {
    if (phase !== 'playing') return;
    setTotalAttempted(prev => prev + 1);
    
    if (val === series.answer) {
      SFX.bonus();
      const newCount = correctCount + 1;
      setCorrectCount(newCount);
      if (newCount >= config.targetScore) {
          endGame('win');
          return;
      }
    }
    generateSeries();
  };

  const endGame = async (result) => {
    if (result === 'win') SFX.bonus();
    if (result === 'loss') SFX.gameOver();
    setPhase(result);
    setIsPlaying(false);

    const score = result === 'win' ? (correctCount * 100) + (timeLeft * 15) : (correctCount * 25);
    const accuracy = totalAttempted > 0 ? Math.floor((correctCount / totalAttempted) * 100) : 0;

    try {
      const res = await fetch('/api/games/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          gameId: 'number-series',
          level,
          score,
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
      <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', marginBottom: '26px', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h2 className="text-gradient">Number Series</h2>
          <select 
            className="form-input" style={{ width: 'min(150px, 46vw)', padding: '8px' }} 
            value={level} onChange={(e) => setLevel(Number(e.target.value))} disabled={isPlaying}
          >
            {[1, 2, 3, 4, 5].map(l => (
              <option key={l} value={l} disabled={l > currentUnlocked && currentUnlocked < 5}>Level {l} {l > currentUnlocked ? '🔒' : ''}</option>
            ))}
          </select>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: 'var(--accent-red)', fontSize: '1.5rem', fontWeight: 'bold' }}>00:{timeLeft.toString().padStart(2, '0')}</div>
          {phase === 'playing' && <div style={{ color: 'var(--text-primary)' }}>Score: {correctCount} / {config.targetScore}</div>}
        </div>
      </div>

      {phase === 'idle' && (
        <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
          <button className="btn-primary" style={{ padding: '15px 40px', fontSize: '1.2rem', background: 'linear-gradient(45deg, var(--accent-red), var(--accent-purple))' }} onClick={startGame}>
            Start Level {level}
          </button>
        </motion.div>
      )}

      {phase === 'playing' && (
        <motion.div className="glass-panel" style={{ width: '100%', maxWidth: '600px', padding: 'clamp(16px, 4vw, 40px)', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
            {series.seq.map((num, i) => (
              <div key={i} style={{
                fontSize: 'clamp(1.2rem, 4.2vw, 2rem)',
                fontWeight: 'bold',
                color: num === '?' ? 'var(--accent-red)' : 'var(--text-primary)',
                background: 'rgba(255,255,255,0.05)',
                padding: '8px 14px',
                borderRadius: '8px',
                border: num === '?' ? '1px dashed var(--accent-red)' : '1px solid var(--border-light)',
                minWidth: '46px'
              }}>
                {num}
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
            {series.options.map((opt, i) => (
              <button 
                key={i} 
                className="btn-outline" 
                style={{ fontSize: 'clamp(1.05rem, 3.6vw, 1.5rem)', padding: '12px', color: 'var(--text-primary)', borderColor: 'var(--accent-red)' }}
                onClick={() => handleGuess(opt)}
                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,51,102,0.2)'; e.currentTarget.style.boxShadow = 'var(--glow-red)' }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.boxShadow = 'none' }}
              >
                {opt}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Win/Loss Overlays */}
      {phase === 'win' && (
        <motion.div style={{ position: 'absolute', background: 'rgba(0,0,0,0.85)', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
            <h1 style={{ color: 'var(--accent-green)', fontSize: '4rem' }}>PATTERN MASTER!</h1>
            <p style={{ fontSize: '1.5rem' }}>Successfully solved {correctCount} patterns.</p>
            <button className="btn-primary" style={{ marginTop: '20px' }} onClick={() => { setPhase('idle'); setIsPlaying(false); }}>Next Challenge</button>
        </motion.div>
      )}
      {phase === 'loss' && (
        <motion.div style={{ position: 'absolute', background: 'rgba(50,0,0,0.85)', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
            <h1 style={{ color: 'var(--accent-red)', fontSize: '4rem' }}>TIME'S UP</h1>
            <button className="btn-outline" style={{ marginTop: '20px' }} onClick={() => { setPhase('idle'); setIsPlaying(false); }}>Retry</button>
        </motion.div>
      )}
    </div>
  );
};

export default NumberSeriesGame;
