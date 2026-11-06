// Estadísticas técnicas de visita con minimización de datos.
// El navegador solo entrega el modelo del dispositivo si admite User-Agent Client Hints.
// No se usan técnicas de fingerprinting ni se solicita ubicación precisa.

import { initializeApp } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA8WdEdvKdo8coyyWpPBLYzAsKJB_jaKYw",
  authDomain: "jardin-385dd.firebaseapp.com",
  projectId: "jardin-385dd",
  storageBucket: "jardin-385dd.firebasestorage.app",
  messagingSenderId: "725574361137",
  appId: "1:725574361137:web:a5433bfa77c8ac0e00b510",
  measurementId: "G-WLD0VJPJW8"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const SESSION_KEY = "jardin_session_id_v2";
const OPT_OUT_KEY = "jardin_disable_statistics_v1";
const PRIVACY_NOTICE_VERSION = "2.0";

const privacyButton = document.getElementById("privacy-settings");
const privacyNotice = document.getElementById("privacy-notice");
const closePrivacyButton = document.getElementById("privacy-close");
const optOutButton = document.getElementById("privacy-optout");

function randomId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function getSessionId() {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = randomId();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return randomId();
  }
}

function browserFromUA(ua) {
  if (/Edg\//i.test(ua)) return "Edge";
  if (/OPR\//i.test(ua)) return "Opera";
  if (/Firefox\//i.test(ua)) return "Firefox";
  if (/CriOS\//i.test(ua)) return "Chrome iOS";
  if (/Chrome\//i.test(ua)) return "Chrome";
  if (/Safari\//i.test(ua)) return "Safari";
  return "No identificado";
}

function osFromUA(ua) {
  if (/Windows NT/i.test(ua)) return "Windows";
  if (/Android/i.test(ua)) return "Android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS/iPadOS";
  if (/Mac OS X/i.test(ua)) return "macOS";
  if (/Linux/i.test(ua)) return "Linux";
  return "No identificado";
}

function deviceFromUA(ua) {
  if (/iPad|Tablet/i.test(ua)) return "tablet";
  if (/Mobi|Android|iPhone/i.test(ua)) return "móvil";
  return "computadora";
}

async function getDeviceDetails() {
  const ua = navigator.userAgent || "";
  const fallback = {
    device: deviceFromUA(ua),
    deviceModel: "No disponible en este navegador",
    formFactor: "No disponible",
    operatingSystem: osFromUA(ua),
    platformVersion: "No disponible",
    browser: browserFromUA(ua),
    browserVersion: "No disponible"
  };

  // Chromium puede ofrecer el modelo mediante User-Agent Client Hints.
  // Safari y Firefox normalmente no exponen el modelo exacto.
  if (!navigator.userAgentData?.getHighEntropyValues) return fallback;

  try {
    const hints = await navigator.userAgentData.getHighEntropyValues([
      "model", "platformVersion", "formFactors", "fullVersionList"
    ]);
    const brands = (hints.fullVersionList || navigator.userAgentData.brands || [])
      .filter(item => !/Not.A.Brand/i.test(item.brand || ""));
    const primaryBrand = brands.find(item => /Google Chrome|Microsoft Edge|Opera/i.test(item.brand)) || brands[0];

    return {
      device: hints.mobile ? "móvil" : (hints.formFactors?.includes("Tablet") ? "tablet" : fallback.device),
      deviceModel: (hints.model || "").trim().slice(0, 100) || "No disponible en este navegador",
      formFactor: (hints.formFactors || []).join(", ").slice(0, 60) || "No disponible",
      operatingSystem: (hints.platform || fallback.operatingSystem).slice(0, 40),
      platformVersion: (hints.platformVersion || "No disponible").slice(0, 40),
      browser: (primaryBrand?.brand || fallback.browser).slice(0, 40),
      browserVersion: (primaryBrand?.version || "No disponible").slice(0, 30)
    };
  } catch {
    return fallback;
  }
}

function safeReferrerHost() {
  try {
    return document.referrer ? new URL(document.referrer).hostname.slice(0, 150) : "";
  } catch {
    return "";
  }
}

function togglePrivacyNotice(forceOpen) {
  const shouldOpen = typeof forceOpen === "boolean" ? forceOpen : privacyNotice.hidden;
  privacyNotice.hidden = !shouldOpen;
  privacyButton.setAttribute("aria-expanded", String(shouldOpen));
}

privacyButton.addEventListener("click", () => togglePrivacyNotice());
closePrivacyButton.addEventListener("click", () => togglePrivacyNotice(false));
try {
  if (localStorage.getItem(OPT_OUT_KEY) === "1") {
    optOutButton.textContent = "Estadísticas desactivadas para futuras visitas";
    optOutButton.disabled = true;
  }
} catch {}

optOutButton.addEventListener("click", () => {
  try { localStorage.setItem(OPT_OUT_KEY, "1"); } catch {}
  optOutButton.textContent = "Estadísticas desactivadas para futuras visitas";
  optOutButton.disabled = true;
});

let visitRegisteredThisPage = false;

async function registerVisit() {
  if (visitRegisteredThisPage) return;
  visitRegisteredThisPage = true;
  try { if (localStorage.getItem(OPT_OUT_KEY) === "1") return; } catch {}

  try {
    const details = await getDeviceDetails();
    const visit = {
      sessionId: getSessionId(),
      privacyNoticeVersion: PRIVACY_NOTICE_VERSION,
      visitedAt: serverTimestamp(),
      pagePath: (location.pathname || "/").slice(0, 300),
      referrerHost: safeReferrerHost(),
      language: (navigator.language || "").slice(0, 35),
      timeZone: (Intl.DateTimeFormat().resolvedOptions().timeZone || "").slice(0, 80),
      screen: `${Number(screen.width) || 0}x${Number(screen.height) || 0}`,
      viewport: `${Number(innerWidth) || 0}x${Number(innerHeight) || 0}`,
      ...details
    };

    await addDoc(collection(db, "visitas"), visit);
    console.info("Visita registrada en Firestore.");
  } catch (error) {
    console.warn("No se pudo registrar la visita en Firestore:", error.code || error.message);
  }
}

// Una escritura por carga de página; sessionId cambia al terminar la sesión.
registerVisit();
