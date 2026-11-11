// Updating a template never changes a quote or its saved Word projection.
export async function updateWordTemplate({call,templateFile}){
 const opts=await call('app.option.get');const id=Number(opts.canoniWordNativeTemplateId);
 if(!id||!templateFile)throw Error('Preparazione del modello Word da completare.');
 const result=await call('crm.documentgenerator.template.get',{id});const template=result.template||result;
 if(template.name!=='TEST Novotecna B2C — Word nativo')throw Error('Il modello non appartiene al collaudo Word.');
 await call('crm.documentgenerator.template.update',{id,fields:{file:['novotecna-b2c-canoni-word-native.docx',templateFile],active:'Y'}});
 return {templateId:id,name:template.name};
}
