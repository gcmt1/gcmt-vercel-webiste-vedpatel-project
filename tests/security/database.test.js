// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
const alice = "11111111-1111-4111-8111-111111111111";
const bob = "22222222-2222-4222-8222-222222222222";
const admin = "33333333-3333-4333-8333-333333333333";
const payment = "44444444-4444-4444-8444-444444444444";
let db;
const fixture = readFileSync("tests/fixtures/schema.sql", "utf8");
async function asRole(role, user, sql, params = []) {
  await db.exec(
    `SET ROLE ${role}; SELECT set_config('request.jwt.claim.sub','${user || ""}',false);`,
  );
  try {
    return await db.query(sql, params);
  } finally {
    await db.exec("RESET ROLE");
  }
}
beforeAll(async () => {
  db = new PGlite();
  await db.waitReady;
  await db.exec(fixture);
  // Historic column grants survive a table-level REVOKE and must be cleared too.
  await db.exec(
    "GRANT UPDATE (payment_status,total_amount) ON public.orders TO authenticated",
  );
  const migration = readdirSync("supabase/migrations").find((p) =>
    p.endsWith("_production_security.sql"),
  );
  await db.exec(readFileSync("supabase/migrations/" + migration, "utf8"));
  await db.exec(`INSERT INTO auth.users(id,email) VALUES('${alice}','alice@example.test'),('${bob}','bob@example.test'),('${admin}','admin@example.test');
 UPDATE public.users SET role='admin' WHERE id='${admin}';
 INSERT INTO public.products VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Product',100,10,true);
 INSERT INTO public.orders(user_id,payment_id,payment_status,order_status,total_amount,product_list) VALUES
 ('${alice}','${payment}','PENDING','PENDING',90,'[{"product_id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","quantity":2}]'),
 ('${bob}','55555555-5555-4555-8555-555555555555','PENDING','PENDING',90,'[]');
 INSERT INTO public.cart_items(user_id,product_id,quantity) VALUES('${alice}','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',3);`);
}, 30000);
afterAll(async () => {
  await db?.close();
});
describe("database access boundaries", () => {
  it("does not expose orders to visitors and scopes customer reads to the owner", async () => {
    await expect(
      asRole("anon", null, "SELECT * FROM public.orders"),
    ).rejects.toThrow(/permission denied/);
    const { rows } = await asRole(
      "authenticated",
      alice,
      "SELECT user_id FROM public.orders",
    );
    expect(rows).toEqual([{ user_id: alice }]);
    const adminRows = await asRole(
      "authenticated",
      admin,
      "SELECT id FROM public.orders",
    );
    expect(adminRows.rows).toHaveLength(2);
  });
  it("blocks browser role escalation and creation of paid orders", async () => {
    await expect(
      asRole(
        "authenticated",
        alice,
        "UPDATE public.users SET role='admin' WHERE id=$1",
        [alice],
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(
      asRole(
        "authenticated",
        admin,
        "UPDATE public.orders SET payment_status='SUCCESS'",
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(
      asRole(
        "authenticated",
        alice,
        "INSERT INTO public.orders(user_id,payment_status) VALUES($1,'SUCCESS')",
        [alice],
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(
      asRole(
        "authenticated",
        alice,
        "UPDATE public.orders SET payment_status='SUCCESS'",
      ),
    ).rejects.toThrow(/permission denied/);
  });
  it("prevents customer fulfilment changes and deletes while retaining admin operations", async () => {
    expect(
      (
        await asRole(
          "authenticated",
          alice,
          "UPDATE public.orders SET order_status='DELIVERED' RETURNING id",
        )
      ).rows,
    ).toHaveLength(0);
    expect(
      (
        await asRole(
          "authenticated",
          alice,
          "DELETE FROM public.orders RETURNING id",
        )
      ).rows,
    ).toHaveLength(0);
    expect(
      (
        await asRole(
          "authenticated",
          admin,
          "UPDATE public.orders SET order_status='PROCESSING' WHERE user_id=$1 RETURNING id",
          [bob],
        )
      ).rows,
    ).toHaveLength(1);
  });
  it("blocks cart ownership changes, invalid quantities and another customer cart", async () => {
    expect(
      (await asRole("authenticated", bob, "SELECT * FROM public.cart_items"))
        .rows,
    ).toHaveLength(0);
    await expect(
      asRole(
        "authenticated",
        alice,
        "UPDATE public.cart_items SET user_id=$1",
        [bob],
      ),
    ).rejects.toThrow(/row-level security/);
    await expect(
      asRole(
        "authenticated",
        alice,
        "UPDATE public.cart_items SET quantity=101",
      ),
    ).rejects.toThrow(/row-level security/);
  });
  it("prevents review owner reassignment and restricts administration", async () => {
    await asRole(
      "authenticated",
      alice,
      "INSERT INTO public.product_reviews(user_id,rating,review_text) VALUES($1,5,$2)",
      [alice, "Good"],
    );
    await expect(
      asRole(
        "authenticated",
        alice,
        "UPDATE public.product_reviews SET user_id=$1",
        [bob],
      ),
    ).rejects.toThrow(/row-level security/);
    await expect(
      asRole(
        "authenticated",
        bob,
        "DELETE FROM public.product_reviews RETURNING id",
      ),
    ).resolves.toMatchObject({ rows: [] });
    await expect(
      asRole(
        "authenticated",
        bob,
        "INSERT INTO public.products(id,product_name) VALUES(gen_random_uuid(),'Bad')",
      ),
    ).rejects.toThrow(/row-level security/);
  });
  it("accepts bounded public enquiries without exposing the inbox", async () => {
    await asRole(
      "anon",
      null,
      "INSERT INTO public.contact_messages(name,email,message) VALUES('Visitor','a@example.test','Hello')",
    );
    await expect(
      asRole("anon", null, "SELECT * FROM public.contact_messages"),
    ).rejects.toThrow(/permission denied/);
    expect(
      (
        await asRole(
          "authenticated",
          bob,
          "SELECT * FROM public.contact_messages",
        )
      ).rows,
    ).toHaveLength(0);
    expect(
      (
        await asRole(
          "authenticated",
          admin,
          "SELECT * FROM public.contact_messages",
        )
      ).rows,
    ).toHaveLength(1);
    await expect(
      asRole(
        "anon",
        null,
        "INSERT INTO public.newsletter_subscriptions(email) VALUES(repeat('x',321))",
      ),
    ).rejects.toThrow(/row-level security/);
  });
  it("overrides old permissive upload policies without breaking unrelated buckets", async () => {
    await expect(
      asRole(
        "anon",
        null,
        "INSERT INTO storage.objects(bucket_id,name) VALUES('product-image','x.png')",
      ),
    ).rejects.toThrow(/row-level security/);
    await expect(
      asRole(
        "authenticated",
        alice,
        "INSERT INTO storage.objects(bucket_id,name) VALUES('product-image','x.png')",
      ),
    ).rejects.toThrow(/row-level security/);
    await asRole(
      "authenticated",
      admin,
      "INSERT INTO storage.objects(bucket_id,name) VALUES('product-image','x.png')",
    );
    await asRole(
      "anon",
      null,
      "INSERT INTO storage.objects(bucket_id,name) VALUES('unrelated','allowed')",
    );
  });
  it("creates anonymous profiles without passwords and ignores metadata role escalation", async () => {
    const id = "66666666-6666-4666-8666-666666666666";
    await db.query(
      "INSERT INTO auth.users(id,is_anonymous,raw_user_meta_data) VALUES($1,true,$2)",
      [id, JSON.stringify({ role: "admin" })],
    );
    expect(
      (await db.query("SELECT role,name FROM public.users WHERE id=$1", [id]))
        .rows,
    ).toEqual([{ role: "user", name: "Guest" }]);
  });
});
describe("trusted payment writes", () => {
  it("rejects customer access to payment and rate-limit RPCs", async () => {
    await expect(
      asRole(
        "authenticated",
        alice,
        "SELECT public.record_gateway_payment($1,9000,$2,$3,$4)",
        [payment, "INR", "SUCCESS", "tx1"],
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(
      asRole(
        "authenticated",
        alice,
        "SELECT public.consume_checkout_limit($1)",
        [alice],
      ),
    ).rejects.toThrow(/permission denied/);
  });
  it("rejects amount and currency mismatch without changing order/cart", async () => {
    for (const [amount, currency] of [
      [1, "INR"],
      [9000, "USD"],
    ]) {
      const { rows } = await asRole(
        "service_role",
        null,
        "SELECT public.record_gateway_payment($1,$2,$3,$4,$5) AS result",
        [payment, amount, currency, "SUCCESS", "tx1"],
      );
      expect(rows[0].result.accepted).toBe(false);
    }
    expect(
      (
        await db.query(
          "SELECT payment_status FROM public.orders WHERE payment_id=$1",
          [payment],
        )
      ).rows[0].payment_status,
    ).toBe("PENDING");
  });
  it("records a payment once, preserves later cart additions, and rejects downgrade/replay changes", async () => {
    const sql =
      "SELECT public.record_gateway_payment($1,9000,$2,$3,$4) AS result";
    const call = () =>
      asRole("service_role", null, sql, [payment, "INR", "SUCCESS", "tx1"]);
    expect((await call()).rows[0].result.accepted).toBe(true);
    expect((await call()).rows[0].result.accepted).toBe(true);
    expect(
      (
        await db.query(
          "SELECT quantity FROM public.cart_items WHERE user_id=$1",
          [alice],
        )
      ).rows,
    ).toEqual([{ quantity: 1 }]);
    expect(
      (
        await asRole("service_role", null, sql, [
          payment,
          "INR",
          "FAILED",
          "tx1",
        ])
      ).rows[0].result.accepted,
    ).toBe(false);
    expect(
      (
        await asRole("service_role", null, sql, [
          payment,
          "INR",
          "SUCCESS",
          "other-tx",
        ])
      ).rows[0].result.accepted,
    ).toBe(false);
    expect(
      (
        await db.query(
          "SELECT payment_status FROM public.orders WHERE payment_id=$1",
          [payment],
        )
      ).rows[0].payment_status,
    ).toBe("SUCCESS");
  });
  it("rejects reuse of a tracking ID for a different order", async () => {
    const { rows } = await asRole(
      "service_role",
      null,
      "SELECT public.record_gateway_payment($1,9000,$2,$3,$4) AS result",
      ["55555555-5555-4555-8555-555555555555", "INR", "SUCCESS", "tx1"],
    );
    expect(rows[0].result.accepted).toBe(false);
  });
  it("enforces a shared database checkout-attempt limit", async () => {
    const results = [];
    for (let i = 0; i < 6; i++)
      results.push(
        (
          await asRole(
            "service_role",
            null,
            "SELECT public.consume_checkout_limit($1) AS allowed",
            [alice],
          )
        ).rows[0].allowed,
      );
    expect(results).toEqual([true, true, true, true, true, false]);
  });
});
