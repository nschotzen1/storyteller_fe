import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Keyboard from './Keyboard'; // Adjust path as needed
import '@testing-library/jest-dom'; // For extended matchers

// Constants that Keyboard expects as props
const SPECIAL_KEY_TEXT = 'THE XEROFAG'; // This is also part of the keys array
const KEY_TILT_RANDOM_MAX = 0.7;
const KEY_TILT_RANDOM_MIN = -0.7;
const KEY_OFFSET_Y_RANDOM_MAX = 1;
const KEY_OFFSET_Y_RANDOM_MIN = -1;

// Full keys array similar to TypewriterFramework.jsx for accurate row testing
const allKeys = [
  'Q','W','E','R','T','Y','U','I','O','P', // Row 1 (10 keys)
  'A','S','D','F','G','H','J','K','L',    // Row 2 (9 keys)
  'Z','X','C','V','B','N','M', SPECIAL_KEY_TEXT // Row 3 (8 keys, including SPECIAL_KEY_TEXT)
];
// Total 27 keys

// Generate sample textures based on allKeys
const allKeyTextures = allKeys.map(key => `/textures/keys/${key.replace(/\s+/g, '_').toUpperCase()}_1.png`);

describe('Keyboard Component', () => {
  const mockOnKeyPress = jest.fn();
  const mockOnXerofagPress = jest.fn();
  const mockOnSpacebarPress = jest.fn();
  const mockPlayEndOfPageSound = jest.fn();

  const defaultProps = {
    keys: allKeys,
    keyTextures: allKeyTextures,
    lastPressedKey: null,
    typingAllowed: true,
    onKeyPress: mockOnKeyPress,
    onXerofagPress: mockOnXerofagPress,
    onSpacebarPress: mockOnSpacebarPress,
    playEndOfPageSound: mockPlayEndOfPageSound,
    SPECIAL_KEY_TEXT: SPECIAL_KEY_TEXT,
    KEY_TILT_RANDOM_MAX,
    KEY_TILT_RANDOM_MIN,
    KEY_OFFSET_Y_RANDOM_MAX,
    KEY_OFFSET_Y_RANDOM_MIN,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock Math.random for predictable styling in tests if needed,
    // though testing exact random styles is brittle.
    // For now, we primarily test class application and presence.
  });

  test('renders all keys and spacebar', () => {
    render(<Keyboard {...defaultProps} />);
    allKeys.forEach(key => {
      expect(screen.getByAltText(`Key ${key}`)).toBeInTheDocument();
    });
    expect(screen.getByAltText('Spacebar')).toBeInTheDocument();
  });

  test('renders correct number of key rows (3 rows + 1 spacebar row)', () => {
    const { container } = render(<Keyboard {...defaultProps} />);
    // .key-row is used for letter keys and .spacebar-row for the spacebar
    const keyRows = container.querySelectorAll('.key-row');
    expect(keyRows.length).toBe(3 + 1); // 3 letter rows + 1 spacebar row
  });

  test('key images use correct src from keyTextures', () => {
    render(<Keyboard {...defaultProps} />);
    allKeys.forEach((key, index) => {
      expect(screen.getByAltText(`Key ${key}`)).toHaveAttribute('src', allKeyTextures[index]);
    });
    // Spacebar src is hardcoded in Keyboard.jsx
    expect(screen.getByAltText('Spacebar')).toHaveAttribute('src', '/textures/keys/spacebar.png');
  });
  
  test('applies key-pressed class when lastPressedKey matches a regular key', () => {
    render(<Keyboard {...defaultProps} lastPressedKey="Q" />);
    const keyWrapper = screen.getByAltText('Key Q').closest('.typewriter-key-wrapper');
    expect(keyWrapper).toHaveClass('key-pressed');
  });

  test('applies key-pressed class when lastPressedKey matches THE XEROFAG key', () => {
    render(<Keyboard {...defaultProps} lastPressedKey={SPECIAL_KEY_TEXT} />);
    const keyWrapper = screen.getByAltText(`Key ${SPECIAL_KEY_TEXT}`).closest('.typewriter-key-wrapper');
    expect(keyWrapper).toHaveClass('key-pressed');
  });

  test('does not apply key-pressed class to spacebar based on lastPressedKey prop', () => {
    // The Keyboard component itself doesn't apply 'key-pressed' to spacebar via lastPressedKey prop,
    // this is usually handled by specific spacebar interaction styling if any.
    render(<Keyboard {...defaultProps} lastPressedKey=" " />); // Assuming spacebar press sets lastPressedKey to " "
    const spacebarWrapper = screen.getByAltText('Spacebar').closest('.spacebar-wrapper');
    expect(spacebarWrapper).not.toHaveClass('key-pressed'); // Or any specific class for spacebar pressed state
  });


  test('calls onKeyPress for regular key click', () => {
    render(<Keyboard {...defaultProps} />);
    fireEvent.click(screen.getByAltText('Key Q').closest('.typewriter-key-wrapper'));
    expect(mockOnKeyPress).toHaveBeenCalledWith('Q');
    expect(mockOnKeyPress).toHaveBeenCalledTimes(1);
  });

  test('calls onXerofagPress for THE XEROFAG key click', () => {
    render(<Keyboard {...defaultProps} />);
    fireEvent.click(screen.getByAltText(`Key ${SPECIAL_KEY_TEXT}`).closest('.typewriter-key-wrapper'));
    expect(mockOnXerofagPress).toHaveBeenCalledTimes(1);
  });
  
  test('calls onSpacebarPress for spacebar click', () => {
    render(<Keyboard {...defaultProps} />);
    fireEvent.click(screen.getByAltText('Spacebar').closest('.spacebar-wrapper'));
    expect(mockOnSpacebarPress).toHaveBeenCalledTimes(1);
  });

  describe('when typingAllowed is false', () => {
    const propsWithTypingDisabled = { ...defaultProps, typingAllowed: false };

    test('calls playEndOfPageSound and not onKeyPress for regular key', () => {
      render(<Keyboard {...propsWithTypingDisabled} />);
      fireEvent.click(screen.getByAltText('Key W').closest('.typewriter-key-wrapper'));
      expect(mockPlayEndOfPageSound).toHaveBeenCalledTimes(1);
      expect(mockOnKeyPress).not.toHaveBeenCalled();
    });

    test('calls playEndOfPageSound and not onXerofagPress for Xerofag key', () => {
      render(<Keyboard {...propsWithTypingDisabled} />);
      fireEvent.click(screen.getByAltText(`Key ${SPECIAL_KEY_TEXT}`).closest('.typewriter-key-wrapper'));
      expect(mockPlayEndOfPageSound).toHaveBeenCalledTimes(1);
      expect(mockOnXerofagPress).not.toHaveBeenCalled();
    });

    test('calls playEndOfPageSound and not onSpacebarPress for spacebar', () => {
      render(<Keyboard {...propsWithTypingDisabled} />);
      fireEvent.click(screen.getByAltText('Spacebar').closest('.spacebar-wrapper'));
      expect(mockPlayEndOfPageSound).toHaveBeenCalledTimes(1);
      expect(mockOnSpacebarPress).not.toHaveBeenCalled();
    });

    test('key wrappers and spacebar wrapper have key-disabled class', () => {
      const { container } = render(<Keyboard {...propsWithTypingDisabled} />);
      
      // Check a sample regular key
      const regularKeyWrapper = screen.getByAltText('Key Q').closest('.typewriter-key-wrapper');
      expect(regularKeyWrapper).toHaveClass('key-disabled');
      
      // Check the Xerofag key
      const xerofagKeyWrapper = screen.getByAltText(`Key ${SPECIAL_KEY_TEXT}`).closest('.typewriter-key-wrapper');
      expect(xerofagKeyWrapper).toHaveClass('key-disabled');

      // Check the spacebar wrapper
      const spacebarWrapper = screen.getByAltText('Spacebar').closest('.spacebar-wrapper');
      expect(spacebarWrapper).toHaveClass('key-disabled');
    });

    test('key images and spacebar image have key-disabled-img class', () => {
        render(<Keyboard {...propsWithTypingDisabled} />);
        allKeys.forEach(key => {
            expect(screen.getByAltText(`Key ${key}`)).toHaveClass('key-disabled-img');
        });
        expect(screen.getByAltText('Spacebar')).toHaveClass('key-disabled-img');
      });
  });
});
