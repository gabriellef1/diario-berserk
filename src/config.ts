/**
 * Configuração central. Pra trocar de edição, adicione uma entrada em `editions`
 * e mude `defaultEditionId`. O editionId fica salvo nos dados dele, então a troca
 * nunca reinterpreta em silêncio o que já foi registrado.
 */
export interface Edition {
  id: string
  name: string
  publisher: string
  totalVolumes: number
  /** Último volume já lançado. Acima disso: "em breve". */
  releasedUpTo: number
  /** Página da série na loja oficial. Sem link se vazio. */
  storeUrl: string
  storeName: string
}

export const editions: Record<string, Edition> = {
  // Pesquisa de nov/2026: 43 volumes no Japão; Panini Edição de Luxo com o
  // vol. 43 em pré-venda (2ª quinzena de dez/2026).
  'panini-luxo': {
    id: 'panini-luxo',
    name: 'Edição de Luxo',
    publisher: 'Panini',
    totalVolumes: 43,
    releasedUpTo: 42,
    storeUrl: 'https://panini.com.br/planet-manga/berserk',
    storeName: 'loja da Panini',
  },
}

export const defaultEditionId = 'panini-luxo'

export const config = {
  readerName: 'Guilherme',
  appName: 'Diário do Guilherme',
  giftMessage: '',
  signature: 'feito pela Gabs',
  chatgptUrl: 'https://chatgpt.com/',
  /** Função na Vercel que chama o Claude. Vazio = botão do Claude não aparece. */
  askUrl: 'https://diario-berserk-api.vercel.app/api/ask',
  /** "Faltam ~N páginas" aparece abaixo deste limite. */
  lowPagesWarning: 40,
  /** Dia do aniversário de namoro (MM-DD). A entrada mostra a mensagem nesse dia. */
  anniversaryDay: '06-02',
  /** Vazio = não aparece. */
  anniversaryMessage: '',
}

export function getEdition(id: string): Edition {
  const edition = editions[id] ?? editions[defaultEditionId]
  if (!edition) throw new Error(`Edição desconhecida: ${id}`)
  return edition
}
