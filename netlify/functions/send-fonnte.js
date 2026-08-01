// Netlify Function: send-fonnte.js
// Menerima hasil kalkulasi premi dari index.html, lalu:
//  1. Mengirim ringkasan simulasi ke WhatsApp calon nasabah
//  2. Mengirim notifikasi lead ke WhatsApp agent
// Token Fonnte & nomor agent disimpan sebagai environment variable di Netlify
// (Site settings -> Environment variables), TIDAK pernah ditaruh di kode/frontend.

const FONNTE_URL = "https://api.fonnte.com/send";

function normalizePhone(raw) {
  let digits = String(raw || "").replace(/[^0-9]/g, "");
  if (digits.startsWith("0")) digits = "62" + digits.slice(1);
  if (!digits.startsWith("62")) digits = "62" + digits;
  return digits;
}

function buildCustomerMessage({ customerName, age, gender, plan, mpp, upLabel, premiumFormatted }) {
  const genderLabel = gender === "M" ? "Pria" : "Wanita";
  const mppLabel = mpp === "RP" ? "Reguler" : `${mpp} tahun`;
  const greeting = customerName ? `Halo ${customerName},` : "Halo,";
  return (
    `${greeting} berikut simulasi premi *Manulife Critical Care Protection (MCCP)*:\n\n` +
    `Usia: ${age} tahun (${genderLabel})\n` +
    `Plan: ${plan}\n` +
    `Masa Bayar Premi: ${mppLabel}\n` +
    `Uang Pertanggungan: ${upLabel}\n` +
    `*Estimasi Premi Tahunan: ${premiumFormatted}*\n\n` +
    `Simulasi ini adalah estimasi berdasarkan tabel premi resmi Manulife dan dapat berubah ` +
    `menyesuaikan hasil underwriting.\n\n` +
    `Info lebih lanjut hubungi Deny Susetio — Jaga Keluarga.`
  );
}

function buildAgentMessage({ customerName, customerPhoneDisplay, age, gender, plan, mpp, upLabel, premiumFormatted, medicalCode }) {
  const genderLabel = gender === "M" ? "Pria" : "Wanita";
  const mppLabel = mpp === "RP" ? "Reguler" : `${mpp} tahun`;
  return (
    `🔔 Lead baru dari Kalkulator Premi MCCP\n\n` +
    `Nama: ${customerName || "-"}\n` +
    `No. WA: ${customerPhoneDisplay}\n` +
    `Usia: ${age} thn (${genderLabel})\n` +
    `Plan: ${plan} | MPP: ${mppLabel} | UP: ${upLabel}\n` +
    `Estimasi Premi: ${premiumFormatted}\n` +
    `Syarat Medical: ${medicalCode || "-"}`
  );
}

async function sendFonnte(token, target, message) {
  const body = new URLSearchParams();
  body.append("target", target);
  body.append("message", message);
  body.append("countryCode", "62");

  const res = await fetch(FONNTE_URL, {
    method: "POST",
    headers: {
      Authorization: token,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  let json;
  try {
    json = await res.json();
  } catch (e) {
    json = { status: false, raw: await res.text() };
  }
  return { httpOk: res.ok, json };
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: "Body bukan JSON valid" }) };
  }

  const {
    customerName,
    customerPhone,
    age,
    gender,
    plan,
    mpp,
    up,
    upLabel,
    premiumRupiah,
    premiumFormatted,
    medicalCode,
  } = payload;

  if (!customerPhone || String(customerPhone).replace(/[^0-9]/g, "").length < 9) {
    return { statusCode: 400, body: JSON.stringify({ error: "Nomor WhatsApp nasabah tidak valid" }) };
  }
  if (!premiumFormatted || age === undefined || !plan || !mpp) {
    return { statusCode: 400, body: JSON.stringify({ error: "Data hasil kalkulasi tidak lengkap" }) };
  }

  const FONNTE_TOKEN = process.env.FONNTE_TOKEN;
  const AGENT_WA_NUMBER = process.env.AGENT_WA_NUMBER;

  if (!FONNTE_TOKEN) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server belum dikonfigurasi: FONNTE_TOKEN kosong. Set di Netlify Environment Variables." }),
    };
  }

  const customerTarget = normalizePhone(customerPhone);
  const upDisplay = upLabel || up;

  const customerMessage = buildCustomerMessage({ customerName, age, gender, plan, mpp, upLabel: upDisplay, premiumFormatted });
  const agentMessage = buildAgentMessage({
    customerName,
    customerPhoneDisplay: customerTarget,
    age,
    gender,
    plan,
    mpp,
    upLabel: upDisplay,
    premiumFormatted,
    medicalCode,
  });

  try {
    const customerResult = await sendFonnte(FONNTE_TOKEN, customerTarget, customerMessage);

    let agentResult = null;
    if (AGENT_WA_NUMBER) {
      agentResult = await sendFonnte(FONNTE_TOKEN, normalizePhone(AGENT_WA_NUMBER), agentMessage);
    }

    const customerFailed = !customerResult.httpOk || customerResult.json?.status === false;
    if (customerFailed) {
      return {
        statusCode: 502,
        body: JSON.stringify({
          error: "Fonnte menolak pengiriman ke nomor nasabah. Periksa format nomor / kuota Fonnte.",
          detail: customerResult.json,
        }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        customer: customerResult.json,
        agent: agentResult ? agentResult.json : null,
        agentNotified: Boolean(AGENT_WA_NUMBER),
      }),
    };
  } catch (err) {
    return {
      statusCode: 502,
      body: JSON.stringify({ error: "Gagal menghubungi Fonnte API", detail: String(err) }),
    };
  }
};
