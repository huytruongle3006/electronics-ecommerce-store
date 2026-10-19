import React from 'react';

export const warrantyLabels = { valid: 'Còn hiệu lực', expired: 'Hết hạn / đã ngừng hiệu lực', in_service: 'Đang xử lý bảo hành', invalid: 'Không còn hiệu lực theo trạng thái đơn', not_started: 'Chưa đến ngày hiệu lực', claimed: 'Đã ghi nhận bảo hành trước đây — liên hệ cửa hàng' };
export const serviceLabels = { requested: 'Chờ tiếp nhận', accepted: 'Đã tiếp nhận', rejected: 'Từ chối tiếp nhận', repairing: 'Đang sửa chữa', ready: 'Đã xử lý, chờ trả máy', closed: 'Đã trả máy, đóng hồ sơ' };
export const warrantyError = error => error.response?.data?.errors ? Object.values(error.response.data.errors).flat().join(' ') : error.response?.status === 429 ? 'Bạn thao tác quá nhiều lần. Hãy đợi một phút rồi thử lại.' : error.response?.status === 401 ? 'Vui lòng đăng nhập lại.' : error.response?.data?.message || 'Không thể kết nối máy chủ. Vui lòng thử lại.';
export const warrantyDate = value => value ? String(value).slice(0, 10).split('-').reverse().join('/') : '—';
export function ServiceTimeline({ service }) {
    return <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, marginTop: 10 }}>
        <strong>Hồ sơ #{service.id} · {serviceLabels[service.status]}</strong>
        <p style={{ whiteSpace: 'pre-wrap' }}>Mô tả lỗi: {service.problem}</p>
        {service.admin_note && <p style={{ whiteSpace: 'pre-wrap' }}>Cửa hàng: {service.admin_note}</p>}
        {service.resolution && <p style={{ whiteSpace: 'pre-wrap' }}>Kết quả xử lý: {service.resolution}</p>}
        <ol>{(service.events || []).map(event => <li key={event.id} style={{ marginBottom: 6, whiteSpace: 'pre-wrap' }}>{new Date(event.created_at).toLocaleString('vi-VN')} · {serviceLabels[event.action] || event.action}{event.note ? ` — ${event.note}` : ''}</li>)}</ol>
    </div>;
}
