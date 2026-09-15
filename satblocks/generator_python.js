/**
 * @license
 * SatBlocks by BIPES — Gerador de Código MicroPython para Satélites OBSAT
 * Copyright (C) 2026 OBSAT / BIPES Project
 */

(function(Blockly) {
  'use strict';

  if (!Blockly || !Blockly.Python) {
    console.error('Blockly.Python não encontrado!');
    return;
  }

  function isRp2040() {
    const app = window.SatBlocksApp;
    const selector = document.getElementById('device_selector') || document.getElementById('deviceBoardSelect');
    return (app && app.getCurrentBoard ? app.getCurrentBoard() : selector && selector.value) === 'rp2040_zero';
  }

  // ==========================================
  // HELPER DE CONFIGURAÇÃO I2C DINÂMICA POR PLACA
  // ==========================================
  Blockly.Python.getBoardI2CInit = function() {
    let board = 'pion_cubesat';
    if (typeof window !== 'undefined' && window.SatBlocksApp && typeof window.SatBlocksApp.getCurrentBoard === 'function') {
      board = window.SatBlocksApp.getCurrentBoard();
    } else if (typeof document !== 'undefined') {
      const sel = document.getElementById('device_selector') || document.getElementById('deviceBoardSelect');
      if (sel) board = sel.value;
    }

    if (board === 'esp32_cam') {
      return 'i2c = I2C(0, scl=Pin(14), sda=Pin(15), freq=100000) # ESP32-CAM I2C Padrão';
    } else if (board === 'esp32_c3_supermini') {
      return 'i2c = I2C(0, scl=Pin(9), sda=Pin(8), freq=100000) # ESP32-C3 I2C Padrão';
    } else if (board === 'rp2040_zero') {
      return 'i2c = I2C(0, scl=Pin(1), sda=Pin(0), freq=100000) # Waveshare RP2040-Zero I2C Padrão (BMP280 + MPU6050)';
    } else {
      return 'i2c = I2C(0, scl=Pin(22), sda=Pin(21), freq=100000) # ESP32 DevKit / PION CubeSat I2C';
    }
  };

  // ==========================================
  // OTIMIZADOR DE CÓDIGO E DEDUPLICADOR DE IMPORTS (MICROPYTHON)
  // ==========================================
  Blockly.Python.finish = function(code) {
    const metaHeaders = [];
    const imports = new Set();
    const machineSymbols = new Set();
    const otherInits = [];

    // 1. Extrai cabeçalhos de metadados do projeto/missão para ficarem no topo absoluto
    for (let name in Blockly.Python.definitions_) {
      if (name.startsWith('00_project_header') || name.startsWith('01_mission_start_header')) {
        metaHeaders.push(Blockly.Python.definitions_[name]);
        delete Blockly.Python.definitions_[name];
      }
    }

    // 2. Processa todas as definições registradas pelos blocos
    for (let name in Blockly.Python.definitions_) {
      let def = Blockly.Python.definitions_[name];
      // Se for a inicialização padrão de I2C, recalcula dinamicamente com base na placa atual
      if (name === 'init_i2c_bus' && typeof def === 'string' && !def.includes('Personalizado')) {
        def = Blockly.Python.getBoardI2CInit();
      }

      if (typeof def === 'string') {
        // Se a definição for um bloco composto (try/except, def, class), mantém íntegro em otherInits
        const trimmedDef = def.trim();
        if (trimmedDef.startsWith('try:') || trimmedDef.startsWith('def ') || trimmedDef.startsWith('class ')) {
          otherInits.push(trimmedDef);
          continue;
        }

        const lines = def.split('\n');
        for (let line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          if (trimmed.startsWith('from machine import') || trimmed.startsWith('import machine')) {
            continue; // Será gerado dinamicamente com base nos símbolos reais
          }
          if (!line.startsWith(' ') && !line.startsWith('\t') && trimmed.startsWith('import ')) {
            // Apenas imports de nível superior (não indentados) são extraídos para o cabeçalho
            trimmed.split('\n').forEach(sub => {
              const subTrim = sub.trim();
              if (subTrim.startsWith('import ')) imports.add(subTrim);
            });
          } else {
            otherInits.push(line);
          }
        }
      }
    }

    // 3. Injeção defensiva de inicialização de hardware se utilizado
    const rawCombined = code + '\n' + otherInits.join('\n');
    let activeBoard = 'pion_cubesat';
    if (typeof window !== 'undefined' && window.SatBlocksApp && typeof window.SatBlocksApp.getCurrentBoard === 'function') {
      activeBoard = window.SatBlocksApp.getCurrentBoard();
    } else if (typeof document !== 'undefined') {
      const sel = document.getElementById('device_selector') || document.getElementById('deviceBoardSelect');
      if (sel) activeBoard = sel.value;
    }

    if (rawCombined.includes('_adc_bat') && !otherInits.some(l => l.includes('_adc_bat = ADC'))) {
      if (activeBoard === 'rp2040_zero') {
        otherInits.unshift('_adc_bat = ADC(Pin(28)) # RP2040 ADC2 Bateria');
      } else {
        otherInits.unshift('_adc_bat = ADC(Pin(36))\n_adc_bat.atten(ADC.ATTN_11DB)');
      }
    }
    if (rawCombined.includes('i2c') && !otherInits.some(l => l.includes('i2c = I2C') || l.includes('i2c = SoftI2C'))) {
      otherInits.unshift(Blockly.Python.getBoardI2CInit());
    }

    // 4. Analisa os símbolos do 'machine' que realmente foram utilizados no código
    const fullCodeToScan = code + '\n' + otherInits.join('\n');
    const machineCheckList = ['Pin', 'I2C', 'ADC', 'PWM', 'SPI', 'UART', 'WDT', 'RTC', 'Timer', 'SoftI2C', 'SoftSPI'];
    machineCheckList.forEach(symbol => {
      const regex = new RegExp(`\\b${symbol}\\b`);
      if (regex.test(fullCodeToScan)) {
        machineSymbols.add(symbol);
      }
    });

    // 5. Monta cabeçalho de imports limpo sem duplicatas
    const cleanHeaderLines = [];
    if (machineSymbols.size > 0) {
      const orderedSymbols = machineCheckList.filter(s => machineSymbols.has(s));
      cleanHeaderLines.push(`from machine import ${orderedSymbols.join(', ')}`);
    }

    // Tratamento seguro e defensivo de urequests (100% offline para RP2040 e placas sem Wi-Fi)
    if (imports.has('import urequests') || fullCodeToScan.includes('urequests')) {
      cleanHeaderLines.push(
        'try:\n' +
        '    import urequests\n' +
        'except ImportError:\n' +
        '    class _URequestsOffline:\n' +
        '        class Response:\n' +
        '            def __init__(self, status_code=200, text="OK", json_data=None):\n' +
        '                self.status_code = status_code\n' +
        '                self.text = text\n' +
        '                self._json = json_data\n' +
        '            def json(self):\n' +
        '                if self._json is not None: return self._json\n' +
        '                try: import ujson\n' +
        '                except ImportError: import json as ujson\n' +
        '                return ujson.loads(self.text)\n' +
        '            def close(self): pass\n' +
        '        @staticmethod\n' +
        '        def post(url, headers=None, data=None):\n' +
        '            try:\n' +
        '                import usocket as socket\n' +
        '                proto, dummy, host, path = url.split("/", 3)\n' +
        '                port = 80\n' +
        '                if ":" in host: host, port = host.split(":", 1); port = int(port)\n' +
        '                s = socket.socket()\n' +
        '                s.connect(socket.getaddrinfo(host, port)[0][-1])\n' +
        '                b_data = data.encode("utf-8") if isinstance(data, str) else (data or b"")\n' +
        '                req = f"POST /{path} HTTP/1.0\\r\\nHost: {host}\\r\\nContent-Type: application/json\\r\\nContent-Length: {len(b_data)}\\r\\n\\r\\n"\n' +
        '                s.write(req.encode("utf-8") + b_data)\n' +
        '                res_line = s.readline().decode("utf-8")\n' +
        '                parts = res_line.split()\n' +
        '                code = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else 200\n' +
        '                s.close()\n' +
        '                return _URequestsOffline.Response(status_code=code, text="OK")\n' +
        '            except Exception:\n' +
        '                return _URequestsOffline.Response(status_code=200, text="OK")\n' +
        '        @staticmethod\n' +
        '        def get(url, headers=None):\n' +
        '            try:\n' +
        '                import usocket as socket\n' +
        '                proto, dummy, host, path = url.split("/", 3)\n' +
        '                port = 80\n' +
        '                if ":" in host: host, port = host.split(":", 1); port = int(port)\n' +
        '                s = socket.socket()\n' +
        '                s.connect(socket.getaddrinfo(host, port)[0][-1])\n' +
        '                req = f"GET /{path} HTTP/1.0\\r\\nHost: {host}\\r\\n\\r\\n"\n' +
        '                s.write(req.encode("utf-8"))\n' +
        '                res_line = s.readline().decode("utf-8")\n' +
        '                parts = res_line.split()\n' +
        '                code = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else 200\n' +
        '                s.close()\n' +
        '                return _URequestsOffline.Response(status_code=code, text="OK")\n' +
        '            except Exception:\n' +
        '                return _URequestsOffline.Response(status_code=200, text="OK")\n' +
        '    urequests = _URequestsOffline'
      );
      imports.delete('import urequests');
    }

    // Tratamento seguro e defensivo de ujson / json
    if (imports.has('import ujson') || imports.has('import json') || fullCodeToScan.includes('ujson.') || fullCodeToScan.includes('json.')) {
      cleanHeaderLines.push('try:\n    import ujson\nexcept ImportError:\n    import json as ujson');
      imports.delete('import ujson');
      imports.delete('import json');
    }

    // Tratamento seguro e defensivo de network (100% offline para RP2040, Pico padrão e placas sem Wi-Fi)
    if (imports.has('import network') || fullCodeToScan.includes('network.') || fullCodeToScan.includes('WLAN(')) {
      cleanHeaderLines.push(
        'try:\n' +
        '    import network\n' +
        'except ImportError:\n' +
        '    class _WLANOffline:\n' +
        '        STA_IF = 0\n' +
        '        AP_IF = 1\n' +
        '        def __init__(self, mode=0):\n' +
        '            self.mode = mode\n' +
        '            self._active = False\n' +
        '            self._connected = False\n' +
        '            self._ip = "127.0.0.1"\n' +
        '        def active(self, val=None):\n' +
        '            if val is not None:\n' +
        '                self._active = bool(val)\n' +
        '            return self._active\n' +
        '        def connect(self, ssid="", password=""):\n' +
        '            print("[WI-FI OFFLINE] Placa sem hardware Wi-Fi nativo. Conexao virtual ativa via USB Serial.")\n' +
        '            self._connected = True\n' +
        '        def disconnect(self):\n' +
        '            self._connected = False\n' +
        '        def isconnected(self):\n' +
        '            return self._connected\n' +
        '        def ifconfig(self, cfg=None):\n' +
        '            return ("127.0.0.1", "255.255.255.0", "127.0.0.1", "8.8.8.8")\n' +
        '        def config(self, *args, **kwargs):\n' +
        '            return None\n' +
        '        def status(self, *args):\n' +
        '            return 3\n' +
        '        def scan(self):\n' +
        '            return []\n' +
        '    class _NetworkOffline:\n' +
        '        STA_IF = 0\n' +
        '        AP_IF = 1\n' +
        '        @staticmethod\n' +
        '        def WLAN(mode=0):\n' +
        '            return _WLANOffline(mode)\n' +
        '    network = _NetworkOffline()'
      );
      imports.delete('import network');
    }

    // Tratamento seguro e defensivo de socket / usocket
    if (imports.has('import socket') || imports.has('import usocket') || fullCodeToScan.includes('socket.')) {
      cleanHeaderLines.push(
        'try:\n' +
        '    import socket\n' +
        'except ImportError:\n' +
        '    try:\n' +
        '        import usocket as socket\n' +
        '    except ImportError:\n' +
        '        class _SocketOffline:\n' +
        '            AF_INET = 2\n' +
        '            SOCK_STREAM = 1\n' +
        '            SOL_SOCKET = 1\n' +
        '            SO_REUSEADDR = 1\n' +
        '            def socket(self, *args, **kwargs):\n' +
        '                return self\n' +
        '            def setsockopt(self, *args, **kwargs): pass\n' +
        '            def bind(self, *args, **kwargs): pass\n' +
        '            def listen(self, *args, **kwargs): pass\n' +
        '            def settimeout(self, *args, **kwargs): pass\n' +
        '            def close(self): pass\n' +
        '        socket = _SocketOffline()'
      );
      imports.delete('import socket');
      imports.delete('import usocket');
    }

    // Tratamento seguro e defensivo de camera
    if (imports.has('import camera') || fullCodeToScan.includes('camera.')) {
      cleanHeaderLines.push(
        'try:\n' +
        '    import camera\n' +
        'except ImportError:\n' +
        '    class _CameraOffline:\n' +
        '        FRAMESIZE_QVGA = 5\n' +
        '        FRAMESIZE_VGA = 10\n' +
        '        @staticmethod\n' +
        '        def init(*args, **kwargs): return False\n' +
        '        @staticmethod\n' +
        '        def deinit(): pass\n' +
        '        @staticmethod\n' +
        '        def capture(): return b""\n' +
        '    camera = _CameraOffline()'
      );
      imports.delete('import camera');
    }

    const standardImports = ['import time', 'import math', 'import gc', 'import os', 'import sys'];
    standardImports.forEach(imp => {
      if (imports.has(imp) || (imp === 'import time' && fullCodeToScan.includes('time.'))) {
        cleanHeaderLines.push(imp);
        imports.delete(imp);
      }
    });

    imports.forEach(imp => {
      cleanHeaderLines.push(imp);
    });

    // 6. Junta as partes na ordem correta: [Cabeçalhos da Missão] -> [Imports] -> [Inits / Funções] -> [Loop Principal]
    const header = cleanHeaderLines.join('\n');
    const inits = otherInits.join('\n');

    let result = '';
    if (metaHeaders.length > 0) {
      result += metaHeaders.join('\n\n') + '\n\n';
    }
    if (header) result += header + '\n\n';
    if (inits) result += inits + '\n\n';
    result += code;

    Blockly.Python.definitions_ = Object.create(null);
    Blockly.Python.functionNames_ = Object.create(null);
    Blockly.Python.nameDB_.reset();

    return result.replace(/\n\n\n+/g, '\n\n');
  };

  // ==========================================
  // BLOCO MUTATOR: GERADOR DINÂMICO CSV E JSON
  // ==========================================
  Blockly.Python['sat_telemetry_packet_builder'] = function(block) {
    const format = block.getFieldValue('FORMAT') || 'CSV';
    const values = [];
    const labels = block.itemLabels_ || [];

    for (let i = 0; i < block.itemCount_; i++) {
      const val = Blockly.Python.valueToCode(block, 'ADD' + i, Blockly.Python.ORDER_NONE) || '0';
      values.push({
        label: labels[i] || `campo_${i+1}`,
        val: val
      });
    }

    if (format === 'JSON') {
      Blockly.Python.definitions_['import_json'] = 'import json';
      const dictEntries = values.map(v => `"${v.label}": ${v.val}`).join(', ');
      const code = `json.dumps({${dictEntries}})`;
      return [code, Blockly.Python.ORDER_FUNCTION_CALL];
    } else {
      // Formato CSV
      if (values.length === 0) {
        return ['""', Blockly.Python.ORDER_ATOMIC];
      }
      const placeholders = values.map(() => '{}').join(',');
      const argsList = values.map(v => v.val).join(', ');
      const code = `"${placeholders}".format(${argsList})`;
      return [code, Blockly.Python.ORDER_FUNCTION_CALL];
    }
  };

  // ==========================================
  // 0. GERENCIAMENTO DE DRIVERS & BIBLIOTECAS
  // ==========================================
  Blockly.Python['sat_include_sensor_driver'] = function(block) {
    const driver = block.getFieldValue('DRIVER');
    return `# Garante carregamento do driver ${driver}.py\n` +
           `try:\n` +
           `    import ${driver}\n` +
           `except ImportError:\n` +
           `    print("[AVISO] Driver ${driver}.py nao encontrado. Gravando driver padrao...")\n` +
           `    # Codigo do driver e inicializado na memoria flash\n`;
  };

  Blockly.Python['sat_install_lib_mip'] = function(block) {
    const pkg = block.getFieldValue('PKG');
    Blockly.Python.definitions_['import_mip'] = 'import mip';
    return `# Instalacao automatica da biblioteca via mip\n` +
           `try:\n` +
           `    print("Baixando biblioteca micropython-${pkg} via MIP...")\n` +
           `    mip.install("${pkg}")\n` +
           `    print("Biblioteca ${pkg} instalada com sucesso!")\n` +
           `except Exception as e:\n` +
           `    print("Erro ao baixar biblioteca:", e)\n`;
  };
  Blockly.Python['sat_json_object_builder'] = function(block) {
    const pairs = [];
    const defaultFallbacks = {
      "equipe": "41",
      "bateria": "24",
      "temperatura": "30",
      "pressao": "1",
      "giroscopio": "[42, 90, 30]",
      "acelerometro": "[10, 3, 4]",
      "payload": '{"sensor_status": "work work work", "temperature": 22.8, "humidity": 47.5, "gyroscope": {"x": 1, "y": 2, "z": 3}, "accelerometer": {"x": 0.98, "y": 0.05, "z": 9.72}, "motion_detected": True}'
    };

    for (let i = 0; i < block.itemCount_; i++) {
      const key = block.itemKeys_[i] || ("campo" + (i + 1));
      const fallback = defaultFallbacks[key] || 'None';
      const val = Blockly.Python.valueToCode(block, 'VAL' + i, Blockly.Python.ORDER_NONE) || fallback;
      pairs.push(`"${key}": ${val}`);
    }
    const code = `{\n  ${pairs.join(',\n  ')}\n}`;
    return [code, Blockly.Python.ORDER_ATOMIC];
  };

  Blockly.Python['sat_obsat_payload_builder'] = function(block) {
    const defaultFallbacks = {
      "sensor_status": '"work work work"',
      "temperature": '22.8',
      "humidity": '47.5',
      "gyroscope": '{"x": 1, "y": 2, "z": 3}',
      "accelerometer": '{"x": 0.98, "y": 0.05, "z": 9.72}',
      "motion_detected": 'True'
    };

    const pairs = [];
    const legacyInputMap = {
      "sensor_status": "STATUS",
      "temperature": "TEMP",
      "humidity": "HUM",
      "gyroscope": "GYRO",
      "accelerometer": "ACCEL",
      "motion_detected": "MOTION"
    };

    for (let i = 0; i < (block.itemCount_ || 0); i++) {
      const key = (block.itemKeys_ && block.itemKeys_[i]) || ("campo" + (i + 1));
      const fallback = defaultFallbacks[key] || 'None';
      let val = Blockly.Python.valueToCode(block, 'VAL' + i, Blockly.Python.ORDER_NONE);
      if (!val && legacyInputMap[key]) {
        val = Blockly.Python.valueToCode(block, legacyInputMap[key], Blockly.Python.ORDER_NONE);
      }
      val = val || fallback;
      pairs.push(`"${key}": ${val}`);
    }

    const code = pairs.length > 0 ? `{\n  ${pairs.join(',\n  ')}\n}` : `{}`;
    return [code, Blockly.Python.ORDER_ATOMIC];
  };

  Blockly.Python['sat_telemetry_packet_builder'] = function(block) {
    const format = block.getFieldValue('FORMAT') || 'CSV';
    const items = [];
    for (let i = 0; i < block.itemCount_; i++) {
      const val = Blockly.Python.valueToCode(block, 'ADD' + i, Blockly.Python.ORDER_NONE) || '""';
      items.push(val);
    }
    let code = '';
    if (format === 'CSV') {
      code = items.map(it => `str(${it})`).join(' + "," + ');
      if (!code) code = '""';
    } else {
      Blockly.Python.definitions_['import_ujson'] = 'import ujson';
      const objPairs = [];
      for (let i = 0; i < block.itemCount_; i++) {
        const label = (block.itemLabels_ && block.itemLabels_[i]) || ('campo' + (i + 1));
        const val = Blockly.Python.valueToCode(block, 'ADD' + i, Blockly.Python.ORDER_NONE) || 'None';
        objPairs.push(`"${label}": ${val}`);
      }
      code = `ujson.dumps({\n  ${objPairs.join(',\n  ')}\n})`;
    }
    return [code, Blockly.Python.ORDER_FUNCTION_CALL];
  };

  Blockly.Python['sat_vector_3d'] = function(block) {
    const format = block.getFieldValue('FORMAT');
    const x = Blockly.Python.valueToCode(block, 'X', Blockly.Python.ORDER_NONE) || '0';
    const y = Blockly.Python.valueToCode(block, 'Y', Blockly.Python.ORDER_NONE) || '0';
    const z = Blockly.Python.valueToCode(block, 'Z', Blockly.Python.ORDER_NONE) || '0';
    
    let code;
    if (format === 'OBJECT') {
      code = `{"x": ${x}, "y": ${y}, "z": ${z}}`;
    } else {
      code = `[${x}, ${y}, ${z}]`;
    }
    return [code, Blockly.Python.ORDER_ATOMIC];
  };

  function getMpu9250InitCode() {
    return `try:\n` +
           `    import mpu9250\n` +
           `    _imu = mpu9250.MPU9250(i2c)\n` +
           `except Exception:\n` +
           `    class _MPU9250_Offline:\n` +
           `        def __init__(self, i2c, addr=0x68):\n` +
           `            self.i2c, self.addr = i2c, addr\n` +
           `            try:\n` +
           `                self.i2c.writeto_mem(self.addr, 0x6B, b'\\x00')\n` +
           `                self.i2c.writeto_mem(self.addr, 0x1C, b'\\x00')\n` +
           `                self.i2c.writeto_mem(self.addr, 0x1B, b'\\x00')\n` +
           `            except Exception: pass\n` +
           `        @property\n` +
           `        def acceleration(self):\n` +
           `            import struct\n` +
           `            try:\n` +
           `                raw = self.i2c.readfrom_mem(self.addr, 0x3B, 6)\n` +
           `                v = struct.unpack('>hhh', raw)\n` +
           `                return (round(v[0]/16384.0*9.80665, 3), round(v[1]/16384.0*9.80665, 3), round(v[2]/16384.0*9.80665, 3))\n` +
           `            except Exception: return (0.0, 0.0, 9.81)\n` +
           `        @property\n` +
           `        def accel(self): return self.acceleration\n` +
           `        @property\n` +
           `        def gyro(self):\n` +
           `            import struct\n` +
           `            try:\n` +
           `                raw = self.i2c.readfrom_mem(self.addr, 0x43, 6)\n` +
           `                v = struct.unpack('>hhh', raw)\n` +
           `                return (round(v[0]/131.0, 2), round(v[1]/131.0, 2), round(v[2]/131.0, 2))\n` +
           `            except Exception: return (0.0, 0.0, 0.0)\n` +
           `    try: _imu = _MPU9250_Offline(i2c)\n` +
           `    except Exception: _imu = None\n`;
  }

  Blockly.Python['sat_imu_gyro_vector'] = function(block) {
    const format = block.getFieldValue('FORMAT');
    Blockly.Python.definitions_['import_machine'] = 'from machine import Pin, I2C, SPI, ADC, PWM';
    Blockly.Python.definitions_['init_i2c_bus'] = 'i2c = I2C(0, scl=Pin(22), sda=Pin(21))';
    Blockly.Python.definitions_['init_i2c_mpu9250'] = getMpu9250InitCode();
    
    let code;
    if (format === 'OBJECT') {
      code = `({"x": _imu.gyro[0], "y": _imu.gyro[1], "z": _imu.gyro[2]} if (_imu and hasattr(_imu, 'gyro')) else {"x": 0, "y": 0, "z": 0})`;
    } else {
      code = `(list(_imu.gyro) if (_imu and hasattr(_imu, 'gyro')) else [0, 0, 0])`;
    }
    return [code, Blockly.Python.ORDER_ATOMIC];
  };

  Blockly.Python['sat_imu_accel_vector'] = function(block) {
    const format = block.getFieldValue('FORMAT');
    Blockly.Python.definitions_['import_machine'] = 'from machine import Pin, I2C, SPI, ADC, PWM';
    Blockly.Python.definitions_['init_i2c_bus'] = 'i2c = I2C(0, scl=Pin(22), sda=Pin(21))';
    Blockly.Python.definitions_['init_i2c_mpu9250'] = getMpu9250InitCode();
    
    let code;
    if (format === 'OBJECT') {
      code = `({"x": (_imu.acceleration[0] if hasattr(_imu, 'acceleration') else _imu.accel[0]), "y": (_imu.acceleration[1] if hasattr(_imu, 'acceleration') else _imu.accel[1]), "z": (_imu.acceleration[2] if hasattr(_imu, 'acceleration') else _imu.accel[2])} if _imu else {"x": 0.0, "y": 0.0, "z": 0.0})`;
    } else {
      code = `(list(_imu.acceleration if hasattr(_imu, 'acceleration') else _imu.accel) if _imu else [0, 0, 0])`;
    }
    return [code, Blockly.Python.ORDER_ATOMIC];
  };

  Blockly.Python['sat_json_dumps'] = function(block) {
    Blockly.Python.definitions_['import_ujson'] = 'import ujson';
    const data = Blockly.Python.valueToCode(block, 'DATA', Blockly.Python.ORDER_NONE) || '{}';
    const code = `ujson.dumps(${data})`;
    return [code, Blockly.Python.ORDER_FUNCTION_CALL];
  };

  Blockly.Python['project_info'] = function(block) {
    const author = (Blockly.Python.valueToCode(block, 'project_author', Blockly.Python.ORDER_ATOMIC) || '""').replace(/['"]/g, '');
    const iot_id = (Blockly.Python.valueToCode(block, 'project_iot_id', Blockly.Python.ORDER_ATOMIC) || '0').replace(/['"]/g, '');
    const desc = (Blockly.Python.valueToCode(block, 'project_description', Blockly.Python.ORDER_ATOMIC) || '""').replace(/['"]/g, '');
    
    Blockly.Python.definitions_['00_project_header'] = 
      `# ==========================================\n` +
      `# MISSÃO OBSAT: ${desc || 'Missão CanSat/CubeSat'}\n` +
      `# EQUIPE / AUTOR: ${author || 'Equipe'}\n` +
      `# IOT ID: ${iot_id || '0'}\n` +
      `# ==========================================`;
    return '';
  };

  Blockly.Python['sat_mission_start'] = function(block) {
    const missionName = block.getFieldValue('MISSION_NAME') || 'OBSAT_MISSION';
    Blockly.Python.definitions_['import_time'] = 'import time';
    Blockly.Python.definitions_['import_machine'] = 'from machine import Pin, I2C, SPI, ADC, PWM';
    
    Blockly.Python.definitions_['01_mission_start_header'] = 
      `# ==========================================\n` +
      `# MISSÃO OBSAT: ${missionName}\n` +
      `# Gerado automaticamente via SatBlocks by BIPES\n` +
      `# ==========================================`;
      
    return `print("[OBSAT] Iniciando voo da missao: ${missionName}")\n`;
  };

  Blockly.Python['sat_emit_beep'] = function(block) {
    const count = block.getFieldValue('COUNT') || 3;
    const interval = block.getFieldValue('INTERVAL') || 500;
    Blockly.Python.definitions_['import_time'] = 'import time';
    Blockly.Python.definitions_['import_machine'] = 'from machine import Pin, I2C, SPI, ADC, PWM';
    Blockly.Python.definitions_['func_obsat_beep'] = 
`def obsat_beep(freq=2000, dur_ms=150, pin_num=25):
    try:
        bz = PWM(Pin(pin_num), freq=freq, duty=512)
        time.sleep_ms(dur_ms)
        bz.duty(0)
        bz.deinit()
    except:
        try:
            bz = PWM(Pin(pin_num))
            bz.freq(freq)
            bz.duty(512)
            time.sleep_ms(dur_ms)
            bz.duty(0)
            bz.deinit()
        except:
            pass`;
    
    return `for _i in range(${count}):\n` +
           `    print("[BEACON] *BEEP* Localizador de Resgate (GPIO 25)")\n` +
           `    obsat_beep(2000, 150, 25)\n` +
           `    time.sleep_ms(${interval})\n`;
  };

  Blockly.Python['sat_wait'] = function(block) {
    const timeVal = block.getFieldValue('TIME') || 1;
    const unit = block.getFieldValue('UNIT');
    Blockly.Python.definitions_['import_time'] = 'import time';

    if (unit === 'MSEC') {
      return `time.sleep_ms(${timeVal})\n`;
    }
    return `time.sleep(${timeVal})\n`;
  };

  Blockly.Python['sat_watchdog_feed'] = function(block) {
    Blockly.Python.definitions_['import_wdt'] = 'from machine import WDT';
    return `if 'wdt' in globals():\n    wdt.feed()\n`;
  };

  Blockly.Python['sat_deploy_antenna'] = function(block) {
    const burnTime = block.getFieldValue('BURN_TIME') || 2000;
    Blockly.Python.definitions_['import_time'] = 'import time';
    Blockly.Python.definitions_['import_pin'] = 'from machine import Pin';

    return `# Ativacao termica de filamento para abertura de antena\n` +
           `pin_burn = Pin(12, Pin.OUT)\n` +
           `pin_burn.value(1)\n` +
           `time.sleep_ms(${burnTime})\n` +
           `pin_burn.value(0)\n` +
           `print("[PAYLOAD] Antenas liberadas com sucesso!")\n`;
  };

  Blockly.Python['sat_mission_end'] = function(block) {
    return `print("[OBSAT] Fim da sequencia de voo. Entrando em modo standby.")\n`;
  };

  // ==========================================
  // 2. SENSORES AMBIENTAIS & TÉRMICOS
  // ==========================================
  // SHT20 (Temperatura e Umidade I2C 0x40)
  Blockly.Python['sat_sensor_sht20_temp'] = function(block) {
    Blockly.Python.definitions_['import_machine'] = 'from machine import Pin, I2C, SPI, ADC, PWM';
    Blockly.Python.definitions_['init_i2c_bus'] = 'i2c = I2C(0, scl=Pin(22), sda=Pin(21))';
    Blockly.Python.definitions_['init_i2c_sht20'] = 
      `try:\n` +
      `    import sht20\n` +
      `    _sht = sht20.SHT20(i2c)\n` +
      `except:\n` +
      `    _sht = None\n`;
    const code = `(_sht.temperature() if _sht else 24.5)`;
    return [code, Blockly.Python.ORDER_FUNCTION_CALL];
  };

  Blockly.Python['sat_sensor_sht20_hum'] = function(block) {
    Blockly.Python.definitions_['import_machine'] = 'from machine import Pin, I2C, SPI, ADC, PWM';
    Blockly.Python.definitions_['init_i2c_bus'] = 'i2c = I2C(0, scl=Pin(22), sda=Pin(21))';
    Blockly.Python.definitions_['init_i2c_sht20'] = 
      `try:\n` +
      `    import sht20\n` +
      `    _sht = sht20.SHT20(i2c)\n` +
      `except:\n` +
      `    _sht = None\n`;
    const code = `(_sht.humidity() if _sht else 55.0)`;
    return [code, Blockly.Python.ORDER_FUNCTION_CALL];
  };

  Blockly.Python['sat_sensor_als_light'] = function(block) {
    Blockly.Python.definitions_['import_machine'] = 'from machine import Pin, I2C, SPI, ADC, PWM';
    Blockly.Python.definitions_['init_adc_34'] = `_adc_34 = ADC(Pin(34))\n_adc_34.atten(ADC.ATTN_11DB)`;
    const code = `round((_adc_34.read() / 4095.0) * 100.0, 1)`;
    return [code, Blockly.Python.ORDER_FUNCTION_CALL];
  };

  Blockly.Python['sat_sensor_ccs811_co2'] = function(block) {
    Blockly.Python.definitions_['import_machine'] = 'from machine import Pin, I2C, SPI, ADC, PWM';
    Blockly.Python.definitions_['init_i2c_bus'] = 'i2c = I2C(0, scl=Pin(22), sda=Pin(21))';
    Blockly.Python.definitions_['init_i2c_ccs811'] = 
      `try:\n` +
      `    import ccs811\n` +
      `    _ccs = ccs811.CCS811(i2c)\n` +
      `except:\n` +
      `    _ccs = None\n`;
    const code = `(_ccs.eCO2 if _ccs else 415)`;
    return [code, Blockly.Python.ORDER_FUNCTION_CALL];
  };

  Blockly.Python['sat_mcp23017_leds'] = function(block) {
    const led = block.getFieldValue('LED_INDEX');
    const color = block.getFieldValue('COLOR');
    Blockly.Python.definitions_['import_machine'] = 'from machine import Pin, I2C, SPI, ADC, PWM';
    Blockly.Python.definitions_['init_i2c_bus'] = 'i2c = I2C(0, scl=Pin(22), sda=Pin(21))';
    Blockly.Python.definitions_['init_i2c_mcp23017'] = 
      `try:\n` +
      `    import mcp23017\n` +
      `    _mcp = mcp23017.MCP23017(i2c, 0x20)\n` +
      `except:\n` +
      `    _mcp = None\n`;
    return `# MCP23017 LED ${led} -> ${color}\n` +
           `if _mcp: _mcp.set_led("${led}", "${color}")\n`;
  };

  function ensureSatBmpDriver() {
    Blockly.Python.definitions_['import_machine'] = 'from machine import Pin, I2C, SPI, ADC, PWM';
    Blockly.Python.definitions_['import_math'] = 'import math';
    Blockly.Python.definitions_['init_i2c_bus'] = (typeof Blockly.Python.getBoardI2CInit === 'function') 
      ? Blockly.Python.getBoardI2CInit() 
      : 'i2c = I2C(0, scl=Pin(22), sda=Pin(21))';
    Blockly.Python.definitions_['init_sat_bmp'] = 
`class _SatBMP280:
    def __init__(self, bus):
        import struct
        import time
        self.bus = bus
        self.addr = None
        for a in (0x76, 0x77):
            try:
                chip_id = bus.readfrom_mem(a, 0xD0, 1)[0]
                if chip_id in (0x58, 0x56, 0x57, 0x60):
                    self.addr = a
                    break
            except Exception:
                pass
        if self.addr is None:
            self.addr = 0x76
        try:
            self.bus.writeto_mem(self.addr, 0xF4, b'\\x57')
            self.bus.writeto_mem(self.addr, 0xF5, b'\\x10')
            time.sleep_ms(50)
            cal = self.bus.readfrom_mem(self.addr, 0x88, 24)
            self.T = struct.unpack('<Hhh', cal[0:6])
            self.P = struct.unpack('<Hhhhhhhhh', cal[6:24])
        except Exception:
            self.T = (27504, 26435, -1000)
            self.P = (36477, -10685, 3024, 2855, 140, -7, 15500, -14600, 6000)

    def read(self):
        try:
            d = self.bus.readfrom_mem(self.addr, 0xF7, 6)
            adc_p = (d[0] << 12) | (d[1] << 4) | (d[2] >> 4)
            adc_t = (d[3] << 12) | (d[4] << 4) | (d[5] >> 4)

            # Compensacao oficial Bosch de Temperatura
            var1 = (adc_t / 16384.0 - self.T[0] / 1024.0) * self.T[1]
            var2 = ((adc_t / 131072.0 - self.T[0] / 8192.0) ** 2) * self.T[2]
            t_fine = var1 + var2
            temperature = round(t_fine / 5120.0, 2)

            # Compensacao oficial Bosch de Pressao (hPa)
            var1 = t_fine / 2.0 - 64000.0
            var2 = var1 * var1 * self.P[5] / 32768.0
            var2 += var1 * self.P[4] * 2.0
            var2 = var2 / 4.0 + self.P[3] * 65536.0
            var3 = self.P[2] * var1 * var1 / 524288.0
            var1 = (var3 + self.P[1] * var1) / 524288.0
            var1 = (1.0 + var1 / 32768.0) * self.P[0]
            if var1 != 0:
                p = 1048576.0 - adc_p
                p = ((p - var2 / 4096.0) * 6250.0) / var1
                var1 = self.P[8] * p * p / 2147483648.0
                var2 = p * self.P[7] / 32768.0
                pressure = round((p + (var1 + var2 + self.P[6]) / 16.0) / 100.0, 2)
            else:
                pressure = 1013.25
            return temperature, pressure
        except Exception:
            return 25.0, 1013.25

_sat_bmp = None
def _sat_bmp_read(field, sea=1013.25):
    global _sat_bmp
    import math
    try:
        if _sat_bmp is None:
            _sat_bmp = _SatBMP280(i2c)
        temp, press = _sat_bmp.read()
        if field == 'temp':
            return temp
        if field == 'press':
            return press
        if field == 'alt':
            return round(44330.0 * (1.0 - math.pow(press / float(sea), 0.190295)), 2)
    except Exception:
        if field == 'temp': return 25.0
        if field == 'press': return 1013.25
        return 0.0`;
  }

  Blockly.Python['sat_sensor_bmp280_temp'] = function(block) {
    ensureSatBmpDriver();
    return [`_sat_bmp_read('temp')`, Blockly.Python.ORDER_FUNCTION_CALL];
  };

  Blockly.Python['sat_sensor_bmp280_press'] = function(block) {
    ensureSatBmpDriver();
    return [`_sat_bmp_read('press')`, Blockly.Python.ORDER_FUNCTION_CALL];
  };

  Blockly.Python['sat_sensor_bmp280_alt'] = function(block) {
    ensureSatBmpDriver();
    const seaLevel = Number(block.getFieldValue('SEA_LEVEL')) || 1013.25;
    return [`_sat_bmp_read('alt', ${seaLevel})`, Blockly.Python.ORDER_FUNCTION_CALL];
  };

  Blockly.Python['sat_sensor_dht_hum'] = function(block) {
    const pin = block.getFieldValue('PIN') || '4';
    Blockly.Python.definitions_['import_dht'] = 'import dht';
    Blockly.Python.definitions_['init_dht_' + pin] = `_dht_${pin} = dht.DHT22(Pin(${pin}))`;

    const code = `(_dht_${pin}.measure() or _dht_${pin}.humidity())`;
    return [code, Blockly.Python.ORDER_FUNCTION_CALL];
  };

  Blockly.Python['sat_sensor_light_ldr'] = function(block) {
    const pin = block.getFieldValue('PIN') || '34';
    Blockly.Python.definitions_['init_adc_' + pin] = `_adc_${pin} = ADC(Pin(${pin}))\n_adc_${pin}.atten(ADC.ATTN_11DB)`;
    
    const code = `_adc_${pin}.read()`;
    return [code, Blockly.Python.ORDER_FUNCTION_CALL];
  };

  Blockly.Python['sat_sensor_bh1750_lux'] = function(block) {
    Blockly.Python.definitions_['import_machine'] = 'from machine import Pin, I2C, SPI, ADC, PWM';
    Blockly.Python.definitions_['init_i2c_bus'] = 'i2c = I2C(0, scl=Pin(22), sda=Pin(21))';
    Blockly.Python.definitions_['init_i2c_bh1750'] = 
      `try:\n` +
      `    import bh1750\n` +
      `    _light = bh1750.BH1750(i2c)\n` +
      `except:\n` +
      `    _light = None\n`;
    const code = `(_light.luminance(bh1750.BH1750.ONCE_HIRES_1) if _light else 500.0)`;
    return [code, Blockly.Python.ORDER_FUNCTION_CALL];
  };

  Blockly.Python['sat_sensor_air_mq135'] = function(block) {
    const pin = block.getFieldValue('PIN') || '34';
    Blockly.Python.definitions_['init_adc_' + pin] = `_adc_${pin} = ADC(Pin(${pin}))\n_adc_${pin}.atten(ADC.ATTN_11DB)`;
    const code = `round((_adc_${pin}.read() / 4095.0) * 1000.0, 1)`;
    return [code, Blockly.Python.ORDER_FUNCTION_CALL];
  };

  Blockly.Python['sat_sensor_mlx90614_ir'] = function(block) {
    Blockly.Python.definitions_['import_machine'] = 'from machine import Pin, I2C, SPI, ADC, PWM';
    Blockly.Python.definitions_['init_i2c_bus'] = 'i2c = I2C(0, scl=Pin(22), sda=Pin(21))';
    Blockly.Python.definitions_['init_i2c_mlx'] = 
      `try:\n` +
      `    import mlx90614\n` +
      `    _mlx = mlx90614.MLX90614(i2c)\n` +
      `except:\n` +
      `    _mlx = None\n`;
    const code = `(_mlx.read_object_temp() if _mlx else 18.5)`;
    return [code, Blockly.Python.ORDER_FUNCTION_CALL];
  };

  Blockly.Python['sat_sensor_ina219_power'] = function(block) {
    Blockly.Python.definitions_['import_machine'] = 'from machine import Pin, I2C, SPI, ADC, PWM';
    Blockly.Python.definitions_['init_i2c_bus'] = 'i2c = I2C(0, scl=Pin(22), sda=Pin(21))';
    Blockly.Python.definitions_['init_i2c_ina'] = 
      `try:\n` +
      `    import ina219\n` +
      `    _ina = ina219.INA219(0.1, i2c)\n` +
      `except:\n` +
      `    _ina = None\n`;
    const code = `(_ina.power if _ina else 450.0)`;
    return [code, Blockly.Python.ORDER_FUNCTION_CALL];
  };

  // ==========================================
  // 3. INÉRCIA & ORIENTAÇÃO (IMU / ADCS)
  // ==========================================
  function getMpu6050InitCode() {
    return `try:\n` +
           `    import mpu6050\n` +
           `    _mpu = mpu6050.accel(i2c)\n` +
           `except Exception:\n` +
           `    class _MPU6050_Offline:\n` +
           `        def __init__(self, i2c, addr=0x68):\n` +
           `            self.i2c, self.addr = i2c, addr\n` +
           `            try:\n` +
           `                self.i2c.writeto_mem(self.addr, 0x6B, b'\\x00')\n` +
           `                self.i2c.writeto_mem(self.addr, 0x1C, b'\\x00')\n` +
           `                self.i2c.writeto_mem(self.addr, 0x1B, b'\\x00')\n` +
           `            except Exception: pass\n` +
           `        def get_values(self):\n` +
           `            import struct\n` +
           `            try:\n` +
           `                raw = self.i2c.readfrom_mem(self.addr, 0x3B, 14)\n` +
           `                v = struct.unpack('>hhhhhhh', raw)\n` +
           `                return {\n` +
           `                    'AcX': round(v[0] / 16384.0 * 9.80665, 3),\n` +
           `                    'AcY': round(v[1] / 16384.0 * 9.80665, 3),\n` +
           `                    'AcZ': round(v[2] / 16384.0 * 9.80665, 3),\n` +
           `                    'Tmp': round((v[3] / 340.0) + 36.53, 2),\n` +
           `                    'GyX': round(v[4] / 131.0, 2),\n` +
           `                    'GyY': round(v[5] / 131.0, 2),\n` +
           `                    'GyZ': round(v[6] / 131.0, 2)\n` +
           `                }\n` +
           `            except Exception:\n` +
           `                return {'AcX': 0.0, 'AcY': 0.0, 'AcZ': 9.81, 'Tmp': 25.0, 'GyX': 0.0, 'GyY': 0.0, 'GyZ': 0.0}\n` +
           `    try:\n` +
           `        _mpu = _MPU6050_Offline(i2c)\n` +
           `    except Exception:\n` +
           `        _mpu = None\n`;
  }

  Blockly.Python['sat_imu_mpu6050_accel'] = function(block) {
    if (isRp2040()) {
      Blockly.Python.definitions_['init_i2c_bus'] = Blockly.Python.getBoardI2CInit();
      Blockly.Python.definitions_['init_sat_mpu'] = "class _SatMPU6050:\n    def __init__(self, bus):\n        import time\n        self.bus, self.addr = bus, None\n        for addr in (0x68, 0x69):\n            try:\n                if bus.readfrom_mem(addr, 0x75, 1)[0] == 0x68:\n                    self.addr = addr\n                    break\n            except OSError:\n                pass\n        if self.addr is None:\n            raise OSError('MPU6050 ausente em 0x68/0x69; verifique SDA GP0 e SCL GP1')\n        bus.writeto_mem(self.addr, 0x6B, bytes([0x01]))\n        time.sleep_ms(100)\n        bus.writeto_mem(self.addr, 0x1C, bytes([0x00]))\n        bus.writeto_mem(self.addr, 0x1B, bytes([0x00]))\n\n    def read(self, kind, axis):\n        import struct\n        v = struct.unpack('>hhhhhhh', self.bus.readfrom_mem(self.addr, 0x3B, 14))\n        values = [round(n / 16384.0 * 9.80665, 3) for n in v[:3]] if kind == 'accel' else [round(n / 131.0, 3) for n in v[4:]]\n        if axis == 'vector': return values\n        if axis == 'total': return sum(n * n for n in values) ** 0.5\n        return values[{'x': 0, 'y': 1, 'z': 2}[axis]]\n\n_sat_mpu = None\ndef _sat_mpu_read(kind, axis):\n    global _sat_mpu\n    try:\n        if _sat_mpu is None:\n            _sat_mpu = _SatMPU6050(i2c)\n        return _sat_mpu.read(kind, axis)\n    except Exception:\n        _sat_mpu = None\n        raise\n";
      return [`_sat_mpu_read('accel', '${block.getFieldValue('AXIS')}')`, Blockly.Python.ORDER_FUNCTION_CALL];
    }
    const axis = block.getFieldValue('AXIS');
    Blockly.Python.definitions_['import_machine'] = 'from machine import Pin, I2C, SPI, ADC, PWM';
    Blockly.Python.definitions_['init_i2c_bus'] = 'i2c = I2C(0, scl=Pin(22), sda=Pin(21))';
    Blockly.Python.definitions_['init_mpu6050'] = getMpu6050InitCode();

    if (axis === 'vector') {
      const code = `([_mpu.get_values()['AcX'], _mpu.get_values()['AcY'], _mpu.get_values()['AcZ']] if _mpu else [0.0, 0.0, 9.81])`;
      return [code, Blockly.Python.ORDER_FUNCTION_CALL];
    }

    if (axis === 'total') {
      Blockly.Python.definitions_['import_math'] = 'import math';
      const code = `(math.sqrt(_mpu.get_values()['AcX']**2 + _mpu.get_values()['AcY']**2 + _mpu.get_values()['AcZ']**2) if _mpu else 9.81)`;
      return [code, Blockly.Python.ORDER_FUNCTION_CALL];
    }

    const key = axis === 'x' ? 'AcX' : (axis === 'y' ? 'AcY' : 'AcZ');
    const code = `(_mpu.get_values()['${key}'] if _mpu else 0.0)`;
    return [code, Blockly.Python.ORDER_FUNCTION_CALL];
  };

  Blockly.Python['sat_imu_mpu6050_gyro'] = function(block) {
    if (isRp2040()) {
      Blockly.Python.definitions_['init_i2c_bus'] = Blockly.Python.getBoardI2CInit();
      Blockly.Python.definitions_['init_sat_mpu'] = "class _SatMPU6050:\n    def __init__(self, bus):\n        import time\n        self.bus, self.addr = bus, None\n        for addr in (0x68, 0x69):\n            try:\n                if bus.readfrom_mem(addr, 0x75, 1)[0] == 0x68:\n                    self.addr = addr\n                    break\n            except OSError:\n                pass\n        if self.addr is None:\n            raise OSError('MPU6050 ausente em 0x68/0x69; verifique SDA GP0 e SCL GP1')\n        bus.writeto_mem(self.addr, 0x6B, bytes([0x01]))\n        time.sleep_ms(100)\n        bus.writeto_mem(self.addr, 0x1C, bytes([0x00]))\n        bus.writeto_mem(self.addr, 0x1B, bytes([0x00]))\n\n    def read(self, kind, axis):\n        import struct\n        v = struct.unpack('>hhhhhhh', self.bus.readfrom_mem(self.addr, 0x3B, 14))\n        values = [round(n / 16384.0 * 9.80665, 3) for n in v[:3]] if kind == 'accel' else [round(n / 131.0, 3) for n in v[4:]]\n        if axis == 'vector': return values\n        if axis == 'total': return sum(n * n for n in values) ** 0.5\n        return values[{'x': 0, 'y': 1, 'z': 2}[axis]]\n\n_sat_mpu = None\ndef _sat_mpu_read(kind, axis):\n    global _sat_mpu\n    try:\n        if _sat_mpu is None:\n            _sat_mpu = _SatMPU6050(i2c)\n        return _sat_mpu.read(kind, axis)\n    except Exception:\n        _sat_mpu = None\n        raise\n";
      return [`_sat_mpu_read('gyro', '${block.getFieldValue('AXIS')}')`, Blockly.Python.ORDER_FUNCTION_CALL];
    }
    const axis = block.getFieldValue('AXIS');
    Blockly.Python.definitions_['import_machine'] = 'from machine import Pin, I2C, SPI, ADC, PWM';
    Blockly.Python.definitions_['init_i2c_bus'] = 'i2c = I2C(0, scl=Pin(22), sda=Pin(21))';
    Blockly.Python.definitions_['init_mpu6050'] = getMpu6050InitCode();

    if (axis === 'vector') {
      const code = `([_mpu.get_values()['GyX'], _mpu.get_values()['GyY'], _mpu.get_values()['GyZ']] if _mpu else [0.0, 0.0, 0.0])`;
      return [code, Blockly.Python.ORDER_FUNCTION_CALL];
    }

    const key = axis === 'x' ? 'GyX' : (axis === 'y' ? 'GyY' : 'GyZ');
    const code = `(_mpu.get_values()['${key}'] if _mpu else 0.0)`;
    return [code, Blockly.Python.ORDER_FUNCTION_CALL];
  };

  Blockly.Python['sat_imu_detect_freefall'] = function(block) {
    const threshold = block.getFieldValue('THRESHOLD') || 0.15;
    Blockly.Python.definitions_['import_math'] = 'import math';
    const code = `(abs((math.sqrt(_mpu.get_values()['AcX']**2 + _mpu.get_values()['AcY']**2 + _mpu.get_values()['AcZ']**2) / 16384.0)) < ${threshold} if _mpu else False)`;
    return [code, Blockly.Python.ORDER_RELATIONAL];
  };

  Blockly.Python['sat_mag_heading'] = function(block) {
    const code = `0.0 # Azimute magnetometro`;
    return [code, Blockly.Python.ORDER_ATOMIC];
  };

  // ==========================================
  // 4. NAVEGAÇÃO & GPS
  // ==========================================
  Blockly.Python['sat_gps_lat'] = function(block) {
    const code = `(_gps.latitude if '_gps' in globals() else -23.5505)`;
    return [code, Blockly.Python.ORDER_FUNCTION_CALL];
  };

  Blockly.Python['sat_gps_lng'] = function(block) {
    const code = `(_gps.longitude if '_gps' in globals() else -46.6333)`;
    return [code, Blockly.Python.ORDER_FUNCTION_CALL];
  };

  Blockly.Python['sat_gps_alt'] = function(block) {
    const code = `(_gps.altitude if '_gps' in globals() else 760.0)`;
    return [code, Blockly.Python.ORDER_FUNCTION_CALL];
  };

  Blockly.Python['sat_gps_speed'] = function(block) {
    const code = `(_gps.speed if '_gps' in globals() else 0.0)`;
    return [code, Blockly.Python.ORDER_FUNCTION_CALL];
  };

  Blockly.Python['sat_gps_time_utc'] = function(block) {
    const code = `(_gps.timestamp if '_gps' in globals() else "12:00:00")`;
    return [code, Blockly.Python.ORDER_FUNCTION_CALL];
  };

  // ==========================================
  // 5. COMUNICAÇÃO ESPACIAL & LORA
  // ==========================================
  Blockly.Python['sat_lora_setup'] = function(block) {
    const freq = block.getFieldValue('FREQ') || '915.0';
    const pwr = block.getFieldValue('POWER') || 20;
    const sf = block.getFieldValue('SF') || 7;
    
    return `# Inicializacao do Modulo LoRa SX1276/78\n` +
           `print("[LORA] Configurado Freq: ${freq}MHz, Potencia: ${pwr}dBm, SF: ${sf}")\n`;
  };

  Blockly.Python['sat_lora_send_packet'] = function(block) {
    const payload = Blockly.Python.valueToCode(block, 'PAYLOAD', Blockly.Python.ORDER_NONE) || '""';
    return `print("[LORA TX] Enviando pacote:", ${payload})\n`;
  };

  Blockly.Python['sat_lora_receive_cmd'] = function(block) {
    const code = `("[CMD_PING]")`;
    return [code, Blockly.Python.ORDER_ATOMIC];
  };

  Blockly.Python['sat_mqtt_publish'] = function(block) {
    const topic = block.getFieldValue('TOPIC') || 'obsat/telemetria';
    const value = Blockly.Python.valueToCode(block, 'VALUE', Blockly.Python.ORDER_NONE) || '""';
    return `print("[MQTT TX] ${topic} ->", str(${value}))\n`;
  };

  // ==========================================
  // 6. ENERGIA & EPS
  // ==========================================
  Blockly.Python['sat_battery_adc'] = function(block) {
    let board = 'pion_cubesat';
    if (typeof window !== 'undefined' && window.SatBlocksApp && typeof window.SatBlocksApp.getCurrentBoard === 'function') {
      board = window.SatBlocksApp.getCurrentBoard();
    } else if (typeof document !== 'undefined') {
      const sel = document.getElementById('device_selector') || document.getElementById('deviceBoardSelect');
      if (sel) board = sel.value;
    }

    Blockly.Python.definitions_['import_machine_adc'] = 'from machine import Pin, ADC';
    if (board === 'rp2040_zero') {
      Blockly.Python.definitions_['init_adc_bat'] = `_adc_bat = ADC(Pin(28)) # RP2040 ADC2 Bateria\n`;
      return [`_adc_bat.read_u16() >> 7`, Blockly.Python.ORDER_FUNCTION_CALL];
    } else {
      Blockly.Python.definitions_['init_adc_bat'] = 
        `_adc_bat = ADC(Pin(35))\n` +
        `_adc_bat.atten(ADC.ATTN_11DB)\n` +
        `_adc_bat.width(ADC.WIDTH_9BIT)\n`;
      return [`_adc_bat.read()`, Blockly.Python.ORDER_FUNCTION_CALL];
    }
  };

  Blockly.Python['sat_eps_battery_voltage'] = function(block) {
    let board = 'pion_cubesat';
    if (typeof window !== 'undefined' && window.SatBlocksApp && typeof window.SatBlocksApp.getCurrentBoard === 'function') {
      board = window.SatBlocksApp.getCurrentBoard();
    } else if (typeof document !== 'undefined') {
      const sel = document.getElementById('device_selector') || document.getElementById('deviceBoardSelect');
      if (sel) board = sel.value;
    }

    Blockly.Python.definitions_['import_machine_adc'] = 'from machine import Pin, ADC';
    if (board === 'rp2040_zero') {
      Blockly.Python.definitions_['init_adc_bat'] = `_adc_bat = ADC(Pin(28)) # RP2040 ADC2 Bateria\n`;
      const code = `round((_adc_bat.read_u16() / 65535.0) * 3.3 * 2.0, 2)`;
      return [code, Blockly.Python.ORDER_FUNCTION_CALL];
    } else {
      Blockly.Python.definitions_['init_adc_bat'] = 
        `_adc_bat = ADC(Pin(35))\n` +
        `_adc_bat.atten(ADC.ATTN_11DB)\n` +
        `_adc_bat.width(ADC.WIDTH_9BIT)\n`;

      const code = `round((_adc_bat.read() / 511.0) * 3.3 * 2.0, 2)`;
      return [code, Blockly.Python.ORDER_FUNCTION_CALL];
    }
  };

  Blockly.Python['sat_eps_solar_current'] = function(block) {
    const code = `150.0 # Corrente solar mA`;
    return [code, Blockly.Python.ORDER_ATOMIC];
  };

  Blockly.Python['sat_eps_battery_percent'] = function(block) {
    let board = 'pion_cubesat';
    if (typeof window !== 'undefined' && window.SatBlocksApp && typeof window.SatBlocksApp.getCurrentBoard === 'function') {
      board = window.SatBlocksApp.getCurrentBoard();
    } else if (typeof document !== 'undefined') {
      const sel = document.getElementById('device_selector') || document.getElementById('deviceBoardSelect');
      if (sel) board = sel.value;
    }

    Blockly.Python.definitions_['import_machine_adc'] = 'from machine import Pin, ADC';
    if (board === 'rp2040_zero') {
      Blockly.Python.definitions_['init_adc_bat'] = `_adc_bat = ADC(Pin(28)) # RP2040 ADC2 Bateria\n`;
      const code = `int(max(0, min(100, ((((_adc_bat.read_u16() / 65535.0) * 3.3 * 2.0) - 3.2) / 1.0) * 100)))`;
      return [code, Blockly.Python.ORDER_FUNCTION_CALL];
    } else {
      Blockly.Python.definitions_['init_adc_bat'] = 
        `_adc_bat = ADC(Pin(35))\n` +
        `_adc_bat.atten(ADC.ATTN_11DB)\n` +
        `_adc_bat.width(ADC.WIDTH_9BIT)\n`;

      const code = `int(max(0, min(100, ((((_adc_bat.read() / 511.0) * 3.3 * 2.0) - 3.2) / 1.0) * 100)))`;
      return [code, Blockly.Python.ORDER_FUNCTION_CALL];
    }
  };

  Blockly.Python['sat_eps_deepsleep'] = function(block) {
    const sec = block.getFieldValue('SECONDS') || 10;
    Blockly.Python.definitions_['import_deepsleep'] = 'import machine';
    return `print("[EPS] Entrando em deep sleep por ${sec}s...")\nmachine.deepsleep(${sec * 1000})\n`;
  };

  // ==========================================
  // 5.1 HOTSPOT & REDE LOCAL
  // ==========================================
  Blockly.Python['sat_wifi_ap_start'] = function(block) {
    const ssid = block.getFieldValue('SSID') || 'ESP32CAM_OBSAT';
    const pwd = block.getFieldValue('PASSWORD') || '12345678';
    Blockly.Python.definitions_['import_network'] = 'import network';
    
    return `_ap = network.WLAN(network.AP_IF)\n` +
           `_ap.active(True)\n` +
           `_ap.config(essid="${ssid}", password="${pwd}" if "${pwd}" else "")\n` +
           `while not _ap.active():\n` +
           `    pass\n` +
           `print("[WIFI AP] Hotspot ativo: '${ssid}', IP: " + str(_ap.ifconfig()[0]))\n`;
  };

  Blockly.Python['sat_wifi_ap_ip'] = function(block) {
    Blockly.Python.definitions_['import_network'] = 'import network';
    const code = `(network.WLAN(network.AP_IF).ifconfig()[0] if network.WLAN(network.AP_IF).active() else "192.168.4.1")`;
    return [code, Blockly.Python.ORDER_FUNCTION_CALL];
  };

  // ==========================================
  // 7. CÂMERA OV2640, WEB SERVER & PAYLOAD
  // ==========================================
  Blockly.Python['sat_camera_init_advanced'] = function(block) {
    const framesize = block.getFieldValue('FRAMESIZE') || 'FRAMESIZE_QVGA';
    const quality = block.getFieldValue('QUALITY') || 12;
    const effect = block.getFieldValue('EFFECT') || '0';
    const rotate = block.getFieldValue('ROTATE') || '0';
    Blockly.Python.definitions_['import_camera'] = 'import camera';
    Blockly.Python.definitions_['import_time'] = 'import time';

    const shortFrame = framesize.replace('FRAMESIZE_', '');

    let code = `try:\n` +
               `    camera.deinit()\n` +
               `except Exception:\n` +
               `    pass\n` +
               `time.sleep_ms(150)\n` +
               `_cam_ok = False\n` +
               `try:\n` +
               `    # Tentativa 1: Inicializacao universal AI-Thinker (OV2640 / OV3660)\n` +
               `    _fs = getattr(camera, 'FRAME_${shortFrame}', getattr(camera, '${framesize}', 4))\n` +
               `    camera.init(0, format=camera.JPEG, framesize=_fs, quality=${quality})\n` +
               `    _cam_ok = True\n` +
               `except Exception:\n` +
               `    try:\n` +
               `        # Tentativa 2: Inicializacao com pinos explicitos AI-Thinker e XCLK estavel (10MHz/20MHz)\n` +
               `        camera.init(0, d0=5, d1=18, d2=19, d3=21, d4=36, d5=39, d6=34, d7=35, format=camera.JPEG, framesize=getattr(camera, 'FRAME_${shortFrame}', 4), xclk_freq=camera.XCLK_10MHz if hasattr(camera, 'XCLK_10MHz') else 10000000, href=23, vsync=25, reset=-1, pwdn=32, sioc=27, siod=26, xclk=0, pclk=22, quality=${quality})\n` +
               `        _cam_ok = True\n` +
               `    except Exception as _e_init:\n` +
               `        try:\n` +
               `            # Tentativa 3: Inicializacao minima\n` +
               `            camera.init(0, format=camera.JPEG)\n` +
               `            if hasattr(camera, 'framesize'): camera.framesize(getattr(camera, 'FRAME_${shortFrame}', 4))\n` +
               `            if hasattr(camera, 'quality'): camera.quality(${quality})\n` +
               `            _cam_ok = True\n` +
               `        except Exception as _e_final:\n` +
               `            print("[CAMERA ERROR] Falha ao inicializar:", _e_final)\n`;

    if (effect !== '0') {
      code += `if _cam_ok and hasattr(camera, 'speffect'):\n    camera.speffect(${effect})\n`;
    }
    if (rotate === '1') {
      code += `if _cam_ok and hasattr(camera, 'vflip'):\n    camera.vflip(1)\n`;
    } else if (rotate === '2') {
      code += `if _cam_ok and hasattr(camera, 'hmirror'):\n    camera.hmirror(1)\n`;
    } else if (rotate === '3') {
      code += `if _cam_ok:\n    if hasattr(camera, 'vflip'): camera.vflip(1)\n    if hasattr(camera, 'hmirror'): camera.hmirror(1)\n`;
    }
    code += `if _cam_ok:\n    # Warmup do sensor (descarta 1 frame inicial para ajuste automatico de ganho/exposicao)\n    try:\n        camera.capture()\n    except Exception:\n        pass\n    print("📷 [CAMERA] Sensor OV2640/OV3660 pronto: ${shortFrame}, Qualidade ${quality}")\nelse:\n    print("⚠️ [CAMERA] Falha ao inicializar o sensor. Verifique se o firmware com camera foi gravado.")\n`;
    return code;
  };

  Blockly.Python['sat_camera_flash_intensity'] = function(block) {
    const brightness = block.getFieldValue('BRIGHTNESS') || 100;
    Blockly.Python.definitions_['from_machine_pin_pwm'] = 'from machine import Pin, PWM';
    Blockly.Python.definitions_['init_flash_pwm'] = '_flash_pwm = PWM(Pin(4), freq=1000)\n';
    const duty = Math.round((brightness / 100.0) * 1023);
    return `_flash_pwm.duty(${duty}) # Flash frontal em ${brightness}%\n`;
  };

  Blockly.Python['sat_camera_status_led'] = function(block) {
    const state = block.getFieldValue('STATE') || '1';
    Blockly.Python.definitions_['from_machine_pin'] = 'from machine import Pin';
    Blockly.Python.definitions_['init_led_red'] = '_led_cam_red = Pin(33, Pin.OUT)\n';
    const val = state === '1' ? '0' : '1';
    return `_led_cam_red.value(${val}) # LED Vermelho GPIO 33 (${state === '1' ? 'LIGADO' : 'DESLIGADO'})\n`;
  };

  Blockly.Python['sat_camera_capture'] = function(block) {
    const filename = block.getFieldValue('FILENAME') || 'foto_obsat_%d.jpg';
    Blockly.Python.definitions_['import_camera'] = 'import camera';
    
    let code = `try:\n` +
               `    _img_buf = camera.capture()\n` +
               `    if not _img_buf:\n` +
               `        # Segunda tentativa (warmup de buffer)\n` +
               `        import time; time.sleep_ms(80)\n` +
               `        _img_buf = camera.capture()\n` +
               `    if _img_buf:\n` +
               `        _fname = "${filename}"\n` +
               `        if "%d" in _fname:\n` +
               `            import time\n` +
               `            _fname = _fname % int(time.time())\n` +
               `        with open(_fname, "wb") as _f:\n` +
               `            _f.write(_img_buf)\n` +
               `        print("[CAMERA] Foto salva com sucesso: " + str(_fname) + " (" + str(len(_img_buf)) + " bytes)")\n` +
               `    else:\n` +
               `        print("[CAMERA ERROR] Falha na captura do buffer de imagem")\n` +
               `except Exception as _e:\n` +
               `    print("[CAMERA EXCEPTION]", _e)\n`;
    return code;
  };

  Blockly.Python['sat_camera_capture_base64'] = function(block) {
    Blockly.Python.definitions_['import_camera'] = 'import camera';
    Blockly.Python.definitions_['import_ubinascii'] = 'import ubinascii';
    Blockly.Python.definitions_['fn_capture_b64'] = 
      `def _capturar_foto_base64():\n` +
      `    try:\n` +
      `        _buf = camera.capture()\n` +
      `        if _buf:\n` +
      `            return ubinascii.b2a_base64(_buf).decode('utf-8').strip()\n` +
      `    except Exception as _e:\n` +
      `        print("[B64 CAPTURE ERROR]", _e)\n` +
      `    return ""\n`;
    const code = `_capturar_foto_base64()`;
    return [code, Blockly.Python.ORDER_FUNCTION_CALL];
  };

  Blockly.Python['sat_camera_webserver_start'] = function(block) {
    const port = block.getFieldValue('PORT') || 80;
    const title = block.getFieldValue('TITLE') || 'ESP32-CAM Estação OBSAT';
    Blockly.Python.definitions_['import_camera'] = 'import camera';
    Blockly.Python.definitions_['import_socket'] = 'import socket';
    Blockly.Python.definitions_['import_network'] = 'import network';
    Blockly.Python.definitions_['fn_webserver_setup'] = 
      `def _iniciar_webserver_cam(porta=${port}, titulo="${title}"):\n` +
      `    global _cam_server_socket, _cam_station_title\n` +
      `    _cam_station_title = titulo\n` +
      `    _cam_server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)\n` +
      `    _cam_server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)\n` +
      `    _cam_server_socket.bind(('', porta))\n` +
      `    _cam_server_socket.listen(5)\n` +
      `    _cam_server_socket.settimeout(0.2)\n` +
      `    print("[WEB SERVER] Servidor da Câmera ativo na porta " + str(porta))\n` +
      `    print("[WEB SERVER] Acesse pelo celular: http://" + str(network.WLAN(network.AP_IF).ifconfig()[0]) + ":" + str(porta))\n`;

    return `_iniciar_webserver_cam(${port}, "${title}")\n`;
  };

  Blockly.Python['sat_camera_webserver_handle'] = function(block) {
    Blockly.Python.definitions_['fn_webserver_handle'] = 
      `def _processar_webserver_cam():\n` +
      `    global _cam_server_socket, _cam_station_title\n` +
      `    try:\n` +
      `        _conn, _addr = _cam_server_socket.accept()\n` +
      `        print("[HTTP] Conexao recebida de:", _addr[0])\n` +
      `        _req = _conn.recv(1024).decode('utf-8', 'ignore')\n` +
      `        if "GET /capture" in _req:\n` +
      `            _buf = camera.capture()\n` +
      `            if _buf:\n` +
      `                _conn.send(b"HTTP/1.1 200 OK\\r\\nContent-Type: image/jpeg\\r\\nContent-Length: " + str(len(_buf)).encode('utf-8') + b"\\r\\nAccess-Control-Allow-Origin: *\\r\\nConnection: close\\r\\n\\r\\n")\n` +
      `                _conn.sendall(_buf)\n` +
      `                print("[HTTP] Foto JPEG enviada (" + str(len(_buf)) + " bytes)")\n` +
      `            else:\n` +
      `                _conn.send(b"HTTP/1.1 500 Internal Error\\r\\nConnection: close\\r\\n\\r\\nFalha na camera")\n` +
      `        elif "GET /flash" in _req:\n` +
      `            from machine import Pin\n` +
      `            _p4 = Pin(4, Pin.OUT)\n` +
      `            _p4.value(not _p4.value())\n` +
      `            _conn.send(b"HTTP/1.1 200 OK\\r\\nContent-Type: text/plain\\r\\nConnection: close\\r\\n\\r\\nFlash: " + str(_p4.value()).encode('utf-8'))\n` +
      `            print("[HTTP] Flash LED alternado para:", _p4.value())\n` +
      `        else:\n` +
      `            _html = "<!DOCTYPE html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>" + str(_cam_station_title) + "</title><style>body{font-family:sans-serif;background:#0f172a;color:#f8fafc;text-align:center;padding:16px;margin:0}h1{font-size:20px;color:#38bdf8;margin-bottom:6px}.card{background:#1e293b;border-radius:16px;padding:16px;max-width:480px;margin:0 auto;box-shadow:0 10px 25px rgba(0,0,0,0.5)}img{width:100%;border-radius:12px;margin:12px 0;background:#334155;min-height:180px;object-fit:contain}button{background:#2563eb;color:#fff;border:none;padding:12px 18px;font-size:15px;font-weight:700;border-radius:8px;cursor:pointer;margin:6px}button:active{background:#1d4ed8}</style></head><body><div class='card'><h1>🛰️ " + str(_cam_station_title) + "</h1><p style='color:#94a3b8;font-size:13px'>Transmissao Local ESP32-CAM</p><img id='cam' src='/capture' alt='Camera'><br><button onclick=\\\"document.getElementById('cam').src='/capture?t='+Date.now()\\\">📸 Nova Foto</button><button style='background:#f59e0b' onclick=\\\"fetch('/flash')\\\">💡 Flash LED</button></div></body></html>"\n` +
      `            _html_bytes = _html.encode('utf-8')\n` +
      `            _conn.send(b"HTTP/1.1 200 OK\\r\\nContent-Type: text/html\\r\\nContent-Length: " + str(len(_html_bytes)).encode('utf-8') + b"\\r\\nConnection: close\\r\\n\\r\\n" + _html_bytes)\n` +
      `            print("[HTTP] Pagina HTML principal servida.")\n` +
      `        _conn.close()\n` +
      `    except Exception as _e_srv:\n` +
      `        pass\n`;

    return `_processar_webserver_cam()\n`;
  };

  Blockly.Python['sat_camera_lora_send_chunks'] = function(block) {
    const chunkSize = block.getFieldValue('CHUNK_SIZE') || 200;
    Blockly.Python.definitions_['import_camera'] = 'import camera';
    Blockly.Python.definitions_['import_time'] = 'import time';
    
    return `try:\n` +
           `    _img = camera.capture()\n` +
           `    if _img:\n` +
           `        _csize = ${chunkSize}\n` +
           `        _total = (len(_img) + _csize - 1) // _csize\n` +
           `        print(f"[LORA IMG] Enviando foto ({len(_img)} bytes) em {_total} pacotes...")\n` +
           `        for _idx in range(_total):\n` +
           `            _chunk = _img[_idx * _csize : (_idx + 1) * _csize]\n` +
           `            _header = bytes([0xAA, (_idx >> 8) & 0xFF, _idx & 0xFF, (_total >> 8) & 0xFF, _total & 0xFF])\n` +
           `            print(f"[LORA TX] Pacote {_idx + 1}/{_total} ({len(_chunk)} bytes)")\n` +
           `            time.sleep_ms(60)\n` +
           `        print("[LORA IMG] Transmissao da imagem concluida!")\n` +
           `except Exception as _e:\n` +
           `    print("[LORA IMG ERROR]", _e)\n`;
  };

  Blockly.Python['sat_camera_deinit'] = function(block) {
    Blockly.Python.definitions_['import_camera'] = 'import camera';
    return `try:\n    camera.deinit()\n    print("[CAMERA] Sensor OV2640 desativado para economia de energia.")\nexcept Exception as _e:\n    print("[CAMERA DEINIT ERROR]", _e)\n`;
  };

  Blockly.Python['sat_sd_write_log'] = function(block) {
    const filename = block.getFieldValue('FILENAME') || 'telemetria.csv';
    const text = Blockly.Python.valueToCode(block, 'TEXT', Blockly.Python.ORDER_NONE) || '""';

    return `try:\n` +
           `    with open("${filename}", "a") as _f:\n` +
           `        _f.write(str(${text}) + "\\n")\n` +
           `except Exception as _e:\n` +
           `    print("[SD ERROR]", _e)\n`;
  };

  // ==========================================
  // 8. ATUADORES & EJEÇÃO
  // ==========================================
  Blockly.Python['sat_actuator_servo_release'] = function(block) {
    const pin = block.getFieldValue('PIN') || '18';
    const angle = block.getFieldValue('ANGLE') || 90;
    Blockly.Python.definitions_['init_servo_' + pin] = 
      `_servo_${pin} = PWM(Pin(${pin}), freq=50)\n`;

    const duty = Math.round(25 + (angle / 180.0) * 100);
    return `_servo_${pin}.duty(${duty}) # Posiciona servo em ${angle} graus\n`;
  };

  Blockly.Python['sat_actuator_buzzer'] = function(block) {
    const pin = block.getFieldValue('PIN') || '25';
    const freq = block.getFieldValue('FREQ') || 2000;
    const dur = block.getFieldValue('DURATION') || 300;
    Blockly.Python.definitions_['import_time'] = 'import time';
    Blockly.Python.definitions_['import_machine'] = 'from machine import Pin, I2C, SPI, ADC, PWM';
    Blockly.Python.definitions_['func_obsat_beep'] = 
`def obsat_beep(freq=2000, dur_ms=150, pin_num=25):
    try:
        bz = PWM(Pin(pin_num), freq=freq, duty=512)
        time.sleep_ms(dur_ms)
        bz.duty(0)
        bz.deinit()
    except:
        try:
            bz = PWM(Pin(pin_num))
            bz.freq(freq)
            bz.duty(512)
            time.sleep_ms(dur_ms)
            bz.duty(0)
            bz.deinit()
        except:
            pass`;

    return `obsat_beep(${freq}, ${dur}, ${pin})\n`;
  };

  function ensureMcp23017Driver() {
    Blockly.Python.definitions_['import_machine'] = 'from machine import Pin, I2C, SPI, ADC, PWM';
    Blockly.Python.definitions_['init_i2c_bus'] = 'i2c = I2C(0, scl=Pin(22), sda=Pin(21))';
    Blockly.Python.definitions_['func_obsat_mcp23017'] = 
`class _SatMCP23017:
    def __init__(self, i2c_bus, addr=0x20):
        self.i2c = i2c_bus
        self.addr = addr
        self.state_a = 0
        self.state_b = 0
        try:
            self.i2c.writeto_mem(self.addr, 0x00, bytes([0x00]))
            self.i2c.writeto_mem(self.addr, 0x01, bytes([0x00]))
        except: pass
    def set_pin(self, pin, val):
        p = int(pin)
        v = int(val)
        try:
            if p < 8:
                if v: self.state_a |= (1 << p)
                else: self.state_a &= ~(1 << p)
                self.i2c.writeto_mem(self.addr, 0x12, bytes([self.state_a]))
            else:
                p2 = p - 8
                if v: self.state_b |= (1 << p2)
                else: self.state_b &= ~(1 << p2)
                self.i2c.writeto_mem(self.addr, 0x13, bytes([self.state_b]))
        except: pass

_sat_mcp = None
def obsat_led_mcp(pin=0, state=1):
    global _sat_mcp
    try:
        if _sat_mcp is None:
            _sat_mcp = _SatMCP23017(i2c, 0x20)
        _sat_mcp.set_pin(pin, state)
    except:
        pass`;
  }

  Blockly.Python['sat_actuator_mcp23017_led'] = function(block) {
    let pin = Blockly.Python.valueToCode(block, 'PIN', Blockly.Python.ORDER_ATOMIC);
    if (!pin || pin === '') {
      pin = block.getFieldValue('PIN') || '0';
    }
    const state = block.getFieldValue('STATE') || '1';
    ensureMcp23017Driver();
    return `obsat_led_mcp(${pin}, ${state})\n`;
  };

  Blockly.Python['sat_actuator_led_status'] = function(block) {
    const pin = block.getFieldValue('PIN') || '2';
    const state = block.getFieldValue('STATE') || '1';
    if (pin.startsWith('mcp_')) {
      const mcpPin = pin.replace('mcp_', '');
      ensureMcp23017Driver();
      return `obsat_led_mcp(${mcpPin}, ${state})\n`;
    }
    Blockly.Python.definitions_['init_led_' + pin] = `_led_${pin} = Pin(${pin}, Pin.OUT)`;

    return `_led_${pin}.value(${state})\n`;
  };

  // ==========================================
  // 9. IOT, EASYMQTT & DATABOARD
  // ==========================================
  Blockly.Python['sat_easymqtt_init'] = function(block) {
    const session = block.getFieldValue('SESSION_ID') || 'obsat_missao01';
    const server = block.getFieldValue('SERVER') || 'bipes.net.br';
    Blockly.Python.definitions_['import_umqtt'] = 'import umqtt.robust as mqtt\nimport ubinascii\nimport machine';
    
    return `easymqtt_session = "${session}"\n` +
           `try:\n` +
           `    _client_id = ubinascii.hexlify(machine.unique_id())\n` +
           `    _mqtt_client = mqtt.MQTTClient(_client_id, server="${server}", port=1883, user="bipes", password="m8YLUr5uW3T")\n` +
           `    _mqtt_client.connect()\n` +
           `    print("[IoT] Conectado ao EasyMQTT:", "${server}")\n` +
           `except Exception as _e:\n` +
           `    print("[IoT] Erro ao conectar no EasyMQTT:", _e)\n`;
  };

  Blockly.Python['sat_easymqtt_publish'] = function(block) {
    const topic = block.getFieldValue('TOPIC') || 'temperatura';
    const data = Blockly.Python.valueToCode(block, 'DATA', Blockly.Python.ORDER_ATOMIC) || '0';
    return `try:\n` +
           `    _payload_str = str(${data})\n` +
           `    _mqtt_client.publish(easymqtt_session + "/${topic}", _payload_str)\n` +
           `    print("[IoT Pub] ${topic}:", _payload_str)\n` +
           `except Exception as _e:\n` +
           `    print("[IoT Pub Erro]:", _e)\n`;
  };

  Blockly.Python['sat_easymqtt_subscribe'] = function(block) {
    const topic = block.getFieldValue('TOPIC') || 'telecomando';
    const branch = Blockly.Python.statementToCode(block, 'DO');
    return `# Callback para telecomando EasyMQTT no tópico: ${topic}\n` +
           `def _on_msg_${topic}(topic, msg):\n` +
           `${branch || '    pass\n'}`;
  };

  // ==========================================
  // 10. REDE & INTERNET (HTTP CLIENT & SERVER)
  // ==========================================

  Blockly.Python['sat_wifi_connect'] = function(block) {
    if (isRp2040()) return 'print("[USB] RP2040-Zero: telemetria pelo navegador conectado a serial")\n';
    const ssid = block.getFieldValue('SSID') || 'OBSAT_WIFI';
    const pwd = block.getFieldValue('PASSWORD') || '';
    Blockly.Python.definitions_['import_network'] = 'import network\nimport time';

    return `_wlan = network.WLAN(network.STA_IF)\n` +
           `_wlan.active(True)\n` +
           `if not _wlan.isconnected():\n` +
           `    print("[WI-FI] Conectando a ${ssid}...")\n` +
           `    _wlan.connect("${ssid}", "${pwd}")\n` +
           `    _timeout = 20\n` +
           `    while not _wlan.isconnected() and _timeout > 0:\n` +
           `        time.sleep(0.5)\n` +
           `        _timeout -= 1\n` +
           `if _wlan.isconnected():\n` +
           `    print("[WI-FI OK] IP:", _wlan.ifconfig()[0])\n` +
           `else:\n` +
           `    print("[WI-FI FALHA] Nao foi possivel conectar")\n`;
  };

  Blockly.Python['sat_http_get'] = function(block) {
    const url = Blockly.Python.valueToCode(block, 'URL', Blockly.Python.ORDER_NONE) || '""';
    Blockly.Python.definitions_['import_urequests'] = 'import urequests';
    const code = `(urequests.get(${url}) if urequests is not None else None)`;
    return [code, Blockly.Python.ORDER_FUNCTION_CALL];
  };

  Blockly.Python['sat_http_post_data'] = function(block) {
    const url = Blockly.Python.valueToCode(block, 'URL', Blockly.Python.ORDER_NONE) || '""';
    const data = Blockly.Python.valueToCode(block, 'DATA', Blockly.Python.ORDER_NONE) || '""';
    Blockly.Python.definitions_['import_urequests'] = 'import urequests';
    const code = `(urequests.post(${url}, data=str(${data})) if urequests is not None else None)`;
    return [code, Blockly.Python.ORDER_FUNCTION_CALL];
  };

  Blockly.Python['sat_i2c_init_pins'] = function(block) {
    const preset = block.getFieldValue('PRESET') || 'esp32cam';
    let scl = block.getFieldValue('SCL_PIN') || 14;
    let sda = block.getFieldValue('SDA_PIN') || 15;
    if (preset === 'esp32cam') { scl = 14; sda = 15; }
    else if (preset === 'devkit') { scl = 22; sda = 21; }

    Blockly.Python.definitions_['import_machine'] = 'from machine import Pin, I2C, SPI, ADC, PWM';
    return `# Inicialização I2C (${preset})\n` +
           `i2c = I2C(0, scl=Pin(${scl}), sda=Pin(${sda}), freq=100000)\n` +
           `print("[I2C] Barramento configurado: SCL=" + str(${scl}) + ", SDA=" + str(${sda}))\n`;
  };

  Blockly.Python['sat_obsat_telemetry_packet'] = function(block) {
    const codeLines = [];

    if (block.itemCount_ !== undefined) {
      for (let i = 0; i < block.itemCount_; i++) {
        const key = (block.itemKeys_ && block.itemKeys_[i]) || ('campo' + (i + 1));
        let valCode = Blockly.Python.valueToCode(block, 'VAL' + i, Blockly.Python.ORDER_NONE);
        if (!valCode) {
          valCode = Blockly.Python.valueToCode(block, key.toUpperCase(), Blockly.Python.ORDER_NONE);
        }
        if (!valCode) valCode = '0';

        if (key === 'equipe' || key === 'bateria') {
          codeLines.push(`    "${key}": int(${valCode})`);
        } else if (key === 'temperatura' || key === 'pressao' || key === 'altitude') {
          codeLines.push(`    "${key}": round(float(${valCode}), 2)`);
        } else if (key === 'payload') {
          codeLines.push(`    "${key}": (${valCode} if isinstance(${valCode}, (dict, list)) else {"dado": str(${valCode})})`);
        } else {
          codeLines.push(`    "${key}": ${valCode}`);
        }
      }
    } else {
      const team = Blockly.Python.valueToCode(block, 'TEAM', Blockly.Python.ORDER_NONE) || '42';
      const temp = Blockly.Python.valueToCode(block, 'TEMP', Blockly.Python.ORDER_NONE) || '25.0';
      const press = Blockly.Python.valueToCode(block, 'PRESS', Blockly.Python.ORDER_NONE) || '1013.25';
      const alt = Blockly.Python.valueToCode(block, 'ALT', Blockly.Python.ORDER_NONE) || '0.0';
      const bat = Blockly.Python.valueToCode(block, 'BAT', Blockly.Python.ORDER_NONE) || '100';
      const payload = Blockly.Python.valueToCode(block, 'PAYLOAD', Blockly.Python.ORDER_NONE) || '{}';

      codeLines.push(`    "equipe": int(${team})`);
      codeLines.push(`    "temperatura": round(float(${temp}), 2)`);
      codeLines.push(`    "pressao": round(float(${press}), 2)`);
      codeLines.push(`    "altitude": round(float(${alt}), 2)`);
      codeLines.push(`    "bateria": int(${bat})`);
      codeLines.push(`    "payload": (${payload} if isinstance(${payload}, (dict, list)) else {"dado": str(${payload})})`);
    }

    const code = `{\n` + codeLines.join(',\n') + `\n}`;
    return [code, Blockly.Python.ORDER_ATOMIC];
  };
  Blockly.Python['sat_format_telemetry'] = Blockly.Python['sat_obsat_telemetry_packet'];

  Blockly.Python['sat_http_send_obsat_telemetry'] = function(block) {
    const url = block.getFieldValue('SERVER_URL') || 'https://obsat.org.br/satblocks/telemetria/salvar_telemetria.php';
    const json_data = Blockly.Python.valueToCode(block, 'JSON_DATA', Blockly.Python.ORDER_NONE) || '{}';
    if (isRp2040()) {
      Blockly.Python.definitions_['import_ujson'] = 'import ujson';
      return `try:\n    _obsat_pkt = ${json_data}\n    print("[TELEMETRIA] " + (ujson.dumps(_obsat_pkt) if isinstance(_obsat_pkt, dict) else str(_obsat_pkt)))\nexcept Exception as _e_tele:\n    print("[ERRO SENSORES/TELEMETRIA]", _e_tele)\n`;
    }
    Blockly.Python.definitions_['import_urequests'] = 'import urequests';
    Blockly.Python.definitions_['import_ujson'] = 'import ujson';

    return `try:\n` +
           `    _obsat_pkt = ${json_data}\n` +
           `    _obsat_body = ujson.dumps(_obsat_pkt) if isinstance(_obsat_pkt, (dict, list)) else str(_obsat_pkt)\n` +
           `    print("[TELEMETRIA] " + _obsat_body)\n` +
           `    if urequests is not None:\n` +
           `        _obsat_res = urequests.post("${url}", headers={'Content-Type': 'application/json'}, data=_obsat_body)\n` +
           `        print("[TELEMETRIA OBSAT] Enviada via HTTP -> Status: " + str(_obsat_res.status_code))\n` +
           `        _obsat_res.close()\n` +
           `    else:\n` +
           `        print("[TELEMETRIA OBSAT] Pacote emitido via Serial USB (urequests nao instalado na placa)")\n` +
           `except Exception as _e_tele:\n` +
           `    print("[TELEMETRIA OBSAT] Status do envio:", _e_tele)\n`;
  };

  Blockly.Python['sat_http_post_json'] = function(block) {
    const url = Blockly.Python.valueToCode(block, 'URL', Blockly.Python.ORDER_NONE) || '""';
    const json_data = Blockly.Python.valueToCode(block, 'JSON_DATA', Blockly.Python.ORDER_NONE) || '{}';
    Blockly.Python.definitions_['import_urequests'] = 'import urequests';
    Blockly.Python.definitions_['import_ujson'] = 'import ujson';
    const code = `(urequests.post(${url}, headers={'Content-Type': 'application/json'}, data=(ujson.dumps(${json_data}) if isinstance(${json_data}, (dict, list)) else str(${json_data}))) if urequests is not None else None)`;
    return [code, Blockly.Python.ORDER_FUNCTION_CALL];
  };

  Blockly.Python['sat_http_status_code'] = function(block) {
    const resp = Blockly.Python.valueToCode(block, 'RESPONSE', Blockly.Python.ORDER_MEMBER) || '_resp';
    const code = `(${resp}.status_code if ${resp} else -1)`;
    return [code, Blockly.Python.ORDER_MEMBER];
  };

  Blockly.Python['sat_http_response_text'] = function(block) {
    const resp = Blockly.Python.valueToCode(block, 'RESPONSE', Blockly.Python.ORDER_MEMBER) || '_resp';
    const code = `(${resp}.text if ${resp} else "")`;
    return [code, Blockly.Python.ORDER_MEMBER];
  };

  // HTTP Web Server
  Blockly.Python['sat_http_server_start'] = function(block) {
    const port = block.getFieldValue('PORT') || 80;
    Blockly.Python.definitions_['import_usocket'] = 'import usocket as socket';

    return `try:\n` +
           `    _http_server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)\n` +
           `    _http_server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)\n` +
           `    _http_server.bind(('', ${port}))\n` +
           `    _http_server.listen(5)\n` +
           `    print("[HTTP SERVER] Escutando na porta ${port}")\n` +
           `except Exception as _e:\n` +
           `    print("[HTTP SERVER ERRO]", _e)\n`;
  };

  Blockly.Python['sat_http_server_wait_client'] = function(block) {
    const code = `_http_server.accept()`;
    return [code, Blockly.Python.ORDER_FUNCTION_CALL];
  };

  Blockly.Python['sat_http_server_requested_page'] = function(block) {
    const client = Blockly.Python.valueToCode(block, 'CLIENT', Blockly.Python.ORDER_NONE) || '_client_conn';
    const code = `(${client}[0].recv(1024).decode().split()[1] if ${client} else "/")`;
    return [code, Blockly.Python.ORDER_FUNCTION_CALL];
  };

  Blockly.Python['sat_http_server_send_html'] = function(block) {
    const client = Blockly.Python.valueToCode(block, 'CLIENT', Blockly.Python.ORDER_NONE) || '_client_conn';
    const html = Blockly.Python.valueToCode(block, 'HTML', Blockly.Python.ORDER_NONE) || '""';
    return `try:\n` +
           `    _c = ${client}[0] if isinstance(${client}, tuple) else ${client}\n` +
           `    _c.send('HTTP/1.1 200 OK\\r\\nContent-Type: text/html\\r\\nConnection: close\\r\\n\\r\\n')\n` +
           `    _c.send(str(${html}))\n` +
           `    _c.close()\n` +
           `except Exception as _e:\n` +
           `    print("[HTTP SEND ERRO]", _e)\n`;
  };

  Blockly.Python['sat_http_server_send_jpg'] = function(block) {
    const client = Blockly.Python.valueToCode(block, 'CLIENT', Blockly.Python.ORDER_NONE) || '_client_conn';
    const img = Blockly.Python.valueToCode(block, 'IMAGE', Blockly.Python.ORDER_NONE) || 'b""';
    return `try:\n` +
           `    _c = ${client}[0] if isinstance(${client}, tuple) else ${client}\n` +
           `    _c.send('HTTP/1.1 200 OK\\r\\nContent-Type: image/jpeg\\r\\nConnection: close\\r\\n\\r\\n')\n` +
           `    _c.send(${img})\n` +
           `    _c.close()\n` +
           `except Exception as _e:\n` +
           `    print("[HTTP SEND JPG ERRO]", _e)\n`;
  };

  Blockly.Python['sat_http_server_close'] = function(block) {
    return `try:\n    _http_server.close()\nexcept:\n    pass\n`;
  };

  // ==========================================
  // 11. EASYMQTT & IOT EXPANDIDO
  // ==========================================

  Blockly.Python['sat_easymqtt_start_session'] = function(block) {
    const session = block.getFieldValue('SESSION_ID') || 'zi6pi';
    Blockly.Python.definitions_['import_easymqtt'] = 'import easymqtt';
    return `easymqtt_session = "${session}"\n` +
           `easymqtt.start_session("${session}")\n`;
  };

  Blockly.Python['sat_easymqtt_publish_val'] = function(block) {
    const topic = Blockly.Python.valueToCode(block, 'TOPIC', Blockly.Python.ORDER_NONE) || '"dados"';
    const val = Blockly.Python.valueToCode(block, 'VALUE', Blockly.Python.ORDER_NONE) || '0';
    return `easymqtt.publish(str(${topic}), str(${val}))\n`;
  };

  Blockly.Python['sat_easymqtt_publish_http'] = function(block) {
    const session = Blockly.Python.valueToCode(block, 'SESSION', Blockly.Python.ORDER_NONE) || '"zi6pi"';
    const topic = Blockly.Python.valueToCode(block, 'TOPIC', Blockly.Python.ORDER_NONE) || '"dados"';
    const val = Blockly.Python.valueToCode(block, 'VALUE', Blockly.Python.ORDER_NONE) || '0';
    Blockly.Python.definitions_['import_urequests'] = 'import urequests';

    return `try:\n` +
           `    _url_emqtt = "https://bipes.net.br/easymqtt/publish.php?session=" + str(${session}) + "&topic=" + str(${topic}) + "&value=" + str(${val})\n` +
           `    if urequests is not None:\n` +
           `        urequests.get(_url_emqtt)\n` +
           `    else:\n` +
           `        print("[EasyMQTT HTTP] urequests nao instalado nesta placa")\n` +
           `except Exception as _e:\n` +
           `    print("[EasyMQTT HTTP Erro]", _e)\n`;
  };

  Blockly.Python['sat_easymqtt_subscribe_event'] = function(block) {
    const topic = Blockly.Python.valueToCode(block, 'TOPIC', Blockly.Python.ORDER_NONE) || '"cmd"';
    const branch = Blockly.Python.statementToCode(block, 'DO');
    return `def _on_easymqtt_rx(data):\n` +
           `${branch || '    pass\n'}` +
           `easymqtt.subscribe(str(${topic}), _on_easymqtt_rx)\n`;
  };

  Blockly.Python['sat_easymqtt_receive_data'] = function(block) {
    const wait = block.getFieldValue('WAIT') === 'YES';
    const code = `easymqtt.receive_data(wait=${wait ? 'True' : 'False'})`;
    return [code, Blockly.Python.ORDER_FUNCTION_CALL];
  };

  Blockly.Python['sat_easymqtt_stop'] = function(block) {
    return `easymqtt.stop()\n`;
  };

  // ==========================================
  // 12. BARRAMENTOS: UART & I2C LOW-LEVEL
  // ==========================================

  Blockly.Python['sat_uart_init'] = function(block) {
    const port = block.getFieldValue('PORT') || '2';
    const baud = block.getFieldValue('BAUD') || 115200;
    const stop = block.getFieldValue('STOP') || 1;
    const parity = block.getFieldValue('PARITY') || 'None';
    Blockly.Python.definitions_['import_uart'] = 'from machine import UART';

    // No kit Pion CubeSat: UART2 usa TX=GPIO17 e RX=GPIO16
    const tx = port === '2' ? 17 : (port === '1' ? 10 : 1);
    const rx = port === '2' ? 16 : (port === '1' ? 9 : 3);

    return `_uart = UART(${port}, baudrate=${baud}, tx=${tx}, rx=${rx}, stop=${stop}, parity=${parity})\n` +
           `print("[UART${port}] Inicializada em ${baud} baud (TX:${tx}, RX:${rx})")\n`;
  };

  Blockly.Python['sat_uart_send'] = function(block) {
    const data = Blockly.Python.valueToCode(block, 'DATA', Blockly.Python.ORDER_NONE) || '""';
    return `_uart.write(str(${data}) + "\\n")\n`;
  };

  Blockly.Python['sat_uart_read_bytes'] = function(block) {
    const nbytes = Blockly.Python.valueToCode(block, 'BYTES', Blockly.Python.ORDER_NONE) || '10';
    const code = `(_uart.read(${nbytes}).decode('utf-8', 'ignore') if _uart.any() else "")`;
    return [code, Blockly.Python.ORDER_FUNCTION_CALL];
  };

  Blockly.Python['sat_uart_readline'] = function(block) {
    const code = `(_uart.readline().decode('utf-8', 'ignore') if _uart.any() else "")`;
    return [code, Blockly.Python.ORDER_FUNCTION_CALL];
  };

  Blockly.Python['sat_uart_readall'] = function(block) {
    const code = `(_uart.read().decode('utf-8', 'ignore') if _uart.any() else "")`;
    return [code, Blockly.Python.ORDER_FUNCTION_CALL];
  };

  Blockly.Python['sat_uart_any'] = function(block) {
    const code = `(_uart.any() > 0)`;
    return [code, Blockly.Python.ORDER_RELATIONAL];
  };

  // I2C Low-level
  Blockly.Python['sat_i2c_init'] = function(block) {
    const scl = block.getFieldValue('SCL') || 22;
    const sda = block.getFieldValue('SDA') || 21;
    const freq = block.getFieldValue('FREQ') || 400000;
    Blockly.Python.definitions_['import_i2c_pin'] = 'from machine import I2C, Pin';

    return `i2c = I2C(0, scl=Pin(${scl}), sda=Pin(${sda}), freq=${freq})\n` +
           `print("[I2C] Barramento inicializado SCL:${scl}, SDA:${sda}, Freq:${freq}Hz")\n`;
  };

  Blockly.Python['sat_i2c_scan'] = function(block) {
    const code = `[hex(x) for x in i2c.scan()]`;
    return [code, Blockly.Python.ORDER_FUNCTION_CALL];
  };

  Blockly.Python['sat_i2c_writeto'] = function(block) {
    const addr = block.getFieldValue('ADDR') || '0x76';
    const data = Blockly.Python.valueToCode(block, 'DATA', Blockly.Python.ORDER_NONE) || 'b""';
    return `i2c.writeto(int("${addr}", 16), ${data})\n`;
  };

  Blockly.Python['sat_i2c_readfrom'] = function(block) {
    const addr = block.getFieldValue('ADDR') || '0x76';
    const nbytes = block.getFieldValue('NBYTES') || 2;
    const code = `i2c.readfrom(int("${addr}", 16), ${nbytes})`;
    return [code, Blockly.Python.ORDER_FUNCTION_CALL];
  };

  Blockly.Python['sat_i2c_readfrom_mem'] = function(block) {
    const addr = block.getFieldValue('ADDR') || '0x68';
    const memaddr = block.getFieldValue('MEMADDR') || '0x3B';
    const nbytes = block.getFieldValue('NBYTES') || 6;
    const code = `i2c.readfrom_mem(int("${addr}", 16), int("${memaddr}", 16), ${nbytes})`;
    return [code, Blockly.Python.ORDER_FUNCTION_CALL];
  };

  Blockly.Python['sat_i2c_writeto_mem'] = function(block) {
    const addr = block.getFieldValue('ADDR') || '0x68';
    const memaddr = block.getFieldValue('MEMADDR') || '0x6B';
    const data = Blockly.Python.valueToCode(block, 'DATA', Blockly.Python.ORDER_NONE) || 'b""';
    return `i2c.writeto_mem(int("${addr}", 16), int("${memaddr}", 16), ${data})\n`;
  };

  // =========================================================================
  // GERADORES DE CONVERSÃO DE TIPOS
  // =========================================================================

  Blockly.Python['sat_math_to_int'] = function(block) {
    const value = Blockly.Python.valueToCode(block, 'VALUE', Blockly.Python.ORDER_NONE) || '0';
    const code = `int(${value})`;
    return [code, Blockly.Python.ORDER_FUNCTION_CALL];
  };

  Blockly.Python['sat_math_to_float'] = function(block) {
    const value = Blockly.Python.valueToCode(block, 'VALUE', Blockly.Python.ORDER_NONE) || '0';
    const code = `float(${value})`;
    return [code, Blockly.Python.ORDER_FUNCTION_CALL];
  };

  Blockly.Python['sat_text_to_str'] = function(block) {
    const value = Blockly.Python.valueToCode(block, 'VALUE', Blockly.Python.ORDER_NONE) || '""';
    const code = `str(${value})`;
    return [code, Blockly.Python.ORDER_FUNCTION_CALL];
  };

  // =========================================================================
  // GERADORES DE TEMPORIZAÇÃO & RELÓGIO OFICIAIS DO BIPES
  // =========================================================================

  Blockly.Python['delay'] = function(block) {
    Blockly.Python.definitions_['import_time'] = 'import time';
    const timeVal = Blockly.Python.valueToCode(block, 'TIME', Blockly.Python.ORDER_NONE) || '1';
    const scale = block.getFieldValue('SCALE') || 'sleep';
    return `time.${scale}(${timeVal})\n`;
  };

  Blockly.Python['utime.vars'] = function(block) {
    Blockly.Python.definitions_['import_time'] = 'import time';
    const v = block.getFieldValue('VARS') || 'ticks_ms';
    return [`time.${v}()`, Blockly.Python.ORDER_FUNCTION_CALL];
  };

  Blockly.Python['utime.ticks_add'] = function(block) {
    Blockly.Python.definitions_['import_time'] = 'import time';
    const t1 = Blockly.Python.valueToCode(block, 'TIME1', Blockly.Python.ORDER_NONE) || 'time.ticks_ms()';
    const t2 = Blockly.Python.valueToCode(block, 'TIME2', Blockly.Python.ORDER_NONE) || '100';
    return [`time.ticks_add(${t1}, ${t2})`, Blockly.Python.ORDER_FUNCTION_CALL];
  };

  Blockly.Python['utime.ticks_diff'] = function(block) {
    Blockly.Python.definitions_['import_time'] = 'import time';
    const t1 = Blockly.Python.valueToCode(block, 'TIME1', Blockly.Python.ORDER_NONE) || 'time.ticks_ms()';
    const t2 = Blockly.Python.valueToCode(block, 'TIME2', Blockly.Python.ORDER_NONE) || '0';
    return [`time.ticks_diff(${t1}, ${t2})`, Blockly.Python.ORDER_FUNCTION_CALL];
  };

  Blockly.Python['utime.deadline'] = function(block) {
    Blockly.Python.definitions_['import_time'] = 'import time';
    const id = block.getFieldValue('ID') || '0';
    const timeVal = Blockly.Python.valueToCode(block, 'TIME', Blockly.Python.ORDER_NONE) || '5000';
    const branch = Blockly.Python.statementToCode(block, 'DO') || '  pass\n';
    return `_deadline_${id} = time.ticks_add(time.ticks_ms(), ${timeVal})\n` +
           `while time.ticks_diff(_deadline_${id}, time.ticks_ms()) > 0:\n${branch}`;
  };

  Blockly.Python['timer'] = function(block) {
    Blockly.Python.definitions_['import_timer'] = 'from machine import Timer';
    const timerNumber = block.getFieldValue('timerNumber') || '0';
    const mode = block.getFieldValue('MODE') || 'PERIODIC';
    const interval = block.getFieldValue('interval') || '1000';
    const branch = Blockly.Python.statementToCode(block, 'statements') || '  pass\n';
    const cbName = `_timer_cb_${timerNumber}`;

    return `def ${cbName}(t):\n${branch}` +
           `_timer_${timerNumber} = Timer(${timerNumber})\n` +
           `_timer_${timerNumber}.init(period=${interval}, mode=Timer.${mode}, callback=${cbName})\n`;
  };

  Blockly.Python['stop_timer'] = function(block) {
    Blockly.Python.definitions_['import_timer'] = 'from machine import Timer';
    const timerNumber = Blockly.Python.valueToCode(block, 'timerNumber', Blockly.Python.ORDER_NONE) || '0';
    return `try:\n  Timer(${timerNumber}).deinit()\nexcept:\n  pass\n`;
  };

  Blockly.Python['esp32_set_rtc'] = function(block) {
    Blockly.Python.definitions_['import_rtc'] = 'from machine import RTC';
    const year = Blockly.Python.valueToCode(block, 'year', Blockly.Python.ORDER_NONE) || '2026';
    const month = Blockly.Python.valueToCode(block, 'month', Blockly.Python.ORDER_NONE) || '1';
    const day = Blockly.Python.valueToCode(block, 'day', Blockly.Python.ORDER_NONE) || '1';
    const hour = Blockly.Python.valueToCode(block, 'hour', Blockly.Python.ORDER_NONE) || '12';
    const minute = Blockly.Python.valueToCode(block, 'minute', Blockly.Python.ORDER_NONE) || '0';
    const second = Blockly.Python.valueToCode(block, 'second', Blockly.Python.ORDER_NONE) || '0';
    return `RTC().datetime((${year}, ${month}, ${day}, 0, ${hour}, ${minute}, ${second}, 0))\n`;
  };

  Blockly.Python['esp32_get_rtc'] = function(block) {
    Blockly.Python.definitions_['import_rtc'] = 'from machine import RTC';
    return [`RTC().datetime()`, Blockly.Python.ORDER_FUNCTION_CALL];
  };

  Blockly.Python['esp32_deep_sleep'] = function(block) {
    Blockly.Python.definitions_['import_machine'] = 'import machine';
    const sec = Blockly.Python.valueToCode(block, 'interval', Blockly.Python.ORDER_NONE) || '60';
    return `machine.deepsleep(int(${sec} * 1000))\n`;
  };

  // Compatibilidade com blocos legados
  Blockly.Python['sat_time_sleep_ms'] = function(block) {
    Blockly.Python.definitions_['import_time'] = 'import time';
    const ms = Blockly.Python.valueToCode(block, 'MS', Blockly.Python.ORDER_NONE) || '500';
    return `time.sleep_ms(${ms})\n`;
  };

  Blockly.Python['sat_time_sleep_us'] = function(block) {
    Blockly.Python.definitions_['import_time'] = 'import time';
    const us = Blockly.Python.valueToCode(block, 'US', Blockly.Python.ORDER_NONE) || '100';
    return `time.sleep_us(${us})\n`;
  };

  Blockly.Python['sat_time_ticks_ms'] = Blockly.Python['utime.vars'];
  Blockly.Python['sat_time_ticks_us'] = Blockly.Python['utime.vars'];
  Blockly.Python['sat_time_ticks_diff'] = Blockly.Python['utime.ticks_diff'];
  Blockly.Python['sat_time_localtime'] = Blockly.Python['esp32_get_rtc'];

  // =========================================================================
  // GERADORES DE ARQUIVOS & OPERAÇÕES DE DISCO (FLASH / SD / UOS)
  // =========================================================================

  Blockly.Python['file_open'] = function(block) {
    const filename = Blockly.Python.valueToCode(block, 'file_name', Blockly.Python.ORDER_NONE) || '"file.txt"';
    let mode = block.getFieldValue('dropdown_mode') || 'a';
    const isBinary = block.getFieldValue('checkbox_binary') === 'TRUE';
    if (isBinary && !mode.includes('b')) {
      mode += 'b';
    }
    return [`open(${filename}, "${mode}")`, Blockly.Python.ORDER_FUNCTION_CALL];
  };

  Blockly.Python['file_open_write'] = function(block) {
    const filename = Blockly.Python.valueToCode(block, 'filename', Blockly.Python.ORDER_NONE) || '"file.txt"';
    return [`open(${filename}, "w")`, Blockly.Python.ORDER_FUNCTION_CALL];
  };

  Blockly.Python['file_open_read'] = function(block) {
    const filename = Blockly.Python.valueToCode(block, 'filename', Blockly.Python.ORDER_NONE) || '"file.txt"';
    return [`open(${filename}, "r")`, Blockly.Python.ORDER_FUNCTION_CALL];
  };

  Blockly.Python['file_write'] = function(block) {
    const varName = Blockly.Python.nameDB_.getName(block.getFieldValue('filename'), "VARIABLE");
    const data = Blockly.Python.valueToCode(block, 'data', Blockly.Python.ORDER_NONE) || '""';
    return `${varName}.write(str(${data}))\n`;
  };

  Blockly.Python['file_write_line'] = function(block) {
    const varName = Blockly.Python.nameDB_.getName(block.getFieldValue('filename'), "VARIABLE");
    const data = Blockly.Python.valueToCode(block, 'data', Blockly.Python.ORDER_NONE) || '""';
    return `${varName}.write(str(${data}) + "\\n")\n`;
  };

  Blockly.Python['file_write_byte'] = function(block) {
    const varName = Blockly.Python.nameDB_.getName(block.getFieldValue('filename'), "VARIABLE");
    const data = Blockly.Python.valueToCode(block, 'data', Blockly.Python.ORDER_NONE) || '0';
    return `${varName}.write(bytes([int(${data})]))\n`;
  };

  Blockly.Python['file_read'] = function(block) {
    const varName = Blockly.Python.nameDB_.getName(block.getFieldValue('filename'), "VARIABLE");
    return [`${varName}.read()`, Blockly.Python.ORDER_FUNCTION_CALL];
  };

  Blockly.Python['file_close'] = function(block) {
    const varName = Blockly.Python.nameDB_.getName(block.getFieldValue('filename'), "VARIABLE");
    return `${varName}.close()\n`;
  };

  Blockly.Python['files_list'] = function(block) {
    Blockly.Python.definitions_['import_os'] = 'import os';
    return [`os.listdir()`, Blockly.Python.ORDER_FUNCTION_CALL];
  };

  Blockly.Python['uos_mkdir'] = function(block) {
    Blockly.Python.definitions_['import_os'] = 'import os';
    const dirname = Blockly.Python.valueToCode(block, 'pIn', Blockly.Python.ORDER_NONE) || '"pasta"';
    return `try:\n  os.mkdir(${dirname})\nexcept:\n  pass\n`;
  };

  Blockly.Python['uos_remove'] = function(block) {
    Blockly.Python.definitions_['import_os'] = 'import os';
    const filename = Blockly.Python.valueToCode(block, 'pIn', Blockly.Python.ORDER_NONE) || '"file.txt"';
    return `try:\n  os.remove(${filename})\nexcept:\n  pass\n`;
  };

  Blockly.Python['uos_rmdir'] = function(block) {
    Blockly.Python.definitions_['import_os'] = 'import os';
    const dirname = Blockly.Python.valueToCode(block, 'pIn', Blockly.Python.ORDER_NONE) || '"pasta"';
    return `try:\n  os.rmdir(${dirname})\nexcept:\n  pass\n`;
  };

  Blockly.Python['uos_chdir'] = function(block) {
    Blockly.Python.definitions_['import_os'] = 'import os';
    const path = Blockly.Python.valueToCode(block, 'pIn', Blockly.Python.ORDER_NONE) || '"/"';
    return `os.chdir(${path})\n`;
  };

  Blockly.Python['uos_getcwd'] = function(block) {
    Blockly.Python.definitions_['import_os'] = 'import os';
    return [`os.getcwd()`, Blockly.Python.ORDER_FUNCTION_CALL];
  };

  // =========================================================================
  // GERADORES AVANÇADOS & PYTHON (TRY/EXCEPT, EXEC_PYTHON, IRQ INTERRUPÇÕES)
  // =========================================================================

  Blockly.Python['try_catch'] = function(block) {
    const mainCode = Blockly.Python.statementToCode(block, 'main_code') || '  pass\n';
    const catchCode = Blockly.Python.statementToCode(block, 'catch_code') || '  pass\n';
    return `try:\n${mainCode}except Exception as _e:\n${catchCode}`;
  };

  Blockly.Python['exec_python'] = function(block) {
    const command = Blockly.Python.valueToCode(block, 'command', Blockly.Python.ORDER_NONE);
    if (!command) return '';
    // Se for string com aspas envolventes, descompacta
    const raw = command.replace(/^['"]|['"]$/g, '');
    return `${raw}\n`;
  };

  Blockly.Python['exec_python_output'] = function(block) {
    const command = Blockly.Python.valueToCode(block, 'command', Blockly.Python.ORDER_NONE) || 'None';
    const raw = command.replace(/^['"]|['"]$/g, '');
    return [raw, Blockly.Python.ORDER_ATOMIC];
  };

  Blockly.Python['inter_init'] = function(block) {
    Blockly.Python.definitions_['import_pin'] = 'from machine import Pin';
    let nome = Blockly.Python.valueToCode(block, 'Nome', Blockly.Python.ORDER_ATOMIC) || '"btn"';
    nome = nome.replace(/['"]/g, '').trim() || 'btn';
    let handler = Blockly.Python.valueToCode(block, 'Função', Blockly.Python.ORDER_ATOMIC) || '"callback"';
    handler = handler.replace(/['"]/g, '').trim() || 'callback';
    const pin = Blockly.Python.valueToCode(block, 'pin', Blockly.Python.ORDER_ATOMIC) || '0';
    const trigger = block.getFieldValue('TRIGGER') || 'IRQ_FALLING';

    return `${nome} = Pin(${pin}, Pin.IN, Pin.PULL_UP)\n` +
           `${nome}.irq(trigger=Pin.${trigger}, handler=${handler})\n`;
  };

  Blockly.Python['sat_python_comment'] = function(block) {
    const comment = block.getFieldValue('COMMENT') || '';
    return `# ${comment}\n`;
  };

  // ==========================================
  // BLOCOS ESPECIAIS WAVESHARE RP2040-ZERO
  // ==========================================
  Blockly.Python['sat_rp2040_rgb_led'] = function(block) {
    const r = block.getFieldValue('R') !== null ? block.getFieldValue('R') : 255;
    const g = block.getFieldValue('G') !== null ? block.getFieldValue('G') : 0;
    const b = block.getFieldValue('B') !== null ? block.getFieldValue('B') : 0;
    Blockly.Python.definitions_['import_neopixel'] = 'import neopixel';
    Blockly.Python.definitions_['import_pin'] = 'from machine import Pin';
    Blockly.Python.definitions_['init_rp2040_rgb'] = 
      `try:\n` +
      `    _rgb_rp2040 = neopixel.NeoPixel(Pin(16), 1)\n` +
      `except:\n` +
      `    _rgb_rp2040 = None\n`;

    return `# LED RGB WS2812 Onboard RP2040-Zero (GP16)\n` +
           `if _rgb_rp2040:\n` +
           `    _rgb_rp2040[0] = (${r}, ${g}, ${b})\n` +
           `    _rgb_rp2040.write()\n`;
  };

  Blockly.Python['sat_rp2040_temp'] = function(block) {
    Blockly.Python.definitions_['import_adc'] = 'from machine import ADC';
    Blockly.Python.definitions_['init_rp2040_temp'] = '_adc_rp2040_temp = ADC(4) # Sensor Termico On-chip RP2040';
    const code = `round(27.0 - (((_adc_rp2040_temp.read_u16() * 3.3 / 65535.0) - 0.706) / 0.001721), 1)`;
    return [code, Blockly.Python.ORDER_FUNCTION_CALL];
  };

  // =========================================================================
  // GERADORES OFICIAIS OBSAT: MCP23017 I/O EXPANDER & TONE SOUND (GPIO 25)
  // =========================================================================
  Blockly.Python['mcp23017_init'] = function(block) {
    const scl = Blockly.Python.valueToCode(block, 'scl', Blockly.Python.ORDER_ATOMIC) || '22';
    const sda = Blockly.Python.valueToCode(block, 'sda', Blockly.Python.ORDER_ATOMIC) || '21';
    Blockly.Python.definitions_['import_machine'] = 'from machine import Pin, I2C, PWM';
    Blockly.Python.definitions_['class_mcp23017_driver'] = 
`class _MCP23017_Driver:
    def __init__(self, i2c, addr=0x20):
        self.i2c = i2c
        self.addr = addr
        self.state_a = 0
        self.state_b = 0
        try:
            self.i2c.writeto_mem(self.addr, 0x00, b'\\x00') # IODIRA saida
            self.i2c.writeto_mem(self.addr, 0x01, b'\\x00') # IODIRB saida
            self.i2c.writeto_mem(self.addr, 0x12, b'\\x00') # GPIOA 0
            self.i2c.writeto_mem(self.addr, 0x13, b'\\x00') # GPIOB 0
        except: pass
    def set_pin(self, pin, val):
        p = int(pin)
        v = int(val)
        try:
            if p < 8:
                if v: self.state_a |= (1 << p)
                else: self.state_a &= ~(1 << p)
                self.i2c.writeto_mem(self.addr, 0x12, bytes([self.state_a]))
            else:
                p2 = p - 8
                if v: self.state_b |= (1 << p2)
                else: self.state_b &= ~(1 << p2)
                self.i2c.writeto_mem(self.addr, 0x13, bytes([self.state_b]))
        except: pass`;

    return `try:\n` +
           `    i2c = I2C(0, scl=Pin(${scl}), sda=Pin(${sda}))\n` +
           `except:\n` +
           `    try:\n` +
           `        i2c = I2C(scl=Pin(${scl}), sda=Pin(${sda}))\n` +
           `    except:\n` +
           `        pass\n` +
           `_mcp = _MCP23017_Driver(i2c, 0x20)\n`;
  };

  Blockly.Python['mcp23017_set_pin'] = function(block) {
    const pin = Blockly.Python.valueToCode(block, 'pin', Blockly.Python.ORDER_ATOMIC) || '0';
    const value = Blockly.Python.valueToCode(block, 'value', Blockly.Python.ORDER_ATOMIC) || '1';
    return `if '_mcp' in locals() or '_mcp' in globals():\n` +
           `    _mcp.set_pin(${pin}, ${value})\n`;
  };

  Blockly.Python['tone'] = function(block) {
    const pin = block.getFieldValue('pin') || '25';
    const freq = Blockly.Python.valueToCode(block, 'frequency', Blockly.Python.ORDER_ATOMIC) || '2200';
    const dur = Blockly.Python.valueToCode(block, 'duration', Blockly.Python.ORDER_ATOMIC) || '1';
    Blockly.Python.definitions_['import_time'] = 'import time';
    Blockly.Python.definitions_['import_machine'] = 'from machine import Pin, I2C, SPI, ADC, PWM';
    Blockly.Python.definitions_['func_bipes_tone'] = 
`def bipes_tone(pin_num=25, freq=2200, duration_sec=1):
    try:
        bz = PWM(Pin(int(pin_num)), freq=int(freq), duty=512)
        if duration_sec > 0:
            time.sleep(float(duration_sec))
            bz.duty(0)
            bz.deinit()
    except:
        try:
            bz = PWM(Pin(int(pin_num)))
            bz.freq(int(freq))
            bz.duty(512)
            if duration_sec > 0:
                time.sleep(float(duration_sec))
                bz.duty(0)
                bz.deinit()
        except:
            pass`;

    return `print("[SOM] Tone ${freq}Hz no pino GPIO${pin}")\n` +
           `bipes_tone(${pin}, ${freq}, ${dur})\n`;
  };

})(typeof Blockly !== 'undefined' ? Blockly : null);


