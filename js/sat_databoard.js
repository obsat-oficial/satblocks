/**
 * BIPES Databoard Oficial Integrado ao SatBlocks
 * Copyright (C) 2026 BIPES Project / OBSAT
 * Motor de dashboards dinâmicos com Chart.js, Muuri Grid, DataStorage e Telemetria em Tempo Real
 */

window.SatDataboard = (function() {
  'use strict';

  // Cores aeroespaciais padrão da OBSAT
  const PALETTE = [
    { border: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)' }, // Azul Céu
    { border: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },  // Âmbar
    { border: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' }, // Esmeralda
    { border: '#e11d48', bg: 'rgba(225, 29, 72, 0.15)' },  // Rosa OBSAT
    { border: '#a855f7', bg: 'rgba(168, 85, 247, 0.15)' }, // Violeta
    { border: '#06b6d4', bg: 'rgba(6, 182, 212, 0.15)' }   // Ciano
  ];

  function UID() {
    return (+new Date()).toString(36) + Math.random().toString(36).substring(2, 7);
  }

  /* =========================================================================
   * 1. CLASSE DATASTORAGE (Persistência e Ingestão de Séries Temporais)
   * ========================================================================= */
  class DataStorageEngine {
    constructor() {
      this._data = {};
      this._keys = [];
      this._subscribers = [];
    }

    init() {
      this.restore();
    }

    restore() {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('datastorage:'));
      keys.forEach(k => {
        const datasetName = k.replace('datastorage:', '');
        if (!this._keys.includes(datasetName)) {
          this._keys.push(datasetName);
        }
        try {
          this._data[datasetName] = JSON.parse(localStorage.getItem(k)) || [];
        } catch (e) {
          this._data[datasetName] = [];
        }
      });
    }

    push(dataset, coordinates) {
      if (!Array.isArray(coordinates)) return;

      if (!this._keys.includes(dataset)) {
        this._keys.push(dataset);
        this._data[dataset] = [];
      }

      this._data[dataset].push(coordinates);

      // Limita persistência no localStorage para performance (últimos 300 pontos)
      if (this._data[dataset].length > 300) {
        this._data[dataset] = this._data[dataset].slice(-300);
      }

      try {
        localStorage.setItem(`datastorage:${dataset}`, JSON.stringify(this._data[dataset]));
      } catch (e) {}

      // Notifica gráficos inscritos
      this.notifySubscribers(dataset, coordinates);
    }

    subscribe(chartInstance) {
      this._subscribers.push(chartInstance);
    }

    unsubscribe(chartInstance) {
      this._subscribers = this._subscribers.filter(s => s !== chartInstance && s.uid !== chartInstance.uid);
    }

    notifySubscribers(dataset, coordinates) {
      this._subscribers.forEach(chart => {
        if (chart.dataset === dataset && chart.chartJs) {
          const c = chart.chartJs;
          const label = coordinates[0];

          c.data.labels.push(label);
          for (let i = 1; i < coordinates.length; i++) {
            if (c.data.datasets[i - 1]) {
              c.data.datasets[i - 1].data.push(coordinates[i]);
            }
          }

          const limit = chart.limitPoints || 50;
          if (c.data.labels.length > limit) {
            c.data.labels.shift();
            c.data.datasets.forEach(ds => ds.data.shift());
          }

          c.update('none'); // Update sem recalcular animação para alta taxa de frames
        }
      });
    }

    getChartData(dataset, setup) {
      if (!this._data[dataset]) {
        this._data[dataset] = [];
      }

      let rows = this._data[dataset].slice();
      const limit = parseInt(setup.limitPoints, 10) || 50;
      if (rows.length > limit) {
        rows = rows.slice(-limit);
      }

      const labels = [];
      const numSeries = rows.length > 0 ? rows[0].length - 1 : 1;
      const seriesData = Array.from({ length: Math.max(1, numSeries) }, () => []);

      rows.forEach(row => {
        labels.push(row[0]);
        for (let i = 1; i < row.length; i++) {
          seriesData[i - 1].push(row[i]);
        }
      });

      const labelNames = (setup.labels || 'Valor').split(',').map(s => s.trim());
      const datasets = seriesData.map((data, idx) => {
        const color = PALETTE[idx % PALETTE.length];
        return {
          label: labelNames[idx] || `Série ${idx + 1}`,
          data: data,
          borderColor: color.border,
          backgroundColor: color.bg,
          borderWidth: 2,
          fill: setup.chartType === 'line',
          tension: 0.3,
          pointRadius: setup.chartType === 'line' ? 2 : 4
        };
      });

      return { labels, datasets };
    }

    getAllDatasets() {
      return this._keys;
    }

    clearDataset(dataset) {
      delete this._data[dataset];
      this._keys = this._keys.filter(k => k !== dataset);
      localStorage.removeItem(`datastorage:${dataset}`);
    }

    clearAll() {
      this._keys.forEach(k => localStorage.removeItem(`datastorage:${k}`));
      this._data = {};
      this._keys = [];
      this._subscribers.forEach(chart => {
        if (chart.chartJs) {
          chart.chartJs.data.labels = [];
          chart.chartJs.data.datasets.forEach(ds => ds.data = []);
          chart.chartJs.update();
        }
      });
    }

    exportCsv(dataset) {
      const rows = this._data[dataset] || [];
      if (rows.length === 0) return 'Timestamp,Valor\n';
      return rows.map(r => r.join(',')).join('\n');
    }

    exportAllConsolidatedCsv() {
      let csv = 'Timestamp,Dataset,Valor_1,Valor_2,Valor_3\n';
      this._keys.forEach(k => {
        const rows = this._data[k] || [];
        rows.forEach(r => {
          csv += `${r[0]},${k},${r.slice(1).join(',')}\n`;
        });
      });
      return csv;
    }
  }

  const DataStorage = new DataStorageEngine();

  /* =========================================================================
   * 2. CLASSE GRID & MUURI (Gerenciador do Layout Arrastável)
   * ========================================================================= */
  class DataboardGrid {
    constructor(containerEl) {
      this.containerEl = containerEl;
      this.muuri = null;
      this.widgets = [];
      this.isEditMode = false;
      this.currentWkspUid = null;
    }

    init(wkspUid) {
      this.currentWkspUid = wkspUid;
      if (this.muuri) {
        this.muuri.destroy(true);
        this.muuri = null;
      }

      this.containerEl.innerHTML = '';
      this.widgets = [];

      // Carrega elementos no DOM primeiro
      this.restore(wkspUid);

      // Inicializa Muuri Grid com drag habilitado
      if (typeof Muuri !== 'undefined') {
        this.muuri = new Muuri(this.containerEl, {
          dragEnabled: true,
          dragHandle: '.widget-btn-drag',
          dragStartPredicate: {
            distance: 0,
            delay: 0
          },
          dragPlaceholder: {
            enabled: true,
            createElement: function(item) {
              const node = document.createElement('div');
              node.className = 'bipes-muuri-item muuri-placeholder';
              return node;
            }
          }
        });

        this.muuri.on('dragEnd', () => {
          this.saveCurrentLayout();
        });

        this.muuri.refreshItems();
        this.muuri.layout();
      }
    }

    toggleEditMode(forceState) {
      this.isEditMode = forceState !== undefined ? forceState : !this.isEditMode;
      const btn = document.getElementById('btnToggleEditGrid');
      const text = document.getElementById('editGridText');
      const icon = document.getElementById('editGridIcon');

      if (this.isEditMode) {
        this.containerEl.classList.add('edit-mode-active');
        if (btn) btn.classList.add('primary');
        if (text) text.innerText = 'Concluir Edição';
        if (icon) icon.innerText = '✓';
      } else {
        this.containerEl.classList.remove('edit-mode-active');
        if (btn) btn.classList.remove('primary');
        if (text) text.innerText = 'Organizar Grid';
        if (icon) icon.innerText = '✏️';
      }

      if (this.muuri) {
        this.muuri.refreshItems();
        this.muuri.layout();
      }
    }

    restore(wkspUid) {
      const savedList = localStorage.getItem(`workspace:${wkspUid}`);
      let streamUids = [];
      try {
        streamUids = JSON.parse(savedList) || [];
      } catch (e) {
        streamUids = [];
      }

      const emptyEl = document.getElementById('databoardEmptyState');
      if (streamUids.length === 0) {
        if (emptyEl) emptyEl.style.display = 'flex';
        return;
      }
      if (emptyEl) emptyEl.style.display = 'none';

      streamUids.forEach(uid => {
        const streamData = localStorage.getItem(`stream:${uid}`);
        if (streamData) {
          try {
            const parsed = JSON.parse(streamData);
            this.renderWidget(uid, parsed);
          } catch (e) {}
        }
      });
    }

    addWidget(type, setup) {
      const uid = UID();
      const defaultSetup = setup || this.getDefaultSetup(type);

      localStorage.setItem(`stream:${uid}`, JSON.stringify({ type, setup: defaultSetup }));

      const savedList = localStorage.getItem(`workspace:${this.currentWkspUid}`);
      let streamUids = [];
      try { streamUids = JSON.parse(savedList) || []; } catch (e) {}
      streamUids.push(uid);
      localStorage.setItem(`workspace:${this.currentWkspUid}`, JSON.stringify(streamUids));

      const emptyEl = document.getElementById('databoardEmptyState');
      if (emptyEl) emptyEl.style.display = 'none';

      this.renderWidget(uid, { type, setup: defaultSetup });

      if (this.muuri) {
        this.muuri.refreshItems();
        this.muuri.layout();
      }
    }

    updateWidget(uid, type, setup) {
      localStorage.setItem(`stream:${uid}`, JSON.stringify({ type, setup }));

      const itemEl = document.getElementById(`widget_${uid}`);
      if (itemEl) {
        let icon = '📊';
        if (type === 'switch') icon = '🔘';
        if (type === 'stream') icon = '🎥';

        const badge = itemEl.querySelector('.widget-title-badge');
        if (badge) {
          badge.innerHTML = `<span>${icon}</span><span>${setup.title || 'Widget'}</span>`;
        }
      }

      // Se for gráfico, destrói e recria o Chart.js com os novos parâmetros
      if (type === 'chart') {
        const existingWidget = this.widgets.find(w => w.uid === uid);
        if (existingWidget) {
          if (existingWidget.chartJs) existingWidget.chartJs.destroy();
          DataStorage.unsubscribe(existingWidget);
          this.widgets = this.widgets.filter(w => w.uid !== uid);
        }

        const canvas = document.getElementById(`canvas_${uid}`);
        if (canvas) {
          const newChart = this.initChartJs(uid, canvas, setup);
          this.widgets.push(newChart);
        }
      }

      if (this.muuri) {
        this.muuri.refreshItems();
        this.muuri.layout();
      }
    }

    renderWidget(uid, data) {
      const itemEl = document.createElement('div');
      itemEl.className = 'bipes-muuri-item';
      itemEl.id = `widget_${uid}`;

      const card = document.createElement('div');
      card.className = 'bipes-widget-card';

      // Header do Card com botão de editar ⚙️, arrastar ⠿ e fechar ✕
      const header = document.createElement('div');
      header.className = 'widget-card-header';

      let title = data.setup.title || 'Widget';
      let icon = '📊';
      if (data.type === 'switch') icon = '🔘';
      if (data.type === 'stream') icon = '🎥';

      header.innerHTML = `
        <div class="widget-title-badge">
          <span>${icon}</span>
          <span>${title}</span>
        </div>
        <div class="widget-controls-box">
          <button class="widget-btn-edit btn-edit-widget" title="Configurar / Editar Widget">⚙️</button>
          <button class="widget-btn-drag btn-drag-widget" title="Arrastar para reorganizar">⠿</button>
          <button class="widget-btn-dismiss btn-del-widget" title="Remover Widget">✕</button>
        </div>
      `;

      // Conteúdo do Card
      const body = document.createElement('div');
      body.className = 'widget-canvas-box';

      if (data.type === 'chart') {
        const canvas = document.createElement('canvas');
        canvas.id = `canvas_${uid}`;
        body.appendChild(canvas);

        const chartObj = this.initChartJs(uid, canvas, data.setup);
        this.widgets.push(chartObj);
      } else if (data.type === 'switch') {
        const switchBox = document.createElement('div');
        switchBox.className = 'bipes-switch-box';
        switchBox.innerHTML = `
          <div style="font-size: 13px; font-weight: 700; color: #475569;">${data.setup.title || 'Comando Satélite'}</div>
          <div class="bipes-switch-toggle" id="switch_${uid}"></div>
          <div style="font-size: 11px; color: #94a3b8;">${data.setup.onUrl || 'Sem URL vinculada'}</div>
        `;
        body.appendChild(switchBox);

        const toggle = switchBox.querySelector('.bipes-switch-toggle');
        let state = false;
        toggle.onclick = () => {
          state = !state;
          toggle.classList.toggle('on', state);
          const targetUrl = state ? data.setup.onUrl : data.setup.offUrl;
          if (targetUrl) {
            fetch(targetUrl, { mode: 'no-cors' }).catch(() => {});
          }
        };
      } else if (data.type === 'stream') {
        const img = document.createElement('img');
        img.src = data.setup.manifest || 'media/camera_placeholder.jpg';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        img.style.borderRadius = '8px';
        body.appendChild(img);
      }

      card.appendChild(header);
      card.appendChild(body);
      itemEl.appendChild(card);

      // Evento de Edição
      const editBtn = header.querySelector('.btn-edit-widget');
      if (editBtn) {
        editBtn.onclick = (e) => {
          e.stopPropagation();
          Workspaces.openWidgetEditor(uid);
        };
      }

      // Evento de Remoção
      const delBtn = header.querySelector('.btn-del-widget');
      if (delBtn) {
        delBtn.onclick = (e) => {
          e.stopPropagation();
          this.removeWidget(uid, itemEl);
        };
      }

      this.containerEl.appendChild(itemEl);

      if (this.muuri) {
        this.muuri.add(itemEl);
      }
    }

    initChartJs(uid, canvasEl, setup) {
      const chartData = DataStorage.getChartData(setup.dataset, setup);
      const isRadar = setup.chartType === 'radar';

      let chartJsInstance = null;
      if (typeof Chart !== 'undefined') {
        chartJsInstance = new Chart(canvasEl, {
          type: setup.chartType || 'line',
          data: chartData,
          options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 0 },
            plugins: {
              legend: {
                display: !isRadar,
                position: 'top',
                labels: { boxWidth: 10, font: { size: 11 } }
              }
            },
            scales: isRadar ? {} : {
              x: {
                grid: { color: 'rgba(0,0,0,0.04)' },
                ticks: { maxTicksLimit: 8, font: { size: 10 } }
              },
              y: {
                grid: { color: 'rgba(0,0,0,0.06)' },
                ticks: { font: { size: 10 } },
                beginAtZero: false
              }
            }
          }
        });
      }

      const widgetMeta = {
        uid: uid,
        dataset: setup.dataset,
        limitPoints: parseInt(setup.limitPoints, 10) || 50,
        chartJs: chartJsInstance,
        canvas: canvasEl
      };

      DataStorage.subscribe(widgetMeta);
      return widgetMeta;
    }

    removeWidget(uid, itemEl) {
      const widgetCard = itemEl || document.getElementById(`widget_${uid}`);

      // 1. Destrói instância do Chart.js e cancela subscription
      this.widgets = this.widgets.filter(w => {
        if (w.uid === uid) {
          if (w.chartJs) {
            try { w.chartJs.destroy(); } catch (e) {}
          }
          DataStorage.unsubscribe(w);
          return false;
        }
        return true;
      });

      // 2. Remove do Muuri se estiver presente
      if (this.muuri && widgetCard) {
        try {
          const muuriItem = this.muuri.getItem(widgetCard);
          if (muuriItem) {
            this.muuri.remove([muuriItem], { removeElements: false });
          }
        } catch (e) {
          console.warn('Erro ao desvincular do Muuri:', e);
        }
      }

      // 3. Garante remoção física e instantânea do elemento HTML do DOM
      if (widgetCard && widgetCard.parentNode) {
        widgetCard.parentNode.removeChild(widgetCard);
      }

      // 4. Atualiza e reposiciona os itens restantes no Muuri
      if (this.muuri) {
        this.muuri.refreshItems();
        this.muuri.layout();
      }

      // 5. Remove chaves do localStorage
      localStorage.removeItem(`stream:${uid}`);
      const savedList = localStorage.getItem(`workspace:${this.currentWkspUid}`);
      let streamUids = [];
      try { streamUids = JSON.parse(savedList) || []; } catch (e) {}
      streamUids = streamUids.filter(u => u !== uid);
      localStorage.setItem(`workspace:${this.currentWkspUid}`, JSON.stringify(streamUids));

      // 6. Atualiza estado vazio se todos os widgets forem removidos
      const emptyEl = document.getElementById('databoardEmptyState');
      if (streamUids.length === 0 && emptyEl) {
        emptyEl.style.display = 'flex';
      }

      if (window.DataboardWorkspaces && typeof window.DataboardWorkspaces.showToast === 'function') {
        window.DataboardWorkspaces.showToast('🗑️ Bloco excluído do painel com sucesso!');
      }
    }

    saveCurrentLayout() {
      if (!this.muuri) return;
      const items = this.muuri.getItems();
      const streamUids = items.map(i => i.getElement().id.replace('widget_', ''));
      localStorage.setItem(`workspace:${this.currentWkspUid}`, JSON.stringify(streamUids));
    }

    getDefaultSetup(type) {
      if (type === 'chart') {
        return {
          dataset: 'obsat_altitude',
          chartType: 'line',
          title: 'Altitude Barométrica (m)',
          labels: 'Altitude (m)',
          limitPoints: 50
        };
      } else if (type === 'switch') {
        return {
          title: 'Comando Satélite',
          onUrl: 'http://192.168.4.1/cmd/on',
          offUrl: 'http://192.168.4.1/cmd/off'
        };
      } else {
        return {
          manifest: 'http://192.168.4.1:81/stream'
        };
      }
    }
  }

  let GridInstance = null;

  /* =========================================================================
   * 3. CLASSE WORKSPACES (Gerenciamento de Abas e Telas de Telemetria)
   * ========================================================================= */
  class DataboardWorkspaces {
    constructor() {
      this.workspaces = {};
      this.currentUid = 'default';
    }

    init() {
      DataStorage.init();
      this.restoreWorkspaces();
      this.setupDOM();
      this.setupStorageManagerModal();
    }

    restoreWorkspaces() {
      const saved = localStorage.getItem('bipes_workspaces');
      if (saved) {
        try {
          this.workspaces = JSON.parse(saved) || {};
        } catch (e) {
          this.workspaces = {};
        }
      }

      if (Object.keys(this.workspaces).length === 0) {
        this.workspaces['obsat_mission'] = 'Missão OBSAT 2026 (Padrão)';
        localStorage.setItem('bipes_workspaces', JSON.stringify(this.workspaces));
        this.createObsatPresetWidgets('obsat_mission');
      }

      this.currentUid = localStorage.getItem('currentWorkspace') || Object.keys(this.workspaces)[0];
      if (!this.workspaces[this.currentUid]) {
        this.currentUid = Object.keys(this.workspaces)[0];
      }
      localStorage.setItem('currentWorkspace', this.currentUid);

      const gridContainer = document.getElementById('bipesGridContainer');
      if (gridContainer) {
        GridInstance = new DataboardGrid(gridContainer);
        GridInstance.init(this.currentUid);
      }

      this.updateWorkspaceSelect();
    }

    createObsatPresetWidgets(wkspUid) {
      const defaultWidgets = [
        {
          uid: 'w_alt',
          type: 'chart',
          setup: {
            dataset: 'obsat_altitude',
            chartType: 'line',
            title: '⛰️ Altitude de Voo & Apogeu (m)',
            labels: 'Altitude (m)',
            limitPoints: 50
          }
        },
        {
          uid: 'w_temp',
          type: 'chart',
          setup: {
            dataset: 'obsat_temperatura',
            chartType: 'line',
            title: '🌡️ Perfil Térmico (°C)',
            labels: 'SHT20 (°C), BMP280 (°C)',
            limitPoints: 50
          }
        },
        {
          uid: 'w_press',
          type: 'chart',
          setup: {
            dataset: 'obsat_pressao',
            chartType: 'line',
            title: '🌪️ Pressão Atmosférica (hPa)',
            labels: 'BMP280 (hPa)',
            limitPoints: 50
          }
        },
        {
          uid: 'w_bat',
          type: 'chart',
          setup: {
            dataset: 'obsat_bateria',
            chartType: 'bar',
            title: '🔋 Carga da Bateria (%)',
            labels: 'Nível (%)',
            limitPoints: 20
          }
        }
      ];

      const uids = [];
      defaultWidgets.forEach(w => {
        uids.push(w.uid);
        localStorage.setItem(`stream:${w.uid}`, JSON.stringify({ type: w.type, setup: w.setup }));
      });

      localStorage.setItem(`workspace:${wkspUid}`, JSON.stringify(uids));
    }

    updateWorkspaceSelect() {
      const select = document.getElementById('bipesWorkspaceSelect');
      if (!select) return;

      select.innerHTML = '';
      Object.keys(this.workspaces).forEach(uid => {
        const opt = document.createElement('option');
        opt.value = uid;
        opt.innerText = this.workspaces[uid];
        if (uid === this.currentUid) opt.selected = true;
        select.appendChild(opt);
      });

      select.onchange = (e) => {
        this.switchWorkspace(e.target.value);
      };
    }

    switchWorkspace(uid) {
      if (!this.workspaces[uid]) return;
      this.currentUid = uid;
      localStorage.setItem('currentWorkspace', uid);
      if (GridInstance) {
        GridInstance.init(uid);
      }
    }

    addNewWorkspace() {
      const name = prompt('Nome do novo Workspace de Telemetria:', 'Nova Missão CanSat');
      if (!name || !name.trim()) return;

      const uid = 'wksp_' + UID();
      this.workspaces[uid] = name.trim();
      localStorage.setItem('bipes_workspaces', JSON.stringify(this.workspaces));
      localStorage.setItem(`workspace:${uid}`, JSON.stringify([]));

      this.updateWorkspaceSelect();
      this.switchWorkspace(uid);
    }

    openWidgetEditor(uid) {
      this.editingWidgetUid = uid || null;
      const modal = document.getElementById('modalWidgetEditorOverlay');
      const titleEl = document.getElementById('widgetModalTitle');
      const typeSel = document.getElementById('widgetTypeSelect');

      if (!modal) return;

      if (uid) {
        const streamData = localStorage.getItem(`stream:${uid}`);
        if (streamData) {
          try {
            const parsed = JSON.parse(streamData);
            if (titleEl) titleEl.innerText = `⚙️ Configurar: ${parsed.setup.title || 'Widget'}`;
            if (typeSel) {
              typeSel.value = parsed.type || 'chart';
              typeSel.dispatchEvent(new Event('change'));
            }

            if (parsed.type === 'chart') {
              if (document.getElementById('widgetDatasetSelect')) document.getElementById('widgetDatasetSelect').value = parsed.setup.dataset || 'obsat_altitude';
              if (document.getElementById('widgetChartType')) document.getElementById('widgetChartType').value = parsed.setup.chartType || 'line';
              if (document.getElementById('widgetLimitPoints')) document.getElementById('widgetLimitPoints').value = parsed.setup.limitPoints || '50';
              if (document.getElementById('widgetTitleInput')) document.getElementById('widgetTitleInput').value = parsed.setup.title || 'Gráfico';
              if (document.getElementById('widgetLabelsInput')) document.getElementById('widgetLabelsInput').value = parsed.setup.labels || 'Valor';
            } else if (parsed.type === 'switch') {
              if (document.getElementById('widgetSwitchTitle')) document.getElementById('widgetSwitchTitle').value = parsed.setup.title || 'Interruptor';
              if (document.getElementById('widgetSwitchOnUrl')) document.getElementById('widgetSwitchOnUrl').value = parsed.setup.onUrl || '';
              if (document.getElementById('widgetSwitchOffUrl')) document.getElementById('widgetSwitchOffUrl').value = parsed.setup.offUrl || '';
            } else if (parsed.type === 'stream') {
              if (document.getElementById('widgetStreamUrl')) document.getElementById('widgetStreamUrl').value = parsed.setup.manifest || '';
            }
          } catch (e) {}
        }
      } else {
        if (titleEl) titleEl.innerText = '➕ Novo Widget do Databoard';
        if (typeSel) {
          typeSel.value = 'chart';
          typeSel.dispatchEvent(new Event('change'));
        }
        if (document.getElementById('widgetTitleInput')) document.getElementById('widgetTitleInput').value = 'Novo Gráfico';
        if (document.getElementById('widgetLabelsInput')) document.getElementById('widgetLabelsInput').value = 'Valor';
        if (document.getElementById('widgetLimitPoints')) document.getElementById('widgetLimitPoints').value = '50';
      }

      modal.style.display = 'flex';
    }

    setupDOM() {
      this.editingWidgetUid = null;

      // Botão Novo Workspace
      const btnNewWksp = document.getElementById('btnNewWorkspace');
      if (btnNewWksp) {
        btnNewWksp.onclick = () => this.addNewWorkspace();
      }

      // Botão Modo Edição
      const btnEdit = document.getElementById('btnToggleEditGrid');
      if (btnEdit) {
        btnEdit.onclick = () => {
          if (GridInstance) GridInstance.toggleEditMode();
        };
      }

      // Botão Adicionar Widget
      const btnAdd = document.getElementById('btnAddWidgetBipes');
      const btnEmptyAdd = document.getElementById('btnEmptyAddWidget');
      if (btnAdd) btnAdd.onclick = () => this.openWidgetEditor(null);
      if (btnEmptyAdd) btnEmptyAdd.onclick = () => this.openWidgetEditor(null);

      // Botão Carregar Presets OBSAT
      const btnPreset = document.getElementById('btnEmptyLoadObsatPreset');
      if (btnPreset) {
        btnPreset.onclick = () => {
          this.createObsatPresetWidgets(this.currentUid);
          if (GridInstance) GridInstance.init(this.currentUid);
        };
      }

      // Salvar Widget no Modal (Criação ou Edição)
      const btnSaveWidget = document.getElementById('btnConfirmSaveWidget');
      if (btnSaveWidget) {
        btnSaveWidget.onclick = () => {
          const type = document.getElementById('widgetTypeSelect').value;
          let setup = {};

          if (type === 'chart') {
            setup = {
              dataset: document.getElementById('widgetDatasetSelect').value,
              chartType: document.getElementById('widgetChartType').value,
              title: document.getElementById('widgetTitleInput').value.trim() || 'Gráfico',
              labels: document.getElementById('widgetLabelsInput').value.trim() || 'Valor',
              limitPoints: document.getElementById('widgetLimitPoints').value || '50'
            };
          } else if (type === 'switch') {
            setup = {
              title: document.getElementById('widgetSwitchTitle').value.trim() || 'Interruptor',
              onUrl: document.getElementById('widgetSwitchOnUrl').value.trim(),
              offUrl: document.getElementById('widgetSwitchOffUrl').value.trim()
            };
          } else {
            setup = {
              manifest: document.getElementById('widgetStreamUrl').value.trim()
            };
          }

          if (GridInstance) {
            if (this.editingWidgetUid) {
              GridInstance.updateWidget(this.editingWidgetUid, type, setup);
              if (window.SatFiles && window.SatFiles.showDriverToast) {
                window.SatFiles.showDriverToast(`⚙️ Widget "${setup.title}" atualizado com sucesso!`);
              }
            } else {
              GridInstance.addWidget(type, setup);
              if (window.SatFiles && window.SatFiles.showDriverToast) {
                window.SatFiles.showDriverToast(`➕ Widget "${setup.title}" adicionado ao painel!`);
              }
            }
          }

          this.editingWidgetUid = null;
          document.getElementById('modalWidgetEditorOverlay').style.display = 'none';
        };
      }

      // Alternância de campos no Modal
      const widgetTypeSel = document.getElementById('widgetTypeSelect');
      if (widgetTypeSel) {
        widgetTypeSel.onchange = (e) => {
          const v = e.target.value;
          document.getElementById('widgetChartFields').style.display = (v === 'chart') ? 'flex' : 'none';
          document.getElementById('widgetSwitchFields').style.display = (v === 'switch') ? 'flex' : 'none';
          document.getElementById('widgetStreamFields').style.display = (v === 'stream') ? 'flex' : 'none';
        };
      }

      // Botão Limpar Tudo
      const btnClear = document.getElementById('btnClearDataboardData');
      if (btnClear) {
        btnClear.onclick = () => {
          if (confirm('Deseja limpar todos os dados históricos de telemetria gravados?')) {
            DataStorage.clearAll();
            if (window.SatFiles && window.SatFiles.showDriverToast) {
              window.SatFiles.showDriverToast('🧹 Histórico de telemetria limpo com sucesso.');
            }
          }
        };
      }
    }

    setupStorageManagerModal() {
      const btnOpen = document.getElementById('btnOpenStorageManager');
      const modal = document.getElementById('modalStorageManagerOverlay');
      if (btnOpen && modal) {
        btnOpen.onclick = () => {
          this.renderStorageList();
          modal.style.display = 'flex';
        };
      }

      const btnExportAll = document.getElementById('btnExportAllCsv');
      if (btnExportAll) {
        btnExportAll.onclick = () => {
          const csv = DataStorage.exportAllConsolidatedCsv();
          this.downloadBlob(csv, `obsat_telemetria_voo_${+new Date()}.csv`, 'text/csv');
        };
      }

      const inputUpload = document.getElementById('inputUploadCsvStorage');
      if (inputUpload) {
        inputUpload.onchange = (e) => {
          const file = e.target.files[0];
          if (!file) return;

          const reader = new FileReader();
          reader.onload = (evt) => {
            const text = evt.target.result;
            this.importCsvData(text);
            this.renderStorageList();
            if (window.SatFiles && window.SatFiles.showDriverToast) {
              window.SatFiles.showDriverToast('⬆️ Dados importados para o DataStorage com sucesso!');
            }
          };
          reader.readAsText(file);
        };
      }
    }

    renderStorageList() {
      const listEl = document.getElementById('storageDatasetsList');
      if (!listEl) return;

      listEl.innerHTML = '';
      const datasets = DataStorage.getAllDatasets();

      if (datasets.length === 0) {
        listEl.innerHTML = '<div style="padding: 20px; text-align: center; color: #94a3b8; font-size: 13px;">Nenhum dataset armazenado no momento. Conecte o satélite para gravar telemetria real.</div>';
        return;
      }

      datasets.forEach(ds => {
        const points = (DataStorage._data[ds] || []).length;
        const row = document.createElement('div');
        row.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: #ffffff; border: 1px solid var(--border-color); border-radius: 8px;';
        row.innerHTML = `
          <div>
            <span style="font-weight: 800; font-size: 13px; color: #0f172a;">${ds}</span>
            <span style="font-size: 11px; color: #64748b; margin-left: 8px;">(${points} pontos gravados)</span>
          </div>
          <div style="display: flex; gap: 6px;">
            <button class="sat-btn btn-dl-ds" style="padding: 4px 8px; font-size: 11px;" title="Baixar CSV deste dataset">📥 CSV</button>
            <button class="sat-btn danger btn-del-ds" style="padding: 4px 8px; font-size: 11px;" title="Excluir dataset">🗑️</button>
          </div>
        `;

        const btnDl = row.querySelector('.btn-dl-ds');
        btnDl.onclick = () => {
          const csv = DataStorage.exportCsv(ds);
          this.downloadBlob(csv, `${ds}_${+new Date()}.csv`, 'text/csv');
        };

        const btnDel = row.querySelector('.btn-del-ds');
        btnDel.onclick = () => {
          DataStorage.clearDataset(ds);
          this.renderStorageList();
        };

        listEl.appendChild(row);
      });
    }

    importCsvData(text) {
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length <= 1) return;

      lines.slice(1).forEach(line => {
        const parts = line.split(',');
        if (parts.length >= 3) {
          const time = parts[0];
          const dataset = parts[1];
          const vals = parts.slice(2).map(v => parseFloat(v));
          DataStorage.push(dataset, [time, ...vals]);
        }
      });
    }

    downloadBlob(content, filename, type) {
      const blob = new Blob([content], { type: type || 'text/plain;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }

  const Workspaces = new DataboardWorkspaces();

  /* =========================================================================
   * 4. INGESTÃO DE PACOTES JSON OFICIAIS DA OBSAT (TELEMETRY BRIDGE)
   * ========================================================================= */
  let packetCounter = 0;
  let statusResetTimer = null;

  let telemetryBuffer = '';
  let droppingOversizedLine = false;
  function processIncomingTelemetry(rawText) {
    if (typeof rawText !== 'string') return;
    // USB chunks do not coincide with print()/JSON packet boundaries.
    for (const part of rawText.split(/(?<=\n)/)) {
      if (!droppingOversizedLine) telemetryBuffer += part;
      if (telemetryBuffer.length > 262144) {
        telemetryBuffer = '';
        droppingOversizedLine = true;
      }
      if (part.endsWith('\n')) {
        if (!droppingOversizedLine) processTelemetryLine(telemetryBuffer.trim());
        telemetryBuffer = '';
        droppingOversizedLine = false;
      }
    }
  }

  function parseTelemetryJsonOrDict(str) {
    if (!str || typeof str !== 'string') return null;
    try {
      return JSON.parse(str);
    } catch (e) {}

    try {
      // Normaliza dicionários MicroPython com aspas simples e booleanos/nulos Python
      const normalized = str
        .replace(/None/g, 'null')
        .replace(/True/g, 'true')
        .replace(/False/g, 'false')
        .replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, '"$1"');
      return JSON.parse(normalized);
    } catch (e) {}

    return null;
  }

  function processTelemetryLine(rawText) {
    if (!rawText || typeof rawText !== 'string') return;

    try {
      const start = rawText.indexOf('{');
      const end = rawText.lastIndexOf('}');
      if (start === -1 || end === -1 || end <= start) return;

      const candidateStr = rawText.substring(start, end + 1);
      const data = parseTelemetryJsonOrDict(candidateStr);
      if (!data || Array.isArray(data) || typeof data !== 'object') return;

      // Valida se o objeto contém dados de telemetria conhecidos da OBSAT
      const hasObsatFields = data.equipe !== undefined || data.temperatura !== undefined ||
                             data.pressao !== undefined || data.altitude !== undefined ||
                             data.bateria !== undefined || data.payload !== undefined;
      if (!hasObsatFields) return;

      packetCounter++;
      const d = new Date();
      const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;

      // Atualiza pílula de status na interface
      const pill = document.getElementById('databoardTelemetryStatus');
      const text = document.getElementById('telemetryStatusText');
      if (pill && text) {
        pill.classList.add('receiving');
        const eqInfo = data.equipe !== undefined ? ` (Eq. ${data.equipe})` : '';
        text.innerText = `● Recebendo Telemetria #${packetCounter}${eqInfo}`;

        if (statusResetTimer) clearTimeout(statusResetTimer);
        statusResetTimer = setTimeout(() => {
          pill.classList.remove('receiving');
          text.innerText = 'Aguardando Satélite';
        }, 4000);
      }

      // Ingestão no motor de séries temporais DataStorage (alimenta os gráficos em tempo real)
      if (data.temperatura !== undefined && !isNaN(parseFloat(data.temperatura))) {
        DataStorage.push('obsat_temperatura', [timeStr, parseFloat(parseFloat(data.temperatura).toFixed(2))]);
      }

      if (data.pressao !== undefined && !isNaN(parseFloat(data.pressao))) {
        DataStorage.push('obsat_pressao', [timeStr, parseFloat(parseFloat(data.pressao).toFixed(2))]);
      }

      if (data.altitude !== undefined && !isNaN(parseFloat(data.altitude))) {
        DataStorage.push('obsat_altitude', [timeStr, parseFloat(parseFloat(data.altitude).toFixed(1))]);
      } else if (data.pressao !== undefined && !isNaN(parseFloat(data.pressao))) {
        // Estimativa barométrica alternativa caso o campo direto não venha
        const p = parseFloat(data.pressao);
        if (p > 100 && p < 1200) {
          const alt = 44330 * (1 - Math.pow(p / 1013.25, 0.1903));
          DataStorage.push('obsat_altitude', [timeStr, parseFloat(alt.toFixed(1))]);
        }
      }

      if (data.bateria !== undefined && !isNaN(parseFloat(data.bateria))) {
        DataStorage.push('obsat_bateria', [timeStr, parseFloat(parseFloat(data.bateria).toFixed(1))]);
      }

      if (Array.isArray(data.giroscopio) && data.giroscopio.length >= 3) {
        DataStorage.push('obsat_giroscopio', [timeStr, data.giroscopio[0], data.giroscopio[1], data.giroscopio[2]]);
      } else if (typeof data.giroscopio === 'number') {
        DataStorage.push('obsat_giroscopio', [timeStr, 0, 0, data.giroscopio]);
      } else if (data.giroscopio && typeof data.giroscopio === 'object') {
        DataStorage.push('obsat_giroscopio', [timeStr, data.giroscopio.x || 0, data.giroscopio.y || 0, data.giroscopio.z || 0]);
      }

      if (Array.isArray(data.acelerometro) && data.acelerometro.length >= 3) {
        DataStorage.push('obsat_acelerometro', [timeStr, data.acelerometro[0], data.acelerometro[1], data.acelerometro[2]]);
      } else if (typeof data.acelerometro === 'number') {
        DataStorage.push('obsat_acelerometro', [timeStr, 0, 0, data.acelerometro]);
      } else if (data.acelerometro && typeof data.acelerometro === 'object') {
        DataStorage.push('obsat_acelerometro', [timeStr, data.acelerometro.x || 0, data.acelerometro.y || 0, data.acelerometro.z || 0]);
      }

      // Ponte Serial USB -> Servidor de Telemetria OBSAT (Local / Remoto)
      // Permite que placas em bancada (via Serial) alimentem o backend de telemetria em tempo real
      const cleanJsonStr = JSON.stringify(data);
      fetch('telemetria/salvar_telemetria.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: cleanJsonStr
      }).then(async response => {
        const result = await response.json();
        if (!response.ok || result.status !== 'sucesso') {
          throw new Error(result.erro || `HTTP ${response.status}`);
        }
      }).catch(error => {
        // Erros de rede ou servidor não interrompem a exibição local no Databoard
        console.debug('[TELEMETRIA] Ponte servidor:', error.message);
      });

    } catch (e) {
      console.warn('[TELEMETRIA] Erro ao processar pacote:', e);
    }
  }

  function refreshGrid() {
    if (GridInstance) {
      if (GridInstance.muuri) {
        GridInstance.muuri.refreshItems();
        GridInstance.muuri.layout();
      }
      if (GridInstance.widgets) {
        GridInstance.widgets.forEach(w => {
          if (w.chartJs) {
            w.chartJs.resize();
          }
        });
      }
    }
  }

  function init() {
    Workspaces.init();
    if (window.SatConnection && window.SatConnection.addDataListener) {
      window.SatConnection.addDataListener(processIncomingTelemetry);
    }
  }

  // Auto-inicialização quando o DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 50);
  }

  return {
    init: init,
    refreshGrid: refreshGrid,
    DataStorage: DataStorage,
    Workspaces: Workspaces,
    Grid: GridInstance,
    processIncomingTelemetry: processIncomingTelemetry
  };

})();
