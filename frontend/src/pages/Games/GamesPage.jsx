import { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Play } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { GAMES } from '../../constants/games';
import { SFX } from '../../utils/sounds';

const GAME_RULES = {
  'arithmetic-speed': [
    'Pick a level and solve equations before time runs out.',
    'Each correct answer increases your progress toward the target.',
    'Reach the target before the timer hits zero to win the level.'
  ],
  'number-series': [
    'Find the missing number that completes the pattern.',
    'Select the correct option for each sequence question.',
    'Keep accuracy high to complete the level.'
  ],
  'logic-decision': [
    'Read each logical condition carefully.',
    'Choose the option that best satisfies all given rules.',
    'Wrong choices reduce momentum, so prioritize accuracy.'
  ],
  'crunch-match': [
    'Tap bubbles in the required order (ascending or descending).',
    'Wrong taps cost time, so prioritize correct order.',
    'In versus mode, only your assigned board is playable.'
  ],
  'key-quest': [
    'Navigate the grid to collect the key and open the door.',
    'Avoid traps and plan your path before moving.',
    'Reach the exit in the fewest moves possible.'
  ],
  'n-queen-puzzle': [
    'Place queens so none attack each other.',
    'No two queens can share row, column, or diagonal.',
    'Complete the board with valid placements only.'
  ],
  'missionaries-cannibals': [
    'Move 1 to 3 passengers in the boat each crossing.',
    'Do not leave missionaries outnumbered by cannibals on either bank.',
    'Get everyone to the opposite side safely.'
  ],
  'amazon-memory-match': [
    'Flip two cards at a time to find matching pairs.',
    'Memorize positions to reduce wrong attempts.',
    'Match all pairs to complete the round quickly.'
  ],
  'water-jug-problem': [
    'Use fill, empty, and pour actions on the jugs.',
    'Reach the exact target quantity shown for the level.',
    'Finish in as few steps as possible.'
  ],
  'tcs-career-ascent': [
    'Collect all required knowledge tokens in each level.',
    'Avoid mistakes and maintain strong performance.',
    'Clear all rounds to complete your career ascent.'
  ]
};

const GamesPage = () => {
  const { token } = useContext(AuthContext);
  const [analytics, setAnalytics] = useState(null);
  const [rulesForGame, setRulesForGame] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch('/api/analytics', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setAnalytics(data);
      } catch (error) {
        console.error(error);
      }
    };
    fetchAnalytics();
  }, [token]);

  if (!analytics) return <div style={{ color: 'var(--text-primary)', textAlign: 'center', marginTop: '90px' }}>Loading games...</div>;

  return (
    <div className="container" style={{ padding: '20px' }}>
      <h2 className="text-gradient" style={{ marginBottom: '18px' }}>Game Arena</h2>
      <div style={{ display: 'grid', gap: '16px' }}>
        {GAMES.map((game, i) => {
          const currentLevel = analytics.progress?.[game.id] || 1;
          return (
            <motion.div
              key={game.id}
              className="glass-panel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              style={{ padding: '22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: `4px solid ${game.color}` }}
            >
              <div>
                <h3 style={{ margin: '0 0 5px 0', color: game.color }}>{game.name}</h3>
                <p style={{ color: 'var(--text-secondary)', margin: '0 0 10px 0', fontSize: '0.92rem' }}>{game.desc}</p>
                <span style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.82rem' }}>
                  Current Level: {currentLevel}/5
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <button
                  className="btn-outline"
                  type="button"
                  onClick={() => setRulesForGame(game)}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px' }}
                >
                  <BookOpen size={15} /> Rules
                </button>
                <button
                  className="btn-primary"
                  onClick={() => {
                    SFX.gameStart();
                    navigate(`/game/${game.id}`);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Play size={16} /> Play
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {rulesForGame && (
        <div
          onClick={() => setRulesForGame(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.58)',
            zIndex: 180,
            display: 'grid',
            placeItems: 'center',
            padding: '16px'
          }}
        >
          <div
            className="glass-panel"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: 'min(560px, 96vw)',
              padding: '18px',
              borderRadius: '14px'
            }}
          >
            <h3 style={{ margin: '0 0 6px 0' }}>{rulesForGame.name} Rules</h3>
            <ol style={{ margin: 0, paddingLeft: '18px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
              {(GAME_RULES[rulesForGame.id] || ['Play the objective and complete the game challenge.']).map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ol>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
              <button
                type="button"
                className="btn-primary"
                style={{ padding: '8px 16px' }}
                onClick={() => setRulesForGame(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GamesPage;
