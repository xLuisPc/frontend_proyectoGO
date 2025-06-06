const BACKEND_URL = "https://backend-proyectogo.onrender.com";

let chart = null;
let ultimaPrediccion = null;

async function cargarClusters() {
    const genero = document.getElementById("genero").value;
    const k = document.getElementById("k").value;
    const res = await fetch(`${BACKEND_URL}/api/estadisticas?genero=${genero}&k=${k}`);
    return await res.json();
}

function graficar(clusters, ejeX, ejeY) {
    const colors = ['red', 'blue', 'green', 'purple', 'orange', 'cyan'];
    const datasets = clusters.map((cluster, i) => ({
        label: `Cluster ${i + 1}`,
        data: cluster.Personas.map(p => ({
            x: p[ejeX],
            y: p[ejeY]
        })),
        backgroundColor: colors[i % colors.length]
    }));

    if (chart) chart.destroy();

    chart = new Chart(document.getElementById("clusterChart"), {
        type: 'scatter',
        data: { datasets },
        options: {
            scales: {
                x: {
                    title: { display: true, text: ejeX.replace("genero_", "").toUpperCase() },
                    beginAtZero: true
                },
                y: {
                    title: { display: true, text: ejeY.toUpperCase() },
                    beginAtZero: true,
                    max: 5
                }
            },
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

function generarResumen(clusters, ejeX, ejeY) {
    const tbody = document.querySelector("#tablaResumen tbody");
    tbody.innerHTML = "";

    clusters.forEach((cluster, i) => {
        const n = cluster.Personas.length;

        const promedio = campo => {
            const valores = cluster.Personas.map(p => p[campo]).filter(v => typeof v === "number" && v >= 0);
            if (valores.length === 0) return "—";
            return (valores.reduce((sum, v) => sum + v, 0) / valores.length).toFixed(2);
        };

        const fila = document.createElement("tr");
        fila.innerHTML = `
            <td><b>${i + 1}</b></td>
            <td>${n}</td>
            <td>${promedio(ejeX)}</td>
            <td>${promedio("poo")}</td>
            <td>${promedio("calculo_multivariado")}</td>
            <td>${promedio("promedio")}</td>
        `;
        tbody.appendChild(fila);
    });
}

async function actualizar() {
    const ejeX = document.getElementById("genero").value;
    const ejeY = document.getElementById("notaEjeY").value;
    const clusters = await cargarClusters();
    graficar(clusters, ejeX, ejeY);
    generarResumen(clusters, ejeX, ejeY);

    if (ultimaPrediccion) {
        await predecirConDatos(ultimaPrediccion);
    }
}

async function predecirCluster() {
    const alerta = document.getElementById("alerta-prediccion");
    alerta.innerHTML = "";

    const campos = [
        "genero_accion", "genero_ciencia_ficcion", "genero_comedia",
        "genero_terror", "genero_documental", "genero_romance", "genero_musicales"
    ];

    let valido = true;
    const datos = {
        carrera: document.getElementById("carreraPrediccion").value
    };

    campos.forEach(id => {
        const input = document.getElementById(id);
        input.classList.remove("is-invalid");
        const valor = input.value.trim();
        const num = parseInt(valor);
        if (valor === "" || isNaN(num) || num < 0 || num > 10) {
            input.classList.add("is-invalid");
            valido = false;
        } else {
            datos[id] = num;
        }
    });

    const poo = parseFloat(document.getElementById("pooPred").value);
    const calc = parseFloat(document.getElementById("calculoPred").value);
    if (!isNaN(poo)) datos.poo = poo;
    if (!isNaN(calc)) datos.calculo_multivariado = calc;

    if (!valido) {
        mostrarAlertaPrediccion("❌ Verifica los campos marcados. Valores válidos: 0 a 10.", "danger");
        return;
    }

    ultimaPrediccion = datos;
    await predecirConDatos(datos);
}

async function predecirConDatos(datos) {
    const res = await fetch(`${BACKEND_URL}/api/prediccion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos)
    });

    const resultado = await res.json();
    const promedio = resultado.promedio;

    const ejeX = document.getElementById("genero").value;
    const ejeY = document.getElementById("notaEjeY").value;
    const afinidad = datos[ejeX] ?? 5;

    chart.data.datasets = chart.data.datasets.filter(d => d.label !== "Predicción");

    chart.data.datasets.push({
        label: "Predicción",
        data: [{ x: afinidad, y: promedio }],
        backgroundColor: "black",
        pointRadius: 6,
        pointHoverRadius: 8
    });

    chart.update();

    document.getElementById("resultadoPrediccion").innerText =
        `🔍 Promedio estimado según KNN: ${promedio.toFixed(2)}`;
}

function eliminarPrediccion() {
    ultimaPrediccion = null;
    chart.data.datasets = chart.data.datasets.filter(d => d.label !== "Predicción");
    chart.update();
    document.getElementById("resultadoPrediccion").innerText = "";
}

function mostrarAlertaPrediccion(mensaje, tipo) {
    const alerta = document.getElementById("alerta-prediccion");
    alerta.innerHTML = `
        <div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
            ${mensaje}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>
        </div>
    `;
}

// HEATMAP
async function cargarCorrelacion() {
    const res = await fetch(`${BACKEND_URL}/api/correlacion`);
    const data = await res.json();
    renderHeatmap(data.labels, data.matrix);
}

function renderHeatmap(labels, matrix) {
    const ctx = document.getElementById("heatmapCanvas").getContext("2d");

    const data = {
        labels: { x: labels, y: labels },
        datasets: [{
            label: "Correlación",
            data: matrix.flatMap((row, i) =>
                row.map((val, j) => ({ x: labels[j], y: labels[i], v: val }))
            ),
            backgroundColor(ctx) {
                const value = ctx.raw.v;
                const red = value > 0 ? Math.floor(255 * value) : 0;
                const blue = value < 0 ? Math.floor(255 * -value) : 0;
                return `rgb(${red}, ${255 - Math.abs(red - blue)}, ${blue})`;
            },
            borderColor: "rgba(0,0,0,0.1)",
            borderWidth: 1,
            width: ({ chart }) => (chart.chartArea?.width || 300) / labels.length - 2,
            height: ({ chart }) => (chart.chartArea?.height || 300) / labels.length - 2
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
                        title: () => "",
                        label: ctx => `(${ctx.raw.y} vs ${ctx.raw.x}) → ${ctx.raw.v.toFixed(2)}`
                    }
                },
                legend: { display: false }
            },
            scales: {
                x: { title: { display: true, text: "Variable X" }, ticks: { autoSkip: false } },
                y: { title: { display: true, text: "Variable Y" }, ticks: { autoSkip: false } }
            }
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("genero").addEventListener("change", actualizar);
    document.getElementById("notaEjeY").addEventListener("change", actualizar);
    document.getElementById("k").addEventListener("change", actualizar);
    document.querySelector("button[onclick='predecirCluster()']").addEventListener("click", predecirCluster);
    document.querySelector("button[onclick='eliminarPrediccion()']").addEventListener("click", eliminarPrediccion);
    actualizar();
    cargarCorrelacion();
});