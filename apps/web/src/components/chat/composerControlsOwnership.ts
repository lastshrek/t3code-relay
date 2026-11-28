/**
 * Where the permissions chip shows, whether the mode and phase blocks overflow, and which control
 * answers the composer.mode shortcut. The model picker's footer always holds Permissions, so the
 * chip only shows while the mode differs from the default. The rule: composer.mode has one target.
 */
export function resolveComposerControlsOwnership(input: {
  /** Permissions hide while the mode is the default, or while the new-thread strip names it. */
  readonly matchesDefault: boolean;
  readonly collapsed: boolean;
  /** How many trailing blocks the width measurement moved into the overflow menu. */
  readonly measuredHiddenBlockCount: number;
  /** Whether the thinking/execution block is present after the permissions block. */
  readonly showPhase?: boolean;
  /** Whether the model-profile switch block is the last resting block. */
  readonly showProfile?: boolean;
}) {
  const accessDisplay = input.matchesDefault
    ? ("hidden" as const)
    : input.collapsed
      ? ("icon" as const)
      : ("label" as const);
  const showModeBlock = accessDisplay !== "hidden";
  const blockIds = [
    ...(showModeBlock ? (["mode"] as const) : []),
    ...(input.showPhase ? (["phase"] as const) : []),
    ...(input.showProfile ? (["profile"] as const) : []),
  ];
  const hiddenCount = Math.min(Math.max(0, input.measuredHiddenBlockCount), blockIds.length);
  const hiddenBlockIds: ReadonlyArray<string> = blockIds.slice(blockIds.length - hiddenCount);
  const overflowShowsPermissions = hiddenBlockIds.includes("mode");
  const overflowShowsPhase = hiddenBlockIds.includes("phase");
  const overflowShowsProfile = hiddenBlockIds.includes("profile");
  const modeHidden = showModeBlock && overflowShowsPermissions;
  return {
    accessDisplay,
    showModeBlock,
    hiddenBlockCount: hiddenCount,
    hiddenBlockIds,
    overflowShowsPermissions,
    overflowShowsPhase,
    overflowShowsProfile,
    /** Without a visible chip or an overflow menu holding it, the model picker answers composer.mode. */
    pickerOwnsModeShortcut: !overflowShowsPermissions && (accessDisplay === "hidden" || modeHidden),
  };
}
