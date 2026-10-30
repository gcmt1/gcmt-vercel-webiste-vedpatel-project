import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { vi, it, expect, afterEach } from "vitest";
const client = vi.hoisted(() => {
  const query = {
    select: () => query,
    limit: () => Promise.resolve({ data: [], error: null }),
    eq: () => query,
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
  };
  return {
    from: vi.fn(() => query),
    auth: {
      getSession: vi.fn(async () => ({ data: { session: null } })),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signUp: vi.fn(),
      signInAnonymously: vi.fn(),
    },
  };
});
vi.mock("./supabaseClient", () => ({
  supabase: client,
  clearGuestCredentials: vi.fn(),
}));
import App from "./App";
afterEach(() => {
  cleanup();
  window.history.replaceState({}, "", "/");
});
it("renders the storefront without creating a guest account on page load", async () => {
  window.history.replaceState({}, "", "/");
  render(<App />);
  expect(await screen.findByText("Natural Wellness,")).toBeInTheDocument();
  expect(client.auth.signUp).not.toHaveBeenCalled();
  expect(client.auth.signInAnonymously).not.toHaveBeenCalled();
});
it("redirects a signed-out admin visitor before rendering management screens", async () => {
  window.history.replaceState({}, "", "/admin-order");
  render(<App />);
  expect(await screen.findByText("Login / Sign Up")).toBeInTheDocument();
  expect(client.from.mock.calls.some(([table]) => table === "orders")).toBe(
    false,
  );
});
