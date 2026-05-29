import MapWrapper from "./components/MapWrapper";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0d0f14] text-white flex flex-col">
      {/* Hero */}
      <header className="px-8 pt-16 pb-10 max-w-5xl mx-auto w-full">
        <p className="text-xs font-semibold tracking-[0.2em] uppercase text-pink-400 mb-4">
          Lost &amp; Found
        </p>
        <h1 className="text-5xl sm:text-6xl font-bold leading-tight tracking-tight mb-5">
          Where did you{" "}
          <span className="italic text-pink-400">last leave it?</span>
        </h1>
        <p className="text-lg text-gray-400 max-w-xl leading-relaxed">
          Drop a pin the moment you set something down — keys, suitcase, sunglasses.
          Find it instantly when it matters most.
        </p>
      </header>

      {/* Map */}
      <main className="flex-1 px-8 pb-16 max-w-5xl mx-auto w-full">
        <div className="w-full h-[560px] rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-2xl">
          <MapWrapper />
        </div>
      </main>
    </div>
  );
}
