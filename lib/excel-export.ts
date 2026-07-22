// Zero-dependency "Excel" export: builds an HTML table and serves it with an
// .xls extension + ms-excel mime type. Excel/Sheets open this as a real
// spreadsheet grid (a well-established technique), no library required.
export function downloadAsExcel(filename: string, headers: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const html = `
    <html><head><meta charset="UTF-8"></head><body>
    <table border="1">
      <thead><tr>${headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>
      <tbody>
        ${rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}
      </tbody>
    </table>
    </body></html>`
  const blob = new Blob(['﻿' + html], { type: 'application/vnd.ms-excel' })
  triggerDownload(blob, filename.endsWith('.xls') ? filename : `${filename}.xls`)
}

export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
