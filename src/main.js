
import { createClient } from "@supabase/supabase-js";
import "../style.css";

const configScript = document.createElement("script");
configScript.src = "/config.js";
configScript.onload = start;
configScript.onerror = () => showError("Não foi possível carregar a configuração.");
document.head.appendChild(configScript);

function showError(message) {
  document.querySelector("#app").innerHTML =
    `<main style="padding:30px;color:white">${message}</main>`;
}

function start() {
  const cfg = window.RESENHA_CONFIG || {};

  if (!cfg.SUPABASE_URL || cfg.SUPABASE_URL.includes("COLE_AQUI") ||
      !cfg.SUPABASE_ANON_KEY || cfg.SUPABASE_ANON_KEY.includes("COLE_AQUI")) {
    showError("Configure a URL e a chave pública do Supabase.");
    return;
  }

  const supabase = createClient(
    cfg.SUPABASE_URL,
    cfg.SUPABASE_ANON_KEY
  );

  render(supabase);
}

function render(supabase) {
  const app = document.querySelector("#app");

  app.innerHTML = `
    <header class="top">
      <div class="brand">
        <span class="ball">⚽</span>
        <div><strong>Resenha FC</strong><small>Futebol, amizade e ranking</small></div>
      </div>
      <button id="logout" class="ghost hidden">Sair</button>
    </header>

    <main class="wrap">
      <section id="auth" class="panel auth">
        <p class="eyebrow">BEM-VINDO AO TIME</p>
        <h1>Entre na resenha.</h1>
        <p class="muted">Acesse sua conta ou crie seu cadastro.</p>
        <label>E-mail<input id="email" type="email"></label>
        <label>Senha<input id="password" type="password"></label>
        <div class="actions">
          <button id="login">Entrar</button>
          <button id="signup" class="secondary">Criar conta</button>
        </div>
        <p id="auth-msg" class="notice"></p>
      </section>

      <section id="dashboard" class="hidden">
        <div class="welcome">
          <div><p class="eyebrow">PAINEL DO TIME</p><h1>É dia de Resenha! ⚽</h1><p id="user-email" class="muted"></p></div>
          <span class="tag">RESENHA FC</span>
        </div>
        <nav class="tabs">
          <button class="tab active" data-tab="home">Início</button>
          <button class="tab" data-tab="players">Jogadores</button>
          <button class="tab" data-tab="round">Quinta-feira</button>
          <button class="tab" data-tab="finance">Financeiro</button>
          <button class="tab" data-tab="ranking">Ranking</button>
          <button class="tab" data-tab="prizes">Premiação</button>
        </nav>
        <div id="content"></div>
      </section>
    </main>
    <footer>Resenha FC · Feito para organizar a nossa bola</footer>
  `;

  const $ = s => document.querySelector(s);

  $("#login").onclick = () => auth("login");
  $("#signup").onclick = () => auth("signup");
  $("#logout").onclick = async () => await supabase.auth.signOut();

  async function auth(kind) {
    const email = $("#email").value.trim();
    const password = $("#password").value;

    if (!email || password.length < 6) {
      $("#auth-msg").textContent = "Informe e-mail e senha com pelo menos 6 caracteres.";
      return;
    }

    const result = kind === "login"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });

    $("#auth-msg").textContent = result.error
      ? result.error.message
      : "Operação realizada. Confira seu e-mail se a confirmação estiver ativa.";
  }

  supabase.auth.onAuthStateChange((_event, session) => setSession(session));
  supabase.auth.getSession().then(({ data }) => setSession(data.session));

  async function setSession(session) {
    $("#auth").classList.toggle("hidden", !!session);
    $("#dashboard").classList.toggle("hidden", !session);
    $("#logout").classList.toggle("hidden", !session);

    if (session) {
      $("#user-email").textContent = session.user.email || "";
      showTab("home");
    }
  }

  document.querySelectorAll(".tab").forEach(button => {
    button.onclick = () => showTab(button.dataset.tab);
  });

  async function showTab(tab) {
    document.querySelectorAll(".tab").forEach(button =>
      button.classList.toggle("active", button.dataset.tab === tab)
    );

    const content = $("#content");

    if (tab === "home") {
      content.innerHTML = `
        <div class="cards">
          <article class="tile"><span>👥</span><h3>Jogadores</h3><p>Organize a lista do time.</p></article>
          <article class="tile"><span>📅</span><h3>Quinta-feira</h3><p>Registre os encontros.</p></article>
          <article class="tile"><span>🏆</span><h3>Ranking</h3><p>Acompanhe os destaques.</p></article>
        </div>
        <section class="panel">
          <h2>Resenha FC</h2>
          <p class="muted">Cadastre jogadores, registre encontros, despesas e estatísticas.</p>
          <p class="notice">As despesas devem ser divididas somente entre os presentes.</p>
        </section>`;
    }

    if (tab === "players") {
      content.innerHTML = `
        <section class="panel">
          <h2>Jogadores</h2>
          <form id="player-form" class="inline-form">
            <input id="player-name" placeholder="Nome do jogador" required>
            <button>Adicionar</button>
          </form>
          <div id="player-list" class="list"></div>
          <p id="player-msg" class="notice"></p>
        </section>`;

      await loadPlayers();

      $("#player-form").onsubmit = async e => {
        e.preventDefault();
        const name = $("#player-name").value.trim();
        const { error } = await supabase.from("players").insert({ name });
        $("#player-msg").textContent = error ? error.message : "Jogador adicionado.";
        if (!error) {
          $("#player-name").value = "";
          loadPlayers();
        }
      };
    }

    if (tab === "round") {
      content.innerHTML = `
        <section class="panel">
          <h2>Registrar quinta-feira</h2>
          <form id="round-form">
            <label>Data<input id="round-date" type="date" required></label>
            <label>Observações<input id="round-notes" placeholder="Local ou observações"></label>
            <button>Salvar encontro</button>
          </form>
          <p id="round-msg" class="notice"></p>
          <div id="round-list" class="list"></div>
        </section>`;

      $("#round-form").onsubmit = async e => {
        e.preventDefault();
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from("rounds").insert({
          round_date: $("#round-date").value,
          notes: $("#round-notes").value,
          created_by: user.id
        });
        $("#round-msg").textContent = error ? error.message : "Encontro salvo.";
        if (!error) loadRounds();
      };

      await loadRounds();
    }

    if (tab === "finance") {
      content.innerHTML = `
        <section class="panel">
          <h2>Financeiro</h2>
          <p class="muted">Informe a despesa e o número de presentes.</p>
          <form id="finance-form">
            <label>Descrição<input id="expense-desc" required></label>
            <label>Valor total (R$)<input id="expense-value" type="number" min="0.01" step="0.01" required></label>
            <label>Quantidade de presentes<input id="present-count" type="number" min="1" required></label>
            <button>Registrar despesa</button>
          </form>
          <p id="finance-msg" class="notice"></p>
        </section>`;

      $("#finance-form").onsubmit = async e => {
        e.preventDefault();
        const amount = Number($("#expense-value").value);
        const count = Number($("#present-count").value);
        const { data: { user } } = await supabase.auth.getUser();

        const { error } = await supabase.from("finance_entries").insert({
          description: $("#expense-desc").value,
          amount,
          split_count: count,
          split_amount: amount / count,
          entry_type: "expense",
          created_by: user.id
        });

        $("#finance-msg").textContent = error
          ? error.message
          : `Despesa registrada. Rateio: R$ ${(amount / count).toFixed(2)} por presente.`;
      };
    }

    if (tab === "ranking") {
      content.innerHTML = `
        <section class="panel">
          <h2>Ranking</h2>
          <form id="stats-form">
            <label>Jogador<input id="stat-player" required></label>
            <label>Gols<input id="stat-goals" type="number" min="0" value="0"></label>
            <label>Assistências<input id="stat-assists" type="number" min="0" value="0"></label>
            <button>Salvar estatística</button>
          </form>
          <p id="stats-msg" class="notice"></p>
          <div id="stats-list" class="list"></div>
        </section>`;

      $("#stats-form").onsubmit = async e => {
        e.preventDefault();
        const { error } = await supabase.from("player_stats").insert({
          player_name: $("#stat-player").value,
          goals: Number($("#stat-goals").value),
          assists: Number($("#stat-assists").value)
        });
        $("#stats-msg").textContent = error ? error.message : "Estatística enviada.";
      };

      const { data, error } = await supabase.from("player_stats").select("player_name,goals,assists");

      if (error) {
        $("#stats-list").textContent = error.message;
      } else {
        const totals = {};
        (data || []).forEach(x => {
          const name = x.player_name || "Jogador";
          totals[name] ??= { goals: 0, assists: 0 };
          totals[name].goals += x.goals || 0;
          totals[name].assists += x.assists || 0;
        });

        $("#stats-list").innerHTML = Object.entries(totals)
          .sort((a, b) => b[1].goals - a[1].goals)
          .map(([name, value], i) =>
            `<div class="list-item"><b>${i + 1}. ${escapeHtml(name)}</b><span>${value.goals} gols · ${value.assists} assist.</span></div>`
          ).join("") || "Ainda não há estatísticas.";
      }
    }

    if (tab === "prizes") {
      content.innerHTML = `
        <section class="panel">
          <h2>Premiação semestral 🏆</h2>
          <form id="prize-form">
            <label>Semestre<input id="prize-season" placeholder="Ex.: 1º semestre de 2027" required></label>
            <label>Categoria<input id="prize-category" placeholder="Artilheiro, 1º lugar..." required></label>
            <label>Prêmio<input id="prize-description" required></label>
            <button>Salvar premiação</button>
          </form>
          <p id="prize-msg" class="notice"></p>
          <div id="prize-list" class="list"></div>
        </section>`;

      $("#prize-form").onsubmit = async e => {
        e.preventDefault();
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from("prizes").insert({
          season: $("#prize-season").value,
          category: $("#prize-category").value,
          description: $("#prize-description").value,
          created_by: user.id
        });
        $("#prize-msg").textContent = error ? error.message : "Premiação salva.";
        if (!error) loadPrizes();
      };

      await loadPrizes();
    }
  }

  async function loadPlayers() {
    const el = $("#player-list");
    const { data, error } = await supabase.from("players").select("*").order("name");
    el.innerHTML = error ? escapeHtml(error.message) :
      (data || []).map(p => `<div class="list-item">${escapeHtml(p.name || "Jogador")}</div>`).join("") ||
      "Nenhum jogador cadastrado.";
  }

  async function loadRounds() {
    const el = $("#round-list");
    const { data, error } = await supabase.from("rounds").select("*").order("round_date", { ascending: false }).limit(10);
    el.innerHTML = error ? escapeHtml(error.message) :
      (data || []).map(r => `<div class="list-item">${escapeHtml(r.round_date || "Encontro")} <span>${escapeHtml(r.notes || "")}</span></div>`).join("") ||
      "Nenhum encontro cadastrado.";
  }

  async function loadPrizes() {
    const el = $("#prize-list");
    const { data, error } = await supabase.from("prizes").select("*").order("created_at", { ascending: false });
    el.innerHTML = error ? escapeHtml(error.message) :
      (data || []).map(p => `<div class="list-item"><b>${escapeHtml(p.category || "Premiação")}</b><span>${escapeHtml(p.season || "")} · ${escapeHtml(p.description || "")}</span></div>`).join("") ||
      "Nenhuma premiação cadastrada.";
  }
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}
