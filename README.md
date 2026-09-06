# Franco Systems - Classic Cloud

Esta versión conserva la identidad y el flujo del **Franco Systems Business ERP v1.0**, pero cambia el almacenamiento local por un motor cloud seguro.

## Qué se conserva del sistema clásico

- Interfaz azul oscuro / celeste, menú lateral y dashboard clásico.
- Formulario de clientes dentro de la página.
- Catálogo clásico de productos/servicios con tipo, moneda y modo de precio.
- Cotizador con MONEDA, COMPROBANTE, MODO DE PRECIO y DESCUENTO porcentual.
- Precio con IGV / valor sin IGV.
- Retención de RHE 8% cuando corresponde.
- Historial, editar, anular y reactivar.
- PDF clásico con logo, RUC, datos del cliente, importe en letras, condiciones y medios de pago en tarjetas.
- Cotización anulada con sello rojo `COTIZACIÓN ANULADA`.

## Qué cambia por dentro

- Supabase/PostgreSQL reemplaza localStorage para clientes, productos, configuración y cotizaciones.
- Login real con usuarios ADMIN y OPERADOR.
- Correlativo seguro en nube.
- DNI/RUC se consulta desde el backend para no exponer el API token.
- PWA instalable en PC/celular.
- Preparado para Render para funcionar con la laptop apagada.

## SI YA VIENES DE FRANCO SYSTEMS v2 CLOUD

**No crees otro proyecto Supabase y no ejecutes `supabase.sql` otra vez.**

Ejecuta una sola vez:

`database/MIGRAR_A_CLASSIC_CLOUD.sql`

La migración solo agrega campos necesarios para recuperar funciones clásicas. No borra tus usuarios, clientes, productos, cotizaciones ni correlativos.

Después reemplaza los archivos de la aplicación con el parche Classic Cloud. Conserva tu archivo `.env` actual.

## Instalación nueva

Solo para una instalación desde cero se usa `database/supabase.sql`.

## Variables privadas

Nunca subir `.env` a GitHub. Mantener en servidor:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `API_TOKEN` (Decolecta)

## Fórmulas clásicas

- Descuento = subtotal x porcentaje / 100.
- FACTURA/BOLETA + `CON_IGV`: el total ingresado ya incluye IGV; se extraen base e IGV.
- FACTURA/BOLETA + `SIN_IGV`: el subtotal después del descuento es base y se suma IGV 18%.
- RHE: no aplica IGV; si la base después del descuento supera S/ 1,500, retención 8%.
- `SIN_IGV`: no aplica impuesto ni retención.

## Arranque local

```bash
npm install
npm start
```

Abrir `http://localhost:3000`.


## Classic Cloud v1.1.0
Se restablece el módulo Cuentas, el flujo clásico de clientes/productos/cotizaciones y la vista A4 clásica, manteniendo Supabase y la API segura.
