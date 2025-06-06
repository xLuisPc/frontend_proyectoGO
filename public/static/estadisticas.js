Chart.register(ChartDataLabels);

const BACKEND_URL = "https://backend-proyectogo.onrender.com";
let chart = null;
let heatmapChart = null;
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
            responsive: true,
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
                legend: { position: 'bottom' },
                datalabels: { display: false }
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
    const select = document.getElementById("vars");
    const selected = Array.from(select.selectedOptions).map(opt => opt.value);
    const query = selected.length ? "?vars=" + selected.join(",") : "";
    const res = await fetch(`${BACKEND_URL}/api/correlacion` + query);
    const data = await res.json();
    renderHeatmap(data.labels, data.matrix);
}

function renderHeatmap(labels, matrix) {
  const canvas = document.getElementById("heatmapCanvas");

  //  → 40 px por variable
  canvas.width  = labels.length * 70;
  canvas.height = labels.length * 50;

  if (heatmapChart) heatmapChart.destroy();

  heatmapChart = new Chart(canvas.getContext("2d"), {
    type: "matrix",
    data: {
      datasets: [{
        label: "Correlación",
        data: matrix.flatMap((row, i) =>
          row.map((v, j) => ({ x: labels[j], y: labels[i], v }))
        ),
        backgroundColor(ctx) {
          const v = ctx.raw.v;
          const red  = v > 0 ? Math.floor(255 *  v) : 0;
          const blue = v < 0 ? Math.floor(255 * -v) : 0;
          return `rgb(${red}, ${255 - Math.abs(red - blue)}, ${blue})`;
        },
        borderColor: "rgba(0,0,0,0.1)",
        borderWidth: 1,
        width : () => 35,
        height: () => 35
      }]
    },
    options: {
      responsive: false,              // ← evitamos que Chart.js cambie el tamaño
      scales: {
        x: {
          type: "category",           // ← clave: eje categórico
          labels: labels,
          offset: true,
          position: "top"
        },
        y: {
          type: "category",           // ← clave: eje categórico
          labels: labels.slice().reverse(), // opcional: invierte filas para ver la diagonal arriba-izq
          offset: true
        }
      },
      plugins: {
        datalabels: {
          display: true,
          color: "black",
          font: { size: 10 },
          formatter: ctx => ctx.v.toFixed(2)
        },
        legend : { display: false },
        tooltip: { enabled: false }
      }
    }
  });
}



document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("genero").addEventListener("change", actualizar);
    document.getElementById("notaEjeY").addEventListener("change", actualizar);
    document.getElementById("k").addEventListener("change", actualizar);
    document.getElementById("vars").addEventListener("change", cargarCorrelacion);
    document.querySelector("button[onclick='predecirCluster()']").addEventListener("click", predecirCluster);
    document.querySelector("button[onclick='eliminarPrediccion()']").addEventListener("click", eliminarPrediccion);

    actualizar();
    cargarCorrelacion();
});