// Módulos
const Hapi = require('@hapi/hapi');
const Inert = require('@hapi/inert');
const Vision = require('@hapi/vision');
const Cookie = require('@hapi/cookie');

const routes = require("./routes.js");
const repositorio = require("./repositorio.js");

// Servidor
const server = Hapi.server({
    port: 8080,
    host: 'localhost',
});

// Declarar métodos comunes
server.method({
    name: 'getRepositorio',
    method: () => {
        return repositorio;
    },
    options: {}
});

// Inicio el servidor
const iniciar_server = async () => {
    try {
        // Registrar el Inter antes de usar directory en routes
        await server.register(Inert);
        await server.register(Vision);
        await server.register(Cookie);

        //Configurar seguridad
        await server.auth.strategy('auth-registrado', 'cookie', {
            cookie: {
                name: 'session-id',
                password: '$2a$10$iqJHD.BGr0E2IxQwYgJmeP3NvhPrXAeLSaGCj6IR/XU5QtjVu5Tm',
                isSecure: false
            },
            redirectTo: '/login', // En caso de intentar saltarse el login
            validateFunc: function (request, cookie) {
                promise = new Promise((resolve, reject) => {

                    usuarioCriterio = {"usuario": cookie.usuario};
                    if (cookie.usuario != null && cookie.usuario != "" &&
                        cookie.secreto == "secreto") {

                        resolve({
                            valid: true,
                            credentials: cookie.usuario
                        });

                    } else {
                        resolve({valid: false});
                    }
                });

                return promise;
            }
        });

        var handlebars = require('handlebars');
        handlebars.registerHelper("sumar", (a, b) => {
            return a + b;
        });

        handlebars.registerHelper("equals", (a, b) => {
                if(a == b) // Or === depending on your needs
                    return true;
                else
                    return false;
        });

        handlebars.registerHelper("showElement", (a) => {
            return function myFunction(a) {
                var x = document.getElementById(a);
                if (x.style.display === "none") {
                    x.style.display = "block";
                } else {
                    x.style.display = "none";
                }
            }
        });

        await server.register(routes);
        await server.views({
            engines: {
                html: require('handlebars')
            },
            relativeTo: __dirname,
            path: './views',
            layoutPath: './views/layout',
            context: {
                sitioWeb: "wallapep"
            }
        });
        await server.start();
        console.log('Servidor localhost:8080');
    } catch (error) {
        console.log('Error ' + error);
    }
};

iniciar_server().then(r => {
        if (r) {
            console.log(r);
        }
    }
);
