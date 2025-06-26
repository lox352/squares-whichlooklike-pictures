import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getStitches } from "../helpers/stitches";
import { Stitch } from "../types/Stitch";
import { defaultStitchesPerRow } from "../constants";

const h1Style = {
  fontSize: "2.5rem",
  marginBottom: "10px",
};

const h2Style = {
  fontSize: "1.5rem",
  marginTop: "5px",
  marginBottom: "5px",
};

interface InputFieldProps {
  label: string;
  value: number;
  valueSetter: React.Dispatch<React.SetStateAction<number>>;
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  value,
  valueSetter,
}) => (
  <div style={{ marginBottom: "15px" }}>
    <label>
      {label}
      <br />
      <input
        type="number"
        value={value === 0 ? "" : value}
        onChange={(e) => valueSetter(Number(e.target.value))}
      />
    </label>
  </div>
);

interface PatternProps {
  setStitches: React.Dispatch<React.SetStateAction<Stitch[]>>;
}

const Design: React.FC<PatternProps> = ({ setStitches }) => {
  const navigate = useNavigate();

  const [stitchesPerRow, setStitchesPerRow] = useState(defaultStitchesPerRow);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);

  const handleViewAndColour = async () => {
    if (!uploadedImage) {
      alert("Please upload an image to proceed.");
      return;
    }
    
    setStitches(await getStitches(stitchesPerRow, uploadedImage));
    navigate("/render");
  };

  return (
    <div style={{ textAlign: "left", padding: "20px" }}>
      <h1 style={h1Style}>Design</h1>
      <h2 style={h2Style}>Set Up Your Stitches</h2>
      <InputField
        label="Stitches per row"
        value={stitchesPerRow}
        valueSetter={setStitchesPerRow}
      />

      <div style={{ marginBottom: "15px" }}>
        <label>
          Upload Image
          <br />
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              setUploadedImage(file || null);
            }}
            style={{ marginTop: "5px" }}
          />
        </label>
      </div>

      <button
        style={{
          backgroundColor: "#3f51b5",
          color: "white",
          padding: "10px 20px",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
        onClick={handleViewAndColour}
      >
        Knit and Dye
      </button>
    </div>
  );
};

export default Design;
