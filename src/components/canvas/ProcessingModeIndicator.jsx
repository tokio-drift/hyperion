import React from "react";
import Tooltip from "../shared/Tooltip";

const MODE_UI = {
  gpu: {
    label: "GPU",
    className: "text-emerald-300 border-emerald-500/40 bg-emerald-500/10",
    dotClassName: "bg-emerald-400",
    tooltip: "Using GPU based acceleration for better performance.",
  },
  cpu: {
    label: "CPU",
    className: "text-amber-300 border-amber-500/40 bg-amber-500/10",
    dotClassName: "bg-amber-400",
    tooltip: "GPU not detected or unavailable - relying on CPU.",
  },
};

export default function ProcessingModeIndicator({ mode = "cpu" }) {
  const ui = MODE_UI[mode] || MODE_UI.cpu;

  return (
    <Tooltip
      side="left"
      content={ui.tooltip}
      delay={250}
    >
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-semibold tracking-wider uppercase backdrop-blur-sm ${ui.className}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${ui.dotClassName}`} />
        {ui.label}
      </span>
    </Tooltip>
  );
}
