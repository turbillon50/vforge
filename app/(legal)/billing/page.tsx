export const metadata = { title: "Política de Facturación — VForge" };

export default function BillingPage() {
  return (
    <>
      <p className="eyebrow">Legal · All Global Holding LLC</p>
      <h1>Política de Facturación y Pagos</h1>
      <p className="muted">Vigente desde el 1 de junio de 2026</p>

      <h2>1. Ciclos de facturación</h2>
      <p>Los planes de pago (Studio y Forge) se facturan de forma mensual o anual según la opción elegida al momento de la suscripción. La fecha de facturación es el día en que activaste tu plan. Los planes anuales se cobran en un único pago al inicio del período.</p>

      <h2>2. Métodos de pago aceptados</h2>
      <p>Aceptamos tarjetas de crédito y débito Visa, Mastercard y American Express a través de Stripe. En México y América Latina también aceptamos Mercado Pago (tarjetas, OXXO Pay, transferencias bancarias). Los pagos se procesan en USD; tu banco puede aplicar tipos de cambio.</p>

      <h2>3. Renovación automática</h2>
      <p>Las suscripciones se renuevan automáticamente al final de cada período. Recibirás un correo de recordatorio 7 días antes. Puedes cancelar la renovación automática en cualquier momento desde Ajustes → Billing.</p>

      <h2>4. Reembolsos</h2>
      <p>El plan Explorer (gratuito) no aplica para reembolsos. Para planes de pago: los primeros 7 días desde la activación tienen garantía de devolución completa sin preguntas. Después de ese período, no se realizan reembolsos proporcionales por cancelación anticipada. En casos de fallo técnico atribuible a VForge, se evaluará un crédito o extensión de período caso por caso.</p>

      <h2>5. Impuestos</h2>
      <p>Los precios listados no incluyen impuestos locales, IVA o impuestos de ventas. Eres responsable de pagar los impuestos aplicables en tu jurisdicción. Para clientes en México, los pagos con RFC incluyen factura electrónica (CFDI) bajo solicitud a <a href="mailto:billing@vforge.site" className="text-violet-400 hover:underline">billing@vforge.site</a>.</p>

      <h2>6. Cambios de plan</h2>
      <p>Puedes cambiar de plan en cualquier momento. Al subir de plan, se cobra inmediatamente el diferencial proporcional al tiempo restante del período. Al bajar de plan, el cambio aplica al inicio del siguiente período de facturación.</p>

      <h2>7. Suspensión por impago</h2>
      <p>Si un pago falla, recibirás notificaciones en los días 1, 3 y 7 tras el vencimiento. Después de 7 días sin pago, la cuenta se degrada automáticamente al plan Explorer. Los datos se conservan por 30 días adicionales para permitir reactivación.</p>

      <h2>8. Contacto de facturación</h2>
      <p>Para facturas, comprobantes o disputas de cargo: <a href="mailto:billing@vforge.site" className="text-violet-400 hover:underline">billing@vforge.site</a> · All Global Holding LLC · CLABE: 722969010740807451.</p>
    </>
  );
}
