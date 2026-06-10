"use client";

import { useEffect } from "react";

export function MarkReportsAsRead() {
  useEffect(() => {
    fetch("/api/customer/read-reports", { method: "POST" }).catch(() => {});
  }, []);
  return null;
}
