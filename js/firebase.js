// Firebase + Cloud Firestore para el Jardín 3D.
// La recopilación queda desactivada hasta que el visitante acepte el aviso.

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

const CONSENT_KEY = "jardin_privacy_consent_v1";
const VISITOR_KEY = "jardin_visitor_id_v1";
const SESSION_KEY = "jardin_session_id_v1";
const CONSENT_VERSION = "1.0";

const panel = document.getElementById("privacy-consent");
const openButton = document.getElementById("privacy-settings");
const acceptButton = document.getElementById("privacy-accept");
const rejectButton = document.getElementById("privacy-reject");
const closeButton = document.getElementById("privacy-close");

function readConsent() {
  try {
    return localStorage.getItem(CONSENT_KEY);
  } catch {
    return null;
  }
}

function writeConsent(value) {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch (error) {
    console.warn("No se pudo guardar la preferencia de privacidad.", error);
  }
}

function randomId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function getStoredId(key) {
  try {
    let id = localStorage.getItem(key);
    if (!id) {
      id = randomId();
      localStorage.setItem(key, id);
    }
    return id;
  } catch {
    return randomId();
  }
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

function browserName(ua) {
  if (/Edg\//i.test(ua)) return "Edge";
  if (/OPR\//i.test(ua)) return "Opera";
  if (/Firefox\//i.test(ua)) return "Firefox";
  if (/Chrome\//i.test(ua)) return "Chrome";
  if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) return "Safari";
  return "Otro/no identificado";
}

function operatingSystem(ua) {
  if (/Windows NT 10/i.test(ua)) return "Windows";
  if (/Android/i.test(ua)) return "Android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
  if (/Mac OS X/i.test(ua)) return "macOS";
  if (/Linux/i.test(ua)) return "Linux";
  return "Otro/no identificado";
}

function deviceType(ua) {
  if (/iPad|Tablet/i.test(ua)) return "tablet";
  if (/Mobi|Android|iPhone/i.test(ua)) return "móvil";
  return "computadora";
}

function safeReferrerHost() {
  try {
    return document.referrer ? new URL(document.referrer).hostname.slice(0, 150) : "";
  } catch {
    return "";
  }
}

let visitRegisteredThisPage = false;

async function registerVisit() {
  // Una sola visita por carga de página y solo con aceptación explícita.
  if (readConsent() !== "accepted" || visitRegisteredThisPage) return;
  visitRegisteredThisPage = true;

  const ua = navigator.userAgent || "";
  const visitorId = getStoredId(VISITOR_KEY);
  const sessionId = getSessionId();

  const visit = {
    visitorId,
    sessionId,
    consentVersion: CONSENT_VERSION,
    visitedAt: serverTimestamp(),
    pagePath: (location.pathname || "/").slice(0, 300),
    referrerHost: safeReferrerHost(),
    language: (navigator.language || "").slice(0, 35),
    timeZone: (Intl.DateTimeFormat().resolvedOptions().timeZone || "").slice(0, 80),
    screen: `${Number(screen.width) || 0}x${Number(screen.height) || 0}`,
    device: deviceType(ua),
    browser: browserName(ua),
    operatingSystem: operatingSystem(ua)
  };

  try {
    await addDoc(collection(db, "visitas"), visit);
    console.info("Visita registrada de forma anónima en Firestore.");
  } catch (error) {
    // No mostramos detalles técnicos al visitante ni bloqueamos el jardín.
    console.warn("No se pudo registrar la visita en Firestore:", error.code || error.message);
  }
}

function showPrivacyPanel() {
  panel.hidden = false;
}

function hidePrivacyPanel() {
  panel.hidden = true;
}

acceptButton.addEventListener("click", () => {
  writeConsent("accepted");
  hidePrivacyPanel();
  registerVisit();
});

rejectButton.addEventListener("click", () => {
  writeConsent("rejected");
  try {
    localStorage.removeItem(VISITOR_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  } catch {}
  hidePrivacyPanel();
});

closeButton.addEventListener("click", hidePrivacyPanel);

openButton.addEventListener("click", showPrivacyPanel);

// Si nunca eligió, se muestra el aviso. Si ya eligió, respetamos esa decisión.
if (!readConsent()) {
  showPrivacyPanel();
} else if (readConsent() === "accepted") {
  registerVisit();
}

// Exponer solo una función mínima para permitir retirar el consentimiento
// desde la consola no es necesario: el botón de privacidad vuelve a abrir el aviso.
