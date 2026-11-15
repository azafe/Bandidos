// Mientras se imprime, los gráficos se dibujan con un ancho fijo pensado para
// la hoja (A4 apaisada) en vez de medir la pantalla: las diapositivas ocultas
// miden cero y al imprimir no se vuelven a medir a tiempo.
import { createContext } from "react";

export const PrintContext = createContext(false);

// Ancho útil de una diapositiva impresa y de la columna ancha cuando la
// diapositiva tiene dos columnas.
export const PRINT_WIDTH = { full: 900, split: 600 };
