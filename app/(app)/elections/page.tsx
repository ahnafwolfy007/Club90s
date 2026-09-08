import { ElectionList } from "@/components/elections/election-list";

export default function ElectionsPage() {
  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <h1 className="text-lg font-semibold">Elections</h1>
      <ElectionList />
    </div>
  );
}
