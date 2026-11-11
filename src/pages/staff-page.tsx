import { useId, useRef, useState, type FormEvent } from 'react'
import { ApiError } from '../api/client'
import { useInviteStaff, useStaff, useUpdateStaff } from '../api/queries'
import type { StaffInvite, StaffMember, StaffRole } from '../api/types'
import { hasErrors, mergeErrors, validateInvite, type FieldErrors } from '../api/validation'
import { PageHeader } from '../components/app-shell'
import { EmptyState, ErrorState, LoadingState, errorMessage } from '../components/async-state'
import { ConfirmDialog, Dialog } from '../components/dialog'
import { PlusIcon } from '../components/icons'
import { useToast } from '../components/toast'
import { formatLastActive } from '../lib/format'
import { useHotkey } from '../lib/hotkeys'
import { useNow } from '../lib/use-now'

type AssignableRole = StaffInvite['role']

const roleInfo: Record<StaffRole, { label: string; access: string }> = {
  owner: { label: 'Owner', access: 'Everything, including billing' },
  manager: { label: 'Manager', access: 'Orders, menu, sales and staff' },
  cashier: { label: 'Cashier', access: 'Orders and today’s sales' },
  server: { label: 'Server', access: 'Orders for their tables' },
  kitchen: { label: 'Kitchen', access: 'Order queue only' },
}
const assignableRoles: AssignableRole[] = ['manager', 'cashier', 'server', 'kitchen']
const statusOrder: Record<StaffMember['status'], number> = { active: 0, invited: 1, deactivated: 2 }

export function StaffPage() {
  const staff = useStaff()
  const update = useUpdateStaff()
  const toast = useToast()
  const now = useNow(60_000)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [confirming, setConfirming] = useState<StaffMember | null>(null)

  useHotkey('n', () => setInviteOpen(true))

  const members = [...(staff.data ?? [])].sort((a, b) => statusOrder[a.status] - statusOrder[b.status] || a.name.localeCompare(b.name))
  const activeCount = staff.data?.filter((m) => m.status === 'active').length ?? 0
  const invitedCount = staff.data?.filter((m) => m.status === 'invited').length ?? 0

  function changeRole(member: StaffMember, role: StaffRole) {
    const previous = member.role
    // mutateAsync so each change gets its own toast even if several rows change quickly.
    update.mutateAsync({ id: member.id, patch: { role } }).then(
      () =>
        toast({
          tone: 'success',
          message: `${member.name} is now ${roleInfo[role].label}`,
          action: { label: 'Undo', onAction: () => update.mutate({ id: member.id, patch: { role: previous } }) },
        }),
      (error: unknown) => toast({ tone: 'error', message: `Role not changed: ${errorMessage(error)}` }),
    )
  }

  function setActive(member: StaffMember, active: boolean) {
    const previous = member.status
    update.mutateAsync({ id: member.id, patch: { status: active ? 'active' : 'deactivated' } }).then(
      () =>
        toast({
          tone: 'success',
          message: active ? `${member.name} can sign in again` : `${member.name} deactivated`,
          action: { label: 'Undo', onAction: () => update.mutate({ id: member.id, patch: { status: previous } }) },
        }),
      (error: unknown) => toast({ tone: 'error', message: `Couldn't update ${member.name}: ${errorMessage(error)}` }),
    )
  }

  return (
    <div className="page">
      <PageHeader
        title="Staff"
        description={staff.data ? `${activeCount} active · ${invitedCount} invitation${invitedCount === 1 ? '' : 's'} pending` : 'Who can sign in, and what they can do.'}
        actions={
          <button type="button" className="btn btn--primary" onClick={() => setInviteOpen(true)}>
            <PlusIcon /> Invite staff <kbd aria-hidden="true">N</kbd>
          </button>
        }
      />

      {staff.isPending ? (
        <LoadingState label="Loading staff…" rows={5} />
      ) : staff.isError ? (
        <ErrorState title="Couldn't load staff" error={staff.error} onRetry={() => staff.refetch()} retrying={staff.isFetching} />
      ) : members.length === 0 ? (
        <EmptyState title="No staff yet" text="Invite your team so they can take orders." />
      ) : (
        <div className="table-card">
          <table className="table staff-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Role</th>
                <th scope="col">Status</th>
                <th scope="col" className="hide-tablet">
                  Last active
                </th>
                <th scope="col">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const locked = member.role === 'owner'
                const deactivated = member.status === 'deactivated'
                return (
                  <tr key={member.id} className={deactivated ? 'is-muted' : undefined} data-member={member.name}>
                    <td>
                      <div className="cell-stack">
                        <span className="cell-title">{member.name}</span>
                        <span className="cell-detail">{member.email}</span>
                      </div>
                    </td>
                    <td>
                      {locked ? (
                        <span className="role-fixed">{roleInfo.owner.label}</span>
                      ) : (
                        <select
                          className="select-inline"
                          aria-label={`Role for ${member.name}`}
                          value={member.role}
                          disabled={deactivated}
                          onChange={(e) => changeRole(member, e.target.value as StaffRole)}
                        >
                          {assignableRoles.map((role) => (
                            <option key={role} value={role}>
                              {roleInfo[role].label}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td>
                      <span className={`badge badge--${member.status}`}>
                        {member.status === 'active' ? 'Active' : member.status === 'invited' ? 'Invited' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="hide-tablet muted">{formatLastActive(member.lastActiveAt, now)}</td>
                    <td className="align-right">
                      {locked ? null : deactivated ? (
                        <button type="button" className="btn btn--secondary" onClick={() => setActive(member, true)}>
                          Reactivate
                        </button>
                      ) : (
                        <button type="button" className="btn btn--danger-ghost" onClick={() => setConfirming(member)} aria-label={`Deactivate ${member.name}`}>
                          Deactivate
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={confirming !== null}
        title={`Deactivate ${confirming?.name ?? ''}?`}
        body={
          <p>
            They are signed out on every device and can't sign in until you reactivate them. Their past orders and sales stay in the
            reports.
          </p>
        }
        confirmLabel="Deactivate"
        onCancel={() => setConfirming(null)}
        onConfirm={() => {
          if (confirming) setActive(confirming, false)
          setConfirming(null)
        }}
      />

      <Dialog open={inviteOpen} title="Invite staff" onClose={() => setInviteOpen(false)}>
        {inviteOpen && <InviteForm onDone={() => setInviteOpen(false)} />}
      </Dialog>
    </div>
  )
}

const inviteFieldOrder: Array<keyof StaffInvite> = ['name', 'email', 'role']

function InviteForm({ onDone }: { onDone: () => void }) {
  const invite = useInviteStaff()
  const toast = useToast()
  const formId = useId()
  const formRef = useRef<HTMLFormElement>(null)
  const [values, setValues] = useState<{ name: string; email: string; role: AssignableRole | '' }>({ name: '', email: '', role: '' })
  const [touched, setTouched] = useState<Partial<Record<keyof StaffInvite, boolean>>>({})
  const [submitted, setSubmitted] = useState(false)
  const [serverErrors, setServerErrors] = useState<FieldErrors<StaffInvite>>({})
  const [formError, setFormError] = useState<string>()

  const clientErrors = validateInvite(values)
  const errors = mergeErrors(clientErrors, serverErrors)
  const visibleError = (field: keyof StaffInvite) => (submitted || touched[field] ? errors[field] : undefined)

  const set = <K extends keyof typeof values>(field: K, value: (typeof values)[K]) => {
    setValues((current) => ({ ...current, [field]: value }))
    setServerErrors((current) => ({ ...current, [field]: undefined }))
    setFormError(undefined)
  }

  const focusFirstInvalid = (fieldErrors: FieldErrors<StaffInvite>) => {
    const first = inviteFieldOrder.find((field) => fieldErrors[field])
    if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus()
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if (hasErrors(clientErrors) || !values.role) {
      focusFirstInvalid(clientErrors)
      return
    }
    const payload: StaffInvite = { name: values.name.trim(), email: values.email.trim(), role: values.role }
    invite.mutate(payload, {
      onSuccess: (member) => {
        toast({ tone: 'success', message: `Invitation sent to ${member.email}` })
        onDone()
      },
      onError: (error) => {
        if (error instanceof ApiError && Object.keys(error.fieldErrors).length > 0) {
          setServerErrors(error.fieldErrors as FieldErrors<StaffInvite>)
          focusFirstInvalid(error.fieldErrors as FieldErrors<StaffInvite>)
        } else {
          setFormError(errorMessage(error))
        }
      },
    })
  }

  const describedBy = (field: keyof StaffInvite) => (visibleError(field) ? `${formId}-${field}-error` : undefined)
  const errorText = (field: keyof StaffInvite) =>
    visibleError(field) ? (
      <p id={`${formId}-${field}-error`} className="field-error">
        {visibleError(field)}
      </p>
    ) : null

  return (
    <form ref={formRef} className="form" noValidate onSubmit={onSubmit}>
      <div className="dialog__body">
        {formError && (
          <p className="form-error" role="alert">
            {formError}
          </p>
        )}
        <div className="field">
          <label htmlFor={`${formId}-name`}>Full name</label>
          <input
            id={`${formId}-name`}
            name="name"
            data-autofocus
            autoComplete="off"
            value={values.name}
            aria-invalid={visibleError('name') ? true : undefined}
            aria-describedby={describedBy('name')}
            onChange={(e) => set('name', e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, name: true }))}
          />
          {errorText('name')}
        </div>
        <div className="field">
          <label htmlFor={`${formId}-email`}>Work email</label>
          <input
            id={`${formId}-email`}
            name="email"
            type="email"
            autoComplete="off"
            value={values.email}
            aria-invalid={visibleError('email') ? true : undefined}
            aria-describedby={describedBy('email')}
            onChange={(e) => set('email', e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
          />
          {errorText('email')}
        </div>
        <fieldset className="field" aria-describedby={describedBy('role')}>
          <legend>Role</legend>
          <div className="role-options">
            {assignableRoles.map((role, index) => (
              <label key={role} className="role-option">
                <input
                  type="radio"
                  name={index === 0 ? 'role' : `role-${role}`}
                  value={role}
                  checked={values.role === role}
                  onChange={() => set('role', role)}
                />
                <span>
                  <strong>{roleInfo[role].label}</strong>
                  <span className="muted">{roleInfo[role].access}</span>
                </span>
              </label>
            ))}
          </div>
          {errorText('role')}
        </fieldset>
      </div>
      <footer className="dialog__footer">
        <button type="button" className="btn btn--secondary" onClick={onDone}>
          Cancel
        </button>
        <button type="submit" className="btn btn--primary" disabled={invite.isPending}>
          {invite.isPending ? 'Sending…' : 'Send invitation'}
        </button>
      </footer>
    </form>
  )
}
