import type { FactionCraftingInfo } from "./types";
import type { GameId } from "./loaders";

// Which physical piece a faction activates to craft, and how it's obtained/used. Verified
// against the Law of Root (6.2.1, 8.2.1) — see game-content/root/rules-reference/NOTES.md.
// Only factions with a complete/partial turn guide are covered here; others simply have no
// entry yet (extend when their guide is written).
const CRAFTING_INFO_BY_GAME: Record<GameId, Record<string, FactionCraftingInfo>> = {
  root: {
    marquise: {
      factionId: "marquise",
      translations: {
        es: {
          pieceName: "Taller",
          obtain:
            "Constrúyelo en un claro que gobiernes; una vez construido, sigue siendo utilizable para fabricar aunque dejes de gobernar ese claro, salvo que sea destruido.",
        },
      },
    },
    alliance: {
      factionId: "alliance",
      translations: {
        es: {
          pieceName: "Ficha de simpatía",
          obtain: "Se coloca mediante las acciones de Revuelta o Extender simpatía; no requiere gobernar el claro para poder usarla.",
        },
      },
    },
    eyrie: {
      factionId: "eyrie",
      translations: {
        es: {
          pieceName: "Nido",
          obtain: "Se coloca con la acción Construir, forzada por el Decreto, en un claro que gobiernes. Por Desdén al Comercio, fabricar un objeto solo anota 1 punto de victoria en vez del valor impreso.",
        },
      },
    },
    vagabond: {
      factionId: "vagabond",
      translations: {
        es: {
          pieceName: "Peón del Vagabundo",
          obtain: "No hay una pieza de fabricación como tal: el Vagabundo fabrica agotando 1 Martillo por cada icono de fabricación de la carta, sin el límite de una vez por turno que tienen las demás facciones.",
        },
      },
    },
    riverfolk: {
      factionId: "riverfolk",
      translations: {
        es: {
          pieceName: "Fondos",
          obtain: "La Compañía Ribereña no tiene ninguna pieza de fabricación: compromete fondos (guerreros) según el coste de la carta, que van a sus pistas de Puestos Comerciales en vez de a una casilla de Comprometidos normal.",
        },
      },
    },
    lizard: {
      factionId: "lizard",
      translations: {
        es: {
          pieceName: "Jardín",
          obtain: "Se coloca con la acción Construir en un claro del palo Paria. Ojo: solo los Jardines cuyo palo coincida con el Paria ACTUAL pueden activarse para fabricar — y el Paria cambia cada Alba.",
        },
      },
    },
    duchy: {
      factionId: "duchy",
      translations: {
        es: {
          pieceName: "Ciudadela o Mercado",
          obtain: "Se colocan con la acción Construir (propia o de un Ministro jurado) en un claro que gobiernes. Se fabrica con ellas durante tu Noche, no tu Día.",
        },
      },
    },
    keepers: {
      factionId: "keepers",
      translations: {
        es: {
          pieceName: "Estación de Paso",
          obtain: "Se coloca con la acción Acampar (sustituye a un guerrero). Puede activarse para fabricar sin importar su tipo (cara o cruz).",
        },
      },
    },
    twilight: {
      factionId: "twilight",
      translations: {
        es: {
          pieceName: "Asamblea",
          obtain: "Se coloca con la acción Reunir Asamblea. Se fabrica con ellas durante tu Noche, con la acción Inspirar.",
        },
      },
    },
    knaves: {
      factionId: "knaves",
      translations: {
        es: {
          pieceName: "Capitán en Acción o fervor",
          obtain: "No hay una pieza de fabricación fija: fabricas activando a tu Capitán en Acción (con Fisgar) o fichas de fervor en su claro (con Servir), durante tu Día.",
        },
      },
    },
  },
};

export function getFactionCraftingInfo(gameId: GameId, factionId: string): FactionCraftingInfo | undefined {
  return CRAFTING_INFO_BY_GAME[gameId]?.[factionId];
}

export function getAllFactionCraftingInfo(gameId: GameId): FactionCraftingInfo[] {
  return Object.values(CRAFTING_INFO_BY_GAME[gameId] ?? {});
}
