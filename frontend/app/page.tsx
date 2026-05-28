import Link from "next/link";

export default function HomePage() {
  return (
    <main className="h-screen flex flex-col items-center justify-center gap-6">
      <h1 className="text-4xl font-bold">
        Dual Stream Live Monitor
      </h1>

      <div className="flex gap-4">
        <Link
          href="/sender"
          className="bg-blue-500 text-white px-6 py-3 rounded-lg"
        >
          Open Sender
        </Link>

        <Link
          href="/viewer"
          className="bg-green-500 text-white px-6 py-3 rounded-lg"
        >
          Open Viewer
        </Link>
      </div>
    </main>
  );
}