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
// ========================= MASTER SHOP MANAGEMENT FUNCTIONS =========================

/**
 * Create a new shop and optionally set it as master shop
 */
const createShopWithMasterOption = async (shopData, userId, setAsMaster = false) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Create the shop
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

    // Update user's ownedShops array
    user.ownedShops.push({
      shopId: shop._id,
      isMaster: setAsMaster,
      isActive: true
    });

    // Update user's shops array for access
    user.shops.push({
      shopId: shop._id,
      role: 'owner',
      permissions: ['inventory', 'sales', 'reports', 'settings', 'users'],
      isActive: true
    });

    // Set as master shop if specified or if it's the first shop
    if (setAsMaster || (!user.masterShop && user.ownedShops.length === 1)) {
      user.masterShop = shop._id;
      shop.shopLevel = 'master';
      await shop.save();
    }

    // Set as current shop if it's the first shop
    if (user.shops.length === 1) {
      user.currentShop = shop._id;
    }

    await user.save();

    return await Shop.findById(shop._id).populate('owner');
  } catch (error) {
    throw new Error(`Create shop failed: ${error.message}`);
  }
};

/**
 * Set a shop as the master shop for a user
 */
const setMasterShop = async (userId, shopId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if user owns this shop
    const ownedShop = user.ownedShops.find(
      shop => shop.shopId.toString() === shopId.toString() && shop.isActive
    );

    if (!ownedShop) {
      throw new Error('User does not own this shop');
    }

    const shop = await Shop.findById(shopId);
    if (!shop) {
      throw new Error('Shop not found');
    }

    // Update the previous master shop if exists
    if (user.masterShop) {
      const previousMasterShop = await Shop.findById(user.masterShop);
      if (previousMasterShop) {
        previousMasterShop.shopLevel = 'independent';
        await previousMasterShop.save();
      }

      // Update previous master in ownedShops
      const prevMasterOwned = user.ownedShops.find(
        shop => shop.shopId.toString() === user.masterShop.toString()
      );
      if (prevMasterOwned) {
        prevMasterOwned.isMaster = false;
      }
    }

    // Set new master shop
    user.masterShop = shopId;
    ownedShop.isMaster = true;
    
    shop.shopLevel = 'master';
    shop.masterShop = null; // Master shop doesn't have a parent

    await Promise.all([user.save(), shop.save()]);

    return {
      message: 'Master shop set successfully',
      masterShop: shop,
      user: {
        id: user._id,
        name: user.name,
        masterShop: user.masterShop
      }
    };
  } catch (error) {
    throw new Error(`Set master shop failed: ${error.message}`);
  }
};

/**
 * Connect a shop to a master shop
 */
const connectShopToMaster = async (shopId, masterShopId, connectionType = 'branch', financialSettings = {}) => {
  try {
    const shop = await Shop.findById(shopId);
    const masterShop = await Shop.findById(masterShopId);

    if (!shop || !masterShop) {
      throw new Error('Shop or master shop not found');
    }

    if (masterShop.shopLevel !== 'master') {
      throw new Error('Target shop is not a master shop');
    }

    // Connect shop to master
    shop.masterShop = masterShopId;
    shop.shopLevel = 'branch';

    // Add to master shop's connected shops
    await masterShop.addConnectedShop(shopId, connectionType, financialSettings);
    await shop.save();

    return {
      message: 'Shop connected to master successfully',
      shop: shop,
      masterShop: masterShop
    };
  } catch (error) {
    throw new Error(`Connect shop to master failed: ${error.message}`);
  }
};

/**
 * Get master shop details and all connected shops
 */
const getMasterShopNetwork = async (userId) => {
  try {
    const user = await User.findById(userId).populate({
      path: 'masterShop',
      populate: {
        path: 'connectedShops.shopId',
        select: 'name description address phone email financials createdAt'
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.masterShop) {
      return {
        hasMasterShop: false,
        message: 'User has no master shop set'
      };
    }

    const masterShop = user.masterShop;
    const connectedShops = masterShop.getConnectedShops(true);

    // Calculate network statistics
    const networkRevenue = await masterShop.getTotalNetworkRevenue();
    
    return {
      hasMasterShop: true,
      masterShop: {
        id: masterShop._id,
        name: masterShop.name,
        description: masterShop.description,
        address: masterShop.address,
        phone: masterShop.phone,
        email: masterShop.email,
        financials: masterShop.financials,
        createdAt: masterShop.createdAt
      },
      connectedShops: connectedShops.map(conn => ({
        id: conn.shopId._id,
        name: conn.shopId.name,
        description: conn.shopId.description,
        address: conn.shopId.address,
        connectionType: conn.connectionType,
        connectedAt: conn.connectedAt,
        financialSettings: conn.financialSettings,
        revenue: conn.shopId.financials?.totalRevenue || 0
      })),
      networkStats: {
        totalShops: connectedShops.length + 1, // +1 for master shop
        totalNetworkRevenue: networkRevenue,
        masterShopRevenue: masterShop.financials?.totalRevenue || 0
      }
    };
  } catch (error) {
    throw new Error(`Get master shop network failed: ${error.message}`);
  }
};

/**
 * Get consolidated financial report across all shops in network
 */
const getConsolidatedFinancialReport = async (userId, dateRange = {}) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.masterShop) {
      throw new Error('User or master shop not found');
    }

    const network = await getMasterShopNetwork(userId);
    if (!network.hasMasterShop) {
      throw new Error('No master shop network found');
    }

    let totalRevenue = 0;
    let totalExpenses = 0;
    let totalDebt = 0;

    const shopReports = [];

    // Master shop financials
    const masterShop = await Shop.findById(user.masterShop);
    totalRevenue += masterShop.financials?.totalRevenue || 0;
    totalExpenses += masterShop.financials?.totalExpenses || 0;
    totalDebt += masterShop.financials?.totalDebt || 0;

    shopReports.push({
      shopId: masterShop._id,
      shopName: masterShop.name,
      shopType: 'master',
      revenue: masterShop.financials?.totalRevenue || 0,
      expenses: masterShop.financials?.totalExpenses || 0,
      debt: masterShop.financials?.totalDebt || 0,
      profit: (masterShop.financials?.totalRevenue || 0) - (masterShop.financials?.totalExpenses || 0)
    });

    // Connected shops financials
    for (const connection of masterShop.connectedShops) {
      if (connection.isActive) {
        const connectedShop = await Shop.findById(connection.shopId);
        if (connectedShop) {
          const shopRevenue = connectedShop.financials?.totalRevenue || 0;
          const shopExpenses = connectedShop.financials?.totalExpenses || 0;
          const shopDebt = connectedShop.financials?.totalDebt || 0;

          totalRevenue += shopRevenue;
          totalExpenses += shopExpenses;
          totalDebt += shopDebt;

          shopReports.push({
            shopId: connectedShop._id,
            shopName: connectedShop.name,
            shopType: connection.connectionType,
            revenue: shopRevenue,
            expenses: shopExpenses,
            debt: shopDebt,
            profit: shopRevenue - shopExpenses
          });
        }
      }
    }

    // User's personal debt across shops
    const userTotalDebt = user.getTotalDebtAcrossShops();

    return {
      userId: userId,
      masterShopId: user.masterShop,
      reportPeriod: dateRange,
      networkSummary: {
        totalShops: shopReports.length,
        totalRevenue: totalRevenue,
        totalExpenses: totalExpenses,
        totalProfit: totalRevenue - totalExpenses,
        totalNetworkDebt: totalDebt,
        userPersonalDebt: userTotalDebt
      },
      shopBreakdown: shopReports,
      generatedAt: new Date()
    };
  } catch (error) {
    throw new Error(`Get consolidated report failed: ${error.message}`);
  }
};

/**
 * Record a cross-shop transaction
 */
const recordCrossShopTransaction = async (transactionData) => {
  try {
    const { fromShop, toShop, userId, transactionType, amount, description, metadata = {} } = transactionData;

    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const transaction = new CrossShopTransaction({
      fromShop,
      toShop,
      user: userId,
      masterShop: user.masterShop,
      transactionType,
      amount,
      description,
      metadata,
      status: 'pending'
    });

    await transaction.save();

    // Update shop financials if it's a debt transaction
    if (transactionType === 'debt') {
      await user.updateShopDebt(toShop, user.getDebtForShop(toShop) + amount);
    }

    return transaction;
  } catch (error) {
    throw new Error(`Record cross-shop transaction failed: ${error.message}`);
  }
};

/**
 * Get user's debt summary across all shops
 */
const getUserDebtSummary = async (userId) => {
  try {
    const user = await User.findById(userId).populate('financials.shopDebts.shopId', 'name');
    if (!user) {
      throw new Error('User not found');
    }

    const debtDetails = user.financials.shopDebts.map(debt => ({
      shopId: debt.shopId._id,
      shopName: debt.shopId.name,
      amountOwed: debt.amountOwed,
      lastUpdated: debt.lastUpdated
    }));

    return {
      userId: userId,
      userName: user.name,
      totalDebt: user.financials.totalOwed,
      masterShopId: user.masterShop,
      masterShopBalance: user.financials.masterShopBalance,
      debtByShop: debtDetails,
      lastCalculated: new Date()
    };
  } catch (error) {
    throw new Error(`Get user debt summary failed: ${error.message}`);
  }
};

/**
 * Transfer funds between shops in the network
 */
const transferBetweenShops = async (fromShopId, toShopId, amount, userId, description = '') => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify user has access to both shops
    const hasFromAccess = user.hasShopAccess(fromShopId);
    const hasToAccess = user.hasShopAccess(toShopId);

    if (!hasFromAccess || !hasToAccess) {
      throw new Error('User does not have access to one or both shops');
    }

    const fromShop = await Shop.findById(fromShopId);
    const toShop = await Shop.findById(toShopId);

    if (!fromShop || !toShop) {
      throw new Error('One or both shops not found');
    }

    // Record the transaction
    const transaction = await recordCrossShopTransaction({
      fromShop: fromShopId,
      toShop: toShopId,
      userId: userId,
      transactionType: 'transfer',
      amount: amount,
      description: description || `Transfer from ${fromShop.name} to ${toShop.name}`,
      metadata: {
        transferType: 'internal',
        reference: `TRANS-${Date.now()}`
      }
    });

    // Update shop financials
    fromShop.financials.interShopTransactions.push({
      withShop: toShopId,
      amount: -amount, // Negative for outgoing
      type: 'transfer',
      description: description
    });

    toShop.financials.interShopTransactions.push({
      withShop: fromShopId,
      amount: amount, // Positive for incoming
      type: 'transfer',
      description: description
    });

    await Promise.all([fromShop.save(), toShop.save()]);

    // Mark transaction as completed
    transaction.status = 'completed';
    await transaction.save();

    return {
      transaction: transaction,
      message: `Successfully transferred ${amount} from ${fromShop.name} to ${toShop.name}`
    };
  } catch (error) {
    throw new Error(`Transfer between shops failed: ${error.message}`);
  }
};

/**
 * Get all cross-shop transactions for a user
 */
const getUserCrossShopTransactions = async (userId, filters = {}) => {
  try {
    let query = { user: userId };

    // Apply filters
    if (filters.transactionType) {
      query.transactionType = filters.transactionType;
    }
    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.fromDate && filters.toDate) {
      query.createdAt = {
        $gte: new Date(filters.fromDate),
        $lte: new Date(filters.toDate)
      };
    }

    const transactions = await CrossShopTransaction.find(query)
      .populate('fromShop', 'name')
      .populate('toShop', 'name')
      .populate('masterShop', 'name')
      .sort({ createdAt: -1 })
      .limit(filters.limit || 50);

    return {
      userId: userId,
      totalTransactions: transactions.length,
      transactions: transactions.map(trans => ({
        id: trans._id,
        fromShop: trans.fromShop,
        toShop: trans.toShop,
        masterShop: trans.masterShop,
        transactionType: trans.transactionType,
        amount: trans.amount,
        currency: trans.currency,
        description: trans.description,
        status: trans.status,
        metadata: trans.metadata,
        createdAt: trans.createdAt,
        updatedAt: trans.updatedAt
      }))
    };
  } catch (error) {
    throw new Error(`Get user cross-shop transactions failed: ${error.message}`);
  }
};

/**
 * Disconnect a shop from master shop network
 */
const disconnectShopFromMaster = async (shopId, userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const shop = await Shop.findById(shopId);
    if (!shop) {
      throw new Error('Shop not found');
    }

    // Check if user owns this shop
    const ownedShop = user.ownedShops.find(
      ownedShop => ownedShop.shopId.toString() === shopId.toString()
    );

    if (!ownedShop) {
      throw new Error('User does not own this shop');
    }

    if (!shop.masterShop) {
      throw new Error('Shop is not connected to any master shop');
    }

    const masterShop = await Shop.findById(shop.masterShop);
    if (masterShop) {
      // Remove from master shop's connected shops
      masterShop.connectedShops = masterShop.connectedShops.filter(
        conn => conn.shopId.toString() !== shopId.toString()
      );
      await masterShop.save();
    }

    // Update the shop
    shop.masterShop = null;
    shop.shopLevel = 'independent';
    await shop.save();

    return {
      message: 'Shop disconnected from master successfully',
      shop: shop,
      previousMaster: masterShop ? masterShop.name : 'Unknown'
    };
  } catch (error) {
    throw new Error(`Disconnect shop from master failed: ${error.message}`);
  }
};

/**
 * Get shop network hierarchy for a user
 */
const getShopNetworkHierarchy = async (userId) => {
  try {
    const user = await User.findById(userId)
      .populate('ownedShops.shopId', 'name description shopLevel masterShop connectedShops')
      .populate('masterShop', 'name description connectedShops');

    if (!user) {
      throw new Error('User not found');
    }

    const hierarchy = {
      userId: userId,
      userName: user.name,
      masterShop: null,
      independentShops: [],
      branchShops: [],
      totalShops: user.ownedShops.length
    };

    for (const ownedShop of user.ownedShops) {
      if (!ownedShop.shopId || !ownedShop.isActive) continue;

      const shop = ownedShop.shopId;
      const shopData = {
        id: shop._id,
        name: shop.name,
        description: shop.description,
        shopLevel: shop.shopLevel,
        isMaster: ownedShop.isMaster,
        connectedShopsCount: shop.connectedShops ? shop.connectedShops.length : 0
      };

      if (shop.shopLevel === 'master') {
        hierarchy.masterShop = {
          ...shopData,
          connectedShops: shop.connectedShops.map(conn => ({
            shopId: conn.shopId,
            connectionType: conn.connectionType,
            connectedAt: conn.connectedAt,
            isActive: conn.isActive
          }))
        };
      } else if (shop.shopLevel === 'branch') {
        hierarchy.branchShops.push({
          ...shopData,
          masterShopId: shop.masterShop
        });
      } else {
        hierarchy.independentShops.push(shopData);
      }
    }

    return hierarchy;
  } catch (error) {
    throw new Error(`Get shop network hierarchy failed: ${error.message}`);
  }
};

/**
 * Update shop debt for a user
 */
const updateUserShopDebt = async (userId, shopId, newAmount, description = '') => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const shop = await Shop.findById(shopId);
    if (!shop) {
      throw new Error('Shop not found');
    }

    const previousAmount = user.getDebtForShop(shopId);
    await user.updateShopDebt(shopId, newAmount);

    // Record the debt change as a transaction
    const transaction = await recordCrossShopTransaction({
      fromShop: null, // System generated
      toShop: shopId,
      userId: userId,
      transactionType: 'debt',
      amount: newAmount - previousAmount,
      description: description || `Debt adjustment for ${shop.name}`,
      metadata: {
        previousAmount: previousAmount,
        newAmount: newAmount,
        adjustmentType: newAmount > previousAmount ? 'increase' : 'decrease'
      }
    });

    return {
      message: 'Shop debt updated successfully',
      userId: userId,
      shopId: shopId,
      shopName: shop.name,
      previousAmount: previousAmount,
      newAmount: newAmount,
      difference: newAmount - previousAmount,
      transaction: transaction
    };
  } catch (error) {
    throw new Error(`Update user shop debt failed: ${error.message}`);
  }
};

/**
 * Get comprehensive shop network analytics
 */
const getShopNetworkAnalytics = async (userId, dateRange = {}) => {
  try {
    const network = await getMasterShopNetwork(userId);
    if (!network.hasMasterShop) {
      throw new Error('No master shop network found');
    }

    const financialReport = await getConsolidatedFinancialReport(userId, dateRange);
    const debtSummary = await getUserDebtSummary(userId);
    const transactions = await getUserCrossShopTransactions(userId, { limit: 100 });

    // Calculate additional analytics
    const analytics = {
      networkOverview: {
        totalShops: network.networkStats.totalShops,
        masterShopRevenue: network.networkStats.masterShopRevenue,
        totalNetworkRevenue: network.networkStats.totalNetworkRevenue,
        averageRevenuePerShop: network.networkStats.totalNetworkRevenue / network.networkStats.totalShops
      },
      financialHealth: {
        totalProfit: financialReport.networkSummary.totalProfit,
        profitMargin: financialReport.networkSummary.totalRevenue > 0 ? 
          (financialReport.networkSummary.totalProfit / financialReport.networkSummary.totalRevenue) * 100 : 0,
        debtToRevenueRatio: financialReport.networkSummary.totalRevenue > 0 ?
          (debtSummary.totalDebt / financialReport.networkSummary.totalRevenue) * 100 : 0
      },
      transactionAnalytics: {
        totalTransactions: transactions.totalTransactions,
        transactionTypes: transactions.transactions.reduce((acc, trans) => {
          acc[trans.transactionType] = (acc[trans.transactionType] || 0) + 1;
          return acc;
        }, {}),
        totalTransactionValue: transactions.transactions.reduce((sum, trans) => sum + trans.amount, 0)
      },
      shopPerformance: financialReport.shopBreakdown.map(shop => ({
        shopId: shop.shopId,
        shopName: shop.shopName,
        shopType: shop.shopType,
        profitMargin: shop.revenue > 0 ? (shop.profit / shop.revenue) * 100 : 0,
        debtRatio: shop.revenue > 0 ? (shop.debt / shop.revenue) * 100 : 0,
        performance: shop.profit > 0 ? 'profitable' : 'loss-making'
      }))
    };

    return {
      userId: userId,
      reportPeriod: dateRange,
      generatedAt: new Date(),
      networkOverview: analytics.networkOverview,
      financialHealth: analytics.financialHealth,
      transactionAnalytics: analytics.transactionAnalytics,
      shopPerformance: analytics.shopPerformance,
      rawData: {
        network: network,
        financialReport: financialReport,
        debtSummary: debtSummary,
        recentTransactions: transactions.transactions.slice(0, 10)
      }
    };
  } catch (error) {
    throw new Error(`Get shop network analytics failed: ${error.message}`);
  }
};

// ========================= UPDATED EXISTING FUNCTIONS FOR MASTER SHOP SYSTEM =========================

// Updated Login Function with Master Shop support
const loginUser = async (credentials) => {
  try {
    const { email, password } = credentials;
    
    // Find user by email and populate shops including master shop
    const user = await User.findOne({ email })
      .populate('shops.shopId')
      .populate('currentShop')
      .populate('masterShop');
    
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
    
    // Check if user has any shops
    const hasShops = user.shops && user.shops.length > 0;
    const hasMasterShop = user.masterShop !== null;
    
    // If user has shops but no current shop, set current shop
    if (hasShops && !user.currentShop) {
      // Prioritize master shop as current shop if available
      if (hasMasterShop) {
        user.currentShop = user.masterShop._id;
      } else {
        user.currentShop = user.shops[0].shopId._id;
      }
      await user.save();
    }
    
    // Generate JWT token with master shop info
    const tokenPayload = {
      userId: user._id,
      role: user.role,
      hasShops,
      hasMasterShop,
      currentShop: user.currentShop,
      masterShop: user.masterShop ? user.masterShop._id : null
    };
    
    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        shops: user.shops,
        ownedShops: user.ownedShops,
        currentShop: user.currentShop,
        masterShop: user.masterShop,
        hasShops,
        hasMasterShop,
        totalDebt: user.getTotalDebtAcrossShops()
      },
      token,
      requiresShopCreation: !hasShops,
      suggestMasterShopSetup: hasShops && !hasMasterShop && user.ownedShops && user.ownedShops.length > 1
    };
  } catch (error) {
    throw new Error(`Login failed: ${error.message}`);
  }
};

// Updated Create Shop Function with Master Shop Option
const createShop = async (shopData, userId, setAsMaster = false) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Create the shop
    const shop = new Shop({
      ...shopData,
      owner: userId,
      shopLevel: setAsMaster ? 'master' : (user.masterShop ? 'branch' : 'independent'),
      users: [{
        userId: userId,
        role: 'owner',
        permissions: ['inventory', 'sales', 'reports', 'settings', 'users'],
        isActive: true
      }]
    });

    // If this should be connected to master shop and user has a master shop
    if (!setAsMaster && user.masterShop) {
      shop.masterShop = user.masterShop;
      
      // Add to master shop's connected shops
      const masterShop = await Shop.findById(user.masterShop);
      if (masterShop) {
        masterShop.connectedShops.push({
          shopId: shop._id,
          connectionType: 'branch',
          connectedAt: new Date(),
          isActive: true,
          financialSettings: {
            shareRevenue: false,
            consolidateReports: true,
            sharedInventory: false
          }
        });
        await masterShop.save();
      }
    }

    await shop.save();
    
    // Update user's ownedShops array
    user.ownedShops.push({
      shopId: shop._id,
      isMaster: setAsMaster,
      isActive: true
    });

    // Update user's shops array for access
    user.shops.push({
      shopId: shop._id,
      role: 'owner',
      permissions: ['inventory', 'sales', 'reports', 'settings', 'users'],
      isActive: true
    });

    // Set as master shop if specified or if it's the first owned shop
    if (setAsMaster || (!user.masterShop && user.ownedShops.length === 1)) {
      user.masterShop = shop._id;
      shop.shopLevel = 'master';
      shop.masterShop = null; // Master shop doesn't have a parent
      await shop.save();
      
      // Update isMaster flag
      const ownedShop = user.ownedShops.find(s => s.shopId.toString() === shop._id.toString());
      if (ownedShop) {
        ownedShop.isMaster = true;
      }
    }

    // Set as current shop if it's the first shop or if it's master
    if (user.shops.length === 1 || setAsMaster) {
      user.currentShop = shop._id;
    }

    await user.save();

    return await Shop.findById(shop._id)
      .populate('owner')
      .populate('masterShop', 'name');
  } catch (error) {
    throw new Error(`Create shop failed: ${error.message}`);
  }
};

// Updated Get Shop Function with Master Shop Context
const getShop = async (shopId) => {
  try {
    const shop = await Shop.findById(shopId)
      .populate('owner', 'name email')
      .populate('users.userId', 'name email')
      .populate('masterShop', 'name description')
      .populate('connectedShops.shopId', 'name description');
    
    if (!shop) {
      throw new Error('Shop not found');
    }

    // Add master shop context
    const shopWithContext = {
      ...shop.toObject(),
      isMasterShop: shop.shopLevel === 'master',
      hasConnectedShops: shop.connectedShops && shop.connectedShops.length > 0,
      isConnectedToMaster: shop.masterShop !== null,
      networkInfo: {
        shopLevel: shop.shopLevel,
        connectedShopsCount: shop.connectedShops ? shop.connectedShops.filter(s => s.isActive).length : 0,
        masterShopName: shop.masterShop ? shop.masterShop.name : null
      }
    };

    return shopWithContext;
  } catch (error) {
    throw new Error(`Failed to fetch shop: ${error.message}`);
  }
};

// Updated Get User Shops Function with Master Shop Priority
const getUserShops = async (userId) => {
  try {
    const user = await User.findById(userId)
      .populate({
        path: 'shops.shopId',
        select: 'name description address phone email isActive createdAt shopLevel masterShop',
        match: { isActive: true },
        populate: {
          path: 'masterShop',
          select: 'name'
        }
      })
      .populate('masterShop', 'name description')
      .populate('currentShop', 'name description');
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Filter out null shops (inactive ones) and sort by master shop first
    const activeShops = user.shops
      .filter(shop => shop.shopId !== null)
      .sort((a, b) => {
        // Master shop first
        if (user.masterShop && a.shopId._id.toString() === user.masterShop._id.toString()) return -1;
        if (user.masterShop && b.shopId._id.toString() === user.masterShop._id.toString()) return 1;
        
        // Then by creation date
        return new Date(b.shopId.createdAt) - new Date(a.shopId.createdAt);
      })
      .map(shop => ({
        ...shop.toObject(),
        isMasterShop: user.masterShop && shop.shopId._id.toString() === user.masterShop._id.toString(),
        isCurrentShop: user.currentShop && shop.shopId._id.toString() === user.currentShop._id.toString(),
        networkLevel: shop.shopId.shopLevel,
        masterShopName: shop.shopId.masterShop ? shop.shopId.masterShop.name : null
      }));
    
    return {
      userId: user._id,
      userName: user.name,
      currentShop: user.currentShop,
      masterShop: user.masterShop,
      hasMasterShop: user.masterShop !== null,
      totalShops: activeShops.length,
      totalOwnedShops: user.ownedShops ? user.ownedShops.filter(s => s.isActive).length : 0,
      totalDebt: user.getTotalDebtAcrossShops(),
      shops: activeShops
    };
  } catch (error) {
    throw new Error(`Failed to fetch user shops: ${error.message}`);
  }
};

// Updated Set Current Shop Function with Master Shop Validation
const setCurrentShop = async (userId, shopId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Check if user has access to this shop
    const hasAccess = user.shops.some(
      shop => shop.shopId.toString() === shopId.toString() && shop.isActive
    );
    
    if (!hasAccess) {
      throw new Error('User does not have access to this shop');
    }
    
    user.currentShop = shopId;
    await user.save();
    
    const shop = await getShop(shopId);
    
    return {
      ...shop,
      switchedFromMaster: user.masterShop && user.masterShop.toString() !== shopId.toString(),
      isMasterShop: user.masterShop && user.masterShop.toString() === shopId.toString()
    };
  } catch (error) {
    throw new Error(`Failed to set current shop: ${error.message}`);
  }
};

// Updated Get Current Shop Function with Master Shop Context
const getCurrentShop = async (userId) => {
  try {
    const user = await User.findById(userId)
      .populate({
        path: 'currentShop',
        select: 'name description address phone email isActive createdAt shopLevel masterShop connectedShops',
        populate: {
          path: 'masterShop',
          select: 'name'
        }
      })
      .populate('masterShop', 'name');
    
    if (!user) {
      throw new Error('User not found');
    }
    
    if (!user.currentShop) {
      throw new Error('No current shop set');
    }
    
    const currentShop = user.currentShop;
    const isMasterShop = user.masterShop && currentShop._id.toString() === user.masterShop._id.toString();
    
    return {
      ...currentShop.toObject(),
      isMasterShop,
      isConnectedToMaster: currentShop.masterShop !== null,
      userDebtInThisShop: user.getDebtForShop(currentShop._id),
      networkContext: {
        userMasterShop: user.masterShop,
        shopLevel: currentShop.shopLevel,
        connectedShopsCount: currentShop.connectedShops ? currentShop.connectedShops.filter(s => s.isActive).length : 0
      }
    };
  } catch (error) {
    throw new Error(`Failed to fetch current shop: ${error.message}`);
  }
};

// Updated Delete Shop Function with Master Shop Considerations
const deleteShop = async (shopId, userId) => {
  try {
    const shop = await Shop.findById(shopId);
    if (!shop) {
      throw new Error('Shop not found');
    }
    
    // Check if user is the owner
    if (shop.owner.toString() !== userId.toString()) {
      throw new Error('Only shop owner can delete the shop');
    }
    
    const user = await User.findById(userId);
    const isMasterShop = user.masterShop && user.masterShop.toString() === shopId.toString();
    
    // If deleting master shop, need to handle master shop transition
    if (isMasterShop) {
      // Check if user has other owned shops
      const otherOwnedShops = user.ownedShops.filter(
        s => s.shopId.toString() !== shopId.toString() && s.isActive
      );
      
      if (otherOwnedShops.length > 0) {
        // Suggest new master shop (first owned shop)
        const newMasterShopId = otherOwnedShops[0].shopId;
        user.masterShop = newMasterShopId;
        
        // Update the new master shop
        const newMasterShop = await Shop.findById(newMasterShopId);
        if (newMasterShop) {
          newMasterShop.shopLevel = 'master';
          newMasterShop.masterShop = null;
          await newMasterShop.save();
        }
        
        // Update owned shops array
        const newMasterOwned = user.ownedShops.find(s => s.shopId.toString() === newMasterShopId.toString());
        if (newMasterOwned) {
          newMasterOwned.isMaster = true;
        }
      } else {
        // No other shops, remove master shop
        user.masterShop = null;
      }
    }
    
    // If this shop was connected to a master, remove it from master's connected shops
    if (shop.masterShop) {
      const masterShop = await Shop.findById(shop.masterShop);
      if (masterShop) {
        masterShop.connectedShops = masterShop.connectedShops.filter(
          conn => conn.shopId.toString() !== shopId.toString()
        );
        await masterShop.save();
      }
    }
    
    // If this is a master shop, disconnect all connected shops
    if (shop.shopLevel === 'master' && shop.connectedShops.length > 0) {
      for (const connection of shop.connectedShops) {
        const connectedShop = await Shop.findById(connection.shopId);
        if (connectedShop) {
          connectedShop.masterShop = null;
          connectedShop.shopLevel = 'independent';
          await connectedShop.save();
        }
      }
    }
    
    // Soft delete - mark as inactive
    shop.isActive = false;
    shop.deletedAt = new Date();
    await shop.save();
    
    // Remove shop from user's shops and ownedShops arrays
    user.shops = user.shops.filter(s => s.shopId.toString() !== shopId.toString());
    user.ownedShops = user.ownedShops.filter(s => s.shopId.toString() !== shopId.toString());
    
    // Update current shop if this was the current shop
    if (user.currentShop && user.currentShop.toString() === shopId.toString()) {
      if (user.masterShop) {
        user.currentShop = user.masterShop;
      } else if (user.shops.length > 0) {
        user.currentShop = user.shops[0].shopId;
      } else {
        user.currentShop = null;
      }
    }
    
    await user.save();
    
    // Remove shop from all other users' shops array
    await User.updateMany(
      { 'shops.shopId': shopId },
      { 
        $pull: { shops: { shopId: shopId } }
      }
    );
    
    return { 
      message: 'Shop deleted successfully',
      wasMasterShop: isMasterShop,
      newMasterShop: isMasterShop && user.masterShop ? user.masterShop : null,
      affectedConnectedShops: shop.shopLevel === 'master' ? shop.connectedShops.length : 0
    };
  } catch (error) {
    throw new Error(`Delete shop failed: ${error.message}`);
  }
};

// Updated Get All Shops Function with Master Shop Filtering
const getAllShops = async (page = 1, limit = 10, searchTerm = '', filterByLevel = '') => {
  try {
    const skip = (page - 1) * limit;
    
    let query = { isActive: true };
    
    // Add search functionality
    if (searchTerm) {
      query.$or = [
        { name: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } },
        { 'address.city': { $regex: searchTerm, $options: 'i' } }
      ];
    }
    
    // Filter by shop level (master, branch, independent)
    if (filterByLevel && ['master', 'branch', 'independent'].includes(filterByLevel)) {
      query.shopLevel = filterByLevel;
    }
    
    const shops = await Shop.find(query)
      .populate('owner', 'name email')
      .populate('masterShop', 'name')
      .select('name description address phone email createdAt shopLevel masterShop')
      .sort({ shopLevel: 1, createdAt: -1 }) // Master shops first
      .skip(skip)
      .limit(limit);
    
    const total = await Shop.countDocuments(query);
    
    // Add network context to each shop
    const shopsWithContext = shops.map(shop => ({
      ...shop.toObject(),
      isMasterShop: shop.shopLevel === 'master',
      isConnectedToMaster: shop.masterShop !== null,
      masterShopName: shop.masterShop ? shop.masterShop.name : null
    }));
    
    return {
      shops: shopsWithContext,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalShops: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      },
      filters: {
        searchTerm,
        filterByLevel,
        availableFilters: ['master', 'branch', 'independent']
      }
    };
  } catch (error) {
    throw new Error(`Failed to fetch shops: ${error.message}`);
  }
};




/**
 * Get shop by ID (alias for getShop)
 */
const getShopById = async (shopId) => {
  return await getShop(shopId);
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
    ).populate('owner', 'name email');
    
    if (!updatedShop) {
      throw new Error('Shop not found');
    }
    
    return updatedShop;
  } catch (error) {
    throw new Error(`Shop update failed: ${error.message}`);
  }
};



/**
 * Permanently delete shop (hard delete)
 */
const permanentDeleteShop = async (shopId, userId) => {
  try {
    const shop = await Shop.findById(shopId);
    if (!shop) {
      throw new Error('Shop not found');
    }
    
    // Check if user is the owner
    if (shop.owner.toString() !== userId.toString()) {
      throw new Error('Only shop owner can permanently delete the shop');
    }
    
    // Remove shop from all users' shops array
    await User.updateMany(
      { 'shops.shopId': shopId },
      { 
        $pull: { shops: { shopId: shopId } },
        $unset: { currentShop: shopId }
      }
    );
    
    // Update users who had this as current shop
    const usersWithThisCurrentShop = await User.find({ currentShop: shopId });
    for (const user of usersWithThisCurrentShop) {
      if (user.shops.length > 0) {
        user.currentShop = user.shops[0].shopId;
      } else {
        user.currentShop = null;
      }
      await user.save();
    }
    
    // Hard delete the shop
    await Shop.findByIdAndDelete(shopId);
    
    return { message: 'Shop permanently deleted successfully' };
  } catch (error) {
    throw new Error(`Permanent delete shop failed: ${error.message}`);
  }
};


const checkShopPermission = async (userId, shopId, permission) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    const shopAccess = user.shops.find(
      shop => shop.shopId.toString() === shopId.toString() && shop.isActive
    );
    
    if (!shopAccess) {
      return false;
    }
    
    return shopAccess.permissions.includes(permission);
  } catch (error) {
    throw new Error(`Permission check failed: ${error.message}`);
  }
};

/**
 * Get shop statistics
 */
const getShopStats = async (shopId) => {
  try {
    const shop = await Shop.findById(shopId);
    if (!shop) {
      throw new Error('Shop not found');
    }
    
    // You can expand this based on your other models (Products, Sales, etc.)
    const stats = {
      totalUsers: shop.users.filter(user => user.isActive).length,
      shopAge: Math.floor((new Date() - shop.createdAt) / (1000 * 60 * 60 * 24)), // days
      isActive: shop.isActive,
      createdAt: shop.createdAt,
      // Add more stats as needed
      // totalProducts: await Product.countDocuments({ shopId, isActive: true }),
      // totalSales: await Sale.countDocuments({ shopId }),
    };
    
    return stats;
  } catch (error) {
    throw new Error(`Failed to fetch shop stats: ${error.message}`);
  }
};


/**
 * Get all shops for a specific user (by userId)
 */
const getShopsForUser = async (userId) => {
  try {
    const user = await User.findById(userId).populate({
      path: 'shops.shopId',
      select: 'name description address phone email isActive createdAt owner',
      populate: {
        path: 'owner',
        select: 'name email'
      }
    });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Filter out inactive shops and format the response
    const activeShops = user.shops
      .filter(shop => shop.isActive && shop.shopId && shop.shopId.isActive)
      .map(shop => ({
        shopId: shop.shopId._id,
        shopDetails: {
          name: shop.shopId.name,
          description: shop.shopId.description,
          address: shop.shopId.address,
          phone: shop.shopId.phone,
          email: shop.shopId.email,
          owner: shop.shopId.owner,
          createdAt: shop.shopId.createdAt
        },
        userRole: shop.role,
        permissions: shop.permissions,
        joinedAt: shop.joinedAt,
        isCurrentShop: user.currentShop && user.currentShop.toString() === shop.shopId._id.toString()
      }));
    
    return {
      userId: user._id,
      userName: user.name,
      userEmail: user.email,
      currentShop: user.currentShop,
      totalShops: activeShops.length,
      shops: activeShops
    };
  } catch (error) {
    throw new Error(`Failed to fetch user shops: ${error.message}`);
  }
};

/**
 * Get all shops by userId (alias for getShopsForUser)
 */
const getAllShopsByUserId = async (userId) => {
  return await getShopsForUser(userId);
};

/**
 * Get user's shops with specific role
 */
const getUserShopsByRole = async (userId, role) => {
  try {
    const user = await User.findById(userId).populate({
      path: 'shops.shopId',
      select: 'name description address phone email isActive createdAt',
      match: { isActive: true }
    });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    const roleShops = user.shops
      .filter(shop => shop.role === role && shop.isActive && shop.shopId)
      .map(shop => ({
        shopId: shop.shopId._id,
        shopDetails: shop.shopId,
        userRole: shop.role,
        permissions: shop.permissions,
        joinedAt: shop.joinedAt
      }));
    
    return {
      userId: user._id,
      userName: user.name,
      role: role,
      totalShops: roleShops.length,
      shops: roleShops
    };
  } catch (error) {
    throw new Error(`Failed to fetch user shops by role: ${error.message}`);
  }
};

/**
 * Get shops where user is owner
 */
const getUserOwnedShops = async (userId) => {
  return await getUserShopsByRole(userId, 'owner');
};

/**
 * Get shops where user is manager
 */
const getUserManagedShops = async (userId) => {
  return await getUserShopsByRole(userId, 'manager');
};

/**
 * Get shops where user is staff
 */
const getUserStaffShops = async (userId) => {
  return await getUserShopsByRole(userId, 'staff');
};

/**
 * Get user's shops with specific permission
 */
const getUserShopsByPermission = async (userId, permission) => {
  try {
    const user = await User.findById(userId).populate({
      path: 'shops.shopId',
      select: 'name description address phone email isActive createdAt',
      match: { isActive: true }
    });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    const permissionShops = user.shops
      .filter(shop => 
        shop.isActive && 
        shop.shopId && 
        shop.permissions.includes(permission)
      )
      .map(shop => ({
        shopId: shop.shopId._id,
        shopDetails: shop.shopId,
        userRole: shop.role,
        permissions: shop.permissions,
        joinedAt: shop.joinedAt
      }));
    
    return {
      userId: user._id,
      userName: user.name,
      permission: permission,
      totalShops: permissionShops.length,
      shops: permissionShops
    };
  } catch (error) {
    throw new Error(`Failed to fetch user shops by permission: ${error.message}`);
  }
};

/**
 * Get detailed shop access info for user
 */
const getUserShopAccess = async (userId, shopId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    const shopAccess = user.shops.find(shop => 
      shop.shopId.toString() === shopId.toString()
    );
    
    if (!shopAccess) {
      return {
        hasAccess: false,
        message: 'User does not have access to this shop'
      };
    }
    
    const shop = await Shop.findById(shopId).select('name description isActive');
    
    return {
      hasAccess: shopAccess.isActive && shop.isActive,
      shopId: shopId,
      shopName: shop.name,
      userRole: shopAccess.role,
      permissions: shopAccess.permissions,
      joinedAt: shopAccess.joinedAt,
      isActive: shopAccess.isActive,
      isCurrentShop: user.currentShop && user.currentShop.toString() === shopId.toString()
    };
  } catch (error) {
    throw new Error(`Failed to get user shop access: ${error.message}`);
  }
};

/**
 * Get user's current shop details
 */
const getUserCurrentShop = async (userId) => {
  try {
    const user = await User.findById(userId).populate({
      path: 'currentShop',
      select: 'name description address phone email isActive createdAt owner',
      populate: {
        path: 'owner',
        select: 'name email'
      }
    });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    if (!user.currentShop) {
      return {
        hasCurrentShop: false,
        message: 'No current shop set for user'
      };
    }
    
    // Get user's role and permissions in current shop
    const shopAccess = user.shops.find(shop => 
      shop.shopId.toString() === user.currentShop._id.toString()
    );
    
    return {
      hasCurrentShop: true,
      shopId: user.currentShop._id,
      shopDetails: user.currentShop,
      userRole: shopAccess ? shopAccess.role : null,
      permissions: shopAccess ? shopAccess.permissions : [],
      joinedAt: shopAccess ? shopAccess.joinedAt : null
    };
  } catch (error) {
    throw new Error(`Failed to get user current shop: ${error.message}`);
  }
};

/**
 * Get users for a specific shop
 */
const getShopUsers = async (shopId) => {
  try {
    const users = await User.find({
      'shops.shopId': shopId,
      'shops.isActive': true,
      isActive: true
    }).select('name email phone role shops lastLogin createdAt');
    
    const shopUsers = users.map(user => {
      const shopAccess = user.shops.find(shop => 
        shop.shopId.toString() === shopId.toString()
      );
      
      return {
        userId: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        globalRole: user.role,
        shopRole: shopAccess.role,
        permissions: shopAccess.permissions,
        joinedAt: shopAccess.joinedAt,
        lastLogin: user.lastLogin,
        isCurrentShop: user.currentShop && user.currentShop.toString() === shopId.toString()
      };
    });
    
    return {
      shopId: shopId,
      totalUsers: shopUsers.length,
      users: shopUsers
    };
  } catch (error) {
    throw new Error(`Failed to get shop users: ${error.message}`);
  }
};

/**
 * Search users across shops
 */
const searchUsersInShops = async (searchTerm, shopIds = []) => {
  try {
    let query = {
      isActive: true,
      $or: [
        { name: { $regex: searchTerm, $options: 'i' } },
        { email: { $regex: searchTerm, $options: 'i' } },
        { phone: { $regex: searchTerm, $options: 'i' } }
      ]
    };
    
    // If specific shop IDs provided, filter by those
    if (shopIds.length > 0) {
      query['shops.shopId'] = { $in: shopIds };
      query['shops.isActive'] = true;
    }
    
    const users = await User.find(query)
      .select('name email phone role shops lastLogin')
      .populate({
        path: 'shops.shopId',
        select: 'name'
      });
    
    const searchResults = users.map(user => ({
      userId: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      globalRole: user.role,
      shops: user.shops
        .filter(shop => shop.isActive && shop.shopId)
        .map(shop => ({
          shopId: shop.shopId._id,
          shopName: shop.shopId.name,
          role: shop.role,
          permissions: shop.permissions
        })),
      lastLogin: user.lastLogin
    }));
    
    return {
      searchTerm: searchTerm,
      totalResults: searchResults.length,
      users: searchResults
    };
  } catch (error) {
    throw new Error(`User search failed: ${error.message}`);
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

