/**
 * Increments the patch component of the desktop release version across the
 * workspace before a build. Run by the dist:* scripts so every package a build
 * stamps (server, desktop, web, contracts) reports the same version.
 */
import * as FileSystem from "effect/FileSystem";
import * as NodeServices from "@effect/platform-node/NodeServices";
import * as NodeRuntime from "@effect/platform-node/NodeRuntime";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Path from "effect/Path";
import { Command, Flag } from "effect/cli";

import { releasePackageFiles } from "./lib/tagged-source-version.ts";
import { updateReleasePackageVersions } from "./update-release-package-versions.ts";

const SEMVER_PATTERN = /^(\d+)\.(\d+)\.(\d+)$/;

function bumpPatch(version: string): string {
  const match = SEMVER_PATTERN.exec(version);
  if (match === null) {
    throw new Error(`Cannot bump non-stable version "${version}"; expected MAJOR.MINOR.PATCH.`);
  }
  const [, major, minor, patch] = match;
  return `${major}.${minor}.${Number(patch) + 1}`;
}

export const bumpDesktopVersion = Effect.fn("bumpDesktopVersion")(function* (rootDir?: string) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const root = path.resolve(rootDir ?? process.cwd());
  const desktopManifest = path.join(root, releasePackageFiles[1]);
  const text = yield* fs.readFileString(desktopManifest);
  const parsed = JSON.parse(text) as { readonly version?: unknown };
  if (typeof parsed.version !== "string") {
    return yield* Effect.fail(new Error(`No version field in ${desktopManifest}`));
  }
  const next = bumpPatch(parsed.version);
  const result = yield* updateReleasePackageVersions(next, { rootDir: root });
  yield* Effect.log(`Bumped desktop version ${parsed.version} -> ${next}`);
  return result;
});

const command = Command.make(
  "bump-desktop-version",
  {
    root: Flag.String("root").pipe(
      Flag.withDescription("Workspace root used to resolve the release package manifests."),
      Flag.optional,
    ),
  },
  ({ root }) => bumpDesktopVersion(Option.getOrUndefined(root)).pipe(Effect.asVoid),
).pipe(Command.withDescription("Increment the patch version of all release packages."));

if (import.meta.main) {
  Command.run(command, {}).pipe(Effect.provide(NodeServices.layer), NodeRuntime.runMain);
}
