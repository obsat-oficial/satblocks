/**
 * SatBlocks Tour — Motor Interativo de Onboarding para a Missão Espacial
 */

window.SatBlocksTour = (function() {
  'use strict';

  const steps = [
    {
      title: "🛰️ Bem-vindo ao SatBlocks OBSAT!",
      badge: "Missão Espacial",
      text: "O SatBlocks é o ambiente oficial de programação em blocos para a Olimpíada Brasileira de Satélites. Aqui você desenvolve e testa o software de voo para seu protótipo de satélite.",
      target: null,
      position: "center"
    },
    {
      title: "📦 Blocos Aeroespaciais & Sensores",
      badge: "Toolbox de Voo",
      text: "Acesse sensores oficiais dos kits OBSAT: Temperatura/Umidade (SHT20), Pressão (BMP280), IMU/Giroscópio (MPU9250), CO2 (CCS811), Rádio LoRa, EasyMQTT e Pacote de Telemetria com engrenagem.",
      target: ".blocklyToolboxDiv",
      position: "right"
    },
    {
      title: "🐍 Código MicroPython de Voo",
      badge: "Gerador em Tempo Real",
      text: "A cada bloco adicionado, o código MicroPython correspondente é gerado instantaneamente no painel lateral, pronto para ser executado no satélite com um clique.",
      target: "#sidePanel",
      position: "left"
    },
    {
      title: "🔌 Conexão Direta ao Satélite",
      badge: "Cabo USB / BLE / Wi-Fi",
      text: "Conecte sua placa espacial via Cabo Serial USB (115200 baud), Bluetooth BLE sem fio ou rede local Wi-Fi WebREPL.",
      target: "#btnOpenConnectModal",
      position: "bottom"
    },
    {
      title: "📍 Pinout & Diagrama de Hardware",
      badge: "Hardware",
      text: "Consulte a foto real da placa ESP32, as faixas de operação e o mapa completo dos terminais do conector do seu microcontrolador.",
      target: "#btnOpenPinoutModal",
      position: "bottom"
    },
    {
      title: "📊 Painéis IOT & Telemetria",
      badge: "EasyMQTT & Databoard",
      text: "Crie seus próprios painéis com gráficos temporais, gauges circulares e telecomandos integrados ao EasyMQTT.",
      target: "button[data-tab='iot']",
      position: "bottom"
    }
  ];

  let currentStep = 0;
  let overlayEl = null;
  let cardEl = null;

  function init() {
    createTourElements();
  }

  function createTourElements() {
    overlayEl = document.createElement('div');
    overlayEl.className = 'sat-tour-overlay';

    cardEl = document.createElement('div');
    cardEl.className = 'sat-tour-card';
    overlayEl.appendChild(cardEl);

    document.body.appendChild(overlayEl);
  }

  function start() {
    currentStep = 0;
    overlayEl.classList.add('active');
    renderStep();
  }

  function close() {
    overlayEl.classList.remove('active');
    removeHighlight();
  }

  function removeHighlight() {
    const prevHighlight = document.querySelector('.sat-tour-target-highlight');
    if (prevHighlight) {
      prevHighlight.classList.remove('sat-tour-target-highlight');
    }
  }

  function renderStep() {
    removeHighlight();
    const step = steps[currentStep];

    cardEl.innerHTML = `
      <div class="sat-tour-badge">${step.badge}</div>
      <div class="sat-tour-title">${step.title}</div>
      <div class="sat-tour-body">${step.text}</div>
      <div class="sat-tour-footer">
        <div class="sat-tour-steps-indicator">Etapa ${currentStep + 1} de ${steps.length}</div>
        <div class="sat-tour-actions">
          <button class="sat-tour-btn" id="tourBtnSkip">Pular</button>
          ${currentStep > 0 ? '<button class="sat-tour-btn" id="tourBtnPrev">Voltar</button>' : ''}
          <button class="sat-tour-btn next" id="tourBtnNext">${currentStep === steps.length - 1 ? 'Iniciar Missão' : 'Próximo'}</button>
        </div>
      </div>
    `;

    document.getElementById('tourBtnSkip').addEventListener('click', close);
    if (currentStep > 0) {
      document.getElementById('tourBtnPrev').addEventListener('click', () => {
        currentStep--;
        renderStep();
      });
    }
    document.getElementById('tourBtnNext').addEventListener('click', () => {
      if (currentStep < steps.length - 1) {
        currentStep++;
        renderStep();
      } else {
        close();
      }
    });

    positionCard(step);
  }

  function positionCard(step) {
    if (!step.target || step.position === 'center') {
      cardEl.style.top = '50%';
      cardEl.style.left = '50%';
      cardEl.style.transform = 'translate(-50%, -50%)';
      return;
    }

    const targetEl = document.querySelector(step.target);
    if (!targetEl) {
      cardEl.style.top = '50%';
      cardEl.style.left = '50%';
      cardEl.style.transform = 'translate(-50%, -50%)';
      return;
    }

    targetEl.classList.add('sat-tour-target-highlight');
    const rect = targetEl.getBoundingClientRect();

    cardEl.style.transform = 'none';

    if (step.position === 'bottom') {
      cardEl.style.top = (rect.bottom + 14) + 'px';
      // Se o elemento estiver mais à direita da tela, alinha pela direita
      if (rect.left > window.innerWidth / 2) {
        cardEl.style.left = Math.max(16, rect.right - 380) + 'px';
      } else {
        cardEl.style.left = Math.max(16, Math.min(window.innerWidth - 400, rect.left)) + 'px';
      }
    } else if (step.position === 'right') {
      cardEl.style.top = Math.max(70, rect.top) + 'px';
      cardEl.style.left = (rect.right + 18) + 'px';
    } else if (step.position === 'left') {
      cardEl.style.top = Math.max(70, rect.top) + 'px';
      cardEl.style.left = Math.max(16, rect.left - 398) + 'px';
    }
  }

  return {
    init: init,
    start: start,
    close: close
  };
})();
