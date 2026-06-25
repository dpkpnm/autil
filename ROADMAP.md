# Autil Roadmap

Add ideas below. Gemini picks from the list, Claude ships them and adds the date.

## Backlog

### Grid
- Spreadsheet Editor — drop a CSV, edit cells inline, add/delete rows and columns, export as CSV or TSV
- Pivot Table — drop a CSV or JSON array, pick row/column/value fields, see a live cross-tab summary

### Image
- Image Cropper — drop an image, drag to select a region, download the cropped file
- Batch Image Converter — drop multiple images, pick a target format (WebP · JPEG · PNG), download a zip

### PDF
- PDF Splitter — drop a PDF, pick page ranges, download each range as its own file
- PDF to Images — drop a PDF, render each page as a PNG via Canvas, download a zip

### Zip
- Zip Inspector — drop a zip file, browse the file tree, preview text files and images inline
- Zip Builder — drop multiple files, set names and folder structure, download the zip

## Shipped

- Countdown Timer — set a date and time, count down to any event live — 6/24
- Loan Calculator — enter principal, rate, and term, see monthly payment and full amortization — 6/24
- Bill Splitter — enter total, tip, and number of people, see per-person breakdown instantly — 6/24
- Word Counter — paste text, see word count, character count, reading time, and top words — 6/24
- Unit Converter — convert length, weight, temperature, area, speed, volume all in one place — 6/24
- Color Palette Extractor — drop any image, get dominant colors as swatches and hex codes — 6/24
- QR Code Generator — type text or URL, get a scannable QR code to download or copy — 6/24
- PDF Merger — drop multiple PDFs, reorder pages, download merged file — 6/24
- Sticker Maker — drop image, draw to outline subject, export transparent PNG — 6/24
- Background Remover — drop image, remove background in-browser via ML, download PNG — 6/24
- Image Resizer — drop image, set width × height or percentage, download resized copy — 6/24
- Image Compressor — drop image, pick quality or max size, download compressed version — 6/24
- Data Grid — CSV · TSV · JSON array → virtual scroll grid, sort, filter, group, IndexedDB — 6/24
- JSON Semantic Diff — compare two JSON payloads, see additions/deletions/modifications highlighted — 6/24
- Cron Humanizer — paste a cron expression, get human-readable schedule and next 5 runtimes — 6/24

## Deferred

- SVG Path Visualizer — paste SVG path data, see interactive preview and cleaned output
- JWT Decoder — paste a JWT, see decoded header/payload/signature with expiry highlighted
- Regex Tester — paste a regex and test strings against it live, see match groups highlighted
- Base64 Inspector — paste base64, auto-detect and decode to text or binary preview
- Hash Generator — paste text, get MD5/SHA-1/SHA-256/SHA-512 all at once via WebCrypto
- UUID Inspector — generate UUIDs or paste one to decode version, variant, and timestamp
- SQL Formatter — paste raw SQL, get it indented, formatted, and keywords uppercased
- DNS Lookup — paste a domain, resolve A/AAAA/MX/TXT/CNAME via DNS over HTTPS
