<?php
// Recupera um projeto/Painel IOT compartilhado pelo ID curto gerado em
// share_save.php.
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

$id = trim(strval($_GET['id'] ?? ''));
if ($id === '') {
    http_response_code(422);
    echo json_encode(["status" => "erro", "erro" => "O campo 'id' é obrigatório."], JSON_UNESCAPED_UNICODE);
    exit;
}

if (!$con) {
    http_response_code(503);
    echo json_encode(["status" => "erro", "erro" => "Banco de dados indisponível no momento."], JSON_UNESCAPED_UNICODE);
    exit;
}

$tableCheck = $con->query("SHOW TABLES LIKE 'satblocks_shares'");
if (!$tableCheck || $tableCheck->num_rows === 0) {
    http_response_code(404);
    echo json_encode(["status" => "erro", "erro" => "Link não encontrado."], JSON_UNESCAPED_UNICODE);
    exit;
}

$stmt = $con->prepare("SELECT payload FROM satblocks_shares WHERE id = ?");
$stmt->bind_param("s", $id);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$row) {
    http_response_code(404);
    echo json_encode(["status" => "erro", "erro" => "Link não encontrado ou expirado."], JSON_UNESCAPED_UNICODE);
    exit;
}

$stmt = $con->prepare("UPDATE satblocks_shares SET last_accessed = NOW() WHERE id = ?");
$stmt->bind_param("s", $id);
$stmt->execute();
$stmt->close();

$data = json_decode($row['payload'], true);

http_response_code(200);
echo json_encode(["status" => "sucesso", "data" => $data], JSON_UNESCAPED_UNICODE);
?>
