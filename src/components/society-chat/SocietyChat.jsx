import React, { Fragment, useState } from 'react';
import './SocietyChat.css';

function bubbleClassName(entry) {
  const classes = ['societyChatBubble', entry.role === 'player' ? 'societyChatFromPlayer' : 'societyChatFromSociety'];
  const flags = entry.flags || {};
  if (flags.flicker) classes.push('societyChatFlicker');
  if (flags.stutter) classes.push('societyChatStutter');
  if (flags.misaligned) classes.push('societyChatMisaligned');
  return classes.join(' ');
}

function entryText(entry) {
  if (entry.role === 'player') {
    return entry.freeText ? `${entry.choiceLabel} — ${entry.freeText}` : entry.choiceLabel;
  }
  return entry.text;
}

export default function SocietyChat({ messages, question, busy, onRespond }) {
  const [freeText, setFreeText] = useState('');

  const send = (choiceId) => {
    onRespond({ choiceId, freeText: freeText.trim() });
    setFreeText('');
  };

  return (
    <div className="societyChat" data-testid="society-chat">
      <header className="societyChatHeader">
        <span className="societyChatSender">The Esteemed Storyteller&rsquo;s Society</span>
        <span className="societyChatSignal">signal: intermittent</span>
      </header>

      <div className="societyChatThread">
        {messages.map((entry, index) => (
          <Fragment key={`${entry.beatId}-${entry.role}-${index}`}>
            {entry.timestampJump && (
              <div className="societyChatTimeJump">{entry.timestampJump}</div>
            )}
            <p
              className={bubbleClassName(entry)}
              style={{ '--stagger': entry.arrivesEarly ? 0 : index % 5 }}
            >
              {entryText(entry)}
            </p>
          </Fragment>
        ))}
        {busy && (
          <div className="societyChatTyping" data-testid="society-typing">
            <span /><span /><span />
          </div>
        )}
      </div>

      {question && !busy && (
        <div className="societyChatQuestion" data-testid={`question-${question.beatId}`}>
          <p className="societyChatQuestionText">{question.text}</p>
          {question.allowFreeText && (
            <input
              className="societyChatFreeText"
              value={freeText}
              onChange={(event) => setFreeText(event.target.value)}
              placeholder="add a word of your own, if you must"
              maxLength={200}
            />
          )}
          <div className="societyChatOptions">
            {question.options.map((option) => (
              <button
                key={option.id}
                type="button"
                className="societyChatOption"
                onClick={() => send(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
