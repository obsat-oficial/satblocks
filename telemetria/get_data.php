<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=utf-8");

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(200);
    echo json_encode(["status" => "ok"]);
    exit;
}

require_once __DIR__ . '/db_config.php';

$limit = isset($_GET['limit']) ? intval($_GET['limit']) : 100;
if ($limit <= 0 || $limit > 500) {
    $limit = 100;
}

$equipeFiltro = isset($_GET['equipe']) ? trim($_GET['equipe']) : '';

$dados = [];

if ($con) {
    // Limpeza automática de registros com mais de 1 hora
    $con->query("DELETE FROM satblocks_telemetria WHERE datetimea < NOW() - INTERVAL 1 HOUR");

    // Busca os registros mais recentes da tabela dedicada satblocks_telemetria
    if (!empty($equipeFiltro)) {
        $stmt = $con->prepare("SELECT * FROM satblocks_telemetria WHERE equipe = ? ORDER BY id DESC LIMIT ?");
        $stmt->bind_param("si", $equipeFiltro, $limit);
        $stmt->execute();
        $result = $stmt->get_result();
    } else {
        $query = "SELECT * FROM satblocks_telemetria ORDER BY id DESC LIMIT " . intval($limit);
        $result = $con->query($query);
    }

    if ($result && $result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $payload = json_decode($row['payload'] ?? '{}', true) ?: [];
            $altitude = is_array($payload) ? ($payload['altitude'] ?? null) : null;
            $dt = !empty($row['datetimea']) ? date('d/m/Y H:i:s', strtotime($row['datetimea'])) : date('d/m/Y H:i:s');
            
            $dados[] = [
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
        foreach ($items as $item) {
            if (!empty($equipeFiltro) && strval($item['equipe'] ?? '') !== strval($equipeFiltro)) {
                continue;
            }
            $dados[] = $item;
            if (count($dados) >= $limit) break;
        }
    }
}

echo json_encode($dados, JSON_UNESCAPED_UNICODE);
?>
