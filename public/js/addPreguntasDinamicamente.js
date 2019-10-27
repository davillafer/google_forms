contenedor = document.getElementById('preguntas-container');
addPreguntas = document.getElementById('add-pregunta');
nuevasPreguntas = document.getElementById('nuevas-preguntas');
num = 0;
generalCounter = 0;
tempRespuestas = [];

function create() {
    contenedor.innerHTML =
        '<h3>Seleccione el tipo de pregunta:</h3>' +
        '<p class="uk-margin">' +
        '<button class="uk-button uk-button-danger uk-width-1-3 uk-margin-small-bottom" onclick="textOption()">' +
        'Texto' +
        '</button>' +
        '<button class="uk-button uk-button-danger uk-width-1-3 uk-margin-small-bottom" onclick="choiceOption()">' +
        'Opciones' +
        '</button>' +
        '<button class="uk-button uk-button-danger uk-width-1-3 uk-margin-small-bottom" onclick="numberOption()">' +
        'Número' +
        '</button>' +
        '</p>';
    addPreguntas.style.display = 'none';
}

function increaseGeneral() {
    generalCounter++;
}

function textOption() {
    obtenerRespuestas();
    nuevasPreguntas.innerHTML +=
        '<div class="uk-grid uk-margin">' +
        '<div class="uk-width-1-1">' +
        '<label class="uk-form-label">' +
        'Pregunta de tipo texto:' +
        '</label>' +
        '<input class="uk-input" type="text" name="preguntaTexto' + generalCounter + '" placeholder="Inserte la pregunta" required>' +
        '</div>' +
        '</div>';
    increaseGeneral();
    addRespuestas();
    undo();
}

function choiceOption() {
    obtenerRespuestas();
    nuevasPreguntas.innerHTML +=
        '<div class="uk-grid uk-margin">' +
        '<div class="uk-width-1-1 contenedor-opciones" id=' + num + '>' +
        '<label class="uk-form-label">' +
        'Pregunta de tipo opciones:' +
        '</label>' +
        '<input class="uk-input uk-margin-small-bottom" type="text" name="preguntaOpciones' + generalCounter + '[]" placeholder="Inserte la pregunta" required>' +
        '<input class="uk-input uk-margin-small-bottom" type="text" name="preguntaOpciones' + generalCounter + '[]" placeholder="Inserte una opción" required>' +
        '<button class="uk-button uk-button-danger uk-width-1-2 uk-margin-small-bottom" ' +
        'onclick="checkId(this)">Añadir otra opción' +
        '</button>' +
        '</div>' +
        '</div>';
    num = num + 1;
    increaseGeneral();
    addRespuestas();
    undo();
}

function checkId(elem) {
    obtenerRespuestas();
    contenedorOpciones = document.getElementById(elem.parentNode.getAttribute('id'));
    boton = contenedorOpciones.getElementsByTagName("button")[0];
    claseAnterior = contenedorOpciones.getElementsByTagName("input")[0].name;
    contenedorOpciones.removeChild(boton);
    contenedorOpciones.innerHTML +=
        '<input class="uk-input uk-margin-small-bottom" type="text" name="' + claseAnterior + '" placeholder="Inserte una opción" required>' +
        '<button class="uk-button uk-button-danger uk-width-1-2 uk-margin-small-bottom" ' +
        'onclick="checkId(this)">Añadir otra opción' +
        '</button>';
    posVacio = contenedorOpciones.getElementsByTagName("input").length;
    addRespuestas(contenedorOpciones, posVacio);
}

function numberOption() {
    obtenerRespuestas();
    nuevasPreguntas.innerHTML +=
        '<div class="uk-grid uk-margin">' +
        '<div class="uk-width-1-1">' +
        '<label class="uk-form-label">' +
        'Pregunta de tipo número:' +
        '</label>' +
        '<input class="uk-input" type="text" name="preguntaNumber' + generalCounter + '" placeholder="Inserte la pregunta" required>' +
        '</div>' +
        '</div>';
    increaseGeneral();
    addRespuestas();
    undo();
}

function addRespuestas(contenedorOpciones = null, posVacio = -1) {
    aux = nuevasPreguntas.getElementsByTagName("input");
    if (posVacio == -1) {
        for (var i = 0; i < aux.length; i++) {
            if (tempRespuestas[i]) {
                aux[i].value = tempRespuestas[i];
            } else {
                aux[i].value = "";
            }
        }
    } else {
        counter = 0;
        for (var i = 0; i < aux.length; i++) {
            if (tempRespuestas[counter] != undefined) {
                if (aux[i].parentNode.getAttribute("id") == contenedorOpciones.getAttribute("id")) {
                    posVacio -= 1;
                    if (posVacio == 0) {
                        aux[i].value = "";
                    } else {
                        aux[i].value = tempRespuestas[counter];
                        counter++;
                    }
                } else {
                    aux[i].value = tempRespuestas[counter];
                    counter++;
                }
            } else {
                aux[i].value = "";
                counter++;
            }
        }
    }
}

function obtenerRespuestas() {
    tempRespuestas = [];
    aux = nuevasPreguntas.getElementsByTagName("input");
    for (var i = 0; i < aux.length; i++) {
        tempRespuestas.push(aux[i].value);
    }
}

function undo() {
    addPreguntas.style.display = 'block';
    contenedor.innerHTML = '';
}