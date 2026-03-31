import { useParams } from 'react-router-dom';
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
