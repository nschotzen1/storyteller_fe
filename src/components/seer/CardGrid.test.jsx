import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CardGrid from './CardGrid';
import { fetchSeerCards } from '../../apiService'; // To be mocked

// Mock framer-motion
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');
  return {
    ...actual,
    motion: {
      ...actual.motion,
      div: ({ children, ...props }) => <div {...props}>{children}</div>, // Replace motion.div with a simple div
    },
  };
});

// Mock apiService
vi.mock('../../apiService.js', () => ({
  fetchSeerCards: vi.fn(),
}));

const mockCardsData = [
  {
    id: 'card-1',
    name: 'The Sun',
    frontImage: '/img/sun-front.jpg',
    backImage: '/img/sun-back.jpg',
    canFlip: true,
    isFlipped: false,
    storySnippet: 'Radiant joy and success.',
    gridPosition: { row: 1, col: 1 },
    size: { rows: 1, cols: 1 },
  },
  {
    id: 'card-2',
    name: 'The Moon',
    frontImage: '/img/moon-front.jpg',
    backImage: '/img/moon-back.jpg',
    canFlip: false,
    isFlipped: false,
    storySnippet: 'Intuition and hidden things.',
    gridPosition: { row: 1, col: 2 },
    size: { rows: 1, cols: 1 },
  },
  {
    id: 'card-3',
    name: 'The Flippable',
    frontImage: '/img/flippable-front.jpg',
    backImage: '/img/flippable-back.jpg',
    canFlip: true,
    isFlipped: false,
    storySnippet: 'This card can flip.',
    gridPosition: { row: 2, col: 1 },
    size: { rows: 1, cols: 1 },
  },
];

describe('CardGrid Component', () => {
  beforeEach(() => {
    fetchSeerCards.mockReset();
  });

  test('displays loading message initially', () => {
    fetchSeerCards.mockReturnValue(new Promise(() => {})); // Promise that never resolves
    render(<CardGrid />);
    expect(screen.getByText('Loading cards...')).toBeInTheDocument();
  });

  test('fetches and displays cards', async () => {
    fetchSeerCards.mockResolvedValue({ data: mockCardsData, error: null });
    render(<CardGrid />);

    await waitFor(() => {
      expect(screen.getByAltText('The Sun - Front')).toBeInTheDocument();
      expect(screen.getByAltText('The Moon - Front')).toBeInTheDocument();
      expect(screen.getByAltText('The Flippable - Front')).toBeInTheDocument();
    });
    // Double check, this is redundant if waitFor succeeds with these checks.
    // expect(screen.getByAltText('The Sun - Front')).toBeInTheDocument();
    // expect(screen.getByAltText('The Moon - Front')).toBeInTheDocument();
  });

  test('displays error message on fetch failure', async () => {
    fetchSeerCards.mockResolvedValue({ data: null, error: { message: 'Failed to fetch cards' } });
    render(<CardGrid />);

    await waitFor(() => {
      expect(screen.getByText(/Error: Failed to fetch cards/i)).toBeInTheDocument();
    });
  });

  test('handles card flip for a flippable card', async () => {
    const flippableCard = mockCardsData.find(card => card.id === 'card-3');
    fetchSeerCards.mockResolvedValue({ data: [...mockCardsData], error: null }); // Use a fresh copy of data

    render(<CardGrid />);

    await waitFor(() => {
      // Check for the specific card by its front image alt text
      expect(screen.getByAltText(`${flippableCard.name} - Front`)).toBeInTheDocument();
    });

    const cardFrontElement = screen.getByAltText(`${flippableCard.name} - Front`);
    const cardOuterDiv = cardFrontElement.closest('.flip-card'); // Assuming SeerCard structure

    expect(cardOuterDiv).toBeInTheDocument();

    // Check initial state: not flipped
    const flipInnerDivBeforeClick = cardFrontElement.closest('.flip-card-inner');
    expect(flipInnerDivBeforeClick).not.toHaveClass('flipped');

    fireEvent.click(cardOuterDiv);

    await waitFor(() => {
      const flipInnerDivAfterClick = screen.getByAltText(`${flippableCard.name} - Front`).closest('.flip-card-inner');
      expect(flipInnerDivAfterClick).toHaveClass('flipped');
    });

    // Optional: Verify back of the card content is now "more visible"
    // This depends on SeerCard.test.jsx confirming how 'flipped' class affects visibility
    expect(screen.getByAltText(`${flippableCard.name} - Back`)).toBeInTheDocument();
    expect(screen.getByText(flippableCard.storySnippet)).toBeInTheDocument();
  });

  test('does not flip a non-flippable card', async () => {
    const nonFlippableCard = mockCardsData.find(card => card.id === 'card-2'); // The Moon
    fetchSeerCards.mockResolvedValue({ data: [...mockCardsData], error: null });

    render(<CardGrid />);

    await waitFor(() => {
      // Check for the specific card by its front image alt text
      expect(screen.getByAltText(`${nonFlippableCard.name} - Front`)).toBeInTheDocument();
    });

    const cardFrontElement = screen.getByAltText(`${nonFlippableCard.name} - Front`);
    const cardOuterDiv = cardFrontElement.closest('.flip-card');
    expect(cardOuterDiv).toBeInTheDocument();

    const flipInnerDivBeforeClick = cardFrontElement.closest('.flip-card-inner');
    expect(flipInnerDivBeforeClick).not.toHaveClass('flipped');

    fireEvent.click(cardOuterDiv);

    // Wait a brief moment to ensure no async state update occurs
    await new Promise(r => setTimeout(r, 100));

    const flipInnerDivAfterClick = screen.getByAltText(`${nonFlippableCard.name} - Front`).closest('.flip-card-inner');
    expect(flipInnerDivAfterClick).not.toHaveClass('flipped');

  });
});
