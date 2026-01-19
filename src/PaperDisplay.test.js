import { describe, test, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import PaperDisplay from './components/typewriter/PaperDisplay.jsx';

describe('PaperDisplay Component', () => {
  test('renders the component', () => {
    render(<PaperDisplay />);
    expect(screen.getByText('Hello')).toBeDefined();
  });
});
