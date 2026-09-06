// =========================================================
// FRANCO SYSTEMS ERP CLASSIC CLOUD
// Backend Express + Supabase + DNI/RUC + PDF
// =========================================================

const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const PDFDocument = require("pdfkit");
const { createClient } = require("@supabase/supabase-js");

// Cargar .env desde la raíz; también admite backend/.env para compatibilidad.
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
if (!process.env.SUPABASE_URL && fs.existsSync(path.join(__dirname, ".env"))) {
  require("dotenv").config({ path: path.join(__dirname, ".env"), override: false });
}

const app = express();
const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, "..", "public");

app.set("trust proxy", 1);
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);
app.use(cors({ origin: true }));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: true,
  legacyHeaders: false,
});

const lookupLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

const SUPABASE_PUBLIC_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVER_KEY =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

function configReady() {
  return Boolean(
    process.env.SUPABASE_URL && SUPABASE_PUBLIC_KEY && SUPABASE_SERVER_KEY
  );
}

function supabaseAnon() {
  if (!configReady()) return null;
  return createClient(process.env.SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function supabaseAdmin() {
  if (!configReady()) return null;
  return createClient(
    process.env.SUPABASE_URL,
    SUPABASE_SERVER_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

const admin = supabaseAdmin();

// Sesión redundante: el navegador conserva el token en localStorage y el servidor
// también lo recibe mediante cookies HttpOnly. Esto evita perder la sesión si una
// actualización/PWA deja temporalmente al frontend sin el token en memoria local.
function readCookies(req) {
  const raw = String(req.headers.cookie || "");
  return raw.split(";").reduce((acc, part) => {
    const idx = part.indexOf("=");
    if (idx === -1) return acc;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (!key) return acc;
    try { acc[key] = decodeURIComponent(value); } catch { acc[key] = value; }
    return acc;
  }, {});
}

function sessionCookieOptions(maxAgeMs) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeMs,
  };
}

function setSessionCookies(res, session) {
  if (!session) return;
  if (session.access_token) {
    const expiresInMs = Math.max(Number(session.expires_in || 3600), 60) * 1000;
    res.cookie("fs_access", session.access_token, sessionCookieOptions(expiresInMs));
  }
  if (session.refresh_token) {
    res.cookie("fs_refresh", session.refresh_token, sessionCookieOptions(30 * 24 * 60 * 60 * 1000));
  }
}

function clearSessionCookies(res) {
  const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" };
  res.clearCookie("fs_access", options);
  res.clearCookie("fs_refresh", options);
}

function cleanText(value, max = 500) {
  return String(value ?? "").trim().slice(0, max);
}

function cleanDocument(value) {
  return String(value ?? "").replace(/\D/g, "").slice(0, 11);
}

function cleanNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function money(value) {
  return Math.round((cleanNumber(value) + Number.EPSILON) * 100) / 100;
}

function normalizeRole(role) {
  const value = String(role || "").toUpperCase();

  if (value === "SUPERADMIN") return "SUPERADMIN";
  if (value === "OPERADOR") return "OPERADOR";

  return "ADMIN";
}
function normalizeCompanyRole(role) {
  const value = String(role || "").toUpperCase();

  return value === "OPERADOR" ? "OPERADOR" : "ADMIN";
}
function calcQuote(items, documentType, discountPercentInput, priceModeInput) {
  const cleanItems = (Array.isArray(items) ? items : [])
    .map((item, index) => {
      const quantity = Math.max(cleanNumber(item.quantity, 0), 0);
      const unitPrice = Math.max(cleanNumber(item.unit_price, 0), 0);
      return {
        position: index + 1,
        unit: cleanText(item.unit || "UND", 20).toUpperCase() || "UND",
        code: cleanText(item.code, 80),
        description: cleanText(item.description, 1000),
        quantity,
        unit_price: money(unitPrice),
        line_total: money(quantity * unitPrice),
      };
    })
    .filter((item) => item.description && item.quantity > 0);

  // Regla CLÁSICA de Franco Systems v1.0:
  // conserva el modo clásico: precio CON_IGV o valor SIN_IGV.
  const subtotal = money(cleanItems.reduce((sum, item) => sum + item.line_total, 0));
  const type = ["FACTURA", "BOLETA", "RHE", "SIN_IGV"].includes(String(documentType || "").toUpperCase())
    ? String(documentType).toUpperCase() : "FACTURA";
  const priceMode = String(priceModeInput || "CON_IGV").toUpperCase() === "SIN_IGV" ? "SIN_IGV" : "CON_IGV";
  const discountPercent = Math.min(Math.max(cleanNumber(discountPercentInput, 0), 0), 100);
  const discount = money(subtotal * discountPercent / 100);
  const afterDiscount = money(subtotal - discount);

  let base = afterDiscount, igv = 0, retention = 0, total = afterDiscount;
  if (type === "RHE") {
    // Comportamiento del cotizador clásico: el RH no usa IGV.
    base = afterDiscount;
    retention = afterDiscount > 1500 ? money(afterDiscount * 0.08) : 0;
    total = money(afterDiscount - retention);
  } else if (type === "FACTURA" || type === "BOLETA") {
    if (priceMode === "CON_IGV") {
      total = afterDiscount;
      base = money(total / 1.18);
      igv = money(total - base);
    } else {
      base = afterDiscount;
      igv = money(base * 0.18);
      total = money(base + igv);
    }
  }

  return {
    items: cleanItems,
    document_type: type,
    price_mode: priceMode,
    subtotal_amount: subtotal,
    base_amount: base,
    igv_amount: igv,
    discount_percent: money(discountPercent),
    discount_amount: discount,
    retention_amount: retention,
    total_amount: total,
  };
}

function needAdmin(req, res, next) {
  if (!["ADMIN", "SUPERADMIN"].includes(req.profile?.role)) {
    return res.status(403).json({
      ok: false,
      message: "Solo un administrador puede realizar esta acción."
    });
  }

  next();
}
function needSuperAdmin(req, res, next) {
  if (req.profile?.role !== "SUPERADMIN") {
    return res.status(403).json({
      ok: false,
      message: "Acceso exclusivo para SUPERADMIN."
    });
  }

  next();
}

async function authRequired(req, res, next) {
  try {
    if (!configReady()) {
      return res.status(503).json({
        ok: false,
        code: "SETUP_REQUIRED",
        message: "Falta configurar Supabase en el servidor.",
      });
    }

    const header = String(req.headers.authorization || "");
    const bearerToken = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    const cookies = readCookies(req);
    const token = bearerToken || cookies.fs_access || "";
    if (!token) {
      return res.status(401).json({ ok: false, message: "Sesión no encontrada." });
    }

    const client = supabaseAnon();
    const { data: userData, error: userError } = await client.auth.getUser(token);
    if (userError || !userData?.user) {
      return res.status(401).json({ ok: false, message: "Sesión vencida o inválida." });
    }

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id, company_id, full_name, role, active")
      .eq("id", userData.user.id)
      .single();

    if (profileError || !profile || !profile.active) {
      return res.status(403).json({ ok: false, message: "Usuario sin acceso al sistema." });
    }

    req.authToken = token;
    req.user = userData.user;
    req.profile = profile;
    next();
  } catch (error) {
    console.error("authRequired:", error);
    res.status(500).json({ ok: false, message: "No se pudo validar la sesión." });
  }
}

// ---------------------------------------------------------
// HEALTH / SETUP
// ---------------------------------------------------------
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    app: "Franco Systems ERP",
    version: "1.0.0-classic-cloud",
    supabaseConfigured: configReady(),
    decolectaConfigured: Boolean(process.env.API_TOKEN),
  });
});

// ---------------------------------------------------------
// AUTH
// ---------------------------------------------------------
app.post("/api/auth/login", authLimiter, async (req, res) => {
  try {
    if (!configReady()) {
      return res.status(503).json({
        ok: false,
        code: "SETUP_REQUIRED",
        message: "Primero configura Supabase. Seguiremos ese paso juntos.",
      });
    }

    const email = cleanText(req.body.email, 250).toLowerCase();
    const password = String(req.body.password || "");
    if (!email || !password) {
      return res.status(400).json({ ok: false, message: "Ingresa correo y contraseña." });
    }

    const client = supabaseAnon();
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error || !data?.session) {
      return res.status(401).json({ ok: false, message: "Correo o contraseña incorrectos." });
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("full_name, role, active, company_id")
      .eq("id", data.user.id)
      .single();

    if (!profile?.active) {
      return res.status(403).json({ ok: false, message: "Tu usuario está desactivado." });
    }

    setSessionCookies(res, data.session);

    res.json({
      ok: true,
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      user: {
        id: data.user.id,
        email: data.user.email,
        full_name: profile?.full_name || data.user.email,
        role: profile?.role || "OPERADOR",
      },
    });
  } catch (error) {
    console.error("login:", error);
    res.status(500).json({ ok: false, message: "No se pudo iniciar sesión." });
  }
});

app.post("/api/auth/refresh", authLimiter, async (req, res) => {
  try {
    if (!configReady()) return res.status(503).json({ ok: false, message: "Supabase no configurado." });
    const cookies = readCookies(req);
    const refreshToken = String(req.body.refresh_token || cookies.fs_refresh || "");
    if (!refreshToken) return res.status(400).json({ ok: false, message: "Falta refresh token." });

    const client = supabaseAnon();
    const { data, error } = await client.auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data?.session) {
      clearSessionCookies(res);
      return res.status(401).json({ ok: false, message: "No se pudo renovar la sesión." });
    }
    setSessionCookies(res, data.session);
    res.json({
      ok: true,
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
    });
  } catch (error) {
    res.status(500).json({ ok: false, message: "No se pudo renovar la sesión." });
  }
});

app.post("/api/auth/logout", (req, res) => {
  clearSessionCookies(res);
  res.json({ ok: true });
});

app.get("/api/auth/me", authRequired, async (req, res) => {
  const { data: company } = await admin
    .from("companies")
    .select("id, name, ruc")
    .eq("id", req.profile.company_id)
    .single();

  res.json({
    ok: true,
    user: {
      id: req.user.id,
      email: req.user.email,
      full_name: req.profile.full_name,
      role: req.profile.role,
    },
    company: company || { id: req.profile.company_id, name: "Mi Empresa", ruc: "" },
  });
});

// ---------------------------------------------------------
// DNI / RUC - DECOLECTA
// ---------------------------------------------------------
app.get("/api/ruc/:numero", authRequired, lookupLimiter, async (req, res) => {
  const numero = cleanDocument(req.params.numero);
  if (!/^\d{11}$/.test(numero)) {
    return res.status(400).json({ ok: false, message: "El RUC debe tener 11 dígitos." });
  }
  if (!process.env.API_TOKEN) {
    return res.status(503).json({ ok: false, code: "API_TOKEN_REQUIRED", message: "Falta configurar API_TOKEN de Decolecta." });
  }
  try {
    const response = await axios.get("https://api.decolecta.com/v1/sunat/ruc", {
      params: { numero },
      headers: { Accept: "application/json", Authorization: `Bearer ${process.env.API_TOKEN}` },
      timeout: 15000,
    });
    res.json(response.data);
  } catch (error) {
    console.error("RUC:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      ok: false,
      message: "No se pudo consultar el RUC.",
      detail: error.response?.data || error.message,
    });
  }
});

app.get("/api/dni/:numero", authRequired, lookupLimiter, async (req, res) => {
  const numero = cleanDocument(req.params.numero);
  if (!/^\d{8}$/.test(numero)) {
    return res.status(400).json({ ok: false, message: "El DNI debe tener 8 dígitos." });
  }
  if (!process.env.API_TOKEN) {
    return res.status(503).json({ ok: false, code: "API_TOKEN_REQUIRED", message: "Falta configurar API_TOKEN de Decolecta." });
  }
  try {
    const response = await axios.get("https://api.decolecta.com/v1/reniec/dni", {
      params: { numero },
      headers: { Accept: "application/json", Authorization: `Bearer ${process.env.API_TOKEN}` },
      timeout: 15000,
    });
    res.json(response.data);
  } catch (error) {
    console.error("DNI:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      ok: false,
      message: "No se pudo consultar el DNI.",
      detail: error.response?.data || error.message,
    });
  }
});

// ---------------------------------------------------------
// CLIENTES
// ---------------------------------------------------------
app.get("/api/clients", authRequired, async (req, res) => {
  const search = cleanText(req.query.search, 120);
  let query = admin
    .from("clients")
    .select("*")
    .eq("company_id", req.profile.company_id)
    .order("name", { ascending: true });

  if (search) query = query.or(`name.ilike.%${search}%,document.ilike.%${search}%`);

  const { data, error } = await query.limit(500);
  if (error) return res.status(500).json({ ok: false, message: error.message });
  res.json({ ok: true, clients: data || [] });
});

app.post("/api/clients", authRequired, async (req, res) => {
  const document = cleanDocument(req.body.document);
  const name = cleanText(req.body.name, 250);
  if (![8, 11].includes(document.length) || !name) {
    return res.status(400).json({ ok: false, message: "Documento y nombre son obligatorios." });
  }

  const payload = {
    company_id: req.profile.company_id,
    document,
    client_type: document.length === 11 ? "EMPRESA" : "PERSONA",
    name,
    address: cleanText(req.body.address, 500),
    phone: cleanText(req.body.phone, 80),
    email: cleanText(req.body.email, 250),
  };

  const { data, error } = await admin.from("clients").insert(payload).select().single();
  if (error) {
    const msg = error.code === "23505" ? "Ya existe un cliente con ese DNI o RUC." : error.message;
    return res.status(400).json({ ok: false, message: msg });
  }
  res.status(201).json({ ok: true, client: data });
});

app.put("/api/clients/:id", authRequired, async (req, res) => {
  const document = cleanDocument(req.body.document);
  const name = cleanText(req.body.name, 250);
  if (![8, 11].includes(document.length) || !name) {
    return res.status(400).json({ ok: false, message: "Documento y nombre son obligatorios." });
  }

  const payload = {
    document,
    client_type: document.length === 11 ? "EMPRESA" : "PERSONA",
    name,
    address: cleanText(req.body.address, 500),
    phone: cleanText(req.body.phone, 80),
    email: cleanText(req.body.email, 250),
  };

  const { data, error } = await admin
    .from("clients")
    .update(payload)
    .eq("id", req.params.id)
    .eq("company_id", req.profile.company_id)
    .select()
    .single();

  if (error) return res.status(400).json({ ok: false, message: error.message });
  res.json({ ok: true, client: data });
});

app.delete("/api/clients/:id", authRequired, needAdmin, async (req, res) => {
  const { error } = await admin
    .from("clients")
    .delete()
    .eq("id", req.params.id)
    .eq("company_id", req.profile.company_id);
  if (error) return res.status(400).json({ ok: false, message: error.message });
  res.json({ ok: true });
});

// ---------------------------------------------------------
// PRODUCTOS
// ---------------------------------------------------------
app.get("/api/products", authRequired, async (req, res) => {
  const search = cleanText(req.query.search, 120);
  let query = admin
    .from("products")
    .select("*")
    .eq("company_id", req.profile.company_id)
    .order("description", { ascending: true });

  if (search) query = query.or(`description.ilike.%${search}%,code.ilike.%${search}%`);
  const { data, error } = await query.limit(1000);
  if (error) return res.status(500).json({ ok: false, message: error.message });
  res.json({ ok: true, products: data || [] });
});

app.post("/api/products", authRequired, async (req, res) => {
  const description = cleanText(req.body.description, 500);
  if (!description) return res.status(400).json({ ok: false, message: "La descripción es obligatoria." });

  const basePrice = money(Math.max(cleanNumber(req.body.base_price), 0));
  const priceWithIgv = money(Math.max(cleanNumber(req.body.price_with_igv ?? req.body.unit_price), 0));
  const payload = {
    company_id: req.profile.company_id,
    code: cleanText(req.body.code, 80),
    unit: cleanText(req.body.unit || "UND", 20).toUpperCase() || "UND",
    description,
    item_type: ["PRODUCTO", "SERVICIO"].includes(String(req.body.item_type || "").toUpperCase()) ? String(req.body.item_type).toUpperCase() : "PRODUCTO",
    currency: ["SOLES", "DOLARES"].includes(String(req.body.currency || "").toUpperCase()) ? String(req.body.currency).toUpperCase() : "SOLES",
    price_mode: ["SIN_IGV", "CON_IGV"].includes(String(req.body.price_mode || "").toUpperCase()) ? String(req.body.price_mode).toUpperCase() : "CON_IGV",
    base_price: basePrice,
    price_with_igv: priceWithIgv,
    notes: cleanText(req.body.notes, 1000),
    unit_price: priceWithIgv,
    active: req.body.active !== false,
  };

  const { data, error } = await admin.from("products").insert(payload).select().single();
  if (error) return res.status(400).json({ ok: false, message: error.message });
  res.status(201).json({ ok: true, product: data });
});

app.put("/api/products/:id", authRequired, async (req, res) => {
  const description = cleanText(req.body.description, 500);
  if (!description) return res.status(400).json({ ok: false, message: "La descripción es obligatoria." });

  const basePrice = money(Math.max(cleanNumber(req.body.base_price), 0));
  const priceWithIgv = money(Math.max(cleanNumber(req.body.price_with_igv ?? req.body.unit_price), 0));
  const payload = {
    code: cleanText(req.body.code, 80),
    unit: cleanText(req.body.unit || "UND", 20).toUpperCase() || "UND",
    description,
    item_type: ["PRODUCTO", "SERVICIO"].includes(String(req.body.item_type || "").toUpperCase()) ? String(req.body.item_type).toUpperCase() : "PRODUCTO",
    currency: ["SOLES", "DOLARES"].includes(String(req.body.currency || "").toUpperCase()) ? String(req.body.currency).toUpperCase() : "SOLES",
    price_mode: ["SIN_IGV", "CON_IGV"].includes(String(req.body.price_mode || "").toUpperCase()) ? String(req.body.price_mode).toUpperCase() : "CON_IGV",
    base_price: basePrice,
    price_with_igv: priceWithIgv,
    notes: cleanText(req.body.notes, 1000),
    unit_price: priceWithIgv,
    active: req.body.active !== false,
  };

  const { data, error } = await admin
    .from("products")
    .update(payload)
    .eq("id", req.params.id)
    .eq("company_id", req.profile.company_id)
    .select()
    .single();

  if (error) return res.status(400).json({ ok: false, message: error.message });
  res.json({ ok: true, product: data });
});

app.delete("/api/products/:id", authRequired, needAdmin, async (req, res) => {
  const { error } = await admin
    .from("products")
    .delete()
    .eq("id", req.params.id)
    .eq("company_id", req.profile.company_id);
  if (error) return res.status(400).json({ ok: false, message: error.message });
  res.json({ ok: true });
});

// ---------------------------------------------------------
// CONFIGURACIÓN
// ---------------------------------------------------------
app.get("/api/settings", authRequired, async (req, res) => {
  const [{ data: company, error: cError }, { data: settings, error: sError }] = await Promise.all([
    admin.from("companies").select("*").eq("id", req.profile.company_id).single(),
    admin.from("settings").select("*").eq("company_id", req.profile.company_id).single(),
  ]);

  if (cError || sError) {
    return res.status(500).json({ ok: false, message: cError?.message || sError?.message });
  }
  res.json({ ok: true, company, settings });
});

app.put("/api/settings", authRequired, needAdmin, async (req, res) => {
  const name = cleanText(req.body.name, 250);
  if (!name) return res.status(400).json({ ok: false, message: "La razón social es obligatoria." });

  const ruc = cleanDocument(req.body.ruc);
  if (ruc && ruc.length !== 11) {
    return res.status(400).json({ ok: false, message: "El RUC debe tener 11 dígitos." });
  }

  const logo = String(req.body.logo_data_url || "");
  if (logo.length > 1_500_000) {
    return res.status(400).json({ ok: false, message: "El logo es demasiado pesado. Usa una imagen menor a 1 MB." });
  }

  const { error: cError } = await admin
    .from("companies")
    .update({ name, ruc })
    .eq("id", req.profile.company_id);

  if (cError) return res.status(400).json({ ok: false, message: cError.message });

  const payload = {
    company_id: req.profile.company_id,
    phone: cleanText(req.body.phone, 80),
    address: cleanText(req.body.address, 500),
    location: cleanText(req.body.location, 250),
    email: cleanText(req.body.email, 250),
    responsible: cleanText(req.body.responsible, 250),
    responsible_role: cleanText(req.body.responsible_role, 250),
    final_message: cleanText(req.body.final_message, 1000),
    logo_data_url: logo,
    bank_bcp: cleanText(req.body.bank_bcp, 250),
    bank_bbva: cleanText(req.body.bank_bbva, 250),
    bank_interbank: cleanText(req.body.bank_interbank, 250),
    bank_scotiabank: cleanText(req.body.bank_scotiabank, 250),
    yape: cleanText(req.body.yape, 100),
    plin: cleanText(req.body.plin, 100),
    payment_methods: (Array.isArray(req.body.payment_methods) ? req.body.payment_methods : []).slice(0, 12).map((m) => ({
      id: cleanText(m.id, 80),
      kind: ["BANCO","BILLETERA"].includes(cleanText(m.kind, 20).toUpperCase()) ? cleanText(m.kind, 20).toUpperCase() : "",
      type: cleanText(m.type, 50).toUpperCase(),
      entity: cleanText(m.entity, 50).toUpperCase(),
      custom_name: cleanText(m.custom_name, 100).toUpperCase(),
      currency: cleanText(m.currency, 40),
      account: cleanText(m.account, 80),
      number: cleanText(m.number, 80),
      cci: cleanText(m.cci, 80),
      holder: cleanText(m.holder, 150),
      logo: String(m.logo || "").slice(0, 1_500_000),
      enabled: m.enabled !== false,
    })),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await admin
    .from("settings")
    .upsert(payload, { onConflict: "company_id" })
    .select()
    .single();

  if (error) return res.status(400).json({ ok: false, message: error.message });
  res.json({ ok: true, settings: data });
});

// ---------------------------------------------------------
// USUARIOS Y ROLES
// ---------------------------------------------------------
app.get("/api/users", authRequired, needAdmin, async (req, res) => {
  const { data, error } = await admin
    .from("profiles")
    .select("id, full_name, role, active, created_at")
    .eq("company_id", req.profile.company_id)
    .order("created_at", { ascending: true });

  if (error) return res.status(500).json({ ok: false, message: error.message });

  const users = [];
  for (const profile of data || []) {
    const { data: authData } = await admin.auth.admin.getUserById(profile.id);
    users.push({
      ...profile,
      email: authData?.user?.email || "",
    });
  }
  res.json({ ok: true, users });
});

app.post("/api/users", authRequired, needAdmin, async (req, res) => {
  const email = cleanText(req.body.email, 250).toLowerCase();
  const password = String(req.body.password || "");
  const fullName = cleanText(req.body.full_name, 250) || email.split("@")[0];
  const role = normalizeCompanyRole(req.body.role);

  if (!email.includes("@") || password.length < 6) {
    return res.status(400).json({ ok: false, message: "Usa un correo válido y una contraseña de al menos 6 caracteres." });
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, company_name: "Temporal" },
  });

  if (createError || !created?.user) {
    return res.status(400).json({ ok: false, message: createError?.message || "No se pudo crear el usuario." });
  }

  const userId = created.user.id;
  const { data: tempProfile } = await admin
    .from("profiles")
    .select("company_id")
    .eq("id", userId)
    .single();

  const tempCompany = tempProfile?.company_id;

  const { error: updateError } = await admin
    .from("profiles")
    .update({
      company_id: req.profile.company_id,
      full_name: fullName,
      role,
      active: true,
    })
    .eq("id", userId);

  if (updateError) {
    await admin.auth.admin.deleteUser(userId);
    return res.status(400).json({ ok: false, message: updateError.message });
  }

  if (tempCompany && tempCompany !== req.profile.company_id) {
    await admin.from("companies").delete().eq("id", tempCompany);
  }

  res.status(201).json({ ok: true, user: { id: userId, email, full_name: fullName, role } });
});

app.patch("/api/users/:id", authRequired, needAdmin, async (req, res) => {
  if (req.params.id === req.user.id && req.body.active === false) {
    return res.status(400).json({ ok: false, message: "No puedes desactivar tu propio usuario." });
  }

  const payload = {};
  if (req.body.full_name !== undefined) payload.full_name = cleanText(req.body.full_name, 250);
  if (req.body.role !== undefined) payload.role = normalizeCompanyRole(req.body.role);
  if (req.body.active !== undefined) payload.active = Boolean(req.body.active);

  const { data, error } = await admin
    .from("profiles")
    .update(payload)
    .eq("id", req.params.id)
    .eq("company_id", req.profile.company_id)
    .select()
    .single();

  if (error) return res.status(400).json({ ok: false, message: error.message });
  res.json({ ok: true, user: data });
});

app.delete("/api/users/:id", authRequired, needAdmin, async (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ ok: false, message: "No puedes eliminar tu propio usuario." });
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("id", req.params.id)
    .eq("company_id", req.profile.company_id)
    .single();

  if (!profile) return res.status(404).json({ ok: false, message: "Usuario no encontrado." });

  const { error } = await admin.auth.admin.deleteUser(req.params.id);
  if (error) return res.status(400).json({ ok: false, message: error.message });
  res.json({ ok: true });
});
// ---------------------------------------------------------
// SUPERADMIN - EMPRESAS / LICENCIAS
// ---------------------------------------------------------

function normalizePlan(plan) {
  const value = String(plan || "").toUpperCase();

  const allowed = [
    "PRUEBA",
    "MENSUAL",
    "ANUAL",
    "PERMANENTE"
  ];

  return allowed.includes(value) ? value : "PRUEBA";
}

function normalizeCompanyStatus(status) {
  const value = String(status || "").toUpperCase();

  return value === "SUSPENDIDA"
    ? "SUSPENDIDA"
    : "ACTIVA";
}

function defaultLicenseDate(plan) {
  const value = normalizePlan(plan);

  if (value === "PERMANENTE") {
    return null;
  }

  const date = new Date();

  if (value === "ANUAL") {
    date.setDate(date.getDate() + 365);
  } else if (value === "MENSUAL") {
    date.setDate(date.getDate() + 30);
  } else {
    date.setDate(date.getDate() + 7);
  }

  return date.toISOString().slice(0, 10);
}


// ---------------------------------------------------------
// RESUMEN SUPERADMIN
// ---------------------------------------------------------

app.get(
  "/api/superadmin/summary",
  authRequired,
  needSuperAdmin,
  async (req, res) => {

    const { data: companies, error: companiesError } =
      await admin
        .from("companies")
        .select(`
          id,
          name,
          ruc,
          plan,
          status,
          license_expires_at,
          max_users,
          created_at
        `)
        .neq("id", req.profile.company_id);

    if (companiesError) {
      return res.status(500).json({
        ok: false,
        message: companiesError.message
      });
    }


    const companyIds = (companies || []).map(c => c.id);

    let profiles = [];

    if (companyIds.length) {

      const { data, error } =
        await admin
          .from("profiles")
          .select(`
            id,
            company_id,
            role,
            active
          `)
          .in("company_id", companyIds);

      if (error) {
        return res.status(500).json({
          ok: false,
          message: error.message
        });
      }

      profiles = data || [];
    }


    const today =
      new Date().toISOString().slice(0, 10);

    let activeCompanies = 0;
    let suspendedCompanies = 0;
    let expiredCompanies = 0;
    let expiringSoon = 0;


    for (const company of companies || []) {

      const expiry =
        company.license_expires_at || null;

      const expired =
        expiry && expiry < today;


      if (company.status === "SUSPENDIDA") {
        suspendedCompanies++;
      }

      if (expired) {
        expiredCompanies++;
      }

      if (
        company.status === "ACTIVA" &&
        !expired
      ) {
        activeCompanies++;
      }


      if (expiry && !expired) {

        const diff =
          Math.ceil(
            (
              new Date(expiry) -
              new Date(today)
            ) /
            86400000
          );

        if (diff <= 7) {
          expiringSoon++;
        }
      }
    }


    res.json({
      ok: true,

      summary: {
        total_companies:
          companies?.length || 0,

        active_companies:
          activeCompanies,

        suspended_companies:
          suspendedCompanies,

        expired_companies:
          expiredCompanies,

        expiring_soon:
          expiringSoon,

        total_users:
          profiles.length
      }
    });
  }
);


// ---------------------------------------------------------
// LISTAR EMPRESAS
// ---------------------------------------------------------

app.get(
  "/api/superadmin/companies",
  authRequired,
  needSuperAdmin,
  async (req, res) => {

    const { data: companies, error } =
      await admin
        .from("companies")
        .select(`
          id,
          name,
          ruc,
          plan,
          status,
          license_expires_at,
          max_users,
          created_at,
          updated_at
        `)
        .neq("id", req.profile.company_id)
        .order("created_at", {
          ascending: false
        });


    if (error) {
      return res.status(500).json({
        ok: false,
        message: error.message
      });
    }


    const result = [];


    for (const company of companies || []) {

      const { data: profiles } =
        await admin
          .from("profiles")
          .select(`
            id,
            full_name,
            role,
            active,
            created_at
          `)
          .eq("company_id", company.id)
          .order("created_at", {
            ascending: true
          });


      const companyUsers =
        profiles || [];


      const mainAdmin =
        companyUsers.find(
          u =>
            u.role === "ADMIN" &&
            u.active
        ) ||
        companyUsers.find(
          u => u.role === "ADMIN"
        );


      let adminEmail = "";


      if (mainAdmin?.id) {

        const { data: authUser } =
          await admin.auth.admin.getUserById(
            mainAdmin.id
          );

        adminEmail =
          authUser?.user?.email || "";
      }


      result.push({
        ...company,

        users_count:
          companyUsers.length,

        active_users:
          companyUsers.filter(
            u => u.active
          ).length,

        admin: mainAdmin
          ? {
              id: mainAdmin.id,
              full_name:
                mainAdmin.full_name,
              email:
                adminEmail,
              active:
                mainAdmin.active
            }
          : null
      });
    }


    res.json({
      ok: true,
      companies: result
    });
  }
);


// ---------------------------------------------------------
// CREAR EMPRESA + ADMIN PRINCIPAL
// ---------------------------------------------------------

app.post(
  "/api/superadmin/companies",
  authRequired,
  needSuperAdmin,
  async (req, res) => {

    const name =
      cleanText(req.body.name, 250);

    const ruc =
      cleanText(req.body.ruc, 20);

    const adminEmail =
      cleanText(
        req.body.admin_email,
        250
      ).toLowerCase();

    const adminPassword =
      String(
        req.body.admin_password || ""
      );

    const adminName =
      cleanText(
        req.body.admin_full_name,
        250
      ) ||
      adminEmail.split("@")[0];


    const plan =
      normalizePlan(req.body.plan);

    const status =
      normalizeCompanyStatus(
        req.body.status
      );


    let maxUsers =
      Number(req.body.max_users || 3);

    if (
      !Number.isInteger(maxUsers) ||
      maxUsers < 1 ||
      maxUsers > 1000
    ) {
      maxUsers = 3;
    }


    let licenseExpiresAt =
      req.body.license_expires_at
        ? String(
            req.body.license_expires_at
          ).slice(0, 10)
        : defaultLicenseDate(plan);


    if (plan === "PERMANENTE") {
      licenseExpiresAt = null;
    }


    if (!name) {
      return res.status(400).json({
        ok: false,
        message:
          "Ingresa el nombre de la empresa."
      });
    }


    if (!adminEmail.includes("@")) {
      return res.status(400).json({
        ok: false,
        message:
          "Ingresa un correo válido para el administrador."
      });
    }


    if (adminPassword.length < 6) {
      return res.status(400).json({
        ok: false,
        message:
          "La contraseña debe tener al menos 6 caracteres."
      });
    }


    // Crear usuario en Supabase Auth.
    // El trigger existente creará temporalmente:
    // company + profile + settings + quote_sequence.

    const {
      data: created,
      error: createError
    } =
      await admin.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,

        user_metadata: {
          full_name: adminName,
          company_name: name
        }
      });


    if (
      createError ||
      !created?.user
    ) {
      return res.status(400).json({
        ok: false,
        message:
          createError?.message ||
          "No se pudo crear el administrador."
      });
    }


    const userId =
      created.user.id;


    const {
      data: profile,
      error: profileError
    } =
      await admin
        .from("profiles")
        .select("company_id")
        .eq("id", userId)
        .single();


    if (
      profileError ||
      !profile?.company_id
    ) {

      await admin.auth.admin.deleteUser(
        userId
      );

      return res.status(500).json({
        ok: false,
        message:
          "No se pudo crear la empresa asociada al usuario."
      });
    }


    const companyId =
      profile.company_id;


    const {
      data: company,
      error: companyError
    } =
      await admin
        .from("companies")
        .update({
          name,
          ruc:
            ruc || null,
          plan,
          status,
          license_expires_at:
            licenseExpiresAt,
          max_users:
            maxUsers
        })
        .eq("id", companyId)
        .select()
        .single();


    if (companyError) {

      await admin.auth.admin.deleteUser(
        userId
      );

      await admin
        .from("companies")
        .delete()
        .eq("id", companyId);


      return res.status(400).json({
        ok: false,
        message:
          companyError.message
      });
    }


    const {
      error: updateProfileError
    } =
      await admin
        .from("profiles")
        .update({
          full_name:
            adminName,
          role:
            "ADMIN",
          active:
            true
        })
        .eq("id", userId);


    if (updateProfileError) {

      await admin.auth.admin.deleteUser(
        userId
      );

      await admin
        .from("companies")
        .delete()
        .eq("id", companyId);


      return res.status(400).json({
        ok: false,
        message:
          updateProfileError.message
      });
    }


    res.status(201).json({
      ok: true,

      company,

      admin: {
        id:
          userId,
        email:
          adminEmail,
        full_name:
          adminName,
        role:
          "ADMIN"
      }
    });
  }
);


// ---------------------------------------------------------
// EDITAR / SUSPENDER / RENOVAR EMPRESA
// ---------------------------------------------------------

app.patch(
  "/api/superadmin/companies/:id",
  authRequired,
  needSuperAdmin,
  async (req, res) => {

    const companyId =
      req.params.id;


    // El SUPERADMIN no puede alterar accidentalmente
    // su propia empresa técnica.
    if (
      companyId ===
      req.profile.company_id
    ) {
      return res.status(400).json({
        ok: false,
        message:
          "No puedes modificar la empresa interna del SUPERADMIN."
      });
    }


    const payload = {};


    if (
      req.body.name !== undefined
    ) {

      const name =
        cleanText(
          req.body.name,
          250
        );

      if (!name) {
        return res.status(400).json({
          ok: false,
          message:
            "El nombre de la empresa es obligatorio."
        });
      }

      payload.name = name;
    }


    if (
      req.body.ruc !== undefined
    ) {
      payload.ruc =
        cleanText(
          req.body.ruc,
          20
        ) || null;
    }


    if (
      req.body.plan !== undefined
    ) {

      payload.plan =
        normalizePlan(
          req.body.plan
        );

      if (
        payload.plan ===
        "PERMANENTE"
      ) {
        payload.license_expires_at =
          null;
      }
    }


    if (
      req.body.status !== undefined
    ) {
      payload.status =
        normalizeCompanyStatus(
          req.body.status
        );
    }


    if (
      req.body.license_expires_at !==
      undefined
    ) {

      const value =
        req.body.license_expires_at;

      payload.license_expires_at =
        value
          ? String(value).slice(0, 10)
          : null;
    }


    if (
      req.body.max_users !== undefined
    ) {

      const maxUsers =
        Number(req.body.max_users);


      if (
        !Number.isInteger(maxUsers) ||
        maxUsers < 1 ||
        maxUsers > 1000
      ) {
        return res.status(400).json({
          ok: false,
          message:
            "El límite de usuarios no es válido."
        });
      }


      const {
        count,
        error: countError
      } =
        await admin
          .from("profiles")
          .select(
            "id",
            {
              count: "exact",
              head: true
            }
          )
          .eq(
            "company_id",
            companyId
          );


      if (countError) {
        return res.status(500).json({
          ok: false,
          message:
            countError.message
        });
      }


      if (
        maxUsers <
        Number(count || 0)
      ) {
        return res.status(400).json({
          ok: false,
          message:
            `La empresa ya tiene ${count} usuario(s). No puedes establecer un límite menor.`
        });
      }


      payload.max_users =
        maxUsers;
    }


    const {
      data,
      error
    } =
      await admin
        .from("companies")
        .update(payload)
        .eq("id", companyId)
        .select()
        .single();


    if (error) {
      return res.status(400).json({
        ok: false,
        message:
          error.message
      });
    }


    res.json({
      ok: true,
      company:
        data
    });
  }
);
// ---------------------------------------------------------
// DASHBOARD
// ---------------------------------------------------------
app.get("/api/dashboard", authRequired, async (req, res) => {
  const now = new Date();
  const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  const [quotesCount, activeCount, cancelledCount, clientsCount, productsCount, monthQuotes, latest] = await Promise.all([
    admin.from("quotes").select("id", { count: "exact", head: true }).eq("company_id", req.profile.company_id),
    admin.from("quotes").select("id", { count: "exact", head: true }).eq("company_id", req.profile.company_id).eq("status", "ACTIVA"),
    admin.from("quotes").select("id", { count: "exact", head: true }).eq("company_id", req.profile.company_id).eq("status", "ANULADA"),
    admin.from("clients").select("id", { count: "exact", head: true }).eq("company_id", req.profile.company_id),
    admin.from("products").select("id", { count: "exact", head: true }).eq("company_id", req.profile.company_id).eq("active", true),
    admin.from("quotes").select("total_amount,status,currency").eq("company_id", req.profile.company_id).gte("quote_date", from),
    admin.from("quotes").select("id,quote_number,quote_date,client_name,total_amount,status,currency").eq("company_id", req.profile.company_id).order("created_at", { ascending: false }).limit(6),
  ]);

  const monthActive = (monthQuotes.data || []).filter((q) => q.status === "ACTIVA");
  const monthTotalPen = money(monthActive.filter(q => (q.currency || "SOLES") !== "DOLARES").reduce((sum, q) => sum + cleanNumber(q.total_amount), 0));
  const monthTotalUsd = money(monthActive.filter(q => q.currency === "DOLARES").reduce((sum, q) => sum + cleanNumber(q.total_amount), 0));

  res.json({
    ok: true,
    summary: {
      quotes: quotesCount.count || 0,
      active_quotes: activeCount.count || 0,
      cancelled_quotes: cancelledCount.count || 0,
      clients: clientsCount.count || 0,
      products: productsCount.count || 0,
      month_total: monthTotalPen,
      month_total_pen: monthTotalPen,
      month_total_usd: monthTotalUsd,
    },
    latest: latest.data || [],
  });
});

// ---------------------------------------------------------
// COTIZACIONES
// ---------------------------------------------------------
app.get("/api/quotes/next-number", authRequired, async (req, res) => {
  const { data, error } = await admin
    .from("quote_sequences")
    .select("next_number")
    .eq("company_id", req.profile.company_id)
    .maybeSingle();
  if (error) return res.status(500).json({ ok:false, message:error.message });
  const next = Math.max(Number(data?.next_number || 1), 1);
  res.json({ ok:true, sequence_number:next, quote_number:`COT01-${String(next).padStart(4,"0")}` });
});

app.get("/api/quotes", authRequired, async (req, res) => {
  const search = cleanText(req.query.search, 120);
  const status = cleanText(req.query.status, 20).toUpperCase();

  let query = admin
    .from("quotes")
    .select("id,quote_number,quote_date,client_document,client_name,document_type,currency,price_mode,total_amount,status,created_at")
    .eq("company_id", req.profile.company_id)
    .order("created_at", { ascending: false });

  if (search) query = query.or(`quote_number.ilike.%${search}%,client_name.ilike.%${search}%,client_document.ilike.%${search}%`);
  if (["ACTIVA", "ANULADA"].includes(status)) query = query.eq("status", status);

  const { data, error } = await query.limit(1000);
  if (error) return res.status(500).json({ ok: false, message: error.message });
  res.json({ ok: true, quotes: data || [] });
});

app.get("/api/quotes/:id", authRequired, async (req, res) => {
  const { data: quote, error } = await admin
    .from("quotes")
    .select("*")
    .eq("id", req.params.id)
    .eq("company_id", req.profile.company_id)
    .single();

  if (error || !quote) return res.status(404).json({ ok: false, message: "Cotización no encontrada." });

  const { data: items, error: itemsError } = await admin
    .from("quote_items")
    .select("*")
    .eq("quote_id", quote.id)
    .order("position", { ascending: true });

  if (itemsError) return res.status(500).json({ ok: false, message: itemsError.message });
  res.json({ ok: true, quote: { ...quote, items: items || [] } });
});

app.post("/api/quotes", authRequired, async (req, res) => {
  const clientName = cleanText(req.body.client_name, 250);
  if (!clientName) return res.status(400).json({ ok: false, message: "Selecciona o ingresa un cliente." });

  const calculated = calcQuote(req.body.items, req.body.document_type, req.body.discount_percent, req.body.price_mode);
  if (!calculated.items.length) {
    return res.status(400).json({ ok: false, message: "Agrega al menos un producto o servicio." });
  }

  const { data: seqData, error: seqError } = await admin.rpc("next_quote_number", {
    p_company_id: req.profile.company_id,
  });

  if (seqError || !seqData?.[0]) {
    return res.status(500).json({ ok: false, message: seqError?.message || "No se pudo generar el correlativo." });
  }

  const sequence = seqData[0].sequence_number;
  const quoteNumber = seqData[0].quote_number;

  const quotePayload = {
    company_id: req.profile.company_id,
    quote_sequence: sequence,
    quote_number: quoteNumber,
    quote_date: cleanText(req.body.quote_date, 10) || new Date().toISOString().slice(0, 10),
    client_id: req.body.client_id || null,
    client_document: cleanDocument(req.body.client_document),
    client_name: clientName,
    client_address: cleanText(req.body.client_address, 500),
    document_type: calculated.document_type,
    currency: String(req.body.currency || "SOLES").toUpperCase() === "DOLARES" ? "DOLARES" : "SOLES",
    price_mode: calculated.price_mode,
    conditions: cleanText(req.body.conditions, 1000),
    base_amount: calculated.base_amount,
    discount_percent: calculated.discount_percent,
    igv_amount: calculated.igv_amount,
    discount_amount: calculated.discount_amount,
    retention_amount: calculated.retention_amount,
    total_amount: calculated.total_amount,
    status: "ACTIVA",
    created_by: req.user.id,
  };

  const { data: quote, error: quoteError } = await admin
    .from("quotes")
    .insert(quotePayload)
    .select()
    .single();

  if (quoteError) return res.status(400).json({ ok: false, message: quoteError.message });

  const itemPayload = calculated.items.map((item) => ({ ...item, quote_id: quote.id }));
  const { error: itemError } = await admin.from("quote_items").insert(itemPayload);

  if (itemError) {
    await admin.from("quotes").delete().eq("id", quote.id);
    return res.status(400).json({ ok: false, message: itemError.message });
  }

  res.status(201).json({ ok: true, quote });
});

app.put("/api/quotes/:id", authRequired, async (req, res) => {
  const { data: current, error: findError } = await admin
    .from("quotes")
    .select("id,status")
    .eq("id", req.params.id)
    .eq("company_id", req.profile.company_id)
    .single();

  if (findError || !current) return res.status(404).json({ ok: false, message: "Cotización no encontrada." });
  if (current.status === "ANULADA") {
    return res.status(400).json({ ok: false, message: "Reactiva la cotización antes de editarla." });
  }

  const clientName = cleanText(req.body.client_name, 250);
  const calculated = calcQuote(req.body.items, req.body.document_type, req.body.discount_percent, req.body.price_mode);
  if (!clientName || !calculated.items.length) {
    return res.status(400).json({ ok: false, message: "Completa cliente y detalle." });
  }

  const update = {
    quote_date: cleanText(req.body.quote_date, 10) || new Date().toISOString().slice(0, 10),
    client_id: req.body.client_id || null,
    client_document: cleanDocument(req.body.client_document),
    client_name: clientName,
    client_address: cleanText(req.body.client_address, 500),
    document_type: calculated.document_type,
    currency: String(req.body.currency || "SOLES").toUpperCase() === "DOLARES" ? "DOLARES" : "SOLES",
    price_mode: calculated.price_mode,
    conditions: cleanText(req.body.conditions, 1000),
    base_amount: calculated.base_amount,
    discount_percent: calculated.discount_percent,
    igv_amount: calculated.igv_amount,
    discount_amount: calculated.discount_amount,
    retention_amount: calculated.retention_amount,
    total_amount: calculated.total_amount,
  };

  const { data: quote, error } = await admin
    .from("quotes")
    .update(update)
    .eq("id", req.params.id)
    .eq("company_id", req.profile.company_id)
    .select()
    .single();

  if (error) return res.status(400).json({ ok: false, message: error.message });

  await admin.from("quote_items").delete().eq("quote_id", req.params.id);
  const itemPayload = calculated.items.map((item) => ({ ...item, quote_id: req.params.id }));
  const { error: itemError } = await admin.from("quote_items").insert(itemPayload);
  if (itemError) return res.status(400).json({ ok: false, message: itemError.message });

  res.json({ ok: true, quote });
});

app.patch("/api/quotes/:id/status", authRequired, async (req, res) => {
  const status = cleanText(req.body.status, 20).toUpperCase();
  if (!["ACTIVA", "ANULADA"].includes(status)) {
    return res.status(400).json({ ok: false, message: "Estado inválido." });
  }

  const { data, error } = await admin
    .from("quotes")
    .update({ status })
    .eq("id", req.params.id)
    .eq("company_id", req.profile.company_id)
    .select("id,quote_number,status")
    .single();

  if (error) return res.status(400).json({ ok: false, message: error.message });
  res.json({ ok: true, quote: data });
});

// ---------------------------------------------------------
// PDF
// ---------------------------------------------------------
function pdfSafeImage(dataUrl) {
  try {
    if (!dataUrl || !dataUrl.includes("base64,")) return null;
    return Buffer.from(dataUrl.split("base64,")[1], "base64");
  } catch { return null; }
}

function pdfMoney(n, currency = "SOLES") {
  const symbol = String(currency).toUpperCase() === "DOLARES" ? "$" : "S/";
  return `${symbol} ${money(n).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function documentLabel(type) {
  return ({ FACTURA:"FACTURA", BOLETA:"BOLETA", RHE:"RECIBO POR HONORARIOS", SIN_IGV:"SIN IGV" })[type] || type || "-";
}

function spanishInteger(n) {
  n = Math.floor(Math.abs(Number(n) || 0));
  if (n === 0) return "CERO";
  const u=["","UNO","DOS","TRES","CUATRO","CINCO","SEIS","SIETE","OCHO","NUEVE","DIEZ","ONCE","DOCE","TRECE","CATORCE","QUINCE","DIECISÉIS","DIECISIETE","DIECIOCHO","DIECINUEVE","VEINTE","VEINTIUNO","VEINTIDÓS","VEINTITRÉS","VEINTICUATRO","VEINTICINCO","VEINTISÉIS","VEINTISIETE","VEINTIOCHO","VEINTINUEVE"];
  const tens=["","","VEINTE","TREINTA","CUARENTA","CINCUENTA","SESENTA","SETENTA","OCHENTA","NOVENTA"];
  const hundreds=["","CIENTO","DOSCIENTOS","TRESCIENTOS","CUATROCIENTOS","QUINIENTOS","SEISCIENTOS","SETECIENTOS","OCHOCIENTOS","NOVECIENTOS"];
  const under100=x=>x<30?u[x]:`${tens[Math.floor(x/10)]}${x%10?` Y ${u[x%10]}`:""}`;
  const under1000=x=>{if(x===100)return"CIEN";return`${hundreds[Math.floor(x/100)]}${x%100?`${x>=100?" ":""}${under100(x%100)}`:""}`.trim()};
  if(n<1000)return under1000(n);
  if(n<1_000_000){const th=Math.floor(n/1000),r=n%1000;return`${th===1?"MIL":`${under1000(th)} MIL`}${r?` ${under1000(r)}`:""}`}
  if(n<1_000_000_000){const m=Math.floor(n/1_000_000),r=n%1_000_000;return`${m===1?"UN MILLÓN":`${spanishInteger(m)} MILLONES`}${r?` ${spanishInteger(r)}`:""}`}
  return String(n);
}

function moneyInWords(value, currency = "SOLES") {
  const amount=money(value), whole=Math.floor(amount), cents=Math.round((amount-whole)*100);
  const name = String(currency).toUpperCase() === "DOLARES" ? "DÓLARES AMERICANOS" : "SOLES";
  return `SON ${spanishInteger(whole)} Y ${String(cents).padStart(2,"0")}/100 ${name}`;
}

function legacyPaymentMethods(settings) {
  const out=[];
  if(settings?.yape) out.push({type:"YAPE",currency:"BILLETERA DIGITAL",number:settings.yape,enabled:true});
  if(settings?.plin) out.push({type:"PLIN",currency:"BILLETERA DIGITAL",number:settings.plin,enabled:true});
  for(const [type,key] of [["BCP","bank_bcp"],["BBVA","bank_bbva"],["INTERBANK","bank_interbank"],["SCOTIABANK","bank_scotiabank"]]) {
    if(settings?.[key]) out.push({type,currency:"SOLES",account:settings[key],enabled:true});
  }
  return out;
}

function drawPaymentCard(doc, x, y, w, method) {
  const h = 83;
  doc.roundedRect(x,y,w,h,5).lineWidth(.6).strokeColor("#d9e2ec").stroke();
  const rawEntity = cleanText(method.entity || method.type || "OTRO", 50).toUpperCase();
  const displayEntity = rawEntity === "OTRO" ? cleanText(method.custom_name || method.type || "OTRO", 80).toUpperCase() : rawEntity;
  const isWallet = String(method.kind || "").toUpperCase() === "BILLETERA" || ["YAPE","PLIN"].includes(rawEntity);
  const logo = pdfSafeImage(method.logo);
  if (logo) {
    try { doc.image(logo, x+9, y+8, { fit:[40,24], align:"center", valign:"center" }); } catch {}
  } else {
    const colors={YAPE:"#6c217f",PLIN:"#00a6a6",BCP:"#005daa",BBVA:"#004481",INTERBANK:"#1b9b45",SCOTIABANK:"#d71920",BANBIF:"#f28c00",OTRO:"#64748b"};
    doc.roundedRect(x+9,y+10,38,19,2).fillColor(colors[rawEntity]||colors.OTRO).fill();
    doc.font("Helvetica-Bold").fontSize(displayEntity.length>8?5.2:7).fillColor("#ffffff").text(displayEntity.slice(0,10),x+9,y+16,{width:38,align:"center"});
  }
  doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#172033").text(displayEntity,x+56,y+9,{width:w-64});
  doc.font("Helvetica-Bold").fontSize(5.5).fillColor("#64748b").text(isWallet ? "BILLETERA DIGITAL" : `CUENTA EN ${String(method.currency||"SOLES").toUpperCase()==="DOLARES"?"DÓLARES":"SOLES"}`,x+56,y+21,{width:w-64});
  doc.moveTo(x+9,y+35).lineTo(x+w-9,y+35).strokeColor("#e7edf3").lineWidth(.5).stroke();
  let ty=y+41;
  const rows=[];
  if(isWallet) rows.push(["NÚMERO",method.number||method.account||""]);
  else rows.push(["N° CUENTA",method.account||method.number||""]);
  if(!isWallet && method.cci) rows.push(["CCI",method.cci]);
  if(method.holder) rows.push(["TITULAR",method.holder]);
  for(const [label,val] of rows.slice(0,3)){
    doc.font("Helvetica-Bold").fontSize(5).fillColor("#64748b").text(label,x+9,ty,{width:w-18});ty+=7;
    doc.font("Helvetica-Bold").fontSize(6.2).fillColor("#172033").text(String(val),x+9,ty,{width:w-18,ellipsis:true});ty+=10;
  }
  return h;
}

app.get("/api/quotes/:id/pdf", authRequired, async (req, res) => {
  const { data: quote, error } = await admin.from("quotes").select("*").eq("id", req.params.id).eq("company_id", req.profile.company_id).single();
  if (error || !quote) return res.status(404).json({ ok:false, message:"Cotización no encontrada." });
  const [{data:items},{data:company},{data:settings}] = await Promise.all([
    admin.from("quote_items").select("*").eq("quote_id",quote.id).order("position",{ascending:true}),
    admin.from("companies").select("*").eq("id",req.profile.company_id).single(),
    admin.from("settings").select("*").eq("company_id",req.profile.company_id).single(),
  ]);

  const fileName=`${quote.quote_number} - ${quote.client_name.replace(/[\\/:*?"<>|]/g,"").slice(0,70)}.pdf`;
  res.setHeader("Content-Type","application/pdf");
  res.setHeader("Content-Disposition",`inline; filename="${encodeURIComponent(fileName)}"`);
  const doc=new PDFDocument({size:"A4",margin:30,bufferPages:true}); doc.pipe(res);
  const dark="#071426", blue="#1677ff", lightBlue="#bfe6f3", gray="#64748b", red="#d64545";
  const pageW=doc.page.width;
  const left=30,right=pageW-30;

  const drawHeader=()=>{
    const logo=pdfSafeImage(settings?.logo_data_url);
    if(logo){try{doc.image(logo,left+8,28,{fit:[64,64],align:"center",valign:"center"})}catch{}}
    const tx=logo?left+100:left;
    const companyName=company?.name||"FRANCO SYSTEMS";
    const fs=companyName.length>38?13:15.5;
    doc.font("Helvetica-Bold").fontSize(fs).fillColor(dark).text(companyName,tx,31,{width:270,height:36,ellipsis:false});
    let hy=61;
    doc.font("Helvetica").fontSize(6.4).fillColor(gray);
    if(settings?.address){doc.text(String(settings.address).toUpperCase(),tx,hy,{width:275});hy+=doc.heightOfString(String(settings.address).toUpperCase(),{width:275})+2}
    if(settings?.location){doc.text(String(settings.location).toUpperCase(),tx,hy,{width:275});hy+=9}
    if(settings?.phone){doc.text(`Teléfono: ${settings.phone}`,tx,hy,{width:275});hy+=9}
    if(settings?.email)doc.text(`Correo: ${settings.email}`,tx,hy,{width:275});

    const bx=right-138,by=27,bw=138;
    doc.rect(bx,by,bw,80).lineWidth(.8).strokeColor("#172033").stroke();
    doc.font("Helvetica-Bold").fontSize(8).fillColor(dark).text("RUC",bx,by+8,{width:bw,align:"center"});
    doc.fontSize(9.5).text(company?.ruc||"-",bx,by+22,{width:bw,align:"center"});
    doc.rect(bx,by+37,bw,22).fillColor(lightBlue).fill();
    doc.font("Helvetica-Bold").fontSize(10).fillColor(dark).text("COTIZACIÓN",bx,by+44,{width:bw,align:"center"});
    doc.fontSize(10).text(quote.quote_number,bx,by+65,{width:bw,align:"center"});
    doc.moveTo(left,127).lineTo(right,127).strokeColor("#dbe4ee").lineWidth(.8).stroke();

    if(quote.status==="ANULADA"){
      doc.save();doc.rotate(-4,{origin:[300,143]});doc.roundedRect(205,126,180,30,5).lineWidth(2).strokeColor(red).stroke();doc.font("Helvetica-Bold").fontSize(12).fillColor(red).text("COTIZACIÓN ANULADA",205,136,{width:180,align:"center"});doc.restore();
    }
  };
  drawHeader();
  const date=(()=>{const m=String(quote.quote_date||"").match(/^(\d{4})-(\d{2})-(\d{2})/);return m?`${m[3]}/${m[2]}/${m[1]}`:String(quote.quote_date||"")})();
  const disc=cleanNumber(quote.discount_percent,0);
  let y=148;
  const label=(x,yy,l,v,w=255)=>{doc.font("Helvetica-Bold").fontSize(6.8).fillColor(dark).text(l,x,yy,{continued:true});doc.font("Helvetica").fillColor(gray).text(` ${v||"-"}`,{width:w});};
  label(left,y,"RUC / DNI:",quote.client_document); label(310,y,"FECHA DE EMISIÓN:",date,250); y+=16;
  label(left,y,"CLIENTE:",quote.client_name); label(310,y,"MONEDA:",quote.currency||"SOLES",250); y+=16;
  label(left,y,"DIRECCIÓN:",quote.client_address||"-"); label(310,y,"DESCUENTO:",`${disc.toFixed(disc%1?2:0)}%`,250); y+=16;
  label(310,y,"COMPROBANTE A EMITIR:",documentLabel(quote.document_type),250); y+=23;

  const widths=[28,53,63,194,48,69,70], x0=left; const headerH=20;
  const headers=["N°","UNIDAD","CÓDIGO","DESCRIPCIÓN","CANT.",quote.price_mode==="SIN_IGV"?"V. UNIT.":"P. UNIT.","TOTAL"];
  let x=x0; for(let i=0;i<widths.length;i++){doc.rect(x,y,widths[i],headerH).fillColor(lightBlue).fill().strokeColor("#172033").lineWidth(.45).stroke();doc.font("Helvetica-Bold").fontSize(6.2).fillColor(dark).text(headers[i],x+2,y+7,{width:widths[i]-4,align:i===3?"center":"center"});x+=widths[i]} y+=headerH;
  const subtotal=money((items||[]).reduce((s,it)=>s+cleanNumber(it.line_total),0));
  for(let idx=0;idx<(items||[]).length;idx++){
    const it=items[idx]; const rowH=Math.max(22,doc.heightOfString(String(it.description||""),{width:widths[3]-8})+10);
    if(y+rowH>620){doc.addPage();drawHeader();y=148}
    const vals=[idx+1,it.unit,it.code,it.description,it.quantity,Number(it.unit_price).toFixed(2),Number(it.line_total).toFixed(2)];x=x0;
    for(let i=0;i<widths.length;i++){doc.rect(x,y,widths[i],rowH).strokeColor("#62748a").lineWidth(.35).stroke();doc.font("Helvetica").fontSize(6.2).fillColor("#172033").text(String(vals[i]??""),x+3,y+7,{width:widths[i]-6,align:[0,1,2,4].includes(i)?"center":i>=5?"right":"left"});x+=widths[i]} y+=rowH;
  }
  const wordsH=21;doc.rect(x0,y,widths.reduce((a,b)=>a+b,0),wordsH).strokeColor("#62748a").lineWidth(.35).stroke();doc.font("Helvetica-Bold").fontSize(6.3).fillColor(dark).text(moneyInWords(quote.total_amount, quote.currency),x0+4,y+7,{width:505,align:"center"});y+=wordsH+15;

  const sx=365,sw=180; const row=(lbl,val,bold=false)=>{doc.font(bold?"Helvetica-Bold":"Helvetica-Bold").fontSize(bold?8.5:6.7).fillColor(dark).text(lbl,sx,y,{width:105});doc.font("Helvetica-Bold").fontSize(bold?8.5:6.7).text(val,sx+105,y,{width:75,align:"right"});y+=bold?22:19};
  row("SUBTOTAL",pdfMoney(subtotal, quote.currency));row(`DESCUENTO ${disc.toFixed(disc%1?2:0)}%`,`- ${pdfMoney(quote.discount_amount, quote.currency)}`);row("BASE IMPONIBLE",pdfMoney(quote.base_amount, quote.currency));
  if(quote.document_type==="FACTURA"||quote.document_type==="BOLETA")row("IGV 18%",pdfMoney(quote.igv_amount, quote.currency));
  if(quote.document_type==="RHE"&&cleanNumber(quote.retention_amount)>0)row("RETENCIÓN 8%",pdfMoney(quote.retention_amount, quote.currency));
  doc.moveTo(sx,y-5).lineTo(sx+sw,y-5).strokeColor("#172033").lineWidth(.45).stroke();row("IMPORTE TOTAL",pdfMoney(quote.total_amount, quote.currency),true);

  let cy=Math.max(y+12,395);doc.font("Helvetica-Bold").fontSize(8).fillColor(dark).text("CONDICIONES DE COTIZACIÓN:",left,cy);cy+=17;doc.font("Helvetica").fontSize(7).fillColor(gray).text(quote.conditions||"Sin condiciones adicionales.",left,cy,{width:310});cy+=34;

  let methods=(Array.isArray(settings?.payment_methods)?settings.payment_methods:[]).filter(m=>m&&m.enabled!==false&&(m.account||m.number)); if(!methods.length)methods=legacyPaymentMethods(settings);
  if(methods.length){
    if(cy>520){doc.addPage();cy=55}
    doc.font("Helvetica-Bold").fontSize(8).fillColor(dark).text("MEDIOS DE PAGO",left,cy);cy+=17;
    const gap=8,cw=(right-left-gap*2)/3;
    methods.slice(0,6).forEach((m,i)=>{const col=i%3,rowN=Math.floor(i/3);drawPaymentCard(doc,left+col*(cw+gap),cy+rowN*91,cw,m)});
  }

  const pages=doc.bufferedPageRange();for(let i=pages.start;i<pages.start+pages.count;i++){doc.switchToPage(i);const footerY=772;doc.font("Helvetica-Oblique").fontSize(7).fillColor("#7b8797").text(settings?.final_message||"Gracias por elegirnos. Su confianza nos inspira a seguir mejorando.",100,footerY-35,{width:395,align:"center"});doc.moveTo(left,footerY-10).lineTo(right,footerY-10).strokeColor("#e0e6ed").lineWidth(.5).stroke();doc.font("Helvetica").fontSize(6.2).fillColor("#344257");doc.text(settings?.responsible||"",left,footerY,{width:190});doc.text(settings?.responsible_role||"",left,footerY+9,{width:190});doc.text("Franco Systems · Business ERP v1.0",right-190,footerY+9,{width:190,align:"right"})}
  doc.end();
});


// ---------------------------------------------------------
// FRONTEND
// ---------------------------------------------------------
app.use(express.static(PUBLIC_DIR, { extensions: ["html"] }));

app.get("/", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

app.use((req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ ok: false, message: "Ruta API no encontrada." });
  }
  res.status(404).sendFile(path.join(PUBLIC_DIR, "offline.html"));
});

// ---------------------------------------------------------
// START
// ---------------------------------------------------------
app.listen(PORT, "0.0.0.0", () => {
  console.log("==========================================");
  console.log("FRANCO SYSTEMS ERP CLASSIC CLOUD");
  console.log(`Servidor: http://localhost:${PORT}`);
  console.log(`Supabase: ${configReady() ? "CONFIGURADO" : "PENDIENTE"}`);
  console.log(`Decolecta: ${process.env.API_TOKEN ? "CONFIGURADO" : "PENDIENTE"}`);
  console.log("==========================================");
});
