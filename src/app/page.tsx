import { UsageStats } from "@/components/UsageStats";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-2xl font-bold text-gray-900">
          Fidant.AI Usage Analytics
        </h1>
        <UsageStats />
      </div>
    </main>
  );
}
