// Isolated test service: production code is imported, but all identity/payment/data are local fixtures.
import { createServer } from "node:http";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, extname } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { createCheckoutHandler } from "../../server/checkout.js";
import { createPaymentHandler } from "../../server/payment.js";
import { createOrderLookup, createCodUpdate } from "../../server/orders.js";
const origin = "http://127.0.0.1:4173";
const users = {
  alice: {
    id: "11111111-1111-4111-8111-111111111111",
    email: "alice@example.test",
    role: "user",
  },
  bob: {
    id: "22222222-2222-4222-8222-222222222222",
    email: "bob@example.test",
    role: "user",
  },
  admin: {
    id: "33333333-3333-4333-8333-333333333333",
    email: "admin@example.test",
    role: "admin",
  },
  guest: {
    id: "66666666-6666-4666-8666-666666666666",
    email: null,
    is_anonymous: true,
    role: "user",
  },
};
const env = {
  SECURE_CHECKOUT_ENABLED: "true",
  SITE_URL: origin,
  CCA_MERCHANT_ID: "merchant-test",
  CCA_ACCESS_CODE: "access-test",
  CCA_WORKING_KEY: "test-" + "key".repeat(8),
};
const product = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const bobPayment = "55555555-5555-4555-8555-555555555555";
let db;
let startup;
function token(user) {
  return (
    Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
      "base64url",
    ) +
    "." +
    Buffer.from(
      JSON.stringify({
        sub: user.id,
        role: "authenticated",
        aud: "authenticated",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    ).toString("base64url") +
    ".test-signature"
  );
}
function identity(headers) {
  const value = (headers.get("authorization") || "").replace(/^Bearer /, "");
  return (
    Object.values(users).find(
      (user) => token(user).split(".")[1] === value.split(".")[1],
    ) || null
  );
}
// Tokens above have a moving iat. Resolve by subject and require our test signature.
function userFor(headers) {
  const value = (headers.get("authorization") || "").replace(/^Bearer /, "");
  try {
    if (!value.endsWith(".test-signature")) return null;
    const sub = JSON.parse(Buffer.from(value.split(".")[1], "base64url")).sub;
    return Object.values(users).find((user) => user.id === sub) || null;
  } catch {
    return null;
  }
}
const session = (user) => ({
  access_token: token(user),
  token_type: "bearer",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: "test-refresh",
  user: {
    ...user,
    aud: "authenticated",
    created_at: "2026-01-01T00:00:00Z",
    user_metadata: { name: "Test customer" },
  },
});
async function reset(mode = "") {
  if (db) await db.close();
  db = new PGlite();
  await db.waitReady;
  await db.exec(readFileSync("tests/fixtures/schema.sql", "utf8"));
  const migration = readdirSync("supabase/migrations").find((x) =>
    x.endsWith("_production_security.sql"),
  );
  await db.exec(readFileSync("supabase/migrations/" + migration, "utf8"));
  await db.exec(`ALTER TABLE public.products ADD COLUMN product_sub_description text DEFAULT 'Product description', ADD COLUMN product_description text DEFAULT 'Product details', ADD COLUMN product_image text DEFAULT '/logo192.png',ADD COLUMN created_at timestamptz DEFAULT now();
 ALTER TABLE public.orders ADD COLUMN user_name text,ADD COLUMN user_email text,ADD COLUMN user_phone text,ADD COLUMN address_line text,ADD COLUMN city text,ADD COLUMN state text,ADD COLUMN postal_code text,ADD COLUMN created_at timestamptz DEFAULT now(),ADD COLUMN guest_identifier text;
 ALTER TABLE public.contact_messages ADD COLUMN created_at timestamptz DEFAULT now();
 ALTER TABLE public.newsletter_subscriptions ADD COLUMN created_at timestamptz DEFAULT now();`);
  for (const user of Object.values(users))
    await db.query(
      "INSERT INTO auth.users(id,email,is_anonymous) VALUES($1,$2,$3)",
      [user.id, user.email, !!user.is_anonymous],
    );
  await db.query("UPDATE public.users SET role='admin' WHERE id=$1", [
    users.admin.id,
  ]);
  await db.query(
    "INSERT INTO public.products(id,product_name,product_price,product_discount) VALUES($1,'Test toothpaste',100,10)",
    [product],
  );
  await db.query(
    "INSERT INTO public.orders(user_id,payment_id,payment_status,order_status,total_amount,product_list,user_name,user_email) VALUES($1,$2,'PENDING','PENDING',90,'[]','Bob private order','bob@example.test')",
    [users.bob.id, bobPayment],
  );
  await db.query(
    "INSERT INTO public.contact_messages(name,email,phone,message) VALUES($1,$2,$3,$4)",
    ['A "quoted", customer', "a@example.test", "9999999999", "=1+1"],
  );
  env.SECURE_CHECKOUT_ENABLED = mode === "disabled" ? "false" : "true";
}
async function queryAs(role, user, sql, params = []) {
  return db.transaction(async (tx) => {
    await tx.exec(`SET LOCAL ROLE ${role}`);
    await tx.query("SELECT set_config('request.jwt.claim.sub',$1,true)", [
      user?.id || "",
    ]);
    return tx.query(sql, params);
  });
}
const names = /^[a-z_]+$/;
function database() {
  return {
    auth: {
      getUser: async (bearer) => {
        const user = userFor(
          new Headers({ Authorization: "Bearer " + bearer }),
        );
        return {
          data: { user },
          error: user ? null : { message: "Invalid token" },
        };
      },
    },
    rpc: async (name, args) => {
      try {
        const keys = Object.keys(args);
        const { rows } = await queryAs(
          "service_role",
          null,
          `SELECT public.${name}(${keys.map((_, i) => "$" + (i + 1)).join(",")}) AS data`,
          keys.map((k) => args[k]),
        );
        return { data: rows[0].data, error: null };
      } catch (error) {
        return { data: null, error: { message: error.message } };
      }
    },
    from(table) {
      if (!["users", "orders", "cart_items"].includes(table))
        throw Error("Unexpected server table");
      let operation = "select",
        value,
        columns = "*";
      const filters = [];
      const q = {
        select(input) {
          columns = input;
          return q;
        },
        eq(k, v) {
          filters.push([k, "=", v]);
          return q;
        },
        like(k, v) {
          filters.push([k, "LIKE", v]);
          return q;
        },
        insert(input) {
          operation = "insert";
          value = input;
          return q;
        },
        update(input) {
          operation = "update";
          value = input;
          return q;
        },
        async result(single = false) {
          try {
            let params = [];
            let sql;
            const where = () =>
              filters.length
                ? " WHERE " +
                  filters
                    .map(([key, op, v]) => {
                      if (!names.test(key)) throw Error("Bad field");
                      params.push(v);
                      return `t.${key} ${op} $${params.length}`;
                    })
                    .join(" AND ")
                : "";
            if (operation === "insert") {
              const keys = Object.keys(value);
              params = Object.values(value).map((v, i) =>
                keys[i] === "product_list" ? JSON.stringify(v) : v,
              );
              sql = `INSERT INTO public.${table}(${keys.join(",")}) VALUES(${keys.map((_, i) => "$" + (i + 1)).join(",")}) RETURNING *`;
            } else if (operation === "update") {
              const keys = Object.keys(value);
              params = Object.values(value);
              sql = `UPDATE public.${table} AS t SET ${keys.map((k, i) => k + "=$" + (i + 1)).join(",")}${where()} RETURNING *`;
            } else if (table === "cart_items" && columns.includes("products:"))
              sql = `SELECT t.*,to_jsonb(p) AS products FROM public.cart_items t JOIN public.products p ON p.id=t.product_id${where()}`;
            else sql = `SELECT t.* FROM public.${table} t${where()}`;
            const { rows } = await queryAs("service_role", null, sql, params);
            return { data: single ? rows[0] || null : rows, error: null };
          } catch (error) {
            return {
              data: null,
              error: { message: error.message, code: error.code },
            };
          }
        },
        single() {
          return q.result(true);
        },
        maybeSingle() {
          return q.result(true);
        },
        then(a, b) {
          return q.result().then(a, b);
        },
      };
      return q;
    },
  };
}
const handlers = {
  "/api/create-order": createCheckoutHandler({ env, database }),
  "/api/payment-response": createPaymentHandler({ env, database }),
  "/api/order": createOrderLookup({ env, database }),
  "/api/cod-payment": createCodUpdate({ env, database }),
};
const output = (data, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
async function rest(request, url) {
  const table = url.pathname.split("/").at(-1);
  if (
    ![
      "products",
      "cart_items",
      "users",
      "orders",
      "contact_messages",
      "newsletter_subscriptions",
      "product_reviews",
    ].includes(table)
  )
    return output([], 404);
  const user = userFor(request.headers);
  const role = user ? "authenticated" : "anon";
  let params = [];
  const clauses = [];
  for (const [key, value] of url.searchParams) {
    if (["select", "limit", "order", "on_conflict"].includes(key)) continue;
    if (!names.test(key)) return output({ message: "Invalid filter" }, 400);
    if (value.startsWith("eq.")) {
      params.push(value.slice(3));
      clauses.push(`${key}=$${params.length}`);
    } else if (value.startsWith("in.(")) {
      const values = value
        .slice(4, -1)
        .split(",")
        .map((x) => x.replace(/^"|"$/g, ""));
      clauses.push(
        `${key} IN (${values
          .map((value) => {
            params.push(value);
            return "$" + params.length;
          })
          .join(",")})`,
      );
    }
  }
  const where = clauses.length ? " WHERE " + clauses.join(" AND ") : "";
  try {
    let rows;
    if (request.method === "GET")
      rows = (
        await queryAs(
          role,
          user,
          `SELECT * FROM public.${table}${where}`,
          params,
        )
      ).rows;
    else if (request.method === "POST") {
      const input = await request.json();
      const item = Array.isArray(input) ? input[0] : input;
      const keys = Object.keys(item);
      if (!keys.every((k) => names.test(k))) return output({}, 400);
      await queryAs(
        role,
        user,
        `INSERT INTO public.${table}(${keys.join(",")}) VALUES(${keys.map((_, i) => "$" + (i + 1)).join(",")})`,
        Object.values(item),
      );
      rows = [];
    } else if (request.method === "PATCH") {
      const input = await request.json();
      const keys = Object.keys(input);
      let values = Object.values(input);
      const offset = values.length;
      const shifted = where.replace(
        /\$(\d+)/g,
        (_, number) => "$" + (Number(number) + offset),
      );
      await queryAs(
        role,
        user,
        `UPDATE public.${table} SET ${keys.map((k, i) => k + "=$" + (i + 1)).join(",")}${shifted}`,
        [...values, ...params],
      );
      rows = [];
    } else if (request.method === "DELETE") {
      await queryAs(role, user, `DELETE FROM public.${table}${where}`, params);
      rows = [];
    } else return output({}, 405);
    if (
      table === "cart_items" &&
      request.method === "GET" &&
      url.searchParams.get("select")?.includes("products")
    ) {
      for (const row of rows)
        row.products =
          (
            await queryAs(
              role,
              user,
              "SELECT * FROM public.products WHERE id=$1",
              [row.product_id],
            )
          ).rows[0] || null;
    }
    if (request.headers.get("accept")?.includes("vnd.pgrst.object")) {
      if (rows.length !== 1)
        return output({ code: "PGRST116", message: "No single row" }, 406);
      return output(rows[0]);
    }
    return output(rows, request.method === "POST" ? 201 : 200);
  } catch (error) {
    return output({ message: error.message, code: error.code }, 403);
  }
}
async function handle(request) {
  const url = new URL(request.url);
  if (url.pathname === "/__test/reset") {
    await reset(url.searchParams.get("mode") || "");
    return output({ ok: true });
  }
  if (url.pathname === "/__test/session")
    return output(session(users[url.searchParams.get("user")] || users.alice));
  if (handlers[url.pathname]) return handlers[url.pathname](request);
  if (url.pathname === "/supabase/auth/v1/signup")
    return output(session(users.guest));
  if (url.pathname === "/supabase/auth/v1/token") {
    const body = await request.json();
    const user =
      Object.values(users).find((x) => x.email === body.email) || users.alice;
    return output(session(user));
  }
  if (url.pathname === "/supabase/auth/v1/user") {
    const user = userFor(request.headers);
    return user
      ? output({ ...user, user_metadata: { name: "Test customer" } })
      : output({ message: "Not signed in" }, 401);
  }
  if (url.pathname === "/supabase/auth/v1/logout") return output({});
  if (url.pathname.startsWith("/supabase/rest/v1/")) return rest(request, url);
  const path = resolve("build", "." + url.pathname);
  const buildRoot = resolve("build");
  const file =
    path.startsWith(buildRoot + "/") && existsSync(path) && extname(path)
      ? path
      : resolve("build/index.html");
  const types = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".ico": "image/x-icon",
    ".svg": "image/svg+xml",
    ".mp4": "video/mp4",
    ".json": "application/json",
  };
  const headers = JSON.parse(readFileSync("vercel.json", "utf8")).routes[0]
    .headers;
  return new Response(readFileSync(file), {
    headers: {
      ...headers,
      "Content-Type": types[extname(file)] || "application/octet-stream",
    },
  });
}
await reset();
createServer(async (req, res) => {
  try {
    const buffers = [];
    for await (const chunk of req) buffers.push(chunk);
    const request = new Request(origin + req.url, {
      method: req.method,
      headers: req.headers,
      ...(!["GET", "HEAD"].includes(req.method)
        ? { body: Buffer.concat(buffers) }
        : {}),
    });
    const response = await handle(request);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error("Local test service failed:", error.message);
    res.writeHead(500);
    res.end("Local test service failed");
  }
}).listen(4173, "127.0.0.1", () =>
  console.log("Isolated browser test service ready"),
);
