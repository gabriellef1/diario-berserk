import type { ReactElement, SVGProps } from 'react'
import type { Reaction } from '@/domain/schema'

/**
 * Ícones originais das reações rápidas. Mesmo traço do resto (1.75 em 24x24,
 * currentColor). Formas genéricas: estouro, ondas, rosto simples, corda
 * esticada, gota, brasa. Nada de emoji do sistema.
 */
type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function Svg({ size = 24, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  )
}

/** Estouro: linhas saindo de um ponto. */
export function IconImpact(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="m12 7.5 1.4 3.1 3.1-1.4-1.4 3.1 3.1 1.4-3.4.6.6 3.4-2.8-2-1.6 3-1.1-3.3-3.3.9 1.9-2.9-2.9-1.9 3.4-.4-.4-3.4 2.9 1.9z" />
      <path d="M12 2.5v2M3.5 6l1.6 1.2M20.5 6l-1.6 1.2M2.5 15h2M19.5 15h2" />
    </Svg>
  )
}

/** Arrepio: três ondas subindo. */
export function IconShiver(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 20.5c-1.5-2 1.5-3.5 0-5.5s1.5-3.5 0-5.5 1.5-3.5 0-5.5" />
      <path d="M12 20.5c-1.5-2 1.5-3.5 0-5.5s1.5-3.5 0-5.5 1.5-3.5 0-5.5" />
      <path d="M18 20.5c-1.5-2 1.5-3.5 0-5.5s1.5-3.5 0-5.5 1.5-3.5 0-5.5" />
    </Svg>
  )
}

/** Risada: rosto simples, olhos fechados em arco e boca aberta. */
export function IconLaugh(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8 10.2c.6-.9 1.6-.9 2.2 0M13.8 10.2c.6-.9 1.6-.9 2.2 0" />
      <path d="M8 13.5h8a4 4 0 0 1-8 0Z" />
    </Svg>
  )
}

/** Tensão: corda esticada entre dois pinos, com fios se soltando. */
export function IconTension(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="4" cy="12" r="1.6" />
      <circle cx="20" cy="12" r="1.6" />
      <path d="M5.6 12h12.8" />
      <path d="m10.5 12-1-2.5M13.5 12l1 2.5M12 12l.4-3" />
    </Svg>
  )
}

/** Tristeza: gota caindo sobre uma linha. */
export function IconSadness(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3c2.8 3.6 4.5 6.3 4.5 8.6a4.5 4.5 0 0 1-9 0C7.5 9.3 9.2 6.6 12 3Z" />
      <path d="M10.2 12.4a2 2 0 0 0 1.6 1.8" />
      <path d="M6 20.5h12" />
    </Svg>
  )
}

/** Brasa: carvão com uma chama. */
export function IconEmberReaction(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3.5c1.9 2.2 2.9 3.8 2.9 5.3a2.9 2.9 0 0 1-5.8 0c0-1.5 1-3.1 2.9-5.3Z" />
      <path d="M5 17.5c0-2 2-3.5 4-3.5h6c2 0 4 1.5 4 3.5v1a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" />
      <path d="M9 17h1.5M13 18.2h2" />
    </Svg>
  )
}

/** Chama pra nota de 1 a 5. Preenchida quando ativa. */
export function IconFlame({ filled, ...p }: IconProps & { filled?: boolean }) {
  return (
    <Svg {...p}>
      <path
        d="M12 3c3 3.4 4.8 6 4.8 8.8a4.8 4.8 0 0 1-9.6 0c0-1.5.6-2.9 1.6-4.3.3 1.3 1 2 1.8 2.2C10.4 7.6 10.9 5.4 12 3Z"
        fill={filled ? 'currentColor' : 'none'}
      />
      <path d="M6.5 20.5h11" />
    </Svg>
  )
}

const icons: Record<Reaction, (p: IconProps) => ReactElement> = {
  impacto: IconImpact,
  arrepio: IconShiver,
  risada: IconLaugh,
  tensao: IconTension,
  tristeza: IconSadness,
  brasa: IconEmberReaction,
}

/** Ícone de uma reação do schema. */
export function ReactionIcon({ reaction, ...p }: IconProps & { reaction: Reaction }) {
  const Icon = icons[reaction]
  return <Icon {...p} />
}
