const fs = require('fs');
const path = require('path');

const docsDir = path.join(__dirname, 'public', 'docs');
const docsOutputFile = path.join(__dirname, 'public', 'docs_list.json');

if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

async function main() {
  const files = fs.readdirSync(docsDir).filter(f => f.endsWith('.html'));

  const docs = files.map(file => {
    const filePath = path.join(docsDir, file);
    const content = fs.readFileSync(filePath, 'utf8');

    // Extract title from HTML
    const titleMatch = content.match(/<title>(.*?)<\/title>/i);
    let title = titleMatch ? titleMatch[1].trim() : file.replace('.html', '');

    // Extract category if available (meta name="category")
    const catMatch = content.match(/<meta\s+name=["']category["']\s+content=["'](.*?)["']/i);
    let category = catMatch ? catMatch[1].trim() : '📁 مستندات عمومی';

    // Extract body content
    let textContent = '';
    const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    let bodyContent = bodyMatch ? bodyMatch[1] : content;

    // Remove script and style blocks completely
    bodyContent = bodyContent.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
    bodyContent = bodyContent.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');

    // Remove all other HTML tags
    textContent = bodyContent.replace(/<[^>]+>/g, ' ');
    textContent = textContent.replace(/\s+/g, ' ').trim();

    return {
      file: file,
      path: `/docs/${encodeURIComponent(file)}`,
      title: title,
      category: category,
      text: textContent,
      timestamp: fs.statSync(filePath).mtimeMs
    };
  });

  // Sort docs by modification date (newest first)
  docs.sort((a, b) => b.timestamp - a.timestamp);

  // Write docs_list.json
  fs.writeFileSync(docsOutputFile, JSON.stringify(docs));
  console.log(`[+] Docs & Articles list updated! Found ${docs.length} document(s).`);
}

main().catch(console.error);
