import type { ChatComposerProps } from "./ChatComposer";
import type { PromptUltrathink } from "./TraitsPicker";
import type { ProviderInstanceEntry } from "../../providerInstances";
import { type AppModelOption } from "../../modelSelection";
import { T, useGT, useMessages } from "gt-react";
import { ChevronDownIcon, CircleAlertIcon, LayersIcon } from "lucide-react";
import { CompactComposerControlsMenu } from "./CompactComposerControlsMenu";
import { ComposerControl } from "./ComposerControl";
import {
  ComposerFooterModeControls,
  ComposerModelPicker,
  type RuntimeModeOption,
} from "./ComposerFooterControls";
import {
  type EnvironmentId,
  type ModelProfile,
  type ModelSelection,
  type ProviderDriverKind,
  type ProviderInstanceId,
  type ProviderInteractionMode,
  type RuntimeMode,
  type ServerProvider,
} from "@t3tools/contracts";
import type { EffortDisplay } from "@t3tools/contracts/settings";
import { cn } from "~/lib/utils";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import {
  Menu,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTrigger,
} from "../ui/menu";
import { useComposerMenuProps } from "./composerEventScope";
import { resolveModelPickerSelectedModel } from "./ModelPickerContent";
import { resolveComposerTraitsInput } from "./composerProviderState";
import { useApplyThreadModelPick } from "./useApplyThreadModelPick";
import { useStableCallback } from "../../hooks/useStableCallback";
import {
  ComposerEffortColumn,
  ComposerPickerFooter,
  describeComposerEffort,
} from "./ComposerModelEffort";
import type { useComposerProviderModel } from "./useComposerProviderModel";
import { resolveComposerControlsOwnership } from "./composerControlsOwnership";

/**
 * The composer footer controls: the model picker (which also holds effort, speed and
 * permissions), mode controls and the overflow menu for blocks that do not fit. Rendered in the
 * expanded footer or the resting controls host.
 */
// Model and effort share one trigger; it stays filled while its popup is open.
const MODEL_TRIGGER_STATES = "data-popup-open:bg-accent data-popup-open:text-foreground";

function ComposerPhaseControl({
  mode,
  profileName,
  onChange,
}: {
  readonly mode: ProviderInteractionMode;
  readonly profileName: string | undefined;
  readonly onChange: (mode: ProviderInteractionMode) => void;
}) {
  const gt = useGT();
  const thinking = mode === "plan";
  const phaseLabel = thinking
    ? gt("Thinking phase, switch to execution")
    : gt("Execution phase, switch to thinking");
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={phaseLabel}
            onClick={() => onChange(thinking ? "default" : "plan")}
            className={cn(
              "flex h-6 shrink-0 items-center gap-1 rounded-md px-2 text-xs font-medium outline-none",
              "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
              thinking
                ? "bg-accent text-foreground"
                : "border border-border/60 text-muted-foreground hover:text-foreground",
            )}
          />
        }
      >
        {thinking ? <T>Think</T> : <T>Execute</T>}
        {profileName ? <span className="max-w-12 truncate opacity-60">{profileName}</span> : null}
      </TooltipTrigger>
      <TooltipPopup side="top">{gt("{phase} (Tab)", { phase: phaseLabel })}</TooltipPopup>
    </Tooltip>
  );
}

function ComposerModelProfileControl({
  profiles,
  activeProfileId,
  canChange,
  modelOptionsByInstance,
  providerInstanceEntries,
  onSelect,
  onManage,
}: {
  readonly profiles: ReadonlyArray<ModelProfile>;
  readonly activeProfileId: string;
  readonly canChange: boolean;
  readonly modelOptionsByInstance: ReadonlyMap<ProviderInstanceId, ReadonlyArray<AppModelOption>>;
  readonly providerInstanceEntries: ReadonlyArray<ProviderInstanceEntry>;
  readonly onSelect: (profileId: string) => void;
  readonly onManage?: (() => void) | undefined;
}) {
  const gt = useGT();
  const composerFloatingLayerProps = useComposerMenuProps();
  const active = profiles.find((profile) => profile.id === activeProfileId);
  const modelLabel = (selection: ModelSelection | undefined) => {
    if (!selection) return gt("None");
    const driverKind = providerInstanceEntries.find(
      (entry) => entry.instanceId === selection.instanceId,
    )?.driverKind;
    const option = resolveModelPickerSelectedModel({
      driverKind,
      model: selection.model,
      options: modelOptionsByInstance.get(selection.instanceId) ?? [],
    });
    return option?.name ?? option?.shortName ?? selection.model;
  };
  return (
    <Menu>
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex" />}>
          <MenuTrigger
            render={
              <button
                type="button"
                aria-label={gt("Switch model profile")}
                className={cn(
                  "flex h-6 shrink-0 items-center gap-1 rounded-md border border-border/60 px-2 text-xs font-medium text-muted-foreground outline-none hover:text-foreground",
                  "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                )}
              />
            }
          >
            <LayersIcon className="size-3.5" />
            {active ? <span className="max-w-16 truncate opacity-70">{active.name}</span> : null}
            <ChevronDownIcon className="size-3 opacity-60" />
          </MenuTrigger>
        </TooltipTrigger>
        <TooltipPopup side="top">{gt("Switch model profile")}</TooltipPopup>
      </Tooltip>
      <MenuPopup side="top" align="end" {...composerFloatingLayerProps}>
        <MenuGroupLabel>
          <T>Model profiles</T>
        </MenuGroupLabel>
        <MenuRadioGroup value={activeProfileId} onValueChange={onSelect}>
          {profiles.map((profile) => (
            <MenuRadioItem key={profile.id} value={profile.id} disabled={!canChange}>
              <span className="flex min-w-0 flex-col">
                <span className="truncate">{profile.name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {gt("Think: {think} · Execute: {execute}", {
                    think: modelLabel(profile.thinkModels[0]),
                    execute: modelLabel(profile.executeModels[0]),
                  })}
                </span>
              </span>
            </MenuRadioItem>
          ))}
          <MenuSeparator />
          <MenuRadioItem value="" disabled={!canChange}>
            <T>Off (choose models manually)</T>
          </MenuRadioItem>
        </MenuRadioGroup>
        {onManage ? (
          <>
            <MenuSeparator />
            <MenuItem onClick={onManage}>
              <T>Manage model profiles…</T>
            </MenuItem>
          </>
        ) : null}
      </MenuPopup>
    </Menu>
  );
}

export function ComposerControlsBar(props: {
  environmentId: EnvironmentId;
  workspaceCwd: string | null;
  routeKind: ChatComposerProps["routeKind"];
  routeThreadRef: ChatComposerProps["routeThreadRef"];
  draftId: ChatComposerProps["draftId"];
  selectedProvider: ProviderDriverKind;
  selectedInstanceId: ProviderInstanceId;
  selectedModel: string;
  selectedProviderModels: ServerProvider["models"];
  composerModelOptions: ReturnType<typeof useComposerProviderModel>["composerModelOptions"];
  reportedModelSelection: ChatComposerProps["reportedModelSelection"];
  promptUltrathink: PromptUltrathink;
  onPromptEdit: (edit: (prompt: string) => string) => void;
  effortDisplay: EffortDisplay;
  /** The strip under a new thread names the permissions, so the row does not repeat them. */
  permissionsShownInStrip: boolean;
  compatibleRuntimeMode: RuntimeMode;
  defaultRuntimeMode: RuntimeMode | undefined;
  compatibleRuntimeModeOptions: ReadonlyArray<RuntimeModeOption>;
  handleRuntimeModeChange: (mode: RuntimeMode) => void;
  composerControlsCollapsed: boolean;
  composerControlsHidden: boolean;
  restingHiddenBlockCount: number;
  iconOnlyBlockCount: number;
  showProviderUnavailable: boolean;
  providerSetupInstanceId: ProviderInstanceId | undefined;
  onOpenProviderSetup: ChatComposerProps["onOpenProviderSetup"];
  providerCatalogPending: boolean;
  isSendBusy: boolean;
  multipleModelsEnabled: boolean;
  multipleModelSelections: ChatComposerProps["multipleModelSelections"];
  onMultipleModelSelectionsChange: ChatComposerProps["onMultipleModelSelectionsChange"];
  selectedModelSelection: ModelSelection;
  onProviderModelSelect: ChatComposerProps["onProviderModelSelect"];
  activeThreadModelSelection: ChatComposerProps["activeThreadModelSelection"];
  selectedModelForPickerWithCustomFallback: string;
  lockedProvider: ChatComposerProps["lockedProvider"];
  lockedContinuationGroupKey: string | null;
  providerInstanceEntries: ReadonlyArray<ProviderInstanceEntry>;
  keybindings: ChatComposerProps["keybindings"];
  modelOptionsByInstance: ReadonlyMap<ProviderInstanceId, ReadonlyArray<AppModelOption>>;
  terminalOpen: boolean;
  modelPickerOpen: boolean;
  onModelPickerOpenChange: (open: boolean) => void;
  modelPickerIconClassName: string | undefined;
  getModelDisabledReason: ChatComposerProps["getModelDisabledReason"];
  /** Thinking/execution phase. Present when at least one model profile is configured. */
  interactionMode?: ProviderInteractionMode;
  onInteractionModeChange?: (mode: ProviderInteractionMode) => void;
  activeProfileName?: string;
  modelProfiles?: ReadonlyArray<ModelProfile> | undefined;
  activeModelProfileId?: string | undefined;
  canChangeModelProfile?: boolean | undefined;
  onSelectModelProfile?: ((profileId: string) => void) | undefined;
  onManageModelProfiles?: (() => void) | undefined;
}) {
  const {
    environmentId,
    routeKind,
    routeThreadRef,
    draftId,
    selectedProvider,
    selectedInstanceId,
    selectedModel,
    selectedProviderModels,
    composerModelOptions,
    reportedModelSelection,
    promptUltrathink,
    onPromptEdit,
    compatibleRuntimeMode,
    defaultRuntimeMode,
    compatibleRuntimeModeOptions,
    handleRuntimeModeChange,
    composerControlsCollapsed,
    composerControlsHidden,
    restingHiddenBlockCount: measuredHiddenBlockCount,
    iconOnlyBlockCount,
    showProviderUnavailable,
    providerSetupInstanceId,
    onOpenProviderSetup,
    providerCatalogPending,
    isSendBusy,
    multipleModelsEnabled,
    multipleModelSelections,
    onMultipleModelSelectionsChange,
    selectedModelSelection,
    onProviderModelSelect,
    activeThreadModelSelection,
    selectedModelForPickerWithCustomFallback,
    lockedProvider,
    lockedContinuationGroupKey,
    providerInstanceEntries,
    keybindings,
    modelOptionsByInstance,
    terminalOpen,
    modelPickerOpen,
    onModelPickerOpenChange,
    modelPickerIconClassName,
    getModelDisabledReason,
  } = props;
  const accessMatchesDefault = compatibleRuntimeMode === defaultRuntimeMode;
  const showPhase = Boolean(props.interactionMode && props.onInteractionModeChange);
  const showProfile = Boolean(
    props.modelProfiles && props.modelProfiles.length > 0 && props.onSelectModelProfile,
  );
  const {
    accessDisplay,
    showModeBlock,
    hiddenBlockCount: restingHiddenBlockCount,
    hiddenBlockIds: hiddenRestingBlockIds,
    overflowShowsPermissions,
    overflowShowsPhase,
    overflowShowsProfile,
    pickerOwnsModeShortcut,
  } = resolveComposerControlsOwnership({
    matchesDefault: accessMatchesDefault || props.permissionsShownInStrip,
    collapsed: composerControlsCollapsed,
    measuredHiddenBlockCount,
    showPhase,
    showProfile,
  });
  const controlSize = composerControlsCollapsed ? "xs" : "sm";
  const gt = useGT();
  const m = useMessages();
  const applyThreadModelPick = useApplyThreadModelPick();
  const applyRouteThreadModelPick = useStableCallback(() => applyThreadModelPick(routeThreadRef));
  const traitsInput = resolveComposerTraitsInput({
    provider: selectedProvider,
    instanceId: selectedInstanceId,
    ...(routeKind === "server"
      ? { threadRef: routeThreadRef, onDraftModelOptionsChange: applyRouteThreadModelPick }
      : {}),
    ...(routeKind === "draft" && draftId ? { draftId } : {}),
    model: selectedModel,
    models: selectedProviderModels,
    modelOptions: composerModelOptions?.[selectedInstanceId],
    reportedModelSelection,
    promptUltrathink,
    onPromptEdit,
  });
  const effort = describeComposerEffort(traitsInput, props.effortDisplay, controlSize, m);
  const restingBlockDefs = [
    ...(showModeBlock
      ? [
          {
            id: "mode",
            content: (
              <ComposerFooterModeControls
                runtimeMode={compatibleRuntimeMode}
                runtimeModeOptions={compatibleRuntimeModeOptions}
                size={controlSize}
                hidden={composerControlsHidden || restingHiddenBlockCount > 0}
                accessDisplay={accessDisplay}
                emphasized={!accessMatchesDefault}
                onRuntimeModeChange={handleRuntimeModeChange}
              />
            ),
          },
        ]
      : []),
    ...(props.interactionMode && props.onInteractionModeChange
      ? [
          {
            id: "phase",
            content: (
              <ComposerPhaseControl
                mode={props.interactionMode}
                profileName={props.activeProfileName}
                onChange={props.onInteractionModeChange}
              />
            ),
          },
        ]
      : []),
    ...(showProfile && props.onSelectModelProfile
      ? [
          {
            id: "profile",
            content: (
              <ComposerModelProfileControl
                profiles={props.modelProfiles ?? []}
                activeProfileId={props.activeModelProfileId ?? ""}
                canChange={props.canChangeModelProfile ?? false}
                modelOptionsByInstance={modelOptionsByInstance}
                providerInstanceEntries={providerInstanceEntries}
                onSelect={props.onSelectModelProfile}
                onManage={props.onManageModelProfiles}
              />
            ),
          },
        ]
      : []),
  ];
  // Its own element, so typing (which rebuilds the controls around it) leaves it cached.
  const composerModelPicker = (
    <ComposerModelPicker
      environmentId={environmentId}
      workspaceCwd={props.workspaceCwd}
      compact={false}
      isComposerOwned
      // The trigger grows away from this edge when its model or effort label changes.
      popupAlign={composerControlsCollapsed ? "start" : "end"}
      disabled={providerCatalogPending || isSendBusy}
      multipleModelsEnabled={multipleModelsEnabled}
      multipleModelSelections={multipleModelSelections}
      onMultipleModelSelectionsChange={onMultipleModelSelectionsChange}
      selectedModelSelection={selectedModelSelection}
      onProviderModelSelect={onProviderModelSelect}
      activeInstanceId={
        providerCatalogPending
          ? (activeThreadModelSelection?.instanceId ?? selectedInstanceId)
          : selectedInstanceId
      }
      model={
        providerCatalogPending
          ? (activeThreadModelSelection?.model ?? selectedModelForPickerWithCustomFallback)
          : selectedModelForPickerWithCustomFallback
      }
      lockedProvider={lockedProvider}
      lockedContinuationGroupKey={lockedContinuationGroupKey}
      instanceEntries={providerInstanceEntries}
      keybindings={keybindings}
      modelOptionsByInstance={modelOptionsByInstance}
      size={controlSize}
      triggerClassName={cn(
        "group/model-trigger",
        MODEL_TRIGGER_STATES,
        composerControlsCollapsed ? "min-w-13 shrink text-xs!" : "min-w-13",
      )}
      triggerSuffix={effort.suffix}
      triggerDetail={effort.detail}
      triggerShortcuts={
        pickerOwnsModeShortcut ? "composer.effort composer.mode" : "composer.effort"
      }
      effortColumn={<ComposerEffortColumn traits={traitsInput} />}
      footer={
        <ComposerPickerFooter
          traits={traitsInput}
          runtimeMode={compatibleRuntimeMode}
          runtimeModeOptions={compatibleRuntimeModeOptions}
          onRuntimeModeChange={handleRuntimeModeChange}
        />
      }
      terminalOpen={terminalOpen}
      open={modelPickerOpen}
      instanceIndicatorBackground={
        composerControlsCollapsed
          ? "color-mix(in srgb, var(--chat-composer-glass-surface) var(--glass-opacity), transparent)"
          : "var(--contrast-input)"
      }
      {...(modelPickerIconClassName
        ? { activeProviderIconClassName: modelPickerIconClassName }
        : {})}
      onOpenChange={onModelPickerOpenChange}
      getModelDisabledReason={getModelDisabledReason}
      onOpenProviderSetup={onOpenProviderSetup}
    />
  );
  return showProviderUnavailable ? (
    <ComposerControl
      type="button"
      disabled={!providerSetupInstanceId}
      onClick={() => {
        if (providerSetupInstanceId) {
          onOpenProviderSetup(providerSetupInstanceId);
        }
      }}
      data-chat-provider-unavailable="true"
      className="shrink-0"
    >
      <CircleAlertIcon className="size-4" />
      {providerSetupInstanceId ? gt("Open provider settings") : gt("No provider available")}
    </ComposerControl>
  ) : (
    <>
      {composerModelPicker}

      <>
        {restingBlockDefs.map((def, index) => {
          const hidden = index >= restingBlockDefs.length - restingHiddenBlockCount;
          return (
            <div
              key={def.id}
              data-resting-block={def.id}
              data-composer-block-icon-only={
                index >= restingBlockDefs.length - iconOnlyBlockCount ? "true" : "false"
              }
              aria-hidden={hidden || undefined}
              inert={hidden || undefined}
              className={cn(
                "flex w-max min-w-max shrink-0 items-center gap-1",
                hidden && "pointer-events-none invisible absolute",
                index >= restingBlockDefs.length - iconOnlyBlockCount &&
                  "[&_[data-composer-control-label]]:pointer-events-none [&_[data-composer-control-label]]:invisible [&_[data-composer-control-label]]:absolute [&_[data-composer-control-label]]:w-max [&_[data-composer-control-label]]:max-w-none [&_[data-composer-control-compact-icon]]:[visibility:inherit] [&_[data-composer-control-compact-icon]]:relative",
              )}
            >
              {def.content}
            </div>
          );
        })}
        <div
          data-resting-controls-overflow
          aria-hidden={hiddenRestingBlockIds.length === 0 || undefined}
          inert={hiddenRestingBlockIds.length === 0 || undefined}
          className={cn(
            "min-w-0 shrink-0",
            hiddenRestingBlockIds.length === 0 && "pointer-events-none invisible absolute",
          )}
        >
          <CompactComposerControlsMenu
            runtimeMode={compatibleRuntimeMode}
            runtimeModeOptions={compatibleRuntimeModeOptions}
            size={controlSize}
            hidden={composerControlsHidden || hiddenRestingBlockIds.length === 0}
            // Permissions join the overflow only when their normal home is in it.
            showPermissions={overflowShowsPermissions}
            showPhase={overflowShowsPhase}
            interactionMode={props.interactionMode}
            activeProfileName={props.activeProfileName}
            showProfile={overflowShowsProfile}
            modelProfiles={props.modelProfiles}
            activeModelProfileId={props.activeModelProfileId}
            canChangeModelProfile={props.canChangeModelProfile}
            onRuntimeModeChange={handleRuntimeModeChange}
            onInteractionModeChange={props.onInteractionModeChange}
            onSelectModelProfile={props.onSelectModelProfile}
            onManageModelProfiles={props.onManageModelProfiles}
          />
        </div>
      </>
    </>
  );
}
