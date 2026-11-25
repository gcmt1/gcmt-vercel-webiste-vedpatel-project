import React, { useEffect, useState } from "react";
import { useAppContext } from "../AppContext";
import { supabase } from "../supabaseClient";
import { Button, Field, Notice } from "./ui";
import s from "./commerce.module.css";
export default function Reviews({ productId }) {
  const { user } = useAppContext(),
    [rows, setRows] = useState(null),
    [readError, setReadError] = useState(false),
    [editing, edit] = useState(null),
    [rating, setRating] = useState(""),
    [text, setText] = useState(""),
    [message, setMessage] = useState(""),
    [busy, lock] = useState(false),
    [rev, refresh] = useState(0);
  useEffect(() => {
    let active = true;
    setRows(null);
    setReadError(false);
    supabase
      .from("product_reviews")
      .select("*")
      .eq("product_id", productId)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (active) {
          setReadError(!!error);
          setRows(data || []);
        }
      });
    return () => {
      active = false;
    };
  }, [productId, rev]);
  async function save(e) {
    e.preventDefault();
    if (!user || busy) return;
    lock(true);
    try {
      const entry = { rating: Number(rating), review_text: text.trim() };
      if (
        !entry.review_text ||
        !Number.isInteger(entry.rating) ||
        entry.rating < 1 ||
        entry.rating > 5
      )
        throw Error();
      const query = editing
        ? supabase
            .from("product_reviews")
            .update(entry)
            .eq("id", editing)
            .eq("user_id", user.id)
        : supabase
            .from("product_reviews")
            .insert({
              ...entry,
              product_id: productId,
              user_id: user.id,
              user_name: user.user_metadata?.name || "Customer",
            });
      const result = await query.select("id").single();
      if (result.error || !result.data) throw Error();
      edit(null);
      setRating("");
      setText("");
      setMessage("Review saved.");
      refresh((v) => v + 1);
    } catch {
      setMessage("Review could not be saved. Check your rating and text.");
    } finally {
      lock(false);
    }
  }
  async function remove(id) {
    if (!window.confirm("Delete your review?")) return;
    const result = await supabase
      .from("product_reviews")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id")
      .single();
    if (result.error || !result.data) {
      setMessage("Deletion could not be confirmed.");
      return;
    }
    refresh((v) => v + 1);
  }
  return (
    <div className={s.stack}>
      {readError ? (
        <Notice error>
          Reviews unavailable.{" "}
          <Button secondary onClick={() => refresh((v) => v + 1)}>
            Retry
          </Button>
        </Notice>
      ) : !rows ? (
        <Notice>Loading reviews…</Notice>
      ) : rows.length ? (
        rows.map((r) => (
          <article className={s.item} key={r.id}>
            <strong>
              {r.user_name || "Customer"} · {r.rating}/5
            </strong>
            <p>{r.review_text}</p>
            {user?.id === r.user_id && (
              <div className={s.actions}>
                <Button
                  secondary
                  onClick={() => {
                    edit(r.id);
                    setRating(r.rating);
                    setText(r.review_text);
                  }}
                >
                  Edit review
                </Button>
                <Button secondary onClick={() => remove(r.id)}>
                  Delete review
                </Button>
              </div>
            )}
          </article>
        ))
      ) : (
        <p>No reviews yet.</p>
      )}
      {user && (
        <form className={s.form} onSubmit={save}>
          <label>
            Rating{" "}
            <select
              required
              value={rating}
              onChange={(e) => setRating(e.target.value)}
            >
              <option value="">Choose rating</option>
              {[1, 2, 3, 4, 5].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <Field
            label="Your review"
            multiline
            required
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <Button disabled={busy} type="submit">
            {editing ? "Update review" : "Submit review"}
          </Button>
        </form>
      )}
      {message && <Notice>{message}</Notice>}
    </div>
  );
}
