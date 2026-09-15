<?php
// Lista os canais IoT com atividade recente de um token de sessão (usado
// pelo Painel IOT para descobrir automaticamente quais datasets existem,
// sem precisar cadastrar nada manualmente).
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
if ($token === '') {
    http_response_code(422);
    echo json_encode(["success" => false, "result" => "O campo 'token' é obrigatório."], JSON_UNESCAPED_UNICODE);
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

$stmt = $con->prepare("SELECT DISTINCT canal FROM satblocks_iot_canais WHERE token = ? AND datetimea > NOW() - INTERVAL 3 HOUR ORDER BY canal ASC");
$stmt->bind_param("s", $token);
$stmt->execute();
$result = $stmt->get_result();

$canais = [];
while ($row = $result->fetch_assoc()) {
    $canais[] = $row['canal'];
}
$stmt->close();

echo json_encode(["success" => true, "result" => $canais], JSON_UNESCAPED_UNICODE);
?>
