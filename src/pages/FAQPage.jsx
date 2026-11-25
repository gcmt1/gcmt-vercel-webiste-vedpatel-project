import { Link } from "react-router-dom";
import { Page } from "../components/ui";
import s from "../styles/editorial.module.css";
export default function FAQ() {
  return (
    <Page>
      <div className={s.help}>
        <h1>Shopping help</h1>
        <div className={s.questions}>
          <details open>
            <summary>Where does GCMT deliver?</summary>
            <p>
              GCMT ships within India.{" "}
              <Link to="/terms-and-conditions">Read the delivery policy</Link> for
              regional estimates.
            </p>
          </details>
          <details>
            <summary>Where can I check my payment?</summary>
            <p>
              Open <Link to="/your-orders">Your orders</Link> in the session you
              used to purchase. Contact support if the payment is unresolved.
            </p>
          </details>
          <details>
            <summary>What if the wrong or damaged item arrives?</summary>
            <p>
              The replacement policy asks you to contact GCMT within 48 hours of
              delivery with the order ID and supporting photo or video.
            </p>
          </details>
          <details>
            <summary>How can I track my order?</summary>
            <p>
              Open <Link to="/your-orders">Your orders</Link> to see fulfillment
              updates and the tracking number when one is recorded. If you
              received a shipping email, follow the tracking link there.
            </p>
          </details>
          <details>
            <summary>Where can I find ingredients and directions?</summary>
            <p>
              Each <Link to="/products">product page</Link> lists the ingredients
              and usage instructions supplied for that pack.
            </p>
          </details>
          <Link to="/contact">Contact GCMT</Link>
        </div>
      </div>
    </Page>
  );
}
