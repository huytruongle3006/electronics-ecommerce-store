import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, DollarSign, PackageCheck, AlertOctagon, 
  ShoppingBag, Award, BarChart3, ArrowUpRight 
} from 'lucide-react';
import { getFinancialReportApi } from '../services/api';

export default function FinancialAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFinancialReportApi()
      .then(res => setData(res.data.data))
      .catch(err => console.error('Lỗi tải báo cáo:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div style={{ padding: '60px 0', textAlign: 'center', color: '#64748b' }}>Đang tổng hợp dữ liệu tài chính...</div>;
  }

  if (!data) {
    return <div style={{ padding: '60px 0', textAlign: 'center', color: '#ef4444' }}>Không thể tải báo cáo tài chính!</div>;
  }

  // Tìm doanh thu ngày cao nhất để tính chiều cao cột (%)
  const maxDayRevenue = Math.max(...data.revenue_chart.map(d => d.revenue), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Tiêu đề */}
      <div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
          Báo Cáo & Phân Tích Tài Chính
        </h2>
        <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
          Số liệu thống kê thời gian thực dựa trên các đơn hàng đã ghi nhận
        </span>
      </div>

      {/* 4 Thẻ KPI Tài chính */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        
        {/* Doanh thu thực nhận */}
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.8rem', fontWeight: 700 }}>
            <span>DOANH THU THỰC NHẬN</span>
            <DollarSign size={18} color="#16a34a" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#16a34a', marginTop: '10px' }}>
            {Number(data.total_revenue || 0).toLocaleString('vi-VN')} đ
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
            Từ {data.completed_orders} đơn hàng hoàn tất
          </div>
        </div>

        {/* Tiền đang vận chuyển */}
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.8rem', fontWeight: 700 }}>
            <span>DOANH THU ĐANG GIAO</span>
            <TrendingUp size={18} color="#2563eb" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#2563eb', marginTop: '10px' }}>
            {Number(data.shipping_revenue || 0).toLocaleString('vi-VN')} đ
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
            Doanh số tiềm năng đang giao
          </div>
        </div>

        {/* Giá trị đơn trung bình (AOV) */}
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.8rem', fontWeight: 700 }}>
            <span>GIÁ TRỊ ĐƠN TRUNG BÌNH</span>
            <ShoppingBag size={18} color="#7c3aed" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginTop: '10px' }}>
            {Number(data.average_order_val || 0).toLocaleString('vi-VN')} đ
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
            Mức chi tiêu trung bình / đơn
          </div>
        </div>

        {/* Tỷ lệ hủy đơn */}
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.8rem', fontWeight: 700 }}>
            <span>TỶ LỆ HỦY ĐƠN</span>
            <AlertOctagon size={18} color="#dc2626" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: data.cancel_rate > 15 ? '#dc2626' : '#0f172a', marginTop: '10px' }}>
            {data.cancel_rate}%
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
            {data.status_breakdown.cancelled} đơn đã bị hủy
          </div>
        </div>

      </div>

      {/* Hàng giữa: Biểu đồ cột 7 ngày & Phân bổ trạng thái */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        
        {/* Biểu đồ doanh thu 7 ngày */}
        <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={18} color="#2563eb" /> Doanh Thu 7 Ngày Gần Nhất
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Đơn vị: VNĐ</span>
          </div>

          <div style={{ height: '200px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '12px', paddingBottom: '10px', borderBottom: '1px solid #e2e8f0' }}>
            {data.revenue_chart.map((item, idx) => {
              const heightPercent = maxDayRevenue > 0 ? (item.revenue / maxDayRevenue) * 100 : 0;
              return (
                <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', height: '100%', justifyContent: 'flex-end' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: item.revenue > 0 ? '#16a34a' : '#cbd5e1' }}>
                    {item.revenue > 0 ? `${(item.revenue / 1000000).toFixed(1)}M` : '0'}
                  </div>
                  <div 
                    title={`${item.date}: ${Number(item.revenue).toLocaleString('vi-VN')} đ`}
                    style={{
                      width: '100%',
                      maxWidth: '36px',
                      height: `${Math.max(heightPercent, 4)}%`,
                      backgroundColor: item.revenue > 0 ? '#2563eb' : '#f1f5f9',
                      borderRadius: '6px 6px 0 0',
                      transition: 'all 0.3s ease'
                    }}
                  />
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{item.date}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cơ cấu đơn hàng theo trạng thái */}
        <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
            Tình Trạng Xử Lý Đơn
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { label: 'Chờ duyệt', count: data.status_breakdown.pending, color: '#f59e0b', bg: '#fef3c7' },
              { label: 'Đã xác nhận', count: data.status_breakdown.confirmed, color: '#3b82f6', bg: '#dbeafe' },
              { label: 'Đang vận chuyển', count: data.status_breakdown.shipping, color: '#0284c7', bg: '#e0f2fe' },
              { label: 'Hoàn tất', count: data.status_breakdown.completed, color: '#16a34a', bg: '#dcfce7' },
              { label: 'Đã hủy', count: data.status_breakdown.cancelled, color: '#dc2626', bg: '#fee2e2' },
            ].map((st, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>{st.label}</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', backgroundColor: st.bg, color: st.color }}>
                  {st.count} đơn
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Bảng Top 5 thiết bị bán chạy nhất */}
      <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Award size={18} color="#d97706" />
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
            Top 5 Thiết Bị Đóng Góp Doanh Thu Cao Nhất
          </h3>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
            <tr>
              <th style={{ padding: '12px 16px' }}>Hạng</th>
              <th style={{ padding: '12px 16px' }}>Mã SP</th>
              <th style={{ padding: '12px 16px' }}>Tên thiết bị</th>
              <th style={{ padding: '12px 16px' }}>Số lượng đã bán</th>
              <th style={{ padding: '12px 16px' }}>Tổng doanh thu mang về</th>
            </tr>
          </thead>
          <tbody>
            {data.top_products.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>Chưa có đơn hàng hoàn tất nào được ghi nhận.</td></tr>
            ) : data.top_products.map((p, idx) => (
              <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px 16px', fontWeight: 800, color: idx === 0 ? '#d97706' : '#64748b' }}>
                  #{idx + 1}
                </td>
                <td style={{ padding: '12px 16px', fontWeight: 700 }}>{p.maSP}</td>
                <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>{p.tenSP}</td>
                <td style={{ padding: '12px 16px', fontWeight: 700, color: '#2563eb' }}>
                  {p.total_sold} máy
                </td>
                <td style={{ padding: '12px 16px', fontWeight: 800, color: '#16a34a' }}>
                  {Number(p.total_revenue).toLocaleString('vi-VN')} đ
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}