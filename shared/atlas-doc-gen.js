//                                                                            
// ATLAS Document Generation Module   atlas-doc-gen.js
// Version: 1.0 | 2026-06-14
// Location: shared/atlas-doc-gen.js in GitHub repo
//
// Load in any tool:
//   <script src="../../shared/atlas-doc-gen.js"></script>
//
// Dependencies (load before this file):
//   pptxgenjs:  https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js
//   docx:       https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.js
//   xlsx:       https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js
//
// Usage:
//   var result = await atlasDocGen.generate('bom_rom', ['xlsx','docx'], context)
//   // result: { files: [{name, type, driveId, driveUrl}], docketItemIds: [] }
//                                                                            

var atlasDocGen = (function() {

  //    Brand                                                                 
  var BRAND = {
    navy:      {r:0,   g:40,  b:112},
    orange:    {r:255, g:85,  b:57 },
    blue:      {r:28,  g:56,  b:245},
    teal:      {r:0,   g:178, b:144},
    amber:     {r:255, g:182, b:0  },
    indigo:    {r:60,  g:0,   b:180},
    white:     {r:255, g:255, b:255},
    lightGrey: {r:245, g:245, b:247},
    midGrey:   {r:180, g:180, b:190},
    darkGrey:  {r:40,  g:40,  b:50 },
    black:     {r:10,  g:10,  b:15 },
    font: 'Roboto'
  }

  var DOMAIN_PALETTE = {
    tsap:       {primary: BRAND.navy,   accent: BRAND.blue  },
    vertical:   {primary: BRAND.blue,   accent: BRAND.teal  },
    defence:    {primary: BRAND.indigo, accent: BRAND.orange },
    enterprise: {primary: BRAND.navy,   accent: BRAND.amber },
    csp:        {primary: BRAND.navy,   accent: BRAND.teal  },
    generic:    {primary: BRAND.navy,   accent: BRAND.blue  }
  }

  // Pre-built domain cover graphics (SVG paths in standards/cover-graphics/)
  var DOMAIN_GRAPHICS = {
    tsap:       'standards/cover-graphics/tsap.svg',
    vertical:   'standards/cover-graphics/vertical.svg',
    aviation:   'standards/cover-graphics/aviation.svg',
    geospatial: 'standards/cover-graphics/geospatial.svg',
    healthcare: 'standards/cover-graphics/healthcare.svg',
    defence:    'standards/cover-graphics/defence.svg',
    enterprise: 'standards/cover-graphics/enterprise.svg',
    generic:    'standards/cover-graphics/generic.svg'
  }

  // Document type   folder name mapping
  var DOC_TYPE_FOLDER = {
    pei:              'PEI',
    customer_profile: 'Docket',
    docket_summary:   'Docket',
    action_register:  'Docket',
    meeting_leavebehind: 'Docket',
    bom_rom:          'BOM',
    rom_letter:       'SASC',
    tsap_vision:      'Proposal',
    fm_summary:       'FM',
    full_proposal:    'Proposal',
    tech_proposal:    'BOM',
    deal_summary:     'Proposal',
    commercial:       'Proposal'
  }

  // Document type   generation tier
  var DOC_TIER = {
    bom_rom:          1,  // zero AI
    rom_letter:       1,
    docket_summary:   1,
    action_register:  1,
    customer_profile: 1,
    meeting_leavebehind: 1,
    pei:              2,  // gemini-3.1-flash-lite
    fm_summary:       2,
    tsap_vision:      3,  // gemini-3.5-flash
    full_proposal:    3,
    commercial:       3
  }

  //    Supabase helpers                                                       
  function _getSB() {
    try {
      var g = JSON.parse(localStorage.getItem('atlas_global_cfg') || '{}')
      return { url: g.sbUrl || g.sb_url || '', key: g.sbKey || g.sb_key || '' }
    } catch(e) { return {url:'', key:''} }
  }

  async function _sbGet(table, params) {
    var sb = _getSB(); if (!sb.url) return []
    try {
      var r = await fetch(sb.url + '/rest/v1/' + table + '?' + (params||'') + '&limit=200', {
        headers: {apikey: sb.key, Authorization: 'Bearer ' + sb.key}
      })
      return r.ok ? r.json() : []
    } catch(e) { return [] }
  }

  async function _sbPost(table, data) {
    var sb = _getSB(); if (!sb.url) return null
    try {
      var r = await fetch(sb.url + '/rest/v1/' + table, {
        method: 'POST',
        headers: {apikey: sb.key, Authorization: 'Bearer ' + sb.key, 'Content-Type': 'application/json', Prefer: 'return=representation'},
        body: JSON.stringify(data)
      })
      if (r.ok) { var rows = await r.json(); return Array.isArray(rows) ? rows[0] : rows }
      return null
    } catch(e) { return null }
  }

  //    Company identity                                                       
  var _COMPANY = null

  async function _loadCompany() {
    if (_COMPANY) return _COMPANY
    var keys = 'brand_name,brand_name_short,brand_logo_drive_id,'
      + 'parent_company_name,parent_company_addr1,parent_company_addr2,parent_company_city,parent_company_country,parent_company_website,'
      + 'local_company_name,local_company_addr1,local_company_addr2,local_company_city,'
      + 'doc_author_default,doc_classification,doc_root_folder_id'
    var rows = await _sbGet('app_config', 'key=in.(' + keys + ')')
    _COMPANY = {}
    ;(rows||[]).forEach(function(r) { _COMPANY[r.key] = r.value || '' })
    // Convenience aliases used in generation code
    _COMPANY.name           = _COMPANY.brand_name            || ''
    _COMPANY.name_short     = _COMPANY.brand_name_short      || _COMPANY.brand_name || ''
    _COMPANY.logo           = _COMPANY.brand_logo_drive_id   || ''
    _COMPANY.author_default = _COMPANY.doc_author_default    || ''
    _COMPANY.classification = _COMPANY.doc_classification    || 'Confidential'
    _COMPANY.addr1          = _COMPANY.local_company_addr1   || ''
    _COMPANY.addr2          = _COMPANY.local_company_addr2   || ''
    _COMPANY.city           = _COMPANY.local_company_city    || ''
    _COMPANY.website        = _COMPANY.parent_company_website|| ''
    return _COMPANY
  }

  //    File naming                                                            
  function _buildFilename(docType, custName, engName, version, ext) {
    var docLabels = {
      pei: 'PEI', customer_profile: 'CustomerProfile', docket_summary: 'DocketSummary',
      action_register: 'ActionRegister', meeting_leavebehind: 'MeetingNote',
      bom_rom: 'BOM', rom_letter: 'ROM_Letter', tsap_vision: 'TSAP_Vision',
      fm_summary: 'FM_Summary', full_proposal: 'Proposal', tech_proposal: 'TechProposal',
      deal_summary: 'DealSummary', commercial: 'CommercialProposal'
    }
    var label = docLabels[docType] || docType
    var cust  = (custName||'Customer').replace(/[^a-zA-Z0-9]/g,'').slice(0,10)
    var eng   = (engName||'Engagement').replace(/[^a-zA-Z0-9]/g,'').slice(0,10)
    var today = new Date().toISOString().slice(0,10)
    var ver   = version ? '_v' + version : ''
    return label + '_' + cust + '_' + eng + ver + '_' + today + '.' + ext
  }

  //    Drive folder management                                                
  // Note: folder creation uses Google Drive API via fetch with OAuth
  // For GitHub Pages (no backend), we use the Drive MCP tool pattern
  // Folders are created lazily   this module exposes the logic,
  // tools call the Drive MCP tool to create folders

  function _buildFolderPath(custName, engName, docType) {
    var typeFolder = DOC_TYPE_FOLDER[docType] || 'General'
    return {
      customer: custName,
      engagement: engName,
      type: typeFolder,
      // Full path: Documents/Customer/Engagement/Type/
      path: 'Documents/' + custName + '/' + engName + '/' + typeFolder + '/'
    }
  }

  //    Colour helpers                                                         
  function _hex(col) {
    return ('00'+col.r.toString(16)).slice(-2) +
           ('00'+col.g.toString(16)).slice(-2) +
           ('00'+col.b.toString(16)).slice(-2)
  }

  function _pptxRgb(col) {
    return ('00'+col.r.toString(16)).slice(-2).toUpperCase() +
           ('00'+col.g.toString(16)).slice(-2).toUpperCase() +
           ('00'+col.b.toString(16)).slice(-2).toUpperCase()
  }

  //    Cover page options default                                             
  function _defaultCoverOpts() {
    return {
      include_graphic:   true,
      graphic_type:      'template',  // 'template' | 'generated'
      graphic_cached_id: null,
      include_toc:       true,
      classification:    'Confidential'
    }
  }

  //    PPTX generation                                                        
  async function _buildPptx(docType, structured, context, coverOpts) {
    if (typeof PptxGenJS === 'undefined') {
      console.error('atlasDocGen: pptxgenjs not loaded')
      return null
    }

    var company   = await _loadCompany()
    var engType   = context.engagement ? context.engagement.type : 'generic'
    var palette   = DOMAIN_PALETTE[engType] || DOMAIN_PALETTE.generic
    var custName  = context.customer ? context.customer.name : (company.name||'Customer')
    var engName   = context.engagement ? context.engagement.name : 'Engagement'
    var opts      = Object.assign(_defaultCoverOpts(), coverOpts||{})

    var pptx = new PptxGenJS()
    pptx.layout   = 'LAYOUT_WIDE'  // 13.33 x 7.5 inches
    pptx.author   = company.author_default || 'ATLAS'
    pptx.company  = company.name || ''
    pptx.subject  = structured.title || docType

    var W = 13.33
    var H = 7.5
    var NAV_HEX = _pptxRgb(palette.primary)
    var ACC_HEX = _pptxRgb(palette.accent)
    var WHT     = 'FFFFFF'
    var LGY     = 'F5F5F7'
    var MGY     = 'B4B4BE'
    var DGY     = '282832'

    //    Slide 1: Cover                                                     
    var cover = pptx.addSlide()
    cover.background = {color: NAV_HEX}

    // Graphic area (top 55% of slide)   placeholder colour block if no graphic
    if (opts.include_graphic) {
      // Accent colour band as graphic placeholder
      // When a real graphic is available, replace this with addImage
      cover.addShape(pptx.ShapeType.rect, {
        x:0, y:0, w:W, h: H*0.55,
        fill: {color: ACC_HEX},
        line: {color: ACC_HEX}
      })
      // Diagonal accent overlay
      cover.addShape(pptx.ShapeType.rect, {
        x:0, y: H*0.45, w:W, h: H*0.12,
        fill: {type:'gradient', gradColors:[{stop:0,color:ACC_HEX,transparency:0},{stop:100,color:NAV_HEX,transparency:0}], gradDir:'horz'},
        line: {color: 'transparent'}
      })
    }

    // Orange accent bar
    cover.addShape(pptx.ShapeType.rect, {
      x:0, y: H*0.55, w:0.08, h: H*0.45,
      fill: {color: _pptxRgb(BRAND.orange)}, line: {color: _pptxRgb(BRAND.orange)}
    })

    // Document title
    var docTitle = structured.title || _docLabel(docType)
    cover.addText(docTitle, {
      x:0.25, y: H*0.55, w: W*0.75, h: H*0.18,
      fontFace: BRAND.font, fontSize:32, bold:true, color:WHT,
      valign:'middle'
    })

    // Engagement name
    cover.addText(engName, {
      x:0.25, y: H*0.73, w: W*0.75, h: H*0.1,
      fontFace: BRAND.font, fontSize:18, bold:false, color:'CCCCCC', valign:'middle'
    })

    // Customer name
    cover.addText(custName, {
      x:0.25, y: H*0.82, w: W*0.5, h: H*0.08,
      fontFace: BRAND.font, fontSize:14, color:ACC_HEX.replace('FF',''), bold:false, valign:'middle'
    })

    // Meta row: date | version | classification
    var today = new Date().toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'})
    var ver   = context.version || '1'
    var clf   = opts.classification || company.classification || 'Confidential'
    cover.addText(today + '   |   v' + ver + '   |   ' + clf, {
      x:0.25, y: H*0.91, w: W*0.6, h:0.25,
      fontFace: BRAND.font, fontSize:10, color:MGY, valign:'bottom'
    })

    // Company name bottom right
    if (company.name) {
      cover.addText(company.name, {
        x: W*0.6, y: H*0.91, w: W*0.35, h:0.25,
        fontFace: BRAND.font, fontSize:10, color:WHT, align:'right', valign:'bottom'
      })
    }

    //    Slide 2: Blank                                                     
    var blank = pptx.addSlide()
    blank.background = {color: WHT}

    //    Slide 3: Table of Contents                                         
    if (opts.include_toc && structured.sections && structured.sections.length > 2) {
      var toc = pptx.addSlide()
      toc.background = {color: WHT}
      _addSlideHeader(pptx, toc, custName, structured.title||'', company, palette)
      _addSlideFooter(pptx, toc, today, clf, '3')

      toc.addText('Table of Contents', {
        x:0.5, y:0.8, w: W-1, h:0.5,
        fontFace: BRAND.font, fontSize:24, bold:true, color:NAV_HEX
      })
      // Accent underline
      toc.addShape(pptx.ShapeType.rect, {
        x:0.5, y:1.25, w:1.5, h:0.04,
        fill:{color: _pptxRgb(BRAND.orange)}, line:{color:'transparent'}
      })

      var tocRows = (structured.sections||[]).map(function(s, i) {
        return [[{text: String(i+1), options:{color:NAV_HEX,bold:true}}, {text: s.heading||'', options:{color:DGY}}, {text: String(4+i), options:{color:MGY,align:'right'}}]]
      })
      toc.addTable(tocRows.map(function(r){ return r[0].map(function(c){ return {text:c.text, options:{fontFace:BRAND.font,fontSize:12,...c.options}} }) }), {
        x:0.5, y:1.5, w: W-1,
        rowH:0.35, border:{type:'none'}
      })
    }

    //    Content slides                                                     
    var pageNum = 4
    ;(structured.sections||[]).forEach(function(section) {
      var slide = pptx.addSlide()
      slide.background = {color: WHT}
      _addSlideHeader(pptx, slide, custName, structured.title||'', company, palette)
      _addSlideFooter(pptx, slide, today, clf, String(pageNum))
      pageNum++

      // Section heading
      slide.addText(section.heading||'', {
        x:0.5, y:0.85, w: W-1, h:0.45,
        fontFace: BRAND.font, fontSize:20, bold:true, color:NAV_HEX
      })
      // Accent line under heading
      slide.addShape(pptx.ShapeType.rect, {
        x:0.5, y:1.25, w: W-1, h:0.03,
        fill:{color: _pptxRgb(BRAND.orange)}, line:{color:'transparent'}
      })

      // Bullets
      if (section.bullets && section.bullets.length) {
        var bulletRows = section.bullets.map(function(b) {
          return {text: b, options:{bullet:true, fontFace:BRAND.font, fontSize:14, color:DGY, paraSpaceAfter:6}}
        })
        slide.addText(bulletRows, {
          x:0.5, y:1.4, w: W-1, h: H-2.2,
          valign:'top'
        })
      }

      // Speaker notes = full narrative
      if (section.narrative) {
        slide.addNotes(section.narrative)
      }

      // Table if present
      if (section.table) {
        _addSlideTable(pptx, slide, section.table, palette)
      }
    })

    return pptx
  }

  function _addSlideHeader(pptx, slide, custName, docName, company, palette) {
    var NAV_HEX = _pptxRgb(palette.primary)
    // Header bar
    slide.addShape(pptx.ShapeType.rect, {
      x:0, y:0, w:13.33, h:0.65,
      fill:{color:NAV_HEX}, line:{color:NAV_HEX}
    })
    // Left: customer   doc name
    slide.addText((custName||'') + '  |  ' + (docName||''), {
      x:0.15, y:0.1, w:9, h:0.45,
      fontFace: BRAND.font, fontSize:10, color:'FFFFFF', valign:'middle'
    })
    // Right: company name (logo placeholder)
    if (company && (company.brand_name_short || company.name)) {
      slide.addText(company.brand_name_short || company.name, {
        x:9, y:0.1, w:4.2, h:0.45,
        fontFace: BRAND.font, fontSize:10, color:'FFFFFF', bold:true, align:'right', valign:'middle'
      })
    }
  }

  function _addSlideFooter(pptx, slide, date, classification, pageNum) {
    // Footer bar
    slide.addShape(pptx.ShapeType.rect, {
      x:0, y:7.2, w:13.33, h:0.3,
      fill:{color:'F0F0F0'}, line:{color:'E0E0E0'}
    })
    slide.addText(date||'', {x:0.15, y:7.22, w:3, h:0.25, fontFace:BRAND.font, fontSize:8, color:'888888'})
    slide.addText(classification||'Confidential', {x:5.16, y:7.22, w:3, h:0.25, fontFace:BRAND.font, fontSize:8, color:'888888', align:'center'})
    slide.addText('Page ' + (pageNum||''), {x:10, y:7.22, w:3.2, h:0.25, fontFace:BRAND.font, fontSize:8, color:'888888', align:'right'})
  }

  function _addSlideTable(pptx, slide, tableData, palette) {
    if (!tableData || !tableData.rows || !tableData.rows.length) return
    var NAV_HEX = _pptxRgb(palette.primary)
    var rows = []
    if (tableData.headers) {
      rows.push(tableData.headers.map(function(h) {
        return {text: h, options:{bold:true, color:'FFFFFF', fill:{color:NAV_HEX}, fontFace:BRAND.font, fontSize:11}}
      }))
    }
    tableData.rows.forEach(function(row, ri) {
      rows.push(row.map(function(cell) {
        return {text: String(cell||''), options:{color:'282832', fill:{color: ri%2===0 ? 'FFFFFF':'F5F5F7'}, fontFace:BRAND.font, fontSize:11}}
      }))
    })
    slide.addTable(rows, {x:0.5, y:1.5, w:12.3, colW:tableData.colWidths, rowH:0.3, border:{pt:0.5, color:'E0E0E0'}})
  }

  //    DOCX generation                                                        
  async function _buildDocx(docType, structured, context, coverOpts) {
    if (typeof docx === 'undefined') {
      console.error('atlasDocGen: docx.js not loaded')
      return null
    }

    var company  = await _loadCompany()
    var engType  = context.engagement ? context.engagement.type : 'generic'
    var palette  = DOMAIN_PALETTE[engType] || DOMAIN_PALETTE.generic
    var custName = context.customer ? context.customer.name : (company.name||'Customer')
    var engName  = context.engagement ? context.engagement.name : 'Engagement'
    var opts     = Object.assign(_defaultCoverOpts(), coverOpts||{})
    var today    = new Date().toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'})
    var ver      = context.version || '1'
    var clf      = opts.classification || company.classification || 'Confidential'

    var D = docx
    var NAVY_HEX  = _hex(palette.primary)
    var BLUE_HEX  = _hex(palette.accent)
    var TEAL_HEX  = _hex(BRAND.teal)
    var FONT      = BRAND.font

    //    Numbering                                                          
    var numbering = {
      config: [{
        reference: 'bullet-list',
        levels: [{
          level: 0,
          format: docx.LevelFormat.BULLET,
          text: '\u2022',
          alignment: docx.AlignmentType.LEFT,
          style: {paragraph:{indent:{left:720, hanging:360}}}
        }]
      }]
    }

    //    Styles                                                             
    var styles = {
      default: {document:{run:{font:FONT, size:22}}},
      paragraphStyles: [
        {id:'Heading1', name:'Heading 1', basedOn:'Normal', next:'Normal', quickFormat:true,
         run:{size:36, bold:true, font:FONT, color:NAVY_HEX},
         paragraph:{spacing:{before:480, after:200}, outlineLevel:0}},
        {id:'Heading2', name:'Heading 2', basedOn:'Normal', next:'Normal', quickFormat:true,
         run:{size:28, bold:true, font:FONT, color:BLUE_HEX},
         paragraph:{spacing:{before:320, after:160}, outlineLevel:1}},
        {id:'Heading3', name:'Heading 3', basedOn:'Normal', next:'Normal', quickFormat:true,
         run:{size:24, bold:true, font:FONT, color:TEAL_HEX},
         paragraph:{spacing:{before:240, after:120}, outlineLevel:2}},
        {id:'BodyText', name:'Body Text', basedOn:'Normal', next:'BodyText',
         run:{size:22, font:FONT, color:'282832'},
         paragraph:{spacing:{before:80, after:120, line:276, lineRule:'auto'},
                    alignment:docx.AlignmentType.JUSTIFIED}}
      ]
    }

    // Helper: paragraph
    function p(text, opts2) {
      opts2 = opts2 || {}
      return new D.Paragraph({
        alignment: opts2.center ? D.AlignmentType.CENTER : opts2.right ? D.AlignmentType.RIGHT : D.AlignmentType.JUSTIFIED,
        spacing: {before: opts2.before||80, after: opts2.after||120, line:276, lineRule:'auto'},
        children: [new D.TextRun({
          text: text||'', font:FONT,
          size: opts2.size||22,
          bold: opts2.bold||false,
          color: opts2.color||'282832',
          italics: opts2.italic||false
        })]
      })
    }

    function h1(text) { return new D.Paragraph({heading:D.HeadingLevel.HEADING_1, children:[new D.TextRun({text:text||'', bold:true, size:36, font:FONT, color:NAVY_HEX})], spacing:{before:480,after:200}}) }
    function h2(text) { return new D.Paragraph({heading:D.HeadingLevel.HEADING_2, children:[new D.TextRun({text:text||'', bold:true, size:28, font:FONT, color:BLUE_HEX})], spacing:{before:320,after:160}}) }
    function h3(text) { return new D.Paragraph({heading:D.HeadingLevel.HEADING_3, children:[new D.TextRun({text:text||'', bold:true, size:24, font:FONT, color:TEAL_HEX})], spacing:{before:240,after:80}}) }
    function sp()  { return new D.Paragraph({children:[new D.TextRun({text:''})]}) }
    function pb()  { return new D.Paragraph({children:[new D.PageBreak()]}) }
    function bul(text) {
      return new D.Paragraph({
        numbering:{reference:'bullet-list', level:0},
        spacing:{before:40, after:40},
        children:[new D.TextRun({text:text||'', font:FONT, size:22, color:'282832'})]
      })
    }

    //    Header / Footer                                                    
    var headerLeft  = (custName||'') + '  |  ' + (structured.title||'')
    var headerRight = company.name || ''

    var header = new D.Header({
      children: [
        new D.Paragraph({
          border:{bottom:{color:'E0E0E0', space:1, style:'single', size:6}},
          spacing:{after:120},
          children:[
            new D.TextRun({text: headerLeft, font:FONT, size:18, color:'888888'}),
            new D.TextRun({text: '\t\t' + headerRight, font:FONT, size:18, bold:true, color:NAVY_HEX})
          ]
        })
      ]
    })

    var footer = new D.Footer({
      children: [
        new D.Paragraph({
          border:{top:{color:'E0E0E0', space:1, style:'single', size:6}},
          spacing:{before:120},
          tabStops:[
            {type:D.TabStopType.CENTER, position:4680},
            {type:D.TabStopType.RIGHT,  position:9360}
          ],
          children:[
            new D.TextRun({text: today, font:FONT, size:16, color:'888888'}),
            new D.TextRun({text: '\t' + clf, font:FONT, size:16, color:'888888'}),
            new D.TextRun({text: '\t', font:FONT, size:16}),
            new D.PageNumber({type:D.NumberFormat.DECIMAL})
          ]
        })
      ]
    })

    //    Cover page children                                                
    var coverChildren = []
    // Spacer
    for (var i=0; i<8; i++) coverChildren.push(sp())
    // Document title
    coverChildren.push(new D.Paragraph({
      alignment: D.AlignmentType.LEFT,
      spacing:{before:0, after:200},
      children:[new D.TextRun({text: structured.title||_docLabel(docType), font:FONT, size:52, bold:true, color:NAVY_HEX})]
    }))
    // Orange rule
    coverChildren.push(new D.Paragraph({
      border:{bottom:{color:'FF5539', space:1, style:'single', size:18}},
      spacing:{after:200},
      children:[new D.TextRun({text:''})]
    }))
    // Engagement name
    coverChildren.push(p(engName, {size:28, color:BLUE_HEX, before:160, after:80}))
    // Customer name
    coverChildren.push(p(custName, {size:24, color:'888888', before:80, after:400}))
    // Meta table
    var metaB = {style:D.BorderStyle.NONE, size:0, color:'FFFFFF'}
    var metaBorders = {top:metaB, bottom:metaB, left:metaB, right:metaB}
    var metaCell = function(label, val) {
      return new D.TableCell({
        borders: metaBorders,
        margins:{top:80, bottom:80, left:120, right:120},
        children:[
          new D.Paragraph({children:[new D.TextRun({text:label, font:FONT, size:16, color:'888888'})]}),
          new D.Paragraph({children:[new D.TextRun({text:val||'', font:FONT, size:18, bold:true, color:NAVY_HEX})]})
        ]
      })
    }
    coverChildren.push(new D.Table({
      width:{size:8000, type:D.WidthType.DXA},
      rows:[new D.TableRow({children:[
        metaCell('Date', today),
        metaCell('Version', 'v'+ver),
        metaCell('Author', company.author_default||'ATLAS'),
        metaCell('Classification', clf)
      ]})]
    }))
    // Company details bottom
    coverChildren.push(pb())
    if (company.brand_name || company.name) {
      for (var j=0; j<18; j++) coverChildren.push(sp())
      // Brand name (large)
      coverChildren.push(p(company.brand_name || company.name, {bold:true, size:28, color:NAVY_HEX, before:0, after:40}))
      // Local entity
      if (company.local_company_name) {
        coverChildren.push(p(company.local_company_name, {size:18, color:'888888', before:0, after:20}))
        if (company.local_company_addr1) coverChildren.push(p(company.local_company_addr1, {size:16, color:'888888', before:0, after:10}))
        if (company.local_company_city)  coverChildren.push(p(company.local_company_city,  {size:16, color:'888888', before:0, after:20}))
      }
      // Parent entity (smaller)
      if (company.parent_company_name) {
        coverChildren.push(p(company.parent_company_name, {size:16, color:'AAAAAA', before:10, after:0}))
        if (company.parent_company_website) coverChildren.push(p(company.parent_company_website, {size:14, color:BLUE_HEX, before:0, after:0}))
      }
    }

    //    Build sections                                                     
    var bodyChildren = []

    // TOC placeholder
    if (opts.include_toc && structured.sections && structured.sections.length > 2) {
      bodyChildren.push(h1('Table of Contents'))
      ;(structured.sections||[]).forEach(function(s, i) {
        bodyChildren.push(new D.Paragraph({
          spacing:{before:60, after:60},
          tabStops:[{type:D.TabStopType.RIGHT, position:9000, leader:D.LeaderType.DOT}],
          children:[
            new D.TextRun({text: (i+1) + '.  ' + (s.heading||''), font:FONT, size:22, color:'282832'}),
            new D.TextRun({text: '\t' + String(4+i), font:FONT, size:22, color:'888888'})
          ]
        }))
      })
      bodyChildren.push(pb())
    }

    // Section content
    ;(structured.sections||[]).forEach(function(section) {
      bodyChildren.push(h1(section.heading||''))
      // Narrative paragraphs
      if (section.narrative) {
        section.narrative.split('\n\n').forEach(function(para) {
          if (para.trim()) bodyChildren.push(p(para.trim(), {before:80, after:120}))
        })
      }
      // Bullets
      if (section.bullets && section.bullets.length) {
        section.bullets.forEach(function(b) { bodyChildren.push(bul(b)) })
        bodyChildren.push(sp())
      }
      // Sub-sections
      if (section.subsections) {
        section.subsections.forEach(function(sub) {
          bodyChildren.push(h2(sub.heading||''))
          if (sub.narrative) {
            sub.narrative.split('\n\n').forEach(function(para) {
              if (para.trim()) bodyChildren.push(p(para.trim(), {before:80, after:120}))
            })
          }
          if (sub.bullets) sub.bullets.forEach(function(b) { bodyChildren.push(bul(b)) })
        })
      }
      // Table
      if (section.table) bodyChildren.push(_buildDocxTable(D, section.table, palette))
      bodyChildren.push(sp())
    })

    //    Assemble document                                                  
    var doc = new D.Document({
      numbering: numbering,
      styles: styles,
      sections: [
        // Cover page (no header/footer)
        {
          properties:{page:{size:{width:12240, height:15840}, margin:{top:1800,bottom:1800,left:1800,right:1800}}},
          children: coverChildren
        },
        // Body (with header/footer, odd page start)
        {
          properties:{
            type: D.SectionType.ODD_PAGE,
            page:{size:{width:12240, height:15840}, margin:{top:1440,bottom:1134,left:1440,right:1134}},
          },
          headers:{default:header},
          footers:{default:footer},
          children: bodyChildren
        }
      ]
    })

    return doc
  }

  function _buildDocxTable(D, tableData, palette) {
    if (!tableData || !tableData.rows) return new D.Paragraph({children:[new D.TextRun({text:''})]})
    var NAVY_HEX = _hex(palette.primary)
    var bdr = {style:D.BorderStyle.SINGLE, size:4, color:'E0E0E0'}
    var borders = {top:bdr, bottom:bdr, left:bdr, right:bdr}

    var rows = []
    if (tableData.headers) {
      rows.push(new D.TableRow({
        tableHeader:true,
        children: tableData.headers.map(function(h) {
          return new D.TableCell({
            borders:borders,
            shading:{fill:NAVY_HEX, type:D.ShadingType.CLEAR},
            margins:{top:80,bottom:80,left:120,right:120},
            children:[new D.Paragraph({children:[new D.TextRun({text:h||'', bold:true, color:'FFFFFF', font:BRAND.font, size:20})]})]
          })
        })
      }))
    }
    tableData.rows.forEach(function(row, ri) {
      rows.push(new D.TableRow({
        children: row.map(function(cell) {
          return new D.TableCell({
            borders:borders,
            shading:{fill: ri%2===0 ? 'FFFFFF':'F5F5F7', type:D.ShadingType.CLEAR},
            margins:{top:80,bottom:80,left:120,right:120},
            children:[new D.Paragraph({children:[new D.TextRun({text:String(cell||''), font:BRAND.font, size:20, color:'282832'})]})]
          })
        })
      }))
    })
    return new D.Table({width:{size:9360, type:D.WidthType.DXA}, rows:rows})
  }

  //    XLSX generation                                                        
  function _buildXlsx(docType, data, context) {
    if (typeof XLSX === 'undefined') {
      console.error('atlasDocGen: xlsx not loaded')
      return null
    }
    var wb = XLSX.utils.book_new()
    ;(data.sheets||[{name:'Data', rows:data.rows||[]}]).forEach(function(sheet) {
      var ws = XLSX.utils.aoa_to_sheet([sheet.headers||[]].concat(sheet.rows||[]))
      XLSX.utils.book_append_sheet(wb, ws, sheet.name||'Sheet1')
    })
    return XLSX.write(wb, {type:'base64', bookType:'xlsx'})
  }

  //    AI content generation                                                  
  async function _genStructuredContent(docType, context, model) {
    var cfg = JSON.parse(localStorage.getItem('atlas_global_cfg')||'{}')
    var apiKey = cfg.geminiKey || cfg.gemini_key || ''
    if (!apiKey) { console.error('atlasDocGen: no Gemini API key'); return null }

    model = model || (DOC_TIER[docType] >= 3 ? 'gemini-3.5-flash' : 'gemini-3.1-flash-lite')

    var prompt = _buildPrompt(docType, context)

    try {
      var r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + apiKey, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          contents:[{parts:[{text:prompt}]}],
          generationConfig:{
            temperature:0.4,
            maxOutputTokens: DOC_TIER[docType] >= 3 ? 8192 : 4096,
            responseMimeType:'application/json'
          }
        })
      })
      if (!r.ok) { console.error('atlasDocGen: AI call failed', r.status); return null }
      var data = await r.json()
      var text = data.candidates && data.candidates[0] && data.candidates[0].content
        && data.candidates[0].content.parts && data.candidates[0].content.parts[0].text
      if (!text) return null
      // Parse JSON response
      var clean = text.replace(/```json|```/g, '').trim()
      return JSON.parse(clean)
    } catch(e) { console.error('atlasDocGen: AI generation error', e); return null }
  }

  function _buildPrompt(docType, context) {
    var eng  = context.engagement || {}
    var cust = context.customer   || {}
    var ucs  = context.useCases   || []
    var strat= context.strategy   || {}

    var ucList = ucs.map(function(u,i){ return (i+1)+'. '+u.uc_name+' ('+u.cluster+')'}).join('\n')

    var prompts = {
      pei: 'Generate a Pre-Engagement Intelligence brief for ' + (cust.name||'the customer') + '.\n' +
           'Engagement: ' + (eng.name||'') + '\nType: ' + (eng.type||'') + '\nSector: ' + (cust.type||'') + '\n' +
           'Intel signals: ' + JSON.stringify(context.intel||[]).slice(0,2000) + '\n\n' +
           'Return JSON: { "title": "...", "subtitle": "...", "sections": [{ "heading": "...", "bullets": ["..."], "narrative": "3 paragraphs" }, ...] }\n' +
           'Sections: Executive Summary, AI Readiness, Key Signals, Opportunity Areas, Recommended Approach\n' +
           'Be specific, factual, and concise. No generic statements.',

      tsap_vision: 'Generate a TSAP Vision Document for ' + (cust.name||'the customer') + '.\n' +
           'Programme: ' + (eng.name||'') + '\nCover note: ' + (eng.cover_note||'') + '\n' +
           'Use cases:\n' + ucList + '\n' +
           'Strategy   Position: ' + (strat.position||'') + '\nKey pitch: ' + (strat.pitch||'') + '\n' +
           'Return JSON: { "title": "...", "sections": [{ "heading": "...", "bullets": [...], "narrative": "..." }] }\n' +
           'Sections (20-25 slides worth): Executive Summary, Programme Vision, Challenge, Proposed Solution, Architecture, Use Cases, Expected Outcomes, Investment & Returns, Implementation Roadmap, Governance, Next Steps\n' +
           'Sovereign AI, India-specific, government-grade tone.',

      fm_summary: 'Generate an FM Executive Summary for ' + (eng.name||'the engagement') + '.\n' +
           'Demand: ' + JSON.stringify(context.demand||{}) + '\n' +
           'Funding: ' + JSON.stringify(context.funding||[]) + '\n' +
           'Key metrics: ' + JSON.stringify(context.metrics||{}) + '\n' +
           'Return JSON: { "title": "...", "sections": [{ "heading": "...", "bullets": [...], "narrative": "..." }] }\n' +
           'Sections: Financial Summary, Programme Investment, Funding Structure, Revenue Model, Cash Flow, Key Assumptions, Risk Factors'
    }

    return (prompts[docType] || prompts.tsap_vision) +
      '\n\nIMPORTANT: Return ONLY valid JSON. No markdown, no explanation.'
  }

  // Tier 1 structured data builders (no AI)
  function _buildTier1Content(docType, context) {
    if (docType === 'bom_rom') {
      return {
        title: 'Bill of Materials & ROM   ' + (context.engagement ? context.engagement.name : ''),
        sheets: [
          { name: 'BOM', headers: ['Category','Item','Qty','Unit Cost (USD)','Total (USD)','Total (Rs Cr)'], rows: context.bom || [] },
          { name: 'ROM Summary', headers: ['Parameter','Value'], rows: context.romSummary || [] }
        ]
      }
    }
    if (docType === 'action_register') {
      return {
        title: 'Action Register   ' + (context.engagement ? context.engagement.name : ''),
        sheets: [{
          name: 'Actions',
          headers: ['#','Action','Owner','Due Date','Status','Notes'],
          rows: (context.actions||[]).map(function(a,i){
            return [i+1, a.title||'', a.assigned_to||'', a.due_date||'', a.status||'', a.notes||'']
          })
        }]
      }
    }
    if (docType === 'rom_letter') {
      var eng = context.engagement||{}; var cust = context.customer||{}
      return {
        title: 'Rough Order of Magnitude   ' + eng.name,
        sections: [{
          heading: 'ROM Summary',
          narrative: 'This letter presents a Rough Order of Magnitude (ROM) estimate for ' + eng.name + ' for ' + cust.name + '.\n\n' +
                     'The ROM is indicative only and subject to detailed solutioning. It is valid for 90 days from the date of issue.',
          table: { headers: ['Component','ROM Value'], rows: context.romRows||[] }
        },{
          heading: 'Assumptions & Exclusions',
          bullets: context.assumptions || [
            'ROM based on preliminary scope   detailed BOM subject to requirements confirmation',
            'Pricing in USD; INR equivalent at prevailing exchange rate',
            'Excludes civil works, site preparation, and third-party software not listed',
            'Subject to final commercial terms and contractual agreements'
          ]
        }]
      }
    }
    if (docType === 'docket_summary') {
      var eng2 = context.engagement||{}
      return {
        title: 'Engagement Docket   ' + eng2.name,
        sections: [
          { heading: 'Engagement Overview', bullets: [
            'Customer: ' + (context.customer ? context.customer.name : ''),
            'Type: ' + (eng2.type||''),
            'Owner: ' + (eng2.owner||''),
            'Status: ' + (eng2.status||''),
            'Opened: ' + (eng2.opened_at ? eng2.opened_at.slice(0,10) : '')
          ]},
          { heading: 'Use Cases (' + (context.useCases||[]).length + ')',
            bullets: (context.useCases||[]).slice(0,10).map(function(u){ return u.uc_name + ' [' + (u.status||'proposed') + ']' }) },
          { heading: 'Open Actions (' + (context.openActions||[]).length + ')',
            bullets: (context.openActions||[]).map(function(a){ return (a.assigned_to||'?') + ': ' + (a.title||'') + (a.due_date ? ' ('+a.due_date.slice(0,10)+')':'') }) },
          { heading: 'Outputs', bullets: (context.outputs||[]).map(function(o){ return o.title||'' }) }
        ]
      }
    }
    return { title: docType, sections: [] }
  }

  //    Upload to Drive                                                        
  // Note: This uses the Anthropic API (Claude in Claude) to call Drive MCP
  // since GitHub Pages cannot directly use Google OAuth for Drive uploads.
  // The actual upload is triggered via the Atlas API pattern.
  async function _uploadToDrive(blob, filename, folderId, mimeType) {
    // Convert blob to base64
    return new Promise(function(resolve) {
      var reader = new FileReader()
      reader.onload = async function(e) {
        var base64 = e.target.result.split(',')[1]
        try {
          var r = await fetch('https://api.anthropic.com/v1/messages', {
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body: JSON.stringify({
              model:'claude-sonnet-4-6',
              max_tokens:1000,
              messages:[{role:'user', content:'Upload file to Google Drive folder ' + folderId + '. Filename: ' + filename + '. MIME type: ' + mimeType + '. Base64 content: ' + base64.slice(0,100) + '... [truncated]. Return the Drive file ID.'}],
              mcp_servers:[{type:'url', url:'https://drivemcp.googleapis.com/mcp/v1', name:'drive-mcp'}]
            })
          })
          if (r.ok) {
            var data = await r.json()
            var text = (data.content||[]).filter(function(c){return c.type==='text'}).map(function(c){return c.text}).join('')
            resolve({success:true, text:text})
          } else resolve({success:false})
        } catch(e2) { resolve({success:false, error:e2.message}) }
      }
      reader.readAsDataURL(blob)
    })
  }

  //    Register in docket                                                     
  async function _registerInDocket(docketId, engId, driveFileId, filename, docType) {
    if (!docketId) return null
    var itemType = {
      bom_rom:'solution', rom_letter:'exec_doc', docket_summary:'exec_doc',
      pei:'pei', tsap_vision:'exec_doc', fm_summary:'exec_doc',
      full_proposal:'exec_doc', action_register:'exec_doc'
    }[docType] || 'exec_doc'

    var row = {
      id: 'DI-' + Date.now() + '-' + Math.floor(Math.random()*9999),
      docket_id: docketId,
      section: 'output',
      item_type: itemType,
      title: filename,
      ref_table: 'drive_files',
      ref_id: driveFileId,
      status: 'done',
      created_by: 'atlasDocGen',
      notes: filename.split('.').pop()  // file extension as format flag
    }
    return _sbPost('docket_items', row)
  }

  //    Doc type label                                                         
  function _docLabel(docType) {
    var labels = {
      pei:'Pre-Engagement Intelligence Brief', bom_rom:'Bill of Materials & ROM',
      rom_letter:'ROM Cover Letter', docket_summary:'Engagement Docket Summary',
      action_register:'Action Register', tsap_vision:'TSAP Vision Document',
      fm_summary:'Financial Model Executive Summary', full_proposal:'Sovereign AI Proposal',
      tech_proposal:'Technical Proposal', deal_summary:'Deal Summary',
      commercial:'Commercial Proposal', meeting_leavebehind:'Meeting Leave-Behind'
    }
    return labels[docType] || docType
  }

  //    Master generate function                                               
  async function generate(docType, formats, context, options) {
    options = options || {}
    var coverOpts = options.cover || {}
    var docketId  = options.docketId || (context.engagement && context.engagement.docket_id)
    var version   = options.version || '1'
    var company   = await _loadCompany()
    var custName  = context.customer ? context.customer.name : ''
    var engName   = context.engagement ? context.engagement.name : ''

    // 1. Get structured content
    var tier = DOC_TIER[docType] || 1
    var structured
    if (tier === 1) {
      structured = _buildTier1Content(docType, context)
    } else {
      var model = tier >= 3 ? 'gemini-3.5-flash' : 'gemini-3.1-flash-lite'
      structured = await _genStructuredContent(docType, context, model)
      if (!structured) structured = _buildTier1Content(docType, context)
    }
    structured.version = version

    // 2. Build each requested format
    var results = []
    for (var fi = 0; fi < formats.length; fi++) {
      var fmt = formats[fi]
      var blob = null
      var mimeType = ''

      if (fmt === 'pptx') {
        var pptx = await _buildPptx(docType, structured, context, coverOpts)
        if (pptx) {
          blob = await pptx.write({outputType:'blob', compression:true})
          mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        }
      } else if (fmt === 'docx') {
        var doc = await _buildDocx(docType, structured, context, coverOpts)
        if (doc && typeof docx !== 'undefined') {
          var buffer = await docx.Packer.toBlob(doc)
          blob = buffer
          mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        }
      } else if (fmt === 'xlsx') {
        var xlsxBase64 = _buildXlsx(docType, structured, context)
        if (xlsxBase64) {
          var binary = atob(xlsxBase64)
          var bytes  = new Uint8Array(binary.length)
          for (var bi=0; bi<binary.length; bi++) bytes[bi] = binary.charCodeAt(bi)
          blob = new Blob([bytes], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
      }

      if (!blob) { console.warn('atlasDocGen: could not build', fmt); continue }

      // 3. Trigger browser download (primary method for GitHub Pages)
      var filename = _buildFilename(docType, custName, engName, version, fmt)
      var url = URL.createObjectURL(blob)
      var a   = document.createElement('a')
      a.href  = url; a.download = filename; a.click()
      setTimeout(function(){ URL.revokeObjectURL(url) }, 5000)

      results.push({
        name: filename,
        type: fmt,
        mimeType: mimeType,
        driveId: null,     // set after Drive upload (manual step for now)
        driveUrl: null,
        blob: blob
      })
    }

    // 4. Register in docket (with drive ID null for now   updated when uploaded)
    var docketItemIds = []
    if (docketId && results.length) {
      for (var ri=0; ri<results.length; ri++) {
        var item = await _registerInDocket(docketId, context.engagement && context.engagement.id, null, results[ri].name, docType)
        if (item) docketItemIds.push(item.id)
      }
    }

    return { files: results, docketItemIds: docketItemIds, structured: structured }
  }

  //    Folder path helper (exposed for tools to use with Drive MCP)           
  function getFolderPath(custName, engName, docType) {
    return _buildFolderPath(custName, engName, docType)
  }

  //    Public API                                                             
  return {
    generate:       generate,
    getFolderPath:  getFolderPath,
    loadCompany:    _loadCompany,
    buildFilename:  _buildFilename,
    BRAND:          BRAND,
    DOMAIN_PALETTE: DOMAIN_PALETTE,
    DOC_TYPE_FOLDER: DOC_TYPE_FOLDER,
    DOC_TIER:       DOC_TIER
  }

})()


//                                                                            
// Cover Image Generator (appended)
//                                                                            

//    ATLAS Cover Image Generator                                            
// Part of atlas-doc-gen.js   appended to module

var atlasCoverImage = (function() {

  var STYLE_LABELS = {
    abstract_geometric: 'abstract geometric pattern with flowing data streams and circuit-like networks',
    architectural:      'architectural perspective showing technology infrastructure and data centres',
    data_viz:           'data visualization with interconnected nodes, network topology and flowing information streams'
  }

  var ENG_TYPE_CONTEXT = {
    tsap:       'sovereign territory AI centre, national digital infrastructure, government transformation programme',
    vertical:   'sector-specific AI deployment, domain expertise, regulatory technology platform',
    enterprise: 'enterprise AI platform, business intelligence, operational transformation',
    csp:        'cloud and AI infrastructure, high-performance computing, inferencing at scale',
    generic:    'artificial intelligence platform, technology innovation, digital capability'
  }

  function _getSB() {
    try {
      var g = JSON.parse(localStorage.getItem('atlas_global_cfg') || '{}')
      return { url: g.sbUrl || g.sb_url || '', key: g.sbKey || g.sb_key || '' }
    } catch(e) { return { url: '', key: '' } }
  }

  function _getGeminiKey() {
    try {
      var g = JSON.parse(localStorage.getItem('atlas_global_cfg') || '{}')
      // Portal stores as key_gemini, also copies to geminiKey and atlas_gemini_key
      return g.geminiKey || g['key_gemini'] || g.gemini_key
             || localStorage.getItem('atlas_gemini_key') || ''
    } catch(e) { return '' }
  }

  function buildPrompt(engType, custSector, style, feedback) {
    var styleDesc = STYLE_LABELS[style] || STYLE_LABELS.abstract_geometric
    var context   = ENG_TYPE_CONTEXT[engType] || ENG_TYPE_CONTEXT.generic
    var prompt = 'Create a ' + styleDesc + '. '
      + 'Use this exact colour palette: deep navy blue (#002870) as the dominant background, '
      + 'electric blue (#1C38F5) for accents and highlights, '
      + 'teal (#00B290) for secondary elements, '
      + 'and flame orange (#FF5539) used very sparingly as a single accent. '
      + 'The image must feel clean, authoritative, and suitable for formal government and enterprise presentations. '
      + 'Domain context: ' + context + '. '
      + 'Customer sector: ' + (custSector || 'government') + '. '
      + 'Strict requirements: no people, no faces, no body parts, no text, no labels, no logos, '
      + 'no watermarks, no copyrighted symbols, no flags, no recognisable brand marks. '
      + 'The image must be safe for use in sovereign AI proposals to government ministries. '
      + 'Landscape orientation, high contrast, visually striking.'
    if (feedback && feedback.trim()) {
      prompt += ' Additional direction from reviewer: ' + feedback.trim()
    }
    return prompt
  }

  async function generateDraft(engType, custSector, style, feedback, onProgress) {
    var apiKey = _getGeminiKey()
    if (!apiKey) return { success: false, error: 'No Gemini API key configured in Settings' }

    var model = 'gemini-3.1-flash-image'
    var prompt = buildPrompt(engType, custSector, style, feedback)

    if (onProgress) onProgress('Generating draft image...')

    try {
      var MODELS = ['gemini-3.1-flash-image','gemini-2.5-flash-image','gemini-2.0-flash-exp']
      var r = null, lastErr = ''
      for (var mi=0; mi<MODELS.length; mi++) {
        r = await fetch(
          'https://generativelanguage.googleapis.com/v1beta/models/' + MODELS[mi] + ':generateContent?key=' + apiKey,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseModalities: ['IMAGE', 'TEXT'] }
            })
          }
        )
        if (r.ok) { model = MODELS[mi]; break }
        var ed = await r.json().catch(function(){ return {} })
        lastErr = 'API error ' + r.status + ': ' + (ed.error ? ed.error.message : r.statusText)
        if (r.status !== 404) break
      }
      if (!r || !r.ok) return { success: false, error: lastErr || 'Image generation unavailable' }

      var data = await r.json()
      var parts = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts
      if (!parts) return { success: false, error: 'No content in response' }

      var imagePart = parts.find(function(p) { return p.inlineData && p.inlineData.mimeType && p.inlineData.mimeType.startsWith('image/') })
      if (!imagePart) return { success: false, error: 'No image in response. Model may not support image generation.' }

      return {
        success:   true,
        base64:    imagePart.inlineData.data,
        mimeType:  imagePart.inlineData.mimeType,
        dataUrl:   'data:' + imagePart.inlineData.mimeType + ';base64,' + imagePart.inlineData.data
      }

    } catch(e) {
      return { success: false, error: e.message }
    }
  }

  async function saveToEngagement(engId, base64, mimeType, driveRootId) {
    // Convert base64 to blob, download locally (Drive upload via MCP not available in browser)
    // Also save reference in engagements table
    var ext = mimeType === 'image/png' ? 'png' : 'jpg'
    var filename = 'cover_image_v' + Date.now() + '.' + ext

    // Trigger browser download
    var link = document.createElement('a')
    link.href = 'data:' + mimeType + ';base64,' + base64
    link.download = filename
    link.click()

    // Update engagement record (drive_id null for now   user uploads manually)
    var sb = _getSB()
    if (sb.url && engId) {
      await fetch(sb.url + '/rest/v1/engagements?id=eq.' + engId, {
        method: 'PATCH',
        headers: { apikey: sb.key, Authorization: 'Bearer ' + sb.key, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ cover_image_status: 'approved', updated_at: new Date().toISOString() })
      })
    }

    return { filename: filename, downloaded: true }
  }

  async function loadEngagementImage(engId) {
    var sb = _getSB()
    if (!sb.url || !engId) return null
    try {
      var r = await fetch(sb.url + '/rest/v1/engagements?id=eq.' + engId + '&select=cover_image_drive_id,cover_image_status', {
        headers: { apikey: sb.key, Authorization: 'Bearer ' + sb.key }
      })
      if (!r.ok) return null
      var rows = await r.json()
      return rows && rows[0] ? rows[0] : null
    } catch(e) { return null }
  }

  //    Cover Image Card UI (rendered in Docket Overview)                      
  function renderCoverImageCard(eng, onUpdate) {
    var engId    = eng ? eng.id : ''
    var engType  = eng ? (eng.type || 'generic') : 'generic'
    var custSect = eng && eng._cust ? (eng._cust.type || 'government') : 'government'
    var status   = eng ? (eng.cover_image_status || 'none') : 'none'

    var statusBadge = {
      none:     '<span style="font-size:10px;padding:2px 7px;border-radius:10px;background:#F1EFE8;color:#6B7280">Not set</span>',
      draft:    '<span style="font-size:10px;padding:2px 7px;border-radius:10px;background:#FFF3CD;color:#856404">Draft</span>',
      approved: '<span style="font-size:10px;padding:2px 7px;border-radius:10px;background:#E1F5EE;color:#085041">Approved</span>'
    }[status] || ''

    return '<div class="card" style="margin-bottom:12px">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">'
      + '<div class="card-title" style="margin-bottom:0">Engagement Cover Image ' + statusBadge + '</div>'
      + '</div>'
      + '<div style="font-size:12px;color:var(--mid);margin-bottom:12px">Generated once, reused across all documents for this engagement. Gives the engagement a consistent visual identity.</div>'

      // Preview area
      + '<div id="cover-img-preview" style="width:100%;height:180px;background:var(--light);border:1px solid var(--border);border-radius:6px;display:flex;align-items:center;justify-content:center;margin-bottom:12px;overflow:hidden">'
      + (status === 'approved' || status === 'draft'
          ? '<div style="font-size:12px;color:var(--mid)">Image saved. Download from Drive or regenerate below.</div>'
          : '<div style="font-size:12px;color:var(--mid)">No cover image yet. Generate one below.</div>')
      + '</div>'

      // Style selector
      + '<div style="display:flex;gap:8px;align-items:center;margin-bottom:10px">'
      + '<label style="font-size:11px;font-weight:700;color:var(--mid);text-transform:uppercase;white-space:nowrap">Style:</label>'
      + '<select id="cover-img-style" style="padding:4px 8px;border:1px solid var(--border);border-radius:4px;font-size:12px;font-family:inherit">'
      + '<option value="abstract_geometric">Abstract geometric</option>'
      + '<option value="architectural">Architectural</option>'
      + '<option value="data_viz">Data visualization</option>'
      + '</select>'
      + '</div>'

      // Feedback input
      + '<div style="margin-bottom:10px">'
      + '<label style="font-size:11px;font-weight:700;color:var(--mid);text-transform:uppercase;display:block;margin-bottom:4px">Feedback / direction</label>'
      + '<input id="cover-img-feedback" type="text" placeholder="e.g. Make it darker, add mountain silhouettes, more abstract..." '
      + 'style="width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:4px;font-size:12px;font-family:inherit">'
      + '</div>'

      // Status message
      + '<div id="cover-img-msg" style="font-size:12px;color:var(--mid);margin-bottom:10px;min-height:18px"></div>'

      // Action buttons
      + '<div style="display:flex;gap:8px;flex-wrap:wrap">'
      + '<button class="btn btn-primary btn-sm" onclick="atlasCoverImageGenerate(\'' + engId + '\',\'' + engType + '\',\'' + custSect + '\')">&#10024; Generate draft</button>'
      + (status === 'draft'
          ? '<button class="btn btn-teal btn-sm" onclick="atlasCoverImageApprove(\'' + engId + '\')">&#10003; Use this</button>'
          : '')
      + '<button class="btn btn-ghost btn-sm" onclick="atlasCoverImageClear(\'' + engId + '\')">&#215; No graphic</button>'
      + '</div>'
      + '</div>'
  }

  return {
    generateDraft:         generateDraft,
    saveToEngagement:      saveToEngagement,
    loadEngagementImage:   loadEngagementImage,
    renderCoverImageCard:  renderCoverImageCard,
    buildPrompt:           buildPrompt,
    STYLE_LABELS:          STYLE_LABELS,
    ENG_TYPE_CONTEXT:      ENG_TYPE_CONTEXT
  }
})()

//    Global handler functions (called from Docket HTML)                     
var _coverDraftData = null

async function atlasCoverImageGenerate(engId, engType, custSect) {
  var style    = (document.getElementById('cover-img-style')    || {}).value || 'abstract_geometric'
  var feedback = (document.getElementById('cover-img-feedback') || {}).value || ''
  var msg      = document.getElementById('cover-img-msg')
  var preview  = document.getElementById('cover-img-preview')

  if (msg) msg.textContent = 'Generating... this takes 10-20 seconds'
  if (msg) msg.style.color = 'var(--mid)'
  if (preview) preview.innerHTML = '<div style="font-size:12px;color:var(--mid)">Generating draft...</div>'

  // Append territory context if available
  var feedbackFull = feedback
  if (typeof atlasMap !== 'undefined' && typeof CURRENT_ENG !== 'undefined' && CURRENT_ENG) {
    var tCtx = CURRENT_ENG._territoryPreset
      ? atlasMap.buildMapPromptContext(CURRENT_ENG._territoryPreset)
      : (CURRENT_ENG.territory_states && CURRENT_ENG.territory_states.length
          ? atlasMap.buildMapPromptContext({states:CURRENT_ENG.territory_states, hubs:CURRENT_ENG.territory_hubs||[]})
          : '')
    if (tCtx) feedbackFull = (feedback ? feedback + ' ' : '') + tCtx
  }
  var result = await atlasCoverImage.generateDraft(engType, custSect, style, feedbackFull, function(p) {
    if (msg) msg.textContent = p
  })

  if (!result.success) {
    if (msg) { msg.textContent = 'Error: ' + result.error; msg.style.color = 'var(--orange)' }
    return
  }

  // Show preview
  _coverDraftData = result
  if (preview) {
    preview.innerHTML = '<img src="' + result.dataUrl + '" style="width:100%;height:100%;object-fit:cover;border-radius:5px">'
  }
  if (msg) { msg.textContent = 'Draft ready. Happy with it? Click "Use this" or add feedback and regenerate.'; msg.style.color = 'var(--teal)' }

  // Update status to draft in Supabase
  var sb = (function(){try{var g=JSON.parse(localStorage.getItem('atlas_global_cfg')||'{}');return{url:g.sbUrl||g.sb_url||'',key:g.sbKey||g.sb_key||''}}catch(e){return{url:'',key:''}}})()
  if (sb.url && engId) {
    fetch(sb.url + '/rest/v1/engagements?id=eq.' + engId, {
      method: 'PATCH',
      headers: { apikey: sb.key, Authorization: 'Bearer ' + sb.key, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ cover_image_status: 'draft', updated_at: new Date().toISOString() })
    })
  }
}

async function atlasCoverImageApprove(engId) {
  if (!_coverDraftData) {
    var msg = document.getElementById('cover-img-msg')
    if (msg) { msg.textContent = 'Generate a draft first'; msg.style.color = 'var(--orange)' }
    return
  }
  var result = await atlasCoverImage.saveToEngagement(engId, _coverDraftData.base64, _coverDraftData.mimeType)
  var msg = document.getElementById('cover-img-msg')
  if (msg) {
    msg.textContent = 'Saved as ' + result.filename + '. Upload this file to Drive then set its ID in the engagement.'
    msg.style.color = 'var(--teal)'
  }
  // Refresh docket
  if (typeof renderDocket === 'function') {
    if (CURRENT_ENG) CURRENT_ENG.cover_image_status = 'approved'
    renderDocket()
  }
}

async function atlasCoverImageClear(engId) {
  var sb = (function(){try{var g=JSON.parse(localStorage.getItem('atlas_global_cfg')||'{}');return{url:g.sbUrl||g.sb_url||'',key:g.sbKey||g.sb_key||''}}catch(e){return{url:'',key:''}}})()
  if (sb.url && engId) {
    await fetch(sb.url + '/rest/v1/engagements?id=eq.' + engId, {
      method: 'PATCH',
      headers: { apikey: sb.key, Authorization: 'Bearer ' + sb.key, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ cover_image_status: 'none', cover_image_drive_id: null, updated_at: new Date().toISOString() })
    })
  }
  _coverDraftData = null
  var preview = document.getElementById('cover-img-preview')
  if (preview) preview.innerHTML = '<div style="font-size:12px;color:var(--mid)">No cover image. Documents will use a colour block.</div>'
  var msg = document.getElementById('cover-img-msg')
  if (msg) { msg.textContent = 'Cover image removed'; msg.style.color = 'var(--mid)' }
  if (CURRENT_ENG) CURRENT_ENG.cover_image_status = 'none'
}

// ===========================================================================
// Territory Map Generator v2   real GeoJSON projection
// ===========================================================================


// ===========================================================================
// ATLAS Territory Map Generator v2   D3.js + real GeoJSON
// ===========================================================================

var atlasMap = (function() {

  var C = {
    india:      '#E5E7EB',
    indiaBdr:   '#9CA3AF',
    highlight:  '#00B290',
    highlightB: '#007A63',
    hub:        '#002870',
    spoke:      '#1C38F5',
    edge:       '#00B290',
    label:      '#002870',
    city:       '#374151',
    bg:         '#FFFFFF'
  }

  // Real GeoJSON   India states (simplified, 36KB)
  var INDIA_GEOJSON = {"type":"FeatureCollection","features":[{"type":"Feature","properties":{"name":"Andaman and Nicobar"},"geometry":{"type":"MultiPolygon","coordinates":[[[[93.79,6.85],[93.79,6.85]]],[[[93.72,7.21],[93.72,7.21]]],[[[93.85,7.24],[93.83,6.75],[93.85,7.24]]],[[[93.85,7.29],[93.85,7.29]]],[[[93.66,7.38],[93.66,7.38]]],[[[93.77,7.4],[93.77,7.4]]],[[[93.69,7.41],[93.69,7.41]]],[[[93.71,7.44],[93.65,7.24],[93.71,7.44]]],[[[93.65,7.48],[93.65,7.48]]],[[[93.63,7.48],[93.63,7.48]]],[[[93.54,7.53],[93.54,7.53]]],[[[93.34,7.91],[93.34,7.91]]],[[[93.34,7.91],[93.34,7.91]]],[[[93.38,8.02],[93.38,8.02]]],[[[93.55,8.03],[93.55,8.03]]],[[[93.58,8.13],[93.58,8.13]]],[[[93.53,8.23],[93.5,8.0],[93.53,8.23]]],[[[93.24,8.27],[93.24,8.27]]],[[[93.13,8.36],[93.13,8.36]]],[[[93.65,8.39],[93.65,8.39]]],[[[93.63,8.39],[93.63,8.39]]],[[[93.04,8.47],[93.04,8.47]]],[[[93.61,8.48],[93.61,8.48]]],[[[93.62,8.57],[93.62,8.57]]],[[[93.61,8.58],[93.61,8.58]]],[[[92.86,8.82],[92.86,8.82]]],[[[92.79,9.12],[92.79,9.12]]],[[[92.8,9.12],[92.8,9.12]]],[[[92.81,9.13],[92.81,9.13]]],[[[92.79,9.24],[92.79,9.24]]],[[[92.52,10.9],[92.39,10.53],[92.52,10.9]]],[[[92.61,10.94],[92.61,10.94]]],[[[92.23,10.98],[92.23,10.98]]],[[[92.66,10.98],[92.66,10.98]]],[[[92.73,11.14],[92.73,11.14]]],[[[92.73,11.15],[92.73,11.15]]],[[[92.68,11.18],[92.68,11.18]]],[[[92.71,11.29],[92.71,11.29]]],[[[92.7,11.31],[92.7,11.31]]],[[[92.72,11.32],[92.72,11.32]]],[[[92.55,11.39],[92.55,11.39]]],[[[92.56,11.39],[92.56,11.39]]],[[[92.67,11.49],[92.67,11.49]]],[[[92.61,11.5],[92.61,11.5]]],[[[92.64,11.51],[92.64,11.51]]],[[[92.64,11.51],[92.64,11.51]]],[[[92.27,11.52],[92.27,11.52]]],[[[92.6,11.53],[92.6,11.53]]],[[[92.56,11.54],[92.56,11.54]]],[[[92.63,11.54],[92.63,11.54]]],[[[92.61,11.56],[92.61,11.56]]],[[[92.57,11.56],[92.57,11.56]]],[[[92.57,11.57],[92.57,11.57]]],[[[92.6,11.54],[92.6,11.54]]],[[[92.58,11.58],[92.58,11.58]]],[[[92.61,11.59],[92.61,11.59]]],[[[92.22,11.59],[92.22,11.59]]],[[[92.54,11.6],[92.54,11.6]]],[[[92.7,11.66],[92.7,11.66]]],[[[92.76,11.67],[92.76,11.67]]],[[[92.72,11.69],[92.72,11.69]]],[[[92.55,11.72],[92.55,11.72]]],[[[93.08,11.78],[93.08,11.78]]],[[[93.02,11.84],[93.02,11.84]]],[[[92.6,11.91],[92.6,11.91]]],[[[92.57,11.95],[92.57,11.95]]],[[[92.73,11.95],[92.73,11.95]]],[[[92.74,11.96],[92.74,11.96]]],[[[92.75,11.97],[92.75,11.97]]],[[[92.6,11.98],[92.6,11.98]]],[[[92.58,11.98],[92.58,11.98]]],[[[92.78,12.02],[92.78,12.02]]],[[[92.97,12.03],[92.97,12.03]]],[[[92.97,12.06],[92.97,12.06]]],[[[92.99,12.11],[92.99,12.11]]],[[[92.99,12.11],[92.99,12.11]]],[[[92.74,12.11],[92.74,12.11]]],[[[92.95,12.12],[92.95,12.12]]],[[[92.63,12.11],[92.63,12.11]]],[[[92.63,12.12],[92.63,12.12]]],[[[93.1,12.14],[93.1,12.14]]],[[[93.12,12.15],[93.12,12.15]]],[[[92.85,12.15],[92.85,12.15]]],[[[93.03,12.16],[93.03,12.16]]],[[[92.76,12.18],[92.76,12.18]]],[[[92.72,12.18],[92.72,12.18]]],[[[92.73,12.19],[92.73,12.19]]],[[[93.07,12.21],[93.07,12.21]]],[[[92.68,12.21],[92.68,12.21]]],[[[93.02,12.23],[93.02,12.23]]],[[[92.94,12.22],[92.94,12.22]]],[[[92.7,12.24],[92.71,11.48],[92.7,12.24]]],[[[92.73,12.24],[92.73,12.24]]],[[[92.88,12.25],[92.88,12.25]]],[[[92.87,12.24],[92.87,12.24]]],[[[92.7,12.24],[92.7,12.24]]],[[[92.9,12.26],[92.9,12.26]]],[[[93.08,12.26],[93.08,12.26]]],[[[92.9,12.26],[92.9,12.26]]],[[[92.74,12.27],[92.74,12.27]]],[[[93.03,12.28],[93.03,12.28]]],[[[92.75,12.29],[92.75,12.29]]],[[[92.74,12.29],[92.74,12.29]]],[[[92.77,12.27],[92.77,12.27]]],[[[92.75,12.29],[92.75,12.29]]],[[[92.77,12.29],[92.77,12.29]]],[[[92.88,12.29],[92.88,12.29]]],[[[92.71,12.3],[92.71,12.3]]],[[[92.77,12.3],[92.77,12.3]]],[[[92.94,12.28],[92.94,12.28]]],[[[92.78,12.31],[92.76,12.06],[92.78,12.31]]],[[[93.07,12.32],[93.07,12.32]]],[[[93.84,12.32],[93.84,12.32]]],[[[92.91,12.33],[92.91,12.33]]],[[[92.91,12.34],[92.91,12.34]]],[[[92.91,12.34],[92.91,12.34]]],[[[92.9,12.39],[92.9,12.39]]],[[[92.85,12.41],[92.85,12.41]]],[[[92.9,12.41],[92.9,12.41]]],[[[92.89,12.41],[92.89,12.41]]],[[[92.87,12.42],[92.87,12.42]]],[[[92.9,12.42],[92.9,12.42]]],[[[92.83,12.43],[92.83,12.43]]],[[[92.96,12.41],[92.96,12.41]]],[[[92.88,12.45],[92.88,12.45]]],[[[92.68,12.54],[92.68,12.54]]],[[[92.7,12.64],[92.7,12.64]]],[[[92.73,12.7],[92.73,12.7]]],[[[92.72,12.74],[92.72,12.74]]],[[[92.73,12.75],[92.73,12.75]]],[[[92.66,12.77],[92.66,12.77]]],[[[92.72,12.77],[92.72,12.77]]],[[[92.72,12.76],[92.72,12.76]]],[[[92.72,12.8],[92.72,12.8]]],[[[92.72,12.8],[92.72,12.8]]],[[[92.72,12.8],[92.72,12.8]]],[[[92.71,12.83],[92.71,12.83]]],[[[92.73,12.84],[92.73,12.84]]],[[[92.73,12.86],[92.73,12.86]]],[[[92.73,12.86],[92.73,12.86]]],[[[92.78,12.86],[92.78,12.86]]],[[[92.77,12.85],[92.77,12.85]]],[[[92.76,12.88],[92.76,12.88]]],[[[92.79,12.89],[92.79,12.89]]],[[[92.89,12.9],[92.89,12.9]]],[[[92.76,12.91],[92.76,12.91]]],[[[92.86,12.91],[92.86,12.91]]],[[[92.79,12.91],[92.79,12.91]]],[[[92.91,12.92],[92.91,12.92]]],[[[92.77,12.92],[92.77,12.92]]],[[[92.94,12.92],[92.94,12.92]]],[[[92.77,12.92],[92.77,12.92]]],[[[92.9,12.92],[92.72,12.3],[92.9,12.92]]],[[[92.77,12.93],[92.77,12.93]]],[[[92.88,12.93],[92.88,12.93]]],[[[92.77,12.93],[92.77,12.93]]],[[[92.89,12.94],[92.89,12.94]]],[[[92.9,12.94],[92.9,12.94]]],[[[92.67,12.95],[92.67,12.95]]],[[[92.67,12.95],[92.67,12.95]]],[[[92.7,12.99],[92.67,12.78],[92.7,12.99]]],[[[93.01,13.0],[93.01,13.0]]],[[[92.99,13.0],[92.99,13.0]]],[[[92.91,13.0],[92.91,13.0]]],[[[92.95,13.02],[92.95,13.02]]],[[[92.93,13.02],[92.93,13.02]]],[[[92.92,13.04],[92.92,13.04]]],[[[92.93,13.05],[92.93,13.05]]],[[[92.92,13.06],[92.92,13.06]]],[[[92.73,13.1],[92.73,13.1]]],[[[92.72,13.1],[92.72,13.1]]],[[[92.79,13.17],[92.79,13.17]]],[[[93.06,13.22],[93.06,13.22]]],[[[93.02,13.28],[93.02,13.28]]],[[[93.07,13.3],[93.07,13.3]]],[[[93.02,13.33],[93.02,13.33]]],[[[92.97,13.33],[92.97,13.33]]],[[[93.02,13.34],[93.02,13.34]]],[[[93.04,13.34],[93.04,13.34]]],[[[93.08,13.36],[93.08,13.36]]],[[[93.08,13.37],[93.08,13.37]]],[[[93.06,13.38],[93.06,13.38]]],[[[92.87,13.41],[92.87,13.41]]],[[[92.81,13.42],[92.81,13.42]]],[[[93.09,13.42],[93.09,13.42]]],[[[93.07,13.43],[93.07,13.43]]],[[[93.1,13.44],[93.1,13.44]]],[[[92.84,13.44],[92.84,13.44]]],[[[94.27,13.46],[94.27,13.46]]],[[[92.87,13.51],[92.87,13.51]]],[[[92.92,13.52],[92.92,13.52]]],[[[92.91,13.54],[92.91,13.54]]],[[[92.88,13.54],[92.88,13.54]]],[[[93.01,13.56],[93.01,13.56]]],[[[93.06,13.57],[93.06,13.57]]],[[[93.03,13.57],[92.84,12.88],[93.03,13.57]]],[[[92.9,13.6],[92.9,13.6]]],[[[93.06,13.65],[93.06,13.65]]],[[[93.02,13.67],[93.02,13.67]]],[[[93.02,13.68],[93.02,13.68]]],[[[93.22,14.02],[93.22,14.02]]],[[[93.37,14.05],[93.37,14.05]]],[[[93.38,14.13],[93.38,14.13]]],[[[93.37,14.16],[93.37,14.16]]],[[[93.36,14.19],[93.36,14.19]]],[[[93.37,14.19],[93.37,14.19]]],[[[93.55,14.78],[93.55,14.78]]],[[[93.57,14.85],[93.57,14.85]]],[[[93.57,14.86],[93.57,14.86]]],[[[93.57,14.87],[93.57,14.87]]],[[[93.64,14.9],[93.64,14.9]]],[[[93.65,14.93],[93.65,14.93]]]]}},{"type":"Feature","properties":{"name":"Telangana"},"geometry":{"type":"Polygon","coordinates":[[[77.51,15.92],[77.59,16.34],[77.24,16.47],[77.69,17.49],[77.44,17.58],[77.53,18.44],[77.94,18.82],[77.86,19.3],[78.31,19.46],[78.31,19.91],[79.18,19.46],[79.79,19.59],[79.91,18.81],[80.63,18.52],[81.03,17.79],[81.79,17.85],[80.83,17.03],[80.37,17.06],[80.56,16.76],[80.18,17.04],[78.78,16.02],[77.51,15.92]]]}},{"type":"Feature","properties":{"name":"Andhra Pradesh"},"geometry":{"type":"MultiPolygon","coordinates":[[[[80.27,13.46],[80.27,13.46]]],[[[80.23,13.49],[80.23,13.49]]],[[[80.23,13.49],[80.23,13.49]]],[[[80.27,13.52],[80.27,13.52]]],[[[80.19,13.52],[80.19,13.52]]],[[[80.18,13.54],[80.18,13.54]]],[[[80.05,13.59],[80.05,13.59]]],[[[80.15,13.62],[80.15,13.62]]],[[[80.1,13.64],[80.1,13.64]]],[[[80.11,13.65],[80.11,13.65]]],[[[80.1,13.68],[80.1,13.68]]],[[[80.06,15.2],[80.06,15.2]]],[[[80.21,15.5],[80.21,15.5]]],[[[81.03,15.77],[81.03,15.77]]],[[[80.78,15.84],[80.78,15.84]]],[[[80.79,15.84],[80.79,15.84]]],[[[80.79,15.86],[80.79,15.86]]],[[[80.77,15.86],[80.77,15.86]]],[[[81.54,16.36],[81.54,16.36]]],[[[81.54,16.36],[81.54,16.36]]],[[[82.32,16.58],[82.32,16.58]]],[[[82.26,16.68],[82.26,16.68]]],[[[82.3,16.71],[82.3,16.71]]],[[[82.31,16.72],[82.31,16.72]]],[[[82.31,16.73],[82.31,16.73]]],[[[82.33,16.72],[82.33,16.72]]],[[[82.33,16.72],[82.33,16.72]]],[[[83.17,17.57],[83.17,17.57]]],[[[83.31,17.68],[83.31,17.68]]],[[[83.31,17.68],[83.31,17.68]]],[[[83.27,17.71],[83.27,17.71]]],[[[82.3,16.71],[81.37,16.36],[80.97,15.73],[80.27,15.67],[80.05,15.08],[80.32,13.44],[80.05,13.59],[80.31,13.37],[80.01,13.53],[79.74,13.19],[78.7,13.06],[78.37,12.61],[78.58,13.26],[78.11,13.85],[76.99,13.74],[76.89,14.16],[77.39,13.88],[77.51,14.17],[76.94,14.24],[76.76,14.6],[76.77,15.07],[77.15,15.12],[77.09,15.92],[78.78,16.02],[80.18,17.04],[80.56,16.76],[80.39,17.08],[81.42,17.36],[81.8,17.94],[82.34,18.05],[82.47,18.54],[82.63,18.23],[83.05,18.38],[83.62,19.15],[84.08,18.74],[84.76,19.07],[82.37,17.12],[82.3,16.71]]]]}},{"type":"Feature","properties":{"name":"Arunachal Pradesh"},"geometry":{"type":"Polygon","coordinates":[[[96.16,29.38],[96.39,29.26],[96.17,28.91],[96.53,29.08],[96.62,28.78],[96.26,28.41],[97.4,28.2],[96.9,27.62],[97.15,27.1],[96.62,27.37],[95.24,26.69],[95.2,27.04],[96.02,27.37],[95.76,27.73],[95.98,27.97],[94.25,27.64],[93.49,26.94],[92.11,26.89],[92.02,27.48],[91.56,27.58],[91.55,27.86],[92.56,27.82],[94.63,29.35],[95.41,29.03],[96.16,29.38]]]}},{"type":"Feature","properties":{"name":"Assam"},"geometry":{"type":"MultiPolygon","coordinates":[[[[89.87,25.54],[89.87,25.54]]],[[[89.87,25.54],[89.87,25.54]]],[[[95.95,27.94],[95.76,27.73],[96.02,27.37],[94.28,26.56],[93.98,25.92],[93.33,25.55],[93.04,24.41],[92.77,24.52],[92.47,24.14],[92.21,24.25],[92.24,24.9],[92.8,25.22],[92.65,25.59],[92.16,25.67],[92.3,26.08],[91.22,25.72],[90.12,25.96],[89.87,25.54],[89.86,26.74],[93.66,26.97],[94.25,27.64],[95.95,27.94]]]]}},{"type":"Feature","properties":{"name":"Bihar"},"geometry":{"type":"MultiPolygon","coordinates":[[[[88.11,26.54],[88.11,26.54]]],[[[84.12,27.51],[85.85,26.57],[87.34,26.35],[88.23,26.55],[87.8,25.92],[88.07,25.48],[87.32,25.22],[87.05,24.61],[86.45,24.37],[85.74,24.82],[84.49,24.29],[84.29,24.57],[83.5,24.53],[83.35,25.2],[84.63,25.73],[83.9,26.45],[84.41,26.63],[83.83,27.32],[84.12,27.51]]],[[[87.31,27.84],[87.31,27.84]]],[[[87.26,27.85],[87.26,27.85]]],[[[87.26,27.85],[87.26,27.85]]]]}},{"type":"Feature","properties":{"name":"Chandigarh"},"geometry":{"type":"Polygon","coordinates":[[[76.82,30.69],[76.82,30.69]]]}},{"type":"Feature","properties":{"name":"Chhattisgarh"},"geometry":{"type":"Polygon","coordinates":[[[83.33,24.1],[84.01,23.63],[84.38,22.88],[83.62,22.2],[83.19,21.14],[82.35,20.88],[82.39,20.06],[82.71,19.85],[81.87,20.05],[82.24,18.91],[81.38,17.8],[81.04,17.79],[80.24,18.75],[80.38,19.24],[80.89,19.47],[80.39,19.79],[80.46,21.17],[81.11,22.44],[81.62,22.54],[82.15,23.14],[81.61,23.51],[81.61,23.91],[82.52,23.78],[83.33,24.1]]]}},{"type":"Feature","properties":{"name":"Dadra and Nagar Haveli"},"geometry":{"type":"Polygon","coordinates":[[[72.99,20.29],[73.2,20.06],[72.99,20.29]]]}},{"type":"Feature","properties":{"name":"Daman and Diu"},"geometry":{"type":"MultiPolygon","coordinates":[[[[72.86,20.47],[72.86,20.47]]],[[[70.89,20.71],[70.89,20.71]]],[[[70.95,20.73],[70.95,20.73]]],[[[70.77,20.96],[70.84,20.69],[70.77,20.96]]]]}},{"type":"Feature","properties":{"name":"Delhi"},"geometry":{"type":"Polygon","coordinates":[[[77.22,28.84],[77.24,28.43],[76.84,28.56],[77.22,28.84]]]}},{"type":"Feature","properties":{"name":"Goa"},"geometry":{"type":"MultiPolygon","coordinates":[[[[73.78,15.36],[73.78,15.36]]],[[[73.8,15.38],[73.8,15.38]]],[[[73.86,15.41],[73.86,15.41]]],[[[73.88,15.78],[74.26,15.65],[74.21,14.92],[73.78,15.41],[73.88,15.78]]]]}},{"type":"Feature","properties":{"name":"Gujarat"},"geometry":{"type":"MultiPolygon","coordinates":[[[[70.86,20.75],[70.86,20.75]]],[[[72.85,20.76],[72.85,20.76]]],[[[71.39,20.87],[71.39,20.87]]],[[[71.52,20.91],[71.52,20.91]]],[[[71.65,20.98],[71.65,20.98]]],[[[71.69,21.0],[71.69,21.0]]],[[[71.7,21.0],[71.7,21.0]]],[[[71.71,21.0],[71.71,21.0]]],[[[72.65,21.08],[72.65,21.08]]],[[[72.68,21.1],[72.68,21.1]]],[[[72.67,21.12],[72.67,21.12]]],[[[72.7,21.12],[72.7,21.12]]],[[[72.68,21.16],[72.68,21.16]]],[[[72.1,21.27],[72.1,21.27]]],[[[72.59,21.34],[72.59,21.34]]],[[[72.58,21.37],[72.58,21.37]]],[[[72.6,21.39],[72.6,21.39]]],[[[72.63,21.42],[72.63,21.42]]],[[[72.64,21.42],[72.64,21.42]]],[[[72.68,21.45],[72.68,21.45]]],[[[69.72,21.56],[69.72,21.56]]],[[[69.73,21.61],[69.73,21.61]]],[[[72.35,21.61],[72.35,21.61]]],[[[72.58,21.63],[72.58,21.63]]],[[[72.61,21.63],[72.61,21.63]]],[[[72.61,21.63],[72.61,21.63]]],[[[72.62,21.64],[72.62,21.64]]],[[[72.6,21.64],[72.6,21.64]]],[[[72.62,21.64],[72.62,21.64]]],[[[72.6,21.64],[72.6,21.64]]],[[[72.72,21.67],[72.72,21.67]]],[[[72.27,21.75],[72.27,21.75]]],[[[72.35,21.94],[72.35,21.94]]],[[[72.21,22.01],[72.21,22.01]]],[[[72.47,22.21],[72.47,22.21]]],[[[72.38,22.22],[72.38,22.22]]],[[[72.37,22.24],[72.37,22.24]]],[[[69.31,22.31],[69.31,22.31]]],[[[69.45,22.36],[69.45,22.36]]],[[[69.18,22.37],[69.18,22.37]]],[[[69.2,22.37],[69.2,22.37]]],[[[69.21,22.38],[69.21,22.38]]],[[[69.2,22.39],[69.2,22.39]]],[[[69.34,22.39],[69.34,22.39]]],[[[69.48,22.4],[69.48,22.4]]],[[[69.28,22.42],[69.28,22.42]]],[[[69.28,22.42],[69.28,22.42]]],[[[69.14,22.46],[69.14,22.46]]],[[[69.63,22.46],[69.63,22.46]]],[[[69.3,22.47],[69.3,22.47]]],[[[69.14,22.48],[69.14,22.48]]],[[[69.09,22.49],[69.09,22.49]]],[[[69.32,22.53],[69.32,22.53]]],[[[69.94,22.53],[69.94,22.53]]],[[[69.41,22.53],[69.41,22.53]]],[[[69.96,22.54],[69.96,22.54]]],[[[69.96,22.54],[69.96,22.54]]],[[[69.95,22.55],[69.95,22.55]]],[[[69.92,22.55],[69.92,22.55]]],[[[70.02,22.55],[70.02,22.55]]],[[[70.01,22.55],[70.01,22.55]]],[[[70.02,22.56],[70.02,22.56]]],[[[70.04,22.57],[70.04,22.57]]],[[[70.04,22.57],[70.04,22.57]]],[[[70.18,22.58],[70.18,22.58]]],[[[70.01,22.59],[70.01,22.59]]],[[[70.19,22.6],[70.19,22.6]]],[[[69.95,22.61],[69.95,22.61]]],[[[70.22,22.65],[70.22,22.65]]],[[[70.24,22.68],[70.24,22.68]]],[[[70.24,22.68],[70.24,22.68]]],[[[70.25,22.69],[70.25,22.69]]],[[[70.24,22.72],[70.24,22.72]]],[[[69.64,22.76],[69.64,22.76]]],[[[69.64,22.78],[69.64,22.78]]],[[[70.46,23.0],[70.46,23.0]]],[[[70.44,23.05],[70.44,23.05]]],[[[70.45,23.05],[70.45,23.05]]],[[[70.45,23.05],[70.45,23.05]]],[[[70.46,23.06],[70.46,23.06]]],[[[70.45,23.06],[70.45,23.06]]],[[[70.47,23.06],[70.47,23.06]]],[[[70.48,23.07],[70.48,23.07]]],[[[68.61,23.23],[68.61,23.23]]],[[[68.59,23.26],[68.59,23.26]]],[[[68.66,23.27],[68.66,23.27]]],[[[68.63,23.29],[68.63,23.29]]],[[[68.71,23.31],[68.71,23.31]]],[[[68.56,23.31],[68.56,23.31]]],[[[68.64,23.31],[68.64,23.31]]],[[[68.63,23.32],[68.63,23.32]]],[[[68.64,23.32],[68.64,23.32]]],[[[68.59,23.32],[68.59,23.32]]],[[[68.63,23.32],[68.63,23.32]]],[[[68.63,23.32],[68.63,23.32]]],[[[68.63,23.33],[68.63,23.33]]],[[[68.54,23.34],[68.54,23.34]]],[[[68.55,23.34],[68.55,23.34]]],[[[68.56,23.34],[68.56,23.34]]],[[[68.51,23.34],[68.51,23.34]]],[[[68.53,23.34],[68.53,23.34]]],[[[68.56,23.34],[68.56,23.34]]],[[[68.63,23.35],[68.63,23.35]]],[[[68.47,23.36],[68.47,23.36]]],[[[68.57,23.36],[68.57,23.36]]],[[[68.6,23.36],[68.6,23.36]]],[[[68.59,23.37],[68.59,23.37]]],[[[68.54,23.38],[68.54,23.38]]],[[[68.5,23.38],[68.5,23.38]]],[[[68.5,23.38],[68.5,23.38]]],[[[68.54,23.39],[68.54,23.39]]],[[[68.58,23.39],[68.58,23.39]]],[[[68.54,23.39],[68.54,23.39]]],[[[68.55,23.4],[68.55,23.4]]],[[[68.54,23.4],[68.54,23.4]]],[[[68.46,23.41],[68.46,23.41]]],[[[68.52,23.4],[68.52,23.4]]],[[[68.47,23.41],[68.47,23.41]]],[[[68.43,23.41],[68.43,23.41]]],[[[68.46,23.41],[68.46,23.41]]],[[[68.41,23.41],[68.41,23.41]]],[[[68.56,23.41],[68.56,23.41]]],[[[68.41,23.41],[68.41,23.41]]],[[[68.46,23.41],[68.46,23.41]]],[[[68.55,23.41],[68.55,23.41]]],[[[68.4,23.42],[68.4,23.42]]],[[[68.4,23.42],[68.4,23.42]]],[[[68.4,23.43],[68.4,23.43]]],[[[68.5,23.43],[68.5,23.43]]],[[[68.52,23.43],[68.52,23.43]]],[[[68.5,23.44],[68.5,23.44]]],[[[68.5,23.44],[68.5,23.44]]],[[[68.5,23.45],[68.5,23.45]]],[[[68.51,23.46],[68.51,23.46]]],[[[68.41,23.46],[68.41,23.46]]],[[[68.5,23.48],[68.5,23.48]]],[[[68.47,23.48],[68.47,23.48]]],[[[68.5,23.49],[68.5,23.49]]],[[[68.51,23.49],[68.51,23.49]]],[[[68.51,23.49],[68.51,23.49]]],[[[68.49,23.5],[68.49,23.5]]],[[[68.47,23.5],[68.47,23.5]]],[[[68.44,23.5],[68.44,23.5]]],[[[68.48,23.5],[68.48,23.5]]],[[[68.47,23.52],[68.47,23.52]]],[[[68.48,23.53],[68.48,23.53]]],[[[68.47,23.54],[68.47,23.54]]],[[[68.48,23.55],[68.48,23.55]]],[[[68.48,23.56],[68.48,23.56]]],[[[68.22,23.59],[68.22,23.59]]],[[[68.26,23.59],[68.26,23.59]]],[[[68.22,23.59],[68.22,23.59]]],[[[68.48,23.6],[68.48,23.6]]],[[[68.46,23.6],[68.46,23.6]]],[[[68.48,23.61],[68.48,23.61]]],[[[68.46,23.62],[68.46,23.62]]],[[[68.48,23.63],[68.48,23.63]]],[[[68.48,23.72],[68.48,23.72]]],[[[68.45,23.73],[68.45,23.73]]],[[[68.47,23.74],[68.47,23.74]]],[[[68.49,23.75],[68.49,23.75]]],[[[68.22,23.78],[68.22,23.78]]],[[[68.35,23.8],[68.35,23.8]]],[[[68.36,23.81],[68.2,23.6],[68.36,23.81]]],[[[68.61,23.81],[68.61,23.81]]],[[[68.6,23.81],[68.6,23.81]]],[[[68.31,23.82],[68.31,23.82]]],[[[68.5,23.83],[68.5,23.83]]],[[[68.71,23.85],[68.71,23.85]]],[[[68.7,23.85],[68.7,23.85]]],[[[68.53,23.87],[68.53,23.87]]],[[[68.4,23.88],[68.4,23.88]]],[[[68.25,23.88],[68.25,23.88]]],[[[68.45,23.94],[68.45,23.94]]],[[[68.54,23.95],[68.54,23.95]]],[[[68.53,23.95],[68.53,23.95]]],[[[68.48,23.99],[68.48,23.99]]],[[[68.43,24.0],[68.24,23.68],[68.43,24.0]]],[[[72.1,24.64],[73.1,24.49],[73.63,23.45],[74.48,22.86],[74.04,22.54],[74.29,22.39],[73.79,21.63],[74.33,21.5],[73.59,21.17],[73.95,20.74],[73.45,20.71],[73.26,20.12],[73.11,20.36],[72.74,20.14],[72.89,20.75],[72.6,21.55],[72.84,21.67],[72.5,21.96],[72.92,22.28],[72.36,22.38],[72.11,21.2],[71.05,20.73],[70.74,20.99],[70.67,20.75],[68.94,22.31],[70.16,22.55],[70.49,23.08],[69.47,22.77],[68.49,23.5],[68.77,24.29],[70.81,24.22],[71.11,24.68],[72.1,24.64]]]]}},{"type":"Feature","properties":{"name":"Haryana"},"geometry":{"type":"Polygon","coordinates":[[[76.84,30.88],[77.59,30.37],[77.12,29.77],[77.22,28.9],[76.83,28.58],[77.47,28.41],[77.54,27.95],[76.97,27.66],[76.86,28.22],[75.96,27.86],[76.09,28.16],[75.56,28.61],[75.4,29.26],[74.6,29.33],[74.47,29.79],[75.08,29.92],[75.22,29.55],[75.44,29.81],[76.04,29.75],[76.2,30.16],[76.93,30.39],[76.84,30.88]]]}},{"type":"Feature","properties":{"name":"Himachal Pradesh"},"geometry":{"type":"Polygon","coordinates":[[[76.8,33.24],[77.33,32.82],[77.71,32.97],[77.98,32.59],[78.37,32.76],[79.0,31.12],[77.89,31.15],[77.57,30.38],[76.36,31.44],[76.17,31.31],[75.58,32.08],[75.93,32.42],[75.79,32.89],[76.8,33.24]]]}},{"type":"Feature","properties":{"name":"Jammu and Kashmir"},"geometry":{"type":"Polygon","coordinates":[[[77.9,35.43],[78.11,35.48],[78.25,34.7],[78.98,34.33],[78.71,33.65],[79.41,33.18],[79.55,32.61],[78.98,32.34],[78.75,32.7],[78.31,32.48],[78.37,32.76],[77.98,32.59],[77.71,32.97],[77.33,32.82],[76.78,33.26],[75.81,32.93],[75.92,32.64],[75.5,32.28],[74.7,32.48],[74.7,32.84],[74.01,33.2],[74.19,33.46],[73.96,33.72],[74.26,33.97],[73.88,34.05],[73.96,34.7],[75.75,34.52],[77.9,35.43]]]}},{"type":"Feature","properties":{"name":"Jharkhand"},"geometry":{"type":"Polygon","coordinates":[[[87.6,25.31],[87.97,24.9],[87.69,24.15],[85.86,23.45],[85.91,23.13],[86.54,22.99],[86.42,22.78],[86.89,22.25],[86.04,22.56],[85.91,21.97],[85.23,22.0],[84.98,22.08],[85.06,22.48],[84.0,22.52],[84.39,22.94],[83.32,24.1],[83.4,24.5],[83.99,24.64],[84.49,24.29],[85.74,24.82],[86.45,24.37],[87.6,25.31]]]}},{"type":"Feature","properties":{"name":"Karnataka"},"geometry":{"type":"MultiPolygon","coordinates":[[[[74.67,13.2],[74.67,13.2]]],[[[74.73,13.28],[74.73,13.28]]],[[[74.7,13.28],[74.7,13.28]]],[[[74.72,13.29],[74.72,13.29]]],[[[74.69,13.33],[74.69,13.33]]],[[[74.69,13.34],[74.69,13.34]]],[[[74.68,13.35],[74.68,13.35]]],[[[74.67,13.38],[74.67,13.38]]],[[[74.48,14.01],[74.48,14.01]]],[[[74.33,14.02],[74.33,14.02]]],[[[74.4,14.32],[74.4,14.32]]],[[[74.37,14.55],[74.37,14.55]]],[[[74.25,14.71],[74.25,14.71]]],[[[74.24,14.71],[74.24,14.71]]],[[[74.16,14.74],[74.16,14.74]]],[[[74.11,14.76],[74.11,14.76]]],[[[74.09,14.8],[74.09,14.8]]],[[[74.06,14.82],[74.06,14.82]]],[[[74.06,14.82],[74.06,14.82]]],[[[74.06,14.82],[74.06,14.82]]],[[[74.09,14.84],[74.09,14.84]]],[[[74.1,14.85],[74.1,14.85]]],[[[74.1,14.88],[74.1,14.88]]],[[[77.34,18.44],[77.65,17.97],[77.44,17.58],[77.69,17.5],[77.24,16.47],[77.59,16.29],[77.51,15.92],[77.02,15.83],[77.16,15.16],[76.77,15.07],[76.76,14.6],[76.94,14.24],[77.5,14.26],[77.4,13.88],[76.89,14.16],[76.99,13.74],[77.98,13.95],[78.58,13.26],[78.45,12.85],[77.59,12.66],[77.66,11.94],[76.84,11.57],[74.87,12.75],[74.09,14.8],[74.34,15.29],[74.1,15.67],[74.5,16.1],[74.28,16.54],[75.67,16.96],[75.64,17.48],[76.38,17.31],[76.33,17.59],[77.34,18.44]]]]}},{"type":"Feature","properties":{"name":"Kerala"},"geometry":{"type":"MultiPolygon","coordinates":[[[[76.47,9.54],[76.47,9.54]]],[[[76.4,9.54],[76.4,9.54]]],[[[76.43,9.55],[76.43,9.55]]],[[[76.44,9.55],[76.44,9.55]]],[[[76.41,9.56],[76.41,9.56]]],[[[76.39,9.62],[76.39,9.62]]],[[[76.38,9.71],[76.38,9.71]]],[[[76.37,9.76],[76.37,9.76]]],[[[76.32,9.83],[76.32,9.83]]],[[[76.37,9.83],[76.37,9.83]]],[[[76.37,9.83],[76.37,9.83]]],[[[76.38,9.84],[76.38,9.84]]],[[[76.38,9.84],[76.38,9.84]]],[[[76.29,9.85],[76.29,9.85]]],[[[76.35,9.87],[76.35,9.87]]],[[[76.31,9.92],[76.31,9.92]]],[[[76.26,9.97],[76.26,9.97]]],[[[76.27,9.97],[76.27,9.97]]],[[[76.24,9.98],[76.24,9.98]]],[[[76.27,10.0],[76.27,10.0]]],[[[76.24,10.01],[76.24,10.01]]],[[[76.25,10.02],[76.25,10.02]]],[[[76.26,10.03],[76.26,10.03]]],[[[76.27,10.03],[76.27,10.03]]],[[[76.24,10.1],[76.24,10.1]]],[[[76.05,10.54],[76.05,10.54]]],[[[76.05,10.54],[76.05,10.54]]],[[[75.84,11.13],[75.84,11.13]]],[[[75.81,11.16],[75.81,11.16]]],[[[75.37,11.94],[75.37,11.94]]],[[[75.37,11.94],[75.37,11.94]]],[[[75.3,11.96],[75.3,11.96]]],[[[75.3,11.97],[75.3,11.97]]],[[[75.29,11.99],[75.29,11.99]]],[[[75.3,12.02],[75.3,12.02]]],[[[75.3,12.02],[75.3,12.02]]],[[[75.16,12.11],[75.16,12.11]]],[[[75.16,12.12],[75.16,12.12]]],[[[75.19,12.12],[75.19,12.12]]],[[[75.15,12.14],[75.15,12.14]]],[[[75.14,12.19],[75.14,12.19]]],[[[75.13,12.19],[75.13,12.19]]],[[[75.13,12.2],[75.13,12.2]]],[[[75.13,12.21],[75.13,12.21]]],[[[75.0,12.79],[76.41,11.75],[76.24,11.46],[76.73,11.21],[76.82,10.3],[77.22,10.34],[77.16,8.31],[76.55,8.9],[75.0,12.79]]]]}},{"type":"Feature","properties":{"name":"Lakshadweep"},"geometry":{"type":"MultiPolygon","coordinates":[[[[73.01,8.28],[73.01,8.28]]],[[[73.08,8.33],[73.08,8.33]]],[[[72.29,10.05],[72.29,10.05]]],[[[73.63,10.07],[73.63,10.07]]],[[[73.63,10.08],[73.63,10.08]]],[[[73.65,10.1],[73.65,10.1]]],[[[72.33,10.14],[72.33,10.14]]],[[[73.66,10.16],[73.66,10.16]]],[[[72.64,10.58],[72.64,10.58]]],[[[72.17,10.81],[72.17,10.81]]],[[[72.17,10.82],[72.17,10.82]]],[[[73.68,10.82],[73.68,10.82]]],[[[72.17,10.82],[72.17,10.82]]],[[[72.29,10.95],[72.29,10.95]]],[[[72.33,10.95],[72.33,10.95]]],[[[72.33,10.96],[72.33,10.96]]],[[[72.73,11.14],[72.73,11.14]]],[[[72.11,11.21],[72.11,11.21]]],[[[72.1,11.22],[72.1,11.22]]],[[[72.79,11.26],[72.79,11.26]]],[[[73.0,11.49],[73.0,11.49]]],[[[73.0,11.5],[73.0,11.5]]],[[[72.19,11.6],[72.19,11.6]]],[[[72.71,11.71],[72.71,11.71]]]]}},{"type":"Feature","properties":{"name":"Madhya Pradesh"},"geometry":{"type":"Polygon","coordinates":[[[78.36,26.87],[78.99,26.68],[79.13,26.34],[78.81,25.62],[78.3,25.37],[78.38,24.27],[78.97,24.35],[78.43,25.29],[78.89,25.56],[78.88,25.16],[79.3,25.34],[79.85,25.1],[80.26,25.43],[80.31,25.0],[80.88,25.2],[80.8,24.94],[81.13,24.89],[81.57,25.2],[82.29,24.61],[82.8,24.6],[82.63,23.84],[81.6,23.89],[81.61,23.51],[82.15,23.14],[81.62,22.54],[81.11,22.44],[80.66,21.34],[79.23,21.72],[77.58,21.36],[77.29,21.76],[76.17,21.08],[76.1,21.37],[75.22,21.41],[74.45,22.03],[74.15,21.95],[74.29,22.39],[74.04,22.54],[74.94,23.63],[74.83,24.97],[75.84,24.73],[75.58,23.8],[76.19,24.33],[76.9,24.13],[76.85,25.01],[77.4,25.11],[77.36,25.41],[76.77,25.31],[76.48,25.72],[78.36,26.87]]]}},{"type":"Feature","properties":{"name":"Maharashtra"},"geometry":{"type":"MultiPolygon","coordinates":[[[[73.46,15.89],[73.46,15.89]]],[[[73.46,15.89],[73.46,15.89]]],[[[73.47,15.9],[73.47,15.9]]],[[[73.46,16.05],[73.46,16.05]]],[[[73.44,16.1],[73.44,16.1]]],[[[73.08,17.82],[73.08,17.82]]],[[[73.04,18.05],[73.04,18.05]]],[[[72.97,18.3],[72.97,18.3]]],[[[73.08,18.31],[73.08,18.31]]],[[[73.08,18.32],[73.08,18.32]]],[[[72.86,18.64],[72.86,18.64]]],[[[72.81,18.71],[72.81,18.71]]],[[[72.84,18.71],[72.84,18.71]]],[[[72.9,18.96],[72.9,18.96]]],[[[72.94,18.97],[72.94,18.97]]],[[[73.03,19.0],[73.03,19.0]]],[[[72.78,19.14],[72.78,19.14]]],[[[72.73,19.47],[72.73,19.47]]],[[[74.44,22.03],[74.59,21.66],[76.1,21.37],[76.28,21.08],[77.29,21.76],[77.58,21.36],[79.23,21.72],[80.26,21.62],[80.67,21.31],[80.39,19.79],[80.89,19.47],[80.48,19.34],[80.11,18.68],[79.79,19.59],[79.18,19.46],[78.31,19.91],[77.57,18.31],[76.95,18.18],[76.38,17.31],[75.64,17.48],[75.67,16.96],[74.27,16.54],[74.36,15.77],[73.68,15.73],[72.65,19.85],[72.87,20.23],[73.43,20.2],[73.46,20.71],[73.95,20.74],[73.59,21.17],[74.34,21.54],[73.86,21.5],[73.81,21.82],[74.44,22.03]]]]}},{"type":"Feature","properties":{"name":"Manipur"},"geometry":{"type":"Polygon","coordinates":[[[94.58,25.65],[94.74,25.03],[94.16,23.85],[92.98,24.11],[93.4,25.26],[94.58,25.65]]]}},{"type":"Feature","properties":{"name":"Meghalaya"},"geometry":{"type":"Polygon","coordinates":[[[91.85,26.1],[92.3,26.08],[92.16,25.67],[92.66,25.59],[92.8,25.22],[92.46,25.04],[89.83,25.3],[90.12,25.96],[91.22,25.72],[91.85,26.1]]]}},{"type":"Feature","properties":{"name":"Mizoram"},"geometry":{"type":"Polygon","coordinates":[[[92.8,24.42],[93.44,23.68],[92.91,21.95],[92.61,21.98],[92.26,23.81],[92.3,24.25],[92.8,24.42]]]}},{"type":"Feature","properties":{"name":"Nagaland"},"geometry":{"type":"Polygon","coordinates":[[[95.21,26.94],[94.9,25.57],[93.84,25.56],[93.51,25.24],[93.33,25.55],[93.98,25.92],[94.28,26.56],[95.21,26.94]]]}},{"type":"Feature","properties":{"name":"Orissa"},"geometry":{"type":"MultiPolygon","coordinates":[[[[84.77,19.11],[84.77,19.11]]],[[[84.76,19.11],[84.76,19.11]]],[[[84.78,19.11],[84.78,19.11]]],[[[86.24,19.91],[86.24,19.91]]],[[[86.37,19.95],[86.37,19.95]]],[[[86.39,19.96],[86.39,19.96]]],[[[86.39,19.97],[86.39,19.97]]],[[[86.37,19.97],[86.37,19.97]]],[[[86.32,19.99],[86.32,19.99]]],[[[86.32,20.0],[86.32,20.0]]],[[[86.34,19.99],[86.34,19.99]]],[[[86.31,20.02],[86.31,20.02]]],[[[86.25,20.03],[86.25,20.03]]],[[[86.41,20.02],[86.41,20.02]]],[[[86.27,20.02],[86.27,20.02]]],[[[86.32,20.03],[86.32,20.03]]],[[[86.32,20.03],[86.32,20.03]]],[[[86.27,20.03],[86.27,20.03]]],[[[86.31,20.04],[86.31,20.04]]],[[[86.3,20.04],[86.3,20.04]]],[[[86.43,20.04],[86.43,20.04]]],[[[86.29,20.05],[86.29,20.05]]],[[[86.27,20.06],[86.27,20.06]]],[[[86.26,20.06],[86.26,20.06]]],[[[86.44,20.06],[86.44,20.06]]],[[[86.49,20.15],[86.49,20.15]]],[[[86.5,20.18],[86.5,20.18]]],[[[86.55,20.21],[86.55,20.21]]],[[[86.79,20.37],[86.79,20.37]]],[[[86.79,20.38],[86.79,20.38]]],[[[86.79,20.38],[86.79,20.38]]],[[[86.8,20.42],[86.8,20.42]]],[[[86.79,20.39],[86.79,20.39]]],[[[86.8,20.46],[86.8,20.46]]],[[[86.81,20.49],[86.81,20.49]]],[[[86.87,20.67],[86.87,20.67]]],[[[86.8,20.69],[86.8,20.69]]],[[[87.0,20.71],[87.0,20.71]]],[[[87.01,20.71],[87.01,20.71]]],[[[87.06,20.74],[87.06,20.74]]],[[[87.07,20.74],[87.07,20.74]]],[[[87.09,20.76],[87.09,20.76]]],[[[86.87,20.77],[86.87,20.77]]],[[[86.88,20.78],[86.88,20.78]]],[[[86.86,20.78],[86.86,20.78]]],[[[86.98,20.78],[86.98,20.78]]],[[[86.95,20.78],[86.95,20.78]]],[[[86.88,20.79],[86.88,20.79]]],[[[87.02,20.8],[87.02,20.8]]],[[[87.12,21.52],[87.12,21.52]]],[[[86.08,22.53],[87.47,21.73],[86.82,21.19],[86.76,20.61],[87.05,20.71],[86.77,20.33],[84.31,18.78],[83.62,19.15],[83.05,18.38],[82.63,18.23],[82.47,18.54],[82.27,17.99],[81.38,17.81],[82.24,18.91],[81.87,20.04],[82.7,19.83],[82.39,20.06],[82.35,20.88],[83.4,21.35],[83.63,22.21],[83.99,22.53],[85.06,22.48],[84.99,22.08],[85.91,21.97],[86.08,22.53]]]]}},{"type":"Feature","properties":{"name":"Puducherry"},"geometry":{"type":"MultiPolygon","coordinates":[[[[79.84,10.83],[79.84,10.83]]],[[[79.75,10.98],[79.75,10.98]]],[[[79.69,12.0],[79.8,11.81],[79.69,12.0]]],[[[75.37,12.15],[75.3,11.95],[75.37,12.15]]],[[[82.27,16.7],[82.27,16.7]]],[[[82.21,16.73],[82.21,16.73]]]]}},{"type":"Feature","properties":{"name":"Punjab"},"geometry":{"type":"Polygon","coordinates":[[[75.87,32.49],[75.58,32.08],[76.17,31.31],[76.63,31.23],[76.93,30.39],[75.22,29.55],[75.08,29.92],[73.89,29.97],[73.87,30.38],[74.69,31.1],[74.6,31.89],[75.87,32.49]]]}},{"type":"Feature","properties":{"name":"Rajasthan"},"geometry":{"type":"Polygon","coordinates":[[[73.89,29.98],[74.52,29.94],[74.6,29.33],[75.4,29.26],[75.56,28.61],[76.09,28.16],[75.96,27.86],[76.9,28.2],[76.9,27.66],[77.3,27.8],[77.76,27.02],[77.45,26.75],[78.26,26.92],[76.48,25.72],[76.77,25.31],[77.36,25.41],[77.4,25.11],[76.85,25.01],[76.9,24.13],[76.19,24.33],[75.58,23.8],[75.84,24.73],[74.85,24.97],[74.94,23.63],[74.32,23.06],[73.63,23.45],[73.09,24.49],[71.12,24.67],[70.67,25.7],[70.1,25.94],[70.17,26.55],[69.48,26.81],[70.37,28.01],[70.88,27.7],[71.9,27.96],[73.39,29.94],[73.97,30.2],[73.89,29.98]]]}},{"type":"Feature","properties":{"name":"Sikkim"},"geometry":{"type":"Polygon","coordinates":[[[88.65,28.1],[88.91,27.28],[88.09,27.14],[88.12,27.95],[88.65,28.1]]]}},{"type":"Feature","properties":{"name":"Tamil Nadu"},"geometry":{"type":"MultiPolygon","coordinates":[[[[77.56,8.08],[77.56,8.08]]],[[[78.12,8.62],[78.12,8.62]]],[[[78.12,8.62],[78.12,8.62]]],[[[78.12,8.64],[78.12,8.64]]],[[[78.13,8.65],[78.13,8.65]]],[[[78.12,8.66],[78.12,8.66]]],[[[78.21,8.84],[78.21,8.84]]],[[[78.22,8.87],[78.22,8.87]]],[[[78.25,8.96],[78.25,8.96]]],[[[78.49,9.09],[78.49,9.09]]],[[[78.54,9.11],[78.54,9.11]]],[[[78.58,9.11],[78.58,9.11]]],[[[78.49,9.13],[78.49,9.13]]],[[[78.7,9.16],[78.7,9.16]]],[[[78.73,9.16],[78.73,9.16]]],[[[78.83,9.17],[78.83,9.17]]],[[[78.94,9.18],[78.94,9.18]]],[[[78.97,9.19],[78.97,9.19]]],[[[79.07,9.21],[79.07,9.21]]],[[[79.14,9.21],[79.14,9.21]]],[[[79.13,9.22],[79.13,9.22]]],[[[79.23,9.24],[79.23,9.24]]],[[[79.18,9.25],[79.18,9.25]]],[[[79.22,9.25],[79.22,9.25]]],[[[79.31,9.33],[79.44,9.16],[79.31,9.33]]],[[[79.53,9.38],[79.53,9.38]]],[[[79.53,9.39],[79.53,9.39]]],[[[79.53,9.39],[79.53,9.39]]],[[[79.53,9.39],[79.53,9.39]]],[[[79.53,9.39],[79.53,9.39]]],[[[79.53,9.39],[79.53,9.39]]],[[[79.53,9.39],[79.53,9.39]]],[[[79.53,9.39],[79.53,9.39]]],[[[79.71,10.29],[79.71,10.29]]],[[[79.7,10.29],[79.7,10.29]]],[[[79.7,10.29],[79.7,10.29]]],[[[79.69,10.3],[79.69,10.3]]],[[[79.69,10.3],[79.69,10.3]]],[[[79.62,10.3],[79.62,10.3]]],[[[79.61,10.3],[79.61,10.3]]],[[[79.62,10.31],[79.62,10.31]]],[[[79.62,10.31],[79.62,10.31]]],[[[79.63,10.31],[79.63,10.31]]],[[[79.7,10.31],[79.7,10.31]]],[[[79.68,10.31],[79.68,10.31]]],[[[79.69,10.31],[79.69,10.31]]],[[[79.61,10.31],[79.61,10.31]]],[[[79.7,10.32],[79.7,10.32]]],[[[79.63,10.33],[79.63,10.33]]],[[[79.63,10.34],[79.63,10.34]]],[[[79.84,11.24],[79.84,11.24]]],[[[79.83,11.24],[79.83,11.24]]],[[[79.99,12.25],[79.99,12.25]]],[[[80.32,13.44],[80.32,13.44]]],[[[80.08,13.53],[80.33,13.44],[80.25,12.78],[79.64,11.98],[79.88,10.3],[79.29,10.26],[78.9,9.49],[79.19,9.28],[78.37,9.09],[78.07,8.37],[77.32,8.12],[77.09,8.3],[77.28,10.21],[76.82,10.3],[76.73,11.21],[76.23,11.56],[77.66,11.94],[77.46,12.24],[77.83,12.86],[78.45,12.61],[78.7,13.06],[79.74,13.19],[80.08,13.53]]]]}},{"type":"Feature","properties":{"name":"Tripura"},"geometry":{"type":"Polygon","coordinates":[[[92.19,24.52],[92.32,23.87],[91.96,23.73],[91.62,22.94],[91.16,23.74],[92.19,24.52]]]}},{"type":"Feature","properties":{"name":"Uttar Pradesh"},"geometry":{"type":"Polygon","coordinates":[[[77.58,30.41],[77.93,30.25],[77.7,29.87],[77.99,29.55],[78.41,29.77],[79.41,28.86],[80.57,28.69],[82.74,27.5],[83.92,27.33],[84.41,26.63],[83.9,26.52],[84.17,26.37],[84.0,26.18],[84.63,25.73],[84.09,25.72],[83.34,25.18],[83.54,24.62],[83.19,23.92],[82.66,24.12],[82.76,24.65],[82.29,24.61],[81.57,25.2],[81.13,24.89],[80.8,24.94],[80.88,25.2],[80.28,25.02],[80.26,25.43],[79.86,25.1],[79.29,25.34],[79.13,25.11],[78.78,25.3],[78.93,25.56],[78.43,25.29],[78.97,24.35],[78.34,24.31],[78.3,25.37],[78.81,25.62],[79.13,26.44],[78.22,26.95],[77.43,26.77],[77.76,27.02],[77.31,27.61],[77.54,28.25],[77.09,29.6],[77.58,30.41]]]}},{"type":"Feature","properties":{"name":"Uttaranchal"},"geometry":{"type":"Polygon","coordinates":[[[79.19,31.35],[81.02,30.25],[80.37,29.75],[79.99,28.72],[78.9,29.15],[78.47,29.75],[77.99,29.55],[77.7,29.87],[77.93,30.25],[77.56,30.42],[77.89,31.15],[78.94,31.11],[79.19,31.35]]]}},{"type":"Feature","properties":{"name":"West Bengal"},"geometry":{"type":"MultiPolygon","coordinates":[[[[88.02,21.57],[88.02,21.57]]],[[[88.5,21.6],[88.5,21.6]]],[[[88.18,21.6],[88.18,21.6]]],[[[88.83,21.61],[88.83,21.61]]],[[[88.73,21.64],[88.73,21.64]]],[[[88.54,21.64],[88.54,21.64]]],[[[88.89,21.65],[88.89,21.65]]],[[[88.77,21.65],[88.77,21.65]]],[[[88.97,21.64],[88.97,21.64]]],[[[88.63,21.66],[88.63,21.66]]],[[[88.58,21.69],[88.58,21.69]]],[[[88.59,21.69],[88.59,21.69]]],[[[88.98,21.71],[88.98,21.71]]],[[[88.81,21.71],[88.81,21.71]]],[[[88.31,21.71],[88.31,21.71]]],[[[88.45,21.71],[88.45,21.71]]],[[[88.7,21.71],[88.7,21.71]]],[[[88.2,21.72],[88.2,21.72]]],[[[89.06,21.72],[89.06,21.72]]],[[[88.98,21.73],[88.98,21.73]]],[[[88.55,21.74],[88.55,21.74]]],[[[88.2,21.72],[88.2,21.72]]],[[[88.88,21.75],[88.88,21.75]]],[[[88.41,21.73],[88.41,21.73]]],[[[88.22,21.76],[88.29,21.56],[88.22,21.76]]],[[[88.93,21.76],[88.93,21.76]]],[[[88.37,21.76],[88.37,21.76]]],[[[89.01,21.76],[89.01,21.76]]],[[[88.83,21.77],[88.83,21.77]]],[[[88.38,21.76],[88.38,21.76]]],[[[88.2,21.77],[88.2,21.77]]],[[[88.28,21.77],[88.28,21.77]]],[[[88.58,21.78],[88.58,21.78]]],[[[88.3,21.72],[88.3,21.72]]],[[[88.51,21.78],[88.51,21.78]]],[[[89.0,21.79],[89.0,21.79]]],[[[88.61,21.79],[88.61,21.79]]],[[[88.27,21.79],[88.27,21.79]]],[[[88.18,21.79],[88.18,21.79]]],[[[88.46,21.79],[88.46,21.79]]],[[[88.72,21.81],[88.72,21.81]]],[[[88.17,21.81],[88.17,21.81]]],[[[88.54,21.81],[88.54,21.81]]],[[[88.42,21.81],[88.42,21.81]]],[[[89.0,21.81],[89.0,21.81]]],[[[88.75,21.8],[88.75,21.8]]],[[[88.83,21.8],[88.83,21.8]]],[[[88.79,21.75],[88.79,21.75]]],[[[88.92,21.83],[88.92,21.83]]],[[[88.18,21.83],[88.18,21.83]]],[[[88.56,21.83],[88.56,21.83]]],[[[88.48,21.83],[88.48,21.83]]],[[[88.94,21.85],[88.94,21.85]]],[[[88.59,21.85],[88.59,21.85]]],[[[88.52,21.85],[88.52,21.85]]],[[[88.54,21.85],[88.54,21.85]]],[[[88.33,21.86],[88.33,21.86]]],[[[88.86,21.87],[88.86,21.87]]],[[[88.58,21.87],[88.58,21.87]]],[[[88.14,21.88],[88.11,21.63],[88.14,21.88]]],[[[88.79,21.88],[88.79,21.88]]],[[[88.98,21.89],[88.98,21.89]]],[[[88.62,21.9],[88.62,21.9]]],[[[88.14,21.9],[88.14,21.9]]],[[[88.82,21.9],[88.82,21.9]]],[[[88.56,21.9],[88.56,21.9]]],[[[88.43,21.9],[88.43,21.9]]],[[[88.45,21.9],[88.45,21.9]]],[[[88.72,21.91],[88.72,21.91]]],[[[88.11,21.89],[88.11,21.89]]],[[[88.5,21.91],[88.5,21.91]]],[[[88.45,21.91],[88.45,21.91]]],[[[88.64,21.92],[88.64,21.92]]],[[[88.13,21.93],[88.13,21.93]]],[[[88.84,21.92],[88.84,21.92]]],[[[88.72,21.93],[88.72,21.93]]],[[[88.16,21.94],[88.16,21.94]]],[[[88.75,21.98],[88.75,21.98]]],[[[88.76,22.0],[88.76,22.0]]],[[[88.66,22.02],[88.66,22.02]]],[[[88.14,22.03],[88.14,22.03]]],[[[88.81,22.02],[88.81,22.02]]],[[[88.73,22.05],[88.73,22.05]]],[[[88.76,22.05],[88.76,22.05]]],[[[88.9,22.05],[88.9,22.05]]],[[[88.03,22.06],[88.03,22.06]]],[[[89.02,22.05],[89.02,22.05]]],[[[88.64,22.05],[88.64,22.05]]],[[[88.81,22.06],[88.81,22.06]]],[[[88.87,22.08],[88.87,22.08]]],[[[88.69,22.08],[88.69,22.08]]],[[[88.9,22.08],[88.9,22.08]]],[[[88.72,22.1],[88.72,22.1]]],[[[88.8,22.09],[88.8,22.09]]],[[[88.82,22.12],[88.82,22.12]]],[[[88.73,22.11],[88.73,22.11]]],[[[88.87,22.17],[88.87,22.17]]],[[[88.95,22.19],[89.01,21.9],[88.95,22.19]]],[[[89.0,22.2],[89.0,22.2]]],[[[88.7,22.21],[88.72,22.01],[88.7,22.21]]],[[[88.84,22.19],[88.84,22.19]]],[[[87.99,22.22],[87.99,22.22]]],[[[88.93,22.23],[88.93,22.23]]],[[[88.81,22.28],[88.81,22.28]]],[[[88.85,22.36],[88.92,22.17],[88.85,22.36]]],[[[88.98,22.38],[89.06,22.13],[88.98,22.38]]],[[[87.94,22.4],[87.94,22.4]]],[[[88.86,22.4],[88.86,22.4]]],[[[88.87,22.41],[88.87,22.41]]],[[[88.92,22.43],[88.92,22.43]]],[[[87.93,22.42],[87.93,22.42]]],[[[87.91,22.43],[87.91,22.43]]],[[[88.86,22.47],[88.86,22.47]]],[[[88.78,22.5],[88.78,22.5]]],[[[88.9,22.55],[88.9,22.55]]],[[[88.93,22.56],[88.93,22.56]]],[[[88.92,22.57],[88.94,22.31],[88.92,22.57]]],[[[88.94,22.62],[88.94,22.62]]],[[[88.68,24.32],[88.68,24.32]]],[[[88.13,27.12],[88.8,27.14],[89.86,26.7],[89.87,26.45],[89.55,25.96],[88.38,26.59],[88.52,26.36],[88.12,25.8],[89.01,25.29],[88.45,25.2],[88.01,24.67],[88.73,24.28],[88.56,23.64],[88.99,23.21],[88.96,22.61],[88.68,22.59],[88.88,22.36],[88.27,21.73],[87.88,22.44],[88.19,22.1],[87.48,21.61],[86.72,22.14],[86.54,22.99],[85.83,23.26],[87.69,24.15],[87.97,24.9],[87.76,25.41],[88.07,25.5],[87.8,25.92],[88.29,26.35],[88.13,27.12]]]]}}]}

  var PRESETS = {
    hp: {
      states: ['Himachal Pradesh'],
      label:  'Himachal Pradesh',
      hubs: [
        {name:'Bilaspur',   lat:31.33, lng:76.75, type:'hub'},
        {name:'Shimla',     lat:31.10, lng:77.17, type:'spoke'},
        {name:'Dharamshala',lat:32.22, lng:76.32, type:'spoke'},
        {name:'Mandi',      lat:31.71, lng:76.93, type:'spoke'},
        {name:'Solan',      lat:30.91, lng:77.09, type:'spoke'}
      ]
    },
    ne_india: {
      states: ['Arunachal Pradesh','Assam','Manipur','Meghalaya',
               'Mizoram','Nagaland','Sikkim','Tripura'],
      label:  'North East India',
      hubs: [
        {name:'Guwahati',  lat:26.14, lng:91.74, type:'hub'},
        {name:'Imphal',    lat:24.82, lng:93.94, type:'spoke'},
        {name:'Shillong',  lat:25.57, lng:91.88, type:'spoke'},
        {name:'Aizawl',    lat:23.73, lng:92.72, type:'spoke'},
        {name:'Kohima',    lat:25.67, lng:94.11, type:'spoke'},
        {name:'Agartala',  lat:23.83, lng:91.28, type:'spoke'},
        {name:'Itanagar',  lat:27.09, lng:93.62, type:'spoke'},
        {name:'Gangtok',   lat:27.33, lng:88.61, type:'spoke'}
      ]
    },
    all_india: {
      states: [],
      label:  'All India',
      hubs: [
        {name:'New Delhi', lat:28.61, lng:77.21, type:'hub'},
        {name:'Mumbai',    lat:19.08, lng:72.88, type:'spoke'},
        {name:'Hyderabad', lat:17.38, lng:78.49, type:'spoke'},
        {name:'Bengaluru', lat:12.97, lng:77.59, type:'spoke'},
        {name:'Chennai',   lat:13.08, lng:80.27, type:'spoke'}
      ]
    }
  }

  // Mercator-like projection: India bbox lng 67-98, lat 6-38
  var _LNG_MIN=67, _LNG_MAX=98, _LAT_MIN=6, _LAT_MAX=38
  var _W=500, _H=580

  function _proj(lng, lat) {
    return [
      (_W * (lng - _LNG_MIN) / (_LNG_MAX - _LNG_MIN)),
      (_H * (_LAT_MAX - lat) / (_LAT_MAX - _LAT_MIN))
    ]
  }

  function _ringToPath(coords) {
    if (!coords || coords.length < 2) return ''
    var d = 'M'
    coords.forEach(function(c, i) {
      var p = _proj(c[0], c[1])
      d += (i===0?'':' L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)
    })
    return d + ' Z'
  }

  function _geomToPath(geom) {
    if (!geom) return ''
    if (geom.type === 'Polygon') {
      return geom.coordinates.map(_ringToPath).join(' ')
    }
    if (geom.type === 'MultiPolygon') {
      return geom.coordinates.map(function(poly) {
        return poly.map(_ringToPath).join(' ')
      }).join(' ')
    }
    return ''
  }

  function _centroid(geom) {
    // Approximate centroid from bounding box
    var lngs=[], lats=[]
    function collect(coords) {
      coords.forEach(function(c) {
        if (Array.isArray(c[0])) collect(c)
        else { lngs.push(c[0]); lats.push(c[1]) }
      })
    }
    if (geom.type==='Polygon') collect(geom.coordinates)
    else if (geom.type==='MultiPolygon') geom.coordinates.forEach(function(p){collect(p)})
    if (!lngs.length) return [_W/2,_H/2]
    var avgLng = lngs.reduce(function(a,b){return a+b},0)/lngs.length
    var avgLat = lats.reduce(function(a,b){return a+b},0)/lats.length
    return _proj(avgLng, avgLat)
  }

  function renderSVG(preset, opts) {
    opts = opts || {}
    var w = opts.width  || 340
    var h = opts.height || 395

    var territory = typeof preset === 'string' ? PRESETS[preset] : preset
    var highlighted = territory ? (territory.states || []) : []
    var hubs        = territory ? (territory.hubs || []) : []
    var allIndia    = highlighted.length === 0

    var svg = '<svg viewBox="0 0 ' + _W + ' ' + _H + '" '
      + 'xmlns="http://www.w3.org/2000/svg" '
      + 'width="' + w + '" height="' + h + '" '
      + 'style="background:' + C.bg + ';font-family:Roboto,sans-serif">'
      + '<rect width="' + _W + '" height="' + _H + '" fill="' + C.bg + '"/>'

    // Draw state paths
    INDIA_GEOJSON.features.forEach(function(f) {
      var name = f.properties.name
      var isH  = allIndia || highlighted.indexOf(name) >= 0
      var path = _geomToPath(f.geometry)
      if (!path) return
      svg += '<path d="' + path + '" '
        + 'fill="' + (isH ? C.highlight : C.india) + '" '
        + 'fill-opacity="' + (isH ? '0.75' : '1') + '" '
        + 'stroke="' + (isH ? C.highlightB : C.indiaBdr) + '" '
        + 'stroke-width="' + (isH ? 1.5 : 0.6) + '" '
        + 'stroke-linejoin="round"/>'
    })

    // State labels for highlighted states (not all-India)
    if (!allIndia && highlighted.length <= 8) {
      INDIA_GEOJSON.features.forEach(function(f) {
        var name = f.properties.name
        if (highlighted.indexOf(name) < 0) return
        var cen = _centroid(f.geometry)
        var short = name.length > 12
          ? name.split(' ').map(function(w){return w[0]}).join('').toUpperCase()
          : name
        svg += '<text x="' + cen[0] + '" y="' + cen[1] + '" '
          + 'font-size="10" fill="' + C.label + '" font-weight="700" '
          + 'text-anchor="middle" dominant-baseline="middle" '
          + 'style="pointer-events:none">' + short + '</text>'
      })
    }

    // Hub and spoke dots
    hubs.forEach(function(hub) {
      var p   = _proj(hub.lng, hub.lat)
      var r   = hub.type === 'hub' ? 7 : 4
      var col = hub.type === 'hub' ? C.hub : hub.type === 'edge' ? C.edge : C.spoke
      svg += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" '
        + 'r="' + r + '" fill="' + col + '" opacity="0.9"/>'
      if (hub.type === 'hub') {
        svg += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" '
          + 'r="' + (r+4) + '" fill="none" stroke="' + col + '" stroke-width="1.5" opacity="0.35"/>'
      }
      // Label offset right
      svg += '<text x="' + (p[0]+r+4).toFixed(1) + '" y="' + (p[1]+3).toFixed(1) + '" '
        + 'font-size="' + (hub.type==='hub'?10:8) + '" '
        + 'fill="' + C.city + '" font-weight="' + (hub.type==='hub'?700:400) + '">'
        + hub.name + '</text>'
    })

    // INDIA watermark
    svg += '<text x="' + (_W/2) + '" y="' + (_H-18) + '" '
      + 'font-size="22" fill="#9CA3AF" opacity="0.35" '
      + 'text-anchor="middle" letter-spacing="6" font-weight="300">INDIA</text>'

    svg += '</svg>'
    return svg
  }

  function renderToElement(elementId, preset, opts) {
    var el = document.getElementById(elementId)
    if (el) el.innerHTML = renderSVG(preset, opts)
  }

  function renderDataUrl(preset, opts) {
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(renderSVG(preset, opts))))
  }

  function buildMapPromptContext(territory) {
    if (!territory) return ''
    var p = typeof territory === 'string' ? PRESETS[territory] : territory
    if (!p) return ''
    var stateList = p.states && p.states.length ? p.states.join(', ') : 'all of India'
    var hubNames  = (p.hubs||[]).filter(function(h){return h.type==='hub'}).map(function(h){return h.name}).join(', ')
    return 'Geographic context: This engagement covers ' + stateList
      + (hubNames ? '. Key hub location: ' + hubNames : '') + '. '
      + 'Subtly incorporate an abstract outline or silhouette of this Indian region '
      + 'as a background element -- geometric suggestion, not a literal map.'
  }

  function renderTerritoryCard(eng) {
    var hasTerritory = eng && eng.territory_states && eng.territory_states.length > 0
    var preset = eng ? eng._territoryPreset : null

    return '<div class="card" style="margin-bottom:12px">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">'
      + '<div class="card-title" style="margin-bottom:0">Territory</div>'
      + (hasTerritory
          ? '<span style="font-size:10px;padding:2px 7px;border-radius:10px;background:#E1F5EE;color:#085041;font-weight:700">Set</span>'
          : '<span style="font-size:10px;padding:2px 7px;border-radius:10px;background:var(--light);color:var(--mid)">Not set</span>')
      + '</div>'
      + '<div style="font-size:12px;color:var(--mid);margin-bottom:10px">Highlights states on territory maps in all generated documents.</div>'
      + '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">'
      + '<button onclick="setEngTerritory(\'hp\')" class="btn btn-sm" style="' + (preset==='hp'?'background:var(--teal);color:#fff;border-color:var(--teal)':'') + '">&#127965; Himachal Pradesh</button>'
      + '<button onclick="setEngTerritory(\'ne_india\')" class="btn btn-sm" style="' + (preset==='ne_india'?'background:var(--teal);color:#fff;border-color:var(--teal)':'') + '">&#127963; NE India (8 states)</button>'
      + '<button onclick="setEngTerritory(\'all_india\')" class="btn btn-sm" style="' + (preset==='all_india'?'background:var(--teal);color:#fff;border-color:var(--teal)':'') + '">&#127758; All India</button>'
      + '<button onclick="setEngTerritory(null)" class="btn btn-sm btn-ghost">&#215; Clear</button>'
      + '</div>'
      + (hasTerritory || preset === 'all_india'
          ? '<div style="border:1px solid var(--border);border-radius:6px;overflow:hidden;background:#FAFAFA;display:inline-block">'
            + renderSVG(preset || {states: eng.territory_states, hubs: eng.territory_hubs||[]}, {width:260, height:302})
            + '</div>'
          : '<div style="font-size:12px;color:var(--mid);font-style:italic">Select a territory above to preview</div>')
      + '</div>'
  }

  return {
    renderSVG:             renderSVG,
    renderToElement:       renderToElement,
    renderDataUrl:         renderDataUrl,
    buildMapPromptContext: buildMapPromptContext,
    renderTerritoryCard:   renderTerritoryCard,
    PRESETS:               PRESETS
  }
})()

// Global docket handler
async function setEngTerritory(presetKey) {
  if (!CURRENT_ENG) return
  var sb = getSB(); if (!sb.url) return
  var preset = presetKey ? atlasMap.PRESETS[presetKey] : null
  await fetch(sb.url + '/rest/v1/engagements?id=eq.' + CURRENT_ENG.id, {
    method: 'PATCH',
    headers: {apikey:sb.key, Authorization:'Bearer '+sb.key, 'Content-Type':'application/json', Prefer:'return=minimal'},
    body: JSON.stringify({
      territory_states: preset ? preset.states : null,
      territory_hubs:   preset ? preset.hubs   : null,
      updated_at: new Date().toISOString()
    })
  })
  CURRENT_ENG.territory_states = preset ? preset.states : null
  CURRENT_ENG.territory_hubs   = preset ? preset.hubs   : null
  CURRENT_ENG._territoryPreset = presetKey
  renderDocket()
}
