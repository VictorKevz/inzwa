"use client";

export default function MarketingPage() {
  const getDefaultUrl = (defaultPort: number, envVar?: string) => {
    if (envVar) return envVar;
    if (
      typeof window !== "undefined" &&
      window.location.hostname === "localhost"
    ) {
      return `http://localhost:${defaultPort}`;
    }
    return "#";
  };

  const demoStoreUrl = getDefaultUrl(
    3001,
    process.env.NEXT_PUBLIC_DEMO_STORE_URL
  );
  const dashboardUrl = getDefaultUrl(
    3002,
    process.env.NEXT_PUBLIC_DASHBOARD_URL
  );

  const handleCTAClick = (url: string, label: string) => {
    if (url !== "#") {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      alert(
        `${label} URL not configured. Set NEXT_PUBLIC_DEMO_STORE_URL or NEXT_PUBLIC_DASHBOARD_URL environment variable.`
      );
    }
  };

  return (
    <>
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-linear-to-br from-black to-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6">
              Inzwa
            </h1>
            <p className="text-xl sm:text-2xl text-gray-300 mb-4 max-w-3xl mx-auto">
              Voice-Driven Intent Intelligence
            </p>
            <p className="text-lg text-gray-400 mb-12 max-w-2xl mx-auto">
              Turn customer conversations into structured business insights with
              AI-powered voice analysis
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={() => handleCTAClick(demoStoreUrl, "Demo Store")}
                className="bg-white text-black px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-colors shadow-lg"
              >
                View Demo Store
              </button>
              <button
                onClick={() => handleCTAClick(dashboardUrl, "Dashboard")}
                className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white hover:text-black transition-colors"
              >
                View Dashboard
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
