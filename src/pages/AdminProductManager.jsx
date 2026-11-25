import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { photos, pricePaise, money } from "../shop/catalog";
import { useRecords } from "../shop/useRecords";
import { Button, Dialog, Field, Notice } from "../components/ui";
import { removeRecords } from "../admin/records";
import s from "../admin/admin.module.css";
import c from "../components/commerce.module.css";
const fields = [
  ["product_name", "Product name"],
  ["product_price", "Price (INR)"],
  ["product_discount", "Discount (%)"],
  ["size", "Pack sizes (comma separated)"],
  ["product_sub_description", "Short description"],
  ["product_description", "Description"],
  ["key_benefits", "Key benefits"],
  ["why_choose_product", "Why choose this product"],
  ["ingredients_heading", "Ingredients heading"],
  ["ingredients_subheading", "Ingredients subheading"],
  ["ingredients_description", "Ingredients description"],
  ["ingredients_name", "Ingredient names"],
  ["percentage", "Ingredient percentages"],
  ["how_to_use_heading", "Directions heading"],
  ["how_to_use_description", "Directions"],
  ["pro_tips", "Usage tips"],
];
function Editor({ item, onClose, onSaved }) {
  const [draft, setDraft] = useState({}),
    [pending, setPending] = useState(false),
    [message, setMessage] = useState("");
  function close() {
    if (
      !pending &&
      (!Object.keys(draft).length ||
        window.confirm("Discard unsaved product changes?"))
    )
      onClose();
  }
  async function save(e) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setMessage("");
    try {
      const changes = {};
      for (const [key] of fields) {
        if (!(key in draft)) continue;
        let v = draft[key].trim();
        if (["product_price", "product_discount"].includes(key))
          v = v === "" ? null : Number(v);
        else if (!v) v = null;
        if (String(item[key] ?? "") !== String(v ?? "")) changes[key] = v;
      }
      if ("product_image" in draft) changes.product_image = draft.product_image;
      if (!Object.keys(changes).length) {
        onClose();
        return;
      }
      const next = { ...item, ...changes };
      if (
        !next.product_name?.trim() ||
        Number(next.product_price) <= 0 ||
        pricePaise(next) == null
      )
        throw Error("Enter a name, positive price and valid discount.");
      let q;
      if (item.id) {
        q = supabase.from("products").update(changes).eq("id", item.id);
        for (const key of Object.keys(changes)) {
          q = item[key] == null ? q.is(key, null) : q.eq(key, item[key]);
        }
      } else q = supabase.from("products").insert(changes);
      const { data, error } = await q.select("id").single();
      if (error || !data)
        throw Error(
          "Save could not be confirmed. Keep your changes and check whether the record changed.",
        );
      onSaved();
    } catch (e) {
      setMessage(e.message);
    } finally {
      setPending(false);
    }
  }
  async function append(files) {
    if (!files.length) return;
    setPending(true);
    setMessage("");
    let urls = draft.product_image ?? item.product_image ?? "";
    try {
      for (const file of files) {
        if (
          !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
          file.size > 5 * 1024 * 1024
        )
          throw Error("Use JPEG, PNG or WebP under 5 MB.");
        const ext = {
            "image/jpeg": "jpg",
            "image/png": "png",
            "image/webp": "webp",
          }[file.type],
          bucket = supabase.storage.from("product-image"),
          key = crypto.randomUUID() + "." + ext;
        const { error } = await bucket.upload(key, file, { upsert: false });
        if (error)
          throw Error("Upload failed. Previously staged photos are preserved.");
        urls = [urls, bucket.getPublicUrl(key).data.publicUrl]
          .filter(Boolean)
          .join(",");
        const staged = urls;
        setDraft((old) => ({ ...old, product_image: staged }));
      }
    } catch (e) {
      setMessage(e.message);
    } finally {
      setPending(false);
    }
  }
  return (
    <Dialog title={item.id ? "Edit product" : "New product"} onClose={close}>
      <form onSubmit={save} className={s.form}>
        <fieldset disabled={pending} className={s.form}>
          {fields.map(([k, label]) => (
            <Field
              key={k}
              label={label}
              value={draft[k] ?? item[k] ?? ""}
              required={[
                "product_name",
                "product_price",
                "product_description",
                "product_sub_description",
              ].includes(k)}
              multiline={k.includes("description")}
              type={
                k === "product_price" || k === "product_discount"
                  ? "number"
                  : undefined
              }
              min={k === "product_price" ? 0.01 : 0}
              max={k === "product_discount" ? 100 : undefined}
              step=".01"
              onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
            />
          ))}
          <div className={s.thumbs}>
            {photos({
              ...item,
              product_image: draft.product_image ?? item.product_image,
            }).map((url, i) => (
              <div key={url + i}>
                <img
                  src={url}
                  alt={"Catalog photo " + (i + 1)}
                  loading="lazy"
                />
                <Button
                  secondary
                  aria-label={"Remove photo " + (i + 1)}
                  onClick={() => {
                    const urls = (
                      draft.product_image ??
                      item.product_image ??
                      ""
                    )
                      .split(",")
                      .map((v) => v.trim())
                      .filter(Boolean);
                    setDraft({
                      ...draft,
                      product_image: urls
                        .filter((_, index) => index !== i)
                        .join(","),
                    });
                  }}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
          <Field
            label="Append new photos"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(e) => append([...e.target.files])}
          />
        </fieldset>
        {message && <Notice error>{message}</Notice>}
        <Button disabled={pending} type="submit">
          {pending ? "Saving…" : "Save product"}
        </Button>
      </form>
    </Dialog>
  );
}
export default function CatalogManager() {
  const { data, error, refresh } = useRecords("products"),
    [q, search] = useState(""),
    [editor, edit] = useState(null),
    [deleting, del] = useState(null),
    [busy, lock] = useState(false),
    [message, notify] = useState("");
  const list = (data || []).filter((p) =>
    [p.product_name, p.product_sub_description]
      .join(" ")
      .toLowerCase()
      .includes(q.trim().toLowerCase()),
  );
  async function remove() {
    lock(true);
    try {
      await removeRecords("products", [deleting.id]);
      notify("Product deleted.");
    } catch (e) {
      notify(e.message);
    } finally {
      del(null);
      lock(false);
      refresh();
    }
  }
  return (
    <div className={c.stack}>
      <div className={c.header}>
        <h1>Products</h1>
        <Button onClick={() => edit({})}>New product</Button>
      </div>
      <div className={s.tools}>
        <Field
          label="Search products"
          type="search"
          value={q}
          onChange={(e) => search(e.target.value)}
        />
        <Button secondary onClick={refresh}>
          Refresh
        </Button>
      </div>
      {message && <Notice>{message}</Notice>}
      {error ? (
        <Notice error>Products could not be loaded.</Notice>
      ) : !data ? (
        <Notice>Loading products…</Notice>
      ) : list.length ? (
        list.map((p) => (
          <article key={p.id} className={s.line}>
            {photos(p)[0] && <img src={photos(p)[0]} alt="" />}
            <div className={s.info}>
              <strong>{p.product_name}</strong>
              <p>
                {p.size} · {money(pricePaise(p))}
              </p>
            </div>
            <Button secondary onClick={() => edit(p)}>
              Edit
            </Button>
            <Button secondary onClick={() => del(p)}>
              Delete
            </Button>
          </article>
        ))
      ) : (
        <Notice>No matching products.</Notice>
      )}
      {editor && (
        <Editor
          item={editor}
          onClose={() => edit(null)}
          onSaved={() => {
            edit(null);
            notify("Product saved.");
            refresh();
          }}
        />
      )}
      {deleting && (
        <Dialog
          title="Delete product?"
          onClose={() => {
            if (!busy) del(null);
          }}
        >
          <p>{deleting.product_name} will be removed from the catalog.</p>
          <div className={c.actions}>
            <Button secondary onClick={() => del(null)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={remove} disabled={busy}>
              Confirm deletion
            </Button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
