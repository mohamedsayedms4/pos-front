import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import StoreLayout from '../components/store/StoreLayout';
import ProductCard from '../components/store/ProductCard';
import StoreApi from '../services/storeApi';
import { Link } from 'react-router-dom';

const StoreWishlistPage = () => {
    const { wishlist, addToCart } = useStore();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchWishlistProducts = async () => {
            if (!wishlist || wishlist.length === 0) {
                setProducts([]);
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                // Fetch each product details
                const detailPromises = wishlist.map(id => StoreApi.getProduct(id));
                const results = await Promise.all(detailPromises);
                setProducts(results.filter(p => !!p));
            } catch (error) {
                console.error("Error fetching wishlist products:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchWishlistProducts();
    }, [wishlist]);

    return (
        <StoreLayout>
            <div className="ec-wishlist-page">
                <div className="ec-page-header-premium">
                    <div className="ec-container">
                        <h1>قائمة الأمنيات ❤️</h1>
                        <p>المنتجات التي نالت إعجابك وتود العودة إليها لاحقاً.</p>
                    </div>
                </div>

                <div className="ec-container" style={{ padding: '40px 20px' }}>
                    {loading ? (
                        <div className="ec-loading-container">
                            <div className="ec-loader"></div>
                            <p>جاري تحميل منتجاتك المفضلة...</p>
                        </div>
                    ) : products.length > 0 ? (
                        <div className="ec-product-grid">
                            {products.map(product => (
                                <ProductCard 
                                    key={product.id} 
                                    product={product} 
                                    onAddToCart={addToCart} 
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="ec-empty-state">
                            <div className="ec-empty-icon">🤍</div>
                            <h2>قائمة الأمنيات فارغة</h2>
                            <p>لم تقم بإضافة أي منتجات للمفضلة بعد.</p>
                            <Link to="/store" className="ec-btn ec-btn-primary" style={{ marginTop: '20px', display: 'inline-block' }}>
                                استكشف المنتجات الآن
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </StoreLayout>
    );
};

export default StoreWishlistPage;
