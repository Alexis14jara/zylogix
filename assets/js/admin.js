/**
 * ZyLogix Administrative Panel Engine
 * Controls Dashboard stats, Canvas sales chart, Product CRUD, Order status manager,
 * Stock movement log traceability, Discount builder, Coupon manager, and Supabase config.
 */

function convertDriveUrl(url) {
  if (!url) return '';
  url = url.trim();

  let driveId = null;
  const matchFile = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchFile && matchFile[1]) {
    driveId = matchFile[1];
  } else {
    const matchId = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (matchId && matchId[1]) {
      driveId = matchId[1];
    }
  }

  if (driveId) {
    return `https://lh3.googleusercontent.com/d/${driveId}`;
  }

  return url;
}

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
    const totalSales = (this.orders || []).reduce((sum, o) => sum + (o.status !== 'cancelled' ? Number(o.total || 0) : 0), 0);
    const totalOrders = (this.orders || []).length;
    const totalCustomers = (this.customers || []).length;
    const activeCoupons = (this.coupons || []).filter(c => c.isActive).length;

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
    
    const width = canvas.width = canvas.parentElement.clientWidth || 600;
    const height = canvas.height = 200;

    ctx.clearRect(0, 0, width, height);

    // Dynamic sales calculation for last 7 days from actual orders
    const days = 7;
    const salesByDay = new Array(days).fill(0);
    const today = new Date();

    const validOrders = (this.orders || []).filter(o => o.status !== 'cancelled');

    validOrders.forEach(o => {
      if (!o.createdAt) return;
      const orderDate = new Date(o.createdAt);
      const diffTime = today - orderDate;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays < days) {
        salesByDay[days - 1 - diffDays] += Number(o.total || 0);
      }
    });

    const points = salesByDay;
    const maxVal = Math.max(...points);

    if (maxVal === 0) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height - 20);
      ctx.lineTo(width, height - 20);
      ctx.stroke();

      ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      ctx.font = "12px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Sin ventas registradas aún", width / 2, height / 2);
      return;
    }

    const stepX = width / (points.length - 1);
    const maxY = maxVal * 1.25;

    // Draw area gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "rgba(0, 230, 118, 0.35)");
    gradient.addColorStop(1, "rgba(0, 230, 118, 0.0)");

    ctx.beginPath();
    ctx.moveTo(0, height);
    points.forEach((val, i) => {
      const x = i * stepX;
      const y = height - (val / maxY) * (height - 30) - 10;
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
      const y = height - (val / maxY) * (height - 30) - 10;
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

    if (!this.products || this.products.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="color: var(--admin-subtext); text-align: center; padding: 2rem;">No hay productos registrados en la base de datos.</td></tr>`;
      return;
    }

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

  addProductImageInputRow(url = '') {
    const container = document.getElementById("productImagesListContainer");
    if (!container) return;

    const rowId = 'imgRow_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    const row = document.createElement("div");
    row.id = rowId;
    row.style.display = "flex";
    row.style.gap = "0.5rem";
    row.style.alignItems = "center";

    row.innerHTML = `
      <input type="text" class="btn-admin-secondary prod-image-url-input" style="flex: 1; text-align: left; font-size: 0.85rem;" placeholder="Ej: https://i.imgur.com/... o enlace Drive" value="${url}" onchange="window.zyAdmin.handleDriveUrlConvert(this)" oninput="window.zyAdmin.handleDriveUrlConvert(this)">
      <button type="button" class="btn-admin-secondary" style="border-color: #ef4444; color: #ef4444; padding: 0.4rem 0.6rem;" onclick="document.getElementById('${rowId}').remove()">🗑️</button>
    `;

    container.appendChild(row);
  }

  handleDriveUrlConvert(inputEl) {
    if (!inputEl) return;
    const raw = inputEl.value.trim();
    if (raw.includes("\n") || raw.includes(",")) {
      const parts = raw.split(/[\n,]+/).map(s => convertDriveUrl(s)).filter(s => s !== "");
      if (parts.length > 0) {
        parts.forEach((p, idx) => {
          if (idx === 0) {
            inputEl.value = p;
          } else {
            this.addProductImageInputRow(p);
          }
        });
        return;
      }
    }
    const converted = convertDriveUrl(raw);
    if (converted !== raw) {
      inputEl.value = converted;
    }
  }

  setProductImagesList(imagesArray) {
    const container = document.getElementById("productImagesListContainer");
    if (!container) return;
    container.innerHTML = "";

    if (imagesArray && imagesArray.length > 0) {
      imagesArray.forEach(url => this.addProductImageInputRow(url));
    } else {
      this.addProductImageInputRow("");
    }
  }

  getProductImagesList() {
    const inputs = document.querySelectorAll(".prod-image-url-input");
    const urls = [];
    inputs.forEach(input => {
      let val = convertDriveUrl(input.value);
      val = val.replace(/[\r\n\t]/g, "").trim();
      if (val !== "") {
        urls.push(val);
      }
    });
    return urls;
  }

  openNewProductModal() {
    this.populateCategoryDropdown();
    const modal = document.getElementById("productCrudModal");
    if (!modal) return;
    document.getElementById("crudProductForm").reset();
    document.getElementById("productIdInput").value = "";
    this.setProductImagesList([]);
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
    this.setProductImagesList(product.images);
    document.getElementById("prodFeaturedInput").checked = product.isFeatured;
    document.getElementById("prodOfferInput").checked = product.isOffer;

    const modal = document.getElementById("productCrudModal");
    if (modal) modal.classList.add("open");
  }

  async saveProductForm(e) {
    e.preventDefault();
    const id = document.getElementById("productIdInput").value;
    const imagesList = this.getProductImagesList();
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

    const res = await window.ZyLogixDB.saveProduct(productPayload);
    if (res && res.error) {
      alert("⚠️ Error de Supabase al guardar producto:\n" + res.error);
    }
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

    if (!this.orders || this.orders.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="color: var(--admin-subtext); text-align: center; padding: 2rem;">No hay pedidos registrados en el sistema.</td></tr>`;
      return;
    }

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
      if (!this.products || this.products.length === 0) {
        stockTbody.innerHTML = `<tr><td colspan="5" style="color: var(--admin-subtext); text-align: center; padding: 2rem;">No hay productos registrados en inventario.</td></tr>`;
      } else {
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

    if (!this.coupons || this.coupons.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="color: var(--admin-subtext); text-align: center; padding: 2rem;">No hay cupones de descuento creados.</td></tr>`;
      return;
    }

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

    if (!this.discounts || this.discounts.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="color: var(--admin-subtext); text-align: center; padding: 2rem;">No hay promociones activas.</td></tr>`;
      return;
    }

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

    if (!this.products || this.products.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" style="color: var(--admin-subtext); text-align: center; padding: 2rem;">No hay productos para destacar.</td></tr>`;
      return;
    }

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

    if (!this.categories || this.categories.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="color: var(--admin-subtext); text-align: center; padding: 2rem;">No hay categorías registradas.</td></tr>`;
      return;
    }

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
      const res = await window.ZyLogixDB.deleteCategory(categoryId);
      if (res && res.error) {
        alert("⚠️ Error de Supabase al eliminar la categoría:\n" + res.error);
      }
      await this.loadAllData();
      this.renderCategoriesTable();
      this.populateCategoryDropdown();
    }
  }

  renderCustomersTable() {
    const tbody = document.getElementById("customersTableBody");
    if (!tbody) return;

    if (!this.customers || this.customers.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="color: var(--admin-subtext); text-align: center; padding: 2rem;">No hay clientes registrados en el sistema.</td></tr>`;
      return;
    }

    tbody.innerHTML = this.customers.map(c => `
      <tr>
        <td><strong>${c.name}</strong></td>
        <td>${c.email}</td>
        <td>${c.phone}</td>
        <td>${c.city || 'Asunción'}</td>
        <td><strong>${c.ordersCount || c.totalOrders || 1} pedidos</strong></td>
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
    const res = await window.ZyLogixDB.resetDatabaseForProduction();
    await this.loadAllDataAndRender();

    const modal = document.getElementById("resetProductionModal");
    if (modal) modal.classList.remove("open");

    if (res && res.errors && res.errors.length > 0) {
      alert("⚠️ Reseteo completado con algunas advertencias de Supabase:\n" + res.errors.join("\n"));
    } else {
      alert("🚀 ¡Base de datos reseteada con éxito! Tu tienda ZyLogix está completamente limpia y lista para recibir productos y pedidos reales.");
    }
  }

  async submitRestoreDemoData() {
    if (confirm("¿Deseas restaurar los datos de prueba iniciales (productos, categorías y pedidos demo)?")) {
      await window.ZyLogixDB.restoreDemoData();
      await this.loadAllDataAndRender();
      alert("🔄 ¡Datos de demostración restaurados con éxito!");
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.zyAdmin = new ZyLogixAdmin();
});
