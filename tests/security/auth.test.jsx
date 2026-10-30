import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AuthPage from "../../src/pages/AuthPage";
const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  merge: vi.fn(),
  toast: vi.fn(),
}));
vi.mock("../../src/AppContext", () => ({
  useAppContext: () => ({
    session: { user: { id: "guest", is_anonymous: true } },
  }),
}));
vi.mock("../../src/components/ToastContext", () => ({
  useToast: () => ({ showToast: mocks.toast }),
}));
vi.mock("../../src/supabaseClient", () => ({
  supabase: {
    auth: { signInWithPassword: mocks.login },
    from: (table) => ({
      select: () => ({
        eq: () =>
          table === "cart_items"
            ? Promise.resolve({
                data: [{ product_id: "product", quantity: 2 }],
              })
            : { maybeSingle: async () => ({ data: { role: "user" } }) },
      }),
    }),
  },
}));
vi.mock("../../src/utils/cart", async (original) => ({
  ...(await original()),
  mergeGuestCart: mocks.merge,
}));
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.clearAllMocks();
});
function openLogin() {
  localStorage.setItem(
    "guest_cart",
    JSON.stringify([{ productId: "product", quantity: 1 }]),
  );
  render(
    <MemoryRouter>
      <AuthPage />
    </MemoryRouter>,
  );
  fireEvent.change(screen.getByPlaceholderText("Email"), {
    target: { value: "customer@example.test" },
  });
  fireEvent.change(screen.getByPlaceholderText("Password"), {
    target: { value: "test-password" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Log In" }));
}
it("does not duplicate the anonymous cart when sign-in fails", async () => {
  mocks.login.mockResolvedValue({
    data: {},
    error: new Error("Invalid login"),
  });
  openLogin();
  await waitFor(() =>
    expect(mocks.toast).toHaveBeenCalledWith(expect.any(String), "error"),
  );
  expect(JSON.parse(localStorage.getItem("guest_cart"))).toEqual([
    { productId: "product", quantity: 1 },
  ]);
  expect(mocks.merge).not.toHaveBeenCalled();
});
it("preserves anonymous product quantities after a successful identity change", async () => {
  mocks.login.mockResolvedValue({
    data: { user: { id: "customer" } },
    error: null,
  });
  mocks.merge.mockImplementation(async () => {
    expect(JSON.parse(localStorage.getItem("guest_cart"))).toEqual([
      { productId: "product", quantity: 3 },
    ]);
  });
  openLogin();
  await waitFor(() =>
    expect(mocks.toast).toHaveBeenCalledWith(
      "Signed in successfully.",
      "success",
    ),
  );
  expect(mocks.merge).toHaveBeenCalledWith("customer", expect.any(Object));
});
