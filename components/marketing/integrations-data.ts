import type { ComponentType, SVGProps } from "react";
import {
  GitHubLogo,
  VercelLogo,
  V0Logo,
  AnthropicLogo,
  OpenAILogo,
  N8nLogo,
  StripeLogo,
  AirtableLogo,
  NeonLogo,
  ClerkLogo,
  ResendLogo,
  ElevenLabsLogo,
  TwilioLogo,
  GoogleMapsLogo,
  MercadoPagoLogo,
} from "@/components/brand/logos/ServiceLogos";

export type Integration = {
  id: string;
  name: string;
  Logo: ComponentType<SVGProps<SVGSVGElement>>;
  brandColor: string;
  blurb: string;
  connectHref: string;
  video: string | null;
};

// video: embed de YouTube del video OFICIAL del servicio (canal oficial/confiable).
// Si no se encontro uno confiable, video: null (no se inventa link).
export const INTEGRATIONS: Integration[] = [
  {
    id: "github",
    name: "GitHub",
    Logo: GitHubLogo,
    brandColor: "#ffffff",
    blurb:
      "Conecta tu repositorio y VForge versiona cada cambio que genera. Tu codigo vive donde ya trabajas, listo para hacer deploy.",
    connectHref: "/api/auth/github/start",
    video: "https://www.youtube.com/embed/pBy1zgt0XPc",
  },
  {
    id: "vercel",
    name: "Vercel",
    Logo: VercelLogo,
    brandColor: "#ffffff",
    blurb:
      "Publica tu app en segundos. VForge hace deploy a Vercel con cada iteracion y te entrega una URL en vivo al instante.",
    connectHref: "/api/auth/vercel/start",
    video: null,
  },
  {
    id: "v0",
    name: "v0",
    Logo: V0Logo,
    brandColor: "#ffffff",
    blurb:
      "Genera interfaces premium a partir de un prompt. VForge usa v0 para darle forma visual a tus ideas antes de construirlas.",
    connectHref: "/app/integrations",
    video: null,
  },
  {
    id: "claude",
    name: "Claude",
    Logo: AnthropicLogo,
    brandColor: "#D97757",
    blurb:
      "El cerebro de VForge. Claude de Anthropic razona, escribe codigo y orquesta tus herramientas con criterio real.",
    connectHref: "/app/integrations",
    video: null,
  },
  {
    id: "openai",
    name: "OpenAI",
    Logo: OpenAILogo,
    brandColor: "#ffffff",
    blurb:
      "Suma los modelos GPT al flujo. VForge los usa para generar contenido, clasificar y completar tareas dentro de tu app.",
    connectHref: "/app/integrations",
    video: "https://www.youtube.com/embed/DQacCB9tDaw",
  },
  {
    id: "n8n",
    name: "n8n",
    Logo: N8nLogo,
    brandColor: "#EA4B71",
    blurb:
      "Automatiza todo lo que pasa despues. VForge dispara flujos en n8n para conectar tu app con cientos de servicios.",
    connectHref: "/app/integrations",
    video: null,
  },
  {
    id: "stripe",
    name: "Stripe",
    Logo: StripeLogo,
    brandColor: "#635BFF",
    blurb:
      "Cobra desde el dia uno. VForge integra pagos, suscripciones y checkout de Stripe sin que toques una linea de codigo.",
    connectHref: "/api/auth/stripe/start",
    video: "https://www.youtube.com/embed/UshLbThjDFE",
  },
  {
    id: "airtable",
    name: "Airtable",
    Logo: AirtableLogo,
    brandColor: "#FFB400",
    blurb:
      "Tu base de datos visual. VForge lee y escribe en Airtable para que gestiones tu informacion como en una hoja de calculo.",
    connectHref: "/app/integrations",
    video: null,
  },
  {
    id: "neon",
    name: "Neon",
    Logo: NeonLogo,
    brandColor: "#00E699",
    blurb:
      "Postgres serverless para tu app. VForge provisiona y conecta tu base de datos Neon lista para escalar al instante.",
    connectHref: "/app/integrations",
    video: "https://www.youtube.com/embed/llSTZMVrbx8",
  },
  {
    id: "clerk",
    name: "Clerk",
    Logo: ClerkLogo,
    brandColor: "#6C47FF",
    blurb:
      "Login y usuarios sin friccion. VForge integra autenticacion completa de Clerk en tu app en minutos.",
    connectHref: "/app/integrations",
    video: null,
  },
  {
    id: "resend",
    name: "Resend",
    Logo: ResendLogo,
    brandColor: "#ffffff",
    blurb:
      "Correos que llegan a la bandeja. VForge envia emails transaccionales con Resend desde tu app sin configurar servidores.",
    connectHref: "/app/integrations",
    video: "https://www.youtube.com/embed/HyDwVN1AFwY",
  },
  {
    id: "elevenlabs",
    name: "ElevenLabs",
    Logo: ElevenLabsLogo,
    brandColor: "#ffffff",
    blurb:
      "Voz con calidad de estudio. VForge usa ElevenLabs para narrar, doblar y darle voz a lo que construyas.",
    connectHref: "/app/integrations",
    video: null,
  },
  {
    id: "twilio",
    name: "Twilio",
    Logo: TwilioLogo,
    brandColor: "#F22F46",
    blurb:
      "SMS, WhatsApp y llamadas. VForge conecta Twilio para que tu app hable con tus usuarios por cualquier canal.",
    connectHref: "/app/integrations",
    video: "https://www.youtube.com/embed/Fi754mNLv9g",
  },
  {
    id: "googlemaps",
    name: "Google Maps",
    Logo: GoogleMapsLogo,
    brandColor: "#4285F4",
    blurb:
      "Mapas, lugares y rutas. VForge integra Google Maps para que tu app ubique, busque y trace caminos en tiempo real.",
    connectHref: "/app/integrations",
    video: "https://www.youtube.com/embed/kA679ERgBV4",
  },
  {
    id: "mercadopago",
    name: "Mercado Pago",
    Logo: MercadoPagoLogo,
    brandColor: "#00B1EA",
    blurb:
      "Pagos para Latinoamerica. VForge integra Mercado Pago para cobrar con tarjeta, efectivo y saldo en tu region.",
    connectHref: "/app/integrations",
    video: "https://www.youtube.com/embed/obHLKu6UOLQ",
  },
];
