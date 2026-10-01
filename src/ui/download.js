// ==========================================================
// Coloca o link do APK (definido no config.js) no botão de download.
// Assim o endereço fica num lugar só.
// ==========================================================
import { DOWNLOAD_URL } from '../config.js';

export function setupDownloadLinks() {
  document.querySelectorAll('[data-download]').forEach((link) => {
    link.href = DOWNLOAD_URL;
  });
}
