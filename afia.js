// afia.js - Enhanced Master Shop Integration with Full Functionality
import Groq from "groq-sdk";
import dotenv from "dotenv";
import mongoose from 'mongoose';
import {
  User,
  Shop,
  Category,
  Product,
  Customer,
  Sale,
  Supplier,
  StockMovement,
  DailyReport,
  Notification,
  Discount,
  CrossShopTransaction,
  PermissionHistory
} from './database.js';

// Load environment variables
dotenv.config();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Permission Constants
const AVAILABLE_PERMISSIONS = {
  inventory: { name: 'Inventory Management', description: 'Manage products, categories, and stock', actions: ['create', 'read', 'update', 'delete'] },
  sales: { name: 'Sales Management', description: 'Process sales, view transactions, handle refunds', actions: ['create', 'read', 'update', 'delete'] },
  customers: { name: 'Customer Management', description: 'Manage customer information and loyalty programs', actions: ['create', 'read', 'update', 'delete'] },
  suppliers: { name: 'Supplier Management', description: 'Manage supplier information and relationships', actions: ['create', 'read', 'update', 'delete'] },
  reports: { name: 'Reports & Analytics', description: 'View reports, analytics, and business insights', actions: ['read'] },
  settings: { name: 'Shop Settings', description: 'Manage shop configuration and preferences', actions: ['read', 'update'] },
  users: { name: 'User Management', description: 'Manage staff accounts and permissions', actions: ['create', 'read', 'update', 'delete'] },
  discounts: { name: 'Discount Management', description: 'Create and manage promotional offers', actions: ['create', 'read', 'update', 'delete'] },
  categories: { name: 'Category Management', description: 'Organize products into categories', actions: ['create', 'read', 'update', 'delete'] },
  stock: { name: 'Stock Management', description: 'Adjust stock levels and track movements', actions: ['create', 'read', 'update'] }
};

const DEFAULT_ROLE_PERMISSIONS = {
  owner: Object.keys(AVAILABLE_PERMISSIONS).reduce((acc, module) => {
    acc[module] = AVAILABLE_PERMISSIONS[module].actions;
    return acc;
  }, {}),
  manager: {
    inventory: ['create', 'read', 'update'],
    sales: ['create', 'read', 'update', 'delete'],
    customers: ['create', 'read', 'update'],
    suppliers: ['read'],
    reports: ['read'],
    settings: ['read'],
    users: ['read'],
    discounts: ['create', 'read', 'update'],
    categories: ['create', 'read', 'update'],
    stock: ['create', 'read', 'update']
  },
  staff: {
    inventory: ['read'],
    sales: ['create', 'read'],
    customers: ['create', 'read', 'update'],
    suppliers: ['read'],
    reports: [],
    settings: ['read'],
    users: [],
    discounts: ['read'],
    categories: ['read'],
    stock: ['read']
  }
};

// Permission Utilities
const formatPermissionsForDB = (permissions) => {
  return Object.entries(permissions).map(([module, actions]) => 
    `${module}:${actions.join(',')}`
  );
};

const formatPermissionsFromDB = (permissions) => {
  return permissions.reduce((acc, perm) => {
    const [module, actions] = perm.split(':');
    acc[module] = actions.split(',');
    return acc;
  }, {});
};

const hasPermission = (userPermissions, module, action) => {
  const perms = formatPermissionsFromDB(userPermissions);
  return perms[module]?.includes(action) || false;
};

// Enhanced Function Implementations
const availableFunctions = {
  // User Management
  registerStaff: {
    async function(staffData, registeredByUserId) {
      try {
        const staff = await User.registerStaff(staffData, registeredByUserId);
        return {
          success: true,
          user: staff.user,
          permissions: staff.user.permissions
        };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    description: "Register a new staff member (Owner/Manager only)",
    parameters: {
      type: "object",
      properties: {
        staffData: {
          type: "object",
          properties: {
            name: { type: "string" },
            email: { type: "string" },
            phone: { type: "string" },
            password: { type: "string" },
            role: { type: "string", enum: ["staff", "manager"] },
            shopId: { type: "string" },
            customPermissions: { type: "object" }
          },
          required: ["name", "email", "phone", "password", "shopId"]
        },
        registeredByUserId: { type: "string" }
      },
      required: ["staffData", "registeredByUserId"]
    }
  },

  updateUserRoleAndPermissions: {
    async function(targetUserId, updatedByUserId, updates) {
      try {
        const result = await User.updateUserRoleAndPermissions(
          targetUserId, 
          updatedByUserId, 
          updates
        );
        return { success: true, ...result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    description: "Update user role and permissions",
    parameters: {
      type: "object",
      properties: {
        targetUserId: { type: "string" },
        updatedByUserId: { type: "string" },
        updates: {
          type: "object",
          properties: {
            shopId: { type: "string" },
            role: { type: "string", enum: ["staff", "manager"] },
            permissions: { type: "object" }
          },
          required: ["shopId"]
        }
      },
      required: ["targetUserId", "updatedByUserId", "updates"]
    }
  },

  getShopStaff: {
    async function(shopId, requestingUserId) {
      try {
        const staff = await Shop.getShopStaff(shopId, requestingUserId);
        return { success: true, staff };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    description: "Get shop staff with roles and permissions",
    parameters: {
      type: "object",
      properties: {
        shopId: { type: "string" },
        requestingUserId: { type: "string" }
      },
      required: ["shopId", "requestingUserId"]
    }
  },

  removeStaffFromShop: {
    async function(targetUserId, shopId, removedByUserId) {
      try {
        const result = await User.removeStaffFromShop(
          targetUserId, 
          shopId, 
          removedByUserId
        );
        return { success: true, ...result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    description: "Remove staff from shop",
    parameters: {
      type: "object",
      properties: {
        targetUserId: { type: "string" },
        shopId: { type: "string" },
        removedByUserId: { type: "string" }
      },
      required: ["targetUserId", "shopId", "removedByUserId"]
    }
  },

  getUserPermissions: {
    async function(userId, shopId) {
      try {
        const permissions = await User.getUserPermissions(userId, shopId);
        return { success: true, permissions };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    description: "Get user permissions for a specific shop",
    parameters: {
      type: "object",
      properties: {
        userId: { type: "string" },
        shopId: { type: "string" }
      },
      required: ["userId", "shopId"]
    }
  },

  // Master Shop Management
  createMasterShop: {
    async function(shopData, userId, setAsMaster = true) {
      try {
        const shop = await Shop.createShop(shopData, userId, setAsMaster);
        return { success: true, shop };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    description: "Create a new master shop",
    parameters: {
      type: "object",
      properties: {
        shopData: {
          type: "object",
          properties: {
            name: { type: "string" },
            address: { type: "object" },
            phone: { type: "string" }
          },
          required: ["name", "phone"]
        },
        userId: { type: "string" },
        setAsMaster: { type: "boolean", default: true }
      },
      required: ["shopData", "userId"]
    }
  },

  setMasterShop: {
    async function(userId, shopId) {
      try {
        const shop = await Shop.setMasterShop(userId, shopId);
        return { success: true, shop };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    description: "Set a shop as master shop for a user",
    parameters: {
      type: "object",
      properties: {
        userId: { type: "string" },
        shopId: { type: "string" }
      },
      required: ["userId", "shopId"]
    }
  },

  connectToMasterShop: {
    async function(shopId, masterShopId, connectionType = 'branch', financialSettings = {}) {
      try {
        const result = await Shop.connectShopToMaster(
          shopId, 
          masterShopId, 
          connectionType, 
          financialSettings
        );
        return { success: true, ...result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    description: "Connect a shop to a master shop",
    parameters: {
      type: "object",
      properties: {
        shopId: { type: "string" },
        masterShopId: { type: "string" },
        connectionType: { 
          type: "string", 
          enum: ["branch", "franchise", "partner"],
          default: "branch"
        },
        financialSettings: {
          type: "object",
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

  getMasterShopNetwork: {
    async function(userId) {
      try {
        const network = await User.getMasterShopNetwork(userId);
        return { success: true, ...network };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    description: "Get master shop and connected shops",
    parameters: {
      type: "object",
      properties: {
        userId: { type: "string" }
      },
      required: ["userId"]
    }
  },

  // Financial Management
  getConsolidatedFinancialReport: {
    async function(userId) {
      try {
        const report = await Shop.getConsolidatedFinancialReport(userId);
        return { success: true, ...report };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    description: "Get consolidated financial report across all shops in network",
    parameters: {
      type: "object",
      properties: {
        userId: { type: "string" }
      },
      required: ["userId"]
    }
  },

  recordCrossShopTransaction: {
    async function(transactionData) {
      try {
        const transaction = await CrossShopTransaction.recordCrossShopTransaction(transactionData);
        return { success: true, transaction };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    description: "Record transaction between shops",
    parameters: {
      type: "object",
      properties: {
        transactionData: {
          type: "object",
          properties: {
            fromShop: { type: "string" },
            toShop: { type: "string" },
            userId: { type: "string" },
            amount: { type: "number" },
            description: { type: "string" }
          },
          required: ["fromShop", "toShop", "userId", "amount"]
        }
      },
      required: ["transactionData"]
    }
  },

  // Shop Management
  getShop: {
    async function(shopId) {
      try {
        const shop = await Shop.getShop(shopId);
        return { success: true, shop };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    description: "Get shop details",
    parameters: {
      type: "object",
      properties: {
        shopId: { type: "string" }
      },
      required: ["shopId"]
    }
  },

  updateShop: {
    async function(shopId, updates) {
      try {
        const shop = await Shop.updateShop(shopId, updates);
        return { success: true, shop };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    description: "Update shop information",
    parameters: {
      type: "object",
      properties: {
        shopId: { type: "string" },
        updates: { type: "object" }
      },
      required: ["shopId", "updates"]
    }
  },

  deleteShop: {
    async function(shopId, userId) {
      try {
        const result = await Shop.deleteShop(shopId, userId);
        return { success: true, ...result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    description: "Delete a shop",
    parameters: {
      type: "object",
      properties: {
        shopId: { type: "string" },
        userId: { type: "string" }
      },
      required: ["shopId", "userId"]
    }
  },

  getUserShops: {
    async function(userId) {
      try {
        const shops = await User.getUserShops(userId);
        return { success: true, ...shops };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    description: "Get all shops for a user with permissions",
    parameters: {
      type: "object",
      properties: {
        userId: { type: "string" }
      },
      required: ["userId"]
    }
  },

  setCurrentShop: {
    async function(userId, shopId) {
      try {
        const result = await User.setCurrentShop(userId, shopId);
        return { success: true, ...result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    description: "Set current shop for a user",
    parameters: {
      type: "object",
      properties: {
        userId: { type: "string" },
        shopId: { type: "string" }
      },
      required: ["userId", "shopId"]
    }
  },

  getShopStats: {
    async function(shopId) {
      try {
        const stats = await Shop.getShopStats(shopId);
        return { success: true, ...stats };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    description: "Get statistics for a shop",
    parameters: {
      type: "object",
      properties: {
        shopId: { type: "string" }
      },
      required: ["shopId"]
    }
  },

  // Product Management
  createProduct: {
    async function(productData) {
      try {
        const product = await Product.createProduct(productData);
        return { success: true, product };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    description: "Create a new product with QR code",
    parameters: {
      type: "object",
      properties: {
        productData: {
          type: "object",
          properties: {
            name: { type: "string" },
            category: { type: "string" },
            shopId: { type: "string" },
            pricing: { type: "object" }
          },
          required: ["name", "shopId"]
        }
      },
      required: ["productData"]
    }
  },

  getProducts: {
    async function(shopId, filters = {}) {
      try {
        const products = await Product.getProducts(shopId, filters);
        return { success: true, products };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    description: "Get products for a shop",
    parameters: {
      type: "object",
      properties: {
        shopId: { type: "string" },
        filters: {
          type: "object",
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
    async function(qrCode, shopId = null) {
      try {
        const product = await Product.getProductByQR(qrCode, shopId);
        return { success: true, product };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    description: "Get product by QR code",
    parameters: {
      type: "object",
      properties: {
        qrCode: { type: "string" },
        shopId: { type: "string" }
      },
      required: ["qrCode"]
    }
  },

  updateProduct: {
    async function(productId, updates) {
      try {
        const product = await Product.updateProduct(productId, updates);
        return { success: true, product };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    description: "Update product information",
    parameters: {
      type: "object",
      properties: {
        productId: { type: "string" },
        updates: { type: "object" }
      },
      required: ["productId", "updates"]
    }
  },

  deleteProduct: {
    async function(productId) {
      try {
        const product = await Product.deleteProduct(productId);
        return { success: true, product };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    description: "Delete a product",
    parameters: {
      type: "object",
      properties: {
        productId: { type: "string" }
      },
      required: ["productId"]
    }
  },

  getLowStockProducts: {
    async function(shopId) {
      try {
        const products = await Product.getLowStockProducts(shopId);
        return { success: true, products };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    description: "Get low stock products for a shop",
    parameters: {
      type: "object",
      properties: {
        shopId: { type: "string" }
      },
      required: ["shopId"]
    }
  },

  // Sales Management
  createSale: {
    async function(saleData) {
      try {
        const sale = await Sale.createSale(saleData);
        return { success: true, sale };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    description: "Create a new sale",
    parameters: {
      type: "object",
      properties: {
        saleData: {
          type: "object",
          properties: {
            shopId: { type: "string" },
            items: { 
              type: "array",
              items: {
                type: "object",
                properties: {
                  product: { type: "string" },
                  quantity: { type: "number" }
                }
              }
            }
          },
          required: ["shopId", "items"]
        }
      },
      required: ["saleData"]
    }
  },

  getSales: {
    async function(shopId, filters = {}) {
      try {
        const sales = await Sale.getSales(shopId, filters);
        return { success: true, sales };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    description: "Get sales for a shop",
    parameters: {
      type: "object",
      properties: {
        shopId: { type: "string" },
        filters: {
          type: "object",
          properties: {
            startDate: { type: "string" },
            endDate: { type: "string" },
            customer: { type: "string" }
          }
        }
      },
      required: ["shopId"]
    }
  },

  getSaleById: {
    async function(saleId) {
      try {
        const sale = await Sale.getSaleById(saleId);
        return { success: true, sale };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    description: "Get sale by ID",
    parameters: {
      type: "object",
      properties: {
        saleId: { type: "string" }
      },
      required: ["saleId"]
    }
  },

  processRefund: {
    async function(saleId, refundData) {
      try {
        const sale = await Sale.processRefund(saleId, refundData);
        return { success: true, sale };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    description: "Process a refund for a sale",
    parameters: {
      type: "object",
      properties: {
        saleId: { type: "string" },
        refundData: {
          type: "object",
          properties: {
            reason: { type: "string" },
            processedBy: { type: "string" }
          }
        }
      },
      required: ["saleId", "refundData"]
    }
  },

  // Customer Management
  createCustomer: {
    async function(customerData) {
      try {
        const customer = await Customer.createCustomer(customerData);
        return { success: true, customer };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    description: "Create a new customer",
    parameters: {
      type: "object",
      properties: {
        customerData: {
          type: "object",
          properties: {
            name: { type: "string" },
            phone: { type: "string" },
            shopId: { type: "string" }
          },
          required: ["name", "phone", "shopId"]
        }
      },
      required: ["customerData"]
    }
  },

  getCustomers: {
    async function(shopId, filters = {}) {
      try {
        const customers = await Customer.getCustomers(shopId, filters);
        return { success: true, customers };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    description: "Get customers for a shop",
    parameters: {
      type: "object",
      properties: {
        shopId: { type: "string" },
        filters: {
          type: "object",
          properties: {
            search: { type: "string" }
          }
        }
      },
      required: ["shopId"]
    }
  },

  getCustomerByPhone: {
    async function(phone, shopId) {
      try {
        const customer = await Customer.getCustomerByPhone(phone, shopId);
        return { success: true, customer };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    description: "Get customer by phone number",
    parameters: {
      type: "object",
      properties: {
        phone: { type: "string" },
        shopId: { type: "string" }
      },
      required: ["phone", "shopId"]
    }
  },

  updateCustomer: {
    async function(customerId, updates) {
      try {
        const customer = await Customer.updateCustomer(customerId, updates);
        return { success: true, customer };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    description: "Update customer information",
    parameters: {
      type: "object",
      properties: {
        customerId: { type: "string" },
        updates: { type: "object" }
      },
      required: ["customerId", "updates"]
    }
  },

  addLoyaltyPoints: {
    async function(customerId, points, totalSpent) {
      try {
        const customer = await Customer.addLoyaltyPoints(customerId, points, totalSpent);
        return { success: true, customer };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    description: "Add loyalty points to a customer",
    parameters: {
      type: "object",
      properties: {
        customerId: { type: "string" },
        points: { type: "number" },
        totalSpent: { type: "number" }
      },
      required: ["customerId", "points", "totalSpent"]
    }
  },

  // Stock Management
  createStockMovement: {
    async function(movementData) {
      try {
        const movement = await StockMovement.createStockMovement(movementData);
        return { success: true, movement };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    description: "Create stock movement record",
    parameters: {
      type: "object",
      properties: {
        movementData: {
          type: "object",
          properties: {
            product: { type: "string" },
            shopId: { type: "string" },
            type: { type: "string" },
            quantity: { type: "number" },
            reason: { type: "string" }
          },
          required: ["product", "shopId", "type", "quantity", "reason"]
        }
      },
      required: ["movementData"]
    }
  },

  getStockMovements: {
    async function(productId, limit = 50) {
      try {
        const movements = await StockMovement.getStockMovements(productId, limit);
        return { success: true, movements };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    description: "Get stock movements for a product",
    parameters: {
      type: "object",
      properties: {
        productId: { type: "string" },
        limit: { type: "number", default: 50 }
      },
      required: ["productId"]
    }
  },

  adjustStock: {
    async function(productId, adjustment) {
      try {
        const product = await Product.adjustStock(productId, adjustment);
        return { success: true, product };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    description: "Adjust product stock quantity",
    parameters: {
      type: "object",
      properties: {
        productId: { type: "string" },
        adjustment: {
          type: "object",
          properties: {
            quantity: { type: "number" },
            reason: { type: "string" },
            userId: { type: "string" },
            notes: { type: "string" }
          },
          required: ["quantity", "reason"]
        }
      },
      required: ["productId", "adjustment"]
    }
  },

  // Supplier Management
  createSupplier: {
    async function(supplierData) {
      try {
        const supplier = await Supplier.createSupplier(supplierData);
        return { success: true, supplier };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    description: "Create a new supplier",
    parameters: {
      type: "object",
      properties: {
        supplierData: {
          type: "object",
          properties: {
            name: { type: "string" },
            phone: { type: "string" },
            shopId: { type: "string" }
          },
          required: ["name", "phone", "shopId"]
        }
      },
      required: ["supplierData"]
    }
  },

  getSuppliers: {
    async function(shopId) {
      try {
        const suppliers = await Supplier.getSuppliers(shopId);
        return { success: true, suppliers };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    description: "Get suppliers for a shop",
    parameters: {
      type: "object",
      properties: {
        shopId: { type: "string" }
      },
      required: ["shopId"]
    }
  },

  updateSupplier: {
    async function(supplierId, updates) {
      try {
        const supplier = await Supplier.updateSupplier(supplierId, updates);
        return { success: true, supplier };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    description: "Update supplier information",
    parameters: {
      type: "object",
      properties: {
        supplierId: { type: "string" },
        updates: { type: "object" }
      },
      required: ["supplierId", "updates"]
    }
  },

  // Analytics & Reporting
  generateDailyReport: {
    async function(shopId, date = new Date()) {
      try {
        const report = await DailyReport.generateDailyReport(shopId, date);
        return { success: true, report };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    description: "Generate daily sales report",
    parameters: {
      type: "object",
      properties: {
        shopId: { type: "string" },
        date: { type: "string" }
      },
      required: ["shopId"]
    }
  },

  getDashboardSummary: {
    async function(shopId) {
      try {
        const summary = await Shop.getDashboardSummary(shopId);
        return { success: true, ...summary };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    description: "Get dashboard summary for a shop",
    parameters: {
      type: "object",
      properties: {
        shopId: { type: "string" }
      },
      required: ["shopId"]
    }
  },

  // Notification Functions
  createNotification: {
    async function(notificationData) {
      try {
        const notification = await Notification.createNotification(notificationData);
        return { success: true, notification };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    description: "Create a notification",
    parameters: {
      type: "object",
      properties: {
        notificationData: {
          type: "object",
          properties: {
            shopId: { type: "string" },
            type: { type: "string" },
            title: { type: "string" },
            message: { type: "string" }
          },
          required: ["shopId", "type", "title", "message"]
        }
      },
      required: ["notificationData"]
    }
  },

  getNotifications: {
    async function(shopId, filters = {}) {
      try {
        const notifications = await Notification.getNotifications(shopId, filters);
        return { success: true, notifications };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    description: "Get notifications for a shop",
    parameters: {
      type: "object",
      properties: {
        shopId: { type: "string" },
        filters: {
          type: "object",
          properties: {
            unreadOnly: { type: "boolean" },
            type: { type: "string" },
            limit: { type: "number" }
          }
        }
      },
      required: ["shopId"]
    }
  },

  markNotificationAsRead: {
    async function(notificationId) {
      try {
        const notification = await Notification.markNotificationAsRead(notificationId);
        return { success: true, notification };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    description: "Mark notification as read",
    parameters: {
      type: "object",
      properties: {
        notificationId: { type: "string" }
      },
      required: ["notificationId"]
    }
  },

  // Discount Functions
  createDiscount: {
    async function(discountData) {
      try {
        const discount = await Discount.createDiscount(discountData);
        return { success: true, discount };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    description: "Create a discount/promo",
    parameters: {
      type: "object",
      properties: {
        discountData: {
          type: "object",
          properties: {
            name: { type: "string" },
            code: { type: "string" },
            shopId: { type: "string" },
            type: { type: "string" },
            value: { type: "number" }
          },
          required: ["name", "code", "shopId", "type", "value"]
        }
      },
      required: ["discountData"]
    }
  },

  getActiveDiscounts: {
    async function(shopId) {
      try {
        const discounts = await Discount.getActiveDiscounts(shopId);
        return { success: true, discounts };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    description: "Get active discounts for a shop",
    parameters: {
      type: "object",
      properties: {
        shopId: { type: "string" }
      },
      required: ["shopId"]
    }
  },

  // Category Management
  createCategory: {
    async function(categoryData) {
      try {
        const category = await Category.createCategory(categoryData);
        return { success: true, category };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    description: "Create a new product category",
    parameters: {
      type: "object",
      properties: {
        categoryData: {
          type: "object",
          properties: {
            name: { type: "string" },
            shopId: { type: "string" }
          },
          required: ["name", "shopId"]
        }
      },
      required: ["categoryData"]
    }
  },

  getCategories: {
    async function(shopId, includeInactive = false) {
      try {
        const categories = await Category.getCategories(shopId, includeInactive);
        return { success: true, categories };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    description: "Get categories for a shop",
    parameters: {
      type: "object",
      properties: {
        shopId: { type: "string" },
        includeInactive: { type: "boolean", default: false }
      },
      required: ["shopId"]
    }
  },

  getCategoryById: {
    async function(categoryId) {
      try {
        const category = await Category.getCategoryById(categoryId);
        return { success: true, category };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    description: "Get category by ID",
    parameters: {
      type: "object",
      properties: {
        categoryId: { type: "string" }
      },
      required: ["categoryId"]
    }
  },

  updateCategory: {
    async function(categoryId, updates) {
      try {
        const category = await Category.updateCategory(categoryId, updates);
        return { success: true, category };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    description: "Update category information",
    parameters: {
      type: "object",
      properties: {
        categoryId: { type: "string" },
        updates: { type: "object" }
      },
      required: ["categoryId", "updates"]
    }
  },

  deleteCategory: {
    async function(categoryId) {
      try {
        const category = await Category.deleteCategory(categoryId);
        return { success: true, category };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    description: "Delete a category",
    parameters: {
      type: "object",
      properties: {
        categoryId: { type: "string" }
      },
      required: ["categoryId"]
    }
  },

  getProductsByCategory: {
    async function(categoryId) {
      try {
        const products = await Category.getProductsByCategory(categoryId);
        return { success: true, products };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    description: "Get products by category",
    parameters: {
      type: "object",
      properties: {
        categoryId: { type: "string" }
      },
      required: ["categoryId"]
    }
  },

  getCategoryHierarchy: {
    async function(shopId) {
      try {
        const hierarchy = await Category.getCategoryHierarchy(shopId);
        return { success: true, hierarchy };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    description: "Get category hierarchy for a shop",
    parameters: {
      type: "object",
      properties: {
        shopId: { type: "string" }
      },
      required: ["shopId"]
    }
  },

  // Product-Category Relations
  addProductToCategory: {
    async function(categoryId, productId) {
      try {
        const category = await Category.addProductToCategory(categoryId, productId);
        return { success: true, category };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    description: "Add product to category",
    parameters: {
      type: "object",
      properties: {
        categoryId: { type: "string" },
        productId: { type: "string" }
      },
      required: ["categoryId", "productId"]
    }
  },

  removeProductFromCategory: {
    async function(categoryId, productId) {
      try {
        const category = await Category.removeProductFromCategory(categoryId, productId);
        return { success: true, category };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    description: "Remove product from category",
    parameters: {
      type: "object",
      properties: {
        categoryId: { type: "string" },
        productId: { type: "string" }
      },
      required: ["categoryId", "productId"]
    }
  },

  // Utility Functions
  runDailyTasks: {
    async function() {
      try {
        await Shop.runDailyTasks();
        return { success: true, message: "Daily tasks completed" };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    description: "Run daily maintenance tasks",
    parameters: { type: "object", properties: {} }
  },

  getAvailablePermissions: {
    async function() {
      return { success: true, permissions: AVAILABLE_PERMISSIONS };
    },
    description: "Get available permission modules",
    parameters: { type: "object", properties: {} }
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

    const result = await functionConfig.function(...Object.values(parameters));
    return {
      success: true,
      result,
      functionName
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      functionName
    };
  }
};

// Enhanced Groq chat completion
export async function getGroqChatCompletion(userQuestion, userId = null, shopId = null) {
  try {
    const tools = createFunctionTools();
    const masterShopContext = userId ? 
      `\nUser Master Shop: ${(await User.findById(userId))?.masterShop || 'None'}` : 
      '';

    const systemPrompt = `You are Afia AI, a retail management assistant specialized in Ghanaian retail operations.
Master Shop System Features:
- Hierarchical shop management (Master > Branches)
- Consolidated financial reporting
- Cross-shop inventory tracking
- Network-wide analytics
- User debt management across shops
- Granular permission system

User Context:
- User ID: ${userId || 'Not specified'} ${masterShopContext}
- Current Shop: ${shopId || 'Not specified'}

Security Protocols:
- Never reveal passwords or sensitive user data
- Cannot create owner accounts
- Restrict shop access based on user permissions
- Mask financial details in responses
- Verify user has required permissions before operations

Available Functions:
${Object.keys(availableFunctions).map(f => `- ${f}`).join('\n')}`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userQuestion }
    ];

    const response = await groq.chat.completions.create({
      model: "llama3-70b-8192",
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
        
        // Add security context
        if (userId) parameters.userId = userId;
        if (shopId && functionName !== 'createMasterShop') parameters.shopId = shopId;
        
        const result = await executeFunctionCall(functionName, parameters);
        functionResults.push({
          toolCallId: toolCall.id,
          result
        });
      }
      
      // Add function results to conversation
      messages.push(assistantMessage);
      
      for (const { toolCallId, result } of functionResults) {
        messages.push({
          role: "tool",
          tool_call_id: toolCallId,
          content: JSON.stringify(result)
        });
      }
      
      // Get final response
      const finalResponse = await groq.chat.completions.create({
        model: "llama3-70b-8192",
        messages,
        temperature: 0.7,
        max_tokens: 4000
      });
      
      return {
        response: finalResponse.choices[0].message.content,
        functionCalls: functionResults
      };
    }
    
    return {
      response: assistantMessage.content,
      functionCalls: []
    };
    
  } catch (error) {
    return {
      response: "I encountered an error: " + error.message,
      functionCalls: []
    };
  }
}

// Main function
export async function main(userQuestion, userId = null, shopId = null) {
  try {
    const result = await getGroqChatCompletion(userQuestion, userId, shopId);
    
    // Mask sensitive data in response
    const safeResponse = result.response.replace(/(password|token|auth)=[^&\s]+/gi, '[REDACTED]');
    
    return {
      response: safeResponse,
      functionCalls: result.functionCalls.map(fc => ({
        functionName: fc.result.functionName,
        success: fc.result.success
      }))
    };
  } catch (error) {
    return {
      response: "System error: " + error.message,
      functionCalls: []
    };
  }
}

// Health check
export async function healthCheck() {
  return {
    status: "active",
    version: "3.0",
    features: Object.keys(availableFunctions),
    dbStatus: mongoose.connection.readyState === 1 ? "connected" : "disconnected"
  };
}

// Export primary functions only
export default { main, healthCheck };