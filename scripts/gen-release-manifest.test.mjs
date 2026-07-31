import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
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

test("derives a catalog revision from the bundled data files only", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "3dpa-catalog-"));
  await mkdir(path.join(dir, "data"), { recursive: true });
  await writeFile(path.join(dir, "style.css"), "body{}");
  await writeFile(path.join(dir, "data/printers.json"), "{}");
  const assets = ["style.css", "data/printers.json"];

  const first = await buildRelease(dir, assets);
  assert.match(first.catalogRevision, /^[0-9a-f]{64}$/);
  assert.notEqual(first.catalogRevision, first.releaseId);

  // A non-catalog asset must not move the catalog revision.
  await writeFile(path.join(dir, "style.css"), "body{color:red}");
  const afterStyle = await buildRelease(dir, assets);
  assert.equal(afterStyle.catalogRevision, first.catalogRevision);
  assert.notEqual(afterStyle.releaseId, first.releaseId);

  // A catalog asset must move it.
  await writeFile(path.join(dir, "data/printers.json"), '{"x":1}');
  assert.notEqual((await buildRelease(dir, assets)).catalogRevision, first.catalogRevision);
});
