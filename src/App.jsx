import { useEffect, useState } from "react";
import { fetchActiveVoiceSessions, fetchRecentVoiceSessions, fetchVoiceRanking, fetchVoiceSummary, getVoiceLedgerEventUrl } from "./api/voiceLedgerApi.js";

const members = [
  ["김준범", "Original Founder", "T&B의 시작점. 장난처럼 시작된 관계를 하나의 이름 아래 묶어낸 사람."],
  ["김영웅", "Brand Architect", "인천의 현장 감각에서 B2B까지 올라온, 혼돈을 브랜드처럼 보이게 만드는 사람."],
  ["권우철", "Chief Brown Officer", "상징성 하나로 조직의 기억에 남은 내부 밈의 중심."],
  ["조윤성", "Noble Analyst", "귀공자 출신의 날카로운 분석가. 천박함에 점점 물들어가는 중."],
  ["김지헌", "Brutal Realist", "헛소리를 가장 빠르게 잘라내는 차가운 균형축."],
  ["남궁홍주", "Dark Romantic", "예측하기 어렵지만 묘하게 빠져드는 존재감을 가진 멤버."],
  ["이병하", "Ground Operator", "현실의 무게를 아는 조용한 운영형 멤버."],
  ["조성범", "Unpolished Heir", "다음 챕터를 준비 중인, 아직 미출시 상태의 캐릭터."],
];

const modules = [
  ["디스코드 운영", "실제 음성채널 체류시간을 기록하고 멤버별 활동량을 집계합니다.", "/systems/voice-ledger", "Beta"],
  ["기록보관소", "대화에서 파생된 사건과 내부 밈을 고급스러운 보고서처럼 보관합니다.", "/archive", "Active"],
  ["멤버 등록소", "T&B 멤버들의 역할, 별명, 캐릭터성을 정리한 인물 시스템입니다.", "#members", "Active"],
  ["경쟁 운영 보드", "내전, 게임 기록, 순위표를 관리할 예정인 운영 보드입니다.", null, "준비 중"],
];

const incidents = [
  ["T&B.inc 창립 선언", "김준범의 회사식 환영사로 단톡방이 조직 세계관으로 전환된 사건."],
  ["권우철 근태 위기", "참여 독촉이 회사식 근태 관리 문법으로 변질된 대표 사건."],
  ["조윤성 승진 공지", "People Manager 임명과 승진 발표문으로 인사 체계가 생긴 순간."],
  ["채팅봇 궁합 폭주", "궁합 점수 하나로 멤버 관계도와 내부 밈이 동시에 재편된 봇 사고."],
  ["팀채팅 이전", "새 방, 새 로고, 새 방장 권한이 한 번에 재정의된 조직 이전 사건."],
  ["박다인 초대 사건", "외부 인원 초대로 private crew의 보안 체계가 흔들린 사건."],
];

const mockSummary = { todayTotalLabel: "1분 미만", weekTotalLabel: "1분 미만", mostActiveMember: "기록 없음", mostOccupiedChannel: "기록 없음", activeSessionCount: 0 };
const mockRanking = [
  { rank: 1, displayName: "김영웅", totalTimeLabel: "12시간 40분", sessionCount: 8, mainChannel: "General", status: "미리보기" },
  { rank: 2, displayName: "김준범", totalTimeLabel: "10시간 15분", sessionCount: 6, mainChannel: "Lounge", status: "미리보기" },
  { rank: 3, displayName: "권우철", totalTimeLabel: "8시간 32분", sessionCount: 5, mainChannel: "Operations", status: "미리보기" },
];

function navigate(path) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function Logo({ className = "" }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <div className={`grid place-items-center rounded-full border border-[#d8b76f]/50 bg-[#120e09] font-serif font-black text-[#f4d993] shadow-[0_0_70px_rgba(216,183,111,0.24)] ${className}`}>T&B</div>;
  return <img src="/tnb-logo.png" alt="T&B Trust and Believe logo" onError={() => setFailed(true)} className={`rounded-full object-cover shadow-[0_0_80px_rgba(216,183,111,0.28)] ${className}`} />;
}

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-[#030407] text-[#f7f1df]">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_15%_8%,rgba(216,183,111,0.17),transparent_30%),radial-gradient(circle_at_82%_14%,rgba(31,70,130,0.22),transparent_32%),linear-gradient(180deg,#030407_0%,#07101d_52%,#030407_100%)]" />
      <div className="fixed inset-0 -z-10 opacity-[0.055] [background-image:linear-gradient(rgba(255,255,255,.75)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.75)_1px,transparent_1px)] [background-size:64px_64px]" />
      <header className="sticky top-0 z-50 border-b border-[#d8b76f]/15 bg-[#030407]/82 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8 lg:px-10">
          <button onClick={() => navigate("/")} className="flex items-center gap-3 text-left">
            <Logo className="h-10 w-10 text-sm" />
            <div><p className="text-sm font-black leading-none text-[#fff8e6]">T&B</p><p className="mt-1 text-[10px] font-bold tracking-[0.18em] text-[#9e9176]">TRUST AND BELIEVE</p></div>
          </button>
          <nav className="hidden items-center gap-2 md:flex">
            {[["홈", "/"], ["디스코드 운영", "/systems/voice-ledger"], ["기록보관소", "/archive"]].map(([label, href]) => (
              <button key={href} onClick={() => navigate(href)} className="rounded-full border border-white/10 bg-black/20 px-5 py-2.5 text-sm font-semibold text-[#f3ead8] transition hover:border-[#d8b76f]/40 hover:bg-[#d8b76f]/10 hover:text-[#f5d58b]">
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>
      {children}
      <footer className="border-t border-[#d8b76f]/12 bg-[#030407]/90 px-5 py-8 text-center text-sm text-[#8f856e]">© T&B. Trust and Believe. Built for the people who stay.</footer>
    </div>
  );
}

function Badge({ children, muted = false }) {
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black tracking-[0.14em] ${muted ? "border-white/10 bg-white/[0.04] text-[#9e9176]" : "border-[#d8b76f]/30 bg-[#d8b76f]/10 text-[#f5d58b]"}`}>{children}</span>;
}

function Card({ children, className = "" }) {
  return <div className={`rounded-2xl border border-[#d8b76f]/18 bg-white/[0.045] p-6 shadow-[0_0_60px_rgba(0,0,0,0.32)] backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-[#d8b76f]/45 hover:shadow-[0_0_80px_rgba(216,183,111,0.12)] ${className}`}>{children}</div>;
}

function HomePage() {
  return (
    <Shell>
      <main>
        <section className="mx-auto grid max-w-7xl items-center gap-14 px-5 pb-24 pt-16 sm:px-8 md:grid-cols-[1.05fr_0.95fr] md:py-28 lg:px-10">
          <div>
            <Badge>PRIVATE CREW CONSOLE</Badge>
            <h1 className="mt-8 text-6xl font-black tracking-tight text-[#fff8e6] sm:text-7xl lg:text-8xl">T&B OS</h1>
            <p className="mt-4 text-2xl font-semibold text-[#d8b76f]">Trust and Believe</p>
            <p className="mt-8 max-w-3xl text-3xl font-black leading-tight text-white sm:text-5xl">친구들의 혼돈과 결속을 하나의 시스템으로.</p>
            <p className="mt-7 max-w-2xl text-base leading-8 text-[#cfc6ad]/80 sm:text-lg">TnB는 단순한 랜딩페이지가 아닙니다. 멤버, 디스코드, 내부 밈, 기록보관소까지 하나의 세계관으로 연결하는 프라이빗 크루 운영체계입니다.</p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row"><a href="#modules" className="rounded-2xl bg-[#d8b76f] px-6 py-4 text-center text-sm font-black text-[#15100a] shadow-[0_0_45px_rgba(216,183,111,0.22)] transition hover:-translate-y-1 hover:bg-[#f4d993]">콘솔 입장</a><a href="#members" className="rounded-2xl border border-[#d8b76f]/35 bg-white/[0.03] px-6 py-4 text-center text-sm font-black text-[#fff8e6] transition hover:-translate-y-1 hover:border-[#f4d993]">멤버 보기</a></div>
          </div>
          <div className="relative mx-auto grid aspect-square w-full max-w-[500px] place-items-center"><div className="absolute inset-3 rounded-full border border-[#d8b76f]/20" /><div className="absolute inset-10 rounded-full border border-dashed border-[#d8b76f]/25" /><div className="absolute h-[74%] w-[74%] rounded-full bg-[#d8b76f]/10 blur-3xl" /><Logo className="relative h-[68%] w-[68%] border border-[#f4d993]/45 bg-[#120e09] text-5xl" /><div className="absolute bottom-4 rounded-full border border-[#d8b76f]/25 bg-[#05070b]/80 px-4 py-2 text-xs font-semibold text-[#d7c7a1] backdrop-blur">공식처럼 보이는 비공식 인장</div></div>
        </section>
        <section id="modules" className="border-y border-[#d8b76f]/10 bg-[#07090f]/72"><div className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:px-10"><p className="text-xs font-black uppercase tracking-[0.24em] text-[#d8b76f]">TnB Modules</p><h2 className="mt-4 max-w-3xl text-4xl font-black text-[#fff8e6] sm:text-5xl">장난처럼 시작된 것들이 이제 시스템이 됩니다.</h2><div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">{modules.map(([title, description, href, status]) => <Card key={title} className="flex min-h-[280px] flex-col"><div className="flex items-start justify-between gap-4"><h3 className="text-2xl font-black text-[#fff8e6]">{title}</h3><Badge muted={status === "준비 중"}>{status}</Badge></div><p className="mt-5 flex-1 text-sm leading-7 text-[#cfc6ad]/76">{description}</p>{href ? <button onClick={() => href.startsWith("/") ? navigate(href) : document.querySelector(href)?.scrollIntoView()} className="mt-7 w-fit rounded-2xl border border-[#d8b76f]/30 bg-[#d8b76f]/10 px-4 py-3 text-sm font-black text-[#f4d993]">열기</button> : <button disabled className="mt-7 w-fit cursor-not-allowed rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-black text-[#8f856e]">준비 중</button>}</Card>)}</div></div></section>
        <section id="members" className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:px-10"><p className="text-xs font-black uppercase tracking-[0.24em] text-[#d8b76f]">Founding Members Registry</p><h2 className="mt-4 max-w-3xl text-4xl font-black text-[#fff8e6] sm:text-5xl">멤버는 친구가 아니라, 각자의 역할을 가진 조직 구성원입니다.</h2><div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">{members.map(([name, role, description]) => <Card key={name} className="min-h-[260px]"><div className="grid h-12 w-12 place-items-center rounded-full border border-[#d8b76f]/35 bg-[#1a1209] text-sm font-black text-[#f4d993]">{name[0]}</div><h3 className="mt-6 text-2xl font-black text-[#fff8e6]">{name}</h3><p className="mt-1 text-sm font-bold text-[#d8b76f]">{role}</p><p className="mt-4 text-sm leading-7 text-[#cfc6ad]/74">{description}</p></Card>)}</div></section>
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
      const [summaryData, rankingData, recentData, activeData] = await Promise.all([fetchVoiceSummary(), fetchVoiceRanking(range), fetchRecentVoiceSessions(), fetchActiveVoiceSessions()]);
      setSummary(summaryData); setRanking(rankingData); setRecent(recentData); setActive(activeData); setConnected(true);
    } catch { setConnected(false); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [range]);
  useEffect(() => { let source; try { source = new EventSource(getVoiceLedgerEventUrl()); source.addEventListener("voice-ledger-update", load); } catch { source = null; } const timer = setInterval(load, 10000); return () => { source?.close(); clearInterval(timer); }; }, [range]);

  const summaryCards = [["오늘 누적", summary.todayTotalLabel], ["최근 7일", summary.weekTotalLabel], ["최다 활동 멤버", summary.mostActiveMember], ["최다 사용 채널", summary.mostOccupiedChannel], ["현재 접속 세션", `${summary.activeSessionCount ?? 0}개`]];
  return <Shell><main className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10"><section className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]"><div><Badge>{connected ? "DISCORD 연결됨" : "미리보기 데이터"}</Badge><h1 className="mt-7 text-5xl font-black text-[#fff8e6] md:text-7xl">T&B Voice Presence Ledger</h1><p className="mt-6 text-lg leading-8 text-[#cfc6ad]/80">디스코드 음성채널 체류시간을 기반으로 TnB 멤버들의 활동량을 기록하고 통계화하는 내부 운영 시스템입니다.</p><p className="mt-4 text-sm text-[#9e9176]">{connected ? "Discord Bot과 연결되어 실제 데이터를 표시하고 있습니다." : "API 연결 실패 시 미리보기 데이터가 표시됩니다."}</p></div><Card><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{summaryCards.map(([label, value]) => <div key={label} className="rounded-xl border border-white/10 bg-black/25 p-4"><p className="text-sm text-[#9e9176]">{label}</p><p className="mt-2 text-2xl font-black text-[#fff8e6]">{loading ? "불러오는 중" : value}</p></div>)}</div></Card></section><section className="mt-14"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl font-black text-[#fff8e6]">활동 랭킹</h2><div className="flex gap-2">{[["today","오늘"],["week","7일"],["month","30일"],["total","전체"]].map(([key,label]) => <button key={key} onClick={() => setRange(key)} className={`rounded-full px-4 py-2 text-sm font-bold ${range === key ? "bg-[#d8b76f] text-[#15100a]" : "border border-white/10 text-[#f4ead8]"}`}>{label}</button>)}</div></div><Card className="overflow-x-auto p-0"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-white/10 text-[#d8b76f]"><tr>{["순위","멤버","누적 체류시간","세션 수","주요 채널","상태"].map((h) => <th key={h} className="px-5 py-4">{h}</th>)}</tr></thead><tbody>{ranking.map((row) => <tr key={`${row.rank}-${row.displayName}`} className="border-b border-white/5"><td className="px-5 py-4 text-[#d8b76f]">{row.rank}</td><td className="px-5 py-4 font-bold text-[#fff8e6]">{row.displayName}</td><td className="px-5 py-4">{row.totalTimeLabel}</td><td className="px-5 py-4">{row.sessionCount}</td><td className="px-5 py-4">{row.mainChannel}</td><td className="px-5 py-4">{row.status}</td></tr>)}</tbody></table></Card></section><section className="mt-10 grid gap-5 lg:grid-cols-2"><List title="현재 접속 중" rows={active} empty="현재 접속 중인 세션이 없습니다." /><List title="최근 완료 세션" rows={recent} empty="최근 완료된 세션이 없습니다." /></section></main></Shell>;
}

function List({ title, rows, empty }) {
  return <Card><h3 className="text-xl font-black text-[#fff8e6]">{title}</h3><div className="mt-5 space-y-3">{rows?.length ? rows.slice(0, 8).map((row, index) => <div key={index} className="rounded-xl border border-white/10 bg-black/25 p-4 text-sm"><p className="font-bold text-[#fff8e6]">{row.displayName || row.username}</p><p className="mt-1 text-[#cfc6ad]/75">{row.channelName} · {row.durationLabel || row.currentDurationLabel || "기록 중"}</p></div>) : <p className="text-sm text-[#9e9176]">{empty}</p>}</div></Card>;
}

function ArchivePage() {
  const [selected, setSelected] = useState(null);
  return <Shell><main className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10"><section className="text-center"><Badge>RESTRICTED ARCHIVE</Badge><h1 className="mt-7 font-serif text-5xl font-black text-[#fff8e6] md:text-7xl">Internal Mythology Archive</h1><p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-[#cfc6ad]/80">T&B 내부에서 실제 대화와 사건을 기반으로 정리한 비공식 기록 보관소입니다. 모든 사건은 과장, 왜곡, 내부 밈, 그리고 약간의 진실로 구성되어 있습니다.</p></section><section className="mt-14 grid gap-5 md:grid-cols-3">{[["기록 사건","6"],["창립 멤버","8"],["프라이빗 크루","1"]].map(([label, value]) => <Card key={label}><p className="text-sm text-[#9e9176]">{label}</p><p className="mt-2 text-4xl font-black text-[#f5d58b]">{value}</p></Card>)}</section><section className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{incidents.map(([title, description]) => <Card key={title} className="min-h-[260px]"><Badge>INCIDENT REPORT</Badge><h2 className="mt-5 text-2xl font-black text-[#fff8e6]">{title}</h2><p className="mt-4 text-sm leading-7 text-[#cfc6ad]/78">{description}</p><button onClick={() => setSelected([title, description])} className="mt-6 rounded-2xl border border-[#d8b76f]/35 bg-[#d8b76f]/10 px-4 py-3 text-sm font-black text-[#f4d993]">상세 보기</button></Card>)}</section></main>{selected && <div className="fixed inset-0 z-[80] overflow-y-auto bg-black/72 px-4 py-8 backdrop-blur-md" onClick={() => setSelected(null)}><div className="mx-auto mt-16 max-w-2xl rounded-3xl border border-[#d8b76f]/25 bg-[#05070b] p-7 shadow-[0_0_100px_rgba(216,183,111,0.18)]" onClick={(event) => event.stopPropagation()}><Badge>INCIDENT INTELLIGENCE</Badge><h2 className="mt-5 text-3xl font-black text-[#fff8e6]">{selected[0]}</h2><p className="mt-5 text-base leading-8 text-[#cfc6ad]/82">{selected[1]}</p><p className="mt-5 rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm leading-7 text-[#9e9176]">현재 배포판은 외부 공유 가능한 안정 버전입니다. 원문 전체 로그는 추후 별도 데이터 파일로 다시 연결할 수 있습니다.</p><button onClick={() => setSelected(null)} className="mt-7 rounded-2xl bg-[#d8b76f] px-5 py-3 text-sm font-black text-[#15100a]">닫기</button></div></div>}</Shell>;
}

export default function App() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => { const onPop = () => setPath(window.location.pathname); window.addEventListener("popstate", onPop); return () => window.removeEventListener("popstate", onPop); }, []);
  if (path === "/systems/voice-ledger") return <VoiceLedgerPage />;
  if (path === "/archive") return <ArchivePage />;
  return <HomePage />;
}
