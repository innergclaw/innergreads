import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("./index.html", import.meta.url), "utf8");
const css = await readFile(new URL("./publishing.css", import.meta.url), "utf8");
const script = await readFile(new URL("./publishing.js", import.meta.url), "utf8");

test("publishing page contains the approved services and prices", () => {
  for (const item of [
    "Author Readiness Review",
    "$149",
    "Short Book Finish",
    "Manuscript to Print",
    "Publish-Ready Author Suite",
    "Substack to Book",
    "$350",
  ]) {
    assert.ok(html.includes(item), `missing ${item}`);
  }

  for (const price of ["750", "1,250", "2,250"]) {
    assert.match(html, new RegExp(`<span>\\$<\\/span>${price.replace(",", "\\,")}`), `missing $${price}`);
  }
});

test("publishing page has one clear inquiry flow", () => {
  assert.match(html, /id="publishing-inquiry-form"/);
  assert.match(html, /href="#inquiry"/);
  assert.match(script, /mailto:nasgfx215@gmail\.com/);
  assert.match(html, /No payment is collected on this page/);
});

test("publishing page includes mobile and reduced-motion support", () => {
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.doesNotMatch(css, /transition:\s*all/);
});
