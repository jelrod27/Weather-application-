/** Runtime environment helpers shared by isomorphic modules. */

export function isServerRuntime(): boolean {
  return typeof window === 'undefined';
}
