import {
  DEFAULT_SERVER_SETTINGS,
  ModelProfile,
  ProviderDriverKind,
  ProviderInstanceId,
  type ServerProvider,
} from "@t3tools/contracts";
import { describe, expect, it } from "vite-plus/test";

import { resolveActiveModelProfile, resolvePhaseModelSelection } from "./modelProfiles.ts";

const now = Date.parse("2026-09-03T12:00:00.000Z");

function provider(overrides: Partial<ServerProvider>): ServerProvider {
  return {
    instanceId: ProviderInstanceId.make("codex"),
    driver: ProviderDriverKind.make("codex"),
    enabled: true,
    installed: true,
    version: null,
    status: "ready",
    auth: { status: "authenticated" },
    checkedAt: "2026-09-03T11:00:00.000Z",
    models: [],
    slashCommands: [],
    skills: [],
    ...overrides,
  };
}

const sel = (instanceId: string, model: string) => ({
  instanceId: ProviderInstanceId.make(instanceId),
  model,
});

const profile = (overrides: Partial<ModelProfile> = {}): ModelProfile =>
  ({
    id: "main",
    name: "主力",
    thinkModels: [sel("codex", "gpt-6.1-sol")],
    executeModels: [sel("claude", "claude-fable-5-1")],
    ...overrides,
  }) as ModelProfile;

describe("resolvePhaseModelSelection", () => {
  const healthyCodex = provider({});
  const healthyClaude = provider({
    instanceId: ProviderInstanceId.make("claude"),
    driver: ProviderDriverKind.make("claudeAgent"),
  });
  const exhaustedCodex = provider({
    usageLimits: {
      checkedAt: "2026-09-03T11:00:00.000Z",
      windows: [
        {
          id: "primary",
          kind: "session",
          label: "Session",
          usedPercent: 100,
          resetsAt: "2026-09-03T14:00:00.000Z",
        },
      ],
    },
  });

  it("returns the primary for the requested phase when it is usable", () => {
    const result = resolvePhaseModelSelection({
      profile: profile(),
      phase: "think",
      providers: [healthyCodex, healthyClaude],
      now,
    });
    expect(result.selection?.model).toBe("gpt-6.1-sol");
    expect(result.fellBack).toBe(false);
  });

  it("skips an exhausted primary and falls back to the next model in order", () => {
    const result = resolvePhaseModelSelection({
      profile: profile({
        thinkModels: [sel("codex", "gpt-6.1-sol"), sel("claude", "claude-fable-5-1")],
      }),
      phase: "think",
      providers: [exhaustedCodex, healthyClaude],
      now,
    });
    expect(result.selection?.instanceId).toBe(ProviderInstanceId.make("claude"));
    expect(result.fellBack).toBe(true);
    expect(result.primaryResetAt).toBe("2026-09-03T14:00:00.000Z");
  });

  it("skips disabled providers", () => {
    const disabled = provider({ instanceId: ProviderInstanceId.make("claude"), enabled: false });
    const result = resolvePhaseModelSelection({
      profile: profile({
        executeModels: [sel("claude", "claude-fable-5-1"), sel("codex", "gpt-6.1-sol")],
      }),
      phase: "execute",
      providers: [healthyCodex, disabled],
      now,
    });
    expect(result.selection?.instanceId).toBe(ProviderInstanceId.make("codex"));
    expect(result.fellBack).toBe(true);
  });

  it("avoids retrying models already tried this run", () => {
    const result = resolvePhaseModelSelection({
      profile: profile({
        thinkModels: [sel("codex", "gpt-6.1-sol"), sel("claude", "claude-fable-5-1")],
      }),
      phase: "think",
      providers: [healthyCodex, healthyClaude],
      now,
      tried: new Set([
        `${ProviderInstanceId.make("codex")}\0gpt-6.1-sol`,
        `${ProviderInstanceId.make("claude")}\0claude-fable-5-1`,
      ]),
    });
    expect(result.selection).toBeNull();
  });

  it("resolves the active profile by id", () => {
    const p = profile();
    const settings = { ...DEFAULT_SERVER_SETTINGS, modelProfiles: [p] };
    expect(resolveActiveModelProfile(settings, "main")?.id).toBe("main");
    expect(resolveActiveModelProfile(settings, "missing")).toBeUndefined();
    expect(resolveActiveModelProfile(undefined, "main")).toBeUndefined();
  });
});
