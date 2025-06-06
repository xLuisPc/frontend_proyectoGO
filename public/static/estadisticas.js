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
    // Leer los valores seleccionados de los checkboxes
    const checkboxes = document.querySelectorAll('#vars-checkboxes input[type="checkbox"]');
    const selected = Array.from(checkboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);
    const query = selected.length ? "?vars=" + selected.join(",") : "";
    const res = await fetch(`${BACKEND_URL}/api/correlacion` + query);
    const data = await res.json();
    renderHeatmap(data.labels, data.matrix);
}

function renderHeatmap(labels, matrix) {
  const canvas = document.getElementById("heatmapCanvas");

  // Ajuste dinámico del tamaño de celda según la cantidad de variables
  let CELDA = 120;
  if (labels.length > 6) CELDA = 90;
  if (labels.length > 8) CELDA = 70;
  if (labels.length > 10) CELDA = 55;

  // Ajuste extra: considerar longitud máxima de los nombres
  const maxLabelLength = Math.max(...labels.map(l => l.length));
  const extraWidth = Math.max(0, (maxLabelLength - 10) * 8); // 8px por cada caracter extra
  canvas.width  = labels.length * CELDA + extraWidth;
  canvas.height = labels.length * CELDA + 40; // espacio extra para nombres

  if (heatmapChart) heatmapChart.destroy();

  heatmapChart = new Chart(canvas.getContext("2d"), {
    type: "matrix",
    data: {
      labels: { x: labels, y: labels },
      datasets: [{
        label: "Correlación",
        data: matrix.flatMap((row, i) =>
          row.map((v, j) => ({ x: labels[j], y: labels[i], v }))
        ),
        backgroundColor(ctx) {
          const v = ctx.raw.v;
          const r = v > 0 ? Math.floor(255 *  v) : 0;  // rojo para positivos
          const b = v < 0 ? Math.floor(255 * -v) : 0;  // azul para negativos
          return `rgb(${r}, ${255 - Math.abs(r - b)}, ${b})`;
        },
        borderColor: "rgba(0,0,0,0.15)",
        borderWidth: 1,
        width : () => CELDA - 6,   // deja 6 px de separación
        height: () => CELDA - 6
      }]
    },
    options: {
      responsive: false,           // ← tamaño fijo (no auto-resize)
      scales: {
        x: {
          type: "category",
          labels: labels,
          offset: true,
          position: "top",
          ticks: {
            autoSkip: false,
            maxRotation: 60,
            minRotation: 60,
            font: { size: CELDA > 80 ? 14 : 11 },
            callback: function(value, index) {
              // Mostrar el texto completo, sin recortar
              return this.getLabelForValue(value);
            }
          }
        },
        y: {
          type: "category",
          labels: labels.slice().reverse(), // diagonal principal arriba-izq
          offset: true,
          ticks: {
            autoSkip: false,
            font: { size: CELDA > 80 ? 14 : 11 },
            callback: function(value, index) {
              // Mostrar el texto completo, sin recortar
              return this.getLabelForValue(value);
            }
          }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },  // sin tooltips
        datalabels: {
          display: true,
          color: "black",
          font: { size: CELDA > 80 ? 14 : 11 },         // valor numérico más grande
          formatter: c => c.v.toFixed(2)
        }
      }
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("genero").addEventListener("change", actualizar);
    document.getElementById("notaEjeY").addEventListener("change", actualizar);
    document.getElementById("k").addEventListener("change", actualizar);
    // Cambiar evento para checkboxes de variables
    document.querySelectorAll('#vars-checkboxes input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', cargarCorrelacion);
    });
    document.querySelector("button[onclick='predecirCluster()']").addEventListener("click", predecirCluster);
    document.querySelector("button[onclick='eliminarPrediccion()']").addEventListener("click", eliminarPrediccion);

    // Activar tooltip de Bootstrap para el ícono de información
    if (window.bootstrap) {
      var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
      tooltipTriggerList.forEach(function (tooltipTriggerEl) {
        new bootstrap.Tooltip(tooltipTriggerEl);
      });
    }

    actualizar();
    cargarCorrelacion();
});