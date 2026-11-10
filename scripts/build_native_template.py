"""Keep client template, replacing the custom-array table with a CRM file image."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from io import BytesIO
from copy import deepcopy
from lxml import etree as E
from PIL import Image, ImageDraw
from docx import Document
from docx.shared import Cm

root=Path(__file__).resolve().parents[1]
source=root/'public/templates/novotecna-b2c-canoni-test.docx'
target=root/'public/templates/novotecna-b2c-canoni-native.docx'
ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main','wp':'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing','a':'http://schemas.openxmlformats.org/drawingml/2006/main','pic':'http://schemas.openxmlformats.org/drawingml/2006/picture','r':'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
W='{'+ns['w']+'}';REL='http://schemas.openxmlformats.org/package/2006/relationships'
PRINT_WIDTH,PRINT_HEIGHT=2200,900
placeholder=Image.new('RGB',(PRINT_WIDTH,PRINT_HEIGHT),'white');draw=ImageDraw.Draw(placeholder)
draw.text((40,40),'CANONI NON SINCRONIZZATI - SALVARE NELLA SCHEDA CANONI',fill='#b42318')
buffer=BytesIO();placeholder.save(buffer,format='PNG');png=buffer.getvalue()
doc=Document();p=doc.add_paragraph();p.add_run().add_picture(BytesIO(png),width=Cm(18.2),height=Cm(18.2*PRINT_HEIGHT/PRINT_WIDTH))
image_p=deepcopy(p._p)
with ZipFile(source) as z:
    parts={i.filename:z.read(i.filename) for i in z.infolist()};infos=z.infolist()
tree=E.fromstring(parts['word/document.xml']);body=tree.find('w:body',ns)
tables=[t for t in body.findall('w:tbl',ns) if '{CanoniItemDescription}' in ''.join(t.itertext())]
assert len(tables)==1
max_id=max([int(e.get('id')) for e in tree.findall('.//wp:docPr',ns)]+[0])
code='{UfCrmNovotecnaCanoniStampa}'
for tag in ['wp:docPr','pic:cNvPr']:
    for e in image_p.findall('.//'+tag,ns):e.set('name',code);e.set('descr',code);e.set('title',code)
for e in image_p.findall('.//wp:docPr',ns):e.set('id',str(max_id+1))
for e in image_p.findall('.//a:blip',ns):e.set('{'+ns['r']+'}embed','rIdCanoniNativePrint')
pr=image_p.find('w:pPr',ns)
if pr is None:pr=E.Element(W+'pPr');image_p.insert(0,pr)
E.SubElement(pr,W+'spacing',{W+'before':'0',W+'after':'0'})
E.SubElement(pr,W+'ind',{W+'left':'0',W+'right':'0',W+'firstLine':'0'})
E.SubElement(pr,W+'jc',{W+'val':'left'})
table=tables[0];index=body.index(table);before=[E.tostring(e,method='c14n') for e in body if e is not table]
body.remove(table);body.insert(index,image_p)
assert [E.tostring(e,method='c14n') for e in body if e is not image_p]==before
signature=[p for p in body.findall('w:p',ns) if ''.join(t.text or '' for t in p.findall('.//w:t',ns)).strip()=='NOVOTECNA SBRL']
assert len(signature)==1
signature_pr=signature[0].find('w:pPr',ns)
if signature_pr is None:signature_pr=E.Element(W+'pPr');signature[0].insert(0,signature_pr)
keep=signature_pr.find('w:keepNext',ns)
if keep is None:keep=E.SubElement(signature_pr,W+'keepNext')
keep.set(W+'val','1')
parts['word/document.xml']=E.tostring(tree,xml_declaration=True,encoding='UTF-8',standalone=True)
rels=E.fromstring(parts['word/_rels/document.xml.rels'])
E.SubElement(rels,'{'+REL+'}Relationship',Id='rIdCanoniNativePrint',Type=ns['r']+'/image',Target='media/canoni-native-placeholder.png')
parts['word/_rels/document.xml.rels']=E.tostring(rels,xml_declaration=True,encoding='UTF-8',standalone=True)
with ZipFile(target,'w',ZIP_DEFLATED) as z:
    for info in infos:z.writestr(info,parts[info.filename])
    z.writestr('word/media/canoni-native-placeholder.png',png)
with ZipFile(source) as a,ZipFile(target) as b:
    changed=[name for name in a.namelist() if a.read(name)!=b.read(name)]
    assert set(changed)=={'word/document.xml','word/_rels/document.xml.rels'}
print('Modello diretto creato: preservati prodotti, totali, sezioni e grafica cliente; tabella mappata al campo File.')
