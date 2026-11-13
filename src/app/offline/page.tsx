import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "بلا إنترنت" };

/** Service-worker fallback for pages that were never cached. */
export default function OfflinePage() {
  return (
    <div className="grid min-h-[70dvh] place-items-center">
      <EmptyState
        emoji="📡"
        title="هذه الصفحة غير متوفرة بلا إنترنت"
        action={
          <Link href="/" className="btn btn-primary rounded-full">
            إلى الاقتراحات
          </Link>
        }
      >
        مطبخك ووصفاتك واقتراحاتك تعمل كلها بلا اتصال. عُد إلى الصفحة الرئيسية وتابع الطبخ.
      </EmptyState>
    </div>
  );
}
