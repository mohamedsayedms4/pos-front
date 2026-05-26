import Api from './api';

class CommunicationApi {
    async getSmtpConfig() {
        const res = await Api._request('/communication/smtp-config');
        return res;
    }

    async saveSmtpConfig(config) {
        await Api._request('/communication/smtp-config', {
            method: 'POST',
            body: JSON.stringify(config),
        });
    }

    async getCampaigns(page = 0, size = 10, search = '') {
        const params = new URLSearchParams({ page, size, search });
        const res = await Api._request(`/communication/campaigns?${params}`);
        return res;
    }

    async getCampaignStats() {
        const res = await Api._request('/communication/campaigns/stats');
        return res;
    }

    async createCampaign(data) {
        const res = await Api._request('/communication/campaigns', {
            method: 'POST',
            body: JSON.stringify(data),
        });
        return res;
    }

    async getCampaignRecipients(id) {
        const res = await Api._request(`/communication/campaigns/${id}/recipients`);
        return res;
    }

    /**
     * Lightweight recipient search — returns only id, name, email, phone.
     * Does NOT trigger N+1 queries (no debt/branch joins).
     */
    async searchRecipients(type = 'CUSTOMER', q = '', page = 0, size = 30) {
        const params = new URLSearchParams({ type, q, page, size });
        const res = await Api._request(`/communication/recipients/search?${params}`);
        return Array.isArray(res) ? res : [];
    }
}

export default new CommunicationApi();
