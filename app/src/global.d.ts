// Vitest globals
declare global {
  var describe: typeof import('vitest').describe;
  var it: typeof import('vitest').it;
  var test: typeof import('vitest').it;
  var expect: typeof import('vitest').expect;
  var beforeEach: typeof import('vitest').beforeEach;
  var afterEach: typeof import('vitest').afterEach;
  var beforeAll: typeof import('vitest').beforeAll;
  var afterAll: typeof import('vitest').afterAll;
  var vi: typeof import('vitest').vi;
}

declare module 'react' {
  const React: any;
  export default React;
  export const Fragment: any;
  export const StrictMode: any;
}
declare module 'react-dom/client' {
  export function createRoot(container: Element | DocumentFragment, ...args: any[]): { render: (node: any) => void };
}
declare module 'react/jsx-runtime' {
  export function jsx(type: any, props: any, key?: string | null): any;
  export function jsxs(type: any, props: any, key?: string | null): any;
}
