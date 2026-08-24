import { BrowserRouter, Route, Routes, } from "react-router-dom";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <div className="p-8">
              <h1 className="text-4xl font-bold">LLM Chess Arena</h1>
              <p className="mt-4 text-lg text-gray-600">Loading...</p>
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
