// =====================================================
// FRANCO SYSTEMS
// BACKEND + FRONTEND
// RUC + DNI
// =====================================================

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const path = require("path");

require("dotenv").config({
    path: path.join(__dirname, ".env")
});


// =====================================================
// APP
// =====================================================

const app = express();

const PORT =
    process.env.PORT || 3000;


// =====================================================
// MIDDLEWARE
// =====================================================

app.use(cors());
app.use(express.json());


// =====================================================
// API RUC
// =====================================================

app.get(
    "/api/ruc/:numero",
    async (req, res) => {

        try {

            const numero =
                String(
                    req.params.numero || ""
                )
                    .trim()
                    .replace(/\D/g, "");


            if (!/^\d{11}$/.test(numero)) {

                return res.status(400).json({
                    ok: false,
                    mensaje: "El RUC debe tener 11 dígitos."
                });

            }


            if (!process.env.API_TOKEN) {

                return res.status(500).json({
                    ok: false,
                    mensaje: "No se encontró API_TOKEN."
                });

            }


            console.log(
                "Consultando RUC:",
                numero
            );


            const respuesta =
                await axios.get(
                    "https://api.decolecta.com/v1/sunat/ruc",
                    {
                        params: {
                            numero: numero
                        },

                        headers: {
                            Accept: "application/json",
                            Authorization:
                                `Bearer ${process.env.API_TOKEN}`
                        },

                        timeout: 15000
                    }
                );


            console.log(
                "RUC encontrado:",
                numero
            );


            return res.json(
                respuesta.data
            );


        } catch (error) {

            console.error(
                "ERROR RUC:",
                error.response?.data ||
                error.message
            );


            return res
                .status(
                    error.response?.status ||
                    500
                )
                .json({

                    ok: false,

                    mensaje:
                        "Error consultando RUC.",

                    detalle:
                        error.response?.data ||
                        error.message

                });

        }

    }
);


// =====================================================
// API DNI
// =====================================================

app.get(
    "/api/dni/:numero",
    async (req, res) => {

        try {

            const numero =
                String(
                    req.params.numero || ""
                )
                    .trim()
                    .replace(/\D/g, "");


            if (!/^\d{8}$/.test(numero)) {

                return res.status(400).json({
                    ok: false,
                    mensaje: "El DNI debe tener 8 dígitos."
                });

            }


            if (!process.env.API_TOKEN) {

                return res.status(500).json({
                    ok: false,
                    mensaje: "No se encontró API_TOKEN."
                });

            }


            console.log(
                "Consultando DNI:",
                numero
            );


            const respuesta =
                await axios.get(
                    "https://api.decolecta.com/v1/reniec/dni",
                    {
                        params: {
                            numero: numero
                        },

                        headers: {
                            Accept: "application/json",
                            Authorization:
                                `Bearer ${process.env.API_TOKEN}`
                        },

                        timeout: 15000
                    }
                );


            console.log(
                "DNI encontrado:",
                numero
            );


            return res.json(
                respuesta.data
            );


        } catch (error) {

            console.error(
                "ERROR DNI:",
                error.response?.data ||
                error.message
            );


            return res
                .status(
                    error.response?.status ||
                    500
                )
                .json({

                    ok: false,

                    mensaje:
                        "Error consultando DNI.",

                    detalle:
                        error.response?.data ||
                        error.message

                });

        }

    }
);


// =====================================================
// FRONTEND
// =====================================================

const PUBLIC_DIR =
    path.join(
        __dirname,
        "..",
        "public"
    );


app.use(
    express.static(
        PUBLIC_DIR
    )
);


// =====================================================
// INICIO
// =====================================================

app.get(
    "/",
    (req, res) => {

        res.sendFile(
            path.join(
                PUBLIC_DIR,
                "index.html"
            )
        );

    }
);


// =====================================================
// SERVIDOR
// =====================================================

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            "=================================="
        );

        console.log(
            "FRANCO SYSTEMS"
        );

        console.log(
            `Servidor: http://localhost:${PORT}`
        );

        console.log(
            "Token:",
            process.env.API_TOKEN
                ? "CARGADO"
                : "NO ENCONTRADO"
        );

        console.log(
            "RUC: /api/ruc/:numero"
        );

        console.log(
            "DNI: /api/dni/:numero"
        );

        console.log(
            "=================================="
        );

    }
);