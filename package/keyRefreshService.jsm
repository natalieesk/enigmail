/*global Components: false */

"use strict";

const EXPORTED_SYMBOLS = ["EnigmailKeyRefreshService"];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://enigmail/log.jsm"); /*global EnigmailLog: false */
Cu.import("resource://enigmail/keyRing.jsm"); /*global EnigmailKeyRing: false */
Cu.import("resource://enigmail/rng.jsm"); /*global EnigmailRNG: false */
Cu.import("resource://enigmail/prefs.jsm"); /*global EnigmailPrefs: false */
Cu.import("resource://enigmail/keyserver.jsm"); /*global EnigmailKeyServer: false */
Cu.import("resource://enigmail/keyserverUris.jsm"); /*global EnigmailKeyserverURIs: false */

const ONE_HOUR_IN_MILLISEC = 60 * 60 * 1000;

let timer = null;
function getTimer() {
  if (timer === null) timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
  return timer;
}
const HOURS_PER_WEEK_ENIGMAIL_IS_ON_PREF = "hoursPerWeekEnigmailIsOn";

function calculateMaxTimeForRefreshInMilliseconds(totalPublicKeys) {
  const millisecondsAvailableForRefresh = EnigmailPrefs.getPref(HOURS_PER_WEEK_ENIGMAIL_IS_ON_PREF) * ONE_HOUR_IN_MILLISEC;
  return Math.floor(millisecondsAvailableForRefresh / totalPublicKeys);
}

function calculateWaitTimeInMilliseconds(totalPublicKeys) {
  const randomNumber = EnigmailRNG.getUint32();
  const maxTimeForRefresh = calculateMaxTimeForRefreshInMilliseconds(totalPublicKeys);

  EnigmailLog.DEBUG("[KEY REFRESH SERVICE]: Wait time = random number: "+ randomNumber + " % max time for refresh: " + maxTimeForRefresh + "\n");

  const millisec = randomNumber % maxTimeForRefresh;

  EnigmailLog.DEBUG("[KEY REFRESH SERVICE]: Time until next refresh in milliseconds: "+ millisec + "\n");

  return millisec;
}

function refreshKey() {
  const timer = getTimer();
  refreshWith(EnigmailKeyServer, timer, true);
}

function restartTimerInOneHour(timer){
  timer.initWithCallback(refreshKey,
    ONE_HOUR_IN_MILLISEC,
    Ci.nsITimer.TYPE_ONE_SHOT);
}

function setupNextRefresh(timer, waitTime){
  timer.initWithCallback(refreshKey,
    waitTime,
    Ci.nsITimer.TYPE_ONE_SHOT);
}

function logMissingInformation(keyIdsExist, validKeyserversExist){
  if (!keyIdsExist){
    EnigmailLog.DEBUG("[KEY REFRESH SERVICE]: No keys available to refresh yet. Will recheck in an hour.\n");
  }
  if (!validKeyserversExist){
    EnigmailLog.DEBUG("[KEY REFRESH SERVICE]: Either no keyservers exist or the protocols specified are invalid. Will recheck in an hour.\n");
  }
}

function getRandomKeyId(randomNumber) {
  const keyRingLength = EnigmailKeyRing.getAllKeys().keyList.length;

  if (keyRingLength === 0) {return null;}

  return EnigmailKeyRing.getAllKeys().keyList[randomNumber % keyRingLength].keyId;
}

function refreshKeyIfReady(keyserver, readyToRefresh, keyId){
  if (readyToRefresh) {
    keyserver.refresh(keyId);
  }
}

function refreshWith(keyserver, timer, readyToRefresh) {
  const keyId = getRandomKeyId(EnigmailRNG.getUint32());
  const keyIdsExist = keyId !== null;
  const validKeyserversExist = EnigmailKeyserverURIs.validKeyserversExist();

  if (keyIdsExist && validKeyserversExist){
    refreshKeyIfReady(keyserver, readyToRefresh, keyId);
    const waitTime = calculateWaitTimeInMilliseconds(EnigmailKeyRing.getAllKeys().keyList.length);
    setupNextRefresh(timer, waitTime);
  } else {
    logMissingInformation(keyIdsExist, validKeyserversExist);
    restartTimerInOneHour(timer);
  }
}

/**
 * Starts a process to continuously refresh keys on a random time interval
 *
 * This service does not keep state, it will restart each time Enigmail is initialized.
 */
function start(keyserver) {
  if (EnigmailPrefs.getPref("keyRefreshOn") === true){
    EnigmailLog.DEBUG("[KEY REFRESH SERVICE]: Started\n");
    const timer = getTimer();
    refreshWith(keyserver, timer, false);
  }
}

const EnigmailKeyRefreshService = {
  start: start
};
