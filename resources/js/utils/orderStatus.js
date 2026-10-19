const nextStatuses = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['shipping', 'cancelled'],
    shipping: ['completed'],
    completed: [],
    cancelled: [],
};

export const canChangeOrderStatus = (current, next) => current === next || (nextStatuses[current] || []).includes(next);

export const cancellationNote = order => [...(order.histories || [])]
    .filter(history => history.status_changed === 'cancelled')
    .sort((a, b) => Number(b.id) - Number(a.id))[0]?.note;
