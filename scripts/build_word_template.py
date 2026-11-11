"""Style a real recurring-fee table from the client's native product table."""
from argparse import ArgumentParser
from copy import deepcopy
from pathlib import Path
from zipfile import ZipFile
from lxml import etree as E
import re

NS={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
W='{'+NS['w']+'}'

def text(element):
    return ''.join(node.text or '' for node in element.findall('.//w:t',NS))

def child(parent,name,**attrs):
    node=parent.find('w:'+name,NS)
    if node is None:node=E.SubElement(parent,W+name)
    node.attrib.update({W+k:str(v) for k,v in attrs.items()})
    return node

def build(source,target,native=False,separate=False,direct_slots=0,native_eight=False):
    if native_eight:separate=True
    if direct_slots:separate=True
    with ZipFile(source) as package:
        infos=package.infolist();parts={i.filename:package.read(i.filename) for i in infos}
    document=E.fromstring(parts['word/document.xml']);body=document.find('w:body',NS)
    section_count=len(document.findall('.//w:sectPr',NS))
    products=next(t for t in body.findall('w:tbl',NS) if '{ProductsProductDescription}' in text(t))
    previous=next(t for t in body.findall('w:tbl',NS) if '{CanoniItemDescription}' in text(t))
    original_product=E.tostring(products,method='c14n')
    native_rows=products.findall('w:tr',NS)
    header_format=native_rows[0].find('w:tc/w:p/w:r/w:rPr',NS)
    body_format=native_rows[1].findall('w:tc',NS)[1].find('w:p/w:r/w:rPr',NS)
    native_widths=[int(c.get(W+'w')) for c in products.findall('w:tblGrid/w:gridCol',NS)]
    assert len(native_widths)==8
    # Every edge coincides with a boundary of the native product grid.
    widths=[sum(native_widths[:2]),native_widths[2],sum(native_widths[3:5]),native_widths[5],sum(native_widths[6:])]
    if separate:
        assert not native, 'La variante a otto colonne usa i campi autonomi CanoniItem.'
        widths=[3600,700,800,900,800,900,1150,1472]
    table=E.Element(W+'tbl');properties=deepcopy(products.find('w:tblPr',NS));table.append(properties)
    # Word positions the border relative to the first cell's left margin.
    native_indent=int(products.find('w:tblPr/w:tblInd',NS).get(W+'w'))
    child(properties,'tblInd',w=native_indent+45,type='dxa')
    margins=child(properties,'tblCellMar')
    for side in ['top','left','bottom','right']:child(margins,side,w=45,type='dxa')
    grid=E.SubElement(table,W+'tblGrid')
    for width in widths:E.SubElement(grid,W+'gridCol',{W+'w':str(width)})
    values=[
        [['Canone / servizio'],['Tariffa'],['Unità e periodicità'],['Riferimento'],['Condizioni']],
        [['{CanoniItemDescription}','{CanoniItemNotes}'],['{CanoniItemAmount}'],['{CanoniItemUnit}','{CanoniItemPeriod}'],['{CanoniItemQuantity}'],['Durata: {CanoniItemDuration}','Decorrenza: {CanoniItemStart}']],
    ]
    if native:
        prefix='UfCrmNovotecnaCanoniWordItemUfCrm18Novo'
        values[1]=[['{'+prefix+suffix+'}'] for suffix in ['Description','Tariffa','Unitper','Riferimento','Condizioni']]
    if separate:
        values=[
            [[label] for label in ['Descrizione','Tariffa (€)','Unità','Periodicità','Quantità rif.','Durata','Decorrenza','Note e condizioni']],
            [['{CanoniItem'+suffix+'}'] for suffix in ['Description','Amount','Unit','Period','Quantity','Duration','Start','Notes']],
        ]
    if native_eight:
        prefix='UfCrmNovotecnaCanoniWordItemUfCrm18Novo'
        values[1]=[['{'+prefix+suffix+'}'] for suffix in ['Name','Tariffa','Unit','Period','Riferimento','Duration','Start','Notes']]
    if direct_slots:
        assert 1<=direct_slots<=3
        columns=['Desc','Amount','Unit','Period','Qty','Duration','Start','Notes']
        values=values[:1]+[[['{UfCrmNovoC'+str(slot)+column+'}'] for column in columns] for slot in range(1,direct_slots+1)]
    def paragraph(value,header=False,align='left',keep=True,bold=False):
        p=E.Element(W+'p');pr=E.SubElement(p,W+'pPr')
        child(pr,'spacing',before=0,after=0,line=240,lineRule='auto')
        child(pr,'ind',left=0,right=0,firstLine=0);child(pr,'jc',val=align)
        if keep:child(pr,'keepNext')
        child(pr,'keepLines')
        run=E.SubElement(p,W+'r');rp=deepcopy(header_format if header else body_format)
        if rp is None:rp=E.Element(W+'rPr')
        run.append(rp)
        child(rp,'rFonts',ascii='Calibri',hAnsi='Calibri',eastAsia='Calibri',cs='Calibri')
        if not header:
            child(rp,'b',val='1' if bold else '0');child(rp,'bCs',val='1' if bold else '0');child(rp,'color',val='000000')
        elif separate:
            child(rp,'sz',val=16);child(rp,'szCs',val=16)
        E.SubElement(run,W+'t').text=value
        return p
    for row_index,columns in enumerate(values):
        row=E.SubElement(table,W+'tr');rp=E.SubElement(row,W+'trPr');child(rp,'cantSplit')
        if row_index==0:child(rp,'tblHeader')
        for column,(width,lines) in enumerate(zip(widths,columns)):
            cell=E.SubElement(row,W+'tc')
            cp=deepcopy(native_rows[0 if row_index==0 else 1].find('w:tc/w:tcPr',NS));cell.append(cp)
            child(cp,'tcW',w=width,type='dxa');child(cp,'vAlign',val='center')
            cell_margins=child(cp,'tcMar')
            for side in ['top','left','bottom','right']:child(cell_margins,side,w=45,type='dxa')
            for line_index,line in enumerate(lines):
                last=row_index==len(values)-1 and column==len(columns)-1 and line_index==len(lines)-1
                centered=row_index==0 or column in ([1,2,3,4] if separate else [1,2,3])
                cell.append(paragraph(line,row_index==0,'center' if centered else 'left',not last,column==0))
    index=body.index(previous);body.remove(previous);body.insert(index,table)
    # Keep the section containing products, notes, totals and signature together.
    sections=[p for p in body.findall('w:p',NS) if p.find('w:pPr/w:sectPr',NS) is not None and body.index(p)>body.index(table)]
    terms=[p for p in body.findall('w:p',NS) if text(p).strip()=='CONDIZIONI GENERALI DI VENDITA']
    assert len(sections)==len(terms)==1
    end=next(p for p in reversed(list(body)[:body.index(terms[0])]) if E.QName(p).localname=='p');assert not text(end).strip()
    section=sections[0].find('w:pPr/w:sectPr',NS);section.getparent().remove(section);child(end,'pPr').append(section)
    for p in body.findall('w:p',NS):
        value=text(p).strip()
        if value=='Canoni e servizi ricorrenti':
            p.getparent().replace(p,paragraph(value,False,'left',True,True))
        elif value.startswith('Tariffe informative, esposte separatamente'):
            p.getparent().replace(p,paragraph(value,False,'left',False))
        elif value=='NOVOTECNA SBRL':child(child(p,'pPr'),'keepNext')
    if direct_slots or native_eight:
        # Reclaim blank vertical space, preserving all text and the native totals.
        following=list(body)[body.index(table)+1:body.index(end)]
        totals=next(t for t in following if E.QName(t).localname=='tbl' and '{TotalSum}' in text(t))
        for item in following:
            if item is totals:break
            if E.QName(item).localname=='p' and not text(item).strip() and not item.findall('.//w:drawing',NS):
                child(child(item,'pPr'),'spacing',before=0,after=0,line=60,lineRule='exact')
        total_paragraphs=totals.findall('.//w:p',NS)
        for p in total_paragraphs[:-1]:child(child(p,'pPr'),'keepNext')
        for row in totals.findall('w:tr',NS):child(child(row,'trPr'),'cantSplit')
    if native_eight:
        # A continuous final section lets its blank header and smaller top margin
        # replace the offer header when the fee table is short. Start the terms
        # on their own page regardless of the number of repeated rows.
        child(body.find('w:sectPr',NS),'type',val='nextPage')
        for br in end.findall('.//w:br[@w:type="page"]',NS):br.getparent().remove(br)
        child(child(end,'pPr'),'spacing',before=0,after=0,line=20,lineRule='exact')
        # The source reserves two empty address rows and an empty line before
        # the products. Reclaim only that whitespace, keeping text and borders.
        recipient=next(t for t in body.findall('w:tbl',NS) if body.index(t)<body.index(products))
        for row in recipient.findall('w:tr',NS):
            if not text(row).strip() and not row.findall('.//w:drawing',NS):
                child(child(row,'trPr'),'trHeight',val=60,hRule='atLeast')
                for p in row.findall('.//w:p',NS):child(child(p,'pPr'),'spacing',before=0,after=0,line=60,lineRule='exact')
        for item in list(body)[body.index(recipient)+1:body.index(products)]:
            if E.QName(item).localname=='p' and not text(item).strip() and not item.findall('.//w:drawing',NS):
                child(child(item,'pPr'),'spacing',before=0,after=0,line=20,lineRule='exact')
        for item in following:
            # Floating side labels and the signature line do not need an empty
            # text line underneath their anchors. Keep the drawing itself intact.
            if E.QName(item).localname=='p' and not ''.join(item.xpath('./w:r/w:t/text()',namespaces=NS)).strip() and not item.findall('.//{http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing}inline'):
                child(child(item,'pPr'),'spacing',before=0,after=0,line=20,lineRule='exact')
            if E.QName(item).localname=='p' and not text(item).strip():
                wp='{http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing}'
                for anchor in item.iter(wp+'anchor'):
                    extent=anchor.find(wp+'extent');vertical=anchor.find(wp+'positionV')
                    # The horizontal signature line originally floats 20 pt
                    # below its empty anchor and can collide with the footer.
                    if extent is not None and int(extent.get('cy','0'))<=12700 and vertical is not None and vertical.get('relativeFrom')=='paragraph':
                        offset=vertical.find(wp+'posOffset')
                        if offset is not None:offset.text='76200'
                        mc='http://schemas.openxmlformats.org/markup-compatibility/2006'
                        alternatives=anchor.xpath('ancestor::mc:AlternateContent[1]',namespaces={'mc':mc})
                        if alternatives:
                            for shape in alternatives[0].findall('.//{urn:schemas-microsoft-com:vml}shape'):
                                style=shape.get('style','')
                                shape.set('style',re.sub(r'(^|;)(\s*)margin-top:[^;]+',lambda m:m[1]+m[2]+'margin-top:6pt',style))
    assert len(document.findall('.//w:sectPr',NS))==section_count
    assert E.tostring(products,method='c14n')==original_product
    parts['word/document.xml']=E.tostring(document,xml_declaration=True,encoding='UTF-8',standalone=True)
    target.parent.mkdir(parents=True,exist_ok=True)
    with ZipFile(target,'w') as output:
        for info in infos:output.writestr(info,parts[info.filename])

if __name__=='__main__':
    root=Path(__file__).resolve().parents[1]
    parser=ArgumentParser();parser.add_argument('--source',type=Path,default=root/'public/templates/novotecna-b2c-canoni-test.docx');parser.add_argument('--target',type=Path,default=root/'public/templates/novotecna-b2c-canoni-word.docx');parser.add_argument('--native',action='store_true');parser.add_argument('--separate',action='store_true');parser.add_argument('--direct-slots',type=int,default=0);parser.add_argument('--native-eight',action='store_true')
    args=parser.parse_args();build(args.source,args.target,args.native,args.separate,args.direct_slots,args.native_eight)
    print('Tabella Word creata: stile e allineamenti derivati dalla tabella prodotti; righe senza altezza fissa.')
