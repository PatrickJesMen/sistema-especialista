'use strict';

/* ════════════════════════════════════════════════
   MOTOR DE INFERÊNCIA — lógica idêntica ao original
   ════════════════════════════════════════════════ */

const PESOS = {
  rendimento_alto:        1.50,
  rendimento_isento_alto: 1.20,
  patrimonio_alto:        1.20,
  operou_bolsa:           1.50,
  rendimento_baixo:      -0.50,
  nao_operou_bolsa:      -0.50,
  patrimonio_baixo:      -0.40,
};

function motorInferencia(e) {
  const ra  = !!e.rendimento_alto;
  const ri  = !!e.rendimento_isento_alto;
  const pa  = !!e.patrimonio_alto;
  const ob  = !!e.operou_bolsa;
  const rb  = !!e.rendimento_baixo;
  const nob = !!e.nao_operou_bolsa;
  const pb  = !!e.patrimonio_baixo;
  const ii  = !!e.informacao_incompleta;

  let score = 0.0;
  const regras = [];

  if (ra)  { score += PESOS.rendimento_alto;        regras.push({ nome: 'Rendimento tributável alto',    peso: +PESOS.rendimento_alto,        tipo:'pos' }); }
  if (ri)  { score += PESOS.rendimento_isento_alto; regras.push({ nome: 'Rendimento isento relevante',   peso: +PESOS.rendimento_isento_alto, tipo:'pos' }); }
  if (pa)  { score += PESOS.patrimonio_alto;        regras.push({ nome: 'Patrimônio elevado',            peso: +PESOS.patrimonio_alto,        tipo:'pos' }); }
  if (ob)  { score += PESOS.operou_bolsa;           regras.push({ nome: 'Operações na Bolsa de Valores', peso: +PESOS.operou_bolsa,           tipo:'pos' }); }
  if (rb)  { score += PESOS.rendimento_baixo;       regras.push({ nome: 'Rendimento tributável baixo',   peso:  PESOS.rendimento_baixo,       tipo:'neg' }); }
  if (nob) { score += PESOS.nao_operou_bolsa;       regras.push({ nome: 'Sem operações na Bolsa',        peso:  PESOS.nao_operou_bolsa,       tipo:'neg' }); }
  if (pb)  { score += PESOS.patrimonio_baixo;       regras.push({ nome: 'Patrimônio abaixo do limite',   peso:  PESOS.patrimonio_baixo,       tipo:'neg' }); }
  if (ii)  { regras.push({ nome: 'Informação incompleta — resultado inconclusivo', peso: null, tipo:'warn' }); }

  score = Math.round(score * 100) / 100;

  const resultado = ii          ? 'ANALISE_MANUAL'
                  : score > 0.0 ? 'OBRIGADO'
                  : score === 0 ? 'ANALISE_MANUAL'
                  :               'ISENTO';

  return { score, resultado, regras };
}

/* ════════════════════════════════════════════════
   ESTADO
   ════════════════════════════════════════════════ */

// Mapeamento: chave de predicate → campo do estado
const estado = {
  pessoa_fisica:          true,
  rendimento_alto:        false,
  rendimento_isento_alto: false,
  patrimonio_alto:        false,
  operou_bolsa:           false,
  rendimento_baixo:       false,
  nao_operou_bolsa:       false,
  patrimonio_baixo:       false,
  informacao_incompleta:  false,
};

// Controla quais grupos de perguntas foram respondidos
const respostas = {
  rendimento:       null, // 'rendimento_alto' | 'rendimento_baixo' | 'ns'
  patrimonio:       null,
  bolsa:            null,
  rendimento_isento: null,
};

/* ════════════════════════════════════════════════
   INTERAÇÃO COM FORMULÁRIO
   ════════════════════════════════════════════════ */

function responder(btn, chave, valor) {
  const item = btn.closest('.question-item');
  const grupo = item.dataset.group;

  // Deseleciona botões do mesmo grupo
  item.querySelectorAll('.answer-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');

  // Marca item como respondido
  item.classList.add('answered');
  respostas[grupo] = chave;

  // Atualiza estado: limpa tudo do grupo, depois aplica
  resetarGrupo(grupo);

  if (chave === 'rendimento_alto') {
    estado.rendimento_alto = true;
    estado.rendimento_baixo = false;
  } else if (chave === 'rendimento_baixo') {
    estado.rendimento_alto = false;
    estado.rendimento_baixo = true;
  } else if (chave === 'patrimonio_alto') {
    estado.patrimonio_alto = true;
    estado.patrimonio_baixo = false;
  } else if (chave === 'patrimonio_baixo') {
    estado.patrimonio_alto = false;
    estado.patrimonio_baixo = true;
  } else if (chave === 'operou_bolsa') {
    estado.operou_bolsa = true;
    estado.nao_operou_bolsa = false;
  } else if (chave === 'nao_operou_bolsa') {
    estado.operou_bolsa = false;
    estado.nao_operou_bolsa = true;
  } else if (chave === 'rendimento_isento_alto') {
    estado.rendimento_isento_alto = true;
  }
  // "ns" → não altera estado (conta como incompleto só se todos forem ns)

  atualizarProgresso();
  verificarBotao();
}

function resetarGrupo(grupo) {
  if (grupo === 'rendimento') {
    estado.rendimento_alto = false;
    estado.rendimento_baixo = false;
  } else if (grupo === 'patrimonio') {
    estado.patrimonio_alto = false;
    estado.patrimonio_baixo = false;
  } else if (grupo === 'bolsa') {
    estado.operou_bolsa = false;
    estado.nao_operou_bolsa = false;
  } else if (grupo === 'rendimento_isento') {
    estado.rendimento_isento_alto = false;
  }
}

function atualizarProgresso() {
  const respondidos = Object.values(respostas).filter(v => v !== null).length;
  const total = Object.keys(respostas).length;
  const pct = (respondidos / total) * 100;

  document.getElementById('progress-count').textContent = `${respondidos} de ${total} respondidas`;
  document.getElementById('progress-fill').style.width = pct + '%';
}

function verificarBotao() {
  const algumRespondido = Object.values(respostas).some(v => v !== null);
  document.getElementById('btn-verificar').disabled = !algumRespondido;
}

/* ════════════════════════════════════════════════
   EXECUÇÃO
   ════════════════════════════════════════════════ */

function executarInferencia() {
  // Verifica se há muitas respostas "ns" para marcar como incompleto
  const nsCount = Object.values(respostas).filter(v => v && v.endsWith('_ns') || v && v.endsWith('_info_incompleta')).length;
  estado.informacao_incompleta = nsCount >= 3;

  const resultado = motorInferencia(estado);
  salvarLocal(resultado);
  renderizarResultado(resultado);
  renderizarHistorico();
  sincronizarFlask(resultado);

  // Scroll suave até o resultado
  setTimeout(() => {
    document.getElementById('result-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

/* ════════════════════════════════════════════════
   RENDER RESULTADO
   ════════════════════════════════════════════════ */

const CFG_RESULTADO = {
  OBRIGADO: {
    emoji: '⚠️',
    titulo: 'Você precisa declarar o Imposto de Renda',
    subtitulo: 'Sua situação indica obrigação de entregar a declaração.',
    orientacao: 'Procure um contador ou acesse o site da <a href="https://www.gov.br/receitafederal/pt-br" target="_blank" rel="noopener">Receita Federal</a> para enviar sua declaração dentro do prazo.',
    cls: 'obrigado',
  },
  ISENTO: {
    emoji: '✅',
    titulo: 'Você provavelmente está isento',
    subtitulo: 'Pelas respostas fornecidas, não há obrigação de declarar.',
    orientacao: 'Mesmo sendo isento, você pode declarar voluntariamente. Isso é recomendado se tiver imposto retido na fonte a restituir.',
    cls: 'isento',
  },
  ANALISE_MANUAL: {
    emoji: '🔍',
    titulo: 'Recomendamos uma análise mais cuidadosa',
    subtitulo: 'Não foi possível determinar com certeza pela situação apresentada.',
    orientacao: 'Consulte um contador ou acesse o <a href="https://www.gov.br/receitafederal/pt-br" target="_blank" rel="noopener">site da Receita Federal</a> para confirmar sua situação.',
    cls: 'manual',
  },
};

function renderizarResultado({ score, resultado, regras }) {
  const cfg = CFG_RESULTADO[resultado];
  const resultSection = document.getElementById('result-section');
  const resultBox = document.getElementById('result-box');
  const resultRules = document.getElementById('result-rules');

  resultBox.innerHTML = `
    <div class="result-inner ${cfg.cls}">
      <div class="result-emoji">${cfg.emoji}</div>
      <div class="result-text">
        <h2 class="result-titulo">${cfg.titulo}</h2>
        <p class="result-subtitulo">${cfg.subtitulo}</p>
        <p class="result-orientacao">${cfg.orientacao}</p>
      </div>
    </div>
    <div class="score-meter">
      <div class="score-meter-label">
        <span>Pontuação calculada</span>
        <span class="score-valor ${cfg.cls}">${score.toFixed(2)} pontos</span>
      </div>
      <div class="score-track">
        <div class="score-fill ${cfg.cls}" style="width:${Math.max(4, Math.min(100, ((score + 2) / 6) * 100)).toFixed(1)}%"></div>
        <div class="score-zero" style="left:${(2/6*100).toFixed(1)}%"></div>
      </div>
      <div class="score-track-labels">
        <span>← Isento</span>
        <span>Obrigado →</span>
      </div>
    </div>
  `;

  if (regras.length > 0) {
    resultRules.innerHTML = `
      <p class="regras-titulo">Critérios considerados:</p>
      <ul class="regras-lista">
        ${regras.map(r => `
          <li class="regra-item ${r.tipo}">
            <span class="regra-nome">${r.nome}</span>
            ${r.peso !== null ? `<span class="regra-peso">${r.peso > 0 ? '+' : ''}${r.peso}</span>` : ''}
          </li>
        `).join('')}
      </ul>
    `;
  } else {
    resultRules.innerHTML = '<p class="sem-regras">Nenhum critério específico foi ativado.</p>';
  }

  resultSection.style.display = 'block';
}

/* ════════════════════════════════════════════════
   RESETAR
   ════════════════════════════════════════════════ */

function resetar() {
  Object.keys(estado).forEach(k => estado[k] = k === 'pessoa_fisica');
  Object.keys(respostas).forEach(k => respostas[k] = null);

  document.querySelectorAll('.answer-btn').forEach(b => b.classList.remove('selected'));
  document.querySelectorAll('.question-item').forEach(item => item.classList.remove('answered'));

  document.getElementById('result-section').style.display = 'none';
  document.getElementById('progress-fill').style.width = '0%';
  document.getElementById('progress-count').textContent = '0 de 4 respondidas';
  document.getElementById('btn-verificar').disabled = true;

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ════════════════════════════════════════════════
   TEMA CLARO / ESCURO
   ════════════════════════════════════════════════ */

function alternarTema() {
  const html = document.documentElement;
  const atual = html.getAttribute('data-theme');
  const novo = atual === 'light' ? 'dark' : 'light';
  html.setAttribute('data-theme', novo);
  localStorage.setItem('dirpf_tema', novo);
}

// Restaura tema salvo
(function() {
  const salvo = localStorage.getItem('dirpf_tema');
  // Detecta preferência do sistema se não houver salvo
  const prefereDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const tema = salvo || (prefereDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', tema);
})();

/* ════════════════════════════════════════════════
   MODAL AJUDA
   ════════════════════════════════════════════════ */

function abrirAjuda() {
  document.getElementById('modal-ajuda').style.display = 'flex';
}

function fecharAjuda(event) {
  if (event === null || event.target === document.getElementById('modal-ajuda')) {
    document.getElementById('modal-ajuda').style.display = 'none';
  }
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') fecharAjuda(null);
});

/* ════════════════════════════════════════════════
   HISTÓRICO LOCAL
   ════════════════════════════════════════════════ */

const STORAGE_KEY = 'dirpf_historico';

function salvarLocal(resultado) {
  const hist = lerHistorico();
  hist.unshift({
    id: Date.now(),
    criado_em: new Date().toLocaleString('pt-BR'),
    ...JSON.parse(JSON.stringify(estado)),
    respostas: JSON.parse(JSON.stringify(respostas)),
    score: resultado.score,
    resultado: resultado.resultado,
    regras: resultado.regras,
    sync: false,
  });
  if (hist.length > 50) hist.pop();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(hist));
}

function lerHistorico() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}

function limparHistorico() {
  if (!confirm('Deseja apagar todo o histórico de consultas?')) return;
  localStorage.removeItem(STORAGE_KEY);
  renderizarHistorico();
}

function renderizarHistorico() {
  const hist = lerHistorico();
  const section = document.getElementById('history-section');
  const body = document.getElementById('history-body');

  if (!hist.length) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';

  const CFG_LABEL = {
    OBRIGADO:       { cls: 'obrigado', label: '⚠️ Obrigado a Declarar' },
    ISENTO:         { cls: 'isento',   label: '✅ Isento' },
    ANALISE_MANUAL: { cls: 'manual',   label: '🔍 Análise Manual' },
  };

  body.innerHTML = hist.map(r => {
    const c = CFG_LABEL[r.resultado] || CFG_LABEL.ANALISE_MANUAL;
    return `
      <div class="history-item">
        <div class="history-date">${r.criado_em}</div>
        <div class="history-badge ${c.cls}">${c.label}</div>
        <div class="history-score">Score: ${parseFloat(r.score).toFixed(2)}</div>
        <div class="history-sync">${r.sync ? '🟢 Salvo' : '⚪ Local'}</div>
      </div>
    `;
  }).join('');
}

/* ════════════════════════════════════════════════
   SYNC FLASK (background, não bloqueia)
   ════════════════════════════════════════════════ */

const API = 'http://localhost:5000';

async function sincronizarFlask(resultado) {
  try {
    const resp = await fetch(`${API}/inferir`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(estado),
      signal: AbortSignal.timeout(3000),
    });
    if (resp.ok) {
      mostrarToast('✓ Sincronizado com o servidor', 'ok');
    }
  } catch { /* silencioso */ }
}

function mostrarToast(msg, tipo) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast show ${tipo}`;
  setTimeout(() => { t.className = 'toast'; }, 2500);
}

/* ════════════════════════════════════════════════
   INIT
   ════════════════════════════════════════════════ */

renderizarHistorico();

fetch(`${API}/`, { signal: AbortSignal.timeout(1500) })
  .then(r => { if (r.ok) mostrarToast('✓ Conectado ao servidor', 'ok'); })
  .catch(() => {});