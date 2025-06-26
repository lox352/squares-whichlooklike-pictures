import KnittingMachine from "../types/KnittingMachine";
import { Point } from "../types/Point";
import { adjacentStitchDistance } from "../constants";
import { Stitch } from "../types/Stitch";

const generateLine =
  (numPoints: number) =>
  (point: number): Point => {
    return {
      x: 0,
      z: (point - (numPoints - 1) / 2) * adjacentStitchDistance,
      y: 0,
    };
  };

const getNumberOfRows = (
  uploadedImage: File,
  stitchesPerRow: number
): Promise<number> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const aspectRatio = img.height / img.width;
      const numberOfRows = Math.ceil(stitchesPerRow * aspectRatio);
      resolve(numberOfRows);
    };
    img.src = URL.createObjectURL(uploadedImage);
  });
};

const colourStitches = async (stitches: Stitch[], stitchesPerRow: number, uploadedImage: File): Promise<void> => {
  const numRows = await getNumberOfRows(uploadedImage, stitchesPerRow);

  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(img, 0, 0, img.width, img.height);

    // Collect all colors from the entire image first
    const allColors: [number, number, number][] = [];
    for (let rowIdx = 0; rowIdx < numRows; rowIdx++) {
      for (let colIdx = 0; colIdx < stitchesPerRow; colIdx++) {
        let col = colIdx;
        // Reverse column order on every other row for ox-plough pattern
        if ((numRows - 1 - rowIdx) % 2 === 1) {
          col = stitchesPerRow - 1 - colIdx;
        }

        // Map stitch grid to image coordinates
        const x = Math.floor((col / (stitchesPerRow - 1)) * (img.width - 1));
        const y = Math.floor(((numRows - 1 - rowIdx) / (numRows - 1)) * (img.height - 1));

        const pixel = ctx.getImageData(x, y, 1, 1).data;
        const color: [number, number, number] = [pixel[0], pixel[1], pixel[2]];
        allColors.push(color);
      }
    }

    // Find the 6 most dominant colors across the entire image
    const rawGlobalPalette = findDominantColors(allColors, 2);
    const globalPalette = mergeSimilarColors(rawGlobalPalette.reverse(), 60);

    let previousRowPalette: [number, number, number][] = [];

    // Process each row
    for (let rowIdx = 0; rowIdx < numRows; rowIdx++) {
      const rowStitches: Stitch[] = [];
      const rowColors: [number, number, number][] = [];

      // Collect all stitches and their colors for this row
      for (let colIdx = 0; colIdx < stitchesPerRow; colIdx++) {
        const stitchIdx = rowIdx * stitchesPerRow + colIdx;
        const stitch = stitches[stitchIdx];
        
        let col = colIdx;
        // Reverse column order on every other row for ox-plough pattern
        if ((numRows - 1 - rowIdx) % 2 === 1) {
          col = stitchesPerRow - 1 - colIdx;
        }

        // Map stitch grid to image coordinates
        const x = Math.floor((col / (stitchesPerRow - 1)) * (img.width - 1));
        const y = Math.floor(((numRows - 1 - rowIdx) / (numRows - 1)) * (img.height - 1));

        const pixel = ctx.getImageData(x, y, 1, 1).data;
        const color: [number, number, number] = [pixel[0], pixel[1], pixel[2]];
        
        rowStitches.push(stitch);
        rowColors.push(color);
      }

      // Find colors for this row while respecting the constraint
      let rowPalette: [number, number, number][];
      
      if (rowIdx === 0) {
        // First row: find the 3 most dominant colors from global palette
        const rowPaletteColors = rowColors.map(color => findNearestColor(color, globalPalette));
        rowPalette = findDominantColors(rowPaletteColors, 3);
      } else {
        // Subsequent rows: ensure at most one change from previous row
        rowPalette = findConstrainedRowPalette(rowColors, globalPalette, previousRowPalette);
      }

      // Assign colors from the row palette
      rowStitches.forEach((stitch, idx) => {
        const color = rowColors[idx];
        stitch.colour = findNearestColor(color, rowPalette);
      });

      previousRowPalette = rowPalette;
    }
  };
  img.src = URL.createObjectURL(uploadedImage);
};

const findConstrainedRowPalette = (
  rowColors: [number, number, number][], 
  globalPalette: [number, number, number][], 
  previousPalette: [number, number, number][]
): [number, number, number][] => {
  // Get the most needed colors for this row from global palette
  const mappedColors = rowColors.map(color => findNearestColor(color, globalPalette));
  const dominantColors = findDominantColors(mappedColors, 6); // Get more candidates
  
  // Generate possible palettes with at most one change
  const candidatePalettes: [number, number, number][][] = [];
  
  // Option 1: Keep previous palette (only removals allowed)
  candidatePalettes.push([...previousPalette]);
  
  // Option 2: Keep all but one color from previous palette, add one new color
  for (let i = 0; i < previousPalette.length; i++) {
    for (const newColor of dominantColors) {
      if (!previousPalette.some(prevColor => colorDistance(prevColor, newColor) < 10)) {
        const newPalette = [...previousPalette];
        newPalette[i] = newColor;
        candidatePalettes.push(newPalette);
      }
    }
  }
  
  // Option 3: Add one new color to previous palette (if less than 3 colors)
  if (previousPalette.length < 3) {
    for (const newColor of dominantColors) {
      if (!previousPalette.some(prevColor => colorDistance(prevColor, newColor) < 10)) {
        candidatePalettes.push([...previousPalette, newColor]);
      }
    }
  }
  
  // Find the best palette based on color representation quality
  let bestPalette = previousPalette;
  let bestScore = calculatePaletteScore(rowColors, previousPalette);
  
  for (const palette of candidatePalettes) {
    const score = calculatePaletteScore(rowColors, palette);
    if (score < bestScore) {
      bestScore = score;
      bestPalette = palette;
    }
  }
  
  return bestPalette;
};

const calculatePaletteScore = (colors: [number, number, number][], palette: [number, number, number][]): number => {
  return colors.reduce((totalError, color) => {
    const nearestColor = findNearestColor(color, palette);
    return totalError + colorDistance(color, nearestColor);
  }, 0);
};

const mergeSimilarColors = (colors: [number, number, number][], threshold: number): [number, number, number][] => {
  const merged: [number, number, number][] = [];
  const used = new Set<number>();

  for (let i = 0; i < colors.length; i++) {
    if (used.has(i)) continue;

    const similarColors: [number, number, number][] = [colors[i]];
    used.add(i);

    for (let j = i + 1; j < colors.length; j++) {
      if (used.has(j)) continue;
      
      if (colorDistance(colors[i], colors[j]) <= threshold) {
        similarColors.push(colors[j]);
        used.add(j);
      }
    }

    merged.push(averageColor(similarColors));
  }

  return merged;
};

const findDominantColors = (colors: [number, number, number][], k: number): [number, number, number][] => {
  if (colors.length <= k) return colors;

  // Initialize centroids with evenly spaced colors
  const centroids: [number, number, number][] = [];
  for (let i = 0; i < k; i++) {
    centroids.push(colors[Math.floor((i * colors.length) / k)]);
  }

  for (let iter = 0; iter < 20; iter++) {
    const clusters: [number, number, number][][] = Array(k).fill(null).map(() => []);

    colors.forEach(color => {
      let minDistance = colorDistance(color, centroids[0]);
      let closestCluster = 0;

      for (let i = 1; i < k; i++) {
        const distance = colorDistance(color, centroids[i]);
        if (distance < minDistance) {
          minDistance = distance;
          closestCluster = i;
        }
      }

      clusters[closestCluster].push(color);
    });

    let converged = true;
    for (let i = 0; i < k; i++) {
      if (clusters[i].length === 0) clusters[i].push(centroids[i]);
      
      const newCentroid = averageColor(clusters[i]);
      if (colorDistance(centroids[i], newCentroid) > 1) {
        converged = false;
      }
      centroids[i] = newCentroid;
    }

    if (converged) break;
  }

  return centroids;
};

const colorDistance = (color1: [number, number, number], color2: [number, number, number]): number => {
  return Math.sqrt(
    Math.pow(color1[0] - color2[0], 2) +
    Math.pow(color1[1] - color2[1], 2) +
    Math.pow(color1[2] - color2[2], 2)
  );
};

const averageColor = (colors: [number, number, number][]): [number, number, number] => {
  const sum = colors.reduce((acc, color) => [acc[0] + color[0], acc[1] + color[1], acc[2] + color[2]], [0, 0, 0]);
  return [
    Math.round(sum[0] / colors.length),
    Math.round(sum[1] / colors.length),
    Math.round(sum[2] / colors.length)
  ];
};

const findNearestColor = (color: [number, number, number], palette: [number, number, number][]): [number, number, number] => {
  let nearestColor = palette[0];
  let minDistance = colorDistance(color, palette[0]);

  for (let i = 1; i < palette.length; i++) {
    const distance = colorDistance(color, palette[i]);
    if (distance < minDistance) {
      minDistance = distance;
      nearestColor = palette[i];
    }
  }

  return nearestColor;
};

const getStitches = async (
  stitchesPerRow: number,
  uploadedImage: File
): Promise<Stitch[]> => {
  const knittingMachine = new KnittingMachine(stitchesPerRow);
  knittingMachine.castOnRow(generateLine(stitchesPerRow));
  const numberOfRows = await getNumberOfRows(uploadedImage, stitchesPerRow);

  for (let i = 1; i < numberOfRows; i++) {
    knittingMachine.knitRow(["k1"]);
  }

  await colourStitches(knittingMachine.stitches, stitchesPerRow, uploadedImage);

  return knittingMachine.stitches;
};

export { getStitches };
