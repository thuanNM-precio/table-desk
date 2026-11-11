import { useId, useMemo, useRef, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { ApiError } from '../api/client'
import { useCreateMenuItem, useDeleteMenuItem, useMenuCategories, useMenuItems, useUpdateMenuItem } from '../api/queries'
import type { MenuCategory, MenuItem, MenuItemInput } from '../api/types'
import { DESCRIPTION_MAX, hasErrors, mergeErrors, parsePrice, validateMenuItem, validatePrice, type FieldErrors } from '../api/validation'
import { PageHeader } from '../components/app-shell'
import { EmptyState, ErrorState, LoadingState, errorMessage } from '../components/async-state'
import { Dialog } from '../components/dialog'
import { PlusIcon, SearchIcon } from '../components/icons'
import { useToast } from '../components/toast'
import { formatMoney, priceToInput } from '../lib/format'
import { useHotkey } from '../lib/hotkeys'

type DialogState = { mode: 'add' } | { mode: 'edit'; item: MenuItem } | null

export function MenuPage() {
  const categories = useMenuCategories()
  const items = useMenuItems()
  const [params, setParams] = useSearchParams()
  const [dialog, setDialog] = useState<DialogState>(null)

  // The box keeps its own state so fast typing never loses keys; the URL mirrors it for links and reloads.
  const [query, setQuery] = useState(() => params.get('q') ?? '')
  const categoryFilter = params.get('category') ?? 'all'
  const soldOutOnly = params.get('soldout') === '1'

  const updateParam = (key: string, value: string | null) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (value === null || value === '') next.delete(key)
        else next.set(key, value)
        return next
      },
      { replace: true },
    )

  useHotkey('n', () => setDialog({ mode: 'add' }))

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return (categories.data ?? [])
      .filter((category) => categoryFilter === 'all' || category.id === categoryFilter)
      .map((category) => ({
        category,
        items: (items.data ?? []).filter(
          (item) =>
            item.categoryId === category.id &&
            (!soldOutOnly || !item.available) &&
            (!needle || item.name.toLowerCase().includes(needle) || item.description.toLowerCase().includes(needle)),
        ),
      }))
      .filter((group) => group.items.length > 0)
  }, [categories.data, items.data, categoryFilter, soldOutOnly, query])

  const soldOutCount = items.data?.filter((item) => !item.available).length ?? 0
  const onSearch = (value: string) => {
    setQuery(value)
    updateParam('q', value)
  }
  const clearFilters = () => {
    setQuery('')
    setParams({}, { replace: true })
  }
  const filtersActive = query !== '' || categoryFilter !== 'all' || soldOutOnly
  const isPending = categories.isPending || items.isPending
  const failed = categories.isError ? categories : items.isError ? items : null

  return (
    <div className="page">
      <PageHeader
        title="Menu"
        description={
          items.data
            ? `${items.data.length} items · ${soldOutCount} sold out. Tap a price to change it; flip the switch when a dish runs out.`
            : 'Dishes, prices and what is available tonight.'
        }
        actions={
          <button type="button" className="btn btn--primary" onClick={() => setDialog({ mode: 'add' })}>
            <PlusIcon /> Add item <kbd aria-hidden="true">N</kbd>
          </button>
        }
      />

      <div className="toolbar" role="search">
        <label className="search">
          <SearchIcon />
          <span className="visually-hidden">Search menu</span>
          <input type="search" data-search placeholder="Search dishes" value={query} onChange={(e) => onSearch(e.target.value)} />
          <kbd aria-hidden="true">/</kbd>
        </label>
        <div className="segmented segmented--scroll" role="group" aria-label="Category">
          <button type="button" aria-pressed={categoryFilter === 'all'} onClick={() => updateParam('category', null)}>
            All
          </button>
          {categories.data?.map((category) => (
            <button
              key={category.id}
              type="button"
              aria-pressed={categoryFilter === category.id}
              onClick={() => updateParam('category', category.id)}
            >
              {category.name}
            </button>
          ))}
        </div>
        <label className="toggle">
          <input type="checkbox" role="switch" checked={soldOutOnly} onChange={(e) => updateParam('soldout', e.target.checked ? '1' : null)} />
          <span>Sold out only ({soldOutCount})</span>
        </label>
      </div>

      {isPending ? (
        <LoadingState label="Loading menu…" rows={6} />
      ) : failed ? (
        <ErrorState
          title="Couldn't load the menu"
          error={failed.error}
          onRetry={() => {
            void categories.refetch()
            void items.refetch()
          }}
          retrying={categories.isFetching || items.isFetching}
        />
      ) : groups.length === 0 ? (
        filtersActive ? (
          <EmptyState
            title="No dishes match"
            text="Try another word or category."
            action={
              <button type="button" className="btn btn--secondary" onClick={clearFilters}>
                Clear filters
              </button>
            }
          />
        ) : (
          <EmptyState
            title="Your menu is empty"
            text="Add the first dish to start taking orders."
            action={
              <button type="button" className="btn btn--primary" onClick={() => setDialog({ mode: 'add' })}>
                Add item
              </button>
            }
          />
        )
      ) : (
        <div className="table-card">
          <table className="table menu-table">
            <thead>
              <tr>
                <th scope="col">Item</th>
                <th scope="col" className="align-right">
                  Price
                </th>
                <th scope="col">Availability</th>
                <th scope="col">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            {groups.map((group) => (
              <tbody key={group.category.id}>
                <tr className="group-row">
                  <th scope="rowgroup" colSpan={4}>
                    {group.category.name} <span className="muted">· {group.items.length}</span>
                  </th>
                </tr>
                {group.items.map((item) => (
                  <MenuRow key={item.id} item={item} onEdit={() => setDialog({ mode: 'edit', item })} />
                ))}
              </tbody>
            ))}
          </table>
        </div>
      )}

      <Dialog open={dialog !== null} title={dialog?.mode === 'edit' ? `Edit ${dialog.item.name}` : 'Add menu item'} onClose={() => setDialog(null)}>
        {dialog && (
          <MenuItemForm
            key={dialog.mode === 'edit' ? dialog.item.id : 'new'}
            item={dialog.mode === 'edit' ? dialog.item : undefined}
            categories={categories.data ?? []}
            defaultCategoryId={categoryFilter !== 'all' ? categoryFilter : ''}
            onDone={() => setDialog(null)}
          />
        )}
      </Dialog>
    </div>
  )
}

function MenuRow({ item, onEdit }: { item: MenuItem; onEdit: () => void }) {
  const update = useUpdateMenuItem()
  const toast = useToast()

  function toggleAvailable() {
    const available = !item.available
    update.mutate(
      { id: item.id, patch: { available } },
      {
        onSuccess: () =>
          toast({
            tone: 'success',
            message: available ? `${item.name} is available again` : `${item.name} marked sold out`,
            action: { label: 'Undo', onAction: () => update.mutate({ id: item.id, patch: { available: !available } }) },
          }),
        onError: (error) => toast({ tone: 'error', message: `Couldn't update ${item.name}: ${errorMessage(error)}` }),
      },
    )
  }

  function savePrice(price: number) {
    const previous = item.price
    update.mutate(
      { id: item.id, patch: { price } },
      {
        onSuccess: () =>
          toast({
            tone: 'success',
            message: `${item.name} now ${formatMoney(price)}`,
            action: { label: 'Undo', onAction: () => update.mutate({ id: item.id, patch: { price: previous } }) },
          }),
        onError: (error) => toast({ tone: 'error', message: `Price not saved: ${errorMessage(error)}` }),
      },
    )
  }

  return (
    <tr className={item.available ? undefined : 'is-sold-out'} data-item={item.name}>
      <td>
        <div className="cell-stack">
          <span className="cell-title">{item.name}</span>
          {item.description && <span className="cell-detail">{item.description}</span>}
        </div>
      </td>
      <td className="align-right">
        <PriceCell item={item} onSave={savePrice} />
      </td>
      <td>
        <button
          type="button"
          role="switch"
          aria-checked={item.available}
          aria-label={`${item.name} available`}
          className="switch"
          onClick={toggleAvailable}
        >
          <span className="switch__track" aria-hidden="true">
            <span className="switch__thumb" />
          </span>
          <span className="switch__text">{item.available ? 'Available' : 'Sold out'}</span>
        </button>
      </td>
      <td className="align-right">
        <button type="button" className="btn btn--ghost" onClick={onEdit} aria-label={`Edit ${item.name}`}>
          Edit
        </button>
      </td>
    </tr>
  )
}

function PriceCell({ item, onSave }: { item: MenuItem; onSave: (price: number) => void }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState('')
  const [error, setError] = useState<string>()
  const buttonRef = useRef<HTMLButtonElement>(null)
  // Guards against the blur that some browsers fire while the input unmounts after Enter/Esc.
  const finished = useRef(false)
  const errorId = useId()

  const stop = () => {
    finished.current = true
    setEditing(false)
    setError(undefined)
    requestAnimationFrame(() => buttonRef.current?.focus())
  }

  const commit = () => {
    if (finished.current) return
    const price = parsePrice(text)
    const problem = validatePrice(price)
    if (problem || price === null) {
      setError(problem)
      return
    }
    if (price !== item.price) onSave(price)
    stop()
  }

  if (!editing) {
    return (
      <button
        ref={buttonRef}
        type="button"
        className="price-button num"
        aria-label={`Price of ${item.name}: ${formatMoney(item.price)}. Edit`}
        onClick={() => {
          finished.current = false
          setText(priceToInput(item.price))
          setEditing(true)
        }}
      >
        {formatMoney(item.price)}
      </button>
    )
  }

  return (
    <div className="price-edit">
      <span className="price-edit__prefix" aria-hidden="true">
        ₱
      </span>
      <input
        autoFocus
        inputMode="decimal"
        aria-label={`Price of ${item.name}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        value={text}
        onFocus={(e) => e.target.select()}
        onChange={(e) => {
          setText(e.target.value)
          setError(undefined)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') {
            e.preventDefault()
            stop()
          }
        }}
        onBlur={commit}
      />
      {error && (
        <p id={errorId} className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

interface FormValues {
  name: string
  categoryId: string
  price: string
  description: string
  available: boolean
}

const fieldOrder: Array<keyof MenuItemInput> = ['name', 'categoryId', 'price', 'description']

function MenuItemForm({
  item,
  categories,
  defaultCategoryId,
  onDone,
}: {
  item?: MenuItem
  categories: MenuCategory[]
  defaultCategoryId: string
  onDone: () => void
}) {
  const create = useCreateMenuItem()
  const update = useUpdateMenuItem()
  const remove = useDeleteMenuItem()
  const toast = useToast()
  const formId = useId()
  const formRef = useRef<HTMLFormElement>(null)

  const [values, setValues] = useState<FormValues>({
    name: item?.name ?? '',
    categoryId: item?.categoryId ?? defaultCategoryId,
    price: item ? priceToInput(item.price) : '',
    description: item?.description ?? '',
    available: item?.available ?? true,
  })
  const [touched, setTouched] = useState<Partial<Record<keyof FormValues, boolean>>>({})
  const [submitted, setSubmitted] = useState(false)
  const [serverErrors, setServerErrors] = useState<FieldErrors<MenuItemInput>>({})
  const [formError, setFormError] = useState<string>()

  const clientErrors = validateMenuItem({ ...values, price: parsePrice(values.price) })
  const errors = mergeErrors(clientErrors, serverErrors)
  const visibleError = (field: keyof MenuItemInput) => (submitted || touched[field] ? errors[field] : undefined)
  const saving = create.isPending || update.isPending

  const set = <K extends keyof FormValues>(field: K, value: FormValues[K]) => {
    setValues((current) => ({ ...current, [field]: value }))
    setServerErrors((current) => ({ ...current, [field]: undefined }))
    setFormError(undefined)
  }

  const focusFirstInvalid = (fieldErrors: FieldErrors<MenuItemInput>) => {
    const first = fieldOrder.find((field) => fieldErrors[field])
    if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus()
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if (hasErrors(clientErrors)) {
      focusFirstInvalid(clientErrors)
      return
    }
    const input: MenuItemInput = {
      name: values.name.trim(),
      categoryId: values.categoryId,
      price: parsePrice(values.price) ?? 0,
      description: values.description.trim(),
      available: values.available,
    }
    const handleError = (error: unknown) => {
      if (error instanceof ApiError && Object.keys(error.fieldErrors).length > 0) {
        setServerErrors(error.fieldErrors as FieldErrors<MenuItemInput>)
        focusFirstInvalid(error.fieldErrors as FieldErrors<MenuItemInput>)
      } else {
        setFormError(errorMessage(error))
      }
    }
    if (item) {
      update.mutate(
        { id: item.id, patch: input },
        { onSuccess: () => (toast({ tone: 'success', message: `${input.name} saved` }), onDone()), onError: handleError },
      )
    } else {
      create.mutate(input, {
        onSuccess: () => (toast({ tone: 'success', message: `${input.name} added to the menu` }), onDone()),
        onError: handleError,
      })
    }
  }

  function onDelete() {
    if (!item) return
    const { id, ...snapshot } = item
    remove.mutate(id, {
      onSuccess: () => {
        onDone()
        toast({
          tone: 'success',
          message: `${item.name} deleted`,
          action: { label: 'Undo', onAction: () => create.mutate(snapshot) },
        })
      },
      onError: (error) => setFormError(errorMessage(error)),
    })
  }

  const fieldProps = (field: keyof MenuItemInput) => {
    const message = visibleError(field)
    return {
      id: `${formId}-${field}`,
      name: field,
      'aria-invalid': message ? true : undefined,
      'aria-describedby': message ? `${formId}-${field}-error` : undefined,
      onBlur: () => setTouched((current) => ({ ...current, [field]: true })),
    }
  }

  const FieldError = ({ field }: { field: keyof MenuItemInput }) => {
    const message = visibleError(field)
    return message ? (
      <p id={`${formId}-${field}-error`} className="field-error">
        {message}
      </p>
    ) : null
  }

  return (
    <form ref={formRef} className="form" noValidate onSubmit={onSubmit}>
      <div className="dialog__body">
        {formError && (
          <p className="form-error" role="alert">
            {formError}
          </p>
        )}
        <div className="field">
          <label htmlFor={`${formId}-name`}>Name</label>
          <input {...fieldProps('name')} data-autofocus value={values.name} onChange={(e) => set('name', e.target.value)} autoComplete="off" />
          <FieldError field="name" />
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor={`${formId}-categoryId`}>Category</label>
            <select {...fieldProps('categoryId')} value={values.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
              <option value="">Choose…</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <FieldError field="categoryId" />
          </div>
          <div className="field">
            <label htmlFor={`${formId}-price`}>Price</label>
            <div className="input-prefix">
              <span aria-hidden="true">₱</span>
              <input {...fieldProps('price')} inputMode="decimal" placeholder="0.00" value={values.price} onChange={(e) => set('price', e.target.value)} />
            </div>
            <FieldError field="price" />
          </div>
        </div>
        <div className="field">
          <label htmlFor={`${formId}-description`}>
            Description <span className="muted">(optional)</span>
          </label>
          <textarea {...fieldProps('description')} rows={2} value={values.description} onChange={(e) => set('description', e.target.value)} />
          <div className="field-meta">
            <FieldError field="description" />
            <span className={`counter ${values.description.length > DESCRIPTION_MAX ? 'counter--over' : ''}`}>
              {values.description.length}/{DESCRIPTION_MAX}
            </span>
          </div>
        </div>
        <label className="toggle">
          <input type="checkbox" role="switch" checked={values.available} onChange={(e) => set('available', e.target.checked)} />
          <span>Available to order now</span>
        </label>
      </div>
      <footer className="dialog__footer">
        {item && (
          <button type="button" className="btn btn--danger-ghost footer-start" onClick={onDelete} disabled={remove.isPending}>
            {remove.isPending ? 'Deleting…' : 'Delete item'}
          </button>
        )}
        <button type="button" className="btn btn--secondary" onClick={onDone}>
          Cancel
        </button>
        <button type="submit" className="btn btn--primary" disabled={saving}>
          {saving ? 'Saving…' : item ? 'Save changes' : 'Add item'}
        </button>
      </footer>
    </form>
  )
}
