// src/lib/sound-credit.ts
// Where the sound effects come from (sound-files brief, 5): every effect is a recording from Mixkit, imported by
// `npm run sfx:import`. Mixkit's licence asks for no attribution; they are credited anyway, as good practice.
export const SOUND_CREDIT = {
  source: 'Mixkit',
  url: 'https://mixkit.co',
  /** Said beside the name. */
  note: 'sound effects, free to use, no attribution required',
} as const;
