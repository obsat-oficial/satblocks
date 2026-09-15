# SatBlocks

**SatBlocks** é uma plataforma de programação em blocos (MicroPython) voltada para as oficinas educacionais da **OBSAT** (Olimpíada Brasileira de Satélites), permitindo que participantes montem missões de satélite/CubeSat — sensores, LEDs, telemetria, conexão Wi-Fi/MQTT — sem escrever código diretamente, e exportem/gravem firmware MicroPython real em placas ESP32, ESP32-CAM e Waveshare RP2040-Zero, entre outras.

Este projeto é um **fork** de [BIPES](https://github.com/BIPES/BIPES) — *Block based Integrated Platform for Embedded Systems* — desenvolvido pelo Laboratório de Sistemas Integráveis (LSI-TEC/USP). O SatBlocks reaproveita a base do editor de blocos (Blockly) e da geração de código Python do BIPES, adaptando e estendendo a plataforma com:

- Blocos e missões específicos da OBSAT (sensores de satélite, ADCS, EPS, payload de câmera, telemetria de voo).
- Um "Studio" para criação de blocos e definições customizadas.
- Um flasher de firmware integrado ao navegador (WebSerial/esptool) para placas ESP32 e RP2040.
- Um painel de telemetria em tempo real para acompanhar os dados enviados pelos satélites das equipes durante as oficinas.
- Suporte a placas e variantes específicas usadas nas oficinas (Waveshare RP2040-Zero, ESP32-CAM em diferentes fabricantes).

## Créditos

Agradecemos à equipe do BIPES pelo trabalho original, disponível em [github.com/BIPES/BIPES](https://github.com/BIPES/BIPES) e [bipes.net.br](https://bipes.net.br/). O SatBlocks mantém a mesma licença do projeto original.

## Licença

Este projeto é distribuído sob a licença **GNU General Public License v3.0** (GPL-3.0) — veja o arquivo [LICENSE](LICENSE) para o texto completo, em conformidade com a licença do projeto original BIPES.

## Sobre a OBSAT

Mais informações sobre a Olimpíada Brasileira de Satélites em [obsat.org.br](https://www.obsat.org.br/).
