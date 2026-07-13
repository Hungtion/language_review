"use client";

import { useEffect, useState, useCallback } from "react";

type ToastData = { message: string; type?: "success" | "error" | "info" };

let showToastFn: ((data: ToastData) => void) | null = null;

export function toast(message: string, type: ToastData["type"] = "info") {
  showToastFn?.({ message, type });
}

export default function ToastContainer() {
  const [item, setItem] = useState<ToastData | null>(null);
  const [visible, setVisible] = useState(false);

  const show = useCallback((data: ToastData) => {
    setItem(data);
    setVisible(true);
  }, []);

  useEffect(() => {
    showToastFn = show;
    return () => { showToastFn = null; };
  }, [show]);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => setVisible(false), 3500);
    return () => clearTimeout(timer);
  }, [visible, item]);

  if (!item) return null;

  const bg =
    item.type === "success" ? "bg-green-600" :
    item.type === "error" ? "bg-red-600" :
    "bg-bg-card border border-border";

  const text =
    item.type === "success" || item.type === "error" ? "text-white" : "text-text";

  return (
    <div
      className={`fixed top-16 left-1/2 -translate-x-1/2 z-[9990] px-5 py-3 rounded-xl shadow-lg text-sm font-medium transition-all duration-300 max-w-[90vw] ${bg} ${text} ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"
      }`}
      onClick={() => setVisible(false)}
    >
      {item.message}
    </div>
  );
}
