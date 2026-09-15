<?php
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

if ($con) {
    @$con->query("TRUNCATE TABLE satblocks_telemetria");
    @$con->query("TRUNCATE TABLE server_test");
}

$jsonDbFile = __DIR__ . '/telemetria/telemetria_db.json';
@file_put_contents($jsonDbFile, json_encode([], JSON_PRETTY_PRINT));
$altDbFile = __DIR__ . '/telemetria_db.json';
@file_put_contents($altDbFile, json_encode([], JSON_PRETTY_PRINT));

echo json_encode([
    "status" => "sucesso",
    "mensagem" => "Banco de telemetria limpo com sucesso."
], JSON_UNESCAPED_UNICODE);
?>
