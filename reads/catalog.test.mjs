import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { defaultRead, findRead, reads } from "./catalog.mjs";

test("the newest dated read is the default", () => {
  assert.equal(defaultRead.slug, "both-sides-have-to-show-up");
  assert.equal(defaultRead.number, "007");
  assert.equal(defaultRead.date, "2026-10-07");
  assert.equal(defaultRead.title, "both sides have to show up.");
  assert.deepEqual(reads.map(read => read.number), ["007", "006", "005", "004", "003", "002", "001"]);
});

test("known read slugs resolve and unknown slugs do not open an article", () => {
  assert.equal(findRead("art-era").number, "001");
  assert.equal(findRead("pull-the-plug-on-intelligence").number, "002");
  assert.equal(findRead("philly-money-moving").number, "003");
  assert.equal(findRead("black-men-step-up").number, "004");
  assert.equal(findRead("ya-hochu-zhenu").number, "005");
  assert.equal(findRead("clarity-is-the-standard").number, "006");
  assert.equal(findRead("both-sides-have-to-show-up").number, "007");
  assert.equal(findRead("not-a-read"), undefined);
});

test("article 006 develops the supplied journal pages into a publishable personal read", async () => {
  const source = JSON.parse(await readFile(new URL("../content/reads/2026-09-20-clarity-is-the-standard.json", import.meta.url)));
  assert.equal(source.slug, "clarity-is-the-standard");
  assert.equal(source.title, "clarity is the standard now.");
  assert.equal(source.published, true);
  assert.equal(source.body.length, 44);
  assert.equal(source.body[0].text, "on january 1, 2026, i opened my notebook and wrote one sentence at the top of the page.");
  assert.deepEqual(source.body.filter(block => block.type === "emphasis").map(block => block.text), [
    "discomfort doesn’t mean i was wrong. sometimes it means i was honest.",
    "alignment should feel natural, not negotiated.",
    "clarity is the standard now.",
  ]);
  assert.equal(source.body.at(-1).text, "clarity is the standard now.");
  assert(source.body.every(block => ["paragraph", "emphasis"].includes(block.type) && block.text.trim()));
});

test("article 005 has a publishable body with the supplied opening and close", async () => {
  const source = JSON.parse(await readFile(new URL("../content/reads/2026-09-19-ya-hochu-zhenu.json", import.meta.url)));
  assert.equal(source.slug, findRead("ya-hochu-zhenu").slug);
  assert.equal(source.title, findRead("ya-hochu-zhenu").title);
  assert.equal(source.published, true);
  assert.equal(source.body.length, 21);
  assert.equal(source.body[0].text, "i be trying to flirt, be intentional + really show up as a man.");
  assert.equal(source.body.at(-2).text, "я хочу жену.");
  assert.equal(source.body.at(-1).text, "i want a wife.");
  assert(source.body.every(block => block.type === "paragraph" && block.text.trim()));
});

test("article 004 has a publishable body with the supplied opening, emphasis, and close", async () => {
  const source = JSON.parse(await readFile(new URL("../content/reads/2026-09-14-black-men-step-up.json", import.meta.url)));
  assert.equal(source.slug, findRead("black-men-step-up").slug);
  assert.equal(source.title, findRead("black-men-step-up").title);
  assert.equal(source.published, true);
  assert.equal(source.body.length, 56);
  assert.equal(source.body[0].text, "black men .. we gotta step up.");
  assert.deepEqual(source.body.filter(block => block.type === "emphasis").map(block => block.text), [
    "what are these conversations actually doing for the black men who are still alive?",
    "think before u throw your future away.",
  ]);
  assert.equal(source.body.at(-1).text, "and keep reminding the brothers around u that purpose still matters.");
  assert(source.body.every(block => ["paragraph", "emphasis"].includes(block.type) && block.text.trim()));
});

test("article 003 has a publishable body with the supplied opening and close", async () => {
  const source = JSON.parse(await readFile(new URL("../content/reads/2026-09-12-philly-money-moving.json", import.meta.url)));
  assert.equal(source.slug, findRead("philly-money-moving").slug);
  assert.equal(source.title, findRead("philly-money-moving").title);
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
