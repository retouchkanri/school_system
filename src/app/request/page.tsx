import SiteHeader from "@/components/site-header";
import RequestForm from "./request-form";

export default function RequestPage() {
  return (
    <div className="min-h-screen bg-brand-50/40">
      <SiteHeader />
      <RequestForm />
    </div>
  );
}
