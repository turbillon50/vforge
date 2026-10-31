import test from "node:test";
import assert from "node:assert/strict";
import { validatePhotos, photoReceipt, readPhotos } from "../lib/v-canonical/photos";
const photo = {name: "captura.png", mime: "image/png", data: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg=="};
test("accepts screenshots, rejects malformed and oversized attachments", () => {
 assert.equal(validatePhotos([photo]).length,1);
 assert.throws(()=>validatePhotos([{...photo,data:'data:image/png;base64,bad'}]));
 assert.throws(()=>validatePhotos([photo,photo,photo,photo]));
 assert.throws(()=>validatePhotos([{...photo,data:'x'.repeat(1100001)}]));
});
test("attachment receipt distinguishes image changes for idempotent retries", () => {
 assert.equal(photoReceipt('hola',[]),'hola');
 assert.equal(photoReceipt('hola',[photo]),photoReceipt('hola',[photo]));
 assert.notEqual(photoReceipt('hola',[photo]),photoReceipt('hola',[{...photo,data:photo.data+'x'}]));
});
test("passes actual image bytes to vision and rejects failed readers", async()=>{
 const previous=process.env.CEREBRAS_API_KEY;process.env.CEREBRAS_API_KEY='test-key';
 try {
 const result=await readPhotos([photo],async(_url,init)=>{const sent=JSON.parse(String(init?.body));assert.equal(sent.messages[1].content[1].image_url.url,photo.data);return new Response(JSON.stringify({choices:[{message:{content:'Cuadrado rojo'},finish_reason:'stop'}]}))});
 assert.equal(result,'Cuadrado rojo');
 await assert.rejects(()=>readPhotos([photo],async()=>new Response('{}',{status:503})),/V_PHOTO_READER/);
 }finally{if(previous===undefined)delete process.env.CEREBRAS_API_KEY;else process.env.CEREBRAS_API_KEY=previous}
});
