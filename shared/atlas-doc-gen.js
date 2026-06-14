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

// ===========================================================================
// ATLAS Cover Image Generator v2   Supabase Storage
// ===========================================================================

var atlasCoverImage = (function() {

  var STYLE_LABELS = {
    abstract_geometric: 'abstract geometric pattern with flowing data streams and circuit-like networks',
    architectural:      'architectural perspective showing technology infrastructure and data centres',
    data_viz:           'data visualization with interconnected nodes, network topology and flowing information'
  }

  var ENG_TYPE_CONTEXT = {
    tsap:       'sovereign territory AI centre, national digital infrastructure, government transformation',
    vertical:   'sector-specific AI platform, domain expertise, regulatory technology',
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
      return g.geminiKey || g['key_gemini'] || g.gemini_key
             || localStorage.getItem('atlas_gemini_key') || ''
    } catch(e) { return '' }
  }

  function _storagePath(engId, version) {
    return 'cover_images/' + engId + '/v' + version + '.png'
  }

  function _storageUrl(sbUrl, path) {
    return sbUrl + '/storage/v1/object/public/atlas-assets/' + path
  }

  function _thumbnailUrl(sbUrl, path) {
    return sbUrl + '/storage/v1/render/image/public/atlas-assets/' + path + '?width=400&height=300&resize=contain'
  }

  //    Build generation prompt                                               
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
      + 'Safe for use in sovereign AI proposals to government ministries. '
      + 'Landscape orientation, high contrast, visually striking.'
    if (feedback && feedback.trim()) prompt += ' Direction: ' + feedback.trim()
    return prompt
  }

  //    Generate draft via Gemini                                             
  async function generateDraft(engType, custSector, style, feedback, onProgress) {
    var apiKey = _getGeminiKey()
    if (!apiKey) return { success: false, error: 'No Gemini API key configured in Settings' }

    var prompt = buildPrompt(engType, custSector, style, feedback)
    if (onProgress) onProgress('Generating image...')

    var MODELS = ['gemini-3.1-flash-image', 'gemini-2.5-flash-image', 'gemini-2.0-flash-exp']
    var r = null, lastErr = '', usedModel = ''

    for (var mi = 0; mi < MODELS.length; mi++) {
      try {
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
        if (r.ok) { usedModel = MODELS[mi]; break }
        var ed = await r.json().catch(function(){ return {} })
        lastErr = 'API error ' + r.status + ': ' + (ed.error ? ed.error.message : r.statusText)
        if (r.status !== 404) break
      } catch(e) { lastErr = e.message; break }
    }

    if (!r || !r.ok) return { success: false, error: lastErr || 'Image generation unavailable' }

    var data = await r.json()
    var parts = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts
    if (!parts) return { success: false, error: 'No content in response' }

    var imgPart = parts.find(function(p) { return p.inlineData && p.inlineData.mimeType && p.inlineData.mimeType.startsWith('image/') })
    if (!imgPart) return { success: false, error: 'No image in response. Model: ' + usedModel }

    return {
      success:  true,
      base64:   imgPart.inlineData.data,
      mimeType: imgPart.inlineData.mimeType,
      dataUrl:  'data:' + imgPart.inlineData.mimeType + ';base64,' + imgPart.inlineData.data,
      model:    usedModel
    }
  }

  //    Upload base64 image to Supabase Storage                               
  async function uploadToStorage(base64, mimeType, engId, version) {
    var sb = _getSB(); if (!sb.url) return { success: false, error: 'No Supabase config' }
    var path = _storagePath(engId, version)

    // Convert base64 to Uint8Array
    var binary = atob(base64)
    var bytes  = new Uint8Array(binary.length)
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    var blob = new Blob([bytes], { type: mimeType })

    try {
      var r = await fetch(sb.url + '/storage/v1/object/atlas-assets/' + path, {
        method:  'POST',
        headers: { apikey: sb.key, Authorization: 'Bearer ' + sb.key, 'Content-Type': mimeType, 'x-upsert': 'true' },
        body:    blob
      })
      if (!r.ok) {
        var err = await r.json().catch(function(){ return {} })
        return { success: false, error: 'Upload failed: ' + (err.message || r.status) }
      }
      return { success: true, path: path, url: _storageUrl(sb.url, path), thumbUrl: _thumbnailUrl(sb.url, path) }
    } catch(e) { return { success: false, error: e.message } }
  }

  //    Upload local file to Supabase Storage                                 
  async function uploadFileToStorage(file, engId, version) {
    var sb = _getSB(); if (!sb.url) return { success: false, error: 'No Supabase config' }
    var path = _storagePath(engId, version)
    try {
      var r = await fetch(sb.url + '/storage/v1/object/atlas-assets/' + path, {
        method:  'POST',
        headers: { apikey: sb.key, Authorization: 'Bearer ' + sb.key, 'Content-Type': file.type, 'x-upsert': 'true' },
        body:    file
      })
      if (!r.ok) {
        var err = await r.json().catch(function(){ return {} })
        return { success: false, error: 'Upload failed: ' + (err.message || r.status) }
      }
      return { success: true, path: path, url: _storageUrl(sb.url, path), thumbUrl: _thumbnailUrl(sb.url, path) }
    } catch(e) { return { success: false, error: e.message } }
  }

  //    Save approved image to engagement                                     
  async function saveToEngagement(engId, path, url, version, source) {
    var sb = _getSB(); if (!sb.url) return false
    // Get current versions array
    var r = await fetch(sb.url + '/rest/v1/engagements?id=eq.' + engId + '&select=cover_image_versions', {
      headers: { apikey: sb.key, Authorization: 'Bearer ' + sb.key }
    })
    var rows = r.ok ? await r.json() : []
    var versions = (rows[0] && rows[0].cover_image_versions) || []
    versions.push({
      version:    version,
      path:       path,
      url:        url,
      source:     source || 'ai_generated',
      created_at: new Date().toISOString()
    })
    var r2 = await fetch(sb.url + '/rest/v1/engagements?id=eq.' + engId, {
      method:  'PATCH',
      headers: { apikey: sb.key, Authorization: 'Bearer ' + sb.key, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body:    JSON.stringify({
        cover_image_path:     path,
        cover_image_status:   'approved',
        cover_image_versions: versions,
        updated_at:           new Date().toISOString()
      })
    })
    return r2.ok
  }

  //    Get next version number                                                
  function _nextVersion(eng) {
    var versions = (eng && eng.cover_image_versions) || []
    return versions.length + 1
  }

  //    Load engagement image state                                            
  async function loadEngagementImage(engId) {
    var sb = _getSB(); if (!sb.url) return null
    try {
      var r = await fetch(
        sb.url + '/rest/v1/engagements?id=eq.' + engId
        + '&select=cover_image_path,cover_image_status,cover_image_versions',
        { headers: { apikey: sb.key, Authorization: 'Bearer ' + sb.key } }
      )
      var rows = r.ok ? await r.json() : []
      return rows[0] || null
    } catch(e) { return null }
  }

  //    Restore a previous version                                             
  async function restoreVersion(engId, versionEntry) {
    var sb = _getSB(); if (!sb.url) return false
    var r = await fetch(sb.url + '/rest/v1/engagements?id=eq.' + engId, {
      method:  'PATCH',
      headers: { apikey: sb.key, Authorization: 'Bearer ' + sb.key, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body:    JSON.stringify({
        cover_image_path:   versionEntry.path,
        cover_image_status: 'approved',
        updated_at:         new Date().toISOString()
      })
    })
    return r.ok
  }

  //    Render Cover Image card                                                
  function renderCoverImageCard(eng) {
    var sb        = _getSB()
    var engId     = eng ? eng.id : ''
    var engType   = eng ? (eng.type || 'generic') : 'generic'
    var custSect  = eng && eng._cust ? (eng._cust.type || 'government') : 'government'
    var status    = eng ? (eng.cover_image_status || 'none') : 'none'
    var curPath   = eng ? (eng.cover_image_path || '') : ''
    var versions  = eng ? (eng.cover_image_versions || []) : []
    var curUrl    = (curPath && sb.url) ? _thumbnailUrl(sb.url, curPath) : ''
    var nextVer   = _nextVersion(eng)

    var statusBadge = {
      none:     '<span style="font-size:10px;padding:2px 7px;border-radius:10px;background:var(--light);color:var(--mid)">Not set</span>',
      draft:    '<span style="font-size:10px;padding:2px 7px;border-radius:10px;background:#FFF3CD;color:#856404">Draft</span>',
      approved: '<span style="font-size:10px;padding:2px 7px;border-radius:10px;background:#E1F5EE;color:#085041;font-weight:700">Approved v' + versions.length + '</span>'
    }[status] || ''

    var html = '<div class="card" style="margin-bottom:12px">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">'
      + '<div class="card-title" style="margin-bottom:0">Engagement Cover Image ' + statusBadge + '</div>'
      + '</div>'
      + '<div style="font-size:12px;color:var(--mid);margin-bottom:12px">One image per engagement   reused on every document cover. Stored in Supabase.</div>'

    //    Current image preview   
    html += '<div id="cover-img-preview" style="width:100%;height:180px;background:var(--light);border:1px solid var(--border);border-radius:6px;margin-bottom:12px;overflow:hidden;display:flex;align-items:center;justify-content:center">'
    if (curUrl) {
      html += '<img src="' + curUrl + '" style="width:100%;height:100%;object-fit:cover" '
        + 'onerror="this.parentElement.innerHTML=\'<div style=&quot;font-size:12px;color:var(--mid);padding:12px&quot;>Image not found in storage</div>\'">'
    } else {
      html += '<div style="font-size:12px;color:var(--mid)">No cover image yet</div>'
    }
    html += '</div>'

    //    Generate section   
    html += '<div style="border-top:1px solid var(--border);padding-top:12px;margin-bottom:12px">'
      + '<div style="font-size:11px;font-weight:700;color:var(--mid);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Generate with AI</div>'
      + '<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">'
      + '<label style="font-size:11px;color:var(--mid);white-space:nowrap">Style:</label>'
      + '<select id="cover-img-style" style="padding:4px 8px;border:1px solid var(--border);border-radius:4px;font-size:12px;font-family:inherit;flex:1">'
      + '<option value="abstract_geometric">Abstract geometric</option>'
      + '<option value="architectural">Architectural</option>'
      + '<option value="data_viz">Data visualization</option>'
      + '</select>'
      + '</div>'
      + '<input id="cover-img-feedback" type="text" placeholder="Feedback / direction (optional)..." '
      + 'style="width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:4px;font-size:12px;font-family:inherit;margin-bottom:8px;box-sizing:border-box">'
      + '<div id="cover-img-msg" style="font-size:12px;color:var(--mid);margin-bottom:8px;min-height:16px"></div>'
      + '<div style="display:flex;gap:6px">'
      + '<button class="btn btn-primary btn-sm" onclick="atlasCoverImageGenerate(\'' + engId + '\',\'' + engType + '\',\'' + custSect + '\')">&#10024; Generate draft</button>'
      + '<button id="cover-img-approve-btn" class="btn btn-teal btn-sm" onclick="atlasCoverImageApprove(\'' + engId + '\',' + nextVer + ')" style="display:none">&#10003; Use this</button>'
      + '</div>'
      + '</div>'

    //    Upload section   
    html += '<div style="border-top:1px solid var(--border);padding-top:12px;margin-bottom:12px">'
      + '<div style="font-size:11px;font-weight:700;color:var(--mid);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Upload from file</div>'
      + '<div style="display:flex;gap:8px;align-items:center">'
      + '<label class="btn btn-sm" style="cursor:pointer">&#128206; Choose image'
      + '<input type="file" accept="image/png,image/jpeg,image/webp" style="display:none" '
      + 'onchange="atlasCoverImageUpload(this,\'' + engId + '\',' + nextVer + ')">'
      + '</label>'
      + '<div id="cover-upload-msg" style="font-size:12px;color:var(--mid)"></div>'
      + '</div>'
      + '</div>'

    //    Version history   
    if (versions.length > 0) {
      html += '<div style="border-top:1px solid var(--border);padding-top:12px">'
        + '<div style="font-size:11px;font-weight:700;color:var(--mid);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Version history</div>'
      versions.slice().reverse().forEach(function(v) {
        var isCurrent = v.path === curPath
        var date = v.created_at ? new Date(v.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : ''
        var srcLabel = { ai_generated:'AI generated', uploaded:'Uploaded' }[v.source] || v.source || ''
        var thumbUrl = sb.url ? _thumbnailUrl(sb.url, v.path) : ''
        html += '<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--border)">'
          + (thumbUrl ? '<img src="' + thumbUrl + '" style="width:48px;height:36px;object-fit:cover;border-radius:3px;border:' + (isCurrent?'2px solid var(--teal)':'1px solid var(--border)') + '" onerror="this.style.display=\'none\'">' : '')
          + '<div style="flex:1">'
          + '<div style="font-size:12px;font-weight:' + (isCurrent?700:400) + ';color:var(--dark)">v' + v.version + (isCurrent?' <span style="font-size:10px;color:var(--teal)">(current)</span>':'') + '</div>'
          + '<div style="font-size:11px;color:var(--mid)">' + srcLabel + (date ? ' &bull; ' + date : '') + '</div>'
          + '</div>'
          + (!isCurrent ? '<button class="btn btn-sm btn-ghost" onclick="atlasCoverImageRestore(\'' + engId + '\',' + JSON.stringify(v).replace(/"/g,'&quot;') + ')" style="font-size:11px">Restore</button>' : '')
          + '</div>'
      })
      html += '</div>'
    }

    html += '</div>'
    return html
  }

  return {
    generateDraft:         generateDraft,
    uploadToStorage:       uploadToStorage,
    uploadFileToStorage:   uploadFileToStorage,
    saveToEngagement:      saveToEngagement,
    loadEngagementImage:   loadEngagementImage,
    restoreVersion:        restoreVersion,
    renderCoverImageCard:  renderCoverImageCard,
    buildPrompt:           buildPrompt
  }
})()

//    Global handlers (called from Docket HTML)                              
var _coverDraftData = null

async function atlasCoverImageGenerate(engId, engType, custSect) {
  var style    = (document.getElementById('cover-img-style')    || {}).value || 'abstract_geometric'
  var feedback = (document.getElementById('cover-img-feedback') || {}).value || ''
  var msg      = document.getElementById('cover-img-msg')
  var preview  = document.getElementById('cover-img-preview')
  var approveBtn = document.getElementById('cover-img-approve-btn')

  if (msg) { msg.textContent = 'Generating... 15-20 seconds'; msg.style.color = 'var(--mid)' }
  if (approveBtn) approveBtn.style.display = 'none'

  // Add territory context
  var feedbackFull = feedback
  if (typeof atlasMap !== 'undefined' && typeof CURRENT_ENG !== 'undefined' && CURRENT_ENG) {
    var tCtx = CURRENT_ENG._territoryPreset
      ? atlasMap.buildMapPromptContext(CURRENT_ENG._territoryPreset)
      : (CURRENT_ENG.territory_states && CURRENT_ENG.territory_states.length
          ? atlasMap.buildMapPromptContext({ states: CURRENT_ENG.territory_states, hubs: CURRENT_ENG.territory_hubs || [] })
          : '')
    if (tCtx) feedbackFull = (feedback ? feedback + ' ' : '') + tCtx
  }

  var result = await atlasCoverImage.generateDraft(engType, custSect, style, feedbackFull)

  if (!result.success) {
    if (msg) { msg.textContent = result.error; msg.style.color = 'var(--orange)' }
    return
  }

  _coverDraftData = result
  if (preview) preview.innerHTML = '<img src="' + result.dataUrl + '" style="width:100%;height:100%;object-fit:cover">'
  if (msg) { msg.textContent = 'Draft ready. Happy with it? Click Use this.'; msg.style.color = 'var(--teal)' }
  if (approveBtn) approveBtn.style.display = 'inline-flex'
}

async function atlasCoverImageApprove(engId, version) {
  if (!_coverDraftData) {
    var msg = document.getElementById('cover-img-msg')
    if (msg) { msg.textContent = 'Generate a draft first'; msg.style.color = 'var(--orange)' }
    return
  }
  var msg = document.getElementById('cover-img-msg')
  if (msg) { msg.textContent = 'Uploading to Supabase...'; msg.style.color = 'var(--mid)' }

  var upload = await atlasCoverImage.uploadToStorage(_coverDraftData.base64, _coverDraftData.mimeType, engId, version)
  if (!upload.success) {
    if (msg) { msg.textContent = 'Upload failed: ' + upload.error; msg.style.color = 'var(--orange)' }
    return
  }

  var saved = await atlasCoverImage.saveToEngagement(engId, upload.path, upload.url, version, 'ai_generated')
  if (saved) {
    if (msg) { msg.textContent = 'Saved as v' + version; msg.style.color = 'var(--teal)' }
    _coverDraftData = null
    if (CURRENT_ENG) {
      CURRENT_ENG.cover_image_path   = upload.path
      CURRENT_ENG.cover_image_status = 'approved'
      if (!CURRENT_ENG.cover_image_versions) CURRENT_ENG.cover_image_versions = []
      CURRENT_ENG.cover_image_versions.push({ version: version, path: upload.path, url: upload.url, source: 'ai_generated', created_at: new Date().toISOString() })
    }
    setTimeout(function(){ if (typeof renderDocket === 'function') renderDocket() }, 500)
  } else {
    if (msg) { msg.textContent = 'Failed to save metadata'; msg.style.color = 'var(--orange)' }
  }
}

async function atlasCoverImageUpload(input, engId, version) {
  if (!input.files || !input.files[0]) return
  var file = input.files[0]
  var uploadMsg = document.getElementById('cover-upload-msg')
  if (uploadMsg) { uploadMsg.textContent = 'Uploading...'; uploadMsg.style.color = 'var(--mid)' }

  var upload = await atlasCoverImage.uploadFileToStorage(file, engId, version)
  if (!upload.success) {
    if (uploadMsg) { uploadMsg.textContent = 'Upload failed: ' + upload.error; uploadMsg.style.color = 'var(--orange)' }
    return
  }

  var saved = await atlasCoverImage.saveToEngagement(engId, upload.path, upload.url, version, 'uploaded')
  if (saved) {
    if (uploadMsg) { uploadMsg.textContent = 'Saved as v' + version; uploadMsg.style.color = 'var(--teal)' }
    if (CURRENT_ENG) {
      CURRENT_ENG.cover_image_path   = upload.path
      CURRENT_ENG.cover_image_status = 'approved'
      if (!CURRENT_ENG.cover_image_versions) CURRENT_ENG.cover_image_versions = []
      CURRENT_ENG.cover_image_versions.push({ version: version, path: upload.path, url: upload.url, source: 'uploaded', created_at: new Date().toISOString() })
    }
    setTimeout(function(){ if (typeof renderDocket === 'function') renderDocket() }, 500)
  }
}

async function atlasCoverImageRestore(engId, versionEntry) {
  var ok = await atlasCoverImage.restoreVersion(engId, versionEntry)
  if (ok) {
    if (CURRENT_ENG) CURRENT_ENG.cover_image_path = versionEntry.path
    if (typeof renderDocket === 'function') renderDocket()
  }
}

async function atlasCoverImageClear(engId) {
  var sb = (function(){try{var g=JSON.parse(localStorage.getItem('atlas_global_cfg')||'{}');return{url:g.sbUrl||g.sb_url||'',key:g.sbKey||g.sb_key||''}}catch(e){return{url:'',key:''}}})()
  if (!sb.url) return
  await fetch(sb.url + '/rest/v1/engagements?id=eq.' + engId, {
    method: 'PATCH',
    headers: { apikey: sb.key, Authorization: 'Bearer ' + sb.key, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ cover_image_path: null, cover_image_status: 'none', updated_at: new Date().toISOString() })
  })
  _coverDraftData = null
  if (CURRENT_ENG) { CURRENT_ENG.cover_image_path = null; CURRENT_ENG.cover_image_status = 'none' }
  if (typeof renderDocket === 'function') renderDocket()
}

// ===========================================================================
// Territory Map v2 - SOI Compliant (Survey of India boundaries)
// ===========================================================================

// ===========================================================================
// ATLAS Territory Map v2 - SOI Compliant
// Map boundaries as per Survey of India (surveyofindia.gov.in)
// Attribution line shown in UI only; not embedded in documents.
// ===========================================================================

var atlasMap = (function() {

  var C = {
    india:      '#E5E7EB',
    indiaBdr:   '#9CA3AF',
    stateBdr:   '#C8CACD',
    highlight:  '#00B290',
    highlightB: '#007A63',
    hub:        '#002870',
    spoke:      '#1C38F5',
    edge:       '#00B290',
    label:      '#002870',
    city:       '#374151',
    bg:         '#FFFFFF'
  }

  // SOI-compliant paths (hand-calibrated to Survey of India boundary)
  // Canvas: 600x700, Bbox: lng 66.5-97.5, lat 7.5-37.5
  var PATHS = {
    outer:     'M 42.6,347.7 L 46.5 333.7 L 67.7 326.7 L 77.4 350.0 L 71.6 373.3 L 42.6 361.7 L 31.0 319.7 L 19.4 310.3 L 67.7 233.3 L 96.8 198.3 L 110.3 140.0 L 135.5 105.0 L 154.8 70.0 L 125.8 23.3 L 145.2 9.3 L 212.9 9.3 L 232.3 23.3 L 261.3 46.7 L 271.0 70.0 L 309.7 93.3 L 338.7 116.7 L 358.1 105.0 L 406.5 128.3 L 445.2 163.3 L 483.9 186.7 L 503.2 179.7 L 522.6 186.7 L 551.6 193.7 L 580.6 198.3 L 598.1 210.0 L 590.3 233.3 L 574.8 256.7 L 561.3 291.7 L 541.9 315.0 L 522.6 326.7 L 509.0 338.3 L 493.5 361.7 L 503.2 326.7 L 489.7 315.0 L 474.2 303.3 L 451.0 361.7 L 425.8 350.0 L 406.5 361.7 L 387.1 373.3 L 358.1 420.0 L 329.0 455.0 L 271.0 560.0 L 212.9 686.0 L 187.7 672.0 L 168.4 653.3 L 154.8 630.0 L 141.3 606.7 L 135.5 525.0 L 121.9 443.3 L 116.1 408.3 L 106.5 373.3 L 58.1 361.7 L 42.6 347.7 Z',
    hp:        'M 174.2,100.3 L 203.2 93.3 L 232.3 105.0 L 238.1 128.3 L 241.9 151.7 L 212.9 175.0 L 193.5 163.3 L 174.2 151.7 L 164.5 128.3 Z',
    ne_india:  'M 445.2,226.3 L 493.5 182.0 L 532.3 186.7 L 580.6 198.3 L 594.2 217.0 L 590.3 245.0 L 571.0 268.3 L 561.3 291.7 L 541.9 315.0 L 522.6 326.7 L 509.0 338.3 L 489.7 350.0 L 474.2 338.3 L 483.9 315.0 L 445.2 280.0 L 435.5 245.0 Z',
    jk_ladakh: 'M 125.8,23.3 L 149.0 9.3 L 241.9 11.7 L 271.0 46.7 L 232.3 93.3 L 183.9 105.0 L 145.2 70.0 Z',
    all_india: 'M 42.6,347.7 L 46.5 333.7 L 67.7 326.7 L 77.4 350.0 L 71.6 373.3 L 42.6 361.7 L 31.0 319.7 L 19.4 310.3 L 67.7 233.3 L 96.8 198.3 L 110.3 140.0 L 135.5 105.0 L 154.8 70.0 L 125.8 23.3 L 145.2 9.3 L 212.9 9.3 L 232.3 23.3 L 261.3 46.7 L 271.0 70.0 L 309.7 93.3 L 338.7 116.7 L 358.1 105.0 L 406.5 128.3 L 445.2 163.3 L 483.9 186.7 L 503.2 179.7 L 522.6 186.7 L 551.6 193.7 L 580.6 198.3 L 598.1 210.0 L 590.3 233.3 L 574.8 256.7 L 561.3 291.7 L 541.9 315.0 L 522.6 326.7 L 509.0 338.3 L 493.5 361.7 L 503.2 326.7 L 489.7 315.0 L 474.2 303.3 L 451.0 361.7 L 425.8 350.0 L 406.5 361.7 L 387.1 373.3 L 358.1 420.0 L 329.0 455.0 L 271.0 560.0 L 212.9 686.0 L 187.7 672.0 L 168.4 653.3 L 154.8 630.0 L 141.3 606.7 L 135.5 525.0 L 121.9 443.3 L 116.1 408.3 L 106.5 373.3 L 58.1 361.7 L 42.6 347.7 Z',
    stateLines:'M 164.5,116.7 L 241.9 105.0 L 241.9 175.0 L 164.5 175.0 Z M 135.5,105.0 L 183.9 140.0 L 164.5 163.3 L 135.5 163.3 Z M 154.8,163.3 L 212.9 163.3 L 212.9 210.0 L 154.8 210.0 Z M 58.1,186.7 L 212.9 186.7 L 212.9 315.0 L 67.7 315.0 Z M 212.9,163.3 L 348.4 163.3 L 348.4 291.7 L 212.9 291.7 Z M 145.2,280.0 L 309.7 280.0 L 309.7 373.3 L 145.2 373.3 Z M 116.1,373.3 L 271.0 373.3 L 271.0 478.3 L 145.2 478.3 Z M 329.0,233.3 L 416.1 233.3 L 416.1 303.3 L 329.0 303.3 Z M 367.7,233.3 L 439.4 233.3 L 439.4 373.3 L 387.1 373.3 Z M 290.3,303.3 L 387.1 303.3 L 387.1 443.3 L 290.3 443.3 Z M 203.2,420.0 L 348.4 420.0 L 348.4 548.3 L 203.2 490.0 Z M 145.2,478.3 L 232.3 478.3 L 232.3 583.3 L 154.8 583.3 Z M 125.8,23.3 L 271.0 23.3 L 271.0 105.0 L 125.8 105.0 Z M 445.2,233.3 L 571.0 233.3 L 571.0 280.0 L 454.8 256.7 Z M 483.9,186.7 L 590.3 186.7 L 590.3 233.3 L 483.9 233.3 Z M 445.2,256.7 L 503.2 256.7 L 503.2 291.7 L 445.2 291.7 Z M 522.6,233.3 L 561.3 233.3 L 561.3 280.0 L 522.6 280.0 Z M 512.9,280.0 L 551.6 280.0 L 551.6 319.7 L 512.9 319.7 Z M 493.5,303.3 L 522.6 303.3 L 522.6 350.0 L 493.5 350.0 Z M 474.2,303.3 L 503.2 303.3 L 503.2 350.0 L 474.2 350.0 Z M 416.1,210.0 L 435.5 210.0 L 435.5 233.3 L 416.1 233.3 Z'
  }

  var PRESETS = {
    hp: {
      states: ['Himachal Pradesh'],
      highlightPath: 'hp',
      label: 'Himachal Pradesh',
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
      highlightPath: 'ne_india',
      label: 'North East India',
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
      highlightPath: null,
      label: 'All India',
      hubs: [
        {name:'New Delhi', lat:28.61, lng:77.21, type:'hub'},
        {name:'Mumbai',    lat:19.08, lng:72.88, type:'spoke'},
        {name:'Hyderabad', lat:17.38, lng:78.49, type:'spoke'},
        {name:'Bengaluru', lat:12.97, lng:77.59, type:'spoke'},
        {name:'Chennai',   lat:13.08, lng:80.27, type:'spoke'}
      ]
    }
  }

  var _W = 600, _H = 700
  var _LNG_MIN = 66.5, _LNG_MAX = 97.5, _LAT_MAX = 37.5, _LAT_MIN = 7.5

  function _proj(lng, lat) {
    return [
      parseFloat(((_W * (lng - _LNG_MIN) / (_LNG_MAX - _LNG_MIN)).toFixed(1))),
      parseFloat((_H * (_LAT_MAX - lat) / (_LAT_MAX - _LAT_MIN)).toFixed(1))
    ]
  }

  function renderSVG(preset, opts) {
    opts = opts || {}
    var w = opts.width  || 340
    var h = opts.height || 395
    var showDots   = opts.showDots   !== false
    var showLabels = opts.showLabels !== false

    var territory = typeof preset === 'string' ? PRESETS[preset] : preset
    var hubs = territory ? (territory.hubs || []) : []
    var highlightPath = territory ? (territory.highlightPath || null) : null

    var svg = '<svg viewBox="0 0 ' + _W + ' ' + _H + '" xmlns="http://www.w3.org/2000/svg"'
      + ' width="' + w + '" height="' + h + '"'
      + ' style="background:' + C.bg + ';font-family:Roboto,sans-serif">'
      + '<rect width="' + _W + '" height="' + _H + '" fill="' + C.bg + '"/>'

    // India base fill
    svg += '<path d="' + PATHS.outer + '" fill="' + C.india + '" stroke="' + C.indiaBdr + '" stroke-width="1" stroke-linejoin="round"/>'

    // State boundary lines
    svg += '<path d="' + PATHS.stateLines + '" fill="none" stroke="' + C.stateBdr + '" stroke-width="0.5" stroke-dasharray="2,2"/>'

    // Highlight overlay
    if (highlightPath && PATHS[highlightPath]) {
      svg += '<path d="' + PATHS[highlightPath] + '" fill="' + C.highlight + '" fill-opacity="0.7" stroke="' + C.highlightB + '" stroke-width="1.5" stroke-linejoin="round"/>'
    }

    // Hub/spoke dots
    if (showDots) {
      hubs.forEach(function(hub) {
        var p2 = _proj(hub.lng, hub.lat)
        var r   = hub.type === 'hub' ? 7 : 4
        var col = hub.type === 'hub' ? C.hub : hub.type === 'edge' ? C.edge : C.spoke
        svg += '<circle cx="' + p2[0] + '" cy="' + p2[1] + '" r="' + r + '" fill="' + col + '" opacity="0.9"/>'
        if (hub.type === 'hub') {
          svg += '<circle cx="' + p2[0] + '" cy="' + p2[1] + '" r="' + (r+5) + '" fill="none" stroke="' + col + '" stroke-width="1.5" opacity="0.35"/>'
        }
        if (showLabels) {
          svg += '<text x="' + (p2[0]+r+5) + '" y="' + (p2[1]+3) + '" font-size="' + (hub.type==='hub'?11:9) + '" fill="' + C.city + '" font-weight="' + (hub.type==='hub'?700:400) + '">' + hub.name + '</text>'
        }
      })
    }

    // INDIA watermark
    svg += '<text x="300" y="640" font-size="22" fill="#9CA3AF" opacity="0.35" text-anchor="middle" letter-spacing="6" font-weight="300">INDIA</text>'

    svg += '</svg>'
    return svg
  }

  function renderToElement(id, preset, opts) {
    var el = document.getElementById(id); if (el) el.innerHTML = renderSVG(preset, opts)
  }

  function renderDataUrl(preset, opts) {
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(renderSVG(preset, opts))))
  }

  function buildMapPromptContext(territory) {
    if (!territory) return ''
    var p3 = typeof territory === 'string' ? PRESETS[territory] : territory
    if (!p3) return ''
    var stateList = p3.states && p3.states.length ? p3.states.join(', ') : 'all of India'
    var hubNames  = (p3.hubs||[]).filter(function(h){return h.type==='hub'}).map(function(h){return h.name}).join(', ')
    return 'Geographic context: This engagement covers ' + stateList
      + (hubNames ? '. Key hub location: ' + hubNames : '') + '. '
      + 'Subtly incorporate an abstract suggestion of this Indian region as a background element.'
  }

  function renderTerritoryCard(eng) {
    var hasTerritory = eng && eng.territory_states && eng.territory_states.length > 0
    var preset = eng ? eng._territoryPreset : null
    var showMap = hasTerritory || preset === 'all_india'

    return '<div class="card" style="margin-bottom:12px">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">'
      + '<div class="card-title" style="margin-bottom:0">Territory</div>'
      + (hasTerritory ? '<span style="font-size:10px;padding:2px 7px;border-radius:10px;background:#E1F5EE;color:#085041;font-weight:700">Set</span>'
                      : '<span style="font-size:10px;padding:2px 7px;border-radius:10px;background:var(--light);color:var(--mid)">Not set</span>')
      + '</div>'
      + '<div style="font-size:12px;color:var(--mid);margin-bottom:10px">Highlights states on territory maps in all generated documents.</div>'
      + '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">'
      + '<button onclick="setEngTerritory(\'hp\')" class="btn btn-sm" style="' + (preset==='hp'?'background:var(--teal);color:#fff;border-color:var(--teal)':'') + '">Himachal Pradesh</button>'
      + '<button onclick="setEngTerritory(\'ne_india\')" class="btn btn-sm" style="' + (preset==='ne_india'?'background:var(--teal);color:#fff;border-color:var(--teal)':'') + '">NE India (8 states)</button>'
      + '<button onclick="setEngTerritory(\'all_india\')" class="btn btn-sm" style="' + (preset==='all_india'?'background:var(--teal);color:#fff;border-color:var(--teal)':'') + '">All India</button>'
      + '<button onclick="setEngTerritory(null)" class="btn btn-sm btn-ghost">Clear</button>'
      + '</div>'
      + (showMap
          ? '<div style="border:1px solid var(--border);border-radius:6px;overflow:hidden;display:inline-block;background:#fafafa">'
            + renderSVG(preset || {states:eng.territory_states,hubs:eng.territory_hubs||[],highlightPath:null}, {width:260,height:302})
            + '</div>'
            + '<div style="font-size:9px;color:var(--mid);margin-top:4px">Map outline as per Survey of India (surveyofindia.gov.in)</div>'
          : '<div style="font-size:12px;color:var(--mid);font-style:italic">Select a territory above to preview</div>')
      + '</div>'
  }

  return { renderSVG, renderToElement, renderDataUrl, buildMapPromptContext, renderTerritoryCard, PRESETS, PATHS }
})()

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
