"use client";
export const dynamic = "force-dynamic";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * VForge Onboarding — ported from Stitch design (Kinetic Forge theme).
 * Auth column shows Clerk user state. Stack connections are wired to real OAuth.
 * IGNITE FORGE button goes to /app/chat.
 */
export default function OnboardingPage() {
  const { isSignedIn, user, isLoaded } = useUser();
  const router = useRouter();

  // If not signed in, redirect to sign-in
  useEffect(() => {
    if (isLoaded && !isSignedIn) router.push("/sign-in");
  }, [isLoaded, isSignedIn, router]);

  const connectGitHub = () => router.push("/api/auth/github/start");
  const connectVercel = () => router.push("/api/auth/vercel/start");
  const igniteForge = () => router.push("/app/chat");

  if (!isLoaded) return null;

  return (
    <>
      <style>{`
        .ob-root{background:#0A0A0A;color:#e5e2e1;font-family:Inter,-apple-system,sans-serif;min-height:100vh}
        .ob-root *{box-sizing:border-box}
        .ob-mono{font-family:'JetBrains Mono',monospace}
        .ob-hanken{font-family:'Hanken Grotesk',Inter,sans-serif}
        .ob-plasma{color:#00F0FF}
        .ob-grid-bg{background-image:linear-gradient(to right,rgba(30,41,59,.1) 1px,transparent 1px),linear-gradient(to bottom,rgba(30,41,59,.1) 1px,transparent 1px);background-size:40px 40px}
        .ob-scanline{position:relative;overflow:hidden}
        .ob-scanline::after{content:"";position:absolute;top:0;left:0;width:100%;height:20px;background:linear-gradient(to bottom,transparent,rgba(0,240,255,.1),transparent);animation:ob-scan 3s linear infinite}
        @keyframes ob-scan{0%{transform:translateY(-100%)}100%{transform:translateY(100%)}}
        .ob-corner::before{content:"";position:absolute;top:-1px;left:-1px;width:10px;height:10px;border-top:2px solid #00F0FF;border-left:2px solid #00F0FF}
        .ob-kinetic{border:1px solid rgba(0,240,255,.2);transition:all .3s}
        .ob-kinetic:hover{border-color:rgba(0,240,255,.6);box-shadow:0 0 15px rgba(0,240,255,.1)}
        .ob-label{font-family:'JetBrains Mono',monospace;font-size:12px;line-height:1.2;letter-spacing:.1em;font-weight:700;text-transform:uppercase;color:#00F0FF}
        .ob-body{font-size:16px;line-height:1.6;color:#b9cacb}
        .ob-headline{font-family:'Hanken Grotesk',sans-serif;font-weight:700}
        .ob-btn{width:100%;height:48px;display:flex;align-items:center;justify-content:center;gap:12px;font-weight:600;border-radius:4px;cursor:pointer;transition:all .15s;border:none;font-size:14px}
        .ob-btn:active{transform:scale(.95)}
        .ob-btn-white{background:#fff;color:#0A0A0A}.ob-btn-white:hover{background:#e5e2e1}
        .ob-btn-gh{background:#24292F;color:#fff;border:1px solid rgba(255,255,255,.1)}.ob-btn-gh:hover{background:#2c3138}
        .ob-btn-vc{background:#0A0A0A;color:#fff;border:1px solid rgba(255,255,255,.2)}.ob-btn-vc:hover{background:#353534}
        .ob-btn-x{background:#000;color:#fff;border:1px solid rgba(255,255,255,.1)}.ob-btn-x:hover{opacity:.8}
        .ob-ignite{background:#00F0FF;padding:32px;display:flex;flex-direction:column;justify-content:space-between;cursor:pointer;transition:all .3s;min-height:200px}
        .ob-ignite:hover{background:#7df4ff}
        .ob-tile{width:56px;height:56px;background:#2a2a2a;border:1px solid rgba(30,41,59,.3);border-radius:8px;display:flex;align-items:center;justify-content:center}
        .ob-tile:hover{border-color:rgba(0,240,255,.6);box-shadow:0 0 15px rgba(0,240,255,.1)}
        .ob-check{display:inline-flex;align-items:center;gap:8px;color:#34d399;font-size:13px}
        .ob-check svg{width:16px;height:16px;fill:#34d399}
        @media(max-width:768px){.ob-header-nav{display:none}.ob-grid{grid-template-columns:1fr!important}}
      `}</style>

      <div className="ob-root ob-grid-bg">
        {/* Header */}
        <header style={{position:'fixed',top:0,width:'100%',zIndex:50,display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0 64px',height:64,background:'rgba(10,10,10,.6)',backdropFilter:'blur(24px)',boxShadow:'0 0 15px rgba(0,240,255,.1)'}}>
          <div style={{display:'flex',alignItems:'center',gap:32}}>
            <span className="ob-hanken ob-plasma" style={{fontSize:32,letterSpacing:'-0.04em',fontWeight:700}}>VForge</span>
            <nav className="ob-header-nav" style={{display:'flex',gap:24}}>
              <a className="ob-label" style={{borderBottom:'2px solid #00F0FF',paddingBottom:4}} href="#">Onboarding</a>
              <a className="ob-label" style={{color:'#b9cacb',borderBottom:'none'}} href="#">Catálogo</a>
              <a className="ob-label" style={{color:'#b9cacb',borderBottom:'none'}} href="#">Forge Hub</a>
            </nav>
          </div>
        </header>

        <main style={{position:'relative',paddingTop:128,paddingBottom:96,paddingLeft:16,paddingRight:16,maxWidth:1280,margin:'0 auto'}}>
          {/* Hero */}
          <section style={{marginBottom:64,textAlign:'center'}}>
            <div style={{display:'inline-flex',alignItems:'center',gap:8,padding:'4px 12px',background:'rgba(0,240,255,.1)',border:'1px solid rgba(0,240,255,.2)',borderRadius:9999,marginBottom:24}}>
              <span style={{width:8,height:8,borderRadius:'50%',background:'#00F0FF',animation:'ob-scan 2s ease infinite'}}/>
              <span className="ob-label">System Ignition Phase 01</span>
            </div>
            <h1 className="ob-headline" style={{fontSize:48,lineHeight:1.2,letterSpacing:'-0.02em',color:'#fff',marginBottom:16}}>
              Initialize Your <span className="ob-plasma">VForge</span> Environment
            </h1>
            <p className="ob-body" style={{maxWidth:640,margin:'0 auto'}}>
              Power up your production line. Connect your tech stack and provide the context for our AI to begin synthesizing your industrial-grade application.
            </p>
          </section>

          {/* Main Grid */}
          <div className="ob-grid" style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:24}}>
            {/* Col 1: Identity */}
            <div style={{display:'flex',flexDirection:'column',gap:24}}>
              <div className="ob-scanline ob-corner" style={{position:'relative',background:'rgba(15,23,42,.4)',border:'1px solid rgba(30,41,59,.2)',padding:32}}>
                <h3 className="ob-label" style={{marginBottom:24,display:'flex',alignItems:'center',gap:8}}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="#00F0FF"><path d="M17.81 4.47c-.08 0-.16-.02-.23-.06C15.66 3.42 14 3 12.01 3c-1.98 0-3.86.47-5.57 1.41-.24.13-.54.04-.68-.2-.13-.24-.04-.55.2-.68C7.82 2.52 9.86 2 12.01 2c2.13 0 3.99.47 6.03 1.52.25.13.34.43.21.67-.09.18-.26.28-.44.28zM3.5 9.72c-.1 0-.2-.03-.29-.09-.23-.16-.28-.47-.12-.7.99-1.4 2.25-2.51 3.75-3.3C8.44 4.81 10.16 4.39 12 4.39s3.56.42 5.15 1.24c1.5.79 2.76 1.9 3.75 3.3.16.22.11.54-.12.7-.23.16-.54.11-.7-.12-.9-1.26-2.04-2.27-3.39-2.98-1.44-.76-3.03-1.14-4.69-1.14s-3.25.39-4.69 1.14c-1.35.71-2.49 1.72-3.4 2.98-.09.13-.24.21-.41.21zm6.5 12.78c-.13 0-.26-.05-.35-.15-.87-.87-1.34-1.43-2.01-2.64-.69-1.23-1.05-2.73-1.05-4.34 0-2.97 2.54-5.39 5.66-5.39s5.66 2.42 5.66 5.39c0 .28-.22.5-.5.5s-.5-.22-.5-.5c0-2.42-2.09-4.39-4.66-4.39-2.57 0-4.66 1.97-4.66 4.39 0 1.44.32 2.77.93 3.85.64 1.15 1.08 1.64 1.85 2.42.19.2.19.51 0 .71-.11.1-.24.15-.37.15zm7.5-1.5c-1.19 0-2.36-.45-3.28-1.26-.36-.32-.53-.65-.53-1.04 0-.37.16-.71.52-1.06.36-.35.71-.52 1.07-.52.39 0 .72.17 1.03.52.33.36.72.55 1.19.55.47 0 .87-.19 1.2-.55.31-.35.64-.52 1.03-.52.36 0 .71.17 1.07.52.36.35.52.69.52 1.06 0 .39-.17.72-.53 1.04-.92.81-2.09 1.26-3.29 1.26z"/></svg>
                  IDENTITY AUTHENTICATION
                </h3>

                {/* User authenticated state */}
                {isSignedIn && user ? (
                  <div style={{display:'flex',flexDirection:'column',gap:16}}>
                    <div className="ob-check">
                      <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                      Authenticated as {user.firstName || user.username}
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:12,padding:12,background:'rgba(10,10,10,.6)',border:'1px solid rgba(30,41,59,.2)',borderRadius:4}}>
                      {user.imageUrl && <img src={user.imageUrl} alt="" style={{width:36,height:36,borderRadius:'50%',border:'2px solid #34d399'}}/>}
                      <div>
                        <div style={{fontSize:14,fontWeight:500,color:'#fff'}}>{user.fullName || user.username}</div>
                        <div className="ob-mono" style={{fontSize:11,color:'#849495'}}>{user.primaryEmailAddress?.emailAddress}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{display:'flex',flexDirection:'column',gap:12}}>
                    <button className="ob-btn ob-btn-white" onClick={() => router.push('/sign-in')}>
                      Continue with Google
                    </button>
                    <div style={{display:'flex',gap:12}}>
                      <button className="ob-btn ob-btn-gh" style={{flex:1}} onClick={connectGitHub}>
                        <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
                        GitHub
                      </button>
                      <button className="ob-btn ob-btn-vc" style={{flex:1}} onClick={connectVercel}>
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M24 22.525H0l12-21.05z"/></svg>
                        Vercel
                      </button>
                      <button className="ob-btn ob-btn-x" style={{flex:1}}>
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                        X / Twitter
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* System Logs */}
              <div style={{background:'rgba(14,14,14,.8)',backdropFilter:'blur(24px)',border:'1px solid rgba(30,41,59,.2)',padding:24,flex:1}}>
                <h3 className="ob-label" style={{color:'#b9cacb',marginBottom:16}}>SYSTEM LOGS</h3>
                <div className="ob-mono" style={{fontSize:12,display:'flex',flexDirection:'column',gap:12}}>
                  <div style={{display:'flex',gap:12}}><span style={{color:'#34d399'}}>[{new Date().toLocaleTimeString()}]</span><span style={{color:'#34d399'}}>AUTH_SERVICE: {isSignedIn ? 'AUTHENTICATED' : 'STANDBY'}</span></div>
                  <div style={{display:'flex',gap:12}}><span style={{color:'#00F0FF'}}>[{new Date().toLocaleTimeString()}]</span><span style={{color:'#00F0FF'}}>FORGE_CORE: INITIALIZING HUD...</span></div>
                  <div style={{display:'flex',gap:12,opacity:.5}}><span>[{new Date().toLocaleTimeString()}]</span><span>WAITING FOR OPERATOR INPUT_</span></div>
                </div>
              </div>
            </div>

            {/* Col 2: Context + Stack */}
            <div style={{display:'flex',flexDirection:'column',gap:24}}>
              {/* Context Upload */}
              <div style={{background:'rgba(15,23,42,.4)',border:'2px dashed rgba(0,240,255,.3)',padding:40,display:'flex',flexDirection:'column',alignItems:'center',textAlign:'center',position:'relative'}}>
                <div style={{position:'absolute',top:16,left:16}} className="ob-mono ob-plasma" >[CONTEXT_UPLOADER_V1]</div>
                <div style={{width:64,height:64,background:'rgba(0,240,255,.1)',border:'1px solid rgba(0,240,255,.3)',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:24}}>
                  <svg viewBox="0 0 24 24" width="32" height="32" fill="#00F0FF"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11zM8 15.01l1.41 1.41L11 14.84V19h2v-4.16l1.59 1.59L16 15.01 12.01 11z"/></svg>
                </div>
                <h2 className="ob-headline" style={{fontSize:24,color:'#fff',marginBottom:8}}>Upload Minimal Context</h2>
                <p className="ob-body" style={{maxWidth:480,marginBottom:32}}>Drop PRDs, napkin sketches, or logic diagrams. Our AI Forge will amplify these into high-fidelity technical specs.</p>
                <div style={{display:'flex',gap:16}}>
                  {['.PDF','.FIG','.DOCX','IMAGES'].map(f=>(
                    <span key={f} className="ob-mono" style={{padding:'4px 12px',background:'#2a2a2a',border:'1px solid rgba(30,41,59,.3)',borderRadius:2,fontSize:12,color:'#b9cacb'}}>{f}</span>
                  ))}
                </div>
              </div>

              {/* Stack + IGNITE */}
              <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:24}}>
                {/* Production Stack */}
                <div style={{background:'rgba(15,23,42,.4)',border:'1px solid rgba(30,41,59,.2)',padding:32,position:'relative',overflow:'hidden'}}>
                  <h3 className="ob-label" style={{marginBottom:16}}>PRODUCTION STACK</h3>
                  <div style={{display:'flex',flexWrap:'wrap',gap:16}}>
                    <div className="ob-tile ob-kinetic" onClick={connectGitHub} style={{cursor:'pointer'}}>
                      <svg viewBox="0 0 16 16" width="24" height="24" fill="#b9cacb"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
                    </div>
                    <div className="ob-tile ob-kinetic" onClick={connectVercel} style={{cursor:'pointer'}}>
                      <svg viewBox="0 0 24 24" width="24" height="24" fill="#b9cacb"><path d="M24 22.525H0l12-21.05z"/></svg>
                    </div>
                    <div className="ob-tile ob-kinetic">
                      <svg viewBox="0 0 24 24" width="24" height="24" fill="#b9cacb"><path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/></svg>
                    </div>
                    <div className="ob-tile ob-kinetic">
                      <svg viewBox="0 0 24 24" width="24" height="24" fill="#00F0FF"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                    </div>
                  </div>
                  <p className="ob-mono" style={{fontSize:12,color:'#b9cacb',marginTop:24,fontStyle:'italic'}}>Auto-configuring: GitHub Actions, Vercel Deployment Hooks, Stripe Webhooks.</p>
                </div>

                {/* IGNITE FORGE */}
                <div className="ob-ignite" onClick={igniteForge}>
                  <div>
                    <h4 className="ob-hanken" style={{color:'#0A0A0A',fontSize:32,lineHeight:1.1,fontWeight:700,marginBottom:8}}>IGNITE FORGE</h4>
                    <p className="ob-mono" style={{color:'rgba(10,10,10,.7)',fontSize:12,fontWeight:700}}>READY FOR SYNTHESIS</p>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:16}}>
                    <svg viewBox="0 0 24 24" width="40" height="40" fill="#0A0A0A"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></svg>
                    <span className="ob-mono" style={{fontSize:10,color:'#0A0A0A',border:'1px solid rgba(10,10,10,.2)',padding:'4px 8px'}}>PHASE_01_OK</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Mobile Nav */}
        <nav style={{position:'fixed',bottom:0,width:'100%',background:'rgba(10,10,10,.9)',backdropFilter:'blur(24px)',display:'flex',justifyContent:'space-around',padding:'16px 0',borderTop:'1px solid rgba(30,41,59,.2)',zIndex:50}} className="ob-mobile-nav">
          <button style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,color:'#00F0FF',background:'none',border:'none',cursor:'pointer'}}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>
            <span className="ob-mono" style={{fontSize:10}}>IGNITION</span>
          </button>
          <button style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,color:'#b9cacb',background:'none',border:'none',cursor:'pointer'}}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M11.99 18.54l-7.37-5.73L3 14.07l9 7 9-7-1.63-1.27-7.38 5.74zM12 16l7.36-5.73L21 9l-9-7-9 7 1.63 1.27L12 16z"/></svg>
            <span className="ob-mono" style={{fontSize:10}}>STACK</span>
          </button>
          <button style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,color:'#b9cacb',background:'none',border:'none',cursor:'pointer'}}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/></svg>
            <span className="ob-mono" style={{fontSize:10}}>HELP</span>
          </button>
        </nav>

        {/* Footer */}
        <footer style={{width:'100%',padding:16,paddingLeft:64,paddingRight:64,display:'flex',justifyContent:'space-between',alignItems:'center',background:'#0A0A0A',borderTop:'1px solid rgba(30,41,59,.1)'}}>
          <span className="ob-mono" style={{fontSize:14,color:'#506076'}}>© 2026 FORGE INDUSTRIAL SYSTEMS. ALL RIGHTS RESERVED.</span>
        </footer>
      </div>
    </>
  );
}
