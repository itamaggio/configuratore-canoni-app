export function useCatalogName(current,product){
 const name=String(product.NAME??product.name??'').trim();
 if(!name||name.length>2000)throw Error('Il prodotto selezionato non ha un nome utilizzabile.');
 return {...current,description:name};
}
export async function searchCatalogNames({query='',call}){
 const filter={ACTIVE:'Y'};const text=String(query).trim().slice(0,200);if(text)filter['%NAME']=text;
 // Compatibility with the CRM scope already authorized for the test app.
 const result=await call('crm.product.list',{order:{NAME:'ASC'},filter,select:['ID','NAME'],start:0});
 return Object.values(result||[]).filter(p=>p.ID&&p.NAME).slice(0,50).map(p=>({id:String(p.ID),name:String(p.NAME)}));
}
