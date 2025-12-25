"use client";

import { useRecommendations } from "../contexts/RecommendationsContext";
import ProductPreview from "./ProductPreview";

export default function VoiceWidget() {
  const { recommendations, isActive, clearRecommendations } = useRecommendations();

  return (
    <>
      {/* ElevenLabs Voice Widget */}
      <div className="fixed bottom-4 right-4 z-50">
        <elevenlabs-convai agent-id="agent_3601kcyj2dvbfg081bw4yw2h7gdp"></elevenlabs-convai>
      </div>

      {/* Recommendations Display - Shows ProductPreview cards when active */}
      {isActive && recommendations.length > 0 && (
        <div className="fixed bottom-24 right-4 z-40 w-80 max-h-[60vh] overflow-y-auto bg-white rounded-lg shadow-2xl border-2 border-black p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-black">Recommended for You</h3>
            <button
              onClick={clearRecommendations}
              className="text-gray-500 hover:text-black text-xl"
              aria-label="Close recommendations"
            >
              ×
            </button>
          </div>
          <div className="space-y-3">
            {recommendations.map((product) => (
              <ProductPreview key={product.productId} product={product} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

