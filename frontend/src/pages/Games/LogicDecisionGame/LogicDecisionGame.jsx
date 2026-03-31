import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../../context/AuthContext';
import { motion } from 'framer-motion';
import { SFX } from '../../../utils/sounds';

const LEVELS = [
  { level: 1, targetScore: 5, timeLimit: 30, variables: 2 },
  { level: 2, targetScore: 7, timeLimit: 35, variables: 3 },
  { level: 3, targetScore: 10, timeLimit: 40, variables: 3 },
  { level: 4, targetScore: 12, timeLimit: 45, variables: 4 },
  { level: 5, targetScore: 15, timeLimit: 50, variables: 5 }
];

const LogicDecisionGame = () => {
  const { token, user, updateProgress } = useContext(AuthContext);
  const userProgress = user?.progress || {};
  const currentUnlocked = userProgress['logic-decision'] || 1;

  const [level, setLevel] = useState(currentUnlocked);
  const [isPlaying, setIsPlaying] = useState(false);
  const [phase, setPhase] = useState('idle');
  const [timeLeft, setTimeLeft] = useState(LEVELS[level-1].timeLimit);
  
  const [promptData, setPromptData] = useState({ text: '', isTrue: true });
  const [correctCount, setCorrectCount] = useState(0);
  const [totalAttempted, setTotalAttempted] = useState(0);

  const config = LEVELS[level-1];

  const generateLogicPrompt = () => {
    // Generate simple logic statements based on variables
    const vars = ['A', 'B', 'C', 'D', 'E'].slice(0, config.variables);
    
    // Create actual values to evaluate truth
    const values = {};
    vars.forEach((v, i) => values[v] = Math.floor(Math.random() * 100)); // distinct values
    
    let isTrue = Math.random() > 0.5;
    let text = '';

    if (config.variables === 2) {
        text = `Given ${vars[0]} = ${values[vars[0]]} and ${vars[1]} = ${values[vars[1]]}. `;
        if (isTrue) {
            text += `Is ${vars[0]} ${values[vars[0]] > values[vars[1]] ? '>' : '<'} ${vars[1]}?`;
        } else {
            text += `Is ${vars[0]} ${values[vars[0]] > values[vars[1]] ? '<' : '>'} ${vars[1]}?`;
        }
    } else {
        // Transitive logic for higher levels
        // E.g., A > B, B > C. Is A > C?
        let rel1 = values[vars[0]] > values[vars[1]] ? '>' : '<';
        let rel2 = values[vars[1]] > values[vars[2]] ? '>' : '<';
        
        text = `If ${vars[0]} ${rel1} ${vars[1]} and ${vars[1]} ${rel2} ${vars[2]}. `;
        
        let actualRel = values[vars[0]] > values[vars[2]] ? '>' : '<';
        if (isTrue) {
            text += `Is ${vars[0]} ${actualRel} ${vars[2]}?`;
        } else {
            text += `Is ${vars[0]} ${actualRel === '>' ? '<' : '>'} ${vars[2]}?`;
        }
    }

    setPromptData({ text, isTrue });
  };

  const startGame = () => {
    SFX.gameStart();
    setCorrectCount(0);
    setTotalAttempted(0);
    setIsPlaying(true);
    setPhase('playing');
    setTimeLeft(config.timeLimit);
    generateLogicPrompt();
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

  const handleDecision = (guess) => {
    if (phase !== 'playing') return;
    setTotalAttempted(prev => prev + 1);
    
    if (guess === promptData.isTrue) {
      const newCount = correctCount + 1;
      setCorrectCount(newCount);
      if (newCount >= config.targetScore) {
          endGame('win');
          return;
      }
    } else {
        // penalty for logic game (optional, let's just not increment)
    }
    generateLogicPrompt();
  };

  const endGame = async (result) => {
    if (result === 'win') SFX.bonus();
    if (result === 'loss') SFX.gameOver();
    setPhase(result);
    setIsPlaying(false);

    const score = result === 'win' ? (correctCount * 100) + (timeLeft * 25) : (correctCount * 15);
    const accuracy = totalAttempted > 0 ? Math.floor((correctCount / totalAttempted) * 100) : 0;

    try {
      const res = await fetch('/api/games/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          gameId: 'logic-decision',
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
          <h2 className="text-gradient">Logic Decision</h2>
          <select 
            className="form-input game-level-select" style={{ width: 'min(150px, 46vw)', padding: '8px' }} 
            value={level}
            onChange={(e) => {
              const nextLevel = Number(e.target.value);
              if (nextLevel > currentUnlocked && currentUnlocked < 5) return;
              setLevel(nextLevel);
            }}
            disabled={isPlaying}
          >
            {[1, 2, 3, 4, 5].map(l => (
              <option key={l} value={l}>Level {l} {l > currentUnlocked ? '🔒' : ''}</option>
            ))}
          </select>
          <div style={{ marginTop: 6, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Unlocked: Level {currentUnlocked}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#ffea00', fontSize: '1.5rem', fontWeight: 'bold' }}>00:{timeLeft.toString().padStart(2, '0')}</div>
          {phase === 'playing' && <div style={{ color: 'var(--text-primary)' }}>Score: {correctCount} / {config.targetScore}</div>}
        </div>
      </div>

      {phase === 'idle' && (
        <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
          <button className="btn-primary" style={{ padding: '15px 40px', fontSize: '1.2rem', background: 'linear-gradient(45deg, #ffea00, #ff9900)', color: 'black' }} onClick={startGame}>
            Start Level {level}
          </button>
        </motion.div>
      )}

      {phase === 'playing' && (
        <motion.div className="glass-panel" style={{ width: '100%', maxWidth: '600px', padding: 'clamp(16px, 4vw, 40px)', textAlign: 'center' }}>
          <div style={{ fontSize: 'clamp(1.05rem, 3.6vw, 1.8rem)', fontWeight: 'bold', marginBottom: '24px', lineHeight: '1.45' }}>
            {promptData.text}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <button 
                className="btn-primary" 
                style={{ fontSize: 'clamp(1rem, 3.5vw, 1.5rem)', padding: '12px 26px', background: 'var(--accent-green)', flex: '1 1 140px' }}
                onClick={() => handleDecision(true)}
            >
                TRUE
            </button>
            <button 
                className="btn-primary" 
                style={{ fontSize: 'clamp(1rem, 3.5vw, 1.5rem)', padding: '12px 26px', background: 'var(--accent-red)', flex: '1 1 140px' }}
                onClick={() => handleDecision(false)}
            >
                FALSE
            </button>
          </div>
        </motion.div>
      )}

      {/* Win/Loss Overlays */}
      {phase === 'win' && (
        <motion.div style={{ position: 'absolute', background: 'rgba(0,0,0,0.85)', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
            <h1 style={{ color: 'var(--accent-green)', fontSize: '4rem' }}>LOGIC MASTER!</h1>
            <p style={{ fontSize: '1.5rem' }}>Successfully evaluated {correctCount} statements.</p>
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

export default LogicDecisionGame;
