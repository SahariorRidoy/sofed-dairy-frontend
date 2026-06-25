'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ClipboardList } from 'lucide-react';
import { api } from '@/lib/api';
import { bn, taka, ORDER_STATUS } from '@/lib/utils';
import {
  PageHeader, Card, Button, Select, Badge, PageLoader, EmptyState,
} from '@/components/ui';

const FILTERS = [
  { value: 'all', label: 'সব' },
  { value: 'pending', label: 'নতুন' },
  { value: 'confirmed', label: 'কনফার্ম' },
  { value: 'delivered', label: 'ডেলিভারড' },
  { value: 'cancelled', label: 'বাতিল' },
];

export default function OrdersPage() {
  const [status, setStatus] = useState('all');
  const [orders, setOrders] = useState(null);
  const [markPaid, setMarkPaid] = useState({}); // orderId → bool
  const [busyId, setBusyId] = useState(null);

  const load = (s) =>
    api(`/orders?status=${s}`)
      .then(setOrders)
      .catch((err) => toast.error(err.message));

  useEffect(() => {
    setOrders(null);
    load(status);
  }, [status]);

  const updateStatus = async (order, nextStatus) => {
    setBusyId(order._id);
    try {
      await api(`/orders/${order._id}`, {
        method: 'PUT',
        body: { status: nextStatus, markPaid: !!markPaid[order._id] },
      });
      toast.success(
        nextStatus === 'delivered'
          ? 'ডেলিভারড — বিক্রির হিসাবে যোগ হয়ে গেছে'
          : 'অর্ডার আপডেট হয়েছে'
      );
      load(status);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  if (!orders) return <PageLoader />;

  return (
    <div>
      <PageHeader title="অনলাইন অর্ডার" desc="ডেলিভারড করলেই অর্ডার নিজে নিজে বিক্রির খাতায় উঠে যায়" />

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatus(f.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              status === f.value
                ? 'bg-leaf-700 text-white shadow-sm'
                : 'bg-surface text-leaf-800 ring-1 ring-leaf-200 hover:bg-leaf-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {orders.length === 0 ? (
        <EmptyState icon={ClipboardList} title="কোনো অর্ডার নেই" desc="এই ফিল্টারে এখন কোনো অর্ডার নেই।" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {orders.map((o) => {
            const st = ORDER_STATUS[o.status] || ORDER_STATUS.pending;
            const open = o.status === 'pending' || o.status === 'confirmed';
            return (
              <Card key={o._id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-lg text-leaf-900">{o.customer?.name || '—'}</p>
                    <p className="text-xs text-stone-400">
                      {o.phone || o.customer?.phone || ''}
                      {o.address && ` · ${o.address}`}
                    </p>
                    <p className="mt-0.5 text-[11px] text-stone-400">
                      {new Date(o.createdAt).toLocaleString('bn-BD', {
                        day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <Badge tone={st.tone}>{st.label}</Badge>
                    {o.status === 'delivered' && (
                      <Badge tone={o.paid ? 'leaf' : 'rose'}>{o.paid ? 'পরিশোধিত' : 'বাকি আছে'}</Badge>
                    )}
                  </div>
                </div>

                <div className="mt-4 space-y-1.5 rounded-xl bg-leaf-50/60 p-3.5 text-sm">
                  {o.items.map((it, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span>
                        {it.name} <span className="text-stone-400">× {bn(it.quantity)} {it.unit}</span>
                      </span>
                      <span className="num">{taka(it.amount)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between border-t border-leaf-100 pt-1.5 font-semibold text-leaf-900">
                    <span>মোট</span>
                    <span className="num">{taka(o.total)}</span>
                  </div>
                </div>

                {o.note && <p className="mt-2 text-xs text-stone-500">নোট: {o.note}</p>}

                {open && (
                  <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-leaf-100 pt-4">
                    <Select
                      defaultValue={o.status}
                      onChange={(e) => updateStatus(o, e.target.value)}
                      disabled={busyId === o._id}
                      className="w-auto min-w-[140px]"
                    >
                      <option value="pending">নতুন</option>
                      <option value="confirmed">কনফার্ম</option>
                      <option value="delivered">ডেলিভারড</option>
                      <option value="cancelled">বাতিল</option>
                    </Select>
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-stone-600">
                      <input
                        type="checkbox"
                        checked={!!markPaid[o._id]}
                        onChange={(e) => setMarkPaid((m) => ({ ...m, [o._id]: e.target.checked }))}
                        className="h-4 w-4 accent-leaf-700"
                      />
                      ডেলিভারিতে টাকা নেওয়া হয়েছে
                    </label>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
