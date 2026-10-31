// Motion values from the design system's Motion table. Durations in ms.
export const motion = {
  /** Button press down: the slab drops onto its under-edge. */
  pressIn: { duration: 80 },
  /** Button release: springs back up. */
  pressOut: { damping: 15, stiffness: 400 },
  /** Success pop: scale 1 -> 1.12 -> 1. */
  pop: { damping: 12, stiffness: 180, overshoot: 1.12 },
  /** Fuel ring fill and the number counting up alongside it. */
  fill: { duration: 900 },
  /** Streak flame, lesson-node halo: one shared 2s heartbeat. */
  heartbeat: { duration: 1000, scale: 1.06 },
  /** The mascot's idle bob. One slow rise and fall, forever. */
  bob: { duration: 2600, offset: 6 },
  /** The mascot's entrance: fades up as it springs to full size. */
  enter: { duration: 220, from: 0.86 },
  /** The mascot's celebration wiggle, either side of upright. */
  wiggle: { duration: 110, degrees: 5 },
  /** Validation error. */
  shake: { duration: 300, offset: 8, cycles: 3 },
} as const;

/** The solid under-edge beneath a pressable slab, in px. */
export const EDGE_HEIGHT = 4;
