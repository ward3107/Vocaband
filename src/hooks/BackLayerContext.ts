import { createContext } from 'react';

// A fixed child can use a lower z-index within its parent's stacking
// context and still appear above that parent. Carry that relationship
// through React (including portals) instead of comparing raw z-indices.
export const BackLayerContext = createContext(0);
