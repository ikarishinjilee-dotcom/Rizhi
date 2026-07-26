"use strict";

function hasInitializedState(result) {
  return Array.isArray(result?.data) && result.data.length > 0;
}

function shouldInitializeSystemTemplates(stateResult) {
  return !hasInitializedState(stateResult);
}

function shouldCopyUserCategories(stateResult, userCategories) {
  return !hasInitializedState(stateResult) && (!Array.isArray(userCategories) || userCategories.length === 0);
}

function buildUserCategoryCopies({ systemCategories, userId, idFactory, normalize, strip, timestamp }) {
  const idMap = new Map(systemCategories.map((source) => [source.id, idFactory("cat")]));
  return systemCategories.map((source) => ({
    source,
    copy: {
      ...normalize(strip(source)),
      id: idMap.get(source.id),
      userId,
      parentId: source.parentId ? idMap.get(source.parentId) : undefined,
      sourceCategoryId: source.id,
      isSystem: false,
      enabled: source.enabled !== false,
      createdAt: timestamp(),
      updatedAt: timestamp(),
    },
  }));
}

function shouldDeleteSystemChildren(ownerId, systemUserId) {
  return ownerId === systemUserId;
}

module.exports = {
  hasInitializedState,
  shouldInitializeSystemTemplates,
  shouldCopyUserCategories,
  buildUserCategoryCopies,
  shouldDeleteSystemChildren,
};
