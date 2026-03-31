import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
const introVideoSrc = '/media/intro.mp4';

const INTRO_DURATION_MS = 11000;

const IntroVideo = () => {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const redirectedRef = useRef(false);
  const [needsInteraction, setNeedsInteraction] = useState(false);

  useEffect(() => {
    const tryAutoplayWithSound = async () => {
      const videoEl = videoRef.current;
      if (!videoEl) return;

      videoEl.muted = false;

      try {
        await videoEl.play();
        setNeedsInteraction(false);
      } catch {
        // Most browsers block autoplay with sound unless user interacts.
        setNeedsInteraction(true);
      }
    };

    tryAutoplayWithSound();

    const timer = setTimeout(() => {
      if (!redirectedRef.current) {
        redirectedRef.current = true;
        navigate('/login', { replace: true });
      }
    }, INTRO_DURATION_MS);

    return () => clearTimeout(timer);
  }, [navigate]);

  const handleFinish = () => {
    if (redirectedRef.current) return;
    redirectedRef.current = true;
    navigate('/login', { replace: true });
  };

  const handleStartWithSound = async () => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    videoEl.muted = false;
    await videoEl.play();
    setNeedsInteraction(false);
  };

  return (
    <section className="intro-video-page">
      <video
        ref={videoRef}
        className="intro-video"
        src={introVideoSrc}
        autoPlay
        playsInline
        onEnded={handleFinish}
      />

      {needsInteraction && (
        <button className="intro-sound-toggle" onClick={handleStartWithSound}>
          Tap To Play With Sound
        </button>
      )}

      <button className="intro-skip" onClick={handleFinish}>
        Skip Intro
      </button>
    </section>
  );
};

export default IntroVideo;
