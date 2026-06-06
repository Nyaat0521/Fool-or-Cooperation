// ==============================
// data.js — カード・役職データ
// ==============================

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// A=1, 2=2, ... K=13, JOKER=14（ただしジョーカーは特殊）
const RANK_VALUES = {
  'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6,
  '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'JOKER': 0
};

// トランプ1デッキ（54枚）を生成
function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, value: RANK_VALUES[rank], isJoker: false });
    }
  }
  deck.push({ suit: '★', rank: 'JOKER', value: 0, isJoker: true });
  deck.push({ suit: '★', rank: 'JOKER', value: 0, isJoker: true });
  return deck;
}

// フィッシャー・イェーツシャッフル
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ==============================
// 役職データ（6種）
// ==============================
const ROLES = [
  {
    id: 'ceo',
    name: 'CEO',
    icon: '👔',
    desc: '会社のトップ。誰よりも多くのラウンドを制した者だけが就ける地位。',
    flavor: '権力と孤独を知る者'
  },
  {
    id: 'researcher',
    name: '研究者',
    icon: '🔬',
    desc: '知識と冷静さで場を読む。勝利を積み重ね、静かに頂点を目指す。',
    flavor: 'データは嘘をつかない'
  },
  {
    id: 'manager',
    name: 'マネージャー',
    icon: '📋',
    desc: 'チームを動かす中間管理職。堅実な戦略で着実に勝利を積む。',
    flavor: '調整のプロフェッショナル'
  },
  {
    id: 'intern',
    name: 'インターン',
    icon: '🎒',
    desc: '新入りの下っ端。しかし侮るなかれ、時に逆転の一手を放つ。',
    flavor: '可能性は無限大'
  },
  {
    id: 'accountant',
    name: '経理担当',
    icon: '💰',
    desc: '数字に強く、リスク管理が得意。確実な一手で相手を追い詰める。',
    flavor: '計算どおりにいかないのが勝負'
  },
  {
    id: 'fool',
    name: 'フール',
    icon: '🃏',
    desc: 'ルールを知らないふりをする道化。しかし本当は……？',
    flavor: '笑われた者が最後に笑う'
  }
];

// 役職をシャッフルして6枚配布
function dealRoles() {
  return shuffle([...ROLES]);
}
