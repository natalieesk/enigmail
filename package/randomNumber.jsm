/*global Components: false */
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

const EXPORTED_SYMBOLS = ["RandomNumberGenerator"];

const Cc = Components.classes;
const Ci = Components.interfaces;

const SECURITY_RANDOM_GENERATOR = "@mozilla.org/security/random-generator;1";

let rng = null;
function randomNumberGenerator() {
  if(rng === null) {
    rng = Cc[SECURITY_RANDOM_GENERATOR].createInstance(Ci.nsIRandomGenerator);
  }
  return rng;
}

function bytesToUInt(byteObject) {
  let randomNumber = new Uint32Array(1);
  randomNumber[0] += byteObject[0] << (8 * 3);
  randomNumber[0] += byteObject[1] << (8 * 2);
  randomNumber[0] += byteObject[2] << 8;
  randomNumber[0] += byteObject[3];
  return randomNumber[0];
}

function getUint32() {
  return bytesToUInt(randomNumberGenerator().generateRandomBytes(4));
}

const RandomNumberGenerator = {
  getUint32: getUint32
};
