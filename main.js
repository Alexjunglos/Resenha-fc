import { createClient } from "@supabase/supabase-js";
import "../style.css";

const configScript = document.createElement("script");
configScript.src = "/config.js";
configScript.onload = start;
configScript.onerror = () => showConfigError("Não foi possível carregar public/config.js.");
document.head.appendChild(configScript);

function showConfigError(message) {
  document.querySelector("#app").innerHTML = `<main class="wrap"><section class="panel"><h1>Resenha FC</h1><p>${message}</p></section></main>`;
}

function start() {
  const cfg = window.RESENHA_CONFIG || {};
  if (!cfg.SUPABASE_URL || cfg.SUPABASE_URL.includes("COLE_AQUI") ||
      !cfg.SUPABASE_ANON_KEY || cfg.SUPABASE_ANON_KEY.includes("COLE_AQUI")) {
    showConfigError("Falta configurar a URL e a chave publicável do Supabase no arquivo public/config.js.");
    return;
  }
  const supabase = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  render(supabase);
}

function render(supabase) {
  const app = document.querySelector("#app");
  app.innerHTML = `
    <header class="top"><div class="brand"><span class="ball">⚽</span><div><strong>Resenha FC</strong><small>Futebol, amizade e ranking</small></div></div><button id="logout" class="ghost hidden">Sair</button></header>
    <main class="wrap">
      <section id="auth" class="panel auth">
        <p class="eyebrow">BEM-VINDO AO TIME</p><h1>Entre na resenha.</h1>
        <p class="muted">Acesse sua conta ou crie seu cadastro.</p>
        <label>E-mail<input id="email" type="email" placeholder="voce@email.com" autocomplete="email"></label>
        <label>Senha<input id="password" type="password" placeholder="Mínimo de 6 caracteres" autocomplete="current-password"></label>
        <div class="actions"><button id="login">Entrar</button><button id="signup" class="secondary">Criar conta</button></div>
        <p id="auth-msg" class="notice"></p>
      </section>
      <section id="dashboard" class="hidden">
        <div class="welcome"><div><p class="eyebrow">PAINEL DO TIME</p><h1>É dia de Resenha! ⚽</h1><p class="muted" id="user-email"></p></div><span class="tag">RESENHA FC</span></div>
        <nav class="tabs">
          <button class="tab active" data-tab="home">Início</button><button class="tab" data-tab="players">Jogadores</button><button class="tab" data-tab="round">Quinta-feira</button><button class="tab" data-tab="finance">Financeiro</button><button class="tab" data-tab="ranking">Ranking</button><button class="tab" data-tab="prizes">Premiação</button>
        </nav>
        <div id="content"></div>
      </section>
    </main>
    <footer>Resenha FC · Feito para organizar a nossa bola</footer>`;
  const $ = s => document.querySelector(s);
  $("#login").onclick = () => auth("login");
  $("#signup").onclick = () => auth("signup");
  $("#logout").onclick = async () => { await supabase.auth.signOut(); };
  async function auth(kind) {
    const email = $("#email").value.trim(), password = $("#password").value;
    $("#auth-msg").textContent = "";
    if (!email || password.length < 6) { $("#auth-msg").textContent = "Informe um e-mail e uma senha com pelo menos 6 caracteres."; return; }
    const result = kind === "login"
      ? await supabase.auth.signInWithPassword({email, password})
      : await supabase.auth.signUp({email, password});
    $("#auth-msg").textContent = result.error ? result.error.message : (kind === "signup" ? "Cadastro enviado! Se a confirmação de e-mail estiver ativa, confira sua caixa de entrada." : "Acesso realizado.");
  }
  supabase.auth.onAuthStateChange((_event, session) => setSession(session));
  supabase.auth.getSession().then(({data}) => setSession(data.session));
  async function setSession(session) {
    $("#auth").classList.toggle("hidden", !!session);
    $("#dashboard").classList.toggle("hidden", !session);
    $("#logout").classList.toggle("hidden", !session);
    if (session) {
      $("#user-email").textContent = session.user.email || "";
      showTab("home");
    }
  }
  document.querySelectorAll(".tab").forEach(b => b.onclick = () => showTab(b.dataset.tab));
  async function showTab(tab) {
    document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
    const content = $("#content");
    if (tab === "home") {
      content.innerHTML = `<div class="cards"><article class="tile"><span>👥</span><h3>Jogadores</h3><p>Organize a lista do time.</p></article><article class="tile"><span>📅</span><h3>Quinta-feira</h3><p>Registre presença e despesas.</p></article><article class="tile"><span>🏆</span><h3>Ranking</h3><p>Acompanhe gols e destaques.</p></article></div><section class="panel"><h2>Como funciona</h2><p class="muted">Cadastre os jogadores, registre cada encontro e lance as estatísticas. O rateio das despesas deve considerar somente quem compareceu.</p><p class="notice">Dica: os dois administradores precisam ter suas contas promovidas para o perfil admin no Supabase.</p></section>`;
    } else if (tab === "players") {
      content.innerHTML = `<section class="panel"><h2>Jogadores</h2><form id="player-form" class="inline-form"><input id="player-name" placeholder="Nome do jogador" required><button>Adicionar</button></form><div id="player-list" class="list"></div><p id="player-msg" class="notice"></p></section>`;
      await loadPlayers();
      $("#player-form").onsubmit = async e => { e.preventDefault(); const name=$("#player-name").value.trim(); if(!name)return; const {error}=await supabase.from("players").insert({name}); $("#player-msg").textContent=error?error.message:"Jogador adicionado."; if(!error){$("#player-name").value="";loadPlayers();} };
    } else if (tab === "round") {
      content.innerHTML = `<section class="panel"><h2>Registrar quinta-feira</h2><form id="round-form"><label>Data<input id="round-date" type="date" required></label><label>Observações<input id="round-notes" placeholder="Local, horário ou observações"></label><button>Salvar encontro</button></form><p id="round-msg" class="notice"></p><div id="round-list" class="list"></div></section>`;
      $("#round-form").onsubmit = async e => {e.preventDefault(); const {data:{user}}=await supabase.auth.getUser(); const {error}=await supabase.from("rounds").insert({round_date:$("#round-date").value, notes:$("#round-notes").value, created_by:user.id}); $("#round-msg").textContent=error?error.message:"Encontro salvo."; if(!error)loadRounds();};
      await loadRounds();
    } else if (tab === "finance") {
      content.innerHTML = `<section class="panel"><h2>Financeiro</h2><p class="muted">Registre despesas da rodada. O valor por pessoa é calculado considerando apenas os presentes.</p><form id="finance-form"><label>Descrição<input id="expense-desc" placeholder="Ex.: aluguel da quadra" required></label><label>Valor total (R$)<input id="expense-value" type="number" min="0.01" step="0.01" required></label><label>Quantidade de presentes<input id="present-count" type="number" min="1" step="1" required></label><button>Registrar despesa</button></form><p id="finance-msg" class="notice"></p></section>`;
      $("#finance-form").onsubmit = async e => {e.preventDefault(); const amount=Number($("#expense-value").value), count=Number($("#present-count").value); const {data:{user}}=await supabase.auth.getUser(); const {error}=await supabase.from("finance_entries").insert({description:$("#expense-desc").value,amount,split_count:count,split_amount:amount/count,entry_type:"expense",created_by:user.id}); $("#finance-msg").textContent=error?error.message:`Despesa registrada. Rateio: R$ ${(amount/count).toFixed(2)} por presente.`;};
    } else if (tab === "ranking") {
      content.innerHTML = `<section class="panel"><h2>Ranking</h2><p class="muted">Lance gols e assistências por jogador em cada rodada para compor o ranking.</p><form id="stats-form"><label>Jogador<input id="stat-player" placeholder="Nome do jogador" required></label><label>Gols<input id="stat-goals" type="number" min="0" value="0"></label><label>Assistências<input id="stat-assists" type="number" min="0" value="0"></label><button>Salvar estatística</button></form><p id="stats-msg" class="notice"></p><div id="stats-list" class="list"></div></section>`;
      $("#stats-form").onsubmit = async e => {e.preventDefault(); const {error}=await supabase.from("player_stats").insert({player_name:$("#stat-player").value,goals:Number($("#stat-goals").value),assists:Number($("#stat-assists").value)}); $("#stats-msg").textContent=error?error.message:"Estatística enviada.";};
      const {data,error}=await supabase.from("player_stats").select("player_name,goals,assists");
      if(error) $("#stats-list").textContent=error.message; else {
        const totals={}; (data||[]).forEach(x=>{const n=x.player_name||"Jogador"; totals[n]??={goals:0,assists:0};totals[n].goals+=x.goals||0;totals[n].assists+=x.assists||0;});
        $("#stats-list").innerHTML=Object.entries(totals).sort((a,b)=>b[1].goals-a[1].goals).map(([n,v],i)=>`<div class="list-item"><b>${i+1}. ${escapeHtml(n)}</b><span>${v.goals} gols · ${v.assists} assist.</span></div>`).join("")||"Ainda não há estatísticas.";
      }
    } else if (tab === "prizes") {
      content.innerHTML = `<section class="panel"><h2>Premiação semestral 🏆</h2><p class="muted">Defina as premiações do semestre para artilheiro e melhores colocados.</p><form id="prize-form"><label>Semestre<input id="prize-season" placeholder="Ex.: 1º semestre de 2027" required></label><label>Categoria<input id="prize-category" placeholder="Artilheiro, 1º lugar, destaque..." required></label><label>Descrição / prêmio<input id="prize-description" placeholder="Ex.: troféu + premiação" required></label><button>Salvar premiação</button></form><p id="prize-msg" class="notice"></p><div id="prize-list" class="list"></div></section>`;
      $("#prize-form").onsubmit = async e => {e.preventDefault(); const {data:{user}}=await supabase.auth.getUser(); const {error}=await supabase.from("prizes").insert({season:$("#prize-season").value,category:$("#prize-category").value,description:$("#prize-description").value,created_by:user.id}); $("#prize-msg").textContent=error?error.message:"Premiação salva."; if(!error)loadPrizes();};
      await loadPrizes();
    }
  }
  async function loadPlayers(){const el=$("#player-list");const {data,error}=await supabase.from("players").select("*").order("name");el.innerHTML=error?escapeHtml(error.message):(data||[]).map(p=>`<div class="list-item">${escapeHtml(p.name||"Jogador")}</div>`).join("")||"Nenhum jogador cadastrado.";}
  async function loadRounds(){const el=$("#round-list");const {data,error}=await supabase.from("rounds").select("*").order("round_date",{ascending:false}).limit(10);el.innerHTML=error?escapeHtml(error.message):(data||[]).map(r=>`<div class="list-item">${escapeHtml(r.round_date||"Encontro")} <span>${escapeHtml(r.notes||"")}</span></div>`).join("")||"Nenhum encontro cadastrado.";}
  async function loadPrizes(){const el=$("#prize-list");const {data,error}=await supabase.from("prizes").select("*").order("created_at",{ascending:false});el.innerHTML=error?escapeHtml(error.message):(data||[]).map(p=>`<div class="list-item"><b>${escapeHtml(p.category||"Premiação")}</b><span>${escapeHtml(p.season||"")} · ${escapeHtml(p.description||"")}</span></div>`).join("")||"Nenhuma premiação cadastrada.";}
}
function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
