import type { ButtonHTMLAttributes } from 'react'

export type ButtonTone = 'primary' | 'quiet'

const TONES: Record<ButtonTone, string> = {
  primary: 'bg-accent text-canvas hover:bg-accent-hover',
  quiet: 'border border-line-strong text-ink-muted hover:bg-raised hover:text-ink',
}

const BASE = 'rounded-control px-4 py-2 text-sm font-medium font-ui transition-colors '
  + 'disabled:cursor-not-allowed disabled:opacity-40'

export function Button({ tone = 'quiet', className = '', ...rest }: {
  tone?: ButtonTone
} & ButtonHTMLAttributes<HTMLButtonElement>): React.JSX.Element {
  return <button type="button" className={`${BASE} ${TONES[tone]} ${className}`} {...rest} />
}
