import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
// que deus me ajude a entender essa poraa
const CONFIG = {
  nome: 'Casa Brava Barbearia',
  whatsapp: '5511999999999',
  moeda: 'BRL',
  cores: { cabelo: 0x24201c, pele: 0xb98260, luz: 0xc99a5b },
  barbeiros: [
    { id: 'joao', nome: 'João Ribeiro' },
    { id: 'marcos', nome: 'Marcos Lima' },
    { id: 'davi', nome: 'Davi Santos' }
  ],
  cortes: [
    { id: 'degrade', nome: 'Degradê', descricao: 'Laterais em transição suave e acabamento preciso.', duracao: 45, preco: 45, estilos: ['liso', 'ondulado', 'cacheado', 'crespo'] },
    { id: 'social', nome: 'Social', descricao: 'Clássico versátil, alinhado e fácil de manter.', duracao: 35, preco: 35, estilos: ['liso', 'ondulado', 'cacheado'] },
    { id: 'undercut', nome: 'Undercut', descricao: 'Contraste marcante entre laterais e topo.', duracao: 50, preco: 50, estilos: ['liso', 'ondulado', 'cacheado'] },
    { id: 'mullet', nome: 'Mullet', descricao: 'Volume no topo e comprimento característico atrás.', duracao: 55, preco: 55, estilos: ['liso', 'ondulado', 'cacheado', 'crespo'] },
    { id: 'tradicional', nome: 'Tradicional', descricao: 'Corte atemporal com acabamento natural.', duracao: 30, preco: 30, estilos: ['liso', 'ondulado', 'cacheado', 'crespo'] }
  ],
  horarios: ['09:00', '09:45', '10:30', '11:15', '13:00', '13:45', '14:30', '15:15', '16:00', '16:45', '17:30']
};

const state = { step: 1, hair: 'liso', cut: 'degrade', barber: 'joao', date: dateOffset(1), time: '', demo: false };
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const money = n => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: CONFIG.moeda, maximumFractionDigits: 0 }).format(n);
const hairNames = { liso: 'Liso', ondulado: 'Ondulado', cacheado: 'Cacheado', crespo: 'Crespo' };
const cutById = id => CONFIG.cortes.find(c => c.id === id) || CONFIG.cortes[0];
const barberById = id => CONFIG.barbeiros.find(b => b.id === id) || CONFIG.barbeiros[0];
function dateOffset(days) { const d = new Date(); d.setDate(d.getDate() + days); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function prettyDate(value) { if (!value) return 'Não selecionada'; return new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: 'long' }).format(new Date(`${value}T12:00:00`)); }

let mainScene, mainCamera, mainRenderer, mainModel, requestScene, requestCamera, requestRenderer, requestModel;
let rafMain = 0, rafRequest = 0, dragTarget = null, dragStartX = 0, dragStartRotation = 0;
let toastTimer;

function showToast(message) {
  const toast = $('#toast'); toast.textContent = message; toast.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}
function setupScene(canvas, container, requestMode = false) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(33, 1, 0.1, 100);
  camera.position.set(0, 0.05, 5.5);
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power', preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  scene.add(new THREE.HemisphereLight(0xf6e5cf, 0x35271d, 2.2));
  const key = new THREE.DirectionalLight(0xffd4a0, 2.7); key.position.set(-3, 4, 5); scene.add(key);
  const fill = new THREE.DirectionalLight(0x8e9baf, 1.1); fill.position.set(3, 1, -3); scene.add(fill);
  const group = new THREE.Group(); scene.add(group);
  const resize = () => {
    const w = Math.max(1, container.clientWidth), h = Math.max(1, container.clientHeight);
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize); observer.observe(container); resize();
  const render = () => {
    const isVisible = !document.hidden && container.getBoundingClientRect().bottom > 0 && container.getBoundingClientRect().top < innerHeight;
    if (isVisible) renderer.render(scene, camera);
    if (requestMode) rafRequest = requestAnimationFrame(render); else rafMain = requestAnimationFrame(render);
  };
  render();
  return { scene, camera, renderer, group, observer, render };
}

function makeMaterial(color, roughness = .82) { return new THREE.MeshStandardMaterial({ color, roughness, flatShading: true }); }
function addMesh(group, geometry, material, pos, scale) {
  const mesh = new THREE.Mesh(geometry, material); mesh.position.set(...pos); if (scale) mesh.scale.set(...scale); group.add(mesh); return mesh;
}
function clearGroup(group) { while (group.children.length) { const o = group.children.pop(); if (o.geometry) o.geometry.dispose(); if (o.material) { if (Array.isArray(o.material)) o.material.forEach(m => m.dispose()); else o.material.dispose(); } } }

function buildHead(group, hair, cut) {
  clearGroup(group);
  const skin = makeMaterial(CONFIG.cores.pele), hairMat = makeMaterial(CONFIG.cores.cabelo), dark = makeMaterial(0x171614), earMat = makeMaterial(0x98664f);
  // Cabeça e pescoço low-poly, inteiramente procedural.
  addMesh(group, new THREE.CapsuleGeometry(.48, .62, 4, 8), skin, [0, -.04, 0], [1, 1.06, .83]);
  addMesh(group, new THREE.CylinderGeometry(.19, .24, .42, 8), skin, [0, -.68, 0], [1, 1, 1]);
  for (const side of [-1, 1]) addMesh(group, new THREE.SphereGeometry(.12, 7, 5), earMat, [side * .46, -.05, 0], [.55, 1, .55]);
  // Face simplificada para manter a leitura do modelo mesmo em telas pequenas.
  const eyeMat = makeMaterial(0x29221d);
  for (const side of [-1, 1]) {
    addMesh(group, new THREE.SphereGeometry(.035, 6, 4), eyeMat, [side * .17, .03, .395], [1, 1, .5]);
  }
  addMesh(group, new THREE.SphereGeometry(.045, 6, 4), earMat, [0, -.09, .405], [.7, 1, .5]);
  // Laterais raspadas nos cortes que pedem contraste.
  const contrast = ['degrade', 'undercut'].includes(cut);
  if (contrast) {
    const sideMat = makeMaterial(0x4b4035);
    for (const side of [-1, 1]) addMesh(group, new THREE.SphereGeometry(.34, 8, 6, 0, Math.PI * 2, 0, Math.PI), sideMat, [side * .24, .13, .01], [.82, .75, .83]);
  }
  const topY = (hair === 'crespo' ? .47 : hair === 'cacheado' ? .43 : hair === 'ondulado' ? .39 : .34) + .2; // [ALTERAÇÃO] o cabelo estava dentro do crânio (topo da cabeça em y≈.80); sobe .2 para ficar por cima
  const topScale = cut === 'social' || cut === 'tradicional' ? .86 : cut === 'mullet' ? 1.12 : 1;
  if (hair === 'liso') {
    addMesh(group, new THREE.SphereGeometry(.47, 9, 6), hairMat, [0, topY, 0], [.99, .52 * topScale, .92]);
    addMesh(group, new THREE.BoxGeometry(.42, .09, .45), hairMat, [-.08, topY + .27, 0], [1, 1, 1]).rotation.z = -.12;
  } else if (hair === 'ondulado') {
    addMesh(group, new THREE.SphereGeometry(.47, 9, 6), hairMat, [0, topY, 0], [1, .53 * topScale, .93]);
    for (let i = 0; i < 7; i++) {
      const x = (i - 3) * .105;
      addMesh(group, new THREE.SphereGeometry(.12, 6, 5), hairMat, [x, topY + .28 + Math.sin(i * 1.5) * .035, .16], [1, .8, 1]);
    }
  } else {
    const count = hair === 'crespo' ? 46 : 28;
    const radius = hair === 'crespo' ? .48 : .43;
    // Pequenas esferas faceteadas formam o volume dos cachos/crespo.
    for (let i = 0; i < count; i++) {
      const angle = i * 2.39996, r = radius * Math.sqrt((i + .5) / count);
      const x = Math.cos(angle) * r, z = Math.sin(angle) * r * .82;
      const y = topY + .16 + (hair === 'crespo' ? .12 : .04) * (1 - (r / radius));
      const size = (hair === 'crespo' ? .105 : .12) * (cut === 'social' ? .82 : 1);
      addMesh(group, new THREE.IcosahedronGeometry(size, 0), hairMat, [x, y, z], [1, .9, 1]);
    }
    if (hair === 'cacheado') {
      for (let i = 0; i < 8; i++) addMesh(group, new THREE.SphereGeometry(.105, 6, 5), hairMat, [(i - 3.5) * .105, .45, .08], [1, 1, 1]);
    }
  }
  if (cut === 'mullet') {
    addMesh(group, new THREE.SphereGeometry(.28, 8, 5), hairMat, [0, .04, -.34], [.9, 1.3, .7]);
  }
  // Barba curta discreta, para dar profundidade ao modelo ilustrativo.
  const beardMat = makeMaterial(0x302720);
  addMesh(group, new THREE.SphereGeometry(.28, 8, 5, 0, Math.PI * 2, Math.PI * .15, Math.PI * .48), beardMat, [0, -.38, .17], [1, .72, .82]);
  group.rotation.y = -.18;
  group.position.y = -.02;
}

function initMain3D() {
  if (mainRenderer) return;
  const result = setupScene($('#hairCanvas'), $('#sceneWrap'));
  mainScene = result.scene; mainCamera = result.camera; mainRenderer = result.renderer; mainModel = result.group;
  buildHead(mainModel, state.hair, state.cut);
  const canvas = $('#hairCanvas');
  canvas.addEventListener('pointerdown', e => { dragTarget = canvas; dragStartX = e.clientX; dragStartRotation = mainModel.rotation.y; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => { if (dragTarget === canvas) mainModel.rotation.y = dragStartRotation + (e.clientX - dragStartX) * .012; });
  const endDrag = () => { dragTarget = null; }; canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);
}
function update3D() {
  if (mainModel) buildHead(mainModel, state.hair, state.cut);
  $('#sceneLabel').textContent = `${hairNames[state.hair].toUpperCase()} / ${cutById(state.cut).nome.toUpperCase()}`;
  $('#previewTitle').textContent = state.step === 1 ? 'Escolha sua textura' : state.step === 2 ? cutById(state.cut).nome : 'Seu visual escolhido';
}
function setStep(step) {
  state.step = Math.max(1, Math.min(4, step));
  $$('.step').forEach(el => { const n = Number(el.dataset.step); el.classList.toggle('active', n === state.step); el.classList.toggle('done', n < state.step); });
  $('#progressFill').style.width = `${state.step * 25}%`;
  renderStep();
  update3D();
}
function renderStep() {
  const root = $('#stepContent');
  if (!root) return;
  root.classList.remove('step-content'); void root.offsetWidth; root.classList.add('step-content');
  if (state.step === 1) {
    root.innerHTML = `<p class="eyebrow">ETAPA 01 <span class="gold-slash">/</span> TEXTURA</p><h2>Como é seu<br><em>cabelo?</em></h2><p class="muted">A textura ajuda a visualizar melhor o volume e escolher um corte que combine com você.</p><div class="texture-grid" id="textureOptions">${Object.entries(hairNames).map(([id, name]) => `<button class="texture-card ${state.hair === id ? 'selected' : ''}" data-hair="${id}" type="button"><span class="texture-icon">${({ liso: '〰', ondulado: '∿', cacheado: '◎', crespo: '✳' })[id]}</span><b>${name}</b><small>${({ liso: 'Fios alinhados', ondulado: 'Movimento natural', cacheado: 'Cachos definidos', crespo: 'Volume e textura' })[id]}</small></button>`).join('')}</div><div class="panel-bottom"><span class="micro-note">SEU ESTILO, SEM PRESSA.</span><button class="primary-btn" id="nextBtn" type="button">Escolher corte <span>↗</span></button></div>`;
    $$('#textureOptions button').forEach(btn => btn.addEventListener('click', () => { state.hair = btn.dataset.hair; $$('#textureOptions button').forEach(b => b.classList.toggle('selected', b === btn)); update3D(); }));
    $('#nextBtn').addEventListener('click', () => setStep(2));
  } else if (state.step === 2) {
    const cuts = CONFIG.cortes.filter(c => c.estilos.includes(state.hair));
    if (!cuts.some(c => c.id === state.cut)) state.cut = cuts[0].id;
    root.innerHTML = `<p class="eyebrow">ETAPA 02 <span class="gold-slash">/</span> CORTE</p><h2>Escolha seu<br><em>acabamento.</em></h2><p class="muted">Opções para cabelo ${hairNames[state.hair].toLowerCase()}, com preço e duração antes de reservar.</p><div class="choice-list">${cuts.map(c => `<button type="button" class="cut-option ${c.id === state.cut ? 'selected' : ''}" data-cut="${c.id}"><span><b>${c.nome}</b><span class="cut-meta"> · ${c.duracao} min</span></span><span class="cut-price">${money(c.preco)}</span><small>${c.descricao}</small></button>`).join('')}</div><div class="panel-bottom"><button class="secondary-btn" id="backBtn" type="button">← Voltar</button><button class="primary-btn" id="nextBtn" type="button">Reservar horário <span>↗</span></button></div>`;
    $$('.cut-option').forEach(btn => btn.addEventListener('click', () => { state.cut = btn.dataset.cut; $$('.cut-option').forEach(b => b.classList.toggle('selected', b === btn)); update3D(); }));
    $('#backBtn').addEventListener('click', () => setStep(1)); $('#nextBtn').addEventListener('click', () => setStep(3));
  } else if (state.step === 3) {
    root.innerHTML = `<p class="eyebrow">ETAPA 03 <span class="gold-slash">/</span> AGENDAMENTO</p><h2>Reserve sua<br><em>cadeira.</em></h2><p class="muted">Escolha quem vai cuidar do seu corte e encontre um horário disponível.</p><div class="booking-fields"><div class="field"><label for="barberSelect">BARBEIRO</label><select id="barberSelect">${CONFIG.barbeiros.map(b => `<option value="${b.id}" ${b.id === state.barber ? 'selected' : ''}>${b.nome}</option>`).join('')}</select></div><div class="field"><label for="dateSelect">DATA</label><input id="dateSelect" type="date" min="${dateOffset(0)}" value="${state.date}"></div><div class="field"><label>HORÁRIOS DISPONÍVEIS</label><div class="slot-grid" id="slotGrid"></div></div></div><div class="panel-bottom"><button class="secondary-btn" id="backBtn" type="button">← Voltar</button><button class="primary-btn" id="nextBtn" type="button">Revisar pedido <span>↗</span></button></div>`;
    $('#barberSelect').addEventListener('change', e => { state.barber = e.target.value; renderSlots(); });
    $('#dateSelect').addEventListener('change', e => { state.date = e.target.value; state.time = ''; renderSlots(); });
    renderSlots(); $('#backBtn').addEventListener('click', () => setStep(2));
    $('#nextBtn').addEventListener('click', () => { if (!state.date || !state.time) { showToast('Escolha uma data e um horário disponível.'); return; } setStep(4); });
  } else {
    const c = cutById(state.cut);
    root.innerHTML = `<p class="eyebrow">ETAPA 04 <span class="gold-slash">/</span> CONFIRMAÇÃO</p><h2>Quase na<br><em>cadeira.</em></h2><p class="muted">Confira os detalhes. Ao continuar, você abre o WhatsApp com a mensagem pronta para enviar.</p><div class="summary-preview"><img id="summarySnapshot" alt="Imagem estática da prévia 3D do corte escolhido"><span>PRÉVIA ESTÁTICA DO SEU VISUAL</span></div><div class="summary-card"><div class="summary-line"><span>Textura</span><b>${hairNames[state.hair]}</b></div><div class="summary-line"><span>Corte</span><b>${c.nome}</b></div><div class="summary-line"><span>Barbeiro</span><b>${barberById(state.barber).nome}</b></div><div class="summary-line"><span>Data</span><b>${prettyDate(state.date)}</b></div><div class="summary-line"><span>Horário</span><b>${state.time}</b></div><div class="summary-line"><span>Duração estimada</span><b>${c.duracao} minutos</b></div><div class="summary-total">${money(c.preco)}</div></div><div class="summary-actions"><button class="secondary-btn" id="backBtn" type="button">← Editar</button><button class="primary-btn" id="sendBtn" type="button">Enviar pelo WhatsApp <span>↗</span></button></div>`;
    // Captura uma imagem estática do canvas para manter a referência visual no resumo.
    try { if (mainRenderer && mainScene && mainCamera) { mainRenderer.render(mainScene, mainCamera); $('#summarySnapshot').src = mainRenderer.domElement.toDataURL('image/png'); } } catch (error) { $('#summarySnapshot').alt = 'Prévia 3D indisponível neste navegador.'; }
    $('#backBtn').addEventListener('click', () => setStep(3)); $('#sendBtn').addEventListener('click', sendWhatsApp);
  }
}
function renderSlots() {
  const grid = $('#slotGrid'); if (!grid) return;
  // Demonstração de ocupação determinística. TODO: integrar API para disponibilidade real.
  const seed = state.date.split('-').join('').split('').reduce((a, n) => a + Number(n), 0) + state.barber.length;
  const occupied = new Set(CONFIG.horarios.filter((_, i) => (i + seed) % 5 === 0 || (i + seed) % 7 === 0));
  grid.innerHTML = CONFIG.horarios.map((time, i) => `<button type="button" class="slot ${state.time === time ? 'selected' : ''}" data-time="${time}" ${occupied.has(time) ? 'disabled' : ''} aria-label="${time}${occupied.has(time) ? ', ocupado' : ' disponível'}">${time}</button>`).join('');
  $$('.slot', grid).forEach(btn => btn.addEventListener('click', () => { state.time = btn.dataset.time; renderSlots(); }));
}
function requestUrl() {
  const url = new URL(location.href);
  url.search = '';
  url.searchParams.set('cabelo', state.hair); url.searchParams.set('corte', state.cut);
  url.searchParams.set('barbeiro', state.barber); url.searchParams.set('data', state.date); url.searchParams.set('hora', state.time);
  return url.toString();
}
function sendWhatsApp() {
  const c = cutById(state.cut), url = requestUrl();
  const message = `Olá! Gostaria de solicitar um agendamento na ${CONFIG.nome}.\n\nCabelo: ${hairNames[state.hair]}\nCorte: ${c.nome}\nBarbeiro: ${barberById(state.barber).nome}\nData: ${prettyDate(state.date)}\nHorário: ${state.time}\nDuração estimada: ${c.duracao} min\nValor: ${money(c.preco)}\n\nVeja meu pedido e a prévia 3D: ${url}\n\nAguardo confirmação!`;
  // wa.me abre o WhatsApp com texto; não anexa imagens automaticamente.
  window.open(`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
  try { localStorage.setItem('casaBravaUltimoPedido', JSON.stringify({ ...state, url, criadoEm: new Date().toISOString() })); } catch { }
}
function showRequestPage() {
  $('#bookingView').classList.add('hidden'); $('#requestView').classList.remove('hidden');
  const params = new URLSearchParams(location.search);
  const hair = params.get('cabelo') || 'liso', cut = params.get('corte') || 'degrade', barber = params.get('barbeiro') || 'joao', date = params.get('data') || dateOffset(1), time = params.get('hora') || '10:30';
  const c = cutById(cut);
  $('#requestCut').textContent = c.nome; $('#requestDescription').textContent = c.descricao;
  const entries = [['Textura', hairNames[hair] || hair], ['Barbeiro', barberById(barber).nome], ['Data', prettyDate(date)], ['Horário', time], ['Duração', `${c.duracao} minutos`], ['Valor', money(c.preco)]];
  $('#requestDetails').innerHTML = entries.map(([k, v]) => `<div class="summary-line"><span>${k}</span><b>${v}</b></div>`).join('');
  const result = setupScene($('#requestCanvas'), $('#requestScene'), true);
  requestScene = result.scene; requestCamera = result.camera; requestRenderer = result.renderer; requestModel = result.group;
  buildHead(requestModel, hair in hairNames ? hair : 'liso', c.id);
  $('#copyRequest').addEventListener('click', async () => { const text = `Pedido Casa Brava\nCorte: ${c.nome}\nCabelo: ${hairNames[hair] || hair}\nBarbeiro: ${barberById(barber).nome}\nData: ${prettyDate(date)}\nHorário: ${time}\nValor: ${money(c.preco)}`; try { await navigator.clipboard.writeText(text); showToast('Resumo copiado.'); } catch { showToast(text); } });
}
function startDemo() {
  state.demo = true; state.hair = 'cacheado'; state.cut = 'degrade'; state.barber = 'joao'; state.date = dateOffset(2); state.time = '10:30';
  $('#demoToggle').textContent = 'Demo ativa'; $('#demoToggle').setAttribute('aria-pressed', 'true');
  setStep(1);
  const sequence = [() => { state.hair = 'cacheado'; update3D(); setStep(1); }, () => setStep(2), () => { state.cut = 'mullet'; update3D(); renderStep(); }, () => { setStep(3); state.time = '10:30'; renderSlots(); }, () => { setStep(4); }];
  let i = 0;
  const advance = () => { if (i >= sequence.length) return; sequence[i++](); if (i < sequence.length) setTimeout(advance, 1600); };
  setTimeout(advance, 1100);
}
function init() {
  const params = new URLSearchParams(location.search);
  if (params.has('cabelo') || params.has('corte') || params.has('barbeiro') || params.has('hora')) { showRequestPage(); return; }
  initMain3D();
  // [ALTERAÇÃO] movido para depois do desvio: na página de pedido criava um 2º contexto WebGL num canvas escondido (0×0)
  setStep(1);
  $('#demoToggle').addEventListener('click', startDemo);
  if (params.get('demo') === '1') startDemo();
  $$('.step').forEach(btn => btn.addEventListener('click', () => { const n = Number(btn.dataset.step); if (n <= state.step) setStep(n); }));
  document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(rafMain); cancelAnimationFrame(rafRequest); } else { if (mainRenderer) { const r = setupSceneLoop(); } } });
}
// Reativa o loop principal após voltar à aba sem reconstruir o modelo.
function setupSceneLoop() {
  if (!mainScene || !mainCamera || !mainRenderer) return;
  const draw = () => { if (!document.hidden) mainRenderer.render(mainScene, mainCamera); rafMain = requestAnimationFrame(draw); }; draw();
}
init();