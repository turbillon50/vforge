import Link from 'next/link'

export default function Hero() {
  return (
    <section style={{ position:'relative', minHeight:'100vh', display:'flex', alignItems:'center', overflow:'hidden', background:'#050a14' }}>
      <div style={{ position:'absolute', inset:0, backgroundImage:'url(/hero/hero-waves.png)', backgroundSize:'cover', backgroundPosition:'center', zIndex:0 }} />
      <div style={{ position:'absolute', inset:0, background:'rgba(5,10,20,0.78)', zIndex:1 }} />
      <div style={{ position:'relative', zIndex:2, maxWidth:'1200px', margin:'0 auto', padding:'96px 24px 120px', width:'100%' }}>
        <div style={{ marginBottom:'20px' }}>
          <span style={{ display:'inline-flex', alignItems:'center', gap:'6px', padding:'5px 14px', borderRadius:'999px', border:'1px solid rgba(96, 165, 250, 0.3)', background:'rgba(59, 130, 246, 0.08)', color:'#93c5fd', fontSize:'12px', fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase' }}>
            <span style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#60a5fa', display:'inline-block' }}/>
            PLATAFORMA MCP - BETA ABIERTA
          </span>
        </div>
        <h1 style={{ fontSize:'clamp(2.6rem, 6vw, 5rem)', fontWeight:800, lineHeight:1.08, marginBottom:'28px', letterSpacing:'-0.03em', color:'#f0f4ff' }}>
          La conexion vital entre{' '}
          <span style={{ background:'linear-gradient(90deg, #60a5fa 0%, #a78bfa 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
            Git, Vercel y tus agentes
          </span>
        </h1>
        <p style={{ fontSize:'1.1rem', color:'rgba(200, 215, 255, 0.75)', maxWidth:'560px', lineHeight:1.65, marginBottom:'48px' }}>
          VForge conecta tus repositorios, deployments y modelos de IA en un solo flujo. Construye, despliega y automatiza con el poder del protocolo MCP.
        </p>
        <div style={{ display:'flex', gap:'16px', flexWrap:'wrap' }}>
          <Link href="/sign-up" style={{ padding:'14px 32px', borderRadius:'10px', background:'linear-gradient(135deg, #3b82f6 0%, #6d28d9 100%)', color:'#fff', fontWeight:700, fontSize:'1rem', textDecoration:'none' }}>
            Empieza gratis
          </Link>
          <Link href="/labs" style={{ padding:'14px 32px', borderRadius:'10px', border:'1px solid rgba(167, 139, 250, 0.4)', background:'rgba(109, 40, 217, 0.12)', color:'#c4b5fd', fontWeight:600, fontSize:'1rem', textDecoration:'none' }}>
            Ver stack tecnico
          </Link>
        </div>
      </div>
    </section>
  )
}
