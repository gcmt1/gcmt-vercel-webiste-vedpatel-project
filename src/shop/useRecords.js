import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
export function useRecords(table, owner, orderBy = "created_at") {
  const [state, setState] = useState({}),
    [rev, bump] = useState(0);
  const key = JSON.stringify([table, owner, rev, orderBy]);
  useEffect(() => {
    let active = true;
    let q = supabase
      .from(table)
      .select("*")
      .order(orderBy, { ascending: false });
    if (owner) q = q.eq("user_id", owner);
    Promise.resolve(q)
      .then(({ data, error }) => {
        if (active) setState({ key, data, error });
      })
      .catch((error) => {
        if (active) setState({ key, error });
      });
    return () => {
      active = false;
    };
  }, [key, table, owner, orderBy]);
  return {
    ...(state.key === key ? state : {}),
    refresh: () => bump((n) => n + 1),
  };
}
