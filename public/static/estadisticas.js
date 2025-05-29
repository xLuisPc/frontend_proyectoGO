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

function generarResumen(clusters, genero) {
    const tbody = document.querySelector("#tablaResumen tbody");
    tbody.innerHTML = "";

    clusters.forEach((cluster, i) => {
        const n = cluster.Personas.length;

        const promedio = campo => {
            const valores = cluster.Personas.map(p => p[campo]).filter(v => typeof v === "number");
            if (valores.length === 0) return "—";
            return (valores.reduce((sum, v) => sum + v, 0) / valores.length).toFixed(2);
        };

        const fila = document.createElement("tr");
        fila.innerHTML = `
            <td><b>${i + 1}</b></td>
            <td>${n}</td>
            <td>${promedio(genero)}</td>
            <td>${promedio("poo")}</td>
            <td>${promedio("ctd")}</td>
            <td>${promedio("calculo_multivariado")}</td>
            <td>${promedio("ingenieria_software")}</td>
            <td>${promedio("bases_datos")}</td>
            <td>${promedio("control_analogo")}</td>
            <td>${promedio("circuitos_digitales")}</td>
            <td>${promedio("promedio")}</td>
        `;
        tbody.appendChild(fila);
    });
}

async function actualizar() {
    const genero = document.getElementById("genero").value;
    const clusters = await cargarClusters();
    graficar(clusters, genero);
    generarResumen(clusters, genero);

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
    const clusterID = resultado.cluster;
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
        `🔍 Este perfil pertenece al Cluster ${clusterID + 1} | Estudiantes similares tienen un promedio de ${promedio.toFixed(2)}`;

    // Mostrar tabla de notas estimadas por materia
    const materias = resultado.materias || {};
    const contenedorNotas = document.getElementById("notas-estimadas");
    contenedorNotas.innerHTML = `
        <table class="table table-sm table-bordered text-center mt-3">
            <thead class="table-light"><tr>
                <th>POO</th><th>CTD</th><th>Cálculo</th>
                <th>Ing. Software</th><th>Bases de Datos</th>
                <th>Control Análogo</th><th>Circuitos Digitales</th>
            </tr></thead>
            <tbody><tr>
                <td>${formatearNota(materias.poo)}</td>
                <td>${formatearNota(materias.ctd)}</td>
                <td>${formatearNota(materias.calculo_multivariado)}</td>
                <td>${formatearNota(materias.ingenieria_software)}</td>
                <td>${formatearNota(materias.bases_datos)}</td>
                <td>${formatearNota(materias.control_analogo)}</td>
                <td>${formatearNota(materias.circuitos_digitales)}</td>
            </tr></tbody>
        </table>
    `;
}

function formatearNota(valor) {
    return typeof valor === "number" ? valor.toFixed(2) : "—";
}

function eliminarPrediccion() {
    ultimaPrediccion = null;
    chart.data.datasets = chart.data.datasets.filter(d => d.label !== "Predicción");
    chart.update();
    document.getElementById("resultadoPrediccion").innerText = "";
    document.getElementById("notas-estimadas").innerHTML = "";
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
