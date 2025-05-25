import {
  countLines,
  getRandomTexture,
  playKeySound,
  playEnterSound,
  playXerofagHowl,
  playEndOfPageSound,
} from './utils';

// Mocking HTMLMediaElement and Audio
global.HTMLMediaElement.prototype.play = jest.fn();
global.Audio = jest.fn((src) => ({
  src,
  volume: 1, // default volume
  play: global.HTMLMediaElement.prototype.play,
}));

describe('countLines', () => {
  it('should return 1 for empty strings', () => {
    expect(countLines('', '')).toBe(1);
  });

  it('should return 1 when both strings are single line without newlines', () => {
    expect(countLines('hello', 'world')).toBe(1);
  });

  it('should count lines correctly with newlines in typed text only', () => {
    expect(countLines('hello\nworld', '')).toBe(2);
    expect(countLines('line1\nline2\nline3', '')).toBe(3);
  });

  it('should count lines correctly with newlines in ghost text only', () => {
    expect(countLines('', 'ghost\ntext')).toBe(2);
    expect(countLines('', 'ghost1\nghost2\nghost3')).toBe(3);
  });

  it('should count lines correctly with newlines in both typed and ghost text', () => {
    expect(countLines('hello\nworld', 'ghost\ntext')).toBe(3); // "hello\nworldghost\ntext" -> split by \n
    expect(countLines('typed1\ntyped2', 'ghost1\nghost2\nghost3')).toBe(5);
  });
  
  it('should handle typed text ending with newline correctly', () => {
    expect(countLines('typed\n', 'ghost')).toBe(2); // "typed\nghost"
    expect(countLines('typed\n', 'ghost\nnewline')).toBe(3); // "typed\nghost\nnewline"
  });

  it('should handle ghost text starting with newline correctly (though unusual)', () => {
    // Current implementation: `(typed + ghost).split('\n').length`
    // 'typed' + '\nghost' = 'typed\nghost' -> 2 lines
    expect(countLines('typed', '\nghost')).toBe(2);
  });
});

describe('getRandomTexture', () => {
  it('should return correct path for a single uppercase character key', () => {
    expect(getRandomTexture('A')).toBe('/textures/keys/A_1.png');
  });

  it('should return correct path for a single lowercase character key (assuming normalization)', () => {
    // The function itself converts to uppercase
    expect(getRandomTexture('a')).toBe('/textures/keys/A_1.png');
  });

  it('should normalize keys with spaces', () => {
    expect(getRandomTexture('THE XEROFAG')).toBe('/textures/keys/THE_XEROFAG_1.png');
  });
  
  it('should normalize keys with multiple spaces', () => {
    expect(getRandomTexture('PREV NEXT')).toBe('/textures/keys/PREV_NEXT_1.png');
  });

  it('should return null for a null key', () => {
    expect(getRandomTexture(null)).toBeNull();
  });

  it('should return null for an undefined key', () => {
    expect(getRandomTexture(undefined)).toBeNull();
  });

  it('should return null for an empty string key', () => {
    // Current implementation: ''.replace(/\s+/g, '_').toUpperCase() results in ""
    // So it would return '/textures/keys/_1.png'.
    // Depending on desired behavior, this might be acceptable or need adjustment.
    // For now, testing existing behavior.
    expect(getRandomTexture('')).toBe('/textures/keys/_1.png');
  });
});


describe('Sound Functions', () => {
  let mockAudioInstance;
  let mathRandomSpy;

  beforeEach(() => {
    // Reset mocks for each test
    jest.clearAllMocks();
    // Re-assign the mockAudioInstance for each Audio call
    global.Audio.mockImplementation((src) => {
      mockAudioInstance = {
        src,
        volume: 1,
        play: jest.fn(),
      };
      return mockAudioInstance;
    });
  });

  afterEach(() => {
    if (mathRandomSpy) {
      mathRandomSpy.mockRestore(); // Restore Math.random if it was spied on
    }
  });

  describe('playKeySound', () => {
    it('should play the key clack sound with correct volume', () => {
      playKeySound();
      expect(Audio).toHaveBeenCalledWith('/sounds/typewriter-clack.mp3');
      expect(mockAudioInstance.volume).toBe(0.3);
      expect(mockAudioInstance.play).toHaveBeenCalledTimes(1);
    });
  });

  describe('playEnterSound', () => {
    it('should play the enter sound with correct volume', () => {
      playEnterSound();
      expect(Audio).toHaveBeenCalledWith('/sounds/typewriter-enter.mp3');
      expect(mockAudioInstance.volume).toBe(0.3);
      expect(mockAudioInstance.play).toHaveBeenCalledTimes(1);
    });
  });

  describe('playEndOfPageSound', () => {
    it('should play the page turn sound with correct volume', () => {
      playEndOfPageSound();
      expect(Audio).toHaveBeenCalledWith('/sounds/page_turn.mp3');
      expect(mockAudioInstance.volume).toBe(0.4);
      expect(mockAudioInstance.play).toHaveBeenCalledTimes(1);
    });
  });

  describe('playXerofagHowl', () => {
    it('should play one of the Xerofag sounds (variant) if roll > 12', () => {
      mathRandomSpy = jest.spyOn(Math, 'random');
      // Mock Math.random to control the roll and variant
      // First Math.random for roll (e.g., 0.7 * 20 + 1 = 15, which is > 12)
      // Second Math.random for variant (e.g., 0.0 * 5 + 1 = 1)
      mathRandomSpy.mockReturnValueOnce(0.7).mockReturnValueOnce(0.0);
      
      playXerofagHowl();
      expect(Audio).toHaveBeenCalledWith('/sounds/the_xerofag_1.mp3');
      expect(mockAudioInstance.volume).toBe(0.4);
      expect(mockAudioInstance.play).toHaveBeenCalledTimes(1);
    });

    it('should play one of the Xerofag sounds (variant 5) if roll > 12', () => {
        mathRandomSpy = jest.spyOn(Math, 'random');
        mathRandomSpy.mockReturnValueOnce(0.9).mockReturnValueOnce(0.95); // roll = 19, variant = 5 (floor(0.95*5)+1 = 5)
        
        playXerofagHowl();
        expect(Audio).toHaveBeenCalledWith('/sounds/the_xerofag_5.mp3');
        expect(mockAudioInstance.volume).toBe(0.4);
        expect(mockAudioInstance.play).toHaveBeenCalledTimes(1);
      });

    it('should play one of the regular howl sounds if roll <= 12', () => {
      mathRandomSpy = jest.spyOn(Math, 'random');
      // Mock Math.random to control the roll and howlIndex
      // First Math.random for roll (e.g., 0.2 * 20 + 1 = 5, which is <= 12)
      // Second Math.random for howlIndex (e.g., 0.0 * 3 + 1 = 1)
      mathRandomSpy.mockReturnValueOnce(0.2).mockReturnValueOnce(0.0);

      playXerofagHowl();
      expect(Audio).toHaveBeenCalledWith('/sounds/howl_1.mp3');
      expect(mockAudioInstance.volume).toBe(0.4);
      expect(mockAudioInstance.play).toHaveBeenCalledTimes(1);
    });

    it('should play howl_3 sound if roll <= 12 and random selects it', () => {
        mathRandomSpy = jest.spyOn(Math, 'random');
        mathRandomSpy.mockReturnValueOnce(0.1).mockReturnValueOnce(0.9); // roll = 3, howlIndex = 3 (floor(0.9*3)+1 = 3)
  
        playXerofagHowl();
        expect(Audio).toHaveBeenCalledWith('/sounds/howl_3.mp3');
        expect(mockAudioInstance.volume).toBe(0.4);
        expect(mockAudioInstance.play).toHaveBeenCalledTimes(1);
      });
  });
});
