export function renderSatdChart(canvas, stats) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const { satdCount, nonSatdCount } = stats;
  const total = Math.max(1, satdCount + nonSatdCount);
  const satdRatio = satdCount / total;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = Math.min(canvas.width, canvas.height) / 2 - 16;

  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.fillStyle = "#ef4444";
  ctx.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + satdRatio * Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.fillStyle = "#22c55e";
  ctx.arc(
    centerX,
    centerY,
    radius,
    -Math.PI / 2 + satdRatio * Math.PI * 2,
    -Math.PI / 2 + Math.PI * 2
  );
  ctx.fill();

  ctx.fillStyle = "#111827";
  ctx.font = "12px sans-serif";
  ctx.fillText(`SATD: ${satdCount}`, 12, canvas.height - 24);
  ctx.fillText(`Sem SATD: ${nonSatdCount}`, 12, canvas.height - 8);
}
