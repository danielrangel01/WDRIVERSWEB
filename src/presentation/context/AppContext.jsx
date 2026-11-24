import { createContext, useContext } from "react";

// Contexto que expone los casos de uso a toda la app.
// Esto es el "contenedor de inyección de dependencias" del frontend.
export const AppContext = createContext(null);

export function AppProvider({ useCases, children }) {
  return <AppContext.Provider value={useCases}>{children}</AppContext.Provider>;
}

export function useUseCases() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useUseCases debe usarse dentro de AppProvider");
  return ctx;
}
