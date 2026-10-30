import React from "react";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  cleanup,
} from "@testing-library/react";
import { vi, describe, it, expect, afterEach } from "vitest";
import {
  escapeHtml,
  csvContent,
  safeReturnPath,
} from "../../src/utils/security";
import { readGuestCart, writeGuestCart } from "../../src/utils/cart";
import { generateInvoicePDF } from "../../src/components/InvoiceGenerator";
const canvasMock = vi.hoisted(() => vi.fn());
vi.mock("html2canvas", () => ({ default: canvasMock }));
const save = vi.hoisted(() => vi.fn());
vi.mock("jspdf", () => ({
  default: class {
    internal = { pageSize: { getWidth: () => 210, getHeight: () => 297 } };
    addImage() {}
    save = save;
  },
}));
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.clearAllMocks();
});
describe("untrusted text and export boundaries", () => {
  it("treats customer and product text as text inside the invoice DOM", async () => {
    canvasMock.mockImplementation(async (element) => {
      expect(element.querySelector("script")).toBeNull();
      expect(element.querySelector("[onerror]")).toBeNull();
      expect(element.textContent).toContain(
        '<img src=x onerror="window.__audit=true">',
      );
      return {
        toDataURL: () => "data:image/png;base64,AA",
        height: 100,
        width: 100,
      };
    });
    await generateInvoicePDF({
      id: "order1",
      user_name: '<img src=x onerror="window.__audit=true">',
      user_email: "<script>test</script>",
      address_line: "A & B",
      city: "City",
      state: "State",
      postal_code: "123456",
      created_at: "2026-01-01",
      payment_status: "PENDING",
      order_status: "PENDING",
      payment_id: "ref",
      product_list: [
        {
          name: "<b>Product</b>",
          quantity: 1,
          unit_price: 100,
          total_price: 100,
        },
      ],
    });
    expect(save).toHaveBeenCalled();
    expect(document.querySelector("[onerror]")).toBeNull();
  });
  it("escapes quotes/separators and neutralizes spreadsheet formulas inside quoted CSV cells", () => {
    const value = csvContent([
      ["Name", "Message"],
      ['A "quoted", name', "=1+1"],
      ["B", "  @SUM(1,2)"],
      ["C", "＋1"],
    ]);
    expect(value).toContain('"A ""quoted"", name","\t=1+1"');
    expect(value).toContain('"\t  @SUM(1,2)"');
    expect(value).toContain('"\t＋1"');
    expect(value.split("\r\n")).toHaveLength(4);
  });
  it("rejects external return destinations and corrupt guest storage", () => {
    for (const path of [
      "//evil.test",
      "/\\evil.test",
      "https://evil.test",
      "/\n/evil.test",
    ])
      expect(safeReturnPath(path)).toBe("/");
    expect(safeReturnPath("/checkout?step=1")).toBe("/checkout?step=1");
    localStorage.setItem("guest_cart", "{bad");
    expect(readGuestCart()).toEqual([]);
    writeGuestCart([
      { productId: "p1", quantity: -1 },
      { productId: "p2", quantity: 2 },
      { productId: { id: "x" }, quantity: 1 },
    ]);
    expect(readGuestCart()).toEqual([{ productId: "p2", quantity: 2 }]);
  });
});
