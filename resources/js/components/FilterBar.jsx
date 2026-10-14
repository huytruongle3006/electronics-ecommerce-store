import React from 'react';
import { SlidersHorizontal } from 'lucide-react';

export default function FilterBar({ categories, selectedCategory, onSelectCategory, sortBy, onSelectSort }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '15px', backgroundColor: '#fff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748b', marginRight: '6px' }}>Danh mục:</span>
        <button 
          onClick={() => onSelectCategory('ALL')}
          style={{
            padding: '6px 14px', borderRadius: '999px',
            border: selectedCategory === 'ALL' ? '1px solid #2563eb' : '1px solid #e2e8f0',
            backgroundColor: selectedCategory === 'ALL' ? '#eff6ff' : '#fff',
            color: selectedCategory === 'ALL' ? '#2563eb' : '#475569',
            fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer'
          }}
        >
          Tất cả
        </button>
        {categories.map(c => (
          <button 
            key={c.id}
            onClick={() => onSelectCategory(c.id)}
            style={{
              padding: '6px 14px', borderRadius: '999px',
              border: Number(selectedCategory) === c.id ? '1px solid #2563eb' : '1px solid #e2e8f0',
              backgroundColor: Number(selectedCategory) === c.id ? '#eff6ff' : '#fff',
              color: Number(selectedCategory) === c.id ? '#2563eb' : '#475569',
              fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer'
            }}
          >
            {c.tenLoai}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <SlidersHorizontal size={16} color="#64748b" />
        <select 
          value={sortBy} 
          onChange={(e) => onSelectSort(e.target.value)}
          style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
        >
          <option value="newest">Mới nhất</option>
          <option value="price_asc">Giá: Thấp đến Cao</option>
          <option value="price_desc">Giá: Cao đến Thấp</option>
        </select>
      </div>
    </div>
  );
}