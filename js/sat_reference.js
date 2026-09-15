/**
 * SatBlocks by BIPES - Guia Completo de Referência Pedagógica & MicroPython
 * Inspirado no Micro:bit Python Reference com foco na OBSAT e MicroPython ESP32.
 * Contém explicações aprofundadas, conceitos teóricos, boas práticas aeroespaciais
 * e o catálogo detalhado de TODOS os blocos do ecossistema SatBlocks.
 */

window.SatReference = (function() {
  'use strict';

  const topics = {
    // ==========================================
    // 1. LAÇOS DE REPETIÇÃO
    // ==========================================
    loops: {
      id: 'loops',
      title: 'Laços de Repetição (Loops)',
      subtitle: 'Controle de fluxo contínuo e repetição de tarefas no satélite',
      icon: '🔄',
      category: 'Laços de Repetição',
      summary: 'Laços (ou <i>loops</i>) são estruturas que instruem o microcontrolador a repetir um bloco de comandos várias vezes ou infinitamente. Em um satélite CubeSat, o laço principal de voo mantém a coleta contínua de sensores, a gravação de telemetria no cartão SD e a transmissão de pacotes para a estação de solo durante todo o tempo de operação.',
      conceptSections: [
        {
          title: 'Regra de Indentação em Python',
          type: 'controls_for_contagem',
          xml: '<block type="controls_for"><field name="VAR">contagem</field><value name="FROM"><block type="math_number"><field name="NUM">0</field></block></value><value name="TO"><block type="math_number"><field name="NUM">2</field></block></value><value name="BY"><block type="math_number"><field name="NUM">1</field></block></value><statement name="DO"><block type="text_print"><value name="TEXT"><block type="text"><field name="TEXT">Coletando amostra de voo...</field></block></value><next><block type="sat_wait"><field name="TIME">1</field><field name="UNIT">SEC</field></block></next></block></statement><next><block type="text_print"><value name="TEXT"><block type="text"><field name="TEXT">Sequência de amostragem finalizada!</field></block></value></block></next></block>',
          content: `
            <p>Diferente de outras linguagens que utilizam chaves <code>{}</code>, o Python define blocos de código através do <b>recuo visual (indentação)</b>, convencionado em <b>4 espaços</b>. Todas as linhas recuadas abaixo de uma estrutura de laço pertencem ao corpo da repetição.</p>
            <div class="sat-ref-code-box">
              <div class="sat-ref-code-content">
                <button class="btn-copy-snip" onclick="SatReference.copySnippet(this)">Copiar</button>
                <pre><code><span class="kw">for</span> contagem <span class="kw">in</span> <span class="fn">range</span>(<span class="num">3</span>):
    <span class="fn">print</span>(<span class="str">"Coletando amostra de voo..."</span>)  <span class="cm"># 4 espaços: executa 3 vezes</span>
    <span class="fn">time.sleep</span>(<span class="num">1</span>)
<span class="fn">print</span>(<span class="str">"Sequência de amostragem finalizada!"</span>) <span class="cm"># Sem recuo: executa apenas 1 vez</span></code></pre>
              </div>
            </div>
          `
        },
        {
          title: 'O Laço Principal de Voo (Loop Infinito)',
          type: 'controls_whileUntil',
          xml: '<block type="controls_whileUntil"><field name="MODE">WHILE</field><value name="BOOL"><block type="logic_boolean"><field name="BOOL">TRUE</field></block></value><statement name="DO"><block type="variables_set"><field name="VAR">temp</field><value name="VALUE"><block type="sat_sensor_bmp280_temp"></block></value><next><block type="sat_sd_write_log"><field name="FILENAME">telemetria.csv</field><value name="DATA"><block type="variables_get"><field name="VAR">temp</field></block></value><next><block type="sat_lora_send_packet"><value name="PAYLOAD"><block type="variables_get"><field name="VAR">temp</field></block></value><next><block type="sat_wait"><field name="TIME">1</field><field name="UNIT">SEC</field></block></next></block></next></block></next></block></statement></block>',
          content: `
            <p>O computador de bordo do satélite nunca deve parar de funcionar durante a órbita ou descida. Para isso, utilizamos o <code>while True:</code> (enquanto verdadeiro). Cada ciclo de repetição lê os sensores, grava no cartão SD, transmite via LoRa e faz uma pausa controlada com <code>time.sleep()</code> para poupar a bateria e não sobrecarregar a CPU.</p>
            <div class="sat-ref-code-box">
              <div class="sat-ref-code-content">
                <button class="btn-copy-snip" onclick="SatReference.copySnippet(this)">Copiar</button>
                <pre><code><span class="kw">while</span> <span class="kw">True</span>:
    temp = sensor_bmp.temperature
    gravar_sd(<span class="str">"telemetria.csv"</span>, temp)
    transmitir_lora(temp)
    <span class="fn">time.sleep</span>(<span class="num">1</span>)  <span class="cm"># Pausa de 1s entre ciclos de telemetria</span></code></pre>
              </div>
            </div>
          `
        }
      ],
      blocks: [
        {
          name: 'repita enquanto [condição] faça',
          type: 'controls_whileUntil',
          desc: 'Executa as instruções repetidamente enquanto a condição especificada permanecer verdadeira. Ao conectar o bloco booleano <code>verdadeiro</code>, cria o <b>laço infinito de missão</b>.',
          xml: '<block type="controls_whileUntil"><field name="MODE">WHILE</field><value name="BOOL"><block type="logic_boolean"><field name="BOOL">TRUE</field></block></value><statement name="DO"><block type="procedures_callnoreturn"><mutation name="coletar_sensores"></mutation><next><block type="sat_wait"><field name="TIME">1</field><field name="UNIT">SEC</field></block></next></block></statement></block>',
          python: `while True:\n    coletar_sensores()\n    time.sleep(1)`
        },
        {
          name: 'repita [N] vezes faça',
          type: 'controls_repeat_ext',
          desc: 'Executa o bloco interno por um número pré-definido e constante de repetições. Muito utilizado em sequências de inicialização, bips de alarme sonoro no buzzer ou calibração inicial.',
          xml: '<block type="controls_repeat_ext"><value name="TIMES"><block type="math_number"><field name="NUM">5</field></block></value><statement name="DO"><block type="sat_actuator_buzzer"><field name="PIN">25</field><field name="FREQ">2000</field><field name="DURATION">100</field><next><block type="sat_wait"><field name="TIME">100</field><field name="UNIT">MSEC</field></block></next></block></statement></block>',
          python: `for count in range(5):\n    buzzer.value(1)\n    time.sleep_ms(100)\n    buzzer.value(0)\n    time.sleep_ms(100)`
        },
        {
          name: 'contar com [i] de [início] até [fim] por [passo] faça',
          type: 'controls_for',
          desc: 'Laço numérico indexado por uma variável contadora. Permite controlar o ponto de partida, o limite e o incremento. Ideal para varredura de canais de rádio ou médias móveis.',
          xml: '<block type="controls_for"><field name="VAR">i</field><value name="FROM"><block type="math_number"><field name="NUM">1</field></block></value><value name="TO"><block type="math_number"><field name="NUM">10</field></block></value><value name="BY"><block type="math_number"><field name="NUM">1</field></block></value><statement name="DO"><block type="text_print"><value name="TEXT"><block type="text_join"><mutation items="2"></mutation><value name="ADD0"><block type="text"><field name="TEXT">Transmitindo pacote no canal: </field></block></value><value name="ADD1"><block type="variables_get"><field name="VAR">i</field></block></value></block></value></block></statement></block>',
          python: `for i in range(1, 11, 1):\n    print("Transmitindo pacote no canal:", i)`
        },
        {
          name: 'para cada item [i] na lista faça',
          type: 'controls_forEach',
          desc: 'Itera sequencialmente por todos os elementos de uma lista ou vetor de medições, atribuindo cada valor à variável local a cada repetição.',
          xml: '<block type="controls_forEach"><field name="VAR">leitura</field><value name="LIST"><block type="variables_get"><field name="VAR">historico_temperatura</field></block></value><statement name="DO"><block type="text_print"><value name="TEXT"><block type="text_join"><mutation items="2"></mutation><value name="ADD0"><block type="text"><field name="TEXT">Temperatura registrada: </field></block></value><value name="ADD1"><block type="variables_get"><field name="VAR">leitura</field></block></value></block></value></block></statement></block>',
          python: `for leitura in historico_temperatura:\n    print("Temperatura registrada:", leitura)`
        },
        {
          name: 'interromper / continuar no próximo laço',
          type: 'controls_flow_statements',
          desc: 'Instruções de controle de fluxo interno: <code>break</code> encerra o laço imediatamente ao detectar uma condição crítica; <code>continue</code> pula direto para a próxima iteração.',
          xml: '<block type="controls_if"><value name="IF0"><block type="logic_compare"><field name="OP">LT</field><value name="A"><block type="variables_get"><field name="VAR">pressao_hpa</field></block></value><value name="B"><block type="math_number"><field name="NUM">10</field></block></value></block></value><statement name="DO0"><block type="controls_flow_statements"><field name="FLOW">BREAK</field></block></statement></block>',
          python: `if pressao_hpa < 10.0:\n    break  # Apogeu atingido ou emergência: encerra o laço`
        }
      ]
    },

    // ==========================================
    // 2. LÓGICA & CONDIÇÃO
    // ==========================================
    logic: {
      id: 'logic',
      title: 'Lógica & Condição',
      subtitle: 'Tomada de decisão autônoma e controle de estados no computador de bordo',
      icon: '🧠',
      category: 'Lógica & Condição',
      summary: 'Estruturas condicionais permitem que o satélite tome decisões autônomas com base em regras lógicas e leituras de sensores ambientais. Por exemplo: acionar o sistema de ejeção do paraquedas apenas quando a altitude começar a cair após o apogeu.',
      conceptSections: [
        {
          title: 'Decisão Condicional (if / elif / else)',
          type: 'controls_if',
          xml: '<block type="variables_set"><field name="VAR">altitude_m</field><value name="VALUE"><block type="math_number"><field name="NUM">1200</field></block></value><next><block type="controls_if"><mutation elseif="1" else="1"></mutation><value name="IF0"><block type="logic_compare"><field name="OP">GT</field><value name="A"><block type="variables_get"><field name="VAR">altitude_m</field></block></value><value name="B"><block type="math_number"><field name="NUM">1000</field></block></value></block></value><statement name="DO0"><block type="variables_set"><field name="VAR">fase_missao</field><value name="VALUE"><block type="text"><field name="TEXT">ESTRATOSFERA</field></block></value></block></statement><value name="IF1"><block type="logic_compare"><field name="OP">GT</field><value name="A"><block type="variables_get"><field name="VAR">altitude_m</field></block></value><value name="B"><block type="math_number"><field name="NUM">100</field></block></value></block></value><statement name="DO1"><block type="variables_set"><field name="VAR">fase_missao</field><value name="VALUE"><block type="text"><field name="TEXT">VOO_ASCENDENTE</field></block></value></block></statement><statement name="ELSE"><block type="variables_set"><field name="VAR">fase_missao</field><value name="VALUE"><block type="text"><field name="TEXT">SOLO</field></block></value></block></statement><next><block type="text_print"><value name="TEXT"><block type="text_join"><mutation items="2"></mutation><value name="ADD0"><block type="text"><field name="TEXT">Fase da Missao: </field></block></value><value name="ADD1"><block type="variables_get"><field name="VAR">fase_missao</field></block></value></block></value></block></next></block></next></block>',
          content: `
            <p>O comando <code>if</code> testa se uma expressão é verdadeira (<code>True</code>). Se for, executa o bloco indentado. O <code>elif</code> (abreviação de <i>else if</i>) avalia condições alternativas, e o <code>else</code> é executado caso nenhuma das condições anteriores tenha sido satisfeita.</p>
            <div class="sat-ref-code-box">
              <div class="sat-ref-code-content">
                <button class="btn-copy-snip" onclick="SatReference.copySnippet(this)">Copiar</button>
                <pre><code>altitude_m = <span class="num">1200</span>
<span class="kw">if</span> altitude_m > <span class="num">1000</span>:
    fase_missao = <span class="str">"ESTRATOSFERA"</span>
<span class="kw">elif</span> altitude_m > <span class="num">100</span>:
    fase_missao = <span class="str">"VOO_ASCENDENTE"</span>
<span class="kw">else</span>:
    fase_missao = <span class="str">"SOLO"</span>
<span class="fn">print</span>(<span class="str">"Fase da Missao:"</span>, fase_missao)</code></pre>
              </div>
            </div>
          `
        },
        {
          title: 'Operadores Lógicos e Comparações',
          content: `
            <p>Permitem combinar múltiplas checagens de segurança antes de disparar atuadores críticos:</p>
            <ul>
              <li><code>==</code> (igual a), <code>!=</code> (diferente de), <code>&gt;</code> (maior), <code>&lt;</code> (menor), <code>&gt;=</code>, <code>&lt;=</code></li>
              <li><code>and</code>: verdadeiro apenas se <b>ambas</b> as condições forem verdadeiras.</li>
              <li><code>or</code>: verdadeiro se <b>pelo menos uma</b> condição for verdadeira.</li>
              <li><code>not</code>: inverte o valor lógico (transforma <code>True</code> em <code>False</code>).</li>
            </ul>
          `
        }
      ],
      blocks: [
        {
          name: 'se [condição] faça ... senão se ... senão',
          type: 'controls_if',
          desc: 'Bloco de decisão mutável que permite encadear múltiplos ramos <code>se</code>, <code>senão se</code> e <code>senão</code> para classificar o estado da missão.',
          xml: '<block type="variables_set"><field name="VAR">tensao_bateria</field><value name="VALUE"><block type="math_number"><field name="NUM">3.6</field></block></value><next><block type="controls_if"><mutation elseif="1" else="1"></mutation><value name="IF0"><block type="logic_compare"><field name="OP">LT</field><value name="A"><block type="variables_get"><field name="VAR">tensao_bateria</field></block></value><value name="B"><block type="math_number"><field name="NUM">3.3</field></block></value></block></value><statement name="DO0"><block type="text_print"><value name="TEXT"><block type="text"><field name="TEXT">Modo Seguro</field></block></value></block></statement><value name="IF1"><block type="logic_compare"><field name="OP">LT</field><value name="A"><block type="variables_get"><field name="VAR">tensao_bateria</field></block></value><value name="B"><block type="math_number"><field name="NUM">3.7</field></block></value></block></value><statement name="DO1"><block type="text_print"><value name="TEXT"><block type="text"><field name="TEXT">Modo Economia</field></block></value></block></statement><statement name="ELSE"><block type="text_print"><value name="TEXT"><block type="text"><field name="TEXT">Modo Nominal</field></block></value></block></statement></block></next></block>',
          python: `tensao_bateria = 3.6\nif tensao_bateria < 3.3:\n    print("Modo Seguro")\nelif tensao_bateria < 3.7:\n    print("Modo Economia")\nelse:\n    print("Modo Nominal")`
        },
        {
          name: '[valor 1] >= [valor 2] (Comparação)',
          type: 'logic_compare',
          desc: 'Compara dois valores numéricos ou strings utilizando operadores matemáticos (<code>==</code>, <code>!=</code>, <code>&lt;</code>, <code>&lt;=</code>, <code>&gt;</code>, <code>&gt;=</code>). Retorna um booleano.',
          xml: '<block type="variables_set"><field name="VAR">status_apogeu</field><value name="VALUE"><block type="logic_compare"><field name="OP">GTE</field><value name="A"><block type="variables_get"><field name="VAR">altitude_m</field></block></value><value name="B"><block type="math_number"><field name="NUM">500</field></block></value></block></value></block>',
          python: `status_apogeu = (altitude_m >= 500)`
        },
        {
          name: '[condição 1] e [condição 2] (Operador Lógico and / or)',
          type: 'logic_operation',
          desc: 'Combina duas condições booleanas utilizando a conjunção lógica <code>and</code> (E) ou disjunção <code>or</code> (OU).',
          xml: '<block type="variables_set"><field name="VAR">condicao_segura</field><value name="VALUE"><block type="logic_operation"><field name="OP">AND</field><value name="A"><block type="logic_compare"><field name="OP">LT</field><value name="A"><block type="variables_get"><field name="VAR">pressao</field></block></value><value name="B"><block type="math_number"><field name="NUM">900</field></block></value></block></value><value name="B"><block type="logic_compare"><field name="OP">GT</field><value name="A"><block type="variables_get"><field name="VAR">temperatura</field></block></value><value name="B"><block type="math_number"><field name="NUM">-20</field></block></value></block></value></block></value></block>',
          python: `condicao_segura = (pressao < 900) and (temperatura > -20)`
        },
        {
          name: 'não [booleano] (Negação not)',
          type: 'logic_negate',
          desc: 'Negação lógica (<code>not</code>). Inverte o valor booleano da expressão conectada.',
          xml: '<block type="variables_set"><field name="VAR">erro_sd</field><value name="VALUE"><block type="logic_negate"><value name="BOOL"><block type="variables_get"><field name="VAR">status_sd_ok</field></block></value></block></value></block>',
          python: `erro_sd = not status_sd_ok`
        },
        {
          name: 'verdadeiro / falso (Booleano)',
          type: 'logic_boolean',
          desc: 'Constante lógica fundamental (<code>True</code> ou <code>False</code>). Usada em flags de estado e laços contínuos.',
          xml: '<block type="variables_set"><field name="VAR">sistema_ativo</field><value name="VALUE"><block type="logic_boolean"><field name="BOOL">TRUE</field></block></value></block>',
          python: `sistema_ativo = True`
        },
        {
          name: 'nulo (None)',
          type: 'logic_null',
          desc: 'Representa a ausência de valor ou objeto não inicializado (<code>None</code> em Python).',
          xml: '<block type="variables_set"><field name="VAR">dados_sensor</field><value name="VALUE"><block type="logic_null"></block></value></block>',
          python: `dados_sensor = None`
        },
        {
          name: 'testar [condição] se verdadeiro [A] se falso [B] (Ternário)',
          type: 'logic_ternary',
          desc: 'Operador ternário inline. Retorna o valor [A] se a condição for satisfeita, caso contrário retorna [B].',
          xml: '<block type="variables_set"><field name="VAR">status_temp</field><value name="VALUE"><block type="logic_ternary"><value name="IF"><block type="logic_compare"><field name="OP">GT</field><value name="A"><block type="variables_get"><field name="VAR">temp</field></block></value><value name="B"><block type="math_number"><field name="NUM">50</field></block></value></block></value><value name="THEN"><block type="text"><field name="TEXT">CRITICA</field></block></value><value name="ELSE"><block type="text"><field name="TEXT">NORMAL</field></block></value></block></value></block>',
          python: `status_temp = ("CRITICA" if temp > 50 else "NORMAL")`
        }
      ]
    },

    // ==========================================
    // 3. MATEMÁTICA & CÁLCULOS
    // ==========================================
    math: {
      id: 'math',
      title: 'Matemática & Cálculos',
      subtitle: 'Fórmulas físicas, conversão de unidades e calibração de sensores',
      icon: '🔢',
      category: 'Matemática & Cálculos',
      summary: 'Os sensores do satélite fornecem grandezas analógicas brutas que precisam ser convertidas em unidades físicas padrão (graus Celsius, hectopascais, metros de altitude, aceleração em G e porcentagem de bateria). As operações matemáticas realizam essas transformações em tempo real.',
      conceptSections: [
        {
          title: 'Cálculo da Altitude pela Pressão Barométrica',
          type: 'variables_set',
          xml: '<block type="variables_set"><field name="VAR">altitude</field><value name="VALUE"><block type="math_arithmetic"><field name="OP">MULTIPLY</field><value name="A"><block type="math_number"><field name="NUM">44330</field></block></value><value name="B"><block type="math_arithmetic"><field name="OP">MINUS</field><value name="A"><block type="math_number"><field name="NUM">1</field></block></value><value name="B"><block type="math_arithmetic"><field name="OP">POWER</field><value name="A"><block type="math_arithmetic"><field name="OP">DIVIDE</field><value name="A"><block type="variables_get"><field name="VAR">pressao_hpa</field></block></value><value name="B"><block type="math_number"><field name="NUM">1013.25</field></block></value></block></value><value name="B"><block type="math_number"><field name="NUM">0.19029</field></block></value></block></value></block></value></block></value><next><block type="variables_set"><field name="VAR">altitude</field><value name="VALUE"><block type="math_round"><field name="OP">ROUND</field><value name="NUM"><block type="variables_get"><field name="VAR">altitude</field></block></value></block></value></block></next></block>',
          content: `
            <p>A fórmula barométrica internacional calcula a altitude estimada através da pressão atmosférica medida pelo sensor BMP280 comparada à pressão no nível do mar (1013.25 hPa):</p>
            <div class="sat-ref-code-box">
              <div class="sat-ref-code-content">
                <button class="btn-copy-snip" onclick="SatReference.copySnippet(this)">Copiar</button>
                <pre><code><span class="cm"># Fórmula barométrica: altitude = 44330 * (1 - (P / P0) ** (1/5.255))</span>
altitude = <span class="num">44330.0</span> * (<span class="num">1.0</span> - (pressao_hpa / <span class="num">1013.25</span>) ** (<span class="num">1.0</span> / <span class="num">5.255</span>))
altitude = <span class="fn">round</span>(altitude, <span class="num">2</span>)  <span class="cm"># Arredonda para 2 casas decimais</span></code></pre>
              </div>
            </div>
          `
        }
      ],
      blocks: [
        {
          name: '[número]',
          type: 'math_number',
          desc: 'Constante numérica inteira ou de ponto flutuante (ex.: <code>1013.25</code>, <code>42</code>, <code>3.3</code>).',
          xml: '<block type="math_number"><field name="NUM">42</field></block>',
          python: `42`
        },
        {
          name: '[A] + [B] (Operações Aritméticas)',
          type: 'math_arithmetic',
          desc: 'Executa operações aritméticas básicas (+, -, ×, ÷, ^) entre dois valores.',
          xml: '<block type="math_arithmetic"><field name="OP">ADD</field><value name="A"><block type="math_number"><field name="NUM">10</field></block></value><value name="B"><block type="math_number"><field name="NUM">5</field></block></value></block>',
          python: `10 + 5`
        },
        {
          name: 'seno / cosseno / tangente / asin / acos / atan',
          type: 'math_trig',
          desc: 'Funções trigonométricas do módulo <code>math</code> em radianos. Essenciais para cálculos de atitude e navegação orbital.',
          xml: '<block type="math_trig"><field name="OP">SIN</field><value name="NUM"><block type="math_number"><field name="NUM">45</field></block></value></block>',
          python: `import math\nmath.sin(45)`
        },
        {
          name: 'constantes: π, e, φ, raiz(2), ∞',
          type: 'math_constant',
          desc: 'Constantes matemáticas universais de alta precisão (ex: <code>math.pi</code> = 3.14159...).',
          xml: '<block type="math_constant"><field name="CONSTANT">PI</field></block>',
          python: `import math\nmath.pi`
        },
        {
          name: 'arredondar [número] (round / ceil / floor)',
          type: 'math_round',
          desc: 'Arredonda valores decimais para o inteiro mais próximo (<code>round</code>), arredonda para cima (<code>math.ceil</code>) ou para baixo (<code>math.floor</code>).',
          xml: '<block type="math_round"><field name="OP">ROUND</field><value name="NUM"><block type="math_number"><field name="NUM">3.14159</field></block></value></block>',
          python: `round(3.14159)`
        },
        {
          name: 'resto da divisão de [A] ÷ [B]',
          type: 'math_modulo',
          desc: 'Operador módulo (<code>%</code>). Retorna o resto da divisão inteira. Muito útil para acionar tarefas a cada N iterações.',
          xml: '<block type="math_modulo"><value name="DIVIDEND"><block type="variables_get"><field name="VAR">contador</field></block></value><value name="DIVISOR"><block type="math_number"><field name="NUM">5</field></block></value></block>',
          python: `contador % 5`
        },
        {
          name: 'restringir [X] entre [mín] e [máx]',
          type: 'math_constrain',
          desc: 'Limita um valor dentro de um intervalo de segurança, evitando leituras de saturação ou comandos fora da faixa.',
          xml: '<block type="math_constrain"><value name="VALUE"><block type="variables_get"><field name="VAR">pwm_valor</field></block></value><value name="LOW"><block type="math_number"><field name="NUM">0</field></block></value><value name="HIGH"><block type="math_number"><field name="NUM">1023</field></block></value></block>',
          python: `min(max(pwm_valor, 0), 1023)`
        },
        {
          name: 'número aleatório de [mín] até [máx]',
          type: 'math_random_int',
          desc: 'Gera um valor inteiro pseudoaleatório utilizando a biblioteca <code>random</code> do MicroPython.',
          xml: '<block type="math_random_int"><value name="FROM"><block type="math_number"><field name="NUM">1</field></block></value><value name="TO"><block type="math_number"><field name="NUM">100</field></block></value></block>',
          python: `import random\nrandom.randint(1, 100)`
        }
      ]
    },

    // ==========================================
    // 4. TEXTOS & MENSAGENS
    // ==========================================
    text: {
      id: 'text',
      title: 'Textos & Mensagens (Strings)',
      subtitle: 'Formatação de logs, mensagens de telemetria e saída serial',
      icon: '📝',
      category: 'Textos & Mensagens',
      summary: 'Strings são sequências de caracteres alfanuméricos. Na OBSAT, são usadas para formatar linhas legíveis de log CSV, criar nomes de arquivos no cartão SD, montar mensagens LoRa e imprimir diagnósticos no Terminal REPL do SatBlocks.',
      conceptSections: [
        {
          title: 'Concatenação e Conversão com str()',
          type: 'variables_set',
          xml: '<block type="variables_set"><field name="VAR">temp</field><value name="VALUE"><block type="math_number"><field name="NUM">24.5</field></block></value><next><block type="variables_set"><field name="VAR">msg</field><value name="VALUE"><block type="text_join"><mutation items="3"></mutation><value name="ADD0"><block type="text"><field name="TEXT">Temperatura atual: </field></block></value><value name="ADD1"><block type="variables_get"><field name="VAR">temp</field></block></value><value name="ADD2"><block type="text"><field name="TEXT"> C</field></block></value></block></value><next><block type="text_print"><value name="TEXT"><block type="variables_get"><field name="VAR">msg</field></block></value></block></next></block></next></block>',
          content: `
            <p>No Python, não podemos somar diretamente um texto com um número sem antes converter o número para string com a função <code>str()</code>:</p>
            <div class="sat-ref-code-box">
              <div class="sat-ref-code-content">
                <button class="btn-copy-snip" onclick="SatReference.copySnippet(this)">Copiar</button>
                <pre><code>temp = <span class="num">24.5</span>
<span class="cm"># Concatenação correta:</span>
msg = <span class="str">"Temperatura atual: "</span> + <span class="fn">str</span>(temp) + <span class="str">" C"</span>
<span class="fn">print</span>(msg)</code></pre>
              </div>
            </div>
          `
        }
      ],
      blocks: [
        {
          name: '"texto"',
          type: 'text',
          desc: 'Cria uma cadeia de texto delimitada por aspas duplas.',
          xml: '<block type="text"><field name="TEXT">Equipe 41 - OBSAT</field></block>',
          python: `"Equipe 41 - OBSAT"`
        },
        {
          name: 'criar texto com [rótulo] [variável/sensor]',
          type: 'text_join',
          desc: 'Concatena múltiplos textos e valores numéricos em uma única string contínua, permitindo combinar rótulos de texto com variáveis e leituras de sensores.',
          xml: '<block type="text_join"><mutation items="2"></mutation><value name="ADD0"><block type="text"><field name="TEXT">Temperatura registrada: </field></block></value><value name="ADD1"><block type="variables_get"><field name="VAR">leitura</field></block></value></block>',
          python: `str("Temperatura registrada: ") + str(leitura)`
        },
        {
          name: 'tamanho do texto [string]',
          type: 'text_length',
          desc: 'Retorna a quantidade total de caracteres presentes no texto com <code>len()</code>.',
          xml: '<block type="text_length"><value name="VALUE"><block type="variables_get"><field name="VAR">pacote_telemetria</field></block></value></block>',
          python: `len(pacote_telemetria)`
        },
        {
          name: 'em [texto] obter letra nº [pos]',
          type: 'text_charAt',
          desc: 'Extrai um caractere específico em uma posição indexada da string.',
          xml: '<block type="text_charAt"><mutation at="true"></mutation><field name="WHERE">FROM_START</field><value name="VALUE"><block type="variables_get"><field name="VAR">linha_csv</field></block></value><value name="AT"><block type="math_number"><field name="NUM">1</field></block></value></block>',
          python: `linha_csv[0]`
        },
        {
          name: 'para [maiúsculas / minúsculas]',
          type: 'text_changeCase',
          desc: 'Converte todos os caracteres do texto para maiúsculas (<code>.upper()</code>) ou minúsculas (<code>.lower()</code>).',
          xml: '<block type="text_changeCase"><field name="CASE">UPPERCASE</field><value name="TEXT"><block type="variables_get"><field name="VAR">comando</field></block></value></block>',
          python: `comando.upper()`
        },
        {
          name: 'imprimir [texto com rótulo e valor] (print)',
          type: 'text_print',
          desc: 'Envia mensagens formatadas combinando rótulos de texto e leituras de variáveis/sensores (usando o bloco <code>criar texto com</code>) para o Console REPL da IDE.',
          xml: '<block type="text_print"><value name="TEXT"><block type="text_join"><mutation items="2"></mutation><value name="ADD0"><block type="text"><field name="TEXT">Temperatura registrada: </field></block></value><value name="ADD1"><block type="variables_get"><field name="VAR">leitura</field></block></value></block></value></block>',
          python: `print("Temperatura registrada:", leitura)`
        }
      ]
    },

    // ==========================================
    // 5. LISTAS & COLEÇÕES
    // ==========================================
    lists: {
      id: 'lists',
      title: 'Listas & Vetores',
      subtitle: 'Armazenamento estruturado de dados de sensores e matrizes',
      icon: '📑',
      category: 'Listas & Coleções',
      summary: 'Listas são coleções ordenadas de elementos que podem conter números, textos ou outros objetos. No satélite, são fundamentais para armazenar vetores tridimensionais (eixos X, Y, Z da IMU), séries temporais de sensores e coordenadas GPS.',
      conceptSections: [
        {
          title: 'Vetores de Sensores Tridimensionais',
          type: 'variables_set',
          xml: '<block type="variables_set"><field name="VAR">vetor_acel</field><value name="VALUE"><block type="lists_create_with"><mutation items="3"></mutation><value name="ADD0"><block type="math_number"><field name="NUM">0.12</field></block></value><value name="ADD1"><block type="math_number"><field name="NUM">-0.05</field></block></value><value name="ADD2"><block type="math_number"><field name="NUM">0.98</field></block></value></block></value><next><block type="variables_set"><field name="VAR">eixo_x</field><value name="VALUE"><block type="lists_getIndex"><mutation statement="false" at="true"></mutation><field name="MODE">GET</field><field name="WHERE">FROM_START</field><value name="VALUE"><block type="variables_get"><field name="VAR">vetor_acel</field></block></value><value name="AT"><block type="math_number"><field name="NUM">1</field></block></value></block></value><next><block type="variables_set"><field name="VAR">eixo_y</field><value name="VALUE"><block type="lists_getIndex"><mutation statement="false" at="true"></mutation><field name="MODE">GET</field><field name="WHERE">FROM_START</field><value name="VALUE"><block type="variables_get"><field name="VAR">vetor_acel</field></block></value><value name="AT"><block type="math_number"><field name="NUM">2</field></block></value></block></value><next><block type="variables_set"><field name="VAR">eixo_z</field><value name="VALUE"><block type="lists_getIndex"><mutation statement="false" at="true"></mutation><field name="MODE">GET</field><field name="WHERE">FROM_START</field><value name="VALUE"><block type="variables_get"><field name="VAR">vetor_acel</field></block></value><value name="AT"><block type="math_number"><field name="NUM">3</field></block></value></block></value><next><block type="text_print"><value name="TEXT"><block type="text_join"><mutation items="2"></mutation><value name="ADD0"><block type="text"><field name="TEXT">Aceleração Z: </field></block></value><value name="ADD1"><block type="variables_get"><field name="VAR">eixo_z</field></block></value></block></value></block></next></block></next></block></next></block></next></block>',
          content: `
            <p>O acelerômetro e o giroscópio do sensor MPU9250 retornam vetores de 3 eixos indexados a partir de zero <code>[0, 1, 2]</code>:</p>
            <div class="sat-ref-code-box">
              <div class="sat-ref-code-content">
                <button class="btn-copy-snip" onclick="SatReference.copySnippet(this)">Copiar</button>
                <pre><code>vetor_acel = [<span class="num">0.12</span>, <span class="num">-0.05</span>, <span class="num">0.98</span>]  <span class="cm"># [X, Y, Z] em G</span>
eixo_x = vetor_acel[<span class="num">0</span>]
eixo_y = vetor_acel[<span class="num">1</span>]
eixo_z = vetor_acel[<span class="num">2</span>]
<span class="fn">print</span>(<span class="str">"Aceleração Z:"</span>, eixo_z)</code></pre>
              </div>
            </div>
          `
        }
      ],
      blocks: [
        {
          name: 'criar lista vazia',
          type: 'lists_create_empty',
          desc: 'Inicializa uma lista vazia pronta para receber dados durante a missão.',
          xml: '<block type="lists_create_empty"></block>',
          python: `historico = []`
        },
        {
          name: 'criar lista com [item 1] [item 2] ...',
          type: 'lists_create_with',
          desc: 'Cria uma lista pré-populada com elementos definidos.',
          xml: '<block type="lists_create_with"><mutation items="3"></mutation><value name="ADD0"><block type="math_number"><field name="NUM">0</field></block></value><value name="ADD1"><block type="math_number"><field name="NUM">0</field></block></value><value name="ADD2"><block type="math_number"><field name="NUM">0</field></block></value></block>',
          python: `vetor_giroscopio = [0, 0, 0]`
        },
        {
          name: 'tamanho da lista [lista]',
          type: 'lists_length',
          desc: 'Retorna a quantidade de itens presentes na lista com <code>len()</code>.',
          xml: '<block type="lists_length"><value name="VALUE"><block type="variables_get"><field name="VAR">buffer_telemetria</field></block></value></block>',
          python: `len(buffer_telemetria)`
        },
        {
          name: 'na lista [L] obter item nº [i]',
          type: 'lists_getIndex',
          desc: 'Recupera o valor armazenado na posição especificada da lista (indexação com base 1 no bloco visual, adaptada para base 0 no Python).',
          xml: '<block type="lists_getIndex"><mutation statement="false" at="true"></mutation><field name="MODE">GET</field><field name="WHERE">FROM_START</field><value name="VALUE"><block type="variables_get"><field name="VAR">vetor_adcs</field></block></value><value name="AT"><block type="math_number"><field name="NUM">1</field></block></value></block>',
          python: `vetor_adcs[0]`
        },
        {
          name: 'na lista [L] definir item nº [i] como [valor]',
          type: 'lists_setIndex',
          desc: 'Substitui ou insere um elemento na lista.',
          xml: '<block type="lists_setIndex"><mutation at="true"></mutation><field name="MODE">SET</field><field name="WHERE">FROM_START</field><value name="LIST"><block type="variables_get"><field name="VAR">leituras_temp</field></block></value><value name="AT"><block type="math_number"><field name="NUM">1</field></block></value><value name="TO"><block type="math_number"><field name="NUM">25</field></block></value></block>',
          python: `leituras_temp[0] = 25`
        }
      ]
    },

    // ==========================================
    // 6. TEMPORIZAÇÃO & RELÓGIO
    // ==========================================
    timing: {
      id: 'timing',
      title: 'Temporização & Relógio (time)',
      subtitle: 'Controle de delays, agendamento de tarefas e medição de tempo de voo',
      icon: '⏱️',
      category: 'Temporização & Relógio',
      summary: 'O módulo <code>time</code> do MicroPython é o coração do sincronismo no CubeSat. Ele permite agendar transmissões periódicas, medir o tempo decorrido desde o lançamento (Timestamp de Missão) e criar pausas precisas em milissegundos sem congelar a execução.',
      conceptSections: [
        {
          title: 'Diferença entre time.sleep() e time.ticks_ms()',
          type: 'variables_set',
          xml: '<block type="variables_set"><field name="VAR">inicio</field><value name="VALUE"><block type="utime.vars"><field name="VARS">ticks_ms</field></block></value><next><block type="controls_whileUntil"><field name="MODE">WHILE</field><value name="BOOL"><block type="logic_boolean"><field name="BOOL">TRUE</field></block></value><statement name="DO"><block type="controls_if"><value name="IF0"><block type="logic_compare"><field name="OP">GTE</field><value name="A"><block type="math_arithmetic"><field name="OP">MINUS</field><value name="A"><block type="utime.vars"><field name="VARS">ticks_ms</field></block></value><value name="B"><block type="variables_get"><field name="VAR">inicio</field></block></value></block></value><value name="B"><block type="math_number"><field name="NUM">1000</field></block></value></block></value><statement name="DO0"><block type="text_print"><value name="TEXT"><block type="text"><field name="TEXT">1 segundo se passou!</field></block></value><next><block type="variables_set"><field name="VAR">inicio</field><value name="VALUE"><block type="utime.vars"><field name="VARS">ticks_ms</field></block></value></block></next></block></statement></block></statement></block></next></block>',
          content: `
            <p>O <code>time.sleep(1)</code> pausa a CPU por 1 segundo (bloqueante). Já o <code>time.ticks_ms()</code> retorna a contagem de milissegundos do microcontrolador sem travar a CPU, permitindo executar tarefas em paralelo (temporizador não-bloqueante):</p>
            <div class="sat-ref-code-box">
              <div class="sat-ref-code-content">
                <button class="btn-copy-snip" onclick="SatReference.copySnippet(this)">Copiar</button>
                <pre><code><span class="kw">import</span> time
inicio = <span class="fn">time.ticks_ms</span>()
<span class="cm"># Executa laço sem travar:</span>
<span class="kw">while</span> <span class="kw">True</span>:
    <span class="kw">if</span> <span class="fn">time.ticks_diff</span>(<span class="fn">time.ticks_ms</span>(), inicio) >= <span class="num">1000</span>:
        <span class="fn">print</span>(<span class="str">"1 segundo se passou!"</span>)
        inicio = <span class="fn">time.ticks_ms</span>()</code></pre>
              </div>
            </div>
          `
        }
      ],
      blocks: [
        {
          name: '⏱️ Aguardar [N] segundos / ms',
          type: 'sat_wait',
          desc: 'Pausa a execução do computador de bordo pelo tempo especificado em segundos ou milissegundos.',
          xml: '<block type="sat_wait"><field name="TIME">1</field><field name="UNIT">SEC</field></block>',
          python: `import time\ntime.sleep(1)`
        },
        {
          name: '⏱️ Atrasar / Pausar (BIPES delay)',
          type: 'delay',
          desc: 'Bloco de atraso oficial do BIPES com suporte a segundos, ms e microssegundos.',
          xml: '<block type="delay"><field name="SCALE">sleep</field><value name="TIME"><block type="math_number"><field name="NUM">1</field></block></value></block>',
          python: `import time\ntime.sleep(1)`
        },
        {
          name: '⏱️ Obter Contador de Tempo (utime.vars)',
          type: 'utime.vars',
          desc: 'Retorna a contagem atual de milissegundos (ticks_ms) ou segundos desde a inicialização.',
          xml: '<block type="utime.vars"><field name="VARS">ticks_ms</field></block>',
          python: `import time\ntime.ticks_ms()`
        }
      ]
    },

    // ==========================================
    // 7. PYTHON AVANÇADO
    // ==========================================
    python_adv: {
      id: 'python_adv',
      title: 'Python & Recursos Avançados',
      subtitle: 'Tratamento de exceções (try/except), código nativo e tolerância a falhas',
      icon: '🐍',
      category: 'Python & Avançado',
      summary: 'No ambiente hostil da estratosfera ou do espaço, falhas de comunicação ou ruídos elétricos em sensores podem ocorrer a qualquer instante. O tratamento de exceções com <code>try/except</code> garante que o satélite nunca trave, continuando o voo com segurança.',
      conceptSections: [
        {
          title: 'Tolerância a Falhas Aeroespaciais com try / except',
          type: 'try_catch',
          xml: '<block type="try_catch"><statement name="main_code"><block type="variables_set"><field name="VAR">temp</field><value name="VALUE"><block type="sat_sensor_bmp280_temp"></block></value></block></statement><statement name="catch_code"><block type="text_print"><value name="TEXT"><block type="text_join"><mutation items="2"></mutation><value name="ADD0"><block type="text"><field name="TEXT">[ALERTA] Falha de leitura no BMP280: </field></block></value><value name="ADD1"><block type="variables_get"><field name="VAR">e</field></block></value></block></value><next><block type="variables_set"><field name="VAR">temp</field><value name="VALUE"><block type="math_number"><field name="NUM">0</field></block></value></block></next></block></statement></block>',
          content: `
            <p>Se um sensor falhar fisicamente durante a subida, um código sem proteção travaria o satélite inteiro. Com o bloco <code>try/except</code>, o erro é capturado, registrado no log e a missão continua operando normalmente:</p>
            <div class="sat-ref-code-box">
              <div class="sat-ref-code-content">
                <button class="btn-copy-snip" onclick="SatReference.copySnippet(this)">Copiar</button>
                <pre><code><span class="kw">try</span>:
    temp = sensor_bmp.temperature
<span class="kw">except</span> <span class="kw">Exception</span> <span class="kw">as</span> e:
    <span class="fn">print</span>(<span class="str">"[ALERTA] Falha de leitura no BMP280:"</span>, e)
    temp = <span class="num">0.0</span>  <span class="cm"># Valor seguro padrão</span></code></pre>
              </div>
            </div>
          `
        }
      ],
      blocks: [
        {
          name: 'Tentar (try) ... Se Falhar (except)',
          type: 'try_catch',
          desc: 'Envolve comandos críticos em uma camada de proteção defensiva contra falhas de hardware ou rede.',
          xml: '<block type="try_catch"><statement name="main_code"><block type="text_print"><value name="TEXT"><block type="text"><field name="TEXT">Lendo sensores...</field></block></value></block></statement><statement name="catch_code"><block type="text_print"><value name="TEXT"><block type="text_join"><mutation items="2"></mutation><value name="ADD0"><block type="text"><field name="TEXT">Falha tratada com seguranca: </field></block></value><value name="ADD1"><block type="variables_get"><field name="VAR">e</field></block></value></block></value></block></statement></block>',
          python: `try:\n    print("Lendo sensores...")\nexcept Exception as e:\n    print("Falha tratada com seguranca:", e)`
        },
        {
          name: 'Executar Código Python Direto (exec_python)',
          type: 'exec_python',
          desc: 'Permite injetar qualquer instrução nativa do MicroPython diretamente dentro do fluxo de blocos.',
          xml: '<block type="exec_python"><value name="command"><block type="text"><field name="TEXT">import gc; gc.collect()</field></block></value></block>',
          python: `import gc\ngc.collect()`
        },
        {
          name: 'Executar Expressão Python com Retorno (exec_python_output)',
          type: 'exec_python_output',
          desc: 'Executa uma expressão MicroPython nativa e atribui o resultado retornado a uma variável.',
          xml: '<block type="variables_set"><field name="VAR">memoria_livre</field><value name="VALUE"><block type="exec_python_output"><value name="command"><block type="text"><field name="TEXT">gc.mem_free()</field></block></value></block></value></block>',
          python: `memoria_livre = gc.mem_free()`
        }
      ]
    },

    // ==========================================
    // 8. VARIÁVEIS
    // ==========================================
    variables: {
      id: 'variables',
      title: 'Variáveis & Estado',
      subtitle: 'Memória volátil para armazenar grandezas de voo e parâmetros de missão',
      icon: '📦',
      category: 'Variáveis',
      summary: 'Variáveis são identificadores que armazenam dados na memória RAM do microcontrolador durante a execução do programa. São usadas para guardar leituras de sensores, contadores de pacotes, estados de voo e configurações da equipe.',
      conceptSections: [
        {
          title: 'Boas Práticas de Nomenclatura e Estado de Voo',
          type: 'variables_set',
          xml: '<block type="variables_set"><field name="VAR">altitude_atual</field><value name="VALUE"><block type="math_number"><field name="NUM">850.5</field></block></value><next><block type="variables_set"><field name="VAR">contador_pacotes</field><value name="VALUE"><block type="math_number"><field name="NUM">1</field></block></value><next><block type="variables_set"><field name="VAR">tensao_bateria_v</field><value name="VALUE"><block type="math_number"><field name="NUM">4.12</field></block></value><next><block type="text_print"><value name="TEXT"><block type="text_join"><mutation items="4"></mutation><value name="ADD0"><block type="text"><field name="TEXT">Status de Voo - Alt: </field></block></value><value name="ADD1"><block type="variables_get"><field name="VAR">altitude_atual</field></block></value><value name="ADD2"><block type="text"><field name="TEXT"> m | Pacote: </field></block></value><value name="ADD3"><block type="variables_get"><field name="VAR">contador_pacotes</field></block></value></block></value></block></next></block></next></block></next></block>',
          content: `
            <p>No Python, utilize nomes descritivos em minúsculas separados por sublinhado (padrão <i>snake_case</i>) para registrar grandezas de voo e parâmetros:</p>
            <div class="sat-ref-code-box">
              <div class="sat-ref-code-content">
                <button class="btn-copy-snip" onclick="SatReference.copySnippet(this)">Copiar</button>
                <pre><code>altitude_atual = <span class="num">850.5</span>
contador_pacotes = <span class="num">1</span>
tensao_bateria_v = <span class="num">4.12</span>
<span class="fn">print</span>(<span class="str">"Status de Voo - Alt: "</span> + <span class="fn">str</span>(altitude_atual) + <span class="str">" m | Pacote: "</span> + <span class="fn">str</span>(contador_pacotes))</code></pre>
              </div>
            </div>
          `
        }
      ],
      blocks: [
        {
          name: 'definir [variável] para [valor]',
          type: 'variables_set',
          desc: 'Atribui um valor numérico, string ou objeto a uma variável na memória.',
          xml: '<block type="variables_set"><field name="VAR">altitude_apogeu</field><value name="VALUE"><block type="math_number"><field name="NUM">1250.4</field></block></value></block>',
          python: `altitude_apogeu = 1250.4`
        },
        {
          name: '[variável]',
          type: 'variables_get',
          desc: 'Recupera o valor atualmente armazenado na variável para uso em cálculos ou condições.',
          xml: '<block type="variables_get"><field name="VAR">altitude_apogeu</field></block>',
          python: `altitude_apogeu`
        },
        {
          name: 'alterar [variável] por [incremento]',
          type: 'math_change',
          desc: 'Incrementa ou decrementa o valor de uma variável numérica (ex: contador de ciclos).',
          xml: '<block type="math_change"><field name="VAR">contador_pacotes</field><value name="DELTA"><block type="math_number"><field name="NUM">1</field></block></value></block>',
          python: `contador_pacotes = (contador_pacotes if isinstance(contador_pacotes, (int, float)) else 0) + 1`
        }
      ]
    },

    // ==========================================
    // 9. FUNÇÕES & ROTINAS
    // ==========================================
    functions: {
      id: 'functions',
      title: 'Funções & Procedimentos',
      subtitle: 'Modularização, reaproveitamento de código e organização estruturada',
      icon: '🧩',
      category: 'Funções & Rotinas',
      summary: 'Funções agrupam blocos de instruções sob um nome específico. Permitem reaproveitar rotinas complexas (como ler todos os sensores ou montar o JSON de telemetria) de forma limpa, evitando duplicação de código e facilitando testes.',
      conceptSections: [
        {
          title: 'Declaração e Chamada de Função (def)',
          type: 'procedures_defnoreturn',
          xml: '<block type="procedures_defnoreturn"><field name="NAME">bipar_alerta</field><statement name="STACK"><block type="controls_repeat_ext"><value name="TIMES"><block type="math_number"><field name="NUM">3</field></block></value><statement name="DO"><block type="sat_actuator_buzzer"><field name="PIN">25</field><field name="FREQ">2000</field><field name="DURATION">80</field><next><block type="sat_wait"><field name="TIME">80</field><field name="UNIT">MSEC</field></block></next></block></statement></block></statement></block><block type="procedures_callnoreturn"><mutation name="bipar_alerta"></mutation></block>',
          content: `
            <p>Uma função é declarada com <code>def nome_da_funcao():</code> e executada chamando seu nome acompanhado de parênteses <code>nome_da_funcao()</code>:</p>
            <div class="sat-ref-code-box">
              <div class="sat-ref-code-content">
                <button class="btn-copy-snip" onclick="SatReference.copySnippet(this)">Copiar</button>
                <pre><code><span class="kw">def</span> <span class="fn">bipar_alerta</span>():
    <span class="kw">for</span> _ <span class="kw">in</span> <span class="fn">range</span>(<span class="num">3</span>):
        buzzer.value(<span class="num">1</span>)
        <span class="fn">time.sleep_ms</span>(<span class="num">80</span>)
        buzzer.value(<span class="num">0</span>)
        <span class="fn">time.sleep_ms</span>(<span class="num">80</span>)

<span class="cm"># Chamada no programa principal:</span>
bipar_alerta()</code></pre>
              </div>
            </div>
          `
        }
      ],
      blocks: [
        {
          name: 'para [nome_da_função] faça ... (Definição e Chamada)',
          type: 'procedures_defnoreturn',
          desc: 'Declara um procedimento modular e disponibiliza sua respectiva chamada para o programa principal.',
          xml: '<block type="procedures_defnoreturn"><field name="NAME">rotina_seguranca</field><statement name="STACK"><block type="text_print"><value name="TEXT"><block type="text"><field name="TEXT">Rotina de seguranca executada</field></block></value></block></statement></block><block type="procedures_callnoreturn"><mutation name="rotina_seguranca"></mutation></block>',
          python: `def rotina_seguranca():\n    print("Rotina de seguranca executada")\n\n# Chamada no programa:\nrotina_seguranca()`
        },
        {
          name: 'para [nome_da_função] faça ... retornar [valor]',
          type: 'procedures_defreturn',
          desc: 'Declara uma função que calcula e retorna um resultado, associando-o a uma variável no programa principal.',
          xml: '<block type="procedures_defreturn"><field name="NAME">calcular_densidade</field><value name="RETURN"><block type="math_number"><field name="NUM">1.225</field></block></value></block><block type="variables_set"><field name="VAR">densidade</field><value name="VALUE"><block type="procedures_callreturn"><mutation name="calcular_densidade"></mutation></block></value></block>',
          python: `def calcular_densidade():\n    return 1.225\n\n# Chamada com armazenamento:\ndensidade = calcular_densidade()`
        },
        {
          name: 'executar [nome_da_função]',
          type: 'procedures_callnoreturn',
          desc: 'Chama e executa um procedimento previamente definido.',
          xml: '<block type="procedures_callnoreturn"><mutation name="rotina_seguranca"></mutation></block>',
          python: `rotina_seguranca()`
        }
      ]
    },

    // ==========================================
    // 10. MISSÃO & SATÉLITE
    // ==========================================
    mission: {
      id: 'mission',
      title: 'Missão & Satélite (OBSAT)',
      subtitle: 'Configuração dos parâmetros de missão e metadados da equipe',
      icon: '🛰️',
      category: 'Missão & Satélite',
      summary: 'Define a identidade oficial do satélite na competição OBSAT 2026, associando o número da equipe, nome do projeto e parâmetros iniciais de telemetria.',
      conceptSections: [
        {
          title: 'Cabeçalho Oficial do Voo',
          type: 'sat_mission_start',
          xml: '<block type="sat_mission_start"><field name="MISSION_NAME">CANSAT_OBSAT_01</field><next><block type="variables_set"><field name="VAR">equipe_id</field><value name="VALUE"><block type="math_number"><field name="NUM">41</field></block></value><next><block type="variables_set"><field name="VAR">missao</field><value name="VALUE"><block type="text"><field name="TEXT">CANSAT_OBSAT_01</field></block></value><next><block type="text_print"><value name="TEXT"><block type="text_join"><mutation items="4"></mutation><value name="ADD0"><block type="text"><field name="TEXT">Iniciando missao: </field></block></value><value name="ADD1"><block type="variables_get"><field name="VAR">missao</field></block></value><value name="ADD2"><block type="text"><field name="TEXT"> | Equipe: </field></block></value><value name="ADD3"><block type="variables_get"><field name="VAR">equipe_id</field></block></value></block></value></block></next></block></next></block></next></block>',
          content: `
            <p>O bloco de missão inicializa as variáveis globais com o número da equipe e o nome da missão, garantindo que todos os pacotes enviados contenham o identificador correto exigido pelo servidor de recepção da OBSAT.</p>
            <div class="sat-ref-code-box">
              <div class="sat-ref-code-content">
                <button class="btn-copy-snip" onclick="SatReference.copySnippet(this)">Copiar</button>
                <pre><code>equipe_id = <span class="num">41</span>
missao = <span class="str">"CANSAT_OBSAT_01"</span>
<span class="fn">print</span>(<span class="str">"Iniciando missao: "</span> + <span class="fn">str</span>(missao) + <span class="str">" | Equipe: "</span> + <span class="fn">str</span>(equipe_id))</code></pre>
              </div>
            </div>
          `
        }
      ],
      blocks: [
        {
          name: 'Dados do Projeto (Autor, ID IoT, Descrição)',
          type: 'project_info',
          desc: 'Armazena os metadados do projeto na IDE para documentação e autoria da equipe.',
          xml: '<block type="project_info"><value name="project_author"><block type="text"><field name="TEXT">Equipe 41</field></block></value><value name="project_iot_id"><block type="math_number"><field name="NUM">41</field></block></value><value name="project_description"><block type="text"><field name="TEXT">Missao OBSAT 2026</field></block></value></block>',
          python: `# Projeto: Missao OBSAT 2026\n# Equipe: Equipe 41\n# ID IoT: 41`
        },
        {
          name: 'Iniciar Missão do Satélite OBSAT',
          type: 'sat_mission_start',
          desc: 'Define o nome oficial da missão (ex: CANSAT_OBSAT_01) e o identificador numérico da equipe.',
          xml: '<block type="sat_mission_start"><field name="MISSION_NAME">CANSAT_OBSAT_01</field></block>',
          python: `print("[OBSAT] Iniciando voo da missao: CANSAT_OBSAT_01")`
        },
        {
          name: '⏱️ Aguardar [N] segundos / ms',
          type: 'sat_wait',
          desc: 'Pausa a execução do computador de bordo pelo tempo especificado.',
          xml: '<block type="sat_wait"><field name="TIME">1</field><field name="UNIT">SEC</field></block>',
          python: `import time\ntime.sleep(1)`
        }
      ]
    },

    // ==========================================
    // 11. SENSORES AMBIENTAIS
    // ==========================================
    sensors: {
      id: 'sensors',
      title: 'Sensores Ambientais (I2C)',
      subtitle: 'Barômetro BMP280, Termo-Higrômetro SHT20 e AHT10/20',
      icon: '🌡️',
      category: 'Sensores Ambientais',
      summary: 'Mede grandezas termodinâmicas da atmosfera durante a subida do balão estratosférico ou foguete: pressão atmosférica (hPa), temperatura do ar (°C), altitude estimada (m) e umidade relativa (%).',
      conceptSections: [
        {
          title: 'Comunicação pelo Barramento I2C',
          type: 'variables_set',
          xml: '<block type="variables_set"><field name="VAR">temp</field><value name="VALUE"><block type="sat_sensor_bmp280_temp"></block></value><next><block type="variables_set"><field name="VAR">pressao</field><value name="VALUE"><block type="sat_sensor_bmp280_press"></block></value><next><block type="text_print"><value name="TEXT"><block type="text_join"><mutation items="4"></mutation><value name="ADD0"><block type="text"><field name="TEXT">Leitura BMP280 -> Temp: </field></block></value><value name="ADD1"><block type="variables_get"><field name="VAR">temp</field></block></value><value name="ADD2"><block type="text"><field name="TEXT"> C | Pressao: </field></block></value><value name="ADD3"><block type="variables_get"><field name="VAR">pressao</field></block></value></block></value></block></next></block></next></block>',
          content: `
            <p>Os sensores ambientais compartilham o mesmo barramento I2C (pinos SDA e SCL). O microcontrolador diferencia cada sensor pelo seu endereço hexadecimal único no barramento (ex: BMP280 no endereço <code>0x76</code> e SHT20 em <code>0x40</code>).</p>
            <div class="sat-ref-code-box">
              <div class="sat-ref-code-content">
                <button class="btn-copy-snip" onclick="SatReference.copySnippet(this)">Copiar</button>
                <pre><code>temp = sensor_bmp.temperature
pressao = sensor_bmp.pressure
<span class="fn">print</span>(<span class="str">"Leitura BMP280 -> Temp: "</span> + <span class="fn">str</span>(temp) + <span class="str">" C | Pressao: "</span> + <span class="fn">str</span>(pressao))</code></pre>
              </div>
            </div>
          `
        }
      ],
      blocks: [
        {
          name: 'Ler BMP280: Temperatura (°C)',
          type: 'sat_sensor_bmp280_temp',
          desc: 'Realiza a leitura instantânea de temperatura do barômetro BMP280.',
          xml: '<block type="variables_set"><field name="VAR">temp_bmp</field><value name="VALUE"><block type="sat_sensor_bmp280_temp"></block></value></block>',
          python: `temp_bmp = (_bmp.temperature if _bmp else 25.0)`
        },
        {
          name: 'Ler BMP280: Pressão (hPa)',
          type: 'sat_sensor_bmp280_press',
          desc: 'Lê a pressão barométrica instantânea em hectopascais.',
          xml: '<block type="variables_set"><field name="VAR">pressao_hpa</field><value name="VALUE"><block type="sat_sensor_bmp280_press"></block></value></block>',
          python: `pressao_hpa = ((_bmp.pressure / 100.0) if _bmp else 1013.25)`
        },
        {
          name: 'Ler BMP280: Altitude Estimada (m)',
          type: 'sat_sensor_bmp280_alt',
          desc: 'Calcula a altitude barométrica em relação ao nível do mar (1013.25 hPa).',
          xml: '<block type="variables_set"><field name="VAR">alt_est</field><value name="VALUE"><block type="sat_sensor_bmp280_alt"><field name="SEA_LEVEL">1013.25</field></block></value></block>',
          python: `alt_est = (_bmp.altitude if hasattr(_bmp, 'altitude') else (44330.0 * (1.0 - ((_bmp.pressure/100.0)/1013.25)**0.1903)))`
        }
      ]
    },

    // ==========================================
    // 12. INÉRCIA & ADCS
    // ==========================================
    imu: {
      id: 'imu',
      title: 'Inércia & Atitude (IMU / ADCS)',
      subtitle: 'Acelerômetro, Giroscópio e Magnetômetro de 9 Graus de Liberdade',
      icon: '🧭',
      category: 'Inércia & ADCS',
      summary: 'Mede as forças de aceleração linear, taxas de rotação angular e campo magnético terrestre através da IMU MPU9250 / MPU6050 para determinação de atitude e estabilização do satélite.',
      conceptSections: [
        {
          title: 'Sistema de Coordenadas do Satélite (Eixos X, Y, Z)',
          type: 'variables_set',
          xml: '<block type="variables_set"><field name="VAR">accel_total</field><value name="VALUE"><block type="sat_imu_mpu6050_accel"><field name="AXIS">total</field></block></value><next><block type="variables_set"><field name="VAR">gyro_z</field><value name="VALUE"><block type="sat_imu_mpu6050_gyro"><field name="AXIS">z</field></block></value><next><block type="text_print"><value name="TEXT"><block type="text_join"><mutation items="4"></mutation><value name="ADD0"><block type="text"><field name="TEXT">IMU -> Acel Total: </field></block></value><value name="ADD1"><block type="variables_get"><field name="VAR">accel_total</field></block></value><value name="ADD2"><block type="text"><field name="TEXT"> G | Giro Z: </field></block></value><value name="ADD3"><block type="variables_get"><field name="VAR">gyro_z</field></block></value></block></value></block></next></block></next></block>',
          content: `
            <p>O sensor inercial mede grandezas físicas em 3 eixos ortogonais (Rolamento X, Arfagem Y e Guinada Z):</p>
            <div class="sat-ref-code-box">
              <div class="sat-ref-code-content">
                <button class="btn-copy-snip" onclick="SatReference.copySnippet(this)">Copiar</button>
                <pre><code>accel_total = sensor_imu.acceleration_total
gyro_z = sensor_imu.gyro_z
<span class="fn">print</span>(<span class="str">"IMU -> Acel Total: "</span> + <span class="fn">str</span>(accel_total) + <span class="str">" G | Giro Z: "</span> + <span class="fn">str</span>(gyro_z))</code></pre>
              </div>
            </div>
          `
        }
      ],
      blocks: [
        {
          name: 'Ler Aceleração MPU6050 / MPU9250 [Eixo / Total]',
          type: 'sat_imu_mpu6050_accel',
          desc: 'Lê a aceleração linear em múltiplos da gravidade terrestre (G) ou m/s².',
          xml: '<block type="variables_set"><field name="VAR">accel_g</field><value name="VALUE"><block type="sat_imu_mpu6050_accel"><field name="AXIS">total</field></block></value></block>',
          python: `accel_g = ((sum([x**2 for x in _imu.acceleration])**0.5) if _imu else 1.0)`
        },
        {
          name: 'Ler Giroscópio MPU6050 / MPU9250 [Eixo Z]',
          type: 'sat_imu_mpu6050_gyro',
          desc: 'Lê a taxa de rotação angular nos eixos em graus por segundo (°/s).',
          xml: '<block type="variables_set"><field name="VAR">gyro_z</field><value name="VALUE"><block type="sat_imu_mpu6050_gyro"><field name="AXIS">z</field></block></value></block>',
          python: `gyro_z = (_imu.gyro[2] if (_imu and hasattr(_imu, 'gyro')) else 0.0)`
        },
        {
          name: 'Detector de Queda Livre (Free Fall)',
          type: 'sat_imu_detect_freefall',
          desc: 'Detecta desprendimento de balão ou início de queda livre comparando a aceleração resultante com o limiar configurado.',
          xml: '<block type="variables_set"><field name="VAR">queda_livre</field><value name="VALUE"><block type="sat_imu_detect_freefall"><field name="THRESHOLD">0.15</field></block></value></block>',
          python: `queda_livre = ((sum([x**2 for x in _imu.acceleration])**0.5 < 0.15) if _imu else False)`
        }
      ]
    },

    // ==========================================
    // 13. NAVEGAÇÃO & GPS
    // ==========================================
    gps: {
      id: 'gps',
      title: 'Navegação & GPS (UART)',
      subtitle: 'Receptor de satélites GNSS para latitude, longitude e altitude geodésica',
      icon: '📍',
      category: 'Navegação & GPS',
      summary: 'O módulo GPS NEO-6M/NEO-8M conecta-se via porta serial UART para decodificar sentenças NMEA e fornecer coordenadas geográficas e velocidade de deslocamento para rastreamento e resgate do satélite.',
      conceptSections: [
        {
          title: 'Rastreamento e Resgate da Carga Útil',
          type: 'variables_set',
          xml: '<block type="variables_set"><field name="VAR">lat</field><value name="VALUE"><block type="sat_gps_lat"></block></value><next><block type="variables_set"><field name="VAR">lng</field><value name="VALUE"><block type="sat_gps_lng"></block></value><next><block type="variables_set"><field name="VAR">alt_gps</field><value name="VALUE"><block type="sat_gps_alt"></block></value><next><block type="text_print"><value name="TEXT"><block type="text_join"><mutation items="6"></mutation><value name="ADD0"><block type="text"><field name="TEXT">GPS -> Lat: </field></block></value><value name="ADD1"><block type="variables_get"><field name="VAR">lat</field></block></value><value name="ADD2"><block type="text"><field name="TEXT"> Lng: </field></block></value><value name="ADD3"><block type="variables_get"><field name="VAR">lng</field></block></value><value name="ADD4"><block type="text"><field name="TEXT"> Alt: </field></block></value><value name="ADD5"><block type="variables_get"><field name="VAR">alt_gps</field></block></value></block></value></block></next></block></next></block></next></block>',
          content: `
            <p>Ao pousar de paraquedas, a localização exata de latitude e longitude transmitida pelo GPS permite que a equipe encontre rapidamente a cápsula no solo:</p>
            <div class="sat-ref-code-box">
              <div class="sat-ref-code-content">
                <button class="btn-copy-snip" onclick="SatReference.copySnippet(this)">Copiar</button>
                <pre><code>lat = gps.latitude
lng = gps.longitude
alt_gps = gps.altitude
<span class="fn">print</span>(<span class="str">"GPS -> Lat: "</span> + <span class="fn">str</span>(lat) + <span class="str">" Lng: "</span> + <span class="fn">str</span>(lng) + <span class="str">" Alt: "</span> + <span class="fn">str</span>(alt_gps))</code></pre>
              </div>
            </div>
          `
        }
      ],
      blocks: [
        {
          name: 'Ler GPS: Latitude (°)',
          type: 'sat_gps_lat',
          desc: 'Decodifica a coordenada de latitude geográfica atual em graus decimais.',
          xml: '<block type="variables_set"><field name="VAR">gps_latitude</field><value name="VALUE"><block type="sat_gps_lat"></block></value></block>',
          python: `gps_latitude = (_gps.latitude if (_gps and hasattr(_gps, 'latitude')) else -23.5505)`
        },
        {
          name: 'Ler GPS: Longitude (°)',
          type: 'sat_gps_lng',
          desc: 'Decodifica a coordenada de longitude geográfica atual em graus decimais.',
          xml: '<block type="variables_set"><field name="VAR">gps_longitude</field><value name="VALUE"><block type="sat_gps_lng"></block></value></block>',
          python: `gps_longitude = (_gps.longitude if (_gps and hasattr(_gps, 'longitude')) else -46.6333)`
        },
        {
          name: 'Ler GPS: Altitude Geodésica (m)',
          type: 'sat_gps_alt',
          desc: 'Retorna a altitude geodésica em metros acima do nível do mar obtida dos satélites GPS.',
          xml: '<block type="variables_set"><field name="VAR">gps_altitude</field><value name="VALUE"><block type="sat_gps_alt"></block></value></block>',
          python: `gps_altitude = (_gps.altitude if (_gps and hasattr(_gps, 'altitude')) else 760.0)`
        }
      ]
    },

    // ==========================================
    // 14. TELEMETRIA OBSAT
    // ==========================================
    telemetry: {
      id: 'telemetry',
      title: 'Pacote de Telemetria JSON OBSAT',
      subtitle: 'Formatação oficial de dados de acordo com o Edital OBSAT 2026',
      icon: '📦',
      category: 'Pacote Telemetria',
      summary: 'Gera a estrutura JSON oficial exigida pelo servidor de recepção e avaliação da OBSAT, integrando bateria, temperatura, pressão, giroscópio, acelerômetro e payload da equipe.',
      conceptSections: [
        {
          title: 'Especificação do Formato JSON da OBSAT',
          type: 'sat_obsat_telemetry_packet',
          xml: '<block type="variables_set"><field name="VAR">pacote_telemetria</field><value name="VALUE"><block type="sat_obsat_telemetry_packet"></block></value><next><block type="text_print"><value name="TEXT"><block type="variables_get"><field name="VAR">pacote_telemetria</field></block></value><next><block type="sat_http_send_obsat_telemetry"><field name="SERVER_URL">https://obsat.org.br/satblocks/telemetria/salvar_telemetria.php</field></block></next></block></next></block>',
          content: `
            <p>O pacote JSON deve seguir rigorosamente a seguinte estrutura para validação automática no servidor de solo:</p>
            <div class="sat-ref-code-box">
              <div class="sat-ref-code-content">
                <button class="btn-copy-snip" onclick="SatReference.copySnippet(this)">Copiar</button>
                <pre><code><span class="kw">import</span> ujson
payload_dict = {
    <span class="str">"equipe"</span>: <span class="num">41</span>,
    <span class="str">"bateria"</span>: <span class="num">24</span>,
    <span class="str">"temperatura"</span>: <span class="num">30</span>,
    <span class="str">"pressao"</span>: <span class="num">1</span>,
    <span class="str">"giroscopio"</span>: [<span class="num">42</span>, <span class="num">90</span>, <span class="num">30</span>],
    <span class="str">"acelerometro"</span>: [<span class="num">10</span>, <span class="num">3</span>, <span class="num">4</span>],
    <span class="str">"payload"</span>: {<span class="str">"status"</span>: <span class="str">"OK"</span>}
}
pacote_json = ujson.dumps(payload_dict)</code></pre>
              </div>
            </div>
          `
        }
      ],
      blocks: [
        {
          name: 'Montar Pacote JSON Oficial OBSAT',
          type: 'sat_obsat_telemetry_packet',
          desc: 'Recebe as grandezas de voo e produz automaticamente a string JSON formatada de acordo com o edital.',
          xml: '<block type="variables_set"><field name="VAR">pacote_telemetria</field><value name="VALUE"><block type="sat_obsat_telemetry_packet"></block></value></block>',
          python: `pacote_telemetria = ujson.dumps({\n    "equipe": 41,\n    "bateria": round((_adc_bat.read()/4095.0)*3.3*2.0, 2),\n    "temperatura": (_sht.temperature() if _sht else 25.0),\n    "pressao": ((_bmp.pressure/100.0) if _bmp else 1013.25),\n    "giroscopio": (list(_imu.gyro) if (_imu and hasattr(_imu, 'gyro')) else [0,0,0]),\n    "acelerometro": (list(_imu.acceleration) if _imu else [0,0,0])\n})`
        },
        {
          name: 'Enviar Telemetria para Servidor OBSAT via HTTP',
          type: 'sat_http_send_obsat_telemetry',
          desc: 'Envia o pacote JSON montado via requisição HTTP POST para o endpoint da estação de solo.',
          xml: '<block type="sat_http_send_obsat_telemetry"><field name="SERVER_URL">https://obsat.org.br/satblocks/telemetria/salvar_telemetria.php</field></block>',
          python: `try:\n    import urequests\nexcept ImportError:\n    urequests = None\ntry:\n    import ujson\nexcept ImportError:\n    import json as ujson\n\ntry:\n    _body = ujson.dumps(json_data)\n    print("[TELEMETRIA] " + _body)\n    if urequests is not None:\n        _res = urequests.post("https://obsat.org.br/satblocks/telemetria/salvar_telemetria.php", headers={'Content-Type': 'application/json'}, data=_body)\n        _res.close()\nexcept Exception as _e:\n    print("[HTTP ERROR]", _e)`
        }
      ]
    },

    // ==========================================
    // 15. COMUNICAÇÃO LORA
    // ==========================================
    lora: {
      id: 'lora',
      title: 'Comunicação de Longo Alcance (LoRa)',
      subtitle: 'Transmissor/Receptor de Rádio Frequência para enlace espacial (SX1276/78)',
      icon: '📻',
      category: 'Comunicação & LoRa',
      summary: 'A tecnologia LoRa (Long Range) opera em radiofrequência sub-GHz (915 MHz no Brasil / Anatel) para enviar telemetria a dezenas de quilômetros de distância com baixíssimo consumo de energia.',
      conceptSections: [
        {
          title: 'Configuração da Frequência e Potência de RF',
          type: 'sat_lora_setup',
          xml: '<block type="sat_lora_setup"><field name="FREQ">915.0</field><field name="POWER">20</field><field name="SF">7</field><next><block type="sat_lora_send_packet"><value name="PAYLOAD"><block type="variables_get"><field name="VAR">pacote_json</field></block></value><next><block type="text_print"><value name="TEXT"><block type="text"><field name="TEXT">Pacote LoRa enviado com sucesso!</field></block></value></block></next></block></next></block>',
          content: `
            <p>No Brasil, a frequência oficial para radioamadorismo e experimentos aeroespaciais é <b>915.0 MHz</b> com largura de banda de 125 kHz e fator de espalhamento (Spreading Factor) SF7 a SF12:</p>
            <div class="sat-ref-code-box">
              <div class="sat-ref-code-content">
                <button class="btn-copy-snip" onclick="SatReference.copySnippet(this)">Copiar</button>
                <pre><code>configurar_lora(<span class="num">915.0</span>, sf=<span class="num">7</span>)
transmitir_lora(pacote_json)
<span class="fn">print</span>(<span class="str">"Pacote LoRa enviado com sucesso!"</span>)</code></pre>
              </div>
            </div>
          `
        }
      ],
      blocks: [
        {
          name: 'Configurar Rádio LoRa (Frequência 915 MHz)',
          type: 'sat_lora_setup',
          desc: 'Inicializa o transceptor LoRa no barramento SPI com frequência e parâmetros de modulação.',
          xml: '<block type="sat_lora_setup"><field name="FREQ">915.0</field><field name="POWER">20</field><field name="SF">7</field></block>',
          python: `print("[LORA] Configurado: 915.0MHz, SF7, Potencia 20dBm")`
        },
        {
          name: 'Transmitir Pacote LoRa',
          type: 'sat_lora_send_packet',
          desc: 'Envia um pacote de telemetria por radiofrequência para a antena da estação de solo.',
          xml: '<block type="sat_lora_send_packet"><value name="PAYLOAD"><block type="variables_get"><field name="VAR">json_data</field></block></value></block>',
          python: `print("[LORA TX] Enviando pacote de telemetria...")`
        },
        {
          name: 'Receber Comando LoRa',
          type: 'sat_lora_receive_cmd',
          desc: 'Aguardar e decodificar comandos de telecomando enviados da base de solo para o satélite.',
          xml: '<block type="variables_set"><field name="VAR">cmd_lora</field><value name="VALUE"><block type="sat_lora_receive_cmd"></block></value></block>',
          python: `cmd_lora = ""`
        }
      ]
    },

    // ==========================================
    // 16. REDE & WI-FI
    // ==========================================
    wifi: {
      id: 'wifi',
      title: 'Rede & Internet (HTTP & Wi-Fi)',
      subtitle: 'Conexão em redes locais, ponto de acesso (AP) e Web Services',
      icon: '🌐',
      category: 'Rede & Internet',
      summary: 'Permite conectar o microcontrolador ESP32 à rede Wi-Fi da base de lançamento para testes em bancada, envio de dados via sockets e comunicação direta com a bancada de integração.',
      conceptSections: [
        {
          title: 'Conexão em Estação (Station Mode)',
          type: 'sat_wifi_connect',
          xml: '<block type="sat_wifi_connect"><value name="SSID"><block type="text"><field name="TEXT">obsat-server</field></block></value><value name="PASS"><block type="text"><field name="TEXT">obsatserver</field></block></value><next><block type="text_print"><value name="TEXT"><block type="text"><field name="TEXT">Wi-Fi Conectado com sucesso!</field></block></value></block></next></block>',
          content: `
            <p>O modo Station conecta o satélite ao roteador Wi-Fi local para acesso à rede:</p>
            <div class="sat-ref-code-box">
              <div class="sat-ref-code-content">
                <button class="btn-copy-snip" onclick="SatReference.copySnippet(this)">Copiar</button>
                <pre><code><span class="kw">import</span> network, time
wlan = network.WLAN(network.STA_IF)
wlan.active(<span class="kw">True</span>)
wlan.connect(<span class="str">"obsat-server"</span>, <span class="str">"obsatserver"</span>)
<span class="kw">while</span> <span class="kw">not</span> wlan.isconnected():
    <span class="fn">time.sleep_ms</span>(<span class="num">200</span>)
<span class="fn">print</span>(<span class="str">"Conectado! IP:"</span>, wlan.ifconfig()[<span class="num">0</span>])</code></pre>
              </div>
            </div>
          `
        }
      ],
      blocks: [
        {
          name: 'Conectar Wi-Fi (SSID e Senha)',
          type: 'sat_wifi_connect',
          desc: 'Conecta o microcontrolador a um ponto de acesso Wi-Fi.',
          xml: '<block type="sat_wifi_connect"><value name="SSID"><block type="text"><field name="TEXT">obsat-server</field></block></value><value name="PASS"><block type="text"><field name="TEXT">obsatserver</field></block></value></block>',
          python: `import network, time\n_wlan = network.WLAN(network.STA_IF)\n_wlan.active(True)\n_wlan.connect("obsat-server", "obsatserver")\nwhile not _wlan.isconnected():\n    time.sleep(0.5)\nprint("[WI-FI OK] IP:", _wlan.ifconfig()[0])`
        },
        {
          name: 'Criar Ponto de Acesso (Access Point)',
          type: 'sat_wifi_ap_start',
          desc: 'Cria uma rede Wi-Fi autônoma emitida pelo próprio satélite.',
          xml: '<block type="sat_wifi_ap_start"><field name="SSID">ESP32CAM_OBSAT</field><field name="PASSWORD">12345678</field></block>',
          python: `import network\n_ap = network.WLAN(network.AP_IF)\n_ap.active(True)\n_ap.config(essid="ESP32CAM_OBSAT", password="12345678")`
        }
      ]
    },

    // ==========================================
    // 17. EASYMQTT & NUVEM
    // ==========================================
    mqtt: {
      id: 'mqtt',
      title: 'IoT: EasyMQTT & Nuvem BIPES',
      subtitle: 'Telemetria em tempo real para dashboards e painel IOT',
      icon: '☁️',
      category: 'IoT: EasyMQTT & Nuvem',
      summary: 'Publica dados de sensores diretamente no broker MQTT do BIPES / OBSAT para gráficos ao vivo e monitoramento em tempo real no navegador.',
      conceptSections: [
        {
          title: 'Arquitetura Publish / Subscribe',
          type: 'sat_mqtt_publish',
          xml: '<block type="variables_set"><field name="VAR">topico</field><value name="VALUE"><block type="text"><field name="TEXT">obsat/41/telemetria</field></block></value><next><block type="sat_mqtt_publish"><field name="TOPIC">obsat/41/telemetria</field><value name="VALUE"><block type="variables_get"><field name="VAR">pacote_json</field></block></value><next><block type="text_print"><value name="TEXT"><block type="text"><field name="TEXT">Telemetria publicada no broker MQTT!</field></block></value></block></next></block></next></block>',
          content: `
            <p>O satélite publica (<i>publish</i>) grandezas em tópicos específicos (ex: <code>obsat/41/telemetria</code>), e o Painel IOT no navegador se inscreve (<i>subscribe</i>) para desenhar gráficos em tempo real:</p>
            <div class="sat-ref-code-box">
              <div class="sat-ref-code-content">
                <button class="btn-copy-snip" onclick="SatReference.copySnippet(this)">Copiar</button>
                <pre><code>topico = <span class="str">"obsat/41/telemetria"</span>
publicar_mqtt(topico, pacote_json)
<span class="fn">print</span>(<span class="str">"Telemetria publicada no broker MQTT!"</span>)</code></pre>
              </div>
            </div>
          `
        }
      ],
      blocks: [
        {
          name: 'Publicar Valor no Tópico MQTT',
          type: 'sat_mqtt_publish',
          desc: 'Publica uma medição em tempo real para ser exibida nos gráficos da aba Painel IOT.',
          xml: '<block type="sat_mqtt_publish"><field name="TOPIC">obsat/satelite01/telemetria</field><value name="VALUE"><block type="variables_get"><field name="VAR">json_data</field></block></value></block>',
          python: `print("[MQTT] Publicado em obsat/satelite01/telemetria")`
        }
      ]
    },

    // ==========================================
    // 18. CÂMERA & PAYLOAD
    // ==========================================
    camera: {
      id: 'camera',
      title: 'Câmera OV2640 & Imagens (ESP32-CAM)',
      subtitle: 'Captura de fotos orbitais, Flash LED e gravação no MicroSD',
      icon: '📷',
      category: 'Câmera & Payload',
      summary: 'Carga útil fotográfica para imageamento da Terra e registro de missões espaciais com o sensor CMOS OV2640 na placa ESP32-CAM.',
      conceptSections: [
        {
          title: 'Resoluções e Otimização de Memória RAM',
          type: 'sat_camera_init_advanced',
          xml: '<block type="sat_camera_init_advanced"><field name="FRAMESIZE">FRAMESIZE_QVGA</field><field name="QUALITY">12</field><field name="EFFECT">0</field><field name="ROTATE">0</field><next><block type="sat_camera_capture"><field name="FILENAME">foto_obsat_%d.jpg</field><next><block type="text_print"><value name="TEXT"><block type="text"><field name="TEXT">Foto orbital capturada e salva no SD!</field></block></value></block></next></block></next></block>',
          content: `
            <p>A captura de fotos em JPEG exige alocação cuidadosa de memória. Resoluções recomendadas para voo:</p>
            <div class="sat-ref-code-box">
              <div class="sat-ref-code-content">
                <button class="btn-copy-snip" onclick="SatReference.copySnippet(this)">Copiar</button>
                <pre><code>inicializar_camera(QVGA)
capturar_foto(<span class="str">"foto_obsat_%d.jpg"</span>)
<span class="fn">print</span>(<span class="str">"Foto orbital capturada e salva no SD!"</span>)</code></pre>
              </div>
            </div>
          `
        }
      ],
      blocks: [
        {
          name: 'Inicializar Câmera OV2640 Avançada',
          type: 'sat_camera_init_advanced',
          desc: 'Inicializa o sensor CMOS em resoluções como QVGA, VGA ou SVGA com qualidade JPEG ajustável.',
          xml: '<block type="sat_camera_init_advanced"><field name="FRAMESIZE">FRAMESIZE_QVGA</field><field name="QUALITY">12</field><field name="EFFECT">0</field><field name="ROTATE">0</field></block>',
          python: `import camera\ntry:\n    camera.init(0, format=camera.JPEG, framesize=camera.FRAME_QVGA)\nexcept Exception as _e_cam:\n    print("[CAM ERROR]", _e_cam)`
        },
        {
          name: 'Capturar e Salvar Foto no MicroSD',
          type: 'sat_camera_capture',
          desc: 'Tira uma fotografia em formato JPEG e salva diretamente no cartão de memória (/sd/foto_obsat_1.jpg).',
          xml: '<block type="sat_camera_capture"><field name="FILENAME">foto_obsat_%d.jpg</field></block>',
          python: `try:\n    _img_buf = camera.capture()\n    with open("/sd/foto_obsat_1.jpg", "wb") as _f:\n        _f.write(_img_buf)\nexcept Exception as _e_cap:\n    print("[CAP ERROR]", _e_cap)`
        },
        {
          name: 'Controlar Flash LED Integrado',
          type: 'sat_camera_flash_intensity',
          desc: 'Aciona o LED branco de alta potência (pino GPIO 4) da ESP32-CAM para iluminação ou sinalização.',
          xml: '<block type="sat_camera_flash_intensity"><field name="BRIGHTNESS">100</field></block>',
          python: `from machine import Pin, PWM\n_flash = PWM(Pin(4), freq=5000, duty=1023)`
        }
      ]
    },

    // ==========================================
    // 19. ENERGIA & EPS
    // ==========================================
    eps: {
      id: 'eps',
      title: 'Energia & EPS (Power System)',
      subtitle: 'Monitoramento da bateria LiPo, tensão analógica (ADC) e modo de baixo consumo',
      icon: '⚡',
      category: 'Energia & EPS',
      summary: 'O Subsistema de Energia (EPS) gerencia a alimentação do satélite, monitorando a tensão das células de bateria LiPo para evitar descarga profunda e acionando modos de economia quando a carga estiver baixa.',
      conceptSections: [
        {
          title: 'Curva de Descarga e Leitura pelo ADC',
          type: 'variables_set',
          xml: '<block type="variables_set"><field name="VAR">tensao_v</field><value name="VALUE"><block type="sat_eps_battery_voltage"></block></value><next><block type="variables_set"><field name="VAR">porcentagem</field><value name="VALUE"><block type="sat_eps_battery_percent"></block></value><next><block type="text_print"><value name="TEXT"><block type="text_join"><mutation items="4"></mutation><value name="ADD0"><block type="text"><field name="TEXT">Bateria -> Tensao: </field></block></value><value name="ADD1"><block type="variables_get"><field name="VAR">tensao_v</field></block></value><value name="ADD2"><block type="text"><field name="TEXT"> V | Carga: </field></block></value><value name="ADD3"><block type="variables_get"><field name="VAR">porcentagem</field></block></value></block></value></block></next></block></next></block>',
          content: `
            <p>O conversor analógico-digital (ADC) lê a tensão dividida por resistores e calcula a porcentagem restante:</p>
            <div class="sat-ref-code-box">
              <div class="sat-ref-code-content">
                <button class="btn-copy-snip" onclick="SatReference.copySnippet(this)">Copiar</button>
                <pre><code>tensao_v = ler_bateria_volts()
porcentagem = ler_bateria_porcentagem()
<span class="fn">print</span>(<span class="str">"Bateria -> Tensao: "</span> + <span class="fn">str</span>(tensao_v) + <span class="str">" V | Carga: "</span> + <span class="fn">str</span>(porcentagem) + <span class="str">" %"</span>)</code></pre>
              </div>
            </div>
          `
        }
      ],
      blocks: [
        {
          name: 'Ler Tensão da Bateria (ADC Pino 36)',
          type: 'sat_eps_battery_voltage',
          desc: 'Lê o valor analógico no divisor de tensão e converte para volts reais da bateria.',
          xml: '<block type="variables_set"><field name="VAR">tensao_bat_v</field><value name="VALUE"><block type="sat_eps_battery_voltage"></block></value></block>',
          python: `from machine import Pin, ADC\n_adc = ADC(Pin(36))\n_adc.atten(ADC.ATTN_11DB)\ntensao_bat_v = round((_adc.read() / 4095.0) * 3.3 * 2.0, 2)`
        },
        {
          name: 'Porcentagem Estimada da Bateria (%)',
          type: 'sat_eps_battery_percent',
          desc: 'Calcula a porcentagem restante de 0% a 100% com base na faixa útil de 3.3V a 4.2V.',
          xml: '<block type="variables_set"><field name="VAR">porcentagem_bat</field><value name="VALUE"><block type="sat_eps_battery_percent"></block></value></block>',
          python: `porcentagem_bat = int(max(0, min(100, (tensao_bat_v - 3.3) / (4.2 - 3.3) * 100)))`
        },
        {
          name: 'Dormir Profundo (Deep Sleep)',
          type: 'sat_eps_deepsleep',
          desc: 'Coloca o microcontrolador em modo de consumo mínimo de energia por N segundos para poupar a bateria em órbita.',
          xml: '<block type="sat_eps_deepsleep"><field name="SECONDS">10</field></block>',
          python: `import machine\nmachine.deepsleep(10000)`
        }
      ]
    },

    // ==========================================
    // 20. ARQUIVOS & FLASH / SD
    // ==========================================
    files: {
      id: 'files',
      title: 'Arquivos & Armazenamento (Flash / SD)',
      subtitle: 'Gravação de telemetria em CSV/JSON, montagem de cartão MicroSD e logs de voo',
      icon: '📁',
      category: 'Arquivos & Flash',
      summary: 'Gerencia o salvamento permanente de dados na memória Flash interna do microcontrolador ou no cartão MicroSD externo (/sd/). Garante que nenhuma informação de voo seja perdida caso haja reinicialização do satélite.',
      conceptSections: [
        {
          title: 'Modos de Abertura de Arquivo em Python',
          type: 'sat_sd_write_log',
          xml: '<block type="variables_set"><field name="VAR">linha</field><value name="VALUE"><block type="text_join"><mutation items="5"></mutation><value name="ADD0"><block type="utime.vars"><field name="VARS">ticks_ms</field></block></value><value name="ADD1"><block type="text"><field name="TEXT">,</field></block></value><value name="ADD2"><block type="variables_get"><field name="VAR">temp</field></block></value><value name="ADD3"><block type="text"><field name="TEXT">,</field></block></value><value name="ADD4"><block type="variables_get"><field name="VAR">pressao</field></block></value></block></value><next><block type="sat_sd_write_log"><field name="FILENAME">telemetria.csv</field><value name="DATA"><block type="variables_get"><field name="VAR">linha</field></block></value><next><block type="text_print"><value name="TEXT"><block type="text"><field name="TEXT">Log gravado no cartao SD!</field></block></value></block></next></block></next></block>',
          content: `
            <p>Ao salvar logs contínuos de voo, utilize o modo <code>"a"</code> (<i>append</i> / anexar), que adiciona novas linhas ao final do arquivo sem apagar as medições anteriores:</p>
            <div class="sat-ref-code-box">
              <div class="sat-ref-code-content">
                <button class="btn-copy-snip" onclick="SatReference.copySnippet(this)">Copiar</button>
                <pre><code><span class="kw">with</span> <span class="fn">open</span>(<span class="str">"/sd/telemetria.csv"</span>, <span class="str">"a"</span>) <span class="kw">as</span> f:
    linha = <span class="fn">str</span>(time.ticks_ms()) + <span class="str">","</span> + <span class="fn">str</span>(temp) + <span class="str">","</span> + <span class="fn">str</span>(pressao) + <span class="str">"\n"</span>
    f.write(linha)</code></pre>
              </div>
            </div>
          `
        }
      ],
      blocks: [
        {
          name: 'Gravar Linha de Log no Cartão SD (/sd/telemetria.csv)',
          type: 'sat_sd_write_log',
          desc: 'Escreve uma linha formatada no arquivo de telemetria do cartão de memória.',
          xml: '<block type="sat_sd_write_log"><field name="FILENAME">telemetria.csv</field><value name="DATA"><block type="variables_get"><field name="VAR">json_data</field></block></value></block>',
          python: `try:\n    with open("/sd/telemetria.csv", "a") as _f:\n        _f.write(str(json_data) + "\\n")\nexcept Exception as _e:\n    print("[SD ERROR]", _e)`
        },
        {
          name: 'Abrir Arquivo para Escrita (file_open_write)',
          type: 'file_open_write',
          desc: 'Abre um arquivo em modo escrita na memória Flash ou SD.',
          xml: '<block type="file_open_write"><value name="filename"><block type="text"><field name="TEXT">dados.txt</field></block></value></block>',
          python: `_f = open("dados.txt", "w")`
        },
        {
          name: 'Listar Arquivos (files_list)',
          type: 'files_list',
          desc: 'Retorna a lista de todos os arquivos gravados no sistema.',
          xml: '<block type="files_list"></block>',
          python: `import uos\nprint(uos.listdir())`
        }
      ]
    }
  };

  let activeTopic = 'loops';

  function init() {
    setupTabSwitching();
    renderTopic(activeTopic);
  }

  function setupTabSwitching() {
    const btnCodeTab = document.getElementById('tabSideCode');
    const btnRefTab = document.getElementById('tabSideRef');
    const codeView = document.getElementById('sideCodeView');
    const refView = document.getElementById('sideRefView');
    const sideCodeActions = document.getElementById('sideCodeActions');

    if (btnCodeTab && btnRefTab && codeView && refView) {
      btnCodeTab.addEventListener('click', () => {
        btnCodeTab.classList.add('active');
        btnRefTab.classList.remove('active');
        codeView.style.display = 'flex';
        refView.style.display = 'none';
        if (sideCodeActions) sideCodeActions.style.display = 'inline-flex';
      });

      btnRefTab.addEventListener('click', () => {
        btnRefTab.classList.add('active');
        btnCodeTab.classList.remove('active');
        codeView.style.display = 'none';
        refView.style.display = 'flex';
        if (sideCodeActions) sideCodeActions.style.display = 'none';
      });
    }
  }

  function showTopic(topicId) {
    if (topics[topicId]) {
      activeTopic = topicId;
      renderTopic(topicId);

      const btnRefTab = document.getElementById('tabSideRef');
      const btnCodeTab = document.getElementById('tabSideCode');
      const codeView = document.getElementById('sideCodeView');
      const refView = document.getElementById('sideRefView');
      const sideCodeActions = document.getElementById('sideCodeActions');
      if (btnRefTab && btnCodeTab && codeView && refView) {
        btnRefTab.classList.add('active');
        btnCodeTab.classList.remove('active');
        codeView.style.display = 'none';
        refView.style.display = 'flex';
        if (sideCodeActions) sideCodeActions.style.display = 'none';
      }
    }
  }

  function highlightPython(code) {
    if (!code) return '';
    let escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const tokens = [];
    const placeholder = (type, content) => {
      const idx = tokens.length;
      tokens.push(`<span class="${type}">${content}</span>`);
      return `___TOK_${idx}___`;
    };

    // 1. Strings (aspas duplas e simples)
    escaped = escaped.replace(/("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/g, (match) => {
      return placeholder('str', match);
    });

    // 2. Comentários (# até o final da linha)
    escaped = escaped.replace(/(#.*$)/gm, (match) => {
      return placeholder('cm', match);
    });

    // 3. Palavras-chave
    escaped = escaped.replace(/\b(for|in|while|if|elif|else|try|except|as|break|continue|return|def|import|from|with|True|False|None|and|or|not|is|pass|global|lambda)\b/g, (match) => {
      return placeholder('kw', match);
    });

    // 4. Funções built-in e drivers de hardware
    escaped = escaped.replace(/\b(print|range|len|str|int|float|round|min|max|time|sleep|sleep_ms|sleep_us|ticks_ms|ticks_diff|open|write|read|append|split|upper|lower|dumps|loads|Pin|I2C|SPI|UART|ADC|PWM|BMP280|SHT20|MPU9250|WLAN)\b/g, (match) => {
      return placeholder('fn', match);
    });

    // 5. Números (inteiros, floats e hex)
    escaped = escaped.replace(/\b(0x[0-9a-fA-F]+|\d+\.?\d*)\b/g, (match) => {
      return placeholder('num', match);
    });

    // Restaura os tokens de HTML com segurança
    escaped = escaped.replace(/___TOK_(\d+)___/g, (m, idx) => {
      return tokens[parseInt(idx, 10)] || m;
    });

    return escaped;
  }

  function renderTopic(topicId) {
    const topic = topics[topicId] || topics['loops'];
    const container = document.getElementById('refTopicContent');
    if (!container) return;

    const chips = document.querySelectorAll('.ref-nav-chip');
    chips.forEach(chip => {
      const chipOnclick = chip.getAttribute('onclick') || '';
      if (chipOnclick.includes(`'${topic.id}'`)) {
        chip.classList.add('active');
      } else {
        chip.classList.remove('active');
      }
    });

    let conceptsHtml = '';
    if (topic.conceptSections && topic.conceptSections.length > 0) {
      topic.conceptSections.forEach((sec, idx) => {
        const customXmlAttr = sec.xml ? `data-block-xml="${encodeURIComponent(sec.xml)}"` : '';
        const customTypeAttr = sec.type ? `data-block-type="${sec.type}"` : '';
        conceptsHtml += `
          <div class="sat-ref-card concept">
            <div class="sat-ref-card-header">
              <h4>📖 ${sec.title}</h4>
            </div>
            <div class="sat-ref-card-body">
              ${sec.content.replace(
                '<div class="sat-ref-code-box">',
                `<div class="sat-ref-code-box" draggable="true" title="Arraste para a área de trabalho para converter em blocos" data-topic="${topic.id}" data-concept-index="${idx}" ${customXmlAttr} ${customTypeAttr} ondragstart="SatReference.handleDragStart(event, this)">
                  <div class="sat-ref-drag-handle" title="Arraste para a área de blocos">⠿</div>`
              )}
            </div>
          </div>
        `;
      });
    }

    let blocksHtml = '';
    if (topic.blocks && topic.blocks.length > 0) {
      topic.blocks.forEach((blk, idx) => {
        const pyCodeHighlighted = highlightPython(blk.python || '');
        const customXmlAttr = blk.xml ? `data-block-xml="${encodeURIComponent(blk.xml)}"` : '';
        const blockType = blk.type || '';
        blocksHtml += `
          <div class="sat-ref-block-card">
            <div class="sat-ref-block-header">
              <span class="sat-ref-block-num">${idx + 1}</span>
              <span class="sat-ref-block-name">${blk.name}</span>
            </div>
            <p class="sat-ref-block-desc">${blk.desc}</p>
            <div class="sat-ref-code-box" draggable="true" title="Arraste para a área de trabalho para converter em bloco" data-topic="${topic.id}" data-block-index="${idx}" data-block-type="${blockType}" ${customXmlAttr} ondragstart="SatReference.handleDragStart(event, this)">
              <div class="sat-ref-drag-handle" title="Arraste para a área de blocos">⠿</div>
              <div class="sat-ref-code-content">
                <div class="sat-ref-code-actions">
                  <button class="btn-insert-block" onclick="SatReference.insertBlockFromElement(this)" title="Inserir este bloco na área de trabalho">➕ Usar Bloco</button>
                  <button class="btn-copy-snip" onclick="SatReference.copySnippet(this)" title="Copiar código Python">Copiar</button>
                </div>
                <pre><code>${pyCodeHighlighted}</code></pre>
              </div>
            </div>
          </div>
        `;
      });
    }

    container.innerHTML = `
      <div class="sat-ref-header">
        <div class="sat-ref-icon-title">
          <span class="sat-ref-big-icon">${topic.icon}</span>
          <div>
            <h3 class="sat-ref-title">${topic.title}</h3>
            <p class="sat-ref-subtitle">${topic.subtitle}</p>
          </div>
        </div>
        <p class="sat-ref-summary">${topic.summary}</p>
      </div>

      ${conceptsHtml ? `
        <div class="sat-ref-section-title">Conceitos Fundamentais & Boas Práticas</div>
        <div class="sat-ref-sections">
          ${conceptsHtml}
        </div>
      ` : ''}

      ${blocksHtml ? `
        <div class="sat-ref-section-title" style="margin-top: 18px;">Catálogo de Blocos & Código MicroPython (${topic.blocks.length} blocos)</div>
        <div class="sat-ref-sections">
          ${blocksHtml}
        </div>
      ` : ''}
    `;

    // Atualiza botões nas caixas de código conceituais caso não tenham ações
    container.querySelectorAll('.concept .sat-ref-code-box').forEach(box => {
      const contentEl = box.querySelector('.sat-ref-code-content');
      if (contentEl && !contentEl.querySelector('.sat-ref-code-actions')) {
        const copyBtn = contentEl.querySelector('.btn-copy-snip');
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'sat-ref-code-actions';
        const insertBtn = document.createElement('button');
        insertBtn.className = 'btn-insert-block';
        insertBtn.textContent = '➕ Usar Bloco';
        insertBtn.title = 'Inserir este exemplo na área de trabalho';
        insertBtn.onclick = function() { SatReference.insertBlockFromElement(this); };
        actionsDiv.appendChild(insertBtn);
        if (copyBtn) {
          actionsDiv.appendChild(copyBtn);
        }
        contentEl.insertBefore(actionsDiv, contentEl.firstChild);
      }
    });

    setupWorkspaceDropZone();
  }

  function getActiveWorkspace() {
    if (window.workspace && typeof window.workspace.newBlock === 'function') {
      return window.workspace;
    }
    if (typeof Blockly !== 'undefined' && typeof Blockly.getMainWorkspace === 'function') {
      const mainWs = Blockly.getMainWorkspace();
      if (mainWs && typeof mainWs.newBlock === 'function') return mainWs;
    }
    if (window.SatBlocksApp && typeof window.SatBlocksApp.getWorkspace === 'function') {
      const appWs = window.SatBlocksApp.getWorkspace();
      if (appWs && typeof appWs.newBlock === 'function') return appWs;
    }
    return null;
  }

  function setupWorkspaceDropZone() {
    const dropTargets = [
      document.getElementById('blocklyDiv'),
      document.getElementById('blocklyArea'),
      document.querySelector('.blocklySvg')
    ].filter(Boolean);

    dropTargets.forEach(target => {
      if (target._satDropBound) return;
      target._satDropBound = true;

      target.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'copy';
        const bDiv = document.getElementById('blocklyDiv');
        if (bDiv) bDiv.classList.add('sat-drop-target-active');
      });

      target.addEventListener('dragleave', (e) => {
        if (!target.contains(e.relatedTarget)) {
          const bDiv = document.getElementById('blocklyDiv');
          if (bDiv) bDiv.classList.remove('sat-drop-target-active');
        }
      });

      target.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const bDiv = document.getElementById('blocklyDiv');
        if (bDiv) bDiv.classList.remove('sat-drop-target-active');

        let xml = '';
        let type = '';

        const rawData = e.dataTransfer.getData('text/plain') || '';
        try {
          const parsed = JSON.parse(rawData);
          if (parsed && typeof parsed === 'object') {
            xml = parsed.xml || '';
            type = parsed.type || '';
          }
        } catch(err) {
          type = rawData;
        }

        if (!xml) {
          xml = e.dataTransfer.getData('application/satblocks-xml') || '';
        }
        if (!type) {
          type = e.dataTransfer.getData('application/satblocks-type') || '';
        }

        if (!xml && !type) return;

        const ws = getActiveWorkspace();
        if (!ws) return;

        const injectionDiv = ws.getInjectionDiv ? ws.getInjectionDiv() : (bDiv || document.body);
        const rect = injectionDiv.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const scale = ws.scale || 1;
        const scrollX = ws.scrollX || 0;
        const scrollY = ws.scrollY || 0;

        const posX = (mouseX - scrollX) / scale;
        const posY = (mouseY - scrollY) / scale;

        insertBlockToWorkspace(xml, type, posX, posY);
      });
    });
  }

  function handleDragStart(e, el) {
    const codeBox = el.classList.contains('sat-ref-code-box') ? el : el.closest('.sat-ref-code-box');
    if (!codeBox) return;

    const rawXml = codeBox.getAttribute('data-block-xml');
    const xml = rawXml ? decodeURIComponent(rawXml) : '';
    const type = codeBox.getAttribute('data-block-type') || '';

    const payload = JSON.stringify({ xml: xml, type: type });
    e.dataTransfer.setData('text/plain', payload);
    if (xml) e.dataTransfer.setData('application/satblocks-xml', xml);
    if (type) e.dataTransfer.setData('application/satblocks-type', type);
    e.dataTransfer.effectAllowed = 'copy';

    codeBox.classList.add('dragging');
    setTimeout(() => {
      codeBox.classList.remove('dragging');
    }, 400);
  }

  function insertBlockFromElement(btn) {
    const codeBox = btn.closest('.sat-ref-code-box');
    if (!codeBox) return;

    const rawXml = codeBox.getAttribute('data-block-xml');
    const xml = rawXml ? decodeURIComponent(rawXml) : '';
    const type = codeBox.getAttribute('data-block-type') || '';

    insertBlockToWorkspace(xml, type);
  }

  function insertBlockToWorkspace(xmlString, type, posX, posY, pyCode) {
    const ws = getActiveWorkspace();
    if (!ws) {
      console.warn('Workspace do Blockly não encontrado.');
      showToast('⚠️ Abra a aba Blocos para inserir');
      return;
    }

    // Se estiver em outra aba principal, alterna com segurança para Blocos
    if (window.SatBlocksApp && typeof window.SatBlocksApp.switchMainTab === 'function') {
      const activeTabBtn = document.querySelector('.sat-main-tab.active, .sat-tab-btn.active');
      if (activeTabBtn && activeTabBtn.dataset.tab && activeTabBtn.dataset.tab !== 'blocks') {
        window.SatBlocksApp.switchMainTab('blocks');
      }
    }

    // Calcula posição centralizada no workspace visível se não especificada
    if (typeof posX !== 'number' || typeof posY !== 'number') {
      const metrics = ws.getMetrics ? ws.getMetrics() : null;
      if (metrics) {
        posX = (metrics.viewLeft + metrics.viewWidth / 2 - (ws.scrollX || 0)) / (ws.scale || 1) - 80;
        posY = (metrics.viewTop + metrics.viewHeight / 2 - (ws.scrollY || 0)) / (ws.scale || 1) - 40;
      } else {
        posX = 160;
        posY = 140;
      }
    }

    posX += Math.round(Math.random() * 20 - 10);
    posY += Math.round(Math.random() * 20 - 10);

    let createdBlock = null;

    // 1. CONSTRUTOR DEDICADO PROGRAMÁTICO PARA O LAÇO FOR DE AMOSTRAGEM COM TIME.SLEEP E PRINT
    if (type === 'controls_for_contagem' || (xmlString && xmlString.includes('contagem')) || (pyCode && pyCode.includes('contagem'))) {
      try {
        if (typeof ws.createVariable === 'function') {
          ws.createVariable('contagem');
        }
        const forBlock = ws.newBlock('controls_for');
        if (forBlock.getField('VAR')) {
          forBlock.setFieldValue('contagem', 'VAR');
        }

        // FROM: 0
        const fromBlock = ws.newBlock('math_number');
        fromBlock.setFieldValue('0', 'NUM');
        fromBlock.initSvg();
        fromBlock.render();
        if (forBlock.getInput('FROM')) forBlock.getInput('FROM').connection.connect(fromBlock.outputConnection);

        // TO: 2
        const toBlock = ws.newBlock('math_number');
        toBlock.setFieldValue('2', 'NUM');
        toBlock.initSvg();
        toBlock.render();
        if (forBlock.getInput('TO')) forBlock.getInput('TO').connection.connect(toBlock.outputConnection);

        // BY: 1
        const byBlock = ws.newBlock('math_number');
        byBlock.setFieldValue('1', 'NUM');
        byBlock.initSvg();
        byBlock.render();
        if (forBlock.getInput('BY')) forBlock.getInput('BY').connection.connect(byBlock.outputConnection);

        // DO: print 1
        const print1 = ws.newBlock('text_print');
        const txt1 = ws.newBlock('text');
        txt1.setFieldValue('Coletando amostra de voo...', 'TEXT');
        txt1.initSvg();
        txt1.render();
        if (print1.getInput('TEXT')) print1.getInput('TEXT').connection.connect(txt1.outputConnection);
        print1.initSvg();
        print1.render();

        if (forBlock.getInput('DO')) forBlock.getInput('DO').connection.connect(print1.previousConnection);

        // NEXT do print1: sat_wait (1 segundo)
        const waitBlk = ws.newBlock('sat_wait');
        if (waitBlk.getField('TIME')) waitBlk.setFieldValue(1, 'TIME');
        if (waitBlk.getField('UNIT')) waitBlk.setFieldValue('SEC', 'UNIT');
        waitBlk.initSvg();
        waitBlk.render();

        if (print1.nextConnection) print1.nextConnection.connect(waitBlk.previousConnection);

        // NEXT do forBlock: print 2 fora do loop
        const print2 = ws.newBlock('text_print');
        const txt2 = ws.newBlock('text');
        txt2.setFieldValue('Sequência de amostragem finalizada!', 'TEXT');
        txt2.initSvg();
        txt2.render();
        if (print2.getInput('TEXT')) print2.getInput('TEXT').connection.connect(txt2.outputConnection);
        print2.initSvg();
        print2.render();

        if (forBlock.nextConnection) forBlock.nextConnection.connect(print2.previousConnection);

        forBlock.initSvg();
        forBlock.render();
        if (typeof forBlock.moveTo === 'function') {
          forBlock.moveTo(new Blockly.utils.Coordinate(posX, posY));
        } else if (typeof forBlock.moveBy === 'function') {
          forBlock.moveBy(posX, posY);
        }

        createdBlock = forBlock;
      } catch (e) {
        console.warn('Fallback para construtor XML do laço for:', e);
      }
    }

    // 2. PARSER ROBUSTO DE XML COM RESOLUÇÃO PRÉVIA DE VARIÁVEIS E TRANSFORMAÇÃO DE SHADOWS
    if (!createdBlock && xmlString && xmlString.trim()) {
      try {
        let cleanXml = xmlString.trim();
        if (!cleanXml.startsWith('<xml')) {
          cleanXml = `<xml xmlns="https://developers.google.com/blockly/xml">${cleanXml}</xml>`;
        }
        const parseXml = Blockly.Xml.textToDom || (Blockly.utils && Blockly.utils.xml && Blockly.utils.xml.textToDom);
        const dom = parseXml(cleanXml);

        // Pré-cria todas as variáveis declaradas no XML para que o Blockly associe os IDs reais
        const varFields = dom.querySelectorAll('field[name="VAR"]');
        varFields.forEach(f => {
          const vName = f.textContent ? f.textContent.trim() : '';
          if (vName) {
            let varModel = null;
            if (typeof ws.getVariable === 'function') varModel = ws.getVariable(vName);
            if (!varModel && typeof ws.createVariable === 'function') {
              try { varModel = ws.createVariable(vName); } catch(e) {}
            }
            if (varModel && varModel.getId) f.setAttribute('id', varModel.getId());
          }
        });

        // Transforma todos os nós shadow em blocos concretos para que o domToWorkspace não os ignore
        const shadows = dom.querySelectorAll('shadow');
        shadows.forEach(sh => {
          const blk = dom.ownerDocument.createElement('block');
          Array.from(sh.attributes).forEach(attr => blk.setAttribute(attr.name, attr.value));
          blk.innerHTML = sh.innerHTML;
          sh.parentNode.replaceChild(blk, sh);
        });

        const rootBlocks = dom.children ? Array.from(dom.children).filter(c => c.tagName && c.tagName.toLowerCase() === 'block') : [];
        if (rootBlocks.length > 0) {
          rootBlocks.forEach((bEl, bIdx) => {
            bEl.setAttribute('x', Math.round(posX));
            bEl.setAttribute('y', Math.round(posY + bIdx * 190));
          });
        } else {
          const blockEl = dom.querySelector('block');
          if (blockEl) {
            blockEl.setAttribute('x', Math.round(posX));
            blockEl.setAttribute('y', Math.round(posY));
          }
        }

        const newIds = Blockly.Xml.domToWorkspace(dom, ws);
        if (newIds && newIds.length > 0) {
          createdBlock = ws.getBlockById(newIds[0]);
        }
      } catch (err) {
        console.warn('Erro ao inserir via XML:', err);
      }
    }

    // 3. FALLBACK DE INSTANCIAÇÃO DIRETA
    if (!createdBlock && type && type !== 'controls_for_contagem') {
      try {
        createdBlock = ws.newBlock(type);
        if (createdBlock) {
          createdBlock.initSvg();
          createdBlock.render();
          if (typeof createdBlock.moveTo === 'function') {
            createdBlock.moveTo(new Blockly.utils.Coordinate(posX, posY));
          } else if (typeof createdBlock.moveBy === 'function') {
            createdBlock.moveBy(posX, posY);
          }
        }
      } catch (e) {
        console.error('Erro ao instanciar bloco simples:', e);
      }
    }

    if (createdBlock) {
      if (typeof createdBlock.select === 'function') {
        createdBlock.select();
      }
      if (Blockly.Events && typeof Blockly.Events.fire === 'function' && Blockly.Events.BlockCreate) {
        Blockly.Events.fire(new Blockly.Events.BlockCreate(createdBlock));
      }
      showToast('✨ Bloco inserido na área de trabalho!');
    }
  }

  function showToast(message) {
    let toast = document.getElementById('satRefToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'satRefToast';
      toast.className = 'sat-ref-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2400);
  }

  function copySnippet(btn) {
    const codeBox = btn.closest('.sat-ref-code-content');
    if (!codeBox) return;
    const codeEl = codeBox.querySelector('code');
    if (!codeEl) return;
    
    const text = codeEl.innerText || codeEl.textContent;
    navigator.clipboard.writeText(text).then(() => {
      const origText = btn.textContent;
      btn.textContent = '✓ Copiado!';
      btn.style.background = '#22c55e';
      btn.style.color = '#ffffff';
      setTimeout(() => {
        btn.textContent = origText;
        btn.style.background = '';
        btn.style.color = '';
      }, 1800);
    }).catch(err => {
      console.warn('Falha ao copiar:', err);
    });
  }

  return {
    init,
    showTopic,
    copySnippet,
    handleDragStart,
    insertBlockFromElement,
    insertBlockToWorkspace
  };
})();
