let chart = null;
let ultimaPrediccion = null;

async function cargarClusters() {
    const genero = document.getElementById("genero").value;
    const k = document.getElementById("k").value;
    const res = await fetch(`/api/estadisticas?genero=${genero}&k=${k}`);
    return await res.json();
}

function graficar(clusters, genero) {
    const colors = ['red', 'blue', 'green', 'purple', 'orange', 'cyan'];
    const datasets = clusters.map((cluster, i) => ({
        label: `Cluster ${i + 1}`,
        data: cluster.Personas.map(p => ({
            x: p[genero],
            y: p.promedio
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
                    title: { display: true, text: genero.replace("genero_", "").toUpperCase() },
                    beginAtZero: true
                },
                y: {
                    title: { display: true, text: "Promedio" },
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

async function actualizar() {
    const genero = document.getElementById("genero").value;
    const clusters = await cargarClusters();
    graficar(clusters, genero);
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
    const res = await fetch("/api/prediccion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos)
    });

    const resultado = await res.json();
    const promedio = resultado.promedio;
    const generoSeleccionado = document.getElementById("genero").value;
    const afinidad = datos[generoSeleccionado];

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

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("genero").addEventListener("change", actualizar);
    document.getElementById("k").addEventListener("change", actualizar);
    document.querySelector("button[onclick='predecirCluster()']").addEventListener("click", predecirCluster);
    document.querySelector("button[onclick='eliminarPrediccion()']").addEventListener("click", eliminarPrediccion);
    actualizar();
});