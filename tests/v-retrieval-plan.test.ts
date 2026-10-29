import { test } from "node:test";
import { strict as assert } from "node:assert";
import { memorySection } from "../lib/v-chat/continuity";
import { parsePlan, evidenceIndices, mergeEvidence } from "../lib/v-chat/retrieval-plan";
test("search plans validate and bound untrusted output", () => {
 assert.throws(()=>parsePlan({embedding_query: 2}));
 assert.equal(parsePlan({embedding_query:"x".repeat(3000),lexical_query:"continuidad OR frase"}).embedding_query.length,2000);
});
test("evidence must quote a real candidate and cannot invent references",()=>{
 const rows=[{content:"La frase de prueba de continuidad es lumamijuvisado; no es contraseña."}];
 assert.deepEqual(evidenceIndices({hits:[{index:0,evidence:"La frase de prueba de continuidad es lumamijuvisado"},{index:0,evidence:"La frase de prueba de continuidad es lumamijuvisado"},{index:12,evidence:rows[0].content},{index:0,evidence:"Una cita inventada que nunca existió"}]},rows),[0]);
 assert.deepEqual(evidenceIndices({hits:[]},rows),[]);
 assert.throws(()=>evidenceIndices({},rows));
});

test("context review preserves verified anchors and deduplicates evidence",()=>{
 const anchor={id:"original"}, context={id:"answer"};
 assert.deepEqual(mergeEvidence([anchor],[]),[anchor]);
 assert.deepEqual(mergeEvidence([anchor],[context,anchor]),[context,anchor]);
});

test("historical assistant success JSON is not treated as tool evidence",()=>{
 assert.match(memorySection({status:"available",sources:[]}),/JSON de éxito.*NO es un resultado verificado de herramienta/);
});
