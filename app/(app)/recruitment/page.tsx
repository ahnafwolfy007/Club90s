import { ReferForm } from "@/components/recruitment/refer-form";

export default function RecruitmentPage() {
  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <h1 className="text-lg font-semibold">Recruitment</h1>
      <ReferForm />
    </div>
  );
}
