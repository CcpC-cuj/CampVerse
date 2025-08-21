import * as React from "react";
import CircularProgress from "@mui/material/CircularProgress";

export default function GradientCircularProgress({ size = 60, thickness = 2 }) {
  return (
    <React.Fragment>
      {/* Hidden SVG gradient definition */}
      <svg width={0} height={0}>
        <defs>
          <linearGradient id="my_gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#e01cd5" />
            <stop offset="100%" stopColor="#1CB5E0" />
          </linearGradient>
        </defs>
      </svg>

      {/* Loader with gradient stroke */}
      <CircularProgress
        size={size}
        thickness={thickness}
        sx={{
          "svg circle": { stroke: "url(#my_gradient)" },
        }}
      />
    </React.Fragment>
  );
}
