import React from 'react';
import {Page} from '../components/ui';
import s from '../styles/editorial.module.css';

const PoliciesPage = () => {
  return (
    <Page narrow><div className={s.policy}>
      <h1>
        Our Policies
      </h1>

      {/* Refund & Cancellation Policy */}
      <section>
        <h2>Refund & Cancellation Policy</h2>
        <p>
          At GCMT Shop, we are committed to providing high-quality herbal wellness products to our customers. Please read our Refund & Cancellation Policy carefully before making a purchase.
        </p>
        <h3>1. Cancellations:</h3>
        <p>We do not accept order cancellations once the order has been placed and confirmed. Kindly ensure that all details are accurate before confirming your purchase.</p>
        <h3>2. Refunds:</h3>
        <p>We regret to inform you that we do not offer refunds on any products sold through our website. Each item is carefully packed and shipped with utmost care to preserve its quality and safety.</p>
        <h3>3. Returns and Replacements:</h3>
        <p>
          While we do not allow returns or refunds, we do offer replacements strictly under the following circumstances:
        </p>
        <ul>
          <li>The product received is incorrect (i.e., different from what was ordered)</li>
          <li>The product is received in a damaged or defective condition</li>
        </ul>
        <p>To initiate a replacement request, please contact our support team within <strong>48 hours of delivery</strong> with:</p>
        <ul>
          <li>Order ID</li>
          <li>Unboxing video or photo of the damaged/incorrect product</li>
          <li>Description of the issue</li>
        </ul>
        <h3>4. Replacement Process Timeline:</h3>
        <p>
          Upon receiving your replacement request, our support team will evaluate the claim. If approved, a replacement will be dispatched within <strong>5–7 business days</strong>, subject to product availability.
        </p>
      </section>

      {/* Terms & Conditions */}
      <section>
        <h2>Terms & Conditions</h2>
        <p>
          {/* Insert your custom Terms & Conditions here */}
        </p>
      </section>

      {/* Privacy Policy */}
      <section>
        <h2>Privacy Policy</h2>
        <p>GCMT Shop is committed to protecting your privacy. This policy outlines how we collect, use, and protect your personal information.</p>
        <h3>1. Information We Collect:</h3>
        <ul>
          <li>Full name</li>
          <li>Address</li>
          <li>Phone number</li>
          <li>Email address</li>
          <li>Order and transaction history</li>
        </ul>
        <h3>2. Purpose of Collection:</h3>
        <ul>
          <li>Processing and fulfilling your orders</li>
          <li>Ensuring successful delivery through our courier partners</li>
          <li>Providing customer support and service updates</li>
          <li>Marketing and promotional activities aimed at improving your experience</li>
        </ul>
        <h3>3. Data Sharing:</h3>
        <p>We do not sell or rent your personal information to third parties. Your data may only be shared with our logistics partners and third-party service providers involved in delivering the purchased products and services.</p>
        <h3>4. Analytics & Cookies:</h3>
        <p>While we do not currently use cookies or analytics tools, we may use tools like Google Analytics in the future to analyze website traffic and improve our service.</p>
        <h3>5. Data Protection:</h3>
        <p>We implement industry-standard security measures to safeguard your data from unauthorized access or misuse.</p>
        <h3>6. Your Rights:</h3>
        <p>You may contact us at any time to update, correct, or delete your personal information from our database.</p>
      </section>

      {/* Delivery & Shipping Policy */}
      <section>
        <h2>Delivery & Shipping Policy</h2>
        <p>GCMT Shop is dedicated to ensuring timely and secure delivery of all orders across India. Please review our shipping policies below.</p>
        <h3>1. Serviceable Locations:</h3>
        <p>We currently ship our products across all major regions and cities within India. We do not offer international shipping at this time.</p>
        <h3>2. Delivery Partner:</h3>
        <p>We use <strong>Delhivery</strong>, one of India’s most trusted logistics providers, to deliver all orders.</p>
        <h3>3. Shipping Timeframe:</h3>
        <ul>
          <li><strong>Metro Cities:</strong> 3–5 business days</li>
          <li><strong>Tier 2/3 Cities and Rural Areas:</strong> 5–9 business days</li>
        </ul>
        <h3>4. Order Processing Time:</h3>
        <p>All orders are processed within <strong>1–2 business days</strong> from the time of order confirmation. Orders placed on weekends or public holidays will be processed on the next working day.</p>
        <h3>5. Shipping Charges:</h3>
        <p>Any applicable shipping charges will be clearly mentioned at checkout before payment. We strive to keep shipping costs minimal.</p>
        <h3>6. Delivery Delays:</h3>
        <p>While we aim for timely delivery, unforeseen circumstances (e.g., natural disasters, strikes, courier delays) may occasionally cause delays. GCMT Shop is not liable for such delays.</p>
        <h3>7. Product Inspection:</h3>
        <p>We ensure all products are packed securely. If you receive a damaged or incorrect item, please report it within <strong>48 hours of delivery</strong> for a replacement.</p>
        <h3>8. Delivery Confirmation:</h3>
        <p>Once an order is shipped, you will receive tracking details. It is the customer’s responsibility to ensure someone is available to receive the package at the provided address.</p>
      </section>

      {/* Footer */}
      <div>
        &copy; {new Date().getFullYear()} Gold Coin Multitrade Pvt. Ltd. All rights reserved.
      </div>
    </div></Page>
  );
};

export default PoliciesPage;
