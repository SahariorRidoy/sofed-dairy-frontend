'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Package, Plus, Pencil, ImagePlus } from 'lucide-react';
import { api } from '@/lib/api';
import { taka, CATEGORY_LABEL } from '@/lib/utils';
import {
  PageHeader, Card, Button, Input, Field, Select, Switch, Badge, Textarea,
  PageLoader, EmptyState,
  Dialog, DialogContent, DialogClose,
} from '@/components/ui';

const CATEGORIES = Object.entries(CATEGORY_LABEL).map(([value, label]) => ({ value, label }));
const emptyForm = {
  name: '', category: 'milk', unit: 'কেজি', defaultRate: '', description: '',
  availableOnline: false, quickSale: false,
};

export default function ProductsPage() {
  const [products, setProducts] = useState(null);
  const [editTarget, setEditTarget] = useState(null); // null | 'new' | product
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () =>
    api('/products?all=1')
      .then(setProducts)
      .catch((err) => toast.error(err.message));

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setForm(emptyForm);
    setFile(null);
    setEditTarget('new');
  };
  const openEdit = (p) => {
    setForm({
      name: p.name, category: p.category, unit: p.unit, defaultRate: p.defaultRate,
      description: p.description || '', availableOnline: p.availableOnline, quickSale: p.quickSale,
    });
    setFile(null);
    setEditTarget(p);
  };

  const save = async () => {
    setBusy(true);
    try {
      let image;
      if (file) {
        const fd = new FormData();
        fd.append('image', file);
        image = await api('/products/upload', { method: 'POST', body: fd });
      }
      const body = { ...form, defaultRate: Number(form.defaultRate), ...(image ? { image } : {}) };
      if (editTarget === 'new') {
        await api('/products', { method: 'POST', body });
        toast.success('পণ্য যোগ হয়েছে');
      } else {
        await api(`/products/${editTarget._id}`, { method: 'PUT', body });
        toast.success('পণ্য আপডেট হয়েছে');
      }
      setEditTarget(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (p, key, value) => {
    try {
      await api(`/products/${p._id}`, { method: 'PUT', body: { [key]: value } });
      setProducts((list) => list.map((x) => (x._id === p._id ? { ...x, [key]: value } : x)));
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (!products) return <PageLoader />;

  return (
    <div>
      <PageHeader title="পণ্য" desc="দাম, অনলাইন বিক্রি ও দ্রুত-এন্ট্রি কলাম এখান থেকে ঠিক করুন">
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" />
          নতুন পণ্য
        </Button>
      </PageHeader>

      {products.length === 0 ? (
        <EmptyState icon={Package} title="কোনো পণ্য নেই" desc="দুধ, দই, পনির, ঘি — পণ্য যোগ করুন।">
          <Button onClick={openNew}>পণ্য যোগ করুন</Button>
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((p) => (
            <Card key={p._id} className={`overflow-hidden ${!p.active ? 'opacity-60' : ''}`}>
              {p.image?.url ? (
                <img src={p.image.url} alt={p.name} className="h-36 w-full object-cover" />
              ) : (
                <div className="flex h-36 w-full items-center justify-center bg-gradient-to-br from-leaf-100 to-leaf-50">
                  <span className="font-display text-4xl text-leaf-300">{p.name?.[0]}</span>
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-lg text-leaf-900">{p.name}</p>
                    <p className="num text-sm font-semibold text-ghee-600">
                      {taka(p.defaultRate)}/{p.unit}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge tone="stone">{CATEGORY_LABEL[p.category]}</Badge>
                  {p.availableOnline && <Badge tone="leaf">অনলাইনে আছে</Badge>}
                  {p.quickSale && <Badge tone="ghee">দ্রুত বিক্রি</Badge>}
                </div>
                <div className="mt-4 space-y-2 border-t border-leaf-100 pt-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-stone-500">চালু</span>
                    <Switch checked={p.active} onChange={(v) => toggle(p, 'active', v)} />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-stone-500">অনলাইন দোকানে দেখাও</span>
                    <Switch checked={p.availableOnline} onChange={(v) => toggle(p, 'availableOnline', v)} />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-stone-500">দ্রুত-এন্ট্রি কলাম</span>
                    <Switch checked={p.quickSale} onChange={(v) => toggle(p, 'quickSale', v)} />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* add/edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent title={editTarget === 'new' ? 'নতুন পণ্য' : 'পণ্য এডিট'}>
          <div className="space-y-4">
            <Field label="পণ্যের নাম">
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="ক্যাটাগরি">
                <Select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="একক">
                <Select value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}>
                  {['কেজি', 'লিটার', 'কাপ', 'পিস'].map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="সাধারণ দাম (৳)">
              <Input
                type="number"
                step="0.5"
                min="0"
                value={form.defaultRate}
                onChange={(e) => setForm((f) => ({ ...f, defaultRate: e.target.value }))}
              />
            </Field>
            <Field label="বর্ণনা (অনলাইন দোকানে দেখাবে)">
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </Field>
            <Field label="ছবি (ঐচ্ছিক — Cloudinary লাগবে)">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-leaf-300 bg-leaf-50/60 px-3 py-2.5 text-sm text-leaf-800 hover:bg-leaf-50">
                <ImagePlus className="h-4 w-4" />
                {file ? file.name : 'ছবি বেছে নিন (সর্বোচ্চ ৩ MB)'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </label>
            </Field>
            <div className="flex flex-wrap gap-5">
              <Switch
                checked={form.availableOnline}
                onChange={(v) => setForm((f) => ({ ...f, availableOnline: v }))}
                label="অনলাইন দোকানে"
              />
              <Switch
                checked={form.quickSale}
                onChange={(v) => setForm((f) => ({ ...f, quickSale: v }))}
                label="দ্রুত-এন্ট্রি কলাম"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <DialogClose asChild>
                <Button variant="ghost">বাতিল</Button>
              </DialogClose>
              <Button onClick={save} loading={busy} disabled={!form.name || !form.defaultRate}>
                সেভ করুন
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
