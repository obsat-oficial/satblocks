<?php
// Busca incremental de novos valores de um canal IoT (usado pelo Painel IOT em
// polling periódico). Passar "desde" (timestamp Unix) para receber só o que
// chegou depois do último ponto já exibido.
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

$token = trim(strval($_GET['token'] ?? ''));
$canal = trim(strval($_GET['canal'] ?? ''));
$desde = isset($_GET['desde']) && $_GET['desde'] !== '' ? intval($_GET['desde']) : null;

if ($token === '' || $canal === '') {
    http_response_code(422);
    echo json_encode(["success" => false, "result" => "Os campos 'token' e 'canal' são obrigatórios."], JSON_UNESCAPED_UNICODE);
    exit;
}

if (!$con) {
    echo json_encode(["success" => true, "result" => []], JSON_UNESCAPED_UNICODE);
    exit;
}

$tableCheck = $con->query("SHOW TABLES LIKE 'satblocks_iot_canais'");
if (!$tableCheck || $tableCheck->num_rows === 0) {
    echo json_encode(["success" => true, "result" => []], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($desde !== null) {
    $stmt = $con->prepare("SELECT valor, UNIX_TIMESTAMP(datetimea) AS ts FROM satblocks_iot_canais WHERE token = ? AND canal = ? AND UNIX_TIMESTAMP(datetimea) >= ? ORDER BY id ASC LIMIT 500");
    $stmt->bind_param("ssi", $token, $canal, $desde);
} else {
    $stmt = $con->prepare("SELECT valor, UNIX_TIMESTAMP(datetimea) AS ts FROM satblocks_iot_canais WHERE token = ? AND canal = ? ORDER BY id ASC LIMIT 500");
    $stmt->bind_param("ss", $token, $canal);
}
$stmt->execute();
$result = $stmt->get_result();

$pontos = [];
while ($row = $result->fetch_assoc()) {
    $pontos[] = ["timestamp" => intval($row['ts']), "valor" => $row['valor']];
}
$stmt->close();

echo json_encode(["success" => true, "result" => $pontos], JSON_UNESCAPED_UNICODE);
?>
