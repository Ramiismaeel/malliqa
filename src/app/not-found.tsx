import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";

export default function NotFound() {
  return (
    <div className="grid min-h-[70dvh] place-items-center">
      <EmptyState
        emoji="🍽️"
        title="الصحن فارغ"
        action={
          <Link href="/" className="btn btn-primary rounded-full">
            إلى الاقتراحات
          </Link>
        }
      >
        لم نجد هذه الصفحة.
      </EmptyState>
    </div>
  );
}
