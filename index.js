import express from 'express';
import cors from 'cors';
import { main, runTests,} from './afia.js';
import {
  runDailyTasks,
  sendProductQRCode,
  registerUser,
  loginUser,
    createShop,
    getShop,
    getShopById, // Alias
    updateShop,
    deleteShop,
    permanentDeleteShop,
    getUserShops,
    getAllShops,
    setCurrentShop,
    getCurrentShop,
    checkShopPermission,
    getShopStats,
    getShopsForUser,
    getAllShopsByUserId, // Alias
    getUserShopsByRole,
    getUserOwnedShops,
    getUserManagedShops,
    getUserStaffShops,
    getUserShopsByPermission,
    getUserShopAccess,
    getUserCurrentShop, // Alias
    getShopUsers,
    searchUsersInShops,
    
    // Master shop management
    createShopWithMasterOption,
    setMasterShop,
    connectShopToMaster,
    disconnectShopFromMaster,
    
    // Network operations
    getMasterShopNetwork,
    getShopNetworkHierarchy,
    getShopNetworkAnalytics,
    
    // Financial operations
    getConsolidatedFinancialReport,
    getUserDebtSummary,
    updateUserShopDebt,
    transferBetweenShops,
    
    // Transaction management
    recordCrossShopTransaction,
    getUserCrossShopTransactions,
    
  
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
  createProduct,
  getProducts,
  getProductByQR,
  updateProduct,
  deleteProduct,
  getLowStockProducts,
  createCustomer,
  getCustomers,
  getCustomerByPhone,
  updateCustomer,
  addLoyaltyPoints,
  createSale,
  getSales,
  getSaleById,
  processRefund,
  createStockMovement,
  getStockMovements,
  adjustStock,
  createSupplier,
  getSuppliers,
  updateSupplier,
  generateDailyReport,
  getSalesAnalytics,
  getInventoryAnalytics,
  getCustomerAnalytics,
  createNotification,
  getNotifications,
  markNotificationAsRead,
  checkLowStockAndNotify,
  createDiscount,
  getActiveDiscounts,
  applyDiscount,
  generateProductQRCode,
  getDashboardSummary,
  backupShopData
} from './main.js';
const app = express();

// CORS configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Shop-ID'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Error handling middleware
const errorHandler = (error, req, res, next) => {
  console.error('API Error:', error);
  
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    },
    timestamp: new Date().toISOString()
  });
};

// Helper function to extract shop ID from headers or body
const getShopId = (req) => {
  return req.headers['x-shop-id'] || req.body.shopId || req.query.shopId;
};

// Helper function to send standardized responses
const sendResponse = (res, data, statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    data,
    timestamp: new Date().toISOString()
  });
};

// ============================================================================
// AFIA AI CHAT ENDPOINTS
// ============================================================================

// POST /api/afia/chat - Main chat endpoint
app.post('/api/afia/chat', async (req, res, next) => {
  try {
    const { question, systemPrompt } = req.body;
    const shopId = getShopId(req);
    
    if (!question) {
      return res.status(400).json({
        success: false,
        error: { message: 'Question is required' },
        timestamp: new Date().toISOString()
      });
    }
    
    const result = await main(question, shopId);
    sendResponse(res, result);
    
  } catch (error) {
    next(error);
  }
});


// ============================================================================
// TESTING ENDPOINTS
// ============================================================================

// POST /api/afia/test - Run test suite
app.post('/api/afia/test', async (req, res, next) => {
  try {
    // Only allow in development mode
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: { message: 'Tests are not available in production' },
        timestamp: new Date().toISOString()
      });
    }
    
    const result = await runTests();
    sendResponse(res, { message: 'Tests completed', result });
    
  } catch (error) {
    next(error);
  }
});

// ========================= AUTHENTICATION ROUTES =========================

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  try {
    const result = await registerUser(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const result = await loginUser(req.body);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ========================= SHOP MANAGEMENT ROUTES =========================
// ========================= MASTER SHOP SYSTEM ENDPOINTS =========================

// POST /api/shops/master - Create shop with master option
app.post('/api/shops/master', async (req, res) => {
  try {
    const { setAsMaster = false, ...shopData } = req.body;
    const shop = await createShopWithMasterOption(shopData, req.user.id, setAsMaster);
    res.status(201).json({ success: true, data: shop });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/users/:userId/master-shop - Set master shop
app.put('/api/users/:userId/master-shop', async (req, res) => {
  try {
    const { shopId } = req.body;
    const result = await setMasterShop(req.params.userId, shopId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/shops/:shopId/connect-to-master - Connect shop to master
app.post('/api/shops/:shopId/connect-to-master', async (req, res) => {
  try {
    const { masterShopId, connectionType = 'branch', financialSettings = {} } = req.body;
    const result = await connectShopToMaster(req.params.shopId, masterShopId, connectionType, financialSettings);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/users/:userId/master-shop-network - Get master shop network
app.get('/api/users/:userId/master-shop-network', async (req, res) => {
  try {
    const network = await getMasterShopNetwork(req.params.userId);
    res.status(200).json({ success: true, data: network });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
});

// GET /api/users/:userId/consolidated-financial-report - Get consolidated financial report
app.get('/api/users/:userId/consolidated-financial-report', async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;
    const dateRange = {};
    if (fromDate) dateRange.fromDate = fromDate;
    if (toDate) dateRange.toDate = toDate;
    
    const report = await getConsolidatedFinancialReport(req.params.userId, dateRange);
    res.status(200).json({ success: true, data: report });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
});

// POST /api/cross-shop-transactions - Record cross-shop transaction
app.post('/api/cross-shop-transactions', async (req, res) => {
  try {
    const transaction = await recordCrossShopTransaction(req.body);
    res.status(201).json({ success: true, data: transaction });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/users/:userId/debt-summary - Get user debt summary
app.get('/api/users/:userId/debt-summary', async (req, res) => {
  try {
    const summary = await getUserDebtSummary(req.params.userId);
    res.status(200).json({ success: true, data: summary });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
});

// POST /api/shops/transfer - Transfer funds between shops
app.post('/api/shops/transfer', async (req, res) => {
  try {
    const { fromShopId, toShopId, amount, description = '' } = req.body;
    const result = await transferBetweenShops(fromShopId, toShopId, amount, req.user.id, description);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/users/:userId/cross-shop-transactions - Get user cross-shop transactions
app.get('/api/users/:userId/cross-shop-transactions', async (req, res) => {
  try {
    const { transactionType, status, fromDate, toDate, limit } = req.query;
    const filters = {};
    if (transactionType) filters.transactionType = transactionType;
    if (status) filters.status = status;
    if (fromDate && toDate) {
      filters.fromDate = fromDate;
      filters.toDate = toDate;
    }
    if (limit) filters.limit = parseInt(limit);
    
    const transactions = await getUserCrossShopTransactions(req.params.userId, filters);
    res.status(200).json({ success: true, data: transactions });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
});

// DELETE /api/shops/:shopId/disconnect-from-master - Disconnect shop from master
app.delete('/api/shops/:shopId/disconnect-from-master', async (req, res) => {
  try {
    const result = await disconnectShopFromMaster(req.params.shopId, req.user.id);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/users/:userId/shop-network-hierarchy - Get shop network hierarchy
app.get('/api/users/:userId/shop-network-hierarchy', async (req, res) => {
  try {
    const hierarchy = await getShopNetworkHierarchy(req.params.userId);
    res.status(200).json({ success: true, data: hierarchy });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
});

// PUT /api/users/:userId/shops/:shopId/debt - Update user shop debt
app.put('/api/users/:userId/shops/:shopId/debt', async (req, res) => {
  try {
    const { newAmount, description = '' } = req.body;
    const result = await updateUserShopDebt(req.params.userId, req.params.shopId, newAmount, description);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/users/:userId/shop-network-analytics - Get comprehensive shop network analytics
app.get('/api/users/:userId/shop-network-analytics', async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;
    const dateRange = {};
    if (fromDate) dateRange.fromDate = fromDate;
    if (toDate) dateRange.toDate = toDate;
    
    const analytics = await getShopNetworkAnalytics(req.params.userId, dateRange);
    res.status(200).json({ success: true, data: analytics });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
});

// ========================= MISSING UTILITY ENDPOINTS =========================

// GET /api/shops/:shopId/details - Get shop by ID (alias)
app.get('/api/shops/:shopId/details', async (req, res) => {
  try {
    const shop = await getShopById(req.params.shopId);
    res.status(200).json({ success: true, data: shop });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
});

// GET /api/users/:userId/shops/all - Get all shops by user ID (alias)
app.get('/api/users/:userId/shops/all', async (req, res) => {
  try {
    const result = await getAllShopsByUserId(req.params.userId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
});

// GET /api/users/:userId/shops/for-user - Get shops for user (alias)
app.get('/api/users/:userId/shops/for-user', async (req, res) => {
  try {
    const result = await getShopsForUser(req.params.userId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
});

// GET /api/users/:userId/shops/:shopId/permissions/:permission - Check shop permission
app.get('/api/users/:userId/shops/:shopId/permissions/:permission', async (req, res) => {
  try {
    const hasPermission = await checkShopPermission(req.params.userId, req.params.shopId, req.params.permission);
    res.status(200).json({ 
      success: true, 
      data: { 
        hasPermission,
        userId: req.params.userId,
        shopId: req.params.shopId,
        permission: req.params.permission
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ========================= UPDATED EXISTING ENDPOINTS =========================

// POST /api/shops - Updated to support master shop option
app.post('/api/shops', async (req, res) => {
  try {
    const { setAsMaster = false, ...shopData } = req.body;
    const shop = await createShop(shopData, req.user.id, setAsMaster);
    res.status(201).json({ success: true, data: shop });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/shops - Updated with master shop filtering
app.get('/api/shops', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', filterByLevel = '' } = req.query;
    const result = await getAllShops(parseInt(page), parseInt(limit), search, filterByLevel);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/shops/:shopId
app.put('/api/shops/:shopId', async (req, res) => {
 try {
   const shop = await updateShop(req.params.shopId, req.body);
   res.status(200).json({ success: true, data: shop });
 } catch (error) {
   res.status(400).json({ success: false, message: error.message });
 }
});

// DELETE /api/shops/:shopId
app.delete('/api/shops/:shopId', async (req, res) => {
 try {
   const result = await deleteShop(req.params.shopId, req.user.id);
   res.status(200).json({ success: true, data: result });
 } catch (error) {
   res.status(400).json({ success: false, message: error.message });
 }
});

// DELETE /api/shops/:shopId/permanent
app.delete('/api/shops/:shopId/permanent', async (req, res) => {
 try {
   const result = await permanentDeleteShop(req.params.shopId, req.user.id);
   res.status(200).json({ success: true, data: result });
 } catch (error) {
   res.status(400).json({ success: false, message: error.message });
 }
});

// GET /api/users/:userId/shops
app.get('/api/users/:userId/shops', async (req, res) => {
 try {
   const shops = await getUserShops(req.params.userId);
   res.status(200).json({ success: true, data: shops });
 } catch (error) {
   res.status(404).json({ success: false, message: error.message });
 }
});

// GET /api/shops
app.get('/api/shops', async (req, res) => {
 try {
   const { page = 1, limit = 10, search = '' } = req.query;
   const result = await getAllShops(parseInt(page), parseInt(limit), search);
   res.status(200).json({ success: true, data: result });
 } catch (error) {
   res.status(400).json({ success: false, message: error.message });
 }
});

// PUT /api/users/:userId/current-shop
app.put('/api/users/:userId/current-shop', async (req, res) => {
 try {
   const shop = await setCurrentShop(req.params.userId, req.body.shopId);
   res.status(200).json({ success: true, data: shop });
 } catch (error) {
   res.status(400).json({ success: false, message: error.message });
 }
});

// GET /api/users/:userId/current-shop
app.get('/api/users/:userId/current-shop', async (req, res) => {
 try {
   const shop = await getCurrentShop(req.params.userId);
   res.status(200).json({ success: true, data: shop });
 } catch (error) {
   res.status(404).json({ success: false, message: error.message });
 }
});

// GET /api/shops/:shopId/stats
app.get('/api/shops/:shopId/stats', async (req, res) => {
 try {
   const stats = await getShopStats(req.params.shopId);
   res.status(200).json({ success: true, data: stats });
 } catch (error) {
   res.status(404).json({ success: false, message: error.message });
 }
});

// GET /api/users/:userId/all-shops
app.get('/api/users/:userId/all-shops', async (req, res) => {
 try {
   const result = await getShopsForUser(req.params.userId);
   res.status(200).json({ success: true, data: result });
 } catch (error) {
   res.status(404).json({ success: false, message: error.message });
 }
});

// GET /api/users/:userId/shops/role/:role
app.get('/api/users/:userId/shops/role/:role', async (req, res) => {
 try {
   const result = await getUserShopsByRole(req.params.userId, req.params.role);
   res.status(200).json({ success: true, data: result });
 } catch (error) {
   res.status(404).json({ success: false, message: error.message });
 }
});

// GET /api/users/:userId/owned-shops
app.get('/api/users/:userId/owned-shops', async (req, res) => {
 try {
   const result = await getUserOwnedShops(req.params.userId);
   res.status(200).json({ success: true, data: result });
 } catch (error) {
   res.status(404).json({ success: false, message: error.message });
 }
});

// GET /api/users/:userId/managed-shops
app.get('/api/users/:userId/managed-shops', async (req, res) => {
 try {
   const result = await getUserManagedShops(req.params.userId);
   res.status(200).json({ success: true, data: result });
 } catch (error) {
   res.status(404).json({ success: false, message: error.message });
 }
});

// GET /api/users/:userId/staff-shops
app.get('/api/users/:userId/staff-shops', async (req, res) => {
 try {
   const result = await getUserStaffShops(req.params.userId);
   res.status(200).json({ success: true, data: result });
 } catch (error) {
   res.status(404).json({ success: false, message: error.message });
 }
});

// GET /api/users/:userId/shops/permission/:permission
app.get('/api/users/:userId/shops/permission/:permission', async (req, res) => {
 try {
   const result = await getUserShopsByPermission(req.params.userId, req.params.permission);
   res.status(200).json({ success: true, data: result });
 } catch (error) {
   res.status(404).json({ success: false, message: error.message });
 }
});

// GET /api/users/:userId/shops/:shopId/access
app.get('/api/users/:userId/shops/:shopId/access', async (req, res) => {
 try {
   const result = await getUserShopAccess(req.params.userId, req.params.shopId);
   res.status(200).json({ success: true, data: result });
 } catch (error) {
   res.status(404).json({ success: false, message: error.message });
 }
});

// GET /api/users/:userId/current-shop-details
app.get('/api/users/:userId/current-shop-details', async (req, res) => {
 try {
   const result = await getUserCurrentShop(req.params.userId);
   res.status(200).json({ success: true, data: result });
 } catch (error) {
   res.status(404).json({ success: false, message: error.message });
 }
});

// GET /api/shops/:shopId/users
app.get('/api/shops/:shopId/users', async (req, res) => {
 try {
   const result = await getShopUsers(req.params.shopId);
   res.status(200).json({ success: true, data: result });
 } catch (error) {
   res.status(404).json({ success: false, message: error.message });
 }
});

// GET /api/users/search
app.get('/api/users/search', async (req, res) => {
 try {
   const { term, shopIds } = req.query;
   const shopIdArray = shopIds ? shopIds.split(',') : [];
   const result = await searchUsersInShops(term, shopIdArray);
   res.status(200).json({ success: true, data: result });
 } catch (error) {
   res.status(400).json({ success: false, message: error.message });
 }
});
// ========================= CATEGORY MANAGEMENT ROUTES =========================

// POST /api/categories
app.post('/api/categories', async (req, res) => {
  try {
    const category = await createCategory(req.body);
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/categories/:shopId
app.get('/api/categories/:shopId', async (req, res) => {
  try {
    const categories = await getCategories(req.params.shopId);
    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/categories/:categoryId
app.put('/api/categories/:categoryId', async (req, res) => {
  try {
    const category = await updateCategory(req.params.categoryId, req.body);
    res.status(200).json({ success: true, data: category });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE /api/categories/:categoryId
app.delete('/api/categories/:categoryId', async (req, res) => {
  try {
    const category = await deleteCategory(req.params.categoryId);
    res.status(200).json({ success: true, data: category });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ========================= PRODUCT MANAGEMENT ROUTES =========================

// POST /api/products
app.post('/api/products', async (req, res) => {
  try {
    const product = await createProduct(req.body);
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/products/:shopId
app.get('/api/products/:shopId', async (req, res) => {
  try {
    const products = await getProducts(req.params.shopId, req.query);
    res.status(200).json({ success: true, data: products });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/products/qr/:qrCode
app.get('/api/products/qr/:qrCode', async (req, res) => {
  try {
    const product = await getProductByQR(req.params.qrCode);
    res.status(200).json({ success: true, data: product });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
});

// PUT /api/products/:productId
app.put('/api/products/:productId', async (req, res) => {
  try {
    const product = await updateProduct(req.params.productId, req.body);
    res.status(200).json({ success: true, data: product });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE /api/products/:productId
app.delete('/api/products/:productId', async (req, res) => {
  try {
    const product = await deleteProduct(req.params.productId);
    res.status(200).json({ success: true, data: product });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/products/:shopId/low-stock
app.get('/api/products/:shopId/low-stock', async (req, res) => {
  try {
    const products = await getLowStockProducts(req.params.shopId);
    res.status(200).json({ success: true, data: products });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/products/:productId/qr
app.post('/api/products/:productId/qr', async (req, res) => {
  try {
    const qrCode = await sendProductQRCode(req.body.shopId, req.params.productId, req.body.userCallback);
    res.status(200).json({ success: true, data: { qrCode } });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ========================= CUSTOMER MANAGEMENT ROUTES =========================

// POST /api/customers
app.post('/api/customers', async (req, res) => {
  try {
    const customer = await createCustomer(req.body);
    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/customers/:shopId
app.get('/api/customers/:shopId', async (req, res) => {
  try {
    const customers = await getCustomers(req.params.shopId, req.query);
    res.status(200).json({ success: true, data: customers });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/customers/phone/:phone/:shopId
app.get('/api/customers/phone/:phone/:shopId', async (req, res) => {
  try {
    const customer = await getCustomerByPhone(req.params.phone, req.params.shopId);
    res.status(200).json({ success: true, data: customer });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
});

// PUT /api/customers/:customerId
app.put('/api/customers/:customerId', async (req, res) => {
  try {
    const customer = await updateCustomer(req.params.customerId, req.body);
    res.status(200).json({ success: true, data: customer });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/customers/:customerId/loyalty
app.post('/api/customers/:customerId/loyalty', async (req, res) => {
  try {
    const customer = await addLoyaltyPoints(req.params.customerId, req.body.points, req.body.totalSpent);
    res.status(200).json({ success: true, data: customer });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ========================= SALES MANAGEMENT ROUTES =========================

// POST /api/sales
app.post('/api/sales', async (req, res) => {
  try {
    const sale = await createSale(req.body);
    res.status(201).json({ success: true, data: sale });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/sales/:shopId
app.get('/api/sales/:shopId', async (req, res) => {
  try {
    const sales = await getSales(req.params.shopId, req.query);
    res.status(200).json({ success: true, data: sales });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/sales/sale/:saleId
app.get('/api/sales/sale/:saleId', async (req, res) => {
  try {
    const sale = await getSaleById(req.params.saleId);
    res.status(200).json({ success: true, data: sale });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
});

// POST /api/sales/:saleId/refund
app.post('/api/sales/:saleId/refund', async (req, res) => {
  try {
    const sale = await processRefund(req.params.saleId, req.body);
    res.status(200).json({ success: true, data: sale });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ========================= STOCK MANAGEMENT ROUTES =========================

// POST /api/stock/movements
app.post('/api/stock/movements', async (req, res) => {
  try {
    const movement = await createStockMovement(req.body);
    res.status(201).json({ success: true, data: movement });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/stock/movements/:productId
app.get('/api/stock/movements/:productId', async (req, res) => {
  try {
    const movements = await getStockMovements(req.params.productId, req.query.limit);
    res.status(200).json({ success: true, data: movements });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/stock/adjust/:productId
app.post('/api/stock/adjust/:productId', async (req, res) => {
  try {
    const product = await adjustStock(req.params.productId, req.body);
    res.status(200).json({ success: true, data: product });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ========================= SUPPLIER MANAGEMENT ROUTES =========================

// POST /api/suppliers
app.post('/api/suppliers', async (req, res) => {
  try {
    const supplier = await createSupplier(req.body);
    res.status(201).json({ success: true, data: supplier });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/suppliers/:shopId
app.get('/api/suppliers/:shopId', async (req, res) => {
  try {
    const suppliers = await getSuppliers(req.params.shopId);
    res.status(200).json({ success: true, data: suppliers });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/suppliers/:supplierId
app.put('/api/suppliers/:supplierId', async (req, res) => {
  try {
    const supplier = await updateSupplier(req.params.supplierId, req.body);
    res.status(200).json({ success: true, data: supplier });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ========================= ANALYTICS ROUTES =========================

// GET /api/analytics/daily-report/:shopId
app.get('/api/analytics/daily-report/:shopId', async (req, res) => {
  try {
    const report = await generateDailyReport(req.params.shopId, req.query.date);
    res.status(200).json({ success: true, data: report });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/analytics/sales/:shopId
app.get('/api/analytics/sales/:shopId', async (req, res) => {
  try {
    const analytics = await getSalesAnalytics(req.params.shopId, req.query.startDate, req.query.endDate);
    res.status(200).json({ success: true, data: analytics });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/analytics/inventory/:shopId
app.get('/api/analytics/inventory/:shopId', async (req, res) => {
  try {
    const analytics = await getInventoryAnalytics(req.params.shopId);
    res.status(200).json({ success: true, data: analytics });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/analytics/customers/:shopId
app.get('/api/analytics/customers/:shopId', async (req, res) => {
  try {
    const analytics = await getCustomerAnalytics(req.params.shopId, req.query.startDate, req.query.endDate);
    res.status(200).json({ success: true, data: analytics });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ========================= NOTIFICATION ROUTES =========================

// POST /api/notifications
app.post('/api/notifications', async (req, res) => {
  try {
    const notification = await createNotification(req.body);
    res.status(201).json({ success: true, data: notification });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/notifications/:shopId
app.get('/api/notifications/:shopId', async (req, res) => {
  try {
    const notifications = await getNotifications(req.params.shopId, req.query);
    res.status(200).json({ success: true, data: notifications });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/notifications/:notificationId/read
app.put('/api/notifications/:notificationId/read', async (req, res) => {
  try {
    const notification = await markNotificationAsRead(req.params.notificationId);
    res.status(200).json({ success: true, data: notification });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/notifications/:shopId/low-stock-check
app.post('/api/notifications/:shopId/low-stock-check', async (req, res) => {
  try {
    const notification = await checkLowStockAndNotify(req.params.shopId);
    res.status(200).json({ success: true, data: notification });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ========================= DISCOUNT ROUTES =========================

// POST /api/discounts
app.post('/api/discounts', async (req, res) => {
  try {
    const discount = await createDiscount(req.body);
    res.status(201).json({ success: true, data: discount });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/discounts/:shopId/active
app.get('/api/discounts/:shopId/active', async (req, res) => {
  try {
    const discounts = await getActiveDiscounts(req.params.shopId);
    res.status(200).json({ success: true, data: discounts });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/discounts/apply
app.post('/api/discounts/apply', async (req, res) => {
  try {
    const result = await applyDiscount(req.body.discountCode, req.body.saleData);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ========================= UTILITY ROUTES =========================

// GET /api/products/:productId/qr-code
app.get('/api/products/:productId/qr-code', async (req, res) => {
  try {
    const qrCode = await generateProductQRCode(req.params.productId);
    res.status(200).json({ success: true, data: { qrCode } });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/dashboard/:shopId
app.get('/api/dashboard/:shopId', async (req, res) => {
  try {
    const summary = await getDashboardSummary(req.params.shopId);
    res.status(200).json({ success: true, data: summary });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/backup/:shopId
app.get('/api/backup/:shopId', async (req, res) => {
  try {
    const backup = await backupShopData(req.params.shopId);
    res.status(200).json({ success: true, data: backup });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/tasks/daily
app.post('/api/tasks/daily', async (req, res) => {
  try {
    await runDailyTasks();
    res.status(200).json({ success: true, message: 'Daily tasks completed successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});


app.get('/', (req, res) => {
  res.send('Retail360 API is running');
})

app.listen(process.env.port, () => {
  console.log(`Retail360 app listening on port ${process.env.port}`)
})

export default app;