# Retail360 API Documentation

## Base URL
`http:///api`

## Authentication Endpoints

### Register User
```http
POST https://retail360-backend.vercel.app/api/auth/register
```

**Request Body:**
```json
{
  "name": "Kwame Mensah",
  "email": "kwame@example.com",
  "phone": "+233245678901",
  "password": "securePassword123",
  "role": "owner"
}

```

**Response:**
```json
{
    "success": true,
    "data": {
        "user": {
            "id": "688909a668a76ad1ab0d02dc",
            "name": "Kwame Mensah",
            "email": "kwame@example.com",
            "phone": "+233245678901",
            "role": "owner"
        },
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODg5MDlhNjY4YTc2YWQxYWIwZDAyZGMiLCJyb2xlIjoib3duZXIiLCJpYXQiOjE3NTM4MTEzNjcsImV4cCI6MTc1NDQxNjE2N30.XK1Wwdo5-2gP7jeR2PVobu2LfK4keKlxalordfGVpBg"
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

  "email": "kwame@example.com",

  "password": "securePassword123"
  
}

```

**Response:**
```json
{
    "success": true,
    "data": {
        "user": {
            "id": "688909a668a76ad1ab0d02dc",
            "name": "Kwame Mensah",
            "email": "kwame@example.com",
            "role": "owner",
            "shops": [],
            "ownedShops": [],
            "currentShop": null,
            "masterShop": null,
            "totalDebt": 0
        },
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODg5MDlhNjY4YTc2YWQxYWIwZDAyZGMiLCJyb2xlIjoib3duZXIiLCJjdXJyZW50U2hvcCI6bnVsbCwibWFzdGVyU2hvcCI6bnVsbCwiaWF0IjoxNzUzODExNDY3LCJleHAiOjE3NTQ0MTYyNjd9.aEdn7Lhnicx0W3pzXHoThiE-fFUE0bJgBrA_Ip-GrnU"
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
  "name": "Adom Supermarket",
  "description": "A neighborhood supermarket offering groceries, toiletries, and household items.",
  "address": {
    "street": "123 Kwame Nkrumah Ave",
    "city": "Kumasi",
    "region": "Ashanti",
    "country": "Ghana"
  },
  "phone": "+233245678901",
  "email": "contact@adomsupermarket.com",
  "businessType": "supermarket",
  "currency": "GHS",
  "subscriptionPlan": "pro",
  "settings": {
    "enableLoyaltyProgram": true,
    "enableWhatsAppReports": true,
    "enableSMSReceipts": false,
    "autoBackup": true,
    "lowStockThreshold": 5,
    "receiptTemplate": "Thank you for shopping with us!",
    "taxRate": 12.5,
    "consolidateReports": true,
    "shareInventoryWithMaster": false,
    "allowMasterShopAccess": true
  },
  "userId": "688909a668a76ad1ab0d02dc"
}

```

**Response:**
```json
{
    "success": true,
    "data": {
        "name": "Adom Supermarket",
        "description": "A neighborhood supermarket offering groceries, toiletries, and household items.",
        "address": {
            "street": "123 Kwame Nkrumah Ave",
            "city": "Kumasi",
            "region": "Ashanti",
            "country": "Ghana"
        },
        "phone": "+233245678901",
        "email": "contact@adomsupermarket.com",
        "owner": "688909a668a76ad1ab0d02dc",
        "masterShop": null,
        "shopLevel": "master",
        "users": [
            {
                "userId": "688909a668a76ad1ab0d02dc",
                "role": "owner",
                "permissions": [
                    "inventory",
                    "sales",
                    "reports",
                    "settings",
                    "users"
                ],
                "isActive": true,
                "_id": "68890bdab81ee33fb97e3176",
                "addedAt": "2025-07-29T17:58:50.952Z"
            }
        ],
        "businessType": "supermarket",
        "currency": "GHS",
        "subscriptionPlan": "pro",
        "financials": {
            "totalRevenue": 0,
            "totalExpenses": 0,
            "totalDebt": 0,
            "interShopTransactions": []
        },
        "settings": {
            "enableLoyaltyProgram": true,
            "enableWhatsAppReports": true,
            "enableSMSReceipts": false,
            "autoBackup": true,
            "lowStockThreshold": 5,
            "receiptTemplate": "Thank you for shopping with us!",
            "taxRate": 12.5,
            "consolidateReports": true,
            "shareInventoryWithMaster": false,
            "allowMasterShopAccess": true
        },
        "isActive": true,
        "_id": "68890bdab81ee33fb97e3175",
        "connectedShops": [],
        "subscriptionExpiry": "2025-08-28T17:58:50.954Z",
        "createdAt": "2025-07-29T17:58:50.960Z",
        "updatedAt": "2025-07-29T17:58:51.093Z",
        "__v": 0
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
  "shopId":"68890bdab81ee33fb97e3175"
}

```

**Response:**
```json
{
    "success": true,
    "data": {
        "address": {
            "street": "123 Kwame Nkrumah Ave",
            "city": "Kumasi",
            "region": "Ashanti",
            "country": "Ghana"
        },
        "financials": {
            "totalRevenue": 0,
            "totalExpenses": 0,
            "totalDebt": 0,
            "interShopTransactions": []
        },
        "settings": {
            "enableLoyaltyProgram": true,
            "enableWhatsAppReports": true,
            "enableSMSReceipts": false,
            "autoBackup": true,
            "lowStockThreshold": 5,
            "receiptTemplate": "Thank you for shopping with us!",
            "taxRate": 12.5,
            "consolidateReports": true,
            "shareInventoryWithMaster": false,
            "allowMasterShopAccess": true
        },
        "_id": "68890bdab81ee33fb97e3175",
        "name": "Adom Supermarket",
        "description": "A neighborhood supermarket offering groceries, toiletries, and household items.",
        "phone": "+233245678901",
        "email": "contact@adomsupermarket.com",
        "owner": "688909a668a76ad1ab0d02dc",
        "masterShop": null,
        "shopLevel": "master",
        "users": [
            {
                "userId": "688909a668a76ad1ab0d02dc",
                "role": "owner",
                "permissions": [
                    "inventory",
                    "sales",
                    "reports",
                    "settings",
                    "users"
                ],
                "isActive": true,
                "_id": "68890bdab81ee33fb97e3176",
                "addedAt": "2025-07-29T17:58:50.952Z"
            }
        ],
        "businessType": "supermarket",
        "currency": "GHS",
        "subscriptionPlan": "pro",
        "isActive": true,
        "connectedShops": [],
        "subscriptionExpiry": "2025-08-28T17:58:50.954Z",
        "createdAt": "2025-07-29T17:58:50.960Z",
        "updatedAt": "2025-07-29T17:58:51.093Z",
        "__v": 0
    }
}


---

## 📌 1. Create a Shop

**POST** `/api/shops`

### ✅ Request

```json
{
  "userId": "64aabcde1234567890abcd12",
  "setAsMaster": true,
  "name": "Kumasi Supermart",
  "description": "A large retail supermarket in Kumasi",
  "address": {
    "street": "Tech Road",
    "city": "Kumasi",
    "region": "Ashanti",
    "country": "Ghana"
  },
  "phone": "+233502345678",
  "email": "info@kumasisupermart.com",
  "businessType": "supermarket",
  "currency": "GHS",
  "subscriptionPlan": "pro"
}
```

### ✅ Response

```json
{
  "success": true,
  "data": {
    "_id": "64ee23ab9988123456abc123",
    "name": "Kumasi Supermart",
    "shopLevel": "master",
    "owner": "64aabcde1234567890abcd12",
    "isActive": true,
    ...
  }
}
```

---

## 📌 2. Set Master Shop

**PUT** `/api/users/:userId/master-shop`

### ✅ Request

```json
{
  "shopId": "64ee23ab9988123456abc123"
}
```

### ✅ Response

```json
{
  "success": true,
  "data": {
    "_id": "64ee23ab9988123456abc123",
    "shopLevel": "master"
  }
}
```

---

## 📌 3. Connect Shop to Master

**POST** `/api/shops/:shopId/connect-to-master`

### ✅ Request

```json
{
  "masterShopId": "64ee23ab9988123456abc123",
  "connectionType": "branch",
  "financialSettings": {
    "shareRevenue": true,
    "consolidateReports": true,
    "sharedInventory": false
  }
}
```

### ✅ Response

```json
{
  "success": true,
  "data": {
    "shop": {
      "_id": "64ef22cd456123abcde78912",
      "shopLevel": "branch",
      "masterShop": "64ee23ab9988123456abc123"
    },
    "masterShop": {
      "_id": "64ee23ab9988123456abc123",
      "connectedShops": [
        {
          "shopId": "64ef22cd456123abcde78912",
          "connectionType": "branch",
          "financialSettings": {
            "shareRevenue": true,
            "consolidateReports": true,
            "sharedInventory": false
          }
        }
      ]
    }
  }
}
```

---

## 📌 4. Get Master Shop Network

**GET** `/api/users/:userId/master-shop-network`

### ✅ Response

```json
{
  "success": true,
  "data": {
    "masterShop": {
      "_id": "64ee23ab9988123456abc123",
      "name": "Kumasi Supermart"
    },
    "connectedShops": [
      {
        "shopId": {
          "_id": "64ef22cd456123abcde78912",
          "name": "Kejatia Mini Mart",
          "email": "contact@kejatia.com"
        },
        "connectionType": "branch",
        "isActive": true
      }
    ]
  }
}
```

---

## 📌 5. Get Consolidated Financial Report

**GET** `/api/users/:userId/consolidated-financial-report`

### ✅ Response

```json
{
  "success": true,
  "data": {
    "masterShop": "64ee23ab9988123456abc123",
    "totalShops": 3,
    "totalRevenue": 180000,
    "totalExpenses": 40000,
    "totalDebt": 10000,
    "netProfit": 140000
  }
}
```

---

## 📌 6. Get a Shop

**GET** `/api/shops/:shopId`

### ✅ Response

```json
{
  "success": true,
  "data": {
    "_id": "64ef22cd456123abcde78912",
    "name": "Kejatia Mini Mart",
    "owner": {
      "_id": "64aabcde1234567890abcd12",
      "name": "Kwame Owusu",
      "email": "kwame@domain.com"
    },
    "users": [
      {
        "userId": {
          "_id": "64aabcde1234567890abcd12",
          "name": "Kwame Owusu",
          "email": "kwame@domain.com"
        },
        "role": "owner",
        "permissions": ["inventory", "sales", "reports", "settings", "users"]
      }
    ],
    "masterShop": {
      "_id": "64ee23ab9988123456abc123",
      "name": "Kumasi Supermart"
    }
  }
}
```

---

## 📌 7. Delete Shop

**DELETE** `/api/shops/:shopId`

### ✅ Request

```json
{
  "userId": "64aabcde1234567890abcd12"
}
```

### ✅ Response

```json
{
  "success": true,
  "data": {
    "success": true
  }
}
```

---

## 📌 8. Get User Shops

**GET** `/api/users/:userId/shops`

### ✅ Response

```json
{
  "success": true,
  "data": {
    "userId": "64aabcde1234567890abcd12",
    "currentShop": {
      "_id": "64ef22cd456123abcde78912",
      "name": "Kejatia Mini Mart"
    },
    "masterShop": {
      "_id": "64ee23ab9988123456abc123",
      "name": "Kumasi Supermart"
    },
    "shops": [
      {
        "shopId": {
          "_id": "64ef22cd456123abcde78912",
          "name": "Kejatia Mini Mart",
          "address": {
            "street": "Station Rd",
            "city": "Kumasi"
          },
          "phone": "+233500000000",
          "email": "kejatia@domain.com"
        },
        "role": "owner",
        "permissions": ["inventory", "sales"],
        "isActive": true
      }
    ]
  }
}
```

---

## 📌 9. Set Current Shop

**PUT** `/api/users/:userId/current-shop`

### ✅ Request

```json
{
  "shopId": "64ef22cd456123abcde78912"
}
```

### ✅ Response

```json
{
  "success": true,
  "data": {
    "_id": "64ef22cd456123abcde78912",
    "name": "Kejatia Mini Mart"
  }
}
```

---

## 📌 10. Get Shop Stats

**GET** `/api/shops/:shopId/stats`

### ✅ Response

```json
{
  "success": true,
  "data": {
    "totalSales": 300,
    "dailySales": 20,
    "totalProducts": 120,
    "totalCustomers": 80,
    "stockMovements": 45
  }
}
```

information needed such as 

**Response:**
```json
{
    "success": true,
    "data": {
        "user": {
            "id": "688909a668a76ad1ab0d02dc",
            "name": "Kwame Mensah",
            "email": "kwame@example.com",
            "role": "owner",
            "shops": [],
            "ownedShops": [],
            "currentShop": null,
            "masterShop": null,
            "totalDebt": 0
        },
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODg5MDlhNjY4YTc2YWQxYWIwZDAyZGMiLCJyb2xlIjoib3duZXIiLCJjdXJyZW50U2hvcCI6bnVsbCwibWFzdGVyU2hvcCI6bnVsbCwiaWF0IjoxNzUzODExNDY3LCJleHAiOjE3NTQ0MTYyNjd9.aEdn7Lhnicx0W3pzXHoThiE-fFUE0bJgBrA_Ip-GrnU"
    }
}
```
is saved in localstorage so use them when needed for requests
  // Store user data and token in localStorage
      localStorage.setItem('authToken', data.data.token);
      localStorage.setItem('userData', JSON.stringify(data.data.user));