export interface CumplimientoObjetivo {
  _id?: string;
  coordinador: string;
  semana: string;
  tipo: 'mora' | 'creditos' | 'fichas' | 'renovacion';
  fechaRegistro: string; 

  // Mora
  moraInicial?: number;
  moraFinal?: number;

  // Meta Mora (grupo individual)
  gpoindm?: string;
  metaM?: number;
  recupM?: number;

  // Fichas
  fichasCerrar?: number;
  fichasFaltantes?: number;
  fichasCerradas?: number;

  // Créditos / GPO/IND Nuevos
  gpoindInicial?: number;
  gpoindFinal?: number;
  metaGpo?: number;
  completadoGpo?: number;
  metaInd?: number;
  completadoInd?: number;

  // Renovaciones
  gpoindProyectado?: number;
  gpoindRenovado?: number;
  metaProyec?: number;
  completadosProyec?: number;
}
