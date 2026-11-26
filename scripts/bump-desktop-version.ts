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
import * as Schema from "effect/Schema";
import { Command, Flag } from "effect/cli";
import { fromJsonStringPretty } from "@t3tools/shared/schemaJson";

import { releasePackageFiles } from "./lib/tagged-source-version.ts";
import { updateReleasePackageVersions } from "./update-release-package-versions.ts";

const SEMVER_PATTERN = /^(\d+)\.(\d+)\.(\d+)$/;

class BumpVersionError extends Schema.TaggedError<BumpVersionError>()("BumpVersionError", {
  detail: Schema.String,
}) {}

const PackageJsonSchema = Schema.Record(Schema.String, Schema.Unknown);
const decodePackageJson = Schema.decodeUnknownEffect(fromJsonStringPretty(PackageJsonSchema));

function bumpPatch(version: string): string | null {
  const match = SEMVER_PATTERN.exec(version);
  if (match === null) return null;
  const [, major, minor, patch] = match;
  return `${major}.${minor}.${Number(patch) + 1}`;
}

export const bumpDesktopVersion = Effect.fn("bumpDesktopVersion")(function* (rootDir?: string) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const root = path.resolve(rootDir ?? process.cwd());
  const desktopManifest = path.join(root, releasePackageFiles[1]);
  const text = yield* fs
    .readFileString(desktopManifest)
    .pipe(
      Effect.mapError(
        (cause) =>
          new BumpVersionError({ detail: `Could not read ${desktopManifest}: ${String(cause)}` }),
      ),
    );
  const parsed = yield* decodePackageJson(text).pipe(
    Effect.mapError(() => new BumpVersionError({ detail: `Could not decode ${desktopManifest}` })),
  );
  const version = parsed.version;
  if (typeof version !== "string") {
    return yield* new BumpVersionError({ detail: `No version field in ${desktopManifest}` });
  }
  const next = bumpPatch(version);
  if (next === null) {
    return yield* new BumpVersionError({ detail: `Cannot bump non-stable version "${version}"` });
  }
  const result = yield* updateReleasePackageVersions(next, { rootDir: root });
  yield* Effect.log(`Bumped desktop version ${version} -> ${next}`);
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
  Command.run(command, { version: "0.0.0" }).pipe(
    Effect.provide(NodeServices.layer),
    NodeRuntime.runMain,
  );
}
