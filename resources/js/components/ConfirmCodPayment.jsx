import React, { useState, useRef } from 'react';
import { confirmCodPaymentApi } from '../services/api';
import { returnError } from './ReturnRequestPanel';

export default function ConfirmCodPayment({ order, onConfirmed, onBusyChange }) {
    const [opened, setOpened] = useState(false);
    const [reference, setReference] = useState('');
    const [checked, setChecked] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const pending=useRef(false);
    if (order.status !== 'completed' || order.payment?.payment_method !== 'cod' || order.payment?.payment_status !== 'pending') return null;
    const submit = async event => {
        event.preventDefault(); if (pending.current) return; pending.current=true;setBusy(true);onBusyChange?.(true);setError('');
        try { await confirmCodPaymentApi(order.id, { reference, confirmed_collected: checked }); setOpened(false); onConfirmed?.(); }
        catch (err) { setError(returnError(err)); } finally { pending.current=false;setBusy(false);onBusyChange?.(false); }
    };
    return <div style={{ fontSize: 12, marginTop: 8 }}>
        {!opened ? <button type="button" onClick={() => setOpened(true)}>Xác nhận đã thu COD</button> : <form onSubmit={submit}>
            {error && <p role="alert">{error}</p>}
            <fieldset disabled={busy} style={{ display: 'grid', gap: 8, border: 0, padding: 0 }}>
                <label>Mã phiếu thu<input name="cod_reference" required maxLength={100} value={reference} onChange={event => setReference(event.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} /></label>
                <label><input type="checkbox" required checked={checked} onChange={event => setChecked(event.target.checked)} /> Đã thu đủ tiền thực tế</label>
                <button type="submit">{busy ? 'Đang ghi nhận...' : 'Ghi nhận thu COD'}</button><button type="button" onClick={() => setOpened(false)}>Để sau</button>
            </fieldset>
        </form>}
    </div>;
}
