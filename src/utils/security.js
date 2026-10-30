export function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
}
export function csvContent(rows) {
  return (
    "\uFEFF" +
    rows
      .map((row) =>
        row
          .map((value) => {
            let text = String(value ?? "").replace(/\u0000/g, "");
            // Quoting alone does not stop spreadsheet formulas. Prefix inside the quoted cell.
            if (/^[\s\x01-\x1f]*[=+\-@＝＋－＠]/u.test(text))
              text = "\t" + text;
            return '"' + text.replace(/"/g, '""') + '"';
          })
          .join(","),
      )
      .join("\r\n")
  );
}
export function safeReturnPath(value, fallback = "/") {
  if (
    typeof value !== "string" ||
    !/^\/(?!\/)/.test(value) ||
    /[\\\x00-\x1f]/.test(value)
  )
    return fallback;
  return value;
}
