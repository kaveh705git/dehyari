const FALLBACK = {
  siteTitle: "دهیاری‌های بخش مرکزی سقز", siteSub: "سامانه اطلاعات دهیاری‌ها",
  sections: [{ key: "dehyar", label: "👤 مشخصات دهیار" }, { key: "roosta", label: "🏘️ مشخصات روستا" }, { key: "mashin", label: "🚜 ماشین آلات" }, { key: "jamiyat", label: "👥 جمعیت" }, { key: "tarh", label: "📋 طرح‌های اجرا شده" }],
  dehyaris: [{ name: "دهیاری روستای قره‌تپه", fields: { dehyar: { "نام": "علی محمدی", "تلفن": "0912..." }, roosta: { "روستا": "قره‌تپه" }, mashin: {}, jamiyat: {}, tarh: {} } }]
};
let DATA = null, editingDehyariIndex = null;

// 🔐 رمز عبور ورود به سایت
const SITE_PASSWORD = "1234";

// 🔐 رمز عبور برای دیدن اطلاعات هاشور زده (محرمانه)
const SECRET_FIELD_PASSWORD = "5555"; 

window.checkSitePassword = function() {
  const inputPass = document.getElementById("sitePassInput").value;
  if (inputPass === SITE_PASSWORD) {
    document.getElementById("login-gate").style.display = "none";
    document.getElementById("main-site").style.display = "block";
    localStorage.setItem("dehyari_site_logged_in", "true");
  } else {
    document.getElementById("sitePassError").style.display = "block";
  }
};

function checkSiteGate() {
  const isLogged = localStorage.getItem("dehyari_site_logged_in");
  if (isLogged === "true") {
    document.getElementById("login-gate").style.display = "none";
    document.getElementById("main-site").style.display = "block";
  }
}

function loadInitialData() {
  if (typeof INITIAL_DATA !== "undefined") { DATA = JSON.parse(JSON.stringify(INITIAL_DATA)); localStorage.setItem("dehyari_panel_v7", JSON.stringify(DATA)); } 
  else { DATA = JSON.parse(localStorage.getItem("dehyari_panel_v7") || JSON.stringify(FALLBACK)); }
  if (!DATA.sections) DATA.sections = FALLBACK.sections;
  if (!DATA.dehyaris) DATA.dehyaris = [];
  DATA.dehyaris.forEach(d => { if (!d.fields) d.fields = {}; });
}
function persist() { localStorage.setItem("dehyari_panel_v7", JSON.stringify(DATA)); }
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

function renderSite() {
  document.getElementById("siteTitle").textContent = DATA.siteTitle || "دهیاری‌ها";
  document.getElementById("siteSub").textContent = DATA.siteSub || "";
  document.title = DATA.siteTitle || "دهیاری‌ها";
  populateSelect();
}
function populateSelect() {
  const sel = document.getElementById("dehyariSelect"); const cur = sel.value;
  sel.innerHTML = '<option value="">-- یک دهیاری را انتخاب کنید --</option>';
  DATA.dehyaris.forEach((d, i) => { const o = document.createElement("option"); o.value = i; o.textContent = d.name; sel.appendChild(o); });
  if (cur) sel.value = cur;
}

function showDehyari(id) {
  const box = document.getElementById("content");
  if (id === "" || id === null) { box.innerHTML = '<div class="empty-msg">برای مشاهده اطلاعات، از منوی بالا یک دهیاری انتخاب کنید.</div>'; return; }
  const d = DATA.dehyaris[Number(id)]; if (!d) return;
  let html = `<div class="card"><div class="card-header">${escapeHtml(d.name)}</div><div class="tabs-container">`;
  DATA.sections.forEach((sec, index) => {
    const activeClass = index === 0 ? "active" : "";
    html += `<button class="main-tab-btn ${activeClass}" onclick="switchMainTab(this, '${sec.key}')">${escapeHtml(sec.label)}</button>`;
  });
  html += `</div><div class="tab-content-area" id="main-tab-content"></div></div>`;
  box.innerHTML = html;
  if (DATA.sections.length > 0) renderTabContent(d, DATA.sections[0].key);
}

window.switchMainTab = function(btn, secKey) {
  document.querySelectorAll(".main-tab-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  const id = document.getElementById("dehyariSelect").value;
  if (id !== "") { const d = DATA.dehyaris[Number(id)]; renderTabContent(d, secKey); }
};

function renderTabContent(d, secKey) {
  const contentArea = document.getElementById("main-tab-content"); if (!contentArea) return;
  const fields = (d.fields && d.fields[secKey]) || {};
  let inner = "";
  
  // دکمه دانلود کارت شناسایی (فقط در منوی مشخصات دهیار)
  if (secKey === "dehyar") {
    inner += `<div style="text-align: center; margin-bottom: 15px;">
      <button onclick="generateIDCard()" class="btn btn-success" style="padding: 10px 20px; border-radius: 8px;">📥 دانلود کارت شناسایی دهیار</button>
    </div>`;
  }

  if (Object.keys(fields).length === 0) { 
    inner += "<p style='color:#6ba3c9; text-align:center;'>اطلاعاتی برای این بخش ثبت نشده است.</p>"; 
  } else {
    Object.entries(fields).forEach(([k, v]) => {
      if (v && typeof v === 'object' && v.type === 'image') {
        inner += `<div class="info-row" style="flex-direction:column; align-items:flex-start;"><span class="label">${escapeHtml(k)}:</span>`;
        if (v.img) inner += `<img src="${v.img}" style="max-width:100%; border-radius:8px; margin:8px 0; max-height:300px; object-fit:contain;">`;
        if (v.text) inner += `<span style="color:#264a6e; margin-top:5px;">${escapeHtml(v.text)}</span>`;
        inner += `</div>`;
      } else {
        const isSecret = k.includes("ملی") || k.includes("تلفن") || k.includes("رمز");
        if (isSecret) {
          inner += `<div class="info-row">
            <span class="label">${escapeHtml(k)}:</span>
            <span id="secret-${secKey}-${k}" style="cursor:pointer; color:#ef5350; font-weight:bold; letter-spacing:2px;" onclick="revealSecret('${secKey}', '${k}', '${escapeHtml(v)}')">
              ******** (برای دیدن کلیک کنید)
            </span>
          </div>`;
        } else {
          inner += `<div class="info-row"><span class="label">${escapeHtml(k)}:</span><span>${escapeHtml(v || "-")}</span></div>`;
        }
      }
    });
  }
  contentArea.innerHTML = inner;
}

// 🔐 تابع نمایش اطلاعات محرمانه با وارد کردن رمز
window.revealSecret = function(secKey, fieldName, realValue) {
  const enteredPass = prompt("برای مشاهده این اطلاعات محرمانه، رمز عبور را وارد کنید:");
  if (enteredPass === null) return;
  
  if (enteredPass === SECRET_FIELD_PASSWORD) {
    const element = document.getElementById(`secret-${secKey}-${fieldName}`);
    if (element) {
      element.textContent = realValue;
      element.style.color = "#0277bd";
      element.style.cursor = "default";
      element.style.fontWeight = "normal";
      element.style.letterSpacing = "normal";
      element.onclick = null;
    }
  } else {
    alert("❌ رمز عبور اشتباه است!");
  }
};

// 🪪 تابع ساخت و دانلود کارت شناسایی
window.generateIDCard = function() {
  const id = document.getElementById("dehyariSelect").value;
  if (id === "") { alert("لطفاً ابتدا یک دهیاری را انتخاب کنید."); return; }
  
  const d = DATA.dehyaris[Number(id)];
  const dehyarFields = d.fields["dehyar"] || {};
  
  let name = "-", phone = "-", nationalId = "-", role = "دهیار", imgUrl = "";
  
  Object.entries(dehyarFields).forEach(([k, v]) => {
    if (k.includes("نام")) name = v;
    if (k.includes("تلفن")) phone = v;
    if (k.includes("ملی")) nationalId = v;
    if (v && typeof v === 'object' && v.type === 'image' && v.img) imgUrl = v.img;
  });

  const cardHTML = `
    <div id="printable-card" style="width: 600px; height: 350px; background: linear-gradient(135deg, #ffffff 0%, #f0f8ff 100%); border-radius: 20px; border: 4px solid #4fc3f7; padding: 20px; display: flex; font-family: Tahoma, sans-serif; position: relative; overflow: hidden; direction: rtl; box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
      <div style="position: absolute; top: 0; left: 0; right: 0; height: 70px; background: #4fc3f7; border-radius: 15px 15px 0 0; display: flex; align-items: center; justify-content: center; color: white; font-size: 22px; font-weight: bold;">
        کارت شناسایی دهیاری
      </div>
      <div style="margin-top: 80px; width: 150px; height: 150px; border-radius: 15px; border: 4px solid #29b6f6; background: #e1f5fe; overflow: hidden; flex-shrink: 0;">
        ${imgUrl ? `<img src="${imgUrl}" style="width: 100%; height: 100%; object-fit: cover;">` : `<div style="display:flex; align-items:center; justify-content:center; height:100%; color:#6ba3c9;">بدون عکس</div>`}
      </div>
      <div style="margin-top: 80px; margin-right: 20px; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <h2 style="color: #0277bd; margin: 0 0 10px 0; font-size: 24px;">${name}</h2>
          <p style="color: #546e7a; margin: 0 0 5px 0; font-size: 16px;"><b>سمت:</b> ${role}</p>
          <p style="color: #546e7a; margin: 0 0 5px 0; font-size: 16px;"><b>کد ملی:</b> ${nationalId}</p>
          <p style="color: #546e7a; margin: 0 0 5px 0; font-size: 16px;"><b>تلفن:</b> ${phone}</p>
        </div>
        <div style="text-align: left; color: #6ba3c9; font-size: 12px; margin-top: 20px;">
          <p style="margin: 0;">دهیاری: ${d.name}</p>
          <p style="margin: 0;">تاریخ صدور: ${new Date().toLocaleDateString('fa-IR')}</p>
        </div>
      </div>
      <div style="position: absolute; bottom: -50px; left: -50px; width: 200px; height: 200px; background: rgba(79, 195, 247, 0.1); border-radius: 50%;"></div>
    </div>
  `;

  const container = document.createElement("div");
  container.innerHTML = cardHTML;
  document.body.appendChild(container);

  if(typeof html2canvas === "undefined") {
    alert("کتابخانه ساخت کارت لود نشده است. لطفاً اینترنت خود را بررسی کنید.");
    document.body.removeChild(container);
    return;
  }

  html2canvas(container.firstElementChild, { scale: 2 }).then(canvas => {
    const link = document.createElement("a");
    link.download = `کارت_شناسایی_${name}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    document.body.removeChild(container);
  }).catch(err => {
    alert("خطا در ساخت کارت: " + err.message);
    document.body.removeChild(container);
  });
};

async function hashPassword(pass) { const enc = new TextEncoder().encode(pass + "|salt"); const buf = await crypto.subtle.digest("SHA-256", enc); return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join(""); }
function getStoredHash() { return localStorage.getItem("dehyari_admin_hash_v7"); }
function setStoredHash(hash) { localStorage.setItem("dehyari_admin_hash_v7", hash); }
async function verifyPassword(pass) { const stored = getStoredHash(); if (!stored) return false; return await hashPassword(pass) === stored; }

function openAdmin() {
  document.getElementById("adminModal").classList.add("active"); document.getElementById("loginScreen").style.display = "block"; document.getElementById("adminPanel").style.display = "none";
  document.getElementById("adminPassword").value = ""; document.getElementById("adminPassword2").value = "";
  const hasHash = !!getStoredHash();
  document.getElementById("firstRunBox").style.display = hasHash ? "none" : "block";
  document.getElementById("confirmPassGroup").style.display = hasHash ? "none" : "block";
  document.getElementById("loginLabel").textContent = hasHash ? "رمز عبور ادمین:" : "تعیین رمز جدید:";
  document.getElementById("loginBtn").textContent = hasHash ? "ورود" : "تعیین رمز و ورود";
}
window.closeAdmin = function() { document.getElementById("adminModal").classList.remove("active"); };

window.checkPassword = async function() {
  const pass = document.getElementById("adminPassword").value; if (!pass) { alert("رمز را وارد کنید."); return; }
  if (!getStoredHash()) {
    const pass2 = document.getElementById("adminPassword2").value;
    if (pass.length < 4) { alert("رمز باید حداقل ۴ کاراکتر باشد."); return; }
    if (pass !== pass2) { alert("رمزها یکسان نیستند."); return; }
    setStoredHash(await hashPassword(pass)); alert("✅ رمز ادمین تنظیم شد."); enterAdminPanel();
  } else { if (await verifyPassword(pass)) enterAdminPanel(); else alert("❌ رمز عبور اشتباه است."); }
};

function enterAdminPanel() { document.getElementById("loginScreen").style.display = "none"; document.getElementById("adminPanel").style.display = "flex"; switchTab("sections"); }
window.emergencyReset = function() { if (!confirm("⚠️ همه داده‌ها و رمز پاک می‌شود. ادامه؟")) return; if (!confirm("مطمئنید؟")) return; localStorage.removeItem("dehyari_admin_hash_v7"); localStorage.removeItem("dehyari_panel_v7"); alert("✅ ریست شد."); location.reload(); };

window.switchTab = function(tab) {
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active")); if (event && event.target) event.target.classList.add("active");
  ["sections", "dehyaris", "settings", "security", "backup"].forEach(t => { document.getElementById("tab-" + t).style.display = (t === tab ? "block" : "none"); });
  if (tab === "sections") renderSectionsTab(); if (tab === "dehyaris") renderDehyarisTab(); if (tab === "settings") renderSettingsTab(); if (tab === "security") renderSecurityTab(); if (tab === "backup") renderBackupTab();
};

function renderSectionsTab() {
  const box = document.getElementById("tab-sections"); let html = `<div class="hint">📑 منوهای سایت را مدیریت کنید.</div>`;
  DATA.sections.forEach((sec, i) => { const fieldCount = countFieldsInSection(sec.key); html += `<div class="list-item"><div><span class="name">${escapeHtml(sec.label)}</span> <span class="badge">${fieldCount} فیلد</span></div><div><button class="btn btn-sm btn-primary" onclick="editSection(${i})">✏️</button><button class="btn btn-sm btn-danger" onclick="deleteSection(${i})">🗑️</button></div></div>`; });
  html += `<button class="btn btn-success" style="margin-top:12px;width:100%;" onclick="addSection()">➕ افزودن بخش جدید</button>`; box.innerHTML = html;
}
function countFieldsInSection(key) { let max = 0; DATA.dehyaris.forEach(d => { const n = Object.keys((d.fields && d.fields[key]) || {}).length; if (n > max) max = n; }); return max; }

window.addSection = function() { const key = "section_" + Date.now(); const label = prompt("نام منوی جدید:", "بخش جدید"); if (!label) return; DATA.sections.push({ key, label }); DATA.dehyaris.forEach(d => { d.fields[key] = {}; }); persist(); renderSectionsTab(); populateSelect(); };
window.editSection = function(i) { const sec = DATA.sections[i]; const nl = prompt("نام جدید بخش:", sec.label); if (!nl) return; sec.label = nl; persist(); renderSectionsTab(); populateSelect(); };
window.deleteSection = function(i) { if (!confirm("این بخش و همه فیلدهایش حذف شود؟")) return; const key = DATA.sections[i].key; DATA.sections.splice(i, 1); DATA.dehyaris.forEach(d => { delete d.fields[key]; }); persist(); renderSectionsTab(); };

function renderDehyarisTab() {
  const box = document.getElementById("tab-dehyaris");
  if (editingDehyariIndex === null) {
    let html = `<div class="hint">🏘️ دهیاری‌ها را مدیریت کنید.</div>`;
    if (DATA.dehyaris.length === 0) html += `<div class="empty-box">هیچ دهیاری ثبت نشده.</div>`;
    else { DATA.dehyaris.forEach((d, i) => { html += `<div class="list-item"><div class="name">${escapeHtml(d.name)}</div><div><button class="btn btn-sm btn-primary" onclick="editDehyari(${i})">✏️</button><button class="btn btn-sm btn-danger" onclick="deleteDehyari(${i})">🗑️</button></div></div>`; }); }
    html += `<button class="btn btn-success" style="margin-top:12px;width:100%;" onclick="addDehyari()">➕ افزودن دهیاری جدید</button>`; box.innerHTML = html; return;
  }
  const d = DATA.dehyaris[editingDehyariIndex];
  let html = `<button class="btn btn-secondary btn-sm" onclick="editingDehyariIndex=null;renderDehyarisTab()">← بازگشت به لیست</button>`;
  html += `<div class="form-group" style="margin-top:12px;"><label>نام دهیاری:</label><input type="text" value="${escapeHtml(d.name)}" onchange="updateDehyariName(this.value)"></div>`;
  DATA.sections.forEach(sec => { if (!d.fields[sec.key]) d.fields[sec.key] = {}; html += `<div class="section-title">${escapeHtml(sec.label)}</div><div id="fields-${sec.key}"></div><button class="add-field-btn" onclick="addFieldToSection('${sec.key}')">➕ افزودن فیلد</button>`; });
  box.innerHTML = html; DATA.sections.forEach(sec => renderFieldsForSection(sec.key));
}

function renderFieldsForSection(secKey) {
  const d = DATA.dehyaris[editingDehyariIndex]; const container = document.getElementById("fields-" + secKey); if (!container) return;
  const fields = d.fields[secKey] || {}; let html = ""; const entries = Object.entries(fields);
  if (entries.length === 0) html = `<div class="empty-box" style="padding:10px;">فیلدی ندارد.</div>`;
  else {
    entries.forEach(([k, v], idx) => {
      const isImg = (v && typeof v === 'object' && v.type === 'image');
      html += `<div class="field-row" style="flex-direction:column; align-items:stretch; background:#f8fdff;"><div style="display:flex; gap:6px; margin-bottom:8px;"><input class="field-key" style="flex:1;" type="text" value="${escapeHtml(k)}" onchange="renameField('${secKey}', ${idx}, this.value)"><button class="icon-btn" onclick="deleteField('${secKey}', ${idx})">✕</button></div>`;
      if (isImg) {
        html += `<div style="background:white; padding:10px; border-radius:6px; border:1px solid #b3e5fc;">`;
        if (v.img) html += `<img src="${v.img}" style="max-width:100%; max-height:150px; border-radius:6px; margin-bottom:8px; display:block;">`;
        html += `<label style="font-size:0.8rem; color:#0277bd;">آپلود عکس:</label>`;
        html += `<select id="size_${secKey}_${idx}" style="width:100%; margin-bottom:8px; padding:6px; border-radius:6px; border:1px solid #b3e5fc; font-family:inherit; font-size:0.8rem;">
          <option value="personnel">عکس پرسنلی (مربع)</option>
          <option value="custom">اندازه دلخواه</option>
        </select>`;
        html += `<input type="file" accept="image/*" onchange="uploadImage(event, '${secKey}', ${idx})" style="font-size:0.8rem; margin-bottom:8px; display:block;">`;
        html += `<label style="font-size:0.8rem; color:#0277bd;">توضیحات زیر عکس:</label><textarea onchange="updateImgText('${secKey}', ${idx}, this.value)" style="min-height:60px;">${escapeHtml(v.text || "")}</textarea></div>`;
      } else {
        html += `<div class="field-val">`;
        if (String(v).length > 60) html += `<textarea onchange="updateFieldValue('${secKey}', ${idx}, this.value)">${escapeHtml(v)}</textarea>`;
        else html += `<input type="text" value="${escapeHtml(v)}" onchange="updateFieldValue('${secKey}', ${idx}, this.value)">`;
        html += `</div>`;
      }
      html += `</div>`;
    });
  }
  container.innerHTML = html;
}

window.addDehyari = function() { const name = prompt("نام دهیاری جدید:", "دهیاری ..."); if (!name) return; const newD = { name, fields: {} }; DATA.sections.forEach(sec => { newD.fields[sec.key] = {}; }); DATA.dehyaris.push(newD); persist(); editingDehyariIndex = DATA.dehyaris.length - 1; renderDehyarisTab(); populateSelect(); };
window.editDehyari = function(i) { editingDehyariIndex = i; renderDehyarisTab(); };
window.deleteDehyari = function(i) { if (!confirm(`«${DATA.dehyaris[i].name}» حذف شود؟`)) return; DATA.dehyaris.splice(i, 1); persist(); renderDehyarisTab(); populateSelect(); showDehyari(document.getElementById("dehyariSelect").value); };
window.updateDehyariName = function(val) { DATA.dehyaris[editingDehyariIndex].name = val; persist(); populateSelect(); };

window.addFieldToSection = function(secKey) {
  const type = confirm("آیا این فیلد باید «عکس + توضیحات» باشد؟\n\n(برای فیلد متنی معمولی، دکمه Cancel را بزنید)");
  const key = prompt("نام فیلد جدید:", "فیلد جدید"); if (!key) return;
  const d = DATA.dehyaris[editingDehyariIndex]; if (!d.fields[secKey]) d.fields[secKey] = {};
  if (d.fields[secKey][key] !== undefined) { alert("تکراری است."); return; }
  if (type) d.fields[secKey][key] = { type: "image", img: "", text: "" }; else d.fields[secKey][key] = "";
  persist(); renderFieldsForSection(secKey);
};

window.renameField = function(secKey, idx, newKey) {
  const d = DATA.dehyaris[editingDehyariIndex]; const entries = Object.entries(d.fields[secKey]); if (!entries[idx]) return;
  const oldKey = entries[idx][0]; if (oldKey === newKey) return; const nf = {};
  Object.entries(d.fields[secKey]).forEach(([k, v]) => { if (k === oldKey) nf[newKey] = v; else nf[k] = v; });
  d.fields[secKey] = nf; persist(); renderFieldsForSection(secKey);
};

window.updateFieldValue = function(secKey, idx, val) { const d = DATA.dehyaris[editingDehyariIndex]; const keys = Object.keys(d.fields[secKey]); if (keys[idx]) { d.fields[secKey][keys[idx]] = val; persist(); } };
window.updateImgText = function(secKey, idx, val) { const d = DATA.dehyaris[editingDehyariIndex]; const keys = Object.keys(d.fields[secKey]); if (keys[idx]) { d.fields[secKey][keys[idx]].text = val; persist(); } };

window.uploadImage = function(event, secKey, idx) {
  const file = event.target.files[0]; if (!file) return;
  
  const sizeSelect = document.getElementById("size_" + secKey + "_" + idx);
  const sizeType = sizeSelect ? sizeSelect.value : "personnel";

  let targetWidth = 300;
  let targetHeight = 300;

  if (sizeType === "custom") {
    const w = prompt("عرض دلخواه را به پیکسل وارد کنید (مثلاً 800):", "600");
    const h = prompt("ارتفاع دلخواه را به پیکسل وارد کنید (مثلاً 400):", "400");
    if (!w || !h || isNaN(w) || isNaN(h)) { alert("مقادیر معتبر نیستند."); return; }
    targetWidth = parseInt(w);
    targetHeight = parseInt(h);
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
      
      const d = DATA.dehyaris[editingDehyariIndex]; const keys = Object.keys(d.fields[secKey]);
      if (keys[idx]) { d.fields[secKey][keys[idx]].img = dataUrl; persist(); renderFieldsForSection(secKey); }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
};

window.deleteField = function(secKey, idx) { const d = DATA.dehyaris[editingDehyariIndex]; const keys = Object.keys(d.fields[secKey]); if (!keys[idx]) return; if (!confirm(`فیلد «${keys[idx]}» حذف شود؟`)) return; delete d.fields[secKey][keys[idx]]; persist(); renderFieldsForSection(secKey); };

function renderSettingsTab() { const box = document.getElementById("tab-settings"); box.innerHTML = `<div class="hint">⚙️ تنظیمات کلی.</div><div class="form-group"><label>عنوان اصلی:</label><input type="text" id="setting-title" value="${escapeHtml(DATA.siteTitle || "")}"></div><div class="form-group"><label>زیرعنوان:</label><input type="text" id="setting-sub" value="${escapeHtml(DATA.siteSub || "")}"></div><button class="btn btn-success" style="width:100%;" onclick="saveSettings()">💾 ذخیره</button>`; }
window.saveSettings = function() { DATA.siteTitle = document.getElementById("setting-title").value.trim() || "دهیاری‌ها"; DATA.siteSub = document.getElementById("setting-sub").value.trim(); persist(); renderSite(); alert("✅ ذخیره شد."); };

function renderSecurityTab() { const box = document.getElementById("tab-security"); box.innerHTML = `<div class="hint">🔐 مدیریت رمز ادمین.</div><div class="form-group"><label>رمز فعلی:</label><input type="password" id="sec-old-pass"></div><div class="form-group"><label>رمز جدید:</label><input type="password" id="sec-new-pass"></div><div class="form-group"><label>تکرار رمز جدید:</label><input type="password" id="sec-new-pass2"></div><button class="btn btn-warning" style="width:100%;" onclick="changePassword()">🔄 تغییر رمز</button><div class="section-title" style="color:#c62828; margin-top:25px;">⚠️ منطقه خطر</div><button class="btn btn-danger" style="width:100%;" onclick="emergencyReset()">🆘 ریست کامل</button>`; }
window.changePassword = async function() { const oldPass = document.getElementById("sec-old-pass").value; const newPass = document.getElementById("sec-new-pass").value; const newPass2 = document.getElementById("sec-new-pass2").value; if (!await verifyPassword(oldPass)) { alert("❌ رمز فعلی اشتباه."); return; } if (newPass.length < 4) { alert("حداقل ۴ کاراکتر."); return; } if (newPass !== newPass2) { alert("یکسان نیستند."); return; } setStoredHash(await hashPassword(newPass)); alert("✅ تغییر کرد."); };

function renderBackupTab() { const box = document.getElementById("tab-backup"); box.innerHTML = `<div class="hint">💾 برای اعمال دائمی تغییرات، فایل data.js را دانلود کرده و در گیت‌هاب آپلود کنید.</div><div class="section-title">📤 خروجی</div><button class="btn btn-success" style="width:100%; margin-bottom:10px;" onclick="downloadDataJs()">⬇️ دانلود فایل data.js</button><button class="btn btn-primary" style="width:100%; margin-bottom:20px;" onclick="downloadJson()">⬇️ دانلود فایل JSON</button><div class="section-title">📥 ورودی</div><input type="file" id="uploadFile" accept=".js,.json" style="display:none" onchange="handleFileUpload(event)"><button class="btn btn-warning" style="width:100%;" onclick="document.getElementById('uploadFile').click()">📂 بارگذاری فایل پشتیبان</button>`; }

window.downloadDataJs = function() { const jsContent = "const INITIAL_DATA = " + JSON.stringify(DATA, null, 2) + ";\n"; const blob = new Blob([jsContent], { type: "text/javascript;charset=utf-8" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "data.js"; a.click(); };
window.downloadJson = function() { const blob = new Blob([JSON.stringify(DATA, null, 2)], { type: "application/json;charset=utf-8" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "dehyari-backup.json"; a.click(); };

window.handleFileUpload = function(e) {
  const file = e.target.files[0]; if (!file) return; const reader = new FileReader();
  reader.onload = function(ev) {
    try {
      let parsed = null;
      if (file.name.endsWith(".json")) parsed = JSON.parse(ev.target.result);
      else { const match = ev.target.result.match(/const\s+INITIAL_DATA\s*=\s*([\s\S]*?);\s*$/m); if (match) parsed = eval("(" + match[1] + ")"); else parsed = eval("(" + ev.target.result + ")"); }
      if (!parsed || !parsed.dehyaris) throw new Error("ساختار نامعتبر");
      if (!confirm("داده‌های فعلی جایگزین شوند؟")) return; DATA = parsed; if (!DATA.sections) DATA.sections = FALLBACK.sections; persist(); renderSite(); switchTab("sections"); alert("✅ فایل با موفقیت بارگذاری شد.");
    } catch(err) { alert("❌ خطا: " + err.message); }
  };
  reader.readAsText(file); e.target.value = "";
};

window.saveAllAndRefresh = function() { persist(); renderSite(); const cur = document.getElementById("dehyariSelect").value; if (cur) showDehyari(cur); closeAdmin(); alert("✅ ذخیره شد."); };

let clickCount = 0; let clickTimer = null;
window.handleHeaderClick = function() {
  clickCount++; clearTimeout(clickTimer);
  clickTimer = setTimeout(function() { clickCount = 0; }, 1500);
  if (clickCount >= 6) { clickCount = 0; clearTimeout(clickTimer); openAdmin(); }
};

loadInitialData(); renderSite(); showDehyari(""); checkSiteGate();
document.getElementById("adminModal").addEventListener("click", function(e) { if (e.target === this) closeAdmin(); });
