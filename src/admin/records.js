import { supabase } from "../supabaseClient";
export async function removeRecords(table, ids) {
  const { error, data } = await supabase
    .from(table)
    .delete()
    .in("id", ids)
    .select("id");
  if (error || data?.length !== ids.length)
    throw Error(
      "Deletion could not be confirmed for every record. Refresh before retrying.",
    );
}
export function exportRows(name, rows, columns) {
  const cell = (v) => {
    const raw = String(v ?? "");
    const safe = /^[\s]*[=+@-]/.test(raw) ? "'" + raw : raw;
    return '"' + safe.replaceAll('"', '""') + '"';
  };
  const text = [columns, ...rows.map((r) => columns.map((k) => r[k]))]
    .map((row) => row.map(cell).join(","))
    .join("\r\n");
  const url = URL.createObjectURL(
    new Blob([text], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name + ".csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function updateStatus(order, field, value) {
  const allowed =
    field === "order_status"
      ? ["processing", "shipped", "delivered", "cancelled"]
      : field === "payment_status" &&
          String(order.payment_id).startsWith("COD-")
        ? ["SUCCESS", "COD_PENDING"]
        : [];
  if (!allowed.includes(value)) throw Error("Unsupported status change.");
  let q = supabase
    .from("orders")
    .update({ [field]: value })
    .eq("id", order.id);
  q = order[field] == null ? q.is(field, null) : q.eq(field, order[field]);
  if (field === "payment_status") q = q.eq("payment_id", order.payment_id);
  const { data, error } = await q.select("id").single();
  if (error || !data)
    throw Error(
      "Status could not be confirmed. Refresh and review the current record.",
    );
}
