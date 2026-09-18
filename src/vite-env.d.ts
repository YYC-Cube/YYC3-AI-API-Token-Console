/// <reference types="vite/client" />
/// <reference types="@testing-library/jest-dom/vitest" />

/**
 * vite-env.d.ts
 * ==============
 * TypeScript ambient declarations for the project.
 *
 * - vite/client: provides import.meta.env types and asset import types
 * - @testing-library/jest-dom/vitest: augments vitest's Assertion interface
 *   with jest-dom matchers (toBeInTheDocument, toHaveTextContent, etc.)
 *
 * NOTE: This file must be included in tsconfig.json's "include" array
 * (or live under a path already included, such as "src/").
 */
