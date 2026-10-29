import { requireOperatorAuth, authFailureResponse } from '@/lib/auth/operator-token';
import { parseParadoxInput } from '@/lib/v-chat/paradox-bridge';
import { getVMessages, getVTurn, persistVTurn } from '@/lib/v-chat/store';
import { loadVMemory } from '@/lib/v-chat/memory';
import { selectVMemory, memorySection, safeHistory } from '@/lib/v-chat/continuity';
import { originIdentitySection } from '@/lib/v-chat/origin-identity';
import { V_TEXT_SYSTEM_PROMPT } from '@/lib/forge/v-text-persona';
export const runtime = 'nodejs';
export const maxDuration = 120;
const headers = {'Cache-Control':'no-store'};
export async function POST(req: Request) {
  const access = requireOperatorAuth(req);
  if (!access.ok) return authFailureResponse(access);
  const b = parseParadoxInput(await req.json().catch(() => null));
  if (!b) return Response.json({error:'Solicitud de continuidad inválida.'},{status:400,headers});
  try {
    const history = await getVMessages(b.session_id, undefined, 24);
    const existing = await getVTurn(b.session_id,b.turn_id);
    if (existing) {
      if (existing.userText !== b.message || (b.action === 'commit' && existing.reply !== b.answer))
        return Response.json({error:'El identificador ya pertenece a otro turno.'},{status:409,headers});
      return Response.json({ok:true,persisted:true,cached:true,reply:existing.reply,model:existing.model},{headers});
    }
    if (b.action === 'commit') {
      await persistVTurn({sessionId:b.session_id,turnId:b.turn_id,userText:b.message,assistantText:b.answer!,model:b.model});
      const saved=await getVTurn(b.session_id,b.turn_id);
      if (!saved || saved.reply !== b.answer) throw new Error('CONTINUITY_CONFLICT');
      return Response.json({ok:true,persisted:true,reply:saved.reply,model:saved.model},{headers});
    }
    const memory=selectVMemory(await loadVMemory(b.message,process.env.V_MEMORY_USER_ID));
    return Response.json({ok:true,identity:'v-shuri',coverage:'available_archive_partial',
      system:originIdentitySection()+'\n\n'+V_TEXT_SYSTEM_PROMPT+'\n\n'+memorySection(memory),
      history:safeHistory(history),
      memory:{status:memory.status,sources:memory.sources.map(({id,source,at,ref})=>({id,source,at,...(ref?{ref}:{})}))}
    },{headers});
  } catch {
    return Response.json({error:'No se pudo verificar la continuidad de V.'},{status:503,headers});
  }
}
