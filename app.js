/*-----------------------------------------
  材質推定
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
  μ 推奨値
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
  機器別推奨値
-----------------------------------------*/
function updateRecommendations() {
  const type = document.getElementById("machine_type").value;

  let sf = "-";
  let mu = "-";
  let delta = "-";

  switch(type) {
    case "general":   sf = "1.2〜1.5"; mu = "0.12〜0.18"; delta = "0.8〜1.2 mm/m"; break;
    case "motor":     sf = "1.3〜1.6"; mu = "0.12〜0.20"; delta = "1.0〜1.5 mm/m"; break;
    case "compressor":sf = "1.5〜1.8"; mu = "0.15〜0.25"; delta = "1.2〜1.8 mm/m"; break;
    case "clutch":    sf = "1.8〜2.5"; mu = "0.20〜0.30"; delta = "1.5〜2.5 mm/m"; break;
    case "heavy":     sf = "2.0〜3.0"; mu = "0.20〜0.35"; delta = "2.0〜3.0 mm/m"; break;
    case "vehicle":   sf = "2.5〜3.5"; mu = "0.20〜0.35"; delta = "2.0〜3.5 mm/m"; break;
    case "highspeed": sf = "1.1〜1.3"; mu = "0.10〜0.15"; delta = "0.5〜0.8 mm/m"; break;
  }

  document.getElementById("rec_sf").textContent    = "推奨SF：" + sf;
  document.getElementById("rec_mu").textContent    = "推奨μ：" + mu;
  document.getElementById("rec_delta").textContent = "推奨しめしろ：" + delta;
}

/*-----------------------------------------
  メイン計算（Ft基準）
-----------------------------------------*/
function calc() {

  updateRecommendations();
  suggestMu();

  const d  = parseFloat(document.getElementById("d").value);
  const D  = parseFloat(document.getElementById("D").value);
  const Do = parseFloat(document.getElementById("Do").value);
  const L  = parseFloat(document.getElementById("L").value);

  const E_s = parseFloat(document.getElementById("E_shaft").value);
  const E_h = parseFloat(document.getElementById("E_hub").value);

  const alpha_h = parseFloat(document.getElementById("alpha_hub").value);

  const mu    = parseFloat(document.getElementById("mu").value);
  const Troom = parseFloat(document.getElementById("Troom").value);

  const P = parseFloat(document.getElementById("P").value);
  const n = parseFloat(document.getElementById("n").value);

  /* しめしろ */
  const delta = d - D;

  /* 必要加熱温度 */
  const dT    = delta / (alpha_h * d);
  const Theat = Troom + dT;

  /* 膨張量 */
  const expansion = alpha_h * d * dT;

  /* 面圧（正しい式） */
  const term1 = d / E_s;
  const term2 = (d / E_h) * ((Do*Do + d*d) / (Do*Do - d*d));
  const p     = delta / (term1 + term2);

  /* 伝達トルク */
  const Treq = (9550 * P) / n;

  /* Ft（伝達トルクによって生じる円周方向力） */
  const d_m = d / 1000;
  const Ft  = (2 * Treq) / d_m;

  /* Ff（はめあい部の摩擦力） */
  const A_fit = Math.PI * d * L;
  const Ff    = p * mu * A_fit;

  /* 安全率 */
  const SF = Ff / Ft;

  /* 判定 */
  let judgeText  = "";
  let judgeClass = "";

  if (Ff >= Ft) {
    judgeText  = "OK（Ff＞Ft）";
    judgeClass = "ok";
  } else {
    judgeText  = "NG（Ff＜Ft）";
    judgeClass = "ng";
  }

  /* 表示 */
  document.getElementById("delta").textContent     = delta.toFixed(3);
  document.getElementById("Theat").textContent     = Theat.toFixed(1);
  document.getElementById("expansion").textContent = expansion.toFixed(3);
  document.getElementById("p").textContent         = p.toFixed(1);

  document.getElementById("Ft").textContent   = Ft.toFixed(1);
  document.getElementById("Ff").textContent   = Ff.toFixed(1);
  document.getElementById("Treq").textContent = Treq.toFixed(1);
  document.getElementById("SF").textContent   = SF.toFixed(2);

  const judgeElem = document.getElementById("judge");
  judgeElem.textContent = judgeText;
  judgeElem.className   = "judge " + judgeClass;
}