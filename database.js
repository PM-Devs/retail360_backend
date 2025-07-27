//database.js


import mongoose from 'mongoose';
import dotenv from 'dotenv';


dotenv.config();
// Connection to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.Database_Url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Enhanced User Schema with Master Shop concept
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  phone: {
    type: String,
    required: true,
    unique: true
  },
  whatsappNumber: {
    type: String,
    required: false
  },
  role: {
    type: String,
    enum: ['owner', 'manager', 'staff'],
    default: 'owner'
  },
  // Master shop - the primary shop that connects all other shops
  masterShop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    default: null
  },
  // Array of shops the user owns (not just has access to)
  ownedShops: [{
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: true
    },
    isMaster: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  // Array of shops the user has access to (including owned shops)
  shops: [{
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: true
    },
    role: {
      type: String,
      enum: ['owner', 'manager', 'staff'],
      default: 'staff'
    },
    permissions: [{
      type: String,
      enum: ['inventory', 'sales', 'reports', 'settings', 'users', 'customers', 'refunds']
    }],
    isActive: {
      type: Boolean,
      default: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Current active shop for the session
  currentShop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop'
  },
  // Financial tracking across shops
  financials: {
    totalOwed: {
      type: Number,
      default: 0
    },
    // Debt owed to each shop
    shopDebts: [{
      shopId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop'
      },
      amountOwed: {
        type: Number,
        default: 0
      },
      lastUpdated: {
        type: Date,
        default: Date.now
      }
    }],
    // Consolidated financial summary
    masterShopBalance: {
      type: Number,
      default: 0
    }
  },
  // Enhanced permissions for backward compatibility
  globalPermissions: {
    canViewReports: { type: Boolean, default: false },
    canManageInventory: { type: Boolean, default: false },
    canManageStaff: { type: Boolean, default: false },
    canViewProfits: { type: Boolean, default: false },
    canProcessRefunds: { type: Boolean, default: false },
    canManageCustomers: { type: Boolean, default: false },
    canManageMasterShop: { type: Boolean, default: false }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpiry: Date,
  profileImage: {
    type: String,
    default: null
  },
  preferences: {
    language: {
      type: String,
      default: 'en'
    },
    currency: {
      type: String,
      default: 'USD'
    },
    timezone: {
      type: String,
      default: 'UTC'
    }
  }
}, {
  timestamps: true
});

// Enhanced Shop Schema with Master Shop connections
const shopSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  address: {
    street: String,
    city: String,
    region: String,
    country: { type: String, default: 'Ghana' }
  },
  phone: {
    type: String,
    required: true
  },
  email: {
    type: String,
    lowercase: true
  },
  // Primary owner of the shop
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Master shop relationship
  masterShop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    default: null
  },
  // Child shops connected to this master shop
  connectedShops: [{
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop'
    },
    connectionType: {
      type: String,
      enum: ['branch', 'subsidiary', 'partner'],
      default: 'branch'
    },
    connectedAt: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    },
    // Financial relationship
    financialSettings: {
      shareRevenue: { type: Boolean, default: false },
      consolidateReports: { type: Boolean, default: true },
      sharedInventory: { type: Boolean, default: false }
    }
  }],
  // Shop hierarchy level
  shopLevel: {
    type: String,
    enum: ['master', 'branch', 'independent'],
    default: 'independent'
  },
  // All users associated with this shop
  users: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['owner', 'manager', 'staff'],
      default: 'staff'
    },
    permissions: [{
      type: String,
      enum: ['inventory', 'sales', 'reports', 'settings', 'users']
    }],
    addedAt: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  businessType: {
    type: String,
    enum: ['mini-mart', 'provision-store', 'supermarket', 'cosmetic-shop', 'spare-parts', 'boutique', 'other'],
    required: true
  },
  currency: {
    type: String,
    default: 'GHS'
  },
  subscriptionPlan: {
    type: String,
    enum: ['free', 'pro', 'enterprise'],
    default: 'free'
  },
  subscriptionExpiry: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  },
  // Financial tracking for the shop
  financials: {
    totalRevenue: { type: Number, default: 0 },
    totalExpenses: { type: Number, default: 0 },
    totalDebt: { type: Number, default: 0 },
    // Cross-shop transactions
    interShopTransactions: [{
      withShop: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop'
      },
      amount: Number,
      type: {
        type: String,
        enum: ['transfer', 'loan', 'payment', 'revenue_share']
      },
      description: String,
      date: {
        type: Date,
        default: Date.now
      }
    }]
  },
  settings: {
    enableLoyaltyProgram: { type: Boolean, default: false },
    enableWhatsAppReports: { type: Boolean, default: true },
    enableSMSReceipts: { type: Boolean, default: false },
    autoBackup: { type: Boolean, default: true },
    lowStockThreshold: { type: Number, default: 10 },
    receiptTemplate: String,
    taxRate: { type: Number, default: 0 },
    // Master shop settings
    consolidateReports: { type: Boolean, default: false },
    shareInventoryWithMaster: { type: Boolean, default: false },
    allowMasterShopAccess: { type: Boolean, default: true }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// New Schema for tracking cross-shop transactions and debts
const crossShopTransactionSchema = new mongoose.Schema({
  fromShop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true
  },
  toShop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  masterShop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop'
  },
  transactionType: {
    type: String,
    enum: ['debt', 'payment', 'transfer', 'loan', 'revenue_share'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'GHS'
  },
  description: String,
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled'],
    default: 'pending'
  },
  metadata: {
    invoiceNumber: String,
    reference: String,
    dueDate: Date,
    paymentMethod: String
  }
}, {
  timestamps: true
});

// Enhanced User Methods for Master Shop functionality
userSchema.methods.setMasterShop = function(shopId) {
  this.masterShop = shopId;
  
  // Update the ownedShops array to mark the master shop
  this.ownedShops.forEach(shop => {
    shop.isMaster = shop.shopId.toString() === shopId.toString();
  });
  
  return this.save();
};

userSchema.methods.getMasterShop = function() {
  return this.masterShop;
};

userSchema.methods.getAllConnectedShops = async function() {
  if (!this.masterShop) {
    return this.ownedShops;
  }
  
  // Get the master shop and all its connected shops
  const masterShop = await Shop.findById(this.masterShop).populate('connectedShops.shopId');
  
  const allShops = [masterShop];
  if (masterShop.connectedShops) {
    masterShop.connectedShops.forEach(connected => {
      if (connected.isActive) {
        allShops.push(connected.shopId);
      }
    });
  }
  
  return allShops;
};

userSchema.methods.getTotalDebtAcrossShops = function() {
  return this.financials.shopDebts.reduce((total, debt) => total + debt.amountOwed, 0);
};

userSchema.methods.getDebtForShop = function(shopId) {
  const shopDebt = this.financials.shopDebts.find(
    debt => debt.shopId.toString() === shopId.toString()
  );
  return shopDebt ? shopDebt.amountOwed : 0;
};

userSchema.methods.updateShopDebt = function(shopId, amount) {
  const existingDebt = this.financials.shopDebts.find(
    debt => debt.shopId.toString() === shopId.toString()
  );
  
  if (existingDebt) {
    existingDebt.amountOwed = amount;
    existingDebt.lastUpdated = new Date();
  } else {
    this.financials.shopDebts.push({
      shopId: shopId,
      amountOwed: amount,
      lastUpdated: new Date()
    });
  }
  
  // Update total owed
  this.financials.totalOwed = this.getTotalDebtAcrossShops();
  
  return this.save();
};

// Enhanced Shop Methods for Master Shop functionality
shopSchema.methods.setAsMasterShop = function() {
  this.shopLevel = 'master';
  this.masterShop = null; // Master shop doesn't have a parent
  return this.save();
};

shopSchema.methods.connectToMasterShop = function(masterShopId, connectionType = 'branch') {
  this.masterShop = masterShopId;
  this.shopLevel = 'branch';
  
  return this.save();
};

shopSchema.methods.addConnectedShop = function(shopId, connectionType = 'branch', financialSettings = {}) {
  // Check if already connected
  const existingConnection = this.connectedShops.find(
    conn => conn.shopId.toString() === shopId.toString()
  );
  
  if (!existingConnection) {
    this.connectedShops.push({
      shopId: shopId,
      connectionType: connectionType,
      connectedAt: new Date(),
      isActive: true,
      financialSettings: {
        shareRevenue: financialSettings.shareRevenue || false,
        consolidateReports: financialSettings.consolidateReports || true,
        sharedInventory: financialSettings.sharedInventory || false
      }
    });
  }
  
  return this.save();
};

shopSchema.methods.getConnectedShops = function(activeOnly = true) {
  if (activeOnly) {
    return this.connectedShops.filter(shop => shop.isActive);
  }
  return this.connectedShops;
};

shopSchema.methods.getTotalNetworkRevenue = async function() {
  let totalRevenue = this.financials.totalRevenue || 0;
  
  // Add revenue from connected shops that share revenue
  for (const connection of this.connectedShops) {
    if (connection.isActive && connection.financialSettings.shareRevenue) {
      const connectedShop = await Shop.findById(connection.shopId);
      if (connectedShop) {
        totalRevenue += connectedShop.financials.totalRevenue || 0;
      }
    }
  }
  
  return totalRevenue;
};

const CrossShopTransaction = mongoose.model('CrossShopTransaction', crossShopTransactionSchema);



// Category Schema
const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true
  },
  parentCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Product Schema
const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  barcode: {
    type: String,
    unique: true,
    sparse: true
  },
  qrCode: {
    type: String,
    unique: true,
    required: true
  },
  sku: {
    type: String,
    required: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true
  },
  pricing: {
    costPrice: {
      type: Number,
      required: true,
      min: 0
    },
    sellingPrice: {
      type: Number,
      required: true,
      min: 0
    },
    wholesalePrice: {
      type: Number,
      min: 0
    },
    discountPrice: {
      type: Number,
      min: 0
    }
  },
  stock: {
    currentQuantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    minQuantity: {
      type: Number,
      required: true,
      min: 0,
      default: 5
    },
    maxQuantity: {
      type: Number,
      min: 0
    },
    reorderLevel: {
      type: Number,
      min: 0,
      default: 10
    }
  },
  unitOfMeasure: {
    type: String,
    enum: ['piece', 'sachet', 'bottle', 'kilo', 'gram', 'liter', 'meter', 'pack', 'carton', 'dozen'],
    default: 'piece'
  },
  variants: [{
    name: String,
    price: Number,
    quantity: Number,
    sku: String
  }],
  images: [{
    url: String,
    alt: String
  }],
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier'
  },
  tags: [String],
  isActive: {
    type: Boolean,
    default: true
  },
  trackStock: {
    type: Boolean,
    default: true
  },
  expiryDate: {
    type: Date
  },
  batchNumber: {
    type: String
  }
}, {
  timestamps: true
});

// Customer Schema
const customerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true
  },
  email: {
    type: String,
    lowercase: true
  },
  address: {
    street: String,
    city: String,
    region: String
  },
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true
  },
  loyalty: {
    points: {
      type: Number,
      default: 0
    },
    totalSpent: {
      type: Number,
      default: 0
    },
    lastVisit: {
      type: Date,
      default: Date.now
    },
    membershipTier: {
      type: String,
      enum: ['bronze', 'silver', 'gold', 'platinum'],
      default: 'bronze'
    }
  },
  preferences: {
    whatsappUpdates: { type: Boolean, default: false },
    smsUpdates: { type: Boolean, default: false },
    emailUpdates: { type: Boolean, default: false }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Sale Schema
const saleSchema = new mongoose.Schema({
  saleNumber: {
    type: String,
    required: true,
    unique: true
  },
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true
  },
  cashier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    productName: String,
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0
    },
    discount: {
      type: Number,
      default: 0,
      min: 0
    },
    qrCodeUsed: {
      type: Boolean,
      default: false
    }
  }],
  payment: {
    method: {
      type: String,
      enum: ['cash', 'momo', 'card', 'credit'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'completed'
    },
    reference: String,
    momoProvider: {
      type: String,
      enum: ['mtn', 'vodafone', 'airteltigo']
    }
  },
  totals: {
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    discount: {
      type: Number,
      default: 0,
      min: 0
    },
    tax: {
      type: Number,
      default: 0,
      min: 0
    },
    total: {
      type: Number,
      required: true,
      min: 0
    }
  },
  loyaltyPointsEarned: {
    type: Number,
    default: 0
  },
  loyaltyPointsUsed: {
    type: Number,
    default: 0
  },
  receiptSent: {
    whatsapp: { type: Boolean, default: false },
    sms: { type: Boolean, default: false },
    email: { type: Boolean, default: false }
  },
  isOnline: {
    type: Boolean,
    default: true
  },
  syncedAt: {
    type: Date,
    default: Date.now
  },
  notes: String
}, {
  timestamps: true
});

// Supplier Schema
const supplierSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  contactPerson: {
    type: String,
    trim: true
  },
  phone: {
    type: String,
    required: true
  },
  email: {
    type: String,
    lowercase: true
  },
  address: {
    street: String,
    city: String,
    region: String,
    country: { type: String, default: 'Ghana' }
  },
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true
  },
  products: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  paymentTerms: {
    type: String,
    enum: ['cash', 'credit-7', 'credit-14', 'credit-30', 'credit-60'],
    default: 'cash'
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Stock Movement Schema
const stockMovementSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true
  },
  type: {
    type: String,
    enum: ['in', 'out', 'adjustment', 'transfer', 'return'],
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  previousQuantity: {
    type: Number,
    required: true
  },
  newQuantity: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    enum: ['purchase', 'sale', 'adjustment', 'damage', 'expiry', 'theft', 'return', 'transfer'],
    required: true
  },
  reference: {
    type: String // Could be sale ID, purchase ID, etc.
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notes: String,
  cost: {
    type: Number,
    min: 0
  }
}, {
  timestamps: true
});

// Daily Report Schema
const dailyReportSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true
  },
  sales: {
    totalSales: {
      type: Number,
      default: 0
    },
    totalTransactions: {
      type: Number,
      default: 0
    },
    totalRevenue: {
      type: Number,
      default: 0
    },
    totalProfit: {
      type: Number,
      default: 0
    },
    cashSales: {
      type: Number,
      default: 0
    },
    momoSales: {
      type: Number,
      default: 0
    },
    cardSales: {
      type: Number,
      default: 0
    }
  },
  products: {
    totalProducts: {
      type: Number,
      default: 0
    },
    lowStockProducts: {
      type: Number,
      default: 0
    },
    outOfStockProducts: {
      type: Number,
      default: 0
    }
  },
  customers: {
    totalCustomers: {
      type: Number,
      default: 0
    },
    newCustomers: {
      type: Number,
      default: 0
    },
    loyaltyPointsIssued: {
      type: Number,
      default: 0
    }
  },
  topProducts: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    productName: String,
    quantitySold: Number,
    revenue: Number
  }],
  whatsappSent: {
    type: Boolean,
    default: false
  },
  generatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Notification Schema
const notificationSchema = new mongoose.Schema({
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  type: {
    type: String,
    enum: ['low-stock', 'out-of-stock', 'daily-report', 'payment-due', 'system-update'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  channel: {
    type: String,
    enum: ['whatsapp', 'sms', 'email', 'push'],
    default: 'push'
  },
  sentAt: {
    type: Date
  },
  metadata: {
    type: Object,
    default: {}
  }
}, {
  timestamps: true
});

// Discount/Promo Schema
const discountSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: true
  },
  type: {
    type: String,
    enum: ['percentage', 'fixed-amount', 'buy-x-get-y'],
    required: true
  },
  value: {
    type: Number,
    required: true,
    min: 0
  },
  applicableProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  applicableCategories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  minimumPurchase: {
    type: Number,
    default: 0
  },
  maximumDiscount: {
    type: Number
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  usageLimit: {
    type: Number,
    default: null
  },
  usageCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Create indexes for better performance
userSchema.index({ email: 1, shopId: 1 });
productSchema.index({ shopId: 1, qrCode: 1 });
productSchema.index({ shopId: 1, barcode: 1 });
saleSchema.index({ shopId: 1, createdAt: -1 });
stockMovementSchema.index({ product: 1, createdAt: -1 });
dailyReportSchema.index({ shopId: 1, date: -1 });
customerSchema.index({ shopId: 1, phone: 1 });

// Create models
const User = mongoose.model('User', userSchema);
const Shop = mongoose.model('Shop', shopSchema);
const Category = mongoose.model('Category', categorySchema);
const Product = mongoose.model('Product', productSchema);
const Customer = mongoose.model('Customer', customerSchema);
const Sale = mongoose.model('Sale', saleSchema);
const Supplier = mongoose.model('Supplier', supplierSchema);
const StockMovement = mongoose.model('StockMovement', stockMovementSchema);
const DailyReport = mongoose.model('DailyReport', dailyReportSchema);
const Notification = mongoose.model('Notification', notificationSchema);
const Discount = mongoose.model('Discount', discountSchema);

// Helper functions for common operations
const helpers = {
  // Generate unique QR code for product
  generateQRCode: (shopId, productId) => {
    return `QR_${shopId}_${productId}_${Date.now()}`;
  },

  // Generate unique sale number
  generateSaleNumber: (shopId) => {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = date.getTime().toString().slice(-6);
    return `SALE_${shopId.toString().slice(-4)}_${dateStr}_${timeStr}`;
  },

  // Check if product is low stock
  isLowStock: (product) => {
    return product.stock.currentQuantity <= product.stock.minQuantity;
  },

  // Calculate product profit margin
  calculateProfitMargin: (costPrice, sellingPrice) => {
    return ((sellingPrice - costPrice) / sellingPrice) * 100;
  },

  // Generate SKU
  generateSKU: (categoryName, productName, shopId) => {
    const catCode = categoryName.substring(0, 3).toUpperCase();
    const prodCode = productName.substring(0, 3).toUpperCase();
    const shopCode = shopId.toString().slice(-3);
    const timestamp = Date.now().toString().slice(-4);
    return `${catCode}${prodCode}${shopCode}${timestamp}`;
  }
};


// Export models and connection function (ESM style)
export {
  connectDB,
CrossShopTransaction,
  User,
  helpers,
  Shop,
  Category,
  Product,
  Customer,
  Sale,
  Supplier,
  StockMovement,
  DailyReport,
  Notification,
  Discount
};
