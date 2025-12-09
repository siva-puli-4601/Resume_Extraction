import fs from 'fs-extra';
import path from 'path';
import { createWorker } from 'tesseract.js';

const LANG_PATH = path.join(process.cwd(), 'langdata');

async function ocrImage(buffer) {
  const worker = await createWorker({
    langPath: LANG_PATH,
    cacheMethod: 'readOnly', // prevent fetch
    logger: (m) => console.log('OCR:', m.status, m.progress?.toFixed?.(2))
  });

  await worker.load();
  await worker.loadLanguage('eng');
  await worker.initialize('eng');

  const { data: { text } } = await worker.recognize(buffer);
  await worker.terminate();
  return text;
}

export async function extractTextFromPDF(pdfPath) {
  const workDir = path.join(path.dirname(pdfPath), `ocr_temp_${Date.now()}`);
  await fs.ensureDir(workDir);

  await import('pdf-poppler').then(m => m.default ? m.default.convert(pdfPath, {
    format: 'png', out_dir: workDir, out_prefix: 'page', dpi: 300
  }) : m.convert(pdfPath, {
    format: 'png', out_dir: workDir, out_prefix: 'page', dpi: 300
  }));

  const files = (await fs.readdir(workDir))
    .filter(f => f.endsWith('.png')).sort();

  const texts = [];
  for (const fname of files) {
    const buffer = await fs.readFile(path.join(workDir, fname));
    const pageText = await ocrImage(buffer);
    texts.push(pageText);
  }

  await fs.remove(workDir);
  return texts.join('\n');
}
