import { describe, expect, it } from "vitest";
import { normalizePermissionMatrix, permissionDefaults } from "@/services/permissionService";

describe("permission matrix", () => {
  it("fills missing roles and keys from safe defaults", () => {
    const matrix = normalizePermissionMatrix({ admin: { banks: false } });
    expect(matrix.admin.banks).toBe(false);
    expect(matrix.admin.branding).toBe(true);
    expect(matrix.user.system_users).toBe(false);
    expect(matrix.super_admin).toEqual(permissionDefaults.super_admin);
  });

  it("does not allow a client to disable super administrator permissions", () => {
    const matrix = normalizePermissionMatrix({ super_admin: { system_users: false } });
    expect(matrix.super_admin.system_users).toBe(true);
    expect(matrix.super_admin.branding).toBe(true);
  });
});
