import { createIntent, readIntent, validLine, changeIntent } from "./intent";
jest.mock("../supabaseClient", () => ({ supabase: {} }));
const p = { id: "product", size: "100g,200g" };
beforeEach(() => {
  sessionStorage.clear();
  Object.defineProperty(window, "crypto", {
    configurable: true,
    value: { randomUUID: () => "fixture" },
  });
});
test("a direct draft preserves a saved cart, carries no price, and is bound to the guest", () => {
  sessionStorage.setItem("guest_cart", "two tubes");
  const id = createIntent(sessionStorage, "guest", p, "100g", 1);
  expect(readIntent(sessionStorage, id, "guest")).toMatchObject({
    productId: "product",
    size: "100g",
    quantity: 1,
  });
  expect(readIntent(sessionStorage, id, "guest")).not.toHaveProperty("price");
  expect(readIntent(sessionStorage, id, "other")).toBeNull();
  expect(sessionStorage.getItem("guest_cart")).toBe("two tubes");
});
test("invalid variants and quantities fail closed", () => {
  expect(() => createIntent(sessionStorage, "guest", p, "", 1)).toThrow();
  expect(validLine(p, "200g", 0)).toBe(false);
  expect(validLine(p, "100g", 1.5)).toBe(false);
});
test("malformed and expired intents cannot start cart checkout", () => {
  expect(readIntent(sessionStorage, "bad", "guest")).toBeNull();
  const id = createIntent(sessionStorage, "guest", p, "100g", 1);
  const now = jest.spyOn(Date, "now").mockReturnValue(Date.now() + 3600000);
  expect(readIntent(sessionStorage, id, "guest")).toBeNull();
  now.mockRestore();
});

test("edits stay within the selected pack, current intent and original quantity limit", () => {
  const product = { ...p, stock: 3 };
  const id = createIntent(sessionStorage, "guest", product, "200g", 2);
  const line = { rowId: id, product, quantity: 2 };
  expect(() => changeIntent(sessionStorage, "another", line, 3)).toThrow();
  expect(() => changeIntent(sessionStorage, "guest", line, 4)).toThrow();
  changeIntent(sessionStorage, "guest", line, 3);
  expect(readIntent(sessionStorage, id, "guest")).toMatchObject({
    size: "200g",
    quantity: 3,
  });
  expect(() => changeIntent(sessionStorage, "guest", line, 1)).toThrow();
  expect(validLine({ ...p, in_stock: false }, "100g", 1)).toBe(false);
  expect(validLine(p, "100g", 101)).toBe(false);
});
