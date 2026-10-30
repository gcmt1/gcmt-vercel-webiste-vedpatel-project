import { escapeHtml } from '../utils/security';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import logo from '../assets/GCMT-logo.png'; // Make sure this path is correct and logo is imported

export async function generateInvoicePDF(rawOrder) {
  const order = Object.fromEntries(Object.entries(rawOrder).map(([key,value]) => [key, typeof value === 'string' && key !== 'product_list' ? escapeHtml(value) : value]));
  // Fixing the product list parsing
  const rawProducts = Array.isArray(rawOrder.product_list) ? rawOrder.product_list : JSON.parse(rawOrder.product_list);
  const productList = rawProducts.map(item => Object.fromEntries(Object.entries(item).map(([key,value]) => [key, typeof value === 'string' ? escapeHtml(value) : value])));

  // Calculate totals
  const subtotal = productList.reduce((sum, p) => sum + parseFloat(p.total_price), 0);
  const taxRate = 0; // 18% GST (adjust as needed)
  const taxAmount = subtotal * taxRate;
  const totalAmount = subtotal + taxAmount;

  // Format currency function
  const formatCurrency = (amount) => `₹${parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  // Format date function
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const productTableHTML = `
    <table style="width:100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; border: 1px solid #ccc; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <thead>
        <tr style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
          <th style="padding: 12px; text-align: left; font-weight: 600; border-right: 1px solid rgba(255,255,255,0.2);">Product Name</th>
          <th style="padding: 12px; text-align: center; font-weight: 600; border-right: 1px solid rgba(255,255,255,0.2); width: 80px;">Quantity</th>
          <th style="padding: 12px; text-align: right; font-weight: 600; border-right: 1px solid rgba(255,255,255,0.2); width: 100px;">Unit Price</th>
          <th style="padding: 12px; text-align: right; font-weight: 600; width: 100px;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${productList
          .map(
            (p, index) => `
          <tr style="border-bottom: 1px solid #e9ecef; ${index % 2 === 0 ? 'background-color: #f8f9fa;' : 'background-color: white;'}">
            <td style="padding: 10px 12px; color: #2c3e50; font-weight: 500; border-right: 1px solid #e9ecef;">${p.name}</td>
            <td style="padding: 10px 12px; text-align: center; color: #6c757d; border-right: 1px solid #e9ecef; font-weight: 500;">${p.quantity}</td>
            <td style="padding: 10px 12px; text-align: right; color: #6c757d; border-right: 1px solid #e9ecef;">${formatCurrency(p.unit_price)}</td>
            <td style="padding: 10px 12px; text-align: right; font-weight: 600; color: #2c3e50;">${formatCurrency(p.total_price)}</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>`;

  const summaryHTML = `
    <div style="margin-top: 20px; display: flex; justify-content: flex-end;">
      <div style="border: 2px solid #e9ecef; border-radius: 8px; min-width: 300px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <div style="display: flex; justify-content: space-between; padding: 10px 16px; border-bottom: 1px solid #e9ecef; font-size: 13px;">
          <span style="color: #6c757d; font-weight: 500;">Subtotal:</span>
          <span style="color: #2c3e50; font-weight: 600;">${formatCurrency(subtotal)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 10px 16px; border-bottom: 1px solid #e9ecef; font-size: 13px;">
          <span style="color: #6c757d; font-weight: 500;">Tax:</span>
          <span style="color: #2c3e50; font-weight: 600;">${formatCurrency(taxAmount)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 12px 16px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-size: 16px; font-weight: 700; border-radius: 0 0 6px 6px;">
          <span>Total Amount:</span>
          <span>${formatCurrency(totalAmount)}</span>
        </div>
      </div>
    </div>`;

  // Create the invoice element
  const invoiceElement = document.createElement('div');
  invoiceElement.style.width = '850px';
  invoiceElement.style.backgroundColor = 'white';
  invoiceElement.innerHTML = `
    <div style="padding: 30px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: white; font-size: 13px; line-height: 1.5;">
      
      <!-- Header Section -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #667eea; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 25px; margin: -30px -30px 30px -30px; border-radius: 0;">
        <div style="display: flex; align-items: center;">
          <img src="${logo}" alt="Company Logo" style="height: 140px; width: auto; margin-right: 25px; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.1));"/>
          <div>
            <div style="font-size: 36px; margin: 0; color: #2c3e50; font-weight: 800; letter-spacing: -1px;">INVOICE</div>
            <div style="margin: 8px 0 0 0; color: #6c757d; font-size: 16px; font-weight: 500;">GCMT Shop</div>
            <div style="margin: 4px 0 0 0; color: #6c757d; font-size: 12px;">Professional Invoice System</div>
          </div>
        </div>
        <div style="text-align: right; background: white; border: 2px solid #667eea; padding: 20px; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
          <div style="font-size: 12px; color: #6c757d; margin-bottom: 5px; font-weight: 500;">Invoice Number</div>
          <div style="font-size: 22px; font-weight: 800; color: #2c3e50; margin-bottom: 8px;">#${order.id}</div>
          <div style="font-size: 12px; color: #6c757d; font-weight: 500;">Issue Date</div>
          <div style="font-size: 14px; color: #495057; font-weight: 600;">${formatDate(order.created_at)}</div>
        </div>
      </div>

      <!-- Invoice Details Grid -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 25px;">
        
        <!-- Bill To Section -->
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea;">
          <h3 style="margin: 0 0 15px 0; color: #2c3e50; font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Bill To</h3>
          <div style="color: #2c3e50; font-size: 13px; line-height: 1.6;">
            <div style="font-weight: 700; margin-bottom: 8px; font-size: 15px; color: #495057;">${order.user_name}</div>
            <div style="margin-bottom: 6px; display: flex; align-items: center;">
              <span style="font-weight: 600; color: #6c757d; width: 60px;">Email:</span>
              <span style="color: #495057;">${order.user_email}</span>
            </div>
            <div style="margin-bottom: 6px; display: flex; align-items: center;">
              <span style="font-weight: 600; color: #6c757d; width: 60px;">Phone:</span>
              <span style="color: #495057;">${order.user_phone}</span>
            </div>
            <div style="margin-top: 12px;">
              <div style="font-weight: 600; margin-bottom: 6px; color: #6c757d;">Shipping Address:</div>
              <div style="color: #495057; line-height: 1.4;">
                <div>${order.address_line}</div>
                <div>${order.city}, ${order.state} - ${order.postal_code}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Invoice Info Section -->
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745;">
          <h3 style="margin: 0 0 15px 0; color: #2c3e50; font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Invoice Details</h3>
          <div style="color: #2c3e50; font-size: 13px;">
            <div style="margin-bottom: 8px; display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e9ecef;">
              <span style="font-weight: 600; color: #6c757d;">Date:</span>
              <span style="font-weight: 600; color: #495057;">${formatDate(order.created_at)}</span>
            </div>
            <div style="margin-bottom: 8px; display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e9ecef;">
              <span style="font-weight: 600; color: #6c757d;">Payment ID:</span>
              <span style="font-family: 'Courier New', monospace; font-size: 11px; color: #495057; background: #e9ecef; padding: 2px 6px; border-radius: 3px;">${order.payment_id}</span>
            </div>
            <div style="margin-bottom: 8px; display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e9ecef;">
              <span style="font-weight: 600; color: #6c757d;">Payment Status:</span>
              <span style="font-weight: 700; color: ${order.payment_status === 'completed' ? '#28a745' : '#ffc107'}; text-transform: uppercase; background: ${order.payment_status === 'completed' ? 'rgba(40, 167, 69, 0.1)' : 'rgba(255, 193, 7, 0.1)'}; padding: 3px 8px; border-radius: 12px; font-size: 11px;">${order.payment_status}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 6px 0;">
              <span style="font-weight: 600; color: #6c757d;">Order Status:</span>
              <span style="font-weight: 700; color: ${order.order_status === 'delivered' ? '#28a745' : order.order_status === 'shipped' ? '#007bff' : '#ffc107'}; text-transform: uppercase; background: ${order.order_status === 'delivered' ? 'rgba(40, 167, 69, 0.1)' : order.order_status === 'shipped' ? 'rgba(0, 123, 255, 0.1)' : 'rgba(255, 193, 7, 0.1)'}; padding: 3px 8px; border-radius: 12px; font-size: 11px;">${order.order_status}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Products Section -->
      <div style="margin-bottom: 20px;">
        <h3 style="margin: 0 0 15px 0; color: #2c3e50; font-size: 18px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding-bottom: 8px; border-bottom: 2px solid #667eea;">Ordered Products</h3>
        ${productTableHTML}
      </div>

      <!-- Summary Section -->
      ${summaryHTML}

      <!-- Footer Section -->
      <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e9ecef; text-align: center;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <div style="font-size: 18px; font-weight: 700; margin-bottom: 8px;">GCMT Shop</div>
          <div style="display: flex; justify-content: center; gap: 30px; font-size: 13px;">
            <div>📧 gcmtshop@gmail.com</div>
            <div>📱 +91-6355043113</div>
            <div>🌐 www.gcmtshop.com</div>
          </div>
          <div style="margin-top: 10px; font-size: 11px; opacity: 0.9;">GOLD COIN MULTI-TRADE PRIVATE LIMITED</div>
        </div>
        
        <div style="font-size: 16px; color: #2c3e50; font-weight: 600;">
          Thank you for choosing GCMT Shop! 🙏
        </div>
        <div style="font-size: 12px; color: #6c757d; margin-top: 5px;">
          We appreciate your business and look forward to serving you again.
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(invoiceElement);

  try {
    const canvas = await html2canvas(invoiceElement, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: 850,
      height: invoiceElement.scrollHeight,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    // Scale down if content is too tall for one page
    if (imgHeight > pdfHeight) {
      const scaleFactor = pdfHeight / imgHeight;
      const scaledWidth = imgWidth * scaleFactor;
      const scaledHeight = pdfHeight;
      const xOffset = (pdfWidth - scaledWidth) / 2;
      
      pdf.addImage(imgData, 'PNG', xOffset, 0, scaledWidth, scaledHeight);
    } else {
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    }

    // Save with professional filename
    const fileName = `GCMT_Invoice_${String(rawOrder.id).replace(/[^a-zA-Z0-9_-]/g, '').slice(0,64)}_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);

  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate invoice PDF');
  } finally {
    document.body.removeChild(invoiceElement);
  }
}