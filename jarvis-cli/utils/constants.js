const PREFIXES = {
  DISENO: {
    name: "(UX) Diseño - Contrato Swagger ",
    prefix: "ds"
  },
  CANAL: {
    name: "(CN) Microservicio Canal",
    prefix: "cn"
  },
  NEGOCIO: {
    name: "(BS) Microservicio Negocio",
    prefix: "bs"
  }
};

const GENERATOR_CONFIG = {
  prefix: {
    channel: "ms-cn",
    business: "ms-bs",
  },
  defaultType: "business", // "channel" | "business"
};

const PROJECT_FOLDERS = [
  "api",
  "api/domains",
  "apps",
  "libs"
];

const TEMPLATES = {
  OPENAPI: "root-openapi.yaml"
};

const CREATE_PROJECT_MESSAGES = {
  "TIPOPROYECTO": "Seleccione el tipo de proyecto a configurar",
  "NOMBREPROYECTO": "Ingrese el nombre del proyecto:",
  "NOMBREPROYECTO_REQUIRED": "Debe ingresar un nombre",
  "NOMBREPROYECTO_LONGITUDMINIMA": "El nombre debe tener al menos 3 caracteres",
  "INFO_ESTRUCTURA_CREADA": "📁 Estructura base creada",
  "INFO_ESTRUCTURA_GENERADA": "📂 Estructura generada:\n",
  "WARN_TEMPLATE_NOTFOUND": "⚠ No se encontró el template openapi.yaml",
  "INFO_TEMPLATE_COPIADO": "📄 Template OpenAPI copiado",
  "INFO_PROJECT_INIT": "\n🚀 Jarvis CLI - Crear Proyecto\n",
  "INFO_PROJECT_CREADA": "\n✅ Proyecto creado correctamente\n",
  "INFO_SIGUIENTES_PASOS": "Siguientes pasos desde la consola de comandos o tu shell:\n",
  "ERROR_PROJECT_CREADA": "\n❌ Error creando el proyecto\n"
}

const RETURN ={
  "SUCCESS": true,
  "FAILED": false
}

const PROMPT_TYPE = {
  "LIST": "list",
  "INPUT": "input"
}

const PROMPT_NAME = {
  "PREFIX": "prefix",
  "NAME": "name"
}


module.exports = {
  PREFIXES,
  PROJECT_FOLDERS,
  TEMPLATES,
  CREATE_PROJECT_MESSAGES,
  PROMPT_TYPE,
  PROMPT_NAME,
  GENERATOR_CONFIG,
  RETURN
};