<?php
// Configurações do Banco de Dados para o Servidor de Testes SatBlocks
date_default_timezone_set('America/Sao_Paulo');

// Credenciais reais ficam em db_config.local.php (fora do controle de versão)
if (file_exists(__DIR__ . '/../db_config.local.php')) {
    require_once __DIR__ . '/../db_config.local.php';
}

$servername = getenv('SATBLOCKS_DB_HOST') ?: 'localhost';
$username = getenv('SATBLOCKS_DB_USER') ?: 'root';
$password = getenv('SATBLOCKS_DB_PASSWORD') ?: '';
$dbname = getenv('SATBLOCKS_DB_NAME') ?: 'servidor_testes';

mysqli_report(MYSQLI_REPORT_OFF);

$conn = @new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    // Caso o banco falhe, usamos log JSON de contingência
    $con = null;
} else {
    $conn->set_charset("utf8mb4");
    $conn->query("SET time_zone = '-03:00'");
    $con = $conn;
}
?>
