import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SeerCard from './SeerCard';

describe('SeerCard Component', () => {
  const mockCardProps = {
    id: 'test-card-1',
    name: 'The Star',
    frontImage: '/path/to/front.jpg',
    backImage: '/path/to/back.jpg',
    canFlip: true,
    isFlipped: false,
    storySnippet: 'A beacon of hope and inspiration.',
    onFlip: vi.fn(),
    orientation: 'horizontal', // Default orientation for mock
  };

  beforeEach(() => {
    // Reset the mock function before each test
    mockCardProps.onFlip.mockClear(); // mockClear is compatible
  });

  test('renders front of card correctly when not flipped', () => {
    render(<SeerCard {...mockCardProps} isFlipped={false} />);

    const frontImage = screen.getByAltText('The Star - Front');
    expect(frontImage).toBeInTheDocument();
    expect(frontImage).toHaveAttribute('src', '/path/to/front.jpg');

    // Story snippet is part of the back face, which is not visible.
    // Direct .toBeVisible() check on snippet text is unreliable with CSS transforms in JSDOM.
    // We confirm the card is not flipped, ensuring front is shown.
    const flipCardInner = frontImage.closest('.flip-card-inner');
    expect(flipCardInner).not.toHaveClass('flipped');
  });

  test('calls onFlip with card ID when a flippable card is clicked', () => {
    render(<SeerCard {...mockCardProps} canFlip={true} />);

    const cardElement = screen.getByAltText('The Star - Front').closest('.flip-card');
    expect(cardElement).toBeInTheDocument();

    fireEvent.click(cardElement);
    expect(mockCardProps.onFlip).toHaveBeenCalledTimes(1);
    expect(mockCardProps.onFlip).toHaveBeenCalledWith(mockCardProps.id);
  });

  test('does not call onFlip when a non-flippable card is clicked', () => {
    render(<SeerCard {...mockCardProps} canFlip={false} />);

    const cardElement = screen.getByAltText('The Star - Front').closest('.flip-card');
    expect(cardElement).toBeInTheDocument();

    fireEvent.click(cardElement);
    expect(mockCardProps.onFlip).not.toHaveBeenCalled();
  });

  test('renders back of card correctly when flipped', () => {
    render(<SeerCard {...mockCardProps} isFlipped={true} />);

    // To check if the back is "visible", we can check for elements unique to the back
    // The alt text for back image and the story snippet
    const backImage = screen.getByAltText('The Star - Back');
    expect(backImage).toBeInTheDocument();
    expect(backImage).toHaveAttribute('src', '/path/to/back.jpg');

    const storySnippetElement = screen.getByText(mockCardProps.storySnippet);
    expect(storySnippetElement).toBeInTheDocument();
    // Depending on CSS, it might not be "visible" in JSDOM if opacity is 0 or display none
    // but it should be in the document. If opacity is used for hiding, this check is fine.
    // If CSS makes it truly invisible to JSDOM, a more complex check might be needed or focus on presence.
  });

  test('front image is not visible when flipped', () => {
    render(<SeerCard {...mockCardProps} isFlipped={true} />);
    // For the front image to be considered "not visible" when flipped,
    // we rely on the CSS making it so (e.g. backface-visibility or opacity changes).
    // JSDOM doesn't fully compute layout/visibility from CSS.
    // A common approach is to check that it's still in the document but perhaps its parent has the 'flipped' class.
    const frontImage = screen.getByAltText('The Star - Front');
    expect(frontImage).toBeInTheDocument(); // It's still there, just hidden by CSS

    const flipCardInner = frontImage.closest('.flip-card-inner');
    expect(flipCardInner).toHaveClass('flipped');
  });

  test('applies data-orientation attribute based on orientation prop', () => {
    const { rerender } = render(<SeerCard {...mockCardProps} orientation="vertical" />);
    let cardElement = screen.getByAltText('The Star - Front').closest('.flip-card');
    expect(cardElement).toHaveAttribute('data-orientation', 'vertical');

    rerender(<SeerCard {...mockCardProps} orientation="diagonal" />);
    cardElement = screen.getByAltText('The Star - Front').closest('.flip-card');
    expect(cardElement).toHaveAttribute('data-orientation', 'diagonal');

    rerender(<SeerCard {...mockCardProps} orientation="horizontal" />);
    cardElement = screen.getByAltText('The Star - Front').closest('.flip-card');
    expect(cardElement).toHaveAttribute('data-orientation', 'horizontal');
  });

  test('does not apply data-orientation attribute if orientation prop is not provided', () => {
    // Test when orientation is undefined
    const { orientation, ...propsWithoutOrientation } = mockCardProps;
    render(<SeerCard {...propsWithoutOrientation} />);
    const cardElement = screen.getByAltText('The Star - Front').closest('.flip-card');
    // Depending on desired behavior: expect(cardElement).not.toHaveAttribute('data-orientation')
    // or expect(cardElement).toHaveAttribute('data-orientation', 'undefined') if explicitly set
    // For this implementation, it will be set to "undefined" if passed as undefined.
    // If not destructured, it won't be passed. Let's assume it's always passed from CardGrid.
    // If CardGrid might not pass it, SeerCard could default it.
    // If orientation prop is undefined, React will not render the attribute if its value is undefined.
    // Thus, getAttribute would return null, and toHaveAttribute would fail if expecting "undefined".
    // We should check that the attribute is not present or is null.
    expect(cardElement.getAttribute('data-orientation')).toBeNull();
    // Or, more directly for non-presence:
    // expect(cardElement).not.toHaveAttribute('data-orientation'); // This is a more common way
  });

});
