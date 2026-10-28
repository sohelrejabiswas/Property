export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 text-center">
      <div>
        <p className="text-5xl" aria-hidden>🏞</p>
        <h1 className="mt-3 text-2xl font-bold">This listing is not available</h1>
        <p className="mt-2 text-stone-600">It may have been removed or is not published.</p>
      </div>
    </main>
  );
}
