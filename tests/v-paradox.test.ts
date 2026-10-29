import test from 'node:test';
import assert from 'node:assert/strict';
import {parseParadoxInput} from '../lib/v-chat/paradox-bridge';
const b={action:'context',session_id:'paradox_v_'+'a'.repeat(32),turn_id:'12345678-1234-1234-1234-123456789012',message:' hola '};
test('Paradox cannot select another surface or malformed identity',()=>{
  assert.equal(parseParadoxInput({...b,session_id:'vs_123'}),null);
  assert.equal(parseParadoxInput({...b,turn_id:'x'}),null);
  assert.equal(parseParadoxInput({...b,message:' '.repeat(1501)}),null);
  assert.equal(parseParadoxInput(b)?.message,'hola');
});
test('persisted answers require a real nonempty bounded response and model label',()=>{
  assert.equal(parseParadoxInput({...b,action:'commit'}),null);
  assert.equal(parseParadoxInput({...b,action:'commit',answer:'hola',model:'cerebras:gpt-oss-120b'})?.answer,'hola');
  assert.equal(parseParadoxInput({...b,action:'commit',answer:'hola',model:'<script>'}),null);
});
