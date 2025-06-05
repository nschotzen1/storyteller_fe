import { useEffect } from 'react';

// Note: typingActionTypes and ghostwriterActionTypes are passed as arguments to the hook.

const useActionSequenceProcessor = (
  // Typing state and dispatch
  typingState, // Contains actionSequence, currentActionIndex, currentGhostText, isProcessingSequence, fadeState
  dispatchTyping,
  
  // Ghostwriter dispatch
  dispatchGhostwriter, // For SET_LAST_GENERATED_LENGTH, SET_RESPONSE_QUEUED
  
  // Page state and setters
  pages, // For getting current page text
  currentPage,
  setPages, // For committing text at the end of a sequence
  
  // Constants
  MAX_LINES,
  typingActionTypes, // Passed as argument
  ghostwriterActionTypes // Passed as argument
) => {
  useEffect(() => {
    let timeoutId;

    if (typingState.isProcessingSequence && typingState.currentActionIndex < typingState.actionSequence.length) {
      const currentAction = typingState.actionSequence[typingState.currentActionIndex];

      // Refined Fade Deactivation Logic: Part 1
      // If fade was active and current action is not a fade, deactivate fade first.
      if (typingState.fadeState.isActive && currentAction.action !== 'fade') {
        dispatchTyping({ type: typingActionTypes.SET_FADE_STATE, payload: { isActive: false, to_text: '', phase: 0 } });
      }

      switch (currentAction.action) {
        case 'type':
          const newGhostTextType = typingState.currentGhostText + currentAction.text;
          dispatchTyping({ type: typingActionTypes.UPDATE_GHOST_TEXT, payload: newGhostTextType });
          timeoutId = setTimeout(() => {
            dispatchTyping({ type: typingActionTypes.PROCESS_NEXT_ACTION });
          }, currentAction.delay);
          break;
        case 'pause':
          timeoutId = setTimeout(() => {
            dispatchTyping({ type: typingActionTypes.PROCESS_NEXT_ACTION });
          }, currentAction.delay);
          break;
        case 'delete':
          const newGhostTextDelete = typingState.currentGhostText.slice(0, -currentAction.count);
          dispatchTyping({ type: typingActionTypes.UPDATE_GHOST_TEXT, payload: newGhostTextDelete });
          timeoutId = setTimeout(() => {
            dispatchTyping({ type: typingActionTypes.PROCESS_NEXT_ACTION });
          }, currentAction.delay);
          break;
        case 'fade':
          dispatchTyping({
            type: typingActionTypes.SET_FADE_STATE,
            payload: { isActive: true, to_text: currentAction.to_text, phase: currentAction.phase }
          });
          timeoutId = setTimeout(() => {
            dispatchTyping({ type: typingActionTypes.PROCESS_NEXT_ACTION });
          }, currentAction.delay);
          break;
        case 'retype':
          // Revised retype logic: directly append text to currentGhostText
          if (typeof currentAction.text === 'string') {
            const newGhostTextRetype = typingState.currentGhostText + currentAction.text;
            dispatchTyping({ type: typingActionTypes.UPDATE_GHOST_TEXT, payload: newGhostTextRetype });
            timeoutId = setTimeout(() => {
              dispatchTyping({ type: typingActionTypes.PROCESS_NEXT_ACTION });
            }, currentAction.delay);
          } else {
            console.error("Malformed 'retype' action in sequence (missing text):", currentAction);
            // Proceed to next action without delay if text is missing
            dispatchTyping({ type: typingActionTypes.PROCESS_NEXT_ACTION });
          }
          break;
        default:
          // Unknown action, proceed to next
          console.warn("Unknown action in sequence:", currentAction);
          timeoutId = setTimeout(() => {
            dispatchTyping({ type: typingActionTypes.PROCESS_NEXT_ACTION });
          }, 0);
          break;
      }
    } else if (typingState.isProcessingSequence && typingState.currentActionIndex >= typingState.actionSequence.length) {
      // All actions processed, sequence is naturally completing.
      const finalGhostTextOfSequence = typingState.currentGhostText;
      const currentPageObject = pages[currentPage];
      const currentPageText = currentPageObject?.text || '';
      
      if (finalGhostTextOfSequence) {
        const textToCommit = currentPageText + finalGhostTextOfSequence;
        const textToCommitLines = textToCommit.split('\n').length;
        const newTextForPage =
          textToCommitLines > MAX_LINES
            ? textToCommit.split('\n').slice(0, MAX_LINES).join('\n')
            : textToCommit;

        setPages(prev => {
          const updatedPages = [...prev];
          // Ensure current page object exists, or initialize if somehow it doesn't
          // This case should ideally not happen if pages array is managed correctly
          if (!updatedPages[currentPage]) {
            updatedPages[currentPage] = { text: '', filmBgUrl: '' }; // Or some default filmBgUrl
          }
          updatedPages[currentPage] = { 
            ...updatedPages[currentPage], 
            text: newTextForPage 
          };
          return updatedPages;
        });
        dispatchGhostwriter({ type: ghostwriterActionTypes.SET_LAST_GENERATED_LENGTH, payload: newTextForPage.length });
      } else {
        // If there was no ghost text generated in the sequence, update based on existing page text
        dispatchGhostwriter({ type: ghostwriterActionTypes.SET_LAST_GENERATED_LENGTH, payload: currentPageText.length });
      }
      
      dispatchTyping({ type: typingActionTypes.SEQUENCE_COMPLETE }); 
      if (typingState.fadeState.isActive) {
        dispatchTyping({ type: typingActionTypes.SET_FADE_STATE, payload: { isActive: false, to_text: '', phase: 0 } });
      }
      dispatchGhostwriter({ type: ghostwriterActionTypes.SET_RESPONSE_QUEUED, payload: false });
    }

    return () => {
      clearTimeout(timeoutId);
    };
  }, [
    typingState.isProcessingSequence, 
    typingState.actionSequence, 
    typingState.currentActionIndex, 
    typingState.currentGhostText, // Added back as it's used in 'type', 'delete', 'retype' and completion logic
    typingState.fadeState.isActive, 
    dispatchTyping, 
    dispatchGhostwriter, 
    pages, 
    currentPage, 
    setPages,
    MAX_LINES,
    typingActionTypes, // Added to dependency array
    ghostwriterActionTypes // Added to dependency array
  ]); 
};

export default useActionSequenceProcessor;