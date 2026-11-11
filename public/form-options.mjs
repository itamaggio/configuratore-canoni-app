const choice=(value,label=value)=>({value,label});
const OPTIONS={
 unit:[choice('kWp','Per kWp'),choice('kW','Per kW'),choice('Fisso','Importo fisso'),...['Impianto','Dispositivo','Colonnina','Utente','Contratto','Altro'].map(v=>choice(v))],
 period:['Annuale','Mensile','Bimestrale','Trimestrale','Semestrale','Personalizzata'].map(v=>choice(v)),
 duration:[choice('','Non specificata'),...['12 mesi','24 mesi','36 mesi','48 mesi','60 mesi','Tempo indeterminato','Da concordare','Per tutta la durata del contratto'].map(v=>choice(v))],
 start:[choice('','Non specificata'),...['Immediata','Dalla firma',"Dall'attivazione",'Dal collaudo','Dal secondo anno','Da concordare'].map(v=>choice(v))],
};
export function optionsFor(field,current){
 const options=OPTIONS[field]?.map(x=>({...x}));if(!options)throw Error('Campo elenco non riconosciuto.');
 if(current!==undefined&&!options.some(x=>x.value===current))options.push(choice(String(current)));
 return options;
}
export const SELECT_DEFAULTS={unit:'kWp',period:'Annuale',duration:'',start:''};
