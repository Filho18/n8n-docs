// scripts/generate-pdf.js
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const puppeteer = require("puppeteer");
const https = require("https");

const OUTPUT_DIR = path.join(process.cwd(), "pdfs");
const FINAL_PDF = path.join(process.cwd(), "Compiled-n8n-Docs.pdf");
const SITEMAP_URL = "https://docs.n8n.io/sitemap.xml";

(async () => {
  console.log("🚀 A gerar PDF diretamente do site docs.n8n.io...");

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log("📥 A descarregar sitemap...");
  const sitemapXml = await new Promise((resolve, reject) => {
    https.get(SITEMAP_URL, res => {
      let data = "";
      res.on("data", chunk => (data += chunk));
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });

  const urls = [...sitemapXml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
  console.log(`🔗 Encontradas ${urls.length} páginas.`);

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  const pdfPaths = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const name = url.replace("https://docs.n8n.io/", "").replace(/\//g, "_") || "index";
    const pdfPath = path.join(OUTPUT_DIR, `${name}.pdf`);
    console.log(`📄 (${i + 1}/${urls.length}) ${url}`);

    try {
      await page.goto(url, { waitUntil: "networkidle0", timeout: 0 });
      await page.pdf({ path: pdfPath, format: "A4", printBackground: true });
      pdfPaths.push(pdfPath);
    } catch (err) {
      console.error(`⚠️ Erro ao gerar página ${url}:`, err.message);
    }
  }

  await browser.close();

  console.log("🧩 A unir PDFs...");
  execSync(`pdfunite ${pdfPaths.join(" ")} "${FINAL_PDF}"`);
  console.log(`✅ PDF completo criado: ${FINAL_PDF}`);
})();
