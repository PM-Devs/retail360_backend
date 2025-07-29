# Retail360 API Documentation

## Base URL
`http://your-domain.com/api`

## Authentication Endpoints

### Register User
```http
POST /auth/register
```

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+233123456789",
  "password": "securepass123",
  "role": "owner",
  "shopId": "optional-shop-id",
  "permissions": {
    "canViewReports": true,
    "canManageInventory": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+233123456789",
      "role": "owner",
      "permissions": {
        "canViewReports": true,
        "canManageInventory": true
      }
    },
    "token": "jwt_token_string"
  }
}
```

### Login User
```http
POST /auth/login
```

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securepass123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "owner",
      "shops": ["array_of_shop_objects"],
      "ownedShops": ["array_of_owned_shops"],
      "currentShop": "current_shop_object",
      "masterShop": "master_shop_object",
      "hasShops": true,
      "hasMasterShop": true,
      "totalDebt": 0
    },
    "token": "jwt_token_string",
    "requiresShopCreation": false,
    "suggestMasterShopSetup": false
  }
}
```

## Shop Management Endpoints

### Create Shop with Master Option
```http
POST /shops/master
```

**Request Body:**
```json
{
  "name": "My Shop",
  "description": "Shop description",
  "address": {
    "street": "123 Main St",
    "city": "Accra",
    "region": "Greater Accra",
    "country": "Ghana"
  },
  "phone": "+233123456789",
  "email": "shop@example.com",
  "businessType": "mini-mart",
  "setAsMaster": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "shop_id",
    "name": "My Shop",
    "description": "Shop description",
    "address": {
      "street": "123 Main St",
      "city": "Accra",
      "region": "Greater Accra",
      "country": "Ghana"
    },
    "phone": "+233123456789",
    "email": "shop@example.com",
    "owner": "owner_object",
    "shopLevel": "master",
    "connectedShops": [],
    "createdAt": "timestamp"
  }
}
```

### Set Master Shop
```http
PUT /users/:userId/master-shop
```

**Request Body:**
```json
{
  "shopId": "shop_id_to_set_as_master"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Master shop set successfully",
    "masterShop": {
      "id": "shop_id",
      "name": "Shop Name",
      "shopLevel": "master"
    },
    "user": {
      "id": "user_id",
      "name": "User Name",
      "masterShop": "master_shop_id"
    }
  }
}
```

### Connect Shop to Master
```http
POST /shops/:shopId/connect-to-master
```

**Request Body:**
```json
{
  "masterShopId": "master_shop_id",
  "connectionType": "branch",
  "financialSettings": {
    "shareRevenue": false,
    "consolidateReports": true,
    "sharedInventory": false
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Shop connected to master successfully",
    "shop": {
      "id": "shop_id",
      "name": "Shop Name",
      "shopLevel": "branch",
      "masterShop": "master_shop_id"
    },
    "masterShop": {
      "id": "master_shop_id",
      "name": "Master Shop Name",
      "connectedShops": ["array_of_connected_shops"]
    }
  }
}
```

### Get Master Shop Network
```http
GET /users/:userId/master-shop-network
```

**Response:**
```json
{
  "success": true,
  "data": {
    "hasMasterShop": true,
    "masterShop": {
      "id": "shop_id",
      "name": "Master Shop",
      "description": "Description",
      "address": "address_object",
      "financials": "financials_object"
    },
    "connectedShops": [
      {
        "id": "shop_id",
        "name": "Connected Shop",
        "connectionType": "branch",
        "connectedAt": "timestamp",
        "financialSettings": "settings_object",
        "revenue": 1000
      }
    ],
    "networkStats": {
      "totalShops": 5,
      "totalNetworkRevenue": 50000,
      "masterShopRevenue": 20000
    }
  }
}
```

### Get Consolidated Financial Report
```http
GET /users/:userId/consolidated-financial-report
```

**Query Parameters:**
- `fromDate` (optional): Start date for report period
- `toDate` (optional): End date for report period

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "user_id",
    "masterShopId": "master_shop_id",
    "reportPeriod": {
      "fromDate": "date",
      "toDate": "date"
    },
    "networkSummary": {
      "totalShops": 5,
      "totalRevenue": 100000,
      "totalExpenses": 70000,
      "totalProfit": 30000,
      "totalNetworkDebt": 5000,
      "userPersonalDebt": 1000
    },
    "shopBreakdown": [
      {
        "shopId": "shop_id",
        "shopName": "Shop Name",
        "shopType": "master",
        "revenue": 50000,
        "expenses": 35000,
        "debt": 2000,
        "profit": 15000
      }
    ],
    "generatedAt": "timestamp"
  }
}
```

## Product Management Endpoints

### Create Product
```http
POST /products
```

**Request Body:**
```json
{
  "name": "Product Name",
  "description": "Product description",
  "category": "category_id",
  "shopId": "shop_id",
  "pricing": {
    "costPrice": 50,
    "sellingPrice": 100,
    "wholesalePrice": 80
  },
  "stock": {
    "currentQuantity": 100,
    "minQuantity": 10,
    "maxQuantity": 200
  },
  "unitOfMeasure": "piece",
  "supplier": "supplier_id"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "product_id",
    "name": "Product Name",
    "qrCode": "generated_qr_code",
    "sku": "generated_sku",
    "pricing": {
      "costPrice": 50,
      "sellingPrice": 100,
      "wholesalePrice": 80
    },
    "stock": {
      "currentQuantity": 100,
      "minQuantity": 10,
      "maxQuantity": 200
    },
    "qrCodeImage": "base64_qr_image"
  }
}
```

### Get Products
```http
GET /products/:shopId
```

**Query Parameters:**
- `category` (optional): Filter by category
- `search` (optional): Search term
- `lowStock` (optional): Filter low stock items

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "product_id",
      "name": "Product Name",
      "category": "category_object",
      "pricing": "pricing_object",
      "stock": "stock_object",
      "supplier": "supplier_object"
    }
  ]
}
```

### Get Product by QR Code
```http
GET /products/qr/:qrCode
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "product_id",
    "name": "Product Name",
    "qrCode": "qr_code",
    "category": "category_object",
    "pricing": "pricing_object",
    "stock": "stock_object"
  }
}
```

## Sales Management Endpoints

### Create Sale
```http
POST /sales
```

**Request Body:**
```json
{
  "shopId": "shop_id",
  "cashier": "user_id",
  "customer": "customer_id",
  "items": [
    {
      "product": "product_id",
      "quantity": 2,
      "unitPrice": 100,
      "totalPrice": 200
    }
  ],
  "payment": {
    "method": "cash",
    "status": "completed"
  },
  "totals": {
    "subtotal": 200,
    "discount": 0,
    "tax": 0,
    "total": 200
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "saleNumber": "generated_sale_number",
    "items": ["array_of_items"],
    "payment": "payment_details",
    "totals": "totals_object",
    "customer": "customer_object",
    "cashier": "cashier_object",
    "createdAt": "timestamp"
  }
}
```

### Get Sales
```http
GET /sales/:shopId
```

**Query Parameters:**
- `startDate` (optional): Filter by start date
- `endDate` (optional): Filter by end date
- `paymentMethod` (optional): Filter by payment method
- `customer` (optional): Filter by customer

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "saleNumber": "sale_number",
      "customer": "customer_object",
      "items": ["array_of_items"],
      "payment": "payment_object",
      "totals": "totals_object",
      "createdAt": "timestamp"
    }
  ]
}
```

## Customer Management Endpoints

### Create Customer
```http
POST /customers
```

**Request Body:**
```json
{
  "name": "Customer Name",
  "phone": "+233123456789",
  "email": "customer@example.com",
  "address": {
    "street": "Street Address",
    "city": "City",
    "region": "Region"
  },
  "shopId": "shop_id"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "customer_id",
    "name": "Customer Name",
    "phone": "+233123456789",
    "email": "customer@example.com",
    "loyalty": {
      "points": 0,
      "totalSpent": 0,
      "membershipTier": "bronze"
    }
  }
}
```

### Get Customers
```http
GET /customers/:shopId
```

**Query Parameters:**
- `search` (optional): Search term for name/phone/email

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "customer_id",
      "name": "Customer Name",
      "phone": "phone_number",
      "loyalty": "loyalty_object"
    }
  ]
}
```

## Analytics Endpoints

### Get Shop Network Analytics
```http
GET /users/:userId/shop-network-analytics
```

**Query Parameters:**
- `fromDate` (optional): Start date for analysis
- `toDate` (optional): End date for analysis

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "user_id",
    "reportPeriod": {
      "fromDate": "date",
      "toDate": "date"
    },
    "networkOverview": {
      "totalShops": 5,
      "masterShopRevenue": 50000,
      "totalNetworkRevenue": 100000,
      "averageRevenuePerShop": 20000
    },
    "financialHealth": {
      "totalProfit": 30000,
      "profitMargin": 30,
      "debtToRevenueRatio": 5
    },
    "transactionAnalytics": {
      "totalTransactions": 500,
      "transactionTypes": {
        "transfer": 200,
        "debt": 100,
        "payment": 200
      },
      "totalTransactionValue": 150000
    },
    "shopPerformance": [
      {
        "shopId": "shop_id",
        "shopName": "Shop Name",
        "shopType": "branch",
        "profitMargin": 25,
        "debtRatio": 10,
        "performance": "profitable"
      }
    ]
  }
}
```

### Get Dashboard Summary
```http
GET /dashboard/:shopId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "todayStats": {
      "revenue": 5000,
      "transactions": 50,
      "averageOrderValue": 100
    },
    "inventory": {
      "totalProducts": 500,
      "lowStockCount": 20,
      "lowStockProducts": ["array_of_products"]
    },
    "customers": {
      "totalCustomers": 1000
    },
    "notifications": ["array_of_notifications"]
  }
}
```

## Error Responses

All endpoints may return the following error response:

```json
{
  "success": false,
  "error": {
    "message": "Error message description",
    "stack": "Error stack trace (development mode only)"
  },
  "timestamp": "error_timestamp"
}
```

## Authentication

All endpoints except `/auth/login` and `/auth/register` require authentication via JWT token in the Authorization header:

```http
Authorization: Bearer your_jwt_token
```

## Additional Headers

For shop-specific endpoints, include the shop ID in headers:

```http
X-Shop-ID: your_shop_id
```
