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
  /**
   * The mascot's jump, in the order the frames happen: crouch, launch, hang,
   * land. Squash and stretch is what makes a jump read as weight rather than
   * as a sprite being moved up the screen -- the character compresses before
   * it leaves the ground and stretches on the way up.
   */
  jump: {
    crouch: { duration: 130, scaleY: 0.86, scaleX: 1.12, drop: 8 },
    launch: { duration: 220, scaleY: 1.12, scaleX: 0.92, rise: -46 },
    land: { damping: 9, stiffness: 220 },
  },
  /** The attention hop: a jump, then a long wait, forever. */
  nudge: { every: 4200 },
  /** A burst of 8 marks thrown outward on a celebration. */
  sparkle: { count: 8, duration: 620, distance: 74 },
  /** Mascot wobble when something is refused. */
  wobble: { duration: 70, degrees: 7, cycles: 4 },
  /** Validation error. */
  shake: { duration: 300, offset: 8, cycles: 3 },
} as const;

/** The solid under-edge beneath a pressable slab, in px. */
export const EDGE_HEIGHT = 4;
