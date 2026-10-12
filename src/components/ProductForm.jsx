import { useState } from 'react'
import { ApiError, patch, post } from '../api/client'
import { useWs } from '../auth/AuthContext'
import { Button, ErrorBanner, Field, Input, Modal, Textarea, useToast } from './ui'
/** Create (no `product`) or edit. Stock is only settable on create; afterwards it changes through audited adjustments. */
export default function ProductForm({ product, onClose, onSaved }) {
  const ws = useWs()
  const toast = useToast()
  const editing = !!product
  const [f, setF] = useState({
    name: product?.name ?? '',
    sku: product?.sku ?? '',
    description: product?.description ?? '',
    unitPrice: product?.unitPrice ?? '',
    stockQuantity: '0',
    lowStockThreshold: String(product?.lowStockThreshold ?? 0),
  })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => {
    setF((s) => ({ ...s, [k]: e.target.value }))
    setErrors((er) => ({ ...er, [k]: '' }))
  }
  function validate() {
    const er = {}
    if (!f.name.trim()) er.name = 'Name is required'
    if (!f.sku.trim()) er.sku = 'SKU is required'
    else if (!/^[A-Za-z0-9][A-Za-z0-9._\-/]*$/.test(f.sku.trim())) er.sku = 'Use letters, digits, ".", "_", "-" or "/"'
    if (!/^\d{1,7}(\.\d{1,2})?$/.test(f.unitPrice.trim())) er.unitPrice = 'Enter a non-negative amount with at most 2 decimals'
    if (!editing && !/^\d+$/.test(f.stockQuantity)) er.stockQuantity = 'Whole number, 0 or more'
    if (!/^\d+$/.test(f.lowStockThreshold)) er.lowStockThreshold = 'Whole number, 0 or more'
    return er
  }
  async function submit(e) {
    e.preventDefault()
    const er = validate()
    setErrors(er)
    if (Object.keys(er).length) return
    setBusy(true)
    setFormError('')
    const body = {
      name: f.name.trim(),
      sku: f.sku.trim(),
      description: f.description.trim(),
      unitPrice: f.unitPrice.trim(),
      lowStockThreshold: Number(f.lowStockThreshold),
      ...(editing ? {} : { stockQuantity: Number(f.stockQuantity) }),
    }
    try {
      const saved = editing ? await patch(`${ws}/products/${product.id}`, body) : await post(`${ws}/products`, body)
      toast('success', editing ? 'Product updated' : 'Product created')
      onSaved(saved)
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length) setErrors(err.fieldErrors)
      else setFormError(err instanceof ApiError ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal title={editing ? 'Edit product' : 'New product'} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {formError && <ErrorBanner message={formError} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="p-name" error={errors.name}>
            <Input id="p-name" value={f.name} onChange={set('name')} invalid={!!errors.name} maxLength={200} autoFocus />
          </Field>
          <Field label="SKU" htmlFor="p-sku" error={errors.sku} hint="Unique within this workspace">
            <Input id="p-sku" value={f.sku} onChange={set('sku')} invalid={!!errors.sku} maxLength={64} />
          </Field>
        </div>
        <Field label="Description (optional)" htmlFor="p-desc" error={errors.description}>
          <Textarea id="p-desc" rows={2} value={f.description} onChange={set('description')} maxLength={2000} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Unit price" htmlFor="p-price" error={errors.unitPrice}>
            <Input
              id="p-price"
              inputMode="decimal"
              value={f.unitPrice}
              onChange={set('unitPrice')}
              invalid={!!errors.unitPrice}
              placeholder="0.00"
            />
          </Field>
          {!editing && (
            <Field label="Opening stock" htmlFor="p-stock" error={errors.stockQuantity}>
              <Input
                id="p-stock"
                inputMode="numeric"
                value={f.stockQuantity}
                onChange={set('stockQuantity')}
                invalid={!!errors.stockQuantity}
              />
            </Field>
          )}
          <Field label="Low-stock threshold" htmlFor="p-thr" error={errors.lowStockThreshold} hint="Flagged at or below this level">
            <Input
              id="p-thr"
              inputMode="numeric"
              value={f.lowStockThreshold}
              onChange={set('lowStockThreshold')}
              invalid={!!errors.lowStockThreshold}
            />
          </Field>
        </div>
        {editing && (
          <p className="text-xs text-slate-500">To change stock, use “Adjust stock” on the product page so the change is recorded.</p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            {editing ? 'Save changes' : 'Create product'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
