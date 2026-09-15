<?php
// Salva um "snapshot" compartilhável de um projeto SatBlocks (blocos +
// layout do Painel IOT), gerando um ID curto para o link. Não requer
// login/senha — qualquer um com o link consegue abrir, mas o link não
// fica listado em lugar nenhum.
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=utf-8");

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(200);
    echo json_encode(["status" => "ok"]);
    exit;
}

require_once __DIR__ . '/db_config.php';

$rawBody = file_get_contents('php://input');

// Limite de tamanho: evita blobs enormes (ex: fotos em base64 embutidas
// no XML de projetos com bloco de câmera) inchando o banco.
$maxBytes = 2 * 1024 * 1024; // 2MB
if (strlen($rawBody) > $maxBytes) {
    http_response_code(413);
    echo json_encode(["status" => "erro", "erro" => "Projeto grande demais para compartilhar (limite de 2MB)."], JSON_UNESCAPED_UNICODE);
    exit;
}

$decoded = json_decode($rawBody, true);
if (!is_array($decoded) || (!isset($decoded['blocklyXml']) && !isset($decoded['databoard']))) {
    http_response_code(422);
    echo json_encode(["status" => "erro", "erro" => "Payload de projeto inválido."], JSON_UNESCAPED_UNICODE);
    exit;
}

if (!$con) {
    http_response_code(503);
    echo json_encode(["status" => "erro", "erro" => "Banco de dados indisponível no momento."], JSON_UNESCAPED_UNICODE);
    exit;
}

$con->query("CREATE TABLE IF NOT EXISTS satblocks_shares (
    id VARCHAR(12) PRIMARY KEY,
    payload LONGTEXT NOT NULL,
    creator_ip VARCHAR(45) DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_last_accessed (last_accessed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

$ip = $_SERVER['REMOTE_ADDR'] ?? '';

// Limite de taxa bem generoso (proteção só contra automação/spam, não
// deve incomodar uso normal): no máx. 50 compartilhamentos por hora por IP.
if ($ip !== '') {
    $stmt = $con->prepare("SELECT COUNT(*) AS total FROM satblocks_shares WHERE creator_ip = ? AND created_at > NOW() - INTERVAL 1 HOUR");
    $stmt->bind_param("s", $ip);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if ($row && intval($row['total']) >= 50) {
        http_response_code(429);
        echo json_encode(["status" => "erro", "erro" => "Muitos compartilhamentos criados recentemente. Tente novamente mais tarde."], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

// Gera um ID curto e único (retry em caso raro de colisão)
function gerarIdCompartilhamento() {
    return substr(bin2hex(random_bytes(6)), 0, 10);
}

$id = null;
for ($tentativas = 0; $tentativas < 5; $tentativas++) {
    $candidato = gerarIdCompartilhamento();
    $check = $con->prepare("SELECT 1 FROM satblocks_shares WHERE id = ?");
    $check->bind_param("s", $candidato);
    $check->execute();
    $exists = $check->get_result()->num_rows > 0;
    $check->close();
    if (!$exists) {
        $id = $candidato;
        break;
    }
}

if ($id === null) {
    http_response_code(500);
    echo json_encode(["status" => "erro", "erro" => "Não foi possível gerar um link único, tente novamente."], JSON_UNESCAPED_UNICODE);
    exit;
}

$stmt = $con->prepare("INSERT INTO satblocks_shares (id, payload, creator_ip) VALUES (?, ?, ?)");
$stmt->bind_param("sss", $id, $rawBody, $ip);
$stmt->execute();
$stmt->close();

// Limpeza automática de compartilhamentos sem acesso há mais de 90 dias
$con->query("DELETE FROM satblocks_shares WHERE last_accessed < NOW() - INTERVAL 90 DAY");

http_response_code(200);
echo json_encode(["status" => "sucesso", "id" => $id], JSON_UNESCAPED_UNICODE);
?>
