import { describe, expect, it } from "vitest";

import { isMenuItemActive } from "@/components/layouts/app-sidebar";

describe("isMenuItemActive", () => {
  it("keeps the orders list active for order detail routes", () => {
    expect(isMenuItemActive("/orders", "/orders")).toBe(true);
    expect(isMenuItemActive("/orders/ORD-001", "/orders")).toBe(true);
  });

  it("does not mark the orders list active on the new order route", () => {
    expect(isMenuItemActive("/orders/new", "/orders")).toBe(false);
    expect(isMenuItemActive("/orders/new", "/orders/new")).toBe(true);
  });

  it("keeps root and other routes isolated", () => {
    expect(isMenuItemActive("/", "/")).toBe(true);
    expect(isMenuItemActive("/orders", "/")).toBe(false);
    expect(isMenuItemActive("/pdf-preview", "/orders")).toBe(false);
  });
});
