import React, { useEffect } from "react";
import ChainModel from "../ChainModel/ChainModel";
import { Stitch } from "../types/Stitch";
import { useNavigate } from "react-router-dom";

interface RenderProps {
  stitches: Stitch[];
  setStitches: React.Dispatch<React.SetStateAction<Stitch[]>>;
}

const Render: React.FC<RenderProps> = ({
  stitches,
  setStitches,
}) => {
  const [anyStichRendered, setAnyStitchRendered] = React.useState(false);
  const [simulationActive, setSimulationActive] = React.useState(false);
  const [simulationCompleted, setSimulationCompleted] = React.useState(false);
  const [patternGenerating, setPatternGenerating] = React.useState(false);
  const simulationRunCount = React.useRef(0);

  React.useEffect(() => {
    if (simulationActive) {
      simulationRunCount.current += 1;
    }

    if (simulationRunCount.current === 1 && !simulationActive) {
      setSimulationCompleted(true);
    }
  }, [simulationActive]);

  const navigate = useNavigate();

  const generatePattern = () => {
    setPatternGenerating(true);
  };

  React.useEffect(() => {
    if (patternGenerating) {
      navigate("/pattern");
    }
  }, [navigate, patternGenerating]);

  useEffect(() => {
    if (stitches.length === 0) {
      navigate("/");
    }
  }, [stitches, navigate]);

  const thereAreStitches = stitches.length > 0;
  if (!thereAreStitches) {
    return null;
  }

  return (
    <div style={{ textAlign: "left", padding: "20px" }}>
      <h1 style={{ fontSize: "2.5rem", marginBottom: "20px" }}>
        Dying Your Square
      </h1>
      <div style={{ height: "350px" }}>
        <ChainModel
          stitches={stitches}
          setStitches={setStitches}
          simulationActive={simulationActive}
          setSimulationActive={setSimulationActive}
          onAnyStitchRendered={() => {
            setAnyStitchRendered(true);
          }}
        />
      </div>
      <i>
        {!anyStichRendered
          ? "Summoning stitches..."
          : !simulationCompleted
          ? "Letting stitches settle..."
          : "Pinch and zoom to see the pattern in more detail"}
      </i>
      {simulationCompleted && (
        <div style={{ marginTop: "10px" }}>
          <button
            style={{
              backgroundColor: "#3f51b5",
              color: "white",
              padding: "10px 20px",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
            disabled={simulationActive}
            onClick={generatePattern}
          >
            {patternGenerating ? "Generating pattern..." : "Generate Pattern"}
          </button>
        </div>
      )}
    </div>
  );
};

export default Render;
