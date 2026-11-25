import React, { useState } from "react";
import { useRecords } from "../shop/useRecords";
import { amount, displayDate, payment } from "../shop/orders";
import { Button, Field, Dialog, Notice } from "../components/ui";
import OrderRecord from "../components/OrderRecord";
import { removeRecords, exportRows, updateStatus } from "./records";
import s from "./admin.module.css";
import c from "../components/commerce.module.css";
const config = {
  orders: {
    title: "Orders",
    columns: [
      "id",
      "user_name",
      "user_email",
      "payment_id",
      "user_phone",
      "city",
    ],
  },
  newsletter_subscriptions: {
    title: "Subscriptions",
    columns: ["email", "created_at"],
  },
  contact_messages: {
    title: "Enquiries",
    columns: ["name", "email", "phone", "message", "created_at"],
  },
};
export default function RecordList({ table }) {
  const { title, columns } = config[table],
    orders = table === "orders",
    { data, error, refresh } = useRecords(table);
  const [search, setSearch] = useState(""),
    [fulfill, setFulfill] = useState(""),
    [pay, setPay] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [page, setPage] = useState(0),
    [selected, select] = useState([]),
    [open, setOpen] = useState(null),
    [confirm, ask] = useState(null),
    [busy, setBusy] = useState(false),
    [feedback, setFeedback] = useState("");
  const matches = (data || []).filter(
    (r) =>
      columns.some((k) =>
        String(r[k] ?? "")
          .toLowerCase()
          .includes(search.trim().toLowerCase()),
      ) &&
      (!fulfill || r.order_status === fulfill) &&
      (!pay || r.payment_status === pay) &&
      (!from || r.created_at?.slice(0, 10) >= from) &&
      (!to || r.created_at?.slice(0, 10) <= to),
  );
  const last = Math.max(0, Math.ceil(matches.length / 10) - 1),
    current = Math.min(last, page),
    slice = matches.slice(current * 10, current * 10 + 10),
    record = data?.find((r) => r.id === open);
  const ids = selected.filter((id) => matches.some((r) => r.id === id));
  function change(setter, value) {
    setter(value);
    setPage(0);
    select([]);
  }
  async function apply() {
    if (busy) return;
    setBusy(true);
    try {
      if (confirm.ids) await removeRecords(table, confirm.ids);
      else await updateStatus(confirm.row, confirm.field, confirm.value);
      setFeedback("Saved.");
      select([]);
      setOpen(null);
    } catch (e) {
      setFeedback(e.message);
    } finally {
      ask(null);
      setBusy(false);
      refresh();
    }
  }
  const options = (key) =>
    [...new Set((data || []).map((r) => r[key]).filter(Boolean))].map((v) => (
      <option key={v}>{v}</option>
    ));
  return (
    <div className={c.stack}>
      <div className={c.header}>
        <h1>{title}</h1>
        <Button secondary onClick={refresh}>
          Refresh
        </Button>
      </div>
      <div className={s.tools}>
        <Field
          label={"Search " + title.toLowerCase()}
          type="search"
          value={search}
          onChange={(e) => change(setSearch, e.target.value)}
        />
        {orders && (
          <>
            <label>
              Fulfillment
              <select
                value={fulfill}
                onChange={(e) => change(setFulfill, e.target.value)}
              >
                <option value="">All</option>
                {[
                  ...new Set(
                    (data || []).map((row) => row.order_status).filter(Boolean),
                  ),
                ].map((status) => (
                  <option key={status} value={status}>
                    {status} (
                    {data.filter((row) => row.order_status === status).length})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Payment
              <select
                value={pay}
                onChange={(e) => change(setPay, e.target.value)}
              >
                <option value="">All</option>
                {options("payment_status")}
              </select>
            </label>
          </>
        )}
        <Field
          label="From date"
          type="date"
          value={from}
          onChange={(e) => change(setFrom, e.target.value)}
        />
        <Field
          label="To date"
          type="date"
          value={to}
          onChange={(e) => change(setTo, e.target.value)}
        />
      </div>
      {feedback && <Notice>{feedback}</Notice>}
      {error ? (
        <Notice error>
          Could not load {title.toLowerCase()}. Refresh to retry.
        </Notice>
      ) : !data ? (
        <Notice>Loading…</Notice>
      ) : (
        <>
          <div className={c.actions}>
            <span>{matches.length} matching</span>
            {orders && (
              <strong>
                {amount(
                  matches.reduce(
                    (sum, row) => sum + Number(row.total_amount || 0),
                    0,
                  ),
                )}{" "}
                in orders
              </strong>
            )}
            {orders && (
              <>
                <span>
                  {matches.filter((r) => payment(r).status === "Paid").length}{" "}
                  paid online
                </span>
                <span>
                  {
                    matches.filter(
                      (r) => payment(r).status === "Awaiting collection",
                    ).length
                  }{" "}
                  awaiting collection
                </span>
              </>
            )}
            {
              <Button
                secondary
                disabled={!matches.length}
                onClick={() =>
                  exportRows(
                    table,
                    matches,
                    orders
                      ? [
                          ...columns,
                          "created_at",
                          "total_amount",
                          "payment_status",
                          "order_status",
                        ]
                      : columns,
                  )
                }
              >
                Export results
              </Button>
            }
            <Button
              secondary
              disabled={!slice.length}
              onClick={() => select(slice.map((r) => r.id))}
            >
              Select page
            </Button>
            {ids.length > 0 && (
              <>
                <Button secondary onClick={() => select([])}>
                  Clear selection
                </Button>
                <Button secondary onClick={() => ask({ ids })}>
                  Delete selected ({ids.length})
                </Button>
              </>
            )}
          </div>
          {!matches.length && (
            <Notice>
              {data.length ? "No matching records." : "No records yet."}
            </Notice>
          )}
          <div className={s.list}>
            {slice.map((r) => (
              <article className={s.line} key={r.id}>
                <label>
                  <input
                    aria-label={"Select " + r.id}
                    type="checkbox"
                    checked={ids.includes(r.id)}
                    onChange={(e) =>
                      select(
                        e.target.checked
                          ? [...ids, r.id]
                          : ids.filter((id) => id !== r.id),
                      )
                    }
                  />
                </label>
                <div className={s.info}>
                  <strong>
                    {orders
                      ? "Order " + String(r.id).slice(-8)
                      : r.name || r.email}
                  </strong>
                  <p>
                    {orders ? r.user_name : r.email} ·{" "}
                    {displayDate(r.created_at)}
                  </p>
                </div>
                {orders && (
                  <div>
                    <strong>{amount(r.total_amount)}</strong>
                    <p>
                      {payment(r).status} · {r.order_status || "Unavailable"}
                    </p>
                  </div>
                )}
                <Button secondary onClick={() => setOpen(r.id)}>
                  Open
                </Button>
              </article>
            ))}
          </div>
          {last > 0 && (
            <div className={c.actions}>
              <Button
                secondary
                disabled={current === 0}
                onClick={() => setPage(current - 1)}
              >
                Previous
              </Button>
              {current + 1} / {last + 1}
              <Button
                secondary
                disabled={current === last}
                onClick={() => setPage(current + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
      {record && !confirm && (
        <Dialog
          title={
            orders
              ? "Order details"
              : title === "Enquiries"
                ? "Enquiry"
                : "Subscription"
          }
          onClose={() => setOpen(null)}
        >
          <div className={c.stack}>
            {orders ? (
              <>
                <OrderRecord order={record} />
                <p>
                  {[record.user_email, record.user_phone]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <label className={s.form}>
                  Change fulfillment
                  <select
                    value=""
                    onChange={(e) =>
                      ask({
                        row: record,
                        field: "order_status",
                        value: e.target.value,
                      })
                    }
                  >
                    <option value="">Choose status</option>
                    {["processing", "shipped", "delivered", "cancelled"]
                      .filter((v) => v !== record.order_status?.toLowerCase())
                      .map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                  </select>
                </label>
                {String(record.payment_id).startsWith("COD-") && (
                  <Button
                    secondary
                    onClick={() =>
                      ask({
                        row: record,
                        field: "payment_status",
                        value:
                          record.payment_status === "SUCCESS"
                            ? "COD_PENDING"
                            : "SUCCESS",
                      })
                    }
                  >
                    {record.payment_status === "SUCCESS"
                      ? "Mark COD awaiting collection"
                      : "Record COD collection"}
                  </Button>
                )}
              </>
            ) : (
              <>
                <strong>{record.name || record.email}</strong>
                <p>{record.email}</p>
                <p>{record.phone}</p>
                <p>{record.message}</p>
              </>
            )}
            <Button secondary onClick={() => ask({ ids: [record.id] })}>
              Delete record
            </Button>
          </div>
        </Dialog>
      )}
      {confirm && (
        <Dialog
          title={confirm.ids ? "Confirm deletion" : "Confirm status change"}
          onClose={() => {
            if (!busy) ask(null);
          }}
        >
          <div className={c.stack}>
            <p>
              {confirm.ids
                ? "Permanently delete " +
                  confirm.ids.length +
                  " record(s): " +
                  confirm.ids.join(", ")
                : "Order " +
                  confirm.row.id +
                  " · " +
                  amount(confirm.row.total_amount) +
                  " · " +
                  confirm.value}
            </p>
            <div className={c.actions}>
              <Button secondary disabled={busy} onClick={() => ask(null)}>
                Cancel
              </Button>
              <Button disabled={busy} onClick={apply}>
                Confirm
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
