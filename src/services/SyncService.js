import Api from './api';
import { 
  db, 
  syncProductsToLocal, 
  syncCustomersToLocal, 
  syncBranchesToLocal, 
  syncWarehousesToLocal 
} from './db';

const SyncService = {
  /**
   * Main sync function to pull data from server
   */
  async pullDataFromServer(branchId = null) {
    if (!navigator.onLine) {
      console.warn('Cannot sync: browser is offline.');
      return;
    }
    
    console.log('🔄 Starting full sync from server...');
    try {
      // 1. Sync Products
      const productsRaw = await Api.getProducts(0, 5000); 
      const products = this._extractData(productsRaw);
      if (products.length > 0) {
        await syncProductsToLocal(products);
        console.log(`✅ Synced ${products.length} products.`);
      }

      // 2. Sync Customers
      const customersRaw = await Api.getCustomers(0, 1000, '', branchId);
      const customers = this._extractData(customersRaw);
      if (customers.length > 0) {
        await syncCustomersToLocal(customers);
        console.log(`✅ Synced ${customers.length} customers.`);
      }

      // 3. Sync Branches
      const branchesRaw = await Api.getBranches();
      const branches = this._extractData(branchesRaw);
      if (branches.length > 0) {
        await syncBranchesToLocal(branches);
        console.log(`✅ Synced ${branches.length} branches.`);
      }

      // 4. Sync Warehouses
      const warehousesRaw = await Api.getAllWarehouses();
      const warehouses = this._extractData(warehousesRaw);
      if (warehouses.length > 0) {
        await syncWarehousesToLocal(warehouses);
        console.log(`✅ Synced ${warehouses.length} warehouses.`);
      }
      
      await db.settings.put({ key: 'last_full_sync', value: new Date().toISOString() });
      console.log('🚀 Full sync completed successfully.');
      return true;
    } catch (err) {
      console.error('❌ Data pull failed:', err);
      return false;
    }
  },

  /**
   * Helper to extract array from various API response formats
   */
  _extractData(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (raw.data && Array.isArray(raw.data)) return raw.data;
    if (raw.data && raw.data.content) return raw.data.content;
    if (raw.data && raw.data.items) return raw.data.items;
    if (raw.content) return raw.content;
    if (raw.items) return raw.items;
    return [];
  },

  /**
   * Push offline sales to server
   */
  async pushOfflineSales() {
    if (!navigator.onLine) return;

    const pendingSales = await db.offlineSales.where('status').equals('pending').toArray();
    if (pendingSales.length === 0) return;

    console.log(`📤 Syncing ${pendingSales.length} offline sales...`);
    
    for (const sale of pendingSales) {
      try {
        await Api.createSale(sale.data);
        await db.offlineSales.delete(sale.id);
        console.log(`✅ Sale #${sale.id} synced successfully.`);
      } catch (err) {
        console.error(`❌ Failed to sync sale #${sale.id}:`, err);
        break; 
      }
    }
  },

  initAutoSync() {
    window.addEventListener('online', () => {
      this.pushOfflineSales();
      this.pullDataFromServer();
    });

    if (navigator.onLine) {
      this.pushOfflineSales();
    }
  }
};

export default SyncService;
