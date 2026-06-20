// ============================================================================
// atlasExport.js — ATLAS Shared Export Module
// Version: 1.0 | 2026-06-20
//
// Provides branded Word (.docx), Excel (.xlsx), and PowerPoint (.pptx)
// export for all ATLAS tools.
//
// CDN dependencies (include in HTML before this script):
//   docx@8.5.0:     https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js
//   xlsx (SheetJS): https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js
//   pptxgenjs:      https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js
//   FileSaver:      https://cdn.jsdelivr.net/npm/file-saver@2.0.5/dist/FileSaver.min.js
//
// Usage:
//   atlasExport.word(config)    → downloads branded .docx
//   atlasExport.excel(config)   → downloads .xlsx
//   atlasExport.pptx(config)    → downloads branded .pptx
//   atlasExport.getBrand()      → returns brand config from localStorage
//
// ============================================================================

var atlasExport = (function() {

  // ── Brand config from localStorage (set by Settings page) ─────────────────
  function getBrand() {
    var g = {}
    try { g = JSON.parse(localStorage.getItem('atlas_global_cfg') || '{}') } catch(e) {}
    return {
      companyName:  g.companyName  || g.company_name  || g.brand_name || 'ATLAS Platform',
      tagline:      g.companyTagline || '',
      logoUrl:      g.docLogoUrl   || g.logoUrl        || g.logo_url  || null,
      parentName:   g.parentCompanyName || '',
      navy:         (g.brandNavy    || '#002870').replace('#',''),
      orange:       (g.brandOrange  || '#FF5539').replace('#',''),
      teal:         (g.brandTeal    || '#00B290').replace('#',''),
      blue:         (g.brandBlue    || '#1C38F5').replace('#',''),
      amber:        (g.brandAmber   || '#FFB600').replace('#',''),
      font:         g.brandFont     || 'Roboto',
      author:       g.docAuthor     || g.companyName   || 'ATLAS Platform',
      docPrefix:    g.docPrefix     || 'ATLAS'
    }
  }

  // ── Utility ────────────────────────────────────────────────────────────────
  function today() {
    return new Date().toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })
  }

  function slug(str) {
    return (str||'').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g,'')
  }

  function checkLib(name, globalName) {
    if (typeof window[globalName] === 'undefined') {
      console.error('[atlasExport] ' + name + ' library not loaded. Add CDN script tag.')
      return false
    }
    return true
  }

  // ══════════════════════════════════════════════════════════════════════════
  // WORD (.docx) via docx@8.5.0
  // ══════════════════════════════════════════════════════════════════════════
  //
  // config: {
  //   title:       string — document title (H1)
  //   subtitle:    string — subtitle line
  //   filename:    string — output filename (without .docx)
  //   coverColor:  string — hex colour for cover block (optional, defaults to navy)
  //   sections:    [{
  //     heading:   string — section heading
  //     color:     string — hex color for heading (optional)
  //     body:      string | string[] — paragraph text(s)
  //     table:     { headers: string[], rows: string[][] } — optional table
  //     bullets:   string[] — optional bullet list
  //     raw:       docx Paragraph[] — optional pre-built paragraphs
  //   }]
  //   metadata:    { [key]: value } — key-value pairs for a properties section
  //   footer:      string — footer note (optional)
  // }
  // ─────────────────────────────────────────────────────────────────────────
  async function word(config) {
    if (!checkLib('docx', 'docx')) return
    var b = getBrand()
    var {
      Document, Packer, Paragraph, TextRun, PageBreak,
      AlignmentType, HeadingLevel, BorderStyle, WidthType,
      Header, Footer, PageNumber, NumberFormat,
      Table, TableRow, TableCell, ShadingType,
      ImageRun, HorizontalPositionAlign, VerticalPositionAlign
    } = docx

    var FONT    = b.font
    var NAVY    = b.navy
    var ORANGE  = b.orange
    var TEAL    = b.teal
    var PAGE_W  = 11906   // A4 DXA
    var PAGE_H  = 16838
    var MARGIN  = 1134    // ~2cm

    // ── Helpers ─────────────────────────────────────────────────────────────
    function txt(text, opts) {
      return new TextRun(Object.assign({ text: text||'', font: FONT }, opts||{}))
    }

    function para(children, opts) {
      if (typeof children === 'string') children = [txt(children)]
      return new Paragraph(Object.assign({ children: children }, opts||{}))
    }

    function spacer(before) {
      return para([txt('')], { spacing: { before: before||200, after: 0 } })
    }

    function sectionHead(title, hexColor) {
      var color = (hexColor||NAVY).replace('#','')
      return new Paragraph({
        spacing: { before: 440, after: 120 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: color, space: 4 } },
        children: [txt(title, { size: 22, bold: true, color: color, allCaps: true })]
      })
    }

    function bodyPara(text, opts) {
      if (!text || !text.trim()) return null
      return new Paragraph(Object.assign({
        spacing: { before: 0, after: 160, line: 340, lineRule: 'auto' },
        children: [txt(text.trim(), { size: 24, color: '374151' })]
      }, opts||{}))
    }

    function bulletPara(text) {
      return new Paragraph({
        bullet: { level: 0 },
        spacing: { before: 40, after: 80 },
        children: [txt(text, { size: 22, color: '374151' })]
      })
    }

    function kvTable(rows) {
      // Two-column key-value table
      return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: rows.map(function(row) {
          return new TableRow({
            children: [
              new TableCell({
                width: { size: 35, type: WidthType.PERCENTAGE },
                shading: { type: ShadingType.SOLID, color: 'F3F4F6' },
                children: [para([txt(row[0]||'', { bold: true, size: 20, color: '374151' })],
                  { spacing: { before: 80, after: 80 }, indent: { left: 120 } })]
              }),
              new TableCell({
                width: { size: 65, type: WidthType.PERCENTAGE },
                children: [para([txt(row[1]||'', { size: 20, color: '374151' })],
                  { spacing: { before: 80, after: 80 }, indent: { left: 120 } })]
              })
            ]
          })
        })
      })
    }

    function dataTable(headers, rows, headerColor) {
      var hColor = (headerColor||NAVY).replace('#','')
      return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            tableHeader: true,
            children: headers.map(function(h) {
              return new TableCell({
                shading: { type: ShadingType.SOLID, color: hColor },
                children: [para([txt(h||'', { bold: true, size: 18, color: 'FFFFFF' })],
                  { spacing: { before: 80, after: 80 }, indent: { left: 120 } })]
              })
            })
          })
        ].concat(rows.map(function(row, ri) {
          return new TableRow({
            children: row.map(function(cell) {
              return new TableCell({
                shading: ri%2===1 ? { type: ShadingType.SOLID, color: 'F8F9FA' } : undefined,
                children: [para([txt(String(cell||''), { size: 18, color: '374151' })],
                  { spacing: { before: 60, after: 60 }, indent: { left: 120 } })]
              })
            })
          })
        }))
      })
    }

    // ── Cover section ────────────────────────────────────────────────────────
    var coverColor = (config.coverColor || b.navy).replace('#','')
    var coverBlock = [
      new Paragraph({
        spacing: { before: 0, after: 0 },
        shading: { type: ShadingType.SOLID, color: coverColor },
        children: [txt(b.companyName, { size: 52, bold: true, color: 'FFFFFF', allCaps: true })]
      }),
      new Paragraph({
        spacing: { before: 40, after: 0 },
        shading: { type: ShadingType.SOLID, color: coverColor },
        children: [txt(config.title||'Document', { size: 36, bold: true, color: 'FFFFFF' })]
      }),
      new Paragraph({
        spacing: { before: 40, after: 0 },
        shading: { type: ShadingType.SOLID, color: coverColor },
        children: [txt(config.subtitle||today(), { size: 22, color: 'E5E7EB' })]
      }),
      new Paragraph({
        spacing: { before: 80, after: 0 },
        shading: { type: ShadingType.SOLID, color: coverColor },
        children: [txt(today(), { size: 18, color: 'D1D5DB' })]
      }),
      spacer(400)
    ]

    // ── Build document sections ──────────────────────────────────────────────
    var docChildren = [].concat(coverBlock)

    ;(config.sections||[]).forEach(function(sec, si) {
      if (!sec) return
      docChildren.push(sectionHead(sec.heading||'', sec.color||null))

      // Metadata key-value table
      if (sec.metadata && Object.keys(sec.metadata).length) {
        var kvRows = Object.keys(sec.metadata).map(function(k){ return [k, String(sec.metadata[k]||'—')] })
        docChildren.push(spacer(80))
        docChildren.push(kvTable(kvRows))
        docChildren.push(spacer(80))
      }

      // Body paragraphs
      var bodies = Array.isArray(sec.body) ? sec.body : [sec.body]
      bodies.forEach(function(b) {
        var p = bodyPara(b)
        if (p) docChildren.push(p)
      })

      // Bullets
      if (sec.bullets && sec.bullets.length) {
        sec.bullets.forEach(function(b) { docChildren.push(bulletPara(b)) })
        docChildren.push(spacer(80))
      }

      // Data table
      if (sec.table && sec.table.headers && sec.table.rows) {
        docChildren.push(spacer(80))
        docChildren.push(dataTable(sec.table.headers, sec.table.rows, sec.color||null))
        docChildren.push(spacer(80))
      }

      // Raw paragraphs
      if (sec.raw && sec.raw.length) {
        sec.raw.forEach(function(p) { docChildren.push(p) })
      }

      if (si < (config.sections||[]).length - 1) docChildren.push(spacer(200))
    })

    // Footer note
    if (config.footer) {
      docChildren.push(spacer(400))
      docChildren.push(new Paragraph({
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'E5E7EB', space: 8 } },
        spacing: { before: 120, after: 0 },
        children: [txt(config.footer, { size: 16, color: '9CA3AF', italics: true })]
      }))
    }

    // ── Assemble document ────────────────────────────────────────────────────
    var doc = new Document({
      creator: b.author,
      title: config.title||'Document',
      description: config.subtitle||'',
      styles: {
        default: {
          document: { run: { font: FONT, size: 24, color: '111827' } }
        }
      },
      sections: [{
        properties: {
          page: {
            size: { width: PAGE_W, height: PAGE_H },
            margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN }
          }
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'E5E7EB', space: 4 } },
                children: [
                  txt(b.companyName, { size: 16, bold: true, color: NAVY }),
                  txt('  ·  ', { size: 16, color: 'D1D5DB' }),
                  txt(config.title||'', { size: 16, color: '6B7280' })
                ]
              })
            ]
          })
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'E5E7EB', space: 4 } },
                children: [
                  txt('Confidential · ' + b.companyName + ' · ' + today(), { size: 16, color: '9CA3AF' }),
                  new TextRun({
                    children: [' · Page ', PageNumber.CURRENT, ' of ', PageNumber.TOTAL_PAGES],
                    font: FONT, size: 16, color: '9CA3AF'
                  })
                ]
              })
            ]
          })
        },
        children: docChildren
      }]
    })

    var blob = await Packer.toBlob(doc)
    var filename = (config.filename || slug(config.title||'document')) + '.docx'
    saveAs(blob, filename)
    console.log('[atlasExport] Word exported:', filename)
    return filename
  }

  // ══════════════════════════════════════════════════════════════════════════
  // EXCEL (.xlsx) via SheetJS (xlsx@0.18.5)
  // ══════════════════════════════════════════════════════════════════════════
  //
  // config: {
  //   filename:  string — output filename (without .xlsx)
  //   sheets: [{
  //     name:    string — sheet tab name
  //     title:   string — optional title row
  //     headers: string[] — column headers
  //     rows:    (string|number)[][] — data rows
  //     colWidths: number[] — optional column widths (chars)
  //     totals:  boolean — add a totals row (sums numeric columns)
  //   }]
  // }
  // ─────────────────────────────────────────────────────────────────────────
  function excel(config) {
    if (!checkLib('SheetJS / XLSX', 'XLSX')) return
    var b = getBrand()
    var wb = XLSX.utils.book_new()

    ;(config.sheets||[]).forEach(function(sheet) {
      var aoa = []  // array of arrays

      // Title row
      if (sheet.title) {
        aoa.push([sheet.title])
        aoa.push([b.companyName + ' · ' + today()])
        aoa.push([])
      }

      // Headers
      if (sheet.headers && sheet.headers.length) {
        aoa.push(sheet.headers)
      }

      // Data rows
      ;(sheet.rows||[]).forEach(function(row) {
        aoa.push(row.map(function(cell) {
          // Preserve numbers as numbers for Excel
          var n = typeof cell === 'number' ? cell : parseFloat(String(cell||'').replace(/[₹$,\s]/g,''))
          return isNaN(n) ? (cell||'') : n
        }))
      })

      // Totals row
      if (sheet.totals && sheet.headers && sheet.rows && sheet.rows.length) {
        var totals = sheet.headers.map(function(h, i) {
          if (i === 0) return 'TOTAL'
          var vals = (sheet.rows||[]).map(function(r) {
            var n = typeof r[i] === 'number' ? r[i] : parseFloat(String(r[i]||'').replace(/[₹$,\s]/g,''))
            return isNaN(n) ? 0 : n
          })
          var sum = vals.reduce(function(a,b){ return a+b }, 0)
          return sum > 0 ? sum : ''
        })
        aoa.push([])
        aoa.push(totals)
      }

      var ws = XLSX.utils.aoa_to_sheet(aoa)

      // Column widths
      if (sheet.colWidths && sheet.colWidths.length) {
        ws['!cols'] = sheet.colWidths.map(function(w) { return { wch: w } })
      } else if (sheet.headers) {
        // Auto-size: max of header width and 15
        ws['!cols'] = sheet.headers.map(function(h) {
          var maxW = Math.max((h||'').length, 15)
          ;(sheet.rows||[]).forEach(function(r) {
            maxW = Math.max(maxW, String(r[sheet.headers.indexOf(h)]||'').length)
          })
          return { wch: Math.min(maxW + 2, 40) }
        })
      }

      XLSX.utils.book_append_sheet(wb, ws, (sheet.name||'Sheet').substring(0,31))
    })

    var filename = (config.filename || 'atlas-export') + '.xlsx'
    XLSX.writeFile(wb, filename)
    console.log('[atlasExport] Excel exported:', filename)
    return filename
  }

  // ══════════════════════════════════════════════════════════════════════════
  // POWERPOINT (.pptx) via PptxGenJS@3.12.0
  // ══════════════════════════════════════════════════════════════════════════
  //
  // config: {
  //   filename:  string — output filename (without .pptx)
  //   title:     string — deck title
  //   subtitle:  string — deck subtitle
  //   slides: [{
  //     layout:  'cover' | 'section' | 'content' | 'table' | 'bullets' | 'blank'
  //     title:   string
  //     subtitle: string
  //     body:    string | string[]
  //     bullets: string[]
  //     table:   { headers: string[], rows: string[][] }
  //     color:   string (hex, for section dividers)
  //     notes:   string (speaker notes)
  //   }]
  // }
  // ─────────────────────────────────────────────────────────────────────────
  async function pptx(config) {
    if (!checkLib('PptxGenJS', 'PptxGenJS')) return
    var b = getBrand()
    var prs = new PptxGenJS()

    // Deck properties
    prs.author  = b.author
    prs.company = b.companyName
    prs.title   = config.title || 'ATLAS Presentation'
    prs.subject = config.subtitle || ''

    // Brand colours
    var NAVY   = b.navy
    var ORANGE = b.orange
    var TEAL   = b.teal
    var BLUE   = b.blue
    var FONT   = b.font

    // Slide dimensions (widescreen 13.33 x 7.5 inches)
    prs.layout = 'LAYOUT_WIDE'

    function addFooter(slide) {
      slide.addText(b.companyName + ' · Confidential', {
        x: 0.3, y: 7.1, w: 8, h: 0.3,
        fontSize: 8, color: '9CA3AF', fontFace: FONT
      })
      slide.addText(today(), {
        x: 11.5, y: 7.1, w: 1.8, h: 0.3,
        fontSize: 8, color: '9CA3AF', fontFace: FONT, align: 'right'
      })
      // Bottom bar
      slide.addShape(prs.ShapeType.rect, {
        x: 0, y: 7.38, w: 13.33, h: 0.12,
        fill: { color: NAVY }
      })
    }

    ;(config.slides||[]).forEach(function(sl) {
      if (!sl) return
      var slide = prs.addSlide()
      var layout = sl.layout || 'content'
      var color  = (sl.color||NAVY).replace('#','')

      if (layout === 'cover') {
        // ── Cover slide ──────────────────────────────────────────────────
        slide.addShape(prs.ShapeType.rect, { x:0, y:0, w:13.33, h:7.5, fill:{ color: NAVY } })
        slide.addShape(prs.ShapeType.rect, { x:0, y:5.8, w:13.33, h:0.08, fill:{ color: ORANGE } })
        slide.addText(b.companyName.toUpperCase(), {
          x:0.8, y:1.0, w:11.73, h:0.8,
          fontSize:28, bold:true, color:'FFFFFF', fontFace:FONT, charSpacing:4
        })
        slide.addText(sl.title||config.title||'', {
          x:0.8, y:2.0, w:11.73, h:2.0,
          fontSize:42, bold:true, color:'FFFFFF', fontFace:FONT, breakLine:true
        })
        if (sl.subtitle||config.subtitle) {
          slide.addText(sl.subtitle||config.subtitle||'', {
            x:0.8, y:4.3, w:9, h:0.8,
            fontSize:18, color:'D1D5DB', fontFace:FONT
          })
        }
        slide.addText(today(), {
          x:0.8, y:5.2, w:9, h:0.4,
          fontSize:13, color:'9CA3AF', fontFace:FONT
        })

      } else if (layout === 'section') {
        // ── Section divider ──────────────────────────────────────────────
        slide.addShape(prs.ShapeType.rect, { x:0, y:0, w:0.15, h:7.5, fill:{ color: color } })
        slide.addShape(prs.ShapeType.rect, { x:0.15, y:0, w:13.18, h:7.5, fill:{ color: 'F8F9FA' } })
        slide.addText(sl.title||'', {
          x:1.0, y:2.5, w:11, h:2.0,
          fontSize:40, bold:true, color: NAVY, fontFace:FONT
        })
        if (sl.subtitle) {
          slide.addText(sl.subtitle, {
            x:1.0, y:4.8, w:11, h:0.8,
            fontSize:18, color:'6B7280', fontFace:FONT
          })
        }
        addFooter(slide)

      } else if (layout === 'content') {
        // ── Content slide ────────────────────────────────────────────────
        // Header bar
        slide.addShape(prs.ShapeType.rect, { x:0, y:0, w:13.33, h:1.0, fill:{ color: NAVY } })
        slide.addText(sl.title||'', {
          x:0.3, y:0.1, w:12.73, h:0.8,
          fontSize:22, bold:true, color:'FFFFFF', fontFace:FONT
        })
        // Body
        var bodies = Array.isArray(sl.body) ? sl.body : [sl.body]
        var bodyText = bodies.filter(Boolean).join('\n\n')
        if (bodyText) {
          slide.addText(bodyText, {
            x:0.5, y:1.2, w:12.33, h:5.8,
            fontSize:14, color:'374151', fontFace:FONT,
            valign:'top', wrap:true, breakLine:true
          })
        }
        // Bullets
        if (sl.bullets && sl.bullets.length) {
          slide.addText(
            sl.bullets.map(function(b){ return { text: b, options: { bullet: true, indentLevel: 0 } } }),
            { x:0.5, y:1.3, w:12.33, h:5.7, fontSize:13, color:'374151', fontFace:FONT, valign:'top' }
          )
        }
        addFooter(slide)

      } else if (layout === 'table') {
        // ── Table slide ──────────────────────────────────────────────────
        slide.addShape(prs.ShapeType.rect, { x:0, y:0, w:13.33, h:1.0, fill:{ color: NAVY } })
        slide.addText(sl.title||'', {
          x:0.3, y:0.1, w:12.73, h:0.8,
          fontSize:22, bold:true, color:'FFFFFF', fontFace:FONT
        })
        if (sl.table && sl.table.headers && sl.table.rows) {
          var rows = []
          rows.push(sl.table.headers.map(function(h) {
            return { text:h, options:{ bold:true, color:'FFFFFF', fill:{ color:color }, fontSize:11, fontFace:FONT } }
          }))
          sl.table.rows.forEach(function(row, ri) {
            rows.push(row.map(function(cell) {
              return { text:String(cell||''), options:{
                fontSize:10, color:'374151', fontFace:FONT,
                fill: ri%2===1 ? { color:'F8F9FA' } : { color:'FFFFFF' }
              } }
            }))
          })
          slide.addTable(rows, {
            x:0.3, y:1.2, w:12.73,
            colW: sl.table.headers.map(function(){ return 12.73/sl.table.headers.length }),
            border: { pt:0.5, color:'E5E7EB' }
          })
        }
        addFooter(slide)

      } else if (layout === 'blank') {
        // ── Blank slide — caller manages content ─────────────────────────
        addFooter(slide)
      }

      // Speaker notes
      if (sl.notes) slide.addNotes(sl.notes)
    })

    var filename = (config.filename || slug(config.title||'presentation')) + '.pptx'
    await prs.writeFile({ fileName: filename })
    console.log('[atlasExport] PowerPoint exported:', filename)
    return filename
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ACTIONS EXCEL — convenience wrapper for action list export
  // ══════════════════════════════════════════════════════════════════════════
  //
  // actions: [{ title, owner, target_date, status, rag, notes }]
  // engName: string — engagement name for the sheet title
  // ─────────────────────────────────────────────────────────────────────────
  function actionsExcel(actions, engName) {
    var rows = (actions||[]).map(function(a) {
      return [
        a.title || a.text || '',
        a.owner || '',
        a.target_date || a.due_date || '',
        a.status || 'Open',
        a.rag || 'Amber',
        a.notes || ''
      ]
    })
    return excel({
      filename: 'Actions_' + slug(engName||'Engagement') + '_' + new Date().toISOString().slice(0,10),
      sheets: [{
        name: 'Actions',
        title: (engName||'Engagement') + ' — Action Register',
        headers: ['Action', 'Owner', 'Target Date', 'Status', 'RAG', 'Notes'],
        rows: rows,
        colWidths: [45, 18, 14, 12, 10, 35]
      }]
    })
  }

  // ══════════════════════════════════════════════════════════════════════════
  // BOM EXCEL — convenience wrapper for SASC BOM export
  // ══════════════════════════════════════════════════════════════════════════
  //
  // bomLines: [{ component, qty, unit, usd_total }]
  // rom:      { capex_usd, opex_usd, ucdev_usd, total_usd }
  // engName:  string
  // ─────────────────────────────────────────────────────────────────────────
  function bomExcel(bomLines, rom, engName) {
    var rows = (bomLines||[]).map(function(l) {
      return [
        l.component||l.category||'',
        l.description||l.name||'',
        l.qty||1,
        l.unit||'',
        l.unit_price_usd ? '$'+Math.round(l.unit_price_usd).toLocaleString() : '',
        l.usd_total ? '$'+Math.round(l.usd_total).toLocaleString() : ''
      ]
    })

    var summaryRows = []
    if (rom) {
      summaryRows = [
        ['CapEx (Hardware + DC Build)', '', '', '', '', '$'+Math.round(rom.capex_usd||0).toLocaleString()],
        ['UC Development Cost', '', '', '', '', '$'+Math.round(rom.ucdev_usd||0).toLocaleString()],
        ['Annual OpEx (Year 1)', '', '', '', '', '$'+Math.round(rom.opex_usd||0).toLocaleString()],
        ['Total Programme Cost (3yr OpEx)', '', '', '', '', '$'+Math.round(rom.total_usd||0).toLocaleString()]
      ]
    }

    return excel({
      filename: 'BOM_' + slug(engName||'Engagement') + '_' + new Date().toISOString().slice(0,10),
      sheets: [
        {
          name: 'BOM Detail',
          title: (engName||'Engagement') + ' — Bill of Materials (ROM ±35%)',
          headers: ['Category', 'Component', 'Qty', 'Unit', 'Unit Price (USD)', 'Total (USD)'],
          rows: rows,
          totals: true,
          colWidths: [20, 35, 8, 12, 18, 18]
        },
        {
          name: 'Summary',
          title: (engName||'Engagement') + ' — ROM Summary',
          headers: ['Line Item', '', '', '', '', 'Amount (USD)'],
          rows: summaryRows,
          colWidths: [35, 5, 5, 5, 5, 18]
        }
      ]
    })
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CDN SCRIPT TAGS — call this to get the HTML to paste in <head>
  // ══════════════════════════════════════════════════════════════════════════
  function cdnTags() {
    return [
      '<!-- atlasExport.js CDN dependencies -->',
      '<script src="https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js"><\/script>',
      '<script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"><\/script>',
      '<script src="https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js"><\/script>',
      '<script src="https://cdn.jsdelivr.net/npm/file-saver@2.0.5/dist/FileSaver.min.js"><\/script>',
      '<script src="../../shared/atlasExport.js"><\/script>'
    ].join('\n')
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  return {
    word:         word,
    excel:        excel,
    pptx:         pptx,
    actionsExcel: actionsExcel,
    bomExcel:     bomExcel,
    getBrand:     getBrand,
    cdnTags:      cdnTags
  }

})()
