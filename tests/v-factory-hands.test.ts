import test from "node:test";
import assert from "node:assert/strict";
import { wantsFactoryHands } from "../lib/live/v-factory-hands";
import { modeSystemRules } from "../lib/forge/ask-v-policy";

test("factory hands trigger on skills and brain", () => {
  assert.equal(wantsFactoryHands("cuántas skills hay en el vault"), true);
  assert.equal(wantsFactoryHands("hola qué sigue"), false);
});

test("talk never asks the owner for curl", () => {
  assert.match(modeSystemRules("talk"), /curl/i);
  // La regla se endureció de "no pidas" a "Nunca pidas"; la aserción se
  // quedó con el literal viejo y nadie lo vio porque este archivo llevaba
  // meses sin ejecutarse.
  assert.match(modeSystemRules("talk"), /nunca pidas/i);
});
