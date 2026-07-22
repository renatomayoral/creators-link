export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 px-6">
      <h1 className="text-3xl font-bold tracking-tight">Splitfy</h1>
      <p className="text-neutral-400">
        Recurring crypto subscription infrastructure with automatic payment splits. This is the
        service backend — merchants integrate via the REST API at <code>/api/v1</code>.
      </p>
    </main>
  )
}
