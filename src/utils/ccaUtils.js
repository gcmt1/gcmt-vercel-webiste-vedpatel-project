// utils/ccaUtils.js

export async function getEncryptedOrder(orderData) {
  const response = await fetch('https://your-vercel-project.vercel.app/api/createOrder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData),
  });

  const data = await response.json();
  return data.encRequest;
}
