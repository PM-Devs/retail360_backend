// afia.js - Optimized Master Shop Integration
import Groq from "groq-sdk";
import dotenv from "dotenv";
import mongoose from 'mongoose';
import { User, Shop } from './database.js';

// Load environment variables
dotenv.config();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Permission Constants (Simplified)
const PERMISSION_MODULES = {
  inventory: 'Manage products and stock',
  sales: 'Process sales and transactions',
  customers: 'Manage customer information',
  suppliers: 'Manage supplier relationships',
  reports: 'View reports and analytics',
  settings: 'Manage shop configuration',
  users: 'Manage staff accounts',
  discounts: 'Manage promotions',
  categories: 'Organize product categories',
  stock: 'Adjust stock levels'
};

// Core Functions (Dynamically loaded)
const CORE_FUNCTIONS = {
  // User Management
  registerStaff: {
    async function(params) {
      try {
        const staff = await User.registerStaff(params.staffData, params.registeredByUserId);
        return { user: staff.user, permissions: staff.user.permissions };
      } catch (error) {
        return { error: error.message };
      }
    },
    description: "Register new staff member",
    params: ["staffData:object", "registeredByUserId:string"]
  },

  getShopStaff: {
    async function(params) {
      try {
        return await Shop.getShopStaff(params.shopId, params.requestingUserId);
      } catch (error) {
        return { error: error.message };
      }
    },
    description: "Get shop staff with roles",
    params: ["shopId:string", "requestingUserId:string"]
  },

  // Shop Management
  createMasterShop: {
    async function(params) {
      try {
        return await Shop.createShop(params.shopData, params.userId, true);
      } catch (error) {
        return { error: error.message };
      }
    },
    description: "Create new master shop",
    params: ["shopData:object", "userId:string"]
  },

  connectToMasterShop: {
    async function(params) {
      try {
        return await Shop.connectShopToMaster(
          params.shopId, 
          params.masterShopId, 
          params.connectionType || 'branch', 
          params.financialSettings || {}
        );
      } catch (error) {
        return { error: error.message };
      }
    },
    description: "Connect shop to master",
    params: ["shopId:string", "masterShopId:string", "connectionType?:string", "financialSettings?:object"]
  },

  getMasterShopNetwork: {
    async function(params) {
      try {
        return await User.getMasterShopNetwork(params.userId);
      } catch (error) {
        return { error: error.message };
      }
    },
    description: "Get master shop network",
    params: ["userId:string"]
  },

  // Product Management
  createProduct: {
    async function(params) {
      try {
        return await Product.createProduct(params.productData);
      } catch (error) {
        return { error: error.message };
      }
    },
    description: "Create product with QR code",
    params: ["productData:object"]
  },

  getProducts: {
    async function(params) {
      try {
        return await Product.getProducts(params.shopId, params.filters || {});
      } catch (error) {
        return { error: error.message };
      }
    },
    description: "Get shop products",
    params: ["shopId:string", "filters?:object"]
  },

  // Sales Management
  createSale: {
    async function(params) {
      try {
        return await Sale.createSale(params.saleData);
      } catch (error) {
        return { error: error.message };
      }
    },
    description: "Record new sale",
    params: ["saleData:object"]
  },

  // Customer Management
  createCustomer: {
    async function(params) {
      try {
        return await Customer.createCustomer(params.customerData);
      } catch (error) {
        return { error: error.message };
      }
    },
    description: "Create new customer",
    params: ["customerData:object"]
  },

  // Utility Functions
  getAvailablePermissions: {
    async function() {
      return PERMISSION_MODULES;
    },
    description: "Get permission modules",
    params: []
  }
};

// Dynamic Function Loader
const getRelevantFunctions = (userInput) => {
  const inputKeywords = userInput.toLowerCase().split(' ');
  const relevantFunctions = {};
  
  Object.entries(CORE_FUNCTIONS).forEach(([name, config]) => {
    const funcKeywords = [
      ...name.toLowerCase().split('_'),
      ...config.description.toLowerCase().split(' ')
    ];
    
    if (funcKeywords.some(kw => inputKeywords.includes(kw))) {
      relevantFunctions[name] = config;
    }
  });
  
  return Object.keys(relevantFunctions).length > 0 
    ? relevantFunctions 
    : { getAvailablePermissions: CORE_FUNCTIONS.getAvailablePermissions };
};

// Function Parameter Parser
const parseParams = (paramDefs, args) => {
  const params = {};
  paramDefs.forEach(def => {
    const [name, type] = def.split(':');
    const paramName = name.replace('?', '');
    
    if (args[paramName] !== undefined) {
      // Type validation
      if (type === 'number' && typeof args[paramName] !== 'number') {
        throw new Error(`Invalid type for ${paramName}: Expected number`);
      }
      params[paramName] = args[paramName];
    } else if (!name.includes('?')) {
      throw new Error(`Missing required parameter: ${paramName}`);
    }
  });
  return params;
};

// Function Execution Handler
const executeFunction = async (name, args) => {
  const func = CORE_FUNCTIONS[name];
  if (!func) throw new Error(`Function ${name} not available`);
  
  const parsedParams = parseParams(func.params, args);
  const result = await func.function(parsedParams);
  
  return {
    name,
    success: !result.error,
    result: result.error ? result.error : result
  };
};

// Optimized Groq Integration
export async function getGroqChatCompletion(userInput, userId = null, shopId = null) {
  try {
    // 1. Select relevant functions
    const relevantFunctions = getRelevantFunctions(userInput);
    
    // 2. Prepare system prompt
    const systemPrompt = `You are Afia AI, You are the Assistant Manager for the Retail360 system.
User Context:
- ID: ${userId || 'N/A'}
- Current Shop: ${shopId || 'N/A'}
- Master Shop: ${userId ? (await User.findById(userId))?.masterShop || 'None' : 'N/A'}

Capabilities:
- Manage staff accounts and permissions
- Create and manage shops
- Handle product management including creation and updates
- Process sales and customer management
- Generate reports and analytics
- Manage suppliers and inventory
- Provide support for shop configuration and settings
- Handle discounts and promotions
- Adjust stock levels etc...


Security Rules:
- BE brief and concise in responses and introduction
- AVOID unnecessary verbosity
- ALWAYS check for the kind of message, if its conversational, then:
             NEVER execute any function , just respond with the information about your capabilities
- DO NOT execute any function that requires sensitive data without verification
- NEVER reveal sensitive data
- VERIFY permissions before actions
- Use functions for all operations`;

    // 3. Prepare tools for Groq
    const tools = Object.entries(relevantFunctions).map(([name, config]) => ({
      type: "function",
      function: {
        name,
        description: config.description,
        parameters: {
          type: "object",
          properties: config.params.reduce((props, param) => {
            const [name, type] = param.split(':');
            const paramName = name.replace('?', '');
            props[paramName] = { type: type.replace('?', '').split('|')[0] };
            return props;
          }, {}),
          required: config.params.filter(p => !p.includes('?')).map(p => p.split(':')[0])
        }
      }
    }));

    // 4. Initial chat request
    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userInput }
    ];

    const initialResponse = await groq.chat.completions.create({
      model: "llama3-70b-8192",
      messages,
      tools: tools.length ? tools : undefined,
      tool_choice: tools.length ? "auto" : "none",
      temperature: 0.7,
      max_tokens: 4000
    });

    const assistantMessage = initialResponse.choices[0].message;
    if (!assistantMessage.tool_calls) {
      return { response: assistantMessage.content || "No response generated" };
    }

    // 5. Execute function calls
    const functionResults = [];
    for (const toolCall of assistantMessage.tool_calls) {
      try {
        const funcName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);
        
        // Add security context
        if (userId && !args.userId) args.userId = userId;
        if (shopId && !args.shopId) args.shopId = shopId;
        
        const result = await executeFunction(funcName, args);
        functionResults.push({
          toolCallId: toolCall.id,
          name: funcName,
          result: result.result,
          success: result.success
        });
      } catch (error) {
        functionResults.push({
          toolCallId: toolCall.id,
          name: toolCall.function.name,
          result: error.message,
          success: false
        });
      }
    }

    // 6. Generate final response
    messages.push(assistantMessage);
    messages.push({
      role: "tool",
      tool_call_id: toolCall.id,
      content: JSON.stringify(functionResults.map(fr => ({
        name: fr.name,
        success: fr.success,
        output: fr.success ? "Executed successfully" : fr.result
      })))
    });

    const finalResponse = await groq.chat.completions.create({
      model: "llama3-70b-8192",
      messages,
      temperature: 0.7,
      max_tokens: 2000
    });

    return {
      response: finalResponse.choices[0].message.content,
      functionCalls: functionResults
    };
    
  } catch (error) {
    console.error("Groq Error:", error);
    return {
      response: "I encountered an error: " + error.message,
      functionCalls: []
    };
  }
}

// Main Interface
export async function main(userInput, userId = null, shopId = null) {
  try {
    const result = await getGroqChatCompletion(userInput, userId, shopId);
    return {
      response: result.response.replace(/password|token|secret/gi, '[REDACTED]'),
      functionCalls: result.functionCalls?.map(fc => ({
        name: fc.name,
        success: fc.success
      })) || []
    };
  } catch (error) {
    return {
      response: "System error: " + error.message,
      functionCalls: []
    };
  }
}

// Health Check
export async function healthCheck() {
  return {
    status: "active",
    version: "3.1",
    dbStatus: mongoose.connection.readyState === 1 ? "connected" : "disconnected"
  };
}

export default { main, healthCheck };