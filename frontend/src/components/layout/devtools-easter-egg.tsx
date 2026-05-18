"use client";
import { useEffect } from "react";

export function DevToolsEasterEgg() {
  useEffect(() => {
    const THRESHOLD = 160;
    let wasOpen = false;
    let closeTimer: ReturnType<typeof setTimeout> | null = null;

    function onOpen() {
      console.log(
        "%c🚀 miniERP Electronic",
        "color:#FEA837;font-size:22px;font-weight:bold;",
      );
      console.log(
        "%cWeb này được phát triển bởi một nhóm gồm 3 thành viên:\n\n  • Nguyễn Thanh Hiệu\n  • Trần Phú Thiện\n  • Lâm Bội Sanh\n",
        "color:#432D51;font-size:14px;line-height:2;",
      );
      closeTimer = setTimeout(() => {
        window.location.reload();
      }, 60_000);
    }

    function onClose() {
      if (closeTimer !== null) {
        clearTimeout(closeTimer);
        closeTimer = null;
      }
    }

    const id = setInterval(() => {
      const open =
        window.outerWidth - window.innerWidth > THRESHOLD ||
        window.outerHeight - window.innerHeight > THRESHOLD;

      if (open && !wasOpen) {
        wasOpen = true;
        onOpen();
      } else if (!open && wasOpen) {
        wasOpen = false;
        onClose();
      }
    }, 500);

    return () => {
      clearInterval(id);
      if (closeTimer !== null) clearTimeout(closeTimer);
    };
  }, []);

  return null;
}
