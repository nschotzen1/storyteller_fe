export const getRandomTexture = (key) => {
  if (!key) return null;
  const normalizedKey = key.replace(/\s+/g, '_').toUpperCase();
  return `/textures/keys/${normalizedKey}_1.png`;
};

export const playKeySound = () => {
  const audio = new Audio('/sounds/typewriter-clack.mp3');
  audio.volume = 0.3;
  audio.play();
};

export const playGhostWriterSound = () => {
  const roll = Math.floor(Math.random() * 2) + 1;
  const audioSrc = roll === 1 ? '/sounds/ghostwriter_click_1.mp3' : '/sounds/ghostwriter_clack_2.mp3'; 
  const audio = new Audio(audioSrc);
  audio.volume = 0.3;
  audio.play();
};

export const playEnterSound = () => {
  const audio = new Audio('/sounds/typewriter-enter.mp3');
  audio.volume = 0.3;
  audio.play();
};

export const playXerofagHowl = () => {
  const roll = Math.floor(Math.random() * 20) + 1;
  let audioSrc;
  if (roll > 12) {
    const variant = Math.floor(Math.random() * 5) + 1;
    audioSrc = `/sounds/the_xerofag_${variant}.mp3`;
  } else {
    const howlIndex = Math.floor(Math.random() * 3) + 1;
    audioSrc = `/sounds/howl_${howlIndex}.mp3`;
  }
  const audio = new Audio(audioSrc);
  audio.volume = 0.4;
  audio.play();
};

export const playEndOfPageSound = () => {
  const audio = new Audio('/sounds/page_turn.mp3');
  audio.volume = 0.4;
  audio.play();
};

export function countLines(typed, ghost = '') {
  return (typed + ghost).split('\n').length;
}
