// main.js
import {
  connectDB,
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
  helpers
} from './database.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

// Initialize database connection
const initializeApp = async () => {
  try {
    await connectDB();
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
};

// ========================= AUTHENTICATION FUNCTIONS =========================

/**
 * Register a new user (Shop Owner, Manager, Staff)
 */
const registerUser = async (userData) => {
  try {
    const { name, email, phone, password, role = 'staff', shopId, permissions = {} } = userData;
    
    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { phone }] 
    });
    
    if (existingUser) {
      throw new Error('User with this email or phone already exists');
    }
    
    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Set default permissions based on role
    let defaultPermissions = {};
    if (role === 'owner') {
      defaultPermissions = {
        canViewReports: true,
        canManageInventory: true,
        canManageStaff: true,
        canViewProfits: true,
        canProcessRefunds: true,
        canManageCustomers: true
      };
    } else if (role === 'manager') {
      defaultPermissions = {
        canViewReports: true,
        canManageInventory: true,
        canManageStaff: false,
        canViewProfits: true,
        canProcessRefunds: true,
        canManageCustomers: true
      };
    }
    
    const newUser = new User({
      name,
      email,
      phone,
      password: hashedPassword,
      role,
      shopId,
      permissions: { ...defaultPermissions, ...permissions }
    });
    
    const savedUser = await newUser.save();
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: savedUser._id, shopId: savedUser.shopId, role: savedUser.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );
    
    return {
      user: {
        id: savedUser._id,
        name: savedUser.name,
        email: savedUser.email,
        phone: savedUser.phone,
        role: savedUser.role,
        permissions: savedUser.permissions
      },
      token
    };
  } catch (error) {
    throw new Error(`Registration failed: ${error.message}`);
  }
};

/**
 * Login user
 */
const loginUser = async (credentials) => {
  try {
    const { email, password } = credentials;
    
    // Find user by email
    const user = await User.findOne({ email }).populate('shopId');
    
    if (!user) {
      throw new Error('Invalid credentials');
    }
    
    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, shopId: user.shopId._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    return {
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        permissions: user.permissions,
        shop: user.shopId
      },
      token
    };
  } catch (error) {
    throw new Error(`Login failed: ${error.message}`);
  }
};

// ========================= SHOP MANAGEMENT FUNCTIONS =========================

/**
 * Create a new shop
 */
const createShop = async (shopData) => {
  try {
    const newShop = new Shop(shopData);
    const savedShop = await newShop.save();
    return savedShop;
  } catch (error) {
    throw new Error(`Shop creation failed: ${error.message}`);
  }
};

/**
 * Get shop details
 */
const getShop = async (shopId) => {
  try {
    const shop = await Shop.findById(shopId).populate('owner');
    if (!shop) {
      throw new Error('Shop not found');
    }
    return shop;
  } catch (error) {
    throw new Error(`Failed to fetch shop: ${error.message}`);
  }
};

/**
 * Update shop details
 */
const updateShop = async (shopId, updates) => {
  try {
    const updatedShop = await Shop.findByIdAndUpdate(
      shopId,
      updates,
      { new: true, runValidators: true }
    );
    
    if (!updatedShop) {
      throw new Error('Shop not found');
    }
    
    return updatedShop;
  } catch (error) {
    throw new Error(`Shop update failed: ${error.message}`);
  }
};

// ========================= CATEGORY MANAGEMENT FUNCTIONS =========================

/**
 * Create a new category
 */
const createCategory = async (categoryData) => {
  try {
    const newCategory = new Category(categoryData);
    const savedCategory = await newCategory.save();
    return savedCategory;
  } catch (error) {
    throw new Error(`Category creation failed: ${error.message}`);
  }
};

/**
 * Get all categories for a shop
 */
const getCategories = async (shopId) => {
  try {
    const categories = await Category.find({ shopId, isActive: true })
      .populate('parentCategory')
      .sort({ name: 1 });
    return categories;
  } catch (error) {
    throw new Error(`Failed to fetch categories: ${error.message}`);
  }
};

/**
 * Update category
 */
const updateCategory = async (categoryId, updates) => {
  try {
    const updatedCategory = await Category.findByIdAndUpdate(
      categoryId,
      updates,
      { new: true, runValidators: true }
    );
    
    if (!updatedCategory) {
      throw new Error('Category not found');
    }
    
    return updatedCategory;
  } catch (error) {
    throw new Error(`Category update failed: ${error.message}`);
  }
};

/**
 * Delete category
 */
const deleteCategory = async (categoryId) => {
  try {
    const deletedCategory = await Category.findByIdAndUpdate(
      categoryId,
      { isActive: false },
      { new: true }
    );
    
    if (!deletedCategory) {
      throw new Error('Category not found');
    }
    
    return deletedCategory;
  } catch (error) {
    throw new Error(`Category deletion failed: ${error.message}`);
  }
};

// ========================= PRODUCT MANAGEMENT FUNCTIONS =========================

/**
 * Create a new product with QR code
 */
const createProduct = async (productData) => {
  try {
    // Generate unique QR code
    const qrCode = `PROD_${uuidv4()}`;
    
    // Generate SKU if not provided
    const sku = productData.sku || `SKU_${Date.now()}`;
    
    const newProduct = new Product({
      ...productData,
      qrCode,
      sku
    });
    
    const savedProduct = await newProduct.save();
    
    // Generate QR code image
    const qrCodeImage = await QRCode.toDataURL(qrCode);
    
    // Create initial stock movement
    if (productData.stock && productData.stock.currentQuantity > 0) {
      await createStockMovement({
        product: savedProduct._id,
        shopId: savedProduct.shopId,
        type: 'in',
        quantity: productData.stock.currentQuantity,
        previousQuantity: 0,
        newQuantity: productData.stock.currentQuantity,
        reason: 'purchase',
        user: productData.createdBy || null,
        notes: 'Initial stock entry'
      });
    }
    
    return { ...savedProduct.toObject(), qrCodeImage };
  } catch (error) {
    throw new Error(`Product creation failed: ${error.message}`);
  }
};

/**
 * Get all products for a shop
 */
const getProducts = async (shopId, filters = {}) => {
  try {
    const query = { shopId, isActive: true };
    
    // Apply filters
    if (filters.category) {
      query.category = filters.category;
    }
    
    if (filters.lowStock) {
      query.$expr = { $lte: ['$stock.currentQuantity', '$stock.minQuantity'] };
    }
    
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { barcode: { $regex: filters.search, $options: 'i' } },
        { sku: { $regex: filters.search, $options: 'i' } }
      ];
    }
    
    const products = await Product.find(query)
      .populate('category')
      .populate('supplier')
      .sort({ name: 1 });
      
    return products;
  } catch (error) {
    throw new Error(`Failed to fetch products: ${error.message}`);
  }
};

/**
 * Get product by QR code
 */
const getProductByQR = async (qrCode) => {
  try {
    const product = await Product.findOne({ qrCode, isActive: true })
      .populate('category')
      .populate('supplier');
      
    if (!product) {
      throw new Error('Product not found');
    }
    
    return product;
  } catch (error) {
    throw new Error(`Failed to fetch product: ${error.message}`);
  }
};

/**
 * Update product
 */
const updateProduct = async (productId, updates) => {
  try {
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      updates,
      { new: true, runValidators: true }
    ).populate('category').populate('supplier');
    
    if (!updatedProduct) {
      throw new Error('Product not found');
    }
    
    return updatedProduct;
  } catch (error) {
    throw new Error(`Product update failed: ${error.message}`);
  }
};

/**
 * Delete product
 */
const deleteProduct = async (productId) => {
  try {
    const deletedProduct = await Product.findByIdAndUpdate(
      productId,
      { isActive: false },
      { new: true }
    );
    
    if (!deletedProduct) {
      throw new Error('Product not found');
    }
    
    return deletedProduct;
  } catch (error) {
    throw new Error(`Product deletion failed: ${error.message}`);
  }
};

/**
 * Get low stock products
 */
const getLowStockProducts = async (shopId) => {
  try {
    const products = await Product.find({
      shopId,
      isActive: true,
      trackStock: true,
      $expr: { $lte: ['$stock.currentQuantity', '$stock.minQuantity'] }
    }).populate('category');
    
    return products;
  } catch (error) {
    throw new Error(`Failed to fetch low stock products: ${error.message}`);
  }
};

// ========================= CUSTOMER MANAGEMENT FUNCTIONS =========================

/**
 * Create a new customer
 */
const createCustomer = async (customerData) => {
  try {
    const newCustomer = new Customer(customerData);
    const savedCustomer = await newCustomer.save();
    return savedCustomer;
  } catch (error) {
    throw new Error(`Customer creation failed: ${error.message}`);
  }
};

/**
 * Get all customers for a shop
 */
const getCustomers = async (shopId, filters = {}) => {
  try {
    const query = { shopId, isActive: true };
    
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { phone: { $regex: filters.search, $options: 'i' } },
        { email: { $regex: filters.search, $options: 'i' } }
      ];
    }
    
    const customers = await Customer.find(query).sort({ name: 1 });
    return customers;
  } catch (error) {
    throw new Error(`Failed to fetch customers: ${error.message}`);
  }
};

/**
 * Get customer by phone
 */
const getCustomerByPhone = async (phone, shopId) => {
  try {
    const customer = await Customer.findOne({ phone, shopId, isActive: true });
    return customer;
  } catch (error) {
    throw new Error(`Failed to fetch customer: ${error.message}`);
  }
};

/**
 * Update customer
 */
const updateCustomer = async (customerId, updates) => {
  try {
    const updatedCustomer = await Customer.findByIdAndUpdate(
      customerId,
      updates,
      { new: true, runValidators: true }
    );
    
    if (!updatedCustomer) {
      throw new Error('Customer not found');
    }
    
    return updatedCustomer;
  } catch (error) {
    throw new Error(`Customer update failed: ${error.message}`);
  }
};

/**
 * Add loyalty points to customer
 */
const addLoyaltyPoints = async (customerId, points, totalSpent) => {
  try {
    const customer = await Customer.findById(customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }
    
    customer.loyalty.points += points;
    customer.loyalty.totalSpent += totalSpent;
    customer.loyalty.lastVisit = new Date();
    
    // Update membership tier based on total spent
    if (customer.loyalty.totalSpent >= 10000) {
      customer.loyalty.membershipTier = 'platinum';
    } else if (customer.loyalty.totalSpent >= 5000) {
      customer.loyalty.membershipTier = 'gold';
    } else if (customer.loyalty.totalSpent >= 2000) {
      customer.loyalty.membershipTier = 'silver';
    }
    
    await customer.save();
    return customer;
  } catch (error) {
    throw new Error(`Failed to add loyalty points: ${error.message}`);
  }
};

// ========================= SALES MANAGEMENT FUNCTIONS =========================

/**
 * Create a new sale
 */
const createSale = async (saleData) => {
  try {
    // Generate unique sale number
    const saleNumber = `SALE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newSale = new Sale({
      ...saleData,
      saleNumber
    });
    
    const savedSale = await newSale.save();
    
    // Update product stock for each item
    for (const item of saleData.items) {
      const product = await Product.findById(item.product);
      if (product && product.trackStock) {
        const newQuantity = product.stock.currentQuantity - item.quantity;
        
        // Update product stock
        await Product.findByIdAndUpdate(
          item.product,
          { 'stock.currentQuantity': newQuantity }
        );
        
        // Create stock movement record
        await createStockMovement({
          product: item.product,
          shopId: saleData.shopId,
          type: 'out',
          quantity: item.quantity,
          previousQuantity: product.stock.currentQuantity,
          newQuantity: newQuantity,
          reason: 'sale',
          reference: savedSale._id.toString(),
          user: saleData.cashier
        });
      }
    }
    
    // Update customer loyalty points if customer exists
    if (saleData.customer) {
      const loyaltyPoints = Math.floor(saleData.totals.total / 10); // 1 point per 10 GHS
      await addLoyaltyPoints(saleData.customer, loyaltyPoints, saleData.totals.total);
    }
    
    return await Sale.findById(savedSale._id)
      .populate('customer')
      .populate('items.product')
      .populate('cashier');
  } catch (error) {
    throw new Error(`Sale creation failed: ${error.message}`);
  }
};

/**
 * Get all sales for a shop
 */
const getSales = async (shopId, filters = {}) => {
  try {
    const query = { shopId };
    
    // Date range filter
    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) {
        query.createdAt.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.createdAt.$lte = new Date(filters.endDate);
      }
    }
    
    // Payment method filter
    if (filters.paymentMethod) {
      query['payment.method'] = filters.paymentMethod;
    }
    
    // Customer filter
    if (filters.customer) {
      query.customer = filters.customer;
    }
    
    const sales = await Sale.find(query)
      .populate('customer')
      .populate('items.product')
      .populate('cashier')
      .sort({ createdAt: -1 });
      
    return sales;
  } catch (error) {
    throw new Error(`Failed to fetch sales: ${error.message}`);
  }
};

/**
 * Get sale by ID
 */
const getSaleById = async (saleId) => {
  try {
    const sale = await Sale.findById(saleId)
      .populate('customer')
      .populate('items.product')
      .populate('cashier');
      
    if (!sale) {
      throw new Error('Sale not found');
    }
    
    return sale;
  } catch (error) {
    throw new Error(`Failed to fetch sale: ${error.message}`);
  }
};

/**
 * Process refund
 */
const processRefund = async (saleId, refundData) => {
  try {
    const sale = await Sale.findById(saleId);
    if (!sale) {
      throw new Error('Sale not found');
    }
    
    // Update sale status
    sale.payment.status = 'refunded';
    sale.notes = refundData.reason;
    await sale.save();
    
    // Restore stock for refunded items
    for (const item of sale.items) {
      const product = await Product.findById(item.product);
      if (product && product.trackStock) {
        const newQuantity = product.stock.currentQuantity + item.quantity;
        
        // Update product stock
        await Product.findByIdAndUpdate(
          item.product,
          { 'stock.currentQuantity': newQuantity }
        );
        
        // Create stock movement record
        await createStockMovement({
          product: item.product,
          shopId: sale.shopId,
          type: 'in',
          quantity: item.quantity,
          previousQuantity: product.stock.currentQuantity,
          newQuantity: newQuantity,
          reason: 'return',
          reference: sale._id.toString(),
          user: refundData.processedBy,
          notes: `Refund: ${refundData.reason}`
        });
      }
    }
    
    return sale;
  } catch (error) {
    throw new Error(`Refund processing failed: ${error.message}`);
  }
};

// ========================= STOCK MANAGEMENT FUNCTIONS =========================

/**
 * Create stock movement
 */
const createStockMovement = async (movementData) => {
  try {
    const newMovement = new StockMovement(movementData);
    const savedMovement = await newMovement.save();
    return savedMovement;
  } catch (error) {
    throw new Error(`Stock movement creation failed: ${error.message}`);
  }
};

/**
 * Get stock movements for a product
 */
const getStockMovements = async (productId, limit = 50) => {
  try {
    const movements = await StockMovement.find({ product: productId })
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .limit(limit);
      
    return movements;
  } catch (error) {
    throw new Error(`Failed to fetch stock movements: ${error.message}`);
  }
};

/**
 * Adjust stock quantity
 */
const adjustStock = async (productId, adjustment) => {
  try {
    const { quantity, reason, userId, notes } = adjustment;
    
    const product = await Product.findById(productId);
    if (!product) {
      throw new Error('Product not found');
    }
    
    const previousQuantity = product.stock.currentQuantity;
    const newQuantity = previousQuantity + quantity;
    
    if (newQuantity < 0) {
      throw new Error('Insufficient stock');
    }
    
    // Update product stock
    await Product.findByIdAndUpdate(
      productId,
      { 'stock.currentQuantity': newQuantity }
    );
    
    // Create stock movement record
    await createStockMovement({
      product: productId,
      shopId: product.shopId,
      type: quantity > 0 ? 'in' : 'out',
      quantity: Math.abs(quantity),
      previousQuantity,
      newQuantity,
      reason,
      user: userId,
      notes
    });
    
    return await Product.findById(productId);
  } catch (error) {
    throw new Error(`Stock adjustment failed: ${error.message}`);
  }
};

// ========================= SUPPLIER MANAGEMENT FUNCTIONS =========================

/**
 * Create a new supplier
 */
const createSupplier = async (supplierData) => {
  try {
    const newSupplier = new Supplier(supplierData);
    const savedSupplier = await newSupplier.save();
    return savedSupplier;
  } catch (error) {
    throw new Error(`Supplier creation failed: ${error.message}`);
  }
};

/**
 * Get all suppliers for a shop
 */
const getSuppliers = async (shopId) => {
  try {
    const suppliers = await Supplier.find({ shopId, isActive: true })
      .populate('products')
      .sort({ name: 1 });
    return suppliers;
  } catch (error) {
    throw new Error(`Failed to fetch suppliers: ${error.message}`);
  }
};

/**
 * Update supplier
 */
const updateSupplier = async (supplierId, updates) => {
  try {
    const updatedSupplier = await Supplier.findByIdAndUpdate(
      supplierId,
      updates,
      { new: true, runValidators: true }
    );
    
    if (!updatedSupplier) {
      throw new Error('Supplier not found');
    }
    
    return updatedSupplier;
  } catch (error) {
    throw new Error(`Supplier update failed: ${error.message}`);
  }
};

// ========================= ANALYTICS FUNCTIONS =========================

/**
 * Generate daily sales report
 */
const generateDailyReport = async (shopId, date = new Date()) => {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Get sales for the day
    const dailySales = await Sale.find({
      shopId,
      createdAt: { $gte: startOfDay, $lte: endOfDay },
      'payment.status': 'completed'
    }).populate('items.product');
    
    // Calculate totals
    const totalSales = dailySales.length;
    const totalRevenue = dailySales.reduce((sum, sale) => sum + sale.totals.total, 0);
    const totalProfit = dailySales.reduce((sum, sale) => {
      const profit = sale.items.reduce((itemSum, item) => {
        return itemSum + ((item.unitPrice - (item.product?.pricing?.costPrice || 0)) * item.quantity);
      }, 0);
      return sum + profit;
    }, 0);
    
    // Payment method breakdown
    const cashSales = dailySales.filter(sale => sale.payment.method === 'cash')
      .reduce((sum, sale) => sum + sale.totals.total, 0);
    const momoSales = dailySales.filter(sale => sale.payment.method === 'momo')
      .reduce((sum, sale) => sum + sale.totals.total, 0);
    const cardSales = dailySales.filter(sale => sale.payment.method === 'card')
      .reduce((sum, sale) => sum + sale.totals.total, 0);
    
    // Product statistics
    const allProducts = await Product.find({ shopId, isActive: true });
    const lowStockProducts = allProducts.filter(p => 
      p.stock.currentQuantity <= p.stock.minQuantity
    ).length;
    const outOfStockProducts = allProducts.filter(p => 
      p.stock.currentQuantity === 0
    ).length;
    
    // Customer statistics
    const totalCustomers = await Customer.countDocuments({ shopId, isActive: true });
    const newCustomers = await Customer.countDocuments({
      shopId,
      isActive: true,
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    });
    
    // Top products
    const productSales = {};
    dailySales.forEach(sale => {
      sale.items.forEach(item => {
        const productId = item.product._id.toString();
        if (!productSales[productId]) {
          productSales[productId] = {
            product: item.product._id,
            productName: item.productName,
            quantitySold: 0,
            revenue: 0
          };
        }
        productSales[productId].quantitySold += item.quantity;
        productSales[productId].revenue += item.totalPrice;
      });
    });
    
    const topProducts = Object.values(productSales)
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, 10);
    
    // Create or update daily report
    const reportData = {
      date: startOfDay,
      shopId,
      sales: {
        totalSales,
        totalTransactions: totalSales,
        totalRevenue,
        totalProfit,
        cashSales,
        momoSales,
        cardSales
      },
      products: {
        totalProducts: allProducts.length,
        lowStockProducts,
        outOfStockProducts
      },
      customers: {
        totalCustomers,
        newCustomers,
        loyaltyPointsIssued: dailySales.reduce((sum, sale) => sum + (sale.loyaltyPointsEarned || 0), 0)
      },
      topProducts
    };
    
    const existingReport = await DailyReport.findOne({ shopId, date: startOfDay });
    
    let report;
    if (existingReport) {
      report = await DailyReport.findByIdAndUpdate(
        existingReport._id,
        reportData,
        { new: true }
      );
    } else {
      report = new DailyReport(reportData);
      await report.save();
    }
    
    return report;
  } catch (error) {
    throw new Error(`Daily report generation failed: ${error.message}`);
  }
};

/**
 * Get sales analytics for a date range
 */
const getSalesAnalytics = async (shopId, startDate, endDate) => {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const sales = await Sale.find({
      shopId,
      createdAt: { $gte: start, $lte: end },
      'payment.status': 'completed'
    }).populate('items.product');
    
    const productPerformance = {};
    
    sales.forEach(sale => {
      sale.items.forEach(item => {
        const productId = item.product._id.toString();
        if (!productPerformance[productId]) {
          productPerformance[productId] = {
            product: item.product,
            totalQuantitySold: 0,
            totalRevenue: 0,
            totalProfit: 0,
            salesCount: 0
          };
        }
        
        const costPrice = item.product.pricing?.costPrice || 0;
        const profit = (item.unitPrice - costPrice) * item.quantity;
        
        productPerformance[productId].totalQuantitySold += item.quantity;
        productPerformance[productId].totalRevenue += item.totalPrice;
        productPerformance[productId].totalProfit += profit;
        productPerformance[productId].salesCount += 1;
      });
    });
    
    // Sort by revenue
    const topProducts = Object.values(productPerformance)
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
    
    return {
      totalProductsSold: Object.keys(productPerformance).length,
      topProducts,
      totalRevenue: topProducts.reduce((sum, p) => sum + p.totalRevenue, 0),
      totalProfit: topProducts.reduce((sum, p) => sum + p.totalProfit, 0)
    };
  } catch (error) {
    throw new Error(`Product analytics failed: ${error.message}`);
  }
};

/**
 * Get inventory analytics
 */
const getInventoryAnalytics = async (shopId) => {
  try {
    const products = await Product.find({ shopId, isActive: true })
      .populate('category');
    
    const totalProducts = products.length;
    const totalStockValue = products.reduce((sum, product) => {
      return sum + (product.stock.currentQuantity * product.pricing.costPrice);
    }, 0);
    
    const lowStockProducts = products.filter(p => 
      p.stock.currentQuantity <= p.stock.minQuantity
    );
    
    const outOfStockProducts = products.filter(p => 
      p.stock.currentQuantity === 0
    );
    
    // Category breakdown
    const categoryBreakdown = {};
    products.forEach(product => {
      const categoryName = product.category.name;
      if (!categoryBreakdown[categoryName]) {
        categoryBreakdown[categoryName] = {
          category: categoryName,
          productCount: 0,
          totalValue: 0
        };
      }
      categoryBreakdown[categoryName].productCount += 1;
      categoryBreakdown[categoryName].totalValue += 
        product.stock.currentQuantity * product.pricing.costPrice;
    });
    
    return {
      totalProducts,
      totalStockValue,
      lowStockCount: lowStockProducts.length,
      outOfStockCount: outOfStockProducts.length,
      lowStockProducts: lowStockProducts.map(p => ({
        id: p._id,
        name: p.name,
        currentQuantity: p.stock.currentQuantity,
        minQuantity: p.stock.minQuantity
      })),
      categoryBreakdown: Object.values(categoryBreakdown)
    };
  } catch (error) {
    throw new Error(`Inventory analytics failed: ${error.message}`);
  }
};

/**
 * Get customer analytics
 */
const getCustomerAnalytics = async (shopId, startDate, endDate) => {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const customers = await Customer.find({ shopId, isActive: true });
    const sales = await Sale.find({
      shopId,
      createdAt: { $gte: start, $lte: end },
      'payment.status': 'completed'
    }).populate('customer');
    
    const customerStats = {};
    
    sales.forEach(sale => {
      if (sale.customer) {
        const customerId = sale.customer._id.toString();
        if (!customerStats[customerId]) {
          customerStats[customerId] = {
            customer: sale.customer,
            totalPurchases: 0,
            totalSpent: 0,
            lastPurchase: null
          };
        }
        
        customerStats[customerId].totalPurchases += 1;
        customerStats[customerId].totalSpent += sale.totals.total;
        
        if (!customerStats[customerId].lastPurchase || 
            sale.createdAt > customerStats[customerId].lastPurchase) {
          customerStats[customerId].lastPurchase = sale.createdAt;
        }
      }
    });
    
    // Top customers by spending
    const topCustomers = Object.values(customerStats)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);
    
    // New customers in period
    const newCustomers = customers.filter(c => 
      c.createdAt >= start && c.createdAt <= end
    );
    
    return {
      totalCustomers: customers.length,
      newCustomers: newCustomers.length,
      returningCustomers: Object.keys(customerStats).length,
      topCustomers,
      averageSpendPerCustomer: Object.values(customerStats).length > 0 ?
        Object.values(customerStats).reduce((sum, c) => sum + c.totalSpent, 0) / 
        Object.values(customerStats).length : 0
    };
  } catch (error) {
    throw new Error(`Customer analytics failed: ${error.message}`);
  }
};

// ========================= NOTIFICATION FUNCTIONS =========================

/**
 * Create notification
 */
const createNotification = async (notificationData) => {
  try {
    const newNotification = new Notification(notificationData);
    const savedNotification = await newNotification.save();
    return savedNotification;
  } catch (error) {
    throw new Error(`Notification creation failed: ${error.message}`);
  }
};

/**
 * Get notifications for a shop
 */
const getNotifications = async (shopId, filters = {}) => {
  try {
    const query = { shopId };
    
    if (filters.unreadOnly) {
      query.isRead = false;
    }
    
    if (filters.type) {
      query.type = filters.type;
    }
    
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(filters.limit || 50);
      
    return notifications;
  } catch (error) {
    throw new Error(`Failed to fetch notifications: ${error.message}`);
  }
};

/**
 * Mark notification as read
 */
const markNotificationAsRead = async (notificationId) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      { isRead: true },
      { new: true }
    );
    
    if (!notification) {
      throw new Error('Notification not found');
    }
    
    return notification;
  } catch (error) {
    throw new Error(`Failed to mark notification as read: ${error.message}`);
  }
};

/**
 * Check for low stock and create notifications
 */
const checkLowStockAndNotify = async (shopId) => {
  try {
    const lowStockProducts = await getLowStockProducts(shopId);
    
    if (lowStockProducts.length > 0) {
      const notification = await createNotification({
        shopId,
        type: 'low-stock',
        title: 'Low Stock Alert',
        message: `${lowStockProducts.length} products are running low on stock`,
        priority: 'high',
        metadata: {
          productCount: lowStockProducts.length,
          products: lowStockProducts.map(p => ({
            id: p._id,
            name: p.name,
            currentQuantity: p.stock.currentQuantity,
            minQuantity: p.stock.minQuantity
          }))
        }
      });
      
      return notification;
    }
    
    return null;
  } catch (error) {
    throw new Error(`Low stock check failed: ${error.message}`);
  }
};

// ========================= DISCOUNT FUNCTIONS =========================

/**
 * Create discount/promo
 */
const createDiscount = async (discountData) => {
  try {
    const newDiscount = new Discount(discountData);
    const savedDiscount = await newDiscount.save();
    return savedDiscount;
  } catch (error) {
    throw new Error(`Discount creation failed: ${error.message}`);
  }
};

/**
 * Get active discounts for a shop
 */
const getActiveDiscounts = async (shopId) => {
  try {
    const now = new Date();
    const discounts = await Discount.find({
      shopId,
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now }
    }).populate('applicableProducts').populate('applicableCategories');
    
    return discounts;
  } catch (error) {
    throw new Error(`Failed to fetch active discounts: ${error.message}`);
  }
};

/**
 * Apply discount to sale
 */
const applyDiscount = async (discountCode, saleData) => {
  try {
    const discount = await Discount.findOne({
      code: discountCode.toUpperCase(),
      shopId: saleData.shopId,
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    });
    
    if (!discount) {
      throw new Error('Invalid or expired discount code');
    }
    
    if (discount.usageLimit && discount.usageCount >= discount.usageLimit) {
      throw new Error('Discount usage limit exceeded');
    }
    
    if (saleData.subtotal < discount.minimumPurchase) {
      throw new Error(`Minimum purchase amount is ${discount.minimumPurchase}`);
    }
    
    let discountAmount = 0;
    
    if (discount.type === 'percentage') {
      discountAmount = (saleData.subtotal * discount.value) / 100;
    } else if (discount.type === 'fixed-amount') {
      discountAmount = discount.value;
    }
    
    // Apply maximum discount limit
    if (discount.maximumDiscount && discountAmount > discount.maximumDiscount) {
      discountAmount = discount.maximumDiscount;
    }
    
    // Update usage count
    discount.usageCount += 1;
    await discount.save();
    
    return {
      discountAmount,
      discountCode: discount.code,
      discountName: discount.name
    };
  } catch (error) {
    throw new Error(`Discount application failed: ${error.message}`);
  }
};

// ========================= UTILITY FUNCTIONS =========================

/**
 * Generate QR code for product
 */
const generateProductQRCode = async (productId) => {
  try {
    const product = await Product.findById(productId);
    if (!product) {
      throw new Error('Product not found');
    }
    
    const qrCodeImage = await QRCode.toDataURL(product.qrCode);
    return qrCodeImage;
  } catch (error) {
    throw new Error(`QR code generation failed: ${error.message}`);
  }
};

/**
 * Get dashboard summary
 */
const getDashboardSummary = async (shopId) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    
    const [
      todaySales,
      totalProducts,
      totalCustomers,
      lowStockProducts,
      notifications
    ] = await Promise.all([
      Sale.find({
        shopId,
        createdAt: { $gte: startOfDay },
        'payment.status': 'completed'
      }),
      Product.countDocuments({ shopId, isActive: true }),
      Customer.countDocuments({ shopId, isActive: true }),
      getLowStockProducts(shopId),
      getNotifications(shopId, { unreadOnly: true, limit: 5 })
    ]);
    
    const todayRevenue = todaySales.reduce((sum, sale) => sum + sale.totals.total, 0);
    const todayTransactions = todaySales.length;
    
    return {
      todayStats: {
        revenue: todayRevenue,
        transactions: todayTransactions,
        averageOrderValue: todayTransactions > 0 ? todayRevenue / todayTransactions : 0
      },
      inventory: {
        totalProducts,
        lowStockCount: lowStockProducts.length,
        lowStockProducts: lowStockProducts.slice(0, 5)
      },
      customers: {
        totalCustomers
      },
      notifications: notifications.slice(0, 5)
    };
  } catch (error) {
    throw new Error(`Dashboard summary failed: ${error.message}`);
  }
};

/**
 * Backup shop data
 */
const backupShopData = async (shopId) => {
  try {
    const [
      shop,
      users,
      categories,
      products,
      customers,
      sales,
      suppliers,
      stockMovements
    ] = await Promise.all([
      Shop.findById(shopId),
      User.find({ shopId }),
      Category.find({ shopId }),
      Product.find({ shopId }),
      Customer.find({ shopId }),
      Sale.find({ shopId }),
      Supplier.find({ shopId }),
      StockMovement.find({ shopId })
    ]);
    
    const backupData = {
      timestamp: new Date(),
      shop,
      users,
      categories,
      products,
      customers,
      sales,
      suppliers,
      stockMovements
    };
    
    return backupData;
  } catch (error) {
    throw new Error(`Backup failed: ${error.message}`);
  }
};
/**
 * Schedule daily tasks (to be run with cron or similar)
 */
const runDailyTasks = async () => {
  try {
    console.log('Running daily tasks...');
    
    // Get all active shops
    const activeShops = await Shop.find({ isActive: true });
    
    for (const shop of activeShops) {
      try {
        // Generate daily report
        await generateDailyReport(shop._id);
        
        // Check low stock and notify
        await checkLowStockAndNotify(shop._id);
        
        // Auto-backup if enabled
        if (shop.settings.autoBackup) {
          await backupShopData(shop._id);
        }
        
        console.log(`Daily tasks completed for shop: ${shop.name}`);
      } catch (error) {
        console.error(`Daily tasks failed for shop ${shop.name}:`, error.message);
      }
    }
    
    console.log('All daily tasks completed');
  } catch (error) {
    console.error('Daily tasks failed:', error.message);
  }
};



// Function to generate and return a QR code for a product
 async function sendProductQRCode(shopId, productId, userCallback) {
  // Generate the QR code string
  const qrCode = helpers.generateQRCode(shopId, productId);

  // Optionally, update the product in the database with the new QR code
  await Product.findByIdAndUpdate(productId, { qrCode });

  // Send the QR code to the user (e.g., via callback, API response, etc.)
  // Here, userCallback is a function that handles sending the QR code to the user
  if (typeof userCallback === 'function') {
    userCallback(qrCode);
  }

  // Or simply return the QR code
  return qrCode;
}



export {
runDailyTasks,
  // Initialize
  initializeApp,
  //qrcode
  sendProductQRCode,
  // Authentication
  registerUser,
  loginUser,
  
  // Shop Management
  createShop,
  getShop,
  updateShop,
  
  // Category Management
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
  
  // Product Management
  createProduct,
  getProducts,
  getProductByQR,
  updateProduct,
  deleteProduct,
  getLowStockProducts,
  
  // Customer Management
  createCustomer,
  getCustomers,
  getCustomerByPhone,
  updateCustomer,
  addLoyaltyPoints,
  
  // Sales Management
  createSale,
  getSales,
  getSaleById,
  processRefund,
  
  // Stock Management
  createStockMovement,
  getStockMovements,
  adjustStock,
  
  // Supplier Management
  createSupplier,
  getSuppliers,
  updateSupplier,
  
  // Analytics
  generateDailyReport,
  getSalesAnalytics,
  getInventoryAnalytics,
  getCustomerAnalytics,
  
  // Notifications
  createNotification,
  getNotifications,
  markNotificationAsRead,
  checkLowStockAndNotify,
  
  // Discounts
  createDiscount,
  getActiveDiscounts,
  applyDiscount,
  
  // Utilities
  generateProductQRCode,
  getDashboardSummary,
  backupShopData
};

