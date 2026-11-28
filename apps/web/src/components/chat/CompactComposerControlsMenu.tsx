import type { ModelProfile, ProviderInteractionMode, RuntimeMode } from "@t3tools/contracts";
import { T, useGT } from "gt-react";
import { memo, useRef } from "react";
import { EllipsisIcon } from "lucide-react";
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
import { ComposerControl, ComposerControlIcon } from "./ComposerControl";
import { focusRequestedPermission, useComposerMenuProps } from "./composerEventScope";
import { useComposerMenuState } from "./useComposerMenuState";
import { ComposerPermissionsSection, type RuntimeModeOption } from "./ComposerFooterControls";

export const CompactComposerControlsMenu = memo(function CompactComposerControlsMenu(props: {
  runtimeMode: RuntimeMode;
  runtimeModeOptions: ReadonlyArray<RuntimeModeOption>;
  showPermissions: boolean;
  showPhase?: boolean | undefined;
  interactionMode?: ProviderInteractionMode | undefined;
  activeProfileName?: string | undefined;
  showProfile?: boolean | undefined;
  modelProfiles?: ReadonlyArray<ModelProfile> | undefined;
  activeModelProfileId?: string | undefined;
  canChangeModelProfile?: boolean | undefined;
  size?: "sm" | "xs";
  /** Close the portaled popup when its trigger hides. */
  hidden?: boolean;
  onRuntimeModeChange: (mode: RuntimeMode) => void;
  onInteractionModeChange?: ((mode: ProviderInteractionMode) => void) | undefined;
  onSelectModelProfile?: ((profileId: string) => void) | undefined;
  onManageModelProfiles?: (() => void) | undefined;
}) {
  const gt = useGT();
  const composerFloatingLayerProps = useComposerMenuProps();
  const size = props.size ?? "sm";
  const [open, setOpen] = useComposerMenuState(props.hidden);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const thinking = props.interactionMode === "plan";

  return (
    <Menu
      open={open}
      onOpenChange={setOpen}
      onOpenChangeComplete={(isOpen) => focusRequestedPermission(isOpen, triggerRef.current)}
    >
      <MenuTrigger
        render={
          <ComposerControl
            ref={triggerRef}
            size={size}
            className="shrink-0"
            aria-label={gt("More composer controls")}
            data-composer-shortcut={props.showPermissions ? "composer.mode" : undefined}
          />
        }
      >
        <ComposerControlIcon icon={EllipsisIcon} size={size} />
      </MenuTrigger>
      <MenuPopup align="start" {...composerFloatingLayerProps}>
        {props.showPhase && props.onInteractionModeChange ? (
          <>
            <MenuItem
              onClick={() => props.onInteractionModeChange?.(thinking ? "default" : "plan")}
            >
              {thinking ? <T>Think</T> : <T>Execute</T>}
              {props.activeProfileName ? (
                <span className="min-w-0 truncate text-muted-foreground">
                  {props.activeProfileName}
                </span>
              ) : null}
            </MenuItem>
            {props.showPermissions && !props.showProfile ? <MenuSeparator /> : null}
          </>
        ) : null}
        {props.showProfile && props.onSelectModelProfile ? (
          <>
            {props.showPhase ? <MenuSeparator /> : null}
            <MenuGroupLabel>
              <T>Model profiles</T>
            </MenuGroupLabel>
            <MenuRadioGroup
              value={props.activeModelProfileId ?? ""}
              onValueChange={props.onSelectModelProfile}
            >
              {(props.modelProfiles ?? []).map((profile) => (
                <MenuRadioItem
                  key={profile.id}
                  value={profile.id}
                  disabled={props.canChangeModelProfile === false}
                >
                  {profile.name}
                </MenuRadioItem>
              ))}
              <MenuRadioItem value="" disabled={props.canChangeModelProfile === false}>
                <T>Off (choose models manually)</T>
              </MenuRadioItem>
            </MenuRadioGroup>
            {props.onManageModelProfiles ? (
              <MenuItem onClick={props.onManageModelProfiles}>
                <T>Manage model profiles…</T>
              </MenuItem>
            ) : null}
            {props.showPermissions ? <MenuSeparator /> : null}
          </>
        ) : null}
        {props.showPermissions ? (
          <ComposerPermissionsSection
            runtimeMode={props.runtimeMode}
            runtimeModeOptions={props.runtimeModeOptions}
            onRuntimeModeChange={props.onRuntimeModeChange}
          />
        ) : null}
      </MenuPopup>
    </Menu>
  );
});
