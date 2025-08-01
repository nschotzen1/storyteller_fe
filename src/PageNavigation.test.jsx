import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom'; // For extended matchers like .toBeDisabled()
import PageNavigation from './components/typewriter/PageNavigation';
import { vi, describe, it, expect, beforeEach, test } from 'vitest';

// Define default props and styling constants that PageNavigation expects
const DEFAULT_STYLING_PROPS = {
  PAGE_NAVIGATION_BUTTONS_TOP: '3vh',
  PAGE_NAVIGATION_BUTTONS_Z_INDEX: 20,
  PAGE_NAVIGATION_BUTTONS_PADDING: '0 3vw', // Matches the prop used in PageNavigation.jsx
  PAGE_NAVIGATION_BUTTON_FONT_SIZE: 24,
  PAGE_NAVIGATION_BUTTON_DISABLED_OPACITY: 0.3, // This is used by the component's style logic
  PAGE_COUNT_TEXT_COLOR: '#887',
  PAGE_COUNT_TEXT_FONT_FAMILY: 'IBM Plex Mono, monospace',
  PAGE_COUNT_TEXT_FONT_SIZE: 16,
};


describe('PageNavigation Component', () => {
  const mockOnPrevPage = vi.fn();
  const mockOnNextPage = vi.fn();

  const defaultProps = {
    currentPage: 0,
    totalPages: 5,
    onPrevPage: mockOnPrevPage,
    onNextPage: mockOnNextPage,
    isSliding: false,
    ...DEFAULT_STYLING_PROPS,
  };

  beforeEach(() => {
    // Clear mock call history before each test
    vi.clearAllMocks();
  });

  test('renders correctly with initial props', () => {
    render(<PageNavigation {...defaultProps} />);
    expect(screen.getByText('← Prev')).toBeInTheDocument();
    expect(screen.getByText('Next →')).toBeInTheDocument();
    expect(screen.getByText('Page 1 / 5')).toBeInTheDocument();
  });

  test('displays correct page numbers when props change', () => {
    render(<PageNavigation {...defaultProps} currentPage={2} totalPages={10} />);
    expect(screen.getByText('Page 3 / 10')).toBeInTheDocument();
  });

  test('Prev button is disabled on the first page (currentPage 0)', () => {
    render(<PageNavigation {...defaultProps} currentPage={0} />);
    expect(screen.getByText('← Prev')).toBeDisabled();
  });

  test('Next button is disabled on the last page', () => {
    // currentPage is 0-indexed, so last page is totalPages - 1
    render(<PageNavigation {...defaultProps} currentPage={4} totalPages={5} />);
    expect(screen.getByText('Next →')).toBeDisabled();
  });

  test('Prev button is enabled when not on the first page', () => {
    render(<PageNavigation {...defaultProps} currentPage={1} />);
    expect(screen.getByText('← Prev')).toBeEnabled();
  });

  test('Next button is enabled when not on the last page', () => {
    render(<PageNavigation {...defaultProps} currentPage={0} totalPages={5} />); // Not on last page
    expect(screen.getByText('Next →')).toBeEnabled();
  });
  
  test('both Prev and Next buttons are disabled when isSliding is true', () => {
    // Ensure buttons would otherwise be enabled
    render(<PageNavigation {...defaultProps} currentPage={1} totalPages={5} isSliding={true} />);
    expect(screen.getByText('← Prev')).toBeDisabled();
    expect(screen.getByText('Next →')).toBeDisabled();
  });

  test('calls onPrevPage callback when Prev button is clicked and enabled', () => {
    render(<PageNavigation {...defaultProps} currentPage={1} />); // Prev button enabled
    fireEvent.click(screen.getByText('← Prev'));
    expect(mockOnPrevPage).toHaveBeenCalledTimes(1);
  });

  test('calls onNextPage callback when Next button is clicked and enabled', () => {
    render(<PageNavigation {...defaultProps} currentPage={0} />); // Next button enabled
    fireEvent.click(screen.getByText('Next →'));
    expect(mockOnNextPage).toHaveBeenCalledTimes(1);
  });

  test('does not call onPrevPage when Prev button is clicked but disabled (on first page)', () => {
    render(<PageNavigation {...defaultProps} currentPage={0} />); // Prev button disabled
    fireEvent.click(screen.getByText('← Prev'));
    expect(mockOnPrevPage).not.toHaveBeenCalled();
  });

  test('does not call onNextPage when Next button is clicked but disabled (on last page)', () => {
    render(<PageNavigation {...defaultProps} currentPage={4} totalPages={5} />); // Next button disabled
    fireEvent.click(screen.getByText('Next →'));
    expect(mockOnNextPage).not.toHaveBeenCalled();
  });

  test('does not call onPrevPage or onNextPage when buttons are clicked but isSliding is true', () => {
    render(<PageNavigation {...defaultProps} currentPage={1} totalPages={5} isSliding={true} />);
    fireEvent.click(screen.getByText('← Prev'));
    fireEvent.click(screen.getByText('Next →'));
    expect(mockOnPrevPage).not.toHaveBeenCalled();
    expect(mockOnNextPage).not.toHaveBeenCalled();
  });

  test('renders correct page number when totalPages is 1', () => {
    render(<PageNavigation {...defaultProps} currentPage={0} totalPages={1} />);
    expect(screen.getByText('Page 1 / 1')).toBeInTheDocument();
    expect(screen.getByText('← Prev')).toBeDisabled();
    expect(screen.getByText('Next →')).toBeDisabled();
  });
});
