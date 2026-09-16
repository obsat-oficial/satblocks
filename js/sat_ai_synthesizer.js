/**
 * ============================================================================
 * SatBlocks Studio Pro — AI Block Synthesizer (Gemini / OpenAI / Offline Engine)
 * ============================================================================
 * Sintetiza blocos Blockly e código MicroPython completo via LLM ou motor
 * semântico local avançado.
 */

window.SatAISynthesizer = (function() {
  'use strict';

  const DEFAULT_PROVIDER = 'gemini';
  const GEMINI_MODEL = 'gemini-1.5-flash';

  function getApiKey() {
    return localStorage.getItem('sat_studio_api_key') || '';
  }

  function setApiKey(key) {
    localStorage.setItem('sat_studio_api_key', key.trim());
  }

  function getProvider() {
    return localStorage.getItem('sat_studio_ai_provider') || DEFAULT_PROVIDER;
  }

  function setProvider(prov) {
    localStorage.setItem('sat_studio_ai_provider', prov);
  }

  /**
   * Prompt de sistema com a especificação formal do Blockly e MicroPython para ESP32/OBSAT
   */
  const SYSTEM_INSTRUCTION = `
Você é o Engenheiro de Software Embarcado e Arquiteto Blockly especialista do projeto OBSAT & SatBlocks by BIPES.
Sua missão é receber uma solicitação em linguagem natural de um usuário e projetar um bloco Blockly completo, idiomático e funcional com código MicroPython para satélites e placas ESP32/RP2040.

Você DEVE responder ESTRITAMENTE em formato JSON com as seguintes chaves (sem texto fora do JSON):
{
  "blockName": "identificador_unico_em_snake_case_comecando_com_sat_",
  "label": "Rótulo amigável com emoji e descrição do componente (ex: 👆 Sensor de Toque (TTP223B))",
  "category": "Uma das: Sensores Ambientais | Inércia & ADCS | Navegação & GPS | Comunicação & LoRa | Energia & EPS | Câmera & Payload | Atuadores & Ejeção | Arquivos & Flash | Barramentos: I2C & UART | Lógica & Condição",
  "color": "Cor Hexadecimal temática (ex: #06b6d4 para sensores, #ef4444 para atuadores, #f59e0b para energia, #ea580c para telecom)",
  "blockType": "output_number | output_boolean | output_string | statement",
  "inputsInline": true ou false,
  "fields": [
    {
      "type": "input_value",
      "name": "PIN",
      "label": "Pino GPIO:",
      "check": "Number",
      "defaultShadow": "4"
    }
  ],
  "jsDefinition": "Código JS completo Blockly.Blocks['blockName'] = { ... };",
  "pyGenerator": "Código JS do gerador Python no formato moderno Blockly.Python.forBlock['blockName'] = function(block) { ... }; usando python.Order.* (ex: python.Order.NONE, python.Order.FUNCTION_CALL) em vez de Blockly.Python.ORDER_*, que está obsoleto.",
  "toolboxXml": "Snippet XML com sombras <block type='blockName'>...</block>",
  "driverFilename": "nome_do_driver.py ou null se usar apenas bibliotecas nativas como machine",
  "driverPyCode": "Código Python do driver .py caso seja necessário criar uma classe externa, ou comentário explicando o uso nativo."
}

Regras Cruciais:
1. Analise o hardware solicitado. Se for um sensor digital simples (ex: TTP223B, Chave Fim de Curso, Sensor de Chama Digital), use machine.Pin(pin, Pin.IN) com retorno booleano ou numérico 0/1.
2. Se for I2C (ex: sensores ToF, BMP280, SHT20, INA219), configure entradas para barramento I2C, endereço hexadecimal e métodos de leitura.
3. Se for PWM/Atuador (ex: Servo, Buzzer, Relé), use blockType: 'statement' e machine.PWM ou Pin.OUT.
4. O código gerado deve ter imports defensivos (Blockly.Python.definitions_['...']).
5. O JSON deve ser 100% válido e sem markdown ao redor.
`;

  /**
   * Sintetiza o bloco usando a API do Google Gemini
   */
  async function synthesizeWithGemini(promptText, apiKey) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: SYSTEM_INSTRUCTION },
            { text: `Solicitação do Usuário: "${promptText}"` }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json"
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Erro HTTP ${response.status} na API Gemini`);
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error('A API não retornou resposta estruturada.');

    // Limpa possíveis blocos ```json
    const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  }

  /**
   * Parser Semântico Local Avançado (Modo Offline Inteligente)
   */
  function synthesizeOfflineSmart(promptText) {
    let clean = promptText
      .replace(/^(criar|crie|gerar|gere|fazer|faça|novo|adicionar|adicione)\s+(um\s+|o\s+)?bloco\s+(para\s+|de\s+|que\s+)?(ler|acionar|controlar|obter|configurar)?\s*/i, '')
      .trim();

    const lower = promptText.toLowerCase();

    // 1. Detecção de Sensor de Toque / Touch Capacitivo (TTP223 / TTP223B / Touch Sensor)
    if (lower.includes('ttp223') || lower.includes('toque') || lower.includes('touch') || lower.includes('capacitivo')) {
      const blockName = 'sat_sensor_toque_ttp223';
      const label = '👆 Sensor de Toque (TTP223B)';
      return {
        blockName,
        label,
        category: 'Sensores Ambientais',
        color: '#06b6d4',
        blockType: 'output_boolean',
        inputsInline: true,
        fields: [
          { type: 'input_value', name: 'PIN', label: 'no Pino GPIO:', check: 'Number', defaultShadow: '4' }
        ],
        jsDefinition: `Blockly.Blocks['${blockName}'] = {\n` +
          `  init: function() {\n` +
          `    this.setColour('#06b6d4');\n` +
          `    this.appendDummyInput().appendField('👆 Sensor de Toque (TTP223B)');\n` +
          `    this.appendValueInput('PIN').setCheck('Number').appendField('no Pino GPIO:');\n` +
          `    this.setInputsInline(true);\n` +
          `    this.setOutput(true, 'Boolean');\n` +
          `    this.setTooltip('Retorna Verdadeiro (1) quando o sensor de toque capacitivo TTP223B for pressionado.');\n` +
          `  }\n` +
          `};`,
        pyGenerator: `Blockly.Python.forBlock['${blockName}'] = function(block) {\n` +
          `  Blockly.Python.definitions_['import_pin'] = 'from machine import Pin';\n` +
          `  const pin = Blockly.Python.valueToCode(block, 'PIN', python.Order.NONE) || '4';\n` +
          `  return [\`Pin(\${pin}, Pin.IN).value() == 1\`, python.Order.RELATIONAL];\n` +
          `};`,
        toolboxXml: `<block type="${blockName}">\n` +
          `  <value name="PIN">\n` +
          `    <shadow type="math_number"><field name="NUM">4</field></shadow>\n` +
          `  </value>\n` +
          `</block>`,
        driverFilename: null,
        driverPyCode: '# O sensor TTP223B é digital (nível lógico HIGH/LOW).\n# Utiliza diretamente o módulo nativo machine.Pin sem necessidade de driver externo.'
      };
    }

    // 2. Detecção de Sensor Ultrassônico HC-SR04
    if (lower.includes('hcsr04') || lower.includes('hc-sr04') || lower.includes('ultrassonico') || lower.includes('ultrassônico')) {
      const blockName = 'sat_sensor_hcsr04';
      return {
        blockName,
        label: '🦇 Sensor Ultrassônico HC-SR04 (cm)',
        category: 'Sensores Ambientais',
        color: '#06b6d4',
        blockType: 'output_number',
        inputsInline: false,
        fields: [
          { type: 'input_value', name: 'TRIG', label: 'Pino Trigger:', check: 'Number', defaultShadow: '5' },
          { type: 'input_value', name: 'ECHO', label: 'Pino Echo:', check: 'Number', defaultShadow: '18' }
        ],
        jsDefinition: `Blockly.Blocks['${blockName}'] = {\n` +
          `  init: function() {\n` +
          `    this.setColour('#06b6d4');\n` +
          `    this.appendDummyInput().appendField('🦇 Sensor Ultrassônico HC-SR04 (cm)');\n` +
          `    this.appendValueInput('TRIG').setCheck('Number').appendField('Pino Trigger:');\n` +
          `    this.appendValueInput('ECHO').setCheck('Number').appendField('Pino Echo:');\n` +
          `    this.setInputsInline(false);\n` +
          `    this.setOutput(true, 'Number');\n` +
          `    this.setTooltip('Mede a distância em centímetros usando pulso ultrassônico.');\n` +
          `  }\n` +
          `};`,
        pyGenerator: `Blockly.Python.forBlock['${blockName}'] = function(block) {\n` +
          `  Blockly.Python.definitions_['import_pin'] = 'from machine import Pin, time_pulse_us';\n` +
          `  Blockly.Python.definitions_['import_time'] = 'import time';\n` +
          `  Blockly.Python.definitions_['fn_hcsr04'] = 'def _read_hcsr04(trig_p, echo_p):\\n    t = Pin(trig_p, Pin.OUT)\\n    e = Pin(echo_p, Pin.IN)\\n    t.value(0)\\n    time.sleep_us(5)\\n    t.value(1)\\n    time.sleep_us(10)\\n    t.value(0)\\n    dur = time_pulse_us(e, 1, 30000)\\n    return round((dur / 2.0) / 29.1, 2) if dur > 0 else -1\\n';\n` +
          `  const trig = Blockly.Python.valueToCode(block, 'TRIG', python.Order.NONE) || '5';\n` +
          `  const echo = Blockly.Python.valueToCode(block, 'ECHO', python.Order.NONE) || '18';\n` +
          `  return [\`_read_hcsr04(\${trig}, \${echo})\`, python.Order.FUNCTION_CALL];\n` +
          `};`,
        toolboxXml: `<block type="${blockName}">\n` +
          `  <value name="TRIG"><shadow type="math_number"><field name="NUM">5</field></shadow></value>\n` +
          `  <value name="ECHO"><shadow type="math_number"><field name="NUM">18</field></shadow></value>\n` +
          `</block>`,
        driverFilename: null,
        driverPyCode: '# Rotina ultrassônica embutida usando machine.time_pulse_us.'
      };
    }

    // 3. Fallback: Resolvedor de Driver via Hub ou Síntese Inteligente com Nome Limpo
    const hubDriver = window.SatDriverHub ? window.SatDriverHub.resolveDriverFromPrompt(promptText) : null;
    let label = `🛰️ ${clean || 'Dispositivo Customizado'}`;
    let rawName = clean
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9 ]/g, " ")
      .trim()
      .split(/\s+/)
      .slice(0, 4)
      .join('_')
      .toLowerCase();

    if (!rawName) rawName = 'sensor_custom';
    const blockName = rawName.startsWith('sat_') ? rawName : `sat_${rawName}`;

    let blockType = 'output_number';
    if (lower.includes('acionar') || lower.includes('ligar') || lower.includes('desligar') || lower.includes('mover') || lower.includes('configurar')) {
      blockType = 'statement';
    }

    return {
      blockName,
      label,
      category: hubDriver ? hubDriver.category : 'Sensores Ambientais',
      color: blockType === 'statement' ? '#ef4444' : '#06b6d4',
      blockType,
      inputsInline: true,
      fields: [
        { type: 'input_value', name: 'PIN', label: 'Pino GPIO:', check: 'Number', defaultShadow: '4' }
      ],
      jsDefinition: `Blockly.Blocks['${blockName}'] = {\n` +
        `  init: function() {\n` +
        `    this.setColour('${blockType === 'statement' ? '#ef4444' : '#06b6d4'}');\n` +
        `    this.appendDummyInput().appendField('${label}');\n` +
        `    this.appendValueInput('PIN').setCheck('Number').appendField('Pino GPIO:');\n` +
        `    this.setInputsInline(true);\n` +
        `    ${blockType === 'statement' ? 'this.setPreviousStatement(true, null);\\n    this.setNextStatement(true, null);' : "this.setOutput(true, 'Number');"}\n` +
        `    this.setTooltip('Bloco gerado via SatBlocks Studio Pro.');\n` +
        `  }\n` +
        `};`,
      pyGenerator: `Blockly.Python.forBlock['${blockName}'] = function(block) {\n` +
        `  Blockly.Python.definitions_['import_pin'] = 'from machine import Pin';\n` +
        `  const pin = Blockly.Python.valueToCode(block, 'PIN', python.Order.NONE) || '4';\n` +
        `  return ${blockType === 'statement' ? '`Pin(${pin}, Pin.OUT).value(1)\\n`' : '[`Pin(${pin}, Pin.IN).value()`, python.Order.FUNCTION_CALL]'};\n` +
        `};`,
      toolboxXml: `<block type="${blockName}">\n  <value name="PIN"><shadow type="math_number"><field name="NUM">4</field></shadow></value>\n</block>`,
      driverFilename: hubDriver ? hubDriver.driverFilename : null,
      driverPyCode: hubDriver ? hubDriver.driverPyCode : '# Utiliza machine.Pin nativo.'
    };
  }

  /**
   * Ponto de Entrada: Síntese com IA ou Fallback Semântico Inteligente
   */
  async function synthesize(promptText) {
    const apiKey = getApiKey();
    if (apiKey) {
      try {
        console.log('🤖 Sintetizando bloco via IA (Gemini)...');
        return await synthesizeWithGemini(promptText, apiKey);
      } catch (err) {
        console.warn('Falha na síntese por IA online, usando motor semântico local:', err);
        alert(`Aviso da IA: ${err.message}\nUsando motor semântico local inteligente.`);
      }
    }
    return synthesizeOfflineSmart(promptText);
  }

  return {
    synthesize,
    getApiKey,
    setApiKey,
    getProvider,
    setProvider
  };
})();
