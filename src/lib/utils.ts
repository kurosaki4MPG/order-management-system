import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// Tailwind のクラス衝突を解消しつつ、条件付きクラスを素直に結合する。
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
