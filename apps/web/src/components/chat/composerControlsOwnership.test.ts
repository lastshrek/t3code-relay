import { describe, expect, it } from "vite-plus/test";

import { resolveComposerControlsOwnership } from "./composerControlsOwnership";

const base = {
  matchesDefault: true,
  collapsed: false,
  measuredHiddenBlockCount: 0,
};

describe("resolveComposerControlsOwnership", () => {
  it("hides the chip at the default and lets the model picker answer composer.mode", () => {
    const result = resolveComposerControlsOwnership(base);
    expect(result).toMatchObject({
      accessDisplay: "hidden",
      showModeBlock: false,
      hiddenBlockIds: [],
      pickerOwnsModeShortcut: true,
    });
  });

  it("shows a labelled chip that owns composer.mode when the mode differs", () => {
    const result = resolveComposerControlsOwnership({ ...base, matchesDefault: false });
    expect(result).toMatchObject({
      accessDisplay: "label",
      showModeBlock: true,
      pickerOwnsModeShortcut: false,
    });
  });

  it("gives an overflowed chip's Permissions to the overflow menu", () => {
    const result = resolveComposerControlsOwnership({
      ...base,
      matchesDefault: false,
      measuredHiddenBlockCount: 1,
    });
    expect(result.hiddenBlockIds).toEqual(["mode"]);
    expect(result.overflowShowsPermissions).toBe(true);
    expect(result.pickerOwnsModeShortcut).toBe(false);
  });

  it("shows the non-default chip as an icon in the compacted row", () => {
    const result = resolveComposerControlsOwnership({
      ...base,
      matchesDefault: false,
      collapsed: true,
    });
    expect(result.accessDisplay).toBe("icon");
  });

  it("gives an overflowed phase block to the overflow menu", () => {
    const result = resolveComposerControlsOwnership({
      ...base,
      showPhase: true,
      measuredHiddenBlockCount: 1,
    });
    expect(result.hiddenBlockIds).toEqual(["phase"]);
    expect(result.overflowShowsPhase).toBe(true);
    expect(result.overflowShowsPermissions).toBe(false);
  });

  it("overflows the phase before the permissions block", () => {
    const result = resolveComposerControlsOwnership({
      ...base,
      matchesDefault: false,
      showPhase: true,
      measuredHiddenBlockCount: 1,
    });
    expect(result.hiddenBlockIds).toEqual(["phase"]);
    expect(result.hiddenBlockCount).toBe(1);
  });

  it("puts both blocks in the overflow menu when neither fits", () => {
    const result = resolveComposerControlsOwnership({
      ...base,
      matchesDefault: false,
      showPhase: true,
      measuredHiddenBlockCount: 2,
    });
    expect(result.hiddenBlockIds).toEqual(["mode", "phase"]);
    expect(result.overflowShowsPermissions).toBe(true);
    expect(result.overflowShowsPhase).toBe(true);
  });
});
