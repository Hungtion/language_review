import { useState, useEffect, useRef } from "react";

type Status = "idle" | "uploading" | "done";

let _status: Status = "idle";
let _fileName = "";
let _notesBadge = false;

export function setUploadStatus(status: Status, fileName = "") {
  _status = status;
  _fileName = fileName;
  if (status === "done") _notesBadge = true;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("upload-status-change"));
  }
}

export function clearNotesBadge() {
  _notesBadge = false;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("upload-status-change"));
  }
}

export function useUploadStatus() {
  const [state, setState] = useState({ status: _status, fileName: _fileName, notesBadge: _notesBadge });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = () => {
      setState({ status: _status, fileName: _fileName, notesBadge: _notesBadge });
      // Auto-clear add icon "done" after 3 seconds (notes badge stays)
      if (_status === "done") {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          _status = "idle";
          _fileName = "";
          window.dispatchEvent(new CustomEvent("upload-status-change"));
        }, 3000);
      }
    };
    window.addEventListener("upload-status-change", handler);
    return () => {
      window.removeEventListener("upload-status-change", handler);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return state;
}
