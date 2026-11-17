// A one-time pass from the gate to the area's route. The home gear is the gate (hold + year); after it, the route opens
// the area at once. The pass lives in memory only and the route takes it on mount, so Back, Forward or a reload to the
// route finds no pass and shows the gate again (rule: no way past the gate by history).
let passed = false

/** the gate opened: the next mount of the area's route opens the area without asking again */
export function passGate() { passed = true }

/** whether a pass waits (read on mount; takeGatePass() spends it) */
export const hasGatePass = () => passed

/** spend the pass (in an effect, so React's double mount in development still sees it) */
export function takeGatePass() { passed = false }
