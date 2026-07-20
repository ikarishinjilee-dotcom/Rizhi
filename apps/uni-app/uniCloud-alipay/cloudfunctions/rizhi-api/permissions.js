"use strict";

const PERMISSION_KEYS = ["system_users", "default_categories", "account_types", "banks", "branding"];
const PERMISSION_VERSION = 2;

function makeRole(values) {
  return Object.fromEntries(PERMISSION_KEYS.map((key) => [key, values[key] !== false]));
}

const DEFAULT_PERMISSION_MATRIX = {
  version: PERMISSION_VERSION,
  super_admin: makeRole({}),
  admin: makeRole({}),
  user: makeRole({}),
};

DEFAULT_PERMISSION_MATRIX.user = Object.freeze(makeRole({
  system_users: false,
  default_categories: false,
  account_types: false,
  banks: false,
  branding: false,
}));
Object.freeze(DEFAULT_PERMISSION_MATRIX);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizePermissionMatrix(input) {
  const source = input && typeof input === "object" ? input : {};
  const result = {
    version: PERMISSION_VERSION,
    super_admin: makeRole(source.super_admin || {}),
    admin: makeRole(source.admin || {}),
    user: makeRole(source.user || {}),
  };
  // A super administrator is never lockable out of the management center.
  result.super_admin = makeRole({});
  return result;
}

function hasPermission(auth, matrix, permission) {
  if (!PERMISSION_KEYS.includes(permission)) return false;
  const roles = Array.isArray(auth?.role) ? auth.role : [];
  if (roles.includes("super_admin")) return true;
  if (!roles.includes("admin")) return false;
  return normalizePermissionMatrix(matrix).admin[permission] === true;
}

module.exports = {
  PERMISSION_KEYS,
  PERMISSION_VERSION,
  DEFAULT_PERMISSION_MATRIX,
  clone,
  normalizePermissionMatrix,
  hasPermission,
};
