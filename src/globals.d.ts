// Side-effect CSS imports (web) — handled by Metro, typed as no-op here.
declare module '*.css';

declare module '*.png' {
  const source: number;
  export default source;
}
