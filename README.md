# SatBlocks

**SatBlocks** é uma plataforma de programação em blocos (MicroPython) voltada para as oficinas educacionais da **OBSAT** (Olimpíada Brasileira de Satélites), permitindo que participantes montem missões de satélite/CubeSat — sensores, LEDs, telemetria, conexão Wi-Fi/MQTT — sem escrever código diretamente, e exportem/gravem firmware MicroPython real em placas ESP32, ESP32-CAM e Waveshare RP2040-Zero, entre outras.

Este projeto é um **fork** de [BIPES](https://github.com/BIPES/BIPES) — *Block based Integrated Platform for Embedded Systems* — criado pelo **Dr. Rafael Vidal Aroca**, professor da UFSCar ([bipes.net.br/aroca](http://bipes.net.br/aroca/)). O SatBlocks reaproveita a base do editor de blocos (Blockly) e da geração de código Python do BIPES, adaptando e estendendo a plataforma com:

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

A **Olimpíada Brasileira de Satélites (OBSAT)** é uma olimpíada científica bienal que promove experiências teóricas e práticas em projetos de pequenos satélites, com o objetivo de difundir a cultura aeroespacial e o conhecimento em STEM entre estudantes e professores de todo o Brasil. É organizada pela **UFSCar (Universidade Federal de São Carlos)**, com apoio da Agência Espacial Brasileira (AEB) e do Ministério da Ciência, Tecnologia e Inovação (MCTI).

A olimpíada é dividida em duas modalidades:

- **Modalidade Teórica**: aberta a estudantes do Ensino Fundamental ao Ensino Médio/Técnico.
- **Modalidade Prática**: equipes de 2 a 4 estudantes (Ensino Fundamental II, Médio/Técnico ou Superior) acompanhadas por um mentor maior de 18 anos, que projetam, constroem e lançam pequenos satélites reais (CanSat, PocketQube, CubeSats) ao longo de 5 fases — da capacitação inicial ao lançamento suborbital por foguete na final nacional, passando por lançamentos regionais com balão estratosférico.

Mais informações em [obsat.org.br](https://obsat.org.br/).

## Por que o SatBlocks existe

O SatBlocks faz parte das iniciativas da OBSAT de criar recursos e atividades práticas para as equipes da **modalidade prática** — permitindo que estudantes programem sensores, atuadores, telemetria e comunicação sem barreira de sintaxe de código, e ainda assim gravem firmware MicroPython real nas placas usadas nas oficinas e nas fases de construção dos satélites.
