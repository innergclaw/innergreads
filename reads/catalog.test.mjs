import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { defaultRead, findRead, reads } from "./catalog.mjs";

test("the newest dated read is the default", () => {
  assert.equal(defaultRead.slug, "philly-money-moving");
  assert.equal(defaultRead.number, "003");
  assert.equal(defaultRead.date, "2026-09-12");
  assert.equal(defaultRead.title, "is philly actually making money ~ or does it just look like money is moving?");
  assert.deepEqual(reads.map(read => read.number), ["003", "002", "001"]);
});

test("known read slugs resolve and unknown slugs do not open an article", () => {
  assert.equal(findRead("art-era").number, "001");
  assert.equal(findRead("pull-the-plug-on-intelligence").number, "002");
  assert.equal(findRead("philly-money-moving").number, "003");
  assert.equal(findRead("not-a-read"), undefined);
});

test("article 003 has a publishable body with the supplied opening and close", async () => {
  const source = JSON.parse(await readFile(new URL("../content/reads/2026-09-12-philly-money-moving.json", import.meta.url)));
  assert.equal(source.slug, defaultRead.slug);
  assert.equal(source.title, defaultRead.title);
  assert.equal(source.published, true);
  assert.equal(source.body.length, 51);
  assert.equal(source.body[0].text, "i’ve been thinking about something lately that i don’t hear enough people in philly talk about.");
  assert.equal(source.body.at(-1).text, "my innerg frequency on the philadelphia economy.");
  assert(source.body.every(block => block.type === "paragraph" && block.text.trim()));
});

test("article 002 has a publishable body with the supplied opening and close", async () => {
  const source = JSON.parse(await readFile(new URL("../content/reads/2026-09-12-pull-the-plug-on-intelligence.json", import.meta.url)));
  assert.equal(source.slug, findRead("pull-the-plug-on-intelligence").slug);
  assert.equal(source.title, findRead("pull-the-plug-on-intelligence").title);
  assert.equal(source.published, true);
  assert.equal(source.body.length, 37);
  assert.equal(source.body[0].text, "people really talk about “pulling the plug” on ai like we can simply erase this entire direction of technology + go back to before it existed.");
  assert.equal(source.body.at(-1).text, "it makes good human leadership even more important.");
  assert(source.body.every(block => block.type === "paragraph" && block.text.trim()));
});
