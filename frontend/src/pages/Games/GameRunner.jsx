import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ArithmeticSpeedGame from './ArithmeticSpeedGame/ArithmeticSpeedGame';
import NumberSeriesGame from './NumberSeriesGame/NumberSeriesGame';
import LogicDecisionGame from './LogicDecisionGame/LogicDecisionGame';
import CrunchMatch from './CrunchMatch/CrunchMatch';
import KeyQuest from './KeyQuest/KeyQuest';
import NQueenPuzzleGame from './NQueenPuzzleGame/NQueenPuzzleGame';
import AmazonMemoryMatch from './AmazonMemoryMatch/AmazonMemoryMatch';
import MissionariesCannibals from './MissionariesCannibals/MissionariesCannibals';
import WaterJugProblem from './WaterJugProblem/WaterJugProblem';
import TcsCareerAscent from './TcsCareerAscent/TcsCareerAscent';

const GameRunner = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);

  const renderGame = () => {
    switch(gameId) {
      case 'arithmetic-speed': return <ArithmeticSpeedGame />;
      case 'number-series': return <NumberSeriesGame />;
      case 'logic-decision': return <LogicDecisionGame />;
      case 'crunch-match': return <CrunchMatch />;
      case 'key-quest': return <KeyQuest />;
      case 'n-queen-puzzle': return <NQueenPuzzleGame />;
      case 'missionaries-cannibals': return <MissionariesCannibals />;
      case 'amazon-memory-match': return <AmazonMemoryMatch />;
      case 'water-jug-problem': return <WaterJugProblem />;
      case 'tcs-career-ascent': return <TcsCareerAscent />;
      default: return <div style={{color:'var(--text-primary)', textAlign:'center', marginTop:'50px'}}>Game not found</div>;
    }
  };

  return (
    <div className="container game-runner-shell" style={{ padding: 'clamp(10px, 2.4vw, 20px)' }}>
      <div
        className="glass-panel game-runner-panel"
        style={{
          width: '100%',
          maxWidth: 'min(1200px, 100%)',
          margin: '0 auto',
          overflowX: 'hidden',
          overflowY: 'visible',
          position: 'relative',
        }}
      >
        <div
          className="game-runner-toolbar"
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            padding: 'clamp(10px, 1.8vw, 16px) clamp(10px, 1.8vw, 16px) 0',
          }}
        >
          <button
            type="button"
            onClick={() => setShowQuitConfirm(true)}
            style={{
              zIndex: 5,
              padding: '8px 14px',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.25)',
              background: 'rgba(10, 18, 34, 0.8)',
              color: 'var(--text-primary)',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Quit
          </button>
        </div>

        <div className="game-runner-content" style={{ width: '100%', maxWidth: '100%', overflowX: 'auto', overflowY: 'visible', padding: 'clamp(8px, 1.2vw, 12px)' }}>
          {renderGame()}
        </div>

        {showQuitConfirm && (
          <div
            onClick={() => setShowQuitConfirm(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 40,
              background: 'rgba(0, 0, 0, 0.55)',
              display: 'grid',
              placeItems: 'center',
              padding: 16,
            }}
          >
            <div
              onClick={(event) => event.stopPropagation()}
              className="glass-panel"
              style={{
                width: 'min(92vw, 420px)',
                padding: 18,
                borderRadius: 14,
              }}
            >
              <h3 style={{ marginBottom: 8 }}>Do you want to quit?</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
                Your current progress in this game session will be closed.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowQuitConfirm(false)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.24)',
                    background: 'transparent',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                  }}
                >
                  No
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/games')}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid transparent',
                    background: 'linear-gradient(135deg, #2dd4bf, #3b82f6)',
                    color: '#ffffff',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Yes, Quit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameRunner;
