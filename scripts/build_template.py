from pathlib import Path
from docx import Document
from docx.shared import Cm, Pt, RGBColor
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

out = Path(__file__).resolve().parents[1] / 'public' / 'templates'
out.mkdir(parents=True, exist_ok=True)
doc = Document()
section = doc.sections[0]
section.top_margin = section.bottom_margin = Cm(1.5)
section.left_margin = section.right_margin = Cm(1.5)
section.page_width, section.page_height = Cm(21), Cm(29.7)
normal = doc.styles['Normal']
normal.font.name = 'Arial'
normal.font.size = Pt(9)
normal.paragraph_format.space_after = Pt(6)
for name in ['Title','Heading 1','Heading 2']:
    doc.styles[name].font.color.rgb = RGBColor(0,0,0)
for style in doc.styles:
    for border in list(style.element.iter(qn('w:pBdr'))):
        border.getparent().remove(border)
title=doc.add_paragraph('Prova preventivo con canoni',style='Title')
border=OxmlElement('w:pBdr')
for edge in ['top','left','bottom','right','between']:
    node=OxmlElement('w:'+edge);node.set(qn('w:val'),'nil');border.append(node)
title._p.get_or_add_pPr().append(border)
doc.add_paragraph('Novotecna | Documento dimostrativo')
doc.add_paragraph('Preventivo {QuoteNumber} del {Begindate}')

def table(headers, cells, widths):
    t=doc.add_table(rows=1, cols=len(headers))
    t.style='Table Grid';t.autofit=False
    borders=OxmlElement('w:tblBorders')
    for edge in ['top','left','bottom','right','insideH','insideV']:
        node=OxmlElement('w:'+edge);node.set(qn('w:val'),'single');node.set(qn('w:sz'),'4');node.set(qn('w:color'),'D9D9D9');borders.append(node)
    t._tbl.tblPr.append(borders)
    for i,(label,width) in enumerate(zip(headers,widths)):
        t.columns[i].width=Cm(width)
        cell=t.rows[0].cells[i];cell.width=Cm(width)
        cell.text=label
        shade=OxmlElement('w:shd');shade.set(qn('w:fill'),'203E5A');cell._tc.get_or_add_tcPr().append(shade)
        for r in cell.paragraphs[0].runs:r.font.bold=True;r.font.color.rgb=RGBColor(255,255,255)
    prop=OxmlElement('w:tblHeader');t.rows[0]._tr.get_or_add_trPr().append(prop)
    row=t.add_row()
    for i,(value,width) in enumerate(zip(cells,widths)):
        cell=row.cells[i];cell.width=Cm(width)
        for j,line in enumerate(value.split('\n')):
            paragraph=cell.paragraphs[0] if j==0 else cell.add_paragraph()
            paragraph.text=line
    return t

doc.add_heading('Prodotti',1)
table(['Descrizione','Quantità','Prezzo unitario','Importo'],[
    '{ProductsProductName}',
    '{ProductsProductQuantity} {ProductsProductMeasureSymbol}',
    '{ProductsProductPriceRaw}',
    '{ProductsProductPriceExclusiveSum}',
],[8,3,3.5,3.5])
doc.add_heading('Canoni e servizi ricorrenti',1)
table(['Descrizione','Tariffa','Unità e periodicità','Quantità di riferimento','Condizioni'],[
    '{CanoniItemDescription}',
    '{CanoniItemAmount}',
    '{CanoniItemUnit} / {CanoniItemPeriod}',
    '{CanoniItemQuantity}',
    'Durata: {CanoniItemDuration}\nDecorrenza: {CanoniItemStart}\n{CanoniItemNotes}',
],[4,2.3,3,2.7,6])
doc.add_paragraph('I canoni sono esposti separatamente e non concorrono al totale dei prodotti. Non sono eseguite somme o moltiplicazioni sui canoni.')
doc.add_heading('Riepilogo prodotti',1)
table(['Voce','Importo'],[
    'Imponibile prodotti','{TotalBeforeTax}',
],[12,6])
t=doc.tables[-1]
t.add_row().cells[0].text='Totale {TaxesTaxName} {TaxesTaxTitle}'
t.rows[-1].cells[1].text='{TaxesTaxValue}'
t.add_row().cells[0].text='Totale da pagare per i prodotti'
t.rows[-1].cells[1].text='{TotalSum}'
doc.save(out / 'canoni-prova.docx')
print('Modello dimostrativo creato; nessun modello originale modificato.')
