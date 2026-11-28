import {
  DEFAULT_UNIFIED_SETTINGS,
  type ModelProfile,
  type ModelSelection,
} from "@t3tools/contracts";
import { pickModelSelection } from "@t3tools/shared/model";
import { useNavigate } from "@tanstack/react-router";
import { T, useGT } from "gt-react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { randomUUID } from "../../lib/utils";

import { ProviderModelPicker } from "../chat/ProviderModelPicker";
import { Button } from "../ui/button";
import { DraftInput } from "../ui/draft-input";
import { Switch } from "../ui/switch";
import { useEnvironmentProviders, useEnvironments } from "../../state/environments";
import { EMPTY_SERVER_PROVIDERS } from "../../state/server";
import { getCustomModelOptionsByInstance } from "../../modelSelection";
import { providerInstanceEntriesFor } from "../../providerInstances";
import { toastManager } from "../ui/toast";
import { useSearchableSetting } from "./settingsSearch";
import { useSettingsScope } from "./SettingsScopeContext";
import {
  SETTINGS_PICKER_TRIGGER_CLASSNAME,
  SettingResetButton,
  SettingsRow,
  SettingsSection,
} from "./settingsLayout";
import { useScopedModelDisabledReason } from "./useScopedModelAvailability";
import { useScopedSettings, useUpdateScopedSettings } from "./useScopedSettings";

const emptySelection = (instanceId: string, model: string): ModelSelection => ({
  instanceId: instanceId as ModelSelection["instanceId"],
  model,
});

export function ModelProfilesSettings() {
  const searchableSetting = useSearchableSetting();
  const gt = useGT();
  const navigate = useNavigate();
  const settings = useScopedSettings();
  const updateSettings = useUpdateScopedSettings();
  const { target } = useSettingsScope();
  const { environments } = useEnvironments();
  const providersByEnvironment = useEnvironmentProviders();
  const representative = target
    ? environments.find((environment) => environment.environmentId === target.environmentId)
    : undefined;
  const providers =
    (representative?.serverConfig
      ? providersByEnvironment.get(representative.environmentId)
      : undefined) ?? EMPTY_SERVER_PROVIDERS;
  const entries = providerInstanceEntriesFor(providers, settings, target?.projectId ?? null);
  const modelDisabledReason = useScopedModelDisabledReason(settings, entries);

  const profiles = settings.modelProfiles ?? [];
  const activeId = settings.activeModelProfileId ?? "";

  const write = (next: typeof profiles, nextActive = activeId) =>
    void updateSettings({ modelProfiles: next, activeModelProfileId: nextActive });

  const addProfile = () => {
    if (entries.length === 0) {
      toastManager.add({ type: "info", title: gt("Add a provider first") });
      return;
    }
    const first = entries[0]!;
    const id = `profile-${randomUUID()}`;
    write(
      [
        ...profiles,
        {
          id,
          name: gt("New profile", { $context: "model profile" }),
          thinkModels: [emptySelection(first.instanceId, first.models[0]?.slug ?? "default")],
          executeModels: [emptySelection(first.instanceId, first.models[0]?.slug ?? "default")],
        },
      ],
      activeId || id,
    );
  };

  const updateProfile = (id: string, changes: Partial<ModelProfile>) =>
    write(profiles.map((profile) => (profile.id === id ? { ...profile, ...changes } : profile)));

  const removeProfile = (id: string) => {
    const next = profiles.filter((profile) => profile.id !== id);
    write(next, activeId === id ? (next[0]?.id ?? "") : activeId);
  };

  const picker = (profile: ModelProfile, phase: "thinkModels" | "executeModels") => {
    const list = profile[phase];
    const selection = list[0];
    if (!selection) return null;
    const modelOptions = getCustomModelOptionsByInstance(
      settings,
      providers,
      selection.instanceId,
      selection.model,
    );
    return (
      <ProviderModelPicker
        environmentId={representative?.environmentId ?? null}
        activeInstanceId={selection.instanceId}
        model={selection.model}
        lockedProvider={null}
        instanceEntries={entries}
        modelOptionsByInstance={modelOptions}
        triggerClassName={SETTINGS_PICKER_TRIGGER_CLASSNAME}
        getModelDisabledReason={modelDisabledReason}
        onOpenProviderSetup={(instanceId) =>
          void navigate({
            to: "/settings/providers",
            search: { environmentId: representative!.environmentId, instanceId },
          })
        }
        onInstanceModelChange={(instanceId, model) =>
          updateProfile(profile.id, {
            [phase]: [pickModelSelection(selection, instanceId, model), ...list.slice(1)],
          })
        }
      />
    );
  };

  return (
    <SettingsSection
      id="model-profiles"
      title={gt("Model profiles")}
      headerAction={
        <Button size="sm" variant="outline" onClick={addProfile}>
          <PlusIcon className="size-3.5" />
          <T>Add profile</T>
        </Button>
      }
    >
      <SettingsRow
        serverScoped
        settingKeys={["autoFallbackOnUsageLimit"]}
        {...searchableSetting("auto-fallback-on-usage-limit")}
        title={gt("Offer a fallback model on usage limits")}
        description={gt(
          "When a model hits its quota, show a one-click action to continue with the next model in the profile.",
        )}
        resetAction={
          settings.autoFallbackOnUsageLimit !==
          DEFAULT_UNIFIED_SETTINGS.autoFallbackOnUsageLimit ? (
            <SettingResetButton
              ariaLabel={gt("Reset automatic fallback to default")}
              onClick={() =>
                void updateSettings({
                  autoFallbackOnUsageLimit: DEFAULT_UNIFIED_SETTINGS.autoFallbackOnUsageLimit,
                })
              }
            />
          ) : null
        }
        control={
          <Switch
            checked={settings.autoFallbackOnUsageLimit}
            onCheckedChange={(checked) =>
              void updateSettings({ autoFallbackOnUsageLimit: Boolean(checked) })
            }
            aria-label={gt("Offer a fallback model on usage limits")}
          />
        }
      />
      {profiles.length === 0 ? (
        <p className="px-4 py-3 text-sm text-muted-foreground">
          <T>No profiles yet. Add one to use different models for thinking and execution.</T>
        </p>
      ) : (
        profiles.map((profile) => (
          <SettingsRow
            key={profile.id}
            title={
              <DraftInput
                nativeInput
                size="sm"
                className="w-full max-w-56"
                aria-label={gt("Rename {profile}", { profile: profile.name })}
                value={profile.name}
                onCommit={(next) => {
                  const name = next.trim();
                  if (name && name !== profile.name) updateProfile(profile.id, { name });
                }}
              />
            }
            description={
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  <T>Think:</T> {picker(profile, "thinkModels")}
                </span>
                <span className="text-xs text-muted-foreground">
                  <T>Execute:</T> {picker(profile, "executeModels")}
                </span>
              </div>
            }
            resetAction={
              <Switch
                checked={activeId === profile.id}
                onCheckedChange={(checked) =>
                  void updateSettings({
                    activeModelProfileId: checked ? profile.id : "",
                  })
                }
                aria-label={gt("Activate {profile}", { profile: profile.name })}
              />
            }
            control={
              <Button
                size="icon-xs"
                variant="ghost-destructive"
                aria-label={gt("Delete profile {profile}", { profile: profile.name })}
                onClick={() => removeProfile(profile.id)}
              >
                <Trash2Icon />
              </Button>
            }
          />
        ))
      )}
    </SettingsSection>
  );
}
