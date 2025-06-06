Chart.register(ChartDataLabels);

async function cargarCorrelacion() {
    const select = document.getElementById("vars");
    const selected = Array.from(select.selectedOptions).map(opt => opt.value);
    const query = selected.length ? "?vars=" + selected.join(",") : "";

    const res = await fetch("https://backend-proyectogo.onrender.com/api/correlacion" + query);
    const data = await res.json();
    renderHeatmap(data.labels, data.matrix);
}

function renderHeatmap(labels, matrix) {
    const ctx = document.getElementById("heatmapCanvas").getContext("2d");

    if (window.heatmapChart) {
        window.heatmapChart.destroy();
    }

    const dataset = matrix.flatMap((row, i) =>
        row.map((val, j) => ({ x: labels[j], y: labels[i], v: val }))
    );

    window.heatmapChart = new Chart(ctx, {
        type: 'matrix',
        data: {
            labels: { x: labels, y: labels },
            datasets: [{
                label: 'Correlación',
                data: dataset,
                backgroundColor(ctx) {
                    const v = ctx.raw.v;
                    const red = v > 0 ? Math.floor(255 * v) : 0;
                    const blue = v < 0 ? Math.floor(255 * -v) : 0;
                    return `rgb(${red}, ${255 - Math.abs(red - blue)}, ${blue})`;
                },
                borderColor: 'rgba(0,0,0,0.1)',
                borderWidth: 1,
                width: ({ chart }) => (chart.chartArea?.width || 300) / labels.length - 2,
                height: ({ chart }) => (chart.chartArea?.height || 300) / labels.length - 2,
            }]
        },
        options: {
            plugins: {
                datalabels: {
                    display: true,
                    color: 'black',
                    font: { size: 10 },
                    formatter: ctx => ctx.v.toFixed(2)
                },
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: () => "",
                        label: ctx => `(${ctx.raw.y} vs ${ctx.raw.x}): ${ctx.raw.v.toFixed(2)}`
                    }
                }
            },
            scales: {
                x: { title: { display: true, text: "Variables" }, ticks: { autoSkip: false } },
                y: { title: { display: true, text: "Variables" }, ticks: { autoSkip: false } }
            }
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("vars").addEventListener("change", cargarCorrelacion);
    cargarCorrelacion();
});