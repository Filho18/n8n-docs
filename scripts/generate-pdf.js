// scripts/generate-pdf.js
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const puppeteer = require("puppeteer");

const BASE_URL = "https://docs.n8n.io/";
const OUTPUT_DIR = path.join(process.cwd(), "pdfs");
const FINAL_PDF = path.join(process.cwd(), "Compiled-n8n-Docs.pdf");

(async () => {
  console.log("🚀 A gerar PDF diretamente do site docs.n8n.io...");

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  console.log("📡 A recolher links do site...");
  await page.goto(BASE_URL, { waitUntil: "networkidle0", timeout: 0 });

  // Extrai todos os links internos
  const links = await page.evaluate(() => {
    const anchors = [...document.querySelectorAll("a")];
    const urls = anchors
      .map(a => a.href)
      .filter(href => href.startsWith("https://docs.n8n.io/") && !href.includes("#"));
    return Array.from(new Set(urls)); // remove duplicados
  });

  console.log(`🔗 Encontrados ${links.length} links.`);

  if (links.length === 0) {
    console.log("⚠️ Nenhum link encontrado. Verifica se o site mudou o HTML base.");
    await browser.close();
    process.exit(1);
  }

  const pdfPaths = [];

  for (let i = 0; i < links.length; i++) {
    const url = links[i];
    const name = url.replace(BASE_URL, "").replace(/\//g, "_") || "index";
    const pdfPath = path.join(OUTPUT_DIR, `${name}.pdf`);

    console.log(`📄 (${i + 1}/${links.length}) ${url}`);

    try {
      await page.goto(url, { waitUntil: "networkidle0", timeout: 0 });
      await page.pdf({ path: pdfPath, format: "A4", printBackground: true });
      pdfPaths.push(pdfPath);
    } catch (err) {
      console.error(`⚠️ Erro ao gerar página ${url}: ${err.message}`);
    }
  }

  await browser.close();

  console.log("🧩 A unir PDFs...");
  execSync(`pdfunite ${pdfPaths.join(" ")} "${FINAL_PDF}"`);
  console.log(`✅ PDF completo criado: ${FINAL_PDF}`);
})();
