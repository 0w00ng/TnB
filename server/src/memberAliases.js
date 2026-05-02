import dayjs from "dayjs";
import { getDb } from "./db.js";

export const memberAliasEntries = [
  ["Senior_Manager", "김준범"],
  ["People_Manager", "조윤성"],
  ["choyoonseong_kr1", "조윤성"],
  ["Contact_Specialist", "이병하"],
  ["China_Poop", "남궁홍주"],
  ["Project_Manager", "김영웅"],
  ["븅신스캇게이페도충", "권우철"],
  ["Game_Manager", "김지헌"],
  ["jaesoo", "조성범"],
];

const memberAliasMap = new Map(memberAliasEntries);

function getNameCandidates(member) {
  return [
    member?.displayName,
    member?.nickname,
    member?.user?.globalName,
    member?.user?.username,
  ].filter(Boolean);
}

export function resolveMemberAlias(member) {
  for (const candidate of getNameCandidates(member)) {
    const alias = memberAliasMap.get(candidate);

    if (alias) {
      return alias;
    }
  }

  return null;
}

export function syncMemberAlias(member) {
  const alias = resolveMemberAlias(member);
  const userId = member?.user?.id;

  if (!alias || !userId) {
    return null;
  }

  getDb()
    .prepare(
      `
        INSERT INTO member_aliases (user_id, display_name, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          display_name = excluded.display_name,
          updated_at = excluded.updated_at
      `,
    )
    .run(userId, alias, dayjs().toISOString());

  return alias;
}
