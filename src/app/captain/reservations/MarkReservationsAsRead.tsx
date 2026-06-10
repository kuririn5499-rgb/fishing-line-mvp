"use client";

import { useEffect } from "react";

export function MarkReservationsAsRead() {
  useEffect(() => {
    fetch("/api/captain/read-reservations", { method: "POST" }).catch(() => {});
  }, []);
  return null;
}
