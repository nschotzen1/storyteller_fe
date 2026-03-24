import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Keyboard from './components/typewriter/Keyboard';
import '@testing-library/jest-dom';

const SPECIAL_KEY_TEXT = 'THE XEROFAG';
const KEY_TILT_RANDOM_MAX = 0.7;
const KEY_TILT_RANDOM_MIN = -0.7;
const KEY_OFFSET_Y_RANDOM_MAX = 1;
const KEY_OFFSET_Y_RANDOM_MIN = -1;

const allKeys = [
  'Q','W','E','R','T','Y','U','I','O','P','STORYTELLER_SLOT_HORIZONTAL',
  'A','S','D','F','G','H','J','K','L','STORYTELLER_SLOT_VERTICAL',
  'Z','X','C','V','B','N','M','STORYTELLER_SLOT_RECT_HORIZONTAL'
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

const allKeyTextures = allKeys.map((key) => {
  if (key === 'STORYTELLER_SLOT_HORIZONTAL') return '/textures/keys/blank_horizontal_1.png';
  if (key === 'STORYTELLER_SLOT_VERTICAL') return '/textures/keys/blank_vertical_1.png';
  if (key === 'STORYTELLER_SLOT_RECT_HORIZONTAL') return '/textures/keys/blank_rect_horizontal_1.png';
  return `/textures/keys/${key.replace(/\s+/g, '_').toUpperCase()}_1.png`;
});

describe('Keyboard Component', () => {
  const mockOnKeyPress = jest.fn();
  const mockOnStorytellerPress = jest.fn();
  const mockOnTextKeyPress = jest.fn();
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
    textualTypewriterKeys: [
      {
        id: 'builtin:xerofag',
        entityName: 'The Xerofag',
        keyText: SPECIAL_KEY_TEXT,
        description: 'Undead canines.',
        textureUrl: '/textures/keys/blank_rect_horizontal_1.png',
      }
    ],
    lastPressedKey: null,
    pressedStorytellerKey: null,
    typingAllowed: true,
    onKeyPress: mockOnKeyPress,
    onStorytellerPress: mockOnStorytellerPress,
    onTextKeyPress: mockOnTextKeyPress,
    onSpacebarPress: mockOnSpacebarPress,
    playEndOfPageSound: mockPlayEndOfPageSound,
    KEY_TILT_RANDOM_MAX,
    KEY_TILT_RANDOM_MIN,
    KEY_OFFSET_Y_RANDOM_MAX,
    KEY_OFFSET_Y_RANDOM_MIN,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders all standard keys, textual keys, and the spacebar', () => {
    render(<Keyboard {...defaultProps} />);
    regularKeys.forEach((key) => {
      expect(screen.getByAltText(`Key ${key}`)).toBeInTheDocument();
    });
    storytellerSlotLabels.forEach((label) => {
      expect(screen.getByAltText(label)).toBeInTheDocument();
    });
    expect(screen.getByAltText(`Key ${SPECIAL_KEY_TEXT}`)).toBeInTheDocument();
    expect(screen.getByAltText('Spacebar')).toBeInTheDocument();
  });

  test('renders correct number of key rows (3 rows + 1 textual row + 1 spacebar row)', () => {
    const { container } = render(<Keyboard {...defaultProps} />);
    const keyRows = container.querySelectorAll('.key-row');
    expect(keyRows.length).toBe(5);
  });

  test('key images use correct src from keyTextures', () => {
    render(<Keyboard {...defaultProps} />);
    regularKeys.forEach((key) => {
      const actualIndex = allKeys.findIndex((item) => item === key);
      expect(screen.getByAltText(`Key ${key}`)).toHaveAttribute('src', allKeyTextures[actualIndex]);
    });
    storytellerSlotLabels.forEach((label, index) => {
      const actualIndex = allKeys.findIndex((item) => item === storytellerSlotKeys[index]);
      expect(screen.getByAltText(label)).toHaveAttribute('src', allKeyTextures[actualIndex]);
    });
    expect(screen.getByAltText(`Key ${SPECIAL_KEY_TEXT}`)).toHaveAttribute('src', '/textures/keys/blank_rect_horizontal_1.png');
    expect(screen.getByAltText('Spacebar')).toHaveAttribute('src', '/textures/keys/spacebar.png');
  });
  
  test('applies key-pressed class when lastPressedKey matches a regular key', () => {
    render(<Keyboard {...defaultProps} lastPressedKey="Q" />);
    const keyWrapper = screen.getByAltText('Key Q').closest('.typewriter-key-wrapper');
    expect(keyWrapper).toHaveClass('key-pressed');
  });

  test('applies key-pressed class when lastPressedKey matches a textual key', () => {
    render(<Keyboard {...defaultProps} lastPressedKey={SPECIAL_KEY_TEXT} />);
    const keyWrapper = screen.getByAltText(`Key ${SPECIAL_KEY_TEXT}`).closest('.typewriter-key-wrapper');
    expect(keyWrapper).toHaveClass('key-pressed');
  });

  test('applies key-pressed class to spacebar when lastPressedKey is a space', () => {
    render(<Keyboard {...defaultProps} lastPressedKey=" " />);
    const spacebarWrapper = screen.getByAltText('Spacebar').closest('.spacebar-wrapper');
    expect(spacebarWrapper).toHaveClass('key-pressed');
  });

  test('applies held pressed state for a filled storyteller key', () => {
    render(
      <Keyboard
        {...defaultProps}
        pressedStorytellerKey="STORYTELLER_SLOT_HORIZONTAL"
        storytellerSlots={[
          { slotIndex: 0, slotKey: 'STORYTELLER_SLOT_HORIZONTAL', storytellerName: 'Aster Vell', filled: true },
          { slotIndex: 1, slotKey: 'STORYTELLER_SLOT_VERTICAL', storytellerName: '', filled: false },
          { slotIndex: 2, slotKey: 'STORYTELLER_SLOT_RECT_HORIZONTAL', storytellerName: '', filled: false },
        ]}
      />
    );
    const keyWrapper = screen.getByAltText('Storyteller key Aster Vell').closest('.typewriter-key-wrapper');
    expect(keyWrapper).toHaveClass('key-pressed');
    expect(keyWrapper).toHaveClass('storyteller-key-held');
  });

  test('calls onKeyPress for regular key click', () => {
    render(<Keyboard {...defaultProps} />);
    fireEvent.click(screen.getByAltText('Key Q').closest('.typewriter-key-wrapper'));
    expect(mockOnKeyPress).toHaveBeenCalledWith('Q');
    expect(mockOnKeyPress).toHaveBeenCalledTimes(1);
  });

  test('calls onTextKeyPress for a textual key click', () => {
    render(<Keyboard {...defaultProps} />);
    fireEvent.click(screen.getByAltText(`Key ${SPECIAL_KEY_TEXT}`).closest('.typewriter-key-wrapper'));
    expect(mockOnTextKeyPress).toHaveBeenCalledWith(
      expect.objectContaining({
        keyText: SPECIAL_KEY_TEXT
      })
    );
  });
  
  test('calls onSpacebarPress for spacebar click', () => {
    render(<Keyboard {...defaultProps} />);
    fireEvent.click(screen.getByAltText('Spacebar').closest('.spacebar-wrapper'));
    expect(mockOnSpacebarPress).toHaveBeenCalledTimes(1);
  });

  test('calls onStorytellerPress for a filled storyteller key click', () => {
    render(
      <Keyboard
        {...defaultProps}
        storytellerSlots={[
          { slotIndex: 0, slotKey: 'STORYTELLER_SLOT_HORIZONTAL', storytellerName: 'Aster Vell', filled: true },
          { slotIndex: 1, slotKey: 'STORYTELLER_SLOT_VERTICAL', storytellerName: '', filled: false },
          { slotIndex: 2, slotKey: 'STORYTELLER_SLOT_RECT_HORIZONTAL', storytellerName: '', filled: false },
        ]}
      />
    );
    fireEvent.click(screen.getByAltText('Storyteller key Aster Vell').closest('.typewriter-key-wrapper'));
    expect(mockOnStorytellerPress).toHaveBeenCalledWith(
      expect.objectContaining({
        slotKey: 'STORYTELLER_SLOT_HORIZONTAL',
        storytellerName: 'Aster Vell',
        filled: true,
      })
    );
  });

  describe('when typingAllowed is false', () => {
    const propsWithTypingDisabled = { ...defaultProps, typingAllowed: false };

    test('calls playEndOfPageSound and not onKeyPress for regular key', () => {
      render(<Keyboard {...propsWithTypingDisabled} />);
      fireEvent.click(screen.getByAltText('Key W').closest('.typewriter-key-wrapper'));
      expect(mockPlayEndOfPageSound).toHaveBeenCalledTimes(1);
      expect(mockOnKeyPress).not.toHaveBeenCalled();
    });

    test('calls playEndOfPageSound and not onTextKeyPress for textual key', () => {
      render(<Keyboard {...propsWithTypingDisabled} />);
      fireEvent.click(screen.getByAltText(`Key ${SPECIAL_KEY_TEXT}`).closest('.typewriter-key-wrapper'));
      expect(mockPlayEndOfPageSound).toHaveBeenCalledTimes(1);
      expect(mockOnTextKeyPress).not.toHaveBeenCalled();
    });

    test('calls playEndOfPageSound and not onSpacebarPress for spacebar', () => {
      render(<Keyboard {...propsWithTypingDisabled} />);
      fireEvent.click(screen.getByAltText('Spacebar').closest('.spacebar-wrapper'));
      expect(mockPlayEndOfPageSound).toHaveBeenCalledTimes(1);
      expect(mockOnSpacebarPress).not.toHaveBeenCalled();
    });

    test('calls playEndOfPageSound and not onStorytellerPress for a filled storyteller key', () => {
      render(
        <Keyboard
          {...propsWithTypingDisabled}
          storytellerSlots={[
            { slotIndex: 0, slotKey: 'STORYTELLER_SLOT_HORIZONTAL', storytellerName: 'Aster Vell', filled: true },
            { slotIndex: 1, slotKey: 'STORYTELLER_SLOT_VERTICAL', storytellerName: '', filled: false },
            { slotIndex: 2, slotKey: 'STORYTELLER_SLOT_RECT_HORIZONTAL', storytellerName: '', filled: false },
          ]}
        />
      );
      fireEvent.click(screen.getByAltText('Storyteller key Aster Vell').closest('.typewriter-key-wrapper'));
      expect(mockPlayEndOfPageSound).toHaveBeenCalledTimes(1);
      expect(mockOnStorytellerPress).not.toHaveBeenCalled();
    });

    test('key wrappers and spacebar wrapper have key-disabled class', () => {
      render(<Keyboard {...propsWithTypingDisabled} />);

      const regularKeyWrapper = screen.getByAltText('Key Q').closest('.typewriter-key-wrapper');
      expect(regularKeyWrapper).toHaveClass('key-disabled');

      const textKeyWrapper = screen.getByAltText(`Key ${SPECIAL_KEY_TEXT}`).closest('.typewriter-key-wrapper');
      expect(textKeyWrapper).toHaveClass('key-disabled');

      const spacebarWrapper = screen.getByAltText('Spacebar').closest('.spacebar-wrapper');
      expect(spacebarWrapper).toHaveClass('key-disabled');
    });

    test('key images and spacebar image have key-disabled-img class', () => {
      render(<Keyboard {...propsWithTypingDisabled} />);
      regularKeys.forEach((key) => {
        expect(screen.getByAltText(`Key ${key}`)).toHaveClass('key-disabled-img');
      });
      expect(screen.getByAltText(`Key ${SPECIAL_KEY_TEXT}`)).toHaveClass('key-disabled-img');
      expect(screen.getByAltText('Spacebar')).toHaveClass('key-disabled-img');
    });
  });
});
