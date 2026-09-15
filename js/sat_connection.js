/**
 * SatBlocks Connection Manager — Suporte a Web Serial (Cabo USB), Web Bluetooth (BLE) e WebREPL (Wi-Fi)
 * Copyright (C) 2026 OBSAT / BIPES Project
 * Funciona 100% offline e localmente no navegador
 */

window.SatConnection = (function() {
  'use strict';

  let currentChannel = 'serial'; // 'serial', 'bluetooth', 'webrepl', 'sim'
  let isConnected = false;
  let serialPort = null;
  let serialReader = null;
  let serialReadTask = null;
  let bleDevice = null;
  let bleCharacteristicTx = null;
  let bleCharacteristicRx = null;
  let webReplSocket = null;

  const listeners = [];

  function addDataListener(callback) {
    listeners.push(callback);
  }

  function emitData(text) {
    listeners.forEach(cb => cb(text));
  }

  // ====================================================
  // 1. CONEXÃO VIA CABO USB (WEB SERIAL API - PADRÃO OFICIAL BIPES)
  // ====================================================
  async function connectSerial(baudRate = 115200) {
    if (!('serial' in navigator)) {
      alert('Atenção: A Web Serial API não é suportada neste navegador.\nRecomendamos usar Google Chrome, Microsoft Edge ou Opera.');
      return false;
    }

    if (isConnected) return true;
    try {
      serialPort = await navigator.serial.requestPort();
      await serialPort.open({ 
        baudRate: parseInt(baudRate, 10),
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        flowControl: 'none'
      });

      // Libera DTR e RTS imediatamente para que o circuito de transistores do shield ESP32-CAM-MB não trave o chip em Reset
      try {
        const info = serialPort.getInfo();
        const rp2040 = info.usbVendorId === 0x2e8a ||
          (window.SatBlocksApp && window.SatBlocksApp.getCurrentBoard() === 'rp2040_zero');
        await serialPort.setSignals({ dataTerminalReady: rp2040, requestToSend: false });
      } catch (e) {}

      isConnected = true;
      currentChannel = 'serial';
      updateUiStatus(true, 'Conectado (USB Serial)');
      emitData('\n[CONECTADO] Porta Serial USB aberta a ' + baudRate + ' baud.\n');

      const port = serialPort;
      serialReader = port.readable.getReader();
      const reader = serialReader;
      serialReadTask = (async () => {
        const decoder = new TextDecoder();
        try {
          while (isConnected) {
            const { value, done } = await reader.read();
            if (done) break;
            emitData(decoder.decode(value, { stream: true }));
          }
        } catch (error) {
          console.warn('Stream serial encerrado:', error);
        } finally {
          reader.releaseLock();
          if (serialReader === reader) serialReader = null;
        }
      })();
      serialReadTask.then(() => {
        if (isConnected && serialPort === port) disconnect();
      });
      // Connecting must preserve the program already collecting telemetry.

      return true;
    } catch (err) {
      console.error('Erro na conexão Serial:', err);
      if (err.name !== 'NotFoundError') {
        alert('Erro ao conectar via Serial: ' + err.message);
      }
      return false;
    }
  }

  async function pulseHardwareReset() {
    if (serialPort && isConnected) {
      try {
        await serialPort.setSignals({ dataTerminalReady: false, requestToSend: true });
        await new Promise(r => setTimeout(r, 120));
        await serialPort.setSignals({ dataTerminalReady: false, requestToSend: false });
        emitData('\n⚡ [SISTEMA] Pulso eletrônico de Hardware Reset enviado ao shield.\n');
      } catch (e) {
        emitData('\n⚠️ [SISTEMA] Sinais DTR/RTS não suportados por este driver serial.\n');
      }
    }
  }

  async function sendSerial(data) {
    if (!serialPort || !serialPort.writable) return;
    try {
      const encoder = new TextEncoder();
      const writer = serialPort.writable.getWriter();
      try {
        await writer.write(encoder.encode(data));
      } finally {
        writer.releaseLock();
      }
    } catch (e) {
      console.warn('Erro ao enviar dados via Serial:', e);
      throw e;
    }
  }

  // ====================================================
  // 2. CONEXÃO VIA BLUETOOTH BLE (WEB BLUETOOTH API)
  // ====================================================
  async function connectBluetooth() {
    if (!('bluetooth' in navigator)) {
      alert('Atenção: A Web Bluetooth API não é suportada neste navegador.\nUtilize Google Chrome ou Edge em conexões HTTPS/localhost.');
      return false;
    }

    try {
      // Serviços padrão Nordic UART e ESP32 BLE Serial
      const UART_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
      const UART_RX_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
      const UART_TX_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';

      bleDevice = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: 'ESP32' }, { namePrefix: 'OBSAT' }, { namePrefix: 'Sat' }, { namePrefix: 'CanSat' }],
        optionalServices: [UART_SERVICE_UUID, 'generic_access']
      });

      const server = await bleDevice.gatt.connect();
      const service = await server.getPrimaryService(UART_SERVICE_UUID);
      bleCharacteristicTx = await service.getCharacteristic(UART_RX_UUID);
      bleCharacteristicRx = await service.getCharacteristic(UART_TX_UUID);

      await bleCharacteristicRx.startNotifications();
      bleCharacteristicRx.addEventListener('characteristicvaluechanged', (event) => {
        const value = event.target.value;
        const decoder = new TextDecoder('utf-8');
        emitData(decoder.decode(value));
      });

      isConnected = true;
      currentChannel = 'bluetooth';
      updateUiStatus(true, `Conectado (BLE: ${bleDevice.name || 'Satélite'})`);
      return true;
    } catch (err) {
      console.error('Erro na conexão BLE:', err);
      if (err.name !== 'NotFoundError') {
        alert('Erro ao conectar via Bluetooth BLE: ' + err.message);
      }
      return false;
    }
  }

  async function sendBluetooth(data) {
    if (!bleCharacteristicTx) return;
    const encoder = new TextEncoder();
    const bytes = encoder.encode(data);
    
    // Divide em blocos de até 20 bytes (limite MTU BLE clássico)
    for (let i = 0; i < bytes.length; i += 20) {
      const chunk = bytes.slice(i, i + 20);
      await bleCharacteristicTx.writeValue(chunk);
    }
  }

  // ====================================================
  // 3. CONEXÃO VIA WEBREPL (WI-FI / WEBSOCKET)
  // ====================================================
  function connectWebRepl(url = 'ws://192.168.4.1:8266/', password = 'bipes') {
    try {
      webReplSocket = new WebSocket(url);
      webReplSocket.binaryType = 'arraybuffer';

      webReplSocket.onopen = function() {
        isConnected = true;
        currentChannel = 'webrepl';
        updateUiStatus(true, 'Conectado (WebREPL Wi-Fi)');
        emitData('\n[WEBREPL] Conectado a ' + url + '\n');
        
        // Envia senha após breve delay se solicitado
        setTimeout(() => {
          if (password) {
            webReplSocket.send(password + '\r');
          }
        }, 500);
      };

      webReplSocket.onmessage = function(event) {
        if (typeof event.data === 'string') {
          emitData(event.data);
        } else {
          const decoder = new TextDecoder('utf-8');
          emitData(decoder.decode(event.data));
        }
      };

      webReplSocket.onclose = function() {
        disconnect();
        emitData('\n[WEBREPL] Conexão encerrada.\n');
      };

      webReplSocket.onerror = function(err) {
        console.warn('Erro no WebREPL:', err);
        alert('Erro ao conectar ao WebREPL no endereço ' + url);
        disconnect();
      };
      return true;
    } catch (err) {
      alert('Erro ao iniciar WebREPL: ' + err.message);
      return false;
    }
  }

  function sendWebRepl(data) {
    if (webReplSocket && webReplSocket.readyState === WebSocket.OPEN) {
      webReplSocket.send(data);
    }
  }

  // ====================================================
  // ENVIO UNIFICADO DE DADOS E COMANDOS
  // ====================================================
  async function send(data) {
    if (!isConnected) {
      // Modo de simulação local caso não haja hardware conectado
      emitData(data);
      return;
    }

    if (currentChannel === 'serial') {
      await sendSerial(data);
    } else if (currentChannel === 'bluetooth') {
      await sendBluetooth(data);
    } else if (currentChannel === 'webrepl') {
      sendWebRepl(data);
    }
  }

  // Envia script Python para execução direta via Paste Mode (\x05 ... \x04)
  async function runPythonScript(code) {
    if (!isConnected) {
      // Execução simulada com eco no terminal
      emitData('\n[SIMULAÇÃO LOCAL] Executando programa no interpretador virtual:\n');
      emitData(code + '\n');
      return;
    }

    try {
      // 1. Interrompe qualquer execução anterior com Ctrl+C duplo
      await send('\x03\x03');
      await new Promise(r => setTimeout(r, 200));

      // 2. Entra em Paste Mode do MicroPython (\x05 = Ctrl+E)
      // O Paste Mode não oculta o stdout, desativa indentação automática e executa com máxima estabilidade
      await send('\x05');
      await new Promise(r => setTimeout(r, 150));

      // 3. Envia o código em chunks de 128 bytes para respeitar o buffer UART
      const CHUNK_SIZE = 128;
      for (let i = 0; i < code.length; i += CHUNK_SIZE) {
        const chunk = code.substring(i, i + CHUNK_SIZE);
        await send(chunk);
        await new Promise(r => setTimeout(r, 20));
      }

      await new Promise(r => setTimeout(r, 100));

      // 4. Confirma a colagem e executa imediatamente (\x04 = Ctrl+D)
      await send('\x04\r\n');
    } catch (err) {
      emitData(`\n[ERRO DE TRANSMISSÃO SERIAL] ${err.message}\n`);
    }
  }

  async function stopProgram() {
    if (isConnected) {
      await send('\x03\x03\r\n'); // Envia Ctrl+C duplo + Enter
    }
    emitData('\n🛑 [SISTEMA] Interrupção de execução enviada (Ctrl+C).\n>>> ');
  }

  async function softReset() {
    if (isConnected) {
      await send('\x03\x04'); // Ctrl+C seguido de Ctrl+D
    }
    emitData('\n[SISTEMA] Reinicialização de software solicitada (Soft Reset).\n');
  }

  async function disconnect() {
    isConnected = false;
    if (serialReader) {
      try { await serialReader.cancel(); } catch (e) {}
      serialReader = null;
    }
    if (serialReadTask) {
      await serialReadTask;
      serialReadTask = null;
    }
    if (serialPort) {
      try { await serialPort.close(); } catch (e) {}
      serialPort = null;
    }
    if (bleDevice && bleDevice.gatt.connected) {
      bleDevice.gatt.disconnect();
      bleDevice = null;
    }
    if (webReplSocket) {
      try { webReplSocket.close(); } catch (e) {}
      webReplSocket = null;
    }

    updateUiStatus(false, 'Desconectado');
  }

  function updateUiStatus(connected, label) {
    const channelConnectEl = document.getElementById('channel_connect');
    const connectBtn = document.getElementById('connectButton');
    const channelBtn = document.getElementById('channelButton');

    if (channelConnectEl) {
      channelConnectEl.classList.toggle('connected', connected);
    }
    if (connectBtn) {
      connectBtn.classList.toggle('selected', connected);
      connectBtn.classList.toggle('active', connected);
      connectBtn.title = connected ? 'Desconectar Satélite (Conectado)' : 'Conectar Satélite';
      if (connected) {
        connectBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        `;
      } else {
        connectBtn.innerHTML = `
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2v6m0 8v6M4.93 4.93l4.24 4.24m5.66 5.66l4.24 4.24M2 12h6m8 0h6M4.93 19.07l4.24-4.24m5.66-5.66l4.24-4.24"></path>
          </svg>
        `;
      }
    }
    if (channelBtn) {
      channelBtn.title = `Canal: ${currentChannel.toUpperCase()} (${connected ? 'Conectado' : 'Desconectado'})`;
    }

    // Compatibilidade com elementos legados caso existam
    const indicator = document.getElementById('connectionStatusIndicator');
    const statusText = document.getElementById('connectionStatusText');
    if (indicator) {
      indicator.classList.toggle('connected', connected);
      indicator.classList.toggle('disconnected', !connected);
    }
    if (statusText) {
      statusText.textContent = label || (connected ? 'Conectado' : 'Desconectado');
    }
  }

  // Verifica portas previamente autorizadas ao inicializar
  async function checkAutoConnect() {
    if ('serial' in navigator) {
      try {
        const ports = await navigator.serial.getPorts();
        if (ports && ports.length > 0) {
          console.log('[SERIAL] Portas autorizadas detectadas no navegador:', ports.length);
        }
      } catch (e) {}
    }
  }


  return {
    connectSerial,
    connectBluetooth,
    connectWebRepl,
    disconnect,
    send,
    runPythonScript,
    stopProgram,
    softReset,
    pulseHardwareReset,
    addDataListener,
    emitData,
    isConnected: () => isConnected,
    getChannel: () => currentChannel,
    init: checkAutoConnect
  };
})();
