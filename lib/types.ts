export type Slide = {
  sid?: string;
  img: string;
  imgHover?: string;
  link: string;
  texto: string;
  destaque?: boolean;
  /** Só no painel admin durante upload; nunca persistir. */
  clientUploadStatus?: 'preview' | 'uploading' | 'error';
  clientUploadError?: string;
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
