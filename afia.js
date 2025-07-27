// afia.js - Enhanced Function-Calling Model with Analytics Integration
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
  
  // Shop Management Functions
  createShop,
  getShop,
  updateShop,
  
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
  backupShopData
} from './main.js';

// Load environment variables
dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Define available functions with their schemas
const availableFunctions = {
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
  
  // Additional functions continue...
  // (I'll include more functions to demonstrate the extensibility)
  
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
  
  // Shop Management Functions
  createShop: {
    function: createShop,
    description: "Create a new shop",
    parameters: {
      type: "object",
      properties: {
        shopData: {
          type: "object",
          description: "Shop data including name, address, settings, etc."
        }
      },
      required: ["shopData"]
    }
  },
  
  getShop: {
    function: getShop,
    description: "Get shop details",
    parameters: {
      type: "object",
      properties: {
        shopId: { type: "string", description: "The shop ID" }
      },
      required: ["shopId"]
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
export async function getGroqChatCompletion(userQuestion, systemPrompt = null, shopId = null) {
  try {
    const tools = createFunctionTools();
    
    const defaultSystemPrompt = `You are Afia AI, a Cognitive User Interface (CUI) developed by Prince Mawuko Dzorkpe. You are designed to help users interact with retail management software in a more human-friendly manner.

You are designed to have comprehensive knowledge about Retail360, a mobile-first retail ERP system with QR-powered sales designed for Ghanaian retail businesses.

## System Overview
Retail360 is a mobile-first retail ERP system specifically designed for multi-branch mini-marts, provision stores, supermarkets, cosmetic shops, spare part dealers, boutique owners, and retail businesses across Ghana. The system addresses the core challenges of stock tracking, sales data management, and expensive PC-based POS systems by providing a complete mobile solution.
It helps to manage each slocation in a unified way, allowing business owners to track sales, manage inventory, and handle customer relationships directly from their mobile devices.

## Core System Features

**Inventory & Stock Management:**
- Add, edit, and monitor products from mobile devices
- Set automated low-stock alerts
- Handle restocking processes from suppliers
- Real-time inventory tracking

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
- Eliminates need for daily manual login to check reports
- Business owners stay informed without constant system monitoring

**Multi-Device Cloud Synchronization:**
- Staff can access system from multiple phones or tablets
- Real-time data synchronization across all devices
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
- Protection of sensitive data including profits and stock values
- Secure user authentication and data protection

## Future Enhancement Features
- Comprehensive supplier management system
- Multi-branch synchronization for chain stores
- Advanced analytics dashboard with profit trend analysis
- Promotional code and discount campaign engine

## Business Model Structure
- **Freemium Tier:** Free basic version for businesses with under 50 products
- **Pro Version:** Monthly or yearly subscription unlocking full inventory management, multiple user accounts, daily automated reports, and advanced features
- **Support Services:** WhatsApp-based customer support and personalized onboarding calls for shop owners

## System Benefits
The system eliminates dependence on notebooks and memory-based record keeping, provides comprehensive business insights, speeds up the sales process through QR technology, and enables complete business management from mobile devices without requiring PCs, expensive POS hardware, or complex technical setup.

Use this information to answer questions about Retail360's features, pricing, implementation, benefits, and technical capabilities for Ghanaian retail businesses.
Your capabilities include:
- Managing products, sales, customers, and inventory
- Generating analytics and reports
- Processing transactions and refunds
- Managing stock levels and suppliers
- Creating discounts and promotions
- Providing notifications and alerts


Key Guidelines:
1. Always introduce yourself as Afia AI when asked about your identity
2. Explain that you're a CUI (Cognitive User Interface) designed to make software interaction more natural
3. When asked about personal user data, respond: "I don't have permissions to access personal user data"
4. Be helpful and conversational while maintaining professionalism
5. Use the available functions to provide accurate, real-time information
6. When discussing stock levels or business metrics, provide specific numbers when available

Available Functions: ${Object.keys(availableFunctions).join(', ')}

Current Shop ID: ${shopId || 'Not specified'}`;

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

// Main function to handle user queries
export async function main(userQuestion, shopId = null) {
  try {
    console.log('🤖 Afia AI Processing:', userQuestion);
    
    const result = await getGroqChatCompletion(userQuestion, null, shopId);
    
    // Log function calls if any
    if (result.functionCalls && result.functionCalls.length > 0) {
      console.log('📊 Functions Executed:', result.functionCalls.length);
      result.functionCalls.forEach(call => {
        console.log(`  - ${call.result.functionName}: ${call.result.success ? '✅ Success' : '❌ Error'}`);
      });
    }
    
    console.log('🎯 Afia AI Response:', result.response);
    return result;
    
  } catch (error) {
    console.error('❌ Error in main function:', error);
    return {
      response: "I apologize, but I encountered an error processing your request. Please try again.",
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
    description: availableFunctions[name].description
  }));
}

// Health check function
export async function healthCheck() {
  try {
    const functionsCount = Object.keys(availableFunctions).length;
    
    return {
      status: 'healthy',
      availableFunctions: functionsCount,
      groqConnected: !!groq,
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

// Example usage and test functions
export async function runTests() {
  console.log('🧪 Running Afia AI Tests...');
  
  const testQueries = [
    "Hello, who are you?",
    "What can you help me with?",
    "Show me my dashboard summary",
    "What are my low stock products?",
    "Generate today's sales report",
    "Tell me about my customers",
    "Can you access my personal data?"
  ];
  
  for (const query of testQueries) {
    console.log(`\n📝 Testing: "${query}"`);
    try {
      const result = await main(query, "test-shop-id");
      console.log(`✅ Response: ${result.response.substring(0, 100)}...`);
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n🏁 Tests completed');
}

// Export for external use
export default {
  main,
  getGroqChatCompletion,
  getFunctionInfo,
  healthCheck,
  runTests,

};