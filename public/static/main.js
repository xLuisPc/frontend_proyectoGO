document.addEventListener("DOMContentLoaded", () => {
    // Cargar estudiantes y luego inicializar DataTable
    fetch("/api/estudiantes")
        .then(res => res.json())
        .then(data => {
            const tbody = document.querySelector("#tabla-estudiantes tbody");
            tbody.innerHTML = "";

            data.forEach(est => {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${est.id}</td>
                    <td>${est.carrera}</td>
                    <td>${est.genero_accion}</td>
                    <td>${est.genero_ciencia_ficcion}</td>
                    <td>${est.genero_comedia}</td>
                    <td>${est.genero_terror}</td>
                    <td>${est.genero_documental}</td>
                    <td>${est.genero_romance}</td>
                    <td>${est.genero_musicales}</td>
                    <td>${est.poo}</td>
                    <td>${est.calculo_multivariado}</td>
                    <td>${est.ctd}</td>
                    <td>${est.ingenieria_software}</td>
                    <td>${est.bases_datos}</td>
                    <td>${est.control_analogo}</td>
                    <td>${est.circuitos_digitales}</td>
                    <td>${est.promedio}</td>
                `;
                tbody.appendChild(row);
            });

            // Inicializar DataTables DESPUÉS de llenar la tabla
            $('#tabla-estudiantes').DataTable({
                pageLength: 10,
                lengthChange: false,
                language: {
                    url: "https://cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json"
                }
            });
        })
        .catch(err => {
            console.error("Error al obtener estudiantes:", err);
        });

    // Evento de cambio de carrera
    document.getElementById("carrera").addEventListener("change", function () {
        const carrera = this.value;
        const campos = document.getElementById("campos-restantes");

        if (carrera) {
            campos.style.display = "block";
        } else {
            campos.style.display = "none";
        }

        const show = id => document.getElementById(id).closest(".mb-3").style.display = "block";
        const hide = id => {
            const el = document.getElementById(id);
            el.value = "0";
            el.closest(".mb-3").style.display = "none";
        };

        show("ingenieria_software");
        show("bases_datos");
        show("control_analogo");
        show("circuitos_digitales");

        if (carrera === "Ingeniería de Sistemas") {
            hide("control_analogo");
            hide("circuitos_digitales");
        } else if (carrera === "Ingeniería Electrónica") {
            hide("ingenieria_software");
            hide("bases_datos");
        }
    });

    // Envío de formulario
    document.getElementById("form-estudiante").addEventListener("submit", async (e) => {
        e.preventDefault();

        const alerta = document.getElementById("alerta-estudiante");
        alerta.innerHTML = ""; // Limpiar alerta previa

        const carrera = document.getElementById("carrera").value;
        if (!carrera) {
            mostrarAlerta("Debes seleccionar una carrera.", "danger");
            return;
        }

        const camposGenero = [
            "genero_accion", "genero_ciencia_ficcion", "genero_comedia",
            "genero_terror", "genero_documental", "genero_romance", "genero_musicales"
        ];

        const camposNotas = [
            "poo", "calculo_multivariado", "ctd",
            "ingenieria_software", "bases_datos", "control_analogo", "circuitos_digitales"
        ];

        let datosValidos = true;

        const getValue = (id, tipo) => {
            const el = document.getElementById(id);
            const valor = el.value.trim();
            el.classList.remove("is-invalid");

            if (valor === "") {
                el.classList.add("is-invalid");
                datosValidos = false;
                return 0;
            }

            const num = tipo === "genero" ? parseInt(valor) : parseFloat(valor);
            const valido = tipo === "genero" ? (num >= 0 && num <= 10) : (num >= 0 && num <= 5);

            if (!valido || isNaN(num)) {
                el.classList.add("is-invalid");
                datosValidos = false;
                return 0;
            }

            return num;
        };

        const estudiante = {
            carrera,
            genero_accion: getValue("genero_accion", "genero"),
            genero_ciencia_ficcion: getValue("genero_ciencia_ficcion", "genero"),
            genero_comedia: getValue("genero_comedia", "genero"),
            genero_terror: getValue("genero_terror", "genero"),
            genero_documental: getValue("genero_documental", "genero"),
            genero_romance: getValue("genero_romance", "genero"),
            genero_musicales: getValue("genero_musicales", "genero"),
            poo: getValue("poo", "nota"),
            calculo_multivariado: getValue("calculo_multivariado", "nota"),
            ctd: getValue("ctd", "nota"),
            ingenieria_software: getValue("ingenieria_software", "nota"),
            bases_datos: getValue("bases_datos", "nota"),
            control_analogo: getValue("control_analogo", "nota"),
            circuitos_digitales: getValue("circuitos_digitales", "nota")
        };

        if (!datosValidos) {
            mostrarAlerta("Revisa los campos marcados en rojo. Géneros deben estar entre 0 y 10, notas entre 0 y 5.", "danger");
            return;
        }

        try {
            const res = await fetch("/api/estudiantes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(estudiante)
            });

            if (res.ok) {
                mostrarAlerta("✅ Estudiante añadido correctamente.", "success");
                setTimeout(() => window.location.reload(), 1500);
            } else {
                const msg = await res.text();
                mostrarAlerta("❌ Error al guardar: " + msg, "danger");
            }
        } catch (err) {
            mostrarAlerta("❌ Error de conexión con el servidor.", "danger");
        }
    });



    // Reset modal al abrir
    document.getElementById("modalEstudiante").addEventListener("show.bs.modal", function () {
        document.getElementById("form-estudiante").reset();
        document.getElementById("campos-restantes").style.display = "none";
    });
});

function mostrarInfoGenero(genero) {
    const dataGeneros = {
        accion: {
            titulo: "Acción",
            descripcion: "Películas con mucha adrenalina, peleas, explosiones y persecuciones.",
            ejemplos: ["John Wick", "Mad Max: Fury Road", "Die Hard"]
        },
        comedia: {
            titulo: "Comedia",
            descripcion: "Películas diseñadas para provocar risa mediante situaciones divertidas.",
            ejemplos: ["Superbad", "The Mask", "Mean Girls"]
        },
        ciencia_ficcion: {
            titulo: "Ciencia Ficción",
            descripcion: "Exploran mundos futuristas, tecnologías avanzadas o extraterrestres.",
            ejemplos: ["Inception", "Interstellar", "Blade Runner"]
        },
        terror: {
            titulo: "Terror",
            descripcion: "Generan miedo o tensión a través de lo desconocido o sobrenatural.",
            ejemplos: ["The Conjuring", "Hereditary", "It"]
        },
        documental: {
            titulo: "Documental",
            descripcion: "Exploran hechos reales o temas educativos de forma objetiva.",
            ejemplos: ["13th", "The Social Dilemma", "Our Planet"]
        },
        romance: {
            titulo: "Romance",
            descripcion: "Cuentan historias centradas en relaciones amorosas.",
            ejemplos: ["The Notebook", "Titanic", "La La Land"]
        },
        musicales: {
            titulo: "Musicales",
            descripcion: "Narrativas combinadas con música y coreografías.",
            ejemplos: ["The Greatest Showman", "Mamma Mia!", "Les Misérables"]
        }
    };

    const info = dataGeneros[genero];
    document.getElementById('modalGeneroTitulo').textContent = info.titulo;
    document.getElementById('modalGeneroDescripcion').textContent = info.descripcion;

    const listaPeliculas = document.getElementById('modalGeneroPeliculas');
    listaPeliculas.innerHTML = '';
    info.ejemplos.forEach(pelicula => {
        const li = document.createElement('li');
        li.textContent = pelicula;
        listaPeliculas.appendChild(li);
    });
}


function mostrarAlerta(mensaje, tipo) {
    const alerta = document.getElementById("alerta-estudiante");
    alerta.innerHTML = `
        <div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
            ${mensaje}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>
        </div>
    `;
}

