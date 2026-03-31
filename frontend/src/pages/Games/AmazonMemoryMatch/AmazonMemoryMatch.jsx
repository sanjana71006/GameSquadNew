import { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../../../context/AuthContext';
import { motion } from 'framer-motion';
import { SFX } from '../../../utils/sounds';

const ICONS = ['📱', '🎧', '💻', '📷', '🎮', '⌚', '📦', '🏠'];

const AmazonMemoryMatch = () => {
  const { token, user } = useContext(AuthContext);
  const [cards, setCards] = useState([]);
  const [flippedCards, setFlippedCards] = useState([]);
  const [matchedCount, setMatchedCount] = useState(0);
  const [moves, setMoves] = useState(0);
  const [gameWon, setGameWon] = useState(false);
  const [totalCards] = useState(ICONS.length * 2);
  const [startedAt, setStartedAt] = useState(null);
  const flipBackTimeoutRef = useRef(null);

  // Initialize game
  useEffect(() => {
    resetGame();
    return () => {
      if (flipBackTimeoutRef.current) {
        clearTimeout(flipBackTimeoutRef.current);
        flipBackTimeoutRef.current = null;
      }
    };
  }, []);

  // Submit score on win
  useEffect(() => {
    if (gameWon && token && user) {
      const accuracy = Math.max(0, 100 - moves * 5);
      void submitScore(accuracy);
    }
  }, [gameWon]);

  // Match the plain HTML behavior: alert after finishing
  useEffect(() => {
    if (!gameWon) return;
    const t = setTimeout(() => {
      // eslint-disable-next-line no-alert
      alert(`Delivered! Total moves: ${moves}`);
    }, 500);
    return () => clearTimeout(t);
  }, [gameWon, moves]);

  const shuffle = (array) => {
    return [...array].sort(() => Math.random() - 0.5);
  };

  const resetGame = () => {
    if (flipBackTimeoutRef.current) {
      clearTimeout(flipBackTimeoutRef.current);
      flipBackTimeoutRef.current = null;
    }
    const newCards = shuffle([...ICONS, ...ICONS]).map((icon, idx) => ({
      id: idx,
      icon,
      flipped: false,
      matched: false,
    }));
    setCards(newCards);
    setFlippedCards([]);
    setMatchedCount(0);
    setMoves(0);
    setGameWon(false);
    setStartedAt(Date.now());
    SFX.gameStart?.();
  };

  const handleCardClick = (cardId) => {
    if (gameWon || flippedCards.length >= 2) return;

    const card = cards.find((c) => c.id === cardId);
    if (!card) return;

    // Mirror HTML: ignore already-flipped cards
    if (flippedCards.includes(cardId) || card.matched) return;

    const newFlipped = [...flippedCards, cardId];
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      const card1 = cards.find((c) => c.id === newFlipped[0]);
      const card2 = cards.find((c) => c.id === newFlipped[1]);

      if (!card1 || !card2) return;

      setMoves((m) => m + 1);

      if (card1.icon === card2.icon) {
        // Match found
        SFX.gameStart?.();
        setMatchedCount((prev) => {
          const next = prev + 2;
          if (next === totalCards) setGameWon(true);
          return next;
        });

        setCards((prevCards) => prevCards.map((c) =>
          c.id === newFlipped[0] || c.id === newFlipped[1]
            ? { ...c, matched: true }
            : c
        ));
        setFlippedCards([]);
      } else {
        // No match
        if (flipBackTimeoutRef.current) {
          clearTimeout(flipBackTimeoutRef.current);
        }
        flipBackTimeoutRef.current = setTimeout(() => {
          setFlippedCards([]);
          flipBackTimeoutRef.current = null;
        }, 1000);
      }
    }
  };

  const submitScore = async (accuracy) => {
    try {
      const end = Date.now();
      const duration = startedAt ? Math.max(1, Math.round((end - startedAt) / 1000)) : 1;
      const score = Math.max(50, 1000 - (moves * 40) - (duration * 2));

      const res = await fetch('/api/games/progress', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          gameId: 'amazon-memory-match',
          level: 1,
          score,
          timeToComplete: duration,
          accuracy,
          result: 'win',
          moves,
        }),
      });
      if (!res.ok) console.error('Score submission failed');
    } catch (err) {
      console.error('Error submitting score:', err);
    }
  };

  const displayCards = cards.map((c) => ({
    ...c,
    flipped: Boolean(gameWon || c.matched || flippedCards.includes(c.id)),
  }));

  return (
    <div style={{ padding: 'clamp(10px, 2.4vw, 20px)', textAlign: 'center' }}>
      <motion.h2
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ color: '#ff9900', fontSize: 'clamp(1.6rem, 5vw, 2.2rem)', marginBottom: '12px' }}
      >
        Amazon Memory Match
      </motion.h2>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          display: 'flex',
          gap: '24px',
          justifyContent: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          fontSize: 'clamp(0.9rem, 2.5vw, 1.1rem)',
        }}
      >
        <div style={{ color: 'var(--text-secondary)' }}>
          <strong>Attempts:</strong> {moves}
        </div>
        <div style={{ color: 'var(--text-secondary)' }}>
          <strong>Matched:</strong> {matchedCount}/{totalCards}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(70px, 1fr))',
          gap: 'clamp(8px, 2vw, 12px)',
          maxWidth: '400px',
          margin: '0 auto 20px',
          perspective: '1000px',
        }}
      >
        {displayCards.map((card) => (
          <motion.div
            key={card.id}
            onClick={() => handleCardClick(card.id)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            animate={{ rotateY: card.flipped ? 180 : 0 }}
            transition={{ duration: 0.5 }}
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '1/1',
              cursor: card.matched ? 'default' : 'pointer',
              transformStyle: 'preserve-3d',
            }}
          >
            {/* Card Back */}
            <div
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                backfaceVisibility: 'hidden',
                background: 'linear-gradient(135deg, #232f3e, #37475a)',
                border: '2px solid #ff9900',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 'clamp(1.2rem, 4vw, 1.8rem)',
                color: '#ff9900',
              }}
            >
              📦
            </div>

            {/* Card Front */}
            <div
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                background: card.matched ? '#22c55e' : '#ffffff',
                border: '2px solid #ff9900',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 'clamp(1.4rem, 5vw, 2rem)',
                color: '#232f3e',
              }}
            >
              {card.icon}
            </div>
          </motion.div>
        ))}
      </motion.div>

      {gameWon && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            background: 'linear-gradient(135deg, #ff9900, #ffb84d)',
            color: '#232f3e',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '20px',
            fontWeight: 'bold',
            fontSize: 'clamp(1rem, 2.5vw, 1.3rem)',
          }}
        >
          🎉 Delivered! Total Attempts: {moves}
        </motion.div>
      )}

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={resetGame}
        style={{
          padding: '12px 30px',
          background: '#ff9900',
          color: '#232f3e',
          border: '2px solid #a88734',
          borderRadius: '8px',
          fontSize: 'clamp(0.9rem, 2.2vw, 1rem)',
          fontWeight: 'bold',
          cursor: 'pointer',
        }}
      >
        {gameWon ? '📦 Restock Board' : 'Reset Game'}
      </motion.button>
    </div>
  );
};

export default AmazonMemoryMatch;
