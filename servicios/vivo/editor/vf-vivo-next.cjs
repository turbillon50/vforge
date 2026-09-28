/**
 * conVivo(nextConfig) — envuelve la config de Next de un proyecto piloto para que,
 * SÓLO cuando el motor vivo lo arranca (VF_VIVO=1) y sólo en dev, se aplique el
 * loader que marca el JSX con archivo y línea.
 *
 * En producción y en cualquier build normal no hace absolutamente nada: devuelve
 * la config tal como llegó. Es el candado para que esto nunca toque el deploy.
 *
 * Uso en el next.config.mjs del proyecto:
 *
 *   import { createRequire } from "node:module";
 *   const require = createRequire(import.meta.url);
 *   const { conVivo } = require("./.vf-vivo/vf-vivo-next.cjs");
 *   export default conVivo(nextConfig);
 */

const path = require("node:path");

function conVivo(nextConfig = {}) {
  const activo = process.env.VF_VIVO === "1";
  if (!activo) return nextConfig;

  const anterior = nextConfig.webpack;

  return {
    ...nextConfig,
    webpack(config, contexto) {
      const salida = typeof anterior === "function" ? anterior(config, contexto) : config;

      // Sólo en el servidor de desarrollo, nunca en build de producción.
      if (!contexto.dev) return salida;

      salida.module = salida.module || {};
      salida.module.rules = salida.module.rules || [];
      salida.module.rules.push({
        test: /\.[jt]sx$/,
        exclude: /node_modules/,
        enforce: "pre",
        use: [{ loader: path.resolve(__dirname, "vf-src-loader.cjs") }],
      });

      return salida;
    },
  };
}

module.exports = { conVivo };
