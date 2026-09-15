/**
 * SatBlocks App Controller — Lógica Principal e Integração de Abas
 * Copyright (C) 2026 OBSAT / BIPES Project
 */

window.SatBlocksApp = (function() {
  'use strict';

  let workspace = null;
  let currentBoard = 'esp32_devkit';

  // Base de pinout embutida diretamente para garantia de execução offline
  const boardsData = {
    "pion_cubesat": {
      "name": "PION CubeSat",
      "mcu": "ESP32 Dual Core 240MHz",
      "flash": "4MB Flash / 520KB SRAM",
      "wireless": "Wi-Fi 802.11 b/g/n + Bluetooth BLE 4.2",
      "image": "media/pion_cubesat_pinout.png",
      "pins": [
        { "term": 1,  "pin": "3V3",     "func": "Alimentação 3.3V",                   "type": "pwr",  "rec": "VCC Sensores / Cargas 3.3V" },
        { "term": 2,  "pin": "3V3",     "func": "Alimentação 3.3V",                   "type": "pwr",  "rec": "VCC Barramento 3.3V" },
        { "term": 3,  "pin": "GPIO 19", "func": "VSPI MISO (Master In Slave Out)",    "type": "spi",  "rec": "Cartão SD / Barramento SPI" },
        { "term": 4,  "pin": "GPIO 23", "func": "VSPI MOSI (Master Out Slave In)",   "type": "spi",  "rec": "Cartão SD / Barramento SPI" },
        { "term": 5,  "pin": "GPIO 18", "func": "VSPI SCK (Serial Clock)",           "type": "spi",  "rec": "Cartão SD / Barramento SPI" },
        { "term": 6,  "pin": "N/C",     "func": "Não Conectado",                      "type": "nc",   "rec": "Livre" },
        { "term": 7,  "pin": "GND",     "func": "Terra / Ground (0V)",                "type": "gnd",  "rec": "Referência Terra" },
        { "term": 8,  "pin": "GND",     "func": "Terra / Ground (0V)",                "type": "gnd",  "rec": "Referência Terra" },
        { "term": 9,  "pin": "N/C",     "func": "Não Conectado",                      "type": "nc",   "rec": "Livre" },
        { "term": 10, "pin": "GPIO 2",  "func": "ADC2_2 / LED Onboard",               "type": "gpio", "rec": "Sinalização / Beacon" },
        { "term": 11, "pin": "N/C",     "func": "Não Conectado",                      "type": "nc",   "rec": "Livre" },
        { "term": 12, "pin": "GPIO 4",  "func": "ADC2_0 / GPIO",                      "type": "adc",  "rec": "Sensor Analógico / Digital" },
        { "term": 13, "pin": "GPI 35",  "func": "BATSENSE (Sensor de Tensão Bateria)","type": "adc",  "rec": "Telemetria Nível Bateria" },
        { "term": 14, "pin": "GPIO 25", "func": "Buzzer (Sirene / Beacon Sonoro)",    "type": "pwm",  "rec": "Localizador de Resgate" },
        { "term": 15, "pin": "GPIO 27", "func": "ADC2_7 / GPIO",                      "type": "adc",  "rec": "Payload / Sensor Auxiliar" },
        { "term": 16, "pin": "GPIO 14", "func": "ADC2_6 / GPIO",                      "type": "adc",  "rec": "Payload / Atuador" },
        { "term": 17, "pin": "GPI 36",  "func": "ADC1_0 / SENSOR_VP",                 "type": "adc",  "rec": "Sensor Analógico 1" },
        { "term": 18, "pin": "GPIO 13", "func": "ADC2_4 / GPIO",                      "type": "adc",  "rec": "Payload / Sensor Auxiliar" },
        { "term": 19, "pin": "GPIO 16", "func": "UART2 RX (Recepção Serial)",         "type": "uart", "rec": "GPS NEO-6M / LoRa RX" },
        { "term": 20, "pin": "GPIO 17", "func": "UART2 TX (Transmissão Serial)",      "type": "uart", "rec": "GPS NEO-6M / LoRa TX" },
        { "term": 21, "pin": "N/C",     "func": "Não Conectado",                      "type": "nc",   "rec": "Livre" },
        { "term": 22, "pin": "N/C",     "func": "Não Conectado",                      "type": "nc",   "rec": "Livre" },
        { "term": 23, "pin": "GND",     "func": "Terra / Ground (0V)",                "type": "gnd",  "rec": "Referência Terra" },
        { "term": 24, "pin": "GND",     "func": "Terra / Ground (0V)",                "type": "gnd",  "rec": "Referência Terra" },
        { "term": 25, "pin": "N/C",     "func": "Não Conectado",                      "type": "nc",   "rec": "Livre" },
        { "term": 26, "pin": "N/C",     "func": "Não Conectado",                      "type": "nc",   "rec": "Livre" },
        { "term": 27, "pin": "VBUS",    "func": "Alimentação 5V USB",                 "type": "pwr",  "rec": "Barramento de 5V" },
        { "term": 28, "pin": "VBUS",    "func": "Alimentação 5V USB",                 "type": "pwr",  "rec": "Barramento de 5V" },
        { "term": 29, "pin": "N/C",     "func": "Não Conectado",                      "type": "nc",   "rec": "Livre" },
        { "term": 30, "pin": "GPIO 21", "func": "I2C SDA (Dados Sensores)",           "type": "i2c",  "rec": "SHT20, BMP280, MPU9250, CCS811" },
        { "term": 31, "pin": "GPI 34",  "func": "Luminosidade (Sensor Solar / LDR)",  "type": "adc",  "rec": "Sensor de Luz Solar (LDR)" },
        { "term": 32, "pin": "GPIO 22", "func": "I2C SCL (Clock Sensores)",          "type": "i2c",  "rec": "SHT20, BMP280, MPU9250, CCS811" },
        { "term": 33, "pin": "GND",     "func": "Terra / Ground (0V)",                "type": "gnd",  "rec": "Referência Terra" },
        { "term": 34, "pin": "GND",     "func": "Terra / Ground (0V)",                "type": "gnd",  "rec": "Referência Terra" },
        { "term": 35, "pin": "GPIO 26", "func": "ADC2_9 / DAC2",                      "type": "adc",  "rec": "Saída Analógica DAC / ADC" },
        { "term": 36, "pin": "N/C",     "func": "Não Conectado",                      "type": "nc",   "rec": "Livre" },
        { "term": 37, "pin": "N/C",     "func": "Não Conectado",                      "type": "nc",   "rec": "Livre" },
        { "term": 38, "pin": "GPIO 5",  "func": "VSPI CS (Chip Select)",              "type": "spi",  "rec": "CS Cartão MicroSD" },
        { "term": 39, "pin": "VBAT",    "func": "Tensão da Bateria (Alimentação)",    "type": "pwr",  "rec": "Linha Positiva Bateria LiPo" },
        { "term": 40, "pin": "VBAT",    "func": "Tensão da Bateria (Alimentação)",    "type": "pwr",  "rec": "Linha Positiva Bateria LiPo" }
      ]
    },
    "esp32_devkit": {
      "name": "ESP32 DevKit V1",
      "mcu": "ESP32 Dual Core 240MHz",
      "flash": "4MB Flash / 520KB SRAM",
      "wireless": "Wi-Fi 802.11 b/g/n + Bluetooth 4.2 BLE",
      "image": "media/boards/ESP32-Pinout.jpg",
      "pins": [
        { "pin": "GPIO 21", "func": "I2C SDA (D21)", "type": "i2c", "rec": "Barramento I2C" },
        { "pin": "GPIO 22", "func": "I2C SCL (D22)", "type": "i2c", "rec": "Barramento I2C" },
        { "pin": "GPIO 18", "func": "VSPI SCK (D18)", "type": "spi", "rec": "Barramento SPI" },
        { "pin": "GPIO 19", "func": "VSPI MISO (D19)", "type": "spi", "rec": "Barramento SPI" },
        { "pin": "GPIO 23", "func": "VSPI MOSI (D23)", "type": "spi", "rec": "Barramento SPI" },
        { "pin": "GPIO 5",  "func": "VSPI CS (D5)", "type": "gpio", "rec": "Barramento SPI" },
        { "pin": "GPIO 2",  "func": "LED Onboard (D2 / ADC2_2)", "type": "gpio", "rec": "Sinalização" },
        { "pin": "GPIO 4",  "func": "ADC2_0 (D4)", "type": "adc", "rec": "Entrada Analógica" },
        { "pin": "GPIO 34", "func": "ADC1_6 (D34 - Input Only)", "type": "adc", "rec": "Sensor Analógico" },
        { "pin": "GPIO 35", "func": "ADC1_7 (D35 - Input Only)", "type": "adc", "rec": "Sensor Analógico" },
        { "pin": "GPIO 36", "func": "ADC1_0 / SENSOR_VP", "type": "adc", "rec": "Sensor Analógico" },
        { "pin": "GPIO 39", "func": "ADC1_3 / SENSOR_VN", "type": "adc", "rec": "Sensor Analógico" },
        { "pin": "GPIO 25", "func": "DAC 1 / ADC2_8 (D25)", "type": "pwm", "rec": "Saída DAC / PWM" },
        { "pin": "GPIO 26", "func": "DAC 2 / ADC2_9 (D26)", "type": "pwm", "rec": "Saída DAC / PWM" },
        { "pin": "GPIO 16", "func": "UART2 RX (RX2)", "type": "uart", "rec": "Comunicação Serial" },
        { "pin": "GPIO 17", "func": "UART2 TX (TX2)", "type": "uart", "rec": "Comunicação Serial" }
      ]
    },
    "esp32_c3_supermini": {
      "name": "ESP32-C3 SuperMini",
      "mcu": "ESP32-C3 RISC-V 160MHz",
      "flash": "4MB Flash / 400KB SRAM",
      "wireless": "Wi-Fi 2.4GHz + BLE 5.0",
      "image": "media/boards/esp32_c3_supermini.png",
      "pins": [
        { "pin": "5V",      "func": "Alimentação 5V (Power)", "type": "pwr",  "rec": "Entrada 5V USB" },
        { "pin": "GND",     "func": "Terra / Ground (0V)",    "type": "gnd",  "rec": "Referência Terra" },
        { "pin": "3V3",     "func": "Alimentação 3.3V (Power)","type": "pwr",  "rec": "Saída 3.3V" },
        { "pin": "GPIO 4",  "func": "A4 / SCK (ADC / SPI)",   "type": "spi",  "rec": "Barramento SPI / ADC" },
        { "pin": "GPIO 3",  "func": "A3 (ADC)",               "type": "adc",  "rec": "Entrada Analógica" },
        { "pin": "GPIO 2",  "func": "A2 (ADC)",               "type": "adc",  "rec": "Entrada Analógica" },
        { "pin": "GPIO 1",  "func": "A1 (ADC)",               "type": "adc",  "rec": "Entrada Analógica" },
        { "pin": "GPIO 0",  "func": "A0 (ADC)",               "type": "adc",  "rec": "Entrada Analógica" },
        { "pin": "GPIO 5",  "func": "A5 / MISO (ADC / SPI)",  "type": "spi",  "rec": "Barramento SPI / ADC" },
        { "pin": "GPIO 6",  "func": "MOSI (SPI)",             "type": "spi",  "rec": "Barramento SPI" },
        { "pin": "GPIO 7",  "func": "SS / CS (SPI)",          "type": "spi",  "rec": "Barramento SPI" },
        { "pin": "GPIO 8",  "func": "SDA (I2C)",              "type": "i2c",  "rec": "Barramento I2C" },
        { "pin": "GPIO 9",  "func": "SCL (I2C)",              "type": "i2c",  "rec": "Barramento I2C" },
        { "pin": "GPIO 10", "func": "Digital I/O",            "type": "gpio", "rec": "GPIO Geral" },
        { "pin": "GPIO 20", "func": "RX (UART)",              "type": "uart", "rec": "Recepção Serial" },
        { "pin": "GPIO 21", "func": "TX (UART)",              "type": "uart", "rec": "Transmissão Serial" }
      ]
    },
    "esp32_cam": {
      "name": "ESP32-CAM",
      "mcu": "ESP32 Dual Core 240MHz + Câmera OV2640",
      "flash": "4MB Flash + 4MB PSRAM Externa",
      "wireless": "Wi-Fi 802.11 b/g/n + Bluetooth",
      "image": "media/boards/esp32_cam.png",
      "pins": [
        { "pin": "5V",      "func": "Alimentação 5V (Power)",                "type": "pwr",  "rec": "Entrada 5V" },
        { "pin": "GND",     "func": "Terra / Ground (0V)",                   "type": "gnd",  "rec": "Referência Terra" },
        { "pin": "GPIO 12", "func": "I2C SDA / Touch5 / HSPI_Q / ADC2_5",    "type": "i2c",  "rec": "Barramento I2C SDA" },
        { "pin": "GPIO 13", "func": "I2C SCL / Touch4 / HSPI_ID / ADC2_4",   "type": "i2c",  "rec": "Barramento I2C SCL" },
        { "pin": "GPIO 15", "func": "SD CMD / Touch3 / HSPI_CS0 / ADC2_3",   "type": "spi",  "rec": "Cartão MicroSD" },
        { "pin": "GPIO 14", "func": "SD CLK / Touch6 / HSPI_CLK / ADC2_6",   "type": "spi",  "rec": "Cartão MicroSD" },
        { "pin": "GPIO 2",  "func": "SD DATA0 / Touch2 / HSPI_WP / ADC2_2",  "type": "spi",  "rec": "Cartão MicroSD" },
        { "pin": "GPIO 4",  "func": "Flash LED / Touch0 / HSPI_HD / ADC2_0", "type": "gpio", "rec": "Flash Light Onboard" },
        { "pin": "3.3V",    "func": "Saída 3.3V (Power)",                    "type": "pwr",  "rec": "Saída 3.3V" },
        { "pin": "GPIO 16", "func": "UART2 RX (U2_RXD)",                     "type": "uart", "rec": "Comunicação Serial RX" },
        { "pin": "GPIO 0",  "func": "Boot Mode / ADC2_1 / Touch1 / CLK1",    "type": "gpio", "rec": "Modo de Gravação" },
        { "pin": "GND",     "func": "Terra / Ground (0V)",                   "type": "gnd",  "rec": "Referência Terra" },
        { "pin": "VCC",     "func": "Alimentação VCC (5V ou 3.3V)",          "type": "pwr",  "rec": "Entrada Alimentação" },
        { "pin": "GPIO 3",  "func": "UART0 RX (U0_RXD) / CLK2",              "type": "uart", "rec": "Gravação / Serial RX" },
        { "pin": "GPIO 1",  "func": "UART0 TX (U0_TXD) / CLK3",              "type": "uart", "rec": "Gravação / Serial TX" },
        { "pin": "GND",     "func": "Terra / Ground (0V)",                   "type": "gnd",  "rec": "Referência Terra" }
      ]
    },
    "rp2040_zero": {
      "name": "Waveshare RP2040-Zero",
      "mcu": "Raspberry Pi RP2040 Dual Cortex-M0+ @ 133MHz",
      "flash": "4MB SPI Flash Oficial Waveshare / 264KB SRAM",
      "wireless": "USB-C Nativo CDC / Expansão LoRa SX1276 & GPS",
      "firmware": "boards/WAVESHARE-RP2040-Board/WAVESHARE-RP2040-20260609-v1.29.0-4MB.uf2",
      "image": "media/boards/Waveshare RP2040-Zero.jpg",
      "pins": [
        { "pin": "5V",      "func": "Alimentação 5V VBUS USB",                    "type": "pwr",  "rec": "Entrada 5V USB Externa" },
        { "pin": "GND",     "func": "Terra / Ground (0V)",                       "type": "gnd",  "rec": "Referência Terra" },
        { "pin": "3V3",     "func": "Alimentação 3.3V (Saída)",                  "type": "pwr",  "rec": "VCC BMP280 / MPU6050" },
        { "pin": "GPIO 0",  "func": "I2C0 SDA (BMP280 & MPU6050) / UART0 TX",    "type": "i2c",  "rec": "Barramento I2C Dados (SDA)" },
        { "pin": "GPIO 1",  "func": "I2C0 SCL (BMP280 & MPU6050) / UART0 RX",    "type": "i2c",  "rec": "Barramento I2C Clock (SCL)" },
        { "pin": "GPIO 2",  "func": "SPI0 SCK (LoRa SX1276) / I2C1 SDA",         "type": "spi",  "rec": "Barramento SPI Clock" },
        { "pin": "GPIO 3",  "func": "SPI0 MOSI (LoRa SX1276) / I2C1 SCL",        "type": "spi",  "rec": "Barramento SPI MOSI" },
        { "pin": "GPIO 4",  "func": "SPI0 MISO (LoRa) / UART1 TX (GPS)",         "type": "spi",  "rec": "Barramento SPI MISO / Serial TX" },
        { "pin": "GPIO 5",  "func": "LoRa CS / NSS / UART1 RX (GPS)",            "type": "gpio", "rec": "Chip Select LoRa / Serial RX" },
        { "pin": "GPIO 6",  "func": "LoRa RESET / PWM Atuador",                  "type": "gpio", "rec": "Sinal Reset / Paraquedas" },
        { "pin": "GPIO 7",  "func": "LoRa DIO0 / Interrupção",                   "type": "gpio", "rec": "Interrupção RX LoRa" },
        { "pin": "GPIO 8",  "func": "I2C0 SDA Auxiliar / UART1 TX",              "type": "i2c",  "rec": "I2C Alternativo / Serial TX" },
        { "pin": "GPIO 9",  "func": "I2C0 SCL Auxiliar / UART1 RX",              "type": "i2c",  "rec": "I2C Alternativo / Serial RX" },
        { "pin": "GPIO 10", "func": "PWM Buzzer Localizador",                    "type": "pwm",  "rec": "Beacon Sonoro de Resgate" },
        { "pin": "GPIO 11", "func": "Payload Digital I/O",                       "type": "gpio", "rec": "Controle de Carga Útil" },
        { "pin": "GPIO 12", "func": "Acionamento Térmico Antena",                "type": "gpio", "rec": "Queima de Linha / Abertura" },
        { "pin": "GPIO 13", "func": "Sensor DHT22 / 1-Wire",                     "type": "gpio", "rec": "Sensor Digital de Umidade" },
        { "pin": "GPIO 14", "func": "GPIO Geral / I2C1 SDA Secundário",          "type": "gpio", "rec": "Expansão de Sensores" },
        { "pin": "GPIO 15", "func": "GPIO Geral / I2C1 SCL Secundário",          "type": "gpio", "rec": "Expansão de Sensores" },
        { "pin": "GPIO 16", "func": "LED RGB WS2812 Onboard (NeoPixel)",         "type": "led",  "rec": "Status / Sinalizador Visual" },
        { "pin": "GPIO 26", "func": "ADC0 (Sensor de Luz LDR Solar)",            "type": "adc",  "rec": "Entrada Analógica 0 (0-3.3V)" },
        { "pin": "GPIO 27", "func": "ADC1 (Sensor de Radiação UV)",              "type": "adc",  "rec": "Entrada Analógica 1 (0-3.3V)" },
        { "pin": "GPIO 28", "func": "ADC2 (Divisor Tensão Bateria EPS)",         "type": "adc",  "rec": "Telemetria Nível Bateria LiPo" },
        { "pin": "GPIO 29", "func": "ADC3 (Canal Analógico Auxiliar)",           "type": "adc",  "rec": "Entrada Analógica 3" },
        { "pin": "ADC 4",   "func": "Sensor Térmico Interno do Silício RP2040",   "type": "adc",  "rec": "Telemetria Térmica do Chip RP2040" }
      ]
    }
  };

  // ==========================================
  // FORMATADOR SEGURO E RÁPIDO DO TERMINAL REPL
  // ==========================================
  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function appendTerminalLog(rawText) {
    const logsEl = document.getElementById('terminalFullLogs');
    if (!logsEl || rawText === null || rawText === undefined) return;

    // Normaliza quebras de linha carriage-return do MicroPython
    const text = String(rawText).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Divide por linhas para aplicar formatação de cores por tipo de linha
    const lines = text.split('\n');
    const formattedPieces = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('[SISTEMA]') || line.startsWith('[BOOT]') || line.startsWith('[OBSAT]') || line.startsWith('[CONECTADO]')) {
        formattedPieces.push(`<span class="term-sys">${escapeHtml(line)}</span>`);
      } else if (line.includes('Traceback (most recent call last):') || line.includes('Error:') || line.startsWith('🛑 [SISTEMA]')) {
        formattedPieces.push(`<span class="term-err">${escapeHtml(line)}</span>`);
      } else if (line.startsWith('>>> ') || line.startsWith('... ')) {
        const prompt = line.substring(0, 4);
        const rest = line.substring(4);
        formattedPieces.push(`<span class="term-prompt">${escapeHtml(prompt)}</span>${escapeHtml(rest)}`);
      } else {
        formattedPieces.push(escapeHtml(line));
      }

      if (i < lines.length - 1) {
        formattedPieces.push('\n');
      }
    }

    // Injeta com segurança no elemento sem corromper HTML
    logsEl.insertAdjacentHTML('beforeend', formattedPieces.join(''));
    scrollTerminalToBottom();
  }

  function init() {
    if (window.SatProfiles) {
      window.SatProfiles.init();
    }
    try {
      setupBlockly();
    } catch (err) {
      console.error('Erro fatal ao inicializar o workspace Blockly:', err);
      const blocklyDiv = document.getElementById('blocklyDiv');
      if (blocklyDiv) {
        blocklyDiv.innerHTML = '<div style="padding:24px;font-family:sans-serif;color:#7f1d1d;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;margin:16px;">'
          + '<strong>⚠️ Não foi possível carregar o editor de blocos.</strong><br>'
          + 'Tente recarregar a página. Se o problema persistir, use o botão "Novo Projeto" '
          + 'para descartar um bloco customizado corrompido, ou contate a equipe OBSAT.'
          + '</div>';
      }
      return;
    }
    setupEvents();
    updateHeaderCompactMode();
    // Reavalia depois que fontes/ícones tiverem carregado por completo (a medição
    // inicial pode ocorrer antes disso e ficar levemente imprecisa).
    setTimeout(updateHeaderCompactMode, 300);
    SatFiles.init();
    SatDataboard.init();
    SatBlocksTour.init();

    // Conectar ouvinte de dados do satélite para o terminal
    SatConnection.addDataListener((text) => {
      appendTerminalLog(text);
      if (text.includes('>>>') || text.includes('KeyboardInterrupt') || text.includes('Traceback')) {
        setRunningState(false);
      }
    });
  }

  function loadCustomStudioBlocks(toolboxXml) {
    try {
      const saved = localStorage.getItem('satblocks_custom_blocks');
      if (!saved) return;
      const customBlocks = JSON.parse(saved);
      if (!Array.isArray(customBlocks) || !customBlocks.length) return;

      customBlocks.forEach(b => {
        // Registra a definição JS no runtime Blockly
        if (b.jsDefinition) {
          try { eval(b.jsDefinition); } catch (e) { console.warn('Erro ao avaliar definição JS do bloco customizado:', e); }
        }
        // Registra o gerador Python
        if (b.pyCodeGenerator) {
          try { eval(b.pyCodeGenerator); } catch (e) { console.warn('Erro ao avaliar gerador Python do bloco customizado:', e); }
        }

        // Injeta a tag do bloco no toolbox XML da IDE
        if (b.toolboxXml && toolboxXml) {
          try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(b.toolboxXml, 'text/xml');
            const blockNode = doc.documentElement;

            const targetCategory = b.category || 'Sensores Ambientais';
            let catNode = Array.from(toolboxXml.querySelectorAll('category')).find(c => {
              const name = c.getAttribute('name') || '';
              return name.toLowerCase().includes(targetCategory.toLowerCase());
            });

            if (!catNode) {
              catNode = toolboxXml.querySelector('category[name*="Sensores"]') || toolboxXml.querySelector('category');
            }

            if (catNode && blockNode) {
              const importedNode = document.importNode(blockNode, true);
              catNode.appendChild(importedNode);
            }
          } catch (e) {
            console.warn('Erro ao injetar XML de bloco customizado:', e);
          }
        }
      });
    } catch (e) {
      console.warn('Erro geral ao carregar blocos customizados:', e);
    }
  }

  function setupBlockly() {
    const blocklyDiv = document.getElementById('blocklyDiv');
    const toolboxXml = document.getElementById('toolbox');

    // Injeta dinamicamente blocos customizados criados no SatBlocks Studio
    loadCustomStudioBlocks(toolboxXml);

    workspace = Blockly.inject('blocklyDiv', {
      toolbox: toolboxXml,
      media: 'media/',
      sounds: false,
      zoom: {
        controls: true,
        wheel: true,
        startScale: 0.95,
        maxScale: 2.0,
        minScale: 0.5,
        scaleSpeed: 1.15
      },
      trashcan: true,
      grid: {
        spacing: 25,
        length: 3,
        colour: '#334155',
        snap: true
      }
    });

    window.workspace = workspace;

    const onResize = function() {
      Blockly.svgResize(workspace);
    };

    window.addEventListener('resize', onResize, false);
    onResize();

    // Registra os botões de ação direta da categoria Drivers & Bibliotecas
    workspace.registerButtonCallback('INSTALL_ALL_DRIVERS', () => {
      if (window.SatFiles) window.SatFiles.installAllDrivers();
    });
    workspace.registerButtonCallback('INSTALL_SHT20', () => {
      if (window.SatFiles) window.SatFiles.installDriver('sht20.py');
    });
    workspace.registerButtonCallback('INSTALL_BMP280', () => {
      if (window.SatFiles) window.SatFiles.installDriver('bmp280.py');
    });
    workspace.registerButtonCallback('INSTALL_MPU9250', () => {
      if (window.SatFiles) window.SatFiles.installDriver('mpu9250.py');
    });
    workspace.registerButtonCallback('INSTALL_MPU6050', () => {
      if (window.SatFiles) window.SatFiles.installDriver('mpu6050.py');
    });
    workspace.registerButtonCallback('INSTALL_CCS811', () => {
      if (window.SatFiles) window.SatFiles.installDriver('ccs811.py');
    });
    workspace.registerButtonCallback('INSTALL_GPS', () => {
      if (window.SatFiles) window.SatFiles.installDriver('micropyGPS.py');
    });
    workspace.registerButtonCallback('INSTALL_MCP23017', () => {
      if (window.SatFiles) window.SatFiles.installDriver('mcp23017.py');
    });
    workspace.registerButtonCallback('INSTALL_UREQUESTS', () => {
      if (window.SatFiles) window.SatFiles.installDriver('urequests.py');
    });
    workspace.registerButtonCallback('INSTALL_NETWORK', () => {
      if (window.SatFiles) window.SatFiles.installDriver('network.py');
    });
    workspace.registerButtonCallback('INSTALL_CAMERA', () => {
        if (window.SatFiles) {
          window.SatFiles.installDriver('camera.py');
        } else {
          alert("Para utilizar a câmera OV2640 ou OV3660, grave o firmware 'MicroPython com Câmera' pelo Flasher.");
        }
      });

      workspace.registerButtonCallback('OPEN_FLASH_FILES', () => {
      switchMainTab('files');
    });

    workspace.registerButtonCallback('LOAD_RP2040_MENSA', () => {
      if (confirm('Deseja carregar no workspace a Missão da Oficina Mensa Brasil (Waveshare RP2040-Zero + BMP280 + MPU6050 + Wi-Fi + LED RGB)?')) {
        if (window.SatProfiles && typeof window.SatProfiles.getMissionRp2040MensaXml === 'function') {
          const rpXml = window.SatProfiles.getMissionRp2040MensaXml();
          const parser = Blockly.Xml.textToDom || (Blockly.utils && Blockly.utils.xml && Blockly.utils.xml.textToDom);
          const dom = parser(rpXml);
          workspace.clear();
          Blockly.Xml.domToWorkspace(dom, workspace);
          updateGeneratedCode();
          saveWorkspaceToStorage();
          if (window.SatFiles && window.SatFiles.showDriverToast) {
            window.SatFiles.showDriverToast('🎓 Missão Oficina Mensa (Waveshare RP2040-Zero) carregada com sucesso!');
          }
        }
      }
    });

    workspace.registerButtonCallback('LOAD_RP2040_OBSAT', () => {
      if (confirm('Deseja carregar no workspace a Missão Oficial Edital OBSAT para a Waveshare RP2040-Zero?')) {
        if (window.SatProfiles && typeof window.SatProfiles.getMissionRp2040ObsatXml === 'function') {
          const rpXml = window.SatProfiles.getMissionRp2040ObsatXml();
          const parser = Blockly.Xml.textToDom || (Blockly.utils && Blockly.utils.xml && Blockly.utils.xml.textToDom);
          const dom = parser(rpXml);
          workspace.clear();
          Blockly.Xml.domToWorkspace(dom, workspace);
          updateGeneratedCode();
          saveWorkspaceToStorage();
          if (window.SatFiles && window.SatFiles.showDriverToast) {
            window.SatFiles.showDriverToast('🛰️ Missão Oficial Edital OBSAT (RP2040) carregada com sucesso!');
          }
        }
      }
    });

    // Inicializa preferência de barra lateral auto-hide / fixada
    initToolboxCollapse();

    // Inicializa Guia de Referência Didática e sincroniza com a Toolbox
    if (window.SatReference) {
      window.SatReference.init();
      if (workspace.getToolbox && workspace.getToolbox()) {
        const tb = workspace.getToolbox();
        const origSetSelectedItem = tb.setSelectedItem;
        if (origSetSelectedItem) {
          tb.setSelectedItem = function(item) {
            origSetSelectedItem.call(this, item);
            if (item && item.name_ && window.SatReference) {
              const catName = (item.name_ || '').toLowerCase();
              if (catName.includes('laço') || catName.includes('repeti')) window.SatReference.showTopic('loops');
              else if (catName.includes('lógica') || catName.includes('condiç')) window.SatReference.showTopic('logic');
              else if (catName.includes('matemát') || catName.includes('cálcul')) window.SatReference.showTopic('math');
              else if (catName.includes('texto') || catName.includes('mensag')) window.SatReference.showTopic('text');
              else if (catName.includes('lista') || catName.includes('coleç')) window.SatReference.showTopic('lists');
              else if (catName.includes('tempo') || catName.includes('relóg')) window.SatReference.showTopic('timing');
              else if (catName.includes('python')) window.SatReference.showTopic('python_adv');
              else if (catName.includes('variáv')) window.SatReference.showTopic('variables');
              else if (catName.includes('funç') || catName.includes('rotina')) window.SatReference.showTopic('functions');
              else if (catName.includes('missão') || catName.includes('satélite')) window.SatReference.showTopic('mission');
              else if (catName.includes('sensor') || catName.includes('ambient')) window.SatReference.showTopic('sensors');
              else if (catName.includes('inércia') || catName.includes('adcs')) window.SatReference.showTopic('imu');
              else if (catName.includes('navega') || catName.includes('gps')) window.SatReference.showTopic('gps');
              else if (catName.includes('telemetria') || catName.includes('pacote')) window.SatReference.showTopic('telemetry');
              else if (catName.includes('lora') || catName.includes('comunica')) window.SatReference.showTopic('lora');
              else if (catName.includes('rede') || catName.includes('wi-fi') || catName.includes('wifi') || catName.includes('internet')) window.SatReference.showTopic('wifi');
              else if (catName.includes('mqtt') || catName.includes('nuvem') || catName.includes('iot')) window.SatReference.showTopic('mqtt');
              else if (catName.includes('câmera') || catName.includes('camera') || catName.includes('payload')) window.SatReference.showTopic('camera');
              else if (catName.includes('energia') || catName.includes('eps') || catName.includes('bateria')) window.SatReference.showTopic('eps');
              else if (catName.includes('arquivo') || catName.includes('flash') || catName.includes('sd')) window.SatReference.showTopic('files');
            }
          };
        }
      }
    }

    // Programa inicial padrão
    if (!loadWorkspaceFromStorage()) {
      loadInitialProgram();
    }

    workspace.addChangeListener(function(event) {
      if (event.type === Blockly.Events.BLOCK_CHANGE ||
          event.type === Blockly.Events.BLOCK_CREATE ||
          event.type === Blockly.Events.BLOCK_DELETE ||
          event.type === Blockly.Events.BLOCK_MOVE) {
        updateGeneratedCode();
        saveWorkspaceToStorage();
      }
    });

    updateGeneratedCode();
  }

  function loadInitialProgram() {
    const activeBoard = localStorage.getItem('satblocks_active_board') || localStorage.getItem('bipes_active_board');
    if (activeBoard === 'rp2040_zero' && window.SatProfiles && typeof window.SatProfiles.getMissionRp2040Xml === 'function') {
      try {
        const rpXml = window.SatProfiles.getMissionRp2040Xml();
        const parser = Blockly.Xml.textToDom || (Blockly.utils && Blockly.utils.xml && Blockly.utils.xml.textToDom);
        const dom = parser(rpXml);
        Blockly.Xml.domToWorkspace(dom, workspace);
        return;
      } catch (e) {
        console.warn('Erro ao carregar programa padrão da RP2040:', e);
      }
    }

    const currentAuthor = localStorage['account_user'] || 'Equipe 41';
    const defaultXml = `
      <xml xmlns="https://developers.google.com/blockly/xml">
        <!-- 0. METADADOS E DADOS DO PROJETO / AUTOR -->
        <block type="project_info" id="init_project_info" x="30" y="30">
          <value name="project_author">
            <shadow type="text" id="init_author">
              <field name="TEXT">${currentAuthor}</field>
            </shadow>
          </value>
          <value name="project_iot_id">
            <shadow type="math_number" id="init_iot">
              <field name="NUM">41</field>
            </shadow>
          </value>
          <value name="project_description">
            <shadow type="text" id="init_desc">
              <field name="TEXT">obsat_teste</field>
            </shadow>
          </value>
        </block>

        <!-- 1. FUNÇÃO: COLETA DE DADOS -->
        <block type="procedures_defnoreturn" x="30" y="240">
          <field name="NAME">coleta_dados</field>
          <comment pinned="false" h="80" w="160">Lê todos os sensores e monta o pacote JSON de telemetria oficial da OBSAT.</comment>
          <statement name="STACK">
            <block type="variables_set">
              <field name="VAR">json_data</field>
              <value name="VALUE">
                <block type="sat_json_object_builder">
                  <mutation items="7" keys="[&quot;equipe&quot;,&quot;bateria&quot;,&quot;temperatura&quot;,&quot;pressao&quot;,&quot;giroscopio&quot;,&quot;acelerometro&quot;,&quot;payload&quot;]"></mutation>
                  <value name="VAL0">
                    <block type="math_number"><field name="NUM">41</field></block>
                  </value>
                  <value name="VAL1">
                    <block type="sat_eps_battery_voltage"></block>
                  </value>
                  <value name="VAL2">
                    <block type="sat_sensor_sht20_temp"></block>
                  </value>
                  <value name="VAL3">
                    <block type="sat_sensor_bmp280_press"></block>
                  </value>
                  <value name="VAL4">
                    <block type="sat_imu_gyro_vector">
                      <field name="FORMAT">LIST</field>
                    </block>
                  </value>
                  <value name="VAL5">
                    <block type="sat_imu_accel_vector">
                      <field name="FORMAT">LIST</field>
                    </block>
                  </value>
                  <value name="VAL6">
                    <block type="sat_obsat_payload_builder">
                      <mutation items="6" keys="[&quot;sensor_status&quot;,&quot;temperature&quot;,&quot;humidity&quot;,&quot;gyroscope&quot;,&quot;accelerometer&quot;,&quot;motion_detected&quot;]"></mutation>
                      <value name="VAL0">
                        <block type="text"><field name="TEXT">work work work</field></block>
                      </value>
                      <value name="VAL1">
                        <block type="sat_sensor_bmp280_temp"></block>
                      </value>
                      <value name="VAL2">
                        <block type="sat_sensor_sht20_hum"></block>
                      </value>
                      <value name="VAL3">
                        <block type="sat_imu_gyro_vector">
                          <field name="FORMAT">OBJECT</field>
                        </block>
                      </value>
                      <value name="VAL4">
                        <block type="sat_imu_accel_vector">
                          <field name="FORMAT">OBJECT</field>
                        </block>
                      </value>
                      <value name="VAL5">
                        <block type="logic_boolean"><field name="BOOL">TRUE</field></block>
                      </value>
                    </block>
                  </value>
                </block>
              </value>
            </block>
          </statement>
        </block>

        <!-- 2. FUNÇÃO: GRAVAÇÃO NO CARTÃO SD -->
        <block type="procedures_defnoreturn" x="30" y="470">
          <field name="NAME">cartao_sd</field>
          <comment pinned="false" h="80" w="160">Grava o pacote JSON no cartão microSD embarcado.</comment>
          <statement name="STACK">
            <block type="sat_sd_write_log">
              <field name="FILENAME">/sd/telemetria.json</field>
              <value name="TEXT">
                <block type="variables_get"><field name="VAR">json_data</field></block>
              </value>
            </block>
          </statement>
        </block>

        <!-- 3. FUNÇÃO: ENVIO DE TELEMETRIA VIA HTTP POST -->
        <block type="procedures_defnoreturn" x="30" y="630">
          <field name="NAME">envio_dados</field>
          <comment pinned="false" h="80" w="160">Envia a telemetria via HTTP POST para o servidor de testes da OBSAT.</comment>
          <statement name="STACK">
            <block type="sat_http_send_obsat_telemetry">
              <value name="JSON_DATA">
                <block type="variables_get"><field name="VAR">json_data</field></block>
              </value>
            </block>
          </statement>
        </block>

        <!-- 4. FLUXO PRINCIPAL DE EXECUÇÃO (MAIN LOOP) -->
        <block type="sat_mission_start" x="920" y="30">
          <field name="MISSION_NAME">CANSAT_OBSAT_01</field>
          <next>
            <block type="sat_wifi_connect">
              <field name="SSID">obsat-server</field>
              <field name="PASSWORD">obsatserver</field>
              <next>
                <block type="variables_set">
                  <field name="VAR">timer_sd</field>
                  <value name="VALUE">
                    <block type="math_number"><field name="NUM">0</field></block>
                  </value>
                  <next>
                    <block type="variables_set">
                      <field name="VAR">timer_telemetria</field>
                      <value name="VALUE">
                        <block type="math_number"><field name="NUM">0</field></block>
                      </value>
                      <next>
                        <block type="controls_whileUntil">
                          <field name="MODE">WHILE</field>
                          <value name="BOOL">
                            <block type="logic_boolean"><field name="BOOL">TRUE</field></block>
                          </value>
                          <statement name="DO">
                            <block type="sat_wait">
                              <field name="TIME">2</field>
                              <field name="UNIT">SEC</field>
                              <next>
                                <block type="variables_set">
                                  <field name="VAR">timer_sd</field>
                                  <value name="VALUE">
                                    <block type="math_arithmetic">
                                      <field name="OP">ADD</field>
                                      <value name="A">
                                        <block type="variables_get"><field name="VAR">timer_sd</field></block>
                                      </value>
                                      <value name="B">
                                        <block type="math_number"><field name="NUM">2</field></block>
                                      </value>
                                    </block>
                                  </value>
                                  <next>
                                    <block type="variables_set">
                                      <field name="VAR">timer_telemetria</field>
                                      <value name="VALUE">
                                        <block type="math_arithmetic">
                                          <field name="OP">ADD</field>
                                          <value name="A">
                                            <block type="variables_get"><field name="VAR">timer_telemetria</field></block>
                                          </value>
                                          <value name="B">
                                            <block type="math_number"><field name="NUM">2</field></block>
                                          </value>
                                        </block>
                                      </value>
                                      <next>
                                        <block type="procedures_callnoreturn">
                                          <mutation name="coleta_dados"></mutation>
                                          <next>
                                            <block type="controls_if">
                                              <value name="IF0">
                                                <block type="logic_compare">
                                                  <field name="OP">GTE</field>
                                                  <value name="A">
                                                    <block type="variables_get"><field name="VAR">timer_sd</field></block>
                                                  </value>
                                                  <value name="B">
                                                    <block type="math_number"><field name="NUM">4</field></block>
                                                  </value>
                                                </block>
                                              </value>
                                              <statement name="DO0">
                                                <block type="procedures_callnoreturn">
                                                  <mutation name="cartao_sd"></mutation>
                                                  <next>
                                                    <block type="variables_set">
                                                      <field name="VAR">timer_sd</field>
                                                      <value name="VALUE">
                                                        <block type="math_number"><field name="NUM">0</field></block>
                                                      </value>
                                                    </block>
                                                  </next>
                                                </block>
                                              </statement>
                                              <next>
                                                <block type="controls_if">
                                                  <value name="IF0">
                                                    <block type="logic_compare">
                                                      <field name="OP">GTE</field>
                                                      <value name="A">
                                                        <block type="variables_get"><field name="VAR">timer_telemetria</field></block>
                                                      </value>
                                                      <value name="B">
                                                        <block type="math_number"><field name="NUM">10</field></block>
                                                      </value>
                                                    </block>
                                                  </value>
                                                  <statement name="DO0">
                                                    <block type="procedures_callnoreturn">
                                                      <mutation name="envio_dados"></mutation>
                                                      <next>
                                                        <block type="variables_set">
                                                          <field name="VAR">timer_telemetria</field>
                                                          <value name="VALUE">
                                                            <block type="math_number"><field name="NUM">0</field></block>
                                                          </value>
                                                        </block>
                                                      </next>
                                                    </block>
                                                  </statement>
                                                </block>
                                              </next>
                                            </block>
                                          </next>
                                        </block>
                                      </next>
                                    </block>
                                  </next>
                                </block>
                              </next>
                            </block>
                          </statement>
                        </block>
                      </next>
                    </block>
                  </next>
                </block>
              </next>
            </block>
          </next>
        </block>
      </xml>
    `;

    try {
      const parser = Blockly.Xml.textToDom || (Blockly.utils && Blockly.utils.xml && Blockly.utils.xml.textToDom);
      const dom = parser(defaultXml);
      Blockly.Xml.domToWorkspace(dom, workspace);
    } catch (e) {
      console.error('Erro ao carregar programa inicial:', e);
    }
  }

  // ====================================================
  // PERSISTÊNCIA AUTOMÁTICA DO WORKSPACE (AUTO-SAVE / LOAD)
  // ====================================================
  let autoSaveTimeout = null;

  function saveWorkspaceToStorage() {
    if (!workspace) return;
    if (autoSaveTimeout) clearTimeout(autoSaveTimeout);

    autoSaveTimeout = setTimeout(() => {
      try {
        const dom = Blockly.Xml.workspaceToDom(workspace);
        const xmlText = Blockly.Xml.domToText(dom);
        localStorage.setItem('satblocks_saved_workspace_v2', xmlText);
        if (window.SatProfiles && typeof window.SatProfiles.saveCurrentWorkspace === 'function') {
          window.SatProfiles.saveCurrentWorkspace(xmlText);
        }
      } catch (err) {
        console.warn('Erro ao salvar workspace no localStorage:', err);
      }
    }, 250);
  }

  function loadMissionXml(xmlText, title) {
    if (!workspace) return false;
    try {
      workspace.clear();
      const parser = Blockly.Xml.textToDom || (Blockly.utils && Blockly.utils.xml && Blockly.utils.xml.textToDom);
      const dom = parser(xmlText);
      Blockly.Xml.domToWorkspace(dom, workspace);
      updateGeneratedCode();
      saveWorkspaceToStorage();
      switchMainTab('blocks');
      if (window.SatFiles && window.SatFiles.showDriverToast && title) {
        window.SatFiles.showDriverToast(`🚀 ${title} carregada!`);
      }
      return true;
    } catch (e) {
      console.error('Erro em loadMissionXml:', e);
      return false;
    }
  }

  function loadWorkspaceFromStorage() {
    try {
      // 1. PRIORIDADE MÁXIMA: Parâmetro da URL (?mission=... ou ?missao=... ou ?m=...)
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const missionParam = urlParams.get('mission') || urlParams.get('missao') || urlParams.get('m');
        if (missionParam && window.SatProfiles && typeof window.SatProfiles.getMissionById === 'function') {
          const mission = window.SatProfiles.getMissionById(missionParam);
          if (mission && mission.xml && mission.xml.trim().startsWith('<xml')) {
            console.log('[SatBlocks] Carregando missão da URL:', missionParam, mission.title);
            workspace.clear();
            const parser = Blockly.Xml.textToDom || (Blockly.utils && Blockly.utils.xml && Blockly.utils.xml.textToDom);
            const dom = parser(mission.xml);
            Blockly.Xml.domToWorkspace(dom, workspace);
            localStorage.setItem('satblocks_saved_workspace_v2', mission.xml);
            localStorage.setItem(mission.uid, mission.xml);
            if (typeof window.SatProfiles.setActiveMission === 'function') {
              window.SatProfiles.setActiveMission(mission);
            }
            if (window.SatFiles && window.SatFiles.showDriverToast) {
              window.SatFiles.showDriverToast(`🚀 ${mission.title} carregada com sucesso!`);
            }
            return true;
          }
        }
      } catch (paramErr) {
        console.warn('Erro ao processar parâmetro de missão na URL:', paramErr);
      }

      // 2. Projeto ativo no SatProfiles
      if (window.SatProfiles && typeof window.SatProfiles.getActiveMission === 'function') {
        const activeMission = window.SatProfiles.getActiveMission();
        if (activeMission && activeMission.xml && activeMission.xml.trim().startsWith('<xml')) {
          const parser = Blockly.Xml.textToDom || (Blockly.utils && Blockly.utils.xml && Blockly.utils.xml.textToDom);
          const dom = parser(activeMission.xml);
          workspace.clear();
          Blockly.Xml.domToWorkspace(dom, workspace);
          return true;
        }
      }

      // 3. Workspace salvo no localStorage
      const savedXml = localStorage.getItem('satblocks_saved_workspace_v2');
      if (savedXml && savedXml.trim().startsWith('<xml')) {
        const parser = Blockly.Xml.textToDom || (Blockly.utils && Blockly.utils.xml && Blockly.utils.xml.textToDom);
        const dom = parser(savedXml);
        workspace.clear();
        Blockly.Xml.domToWorkspace(dom, workspace);
        return true;
      }
    } catch (err) {
      console.warn('Erro ao carregar workspace salvo:', err);
    }
    return false;
  }

  function exportProjectFile() {
    if (!workspace) return;
    try {
      const dom = Blockly.Xml.workspaceToDom(workspace);
      const xmlText = Blockly.Xml.domToText(dom);
      const blob = new Blob([xmlText], { type: 'text/xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `missao_obsat_${new Date().toISOString().slice(0,10)}.satblocks`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      if (window.SatFiles && window.SatFiles.showDriverToast) {
        window.SatFiles.showDriverToast('💾 Projeto salvo e exportado com sucesso!');
      }
    } catch (e) {
      alert('Erro ao exportar projeto: ' + e.message);
    }
  }

  function importProjectFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const xmlText = e.target.result;
        const parser = Blockly.Xml.textToDom || (Blockly.utils && Blockly.utils.xml && Blockly.utils.xml.textToDom);
        const dom = parser(xmlText);
        workspace.clear();
        Blockly.Xml.domToWorkspace(dom, workspace);
        updateGeneratedCode();
        saveWorkspaceToStorage();
        if (window.SatFiles && window.SatFiles.showDriverToast) {
          window.SatFiles.showDriverToast(`📂 Projeto "${file.name}" carregado com sucesso!`);
        }
      } catch (err) {
        alert('Erro ao importar arquivo do projeto: ' + err.message);
      }
    };
    reader.readAsText(file);
  }

  function highlightPythonCode(code) {
    if (!code) return '<span class="py-comment"># Nenhum bloco no workspace</span>';

    let escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Tokenização segura de passagem única (single-pass)
    const tokenRegex = /(#.*$)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(\b(?:\d+\.?\d*|\.\d+)\b)|(\b(?:import|from|def|class|return|if|elif|else|while|for|in|try|except|finally|as|global|pass|break|continue|lambda|with|is|not|and|or)\b)|(\b(?:machine|time|network|ujson|json|urequests|os|gc|sys|math|sht20|bmp280|mpu9250|ccs811|micropyGPS|umqttsimple|Pin|I2C|SPI|ADC|PWM|UART|WDT|RTC|SHT20|BMP280|MPU9250|CCS811|MicropyGPS|MQTTClient)\b)|(\b(?:True|False|None|self)\b)|(\b[a-zA-Z_]\w*(?=\s*\())/gm;

    return escaped.replace(tokenRegex, (match, comment, str, num, kw, mod, constant, func) => {
      if (comment) return `<span class="py-comment">${comment}</span>`;
      if (str) return `<span class="py-str">${str}</span>`;
      if (num) return `<span class="py-num">${num}</span>`;
      if (kw) return `<span class="py-kw">${kw}</span>`;
      if (mod) return `<span class="py-mod">${mod}</span>`;
      if (constant) return `<span class="py-num">${constant}</span>`;
      if (func) return `<span class="py-func">${func}</span>`;
      return match;
    });
  }

  function updateGeneratedCode() {
    if (!Blockly.Python) return;
    try {
      const code = Blockly.Python.workspaceToCode(workspace);
      const codeEl = document.getElementById('pythonCodeView');
      if (codeEl) {
        codeEl.innerHTML = highlightPythonCode(code);
      }
    } catch (err) {
      console.warn('Erro ao gerar Python:', err);
    }
  }

  function setupEvents() {
    // Alternância de Abas Principais (Blocos, Console, Files, IOT)
    document.querySelectorAll('.sat-main-tab, .sat-tab-btn').forEach(tabBtn => {
      tabBtn.addEventListener('click', (e) => {
        const targetTab = e.currentTarget.dataset.tab;
        switchMainTab(targetTab);
      });
    });

    // Resizer Arrastável (Splitter) do Painel de Código Lateral com Setas
    const resizerEl = document.getElementById('panelResizer');
    const sidePanelEl = document.getElementById('sidePanel');
    const btnToggleSide = document.getElementById('btnToggleSidePanelSize');

    // Restaura largura salva (garantindo mínimo de 520px para não cortar botões)
    const savedWidth = localStorage.getItem('satblocks_sidepanel_width');
    if (savedWidth && sidePanelEl) {
      const parsed = parseInt(savedWidth, 10);
      if (parsed >= 500 && parsed <= window.innerWidth - 250) {
        sidePanelEl.style.width = parsed + 'px';
      } else {
        sidePanelEl.style.width = '520px';
      }
    } else if (sidePanelEl) {
      sidePanelEl.style.width = '520px';
    }

    // Inicializa preferência de recolher/auto-hover do painel de código (já com a largura restaurada acima)
    initSidePanelCollapse();

    if (resizerEl && sidePanelEl) {
      let isDragging = false;
      let startX = 0;
      let startWidth = 0;

      const onMouseDown = (e) => {
        isDragging = true;
        startX = e.clientX || (e.touches && e.touches[0].clientX);
        startWidth = sidePanelEl.offsetWidth;
        
        document.body.classList.add('resizing-active');
        resizerEl.classList.add('active');
        sidePanelEl.classList.remove('animate-resize');

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        document.addEventListener('touchmove', onMouseMove, { passive: false });
        document.addEventListener('touchend', onMouseUp);
      };

      const onMouseMove = (e) => {
        if (!isDragging) return;
        const currentX = e.clientX || (e.touches && e.touches[0].clientX);
        const deltaX = startX - currentX;
        const maxW = Math.max(520, window.innerWidth - 260);
        const newWidth = Math.min(maxW, Math.max(500, startWidth + deltaX));
        
        sidePanelEl.style.width = newWidth + 'px';
        positionSidePanelToggleBtn();

        if (workspace) {
          Blockly.svgResize(workspace);
        }
      };

      const onMouseUp = () => {
        if (!isDragging) return;
        isDragging = false;

        document.body.classList.remove('resizing-active');
        resizerEl.classList.remove('active');

        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.removeEventListener('touchmove', onMouseMove);
        document.removeEventListener('touchend', onMouseUp);

        localStorage.setItem('satblocks_sidepanel_width', sidePanelEl.offsetWidth);

        if (workspace) {
          Blockly.svgResize(workspace);
          workspace.render();
        }
      };

      resizerEl.addEventListener('mousedown', onMouseDown);
      resizerEl.addEventListener('touchstart', onMouseDown, { passive: true });

      // Duplo clique alterna entre padrão (520px) e expandido (760px)
      resizerEl.addEventListener('dblclick', () => {
        sidePanelEl.classList.add('animate-resize');
        const curW = sidePanelEl.offsetWidth;
        const isExpanded = curW >= 650;
        const targetW = isExpanded ? 520 : 760;
        sidePanelEl.style.width = targetW + 'px';
        if (btnToggleSide) {
          btnToggleSide.textContent = isExpanded ? '⤢' : '⇤';
          btnToggleSide.title = isExpanded ? 'Expandir Painel' : 'Reduzir Painel';
        }
        localStorage.setItem('satblocks_sidepanel_width', targetW);
        positionSidePanelToggleBtn();
        setTimeout(() => {
          sidePanelEl.classList.remove('animate-resize');
          if (workspace) {
            Blockly.svgResize(workspace);
            workspace.render();
          }
        }, 220);
      });
    }

    if (btnToggleSide && sidePanelEl) {
      btnToggleSide.addEventListener('click', () => {
        sidePanelEl.classList.add('animate-resize');
        const curW = sidePanelEl.offsetWidth;
        const isExpanded = curW >= 650;
        const targetW = isExpanded ? 520 : 760;
        sidePanelEl.style.width = targetW + 'px';
        btnToggleSide.textContent = isExpanded ? '⤢' : '⇤';
        btnToggleSide.title = isExpanded ? 'Expandir Painel' : 'Reduzir Painel';
        localStorage.setItem('satblocks_sidepanel_width', targetW);
        positionSidePanelToggleBtn();

        setTimeout(() => {
          sidePanelEl.classList.remove('animate-resize');
          if (workspace) {
            Blockly.svgResize(workspace);
            workspace.render();
          }
        }, 220);
      });
    }

    // Modal de Conexão e Pílula #channel_connect
    const btnSelectUsb = document.getElementById('btnSelectUsb');
    const btnSelectBle = document.getElementById('btnSelectBle');
    const connectBtn = document.getElementById('connectButton');
    const btnConnectMain = document.getElementById('btnOpenConnectModal');
    const modalConn = document.getElementById('modalConnectionOverlay') || document.getElementById('satModalConnection');

    if (btnSelectUsb) {
      btnSelectUsb.addEventListener('click', async () => {
        btnSelectUsb.classList.add('active');
        if (btnSelectBle) btnSelectBle.classList.remove('active');
        if (SatConnection.isConnected && SatConnection.isConnected()) {
          SatConnection.disconnect();
        }
        const ok = await SatConnection.connectSerial(115200);
        if (ok) onSatConnected();
      });
    }

    if (btnSelectBle) {
      btnSelectBle.addEventListener('click', async () => {
        btnSelectBle.classList.add('active');
        if (btnSelectUsb) btnSelectUsb.classList.remove('active');
        if (SatConnection.isConnected && SatConnection.isConnected()) {
          SatConnection.disconnect();
        }
        const ok = await SatConnection.connectBluetooth();
        if (ok) onSatConnected();
      });
    }

    if (connectBtn) {
      connectBtn.addEventListener('click', () => {
        if (SatConnection.isConnected && SatConnection.isConnected()) {
          SatConnection.disconnect();
        } else if (modalConn) {
          modalConn.style.display = 'flex';
          modalConn.classList.add('active');
        }
      });
    }

    if (btnConnectMain && modalConn) {
      btnConnectMain.addEventListener('click', () => {
        if (SatConnection.isConnected && SatConnection.isConnected()) {
          SatConnection.disconnect();
        } else {
          modalConn.style.display = 'flex';
          modalConn.classList.add('active');
        }
      });
    }

    // Seletor de Dispositivo na Pílula Superior e Sincronização
    const topDeviceSelector = document.getElementById('device_selector');
    const deviceBoardSelect = document.getElementById('deviceBoardSelect');

    const savedBoard = localStorage.getItem('satblocks_active_board') || localStorage.getItem('bipes_active_board');
    if (savedBoard) {
      if (topDeviceSelector) topDeviceSelector.value = savedBoard;
      if (deviceBoardSelect) deviceBoardSelect.value = savedBoard;
    }

    if (topDeviceSelector) {
      topDeviceSelector.addEventListener('change', (e) => {
        const boardKey = e.target.value;
        localStorage.setItem('satblocks_active_board', boardKey);
        if (deviceBoardSelect) deviceBoardSelect.value = boardKey;
        renderDeviceTab(boardKey);
        updateToolboxForBoard(boardKey);
        updateGeneratedCode();
        if (window.SatFiles && window.SatFiles.showDriverToast) {
          window.SatFiles.showDriverToast(`🛰️ Placa ativa: ${topDeviceSelector.options[topDeviceSelector.selectedIndex].text}`);
        }
      });
    }

    // Botão de Execução Play/Stop com Alternância Dinâmica
    const runBtn = document.getElementById('runButton');
    if (runBtn) {
      runBtn.addEventListener('click', () => {
        toggleRunProgram();
      });
    }

    // Botão de Abertura do SatBlocks Studio
    const studioBtn = document.getElementById('btnOpenStudio');
    if (studioBtn) {
      studioBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.open('studio/index.html', '_blank');
      });
    }

    // Tour Interativo de Boas-Vindas
    if (window.SatBlocksTour) {
      SatBlocksTour.init();
      const btnTour = document.getElementById('btnOpenTour');
      if (btnTour) {
        btnTour.addEventListener('click', () => {
          SatBlocksTour.start();
        });
      }

      // Se for primeira visita, inicia o tour automaticamente
      if (!localStorage.getItem('satblocks_tour_done')) {
        setTimeout(() => {
          SatBlocksTour.start();
          localStorage.setItem('satblocks_tour_done', 'true');
        }, 800);
      }
    }

    // Ações do Modal de Conexão
    document.getElementById('btnConnSerial').addEventListener('click', async () => {
      const baud = document.getElementById('serialBaudSelect').value;
      const success = await SatConnection.connectSerial(baud);
      if (success) {
        modalConn.style.display = 'none';
        modalConn.classList.remove('active');
        onSatConnected();
      }
    });

    document.getElementById('btnConnBle').addEventListener('click', async () => {
      const success = await SatConnection.connectBluetooth();
      if (success) {
        modalConn.style.display = 'none';
        modalConn.classList.remove('active');
        onSatConnected();
      }
    });

    document.getElementById('btnConnWebRepl').addEventListener('click', () => {
      const url = document.getElementById('webreplUrlInput').value;
      const pass = document.getElementById('webreplPassInput').value;
      const success = SatConnection.connectWebRepl(url, pass);
      if (success) {
        modalConn.style.display = 'none';
        modalConn.classList.remove('active');
        onSatConnected();
      }
    });

    // Salvar e Abrir Projetos (.satblocks / .xml)
    const btnSaveProj = document.getElementById('btnSaveProject');
    if (btnSaveProj) {
      btnSaveProj.addEventListener('click', () => exportProjectFile());
    }

    const btnOpenProj = document.getElementById('btnOpenProject');
    const fileInputProj = document.getElementById('fileInputProject');
    if (btnOpenProj && fileInputProj) {
      btnOpenProj.addEventListener('click', () => fileInputProj.click());
      fileInputProj.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          importProjectFile(file);
          fileInputProj.value = '';
        }
      });
    }

    // Executar Programa no Satélite
    const btnRunSat = document.getElementById('btnRunSatellite');
    if (btnRunSat) {
      btnRunSat.addEventListener('click', () => {
        const code = Blockly.Python.workspaceToCode(workspace);
        SatConnection.runPythonScript(code);
        switchMainTab('console');
      });
    }

    // Copiar Código Python com Precisão Universal (Compatível com file:// e https://)
    function copyTextToClipboard(text) {
      let successful = false;
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.setAttribute('readonly', '');
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '0';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        
        textArea.focus();
        textArea.select();
        textArea.setSelectionRange(0, text.length);
        
        successful = document.execCommand('copy');
        document.body.removeChild(textArea);
      } catch (e) {
        console.warn('Falha no execCommand:', e);
      }

      if (!successful && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(err => console.warn('Clipboard API:', err));
        successful = true;
      }
      return successful;
    }

    const btnCopyPy = document.getElementById('btnCopyPythonCode');
    if (btnCopyPy) {
      btnCopyPy.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const codeView = document.getElementById('pythonCodeView');
        let codeToCopy = '';
        
        if (codeView && codeView.innerText && codeView.innerText.trim().length > 0 && !codeView.innerText.includes('Gerando código')) {
          codeToCopy = codeView.innerText;
        } else if (workspace) {
          codeToCopy = Blockly.Python.workspaceToCode(workspace);
        }

        if (!codeToCopy) return;

        copyTextToClipboard(codeToCopy);

        btnCopyPy.classList.add('copied');
        const labelEl = btnCopyPy.querySelector('.copy-label');
        if (labelEl) labelEl.textContent = 'Copiado!';

        if (window.SatFiles && window.SatFiles.showDriverToast) {
          window.SatFiles.showDriverToast('📋 Código Python copiado para a área de transferência!');
        }

        setTimeout(() => {
          btnCopyPy.classList.remove('copied');
          if (labelEl) labelEl.textContent = 'Copiar';
        }, 2000);
      });
    }

    // Botões de Controle de Voo
    document.getElementById('btnSoftResetDevice').addEventListener('click', () => {
      SatConnection.softReset();
    });

    document.getElementById('btnStopProgramDevice').addEventListener('click', () => {
      stopProgram();
    });

    // Controles da Aba Dispositivo (Device & Hardware)
    const selectDeviceBoard = document.getElementById('deviceBoardSelect');
    const selectTopbarDevice = document.getElementById('device_selector');

    if (selectDeviceBoard) {
      selectDeviceBoard.addEventListener('change', (e) => {
        const boardKey = e.target.value;
        currentBoard = boardKey;
        localStorage.setItem('satblocks_active_board', boardKey);
        if (selectTopbarDevice) selectTopbarDevice.value = boardKey;
        renderDeviceTab(boardKey);
        updateToolboxForBoard(boardKey);
      });
    }

    if (selectTopbarDevice) {
      selectTopbarDevice.addEventListener('change', (e) => {
        const boardKey = e.target.value;
        currentBoard = boardKey;
        localStorage.setItem('satblocks_active_board', boardKey);
        if (selectDeviceBoard) selectDeviceBoard.value = boardKey;
        renderDeviceTab(boardKey);
        updateToolboxForBoard(boardKey);
      });
    }

    // Renderiza inicialmente a placa salva ou padrão selecionada
    const initialBoard = savedBoard || (selectTopbarDevice ? selectTopbarDevice.value : (selectDeviceBoard ? selectDeviceBoard.value : 'pion_cubesat'));
    currentBoard = initialBoard;
    if (selectTopbarDevice) selectTopbarDevice.value = initialBoard;
    if (selectDeviceBoard) selectDeviceBoard.value = initialBoard;
    renderDeviceTab(initialBoard);
    updateToolboxForBoard(initialBoard);

    const btnScanI2C = document.getElementById('btnScanI2CDevice');
    if (btnScanI2C) {
      btnScanI2C.addEventListener('click', () => {
        switchMainTab('console');
        let scl = 'Pin(22)';
        let sda = 'Pin(21)';
        if (currentBoard === 'rp2040_zero') {
          scl = 'Pin(1)';
          sda = 'Pin(0)';
        } else if (currentBoard === 'esp32_c3_supermini') {
          scl = 'Pin(9)';
          sda = 'Pin(8)';
        } else if (currentBoard === 'esp32_cam') {
          scl = 'Pin(14)';
          sda = 'Pin(15)';
        }
        sendQuickCmd(`from machine import I2C, Pin; _i2c=I2C(0, scl=${scl}, sda=${sda}); print("[I2C SCAN (${currentBoard})] Dispositivos:", [hex(a) for a in _i2c.scan()])`);
      });
    }

    const btnCheckMem = document.getElementById('btnCheckMemDevice');
    if (btnCheckMem) {
      btnCheckMem.addEventListener('click', () => {
        switchMainTab('console');
        sendQuickCmd('import gc; gc.collect(); print("[MEMORIA] RAM Livre:", gc.mem_free(), "bytes | Alocada:", gc.mem_alloc(), "bytes")');
      });
    }

    const btnLoadMensaProg = document.getElementById('btnLoadRp2040MensaProgram');
    if (btnLoadMensaProg) {
      btnLoadMensaProg.addEventListener('click', () => {
        if (confirm('Deseja carregar a Missão da Oficina Mensa Brasil no workspace (Waveshare RP2040-Zero + BMP280 + MPU6050 + Wi-Fi + RGB)?')) {
          if (window.SatProfiles && typeof window.SatProfiles.getMissionRp2040MensaXml === 'function') {
            const rpXml = window.SatProfiles.getMissionRp2040MensaXml();
            const parser = Blockly.Xml.textToDom || (Blockly.utils && Blockly.utils.xml && Blockly.utils.xml.textToDom);
            const dom = parser(rpXml);
            workspace.clear();
            Blockly.Xml.domToWorkspace(dom, workspace);
            updateGeneratedCode();
            saveWorkspaceToStorage();
            switchMainTab('blocks');
            if (window.SatFiles && window.SatFiles.showDriverToast) {
              window.SatFiles.showDriverToast('🎓 Missão Oficina Mensa (Waveshare RP2040-Zero) carregada com sucesso!');
            }
          }
        }
      });
    }

    const btnLoadObsatProg = document.getElementById('btnLoadRp2040ObsatProgram');
    if (btnLoadObsatProg) {
      btnLoadObsatProg.addEventListener('click', () => {
        if (confirm('Deseja carregar a Missão Oficial do Edital OBSAT 2026 no workspace (Waveshare RP2040-Zero + Sensores + Bateria ADC2 + Wi-Fi)?')) {
          if (window.SatProfiles && typeof window.SatProfiles.getMissionRp2040ObsatXml === 'function') {
            const rpXml = window.SatProfiles.getMissionRp2040ObsatXml();
            const parser = Blockly.Xml.textToDom || (Blockly.utils && Blockly.utils.xml && Blockly.utils.xml.textToDom);
            const dom = parser(rpXml);
            workspace.clear();
            Blockly.Xml.domToWorkspace(dom, workspace);
            updateGeneratedCode();
            saveWorkspaceToStorage();
            switchMainTab('blocks');
            if (window.SatFiles && window.SatFiles.showDriverToast) {
              window.SatFiles.showDriverToast('🛰️ Missão Oficial Edital OBSAT 2026 carregada com sucesso!');
            }
          }
        }
      });
    }

    const btnLoadRpProg = document.getElementById('btnLoadRp2040DefaultProgram');
    if (btnLoadRpProg) {
      btnLoadRpProg.addEventListener('click', () => {
        if (btnLoadMensaProg) btnLoadMensaProg.click();
      });
    }

    // Botões do Terminal Console
    const btnClearTerm = document.getElementById('btnClearTerminal');
    if (btnClearTerm) {
      btnClearTerm.addEventListener('click', () => {
        const logsEl = document.getElementById('terminalFullLogs');
        if (logsEl) {
          logsEl.innerHTML = '<span class="term-sys">[SISTEMA] Console limpo.</span>\n<span class="term-prompt">&gt;&gt;&gt; </span>';
        }
      });
    }

    const btnSoftReset = document.getElementById('btnSoftResetDevice');
    if (btnSoftReset) {
      btnSoftReset.addEventListener('click', () => {
        SatConnection.softReset();
      });
    }

    const btnHardReset = document.getElementById('btnHardResetDevice');
    if (btnHardReset) {
      btnHardReset.addEventListener('click', () => {
        SatConnection.pulseHardwareReset();
      });
    }

    const btnStopProg = document.getElementById('btnStopProgramDevice');
    if (btnStopProg) {
      btnStopProg.addEventListener('click', () => {
        SatConnection.stopProgram();
      });
    }

    // Histórico de Comandos do Terminal
    let cmdHistory = [];
    let historyIndex = -1;

    document.getElementById('btnSendTerminalCmd').addEventListener('click', () => {
      const input = document.getElementById('terminalCmdInput');
      if (input && input.value.trim().length > 0) {
        const cmd = input.value.trim();
        cmdHistory.push(cmd);
        historyIndex = cmdHistory.length;

        // Não ecoa manualmente aqui: o REPL da placa já ecoa de volta
        // os caracteres recebidos, e um eco duplicado aparecia como ">>> >>> comando".
        SatConnection.send(cmd + '\r\n');
        input.value = '';
      }
    });

    document.getElementById('terminalCmdInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        document.getElementById('btnSendTerminalCmd').click();
      } else if (e.key === 'ArrowUp') {
        if (cmdHistory.length > 0 && historyIndex > 0) {
          historyIndex--;
          e.target.value = cmdHistory[historyIndex];
        }
      } else if (e.key === 'ArrowDown') {
        if (historyIndex < cmdHistory.length - 1) {
          historyIndex++;
          e.target.value = cmdHistory[historyIndex];
        } else {
          historyIndex = cmdHistory.length;
          e.target.value = '';
        }
      }
    });

    // Pinout Modal
    const btnPinoutBottom = document.getElementById('btnPinout');
    if (btnPinoutBottom) btnPinoutBottom.addEventListener('click', showPinoutModal);

    // Fechar modais
    document.querySelectorAll('.sat-modal-close').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const overlay = e.target.closest('.sat-modal-overlay');
        if (overlay) {
          overlay.classList.remove('active');
          overlay.style.display = 'none';
        }
      });
    });
  }

  const tabMetadata = {
    blocks: { icon: '🧩', label: 'Blocos' },
    console: { icon: '💻', label: 'Console' },
    files: { icon: '📁', label: 'Arquivos' },
    device: { icon: '📍', label: 'Dispositivo' },
    iot: { icon: '📊', label: 'Painel IOT' }
  };

  function toggleTabsDropdown(event) {
    if (event) event.stopPropagation();
    const menu = document.getElementById('satTabsDropdownMenu');
    if (menu) {
      menu.classList.toggle('open');
    }
  }

  function closeTabsDropdown() {
    const menu = document.getElementById('satTabsDropdownMenu');
    if (menu) {
      menu.classList.remove('open');
    }
  }

  let headerCompactRaf = null;

  function updateHeaderCompactMode() {
    const header = document.querySelector('.sat-topbar');
    if (!header) return;
    // Mede no estado "expandido": remove o modo compacto e força um reflow síncrono
    // antes do próximo paint, então não há flicker visível para o usuário.
    header.classList.remove('header-force-compact');
    const overflowing = header.scrollWidth > header.clientWidth + 1;
    header.classList.toggle('header-force-compact', overflowing);
  }

  function scheduleHeaderCompactUpdate() {
    if (headerCompactRaf) cancelAnimationFrame(headerCompactRaf);
    headerCompactRaf = requestAnimationFrame(updateHeaderCompactMode);
  }

  window.addEventListener('resize', scheduleHeaderCompactUpdate);

  function toggleActionsDropdown(event) {
    if (event) event.stopPropagation();
    const menu = document.getElementById('satActionsDropdownMenu');
    if (menu) {
      menu.classList.toggle('open');
    }
  }

  function closeActionsDropdown() {
    const menu = document.getElementById('satActionsDropdownMenu');
    if (menu) {
      menu.classList.remove('open');
    }
  }

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#satTabsDropdownContainer')) {
      closeTabsDropdown();
    }
    if (!e.target.closest('#satActionsDropdownContainer')) {
      closeActionsDropdown();
    }
  });

  function onSatConnected() {
    // Se já estiver na aba Arquivos ao conectar, busca a lista da Flash
    // automaticamente (sem precisar clicar em "Atualizar").
    const filesPage = document.getElementById('tab_page_files');
    const isFilesTabActive = filesPage && !filesPage.classList.contains('tab-hidden');
    if (isFilesTabActive && window.SatFiles && typeof window.SatFiles.fetchFilesFromHardware === 'function') {
      window.SatFiles.fetchFilesFromHardware();
    }
  }

  function switchMainTab(tabName) {
    document.querySelectorAll('.sat-tab-btn, .sat-main-tab').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === tabName);
    });

    // Sincroniza indicador do Dropdown Toggle compacto
    const meta = tabMetadata[tabName] || { icon: '🧩', label: 'Blocos' };
    const iconEl = document.getElementById('currentTabIcon');
    const labelEl = document.getElementById('currentTabLabel');
    if (iconEl) iconEl.textContent = meta.icon;
    if (labelEl) labelEl.textContent = meta.label;

    document.querySelectorAll('.sat-dropdown-item').forEach(item => {
      item.classList.toggle('active', item.dataset.tab === tabName);
    });

    closeTabsDropdown();

    document.querySelectorAll('.sat-tab-page').forEach(p => {
      const isTarget = p.id === `tab_page_${tabName}`;
      p.classList.toggle('tab-hidden', !isTarget);
      p.style.display = isTarget ? 'flex' : 'none';
    });

    if (tabName === 'blocks' && workspace) {
      requestAnimationFrame(() => {
        Blockly.svgResize(workspace);
        workspace.render();
      });
      setTimeout(() => {
        Blockly.svgResize(workspace);
        workspace.render();
      }, 60);
    } else if (tabName === 'files') {
      if (window.SatFiles && typeof window.SatFiles.openFile === 'function') {
        window.SatFiles.openFile('main.py');
      }
      // Já conectado? Busca a lista de arquivos da Flash automaticamente,
      // sem precisar clicar em "Atualizar".
      if (window.SatConnection && SatConnection.isConnected && SatConnection.isConnected() &&
          window.SatFiles && typeof window.SatFiles.fetchFilesFromHardware === 'function') {
        window.SatFiles.fetchFilesFromHardware();
      }
    } else if (tabName === 'iot') {
      setTimeout(() => {
        if (window.SatDataboard && typeof SatDataboard.refreshGrid === 'function') {
          SatDataboard.refreshGrid();
        }
      }, 50);
    }
  }

  function renderDeviceTab(boardKey) {
    const key = boardKey || document.getElementById('deviceBoardSelect')?.value || 'pion_cubesat';
    const data = boardsData[key] || boardsData['pion_cubesat'] || boardsData['esp32_devkit'];
    if (!data) return;

    const mcuEl = document.getElementById('deviceMcuText');
    const flashEl = document.getElementById('deviceFlashText');
    const ramEl = document.getElementById('deviceRamText');
    const badgeEl = document.getElementById('deviceStatusBadge');
    const tableBody = document.getElementById('devicePinTableBody');
    const imgEl = document.getElementById('deviceBoardImage');
    const uf2Btn = document.getElementById('btnDownloadRp2040Uf2');

    if (mcuEl) mcuEl.textContent = data.mcu;
    if (flashEl) flashEl.textContent = data.flash;
    if (ramEl) ramEl.textContent = (key === 'rp2040_zero') ? '264 KB SRAM Interna' : (key === 'esp32_c3_supermini' ? '400 KB SRAM' : '520 KB SRAM');
    if (badgeEl) badgeEl.textContent = data.name.split('(')[0].trim().toUpperCase() + ' ATIVO';
    const progBtn = document.getElementById('btnLoadRp2040DefaultProgram');
    const mensaBtn = document.getElementById('btnLoadRp2040MensaProgram');
    const obsatBtn = document.getElementById('btnLoadRp2040ObsatProgram');
    if (uf2Btn) uf2Btn.style.display = (key === 'rp2040_zero') ? 'inline-flex' : 'none';
    if (progBtn) progBtn.style.display = (key === 'rp2040_zero') ? 'inline-flex' : 'none';
    if (mensaBtn) mensaBtn.style.display = (key === 'rp2040_zero') ? 'inline-flex' : 'none';
    if (obsatBtn) obsatBtn.style.display = (key === 'rp2040_zero') ? 'inline-flex' : 'none';

    if (imgEl && data.image) {
      imgEl.src = data.image;
      imgEl.style.display = 'block';
    }

    if (tableBody) {
      tableBody.innerHTML = '';
      data.pins.forEach(p => {
        const tr = document.createElement('tr');
        const termTd = p.term ? `<td style="text-align: center;"><span style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; padding: 2px 6px; font-weight: 800; font-size: 11px; color: #0f172a;">${p.term}</span></td>` : `<td style="text-align: center; color: #94a3b8;">-</td>`;
        
        tr.innerHTML = `
          ${termTd}
          <td><strong style="color: #0284c7; font-size: 13px; font-family: monospace;">${p.pin}</strong></td>
          <td style="color: #0f172a; font-weight: 700;">${p.func}</td>
          <td><span class="pin-badge ${p.type}">${p.type.toUpperCase()}</span></td>
          <td style="color: #334155; font-size: 12px; font-weight: 600;">${p.rec || 'Uso Geral / Payload'}</td>
        `;
        tableBody.appendChild(tr);
      });
    }
  }

  let isProgramRunning = false;
  let cachedOriginalToolboxXml = null;

  function setRunningState(running) {
    isProgramRunning = !!running;
    const runBtn = document.getElementById('runButton');
    const stopBtn = document.getElementById('btnStopProgramDevice');

    if (runBtn) {
      if (isProgramRunning) {
        runBtn.classList.add('running');
        runBtn.title = 'Parar Execução (Ctrl+C)';
        runBtn.innerHTML = `
          <svg width="13" height="13" viewBox="0 0 24 24" fill="#ffffff">
            <rect x="5" y="5" width="14" height="14" rx="2"></rect>
          </svg>
        `;
      } else {
        runBtn.classList.remove('running');
        runBtn.title = 'Executar código no Satélite';
        runBtn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#ffffff">
            <polygon points="6 3 20 12 6 21 6 3"></polygon>
          </svg>
        `;
      }
    }

    if (stopBtn) {
      if (isProgramRunning) {
        stopBtn.classList.add('danger', 'running-active');
        stopBtn.title = 'Interromper execução ativa no satélite (Ctrl+C)';
      } else {
        stopBtn.classList.remove('danger', 'running-active');
        stopBtn.title = 'Interromper execução (Ctrl+C)';
      }
    }
  }

  function toggleRunProgram() {
    if (isProgramRunning) {
      stopProgram();
      return;
    }

    if (!workspace) return;

    if (!window.SatConnection || !SatConnection.isConnected || !SatConnection.isConnected()) {
      const modalConn = document.getElementById('modalConnectionOverlay') || document.getElementById('satModalConnection');
      if (modalConn) {
        modalConn.style.display = 'flex';
        modalConn.classList.add('active');
      }
      if (window.SatFiles && window.SatFiles.showDriverToast) {
        window.SatFiles.showDriverToast('⚠️ Conecte um satélite/placa antes de executar o código.');
      }
      return;
    }

    const code = Blockly.Python.workspaceToCode(workspace);

    switchMainTab('console');
    appendTerminalLog('\n=========================================\n');
    appendTerminalLog('🚀 [OBSAT] Executando programa no satélite...\n');
    appendTerminalLog('=========================================\n');

    setRunningState(true);

    if (window.SatConnection) {
      SatConnection.runPythonScript(code);
    }
  }

  function stopProgram() {
    if (window.SatConnection) {
      SatConnection.stopProgram();
    }
    setRunningState(false);
  }

  function updateToolboxForBoard(boardKey) {
    if (!workspace) return;

    if (!cachedOriginalToolboxXml) {
      const toolboxEl = document.getElementById('toolbox');
      if (toolboxEl) {
        cachedOriginalToolboxXml = toolboxEl.outerHTML;
      }
    }

    try {
      if (boardKey === 'esp32_cam') {
        // Toolbox sob medida para ESP32-CAM (Câmera OV2640, Sensores I2C Pinos 14/15, SD Card, Rede, IoT e BNCC Completa)
        const esp32CamXml = `
          <xml id="toolbox_esp32cam" style="display: none">
            <category name="📷 Câmera OV2640" colour="#db2777">
              <block type="sat_camera_init_advanced">
                <field name="FRAMESIZE">FRAMESIZE_QVGA</field>
                <field name="QUALITY">12</field>
                <field name="EFFECT">0</field>
                <field name="ROTATE">0</field>
              </block>
              <block type="sat_camera_flash_intensity"><field name="BRIGHTNESS">100</field></block>
              <block type="sat_camera_status_led"><field name="STATE">1</field></block>
              <block type="sat_camera_capture"><field name="FILENAME">foto_obsat_%d.jpg</field></block>
              <block type="sat_camera_capture_base64"></block>
              <block type="sat_camera_webserver_start">
                <field name="PORT">80</field>
                <field name="TITLE">ESP32-CAM Estação OBSAT</field>
              </block>
              <block type="sat_camera_webserver_handle"></block>
              <block type="sat_camera_lora_send_chunks"><field name="CHUNK_SIZE">200</field></block>
              <block type="sat_camera_deinit"></block>
              <block type="sat_sd_write_log"><field name="FILENAME">/sd/telemetria.csv</field></block>
            </category>

            <category name="📦 Drivers &amp; Bibliotecas" colour="#b45309">
              <button text="📷 Instalar Driver Câmera (camera.py)" callbackKey="INSTALL_CAMERA"></button>
              <button text="🌡️ Instalar Driver BMP280 (bmp280.py)" callbackKey="INSTALL_BMP280"></button>
              <button text="📂 Abrir Gerenciador de Arquivos Flash" callbackKey="OPEN_FLASH_FILES"></button>
            </category>

            <category name="🛰️ Missão &amp; Satélite" colour="#7c3aed">
              <block type="project_info">
                <value name="project_author"><shadow type="text"><field name="TEXT">Equipe OBSAT 42</field></shadow></value>
                <value name="project_iot_id"><shadow type="math_number"><field name="NUM">42</field></shadow></value>
                <value name="project_description"><shadow type="text"><field name="TEXT">Missão Câmera e Sonda</field></shadow></value>
              </block>
              <block type="sat_mission_start"><field name="MISSION_NAME">ESP32CAM_OBSAT_01</field></block>
              <block type="sat_emit_beep"><field name="COUNT">3</field><field name="INTERVAL">500</field></block>
              <block type="sat_wait"><field name="TIME">1</field><field name="UNIT">SEC</field></block>
              <block type="sat_watchdog_feed"></block>
              <block type="sat_mission_end"></block>
            </category>

            <category name="🌡️ Sensores I2C &amp; BMP280" colour="#0284c7">
              <label text="─── Barramento I2C ESP32-CAM (SCL: 14, SDA: 15) ───"></label>
              <block type="sat_i2c_init_pins">
                <field name="PRESET">esp32cam</field>
                <field name="SCL_PIN">14</field>
                <field name="SDA_PIN">15</field>
              </block>
              <sep gap="16"></sep>

              <label text="─── BMP280: Barômetro, Pressão &amp; Altitude (I2C 0x76) ───"></label>
              <block type="sat_sensor_bmp280_temp"></block>
              <block type="sat_sensor_bmp280_press"></block>
              <block type="sat_sensor_bmp280_alt"><field name="SEA_LEVEL">1013.25</field></block>
              <sep gap="16"></sep>

              <label text="─── Outros Sensores Compatíveis (I2C / GPIO) ───"></label>
              <block type="sat_sensor_dht_hum"><field name="PIN">13</field></block>
              <block type="sat_sensor_sht20_temp"></block>
              <block type="sat_sensor_sht20_hum"></block>
              <block type="sat_sensor_bh1750_lux"></block>
            </category>

            <category name="📦 Pacote Telemetria OBSAT" colour="#ea580c">
              <label text="─── Pacote Padronizado OBSAT 2026 ───"></label>
              <block type="sat_obsat_telemetry_packet">
                <mutation items="6" keys="[&quot;equipe&quot;,&quot;temperatura&quot;,&quot;pressao&quot;,&quot;altitude&quot;,&quot;bateria&quot;,&quot;payload&quot;]" labels="[&quot;Equipe ID&quot;,&quot;Temperatura (°C)&quot;,&quot;Pressão (hPa)&quot;,&quot;Altitude (m)&quot;,&quot;Bateria (%)&quot;,&quot;Payload Extra&quot;]"></mutation>
              </block>
              <sep gap="16"></sep>
              <block type="sat_http_send_obsat_telemetry"></block>
              <sep gap="16"></sep>
              <block type="sat_json_object_builder">
                <mutation items="4" keys="[&quot;equipe&quot;,&quot;temperatura&quot;,&quot;pressao&quot;,&quot;status&quot;]"></mutation>
              </block>
              <sep gap="16"></sep>
              <block type="sat_telemetry_packet_builder">
                <mutation items="4" labels="[&quot;ID&quot;,&quot;Temp&quot;,&quot;Pressao&quot;,&quot;Bateria&quot;]"></mutation>
                <field name="FORMAT">CSV</field>
              </block>
            </category>

            <category name="🌐 Rede &amp; Internet (HTTP &amp; Wi-Fi)" colour="#4338ca">
              <label text="─── Wi-Fi &amp; Ponto de Acesso (Hotspot) ───"></label>
              <block type="sat_wifi_ap_start"><field name="SSID">ESP32CAM_OBSAT</field><field name="PASSWORD">12345678</field></block>
              <block type="sat_wifi_ap_ip"></block>
              <block type="sat_wifi_connect"><field name="SSID">OBSAT_WIFI</field></block>
              <sep gap="16"></sep>

              <label text="─── Requisições HTTP Cliente &amp; API ───"></label>
              <block type="sat_http_send_obsat_telemetry"></block>
              <block type="sat_http_post_json"><value name="URL"><shadow type="text"><field name="TEXT">https://obsat.org.br/servidor_testes/envio.php</field></shadow></value></block>
              <block type="sat_http_post_data"><value name="URL"><shadow type="text"><field name="TEXT">https://obsat.org.br/servidor_testes/envio_bipes.php</field></shadow></value><value name="DATA"><shadow type="text"><field name="TEXT">temp=24.5&amp;press=1013</field></shadow></value></block>
              <block type="sat_http_get"><value name="URL"><shadow type="text"><field name="TEXT">https://obsat.org.br/servidor_testes/envio_bipes.php</field></shadow></value></block>
              <block type="sat_http_status_code"></block>
              <block type="sat_http_response_text"></block>
              <sep gap="16"></sep>

              <label text="─── Servidor Web Local MicroPython (Porta 80) ───"></label>
              <block type="sat_http_server_start"><field name="PORT">80</field></block>
              <block type="sat_http_server_wait_client"></block>
              <block type="sat_http_server_requested_page"></block>
              <block type="sat_http_server_send_html"><value name="HTML"><shadow type="text"><field name="TEXT">&lt;h1&gt;SatBlocks OBSAT ESP32-CAM&lt;/h1&gt;</field></shadow></value></block>
              <block type="sat_http_server_send_jpg"></block>
              <block type="sat_http_server_close"></block>
            </category>

            <category name="☁️ IoT: EasyMQTT &amp; Nuvem" colour="#0284c7">
              <label text="─── Plataforma IoT EasyMQTT (BIPES Nuvem) ───"></label>
              <block type="sat_easymqtt_start_session"><field name="SESSION_ID">zi6pi</field></block>
              <block type="sat_easymqtt_publish_val"><value name="TOPIC"><shadow type="text"><field name="TEXT">temperatura</field></shadow></value><value name="VALUE"><shadow type="math_number"><field name="NUM">24.5</field></shadow></value></block>
              <block type="sat_easymqtt_publish_http"><value name="SESSION"><shadow type="text"><field name="TEXT">zi6pi</field></shadow></value><value name="TOPIC"><shadow type="text"><field name="TEXT">foto_status</field></shadow></value><value name="VALUE"><shadow type="math_number"><field name="NUM">1</field></shadow></value></block>
              <block type="sat_easymqtt_subscribe_event"><value name="TOPIC"><shadow type="text"><field name="TEXT">telecomando</field></shadow></value></block>
            </category>

            <category name="🔌 Barramentos: I2C &amp; UART" colour="#10b981">
              <label text="─── Comunicação Serial UART (Pinos TX/RX) ───"></label>
              <block type="sat_uart_init"><field name="PORT">2</field><field name="BAUD">115200</field></block>
              <block type="sat_uart_send"><value name="DATA"><shadow type="text"><field name="TEXT">PING_GROUND_STATION</field></shadow></value></block>
              <block type="sat_uart_readline"></block>
              <block type="sat_uart_readall"></block>
              <block type="sat_uart_read_bytes"><value name="BYTES"><shadow type="math_number"><field name="NUM">10</field></shadow></value></block>
              <block type="sat_uart_any"></block>
              <sep gap="16"></sep>

              <label text="─── Barramento I2C Hardware (SCL: 14 / SDA: 15) ───"></label>
              <block type="sat_i2c_init"><field name="SCL">14</field><field name="SDA">15</field><field name="FREQ">400000</field></block>
              <block type="sat_i2c_scan"></block>
              <block type="sat_i2c_writeto"><field name="ADDR">0x76</field></block>
              <block type="sat_i2c_readfrom"><field name="ADDR">0x76</field><field name="NBYTES">2</field></block>
            </category>

            <category name="⚡ Energia &amp; EPS" colour="#d97706">
              <block type="sat_battery_adc"></block>
              <block type="sat_eps_battery_voltage"></block>
              <block type="sat_eps_battery_percent"></block>
              <block type="sat_eps_deepsleep"><field name="SECONDS">10</field></block>
            </category>

            <category name="📁 Arquivos &amp; Flash" colour="#5b67a5">
              <block type="file_open"><value name="file_name"><shadow type="text"><field name="TEXT">/sd/log.txt</field></shadow></value></block>
              <block type="file_open_write"><value name="filename"><shadow type="text"><field name="TEXT">/sd/log.txt</field></shadow></value></block>
              <block type="file_open_read"><value name="filename"><shadow type="text"><field name="TEXT">/sd/log.txt</field></shadow></value></block>
              <block type="file_write"><value name="data"><shadow type="text"><field name="TEXT">dados</field></shadow></value></block>
              <block type="file_write_line"><value name="data"><shadow type="text"><field name="TEXT">linha de telemetria</field></shadow></value></block>
              <block type="file_read"></block>
              <block type="file_close"></block>
              <sep gap="16"></sep>
              <block type="files_list"></block>
              <block type="uos_mkdir"><value name="pIn"><shadow type="text"><field name="TEXT">pasta</field></shadow></value></block>
              <block type="uos_remove"><value name="pIn"><shadow type="text"><field name="TEXT">/sd/foto.jpg</field></shadow></value></block>
              <block type="uos_chdir"><value name="pIn"><shadow type="text"><field name="TEXT">/sd</field></shadow></value></block>
              <block type="uos_getcwd"></block>
            </category>

            <sep></sep>

            <sep></sep>

            <category name="🧠 Lógica &amp; Condição" colour="#3b82f6">
              <label text="─── Tomada de Decisão (if / elif / else) ───"></label>
              <block type="controls_if"></block>
              <block type="controls_ifelse"></block>
              <sep gap="16"></sep>

              <label text="─── Operadores de Comparação (==, !=, &lt;, &gt;) ───"></label>
              <block type="logic_compare"></block>
              <sep gap="16"></sep>

              <label text="─── Operadores Lógicos (and / or / not) ───"></label>
              <block type="logic_operation"></block>
              <block type="logic_negate"></block>
              <sep gap="16"></sep>

              <label text="─── Valores Booleanos &amp; Nulos (True / False / None) ───"></label>
              <block type="logic_boolean"></block>
              <block type="logic_null"></block>
              <block type="logic_ternary"></block>
            </category>

            <category name="🔄 Laços de Repetição" colour="#10b981">
              <label text="─── Laço Infinito ou Condicional (while True: / while cond:) ───"></label>
              <block type="controls_whileUntil"></block>
              <sep gap="16"></sep>

              <label text="─── Repetição por Contagem (for i in range(N):) ───"></label>
              <block type="controls_repeat_ext"><value name="TIMES"><shadow type="math_number"><field name="NUM">10</field></shadow></value></block>
              <block type="controls_for"><value name="FROM"><shadow type="math_number"><field name="NUM">1</field></shadow></value><value name="TO"><shadow type="math_number"><field name="NUM">10</field></shadow></value><value name="BY"><shadow type="math_number"><field name="NUM">1</field></shadow></value></block>
              <sep gap="16"></sep>

              <label text="─── Iterar em Coleções (for item in lista:) ───"></label>
              <block type="controls_forEach"></block>
              <sep gap="16"></sep>

              <label text="─── Controle de Fluxo (break / continue) ───"></label>
              <block type="controls_flow_statements"></block>
            </category>

            <category name="🔢 Matemática &amp; Cálculos" colour="#6366f1">
              <label text="─── Números e Operações Básicas (+, -, *, /, **) ───"></label>
              <block type="math_number"><field name="NUM">123</field></block>
              <block type="math_arithmetic"><value name="A"><shadow type="math_number"><field name="NUM">1</field></shadow></value><value name="B"><shadow type="math_number"><field name="NUM">1</field></shadow></value></block>
              <block type="math_modulo"><value name="DIVIDEND"><shadow type="math_number"><field name="NUM">64</field></shadow></value><value name="DIVISOR"><shadow type="math_number"><field name="NUM">10</field></shadow></value></block>
              <sep gap="16"></sep>

              <label text="─── Funções Matemáticas &amp; Trigonometria (math.sqrt, sin, cos) ───"></label>
              <block type="math_single"><value name="NUM"><shadow type="math_number"><field name="NUM">9</field></shadow></value></block>
              <block type="math_trig"><value name="NUM"><shadow type="math_number"><field name="NUM">45</field></shadow></value></block>
              <block type="math_constant"></block>
              <block type="math_round"><value name="NUM"><shadow type="math_number"><field name="NUM">3.14</field></shadow></value></block>
              <block type="math_on_list"></block>
              <sep gap="16"></sep>

              <label text="─── Valores Aleatórios &amp; Limites (random.randint, constrain) ───"></label>
              <block type="math_random_int"><value name="FROM"><shadow type="math_number"><field name="NUM">1</field></shadow></value><value name="TO"><shadow type="math_number"><field name="NUM">100</field></shadow></value></block>
              <block type="math_random_float"></block>
              <sep gap="16"></sep>

              <label text="─── Conversão de Tipos (int(), float()) ───"></label>
              <block type="sat_math_to_int"></block>
              <block type="sat_math_to_float"></block>
            </category>

            <category name="📝 Textos &amp; Mensagens" colour="#14b8a6">
              <label text="─── Criação e Concatenação de Strings (str + str) ───"></label>
              <block type="text"></block>
              <block type="text_join"></block>
              <block type="text_append"><value name="TEXT"><shadow type="text"></shadow></value></block>
              <sep gap="16"></sep>

              <label text="─── Propriedades e Busca (len(str), find, in) ───"></label>
              <block type="text_length"><value name="VALUE"><shadow type="text"><field name="TEXT">abc</field></shadow></value></block>
              <block type="text_isEmpty"><value name="VALUE"><shadow type="text"><field name="TEXT"></field></shadow></value></block>
              <sep gap="16"></sep>

              <label text="─── Modificação e Saída no Terminal (print(), upper/lower) ───"></label>
              <block type="text_changeCase"><value name="TEXT"><shadow type="text"><field name="TEXT">abc</field></shadow></value></block>
              <block type="text_trim"><value name="TEXT"><shadow type="text"><field name="TEXT">abc</field></shadow></value></block>
              <block type="text_print"><value name="TEXT"><shadow type="text"><field name="TEXT">ESP32-CAM Pronta</field></shadow></value></block>
              <block type="sat_text_to_str"></block>
            </category>

            <category name="📑 Listas &amp; Coleções" colour="#8b5cf6">
              <label text="─── Criação de Listas (lista = [1, 2, 3]) ───"></label>
              <block type="lists_create_empty"></block>
              <block type="lists_create_with"></block>
              <block type="lists_repeat"><value name="NUM"><shadow type="math_number"><field name="NUM">5</field></shadow></value></block>
              <sep gap="16"></sep>

              <label text="─── Tamanho e Verificação (len(lista), if not lista:) ───"></label>
              <block type="lists_length"></block>
              <block type="lists_isEmpty"></block>
              <sep gap="16"></sep>

              <label text="─── Obter e Alterar Itens (lista[i], lista[i] = val) ───"></label>
              <block type="lists_getIndex"><value name="VALUE"><block type="variables_get"><field name="VAR">lista</field></block></value></block>
              <block type="lists_setIndex"><value name="LIST"><block type="variables_get"><field name="VAR">lista</field></block></value></block>
            </category>

            <category name="⏱️ Temporização &amp; Relógio" colour="#7c3aed">
              <label text="─── Pausas e Delays (time.sleep, time.sleep_ms) ───"></label>
              <block type="delay"><value name="TIME"><shadow type="math_number"><field name="NUM">1</field></shadow></value></block>
              <sep gap="16"></sep>

              <label text="─── Cronômetros de Alta Precisão (time.ticks_ms, ticks_diff) ───"></label>
              <block type="utime.vars"></block>
              <block type="utime.ticks_diff"><value name="TIME1"><shadow type="utime.vars"></shadow></value><value name="TIME2"><shadow type="math_number"><field name="NUM">0</field></shadow></value></block>
              <block type="timer"></block>
              <block type="stop_timer"><value name="timerNumber"><shadow type="math_number"><field name="NUM">0</field></shadow></value></block>
              <sep gap="16"></sep>

              <label text="─── Relógio RTC e Economia de Energia (machine.RTC, deep_sleep) ───"></label>
              <block type="esp32_deep_sleep"><value name="interval"><shadow type="math_number"><field name="NUM">60</field></shadow></value></block>
            </category>

            <category name="🐍 Python &amp; Avançado" colour="#3776ab">
              <label text="─── Tratamento de Exceções e Falhas (try / except) ───"></label>
              <block type="try_catch"></block>
              <sep gap="16"></sep>

              <label text="─── Executar Código Python Puro (Script Inline) ───"></label>
              <block type="exec_python"><value name="command"><shadow type="text"><field name="TEXT">print("ESP32-CAM OK")</field></shadow></value></block>
              <block type="exec_python_output"><value name="command"><shadow type="text"><field name="TEXT">time.ticks_ms()</field></shadow></value></block>
              <sep gap="16"></sep>

              <label text="─── Interrupções de Hardware e Comentários (Pin.irq) ───"></label>
              <block type="sat_python_comment"></block>
            </category>

            <category name="📦 Variáveis" colour="#f59e0b" custom="VARIABLE"></category>
            <category name="🧩 Funções &amp; Rotinas" colour="#8b5cf6" custom="PROCEDURE"></category>
          </xml>
        `;
        workspace.updateToolbox(esp32CamXml);
      } else {
        // Restaura Toolbox Completa Padrão (PION CubeSat / ESP32 DevKit)
        if (cachedOriginalToolboxXml) {
          workspace.updateToolbox(cachedOriginalToolboxXml);
        }
      }
      setTimeout(() => {
        Blockly.svgResize(workspace);
        workspace.render();
      }, 50);
    } catch (e) {
      console.warn('Erro ao atualizar toolbox por placa:', e);
    }
  }

  function showPinoutModal() {
    renderDeviceTab();
  }

  function sendQuickCmd(cmd) {
    // O REPL da placa já ecoa o comando recebido; não duplicar aqui.
    SatConnection.send(cmd + '\r\n');
  }

  function scrollTerminalToBottom() {
    const scrollContainer = document.getElementById('terminalScreenScroll');
    if (scrollContainer) {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  }

  let isToolboxCollapsed = false;
  let toolboxHoverTimeout = null;
  let isSidePanelCollapsed = false;
  let sidePanelHoverTimeout = null;

  function isFlyoutOpen() {
    if (!workspace) return false;
    try {
      const flyout = workspace.getFlyout ? workspace.getFlyout() : (workspace.getToolbox ? workspace.getToolbox().getFlyout() : null);
      return !!(flyout && flyout.isVisible && flyout.isVisible());
    } catch(e) {
      return false;
    }
  }

  function initToolboxCollapse() {
    const saved = localStorage.getItem('satblocks_toolbox_collapsed');
    if (saved === 'true' || (saved === null && window.innerWidth <= 768)) {
      setToolboxCollapsed(true);
    }

    const area = document.getElementById('blocklyArea');
    const trigger = document.getElementById('toolboxHoverTrigger');
    const toggleBtn = document.getElementById('btnToggleToolbox');

    function handleEnter() {
      if (!isToolboxCollapsed) return;
      clearTimeout(toolboxHoverTimeout);
      if (area) area.classList.add('hover-active');
    }

    function handleLeave(e) {
      if (!isToolboxCollapsed) return;
      clearTimeout(toolboxHoverTimeout);
      toolboxHoverTimeout = setTimeout(() => {
        // Se o flyout com os blocos estiver aberto, MANTÉM o menu lateral aberto junto!
        if (isFlyoutOpen()) {
          return;
        }
        const hovered = document.querySelector(':hover');
        if (hovered && (hovered.closest('.blocklyToolbox') || hovered.closest('.blocklyFlyout') || hovered.closest('#btnToggleToolbox') || hovered.closest('#toolboxHoverTrigger'))) {
          return;
        }
        if (area) area.classList.remove('hover-active');
      }, 200);
    }

    if (trigger) trigger.addEventListener('mouseenter', handleEnter);
    if (toggleBtn) toggleBtn.addEventListener('mouseenter', handleEnter);
    if (trigger) trigger.addEventListener('touchstart', handleEnter, { passive: true });
    if (toggleBtn) toggleBtn.addEventListener('touchstart', handleEnter, { passive: true });

    document.addEventListener('mousemove', (e) => {
      if (!isToolboxCollapsed) return;
      const toolboxEl = document.querySelector('.blocklyToolbox');
      const flyoutEl = document.querySelector('.blocklyFlyout');

      // Se o mouse está na borda esquerda ou dentro do toolbox ou dentro do flyout aberto
      if (e.clientX <= 25) {
        handleEnter();
      } else if (toolboxEl && toolboxEl.contains(e.target)) {
        handleEnter();
      } else if (flyoutEl && flyoutEl.contains(e.target)) {
        handleEnter();
      } else if (!isFlyoutOpen() && (!toolboxEl || !toolboxEl.contains(e.target)) && (!flyoutEl || !flyoutEl.contains(e.target)) && !toggleBtn.contains(e.target)) {
        handleLeave(e);
      }
    });

    // Quando o usuário clica no workspace ou arrasta um bloco para o workspace, fecha suavemente se o flyout fechar
    document.addEventListener('click', (e) => {
      if (!isToolboxCollapsed) return;
      const toolboxEl = document.querySelector('.blocklyToolbox');
      const flyoutEl = document.querySelector('.blocklyFlyout');
      if (toolboxEl && !toolboxEl.contains(e.target) && (!flyoutEl || !flyoutEl.contains(e.target)) && !toggleBtn.contains(e.target)) {
        setTimeout(() => {
          if (!isFlyoutOpen()) {
            if (area) area.classList.remove('hover-active');
          }
        }, 150);
      }
    });
  }

  function setToolboxCollapsed(collapsed) {
    isToolboxCollapsed = !!collapsed;
    const area = document.getElementById('blocklyArea');
    const btn = document.getElementById('btnToggleToolbox');

    if (area) {
      area.classList.toggle('toolbox-collapsed', isToolboxCollapsed);
      area.classList.remove('hover-active');
    }

    if (btn) {
      btn.title = isToolboxCollapsed 
        ? 'Barra Lateral Recolhida (Passe o mouse na borda esquerda para abrir) • Clique para fixar' 
        : 'Recolher Barra Lateral (Modo Auto-Hover)';
    }

    localStorage.setItem('satblocks_toolbox_collapsed', isToolboxCollapsed ? 'true' : 'false');
    setTimeout(() => {
      if (workspace) Blockly.svgResize(workspace);
    }, 260);
  }

  function toggleToolbox() {
    setToolboxCollapsed(!isToolboxCollapsed);
  }

  function isSidePanelInteractionTarget(el) {
    if (!el) return false;
    return !!(el.closest('.sat-side-panel') || el.closest('#panelHoverTrigger') || el.closest('#btnToggleSidePanel'));
  }

  function positionSidePanelToggleBtn() {
    const btn = document.getElementById('btnToggleSidePanel');
    const panelEl = document.getElementById('sidePanel');
    if (!btn || !panelEl) return;
    const restoreWidth = parseInt(panelEl.style.getPropertyValue('--sat-restore-width'), 10);
    const w = restoreWidth || parseInt(panelEl.style.width, 10) || panelEl.offsetWidth || 520;
    // Espelha o botão da barra de blocos: fica no canto interno (esquerdo) do painel,
    // acompanhando sua largura real em vez de ficar fixo na borda da tela.
    btn.style.right = Math.max(8, w - 37) + 'px';
  }

  function initSidePanelCollapse() {
    positionSidePanelToggleBtn();
    const saved = localStorage.getItem('satblocks_sidepanel_collapsed');
    if (saved === 'true' || (saved === null && window.innerWidth <= 768)) {
      setSidePanelCollapsed(true);
    }

    const area = document.getElementById('tab_page_blocks');
    const trigger = document.getElementById('panelHoverTrigger');
    const toggleBtn = document.getElementById('btnToggleSidePanel');

    function handleEnter() {
      if (!isSidePanelCollapsed) return;
      clearTimeout(sidePanelHoverTimeout);
      if (area) area.classList.add('side-panel-hover-active');
    }

    function handleLeave() {
      if (!isSidePanelCollapsed) return;
      clearTimeout(sidePanelHoverTimeout);
      sidePanelHoverTimeout = setTimeout(() => {
        const hovered = document.querySelector(':hover');
        if (isSidePanelInteractionTarget(hovered)) return;
        if (area) area.classList.remove('side-panel-hover-active');
      }, 350);
    }

    if (trigger) trigger.addEventListener('mouseenter', handleEnter);
    if (toggleBtn) toggleBtn.addEventListener('mouseenter', handleEnter);
    if (trigger) trigger.addEventListener('touchstart', handleEnter, { passive: true });
    if (toggleBtn) toggleBtn.addEventListener('touchstart', handleEnter, { passive: true });

    document.addEventListener('mousemove', (e) => {
      if (!isSidePanelCollapsed) return;
      const panelEl = document.getElementById('sidePanel');
      const winWidth = window.innerWidth;

      if (e.clientX >= winWidth - 25) {
        handleEnter();
      } else if (panelEl && panelEl.contains(e.target)) {
        handleEnter();
      } else if (!(panelEl && panelEl.contains(e.target)) && !(toggleBtn && toggleBtn.contains(e.target))) {
        handleLeave();
      }
    });

    document.addEventListener('click', (e) => {
      if (!isSidePanelCollapsed) return;
      const panelEl = document.getElementById('sidePanel');
      if (panelEl && !panelEl.contains(e.target) && !(toggleBtn && toggleBtn.contains(e.target))) {
        setTimeout(() => {
          if (area) area.classList.remove('side-panel-hover-active');
        }, 150);
      }
    });
  }

  function setSidePanelCollapsed(collapsed) {
    isSidePanelCollapsed = !!collapsed;
    const area = document.getElementById('tab_page_blocks');
    const panelEl = document.getElementById('sidePanel');
    const btn = document.getElementById('btnToggleSidePanel');

    if (panelEl) {
      // Preserva a largura atual como variável CSS para restaurar ao abrir via hover
      const currentWidth = panelEl.style.width || (panelEl.offsetWidth + 'px');
      panelEl.style.setProperty('--sat-restore-width', currentWidth);
      panelEl.classList.add('side-panel-collapse-transition');
      setTimeout(() => panelEl.classList.remove('side-panel-collapse-transition'), 340);
    }

    if (area) {
      area.classList.toggle('side-panel-collapsed', isSidePanelCollapsed);
      area.classList.remove('side-panel-hover-active');
    }

    positionSidePanelToggleBtn();

    if (btn) {
      btn.title = isSidePanelCollapsed
        ? 'Painel de Código Recolhido (Passe o mouse na borda direita para abrir) • Clique para fixar'
        : 'Recolher Painel de Código (Modo Auto-Hover)';
    }

    localStorage.setItem('satblocks_sidepanel_collapsed', isSidePanelCollapsed ? 'true' : 'false');
    setTimeout(() => {
      if (workspace) Blockly.svgResize(workspace);
    }, 340);
  }

  function toggleSidePanel() {
    setSidePanelCollapsed(!isSidePanelCollapsed);
  }

  function switchPinoutImage(src) {
    const img = document.getElementById('deviceBoardImage');
    if (img) {
      img.src = src;
    }
  }

  return {
    init,
    getWorkspace: () => workspace,
    getCurrentBoard: () => currentBoard,
    switchMainTab,
    toggleTabsDropdown,
    toggleActionsDropdown,
    closeActionsDropdown,
    toggleToolbox,
    setToolboxCollapsed,
    toggleSidePanel,
    setSidePanelCollapsed,
    renderDeviceTab,
    sendQuickCmd,
    switchPinoutImage,
    updateGeneratedCode,
    loadMissionXml
  };
})();

window.addEventListener('DOMContentLoaded', () => {
  SatBlocksApp.init();
});
