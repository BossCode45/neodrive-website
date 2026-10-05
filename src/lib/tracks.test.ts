import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { boardsFixture } from "../../test/steam-fetch-mock";
import { getTrack, TRACKS, tracksForStage } from "./tracks";

describe("tracks", () => {
  it("has 16 tracks per stage, numbered in order", () => {
    for (const stage of [1, 2, 3, 4] as const) {
      const codes = tracksForStage(stage).map((t) => t.code);
      expect(codes).toEqual(Array.from({ length: 16 }, (_, i) => `${stage}-${String(i + 1).padStart(2, "0")}`));
    }
  });

  it("looks tracks up by code", () => {
    expect(getTrack("1-01")).toMatchObject({ name: "Rock Highway", stage: 1, loop: false, board: "Campaign Rock Highway" });
    expect(getTrack("4-15")).toMatchObject({ name: "Double Loop", loop: true });
    expect(getTrack("0-01")).toBeUndefined();
    expect(getTrack("1-1")).toBeUndefined();
  });

  it("matches every track to a Steam leaderboard", () => {
    const names = new Set(Array.from(boardsFixture.matchAll(/<name>([^<]+)<\/name>/g), (m) => m[1]));
    expect(TRACKS.filter((t) => !names.has(t.board)).map((t) => t.board)).toEqual([]);
  });

  it("has a thumbnail for every track", () => {
    const missing = TRACKS.filter((t) => !existsSync(new URL(`../../public${t.thumbnail}`, import.meta.url)));
    expect(missing.map((t) => t.thumbnail)).toEqual([]);
  });
});
