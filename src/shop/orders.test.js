import { payment, orderItems, amount, guestUser } from "./orders";
test("collected cash stays COD, unknown labels stay visible", () => {
  expect(payment({ payment_id: "COD-123", payment_status: "success" })).toEqual(
    { method: "Cash on delivery", status: "Collected" },
  );
  expect(payment({ payment_status: "review" }).status).toBe("REVIEW");
});
test("old serialized lines and missing amounts", () => {
  expect(orderItems({ product_list: '[{"quantity":2}]' })).toEqual([
    { quantity: 2 },
  ]);
  expect(orderItems({ product_list: "?" })).toEqual([]);
  expect(amount(null)).toBe("Amount unavailable");
  expect(amount(0)).toBe("₹0");
});
test("new and historical guest formats", () => {
  expect(guestUser({ email: "abc@guest.local" })).toBe(true);
  expect(guestUser({ email: "guest_abc@example.com" })).toBe(true);
  expect(guestUser({ email: "guesthouse@example.org" })).toBe(false);
});
