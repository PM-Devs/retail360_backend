// afia.js - Enhanced Function-Calling Model with Master Shop System and Analytics Integration
import Groq from "groq-sdk";
import dotenv from "dotenv";
import {
  // Analytics Functions
  generateDailyReport,
  getSalesAnalytics,
  getInventoryAnalytics,
  getCustomerAnalytics,
  getDashboardSummary,
  
  // Product Management Functions
  createProduct,
  getProducts,
  getProductByQR,
  updateProduct,
  deleteProduct,
  getLowStockProducts,
  
  // Sales Management Functions
  createSale,
  getSales,
  getSaleById,
  processRefund,
  
  // Customer Management Functions
  createCustomer,
  getCustomers,
  getCustomerByPhone,
  updateCustomer,
  addLoyaltyPoints,
  
  // Stock Management Functions
  adjustStock,
  getStockMovements,
  
  // Supplier Management Functions
  createSupplier,
  getSuppliers,
  updateSupplier,
  
  // Enhanced Shop Management Functions with Master Shop Support
  createShop,
  createShopWithMasterOption,
  getShop,
  updateShop,
  deleteShop,
  getUserShops,
  setCurrentShop,
  getCurrentShop,
  getAllShops,
  getUserOwnedShops,
  getUserManagedShops,
  getUserStaffShops,
  getShopUsers,
  
  // Master Shop System Functions
  setMasterShop,
  connectShopToMaster,
  disconnectShopFromMaster,
  getMasterShopNetwork,
  getShopNetworkHierarchy,
  getShopNetworkAnalytics,
  
  // Financial Management Functions
  getConsolidatedFinancialReport,
  getUserDebtSummary,
  updateUserShopDebt,
  transferBetweenShops,
  recordCrossShopTransaction,
  getUserCrossShopTransactions,
  
  // Category Management Functions
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
  
  // Notification Functions
  getNotifications,
  markNotificationAsRead,
  checkLowStockAndNotify,
  
  // Discount Functions
  createDiscount,
  getActiveDiscounts,
  applyDiscount,
  
  // Utility Functions
  generateProductQRCode,
  backupShopData,
  runDailyTasks,
  
  // Authentication Functions
  registerUser,
  loginUser
} from './main.js';

// Load environment variables
dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Define available functions with their schemas
const availableFunctions = {
  // Authentication Functions
  registerUser: {
    function: registerUser,
    description: "Register a new user (Shop Owner, Manager, Staff)",
    parameters: {
      type: "object",
      properties: {
        userData: {
          type: "object",
          description: "User data including name, email, phone, password, role, shopId, permissions",
          properties: {
            name: { type: "string", description: "User's full name" },
            email: { type: "string", description: "User's email address" },
            phone: { type: "string", description: "User's phone number" },
            password: { type: "string", description: "User's password" },
            role: { type: "string", enum: ["owner", "manager", "staff"], description: "User's role" },
            shopId: { type: "string", description: "Shop ID (optional)" },
            permissions: { type: "object", description: "User permissions object" }
          },
          required: ["name", "email", "phone", "password"]
        }
      },
      required: ["userData"]
    }
  },
  
  loginUser: {
    function: loginUser,
    description: "Login user with credentials",
    parameters: {
      type: "object",
      properties: {
        credentials: {
          type: "object",
          properties: {
            email: { type: "string", description: "User's email" },
            password: { type: "string", description: "User's password" }
          },
          required: ["email", "password"]
        }
      },
      required: ["credentials"]
    }
  },
  
  // Enhanced Shop Management Functions
  createShop: {
    function: createShop,
    description: "Create a new shop with optional master shop setup",
    parameters: {
      type: "object",
      properties: {
        shopData: {
          type: "object",
          description: "Shop data including name, address, settings, etc."
        },
        userId: { type: "string", description: "User ID creating the shop" },
        setAsMaster: { type: "boolean", description: "Set this shop as master shop (default: false)" }
      },
      required: ["shopData", "userId"]
    }
  },
  
  createShopWithMasterOption: {
    function: createShopWithMasterOption,
    description: "Create a new shop with explicit master shop option",
    parameters: {
      type: "object",
      properties: {
        shopData: {
          type: "object",
          description: "Shop data including name, address, settings, etc."
        },
        userId: { type: "string", description: "User ID creating the shop" },
        setAsMaster: { type: "boolean", description: "Set this shop as master shop" }
      },
      required: ["shopData", "userId", "setAsMaster"]
    }
  },
  
  setMasterShop: {
    function: setMasterShop,
    description: "Set a shop as the master shop for a user",
    parameters: {
      type: "object",
      properties: {
        userId: { type: "string", description: "User ID" },
        shopId: { type: "string", description: "Shop ID to set as master" }
      },
      required: ["userId", "shopId"]
    }
  },
  
  connectShopToMaster: {
    function: connectShopToMaster,
    description: "Connect a shop to a master shop",
    parameters: {
      type: "object",
      properties: {
        shopId: { type: "string", description: "Shop ID to connect" },
        masterShopId: { type: "string", description: "Master shop ID" },
        connectionType: { type: "string", enum: ["branch", "franchise", "partner"], description: "Type of connection" },
        financialSettings: {
          type: "object",
          description: "Financial connection settings",
          properties: {
            shareRevenue: { type: "boolean" },
            consolidateReports: { type: "boolean" },
            sharedInventory: { type: "boolean" }
          }
        }
      },
      required: ["shopId", "masterShopId"]
    }
  },
  
  disconnectShopFromMaster: {
    function: disconnectShopFromMaster,
    description: "Disconnect a shop from master shop network",
    parameters: {
      type: "object",
      properties: {
        shopId: { type: "string", description: "Shop ID to disconnect" },
        userId: { type: "string", description: "User ID performing the action" }
      },
      required: ["shopId", "userId"]
    }
  },
  
  getMasterShopNetwork: {
    function: getMasterShopNetwork,
    description: "Get master shop details and all connected shops",
    parameters: {
      type: "object",
      properties: {
        userId: { type: "string", description: "User ID" }
      },
      required: ["userId"]
    }
  },
  
  getShopNetworkHierarchy: {
    function: getShopNetworkHierarchy,
    description: "Get shop network hierarchy for a user",
    parameters: {
      type: "object",
      properties: {
        userId: { type: "string", description: "User ID" }
      },
      required: ["userId"]
    }
  },
  
  getShopNetworkAnalytics: {
    function: getShopNetworkAnalytics,
    description: "Get comprehensive shop network analytics",
    parameters: {
      type: "object",
      properties: {
        userId: { type: "string", description: "User ID" },
        dateRange: {
          type: "object",
          description: "Date range for analytics",
          properties: {
            startDate: { type: "string" },
            endDate: { type: "string" }
          }
        }
      },
      required: ["userId"]
    }
  },
  
  // Financial Management Functions
  getConsolidatedFinancialReport: {
    function: getConsolidatedFinancialReport,
    description: "Get consolidated financial report across all shops in network",
    parameters: {
      type: "object",
      properties: {
        userId: { type: "string", description: "User ID" },
        dateRange: {
          type: "object",
          description: "Date range for the report",
          properties: {
            startDate: { type: "string" },
            endDate: { type: "string" }
          }
        }
      },
      required: ["userId"]
    }
  },
  
  getUserDebtSummary: {
    function: getUserDebtSummary,
    description: "Get user's debt summary across all shops",
    parameters: {
      type: "object",
      properties: {
        userId: { type: "string", description: "User ID" }
      },
      required: ["userId"]
    }
  },
  
  updateUserShopDebt: {
    function: updateUserShopDebt,
    description: "Update shop debt for a user",
    parameters: {
      type: "object",
      properties: {
        userId: { type: "string", description: "User ID" },
        shopId: { type: "string", description: "Shop ID" },
        newAmount: { type: "number", description: "New debt amount" },
        description: { type: "string", description: "Description of debt change" }
      },
      required: ["userId", "shopId", "newAmount"]
    }
  },
  
  transferBetweenShops: {
    function: transferBetweenShops,
    description: "Transfer funds between shops in the network",
    parameters: {
      type: "object",
      properties: {
        fromShopId: { type: "string", description: "Source shop ID" },
        toShopId: { type: "string", description: "Destination shop ID" },
        amount: { type: "number", description: "Amount to transfer" },
        userId: { type: "string", description: "User ID performing transfer" },
        description: { type: "string", description: "Transfer description" }
      },
      required: ["fromShopId", "toShopId", "amount", "userId"]
    }
  },
  
  recordCrossShopTransaction: {
    function: recordCrossShopTransaction,
    description: "Record a cross-shop transaction",
    parameters: {
      type: "object",
      properties: {
        transactionData: {
          type: "object",
          description: "Transaction data including fromShop, toShop, userId, transactionType, amount, description, metadata",
          properties: {
            fromShop: { type: "string" },
            toShop: { type: "string" },
            userId: { type: "string" },
            transactionType: { type: "string", enum: ["transfer", "debt", "payment", "adjustment"] },
            amount: { type: "number" },
            description: { type: "string" },
            metadata: { type: "object" }
          },
          required: ["userId", "transactionType", "amount", "description"]
        }
      },
      required: ["transactionData"]
    }
  },
  
  getUserCrossShopTransactions: {
    function: getUserCrossShopTransactions,
    description: "Get all cross-shop transactions for a user",
    parameters: {
      type: "object",
      properties: {
        userId: { type: "string", description: "User ID" },
        filters: {
          type: "object",
          description: "Transaction filters",
          properties: {
            transactionType: { type: "string" },
            status: { type: "string" },
            fromDate: { type: "string" },
            toDate: { type: "string" },
            limit: { type: "number" }
          }
        }
      },
      required: ["userId"]
    }
  },
  
  // Enhanced Shop Access Functions
  getUserOwnedShops: {
    function: getUserOwnedShops,
    description: "Get shops where user is owner",
    parameters: {
      type: "object",
      properties: {
        userId: { type: "string", description: "User ID" }
      },
      required: ["userId"]
    }
  },
  
  getUserManagedShops: {
    function: getUserManagedShops,
    description: "Get shops where user is manager",
    parameters: {
      type: "object",
      properties: {
        userId: { type: "string", description: "User ID" }
      },
      required: ["userId"]
    }
  },
  
  getUserStaffShops: {
    function: getUserStaffShops,
    description: "Get shops where user is staff",
    parameters: {
      type: "object",
      properties: {
        userId: { type: "string", description: "User ID" }
      },
      required: ["userId"]
    }
  },
  
  getShopUsers: {
    function: getShopUsers,
    description: "Get users for a specific shop",
    parameters: {
      type: "object",
      properties: {
        shopId: { type: "string", description: "Shop ID" }
      },
      required: ["shopId"]
    }
  },
  
  // Analytics Functions
  generateDailyReport: {
    function: generateDailyReport,
    description: "Generate daily sales and analytics report for a shop",
    parameters: {
      type: "object",
      properties: {
        shopId: { type: "string", description: "The shop ID" },
        date: { type: "string", description: "Date for the report (optional, defaults to today)" }
      },
      required: ["shopId"]
    }
  },
  
  getSalesAnalytics: {
    function: getSalesAnalytics,
    description: "Get sales analytics for a specific date range",
    parameters: {
      type: "object",
      properties: {
        shopId: { type: "string", description: "The shop ID" },
        startDate: { type: "string", description: "Start date for analytics" },
        endDate: { type: "string", description: "End date for analytics" }
      },
      required: ["shopId", "startDate", "endDate"]
    }
  },
  
  getInventoryAnalytics: {
    function: getInventoryAnalytics,
    description: "Get inventory analytics including stock levels and values",
    parameters: {
      type: "object",
      properties: {
        shopId: { type: "string", description: "The shop ID" }
      },
      required: ["shopId"]
    }
  },
  
  getCustomerAnalytics: {
    function: getCustomerAnalytics,
    description: "Get customer analytics for a specific date range",
    parameters: {
      type: "object",
      properties: {
        shopId: { type: "string", description: "The shop ID" },
        startDate: { type: "string", description: "Start date for analytics" },
        endDate: { type: "string", description: "End date for analytics" }
      },
      required: ["shopId", "startDate", "endDate"]
    }
  },
  
  getDashboardSummary: {
    function: getDashboardSummary,
    description: "Get dashboard summary with key metrics",
    parameters: {
      type: "object",
      properties: {
        shopId: { type: "string", description: "The shop ID" }
      },
      required: ["shopId"]
    }
  },
  
  // Product Management Functions
  createProduct: {
    function: createProduct,
    description: "Create a new product with automatic QR code generation",
    parameters: {
      type: "object",
      properties: {
        productData: {
          type: "object",
          description: "Product data including name, pricing, stock, category, etc."
        }
      },
      required: ["productData"]
    }
  },
  
  getProducts: {
    function: getProducts,
    description: "Get all products for a shop with optional filters",
    parameters: {
      type: "object",
      properties: {
        shopId: { type: "string", description: "The shop ID" },
        filters: {
          type: "object",
          description: "Optional filters (category, search, lowStock)",
          properties: {
            category: { type: "string" },
            search: { type: "string" },
            lowStock: { type: "boolean" }
          }
        }
      },
      required: ["shopId"]
    }
  },
  
  getProductByQR: {
    function: getProductByQR,
    description: "Get product details by QR code",
    parameters: {
      type: "object",
      properties: {
        qrCode: { type: "string", description: "The QR code to search for" }
      },
      required: ["qrCode"]
    }
  },
  
  updateProduct: {
    function: updateProduct,
    description: "Update product information",
    parameters: {
      type: "object",
      properties: {
        productId: { type: "string", description: "The product ID" },
        updates: { type: "object", description: "Updates to apply" }
      },
      required: ["productId", "updates"]
    }
  },
  
  deleteProduct: {
    function: deleteProduct,
    description: "Delete (deactivate) a product",
    parameters: {
      type: "object",
      properties: {
        productId: { type: "string", description: "The product ID" }
      },
      required: ["productId"]
    }
  },
  
  getLowStockProducts: {
    function: getLowStockProducts,
    description: "Get products with low stock levels",
    parameters: {
      type: "object",
      properties: {
        shopId: { type: "string", description: "The shop ID" }
      },
      required: ["shopId"]
    }
  },
  
  // Sales Management Functions
  createSale: {
    function: createSale,
    description: "Create a new sale transaction",
    parameters: {
      type: "object",
      properties: {
        saleData: {
          type: "object",
          description: "Sale data including items, customer, payment info, etc."
        }
      },
      required: ["saleData"]
    }
  },
  
  getSales: {
    function: getSales,
    description: "Get all sales for a shop with optional filters",
    parameters: {
      type: "object",
      properties: {
        shopId: { type: "string", description: "The shop ID" },
        filters: {
          type: "object",
          description: "Optional filters (date range, payment method, customer)"
        }
      },
      required: ["shopId"]
    }
  },
  
  getSaleById: {
    function: getSaleById,
    description: "Get sale details by ID",
    parameters: {
      type: "object",
      properties: {
        saleId: { type: "string", description: "The sale ID" }
      },
      required: ["saleId"]
    }
  },
  
  processRefund: {
    function: processRefund,
    description: "Process a refund for a sale",
    parameters: {
      type: "object",
      properties: {
        saleId: { type: "string", description: "The sale ID" },
        refundData: {
          type: "object",
          description: "Refund data including reason and processed by"
        }
      },
      required: ["saleId", "refundData"]
    }
  },
  
  // Customer Management Functions
  createCustomer: {
    function: createCustomer,
    description: "Create a new customer",
    parameters: {
      type: "object",
      properties: {
        customerData: {
          type: "object",
          description: "Customer data including name, phone, email, etc."
        }
      },
      required: ["customerData"]
    }
  },
  
  getCustomers: {
    function: getCustomers,
    description: "Get all customers for a shop",
    parameters: {
      type: "object",
      properties: {
        shopId: { type: "string", description: "The shop ID" },
        filters: {
          type: "object",
          description: "Optional filters (search)"
        }
      },
      required: ["shopId"]
    }
  },
  
  getCustomerByPhone: {
    function: getCustomerByPhone,
    description: "Get customer by phone number",
    parameters: {
      type: "object",
      properties: {
        phone: { type: "string", description: "Customer phone number" },
        shopId: { type: "string", description: "The shop ID" }
      },
      required: ["phone", "shopId"]
    }
  },
  
  updateCustomer: {
    function: updateCustomer,
    description: "Update customer information",
    parameters: {
      type: "object",
      properties: {
        customerId: { type: "string", description: "The customer ID" },
        updates: { type: "object", description: "Updates to apply" }
      },
      required: ["customerId", "updates"]
    }
  },
  
  addLoyaltyPoints: {
    function: addLoyaltyPoints,
    description: "Add loyalty points to a customer",
    parameters: {
      type: "object",
      properties: {
        customerId: { type: "string", description: "The customer ID" },
        points: { type: "number", description: "Points to add" },
        totalSpent: { type: "number", description: "Total amount spent" }
      },
      required: ["customerId", "points", "totalSpent"]
    }
  },
  
  // Stock Management Functions
  adjustStock: {
    function: adjustStock,
    description: "Adjust stock quantity for a product",
    parameters: {
      type: "object",
      properties: {
        productId: { type: "string", description: "The product ID" },
        adjustment: {
          type: "object",
          description: "Adjustment data including quantity, reason, userId, notes"
        }
      },
      required: ["productId", "adjustment"]
    }
  },
  
  getStockMovements: {
    function: getStockMovements,
    description: "Get stock movements for a product",
    parameters: {
      type: "object",
      properties: {
        productId: { type: "string", description: "The product ID" },
        limit: { type: "number", description: "Limit number of results (default 50)" }
      },
      required: ["productId"]
    }
  },
  
  // Supplier Management Functions
  createSupplier: {
    function: createSupplier,
    description: "Create a new supplier",
    parameters: {
      type: "object",
      properties: {
        supplierData: {
          type: "object",
          description: "Supplier data including name, contact info, etc."
        }
      },
      required: ["supplierData"]
    }
  },
  
  getSuppliers: {
    function: getSuppliers,
    description: "Get all suppliers for a shop",
    parameters: {
      type: "object",
      properties: {
        shopId: { type: "string", description: "The shop ID" }
      },
      required: ["shopId"]
    }
  },
  
  updateSupplier: {
    function: updateSupplier,
    description: "Update supplier information",
    parameters: {
      type: "object",
      properties: {
        supplierId: { type: "string", description: "The supplier ID" },
        updates: { type: "object", description: "Updates to apply" }
      },
      required: ["supplierId", "updates"]
    }
  },
  
  // Enhanced Shop Management Functions
  getShop: {
    function: getShop,
    description: "Get shop details with master shop context",
    parameters: {
      type: "object",
      properties: {
        shopId: { type: "string", description: "The shop ID" }
      },
      required: ["shopId"]
    }
  },
  
  updateShop: {
    function: updateShop,
    description: "Update shop details",
    parameters: {
      type: "object",
      properties: {
        shopId: { type: "string", description: "The shop ID" },
        updates: { type: "object", description: "Updates to apply" }
      },
      required: ["shopId", "updates"]
    }
  },
  
  deleteShop: {
    function: deleteShop,
    description: "Delete shop with master shop considerations",
    parameters: {
      type: "object",
      properties: {
        shopId: { type: "string", description: "The shop ID" },
        userId: { type: "string", description: "User ID performing deletion" }
      },
      required: ["shopId", "userId"]
    }
  },
  
  getUserShops: {
    function: getUserShops,
    description: "Get all shops for a user with master shop priority",
    parameters: {
      type: "object",
      properties: {
        userId: { type: "string", description: "The user ID" }
      },
      required: ["userId"]
    }
  },
  
  setCurrentShop: {
    function: setCurrentShop,
    description: "Set current shop for a user with master shop validation",
    parameters: {
      type: "object",
      properties: {
        userId: { type: "string", description: "The user ID" },
        shopId: { type: "string", description: "The shop ID to set as current" }
      },
      required: ["userId", "shopId"]
    }
  },
  
  getCurrentShop: {
    function: getCurrentShop,
    description: "Get current shop details with master shop context",
    parameters: {
      type: "object",
      properties: {
        userId: { type: "string", description: "The user ID" }
      },
      required: ["userId"]
    }
  },
  
  getAllShops: {
    function: getAllShops,
    description: "Get all shops with master shop filtering",
    parameters: {
      type: "object",
      properties: {
        page: { type: "number", description: "Page number (default 1)" },
        limit: { type: "number", description: "Items per page (default 10)" },
        searchTerm: { type: "string", description: "Search term" },
        filterByLevel: { type: "string", enum: ["master", "branch", "independent"], description: "Filter by shop level" }
      }
    }
  },
  
  // Category Management Functions
  createCategory: {
    function: createCategory,
    description: "Create a new product category",
    parameters: {
      type: "object",
      properties: {
        categoryData: {
          type: "object",
          description: "Category data including name, description, etc."
        }
      },
      required: ["categoryData"]
    }
  },
  
  getCategories: {
    function: getCategories,
    description: "Get all categories for a shop",
    parameters: {
      type: "object",
      properties: {
        shopId: { type: "string", description: "The shop ID" }
      },
      required: ["shopId"]
    }
  },
  
  updateCategory: {
    function: updateCategory,
    description: "Update category information",
    parameters: {
      type: "object",
      properties: {
        categoryId: { type: "string", description: "The category ID" },
        updates: { type: "object", description: "Updates to apply" }
      },
      required: ["categoryId", "updates"]
    }
  },
  
  deleteCategory: {
    function: deleteCategory,
    description: "Delete a category",
    parameters: {
      type: "object",
      properties: {
        categoryId: { type: "string", description: "The category ID" }
      },
      required: ["categoryId"]
    }
  },
  
  // Notification Functions
  getNotifications: {
    function: getNotifications,
    description: "Get notifications for a shop",
    parameters: {
      type: "object",
      properties: {
        shopId: { type: "string", description: "The shop ID" },
        filters: {
          type: "object",
          description: "Optional filters (unreadOnly, type, limit)"
        }
      },
      required: ["shopId"]
    }
  },
  
  markNotificationAsRead: {
    function: markNotificationAsRead,
    description: "Mark notification as read",
    parameters: {
      type: "object",
      properties: {
        notificationId: { type: "string", description: "The notification ID" }
      },
      required: ["notificationId"]
    }
  },
  
  checkLowStockAndNotify: {
    function: checkLowStockAndNotify,
    description: "Check for low stock products and create notifications",
    parameters: {
      type: "object",
      properties: {
        shopId: { type: "string", description: "The shop ID" }
      },
      required: ["shopId"]
    }
  },
  
  // Discount Functions
  createDiscount: {
    function: createDiscount,
    description: "Create a new discount/promo",
    parameters: {
      type: "object",
      properties: {
        discountData: {
          type: "object",
          description: "Discount data including code, value, conditions, etc."
        }
      },
      required: ["discountData"]
    }
  },
  
  getActiveDiscounts: {
    function: getActiveDiscounts,
    description: "Get active discounts for a shop",
    parameters: {
      type: "object",
      properties: {
        shopId: { type: "string", description: "The shop ID" }
      },
      required: ["shopId"]
    }
  },
  
  applyDiscount: {
    function: applyDiscount,
    description: "Apply a discount to a sale",
    parameters: {
      type: "object",
      properties: {
        discountCode: { type: "string", description: "The discount code" },
        saleData: {
          type: "object",
          description: "Sale data to apply discount to"
        }
      },
      required: ["discountCode", "saleData"]
    }
  },
  
  // Utility Functions
  generateProductQRCode: {
    function: generateProductQRCode,
    description: "Generate QR code image for a product",
    parameters: {
      type: "object",
      properties: {
        productId: { type: "string", description: "The product ID" }
      },
      required: ["productId"]
    }
  },
  
  backupShopData: {
    function: backupShopData,
    description: "Backup all shop data",
    parameters: {
      type: "object",
      properties: {
        shopId: { type: "string", description: "The shop ID" }
      },
      required: ["shopId"]
    }
  },
  
  runDailyTasks: {
    function: runDailyTasks,
    description: "Run daily maintenance tasks for all shops",
    parameters: {
      type: "object",
      properties: {}
    }
  }
};

// Create function tools for Groq
const createFunctionTools = () => {
  return Object.entries(availableFunctions).map(([name, config]) => ({
    type: "function",
    function: {
      name,
      description: config.description,
      parameters: config.parameters
    }
  }));
};

// Execute function calls
const executeFunctionCall = async (functionName, parameters) => {
  try {
    const functionConfig = availableFunctions[functionName];
    
    if (!functionConfig) {
      throw new Error(`Function ${functionName} not found`);
    }
    
    console.log(`Executing function: ${functionName} with parameters:`, parameters);
    
    // Call the function with the provided parameters
    const result = await functionConfig.function(...Object.values(parameters));
    
    return {
      success: true,
      result,
      functionName
    };
  } catch (error) {
    console.error(`Error executing function ${functionName}:`, error);
    return {
      success: false,
      error: error.message,
      functionName
    };
  }
};

// Enhanced Groq chat completion with function calling
export async function getGroqChatCompletion(userQuestion, systemPrompt = null, userId = null, shopId = null) {
  try {
    const tools = createFunctionTools();
    
    const defaultSystemPrompt = `You are Afia AI, a Cognitive User Interface (CUI) developed by Prince Mawuko Dzorkpe. You are designed to help users interact with retail management software in a more human-friendly manner.

You are designed to have comprehensive knowledge about Retail360, a mobile-first retail ERP system with QR-powered sales designed for Ghanaian retail businesses.

## System Overview
Retail360 is a mobile-first retail ERP system specifically designed for multi-branch mini-marts, provision stores, supermarkets, cosmetic shops, spare part dealers, boutique owners, and retail businesses across Ghana. The system addresses the core challenges of stock tracking, sales data management, and expensive PC-based POS systems by providing a complete mobile solution.

The system now features an advanced Master Shop Network System that allows business owners to:
- Set up one primary shop as their Master Shop
- Connect multiple branch shops to the master shop
- Manage finances across the entire network
- Get consolidated reports and analytics
- Track user debt across different shops
- Transfer funds between connected shops
- Monitor cross-shop transactions

## Core System Features

**Master Shop Network System:**
- Designate one shop as the master shop for centralized management
- Connect branch shops, franchises, or partner locations
- Consolidated financial reporting across the entire network
- Cross-shop fund transfers and transaction tracking
- User debt management across multiple locations
- Network-wide analytics and performance metrics

**Enhanced Shop Management:**
- Independent shops can operate standalone
- Branch shops connect to master shops for unified management
- Flexible user roles and permissions across the network
- Hierarchical shop organization with master-branch relationships

**Financial Management Across Network:**
- Consolidated revenue and expense tracking
- Cross-shop debt management for users
- Inter-shop transaction recording
- Network-wide profit and loss analysis
- Individual shop performance within the network

**Inventory & Stock Management:**
- Add, edit, and monitor products from mobile devices
- Set automated low-stock alerts
- Handle restocking processes from suppliers
- Real-time inventory tracking across connected shops

**Mobile Point of Sale (POS):**
- Complete sales processing from phone or tablet
- Add discounts and track transaction totals
- Process both cash and Mobile Money (MoMo) payments
- No PC or expensive hardware required

**QR Code–Based Selling System:**
- Auto-generates printable QR codes for all products
- Scan QR codes using phone camera to add items to sales
- Compatible with cheap QR scanners or standard phone cameras
- Significantly speeds up transactions and reduces human errors

**Customer Management:**
- Print or share digital receipts via WhatsApp or SMS
- Optional loyalty point system linked to QR-based customer profiles
- Digital customer relationship management

**Automated Reporting:**
- Daily sales and stock summaries automatically sent via WhatsApp
- Network-wide consolidated reports for master shop owners
- Business owners stay informed without constant system monitoring

**Multi-Device Cloud Synchronization:**
- Staff can access system from multiple phones or tablets
- Real-time data synchronization across all devices and connected shops
- Centralized data management with distributed access

**Offline Functionality:**
- Record sales without internet connection
- Automatic data synchronization when connection is restored
- Ensures business continuity regardless of connectivity issues

**Ghana-Specific Pricing Support:**
- Support for local selling units (sachet, kilo, bottle, "GHS 2" pricing)
- Separate tracking for bulk and small-pack sales
- Localized pricing and measurement systems

**Security & Access Control:**
- Role-based access levels for managers vs. shop attendants
- Network-wide user management with shop-specific permissions
- Protection of sensitive data including profits and stock values
- Secure user authentication and data protection

## Master Shop Network Benefits
- Unified management of multiple business locations
- Consolidated financial oversight and reporting
- Streamlined operations across branch locations
- Better cash flow management between shops
- Comprehensive business intelligence across the network
- Scalable growth with centralized control

Your capabilities include:
- Managing products, sales, customers, and inventory across all shops
- Setting up and managing master shop networks
- Generating consolidated analytics and reports
- Processing transactions and refunds
- Managing stock levels and suppliers across the network
- Creating discounts and promotions
- Providing notifications and alerts
- Managing cross-shop financial transactions
- User authentication and shop access management

Key Guidelines:
1. Always introduce yourself as Afia AI when asked about your identity
2. Explain that you're a CUI (Cognitive User Interface) designed to make software interaction more natural
3. When asked about personal user data, respond: "I don't have permissions to access personal user data"
4. Be helpful and conversational while maintaining professionalism
5. Use the available functions to provide accurate, real-time information
6. When discussing stock levels or business metrics, provide specific numbers when available
7. For master shop queries, always explain the network context and benefits
8. When helping with financial operations, emphasize the consolidated view across shops

Available Functions: ${Object.keys(availableFunctions).join(', ')}

Current User ID: ${userId || 'Not specified'}
Current Shop ID: ${shopId || 'Not specified'}

Master Shop System Context:
- If user has a master shop, prioritize network-wide insights
- For branch shop users, show both local and network context
- When setting up new shops, suggest master shop benefits for multi-location businesses
- Always consider cross-shop implications for financial operations`;

    const messages = [
      {
        role: "system",
        content: systemPrompt || defaultSystemPrompt
      },
      {
        role: "user",
        content: userQuestion
      }
    ];

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages,
      tools,
      tool_choice: "auto",
      temperature: 0.7,
      max_tokens: 4000
    });

    const assistantMessage = response.choices[0].message;
    
    // Handle function calls
    if (assistantMessage.tool_calls) {
      const functionResults = [];
      
      for (const toolCall of assistantMessage.tool_calls) {
        const functionName = toolCall.function.name;
        const parameters = JSON.parse(toolCall.function.arguments);
        
        const result = await executeFunctionCall(functionName, parameters);
        functionResults.push({
          toolCallId: toolCall.id,
          result
        });
      }
      
      // Add function results to conversation
      messages.push({
        role: "assistant",
        content: assistantMessage.content || "I'm executing the requested functions...",
        tool_calls: assistantMessage.tool_calls
      });
      
      // Add function results
      for (const { toolCallId, result } of functionResults) {
        messages.push({
          role: "tool",
          tool_call_id: toolCallId,
          content: JSON.stringify(result)
        });
      }
      
      // Get final response with function results
      const finalResponse = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages,
        temperature: 0.7,
        max_tokens: 4000
      });
      
      return {
        response: finalResponse.choices[0].message.content,
        functionCalls: functionResults,
        fullResponse: finalResponse
      };
    }
    
    return {
      response: assistantMessage.content,
      functionCalls: [],
      fullResponse: response
    };
    
  } catch (error) {
    console.error('Error in Groq chat completion:', error);
    throw new Error(`Chat completion failed: ${error.message}`);
  }
}

// Main function to handle user queries with enhanced context
export async function main(userQuestion, userId = null, shopId = null) {
  try {
    console.log('🤖 Afia AI Processing:', userQuestion);
    console.log('👤 User ID:', userId || 'Not provided');
    console.log('🏪 Shop ID:', shopId || 'Not provided');
    
    const result = await getGroqChatCompletion(userQuestion, null, userId, shopId);
    
    // Log function calls if any
    if (result.functionCalls && result.functionCalls.length > 0) {
      console.log('📊 Functions Executed:', result.functionCalls.length);
      result.functionCalls.forEach(call => {
        console.log(`  - ${call.result.functionName}: ${call.result.success ? '✅ Success' : '❌ Error'}`);
        if (!call.result.success) {
          console.log(`    Error: ${call.result.error}`);
        }
      });
    }
    
    console.log('🎯 Afia AI Response:', result.response);
    return result;
    
  } catch (error) {
    console.error('❌ Error in main function:', error);
    return {
      response: "I apologize, but I encountered an error processing your request. Please try again or contact support if the issue persists.",
      error: error.message
    };
  }
}

// Enhanced conversation handler with context management
export async function handleConversation(userQuestion, sessionContext = {}) {
  try {
    const { userId, shopId, userRole, masterShopId, networkContext } = sessionContext;
    
    // Enhance the system prompt with session context
    let contextualPrompt = null;
    if (userId && shopId) {
      contextualPrompt = `
Current Session Context:
- User ID: ${userId}
- Current Shop ID: ${shopId}
- User Role: ${userRole || 'Unknown'}
- Master Shop ID: ${masterShopId || 'None'}
- Network Context: ${networkContext ? 'Multi-shop network' : 'Single shop'}

Please provide contextually relevant responses based on this session information.
When making function calls, use the provided user and shop IDs as appropriate.
      `;
    }
    
    const result = await getGroqChatCompletion(userQuestion, contextualPrompt, userId, shopId);
    
    return {
      ...result,
      sessionContext: sessionContext
    };
    
  } catch (error) {
    console.error('❌ Error in conversation handler:', error);
    return {
      response: "I encountered an error processing your request. Please try again.",
      error: error.message,
      sessionContext: sessionContext
    };
  }
}

// Master shop specific helper function
export async function handleMasterShopQuery(userQuestion, userId) {
  try {
    // First, get the user's master shop network
    const networkResult = await executeFunctionCall('getMasterShopNetwork', { userId });
    
    if (!networkResult.success || !networkResult.result.hasMasterShop) {
      return {
        response: "You don't have a master shop set up yet. Would you like me to help you set up a master shop for better multi-location management?",
        suggestion: "setup_master_shop"
      };
    }
    
    // Add network context to the query
    const networkContext = networkResult.result;
    const contextualPrompt = `
Master Shop Network Context:
- Master Shop: ${networkContext.masterShop.name}
- Connected Shops: ${networkContext.connectedShops.length}
- Total Network Revenue: ${networkContext.networkStats.totalNetworkRevenue}
- Network Level: Master Shop Owner

Please provide responses that leverage this network context and suggest network-wide insights when relevant.
    `;
    
    const result = await getGroqChatCompletion(userQuestion, contextualPrompt, userId);
    
    return {
      ...result,
      networkContext: networkContext
    };
    
  } catch (error) {
    console.error('❌ Error in master shop query handler:', error);
    return {
      response: "I encountered an error accessing your master shop network. Please try again.",
      error: error.message
    };
  }
}

// Utility function to get function information
export function getFunctionInfo(functionName = null) {
  if (functionName) {
    return availableFunctions[functionName] || null;
  }
  
  return Object.keys(availableFunctions).map(name => ({
    name,
    description: availableFunctions[name].description,
    category: getFunctionCategory(name)
  }));
}

// Helper function to categorize functions
function getFunctionCategory(functionName) {
  if (functionName.includes('MasterShop') || functionName.includes('Network') || functionName.includes('CrossShop')) {
    return 'Master Shop System';
  } else if (functionName.includes('Product')) {
    return 'Product Management';
  } else if (functionName.includes('Sale') || functionName.includes('Refund')) {
    return 'Sales Management';
  } else if (functionName.includes('Customer')) {
    return 'Customer Management';
  } else if (functionName.includes('Stock')) {
    return 'Stock Management';
  } else if (functionName.includes('Analytics') || functionName.includes('Report')) {
    return 'Analytics & Reporting';
  } else if (functionName.includes('Shop') || functionName.includes('User')) {
    return 'Shop & User Management';
  } else if (functionName.includes('Financial') || functionName.includes('Debt') || functionName.includes('Transfer')) {
    return 'Financial Management';
  } else {
    return 'Utility';
  }
}

// Health check function with enhanced capabilities
export async function healthCheck() {
  try {
    const functionsCount = Object.keys(availableFunctions).length;
    const functionCategories = {};
    
    // Count functions by category
    Object.keys(availableFunctions).forEach(funcName => {
      const category = getFunctionCategory(funcName);
      functionCategories[category] = (functionCategories[category] || 0) + 1;
    });
    
    return {
      status: 'healthy',
      version: '2.0.0 - Master Shop Enhanced',
      availableFunctions: functionsCount,
      functionCategories: functionCategories,
      groqConnected: !!groq,
      features: [
        'Master Shop Network Management',
        'Cross-Shop Financial Operations',
        'Consolidated Reporting',
        'Network Analytics',
        'Multi-Shop User Management',
        'Enhanced Shop Hierarchy'
      ],
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Enhanced test functions with master shop scenarios
export async function runTests() {
  console.log('🧪 Running Enhanced Afia AI Tests with Master Shop System...');
  
  const testQueries = [
    "Hello, who are you?",
    "What can you help me with?",
    "Show me my dashboard summary",
    "What are my low stock products?",
    "Generate today's sales report",
    "Tell me about my customers",
    "Can you access my personal data?",
    "How do I set up a master shop?",
    "Show me my shop network hierarchy",
    "Get my consolidated financial report",
    "What's my debt across all shops?",
    "Transfer money between my shops",
    "Show me network analytics",
    "How do I connect a new branch to my master shop?",
    "What are the benefits of the master shop system?"
  ];
  
  for (const query of testQueries) {
    console.log(`\n📝 Testing: "${query}"`);
    try {
      const result = await main(query, "test-user-id", "test-shop-id");
      console.log(`✅ Response: ${result.response.substring(0, 100)}...`);
      if (result.functionCalls && result.functionCalls.length > 0) {
        console.log(`📊 Functions called: ${result.functionCalls.length}`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n🏁 Enhanced tests completed');
}

// Advanced analytics helper
export async function getNetworkInsights(userId) {
  try {
    const analytics = await executeFunctionCall('getShopNetworkAnalytics', { userId });
    
    if (!analytics.success) {
      return {
        hasNetwork: false,
        message: "No master shop network found for user"
      };
    }
    
    const insights = analytics.result;
    
    return {
      hasNetwork: true,
      insights: {
        networkSize: insights.networkOverview.totalShops,
        totalRevenue: insights.networkOverview.totalNetworkRevenue,
        profitMargin: insights.financialHealth.profitMargin,
        topPerformingShop: insights.shopPerformance.find(shop => 
          shop.performance === 'profitable' && shop.profitMargin > 0
        ),
        recommendations: generateNetworkRecommendations(insights)
      }
    };
    
  } catch (error) {
    throw new Error(`Network insights failed: ${error.message}`);
  }
}

// Generate smart recommendations based on network analytics
function generateNetworkRecommendations(analytics) {
  const recommendations = [];
  
  // Low performing shops
  const lowPerformingShops = analytics.shopPerformance.filter(shop => 
    shop.performance === 'loss-making'
  );
  
  if (lowPerformingShops.length > 0) {
    recommendations.push({
      type: 'performance',
      priority: 'high',
      message: `${lowPerformingShops.length} shops are operating at a loss. Consider reviewing their operations.`
    });
  }
  
  // High debt ratio
  if (analytics.financialHealth.debtToRevenueRatio > 30) {
    recommendations.push({
      type: 'financial',
      priority: 'medium',
      message: 'Your network debt-to-revenue ratio is high. Consider debt consolidation strategies.'
    });
  }
  
  // Low transaction volume
  if (analytics.transactionAnalytics.totalTransactions < 10) {
    recommendations.push({
      type: 'operations',
      priority: 'low',
      message: 'Consider increasing cross-shop collaboration to boost transaction volume.'
    });
  }
  
  return recommendations;
}

// Export for external use
export default {
  main,
  handleConversation,
  handleMasterShopQuery,
  getGroqChatCompletion,
  getFunctionInfo,
  healthCheck,
  runTests,
  getNetworkInsights,
  availableFunctions: Object.keys(availableFunctions)
};