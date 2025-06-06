async function cargarCorrelacion() {
    const res = await fetch("/api/correlacion");
    const data = await res.json();
    renderHeatmap(data.labels, data.matrix);
}

function renderHeatmap(labels, matrix) {
    const ctx = document.getElementById("heatmapCanvas").getContext("2d");
    const data = {
        labels: { x: labels, y: labels },
        datasets: [{
            label: 'Correlación',
            data: matrix.flatMap((row, i) =>
                row.map((v, j) => ({ x: labels[j], y: labels[i], v }))
            ),
            backgroundColor(ctx) {
                const value = ctx.raw.v;
                const red = value > 0 ? Math.floor(255 * value) : 0;
                const blue = value < 0 ? Math.floor(255 * -value) : 0;
                return `rgb(${red}, ${255 - Math.abs(red - blue)}, ${blue})`;
            },
            borderWidth: 1,
            borderColor: 'rgba(0,0,0,0.1)',
            width: ({ chart }) => (chart.chartArea || {}).width / labels.length - 2,
            height: ({ chart }) => (chart.chartArea || {}).height / labels.length - 2,
        }]
    };

    new Chart(ctx, {
        type: 'matrix',
        data,
        options: {
            responsive: true,
            plugins: {
                tooltip: {
                    callbacks: {
                        title: () => '',
                        label: ctx => `Correlación (${ctx.raw.y} vs ${ctx.raw.x}): ${ctx.raw.v.toFixed(2)}`
                    }
                },
                legend: { display: false }
            },
            scales: {
                x: { title: { display: true, text: "Variables" }, ticks: { autoSkip: false } },
                y: { title: { display: true, text: "Variables" }, ticks: { autoSkip: false } }
            }
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    cargarCorrelacion();
});