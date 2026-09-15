<?php
// Canal de Telemetria IoT do SatBlocks (Painel IOT)
// Recebe um valor nomeado (canal/tópico) publicado por uma equipe e grava
// para consulta incremental pelo Painel IOT (ver iot_get.php / iot_topics.php).
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=utf-8");

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(200);
    echo json_encode(["status" => "ok"]);
    exit;
}

require_once __DIR__ . '/db_config.php';

$data = !empty($_POST) ? $_POST : $_GET;

$equipe = trim(strval($data['equipe'] ?? $data['team'] ?? ''));
$canal = trim(strval($data['canal'] ?? $data['topic'] ?? ''));
$valor = strval($data['valor'] ?? $data['value'] ?? '');

if ($equipe === '' || $canal === '') {
    http_response_code(422);
    echo json_encode(["status" => "erro", "erro" => "Os campos 'equipe' e 'canal' são obrigatórios."], JSON_UNESCAPED_UNICODE);
    exit;
}

// Limita tamanho para evitar abuso (canal/valor vêm de código gerado por alunos)
$equipe = substr($equipe, 0, 50);
$canal = substr($canal, 0, 100);
$valor = substr($valor, 0, 255);

if (!$con) {
    http_response_code(503);
    echo json_encode(["status" => "erro", "erro" => "Banco de dados indisponível no momento."], JSON_UNESCAPED_UNICODE);
    exit;
}

$con->query("CREATE TABLE IF NOT EXISTS satblocks_iot_canais (
    id INT AUTO_INCREMENT PRIMARY KEY,
    equipe VARCHAR(50) NOT NULL,
    canal VARCHAR(100) NOT NULL,
    valor VARCHAR(255) NOT NULL,
    datetimea DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_equipe_canal (equipe, canal, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

$stmt = $con->prepare("INSERT INTO satblocks_iot_canais (equipe, canal, valor) VALUES (?, ?, ?)");
$stmt->bind_param("sss", $equipe, $canal, $valor);
$stmt->execute();
$id = $stmt->insert_id;
$stmt->close();

// Limpeza automática de registros com mais de 3 horas, para não crescer indefinidamente
$con->query("DELETE FROM satblocks_iot_canais WHERE datetimea < NOW() - INTERVAL 3 HOUR");

http_response_code(200);
echo json_encode(["status" => "sucesso", "id" => $id], JSON_UNESCAPED_UNICODE);
?>
