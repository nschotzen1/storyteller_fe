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

vi.mock('./pages/PlayerLogin', () => ({
  default: () => <div data-testid="player-login">Arena login</div>
}));

vi.mock('./components/storyteller/StorytellerArenaConsole', () => ({
  default: () => <div data-testid="arena-console">Arena console</div>
}));

vi.mock('./pages/RoseCourtProloguePage', () => ({
  default: () => <div data-testid="rose-court-page">Rose Court</div>
}));

vi.mock('./pages/RoseCourtMontagePage', () => ({
  default: () => <div data-testid="rose-court-montage-page">Montage</div>
}));

vi.mock('./pages/WellDemoPage', () => ({
  default: () => <div data-testid="well-page">Well</div>
}));

vi.mock('./pages/QuestAdminPage', () => ({
  default: () => <div data-testid="quest-admin-page">Quest admin</div>
}));

vi.mock('./pages/MemorySpreadPage', () => ({
  default: () => <div data-testid="memory-spread-page">Memory spread</div>
}));

vi.mock('./pages/TypewriterAdminPage', () => ({
  default: () => <div data-testid="story-admin-page">Story admin</div>
}));

vi.mock('./Messanger', () => ({
  default: () => <div data-testid="messanger-page">Messanger</div>
}));

const renderAppAt = (search = '', { skipAppIntro = true } = {}) => {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  if (skipAppIntro && !params.has('skipAppIntro')) {
    params.set('skipAppIntro', '1');
  }
  if (!skipAppIntro) {
    params.delete('skipAppIntro');
  }
  const nextQuery = params.toString();
  const nextUrl = nextQuery ? `/?${nextQuery}` : '/';
  window.history.replaceState({}, '', nextUrl);
  return render(<App />);
};

describe('App curtain view orchestration', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('shows the curtain intro when typewriter is the initial view', () => {
    renderAppAt('?view=typewriter');

    expect(screen.getByTestId('typewriter-framework')).toBeInTheDocument();
    expect(screen.getByTestId('curtain-intro')).toBeInTheDocument();
    expect(screen.getByLabelText('App views')).toHaveClass('appViewSwitch-obscured');
  });

  it('opens the curtain when the intro reveals the typewriter view', () => {
    renderAppAt('?view=typewriter');

    fireEvent.click(screen.getByTestId('curtain-intro'));

    expect(screen.queryByTestId('curtain-intro')).not.toBeInTheDocument();
    expect(screen.getByLabelText('App views')).not.toHaveClass('appViewSwitch-obscured');
    expect(screen.getByTestId('typewriter-framework')).toBeInTheDocument();
  });

  it('runs the curtain outro before leaving the typewriter view', () => {
    renderAppAt('?view=typewriter');

    fireEvent.click(screen.getByTestId('curtain-intro'));
    fireEvent.click(screen.getByRole('button', { name: 'Arena' }));

    expect(screen.getByTestId('typewriter-framework')).toBeInTheDocument();
    expect(screen.getByTestId('curtain-outro')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('curtain-outro'));

    expect(screen.getByTestId('player-login')).toBeInTheDocument();
    expect(screen.queryByTestId('typewriter-framework')).not.toBeInTheDocument();
  });

  it('shows the curtain intro again when navigating into the typewriter view', () => {
    renderAppAt();

    fireEvent.click(screen.getByRole('button', { name: 'Typewriter' }));

    expect(screen.getByTestId('typewriter-framework')).toBeInTheDocument();
    expect(screen.getByTestId('curtain-intro')).toBeInTheDocument();
  });

  it('opens the well view directly from the query param', () => {
    renderAppAt('?view=well');

    expect(screen.getByTestId('well-page')).toBeInTheDocument();
  });

  it('shows the montage view from the startup selector', () => {
    renderAppAt();

    fireEvent.click(screen.getByRole('button', { name: 'Montage' }));

    expect(screen.getByTestId('rose-court-montage-page')).toBeInTheDocument();
  });

  it('exposes seer reading directly from the top-level navigation', () => {
    renderAppAt();

    fireEvent.click(screen.getByRole('button', { name: 'Seer Reading' }));

    expect(screen.getByTestId('memory-spread-page')).toBeInTheDocument();
    expect(window.location.search).toContain('view=memory-spread');
    expect(window.location.search).toContain('memoryDebug=1');
    expect(window.location.search).toContain('seerFixture=authority');
  });

  it('blocks the app behind the intro overlay until the intro is dismissed', () => {
    renderAppAt('', { skipAppIntro: false });

    expect(screen.getByLabelText('Game introduction')).toBeInTheDocument();
    expect(screen.queryByLabelText('App views')).not.toBeInTheDocument();
  });
});
