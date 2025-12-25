"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { Product } from "../types/products";

interface RecommendationsContextType {
  recommendations: Product[];
  setRecommendations: (products: Product[]) => void;
  clearRecommendations: () => void;
  isActive: boolean;
  setIsActive: (active: boolean) => void;
}

const RecommendationsContext = createContext<RecommendationsContextType | undefined>(undefined);

export function RecommendationsProvider({ children }: { children: ReactNode }) {
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [isActive, setIsActive] = useState(false);

  const clearRecommendations = () => {
    setRecommendations([]);
    setIsActive(false);
  };

  return (
    <RecommendationsContext.Provider
      value={{
        recommendations,
        setRecommendations,
        clearRecommendations,
        isActive,
        setIsActive,
      }}
    >
      {children}
    </RecommendationsContext.Provider>
  );
}

export function useRecommendations() {
  const context = useContext(RecommendationsContext);
  if (context === undefined) {
    throw new Error("useRecommendations must be used within a RecommendationsProvider");
  }
  return context;
}

