/**
 * Calcula o preço por grama de proteína.
 *
 * Fórmula: (precoTotal / pesoTotal) × pesoPorcao / proteinaPorPorcao
 * Equivale à coluna GENERATED do Postgres: (price / weight_g * portion_g) / protein_g
 *
 * @param {number} precoTotal       - Preço total do produto (R$)
 * @param {number} pesoTotal        - Peso total da embalagem (g)
 * @param {number} pesoPorcao       - Peso de uma porção (g)
 * @param {number} proteinaPorPorcao - Proteína nessa porção (g)
 * @returns {number} Preço por grama de proteína (R$/g)
 */
export function calcularPrecoPorGrama(precoTotal, pesoTotal, pesoPorcao, proteinaPorPorcao) {
  return (precoTotal / pesoTotal * pesoPorcao) / proteinaPorPorcao
}

/**
 * Formata o valor para exibição (4 casas decimais).
 * @param {number} valor
 * @returns {string} ex: "R$ 0,0342/g"
 */
export function formatarPreco(valor) {
  return `R$ ${valor.toFixed(4)}/g`
}

/**
 * Valida os dados numéricos antes de salvar.
 * @returns {string|null} mensagem de erro ou null se válido
 */
export function validarCampos({ preco, peso, porcao, proteina }) {
  if ([preco, peso, porcao, proteina].some(v => !v || isNaN(v) || v <= 0)) {
    return 'Todos os campos numéricos devem ser maiores que zero.'
  }
  if (proteina > porcao) {
    return 'A proteína por porção não pode ser maior que o peso da porção.'
  }
  if (preco > 10000) {
    return 'Preço parece muito alto. Verifique o valor.'
  }
  if (peso > 50000) {
    return 'Peso total parece muito alto. Verifique o valor em gramas.'
  }
  return null
}
