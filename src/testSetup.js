import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Minimal Jest compatibility for legacy tests while migrating to Vitest APIs.
globalThis.jest = vi;

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn();
}

if (typeof HTMLMediaElement !== 'undefined') {
  HTMLMediaElement.prototype.play = vi.fn();
}
