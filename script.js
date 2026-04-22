const types = { lek: true, prak: true, lab: true, srsp: true };
const colors = { lek: '#3b82f6', prak: '#10b981', lab: '#f59e0b', srsp: '#8b5cf6' };
const names  = { lek: 'Лекция', prak: 'Практика', lab: 'Лаборатория', srsp: 'СРСП' };

// Weight coefficients depending on active types
function getCoef(type) {
  const l = types.lek, p = types.prak, b = types.lab, s = types.srsp;
  const active = [l&&'lek', p&&'prak', b&&'lab', s&&'srsp'].filter(Boolean);
  if(!active.includes(type)) return 0;

  // Определяем комбинацию активных типов
  const allFour = l && p && b && s;
  const lps = l && p && !b && s;      // лекция+практика+срсп
  const lbs = l && !p && b && s;      // лекция+лабка+срсп
  const ps = !l && p && !b && s;      // практика+срсп
  const ls = l && !p && !b && s;      // лекция+срсп

  // Веса по таблице (К1 – К5)
  if (allFour) {
    // К1: лек 0.2 + прак 0.3 + лаб 0.3 + срсп 0.2 = 1.0
    return { lek: 0.2, prak: 0.3, lab: 0.3, srsp: 0.2 }[type] ?? 0;
  }
  if (lps) {
    // К2: лек 0.3 + прак 0.5 + срсп 0.2 = 1.0 (нет лабки)
    return { lek: 0.3, prak: 0.5, lab: 0, srsp: 0.2 }[type] ?? 0;
  }
  if (lbs) {
    // К3: лек 0.3 + лаб 0.5 + срсп 0.2 = 1.0 (нет прак)
    return { lek: 0.3, prak: 0, lab: 0.5, srsp: 0.2 }[type] ?? 0;
  }
  if (ps) {
    // К4: прак 0.9 + срсп 0.1 = 1.0 (нет лек, лаб)
    return { lek: 0, prak: 0.9, lab: 0, srsp: 0.1 }[type] ?? 0;
  }
  if (ls) {
    // К5: лек 0.5 + срсп 0.5 = 1.0 (нет лаб, прак)
    return { lek: 0.5, prak: 0, lab: 0, srsp: 0.5 }[type] ?? 0;
  }
  // Если активен только один тип – вес 1
  if(active.length === 1) return 1;

  // Для остальных редких комбинаций (например, только практика+лаба) – равные веса
  return 1 / active.length;
}

function parseVal(v) {
  if(v===undefined||v===null) return null;
  const str = String(v).trim();
  if(str==='') return null;
  const u = str.toUpperCase();
  if(u==='НП') return null;
  if(u==='НЯ') return 0;
  const n = parseFloat(str.replace(',','.'));
  return isNaN(n)?null:Math.min(100,Math.max(0,n));
}
function round2(x){ return x!==null?Math.round(x*100)/100:null; }
function avg(arr){ const f=arr.filter(v=>v!==null); return f.length?round2(f.reduce((a,b)=>a+b,0)/f.length):null; }

function updateStyle(el, isRk=false) {
  const v = el.value.trim().toUpperCase();
  el.classList.remove('np','nya');
  if(v===''||v==='НП') el.classList.add('np');
  else if(v==='НЯ') el.classList.add('nya');
}
function handleFocus(el){
  // Если фокус на экзамене и он был автоматом — сбросить, дать ввести вручную
  if(el.id==='exam' && el.classList.contains('avtomat')){
    el.classList.remove('avtomat');
    el.value='НП';
    updateStyle(el, true);
    const wr=document.getElementById('examWrapper');
    if(wr) wr.classList.remove('is-avtomat');
  }
  if(el.value.trim().toUpperCase()==='НП') el.select();
}
function handleBlur(el){
  let v = el.value.trim();

  if(v==='') { 
    el.value='НП'; 
    updateStyle(el); 
    return; 
  }

  const u = v.toUpperCase();

  if(u==='НП' || u==='НЯ'){ 
    el.value = u; 
    updateStyle(el); 
    return; 
  }

  const n = parseFloat(v.replace(',','.'));

  if (!isNaN(n)) {

    // ❌ проверка на допустимый диапазон
    if (n > 100 || n < 0) {
      alert('Недопустимое значение');
      el.classList.add('error');
      return;
    }

    // ✅ если всё ок
    el.classList.remove('error');
    el.value = n.toString();
  }

  updateStyle(el);
}

function makeInput(id, isRk=false) {
  const inp = document.createElement('input');
  inp.type = 'text';
  inp.className = isRk ? 'rk-input np' : 'week-input np';
  inp.value = 'НП';
  inp.id = id;
  if(!isRk) inp.style.width = '46px';
  inp.onfocus = () => handleFocus(inp);
  inp.oninput  = () => updateStyle(inp, isRk);
  inp.onblur   = () => handleBlur(inp);
  return inp;
}
// ===== ИСТОРИЯ РАСЧЁТОВ =====
let calcHistory = [];
let historyVisible = true;
let selectedHistoryIndex = null;
 
function saveToHistory(data) {
  const timestamp = new Date();
  const historyEntry = {
  id: Date.now(),
  time: timestamp.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
  date: timestamp.toLocaleDateString('ru-RU'),
  rk1: data.rk1,
  rk2: data.rk2,
  rd: data.rd,
  exam: data.exam,
  io: data.io,
  grade: data.grade,
  isAvtomat: data.isAvtomat,
  dopusk: data.dopusk,
  weeks: data.weeks,
  rk1val: data.rk1val,
  rk2val: data.rk2val,
  examval: data.examval,
  };
  calcHistory.unshift(historyEntry);
  if (calcHistory.length > 20) calcHistory.pop();
  updateHistoryUI();
  saveToLocalStorage();
  // 👉 автоматически показываем историю после расчёта
const section = document.getElementById('historySection');
section.classList.add('show');

const btn = document.querySelector('.history-btn');
if (btn) btn.textContent = 'Скрыть';

historyVisible = true;
}

function updateHistoryUI() {
  const historyList = document.getElementById('historyList');
  const historyEmpty = document.getElementById('historyEmpty');
  
  if (calcHistory.length === 0) {
    historyList.innerHTML = '';
    historyEmpty.style.display = 'block';
    return;
  }
  
  historyEmpty.style.display = 'none';
  historyList.innerHTML = calcHistory.map((entry, idx) => `
    <div class="history-item ${selectedHistoryIndex === idx ? 'active' : ''}" onclick="selectHistoryItem(${idx})">
      <div class="history-item-header">
        <div>
          <div class="history-item-time">${entry.date}</div>
          <div class="history-item-time">${entry.time}</div>
        </div>
        <button class="history-item-delete" onclick="deleteHistoryItem(event, ${idx})">✕</button>
      </div>
      <div class="history-item-grade" style="color: ${entry.isAvtomat ? '#34d399' : '#60a5fa'}">${entry.grade}</div>
      <div class="history-item-details">
        <span><span class="label">РК1:</span><span class="value">${entry.rk1 !== null ? entry.rk1.toFixed(2) : '—'}</span></span>
        <span><span class="label">РК2:</span><span class="value">${entry.rk2 !== null ? entry.rk2.toFixed(2) : '—'}</span></span>
        <span><span class="label">РД:</span><span class="value">${entry.rd !== null ? entry.rd.toFixed(2) : '—'}</span></span>
        <span><span class="label">Экзамен:</span><span class="value">${entry.exam !== null ? (Math.round(entry.exam)).toFixed(2) : '—'}${entry.isAvtomat ? ' 🏆' : ''}</span></span>
        <span><span class="label">ИО:</span><span class="value">${entry.io !== null ? (Math.round(entry.io)).toFixed(2) : '—'}</span></span>
      </div>
    </div>
  `).join('');
}
 
function selectHistoryItem(idx) {
  selectedHistoryIndex = idx;
  updateHistoryUI();
  showComparison(idx);
  const entry = calcHistory[idx];
  if(!entry.weeks) return;
  ['lek','prak','lab','srsp'].forEach(type => {
    entry.weeks[type].forEach((val,i) => {
      const el = document.getElementById(`${type}-w${i+1}`);
      if(el){ el.value=val; updateStyle(el); }
    });
  });
  ['rk1','rk2','exam'].forEach(id => {
    const el = document.getElementById(id);
    const val = entry[id+'val'];
    if(el && val){ el.value=val; updateStyle(el,true); }
  });
}
 
function deleteHistoryItem(event, idx) {
  event.stopPropagation();
  calcHistory.splice(idx, 1);
  selectedHistoryIndex = null;
  updateHistoryUI();
  document.getElementById('historyComparison').style.display = 'none';
  saveToLocalStorage();
}
 
function toggleHistory() {
  const section = document.getElementById('historySection');
  const buttons = document.querySelectorAll('.history-btn');
  const btn = buttons[0]; // берём первую кнопку (Показать/Скрыть)
  
  historyVisible = !historyVisible;
  
  if (historyVisible) {
    section.classList.add('show');
    btn.textContent = 'Скрыть';
  } else {
    section.classList.remove('show');
    btn.textContent = 'Показать';
  }
}
 
function clearHistory() {
  if (confirm('Удалить всю историю расчётов? Это действие не можно отменить.')) {
    calcHistory = [];
    selectedHistoryIndex = null;
    historyVisible = false;
    updateHistoryUI();
    document.getElementById('historySection').classList.remove('show');
    document.getElementById('historyComparison').style.display = 'none';
    saveToLocalStorage();
  }
}
 
function showComparison(idx) {
  if (idx === 0 || calcHistory.length < 2) {
    document.getElementById('historyComparison').style.display = 'none';
    return;
  }
  
  const current = calcHistory[idx];
  const previous = calcHistory[idx - 1];
  const comparison = document.getElementById('historyComparison');
  const content = document.getElementById('comparisonContent');
  
  const formatDiff = (curr, prev) => {
    if (curr === null || prev === null) return '—';
    const diff = curr - prev;
    const sign = diff > 0 ? '+' : '';
    return `${sign}${diff.toFixed(2)}`;
  };
  
  content.innerHTML = `
    <div class="comparison-row">
      <span class="comparison-label">РК1:</span>
      <span class="comparison-value">${formatDiff(current.rk1, previous.rk1)}</span>
    </div>
    <div class="comparison-row">
      <span class="comparison-label">РК2:</span>
      <span class="comparison-value">${formatDiff(current.rk2, previous.rk2)}</span>
    </div>
    <div class="comparison-row">
      <span class="comparison-label">РД:</span>
      <span class="comparison-value">${formatDiff(current.rd, previous.rd)}</span>
    </div>
    <div class="comparison-row">
      <span class="comparison-label">ИО:</span>
      <span class="comparison-value">${formatDiff(current.io, previous.io)}</span>
    </div>
  `;
  
  comparison.style.display = 'block';
}
 
function saveToLocalStorage() {
  localStorage.setItem('calcHistory', JSON.stringify(calcHistory));
}
 
function loadFromLocalStorage() {
  const saved = localStorage.getItem('calcHistory');
  if (saved) {
    try {
      calcHistory = JSON.parse(saved);
      updateHistoryUI();
    } catch (e) {
      console.error('Ошибка при загрузке истории:', e);
    }
  }
}
 
// Загрузить историю при загрузке страницы
loadFromLocalStorage();
// Показываем историю по дефолту
document.getElementById('historySection').classList.add('show');
document.querySelector('.history-btn').textContent = 'Скрыть';
historyVisible = true;
function buildTable() {
  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = '';
  const disciplines = ['lek','prak','lab','srsp'];

  disciplines.forEach((type, idx) => {
    const tr = document.createElement('tr');
    tr.id = `row-${type}`;
    if(!types[type]) tr.style.opacity='0.4';

    // Discipline name
    const tdName = document.createElement('td');
    tdName.className = 'discipline-label';
    tdName.innerHTML = `<span class="dot" style="background:${colors[type]}"></span>${names[type]}`;
    tr.appendChild(tdName);

    // Weeks 1-7
    for(let w=1;w<=7;w++){
      const td=document.createElement('td');
      td.appendChild(makeInput(`${type}-w${w}`));
      tr.appendChild(td);
    }

    // ТК1 (avg weeks 1-7 for this discipline)
    const tdTk1=document.createElement('td');
    tdTk1.id=`tk1-${type}`; tdTk1.textContent='—'; tdTk1.className='result-cell';
    tr.appendChild(tdTk1);

    // === SHARED CELLS (only first row gets rowspan=4) ===
    if(idx===0){
      // ТК1ОБЩ
      const tdTk1o=document.createElement('td');
      tdTk1o.id='tk1obsh'; tdTk1o.textContent='—';
      tdTk1o.className='result-cell shared'; tdTk1o.rowSpan=4;
      tdTk1o.style.cssText='background:#0a1628;border:1px solid #1e3a5f;';
      tr.appendChild(tdTk1o);
      // РК1
      const tdRk1=document.createElement('td');
      tdRk1.rowSpan=4;
      tdRk1.style.cssText='background:#0a1628;border:1px solid #1e3a5f;';
      tdRk1.appendChild(makeInput('rk1',true));
      tr.appendChild(tdRk1);
      // Р1
      const tdP1=document.createElement('td');
      tdP1.id='p1'; tdP1.textContent='—';
      tdP1.className='result-cell shared'; tdP1.rowSpan=4;
      tdP1.style.cssText='background:#0a1628;border:1px solid #1e3a5f;';
      tr.appendChild(tdP1);
    }

    // Weeks 8-15
    for(let w=8;w<=15;w++){
      const td=document.createElement('td');
      td.appendChild(makeInput(`${type}-w${w}`));
      tr.appendChild(td);
    }

    // ТК2 (avg weeks 8-15 for this discipline)
    const tdTk2=document.createElement('td');
    tdTk2.id=`tk2-${type}`; tdTk2.textContent='—'; tdTk2.className='result-cell';
    tr.appendChild(tdTk2);

    // === SHARED CELLS second half (only first row) ===
    if(idx===0){
      // ТК2ОБЩ
      const tdTk2o=document.createElement('td');
      tdTk2o.id='tk2obsh'; tdTk2o.textContent='—';
      tdTk2o.className='result-cell shared'; tdTk2o.rowSpan=4;
      tdTk2o.style.cssText='background:#0a1628;border:1px solid #1e3a5f;';
      tr.appendChild(tdTk2o);
      // РК2
      const tdRk2=document.createElement('td');
      tdRk2.rowSpan=4;
      tdRk2.style.cssText='background:#0a1628;border:1px solid #1e3a5f;';
      tdRk2.appendChild(makeInput('rk2',true));
      tr.appendChild(tdRk2);
      // Р2
      const tdP2=document.createElement('td');
      tdP2.id='p2'; tdP2.textContent='—';
      tdP2.className='result-cell shared'; tdP2.rowSpan=4;
      tdP2.style.cssText='background:#0a1628;border:1px solid #1e3a5f;';
      tr.appendChild(tdP2);
      // РД
      const tdRd=document.createElement('td');
      tdRd.id='rd'; tdRd.textContent='—';
      tdRd.className='result-cell'; tdRd.rowSpan=4;
      tdRd.style.cssText='background:#0a1628;border:1px solid #1e3a5f;font-size:0.85rem;';
      tr.appendChild(tdRd);
      // Экзамен
      const tdEx=document.createElement('td');
      tdEx.rowSpan=4;
      tdEx.style.cssText='background:#0a1628;border:1px solid #1e3a5f;';
      const examWrapper=document.createElement('div');
      examWrapper.className='exam-wrapper';
      examWrapper.id='examWrapper';
      const lbl=document.createElement('span');
      lbl.className='avtomat-label';
      lbl.textContent='🏆 АВТОМАТ';
      examWrapper.appendChild(lbl);
      examWrapper.appendChild(makeInput('exam',true));
      tdEx.appendChild(examWrapper);
      tr.appendChild(tdEx);
      // ИО
      const tdIo=document.createElement('td');
      tdIo.id='io'; tdIo.textContent='—';
      tdIo.className='result-cell'; tdIo.rowSpan=4;
      tdIo.style.cssText='background:#0a1628;border:1px solid #1e3a5f;font-size:0.85rem;';
      tr.appendChild(tdIo);
      // Буква
      const tdGr=document.createElement('td');
      tdGr.id='grade'; tdGr.textContent='—';
      tdGr.className='result-cell'; tdGr.rowSpan=4;
      tdGr.style.cssText='background:#0a1628;border:1px solid #1e3a5f;font-size:0.9rem;color:#60a5fa;';
      tr.appendChild(tdGr);
    }

    tbody.appendChild(tr);
  });
}

function resetAllGrades(){
  if(!confirm('Сбросить все оценки? (Все значения станут НП)')) return;
  
  // Сбрасываем все недельные оценки
  for(const type of ['lek','prak','lab','srsp']){
    for(let w=1;w<=15;w++){
      const el=document.getElementById(`${type}-w${w}`);
      if(el){ el.value='НП'; updateStyle(el); }
    }
  }
  
  // Сбрасываем РК1, РК2, Экзамен
  ['rk1','rk2','exam'].forEach(id=>{
    const el=document.getElementById(id);
    if(el){ el.value='НП'; updateStyle(el,true); }
  });
  
  // Сбрасываем авто-лейбл
  const wr=document.getElementById('examWrapper');
  if(wr) wr.classList.remove('is-avtomat');
  
  // Скрываем результаты
  document.getElementById('resultCard').style.display='none';
  
  // === НОВОЕ: сброс вычисляемых ячеек ===
  // Сброс ТК1 и ТК2 по дисциплинам
  for(const type of ['lek','prak','lab','srsp']){
    const tk1El = document.getElementById(`tk1-${type}`);
    const tk2El = document.getElementById(`tk2-${type}`);
    if(tk1El) tk1El.textContent = '—';
    if(tk2El) tk2El.textContent = '—';
  }
  // Сброс общих ячеек
  const sharedCells = ['tk1obsh', 'tk2obsh', 'p1', 'p2', 'rd', 'io', 'grade'];
  sharedCells.forEach(id => {
    const el = document.getElementById(id);
    if(el) el.textContent = '—';
  });
  // Сброс цветов (необязательно)
  const rdEl = document.getElementById('rd');
  if(rdEl) rdEl.style.color = '';
  const ioEl = document.getElementById('io');
  if(ioEl) ioEl.style.color = '';

  fixFinalCellsBackground();
}

function toggleType(type, btn){
  types[type]=!types[type];
  btn.classList.toggle('active',types[type]);
  const row=document.getElementById(`row-${type}`);
  if(row) row.style.opacity=types[type]?'1':'0.4';
// после этой строки добавить:
document.querySelectorAll('#row-lek td[rowspan]').forEach(td => {
  td.style.opacity = '1';
});

  // общие ячейки всегда остаются яркими
  const sharedcells = ['tk1obsh','rk1','p1','tk2obsh','rk2','p2','rd','exam','io','grade'];
  sharedcells.forEach(id => {
    const el = document.getElementById(id);
    if(el){
      el.style.opacity = '1';
      el.closest('td') && (el.closest('td').style.opacity = '1');
    }
  });
  // также td с input#rk1 и input#rk2
  ['rk1','rk2','exam'].forEach(id => {
    const el = document.getElementById(id);
    if(el && el.closest('td')) el.closest('td').style.opacity = '1';
  });
}

function getLetter(s){
  if(s>=95)return'A'; if(s>=90)return'A−'; if(s>=85)return'B+';
  if(s>=80)return'B';  if(s>=75)return'B−'; if(s>=70)return'C+';
  if(s>=65)return'C';  if(s>=60)return'C−'; if(s>=55)return'D+';
  if(s>=50)return'D−'; if(s>=25)return'FX'; return'F';
}

function validateAllInputs() {
  const invalidFields = [];

  const allInputs = document.querySelectorAll('input[type="text"]');

  allInputs.forEach(el => {
    const raw = el.value.trim();

    if (raw === '' || raw.toUpperCase() === 'НП' || raw.toUpperCase() === 'НЯ') {
      el.classList.remove('error');
      return;
    }

    const num = parseFloat(raw.replace(',', '.'));

    if (isNaN(num) || num < 0 || num > 100) {
      el.classList.add('error');

      let fieldName = el.id;

      if (el.id.startsWith('lek-w')) fieldName = `Лекция, неделя ${el.id.replace('lek-w','')}`;
      else if (el.id.startsWith('prak-w')) fieldName = `Практика, неделя ${el.id.replace('prak-w','')}`;
      else if (el.id.startsWith('lab-w')) fieldName = `Лаборатория, неделя ${el.id.replace('lab-w','')}`;
      else if (el.id.startsWith('srsp-w')) fieldName = `СРСП, неделя ${el.id.replace('srsp-w','')}`;
      else if (el.id === 'rk1') fieldName = 'РК1';
      else if (el.id === 'rk2') fieldName = 'РК2';
      else if (el.id === 'exam') fieldName = 'Экзамен';

      invalidFields.push(`${fieldName}: ${raw}`);
    } else {
      el.classList.remove('error');
    }
  });

  return invalidFields;
}
function calculate(){
  const detailBlock = document.getElementById('detailBlock');
  const finalGradeBlock = document.getElementById('finalGradeBlock');
  const resultGrid = document.getElementById('resultGrid');
  const validationErrorBlock = document.getElementById('validationErrorBlock');
  const validationErrorText = document.getElementById('validationErrorText');
  const statusDiv = document.getElementById('statusBadge');
const deniedBlock = document.getElementById('deniedBlock');

  const invalidFields = validateAllInputs();

  if (invalidFields.length > 0) {
    resultGrid.innerHTML = '';
    statusDiv.innerHTML = `<span class="status-badge denied">✗ Расчёт невозможен</span>`;
    deniedBlock.style.display = 'none';
    validationErrorBlock.style.display = 'block';
    validationErrorText.innerHTML = invalidFields.join(' · ');
    detailBlock.innerHTML = 'Исправьте недопустимые значения и повторите расчёт.';
    finalGradeBlock.style.display = 'none';
    document.getElementById('resultCard').style.display = 'block';
    document.getElementById('resultCard').scrollIntoView({behavior:'smooth'});
    return;
  } else {
    validationErrorBlock.style.display = 'none';
  }
  // --- Step 1: per-discipline TK1, TK2 ---
  const tk = {};
  for(const type of ['lek','prak','lab','srsp']){
    const w1to7  = [], w8to15 = [];
    for(let w=1;w<=7;w++)  w1to7.push(parseVal(document.getElementById(`${type}-w${w}`)?.value));
    for(let w=8;w<=15;w++) w8to15.push(parseVal(document.getElementById(`${type}-w${w}`)?.value));
    tk[type] = { tk1: avg(w1to7), tk2: avg(w8to15) };
    const el1=document.getElementById(`tk1-${type}`);
    const el2=document.getElementById(`tk2-${type}`);
    if(el1) el1.textContent = tk[type].tk1!==null ? tk[type].tk1.toFixed(2) : '—';
    if(el2) el2.textContent = tk[type].tk2!==null ? tk[type].tk2.toFixed(2) : '—';
  }

  // --- Step 2: TKобщ1 and TKобщ2 (weighted average of active disciplines) ---
  function calcTKObsh(semester){
    const key = semester===1?'tk1':'tk2';
    let sumW=0, sumV=0;
    for(const type of ['lek','prak','lab','srsp']){
      const c=getCoef(type);
      if(!c||!types[type]) continue;
      const v=tk[type][key];
      if(v===null) continue;
      sumW+=c; sumV+=c*v;
    }
    return sumW>0 ? round2(sumV/sumW) : null;
  }
  const tkObsh1 = calcTKObsh(1);
  const tkObsh2 = calcTKObsh(2);
  const tk1El=document.getElementById('tk1obsh');
  const tk2El=document.getElementById('tk2obsh');
  if(tk1El) tk1El.textContent = tkObsh1!==null ? tkObsh1.toFixed(2) : '—';
  if(tk2El) tk2El.textContent = tkObsh2!==null ? tkObsh2.toFixed(2) : '—';

  // --- Step 3: RK1, RK2 ---
  const rk1 = parseVal(document.getElementById('rk1')?.value);
  const rk2 = parseVal(document.getElementById('rk2')?.value);

  // --- Step 4: P1, P2 ---
  let p1=null, p2=null;
  if(tkObsh1!==null && rk1!==null) p1=round2(0.7*tkObsh1+0.3*rk1);
  else if(tkObsh1!==null) p1=tkObsh1;
  if(tkObsh2!==null && rk2!==null) p2=round2(0.7*tkObsh2+0.3*rk2);
  else if(tkObsh2!==null) p2=tkObsh2;
  const p1El=document.getElementById('p1'); const p2El=document.getElementById('p2');
  if(p1El){ p1El.textContent=p1!==null?p1.toFixed(2):'—'; p1El.style.color=p1!==null&&p1>=50?'#34d399':'#f87171'; }
  if(p2El){ p2El.textContent=p2!==null?p2.toFixed(2):'—'; p2El.style.color=p2!==null&&p2>=50?'#34d399':'#f87171'; }

  // --- Step 5: РД ---
  let rd=null;
  if(p1!==null&&p2!==null) rd=round2((p1+p2)/2);
  else if(p1!==null) rd=p1;
  else if(p2!==null) rd=p2;
  const rdEl=document.getElementById('rd');
  if(rdEl){ rdEl.textContent=rd!==null?Math.round(rd).toString():'—'; rdEl.style.color=rd!==null&&rd>=50?'#34d399':'#f87171'; }

  // --- Step 6: допуск ---
  let dopusk=null, reasons=[];
  if(rk1!==null&&rk2!==null&&rd!==null){
    dopusk=true;
    if(rk1<25){ dopusk=false; reasons.push(`РК1 = ${rk1.toFixed(2)} < 25`); }
    if(rk2<25){ dopusk=false; reasons.push(`РК2 = ${rk2.toFixed(2)} < 25`); }
    const avg2=(rk1+rk2)/2;
    if(avg2<50){ dopusk=false; reasons.push(`(РК1+РК2)/2 = ${avg2.toFixed(2)} < 50`); }
    if(rd<50){ dopusk=false; reasons.push(`РД = ${rd.toFixed(2)} < 50`); }
  }
  // Step 7: Автомат — нет ни одной НЯ/0 среди введённых оценок
let hasNya=false;
outer: for(const type of ['lek','prak','lab','srsp']){
  if(!types[type]) continue;
  for(let w=1;w<=15;w++){
    const el=document.getElementById(`${type}-w${w}`);
    if(!el) continue;
    const raw=el.value.trim().toUpperCase();
    if(raw==='НП'||raw==='') continue;
    if(parseVal(el.value)===0){ hasNya=true; break outer; }
  }
}
if(!hasNya){
  for(const id of ['rk1','rk2']){
    const el=document.getElementById(id);
    if(!el) continue;
    const raw=el.value.trim().toUpperCase();
    if(raw==='НП'||raw==='') continue;
    if(parseVal(el.value)===0){ hasNya=true; break; }
  }
}

const examEl=document.getElementById('exam');
const examWrapper=document.getElementById('examWrapper');
const wasAvtomat=examEl.classList.contains('avtomat');
const examRaw=examEl.value.trim().toUpperCase();
const examManual = examRaw!=='' && examRaw!=='НП' && !wasAvtomat;

// Автомат срабатывает: допущен + нет НЯ + нет ручного ввода + есть РД
const isAvtomat = dopusk!==false && !hasNya && !examManual && rd!==null;

// Применяем автомат к полю экзамена
if(isAvtomat){
  examEl.value=rd.toFixed(2);
  examEl.classList.remove('np','nya');
  examEl.classList.add('avtomat');
  if(examWrapper) examWrapper.classList.add('is-avtomat');
} else if(!examManual){
  // Не автомат и не введён вручную — сбросить если был авт.
  if(wasAvtomat){
    examEl.value='НП';
    examEl.classList.remove('avtomat');
    updateStyle(examEl,true);
  }
  if(examWrapper) examWrapper.classList.remove('is-avtomat');
}

const examForCalc=parseVal(examEl.value);

  // --- Step 7: ИО ---
  // const exam=parseVal(document.getElementById('exam')?.value);
  let io=null;
  if(dopusk===false) io=0;
  else if(rd!==null&&examForCalc!==null) io=round2(0.6*rd+0.4*examForCalc);
  const ioEl=document.getElementById('io');
  if(ioEl){ ioEl.textContent=io!==null?(Math.round(Number(io))).toFixed(2):'—'; ioEl.style.color=io!==null&&io>=50?'#34d399':'#f87171'; }

  // --- Step 8: Letter grade ---
  const finalGrade = io!==null ? getLetter(io) : (dopusk===false?'F':'—');
  const gradeEl=document.getElementById('grade');
  if(gradeEl) gradeEl.textContent=finalGrade;

  // --- Results panel ---
  const grid=document.getElementById('resultGrid');
  const cv=(v,good)=>v!==null?`color:${v>=good?'#34d399':'#f87171'}`:'';
    grid.innerHTML=`
    <div class="result-item"><span class="val">${tkObsh1!==null?tkObsh1.toFixed(2):'—'}</span><span class="lbl">ТКобщ1</span></div>
    <div class="result-item"><span class="val">${rk1!==null?rk1.toFixed(2):'—'}</span><span class="lbl">РК1</span></div>
    <div class="result-item"><span class="val" style="${cv(p1,50)}">${p1!==null?p1.toFixed(2):'—'}</span><span class="lbl">Р1</span></div>
    <div class="result-item"><span class="val">${tkObsh2!==null?tkObsh2.toFixed(2):'—'}</span><span class="lbl">ТКобщ2</span></div>
    <div class="result-item"><span class="val">${rk2!==null?rk2.toFixed(2):'—'}</span><span class="lbl">РК2</span></div>
    <div class="result-item"><span class="val" style="${cv(p2,50)}">${p2!==null?p2.toFixed(2):'—'}</span><span class="lbl">Р2</span></div>
    <div class="result-item"><span class="val" style="${cv(rd,50)}">${rd!==null?Math.round(rd).toString():'—'}</span><span class="lbl">РД</span></div>
    <div class="result-item ${isAvtomat?'highlight-avtomat':''}"><span class="val" style="${isAvtomat?'color:#34d399':''}">${examForCalc!==null?(Math.round(examForCalc)).toFixed(2):'—'}</span><span class="lbl" style="${isAvtomat?'color:#10b981':''}">Экзамен${isAvtomat?' 🏆':''}</span></div>
    <div class="result-item"><span class="val" style="color:#60a5fa">${finalGrade}</span><span class="lbl">Буквенная</span></div>
  `;

  // Удаляем старые блоки статуса, если они есть
  const oldStatusDiv = document.getElementById('statusBadge');
  const oldDeniedBlock = document.getElementById('deniedBlock');
  if (oldStatusDiv) oldStatusDiv.style.display = 'none';
  if (oldDeniedBlock) oldDeniedBlock.style.display = 'none';

  // Находим или создаём контейнер для баннера
  let banner = document.getElementById('resultBanner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'resultBanner';
    banner.className = 'result-banner';
    // Вставляем после resultGrid
    const resultGrid = document.getElementById('resultGrid');
    resultGrid.parentNode.insertBefore(banner, resultGrid.nextSibling);
  }

  // Определяем текст и класс баннера
  let bannerText = '';
  let bannerClass = '';

  // Проверка допуска
  const isDenied = (dopusk === false);
  
  if (isDenied) {
    bannerText = '🚫 НЕ ДОПУЩЕН К ЭКЗАМЕНУ';
    bannerClass = 'denied';
  } else if (dopusk === true && io !== null) {
    // io - итоговая оценка (ИО)
    if (io >= 90) {
      bannerText = 'Повышка 🤑💸💵💰';
      bannerClass = 'success90';
    } else if (io >= 70) {
      bannerText = 'Степак 🫡👏👍✊';
      bannerClass = 'success70';
    } else {
      // Если допущен, но ИО меньше 70 - баннер не показываем (или можно пустой)
      banner.style.display = 'none';
      bannerText = '';
    }
  }

  if (bannerText) {
    banner.textContent = bannerText;
    banner.className = `result-banner ${bannerClass}`;
    banner.style.display = 'block';
  } else if (!isDenied) {
    banner.style.display = 'none';
  }

  const det=document.getElementById('detailBlock');
  det.innerHTML=`
    <span style="color:#60a5fa">ТКобщ1</span> = взвешенная средняя по дисциплинам = <strong>${tkObsh1!==null?tkObsh1.toFixed(2):'—'}</strong><br>
    <span style="color:#60a5fa">Р1</span> = 0.7 × ${tkObsh1!==null?tkObsh1.toFixed(2):'—'} + 0.3 × ${rk1!==null?rk1.toFixed(2):'—'} = <strong>${p1!==null?p1.toFixed(2):'—'}</strong><br>
    <span style="color:#60a5fa">ТКобщ2</span> = взвешенная средняя по дисциплинам = <strong>${tkObsh2!==null?tkObsh2.toFixed(2):'—'}</strong><br>
    <span style="color:#60a5fa">Р2</span> = 0.7 × ${tkObsh2!==null?tkObsh2.toFixed(2):'—'} + 0.3 × ${rk2!==null?rk2.toFixed(2):'—'} = <strong>${p2!==null?p2.toFixed(2):'—'}</strong><br>
    <span style="color:#60a5fa">РД</span> = (${p1!==null?p1.toFixed(2):'—'} + ${p2!==null?p2.toFixed(2):'—'}) / 2 = <strong>${rd!==null?rd.toFixed(2):'—'}</strong><br>
    ${isAvtomat
  ? `<span style="color:#10b981">🏆 АВТОМАТ</span>: экзамен = РД = ${rd!==null?Math.round(rd).toString():'—'} → ИО = 0.6 × ${Math.round(rd).toString()} + 0.4 × ${Math.round(rd).toString()} = <strong>${io!==null?(Math.round(Number(io))).toFixed(2):'—'}</strong>`
  : io!==null&&dopusk!==false
    ? `<span style="color:#60a5fa">ИО</span> = 0.6 × ${rd!==null?Math.round(rd).toString():'—'} + 0.4 × ${examForCalc!==null?(Math.round(Number(examForCalc))).toFixed(2):'—'} = <strong>${(Math.round(Number(io))).toFixed(2)}</strong>`
    : dopusk===false?'<span style="color:#ef4444">⚠ НЕДОПУСК → ИО = 0 → Оценка: F</span>':''
}
  `;

  const fgBlock=document.getElementById('finalGradeBlock');
  if(io!==null || dopusk===false){
    fgBlock.style.display='block';
    const displayGrade = dopusk===false ? 'F' : getLetter(io);
fgBlock.innerHTML=`
  <div class="grade-letter ${isAvtomat?'avtomat-grade':''}">${displayGrade}</div>
  <div style="color:#64748b;font-size:0.75rem;margin-top:4px;">${dopusk===false?'НЕДОПУСК':isAvtomat?'🏆 Автомат — итоговая оценка':'Итоговая оценка'}</div>
`;  } else fgBlock.style.display='none';

// Сохраняем в историю
saveToHistory({
  rk1: rk1,
  rk2: rk2,
  rd: rd,
  exam: examForCalc,
  io: io,
  grade: finalGrade,
  isAvtomat: isAvtomat,
  dopusk: dopusk,
  weeks: {
    lek: Array.from({length:15},(_,i)=>document.getElementById(`lek-w${i+1}`)?.value||'НП'),
    prak: Array.from({length:15},(_,i)=>document.getElementById(`prak-w${i+1}`)?.value||'НП'),
    lab: Array.from({length:15},(_,i)=>document.getElementById(`lab-w${i+1}`)?.value||'НП'),
    srsp: Array.from({length:15},(_,i)=>document.getElementById(`srsp-w${i+1}`)?.value||'НП'),
  },
  rk1val: document.getElementById('rk1')?.value||'НП',
  rk2val: document.getElementById('rk2')?.value||'НП',
  examval: document.getElementById('exam')?.value||'НП',
});
document.getElementById('resultCard').style.display='block';
document.getElementById('resultCard').scrollIntoView({behavior:'smooth'});
}

buildTable();

// Очистка всех ячеек при загрузке страницы (без подтверждения)
(function initClear() {
  // Недельные оценки
  for(const type of ['lek','prak','lab','srsp']){
    for(let w=1;w<=15;w++){
      const el=document.getElementById(`${type}-w${w}`);
      if(el){ el.value='НП'; updateStyle(el); }
    }
  }
  // РК1, РК2, Экзамен
  ['rk1','rk2','exam'].forEach(id=>{
    const el=document.getElementById(id);
    if(el){ el.value='НП'; updateStyle(el,true); }
  });
  // Вычисляемые ячейки
  for(const type of ['lek','prak','lab','srsp']){
    const tk1El = document.getElementById(`tk1-${type}`);
    const tk2El = document.getElementById(`tk2-${type}`);
    if(tk1El) tk1El.textContent = '—';
    if(tk2El) tk2El.textContent = '—';
  }
  const sharedCells = ['tk1obsh', 'tk2obsh', 'p1', 'p2', 'rd', 'io', 'grade'];
  sharedCells.forEach(id => {
    const el = document.getElementById(id);
    if(el) el.textContent = '—';
  });
  document.getElementById('resultCard').style.display = 'none';
  const wr = document.getElementById('examWrapper');
  if(wr) wr.classList.remove('is-avtomat');

  fixFinalCellsBackground();
  // Принудительная установка яркого фона для финальных ячеек (РД, Экзамен, ИО, Букв.)
function fixFinalCellsBackground() {
  const rd = document.getElementById('rd');
  const io = document.getElementById('io');
  const grade = document.getElementById('grade');
  const examWrapper = document.querySelector('#examWrapper');
  const examTd = examWrapper ? examWrapper.parentElement : null;
  
  if (rd) rd.style.setProperty('background', '#0a1628', 'important');
  if (io) io.style.setProperty('background', '#0a1628', 'important');
  if (grade) grade.style.setProperty('background', '#0a1628', 'important');
  if (examTd) examTd.style.setProperty('background', '#0a1628', 'important');
  if (examWrapper) examWrapper.style.setProperty('background', '#0a1628', 'important');
}

// Вызываем после построения таблицы
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', fixFinalCellsBackground);
} else {
  fixFinalCellsBackground();
}
})();