/*-----------------------------------------
  材質推定（E と α から判定）
-----------------------------------------*/
function detectMaterial(E, alpha) {
  if (E > 200000 && E < 215000 && alpha > 0.000011 && alpha < 0.000013) return "steel";
  if (E > 185000 && E < 200000 && alpha > 0.000016 && alpha < 0.000018) return "sus";
  if (E > 60000 && E < 80000 && alpha > 0.000022 && alpha < 0.000024) return "al";
  if (E > 100000 && E < 120000 && alpha > 0.000015 && alpha < 0.000017) return "cu";
  if (E > 90000 && E < 110000 && alpha > 0.000018 && alpha < 0.000020) return "brass";
  return "unknown";
}

/*-----------------------------------------
  μ 推奨値の自動判定
-----------------------------------------*/
function suggestMu() {
  const E_s = parseFloat(document.getElementById("E_shaft").value);
  const E_h = parseFloat(document.getElementById("E_hub").value);
  const a_s = parseFloat(document.getElementById("alpha_shaft").value);
  const a_h = parseFloat(document.getElementById("alpha_hub").value);

  const m_s = detectMaterial(E_s, a_s);
  const m_h = detectMaterial(E_h, a_h);

  let mu_text = "-";
  let mu_value = 0.15;

  if (m_s === "steel" && m_h === "steel") {
    mu_text = "0.12〜0.18（鋼 × 鋼）";
    mu_value = 0.15;
  } else if (m_s === "steel" && m_h === "sus") {
    mu_text = "0.20〜0.30（鋼 × SUS304）";
    mu_value = 0.25;
  } else if (m_s === "steel" && m_h === "al") {
    mu_text = "0.30〜0.45（鋼 × アルミ）";
    mu_value = 0.35;
  } else if (m_s === "steel" && m_h === "brass") {
    mu_text = "0.25〜0.35（鋼 × 真鍮）";
    mu_value = 0.30;
  } else {
    mu_text = "0.12〜0.18（一般値）";
    mu_value = 0.15;
  }

  document.getElementById("mu_suggest").textContent = "推奨 μ：" + mu_text;
  return mu_value;
}

function setMu() {
  const mu = suggestMu();
  document.getElementById("mu").value = mu;
}

/*-----------------------------------------
  JIS 平行キー寸法の自動選定
-----------------------------------------*/
function autoKey() {
  const d = parseFloat(document.getElementById("d").value);
  let b = 16, h = 10, t = 4.9;

  if (d >= 50 && d < 58) { b = 14; h = 9; t = 4.4; }
  else if (d >= 58 && d < 65) { b = 16; h = 10; t = 4.9; }
  else if (d >= 65 && d < 75) { b = 18; h = 11; t = 5.4; }
  else if (d >= 75 && d < 85) { b = 20; h = 12; t = 5.9; }
  else if (d >= 85 && d < 95) { b = 22; h = 14; t = 6.4; }
  else if (d >= 95 && d <= 110) { b = 25; h = 14; t = 7.4; }

  document.getElementById("key_b").value = b;
  document.getElementById("key_h").value = h;
  document.getElementById("key_t").value = t;
}

/*-----------------------------------------
  キー補正係数（断面欠損）
-----------------------------------------*/
function calcKeyFactor(d, b, t) {
  const A = Math.PI * d * d / 4; // 軸断面積
  const A_key = b * t;           // キー溝欠損
  const loss = A_key / A;
  const k_key = 1 - loss;
  return Math.max(0.5, k_key);   // 最低 0.5（実務的）
}

/*-----------------------------------------
  メイン計算
-----------------------------------------*/
function calc() {

  suggestMu(); // μ 推奨値更新

  const d = parseFloat(document.getElementById("d").value);
  const D = parseFloat(document.getElementById("D").value);
  const Do = parseFloat(document.getElementById("Do").value);
  const L = parseFloat(document.getElementById("L").value);

  const E_s = parseFloat(document.getElementById("E_shaft").value);
  const E_h = parseFloat(document.getElementById("E_hub").value);

  const alpha_h = parseFloat(document.getElementById("alpha_hub").value);

  const mu = parseFloat(document.getElementById("mu").value);
  const Troom = parseFloat(document.getElementById("Troom").value);

  const P = parseFloat(document.getElementById("P").value);
  const n = parseFloat(document.getElementById("n").value);

  const b = parseFloat(document.getElementById("key_b").value);
  const t = parseFloat(document.getElementById("key_t").value);

  /*-----------------------------------------
    しめしろ
  -----------------------------------------*/
  const delta = d - D;

  /*-----------------------------------------
    必要加熱温度（ハブ材質）
  -----------------------------------------*/
  const dT = delta / (alpha_h * d);
  const Theat = Troom + dT;

  /*-----------------------------------------
    面圧（異材質対応）
  -----------------------------------------*/
  const Di = D;
  const term1 = Di / E_s;
  const term2 = (Di / E_h) * ((Do * Do + Di * Di) / (Do * Do - Di * Di));
  const p = delta / (term1 + term2);

  /*-----------------------------------------
    焼きばめ摩擦トルク（補正前）
  -----------------------------------------*/
  const A = Math.PI * d * L;
  const T_raw = mu * p * A * (d / 2) / 1000;

  /*-----------------------------------------
    キー補正係数
  -----------------------------------------*/
  const k_key = calcKeyFactor(d, b, t);
  const T_press = T_raw * k_key;

  /*-----------------------------------------
    キー強度（せん断・押しつぶし）
  -----------------------------------------*/
  const tau = 100;   // MPa（せん断許容）
  const sigma_c = 220; // MPa（押しつぶし許容）

  const T_shear = tau * b * L * (d / 2) / 1000;
  const T_crush = sigma_c * t * L * (d / 2) / 1000;

  /*-----------------------------------------
    最終伝達トルク
  -----------------------------------------*/
  const T_final = Math.min(T_press, T_shear, T_crush);

  /*-----------------------------------------
    必要トルク
  -----------------------------------------*/
  const Treq = (9550 * P) / n;

  /*-----------------------------------------
    安全率
  -----------------------------------------*/
  const SF = T_final / Treq;

  let judge = (SF >= 1.2)
    ? "OK（十分なトルクを伝達できます）"
    : "NG（安全率不足）";

  /*-----------------------------------------
    表示
  -----------------------------------------*/
  document.getElementById("delta").textContent = delta.toFixed(3);
  document.getElementById("Theat").textContent = Theat.toFixed(1);
  document.getElementById("p").textContent = p.toFixed(1);

  document.getElementById("T_raw").textContent = T_raw.toFixed(1);
  document.getElementById("k_key").textContent = k_key.toFixed(3);
  document.getElementById("T_press").textContent = T_press.toFixed(1);

  document.getElementById("T_shear").textContent = T_shear.toFixed(1);
  document.getElementById("T_crush").textContent = T_crush.toFixed(1);

  document.getElementById("Treq").textContent = Treq.toFixed(1);
  document.getElementById("T_final").textContent = T_final.toFixed(1);
  document.getElementById("SF").textContent = SF.toFixed(2);
  document.getElementById("judge").textContent = judge;

  document.getElementById("key_info").textContent =
    "キー補正係数：" + k_key.toFixed(3);
}