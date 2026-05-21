import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';

vi.mock('./CurtainIntro', () => ({
  default: ({ onReveal }) => (
    <button type="button" data-testid="curtain-intro" onClick={() => onReveal?.()}>
      Reveal curtain
    </button>
  )
}));

vi.mock('./CurtainOutro', () => ({
  default: ({ onDropComplete }) => (
    <button type="button" data-testid="curtain-outro" onClick={() => onDropComplete?.()}>
      Drop curtain
    </button>
  )
}));

vi.mock('./TypewriterFramework', () => ({
  default: () => <div data-testid="typewriter-framework">Typewriter view</div>
}));

vi.mock('./pages/TypewriterAdminPage', () => ({
  default: () => <div data-testid="story-admin-page">Story admin</div>
}));

const renderAppAt = (search = '') => {
  const nextUrl = search ? `/${search.startsWith('?') ? search : `?${search}`}` : '/';
  window.history.replaceState({}, '', nextUrl);
  return render(<App />);
};

describe('App typewriter workspace', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('opens on the typewriter view by default', () => {
    renderAppAt();

    expect(screen.getByTestId('typewriter-framework')).toBeInTheDocument();
    expect(screen.getByTestId('curtain-intro')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Typewriter' })).toHaveClass('active');
    expect(screen.getByLabelText('App views')).toHaveClass('appViewSwitch-obscured');
  });

  it('opens the curtain after the typewriter intro reveals', () => {
    renderAppAt('?view=typewriter');

    fireEvent.click(screen.getByTestId('curtain-intro'));

    expect(screen.queryByTestId('curtain-intro')).not.toBeInTheDocument();
    expect(screen.getByLabelText('App views')).not.toHaveClass('appViewSwitch-obscured');
    expect(screen.getByTestId('typewriter-framework')).toBeInTheDocument();
  });

  it('runs the curtain outro before leaving for Story Admin', () => {
    renderAppAt('?view=typewriter');

    fireEvent.click(screen.getByTestId('curtain-intro'));
    fireEvent.click(screen.getByRole('button', { name: 'Story Admin' }));

    expect(screen.getByTestId('typewriter-framework')).toBeInTheDocument();
    expect(screen.getByTestId('curtain-outro')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('curtain-outro'));

    expect(screen.getByTestId('story-admin-page')).toBeInTheDocument();
    expect(screen.queryByTestId('typewriter-framework')).not.toBeInTheDocument();
  });

  it('treats the legacy typewriter-admin query alias as Story Admin', () => {
    renderAppAt('?view=typewriter-admin');

    expect(screen.getByTestId('story-admin-page')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Story Admin' })).toHaveClass('active');
  });
});
