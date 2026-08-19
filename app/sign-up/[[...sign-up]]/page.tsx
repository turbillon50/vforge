"use client";
export const dynamic = "force-dynamic";
import { SignUp, ClerkLoading, ClerkLoaded } from "@clerk/nextjs";
import { hasClerkPublishableKey } from "@/lib/auth/clerk-key";
import { ClerkPlaceholder } from "@/components/auth/ClerkPlaceholder";

const kineticAppearance = {
  variables: {
    colorPrimary: "#00F0FF",
    colorText: "#e5e2e1",
    colorTextSecondary: "#b9cacb",
    colorBackground: "#131313",
    colorInputBackground: "#0A0A0A",
    colorInputText: "#00F0FF",
    colorDanger: "#ffb4ab",
    borderRadius: "4px",
    fontFamily: "'Inter', -apple-system, sans-serif",
  },
  elements: {
    rootBox: { width: "100%" },
    card: { background: "#131313", border: "1px solid rgba(30,41,59,0.2)", boxShadow: "0 0 15px rgba(0,240,255,0.05)", borderRadius: "4px" },
    headerTitle: { color: "#fff", fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 700 },
    headerSubtitle: { color: "#b9cacb" },
    socialButtonsBlockButton: {
      border: "1px solid rgba(255,255,255,0.1)", background: "#0A0A0A", color: "#e5e2e1", boxShadow: "none",
      "&:hover": { background: "#1c1b1b", borderColor: "rgba(0,240,255,0.4)" },
    },
    socialButtonsBlockButtonText: { color: "#e5e2e1", fontWeight: 500 },
    dividerLine: { background: "rgba(30,41,59,0.3)" },
    dividerText: { color: "#849495", fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", letterSpacing: "0.1em" },
    formFieldLabel: { color: "#b9cacb", fontWeight: 500, fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase" as const },
    formFieldInput: {
      border: "1px solid rgba(30,41,59,0.4)", background: "#0A0A0A", color: "#00F0FF", boxShadow: "none",
      fontFamily: "'JetBrains Mono', monospace",
      "&:focus": { border: "1px solid #00F0FF", boxShadow: "0 0 10px rgba(0,240,255,0.15)" },
    },
    formButtonPrimary: {
      background: "#00F0FF", color: "#0A0A0A", boxShadow: "none", textTransform: "none" as const, fontWeight: 700,
      fontFamily: "'Hanken Grotesk', sans-serif",
      "&:hover": { background: "#7df4ff" },
    },
    footerActionText: { color: "#849495" },
    footerActionLink: { color: "#00F0FF", fontWeight: 600 },
    identityPreview: { border: "1px solid rgba(30,41,59,0.3)" },
    logoBox: { display: "none" },
  },
} as const;

export default function SignUpPage() {
  const clerkEnabled = hasClerkPublishableKey();
  return (
    <>
      <style>{`
        .su-root{background:#0A0A0A;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:Inter,-apple-system,sans-serif;position:relative}
        .su-root::before{content:"";position:absolute;inset:0;background-image:linear-gradient(to right,rgba(30,41,59,.08) 1px,transparent 1px),linear-gradient(to bottom,rgba(30,41,59,.08) 1px,transparent 1px);background-size:40px 40px;pointer-events:none}
        .su-mono{font-family:'JetBrains Mono',monospace}
        .su-corner::before{content:"";position:absolute;top:-1px;left:-1px;width:10px;height:10px;border-top:2px solid #00F0FF;border-left:2px solid #00F0FF}
        .su-corner::after{content:"";position:absolute;bottom:-1px;right:-1px;width:10px;height:10px;border-bottom:2px solid #00F0FF;border-right:2px solid #00F0FF}
      `}</style>
      <div className="su-root">
        <div style={{position:'absolute',top:0,left:0,width:'100%',height:2,background:'#00F0FF',opacity:.4}}/>
        <div style={{position:'relative',zIndex:10,width:'100%',maxWidth:400,padding:'0 20px'}}>
          <div style={{textAlign:'center',marginBottom:32}}>
            <p className="su-mono" style={{color:'#00F0FF',fontSize:12,letterSpacing:'0.1em',fontWeight:700,marginBottom:8}}>
              NEW OPERATOR
            </p>
            <h1 style={{color:'#fff',fontSize:32,fontWeight:700,fontFamily:"'Hanken Grotesk',sans-serif",letterSpacing:'-0.02em',marginBottom:8}}>
              Join <span style={{color:'#00F0FF'}}>VForge</span>
            </h1>
            <p style={{color:'#b9cacb',fontSize:14}}>Create your account to start building</p>
          </div>
          <div className="su-corner" style={{position:'relative',padding:4}}>
            {clerkEnabled ? (
              <>
                <ClerkLoading>
                  <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'40vh',gap:16,background:'#131313',padding:32}}>
                    <svg viewBox="0 0 24 24" width="34" height="34" fill="#00F0FF" style={{animation:'pulse 2s ease infinite'}}>
                      <path d="M2 3h20L12 21z"/>
                    </svg>
                    <p className="su-mono" style={{color:'#849495',fontSize:10,letterSpacing:'0.3em'}}>INITIALIZING_</p>
                  </div>
                </ClerkLoading>
                <ClerkLoaded>
                  <SignUp appearance={kineticAppearance} />
                </ClerkLoaded>
              </>
            ) : (
              <ClerkPlaceholder mode="sign-up" />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
