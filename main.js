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
  helpers,
  CrossShopTransaction,
} from './database.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

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

const registerUser = async (userData) => {
  try {
    const { name, email, phone, password, role = 'owner' } = userData;
    
    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) throw new Error('User with this email or phone exists');
    
    // Create user
    const newUser = new User({
      name,
      email,
      phone,
      password,
      role,
      financials: { totalOwed: 0, shopDebts: [], masterShopBalance: 0 },
      shops: [],
      ownedShops: []
    });
    
    await newUser.save();
    
    // Generate token
    const token = jwt.sign(
      { userId: newUser._id, role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );
    
    return {
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role
      },
      token
    };
  } catch (error) {
    throw new Error(`Registration failed: ${error.message}`);
  }
};


// ========================= MASTER SHOP MANAGEMENT FUNCTIONS =========================

const createShop = async (shopData, userId, setAsMaster = false) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    // Create shop
    const shop = new Shop({
      ...shopData,
      owner: userId,
      shopLevel: setAsMaster ? 'master' : 'independent',
      users: [{
        userId: userId,
        role: 'owner',
        permissions: ['inventory', 'sales', 'reports', 'settings', 'users'],
        isActive: true
      }]
    });

    await shop.save();

    // Update user
    user.ownedShops.push({
      shopId: shop._id,
      isMaster: setAsMaster,
      isActive: true
    });

    user.shops.push({
      shopId: shop._id,
      role: 'owner',
      permissions: ['inventory', 'sales', 'reports', 'settings', 'users'],
      isActive: true
    });

    // Set as master if requested or first shop
    if (setAsMaster || (!user.masterShop && user.ownedShops.length === 1)) {
      user.masterShop = shop._id;
      shop.shopLevel = 'master';
      await shop.save();
    }

    // Set current shop if first shop
    if (!user.currentShop) user.currentShop = shop._id;

    await user.save();
    return shop;
  } catch (error) {
    throw new Error(`Create shop failed: ${error.message}`);
  }
};

const setMasterShop = async (userId, shopId) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    // Verify ownership
    const ownedShop = user.ownedShops.find(
      s => s.shopId.toString() === shopId.toString() && s.isActive
    );
    if (!ownedShop) throw new Error('User does not own this shop');

    const shop = await Shop.findById(shopId);
    if (!shop) throw new Error('Shop not found');

    // Update previous master
    if (user.masterShop) {
      const prevMaster = await Shop.findById(user.masterShop);
      if (prevMaster) {
        prevMaster.shopLevel = 'independent';
        await prevMaster.save();
      }
      
      const prevOwned = user.ownedShops.find(
        s => s.shopId.toString() === user.masterShop.toString()
      );
      if (prevOwned) prevOwned.isMaster = false;
    }

    // Set new master
    user.masterShop = shopId;
    ownedShop.isMaster = true;
    shop.shopLevel = 'master';
    shop.masterShop = null;

    await Promise.all([user.save(), shop.save()]);
    return shop;
  } catch (error) {
    throw new Error(`Set master shop failed: ${error.message}`);
  }
};

const connectShopToMaster = async (shopId, masterShopId, connectionType = 'branch', financialSettings = {}) => {
  try {
    const [shop, masterShop] = await Promise.all([
      Shop.findById(shopId),
      Shop.findById(masterShopId)
    ]);

    if (!shop || !masterShop) throw new Error('Shop not found');
    if (masterShop.shopLevel !== 'master') throw new Error('Target is not a master shop');

    // Connect shops
    shop.masterShop = masterShopId;
    shop.shopLevel = 'branch';

    masterShop.connectedShops.push({
      shopId: shop._id,
      connectionType,
      financialSettings: {
        shareRevenue: financialSettings.shareRevenue || false,
        consolidateReports: financialSettings.consolidateReports || true,
        sharedInventory: financialSettings.sharedInventory || false
      },
      isActive: true
    });

    await Promise.all([shop.save(), masterShop.save()]);
    return { shop, masterShop };
  } catch (error) {
    throw new Error(`Connect shop to master failed: ${error.message}`);
  }
};

const getMasterShopNetwork = async (userId) => {
  try {
    const user = await User.findById(userId)
      .populate({
        path: 'masterShop',
        populate: {
          path: 'connectedShops.shopId',
          select: 'name description address phone email financials createdAt'
        }
      });

    if (!user || !user.masterShop) {
      return { hasMasterShop: false };
    }

    return {
      masterShop: user.masterShop,
      connectedShops: user.masterShop.connectedShops
    };
  } catch (error) {
    throw new Error(`Get network failed: ${error.message}`);
  }
};

const getConsolidatedFinancialReport = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.masterShop) throw new Error('No master shop');

    const masterShop = await Shop.findById(user.masterShop);
    const networkShops = await Shop.find({
      _id: { $in: masterShop.connectedShops.map(c => c.shopId) }
    });

    // Calculate totals
    let totalRevenue = masterShop.financials?.totalRevenue || 0;
    let totalExpenses = masterShop.financials?.totalExpenses || 0;
    let totalDebt = masterShop.financials?.totalDebt || 0;

    for (const shop of networkShops) {
      totalRevenue += shop.financials?.totalRevenue || 0;
      totalExpenses += shop.financials?.totalExpenses || 0;
      totalDebt += shop.financials?.totalDebt || 0;
    }

    return {
      masterShop: masterShop._id,
      totalShops: networkShops.length + 1,
      totalRevenue,
      totalExpenses,
      totalDebt,
      netProfit: totalRevenue - totalExpenses
    };
  } catch (error) {
    throw new Error(`Financial report failed: ${error.message}`);
  }
};

// ========================= SHOP MANAGEMENT FUNCTIONS =========================

const getShop = async (shopId) => {
  try {
    const shop = await Shop.findById(shopId)
      .populate('owner', 'name email')
      .populate('users.userId', 'name email role')
      .populate('masterShop', 'name description')
      .populate('connectedShops.shopId', 'name description');
    
    if (!shop) throw new Error('Shop not found');
    return shop;
  } catch (error) {
    throw new Error(`Get shop failed: ${error.message}`);
  }
};

const updateShop = async (shopId, updates) => {
  try {
    const shop = await Shop.findByIdAndUpdate(
      shopId,
      updates,
      { new: true, runValidators: true }
    );
    if (!shop) throw new Error('Shop not found');
    return shop;
  } catch (error) {
    throw new Error(`Update shop failed: ${error.message}`);
  }
};

const deleteShop = async (shopId, userId) => {
  try {
    const shop = await Shop.findById(shopId);
    if (!shop) throw new Error('Shop not found');
    if (shop.owner.toString() !== userId) throw new Error('Not owner');

    // Soft delete
    shop.isActive = false;
    await shop.save();

    // Remove from users
    await User.updateMany(
      { 'shops.shopId': shopId },
      { $set: { 'shops.$.isActive': false } }
    );

    return { success: true };
  } catch (error) {
    throw new Error(`Delete shop failed: ${error.message}`);
  }
};

const getUserShops = async (userId) => {
  try {
    const user = await User.findById(userId)
      .populate({
        path: 'shops.shopId',
        match: { isActive: true },
        select: 'name description address phone email'
      })
      .populate('currentShop', 'name')
      .populate('masterShop', 'name');
    
    if (!user) throw new Error('User not found');
    
    // Filter active shops
    const activeShops = user.shops.filter(shop => shop.isActive && shop.shopId);
    
    return {
      userId: user._id,
      currentShop: user.currentShop,
      masterShop: user.masterShop,
      shops: activeShops
    };
  } catch (error) {
    throw new Error(`Get user shops failed: ${error.message}`);
  }
};



const getShopStats = async (shopId) => {
  try {
    const [sales, products, customers, stockMovements] = await Promise.all([
      Sale.countDocuments({ shopId }),
      Product.countDocuments({ shopId, isActive: true }),
      Customer.countDocuments({ shopId, isActive: true }),
      StockMovement.countDocuments({ shopId })
    ]);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dailySales = await Sale.countDocuments({
      shopId,
      createdAt: { $gte: today }
    });
    
    return {
      totalSales: sales,
      dailySales,
      totalProducts: products,
      totalCustomers: customers,
      stockMovements
    };
  } catch (error) {
    throw new Error(`Get shop stats failed: ${error.message}`);
  }
};
// ========================= PRODUCT MANAGEMENT FUNCTIONS =========================

const createProduct = async (productData) => {
  try {
    // Validate category exists and belongs to same shop
    if (productData.category) {
      const category = await Category.findOne({
        _id: productData.category,
        shopId: productData.shopId,
        isActive: true
      });
      
      if (!category) {
        throw new Error('Invalid category or category not found for this shop');
      }
    }

    // Generate QR code
    const qrCode = helpers.generateQRCode(
      productData.shopId, 
      Date.now().toString()
    );

    // Generate SKU if not provided
    const sku = productData.sku || helpers.generateSKU(
      productData.category ? productData.category.name : 'GEN',
      productData.name.substring(0, 3),
      productData.shopId
    );

    const newProduct = new Product({
      ...productData,
      qrCode,
      sku
    });

    const savedProduct = await newProduct.save();
    
    // Generate QR image
    const qrCodeImage = await QRCode.toDataURL(qrCode);
    
    // Create initial stock movement
    if (newProduct.stock.currentQuantity > 0) {
      await createStockMovement({
        product: savedProduct._id,
        shopId: savedProduct.shopId,
        type: 'in',
        quantity: newProduct.stock.currentQuantity,
        previousQuantity: 0,
        newQuantity: newProduct.stock.currentQuantity,
        reason: 'purchase',
        user: productData.addedBy || null,
        notes: 'Initial stock entry'
      });
    }
    
    return { ...savedProduct.toObject(), qrCodeImage };
  } catch (error) {
    throw new Error(`Create product failed: ${error.message}`);
  }
};

const getProducts = async (shopId, filters = {}) => {
  try {
    const query = { shopId, isActive: true };
    
    // Handle category filters
    if (filters.category) {
      if (filters.category === 'uncategorized') {
        query.category = { $exists: false };
      } else {
        // Validate category belongs to shop
        const category = await Category.findOne({
          _id: filters.category,
          shopId,
          isActive: true
        });
        
        if (!category) {
          throw new Error('Invalid category for this shop');
        }
        query.category = filters.category;
      }
    }
    
    if (filters.lowStock) {
      query.$expr = { $lte: ['$stock.currentQuantity', '$stock.minQuantity'] };
    }
    
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { barcode: filters.search },
        { sku: filters.search }
      ];
    }
    
    // Get products with category and supplier details
    const products = await Product.find(query)
      .populate({
        path: 'category',
        select: 'name description'
      })
      .populate({
        path: 'supplier',
        select: 'name'
      })
      .sort({ name: 1 });
    
    return products;
  } catch (error) {
    throw new Error(`Get products failed: ${error.message}`);
  }
};

const getProductByQR = async (qrCode, shopId = null) => {
  try {
    const query = { qrCode, isActive: true };
    if (shopId) query.shopId = shopId;
    
    const product = await Product.findOne(query)
      .populate({
        path: 'category',
        select: 'name'
      })
      .populate({
        path: 'supplier',
        select: 'name contactPerson phone'
      });
      
    if (!product) throw new Error('Product not found');
    return product;
  } catch (error) {
    throw new Error(`Get product by QR failed: ${error.message}`);
  }
};

const updateProduct = async (productId, updates) => {
  try {
    // Get existing product to validate shop
    const existingProduct = await Product.findById(productId);
    if (!existingProduct) throw new Error('Product not found');
    
    // Validate category if being updated
    if (updates.category) {
      const category = await Category.findOne({
        _id: updates.category,
        shopId: existingProduct.shopId,
        isActive: true
      });
      
      if (!category) {
        throw new Error('Invalid category for this shop');
      }
    }
    
    // Update product
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      updates,
      { new: true, runValidators: true }
    )
      .populate('category')
      .populate('supplier');
      
    if (!updatedProduct) throw new Error('Product not found');
    return updatedProduct;
  } catch (error) {
    throw new Error(`Update product failed: ${error.message}`);
  }
};

const deleteProduct = async (productId) => {
  try {
    const product = await Product.findByIdAndUpdate(
      productId,
      { isActive: false },
      { new: true }
    );
    
    if (!product) throw new Error('Product not found');
    
    // Remove this product from any categories
    await Category.updateMany(
      { products: productId },
      { $pull: { products: productId } }
    );
    
    return product;
  } catch (error) {
    throw new Error(`Delete product failed: ${error.message}`);
  }
};

const getLowStockProducts = async (shopId) => {
  try {
    return await Product.find({
      shopId,
      isActive: true,
      $expr: { $lte: ['$stock.currentQuantity', '$stock.minQuantity'] }
    })
    .populate({
      path: 'category',
      select: 'name'
    })
    .sort({ 'stock.currentQuantity': 1 });
  } catch (error) {
    throw new Error(`Get low stock products failed: ${error.message}`);
  }
};

// ========================= CATEGORY INTEGRATION FUNCTIONS =========================

/**
 * Add product to category
 */
const addProductToCategory = async (categoryId, productId) => {
  try {
    const [category, product] = await Promise.all([
      Category.findById(categoryId),
      Product.findById(productId)
    ]);
    
    if (!category || !product) throw new Error('Category or product not found');
    if (category.shopId.toString() !== product.shopId.toString()) {
      throw new Error('Category and product belong to different shops');
    }
    
    // Add product to category
    if (!category.products.includes(productId)) {
      category.products.push(productId);
      await category.save();
    }
    
    // Update product's category reference
    if (product.category.toString() !== categoryId) {
      product.category = categoryId;
      await product.save();
    }
    
    return category;
  } catch (error) {
    throw new Error(`Add product to category failed: ${error.message}`);
  }
};

/**
 * Remove product from category
 */

const removeProductFromCategory = async (categoryId, productId) => {
  try {
    const [category, product] = await Promise.all([
      Category.findById(categoryId),
      Product.findById(productId)
    ]);
    
    if (!category || !product) throw new Error('Category or product not found');
    
    // Remove product from category
    category.products = category.products.filter(
      id => id.toString() !== productId.toString()
    );
    await category.save();
    
    // Clear product's category reference if it matches
    if (product.category && product.category.toString() === categoryId) {
      product.category = null;
      await product.save();
    }
    
    return category;
  } catch (error) {
    throw new Error(`Remove product from category failed: ${error.message}`);
  }
};
// ========================= SALES MANAGEMENT FUNCTIONS =========================

const createSale = async (saleData) => {
  try {
    // Generate sale number
    const saleNumber = helpers.generateSaleNumber(saleData.shopId);
    
    // Calculate totals
    const subtotal = saleData.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    const total = subtotal - (saleData.totals?.discount || 0) + (saleData.totals?.tax || 0);
    
    const newSale = new Sale({
      ...saleData,
      saleNumber,
      totals: {
        subtotal,
        discount: saleData.totals?.discount || 0,
        tax: saleData.totals?.tax || 0,
        total
      }
    });
    
    const savedSale = await newSale.save();
    
    // Update stock and create movements
    for (const item of saleData.items) {
      const product = await Product.findById(item.product);
      if (product && product.trackStock) {
        const prevQuantity = product.stock.currentQuantity;
        const newQuantity = prevQuantity - item.quantity;
        
        product.stock.currentQuantity = newQuantity;
        await product.save();
        
        await createStockMovement({
          product: item.product,
          shopId: saleData.shopId,
          type: 'out',
          quantity: item.quantity,
          previousQuantity: prevQuantity,
          newQuantity,
          reason: 'sale',
          reference: savedSale._id,
          user: saleData.cashier
        });
      }
    }
    
    // Update customer loyalty
    if (saleData.customer) {
      const pointsEarned = Math.floor(total / 10); // 1 point per 10 currency units
      await addLoyaltyPoints(saleData.customer, pointsEarned, total);
    }
    
    return savedSale;
  } catch (error) {
    throw new Error(`Create sale failed: ${error.message}`);
  }
};

const getSales = async (shopId, filters = {}) => {
  try {
    const query = { shopId };
    
    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
    }
    
    if (filters.customer) query.customer = filters.customer;
    
    return await Sale.find(query)
      .populate('customer')
      .populate('cashier')
      .populate('items.product')
      .sort({ createdAt: -1 });
  } catch (error) {
    throw new Error(`Get sales failed: ${error.message}`);
  }
};

const getSaleById = async (saleId) => {
  try {
    const sale = await Sale.findById(saleId)
      .populate('customer')
      .populate('cashier')
      .populate('items.product');
    if (!sale) throw new Error('Sale not found');
    return sale;
  } catch (error) {
    throw new Error(`Get sale failed: ${error.message}`);
  }
};

const processRefund = async (saleId, refundData) => {
  try {
    const sale = await Sale.findById(saleId);
    if (!sale) throw new Error('Sale not found');
    
    // Update sale status
    sale.payment.status = 'refunded';
    sale.notes = refundData.reason;
    await sale.save();
    
    // Restore stock
    for (const item of sale.items) {
      const product = await Product.findById(item.product);
      if (product && product.trackStock) {
        const prevQuantity = product.stock.currentQuantity;
        const newQuantity = prevQuantity + item.quantity;
        
        product.stock.currentQuantity = newQuantity;
        await product.save();
        
        await createStockMovement({
          product: item.product,
          shopId: sale.shopId,
          type: 'in',
          quantity: item.quantity,
          previousQuantity: prevQuantity,
          newQuantity,
          reason: 'return',
          reference: sale._id,
          user: refundData.processedBy,
          notes: `Refund: ${refundData.reason}`
        });
      }
    }
    
    return sale;
  } catch (error) {
    throw new Error(`Refund failed: ${error.message}`);
  }
};

// ========================= CUSTOMER MANAGEMENT FUNCTIONS =========================

const createCustomer = async (customerData) => {
  try {
    const customer = new Customer(customerData);
    return await customer.save();
  } catch (error) {
    throw new Error(`Create customer failed: ${error.message}`);
  }
};

const getCustomers = async (shopId, filters = {}) => {
  try {
    const query = { shopId, isActive: true };
    
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { phone: { $regex: filters.search } },
        { email: { $regex: filters.search, $options: 'i' } }
      ];
    }
    
    return await Customer.find(query).sort({ name: 1 });
  } catch (error) {
    throw new Error(`Get customers failed: ${error.message}`);
  }
};

const getCustomerByPhone = async (phone, shopId) => {
  try {
    return await Customer.findOne({ phone, shopId, isActive: true });
  } catch (error) {
    throw new Error(`Get customer failed: ${error.message}`);
  }
};

const updateCustomer = async (customerId, updates) => {
  try {
    const customer = await Customer.findByIdAndUpdate(
      customerId,
      updates,
      { new: true }
    );
    if (!customer) throw new Error('Customer not found');
    return customer;
  } catch (error) {
    throw new Error(`Update customer failed: ${error.message}`);
  }
};

const addLoyaltyPoints = async (customerId, points, totalSpent) => {
  try {
    const customer = await Customer.findById(customerId);
    if (!customer) throw new Error('Customer not found');
    
    customer.loyalty.points += points;
    customer.loyalty.totalSpent += totalSpent;
    customer.loyalty.lastVisit = new Date();
    
    // Update tier
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
    throw new Error(`Add loyalty points failed: ${error.message}`);
  }
};

// ========================= STOCK MANAGEMENT FUNCTIONS =========================

const createStockMovement = async (movementData) => {
  try {
    const movement = new StockMovement(movementData);
    return await movement.save();
  } catch (error) {
    throw new Error(`Create stock movement failed: ${error.message}`);
  }
};

const getStockMovements = async (productId, limit = 50) => {
  try {
    return await StockMovement.find({ product: productId })
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .limit(limit);
  } catch (error) {
    throw new Error(`Get stock movements failed: ${error.message}`);
  }
};

const adjustStock = async (productId, adjustment) => {
  try {
    const { quantity, reason, userId, notes } = adjustment;
    
    const product = await Product.findById(productId);
    if (!product) throw new Error('Product not found');
    
    const prevQuantity = product.stock.currentQuantity;
    const newQuantity = prevQuantity + quantity;
    
    if (newQuantity < 0) throw new Error('Insufficient stock');
    
    product.stock.currentQuantity = newQuantity;
    await product.save();
    
    // Create movement
    await createStockMovement({
      product: productId,
      shopId: product.shopId,
      type: quantity > 0 ? 'in' : 'out',
      quantity: Math.abs(quantity),
      previousQuantity: prevQuantity,
      newQuantity,
      reason,
      user: userId,
      notes
    });
    
    return product;
  } catch (error) {
    throw new Error(`Adjust stock failed: ${error.message}`);
  }
};

// ========================= SUPPLIER MANAGEMENT FUNCTIONS =========================

const createSupplier = async (supplierData) => {
  try {
    const supplier = new Supplier(supplierData);
    return await supplier.save();
  } catch (error) {
    throw new Error(`Create supplier failed: ${error.message}`);
  }
};

const getSuppliers = async (shopId) => {
  try {
    return await Supplier.find({ shopId, isActive: true })
      .populate('products')
      .sort({ name: 1 });
  } catch (error) {
    throw new Error(`Get suppliers failed: ${error.message}`);
  }
};

const updateSupplier = async (supplierId, updates) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(
      supplierId,
      updates,
      { new: true }
    );
    if (!supplier) throw new Error('Supplier not found');
    return supplier;
  } catch (error) {
    throw new Error(`Update supplier failed: ${error.message}`);
  }
};

// ========================= ANALYTICS & REPORTING FUNCTIONS =========================

const generateDailyReport = async (shopId, date = new Date()) => {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const [sales, products, customers] = await Promise.all([
      Sale.find({
        shopId,
        createdAt: { $gte: startOfDay, $lte: endOfDay }
      }),
      Product.find({ shopId, isActive: true }),
      Customer.countDocuments({
        shopId,
        createdAt: { $gte: startOfDay, $lte: endOfDay }
      })
    ]);
    
    const totalSales = sales.length;
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.totals.total, 0);
    
    const lowStockProducts = products.filter(
      p => p.stock.currentQuantity <= p.stock.minQuantity
    ).length;
    
    const outOfStockProducts = products.filter(
      p => p.stock.currentQuantity === 0
    ).length;
    
    const report = new DailyReport({
      date: startOfDay,
      shopId,
      sales: {
        totalSales,
        totalRevenue,
        cashSales: sales.filter(s => s.payment.method === 'cash').length,
        momoSales: sales.filter(s => s.payment.method === 'momo').length,
        cardSales: sales.filter(s => s.payment.method === 'card').length
      },
      products: {
        totalProducts: products.length,
        lowStockProducts,
        outOfStockProducts
      },
      customers: {
        newCustomers: customers
      }
    });
    
    await report.save();
    return report;
  } catch (error) {
    throw new Error(`Generate daily report failed: ${error.message}`);
  }
};

const getDashboardSummary = async (shopId) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [sales, products, customers, dailyReport] = await Promise.all([
      Sale.find({ shopId }).sort({ createdAt: -1 }).limit(10),
      Product.find({ shopId, isActive: true }),
      Customer.find({ shopId, isActive: true }).sort({ createdAt: -1 }).limit(10),
      DailyReport.findOne({ shopId, date: today })
    ]);
    
    const todaySales = sales.filter(s => s.createdAt >= today);
    const todayRevenue = todaySales.reduce((sum, s) => sum + s.totals.total, 0);
    
    const lowStockProducts = products.filter(
      p => p.stock.currentQuantity <= p.stock.minQuantity
    );
    
    return {
      todayStats: {
        salesCount: todaySales.length,
        revenue: todayRevenue,
        averageOrder: todaySales.length ? todayRevenue / todaySales.length : 0
      },
      inventory: {
        totalProducts: products.length,
        lowStockCount: lowStockProducts.length,
        outOfStockCount: products.filter(p => p.stock.currentQuantity === 0).length
      },
      customers: {
        totalCustomers: customers.length,
        newToday: dailyReport?.customers?.newCustomers || 0
      },
      recentSales: sales,
      lowStockProducts: lowStockProducts.slice(0, 5)
    };
  } catch (error) {
    throw new Error(`Dashboard summary failed: ${error.message}`);
  }
};

// ========================= NOTIFICATION FUNCTIONS =========================

const createNotification = async (notificationData) => {
  try {
    const notification = new Notification(notificationData);
    return await notification.save();
  } catch (error) {
    throw new Error(`Create notification failed: ${error.message}`);
  }
};

const getNotifications = async (shopId, filters = {}) => {
  try {
    const query = { shopId };
    
    if (filters.unreadOnly) query.isRead = false;
    if (filters.type) query.type = filters.type;
    
    return await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(filters.limit || 50);
  } catch (error) {
    throw new Error(`Get notifications failed: ${error.message}`);
  }
};

const markNotificationAsRead = async (notificationId) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      { isRead: true },
      { new: true }
    );
    if (!notification) throw new Error('Notification not found');
    return notification;
  } catch (error) {
    throw new Error(`Mark notification read failed: ${error.message}`);
  }
};

// ========================= DISCOUNT/PROMO FUNCTIONS =========================

const createDiscount = async (discountData) => {
  try {
    const discount = new Discount({
      ...discountData,
      code: discountData.code.toUpperCase()
    });
    return await discount.save();
  } catch (error) {
    throw new Error(`Create discount failed: ${error.message}`);
  }
};

const getActiveDiscounts = async (shopId) => {
  try {
    const now = new Date();
    return await Discount.find({
      shopId,
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now }
    });
  } catch (error) {
    throw new Error(`Get active discounts failed: ${error.message}`);
  }
};

// ========================= CROSS-SHOP TRANSACTION FUNCTIONS =========================

const recordCrossShopTransaction = async (transactionData) => {
  try {
    const transaction = new CrossShopTransaction(transactionData);
    await transaction.save();
    
    // Update user debt if applicable
    if (transaction.transactionType === 'debt') {
      const user = await User.findById(transaction.user);
      if (user) {
        const existingDebt = user.financials.shopDebts.find(
          d => d.shopId.toString() === transaction.toShop.toString()
        );
        
        if (existingDebt) {
          existingDebt.amountOwed += transaction.amount;
        } else {
          user.financials.shopDebts.push({
            shopId: transaction.toShop,
            amountOwed: transaction.amount
          });
        }
        
        user.financials.totalOwed += transaction.amount;
        await user.save();
      }
    }
    
    return transaction;
  } catch (error) {
    throw new Error(`Record transaction failed: ${error.message}`);
  }
};

// ========================= UTILITY FUNCTIONS =========================

const runDailyTasks = async () => {
  try {
    console.log('Running daily tasks...');
    
    // Get all active shops
    const shops = await Shop.find({ isActive: true });
    
    for (const shop of shops) {
      try {
        // Generate daily report
        await generateDailyReport(shop._id);
        
        // Check low stock and notify
        const lowStockProducts = await getLowStockProducts(shop._id);
        if (lowStockProducts.length > 0) {
          await createNotification({
            shopId: shop._id,
            type: 'low-stock',
            title: 'Low Stock Alert',
            message: `${lowStockProducts.length} products are running low`,
            priority: 'high'
          });
        }
        
        console.log(`Tasks completed for shop: ${shop.name}`);
      } catch (error) {
        console.error(`Tasks failed for ${shop.name}: ${error.message}`);
      }
    }
    
    console.log('All daily tasks completed');
  } catch (error) {
    console.error('Daily tasks failed:', error.message);
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
const getCategories = async (shopId, includeInactive = false) => {
  try {
    const query = { shopId };
    if (!includeInactive) query.isActive = true;
    
    const categories = await Category.find(query)
      .populate('parentCategory', 'name')
      .sort({ name: 1 });
      
    return categories;
  } catch (error) {
    throw new Error(`Failed to fetch categories: ${error.message}`);
  }
};

/**
 * Get category by ID
 */
const getCategoryById = async (categoryId) => {
  try {
    const category = await Category.findById(categoryId)
      .populate('parentCategory', 'name')
      .populate('shopId', 'name');
      
    if (!category) throw new Error('Category not found');
    return category;
  } catch (error) {
    throw new Error(`Get category failed: ${error.message}`);
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
    
    if (!updatedCategory) throw new Error('Category not found');
    return updatedCategory;
  } catch (error) {
    throw new Error(`Category update failed: ${error.message}`);
  }
};

/**
 * Delete category (soft delete)
 */
const deleteCategory = async (categoryId) => {
  try {
    const category = await Category.findById(categoryId);
    if (!category) throw new Error('Category not found');
    
    // Check if category has products
    const productCount = await Product.countDocuments({ category: categoryId, isActive: true });
    if (productCount > 0) {
      throw new Error('Cannot delete category with active products');
    }
    
    // Soft delete
    category.isActive = false;
    await category.save();
    
    return category;
  } catch (error) {
    throw new Error(`Category deletion failed: ${error.message}`);
  }
};

/**
 * Get products in a category
 */
const getProductsByCategory = async (categoryId) => {
  try {
    const products = await Product.find({ 
      category: categoryId, 
      isActive: true 
    }).populate('category');
    
    return products;
  } catch (error) {
    throw new Error(`Get products by category failed: ${error.message}`);
  }
};

/**
 * Get category hierarchy for a shop
 */
const getCategoryHierarchy = async (shopId) => {
  try {
    const categories = await Category.find({ shopId, isActive: true });
    
    // Build hierarchy
    const categoryMap = {};
    const rootCategories = [];
    
    // Create map
    categories.forEach(category => {
      categoryMap[category._id] = { ...category.toObject(), children: [] };
    });
    
    // Build tree
    categories.forEach(category => {
      if (category.parentCategory) {
        const parent = categoryMap[category.parentCategory];
        if (parent) {
          parent.children.push(categoryMap[category._id]);
        }
      } else {
        rootCategories.push(categoryMap[category._id]);
      }
    });
    
    return rootCategories;
  } catch (error) {
    throw new Error(`Get category hierarchy failed: ${error.message}`);
  }
};

// 2. ADD THESE CONSTANTS AFTER YOUR EXISTING IMPORTS

// Define available permissions with CRUD operations
const AVAILABLE_PERMISSIONS = {
  inventory: {
    name: 'Inventory Management',
    description: 'Manage products, categories, and stock',
    actions: ['create', 'read', 'update', 'delete']
  },
  sales: {
    name: 'Sales Management',
    description: 'Process sales, view transactions, handle refunds',
    actions: ['create', 'read', 'update', 'delete']
  },
  customers: {
    name: 'Customer Management',
    description: 'Manage customer information and loyalty programs',
    actions: ['create', 'read', 'update', 'delete']
  },
  suppliers: {
    name: 'Supplier Management',
    description: 'Manage supplier information and relationships',
    actions: ['create', 'read', 'update', 'delete']
  },
  reports: {
    name: 'Reports & Analytics',
    description: 'View reports, analytics, and business insights',
    actions: ['read']
  },
  settings: {
    name: 'Shop Settings',
    description: 'Manage shop configuration and preferences',
    actions: ['read', 'update']
  },
  users: {
    name: 'User Management',
    description: 'Manage staff accounts and permissions',
    actions: ['create', 'read', 'update', 'delete']
  },
  discounts: {
    name: 'Discount Management',
    description: 'Create and manage promotional offers',
    actions: ['create', 'read', 'update', 'delete']
  },
  categories: {
    name: 'Category Management',
    description: 'Organize products into categories',
    actions: ['create', 'read', 'update', 'delete']
  },
  stock: {
    name: 'Stock Management',
    description: 'Adjust stock levels and track movements',
    actions: ['create', 'read', 'update']
  }
};

// Default permissions by role
const DEFAULT_ROLE_PERMISSIONS = {
  owner: {
    inventory: ['create', 'read', 'update', 'delete'],
    sales: ['create', 'read', 'update', 'delete'],
    customers: ['create', 'read', 'update', 'delete'],
    suppliers: ['create', 'read', 'update', 'delete'],
    reports: ['read'],
    settings: ['read', 'update'],
    users: ['create', 'read', 'update', 'delete'],
    discounts: ['create', 'read', 'update', 'delete'],
    categories: ['create', 'read', 'update', 'delete'],
    stock: ['create', 'read', 'update']
  },
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
// 4. REPLACE YOUR EXISTING setCurrentShop FUNCTION WITH THIS ENHANCED VERSION

const setCurrentShop = async (userId, shopId) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');
    
    // Verify access
    const shopAccess = user.shops.find(s => 
      s.shopId.toString() === shopId.toString() && s.isActive
    );
    if (!shopAccess) throw new Error('No access to shop');
    
    user.currentShop = shopId;
    await user.save();
    
    return {
      currentShop: shopId,
      role: shopAccess.role,
      permissions: formatPermissionsFromDB(shopAccess.permissions)
    };
  } catch (error) {
    throw new Error(`Set current shop failed: ${error.message}`);
  }
};

// 5. ADD THESE NEW FUNCTIONS AFTER YOUR EXISTING AUTHENTICATION FUNCTIONS

/**
 * Get all available permissions
 */
const getAvailablePermissions = () => {
  return AVAILABLE_PERMISSIONS;
};

/**
 * Register a new staff member by owner/manager
 */
const registerStaff = async (staffData, registeredByUserId) => {
  try {
    const { name, email, phone, password, shopId, role = 'staff', customPermissions = null } = staffData;
    
    // Validate the registering user has permission
    const registeringUser = await User.findById(registeredByUserId)
      .populate('shops.shopId');
    
    if (!registeringUser) throw new Error('Registering user not found');
    
    // Check if registering user has access to the shop and permission to create users
    const shopAccess = registeringUser.shops.find(
      s => s.shopId._id.toString() === shopId.toString() && s.isActive
    );
    
    if (!shopAccess) throw new Error('You do not have access to this shop');
    
    // Check if user has permission to create users
    if (shopAccess.role !== 'owner' && !hasPermission(shopAccess.permissions, 'users', 'create')) {
      throw new Error('You do not have permission to create staff accounts');
    }
    
    // Validate shop exists
    const shop = await Shop.findById(shopId);
    if (!shop) throw new Error('Shop not found');
    
    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) throw new Error('User with this email or phone already exists');
    
    // Validate role
    if (!['staff', 'manager'].includes(role)) {
      throw new Error('Invalid role. Only staff and manager roles can be created');
    }
    
    // Set permissions based on role or custom permissions
    let permissions = customPermissions || DEFAULT_ROLE_PERMISSIONS[role];
    
    // Create new staff user
    const newStaff = new User({
      name,
      email,
      phone,
      password,
      role,
      shops: [{
        shopId: shopId,
        role: role,
        permissions: formatPermissionsForDB(permissions),
        isActive: true,
        joinedAt: new Date(),
        addedBy: registeredByUserId
      }],
      currentShop: shopId,
      isVerified: true // Staff accounts are auto-verified
    });
    
    await newStaff.save();
    
    // Add staff to shop's users array
    await shop.addUserWithPermissions(
      newStaff._id,
      role,
      formatPermissionsForDB(permissions),
      registeredByUserId
    );
    
    // Log permission history
    await logPermissionHistory({
      userId: newStaff._id,
      shopId: shopId,
      actionType: 'user_added',
      newRole: role,
      newPermissions: formatPermissionsForDB(permissions),
      changedBy: registeredByUserId,
      reason: 'New staff member registered'
    });
    
    return {
      user: {
        id: newStaff._id,
        name: newStaff.name,
        email: newStaff.email,
        phone: newStaff.phone,
        role: newStaff.role,
        permissions: permissions,
        shopId: shopId,
        createdBy: registeredByUserId
      }
    };
  } catch (error) {
    throw new Error(`Staff registration failed: ${error.message}`);
  }
};

/**
 * Update user role and permissions
 */
const updateUserRoleAndPermissions = async (targetUserId, updatedByUserId, updates) => {
  try {
    const { shopId, role, permissions } = updates;
    
    // Validate updating user has permission
    const updatingUser = await User.findById(updatedByUserId);
    if (!updatingUser) throw new Error('Updating user not found');
    
    const shopAccess = updatingUser.shops.find(
      s => s.shopId.toString() === shopId.toString() && s.isActive
    );
    
    if (!shopAccess || (shopAccess.role !== 'owner' && !hasPermission(shopAccess.permissions, 'users', 'update'))) {
      throw new Error('You do not have permission to update user roles');
    }
    
    // Get target user
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) throw new Error('Target user not found');
    
    // Find user's shop association
    const userShopIndex = targetUser.shops.findIndex(
      s => s.shopId.toString() === shopId.toString()
    );
    
    if (userShopIndex === -1) throw new Error('User is not associated with this shop');
    
    // Store previous values for history
    const previousRole = targetUser.shops[userShopIndex].role;
    const previousPermissions = [...targetUser.shops[userShopIndex].permissions];
    
    // Update role and permissions
    if (role) {
      targetUser.shops[userShopIndex].role = role;
    }
    
    if (permissions) {
      targetUser.shops[userShopIndex].permissions = formatPermissionsForDB(permissions);
      targetUser.shops[userShopIndex].permissionsUpdatedAt = new Date();
      targetUser.shops[userShopIndex].permissionsUpdatedBy = updatedByUserId;
    }
    
    await targetUser.save();
    
    // Update shop's users array
    const shop = await Shop.findById(shopId);
    await shop.updateUserPermissions(
      targetUserId,
      role,
      permissions ? formatPermissionsForDB(permissions) : null,
      updatedByUserId
    );
    
    // Log permission history
    await logPermissionHistory({
      userId: targetUserId,
      shopId: shopId,
      actionType: role ? 'role_change' : 'permission_update',
      previousRole: previousRole,
      newRole: role || previousRole,
      previousPermissions: previousPermissions,
      newPermissions: permissions ? formatPermissionsForDB(permissions) : previousPermissions,
      changedBy: updatedByUserId,
      reason: `Role/permissions updated by ${updatingUser.name}`
    });
    
    return {
      userId: targetUserId,
      shopId: shopId,
      role: targetUser.shops[userShopIndex].role,
      permissions: formatPermissionsFromDB(targetUser.shops[userShopIndex].permissions)
    };
  } catch (error) {
    throw new Error(`Update user role failed: ${error.message}`);
  }
};

/**
 * Get shop staff with their roles and permissions
 */
const getShopStaff = async (shopId, requestingUserId) => {
  try {
    // Validate requesting user has permission
    const requestingUser = await User.findById(requestingUserId);
    if (!requestingUser) throw new Error('Requesting user not found');
    
    const shopAccess = requestingUser.shops.find(
      s => s.shopId.toString() === shopId.toString() && s.isActive
    );
    
    if (!shopAccess || !hasPermission(shopAccess.permissions, 'users', 'read')) {
      throw new Error('You do not have permission to view staff');
    }
    
    // Get shop with staff
    const shop = await Shop.findById(shopId)
      .populate({
        path: 'users.userId',
        select: 'name email phone role lastLogin createdAt isActive'
      })
      .populate({
        path: 'users.addedBy',
        select: 'name email'
      });
    
    if (!shop) throw new Error('Shop not found');
    
    // Format staff data with permissions
    const staff = shop.users
      .filter(u => u.isActive && u.userId)
      .map(u => ({
        id: u.userId._id,
        name: u.userId.name,
        email: u.userId.email,
        phone: u.userId.phone,
        role: u.role,
        permissions: formatPermissionsFromDB(u.permissions),
        joinedAt: u.addedAt,
        lastLogin: u.userId.lastLogin,
        isActive: u.isActive,
        addedBy: u.addedBy ? {
          id: u.addedBy._id,
          name: u.addedBy.name,
          email: u.addedBy.email
        } : null
      }));
    
    return staff;
  } catch (error) {
    throw new Error(`Get shop staff failed: ${error.message}`);
  }
};

/**
 * Remove staff from shop
 */
const removeStaffFromShop = async (targetUserId, shopId, removedByUserId) => {
  try {
    // Validate removing user has permission
    const removingUser = await User.findById(removedByUserId);
    if (!removingUser) throw new Error('Removing user not found');
    
    const shopAccess = removingUser.shops.find(
      s => s.shopId.toString() === shopId.toString() && s.isActive
    );
    
    if (!shopAccess || (shopAccess.role !== 'owner' && !hasPermission(shopAccess.permissions, 'users', 'delete'))) {
      throw new Error('You do not have permission to remove staff');
    }
    
    // Get target user
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) throw new Error('Target user not found');
    
    // Cannot remove shop owner
    if (targetUser.role === 'owner') {
      throw new Error('Cannot remove shop owner');
    }
    
    // Update user's shop access
    const userShopIndex = targetUser.shops.findIndex(
      s => s.shopId.toString() === shopId.toString()
    );
    
    if (userShopIndex !== -1) {
      targetUser.shops[userShopIndex].isActive = false;
      await targetUser.save();
    }
    
    // Update shop's users array
    const shop = await Shop.findById(shopId);
    await shop.removeUser(targetUserId);
    
    // Log permission history
    await logPermissionHistory({
      userId: targetUserId,
      shopId: shopId,
      actionType: 'user_removed',
      previousRole: targetUser.shops[userShopIndex]?.role,
      changedBy: removedByUserId,
      reason: `Staff removed by ${removingUser.name}`
    });
    
    return { success: true, message: 'Staff removed successfully' };
  } catch (error) {
    throw new Error(`Remove staff failed: ${error.message}`);
  }
};

/**
 * Get user permissions for a specific shop
 */
const getUserPermissions = async (userId, shopId) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');
    
    return user.getShopPermissions(shopId);
  } catch (error) {
    throw new Error(`Get user permissions failed: ${error.message}`);
  }
};

// 6. ADD THESE UTILITY FUNCTIONS

/**
 * Check if user has specific permission
 */
const hasPermission = (userPermissions, module, action) => {
  if (!userPermissions || !Array.isArray(userPermissions)) return false;
  
  const permission = userPermissions.find(p => p.startsWith(`${module}:`));
  if (!permission) return false;
  
  const actions = permission.split(':')[1].split(',');
  return actions.includes(action);
};

/**
 * Format permissions for database storage
 */
const formatPermissionsForDB = (permissions) => {
  const formatted = [];
  
  Object.keys(permissions).forEach(module => {
    if (permissions[module] && permissions[module].length > 0) {
      formatted.push(`${module}:${permissions[module].join(',')}`);
    }
  });
  
  return formatted;
};

/**
 * Format permissions from database for frontend
 */
const formatPermissionsFromDB = (permissions) => {
  const formatted = {};
  
  if (!permissions || !Array.isArray(permissions)) return formatted;
  
  permissions.forEach(permission => {
    const [module, actions] = permission.split(':');
    if (module && actions) {
      formatted[module] = actions.split(',');
    }
  });
  
  return formatted;
};

/**
 * Log permission history
 */
const logPermissionHistory = async (historyData) => {
  try {
    const history = new PermissionHistory(historyData);
    await history.save();
    return history;
  } catch (error) {
    console.error('Failed to log permission history:', error.message);
    // Don't throw error to avoid breaking main functionality
  }
};





const loginUser = async (credentials) => {
  try {
    const { email, password } = credentials;
    
    const user = await User.findOne({ email })
      .populate('shops.shopId')
      .populate('currentShop')
      .populate('masterShop');
    
    if (!user) throw new Error('User not found');
    
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) throw new Error('Invalid password');
    
    user.lastLogin = new Date();
    await user.save();
    
    // Format user shops with detailed permissions
    const userShops = user.shops
      .filter(s => s.isActive && s.shopId)
      .map(s => ({
        shopId: s.shopId._id,
        shopName: s.shopId.name,
        role: s.role,
        permissions: formatPermissionsFromDB(s.permissions),
        joinedAt: s.joinedAt
      }));
    
    // Get current shop permissions
    let currentShopPermissions = {};
    if (user.currentShop) {
      const currentShopAccess = user.shops.find(
        s => s.shopId._id.toString() === user.currentShop._id.toString()
      );
      if (currentShopAccess) {
        currentShopPermissions = formatPermissionsFromDB(currentShopAccess.permissions);
      }
    }
    
    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
        currentShop: user.currentShop,
        masterShop: user.masterShop,
        permissions: currentShopPermissions
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );
    
    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        shops: userShops,
        ownedShops: user.ownedShops,
        currentShop: user.currentShop,
        currentShopPermissions: currentShopPermissions,
        masterShop: user.masterShop,
        totalDebt: user.financials.totalOwed
      },
      token
    };
  } catch (error) {
    throw new Error(`Login failed: ${error.message}`);
  }
};


// ========================= EXPORTS =========================

export {
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
  AVAILABLE_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  getAvailablePermissions,
  registerStaff,
  updateUserRoleAndPermissions,
  getShopStaff,
  removeStaffFromShop,
  getUserPermissions,
  hasPermission,
  formatPermissionsForDB,
  formatPermissionsFromDB,
  logPermissionHistory,
  addProductToCategory,
removeProductFromCategory
};