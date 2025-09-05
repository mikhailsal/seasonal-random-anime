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