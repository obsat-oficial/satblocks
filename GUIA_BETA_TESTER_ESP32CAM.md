# 🚀 SatBlocks by BIPES — Guia do Beta Tester (Missão 4 & ESP32-CAM)

Olá, Astronauta e Beta Tester! 🛰️
Bem-vindo(a) ao **SatBlocks by BIPES**, a plataforma de programação em blocos espacial para a **Olimpíada Brasileira de Satélites (OBSAT)**.

Com este kit portátil, você irá programar o computador de bordo do seu satélite utilizando uma placa **ESP32-CAM**, tirar fotos orbitais, ler sensores e transmitir dados de telemetria em tempo real!

---

## 📋 O que você precisa:
1. **Computador** com navegador **Google Chrome**, **Microsoft Edge** ou **Opera** (que possuem suporte a Web Serial USB).
2. **Placa ESP32-CAM** com cabo USB conectado ao computador.
3. Não precisa instalar nenhum programa ou Python no computador — tudo roda 100% direto no seu navegador!

---

## 🛠️ Passo 1: Gravar o Firmware na sua ESP32-CAM (Flasher)

Antes de programar pela primeira vez, precisamos colocar o sistema operacional do satélite (MicroPython com suporte a Câmera) na memória da placa:

1. Dê um duplo-clique no arquivo **`flasher.html`** para abrir o gravador no navegador.
2. Conecte sua ESP32-CAM na porta USB do computador.
   > **Dica importante**: Se a sua placa estiver conectada via módulo adaptador USB (**ESP32-CAM-MB**), basta plugar o cabo. Se estiver usando módulo FTDI/Serial avulso, conecte o **GPIO 0 ao GND** antes de ligar o cabo na USB para colocá-la em modo de gravação.
3. No Flasher, selecione a opção **"ESP32-CAM (MicroPython com Câmera OV2640)"**.
4. Clique no botão **"🔌 Conectar ESP32-CAM"** e selecione a porta serial da sua placa.
5. Clique em **"⚡ Gravar Firmware"** e aguarde a barra de progresso chegar a 100%.
6. Pronto! Ao finalizar:
   - Se usou o jumper entre GPIO 0 e GND, desconecte-o agora.
   - Pressione o botãozinho **Reset (RST)** na plaquinha.

---

## 💻 Passo 2: Abrindo e Programando no SatBlocks

1. Dê um duplo-clique no arquivo **`index.html`** para abrir a IDE SatBlocks.
2. No topo da tela, verifique se a placa selecionada é **`ESP32-CAM (AI-Thinker)`**.
3. Clique no botão **`Conectar`** (ícone de tomada USB) e selecione a porta da sua ESP32-CAM.
   * Quando o botão ficar **Verde**, seu computador de bordo estará conectado e pronto para receber comandos!

---

## 📸 Passo 3: Testando a Missão 4 (Câmera & Telemetria)

Na **Missão 4**, o satélite deve capturar imagens da superfície da Terra e registrar os dados de voo:

### Opção A: Usar os Exemplos Prontos do Guia de Referência
1. Clique na aba lateral **`📘 Referência`** no lado direito da tela.
2. Clique no botão **`📷 Câmera`** ou **`🛰️ Missão`**.
3. Escolha um exemplo e clique no botão **`➕ Usar Bloco`** (ou arraste pela alça com os pontinhos).
4. O programa completo será montado automaticamente na sua área de trabalho!

### Opção B: Montar seu Próprio Código em Blocos
1. No menu lateral esquerdo, abra a categoria **`📷 Câmera & Payload`**.
2. Arraste o bloco **`Inicializar Câmera ESP32-CAM (Avançado)`**.
3. Adicione o bloco **`Capturar Foto e Salvar no SD/Flash`**.
4. Adicione pausas com o bloco **`⏱️ Aguardar [N] segundos`** na categoria **`Controle & Tempo`**.

---

## ▶️ Passo 4: Executar no Satélite!
1. Clique no botão circular **Play (▶)** azul no topo da tela.
2. O SatBlocks enviará o programa direto para a ESP32-CAM via USB.
3. A aba **`📟 Console`** se abrirá automaticamente mostrando as mensagens de diagnóstico e logs do voo!
4. Na aba **`📁 Arquivos`**, você pode clicar em **"Listar Arquivos"** para baixar as fotos tiradas pela câmera diretamente para o seu computador!

---

## 🌟 Dicas de Sucesso:
* **LED Flash da Câmera**: Você pode acionar o LED potente da ESP32-CAM (Pino GPIO 4) na categoria de blocos de Atuadores.
* **Salvamento Automático**: O SatBlocks salva seus projetos automaticamente no navegador.
* **Ajuda**: Se tiver dúvidas sobre o que um bloco faz, consulte a aba **`📘 Referência`** onde cada conceito é explicado de forma simples.

Boa missão espacial! 🛰️🌍✨
