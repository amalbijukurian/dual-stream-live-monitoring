import Link from "next/link";

export default function HomePage() {
  return (
    <main className="h-screen flex flex-col items-center justify-center gap-6">
      <h1 className="text-4xl font-bold">
        Dual Stream Live Monitor
      </h1>

      <div className="flex gap-4">
        <Link
          href="/client"
          className="home-link client"
        >
          Open Client
        </Link>

        <Link
          href="/admin"
          className="home-link admin"
        >
          Open Admin
        </Link>
      </div>
    </main>
  );
}
