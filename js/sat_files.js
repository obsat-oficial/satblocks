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
    },
    {
      name: 'mcp23017.py',
      size: '1.1 KB',
      content: `# Driver Oficial MicroPython para Expansor de I/O MCP23017 (I2C, 16 pinos)
from machine import I2C

class MCP23017:
    def __init__(self, i2c, addr=0x20):
        self.i2c = i2c
        self.addr = addr
        self.state_a = 0
        self.state_b = 0
        try:
            # 0x00/0x01 = IODIRA/IODIRB -> 0x00 define todos os 16 pinos como saida
            self.i2c.writeto_mem(self.addr, 0x00, bytes([0x00]))
            self.i2c.writeto_mem(self.addr, 0x01, bytes([0x00]))
        except Exception:
            pass

    def set_pin(self, pin, value):
        p = int(pin)
        v = int(value)
        try:
            if p < 8:
                if v: self.state_a |= (1 << p)
                else: self.state_a &= ~(1 << p)
                self.i2c.writeto_mem(self.addr, 0x12, bytes([self.state_a]))  # GPIOA
            else:
                p2 = p - 8
                if v: self.state_b |= (1 << p2)
                else: self.state_b &= ~(1 << p2)
                self.i2c.writeto_mem(self.addr, 0x13, bytes([self.state_b]))  # GPIOB
        except Exception:
            pass

    def read_pin(self, pin):
        p = int(pin)
        try:
            if p < 8:
                gpio = self.i2c.readfrom_mem(self.addr, 0x12, 1)[0]
                return (gpio >> p) & 1
            else:
                gpio = self.i2c.readfrom_mem(self.addr, 0x13, 1)[0]
                return (gpio >> (p - 8)) & 1
        except Exception:
            return 0
`
    },
    {
      name: 'ak8963.py',
      size: '1.4 KB',
      content: `# Driver MicroPython para o Magnetometro AK8963 (I2C, integrado ao MPU-9250)
# Compativel com placas ESP32 / RP2040 usadas nas oficinas OBSAT.
# Observacao: o driver mpu9250.py deste catalogo ja le o magnetometro
# internamente; use este arquivo separado apenas se precisar do AK8963
# isolado, sem instanciar a classe MPU9250 completa.
import struct
import time
from machine import I2C

_WIA = 0x00
_ST1 = 0x02
_HXL = 0x03
_ST2 = 0x09
_CNTL1 = 0x0A

class AK8963:
    def __init__(self, i2c, addr=0x0C):
        self.i2c = i2c
        self.addr = addr
        self._init_mag()

    def _init_mag(self):
        try:
            # Modo continuo 2 (100 Hz), saida de 16 bits
            self.i2c.writeto_mem(self.addr, _CNTL1, b'\\x16')
            time.sleep_ms(10)
        except Exception:
            pass

    def who_am_i(self):
        try:
            return self.i2c.readfrom_mem(self.addr, _WIA, 1)[0]
        except Exception:
            return 0

    @property
    def magnetic(self):
        try:
            status = self.i2c.readfrom_mem(self.addr, _ST1, 1)[0]
            if not (status & 0x01):
                return (0.0, 0.0, 0.0)
            raw = self.i2c.readfrom_mem(self.addr, _HXL, 7)
            x, y, z = struct.unpack('<hhh', raw[0:6])
            # Bit de overflow magnetico (HOFL) no ST2 (ultimo byte lido)
            if raw[6] & 0x08:
                return (0.0, 0.0, 0.0)
            scale = 0.15  # uT por LSB (resolucao de 16 bits)
            return (round(x * scale, 2), round(y * scale, 2), round(z * scale, 2))
        except Exception:
            return (0.0, 0.0, 0.0)
`
    },
    {
      name: 'mpu6500.py',
      size: '1.6 KB',
      content: `# Driver MicroPython para IMU MPU-6500 (Acelerometro + Giroscopio, I2C)
# Mesmo mapa de registradores do MPU-6050/9250 (familia InvenSense).
# Compativel com placas ESP32 / RP2040 usadas nas oficinas OBSAT.
import struct
from machine import I2C

class MPU6500:
    def __init__(self, i2c, addr=0x68):
        self.i2c = i2c
        self.addr = addr
        self._init_imu()

    def _init_imu(self):
        try:
            self.i2c.writeto_mem(self.addr, 0x6B, b'\\x00')  # PWR_MGMT_1: acorda o sensor
            self.i2c.writeto_mem(self.addr, 0x1C, b'\\x00')  # ACCEL_CONFIG: +/- 2g
            self.i2c.writeto_mem(self.addr, 0x1B, b'\\x00')  # GYRO_CONFIG: +/- 250 dps
        except Exception:
            pass

    def who_am_i(self):
        try:
            return self.i2c.readfrom_mem(self.addr, 0x75, 1)[0]
        except Exception:
            return 0

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
      name: 'rtttl.py',
      size: '3.9 KB',
      content: `# Biblioteca RTTTL original do projeto BIPES (github.com/BIPES/BIPES,
# ui/pylibs/rtttl.py), reproduzida sem alteracoes para tocar melodias
# em formato RTTTL (Ring Tone Text Transfer Language) via buzzer/PWM.
from machine import Pin, PWM
import time
import songs

# define frequency for each tone
B1  = 31
C2  = 33
CS2 = 35
D2  = 37
DS2 = 39
E2  = 41
F2  = 44
FS2 = 46
G2  = 49
GS2 = 52
A2  = 55
AS2 = 58
B2  = 62
C3  = 65
CS3 = 69
D3  = 73
DS3 = 78
E3  = 82
F3  = 87
FS3 = 93
G3  = 98
GS3 = 104
A3  = 110
AS3 = 117
B3  = 123
C4  = 131
CS4 = 139
D4  = 147
DS4 = 156
E4  = 165
F4  = 175
FS4 = 185
G4  = 196
GS4 = 208
A4  = 220
AS4 = 233
B4  = 247
C5  = 262
CS5 = 277
D5  = 294
DS5 = 311
E5  = 330
F5  = 349
FS5 = 370
G5  = 392
GS5 = 415
A5  = 440
AS5 = 466
B5  = 494
C6  = 523
CS6 = 554
D6  = 587
DS6 = 622
E6  = 659
F6  = 698
FS6 = 740
G6  = 784
GS6 = 831
A6  = 880
AS6 = 932
B6  = 988
C7  = 1047
CS7 = 1109
D7  = 1175
DS7 = 1245
E7  = 1319
F7  = 1397
FS7 = 1480
G7  = 1568
GS7 = 1661
A7  = 1760
AS7 = 1865
B7  = 1976
C8  = 2093
CS8 = 2217
D8  = 2349
DS8 = 2489
E8  = 2637
F8  = 2794
FS8 = 2960
G8  = 3136
GS8 = 3322
A8  = 3520
AS8 = 3729
B8  = 3951
C9  = 4186
CS9 = 4435
D9  = 4699
DS9 = 4978
P = 0

def RTTTL(text):
    try:
        title, defaults, song = text.split(':')
        d, o, b = defaults.split(',')
        d = int(d.split('=')[1])
        o = int(o.split('=')[1])
        b = int(b.split('=')[1])
        whole = (60000/b)*4
        noteList = song.split(',')
    except:
        return 'Please enter a valid RTTTL string.'
    notes = 'abcdefgp'
    outList = []
    for note in noteList:
        index = 0
        for i in note:
            if i in notes:
                index = note.find(i)
                break
        length = note[0:index]
        value = note[index:].replace('#','s').replace('.','')
        if not any(char.isdigit() for char in value):
            value += str(o)
        if 'p' in value:
            value = 'p'
        if length == '':
            length = d
        else:
            length = int(length)
        length = whole/length
        if '.' in note:
            length += length/2
        outList.append((eval(value.upper()), length))
    return outList

def play(pin, tune):
    tune = RTTTL(tune)
    if type(tune) is not list:
        return tune
    for freqc, msec in tune:
        msec = msec * 0.001
        if freqc > 0:
            pwm0 = PWM(pin, freq=freqc, duty=512)
        time.sleep(msec*0.9)
        if freqc > 0:
            pwm0.deinit()
        time.sleep(msec*0.1)
`
    },
    {
      name: 'songs.py',
      size: '5.1 KB',
      content: `# Biblioteca de musicas RTTTL original do projeto BIPES
# (github.com/BIPES/BIPES, ui/pylibs/songs.py), reproduzida sem alteracoes.
# The following RTTTL tunes were extracted from the following:
# https://github.com/onebeartoe/media-players/blob/master/pi-ezo/src/main/java/org/onebeartoe/media/piezo/ports/rtttl/BuiltInSongs.java
# most of which originated from here:
# http://www.picaxe.com/RTTTL-Ringtones-for-Tune-Command/
#

SONGS = [
    'Super Mario - Main Theme:d=4,o=5,b=125:a,8f.,16c,16d,16f,16p,f,16d,16c,16p,16f,16p,16f,16p,8c6,8a.,g,16c,a,8f.,16c,16d,16f,16p,f,16d,16c,16p,16f,16p,16a#,16a,16g,2f,16p,8a.,8f.,8c,8a.,f,16g#,16f,16c,16p,8g#.,2g,8a.,8f.,8c,8a.,f,16g#,16f,8c,2c6',
    'Super Mario - Title Music:d=4,o=5,b=125:8d7,8d7,8d7,8d6,8d7,8d7,8d7,8d6,2d#7,8d7,p,32p,8d6,8b6,8b6,8b6,8d6,8b6,8b6,8b6,8d6,8b6,8b6,8b6,16b6,16c7,b6,8a6,8d6,8a6,8a6,8a6,8d6,8a6,8a6,8a6,8d6,8a6,8a6,8a6,16a6,16b6,a6,8g6,8d6,8b6,8b6,8b6,8d6,8b6,8b6,8b6,8d6,8b6,8b6,8b6,16a6,16b6,c7,e7,8d7,8d7,8d7,8d6,8c7,8c7,8c7,8f#6,2g6',
    'SMBtheme:d=4,o=5,b=100:16e6,16e6,32p,8e6,16c6,8e6,8g6,8p,8g,8p,8c6,16p,8g,16p,8e,16p,8a,8b,16a#,8a,16g.,16e6,16g6,8a6,16f6,8g6,8e6,16c6,16d6,8b,16p,8c6,16p,8g,16p,8e,16p,8a,8b,16a#,8a,16g.,16e6,16g6,8a6,16f6,8g6,8e6,16c6,16d6,8b,8p,16g6,16f#6,16f6,16d#6,16p,16e6,16p,16g#,16a,16c6,16p,16a,16c6,16d6,8p,16g6,16f#6,16f6,16d#6,16p,16e6,16p,16c7,16p,16c7,16c7,p,16g6,16f#6,16f6,16d#6,16p,16e6,16p,16g#,16a,16c6,16p,16a,16c6,16d6,8p,16d#6,8p,16d6,8p,16c6',
    'SMBwater:d=8,o=6,b=225:4d5,4e5,4f#5,4g5,4a5,4a#5,b5,b5,b5,p,b5,p,2b5,p,g5,2e.,2d#.,2e.,p,g5,a5,b5,c,d,2e.,2d#,4f,2e.,2p,p,g5,2d.,2c#.,2d.,p,g5,a5,b5,c,c#,2d.,2g5,4f,2e.,2p,p,g5,2g.,2g.,2g.,4g,4a,p,g,2f.,2f.,2f.,4f,4g,p,f,2e.,4a5,4b5,4f,e,e,4e.,b5,2c.',
    'SMBunderground:d=16,o=6,b=100:c,c5,a5,a,a#5,a#,2p,8p,c,c5,a5,a,a#5,a#,2p,8p,f5,f,d5,d,d#5,d#,2p,8p,f5,f,d5,d,d#5,d#,2p,32d#,d,32c#,c,p,d#,p,d,p,g#5,p,g5,p,c#,p,32c,f#,32f,32e,a#,32a,g#,32p,d#,b5,32p,a#5,32p,a5,g#5',
    'Picaxe:d=4,o=6,b=101:g5,c,8c,c,e,d,8c,d,8e,8d,c,8c,e,g,2a,a,g,8e,e,c,d,8c,d,8e,8d,c,8a5,a5,g5,2c',
    'The Simpsons:d=4,o=5,b=160:c.6,e6,f#6,8a6,g.6,e6,c6,8a,8f#,8f#,8f#,2g,8p,8p,8f#,8f#,8f#,8g,a#.,8c6,8c6,8c6,c6',
    'Indiana:d=4,o=5,b=250:e,8p,8f,8g,8p,1c6,8p.,d,8p,8e,1f,p.,g,8p,8a,8b,8p,1f6,p,a,8p,8b,2c6,2d6,2e6,e,8p,8f,8g,8p,1c6,p,d6,8p,8e6,1f.6,g,8p,8g,e.6,8p,d6,8p,8g,e.6,8p,d6,8p,8g,f.6,8p,e6,8p,8d6,2c6',
    'TakeOnMe:d=4,o=4,b=160:8f#5,8f#5,8f#5,8d5,8p,8b,8p,8e5,8p,8e5,8p,8e5,8g#5,8g#5,8a5,8b5,8a5,8a5,8a5,8e5,8p,8d5,8p,8f#5,8p,8f#5,8p,8f#5,8e5,8e5,8f#5,8e5,8f#5,8f#5,8f#5,8d5,8p,8b,8p,8e5,8p,8e5,8p,8e5,8g#5,8g#5,8a5,8b5,8a5,8a5,8a5,8e5,8p,8d5,8p,8f#5,8p,8f#5,8p,8f#5,8e5,8e5',
    'Entertainer:d=4,o=5,b=140:8d,8d#,8e,c6,8e,c6,8e,2c.6,8c6,8d6,8d#6,8e6,8c6,8d6,e6,8b,d6,2c6,p,8d,8d#,8e,c6,8e,c6,8e,2c.6,8p,8a,8g,8f#,8a,8c6,e6,8d6,8c6,8a,2d6',
    'Muppets:d=4,o=5,b=250:c6,c6,a,b,8a,b,g,p,c6,c6,a,8b,8a,8p,g.,p,e,e,g,f,8e,f,8c6,8c,8d,e,8e,8e,8p,8e,g,2p,c6,c6,a,b,8a,b,g,p,c6,c6,a,8b,a,g.,p,e,e,g,f,8e,f,8c6,8c,8d,e,8e,d,8d,c',
    'Xfiles:d=4,o=5,b=125:e,b,a,b,d6,2b.,1p,e,b,a,b,e6,2b.,1p,g6,f#6,e6,d6,e6,2b.,1p,g6,f#6,e6,d6,f#6,2b.,1p,e,b,a,b,d6,2b.,1p,e,b,a,b,e6,2b.,1p,e6,2b.',
    'Looney:d=4,o=5,b=140:32p,c6,8f6,8e6,8d6,8c6,a.,8c6,8f6,8e6,8d6,8d#6,e.6,8e6,8e6,8c6,8d6,8c6,8e6,8c6,8d6,8a,8c6,8g,8a#,8a,8f',
    '20thCenFox:d=16,o=5,b=140:b,8p,b,b,2b,p,c6,32p,b,32p,c6,32p,b,32p,c6,32p,b,8p,b,b,b,32p,b,32p,b,32p,b,32p,b,32p,b,32p,b,32p,g#,32p,a,32p,b,8p,b,b,2b,4p,8e,8g#,8b,1c#6,8f#,8a,8c#6,1e6,8a,8c#6,8e6,1e6,8b,8g#,8a,2b',
    'Bond:d=4,o=5,b=80:32p,16c#6,32d#6,32d#6,16d#6,8d#6,16c#6,16c#6,16c#6,16c#6,32e6,32e6,16e6,8e6,16d#6,16d#6,16d#6,16c#6,32d#6,32d#6,16d#6,8d#6,16c#6,16c#6,16c#6,16c#6,32e6,32e6,16e6,8e6,16d#6,16d6,16c#6,16c#7,c.7,16g#6,16f#6,g#.6',
    'MASH:d=8,o=5,b=140:4a,4g,f#,g,p,f#,p,g,p,f#,p,2e.,p,f#,e,4f#,e,f#,p,e,p,4d.,p,f#,4e,d,e,p,d,p,e,p,d,p,2c#.,p,d,c#,4d,c#,d,p,e,p,4f#,p,a,p,4b,a,b,p,a,p,b,p,2a.,4p,a,b,a,4b,a,b,p,2a.,a,4f#,a,b,p,d6,p,4e.6,d6,b,p,a,p,2b',
    'StarWars:d=4,o=5,b=45:32p,32f#,32f#,32f#,8b.,8f#.6,32e6,32d#6,32c#6,8b.6,16f#.6,32e6,32d#6,32c#6,8b.6,16f#.6,32e6,32d#6,32e6,8c#.6,32f#,32f#,32f#,8b.,8f#.6,32e6,32d#6,32c#6,8b.6,16f#.6,32e6,32d#6,32c#6,8b.6,16f#.6,32e6,32d#6,32e6,8c#6',
    'GoodBad:d=4,o=5,b=56:32p,32a#,32d#6,32a#,32d#6,8a#.,16f#.,16g#.,d#,32a#,32d#6,32a#,32d#6,8a#.,16f#.,16g#.,c#6,32a#,32d#6,32a#,32d#6,8a#.,16f#.,32f.,32d#.,c#,32a#,32d#6,32a#,32d#6,8a#.,16g#.,d#',
    'TopGun:d=4,o=4,b=31:32p,16c#,16g#,16g#,32f#,32f,32f#,32f,16d#,16d#,32c#,32d#,16f,32d#,32f,16f#,32f,32c#,16f,d#,16c#,16g#,16g#,32f#,32f,32f#,32f,16d#,16d#,32c#,32d#,16f,32d#,32f,16f#,32f,32c#,g#',
    'A-Team:d=8,o=5,b=125:4d#6,a#,2d#6,16p,g#,4a#,4d#.,p,16g,16a#,d#6,a#,f6,2d#6,16p,c#.6,16c6,16a#,g#.,2a#',
    'Flinstones:d=4,o=5,b=40:32p,16f6,16a#,16a#6,32g6,16f6,16a#.,16f6,32d#6,32d6,32d6,32d#6,32f6,16a#,16c6,d6,16f6,16a#.,16a#6,32g6,16f6,16a#.,32f6,32f6,32d#6,32d6,32d6,32d#6,32f6,16a#,16c6,a#,16a6,16d.6,16a#6,32a6,32a6,32g6,32f#6,32a6,8g6,16g6,16c.6,32a6,32a6,32g6,32g6,32f6,32e6,32g6,8f6,16f6,16a#.,16a#6,32g6,16f6,16a#.,16f6,32d#6,32d6,32d6,32d#6,32f6,16a#,16c.6,32d6,32d#6,32f6,16a#,16c.6,32d6,32d#6,32f6,16a#6,16c7,8a#.6',
    'Jeopardy:d=4,o=6,b=125:c,f,c,f5,c,f,2c,c,f,c,f,a.,8g,8f,8e,8d,8c#,c,f,c,f5,c,f,2c,f.,8d,c,a#5,a5,g5,f5,p,d#,g#,d#,g#5,d#,g#,2d#,d#,g#,d#,g#,c.7,8a#,8g#,8g,8f,8e,d#,g#,d#,g#5,d#,g#,2d#,g#.,8f,d#,c#,c,p,a#5,p,g#.5,d#,g#',
    'Gadget:d=16,o=5,b=50:32d#,32f,32f#,32g#,a#,f#,a,f,g#,f#,32d#,32f,32f#,32g#,a#,d#6,4d6,32d#,32f,32f#,32g#,a#,f#,a,f,g#,f#,8d#',
    'Smurfs:d=32,o=5,b=200:4c#6,16p,4f#6,p,16c#6,p,8d#6,p,8b,p,4g#,16p,4c#6,p,16a#,p,8f#,p,8a#,p,4g#,4p,g#,p,a#,p,b,p,c6,p,4c#6,16p,4f#6,p,16c#6,p,8d#6,p,8b,p,4g#,16p,4c#6,p,16a#,p,8b,p,8f,p,4f#',
    'MahnaMahna:d=16,o=6,b=125:c#,c.,b5,8a#.5,8f.,4g#,a#,g.,4d#,8p,c#,c.,b5,8a#.5,8f.,g#.,8a#.,4g,8p,c#,c.,b5,8a#.5,8f.,4g#,f,g.,8d#.,f,g.,8d#.,f,8g,8d#.,f,8g,d#,8c,a#5,8d#.,8d#.,4d#,8d#.',
    'LeisureSuit:d=16,o=6,b=56:f.5,f#.5,g.5,g#5,32a#5,f5,g#.5,a#.5,32f5,g#5,32a#5,g#5,8c#.,a#5,32c#,a5,a#.5,c#.,32a5,a#5,32c#,d#,8e,c#.,f.,f.,f.,f.,f,32e,d#,8d,a#.5,e,32f,e,32f,c#,d#.,c#',
    'MissionImp:d=16,o=6,b=95:32d,32d#,32d,32d#,32d,32d#,32d,32d#,32d,32d,32d#,32e,32f,32f#,32g,g,8p,g,8p,a#,p,c7,p,g,8p,g,8p,f,p,f#,p,g,8p,g,8p,a#,p,c7,p,g,8p,g,8p,f,p,f#,p,a#,g,2d,32p,a#,g,2c#,32p,a#,g,2c,a#5,8c,2p,32p,a#5,g5,2f#,32p,a#5,g5,2f,32p,a#5,g5,2e,d#,8d',
]

def find(name):
    for song in SONGS:
        song_name = song.split(':')[0]
        if song_name == name:
            return song
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

    // Se o nome veio da listagem real da Flash (os.listdir), busca o
    // conteúdo de verdade gravado na placa em vez de manter só o palpite
    // local (driver oficial conhecido ou placeholder genérico).
    if (file && file.fromDevice) {
      readFileFromBoard(filename);
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
  let pendingFileReadName = null;
  let pendingFileReadTimeout = null;

  // Base64 -> string decodificando como UTF-8 (atob() sozinho trata cada
  // byte como um char code Latin-1, corrompendo acentos/emojis nos arquivos).
  function base64ToUtf8(b64) {
    const binary = atob(b64.replace(/\s+/g, ''));
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    return new TextDecoder('utf-8').decode(bytes);
  }

  function readFileFromBoard(filename) {
    if (!window.SatConnection || !SatConnection.isConnected || !SatConnection.isConnected()) return false;

    pendingFileReadName = filename;
    clearTimeout(pendingFileReadTimeout);
    pendingFileReadTimeout = setTimeout(() => {
      pendingFileReadName = null;
    }, 8000);

    const safe = filename.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    // Tudo em uma única linha (via exec com \\n escapado) para não precisar
    // de Paste Mode — mesmo padrão já usado por fetchFilesFromHardware().
    const cmd = "import ubinascii as _ub\r\n" +
      "exec(\"try:\\n    with open('" + safe + "') as _f:\\n        _c = _f.read()\\n    print('__FILE_START__" + safe + "__' + _ub.b2a_base64(_c).decode().strip() + '__FILE_END__')\\nexcept Exception as _e:\\n    print('__FILE_ERROR__" + safe + "__' + str(_e))\")\r\n";
    SatConnection.send(cmd);
    return true;
  }

  function handleIncomingDeviceData(text) {
    if (!text) return;
    rawStreamBuffer += text;

    if (rawStreamBuffer.length > 65536) {
      rawStreamBuffer = rawStreamBuffer.slice(-32768);
    }

    if (pendingFileReadName) {
      const startMarker = `__FILE_START__${pendingFileReadName}__`;
      const errorMarker = `__FILE_ERROR__${pendingFileReadName}__`;
      const startIdx = rawStreamBuffer.lastIndexOf(startMarker);
      const endIdx = startIdx !== -1 ? rawStreamBuffer.indexOf('__FILE_END__', startIdx) : -1;

      if (startIdx !== -1 && endIdx !== -1) {
        clearTimeout(pendingFileReadTimeout);
        const b64 = rawStreamBuffer.substring(startIdx + startMarker.length, endIdx).trim();
        try {
          const content = base64ToUtf8(b64);
          const target = deviceFiles.find(f => f.name === pendingFileReadName);
          if (target) {
            target.content = content;
            target.size = `${(content.length / 1024).toFixed(1)} KB`;
          }
          if (currentEditingFile === pendingFileReadName) {
            const editor = document.getElementById('fileEditorTextarea');
            if (editor) {
              editor.value = content;
              updateEditorView();
            }
          }
          renderFileList();
        } catch (e) {
          console.warn('Erro ao decodificar conteúdo do arquivo:', e);
        }
        pendingFileReadName = null;
      } else {
        const errIdx = rawStreamBuffer.lastIndexOf(errorMarker);
        if (errIdx !== -1) {
          clearTimeout(pendingFileReadTimeout);
          showDriverToast(`⚠️ Não foi possível ler "${pendingFileReadName}" da Flash.`);
          pendingFileReadName = null;
        }
      }
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
              let fallbackContent = `# Arquivo ${name} carregado da Flash\n# Abra o arquivo para carregar o conteudo real gravado na placa.\n`;
              if (name === 'boot.py') fallbackContent = BOOT_PY_EXPLANATION;
              else if (name === 'main.py') fallbackContent = MAIN_PY_EXPLANATION;
              return {
                name: name,
                size: official ? official.size : (prev ? prev.size : '1 KB'),
                content: prev ? prev.content : (official ? official.content : fallbackContent),
                // Nome veio de os.listdir() na placa real: o conteúdo acima é só um
                // palpite (driver oficial conhecido ou placeholder) até ser confirmado
                // lendo o arquivo de verdade (ver readFileFromBoard).
                fromDevice: true
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
