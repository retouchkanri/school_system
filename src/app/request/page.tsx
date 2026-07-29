import SiteHeader from "@/components/site-header";
import FullPageBackground from "@/components/full-page-background";
import { KOUTOU_IMAGES } from "@/lib/site-images";
import RequestForm from "./request-form";

export default function RequestPage() {
  return (
    <div className="min-h-screen">
      <FullPageBackground src={KOUTOU_IMAGES.horseClose.src} alt={KOUTOU_IMAGES.horseClose.alt} tone="neutral" />
      <SiteHeader />
      <RequestForm />
    </div>
  );
}
