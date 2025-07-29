// afia.js - Enhanced Master Shop Integration with Full Functionality
import Groq from "groq-sdk";
import dotenv from "dotenv";
import mongoose from 'mongoose';
import {
  User, Shop, Product, Category, Customer, Sale, Supplier,
  StockMovement, DailyReport, Notification, Discount, CrossShopTransaction,
  helpers
} from './database.js';

// Import all functions from main.js except loginUser and owner registration
import {
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
  getCategoryHierarchy
} from './main.js';

// Load environment variables
dotenv.config();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Enhanced Function Implementations
const availableFunctions = {
  // Authentication
  registerUser: {
    async function(userData) {
      try {
        // Prevent creating owner accounts
        if (userData.role === 'owner') {
          return { 
            success: false, 
            error: "AI cannot create owner accounts. Please contact support." 
          };
        }

        const user = new User({
          ...userData,
          role: userData.role || 'staff'
        });
        
        await user.save();
        
        // Return without sensitive data
        const userObj = user.toObject();
        delete userObj.password;
        return { success: true, user: userObj };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    description: "Register a new user (Manager or Staff only)",
    parameters: {
      type: "object",
      properties: {
        userData: {
          type: "object",
          properties: {
            name: { type: "string" },
            email: { type: "string" },
            phone: { type: "string" },
            password: { type: "string" },
            role: { 
              type: "string", 
              enum: ["manager", "staff"] 
            },
            shopId: { type: "string" }
          },
          required: ["name", "email", "phone", "password"]
        }
      },
      required: ["userData"]
    }
  },

  // Master Shop Management
  createMasterShop: {
    function: createShop,
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
    function: setMasterShop,
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
    function: connectShopToMaster,
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
    function: getMasterShopNetwork,
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
    function: getConsolidatedFinancialReport,
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
    function: recordCrossShopTransaction,
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
    function: getShop,
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
    function: updateShop,
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
    function: deleteShop,
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
    function: getUserShops,
    description: "Get all shops for a user",
    parameters: {
      type: "object",
      properties: {
        userId: { type: "string" }
      },
      required: ["userId"]
    }
  },

  setCurrentShop: {
    function: setCurrentShop,
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
    function: getShopStats,
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
    function: createProduct,
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
    function: getProducts,
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
    function: getProductByQR,
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
    function: updateProduct,
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
    function: deleteProduct,
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
    function: getLowStockProducts,
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
    function: createSale,
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
    function: getSales,
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
    function: getSaleById,
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
    function: processRefund,
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
    function: createCustomer,
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
    function: getCustomers,
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
    function: getCustomerByPhone,
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
    function: updateCustomer,
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
    function: addLoyaltyPoints,
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
    function: createStockMovement,
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
    function: getStockMovements,
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
    function: adjustStock,
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
    function: createSupplier,
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
    function: getSuppliers,
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
    function: updateSupplier,
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
    function: generateDailyReport,
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
    function: getDashboardSummary,
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
    function: createNotification,
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
    function: getNotifications,
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
    function: markNotificationAsRead,
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
    function: createDiscount,
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
    function: getActiveDiscounts,
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
    function: createCategory,
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
    function: getCategories,
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
    function: getCategoryById,
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
    function: updateCategory,
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
    function: deleteCategory,
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
    function: getProductsByCategory,
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
    function: getCategoryHierarchy,
    description: "Get category hierarchy for a shop",
    parameters: {
      type: "object",
      properties: {
        shopId: { type: "string" }
      },
      required: ["shopId"]
    }
  },

  // Utility Functions
  runDailyTasks: {
    function: runDailyTasks,
    description: "Run daily maintenance tasks",
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

User Context:
- User ID: ${userId || 'Not specified'} ${masterShopContext}
- Current Shop: ${shopId || 'Not specified'}

Security Protocols:
- Never reveal passwords or sensitive user data
- Cannot create owner accounts
- Restrict shop access based on user permissions
- Mask financial details in responses

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

// Test function
export async function runTest() {
  try {
    // Test master shop creation
    const owner = await User.findOne({ role: 'owner' });
    if (!owner) {
      return { status: "No owner found for test" };
    }

    const shopRes = await availableFunctions.createMasterShop.function(
      { name: "Test Master", phone: "1234567890" },
      owner._id,
      true
    );

    // Test product creation
    const productRes = await availableFunctions.createProduct.function({
      productData: {
        name: "Test Product",
        shopId: shopRes._id,
        pricing: { costPrice: 10, sellingPrice: 15 }
      }
    });

    // Test sale creation
    const saleRes = await availableFunctions.createSale.function({
      saleData: {
        shopId: shopRes._id,
        items: [{
          product: productRes._id,
          quantity: 2,
          unitPrice: 15
        }]
      }
    });

    return {
      status: "success",
      masterShop: !!shopRes,
      product: !!productRes,
      sale: !!saleRes
    };
  } catch (error) {
    return {
      status: "error",
      error: error.message
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
export default { main, runTest };