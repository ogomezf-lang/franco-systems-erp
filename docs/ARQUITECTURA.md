# Arquitectura — Franco Systems ERP v2 Cloud

```text
Laptop / Navegador / PWA instalada
              |
              | HTTPS
              v
        Node.js + Express
        (Render)
          |       |
          |       +--> Decolecta DNI/RUC
          |
          +--> Supabase Auth
          +--> PostgreSQL
              ├── companies
              ├── profiles
              ├── clients
              ├── products
              ├── settings
              ├── quote_sequences
              ├── quotes
              └── quote_items
```

## Seguridad

- El navegador recibe un token de sesión de Supabase.
- Cada llamada al backend lleva ese token.
- El backend verifica el usuario antes de acceder a datos.
- Cada usuario pertenece a una `company_id`.
- Todas las consultas filtran por la empresa del usuario.
- `SUPABASE_SECRET_KEY` nunca se envía al navegador ni se sube a GitHub.
- `API_TOKEN` de Decolecta nunca se envía al navegador.
- RLS está habilitado en las tablas principales como capa adicional.

## Roles

### ADMIN
- Clientes, productos y cotizaciones.
- Configuración de empresa.
- Gestión de usuarios.
- Eliminación de clientes/productos.

### OPERADOR
- Clientes, productos y cotizaciones.
- Puede consultar configuración.
- No administra usuarios ni datos críticos de empresa.
