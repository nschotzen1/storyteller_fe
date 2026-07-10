import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SocietyChat from './SocietyChat';

const messages = [
  { role: 'society', beatId: 'm_first_contact', text: 'You are the author of record.', flags: { flicker: true, misaligned: true } },
  { role: 'player', beatId: 'q_identity', choiceLabel: 'I am.' },
  { role: 'society', beatId: 'm_parcel', text: 'Do not open it indoors.', flags: {}, timestampJump: 'three days later' }
];

const question = {
  beatId: 'q_identity',
  text: 'Are you the author?',
  options: [{ id: 'opt_am', label: 'I am.' }, { id: 'opt_who', label: 'Who is this?' }],
  allowFreeText: true
};

describe('SocietyChat', () => {
  test('renders society and player bubbles with damage flags and timestamp jumps', () => {
    render(<SocietyChat messages={messages} question={null} busy={false} onRespond={() => {}} />);
    const first = screen.getByText('You are the author of record.');
    expect(first.className).toContain('flicker');
    expect(first.className).toContain('misaligned');
    expect(screen.getByText('I am.')).toBeTruthy();
    expect(screen.getByText('three days later')).toBeTruthy();
  });

  test('renders the pending question and sends the choice with free text', () => {
    const onRespond = vi.fn();
    render(<SocietyChat messages={[]} question={question} busy={false} onRespond={onRespond} />);
    expect(screen.getByText('Are you the author?')).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText(/a word of your own/i), { target: { value: 'Finally.' } });
    fireEvent.click(screen.getByRole('button', { name: 'I am.' }));
    expect(onRespond).toHaveBeenCalledWith({ choiceId: 'opt_am', freeText: 'Finally.' });
  });

  test('hides the free-text field on non-flagged questions and shows typing while busy', () => {
    render(
      <SocietyChat
        messages={[]}
        question={{ ...question, allowFreeText: false }}
        busy={false}
        onRespond={() => {}}
      />
    );
    expect(screen.queryByPlaceholderText(/a word of your own/i)).toBeNull();

    render(<SocietyChat messages={[]} question={null} busy={true} onRespond={() => {}} />);
    expect(screen.getByTestId('society-typing')).toBeTruthy();
  });
});
