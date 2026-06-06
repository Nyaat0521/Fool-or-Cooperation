// ==============================
// game.js — ゲームロジック本体
// ==============================

const Game = (() => {

  // ---- 状態 ----
  let state = {};

  // ---- 初期化 ----
  function init() {
    buildPlayerInputs();
  }

  function buildPlayerInputs() {
    const wrap = document.getElementById('player-inputs');
    wrap.innerHTML = '';
    const labels = ['あなた（プレイヤー1）', '友達2', '友達3', '友達4', '友達5', '友達6'];
    const defaults = ['あなた', '田中', '佐藤', '鈴木', '伊藤', '渡辺'];
    for (let i = 0; i < 6; i++) {
      const row = document.createElement('div');
      row.className = 'input-row';
      row.innerHTML = `
        <label class="input-label">${labels[i]}</label>
        <input class="player-name-input" type="text" placeholder="${defaults[i]}" maxlength="8" id="pname-${i}" value="${defaults[i]}" />
      `;
      wrap.appendChild(row);
    }
  }

  function startGame() {
    const names = [];
    for (let i = 0; i < 6; i++) {
      const val = document.getElementById(`pname-${i}`).value.trim();
      names.push(val || `プレイヤー${i + 1}`);
    }

    // デッキを生成・シャッフル
    const deck = shuffle(createDeck());
    const roles = dealRoles();

    // 各プレイヤーに9枚配布（54枚 ÷ 6人 = 9枚）
    const players = names.map((name, i) => ({
      id: i,
      name,
      role: roles[i],
      hand: deck.slice(i * 9, i * 9 + 9),
      roundsWon: 0,
      isHuman: i === 0
    }));

    state = {
      players,
      round: 1,
      currentPlayer: 0,      // 誰がカードを出す番か（インデックス）
      startPlayer: 0,        // ラウンドの最初のプレイヤー
      fieldCards: [],         // { player, card, jokerCard? }
      roleRevealIndex: 0,
      pendingJoker: null,     // { playerIdx, jokerCard }
      phase: 'role-reveal',   // role-reveal | play | result | end
    };

    showScreen('screen-role');
    showRoleReveal(0);
  }

  // ---- 役職確認フェーズ ----
  function showRoleReveal(idx) {
    state.roleRevealIndex = idx;
    const p = state.players[idx];
    document.getElementById('role-player-name').textContent = `${p.name} さん、準備はいいですか？`;
    document.getElementById('role-name').textContent = p.role.name;
    document.getElementById('role-icon').textContent = p.role.icon;
    document.getElementById('role-desc').textContent = p.role.desc;

    const card = document.getElementById('role-card');
    card.classList.add('face-down');
    card.classList.remove('flipped');
    document.getElementById('btn-role-next').classList.add('hidden');
    document.querySelector('.hint-text').style.display = '';
  }

  function flipRoleCard() {
    const card = document.getElementById('role-card');
    if (card.classList.contains('flipped')) return;
    card.classList.remove('face-down');
    card.classList.add('flipped');
    document.getElementById('btn-role-next').classList.remove('hidden');
    document.querySelector('.hint-text').style.display = 'none';
  }

  function nextRoleReveal() {
    state.roleRevealIndex++;
    if (state.roleRevealIndex < state.players.length) {
      showRoleReveal(state.roleRevealIndex);
    } else {
      showScreen('screen-game');
      renderGame();
    }
  }

  // ---- ゲーム画面 ----
  function renderGame() {
    const { players, round, currentPlayer, fieldCards } = state;

    document.getElementById('round-num').textContent = round;

    // 対戦相手エリア
    const oppArea = document.getElementById('opponents-area');
    oppArea.innerHTML = '';
    players.filter(p => !p.isHuman).forEach(p => {
      const div = document.createElement('div');
      div.className = 'opponent-slot';
      const active = players.indexOf(p) === currentPlayer;
      div.innerHTML = `
        <div class="opp-name ${active ? 'active-turn' : ''}">${p.name}</div>
        <div class="opp-hand">
          ${p.hand.map(() => `<div class="card card-back small"></div>`).join('')}
          <span class="opp-count">${p.hand.length}枚</span>
        </div>
        <div class="opp-rounds">🏆 ${p.roundsWon}</div>
      `;
      oppArea.appendChild(div);
    });

    // 場のカード
    renderField();

    // 自分の手札
    const me = players[0];
    document.getElementById('my-name-label').textContent = me.name;
    document.getElementById('my-rounds-label').textContent = `🏆 ${me.roundsWon}`;
    renderHand();

    // メッセージ
    const isMyTurn = currentPlayer === 0;
    const alreadyPlayed = fieldCards.some(f => f.playerId === 0);
    setMessage(isMyTurn && !alreadyPlayed
      ? 'あなたの番です。カードを1枚選んでください。'
      : alreadyPlayed
        ? '他のプレイヤーがカードを出すのを待っています...'
        : `${players[currentPlayer].name} の番です...`
    );

    // CPUの番なら自動でカードを出す
    if (currentPlayer !== 0 && !alreadyPlayed) {
      setTimeout(cpuPlayCard, 900);
    }
  }

  function renderHand() {
    const me = state.players[0];
    const alreadyPlayed = state.fieldCards.some(f => f.playerId === 0);
    const wrap = document.getElementById('hand-cards');
    wrap.innerHTML = '';
    me.hand.forEach((card, i) => {
      const div = createCardEl(card, !alreadyPlayed && state.currentPlayer === 0);
      if (!alreadyPlayed && state.currentPlayer === 0) {
        div.onclick = () => humanPlayCard(i);
      }
      wrap.appendChild(div);
    });
  }

  function renderField() {
    const wrap = document.getElementById('field-cards');
    wrap.innerHTML = '';
    state.fieldCards.forEach(f => {
      const col = document.createElement('div');
      col.className = 'field-slot';
      col.innerHTML = `<div class="field-player-name">${state.players[f.playerId].name}</div>`;

      const cardEl = createCardEl(f.card, false);
      col.appendChild(cardEl);

      if (f.jokerCard) {
        const jLabel = document.createElement('div');
        jLabel.className = 'joker-ref-label';
        jLabel.textContent = `→ ${f.jokerCard.suit}${f.jokerCard.rank}`;
        col.appendChild(jLabel);
      }
      wrap.appendChild(col);
    });
  }

  // ---- カード操作 ----
  function humanPlayCard(handIdx) {
    const me = state.players[0];
    const card = me.hand[handIdx];

    if (card.isJoker) {
      // ジョーカーの場合、もう1枚見せるカードを選ばせる
      state.pendingJoker = { playerIdx: 0, jokerCard: card, handIdx };
      showJokerOverlay(handIdx);
      return;
    }

    playCard(0, handIdx, null);
  }

  function showJokerOverlay(jokerHandIdx) {
    const me = state.players[0];
    const wrap = document.getElementById('joker-hand');
    wrap.innerHTML = '';
    me.hand.forEach((card, i) => {
      if (i === jokerHandIdx) return;
      const div = createCardEl(card, true);
      div.onclick = () => confirmJoker(jokerHandIdx, i);
      wrap.appendChild(div);
    });
    document.getElementById('joker-overlay').classList.remove('hidden');
  }

  function cancelJoker() {
    state.pendingJoker = null;
    document.getElementById('joker-overlay').classList.add('hidden');
  }

  function confirmJoker(jokerHandIdx, revealHandIdx) {
    document.getElementById('joker-overlay').classList.add('hidden');
    const revealCard = state.players[0].hand[revealHandIdx];
    playCard(0, jokerHandIdx, revealCard);
  }

  function playCard(playerIdx, handIdx, jokerCard) {
    const player = state.players[playerIdx];
    const card = player.hand[handIdx];

    // 手札から除去
    player.hand.splice(handIdx, 1);

    state.fieldCards.push({ playerId: playerIdx, card, jokerCard });

    // 次のプレイヤーへ
    advanceTurn();
  }

  function advanceTurn() {
    const { players, fieldCards } = state;

    // まだ出していないプレイヤーを探す
    const notPlayed = players
      .map((p, i) => i)
      .filter(i => {
        if (players[i].hand.length === 0 && !fieldCards.some(f => f.playerId === i)) return false;
        return !fieldCards.some(f => f.playerId === i);
      });

    if (notPlayed.length === 0) {
      // 全員出し終えた
      setTimeout(resolveRound, 600);
    } else {
      // 次のプレイヤーへ（startPlayerから順番に）
      const startIdx = state.startPlayer;
      const order = [];
      for (let i = 0; i < 6; i++) order.push((startIdx + i) % 6);
      const next = order.find(i => notPlayed.includes(i));
      state.currentPlayer = next;
      renderGame();
    }
  }

  // CPU AI: 手札から1枚ランダムに選んで出す
  function cpuPlayCard() {
    const idx = state.currentPlayer;
    const player = state.players[idx];
    if (!player || player.hand.length === 0) { advanceTurn(); return; }

    const handIdx = Math.floor(Math.random() * player.hand.length);
    const card = player.hand[handIdx];

    let jokerCard = null;
    if (card.isJoker && player.hand.length > 1) {
      const others = player.hand.filter((_, i) => i !== handIdx);
      jokerCard = others[Math.floor(Math.random() * others.length)];
    }

    playCard(idx, handIdx, jokerCard);
  }

  // ---- ラウンド解決 ----
  function resolveRound() {
    const { fieldCards, players } = state;

    // ジョーカーの値を解決（jokerCardの値として扱う）
    const resolvedCards = fieldCards.map(f => ({
      ...f,
      effectiveValue: f.card.isJoker && f.jokerCard
        ? f.jokerCard.value
        : f.card.value,
      effectiveRank: f.card.isJoker && f.jokerCard
        ? f.jokerCard.rank
        : f.card.rank,
    }));

    // 最大値を求める
    const maxValue = Math.max(...resolvedCards.map(c => c.effectiveValue));
    const winners = resolvedCards.filter(c => c.effectiveValue === maxValue);

    let winnerIdx = null;
    let resultText = '';

    if (winners.length > 1) {
      // 被り → キャンセル
      resultText = `🤝 ${winners.map(w => players[w.playerId].name).join(' と ')} が被り！\nこのラウンドは無効です。`;
    } else {
      winnerIdx = winners[0].playerId;
      players[winnerIdx].roundsWon++;
      resultText = `🏆 ${players[winnerIdx].name} の勝利！`;
      state.startPlayer = winnerIdx;
    }

    showResultOverlay(resultText, resolvedCards, winnerIdx);

    // ゲーム終了チェック
    const anyEmpty = players.some(p => p.hand.length === 0);
    if (anyEmpty) {
      state.phase = 'end';
    } else {
      state.round++;
      state.fieldCards = [];
    }
  }

  function showResultOverlay(text, resolvedCards, winnerIdx) {
    const badge = document.getElementById('result-badge');
    badge.textContent = text;
    badge.className = 'result-badge ' + (winnerIdx !== null ? 'win' : 'draw');

    const cardsWrap = document.getElementById('result-cards');
    cardsWrap.innerHTML = '';
    resolvedCards.forEach(rc => {
      const col = document.createElement('div');
      col.className = 'result-card-col' + (rc.playerId === winnerIdx ? ' winner' : '');
      col.innerHTML = `<div class="result-player-name">${state.players[rc.playerId].name}</div>`;
      col.appendChild(createCardEl(rc.card, false));
      if (rc.card.isJoker && rc.jokerCard) {
        const ref = document.createElement('div');
        ref.className = 'joker-ref-label';
        ref.textContent = `→ ${rc.jokerCard.suit}${rc.jokerCard.rank}`;
        col.appendChild(ref);
      }
      cardsWrap.appendChild(col);
    });

    document.getElementById('result-overlay').classList.remove('hidden');
  }

  function nextRound() {
    document.getElementById('result-overlay').classList.add('hidden');
    if (state.phase === 'end') {
      showFinalResult();
    } else {
      state.currentPlayer = state.startPlayer;
      renderGame();
    }
  }

  // ---- 最終結果 ----
  function showFinalResult() {
    showScreen('screen-final');
    const sorted = [...state.players].sort((a, b) => b.roundsWon - a.roundsWon);
    const winner = sorted[0];

    document.getElementById('final-winner').textContent = `🎉 ${winner.name} の優勝！`;
    document.getElementById('final-role').textContent = `${winner.role.icon} 役職：${winner.role.name}`;

    const list = document.getElementById('final-score-list');
    list.innerHTML = sorted.map((p, i) => `
      <div class="final-score-row ${i === 0 ? 'first' : ''}">
        <span class="final-rank">${i + 1}位</span>
        <span class="final-name">${p.role.icon} ${p.name}</span>
        <span class="final-role-name">${p.role.name}</span>
        <span class="final-wins">${p.roundsWon} 勝</span>
      </div>
    `).join('');
  }

  // ---- スコアボード ----
  function toggleScoreboard() {
    const ov = document.getElementById('score-overlay');
    if (ov.classList.contains('hidden')) {
      const list = document.getElementById('score-list');
      const sorted = [...state.players].sort((a, b) => b.roundsWon - a.roundsWon);
      list.innerHTML = sorted.map((p, i) => `
        <div class="score-row">
          <span class="score-rank">${i + 1}</span>
          <span class="score-name">${p.name}</span>
          <span class="score-wins">${p.roundsWon} 勝</span>
        </div>
      `).join('');
      ov.classList.remove('hidden');
    } else {
      ov.classList.add('hidden');
    }
  }

  // ---- ユーティリティ ----
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
  }

  function setMessage(msg) {
    document.getElementById('message-bar').textContent = msg;
  }

  function createCardEl(card, clickable) {
    const div = document.createElement('div');
    const isRed = card.suit === '♥' || card.suit === '♦';
    div.className = `card ${isRed ? 'red' : 'black'} ${card.isJoker ? 'joker' : ''} ${clickable ? 'clickable' : ''}`;
    div.innerHTML = `
      <span class="card-top">${card.suit}</span>
      <span class="card-rank">${card.rank}</span>
      <span class="card-bot">${card.suit}</span>
    `;
    return div;
  }

  // Public API
  return {
    showScreen,
    startGame,
    flipRoleCard,
    nextRoleReveal,
    toggleScoreboard,
    cancelJoker,
    nextRound,
    init,
  };
})();

document.addEventListener('DOMContentLoaded', () => Game.init());
