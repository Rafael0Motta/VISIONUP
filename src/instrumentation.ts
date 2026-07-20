export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // @supabase/supabase-js >= 2.110 exige WebSocket nativo (Node 22+).
    // Ambientes em Node 20 (LTS anterior) quebram na construção do client
    // mesmo sem usar Realtime. Polyfill via 'ws' até a migração para Node 22.
    if (!globalThis.WebSocket) {
      const { default: WebSocket } = await import("ws");
      // @ts-expect-error 'ws' não implementa o construtor exatamente como o DOM lib
      globalThis.WebSocket = WebSocket;
    }

    // Sweep de retry de webhooks — roda em processo (sem depender de cron do
    // SO/Docker). `global` guarda o estado porque o dev server do Next.js
    // pode re-executar register() em hot-reload; sem essa trava agendaríamos
    // o cron várias vezes.
    const g = globalThis as unknown as { __visionupWebhookCronStarted?: boolean };
    if (!g.__visionupWebhookCronStarted) {
      g.__visionupWebhookCronStarted = true;
      const cron = await import("node-cron");
      const { processPendingDeliveries } = await import("@/lib/webhooks/process");

      cron.default.schedule("*/2 * * * *", async () => {
        try {
          const { processed } = await processPendingDeliveries();
          if (processed > 0) {
            console.log(`[webhooks] processadas ${processed} entrega(s) pendente(s)`);
          }
        } catch (err) {
          console.error("[webhooks] erro no sweep de retry:", err);
        }
      });

      console.log("[webhooks] cron de retry agendado (a cada 2 minutos)");
    }
  }
}
