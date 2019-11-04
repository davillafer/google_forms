const { email } = require('@hapi/address');

module.exports = {
    name: 'MiRouter',
    register: async (server, options) => {
        miserver = server;
        repositorio = server.methods.getRepositorio();
        server.route([
            //Borrar despues de preguntar a jordán
            {
                method: 'GET',
                path: '/base',
                handler: {
                    view: 'layout/base'
                }
            },
            {
                method: 'GET',
                path: '/registro',
                handler: async (req, h) => {
                    return h.view('registro',
                        {},
                        {layout: 'base'});
                }
            },
            {
                method: 'GET',
                path: '/login',
                handler: async (req, h) => {
                    return h.view('login',
                        {},
                        {layout: 'base'});
                }
            },
            {
                method: 'GET',
                path: '/desconectarse',
                handler: async (req, h) => {
                    req.cookieAuth.set({usuario: "", secreto: ""});
                    return h.view('login',
                        {},
                        {layout: 'base'});
                }
            },
            {
                method: 'POST',
                path: '/login',
                handler: async (req, h) => {
                    password = require('crypto').createHmac('sha256', 'secreto')
                        .update(req.payload.password).digest('hex');

                    usuarioBuscar = {
                        usuario: req.payload.usuario,
                        password: password,
                    };

                    // await no continuar hasta acabar esto
                    // Da valor a respuesta
                    await repositorio.conexion()
                        .then((db) => repositorio.obtenerUsuarios(db, usuarioBuscar))
                        .then((usuarios) => {
                            respuesta = "";
                            if (usuarios == null || usuarios.length == 0) {
                                respuesta = h.redirect('/login?mensaje="Usuario o password incorrecto"&tipoMensaje=danger')
                            } else {
                                req.cookieAuth.set({
                                    usuario: usuarios[0].usuario,
                                    secreto: "secreto"
                                });
                                respuesta = h.redirect('/formularios/publicos')

                            }
                        });
                    return respuesta;
                }
            },
            {
                method: 'POST',
                path: '/registro',
                handler: async (req, h) => {
                    password = require('crypto').createHmac('sha256', 'secreto')
                        .update(req.payload.password).digest('hex');

                    usuario = {
                        usuario: req.payload.usuario,
                        password,
                    };

                    var respuesta = "";
                    await repositorio.conexion()
                        .then((db) => repositorio.obtenerUsuarios(db, {usuario: req.payload.usuario}))
                        .then((usuarios) => {
                            if (usuarios != null && usuarios.length != 0) {
                                respuesta = h.redirect('/registro?mensaje="Usuario ya existente"&tipoMensaje=danger');
                            }
                        });

                    if (respuesta === "") {
                        if (email.isValid(req.payload.usuario)) {
                            await repositorio.conexion()
                                .then((db) => repositorio.insertarUsuario(db, usuario))
                                .then((id) => {
                                    respuesta = "";
                                    if (id == null) {
                                        respuesta = h.redirect('/registro?mensaje="Error al crear cuenta"&tipoMensaje=danger')
                                    } else {
                                        respuesta = h.redirect('/login?mensaje="Usuario Creado"&tipoMensaje=success');
                                    }
                                });
                        } else {
                            respuesta =  h.redirect('/registro?mensaje="Email invalido"&tipoMensaje=danger');
                        }
                    }

                    return respuesta;
                }
            },
            {
                method: 'GET',
                path: '/formularios/crear',
                options: {
                    auth: 'auth-registrado'
                },
                handler: async (req, h) => {
                    return h.view('formularios/crear',
                        {
                            usuarioAutenticado: req.state["session-id"].usuario,
                        },
                        {layout: 'base'});
                }
            },
            {
                method: 'POST',
                path: '/formularios/crear',
                options: {
                    auth: 'auth-registrado'
                },
                handler: async (req, h) => {
                    var preguntas = [];

                    // Buscamos preguntas según su tipo
                    for (let i = 2; i < Object.keys(req.payload).length; i++) {
                        var name = Object.keys(req.payload)[i];
                        var aux = req.payload[name];
                        var temp = {
                            valor: aux,
                            pos: i - 2,
                            required: true
                        };
                        if (name.startsWith('preguntaTexto')) {
                            temp.tipo = 'Texto';
                        }
                        if (name.startsWith('preguntaNumber')) {
                            temp.tipo = 'Numero';
                        }
                        if (name.startsWith('preguntaOpciones')) {
                            temp.valor = aux[0];
                            temp.opciones = aux.slice(1);
                            temp.tipo = 'Opciones';
                        }
                        preguntas.push(temp);
                    }

                    var formulario = {
                        usuario: req.state["session-id"].usuario,
                        titulo: req.payload.titulo,
                        descripcion: req.payload.descripcion,
                        preguntas,
                        public: true // De momento todas son publicas
                    };

                    await repositorio.conexion()
                        .then((db) => repositorio.insertarFormulario(db, formulario))
                        .then((id) => {
                            respuesta = "";
                            if (id == null) {
                                respuesta = h.redirect('/formularios/propios?mensaje="Error al crear el formulario"&tipoMensaje=danger')
                            } else {
                                respuesta = h.redirect('/formularios/propios?mensaje="Formulario creado"&tipoMensaje=success');
                            }
                        });

                    return respuesta;
                }
            },
            {
                method: 'GET',
                path:
                    '/formularios/publicos',
                handler:
                    async (req, h) => {

                        var pg = parseInt(req.query.pg);
                        if (req.query.pg == null) {
                            pg = 1;
                        }

                        var criterio = {};
                        var listaFormularios = [];
                        var resultados;

                        criterio = {"public": true};

                        await repositorio.conexion()
                            .then((db) => repositorio.obtenerFormulariosPg(db, pg, criterio, 3))
                            .then((formularios, total) => {
                                listaFormularios = formularios;
                                resultados = listaFormularios.total;
                                pgUltimaDecimal = listaFormularios.total / 3;
                                pgUltima = Math.trunc(pgUltimaDecimal);

                                // La págian 2.5 no existe
                                // Si excede sumar 1 y quitar los decimales
                                if (pgUltimaDecimal > pgUltima) {
                                    pgUltima = pgUltima + 1;
                                }
                            });

                        var paginas = [];
                        for (i = 1; i <= pgUltima; i++) {
                            if (i == pg) {
                                paginas.push({valor: i, clase: "uk-active"});
                            } else {
                                paginas.push({valor: i});
                            }
                        }

                        // Recorte
                        listaFormularios.forEach((e) => {
                            if (e.titulo.length > 40) {
                                e.titulo = e.titulo.substring(0, 40) + "...";
                            }
                            if (e.descripcion.length > 80) {
                                e.descripcion = e.descripcion.substring(0, 80) + "...";
                            }
                        });

                        if (req.state["session-id"]) {

                            var criterio = {usuario : req.state["session-id"].usuario};
                            var formulariosFavoritos = [];

                            await repositorio.conexion()
                                .then((db) => repositorio.obtenerUsuarios(db, criterio))
                                .then((usuarios) => {
                                    respuesta = "";
                                    if (usuarios == null || usuarios.length == 0) {
                                    } else {
                                        if (usuarios[0].favoritos != undefined){
                                            formulariosFavoritos = usuarios[0].favoritos;
                                        }

                                    }
                                });
                            await listaFormularios.forEach((elem) => {
                                formulariosFavoritos.forEach((favElem) => {
                                    if(elem._id.equals(favElem)){
                                        elem.fav = true;
                                    }
                                })
                            });
                            return h.view('formularios/publicos',
                                {
                                    resultados: resultados,
                                    usuarioAutenticado: req.state["session-id"].usuario,
                                    formularios: listaFormularios,
                                    paginas: paginas,
                                    usuario_busqueda: "",
                                    titulo_busqueda: "",
                                }, {layout: 'base'});
                        } else {
                            return h.view('formularios/publicos',
                                {
                                    resultados: resultados,
                                    formularios: listaFormularios,
                                    paginas: paginas,
                                    usuario_busqueda: "",
                                    titulo_busqueda: ""
                                }, {layout: 'base'});
                        }
                    }
            },
            {
                method: 'GET',
                path:
                    '/formularios/publicos/{usuario}/{titulo}',
                handler:
                    async (req, h) => {

                        var pg = parseInt(req.query.pg);
                        if (req.query.pg == null) {
                            pg = 1;
                        }

                        var criterio = {};
                        var listaFormularios = [];
                        var resultados;

                        if (req.params.titulo == "undefinedTitulo"){
                            criterio = {"public": true, "usuario" : new RegExp(".*" +  req.params.usuario + ".*")};
                        } else if (req.params.usuario == "undefinedUsuario") {
                            criterio = {"public": true, "titulo": new RegExp(".*" + req.params.titulo + ".*")};
                        } else {
                            criterio = {"public": true, "titulo": new RegExp(".*" + req.params.titulo + ".*"), "usuario" : new RegExp(".*" + req.params.usuario + ".*")};
                        }

                        await repositorio.conexion()
                            .then((db) => repositorio.obtenerFormulariosPg(db, pg, criterio, 3))
                            .then((formularios, total) => {
                                listaFormularios = formularios;
                                resultados = listaFormularios.total;
                                pgUltimaDecimal = listaFormularios.total / 3;
                                pgUltima = Math.trunc(pgUltimaDecimal);

                                // La págian 2.5 no existe
                                // Si excede sumar 1 y quitar los decimales
                                if (pgUltimaDecimal > pgUltima) {
                                    pgUltima = pgUltima + 1;
                                }
                            });

                        var paginas = [];
                        for (i = 1; i <= pgUltima; i++) {
                            if (i == pg) {
                                paginas.push({valor: i, clase: "uk-active"});
                            } else {
                                paginas.push({valor: i});
                            }
                        }

                        // Recorte
                        listaFormularios.forEach((e) => {
                            if (e.titulo.length > 25) {
                                e.titulo = e.titulo.substring(0, 25) + "...";
                            }
                            if (e.descripcion.length > 60) {
                                e.descripcion = e.descripcion.substring(0, 60) + "...";
                            }
                        });

                        if (req.state["session-id"]) {
                            return h.view('formularios/publicos',
                                {
                                    resultados: resultados,
                                    usuarioAutenticado: req.state["session-id"].usuario,
                                    formularios: listaFormularios,
                                    paginas: paginas,
                                    usuario_busqueda: "/" + req.params.usuario,
                                    titulo_busqueda: "/" + req.params.titulo,
                                }, {layout: 'base'});
                        } else {
                            return h.view('formularios/publicos',
                                {
                                    resultados: resultados,
                                    formularios: listaFormularios,
                                    paginas: paginas,
                                    usuario_busqueda: "/" + req.params.usuario,
                                    titulo_busqueda: "/" + req.params.titulo,
                                }, {layout: 'base'});
                        }
                    }
            },
            {
                method: 'POST',
                path: '/formularios/publicos',
                handler: async (req, h) => {
                    var titulo = req.payload.titulo;
                    var usuario = req.payload.usuario;

                    if (titulo == "" && usuario == ""){
                        return h.redirect('/formularios/publicos');
                    }

                    if (titulo == ""){
                        titulo = "undefinedTitulo";
                    }
                    if (usuario == "") {
                        usuario = "undefinedUsuario";
                    }

                    return h.redirect('/formularios/publicos/' + encodeURI(usuario) + "/" + encodeURI(titulo));

                }
            },
            {
                method: 'GET',
                path:
                    '/formularios/propios',
                options:
                    {
                        auth: 'auth-registrado'
                    }
                ,
                handler: async (req, h) => {

                    var pg = parseInt(req.query.pg);
                    if (req.query.pg == null) {
                        pg = 1;
                    }

                    var criterio = {"usuario": req.auth.credentials};
                    var listaFormularios = [];
                    var resultados;

                    await repositorio.conexion()
                        .then((db) => repositorio.obtenerFormulariosPg(db, pg, criterio, 8))
                        .then((formularios, total) => {
                            listaFormularios = formularios;
                            resultados = listaFormularios.total;
                            pgUltimaDecimal = listaFormularios.total / 8;
                            pgUltima = Math.trunc(pgUltimaDecimal);

                            // La págian 2.5 no existe
                            // Si excede sumar 1 y quitar los decimales
                            if (pgUltimaDecimal > pgUltima) {
                                pgUltima = pgUltima + 1;
                            }

                        });

                    var paginas = [];
                    for (i = 1; i <= pgUltima; i++) {
                        if (i == pg) {
                            paginas.push({valor: i, clase: "uk-active"});
                        } else {
                            paginas.push({valor: i});
                        }
                    }
                    return h.view('formularios/propios',
                        {
                            resultados: resultados,
                            formularios: listaFormularios,
                            usuarioAutenticado: req.state["session-id"].usuario,
                            paginas: paginas
                        },
                        {layout: 'base'});
                }
            }
            ,
            {
                method: 'GET',
                path:
                    '/formularios/{id}/eliminar',
                options:
                    {
                        auth: 'auth-registrado'
                    },
                handler:
                    async (req, h) => {

                        var criterio = {
                            "_id": require("mongodb").ObjectID(req.params.id)
                        };

                        await repositorio.conexion()
                            .then((db) => repositorio.eliminarFormularios(db, criterio))
                            .then((resultado) => {
                            });

                        return h.redirect('/formularios/propios?mensaje="Fomulario Eliminado"&tipoMensaje=success')
                    }
            }
            ,
            {
                method: 'GET',
                path:
                    '/formularios/{id}/responder',
                options:
                    {
                        auth: 'auth-registrado'
                    },
                handler: async (req, h) => {

                    var criterio = {"_id": require("mongodb").ObjectID(req.params.id)};
                    var formulario;
                    var formulariosFavoritos = [];

                    await repositorio.conexion()
                        .then((db) => repositorio.obtenerFormularios(db, criterio))
                        .then((formularios) => {
                            formulario = formularios[0];
                        });

                    if (req.state["session-id"]) {

                        criterio = {usuario : req.state["session-id"].usuario};

                        await repositorio.conexion()
                            .then((db) => repositorio.obtenerUsuarios(db, criterio))
                            .then((usuarios) => {
                                respuesta = "";
                                if (usuarios == null || usuarios.length == 0) {
                                } else {
                                    if (usuarios[0].favoritos != undefined){
                                        formulariosFavoritos = usuarios[0].favoritos;
                                    }

                                }
                            });

                        await formulariosFavoritos.forEach((elem) => {
                            if(elem.equals(formulario._id)) {
                                formulario.fav = true;
                            }
                        });
                    }
                    return h.view('formularios/formulario',
                        {
                            id: require("mongodb").ObjectID(req.params.id),
                            formulario: formulario,
                            usuarioAutenticado: req.state["session-id"].usuario,
                        },
                        {layout: 'base'});
                }
            },
            {
                method: 'POST',
                path:
                    '/formularios/{id}/responder',
                options:
                    {
                        auth: 'auth-registrado'
                    }
                ,
                handler: async (req, h) => {

                    var criterio = {"_id": require("mongodb").ObjectID(req.params.id)};
                    var formulario;
                    var res = [];
                    var repetido = false;

                    await repositorio.conexion()
                        .then((db) => repositorio.obtenerFormularios(db, criterio))
                        .then((formularios) => {
                            formulario = formularios[0];
                        });
                    if (formulario) {
                        if (formulario.respuestas !== undefined) {

                            for (let i = 0; i < formulario.respuestas.length; i++) {
                                if (formulario.respuestas[i].usuario == req.state["session-id"].usuario) {
                                    repetido = true;
                                }
                            }
                            if (repetido) {
                                return h.redirect('/formularios/publicos?mensaje="Respondido previamente"&tipoMensaje=danger');
                            }
                        } else {
                            formulario.respuestas = [];
                        }

                        for (let i = 0; i < Object.keys(req.payload).length; i++) {
                            var name = Object.keys(req.payload)[i];
                            if(isNaN(name)) {
                                new_name =  name.substr(0,name.indexOf("_"));
                                res[new_name] = req.payload[name];
                            } else {
                                res[name] = req.payload[name]
                            }
                        }

                        formulario.respuestas.push({
                            usuario: req.state["session-id"].usuario,
                            res
                        });

                        await repositorio.conexion()
                            .then((db) => repositorio.modificarFormulario(db, criterio, formulario))
                            .then((id) => {
                                respuesta = "";
                                if (id == null) {
                                    respuesta = h.redirect('/formularios/' + req.params.id
                                        + '/responder?mensaje="Error al responder el formulario"&tipoMensaje=danger');
                                } else {
                                    respuesta = h.redirect('/formularios/publicos?mensaje="Formulario respondido"&tipoMensaje=success');
                                }
                            });

                        return respuesta;
                    } else {
                        return h.redirect('/formularios/publicos?mensaje="Formulario no existe"&tipoMensaje=danger');
                    }
                }
            },
            {
                method: 'GET',
                path:
                    '/formularios/{id}/modificar',
                options:
                    {
                        auth: 'auth-registrado'
                    },
                handler: async (req, h) => {


                    var criterio = {"_id": require("mongodb").ObjectID(req.params.id)};
                    var formulario;

                    await repositorio.conexion()
                        .then((db) => repositorio.obtenerFormularios(db, criterio))
                        .then((formularios) => {
                            formulario = formularios[0];
                        });

                    return h.view('formularios/modificar',
                        {
                            id: require("mongodb").ObjectID(req.params.id),
                            formulario,
                            usuarioAutenticado: req.state["session-id"].usuario,
                        },
                        {layout: 'base'});
                }
            },
            {
                method: 'POST',
                path: '/formularios/{id}/modificar',
                options: {
                    auth: 'auth-registrado'
                },
                handler: async (req, h) => {
                    var criterio = {"_id": require("mongodb").ObjectID(req.params.id)};
                    var formulario;
                    var preguntas = [];

                    await repositorio.conexion()
                        .then((db) => repositorio.obtenerFormularios(db, criterio))
                        .then((formularios) => {
                            formulario = formularios[0];
                        });

                    // Buscamos preguntas según su tipo
                    for (let i = 0; i < Object.keys(req.payload).length; i++) {
                        var name = Object.keys(req.payload)[i];
                        var aux = req.payload[name];

                        var temp = {
                            valor: aux,
                            pos: i-2,
                            required: true
                        };

                        var nuevo = false;

                        if (name == "titulo") {
                            formulario.titulo = aux;
                        } else {
                            if (name == "descripcion") {
                                formulario.descripcion = aux;
                            } else {
                                if (name.startsWith('preguntaTexto')) {
                                        temp.tipo = 'Texto';
                                        nuevo = true;
                                } else {
                                    if (name.startsWith('preguntaNumber')) {
                                        temp.tipo = 'Numero';
                                        nuevo = true;
                                    } else {
                                        if (name.startsWith('preguntaOpciones')) {
                                            temp.valor = aux[0];
                                            temp.opciones = aux.slice(1);
                                            temp.tipo = 'Opciones';
                                            nuevo = true;
                                        } else {
                                            for (let j = 0; j < formulario.preguntas.length; j++) {
                                                if (name == formulario.preguntas[j].pos) {
                                                    if (Array.isArray(aux)) {
                                                        formulario.preguntas[j].valor = aux[0];
                                                        let counter = 0;
                                                        for (let k = 1; k < aux.length; k++) {
                                                            formulario.preguntas[j].opciones[counter] = aux[k];
                                                            counter++;
                                                        }
                                                    } else {
                                                        formulario.preguntas[j].valor = aux;
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                                if(nuevo)
                                    formulario.preguntas.push(temp);
                            }
                        }
                    }

                    var criterio = {"_id": require("mongodb").ObjectID(req.params.id)};

                    await repositorio.conexion()
                        .then((db) => repositorio.modificarFormulario(db, criterio, formulario))
                        .then((id) => {
                            respuesta = "";
                            if (id == null) {
                                respuesta = h.redirect('/formularios/propios?mensaje="Error al modificar"&tipoMensaje=danger')
                            } else {
                                respuesta = h.redirect('/formularios/propios?mensaje="Formulario modificado"&tipoMensaje=success');
                            }
                        });

                    return respuesta;
                }
            },
            {
                method: 'GET',
                path:
                    '/formularios/{id}/respuestas',
                options:
                    {
                        auth: 'auth-registrado'
                    },
                handler: async (req, h) => {


                    var criterio = {"_id": require("mongodb").ObjectID(req.params.id)};
                    var formulario;

                    await repositorio.conexion()
                        .then((db) => repositorio.obtenerFormularios(db, criterio))
                        .then((formularios) => {
                            formulario = formularios[0];
                        });

                    preguntas = [];

                    if(formulario.respuestas == undefined) {
                        return h.redirect('/formularios/propios?mensaje="No tiene respuestas"&tipoMensaje=primary');
                    }

                    for (let i = 0; i < formulario.preguntas.length; i++) {
                        var respuestas = [];
                        for (let j = 0; j < formulario.respuestas.length; j++){
                            respuestas.push({
                                usuario: formulario.respuestas[j].usuario,
                                respuesta: formulario.respuestas[j].res[i]
                            })
                        }
                        pregunta = {
                            valor: formulario.preguntas[i].valor,
                            respuestas
                        };
                        preguntas.push(pregunta)
                    }

                    return h.view('formularios/respuestas',
                        {
                            titulo: formulario.titulo,
                            preguntas: preguntas,
                            usuarioAutenticado: req.state["session-id"].usuario,
                        },
                        {layout: 'base'});
                }
            },
            {
                method: 'GET',
                path:
                    '/formularios/{id}/ver',
                options:
                    {
                        auth: 'auth-registrado'
                    },
                handler: async (req, h) => {


                    var criterio = {"_id": require("mongodb").ObjectID(req.params.id)};
                    var formulario;

                    await repositorio.conexion()
                        .then((db) => repositorio.obtenerFormularios(db, criterio))
                        .then((formularios) => {
                            formulario = formularios[0];
                        });

                    return h.view('formularios/ver',
                        {
                            formulario: formulario,
                            usuarioAutenticado: req.state["session-id"].usuario,
                        },
                        {layout: 'base'});
                }
            },
            {
                method: 'GET',
                path:
                    '/formularios/favoritos',
                options:
                    {
                        auth: 'auth-registrado'
                    },
                handler:
                    async (req, h) => {


                        var criterio = {usuario : req.state["session-id"].usuario};
                        var formulariosFavoritos = [];
                        var resultados;


                        await repositorio.conexion()
                            .then((db) => repositorio.obtenerUsuarios(db, criterio))
                            .then((usuarios) => {
                                respuesta = "";
                                if (usuarios == null || usuarios.length == 0) {
                                } else {
                                    if (usuarios[0].favoritos != undefined){
                                        formulariosFavoritos = usuarios[0].favoritos;
                                    }

                                }
                            });

                        var listaFormularios = [];
                        var pg = parseInt(req.query.pg);
                        if (req.query.pg == null) {
                            pg = 1;
                        }

                        pgUltimaDecimal = 0;
                        for (let i =0; i<formulariosFavoritos.length; i++){
                            criterio = {"_id": require("mongodb").ObjectID(formulariosFavoritos[i])};
                            await repositorio.conexion()
                                .then((db) => repositorio.obtenerFormularios(db, criterio))
                                .then((formularios) => {
                                    for (let j=0; j<formularios.length; j++){
                                        pgUltimaDecimal += 1;
                                        listaFormularios.push(formularios[j]);
                                    }

                                });
                        }

                        resultados = pgUltimaDecimal;
                        pgUltimaDecimal = pgUltimaDecimal / 3;
                        pgUltima = Math.trunc(pgUltimaDecimal);

                        if (pgUltimaDecimal > pgUltima) {
                            pgUltima = pgUltima + 1;
                        }

                        listaFormularios = listaFormularios.slice((pg-1)*3, (pg)*3);

                        var paginas = [];
                        for (i = 1; i <= pgUltima; i++) {
                            if (i == pg) {
                                paginas.push({valor: i, clase: "uk-active"});
                            } else {
                                paginas.push({valor: i});
                            }
                        }

                        // Recorte
                        listaFormularios.forEach((e) => {
                            if (e.titulo.length > 25) {
                                e.titulo = e.titulo.substring(0, 25) + "...";
                            }
                            if (e.descripcion.length > 60) {
                                e.descripcion = e.descripcion.substring(0, 60) + "...";
                            }
                        });

                        if (req.state["session-id"]) {
                            return h.view('formularios/favoritos',
                                {
                                    resultados: resultados,
                                    usuarioAutenticado: req.state["session-id"].usuario,
                                    formularios: listaFormularios,
                                    paginas: paginas,
                                }, {layout: 'base'});
                        } else {
                            return h.view('formularios/favoritos',
                                {
                                    resultados: resultados,
                                    formularios: listaFormularios,
                                    paginas: paginas,
                                }, {layout: 'base'});
                        }
                    }
            },
            {
                method: 'POST',
                path:
                    '/formularios/{id}/favoritos',
                options:
                    {
                        auth: 'auth-registrado'
                    },
                handler:
                    async (req, h) => {

                        var criterio = {usuario : req.state["session-id"].usuario};
                        var usuario;


                        await repositorio.conexion()
                            .then((db) => repositorio.obtenerUsuarios(db, criterio))
                            .then((usuarios) => {
                                respuesta = "";
                                if (usuarios == null || usuarios.length == 0) {
                                } else {
                                    usuario = usuarios[0];
                                }
                            });

                        if (usuario.favoritos == undefined){
                            usuario.favoritos = [];
                            usuario.favoritos.push(require("mongodb").ObjectID(req.params.id))
                        } else {
                            for (let i=0; i<usuario.favoritos.length; i++){
                                if (usuario.favoritos[i] == req.params.id){
                                    return h.redirect('/formularios/favoritos?mensaje="Favorito ya estaba elegido"&tipoMensaje=danger');
                                }
                            }
                            usuario.favoritos.push(require("mongodb").ObjectID(req.params.id))
                        }

                        await repositorio.conexion()
                            .then((db) => repositorio.modificarUsuario(db, criterio, usuario))
                            .then((id) => {
                                respuesta = "";
                                if (id == null) {
                                    respuesta = h.redirect('/formularios/favoritos?mensaje="Favorito no agregado"&tipoMensaje=danger');
                                } else {
                                    respuesta = h.redirect('/formularios/favoritos?mensaje="Favorito agregado"&tipoMensaje=success');
                                }
                            });

                        return respuesta


                    }
            },
            {
                method: 'POST',
                path: '/formularios/favoritos/delete/{id}',
                options:
                    {
                        auth: 'auth-registrado'
                    },
                handler:
                    async (req, h) => {

                        var criterio = {usuario : req.state["session-id"].usuario};
                        var usuario;


                        await repositorio.conexion()
                            .then((db) => repositorio.obtenerUsuarios(db, criterio))
                            .then((usuarios) => {
                                respuesta = "";
                                if (usuarios == null || usuarios.length == 0) {
                                } else {
                                    usuario = usuarios[0];
                                }
                            });

                        if (usuario.favoritos == undefined){
                            return h.redirect('/formularios/favoritos?mensaje="No tienes favoritos"&tipoMensaje=primary');
                        } else {
                            for (let i=0; i<usuario.favoritos.length; i++){
                                if (usuario.favoritos[i] == req.params.id){
                                    usuario.favoritos.splice(i, 1);
                                }
                            }
                        }

                        await repositorio.conexion()
                            .then((db) => repositorio.modificarUsuario(db, criterio, usuario))
                            .then((id) => {
                                respuesta = "";
                                if (id == null) {
                                    respuesta = h.redirect('/formularios/favoritos?mensaje="Favorito no eliminado"&tipoMensaje=danger');
                                } else {
                                    respuesta = h.redirect('/formularios/favoritos?mensaje="Favorito eliminado"&tipoMensaje=success');
                                }
                            });
                        return respuesta;
                    }
            },
            {
                method: 'GET',
                path:
                    '/{param*}',
                handler:
                    {
                        directory: {
                            path: './public'
                        }
                    }
            }
            ,
            {
                method: 'GET',
                path:
                    '/',
                handler:
                    async (req, h) => {
                        return h.redirect("/formularios/publicos")
                    }
            }
        ])
    }
};
