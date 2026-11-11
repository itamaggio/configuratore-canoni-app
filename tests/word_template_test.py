"""Validate the client-derived Word table without publishing customer files."""
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from zipfile import ZipFile
from lxml import etree as E

ROOT=Path(__file__).resolve().parents[1]
NS={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
W='{'+NS['w']+'}'

class WordTemplateTest(unittest.TestCase):
 def test_optional_product_units_follow_each_native_product_measure(self):
  source=ROOT/'public/templates/source-b2b.docx'
  with tempfile.TemporaryDirectory() as tmp:
   target=Path(tmp)/'base.docx'
   r=subprocess.run([sys.executable,str(ROOT/'scripts/build_client_template.py'),'--source',str(source),'--target',str(target),'--qa-dir',str(Path(tmp)/'qa'),'--dynamic-product-units'],capture_output=True,text=True)
   self.assertEqual(r.returncode,0,r.stderr)
   with ZipFile(source) as before,ZipFile(target) as after:
    old=E.fromstring(before.read('word/document.xml'));new=E.fromstring(after.read('word/document.xml'))
    product=lambda doc:next(t for t in doc.findall('.//w:body/w:tbl',NS) if '{ProductsProductDescription}' in ''.join(t.itertext()))
    expected=product(old)
    for t in expected.findall('.//w:t',NS):
     if t.text:t.text=t.text.replace('kWp','{ProductsProductMeasureName}')
    self.assertEqual(E.tostring(expected,method='c14n'),E.tostring(product(new),method='c14n'))
    self.assertEqual(''.join(product(new).itertext()).count('{ProductsProductMeasureName}'),3)
    for name in before.namelist():
     if name!='word/document.xml':self.assertEqual(before.read(name),after.read(name),name)
 def test_b2b_original_package_and_native_products_are_preserved(self):
  source=ROOT/'public/templates/source-b2b.docx'
  with tempfile.TemporaryDirectory() as tmp:
   base=Path(tmp)/'base.docx';target=Path(tmp)/'native.docx'
   r=subprocess.run([sys.executable,str(ROOT/'scripts/build_client_template.py'),'--source',str(source),'--target',str(base),'--qa-dir',str(Path(tmp)/'qa')],capture_output=True,text=True)
   self.assertEqual(r.returncode,0,r.stderr)
   r=subprocess.run([sys.executable,str(ROOT/'scripts/build_word_template.py'),'--source',str(base),'--target',str(target),'--native-eight'],capture_output=True,text=True)
   self.assertEqual(r.returncode,0,r.stderr)
   with ZipFile(source) as before,ZipFile(target) as after:
    old=E.fromstring(before.read('word/document.xml'));new=E.fromstring(after.read('word/document.xml'))
    self.assertEqual(len(old.findall('.//w:sectPr',NS)),len(new.findall('.//w:sectPr',NS)))
    product=lambda doc:next(t for t in doc.findall('.//w:body/w:tbl',NS) if '{ProductsProductDescription}' in ''.join(t.itertext()))
    self.assertEqual(E.tostring(product(old),method='c14n'),E.tostring(product(new),method='c14n'))
    for name in before.namelist():
     if name!='word/document.xml':self.assertEqual(before.read(name),after.read(name),name)
 def test_native_eight_uses_one_repeating_row_with_all_eight_bound_fields(self):
  source=ROOT/'public/templates/novotecna-b2c-canoni-test.docx'
  with tempfile.TemporaryDirectory() as tmp:
   target=Path(tmp)/'native-eight.docx'
   result=subprocess.run([sys.executable,str(ROOT/'scripts/build_word_template.py'),'--source',str(source),'--target',str(target),'--native-eight'],capture_output=True,text=True)
   self.assertEqual(result.returncode,0,result.stderr)
   with ZipFile(source) as before,ZipFile(target) as after:
    old=E.fromstring(before.read('word/document.xml'));doc=E.fromstring(after.read('word/document.xml'))
    prefix='UfCrmNovotecnaCanoniWordItemUfCrm18Novo'
    table=next(t for t in doc.findall('.//w:body/w:tbl',NS) if '{'+prefix+'Name}' in ''.join(t.itertext()))
    self.assertEqual([len(r.findall('w:tc',NS)) for r in table.findall('w:tr',NS)],[8,8])
    for suffix in ['Name','Tariffa','Unit','Period','Riferimento','Duration','Start','Notes']:
     self.assertIn('{'+prefix+suffix+'}',''.join(table.itertext()))
    old_product=next(t for t in old.findall('.//w:body/w:tbl',NS) if '{ProductsProductDescription}' in ''.join(t.itertext()))
    product=next(t for t in doc.findall('.//w:body/w:tbl',NS) if '{ProductsProductDescription}' in ''.join(t.itertext()))
    self.assertEqual(E.tostring(old_product,method='c14n'),E.tostring(product,method='c14n'))
    self.assertFalse(table.findall('.//w:drawing',NS));self.assertFalse(table.findall('.//w:trHeight',NS))
    self.assertEqual(doc.find('w:body/w:sectPr/w:type',NS).get(W+'val'),'nextPage')
    wp={'wp':'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing'}
    signature=[a for a in doc.findall('.//wp:anchor',wp) if int(a.find('wp:extent',wp).get('cy'))<=12700]
    self.assertEqual(len(signature),1)
    self.assertEqual(signature[0].find('wp:positionV/wp:posOffset',wp).text,'76200')
    alternative=signature[0].xpath('ancestor::mc:AlternateContent[1]',namespaces={'mc':'http://schemas.openxmlformats.org/markup-compatibility/2006'})[0]
    self.assertTrue(all('margin-top:6pt' in s.get('style','') for s in alternative.findall('.//{urn:schemas-microsoft-com:vml}shape')))
    recipient=doc.find('w:body/w:tbl',NS)
    for row in recipient.findall('w:tr',NS):
     if not ''.join(row.xpath('.//w:t/text()',namespaces=NS)).strip():
      self.assertEqual(row.find('w:trPr/w:trHeight',NS).get(W+'val'),'60')
    blocks=list(doc.find('w:body',NS));end=next(i for i,e in enumerate(blocks) if ''.join(e.itertext()).strip()=='CONDIZIONI GENERALI DI VENDITA')
    for p in blocks[blocks.index(table)+1:end]:
     if E.QName(p).localname=='p' and not ''.join(p.xpath('./w:r/w:t/text()',namespaces=NS)).strip() and p.find('w:pPr/w:sectPr',NS) is None:
      self.assertEqual(p.find('w:pPr/w:spacing',NS).get(W+'line'),'20')
    for name in before.namelist():
     if name!='word/document.xml':self.assertEqual(before.read(name),after.read(name),name)
 def test_direct_quote_fields_have_eight_independent_columns_and_three_slots(self):
  source=ROOT/'public/templates/novotecna-b2c-canoni-test.docx'
  with tempfile.TemporaryDirectory() as tmp:
   target=Path(tmp)/'direct.docx'
   result=subprocess.run([sys.executable,str(ROOT/'scripts/build_word_template.py'),'--source',str(source),'--target',str(target),'--direct-slots','3'],capture_output=True,text=True)
   self.assertEqual(result.returncode,0,result.stderr)
   with ZipFile(target) as package:
    doc=E.fromstring(package.read('word/document.xml'))
    table=next(t for t in doc.findall('.//w:body/w:tbl',NS) if '{UfCrmNovoC1Desc}' in ''.join(t.itertext()))
    self.assertEqual([len(row.findall('w:tc',NS)) for row in table.findall('w:tr',NS)],[8,8,8,8])
    self.assertEqual(sum(int(c.get(W+'w')) for c in table.findall('w:tblGrid/w:gridCol',NS)),10322)
    for slot in range(1,4):
     for suffix in ['Desc','Amount','Unit','Period','Qty','Duration','Start','Notes']:
      self.assertIn('{UfCrmNovoC'+str(slot)+suffix+'}',''.join(table.itertext()))
    self.assertNotIn('CanoniWord',''.join(table.itertext()))
    self.assertFalse(table.findall('.//w:drawing',NS))
    self.assertFalse(table.findall('.//w:trHeight',NS))
    totals=next(t for t in doc.findall('.//w:body/w:tbl',NS) if '{TotalSum}' in ''.join(t.itertext()))
    self.assertTrue(all(p.find('w:pPr/w:keepNext',NS) is not None for p in totals.findall('.//w:p',NS)[:-1]))
 def test_real_table_matches_products_and_preserves_the_client_package(self):
  source=ROOT/'public/templates/novotecna-b2c-canoni-test.docx'
  with tempfile.TemporaryDirectory() as tmp:
   target=Path(tmp)/'word.docx'
   build=subprocess.run([sys.executable,str(ROOT/'scripts/build_word_template.py'),'--source',str(source),'--target',str(target)],capture_output=True,text=True)
   self.assertEqual(build.returncode,0,build.stderr)
   with ZipFile(source) as before,ZipFile(target) as after:
    old=E.fromstring(before.read('word/document.xml'));new=E.fromstring(after.read('word/document.xml'))
    old_product=next(t for t in old.findall('.//w:body/w:tbl',NS) if '{ProductsProductDescription}' in ''.join(t.itertext()))
    new_product=next(t for t in new.findall('.//w:body/w:tbl',NS) if '{ProductsProductDescription}' in ''.join(t.itertext()))
    self.assertEqual(E.tostring(old_product,method='c14n'),E.tostring(new_product,method='c14n'))
    fees=next(t for t in new.findall('.//w:body/w:tbl',NS) if '{CanoniItemDescription}' in ''.join(t.itertext()))
    self.assertEqual(fees.find('w:tblPr/w:tblW',NS).attrib,old_product.find('w:tblPr/w:tblW',NS).attrib)
    self.assertEqual(int(fees.find('w:tblPr/w:tblInd',NS).get(W+'w')),48)
    self.assertEqual(sum(int(e.get(W+'w')) for e in fees.findall('w:tblGrid/w:gridCol',NS)),10322)
    header=fees.findall('w:tr',NS)[0]
    self.assertIsNotNone(header.find('w:trPr/w:tblHeader',NS))
    native_fill=old_product.find('w:tr/w:tc/w:tcPr/w:shd',NS).get(W+'fill')
    self.assertTrue(all(e.get(W+'fill')==native_fill for e in header.findall('w:tc/w:tcPr/w:shd',NS)))
    self.assertTrue(all(e.get(W+'val')=='FFFFFF' for e in header.findall('.//w:rPr/w:color',NS)))
    self.assertFalse(fees.findall('.//w:trHeight',NS))
    self.assertEqual(len(fees.findall('w:tr/w:trPr/w:cantSplit',NS)),2)
    first=fees.findall('w:tr',NS)[1].find('w:tc',NS)
    self.assertIn('{CanoniItemNotes}',''.join(first.itertext()))
    self.assertNotIn('{UfCrmNovotecnaCanoniStampa}',''.join(fees.itertext()))
    self.assertEqual(len(new.findall('.//w:sectPr',NS)),5)
    for name in before.namelist():
     if name!='word/document.xml':self.assertEqual(before.read(name),after.read(name),name)

if __name__=='__main__':unittest.main()
