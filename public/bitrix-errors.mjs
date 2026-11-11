export function bitrixErrorMessage(error,depth=0){
 if(typeof error==='string'&&error)return error;
 if(!error||typeof error!=='object'||depth>4)return '';
 const keys=['error_description','description','message','error','code','ex','data','response','result'];
 for(const key of keys){const value=error[key];if(typeof value==='string'&&value)return value;}
 for(const key of keys){const value=error[key];if(value&&typeof value==='object'){const message=bitrixErrorMessage(value,depth+1);if(message)return message;}}
 return '';
}
