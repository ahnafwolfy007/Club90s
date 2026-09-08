import { ElectionList } from "@/components/elections/election-list";

export default function ElectionsPage() {
  return (
    <div className="fade-up flex flex-col gap-4 px-4 py-4">
      <h1 className="gold-gradient font-display text-xl font-semibold tracking-wide">Elections</h1>
      <ElectionList />
    </div>
  );
}
