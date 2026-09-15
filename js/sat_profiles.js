/**
 * @license
 * SatBlocks by BIPES — Gerenciador de Projetos e Perfis de Missão OBSAT
 * Compatibilidade nativa com o sistema BIPES oficial (bipes_projects, account_user, uid)
 * Copyright (C) 2026 OBSAT / BIPES Project
 */

window.SatProfiles = (function() {
  'use strict';

  let currentProject = {
    uid: null,
    name: 'Missão OBSAT 1: Coleta Básica',
    xml: ''
  };

  let domProjectList = null;
  let domAccountUser = null;
  let domAccountPanel = null;

  // Preset da Missão 2 (Câmera OV2640 + WebServer Hotspot)
  const MISSION_2_XML = `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="project_info" id="info_cam" x="30" y="30">
    <value name="project_author">
      <shadow type="text" id="auth_cam">
        <field name="TEXT">Equipe OBSAT</field>
      </shadow>
    </value>
    <value name="project_iot_id">
      <shadow type="math_number" id="iot_cam">
        <field name="NUM">42</field>
      </shadow>
    </value>
    <value name="project_description">
      <shadow type="text" id="desc_cam">
        <field name="TEXT">Missão OBSAT 2: Estação Meteorológica Espiã (ESP32-CAM)</field>
      </shadow>
    </value>
  </block>

  <block type="sat_wifi_ap_start" id="wifi_ap_1" x="30" y="160">
    <field name="SSID">SatEstacao_01</field>
    <field name="PASSWORD"></field>
    <next>
      <block type="sat_camera_init_advanced" id="cam_init_1">
        <field name="FRAMESIZE">FRAMESIZE_QVGA</field>
        <field name="QUALITY">12</field>
        <field name="EFFECT">0</field>
        <field name="ROTATE">0</field>
        <next>
          <block type="sat_camera_webserver_start" id="web_start_1">
            <field name="PORT">80</field>
            <field name="TITLE">Estação Meteorológica Espiã OBSAT</field>
            <next>
              <block type="sat_camera_status_led" id="led_status_1">
                <field name="STATE">1</field>
                <next>
                  <block type="controls_whileUntil" id="loop_main_cam">
                    <field name="MODE">WHILE</field>
                    <value name="BOOL">
                      <block type="logic_boolean" id="bool_true_m2">
                        <field name="BOOL">TRUE</field>
                      </block>
                    </value>
                    <statement name="DO">
                      <block type="sat_camera_webserver_handle" id="web_handle_1">
                        <next>
                          <block type="sat_wait" id="wait_1">
                            <field name="TIME">100</field>
                            <field name="UNIT">MS</field>
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
</xml>`;

  // Preset da Missão 3 (Sensores Atmosféricos BMP280 + Telemetria para Servidor Local/Oficial)
  const MISSION_3_XML = `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="project_info" id="info_m3" x="30" y="30">
    <value name="project_author">
      <shadow type="text" id="auth_m3">
        <field name="TEXT">Equipe OBSAT 42</field>
      </shadow>
    </value>
    <value name="project_iot_id">
      <shadow type="math_number" id="iot_m3">
        <field name="NUM">42</field>
      </shadow>
    </value>
    <value name="project_description">
      <shadow type="text" id="desc_m3">
        <field name="TEXT">Missão OBSAT 3: Estação Atmosférica e Telemetria (BMP280 + Servidor)</field>
      </shadow>
    </value>
  </block>

  <block type="sat_wifi_connect" id="wifi_conn_m3" x="30" y="160">
    <field name="SSID">MINHA_REDE_WIFI</field>
    <field name="PASSWORD">SENHA_WIFI</field>
    <next>
      <block type="sat_i2c_init_pins" id="i2c_init_m3">
        <field name="PRESET">esp32cam</field>
        <field name="SCL_PIN">14</field>
        <field name="SDA_PIN">15</field>
        <next>
          <block type="controls_whileUntil" id="loop_while_m3">
            <field name="MODE">WHILE</field>
            <value name="BOOL">
              <block type="logic_boolean" id="bool_true_m3">
                <field name="BOOL">TRUE</field>
              </block>
            </value>
            <statement name="DO">
              <block type="sat_http_send_obsat_telemetry" id="send_obsat_m3">
                <field name="SERVER_URL">https://obsat.org.br/satblocks/telemetria/salvar_telemetria.php</field>
                <value name="JSON_DATA">
                  <block type="sat_obsat_telemetry_packet" id="packet_m3">
                    <mutation items="6" keys="[&quot;equipe&quot;,&quot;temperatura&quot;,&quot;pressao&quot;,&quot;altitude&quot;,&quot;bateria&quot;,&quot;payload&quot;]" labels="[&quot;Equipe ID&quot;,&quot;Temperatura (°C)&quot;,&quot;Pressão (hPa)&quot;,&quot;Altitude (m)&quot;,&quot;Bateria (%)&quot;,&quot;Payload Extra&quot;]"></mutation>
                    <value name="VAL0">
                      <shadow type="math_number" id="team_val_m3">
                        <field name="NUM">42</field>
                      </shadow>
                    </value>
                    <value name="VAL1">
                      <block type="sat_sensor_bmp280_temp" id="bmp_temp_m3"></block>
                    </value>
                    <value name="VAL2">
                      <block type="sat_sensor_bmp280_press" id="bmp_press_m3"></block>
                    </value>
                    <value name="VAL3">
                      <block type="sat_sensor_bmp280_alt" id="bmp_alt_m3">
                        <field name="SEA_LEVEL">1013.25</field>
                      </block>
                    </value>
                    <value name="VAL4">
                      <shadow type="math_number" id="bat_val_m3">
                        <field name="NUM">100</field>
                      </shadow>
                    </value>
                    <value name="VAL5">
                      <shadow type="text" id="payload_text_m3">
                        <field name="TEXT">Sonda Atmosférica BMP280 Ativa</field>
                      </shadow>
                    </value>
                  </block>
                </value>
                <next>
                  <block type="sat_wait" id="wait_m3">
                    <field name="TIME">3</field>
                    <field name="UNIT">SEC</field>
                  </block>
                </next>
              </block>
            </statement>
          </block>
        </next>
      </block>
    </next>
  </block>
</xml>`;

  // Preset da Missão 4 (Satélite Completo: Câmera OV2640 + BMP280 + Servidor Web + Telemetria Oficial)
  const MISSION_4_XML = `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="project_info" id="info_m4" x="30" y="30">
    <value name="project_author">
      <shadow type="text" id="auth_m4">
        <field name="TEXT">Equipe OBSAT 42</field>
      </shadow>
    </value>
    <value name="project_iot_id">
      <shadow type="math_number" id="iot_m4">
        <field name="NUM">42</field>
      </shadow>
    </value>
    <value name="project_description">
      <shadow type="text" id="desc_m4">
        <field name="TEXT">Missão OBSAT 4: Satélite de Observação da Terra (Câmera + Sensores + Telemetria)</field>
      </shadow>
    </value>
  </block>

  <block type="sat_wifi_connect" id="wifi_conn_m4" x="30" y="160">
    <field name="SSID">MINHA_REDE_WIFI</field>
    <field name="PASSWORD">SENHA_WIFI</field>
    <next>
      <block type="sat_camera_init_advanced" id="cam_init_m4">
        <field name="FRAMESIZE">FRAMESIZE_QVGA</field>
        <field name="QUALITY">12</field>
        <field name="EFFECT">0</field>
        <field name="ROTATE">0</field>
        <next>
          <block type="sat_camera_webserver_start" id="web_start_m4">
            <field name="PORT">80</field>
            <field name="TITLE">Satélite OBSAT 4 — Observação da Terra</field>
            <next>
              <block type="controls_whileUntil" id="loop_while_m4">
                <field name="MODE">WHILE</field>
                <value name="BOOL">
                  <block type="logic_boolean" id="bool_true_m4">
                    <field name="BOOL">TRUE</field>
                  </block>
                </value>
                <statement name="DO">
                  <block type="sat_camera_webserver_handle" id="cam_handle_m4">
                    <next>
                      <block type="sat_http_send_obsat_telemetry" id="send_obsat_m4">
                        <field name="SERVER_URL">https://obsat.org.br/satblocks/telemetria/salvar_telemetria.php</field>
                        <value name="JSON_DATA">
                          <block type="sat_obsat_telemetry_packet" id="packet_m4">
                            <mutation items="6" keys="[&quot;equipe&quot;,&quot;temperatura&quot;,&quot;pressao&quot;,&quot;altitude&quot;,&quot;bateria&quot;,&quot;payload&quot;]" labels="[&quot;Equipe ID&quot;,&quot;Temperatura (°C)&quot;,&quot;Pressão (hPa)&quot;,&quot;Altitude (m)&quot;,&quot;Bateria (%)&quot;,&quot;Payload Extra&quot;]"></mutation>
                            <value name="VAL0">
                              <shadow type="math_number" id="team_val_m4">
                                <field name="NUM">42</field>
                              </shadow>
                            </value>
                            <value name="VAL1">
                              <block type="sat_sensor_bmp280_temp" id="bmp_temp_m4"></block>
                            </value>
                            <value name="VAL2">
                              <block type="sat_sensor_bmp280_press" id="bmp_press_m4"></block>
                            </value>
                            <value name="VAL3">
                              <block type="sat_sensor_bmp280_alt" id="bmp_alt_m4">
                                <field name="SEA_LEVEL">1013.25</field>
                              </block>
                            </value>
                            <value name="VAL4">
                              <shadow type="math_number" id="bat_val_m4">
                                <field name="NUM">100</field>
                              </shadow>
                            </value>
                            <value name="VAL5">
                              <shadow type="text" id="payload_text_m4">
                                <field name="TEXT">Missão 4: Câmera e Atmosfera Ativas</field>
                              </shadow>
                            </value>
                          </block>
                        </value>
                        <next>
                          <block type="sat_wait" id="wait_m4">
                            <field name="TIME">100</field>
                            <field name="UNIT">MS</field>
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
</xml>`;

  // Preset da Missão RP2040 - Alternativa 1: Oficina Mensa Brasil (BMP280 + MPU6050 + RGB + Wi-Fi)
  const MISSION_RP2040_MENSA_XML = `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="project_info" id="info_mensa" x="30" y="30">
    <value name="project_author">
      <shadow type="text" id="auth_mensa">
        <field name="TEXT">Equipe Mensa Brasil</field>
      </shadow>
    </value>
    <value name="project_iot_id">
      <shadow type="math_number" id="iot_mensa">
        <field name="NUM">42</field>
      </shadow>
    </value>
    <value name="project_description">
      <shadow type="text" id="desc_mensa">
        <field name="TEXT">Oficina Mensa: Sonda RP2040-Zero (BMP280 + MPU6050 + Wi-Fi + RGB)</field>
      </shadow>
    </value>
  </block>

  <block type="sat_wifi_connect" id="wifi_conn_mensa" x="30" y="160">
    <field name="SSID">MINHA_REDE_WIFI</field>
    <field name="PASSWORD">SENHA_WIFI</field>
    <next>
      <block type="sat_rp2040_rgb_led" id="led_init_mensa">
        <field name="PIN">16</field>
        <field name="R">0</field>
        <field name="G">255</field>
        <field name="B">0</field>
        <next>
          <block type="controls_whileUntil" id="loop_main_mensa">
            <field name="MODE">WHILE</field>
            <value name="BOOL">
              <block type="logic_boolean" id="bool_true_mensa">
                <field name="BOOL">TRUE</field>
              </block>
            </value>
            <statement name="DO">
              <block type="sat_rp2040_rgb_led" id="led_tx_mensa">
                <field name="PIN">16</field>
                <field name="R">0</field>
                <field name="G">180</field>
                <field name="B">255</field>
                <next>
                  <block type="sat_http_send_obsat_telemetry" id="send_tele_mensa">
                    <field name="SERVER_URL">https://obsat.org.br/satblocks/telemetria/salvar_telemetria.php</field>
                    <value name="JSON_DATA">
                      <block type="sat_obsat_telemetry_packet" id="packet_mensa">
                        <mutation items="7" keys="[&quot;equipe&quot;,&quot;temperatura&quot;,&quot;pressao&quot;,&quot;altitude&quot;,&quot;acelerometro&quot;,&quot;giroscopio&quot;,&quot;payload&quot;]" labels="[&quot;Equipe ID&quot;,&quot;Temperatura (°C)&quot;,&quot;Pressão (hPa)&quot;,&quot;Altitude (m)&quot;,&quot;Acelerômetro [X,Y,Z]&quot;,&quot;Giroscópio [X,Y,Z]&quot;,&quot;Payload Extra&quot;]"></mutation>
                        <value name="VAL0">
                          <shadow type="math_number" id="team_val_mensa">
                            <field name="NUM">42</field>
                          </shadow>
                        </value>
                        <value name="VAL1">
                          <block type="sat_sensor_bmp280_temp" id="bmp_temp_mensa"></block>
                        </value>
                        <value name="VAL2">
                          <block type="sat_sensor_bmp280_press" id="bmp_press_mensa"></block>
                        </value>
                        <value name="VAL3">
                          <block type="sat_sensor_bmp280_alt" id="bmp_alt_mensa">
                            <field name="SEA_LEVEL">1013.25</field>
                          </block>
                        </value>
                        <value name="VAL4">
                          <block type="sat_imu_mpu6050_accel" id="accel_mensa">
                            <field name="AXIS">vector</field>
                          </block>
                        </value>
                        <value name="VAL5">
                          <block type="sat_imu_mpu6050_gyro" id="gyro_mensa">
                            <field name="AXIS">vector</field>
                          </block>
                        </value>
                        <value name="VAL6">
                          <shadow type="text" id="payload_text_mensa">
                            <field name="TEXT">Oficina Mensa Brasil: Sonda RP2040 Ativa</field>
                          </shadow>
                        </value>
                      </block>
                    </value>
                    <next>
                      <block type="sat_rp2040_rgb_led" id="led_idle_mensa">
                        <field name="PIN">16</field>
                        <field name="R">0</field>
                        <field name="G">15</field>
                        <field name="B">35</field>
                        <next>
                          <block type="sat_wait" id="wait_mensa">
                            <field name="TIME">2</field>
                            <field name="UNIT">SEC</field>
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
</xml>`;

  // Preset da Missão RP2040 - Alternativa 2: Padrão Oficial Edital OBSAT 2026 (Bateria + Sensores + Wi-Fi)
  const MISSION_RP2040_OBSAT_XML = `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="project_info" id="info_obsat_rp" x="30" y="30">
    <value name="project_author">
      <shadow type="text" id="auth_obsat_rp">
        <field name="TEXT">Equipe OBSAT 42</field>
      </shadow>
    </value>
    <value name="project_iot_id">
      <shadow type="math_number" id="iot_obsat_rp">
        <field name="NUM">42</field>
      </shadow>
    </value>
    <value name="project_description">
      <shadow type="text" id="desc_obsat_rp">
        <field name="TEXT">Missão Oficial OBSAT 2026: Sonda RP2040 Completa (Edital Nacional)</field>
      </shadow>
    </value>
  </block>

  <block type="sat_wifi_connect" id="wifi_conn_obsat_rp" x="30" y="160">
    <field name="SSID">MINHA_REDE_WIFI</field>
    <field name="PASSWORD">SENHA_WIFI</field>
    <next>
      <block type="sat_rp2040_rgb_led" id="led_init_obsat_rp">
        <field name="PIN">16</field>
        <field name="R">0</field>
        <field name="G">255</field>
        <field name="B">0</field>
        <next>
          <block type="controls_whileUntil" id="loop_main_obsat_rp">
            <field name="MODE">WHILE</field>
            <value name="BOOL">
              <block type="logic_boolean" id="bool_true_obsat_rp">
                <field name="BOOL">TRUE</field>
              </block>
            </value>
            <statement name="DO">
              <block type="sat_rp2040_rgb_led" id="led_tx_obsat_rp">
                <field name="PIN">16</field>
                <field name="R">0</field>
                <field name="G">180</field>
                <field name="B">255</field>
                <next>
                  <block type="sat_http_send_obsat_telemetry" id="send_tele_obsat_rp">
                    <field name="SERVER_URL">https://obsat.org.br/satblocks/telemetria/salvar_telemetria.php</field>
                    <value name="JSON_DATA">
                      <block type="sat_obsat_telemetry_packet" id="packet_obsat_rp">
                        <mutation items="7" keys="[&quot;equipe&quot;,&quot;bateria&quot;,&quot;temperatura&quot;,&quot;pressao&quot;,&quot;giroscopio&quot;,&quot;acelerometro&quot;,&quot;payload&quot;]" labels="[&quot;Equipe ID&quot;,&quot;Bateria (%)&quot;,&quot;Temperatura (°C)&quot;,&quot;Pressão (hPa)&quot;,&quot;Giroscópio [X,Y,Z]&quot;,&quot;Acelerômetro [X,Y,Z]&quot;,&quot;Payload Extra&quot;]"></mutation>
                        <value name="VAL0">
                          <shadow type="math_number" id="team_val_obsat_rp">
                            <field name="NUM">42</field>
                          </shadow>
                        </value>
                        <value name="VAL1">
                          <block type="sat_eps_battery_percent" id="bat_obsat_rp"></block>
                        </value>
                        <value name="VAL2">
                          <block type="sat_sensor_bmp280_temp" id="bmp_temp_obsat_rp"></block>
                        </value>
                        <value name="VAL3">
                          <block type="sat_sensor_bmp280_press" id="bmp_press_obsat_rp"></block>
                        </value>
                        <value name="VAL4">
                          <block type="sat_imu_mpu6050_gyro" id="gyro_obsat_rp">
                            <field name="AXIS">vector</field>
                          </block>
                        </value>
                        <value name="VAL5">
                          <block type="sat_imu_mpu6050_accel" id="accel_obsat_rp">
                            <field name="AXIS">vector</field>
                          </block>
                        </value>
                        <value name="VAL6">
                          <shadow type="text" id="payload_text_obsat_rp">
                            <field name="TEXT">Missão OBSAT 2026: Telemetria Nominal</field>
                          </shadow>
                        </value>
                      </block>
                    </value>
                    <next>
                      <block type="sat_rp2040_rgb_led" id="led_idle_obsat_rp">
                        <field name="PIN">16</field>
                        <field name="R">0</field>
                        <field name="G">15</field>
                        <field name="B">35</field>
                        <next>
                          <block type="sat_wait" id="wait_obsat_rp">
                            <field name="TIME">2</field>
                            <field name="UNIT">SEC</field>
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
</xml>`;

  const MISSION_RP2040_XML = MISSION_RP2040_MENSA_XML;

  // =========================================================================
  // MISSÕES OFICIAIS DAS OFICINAS SATBLOCKS & OBSAT 2026
  // =========================================================================

  // Oficina 1: Programa Mínimo Oficial (Olá, Terra!)
  const MISSION_OFICINA1_MINIMO_XML = `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="project_info" id="info_of1_minimo" x="30" y="30">
    <value name="project_author">
      <shadow type="text" id="auth_of1_minimo">
        <field name="TEXT">Equipe OBSAT</field>
      </shadow>
    </value>
    <value name="project_iot_id">
      <shadow type="math_number" id="iot_of1_minimo">
        <field name="NUM">41</field>
      </shadow>
    </value>
    <value name="project_description">
      <shadow type="text" id="desc_of1_minimo">
        <field name="TEXT">Oficina 1: Programa Mínimo (Olá, Terra!)</field>
      </shadow>
    </value>
  </block>

  <block type="sat_mission_start" id="start_of1_minimo" x="30" y="160">
    <field name="MISSION_NAME">CANSAT_OBSAT_01</field>
    <next>
      <block type="text_print" id="print_of1_minimo">
        <value name="TEXT">
          <block type="text" id="text_of1_minimo">
            <field name="TEXT">Olá, Terra!</field>
          </block>
        </value>
      </block>
    </next>
  </block>
</xml>`;

  // Oficina 1: Fazendo Barulho (Som / Buzzer Tone no GPIO 25 & S.O.S.)
  const MISSION_OFICINA1_BEACON_XML = `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="project_info" id="info_of1_beacon" x="30" y="30">
    <value name="project_author">
      <shadow type="text" id="auth_of1_beacon">
        <field name="TEXT">Equipe OBSAT</field>
      </shadow>
    </value>
    <value name="project_iot_id">
      <shadow type="math_number" id="iot_of1_beacon">
        <field name="NUM">41</field>
      </shadow>
    </value>
    <value name="project_description">
      <shadow type="text" id="desc_of1_beacon">
        <field name="TEXT">Oficina 1: Fazendo Barulho (Alarme &amp; S.O.S. no GPIO 25)</field>
      </shadow>
    </value>
  </block>

  <block type="sat_mission_start" id="start_of1_beacon" x="30" y="160">
    <field name="MISSION_NAME">SOM_CANSAT_01</field>
    <next>
      <block type="controls_repeat_ext" id="repeat_sos_beacon">
        <value name="TIMES">
          <shadow type="math_number" id="num_sos_times">
            <field name="NUM">3</field>
          </shadow>
        </value>
        <statement name="DO">
          <block type="sat_actuator_buzzer" id="buzzer_beacon">
            <field name="PIN">25</field>
            <field name="FREQ">2200</field>
            <field name="DURATION">300</field>
            <next>
              <block type="delay" id="delay_sos">
                <value name="TIME">
                  <shadow type="math_number" id="time_sos">
                    <field name="NUM">0.5</field>
                  </shadow>
                </value>
                <field name="UNIT">s</field>
              </block>
            </next>
          </block>
        </statement>
      </block>
    </next>
  </block>
</xml>`;

  // Oficina 1: Luzes de Navegação do CanSat (Expansor MCP23017)
  const MISSION_OFICINA1_FAROL_XML = `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="project_info" id="info_of1_farol" x="30" y="30">
    <value name="project_author">
      <shadow type="text" id="auth_of1_farol">
        <field name="TEXT">Equipe OBSAT</field>
      </shadow>
    </value>
    <value name="project_iot_id">
      <shadow type="math_number" id="iot_of1_farol">
        <field name="NUM">41</field>
      </shadow>
    </value>
    <value name="project_description">
      <shadow type="text" id="desc_of1_farol">
        <field name="TEXT">Oficina 1: Luzes de Navegação do CanSat (Expansor MCP23017)</field>
      </shadow>
    </value>
  </block>

  <block type="sat_mission_start" id="start_of1_farol" x="30" y="160">
    <field name="MISSION_NAME">FAROL_CANSAT_01</field>
    <next>
      <block type="controls_repeat_ext" id="repeat_farol">
        <value name="TIMES">
          <shadow type="math_number" id="num_repeat_farol">
            <field name="NUM">3</field>
          </shadow>
        </value>
        <statement name="DO">
          <block type="controls_for" id="for_farol">
            <field name="VAR">pino</field>
            <value name="FROM">
              <shadow type="math_number" id="from_pino">
                <field name="NUM">0</field>
              </shadow>
            </value>
            <value name="TO">
              <shadow type="math_number" id="to_pino">
                <field name="NUM">7</field>
              </shadow>
            </value>
            <value name="BY">
              <shadow type="math_number" id="by_pino">
                <field name="NUM">1</field>
              </shadow>
            </value>
            <statement name="DO">
              <block type="sat_actuator_mcp23017_led" id="led_on_farol">
                <value name="PIN">
                  <block type="variables_get" id="get_pino_on">
                    <field name="VAR">pino</field>
                  </block>
                </value>
                <field name="STATE">1</field>
                <next>
                  <block type="delay" id="delay_on_farol">
                    <value name="TIME">
                      <shadow type="math_number" id="time_on">
                        <field name="NUM">0.1</field>
                      </shadow>
                    </value>
                    <field name="UNIT">s</field>
                    <next>
                      <block type="sat_actuator_mcp23017_led" id="led_off_farol">
                        <value name="PIN">
                          <block type="variables_get" id="get_pino_off">
                            <field name="VAR">pino</field>
                          </block>
                        </value>
                        <field name="STATE">0</field>
                        <next>
                          <block type="delay" id="delay_off_farol">
                            <value name="TIME">
                              <shadow type="math_number" id="time_off">
                                <field name="NUM">0.05</field>
                              </shadow>
                            </value>
                            <field name="UNIT">s</field>
                          </block>
                        </next>
                      </block>
                    </next>
                  </block>
                </next>
              </block>
            </statement>
          </block>
        </statement>
      </block>
    </next>
  </block>
</xml>`;

  // Oficina 1: Barômetro BMP280 (Primeiro Sensor)
  const MISSION_OFICINA1_BMP280_XML = `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="project_info" id="info_of1_bmp" x="30" y="30">
    <value name="project_author">
      <shadow type="text" id="auth_of1_bmp">
        <field name="TEXT">Equipe OBSAT</field>
      </shadow>
    </value>
    <value name="project_iot_id">
      <shadow type="math_number" id="iot_of1_bmp">
        <field name="NUM">41</field>
      </shadow>
    </value>
    <value name="project_description">
      <shadow type="text" id="desc_of1_bmp">
        <field name="TEXT">Oficina 1: Leitura do Barômetro BMP280</field>
      </shadow>
    </value>
  </block>

  <block type="sat_mission_start" id="start_of1_bmp" x="30" y="160">
    <field name="MISSION_NAME">CANSAT_OBSAT_01</field>
    <next>
      <block type="controls_whileUntil" id="loop_of1_bmp">
        <field name="MODE">WHILE</field>
        <value name="BOOL">
          <block type="logic_boolean" id="bool_of1_bmp">
            <field name="BOOL">TRUE</field>
          </block>
        </value>
        <statement name="DO">
          <block type="variables_set" id="var_set_of1_temp">
            <field name="VAR">temperatura</field>
            <value name="VALUE">
              <block type="sat_sensor_bmp280_temp" id="bmp_temp_of1"></block>
            </value>
            <next>
              <block type="text_print" id="print_of1_temp">
                <value name="TEXT">
                  <block type="variables_get" id="var_get_of1_temp">
                    <field name="VAR">temperatura</field>
                  </block>
                </value>
                <next>
                  <block type="sat_wait" id="wait_of1_bmp">
                    <field name="TIME">2</field>
                    <field name="UNIT">SEC</field>
                  </block>
                </next>
              </block>
            </next>
          </block>
        </statement>
      </block>
    </next>
  </block>
</xml>`;

  // Oficina 1: Telemetria Oficial OBSAT & Painel IoT (Pacote JSON)
  const MISSION_OFICINA1_TELEMETRIA_XML = `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="project_info" id="info_of1_telemetria" x="30" y="30">
    <value name="project_author">
      <shadow type="text" id="auth_of1_telemetria">
        <field name="TEXT">Equipe OBSAT</field>
      </shadow>
    </value>
    <value name="project_iot_id">
      <shadow type="math_number" id="iot_of1_telemetria">
        <field name="NUM">41</field>
      </shadow>
    </value>
    <value name="project_description">
      <shadow type="text" id="desc_of1_telemetria">
        <field name="TEXT">Oficina 1: Telemetria Oficial OBSAT &amp; Painel IoT</field>
      </shadow>
    </value>
  </block>

  <block type="sat_mission_start" id="start_of1_telemetria" x="30" y="160">
    <field name="MISSION_NAME">CANSAT_OBSAT_01</field>
    <next>
      <block type="controls_whileUntil" id="loop_of1_telemetria">
        <field name="MODE">WHILE</field>
        <value name="BOOL">
          <block type="logic_boolean" id="bool_of1_telemetria">
            <field name="BOOL">TRUE</field>
          </block>
        </value>
        <statement name="DO">
          <block type="variables_set" id="set_pkt_of1">
            <field name="VAR">pacote_telemetria</field>
            <value name="VALUE">
              <block type="sat_obsat_telemetry_packet" id="pkt_of1">
                <mutation items="6" keys="[&quot;equipe&quot;,&quot;temperatura&quot;,&quot;pressao&quot;,&quot;altitude&quot;,&quot;bateria&quot;,&quot;payload&quot;]" labels="[&quot;Equipe ID&quot;,&quot;Temperatura (°C)&quot;,&quot;Pressão (hPa)&quot;,&quot;Altitude (m)&quot;,&quot;Bateria (ADC)&quot;,&quot;Payload Extra&quot;]"></mutation>
                <value name="VAL0">
                  <shadow type="math_number" id="val_team_of1">
                    <field name="NUM">41</field>
                  </shadow>
                </value>
                <value name="VAL1">
                  <block type="sat_sensor_bmp280_temp" id="val_temp_of1"></block>
                </value>
                <value name="VAL2">
                  <block type="sat_sensor_bmp280_press" id="val_press_of1"></block>
                </value>
                <value name="VAL3">
                  <block type="sat_sensor_bmp280_alt" id="val_alt_of1">
                    <field name="SEA_LEVEL">1013.25</field>
                  </block>
                </value>
                <value name="VAL4">
                  <block type="sat_battery_adc" id="val_bat_of1"></block>
                </value>
                <value name="VAL5">
                  <shadow type="text" id="val_payload_of1">
                    <field name="TEXT">estavel</field>
                  </shadow>
                </value>
              </block>
            </value>
            <next>
              <block type="text_print" id="print_pkt_of1">
                <value name="TEXT">
                  <block type="variables_get" id="get_pkt_of1">
                    <field name="VAR">pacote_telemetria</field>
                  </block>
                </value>
                <next>
                  <block type="sat_wait" id="wait_of1_telemetria">
                    <field name="TIME">2</field>
                    <field name="UNIT">SEC</field>
                  </block>
                </next>
              </block>
            </next>
          </block>
        </statement>
      </block>
    </next>
  </block>
</xml>`;

  // Oficina 2: Série Temporal Atmosférica (Investigação de Voo)
  const MISSION_OFICINA2_SERIE_XML = `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="project_info" id="info_of2_serie" x="30" y="30">
    <value name="project_author">
      <shadow type="text" id="auth_of2_serie">
        <field name="TEXT">Equipe OBSAT</field>
      </shadow>
    </value>
    <value name="project_iot_id">
      <shadow type="math_number" id="iot_of2_serie">
        <field name="NUM">42</field>
      </shadow>
    </value>
    <value name="project_description">
      <shadow type="text" id="desc_of2_serie">
        <field name="TEXT">Oficina 2: Série Temporal Atmosférica</field>
      </shadow>
    </value>
  </block>

  <block type="sat_mission_start" id="start_of2_serie" x="30" y="160">
    <field name="MISSION_NAME">ATMOSFERA_OBSAT_02</field>
    <next>
      <block type="controls_whileUntil" id="loop_of2_serie">
        <field name="MODE">WHILE</field>
        <value name="BOOL">
          <block type="logic_boolean" id="bool_of2_serie">
            <field name="BOOL">TRUE</field>
          </block>
        </value>
        <statement name="DO">
          <block type="variables_set" id="set_pkt_of2">
            <field name="VAR">telemetria_voo</field>
            <value name="VALUE">
              <block type="sat_obsat_telemetry_packet" id="pkt_of2_serie">
                <mutation items="6" keys="[&quot;equipe&quot;,&quot;temperatura&quot;,&quot;pressao&quot;,&quot;altitude&quot;,&quot;bateria&quot;,&quot;payload&quot;]" labels="[&quot;Equipe ID&quot;,&quot;Temperatura (°C)&quot;,&quot;Pressão (hPa)&quot;,&quot;Altitude (m)&quot;,&quot;Bateria (%)&quot;,&quot;Payload Extra&quot;]"></mutation>
                <value name="VAL0">
                  <shadow type="math_number" id="val_team_of2">
                    <field name="NUM">42</field>
                  </shadow>
                </value>
                <value name="VAL1">
                  <block type="sat_sensor_bmp280_temp" id="val_temp_of2"></block>
                </value>
                <value name="VAL2">
                  <block type="sat_sensor_bmp280_press" id="val_press_of2"></block>
                </value>
                <value name="VAL3">
                  <block type="sat_sensor_bmp280_alt" id="val_alt_of2">
                    <field name="SEA_LEVEL">1013.25</field>
                  </block>
                </value>
                <value name="VAL4">
                  <shadow type="math_number" id="val_bat_of2">
                    <field name="NUM">98</field>
                  </shadow>
                </value>
                <value name="VAL5">
                  <shadow type="text" id="val_payload_of2">
                    <field name="TEXT">serie_temporal_ativa</field>
                  </shadow>
                </value>
              </block>
            </value>
            <next>
              <block type="text_print" id="print_of2_serie">
                <value name="TEXT">
                  <block type="variables_get" id="get_pkt_of2">
                    <field name="VAR">telemetria_voo</field>
                  </block>
                </value>
                <next>
                  <block type="sat_wait" id="wait_of2_serie">
                    <field name="TIME">1</field>
                    <field name="UNIT">SEC</field>
                  </block>
                </next>
              </block>
            </next>
          </block>
        </statement>
      </block>
    </next>
  </block>
</xml>`;

  // Oficina 2: Decisão Autônoma & Alerta de Bordo
  const MISSION_OFICINA2_ALERTA_XML = `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="project_info" id="info_of2_alerta" x="30" y="30">
    <value name="project_author">
      <shadow type="text" id="auth_of2_alerta">
        <field name="TEXT">Equipe OBSAT</field>
      </shadow>
    </value>
    <value name="project_iot_id">
      <shadow type="math_number" id="iot_of2_alerta">
        <field name="NUM">42</field>
      </shadow>
    </value>
    <value name="project_description">
      <shadow type="text" id="desc_of2_alerta">
        <field name="TEXT">Oficina 2: Decisão Autônoma &amp; Alerta de Bordo</field>
      </shadow>
    </value>
  </block>

  <block type="sat_mission_start" id="start_of2_alerta" x="30" y="160">
    <field name="MISSION_NAME">ALERTA_OBSAT_02</field>
    <next>
      <block type="controls_whileUntil" id="loop_of2_alerta">
        <field name="MODE">WHILE</field>
        <value name="BOOL">
          <block type="logic_boolean" id="bool_of2_alerta">
            <field name="BOOL">TRUE</field>
          </block>
        </value>
        <statement name="DO">
          <block type="variables_set" id="set_temp_of2">
            <field name="VAR">temp</field>
            <value name="VALUE">
              <block type="sat_sensor_bmp280_temp" id="bmp_temp_of2_alerta"></block>
            </value>
            <next>
              <block type="controls_if" id="if_alerta_of2">
                <mutation else="1"></mutation>
                <value name="IF0">
                  <block type="logic_compare" id="comp_temp_of2">
                    <field name="OP">GT</field>
                    <value name="A">
                      <block type="variables_get" id="get_temp_of2">
                        <field name="VAR">temp</field>
                      </block>
                    </value>
                    <value name="B">
                      <block type="math_number" id="num_limite_of2">
                        <field name="NUM">30</field>
                      </block>
                    </value>
                  </block>
                </value>
                <statement name="DO0">
                  <block type="sat_actuator_led_status" id="led_alerta_on">
                    <field name="PIN">2</field>
                    <field name="STATE">1</field>
                    <next>
                      <block type="text_print" id="print_alerta_critico">
                        <value name="TEXT">
                          <block type="text" id="txt_alerta_critico">
                            <field name="TEXT">[ALERTA] Temperatura acima do limite seguro!</field>
                          </block>
                        </value>
                      </block>
                    </next>
                  </block>
                </statement>
                <statement name="ELSE">
                  <block type="sat_actuator_led_status" id="led_alerta_off">
                    <field name="PIN">2</field>
                    <field name="STATE">0</field>
                    <next>
                      <block type="text_print" id="print_status_nominal">
                        <value name="TEXT">
                          <block type="text" id="txt_status_nominal">
                            <field name="TEXT">[NOMINAL] Temperatura normal de voo.</field>
                          </block>
                        </value>
                      </block>
                    </next>
                  </block>
                </statement>
                <next>
                  <block type="sat_wait" id="wait_of2_alerta">
                    <field name="TIME">1</field>
                    <field name="UNIT">SEC</field>
                  </block>
                </next>
              </block>
            </next>
          </block>
        </statement>
      </block>
    </next>
  </block>
</xml>`;

  // Catálogo completo de Missões Oficiais do SatBlocks
  const OFFICIAL_MISSIONS = [
    {
      id: 'oficina1_minimo',
      uid: 'proj_oficina1_minimo',
      oficina: 'Oficina 1: Primeiro Contato',
      title: 'Oficina 1: Programa Mínimo (Olá, Terra!)',
      missionName: 'CANSAT_OBSAT_01',
      badge: 'Programa Mínimo',
      badgeColor: '#10b981',
      description: 'Inicializa o computador de bordo do CanSat e envia a mensagem oficial "Olá, Terra!" para o console REPL da estação de solo.',
      tags: ['OBC', 'REPL', 'Olá Terra', 'Saída de Texto'],
      xml: MISSION_OFICINA1_MINIMO_XML
    },
    {
      id: 'oficina1_beacon',
      uid: 'proj_oficina1_beacon',
      oficina: 'Oficina 1: Primeiro Contato',
      title: 'Oficina 1: Fazendo Barulho (Buzzer no GPIO 25 & S.O.S.)',
      missionName: 'SOM_CANSAT_01',
      badge: 'Som & Alarme',
      badgeColor: '#0284c7',
      description: 'Aciona o buzzer de localização nativo no pino GPIO 25 emitindo tom sonoro de emergência com 3 repetições (desafio S.O.S.).',
      tags: ['Buzzer GPIO 25', 'Alarme Sonoro', 'S.O.S.', 'Atuadores'],
      xml: MISSION_OFICINA1_BEACON_XML
    },
    {
      id: 'oficina1_farol',
      uid: 'proj_oficina1_farol',
      oficina: 'Oficina 1: Primeiro Contato',
      title: 'Oficina 1: Pisca-Pisca Controlado (Luzes de Navegação MCP23017)',
      missionName: 'FAROL_MCP_01',
      badge: 'Luzes de Navegação',
      badgeColor: '#16a34a',
      description: 'Varredura sequencial das luzes de navegação da OBSAT percorrendo os pinos 0 a 7 do expansor MCP23017 em um laço for (auto-inicializado, sem bloco de init).',
      tags: ['Luzes de Navegação', 'MCP23017', 'Laço For', 'Piscar Todos', 'Atuadores'],
      xml: MISSION_OFICINA1_FAROL_XML
    },
    {
      id: 'oficina1_bmp280',
      uid: 'proj_oficina1_bmp280',
      oficina: 'Oficina 1: Primeiro Contato',
      title: 'Oficina 1: Barômetro BMP280 (Primeiro Sensor)',
      missionName: 'CANSAT_OBSAT_01',
      badge: 'Sensores',
      badgeColor: '#8b5cf6',
      description: 'Realiza a primeira leitura ambiental real com o barômetro digital BMP280 via I2C em graus Celsius.',
      tags: ['BMP280', 'Sensor Térmico', 'I2C 0x76', 'Payload'],
      xml: MISSION_OFICINA1_BMP280_XML
    },
    {
      id: 'oficina1_telemetria',
      uid: 'proj_oficina1_telemetria',
      oficina: 'Oficina 1: Primeiro Contato',
      title: 'Oficina 1: Telemetria Oficial OBSAT & Painel IoT',
      missionName: 'CANSAT_OBSAT_01',
      badge: 'Telemetria & IoT',
      badgeColor: '#e11d48',
      description: 'Estruturação do pacote oficial da OBSAT (Equipe, Temperatura, Pressão, Altitude, Bateria e Payload), transmitindo via Serial e alimentando gráficos ao vivo no Painel IoT.',
      tags: ['Pacote JSON', 'Painel IoT', 'Telemetria Serial', 'Databoard'],
      xml: MISSION_OFICINA1_TELEMETRIA_XML
    },
    {
      id: 'oficina2_serie',
      uid: 'proj_oficina2_serie',
      oficina: 'Oficina 2: Missão Atmosfera',
      title: 'Oficina 2: Série Temporal Atmosférica',
      missionName: 'ATMOSFERA_OBSAT_02',
      badge: 'Investigação',
      badgeColor: '#0284c7',
      description: 'Coleta contínua de telemetria ambiental para comparação de estados físicos e investigação científica no Painel IoT.',
      tags: ['Série Temporal', 'Evidência Física', 'Databoard IoT', 'Amostragem'],
      xml: MISSION_OFICINA2_SERIE_XML
    },
    {
      id: 'oficina2_alerta',
      uid: 'proj_oficina2_alerta',
      oficina: 'Oficina 2: Missão Atmosfera',
      title: 'Oficina 2: Decisão Autônoma & Alerta de Bordo',
      missionName: 'ALERTA_OBSAT_02',
      badge: 'Autonomia',
      badgeColor: '#ea580c',
      description: 'Lógica condicional de voo que analisa a temperatura e aciona automaticamente o farol de emergência em caso de anomalia térmica.',
      tags: ['Decisão Autônoma', 'IF/ELSE', 'Alerta LED', 'Segurança'],
      xml: MISSION_OFICINA2_ALERTA_XML
    },
    {
      id: 'missao_cam_espia',
      uid: 'proj_mission_2_cam',
      oficina: 'Missões Especiais',
      title: 'Missão Especial: Estação Meteorológica Espiã (ESP32-CAM)',
      missionName: 'ESP32CAM_OBSAT_02',
      badge: 'Câmera & Wi-Fi',
      badgeColor: '#ec4899',
      description: 'Transmissão contínua de imagens QVGA OV2640 via servidor Wi-Fi Hotspot autônomo.',
      tags: ['ESP32-CAM', 'Câmera OV2640', 'Hotspot Wi-Fi', 'WebServer'],
      xml: MISSION_2_XML
    },
    {
      id: 'missao_rp2040_mensa',
      uid: 'proj_mission_rp2040',
      oficina: 'Missões Especiais',
      title: 'Missão Especial: Oficina Mensa (RP2040 + BMP280 + MPU6050)',
      missionName: 'RP2040_MENSA_01',
      badge: 'RP2040 Inercial',
      badgeColor: '#6366f1',
      description: 'Sonda completa com RP2040-Zero, barômetro BMP280, sensores inerciais MPU6050 e LED RGB NeoPixel.',
      tags: ['Waveshare RP2040', 'MPU6050', 'RGB NeoPixel', 'Telemetria'],
      xml: MISSION_RP2040_MENSA_XML
    },
    {
      id: 'missao_edital_obsat',
      uid: 'proj_mission_4_completa',
      oficina: 'Missões Especiais',
      title: 'Missão Oficial Edital OBSAT: Observação da Terra Completa',
      missionName: 'OBSAT_COMPLETA_04',
      badge: 'Edital 2026',
      badgeColor: '#14b8a6',
      description: 'Programa avançado integrando câmera, sensores ambientais múltiplos, telemetria HTTP e monitoramento de bateria.',
      tags: ['Edital Oficial', 'Câmera', 'Multi-Sensor', 'HTTP Cloud'],
      xml: MISSION_4_XML
    }
  ];


  function init() {
    domProjectList = document.getElementById('ProjectList');
    domAccountUser = document.getElementById('account_user');
    domAccountPanel = document.getElementById('bipesAccountPanel');

    // Inicializa Usuário BIPES
    const savedUser = localStorage.getItem('account_user') || 'Equipe OBSAT';
    if (domAccountUser) {
      domAccountUser.innerText = savedUser;
      domAccountUser.addEventListener('blur', () => {
        const val = domAccountUser.innerText.trim() || 'Equipe OBSAT';
        domAccountUser.innerText = val;
        localStorage.setItem('account_user', val);
        if (window.SatFiles && window.SatFiles.showDriverToast) {
          window.SatFiles.showDriverToast(`👤 Usuário atualizado para "${val}"`);
        }
      });
    }

    // Carrega projetos do BIPES
    loadBipesProjects();

    // Eventos do painel
    const btnNew = document.getElementById('newProjectButton');
    if (btnNew) {
      btnNew.addEventListener('click', () => {
        createNewProject();
      });
    }

    // Eventos do avatar do usuário e painel de projetos
    const btnAvatar = document.getElementById('btnBipesUserAvatar') || document.getElementById('btnProfileToggle');
    if (btnAvatar) {
      btnAvatar.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleAccountPanel();
      });
    }

    // Eventos do Modal de Missões
    const btnMissionsTop = document.getElementById('btnOpenMissionsModal') || document.getElementById('btnOpenMissionsTop');
    if (btnMissionsTop) {
      btnMissionsTop.onclick = (e) => {
        if (e && e.preventDefault) e.preventDefault();
        openMissionsModal();
      };
    }

    const btnCreateNewMiss = document.getElementById('btnCreateNewMission');
    if (btnCreateNewMiss) {
      btnCreateNewMiss.onclick = () => {
        closeMissionsModal();
        createNewProject();
      };
    }

    document.querySelectorAll('.sat-modal-close').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.sat-modal-overlay');
        if (modal) {
          modal.style.display = 'none';
          modal.classList.remove('show');
          modal.classList.remove('active');
        }
      });
    });

    // Fecha ao clicar fora
    document.addEventListener('click', (e) => {
      if (domAccountPanel && domAccountPanel.style.display !== 'none') {
        if (!domAccountPanel.contains(e.target) && e.target !== btnAvatar && !btnAvatar.contains(e.target)) {
          domAccountPanel.style.display = 'none';
        }
      }
      const missionsModal = document.getElementById('modalMissionsOverlay');
      if (missionsModal && e.target === missionsModal) {
        closeMissionsModal();
      }
    });

    // Suporte a carregamento direto via query string ?mission=<id>
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const missionParam = urlParams.get('mission') || urlParams.get('missao') || urlParams.get('m');
      if (missionParam) {
        loadOfficialMission(missionParam);
        setTimeout(() => {
          loadOfficialMission(missionParam);
        }, 180);
      }
    } catch (e) {}
  }

  function toggleAccountPanel(e) {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    if (!domAccountPanel) {
      domAccountPanel = document.getElementById('bipesAccountPanel');
    }
    if (!domAccountPanel) return;

    const isHidden = domAccountPanel.style.display === 'none' || !domAccountPanel.style.display;
    domAccountPanel.style.display = isHidden ? 'block' : 'none';
    if (isHidden) {
      loadBipesProjects();
    }
  }

  function getProjectsObject() {
    let projects = {};
    if (localStorage.getItem('bipes_projects')) {
      try {
        projects = JSON.parse(localStorage.getItem('bipes_projects'));
      } catch (e) {
        projects = {};
      }
    }
    return projects;
  }

  function loadBipesProjects() {
    const projects = getProjectsObject();

    // Injeta todas as missões oficiais no catálogo nativo do usuário
    let orderOffset = OFFICIAL_MISSIONS.length * 1000;
    OFFICIAL_MISSIONS.forEach((m, idx) => {
      const uid = m.uid;
      const existing = localStorage.getItem(uid);
      if (!existing || existing.length < 50) {
        localStorage.setItem(uid, m.xml);
      }
      if (!projects[uid]) {
        projects[uid] = (+new Date()) - (orderOffset - (idx * 100));
      }
    });

    localStorage.setItem('bipes_projects', JSON.stringify(projects));

    // Renderiza a lista de projetos no painel
    if (domProjectList) domProjectList.innerHTML = '';
    for (const uid in projects) {
      if (localStorage[uid] !== undefined) {
        listProject(uid, projects[uid]);
      } else {
        delete projects[uid];
      }
    }
    localStorage.setItem('bipes_projects', JSON.stringify(projects));

    // Abre o último editado ou o atual
    if (!currentProject.uid && Object.keys(projects).length > 0) {
      const latestUid = Object.keys(projects).reduce((a, b) => (projects[a] > projects[b]) ? a : b);
      openProject(latestUid);
    } else if (currentProject.uid) {
      highlightActiveProject(currentProject.uid);
    }
  }


  function renderMissionsCatalogModal() {
    const container = document.getElementById('missionsListCards');
    if (!container) return;

    container.innerHTML = '';

    const groups = {};
    OFFICIAL_MISSIONS.forEach(m => {
      const cat = m.oficina || 'Geral';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(m);
    });

    const missionIcons = {
      'oficina1_minimo': { icon: '🚀', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)' },
      'oficina1_beacon': { icon: '📡', bg: 'rgba(2, 132, 199, 0.12)', border: 'rgba(2, 132, 199, 0.3)' },
      'oficina1_farol': { icon: '💡', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.3)' },
      'oficina1_bmp280': { icon: '🏔️', bg: 'rgba(139, 92, 246, 0.12)', border: 'rgba(139, 92, 246, 0.3)' },
      'oficina1_telemetria': { icon: '📊', bg: 'rgba(37, 99, 235, 0.12)', border: 'rgba(37, 99, 235, 0.3)' },
      'oficina2_serie': { icon: '📈', bg: 'rgba(2, 132, 199, 0.12)', border: 'rgba(2, 132, 199, 0.3)' },
      'oficina2_alerta': { icon: '⚠️', bg: 'rgba(234, 88, 12, 0.12)', border: 'rgba(234, 88, 12, 0.3)' },
      'missao_cam_espia': { icon: '📷', bg: 'rgba(236, 72, 153, 0.12)', border: 'rgba(236, 72, 153, 0.3)' },
      'missao_rp2040_mensa': { icon: '⚡', bg: 'rgba(124, 58, 237, 0.12)', border: 'rgba(124, 58, 237, 0.3)' },
      'missao_edital_obsat': { icon: '🛰️', bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.3)' }
    };

    for (const cat in groups) {
      const secHeader = document.createElement('div');
      secHeader.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin:16px 0 10px 0;padding:7px 12px;background:#f1f5f9;border-radius:10px;border-left:4px solid #0284c7;';
      secHeader.innerHTML = `
        <span style="font-size:12px;font-weight:800;color:#0f172a;letter-spacing:0.3px;text-transform:uppercase;">${cat}</span>
        <span style="font-size:10.5px;font-weight:700;background:#ffffff;border:1px solid #cbd5e1;color:#475569;padding:2px 8px;border-radius:10px;">${groups[cat].length} missões</span>
      `;
      container.appendChild(secHeader);

      const grid = document.createElement('div');
      grid.style.cssText = 'display:flex;flex-direction:column;gap:10px;margin-bottom:14px;';

      groups[cat].forEach(m => {
        const iconConfig = missionIcons[m.id] || { icon: '🛰️', bg: 'rgba(2, 132, 199, 0.1)', border: 'rgba(2, 132, 199, 0.25)' };
        const card = document.createElement('div');
        card.className = 'channel-option-card';
        card.style.cssText = 'cursor:pointer;';

        const tagsHtml = (m.tags || []).map(t => `<span class="tag-pill" style="font-size:10px;font-weight:600;background:#f1f5f9;color:#475569;border:1px solid #e2e8f0;padding:2px 7px;border-radius:6px;">${t}</span>`).join(' ');

        card.innerHTML = `
          <div class="channel-card-icon" style="background:${iconConfig.bg};border:1px solid ${iconConfig.border};font-size:22px;">
            ${iconConfig.icon}
          </div>
          <div class="channel-card-content">
            <div class="channel-card-header-row" style="flex-wrap:wrap;gap:6px;">
              <span class="channel-card-title" style="font-size:13.5px;font-weight:800;color:#0f172a;">${m.title}</span>
              <span class="channel-badge" style="background:${m.badgeColor || '#0284c7'}18;color:${m.badgeColor || '#0284c7'};border:1px solid ${m.badgeColor || '#0284c7'}40;">${m.badge}</span>
              <span style="font-family:'JetBrains Mono',monospace;font-size:10.5px;font-weight:700;color:#0284c7;background:#f0f9ff;border:1px solid #bae6fd;padding:2px 6px;border-radius:6px;">[${m.missionName}]</span>
            </div>
            <p class="channel-card-desc" style="margin-top:3px;font-size:12px;color:#64748b;line-height:1.45;">${m.description}</p>
            <div style="display:flex;gap:5px;margin-top:6px;flex-wrap:wrap;">
              ${tagsHtml}
            </div>
          </div>
          <button class="channel-action-btn blue" style="padding:8px 16px;">
            <span>Carregar</span>
            <span>➔</span>
          </button>
        `;

        card.addEventListener('click', () => {
          loadOfficialMission(m.id);
          closeMissionsModal();
        });

        grid.appendChild(card);
      });

      container.appendChild(grid);
    }
  }

  function getMissionById(idOrUid) {
    if (!idOrUid) return null;
    const target = String(idOrUid).toLowerCase().trim();
    return OFFICIAL_MISSIONS.find(m => {
      const mId = (m.id || '').toLowerCase();
      const mUid = (m.uid || '').toLowerCase();
      const mMissionName = (m.missionName || '').toLowerCase();
      return mId === target || 
             mUid === target || 
             mMissionName === target ||
             mId.replace(/_/g, '') === target.replace(/_/g, '') ||
             mUid.replace(/_/g, '') === target.replace(/_/g, '');
    }) || null;
  }

  function openMissionsModal() {
    const modal = document.getElementById('modalMissionsOverlay');
    if (modal) {
      renderMissionsCatalogModal();
      modal.style.display = 'flex';
      modal.classList.add('active');
      modal.classList.add('show');
    }
  }

  function closeMissionsModal() {
    const modal = document.getElementById('modalMissionsOverlay');
    if (modal) {
      modal.style.display = 'none';
      modal.classList.remove('active');
      modal.classList.remove('show');
    }
  }

  function loadOfficialMission(idOrUid) {
    const mission = getMissionById(idOrUid);
    if (!mission) {
      console.warn('Missão não encontrada:', idOrUid);
      return false;
    }

    // Registra como projeto ativo
    currentProject.uid = mission.uid;
    currentProject.xml = mission.xml;
    currentProject.name = mission.title;

    localStorage.setItem(mission.uid, mission.xml);
    localStorage.setItem('satblocks_saved_workspace_v2', mission.xml);

    const projects = getProjectsObject();
    projects[mission.uid] = +new Date();
    localStorage.setItem('bipes_projects', JSON.stringify(projects));

    highlightActiveProject(mission.uid);

    // Se o SatBlocksApp já expõe loadMissionXml
    if (window.SatBlocksApp && typeof window.SatBlocksApp.loadMissionXml === 'function') {
      return window.SatBlocksApp.loadMissionXml(mission.xml, mission.title);
    }

    // Injeta no workspace Blockly
    if (window.SatBlocksApp && window.SatBlocksApp.getWorkspace) {
      const ws = window.SatBlocksApp.getWorkspace();
      if (ws) {
        try {
          ws.clear();
          const parser = Blockly.Xml.textToDom || (Blockly.utils && Blockly.utils.xml && Blockly.utils.xml.textToDom);
          const dom = parser(mission.xml);
          Blockly.Xml.domToWorkspace(dom, ws);
          if (typeof window.SatBlocksApp.updateGeneratedCode === 'function') {
            window.SatBlocksApp.updateGeneratedCode();
          }
          if (typeof window.SatBlocksApp.switchMainTab === 'function') {
            window.SatBlocksApp.switchMainTab('blocks');
          }

          if (window.SatFiles && window.SatFiles.showDriverToast) {
            window.SatFiles.showDriverToast(`🚀 ${mission.title} carregada com sucesso!`);
          }
          return true;
        } catch (err) {
          console.error('Erro ao carregar missão no workspace:', err);
        }
      }
    }
    return false;
  }

  function listProject(uid, timestamp) {
    if (!domProjectList) return;

    const xml = localStorage[uid] || '';
    const projName = extractProjectName(xml) || `Projeto #${uid.substring(uid.length - 4)}`;

    const item = document.createElement('div');
    item.className = 'project-item';
    item.id = `item_${uid}`;
    if (currentProject.uid === uid) {
      item.classList.add('active');
    }

    const infoDiv = document.createElement('div');
    infoDiv.className = 'project-item-info';
    infoDiv.innerHTML = `
      <div class="project-name">${projName}</div>
      <div class="project-date">${new Date(timestamp).toLocaleDateString('pt-BR')} ${new Date(timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
    `;
    infoDiv.addEventListener('click', () => {
      openProject(uid);
      if (domAccountPanel) domAccountPanel.style.display = 'none';
    });

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'project-item-actions';

    // Botão de Download XML/SatBlocks
    const btnDownload = document.createElement('button');
    btnDownload.className = 'project-action-btn';
    btnDownload.title = 'Exportar Projeto (.satblocks)';
    btnDownload.innerHTML = '📥';
    btnDownload.addEventListener('click', (e) => {
      e.stopPropagation();
      downloadProject(uid);
    });

    // Botão de Excluir
    const btnDelete = document.createElement('button');
    btnDelete.className = 'project-action-btn delete';
    btnDelete.title = 'Excluir Projeto';
    btnDelete.innerHTML = '🗑️';
    btnDelete.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteProject(uid);
    });

    actionsDiv.appendChild(btnDownload);
    actionsDiv.appendChild(btnDelete);

    item.appendChild(infoDiv);
    item.appendChild(actionsDiv);
    domProjectList.appendChild(item);
  }

  function extractProjectName(xmlText) {
    if (!xmlText) return '';
    const match = xmlText.match(/<field name="TEXT">([^<]+)<\/field>/);
    if (match && match[1]) {
      return match[1];
    }
    return '';
  }

  function createNewProject(customName) {
    const uid = 'proj_' + Math.random().toString(36).substr(2, 9);
    const name = customName || `Missão OBSAT #${Math.floor(Math.random() * 900 + 100)}`;
    const newXml = `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="project_info" id="info_${uid}" x="30" y="30">
    <value name="project_author">
      <shadow type="text" id="author_${uid}">
        <field name="TEXT">${localStorage.getItem('account_user') || 'Equipe OBSAT'}</field>
      </shadow>
    </value>
    <value name="project_iot_id">
      <shadow type="math_number" id="iot_${uid}">
        <field name="NUM">42</field>
      </shadow>
    </value>
    <value name="project_description">
      <shadow type="text" id="desc_${uid}">
        <field name="TEXT">${name}</field>
      </shadow>
    </value>
  </block>
</xml>`;

    const projects = getProjectsObject();
    projects[uid] = +new Date();
    localStorage.setItem('bipes_projects', JSON.stringify(projects));
    localStorage.setItem(uid, newXml);

    loadBipesProjects();
    openProject(uid);
    if (window.SatFiles && window.SatFiles.showDriverToast) {
      window.SatFiles.showDriverToast(`✨ Novo projeto "${name}" criado!`);
    }
  }

  function openProject(uid) {
    const xml = localStorage[uid];
    if (xml === undefined) return;

    currentProject.uid = uid;
    currentProject.xml = xml;
    currentProject.name = extractProjectName(xml) || 'Projeto';

    const projects = getProjectsObject();
    projects[uid] = +new Date();
    localStorage.setItem('bipes_projects', JSON.stringify(projects));

    highlightActiveProject(uid);

    // Carrega no Workspace Blockly
    if (window.SatBlocksApp && window.SatBlocksApp.getWorkspace) {
      const ws = SatBlocksApp.getWorkspace();
      if (ws) {
        try {
          ws.clear();
          const parseXml = Blockly.Xml.textToDom || (Blockly.utils && Blockly.utils.xml && Blockly.utils.xml.textToDom);
          const dom = parseXml(xml);
          Blockly.Xml.domToWorkspace(dom, ws);
          if (typeof SatBlocksApp.updateGeneratedCode === 'function') {
            SatBlocksApp.updateGeneratedCode();
          }
          if (window.SatFiles && window.SatFiles.showDriverToast) {
            window.SatFiles.showDriverToast(`📂 Projeto "${currentProject.name}" carregado.`);
          }
        } catch (err) {
          console.error('Erro ao carregar XML no workspace:', err);
        }
      }
    }
  }

  function saveCurrentWorkspace(xmlText) {
    if (!currentProject.uid) {
      // Registra o workspace em andamento como um projeto novo, SEM recarregar/limpar
      // o workspace (createNewProject() faria isso via openProject, perdendo a edição atual).
      currentProject.uid = 'proj_' + Math.random().toString(36).substr(2, 9);
    }
    if (currentProject.uid) {
      currentProject.xml = xmlText;
      currentProject.name = extractProjectName(xmlText) || currentProject.name;
      localStorage.setItem(currentProject.uid, xmlText);
      localStorage.setItem('satblocks_saved_workspace_v2', xmlText);

      const projects = getProjectsObject();
      projects[currentProject.uid] = +new Date();
      localStorage.setItem('bipes_projects', JSON.stringify(projects));
    }
  }

  function deleteProject(uid) {
    if (!confirm('Deseja realmente excluir este projeto/missão?')) return;

    const projects = getProjectsObject();
    delete projects[uid];
    localStorage.removeItem(uid);
    localStorage.setItem('bipes_projects', JSON.stringify(projects));

    if (currentProject.uid === uid) {
      currentProject.uid = null;
      const remainingUids = Object.keys(projects);
      if (remainingUids.length > 0) {
        openProject(remainingUids[0]);
      } else {
        createNewProject('Missão OBSAT 1');
      }
    }

    loadBipesProjects();
  }

  function downloadProject(uid) {
    const xml = localStorage[uid];
    if (!xml) return;

    const name = extractProjectName(xml) || 'projeto_obsat';
    const cleanFileName = name.toLowerCase().replace(/[^a-z0-9_]/g, '_') + '.satblocks';

    const blob = new Blob([xml], { type: 'text/xml;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = cleanFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function highlightActiveProject(uid) {
    if (!domProjectList) return;
    domProjectList.querySelectorAll('.project-item').forEach(el => {
      el.classList.toggle('active', el.id === `item_${uid}`);
    });
  }

  return {
    init,
    createNewProject,
    openProject,
    saveCurrentWorkspace,
    loadBipesProjects,
    loadOfficialMission,
    openMissionsModal,
    closeMissionsModal,
    getMissionById,
    getActiveMission: () => currentProject,
    setActiveMission: (m) => {
      if (m) {
        currentProject.uid = m.uid;
        currentProject.xml = m.xml;
        currentProject.name = m.title;
        highlightActiveProject(m.uid);
      }
    },
    getOfficialMissions: () => OFFICIAL_MISSIONS,
    getCurrentProject: () => currentProject,
    getMissionRp2040Xml: () => MISSION_RP2040_MENSA_XML,
    getMissionRp2040MensaXml: () => MISSION_RP2040_MENSA_XML,
    getMissionRp2040ObsatXml: () => MISSION_RP2040_OBSAT_XML,
    getMission4Xml: () => MISSION_4_XML,
    toggleAccountPanel
  };
})();

window.addEventListener('DOMContentLoaded', () => {
  SatProfiles.init();
});
