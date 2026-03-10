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
  const audioSrc = roll === 1 ? '/sounds/ghostwriter_click1.mp3' : '/sounds/ghostwriter_click2.mp3';
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

export const playStorytellerKeyPressSound = () => {
  const audio = new Audio('/sounds/typewriter-enter.mp3');
  audio.volume = 0.26;
  audio.playbackRate = 0.82;
  audio.play();
};

export function countLines(typed, ghost = '') {
  return (typed + ghost).split('\n').length;
}

export const playPreGhostSound = () => {
  const takeoverVariant = Math.floor(Math.random() * 4) + 1;
  const audio = new Audio(`/sounds/ghostwriter/ghost_takeover_${takeoverVariant}.mp3`);
  audio.volume = 0.3;
  audio.playbackRate = 0.8;
  const playPromise = audio.play();
  if (playPromise !== undefined) {
    playPromise.catch(e => console.log('PreGhost sound prevented', e));
  }
};

export const fetchAndPlayElevenLabsTTS = async (text) => {
  if (!text || !text.trim()) return Promise.resolve();
  console.log(`[ElevenLabs API Placeholder] Sending user text for TTS: "${text.trim()}"`);

  // Simulated API call and playback
  return new Promise(resolve => {
    // Generate an imaginary audio duration for the speech
    const simulatedDuration = Math.max(1000, text.length * 50);
    setTimeout(() => {
      console.log(`[ElevenLabs API Placeholder] Audio finished playing.`);
      resolve();
    }, simulatedDuration);
  });
};

export class AmbientSoundManager {
  constructor() {
    this.audio = new Audio('/audio/typewriter-narration.mp3');
    this.audio.loop = true;
    this.audio.volume = 0.05; // Base low drone
  }

  startAmbient() {
    const playPromise = this.audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(e => console.log("Ambient autoplay prevented", e));
    }
  }

  stopAmbient() {
    try {
      this.audio.pause();
    } catch (e) {
      // jsdom does not implement HTMLMediaElement.prototype.pause
    }
  }

  intensify() {
    this.audio.volume = 0.25; // Swell during ghost activity
  }

  relax() {
    this.audio.volume = 0.05;
  }
}

export const ambientSoundManager = new AmbientSoundManager();
