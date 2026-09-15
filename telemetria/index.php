<?php
require_once __DIR__ . '/db_config.php';

$dadosIniciais = [];
if ($con) {
    // Limpeza automática de pacotes com mais de 1 hora
    $con->query("DELETE FROM satblocks_telemetria WHERE datetimea < NOW() - INTERVAL 1 HOUR");

    $res = $con->query("SELECT * FROM satblocks_telemetria ORDER BY id DESC LIMIT 100");
    if ($res) {
        while ($row = $res->fetch_assoc()) {
            $payload = json_decode($row['payload'] ?? '{}', true) ?: [];
            $altitude = is_array($payload) ? ($payload['altitude'] ?? null) : null;
            $dt = !empty($row['datetimea']) ? date('d/m/Y H:i:s', strtotime($row['datetimea'])) : date('d/m/Y H:i:s');
            $dadosIniciais[] = [
                "id" => intval($row['id']),
                "timestamp" => $dt,
                "hora_iso" => date('c', strtotime($row['datetimea'] ?? 'now')),
                "ip_origem" => "Satélite",
                "equipe" => $row['equipe'],
                "temperatura" => $row['temperatura'],
                "pressao" => $row['pressao'],
                "bateria" => $row['bateria'],
                "altitude" => $altitude,
                "giroscopio" => json_decode($row['giroscopio'] ?? '[0,0,0]', true) ?: [0,0,0],
                "acelerometro" => json_decode($row['acelerometro'] ?? '[0,0,0]', true) ?: [0,0,0],
                "payload" => $payload,
                "payload_raw" => $row['payload'],
                "tamanho" => intval($row['tamanho'] ?? 0),
                "statuse" => $row['statuse'] ?? 'Sucesso!',
                "raw" => $row
            ];
        }
    }
} else {
    // Leitura em Modo Contingência Offline (telemetria_db.json)
    $jsonFile = file_exists(__DIR__ . '/telemetria_db.json') ? (__DIR__ . '/telemetria_db.json') : (__DIR__ . '/../telemetria_db.json');
    if (file_exists($jsonFile)) {
        $rawJson = @file_get_contents($jsonFile);
        $items = json_decode($rawJson, true) ?: [];
        $dadosIniciais = array_slice($items, 0, 100);
    }
}
$dadosIniciaisJson = json_encode($dadosIniciais, JSON_UNESCAPED_UNICODE);
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Servidor de Testes de Telemetria — SatBlocks OBSAT 2026 🚀</title>
  
  <!-- Favicon Oficial com Ícone do Satélite -->
  <link rel="icon" type="image/x-icon" href="/satblocks/media/favicon.ico">
  <link rel="shortcut icon" href="/satblocks/media/favicon.ico">
  <link rel="icon" type="image/svg+xml" href="/satblocks/media/satellite.svg">
  <link rel="apple-touch-icon" href="/satblocks/media/satellite_icon.png">

  <!-- Fontes Google Inter e JetBrains Mono -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  
  <!-- Chart.js Offline Local (com fallback resiliente para ambiente sem internet) -->
  <script src="chart.umd.min.js"></script>
  <script>
    if (typeof Chart === 'undefined') {
      document.write('<script src="../core/chart.umd.min.js"><\/script>');
    }
  </script>

  <style>
    :root {
      /* Paleta Oficial OBSAT / SatBlocks */
      --obsat-pink: #e11d48;
      --obsat-pink-hover: #be123c;
      --obsat-pink-light: rgba(225, 29, 72, 0.08);
      --obsat-pink-border: rgba(225, 29, 72, 0.3);

      --obsat-blue: #0284c7;
      --obsat-blue-hover: #0369a1;
      --obsat-blue-light: rgba(2, 132, 199, 0.08);
      --obsat-blue-border: rgba(2, 132, 199, 0.3);

      --bg-space: #f8fafc;
      --bg-surface: #ffffff;
      --bg-card: #ffffff;
      --border-color: #e2e8f0;
      --border-focus: #38bdf8;

      --text-main: #0f172a;
      --text-secondary: #334155;
      --text-muted: #64748b;

      --accent-green: #059669;
      --accent-amber: #d97706;
      --accent-red: #ef4444;

      --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      --font-mono: 'JetBrains Mono', "Courier New", Courier, monospace;

      --shadow-sm: 0 1px 3px rgba(0,0,0,0.05);
      --shadow-md: 0 4px 12px rgba(15, 23, 42, 0.05);
      --shadow-lg: 0 10px 25px rgba(15, 23, 42, 0.08);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: var(--font-sans);
      background-color: var(--bg-space);
      color: var(--text-main);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    /* TOPBAR OFICIAL SATBLOCKS */
    header.sat-topbar {
      background: var(--bg-surface);
      border-bottom: 1px solid var(--border-color);
      height: 62px;
      padding: 0 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: var(--shadow-sm);
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .brand-container {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .satblock-logo-badge {
      width: 32px;
      height: 32px;
      background: #0f172a;
      border: 2px solid #38bdf8;
      border-radius: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 6px rgba(56, 189, 248, 0.25);
    }

    .satblock-brand {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      text-decoration: none;
      user-select: none;
    }

    .sat-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #ffffff;
      color: #334155;
      border: 1px solid #cbd5e1;
      padding: 7px 14px;
      border-radius: 8px;
      font-size: 12.5px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
      box-shadow: var(--shadow-sm);
    }

    .sat-btn:hover {
      background: #f1f5f9;
      border-color: #94a3b8;
      color: #0f172a;
    }

    .sat-btn.primary {
      background: linear-gradient(135deg, #0284c7, #2563eb);
      color: #ffffff;
      border: none;
      box-shadow: 0 2px 8px rgba(2, 132, 199, 0.3);
    }

    .sat-btn.primary:hover {
      box-shadow: 0 4px 12px rgba(2, 132, 199, 0.45);
      transform: translateY(-1px);
    }

    /* ENDPOINT PILL */
    .endpoint-box {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 10px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
      gap: 12px;
      box-shadow: var(--shadow-sm);
    }

    .endpoint-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #0f172a;
      color: #38bdf8;
      padding: 6px 14px;
      border-radius: 8px;
      font-family: var(--font-mono);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      border: 1px solid #1e293b;
      user-select: all;
    }

    .endpoint-pill:hover {
      border-color: #38bdf8;
      box-shadow: 0 0 10px rgba(56, 189, 248, 0.3);
    }

    .live-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 8px #10b981;
      animation: pulseDot 1.5s infinite;
    }

    @keyframes pulseDot {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
    }

    main {
      max-width: 1440px;
      width: 100%;
      margin: 0 auto;
      padding: 24px;
      flex: 1;
    }

    /* ABAS DE NAVEGAÇÃO */
    .telemetry-tabs-nav {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 20px;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 2px;
    }

    .tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      border-radius: 10px 10px 0 0;
      font-size: 13.5px;
      font-weight: 800;
      color: var(--text-muted);
      background: transparent;
      border: none;
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;
      bottom: -2px;
      border-bottom: 3px solid transparent;
    }

    .tab-btn:hover {
      color: var(--text-main);
      background: rgba(241, 245, 249, 0.7);
    }

    .tab-btn.active {
      color: var(--obsat-blue);
      border-bottom: 3px solid var(--obsat-blue);
      background: #ffffff;
    }

    .tab-btn.tab-errors.active {
      color: var(--obsat-pink);
      border-bottom: 3px solid var(--obsat-pink);
    }

    .tab-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 2px 7px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 800;
      font-family: var(--font-mono);
    }

    .tab-badge.green {
      background: rgba(5, 150, 105, 0.12);
      color: #059669;
      border: 1px solid rgba(5, 150, 105, 0.3);
    }

    .tab-badge.red {
      background: rgba(225, 29, 72, 0.12);
      color: #e11d48;
      border: 1px solid rgba(225, 29, 72, 0.3);
    }

    /* GRIDS E CARDS */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .charts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
      gap: 20px;
      margin-bottom: 24px;
    }

    @media (max-width: 900px) {
      .charts-grid {
        grid-template-columns: 1fr;
      }
    }

    .sat-card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 14px;
      padding: 18px 20px;
      box-shadow: var(--shadow-md);
      transition: box-shadow 0.2s, transform 0.2s;
    }

    .sat-card:hover {
      box-shadow: var(--shadow-lg);
    }

    .card-header-clean {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 12.5px;
      font-weight: 700;
      color: var(--text-muted);
      margin-bottom: 8px;
      text-transform: none;
      letter-spacing: 0.2px;
    }

    .card-value {
      font-size: 26px;
      font-weight: 900;
      font-family: var(--font-mono);
      color: var(--text-main);
      margin-bottom: 4px;
    }

    .card-sub {
      font-size: 11.5px;
      color: var(--text-muted);
    }

    .chart-container {
      height: 240px;
      width: 100%;
      position: relative;
    }

    /* TABELAS */
    .table-container {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 14px;
      overflow: hidden;
      box-shadow: var(--shadow-md);
      margin-bottom: 30px;
    }

    .table-header {
      padding: 16px 20px;
      background: #f8fafc;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
    }

    .table-responsive {
      width: 100%;
      overflow-x: auto;
    }

    table.sat-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 13px;
    }

    table.sat-table th {
      background: #f1f5f9;
      color: #475569;
      font-weight: 700;
      padding: 12px 16px;
      border-bottom: 1px solid var(--border-color);
      white-space: nowrap;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.5px;
    }

    table.sat-table td {
      padding: 12px 16px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
      white-space: nowrap;
    }

    table.sat-table tr:hover td {
      background-color: #f8fafc;
    }

    .badge-team {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: var(--obsat-pink-light);
      color: var(--obsat-pink);
      border: 1px solid var(--obsat-pink-border);
      padding: 3px 8px;
      border-radius: 6px;
      font-weight: 800;
      font-family: var(--font-mono);
      font-size: 11px;
    }

    .badge-status-ok {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: rgba(16, 185, 129, 0.12);
      color: #059669;
      border: 1px solid rgba(16, 185, 129, 0.3);
      padding: 3px 8px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 11px;
    }

    .badge-status-err {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: rgba(239, 68, 68, 0.12);
      color: #dc2626;
      border: 1px solid rgba(239, 68, 68, 0.3);
      padding: 3px 8px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 11px;
    }

    .payload-badge {
      max-width: 220px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      display: block;
      font-family: var(--font-mono);
      font-size: 11px;
      background: #f1f5f9;
      padding: 3px 6px;
      border-radius: 4px;
      color: #475569;
    }

    .btn-inspect {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      color: #334155;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 11.5px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s;
    }

    .btn-inspect:hover {
      background: #0284c7;
      color: #ffffff;
      border-color: #0284c7;
    }

    /* MODAL DE INSPEÇÃO */
    .sat-modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .sat-modal {
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 16px;
      max-width: 720px;
      width: 100%;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
      color: #f8fafc;
      overflow: hidden;
      animation: modalFadeIn 0.2s ease-out;
    }

    @keyframes modalFadeIn {
      from { opacity: 0; transform: scale(0.96); }
      to { opacity: 1; transform: scale(1); }
    }

    .sat-modal-header {
      padding: 16px 20px;
      background: #1e293b;
      border-bottom: 1px solid #334155;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .sat-modal-header h3 {
      font-size: 15px;
      font-weight: 800;
      color: #38bdf8;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .sat-modal-close {
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 20px;
      cursor: pointer;
      padding: 4px;
      border-radius: 6px;
    }

    .sat-modal-close:hover {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.1);
    }

    .sat-modal-body {
      padding: 20px;
      max-height: 70vh;
      overflow-y: auto;
    }

    .diag-box {
      border-radius: 10px;
      padding: 14px 16px;
      margin-bottom: 16px;
      font-size: 13px;
    }

    .diag-box.success {
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.35);
      color: #4ade80;
    }

    .diag-box.error {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #f87171;
    }

    .payload-viewer {
      background: #020617;
      border: 1px solid #1e293b;
      border-radius: 8px;
      padding: 14px;
      font-family: var(--font-mono);
      font-size: 12px;
      color: #38bdf8;
      white-space: pre-wrap;
      word-break: break-all;
      max-height: 260px;
      overflow-y: auto;
    }

    .sat-modal-footer {
      padding: 12px 20px;
      background: #1e293b;
      border-top: 1px solid #334155;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }

    footer {
      padding: 24px;
      border-top: 1px solid var(--border-color);
      background: var(--bg-surface);
      text-align: center;
      font-size: 12px;
      color: var(--text-muted);
      margin-top: auto;
    }
  </style>
</head>
<body>

  <!-- TOPBAR OFICIAL SATBLOCKS -->
  <header class="sat-topbar">
    <div class="sat-topbar-left" style="display: flex; align-items: center; gap: 10px; white-space: nowrap; flex-shrink: 0;">
      <a href="/satblocks/" class="satblock-brand" style="display: inline-flex; align-items: center; gap: 8px; cursor: pointer; text-decoration: none;">
        <!-- ÍCONE .ICO DO SATÉLITE ESTILO SANCABOT (CUBESAT AEROESPACIAL) -->
        <div class="satblock-logo-badge" style="width: 32px; height: 32px; background: #0f172a; border: 2px solid #38bdf8; border-radius: 9px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(56, 189, 248, 0.25);">
          <img src="/satblocks/media/favicon.ico" alt="SatBlocks" style="width: 20px; height: 20px; object-fit: contain;">
        </div>

        <!-- TEXTO SATBLOCKS NO ESTILO SANCABOT -->
        <div style="display: inline-flex; align-items: baseline; gap: 2px;">
          <span style="font-size: 19px; font-weight: 900; color: #0f172a; letter-spacing: -0.6px; font-family: 'Inter', -apple-system, sans-serif;">Sat</span><span style="font-size: 19px; font-weight: 900; color: #0284c7; letter-spacing: -0.6px; font-family: 'Inter', -apple-system, sans-serif;">Blocks</span>
          <span style="font-size: 13px; font-weight: 700; color: #64748b; margin-left: 6px; margin-right: 4px; font-style: italic; font-family: 'Inter', -apple-system, sans-serif;">by</span>
        </div>

        <!-- SÍMBOLO OFICIAL DO BIPES (VETOR OFICIAL DOS 4 BLOCOS) -->
        <div class="bipes-logo-official" title="Plataforma BIPES Oficial" style="display: inline-flex; align-items: center; justify-content: center; background: rgba(50, 152, 220, 0.1); border: 1.5px solid rgba(50, 152, 220, 0.35); padding: 4px 6px; border-radius: 8px;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#3298dc">
            <path d="m 16.66,4.52 2.83,2.83 -2.83,-2.83 2.83,-2.83 M 9,5 V 9 H 5 V 5 h 4 m 10,10 v 4 h -4 v -4 h 4 M 9,15 v 4 H 5 V 15 H 9 M 16.66,1.69 11,7.34 16.66,13 22.32,7.34 Z M 11,3 H 3 v 8 h 8 z m 10,10 h -8 v 8 h 8 z M 11,13 H 3 v 8 h 8 z"/>
          </svg>
        </div>
      </a>
      <span class="tag-obsat" style="background: linear-gradient(135deg, var(--obsat-pink), #db2777); color: #ffffff; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; box-shadow: 0 2px 6px rgba(225, 29, 72, 0.25); font-family: 'Inter', -apple-system, sans-serif;">
        Servidor de Testes
      </span>
    </div>

    <div style="display: flex; align-items: center; gap: 12px;">
      <a href="/satblocks/" class="sat-btn primary" title="Abrir a IDE SatBlocks" target="_blank">
        <span>🚀</span> Abrir SatBlocks IDE
      </a>
    </div>
  </header>

  <!-- CONTEÚDO PRINCIPAL -->
  <main>

    <!-- BOX DO ENDPOINT OFICIAL DE POST -->
    <div class="endpoint-box">
      <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
        <span style="font-size: 13px; font-weight: 700; color: #334155;">📡 Endpoint Oficial de Transmissão (POST):</span>
        <div class="endpoint-pill" id="endpointPill" title="Clique para copiar a URL POST de telemetria" onclick="copiarEndpoint()">
          <div class="live-dot"></div>
          <span id="endpointUrlText">POST https://obsat.org.br/satblocks/telemetria/salvar_telemetria.php</span>
          <span id="copyFeedback" style="font-size: 11px; color: #4ade80; display: none; margin-left: 6px; font-weight: 700;">✓ Copiado!</span>
        </div>
      </div>
      <button class="sat-btn" onclick="copiarEndpoint()" title="Copiar URL para o script do satélite">📋 Copiar Link</button>
    </div>

    <!-- NAVEGAÇÃO ENTRE ABAS -->
    <div class="telemetry-tabs-nav">
      <button class="tab-btn active" id="tabBtnValidos" onclick="switchTab('validos')">
        <span>📡 Telemetria Válida / Ao Vivo</span>
        <span class="tab-badge green" id="badgeCountValidos">0</span>
      </button>
      <button class="tab-btn tab-errors" id="tabBtnErros" onclick="switchTab('erros')">
        <span>⚠️ Falhas & Diagnóstico</span>
        <span class="tab-badge red" id="badgeCountErros">0</span>
      </button>
    </div>

    <!-- ABA 1: TELEMETRIA VÁLIDA -->
    <div id="paneValidos">
      <!-- CARDS RESUMO DE TELEMETRIA -->
      <div class="metrics-grid">
        <div class="sat-card">
          <div class="card-header-clean">
            <span>Última Equipe</span>
            <span>🛰️</span>
          </div>
          <div class="card-value" id="valEquipe">--</div>
          <div class="card-sub" id="valTimestamp">Aguardando pacote...</div>
        </div>

        <div class="sat-card">
          <div class="card-header-clean">
            <span>Temperatura BMP280</span>
            <span>🌡️</span>
          </div>
          <div class="card-value" id="valTemp" style="color: #0284c7;">-- °C</div>
          <div class="card-sub">Sensor Atmosférico I2C</div>
        </div>

        <div class="sat-card">
          <div class="card-header-clean">
            <span>Pressão Atmosférica</span>
            <span>🧭</span>
          </div>
          <div class="card-value" id="valPress" style="color: #059669;">-- hPa</div>
          <div class="card-sub">Nível Barométrico</div>
        </div>

        <div class="sat-card">
          <div class="card-header-clean">
            <span>Altitude Calculada</span>
            <span>🏔️</span>
          </div>
          <div class="card-value" id="valAlt" style="color: #d97706;">-- m</div>
          <div class="card-sub">Acima do nível do mar</div>
        </div>

        <div class="sat-card">
          <div class="card-header-clean">
            <span>Acelerômetro MPU6050</span>
            <span>🎯</span>
          </div>
          <div class="card-value" id="valAccel" style="color: #7c3aed; font-size: 19px;">--</div>
          <div class="card-sub" id="valAccelSub">Aceleração Real [X, Y, Z] m/s²</div>
        </div>

        <div class="sat-card">
          <div class="card-header-clean">
            <span>Giroscópio MPU6050</span>
            <span>🔄</span>
          </div>
          <div class="card-value" id="valGyro" style="color: #db2777; font-size: 19px;">--</div>
          <div class="card-sub" id="valGyroSub">Giro Inercial [X, Y, Z] °/s</div>
        </div>

        <div class="sat-card">
          <div class="card-header-clean">
            <span>Bateria EPS</span>
            <span>🔋</span>
          </div>
          <div class="card-value" id="valBat" style="color: #f59e0b;">-- %</div>
          <div class="card-sub">Alimentação Satélite</div>
        </div>

        <div class="sat-card">
          <div class="card-header-clean">
            <span>Total de Pacotes</span>
            <span>📦</span>
          </div>
          <div class="card-value" id="valTotalPacotes">0</div>
          <div class="card-sub">Registros válidos recebidos</div>
        </div>
      </div>

      <!-- GRÁFICOS AO VIVO -->
      <div class="charts-grid">
        <div class="sat-card">
          <div class="card-header-clean">
            <span style="color: var(--text-main); font-weight: 800;">📈 Histórico de Temperatura (°C)</span>
            <span style="color: #0284c7; font-weight: 700;">Sensor BMP280</span>
          </div>
          <div class="chart-container">
            <canvas id="chartTemp"></canvas>
          </div>
        </div>

        <div class="sat-card">
          <div class="card-header-clean">
            <span style="color: var(--text-main); font-weight: 800;">📊 Histórico de Pressão Barométrica (hPa)</span>
            <span style="color: #059669; font-weight: 700;">Barômetro I2C</span>
          </div>
          <div class="chart-container">
            <canvas id="chartPress"></canvas>
          </div>
        </div>
      </div>

      <!-- TABELA DE TELEMETRIAS VÁLIDAS -->
      <div class="table-container">
        <div class="table-header">
          <div>
            <h2 style="font-size: 15px; font-weight: 800; color: #0f172a;">📡 Pacotes de Telemetria Recebidos</h2>
            <p style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">Atualizado a cada 2s • Tabela isolada exclusiva do SatBlocks</p>
          </div>
          <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 6px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 4px 10px; box-shadow: var(--shadow-sm);">
              <span style="font-size: 13px;">🔍</span>
              <label for="filtroEquipe" style="font-size: 12px; font-weight: 700; color: #475569;">Filtrar:</label>
              <select id="filtroEquipe" onchange="onFiltroEquipeChange(this.value)" style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 4px 8px; font-size: 12px; font-weight: 700; font-family: var(--font-mono); background: #ffffff; color: #0f172a; outline: none; cursor: pointer;">
                <option value="">🛰️ Todas as Equipes</option>
              </select>
              <button id="btnLimparFiltro" onclick="limparFiltroEquipe()" style="display: none; background: #fee2e2; border: 1px solid #fecaca; color: #dc2626; border-radius: 6px; padding: 3px 8px; font-size: 11px; font-weight: 700; cursor: pointer;" title="Remover filtro de equipe">✕ Limpar</button>
            </div>
            <button class="sat-btn" onclick="atualizarDados()">🔄 Atualizar</button>
          </div>
        </div>

        <div class="table-responsive">
          <table class="sat-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Data / Hora</th>
                <th>Equipe</th>
                <th>IP Origem</th>
                <th>Temperatura</th>
                <th>Pressão</th>
                <th>Altitude</th>
                <th>Inercial (MPU6050)</th>
                <th>Bateria</th>
                <th>Payload</th>
                <th>Status</th>
                <th style="text-align: center;">Ações</th>
              </tr>
            </thead>
            <tbody id="telemetriaTableBody">
              <tr>
                <td colspan="10" style="text-align: center; color: var(--text-muted); padding: 32px 16px;">
                  🛰️ Carregando telemetria em tempo real...
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ABA 2: FALHAS & DIAGNÓSTICO -->
    <div id="paneErros" style="display: none;">
      <div class="table-container">
        <div class="table-header" style="background: #fff1f2; border-bottom: 1px solid #fecdd3;">
          <div>
            <h2 style="font-size: 15px; font-weight: 800; color: #9f1239;">⚠️ Registro de Falhas, Erros e Diagnóstico</h2>
            <p style="font-size: 12px; color: #e11d48; margin-top: 2px;">Pacotes com formato incorreto, campos ausentes ou JSON corrompido são diagnosticados aqui.</p>
          </div>
          <button class="sat-btn" onclick="atualizarDados()">🔄 Atualizar</button>
        </div>

        <div class="table-responsive">
          <table class="sat-table">
            <thead>
              <tr style="background: #fff5f5;">
                <th style="width: 80px;">ID</th>
                <th style="width: 120px;">Equipe</th>
                <th style="width: 170px;">Data / Hora</th>
                <th>Diagnóstico do Problema / Causa</th>
                <th style="width: 100px;">Tamanho</th>
                <th style="width: 120px; text-align: center;">Inspeção</th>
              </tr>
            </thead>
            <tbody id="errosTableBody">
              <tr>
                <td colspan="6" style="text-align: center; color: #15803d; padding: 32px 16px;">
                  🛡️ Nenhuma falha de telemetria registrada! Todos os pacotes recebidos estão válidos.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

  </main>

  <!-- MODAL DE INSPEÇÃO JSON -->
  <div class="sat-modal-backdrop" id="modalInspeccao" onclick="fecharModalBackground(event)">
    <div class="sat-modal">
      <div class="sat-modal-header">
        <h3><span>🔬</span> Inspeção do Pacote de Telemetria</h3>
        <button class="sat-modal-close" onclick="fecharModal()" title="Fechar">✕</button>
      </div>
      <div class="sat-modal-body">
        <div class="diag-box" id="modalDiagBox">
          <div style="font-weight: 800; font-size: 14px; margin-bottom: 4px;" id="modalDiagTitle">Status: Sucesso</div>
          <div id="modalDiagText">Pacote validado e gravado com sucesso.</div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; font-size: 12px; color: #94a3b8;">
          <div><strong># Pacote:</strong> <span id="modalId" style="color: #ffffff;">--</span></div>
          <div><strong>Equipe:</strong> <span id="modalEquipe" style="color: #ffffff;">--</span></div>
          <div><strong>Data/Hora:</strong> <span id="modalDt" style="color: #ffffff;">--</span></div>
          <div><strong>Tamanho:</strong> <span id="modalTam" style="color: #ffffff;">--</span></div>
        </div>

        <div style="margin-bottom: 6px; font-size: 12px; font-weight: 700; color: #cbd5e1;">📄 Payload / JSON Transmitido:</div>
        <div class="payload-viewer" id="modalPayloadViewer">{}</div>

        <div id="modalPhotoPreviewContainer" style="display: none; margin-top: 14px; background: #020617; border: 1px solid #1e293b; border-radius: 8px; padding: 12px; text-align: center;">
          <div style="font-size: 12px; font-weight: 700; color: #38bdf8; margin-bottom: 8px; text-align: left; display: flex; justify-content: space-between; align-items: center;">
            <span>📷 Fotografia Espacial Decodificada (JPEG):</span>
            <a id="modalDownloadPhotoLink" href="#" download="foto_espacial.jpg" class="sat-btn" style="padding: 4px 10px; font-size: 11px; text-decoration: none; color: #38bdf8; border-color: #38bdf8;">💾 Baixar Imagem (.jpg)</a>
          </div>
          <img id="modalPhotoImg" src="" alt="Foto Espacial" style="max-height: 280px; max-width: 100%; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.5); cursor: pointer;" onclick="window.open(this.src)" title="Clique para abrir imagem em nova aba em resolução total" />
        </div>
      </div>
      <div class="sat-modal-footer">
        <button class="sat-btn" onclick="copiarPayloadModal()">📋 Copiar JSON</button>
        <button class="sat-btn primary" onclick="fecharModal()">Fechar</button>
      </div>
    </div>
  </div>

  <footer>
    Plataforma de Simulação de Voo e Testes OBSAT • SatBlocks by BIPES • Servidor Oficial Dedicado
  </footer>

  <!-- SCRIPT DE ATUALIZAÇÃO E GRÁFICOS -->
  <script>
    const CORES_PALETA = [
      { border: '#0284c7', bg: 'rgba(2, 132, 199, 0.12)' },   // Azul SatBlocks
      { border: '#e11d48', bg: 'rgba(225, 29, 72, 0.12)' },   // Rosa OBSAT
      { border: '#059669', bg: 'rgba(5, 150, 105, 0.12)' },   // Verde Esmeralda
      { border: '#d97706', bg: 'rgba(217, 119, 6, 0.12)' },   // Âmbar
      { border: '#7c3aed', bg: 'rgba(124, 58, 237, 0.12)' },  // Roxo
      { border: '#db2777', bg: 'rgba(219, 39, 119, 0.12)' },  // Pink
      { border: '#0891b2', bg: 'rgba(8, 145, 178, 0.12)' },   // Ciano
      { border: '#65a30d', bg: 'rgba(101, 163, 13, 0.12)' },  // Lima
      { border: '#ea580c', bg: 'rgba(234, 88, 12, 0.12)' },   // Laranja
      { border: '#4f46e5', bg: 'rgba(79, 70, 229, 0.12)' }    // Índigo
    ];

    let chartTemp = null;
    let chartPress = null;
    let equipeFiltroAtual = '';
    let historicoCompleto = <?php echo !empty($dadosIniciaisJson) ? $dadosIniciaisJson : '[]'; ?>;
    let abaAtual = 'validos';

    function getCorEquipe(index) {
      return CORES_PALETA[index % CORES_PALETA.length];
    }

    function initCharts() {
      const commonLegend = {
        display: true,
        position: 'top',
        align: 'end',
        labels: {
          boxWidth: 10,
          boxHeight: 10,
          usePointStyle: true,
          pointStyle: 'circle',
          font: { family: "'Inter', sans-serif", size: 11, weight: '700' },
          color: '#334155',
          padding: 10
        }
      };

      const commonScales = {
        x: { grid: { color: '#f1f5f9' }, ticks: { color: '#64748b', font: { size: 10 } } },
        y: { grid: { color: '#e2e8f0' }, ticks: { color: '#64748b', font: { size: 10 } } }
      };

      const ctxTemp = document.getElementById('chartTemp').getContext('2d');
      chartTemp = new Chart(ctxTemp, {
        type: 'line',
        data: { labels: [], datasets: [] },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          scales: commonScales,
          plugins: { legend: commonLegend }
        }
      });

      const ctxPress = document.getElementById('chartPress').getContext('2d');
      chartPress = new Chart(ctxPress, {
        type: 'line',
        data: { labels: [], datasets: [] },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          scales: commonScales,
          plugins: { legend: commonLegend }
        }
      });
    }

    function switchTab(tab) {
      abaAtual = tab;
      const btnValidos = document.getElementById('tabBtnValidos');
      const btnErros = document.getElementById('tabBtnErros');
      const paneValidos = document.getElementById('paneValidos');
      const paneErros = document.getElementById('paneErros');

      if (tab === 'validos') {
        btnValidos.classList.add('active');
        btnErros.classList.remove('active');
        paneValidos.style.display = 'block';
        paneErros.style.display = 'none';
      } else {
        btnValidos.classList.remove('active');
        btnErros.classList.add('active');
        paneValidos.style.display = 'none';
        paneErros.style.display = 'block';
      }
    }

    function getEndpointUrl() {
      if (window.location.protocol === 'file:') {
        return 'https://obsat.org.br/satblocks/telemetria/salvar_telemetria.php';
      }
      const origin = window.location.origin;
      const path = window.location.pathname.replace(/\/index\.(php|html)?$/i, '').replace(/\/+$/, '');
      return `${origin}${path}/salvar_telemetria.php`;
    }

    function copiarEndpoint() {
      const fullUrl = getEndpointUrl();
      navigator.clipboard.writeText(fullUrl).then(() => {
        const fb = document.getElementById('copyFeedback');
        if (fb) {
          fb.style.display = 'inline';
          setTimeout(() => { fb.style.display = 'none'; }, 2500);
        }
      }).catch(() => {
        prompt('Copie a URL de telemetria:', fullUrl);
      });
    }

    function atualizarEndpointPillText() {
      const el = document.getElementById('endpointUrlText');
      if (el) {
        el.textContent = 'POST ' + getEndpointUrl();
      }
    }

    function atualizarSelectEquipes(dados) {
      const select = document.getElementById('filtroEquipe');
      if (!select) return;

      const equipesUnicas = [...new Set(dados.filter(d => !isErro(d)).map(d => String(d.equipe || '').trim()).filter(Boolean))];
      equipesUnicas.sort((a, b) => {
        const numA = parseInt(a, 10);
        const numB = parseInt(b, 10);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.localeCompare(b);
      });

      const valorSelecionado = select.value;
      select.innerHTML = '<option value="">🛰️ Todas as Equipes</option>';

      equipesUnicas.forEach(eq => {
        const opt = document.createElement('option');
        opt.value = eq;
        opt.textContent = `Equipe ${eq}`;
        if (String(eq) === String(valorSelecionado || equipeFiltroAtual)) {
          opt.selected = true;
        }
        select.appendChild(opt);
      });
    }

    function onFiltroEquipeChange(valor) {
      equipeFiltroAtual = valor;
      const btnLimpar = document.getElementById('btnLimparFiltro');
      if (btnLimpar) {
        btnLimpar.style.display = equipeFiltroAtual ? 'inline-block' : 'none';
      }
      renderizarDados();
    }

    function filtrarPorEquipe(equipe) {
      equipeFiltroAtual = String(equipe);
      const select = document.getElementById('filtroEquipe');
      if (select) select.value = equipeFiltroAtual;
      const btnLimpar = document.getElementById('btnLimparFiltro');
      if (btnLimpar) btnLimpar.style.display = 'inline-block';
      renderizarDados();
    }

    function limparFiltroEquipe() {
      equipeFiltroAtual = '';
      const select = document.getElementById('filtroEquipe');
      if (select) select.value = '';
      const btnLimpar = document.getElementById('btnLimparFiltro');
      if (btnLimpar) btnLimpar.style.display = 'none';
      renderizarDados();
    }

    function isErro(p) {
      if (!p.statuse) return false;
      const s = String(p.statuse).toLowerCase();
      return s.startsWith('erro') || s.includes('falta') || s.includes('invalido') || s.includes('inválido');
    }

    function renderizarDados() {
      const validos = historicoCompleto.filter(p => !isErro(p));
      const erros = historicoCompleto.filter(p => isErro(p));

      // Atualiza badges contadores
      document.getElementById('badgeCountValidos').textContent = validos.length;
      document.getElementById('badgeCountErros').textContent = erros.length;

      // Filtra válidos se houver equipe selecionada
      const validosFiltrados = equipeFiltroAtual
        ? validos.filter(d => String(d.equipe) === String(equipeFiltroAtual))
        : validos;

      // Cards Resumo
      const totalPacotesElem = document.getElementById('valTotalPacotes');
      if (totalPacotesElem) {
        if (equipeFiltroAtual) {
          totalPacotesElem.innerHTML = `${validosFiltrados.length} <span style="font-size: 13px; color: var(--obsat-pink); font-weight: 700;">(Eq. ${equipeFiltroAtual})</span>`;
        } else {
          totalPacotesElem.textContent = validosFiltrados.length;
        }
      }

      if (validosFiltrados.length > 0) {
        const ultimo = validosFiltrados[0];
        document.getElementById('valEquipe').textContent = 'Equipe ' + ultimo.equipe;
        document.getElementById('valTimestamp').textContent = ultimo.timestamp;
        document.getElementById('valTemp').textContent = ultimo.temperatura + ' °C';
        document.getElementById('valPress').textContent = ultimo.pressao + ' hPa';
        document.getElementById('valAlt').textContent = (ultimo.altitude !== null && ultimo.altitude !== undefined && ultimo.altitude !== '') ? ultimo.altitude + ' m' : '--';

        // Atualização Acelerômetro MPU6050
        const elAccel = document.getElementById('valAccel');
        if (elAccel) {
          if (Array.isArray(ultimo.acelerometro)) {
            elAccel.textContent = '[' + ultimo.acelerometro.map(v => typeof v === 'number' ? v.toFixed(2) : v).join(', ') + ']';
          } else if (ultimo.acelerometro !== undefined && ultimo.acelerometro !== null && ultimo.acelerometro !== '') {
            elAccel.textContent = (typeof ultimo.acelerometro === 'number' ? ultimo.acelerometro.toFixed(2) : ultimo.acelerometro) + ' m/s²';
          } else {
            elAccel.textContent = '--';
          }
        }

        // Atualização Giroscópio MPU6050
        const elGyro = document.getElementById('valGyro');
        if (elGyro) {
          if (Array.isArray(ultimo.giroscopio)) {
            elGyro.textContent = '[' + ultimo.giroscopio.map(v => typeof v === 'number' ? v.toFixed(2) : v).join(', ') + ']';
          } else if (ultimo.giroscopio !== undefined && ultimo.giroscopio !== null && ultimo.giroscopio !== '') {
            elGyro.textContent = (typeof ultimo.giroscopio === 'number' ? ultimo.giroscopio.toFixed(2) : ultimo.giroscopio) + ' °/s';
          } else {
            elGyro.textContent = '--';
          }
        }

        // Atualização Bateria EPS
        const elBat = document.getElementById('valBat');
        if (elBat) {
          elBat.textContent = (ultimo.bateria !== undefined && ultimo.bateria !== null && ultimo.bateria !== '') ? ultimo.bateria + ' %' : '--';
        }

        // Atualiza Tabela de Válidos
        const tbody = document.getElementById('telemetriaTableBody');
        tbody.innerHTML = '';

        validosFiltrados.forEach(p => {
          const tr = document.createElement('tr');
          const payloadStr = typeof p.payload === 'object' ? JSON.stringify(p.payload) : String(p.payload_raw || p.payload || '');
          const statusBadge = (p.statuse && p.statuse.includes('Truncad')) 
            ? `<span class="badge-status-err">⚠️ Truncado</span>` 
            : `<span class="badge-status-ok">✓ Sucesso</span>`;

          // Formatação dos Dados Inerciais MPU6050
          let inercialStr = '-';
          if (Array.isArray(p.acelerometro) || Array.isArray(p.giroscopio)) {
            const acelText = Array.isArray(p.acelerometro) ? p.acelerometro.map(v => typeof v === 'number' ? v.toFixed(1) : v).join(',') : (p.acelerometro || '-');
            const giroText = Array.isArray(p.giroscopio) ? p.giroscopio.map(v => typeof v === 'number' ? v.toFixed(1) : v).join(',') : (p.giroscopio || '-');
            inercialStr = `<span style="font-size: 11px; font-family: var(--font-mono); color: #7c3aed;">A:[${acelText}]</span><br><span style="font-size: 11px; font-family: var(--font-mono); color: #db2777;">G:[${giroText}]</span>`;
          } else if (p.acelerometro || p.giroscopio) {
            inercialStr = `<span style="font-size: 11px; font-family: var(--font-mono); color: #7c3aed;">A: ${p.acelerometro || '-'}</span> | <span style="font-size: 11px; font-family: var(--font-mono); color: #db2777;">G: ${p.giroscopio || '-'}</span>`;
          }

          // Bateria
          const batStr = (p.bateria !== undefined && p.bateria !== null && p.bateria !== '') ? `<span style="font-weight: 700; color: #f59e0b;">${p.bateria}%</span>` : '-';

          // Extração precisa de fotografia Base64
          let base64Foto = '';
          if (p.payload && typeof p.payload === 'object') {
            if (p.payload.dado && typeof p.payload.dado === 'string' && p.payload.dado.startsWith('/9j/')) {
              base64Foto = p.payload.dado;
            } else if (p.payload.payload && p.payload.payload.dado && typeof p.payload.payload.dado === 'string' && p.payload.payload.dado.startsWith('/9j/')) {
              base64Foto = p.payload.payload.dado;
            } else if (p.payload.fotografia && typeof p.payload.fotografia === 'string' && p.payload.fotografia.startsWith('/9j/')) {
              base64Foto = p.payload.fotografia;
            }
          }
          if (!base64Foto && typeof payloadStr === 'string' && payloadStr.includes('/9j/')) {
            const match = payloadStr.match(/\/9j\/[A-Za-z0-9+/=]+/);
            if (match) base64Foto = match[0];
          }

          let payloadCell = '';
          if (base64Foto) {
            payloadCell = `
              <div style="display: inline-flex; align-items: center; gap: 8px;">
                <img src="data:image/jpeg;base64,${base64Foto}" style="width: 44px; height: 32px; object-fit: cover; border-radius: 6px; border: 1.5px solid #0284c7; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.15);" onclick="abrirModalInspeccao(${p.id})" title="Clique para ampliar fotografia espacial" />
                <span class="badge-status-ok" style="background: rgba(2, 132, 199, 0.12); color: #0284c7; border-color: rgba(2, 132, 199, 0.3); font-size: 11px; cursor: pointer;" onclick="abrirModalInspeccao(${p.id})">📷 Foto JPEG</span>
              </div>
            `;
          } else {
            payloadCell = `<span class="payload-badge" title="${payloadStr}">${payloadStr}</span>`;
          }

          tr.innerHTML = `
            <td><strong style="color: #64748b;">#${p.id}</strong></td>
            <td style="color: #64748b; font-size: 12px;">${p.timestamp}</td>
            <td>
              <span class="badge-team" onclick="filtrarPorEquipe('${p.equipe}')" style="cursor: pointer;" title="Clique para filtrar apenas a Equipe ${p.equipe}">
                Equipe ${p.equipe} 🔍
              </span>
            </td>
            <td style="font-family: var(--font-mono); font-size: 11.5px; color: #64748b;">${p.ip_origem || 'Satélite'}</td>
            <td style="font-weight: 700; color: #0284c7;">${p.temperatura} °C</td>
            <td style="font-weight: 700; color: #059669;">${p.pressao} hPa</td>
            <td style="font-weight: 700; color: #d97706;">${(p.altitude !== null && p.altitude !== undefined && p.altitude !== '') ? p.altitude + ' m' : '-'}</td>
            <td>${inercialStr}</td>
            <td>${batStr}</td>
            <td>${payloadCell}</td>
            <td>${statusBadge}</td>
            <td style="text-align: center;">
              <button class="btn-inspect" onclick="abrirModalInspeccao(${p.id})">🔍 Inspecionar</button>
            </td>
          `;
          tbody.appendChild(tr);
        });

        // Atualiza Gráficos (Ordem Cronológica Invertida - até 25 pontos)
        const dadosCronologicos = [...validosFiltrados].reverse().slice(-25);
        const labels = dadosCronologicos.map(d => (d.timestamp.split(' ')[1] || d.timestamp));

        const equipesGrafico = [...new Set(dadosCronologicos.map(d => String(d.equipe || '0')))];
        equipesGrafico.sort((a, b) => {
          const numA = parseInt(a, 10);
          const numB = parseInt(b, 10);
          if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
          return a.localeCompare(b);
        });

        const datasetsTemp = equipesGrafico.map((eq, idx) => {
          const cor = getCorEquipe(idx);
          const dataPoints = dadosCronologicos.map(d => (String(d.equipe) === eq ? (parseFloat(d.temperatura) || 0) : null));
          return {
            label: `Equipe ${eq}`,
            data: dataPoints,
            borderColor: cor.border,
            backgroundColor: cor.bg,
            borderWidth: 2.4,
            tension: 0.35,
            spanGaps: true,
            pointBackgroundColor: cor.border,
            pointBorderColor: '#ffffff',
            pointBorderWidth: 1.5,
            pointRadius: 4,
            pointHoverRadius: 6,
            fill: (equipesGrafico.length === 1)
          };
        });

        const datasetsPress = equipesGrafico.map((eq, idx) => {
          const cor = getCorEquipe(idx);
          const dataPoints = dadosCronologicos.map(d => (String(d.equipe) === eq ? (parseFloat(d.pressao) || 0) : null));
          return {
            label: `Equipe ${eq}`,
            data: dataPoints,
            borderColor: cor.border,
            backgroundColor: cor.bg,
            borderWidth: 2.4,
            tension: 0.35,
            spanGaps: true,
            pointBackgroundColor: cor.border,
            pointBorderColor: '#ffffff',
            pointBorderWidth: 1.5,
            pointRadius: 4,
            pointHoverRadius: 6,
            fill: (equipesGrafico.length === 1)
          };
        });

        if (chartTemp) {
          chartTemp.data.labels = labels;
          chartTemp.data.datasets = datasetsTemp;
          chartTemp.update('none');
        }

        if (chartPress) {
          chartPress.data.labels = labels;
          chartPress.data.datasets = datasetsPress;
          chartPress.update('none');
        }
      } else {
        const tbody = document.getElementById('telemetriaTableBody');
        tbody.innerHTML = `
          <tr>
            <td colspan="11" style="text-align: center; color: var(--text-muted); padding: 32px 16px;">
              🛰️ Nenhum pacote válido encontrado para a Equipe selecionada.<br>
              <button class="sat-btn" onclick="limparFiltroEquipe()" style="margin-top: 8px;">Ver todas as equipes</button>
            </td>
          </tr>
        `;
      }

      // Atualiza Tabela de Erros / Diagnóstico
      const tbodyErros = document.getElementById('errosTableBody');
      if (erros.length > 0) {
        tbodyErros.innerHTML = '';
        erros.forEach(p => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td><strong style="color: #64748b;">#${p.id}</strong></td>
            <td><span class="badge-team" style="background: #fee2e2; color: #b91c1c; border-color: #fca5a5;">Eq. ${p.equipe || '?'}</span></td>
            <td style="color: #64748b; font-size: 12px;">${p.timestamp}</td>
            <td style="color: #e11d48; font-weight: 600; font-size: 12.5px;">
              <span class="badge-status-err">⚠️ Falha</span> ${p.statuse || 'Erro desconhecido na validação do pacote'}
            </td>
            <td style="font-family: var(--font-mono); font-size: 11.5px; color: #64748b;">${p.tamanho ? p.tamanho + ' B' : '-'}</td>
            <td style="text-align: center;">
              <button class="btn-inspect" onclick="abrirModalInspeccao(${p.id})">🔍 Inspecionar</button>
            </td>
          `;
          tbodyErros.appendChild(tr);
        });
      } else {
        tbodyErros.innerHTML = `
          <tr>
            <td colspan="6" style="text-align: center; color: #059669; padding: 32px 16px; font-weight: 700;">
              🛡️ Nenhuma falha de telemetria registrada! Todos os pacotes recebidos estão válidos.
            </td>
          </tr>
        `;
      }
    }

    // Modal de Inspeção
    function abrirModalInspeccao(id) {
      const item = historicoCompleto.find(p => p.id === id);
      if (!item) return;

      document.getElementById('modalId').textContent = '#' + item.id;
      document.getElementById('modalEquipe').textContent = 'Equipe ' + (item.equipe || '?');
      document.getElementById('modalDt').textContent = item.timestamp;
      document.getElementById('modalTam').textContent = (item.tamanho || '128') + ' bytes';

      const diagBox = document.getElementById('modalDiagBox');
      const diagTitle = document.getElementById('modalDiagTitle');
      const diagText = document.getElementById('modalDiagText');

      if (isErro(item)) {
        diagBox.className = 'diag-box error';
        diagTitle.innerHTML = '⚠️ Diagnóstico da Falha:';
        diagText.textContent = item.statuse || 'Erro na validação dos campos obrigatórios ou JSON corrompido.';
      } else {
        diagBox.className = 'diag-box success';
        diagTitle.innerHTML = '✓ Status: Sucesso';
        diagText.textContent = 'Pacote validado e gravado com sucesso no servidor.';
      }

      let payloadExibicao = '';
      if (item.raw && typeof item.raw === 'object') {
        payloadExibicao = JSON.stringify(item.raw, null, 2);
      } else if (item.payload_raw) {
        try {
          payloadExibicao = JSON.stringify(JSON.parse(item.payload_raw), null, 2);
        } catch(e) {
          payloadExibicao = item.payload_raw;
        }
      } else {
        payloadExibicao = JSON.stringify(item, null, 2);
      }

      document.getElementById('modalPayloadViewer').textContent = payloadExibicao;

      // Detecta imagem JPEG em Base64 e renderiza preview
      const photoContainer = document.getElementById('modalPhotoPreviewContainer');
      const photoImg = document.getElementById('modalPhotoImg');
      let base64Foto = '';
      if (item.payload && item.payload.dado && typeof item.payload.dado === 'string' && item.payload.dado.startsWith('/9j/')) {
        base64Foto = item.payload.dado;
      } else if (item.payload && item.payload.fotografia && typeof item.payload.fotografia === 'string' && item.payload.fotografia.startsWith('/9j/')) {
        base64Foto = item.payload.fotografia;
      } else if (typeof payloadExibicao === 'string' && payloadExibicao.includes('/9j/')) {
        const match = payloadExibicao.match(/\/9j\/[A-Za-z0-9+/=]+/);
        if (match) base64Foto = match[0];
      }

      const downloadLink = document.getElementById('modalDownloadPhotoLink');

      if (base64Foto && photoContainer && photoImg) {
        photoImg.src = 'data:image/jpeg;base64,' + base64Foto;
        if (downloadLink) {
          downloadLink.href = 'data:image/jpeg;base64,' + base64Foto;
          downloadLink.download = `foto_equipe_${item.equipe || '1'}_pacote_${item.id}.jpg`;
        }
        photoContainer.style.display = 'block';
      } else if (photoContainer) {
        photoContainer.style.display = 'none';
        if (photoImg) photoImg.src = '';
      }

      document.getElementById('modalInspeccao').style.display = 'flex';
    }

    function fecharModal() {
      document.getElementById('modalInspeccao').style.display = 'none';
    }

    function fecharModalBackground(e) {
      if (e.target === document.getElementById('modalInspeccao')) {
        fecharModal();
      }
    }

    function copiarPayloadModal() {
      const txt = document.getElementById('modalPayloadViewer').textContent;
      navigator.clipboard.writeText(txt).then(() => {
        alert('JSON copiado para a área de transferência!');
      });
    }

    async function atualizarDados() {
      try {
        let resp = null;
        try {
          resp = await fetch(`get_data.php?limit=100`);
        } catch(e) {
          resp = await fetch(`/satblocks/telemetria/get_data.php?limit=100`);
        }
        if (!resp || !resp.ok) return;
        const dados = await resp.json();

        historicoCompleto = Array.isArray(dados) ? dados : [];
        atualizarSelectEquipes(historicoCompleto);
        renderizarDados();
      } catch (e) {
        console.warn('Erro ao atualizar telemetrias:', e);
      }
    }

    window.addEventListener('DOMContentLoaded', () => {
      atualizarEndpointPillText();
      initCharts();
      if (historicoCompleto && historicoCompleto.length > 0) {
        atualizarSelectEquipes(historicoCompleto);
        renderizarDados();
      }
      atualizarDados();
      setInterval(atualizarDados, 2000);
    });
  </script>
</body>
</html>
