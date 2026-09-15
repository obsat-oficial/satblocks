/**
 * @license
 * SatBlocks by BIPES — Biblioteca de Blocos Aeroespaciais para OBSAT & Kits Pion
 * Copyright (C) 2026 OBSAT / BIPES Project
 * Blocos didáticos, lúdicos e coloridos para CubeSat/CanSat Pion
 */

(function(Blockly) {
  'use strict';

  if (!Blockly) {
    console.error('Blockly não encontrado!');
    return;
  }

  // Substitui Blockly.Mutator.reconnect (classe Blockly.Mutator removida no Blockly >= v9,
  // migrado para o sistema de MutatorIcon). Reconecta uma conexão salva do mutator
  // (connectionChild, tipicamente a saída de um bloco de valor) ao input indicado do
  // bloco principal, só se ela ainda não estiver conectada a outro lugar.
  function satMutatorReconnect(connectionChild, block, inputName) {
    if (!connectionChild || !connectionChild.getSourceBlock() || !connectionChild.getSourceBlock().workspace) {
      return false;
    }
    const input = block.getInput(inputName);
    const connectionParent = input && input.connection;
    if (!connectionParent) return false;
    const currentParent = connectionChild.targetBlock();
    if ((!currentParent || currentParent !== block) && !connectionParent.isConnected()) {
      connectionParent.connect(connectionChild);
      return true;
    }
    return false;
  }

  // Paleta de Cores Lúdicas e Didáticas SatBlocks (Cores individuais por grandeza física)
  const SENSOR_COLORS = {
    MISSION: '#7c3aed',         // Púrpura Orbital (Missão & Satélite)
    TEMP: '#e11d48',            // Rosa/Vermelho Térmico (Temperatura)
    PRESSURE: '#0284c7',        // Azul Celeste (Pressão Atmosférica)
    ALTITUDE: '#059669',        // Verde Montanha (Altitude Barométrica)
    HUMIDITY: '#06b6d4',        // Azul Ciano Água (Umidade Relativa)
    LIGHT: '#d97706',           // Âmbar / Amarelo Solar (Luz LDR & BH1750 Lux)
    UV: '#8b5cf6',              // Violeta Ultravioleta (Radiação UV)
    AIR_QUALITY: '#10b981',     // Verde Ar / Gás (Qualidade do Ar MQ135 / CO2)
    IR_TEMP: '#f43f5e',         // Vermelho Infravermelho (Temp da Terra MLX90614)
    ACCEL: '#0d9488',           // Teal Dinâmica (Acelerômetro MPU6050)
    GYRO: '#6366f1',            // Índigo Rotação (Giroscópio MPU6050)
    MAGNETIC: '#4f46e5',        // Azul Magnético (Bússola / Magnetômetro)
    GPS: '#10b981',             // Verde Navegação (GPS Latitude / Longitude / UTC)
    LORA: '#ea580c',            // Laranja Rádio (Comunicação LoRa / Telemetria)
    BATTERY: '#f59e0b',         // Dourado Bateria (Tensão e Carga EPS)
    SOLAR: '#eab308',           // Amarelo Painéis Solares (Corrente Fotovoltaica)
    INA219: '#ca8a04',          // Ocre Sensor de Potência EPS INA219
    CAMERA: '#db2777',          // Rosa Fotografia (ESP32-CAM / SD)
    ACTUATOR: '#dc2626'         // Vermelho Ignição / Ejeção (Paraquedas, Buzzer)
  };

  // =========================================================================
  // BLOCO OFICIAL BIPES: DADOS DO PROJETO (AUTOR, ID IOT, DESCRIÇÃO)
  // =========================================================================
  Blockly.Blocks['project_info'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("Dados do Projeto");
      this.appendValueInput("project_author")
          .setCheck("String")
          .setAlign(Blockly.ALIGN_RIGHT)
          .appendField("Autor");
      this.appendValueInput("project_iot_id")
          .setCheck("Number")
          .setAlign(Blockly.ALIGN_RIGHT)
          .appendField("ID IoT");
      this.appendValueInput("project_description")
          .setCheck("String")
          .setAlign(Blockly.ALIGN_RIGHT)
          .appendField("Descrição");
      this.setColour('#3b82f6');
      this.setTooltip("Informações sobre o projeto, identificação da equipe e missão OBSAT.");
      this.setHelpUrl("https://bipes.net.br");
    }
  };

  // =========================================================================
  // BLOCO MUTATOR: PACOTE DINÂMICO DE TELEMETRIA (CSV E JSON) COM ENGRENAGEM
  // =========================================================================

  Blockly.Blocks['sat_telemetry_container'] = {
    init: function() {
      this.setColour(SENSOR_COLORS.LORA);
      this.appendDummyInput().appendField("📦 Pacote de Telemetria");
      this.appendStatementInput("STACK");
      this.setTooltip("Adicione ou remova campos do pacote de telemetria.");
      this.contextMenu = false;
    }
  };

  Blockly.Blocks['sat_telemetry_item'] = {
    init: function() {
      this.setColour(SENSOR_COLORS.LORA);
      this.appendDummyInput()
          .appendField("➕ Campo:")
          .appendField(new Blockly.FieldTextInput("dado"), "ITEM_LABEL");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setTooltip("Adiciona um dado de telemetria com rótulo.");
      this.contextMenu = false;
    }
  };

  Blockly.Blocks['sat_telemetry_packet_builder'] = {
    init: function() {
      this.setColour(SENSOR_COLORS.LORA);
      this.itemCount_ = 4;
      this.itemLabels_ = ["ID", "Temp", "Pressao", "Bateria"];

      this.appendDummyInput()
          .appendField("📊 Montar Pacote de Telemetria");
      this.appendDummyInput()
          .appendField("Formato:")
          .appendField(new Blockly.FieldDropdown([
            ["CSV (,)", "CSV"],
            ["JSON ({})", "JSON"]
          ]), "FORMAT");

      this.updateShape_();
      this.setOutput(true, "String");
      Blockly.Extensions.apply('sat_telemetry_packet_mutator', this, true);
      this.setTooltip("Monta dinamicamente uma string de telemetria em CSV ou JSON. Clique na engrenagem para adicionar/remover campos e editar rótulos.");
    },

    updateShape_: function() {
      let i = 0;
      while (this.getInput('ADD' + i)) {
        this.removeInput('ADD' + i);
        i++;
      }
      for (let j = 0; j < this.itemCount_; j++) {
        const label = this.itemLabels_[j] || ("Campo " + (j + 1));
        this.appendValueInput('ADD' + j)
            .setAlign(Blockly.ALIGN_RIGHT)
            .appendField(label + ":");
      }
    }
  };

  // Mutator clássico (engrenagem) migrado de setMutator(new Blockly.Mutator([...]))
  // (classe removida no Blockly >= v9) para Blockly.Extensions.registerMutator.
  Blockly.Extensions.registerMutator('sat_telemetry_packet_mutator', {
    mutationToDom: function() {
      const container = Blockly.utils.xml.createElement('mutation');
      container.setAttribute('items', this.itemCount_);
      container.setAttribute('labels', JSON.stringify(this.itemLabels_));
      return container;
    },

    domToMutation: function(xmlElement) {
      this.itemCount_ = parseInt(xmlElement.getAttribute('items'), 10) || 0;
      try {
        this.itemLabels_ = JSON.parse(xmlElement.getAttribute('labels') || '[]');
      } catch (e) {
        this.itemLabels_ = [];
      }
      this.updateShape_();
    },

    decompose: function(workspace) {
      const containerBlock = workspace.newBlock('sat_telemetry_container');
      containerBlock.initSvg();
      let connection = containerBlock.getInput('STACK').connection;

      for (let i = 0; i < this.itemCount_; i++) {
        const itemBlock = workspace.newBlock('sat_telemetry_item');
        itemBlock.initSvg();
        itemBlock.setFieldValue(this.itemLabels_[i] || ("Campo" + (i + 1)), 'ITEM_LABEL');
        connection.connect(itemBlock.previousConnection);
        connection = itemBlock.nextConnection;
      }
      return containerBlock;
    },

    compose: function(containerBlock) {
      let itemBlock = containerBlock.getInputTargetBlock('STACK');
      const connections = [];
      const labels = [];

      while (itemBlock) {
        connections.push(itemBlock.valueConnection_);
        labels.push(itemBlock.getFieldValue('ITEM_LABEL') || 'dado');
        itemBlock = itemBlock.nextConnection && itemBlock.nextConnection.targetBlock();
      }

      for (let i = 0; i < this.itemCount_; i++) {
        const connection = this.getInput('ADD' + i).connection.targetConnection;
        if (connection && connections.indexOf(connection) === -1) {
          connection.disconnect();
        }
      }

      this.itemCount_ = connections.length;
      this.itemLabels_ = labels;
      this.updateShape_();

      for (let i = 0; i < this.itemCount_; i++) {
        satMutatorReconnect(connections[i], this, 'ADD' + i);
      }
    },

    saveConnections: function(containerBlock) {
      let itemBlock = containerBlock.getInputTargetBlock('STACK');
      let i = 0;
      while (itemBlock) {
        const input = this.getInput('ADD' + i);
        itemBlock.valueConnection_ = input && input.connection.targetConnection;
        i++;
        itemBlock = itemBlock.nextConnection && itemBlock.nextConnection.targetBlock();
      }
    }
  }, undefined, ['sat_telemetry_item']);

  // =========================================================================
  // BLOCOS DIDÁTICOS DE JSON ESTRUTURADO, DICIONÁRIOS E VETORES ESPACIAIS
  // =========================================================================

  Blockly.Blocks['sat_json_object_container'] = {
    init: function() {
      this.setColour('#0284c7');
      this.appendDummyInput().appendField("📦 Objeto JSON { }");
      this.appendStatementInput("STACK");
      this.setTooltip("Adicione ou remova chaves do objeto JSON.");
      this.contextMenu = false;
    }
  };

  Blockly.Blocks['sat_json_object_item'] = {
    init: function() {
      this.setColour('#0284c7');
      this.appendDummyInput()
          .appendField("🔑 Chave:")
          .appendField(new Blockly.FieldTextInput("campo"), "KEY_NAME");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setTooltip("Adiciona uma chave ao objeto JSON.");
      this.contextMenu = false;
    }
  };

  Blockly.Blocks['sat_json_object_builder'] = {
    init: function() {
      this.setColour('#0284c7');
      this.itemCount_ = 7;
      this.itemKeys_ = ["equipe", "bateria", "temperatura", "pressao", "giroscopio", "acelerometro", "payload"];

      this.appendDummyInput()
          .appendField("📦 Montar Pacote JSON Oficial OBSAT { }");

      this.updateShape_();
      this.setOutput(true, ["Object", "String"]);
      Blockly.Extensions.apply('sat_json_object_mutator', this, true);
      this.setTooltip("Cria o pacote JSON com os campos oficiais do Edital OBSAT (equipe, bateria, temperatura, pressão, giroscópio, acelerômetro, payload). Clique na engrenagem para adicionar/remover campos.");
    },

    updateShape_: function() {
      let i = 0;
      while (this.getInput('VAL' + i)) {
        this.removeInput('VAL' + i);
        i++;
      }
      for (let j = 0; j < this.itemCount_; j++) {
        const key = this.itemKeys_[j] || ("campo" + (j + 1));
        this.appendValueInput('VAL' + j)
            .setAlign(Blockly.ALIGN_RIGHT)
            .appendField('"' + key + '":');
      }
    }
  };

  Blockly.Extensions.registerMutator('sat_json_object_mutator', {
    mutationToDom: function() {
      const container = Blockly.utils.xml.createElement('mutation');
      container.setAttribute('items', this.itemCount_);
      container.setAttribute('keys', JSON.stringify(this.itemKeys_));
      return container;
    },

    domToMutation: function(xmlElement) {
      this.itemCount_ = parseInt(xmlElement.getAttribute('items'), 10) || 7;
      try {
        this.itemKeys_ = JSON.parse(xmlElement.getAttribute('keys') || '["equipe", "bateria", "temperatura", "pressao", "giroscopio", "acelerometro", "payload"]');
      } catch (e) {
        this.itemKeys_ = ["equipe", "bateria", "temperatura", "pressao", "giroscopio", "acelerometro", "payload"];
      }
      this.updateShape_();
    },

    decompose: function(workspace) {
      const containerBlock = workspace.newBlock('sat_json_object_container');
      containerBlock.initSvg();
      let connection = containerBlock.getInput('STACK').connection;

      for (let i = 0; i < this.itemCount_; i++) {
        const itemBlock = workspace.newBlock('sat_json_object_item');
        itemBlock.initSvg();
        itemBlock.setFieldValue(this.itemKeys_[i] || ("campo" + (i + 1)), 'KEY_NAME');
        connection.connect(itemBlock.previousConnection);
        connection = itemBlock.nextConnection;
      }
      return containerBlock;
    },

    compose: function(containerBlock) {
      let itemBlock = containerBlock.getInputTargetBlock('STACK');
      const connections = [];
      const keys = [];

      while (itemBlock) {
        connections.push(itemBlock.valueConnection_);
        keys.push(itemBlock.getFieldValue('KEY_NAME') || 'campo');
        itemBlock = itemBlock.nextConnection && itemBlock.nextConnection.targetBlock();
      }

      for (let i = 0; i < this.itemCount_; i++) {
        const connection = this.getInput('VAL' + i).connection.targetConnection;
        if (connection && connections.indexOf(connection) === -1) {
          connection.disconnect();
        }
      }

      this.itemCount_ = connections.length;
      this.itemKeys_ = keys;
      this.updateShape_();

      for (let i = 0; i < this.itemCount_; i++) {
        satMutatorReconnect(connections[i], this, 'VAL' + i);
      }
    },

    saveConnections: function(containerBlock) {
      let itemBlock = containerBlock.getInputTargetBlock('STACK');
      let i = 0;
      while (itemBlock) {
        const input = this.getInput('VAL' + i);
        itemBlock.valueConnection_ = input && input.connection.targetConnection;
        i++;
        itemBlock = itemBlock.nextConnection && itemBlock.nextConnection.targetBlock();
      }
    }
  }, undefined, ['sat_json_object_item']);

  // =========================================================================
  // BLOCO CONFIGURÁVEL DE PAYLOAD CIENTÍFICO COM MUTATOR
  // =========================================================================

  Blockly.Blocks['sat_payload_object_container'] = {
    init: function() {
      this.setColour('#8b5cf6');
      this.appendDummyInput().appendField("🔬 Payload Científico { }");
      this.appendStatementInput("STACK");
      this.setTooltip("Adicione ou remova campos do Payload Científico.");
      this.contextMenu = false;
    }
  };

  Blockly.Blocks['sat_payload_object_item'] = {
    init: function() {
      this.setColour('#8b5cf6');
      this.appendDummyInput()
          .appendField("🔑 Campo:")
          .appendField(new Blockly.FieldTextInput("sensor"), "KEY_NAME");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setTooltip("Adiciona um campo customizado ao Payload Científico.");
      this.contextMenu = false;
    }
  };

  // Bloco Especializado para Estrutura de Payload Científico do Edital OBSAT
  Blockly.Blocks['sat_obsat_payload_builder'] = {
    init: function() {
      this.setColour('#8b5cf6');
      this.itemCount_ = 6;
      this.itemKeys_ = ["sensor_status", "temperature", "humidity", "gyroscope", "accelerometer", "motion_detected"];

      this.appendDummyInput()
          .appendField("🔬 Montar Payload Científico { }");

      this.updateShape_();
      this.setOutput(true, ["Object", "String"]);
      Blockly.Extensions.apply('sat_obsat_payload_mutator', this, true);
      this.setTooltip("Monta o objeto JSON 'payload' customizável para sua missão científica. Clique na engrenagem para adicionar, remover ou renomear campos dos sensores e experimentos da equipe.");
    },

    updateShape_: function() {
      // Remove inputs legados se existirem
      const legacyInputs = ["STATUS", "TEMP", "HUM", "GYRO", "ACCEL", "MOTION"];
      legacyInputs.forEach(name => {
        if (this.getInput(name)) this.removeInput(name);
      });

      let i = 0;
      while (this.getInput('VAL' + i)) {
        this.removeInput('VAL' + i);
        i++;
      }
      for (let j = 0; j < this.itemCount_; j++) {
        const key = this.itemKeys_[j] || ("campo" + (j + 1));
        this.appendValueInput('VAL' + j)
            .setAlign(Blockly.ALIGN_RIGHT)
            .appendField('"' + key + '":');
      }
    }
  };

  Blockly.Extensions.registerMutator('sat_obsat_payload_mutator', {
    mutationToDom: function() {
      const container = Blockly.utils.xml.createElement('mutation');
      container.setAttribute('items', this.itemCount_);
      container.setAttribute('keys', JSON.stringify(this.itemKeys_));
      return container;
    },

    domToMutation: function(xmlElement) {
      this.itemCount_ = parseInt(xmlElement.getAttribute('items'), 10) || 6;
      try {
        this.itemKeys_ = JSON.parse(xmlElement.getAttribute('keys') || '["sensor_status", "temperature", "humidity", "gyroscope", "accelerometer", "motion_detected"]');
      } catch (e) {
        this.itemKeys_ = ["sensor_status", "temperature", "humidity", "gyroscope", "accelerometer", "motion_detected"];
      }
      this.updateShape_();
    },

    decompose: function(workspace) {
      const containerBlock = workspace.newBlock('sat_payload_object_container');
      containerBlock.initSvg();
      let connection = containerBlock.getInput('STACK').connection;

      for (let i = 0; i < this.itemCount_; i++) {
        const itemBlock = workspace.newBlock('sat_payload_object_item');
        itemBlock.initSvg();
        itemBlock.setFieldValue(this.itemKeys_[i] || ("campo" + (i + 1)), 'KEY_NAME');
        connection.connect(itemBlock.previousConnection);
        connection = itemBlock.nextConnection;
      }
      return containerBlock;
    },

    compose: function(containerBlock) {
      let itemBlock = containerBlock.getInputTargetBlock('STACK');
      const connections = [];
      const keys = [];

      while (itemBlock) {
        connections.push(itemBlock.valueConnection_);
        keys.push(itemBlock.getFieldValue('KEY_NAME') || 'campo');
        itemBlock = itemBlock.nextConnection && itemBlock.nextConnection.targetBlock();
      }

      for (let i = 0; i < this.itemCount_; i++) {
        const input = this.getInput('VAL' + i);
        const connection = input && input.connection.targetConnection;
        if (connection && connections.indexOf(connection) === -1) {
          connection.disconnect();
        }
      }

      this.itemCount_ = connections.length;
      this.itemKeys_ = keys;
      this.updateShape_();

      for (let i = 0; i < this.itemCount_; i++) {
        satMutatorReconnect(connections[i], this, 'VAL' + i);
      }
    },

    saveConnections: function(containerBlock) {
      let itemBlock = containerBlock.getInputTargetBlock('STACK');
      let i = 0;
      while (itemBlock) {
        const input = this.getInput('VAL' + i);
        itemBlock.valueConnection_ = input && input.connection.targetConnection;
        i++;
        itemBlock = itemBlock.nextConnection && itemBlock.nextConnection.targetBlock();
      }
    }
  }, undefined, ['sat_payload_object_item']);

  // Bloco de Vetor 3D [ X, Y, Z ] (para Giroscópio, Acelerômetro, Magnetômetro)
  Blockly.Blocks['sat_vector_3d'] = {
    init: function() {
      this.setColour('#0d9488');
      this.appendDummyInput()
          .appendField("🧭 Vetor 3D [ X, Y, Z ]");
      this.appendDummyInput()
          .appendField("Formato:")
          .appendField(new Blockly.FieldDropdown([
            ["Lista [ x, y, z ]", "LIST"],
            ["Objeto { x, y, z }", "OBJECT"]
          ]), "FORMAT");
      this.appendValueInput("X").setAlign(Blockly.ALIGN_RIGHT).appendField("X:");
      this.appendValueInput("Y").setAlign(Blockly.ALIGN_RIGHT).appendField("Y:");
      this.appendValueInput("Z").setAlign(Blockly.ALIGN_RIGHT).appendField("Z:");
      this.setOutput(true, ["Array", "Object"]);
      this.setTooltip("Cria uma estrutura de 3 eixos (X, Y, Z) em formato de lista ou objeto.");
    }
  };

  // Bloco de Leitura Completa dos 3 Eixos do Giroscópio
  Blockly.Blocks['sat_imu_gyro_vector'] = {
    init: function() {
      this.setColour(SENSOR_COLORS.GYRO);
      this.appendDummyInput()
          .appendField("🔄 Vetor Giroscópio MPU9250")
          .appendField(new Blockly.FieldDropdown([
            ["Lista [ X, Y, Z ]", "LIST"],
            ["Objeto { x, y, z }", "OBJECT"]
          ]), "FORMAT");
      this.setOutput(true, ["Array", "Object"]);
      this.setTooltip("Lê simultaneamente as taxas de rotação angular nos eixos X, Y e Z.");
    }
  };

  // Bloco de Leitura Completa dos 3 Eixos do Acelerômetro
  Blockly.Blocks['sat_imu_accel_vector'] = {
    init: function() {
      this.setColour(SENSOR_COLORS.ACCEL);
      this.appendDummyInput()
          .appendField("🧭 Vetor Acelerômetro MPU9250")
          .appendField(new Blockly.FieldDropdown([
            ["Lista [ X, Y, Z ]", "LIST"],
            ["Objeto { x, y, z }", "OBJECT"]
          ]), "FORMAT");
      this.setOutput(true, ["Array", "Object"]);
      this.setTooltip("Lê simultaneamente a aceleração nos eixos X, Y e Z.");
    }
  };

  // Bloco Serializar Dicionário para String JSON
  Blockly.Blocks['sat_json_dumps'] = {
    init: function() {
      this.setColour('#0284c7');
      this.appendValueInput("DATA")
          .setAlign(Blockly.ALIGN_RIGHT)
          .appendField("📄 Converter Objeto para Texto JSON (dumps)");
      this.setOutput(true, "String");
      this.setTooltip("Serializa um dicionário/objeto Python para uma string formatada em JSON (ujson.dumps).");
    }
  };

  Blockly.defineBlocksWithJsonArray([
    // ==========================================
    // 0. GERENCIAMENTO DE DRIVERS & BIBLIOTECAS (OFICIAL OBSAT/BIPES)
    // ==========================================
    {
      "type": "sat_include_sensor_driver",
      "message0": "📦 Instalar / Carregar Driver do Sensor %1 Sensor: %2",
      "args0": [
        { "type": "input_dummy" },
        {
          "type": "field_dropdown",
          "name": "DRIVER",
          "options": [
            ["🌡️ SHT20 (Temperatura & Umidade I2C 0x40)", "sht20"],
            ["🌪️ BMP280 (Pressão & Altitude I2C 0x76)", "bmp280"],
            ["🍃 CCS811 (Gás Carbônico CO2 I2C 0x5A)", "ccs811"],
            ["🧭 MPU-9250 / 6050 (Giroscópio & IMU I2C 0x68)", "mpu9250"],
            ["💡 MCP23017 (Expansor LEDs RGB I2C 0x20)", "mcp23017"],
            ["📻 LoRa SX1276/SX1278 (SPI VSPI)", "sx127x"],
            ["📟 Display OLED SSD1306 (I2C 0x3C)", "ssd1306"],
            ["☁️ EasyMQTT / umqtt.simple (Telemetria)", "umqttsimple"]
          ]
        }
      ],
      "previousStatement": null,
      "nextStatement": null,
      "colour": "#475569",
      "tooltip": "Verifica se o arquivo de driver (.py) existe na placa. Se não existir, cria o código do driver automaticamente na memória Flash."
    },
    {
      "type": "sat_install_lib_mip",
      "message0": "🌐 Baixar Driver via Internet / MIP %1 Pacote / Biblioteca: %2",
      "args0": [
        { "type": "input_dummy" },
        {
          "type": "field_dropdown",
          "name": "PKG",
          "options": [
            ["micropython-bmp280", "bmp280"],
            ["micropython-mpu9250", "mpu9250"],
            ["micropython-sht20", "sht20"],
            ["micropython-ccs811", "ccs811"],
            ["micropython-umqtt.simple", "umqtt.simple"],
            ["micropython-ssd1306", "ssd1306"]
          ]
        }
      ],
      "previousStatement": null,
      "nextStatement": null,
      "colour": "#475569",
      "tooltip": "Usa o gerenciador oficial mip do MicroPython para baixar e instalar a biblioteca diretamente da internet."
    },
    {
      "type": "sat_mission_start",
      "message0": "🛰️ Iniciar Missão do Satélite OBSat %1 Nome da Missão: %2",
      "args0": [
        { "type": "input_dummy" },
        { "type": "field_input", "name": "MISSION_NAME", "text": "CANSAT_PION_01" }
      ],
      "nextStatement": null,
      "colour": SENSOR_COLORS.MISSION,
      "tooltip": "Ponto de entrada obrigatório do programa de voo do satélite."
    },
    {
      "type": "sat_emit_beep",
      "message0": "📡 Emitir pulso de Beacon de Rádio %1 Repetições: %2 Intervalo: %3 ms",
      "args0": [
        { "type": "input_dummy" },
        { "type": "field_number", "name": "COUNT", "value": 3, "min": 1, "max": 20 },
        { "type": "field_number", "name": "INTERVAL", "value": 500, "min": 50, "max": 5000 }
      ],
      "previousStatement": null,
      "nextStatement": null,
      "colour": SENSOR_COLORS.MISSION,
      "tooltip": "Emite sinal sonoro/rádio indicando satélite ativo na frequência de telemetria."
    },
    {
      "type": "sat_wait",
      "message0": "⏱️ Aguardar %1 %2",
      "args0": [
        { "type": "field_number", "name": "TIME", "value": 1, "min": 0 },
        {
          "type": "field_dropdown",
          "name": "UNIT",
          "options": [
            ["segundos", "SEC"],
            ["milissegundos", "MSEC"]
          ]
        }
      ],
      "previousStatement": null,
      "nextStatement": null,
      "colour": SENSOR_COLORS.MISSION,
      "tooltip": "Pausa a execução do computador de bordo pelo tempo especificado."
    },
    {
      "type": "sat_watchdog_feed",
      "message0": "🛡️ Alimentar Watchdog de Voo (WDT)",
      "previousStatement": null,
      "nextStatement": null,
      "colour": SENSOR_COLORS.MISSION,
      "tooltip": "Reinicia o contador de segurança do computador de bordo para evitar travamento em órbita."
    },
    {
      "type": "sat_deploy_antenna",
      "message0": "🛰️ Acionar Liberação de Antena / Painel Solar %1 Queima de Filamento por %2 ms",
      "args0": [
        { "type": "input_dummy" },
        { "type": "field_number", "name": "BURN_TIME", "value": 2000, "min": 500, "max": 10000 }
      ],
      "previousStatement": null,
      "nextStatement": null,
      "colour": SENSOR_COLORS.MISSION,
      "tooltip": "Aciona o circuito térmico de queima de fio de nylon para abertura de antenas ou painéis solares."
    },
    {
      "type": "sat_mission_end",
      "message0": "🛑 Finalizar Sequência de Missão (Standby)",
      "previousStatement": null,
      "colour": SENSOR_COLORS.MISSION,
      "tooltip": "Coloca o computador de bordo em estado final de repouso."
    },

    // ==========================================
    // 2. SENSORES AMBIENTAIS OFICIAIS PION OBSAT
    // ==========================================
    {
      "type": "sat_sensor_sht20_temp",
      "message0": "🌡️ Temperatura SHT20 (°C, I2C 0x40)",
      "output": "Number",
      "colour": SENSOR_COLORS.TEMP,
      "tooltip": "Lê a temperatura ambiente (-40 a 125°C) no sensor SHT20 via I2C (0x40)."
    },
    {
      "type": "sat_sensor_sht20_hum",
      "message0": "💧 Umidade Relativa SHT20 (%, I2C 0x40)",
      "output": "Number",
      "colour": SENSOR_COLORS.HUMIDITY,
      "tooltip": "Lê a umidade relativa do ar (0 a 100%) no sensor SHT20 via I2C (0x40)."
    },
    {
      "type": "sat_sensor_bmp280_temp",
      "message0": "🌡️ Temperatura BMP280 (°C, I2C 0x76)",
      "output": "Number",
      "colour": SENSOR_COLORS.TEMP,
      "tooltip": "Lê a temperatura ambiente medida pelo sensor BMP280 em graus Celsius."
    },
    {
      "type": "sat_sensor_bmp280_press",
      "message0": "🌪️ Pressão Atmosférica (hPa, I2C 0x76)",
      "output": "Number",
      "colour": SENSOR_COLORS.PRESSURE,
      "tooltip": "Lê a pressão barométrica de 300 a 1100 hPa via I2C (0x76)."
    },
    {
      "type": "sat_sensor_bmp280_alt",
      "message0": "⛰️ Altitude Barométrica (m) %1 Pressão ao Nível do Mar: %2 hPa",
      "args0": [
        { "type": "input_dummy" },
        { "type": "field_number", "name": "SEA_LEVEL", "value": 1013.25, "min": 900, "max": 1100 }
      ],
      "output": "Number",
      "colour": SENSOR_COLORS.ALTITUDE,
      "tooltip": "Calcula a altitude estimada com base no gradiente barométrico."
    },
    {
      "type": "sat_sensor_als_light",
      "message0": "☀️ Luminosidade ALS-PT19 (0-100%%) no Pino GPI34",
      "output": "Number",
      "colour": SENSOR_COLORS.LIGHT,
      "tooltip": "Lê a intensidade de luz solar de 0 a 100% no sensor ALS-PT19-315C conectado ao GPI34."
    },
    {
      "type": "sat_sensor_ccs811_co2",
      "message0": "🍃 Gás Carbônico CO₂ CCS811 (PPM, I2C 0x5A)",
      "output": "Number",
      "colour": SENSOR_COLORS.AIR_QUALITY,
      "tooltip": "Lê a concentração de CO2 equivalente de 400 a 29206 ppm via I2C (0x5A)."
    },
    {
      "type": "sat_mcp23017_leds",
      "message0": "💡 LEDs RGB MCP23017 (I2C 0x20) %1 LED: %2 Cor: %3",
      "args0": [
        { "type": "input_dummy" },
        {
          "type": "field_dropdown",
          "name": "LED_INDEX",
          "options": [
            ["LED 1", "0"],
            ["LED 2", "1"],
            ["LED 3", "2"],
            ["LED 4", "3"],
            ["Todos os LEDs", "all"]
          ]
        },
        {
          "type": "field_dropdown",
          "name": "COLOR",
          "options": [
            ["🔴 Vermelho", "RED"],
            ["🟢 Verde", "GREEN"],
            ["🔵 Azul", "BLUE"],
            ["⚪ Branco", "WHITE"],
            ["⚫ Apagar", "OFF"]
          ]
        }
      ],
      "previousStatement": null,
      "nextStatement": null,
      "colour": SENSOR_COLORS.ACTUATOR,
      "tooltip": "Controla os LEDs RGB na placa de interface do CubeSat Pion via expansor I2C MCP23017 (0x20)."
    },
    {
      "type": "sat_sensor_dht_hum",
      "message0": "💧 Umidade Relativa do Ar (%) no Pino %1",
      "args0": [
        {
          "type": "field_dropdown",
          "name": "PIN",
          "options": [
            ["GPIO 4", "4"],
            ["GPIO 5", "5"],
            ["GPIO 13", "13"],
            ["GPIO 14", "14"],
            ["GPIO 18", "18"],
            ["GPIO 19", "19"],
            ["GPIO 21", "21"],
            ["GPIO 22", "22"]
          ]
        }
      ],
      "output": "Number",
      "colour": SENSOR_COLORS.HUMIDITY,
      "tooltip": "Lê a umidade relativa do ar de 0 a 100% usando sensor DHT11/DHT22."
    },
    {
      "type": "sat_sensor_light_ldr",
      "message0": "☀️ Intensidade de Luz Solar (LDR / Lux) no Pino %1",
      "args0": [
        {
          "type": "field_dropdown",
          "name": "PIN",
          "options": [
            ["GPIO 34 (ADC)", "34"],
            ["GPIO 35 (ADC)", "35"],
            ["GPIO 32 (ADC)", "32"],
            ["GPIO 33 (ADC)", "33"],
            ["GPIO 36 (VP)", "36"]
          ]
        }
      ],
      "output": "Number",
      "colour": SENSOR_COLORS.LIGHT,
      "tooltip": "Lê o nível de radiação luminosa incidente nas células solares ou no fotorresistor."
    },
    {
      "type": "sat_sensor_bh1750_lux",
      "message0": "💡 Luminosidade Digital BH1750 (Lux I2C)",
      "output": "Number",
      "colour": SENSOR_COLORS.LIGHT,
      "tooltip": "Lê a iluminância direta em Lux através do sensor digital I2C BH1750."
    },
    {
      "type": "sat_sensor_uv_index",
      "message0": "☢️ Índice de Radiação UV no Pino %1",
      "args0": [
        {
          "type": "field_dropdown",
          "name": "PIN",
          "options": [
            ["GPIO 35 (ADC)", "35"],
            ["GPIO 34 (ADC)", "34"],
            ["GPIO 32 (ADC)", "32"],
            ["GPIO 33 (ADC)", "33"]
          ]
        }
      ],
      "output": "Number",
      "colour": SENSOR_COLORS.UV,
      "tooltip": "Lê o índice de radiação solar ultravioleta (UV Index 0 a 15)."
    },
    {
      "type": "sat_sensor_air_mq135",
      "message0": "🍃 Qualidade do Ar / Gases MQ-135 (PPM) no Pino %1",
      "args0": [
        {
          "type": "field_dropdown",
          "name": "PIN",
          "options": [
            ["GPIO 34 (ADC)", "34"],
            ["GPIO 35 (ADC)", "35"],
            ["GPIO 32 (ADC)", "32"]
          ]
        }
      ],
      "output": "Number",
      "colour": SENSOR_COLORS.AIR_QUALITY,
      "tooltip": "Lê a concentração de gases e fumaça na atmosfera em partes por milhão (PPM)."
    },
    {
      "type": "sat_sensor_mlx90614_ir",
      "message0": "🌡️ Temp Infravermelha Superfície (°C)",
      "output": "Number",
      "colour": SENSOR_COLORS.IR_TEMP,
      "tooltip": "Mede a temperatura de alvos terrestres ou nuvens por radiação infravermelha sem contato (Sensor MLX90614)."
    },

    // ==========================================
    // 3. INÉRCIA & ORIENTAÇÃO (IMU / ADCS)
    // ==========================================
    {
      "type": "sat_imu_mpu6050_accel",
      "message0": "🧭 Aceleração MPU6050 %1 (m/s²)",
      "args0": [
        {
          "type": "field_dropdown",
          "name": "AXIS",
          "options": [
            ["Vetor Triaxial [X, Y, Z]", "vector"],
            ["Módulo Total |a|", "total"],
            ["Eixo X", "x"],
            ["Eixo Y", "y"],
            ["Eixo Z", "z"]
          ]
        }
      ],
      "output": null,
      "colour": SENSOR_COLORS.ACCEL,
      "tooltip": "Lê os valores de aceleração linear do acelerômetro de bordo MPU6050."
    },
    {
      "type": "sat_imu_mpu6050_gyro",
      "message0": "🔄 Velocidade Angular Giroscópio %1 (°/s)",
      "args0": [
        {
          "type": "field_dropdown",
          "name": "AXIS",
          "options": [
            ["Vetor Triaxial [X, Y, Z]", "vector"],
            ["Eixo Z (Yaw / Rotação)", "z"],
            ["Eixo X (Roll / Rolamento)", "x"],
            ["Eixo Y (Pitch / Arfagem)", "y"]
          ]
        }
      ],
      "output": null,
      "colour": SENSOR_COLORS.GYRO,
      "tooltip": "Lê as taxas de rotação angular em torno dos eixos da espaçonave."
    },
    {
      "type": "sat_imu_detect_freefall",
      "message0": "🪂 Detectar Queda Livre (Limiar: %1 g)",
      "args0": [
        { "type": "field_number", "name": "THRESHOLD", "value": 0.15, "min": 0.01, "max": 0.5 }
      ],
      "output": "Boolean",
      "colour": SENSOR_COLORS.ACCEL,
      "tooltip": "Retorna Verdadeiro quando a aceleração total aproxima-se de zero durante voo balístico."
    },
    {
      "type": "sat_mag_heading",
      "message0": "🧭 Azimute Bússola Magnética (0° a 360°)",
      "output": "Number",
      "colour": SENSOR_COLORS.MAGNETIC,
      "tooltip": "Retorna a orientação do satélite em relação ao Norte magnético da Terra (HMC5883L/QMC5883L)."
    },

    // ==========================================
    // 4. NAVEGAÇÃO & GPS (VERDE ESMERALDA)
    // ==========================================
    {
      "type": "sat_gps_lat",
      "message0": "🌐 Latitude GPS (Graus Decimais)",
      "output": "Number",
      "colour": SENSOR_COLORS.GPS,
      "tooltip": "Retorna a coordenada de latitude obtida pelo receptor GPS de bordo."
    },
    {
      "type": "sat_gps_lng",
      "message0": "🌐 Longitude GPS (Graus Decimais)",
      "output": "Number",
      "colour": SENSOR_COLORS.GPS,
      "tooltip": "Retorna a coordenada de longitude obtida pelo receptor GPS de bordo."
    },
    {
      "type": "sat_gps_alt",
      "message0": "📍 Altitude GPS (Metros NMM)",
      "output": "Number",
      "colour": SENSOR_COLORS.GPS,
      "tooltip": "Retorna a altitude da espaçonave segundo a constelação GPS."
    },
    {
      "type": "sat_gps_speed",
      "message0": "🚀 Velocidade GPS Ground Speed (km/h)",
      "output": "Number",
      "colour": SENSOR_COLORS.GPS,
      "tooltip": "Retorna a velocidade de deslocamento horizontal do satélite/CanSat."
    },
    {
      "type": "sat_gps_time_utc",
      "message0": "🕒 Horário GPS UTC (HH:MM:SS)",
      "output": "String",
      "colour": SENSOR_COLORS.GPS,
      "tooltip": "Retorna a estampa de tempo sincronizada com o relógio atômico dos satélites GPS."
    },

    // ==========================================
    // 5. COMUNICAÇÃO ESPACIAL & LORA (LARANJA RÁDIO)
    // ==========================================
    {
      "type": "sat_lora_setup",
      "message0": "📡 Configurar Rádio LoRa %1 Frequência: %2 %3 Potência: %4 dBm %5 Spreading Factor: %6",
      "args0": [
        { "type": "input_dummy" },
        {
          "type": "field_dropdown",
          "name": "FREQ",
          "options": [
            ["915.0 MHz (Brasil / ISM)", "915.0"],
            ["433.0 MHz (Amador Espacial)", "433.0"],
            ["868.0 MHz (Europa / Testes)", "868.0"]
          ]
        },
        { "type": "input_dummy" },
        { "type": "field_number", "name": "POWER", "value": 20, "min": 2, "max": 20 },
        { "type": "input_dummy" },
        {
          "type": "field_dropdown",
          "name": "SF",
          "options": [
            ["SF7 (Rápido)", "7"],
            ["SF8 (Equilibrado)", "8"],
            ["SF9 (Longo Alcance)", "9"],
            ["SF10 (Alcance Máximo)", "10"]
          ]
        }
      ],
      "previousStatement": null,
      "nextStatement": null,
      "colour": SENSOR_COLORS.LORA,
      "tooltip": "Inicializa o transceptor de rádio LoRa para comunicação com a Estação Terrena."
    },
    {
      "type": "sat_lora_send_packet",
      "message0": "📤 Transmitir Pacote LoRa: %1",
      "args0": [
        { "type": "input_value", "name": "PAYLOAD", "check": ["String", "Number"] }
      ],
      "previousStatement": null,
      "nextStatement": null,
      "colour": SENSOR_COLORS.LORA,
      "tooltip": "Envia um pacote de dados via rádio frequência para a estação de solo."
    },
    {
      "type": "sat_lora_receive_cmd",
      "message0": "📥 Comando Recebido da Estação de Solo",
      "output": "String",
      "colour": SENSOR_COLORS.LORA,
      "tooltip": "Lê a última mensagem ou telecomando enviado pela base terrestre."
    },
    // ==========================================
    // 6. ENERGIA & EPS (DOURADO / ÂMBAR)
    // ==========================================
    {
      "type": "sat_battery_adc",
      "message0": "🔋 Bateria (ADC GPIO35)",
      "output": "Number",
      "colour": SENSOR_COLORS.BATTERY,
      "tooltip": "Lê o nível analógico da bateria no pino GPIO35 (ADC 11dB, 9-bit) do CanSat OBSAT."
    },
    {
      "type": "sat_eps_battery_voltage",
      "message0": "🔋 Tensão da Bateria de Lítio (V)",
      "output": "Number",
      "colour": SENSOR_COLORS.BATTERY,
      "tooltip": "Lê a tensão do barramento da bateria (ex: 3.7V nominal, 4.2V máx)."
    },
    {
      "type": "sat_eps_solar_current",
      "message0": "⚡ Corrente dos Painéis Solares (mA)",
      "output": "Number",
      "colour": SENSOR_COLORS.SOLAR,
      "tooltip": "Lê a corrente elétrica gerada pelos painéis solares do satélite."
    },
    {
      "type": "sat_eps_battery_percent",
      "message0": "🔋 Nível de Carga da Bateria (0 a 100%)",
      "output": "Number",
      "colour": SENSOR_COLORS.BATTERY,
      "tooltip": "Retorna o percentual estimado de carga útil da bateria."
    },
    {
      "type": "sat_sensor_ina219_power",
      "message0": "⚡ Potência Elétrica Total INA219 (mW I2C)",
      "output": "Number",
      "colour": SENSOR_COLORS.INA219,
      "tooltip": "Mede com alta precisão a potência consumida ou gerada pelo satélite via barramento I2C."
    },
    {
      "type": "sat_eps_deepsleep",
      "message0": "💤 Entrar em Deep Sleep por %1 segundos",
      "args0": [
        { "type": "field_number", "name": "SECONDS", "value": 10, "min": 1, "max": 3600 }
      ],
      "previousStatement": null,
      "colour": SENSOR_COLORS.BATTERY,
      "tooltip": "Desliga subsistemas de alto consumo para preservar bateria até o próximo ciclo."
    },

    // ==========================================
    // 5.1 HOTSPOT & REDE LOCAL (ROXO TELECOM)
    // ==========================================
    {
      "type": "sat_wifi_ap_start",
      "message0": "📡 Iniciar Wi-Fi Hotspot",
      "message1": "Nome da Rede: %1",
      "args1": [
        { "type": "field_input", "name": "SSID", "text": "SatEstacao_01" }
      ],
      "message2": "Senha: %1 (vazia = aberta)",
      "args2": [
        { "type": "field_input", "name": "PASSWORD", "text": "" }
      ],
      "previousStatement": null,
      "nextStatement": null,
      "colour": SENSOR_COLORS.LORA,
      "tooltip": "Cria um Ponto de Acesso Wi-Fi autônomo na ESP32-CAM para conexão direta com smartphone ou notebook sem precisar de roteador."
    },
    {
      "type": "sat_wifi_ap_ip",
      "message0": "🌐 Endereço IP do Hotspot Wi-Fi",
      "output": "String",
      "colour": SENSOR_COLORS.LORA,
      "tooltip": "Retorna o endereço IP local do ponto de acesso da ESP32-CAM (padrão: 192.168.4.1)."
    },

    // ==========================================
    // 7. CÂMERA OV2640, WEB SERVER & PAYLOAD (ROSA CIENTÍFICO)
    // ==========================================
    {
      "type": "sat_camera_init_advanced",
      "message0": "📷 Inicializar Câmera OV2640",
      "message1": "Resolução: %1  Qualidade JPEG: %2",
      "args1": [
        {
          "type": "field_dropdown",
          "name": "FRAMESIZE",
          "options": [
            ["QVGA (320x240 - Rápido)", "FRAMESIZE_QVGA"],
            ["QQVGA (160x120 - LoRa)", "FRAMESIZE_QQVGA"],
            ["VGA (640x480 - Padrão)", "FRAMESIZE_VGA"],
            ["SVGA (800x600 - Médio)", "FRAMESIZE_SVGA"],
            ["XGA (1024x768 - Alta)", "FRAMESIZE_XGA"],
            ["HD (1280x720 - HD)", "FRAMESIZE_HD"],
            ["UXGA (1600x1200 - Máxima)", "FRAMESIZE_UXGA"]
          ]
        },
        { "type": "field_number", "name": "QUALITY", "value": 12, "min": 10, "max": 63 }
      ],
      "message2": "Filtro: %1  Espelho: %2",
      "args2": [
        {
          "type": "field_dropdown",
          "name": "EFFECT",
          "options": [
            ["Normal (Cores Reais)", "0"],
            ["Preto e Branco", "2"],
            ["Sépia", "4"],
            ["Negativo", "1"],
            ["Verde (NDVI)", "3"]
          ]
        },
        {
          "type": "field_dropdown",
          "name": "ROTATE",
          "options": [
            ["Normal", "0"],
            ["Inverter Vertical (V-Flip)", "1"],
            ["Espelhar Horizontal (H-Mirror)", "2"],
            ["Inverter Ambos (180°)", "3"]
          ]
        }
      ],
      "previousStatement": null,
      "nextStatement": null,
      "colour": SENSOR_COLORS.CAMERA,
      "tooltip": "Inicializa o sensor óptico OV2640 na ESP32-CAM com controle total de resolução, compressão e filtros."
    },
    {
      "type": "sat_camera_flash_intensity",
      "message0": "💡 Flash LED (GPIO 4)",
      "message1": "Brilho: %1 %",
      "args1": [
        { "type": "field_number", "name": "BRIGHTNESS", "value": 100, "min": 0, "max": 100 }
      ],
      "previousStatement": null,
      "nextStatement": null,
      "colour": SENSOR_COLORS.CAMERA,
      "tooltip": "Controla a intensidade do Flash frontal (LED branco potente no GPIO 4) usando modulação PWM (0% desliga, 100% potência máxima)."
    },
    {
      "type": "sat_camera_status_led",
      "message0": "🔴 LED Status (GPIO 33)",
      "message1": "Estado: %1",
      "args1": [
        {
          "type": "field_dropdown",
          "name": "STATE",
          "options": [
            ["Ligado", "1"],
            ["Desligado", "0"]
          ]
        }
      ],
      "previousStatement": null,
      "nextStatement": null,
      "colour": SENSOR_COLORS.CAMERA,
      "tooltip": "Controla o LED vermelho indicador de gravação na placa ESP32-CAM (lógica invertida interna tratada automaticamente)."
    },
    {
      "type": "sat_camera_capture",
      "message0": "📷 Capturar Foto (ESP32-CAM)",
      "message1": "Salvar no arquivo: %1",
      "args1": [
        { "type": "field_input", "name": "FILENAME", "text": "foto_obsat_%d.jpg" }
      ],
      "previousStatement": null,
      "nextStatement": null,
      "colour": SENSOR_COLORS.CAMERA,
      "tooltip": "Aciona o sensor de imagem OV2640 e salva o arquivo JPEG no cartão SD ou Flash interna."
    },
    {
      "type": "sat_camera_capture_base64",
      "message0": "📷 Capturar Foto em Base64",
      "output": "String",
      "colour": SENSOR_COLORS.CAMERA,
      "tooltip": "Captura uma foto JPEG e a codifica em Base64 pronta para envio no pacote JSON de telemetria ou MQTT."
    },
    {
      "type": "sat_camera_webserver_start",
      "message0": "🌐 Iniciar Web Server de Fotos",
      "message1": "Porta: %1  Título: %2",
      "args1": [
        { "type": "field_number", "name": "PORT", "value": 80, "min": 1, "max": 65535 },
        { "type": "field_input", "name": "TITLE", "text": "ESP32-CAM Estação OBSAT" }
      ],
      "previousStatement": null,
      "nextStatement": null,
      "colour": SENSOR_COLORS.CAMERA,
      "tooltip": "Inicia um Servidor Web HTTP local na ESP32-CAM com páginas para visualização de fotos, botão de disparo remoto e streaming pelo navegador do celular."
    },
    {
      "type": "sat_camera_webserver_handle",
      "message0": "🔄 Processar Web Server (Celular)",
      "previousStatement": null,
      "nextStatement": null,
      "colour": SENSOR_COLORS.CAMERA,
      "tooltip": "Atende conexões e requisições HTTP de clientes conectados ao Hotspot Wi-Fi da ESP32-CAM."
    },
    {
      "type": "sat_camera_lora_send_chunks",
      "message0": "📡 Transmitir Foto via LoRa",
      "message1": "Tamanho do Pacote: %1 bytes",
      "args1": [
        { "type": "field_number", "name": "CHUNK_SIZE", "value": 200, "min": 50, "max": 240 }
      ],
      "previousStatement": null,
      "nextStatement": null,
      "colour": SENSOR_COLORS.CAMERA,
      "tooltip": "Captura foto JPEG, fragmenta em pacotes numerados com índice e transmite sequencialmente via rádio LoRa para a estação terrestre."
    },
    {
      "type": "sat_camera_deinit",
      "message0": "🛑 Desativar Câmera OV2640",
      "message1": "(Economia de Bateria)",
      "previousStatement": null,
      "nextStatement": null,
      "colour": SENSOR_COLORS.CAMERA,
      "tooltip": "Desliga o sensor de imagem e barramentos DMA para minimizar consumo de corrente antes de entrar em Deep Sleep."
    },
    {
      "type": "sat_sd_write_log",
      "message0": "💾 Gravar Linha no Cartão SD",
      "message1": "Arquivo: %1",
      "args1": [
        { "type": "field_input", "name": "FILENAME", "text": "telemetria.csv" }
      ],
      "message2": "Texto: %1",
      "args2": [
        { "type": "input_value", "name": "TEXT", "check": "String" }
      ],
      "previousStatement": null,
      "nextStatement": null,
      "colour": SENSOR_COLORS.CAMERA,
      "tooltip": "Grava dados experimentais no cartão microSD de bordo para recuperação pós-voo."
    },

    // ==========================================
    // 8. ATUADORES & EJEÇÃO (VERMELHO IGNIÇÃO)
    // ==========================================
    {
      "type": "sat_actuator_servo_release",
      "message0": "🪂 Mover Servo de Ejeção do Paraquedas %1 Pino: %2 Ângulo: %3 °",
      "args0": [
        { "type": "input_dummy" },
        {
          "type": "field_dropdown",
          "name": "PIN",
          "options": [
            ["GPIO 18", "18"],
            ["GPIO 19", "19"],
            ["GPIO 23", "23"],
            ["GPIO 13", "13"]
          ]
        },
        { "type": "field_number", "name": "ANGLE", "value": 90, "min": 0, "max": 180 }
      ],
      "previousStatement": null,
      "nextStatement": null,
      "colour": SENSOR_COLORS.ACTUATOR,
      "tooltip": "Posiciona o servomotor para liberação mecânica do sistema de recuperação."
    },
    {
      "type": "sat_actuator_buzzer",
      "message0": "🔊 Tocar Buzzer de Localização %1 Pino: %2 Frequência: %3 Hz Duração: %4 ms",
      "args0": [
        { "type": "input_dummy" },
        {
          "type": "field_dropdown",
          "name": "PIN",
          "options": [
            ["GPIO 25", "25"],
            ["GPIO 26", "26"],
            ["GPIO 27", "27"],
            ["GPIO 15", "15"]
          ]
        },
        { "type": "field_number", "name": "FREQ", "value": 2000, "min": 100, "max": 10000 },
        { "type": "field_number", "name": "DURATION", "value": 300, "min": 50, "max": 5000 }
      ],
      "previousStatement": null,
      "nextStatement": null,
      "colour": SENSOR_COLORS.ACTUATOR,
      "tooltip": "Emite sinal sonoro para localização do CanSat/CubeSat após aterrissagem."
    },
    {
      "type": "sat_actuator_led_status",
      "message0": "💡 LED de Status da Missão %1 Pino: %2 Estado: %3",
      "args0": [
        { "type": "input_dummy" },
        {
          "type": "field_dropdown",
          "name": "PIN",
          "options": [
            ["GPIO 2 (LED Interno)", "2"],
            ["MCP23017 Pino 0 (Luz de Navegação)", "mcp_0"],
            ["MCP23017 Pino 1", "mcp_1"],
            ["GPIO 4", "4"],
            ["GPIO 16", "16"],
            ["GPIO 17", "17"]
          ]
        },
        {
          "type": "field_dropdown",
          "name": "STATE",
          "options": [
            ["Ligado", "1"],
            ["Desligado", "0"]
          ]
        }
      ],
      "previousStatement": null,
      "nextStatement": null,
      "colour": SENSOR_COLORS.ACTUATOR,
      "tooltip": "Controla LEDs indicadores de telemetria ou integridade do sistema."
    },
    {
      "type": "sat_actuator_mcp23017_led",
      "message0": "💡 Luz de Navegação (MCP23017) %1 Pino: %2 Estado: %3",
      "args0": [
        { "type": "input_dummy" },
        {
          "type": "input_value",
          "name": "PIN",
          "check": "Number"
        },
        {
          "type": "field_dropdown",
          "name": "STATE",
          "options": [
            ["Ligado", "1"],
            ["Desligado", "0"]
          ]
        }
      ],
      "inputsInline": true,
      "previousStatement": null,
      "nextStatement": null,
      "colour": SENSOR_COLORS.ACTUATOR,
      "tooltip": "Aciona as luzes de navegação via expansor MCP23017 do CanSat OBSAT (aceita número fixo 0 a 7 ou variável de um laço 'para / for' para percorrer todos os LEDs)."
    },
    // ==========================================
    // 9. IOT & PAINEL (TELEMETRIA VIA HTTP)
    // ==========================================
    {
      "type": "sat_iot_publish",
      "message0": "📊 Publicar no Painel IoT %1 Canal: %2 Valor: %3",
      "args0": [
        { "type": "input_dummy" },
        { "type": "field_input", "name": "CANAL", "text": "temperatura" },
        { "type": "input_value", "name": "VALOR", "check": ["Number", "String"] }
      ],
      "previousStatement": null,
      "nextStatement": null,
      "colour": "#0284c7",
      "tooltip": "Envia um valor por HTTP para o canal informado, para exibição ao vivo nos gráficos do Painel IOT. Usa o 'ID IoT' definido no bloco Dados do Projeto para identificar a equipe."
    },
    {
      "type": "sat_iot_read",
      "message0": "📥 Ler último valor do Canal IoT %1",
      "args0": [
        { "type": "field_input", "name": "CANAL", "text": "comando" }
      ],
      "output": "String",
      "colour": "#0284c7",
      "tooltip": "Consulta por HTTP o valor mais recente publicado nesse canal (para a mesma equipe/ID IoT). Retorna texto vazio se nada foi publicado ainda."
    }
  ]);

  // =========================================================================
  // CATEGORIA: REDE & INTERNET (HTTP CLIENT & HTTP SERVER & WI-FI)
  // =========================================================================

  // Conectar Wi-Fi
  Blockly.Blocks['sat_wifi_connect'] = {
    init: function() {
      this.setColour('#0284c7');
      this.appendDummyInput()
          .appendField("📶 Conectar Wi-Fi");
      this.appendDummyInput()
          .appendField("SSID:")
          .appendField(new Blockly.FieldTextInput("OBSAT_WIFI"), "SSID");
      this.appendDummyInput()
          .appendField("Senha:")
          .appendField(new Blockly.FieldTextInput("senha123"), "PASSWORD");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setTooltip("Conecta a ESP32 na rede Wi-Fi da base ou estação de solo.");
    }
  };

  // Configurar Barramento I2C para Sensores (ESP32-CAM vs PION)
  Blockly.Blocks['sat_i2c_init_pins'] = {
    init: function() {
      this.setColour('#0284c7');
      this.appendDummyInput()
          .appendField("🔌 Configurar I2C")
          .appendField(new Blockly.FieldDropdown([
            ["ESP32-CAM (SCL: 14, SDA: 15)", "esp32cam"],
            ["PION CubeSat / DevKit (SCL: 22, SDA: 21)", "devkit"],
            ["Personalizado...", "custom"]
          ]), "PRESET")
          .appendField("SCL:")
          .appendField(new Blockly.FieldNumber(14, 0, 39), "SCL_PIN")
          .appendField("SDA:")
          .appendField(new Blockly.FieldNumber(15, 0, 39), "SDA_PIN");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setTooltip("Inicializa o barramento I2C com os pinos corretos para a placa selecionada (ESP32-CAM usa 14/15; DevKit usa 22/21).");
    }
  };

  // =========================================================================
  // BLOCO DE PACOTE DE TELEMETRIA OBSAT COM MUTATOR (ENGRENAGEM DE CAMPOS)
  // =========================================================================

  Blockly.Blocks['sat_obsat_telemetry_container'] = {
    init: function() {
      this.setColour('#e11d48');
      this.appendDummyInput().appendField("📦 Pacote Telemetria OBSAT");
      this.appendStatementInput("STACK");
      this.setTooltip("Adicione, remova ou reordene os campos do pacote de telemetria.");
      this.contextMenu = false;
    }
  };

  Blockly.Blocks['sat_obsat_telemetry_item'] = {
    init: function() {
      this.setColour('#e11d48');
      this.appendDummyInput()
          .appendField("🏷️ Rótulo:")
          .appendField(new Blockly.FieldTextInput("Campo"), "LABEL_NAME")
          .appendField("🔑 Chave JSON:")
          .appendField(new Blockly.FieldTextInput("campo"), "KEY_NAME");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setTooltip("Define o rótulo visual e a chave JSON correspondente.");
      this.contextMenu = false;
    }
  };

  // Montador de Pacote de Telemetria Oficial OBSAT 2026 com Mutator
  Blockly.Blocks['sat_obsat_telemetry_packet'] = {
    init: function() {
      this.setColour('#e11d48');
      this.itemCount_ = 6;
      this.itemKeys_ = ["equipe", "temperatura", "pressao", "altitude", "bateria", "payload"];
      this.itemLabels_ = ["Equipe ID", "Temperatura (°C)", "Pressão (hPa)", "Altitude (m)", "Bateria (%)", "Payload Extra"];

      this.appendDummyInput()
          .appendField("📦 Pacote Telemetria OBSAT");

      this.updateShape_();
      this.setOutput(true, ["Object", "Dictionary", "JSON"]);
      Blockly.Extensions.apply('sat_obsat_telemetry_mutator', this, true);
      this.setTooltip("Cria o dicionário de telemetria no formato homologado para a OBSAT 2026. Clique na engrenagem para adicionar/remover campos e editar os rótulos.");
    },

    updateShape_: function() {
      // Remove inputs existentes
      let i = 0;
      while (this.getInput('VAL' + i)) {
        this.removeInput('VAL' + i);
        i++;
      }
      // Remove legados se existirem
      ['TEAM', 'TEMP', 'PRESS', 'ALT', 'BAT', 'PAYLOAD'].forEach(name => {
        if (this.getInput(name)) this.removeInput(name);
      });

      for (let j = 0; j < this.itemCount_; j++) {
        const label = this.itemLabels_[j] || (this.itemKeys_[j] ? this.itemKeys_[j] : ("Campo " + (j + 1)));
        this.appendValueInput('VAL' + j)
            .appendField(label + ":");
      }
    }
  };

  Blockly.Extensions.registerMutator('sat_obsat_telemetry_mutator', {
    mutationToDom: function() {
      const container = Blockly.utils.xml.createElement('mutation');
      container.setAttribute('items', this.itemCount_);
      container.setAttribute('keys', JSON.stringify(this.itemKeys_));
      container.setAttribute('labels', JSON.stringify(this.itemLabels_));
      return container;
    },

    domToMutation: function(xmlElement) {
      this.itemCount_ = parseInt(xmlElement.getAttribute('items'), 10) || 6;
      try {
        this.itemKeys_ = JSON.parse(xmlElement.getAttribute('keys') || '["equipe", "temperatura", "pressao", "altitude", "bateria", "payload"]');
      } catch (e) {
        this.itemKeys_ = ["equipe", "temperatura", "pressao", "altitude", "bateria", "payload"];
      }
      try {
        this.itemLabels_ = JSON.parse(xmlElement.getAttribute('labels') || '["Equipe ID", "Temperatura (°C)", "Pressão (hPa)", "Altitude (m)", "Bateria (%)", "Payload Extra"]');
      } catch (e) {
        this.itemLabels_ = ["Equipe ID", "Temperatura (°C)", "Pressão (hPa)", "Altitude (m)", "Bateria (%)", "Payload Extra"];
      }
      this.updateShape_();
    },

    decompose: function(workspace) {
      const containerBlock = workspace.newBlock('sat_obsat_telemetry_container');
      containerBlock.initSvg();
      let connection = containerBlock.getInput('STACK').connection;

      for (let i = 0; i < this.itemCount_; i++) {
        const itemBlock = workspace.newBlock('sat_obsat_telemetry_item');
        itemBlock.initSvg();
        itemBlock.setFieldValue(this.itemLabels_[i] || ("Campo " + (i + 1)), 'LABEL_NAME');
        itemBlock.setFieldValue(this.itemKeys_[i] || ("campo" + (i + 1)), 'KEY_NAME');
        connection.connect(itemBlock.previousConnection);
        connection = itemBlock.nextConnection;
      }
      return containerBlock;
    },

    compose: function(containerBlock) {
      let itemBlock = containerBlock.getInputTargetBlock('STACK');
      const connections = [];
      const keys = [];
      const labels = [];

      while (itemBlock) {
        connections.push(itemBlock.valueConnection_);
        const lbl = itemBlock.getFieldValue('LABEL_NAME') || 'Campo';
        const k = itemBlock.getFieldValue('KEY_NAME') || 'campo';
        labels.push(lbl);
        keys.push(k);
        itemBlock = itemBlock.nextConnection && itemBlock.nextConnection.targetBlock();
      }

      for (let i = 0; i < this.itemCount_; i++) {
        const input = this.getInput('VAL' + i) || this.getInput(this.itemKeys_[i] ? this.itemKeys_[i].toUpperCase() : ('VAL' + i));
        const connection = input && input.connection && input.connection.targetConnection;
        if (connection && connections.indexOf(connection) === -1) {
          connection.disconnect();
        }
      }

      this.itemCount_ = connections.length;
      this.itemKeys_ = keys;
      this.itemLabels_ = labels;
      this.updateShape_();

      for (let i = 0; i < this.itemCount_; i++) {
        satMutatorReconnect(connections[i], this, 'VAL' + i);
      }
    },

    saveConnections: function(containerBlock) {
      let itemBlock = containerBlock.getInputTargetBlock('STACK');
      let i = 0;
      while (itemBlock) {
        const input = this.getInput('VAL' + i) || (this.itemKeys_[i] ? this.getInput(this.itemKeys_[i].toUpperCase()) : null);
        itemBlock.valueConnection_ = input && input.connection && input.connection.targetConnection;
        i++;
        itemBlock = itemBlock.nextConnection && itemBlock.nextConnection.targetBlock();
      }
    }
  }, undefined, ['sat_obsat_telemetry_item']);
  Blockly.Blocks['sat_format_telemetry'] = Blockly.Blocks['sat_obsat_telemetry_packet'];

  // Envio Direto de Telemetria para o Servidor de Testes OBSAT (Local ou Oficial)
  Blockly.Blocks['sat_http_send_obsat_telemetry'] = {
    init: function() {
      this.setColour('#e11d48');
      this.appendDummyInput()
          .appendField("🚀 Enviar Telemetria para Servidor OBSAT");
      this.appendDummyInput()
          .appendField("🌐 URL:")
          .appendField(new Blockly.FieldTextInput("https://obsat.org.br/satblocks/telemetria/salvar_telemetria.php"), "SERVER_URL");
      this.appendValueInput("JSON_DATA")
          .appendField("📦 Pacote JSON:");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setTooltip("Envia automaticamente o pacote JSON para o Servidor Local Flask ou Oficial da OBSAT via HTTP POST.");
    }
  };

  // HTTP GET Request
  Blockly.Blocks['sat_http_get'] = {
    init: function() {
      this.setColour('#4338ca');
      this.appendValueInput("URL")
          .setCheck("String")
          .appendField("🌐 HTTP GET Request URL");
      this.setOutput(true, "HTTP_RESPONSE");
      this.setTooltip("Realiza uma requisição HTTP GET para o endereço especificado.");
    }
  };

  // HTTP POST Request (Form / Text Data)
  Blockly.Blocks['sat_http_post_data'] = {
    init: function() {
      this.setColour('#4338ca');
      this.appendValueInput("URL")
          .setCheck("String")
          .appendField("📤 Make HTTP POST Request URL");
      this.appendValueInput("DATA")
          .appendField("Data");
      this.setOutput(true, "HTTP_RESPONSE");
      this.setTooltip("Envia dados via HTTP POST para um servidor de telemetria.");
    }
  };

  // HTTP POST Request (JSON Data)
  Blockly.Blocks['sat_http_post_json'] = {
    init: function() {
      this.setColour('#4338ca');
      this.appendValueInput("URL")
          .setCheck("String")
          .appendField("📤 Make HTTP POST Request URL");
      this.appendValueInput("JSON_DATA")
          .appendField("JSON Data");
      this.setOutput(true, "HTTP_RESPONSE");
      this.setTooltip("Envia um payload formatado em JSON via HTTP POST para um servidor IoT / API REST.");
    }
  };

  // HTTP Status Code
  Blockly.Blocks['sat_http_status_code'] = {
    init: function() {
      this.setColour('#4338ca');
      this.appendValueInput("RESPONSE")
          .appendField("HTTP Status code");
      this.setOutput(true, "Number");
      this.setTooltip("Retorna o código de status HTTP (ex: 200 para sucesso, 404, 500).");
    }
  };

  // HTTP Response Content / Text
  Blockly.Blocks['sat_http_response_text'] = {
    init: function() {
      this.setColour('#4338ca');
      this.appendValueInput("RESPONSE")
          .appendField("HTTP Response Text");
      this.setOutput(true, "String");
      this.setTooltip("Retorna o corpo de texto recebido na resposta do servidor.");
    }
  };

  // Start HTTP Web Server
  Blockly.Blocks['sat_http_server_start'] = {
    init: function() {
      this.setColour('#059669');
      this.appendDummyInput()
          .appendField("🌐 Start HTTP Web Server")
          .appendField("Port")
          .appendField(new Blockly.FieldNumber(80, 1, 65535), "PORT");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setTooltip("Inicializa o servidor Web embarcado no satélite na porta especificada (padrão 80).");
    }
  };

  // Wait for HTTP Client
  Blockly.Blocks['sat_http_server_wait_client'] = {
    init: function() {
      this.setColour('#059669');
      this.appendDummyInput()
          .appendField("⏳ Wait for HTTP Client");
      this.setOutput(true, "HTTP_CLIENT");
      this.setTooltip("Aguarda uma conexão de cliente HTTP (estação de solo/navegador).");
    }
  };

  // Requested Web Page
  Blockly.Blocks['sat_http_server_requested_page'] = {
    init: function() {
      this.setColour('#059669');
      this.appendValueInput("CLIENT")
          .appendField("Requested Web Page");
      this.setOutput(true, "String");
      this.setTooltip("Retorna o caminho da página/recurso requisitado pelo cliente (ex: '/', '/telemetria').");
    }
  };

  // Send HTTP Response HTML
  Blockly.Blocks['sat_http_server_send_html'] = {
    init: function() {
      this.setColour('#059669');
      this.appendValueInput("CLIENT")
          .appendField("Send HTTP Response");
      this.appendValueInput("HTML")
          .setCheck("String")
          .appendField("HTML");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setTooltip("Envia código HTML de resposta para o cliente conectado.");
    }
  };

  // Send HTTP Response JPG Image
  Blockly.Blocks['sat_http_server_send_jpg'] = {
    init: function() {
      this.setColour('#059669');
      this.appendValueInput("CLIENT")
          .appendField("Send HTTP Response");
      this.appendValueInput("IMAGE")
          .appendField("JPG Image");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setTooltip("Envia uma imagem binária JPG (ex: captura da câmera) para o navegador.");
    }
  };

  // Close HTTP Web Server
  Blockly.Blocks['sat_http_server_close'] = {
    init: function() {
      this.setColour('#059669');
      this.appendDummyInput()
          .appendField("🛑 Close HTTP Web Server");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setTooltip("Encerra a execução do servidor Web e libera o socket.");
    }
  };

  // =========================================================================
  // CATEGORIA: BARRAMENTOS — UART (PORTA SERIAL HARDWARE)
  // =========================================================================

  // Init UART Serial Port
  Blockly.Blocks['sat_uart_init'] = {
    init: function() {
      this.setColour('#10b981');
      this.appendDummyInput()
          .appendField("🔌 Init UART Serial Port")
          .appendField("Port:")
          .appendField(new Blockly.FieldDropdown([["UART2 (Pinos 17/16)", "2"], ["UART1 (Pinos 9/10)", "1"], ["UART0 (USB Padrão)", "0"]]), "PORT");
      this.appendDummyInput()
          .appendField("Baud rate:")
          .appendField(new Blockly.FieldNumber(115200, 300, 921600), "BAUD");
      this.appendDummyInput()
          .appendField("Start bit: 1 | Stop bit:")
          .appendField(new Blockly.FieldNumber(1, 1, 2), "STOP")
          .appendField("| Parity:")
          .appendField(new Blockly.FieldDropdown([["None", "None"], ["Even", "0"], ["Odd", "1"]]), "PARITY");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setTooltip("Inicializa uma porta UART por hardware na ESP32 (UART2 usa GPIO17-TX e GPIO16-RX no kit Pion).");
    }
  };

  // Send data to UART
  Blockly.Blocks['sat_uart_send'] = {
    init: function() {
      this.setColour('#10b981');
      this.appendValueInput("DATA")
          .appendField("📤 Send data to UART")
          .appendField("Data:");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setTooltip("Envia dados (texto ou bytes) através da porta serial UART.");
    }
  };

  // Read data from UART (N bytes)
  Blockly.Blocks['sat_uart_read_bytes'] = {
    init: function() {
      this.setColour('#10b981');
      this.appendValueInput("BYTES")
          .setCheck("Number")
          .appendField("📥 Read data from UART")
          .appendField("Bytes to read:");
      this.setOutput(true, "String");
      this.setTooltip("Lê um número específico de bytes da porta UART.");
    }
  };

  // Read one line from UART
  Blockly.Blocks['sat_uart_readline'] = {
    init: function() {
      this.setColour('#10b981');
      this.appendDummyInput()
          .appendField("📥 Read one line from UART");
      this.setOutput(true, "String");
      this.setTooltip("Lê uma linha inteira terminada em quebra de linha (\\n) da porta UART.");
    }
  };

  // Read all data from UART
  Blockly.Blocks['sat_uart_readall'] = {
    init: function() {
      this.setColour('#10b981');
      this.appendDummyInput()
          .appendField("📥 Read all data from UART");
      this.setOutput(true, "String");
      this.setTooltip("Lê todos os bytes atualmente disponíveis no buffer da UART.");
    }
  };

  // Check UART available bytes
  Blockly.Blocks['sat_uart_any'] = {
    init: function() {
      this.setColour('#10b981');
      this.appendDummyInput()
          .appendField("🔍 UART Has Data Available (any)");
      this.setOutput(true, "Boolean");
      this.setTooltip("Retorna verdadeiro se houver dados aguardando leitura na porta UART.");
    }
  };

  // =========================================================================
  // CATEGORIA: BARRAMENTOS — I2C LOW-LEVEL (REGISTRADORES & SCAN)
  // =========================================================================

  // I2C.init
  Blockly.Blocks['sat_i2c_init'] = {
    init: function() {
      this.setColour('#e11d48');
      this.appendDummyInput()
          .appendField("🔧 I2C.init")
          .appendField("SCL:")
          .appendField(new Blockly.FieldNumber(22, 0, 39), "SCL")
          .appendField("SDA:")
          .appendField(new Blockly.FieldNumber(21, 0, 39), "SDA")
          .appendField("Freq:")
          .appendField(new Blockly.FieldNumber(400000, 10000, 1000000), "FREQ");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setTooltip("Inicializa o barramento I2C com pinos e frequência especificados.");
    }
  };

  // I2C.scan
  Blockly.Blocks['sat_i2c_scan'] = {
    init: function() {
      this.setColour('#e11d48');
      this.appendDummyInput()
          .appendField("🔍 I2C.scan (Lista de Dispositivos)");
      this.setOutput(true, "Array");
      this.setTooltip("Varre o barramento I2C e retorna uma lista de endereços encontrados.");
    }
  };

  // I2C.writeto
  Blockly.Blocks['sat_i2c_writeto'] = {
    init: function() {
      this.setColour('#e11d48');
      this.appendValueInput("DATA")
          .appendField("📤 I2C.writeto")
          .appendField("Addr:")
          .appendField(new Blockly.FieldTextInput("0x76"), "ADDR")
          .appendField("Data:");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setTooltip("Escreve dados diretamente em um dispositivo I2C.");
    }
  };

  // I2C.readfrom
  Blockly.Blocks['sat_i2c_readfrom'] = {
    init: function() {
      this.setColour('#e11d48');
      this.appendDummyInput()
          .appendField("📥 I2C.readfrom")
          .appendField("Addr:")
          .appendField(new Blockly.FieldTextInput("0x76"), "ADDR")
          .appendField("nbytes:")
          .appendField(new Blockly.FieldNumber(2, 1, 128), "NBYTES");
      this.setOutput(true, "Array");
      this.setTooltip("Lê um número de bytes diretamente de um dispositivo I2C.");
    }
  };

  // I2C.readfrom_mem
  Blockly.Blocks['sat_i2c_readfrom_mem'] = {
    init: function() {
      this.setColour('#e11d48');
      this.appendDummyInput()
          .appendField("📥 I2C.readfrom_mem")
          .appendField("Addr:")
          .appendField(new Blockly.FieldTextInput("0x68"), "ADDR")
          .appendField("MemAddr (Reg):")
          .appendField(new Blockly.FieldTextInput("0x3B"), "MEMADDR")
          .appendField("nbytes:")
          .appendField(new Blockly.FieldNumber(6, 1, 128), "NBYTES");
      this.setOutput(true, "Array");
      this.setTooltip("Lê registradores de memória interna de um sensor I2C (ex: acelerômetro MPU9250).");
    }
  };

  // I2C.writeto_mem
  Blockly.Blocks['sat_i2c_writeto_mem'] = {
    init: function() {
      this.setColour('#e11d48');
      this.appendValueInput("DATA")
          .appendField("📤 I2C.writeto_mem")
          .appendField("Addr:")
          .appendField(new Blockly.FieldTextInput("0x68"), "ADDR")
          .appendField("MemAddr (Reg):")
          .appendField(new Blockly.FieldTextInput("0x6B"), "MEMADDR")
          .appendField("Data:");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setTooltip("Escreve em um registrador de configuração de um sensor I2C.");
    }
  };

  // =========================================================================
  // BLOCOS DE CONVERSÃO DE TIPOS (TO INT, TO FLOAT, TO STR)
  // =========================================================================

  Blockly.Blocks['sat_math_to_int'] = {
    init: function() {
      this.setColour('#6366f1');
      this.appendValueInput("VALUE")
          .appendField("to int");
      this.setOutput(true, "Number");
      this.setTooltip("Converte um texto ou número decimal em número inteiro (int).");
    }
  };

  Blockly.Blocks['sat_math_to_float'] = {
    init: function() {
      this.setColour('#6366f1');
      this.appendValueInput("VALUE")
          .appendField("to float");
      this.setOutput(true, "Number");
      this.setTooltip("Converte um texto ou número inteiro em número decimal de ponto flutuante (float).");
    }
  };

  Blockly.Blocks['sat_text_to_str'] = {
    init: function() {
      this.setColour('#14b8a6');
      this.appendValueInput("VALUE")
          .appendField("to str");
      this.setOutput(true, "String");
      this.setTooltip("Converte qualquer dado, número ou leitura de sensor em texto (string).");
    }
  };

  // =========================================================================
  // BLOCOS DE TEMPORIZAÇÃO & RELÓGIO OFICIAIS DO BIPES (TIMING / SLEEP / RTC / TIMER)
  // =========================================================================

  // 1. Atraso / Delay (BIPES delay)
  Blockly.Blocks['delay'] = {
    init: function() {
      this.setColour('#7c3aed');
      this.appendValueInput("TIME")
          .setCheck("Number")
          .appendField("⏱️ Atrasar / Pausar");
      this.appendDummyInput()
          .appendField(new Blockly.FieldDropdown([
            ["segundos (s)", "sleep"],
            ["milissegundos (ms)", "sleep_ms"],
            ["microssegundos (µs)", "sleep_us"]
          ]), "SCALE");
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setTooltip("Pausa a execução do satélite pelo tempo especificado em segundos, milissegundos ou microssegundos.");
    }
  };

  // 2. Contador de Tempo (BIPES utime.vars)
  Blockly.Blocks['utime.vars'] = {
    init: function() {
      this.setColour('#7c3aed');
      this.appendDummyInput()
          .appendField("⏱️ Obter contador")
          .appendField(new Blockly.FieldDropdown([
            ["milissegundos (ticks_ms)", "ticks_ms"],
            ["microssegundos (ticks_us)", "ticks_us"],
            ["segundos desde boot (time)", "time"],
            ["nanossegundos (time_ns)", "time_ns"],
            ["ciclos de CPU (ticks_cpu)", "ticks_cpu"]
          ]), "VARS");
      this.setOutput(true, "Number");
      this.setTooltip("Retorna a contagem atual de tempo do processador na unidade selecionada.");
    }
  };

  // 3. Somar Tempo (BIPES utime.ticks_add)
  Blockly.Blocks['utime.ticks_add'] = {
    init: function() {
      this.setColour('#7c3aed');
      this.appendValueInput("TIME1")
          .setCheck("Number")
          .appendField("⏱️ Somar tempo");
      this.appendValueInput("TIME2")
          .setCheck("Number")
          .appendField("+ delta (ms):");
      this.setInputsInline(true);
      this.setOutput(true, "Number");
      this.setTooltip("Soma um valor de delta aos ticks de tempo (time.ticks_add).");
    }
  };

  // 4. Diferença de Tempo (BIPES utime.ticks_diff)
  Blockly.Blocks['utime.ticks_diff'] = {
    init: function() {
      this.setColour('#7c3aed');
      this.appendValueInput("TIME1")
          .setCheck("Number")
          .appendField("⏱️ Diferença de tempo de:");
      this.appendValueInput("TIME2")
          .setCheck("Number")
          .appendField("até:");
      this.setInputsInline(true);
      this.setOutput(true, "Number");
      this.setTooltip("Calcula a diferença exata de tempo entre dois instantes em ticks (time.ticks_diff(t1, t2)).");
    }
  };

  // 5. Prazo Limite / Deadline (BIPES utime.deadline)
  Blockly.Blocks['utime.deadline'] = {
    init: function() {
      this.setColour('#7c3aed');
      this.appendValueInput("TIME")
          .setCheck("Number")
          .appendField("⏱️ Repetir até o prazo limite #")
          .appendField(new Blockly.FieldNumber(0, 0, 9, 1), "ID")
          .appendField("de");
      this.appendDummyInput()
          .appendField(new Blockly.FieldDropdown([
            ["milissegundos (ms)", "ticks_ms"],
            ["segundos (s)", "time"],
            ["microssegundos (µs)", "ticks_us"]
          ]), "SCALE");
      this.appendStatementInput("DO")
          .appendField("faça");
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setTooltip("Executa um laço enquanto o prazo limite de tempo não for atingido.");
    }
  };

  // 6. Temporizador Hardware (BIPES timer)
  Blockly.Blocks['timer'] = {
    init: function() {
      this.setColour('#7c3aed');
      this.appendDummyInput()
          .appendField("⏱️ Temporizador Hardware #")
          .appendField(new Blockly.FieldNumber(0, 0, 3, 1), "timerNumber");
      this.appendDummyInput()
          .appendField("Modo:")
          .appendField(new Blockly.FieldDropdown([
            ["Periódico (repetir)", "PERIODIC"],
            ["Disparo Único (uma vez)", "ONE_SHOT"]
          ]), "MODE")
          .appendField("Intervalo (ms):")
          .appendField(new Blockly.FieldNumber(1000, 1, Infinity, 10), "interval");
      this.appendStatementInput("statements")
          .appendField("ao disparar faça");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setTooltip("Configura um temporizador por hardware (machine.Timer) para executar código em segundo plano.");
    }
  };

  // 7. Parar Temporizador Hardware (BIPES stop_timer)
  Blockly.Blocks['stop_timer'] = {
    init: function() {
      this.setColour('#7c3aed');
      this.appendValueInput("timerNumber")
          .setCheck("Number")
          .appendField("⏱️ Parar Temporizador Hardware #");
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setTooltip("Interrompe e desativa o temporizador por hardware especificado (Timer.deinit()).");
    }
  };

  // 8. Ajustar RTC ESP32 (BIPES esp32_set_rtc)
  Blockly.Blocks['esp32_set_rtc'] = {
    init: function() {
      this.setColour('#7c3aed');
      this.appendDummyInput()
          .appendField("🕒 Ajustar Relógio RTC (ESP32)");
      this.appendValueInput("year")
          .setCheck("Number")
          .setAlign(Blockly.ALIGN_RIGHT)
          .appendField("Ano:");
      this.appendValueInput("month")
          .setCheck("Number")
          .setAlign(Blockly.ALIGN_RIGHT)
          .appendField("Mês:");
      this.appendValueInput("day")
          .setCheck("Number")
          .setAlign(Blockly.ALIGN_RIGHT)
          .appendField("Dia:");
      this.appendValueInput("hour")
          .setCheck("Number")
          .setAlign(Blockly.ALIGN_RIGHT)
          .appendField("Hora:");
      this.appendValueInput("minute")
          .setCheck("Number")
          .setAlign(Blockly.ALIGN_RIGHT)
          .appendField("Minuto:");
      this.appendValueInput("second")
          .setCheck("Number")
          .setAlign(Blockly.ALIGN_RIGHT)
          .appendField("Segundo:");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setTooltip("Configura a data e hora interna do RTC (Real Time Clock) do ESP32.");
    }
  };

  // 9. Obter RTC ESP32 (BIPES esp32_get_rtc)
  Blockly.Blocks['esp32_get_rtc'] = {
    init: function() {
      this.setColour('#7c3aed');
      this.appendDummyInput()
          .appendField("🕒 Obter Data e Hora RTC (ESP32)");
      this.setOutput(true, null);
      this.setTooltip("Retorna a data e hora atual do RTC interno como tupla.");
    }
  };

  // 10. Sono Profundo / Deep Sleep (BIPES deep_sleep)
  Blockly.Blocks['esp32_deep_sleep'] = {
    init: function() {
      this.setColour('#7c3aed');
      this.appendValueInput("interval")
          .setCheck("Number")
          .appendField("💤 Entrar em Sono Profundo (Deep Sleep) por:");
      this.appendDummyInput()
          .appendField("segundos");
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setTooltip("Coloca o microcontrolador em modo de ultra economia de energia Deep Sleep durante N segundos.");
    }
  };

  // Compatibilidade legada
  Blockly.Blocks['sat_time_sleep_ms'] = Blockly.Blocks['delay'];
  Blockly.Blocks['sat_time_sleep_us'] = Blockly.Blocks['delay'];
  Blockly.Blocks['sat_time_ticks_ms'] = Blockly.Blocks['utime.vars'];
  Blockly.Blocks['sat_time_ticks_us'] = Blockly.Blocks['utime.vars'];
  Blockly.Blocks['sat_time_ticks_diff'] = Blockly.Blocks['utime.ticks_diff'];
  Blockly.Blocks['sat_time_localtime'] = Blockly.Blocks['esp32_get_rtc'];

  // =========================================================================
  // BLOCOS DE ARQUIVOS & FLASH (LEITURA, ESCRITA E OPERAÇÕES DE DISCO)
  // =========================================================================

  // 1. Abrir arquivo com configuração de modo e binário
  Blockly.Blocks['file_open'] = {
    init: function() {
      this.setColour('#5b67a5');
      this.appendDummyInput()
          .appendField("📄 abrir arquivo");
      this.appendValueInput("file_name")
          .setCheck("String")
          .setAlign(Blockly.ALIGN_RIGHT)
          .appendField("nome do arquivo:");
      this.appendDummyInput()
          .setAlign(Blockly.ALIGN_RIGHT)
          .appendField("modo:")
          .appendField(new Blockly.FieldDropdown([
            ["Anexar (a)", "a"],
            ["Sobrescrever (w)", "w"],
            ["Ler (r)", "r"],
            ["Leitura e Escrita (w+)", "w+"]
          ]), "dropdown_mode");
      this.appendDummyInput()
          .setAlign(Blockly.ALIGN_RIGHT)
          .appendField("modo binário:")
          .appendField(new Blockly.FieldCheckbox("FALSE"), "checkbox_binary");
      this.setOutput(true, null);
      this.setTooltip("Abre um arquivo na memória Flash ou cartão SD e retorna o identificador do arquivo.");
    }
  };

  // 2. Abrir arquivo de texto para escrita
  Blockly.Blocks['file_open_write'] = {
    init: function() {
      this.setColour('#5b67a5');
      this.appendDummyInput()
          .appendField("📝 abrir arquivo de texto para escrita");
      this.appendValueInput("filename")
          .setCheck("String")
          .setAlign(Blockly.ALIGN_RIGHT)
          .appendField("nome do arquivo:");
      this.setOutput(true, null);
      this.setTooltip("Abre um arquivo para escrita em modo texto ('w').");
    }
  };

  // 3. Abrir arquivo de texto para leitura
  Blockly.Blocks['file_open_read'] = {
    init: function() {
      this.setColour('#5b67a5');
      this.appendDummyInput()
          .appendField("📖 abrir arquivo de texto para leitura");
      this.appendValueInput("filename")
          .setCheck("String")
          .setAlign(Blockly.ALIGN_RIGHT)
          .appendField("nome do arquivo:");
      this.setOutput(true, null);
      this.setTooltip("Abre um arquivo para leitura em modo texto ('r').");
    }
  };

  // 4. Escrever no arquivo
  Blockly.Blocks['file_write'] = {
    init: function() {
      this.setColour('#5b67a5');
      this.appendDummyInput()
          .appendField("✏️ escrever no arquivo")
          .appendField(new Blockly.FieldVariable("file"), "filename");
      this.appendValueInput("data")
          .setAlign(Blockly.ALIGN_RIGHT)
          .appendField("dados:");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setTooltip("Escreve os dados no arquivo aberto.");
    }
  };

  // 5. Escrever linha no arquivo
  Blockly.Blocks['file_write_line'] = {
    init: function() {
      this.setColour('#5b67a5');
      this.appendDummyInput()
          .appendField("✍️ escrever linha no arquivo")
          .appendField(new Blockly.FieldVariable("file"), "filename");
      this.appendValueInput("data")
          .setAlign(Blockly.ALIGN_RIGHT)
          .appendField("linha:");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setTooltip("Escreve uma linha de texto no arquivo com quebra de linha automática (\\n).");
    }
  };

  // 6. Escrever byte único no arquivo
  Blockly.Blocks['file_write_byte'] = {
    init: function() {
      this.setColour('#5b67a5');
      this.appendDummyInput()
          .appendField("🔢 escrever byte no arquivo")
          .appendField(new Blockly.FieldVariable("file"), "filename");
      this.appendValueInput("data")
          .setCheck("Number")
          .setAlign(Blockly.ALIGN_RIGHT)
          .appendField("byte (0-255):");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setTooltip("Escreve um único byte binário no arquivo.");
    }
  };

  // 7. Ler dados do arquivo
  Blockly.Blocks['file_read'] = {
    init: function() {
      this.setColour('#5b67a5');
      this.appendDummyInput()
          .appendField("📖 ler dados do arquivo")
          .appendField(new Blockly.FieldVariable("file"), "filename");
      this.setOutput(true, "String");
      this.setTooltip("Lê e retorna todo o conteúdo do arquivo.");
    }
  };

  // 8. Fechar arquivo
  Blockly.Blocks['file_close'] = {
    init: function() {
      this.setColour('#5b67a5');
      this.appendDummyInput()
          .appendField("🔒 fechar arquivo")
          .appendField(new Blockly.FieldVariable("file"), "filename");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setTooltip("Fecha o arquivo aberto e salva os dados na memória.");
    }
  };

  // 9. Listar arquivos do diretório
  Blockly.Blocks['files_list'] = {
    init: function() {
      this.setColour('#5b67a5');
      this.appendDummyInput()
          .appendField("📋 listar arquivos (os.listdir)");
      this.setOutput(true, "Array");
      this.setTooltip("Retorna uma lista com os nomes de todos os arquivos do diretório atual.");
    }
  };

  // 10. Criar nova pasta
  Blockly.Blocks['uos_mkdir'] = {
    init: function() {
      this.setColour('#a55b5b');
      this.appendDummyInput()
          .appendField("📁 criar nova pasta (mkdir)");
      this.appendValueInput("pIn")
          .setCheck("String")
          .setAlign(Blockly.ALIGN_RIGHT)
          .appendField("nome da pasta:");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setTooltip("Cria uma nova pasta no sistema de arquivos Flash ou SD.");
    }
  };

  // 11. Excluir arquivo
  Blockly.Blocks['uos_remove'] = {
    init: function() {
      this.setColour('#a55b5b');
      this.appendDummyInput()
          .appendField("🗑️ excluir arquivo (remove)");
      this.appendValueInput("pIn")
          .setCheck("String")
          .setAlign(Blockly.ALIGN_RIGHT)
          .appendField("nome do arquivo:");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setTooltip("Exclui permanentemente um arquivo da memória.");
    }
  };

  // 12. Excluir pasta vazia
  Blockly.Blocks['uos_rmdir'] = {
    init: function() {
      this.setColour('#a55b5b');
      this.appendDummyInput()
          .appendField("🗑️ excluir pasta vazia (rmdir)");
      this.appendValueInput("pIn")
          .setCheck("String")
          .setAlign(Blockly.ALIGN_RIGHT)
          .appendField("nome da pasta:");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setTooltip("Remove uma pasta que esteja vazia.");
    }
  };

  // 13. Mudar diretório atual
  Blockly.Blocks['uos_chdir'] = {
    init: function() {
      this.setColour('#a55b5b');
      this.setColour('#0284c7');
      this.appendValueInput("pIn")
          .setCheck("String")
          .appendField("📁 Mudar de pasta (os.chdir):");
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setTooltip("Altera o diretório de trabalho atual.");
    }
  };

  Blockly.Blocks['uos_getcwd'] = {
    init: function() {
      this.setColour('#0284c7');
      this.appendDummyInput()
          .appendField("📁 Obter pasta atual (os.getcwd)");
      this.setOutput(true, "String");
      this.setTooltip("Retorna o caminho do diretório de trabalho atual.");
    }
  };

  // =========================================================================
  // BLOCOS AVANÇADOS & PYTHON (TRY/EXCEPT, EXEC_PYTHON, IRQ INTERRUPÇÃO MULTILINHA)
  // =========================================================================

  Blockly.Blocks['try_catch'] = {
    init: function() {
      this.setColour('#3776ab');
      this.appendStatementInput("main_code")
          .appendField(new Blockly.FieldImage("media/python_logo.svg", 18, 18, "Python"))
          .appendField("🛡️ Tente executar");
      this.appendStatementInput("catch_code")
          .appendField("no erro (except Exception)");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setTooltip("Tratamento de exceções defensivo para evitar reinicializações inesperadas da missão.");
    }
  };

  Blockly.Blocks['exec_python'] = {
    init: function() {
      this.setColour('#3776ab');
      this.appendValueInput("command")
          .setCheck("String")
          .appendField(new Blockly.FieldImage("media/python_logo.svg", 18, 18, "Python"))
          .appendField("Executar Código Python");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setTooltip("Insere e executa uma linha direta de código Python nativo.");
    }
  };

  Blockly.Blocks['exec_python_output'] = {
    init: function() {
      this.setColour('#3776ab');
      this.appendValueInput("command")
          .setCheck("String")
          .appendField(new Blockly.FieldImage("media/python_logo.svg", 18, 18, "Python"))
          .appendField("Executar expressão Python:");
      this.setOutput(true, null);
      this.setTooltip("Avalia e retorna o resultado de uma expressão Python.");
    }
  };

  // Iniciar Interrupção GPIO em Múltiplas Linhas (Compacto, Limpo e Didático)
  Blockly.Blocks['inter_init'] = {
    init: function() {
      this.setColour('#3776ab');
      this.appendDummyInput()
          .appendField(new Blockly.FieldImage("media/python_logo.svg", 20, 20, "Python"))
          .appendField("⚡ Iniciar Interrupção GPIO");
      this.appendValueInput("pin")
          .setCheck("Number")
          .setAlign(Blockly.ALIGN_RIGHT)
          .appendField("Pino GPIO:");
      this.appendValueInput("Nome")
          .setCheck("String")
          .setAlign(Blockly.ALIGN_RIGHT)
          .appendField("Nome da interrupção:");
      this.appendValueInput("Função")
          .setCheck("String")
          .setAlign(Blockly.ALIGN_RIGHT)
          .appendField("Função callback:");
      this.appendDummyInput()
          .setAlign(Blockly.ALIGN_RIGHT)
          .appendField("Disparo:")
          .appendField(new Blockly.FieldDropdown([
            ["Borda de Descida (FALLING)", "IRQ_FALLING"],
            ["Borda de Subida (RISING)", "IRQ_RISING"],
            ["Ambas as Bordas (BOTH)", "IRQ_FALLING | Pin.IRQ_RISING"]
          ]), "TRIGGER");
      this.setInputsInline(false);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setTooltip("Configura uma interrupção por hardware em um pino GPIO com função de retorno (callback).");
    }
  };

  Blockly.Blocks['sat_python_comment'] = {
    init: function() {
      this.setColour('#64748b');
      this.appendDummyInput()
          .appendField("💬 #")
          .appendField(new Blockly.FieldTextInput("Comentário ou anotação do satélite"), "COMMENT");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setTooltip("Adiciona uma linha de comentário (# ...) no código MicroPython gerado.");
    }
  };

  // =========================================================================
  // BLOCOS ESPECIAIS: WAVESHARE RP2040-ZERO
  // =========================================================================
  Blockly.Blocks['sat_rp2040_rgb_led'] = {
    init: function() {
      this.setColour('#ec4899');
      this.appendDummyInput()
          .appendField("💡 LED RGB RP2040-Zero (GP16)")
          .appendField("R:")
          .appendField(new Blockly.FieldNumber(255, 0, 255), "R")
          .appendField("G:")
          .appendField(new Blockly.FieldNumber(0, 0, 255), "G")
          .appendField("B:")
          .appendField(new Blockly.FieldNumber(0, 0, 255), "B");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setTooltip("Define a cor do LED RGB WS2812 onboard da placa Waveshare RP2040-Zero conectado no GPIO 16 (0 a 255 para cada canal).");
    }
  };

  Blockly.Blocks['sat_rp2040_temp'] = {
    init: function() {
      this.setColour('#0284c7');
      this.appendDummyInput()
          .appendField("🌡️ Temp. Interna RP2040 (°C)");
      this.setOutput(true, "Number");
      this.setTooltip("Lê a temperatura interna em graus Celsius do silício do microcontrolador RP2040 via canal analógico ADC(4).");
    }
  };

  // =========================================================================
  // BLOCOS OFICIAIS OBSAT: MCP23017 I/O EXPANDER & TONE SOUND (GPIO 25)
  // =========================================================================
  Blockly.Blocks['mcp23017_init'] = {
    init: function() {
      this.setColour('#4a9a5a');
      this.appendDummyInput()
          .appendField("Init MCP23017");
      this.appendValueInput("scl")
          .setCheck("Number")
          .appendField("SCL");
      this.appendValueInput("sda")
          .setCheck("Number")
          .appendField("SDA");
      this.setInputsInline(false);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setTooltip("Inicializa o chip de expansão de saídas I2C MCP23017 para acender as luzes da nave.");
    }
  };

  Blockly.Blocks['mcp23017_set_pin'] = {
    init: function() {
      this.setColour('#5c6bc0');
      this.appendValueInput("pin")
          .setCheck("Number")
          .appendField("MCP23017 set pin");
      this.appendValueInput("value")
          .setCheck("Number")
          .appendField("para");
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setTooltip("Define o estado do pino do MCP23017 (1 para LIGAR ou 0 para DESLIGAR).");
    }
  };

  Blockly.Blocks['tone'] = {
    init: function() {
      this.setColour('#5c6bc0');
      this.appendDummyInput()
          .appendField("Tone (Hz)  Pin")
          .appendField(new Blockly.FieldDropdown([
            ["pino D25 / DAC 1 / ADC2_8 / GPIO25", "25"],
            ["pino D26 / GPIO26", "26"],
            ["pino D27 / GPIO27", "27"],
            ["pino D15 / GPIO15", "15"]
          ]), "pin");
      this.appendValueInput("frequency")
          .setCheck("Number")
          .appendField("Frequency");
      this.appendValueInput("duration")
          .setCheck("Number")
          .appendField("Duration (s):");
      this.appendDummyInput()
          .appendField("(0 for infinite duration)");
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setTooltip("Emite um tom sonoro (frequência em Hz e duração em segundos) no pino especificado (GPIO25).");
    }
  };

})(typeof Blockly !== 'undefined' ? Blockly : null);
