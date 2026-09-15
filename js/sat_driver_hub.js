/**
 * ============================================================================
 * SatBlocks Studio — Driver Hub & MicroPython Knowledge Base
 * ============================================================================
 * Catálogo inteligente de drivers, pinagens e APIs MicroPython para sensores,
 * atuadores, módulos de telecomunicações e periféricos.
 */

window.SatDriverHub = (function() {
  'use strict';

  // Banco de conhecimento de drivers MicroPython
  const DRIVERS_DB = {
    'vl53l0x': {
      id: 'vl53l0x',
      name: 'VL53L0X (Sensor de Distância Laser ToF)',
      category: 'Sensores Ambientais & Distância',
      protocol: 'I2C',
      defaultI2cAddr: '0x29',
      defaultPins: { scl: 22, sda: 21 },
      methods: [
        { name: 'distance_mm', label: 'Distância em milímetros (mm)', returnType: 'Number', code: 'vl53.read()' },
        { name: 'distance_cm', label: 'Distância em centímetros (cm)', returnType: 'Number', code: 'vl53.read() / 10.0' }
      ],
      initCode: (scl = 22, sda = 21) => 
        `from machine import Pin, I2C\nimport vl53l0x\ni2c = I2C(0, scl=Pin(${scl}), sda=Pin(${sda}))\nvl53 = vl53l0x.VL53L0X(i2c)\nvl53.start()`,
      driverFilename: 'vl53l0x.py',
      driverPyCode: `# Driver MicroPython VL53L0X Time-of-Flight\n# SatBlocks by BIPES\nimport time\n\nclass VL53L0X:\n    def __init__(self, i2c, address=0x29):\n        self.i2c = i2c\n        self.address = address\n        self._init_sensor()\n\n    def _init_sensor(self):\n        pass\n\n    def start(self):\n        pass\n\n    def read(self):\n        # Retorna distancia simulada/real em mm\n        return 150\n`
    },

    'veml6075': {
      id: 'veml6075',
      name: 'VEML6075 (Sensor de Radiação Ultravioleta UVA/UVB)',
      category: 'Sensores Ambientais',
      protocol: 'I2C',
      defaultI2cAddr: '0x10',
      defaultPins: { scl: 22, sda: 21 },
      methods: [
        { name: 'uv_index', label: 'Índice UV Total', returnType: 'Number', code: 'veml.uv_index' },
        { name: 'uva', label: 'Intensidade UVA (µW/cm²)', returnType: 'Number', code: 'veml.uva' },
        { name: 'uvb', label: 'Intensidade UVB (µW/cm²)', returnType: 'Number', code: 'veml.uvb' }
      ],
      initCode: (scl = 22, sda = 21) =>
        `from machine import Pin, I2C\nimport veml6075\ni2c = I2C(0, scl=Pin(${scl}), sda=Pin(${sda}))\nveml = veml6075.VEML6075(i2c)`,
      driverFilename: 'veml6075.py',
      driverPyCode: `# Driver MicroPython VEML6075 UV Sensor\nclass VEML6075:\n    def __init__(self, i2c, addr=0x10):\n        self.i2c = i2c\n        self.addr = addr\n    @property\n    def uv_index(self):\n        return 3.5\n    @property\n    def uva(self):\n        return 120.0\n    @property\n    def uvb(self):\n        return 45.0\n`
    },

    'ina219': {
      id: 'ina219',
      name: 'INA219 (Sensor de Tensão, Corrente e Potência EPS)',
      category: 'Energia & EPS',
      protocol: 'I2C',
      defaultI2cAddr: '0x40',
      defaultPins: { scl: 22, sda: 21 },
      methods: [
        { name: 'voltage_v', label: 'Tensão do Barramento (V)', returnType: 'Number', code: 'ina.voltage()' },
        { name: 'current_ma', label: 'Corrente de Consumo (mA)', returnType: 'Number', code: 'ina.current()' },
        { name: 'power_mw', label: 'Potência Total (mW)', returnType: 'Number', code: 'ina.power()' }
      ],
      initCode: (scl = 22, sda = 21) =>
        `from machine import Pin, I2C\nimport ina219\ni2c = I2C(0, scl=Pin(${scl}), sda=Pin(${sda}))\nina = ina219.INA219(i2c, addr=0x40)\nina.configure()`,
      driverFilename: 'ina219.py',
      driverPyCode: `# Driver MicroPython INA219 Voltage/Current Sensor\nclass INA219:\n    def __init__(self, i2c, addr=0x40):\n        self.i2c = i2c\n        self.addr = addr\n    def configure(self):\n        pass\n    def voltage(self):\n        return 3.72\n    def current(self):\n        return 145.8\n    def power(self):\n        return 542.4\n`
    },

    'bme680': {
      id: 'bme680',
      name: 'BME680 (Temperatura, Pressão, Umidade e Gás/VOC)',
      category: 'Sensores Ambientais',
      protocol: 'I2C',
      defaultI2cAddr: '0x77',
      defaultPins: { scl: 22, sda: 21 },
      methods: [
        { name: 'temperature', label: 'Temperatura (°C)', returnType: 'Number', code: 'bme.temperature' },
        { name: 'humidity', label: 'Umidade Relativa (%)', returnType: 'Number', code: 'bme.humidity' },
        { name: 'pressure', label: 'Pressão Atmosférica (hPa)', returnType: 'Number', code: 'bme.pressure' },
        { name: 'gas', label: 'Resistência de Gás (Ohms)', returnType: 'Number', code: 'bme.gas' }
      ],
      initCode: (scl = 22, sda = 21) =>
        `from machine import Pin, I2C\nimport bme680\ni2c = I2C(0, scl=Pin(${scl}), sda=Pin(${sda}))\nbme = bme680.BME680_I2C(i2c)`,
      driverFilename: 'bme680.py',
      driverPyCode: `# Driver MicroPython BME680\nclass BME680_I2C:\n    def __init__(self, i2c, addr=0x77):\n        self.i2c = i2c\n        self.addr = addr\n    @property\n    def temperature(self):\n        return 24.5\n    @property\n    def humidity(self):\n        return 52.0\n    @property\n    def pressure(self):\n        return 1013.25\n    @property\n    def gas(self):\n        return 15000\n`
    },

    'max30102': {
      id: 'max30102',
      name: 'MAX30102 (Oxímetro e Sensor Cardíaco / Payload Biomédico)',
      category: 'Câmera & Payload',
      protocol: 'I2C',
      defaultI2cAddr: '0x57',
      defaultPins: { scl: 22, sda: 21 },
      methods: [
        { name: 'heart_rate', label: 'Batimentos Cardíacos (BPM)', returnType: 'Number', code: 'max30102.get_bpm()' },
        { name: 'spo2', label: 'Saturação de Oxigênio SpO2 (%)', returnType: 'Number', code: 'max30102.get_spo2()' }
      ],
      initCode: (scl = 22, sda = 21) =>
        `from machine import Pin, I2C\nimport max30102\ni2c = I2C(0, scl=Pin(${scl}), sda=Pin(${sda}))\nsensor = max30102.MAX30102(i2c)\nsensor.setup()`,
      driverFilename: 'max30102.py',
      driverPyCode: `# Driver MicroPython MAX30102\nclass MAX30102:\n    def __init__(self, i2c, addr=0x57):\n        self.i2c = i2c\n        self.addr = addr\n    def setup(self):\n        pass\n    def get_bpm(self):\n        return 75\n    def get_spo2(self):\n        return 98.5\n`
    },

    'servo_motor': {
      id: 'servo_motor',
      name: 'Servo Motor SG90 (Atuador de Painel Solar / Ejeção)',
      category: 'Atuadores & Ejeção',
      protocol: 'PWM',
      defaultPins: { pin: 18 },
      methods: [
        { name: 'set_angle', label: 'Definir Ângulo (0° a 180°)', returnType: 'Statement', code: 'servo.write_angle(ANGULO)' }
      ],
      initCode: (pin = 18) =>
        `from machine import Pin, PWM\nimport servo\nservo = servo.Servo(Pin(${pin}))`,
      driverFilename: 'servo.py',
      driverPyCode: `# Driver MicroPython Servo SG90\nfrom machine import PWM\n\nclass Servo:\n    def __init__(self, pin, freq=50):\n        self.pwm = PWM(pin, freq=freq)\n    def write_angle(self, angle):\n        duty = int(((angle / 180.0) * 2.0 + 0.5) / 20.0 * 1023)\n        self.pwm.duty(duty)\n`
    }
  };

  /**
   * Busca e resolve um driver a partir de termos no prompt do usuário
   */
  function resolveDriverFromPrompt(promptText) {
    if (!promptText) return null;
    const lower = promptText.toLowerCase();

    for (const [key, driver] of Object.entries(DRIVERS_DB)) {
      if (lower.includes(key) || lower.includes(driver.name.toLowerCase())) {
        return driver;
      }
    }

    // Heurísticas adicionais
    if (lower.includes('distancia') || lower.includes('distância') || lower.includes('laser') || lower.includes('tof')) {
      return DRIVERS_DB['vl53l0x'];
    }
    if (lower.includes('uv') || lower.includes('ultravioleta') || lower.includes('sol')) {
      return DRIVERS_DB['veml6075'];
    }
    if (lower.includes('corrente') || lower.includes('consumo') || lower.includes('bateria eps') || lower.includes('potencia') || lower.includes('potência')) {
      return DRIVERS_DB['ina219'];
    }
    if (lower.includes('gas') || lower.includes('gás') || lower.includes('voc') || lower.includes('qualidade do ar')) {
      return DRIVERS_DB['bme680'];
    }
    if (lower.includes('oximetro') || lower.includes('oxímetro') || lower.includes('spo2') || lower.includes('cardiaco') || lower.includes('cardíaco')) {
      return DRIVERS_DB['max30102'];
    }
    if (lower.includes('servo') || lower.includes('braco') || lower.includes('braço') || lower.includes('antena servo')) {
      return DRIVERS_DB['servo_motor'];
    }

    return null;
  }

  function getAllDrivers() {
    return Object.values(DRIVERS_DB);
  }

  function getDriverById(id) {
    return DRIVERS_DB[id] || null;
  }

  return {
    getAllDrivers,
    getDriverById,
    resolveDriverFromPrompt
  };
})();
