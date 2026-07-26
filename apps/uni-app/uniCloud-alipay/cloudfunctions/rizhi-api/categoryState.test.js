"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  buildUserCategoryCopies,
  shouldCopyUserCategories,
  shouldInitializeSystemTemplates,
} = require("./categoryState");

test("system template initialization is one-time", () => {
  assert.equal(shouldInitializeSystemTemplates({ data: [] }), true);
  assert.equal(shouldInitializeSystemTemplates({ data: [{ key: "initialized" }] }), false);
});

test("user categories are copied once with independent ids and parent links", () => {
  const sources = [
    { id: "parent", name: "Parent", sort: 10, enabled: true },
    { id: "child", parentId: "parent", name: "Child", sort: 11, enabled: true },
  ];
  let sequence = 0;
  const copies = buildUserCategoryCopies({
    systemCategories: sources,
    userId: "user-1",
    idFactory: () => `copy-${++sequence}`,
    normalize: (value) => value,
    strip: (value) => ({ ...value }),
    timestamp: () => "2026-07-22T00:00:00.000Z",
  });

  assert.equal(shouldCopyUserCategories({ data: [] }, []), true);
  assert.equal(shouldCopyUserCategories({ data: [{ key: "initialized" }] }, []), false);
  assert.deepEqual(copies.map(({ copy }) => copy.id), ["copy-1", "copy-2"]);
  assert.equal(copies[1].copy.parentId, "copy-1");
  assert.equal(copies[0].copy.sourceCategoryId, "parent");
  assert.equal(copies[0].copy.userId, "user-1");
});

test("an initialized system state does not restore deleted templates", () => {
  const initializedState = { data: [{ key: "initialized" }] };
  assert.equal(shouldInitializeSystemTemplates(initializedState), false);
  assert.equal(shouldCopyUserCategories(initializedState, []), false);
});
