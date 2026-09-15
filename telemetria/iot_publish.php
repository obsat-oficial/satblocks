<?php
// Canal de Telemetria IoT do SatBlocks (Painel IOT)
// Recebe um valor nomeado (canal/tópico) publicado por uma sessão do
// navegador e grava para consulta incremental pelo Painel IOT (ver
// iot_get.php / iot_topics.php).
//
// A separação real dos dados é feita pelo "token" (gerado sozinho pelo
// navegador que gera o código, guardado em localStorage — o aluno nunca
// digita nem escolhe esse valor). O "equipe" (campo "ID IoT" do bloco
// Dados do Projeto) é só um rótulo de exibição: como não é usado para
// separar os dados, duas equipes podem coincidentemente usar o mesmo
// número sem que os canais se misturem.
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
$token = trim(strval($data['token'] ?? ''));

if ($canal === '' || $token === '') {
    http_response_code(422);
    echo json_encode(["status" => "erro", "erro" => "Os campos 'canal' e 'token' são obrigatórios."], JSON_UNESCAPED_UNICODE);
    exit;
}

// Limita tamanho para evitar abuso (canal/valor vêm de código gerado por alunos)
$equipe = substr($equipe, 0, 50);
$canal = substr($canal, 0, 100);
$valor = substr($valor, 0, 255);
$token = substr($token, 0, 64);

if (!$con) {
    http_response_code(503);
    echo json_encode(["status" => "erro", "erro" => "Banco de dados indisponível no momento."], JSON_UNESCAPED_UNICODE);
    exit;
}

$con->query("CREATE TABLE IF NOT EXISTS satblocks_iot_canais (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token VARCHAR(64) NOT NULL,
    equipe VARCHAR(50) NOT NULL DEFAULT '',
    canal VARCHAR(100) NOT NULL,
    valor VARCHAR(255) NOT NULL,
    datetimea DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_token_canal (token, canal, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

// Migração best-effort para quem já tinha a tabela antiga (sem token) —
// falhas aqui são silenciosas de propósito (coluna/índice já existente).
@$con->query("ALTER TABLE satblocks_iot_canais ADD COLUMN token VARCHAR(64) NOT NULL DEFAULT '' AFTER id");
@$con->query("ALTER TABLE satblocks_iot_canais ADD INDEX idx_token_canal (token, canal, id)");

$stmt = $con->prepare("INSERT INTO satblocks_iot_canais (token, equipe, canal, valor) VALUES (?, ?, ?, ?)");
$stmt->bind_param("ssss", $token, $equipe, $canal, $valor);
$stmt->execute();
$id = $stmt->insert_id;
$stmt->close();

// Limpeza automática de registros com mais de 3 horas, para não crescer indefinidamente
$con->query("DELETE FROM satblocks_iot_canais WHERE datetimea < NOW() - INTERVAL 3 HOUR");

http_response_code(200);
echo json_encode(["status" => "sucesso", "id" => $id], JSON_UNESCAPED_UNICODE);
?>
