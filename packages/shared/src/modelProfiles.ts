import {
  type ModelSelection,
  type ModelProfile,
  type ProjectId,
  type ServerProvider,
  type ServerSettings,
  isProviderAvailable,
  resolveProjectProviderInstanceEnabled,
} from "@t3tools/contracts";

import { exhaustedUsageWindow } from "./usageLimits.ts";

export interface ResolvePhaseModelInput {
  readonly profile: ModelProfile | undefined;
  readonly phase: "think" | "execute";
  readonly providers: readonly ServerProvider[];
  readonly now: number;
  readonly settings?: ServerSettings;
  readonly projectId?: ProjectId | null;
  /** Session IDs already tried and exhausted this run; skipped to avoid loops. */
  readonly tried?: ReadonlySet<string>;
}

export interface ResolvedPhaseModel {
  readonly selection: ModelSelection | null;
  /** The primary model was skipped because it was unavailable or out of quota. */
  readonly fellBack: boolean;
  readonly primary?: ModelSelection;
  readonly primaryResetAt?: string | null;
}

const selectionKey = (selection: ModelSelection) => `${selection.instanceId}\0${selection.model}`;

/** True when a model can be used right now: provider healthy and quota left. */
function isSelectionUsable(
  selection: ModelSelection,
  providers: readonly ServerProvider[],
  now: number,
  settings: ServerSettings | undefined,
  projectId: ProjectId | null,
): { usable: boolean; resetAt?: string | null } {
  const provider = providers.find((entry) => entry.instanceId === selection.instanceId);
  if (!provider) return { usable: false };
  if (!provider.enabled || !provider.installed) return { usable: false };
  if (provider.auth.status === "unauthenticated") return { usable: false };
  if (!isProviderAvailable(provider)) return { usable: false };
  if (
    settings &&
    !resolveProjectProviderInstanceEnabled(settings, projectId, selection.instanceId)
  ) {
    return { usable: false };
  }
  const window = exhaustedUsageWindow(provider, now, selection.model);
  if (window) return { usable: false, resetAt: window.resetsAt ?? null };
  return { usable: true };
}

/**
 * Walks the ordered model list for a phase and returns the first usable model.
 * Missing profiles fall back to the primary without any availability check so
 * behavior is identical to the ordinary model picker when the feature is off.
 */
export function resolvePhaseModelSelection(input: ResolvePhaseModelInput): ResolvedPhaseModel {
  const list = input.profile
    ? input.phase === "think"
      ? input.profile.thinkModels
      : input.profile.executeModels
    : [];
  if (list.length === 0) return { selection: null, fellBack: false };
  const primary = list[0]!;
  const projectId = input.projectId ?? null;
  const tried = input.tried ?? new Set<string>();
  let primaryResetAt: string | null = null;
  for (const selection of list) {
    if (tried.has(selectionKey(selection))) continue;
    const { usable, resetAt } = isSelectionUsable(
      selection,
      input.providers,
      input.now,
      input.settings,
      projectId,
    );
    if (selectionKey(selection) === selectionKey(primary)) primaryResetAt = resetAt ?? null;
    if (usable) {
      const fellBack = selectionKey(selection) !== selectionKey(primary);
      return {
        selection,
        fellBack,
        ...(fellBack ? { primary, primaryResetAt } : {}),
      };
    }
  }
  return {
    selection: null,
    fellBack: true,
    primary,
    primaryResetAt,
  };
}

/** The active profile from settings, or undefined when unset/removed. */
export function resolveActiveModelProfile(
  settings: ServerSettings | undefined,
  profileId: string | null | undefined,
): ModelProfile | undefined {
  if (!settings || !profileId) return undefined;
  return settings.modelProfiles.find((profile) => profile.id === profileId);
}
