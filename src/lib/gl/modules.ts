/**
 * Lazily loaded 3D modules (they pull in three.js). Loaded once by the
 * loading manager and shared with the components that render them.
 */
function once<T>(factory: () => Promise<T>) {
  let p: Promise<T> | null = null;
  return () => {
    p ??= factory().catch((err) => {
      p = null; // allow retry after a failed chunk download
      throw err;
    });
    return p;
  };
}

export const loadCubeWorld = once(() => import("@/animations/gl/CubeWorld"));
export const loadDecreeRoll = once(() => import("@/animations/gl/DecreeRoll"));
