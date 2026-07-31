import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { buildRelease, writeOrCheckManifest } from "./gen-release-manifest.mjs";

test("hashes sorted runtime assets deterministically and detects drift", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "3dpa-release-"));
  await writeFile(path.join(dir, "a.js"), "alpha");
  await writeFile(path.join(dir, "b.js"), "beta");
  const first = await buildRelease(dir, ["b.js", "a.js"]);
  assert.deepEqual(first, await buildRelease(dir, ["a.js", "b.js"]));
  assert.equal(first.releaseId, first.assetFingerprint);
  assert.equal(first.appVersion, `web-${first.releaseId.slice(0, 12)}`);
  await writeOrCheckManifest(dir, ["a.js", "b.js"], false);
  assert.match(await readFile(path.join(dir, "release-manifest.js"), "utf8"), /__3DPA_RELEASE__/);
  await writeFile(path.join(dir, "b.js"), "changed");
  await assert.rejects(writeOrCheckManifest(dir, ["a.js", "b.js"], true), /release_manifest_stale/);
});

test("index loads the manifest before feedback and app scripts", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const manifest = html.indexOf('src="release-manifest.js"');
  assert.ok(manifest > 0);
  assert.ok(manifest < html.indexOf('src="feedback-form.js"'));
  assert.ok(manifest < html.indexOf('src="app.js"'));
});
