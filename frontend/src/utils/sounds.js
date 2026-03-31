const gameStartSoundSrc = '/media/game_start_sound.mp3';
const gameOverSoundSrc = '/media/game_over_sound.mp3';
const bonusSoundSrc = '/media/bonus_sound.mp3';
const buttonClickSoundSrc = '/media/button_click_sound.mp3';

const canUseAudio = () => typeof window !== 'undefined' && typeof Audio !== 'undefined';

const createTemplate = (src, volume) => {
  if (!canUseAudio()) return null;
  const audio = new Audio(src);
  audio.preload = 'auto';
  audio.volume = volume;
  return audio;
};

const templates = {
  gameStart: createTemplate(gameStartSoundSrc, 0.55),
  gameOver: createTemplate(gameOverSoundSrc, 0.55),
  bonus: createTemplate(bonusSoundSrc, 0.6),
  buttonClick: createTemplate(buttonClickSoundSrc, 0.35),
};

const safePlay = (template) => {
  if (!template) return;
  const shot = template.cloneNode(true);
  shot.volume = template.volume;
  void shot.play().catch(() => {});
};

export const SFX = {
  gameStart: () => safePlay(templates.gameStart),
  gameOver: () => safePlay(templates.gameOver),
  bonus: () => safePlay(templates.bonus),
  buttonClick: () => safePlay(templates.buttonClick),
};
