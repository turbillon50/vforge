import test from "node:test";
import assert from "node:assert/strict";
import { spaceSchema, type SpaceModule } from "../lib/spaces/model";
const node = (id: string, dependsOn: string[] = []): SpaceModule => ({id,dependsOn,title:id,kind:"analysis",status:"pending",responsible:"",prompt:"",result:"",evidence:"",x:0,y:0});
test("a project can start without infrastructure or modules",()=>assert.ok(spaceSchema.safeParse({context:"Brief",modules:[]}).success));
test("rejects missing dependencies and duplicate identifiers",()=>{assert.equal(spaceSchema.safeParse({context:"",modules:[node("a",["missing"])]}).success,false);assert.equal(spaceSchema.safeParse({context:"",modules:[node("a"),node("a")]}).success,false);});
test("rejects cycles",()=>assert.equal(spaceSchema.safeParse({context:"",modules:[node("a",["b"]),node("b",["a"])]}).success,false));
test("completion requires evidence and completed dependencies",()=>{const a={...node("a"),status:"done",result:"passed",evidence:"test report"};assert.equal(spaceSchema.safeParse({context:"",modules:[{...a,evidence:""}]}).success,false);assert.equal(spaceSchema.safeParse({context:"",modules:[{...a,dependsOn:["b"]},node("b")]}).success,false);assert.ok(spaceSchema.safeParse({context:"",modules:[a]}).success);});
