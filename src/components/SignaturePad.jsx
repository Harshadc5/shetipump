import React, { useRef, useState, useEffect, useCallback } from "react";

export default function SignaturePad({ title, onUpdate }) {
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const pointsRef = useRef([]);
  const lastVelocityRef = useRef(0);
  const [isEmpty, setIsEmpty] = useState(true);

  // --- Setup canvas at correct device pixel ratio ---
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    // Physical pixel resolution
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Smooth rendering
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111827";
  }, []);

  useEffect(() => {
    setupCanvas();
    window.addEventListener("resize", setupCanvas);
    return () => window.removeEventListener("resize", setupCanvas);
  }, [setupCanvas]);

  // --- Coordinate helper ---
  const getPoint = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    return {
      x: ((e.clientX - rect.left) / rect.width) * (canvas.width / dpr),
      y: ((e.clientY - rect.top) / rect.height) * (canvas.height / dpr),
      time: Date.now(),
    };
  };

  // --- Velocity → line width ---
  const getLineWidth = (v) => {
    // Fast movement = thin stroke, slow = thick (like a real pen)
    const min = 1.2;
    const max = 3.8;
    return Math.max(min, max - v * 0.08);
  };

  // --- Draw a smooth bezier segment ---
  const drawSegment = useCallback((pts) => {
    if (pts.length < 2) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    const p0 = pts[pts.length - 2];
    const p1 = pts[pts.length - 1];

    // Velocity in px/ms
    const dt = Math.max(p1.time - p0.time, 1);
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const velocity = dist / dt;

    // Smooth velocity with a low-pass filter
    const smoothedVel = lastVelocityRef.current * 0.6 + velocity * 0.4;
    lastVelocityRef.current = smoothedVel;

    const width = getLineWidth(smoothedVel);

    ctx.beginPath();
    ctx.lineWidth = width;
    ctx.strokeStyle = "#111827";

    if (pts.length >= 3) {
      // Use midpoints as control points for a quadratic bézier → buttery smooth
      const prev = pts[pts.length - 3];
      const midX0 = (prev.x + p0.x) / 2;
      const midY0 = (prev.y + p0.y) / 2;
      const midX1 = (p0.x + p1.x) / 2;
      const midY1 = (p0.y + p1.y) / 2;

      ctx.moveTo(midX0, midY0);
      ctx.quadraticCurveTo(p0.x, p0.y, midX1, midY1);
    } else {
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
    }

    ctx.stroke();
  }, []);

  // --- Event handlers ---
  const startDrawing = useCallback((pt) => {
    isDrawingRef.current = true;
    pointsRef.current = [pt];
    lastVelocityRef.current = 0;
    setIsEmpty(false);

    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 1.2, 0, Math.PI * 2);
      ctx.fillStyle = "#111827";
      ctx.fill();
    }
  }, []);

  const continueDrawing = useCallback((pt) => {
    if (!isDrawingRef.current) return;
    pointsRef.current.push(pt);
    drawSegment(pointsRef.current);
  }, [drawSegment]);

  const stopDrawing = useCallback(() => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    pointsRef.current = [];

    // Emit the final image
    const canvas = canvasRef.current;
    if (canvas) {
      onUpdate(canvas.toDataURL("image/png"));
    }
  }, [onUpdate]);

  // --- Mouse events ---
  const onMouseDown = useCallback((e) => {
    startDrawing(getPoint(e.nativeEvent));
  }, [startDrawing]);

  const onMouseMove = useCallback((e) => {
    if (isDrawingRef.current) continueDrawing(getPoint(e.nativeEvent));
  }, [continueDrawing]);

  const onMouseUp = useCallback(() => stopDrawing(), [stopDrawing]);

  // --- Touch events ---
  const onTouchStart = useCallback((e) => {
    // e.preventDefault(); // Sometimes needed but can break scrolling
    startDrawing(getPoint(e.touches[0]));
  }, [startDrawing]);

  const onTouchMove = useCallback((e) => {
    // e.preventDefault();
    continueDrawing(getPoint(e.touches[0]));
  }, [continueDrawing]);

  const onTouchEnd = useCallback(() => stopDrawing(), [stopDrawing]);

  // --- Clear ---
  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, rect.width, rect.height);
    setIsEmpty(true);
    onUpdate("");
  }, [onUpdate]);

  // --- Upload Image ---
  const fileInputRef = useRef(null);

  const handleFileUpload = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        const dpr = window.devicePixelRatio || 1;
        
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Scale to fit
        const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
        const drawWidth = img.width * scale;
        const drawHeight = img.height * scale;
        const dx = (canvas.width - drawWidth) / 2;
        const dy = (canvas.height - drawHeight) / 2;
        
        ctx.drawImage(img, dx, dy, drawWidth, drawHeight);
        
        // Reset transform to allow drawing over the image if needed
        ctx.scale(dpr, dpr);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = "#111827";
        
        setIsEmpty(false);
        onUpdate(canvas.toDataURL("image/png"));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    
    // Clear input so same file can be selected again
    e.target.value = null;
  }, [onUpdate]);

  return (
    <div style={{ width: "100%", marginBottom: "1.5rem" }}>
      <label className="form-label" style={{ color: "var(--text-main)", fontWeight: "500", display: "block", marginBottom: "0.5rem" }}>{title}</label>

      <div
        style={{
          border: "1px solid var(--glass-border)",
          borderRadius: "10px",
          overflow: "hidden",
          background: "white",
          boxShadow: "inset 0 1px 4px rgba(0,0,0,0.06)",
          cursor: "crosshair",
        }}
      >
        {/* Subtle guide text shown only when empty */}
        <div style={{ position: "relative" }}>
          {isEmpty && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
                color: "#cbd5e1",
                fontSize: "14px",
                fontStyle: "italic",
                letterSpacing: "0.5px",
                userSelect: "none",
              }}
            >
              Sign here
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "6px", opacity: 0.7 }}>
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
            </div>
          )}
          <canvas
            ref={canvasRef}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            style={{
              width: "100%",
              height: "150px",
              display: "block",
              touchAction: "none",
            }}
          />
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            type="button"
            onClick={clear}
            style={{
              padding: "6px 16px",
              fontSize: "13px",
              borderRadius: "6px",
              border: "1px solid #94a3b8",
              background: "#f8fafc",
              color: "#475569",
              cursor: "pointer",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            ↺ Clear
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: "6px 16px",
              fontSize: "13px",
              borderRadius: "6px",
              border: "1px solid #94a3b8",
              background: "#f8fafc",
              color: "#475569",
              cursor: "pointer",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            Upload
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept="image/*" 
            style={{ display: "none" }} 
          />
        </div>
        {!isEmpty && (
          <span style={{ fontSize: "12px", color: "#10b981", fontWeight: "600" }}>
            ✓ Signed
          </span>
        )}
      </div>
    </div>
  );
}
