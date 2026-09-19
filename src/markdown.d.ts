/* Vite sirve los .md como texto plano cuando se importan con ?raw.
   Sin esta declaración TypeScript no reconoce esos imports. */
declare module "*.md?raw" {
  const contenido: string;
  export default contenido;
}
