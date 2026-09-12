import test from "node:test";
import assert from "node:assert/strict";
import { formatCommentDate } from "./comment-date.mjs";

test("summer submissions use Eastern daylight time", () => {
  assert.deepEqual(formatCommentDate("2026-07-15T18:30:00Z"), {
    datetime: "2026-07-15T18:30:00.000Z",
    label: "jul 15, 2026, 2:30 pm edt",
  });
});

test("winter submissions use Eastern standard time", () => {
  assert.deepEqual(formatCommentDate("2026-01-15T18:30:00Z"), {
    datetime: "2026-01-15T18:30:00.000Z",
    label: "jan 15, 2026, 1:30 pm est",
  });
});

test("UTC submissions can belong to the previous Eastern day", () => {
  assert.deepEqual(formatCommentDate("2026-09-12T02:15:00Z"), {
    datetime: "2026-09-12T02:15:00.000Z",
    label: "sep 11, 2026, 10:15 pm edt",
  });
});

test("the UTC datetime preserves the submission offset and milliseconds", () => {
  const result = formatCommentDate("2026-09-11T23:45:12.345-07:00");
  assert.deepEqual(result, {
    datetime: "2026-09-12T06:45:12.345Z",
    label: "sep 12, 2026, 2:45 am edt",
  });
  assert.equal(Date.parse(result.datetime), Date.parse("2026-09-11T23:45:12.345-07:00"));
});

test("DST transitions use the offset at the submission instant", () => {
  assert.equal(formatCommentDate("2026-03-08T06:59:00Z").label, "mar 8, 2026, 1:59 am est");
  assert.equal(formatCommentDate("2026-03-08T07:00:00Z").label, "mar 8, 2026, 3:00 am edt");
  assert.equal(formatCommentDate("2026-11-01T05:59:00Z").label, "nov 1, 2026, 1:59 am edt");
  assert.equal(formatCommentDate("2026-11-01T06:00:00Z").label, "nov 1, 2026, 1:00 am est");
});

test("missing and invalid dates return null without a date fallback", () => {
  for (const value of [undefined, null, "", "   ", "not a date", "2026-13-01T00:00:00Z", NaN, Infinity, new Date(NaN), false, true, {}, []]) {
    assert.equal(formatCommentDate(value), null);
  }
});

test("Date objects retain their original instant without mutation", () => {
  const date = new Date("2026-07-15T18:30:12.456Z");
  assert.equal(formatCommentDate(date).datetime, "2026-07-15T18:30:12.456Z");
  assert.equal(date.toISOString(), "2026-07-15T18:30:12.456Z");
});

test("a numeric epoch is a valid submission instant", () => {
  assert.deepEqual(formatCommentDate(0), {
    datetime: "1970-01-01T00:00:00.000Z",
    label: "dec 31, 1969, 7:00 pm est",
  });
});
