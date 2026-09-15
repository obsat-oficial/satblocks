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
      targets: null,
      position: "center"
    },
    {
      title: "📦 Blocos Aeroespaciais & Sensores",
      badge: "Toolbox de Voo",
      text: "Acesse sensores oficiais dos kits OBSAT: Temperatura/Umidade (SHT20), Pressão (BMP280), IMU/Giroscópio (MPU9250), CO2 (CCS811), Rádio LoRa, IoT & Painel e Pacote de Telemetria com engrenagem.",
      targets: [".blocklyToolbox"],
      position: "right",
      forceOpen: "toolbox"
    },
    {
      title: "🐍 Código MicroPython de Voo",
      badge: "Gerador em Tempo Real",
      text: "A cada bloco adicionado, o código MicroPython correspondente é gerado instantaneamente no painel lateral, pronto para ser executado no satélite com um clique.",
      targets: ["#sidePanel"],
      position: "left",
      forceOpen: "sidepanel"
    },
    {
      title: "🔌 Conexão Direta ao Satélite",
      badge: "Cabo USB / BLE / Wi-Fi",
      text: "Conecte sua placa espacial via Cabo Serial USB (115200 baud), Bluetooth BLE sem fio ou rede local Wi-Fi WebREPL.",
      targets: ["#connectButton"],
      position: "bottom"
    },
    {
      title: "📍 Pinout & Diagrama de Hardware",
      badge: "Hardware",
      text: "Consulte a foto real da placa ESP32, as faixas de operação e o mapa completo dos terminais do conector do seu microcontrolador.",
      targets: ["button.sat-tab-btn[data-tab='device']", ".sat-dropdown-item[data-tab='device']"],
      position: "bottom"
    },
    {
      title: "📊 Painéis IOT & Telemetria",
      badge: "IoT & Databoard",
      text: "Crie seus próprios painéis com gráficos temporais, gauges circulares e telecomandos alimentados pelos canais IoT publicados pela placa.",
      targets: ["button.sat-tab-btn[data-tab='iot']", ".sat-dropdown-item[data-tab='iot']"],
      position: "bottom"
    }
  ];

  let currentStep = 0;
  let overlayEl = null;
  let cardEl = null;
  let forcedOpen = null;
  let resizeHandler = null;

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
    resizeHandler = () => positionCard(steps[currentStep]);
    window.addEventListener('resize', resizeHandler);
    renderStep();
  }

  function close() {
    overlayEl.classList.remove('active');
    removeHighlight();
    releaseForcedOpen();
    if (resizeHandler) {
      window.removeEventListener('resize', resizeHandler);
      resizeHandler = null;
    }
  }

  function removeHighlight() {
    const prevHighlight = document.querySelector('.sat-tour-target-highlight');
    if (prevHighlight) {
      prevHighlight.classList.remove('sat-tour-target-highlight');
    }
  }

  // Considera "visível" um elemento que realmente ocupa espaço no layout atual
  // (não é display:none nem está dentro de um ancestral escondido pelo modo
  // responsivo/compacto — dropdown vs. barra de abas expandida, por exemplo).
  function isVisible(el) {
    return !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length));
  }

  // Cada etapa pode listar mais de um seletor candidato (versão desktop e
  // versão compacta/dropdown do mesmo controle); escolhe a primeira que
  // estiver de fato visível no layout atual, dependendo da resolução da tela.
  function resolveTarget(step) {
    if (!step.targets || !step.targets.length) return null;
    let firstMatch = null;
    for (const selector of step.targets) {
      const el = document.querySelector(selector);
      if (!el) continue;
      if (!firstMatch) firstMatch = el;
      if (isVisible(el)) return el;
    }
    return firstMatch;
  }

  // Algumas etapas apontam para gavetas retráteis (toolbox / painel lateral)
  // que ficam fora da tela quando recolhidas. Para essas etapas, força
  // temporariamente o estado "aberto" (mesma classe usada pelo hover) sem
  // mexer na preferência salva do usuário, e restaura ao sair da etapa.
  function releaseForcedOpen() {
    if (!forcedOpen) return;
    const area = document.getElementById(forcedOpen.areaId);
    if (area) area.classList.remove(forcedOpen.className);
    forcedOpen = null;
  }

  function applyForcedOpen(step) {
    releaseForcedOpen();
    if (step.forceOpen === 'toolbox') {
      const area = document.getElementById('blocklyArea');
      if (area && area.classList.contains('toolbox-collapsed')) {
        area.classList.add('hover-active');
        forcedOpen = { areaId: 'blocklyArea', className: 'hover-active' };
      }
    } else if (step.forceOpen === 'sidepanel') {
      const area = document.getElementById('tab_page_blocks');
      if (area && area.classList.contains('side-panel-collapsed')) {
        area.classList.add('side-panel-hover-active');
        forcedOpen = { areaId: 'tab_page_blocks', className: 'side-panel-hover-active' };
      }
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

    applyForcedOpen(step);
    // Espera o próximo frame para a gaveta forçada (toolbox/painel) terminar
    // a transição de abertura antes de medir sua posição real na tela.
    requestAnimationFrame(() => requestAnimationFrame(() => positionCard(step)));
  }

  function centerCard() {
    cardEl.style.transform = 'translate(-50%, -50%)';
    cardEl.style.top = '50%';
    cardEl.style.left = '50%';
  }

  function positionCard(step) {
    const targetEl = resolveTarget(step);

    if (!targetEl || step.position === 'center') {
      centerCard();
      return;
    }

    targetEl.classList.add('sat-tour-target-highlight');
    targetEl.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    const rect = targetEl.getBoundingClientRect();

    if (rect.width === 0 && rect.height === 0) {
      centerCard();
      return;
    }

    cardEl.style.transform = 'none';
    // Mede o card já renderizado para encaixar dentro da viewport atual,
    // em vez de assumir uma largura/altura fixas (necessário para telas
    // estreitas, onde o card ocupa quase 100% da largura disponível).
    const cardW = cardEl.offsetWidth;
    const cardH = cardEl.offsetHeight;
    const margin = 12;
    let top, left;

    if (step.position === 'bottom') {
      top = rect.bottom + 14;
      left = rect.left > window.innerWidth / 2 ? (rect.right - cardW) : rect.left;
    } else if (step.position === 'right') {
      top = rect.top;
      left = rect.right + 18;
    } else if (step.position === 'left') {
      top = rect.top;
      left = rect.left - cardW - 18;
    } else {
      centerCard();
      return;
    }

    // Se não couber no lado preferido (ex.: toolbox aberta perto da borda
    // esquerda numa tela estreita), tenta o lado oposto antes de apenas
    // grudar na borda — evita o card ficar cortado ou sobrepondo o alvo.
    if (left < margin && step.position === 'left') {
      left = rect.right + 18;
    } else if (left + cardW > window.innerWidth - margin && step.position === 'right') {
      left = rect.left - cardW - 18;
    }

    left = Math.max(margin, Math.min(window.innerWidth - cardW - margin, left));
    top = Math.max(margin, Math.min(window.innerHeight - cardH - margin, top));

    cardEl.style.left = left + 'px';
    cardEl.style.top = top + 'px';
  }

  return {
    init: init,
    start: start,
    close: close
  };
})();
