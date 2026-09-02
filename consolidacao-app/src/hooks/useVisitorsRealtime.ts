import { useEffect } from "react";

import { supabase } from "../lib/supabase";

type UseVisitorsRealtimeOptions = {
  onChange: () => void;
};

export function useVisitorsRealtime({
  onChange,
}: UseVisitorsRealtimeOptions) {
  useEffect(() => {
    const channel = supabase
      .channel("visitors-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "visitors",
        },
        () => {
          onChange();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [onChange]);
}