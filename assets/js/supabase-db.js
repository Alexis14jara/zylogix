function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

class ZyLogixDBService {
  constructor() {
    this.supabase = null;
    this.useSupabase = false;
    this.storageKey = "zylogix_db_v1";
    this.init();
  }

  init() {
    // 1. Check if Supabase client library is available and keys are set
    const url = ZYLOGIX_CONFIG.supabaseUrl;
    const key = ZYLOGIX_CONFIG.supabaseAnonKey;

    if (window.supabase && url && key) {
      try {
        this.supabase = window.supabase.createClient(url, key);
        this.useSupabase = true;
        console.log("🟢 ZyLogix DB: Supabase Client Connected Successfully.");
      } catch (err) {
        console.warn("⚠️ ZyLogix DB: Supabase init failed, falling back to Local Storage mode.", err);
        this.useSupabase = false;
      }
    } else {
      console.log("ℹ️ ZyLogix DB: Running in Local Demo Mode (LocalStorage active).");
    }

    // 2. Ensure LocalStorage has seed data initialized if empty
    if (!localStorage.getItem(this.storageKey)) {
      this.saveLocalData(window.INITIAL_MOCK_DATA);
    }
  }

  getLocalData() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : window.INITIAL_MOCK_DATA;
    } catch (e) {
      return window.INITIAL_MOCK_DATA;
    }
  }

  saveLocalData(data) {
    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  // --- ADMIN AUTHENTICATION ---
  async loginAdmin(email, password) {
    const cleanEmail = email.toLowerCase().trim();

    // Authenticate exclusively via Supabase Auth
    if (this.useSupabase) {
      try {
        const { data, error } = await this.supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: password
        });

        if (!error && data.user) {
          const sessionUser = {
            id: data.user.id,
            email: data.user.email,
            role: 'admin',
            token: data.session.access_token
          };
          sessionStorage.setItem("zylogix_admin_session", JSON.stringify(sessionUser));
          return { success: true, user: sessionUser };
        } else if (error) {
          console.warn("Supabase Auth error:", error.message);
          return { success: false, error: "Error de Supabase: " + error.message };
        }
      } catch (err) {
        console.error("Supabase login exception:", err);
        return { success: false, error: "Error al conectar con Supabase: " + err.message };
      }
    } else {
      return { success: false, error: "Supabase no está configurado. Por favor configura las claves en ⚙️ Configuración primero." };
    }
  }

  logoutAdmin() {
    sessionStorage.removeItem("zylogix_admin_session");
    if (this.useSupabase) {
      try {
        this.supabase.auth.signOut();
      } catch (e) {
        // ignore
      }
    }
  }

  getAdminSession() {
    try {
      const data = sessionStorage.getItem("zylogix_admin_session");
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  // --- PRODUCTS CRUD ---
  async getProducts() {
    if (this.useSupabase) {
      try {
        const { data, error } = await this.supabase
          .from("products")
          .select("*, categories(name), brands(name), product_features(*), product_images(*)")
          .order("created_at", { ascending: false });

        if (!error && data) {
          // Normalize Supabase format to ZyLogix schema
          return data.map(p => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            shortDescription: p.short_description,
            fullDescription: p.full_description,
            price: Number(p.price),
            oldPrice: p.old_price ? Number(p.old_price) : null,
            cost: p.cost ? Number(p.cost) : 0,
            stock: p.stock,
            minStock: p.min_stock || 5,
            sku: p.sku,
            categoryId: p.category_id,
            categoryName: p.categories ? p.categories.name : 'General',
            brandId: p.brand_id,
            brandName: p.brands ? p.brands.name : 'ZyLogix',
            status: p.status,
            isFeatured: p.is_featured,
            isOffer: p.is_offer,
            discountPercentage: p.discount_percentage || 0,
            images: p.product_images && p.product_images.length > 0 
              ? p.product_images.map(img => img.url) 
              : ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800'],
            features: p.product_features ? p.product_features.map(f => ({ name: f.feature_name, value: f.feature_value })) : [],
            createdAt: p.created_at
          }));
        }
      } catch (err) {
        console.warn("Supabase fetch failed, falling back to LocalStorage:", err);
      }
    }

    const local = this.getLocalData();
    return local.products || [];
  }

  async saveProduct(productData, customNotes = null) {
    const local = this.getLocalData();
    let updatedProducts = [...local.products];

    if (productData.id) {
      // Edit existing product
      const idx = updatedProducts.findIndex(p => p.id === productData.id);
      if (idx !== -1) {
        const oldStock = updatedProducts[idx].stock;
        const stockDiff = productData.stock - oldStock;
        
        updatedProducts[idx] = { ...updatedProducts[idx], ...productData, updatedAt: new Date().toISOString() };
        local.products = updatedProducts;
        this.saveLocalData(local);

        // Record stock movement if stock quantity changed
        if (stockDiff !== 0) {
          await this.addInventoryMovement({
            productId: productData.id,
            productName: productData.name,
            changeQuantity: stockDiff,
            type: stockDiff > 0 ? 'supplier_restock' : 'manual_adjustment',
            notes: customNotes || (stockDiff > 0 ? 'Reposición de proveedor' : 'Ajuste de inventario')
          });
        }
      }
    } else {
      const newProduct = {
        ...productData,
        id: productData.id || generateUUID(),
        createdAt: new Date().toISOString()
      };
      updatedProducts.unshift(newProduct);
      local.products = updatedProducts;
      this.saveLocalData(local);

      // Log initial stock movement
      if (newProduct.stock > 0) {
        await this.addInventoryMovement({
          productId: newProduct.id,
          productName: newProduct.name,
          changeQuantity: newProduct.stock,
          type: 'supplier_restock',
          notes: customNotes || 'Carga inicial de producto'
        });
      }
    }

    if (this.useSupabase) {
      try {
        const { error } = await this.supabase.from("products").upsert({
          id: productData.id || undefined,
          name: productData.name,
          slug: productData.slug || productData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          short_description: productData.shortDescription,
          full_description: productData.fullDescription,
          price: productData.price,
          old_price: productData.oldPrice,
          cost: productData.cost,
          stock: productData.stock,
          min_stock: productData.minStock,
          sku: productData.sku,
          status: productData.status || 'active',
          is_featured: productData.isFeatured || false,
          is_offer: productData.isOffer || false,
          discount_percentage: productData.discountPercentage || 0
        });

        if (error) console.error("Supabase upsert product error:", error.message);
      } catch (err) {
        console.error("Supabase upsert exception:", err);
      }
    }

    return true;
  }

  async deleteProduct(productId) {
    const local = this.getLocalData();
    local.products = local.products.filter(p => p.id !== productId);
    this.saveLocalData(local);

    if (this.useSupabase) {
      try {
        await this.supabase.from("products").delete().eq("id", productId);
      } catch (err) {
        console.error("Supabase delete product error:", err);
      }
    }
  }

  // --- CATEGORIES & BRANDS ---
  async getCategories() {
    if (this.useSupabase) {
      try {
        const { data, error } = await this.supabase.from("categories").select("*").order("name");
        if (!error && data) {
          return data.map(c => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
            description: c.description,
            icon: c.icon || '🏷️'
          }));
        }
      } catch (e) {
        console.warn("Supabase fetch categories error:", e);
      }
    }
    const local = this.getLocalData();
    return local.categories || [];
  }

  async saveCategory(categoryData) {
    const local = this.getLocalData();
    let updatedCategories = [...(local.categories || [])];

    const slug = categoryData.slug || categoryData.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
    const newCategory = {
      id: categoryData.id || generateUUID(),
      name: categoryData.name.trim(),
      slug: slug,
      description: categoryData.description || '',
      icon: categoryData.icon || '🏷️'
    };

    const idx = updatedCategories.findIndex(c => c.id === newCategory.id || c.slug === newCategory.slug);
    if (idx !== -1) {
      updatedCategories[idx] = { ...updatedCategories[idx], ...newCategory };
    } else {
      updatedCategories.push(newCategory);
    }

    local.categories = updatedCategories;
    this.saveLocalData(local);

    if (this.useSupabase) {
      try {
        const { error } = await this.supabase.from("categories").upsert({
          id: categoryData.id || undefined,
          name: newCategory.name,
          slug: newCategory.slug,
          description: newCategory.description,
          icon: newCategory.icon
        });

        if (error) console.error("Supabase category save error:", error.message);
      } catch (err) {
        console.error("Supabase saveCategory exception:", err);
      }
    }

    return newCategory;
  }

  async deleteCategory(categoryId) {
    const local = this.getLocalData();
    const targetCat = (local.categories || []).find(c => c.id === categoryId || c.slug === categoryId);
    const catSlug = targetCat ? targetCat.slug : null;

    local.categories = (local.categories || []).filter(c => c.id !== categoryId && c.slug !== categoryId);
    if (local.products) {
      local.products.forEach(p => {
        if (p.categoryId === categoryId) {
          p.categoryId = null;
          p.categoryName = 'General';
        }
      });
    }
    this.saveLocalData(local);

    if (this.useSupabase) {
      try {
        await this.supabase.from("products").update({ category_id: null }).eq("category_id", categoryId);
        
        let { error } = await this.supabase.from("categories").delete().eq("id", categoryId);
        
        if (error && catSlug) {
          console.warn("Delete category by ID failed, attempting by slug:", error.message);
          const slugRes = await this.supabase.from("categories").delete().eq("slug", catSlug);
          error = slugRes.error;
        }

        if (error) {
          console.error("Supabase deleteCategory error:", error.message);
          return { success: false, error: error.message };
        }
      } catch (err) {
        console.error("Supabase deleteCategory exception:", err);
        return { success: false, error: err.message };
      }
    }

    return { success: true };
  }

  async deleteCoupon(couponId) {
    const local = this.getLocalData();
    local.coupons = (local.coupons || []).filter(c => c.id !== couponId);
    this.saveLocalData(local);

    if (this.useSupabase) {
      try {
        await this.supabase.from("coupons").delete().eq("id", couponId);
      } catch (err) {
        console.error("Supabase deleteCoupon error:", err);
      }
    }
  }

  async resetDatabaseForProduction() {
    const cleanData = {
      products: [],
      categories: [],
      brands: [],
      orders: [],
      coupons: [],
      discounts: [],
      inventoryMovements: [],
      customers: []
    };

    this.saveLocalData(cleanData);

    const errors = [];

    if (this.useSupabase) {
      const tablesToDelete = [
        "inventory_movements",
        "product_features",
        "product_images",
        "orders",
        "products",
        "categories",
        "coupons",
        "brands"
      ];

      for (const table of tablesToDelete) {
        try {
          let { error } = await this.supabase.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
          if (error) {
            const res2 = await this.supabase.from(table).delete().gt("created_at", "1970-01-01T00:00:00Z");
            if (res2.error) {
              console.warn(`Supabase clear table ${table} failed:`, res2.error.message);
              errors.push(`${table}: ${res2.error.message}`);
            }
          }
        } catch (err) {
          console.warn(`Supabase clear table ${table} failed:`, err);
          errors.push(`${table}: ${err.message}`);
        }
      }
    }

    return { success: errors.length === 0, errors };
  }

  async restoreDemoData() {
    if (window.INITIAL_MOCK_DATA) {
      this.saveLocalData(window.INITIAL_MOCK_DATA);
    }
    return true;
  }

  async getBrands() {
    const local = this.getLocalData();
    return local.brands || [];
  }

  // --- INVENTORY MOVEMENTS LOG ---
  async getInventoryMovements() {
    if (this.useSupabase) {
      try {
        const { data, error } = await this.supabase
          .from("inventory_movements")
          .select("*, products(name)")
          .order("created_at", { ascending: false });

        if (!error && data) {
          return data.map(m => ({
            id: m.id,
            productId: m.product_id,
            productName: m.products ? m.products.name : 'Producto',
            changeQuantity: m.change_quantity,
            type: m.type,
            notes: m.notes,
            createdAt: new Date(m.created_at).toLocaleString("es-PY")
          }));
        }
      } catch (err) {
        console.warn("Supabase fetch inventory_movements failed:", err);
      }
    }

    const local = this.getLocalData();
    return local.inventoryMovements || [];
  }

  async addInventoryMovement(movement) {
    const local = this.getLocalData();
    const newMovement = {
      id: 'im-' + Date.now(),
      productId: movement.productId,
      productName: movement.productName,
      changeQuantity: movement.changeQuantity,
      type: movement.type,
      notes: movement.notes || '',
      createdAt: new Date().toLocaleString("es-PY")
    };
    local.inventoryMovements = [newMovement, ...(local.inventoryMovements || [])];
    this.saveLocalData(local);

    if (this.useSupabase) {
      try {
        await this.supabase.from("inventory_movements").insert({
          product_id: movement.productId,
          change_quantity: movement.changeQuantity,
          type: movement.type || 'supplier_restock',
          notes: movement.notes || ''
        });
      } catch (e) {
        console.error("Supabase inventory movement insert error:", e);
      }
    }
  }

  // --- ORDERS ---
  async getOrders() {
    const local = this.getLocalData();
    return local.orders || [];
  }

  async saveOrder(orderData) {
    const local = this.getLocalData();
    const orderNumber = 1024 + (local.orders ? local.orders.length : 0) + 1;
    const newOrder = {
      ...orderData,
      id: 'ord-' + Date.now(),
      orderNumber: orderNumber,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    local.orders = [newOrder, ...(local.orders || [])];

    // Deduct product stock and log inventory movement
    orderData.items.forEach(item => {
      const product = local.products.find(p => p.id === item.productId);
      if (product) {
        product.stock = Math.max(0, product.stock - item.quantity);
        this.addInventoryMovement({
          productId: product.id,
          productName: product.name,
          changeQuantity: -item.quantity,
          type: 'order_sale',
          notes: `Pedido #${orderNumber}`
        });
      }
    });

    this.saveLocalData(local);

    if (this.useSupabase) {
      try {
        await this.supabase.from("orders").insert({
          order_number: orderNumber,
          customer_name: orderData.customerName,
          customer_phone: orderData.customerPhone,
          shipping_address: orderData.shippingAddress,
          city: orderData.city,
          notes: orderData.notes,
          subtotal: orderData.subtotal,
          shipping_cost: orderData.shippingCost,
          discount_amount: orderData.discountAmount,
          coupon_code: orderData.couponCode,
          total: orderData.total,
          payment_method: orderData.paymentMethod,
          status: 'pending'
        });
      } catch (e) {
        console.warn("Supabase order insert error:", e);
      }
    }

    return newOrder;
  }

  async updateOrderStatus(orderId, newStatus) {
    const local = this.getLocalData();
    const order = local.orders.find(o => o.id === orderId);
    if (order) {
      order.status = newStatus;
      this.saveLocalData(local);
    }
    return order;
  }

  // --- DISCOUNTS & COUPONS ---
  async getCoupons() {
    const local = this.getLocalData();
    return local.coupons || [];
  }

  async saveCoupon(couponData) {
    const local = this.getLocalData();
    const newCoupon = {
      ...couponData,
      id: couponData.id || 'cp-' + Date.now(),
      usedCount: couponData.usedCount || 0,
      code: couponData.code.toUpperCase().trim()
    };

    const idx = local.coupons.findIndex(c => c.id === newCoupon.id || c.code === newCoupon.code);
    if (idx !== -1) {
      local.coupons[idx] = { ...local.coupons[idx], ...newCoupon };
    } else {
      local.coupons.push(newCoupon);
    }

    this.saveLocalData(local);
    return newCoupon;
  }

  async getDiscounts() {
    const local = this.getLocalData();
    return local.discounts || [];
  }

  async saveDiscount(discountData) {
    const local = this.getLocalData();
    const newDiscount = {
      ...discountData,
      id: discountData.id || 'disc-' + Date.now()
    };
    local.discounts = [newDiscount, ...(local.discounts || [])];
    this.saveLocalData(local);
    return newDiscount;
  }

  // --- CUSTOMERS ---
  async getCustomers() {
    const local = this.getLocalData();
    return local.customers || [];
  }
}

// Global Singleton Instance
window.ZyLogixDB = new ZyLogixDBService();
