import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, Legend } from 'recharts';
import FacebookApi from '../services/facebookApi';
import Loader from '../components/common/Loader';
import { useGlobalUI } from '../components/common/GlobalUI';

const FacebookAdsDashboard = () => {
    const { toast } = useGlobalUI();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await FacebookApi.getInsights();
            if (res.success) {
                setData(res.data);
            } else {
                toast(res.message || 'خطأ في جلب بيانات الإعلانات', 'error');
            }
        } catch (err) {
            console.error(err);
            toast('فشل الاتصال بالسيرفر', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <Loader message="جاري جلب تقارير فيسبوك..." />;

    if (!data) {
        return (
            <div className="page-section" style={{ textAlign: 'center', marginTop: '100px' }}>
                <div className="card" style={{ padding: '40px', maxWidth: '600px', margin: '0 auto' }}>
                    <span style={{ fontSize: '3rem' }}>📊</span>
                    <h2 style={{ marginTop: '20px' }}>بيانات إعلانات فيسبوك غير متوفرة</h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
                        يرجى التأكد من إعداد (Ad Account ID) و (Access Token) في صفحة الإعدادات.
                    </p>
                    <button className="btn btn-primary" onClick={() => window.location.href='/settings'}>الانتقال للإعدادات</button>
                </div>
            </div>
        );
    }

    const { totalSummary, dailyInsights, campaignInsights } = data;

    // Process daily data for Recharts
    const chartData = dailyInsights.map(d => ({
        name: new Date(d.dateStart).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' }),
        spend: d.spend,
        clicks: d.clicks,
        impressions: d.impressions
    }));

    return (
        <div className="page-section" style={{ direction: 'rtl' }}>
            <div className="row-premium" style={{ marginBottom: '20px', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0 }}>📊 تقارير إعلانات فيسبوك (آخر 30 يوم)</h2>
                <button className="btn btn-secondary btn-sm" onClick={loadData}>تحديث البيانات 🔄</button>
            </div>

            {/* Top Metrics Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '25px' }}>
                <div className="card" style={{ borderRight: '4px solid var(--metro-blue)', padding: '20px' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>إجمالي المصروف</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{totalSummary.spend.toLocaleString()} <span style={{ fontSize: '0.9rem' }}>ج.م</span></div>
                </div>
                <div className="card" style={{ borderRight: '4px solid var(--metro-green)', padding: '20px' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>إجمالي النقرات</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{totalSummary.clicks.toLocaleString()}</div>
                </div>
                <div className="card" style={{ borderRight: '4px solid var(--metro-amber)', padding: '20px' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>مرات الظهور</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{(totalSummary.impressions / 1000).toFixed(1)}k</div>
                </div>
                <div className="card" style={{ borderRight: '4px solid var(--metro-rose)', padding: '20px' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>CTR (نسبة النقر)</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{totalSummary.ctr.toFixed(2)}%</div>
                </div>
                <div className="card" style={{ borderRight: '4px solid var(--metro-purple)', padding: '20px' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>متوسط تكلفة النقرة</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{totalSummary.cpc.toFixed(2)} <span style={{ fontSize: '0.9rem' }}>ج.م</span></div>
                </div>
            </div>

            {/* Daily Trend Chart */}
            <div className="card" style={{ marginBottom: '25px' }}>
                <div className="card-header">
                    <h3>📈 أداء الإنفاق والنقرات اليومي</h3>
                </div>
                <div className="card-body" style={{ height: '400px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--metro-blue)" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="var(--metro-blue)" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                            <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                            <YAxis yAxisId="left" stroke="var(--metro-blue)" fontSize={12} />
                            <YAxis yAxisId="right" orientation="right" stroke="var(--metro-green)" fontSize={12} />
                            <Tooltip 
                                contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: '8px', textAlign: 'right' }}
                            />
                            <Legend />
                            <Area yAxisId="left" type="monotone" name="المصروف (ج.م)" dataKey="spend" stroke="var(--metro-blue)" fillOpacity={1} fill="url(#colorSpend)" />
                            <Area yAxisId="right" type="monotone" name="النقرات" dataKey="clicks" stroke="var(--metro-green)" fillOpacity={0} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Campaigns Table */}
            <div className="card">
                <div className="card-header">
                    <h3>📂 أداء الحملات الإعلانية</h3>
                </div>
                <div className="card-body no-padding">
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th style={{ textAlign: 'right' }}>اسم الحملة</th>
                                    <th>المصروف (ج.م)</th>
                                    <th>الظهور</th>
                                    <th>النقرات</th>
                                    <th>CTR</th>
                                </tr>
                            </thead>
                            <tbody>
                                {campaignInsights.map((camp, idx) => (
                                    <tr key={idx}>
                                        <td style={{ fontWeight: '500' }}>{camp.campaignName}</td>
                                        <td>{camp.spend.toLocaleString()}</td>
                                        <td>{camp.impressions.toLocaleString()}</td>
                                        <td>{camp.clicks.toLocaleString()}</td>
                                        <td>
                                            <span className="badge badge-info">{camp.ctr.toFixed(2)}%</span>
                                        </td>
                                    </tr>
                                ))}
                                {campaignInsights.length === 0 && (
                                    <tr>
                                        <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>لا توجد حملات نشطة حالياً</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FacebookAdsDashboard;
