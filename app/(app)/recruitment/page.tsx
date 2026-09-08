import { ReferForm } from "@/components/recruitment/refer-form";

export default function RecruitmentPage() {
  return (
    <div className="fade-up flex flex-col gap-4 px-4 py-4">
      <h1 className="gold-gradient font-display text-xl font-semibold tracking-wide">Recruitment</h1>
      <ReferForm />
    </div>
  );
}
