import assert from 'node:assert/strict';
import test from 'node:test';
import { canAccessPersonalSpace, personalSpaceHref, type PersonalSpace } from '../lib/workspace/personal-policy';
import { projectPersonalInfrastructure } from '../lib/infra/personal-projection';
const space: PersonalSpace = { id:'acevedo',name:'Casa Acevedo',owner_clerk_user_id:'acevedo-user',owner_email:'casa1acevedo@gmail.com',assistant_name:'Selene',infra_house:'acevedo',memory_provider:'Obsidian',memory_status:'pending',memory_reference:null };
test('only the space principal or a verified platform owner can access it', () => {
 assert.equal(canAccessPersonalSpace({userId:'acevedo-user',email:space.owner_email,isPlatformOwner:false},space),true);
 assert.equal(canAccessPersonalSpace({userId:'luis-user',email:'dluisdelatorre@gmail.com',isPlatformOwner:true},space),true);
 assert.equal(canAccessPersonalSpace({userId:'other-user',email:space.owner_email,isPlatformOwner:false},space),false);
 assert.equal(canAccessPersonalSpace({userId:'other-user',email:'dluisdelatorre@gmail.com',isPlatformOwner:false},space),false);
 assert.equal(personalSpaceHref('a&space=luis'),'/workspace/casa?space=a%26space%3Dluis');
});
test('personal infrastructure excludes other houses and central endpoint inventory', () => {
 const result=projectPersonalInfrastructure({generatedAt:'2026-10-31T00:00:00Z',catalog:{status:'ok',projects:200},houses:[{id:'luis',name:'PRIVATE-LUIS',status:'ok',metamcp:{status:'ok',activeKeys:14,endpoints:[{name:'PRIVATE-ENDPOINT',namespace:'admin',authenticated:true,oauth:true,private:true}]}},{id:'acevedo',name:'Casa Acevedo',status:'ok',cpuCount:4,metamcp:{status:'ok',servers:12}}]},space);
 assert.equal(result?.house.id,'acevedo'); assert.equal(result?.house.cpuCount,4);
 assert.deepEqual(result?.gateway,{status:'ok',shared:true});
 const json=JSON.stringify(result); for(const forbidden of ['PRIVATE-LUIS','PRIVATE-ENDPOINT','activeKeys','servers','catalog']) assert.equal(json.includes(forbidden),false);
 assert.equal(projectPersonalInfrastructure({generatedAt:'2026-10-31T00:00:00Z',houses:[]},space),null);
});
