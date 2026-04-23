// Vitest setup for DOM-capable test files. Pulls in jest-dom's custom
// matchers (`toBeDisabled`, `toHaveTextContent`, `toHaveAttribute`, …)
// and registers jest-dom against vitest's `expect`.
import '@testing-library/jest-dom/vitest';
