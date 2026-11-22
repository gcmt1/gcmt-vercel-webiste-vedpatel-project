import {
  guarded,
  json,
  HttpError,
  requireMethod,
  readJson,
  checkOrigin,
} from "./http.js";
import { getDatabase, authenticate, requireAdmin } from "./services.js";
import { PAYMENT_ID } from "./validation.js";
export function createOrderLookup({
  env = process.env,
  database = () => getDatabase(env),
} = {}) {
  return guarded(async (request) => {
    requireMethod(request, "GET");
    const paymentId = new URL(request.url).searchParams.get("payment_id");
    if (!PAYMENT_ID.test((paymentId || "").replace(/^COD-/, "")))
      throw new HttpError(400, "An explicit payment reference is required.");
    const db = database();
    const user = await authenticate(request, db);
    const { data, error } = await db
      .from("orders")
      .select(
        "id,user_name,user_email,user_phone,address_line,city,state,postal_code,product_list,total_amount,payment_status,order_status,payment_id,created_at",
      )
      .eq("payment_id", paymentId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw new Error("Order lookup failed");
    if (!data) throw new HttpError(404, "Order not found.");
    return json({ order: data });
  });
}
export function createCodUpdate({
  env = process.env,
  database = () => getDatabase(env),
} = {}) {
  return guarded(async (request) => {
    requireMethod(request, "POST");
    checkOrigin(request, env);
    const db = database();
    const user = await authenticate(request, db);
    await requireAdmin(user, db);
    const body = await readJson(request);
    if (
      !body ||
      body.status !== "SUCCESS" ||
      typeof body.note !== "string" ||
      body.note.trim().length < 3 ||
      body.note.length > 160 ||
      !/^[A-Za-z0-9-]{1,64}$/.test(String(body.orderId || ""))
    )
      throw new HttpError(400, "Invalid update.");
    const { data, error } = await db.rpc("collect_store_cod", {
      p_order: String(body.orderId),
      p_actor: user.id,
      p_note: body.note.trim(),
    });
    if (error) throw new Error("Order update failed");
    if (!data) throw new HttpError(404, "Cash-on-delivery order not found.");
    return json({ success: true });
  });
}
