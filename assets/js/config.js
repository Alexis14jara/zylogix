/**
 * ZyLogix — Config & Global Constants
 * Concept: "ZyLogix — tecnología y productos, simple y confiable."
 */

const ZYLOGIX_CONFIG = {
  storeName: "ZyLogix",
  tagline: "tecnología y productos, simple y confiable.",
  currencySymbol: "₲",
  currencyCode: "PYG",
  whatsappNumber: "595983092018", // Format without '+' for WhatsApp API link
  whatsappFormatted: "+595 983 092 018",
  defaultShippingCost: 20000,
  freeShippingThreshold: 500000,
  
  // Supabase Configuration Keys (Can be updated dynamically via UI Admin Settings)
  supabaseUrl: localStorage.getItem("zylogix_supabase_url") || "",
  supabaseAnonKey: localStorage.getItem("zylogix_supabase_key") || ""
};

/**
 * Currency Formatter for Paraguayan Guaraní (₲)
 * e.g. 420000 -> ₲420.000
 */
function formatCurrency(amount) {
  const numeric = Math.round(Number(amount) || 0);
  return ZYLOGIX_CONFIG.currencySymbol + " " + numeric.toLocaleString("es-PY");
}

/**
 * Stock Status Helper
 * Returns badge label, class, and icon
 */
function getStockStatus(stock, minStock = 5, status = 'active') {
  if (status === 'discontinued') {
    return { label: 'Descontinuado', class: 'status-discontinued', icon: '⚫', color: '#64748b' };
  }
  if (stock <= 0) {
    return { label: 'Agotado', class: 'status-out-of-stock', icon: '🔴', color: '#ef4444' };
  }
  if (stock <= minStock) {
    return { label: 'Últimas unidades', class: 'status-low-stock', icon: '🟡', color: '#f59e0b' };
  }
  return { label: 'En stock', class: 'status-in-stock', icon: '🟢', color: '#00e676' };
}

/**
 * WhatsApp Order Builder
 */
function buildWhatsAppOrderMessage(orderData) {
  let text = `*¡NUEVO PEDIDO ZYLOGIX!* 🚀\n`;
  text += `-----------------------------------\n`;
  text += `📌 *Pedido #${orderData.orderNumber || 'PENDING'}*\n`;
  text += `👤 *Cliente:* ${orderData.customerName}\n`;
  text += `📞 *Teléfono:* ${orderData.customerPhone}\n`;
  text += `📍 *Dirección:* ${orderData.shippingAddress} (${orderData.city || 'Asunción'})\n`;
  if (orderData.notes) text += `📝 *Notas:* ${orderData.notes}\n`;
  text += `-----------------------------------\n`;
  text += `📦 *PRODUCTOS:*\n`;
  
  orderData.items.forEach(item => {
    text += `• ${item.quantity} × ${item.name} (${formatCurrency(item.price)})\n`;
  });
  
  text += `-----------------------------------\n`;
  text += `Subtotal: ${formatCurrency(orderData.subtotal)}\n`;
  if (orderData.discountAmount > 0) {
    text += `Cupón (${orderData.couponCode}): -${formatCurrency(orderData.discountAmount)}\n`;
  }
  text += `Envío: ${formatCurrency(orderData.shippingCost)}\n`;
  text += `*TOTAL A PAGAR: ${formatCurrency(orderData.total)}*\n`;
  text += `-----------------------------------\n`;
  text += `💳 *Método de Pago:* ${orderData.paymentMethod || 'Efectivo / Transferencia'}\n\n`;
  text += `_Enviado desde ZyLogix E-Commerce_`;

  return `https://wa.me/${ZYLOGIX_CONFIG.whatsappNumber}?text=${encodeURIComponent(text)}`;
}

window.ZYLOGIX_CONFIG = ZYLOGIX_CONFIG;
window.formatCurrency = formatCurrency;
window.getStockStatus = getStockStatus;
window.buildWhatsAppOrderMessage = buildWhatsAppOrderMessage;
