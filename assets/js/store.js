/**
 * ZyLogix Storefront Application Controller
 * Handles catalog filtering, search, dynamic product spec modal, cart drawer,
 * coupon validation, checkout with WhatsApp order dispatch, and user portal.
 */

class ZyLogixStore {
  constructor() {
    this.products = [];
    this.categories = [];
    this.brands = [];
    this.cart = [];
    this.activeCategory = 'all';
    this.searchQuery = '';
    this.appliedCoupon = null;

    this.init();
  }

  async init() {
    await this.loadData();
    this.loadCartFromStorage();
    this.renderCategories();
    this.renderProducts();
    this.updateCartUI();
    this.setupEventListeners();
    this.setupUrlRouting();
  }

  async loadData() {
    this.products = await window.ZyLogixDB.getProducts();
    this.categories = await window.ZyLogixDB.getCategories();
    this.brands = await window.ZyLogixDB.getBrands();
  }

  // --- CATALOG RENDERING & FILTERING ---
  renderCategories() {
    const container = document.getElementById("categoryPills");
    if (!container) return;

    let html = `<button class="pill ${this.activeCategory === 'all' ? 'active' : ''}" data-cat="all">⚡ Todos los productos</button>`;
    this.categories.forEach(cat => {
      html += `<button class="pill ${this.activeCategory === cat.id ? 'active' : ''}" data-cat="${cat.id}">${cat.icon || '🏷️'} ${cat.name}</button>`;
    });

    container.innerHTML = html;

    container.querySelectorAll(".pill").forEach(btn => {
      btn.addEventListener("click", () => {
        this.activeCategory = btn.dataset.cat;
        container.querySelectorAll(".pill").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.renderProducts();
      });
    });
  }

  renderProducts() {
    const grid = document.getElementById("productGrid");
    if (!grid) return;

    let filtered = this.products.filter(p => p.status !== 'inactive');

    // Category Filter
    if (this.activeCategory !== 'all') {
      const selectedCatObj = this.categories.find(c => c.id === this.activeCategory || c.slug === this.activeCategory);
      filtered = filtered.filter(p => 
        p.categoryId === this.activeCategory || 
        (selectedCatObj && (p.categoryId === selectedCatObj.id || (p.categoryName && p.categoryName.toLowerCase() === selectedCatObj.name.toLowerCase())))
      );
    }

    // Search Query Filter
    if (this.searchQuery.trim() !== '') {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(q) || 
        p.shortDescription.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.brandName && p.brandName.toLowerCase().includes(q))
      );
    }

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; color: var(--text-muted);">
          <div style="font-size: 3rem; margin-bottom: 1rem;">🔍</div>
          <h3>No se encontraron productos</h3>
          <p>Intenta ajustar tus filtros de búsqueda.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map(p => {
      const stockInfo = getStockStatus(p.stock, p.minStock, p.status);
      const primaryImg = p.images && p.images.length > 0 ? p.images[0] : 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800';

      return `
        <div class="product-card" data-id="${p.id}">
          <div class="product-badge-group">
            ${p.isOffer && p.discountPercentage > 0 ? `<span class="badge-discount">-${p.discountPercentage}% OFERTA</span>` : ''}
            ${p.isFeatured ? `<span class="badge" style="background: rgba(255, 215, 0, 0.2); color: #ffd700; border: 1px solid #ffd700;">⭐ DESTACADO</span>` : ''}
            <span class="badge ${stockInfo.class}">${stockInfo.icon} ${stockInfo.label}</span>
          </div>

          <div class="product-image-box" onclick="window.zyStore.openProductModal('${p.id}')">
            <img src="${primaryImg}" alt="${p.name}" loading="lazy">
          </div>

          <div class="product-content">
            <span class="product-category">${p.brandName || 'ZyLogix'} • ${p.categoryName || ''}</span>
            <h3 class="product-title" onclick="window.zyStore.openProductModal('${p.id}')">${p.name}</h3>
            <p class="product-description">${p.shortDescription}</p>

            <div class="product-footer">
              <div class="price-box">
                <span class="price-current">${formatCurrency(p.price)}</span>
                ${p.oldPrice ? `<span class="price-old">${formatCurrency(p.oldPrice)}</span>` : ''}
              </div>

              <button class="btn-primary" ${p.stock <= 0 ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''} onclick="window.zyStore.addToCart('${p.id}')">
                ${p.stock <= 0 ? 'Agotado' : '🛒 Agregar'}
              </button>
            </div>
          </div>
        </div>
      `;
    }).join("");
  }

  // --- DYNAMIC PRODUCT SPECIFICATION MODAL ---
  openProductModal(productId) {
    const product = this.products.find(p => p.id === productId);
    if (!product) return;

    const modal = document.getElementById("productModal");
    const stockInfo = getStockStatus(product.stock, product.minStock, product.status);
    const primaryImg = product.images && product.images.length > 0 ? product.images[0] : '';

    // Auto-generate Specs Table rows
    let specsHtml = '';
    if (product.features && product.features.length > 0) {
      specsHtml = `
        <h4 style="margin-top: 1.5rem; color: var(--accent-green);">📋 Ficha Técnica Especificaciones:</h4>
        <table class="specs-table">
          <tbody>
            ${product.features.map(f => `<tr><th>${f.name}</th><td>${f.value}</td></tr>`).join("")}
          </tbody>
        </table>
      `;
    }

    modal.querySelector(".modal-container").innerHTML = `
      <button class="modal-close" onclick="window.zyStore.closeModal('productModal')">✕</button>
      <div class="product-detail-grid">
        <div>
          <img src="${primaryImg}" class="product-detail-img" alt="${product.name}">
        </div>

        <div>
          <span class="badge ${stockInfo.class}" style="margin-bottom: 0.75rem;">${stockInfo.icon} ${stockInfo.label} (Stock: ${product.stock})</span>
          <h2 style="font-size: 1.6rem; font-weight: 800; margin-bottom: 0.5rem;">${product.name}</h2>
          <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1rem;">SKU: <span style="font-family: var(--font-mono); color: var(--text-main);">${product.sku}</span></p>

          <div class="price-box" style="margin-bottom: 1.25rem;">
            <span class="price-current" style="font-size: 1.8rem; color: var(--accent-green);">${formatCurrency(product.price)}</span>
            ${product.oldPrice ? `<span class="price-old" style="font-size: 1rem;">Precio anterior: ${formatCurrency(product.oldPrice)}</span>` : ''}
          </div>

          <p style="margin-bottom: 1.5rem; font-size: 0.95rem; line-height: 1.6;">${product.fullDescription || product.shortDescription}</p>

          <div style="display: flex; gap: 1rem; align-items: center;">
            <button class="btn-primary" style="flex: 1; padding: 1rem;" ${product.stock <= 0 ? 'disabled style="opacity:0.5;"' : ''} onclick="window.zyStore.addToCart('${product.id}'); window.zyStore.closeModal('productModal');">
              🛒 Agregar al Carrito
            </button>
          </div>

          ${specsHtml}
        </div>
      </div>
    `;

    modal.classList.add("open");
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove("open");
  }

  // --- CART DRAWER & MANAGEMENT ---
  addToCart(productId, qty = 1) {
    const product = this.products.find(p => p.id === productId);
    if (!product || product.stock <= 0) {
      this.showToast("⚠️ Producto agotado en este momento", "error");
      return;
    }

    const existingIndex = this.cart.findIndex(item => item.productId === productId);
    if (existingIndex !== -1) {
      if (this.cart[existingIndex].quantity + qty > product.stock) {
        this.showToast(`⚠️ No hay suficiente stock (Máx. ${product.stock})`, "warning");
        return;
      }
      this.cart[existingIndex].quantity += qty;
    } else {
      this.cart.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        image: product.images[0] || '',
        quantity: qty,
        maxStock: product.stock
      });
    }

    this.saveCartToStorage();
    this.updateCartUI();
    this.showToast(`✅ "${product.name}" agregado al carrito`);
    this.toggleCartDrawer(true);
  }

  updateQuantity(productId, delta) {
    const index = this.cart.findIndex(item => item.productId === productId);
    if (index !== -1) {
      const newQty = this.cart[index].quantity + delta;
      if (newQty <= 0) {
        this.cart.splice(index, 1);
      } else if (newQty <= this.cart[index].maxStock) {
        this.cart[index].quantity = newQty;
      } else {
        this.showToast(`⚠️ Stock máximo alcanzado (${this.cart[index].maxStock})`, "warning");
      }
      this.saveCartToStorage();
      this.updateCartUI();
    }
  }

  updateCartUI() {
    // Header cart badge
    const badge = document.getElementById("cartBadge");
    const totalItems = this.cart.reduce((sum, item) => sum + item.quantity, 0);
    if (badge) badge.textContent = totalItems;

    // Cart Drawer Body
    const container = document.getElementById("cartDrawerBody");
    if (!container) return;

    if (this.cart.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
          <div style="font-size: 3rem; margin-bottom: 1rem;">🛒</div>
          <p>Tu carrito está vacío</p>
        </div>
      `;
    } else {
      container.innerHTML = this.cart.map(item => `
        <div class="cart-item">
          <img src="${item.image}" class="cart-item-img" alt="${item.name}">
          <div class="cart-item-info">
            <h4 class="cart-item-title">${item.name}</h4>
            <span class="cart-item-price">${formatCurrency(item.price)}</span>
            <div class="cart-item-qty">
              <button class="btn-qty" onclick="window.zyStore.updateQuantity('${item.productId}', -1)">-</button>
              <span style="font-weight: 700; font-family: var(--font-mono);">${item.quantity}</span>
              <button class="btn-qty" onclick="window.zyStore.updateQuantity('${item.productId}', 1)">+</button>
            </div>
          </div>
        </div>
      `).join("");
    }

    // Totals Calculation
    const subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    let discountAmount = 0;

    if (this.appliedCoupon) {
      if (this.appliedCoupon.discountPercentage) {
        discountAmount = Math.round((subtotal * this.appliedCoupon.discountPercentage) / 100);
      }
    }

    const shippingCost = subtotal > ZYLOGIX_CONFIG.freeShippingThreshold || subtotal === 0 ? 0 : ZYLOGIX_CONFIG.defaultShippingCost;
    const total = Math.max(0, subtotal - discountAmount + shippingCost);

    const subtotalEl = document.getElementById("cartSubtotal");
    const discountEl = document.getElementById("cartDiscount");
    const shippingEl = document.getElementById("cartShipping");
    const totalEl = document.getElementById("cartTotal");

    if (subtotalEl) subtotalEl.textContent = formatCurrency(subtotal);
    if (discountEl) discountEl.textContent = `-${formatCurrency(discountAmount)}`;
    if (shippingEl) shippingEl.textContent = shippingCost === 0 ? 'GRATIS' : formatCurrency(shippingCost);
    if (totalEl) totalEl.textContent = formatCurrency(total);
  }

  async applyCouponCode(code) {
    if (!code || code.trim() === '') return;
    const cleanCode = code.trim().toUpperCase();
    const coupons = await window.ZyLogixDB.getCoupons();

    const coupon = coupons.find(c => c.code === cleanCode && c.isActive);
    if (!coupon) {
      this.showToast("❌ Cupón inválido o expirado", "error");
      return;
    }

    const subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    if (subtotal < coupon.minPurchase) {
      this.showToast(`⚠️ Requiere una compra mínima de ${formatCurrency(coupon.minPurchase)}`, "warning");
      return;
    }

    this.appliedCoupon = coupon;
    this.updateCartUI();
    this.showToast(`🎉 ¡Cupón ${coupon.code} aplicado con éxito (-${coupon.discountPercentage}%)!`);
  }

  toggleCartDrawer(open) {
    const drawer = document.getElementById("cartDrawerOverlay");
    if (drawer) {
      if (open) drawer.classList.add("open");
      else drawer.classList.remove("open");
    }
  }

  saveCartToStorage() {
    localStorage.setItem("zylogix_cart", JSON.stringify(this.cart));
  }

  loadCartFromStorage() {
    try {
      const data = localStorage.getItem("zylogix_cart");
      if (data) this.cart = JSON.parse(data);
    } catch (e) {
      this.cart = [];
    }
  }

  // --- CHECKOUT & WHATSAPP DIRECT DISPATCH ---
  openCheckoutModal() {
    if (this.cart.length === 0) {
      this.showToast("⚠️ Agrega productos al carrito antes de finalizar la compra", "warning");
      return;
    }

    this.toggleCartDrawer(false);
    const modal = document.getElementById("checkoutModal");
    if (modal) modal.classList.add("open");
  }

  async submitOrder(formData) {
    const subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    let discountAmount = 0;
    if (this.appliedCoupon) {
      discountAmount = Math.round((subtotal * this.appliedCoupon.discountPercentage) / 100);
    }
    const shippingCost = subtotal > ZYLOGIX_CONFIG.freeShippingThreshold ? 0 : ZYLOGIX_CONFIG.defaultShippingCost;
    const total = Math.max(0, subtotal - discountAmount + shippingCost);

    const orderPayload = {
      customerName: formData.customerName,
      customerPhone: formData.customerPhone,
      shippingAddress: formData.shippingAddress,
      city: formData.city || 'Asunción',
      notes: formData.notes || '',
      subtotal: subtotal,
      shippingCost: shippingCost,
      discountAmount: discountAmount,
      couponCode: this.appliedCoupon ? this.appliedCoupon.code : null,
      total: total,
      paymentMethod: formData.paymentMethod || 'WhatsApp Directo',
      items: this.cart.map(item => ({
        productId: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        subtotal: item.price * item.quantity
      }))
    };

    // Save to Database & Local log
    const savedOrder = await window.ZyLogixDB.saveOrder(orderPayload);

    // Build WhatsApp Message Link
    const waUrl = buildWhatsAppOrderMessage(savedOrder);

    // Clear Cart
    this.cart = [];
    this.appliedCoupon = null;
    this.saveCartToStorage();
    this.updateCartUI();

    this.closeModal("checkoutModal");
    this.showToast("🚀 ¡Pedido registrado! Redirigiendo a WhatsApp...");

    // Open WhatsApp after brief delay
    setTimeout(() => {
      window.open(waUrl, "_blank");
    }, 800);
  }

  // --- TOAST NOTIFICATIONS ---
  showToast(message, type = "success") {
    let container = document.getElementById("toastContainer");
    if (!container) {
      container = document.createElement("div");
      container.id = "toastContainer";
      container.className = "toast-container";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3500);
  }

  setupEventListeners() {
    // Search input event
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.searchQuery = e.target.value;
        this.renderProducts();
      });
    }

    // Coupon button
    const btnCoupon = document.getElementById("btnApplyCoupon");
    if (btnCoupon) {
      btnCoupon.addEventListener("click", () => {
        const input = document.getElementById("couponInput");
        if (input) this.applyCouponCode(input.value);
      });
    }

    // Mobile Hamburger Menu toggle
    const btnMobile = document.getElementById("btnMobileNav");
    const mobileMenu = document.getElementById("mobileNavMenu");
    if (btnMobile && mobileMenu) {
      btnMobile.addEventListener("click", () => {
        mobileMenu.classList.toggle("open");
      });
    }
  }

  setupUrlRouting() {
    // Smooth navigation support
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.zyStore = new ZyLogixStore();
});
