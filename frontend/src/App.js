import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import CommandCenter from "./pages/CommandCenter";
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/command-center" element={<CommandCenter />} />
      </Routes>
    </BrowserRouter>
  );
}
