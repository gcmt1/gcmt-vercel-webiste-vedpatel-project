import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { createServer } from "node:net";
import EmbeddedPostgres from "embedded-postgres";
let cluster, root;
const file = (p) => readFile(new URL("../../" + p, import.meta.url), "utf8");
before(async () => {
  const dir = await mkdtemp(join(tmpdir(), "gcmt-test-db-"));
  const probe = createServer();
  await new Promise((ok, fail) =>
    probe.once("error", fail).listen(0, "127.0.0.1", ok),
  );
  const port = probe.address().port;
  await new Promise((ok) => probe.close(ok));
  cluster = new EmbeddedPostgres({
    databaseDir: join(dir, "data"),
    port,
    user: "postgres",
    password: randomUUID(),
    persistent: false,
    authMethod: "scram-sha-256",
    postgresFlags: ["-h", "127.0.0.1", "-k", dir],
    onLog: () => {},
    onError: () => {},
  });
  await cluster.initialise();
  await cluster.start();
  root = cluster.getPgClient("postgres", "127.0.0.1");
  await root.connect();
  await root.query(await file("tests/fixtures/schema.sql"));
  await root.query(await file("supabase/bootstrap/empty-project.sql"));
  for (const name of (await readdir("supabase/migrations")).sort())
    await root.query(await file("supabase/migrations/" + name));
});
after(async () => {
  await root?.end();
  await cluster?.stop();
});
async function query(role, who, sql, args = []) {
  const conn = cluster.getPgClient("postgres", "127.0.0.1");
  await conn.connect();
  try {
    await conn.query("begin");
    await conn.query("set local role " + role);
    await conn.query("select set_config('request.jwt.claim.sub',$1,true)", [
      who ?? "",
    ]);
    const r = await conn.query(sql, args);
    await conn.query("commit");
    return r.rows;
  } finally {
    await conn.end();
  }
}
import { gatewayReference } from "../../server/reference.js";
const product = randomUUID();
const shipping = {
  name: "Fixture",
  email: "user@example.test",
  phone: "9999999999",
  street: "Test street",
  city: "City",
  state: "State",
  pincode: "382001",
};
async function basket(size = "Large") {
  const user = randomUUID();
  await root.query("insert into auth.users(id) values($1)", [user]);
  await root.query(
    "insert into public.products(id,product_name,product_price,product_discount,size) values($1,'Fixture',101.50,10,'Small,Large') on conflict do nothing",
    [product],
  );
  await add(user, size, 1);
  return user;
}
const add = (user, size, qty, operation = randomUUID()) =>
  query(
    "authenticated",
    user,
    "select public.add_store_cart_item($1,$2,$3,$4)",
    [product, size, qty, operation],
  );
const quote = (size = "Large", qty = 1) => [
  { productId: product, variant: size, quantity: qty, unitPaise: 9135 },
];
async function prepare(
  user,
  id = randomUUID(),
  lines = quote(),
  amount = 9135,
) {
  return (
    await query(
      "service_role",
      null,
      "select public.open_store_checkout($1,$2,$3,$4,$5,$6) r",
      [user, id, shipping, amount, JSON.stringify(lines), gatewayReference(id)],
    )
  )[0].r;
}
async function release(owner, prepared) {
  return (
    await query(
      "service_role",
      null,
      "select public.release_store_handoff($1,$2,$3) ok",
      [owner, prepared.payment_id, prepared.generation],
    )
  )[0].ok;
}
async function open(user, ...args) {
  const prepared = await prepare(user, ...args);
  if (prepared.generation && !(await release(user, prepared)))
    return { existing: true, payment_id: prepared.payment_id };
  return prepared;
}
async function record(id, state, tracking, amount = 9135) {
  return (
    await query(
      "service_role",
      null,
      "select public.record_gateway_payment($1,$2,'INR',$3,$4) r",
      [id, amount, state, tracking],
    )
  )[0].r;
}
test("two tabs create exactly one payable snapshot and a lost response recovers its reference", async () => {
  const user = await basket();
  const ids = [randomUUID(), randomUUID()];
  const results = await Promise.all(ids.map((id) => open(user, id)));
  assert.equal(results.filter((r) => r.id).length, 1);
  assert.equal(results.filter((r) => r.existing).length, 1);
  const placed = (
    await root.query("select * from public.orders where user_id=$1", [user])
  ).rows;
  assert.equal(placed.length, 1);
  assert.equal(placed[0].product_list[0].variant, "Large");
  assert.equal(placed[0].product_list[0].unit_price, 91.35);
  assert.equal((await open(user)).payment_id, placed[0].payment_id);
});
test("concurrent operations preserve both sizes and a retried merge adds once", async () => {
  const user = await basket("Small"),
    op = randomUUID();
  await Promise.all([
    add(user, "Large", 1, op),
    add(user, "Large", 1, op),
    add(user, "Small", 2),
  ]);
  const result = await root.query(
    "select variant,quantity from public.cart_items where user_id=$1 order by variant",
    [user],
  );
  assert.deepEqual(result.rows, [
    { variant: "Large", quantity: 1 },
    { variant: "Small", quantity: 3 },
  ]);
  await assert.rejects(add(user, "Other", 1));
  await assert.rejects(add(user, "Small", 100));
  assert.equal((await open(user)).changed, true);
});
test("price, variant or basket changes require review even at the same total", async () => {
  const user = await basket();
  assert.equal((await open(user, randomUUID(), quote("Small"))).changed, true);
  assert.equal((await open(user, randomUUID(), quote(), 9000)).changed, true);
  assert.equal(
    (
      await root.query(
        "select count(*) n from public.orders where user_id=$1",
        [user],
      )
    ).rows[0].n,
    "0",
  );
});
test("delayed success is atomic and consumes only the purchased size and row", async () => {
  const user = await basket(),
    id = randomUUID(),
    tracking = randomUUID();
  await open(user, id);
  await add(user, "Small", 1);
  assert.equal((await record(id, "FAILED", null)).accepted, true);
  assert.equal((await open(user)).existing, true);
  const results = await Promise.all([
    record(id, "SUCCESS", tracking),
    record(id, "SUCCESS", tracking),
  ]);
  assert.ok(results.every((r) => r.accepted));
  assert.equal((await record(id, "FAILED", tracking)).accepted, false);
  assert.equal((await record(id, "SUCCESS", randomUUID())).accepted, false);
  assert.deepEqual(
    (
      await root.query(
        "select quantity,variant from public.cart_items where user_id=$1",
        [user],
      )
    ).rows,
    [{ quantity: 1, variant: "Small" }],
  );
  assert.deepEqual(
    (
      await root.query(
        "select disposition from private.gateway_events where payment_id=$1 order by event_id",
        [id],
      )
    ).rows.map((x) => x.disposition),
    ["applied", "applied", "duplicate", "review", "review"],
  );
  await assert.rejects(
    query("service_role", null, "delete from private.gateway_events"),
  );
});
test("a merchant-confirmed nonpayable outcome permits a new attempt and quarantines contradictory late evidence", async () => {
  const user = await basket(),
    id = randomUUID();
  await open(user, id);
  await assert.rejects(
    query(
      "authenticated",
      user,
      "select public.close_unpaid_store_attempt($1,'fictional-case')",
      [id],
    ),
  );
  await root.query(
    "select public.close_unpaid_store_attempt($1,'synthetic merchant case')",
    [id],
  );
  assert.ok((await open(user)).id);
  assert.equal((await record(id, "SUCCESS", randomUUID())).accepted, false);
});
test("checkout, collection and journal privileges enforce staff and financial ownership", async () => {
  const user = await basket(),
    id = randomUUID();
  await open(user, id);
  await assert.rejects(
    query(
      "authenticated",
      user,
      "select public.open_store_checkout($1,$2,$3,$4,$5,$6)",
      [user, id, shipping, 9135, JSON.stringify(quote()), gatewayReference(id)],
    ),
  );
  await assert.rejects(
    query("authenticated", user, "select * from private.payment_review_queue"),
  );
  await root.query("update public.users set role='admin' where id=$1", [user]);
  await assert.rejects(
    query(
      "authenticated",
      user,
      "delete from public.orders where payment_id=$1",
      [id],
    ),
  );
  await assert.rejects(
    query(
      "authenticated",
      user,
      "update public.orders set order_status='SHIPPED' where payment_id=$1",
      [id],
    ),
  );
  await query(
    "authenticated",
    user,
    "update public.orders set archived_at=now() where payment_id=$1",
    [id],
  );
  assert.equal(
    (
      await root.query(
        "select archived_by from public.orders where payment_id=$1",
        [id],
      )
    ).rows[0].archived_by,
    user,
  );
  assert.equal(
    (
      await query(
        "service_role",
        null,
        "select public.collect_store_cod($1,$2,'fixture') ok",
        [(await open(user)).payment_id, user],
      )
    )[0].ok,
    false,
  );
});
test("two captures sharing a tracking reference settle exactly one order", async () => {
  const users = await Promise.all([basket(), basket()]),
    ids = [randomUUID(), randomUUID()],
    ref = randomUUID();
  await Promise.all(users.map((u, i) => open(u, ids[i])));
  const results = await Promise.all(
    ids.map((id) => record(id, "SUCCESS", ref)),
  );
  assert.deepEqual(results.map((r) => r.accepted).sort(), [false, true]);
});

test("failed callback persistence rolls back the receipt, order and cart before a retry", async () => {
  const user = await basket(),
    id = randomUUID(),
    tracking = randomUUID();
  await open(user, id);
  // Abort only this synthetic order's event insert, after the receipt and cart writes.
  await root.query(`create function private.test_abort() returns trigger language plpgsql as $$ begin
    if new.payment_id='${id}' then raise exception 'simulated journal outage'; end if; return new; end $$;
    create trigger test_abort before insert on private.gateway_events for each row execute function private.test_abort()`);
  try {
    await assert.rejects(
      record(id, "SUCCESS", tracking),
      /simulated journal outage/,
    );
    assert.equal(
      (
        await root.query(
          "select payment_status from public.orders where payment_id=$1",
          [id],
        )
      ).rows[0].payment_status,
      "PENDING",
    );
    assert.equal(
      (
        await root.query(
          "select count(*) n from private.payment_receipts where payment_id=$1",
          [id],
        )
      ).rows[0].n,
      "0",
    );
    assert.equal(
      (
        await root.query(
          "select quantity from public.cart_items where user_id=$1",
          [user],
        )
      ).rows[0].quantity,
      1,
    );
  } finally {
    await root.query(
      "drop trigger test_abort on private.gateway_events; drop function private.test_abort()",
    );
  }
  assert.equal((await record(id, "SUCCESS", tracking)).accepted, true);
});
test("independent inquiry workers cannot claim the same due payment twice", async () => {
  const user = await basket(),
    id = randomUUID();
  await open(user, id);
  await root.query(
    "update public.orders set created_at=now()-interval '1 hour' where payment_id=$1",
    [id],
  );
  const claim = () =>
    query(
      "service_role",
      null,
      "select public.claim_store_inquiries() claimed",
    );
  const jobs = (await Promise.all([claim(), claim()])).flatMap(
    (rows) => rows[0].claimed,
  );
  assert.equal(jobs.filter((job) => job.payment_id === id).length, 1);
  assert.equal(
    jobs.find((job) => job.payment_id === id).gateway_reference,
    gatewayReference(id),
  );
});
test("collecting COD requires a staff actor, a receipt note and a COD order", async () => {
  const user = await basket(),
    id = randomUUID(),
    staff = randomUUID();
  await root.query("insert into auth.users(id) values($1)", [staff]);
  await root.query("update public.users set role='admin' where id=$1", [staff]);
  await root.query(
    "insert into public.orders(id,user_id,payment_id,payment_status) values($1,$2,$3,'COD_PENDING')",
    [id, user, "COD-" + id],
  );
  const collect = async (who, note) =>
    (
      await query(
        "service_role",
        null,
        "select public.collect_store_cod($1,$2,$3) ok",
        [id, who, note],
      )
    )[0].ok;
  assert.equal(await collect(user, "receipt-fixture"), false);
  assert.equal(await collect(staff, ""), false);
  assert.equal(await collect(staff, "receipt-fixture"), true);
  assert.equal(await collect(staff, "receipt-fixture"), false);
  assert.equal(
    (
      await root.query(
        "select actor from private.order_actions where order_id=$1",
        [id],
      )
    ).rows[0].actor,
    staff,
  );
});

test("a never-issued form can be requoted after interruption, and only the latest snapshot can leave the server", async () => {
  const owner = await basket(),
    other = await basket(),
    first = await prepare(owner);
  assert.equal(
    (await record(first.payment_id, "SUCCESS", randomUUID())).accepted,
    false,
  );
  await add(owner, "Large", 1);
  assert.equal((await prepare(owner)).changed, true);
  const second = await prepare(owner, randomUUID(), quote("Large", 2), 18270);
  assert.equal(second.payment_id, first.payment_id);
  assert.equal(await release(owner, first), false);
  assert.equal(await release(other, second), false);
  assert.equal(await release(owner, second), true);
  assert.equal(await release(owner, second), false);
  assert.equal((await prepare(owner)).existing, true);
});
test("COD creation consumes only the owner's quoted rows once and reaches collection without a gateway receipt", async () => {
  const owner = await basket(),
    id = "COD-" + randomUUID(),
    other = await basket();
  const place = async (user, ref) =>
    (
      await query(
        "service_role",
        null,
        "select public.open_store_checkout($1,$2,$3,$4,$5,null) r",
        [user, ref, shipping, 9135, JSON.stringify(quote())],
      )
    )[0].r;
  const results = await Promise.all([place(owner, id), place(owner, id)]);
  assert.equal(results.filter((x) => x.cod).length, 1);
  assert.equal(results.filter((x) => x.existing).length, 1);
  assert.equal((await place(owner, "COD-" + randomUUID())).changed, true);
  assert.equal((await record(id, "SUCCESS", randomUUID())).accepted, false);
  assert.equal(
    (
      await root.query(
        "select quantity from public.cart_items where user_id=$1",
        [other],
      )
    ).rows.length,
    1,
  );
  const order = (
    await root.query(
      "select id,payment_status,order_status from public.orders where payment_id=$1",
      [id],
    )
  ).rows[0];
  assert.equal(order.payment_status, "COD_PENDING");
  assert.equal(order.order_status, "PROCESSING");
  await root.query("update public.users set role='admin' where id=$1", [other]);
  assert.equal(
    (
      await query(
        "service_role",
        null,
        "select public.collect_store_cod($1,$2,$3) ok",
        [order.id, other, "Fixture receipt"],
      )
    )[0].ok,
    true,
  );
});

test("only the stored gateway reference settles an order; historical snapshots without a cart row preserve the basket", async () => {
  const owner = await basket(),
    id = randomUUID();
  await open(owner, id);
  const callback = async (reference) =>
    (
      await query(
        "service_role",
        null,
        "select public.record_store_response($1,$2,9135,'INR','SUCCESS',$3) result",
        [id, reference, randomUUID()],
      )
    )[0].result;
  assert.equal((await callback(id)).accepted, false);
  await root.query(
    "update public.orders set product_list=jsonb_build_array((product_list->0)-'cart_id'),gateway_reference=null where payment_id=$1",
    [id],
  );
  assert.equal((await callback(gatewayReference(id))).accepted, false);
  assert.equal((await callback(id)).accepted, true);
  assert.equal(
    (
      await root.query(
        "select quantity from public.cart_items where user_id=$1",
        [owner],
      )
    ).rows[0].quantity,
    1,
  );
});

test("a serialized legacy snapshot cannot roll back a verified receipt or consume current cart lines", async () => {
  const owner = await basket(),
    id = randomUUID();
  await open(owner, id);
  await root.query(
    "update public.orders set product_list=to_jsonb(product_list::text) where payment_id=$1",
    [id],
  );
  assert.equal((await record(id, "SUCCESS", randomUUID())).accepted, true);
  assert.equal(
    (
      await root.query(
        "select quantity from public.cart_items where user_id=$1",
        [owner],
      )
    ).rows[0].quantity,
    1,
  );
});

test("a committed catalog change before submission rejects the earlier quote, including unavailable and invalid prices", async () => {
  const owner = await basket();
  try {
    await root.query(
      "update public.products set product_price=120 where id=$1",
      [product],
    );
    assert.equal((await prepare(owner)).changed, true);
    await root.query("update public.products set in_stock=false where id=$1", [
      product,
    ]);
    assert.equal((await prepare(owner)).invalid, true);
    await root.query(
      "update public.products set in_stock=true, product_price=0 where id=$1",
      [product],
    );
    assert.equal((await prepare(owner)).invalid, true);
    assert.equal(
      (
        await root.query(
          "select count(*) as n from public.orders where user_id=$1",
          [owner],
        )
      ).rows[0].n,
      "0",
    );
  } finally {
    await root.query(
      "update public.products set in_stock=true,product_price=101.50 where id=$1",
      [product],
    );
  }
});
