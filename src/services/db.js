import Dexie from 'dexie';

/**
 * Local Database Configuration using Dexie.js
 */
export const db = new Dexie('POS_Offline_DB');

db.version(2).stores({
  products: 'id, name, barcode, categoryId',
  customers: 'id, name, phone',
  branches: 'id, name',
  warehouses: 'id, name, branchId',
  offlineSales: '++id, status, timestamp',
  settings: 'key'
}).upgrade(tx => {
  // Upgrade logic if needed
});

/**
 * Helpers to sync data from server to local DB
 */
export const syncProductsToLocal = async (products) => {
  await db.products.clear();
  await db.products.bulkAdd(products);
};

export const syncCustomersToLocal = async (customers) => {
  await db.customers.clear();
  await db.customers.bulkAdd(customers);
};

export const syncBranchesToLocal = async (branches) => {
  await db.branches.clear();
  await db.branches.bulkAdd(branches);
};

export const syncWarehousesToLocal = async (warehouses) => {
  await db.warehouses.clear();
  await db.warehouses.bulkAdd(warehouses);
};

/**
 * Save a sale to the offline queue
 */
export const saveOfflineSale = async (saleData) => {
  try {
    const id = await db.offlineSales.add({
      data: saleData,
      status: 'pending',
      timestamp: Date.now()
    });
    return id;
  } catch (err) {
    console.error('Failed to save offline sale:', err);
    throw err;
  }
};

export default db;
