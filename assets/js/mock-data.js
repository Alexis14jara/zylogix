/**
 * ZyLogix — Seed & Mock Data Store
 * Provides initial state for offline/demo operation and local storage synchronization
 * All UUIDs follow PostgreSQL UUID v4 hex standard [0-9a-f]
 */

const INITIAL_MOCK_DATA = {
  categories: [
    { id: 'c1111111-1111-1111-1111-111111111111', name: 'Smartwatches & Wearables', slug: 'smartwatches', description: 'Relojes inteligentes, bandas deportivas y accesorios de última generación.', icon: '⌚' },
    { id: 'c2222222-2222-2222-2222-222222222222', name: 'Periféricos & Audio', slug: 'perifericos-audio', description: 'Teclados mecánicos, mouses de alta precisión y auriculares premium.', icon: '🎧' },
    { id: 'c3333333-3333-3333-3333-333333333333', name: 'Accesorios & Carga', slug: 'accesorios-carga', description: 'Cables reforzados, cargadores GaN ultra rápidos, hubs multiporta.', icon: '⚡' },
    { id: 'c4444444-4444-4444-4444-444444444444', name: 'Tecnología Portátil', slug: 'tecnologia-portatil', description: 'Powerbanks de alta velocidad, soportes ergonómicos de aluminio.', icon: '💻' }
  ],

  brands: [
    { id: 'b1111111-1111-1111-1111-111111111111', name: 'Haylou', slug: 'haylou' },
    { id: 'b2222222-2222-2222-2222-222222222222', name: 'Logitech', slug: 'logitech' },
    { id: 'b3333333-3333-3333-3333-333333333333', name: 'Keychron', slug: 'keychron' },
    { id: 'b4444444-4444-4444-4444-444444444444', name: 'Anker', slug: 'anker' },
    { id: 'b5555555-5555-5555-5555-555555555555', name: 'Sony', slug: 'sony' }
  ],

  products: [
    {
      id: 'a1111111-1111-1111-1111-111111111111',
      name: 'Smartwatch Haylou RS4 Plus',
      slug: 'haylou-rs4-plus',
      shortDescription: 'Smartwatch AMOLED HD 1.78" con 105 modos deportivos, monitor de salud SpO2 y batería duradera.',
      fullDescription: 'El Haylou RS4 Plus cuenta con pantalla Retina AMOLED táctil de 1.78 pulgadas con resolución 368x448 px y 60Hz de refresco. Posee correa magnética rápida, resistencia al agua IP68 y batería de hasta 12 días de uso continuo.',
      price: 380000,
      oldPrice: 475000,
      cost: 240000,
      stock: 15,
      minStock: 5,
      sku: 'ZY-HRS4-PLS',
      categoryId: 'c1111111-1111-1111-1111-111111111111',
      categoryName: 'Smartwatches & Wearables',
      brandId: 'b1111111-1111-1111-1111-111111111111',
      brandName: 'Haylou',
      status: 'active',
      isFeatured: true,
      isOffer: true,
      discountPercentage: 20,
      images: [
        'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80'
      ],
      features: [
        { name: 'Pantalla', value: '1.78" Retina AMOLED (368x448 px, 60Hz)' },
        { name: 'Bluetooth', value: '5.3 Ultra estable' },
        { name: 'Resistencia', value: 'IP68 (Resistente al agua y polvo)' },
        { name: 'Batería', value: 'Hasta 12 días de uso continuo' },
        { name: 'Compatibilidad', value: 'Android 6.0+ / iOS 11.0+' }
      ],
      createdAt: '2026-08-25T10:00:00Z'
    },
    {
      id: 'a2222222-2222-2222-2222-222222222222',
      name: 'Mouse Logitech G502 HERO',
      slug: 'logitech-g502-hero',
      shortDescription: 'Mouse gamer de alto rendimiento con sensor HERO 25K, 11 botones programables y pesos ajustables.',
      fullDescription: 'Equipado con el sensor óptico de última generación HERO 25K para máxima precisión de seguimiento sin aceleración. Incluye 5 pesas de 3.6g ajustables y respuesta ultrarrápida de 1ms.',
      price: 320000,
      oldPrice: 390000,
      cost: 210000,
      stock: 3, // Low stock example
      minStock: 5,
      sku: 'ZY-LOG-G502',
      categoryId: 'c2222222-2222-2222-2222-222222222222',
      categoryName: 'Periféricos & Audio',
      brandId: 'b2222222-2222-2222-2222-222222222222',
      brandName: 'Logitech',
      status: 'active',
      isFeatured: true,
      isOffer: true,
      discountPercentage: 18,
      images: [
        'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&auto=format&fit=crop&q=80'
      ],
      features: [
        { name: 'Sensor', value: 'HERO 25K (100 a 25.600 DPI)' },
        { name: 'Botones', value: '11 botones totalmente programables' },
        { name: 'Iluminación', value: 'LIGHTSYNC RGB' },
        { name: 'Cable', value: 'Trenzados reforzados de 2.1 m' }
      ],
      createdAt: '2026-08-26T14:30:00Z'
    },
    {
      id: 'a3333333-3333-3333-3333-333333333333',
      name: 'Teclado Mecánico Keychron K2 Wireless',
      slug: 'keychron-k2-v2',
      shortDescription: 'Teclado mecánico compacto 75% Bluetooth / USB-C para Mac y Windows con interruptores Gateron Brown.',
      fullDescription: 'Keychron K2 es un teclado mecánico inalámbrico con retroiluminación RGB, batería de 4000 mAh que ofrece hasta 72 horas de escritura y compatibilidad nativa con Mac/iOS y Windows/Android.',
      price: 690000,
      oldPrice: 750000,
      cost: 480000,
      stock: 8,
      minStock: 3,
      sku: 'ZY-KEY-K2V2',
      categoryId: 'c2222222-2222-2222-2222-222222222222',
      categoryName: 'Periféricos & Audio',
      brandId: 'b3333333-3333-3333-3333-333333333333',
      brandName: 'Keychron',
      status: 'active',
      isFeatured: true,
      isOffer: false,
      discountPercentage: 0,
      images: [
        'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1595225476474-87563907a212?w=800&auto=format&fit=crop&q=80'
      ],
      features: [
        { name: 'Layout', value: '75% compacto (84 teclas)' },
        { name: 'Switches', value: 'Gateron G-Pro Brown Táctiles' },
        { name: 'Conectividad', value: 'Bluetooth 5.1 & USB Tipo-C' },
        { name: 'Batería', value: '4000 mAh (Hasta 72h con RGB)' }
      ],
      createdAt: '2026-08-27T11:15:00Z'
    },
    {
      id: 'a4444444-4444-4444-4444-444444444444',
      name: 'Auriculares Inalámbricos Sony WH-1000XM5',
      slug: 'sony-wh1000xm5',
      shortDescription: 'Auriculares circumaurales con la mejor cancelación de ruido de la industria y calidad de llamada HD.',
      fullDescription: 'Con dos procesadores y ocho micrófonos para una cancelación de ruido sin precedentes. Controlador de 30 mm diseñado con precisión y batería de 30 horas con carga rápida.',
      price: 2150000,
      oldPrice: 2400000,
      cost: 1600000,
      stock: 2, // Low stock
      minStock: 3,
      sku: 'ZY-SNY-XM5',
      categoryId: 'c2222222-2222-2222-2222-222222222222',
      categoryName: 'Periféricos & Audio',
      brandId: 'b5555555-5555-5555-5555-555555555555',
      brandName: 'Sony',
      status: 'active',
      isFeatured: true,
      isOffer: true,
      discountPercentage: 10,
      images: [
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80'
      ],
      features: [
        { name: 'Cancelación de Ruido', value: 'Procesador V1 + QN1 HD' },
        { name: 'Batería', value: 'Hasta 30 horas con ANC encendido' },
        { name: 'Carga Rápida', value: '3 min de carga = 3 horas de audio' },
        { name: 'Codecs', value: 'LDAC, AAC, SBC, Hi-Res Wireless' }
      ],
      createdAt: '2026-08-28T09:00:00Z'
    },
    {
      id: 'a5555555-5555-5555-5555-555555555555',
      name: 'Hub USB-C Anker PowerExpand 7-en-1',
      slug: 'anker-hub-7in1',
      shortDescription: 'Adaptador multiporta USB-C 4K HDMI, carga rápida Power Delivery 100W, lectores SD/TF y USB 3.0.',
      fullDescription: 'Convierte un solo puerto USB-C en 7 puertos de alta velocidad: HDMI 4K@60Hz, passthrough Power Delivery 100W, 2 puertos USB-A 3.0 y ranuras para tarjetas SD y MicroSD.',
      price: 290000,
      oldPrice: 340000,
      cost: 175000,
      stock: 18,
      minStock: 5,
      sku: 'ZY-ANK-HUB7',
      categoryId: 'c3333333-3333-3333-3333-333333333333',
      categoryName: 'Accesorios & Carga',
      brandId: 'b4444444-4444-4444-4444-444444444444',
      brandName: 'Anker',
      status: 'active',
      isFeatured: false,
      isOffer: false,
      discountPercentage: 0,
      images: [
        'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80'
      ],
      features: [
        { name: 'Salida de Video', value: 'HDMI 4K @ 60Hz' },
        { name: 'Power Delivery', value: 'Passthrough 100W' },
        { name: 'Transferencia', value: 'USB 3.0 hasta 5 Gbps' }
      ],
      createdAt: '2026-08-29T16:20:00Z'
    }
  ],

  coupons: [
    {
      id: 'cp111111-1111-1111-1111-111111111111',
      code: 'ZYLO10',
      discountPercentage: 10,
      discountAmount: null,
      minPurchase: 100000,
      maxUses: 100,
      usedCount: 14,
      expiresAt: '2026-09-30',
      isActive: true
    },
    {
      id: 'cp222222-2222-2222-2222-222222222222',
      code: 'LANZAMIENTO',
      discountPercentage: 15,
      discountAmount: null,
      minPurchase: 250000,
      maxUses: 50,
      usedCount: 8,
      expiresAt: '2026-09-15',
      isActive: true
    }
  ],

  discounts: [
    {
      id: 'd1111111-1111-1111-1111-111111111111',
      name: 'Oferta de lanzamiento',
      type: 'percentage',
      value: 20,
      appliesTo: 'product',
      targetId: 'a1111111-1111-1111-1111-111111111111',
      targetName: 'Smartwatch Haylou RS4 Plus',
      startDate: '2026-08-30',
      endDate: '2026-09-10',
      showAsOffer: true
    }
  ],

  inventoryMovements: [
    { id: 'im111111-1111-1111-1111-111111111111', productId: 'a2222222-2222-2222-2222-222222222222', productName: 'Mouse Logitech G502 HERO', changeQuantity: 20, type: 'supplier_restock', notes: 'Compra de proveedor inicial', createdAt: '2026-08-20 10:00' },
    { id: 'im222222-2222-2222-2222-222222222222', productId: 'a2222222-2222-2222-2222-222222222222', productName: 'Mouse Logitech G502 HERO', changeQuantity: -2, type: 'order_sale', notes: 'Pedido #1024', createdAt: '2026-08-22 14:15' },
    { id: 'im333333-3333-3333-3333-333333333333', productId: 'a2222222-2222-2222-2222-222222222222', productName: 'Mouse Logitech G502 HERO', changeQuantity: -1, type: 'order_sale', notes: 'Pedido #1028', createdAt: '2026-08-25 18:30' },
    { id: 'im444444-4444-4444-4444-444444444444', productId: 'a2222222-2222-2222-2222-222222222222', productName: 'Mouse Logitech G502 HERO', changeQuantity: 10, type: 'supplier_restock', notes: 'Reposición de stock', createdAt: '2026-08-28 09:45' },
    { id: 'im555555-5555-5555-5555-555555555555', productId: 'a1111111-1111-1111-1111-111111111111', productName: 'Smartwatch Haylou RS4 Plus', changeQuantity: 15, type: 'supplier_restock', notes: 'Lote importación Haylou', createdAt: '2026-08-29 11:20' }
  ],

  orders: [
    {
      id: 'ord-1024',
      orderNumber: 1024,
      customerName: 'Juan Pérez',
      customerEmail: 'juan.perez@gmail.com',
      customerPhone: '0981 123 456',
      shippingAddress: 'Av. Mariscal López 1450',
      city: 'Asunción',
      notes: 'Llamar antes de entregar',
      subtotal: 420000,
      shippingCost: 20000,
      discountAmount: 0,
      couponCode: null,
      total: 440000,
      paymentMethod: 'Transferencia bancaria',
      status: 'shipped',
      createdAt: '2026-08-28T14:30:00Z',
      items: [
        { productId: 'a2222222-2222-2222-2222-222222222222', name: 'Mouse Logitech G502 HERO', price: 320000, quantity: 1, subtotal: 320000 },
        { productId: 'a5555555-5555-5555-5555-555555555555', name: 'Hub USB-C Anker PowerExpand', price: 100000, quantity: 1, subtotal: 100000 }
      ]
    },
    {
      id: 'ord-1028',
      orderNumber: 1028,
      customerName: 'Maria González',
      customerEmail: 'maria.gonzalez@hotmail.com',
      customerPhone: '0971 888 999',
      shippingAddress: 'Pitiantuta 420',
      city: 'Fernando de la Mora',
      notes: '',
      subtotal: 380000,
      shippingCost: 20000,
      discountAmount: 38000,
      couponCode: 'ZYLO10',
      total: 362000,
      paymentMethod: 'Efectivo contra entrega',
      status: 'pending',
      createdAt: '2026-08-30T09:15:00Z',
      items: [
        { productId: 'a1111111-1111-1111-1111-111111111111', name: 'Smartwatch Haylou RS4 Plus', price: 380000, quantity: 1, subtotal: 380000 }
      ]
    }
  ],

  customers: [
    { id: 'usr-1', name: 'Juan Pérez', email: 'juan.perez@gmail.com', phone: '0981 123 456', city: 'Asunción', ordersCount: 2, totalSpent: 780000, joinedAt: '2026-08-15' },
    { id: 'usr-2', name: 'Maria González', email: 'maria.gonzalez@hotmail.com', phone: '0971 888 999', city: 'Fernando de la Mora', ordersCount: 1, totalSpent: 362000, joinedAt: '2026-08-20' },
    { id: 'usr-3', name: 'Carlos Benítez', email: 'carlos.benitez@gmail.com', phone: '0982 555 444', city: 'San Lorenzo', ordersCount: 3, totalSpent: 1450000, joinedAt: '2026-08-22' }
  ]
};

window.INITIAL_MOCK_DATA = INITIAL_MOCK_DATA;
