/**
 * ============================================================================
 * SatBlocks Studio Pro — Core Engine & Block Synthesizer
 * ============================================================================
 * Orquestrador do Studio: síntese por prompt, resolução de drivers, editor
 * bidirecional, injeção na IDE e exportador universal.
 */

window.SatStudioCore = (function() {
  'use strict';

  let previewWorkspace = null;
  let currentBlockConfig = null;

  // Nomes de blocos oficiais do SatBlocks (gerado a partir de
  // satblocks/block_definitions.js) — um bloco custom não pode usar um
  // desses nomes, ou sobrescreveria silenciosamente o bloco oficial
  // naquele navegador ao carregar a IDE principal.
  let reservedBlockNames = new Set();
  fetch('studio/reserved_block_names.json')
    .then(r => r.json())
    .then(list => { reservedBlockNames = new Set(list); })
    .catch(() => {});

  // Catálogo de blocos existentes para servir como Template Base
  const BASE_TEMPLATES = [
    {
      id: 'template_i2c_sensor',
      name: '🌡️ Sensor I2C com Leitura Numérica (ex: SHT20 / BMP280)',
      category: 'Sensores Ambientais',
      color: '#06b6d4',
      blockType: 'output_number',
      blockName: 'sensor_i2c_read',
      label: 'Ler Sensor I2C',
      fields: [
        { type: 'dropdown', name: 'METRIC', label: 'Grandeza:', options: [['Temperatura (°C)', 'temp'], ['Umidade (%)', 'humidity'], ['Pressão (hPa)', 'pressure']] },
        { type: 'input_value', name: 'ADDR', label: 'Endereço I2C:', check: 'String', defaultShadow: '"0x40"' }
      ],
      pyTemplate: (blockName) => 
        `Blockly.Python.forBlock['${blockName}'] = function(block) {\n` +
        `  Blockly.Python.definitions_['import_i2c'] = 'from machine import Pin, I2C';\n` +
        `  const metric = block.getFieldValue('METRIC') || 'temp';\n` +
        `  const addr = Blockly.Python.valueToCode(block, 'ADDR', python.Order.NONE) || '"0x40"';\n` +
        `  return [\`sensor.read_\${metric}()\`, python.Order.FUNCTION_CALL];\n` +
        `};`
    },
    {
      id: 'template_actuator_multiline',
      name: '⚙️ Atuador / Dispositivo em Múltiplas Linhas (ex: Ejeção / Relé / Servo)',
      category: 'Atuadores & Ejeção',
      color: '#ef4444',
      blockType: 'statement',
      blockName: 'atuador_comando',
      label: '🚀 Acionar Atuador de Ejeção',
      inputsInline: false,
      fields: [
        { type: 'input_value', name: 'PIN', label: 'Pino GPIO:', check: 'Number', defaultShadow: '18' },
        { type: 'input_value', name: 'DURATION', label: 'Duração do pulso (ms):', check: 'Number', defaultShadow: '2000' },
        { type: 'dropdown', name: 'STATE', label: 'Estado:', options: [['Ligar / Ativar (HIGH)', '1'], ['Desligar (LOW)', '0']] }
      ],
      pyTemplate: (blockName) =>
        `Blockly.Python.forBlock['${blockName}'] = function(block) {\n` +
        `  Blockly.Python.definitions_['import_pin'] = 'from machine import Pin';\n` +
        `  Blockly.Python.definitions_['import_time'] = 'import time';\n` +
        `  const pin = Blockly.Python.valueToCode(block, 'PIN', python.Order.NONE) || '18';\n` +
        `  const duration = Blockly.Python.valueToCode(block, 'DURATION', python.Order.NONE) || '2000';\n` +
        `  const state = block.getFieldValue('STATE') || '1';\n` +
        `  return \`_p = Pin(\${pin}, Pin.OUT)\\n_p.value(\${state})\\ntime.sleep_ms(\${duration})\\n_p.value(0)\\n\`;\n` +
        `};`
    },
    {
      id: 'template_telecom_packet',
      name: '📡 Transmissão de Pacote de Rádio / LoRa',
      category: 'Comunicação & LoRa',
      color: '#ea580c',
      blockType: 'statement',
      blockName: 'lora_transmit_custom',
      label: '📡 Transmitir Pacote Customizado',
      inputsInline: false,
      fields: [
        { type: 'input_value', name: 'PAYLOAD', label: 'Dados / Payload:', check: null, defaultShadow: '"OBSAT_DATA"' },
        { type: 'dropdown', name: 'FREQ', label: 'Frequência:', options: [['915.0 MHz (Brasil)', '915.0'], ['433.0 MHz', '433.0']] },
        { type: 'dropdown', name: 'SF', label: 'Spreading Factor:', options: [['SF7 (Rápido)', '7'], ['SF9 (Médio)', '9'], ['SF12 (Longo Alcance)', '12']] }
      ],
      pyTemplate: (blockName) =>
        `Blockly.Python.forBlock['${blockName}'] = function(block) {\n` +
        `  const payload = Blockly.Python.valueToCode(block, 'PAYLOAD', python.Order.NONE) || '"OBSAT"';\n` +
        `  const sf = block.getFieldValue('SF') || '7';\n` +
        `  return \`lora.set_sf(\${sf})\\nlora.send(str(\${payload}))\\n\`;\n` +
        `};`
    },
    {
      id: 'template_adc_voltage',
      name: '⚡ Medidor de Tensão Analógica / Bateria (ADC)',
      category: 'Energia & EPS',
      color: '#f59e0b',
      blockType: 'output_number',
      blockName: 'read_battery_voltage',
      label: '🔋 Ler Tensão da Bateria (V)',
      fields: [
        { type: 'input_value', name: 'PIN', label: 'Pino ADC:', check: 'Number', defaultShadow: '36' },
        { type: 'input_value', name: 'FACTOR', label: 'Fator Divisor de Tensão:', check: 'Number', defaultShadow: '2.0' }
      ],
      pyTemplate: (blockName) =>
        `Blockly.Python.forBlock['${blockName}'] = function(block) {\n` +
        `  Blockly.Python.definitions_['import_adc'] = 'from machine import Pin, ADC';\n` +
        `  const pin = Blockly.Python.valueToCode(block, 'PIN', python.Order.NONE) || '36';\n` +
        `  const factor = Blockly.Python.valueToCode(block, 'FACTOR', python.Order.NONE) || '2.0';\n` +
        `  return [\`round((ADC(Pin(\${pin})).read() / 4095.0 * 3.3) * \${factor}, 2)\`, python.Order.FUNCTION_CALL];\n` +
        `};`
    }
  ];

  /**
   * Inicialização do Workspace de Prévia do Studio
   */
  function initPreviewWorkspace() {
    const previewDiv = document.getElementById('previewDiv');
    if (!previewDiv) return;

    previewWorkspace = Blockly.inject(previewDiv, {
      media: 'media/',
      trashcan: false,
      scrollbars: true,
      sounds: false,
      zoom: {
        controls: true,
        wheel: true,
        startScale: 1.0,
        maxScale: 2.0,
        minScale: 0.5
      },
      grid: {
        spacing: 20,
        length: 3,
        colour: '#cbd5e1',
        snap: true
      }
    });

    // Carrega um template inicial padrão
    loadBaseTemplate('template_i2c_sensor');
  }

  /**
   * Carrega um template base
   */
  function loadBaseTemplate(templateId) {
    const template = BASE_TEMPLATES.find(t => t.id === templateId) || BASE_TEMPLATES[0];
    applyBlockConfiguration({
      blockName: template.blockName,
      label: template.label,
      category: template.category,
      color: template.color,
      blockType: template.blockType,
      inputsInline: template.inputsInline !== false,
      fields: JSON.parse(JSON.stringify(template.fields)),
      pyCodeGenerator: template.pyTemplate(template.blockName),
      driverInfo: null
    });
  }

  /**
   * Síntese Completa de Bloco a partir de Prompt (IA Online Gemini ou Parser Semântico Local)
   */
  async function generateFromPrompt(promptText) {
    if (!promptText || !promptText.trim()) return;

    if (window.SatAISynthesizer) {
      try {
        const aiResult = await window.SatAISynthesizer.synthesize(promptText);
        if (aiResult) {
          applyBlockConfiguration({
            blockName: aiResult.blockName || 'sat_bloco_custom',
            label: aiResult.label || '🛰️ Bloco Customizado',
            category: aiResult.category || 'Sensores Ambientais',
            color: aiResult.color || '#06b6d4',
            blockType: aiResult.blockType || 'output_number',
            inputsInline: aiResult.inputsInline !== false,
            fields: aiResult.fields || [],
            pyCodeGenerator: aiResult.pyGenerator || '',
            driverInfo: aiResult.driverFilename ? {
              id: aiResult.blockName,
              name: aiResult.label,
              driverFilename: aiResult.driverFilename,
              driverPyCode: aiResult.driverPyCode,
              protocol: 'MicroPython Driver'
            } : null
          });
          return;
        }
      } catch (err) {
        console.error('Erro na síntese inteligente:', err);
      }
    }
  }

  /**
   * Sintetizador Universal MicroPython para Bloco Blockly (Python-to-Block Synthesizer)
   * Converte qualquer trecho ou driver MicroPython em bloco visual, gerador e toolbox
   */
  // Sequências de escape do Python (ex: \xE3, \r\n — comuns em drivers I2C)
  // e crases não podem entrar cruas num template literal JavaScript: o
  // JS interpretaria \x/\r/\n ele mesmo antes do código nem chegar na
  // placa, corrompendo o driver silenciosamente. Escapa ANTES de inserir
  // qualquer placeholder ${...} nosso (que devem continuar sem escape).
  function escapeForTemplateLiteral(text) {
    return text.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
  }

  function synthesizeFromPython(pyCode, options = {}) {
    if (!pyCode || !pyCode.trim()) {
      alert('Por favor, digite ou cole um trecho de código MicroPython.');
      return false;
    }

    const cleanCode = pyCode.trim();
    const lines = cleanCode.split('\n').map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('#'));
    const isSingleLine = lines.length === 1;

    // 1. Detecção de imports necessários
    const imports = [];
    if (cleanCode.includes('from machine import') || cleanCode.includes('import machine')) {
      const match = cleanCode.match(/from machine import ([^\n]+)/);
      if (match) {
        imports.push(`from machine import ${match[1]}`);
      } else {
        imports.push('import machine');
      }
    } else {
      if (cleanCode.includes('Pin(')) imports.push('from machine import Pin');
      if (cleanCode.includes('I2C(')) imports.push('from machine import I2C');
      if (cleanCode.includes('ADC(')) imports.push('from machine import ADC');
      if (cleanCode.includes('PWM(')) imports.push('from machine import PWM');
      if (cleanCode.includes('UART(')) imports.push('from machine import UART');
    }
    if (cleanCode.includes('time.') || cleanCode.includes('sleep')) imports.push('import time');
    if (cleanCode.includes('math.')) imports.push('import math');
    if (cleanCode.includes('uos.') || cleanCode.includes('os.')) imports.push('import os');

    // 2. Heurística de Tipo de Retorno vs Comando
    let blockType = 'statement';
    let blockColor = '#0284c7';
    let defaultLabel = '🛰️ Executar Comando MicroPython';
    let category = options.category || 'Atuadores & Ejeção';

    const isExpression = isSingleLine && !cleanCode.includes('=') && !cleanCode.startsWith('def ') && !cleanCode.startsWith('for ') && !cleanCode.startsWith('if ');
    const isGetter = isExpression || (isSingleLine && (cleanCode.includes('.read(') || cleanCode.includes('.read_') || cleanCode.includes('.temperature') || cleanCode.includes('.pressure') || cleanCode.includes('.humidity') || cleanCode.includes('.voltage') || cleanCode.includes('.distance') || cleanCode.includes('.acceleration') || cleanCode.includes('.gyro')));

    if (isGetter || options.forceOutput) {
      blockType = 'output_number';
      blockColor = '#06b6d4';
      category = 'Sensores Ambientais';
      defaultLabel = '🌡️ Leitura de Sensor';
    }

    // 3. Extração semântica de parâmetros: coleta uma lista de substituições
    // { regex, pyParamName, makeReplacement(target) } a partir do código
    // ORIGINAL (não escapado, pra números/textos combinarem certinho).
    // `makeReplacement` recebe o texto final a inserir no lugar do valor
    // literal — ou o nome puro do parâmetro Python (função auxiliar) ou o
    // placeholder ${var} JS (bloco inline) — ver uso mais abaixo.
    const fields = [];
    const substitutions = [];

    // 3a. Pinos GPIO — TODOS os distintos, não só o primeiro (ex: I2C tem
    // SCL + SDA; um atuador pode ter pino + pino de status). Tenta herdar
    // o nome da variável Python (ex: "scl = Pin(22)" -> campo "SCL_PIN").
    const pinRegex = /(?:(\w+)\s*=\s*)?Pin\((\d+)\b/g;
    const seenPins = new Set();
    let pinCount = 0;
    let pm;
    while ((pm = pinRegex.exec(cleanCode)) !== null) {
      const varHint = pm[1];
      const pinNum = pm[2];
      if (seenPins.has(pinNum)) continue;
      seenPins.add(pinNum);
      pinCount++;
      const fieldName = varHint ? `${varHint.toUpperCase()}_PIN` : (pinCount === 1 ? 'PIN' : `PIN_${pinCount}`);
      const label = varHint ? `Pino ${varHint.toUpperCase()}:` : (pinCount === 1 ? 'Pino GPIO:' : `Pino GPIO ${pinCount}:`);
      fields.push({ type: 'input_value', name: fieldName, label, check: 'Number', defaultShadow: pinNum });
      substitutions.push({
        regex: new RegExp(`Pin\\(${pinNum}\\b`, 'g'),
        pyParamName: fieldName.toLowerCase(),
        makeReplacement: (target) => `Pin(${target}`
      });
    }
    if (pinCount > 0) {
      defaultLabel = blockType === 'output_number' ? '📊 Leitura ADC / Pino GPIO' : '⚙️ Acionar Pino GPIO';
    }

    // 3b. Tempo de espera em milissegundos
    const sleepMsMatch = cleanCode.match(/sleep_ms\((\d+)\)/);
    if (sleepMsMatch) {
      const ms = sleepMsMatch[1];
      fields.push({ type: 'input_value', name: 'DELAY_MS', label: 'Tempo (ms):', check: 'Number', defaultShadow: ms });
      substitutions.push({
        regex: new RegExp(`sleep_ms\\(${ms}\\)`, 'g'),
        pyParamName: 'delay_ms',
        makeReplacement: (target) => `sleep_ms(${target})`
      });
    }

    // 3c. Tempo de espera em segundos
    const sleepSecMatch = cleanCode.match(/sleep\((\d+(\.\d+)?)\)/);
    if (sleepSecMatch && !sleepMsMatch) {
      const sec = sleepSecMatch[1];
      fields.push({ type: 'input_value', name: 'DELAY_SEC', label: 'Tempo (segundos):', check: 'Number', defaultShadow: sec });
      substitutions.push({
        regex: new RegExp(`sleep\\(${sec}\\)`, 'g'),
        pyParamName: 'delay_sec',
        makeReplacement: (target) => `sleep(${target})`
      });
    }

    // 3d. Endereço I2C
    const i2cAddrMatch = cleanCode.match(/0x[0-9a-fA-F]{2}/);
    if (i2cAddrMatch) {
      const addrHex = i2cAddrMatch[0];
      fields.push({ type: 'input_value', name: 'ADDR', label: 'Endereço I2C:', check: 'String', defaultShadow: `"${addrHex}"` });
      substitutions.push({
        regex: new RegExp(addrHex, 'g'),
        pyParamName: 'addr',
        makeReplacement: (target) => target
      });
    }

    // 3e. Mensagem / Payload em Strings
    const stringMatch = cleanCode.match(/"([^"\n]{2,30})"/);
    if (stringMatch && !stringMatch[1].startsWith('0x')) {
      const strVal = stringMatch[1];
      fields.push({ type: 'input_value', name: 'TEXT_VAL', label: 'Texto / Mensagem:', check: 'String', defaultShadow: `"${strVal}"` });
      substitutions.push({
        regex: new RegExp(`"${strVal}"`, 'g'),
        pyParamName: 'text_val',
        makeReplacement: (target) => `str(${target})`
      });
    }

    // Identificador único do bloco
    let safeName = options.blockName || ('sat_custom_' + Date.now().toString(36).slice(-5));
    safeName = safeName.toLowerCase().replace(/[^a-z0-9_]/g, '_');

    // Montagem do gerador Python em JS
    let pyGenCode = `Blockly.Python.forBlock['${safeName}'] = function(block) {\n`;
    imports.forEach((imp, i) => {
      pyGenCode += `  Blockly.Python.definitions_['import_custom_${i}'] = '${imp}';\n`;
    });

    fields.forEach(f => {
      const varName = f.name.toLowerCase();
      if (f.type === 'dropdown') {
        pyGenCode += `  const ${varName} = block.getFieldValue('${f.name}') || '${f.options[0][1]}';\n`;
      } else {
        const fallback = f.defaultShadow ? `${f.defaultShadow}` : "''";
        pyGenCode += `  const ${varName} = Blockly.Python.valueToCode(block, '${f.name}', python.Order.NONE) || ${fallback};\n`;
      }
    });

    if (blockType.startsWith('output_') && !isSingleLine) {
      // Corpo com mais de uma linha não pode virar uma expressão Python
      // direta — haveria várias instruções onde o Blockly só espera uma
      // expressão. Empacota como função auxiliar definida uma única vez
      // (mesmo padrão dos drivers oficiais do projeto, ex: _sat_bmp_read()),
      // com os valores variáveis virando PARÂMETROS PYTHON de verdade (não
      // interpolação JS, já que a função é definida uma vez só).
      const helperName = `_${safeName}_helper`;
      let helperBody = cleanCode;
      substitutions.forEach(s => {
        helperBody = helperBody.replace(s.regex, s.makeReplacement(s.pyParamName));
      });

      // Se o trecho não tiver um "return" explícito mas terminar
      // atribuindo a uma variável, assume que é essa variável que se quer
      // devolver — comum em snippets colados de drivers (lê, guarda,
      // "esquece" de retornar).
      if (!/\breturn\b/.test(helperBody)) {
        const bodyLines = helperBody.split('\n').map(l => l.trim()).filter(Boolean);
        const lastLine = bodyLines[bodyLines.length - 1] || '';
        const assignMatch = lastLine.match(/^(\w+)\s*=[^=]/);
        if (assignMatch) {
          helperBody += `\nreturn ${assignMatch[1]}`;
        }
      }

      const paramList = substitutions.map(s => s.pyParamName).join(', ');
      const indentedBody = helperBody.split('\n').map(l => '    ' + l).join('\n');
      const helperDef = `def ${helperName}(${paramList}):\n${indentedBody}`;
      // JSON.stringify escapa aspas/quebras de linha/barras corretamente —
      // mais seguro aqui do que tentar aninhar outro template literal.
      pyGenCode += `  Blockly.Python.definitions_['func_${safeName}'] = ${JSON.stringify(helperDef)};\n`;

      const callArgs = substitutions.map(s => '${' + s.pyParamName + '}').join(', ');
      pyGenCode += `  return [\`${helperName}(${callArgs})\`, python.Order.FUNCTION_CALL];\n`;
    } else if (blockType.startsWith('output_')) {
      let parameterizedPy = escapeForTemplateLiteral(cleanCode);
      substitutions.forEach(s => {
        parameterizedPy = parameterizedPy.replace(s.regex, s.makeReplacement('${' + s.pyParamName + '}'));
      });
      // Se tiver atribuição do tipo `leitura = expressao`, pegamos a expressão
      if (parameterizedPy.includes('=') && !parameterizedPy.includes('==')) {
        const parts = parameterizedPy.split('=');
        parameterizedPy = parts.slice(1).join('=').trim();
      }
      pyGenCode += `  return [\`${parameterizedPy}\`, python.Order.FUNCTION_CALL];\n`;
    } else {
      let parameterizedPy = escapeForTemplateLiteral(cleanCode);
      substitutions.forEach(s => {
        parameterizedPy = parameterizedPy.replace(s.regex, s.makeReplacement('${' + s.pyParamName + '}'));
      });
      pyGenCode += `  return \`${parameterizedPy}\\n\`;\n`;
    }
    pyGenCode += `};`;

    const config = {
      blockName: safeName,
      label: options.label || defaultLabel,
      category: category,
      color: options.color || blockColor,
      blockType: blockType,
      inputsInline: fields.length <= 2,
      fields: fields,
      pyCodeGenerator: pyGenCode,
      driverInfo: {
        id: safeName,
        name: options.label || defaultLabel,
        driverFilename: `${safeName}.py`,
        driverPyCode: cleanCode,
        protocol: 'MicroPython Snippet'
      }
    };

    applyBlockConfiguration(config);
    return true;
  }

  /**
   * Aplica a configuração do bloco e atualiza os 4 quadrantes e a prévia
   */
  function applyBlockConfiguration(config) {
    currentBlockConfig = config;

    // 1. Constrói a Definição JavaScript do Bloco (Blockly.Blocks)
    const blockJsCode = generateBlockJsDefinition(config);

    // 2. Constrói o Fragmento XML para Toolbox
    const toolboxXmlCode = generateToolboxXmlSnippet(config);

    // 3. Registra dinamicamente no runtime do Blockly
    try {
      eval(blockJsCode);
      eval(config.pyCodeGenerator);
    } catch (err) {
      console.warn('Erro ao avaliar código dinâmico do bloco:', err);
    }

    // 4. Renderiza na Prévia Interativa
    renderInPreview(config);

    // 5. Atualiza os painéis de código
    updateCodePanels(blockJsCode, config.pyCodeGenerator, toolboxXmlCode, config.driverInfo);
  }

  /**
   * Gera o código JavaScript de definição do bloco (Blockly.Blocks['...'])
   */
  function generateBlockJsDefinition(cfg) {
    let code = `Blockly.Blocks['${cfg.blockName}'] = {\n`;
    code += `  init: function() {\n`;
    code += `    this.setColour('${cfg.color}');\n`;
    code += `    this.appendDummyInput()\n`;
    code += `        .appendField('${cfg.label}');\n`;

    cfg.fields.forEach(f => {
      if (f.type === 'dropdown') {
        const opts = JSON.stringify(f.options);
        code += `    this.appendDummyInput()\n`;
        code += `        .appendField('${f.label}')\n`;
        code += `        .appendField(new Blockly.FieldDropdown(${opts}), '${f.name}');\n`;
      } else if (f.type === 'input_value') {
        const checkStr = f.check ? `'${f.check}'` : 'null';
        code += `    this.appendValueInput('${f.name}')\n`;
        code += `        .setCheck(${checkStr})\n`;
        code += `        .appendField('${f.label}');\n`;
      }
    });

    code += `    this.setInputsInline(${cfg.inputsInline ? 'true' : 'false'});\n`;

    if (cfg.blockType === 'output_number') {
      code += `    this.setOutput(true, 'Number');\n`;
    } else if (cfg.blockType === 'output_string') {
      code += `    this.setOutput(true, 'String');\n`;
    } else if (cfg.blockType === 'output_boolean') {
      code += `    this.setOutput(true, 'Boolean');\n`;
    } else {
      code += `    this.setPreviousStatement(true, null);\n`;
      code += `    this.setNextStatement(true, null);\n`;
    }

    const tooltipText = (cfg.tooltip && cfg.tooltip.trim()) || 'Bloco gerado via SatBlocks Studio Pro.';
    code += `    this.setTooltip(${JSON.stringify(tooltipText)});\n`;
    code += `  }\n`;
    code += `};\n`;

    return code;
  }

  /**
   * Gera o trecho XML do toolbox com blocos shadow configurados
   */
  function generateToolboxXmlSnippet(cfg) {
    let xml = `<block type="${cfg.blockName}">\n`;
    cfg.fields.forEach(f => {
      if (f.type === 'input_value' && f.defaultShadow !== undefined) {
        if (f.check === 'Number' || (!isNaN(f.defaultShadow) && !f.defaultShadow.startsWith('"'))) {
          xml += `  <value name="${f.name}">\n`;
          xml += `    <shadow type="math_number">\n`;
          xml += `      <field name="NUM">${f.defaultShadow}</field>\n`;
          xml += `    </shadow>\n`;
          xml += `  </value>\n`;
        } else {
          const raw = f.defaultShadow.replace(/^['"]|['"]$/g, '');
          xml += `  <value name="${f.name}">\n`;
          xml += `    <shadow type="text">\n`;
          xml += `      <field name="TEXT">${raw}</field>\n`;
          xml += `    </shadow>\n`;
          xml += `  </value>\n`;
        }
      }
    });
    xml += `</block>`;
    return xml;
  }

  /**
   * Instancia o bloco no Workspace de Prévia
   */
  function renderInPreview(cfg) {
    if (!previewWorkspace) return;
    previewWorkspace.clear();

    try {
      const block = previewWorkspace.newBlock(cfg.blockName);
      block.initSvg();
      block.render();
      block.moveBy(40, 40);

      // Atualiza o código Python gerado no console de saída
      updatePythonOutput();

      previewWorkspace.addChangeListener(() => {
        updatePythonOutput();
      });
    } catch (e) {
      console.error('Erro ao renderizar bloco no preview:', e);
    }
  }

  /**
   * Escape HTML básico para prevenir injeção
   */
  function escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /**
   * Realce de Sintaxe para JavaScript (Blockly.Blocks)
   */
  function highlightJavaScript(code) {
    if (!code) return '';
    const JS_KEYWORDS = new Set(['function', 'return', 'this', 'const', 'let', 'var', 'new', 'if', 'else', 'true', 'false', 'null', 'undefined']);
    const JS_BLOCKLY_METHODS = new Set(['Blockly', 'Blocks', 'Python', 'FieldDropdown', 'appendDummyInput', 'appendValueInput', 'appendField', 'setColour', 'setOutput', 'setTooltip', 'setInputsInline', 'setPreviousStatement', 'setNextStatement', 'setCheck', 'ORDER_NONE', 'ORDER_FUNCTION_CALL', 'ORDER_ATOMIC', 'init', 'valueToCode', 'getFieldValue']);

    return code.split('\n').map(line => {
      const tokenRegex = /(\/\/[^\n]*|\/\*.*?\*\/)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(\b0x[0-9a-fA-F]+\b|\b\d+(?:\.\d+)?\b)|(\b[a-zA-Z_$][a-zA-Z0-9_$]*\b)|(\s+|[^\s\w#"'`]+)/g;
      return line.replace(tokenRegex, (match, comment, str, num, ident) => {
        if (comment) return `<span class="term-comment">${escapeHtml(comment)}</span>`;
        if (str) return `<span class="term-str">${escapeHtml(str)}</span>`;
        if (num) return `<span class="term-num">${escapeHtml(num)}</span>`;
        if (ident) {
          if (JS_KEYWORDS.has(ident)) return `<span class="term-keyword">${escapeHtml(ident)}</span>`;
          if (JS_BLOCKLY_METHODS.has(ident)) return `<span class="term-func">${escapeHtml(ident)}</span>`;
          return `<span class="term-dim">${escapeHtml(ident)}</span>`;
        }
        return escapeHtml(match);
      });
    }).join('\n');
  }

  /**
   * Realce de Sintaxe para MicroPython
   */
  function highlightPython(code) {
    if (!code) return '';
    const PY_KEYWORDS = new Set(['import', 'from', 'def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'try', 'except', 'pass', 'with', 'as', 'and', 'or', 'not', 'in', 'is', 'lambda', 'None', 'True', 'False', 'global']);
    const PY_MODULES = new Set(['Pin', 'I2C', 'SPI', 'UART', 'ADC', 'PWM', 'time', 'machine', 'math', 'os', 'sys', 'json', 'ujson', 'urequests', 'VL53L0X', 'VEML6075', 'INA219', 'BME680_I2C', 'MAX30102', 'Servo']);
    const PY_FUNCS = new Set(['read', 'write', 'sleep_ms', 'sleep_us', 'ticks_ms', 'ticks_diff', 'print', 'len', 'range', 'str', 'int', 'float', 'round', 'dict', 'list', 'setup', 'configure', 'write_angle', 'value']);

    return code.split('\n').map(line => {
      const tokenRegex = /(#[^\n]*)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|"""[\s\S]*?"""|'''[\s\S]*?''')|(\b0x[0-9a-fA-F]+\b|\b\d+(?:\.\d+)?\b)|(\b[a-zA-Z_][a-zA-Z0-9_]*\b)|(\s+|[^\s\w#"'`]+)/g;
      return line.replace(tokenRegex, (match, comment, str, num, ident) => {
        if (comment) return `<span class="term-comment">${escapeHtml(comment)}</span>`;
        if (str) return `<span class="term-str">${escapeHtml(str)}</span>`;
        if (num) return `<span class="term-num">${escapeHtml(num)}</span>`;
        if (ident) {
          if (PY_KEYWORDS.has(ident)) return `<span class="term-keyword">${escapeHtml(ident)}</span>`;
          if (PY_MODULES.has(ident)) return `<span class="term-module">${escapeHtml(ident)}</span>`;
          if (PY_FUNCS.has(ident)) return `<span class="term-func">${escapeHtml(ident)}</span>`;
          return `<span class="term-dim">${escapeHtml(ident)}</span>`;
        }
        return escapeHtml(match);
      });
    }).join('\n');
  }

  /**
   * Realce de Sintaxe para XML do Toolbox
   */
  function highlightXML(code) {
    if (!code) return '';
    return code.split('\n').map(line => {
      const tokenRegex = /(<!--[\s\S]*?-->)|(<\/?[a-zA-Z0-9_-]+|\/?>)|(\b[a-zA-Z0-9_-]+(?==))|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|([^<>"'=]+)/g;
      return line.replace(tokenRegex, (match, comment, tag, attr, str, text) => {
        if (comment) return `<span class="term-comment">${escapeHtml(comment)}</span>`;
        if (tag) return `<span class="term-tag">${escapeHtml(tag)}</span>`;
        if (attr) return `<span class="term-attr">${escapeHtml(attr)}</span>`;
        if (str) return `<span class="term-str">${escapeHtml(str)}</span>`;
        if (text) return `<span class="term-dim">${escapeHtml(text)}</span>`;
        return escapeHtml(match);
      });
    }).join('\n');
  }

  /**
   * Atualiza a prévia do código Python em tempo real
   */
  function updatePythonOutput() {
    if (!previewWorkspace || !Blockly.Python) return;
    try {
      const code = Blockly.Python.workspaceToCode(previewWorkspace);
      const outEl = document.getElementById('previewPythonOutput');
      if (outEl) {
        const cleanCode = code.trim() || '# Conecte ou mova os blocos na prévia para inspecionar o código Python gerado';
        outEl.innerHTML = highlightPython(cleanCode);
        outEl.dataset.raw = cleanCode;
      }
    } catch (e) {
      // Silencioso
    }
  }

  /**
   * Atualiza os painéis de texto das 4 saídas de código com colorização
   */
  function updateCodePanels(jsDef, pyGen, toolboxXml, driverInfo) {
    const jsEl = document.getElementById('blockDefinitionOutput');
    const pyEl = document.getElementById('generatorStubOutput');
    const xmlEl = document.getElementById('toolboxSnippetOutput');
    const driverEl = document.getElementById('driverPyOutput');
    const driverTitle = document.getElementById('driverTitleBadge');

    if (jsEl) {
      jsEl.innerHTML = highlightJavaScript(jsDef);
      jsEl.dataset.raw = jsDef;
    }
    if (pyEl) {
      pyEl.innerHTML = highlightJavaScript(pyGen); // Gerador é JS que emite Python
      pyEl.dataset.raw = pyGen;
    }
    if (xmlEl) {
      xmlEl.innerHTML = highlightXML(toolboxXml);
      xmlEl.dataset.raw = toolboxXml;
    }

    if (driverEl) {
      if (driverInfo && driverInfo.driverPyCode) {
        driverEl.innerHTML = highlightPython(driverInfo.driverPyCode);
        driverEl.dataset.raw = driverInfo.driverPyCode;
        if (driverTitle) driverTitle.textContent = `Driver: ${driverInfo.driverFilename} (${driverInfo.protocol})`;
      } else {
        const noDriverMsg = '# Este bloco utiliza as bibliotecas padrão do MicroPython (machine, time, math, etc.)\n# Não requer arquivo de driver externo adicional.';
        driverEl.innerHTML = highlightPython(noDriverMsg);
        driverEl.dataset.raw = noDriverMsg;
        if (driverTitle) driverTitle.textContent = 'Driver Nativo / Sem dependência externa';
      }
    }
  }

  /**
   * Obtém o código texto atual de um painel (suporta edição manual direta)
   */
  function getEditedPanelCode(panelId) {
    const el = document.getElementById(panelId);
    if (!el) return '';
    return el.innerText !== undefined ? el.innerText.trim() : (el.textContent || '').trim();
  }

  /**
   * Validador de Segurança com 6 Travas Pré-Injeção
   */
  function validateBlockSafety(jsDef, pyGen, toolboxXml, blockName) {
    // Trava 1: Validação de Sintaxe JavaScript da Definição
    try {
      new Function('Blockly', jsDef);
    } catch (e) {
      return { valid: false, errorType: 'JS_SYNTAX', message: `Erro de Sintaxe na Definição JavaScript:\n${e.message}` };
    }

    // Trava 2: Validação de Sintaxe JavaScript do Gerador MicroPython
    try {
      new Function('Blockly', pyGen);
    } catch (e) {
      return { valid: false, errorType: 'PY_GEN_SYNTAX', message: `Erro de Sintaxe no Gerador MicroPython:\n${e.message}` };
    }

    // Trava 3: Validação de Estrutura XML do Toolbox
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(toolboxXml, "text/xml");
      const parseErrors = xmlDoc.getElementsByTagName("parsererror");
      if (parseErrors.length > 0) {
        return { valid: false, errorType: 'XML_ERROR', message: `Erro de Formatação no XML do Toolbox:\n${parseErrors[0].textContent}` };
      }
    } catch (e) {
      return { valid: false, errorType: 'XML_ERROR', message: `XML Inválido: ${e.message}` };
    }

    // Trava 4: Validação de Registro e Renderização no Runtime Blockly
    try {
      eval(jsDef);
      eval(pyGen);

      if (!Blockly.Blocks[blockName]) {
        return { valid: false, errorType: 'REGISTRY_ERROR', message: `O bloco '${blockName}' não foi registrado em Blockly.Blocks.` };
      }

      // Testa criação e descarte seguro em workspace isolado
      if (previewWorkspace) {
        const tempBlock = previewWorkspace.newBlock(blockName);
        tempBlock.initSvg();
        // Aceita tanto o formato moderno (forBlock, usado pelo Studio a partir
        // desta versão) quanto o legado (Blockly.Python['nome'] direto, ainda
        // usado por blocos custom antigos salvos no localStorage de quem
        // criou antes desta migração) — o order_shim.js sincroniza um no
        // outro a cada chamada de blockToCode().
        if (Blockly.Python && (Blockly.Python.forBlock[blockName] || Blockly.Python[blockName])) {
          if (!Blockly.Python.definitions_) Blockly.Python.definitions_ = Object.create(null);
          Blockly.Python.blockToCode(tempBlock);
        }
        tempBlock.dispose(false);
      }
    } catch (e) {
      return { valid: false, errorType: 'RENDER_ERROR', message: `Falha na renderização ou geração de código do bloco:\n${e.message}` };
    }

    // Trava 5: Validação de Nome e Padrões OBSAT
    if (!blockName || !/^[a-zA-Z0-9_]+$/.test(blockName)) {
      return { valid: false, errorType: 'NAME_ERROR', message: 'O nome do bloco deve conter apenas letras, números e underlines.' };
    }

    // Trava 6: Colisão com bloco oficial do SatBlocks — sem isso, um bloco
    // custom chamado, por exemplo, "sat_wifi_connect" sobrescreveria
    // silenciosamente o bloco oficial de mesmo nome ao carregar a IDE
    // principal nesse mesmo navegador.
    if (reservedBlockNames.has(blockName)) {
      return {
        valid: false,
        errorType: 'NAME_COLLISION',
        message: `"${blockName}" já é o nome de um bloco oficial do SatBlocks. Escolha outro nome para o seu bloco customizado.`
      };
    }

    return { valid: true };
  }

  /**
   * Recompila a prévia viva a partir do código editado manualmente nos painéis
   */
  function recompileFromEditedPanels() {
    const jsDef = getEditedPanelCode('blockDefinitionOutput');
    const pyGen = getEditedPanelCode('generatorStubOutput');
    const toolboxXml = getEditedPanelCode('toolboxSnippetOutput');
    const blockName = currentBlockConfig ? currentBlockConfig.blockName : 'bloco_custom';

    const check = validateBlockSafety(jsDef, pyGen, toolboxXml, blockName);
    if (!check.valid) {
      alert(`⚠️ Travas de Segurança Detectaram um Erro:\n\n${check.message}`);
      return false;
    }

    try {
      eval(jsDef);
      eval(pyGen);
      renderInPreview(currentBlockConfig);
      return true;
    } catch (e) {
      alert(`Erro ao recompilar bloco: ${e.message}`);
      return false;
    }
  }

  /**
   * Injeta o bloco criado diretamente na IDE SatBlocks com verificação rigorosa das 6 travas
   */
  function injectIntoSatBlocksIDE() {
    if (!currentBlockConfig) {
      alert('Nenhum bloco configurado para injeção.');
      return false;
    }

    const jsDef = getEditedPanelCode('blockDefinitionOutput') || generateBlockJsDefinition(currentBlockConfig);
    const pyGen = getEditedPanelCode('generatorStubOutput') || currentBlockConfig.pyCodeGenerator;
    const toolboxXml = getEditedPanelCode('toolboxSnippetOutput') || generateToolboxXmlSnippet(currentBlockConfig);
    const driverPy = getEditedPanelCode('driverPyOutput');

    // Executa as 6 travas de segurança antes de permitir injeção
    const check = validateBlockSafety(jsDef, pyGen, toolboxXml, currentBlockConfig.blockName);
    if (!check.valid) {
      alert(`⛔ INJEÇÃO BLOQUEADA POR SEGURANÇA:\n\n${check.message}\n\nPor favor, corrija o código no editor antes de injetar na IDE.`);
      return false;
    }

    let customBlocks = [];
    try {
      const saved = localStorage.getItem('satblocks_custom_blocks');
      if (saved) customBlocks = JSON.parse(saved);
    } catch (e) {
      customBlocks = [];
    }

    // Remove versão anterior se já existir
    customBlocks = customBlocks.filter(b => b.blockName !== currentBlockConfig.blockName);
    customBlocks.push({
      ...currentBlockConfig,
      jsDefinition: jsDef,
      pyCodeGenerator: pyGen,
      toolboxXml: toolboxXml,
      driverPyCode: driverPy,
      timestamp: Date.now()
    });

    localStorage.setItem('satblocks_custom_blocks', JSON.stringify(customBlocks));
    return true;
  }

  /**
   * Abre uma Issue pré-preenchida no GitHub do projeto, propondo o bloco
   * atual para avaliação da equipe antes de entrar oficialmente na
   * plataforma. Não faz nenhum commit sozinho — só prepara o texto e deixa
   * a pessoa decidir se quer mesmo enviar (precisa de conta no GitHub).
   * Isso é intencional: um "commit automático" exigiria guardar uma
   * credencial de escrita do GitHub no código do navegador, o que qualquer
   * pessoa poderia roubar e usar pra alterar o repositório.
   */
  function submitBlockForReview(authorInfo) {
    if (!currentBlockConfig) {
      alert('Crie um bloco antes de enviar para avaliação.');
      return false;
    }

    const jsDef = getEditedPanelCode('blockDefinitionOutput') || generateBlockJsDefinition(currentBlockConfig);
    const pyGen = getEditedPanelCode('generatorStubOutput') || currentBlockConfig.pyCodeGenerator;
    const toolboxXml = getEditedPanelCode('toolboxSnippetOutput') || generateToolboxXmlSnippet(currentBlockConfig);
    const driverPy = getEditedPanelCode('driverPyOutput');

    const check = validateBlockSafety(jsDef, pyGen, toolboxXml, currentBlockConfig.blockName);
    if (!check.valid) {
      alert(`⛔ Não é possível enviar: corrija primeiro o problema abaixo.\n\n${check.message}`);
      return false;
    }

    const autor = (authorInfo || '').trim() || 'Não informado';
    const title = `[Bloco Proposto] ${currentBlockConfig.label || currentBlockConfig.blockName}`;
    let body =
`### Bloco proposto via SatBlocks Studio

**Nome interno:** \`${currentBlockConfig.blockName}\`
**Categoria sugerida:** ${currentBlockConfig.category || 'Não informada'}
**Autor/Equipe:** ${autor}

> Gerado automaticamente pelo SatBlocks Studio. A equipe do SatBlocks avalia este bloco antes de incluí-lo oficialmente na plataforma — nada aqui é aplicado automaticamente.

**Definição do bloco (JS):**
\`\`\`javascript
${jsDef}
\`\`\`

**Gerador MicroPython:**
\`\`\`javascript
${pyGen}
\`\`\`

**Trecho de toolbox (XML):**
\`\`\`xml
${toolboxXml}
\`\`\`
`;

    if (driverPy && driverPy.trim()) {
      body += `\n**Driver / snippet MicroPython original:**\n\`\`\`python\n${driverPy}\n\`\`\`\n`;
    }

    const params = new URLSearchParams({
      title: title,
      body: body,
      labels: 'bloco-proposto'
    });
    const issueUrl = `https://github.com/obsat-oficial/satblocks/issues/new?${params.toString()}`;

    // URLs muito longas podem ser recusadas pelo navegador/GitHub — nesse
    // caso, copia o texto e abre a página de nova issue em branco pra
    // colar manualmente, em vez de simplesmente falhar sem explicação.
    if (issueUrl.length > 7500) {
      const fallbackText = `${title}\n\n${body}`;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(fallbackText).catch(() => {});
      }
      alert('O bloco gerou um texto muito grande para ir direto na URL. Copiei o conteúdo para a área de transferência — vou abrir uma issue em branco no GitHub, é só colar (Ctrl+V) no corpo da issue.');
      window.open('https://github.com/obsat-oficial/satblocks/issues/new?labels=bloco-proposto', '_blank', 'noopener');
      return true;
    }

    window.open(issueUrl, '_blank', 'noopener');
    return true;
  }

  /**
   * Exporta a imagem do bloco em alta resolução (300 DPI / SVG) para qualquer finalidade
   */
  async function exportBlockImage(format = 'png') {
    if (!previewWorkspace) return;
    const topBlocks = previewWorkspace.getTopBlocks(false);
    if (!topBlocks.length) {
      alert('Nenhum bloco encontrado na área de trabalho da prévia.');
      return;
    }

    const svgEl = previewWorkspace.getCanvas();
    const bbox = svgEl.getBBox();
    const padding = 16;

    const width = bbox.width + padding * 2;
    const height = bbox.height + padding * 2;

    // Clona o SVG com estilos inline
    const clone = svgEl.cloneNode(true);
    clone.setAttribute('transform', `translate(${-bbox.x + padding}, ${-bbox.y + padding})`);

    const wrapperSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    wrapperSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    wrapperSvg.setAttribute('width', width);
    wrapperSvg.setAttribute('height', height);
    wrapperSvg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    // Injeta folha de estilos do Blockly para cores fiéis
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      .blocklyText { fill: #fff; font-family: sans-serif; font-size: 11pt; font-weight: bold; }
      .blocklyEditableText>text { fill: #000; }
      .blocklyNonEditableText>text { fill: #fff; }
      .blocklyDropdownText { fill: #000 !important; }
    `;
    wrapperSvg.appendChild(styleEl);
    wrapperSvg.appendChild(clone);

    const svgData = new XMLSerializer().serializeToString(wrapperSvg);

    if (format === 'svg') {
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      downloadBlob(blob, `${currentBlockConfig.blockName || 'bloco_satblocks'}.svg`);
      return;
    }

    // Exportação em PNG Alta Resolução (300 DPI / Fator de escala 3x)
    const scale = 3.0;
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        downloadBlob(blob, `${currentBlockConfig.blockName || 'bloco_satblocks'}_300dpi.png`);
      }, 'image/png');
    };
    img.src = url;
  }

  function downloadBlob(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  /**
   * Exporta o bloco atual para um arquivo .satblock.json — permite enviar o
   * bloco para outra pessoa (e-mail, WhatsApp, Drive etc.) sem depender do
   * botão "Enviar para Avaliação" (que abre uma Issue pública no GitHub).
   * Quem receber o arquivo usa "Importar Bloco (.json)" para carregá-lo no
   * PRÓPRIO navegador — continua sendo local-only até essa pessoa decidir
   * injetar na sua IDE ou propor para avaliação.
   */
  function exportBlockToFile() {
    if (!currentBlockConfig) {
      alert('Crie ou carregue um bloco antes de exportar.');
      return false;
    }

    const jsDef = getEditedPanelCode('blockDefinitionOutput') || generateBlockJsDefinition(currentBlockConfig);
    const pyGen = getEditedPanelCode('generatorStubOutput') || currentBlockConfig.pyCodeGenerator;
    const toolboxXml = getEditedPanelCode('toolboxSnippetOutput') || generateToolboxXmlSnippet(currentBlockConfig);
    const driverPy = getEditedPanelCode('driverPyOutput');

    const payload = {
      format: 'satblocks-studio-block-v1',
      exportedAt: new Date().toISOString(),
      config: {
        ...currentBlockConfig,
        jsDefinition: jsDef,
        pyCodeGenerator: pyGen,
        toolboxXml: toolboxXml,
        driverPyCode: driverPy
      }
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    downloadBlob(blob, `${currentBlockConfig.blockName || 'bloco_satblocks'}.satblock.json`);
    return true;
  }

  /**
   * Importa um bloco a partir do conteúdo (texto) de um arquivo .satblock.json
   * exportado por outra pessoa via exportBlockToFile(). Passa pelas mesmas 6
   * travas de segurança de qualquer outro bloco antes de carregar na prévia
   * — a pessoa ainda precisa clicar em "Injetar na IDE" (ou "Enviar para
   * Avaliação") explicitamente depois de revisar o código nos painéis.
   */
  function importBlockFromFile(jsonText) {
    let payload;
    try {
      payload = JSON.parse(jsonText);
    } catch (e) {
      alert(`Arquivo inválido: não é um JSON válido.\n${e.message}`);
      return false;
    }

    const config = payload && payload.config ? payload.config : payload;
    if (!config || !config.blockName || !config.jsDefinition || !config.pyCodeGenerator) {
      alert('Este arquivo não parece ser um bloco exportado do SatBlocks Studio (faltam campos obrigatórios).');
      return false;
    }

    const toolboxXml = config.toolboxXml || generateToolboxXmlSnippet(config);
    const check = validateBlockSafety(config.jsDefinition, config.pyCodeGenerator, toolboxXml, config.blockName);
    if (!check.valid) {
      alert(`⛔ Este bloco não passou nas travas de segurança e não foi importado:\n\n${check.message}`);
      return false;
    }

    applyBlockConfiguration({
      ...config,
      pyCodeGenerator: config.pyCodeGenerator,
      driverInfo: config.driverPyCode ? { driverPyCode: config.driverPyCode, driverFilename: config.driverFilename || 'driver.py', protocol: config.driverProtocol || '' } : null
    });

    alert(`✅ Bloco "${config.label || config.blockName}" importado! Revise o código nos painéis abaixo e clique em "Injetar na IDE" quando estiver pronto — ele ainda não foi salvo em lugar nenhum.`);
    return true;
  }

  return {
    init: initPreviewWorkspace,
    getBaseTemplates: () => BASE_TEMPLATES,
    loadBaseTemplate,
    generateFromPrompt,
    synthesizeFromPython,
    applyBlockConfiguration,
    validateBlockSafety,
    recompileFromEditedPanels,
    getCurrentConfig: () => currentBlockConfig,
    injectIntoSatBlocksIDE,
    submitBlockForReview,
    exportBlockImage,
    exportBlockToFile,
    importBlockFromFile
  };
})();
