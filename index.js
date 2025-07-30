import express from 'express';
import cors from 'cors';
import {
  initializeApp,
  registerUser,
  loginUser,
  createShop,
  setMasterShop,
  connectShopToMaster,
  getMasterShopNetwork,
  getConsolidatedFinancialReport,
  getShop,
  updateShop,
  deleteShop,
  getUserShops,
  setCurrentShop,
  getShopStats,
  createProduct,
  getProducts,
  getProductByQR,
  updateProduct,
  deleteProduct,
  getLowStockProducts,
  createSale,
  getSales,
  getSaleById,
  processRefund,
  createCustomer,
  getCustomers,
  getCustomerByPhone,
  updateCustomer,
  addLoyaltyPoints,
  createStockMovement,
  getStockMovements,
  adjustStock,
  createSupplier,
  getSuppliers,
  updateSupplier,
  generateDailyReport,
  getDashboardSummary,
  createNotification,
  getNotifications,
  markNotificationAsRead,
  createDiscount,
  getActiveDiscounts,
  recordCrossShopTransaction,
  runDailyTasks,
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  getProductsByCategory,
  getCategoryHierarchy,
getAvailablePermissions,
  registerStaff,
  updateUserRoleAndPermissions,
  getShopStaff,
  removeStaffFromShop,
  getUserPermissions
} from './main.js';

import { main } from './afia.js';
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

// Initialize app
initializeApp();

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Error handling middleware
app.use((error, req, res, next) => {
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
});



// POST /api/afia/chat - AI Chat Endpoint
app.post('/api/afia/chat', async (req, res) => {
  try {
    const { userQuestion, userId = null, shopId = null } = req.body;
    
    if (!userQuestion || typeof userQuestion !== 'string') {
      return res.status(400).json({ 
        success: false,
        error: 'Valid userQuestion string is required'
      });
    }

    const result = await main(userQuestion, userId, shopId);
    
    res.json({
      success: true,
      response: result.response,
      functionCalls: result.functionCalls
    });
  } catch (error) {
    console.error('AFIA Chat Error:', error);
    res.status(500).json({
      success: false,
      error: 'AI processing failed',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal error'
    });
  }
});

// ========================= AUTHENTICATION ROUTES =========================
app.post('/api/auth/register', async (req, res) => {
  try {
    const result = await registerUser(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const result = await loginUser(req.body);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ========================= SHOP MANAGEMENT ROUTES =========================
app.post('/api/shops', async (req, res) => {
  try {
    const { setAsMaster = false, ...shopData } = req.body;
    const shop = await createShop(shopData, req.body.userId, setAsMaster);
    res.status(201).json({ success: true, data: shop });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.put('/api/users/:userId/master-shop', async (req, res) => {
  try {
    const { shopId } = req.body;
    const result = await setMasterShop(req.params.userId, shopId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.post('/api/shops/:shopId/connect-to-master', async (req, res) => {
  try {
    const { masterShopId, connectionType = 'branch', financialSettings = {} } = req.body;
    const result = await connectShopToMaster(req.params.shopId, masterShopId, connectionType, financialSettings);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.get('/api/users/:userId/master-shop-network', async (req, res) => {
  try {
    const network = await getMasterShopNetwork(req.params.userId);
    res.status(200).json({ success: true, data: network });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
});

app.get('/api/users/:userId/consolidated-financial-report', async (req, res) => {
  try {
    const report = await getConsolidatedFinancialReport(req.params.userId);
    res.status(200).json({ success: true, data: report });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
});

app.get('/api/shops/:shopId', async (req, res) => {
  try {
    const shop = await getShop(req.params.shopId);
    res.status(200).json({ success: true, data: shop });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
});

app.put('/api/shops/:shopId', async (req, res) => {
  try {
    const shop = await updateShop(req.params.shopId, req.body);
    res.status(200).json({ success: true, data: shop });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.delete('/api/shops/:shopId', async (req, res) => {
  try {
    const result = await deleteShop(req.params.shopId, req.body.userId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.get('/api/users/:userId/shops', async (req, res) => {
  try {
    const shops = await getUserShops(req.params.userId);
    res.status(200).json({ success: true, data: shops });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
});

app.put('/api/users/:userId/switch/current-shop', async (req, res) => {
  try {
    const shop = await setCurrentShop(req.params.userId, req.body.shopId);
    res.status(200).json({ success: true, data: shop });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});



//  with this corrected version:
app.get('/api/users/:userId/current-shop', async (req, res) => {
  try {
    const userShops = await getUserShops(req.params.userId);
    const currentShop = userShops.currentShop;
    res.status(200).json({ success: true, data: { currentShop } });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
});



app.get('/api/shops/:shopId/stats', async (req, res) => {
  try {
    const stats = await getShopStats(req.params.shopId);
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
});

// Get available permissions
app.get('/api/permissions/available', async (req, res) => {
  try {
    const permissions = getAvailablePermissions();
    res.status(200).json({ success: true, data: permissions });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Register staff member
app.post('/api/staff/register', async (req, res) => {
  try {
    const { registeredByUserId, ...staffData } = req.body;
    const result = await registerStaff(staffData, registeredByUserId);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update user role and permissions
app.put('/api/staff/:targetUserId/role-permissions', async (req, res) => {
  try {
    const { updatedByUserId, ...updates } = req.body;
    const result = await updateUserRoleAndPermissions(
      req.params.targetUserId, 
      updatedByUserId, 
      updates
    );
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get shop staff
app.get('/api/shops/:shopId/staff', async (req, res) => {
  try {
    const { requestingUserId } = req.query;
    if (!requestingUserId) {
      return res.status(400).json({ 
        success: false, 
        message: 'requestingUserId is required' 
      });
    }
    const staff = await getShopStaff(req.params.shopId, requestingUserId);
    res.status(200).json({ success: true, data: staff });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Remove staff from shop
app.delete('/api/shops/:shopId/staff/:targetUserId', async (req, res) => {
  try {
    const { removedByUserId } = req.body;
    if (!removedByUserId) {
      return res.status(400).json({ 
        success: false, 
        message: 'removedByUserId is required' 
      });
    }
    const result = await removeStaffFromShop(
      req.params.targetUserId,
      req.params.shopId,
      removedByUserId
    );
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get user permissions for specific shop
app.get('/api/users/:userId/shops/:shopId/permissions', async (req, res) => {
  try {
    const permissions = await getUserPermissions(req.params.userId, req.params.shopId);
    res.status(200).json({ success: true, data: permissions });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
});





// Add product to category
app.post('/api/categories/:categoryId/products/:productId', async (req, res) => {
  try {
    const result = await addProductToCategory(req.params.categoryId, req.params.productId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Remove product from category
app.delete('/api/categories/:categoryId/products/:productId', async (req, res) => {
  try {
    const result = await removeProductFromCategory(req.params.categoryId, req.params.productId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});






// ========================= CATEGORY MANAGEMENT ROUTES =========================
app.post('/api/categories', async (req, res) => {
  try {
    const category = await createCategory(req.body);
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.get('/api/categories/shop/:shopId', async (req, res) => {
  try {
    const categories = await getCategories(req.params.shopId);
    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.get('/api/categories/:categoryId', async (req, res) => {
  try {
    const category = await getCategoryById(req.params.categoryId);
    res.status(200).json({ success: true, data: category });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
});

app.put('/api/categories/:categoryId', async (req, res) => {
  try {
    const category = await updateCategory(req.params.categoryId, req.body);
    res.status(200).json({ success: true, data: category });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.delete('/api/categories/:categoryId', async (req, res) => {
  try {
    const category = await deleteCategory(req.params.categoryId);
    res.status(200).json({ success: true, data: category });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.get('/api/categories/:categoryId/products', async (req, res) => {
  try {
    const products = await getProductsByCategory(req.params.categoryId);
    res.status(200).json({ success: true, data: products });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
});

app.get('/api/categories/shop/:shopId/hierarchy', async (req, res) => {
  try {
    const hierarchy = await getCategoryHierarchy(req.params.shopId);
    res.status(200).json({ success: true, data: hierarchy });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ========================= PRODUCT MANAGEMENT ROUTES =========================
app.post('/api/products', async (req, res) => {
  try {
    const product = await createProduct(req.body);
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.get('/api/products/shop/:shopId', async (req, res) => {
  try {
    const products = await getProducts(req.params.shopId, req.query);
    res.status(200).json({ success: true, data: products });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.get('/api/products/qr/:qrCode', async (req, res) => {
  try {
    const product = await getProductByQR(req.params.qrCode, req.query.shopId);
    res.status(200).json({ success: true, data: product });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
});

app.put('/api/products/:productId', async (req, res) => {
  try {
    const product = await updateProduct(req.params.productId, req.body);
    res.status(200).json({ success: true, data: product });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.delete('/api/products/:productId', async (req, res) => {
  try {
    const product = await deleteProduct(req.params.productId);
    res.status(200).json({ success: true, data: product });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.get('/api/products/shop/:shopId/low-stock', async (req, res) => {
  try {
    const products = await getLowStockProducts(req.params.shopId);
    res.status(200).json({ success: true, data: products });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ========================= SALES MANAGEMENT ROUTES =========================
app.post('/api/sales', async (req, res) => {
  try {
    const sale = await createSale(req.body);
    res.status(201).json({ success: true, data: sale });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.get('/api/sales/shop/:shopId', async (req, res) => {
  try {
    const sales = await getSales(req.params.shopId, req.query);
    res.status(200).json({ success: true, data: sales });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.get('/api/sales/:saleId', async (req, res) => {
  try {
    const sale = await getSaleById(req.params.saleId);
    res.status(200).json({ success: true, data: sale });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
});

app.post('/api/sales/:saleId/refund', async (req, res) => {
  try {
    const sale = await processRefund(req.params.saleId, req.body);
    res.status(200).json({ success: true, data: sale });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ========================= CUSTOMER MANAGEMENT ROUTES =========================
app.post('/api/customers', async (req, res) => {
  try {
    const customer = await createCustomer(req.body);
    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.get('/api/customers/shop/:shopId', async (req, res) => {
  try {
    const customers = await getCustomers(req.params.shopId, req.query);
    res.status(200).json({ success: true, data: customers });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.get('/api/customers/phone/:phone', async (req, res) => {
  try {
    const customer = await getCustomerByPhone(req.params.phone, req.query.shopId);
    res.status(200).json({ success: true, data: customer });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
});

app.put('/api/customers/:customerId', async (req, res) => {
  try {
    const customer = await updateCustomer(req.params.customerId, req.body);
    res.status(200).json({ success: true, data: customer });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.post('/api/customers/:customerId/loyalty', async (req, res) => {
  try {
    const customer = await addLoyaltyPoints(
      req.params.customerId, 
      req.body.points, 
      req.body.totalSpent
    );
    res.status(200).json({ success: true, data: customer });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ========================= STOCK MANAGEMENT ROUTES =========================
app.post('/api/stock/movements', async (req, res) => {
  try {
    const movement = await createStockMovement(req.body);
    res.status(201).json({ success: true, data: movement });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.get('/api/stock/movements/:productId', async (req, res) => {
  try {
    const movements = await getStockMovements(req.params.productId, req.query.limit);
    res.status(200).json({ success: true, data: movements });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.post('/api/stock/adjust/:productId', async (req, res) => {
  try {
    const product = await adjustStock(req.params.productId, req.body);
    res.status(200).json({ success: true, data: product });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ========================= SUPPLIER MANAGEMENT ROUTES =========================
app.post('/api/suppliers', async (req, res) => {
  try {
    const supplier = await createSupplier(req.body);
    res.status(201).json({ success: true, data: supplier });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.get('/api/suppliers/shop/:shopId', async (req, res) => {
  try {
    const suppliers = await getSuppliers(req.params.shopId);
    res.status(200).json({ success: true, data: suppliers });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.put('/api/suppliers/:supplierId', async (req, res) => {
  try {
    const supplier = await updateSupplier(req.params.supplierId, req.body);
    res.status(200).json({ success: true, data: supplier });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ========================= ANALYTICS & REPORTING ROUTES =========================
app.get('/api/analytics/daily-report/:shopId', async (req, res) => {
  try {
    const report = await generateDailyReport(req.params.shopId, req.query.date);
    res.status(200).json({ success: true, data: report });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.get('/api/dashboard/:shopId', async (req, res) => {
  try {
    const summary = await getDashboardSummary(req.params.shopId);
    res.status(200).json({ success: true, data: summary });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ========================= NOTIFICATION ROUTES =========================
app.post('/api/notifications', async (req, res) => {
  try {
    const notification = await createNotification(req.body);
    res.status(201).json({ success: true, data: notification });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.get('/api/notifications/shop/:shopId', async (req, res) => {
  try {
    const notifications = await getNotifications(req.params.shopId, req.query);
    res.status(200).json({ success: true, data: notifications });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.put('/api/notifications/:notificationId/read', async (req, res) => {
  try {
    const notification = await markNotificationAsRead(req.params.notificationId);
    res.status(200).json({ success: true, data: notification });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ========================= DISCOUNT MANAGEMENT ROUTES =========================
app.post('/api/discounts', async (req, res) => {
  try {
    const discount = await createDiscount(req.body);
    res.status(201).json({ success: true, data: discount });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.get('/api/discounts/shop/:shopId/active', async (req, res) => {
  try {
    const discounts = await getActiveDiscounts(req.params.shopId);
    res.status(200).json({ success: true, data: discounts });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ========================= CROSS-SHOP TRANSACTIONS =========================
app.post('/api/cross-shop-transactions', async (req, res) => {
  try {
    const transaction = await recordCrossShopTransaction(req.body);
    res.status(201).json({ success: true, data: transaction });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});





// ========================= UTILITY ROUTES =========================
app.post('/api/tasks/daily', async (req, res) => {
  try {
    await runDailyTasks();
    res.status(200).json({ success: true, message: 'Daily tasks executed' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Health check endpoint
app.get('/', (req, res) => {
  res.send('Retail360 API is running');
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;