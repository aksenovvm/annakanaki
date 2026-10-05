"use client";

import { createContext, useContext } from "react";
import type { Barber, Service } from "@barbershop/shared";

/** Услуги и барберы, загруженные из API, — доступны любому шагу формы */
export type Catalog = { services: Service[]; barbers: Barber[] };

const CatalogContext = createContext<Catalog | null>(null);

export function CatalogProvider({ catalog, children }: { catalog: Catalog; children: React.ReactNode }) {
  return <CatalogContext.Provider value={catalog}>{children}</CatalogContext.Provider>;
}

export function useCatalog(): Catalog {
  const catalog = useContext(CatalogContext);
  if (!catalog) throw new Error("useCatalog нужно использовать внутри CatalogProvider");
  return catalog;
}
