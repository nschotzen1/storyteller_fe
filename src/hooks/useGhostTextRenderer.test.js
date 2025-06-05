import { renderHook } from '@testing-library/react';
import useGhostTextRenderer from './useGhostTextRenderer.jsx';
import React from 'react'; // Required for JSX elements like <br />

// Constants from the hook (can be redefined here or imported if exported from hook file)
const GHOST_ANIMATION_CLASSES = ['ghost-char-materialize', 'ghost-char-shimmer', 'ghost-char-pulse'];
const SPECIAL_KEY_TEXT_CONST = 'THE XEROFAG'; // Define for tests

describe('useGhostTextRenderer', () => {
  const defaultProps = {
    MAX_LINES: 10,
    pageTextLength: 0,
    SPECIAL_KEY_TEXT: SPECIAL_KEY_TEXT_CONST,
    aiFontColor: null,
  };

  // Helper to check common span properties
  const checkSpanProperties = (element, expectedChar, expectedColor) => {
    expect(element.type).toBe('span');
    expect(element.props.children).toBe(expectedChar);
    expect(GHOST_ANIMATION_CLASSES).toEqual(expect.arrayContaining([expect.stringMatching(/ghost-char-(materialize|shimmer|pulse)/)]));

    const animationClass = element.props.className.split(' ').find(cls => cls.startsWith('ghost-char-'));
    expect(GHOST_ANIMATION_CLASSES).toContain(animationClass);

    if (expectedColor) {
      expect(element.props.style).toEqual({ color: expectedColor });
    } else {
      expect(element.props.style).toEqual({});
    }
  };


  test('Test Case 1: Basic Ghost Text Rendering', () => {
    const { result } = renderHook(() => useGhostTextRenderer("Hi", defaultProps.MAX_LINES, defaultProps.pageTextLength, defaultProps.SPECIAL_KEY_TEXT, null));
    const elements = result.current;

    expect(elements).toHaveLength(2);
    checkSpanProperties(elements[0], 'H', null);
    checkSpanProperties(elements[1], 'i', null);
  });

  test('Test Case 2: AI Font Color Application', () => {
    const testColor = "rgb(255, 0, 0)";
    const { result } = renderHook(() => useGhostTextRenderer("Color", defaultProps.MAX_LINES, defaultProps.pageTextLength, defaultProps.SPECIAL_KEY_TEXT, testColor));
    const elements = result.current;

    expect(elements).toHaveLength(5);
    elements.forEach(el => {
        expect(el.type).toBe('span');
        expect(el.props.style).toEqual({ color: testColor });
    });
    checkSpanProperties(elements[0], 'C', testColor);
  });

  test('Test Case 3: SPECIAL_KEY_TEXT Handling (no AI color)', () => {
    const text = `Hello ${SPECIAL_KEY_TEXT_CONST} world`;
    const { result } = renderHook(() => useGhostTextRenderer(text, defaultProps.MAX_LINES, defaultProps.pageTextLength, defaultProps.SPECIAL_KEY_TEXT, null));
    const elements = result.current;

    // "Hello " = 6 chars
    // SPECIAL_KEY_TEXT_CONST = 1 span
    // " world" = 6 chars
    // Total = 6 + 1 + 6 = 13 elements
    expect(elements).toHaveLength("Hello ".length + 1 + " world".length);

    const specialKeyElement = elements.find(el => el.props.children === SPECIAL_KEY_TEXT_CONST);
    expect(specialKeyElement).toBeDefined();
    expect(specialKeyElement.type).toBe('span');
    expect(specialKeyElement.props.className).toContain('text-highlight'); // Assuming this class is for non-ghost special text
    expect(specialKeyElement.props.style).toEqual({}); // No AI color
  });

  test('Test Case 4: SPECIAL_KEY_TEXT with AI Font Color', () => {
    const text = `Test ${SPECIAL_KEY_TEXT_CONST}`;
    const testColor = "rgb(0, 0, 255)";
    const { result } = renderHook(() => useGhostTextRenderer(text, defaultProps.MAX_LINES, defaultProps.pageTextLength, defaultProps.SPECIAL_KEY_TEXT, testColor));
    const elements = result.current;

    const specialKeyElement = elements.find(el => el.props.children === SPECIAL_KEY_TEXT_CONST);
    expect(specialKeyElement).toBeDefined();
    expect(specialKeyElement.type).toBe('span');
    expect(specialKeyElement.props.className).toContain('text-highlight');
    expect(specialKeyElement.props.style).toEqual({ color: testColor }); // AI color should apply

    // Check regular chars also have the color
    const regularCharElement = elements.find(el => el.props.children === 'T');
    expect(regularCharElement.props.style).toEqual({ color: testColor });
  });

  test('Test Case 5: Line Break Handling', () => {
    const text = "Line1\nLine2";
    const { result } = renderHook(() => useGhostTextRenderer(text, defaultProps.MAX_LINES, defaultProps.pageTextLength, defaultProps.SPECIAL_KEY_TEXT, null));
    const elements = result.current;

    // Expected: L, i, n, e, 1, <br />, L, i, n, e, 2
    // Total 5 + 1 + 5 = 11 elements
    expect(elements.length).toBe(11);

    const brElement = elements.find(el => el.type === 'br');
    expect(brElement).toBeDefined();

    // Verify order (simple check)
    let brIndex = -1;
    for(let i=0; i<elements.length; ++i) {
        if(elements[i].type === 'br') {
            brIndex = i;
            break;
        }
    }
    expect(brIndex).toBe(5); // After "Line1" (5 chars)
    expect(elements[0].props.children).toBe('L');
    expect(elements[brIndex - 1].props.children).toBe('1');
    expect(elements[brIndex + 1].props.children).toBe('L');
  });

  test('Empty ghostText returns empty array', () => {
    const { result } = renderHook(() => useGhostTextRenderer("", defaultProps.MAX_LINES, defaultProps.pageTextLength, defaultProps.SPECIAL_KEY_TEXT, null));
    expect(result.current).toEqual([]);
  });

  test('ghostText with only SPECIAL_KEY_TEXT', () => {
    const { result } = renderHook(() => useGhostTextRenderer(SPECIAL_KEY_TEXT_CONST, defaultProps.MAX_LINES, defaultProps.pageTextLength, defaultProps.SPECIAL_KEY_TEXT, null));
    const elements = result.current;
    expect(elements).toHaveLength(1);
    const specialKeyElement = elements[0];
    expect(specialKeyElement.props.children).toBe(SPECIAL_KEY_TEXT_CONST);
    expect(specialKeyElement.props.className).toContain('text-highlight');
  });

});
