import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const page = await readFile(new URL("./pay-as-you-wish/index.html", import.meta.url), "utf8");

test("the explanation keeps reading free and support optional", () => {
  assert.match(page, /the writing stays free\./);
  assert.match(page, /there is no locked ending and no pressure to pay\./);
  assert.match(page, /support is optional, one time and connected to the article u just finished\./);
});

test("the personal note explains the transition and the value of reader support", () => {
  assert.match(page, /i’m in a transitional stage/);
  assert.match(page, /this support helps me protect the time to write\./);
  assert.match(page, /when somebody gives even \$1/);
  assert.match(page, /i feel that support\./);
});

test("the example slider matches the live one-to-five-dollar offer", () => {
  assert.match(page, /id="slider-example" type="range" min="1" max="5" step="1" value="3" disabled/);
  assert.match(page, /href="\.\.\/">choose a read/);
});
