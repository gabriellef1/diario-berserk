import { useId, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

/** Campo de texto longo, no mesmo estilo do TextField (label sempre visível). */
export function TextArea({
  label,
  hint,
  className,
  rows = 3,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string }) {
  const id = useId()
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-semibold text-ink-2">
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        aria-describedby={hint ? `${id}-desc` : undefined}
        className="min-h-24 w-full resize-y rounded-control border border-line-strong bg-bg px-3 py-2.5 text-base text-ink placeholder:text-ink-2/60 focus-visible:border-gold"
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

/** Select com label visível, mesmo visual dos campos. */
export function SelectField({
  label,
  hint,
  className,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string; hint?: string }) {
  const id = useId()
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-semibold text-ink-2">
        {label}
      </label>
      <select
        id={id}
        aria-describedby={hint ? `${id}-desc` : undefined}
        className="min-h-12 w-full rounded-control border border-line-strong bg-bg px-3 text-base text-ink focus-visible:border-gold"
        {...rest}
      >
        {children}
      </select>
      {hint && (
        <p id={`${id}-desc`} className="text-sm text-ink-2">
          {hint}
        </p>
      )}
    </div>
  )
}
