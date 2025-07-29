//database.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
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

// Enhanced User Schema with Master Shop concept - FIXED for registration
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    trim: true
  },
  whatsappNumber: {
    type: String,
    required: false,
    trim: true
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
  // Array of shops the user owns (not just has access to) - FIXED: removed required
  ownedShops: [{
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: false // CHANGED: was true, causing registration failures
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
  // Array of shops the user has access to (including owned shops) - FIXED
  shops: [{
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: false // CHANGED: was implicitly required
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
    ref: 'Shop',
    default: null
  },
  // Financial tracking across shops - FIXED with proper defaults
  financials: {
    totalOwed: {
      type: Number,
      default: 0,
      min: 0
    },
    // Debt owed to each shop
    shopDebts: [{
      shopId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: false // CHANGED: prevent validation errors
      },
      amountOwed: {
        type: Number,
        default: 0,
        min: 0
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
  verificationToken: {
    type: String,
    default: null
  },
  resetPasswordToken: {
    type: String,
    default: null
  },
  resetPasswordExpiry: {
    type: Date,
    default: null
  },
  profileImage: {
    type: String,
    default: null
  },
  preferences: {
    language: {
      type: String,
      default: 'en',
      enum: ['en', 'es', 'fr', 'de', 'pt', 'it']
    },
    currency: {
      type: String,
      default: 'USD',
      enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'INR', 'BRL', 'MXN', 'GHS']
    },
    timezone: {
      type: String,
      default: 'UTC'
    }
  }
}, {
  timestamps: true
});

// Enhanced Shop Schema with Master Shop connections - FIXED
const shopSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Shop name is required'],
    trim: true,
    minlength: [2, 'Shop name must be at least 2 characters'],
    maxlength: [100, 'Shop name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  address: {
    street: {
      type: String,
      trim: true
    },
    city: {
      type: String,
      trim: true
    },
    region: {
      type: String,
      trim: true
    },
    country: { 
      type: String, 
      default: 'Ghana',
      trim: true
    }
  },
  phone: {
    type: String,
    required: [true, 'Shop phone is required'],
    trim: true
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  // Primary owner of the shop
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Shop owner is required']
  },
  // Master shop relationship
  masterShop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    default: null
  },
  // Child shops connected to this master shop - FIXED
  connectedShops: [{
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: false // CHANGED: prevent validation issues
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
  // All users associated with this shop - FIXED
  users: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false // CHANGED: prevent validation issues
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
    required: [true, 'Business type is required']
  },
  currency: {
    type: String,
    default: 'GHS',
    enum: ['GHS', 'USD', 'EUR', 'GBP', 'NGN', 'XOF', 'XAF']
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
  // Financial tracking for the shop - FIXED with proper defaults
  financials: {
    totalRevenue: { type: Number, default: 0, min: 0 },
    totalExpenses: { type: Number, default: 0, min: 0 },
    totalDebt: { type: Number, default: 0, min: 0 },
    // Cross-shop transactions
    interShopTransactions: [{
      withShop: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: false
      },
      amount: {
        type: Number,
        required: false,
        min: 0
      },
      type: {
        type: String,
        enum: ['transfer', 'loan', 'payment', 'revenue_share']
      },
      description: {
        type: String,
        trim: true
      },
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
    lowStockThreshold: { type: Number, default: 10, min: 0 },
    receiptTemplate: {
      type: String,
      trim: true
    },
    taxRate: { type: Number, default: 0, min: 0, max: 100 },
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

// New Schema for tracking cross-shop transactions and debts - FIXED
const crossShopTransactionSchema = new mongoose.Schema({
  fromShop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: [true, 'From shop is required']
  },
  toShop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: [true, 'To shop is required']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  masterShop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    default: null
  },
  transactionType: {
    type: String,
    enum: ['debt', 'payment', 'transfer', 'loan', 'revenue_share'],
    required: [true, 'Transaction type is required']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount must be positive']
  },
  currency: {
    type: String,
    default: 'GHS',
    enum: ['GHS', 'USD', 'EUR', 'GBP', 'NGN', 'XOF', 'XAF']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled'],
    default: 'pending'
  },
  metadata: {
    invoiceNumber: {
      type: String,
      trim: true
    },
    reference: {
      type: String,
      trim: true
    },
    dueDate: {
      type: Date
    },
    paymentMethod: {
      type: String,
      trim: true
    }
  }
}, {
  timestamps: true
});

// Category Schema - FIXED
const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    minlength: [2, 'Category name must be at least 2 characters'],
    maxlength: [50, 'Category name cannot exceed 50 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: [true, 'Shop ID is required']
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

// Product Schema - FIXED
const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    minlength: [2, 'Product name must be at least 2 characters'],
    maxlength: [100, 'Product name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  barcode: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  qrCode: {
    type: String,
    unique: true,
    required: [true, 'QR Code is required'],
    trim: true
  },
  sku: {
    type: String,
    required: [true, 'SKU is required'],
    trim: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Category is required']
  },
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: [true, 'Shop ID is required']
  },
  pricing: {
    costPrice: {
      type: Number,
      required: [true, 'Cost price is required'],
      min: [0, 'Cost price must be positive']
    },
    sellingPrice: {
      type: Number,
      required: [true, 'Selling price is required'],
      min: [0, 'Selling price must be positive']
    },
    wholesalePrice: {
      type: Number,
      min: [0, 'Wholesale price must be positive'],
      default: 0
    },
    discountPrice: {
      type: Number,
      min: [0, 'Discount price must be positive'],
      default: 0
    }
  },
  stock: {
    currentQuantity: {
      type: Number,
      required: [true, 'Current quantity is required'],
      min: [0, 'Quantity cannot be negative'],
      default: 0
    },
    minQuantity: {
      type: Number,
      required: [true, 'Minimum quantity is required'],
      min: [0, 'Minimum quantity cannot be negative'],
      default: 5
    },
    maxQuantity: {
      type: Number,
      min: [0, 'Maximum quantity cannot be negative']
    },
    reorderLevel: {
      type: Number,
      min: [0, 'Reorder level cannot be negative'],
      default: 10
    }
  },
  unitOfMeasure: {
    type: String,
    enum: ['piece', 'sachet', 'bottle', 'kilo', 'gram', 'liter', 'meter', 'pack', 'carton', 'dozen'],
    default: 'piece'
  },
  variants: [{
    name: {
      type: String,
      trim: true
    },
    price: {
      type: Number,
      min: 0
    },
    quantity: {
      type: Number,
      min: 0
    },
    sku: {
      type: String,
      trim: true
    }
  }],
  images: [{
    url: {
      type: String,
      trim: true
    },
    alt: {
      type: String,
      trim: true
    }
  }],
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier'
  },
  tags: [{
    type: String,
    trim: true
  }],
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
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Customer Schema - FIXED
const customerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  address: {
    street: {
      type: String,
      trim: true
    },
    city: {
      type: String,
      trim: true
    },
    region: {
      type: String,
      trim: true
    }
  },
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: [true, 'Shop ID is required']
  },
  loyalty: {
    points: {
      type: Number,
      default: 0,
      min: 0
    },
    totalSpent: {
      type: Number,
      default: 0,
      min: 0
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

// Sale Schema - FIXED
const saleSchema = new mongoose.Schema({
  saleNumber: {
    type: String,
    required: [true, 'Sale number is required'],
    unique: true,
    trim: true
  },
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: [true, 'Shop ID is required']
  },
  cashier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Cashier is required']
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product is required']
    },
    productName: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1']
    },
    unitPrice: {
      type: Number,
      required: [true, 'Unit price is required'],
      min: [0, 'Unit price must be positive']
    },
    totalPrice: {
      type: Number,
      required: [true, 'Total price is required'],
      min: [0, 'Total price must be positive']
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, 'Discount cannot be negative']
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
      required: [true, 'Payment method is required']
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'completed'
    },
    reference: {
      type: String,
      trim: true
    },
    momoProvider: {
      type: String,
      enum: ['mtn', 'vodafone', 'airteltigo']
    }
  },
  totals: {
    subtotal: {
      type: Number,
      required: [true, 'Subtotal is required'],
      min: [0, 'Subtotal must be positive']
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, 'Discount cannot be negative']
    },
    tax: {
      type: Number,
      default: 0,
      min: [0, 'Tax cannot be negative']
    },
    total: {
      type: Number,
      required: [true, 'Total is required'],
      min: [0, 'Total must be positive']
    }
  },
  loyaltyPointsEarned: {
    type: Number,
    default: 0,
    min: 0
  },
  loyaltyPointsUsed: {
    type: Number,
    default: 0,
    min: 0
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
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  }
}, {
  timestamps: true
});

// Supplier Schema - FIXED
const supplierSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Supplier name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  contactPerson: {
    type: String,
    trim: true,
    maxlength: [100, 'Contact person name cannot exceed 100 characters']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  address: {
    street: {
      type: String,
      trim: true
    },
    city: {
      type: String,
      trim: true
    },
    region: {
      type: String,
      trim: true
    },
    country: { 
      type: String, 
      default: 'Ghana',
      trim: true
    }
  },
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: [true, 'Shop ID is required']
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
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5'],
    default: 3
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Stock Movement Schema - FIXED
const stockMovementSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product is required']
  },
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: [true, 'Shop ID is required']
  },
  type: {
    type: String,
    enum: ['in', 'out', 'adjustment', 'transfer', 'return'],
    required: [true, 'Movement type is required']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required']
  },
  previousQuantity: {
    type: Number,
    required: [true, 'Previous quantity is required'],
    min: 0
  },
  newQuantity: {
    type: Number,
    required: [true, 'New quantity is required'],
    min: 0
  },
  reason: {
    type: String,
    enum: ['purchase', 'sale', 'adjustment', 'damage', 'expiry', 'theft', 'return', 'transfer'],
    required: [true, 'Reason is required']
  },
  reference: {
    type: String,
    trim: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  cost: {
    type: Number,
    min: [0, 'Cost cannot be negative'],
    default: 0
  }
}, {
  timestamps: true
});

// Daily Report Schema - FIXED
const dailyReportSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: [true, 'Date is required']
  },
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: [true, 'Shop ID is required']
  },
  sales: {
    totalSales: {
      type: Number,
      default: 0,
      min: 0
    },
    totalTransactions: {
      type: Number,
      default: 0,
      min: 0
    },
    totalRevenue: {
      type: Number,
      default: 0,
      min: 0
    },
    totalProfit: {
      type: Number,
      default: 0
    },
    cashSales: {
      type: Number,
      default: 0,
      min: 0
    },
    momoSales: {
      type: Number,
      default: 0,
      min: 0
    },
    cardSales: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  products: {
    totalProducts: {
      type: Number,
      default: 0,
      min: 0
    },
    lowStockProducts: {
      type: Number,
      default: 0,
      min: 0
    },
    outOfStockProducts: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  customers: {
    totalCustomers: {
      type: Number,
      default: 0,
      min: 0
    },
    newCustomers: {
      type: Number,
      default: 0,
      min: 0
    },
    loyaltyPointsIssued: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  topProducts: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    productName: {
      type: String,
      trim: true
    },
    quantitySold: {
      type: Number,
      min: 0
    },
    revenue: {
      type: Number,
      min: 0
    }
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

// Notification Schema - FIXED
const notificationSchema = new mongoose.Schema({
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: [true, 'Shop ID is required']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  type: {
    type: String,
    enum: ['low-stock', 'out-of-stock', 'daily-report', 'payment-due', 'system-update'],
    required: [true, 'Notification type is required']
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    maxlength: [500, 'Message cannot exceed 500 characters']
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

// Discount/Promo Schema - FIXED
const discountSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Discount name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  code: {
    type: String,
    required: [true, 'Discount code is required'],
    unique: true,
    uppercase: true,
    trim: true,
    minlength: [3, 'Code must be at least 3 characters'],
    maxlength: [20, 'Code cannot exceed 20 characters']
  },
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop',
    required: [true, 'Shop ID is required']
  },
  type: {
    type: String,
    enum: ['percentage', 'fixed-amount', 'buy-x-get-y'],
    required: [true, 'Discount type is required']
  },
  value: {
    type: Number,
    required: [true, 'Discount value is required'],
    min: [0, 'Value must be positive']
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
    default: 0,
    min: [0, 'Minimum purchase cannot be negative']
  },
  maximumDiscount: {
    type: Number,
    min: [0, 'Maximum discount cannot be negative']
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required'],
    validate: {
      validator: function(endDate) {
        return endDate > this.startDate;
      },
      message: 'End date must be after start date'
    }
  },
  usageLimit: {
    type: Number,
    min: [1, 'Usage limit must be at least 1']
  },
  usageCount: {
    type: Number,
    default: 0,
    min: [0, 'Usage count cannot be negative']
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Pre-save middleware for password hashing - ADDED
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
 
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Password comparison method - ADDED
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    const bcrypt = await import('bcryptjs');
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Generate verification token method - ADDED
userSchema.methods.generateVerificationToken = function() {
  
  const token = crypto.randomBytes(32).toString('hex');
  this.verificationToken = token;
  return token;
};

// Generate password reset token method - ADDED
userSchema.methods.generatePasswordResetToken = function() {

  const resetToken = crypto.randomBytes(32).toString('hex');
  
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  this.resetPasswordExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes
  
  return resetToken;
};

// Transform output to remove sensitive data - ADDED
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.verificationToken;
  delete userSchema.resetPasswordToken;
  delete userObject.resetPasswordExpiry;
  return userObject;
};

// Create indexes for better performance - ENHANCED
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ masterShop: 1 });
userSchema.index({ 'shops.shopId': 1 });

shopSchema.index({ owner: 1 });
shopSchema.index({ masterShop: 1 });
shopSchema.index({ businessType: 1 });
shopSchema.index({ isActive: 1 });
shopSchema.index({ createdAt: -1 });

productSchema.index({ shopId: 1, qrCode: 1 });
productSchema.index({ shopId: 1, barcode: 1 });
productSchema.index({ shopId: 1, sku: 1 });
productSchema.index({ shopId: 1, isActive: 1 });
productSchema.index({ category: 1 });

saleSchema.index({ shopId: 1, createdAt: -1 });
saleSchema.index({ cashier: 1 });
saleSchema.index({ customer: 1 });
saleSchema.index({ saleNumber: 1 });

stockMovementSchema.index({ product: 1, createdAt: -1 });
stockMovementSchema.index({ shopId: 1, createdAt: -1 });

dailyReportSchema.index({ shopId: 1, date: -1 });

customerSchema.index({ shopId: 1, phone: 1 });
customerSchema.index({ shopId: 1, isActive: 1 });

categorySchema.index({ shopId: 1, isActive: 1 });

supplierSchema.index({ shopId: 1, isActive: 1 });

notificationSchema.index({ shopId: 1, createdAt: -1 });
notificationSchema.index({ user: 1, isRead: 1 });

discountSchema.index({ shopId: 1, isActive: 1 });
discountSchema.index({ code: 1 });

crossShopTransactionSchema.index({ fromShop: 1, createdAt: -1 });
crossShopTransactionSchema.index({ toShop: 1, createdAt: -1 });
crossShopTransactionSchema.index({ masterShop: 1 });

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
  if (masterShop && masterShop.connectedShops) {
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
const CrossShopTransaction = mongoose.model('CrossShopTransaction', crossShopTransactionSchema);

// Helper functions for common operations - ENHANCED
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
    if (sellingPrice === 0) return 0;
    return ((sellingPrice - costPrice) / sellingPrice) * 100;
  },

  // Generate SKU
  generateSKU: (categoryName, productName, shopId) => {
    const catCode = categoryName.substring(0, 3).toUpperCase();
    const prodCode = productName.substring(0, 3).toUpperCase();
    const shopCode = shopId.toString().slice(-3);
    const timestamp = Date.now().toString().slice(-4);
    return `${catCode}${prodCode}${shopCode}${timestamp}`;
  },

  // Validate email format
  validateEmail: (email) => {
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    return emailRegex.test(email);
  },

  // Validate phone format (basic)
  validatePhone: (phone) => {
    const phoneRegex = /^\+?[\d\s-()]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
  },

  // Generate verification token
  generateToken: () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
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