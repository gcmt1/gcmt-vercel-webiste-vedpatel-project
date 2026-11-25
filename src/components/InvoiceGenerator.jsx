import jsPDF from "jspdf";
import { orderItems, payment, displayDate, amount } from "../shop/orders";
export async function generateInvoicePDF(order) {
  const pdf = new jsPDF();
  let y = 22;
  function print(text, size = 12) {
    pdf.setFontSize(size);
    const lines = pdf.splitTextToSize(
      String(text).replaceAll("₹", "INR "),
      172,
    );
    for (const line of lines) {
      if (y > 273) {
        pdf.addPage();
        y = 22;
      }
      pdf.text(line, 18, y);
      y += size * 0.45 + 2;
    }
    y += 2;
  }
  print("GCMT Herbal", 20);
  print("Invoice · " + order.id, 14);
  print(displayDate(order.created_at));
  print(
    [
      order.user_name,
      order.user_email,
      order.user_phone,
      order.address_line,
      order.city,
      order.state,
      order.postal_code,
    ]
      .filter(Boolean)
      .join(", "),
  );
  orderItems(order).forEach((l) =>
    print(
      [
        l.name,
        l.size,
        "Qty " + l.quantity,
        amount(l.unit_price) + " each",
        amount(l.total_price),
      ]
        .filter(Boolean)
        .join("  |  "),
    ),
  );
  print("Recorded total: " + amount(order.total_amount), 15);
  const pay = payment(order);
  print(pay.method + " · " + pay.status);
  print("Fulfillment: " + (order.order_status || "Unavailable"));
  pdf.save("GCMT-invoice-" + order.id + ".pdf");
}
