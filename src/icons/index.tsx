import type { SVGProps } from 'react'

/**
 * Ícones originais do diário. Traço 1.75 em 24x24, currentColor.
 * Nada aqui vem da obra: vela, estrada, estante, pena, cadeado genérico.
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

/** Vela acesa: "Hoje". */
export function IconCandle(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 2.5c1.6 1.8 2.3 3.2 2.3 4.4a2.3 2.3 0 0 1-4.6 0c0-1.2.7-2.6 2.3-4.4Z" />
      <path d="M8.5 11h7v9.5h-7z" />
      <path d="M8.5 13.5c1.2.8 1.8-.6 3 .2" />
      <path d="M5.5 21h13" />
    </Svg>
  )
}

/** Estrada com marco: "Jornada". */
export function IconRoad(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M9 3 4 21" />
      <path d="M15 3l5 18" />
      <path d="M12 5v2.5M12 11v2.5M12 17v2.5" />
    </Svg>
  )
}

/** Estante: "Coleção". */
export function IconShelf(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 20.5h18" />
      <path d="M5 20.5V7h3.2v13.5" />
      <path d="M8.2 20.5V4.5h3.3v16" />
      <path d="m13.2 8.2 3-.8 3.4 12.6-3 .8z" />
      <path d="M5 10h3.2M8.2 8h3.3" />
    </Svg>
  )
}

/** Pena: "Sobre". */
export function IconQuill(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M20 3.5C12.5 4.5 7.5 9.5 6 17l-1.5 4" />
      <path d="M20 3.5c-.8 5.6-4.4 10.4-11 12.4" />
      <path d="M9.8 11.2h4.8M7.8 14.4h3.8" />
    </Svg>
  )
}

export function IconLock(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="5" y="10.5" width="14" height="10" rx="1.5" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
      <path d="M12 14.5v2.5" />
    </Svg>
  )
}

export function IconPlus(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  )
}

export function IconCheck(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </Svg>
  )
}

export function IconClose(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Svg>
  )
}

export function IconDownload(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 4v11M7 10.5l5 5 5-5" />
      <path d="M4.5 19.5h15" />
    </Svg>
  )
}

export function IconUpload(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 16V5M7 9.5l5-5 5 5" />
      <path d="M4.5 19.5h15" />
    </Svg>
  )
}

export function IconExternal(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M14 4.5h5.5V10" />
      <path d="M19.5 4.5 11 13" />
      <path d="M18 14v5.5H4.5V6H10" />
    </Svg>
  )
}

/** Brasa: três chamas pequenas. */
export function IconEmber(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3c2.6 3 4 5.2 4 7.6a4 4 0 0 1-8 0C8 8.2 9.4 6 12 3Z" />
      <path d="M12 9.5c1 1.2 1.5 2.1 1.5 3a1.5 1.5 0 0 1-3 0c0-.9.5-1.8 1.5-3Z" />
      <path d="M6 20.5h12" />
      <path d="M8 17.5h8" />
    </Svg>
  )
}

/** Livro aberto: volume. */
export function IconBook(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 6.5c-2.2-1.6-5-2-8-1.5v13c3-.5 5.8-.1 8 1.5 2.2-1.6 5-2 8-1.5V5c-3-.5-5.8-.1-8 1.5Z" />
      <path d="M12 6.5v13" />
    </Svg>
  )
}

export function IconChevron(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="m9 5 7 7-7 7" />
    </Svg>
  )
}

export function IconUndo(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </Svg>
  )
}

/**
 * Marco de ferro da trilha. Estados: lido (brasa acesa), atual, bloqueado.
 * Desenho original: poste de pedra/ferro com faixa rebitada.
 */
export function Milestone({
  state,
  size = 44,
}: {
  state: 'done' | 'current' | 'locked'
  size?: number
}) {
  const plate = state === 'locked' ? '#29231d' : '#3a322a'
  const band = state === 'locked' ? '#3a322a' : state === 'done' ? '#dca45c' : '#bfa269'
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" aria-hidden="true" focusable="false">
      <path
        d="M12 40V14c0-6 4-10 10-10s10 4 10 10v26z"
        fill={plate}
        stroke="#897965"
        strokeWidth="1.5"
      />
      <rect x="10" y="20" width="24" height="6" rx="1" fill={band} />
      <circle cx="14" cy="23" r="1.2" fill="#141210" />
      <circle cx="30" cy="23" r="1.2" fill="#141210" />
      <path d="M8 40h28" stroke="#897965" strokeWidth="1.5" strokeLinecap="round" />
      {state === 'done' && (
        <path
          d="M22 8.5c1.6 1.8 2.4 3.2 2.4 4.4a2.4 2.4 0 0 1-4.8 0c0-1.2.8-2.6 2.4-4.4Z"
          fill="#dca45c"
        />
      )}
      {state === 'current' && (
        <circle cx="22" cy="12" r="2.5" fill="none" stroke="#bfa269" strokeWidth="1.5" />
      )}
      {state === 'locked' && (
        <path
          d="M18.5 33.5h7v-4h-7zM19.8 29.5v-1.5a2.2 2.2 0 0 1 4.4 0v1.5"
          fill="none"
          stroke="#897965"
          strokeWidth="1.25"
        />
      )}
    </svg>
  )
}

/** Marca do app: livro aberto com uma chama em cima. */
export function AppMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <rect
        x="1"
        y="1"
        width="46"
        height="46"
        rx="8"
        fill="#1e1a16"
        stroke="#897965"
        strokeWidth="1.5"
      />
      <path
        d="M24 6.5c3 3.3 4.4 5.8 4.4 8a4.4 4.4 0 0 1-8.8 0c0-2.2 1.4-4.7 4.4-8Z"
        fill="#dca45c"
      />
      <path d="M24 12c1.3 1.5 2 2.6 2 3.5a2 2 0 0 1-4 0c0-.9.7-2 2-3.5Z" fill="#862e32" />
      <path
        d="M24 25c-4-2.6-8.8-3.2-14-2.4v15.6c5.2-.8 10 0 14 2.6 4-2.6 8.8-3.4 14-2.6V22.6c-5.2-.8-10-.2-14 2.4Z"
        fill="#29231d"
        stroke="#f2e8d5"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M24 25v15.8" stroke="#f2e8d5" strokeWidth="1.75" />
    </svg>
  )
}

/** Pergaminho com interrogação: "Dúvidas". */
export function IconQuestion(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 3.5h10.5a2 2 0 0 1 2 2V18a2.5 2.5 0 0 1-2.5 2.5H7.5A2.5 2.5 0 0 1 5 18V4.5" />
      <path d="M9.6 9a2.4 2.4 0 1 1 3.4 2.2c-.7.3-1 .8-1 1.5v.6" />
      <path d="M12 16.6v.1" strokeWidth={2.4} />
    </Svg>
  )
}

/** Carta de leitor: "Ficha". */
export function IconCard(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6.5 3h11l1.5 2.5V19l-7 2.5L5 19V5.5z" />
      <path d="M9 9.5h3M9 12.5h6M9 15.5h6" />
      <path d="M14.5 6.5v3" />
    </Svg>
  )
}
