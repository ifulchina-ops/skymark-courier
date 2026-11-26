// Skymark Courier — configuration.
// A dawn canyon courier run: fly the bush plane through the glowing rings,
// mind the ridges, keep the fuel up. All units are game units unless noted.
export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;
export const HORIZON_Y = 300;
export const STEP = 1 / 60;

// Flight envelope.
export const SPEED_MIN = 55; // knots at idle-ish throttle
export const SPEED_MAX = 185; // knots flat out
export const SPEED_START = 95;
export const ALT_MIN = 0;
export const ALT_MAX = 420;
export const ALT_START = 150;
export const CLIMB_RATE = 95; // altitude units per second at full climb
export const TURN_RATE = 1.9; // lateral units per second at full stick
export const LATERAL_LIMIT = 150; // how far off the valley centre the plane may stray
export const FUEL_MAX = 100;
export const FUEL_DRAIN = 1.15; // per second at cruise
export const FUEL_PER_RING = 14;
export const LIVES = 3;
export const RING_SCORE = 100;
export const RING_FIRST_Z = 420; // distance ahead of the first ring
export const RING_GAP_START = 520;
export const RING_GAP_MIN = 300;
export const RING_RADIUS = 46;
export const VIEW_DEPTH = 2600; // how far ahead the renderer draws
export const BEST_KEY = 'skymark-courier-best';
export const PLANE_NAME = 'Skymark Courier';
export const CALLSIGN = 'SKY-7';
