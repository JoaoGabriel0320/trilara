const fs = require('node:fs')
const path = require('node:path')
const sharp = require('sharp')

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<defs><linearGradient id="f" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#0B1724"/><stop offset="1" stop-color="#163B45"/></linearGradient><radialGradient id="g"><stop stop-color="#5CE0CC" stop-opacity=".38"/><stop offset="1" stop-color="#5CE0CC" stop-opacity="0"/></radialGradient></defs>
<rect width="1200" height="630" fill="url(#f)"/>
<circle cx="1020" cy="60" r="380" fill="url(#g)"/>
<circle cx="1140" cy="620" r="310" fill="url(#g)"/>
<path d="M840 390h180M930 390v145M840 535h180" stroke="#5CE0CC" stroke-width="18" stroke-linecap="round" opacity=".8"/>
<circle cx="840" cy="390" r="20" fill="#F6B786"/><circle cx="1020" cy="390" r="20" fill="#5CE0CC"/><circle cx="930" cy="535" r="20" fill="#F6B786"/>
<rect x="72" y="68" width="68" height="68" rx="19" fill="#5CE0CC"/>
<path d="M89 91h34M106 91v30M89 121h34" stroke="#0B1724" stroke-width="5" stroke-linecap="round"/>
<circle cx="89" cy="91" r="5" fill="#F6B786"/><circle cx="123" cy="91" r="5" fill="#0B1724"/><circle cx="106" cy="121" r="5" fill="#F6B786"/>
<text x="158" y="120" font-family="Arial,Helvetica,sans-serif" font-size="51" font-weight="700" letter-spacing="-3" fill="#F5FAF9">trilara</text>
<text x="72" y="278" font-family="Arial,Helvetica,sans-serif" font-size="62" font-weight="700" letter-spacing="-3" fill="#F5FAF9">Conhecimento que</text>
<text x="72" y="352" font-family="Arial,Helvetica,sans-serif" font-size="62" font-weight="700" letter-spacing="-3" fill="#5CE0CC">se conecta.</text>
<text x="74" y="419" font-family="Arial,Helvetica,sans-serif" font-size="26" fill="#B8CBC8">Sistemas, documentos e pessoas em um só lugar.</text>
<rect x="72" y="505" width="238" height="47" rx="24" fill="#5CE0CC" fill-opacity=".12" stroke="#5CE0CC" stroke-opacity=".35"/>
<text x="98" y="535" font-family="Arial,Helvetica,sans-serif" font-size="18" font-weight="700" letter-spacing="1" fill="#5CE0CC">PROJETO PESSOAL</text>
</svg>`

const destino = path.join(__dirname, '..', 'src', 'app', 'opengraph-image.png')
sharp(Buffer.from(svg)).png().toFile(destino).then(() => {
  fs.writeFileSync(path.join(__dirname, '..', 'src', 'app', 'opengraph-image.alt.txt'), 'Trilara: conhecimento que se conecta. Sistemas, documentos e pessoas em um só lugar.\n')
  process.stdout.write(`Imagem gerada em ${destino}\n`)
}).catch((erro) => { console.error(erro); process.exitCode = 1 })
