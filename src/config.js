// ==========================================================
// Configurações do projeto — troque os valores entre colchetes.
// (Os textos do site ficam no index.html.)
// ==========================================================

export const APP_NAME = 'Palavra Falada';

// Link do APK no GitHub Releases. O formato ".../releases/latest/download/ARQUIVO"
// sempre aponta para o release mais recente — basta publicar um release novo
// com um arquivo de MESMO NOME e o site já baixa a versão nova.
export const DOWNLOAD_URL =
  'https://github.com/[USUARIO]/[REPOSITORIO]/releases/latest/download/palavra-falada.apk';

// Paleta tirada das telas do app (pasta designer/).
// Os mesmos tons estão no CSS como variáveis (--blue, --yellow...).
export const COLORS = {
  blue: 0x2a6fc9, // azul principal (botões, capa)
  blueDark: 0x1b3f73, // azul-marinho dos títulos
  blueSoft: 0xe3f1fc, // azul-clarinho dos campos
  yellow: 0xf6b81a, // ondas de som do logo
  paper: 0xffffff,
  spine: 0x1d559f, // lombada: azul um pouco mais escuro
};

// Cores dos blocos de letras: fundo + cor da letra (contraste alto)
// e uma cor mais escura para as laterais do bloco 3D.
export const TILE_COLORS = [
  { bg: '#2a6fc9', fg: '#ffffff', side: 0x1d559f }, // azul
  { bg: '#f6b81a', fg: '#1b3f73', side: 0xc68f08 }, // amarelo
  { bg: '#f5a332', fg: '#1b3f73', side: 0xc57a14 }, // laranja
  { bg: '#43a047', fg: '#ffffff', side: 0x2e7d32 }, // verde
];
