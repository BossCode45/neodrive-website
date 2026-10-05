/*
 * The campaign's tracks, as listed on the in-game track select (see reference/stage*.png).
 * Each one has a public Steam leaderboard named "Campaign <name>".
 * Tutorials have no leaderboards, so they aren't listed here.
 */

export const STAGES = [1, 2, 3, 4] as const;
export type Stage = (typeof STAGES)[number];

export type Track = {
  /** "1-01": stage, then position on the track select. */
  code: string;
  name: string;
  stage: Stage;
  /** Loop/lap track (circular arrow icon) rather than point-to-point. */
  loop: boolean;
  /** Name of the Steam leaderboard. */
  board: string;
  thumbnail: string;
};

const THUMBNAIL_DIR = "/images/track-thumbnails";

// [name, loop, thumbnail file when it isn't "<lowercase name>.png"]
type Row = [name: string, loop: boolean, file?: string];

const ROWS: Record<Stage, Row[]> = {
  1: [
    ["Rock Highway", false],
    ["Boulevard Tour", false],
    ["Mesa Corkscrew", false],
    ["Three Eights", true],
    ["Windmill Leap", false],
    ["Dam Approach", false],
    ["Autocross I", false, "autocross 1"],
    ["Multilap Speedway", true],
    ["Hydroplane Intro", false],
    ["First Inversion", false],
    ["Halfpipe Intro", false],
    ["Cherry Ring", true],
    ["Windmill Run", false],
    ["Lancier Skidpad", false],
    ["Inverse Camber", false, "reversecamber"],
    ["Autocross II", true, "autocross 2"],
  ],
  2: [
    ["Detour Circuit", false],
    ["Lancier 8", false],
    ["Rock Loop I", false, "rockloop"],
    ["Desert Speedway", true],
    ["Turbine Climb", false],
    ["S Bends", false],
    ["Docks Halfpipe", false],
    ["Lakeside Ring", true],
    ["Halfpipe Overpass", false],
    ["Corner Boost", false],
    ["Second Inversion", false],
    ["Lake Tangle 0", true],
    ["Rock Loop II", false],
    ["Dockside Run", false],
    ["Bridge Run I", false, "bridge run 1"],
    ["Mobius Trip", true],
  ],
  3: [
    ["Lancier Test Track", true, "lanciertesttrack"],
    ["Water Snake I", false, "water snake 1"],
    ["Cliff Dive", false],
    ["Water 8", true, "water8"],
    ["Ramp Twist", false, "ramptwist"],
    ["Night Loops", false, "nightloops"],
    ["Halfpipe Route", false, "halfpipe 1"],
    ["Canyon Bends", true],
    ["Puddlejumper", false],
    ["Hydroplane", false],
    ["Overhang", false],
    ["Water Snake II", true, "water snake 2"],
    ["Lake Tangle I", false, "lake tangle 1"],
    ["Blossom Rush", false],
    ["Third Inversion", false],
    ["Rockfall Ring", true],
  ],
  4: [
    ["Loop Transfer", false, "looptransfer"],
    ["City Descent", false],
    ["Title Track", false],
    ["Park Path", true],
    ["Alley Scramble", false],
    ["Buoy Run", false],
    ["Ledge Drop", false],
    ["Mobius Coaster", true],
    ["Arroyo Seco Parkway", false, "arroyoseco"],
    ["Bridge Run II", false, "bridge run 2"],
    ["Fourth Inversion", false],
    ["Lake Tangle II", true, "lake tangle 2"],
    ["Lake Tangle III", false, "lake tangle 3"],
    ["Racing Season", false],
    ["Double Loop", true],
    ["Monument Loop", false],
  ],
};

export const TRACKS: Track[] = STAGES.flatMap((stage) =>
  ROWS[stage].map(([name, loop, file], i) => ({
    code: `${stage}-${String(i + 1).padStart(2, "0")}`,
    name,
    stage,
    loop,
    board: `Campaign ${name}`,
    thumbnail: `${THUMBNAIL_DIR}/${file ?? name.toLowerCase()}.png`,
  })),
);

const BY_CODE = new Map(TRACKS.map((track) => [track.code, track]));

export function getTrack(code: string): Track | undefined {
  return BY_CODE.get(code);
}

export function tracksForStage(stage: Stage): Track[] {
  return TRACKS.filter((track) => track.stage === stage);
}
