import { pricePaise, packs, money } from "./catalog";
jest.mock("../supabaseClient", () => ({ supabase: {} }));
test("current pack and catalog pricing", () => {
  expect(money(pricePaise({ product_price: "150.00" }))).toBe("₹150");
  expect(packs({ size: "100g, 200g,100g" })).toEqual(["100g", "200g"]);
});
test("discounts, invalid and missing prices", () => {
  expect(pricePaise({ product_price: 150, product_discount: 10 })).toBe(13500);
  expect(pricePaise({ product_price: null })).toBeNull();
  expect(pricePaise({ product_price: 1, product_discount: 101 })).toBeNull();
});
