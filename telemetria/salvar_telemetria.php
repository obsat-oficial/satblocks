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

if (file_exists(__DIR__ . '/db_config.php')) {
    require_once __DIR__ . '/db_config.php';
} elseif (file_exists(__DIR__ . '/../db_config.php')) {
    require_once __DIR__ . '/../db_config.php';
}

$datetime = date('Y-m-d H:i:s');
$rawBody = file_get_contents('php://input');

function isJSON($string) {
    if (!is_string($string) || trim($string) === '') {
        return false;
    }
    json_decode($string);
    return json_last_error() === JSON_ERROR_NONE;
}

// 1. Tratamento de corpo vazio
if (empty($rawBody) && empty($_POST) && empty($_GET)) {
    $statuse = "Erro: Nenhuma requisição ou payload foi enviado pelo satélite.";
    http_response_code(400);
    echo json_encode(["status" => "erro", "erro" => $statuse], JSON_UNESCAPED_UNICODE);
    
    if ($con) {
        $stmt = $con->prepare("INSERT INTO satblocks_telemetria (payload, statuse, datetimea) VALUES (?, ?, ?)");
        if ($stmt) {
            $stmt->bind_param("sss", $rawBody, $statuse, $datetime);
            $stmt->execute();
            $stmt->close();
        }
    }
    exit;
}

$data = [];
if (!empty($rawBody)) {
    if (isJSON($rawBody)) {
        $data = json_decode($rawBody, true) ?: [];
    } else {
        $statuse = "Erro: A requisição recebida não é um JSON válido. Verifique aspas e formatação.";
        http_response_code(400);
        echo json_encode(["status" => "erro", "erro" => $statuse], JSON_UNESCAPED_UNICODE);
        
        if ($con) {
            $stmt = $con->prepare("INSERT INTO satblocks_telemetria (payload, statuse, datetimea) VALUES (?, ?, ?)");
            if ($stmt) {
                $stmt->bind_param("sss", $rawBody, $statuse, $datetime);
                $stmt->execute();
                $stmt->close();
            }
        }
        exit;
    }
} else {
    $data = !empty($_POST) ? $_POST : $_GET;
}

// 2. Validação do campo identificador essencial (Equipe)
$equipeRaw = $data['equipe'] ?? $data['team'] ?? $data['id_equipe'] ?? null;
if ($equipeRaw === null || $equipeRaw === '') {
    $statuse = "Erro: O campo 'equipe' é obrigatório no pacote de telemetria.";
    http_response_code(422);
    echo json_encode(["status" => "erro", "erro" => $statuse], JSON_UNESCAPED_UNICODE);

    $payload_dump = !empty($rawBody) ? $rawBody : json_encode($data, JSON_UNESCAPED_UNICODE);
    if ($con) {
        $stmt = $con->prepare("INSERT INTO satblocks_telemetria (equipe, payload, statuse, datetimea) VALUES (?, ?, ?, ?)");
        if ($stmt) {
            $eq_zero = "0";
            $stmt->bind_param("ssss", $eq_zero, $payload_dump, $statuse, $datetime);
            $stmt->execute();
            $stmt->close();
        }
    }
    exit;
}

// 3. Normalização flexível e robusta de todos os campos
$equipe = strval($equipeRaw);
$temperatura = strval($data['temperatura'] ?? $data['temp'] ?? '0');
$pressao = strval($data['pressao'] ?? $data['pressure'] ?? '0');
$bateria = strval($data['bateria'] ?? $data['bat'] ?? '100');

// Giroscópio e Acelerômetro (aceita array, string, numérico escalar ou fallback)
$giroVal = $data['giroscopio'] ?? $data['gyro'] ?? [0,0,0];
if (is_numeric($giroVal)) {
    $giroVal = [0, 0, floatval($giroVal)];
}
$giroscopio = is_array($giroVal) ? json_encode($giroVal, JSON_UNESCAPED_UNICODE) : (is_string($giroVal) ? $giroVal : '[0,0,0]');

$acelVal = $data['acelerometro'] ?? $data['accel'] ?? [0,0,0];
if (is_numeric($acelVal)) {
    $acelVal = [0, 0, floatval($acelVal)];
}
$acelerometro = is_array($acelVal) ? json_encode($acelVal, JSON_UNESCAPED_UNICODE) : (is_string($acelVal) ? $acelVal : '[0,0,0]');

// Tratamento de Payload Extra / Fotografia / Altitude
$payloadData = $data['payload'] ?? [];
if (is_string($payloadData) && isJSON($payloadData)) {
    $payloadData = json_decode($payloadData, true);
}

if (isset($data['altitude']) || isset($data['alt'])) {
    $alt = $data['altitude'] ?? $data['alt'];
    if (is_array($payloadData)) {
        $payloadData['altitude'] = $alt;
    }
}
if (isset($data['fotografia']) || isset($data['foto']) || isset($data['dado'])) {
    $foto = $data['fotografia'] ?? $data['foto'] ?? $data['dado'];
    if (is_array($payloadData)) {
        $payloadData['dado'] = $foto;
    }
}

$payloadStr = is_array($payloadData) ? json_encode($payloadData, JSON_UNESCAPED_UNICODE) : strval($payloadData);
if (empty($payloadStr) || $payloadStr === '[]') {
    $payloadStr = '{}';
}

$tamanho = strlen($rawBody) > 0 ? strlen($rawBody) : strlen(json_encode($data));
$statuse = "Sucesso!";

$id = 0;
if ($con) {
    $stmt = $con->prepare("INSERT INTO satblocks_telemetria (equipe, bateria, temperatura, pressao, giroscopio, acelerometro, payload, tamanho, statuse, datetimea) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    if ($stmt) {
        $stmt->bind_param("ssssssssss", $equipe, $bateria, $temperatura, $pressao, $giroscopio, $acelerometro, $payloadStr, $tamanho, $statuse, $datetime);
        $stmt->execute();
        $id = $stmt->insert_id;
        $stmt->close();
    }
} else {
    // Modo Contingência Offline (Sem MySQL) -> telemetria_db.json
    $jsonFile = file_exists(__DIR__ . '/telemetria_db.json') ? (__DIR__ . '/telemetria_db.json') : (__DIR__ . '/../telemetria_db.json');
    $dbData = [];
    if (file_exists($jsonFile)) {
        $dbData = json_decode(@file_get_contents($jsonFile), true) ?: [];
    }
    $id = intval(microtime(true) * 1000);
    $giroParsed = json_decode($giroscopio, true) ?: [0,0,0];
    $acelParsed = json_decode($acelerometro, true) ?: [0,0,0];
    
    $novoItem = [
        "id" => $id,
        "timestamp" => date('d/m/Y H:i:s'),
        "hora_iso" => date('c'),
        "ip_origem" => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1',
        "equipe" => $equipe,
        "temperatura" => $temperatura,
        "pressao" => $pressao,
        "bateria" => $bateria,
        "altitude" => $payloadData['altitude'] ?? ($data['altitude'] ?? null),
        "giroscopio" => $giroParsed,
        "acelerometro" => $acelParsed,
        "payload" => $payloadData,
        "payload_raw" => $payloadStr,
        "tamanho" => $tamanho,
        "statuse" => $statuse,
        "raw" => $data
    ];

    array_unshift($dbData, $novoItem);
    if (count($dbData) > 100) {
        $dbData = array_slice($dbData, 0, 100);
    }
    @file_put_contents($jsonFile, json_encode($dbData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);

    // Sincroniza espelho se existir em outro diretório
    $altFile = (__DIR__ === dirname(__DIR__)) ? (__DIR__ . '/telemetria/telemetria_db.json') : (__DIR__ . '/../telemetria_db.json');
    if (file_exists(dirname($altFile)) && $altFile !== $jsonFile) {
        @file_put_contents($altFile, json_encode($dbData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
    }
}

http_response_code(200);
echo json_encode([
    "status" => "sucesso",
    "mensagem" => "Pacote de telemetria recebido e gravado com sucesso no SatBlocks!",
    "id" => $id,
    "equipe" => $equipe,
    "temperatura" => $temperatura,
    "pressao" => $pressao,
    "datetime" => $datetime
], JSON_UNESCAPED_UNICODE);
?>
