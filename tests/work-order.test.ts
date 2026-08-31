import assert from "node:assert/strict";
import test from "node:test";
import { looksLikeWorkOrder } from "../lib/live/work-order";

test("no dispara con conversación normal, por larga que sea", () => {
  assert.equal(looksLikeWorkOrder("hola"), false);
  assert.equal(looksLikeWorkOrder("listo"), false);
  assert.equal(
    looksLikeWorkOrder(
      "oye V, el hero de la landing se ve apretado en móvil y el contraste del nav está bajo, ¿qué opinas del espaciado?",
    ),
    false,
  );
  assert.equal(
    looksLikeWorkOrder("me late el diseño, dime qué cambiarías del composer del chat"),
    false,
  );
});

test("dispara sólo con orden explícita de mandar el trabajo", () => {
  assert.equal(looksLikeWorkOrder("mándalo a Hetzner"), true);
  assert.equal(looksLikeWorkOrder("manda esto a la fabrica"), true);
  assert.equal(looksLikeWorkOrder("encólalo, que salga el trabajo"), true);
  assert.equal(looksLikeWorkOrder("que lo haga grok en el servidor"), true);
  assert.equal(looksLikeWorkOrder("ponlo en cola por favor"), true);
});

test("hablar de Hetzner no es ordenar trabajo", () => {
  assert.equal(looksLikeWorkOrder("¿está vivo Hetzner?"), false);
  assert.equal(looksLikeWorkOrder("qué es la fabrica y para qué sirve grok"), false);
});
