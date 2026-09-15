<?php
// Script temporário para salvar os PNGs gerados das missões
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo "Method not allowed";
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
if (!$input || empty($input['filename']) || empty($input['dataUrl'])) {
    http_response_code(400);
    echo "Invalid input";
    exit;
}

$allowed = [
    'bloco_oficina1_programa_minimo.png',
    'bloco_oficina1_beacon_tempo.png',
    'bloco_oficina1_leds_navegacao.png',
    'bloco_oficina1_bmp280_temperatura.png',
    'bloco_oficina1_pacote_telemetria.png'
];

$filename = basename($input['filename']);
if (!in_array($filename, $allowed)) {
    http_response_code(403);
    echo "Forbidden filename";
    exit;
}

$dataUrl = $input['dataUrl'];
if (preg_match('/^data:image\/png;base64,(.+)$/', $dataUrl, $matches)) {
    $pngData = base64_decode($matches[1]);
    $targetPath = '/var/www/obsite/oficinas_satblocks/imagens/' . $filename;
    file_put_contents($targetPath, $pngData);
    echo "Saved: " . $filename . " (" . strlen($pngData) . " bytes)";
} else {
    http_response_code(400);
    echo "Invalid dataUrl format";
}
