# VR Video Converter (v.1.0.3)

Aplicação web client-side completa, profissional e de alto desempenho para conversão e visualização de vídeos convencionais (**2D**), vídeos hemisféricos (**180°**) e vídeos panorâmicos (**360°**) em formatos adequados para **Realidade Virtual (VR)**, **Google Cardboard**, **Side-by-Side (SBS Half / Full)** e **Top-and-Bottom (Over/Under)**.

O processamento é **100% local e offline**, executado inteiramente no navegador do usuário utilizando **FFmpeg compilado para WebAssembly (WASM single-thread)**. Nenhum arquivo de vídeo é enviado para a internet ou servidores externos — sua mídia permanece totalmente segura e privada no seu computador.

---

## Sumário

- [O Que Há de Novo na Versão 6 (v.1.0.3)](#-o-que-há-de-novo-na-versão-6-v103)
- [Histórico de Versões Anteriores (v.1.0.2 / v.1.0.1)](#-histórico-de-versões-anteriores)
- [Fundamentos Conceituais Obrigatórios](#-fundamentos-conceituais-obrigatórios)
  - [Projeção vs. Layout Estereoscópico](#1-projeção-geométrica-vs-layout-estereoscópico)
  - [Estereoscopia (Mono, SBS, Top/Bottom)](#2-estereoscopia-mono-vs-estéreo)
  - [Google Cardboard e a Ilusão de Profundidade](#3-google-cardboard-e-a-ilusão-de-profundidade)
- [Como Funciona](#-como-funciona)
- [Como Executar](#-como-executar)
  - [Método 1: Servidor HTTP Local (Recomendado)](#método-1-servidor-http-local-recomendado)
  - [Método 2: Abertura Direta (`index.html`)](#método-2-abertura-direta-indexhtml)
- [Fluxo de Conversão e Pipeline Per-Eye](#-fluxo-de-conversão-e-pipeline-per-eye)
- [Formatos, Projeções e Presets](#-formatos-projeções-e-presets)
  - [Processamento 2D](#processamento-2d)
  - [Processamento 180° Hemisférico](#processamento-180-hemisférico)
  - [Processamento 360° Panorâmico](#processamento-360-panorâmico)
  - [Conversões Cruzadas: Top/Bottom ↔ SBS](#conversões-cruzadas-topbottom--sbs)
  - [Projeções: Equirretangular, Fisheye e Dual Fisheye](#projeções-equirretangular-fisheye-e-dual-fisheye)
- [Visualizador VR WebGL Interativo](#-visualizador-vr-webgl-interativo)
  - [Navegação e Controles (Mouse, Touch, Zoom)](#navegação-e-controles)
  - [Giroscópio (DeviceOrientation)](#giroscópio-deviceorientation)
  - [WebXR e Estratégia de Fallback](#webxr-e-estratégia-de-fallback)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Testes Automatizados (Testes A ao I)](#-testes-automatizados-testes-a-ao-i)
- [Limitações Conhecidas e Honestidade Técnica](#-limitações-conhecidas-e-honestidade-técnica)
- [Licença](#-licença)

---

## ⚡ O Que Há de Novo na Versão 6 (v.1.0.3)

1. **Ampulheta SVG Girando de Verdade (`@keyframes conversion-hourglass-spin`)**:
   - Animação contínua em CSS aplicada à classe `.conversion-hourglass.is-active`, girando ininterruptamente a `1.5s linear infinite` durante todo o ciclo ativo da conversão.
   - Vinculada aos estados reais de conversão: gira continuamente durante `loading`, `processing`, `slow` e `finishing`.
   - Para imediatamente e altera para o respectivo ícone em `completed` (sucesso), `error` (erro) e `cancelled` (cancelamento).
   - Suporte a acessibilidade (`aria-hidden="true"`) e `@media (prefers-reduced-motion: reduce)`.

2. **Separação Visual Clara e Organização dos Cards de Progresso**:
   - Eliminação da aparência de bloco único colado: introduzido espaçamento evidente com `gap: 16px`.
   - Estrutura hierárquica em duas linhas:
     - **Linha 1 (Tempo - 3 Cards)**: Tempo Decorrido, Tempo Restante Estimado e Tempo Total Estimado.
     - **Linha 2 (Desempenho e Frames - 2 Cards)**: Velocidade FFmpeg (com selo de status) e Quadro Atual.
   - Cada card possui sua própria borda (`border: 1px solid rgba(255, 255, 255, 0.12)`), fundo contrastante `#0d121d`, cantos arredondados (`border-radius: 12px`), sombra suave (`box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3)`) e hover discreto (`translateY(-2px)`).
   - Tipografia refinada: ícone SVG alinhado ao título do card e valores com destaque tipográfico (`font-size: 1.25rem; font-weight: 700`).

3. **Alerta de Processamento Lento Aprimorado**:
   - Caixa de aviso com ícone SVG inline vetorial amarelo e mensagem discreta sem emojis: `"Processamento lento detectado. A conversão continua normalmente."`

---

## 🌟 Histórico de Versões Anteriores

### Versão 5 (v.1.0.2)

1. **Estimativa de Tempo Realista e Suavizada**:
   - Algoritmo baseado nos dados reais do FFmpeg: calcula simultaneamente o tempo restante por **velocidade FFmpeg (`speed=...x`)** e por **taxa de processamento de quadros (`frames / elapsed`)**.
   - **Média móvel (Moving Average com aparagem de outliers)** para eliminar oscilações bruscas nos primeiros momentos de codificação.
   - Apresentação contínua de **Tempo Decorrido**, **Tempo Restante Estimado**, **Tempo Total Estimado** e **Previsão de Horário de Conclusão** (`aproximadamente às HH:MM`).
   - Sem contadores artificiais nem `setTimeout` falso.

2. **Ampulheta Animada e Estados Visuais**:
   - Ícone SVG inline com animação contínua em CSS (`@keyframes hourglass-spin`).
   - Estados visuais dedicados: `loading`, `processing`, `slow`, `finishing`, `completed`, `error` e `cancelled`.
   - A ampulheta cessa a rotação e dá lugar a ícones específicos de conclusão, erro ou cancelamento.
   - Suporte a acessibilidade e `prefers-reduced-motion: reduce`.

3. **Regra Estrita de Zero Emojis e Ícones SVG Inline**:
   - Interface 100% livre de caracteres emoji.
   - Substituição integral por ícones vetoriais SVG inline leves, nítidos em qualquer escala e totalmente funcionais offline (sem dependência de fontes CDN como FontAwesome, Lucide ou Material Icons).

4. **Detecção e Alerta de Conversões Pesadas**:
   - Análise prévia da complexidade do vídeo através do cálculo de pixels por quadro (`largura × altura`), vazão de pixels por segundo (`pixels/frame × FPS`) e total de quadros.
   - Alerta modal preventivo para vídeos em 4K/60FPS com 3 alternativas claras: **Continuar**, **Usar configuração recomendada (1080p equilibrado)** ou **Cancelar**.
   - Respeito integral à decisão do usuário: a resolução e FPS originais nunca são reduzidos sem permissão explícita.

5. **Modo Teste Rápido e Presets de Desempenho**:
   - Preset de **Teste Rápido** (720p, SBS Half, H.264, qualidade média, original FPS) para validação ultra-rápida do pipeline completo (upload → WASM → preview → download).
   - Presets de codificação: **Rápido**, **Equilibrado**, **Alta qualidade**, **Máxima qualidade** e **Personalizado**.

6. **Estabilidade e Throttling da Interface**:
   - Atualização do DOM agrupada em intervalos de ~500ms, impedindo congelamento ou perda de desempenho da main thread durante a emissão intensa de eventos do WebAssembly.

---

## 🌟 Histórico de Versões Anteriores

### Versão 3 e 4

1. **Configuração VR Avançada Modular**:
   - Controle independente entre **Tipo de Entrada** (2D, 180°, 360°), **Projeção** (Equirretangular, Fisheye, Dual Fisheye), **Estereoscopia de Entrada** (Mono, SBS, Top/Bottom) e **Layout de Saída** (SBS Half, SBS Full, Top/Bottom, Cardboard).
   - Ocultamento inteligente de campos irrelevantes (vídeos 2D ocultam parâmetros de projeção e FOV esférico).
2. **Arquitetura Per-Eye (Processamento Olho a Olho)**:
   - Funções isoladas para extrair olho esquerdo (`extractLeftEye`), olho direito (`extractRightEye`) e recombinar (`combineEyes`) via `hstack` ou `vstack`.
   - Suporte completo e real a conversões cruzadas: `Top/Bottom → SBS`, `SBS → Top/Bottom`, `Mono → SBS`, `Mono → Top/Bottom`.
3. **Visualizador VR Real em WebGL**:
   - Shaders GLSL e malhas geométricas em 3D: **Esfera completa** para 360°, **Hemisfério frontal** para 180°, e **Painel Plano Estéreo** para 2D.
   - Navegação por mouse (Yaw / Pitch), scroll para zoom (FOV dinâmico de 30° a 110°), touch swipe com gesto de pinça no celular.
   - Modo Google Cardboard estéreo com lente dividida em tempo real via WebGL viewports.
   - Sensores de giroscópio com solicitação de permissão de orientação móvel.
   - Detecção nativa de WebXR (`navigator.xr`) com fallback transparente para Cardboard WebGL e player convencional.
4. **Calibração de Projeção Fisheye (Modo Experimental)**:
   - Painel interativo com ajuste de Centro X, Centro Y, Raio circular e Campo de Visão (FOV).
5. **Detecção Probabilística de Mídia**:
   - Analisa largura, altura, proporção (2:1 para 360°, 1:1 para 180° mono, 16:9 para 2D) e nomes de arquivo com avisos contextuais e honestos (ex: *"Detectado possivelmente como 360°"* sem afirmações absolutas).
6. **Suíte Completa de Testes A a I**:
   - 9 testes reais ponta a ponta com o binário WebAssembly do FFmpeg gerando arquivos MP4 reais e verificando integridade.

---

## 🧠 Fundamentos Conceituais Obrigatórios

### 1. Projeção Geométrica vs. Layout Estereoscópico

É fundamental não confundir **como a imagem é mapeada espacialmente** com **como os canais para cada olho estão organizados no quadro**:

- **Projeção (Mapeamento Espacial)**:
  - **Equirretangular (2:1)**: Mapeia uma esfera de 360° × 180° em uma grade plana retangular onde as coordenadas X representam longitude e Y representam latitude.
  - **Equirretangular 180°**: Mapeia apenas o hemisfério frontal (180° horizontal × 180° vertical), preservando a projeção angular sem distorção panorâmica excessiva.
  - **Fisheye**: Projeção curvilínea circular produzida por lentes ultra-grande-angulares. Requer calibração óptica (centro da lente, raio do círculo de imagem e FOV).
  - **Dual Fisheye**: Duas imagens circulares fisheye justapostas geradas por câmeras de lentes duplas opostas (como a Insta360 ONE ou Ricoh Theta).
- **Layout Estereoscópico (Organização dos Olhos)**:
  - **Side-by-Side (SBS)**: Não é uma projeção! É apenas a convenção de dispor o olho esquerdo à esquerda e o direito à direita no mesmo frame de vídeo.
  - **Top-and-Bottom (TB / Over-Under)**: Olho esquerdo na metade superior e olho direito na metade inferior.

### 2. Estereoscopia: Mono vs. Estéreo

- **Mono (Monoscópico)**:
  - O vídeo possui apenas um único ponto de vista (uma única câmera).
  - Ao converter um vídeo Mono para SBS ou Cardboard, a aplicação **duplica o mesmo quadro para ambos os olhos**.
  - ⚠️ **Aviso de honestidade**: Duplicar a imagem permite que você assista ao vídeo dentro de um headset VR ou Google Cardboard sem cansaço visual, mas **NÃO cria profundidade estereoscópica 3D real**. Não existem objetos "saltando da tela" em um vídeo mono duplicado.
- **Estéreo (Estereoscópico)**:
  - O vídeo foi capturado com duas lentes separadas pela distância interpupilar (IPD).
  - O arquivo de entrada já contém duas imagens ligeiramente deslocadas (em SBS ou Top/Bottom). A conversão separa os dois fluxos e os remonta no layout desejado mantendo a paralaxe e o efeito 3D real.

### 3. Google Cardboard e a Ilusão de Profundidade

O **Google Cardboard** é um suporte óptico simples com duas lentes biconvexas que posicionam cada olho diretamente sobre metade da tela de um smartphone:
- Para vídeos 2D convencionais, o Cardboard funciona como uma **tela de cinema virtual**.
- Para vídeos 180° e 360°, o Cardboard permite ao usuário imergir na cena girando a cabeça, graças ao sensor giroscópico do celular.

---

## ⚙️ Como Funciona

```text
USUÁRIO
   ↓ Seleciona vídeo localmente (MP4, MKV, MOV, WEBM)
NAVEGADOR
   ↓ Lê o arquivo na memória como ArrayBuffer / Uint8Array
WEB WORKER DEDICADO (Isolamento de Thread)
   ↓ Escreve no sistema de arquivos virtual (FS) do Emscripten
FFmpeg WebAssembly (WASM 32.2 MB - libx264 + AAC)
   ↓ Pipeline Per-Eye: crop / split / scale / pad / hstack / vstack
   ↓ Emite métricas reais em tempo real (tempo decorrido, FPS, progresso %)
ARQUIVO FINAL GERADO
   ↓ Validação de integridade (outputData.length > 0 e Blob.size > 0)
DOWNLOAD & PREVIEW REAL
   ↓ Player reproduz o Blob gerado e botão [BAIXAR VÍDEO] salva no computador
```

- **Sem backend**: Não utiliza Node.js, Express, Flask, Django, PHP ou qualquer API externa durante a conversão.
- **Zero Vazamento de Memória**: O sistema descarta buffers de entrada e saída imediatamente após o término e revoga ObjectURLs ao resetar.
- **Cancelamento em Tempo Real**: Se o usuário cancelar a conversão, o Web Worker é imediatamente terminado (`worker.terminate()`) e reinicializado limpo.

---

## 🚀 Como Executar

### Método 1: Servidor HTTP Local (Recomendado)

Devido às políticas de segurança dos navegadores modernos (CORS e Web Workers em `file://`), a forma recomendada e mais estável de executar o projeto offline é iniciando um servidor HTTP local simples:

#### Com Python (pré-instalado no Windows/Mac/Linux):
```bash
# Na pasta raiz do projeto:
python -m http.server 8000
```

#### Com Node.js / NPM:
```bash
npm start
```
ou
```bash
npx serve .
```

Em seguida, abra seu navegador em:
```text
http://localhost:8000
```

---

### Método 2: Abertura Direta (`index.html`)

Você também pode abrir o arquivo `index.html` diretamente no navegador. 
> **Nota técnica:** Em navegadores com restrições rígidas para Web Workers em protocolos `file://` (como o Chrome em certas configurações de segurança), utilize o **Método 1** para garantir que os módulos ES6 e os Web Workers carreguem sem bloqueios de segurança do navegador.

---

## 🔄 Fluxo de Conversão e Pipeline Per-Eye

Toda transformação é construída em torno do conceito de pipeline olho a olho:

```text
               ┌──────────────────────────────┐
               │         VÍDEO FONTE          │
               └──────────────┬───────────────┘
                              │
                    [ Decodificação WASM ]
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
           [ extractLeftEye ]   [ extractRightEye ]
           - Crop L/R ou T/B    - Crop L/R ou T/B
           - Ajuste Projeção    - Ajuste Projeção
           - Scale aspect       - Scale aspect
                    │                   │
                    └─────────┬─────────┘
                              │
                     [ combineEyes ]
                     - hstack (para SBS Half / Full)
                     - vstack (para Top/Bottom)
                              │
                    [ Encode libx264 + aac ]
                              │
               ┌──────────────▼──────────────┐
               │    ARQUIVO FINAL (.mp4)     │
               └─────────────────────────────┘
```

---

## 🥽 Formatos, Projeções e Presets

### Processamento 2D
- **2D Mono → SBS Half (Cardboard)**: A imagem é comprimida para metade da largura (`scale=W/2:H`) e duplicada lado a lado via `hstack`. Resultado mantém as dimensões totais originais.
- **2D Mono → SBS Full**: A imagem mantém a largura total original para cada olho (`scale=W:H`) e é duplicada lado a lado via `hstack`. A resolução horizontal final dobra (`2W × H`).
- **2D Mono → Top/Bottom**: Duplica a imagem superior e inferior via `vstack`.

### Processamento 180° Hemisférico
- **180° Mono → SBS**: Preserva o campo de visão de 180 graus. Duplica o panorama frontal para ambos os olhos sem esticar ou cortar.
- **180° Stereo SBS → SBS**: Extrai a metade esquerda do quadro original para o olho esquerdo e a metade direita para o olho direito, mantendo a proporção de cada olho intacta.

### Processamento 360° Panorâmico
- **360° Equirretangular Mono → SBS**: Preserva a proporção esférica 2:1 (ex: `3840 × 1920` ou `1920 × 960`). Duplica a textura equirretangular para ambos os olhos.
- **360° Stereo SBS → SBS**: Separa os dois panoramas lado a lado (`crop=iw/2:ih:0:0` e `crop=iw/2:ih:iw/2:0`) e os recombina na resolução desejada.

### Conversões Cruzadas: Top/Bottom ↔ SBS
- **Top/Bottom → SBS**:
  - Olho Esquerdo: Metade superior (`crop=iw:ih/2:0:0`).
  - Olho Direito: Metade inferior (`crop=iw:ih/2:0:ih/2`).
  - Combinação: `hstack` horizontal.
- **SBS → Top/Bottom**:
  - Olho Esquerdo: Metade esquerda (`crop=iw/2:ih:0:0`).
  - Olho Direito: Metade direita (`crop=iw/2:ih:iw/2:0`).
  - Combinação: `vstack` vertical.

### Projeções: Equirretangular, Fisheye e Dual Fisheye
- **Equirretangular**: Totalmente suportada na conversão e no visualizador WebGL.
- **Fisheye e Dual Fisheye (Experimental)**:
  - Câmeras fisheye circulares projetam a luz através de lentes hemisféricas diretamente no sensor.
  - A interface disponibiliza a **Calibração de Projeção** com controles finos de:
    - *Centro X* (% da largura)
    - *Centro Y* (% da altura)
    - *Raio* (% da dimensão)
    - *FOV* (Graus angulares, tipicamente 180° a 220°)
    - *Rotação* (-180° a +180°)
  - ⚠️ **Aviso de honestidade**: Transformações geométricas perfeitas de fisheye para equirretangular exigem matrizes de calibração intrínseca e extrínseca da lente específica. Sem os parâmetros exatos do fabricante, o resultado pode apresentar deformações nas bordas.

---

## 🌐 Visualizador VR WebGL Interativo

A aplicação inclui um visualizador tridimensional completo construído do zero em **WebGL nativo (sem dependências de frameworks externos)**:

### Navegação e Controles
- **Mouse (Desktop)**: Clique e arraste para navegar em 360° (Yaw e Pitch). Scroll da roda do mouse controla o **Zoom / FOV** dinamicamente entre 30° e 110°.
- **Touch (Mobile)**: Deslize com o dedo para girar a câmera. Gesto de pinça com dois dedos ajusta o zoom da visualização.
- **Controles de Teclado**: Use setas para mover a câmera e teclas `+` e `-` para zoom.
- **Barra de Ferramentas Dedicada**: Controles rápidos de Reset de Câmera, Alternador Cardboard Split e Slider de FOV.

### Giroscópio (DeviceOrientation)
- Suporta a API moderna de sensores e `DeviceOrientationEvent`.
- Em dispositivos móveis (Android e iOS 13+ com permissão via `requestPermission()`), a câmera se alinha com o movimento físico da sua cabeça no espaço.

### WebXR e Estratégia de Fallback
A aplicação nunca fica inacessível por falta de hardware específico. A cadeia de contingência é rigorosamente respeitada:
1. **WebXR Immersive-VR (`navigator.xr`)**: Quando detectado um headset conectado (como Meta Quest, HTC Vive ou PC VR com WebXR habilitado), disponibiliza a opção de imersão direta no headset.
2. **Modo Google Cardboard SBS (WebGL Dual Viewport)**: Se o WebXR não estiver disponível, divide a tela do navegador em duas metades com sincronia de ângulo para uso com óculos de smartphone.
3. **Visualizador Panorâmico 360° / 180° Convencional**: Permite navegação direta com mouse ou giroscópio em tela cheia.
4. **Player de Vídeo Nativo**: Fallback básico com controles normais de reprodução.

---

## 📁 Estrutura do Projeto

```text
video-to-VR/
│
├── index.html              # Interface completa e responsiva com Seção VR Avançada
├── package.json            # Configuração de scripts de teste (npm test / npm start)
├── README.md               # Documentação técnica completa (Versão 3)
├── LICENSE                 # Licença de uso MIT
│
├── css/
│   └── style.css           # Estilos Dark Mode, Glassmorphism, Calibração e VR Viewer
│
├── js/
│   ├── app.js              # Orquestrador central e gerenciador de eventos
│   ├── converter.js        # Validação de regras e execução de pipelines FFmpeg
│   ├── ffmpeg.js           # Gerenciador da thread principal e ciclo de vida do worker
│   ├── ffmpeg-worker.js    # Web Worker dedicado à execução WebAssembly
│   ├── video-info.js       # Extração de metadados e heurísticas de detecção de vídeo
│   ├── vr-processing.js    # Pipeline Per-Eye, gerador de filtros FFmpeg e presets
│   ├── vr-viewer.js        # Visualizador WebGL 3D (esfera 360°, cúpula 180°, Cardboard)
│   ├── ui.js               # Atualização reativa e dinâmica de estados da interface
│   └── utils.js            # Utilitários de formatação, sanitização e nomenclatura
│
├── lib/
│   └── ffmpeg/             # Binários e bibliotecas WebAssembly 100% offline
│       ├── ffmpeg-core.js
│       ├── ffmpeg-core.wasm (32.2 MB)
│       └── ffmpeg-util.js
│
├── assets/
│   ├── icons/              # Ícones SVG da interface (VR, Cardboard, Upload, etc.)
│   └── images/
│
└── tests/
    ├── test_2d.mp4         # Mídia de teste 2D para validação de pipeline
    ├── test_180.mp4        # Mídia de teste 180° Mono
    ├── test_180_sbs.mp4    # Mídia de teste 180° Estéreo SBS
    ├── test_360.mp4        # Mídia de teste 360° Equirretangular Mono
    ├── test_360_sbs.mp4    # Mídia de teste 360° Estéreo SBS
    ├── test_360_tb.mp4     # Mídia de teste 360° Estéreo Top/Bottom
    ├── test_conversions.js # Suite inicial de conversão
    └── test_v3_suite.js    # Suite oficial da Versão 3 (Testes Unitários + Testes A a I)
```

---

## 🧪 Testes Automatizados (Testes A ao I)

O projeto conta com uma suíte de testes automatizados rigorosa em [tests/test_v3_suite.js](tests/test_v3_suite.js).

Para rodar a suíte completa:
```bash
npm test
```

### Bloco 1: Testes de Lógica Pura
- `makeEven()`: Garante dimensões pares obrigatórias para o encoder H.264 (`yuv420p`).
- `calculateAspectRatio()`: Proporções exatas 16:9, 2:1, 4:3, 1:1.
- `detectVideoType()`: Detecção probabilística honesta com níveis de confiança.
- `buildOutputFileName()`: Nomenclatura descritiva automática (`_VR_360_SBS`, `_Cardboard_SBS`, etc.).
- `validateVRConfiguration()`: Detecção de combinações inválidas (ex: 2D + Fisheye) e avisos de conversões sem profundidade.
- Invalidação de saídas corrompidas ou vazias (`0 bytes`).

### Bloco 2: Execuções Reais de Conversão com FFmpeg WASM (Testes A a I)
Todos os testes a seguir executam o binário `lib/ffmpeg/ffmpeg-core.wasm` real:

| Teste | Entrada | Saída | Verificação | Status |
|:---:|:---|:---|:---|:---:|
| **A** | 2D Mono | SBS Half | Filtro `scale=iw/2:ih,split[l][r];[l][r]hstack` | ✅ PASS |
| **B** | 2D Mono | SBS Full | Filtro `split[l][r];[l][r]hstack` | ✅ PASS |
| **C** | 2D Mono | Cardboard | Perfil otimizado para celulares (H.264 + AAC) | ✅ PASS |
| **D** | 360° Equirretangular Mono | SBS | Preserva panorama 2:1 duplicado para ambos os olhos | ✅ PASS |
| **E** | 360° Stereo SBS | SBS | Separa olho E/D e recombina lado a lado | ✅ PASS |
| **F** | 360° Stereo Top/Bottom | SBS | Separa metades superior/inferior e converte para SBS | ✅ PASS |
| **G** | 360° Stereo SBS | Top/Bottom | Separa metades esquerda/direita e converte para TB | ✅ PASS |
| **H** | 180° Equirretangular Mono | SBS | Preserva campo de visão de 180° duplicado | ✅ PASS |
| **I** | 180° Stereo SBS | SBS | Preserva hemisfério com separação estéreo real | ✅ PASS |

---

## ⚠️ Limitações Conhecidas e Honestidade Técnica

1. **Memória WebAssembly (WASM 32-bit)**:
   - Os navegadores limitam a memória linear de instâncias WASM de 32 bits a aproximadamente **2 GB**.
   - Para vídeos de altíssima resolução (4K/8K) ou arquivos muito longos (acima de 1,5 GB a 2 GB), o navegador pode esgotar a memória (`OOM`). Recomenda-se dividir vídeos extensos em segmentos menores.
2. **Vídeo 2D Não Gera Profundidade 3D Estereoscópica Real**:
   - A conversão de um vídeo comum 2D para SBS ou Cardboard simplesmente duplica o mesmo ângulo para os dois olhos.
   - Isso permite visualizar a cena confortavelmente em uma tela virtual dentro do headset, mas **não introduz relevo ou paralaxe tridimensional artificial**.
3. **Calibração de Lentes Fisheye e Dual Fisheye**:
   - Fisheye e Dual Fisheye continuam identificados como **Modo Experimental**. Para uma conversão geométrica perfeita sem aberrações circulares nas bordas, é necessário utilizar os perfis de câmera específicos fornecidos pelo fabricante da câmera (ex: Insta360 Studio, GoPro Player).
4. **Sem Conexão Externa Obrigatória**:
   - A aplicação foi projetada para ser **100% autossuficiente**. Nenhum recurso obrigatório depende de CDNs como `unpkg`, `jsdelivr` ou `cdnjs`.

## 🔧 Solução de Problemas do FFmpeg WebAssembly

### Erro: `expected magic word 00 61 73 6d, found 3c 21 44 4f`

#### Causa Técnica Identificada:
- A assinatura mágica obrigatória de qualquer arquivo binário WebAssembly é `0x00 0x61 0x73 0x6d` (`\0asm`).
- Os bytes `0x3c 0x21 0x44 0x4f` correspondem em código ASCII aos caracteres `<!DO` (início de `<!DOCTYPE html>`).
- Este erro ocorre quando o navegador solicita o arquivo `ffmpeg-core.wasm` em um caminho não encontrado pelo servidor local (por exemplo, `/js/ffmpeg-core.wasm`), e o servidor web (como o `python -m http.server`) devolve uma página de erro 404 em HTML com código HTTP 404. O Emscripten tenta instanciar esse corpo HTML como se fosse binário WebAssembly, disparando a exceção `CompileError`.

#### Solução Definitiva Implementada na Versão v.1.0.1:
1. **Validação Prévia do Binário (`validateWasmBinary`)**:
   - Antes da inicialização do FFmpeg, o sistema requisita o arquivo `.wasm` e valida `response.ok` (HTTP 200).
   - Inspeciona os 4 primeiros bytes do buffer. Se identificar `3c 21 44 4f` ou cabeçalho `text/html`, cancela a operação imediatamente e apresenta mensagem técnica clara ao usuário, sem repassar HTML ao compilador WASM.
2. **Injeção Direta de Buffer (`wasmBinary`)**:
   - O `ArrayBuffer` verificado é repassado diretamente para a função construtora `createFFmpegCore({ wasmBinary })`. Dessa forma, o Emscripten não tenta realizar requisições secundárias ou sincronizadas por XHR.
3. **Resolução Absoluta e Redundância de Caminhos**:
   - Os arquivos do FFmpeg estão organizados na estrutura canônica `lib/ffmpeg/` com URLs absolutas resolvidas no contexto do Web Worker (`self.location.href`).
   - Disponibilizado fallback local em `js/ffmpeg-core.wasm` para garantir resposta HTTP 200 em qualquer ambiente.

### Como Diagnosticar no Navegador:
1. Abra as Ferramentas do Desenvolvedor (`F12` ou `Ctrl + Shift + I`).
2. Acesse a aba **Network (Rede)** e filtre por `wasm`.
3. Verifique a requisição de `ffmpeg-core.wasm`:
   - **Status**: deve ser `200 OK`.
   - **Content-Type**: deve ser `application/wasm`.
   - **Tamanho**: aproximadamente `32.2 MB`.

---

## 📄 Licença

Este projeto é software livre distribuído sob os termos da licença **MIT**. Consulte o arquivo [LICENSE](LICENSE) para mais detalhes.
