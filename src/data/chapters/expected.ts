/**
 * Mapa volume → capítulos da edição (tankōbon, que a Panini Edição de Luxo segue).
 * Conferido em nov/2026 na lista de capítulos da Wikipédia em inglês.
 * Os 16 primeiros capítulos usam a numeração "0-01" a "0-16". O capítulo 083
 * não existe em volume (foi deixado fora do tankōbon), por isso o 13 pula de 082 pra 084.
 * Total: 16 + 381 = 397 capítulos.
 */
export const expectedChapters: Record<number, string[]> = {
  1: ['0-01', '0-02', '0-03'],
  2: ['0-04', '0-05'],
  3: ['0-06', '0-07', '0-08', '0-09'],
  4: ['0-10', '0-11', '0-12', '0-13', '0-14'],
  5: ['0-15', '0-16', ...range(1, 6)],
  6: range(7, 16),
  7: range(17, 26),
  8: range(27, 36),
  9: range(37, 47),
  10: range(48, 58),
  11: range(59, 69),
  12: range(70, 79),
  13: ['80', '81', '82', ...range(84, 91)],
  14: range(92, 99),
  15: range(100, 110),
  16: range(111, 121),
  17: range(122, 132),
  18: range(133, 143),
  19: range(144, 154),
  20: range(155, 165),
  21: range(166, 176),
  22: range(177, 186),
  23: range(187, 196),
  24: range(197, 206),
  25: range(207, 216),
  26: range(217, 226),
  27: range(227, 236),
  28: range(237, 246),
  29: range(247, 256),
  30: range(257, 266),
  31: range(267, 276),
  32: range(277, 286),
  33: range(287, 296),
  34: range(297, 306),
  35: range(307, 315),
  36: range(316, 324),
  37: range(325, 333),
  38: range(334, 342),
  39: range(343, 350),
  40: range(351, 357),
  41: range(358, 364),
  42: range(365, 373),
  43: range(374, 382),
}

function range(from: number, to: number): string[] {
  return Array.from({ length: to - from + 1 }, (_, i) => String(from + i))
}

export const totalChapters = Object.values(expectedChapters).reduce((s, c) => s + c.length, 0)
