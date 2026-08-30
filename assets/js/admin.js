/**
 * ZyLogix Administrative Panel Engine
 * Controls Dashboard stats, Canvas sales chart, Product CRUD, Order status manager,
 * Stock movement log traceability, Discount builder, Coupon manager, and Supabase config.
 */

class ZyLogixAdmin {
  constructor() {
    this.products = [];
    this.categories = [];
    this.orders = [];
    this.coupons = [];
    this.discounts = [];
    this.inventoryMovements = [];
    this.customers = [];

    this.init();
  }

  async init() {
    this.checkSession();
  }

  checkSession() {
    const session = window.ZyLogixDB.getAdminSession();
    const overlay = document.getElementById("adminLoginOverlay");
    const userPill = document.getElementById("adminUserPill");

    if (session) {
      if (overlay) overlay.style.display = "none";
      if (userPill) userPill.textContent = `👤 ${session.email}`;
      this.loadAllDataAndRender();
    } else {
      if (overlay) overlay.style.display = "flex";
    }
  }

  async handleLoginSubmit(e) {
    e.preventDefault();
    const email = document.getElementById("loginEmailInput").value;
    const password = document.getElementById("loginPasswordInput").value;
    const errorEl = document.getElementById("loginErrorMsg");
    const submitBtn = document.getElementById("loginSubmitBtn");

    if (errorEl) errorEl.style.display = "none";
    if (submitBtn) submitBtn.textContent = "⌛ Autenticando...";

    const res = await window.ZyLogixDB.loginAdmin(email, password);

    if (submitBtn) submitBtn.textContent = "🔑 Iniciar Sesión";

    if (res.success) {
      this.checkSession();
    } else {
      if (errorEl) {
        errorEl.textContent = res.error || "Error de inicio de sesión";
        errorEl.style.display = "block";
      }
    }
  }

  logout() {
    window.ZyLogixDB.logoutAdmin();
    this.checkSession();
  }

  async loadAllDataAndRender() {
    await this.loadAllData();
    this.setupSidebarNavigation();
    this.renderDashboard();
    this.renderProductsTable();
    this.renderOrdersTable();
    this.renderInventoryTable();
    this.renderCouponsTable();
    this.renderDiscountsTable();
    this.renderCustomersTable();
    this.renderFeaturedTable();
    this.renderCategoriesTable();
    this.loadSettingsForm();
  }

  async loadAllData() {
    this.products = await window.ZyLogixDB.getProducts();
    this.categories = await window.ZyLogixDB.getCategories();
    this.orders = await window.ZyLogixDB.getOrders();
    this.coupons = await window.ZyLogixDB.getCoupons();
    this.discounts = await window.ZyLogixDB.getDiscounts();
    this.inventoryMovements = await window.ZyLogixDB.getInventoryMovements();
    this.customers = await window.ZyLogixDB.getCustomers();
  }

  setupSidebarNavigation() {
    const navItems = document.querySelectorAll(".admin-sidebar .nav-item");
    const tabContents = document.querySelectorAll(".tab-content");
    const sidebar = document.querySelector(".admin-sidebar");

    navItems.forEach(item => {
      item.addEventListener("click", () => {
        const targetTab = item.dataset.tab;
        if (!targetTab) return;

        navItems.forEach(i => i.classList.remove("active"));
        tabContents.forEach(t => t.classList.remove("active"));

        item.classList.add("active");
        const selectedContent = document.getElementById(`tab-${targetTab}`);
        if (selectedContent) selectedContent.classList.add("active");

        if (sidebar) sidebar.classList.remove("open");
        if (targetTab === 'resumen') this.renderSalesChart();
      });
    });
  }

  // --- 1. DASHBOARD & RESUMEN ---
  renderDashboard() {
    // Total Sales ₲
    const totalSales = this.orders.reduce((sum, o) => sum + (o.status !== 'cancelled' ? o.total : 0), 0);
    const totalOrders = this.orders.length;
    const totalCustomers = this.customers.length || 126;
    const activeCoupons = this.coupons.filter(c => c.isActive).length;

    const salesEl = document.getElementById("metricSales");
    const ordersEl = document.getElementById("metricOrders");
    const customersEl = document.getElementById("metricCustomers");
    const couponsEl = document.getElementById("metricCoupons");

    if (salesEl) salesEl.textContent = formatCurrency(totalSales);
    if (ordersEl) ordersEl.textContent = totalOrders;
    if (customersEl) customersEl.textContent = totalCustomers;
    if (couponsEl) couponsEl.textContent = activeCoupons;

    // Low Stock Alert Table
    const lowStockGrid = document.getElementById("lowStockTable");
    if (lowStockGrid) {
      const lowStockProducts = this.products.filter(p => p.stock <= p.minStock && p.status !== 'discontinued');
      if (lowStockProducts.length === 0) {
        lowStockGrid.innerHTML = `<tr><td colspan="4" style="color: var(--admin-green);">✅ ¡Excelente! No hay alertas de stock bajo.</td></tr>`;
      } else {
        lowStockGrid.innerHTML = lowStockProducts.map(p => `
          <tr>
            <td><strong>${p.name}</strong></td>
            <td><span class="stock-pill stock-low">⚠️ ${p.stock} unidades</span></td>
            <td>Min: ${p.minStock}</td>
            <td>
              <button class="btn-admin-secondary" onclick="window.zyAdmin.openRestockModal('${p.id}')">+ Reponer</button>
            </td>
          </tr>
        `).join("");
      }
    }

    this.renderSalesChart();
  }

  renderSalesChart() {
    const canvas = document.getElementById("salesChartCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    
    // Simple sleek HTML5 Canvas gradient chart for 30 days sales
    const width = canvas.width = canvas.parentElement.clientWidth || 600;
    const height = canvas.height = 200;

    ctx.clearRect(0, 0, width, height);

    const points = [12, 18, 15, 25, 32, 28, 40, 35, 48, 42, 60, 55, 70, 65, 85, 90, 80, 95, 110, 105, 125, 120, 140];
    const stepX = width / (points.length - 1);
    const maxY = Math.max(...points) * 1.2;

    // Draw area gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "rgba(0, 230, 118, 0.35)");
    gradient.addColorStop(1, "rgba(0, 230, 118, 0.0)");

    ctx.beginPath();
    ctx.moveTo(0, height);
    points.forEach((val, i) => {
      const x = i * stepX;
      const y = height - (val / maxY) * height;
      ctx.lineTo(x, y);
    });
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw line
    ctx.beginPath();
    points.forEach((val, i) => {
      const x = i * stepX;
      const y = height - (val / maxY) * height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = "#00e676";
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  // --- 2. PRODUCT MANAGEMENT CRUD ---
  populateCategoryDropdown() {
    const select = document.getElementById("prodCategoryInput");
    if (!select) return;
    select.innerHTML = this.categories.map(c => `
      <option value="${c.id}">${c.icon || '🏷️'} ${c.name}</option>
    `).join("");
  }

  renderProductsTable() {
    const tbody = document.getElementById("productsTableBody");
    if (!tbody) return;

    tbody.innerHTML = this.products.map(p => {
      const stockInfo = getStockStatus(p.stock, p.minStock, p.status);
      return `
        <tr>
          <td><img src="${p.images[0] || ''}" style="width: 40px; height: 40px; border-radius: 6px; object-fit: cover;"></td>
          <td>
            <strong>${p.name}</strong><br>
            <small style="color: var(--admin-subtext);">SKU: ${p.sku}</small>
          </td>
          <td>${p.categoryName || 'General'}</td>
          <td><strong>${formatCurrency(p.price)}</strong></td>
          <td><span class="stock-pill ${stockInfo.class}">${stockInfo.icon} ${p.stock} u.</span></td>
          <td>
            <button class="btn-admin-secondary" onclick="window.zyAdmin.editProduct('${p.id}')">✏️ Editar</button>
            <button class="btn-admin-secondary" style="border-color: #ef4444; color: #ef4444;" onclick="window.zyAdmin.deleteProduct('${p.id}')">🗑️</button>
          </td>
        </tr>
      `;
    }).join("");
  }

  openNewProductModal() {
    this.populateCategoryDropdown();
    const modal = document.getElementById("productCrudModal");
    if (!modal) return;
    document.getElementById("crudProductForm").reset();
    document.getElementById("productIdInput").value = "";
    modal.classList.add("open");
  }

  editProduct(productId) {
    const product = this.products.find(p => p.id === productId);
    if (!product) return;

    this.populateCategoryDropdown();

    document.getElementById("productIdInput").value = product.id;
    document.getElementById("prodNameInput").value = product.name;
    document.getElementById("prodSkuInput").value = product.sku;
    document.getElementById("prodPriceInput").value = product.price;
    document.getElementById("prodOldPriceInput").value = product.oldPrice || "";
    document.getElementById("prodCostInput").value = product.cost || "";
    document.getElementById("prodStockInput").value = product.stock;
    document.getElementById("prodMinStockInput").value = product.minStock;
    document.getElementById("prodCategoryInput").value = product.categoryId;
    document.getElementById("prodShortDescInput").value = product.shortDescription;
    document.getElementById("prodFullDescInput").value = product.fullDescription || "";
    document.getElementById("prodImageInput").value = product.images ? product.images.join("\n") : "";
    document.getElementById("prodFeaturedInput").checked = product.isFeatured;
    document.getElementById("prodOfferInput").checked = product.isOffer;

    const modal = document.getElementById("productCrudModal");
    if (modal) modal.classList.add("open");
  }

  async saveProductForm(e) {
    e.preventDefault();
    const id = document.getElementById("productIdInput").value;
    const imagesRaw = document.getElementById("prodImageInput").value.trim();
    const imagesList = imagesRaw ? imagesRaw.split("\n").map(s => s.trim()) : ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800'];
    const selectedCatId = document.getElementById("prodCategoryInput").value;
    const catObj = this.categories.find(c => c.id === selectedCatId);

    const productPayload = {
      id: id || null,
      name: document.getElementById("prodNameInput").value,
      sku: document.getElementById("prodSkuInput").value,
      price: Number(document.getElementById("prodPriceInput").value),
      oldPrice: document.getElementById("prodOldPriceInput").value ? Number(document.getElementById("prodOldPriceInput").value) : null,
      cost: document.getElementById("prodCostInput").value ? Number(document.getElementById("prodCostInput").value) : 0,
      stock: Number(document.getElementById("prodStockInput").value),
      minStock: Number(document.getElementById("prodMinStockInput").value) || 5,
      categoryId: selectedCatId,
      categoryName: catObj ? catObj.name : 'General',
      shortDescription: document.getElementById("prodShortDescInput").value,
      fullDescription: document.getElementById("prodFullDescInput").value,
      images: imagesList,
      isFeatured: document.getElementById("prodFeaturedInput").checked,
      isOffer: document.getElementById("prodOfferInput").checked,
      status: 'active'
    };

    await window.ZyLogixDB.saveProduct(productPayload);
    await this.loadAllData();
    this.renderProductsTable();
    this.renderInventoryTable();
    this.renderFeaturedTable();
    this.renderDashboard();

    const modal = document.getElementById("productCrudModal");
    if (modal) modal.classList.remove("open");
  }

  async deleteProduct(productId) {
    if (confirm("¿Estás seguro de eliminar este producto de ZyLogix?")) {
      await window.ZyLogixDB.deleteProduct(productId);
      await this.loadAllData();
      this.renderProductsTable();
      this.renderInventoryTable();
      this.renderDashboard();
    }
  }

  // --- CATEGORY CRUD HANDLERS ---
  openNewCategoryModal() {
    const modal = document.getElementById("categoryCrudModal");
    if (!modal) return;
    document.getElementById("catNameInput").value = "";
    document.getElementById("catIconInput").value = "🏷️";
    document.getElementById("catSlugInput").value = "";
    document.getElementById("catDescInput").value = "";
    modal.classList.add("open");
  }

  async saveCategoryForm(e) {
    e.preventDefault();
    const name = document.getElementById("catNameInput").value;
    const icon = document.getElementById("catIconInput").value || "🏷️";
    const slug = document.getElementById("catSlugInput").value;
    const description = document.getElementById("catDescInput").value;

    await window.ZyLogixDB.saveCategory({
      name: name,
      icon: icon,
      slug: slug,
      description: description
    });

    await this.loadAllData();
    this.renderCategoriesTable();
    this.populateCategoryDropdown();

    const modal = document.getElementById("categoryCrudModal");
    if (modal) modal.classList.remove("open");
  }

  // --- 3. ORDERS MANAGEMENT ---
  renderOrdersTable() {
    const tbody = document.getElementById("ordersTableBody");
    if (!tbody) return;

    tbody.innerHTML = this.orders.map(o => `
      <tr>
        <td><strong>#${o.orderNumber || o.id}</strong></td>
        <td>
          <strong>${o.customerName}</strong><br>
          <small style="color: var(--admin-subtext);">${o.customerPhone}</small>
        </td>
        <td>${o.items ? o.items.length : 0} artículos</td>
        <td><strong style="color: var(--admin-green);">${formatCurrency(o.total)}</strong></td>
        <td>
          <select class="btn-admin-secondary" onchange="window.zyAdmin.updateOrderStatus('${o.id}', this.value)">
            <option value="pending" ${o.status === 'pending' ? 'selected' : ''}>⏳ Pendiente</option>
            <option value="confirmed" ${o.status === 'confirmed' ? 'selected' : ''}>✅ Confirmado</option>
            <option value="shipped" ${o.status === 'shipped' ? 'selected' : ''}>🚚 Enviado</option>
            <option value="delivered" ${o.status === 'delivered' ? 'selected' : ''}>📦 Entregado</option>
            <option value="cancelled" ${o.status === 'cancelled' ? 'selected' : ''}>❌ Cancelado</option>
          </select>
        </td>
        <td>
          <button class="btn-admin-secondary" onclick="window.zyAdmin.notifyOrderWhatsApp('${o.id}')">📲 WhatsApp</button>
        </td>
      </tr>
    `).join("");
  }

  async updateOrderStatus(orderId, newStatus) {
    await window.ZyLogixDB.updateOrderStatus(orderId, newStatus);
    await this.loadAllData();
    this.renderOrdersTable();
    this.renderDashboard();
  }

  notifyOrderWhatsApp(orderId) {
    const order = this.orders.find(o => o.id === orderId);
    if (!order) return;
    const text = `Hola ${order.customerName}, te escribimos desde ZyLogix para actualizarte sobre tu Pedido #${order.orderNumber}. Estado actual: *${order.status.toUpperCase()}*. ¡Gracias por preferir ZyLogix!`;
    const cleanPhone = order.customerPhone.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/595${cleanPhone}?text=${encodeURIComponent(text)}`, "_blank");
  }

  // --- 4. INVENTORY TRACEABILITY & MOVEMENTS LOG ---
  renderInventoryTable() {
    const stockTbody = document.getElementById("inventoryStockTableBody");
    const productFilterSelect = document.getElementById("filterMovementProduct");

    if (stockTbody) {
      stockTbody.innerHTML = this.products.map(p => {
        const stockInfo = getStockStatus(p.stock, p.minStock, p.status);
        return `
          <tr>
            <td><strong>${p.name}</strong> (${p.sku})</td>
            <td><strong>${p.stock} unidades</strong></td>
            <td>Mín: ${p.minStock}</td>
            <td><span class="stock-pill ${stockInfo.class}">${stockInfo.icon} ${stockInfo.label}</span></td>
            <td>
              <button class="btn-admin-secondary" onclick="window.zyAdmin.openRestockModal('${p.id}')">➕ Agregar Stock</button>
              <button class="btn-admin-secondary" style="border-color: #ef4444; color: #ef4444;" onclick="window.zyAdmin.openStockOutputModal('${p.id}')">➖ Dar Salida</button>
            </td>
          </tr>
        `;
      }).join("");
    }

    if (productFilterSelect) {
      let optionsHtml = `<option value="all">🔍 Todos los productos</option>`;
      this.products.forEach(p => {
        optionsHtml += `<option value="${p.id}">${p.name} (${p.sku})</option>`;
      });
      productFilterSelect.innerHTML = optionsHtml;
    }

    this.filterInventoryMovements();
  }

  filterInventoryMovements() {
    const moveTbody = document.getElementById("inventoryMovementsTableBody");
    if (!moveTbody) return;

    const selectedProduct = document.getElementById("filterMovementProduct") ? document.getElementById("filterMovementProduct").value : 'all';
    const selectedType = document.getElementById("filterMovementType") ? document.getElementById("filterMovementType").value : 'all';

    let filtered = [...this.inventoryMovements];

    if (selectedProduct !== 'all') {
      filtered = filtered.filter(m => m.productId === selectedProduct);
    }

    if (selectedType !== 'all') {
      if (selectedType === 'damaged') {
        filtered = filtered.filter(m => m.type === 'damaged' || (m.notes && m.notes.toLowerCase().includes("dañado")));
      } else {
        filtered = filtered.filter(m => m.type === selectedType);
      }
    }

    if (filtered.length === 0) {
      moveTbody.innerHTML = `<tr><td colspan="4" style="color: var(--admin-subtext); text-align: center; padding: 2rem;">No hay movimientos que coincidan con el filtro seleccionado.</td></tr>`;
      return;
    }

    moveTbody.innerHTML = filtered.map(m => `
      <tr>
        <td><small>${m.createdAt || 'Reciente'}</small></td>
        <td><strong>${m.productName || 'Producto'}</strong></td>
        <td>
          <span style="font-family: var(--font-mono); font-weight: 800; color: ${m.changeQuantity > 0 ? '#00e676' : '#ef4444'};">
            ${m.changeQuantity > 0 ? '+' : ''}${m.changeQuantity}
          </span>
        </td>
        <td><small>${m.notes || m.type}</small></td>
      </tr>
    `).join("");
  }

  openRestockModal(productId) {
    const product = this.products.find(p => p.id === productId);
    if (!product) return;

    const modal = document.getElementById("restockModal");
    if (!modal) return;

    document.getElementById("restockProductIdInput").value = product.id;
    document.getElementById("restockModalTitle").textContent = `📦 Reponer Stock: ${product.name}`;
    document.getElementById("restockModalSub").textContent = `Stock actual en catálogo: ${product.stock} unidades.`;
    document.getElementById("restockQtyInput").value = "10";
    document.getElementById("restockNotesInput").value = "Compra de proveedor";

    modal.classList.add("open");
  }

  async submitRestockForm(e) {
    e.preventDefault();
    const productId = document.getElementById("restockProductIdInput").value;
    const addQty = parseInt(document.getElementById("restockQtyInput").value, 10);
    const notes = document.getElementById("restockNotesInput").value.trim() || "Reposición de stock";

    const product = this.products.find(p => p.id === productId);
    if (!product || isNaN(addQty) || addQty <= 0) return;

    product.stock += addQty;
    await window.ZyLogixDB.saveProduct(product, notes);

    await this.loadAllData();
    this.renderProductsTable();
    this.renderInventoryTable();
    this.renderDashboard();

    const modal = document.getElementById("restockModal");
    if (modal) modal.classList.remove("open");
  }

  // --- OUTBOUND STOCK (SALIDA / BAJAS DE INVENTARIO) ---
  openStockOutputModal(productId) {
    const product = this.products.find(p => p.id === productId);
    if (!product) return;

    const modal = document.getElementById("stockOutputModal");
    if (!modal) return;

    document.getElementById("stockOutputProductIdInput").value = product.id;
    document.getElementById("stockOutputModalTitle").textContent = `➖ Dar Salida de Stock: ${product.name}`;
    document.getElementById("stockOutputModalSub").textContent = `Stock disponible actual: ${product.stock} unidades.`;
    document.getElementById("stockOutputQtyInput").value = "1";
    document.getElementById("stockOutputQtyInput").max = product.stock;
    document.getElementById("stockOutputNotesInput").value = "Producto dañado en depósito";

    modal.classList.add("open");
  }

  async submitStockOutputForm(e) {
    e.preventDefault();
    const productId = document.getElementById("stockOutputProductIdInput").value;
    const outQty = parseInt(document.getElementById("stockOutputQtyInput").value, 10);
    const reason = document.getElementById("stockOutputReasonInput").value;
    const notesRaw = document.getElementById("stockOutputNotesInput").value.trim();

    const product = this.products.find(p => p.id === productId);
    if (!product || isNaN(outQty) || outQty <= 0) return;

    const actualDeduct = Math.min(product.stock, outQty);
    product.stock = Math.max(0, product.stock - actualDeduct);

    const fullNote = `[Salida] ${notesRaw || 'Ajuste de stock'}`;
    await window.ZyLogixDB.saveProduct(product, fullNote);

    await this.loadAllData();
    this.renderProductsTable();
    this.renderInventoryTable();
    this.renderDashboard();

    const modal = document.getElementById("stockOutputModal");
    if (modal) modal.classList.remove("open");
  }

  // --- 5. COUPONS & DISCOUNTS ---
  renderCouponsTable() {
    const tbody = document.getElementById("couponsTableBody");
    if (!tbody) return;

    tbody.innerHTML = this.coupons.map(c => `
      <tr>
        <td><strong style="font-family: var(--font-mono); color: var(--admin-green);">${c.code}</strong></td>
        <td>-${c.discountPercentage}%</td>
        <td>Min: ${formatCurrency(c.minPurchase)}</td>
        <td>${c.usedCount} / ${c.maxUses}</td>
        <td>${c.expiresAt || 'Sin límite'}</td>
        <td><span class="stock-pill ${c.isActive ? 'stock-in' : 'stock-out'}">${c.isActive ? 'Activo' : 'Inactivo'}</span></td>
        <td>
          <button class="btn-admin-secondary" style="border-color: #ef4444; color: #ef4444;" onclick="window.zyAdmin.deleteCoupon('${c.id}')">🗑️ Eliminar</button>
        </td>
      </tr>
    `).join("");
  }

  async deleteCoupon(couponId) {
    if (confirm("¿Estás seguro de eliminar este cupón de descuento?")) {
      await window.ZyLogixDB.deleteCoupon(couponId);
      await this.loadAllData();
      this.renderCouponsTable();
    }
  }

  async saveNewCoupon(e) {
    e.preventDefault();
    const code = document.getElementById("couponCodeInput").value;
    const percentage = Number(document.getElementById("couponPercentageInput").value);
    const minSpend = Number(document.getElementById("couponMinSpendInput").value);
    const maxUses = Number(document.getElementById("couponMaxUsesInput").value) || 100;

    await window.ZyLogixDB.saveCoupon({
      code: code,
      discountPercentage: percentage,
      minPurchase: minSpend,
      maxUses: maxUses,
      isActive: true
    });

    await this.loadAllData();
    this.renderCouponsTable();
    document.getElementById("newCouponForm").reset();
  }

  renderDiscountsTable() {
    const tbody = document.getElementById("discountsTableBody");
    if (!tbody) return;

    tbody.innerHTML = this.discounts.map(d => `
      <tr>
        <td><strong>${d.name}</strong></td>
        <td>${d.type === 'percentage' ? d.value + '%' : formatCurrency(d.value)}</td>
        <td>${d.appliesTo.toUpperCase()}</td>
        <td>${d.startDate} al ${d.endDate}</td>
        <td><span class="stock-pill stock-in">Activa</span></td>
      </tr>
    `).join("");
  }

  // --- 6. FEATURED PRODUCTS & CATEGORIES ---
  renderFeaturedTable() {
    const tbody = document.getElementById("featuredTableBody");
    if (!tbody) return;

    tbody.innerHTML = this.products.map(p => `
      <tr>
        <td><strong>${p.name}</strong></td>
        <td>${p.categoryName || 'General'}</td>
        <td>
          <input type="checkbox" ${p.isFeatured ? 'checked' : ''} onchange="window.zyAdmin.toggleProductFeatured('${p.id}', this.checked)"> ⭐ Destacado
        </td>
      </tr>
    `).join("");
  }

  async toggleProductFeatured(productId, isFeatured) {
    const product = this.products.find(p => p.id === productId);
    if (product) {
      product.isFeatured = isFeatured;
      await window.ZyLogixDB.saveProduct(product);
    }
  }

  renderCategoriesTable() {
    const tbody = document.getElementById("categoriesTableBody");
    if (!tbody) return;

    tbody.innerHTML = this.categories.map(c => `
      <tr>
        <td><span style="font-size: 1.5rem;">${c.icon || '🏷️'}</span></td>
        <td><strong>${c.name}</strong></td>
        <td><code>${c.slug}</code></td>
        <td>${c.description || '-'}</td>
        <td>
          <button class="btn-admin-secondary" style="border-color: #ef4444; color: #ef4444;" onclick="window.zyAdmin.deleteCategory('${c.id}')">🗑️ Eliminar</button>
        </td>
      </tr>
    `).join("");
  }

  async deleteCategory(categoryId) {
    if (confirm("¿Estás seguro de eliminar esta categoría de ZyLogix?")) {
      await window.ZyLogixDB.deleteCategory(categoryId);
      await this.loadAllData();
      this.renderCategoriesTable();
      this.populateCategoryDropdown();
    }
  }

  renderCustomersTable() {
    const tbody = document.getElementById("customersTableBody");
    if (!tbody) return;

    tbody.innerHTML = this.customers.map(c => `
      <tr>
        <td><strong>${c.name}</strong></td>
        <td>${c.email}</td>
        <td>${c.phone}</td>
        <td>${c.city}</td>
        <td><strong>${c.ordersCount} pedidos</strong></td>
        <td><strong style="color: var(--admin-green);">${formatCurrency(c.totalSpent)}</strong></td>
      </tr>
    `).join("");
  }

  // --- MEDIA GALLERY VISUAL RENDERER ---
  renderMediaGallery() {
    const grid = document.getElementById("mediaGalleryGrid");
    if (!grid) return;

    const allImages = [];
    this.products.forEach(p => {
      if (p.images && p.images.length > 0) {
        p.images.forEach(url => {
          allImages.push({ url, productName: p.name, sku: p.sku });
        });
      }
    });

    if (allImages.length === 0) {
      grid.innerHTML = `<p style="color: var(--admin-subtext);">No hay imágenes registradas aún.</p>`;
      return;
    }

    grid.innerHTML = allImages.map((img, i) => `
      <div class="metric-card" style="padding: 1rem; position: relative;">
        <img src="${img.url}" style="width: 100%; height: 160px; object-fit: cover; border-radius: 8px; margin-bottom: 0.75rem; border: 1px solid var(--admin-border);">
        <strong style="font-size: 0.85rem; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-bottom: 0.5rem;">${img.productName}</strong>
        <button class="btn-admin-secondary" style="width: 100%; justify-content: center; font-size: 0.75rem; padding: 0.4rem;" onclick="navigator.clipboard.writeText('${img.url}'); alert('📋 URL copiada al portapapeles');">
          📋 Copiar URL
        </button>
      </div>
    `).join("");
  }

  // --- SETTINGS & PRODUCTION RESET ---
  loadSettingsForm() {
    const urlInput = document.getElementById("settingSupabaseUrl");
    const keyInput = document.getElementById("settingSupabaseKey");
    if (urlInput) urlInput.value = localStorage.getItem("zylogix_supabase_url") || "";
    if (keyInput) keyInput.value = localStorage.getItem("zylogix_supabase_key") || "";
    this.renderMediaGallery();
  }

  saveSettingsForm(e) {
    e.preventDefault();
    const url = document.getElementById("settingSupabaseUrl").value.trim();
    const key = document.getElementById("settingSupabaseKey").value.trim();

    localStorage.setItem("zylogix_supabase_url", url);
    localStorage.setItem("zylogix_supabase_key", key);

    window.location.reload();
  }

  openResetProductionModal() {
    const modal = document.getElementById("resetProductionModal");
    if (modal) modal.classList.add("open");
  }

  async submitProductionReset() {
    await window.ZyLogixDB.resetDatabaseForProduction();
    await this.loadAllData();
    this.renderOrdersTable();
    this.renderInventoryTable();
    this.renderDashboard();

    const modal = document.getElementById("resetProductionModal");
    if (modal) modal.classList.remove("open");

    alert("🚀 ¡Base de datos reseteada con éxito! Tu tienda ZyLogix está limpia y lista para recibir pedidos reales.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.zyAdmin = new ZyLogixAdmin();
});
