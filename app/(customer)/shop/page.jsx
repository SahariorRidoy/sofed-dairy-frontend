'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Store, Plus, Minus, ShoppingBag } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { bn, taka } from '@/lib/utils';
import {
  PageHeader, Card, Button, Input, Field, Textarea, PageLoader, EmptyState,
  Dialog, DialogContent, DialogClose,
} from '@/components/ui';

export default function ShopPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState(null);
  const [cart, setCart] = useState({}); // productId → qty
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState({ address: '', phone: '', note: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api('/shop/products')
      .then(setProducts)
      .catch((err) => toast.error(err.message));
  }, []);

  useEffect(() => {
    setInfo((i) => ({
      ...i,
      address: i.address || user?.customer?.address || '',
      phone: i.phone || user?.customer?.phone || user?.phone || '',
    }));
  }, [user]);

  const add = (id, delta) =>
    setCart((c) => {
      const next = Math.max(0, Math.round(((c[id] || 0) + delta) * 10) / 10);
      const copy = { ...c };
      if (next <= 0) delete copy[id];
      else copy[id] = next;
      return copy;
    });

  const cartItems = useMemo(() => {
    if (!products) return [];
    return Object.entries(cart)
      .map(([id, qty]) => {
        const p = products.find((x) => x._id === id);
        return p ? { ...p, qty, amount: qty * p.rate } : null;
      })
      .filter(Boolean);
  }, [cart, products]);

  const total = cartItems.reduce((s, i) => s + i.amount, 0);
  const count = cartItems.length;

  const placeOrder = async () => {
    setBusy(true);
    try {
      await api('/orders', {
        method: 'POST',
        body: {
          items: cartItems.map((i) => ({ product: i._id, quantity: i.qty })),
          address: info.address,
          phone: info.phone,
          note: info.note,
        },
      });
      toast.success('অর্ডার দেওয়া হয়েছে! আমরা শিগগিরই কনফার্ম করবো।');
      setCart({});
      setOpen(false);
      router.push('/my-orders');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!products) return <PageLoader />;

  return (
    <div className={count > 0 ? 'pb-24' : ''}>
      <PageHeader title="দোকান" desc="খাঁটি দুধ, দই, পনির, ঘি — আপনার জন্য নির্ধারিত দামে" />

      {products.length === 0 ? (
        <EmptyState
          icon={Store}
          title="এখন কোনো পণ্য নেই"
          desc="মালিক পণ্য অনলাইনে দিলে এখানে দেখা যাবে।"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => {
            const qty = cart[p._id] || 0;
            return (
              <Card key={p._id} className="overflow-hidden">
                {p.image?.url ? (
                  <img src={p.image.url} alt={p.name} className="h-40 w-full object-cover" />
                ) : (
                  <div className="flex h-40 w-full items-center justify-center bg-gradient-to-br from-leaf-100 to-ghee-100/60">
                    <span className="font-display text-5xl text-leaf-300">{p.name?.[0]}</span>
                  </div>
                )}
                <div className="p-4">
                  <p className="font-display text-lg text-leaf-900">{p.name}</p>
                  {p.description && <p className="mt-0.5 line-clamp-2 text-xs text-stone-500">{p.description}</p>}
                  <div className="mt-3 flex items-center justify-between">
                    <p className="num font-semibold text-ghee-600">
                      {taka(p.rate)}
                      <span className="text-xs font-normal text-stone-400">/{p.unit}</span>
                    </p>
                    {qty === 0 ? (
                      <Button size="sm" onClick={() => add(p._id, 1)} className="gap-1.5">
                        <Plus className="h-3.5 w-3.5" />
                        যোগ করুন
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => add(p._id, -1)}>
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="num min-w-[44px] text-center font-semibold text-leaf-900">
                          {bn(qty)} {p.unit}
                        </span>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => add(p._id, 1)}>
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* sticky cart bar */}
      {count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-leaf-100 bg-surface/95 p-3 backdrop-blur lg:pl-64">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-1 md:px-5">
            <div>
              <p className="text-xs text-stone-500">{bn(count)}টি পণ্য</p>
              <p className="num font-display text-xl text-leaf-900">{taka(total)}</p>
            </div>
            <Button variant="accent" size="lg" className="gap-2" onClick={() => setOpen(true)}>
              <ShoppingBag className="h-4 w-4" />
              অর্ডার করুন
            </Button>
          </div>
        </div>
      )}

      {/* checkout dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="অর্ডার কনফার্ম করুন" description="ডেলিভারির তথ্য দিন">
          <div className="space-y-4">
            <div className="space-y-1.5 rounded-xl bg-leaf-50/70 p-3.5 text-sm">
              {cartItems.map((i) => (
                <div key={i._id} className="flex items-center justify-between">
                  <span>
                    {i.name} <span className="text-stone-400">× {bn(i.qty)} {i.unit}</span>
                  </span>
                  <span className="num">{taka(i.amount)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-leaf-100 pt-1.5 font-semibold text-leaf-900">
                <span>মোট</span>
                <span className="num">{taka(total)}</span>
              </div>
            </div>
            <Field label="ঠিকানা">
              <Textarea
                value={info.address}
                onChange={(e) => setInfo((f) => ({ ...f, address: e.target.value }))}
                placeholder="এলাকা, রোড, বাসা"
              />
            </Field>
            <Field label="মোবাইল নম্বর">
              <Input value={info.phone} onChange={(e) => setInfo((f) => ({ ...f, phone: e.target.value }))} />
            </Field>
            <Field label="নোট (ঐচ্ছিক)">
              <Input
                value={info.note}
                onChange={(e) => setInfo((f) => ({ ...f, note: e.target.value }))}
                placeholder="যেমন: বিকালে দিলে ভালো হয়"
              />
            </Field>
            <div className="flex justify-end gap-2">
              <DialogClose asChild>
                <Button variant="ghost">বাতিল</Button>
              </DialogClose>
              <Button onClick={placeOrder} loading={busy} disabled={!info.address || !info.phone}>
                অর্ডার দিন — {taka(total)}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
