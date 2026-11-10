import {
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react'
import { IconClose } from '@/icons'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost'

const variants: Record<Variant, string> = {
  primary:
    'bg-blood text-ink border border-blood-hover hover:bg-blood-hover active:translate-y-px shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_2px_0_rgb(0_0_0/0.4)]',
  secondary: 'bg-raised text-ink border border-line-strong hover:border-gold active:translate-y-px',
  ghost: 'text-ink-2 hover:text-ink border border-transparent hover:border-line',
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'md' | 'lg' }) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-control font-semibold transition-[background-color,border-color,color,transform] duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-50',
        size === 'lg' ? 'min-h-14 px-5 text-lg' : 'min-h-12 px-4 text-base',
        variants[variant],
        className,
      )}
      {...rest}
    />
  )
}

export function Card({
  children,
  className,
  as: Tag = 'section',
  ...rest
}: {
  children: ReactNode
  className?: string
  as?: 'section' | 'div' | 'article' | 'li'
  'aria-labelledby'?: string
}) {
  return (
    <Tag
      className={cn('rounded-card border border-line bg-surface p-4 sm:p-5', className)}
      {...rest}
    >
      {children}
    </Tag>
  )
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn('text-sm font-semibold tracking-[0.08em] text-ember uppercase', className)}>
      {children}
    </p>
  )
}

export function PageHeader({
  title,
  lead,
  eyebrow,
}: {
  title: string
  lead?: ReactNode
  eyebrow?: string
}) {
  return (
    <header className="mb-6">
      {eyebrow && <Eyebrow className="mb-1">{eyebrow}</Eyebrow>}
      <h1 className="text-title text-ink">{title}</h1>
      {lead && <p className="mt-2 max-w-prose text-ink-2">{lead}</p>}
    </header>
  )
}

export function NumberField({
  label,
  hint,
  error,
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string }) {
  const id = useId()
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-semibold text-ink-2">
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        aria-invalid={error ? true : undefined}
        aria-describedby={hint || error ? `${id}-desc` : undefined}
        className="min-h-12 w-full rounded-control border border-line-strong bg-bg px-3 text-lg text-ink tabular placeholder:text-ink-2/60 focus-visible:border-gold"
        {...rest}
      />
      {(hint ?? error) && (
        <p id={`${id}-desc`} className={cn('text-sm', error ? 'text-blood-text' : 'text-ink-2')}>
          {error ?? hint}
        </p>
      )}
    </div>
  )
}

export function TextField({
  label,
  hint,
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  const id = useId()
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-semibold text-ink-2">
        {label}
      </label>
      <input
        id={id}
        aria-describedby={hint ? `${id}-desc` : undefined}
        className="min-h-12 w-full rounded-control border border-line-strong bg-bg px-3 text-base text-ink focus-visible:border-gold"
        {...rest}
      />
      {hint && (
        <p id={`${id}-desc`} className="text-sm text-ink-2">
          {hint}
        </p>
      )}
    </div>
  )
}

export interface SegmentOption<T extends string> {
  value: T
  label: string
  icon?: ReactNode
}

/** Seletor explícito (radios de verdade), sem ciclo por toque. */
export function Segmented<T extends string>({
  legend,
  options,
  value,
  onChange,
  hideLegend,
  disabled,
}: {
  legend: string
  options: SegmentOption<T>[]
  value: T
  onChange: (v: T) => void
  hideLegend?: boolean
  disabled?: boolean
}) {
  const name = useId()
  return (
    <fieldset disabled={disabled} className="min-w-0">
      <legend className={cn('mb-1.5 text-sm font-semibold text-ink-2', hideLegend && 'sr-only')}>
        {legend}
      </legend>
      <div
        className="grid gap-1 rounded-control border border-line-strong bg-bg p-1"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        {options.map((o) => (
          <label
            key={o.value}
            className={cn(
              'relative flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-[3px] px-2 text-center text-sm font-semibold transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-gold',
              value === o.value
                ? 'bg-raised text-ink shadow-[inset_0_0_0_1px_var(--color-gold)]'
                : 'text-ink-2 hover:text-ink',
            )}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            {o.icon}
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

/** Diálogo nativo: folha inferior no celular, centralizado no desktop. */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  // Toque no fundo fecha; Esc já fecha pelo próprio <dialog>.
  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
      className="m-0 mt-auto w-full max-w-none rounded-t-dialog border border-b-0 border-line-strong bg-surface p-0 text-ink backdrop:bg-black/70 sm:m-auto sm:max-w-md sm:rounded-dialog sm:border-b"
    >
      <div className="px-4 pt-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:px-6 sm:pb-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id={titleId} className="text-heading">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="-mr-2 inline-flex size-12 items-center justify-center rounded-control text-ink-2 hover:text-ink"
            aria-label="Fechar"
          >
            <IconClose />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  )
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-sm font-semibold text-ink-2">{label}</p>
      <p className="text-number font-bold text-ink tabular">{value}</p>
      {hint && <p className="text-sm text-ink-2">{hint}</p>}
    </div>
  )
}
