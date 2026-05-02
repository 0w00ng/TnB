import { useEffect, useMemo, useState } from "react";
import {
  fetchActiveVoiceSessions,
  fetchRecentVoiceSessions,
  fetchVoiceRanking,
  fetchVoiceSummary,
  getVoiceLedgerEventUrl,
} from "./api/voiceLedgerApi.js";

const navItems = [
  { label: "홈", href: "/" },
  { label: "디스코드 운영", href: "/systems/voice-ledger" },
  { label: "기록보관소", href: "/archive" },
];

const members = [
  ["김준범", "Original Founder", "T&B 세계관의 시작점이자 운영의 기준점."],
  ["김영웅", "Brand Architect", "두 번째 방의 세계관을 정리하고 혼돈을 브랜드처럼 보이게 만드는 사람."],
  ["권우철", "Chief Brown Officer", "상징성 하나로 조직의 기억에 남은 내부 밈의 중심."],
  ["조윤성", "Noble Analyst", "귀공자 출신의 날카로운 분석가. 이상한 흐름을 가장 먼저 잡아낸다."],
  ["김지헌", "Brutal Realist", "헛소리를 가장 빠르게 잘라내는 현실주의자."],
  ["남궁홍주", "Dark Romantic", "예측하기 어렵지만 존재감이 강한 위험한 매력의 멤버."],
  ["이병하", "Ground Operator", "현실의 무게를 아는 조용한 운영형 멤버."],
  ["조성범", "Unpolished Heir", "다음 챕터를 준비 중인 미출시 상태의 캐릭터."],
];

const modules = [
  ["멤버 등록소", "Founding Members Registry", "T&B 멤버들의 역할, 별명, 캐릭터를 정리한 인물 시스템입니다.", "Active", "#members"],
  ["디스코드 운영", "Discord Operations", "음성채널 체류시간과 활동 흐름을 기록하는 실제 운영 시스템입니다.", "Beta", "/systems/voice-ledger"],
  ["기록보관소", "Internal Mythology", "대화에서 파생된 사건과 밈을 T&B식 기록물로 보관합니다.", "Beta", "/archive"],
  ["경쟁 운영 보드", "Competitive Operations Board", "롤, FC온라인, 내전 기록을 관리할 예정인 게임 운영 보드입니다.", "Coming Soon", null],
];

const archiveIncidents = [
  ["T&B.inc 창립 선언", "김준범의 회사식 환영사로 T&B가 단순 단톡방에서 조직 세계관으로 전환된 사건."],
  ["권우철 근태 위기", "게임과 디스코드 참여 독촉이 회사 근태 관리 문법으로 변질된 사건."],
  ["조윤성 승진 공지", "People Manager 임명과 승진 발표문으로 인사 시스템이 생긴 사건."],
  ["채팅봇 궁합 폭주", "궁합 점수 하나로 멤버 관계도와 내부 밈이 동시에 재편된 봇 사고."],
  ["팀채팅 이전", "새 팀채팅, 새 로고, 새 방장 권한이 한 번에 재정의된 조직 이전 사건."],
  ["외부 인원 초대", "박다인 초대로 내부 보안 체계가 흔들리고 모두가 수습 모드에 들어간 사건."],
];

const mockSummary = {
  todayTotalLabel: "12시간 40분",
  weekTotalLabel: "63시간 53분",
  mostActiveMember: "김영웅",
  mostOccupiedChannel: "General",
  activeSessionCount: 2,
};

const mockRanking = [
  { rank: 1, displayName: "김영웅", totalTimeLabel: "12시간 40분", sessionCount: 8, mainChannel: "General", status: "활동 중" },
  { rank: 2, displayName: "김준범", totalTimeLabel: "10시간 15분", sessionCount: 6, mainChannel: "Lounge", status: "활동 중" },
  { rank: 3, displayName: "권우철", totalTimeLabel: "8시간 32분", sessionCount: 5, mainChannel: "Operations", status: "기록됨" },
];

function currentPath() {
  return window.location.pathname;
}

function goTo(path) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function Shell({ children }) {
  return (
    <div className="min-h-screen overflow-hidden bg-[#05070d] text-[#f5ead7]">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(201,164,92,0.16),transparent_32%),radial-gradient(circle_at_80%_0%,rgba(45,87,155,0.18),transparent_36%),linear-gradient(135deg,#05070d,#0b1020_48%,#050505)]" />
      <header className="sticky top-0 z-50 border-b border-[#c9a45c]/20 bg-black/75 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <button onClick={() => goTo("/")} className="flex items-center gap-3 text-left">
            <Logo size="small" />
            <span className="text-lg font-semibold tracking-[0.18em] text-[#f8efd9]">T&B</span>
          </button>
          <div className="hidden items-center gap-2 md:flex">
            {navItems.map((item) => (
              <button key={item.href} onClick={() => goTo(item.href)} className="rounded-full border border-white/10 px-4 py-2 text-sm text-[#e7d7b6] transition hover:border-[#c9a45c]/60 hover:text-white">
                {item.label}
              </button>
            ))}
          </div>
        </nav>
      </header>
      {children}
      <footer className="border-t border-white/10 px-5 py-10 text-center text-sm text-[#b7a98d]">
        © T&B. Trust and Believe. Private Company. Real Brotherhood.
      </footer>
    </div>
  );
}

function Logo({ size = "large" }) {
  const [failed, setFailed] = useState(false);
  const cls = size === "small" ? "h-10 w-10" : "h-56 w-56 md:h-80 md:w-80";

  if (failed) {
    return <div className={`${cls} grid place-items-center rounded-full border border-[#c9a45c]/70 bg-black text-[#d6af5b] shadow-[0_0_80px_rgba(201,164,92,0.3)]`}><span className="font-serif text-2xl font-bold">T&B</span></div>;
  }

  return <img src="/tnb-logo.png" alt="T&B Trust and Believe logo" onError={() => setFailed(true)} className={`${cls} rounded-full object-cover shadow-[0_0_90px_rgba(201,164,92,0.36)]`} />;
}

function Pill({ children, tone = "gold" }) {
  const color = tone === "muted" ? "border-white/10 text-[#b7a98d]" : "border-[#c9a45c]/40 text-[#d6af5b]";
  return <span className={`rounded-full border ${color} bg-white/[0.03] px-3 py-1 text-xs font-semibold tracking-[0.16em]`}>{children}</span>;
}

function Card({ children, className = "" }) {
  return <div className={`rounded-2xl border border-[#c9a45c]/20 bg-white/[0.045] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.28)] backdrop-blur transition hover:-translate-y-1 hover:border-[#c9a45c]/50 ${className}`}>{children}</div>;
}

function HomePage() {
  return (
    <Shell>
      <main className="mx-auto max-w-7xl px-5 py-16 md:py-24">
        <section className="grid items-center gap-12 md:grid-cols-[1.05fr_0.95fr]">
          <div>
            <Pill>PRIVATE CREW CONSOLE</Pill>
            <h1 className="mt-8 text-5xl font-black tracking-tight text-white md:text-7xl">T&B OS</h1>
            <p className="mt-4 text-xl text-[#d6af5b]">Trust and Believe</p>
            <p className="mt-7 max-w-2xl text-2xl font-semibold leading-snug text-[#f4ead8]">친구들의 혼돈과 결속을 하나의 시스템으로.</p>
            <p className="mt-5 max-w-2xl text-base leading-8 text-[#cfc2a8]">TnB는 단순한 랜딩페이지가 아닙니다. 멤버, 디스코드, 내부 밈, 게임, 모임 기록까지 하나의 세계관으로 연결하는 프라이빗 크루 운영체계입니다.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button onClick={() => document.getElementById("modules")?.scrollIntoView()} className="rounded-full bg-[#d6af5b] px-6 py-3 font-semibold text-black shadow-[0_0_40px_rgba(214,175,91,0.25)]">콘솔 입장</button>
              <button onClick={() => document.getElementById("members")?.scrollIntoView()} className="rounded-full border border-[#d6af5b]/40 px-6 py-3 font-semibold text-[#f4ead8]">멤버 보기</button>
            </div>
            <div className="mt-7 flex flex-wrap gap-2"><Pill>SEASON 2</Pill><Pill>MEMBERS ONLY</Pill><Pill>BUILT ON CHAOS</Pill></div>
          </div>
          <div className="relative grid place-items-center">
            <div className="absolute h-[115%] w-[115%] rounded-full border border-[#c9a45c]/20" />
            <div className="absolute h-[88%] w-[88%] rounded-full border border-white/10" />
            <Logo />
            <p className="absolute -bottom-6 text-sm text-[#b7a98d]">공식처럼 보이는 비공식 인장</p>
          </div>
        </section>

        <section id="modules" className="py-24">
          <div className="mb-10 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div><h2 className="text-3xl font-bold text-white">TnB 모듈</h2><p className="mt-2 text-[#b7a98d]">장난처럼 시작된 것들이 이제 시스템이 됩니다.</p></div>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {modules.map(([title, label, desc, status, href]) => (
              <Card key={title}>
                <div className="flex items-center justify-between gap-3"><Pill tone={status === "Coming Soon" ? "muted" : "gold"}>{status}</Pill></div>
                <h3 className="mt-5 text-xl font-bold text-white">{title}</h3>
                <p className="mt-1 text-sm text-[#d6af5b]">{label}</p>
                <p className="mt-4 min-h-24 text-sm leading-7 text-[#cfc2a8]">{desc}</p>
                <button disabled={!href} onClick={() => href?.startsWith("/") ? goTo(href) : document.querySelector(href)?.scrollIntoView()} className="mt-5 rounded-full border border-[#d6af5b]/40 px-4 py-2 text-sm font-semibold text-[#f4ead8] disabled:cursor-not-allowed disabled:opacity-40">{href ? "열기" : "준비 중"}</button>
              </Card>
            ))}
          </div>
        </section>

        <section id="members" className="py-16">
          <h2 className="text-3xl font-bold text-white">창립 멤버 등록소</h2>
          <p className="mt-2 text-[#b7a98d]">멤버는 친구가 아니라, 각자의 역할을 가진 조직 구성원입니다.</p>
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {members.map(([name, role, desc]) => (
              <Card key={name}>
                <div className="grid h-12 w-12 place-items-center rounded-full border border-[#c9a45c]/40 bg-black/40 text-sm font-bold text-[#d6af5b]">{name.slice(0, 1)}</div>
                <h3 className="mt-5 text-xl font-bold text-white">{name}</h3>
                <p className="mt-1 text-sm text-[#d6af5b]">{role}</p>
                <p className="mt-4 text-sm leading-7 text-[#cfc2a8]">{desc}</p>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </Shell>
  );
}

function VoiceLedgerPage() {
  const [range, setRange] = useState("today");
  const [summary, setSummary] = useState(mockSummary);
  const [ranking, setRanking] = useState(mockRanking);
  const [recent, setRecent] = useState([]);
  const [active, setActive] = useState([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const [summaryData, rankingData, recentData, activeData] = await Promise.all([
        fetchVoiceSummary(), fetchVoiceRanking(range), fetchRecentVoiceSessions(), fetchActiveVoiceSessions(),
      ]);
      setSummary(summaryData);
      setRanking(rankingData);
      setRecent(recentData);
      setActive(activeData);
      setConnected(true);
    } catch {
      setSummary(mockSummary);
      setRanking(mockRanking);
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [range]);
  useEffect(() => {
    let es;
    try {
      es = new EventSource(getVoiceLedgerEventUrl());
      es.addEventListener("voice-ledger-update", load);
    } catch {}
    const timer = setInterval(load, 10000);
    return () => { es?.close(); clearInterval(timer); };
  }, [range]);

  return (
    <Shell>
      <main className="mx-auto max-w-7xl px-5 py-16">
        <section className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <Pill>{connected ? "DISCORD 연결됨" : "미리보기 데이터"}</Pill>
            <h1 className="mt-7 text-4xl font-black text-white md:text-6xl">T&B Voice Presence Ledger</h1>
            <p className="mt-6 text-lg leading-8 text-[#cfc2a8]">디스코드 음성채널 체류시간을 기반으로 TnB 멤버들의 활동량을 기록하고 통계화하는 내부 운영 시스템입니다.</p>
            <p className="mt-4 text-sm text-[#b7a98d]">{connected ? "Discord Bot과 연결되어 실제 음성채널 체류시간을 표시하고 있습니다." : "API 연결 실패 시 현재는 미리보기 데이터가 표시됩니다."}</p>
          </div>
          <Card>
            <div className="grid gap-4 sm:grid-cols-2">
              {[ ["오늘 누적", summary.todayTotalLabel], ["최근 7일", summary.weekTotalLabel], ["최다 활동 멤버", summary.mostActiveMember], ["최다 사용 채널", summary.mostOccupiedChannel], ["현재 접속 세션", `${summary.activeSessionCount ?? 0}개`] ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-white/10 bg-black/25 p-4"><p className="text-sm text-[#b7a98d]">{label}</p><p className="mt-2 text-2xl font-bold text-white">{value}</p></div>
              ))}
            </div>
          </Card>
        </section>

        <section className="mt-14">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-bold text-white">활동 랭킹</h2>
            <div className="flex gap-2">{[["today","오늘"],["week","7일"],["month","30일"],["total","전체"]].map(([key,label]) => <button key={key} onClick={() => setRange(key)} className={`rounded-full px-4 py-2 text-sm ${range===key ? "bg-[#d6af5b] text-black" : "border border-white/10 text-[#f4ead8]"}`}>{label}</button>)}</div>
          </div>
          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-white/10 text-[#d6af5b]"><tr>{["순위","멤버","누적 체류시간","세션 수","주요 채널","상태"].map(h => <th key={h} className="px-5 py-4">{h}</th>)}</tr></thead>
              <tbody>{ranking.map(row => <tr key={`${row.rank}-${row.displayName}`} className="border-b border-white/5"><td className="px-5 py-4">{row.rank}</td><td className="px-5 py-4 font-semibold text-white">{row.displayName}</td><td className="px-5 py-4">{row.totalTimeLabel}</td><td className="px-5 py-4">{row.sessionCount}</td><td className="px-5 py-4">{row.mainChannel}</td><td className="px-5 py-4 text-[#d6af5b]">{row.status}</td></tr>)}</tbody>
            </table>
          </Card>
        </section>

        <section className="mt-10 grid gap-5 lg:grid-cols-2">
          <ListCard title="현재 접속 중" rows={active} empty="현재 접속 중인 세션이 없습니다." />
          <ListCard title="최근 완료 세션" rows={recent} empty="최근 완료 세션이 없습니다." />
        </section>
        {loading && <p className="mt-6 text-sm text-[#b7a98d]">데이터 불러오는 중...</p>}
      </main>
    </Shell>
  );
}

function ListCard({ title, rows, empty }) {
  return <Card><h3 className="text-xl font-bold text-white">{title}</h3><div className="mt-5 space-y-3">{rows?.length ? rows.slice(0, 8).map((row, i) => <div key={i} className="rounded-xl border border-white/10 bg-black/25 p-4 text-sm"><p className="font-semibold text-white">{row.displayName || row.username}</p><p className="mt-1 text-[#b7a98d]">{row.channelName} · {row.durationLabel || row.currentDurationLabel || "기록 중"}</p></div>) : <p className="text-sm text-[#b7a98d]">{empty}</p>}</div></Card>;
}

function ArchivePage() {
  const [selected, setSelected] = useState(null);
  const filtered = useMemo(() => archiveIncidents, []);
  return (
    <Shell>
      <main className="mx-auto max-w-7xl px-5 py-16">
        <section className="text-center">
          <Pill>RESTRICTED ARCHIVE</Pill>
          <h1 className="mt-7 text-4xl font-black text-white md:text-6xl">Internal Mythology Archive</h1>
          <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-[#cfc2a8]">T&B 내부에서 실제 대화와 사건을 기반으로 정리한 비공식 기록 보관소입니다. 모든 사건은 과장, 왜곡, 내부 밈, 그리고 약간의 진실로 구성되어 있습니다.</p>
        </section>
        <section className="mt-14 grid gap-5 md:grid-cols-3">
          {[ ["기록 사건", "6"], ["창립 멤버", "8"], ["프라이빗 크루", "1"] ].map(([k,v]) => <Card key={k}><p className="text-sm text-[#b7a98d]">{k}</p><p className="mt-2 text-4xl font-black text-white">{v}</p></Card>)}
        </section>
        <section className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map(([title, desc]) => <Card key={title}><Pill>INCIDENT</Pill><h2 className="mt-5 text-xl font-bold text-white">{title}</h2><p className="mt-4 min-h-28 text-sm leading-7 text-[#cfc2a8]">{desc}</p><button onClick={() => setSelected([title, desc])} className="mt-5 rounded-full border border-[#d6af5b]/40 px-4 py-2 text-sm font-semibold text-[#f4ead8]">상세 보기</button></Card>)}
        </section>
      </main>
      {selected && <div className="fixed inset-0 z-[60] bg-black/70 p-5 backdrop-blur" onClick={() => setSelected(null)}><div className="mx-auto mt-20 max-w-2xl rounded-2xl border border-[#c9a45c]/30 bg-[#080b12] p-7" onClick={(e) => e.stopPropagation()}><Pill>INCIDENT REPORT</Pill><h2 className="mt-5 text-2xl font-bold text-white">{selected[0]}</h2><p className="mt-5 leading-8 text-[#cfc2a8]">{selected[1]}</p><p className="mt-5 text-sm text-[#b7a98d]">상세 원문 로그는 내부용 데이터 파일 연동 후 확장됩니다.</p><button onClick={() => setSelected(null)} className="mt-7 rounded-full bg-[#d6af5b] px-5 py-2 font-semibold text-black">닫기</button></div></div>}
    </Shell>
  );
}

export default function App() {
  const [path, setPath] = useState(currentPath());
  useEffect(() => { const onPop = () => setPath(currentPath()); window.addEventListener("popstate", onPop); return () => window.removeEventListener("popstate", onPop); }, []);

  if (path === "/systems/voice-ledger") return <VoiceLedgerPage />;
  if (path === "/archive") return <ArchivePage />;
  return <HomePage />;
}
