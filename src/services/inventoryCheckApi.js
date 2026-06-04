import Api from './api';

export const searchInventoryChecks = async (params) => {
    const query = new URLSearchParams(params).toString();
    const res = await Api._request(`/inventory-checks?${query}`);
    return res;
};

export const getInventoryCheck = async (id) => {
    const res = await Api._request(`/inventory-checks/${id}`);
    return res;
};

export const createInventoryCheck = async (data) => {
    const res = await Api._request('/inventory-checks', {
        method: 'POST',
        body: JSON.stringify(data)
    });
    return res;
};

export const updateInventoryCheckItems = async (id, data) => {
    const res = await Api._request(`/inventory-checks/${id}/items`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
    return res;
};

export const submitInventoryCheck = async (id) => {
    const res = await Api._request(`/inventory-checks/${id}/submit`, {
        method: 'POST'
    });
    return res;
};

export const rejectInventoryCheck = async (id) => {
    const res = await Api._request(`/inventory-checks/${id}/reject`, {
        method: 'POST'
    });
    return res;
};

export const approveInventoryCheck = async (id) => {
    const res = await Api._request(`/inventory-checks/${id}/approve`, {
        method: 'POST'
    });
    return res;
};

export const cancelInventoryCheck = async (id) => {
    const res = await Api._request(`/inventory-checks/${id}/cancel`, {
        method: 'POST'
    });
    return res;
};

export const getBranches = async () => {
    const res = await Api._request('/branches');
    return res;
};

export const getWarehouses = async () => {
    const res = await Api._request('/warehouses');
    return res;
};
