// src/setupTests.js
import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Create a global 'jest' object that aliases 'vi'
// This allows tests written with Jest syntax (e.g., jest.fn()) to run with vitest
global.jest = vi;
