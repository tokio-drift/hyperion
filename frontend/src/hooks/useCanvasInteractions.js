import { useCallback, useMemo, useRef, useState } from "react";

export function useCanvasInteractions({
  activeCrop,
  activeImage,
  getTransform,
  containerRef,
  dispatch,
  pan,
  setPan,
  setZoom,
}) {
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef(null);
  const [cropDrag, setCropDrag] = useState(null);

  const handleWheel = useCallback((e) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    setZoom((z) => Math.max(0.05, Math.min(10, z * (e.deltaY > 0 ? 0.9 : 1.1))));
  }, [setZoom]);

  const handleMouseDown = useCallback(
    (e) => {
      const transform = getTransform();
      if (!transform) return;

      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        e.preventDefault();
        setIsPanning(true);
        panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
        return;
      }

      if (e.button === 0 && activeCrop?.active) {
        const rect = containerRef.current.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        const { cssScale, css_ox, css_oy } = transform;

        const cx = css_ox + activeCrop.x * cssScale;
        const cy = css_oy + activeCrop.y * cssScale;
        const cw = activeCrop.width * cssScale;
        const ch = activeCrop.height * cssScale;

        const hitZone = 12;

        let handle = null;
        if (Math.abs(mx - cx) < hitZone && Math.abs(my - cy) < hitZone) {
          handle = "nw";
        } else if (Math.abs(mx - (cx + cw)) < hitZone && Math.abs(my - cy) < hitZone) {
          handle = "ne";
        } else if (Math.abs(mx - cx) < hitZone && Math.abs(my - (cy + ch)) < hitZone) {
          handle = "sw";
        } else if (
          Math.abs(mx - (cx + cw)) < hitZone &&
          Math.abs(my - (cy + ch)) < hitZone
        ) {
          handle = "se";
        } else if (mx > cx && mx < cx + cw && my > cy && my < cy + ch) {
          handle = "move";
        }

        if (handle) {
          e.preventDefault();
          setCropDrag({
            handle,
            startX: mx,
            startY: my,
            origCrop: { ...activeCrop },
          });
        }
      }
    },
    [pan, activeCrop, getTransform, containerRef],
  );

  const handleMouseMove = useCallback(
    (e) => {
      if (isPanning && panStartRef.current) {
        setPan({
          x: e.clientX - panStartRef.current.x,
          y: e.clientY - panStartRef.current.y,
        });
        return;
      }

      if (!cropDrag || !activeImage) return;

      const transform = getTransform();
      if (!transform) return;

      const rect = containerRef.current.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const dx = (mx - cropDrag.startX) / transform.cssScale;
      const dy = (my - cropDrag.startY) / transform.cssScale;

      let { x, y, width, height, aspectRatio } = cropDrag.origCrop;
      const { iW, iH } = transform;

      if (cropDrag.handle === "move") {
        x += dx;
        y += dy;
        if (x < 0) x = 0;
        if (y < 0) y = 0;
        if (x + width > iW) x = iW - width;
        if (y + height > iH) y = iH - height;
      } else {
        if (cropDrag.handle.includes("e")) width += dx;
        if (cropDrag.handle.includes("s")) height += dy;
        if (cropDrag.handle.includes("w")) {
          x += dx;
          width -= dx;
        }
        if (cropDrag.handle.includes("n")) {
          y += dy;
          height -= dy;
        }

        if (aspectRatio) {
          height = width / aspectRatio;
          if (cropDrag.handle.includes("n")) {
            y = cropDrag.origCrop.y + (cropDrag.origCrop.height - height);
          }
        }

        const minSize = 20;
        if (width < minSize) width = minSize;
        if (height < minSize) height = minSize;
        if (x < 0) x = 0;
        if (y < 0) y = 0;
        if (x + width > iW) width = iW - x;
        if (y + height > iH) height = iH - y;
      }

      dispatch({
        type: "SET_CROP",
        payload: {
          imageId: activeImage.id,
          cropState: { x, y, width, height, aspectRatio },
        },
      });
    },
    [isPanning, cropDrag, activeImage, getTransform, containerRef, dispatch, setPan],
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    panStartRef.current = null;
    setCropDrag(null);
  }, []);

  const cursorStyle = useMemo(() => {
    if (isPanning) return "grabbing";
    if (cropDrag?.handle === "move") return "move";
    if (cropDrag) return "crosshair";
    return "default";
  }, [isPanning, cropDrag]);

  return {
    cursorStyle,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  };
}