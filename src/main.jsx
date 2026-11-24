import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { AppProvider } from "./presentation/context/AppContext.jsx";
import { makeUseCases } from "./application/use-cases/index.js";
import { HttpFleetRepository } from "./infrastructure/api/HttpFleetRepository.js";

// Composición de dependencias (composition root):
// se elige la implementación concreta del repositorio y se construyen los casos de uso.
const repository = new HttpFleetRepository();
const useCases = makeUseCases(repository);

const style = document.createElement("style");
style.textContent = `
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeInUp { from { opacity: 0; transform: translateY(-16px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-10px)} 40%{transform:translateX(10px)} 60%{transform:translateX(-8px)} 80%{transform:translateX(8px)} }
  * { box-sizing: border-box; }
  body { margin: 0; background: #0B0B0D; }
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-thumb { background: #2A2A30; border-radius: 3px; }
  input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.7) sepia(1) saturate(3) hue-rotate(5deg); }
`;
document.head.appendChild(style);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppProvider useCases={useCases}>
      <App />
    </AppProvider>
  </React.StrictMode>
);
