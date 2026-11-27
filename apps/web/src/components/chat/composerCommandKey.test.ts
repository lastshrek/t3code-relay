import { describe, expect, it, vi } from "vite-plus/test";

import { composerCommandKeyHandler } from "./composerCommandKey";

type HandlerInput = Parameters<typeof composerCommandKeyHandler>[0];

const tabEvent = (overrides: Partial<KeyboardEvent> = {}): KeyboardEvent =>
  ({
    key: "Tab",
    shiftKey: false,
    altKey: false,
    metaKey: false,
    ctrlKey: false,
    isComposing: false,
    keyCode: 0,
    ...overrides,
  }) as KeyboardEvent;

function setup(overrides: Partial<HandlerInput> = {}) {
  const prompt = "";
  const editor = {
    isCaretOnVisualEdge: () => false,
    readSelectionRange: () => ({ start: 0, end: 0 }),
  };
  const snapshot = { value: prompt };
  const promptRef = { current: prompt };
  const onTogglePhase = vi.fn();
  const applyPromptReplacement = vi.fn(() => true);
  const onSelectComposerItem = vi.fn();
  const input = {
    keybindings: [],
    getShortcutContext: () => ({}),
    sendShortcut: "enter",
    routeKind: "server",
    phase: "idle",
    canSteer: false,
    followUpBehavior: "foreground",
    isSoftwareKeyboardOpen: false,
    isLiteralPendingAnswer: false,
    pendingUserInputs: [],
    promptHistoryEntries: [],
    promptHistoryPositionRef: { current: null },
    composerDraftTarget: "thread-1",
    promptRef,
    composerImagesRef: { current: [] },
    composerFilesRef: { current: [] },
    composerTerminalContextsRef: { current: [] },
    composerPreviewAnnotations: [],
    composerReviewComments: [],
    composerEditorRef: { current: editor },
    composerMenuItemsRef: { current: [] },
    activeComposerMenuItemRef: { current: null },
    setComposerDraftPrompt: vi.fn(),
    setComposerDraftThreadContexts: vi.fn(),
    setComposerDraftEnvironmentContexts: vi.fn(),
    setComposerCursor: vi.fn(),
    setComposerTrigger: vi.fn(),
    setComposerHighlightedItemId: vi.fn(),
    dismissComposerTrigger: vi.fn(),
    nudgeComposerMenuHighlight: vi.fn(),
    onSelectComposerItem,
    resolveActiveComposerTrigger: () => ({ trigger: null }),
    readComposerSnapshot: () => snapshot,
    applyPromptReplacement,
    submitComposer: vi.fn(),
    promptSuggestion: null,
    dismissPromptSuggestion: vi.fn(),
    onTogglePhase,
    ...overrides,
  } as unknown as HandlerInput;
  return {
    input,
    promptRef,
    snapshot,
    onTogglePhase,
    applyPromptReplacement,
    onSelectComposerItem,
    handler: composerCommandKeyHandler(input),
  };
}

describe("composer phase toggle on plain Tab", () => {
  it("toggles the phase on plain Tab and consumes the key", () => {
    const { handler, onTogglePhase } = setup();
    expect(handler("Tab", tabEvent())).toBe(true);
    expect(onTogglePhase).toHaveBeenCalledTimes(1);
  });

  it("does not take over Tab when no model profile is active", () => {
    const { handler, onTogglePhase } = setup({ onTogglePhase: undefined });
    expect(handler("Tab", tabEvent())).toBe(false);
    expect(onTogglePhase).not.toHaveBeenCalled();
  });

  it("leaves Shift+Tab and modified Tab to their existing behavior", () => {
    const { handler, onTogglePhase } = setup();
    expect(handler("Tab", tabEvent({ shiftKey: true }))).toBe(false);
    expect(handler("Tab", tabEvent({ metaKey: true }))).toBe(false);
    expect(handler("Tab", tabEvent({ ctrlKey: true }))).toBe(false);
    expect(handler("Tab", tabEvent({ altKey: true }))).toBe(false);
    expect(onTogglePhase).not.toHaveBeenCalled();
  });

  it("ignores IME composition", () => {
    const { handler, onTogglePhase } = setup();
    expect(handler("Tab", tabEvent({ isComposing: true }))).toBe(false);
    expect(handler("Tab", tabEvent({ keyCode: 229 }))).toBe(false);
    expect(onTogglePhase).not.toHaveBeenCalled();
  });

  it("prioritizes the completion menu over the phase toggle", () => {
    const item = { id: "slash-command", label: "Command" } as never;
    const { handler, onTogglePhase, onSelectComposerItem } = setup({
      composerMenuItemsRef: { current: [item] },
      activeComposerMenuItemRef: { current: item },
      resolveActiveComposerTrigger: () => ({ trigger: { kind: "command" } as never }),
    });
    expect(handler("Tab", tabEvent())).toBe(true);
    expect(onSelectComposerItem).toHaveBeenCalledWith(item);
    expect(onTogglePhase).not.toHaveBeenCalled();
  });

  it("prioritizes accepting a predicted prompt over the phase toggle", () => {
    const { handler, onTogglePhase, applyPromptReplacement } = setup({
      promptSuggestion: "next prompt",
    });
    expect(handler("Tab", tabEvent())).toBe(true);
    expect(applyPromptReplacement).toHaveBeenCalledWith(0, 0, "next prompt");
    expect(onTogglePhase).not.toHaveBeenCalled();
  });

  it("prioritizes list indentation over the phase toggle", () => {
    const { handler, onTogglePhase, applyPromptReplacement, promptRef, snapshot } = setup();
    promptRef.current = "- item";
    snapshot.value = "- item";
    expect(handler("Tab", tabEvent())).toBe(true);
    expect(applyPromptReplacement).toHaveBeenCalled();
    expect(onTogglePhase).not.toHaveBeenCalled();
  });

  it("does not toggle while answering a literal pending question", () => {
    const { handler, onTogglePhase } = setup({ isLiteralPendingAnswer: true });
    expect(handler("Tab", tabEvent())).toBe(false);
    expect(onTogglePhase).not.toHaveBeenCalled();
  });
});
