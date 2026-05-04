export type Slide = {
  sid?: string;
  img: string;
  imgHover?: string;
  link: string;
  texto: string;
  destaque?: boolean;
};

export type Carrossel = {
  id: string;
  titulo: string;
  /** Apenas UI do painel; pode persistir no JSON. */
  reorder?: boolean;
  slides: Slide[];
};

export type SiteData = {
  version: number;
  carrossels: Carrossel[];
};
