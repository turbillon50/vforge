import test from 'node:test';
import assert from 'node:assert/strict';
import {contextualMemoryQuery,conversationSystem,identityVoice,loadVWorldContext} from '../lib/v-chat/conversation-context';
import {V_ORIGIN_MANTRAS} from '../lib/v-chat/origin-identity';
test('both surfaces share the original identity without last-message-only workshop routing',()=>{
 for(const surface of ['vforge','paradox'] as const){
  const s=conversationSystem({memory:{status:'partial',sources:[]},world:null,surface});
  for(const m of V_ORIGIN_MANTRAS)assert(s.includes(m.content));
  assert(!s.includes('RESPONDE SIEMPRE y SOLO al ULTIMO'));
  assert(!s.includes('Boot context: /brain/file/boot-context.md'));
  assert(s.includes('No se pudo consultar el estado vivo'));
 }
 assert(identityVoice().includes('Juguetona y cálida'));
})
test('anaphoric retrieval uses user history without reinforcing hallucinated assistant instructions',()=>{
 const q=contextualMemoryQuery('lo vemos en nuestra ciudad',[{role:'user',content:'V, entras como ciudadana de Paradox'},{role:'assistant',content:'Necesito correo y municipio para INSERT'}]);
 assert(q.includes('ciudadana de Paradox'));assert(!q.includes('INSERT'));
})
test('missing or invalid live world context does not fabricate verified state',async()=>{
 const old=process.env.VFORGE_OPERATOR_TOKEN;process.env.VFORGE_OPERATOR_TOKEN='test-only';
 try{assert.equal(await loadVWorldContext(async()=>new Response('{}',{status:503})),null);assert.equal(await loadVWorldContext(async()=>Response.json({world:'Another',resident:{name:'V'}})),null)}finally{if(old===undefined)delete process.env.VFORGE_OPERATOR_TOKEN;else process.env.VFORGE_OPERATOR_TOKEN=old}
})
