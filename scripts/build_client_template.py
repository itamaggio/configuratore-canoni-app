"""Patch only document.xml; preserve the original client package and other parts."""
from pathlib import Path
from zipfile import ZipFile
from copy import deepcopy
from hashlib import sha256
import json
from lxml import etree as E

root=Path(__file__).resolve().parents[1]
source=root.parent/'Varie'/'Template Fotovoltaico Virtuale - R01 del 07_10_26  - B2C.docx'
target=root/'public/templates/novotecna-b2c-canoni-test.docx'
qa=root/'artifacts/client-case';qa.mkdir(parents=True,exist_ok=True)
ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
W='{'+ns['w']+'}'
with ZipFile(source) as z:
    parts={i.filename:z.read(i.filename) for i in z.infolist()}
    tree=E.fromstring(parts['word/document.xml'])
    body=tree.find('w:body',ns)
    products=body.findall('w:tbl',ns)[1]
    assert '{ProductsProductDescription}' in ''.join(products.itertext())
    original_children=[E.tostring(e,method='c14n') for e in body]
    def paragraph(text,bold=False):
        p=E.Element(W+'p');pp=E.SubElement(p,W+'pPr')
        E.SubElement(pp,W+'spacing',{W+'before':'100',W+'after':'70'})
        r=E.SubElement(p,W+'r');rp=E.SubElement(r,W+'rPr')
        E.SubElement(rp,W+'rFonts',{W+'ascii':'Arial',W+'hAnsi':'Arial'})
        E.SubElement(rp,W+'sz',{W+'val':'18'})
        if bold:E.SubElement(rp,W+'b')
        E.SubElement(r,W+'t').text=text
        return p
    table=E.Element(W+'tbl');pr=deepcopy(products.find('w:tblPr',ns));table.append(pr)
    for node in list(pr):
        if E.QName(node).localname in ['tblLook','tblStyle','tblBorders']:pr.remove(node)
    borders=E.SubElement(pr,W+'tblBorders')
    for edge in ['top','left','bottom','right','insideH','insideV']:
        E.SubElement(borders,W+edge,{W+'val':'single',W+'sz':'4',W+'color':'D9D9D9'})
    widths=[2700,1300,1700,1500,3122]
    grid=E.SubElement(table,W+'tblGrid')
    for width in widths:E.SubElement(grid,W+'gridCol',{W+'w':str(width)})
    headers=['Canone / servizio','Tariffa + IVA','Unità e periodicità','Riferimento','Condizioni']
    cells=[['{CanoniItemDescription}'],['{CanoniItemAmount}'],['{CanoniItemUnit} / {CanoniItemPeriod}'],['{CanoniItemQuantity}'],['Durata: {CanoniItemDuration}','Decorrenza: {CanoniItemStart}','{CanoniItemNotes}']]
    for index,values in enumerate([[[v] for v in headers],cells]):
        row=E.SubElement(table,W+'tr');rp=E.SubElement(row,W+'trPr')
        E.SubElement(rp,W+'cantSplit')
        if index==0:E.SubElement(rp,W+'tblHeader')
        for width,lines in zip(widths,values):
            cell=E.SubElement(row,W+'tc');cp=E.SubElement(cell,W+'tcPr')
            E.SubElement(cp,W+'tcW',{W+'w':str(width),W+'type':'dxa'})
            E.SubElement(cp,W+'vAlign',{W+'val':'center'})
            if index==0:E.SubElement(cp,W+'shd',{W+'fill':'E7E6E6'})
            margins=E.SubElement(cp,W+'tcMar')
            for edge in ['top','left','bottom','right']:E.SubElement(margins,W+edge,{W+'w':'75',W+'type':'dxa'})
            for line in lines:cell.append(paragraph(line,index==0))
    additions=[paragraph('Canoni e servizi ricorrenti',True),table,paragraph('Tariffe informative, esposte separatamente dai prodotti e non incluse nel totale del preventivo.')]
    index=body.index(products)+1
    for i,element in enumerate(additions):body.insert(index+i,element)
    # All existing body blocks, sections, drawings and source placeholders are preserved.
    unchanged=[E.tostring(e,method='c14n') for e in body if not any(e is x for x in additions)]
    assert unchanged==original_children
    assert len(tree.findall('.//w:sectPr',ns))==5
    patched=E.tostring(tree,xml_declaration=True,encoding='UTF-8',standalone=True)
    with ZipFile(target,'w') as out:
        for info in z.infolist():out.writestr(info,patched if info.filename=='word/document.xml' else parts[info.filename])
with ZipFile(target) as z:
    assert all(z.read(k)==v for k,v in parts.items() if k!='word/document.xml')
inventory=[{'path':k,'bytes':len(v),'sha256':sha256(v).hexdigest(),'policy':'edit' if k=='word/document.xml' else 'preserve'} for k,v in parts.items()]
(qa/'package-inventory.json').write_text(json.dumps(inventory,indent=2),encoding='utf-8')
(qa/'artifact.md').write_text(f'''# Copia del modello Novotecna B2C con canoni

Reference: {source}
SHA-256: {sha256(source.read_bytes()).hexdigest()}
Autorità grafica: DOCX originale cliente; cinque sezioni preservate integralmente.
Intervento circoscritto: subito dopo la seconda tabella diretta del body (Prodotti), prima del paragrafo con cambio sezione e grafiche flottanti, inserire titolo, tabella canoni a cinque colonne e nota informativa. Gli otto attributi dei canoni sono tutti rappresentati; le condizioni occupano tre paragrafi distinti.
Nessuna rimappatura dei segnaposto originali. Campi e prodotti di test saranno creati nel CRM per soddisfare i segnaposto esistenti. Condizioni contrattuali originali preservate; tariffa O&M di prova 97 euro coerente con il testo B2C.
Tutti gli altri blocchi body e tutti gli altri package part, incluse immagini, header, footer, relazioni, styles e numbering, restano invariati; confronto strutturale eseguito. Geometria, font e impaginazione originali preservati. Nuova tabella larga 10322 twip, Arial 9 pt, nessuna altezza fissa, intestazione ripetuta.
Rendering locale non disponibile: il runtime non include LibreOffice. Verifica finale effettuata tramite generatore nativo Bitrix24 e PDF effettivo, reso con Poppler. Conteggio pagine da rilevare nel PDF generato.
Output: {target}
''',encoding='utf-8')
print('Copia cliente creata. Solo document.xml modificato; tutti gli altri componenti e blocchi originali preservati.')
