# POS System Pages & Components Organization

## 1. Authentication Pages

### Login Page
**Components:**
- Form with email/password input fields
- Submit button
- Register link

**Function:** `loginUser(credentials)`
**Input Data:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

### Register Page
**Components:**
- Form with name, email, phone, password fields
- Role selector (dropdown)
- Shop ID input
- Submit button

**Function:** `registerUser(userData)`
**Input Data:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+233123456789",
  "password": "password123",
  "role": "staff",
  "shopId": "shop_12345",
  "permissions": {
    "canViewReports": true,
    "canManageInventory": false
  }
}
```

---

## 2. Main Dashboard

### Dashboard/Home Page
**Components:**
- **Stats Cards** (4 cards in grid layout)
- **Low Stock Alert Cards** (vertical list)
- **Recent Notifications Cards** (vertical list)
- **Quick Action Buttons** (grid layout)

**Function:** `getDashboardSummary(shopId)`
**Data Format:**
```json
{
  "todayStats": {
    "revenue": 1250.50,
    "transactions": 45,
    "averageOrderValue": 27.79
  },
  "inventory": {
    "totalProducts": 150,
    "lowStockCount": 8,
    "lowStockProducts": [
      {
        "id": "prod_123",
        "name": "Coca Cola 500ml",
        "currentQuantity": 5,
        "minQuantity": 10,
        "pricing": {
          "sellingPrice": 2.50
        }
      }
    ]
  },
  "customers": {
    "totalCustomers": 89
  },
  "notifications": [
    {
      "id": "notif_123",
      "type": "low-stock",
      "title": "Low Stock Alert",
      "message": "Coca Cola 500ml is running low",
      "priority": "high",
      "isRead": false,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

## 3. Shop Management

### Shop Profile Page
**Components:**
- **Shop Info Card** (display/edit mode)
- **Settings Card**
- **Edit Button**

**Function:** `getShop(shopId)` / `updateShop(shopId, updates)`
**Data Format:**
```json
{
  "id": "shop_123",
  "name": "Super Store",
  "description": "Your neighborhood convenience store",
  "address": "123 Main Street, Accra",
  "phone": "+233123456789",
  "email": "info@superstore.com",
  "isActive": true,
  "owner": {
    "name": "John Doe",
    "email": "john@example.com"
  },
  "createdAt": "2024-01-01T00:00:00Z"
}
```

---

## 4. Product Management

### Products List Page
**Components:**
- **Search Bar** (text input)
- **Filter Chips** (category, low stock)
- **Product Cards** (grid/list layout)
- **Add Product FAB** (floating action button)

**Function:** `getProducts(shopId, filters)`
**Data Format:**
```json
[
  {
    "id": "prod_123",
    "name": "Coca Cola 500ml",
    "sku": "CC500ML",
    "barcode": "1234567890123",
    "category": {
      "id": "cat_123",
      "name": "Beverages"
    },
    "pricing": {
      "costPrice": 1.80,
      "sellingPrice": 2.50,
      "currency": "GHS"
    },
    "stock": {
      "currentQuantity": 50,
      "minQuantity": 10
    },
    "images": ["image_url_1"],
    "isActive": true
  }
]
```

### Add/Edit Product Page
**Components:**
- **Product Form** (multiple input fields)
- **Image Upload** (file picker)
- **Category Selector** (dropdown)
- **Pricing Section** (number inputs)
- **Stock Section** (number inputs)
- **Save Button**

**Function:** `createProduct(productData)` / `updateProduct(productId, updates)`

### Product Details Page
**Components:**
- **Product Info Card**
- **QR Code Card**
- **Stock Movement Card**
- **Action Buttons** (Edit, Delete, Generate QR)

**Function:** `getProductByQR(qrCode)`

### QR Code Scanner Page
**Components:**
- **Camera View** (QR scanner)
- **Product Result Card**
- **Manual Input** (text field)

**Function:** `getProductByQR(qrCode)`

### Low Stock Alert Page
**Components:**
- **Alert Cards** (vertical list)
- **Refresh Button**

**Function:** `getLowStockProducts(shopId)`

---

## 5. Category Management

### Categories List Page
**Components:**
- **Category Cards** (list layout)
- **Add Category FAB**
- **Search Bar**

**Function:** `getCategories(shopId)`
**Data Format:**
```json
[
  {
    "id": "cat_123",
    "name": "Beverages",
    "description": "Soft drinks and beverages",
    "parentCategory": null,
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00Z"
  }
]
```

### Add/Edit Category Page
**Components:**
- **Category Form** (name, description)
- **Parent Category Selector** (dropdown)
- **Save Button**

**Function:** `createCategory(categoryData)` / `updateCategory(categoryId, updates)`

---

## 6. Customer Management

### Customers List Page
**Components:**
- **Search Bar** (phone number search)
- **Customer Cards** (list layout)
- **Add Customer FAB**

**Function:** `getCustomers(shopId, filters)`
**Data Format:**
```json
[
  {
    "id": "cust_123",
    "name": "Jane Smith",
    "phone": "+233987654321",
    "email": "jane@example.com",
    "address": "456 Oak Street",
    "loyalty": {
      "points": 150,
      "membershipTier": "silver",
      "totalSpent": 500.00
    },
    "createdAt": "2024-01-01T00:00:00Z"
  }
]
```

### Add Customer Page
**Components:**
- **Customer Form** (name, phone, email, address)
- **Loyalty Settings** (points, tier)
- **Save Button**

**Function:** `createCustomer(customerData)`

### Customer Details Page
**Components:**
- **Customer Info Card**
- **Loyalty Card**
- **Purchase History List**
- **Action Buttons** (Edit, Add Points)

**Function:** `getCustomerByPhone(phone, shopId)`

### Customer Search Page
**Components:**
- **Phone Search Bar**
- **Customer Result Card**
- **Quick Add Button**

**Function:** `getCustomerByPhone(phone, shopId)`

---

## 7. Sales & POS

### Point of Sale (POS) Page
**Components:**
- **Product Search Bar**
- **Cart Items List**
- **Total Calculation Card**
- **Payment Method Selector**
- **Process Sale Button**
- **Customer Selector**

**Function:** `createSale(saleData)`
**Data Format:**
```json
{
  "shopId": "shop_123",
  "customer": "cust_123",
  "cashier": "user_123",
  "items": [
    {
      "product": "prod_123",
      "productName": "Coca Cola 500ml",
      "quantity": 2,
      "unitPrice": 2.50,
      "totalPrice": 5.00
    }
  ],
  "totals": {
    "subtotal": 5.00,
    "tax": 0.50,
    "discount": 0.00,
    "total": 5.50
  },
  "payment": {
    "method": "cash",
    "amount": 10.00,
    "change": 4.50,
    "status": "completed"
  }
}
```

### Sales History Page
**Components:**
- **Date Range Picker**
- **Filter Chips** (payment method)
- **Sales Cards** (list layout)
- **Export Button**

**Function:** `getSales(shopId, filters)`
**Data Format:**
```json
[
  {
    "id": "sale_123",
    "saleNumber": "INV-2024-001",
    "customer": {
      "name": "Jane Smith",
      "phone": "+233987654321"
    },
    "totals": {
      "total": 27.50
    },
    "payment": {
      "method": "cash",
      "status": "completed"
    },
    "createdAt": "2024-01-15T14:30:00Z"
  }
]
```

### Sale Details Page
**Components:**
- **Sale Info Card**
- **Items List**
- **Payment Details Card**
- **Action Buttons** (Print Receipt, Refund)

**Function:** `getSaleById(saleId)`

### Receipt Page
**Components:**
- **Receipt Layout** (formatted text)
- **Share Button**
- **Print Button**

---

## 8. Inventory Management

### Stock Movements Page
**Components:**
- **Movement Cards** (list layout)
- **Filter Chips** (type, reason)
- **Product Selector**

**Function:** `getStockMovements(productId, limit)`
**Data Format:**
```json
[
  {
    "id": "mov_123",
    "product": {
      "name": "Coca Cola 500ml"
    },
    "type": "out",
    "quantity": 2,
    "previousQuantity": 52,
    "newQuantity": 50,
    "reason": "sale",
    "reference": "sale_123",
    "user": {
      "name": "John Doe"
    },
    "createdAt": "2024-01-15T14:30:00Z"
  }
]
```

### Stock Adjustment Page
**Components:**
- **Product Selector**
- **Quantity Input** (number)
- **Reason Selector** (dropdown)
- **Notes Input** (text area)
- **Submit Button**

**Function:** `adjustStock(productId, adjustment)`

---

## 9. Supplier Management

### Suppliers List Page
**Components:**
- **Supplier Cards** (list layout)
- **Add Supplier FAB**
- **Search Bar**

**Function:** `getSuppliers(shopId)`
**Data Format:**
```json
[
  {
    "id": "sup_123",
    "name": "Coca Cola Bottling Company",
    "contactPerson": "Mike Johnson",
    "phone": "+233555123456",
    "email": "mike@cocacola.com",
    "address": "Industrial Area, Tema",
    "products": [
      {
        "name": "Coca Cola 500ml"
      }
    ]
  }
]
```

---

## 10. Analytics & Reports

### Analytics Dashboard Page
**Components:**
- **Revenue Chart** (line chart)
- **Top Products Chart** (bar chart)
- **Customer Analytics Card**
- **Date Range Picker**

**Function:** `getSalesAnalytics(shopId, startDate, endDate)`

### Sales Analytics Page
**Components:**
- **Sales Chart** (line chart)
- **Payment Methods Chart** (pie chart)
- **Top Products List**
- **Export Button**

**Data Format:**
```json
{
  "totalProductsSold": 150,
  "totalRevenue": 3750.00,
  "totalProfit": 1125.00,
  "topProducts": [
    {
      "product": {
        "name": "Coca Cola 500ml",
        "pricing": {
          "sellingPrice": 2.50
        }
      },
      "totalQuantitySold": 50,
      "totalRevenue": 125.00,
      "totalProfit": 35.00,
      "salesCount": 25
    }
  ]
}
```

### Daily Reports Page
**Components:**
- **Date Picker**
- **Report Card** (comprehensive summary)
- **Export Button**
- **Print Button**

**Function:** `generateDailyReport(shopId, date)`

---

## 11. Discounts & Promotions

### Active Discounts Page
**Components:**
- **Discount Cards** (list layout)
- **Add Discount FAB**
- **Filter Chips** (active, expired)

**Function:** `getActiveDiscounts(shopId)`
**Data Format:**
```json
[
  {
    "id": "disc_123",
    "name": "New Year Sale",
    "code": "NEWYEAR2024",
    "type": "percentage",
    "value": 10,
    "startDate": "2024-01-01T00:00:00Z",
    "endDate": "2024-01-31T23:59:59Z",
    "minimumPurchase": 50.00,
    "usageLimit": 100,
    "usedCount": 25
  }
]
```

### Apply Discount Page
**Components:**
- **Discount Code Input**
- **Sale Summary Card**
- **Apply Button**
- **Discount Result Card**

**Function:** `applyDiscount(discountCode, saleData)`

---

## 12. Notifications

### Notifications Page
**Components:**
- **Notification Cards** (list layout)
- **Filter Chips** (unread, type)
- **Mark All Read Button**

**Function:** `getNotifications(shopId, filters)`
**Data Format:**
```json
[
  {
    "id": "notif_123",
    "type": "low-stock",
    "title": "Low Stock Alert",
    "message": "Coca Cola 500ml is running low (5 remaining)",
    "priority": "high",
    "isRead": false,
    "metadata": {
      "productId": "prod_123"
    },
    "createdAt": "2024-01-15T10:30:00Z"
  }
]
```

---

## 13. Settings & Profile

### Settings Page
**Components:**
- **Settings Cards** (grouped by category)
- **Toggle Switches**
- **Input Fields**
- **Save Button**

### Profile Page
**Components:**
- **Profile Card** (user info)
- **Edit Profile Form**
- **Change Password Form**
- **Permissions Card**

---

## 14. Additional Features

### AFIA AI Chat Page
**Components:**
- **Chat Messages List**
- **Message Input**
- **Send Button**
- **Quick Actions**

**Function:** `main(userQuestion, shopId)`
**Data Format:**
```json
{
  "response": "Based on your sales data, you sold 150 items today with a total revenue of GHS 3,750.",
  "functionCalls": [
    {
      "toolCallId": "call_123",
      "result": {
        "success": true,
        "functionName": "getDashboardSummary",
        "result": {
          "todayStats": {
            "revenue": 3750.00,
            "transactions": 45
          }
        }
      }
    }
  ]
}
```

### Backup & Restore Page
**Components:**
- **Backup Status Card**
- **Backup Button**
- **Restore Options**
- **Progress Indicator**

**Function:** `backupShopData(shopId)`
**Data Format:**
```json
{
  "timestamp": "2024-01-15T12:00:00Z",
  "shop": {...},
  "users": [...],
  "categories": [...],
  "products": [...],
  "customers": [...],
  "sales": [...],
  "suppliers": [...],
  "stockMovements": [...]
}
```

---

## Component Recommendations

### Card Components
- **Info Cards**: Display read-only information
- **Action Cards**: Include buttons for user actions
- **List Cards**: Display multiple items in a list format
- **Summary Cards**: Show aggregated data with charts

### Input Components
- **Text Fields**: For names, descriptions, notes
- **Number Fields**: For quantities, prices, stock levels
- **Dropdown Selectors**: For categories, payment methods, roles
- **Date Pickers**: For filtering and reporting
- **Search Bars**: For finding products, customers, etc.
- **Toggle Switches**: For boolean settings
- **File Pickers**: For image uploads

### Layout Components
- **Grid Layout**: For dashboard stats, product catalog
- **List Layout**: For transactions, customers, notifications
- **Tab Layout**: For different sections within a page
- **Bottom Navigation**: For main app navigation
- **Floating Action Button**: For primary actions like "Add"

### Interactive Components
- **Charts**: Line charts for trends, pie charts for distributions
- **QR Scanner**: Camera view for scanning QR codes
- **Progress Indicators**: For loading states and backup progress
- **Refresh Indicators**: For pull-to-refresh functionality