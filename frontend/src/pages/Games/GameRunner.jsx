import { useParams } from 'react-router-dom';
import MemoryGridGame from './MemoryGridGame/MemoryGridGame';
import ArithmeticSpeedGame from './ArithmeticSpeedGame/ArithmeticSpeedGame';
import NumberSeriesGame from './NumberSeriesGame/NumberSeriesGame';
import LogicDecisionGame from './LogicDecisionGame/LogicDecisionGame';
import CrunchMatch from './CrunchMatch/CrunchMatch';
import KeyQuest from './KeyQuest/KeyQuest';
import NQueenPuzzleGame from './NQueenPuzzleGame/NQueenPuzzleGame';

const GameRunner = () => {
  const { gameId } = useParams();

  const renderGame = () => {
    switch(gameId) {
      case 'memory-grid': return <MemoryGridGame />;
      case 'arithmetic-speed': return <ArithmeticSpeedGame />;
      case 'number-series': return <NumberSeriesGame />;
      case 'logic-decision': return <LogicDecisionGame />;
      case 'crunch-match': return <CrunchMatch />;
      case 'key-quest': return <KeyQuest />;
      case 'n-queen-puzzle': return <NQueenPuzzleGame />;
      default: return <div style={{color:'var(--text-primary)', textAlign:'center', marginTop:'50px'}}>Game not found</div>;
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="container" style={{ flexGrow: 1, padding: 'clamp(10px, 2.4vw, 20px)', display: 'flex', flexDirection: 'column' }}>
        <div className="glass-panel" style={{ flexGrow: 1, position: 'relative', overflow: 'auto' }}>
          {renderGame()}
        </div>
      </div>
    </div>
  );
};

export default GameRunner;
