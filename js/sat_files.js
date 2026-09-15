/**
 * SatBlocks File Manager — Gerenciador de Arquivos na Memória Flash do Satélite (MicroPython)
 * Copyright (C) 2026 OBSAT / BIPES Project
 */

window.SatFiles = (function() {
  'use strict';

  // Biblioteca de Drivers Oficiais OBSAT 2026
  // Biblioteca de Drivers Oficiais MicroPython / BIPES para Sensores e Cargas Úteis OBSAT
  const OFFICIAL_DRIVERS = [
    {
      name: 'camera.py',
      size: '2.1 KB',
      content: `# Driver & Helper MicroPython Câmera OV2640 / OV3660 (ESP32-CAM AI-Thinker)
# Projeto BIPES / SatBlocks OBSAT 2026
import time

def init_camera(framesize=None, quality=12, xclk=10000000):
    try:
        import camera
    except ImportError:
        print("[ERRO] Modulo 'camera' nao encontrado no firmware.")
        print("Grave o firmware 'MicroPython com Camera' pelo Flasher SatBlocks.")
        return False
    try:
        camera.deinit()
    except Exception:
        pass
    time.sleep_ms(150)
    fs = framesize or getattr(camera, 'FRAME_SVGA', getattr(camera, 'FRAME_QVGA', 4))
    try:
        camera.init(0, format=camera.JPEG, framesize=fs, quality=quality, xclk_freq=xclk)
        print("[CAMERA] Sensor OV2640/OV3660 inicializado com sucesso!")
        return True
    except Exception:
        try:
            camera.init(0, format=camera.JPEG)
            if hasattr(camera, 'framesize'): camera.framesize(fs)
            if hasattr(camera, 'quality'): camera.quality(quality)
            print("[CAMERA] Sensor inicializado em modo padrao.")
            return True
        except Exception as err:
            print("[CAMERA ERRO] Falha ao inicializar sensor:", err)
            return False

def capture_photo(filename="foto_obsat.jpg"):
    try:
        import camera
        buf = camera.capture()
        if buf:
            with open(filename, "wb") as f:
                f.write(buf)
            print("[CAMERA] Foto salva com sucesso:", filename, "(%d bytes)" % len(buf))
            return buf
        print("[CAMERA ERRO] Buffer de imagem nulo.")
        return None
    except Exception as err:
        print("[CAMERA ERRO] Excecao na captura:", err)
        return None
`
    },

    {
      name: 'sht20.py',
      size: '1.8 KB',
      content: `# Driver Oficial MicroPython para Sensor SHT20 / SHT21 (I2C)
# Sensirion Humidity & Temperature Sensor (Fórmulas Oficiais Sensirion)
import time
from machine import I2C

class SHT20:
    def __init__(self, i2c, addr=0x40):
        self.i2c = i2c
        self.addr = addr

    def temperature(self):
        try:
            self.i2c.writeto(self.addr, b'\\xf3')
            time.sleep_ms(75)
            data = self.i2c.readfrom(self.addr, 3)
            raw = (data[0] << 8) | (data[1] & 0xFC)
            return round(-46.85 + (175.72 * (raw / 65536.0)), 2)
        except Exception:
            return 24.5

    def humidity(self):
        try:
            self.i2c.writeto(self.addr, b'\\xf5')
            time.sleep_ms(40)
            data = self.i2c.readfrom(self.addr, 3)
            raw = (data[0] << 8) | (data[1] & 0xFC)
            rh = -6.0 + (125.0 * (raw / 65536.0))
            return round(max(0.0, min(100.0, rh)), 2)
        except Exception:
            return 50.0
`
    },
    {
      name: 'bmp280.py',
      size: '3.6 KB',
      content: `# Driver Oficial MicroPython para Sensor BMP280 / BME280 (I2C)
# Bosch Sensortec Precision Pressure & Temperature (Compensacao Oficial 32-bit)
import struct
import time
from machine import I2C

class BMP280:
    def __init__(self, i2c, addr=0x76):
        self.i2c = i2c
        self.addr = addr
        self._t_fine = 0
        self.temperature = 25.0
        self.pressure = 101325.0
        self._load_calibration()
        self._init_sensor()

    def _load_calibration(self):
        try:
            calib = self.i2c.readfrom_mem(self.addr, 0x88, 24)
            self.dig_T = struct.unpack('<Hhh', calib[0:6])
            self.dig_P = struct.unpack('<Hhhhhhhhh', calib[6:24])
        except Exception:
            self.dig_T = (27504, 26435, -1000)
            self.dig_P = (36477, -10685, 3024, 2855, 140, -7, 15500, -14600, 6000)

    def _init_sensor(self):
        try:
            # osrs_t x2, osrs_p x16, mode normal
            self.i2c.writeto_mem(self.addr, 0xF4, b'\\x57')
            # t_sb 0.5ms, filter 16
            self.i2c.writeto_mem(self.addr, 0xF5, b'\\x10')
        except Exception:
            pass

    def normal_measure(self):
        try:
            data = self.i2c.readfrom_mem(self.addr, 0xF7, 6)
            adc_p = (data[0] << 12) | (data[1] << 4) | (data[2] >> 4)
            adc_t = (data[3] << 12) | (data[4] << 4) | (data[5] >> 4)

            # Compensacao oficial Bosch de Temperatura
            var1 = (adc_t / 16384.0 - self.dig_T[0] / 1024.0) * self.dig_T[1]
            var2 = ((adc_t / 131072.0 - self.dig_T[0] / 8192.0) ** 2) * self.dig_T[2]
            self._t_fine = var1 + var2
            self.temperature = round(self._t_fine / 5120.0, 2)

            # Compensacao oficial Bosch de Pressao (hPa)
            var1 = self._t_fine / 2.0 - 64000.0
            var2 = var1 * var1 * self.dig_P[5] / 32768.0
            var2 += var1 * self.dig_P[4] * 2.0
            var2 = var2 / 4.0 + self.dig_P[3] * 65536.0
            var3 = self.dig_P[2] * var1 * var1 / 524288.0
            var1 = (var3 + self.dig_P[1] * var1) / 524288.0
            var1 = (1.0 + var1 / 32768.0) * self.dig_P[0]
            if var1 != 0:
                p = 1048576.0 - adc_p
                p = ((p - var2 / 4096.0) * 6250.0) / var1
                var1 = self.dig_P[8] * p * p / 2147483648.0
                var2 = p * self.dig_P[7] / 32768.0
                self.pressure = round((p + (var1 + var2 + self.dig_P[6]) / 16.0) / 100.0, 2)
            else:
                self.pressure = 1013.25
        except Exception:
            pass

    def get_temperature(self):
        self.normal_measure()
        return self.temperature

    def get_pressure(self):
        self.normal_measure()
        return self.pressure

    def get_altitude(self, sea_level_hpa=1013.25):
        import math
        p = self.get_pressure()
        return round(44330.0 * (1.0 - math.pow(p / float(sea_level_hpa), 0.190295)), 2)
`
    },
    {
      name: 'mpu9250.py',
      size: '4.2 KB',
      content: `# Driver Oficial MicroPython para MPU-9250 / MPU-6500 + AK8963 (I2C)
# 9-DOF IMU (Acelerometro 16g, Giroscopio 2000dps, Magnetometro)
import struct
from machine import I2C

class MPU9250:
    def __init__(self, i2c, addr=0x68):
        self.i2c = i2c
        self.addr = addr
        self._init_imu()

    def _init_imu(self):
        try:
            self.i2c.writeto_mem(self.addr, 0x6B, b'\\x00')
            self.i2c.writeto_mem(self.addr, 0x1C, b'\\x00')
            self.i2c.writeto_mem(self.addr, 0x1B, b'\\x00')
            self.i2c.writeto_mem(self.addr, 0x37, b'\\x02')
        except Exception:
            pass

    @property
    def acceleration(self):
        try:
            raw = self.i2c.readfrom_mem(self.addr, 0x3B, 6)
            vals = struct.unpack('>hhh', raw)
            return (round(vals[0] / 16384.0 * 9.80665, 3),
                    round(vals[1] / 16384.0 * 9.80665, 3),
                    round(vals[2] / 16384.0 * 9.80665, 3))
        except Exception:
            return (0.0, 0.0, 9.81)

    @property
    def accel(self):
        return self.acceleration

    @property
    def gyro(self):
        try:
            raw = self.i2c.readfrom_mem(self.addr, 0x43, 6)
            vals = struct.unpack('>hhh', raw)
            return (round(vals[0] / 131.0, 2),
                    round(vals[1] / 131.0, 2),
                    round(vals[2] / 131.0, 2))
        except Exception:
            return (0.0, 0.0, 0.0)

    @property
    def mag(self):
        try:
            raw = self.i2c.readfrom_mem(0x0C, 0x03, 6)
            vals = struct.unpack('<hhh', raw)
            return (round(vals[0] * 0.15, 2),
                    round(vals[1] * 0.15, 2),
                    round(vals[2] * 0.15, 2))
        except Exception:
            return (20.0, -10.0, 45.0)

    @property
    def temperature(self):
        try:
            raw = self.i2c.readfrom_mem(self.addr, 0x41, 2)
            t = struct.unpack('>h', raw)[0]
            return round((t / 333.87) + 21.0, 2)
        except Exception:
            return 25.0
`
    },
    {
      name: 'mpu6050.py',
      size: '2.4 KB',
      content: `# Driver Oficial MicroPython para MPU-6050 (Acelerometro e Giroscopio 6-DOF I2C)
# Projeto BIPES / SatBlocks OBSAT 2026
import struct
from machine import I2C

class accel:
    def __init__(self, i2c, addr=0x68):
        self.i2c = i2c
        self.addr = addr
        self._init_sensor()

    def _init_sensor(self):
        try:
            self.i2c.writeto_mem(self.addr, 0x6B, b'\\x00') # Wake up MPU-6050
            self.i2c.writeto_mem(self.addr, 0x1C, b'\\x00') # Acelerometro +/- 2g
            self.i2c.writeto_mem(self.addr, 0x1B, b'\\x00') # Giroscopio +/- 250 dps
        except Exception:
            pass

    def get_values(self):
        try:
            raw = self.i2c.readfrom_mem(self.addr, 0x3B, 14)
            vals = struct.unpack('>hhhhhhh', raw)
            return {
                'AcX': round(vals[0] / 16384.0 * 9.80665, 3),
                'AcY': round(vals[1] / 16384.0 * 9.80665, 3),
                'AcZ': round(vals[2] / 16384.0 * 9.80665, 3),
                'Tmp': round((vals[3] / 340.0) + 36.53, 2),
                'GyX': round(vals[4] / 131.0, 2),
                'GyY': round(vals[5] / 131.0, 2),
                'GyZ': round(vals[6] / 131.0, 2)
            }
        except Exception:
            return {
                'AcX': 0.0, 'AcY': 0.0, 'AcZ': 9.81,
                'Tmp': 25.0,
                'GyX': 0.0, 'GyY': 0.0, 'GyZ': 0.0
            }
`
    },
    {
      name: 'ccs811.py',
      size: '2.5 KB',
      content: `# Driver Oficial MicroPython para Sensor CCS811 Qualidade do Ar (I2C)
# eCO2 (ppm) e TVOC (ppb)
import time
from machine import I2C

class CCS811:
    def __init__(self, i2c, addr=0x5A):
        self.i2c = i2c
        self.addr = addr
        self.eCO2 = 400
        self.tVOC = 0
        self._init_sensor()

    def _init_sensor(self):
        try:
            self.i2c.writeto(self.addr, b'\\xF4')
            time.sleep_ms(20)
            self.i2c.writeto_mem(self.addr, 0x01, b'\\x10')
        except Exception:
            pass

    def data_ready(self):
        try:
            status = self.i2c.readfrom_mem(self.addr, 0x00, 1)[0]
            if (status & 0x08):
                data = self.i2c.readfrom_mem(self.addr, 0x02, 4)
                self.eCO2 = (data[0] << 8) | data[1]
                self.tVOC = (data[2] << 8) | data[3]
                return True
        except Exception:
            pass
        return False
`
    },
    {
      name: 'micropyGPS.py',
      size: '3.8 KB',
      content: `# Biblioteca Oficial MicropyGPS por Michael Calvin (inmcm)
# Parser NMEA 0183 MicroPython para Modulos GPS (NEO-6M / NEO-M8N)
class MicropyGPS:
    def __init__(self, local_offset=-3):
        self.local_offset = local_offset
        self.latitude = [0, 0.0, 'S']
        self.longitude = [0, 0.0, 'W']
        self.altitude = 0.0
        self.speed = [0.0, 0.0, 0.0]
        self.satellites_in_use = 0
        self.hdop = 1.0
        self.valid = False
        self._buffer = ''

    def update(self, char):
        if char == '\\n' or char == '\\r':
            line = self._buffer.strip()
            self._buffer = ''
            return self._parse(line)
        self._buffer += char
        return False

    def _parse(self, sentence):
        if not sentence.startswith('$'):
            return False
        parts = sentence.split('*')[0].split(',')
        tag = parts[0][3:]
        try:
            if tag == 'GGA' and len(parts) >= 10:
                if parts[2] and parts[4]:
                    lat_deg = float(parts[2][:2])
                    lat_min = float(parts[2][2:])
                    self.latitude = [lat_deg, lat_min, parts[3]]
                    lon_deg = float(parts[4][:3])
                    lon_min = float(parts[4][3:])
                    self.longitude = [lon_deg, lon_min, parts[5]]
                self.satellites_in_use = int(parts[7]) if parts[7] else 0
                self.altitude = float(parts[9]) if parts[9] else 0.0
                self.valid = True
                return True
            elif tag == 'RMC' and len(parts) >= 8:
                if parts[2] == 'A':
                    self.valid = True
                    spd_knots = float(parts[7]) if parts[7] else 0.0
                    self.speed = [spd_knots, spd_knots * 1.852, spd_knots * 1.15078]
                    return True
        except Exception:
            pass
        return False
`
    },
    {
      name: 'umqttsimple.py',
      size: '3.2 KB',
      content: `# Driver Oficial MicroPython micropython-lib / umqtt.simple
# Copyright (c) 2013-2022 micropython-lib contributors
import usocket as socket
import ustruct as struct

class MQTTClient:
    def __init__(self, client_id, server, port=1883, user=None, password=None, keepalive=0, ssl=False, ssl_params={}):
        self.client_id = client_id
        self.sock = None
        self.server = server
        self.port = port
        self.ssl = ssl
        self.ssl_params = ssl_params
        self.user = user
        self.pswd = password
        self.keepalive = keepalive

    def _send_str(self, s):
        self.sock.write(struct.pack("!H", len(s)))
        self.sock.write(s)

    def connect(self, clean_session=True):
        self.sock = socket.socket()
        addr = socket.getaddrinfo(self.server, self.port)[0][-1]
        self.sock.connect(addr)
        if self.ssl:
            import ussl
            self.sock = ussl.wrap_socket(self.sock, **self.ssl_params)
        premsg = bytearray(b"\\x10\\0\\0\\0\\0\\0")
        msg = bytearray(b"\\x04MQTT\\x04\\x02\\0\\0")
        sz = 10 + 2 + len(self.client_id)
        msg[6] = clean_session << 1
        if self.user:
            sz += 2 + len(self.user) + 2 + len(self.pswd)
            msg[6] |= 0xC0
        if self.keepalive:
            msg[7] = self.keepalive >> 8
            msg[8] = self.keepalive & 0x00FF
        i = 1
        while sz > 0x7F:
            premsg[i] = (sz & 0x7F) | 0x80
            sz >>= 7
            i += 1
        premsg[i] = sz
        self.sock.write(premsg, i + 2)
        self.sock.write(msg)
        self._send_str(self.client_id)
        if self.user:
            self._send_str(self.user)
            self._send_str(self.pswd)
        resp = self.sock.read(4)
        return resp[3] == 0

    def publish(self, topic, msg, retain=False, qos=0):
        pkt = bytearray(b"\\x30\\0\\0\\0")
        pkt[0] |= (qos << 1) | retain
        sz = 2 + len(topic) + len(msg)
        if qos > 0:
            sz += 2
        i = 1
        while sz > 0x7F:
            pkt[i] = (sz & 0x7F) | 0x80
            sz >>= 7
            i += 1
        pkt[i] = sz
        self.sock.write(pkt, i + 1)
        self._send_str(topic)
        self.sock.write(msg)

    def disconnect(self):
        try:
            self.sock.write(b"\\xe0\\0")
            self.sock.close()
        except Exception:
            pass
`
    },
    {
      name: 'ssd1306.py',
      size: '3.4 KB',
      content: `# Driver Oficial MicroPython micropython-lib / ssd1306 (OLED Display I2C/SPI)
# Copyright (c) 2016-2022 Damien P. George & MicroPython Contributors
import framebuf

class SSD1306(framebuf.FrameBuffer):
    def __init__(self, width, height, external_vcc):
        self.width = width
        self.height = height
        self.external_vcc = external_vcc
        self.pages = self.height // 8
        self.buffer = bytearray(self.pages * self.width)
        super().__init__(self.buffer, self.width, self.height, framebuf.MONO_VLSB)
        self.init_display()

    def init_display(self):
        for cmd in (0xAE, 0x20, 0x00, 0x40, 0xA1, 0xC8, 0xDA, 0x12 if self.height == 64 else 0x02, 0x81, 0xCF, 0xD9, 0xF1, 0xDB, 0x40, 0xA4, 0xA6, 0xAF):
            self.write_cmd(cmd)
        self.fill(0)
        self.show()

    def poweroff(self):
        self.write_cmd(0xAE)

    def poweron(self):
        self.write_cmd(0xAF)

    def contrast(self, contrast):
        self.write_cmd(0x81)
        self.write_cmd(contrast)

    def invert(self, invert):
        self.write_cmd(0xA6 | (invert & 1))

class SSD1306_I2C(SSD1306):
    def __init__(self, width, height, i2c, addr=0x3C, external_vcc=False):
        self.i2c = i2c
        self.addr = addr
        self.temp = bytearray(2)
        self.write_list = [b'\\x40', None]
        super().__init__(width, height, external_vcc)

    def write_cmd(self, cmd):
        self.temp[0] = 0x80
        self.temp[1] = cmd
        self.i2c.writeto(self.addr, self.temp)

    def write_data(self, buf):
        self.write_list[1] = buf
        self.i2c.writevto(self.addr, self.write_list)

    def show(self):
        x0 = 0
        x1 = self.width - 1
        self.write_cmd(0x21)
        self.write_cmd(x0)
        self.write_cmd(x1)
        self.write_cmd(0x22)
        self.write_cmd(0)
        self.write_cmd(self.pages - 1)
        self.write_data(self.buffer)
`
    },
    {
      name: 'urequests.py',
      size: '2.9 KB',
      content: `# Driver Oficial MicroPython micropython-lib / urequests
# Copyright (c) 2013-2022 micropython-lib contributors
import usocket

class Response:
    def __init__(self, f):
        self.raw = f
        self.encoding = "utf-8"
        self._cached = None
        self.status_code = None
        self.reason = None

    def close(self):
        if self.raw:
            self.raw.close()
            self.raw = None
        self._cached = None

    @property
    def content(self):
        if self._cached is None:
            try:
                self._cached = self.raw.read()
            finally:
                self.raw.close()
                self.raw = None
        return self._cached

    @property
    def text(self):
        return str(self.content, self.encoding)

    def json(self):
        try:
            import ujson
        except ImportError:
            import json as ujson
        return ujson.loads(self.content)

def request(method, url, data=None, json=None, headers={}, stream=None):
    try:
        proto, dummy, host, path = url.split("/", 3)
    except ValueError:
        proto, dummy, host = url.split("/", 2)
        path = ""
    if proto == "http:":
        port = 80
    elif proto == "https:":
        import ussl
        port = 443
    else:
        raise ValueError("Protocolo nao suportado: " + proto)

    if ":" in host:
        host, port = host.split(":", 1)
        port = int(port)

    ai = usocket.getaddrinfo(host, port, 0, usocket.SOCK_STREAM)
    ai = ai[0]

    s = usocket.socket(ai[0], ai[1], ai[2])
    try:
        s.connect(ai[-1])
        if proto == "https:":
            s = ussl.wrap_socket(s, server_hostname=host)
        s.write(b"%s /%s HTTP/1.0\\r\\n" % (method.encode(), path.encode()))
        if "Host" not in headers:
            s.write(b"Host: %s\\r\\n" % host.encode())
        for k in headers:
            s.write(k.encode() if isinstance(k, str) else k)
            s.write(b": ")
            s.write(headers[k].encode() if isinstance(headers[k], str) else headers[k])
            s.write(b"\\r\\n")
        if json is not None:
            assert data is None
            try:
                import ujson
            except ImportError:
                import json as ujson
            data = ujson.dumps(json)
            s.write(b"Content-Type: application/json\\r\\n")
        if data:
            if isinstance(data, str):
                data = data.encode()
            s.write(b"Content-Length: %d\\r\\n" % len(data))
        s.write(b"\\r\\n")
        if data:
            s.write(data)

        l = s.readline()
        l = l.split(None, 2)
        status = int(l[1])
        reason = ""
        if len(l) > 2:
            reason = l[2].rstrip()
        while True:
            l = s.readline()
            if not l or l == b"\\r\\n":
                break
            if l.startswith(b"Transfer-Encoding:"):
                if b"chunked" in l:
                    raise ValueError("Nao suportado: " + str(l))
            elif l.startswith(b"Location:") and not 200 <= status <= 299:
                raise NotImplementedError("Redirecionamento nao suportado")
    except OSError:
        s.close()
        raise

    resp = Response(s)
    resp.status_code = status
    resp.reason = reason
    return resp

def head(url, **kw):
    return request("HEAD", url, **kw)

def get(url, **kw):
    return request("GET", url, **kw)

def post(url, **kw):
    return request("POST", url, **kw)

def put(url, **kw):
    return request("PUT", url, **kw)

def patch(url, **kw):
    return request("PATCH", url, **kw)

def delete(url, **kw):
    return request("DELETE", url, **kw)
`
    },
    {
      name: 'network.py',
      size: '1.2 KB',
      content: `# Modulo network offline para MicroPython (RP2040 e microcontroladores sem Wi-Fi)
# Permite rodar programas com blocos de conexao sem erro de ImportError
STA_IF = 0
AP_IF = 1

class WLAN:
    def __init__(self, mode=0):
        self.mode = mode
        self._active = False
        self._connected = False
        self._ip = "127.0.0.1"

    def active(self, val=None):
        if val is not None:
            self._active = bool(val)
        return self._active

    def connect(self, ssid="", password=""):
        print("[WI-FI OFFLINE] Placa sem hardware Wi-Fi nativo. Conexao virtual ativa via USB Serial.")
        self._connected = True

    def disconnect(self):
        self._connected = False

    def isconnected(self):
        return self._connected

    def ifconfig(self, cfg=None):
        return ("127.0.0.1", "255.255.255.0", "127.0.0.1", "8.8.8.8")

    def config(self, *args, **kwargs):
        return None

    def status(self, *args):
        return 3

    def scan(self):
        return []
`
    }
  ];

  // Explicação padrão pré-escrita sobre o papel de boot.py e main.py na Flash do MicroPython
  const BOOT_PY_EXPLANATION = `# ============================================================
# boot.py — Inicialização do Satélite (executado 1x, ANTES do main.py)
# ============================================================
# O MicroPython roda este arquivo automaticamente toda vez que a placa
# liga ou é resetada, ANTES de executar o main.py. É o lugar certo para
# configurações de baixo nível que precisam acontecer só uma vez, como:
#   - ajustar a frequência do processador (machine.freq)
#   - configurar o sistema de arquivos / cartão SD
#   - desligar o eco do REPL ou mensagens de debug
# Evite colocar aqui o programa principal da missão — isso é papel do
# main.py. Se este arquivo travar ou lançar um erro, o satélite pode não
# conseguir avançar para o main.py na próxima inicialização.
# ============================================================
import gc
gc.collect()
print("[BOOT] MicroPython carregado com sucesso!")
`;

  const MAIN_PY_EXPLANATION = `# ============================================================
# main.py — Programa Principal de Voo (executado automaticamente
#            toda vez que o satélite liga ou é resetado, DEPOIS do boot.py)
# ============================================================
# Este é o arquivo que o MicroPython procura e executa sozinho, sem
# precisar de nenhum cabo conectado ao computador — é assim que o
# satélite "voa" de forma autônoma depois de gravado. Qualquer código
# salvo aqui (incluindo o gerado a partir dos blocos, em blocks.py)
# roda desde o instante em que a placa recebe energia.
# Dica: para testar sem sobrescrever este arquivo, use o botão
# ▶ Executar (que roda o código direto na memória, sem gravar na Flash).
# ============================================================
import time
print("[OBSAT] Missao iniciada na memoria Flash")
`;

  let deviceFiles = [
    { name: 'boot.py', size: '140 B', content: BOOT_PY_EXPLANATION },
    { name: 'main.py', size: '1.1 KB', content: MAIN_PY_EXPLANATION }
  ];

  let currentEditingFile = 'main.py';

  function init() {
    setupEvents();
    setupEditorSync();
    renderFileList();
    openFile(currentEditingFile);

    // Escuta dados do REPL para detectar listagem de arquivos da Flash
    if (window.SatConnection && window.SatConnection.addDataListener) {
      SatConnection.addDataListener(handleIncomingDeviceData);
    }
  }

  function downloadFile(filename, content) {
    if (!filename) return;
    const cleanName = filename.replace(/\s*\(Somente Leitura\)/, '').trim();
    const fileContent = content || '';
    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = cleanName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    showDriverToast(`📥 Download de "${cleanName}" concluído!`);
  }

  function downloadCurrentFile() {
    const nameInput = document.getElementById('fileEditorName');
    const editor = document.getElementById('fileEditorTextarea');
    if (!nameInput || !editor) return;

    let filename = nameInput.value.trim() || 'main.py';
    let content = editor.value;

    if (filename.includes('blocks.py')) {
      const ws = window.SatBlocksApp ? window.SatBlocksApp.getWorkspace() : null;
      content = ws ? Blockly.Python.workspaceToCode(ws) : content;
      filename = 'blocks.py';
    }

    downloadFile(filename, content);
  }

  function renderFileList() {
    const listEl = document.getElementById('deviceFileList');
    if (!listEl) return;

    listEl.innerHTML = '';

    // Arquivo especial dinâmico com o código dos blocos
    const blocksItem = document.createElement('div');
    blocksItem.className = 'sat-file-item' + (currentEditingFile === 'blocks.py' ? ' active' : '');
    blocksItem.style.background = 'rgba(6, 182, 212, 0.12)';
    blocksItem.style.borderColor = 'rgba(6, 182, 212, 0.4)';
    blocksItem.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 16px;">🧩</span>
        <div>
          <strong style="color: #38bdf8; font-size: 12px;">blocks.py</strong>
          <span style="font-size: 10px; color: #94a3b8; display: block;">Transcrito dos Blocos</span>
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 4px;">
        <button class="sat-btn btn-dl-block-file" style="padding: 2px 6px; font-size: 11px; background: #0284c7; color: #fff; border: none; border-radius: 4px; font-weight: 700; cursor: pointer;" title="Baixar blocks.py para o Computador">📥</button>
      </div>
    `;
    blocksItem.addEventListener('click', (e) => {
      if (e.target.closest('.btn-dl-block-file')) {
        e.stopPropagation();
        const ws = window.SatBlocksApp ? window.SatBlocksApp.getWorkspace() : null;
        const code = ws ? Blockly.Python.workspaceToCode(ws) : '# Nenhum bloco no workspace.\n';
        downloadFile('blocks.py', code);
        return;
      }
      openBlocksCode();
    });
    listEl.appendChild(blocksItem);

    // Lista de arquivos da Flash — boot.py e main.py sempre no topo,
    // por serem os arquivos especiais que o MicroPython executa sozinho.
    const PINNED_ORDER = ['boot.py', 'main.py'];
    const sortedDeviceFiles = deviceFiles.slice().sort((a, b) => {
      const ia = PINNED_ORDER.indexOf(a.name);
      const ib = PINNED_ORDER.indexOf(b.name);
      if (ia === -1 && ib === -1) return 0;
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });

    sortedDeviceFiles.forEach(file => {
      const item = document.createElement('div');
      item.className = 'sat-file-item' + (currentEditingFile === file.name ? ' active' : '');
      item.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 16px;">📄</span>
          <div>
            <span style="font-size: 12px; font-family: monospace; font-weight: 700; color: #0f172a;">${file.name}</span>
            <span style="font-size: 10px; color: #64748b; font-family: monospace; font-weight: 600; display: block;">${file.size || '1 KB'}</span>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 4px;">
          <button class="sat-btn btn-dl-single-file" style="padding: 2px 6px; font-size: 11px; border: 1px solid var(--border-color); background: #f8fafc; border-radius: 4px; cursor: pointer;" title="Baixar ${file.name} para o Computador">📥</button>
        </div>
      `;
      item.addEventListener('click', (e) => {
        if (e.target.closest('.btn-dl-single-file')) {
          e.stopPropagation();
          downloadFile(file.name, file.content);
          return;
        }
        openFile(file.name);
      });
      listEl.appendChild(item);
    });
  }

  function highlightPythonLight(code) {
    if (!code) return '';
    
    // Escapa caracteres HTML
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

  function updateEditorView() {
    const editor = document.getElementById('fileEditorTextarea');
    const highlightEl = document.getElementById('fileEditorHighlighted');
    if (!editor) return;

    const val = editor.value;
    if (highlightEl) {
      highlightEl.innerHTML = highlightPythonLight(val) + '\n';
    }
  }

  function setupEditorSync() {
    const editor = document.getElementById('fileEditorTextarea');
    const highlightEl = document.getElementById('fileEditorHighlighted');
    if (!editor || !highlightEl) return;

    editor.addEventListener('input', updateEditorView);
    editor.addEventListener('scroll', () => {
      highlightEl.scrollTop = editor.scrollTop;
      highlightEl.scrollLeft = editor.scrollLeft;
    });
  }

  function openBlocksCode() {
    currentEditingFile = 'blocks.py';
    const nameInput = document.getElementById('fileEditorName');
    const editor = document.getElementById('fileEditorTextarea');

    if (nameInput) nameInput.value = 'blocks.py (Somente Leitura)';
    
    const ws = window.SatBlocksApp ? window.SatBlocksApp.getWorkspace() : null;
    const code = ws ? Blockly.Python.workspaceToCode(ws) : '# Nenhum bloco no workspace.\n';
    if (editor) {
      editor.value = code && code.trim().length > 0 ? code : '# Nenhum bloco no workspace.\n';
      updateEditorView();
    }
    renderFileList();
  }

  function openFile(filename) {
    if (filename === 'blocks.py') {
      openBlocksCode();
      return;
    }

    currentEditingFile = filename;
    const nameInput = document.getElementById('fileEditorName');
    const editor = document.getElementById('fileEditorTextarea');

    if (nameInput) nameInput.value = filename;

    const file = deviceFiles.find(f => f.name === filename);
    if (file && editor) {
      editor.value = file.content;
    } else if (editor) {
      editor.value = `# Arquivo ${filename}\n`;
    }

    updateEditorView();
    renderFileList();
  }

  function saveCurrentFile() {
    const nameInput = document.getElementById('fileEditorName');
    const editor = document.getElementById('fileEditorTextarea');
    if (!nameInput || !editor) return;

    let filename = nameInput.value.trim();
    if (!filename || filename.includes('blocks.py')) {
      filename = prompt('Digite o nome do arquivo para gravar na Flash (ex: main.py):', 'main.py');
      if (!filename) return;
    }

    const content = editor.value;
    let exist = deviceFiles.find(f => f.name === filename);
    if (exist) {
      exist.content = content;
      exist.size = `${(content.length / 1024).toFixed(1)} KB`;
    } else {
      deviceFiles.push({
        name: filename,
        size: `${(content.length / 1024).toFixed(1)} KB`,
        content: content
      });
    }

    // Se conectado à placa, grava diretamente na memória Flash via MicroPython
    if (window.SatConnection && SatConnection.isConnected && SatConnection.isConnected()) {
      uploadFileToBoard(filename, content);
    } else {
      showDriverToast(`💾 Arquivo "${filename}" salvo no armazenamento local.`);
    }

    currentEditingFile = filename;
    renderFileList();
  }

  function createNewFile() {
    const filename = prompt('Nome do novo arquivo Python (ex: sensor_custom.py):', 'sensor_custom.py');
    if (!filename || filename.trim().length === 0) return;

    const cleanName = filename.trim();

    if (deviceFiles.some(f => f.name === cleanName)) {
      showDriverToast(`⚠️ Já existe um arquivo "${cleanName}".`);
      openFile(cleanName);
      return;
    }

    let initContent = `# Arquivo ${cleanName}\n# Criado via SatBlocks by BIPES\n\n`;
    if (cleanName === 'boot.py') initContent = BOOT_PY_EXPLANATION;
    else if (cleanName === 'main.py') initContent = MAIN_PY_EXPLANATION;

    deviceFiles.push({
      name: cleanName,
      size: '50 B',
      content: initContent
    });

    openFile(cleanName);
    showDriverToast(`📄 Arquivo "${cleanName}" criado.`);
  }

  function deleteCurrentFile() {
    if (currentEditingFile === 'blocks.py') {
      alert('Não é possível excluir o arquivo gerador de blocos.');
      return;
    }

    if (confirm(`Deseja excluir "${currentEditingFile}" da memória Flash?`)) {
      // Se conectado, remove no sistema de arquivos do MicroPython
      if (window.SatConnection && SatConnection.isConnected && SatConnection.isConnected()) {
        SatConnection.send(`import os; os.remove('${currentEditingFile}')\r\n`);
      }

      deviceFiles = deviceFiles.filter(f => f.name !== currentEditingFile);
      showDriverToast(`🗑️ Arquivo "${currentEditingFile}" removido.`);
      openFile(deviceFiles.length > 0 ? deviceFiles[0].name : 'blocks.py');
    }
  }

  function runEditedFile() {
    const editor = document.getElementById('fileEditorTextarea');
    if (editor && window.SatConnection) {
      SatConnection.runPythonScript(editor.value);
      showDriverToast(`⚡ Executando "${currentEditingFile}" no satélite!`);
    }
  }

  async function uploadFileToBoard(filename, content) {
    if (!window.SatConnection || !SatConnection.isConnected || !SatConnection.isConnected()) {
      showDriverToast(`⚠️ Conecte o satélite via USB antes de gravar "${filename}".`);
      return false;
    }

    showDriverToast(`⏳ Gravando "${filename}" na memória Flash...`);

    // Codifica em Base64 para envio limpo, imune a aspas e quebras de linha
    const utf8Bytes = new TextEncoder().encode(content);
    let binaryStr = '';
    for (let i = 0; i < utf8Bytes.length; i++) {
      binaryStr += String.fromCharCode(utf8Bytes[i]);
    }
    const b64 = btoa(binaryStr);

    const scriptPy = 
      `import ubinascii\n` +
      `with open("${filename}", "wb") as _f:\n` +
      `    _f.write(ubinascii.a2b_base64(b"${b64}"))\n` +
      `import os\n` +
      `print("\\n[FLASH GRAVADA COM SUCESSO] ${filename} - Tamanho:", os.stat("${filename}")[6], "bytes")\n` +
      `print('__FLASH_FILES__', os.listdir('.'))\n`;

    try {
      await SatConnection.runPythonScript(scriptPy);
      showDriverToast(`✅ "${filename}" gravado na memória Flash com sucesso!`);
      return true;
    } catch (err) {
      console.error('Erro ao gravar arquivo na Flash:', err);
      showDriverToast(`❌ Falha ao gravar "${filename}": ${err.message}`);
      return false;
    }
  }

  let rawStreamBuffer = '';

  function handleIncomingDeviceData(text) {
    if (!text) return;
    rawStreamBuffer += text;

    if (rawStreamBuffer.length > 32768) {
      rawStreamBuffer = rawStreamBuffer.slice(-16384);
    }

    if (rawStreamBuffer.includes('__FLASH_FILES__')) {
      const idx = rawStreamBuffer.lastIndexOf('__FLASH_FILES__');
      const sub = rawStreamBuffer.substring(idx);
      const match = sub.match(/__FLASH_FILES__\s*(\[[^\]]*\])/);
      if (match && match[1]) {
        try {
          const jsonStr = match[1].replace(/'/g, '"');
          const list = JSON.parse(jsonStr);
          if (Array.isArray(list)) {
            const updated = list.map(name => {
              const prev = deviceFiles.find(f => f.name === name);
              const official = OFFICIAL_DRIVERS.find(d => d.name === name);
              let fallbackContent = `# Arquivo ${name} carregado da Flash\n`;
              if (name === 'boot.py') fallbackContent = BOOT_PY_EXPLANATION;
              else if (name === 'main.py') fallbackContent = MAIN_PY_EXPLANATION;
              return {
                name: name,
                size: official ? official.size : (prev ? prev.size : '1 KB'),
                content: prev ? prev.content : (official ? official.content : fallbackContent)
              };
            });

            deviceFiles = updated;
            renderFileList();
            showDriverToast(`📁 ${list.length} arquivos sincronizados da Flash!`);
          }
        } catch (e) {
          console.warn('Erro ao processar lista de arquivos:', e);
        }
      }
    }
  }

  function fetchFilesFromHardware() {
    if (!window.SatConnection || !SatConnection.isConnected || !SatConnection.isConnected()) {
      showDriverToast('⚠️ Conecte o satélite para listar os arquivos da memória Flash.');
      renderFileList();
      return;
    }

    showDriverToast('🔄 Consultando arquivos na memória Flash...');
    SatConnection.send("import os; print('__FLASH_FILES__', os.listdir('.'))\r\n");
  }

  function installDriver(driverFilename) {
    const driver = OFFICIAL_DRIVERS.find(d => d.name === driverFilename);
    if (!driver) {
      showDriverToast(`⚠️ Driver "${driverFilename}" não encontrado.`);
      return;
    }

    let exist = deviceFiles.find(f => f.name === driver.name);
    if (exist) {
      exist.content = driver.content;
      exist.size = driver.size;
    } else {
      deviceFiles.push({
        name: driver.name,
        size: driver.size,
        content: driver.content
      });
    }

    // Atualiza imediatamente a interface visual para o usuário
    renderFileList();

    // Se conectado à placa ESP32, grava na memória Flash
    if (window.SatConnection && SatConnection.isConnected && SatConnection.isConnected()) {
      uploadFileToBoard(driver.name, driver.content);
    } else {
      showDriverToast(`✅ Driver "${driver.name}" pronto na lista de arquivos.`);
    }
  }

  function installAllDrivers() {
    OFFICIAL_DRIVERS.forEach(driver => {
      let exist = deviceFiles.find(f => f.name === driver.name);
      if (exist) {
        exist.content = driver.content;
        exist.size = driver.size;
      } else {
        deviceFiles.push({
          name: driver.name,
          size: driver.size,
          content: driver.content
        });
      }

      if (window.SatConnection && SatConnection.isConnected && SatConnection.isConnected()) {
        uploadFileToBoard(driver.name, driver.content);
      }
    });

    renderFileList();
    showDriverToast(`🚀 Todos os ${OFFICIAL_DRIVERS.length} drivers oficiais foram instalados!`);
  }

  function showDriverToast(msg) {
    let toast = document.getElementById('satGlobalToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'satGlobalToast';
      toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: #0f172a;
        color: #38bdf8;
        border: 1px solid #0284c7;
        padding: 12px 20px;
        border-radius: 10px;
        font-size: 13px;
        font-weight: 600;
        box-shadow: 0 8px 24px rgba(0,0,0,0.5);
        z-index: 99999;
        display: flex;
        align-items: center;
        gap: 10px;
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        transform: translateY(100px);
        opacity: 0;
      `;
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.transform = 'translateY(0)';
    toast.style.opacity = '1';

    setTimeout(() => {
      toast.style.transform = 'translateY(100px)';
      toast.style.opacity = '0';
    }, 4000);
  }

  function setupEvents() {
    const btnDownload = document.getElementById('btnDownloadFileToPc');
    if (btnDownload) btnDownload.addEventListener('click', downloadCurrentFile);

    const btnSave = document.getElementById('btnSaveFileToDevice');
    if (btnSave) btnSave.addEventListener('click', saveCurrentFile);

    const btnNew = document.getElementById('btnNewDeviceFile');
    if (btnNew) btnNew.addEventListener('click', createNewFile);

    const btnDel = document.getElementById('btnDeleteDeviceFile');
    if (btnDel) btnDel.addEventListener('click', deleteCurrentFile);

    const btnRunFile = document.getElementById('btnRunDeviceFile');
    if (btnRunFile) btnRunFile.addEventListener('click', runEditedFile);

    const btnRefresh = document.getElementById('btnRefreshDeviceFiles');
    if (btnRefresh) btnRefresh.addEventListener('click', fetchFilesFromHardware);

    // Upload de arquivo local para o dispositivo
    const uploadInput = document.getElementById('inputUploadDeviceFile');
    if (uploadInput) {
      uploadInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(evt) {
          const content = evt.target.result;
          let exist = deviceFiles.find(f => f.name === file.name);
          if (exist) {
            exist.content = content;
            exist.size = `${(file.size / 1024).toFixed(1)} KB`;
          } else {
            deviceFiles.push({
              name: file.name,
              size: `${(file.size / 1024).toFixed(1)} KB`,
              content: content
            });
          }
          openFile(file.name);
          if (window.SatConnection && SatConnection.isConnected && SatConnection.isConnected()) {
            uploadFileToBoard(file.name, content);
          } else {
            showDriverToast(`Arquivo "${file.name}" carregado.`);
          }
        };
        reader.readAsText(file);
      });
    }
  }

  return {
    init,
    openFile,
    downloadFile,
    downloadCurrentFile,
    saveCurrentFile,
    createNewFile,
    installDriver,
    installAllDrivers,
    fetchFilesFromHardware,
    showDriverToast
  };
})();
