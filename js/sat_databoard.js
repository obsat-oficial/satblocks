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

  // Mapa declarativo: id do campo no editor -> chave no setup do widget.
  // Evita repetir a mesma lógica de ler/gravar campo por campo pra cada um
  // dos 13 tipos de widget (ver prefillWidgetFields/collectWidgetFields).
  const WIDGET_FIELD_MAP = {
    chart: [
      ['widgetDatasetSelect', 'dataset'], ['widgetChartType', 'chartType'], ['widgetLimitPoints', 'limitPoints'],
      ['widgetTitleInput', 'title'], ['widgetLabelsInput', 'labels'], ['widgetXLabelInput', 'xLabel'],
      ['widgetYLabelInput', 'yLabel'], ['widgetTimeseriesInput', 'timeseries', 'checkbox'],
      ['widgetYMinInput', 'yMin'], ['widgetYMaxInput', 'yMax']
    ],
    switch: [
      ['widgetSwitchTitle', 'title'], ['widgetSwitchOnUrl', 'onUrl'], ['widgetSwitchOffUrl', 'offUrl'],
      ['widgetSwitchStateBinding', 'stateBinding']
    ],
    stream: [['widgetStreamUrl', 'manifest']],
    text: [['widgetTextTitle', 'title'], ['widgetTextValue', 'value'], ['widgetTextUnits', 'units']],
    gauge: [['widgetGaugeTitle', 'title'], ['widgetGaugeValue', 'value'], ['widgetGaugeMin', 'min'], ['widgetGaugeMax', 'max'], ['widgetGaugeUnits', 'units']],
    hgauge: [['widgetGaugeTitle', 'title'], ['widgetGaugeValue', 'value'], ['widgetGaugeMin', 'min'], ['widgetGaugeMax', 'max'], ['widgetGaugeUnits', 'units']],
    pointer: [['widgetGaugeTitle', 'title'], ['widgetGaugeValue', 'value'], ['widgetGaugeMin', 'min'], ['widgetGaugeMax', 'max'], ['widgetGaugeUnits', 'units']],
    sparkline: [['widgetSparklineTitle', 'title'], ['widgetSparklineDataset', 'dataset'], ['widgetSparklineLimit', 'limitPoints']],
    picture: [['widgetPictureTitle', 'title'], ['widgetPictureUrl', 'imageUrl']],
    indicator_light: [['widgetIndicatorTitle', 'title'], ['widgetIndicatorValue', 'value'], ['widgetIndicatorThreshold', 'threshold']],
    html: [['widgetHtmlContent', 'html', 'textarea']],
    actuator: [['widgetActuatorTitle', 'title'], ['widgetActuatorDefault', 'defaultValue'], ['widgetActuatorUrl', 'sendUrl']],
    slider: [['widgetSliderTitle', 'title'], ['widgetSliderMin', 'min'], ['widgetSliderMax', 'max'], ['widgetSliderDefault', 'defaultValue'], ['widgetSliderUrl', 'sendUrl']]
  };

  // Qual bloco de campos do editor (div oculto/visível) corresponde a cada
  // tipo — gauge/hgauge/pointer compartilham o mesmo bloco visual, já que
  // pedem exatamente os mesmos campos (título, valor, mín, máx, unidade).
  const WIDGET_FIELD_GROUP_ID = {
    chart: 'widgetChartFields',
    switch: 'widgetSwitchFields',
    stream: 'widgetStreamFields',
    text: 'widgetTextFields',
    gauge: 'widgetGaugeFields',
    hgauge: 'widgetGaugeFields',
    pointer: 'widgetGaugeFields',
    sparkline: 'widgetSparklineFields',
    picture: 'widgetPictureFields',
    indicator_light: 'widgetIndicatorFields',
    html: 'widgetHtmlFields',
    actuator: 'widgetActuatorFields',
    slider: 'widgetSliderFields'
  };

  function prefillWidgetFields(type, setup) {
    (WIDGET_FIELD_MAP[type] || []).forEach(([elId, key, kind]) => {
      const el = document.getElementById(elId);
      if (!el) return;
      if (kind === 'checkbox') el.checked = !!setup[key];
      else el.value = (setup[key] !== undefined && setup[key] !== null) ? setup[key] : '';
    });
  }

  function collectWidgetFields(type) {
    const setup = {};
    (WIDGET_FIELD_MAP[type] || []).forEach(([elId, key, kind]) => {
      const el = document.getElementById(elId);
      if (!el) return;
      setup[key] = kind === 'checkbox' ? el.checked : el.value.trim();
    });
    return setup;
  }

  function showWidgetFieldGroup(type) {
    const shownId = WIDGET_FIELD_GROUP_ID[type];
    new Set(Object.values(WIDGET_FIELD_GROUP_ID)).forEach(gid => {
      const el = document.getElementById(gid);
      if (el) el.style.display = (gid === shownId) ? 'flex' : 'none';
    });
  }

  const WIDGET_ICONS = {
    chart: '📊',
    switch: '🔘',
    stream: '🎥',
    text: '🔢',
    gauge: '⏱️',
    sparkline: '📈',
    pointer: '🧭',
    picture: '🖼️',
    indicator_light: '💡',
    html: '🧩',
    actuator: '🎛️',
    slider: '🎚️',
    hgauge: '📏'
  };

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

    // Converte um timestamp (epoch em ms) para "HH:MM:SS"; se já vier como
    // string (dado legado gravado antes desta mudança, ou fonte externa),
    // devolve como está em vez de tentar reformatar.
    formatEpoch(value) {
      if (typeof value !== 'number') return value;
      const d = new Date(value);
      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
    }

    notifySubscribers(dataset, coordinates) {
      this._subscribers.forEach(chart => {
        if (chart.dataset === dataset && chart.chartJs) {
          const c = chart.chartJs;
          const rawX = coordinates[0];
          const limit = chart.limitPoints || 50;

          // Eixo temporal real: Chart.js só posiciona corretamente pontos
          // num eixo linear quando cada ponto vem como objeto {x, y} — usar
          // um array de rótulos numérico em paralelo (como no eixo de
          // categorias) não funciona para esse tipo de eixo.
          if (chart.timeseries && typeof rawX === 'number') {
            for (let i = 1; i < coordinates.length; i++) {
              if (c.data.datasets[i - 1]) {
                c.data.datasets[i - 1].data.push({ x: rawX, y: coordinates[i] });
                if (c.data.datasets[i - 1].data.length > limit) {
                  c.data.datasets[i - 1].data.shift();
                }
              }
            }
            // Um ponto que chegue fora de ordem (ex.: eco atrasado de uma
            // fonte assíncrona) faz o Chart.js desenhar um zigue-zague
            // voltando no tempo — reordenar por x garante a linha sempre
            // cronológica, independente da ordem real de chegada.
            c.data.datasets.forEach(ds => ds.data.sort((a, b) => a.x - b.x));
          } else {
            const label = this.formatEpoch(rawX);
            c.data.labels.push(label);
            for (let i = 1; i < coordinates.length; i++) {
              if (c.data.datasets[i - 1]) {
                c.data.datasets[i - 1].data.push(coordinates[i]);
              }
            }

            if (c.data.labels.length > limit) {
              c.data.labels.shift();
              c.data.datasets.forEach(ds => ds.data.shift());
            }
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

      // O Chart.js desenha os pontos na ordem do array, não pela posição
      // real no tempo — um ponto que chegue "atrasado" (ex.: eco duplicado
      // de uma fonte assíncrona) fora de ordem faz a linha desenhar um
      // zigue-zague voltando no tempo antes de continuar. Ordenar por
      // timestamp aqui garante que a linha sempre siga cronologicamente,
      // não importa a ordem real de chegada.
      rows.sort((a, b) => (a[0] > b[0] ? 1 : a[0] < b[0] ? -1 : 0));

      const labels = [];
      const numSeries = rows.length > 0 ? rows[0].length - 1 : 1;
      const seriesData = Array.from({ length: Math.max(1, numSeries) }, () => []);

      // Eixo temporal real só é possível quando todo o histórico já é
      // timestamp numérico (epoch ms); dado legado gravado como string
      // "HH:MM:SS" formatada cai automaticamente para o eixo de categorias.
      const useTimeAxis = !!setup.timeseries && rows.every(r => typeof r[0] === 'number');

      rows.forEach(row => {
        if (useTimeAxis) {
          // Cada ponto vira {x, y}: é assim que o Chart.js posiciona
          // corretamente valores num eixo linear (um array de rótulos em
          // paralelo, como no eixo de categorias, não funciona aqui).
          for (let i = 1; i < row.length; i++) {
            seriesData[i - 1].push({ x: row[0], y: row[i] });
          }
        } else {
          labels.push(this.formatEpoch(row[0]));
          for (let i = 1; i < row.length; i++) {
            seriesData[i - 1].push(row[i]);
          }
        }
      });

      const isScatter = setup.chartType === 'scatter';
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
          showLine: !isScatter,
          tension: 0.3,
          pointRadius: setup.chartType === 'line' ? 2 : (isScatter ? 5 : 4),
          // Barras num eixo linear/temporal calculam a própria largura pela
          // distância entre pontos vizinhos — com poucos pontos ou pontos
          // muito espaçados no tempo, isso pode dar largura ~0 (barra
          // "invisível", mesmo com o eixo escalado corretamente pelos
          // valores). Fixar uma largura em pixels evita esse problema.
          barThickness: (setup.chartType === 'bar' && useTimeAxis) ? 10 : undefined
        };
      });

      return { labels, datasets, useTimeAxis };
    }

    getAllDatasets() {
      return this._keys;
    }

    clearDataset(dataset) {
      delete this._data[dataset];
      this._keys = this._keys.filter(k => k !== dataset);
      localStorage.removeItem(`datastorage:${dataset}`);

      // Zera também qualquer gráfico que já esteja exibindo esse dataset,
      // em vez de deixá-lo mostrando dados antigos que só existiam em memória.
      this._subscribers.forEach(chart => {
        if (chart.dataset === dataset && chart.chartJs) {
          chart.chartJs.data.labels = [];
          chart.chartJs.data.datasets.forEach(ds => ds.data = []);
          chart.chartJs.update();
        }
      });
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

    // Formata o timestamp para CSV: data+hora completas quando é epoch
    // numérico (dado novo), ou o texto como veio (dado legado "HH:MM:SS").
    formatTimestampForCsv(value) {
      if (typeof value !== 'number') return value;
      return new Date(value).toISOString();
    }

    exportCsv(dataset) {
      const rows = this._data[dataset] || [];
      if (rows.length === 0) return 'Timestamp,Valor\n';
      return rows.map(r => [this.formatTimestampForCsv(r[0]), ...r.slice(1)].join(',')).join('\n');
    }

    exportAllConsolidatedCsv() {
      let csv = 'Timestamp,Dataset,Valor_1,Valor_2,Valor_3\n';
      this._keys.forEach(k => {
        const rows = this._data[k] || [];
        rows.forEach(r => {
          csv += `${this.formatTimestampForCsv(r[0])},${k},${r.slice(1).join(',')}\n`;
        });
      });
      return csv;
    }
  }

  const DataStorage = new DataStorageEngine();

  // Mesmo token gerado em satblocks/generator_python.js (mesma chave de
  // localStorage) — é ele, e não o "ID IoT" digitado pelo aluno, que
  // separa de verdade os dados de cada equipe no servidor. Por padrão o
  // Painel IOT usa o token deste MESMO navegador (preenchido sozinho); só
  // é preciso digitar algo aqui para acompanhar a sessão de outra pessoa.
  function getOrCreateIotSessionToken() {
    const KEY = 'satblocks_iot_session_token';
    try {
      let token = localStorage.getItem(KEY);
      if (!token) {
        token = (typeof crypto !== 'undefined' && crypto.randomUUID)
          ? crypto.randomUUID().replace(/-/g, '')
          : Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
        localStorage.setItem(KEY, token);
      }
      return token;
    } catch (e) {
      return '';
    }
  }

  // Encaminha, em paralelo, os sensores padrão OBSAT recebidos via USB/BLE
  // para o mesmo canal HTTP que os blocos "Publicar no Painel IoT" usam —
  // sem isso, quem abre um link de Painel IOT compartilhado nunca veria
  // esses gráficos, já que a telemetria por cabo só existe no navegador de
  // quem está fisicamente conectado à placa. Uso o mesmo token embutido no
  // código gerado, para o link compartilhado (que carrega esse token)
  // continuar mostrando os mesmos dados ao vivo.
  function forwardScalarToIotChannel(equipe, canal, valor) {
    const token = getOrCreateIotSessionToken();
    if (!token) return;
    const params = new URLSearchParams({
      equipe: equipe !== undefined && equipe !== null ? String(equipe) : '',
      canal: canal,
      valor: String(valor),
      token: token
    });
    fetch(`telemetria/iot_publish.php?${params.toString()}`).catch(() => {
      // Falha de rede não deve interromper a exibição local no Databoard
    });
  }

  /* =========================================================================
   * 1b. PONTE IOT (Polling HTTP dos canais publicados pelos blocos IoT)
   *
   * Não existe broker MQTT: os blocos "Publicar no Painel IoT" fazem uma
   * requisição HTTP simples para telemetria/iot_publish.php. Esta ponte
   * pergunta periodicamente por token de sessão (telemetria/iot_topics.php)
   * quais canais existem e busca incrementalmente (telemetria/iot_get.php)
   * o que chegou de novo, alimentando o mesmo DataStorage que os gráficos
   * usam.
   * ========================================================================= */
  class IotBridgeEngine {
    constructor() {
      this.token = localStorage.getItem('satblocks_iot_watch_token') || getOrCreateIotSessionToken();
      this.knownChannels = {}; // canal -> próximo timestamp (unix) a buscar
      this.timer = null;
      this.pollIntervalMs = 4000;
      this.inFlight = false;
    }

    setToken(token) {
      const novo = String(token || '').trim();
      if (novo === this.token) return;
      this.token = novo;
      this.knownChannels = {};
      localStorage.setItem('satblocks_iot_watch_token', this.token);
    }

    getToken() {
      return this.token;
    }

    getKnownChannels() {
      return Object.keys(this.knownChannels);
    }

    start() {
      if (this.timer) return;
      this.pollOnce();
      this.timer = setInterval(() => this.pollOnce(), this.pollIntervalMs);
    }

    stop() {
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
    }

    async pollOnce() {
      if (!this.token || this.inFlight) return;
      this.inFlight = true;
      try {
        await this.discoverChannels();
        const channels = Object.keys(this.knownChannels);
        for (const canal of channels) {
          await this.fetchChannel(canal);
        }
      } catch (e) {
        // Silencioso: rede instável não deve gerar ruído contínuo no console
      } finally {
        this.inFlight = false;
      }
    }

    async discoverChannels() {
      const resp = await fetch(`telemetria/iot_topics.php?token=${encodeURIComponent(this.token)}`);
      const data = await resp.json();
      if (!data || !data.success || !Array.isArray(data.result)) return;

      // Quando este navegador está observando o PRÓPRIO token (caso padrão,
      // não uma sessão compartilhada de outra pessoa), os canais canônicos
      // OBSAT (obsat_temperatura, etc.) já chegam direto via USB/BLE em
      // processTelemetryLine — que também os encaminha para este mesmo
      // canal HTTP, só para viabilizar o link compartilhado. Sem este
      // filtro, o polling buscaria de volta o que acabou de ser enviado,
      // duplicando cada ponto no gráfico local.
      const watchingOwnToken = this.token === getOrCreateIotSessionToken();
      const reservedLocalChannels = ['obsat_temperatura', 'obsat_pressao', 'obsat_altitude', 'obsat_bateria'];

      data.result.forEach(canal => {
        if (watchingOwnToken && reservedLocalChannels.includes(canal)) return;
        if (!(canal in this.knownChannels)) {
          this.knownChannels[canal] = 0;
        }
      });
    }

    async fetchChannel(canal) {
      const since = this.knownChannels[canal];
      const url = `telemetria/iot_get.php?token=${encodeURIComponent(this.token)}&canal=${encodeURIComponent(canal)}` +
        (since ? `&desde=${since}` : '');
      const resp = await fetch(url);
      const data = await resp.json();
      if (!data || !data.success || !Array.isArray(data.result) || data.result.length === 0) return;

      data.result.forEach(ponto => {
        const timestampMs = ponto.timestamp * 1000;
        const numerico = parseFloat(ponto.valor);
        DataStorage.push(canal, [timestampMs, isNaN(numerico) ? ponto.valor : numerico]);
        this.knownChannels[canal] = Math.max(this.knownChannels[canal], ponto.timestamp + 1);
      });
    }
  }

  const IotBridge = new IotBridgeEngine();

  /* =========================================================================
   * 1c. DATASOURCES (fontes de dados nomeadas, vivas, vinculáveis a
   * qualquer campo de qualquer widget — equivalente ao conceito de
   * "Datasource" do Freeboard/BIPES).
   *
   * Um Datasource é só um nome + um jeito de buscar um valor periodicamente.
   * Dois tipos:
   *   - "iot_channel": lê o último valor de um canal IoT (mesmo mecanismo
   *     de telemetria/iot_get.php já usado pelo Painel IOT).
   *   - "json_http": busca um JSON de uma URL qualquer, em intervalos.
   *
   * Qualquer campo de texto de um widget pode conter {{nomeDoDatasource}}
   * ou {{nomeDoDatasource.campo}} — esse token é substituído pelo valor
   * mais recente sempre que o Datasource atualizar.
   * ========================================================================= */
  class DatasourceEngine {
    constructor() {
      this.sources = {};
      this.subscribers = {};
      this.restore();
    }

    restore() {
      let saved = {};
      try {
        saved = JSON.parse(localStorage.getItem('satblocks_datasources') || '{}') || {};
      } catch (e) {}
      Object.keys(saved).forEach(name => this._register(name, saved[name].type, saved[name].config));
    }

    persist() {
      const dump = {};
      Object.keys(this.sources).forEach(name => {
        dump[name] = { type: this.sources[name].type, config: this.sources[name].config };
      });
      try { localStorage.setItem('satblocks_datasources', JSON.stringify(dump)); } catch (e) {}
    }

    list() {
      return Object.keys(this.sources);
    }

    getDefinition(name) {
      const s = this.sources[name];
      return s ? { type: s.type, config: s.config } : null;
    }

    exportDefinitions() {
      const dump = {};
      this.list().forEach(name => { dump[name] = this.getDefinition(name); });
      return dump;
    }

    importDefinitions(dump) {
      if (!dump || typeof dump !== 'object') return;
      Object.keys(dump).forEach(name => this.add(name, dump[name].type, dump[name].config));
    }

    add(name, type, config) {
      name = String(name || '').trim();
      if (!name) return;
      this._register(name, type, config);
      this.persist();
    }

    remove(name) {
      const s = this.sources[name];
      if (s && s.timer) clearInterval(s.timer);
      delete this.sources[name];
      delete this.subscribers[name];
      this.persist();
    }

    _register(name, type, config) {
      if (this.sources[name] && this.sources[name].timer) clearInterval(this.sources[name].timer);
      this.sources[name] = { type, config: config || {}, value: null, timer: null };

      if (type === 'iot_channel') {
        this._startIotChannelPoll(name);
      } else if (type === 'json_http') {
        this._startJsonHttpPoll(name);
      }
    }

    _startIotChannelPoll(name) {
      const entry = this.sources[name];
      const poll = async () => {
        try {
          // Usa o token que o Painel IOT está OBSERVANDO no momento (o
          // próprio, por padrão — ou o de uma sessão compartilhada, se for
          // o caso de quem abriu um link), não sempre o token deste
          // navegador. Sem isso, um Datasource nunca funcionaria para quem
          // está só vendo o painel de outra pessoa.
          const token = IotBridge.getToken() || getOrCreateIotSessionToken();
          const canal = entry.config.canal;
          if (!canal) return;
          const resp = await fetch(`telemetria/iot_get.php?token=${encodeURIComponent(token)}&canal=${encodeURIComponent(canal)}`);
          const data = await resp.json();
          if (data && data.success && Array.isArray(data.result) && data.result.length > 0) {
            const last = data.result[data.result.length - 1];
            const numerico = parseFloat(last.valor);
            entry.value = { value: isNaN(numerico) ? last.valor : numerico, timestamp: last.timestamp };
            this._notify(name);
          }
        } catch (e) {}
      };
      poll();
      entry.timer = setInterval(poll, 4000);
    }

    _startJsonHttpPoll(name) {
      const entry = this.sources[name];
      const intervalMs = Math.max(2000, parseInt(entry.config.refreshMs, 10) || 5000);
      const poll = async () => {
        try {
          const resp = await fetch(entry.config.url);
          entry.value = await resp.json();
          this._notify(name);
        } catch (e) {}
      };
      poll();
      entry.timer = setInterval(poll, intervalMs);
    }

    _notify(name) {
      (this.subscribers[name] || []).forEach(cb => {
        try { cb(this.sources[name].value); } catch (e) {}
      });
    }

    subscribe(name, cb) {
      if (!this.subscribers[name]) this.subscribers[name] = [];
      this.subscribers[name].push(cb);
    }

    unsubscribe(name, cb) {
      if (this.subscribers[name]) {
        this.subscribers[name] = this.subscribers[name].filter(f => f !== cb);
      }
    }

    // Resolve "nome" ou "nome.campo.subcampo" para o valor mais recente
    resolve(expr) {
      if (!expr) return undefined;
      const parts = String(expr).split('.');
      const name = parts.shift();
      const entry = this.sources[name];
      if (!entry) return undefined;
      let v = entry.value;
      for (const p of parts) {
        if (v === null || v === undefined) return undefined;
        v = v[p];
      }
      return v;
    }
  }

  const Datasources = new DatasourceEngine();

  // Substitui todo token {{nome}} / {{nome.campo}} pelo valor atual do
  // Datasource correspondente (string vazia se ainda não houver valor).
  function substituteBindings(text) {
    if (typeof text !== 'string') return text;
    return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, expr) => {
      const v = Datasources.resolve(expr);
      return (v === undefined || v === null) ? '' : String(v);
    });
  }

  // Lista os nomes de Datasource referenciados em um texto (para assinar/
  // desassinar atualizações ao vivo de um widget).
  function extractBindingNames(text) {
    const names = new Set();
    if (typeof text !== 'string') return names;
    const re = /\{\{\s*([\w.]+)\s*\}\}/g;
    let m;
    while ((m = re.exec(text))) names.add(m[1].split('.')[0]);
    return names;
  }

  // Sanitização básica para o widget HTML livre: remove <script>, <iframe>
  // e atributos de evento (onclick=, onerror= etc.) antes de inserir no DOM.
  // Não é uma sanitização perfeita, mas cobre os vetores óbvios de XSS —
  // importante porque um link de Painel IOT compartilhado carrega widgets
  // de quem publicou o link, então HTML cru de terceiros passa por aqui.
  function sanitizeWidgetHtml(html) {
    if (typeof html !== 'string') return '';
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
      .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(/javascript\s*:/gi, '');
  }

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
      this.widgetDsSubs = {}; // uid -> [{name, cb}] assinaturas de Datasource ativas
    }

    // Cancela as assinaturas de Datasource de um widget (chamado antes de
    // editar/remover, pra não acumular callbacks órfãos apontando pra DOM
    // que não existe mais).
    unmountDatasourceSubs(uid) {
      (this.widgetDsSubs[uid] || []).forEach(({ name, cb }) => Datasources.unsubscribe(name, cb));
      delete this.widgetDsSubs[uid];
    }

    // Vincula um elemento a um Datasource: aplica `apply(valorResolvido)`
    // imediatamente e de novo sempre que o Datasource atualizar. `template`
    // pode ser um texto com {{...}} (ex.: título) ou uma expressão simples
    // "nome" / "nome.campo" (ex.: valor de um gauge).
    bindTemplate(uid, template, apply) {
      if (!template) { apply(''); return; }
      const names = extractBindingNames(template);
      names.forEach(name => {
        const cb = () => apply(substituteBindings(template));
        Datasources.subscribe(name, cb);
        if (!this.widgetDsSubs[uid]) this.widgetDsSubs[uid] = [];
        this.widgetDsSubs[uid].push({ name, cb });
      });
      apply(substituteBindings(template));
    }

    // Igual ao bindTemplate, mas resolve `expr` como valor bruto (não
    // string) — usado por widgets numéricos (gauge, ponteiro, barra).
    bindValue(uid, expr, apply) {
      if (!expr) { apply(undefined); return; }
      const name = String(expr).split('.')[0];
      const cb = () => apply(Datasources.resolve(expr));
      Datasources.subscribe(name, cb);
      if (!this.widgetDsSubs[uid]) this.widgetDsSubs[uid] = [];
      this.widgetDsSubs[uid].push({ name, cb });
      apply(Datasources.resolve(expr));
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
        const badge = itemEl.querySelector('.widget-title-badge');
        if (badge) {
          badge.innerHTML = `<span>${WIDGET_ICONS[type] || '📊'}</span><span>${setup.title || 'Widget'}</span>`;
        }
      }

      // Destrói gráfico Chart.js antigo (se houver) e cancela qualquer
      // assinatura de Datasource da versão anterior do widget, antes de
      // remontar o corpo com os novos parâmetros.
      const existingWidget = this.widgets.find(w => w.uid === uid);
      if (existingWidget) {
        if (existingWidget.chartJs) { try { existingWidget.chartJs.destroy(); } catch (e) {} }
        DataStorage.unsubscribe(existingWidget);
        this.widgets = this.widgets.filter(w => w.uid !== uid);
      }
      this.unmountDatasourceSubs(uid);

      const body = itemEl ? itemEl.querySelector('.widget-canvas-box') : null;
      if (body) {
        body.innerHTML = '';
        this.mountWidgetBody(uid, { type, setup }, body);
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

      const title = data.setup.title || 'Widget';
      const icon = WIDGET_ICONS[data.type] || '📊';

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
      this.mountWidgetBody(uid, data, body);

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

    // Cria o conteúdo específico de cada tipo de widget dentro de `body`.
    // Compartilhado entre a criação inicial (renderWidget) e a edição
    // (updateWidget), para não duplicar a lógica de cada tipo.
    mountWidgetBody(uid, data, body) {
      const type = data.type;
      const setup = data.setup;

      if (type === 'chart') {
        const canvas = document.createElement('canvas');
        canvas.id = `canvas_${uid}`;
        body.appendChild(canvas);
        this.widgets.push(this.initChartJs(uid, canvas, setup));

      } else if (type === 'switch') {
        this.mountSwitchWidget(uid, setup, body);

      } else if (type === 'stream') {
        const img = document.createElement('img');
        img.src = setup.manifest || 'media/camera_placeholder.jpg';
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:8px;';
        body.appendChild(img);

      } else if (type === 'text') {
        this.mountTextWidget(uid, setup, body);

      } else if (type === 'gauge') {
        this.mountGaugeWidget(uid, setup, body);

      } else if (type === 'sparkline') {
        this.mountSparklineWidget(uid, setup, body);

      } else if (type === 'pointer') {
        this.mountPointerWidget(uid, setup, body);

      } else if (type === 'picture') {
        this.mountPictureWidget(uid, setup, body);

      } else if (type === 'indicator_light') {
        this.mountIndicatorLightWidget(uid, setup, body);

      } else if (type === 'html') {
        this.mountHtmlWidget(uid, setup, body);

      } else if (type === 'actuator') {
        this.mountActuatorWidget(uid, setup, body);

      } else if (type === 'slider') {
        this.mountSliderWidget(uid, setup, body);

      } else if (type === 'hgauge') {
        this.mountHorizontalGaugeWidget(uid, setup, body);
      }
    }

    mountSwitchWidget(uid, setup, body) {
      const switchBox = document.createElement('div');
      switchBox.className = 'bipes-switch-box';
      switchBox.innerHTML = `
        <div style="font-size: 13px; font-weight: 700; color: #475569;">${setup.title || 'Comando Satélite'}</div>
        <div class="bipes-switch-toggle" id="switch_${uid}"></div>
        <div style="font-size: 11px; color: #94a3b8;">${setup.onUrl || 'Sem URL vinculada'}</div>
      `;
      body.appendChild(switchBox);

      const toggle = switchBox.querySelector('.bipes-switch-toggle');
      let state = false;
      toggle.onclick = () => {
        const nextState = !state;
        const targetUrl = nextState ? setup.onUrl : setup.offUrl;
        if (!targetUrl) return;

        const confirmSuccess = () => {
          state = nextState;
          toggle.classList.toggle('on', state);
          toggle.classList.remove('switch-error');
        };
        const flashError = () => {
          toggle.classList.add('switch-error');
          setTimeout(() => toggle.classList.remove('switch-error'), 800);
        };

        // Tenta uma requisição normal primeiro, para confirmar de verdade que
        // o comando chegou (só muda o visual se a placa respondeu OK). Se a
        // placa não expõe CORS (comum em servidores MicroPython simples) ou
        // a página está em HTTPS falando com um IP local em HTTP, cai para
        // "no-cors" como último recurso — sem confirmação real, mas ainda
        // disparando o comando, igual ao comportamento anterior.
        fetch(targetUrl)
          .then(resp => {
            if (!resp.ok) throw new Error('HTTP ' + resp.status);
            confirmSuccess();
          })
          .catch(() => {
            fetch(targetUrl, { mode: 'no-cors' })
              .then(confirmSuccess)
              .catch(flashError);
          });
      };

      // Estado real (opcional): se um Datasource de estado for informado,
      // o visual do interruptor passa a refletir esse valor de verdade
      // (em vez de só assumir sucesso depois de clicar) — é a peça que
      // faltava pra ele não parecer "desconectado de tudo".
      if (setup.stateBinding) {
        this.bindValue(uid, setup.stateBinding, (v) => {
          const on = !!v && v !== '0' && v !== 'false' && v !== 'off';
          state = on;
          toggle.classList.toggle('on', on);
        });
      }
    }

    mountTextWidget(uid, setup, body) {
      const box = document.createElement('div');
      box.className = 'bipes-text-widget';
      box.innerHTML = `<div class="bipes-text-value" id="textval_${uid}">—</div><div class="bipes-text-units"></div>`;
      body.appendChild(box);
      const valueEl = box.querySelector('.bipes-text-value');
      const unitsEl = box.querySelector('.bipes-text-units');
      unitsEl.textContent = setup.units || '';
      this.bindTemplate(uid, setup.value, (resolved) => {
        valueEl.textContent = resolved || '—';
      });
    }

    mountGaugeWidget(uid, setup, body) {
      const min = parseFloat(setup.min) || 0;
      const max = parseFloat(setup.max) || 100;
      const wrap = document.createElement('div');
      wrap.className = 'bipes-gauge-widget';
      wrap.innerHTML = `
        <svg viewBox="0 0 100 60" class="bipes-gauge-svg">
          <path d="M 10 55 A 45 45 0 0 1 90 55" class="bipes-gauge-track"></path>
          <path d="M 10 55 A 45 45 0 0 1 90 55" class="bipes-gauge-fill" id="gaugefill_${uid}"></path>
        </svg>
        <div class="bipes-gauge-value" id="gaugeval_${uid}">—</div>
        <div class="bipes-gauge-range"><span>${min}</span><span>${max}</span></div>
      `;
      body.appendChild(wrap);

      const ARC_LENGTH = 141.4; // comprimento aproximado do arco de 180°
      const fillPath = wrap.querySelector(`#gaugefill_${uid}`);
      const valueEl = wrap.querySelector(`#gaugeval_${uid}`);

      this.bindValue(uid, setup.value, (raw) => {
        const v = parseFloat(raw);
        if (isNaN(v)) { valueEl.textContent = '—'; return; }
        const clamped = Math.max(min, Math.min(max, v));
        const pct = (clamped - min) / (max - min || 1);
        fillPath.style.strokeDasharray = `${ARC_LENGTH}`;
        fillPath.style.strokeDashoffset = `${ARC_LENGTH * (1 - pct)}`;
        valueEl.textContent = `${v}${setup.units ? ' ' + setup.units : ''}`;
      });
    }

    mountSparklineWidget(uid, setup, body) {
      const canvas = document.createElement('canvas');
      canvas.id = `sparkline_${uid}`;
      body.appendChild(canvas);

      const chartData = DataStorage.getChartData(setup.dataset, { limitPoints: setup.limitPoints || 30 });
      let chartJsInstance = null;
      if (typeof Chart !== 'undefined') {
        chartJsInstance = new Chart(canvas, {
          type: 'line',
          data: {
            labels: chartData.labels,
            datasets: [{
              data: chartData.datasets[0] ? chartData.datasets[0].data : [],
              borderColor: '#0284c7',
              backgroundColor: 'rgba(2,132,199,0.12)',
              borderWidth: 2,
              fill: true,
              pointRadius: 0,
              tension: 0.3
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 0 },
            plugins: { legend: { display: false } },
            scales: { x: { display: false }, y: { display: false } }
          }
        });
      }

      this.widgets.push({
        uid,
        dataset: setup.dataset,
        limitPoints: parseInt(setup.limitPoints, 10) || 30,
        timeseries: false,
        chartJs: chartJsInstance,
        canvas
      });
      DataStorage.subscribe(this.widgets[this.widgets.length - 1]);
    }

    mountPointerWidget(uid, setup, body) {
      const min = parseFloat(setup.min) || 0;
      const max = parseFloat(setup.max) || 360;
      const wrap = document.createElement('div');
      wrap.className = 'bipes-pointer-widget';
      wrap.innerHTML = `
        <svg viewBox="0 0 100 100" class="bipes-pointer-svg">
          <circle cx="50" cy="50" r="46" class="bipes-pointer-face"></circle>
          <line x1="50" y1="50" x2="50" y2="12" class="bipes-pointer-needle" id="needle_${uid}"></line>
          <circle cx="50" cy="50" r="4" class="bipes-pointer-hub"></circle>
        </svg>
        <div class="bipes-pointer-value" id="pointerval_${uid}">—</div>
      `;
      body.appendChild(wrap);

      const needle = wrap.querySelector(`#needle_${uid}`);
      const valueEl = wrap.querySelector(`#pointerval_${uid}`);

      this.bindValue(uid, setup.value, (raw) => {
        const v = parseFloat(raw);
        if (isNaN(v)) { valueEl.textContent = '—'; return; }
        const clamped = Math.max(min, Math.min(max, v));
        const pct = (clamped - min) / (max - min || 1);
        const deg = pct * 360;
        needle.setAttribute('transform', `rotate(${deg} 50 50)`);
        valueEl.textContent = `${v}${setup.units ? ' ' + setup.units : ''}`;
      });
    }

    mountPictureWidget(uid, setup, body) {
      const img = document.createElement('img');
      img.style.cssText = 'width:100%;height:100%;object-fit:contain;border-radius:8px;';
      body.appendChild(img);
      this.bindTemplate(uid, setup.imageUrl, (url) => {
        if (url) img.src = url;
      });
    }

    mountIndicatorLightWidget(uid, setup, body) {
      const wrap = document.createElement('div');
      wrap.className = 'bipes-indicator-widget';
      wrap.innerHTML = `<div class="bipes-indicator-lamp" id="lamp_${uid}"></div><div class="bipes-indicator-label">${setup.title || ''}</div>`;
      body.appendChild(wrap);
      const lamp = wrap.querySelector(`#lamp_${uid}`);

      this.bindValue(uid, setup.value, (raw) => {
        const threshold = setup.threshold !== undefined && setup.threshold !== '' ? parseFloat(setup.threshold) : null;
        let on;
        if (threshold !== null && !isNaN(parseFloat(raw))) {
          on = parseFloat(raw) >= threshold;
        } else {
          on = !!raw && raw !== '0' && raw !== 'false' && raw !== 'off';
        }
        lamp.classList.toggle('on', on);
      });
    }

    mountHtmlWidget(uid, setup, body) {
      const wrap = document.createElement('div');
      wrap.className = 'bipes-html-widget';
      body.appendChild(wrap);
      this.bindTemplate(uid, setup.html, (resolved) => {
        wrap.innerHTML = sanitizeWidgetHtml(resolved);
      });
    }

    mountActuatorWidget(uid, setup, body) {
      const wrap = document.createElement('div');
      wrap.className = 'bipes-actuator-widget';
      wrap.innerHTML = `
        <div style="font-size: 13px; font-weight: 700; color: #475569;">${setup.title || 'Atuador'}</div>
        <div class="bipes-actuator-row">
          <input type="number" class="sat-input-pill bipes-actuator-input" id="actval_${uid}" value="${setup.defaultValue || 0}">
          <button class="sat-btn primary" id="actbtn_${uid}">Enviar</button>
        </div>
      `;
      body.appendChild(wrap);

      const input = wrap.querySelector(`#actval_${uid}`);
      const btn = wrap.querySelector(`#actbtn_${uid}`);
      btn.onclick = () => {
        const url = (setup.sendUrl || '').replace(/\{\{\s*value\s*\}\}/g, encodeURIComponent(input.value));
        if (!url) return;
        btn.disabled = true;
        fetch(url).catch(() => {}).finally(() => { btn.disabled = false; });
      };
    }

    mountSliderWidget(uid, setup, body) {
      const min = parseFloat(setup.min) || 0;
      const max = parseFloat(setup.max) || 100;
      const wrap = document.createElement('div');
      wrap.className = 'bipes-slider-widget';
      wrap.innerHTML = `
        <div style="font-size: 13px; font-weight: 700; color: #475569;">${setup.title || 'Controle'}</div>
        <input type="range" class="bipes-slider-input" id="slider_${uid}" min="${min}" max="${max}" value="${setup.defaultValue || min}">
        <div class="bipes-slider-value" id="sliderval_${uid}">${setup.defaultValue || min}</div>
      `;
      body.appendChild(wrap);

      const input = wrap.querySelector(`#slider_${uid}`);
      const valueEl = wrap.querySelector(`#sliderval_${uid}`);
      let sendTimer = null;
      input.oninput = () => {
        valueEl.textContent = input.value;
        clearTimeout(sendTimer);
        sendTimer = setTimeout(() => {
          const url = (setup.sendUrl || '').replace(/\{\{\s*value\s*\}\}/g, encodeURIComponent(input.value));
          if (url) fetch(url).catch(() => {});
        }, 250);
      };
    }

    mountHorizontalGaugeWidget(uid, setup, body) {
      const min = parseFloat(setup.min) || 0;
      const max = parseFloat(setup.max) || 100;
      const wrap = document.createElement('div');
      wrap.className = 'bipes-hgauge-widget';
      wrap.innerHTML = `
        <div style="font-size: 13px; font-weight: 700; color: #475569;">${setup.title || ''}</div>
        <div class="bipes-hgauge-track"><div class="bipes-hgauge-fill" id="hgfill_${uid}"></div></div>
        <div class="bipes-hgauge-value" id="hgval_${uid}">—</div>
      `;
      body.appendChild(wrap);

      const fill = wrap.querySelector(`#hgfill_${uid}`);
      const valueEl = wrap.querySelector(`#hgval_${uid}`);
      this.bindValue(uid, setup.value, (raw) => {
        const v = parseFloat(raw);
        if (isNaN(v)) { valueEl.textContent = '—'; return; }
        const clamped = Math.max(min, Math.min(max, v));
        const pct = ((clamped - min) / (max - min || 1)) * 100;
        fill.style.width = `${pct}%`;
        valueEl.textContent = `${v}${setup.units ? ' ' + setup.units : ''}`;
      });
    }

    initChartJs(uid, canvasEl, setup) {
      const chartData = DataStorage.getChartData(setup.dataset, setup);
      const isRadar = setup.chartType === 'radar';
      const isPie = setup.chartType === 'pie';
      const noScales = isRadar || isPie;
      // "Dispersão" reaproveita o controlador de linha do Chart.js sem
      // desenhar a linha (showLine:false já vem no dataset) — assim os
      // pontos continuam sobre o mesmo eixo de categorias/tempo das outras
      // séries, sem precisar de pares {x,y} num eixo puramente numérico.
      const chartJsType = setup.chartType === 'scatter' ? 'line' : (setup.chartType || 'line');

      let chartJsInstance = null;
      if (typeof Chart !== 'undefined') {
        const scalesConfig = noScales ? {} : {
          x: {
            type: chartData.useTimeAxis ? 'linear' : 'category',
            // Sem isso, o Chart.js arredonda o início/fim do eixo para
            // "números redondos" de tick, deixando um vão antes do
            // primeiro ponto e depois do último. "data" força o eixo a
            // começar/terminar exatamente no primeiro/último timestamp.
            bounds: chartData.useTimeAxis ? 'data' : undefined,
            grid: { color: 'rgba(0,0,0,0.04)' },
            ticks: {
              maxTicksLimit: 8,
              font: { size: 10 },
              callback: chartData.useTimeAxis ? (value) => DataStorage.formatEpoch(value) : undefined
            },
            title: setup.xLabel ? { display: true, text: setup.xLabel } : undefined
          },
          y: {
            grid: { color: 'rgba(0,0,0,0.06)' },
            ticks: { font: { size: 10 } },
            beginAtZero: false,
            title: setup.yLabel ? { display: true, text: setup.yLabel } : undefined,
            min: (setup.yMin !== undefined && setup.yMin !== '' && !isNaN(parseFloat(setup.yMin))) ? parseFloat(setup.yMin) : undefined,
            max: (setup.yMax !== undefined && setup.yMax !== '' && !isNaN(parseFloat(setup.yMax))) ? parseFloat(setup.yMax) : undefined
          }
        };

        chartJsInstance = new Chart(canvasEl, {
          type: chartJsType,
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
            scales: scalesConfig
          }
        });
      }

      const widgetMeta = {
        uid: uid,
        dataset: setup.dataset,
        limitPoints: parseInt(setup.limitPoints, 10) || 50,
        // Precisa ser exatamente o que o gráfico foi CRIADO usando
        // (chartData.useTimeAxis), não só a intenção do checkbox
        // (setup.timeseries) — se o dataset tiver dado antigo (string)
        // misturado com epoch numérico, o gráfico é criado com eixo de
        // categorias mesmo com o checkbox marcado, e a atualização ao
        // vivo precisa concordar com isso ou manda pontos {x,y} para um
        // eixo que não sabe interpretá-los.
        timeseries: !!chartData.useTimeAxis,
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
      this.unmountDatasourceSubs(uid);

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
      switch (type) {
        case 'chart':
          return {
            dataset: 'obsat_altitude',
            chartType: 'line',
            title: 'Altitude Barométrica (m)',
            labels: 'Altitude (m)',
            limitPoints: 50
          };
        case 'switch':
          return {
            title: 'Comando Satélite',
            onUrl: 'http://192.168.4.1/cmd/on',
            offUrl: 'http://192.168.4.1/cmd/off',
            stateBinding: ''
          };
        case 'stream':
          return { manifest: 'http://192.168.4.1:81/stream' };
        case 'text':
          return { title: 'Valor', value: '{{meuSensor.value}}', units: '' };
        case 'gauge':
          return { title: 'Medidor', value: '{{meuSensor.value}}', min: 0, max: 100, units: '' };
        case 'sparkline':
          return { title: 'Tendência', dataset: 'obsat_altitude', limitPoints: 30 };
        case 'pointer':
          return { title: 'Direção', value: '{{meuSensor.value}}', min: 0, max: 360, units: '°' };
        case 'picture':
          return { title: 'Imagem', imageUrl: '{{minhaCamera.value}}' };
        case 'indicator_light':
          return { title: 'Status', value: '{{meuSensor.value}}', threshold: '' };
        case 'html':
          return { title: 'HTML Livre', html: '<b>{{meuSensor.value}}</b>' };
        case 'actuator':
          return { title: 'Atuador', defaultValue: 0, sendUrl: 'http://192.168.4.1/set?v={{value}}' };
        case 'slider':
          return { title: 'Controle Deslizante', min: 0, max: 100, defaultValue: 0, sendUrl: 'http://192.168.4.1/set?v={{value}}' };
        case 'hgauge':
          return { title: 'Medidor Linear', value: '{{meuSensor.value}}', min: 0, max: 100, units: '' };
        default:
          return {};
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
      this.setupIotBridge();
    }

    setupIotBridge() {
      const input = document.getElementById('iotEquipeInput');
      if (!input) return;

      // Por padrão já vem preenchido com o token deste próprio navegador
      // (o mesmo embutido no código Python pelos blocos IoT) — nenhuma
      // digitação é necessária no caso comum. Editar o campo só é preciso
      // para acompanhar a sessão de outra pessoa/computador.
      input.value = IotBridge.getToken();
      input.onchange = () => {
        IotBridge.setToken(input.value);
        if (IotBridge.getToken()) {
          IotBridge.start();
        }
      };

      IotBridge.start();
    }

    // Acrescenta ao datalist do editor de widget os canais reais já descobertos
    // pela ponte IoT (além dos datasets padrão OBSAT já cadastrados no HTML),
    // para o aluno escolher em vez de ter que lembrar o nome exato do canal.
    refreshDatasetOptions() {
      const datalist = document.getElementById('widgetDatasetOptions');
      if (!datalist) return;

      const existentes = new Set(Array.from(datalist.options).map(o => o.value));
      IotBridge.getKnownChannels().forEach(canal => {
        if (existentes.has(canal)) return;
        const opt = document.createElement('option');
        opt.value = canal;
        opt.innerText = `${canal} (canal IoT ao vivo)`;
        datalist.appendChild(opt);
      });
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

    // Empacota o layout do Painel IOT (nomes de workspace, widgets e suas
    // configurações) para ser embutido no arquivo de projeto .satblocks.
    // Deliberadamente NÃO inclui o histórico de telemetria (datastorage:*):
    // dados de voo já gravados pertencem à exportação de CSV, não ao
    // arquivo de código-fonte do projeto.
    exportProjectData() {
      const streams = {};
      Object.keys(this.workspaces).forEach(wkspUid => {
        const streamUids = JSON.parse(localStorage.getItem(`workspace:${wkspUid}`) || '[]');
        streamUids.forEach(uid => {
          const raw = localStorage.getItem(`stream:${uid}`);
          if (raw) streams[uid] = JSON.parse(raw);
        });
      });

      return {
        workspaces: this.workspaces,
        workspaceStreamLists: Object.keys(this.workspaces).reduce((acc, wkspUid) => {
          acc[wkspUid] = JSON.parse(localStorage.getItem(`workspace:${wkspUid}`) || '[]');
          return acc;
        }, {}),
        streams: streams,
        currentUid: this.currentUid,
        datasources: Datasources.exportDefinitions()
      };
    }

    // Restaura o layout do Painel IOT a partir de um projeto .satblocks
    // carregado. Substitui os workspaces atuais (não faz merge) para o
    // painel refletir exatamente o que foi salvo naquele projeto.
    importProjectData(data) {
      if (!data || typeof data !== 'object') return;

      try {
        Object.keys(this.workspaces).forEach(wkspUid => {
          localStorage.removeItem(`workspace:${wkspUid}`);
        });

        this.workspaces = data.workspaces || {};
        localStorage.setItem('bipes_workspaces', JSON.stringify(this.workspaces));

        Object.keys(data.workspaceStreamLists || {}).forEach(wkspUid => {
          localStorage.setItem(`workspace:${wkspUid}`, JSON.stringify(data.workspaceStreamLists[wkspUid]));
        });
        Object.keys(data.streams || {}).forEach(uid => {
          localStorage.setItem(`stream:${uid}`, JSON.stringify(data.streams[uid]));
        });
        if (data.datasources) {
          Datasources.importDefinitions(data.datasources);
        }

        this.currentUid = (data.currentUid && this.workspaces[data.currentUid]) ? data.currentUid : Object.keys(this.workspaces)[0];
        if (!this.currentUid) {
          this.workspaces['obsat_mission'] = 'Missão OBSAT 2026 (Padrão)';
          localStorage.setItem('bipes_workspaces', JSON.stringify(this.workspaces));
          this.currentUid = 'obsat_mission';
          this.createObsatPresetWidgets(this.currentUid);
        }
        localStorage.setItem('currentWorkspace', this.currentUid);

        this.updateWorkspaceSelect();
        if (GridInstance) GridInstance.init(this.currentUid);
      } catch (e) {
        console.warn('[Painel IOT] Erro ao importar layout do projeto:', e);
      }
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

      this.refreshDatasetOptions();

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

            prefillWidgetFields(parsed.type || 'chart', parsed.setup || {});
          } catch (e) {}
        }
      } else {
        if (titleEl) titleEl.innerText = '➕ Novo Widget do Databoard';
        if (typeSel) {
          typeSel.value = 'chart';
          typeSel.dispatchEvent(new Event('change'));
        }
        prefillWidgetFields('chart', (GridInstance && GridInstance.getDefaultSetup('chart')) || {});
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
          const setup = collectWidgetFields(type);
          if (!setup.title) setup.title = WIDGET_ICONS[type] ? `Novo ${type}` : 'Widget';

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
        widgetTypeSel.onchange = (e) => showWidgetFieldGroup(e.target.value);
      }

      this.setupDatasourcesModal();

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

    setupDatasourcesModal() {
      const btnOpen = document.getElementById('btnOpenDatasourcesManager');
      const modal = document.getElementById('modalDatasourcesOverlay');
      if (btnOpen && modal) {
        btnOpen.onclick = () => {
          this.renderDatasourcesList();
          modal.style.display = 'flex';
        };
      }

      const dsTypeSel = document.getElementById('dsTypeSelect');
      if (dsTypeSel) {
        dsTypeSel.onchange = (e) => {
          const isIot = e.target.value === 'iot_channel';
          document.getElementById('dsIotChannelFields').style.display = isIot ? 'block' : 'none';
          document.getElementById('dsJsonHttpFields').style.display = isIot ? 'none' : 'flex';
        };
      }

      const btnAdd = document.getElementById('btnAddDatasource');
      if (btnAdd) {
        btnAdd.onclick = () => {
          const name = document.getElementById('dsNameInput').value.trim().replace(/[^\w]/g, '');
          const type = document.getElementById('dsTypeSelect').value;
          if (!name) { alert('Digite um nome válido para o Datasource (sem espaços ou símbolos).'); return; }

          const config = type === 'iot_channel'
            ? { canal: document.getElementById('dsIotCanal').value.trim() }
            : { url: document.getElementById('dsJsonUrl').value.trim(), refreshMs: document.getElementById('dsJsonInterval').value };

          if (type === 'iot_channel' && !config.canal) { alert('Informe o canal IoT.'); return; }
          if (type === 'json_http' && !config.url) { alert('Informe a URL do JSON.'); return; }

          Datasources.add(name, type, config);
          this.renderDatasourcesList();
          document.getElementById('dsNameInput').value = '';
          document.getElementById('dsIotCanal').value = '';
          document.getElementById('dsJsonUrl').value = '';

          if (window.SatFiles && window.SatFiles.showDriverToast) {
            window.SatFiles.showDriverToast(`🔌 Datasource "${name}" criado!`);
          }
        };
      }
    }

    renderDatasourcesList() {
      const listEl = document.getElementById('datasourcesList');
      if (!listEl) return;
      listEl.innerHTML = '';

      const names = Datasources.list();
      if (names.length === 0) {
        listEl.innerHTML = '<div style="padding: 14px; text-align: center; color: #94a3b8; font-size: 12px;">Nenhum Datasource criado ainda.</div>';
        return;
      }

      names.forEach(name => {
        const def = Datasources.getDefinition(name);
        const summary = def.type === 'iot_channel' ? `canal: ${def.config.canal}` : `JSON: ${def.config.url}`;
        const row = document.createElement('div');
        row.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #f8fafc; border: 1px solid var(--border-color); border-radius: 8px;';
        row.innerHTML = `
          <div>
            <span style="font-weight: 800; font-size: 13px; color: #0f172a;">{{${name}}}</span>
            <span style="font-size: 11px; color: #64748b; margin-left: 8px;">${summary}</span>
          </div>
          <button class="sat-btn danger btn-del-ds-src" style="padding: 4px 8px; font-size: 11px;">🗑️</button>
        `;
        row.querySelector('.btn-del-ds-src').onclick = () => {
          Datasources.remove(name);
          this.renderDatasourcesList();
        };
        listEl.appendChild(row);
      });
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
      const timestampMs = Date.now();

      // Atualiza pílula de status na interface
      const pill = document.getElementById('databoardTelemetryStatus');
      const text = document.getElementById('telemetryStatusText');
      if (pill && text) {
        pill.classList.add('receiving');
        const eqInfo = data.equipe !== undefined ? ` (Eq. ${data.equipe})` : '';
        text.innerText = `● Recebendo via USB/BLE #${packetCounter}${eqInfo}`;

        if (statusResetTimer) clearTimeout(statusResetTimer);
        statusResetTimer = setTimeout(() => {
          pill.classList.remove('receiving');
          text.innerText = 'Aguardando Satélite (USB/BLE)';
        }, 4000);
      }

      // Ingestão no motor de séries temporais DataStorage (alimenta os gráficos em tempo real)
      if (data.temperatura !== undefined && !isNaN(parseFloat(data.temperatura))) {
        const v = parseFloat(parseFloat(data.temperatura).toFixed(2));
        DataStorage.push('obsat_temperatura', [timestampMs, v]);
        forwardScalarToIotChannel(data.equipe, 'obsat_temperatura', v);
      }

      if (data.pressao !== undefined && !isNaN(parseFloat(data.pressao))) {
        const v = parseFloat(parseFloat(data.pressao).toFixed(2));
        DataStorage.push('obsat_pressao', [timestampMs, v]);
        forwardScalarToIotChannel(data.equipe, 'obsat_pressao', v);
      }

      if (data.altitude !== undefined && !isNaN(parseFloat(data.altitude))) {
        const v = parseFloat(parseFloat(data.altitude).toFixed(1));
        DataStorage.push('obsat_altitude', [timestampMs, v]);
        forwardScalarToIotChannel(data.equipe, 'obsat_altitude', v);
      } else if (data.pressao !== undefined && !isNaN(parseFloat(data.pressao))) {
        // Estimativa barométrica alternativa caso o campo direto não venha
        const p = parseFloat(data.pressao);
        if (p > 100 && p < 1200) {
          const alt = 44330 * (1 - Math.pow(p / 1013.25, 0.1903));
          const v = parseFloat(alt.toFixed(1));
          DataStorage.push('obsat_altitude', [timestampMs, v]);
          forwardScalarToIotChannel(data.equipe, 'obsat_altitude', v);
        }
      }

      if (data.bateria !== undefined && !isNaN(parseFloat(data.bateria))) {
        const v = parseFloat(parseFloat(data.bateria).toFixed(1));
        DataStorage.push('obsat_bateria', [timestampMs, v]);
        forwardScalarToIotChannel(data.equipe, 'obsat_bateria', v);
      }

      if (Array.isArray(data.giroscopio) && data.giroscopio.length >= 3) {
        DataStorage.push('obsat_giroscopio', [timestampMs, data.giroscopio[0], data.giroscopio[1], data.giroscopio[2]]);
      } else if (typeof data.giroscopio === 'number') {
        DataStorage.push('obsat_giroscopio', [timestampMs, 0, 0, data.giroscopio]);
      } else if (data.giroscopio && typeof data.giroscopio === 'object') {
        DataStorage.push('obsat_giroscopio', [timestampMs, data.giroscopio.x || 0, data.giroscopio.y || 0, data.giroscopio.z || 0]);
      }

      if (Array.isArray(data.acelerometro) && data.acelerometro.length >= 3) {
        DataStorage.push('obsat_acelerometro', [timestampMs, data.acelerometro[0], data.acelerometro[1], data.acelerometro[2]]);
      } else if (typeof data.acelerometro === 'number') {
        DataStorage.push('obsat_acelerometro', [timestampMs, 0, 0, data.acelerometro]);
      } else if (data.acelerometro && typeof data.acelerometro === 'object') {
        DataStorage.push('obsat_acelerometro', [timestampMs, data.acelerometro.x || 0, data.acelerometro.y || 0, data.acelerometro.z || 0]);
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
    IotBridge: IotBridge,
    Datasources: Datasources,
    processIncomingTelemetry: processIncomingTelemetry
  };

})();
