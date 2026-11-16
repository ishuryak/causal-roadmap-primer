const fs=require('node:fs'),path=require('node:path'),esbuild=require('esbuild');
const root=__dirname,read=file=>fs.readFileSync(path.join(root,'src',file),'utf8').replace(/\r\n/g,'\n');
// Bundle the pinned renderer inside the document. No runtime imports or CDN.
const three=esbuild.buildSync({stdin:{contents:"import * as THREE from 'three'; window.THREE=THREE;",resolveDir:root},bundle:true,write:false,format:'iife',platform:'browser',target:'es2020',minify:true,legalComments:'inline'}).outputFiles[0].text;
const license=fs.readFileSync(path.join(root,'node_modules/three/LICENSE'),'utf8');
let html=read('index.html');
if(html.split('/* THREE_JS */').length!==2)throw new Error('Missing or duplicate renderer marker');
html=html.replace('/* THREE_JS */',()=> '/*! Three.js 0.187.0\n'+license+'*/\n'+three.replace(/<\/script/gi,'<\\/script'));
for(const [marker,file] of [['/* APP_CSS */','style.css'],['/* PRIMER_CONFIG */','primer-config.js'],['/* GAME_MODEL */','game-model.js'],['/* SCENE_JS */','scene.js'],['/* APP_JS */','app.js']]){
 if(html.split(marker).length!==2)throw new Error('Missing or duplicate build marker '+marker);
 const source=read(file);if(/<\/script/i.test(source))throw new Error('Unexpected script close in '+file);html=html.replace(marker,()=>source);
}
if(/<(?:script|link)[^>]+(?:src|href)=/i.test(html))throw new Error('External runtime dependency found');
const output=path.join(root,'index.html');// The embedded edition needs only index.html.

fs.writeFileSync(path.join(root,'index.html'),html,'utf8');
console.log(`Built ${output} (${Math.round(Buffer.byteLength(html)/1024)} KB), with all code and artwork embedded.`);
