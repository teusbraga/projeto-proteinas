import { t } from './i18n.js'

/**
 * Calcula o preço por grama de proteína.
 *
 * Fórmula: (precoTotal / pesoTotal) × pesoPorcao / proteinaPorPorcao
 * Equivale à coluna GENERATED do Postgres: (price / weight_g * portion_g) / protein_g
 *
 * @param {number} precoTotal       - Preço total do produto
 * @param {number} pesoTotal        - Peso total da embalagem (g)
 * @param {number} pesoPorcao       - Peso de uma porção (g)
 * @param {number} proteinaPorPorcao - Proteína nessa porção (g)
 * @returns {number} Preço por grama de proteína
 */
export function calcularPrecoPorGrama(precoTotal, pesoTotal, pesoPorcao, proteinaPorPorcao) {
  return (precoTotal / pesoTotal * pesoPorcao) / proteinaPorPorcao
}

/**
 * Retorna o símbolo correspondente à moeda ISO.
 * @param {string} [currency='BRL']
 * @returns {string} ex: "R$", "$", "€"
 */
export function getCurrencySymbol(currency = 'BRL') {
  const symbols = {
    BRL: 'R$',
    USD: '$',
    EUR: '€',
  }
  return symbols[currency?.toUpperCase()] || 'R$'
}

/**
 * Formata o valor para exibição (4 casas decimais) com a moeda adequada.
 * @param {number} valor
 * @param {string} [currency='BRL']
 * @returns {string} ex: "R$ 0.0342/g" ou "$ 0.0342/g"
 */
export function formatarPreco(valor, currency = 'BRL') {
  const symbol = getCurrencySymbol(currency)
  return `${symbol} ${Number(valor).toFixed(4)}/g`
}

/**
 * Valida os dados numéricos antes de salvar, retornando mensagens internacionalizadas.
 * @returns {string|null} mensagem de erro ou null se válido
 */
export function validarCampos({ preco, peso, porcao, proteina }) {
  if ([preco, peso, porcao, proteina].some(v => !v || isNaN(v) || v <= 0)) {
    return t('valRequiredNumbers')
  }
  if (proteina > porcao) {
    return t('valProteinGreater')
  }
  if (preco > 10000) {
    return t('valPriceHigh')
  }
  if (peso > 50000) {
    return t('valWeightHigh')
  }
  return null
}
