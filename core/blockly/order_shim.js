/**
 * Compatibilidade com a API antiga do gerador Python do Blockly (pré-v9).
 *
 * A partir do Blockly v9+, as constantes de precedência ORDER_* deixaram de
 * ser propriedades de Blockly.Python e passaram a ser um enum `Order`
 * exportado separadamente (exposto no browser como `window.python.Order`
 * pelo wrapper UMD de python_compressed.js).
 *
 * satblocks/generator_python.js (os ~145 geradores oficiais) e o motor de
 * síntese do SatBlocks Studio (js/sat_studio_core.js, js/sat_ai_synthesizer.js)
 * já foram migrados para o formato nativo do Blockly v13 (`Blockly.Python.
 * forBlock['nome'] = function(block) {...}` + `python.Order.*`) — este shim
 * NÃO é mais necessário para eles. Ele continua carregado, e continua
 * necessário, só por causa de blocos customizados salvos no `localStorage`
 * de quem os criou no SatBlocks Studio ANTES desta migração (ainda no
 * formato antigo `Blockly.Python['nome'] = function(block) {...}` +
 * `Blockly.Python.ORDER_*`) — são `eval()`'d de volta no runtime tal como
 * foram salvos, e sem este shim eles simplesmente parariam de gerar código.
 * Remover este arquivo só é seguro se algum dia se migrar/invalidar todo
 * `localStorage.satblocks_custom_blocks` já salvo por usuários.
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
  //
  // Os ~145 geradores oficiais (satblocks/generator_python.js) e o motor de
  // síntese do SatBlocks Studio já foram migrados para escrever direto em
  // `forBlock`. O único caso que ainda precisa deste sync é um bloco
  // customizado antigo, criado no Studio ANTES da migração e salvo no
  // `localStorage` de alguém no padrão antigo (`Blockly.Python['nome'] =
  // function(block) {...}`, propriedade direta, fora de `forBlock`) — ao
  // ser recarregado via eval(), continuaria invisível para blockToCode()
  // sem este sync. Interceptamos workspaceToCode()/blockToCode() para
  // sincronizar automaticamente qualquer função própria de Blockly.Python
  // (padrão antigo, se houver) para dentro de forBlock antes de cada
  // geração de código.
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
