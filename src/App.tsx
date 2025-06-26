import "./App.css";
import { HashRouter as Router, Route, Routes } from "react-router-dom";
import Home from "./components/Home";
import Design from "./components/Design";
import Render from "./components/Render";
import { useState } from "react";
import { Stitch } from "./types/Stitch";
import Pattern from "./components/Pattern";
import SavedPattern from "./components/SavedPattern";
import SavedRender from "./components/SavedRender";

function App() {
  const [stitches, setStitches] = useState<Stitch[]>([]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/design"
          element={
            <Design
              setStitches={setStitches}
            />
          }
        />
        <Route
          path="/render"
          element={
            <Render
              stitches={stitches}
              setStitches={setStitches}
            />
          }
        />
        <Route path="/render/:patternId" element={<SavedRender />} />
        <Route path="/pattern" element={<Pattern stitches={stitches} />} />
        <Route path="/pattern/:patternId" element={<SavedPattern />} />
      </Routes>
    </Router>
  );
}

export default App;
