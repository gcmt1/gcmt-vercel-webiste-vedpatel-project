import { ensureOrderSession } from "./orderSession";
const session = { user: { id: "fixture-guest" } };
function authWith(current) {
  return {
    getSession: jest.fn().mockResolvedValue({ data: { session: current } }),
    signUp: jest.fn().mockResolvedValue({ data: { session } }),
    signInWithPassword: jest.fn().mockResolvedValue({ data: { session } }),
  };
}
beforeEach(() => localStorage.clear());
test("existing guest identity survives a return without another sign-in", async () => {
  const auth = authWith(session);
  expect(await ensureOrderSession(auth, localStorage)).toBe(session);
  expect(auth.signUp).not.toHaveBeenCalled();
  expect(auth.signInWithPassword).not.toHaveBeenCalled();
});
test("concurrent starts restore a legacy guest exactly once", async () => {
  localStorage.setItem("guest_user_email", "sample@example.invalid");
  localStorage.setItem("guest_user_password", "fixture-value");
  const auth = authWith(null);
  const restored = await Promise.all([
    ensureOrderSession(auth, localStorage),
    ensureOrderSession(auth, localStorage),
  ]);
  expect(restored).toEqual([session, session]);
  expect(auth.signInWithPassword).toHaveBeenCalledTimes(1);
  expect(auth.signUp).not.toHaveBeenCalled();
});
test("a failed guest restore can retry without creating a second identity", async () => {
  const auth = authWith(null);
  localStorage.setItem("guest_user_email", "sample@example.invalid");
  localStorage.setItem("guest_user_password", "fixture-value");
  auth.signInWithPassword.mockResolvedValueOnce({
    error: new Error("offline"),
  });
  await expect(ensureOrderSession(auth, localStorage)).rejects.toThrow(
    "offline",
  );
  expect(await ensureOrderSession(auth, localStorage)).toBe(session);
  expect(auth.signUp).not.toHaveBeenCalled();
});
