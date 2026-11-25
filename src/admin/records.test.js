import { updateStatus } from "./records";
jest.mock("../supabaseClient", () => ({ supabase: {} }));
test("online order cannot use COD controls", async () => {
  await expect(
    updateStatus({ payment_id: "online" }, "payment_status", "SUCCESS"),
  ).rejects.toThrow("Unsupported");
});
test("undeployed tracking writes rejected", async () => {
  await expect(
    updateStatus({ id: "A" }, "tracking_number", "T"),
  ).rejects.toThrow("Unsupported");
});
