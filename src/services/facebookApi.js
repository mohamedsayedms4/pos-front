import Api from './api';

const FacebookApi = {
    getInsights: async () => {
        return await Api.get('/facebook/insights');
    }
};

export default FacebookApi;
