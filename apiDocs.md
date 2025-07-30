Registration:


Request url: https://retail360-backend.vercel.app/api/auth/register

request data: 
{
  "name": "Kwame Mensah",
  "email": "kwame.mensah@example.com",
  "phone": "+233201234567",
  "password": "StrongPassword123!",
  "role": "owner"
}


response data: 

{
    "success": true,
    "data": {
        "user": {
            "id": "6889631f9b042adc0180276d",
            "name": "Kwame Mensah",
            "email": "kwame.mensah@example.com",
            "phone": "+233201234567",
            "role": "owner"
        },
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODg5NjMxZjliMDQyYWRjMDE4MDI3NmQiLCJyb2xlIjoib3duZXIiLCJpYXQiOjE3NTM4MzQyNzIsImV4cCI6MTc1NDQzOTA3Mn0.YckQ4ulq845_sb4dL9dO8SbNQg1qo-FoM8cQVkxo6ZI"
    }
}


Login :

url:https://retail360-backend.vercel.app/api/auth/login

request:

{

  "email": "kwame.mensah@example.com",
  "password": "StrongPassword123!"

}


response : 

{
    "success": true,
    "data": {
        "user": {
            "id": "6889631f9b042adc0180276d",
            "name": "Kwame Mensah",
            "email": "kwame.mensah@example.com",
            "role": "owner",
            "shops": [],
            "ownedShops": [],
            "currentShop": null,
            "currentShopPermissions": {},
            "masterShop": null,
            "totalDebt": 0
        },
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODg5NjMxZjliMDQyYWRjMDE4MDI3NmQiLCJyb2xlIjoib3duZXIiLCJjdXJyZW50U2hvcCI6bnVsbCwibWFzdGVyU2hvcCI6bnVsbCwicGVybWlzc2lvbnMiOnt9LCJpYXQiOjE3NTM4MzUxNzMsImV4cCI6MTc1NDQzOTk3M30.FdwuAlzIAoztvemi3rfQPwGPg5ncpmpS4jo-68ALmP8"
    }
}

### API Documentation for Retail360 System (62 Endpoints)

---

#### **1. POST /api/afia/chat**  
**Description**: AI-powered chat endpoint for business intelligence queries  
**Request Body**:  
```json
{
  "userQuestion": "Show sales summary for last week",
  "userId": "65d8f8a5b4d6f8a5b4d6f8a5",
  "shopId": "65d8f8a5b4d6f8a5b4d6f8a5"
}
```
**Response**:  
```json
{
  "success": true,
  "response": "Last week's sales: Total $5,200 across 42 transactions",
  "functionCalls": [
    "getSales(shopId, startDate, endDate)"
  ]
}
```

---

#### **2. GET /api/afia/test**  
**Description**: System health and integration test endpoint  
**Response**:  
```json
{
  "success": true,
  "status": "success",
  "details": {
    "database": "connected",
    "aiService": "operational",
    "version": "2.3.1"
  }
}
```

---

#### **3. POST /api/auth/register**  
**Description**: Register a new user  
**Request Body**:  
```json
{
  "name": "Kofi Mensah",
  "email": "kofi@example.com",
  "phone": "+233201234567",
  "password": "SecurePass123!"
}
```
**Response**:  
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "65d8f8a5b4d6f8a5b4d6f8a5",
      "name": "Kofi Mensah",
      "email": "kofi@example.com",
      "phone": "+233201234567",
      "role": "owner"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

#### **4. POST /api/auth/login**  
**Description**: Authenticate user  
**Request Body**:  
```json
{
  "email": "kofi@example.com",
  "password": "SecurePass123!"
}
```
**Response**:  
```json


{
  "success": true,
  "data": {
    "user": {
      "id": "65d8f8a5b4d6f8a5b4d6f8a5",
      "name": "Kofi Mensah",
      "shops": [
        {
          "shopId": "65d8f8a5b4d6f8a5b4d6f8a6",
          "shopName": "Mensah Supermarket",
          "role": "owner",
          "permissions": {
            "inventory": ["create","read","update","delete"],
            "sales": ["create","read","update","delete"]
          }
        }
      ],
      "currentShop": "65d8f8a5b4d6f8a5b4d6f8a6"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

#### **5. POST /api/shops**  
**Description**: Create a new shop  
**Request Body**:  
```json
{
  "userId": "65d8f8a5b4d6f8a5b4d6f8a5",
  "name": "Mensah Supermarket",
  "address": {
    "street": "123 Main St",
    "city": "Accra"
  },
  "phone": "+233302123456",
  "setAsMaster": true
}
```
**Response**:  
```json
{
  "success": true,
  "data": {
    "_id": "65d8f8a5b4d6f8a5b4d6f8a6",
    "name": "Mensah Supermarket",
    "shopLevel": "master",
    "owner": "65d8f8a5b4d6f8a5b4d6f8a5"
  }
}
```

---

#### **6. PUT /api/users/:userId/master-shop**  
**Description**: Set user's master shop  
**Request Body**:  
```json
{
  "shopId": "65d8f8a5b4d6f8a5b4d6f8a6"
}
```
**Response**:  
```json
{
  "success": true,
  "data": {
    "_id": "65d8f8a5b4d6f8a5b4d6f8a6",
    "name": "Mensah Supermarket",
    "shopLevel": "master"
  }
}
```

---

#### **7. POST /api/shops/:shopId/connect-to-master**  
**Description**: Connect shop to master shop  
**Request Body**:  
```json
{
  "masterShopId": "65d8f8a5b4d6f8a5b4d6f8a6",
  "connectionType": "branch",
  "financialSettings": {
    "shareRevenue": true
  }
}
```
**Response**:  
```json
{
  "success": true,
  "data": {
    "shop": {
      "masterShop": "65d8f8a5b4d6f8a5b4d6f8a6",
      "shopLevel": "branch"
    },
    "masterShop": {
      "connectedShops": ["65d8f8a5b4d6f8a5b4d6f8a7"]
    }
  }
}
```

---

#### **8. GET /api/users/:userId/master-shop-network**  
**Response**:  
```json
{
  "success": true,
  "data": {
    "masterShop": {
      "_id": "65d8f8a5b4d6f8a5b4d6f8a6",
      "name": "Mensah Supermarket",
      "connectedShops": [
        {
          "shopId": "65d8f8a5b4d6f8a5b4d6f8a7",
          "name": "Osu Branch"
        }
      ]
    }
  }
}
```

---

#### **9. GET /api/users/:userId/consolidated-financial-report**  
**Response**:  
```json
{
  "success": true,
  "data": {
    "masterShop": "65d8f8a5b4d6f8a5b4d6f8a6",
    "totalShops": 3,
    "totalRevenue": 15200,
    "totalExpenses": 8200,
    "totalDebt": 1200,
    "netProfit": 7000
  }
}
```

---

#### **10. GET /api/shops/:shopId**  
**Response**:  
```json
{
  "success": true,
  "data": {
    "_id": "65d8f8a5b4d6f8a5b4d6f8a6",
    "name": "Mensah Supermarket",
    "owner": {
      "name": "Kofi Mensah",
      "email": "kofi@example.com"
    },
    "financials": {
      "totalRevenue": 8500
    }
  }
}
```

---

#### **11. PUT /api/shops/:shopId**  
**Description**: Update shop details  
**Request Body**:  
```json
{
  "description": "Main flagship store",
  "settings": {
    "taxRate": 12.5
  }
}
```
**Response**:  
```json
{
  "success": true,
  "data": {
    "_id": "65d8f8a5b4d6f8a5b4d6f8a6",
    "description": "Main flagship store",
    "settings": {
      "taxRate": 12.5
    }
  }
}
```

---

#### **12. DELETE /api/shops/:shopId**  
**Request Body**:  
```json
{
  "userId": "65d8f8a5b4d6f8a5b4d6f8a5"
}
```
**Response**:  
```json
{
  "success": true,
  "data": {
    "success": true
  }
}
```

---

#### **13. GET /api/users/:userId/shops**  
**Response**:  
```json
{
  "success": true,
  "data": {
    "userId": "65d8f8a5b4d6f8a5b4d6f8a5",
    "currentShop": "65d8f8a5b4d6f8a5b4d6f8a6",
    "shops": [
      {
        "shopId": "65d8f8a5b4d6f8a5b4d6f8a6",
        "name": "Mensah Supermarket",
        "role": "owner"
      }
    ]
  }
}
```

---

#### **14. PUT /api/users/:userId/switch/current-shop**  
**Description**: Set current active shop  
**Request Body**:  
```json
{
  "shopId": "65d8f8a5b4d6f8a5b4d6f8a7"
}
```
**Response**:  
```json
{
  "success": true,
  "data": {
    "currentShop": "65d8f8a5b4d6f8a5b4d6f8a7",
    "role": "manager",
    "permissions": {
      "sales": ["create","read"],
      "inventory": ["read"]
    }
  }
}
```

---

#### **15. GET /api/users/:userId/current-shop**  
**Response**:  
```json
{
  "success": true,
  "data": {
    "currentShop": "65d8f8a5b4d6f8a5b4d6f8a7"
  }
}
```

---

#### **16. GET /api/shops/:shopId/stats**  
**Response**:  
```json
{
  "success": true,
  "data": {
    "totalSales": 142,
    "dailySales": 8,
    "totalProducts": 256,
    "totalCustomers": 89,
    "stockMovements": 42
  }
}
```

---

#### **17. GET /api/permissions/available**  
**Response**:  
```json
{
  "success": true,
  "data": {
    "inventory": {
      "name": "Inventory Management",
      "actions": ["create","read","update","delete"]
    },
    "sales": {
      "name": "Sales Management",
      "actions": ["create","read","update","delete"]
    }
  }
}
```

---

#### **18. POST /api/staff/register**  
**Description**: Register staff member  
**Request Body**:  
```json
{
  "registeredByUserId": "65d8f8a5b4d6f8a5b4d6f8a5",
  "name": "Ama Boateng",
  "email": "ama@example.com",
  "phone": "+233244556677",
  "password": "StaffPass123",
  "shopId": "65d8f8a5b4d6f8a5b4d6f8a6",
  "role": "staff"
}
```
**Response**:  
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "65d8f8a5b4d6f8a5b4d6f8a8",
      "name": "Ama Boateng",
      "role": "staff",
      "permissions": {
        "sales": ["create","read"],
        "inventory": ["read"]
      }
    }
  }
}
```

---

#### **19. PUT /api/staff/:targetUserId/role-permissions**  
**Description**: Update staff permissions  
**Request Body**:  
```json
{
  "updatedByUserId": "65d8f8a5b4d6f8a5b4d6f8a5",
  "shopId": "65d8f8a5b4d6f8a5b4d6f8a6",
  "role": "manager",
  "permissions": {
    "inventory": ["create","read","update"],
    "reports": ["read"]
  }
}
```
**Response**:  
```json
{
  "success": true,
  "data": {
    "userId": "65d8f8a5b4d6f8a5b4d6f8a8",
    "shopId": "65d8f8a5b4d6f8a5b4d6f8a6",
    "role": "manager",
    "permissions": {
      "inventory": ["create","read","update"],
      "reports": ["read"]
    }
  }
}
```

---

#### **20. GET /api/shops/:shopId/staff**  
**Query Params**: `requestingUserId=65d8f8a5b4d6f8a5b4d6f8a5`  
**Response**:  
```json
{
  "success": true,
  "data": [
    {
      "id": "65d8f8a5b4d6f8a5b4d6f8a8",
      "name": "Ama Boateng",
      "role": "manager",
      "permissions": {
        "inventory": ["create","read","update"],
        "reports": ["read"]
      },
      "joinedAt": "2023-10-15T08:30:00Z"
    }
  ]
}
```

---

#### **21. DELETE /api/shops/:shopId/staff/:targetUserId**  
**Request Body**:  
```json
{
  "removedByUserId": "65d8f8a5b4d6f8a5b4d6f8a5"
}
```
**Response**:  
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Staff removed successfully"
  }
}
```

---

#### **22. GET /api/users/:userId/shops/:shopId/permissions**  
**Response**:  
```json
{
  "success": true,
  "data": {
    "role": "manager",
    "permissions": {
      "inventory": ["create","read","update"],
      "reports": ["read"]
    }
  }
}
```

---

#### **23. POST /api/categories/:categoryId/products/:productId**  
**Response**:  
```json
{
  "success": true,
  "data": {
    "_id": "65d8f8a5b4d6f8a5b4d6f8b1",
    "name": "Beverages",
    "products": ["65d8f8a5b4d6f8a5b4d6f8c1"]
  }
}
```

---

#### **24. DELETE /api/categories/:categoryId/products/:productId**  
**Response**:  
```json
{
  "success": true,
  "data": {
    "_id": "65d8f8a5b4d6f8a5b4d6f8b1",
    "name": "Beverages",
    "products": []
  }
}
```

---

#### **25. POST /api/categories**  
**Request Body**:  
```json
{
  "name": "Dairy",
  "shopId": "65d8f8a5b4d6f8a5b4d6f8a6"
}
```
**Response**:  
```json
{
  "success": true,
  "data": {
    "_id": "65d8f8a5b4d6f8a5b4d6f8b2",
    "name": "Dairy",
    "shopId": "65d8f8a5b4d6f8a5b4d6f8a6"
  }
}
```

---

#### **26. GET /api/categories/shop/:shopId**  
**Response**:  
```json
{
  "success": true,
  "data": [
    {
      "_id": "65d8f8a5b4d6f8a5b4d6f8b1",
      "name": "Beverages"
    },
    {
      "_id": "65d8f8a5b4d6f8a5b4d6f8b2",
      "name": "Dairy"
    }
  ]
}
```

---

#### **27. GET /api/categories/:categoryId**  
**Response**:  
```json
{
  "success": true,
  "data": {
    "_id": "65d8f8a5b4d6f8a5b4d6f8b1",
    "name": "Beverages",
    "shopId": {
      "_id": "65d8f8a5b4d6f8a5b4d6f8a6",
      "name": "Mensah Supermarket"
    }
  }
}
```

---

#### **28. PUT /api/categories/:categoryId**  
**Request Body**:  
```json
{
  "description": "All beverage products"
}
```
**Response**:  
```json
{
  "success": true,
  "data": {
    "_id": "65d8f8a5b4d6f8a5b4d6f8b1",
    "description": "All beverage products"
  }
}
```

---

#### **29. DELETE /api/categories/:categoryId**  
**Response**:  
```json
{
  "success": true,
  "data": {
    "_id": "65d8f8a5b4d6f8a5b4d6f8b2",
    "isActive": false
  }
}
```

---

#### **30. GET /api/categories/:categoryId/products**  
**Response**:  
```json
{
  "success": true,
  "data": [
    {
      "_id": "65d8f8a5b4d6f8a5b4d6f8c1",
      "name": "Coca-Cola 500ml"
    }
  ]
}
```

---

#### **31. GET /api/categories/shop/:shopId/hierarchy**  
**Response**:  
```json
{
  "success": true,
  "data": [
    {
      "_id": "65d8f8a5b4d6f8a5b4d6f8b1",
      "name": "Beverages",
      "children": [
        {
          "_id": "65d8f8a5b4d6f8a5b4d6f8b3",
          "name": "Soft Drinks"
        }
      ]
    }
  ]
}
```

---



#### **32. POST /api/products**  
**Request Body**:  
```json
{
  "name": "Fanice Chocolate",
  "category": "65d8f8a5b4d6f8a5b4d6f8b2",
  "shopId": "65d8f8a5b4d6f8a5b4d6f8a6",
  "pricing": {
    "costPrice": 2.5,
    "sellingPrice": 3.5
  },
  "stock": {
    "currentQuantity": 50,
    "minQuantity": 10
  }
}
```
**Response**:  
```json
{
  "success": true,
  "data": {
    "_id": "65d8f8a5b4d6f8a5b4d6f8c2",
    "name": "Fanice Chocolate",
    "sku": "DAIFAN001",
    "qrCodeImage": "data:image/png;base64,iVBORw0KGgo..."
  }
}
```

---

#### **33. GET /api/products/shop/:shopId**  
**Query Params**: `search=chocolate&lowStock=true`  
**Response**:  
```json
{
  "success": true,
  "data": [
    {
      "_id": "65d8f8a5b4d6f8a5b4d6f8c2",
      "name": "Fanice Chocolate",
      "stock": {
        "currentQuantity": 8,
        "minQuantity": 10
      }
    }
  ]
}
```

---

#### **34. GET /api/products/qr/:qrCode**  
**Query Params**: `shopId=65d8f8a5b4d6f8a5b4d6f8a6`  
**Response**:  
```json
{
  "success": true,
  "data": {
    "_id": "65d8f8a5b4d6f8a5b4d6f8c2",
    "name": "Fanice Chocolate",
    "pricing": {
      "sellingPrice": 3.5
    }
  }
}
```

---

#### **35. PUT /api/products/:productId**  
**Request Body**:  
```json
{
  "pricing": {
    "sellingPrice": 3.75
  }
}
```
**Response**:  
```json
{
  "success": true,
  "data": {
    "_id": "65d8f8a5b4d6f8a5b4d6f8c2",
    "pricing": {
      "sellingPrice": 3.75
    }
  }
}
```

---

#### **36. DELETE /api/products/:productId**  
**Response**:  
```json
{
  "success": true,
  "data": {
    "_id": "65d8f8a5b4d6f8a5b4d6f8c2",
    "isActive": false
  }
}
```

---

#### **37. GET /api/products/shop/:shopId/low-stock**  
**Response**:  
```json
{
  "success": true,
  "data": [
    {
      "_id": "65d8f8a5b4d6f8a5b4d6f8c2",
      "name": "Fanice Chocolate",
      "currentQuantity": 8,
      "minQuantity": 10
    }
  ]
}
```

---

#### **38. POST /api/sales**  
**Request Body**:  
```json
{
  "shopId": "65d8f8a5b4d6f8a5b4d6f8a6",
  "cashier": "65d8f8a5b4d6f8a5b4d6f8a8",
  "items": [
    {
      "product": "65d8f8a5b4d6f8a5b4d6f8c2",
      "quantity": 2,
      "unitPrice": 3.75
    }
  ],
  "payment": {
    "method": "cash"
  }
}
```
**Response**:  
```json
{
  "success": true,
  "data": {
    "_id": "65d8f8a5b4d6f8a5b4d6f8d1",
    "saleNumber": "SALE_1234",
    "totals": {
      "total": 7.50
    }
  }
}
```

---

#### **39. GET /api/sales/shop/:shopId**  
**Query Params**: `startDate=2023-10-01&endDate=2023-10-31`  
**Response**:  
```json
{
  "success": true,
  "data": [
    {
      "_id": "65d8f8a5b4d6f8a5b4d6f8d1",
      "saleNumber": "SALE_1234",
      "createdAt": "2023-10-15T10:30:00Z"
    }
  ]
}
```

---

#### **40. GET /api/sales/:saleId**  
**Response**:  
```json
{
  "success": true,
  "data": {
    "_id": "65d8f8a5b4d6f8a5b4d6f8d1",
    "items": [
      {
        "product": {
          "name": "Fanice Chocolate"
        },
        "quantity": 2,
        "totalPrice": 7.50
      }
    ],
    "cashier": {
      "name": "Ama Boateng"
    }
  }
}
```

---

#### **41. POST /api/sales/:saleId/refund**  
**Request Body**:  
```json
{
  "reason": "Customer changed mind",
  "processedBy": "65d8f8a5b4d6f8a5b4d6f8a5"
}
```
**Response**:  
```json
{
  "success": true,
  "data": {
    "_id": "65d8f8a5b4d6f8a5b4d6f8d1",
    "payment": {
      "status": "refunded"
    }
  }
}
```

---

#### **42. POST /api/customers**  
**Request Body**:  
```json
{
  "name": "Kwame Asante",
  "phone": "+233501234567",
  "shopId": "65d8f8a5b4d6f8a5b4d6f8a6"
}
```
**Response**:  
```json
{
  "success": true,
  "data": {
    "_id": "65d8f8a5b4d6f8a5b4d6f8e1",
    "name": "Kwame Asante",
    "loyalty": {
      "points": 0
    }
  }
}
```

---

#### **43. GET /api/customers/shop/:shopId**  
**Query Params**: `search=Kwame`  
**Response**:  
```json
{
  "success": true,
  "data": [
    {
      "_id": "65d8f8a5b4d6f8a5b4d6f8e1",
      "name": "Kwame Asante",
      "phone": "+233501234567"
    }
  ]
}
```

---

#### **44. GET /api/customers/phone/:phone**  
**Query Params**: `shopId=65d8f8a5b4d6f8a5b4d6f8a6`  
**Response**:  
```json
{
  "success": true,
  "data": {
    "_id": "65d8f8a5b4d6f8a5b4d6f8e1",
    "name": "Kwame Asante",
    "loyalty": {
      "points": 35
    }
  }
}
```

---

#### **45. PUT /api/customers/:customerId**  
**Request Body**:  
```json
{
  "address": {
    "city": "Kumasi"
  }
}
```
**Response**:  
```json
{
  "success": true,
  "data": {
    "_id": "65d8f8a5b4d6f8a5b4d6f8e1",
    "address": {
      "city": "Kumasi"
    }
  }
}
```

---

#### **46. POST /api/customers/:customerId/loyalty**  
**Request Body**:  
```json
{
  "points": 15,
  "totalSpent": 75
}
```
**Response**:  
```json
{
  "success": true,
  "data": {
    "_id": "65d8f8a5b4d6f8a5b4d6f8e1",
    "loyalty": {
      "points": 50,
      "membershipTier": "silver"
    }
  }
}
```

---

#### **47. POST /api/stock/movements**  
**Request Body**:  
```json
{
  "product": "65d8f8a5b4d6f8a5b4d6f8c2",
  "shopId": "65d8f8a5b4d6f8a5b4d6f8a6",
  "type": "in",
  "quantity": 20,
  "reason": "purchase"
}
```
**Response**:  
```json
{
  "success": true,
  "data": {
    "_id": "65d8f8a5b4d6f8a5b4d6f8f1",
    "newQuantity": 28
  }
}
```

---

#### **48. GET /api/stock/movements/:productId**  
**Query Params**: `limit=10`  
**Response**:  
```json
{
  "success": true,
  "data": [
    {
      "type": "in",
      "quantity": 20,
      "createdAt": "2023-10-16T09:15:00Z"
    }
  ]
}
```

---

#### **49. POST /api/stock/adjust/:productId**  
**Request Body**:  
```json
{
  "quantity": -5,
  "reason": "damage",
  "notes": "Broken during transport"
}
```
**Response**:  
```json
{
  "success": true,
  "data": {
    "_id": "65d8f8a5b4d6f8a5b4d6f8c2",
    "stock": {
      "currentQuantity": 23
    }
  }
}
```

---

#### **50. POST /api/suppliers**  
**Request Body**:  
```json
{
  "name": "Ghana Foods Ltd",
  "contactPerson": "Yaw Boateng",
  "phone": "+233302765432",
  "shopId": "65d8f8a5b4d6f8a5b4d6f8a6"
}
```
**Response**:  
```json
{
  "success": true,
  "data": {
    "_id": "65d8f8a5b4d6f8a5b4d6f8g1",
    "name": "Ghana Foods Ltd"
  }
}
```

---

#### **51. GET /api/suppliers/shop/:shopId**  
**Response**:  
```json
{
  "success": true,
  "data": [
    {
      "_id": "65d8f8a5b4d6f8a5b4d6f8g1",
      "name": "Ghana Foods Ltd",
      "rating": 4
    }
  ]
}
```

---

#### **52. PUT /api/suppliers/:supplierId**  
**Request Body**:  
```json
{
  "paymentTerms": "credit-14"
}
```
**Response**:  
```json
{
  "success": true,
  "data": {
    "_id": "65d8f8a5b4d6f8a5b4d6f8g1",
    "paymentTerms": "credit-14"
  }
}
```

---

#### **53. GET /api/analytics/daily-report/:shopId**  
**Query Params**: `date=2023-10-15`  
**Response**:  
```json
{
  "success": true,
  "data": {
    "date": "2023-10-15",
    "sales": {
      "totalRevenue": 2850
    },
    "products": {
      "lowStockProducts": 3
    }
  }
}
```

---

#### **54. GET /api/dashboard/:shopId**  
**Response**:  
```json
{
  "success": true,
  "data": {
    "todayStats": {
      "revenue": 850
    },
    "inventory": {
      "lowStockCount": 3
    },
    "lowStockProducts": [
      {
        "name": "Fanice Chocolate",
        "currentQuantity": 8
      }
    ]
  }
}
```

---

#### **55. POST /api/notifications**  
**Request Body**:  
```json
{
  "shopId": "65d8f8a5b4d6f8a5b4d6f8a6",
  "type": "low-stock",
  "title": "Low Stock Alert",
  "message": "5 products below minimum stock"
}
```
**Response**:  
```json
{
  "success": true,
  "data": {
    "_id": "65d8f8a5b4d6f8a5b4d6f8h1",
    "title": "Low Stock Alert"
  }
}
```

---

#### **56. GET /api/notifications/shop/:shopId**  
**Query Params**: `unreadOnly=true`  
**Response**:  
```json
{
  "success": true,
  "data": [
    {
      "_id": "65d8f8a5b4d6f8a5b4d6f8h1",
      "title": "Low Stock Alert",
      "isRead": false
    }
  ]
}
```

---

#### **57. PUT /api/notifications/:notificationId/read**  
**Response**:  
```json
{
  "success": true,
  "data": {
    "_id": "65d8f8a5b4d6f8a5b4d6f8h1",
    "isRead": true
  }
}
```

---

#### **58. POST /api/discounts**  
**Request Body**:  
```json
{
  "name": "October Promo",
  "code": "OCT10",
  "shopId": "65d8f8a5b4d6f8a5b4d6f8a6",
  "type": "percentage",
  "value": 10,
  "startDate": "2023-10-01",
  "endDate": "2023-10-31"
}
```
**Response**:  
```json
{
  "success": true,
  "data": {
    "_id": "65d8f8a5b4d6f8a5b4d6f8i1",
    "code": "OCT10"
  }
}
```

---

#### **59. GET /api/discounts/shop/:shopId/active**  
**Response**:  
```json
{
  "success": true,
  "data": [
    {
      "_id": "65d8f8a5b4d6f8a5b4d6f8i1",
      "name": "October Promo",
      "value": 10
    }
  ]
}
```

---

#### **60. POST /api/cross-shop-transactions**  
**Request Body**:  
```json
{
  "fromShop": "65d8f8a5b4d6f8a5b4d6f8a7",
  "toShop": "65d8f8a5b4d6f8a5b4d6f8a6",
  "user": "65d8f8a5b4d6f8a5b4d6f8a5",
  "transactionType": "payment",
  "amount": 500,
  "description": "Monthly revenue share"
}
```
**Response**:  
```json
{
  "success": true,
  "data": {
    "_id": "65d8f8a5b4d6f8a5b4d6f8j1",
    "amount": 500
  }
}
```

---

#### **61. POST /api/tasks/daily**  
**Response**:  
```json
{
  "success": true,
  "message": "Daily tasks executed"
}
```

---

#### **62. GET /**  
**Description**: Health check endpoint  
**Response**: `Retail360 API is running`

---

### Key Features:
1. **Master Shop Architecture**: Hierarchical shop management
2. **Granular Permissions**: Module-based CRUD permissions
3. **QR Code Integration**: Product scanning and management
4. **Cross-Shop Transactions**: Financial operations between shops
5. **Automated Reporting**: Daily sales and inventory reports
6. **AI Business Assistant**: Natural language data queries

All endpoints require JWT authentication in the `Authorization` header except:  
- `/api/auth/register` 
- `/api/auth/login`
- `/` (health check)