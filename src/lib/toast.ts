import { toast } from "sonner";

/** ブランドカラー(緑背景・白文字)固定の成功トースト */
export function showSuccessToast(message: string) {
  toast.success(message, {
    position: "top-right",
    style: { background: "#386b43", color: "#fff", border: "none" },
  });
}

/** エラー用トースト (右上・赤) */
export function showErrorToast(message: string) {
  toast.error(message, {
    position: "top-right",
    style: { background: "#b91c1c", color: "#fff", border: "none" },
  });
}
