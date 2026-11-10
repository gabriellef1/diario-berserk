import type { ReactNode, SVGProps } from 'react'
import type { Achievement } from '@/domain/achievements'

/**
 * Ícones das conquistas e emblema da ficha. Desenhos originais, traço 1.75
 * em 24x24, currentColor. Nada da obra: marco, pena, chama, estante, selo, tocha.
 */
type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function Svg({ size = 24, children, ...rest }: IconProps & { children: ReactNode }) {
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

/** Marco de pedra com faixa rebitada. */
export function IconMarco(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M7.5 20.5V9a4.5 4.5 0 0 1 9 0v11.5" />
      <path d="M6.5 12h11v3h-11z" />
      <path d="M4.5 20.5h15" />
    </Svg>
  )
}

/** Pena sobre tinteiro. */
export function IconPena(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M19.5 3c-6 1-10 5.2-11 11.5L8 17" />
      <path d="M19.5 3c-.7 4.8-3.6 8.7-9 10.4" />
      <path d="M12.6 8.8h3.6" />
      <path d="M5 17.5h7l-1 3H6z" />
    </Svg>
  )
}

/** Chama simples. */
export function IconChama(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 2.5c3.4 3.6 5.5 6.6 5.5 10a5.5 5.5 0 0 1-11 0c0-1.9.7-3.6 2-5.3.3 1.6 1 2.6 2 3.1C10.3 7.6 10.8 5 12 2.5Z" />
      <path d="M12 13c1.2 1.3 1.8 2.3 1.8 3.3a1.8 1.8 0 0 1-3.6 0c0-1 .6-2 1.8-3.3Z" />
    </Svg>
  )
}

/** Estante com volumes em pé. */
export function IconEstante(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 20.5h18M3 11.5h18" />
      <path d="M5 11.5v-6h2.5v6M7.5 11.5V4h2.5v7.5" />
      <path d="m12 11.5 1-6.2 2.4.4-1 6" />
      <path d="M5 20.5v-6h2.5v6M7.5 20.5v-5h2.5v5M10 20.5v-6.5h2.5v6.5" />
    </Svg>
  )
}

/** Selo de cera com marca de visto. */
export function IconSelo(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3.5 14 5l2.4-.3 1 2.2 2.1 1.2-.4 2.4L20.5 12l-1.4 1.6.4 2.4-2.1 1.2-1 2.2L14 19l-2 1.5L10 19l-2.4.4-1-2.2-2.1-1.2.4-2.4L3.5 12l1.4-1.6-.4-2.4 2.1-1.2 1-2.2L10 5z" />
      <path d="m8.8 12.2 2.2 2.2 4.2-4.6" />
    </Svg>
  )
}

/** Tocha: cabo, bojo e chama. */
export function IconTocha(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 2.5c2 2.2 3 4 3 5.4a3 3 0 0 1-6 0c0-1.4 1-3.2 3-5.4Z" />
      <path d="M8 11.5h8l-1.5 3h-5z" />
      <path d="M10.5 14.5 11 21.5h2l.5-7" />
    </Svg>
  )
}

const byKind: Record<Achievement['icon'], (p: IconProps) => ReactNode> = {
  marco: IconMarco,
  pena: IconPena,
  chama: IconChama,
  estante: IconEstante,
  selo: IconSelo,
  tocha: IconTocha,
}

export function AchievementIcon({ kind, ...p }: IconProps & { kind: Achievement['icon'] }) {
  const Icon = byKind[kind]
  return <Icon {...p} />
}

/**
 * Emblema da ficha: livro aberto com uma chama, dentro de um anel rebitado.
 * Cores fixas (não currentColor) pra sair igual no PNG.
 */
export function CardEmblem({ size = 112 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 112 112" aria-hidden="true" focusable="false">
      <circle cx="56" cy="56" r="50" fill="#1b1714" stroke="#bfa269" strokeWidth="2" />
      <circle
        cx="56"
        cy="56"
        r="43"
        fill="none"
        stroke="#897965"
        strokeWidth="1"
        strokeDasharray="2 5"
      />
      {[0, 60, 120, 180, 240, 300].map((deg) => {
        const rad = (deg * Math.PI) / 180
        return (
          <circle
            key={deg}
            cx={56 + Math.sin(rad) * 50}
            cy={56 - Math.cos(rad) * 50}
            r="2.6"
            fill="#bfa269"
            stroke="#141210"
            strokeWidth="1"
          />
        )
      })}
      {/* chama */}
      <path
        d="M56 18c5.6 6.2 8.4 11 8.4 15.2a8.4 8.4 0 0 1-16.8 0c0-4.2 2.8-9 8.4-15.2Z"
        fill="#dca45c"
      />
      <path
        d="M56 28c2.4 2.7 3.6 4.7 3.6 6.4a3.6 3.6 0 0 1-7.2 0c0-1.7 1.2-3.7 3.6-6.4Z"
        fill="#862e32"
      />
      {/* livro aberto */}
      <path
        d="M56 52c-7.6-5-16.6-6.2-26.5-4.6v29.4c9.9-1.6 18.9-.4 26.5 4.6 7.6-5 16.6-6.2 26.5-4.6V47.4C72.6 45.8 63.6 47 56 52Z"
        fill="#29231d"
        stroke="#f2e8d5"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M56 52v29.4" stroke="#f2e8d5" strokeWidth="2" />
      <path
        d="M35 55c5.2-.6 10.2.2 15 2.4M35 61.5c5.2-.6 10.2.2 15 2.4M35 68c5.2-.6 10.2.2 15 2.4M77 55c-5.2-.6-10.2.2-15 2.4M77 61.5c-5.2-.6-10.2.2-15 2.4M77 68c-5.2-.6-10.2.2-15 2.4"
        stroke="#897965"
        strokeWidth="1.25"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}
