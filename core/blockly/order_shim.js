/**
 * Compatibilidade com a API antiga do gerador Python do Blockly (pré-v9).
 *
 * A partir do Blockly v9+, as constantes de precedência ORDER_* deixaram de
 * ser propriedades de Blockly.Python e passaram a ser um enum `Order`
 * exportado separadamente (exposto no browser como `window.python.Order`
 * pelo wrapper UMD de python_compressed.js). Todo o gerador customizado do
 * SatBlocks (satblocks/generator_python.js, ~145 funções) e o motor de
 * síntese do SatBlocks Studio (js/sat_studio_core.js) foram escritos contra
 * o nome antigo Blockly.Python.ORDER_*. Este shim recria essas propriedades
 * como aliases do enum novo, para que todo o código existente continue
 * funcionando sem precisar editar cada ponto de uso individualmente.
 */
(function () {
  if (typeof Blockly === 'undefined' || !Blockly.Python) {
    console.warn('[order_shim] Blockly.Python não encontrado — carregue este script depois de python_compressed.js.');
    return;
  }
  var Order = (typeof python !== 'undefined' && python.Order) || null;
  if (!Order) {
    console.warn('[order_shim] Enum Order não encontrado em window.python.Order.');
    return;
  }

  var P = Blockly.Python;
  P.ORDER_ATOMIC = Order.ATOMIC;
  P.ORDER_COLLECTION = Order.COLLECTION;
  P.ORDER_STRING_CONVERSION = Order.STRING_CONVERSION;
  P.ORDER_MEMBER = Order.MEMBER;
  P.ORDER_FUNCTION_CALL = Order.FUNCTION_CALL;
  P.ORDER_EXPONENTIATION = Order.EXPONENTIATION;
  P.ORDER_UNARY_SIGN = Order.UNARY_SIGN;
  P.ORDER_BITWISE_NOT = Order.BITWISE_NOT;
  P.ORDER_MULTIPLICATIVE = Order.MULTIPLICATIVE;
  P.ORDER_ADDITIVE = Order.ADDITIVE;
  P.ORDER_BITWISE_SHIFT = Order.BITWISE_SHIFT;
  P.ORDER_BITWISE_AND = Order.BITWISE_AND;
  P.ORDER_BITWISE_XOR = Order.BITWISE_XOR;
  P.ORDER_BITWISE_OR = Order.BITWISE_OR;
  P.ORDER_RELATIONAL = Order.RELATIONAL;
  P.ORDER_LOGICAL_NOT = Order.LOGICAL_NOT;
  P.ORDER_LOGICAL_AND = Order.LOGICAL_AND;
  P.ORDER_LOGICAL_OR = Order.LOGICAL_OR;
  P.ORDER_CONDITIONAL = Order.CONDITIONAL;
  P.ORDER_LAMBDA = Order.LAMBDA;
  P.ORDER_NONE = Order.NONE;

  // ==========================================================
  // Compatibilidade com o registro de geradores por bloco.
  //
  // Achado ao investigar o erro "Python generator does not know how to
  // generate code for block type X": a partir do Blockly >= v9, blockToCode()
  // só procura a função geradora em `this.forBlock[tipo]` (um objeto próprio
  // por instância, Object.create(null)) — NUNCA em `this[tipo]` diretamente.
  // Todo o gerador customizado do SatBlocks (satblocks/generator_python.js,
  // ~145 blocos) e o motor de síntese do SatBlocks Studio foram escritos no
  // padrão antigo `Blockly.Python['nome_do_bloco'] = function(block) {...}`,
  // que grava a função como propriedade direta de Blockly.Python, não dentro
  // de `forBlock`. Sem isso, TODO bloco customizado falha ao gerar código —
  // só aparece um erro por vez porque workspaceToCode() aborta no primeiro.
  //
  // Em vez de editar as ~145 atribuições (e as que o Studio cria em runtime
  // via eval), interceptamos workspaceToCode()/blockToCode() para sincronizar
  // automaticamente qualquer função própria de Blockly.Python (velho padrão)
  // para dentro de forBlock (novo padrão) bem antes de cada geração de código.
  // ==========================================================
  function syncPythonGeneratorForBlock() {
    if (!P.forBlock) return;
    for (var key in P) {
      if (Object.prototype.hasOwnProperty.call(P, key) && typeof P[key] === 'function') {
        P.forBlock[key] = P[key];
      }
    }
  }

  if (P.forBlock && typeof P.workspaceToCode === 'function' && typeof P.blockToCode === 'function') {
    var origWorkspaceToCode = P.workspaceToCode.bind(P);
    var origBlockToCode = P.blockToCode.bind(P);

    P.workspaceToCode = function (ws) {
      syncPythonGeneratorForBlock();
      return origWorkspaceToCode(ws);
    };

    P.blockToCode = function (block, optThisOnly) {
      syncPythonGeneratorForBlock();
      return origBlockToCode(block, optThisOnly);
    };
  }
})();
