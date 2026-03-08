import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Keyboard from './components/typewriter/Keyboard'; // Adjust path as needed
import '@testing-library/jest-dom'; // For extended matchers

// Constants that Keyboard expects as props
const SPECIAL_KEY_TEXT = 'THE XEROFAG'; // This is also part of the keys array
const KEY_TILT_RANDOM_MAX = 0.7;
const KEY_TILT_RANDOM_MIN = -0.7;
const KEY_OFFSET_Y_RANDOM_MAX = 1;
const KEY_OFFSET_Y_RANDOM_MIN = -1;

// Full keys array similar to TypewriterFramework.jsx for accurate row testing
const allKeys = [
  'Q','W','E','R','T','Y','U','I','O','P','STORYTELLER_SLOT_HORIZONTAL',
  'A','S','D','F','G','H','J','K','L','STORYTELLER_SLOT_VERTICAL',
  'Z','X','C','V','B','N','M','STORYTELLER_SLOT_RECT_HORIZONTAL', SPECIAL_KEY_TEXT
];
const regularKeys = allKeys.filter((key) => !key.startsWith('STORYTELLER_SLOT_'));
const storytellerSlotKeys = [
  'STORYTELLER_SLOT_HORIZONTAL',
  'STORYTELLER_SLOT_VERTICAL',
  'STORYTELLER_SLOT_RECT_HORIZONTAL'
];
const storytellerSlotLabels = [
  'Blank storyteller slot 1',
  'Blank storyteller slot 2',
  'Blank storyteller slot 3'
];

// Generate sample textures based on allKeys
const allKeyTextures = allKeys.map((key) => {
  if (key === 'STORYTELLER_SLOT_HORIZONTAL') return '/textures/keys/blank_horizontal_1.png';
  if (key === 'STORYTELLER_SLOT_VERTICAL') return '/textures/keys/blank_vertical_1.png';
  if (key === 'STORYTELLER_SLOT_RECT_HORIZONTAL') return '/textures/keys/blank_rect_horizontal_1.png';
  return `/textures/keys/${key.replace(/\s+/g, '_').toUpperCase()}_1.png`;
});

describe('Keyboard Component', () => {
  const mockOnKeyPress = jest.fn();
  const mockOnXerofagPress = jest.fn();
  const mockOnSpacebarPress = jest.fn();
  const mockPlayEndOfPageSound = jest.fn();

  const defaultProps = {
    keys: allKeys,
    keyTextures: allKeyTextures,
    storytellerSlots: [
      { slotIndex: 0, slotKey: 'STORYTELLER_SLOT_HORIZONTAL', storytellerName: '', filled: false },
      { slotIndex: 1, slotKey: 'STORYTELLER_SLOT_VERTICAL', storytellerName: '', filled: false },
      { slotIndex: 2, slotKey: 'STORYTELLER_SLOT_RECT_HORIZONTAL', storytellerName: '', filled: false },
    ],
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
    regularKeys.forEach(key => {
      expect(screen.getByAltText(`Key ${key}`)).toBeInTheDocument();
    });
    storytellerSlotLabels.forEach((label) => {
      expect(screen.getByAltText(label)).toBeInTheDocument();
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
    regularKeys.forEach((key, index) => {
      const actualIndex = allKeys.findIndex((item) => item === key);
      expect(screen.getByAltText(`Key ${key}`)).toHaveAttribute('src', allKeyTextures[actualIndex]);
    });
    storytellerSlotLabels.forEach((label, index) => {
      const actualIndex = allKeys.findIndex((item) => item === storytellerSlotKeys[index]);
      expect(screen.getByAltText(label)).toHaveAttribute('src', allKeyTextures[actualIndex]);
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

  test('applies key-pressed class to spacebar when lastPressedKey is a space', () => {
    render(<Keyboard {...defaultProps} lastPressedKey=" " />); // Assuming spacebar press sets lastPressedKey to " "
    const spacebarWrapper = screen.getByAltText('Spacebar').closest('.spacebar-wrapper');
    expect(spacebarWrapper).toHaveClass('key-pressed');
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
        regularKeys.forEach(key => {
            expect(screen.getByAltText(`Key ${key}`)).toHaveClass('key-disabled-img');
        });
        expect(screen.getByAltText('Spacebar')).toHaveClass('key-disabled-img');
      });
  });
});
