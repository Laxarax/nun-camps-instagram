const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=process.cwd(),site=path.join(root,'dist');
const config=JSON.parse(fs.readFileSync(path.join(root,'config.json'),'utf8'));
fs.mkdirSync(site,{recursive:true});fs.mkdirSync(path.join(site,'assets'),{recursive:true});
const ctx={};vm.createContext(ctx);
for(const name of ['CampArtwork.js','LogoData.js'])vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),ctx);
const posters={};
for(const [id,uri] of Object.entries(ctx.getCampPosters_())){
 const [,type,data]=uri.match(/^data:image\/([^;]+);base64,(.*)$/s),filename=id+'.'+(type==='jpeg'?'jpg':type);
 fs.writeFileSync(path.join(site,'assets',filename),Buffer.from(data,'base64'));posters[id]='./assets/'+filename;
}
const logo=ctx.getLogoDataUri_(),[,type,data]=logo.match(/^data:image\/([^;]+);base64,(.*)$/s);
fs.writeFileSync(path.join(site,'assets','logo.'+type),Buffer.from(data,'base64'));
let html=fs.readFileSync(path.join(root,'Index.html'),'utf8').replace('<head>', '<head><meta name="referrer" content="no-referrer">');
html=html.replace('<?!= logo ?>','./assets/logo.'+type).replace('<?!= campPosters ?>',JSON.stringify(posters)).replace('<?!= bootstrap ?>',`{page:new URLSearchParams(location.search).get('page')||'camps',id:new URLSearchParams(location.search).get('id')||'',key:new URLSearchParams(location.search).get('key')||''}`);
const start=html.indexOf('  function call(name,args)'),end=html.indexOf('\n  function store',start);
if(start<0||end<0)throw new Error('Registration adapter location changed.');
html=html.slice(0,start)+`  var google={script:{history:{replace:function(_,params){var url=new URL(location.href);url.search='';Object.keys(params).forEach(function(key){url.searchParams.set(key,params[key]);});history.replaceState(null,'',url.href);}}}};
  async function call(name,args){
    var response=await fetch(${JSON.stringify(config.apiUrl)},{method:'POST',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify({method:name,args:args||[]}),credentials:'omit',redirect:'follow'});
    if(!response.ok)throw new Error('Connection interrupted. Please try again.');
    var result=await response.json();if(!result.ok)throw new Error(result.message||'Please try again.');return result.data;
  }`+html.slice(end);
fs.writeFileSync(path.join(site,'index.html'),html);
console.log('Standalone mirror built.');
