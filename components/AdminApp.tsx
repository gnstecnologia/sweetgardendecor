'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Carrossel, SiteData, Slide } from '@/lib/types';
import { publicImageSrc } from '@/lib/images';
import PublicCarrossels from '@/components/PublicCarrossels';

const DEFAULT_LINK =
  'https://api.whatsapp.com/send?phone=5599999999999&text=Olá! Gostaria de solicitar um orçamento Sweet Garden.';
const DEFAULT_TEXTO = 'Solicitar Orçamento';

function newSid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 's_' + Math.random().toString(36).slice(2, 12);
}

function slug(s: string): string {
  return (
    String(s || '')
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'carrossel'
  );
}

function ensureSids(d: SiteData): SiteData {
  return {
    ...d,
    carrossels: d.carrossels.map((c) => ({
      ...c,
      reorder: !!c.reorder,
      slides: c.slides.map((s) => ({ ...s, sid: s.sid || newSid() })),
    })),
  };
}

function thumbSrc(sl: Slide): string {
  if (sl.img && /^https?:\/\//i.test(sl.img)) return sl.img;
  if (sl.img) return publicImageSrc(sl.img);
  return '';
}

/** MIME por vezes vem vazio (móveis); aceitar por extensão. */
function isLikelyImageFile(f: File): boolean {
  if (f.type.startsWith('image/')) return true;
  const name = f.name || '';
  return /\.(jpe?g|png|gif|webp|avif|heic|heif|bmp|tiff?|svg)$/i.test(name);
}

function dataTransferHasFiles(dt: DataTransfer): boolean {
  for (let i = 0; i < dt.types.length; i++) {
    if (dt.types[i] === 'Files') return true;
  }
  return false;
}

function mergeNewSlidesIntoCarousel(prev: SiteData, cid: string, newSlides: Slide[]): SiteData {
  const block = prev.carrossels.find((c) => c.id === cid);
  if (!block) return prev;
  return {
    ...prev,
    carrossels: prev.carrossels.map((c) => (c.id !== cid ? c : { ...c, slides: [...c.slides, ...newSlides] })),
  };
}

function SortableStripCard({
  slide,
  block,
  index,
  moveMode,
  menuSid,
  setMenuSid,
  onDelete,
  onMoveLeft,
  onMoveRight,
  onZoom,
  onEnableMoveMode,
}: {
  slide: Slide;
  block: Carrossel;
  index: number;
  moveMode: boolean;
  menuSid: string | null;
  setMenuSid: (sid: string | null) => void;
  onDelete: (sid: string) => void;
  onMoveLeft: (sid: string) => void;
  onMoveRight: (sid: string) => void;
  onZoom: (url: string) => void;
  onEnableMoveMode: () => void;
}) {
  const sid = slide.sid!;
  const n = block.slides.length;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sid,
    disabled: !moveMode,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
  } as const;
  const thumb = thumbSrc(slide);
  const menuOpen = menuSid === sid;

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        flex: '0 0 auto',
        width: 132,
        position: 'relative',
        touchAction: moveMode ? 'none' : 'auto',
      }}
      {...attributes}
    >
      <div
        style={{
          position: 'relative',
          borderRadius: 12,
          overflow: 'hidden',
          aspectRatio: '3 / 4',
          background: '#e8eee9',
          boxShadow: '0 2px 10px rgba(0,0,0,.08)',
          border: moveMode ? '2px solid #95d5b2' : '1px solid #e2e8e4',
        }}
      >
        {thumb ? (
          <img
            src={thumb}
            alt=""
            role="presentation"
            onClick={() => {
              if (!moveMode && thumb) onZoom(thumb);
            }}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              cursor: moveMode ? 'default' : 'zoom-in',
              pointerEvents: moveMode ? 'none' : 'auto',
            }}
          />
        ) : (
          <div style={{ fontSize: 12, color: '#5c6f62', textAlign: 'center', padding: 12 }}>Sem imagem</div>
        )}

        {moveMode ? (
          <button
            type="button"
            aria-label="Arrastar para reordenar"
            {...listeners}
            style={{
              position: 'absolute',
              inset: 0,
              border: 'none',
              background: 'transparent',
              cursor: 'grab',
              zIndex: 1,
            }}
          />
        ) : null}

        <div style={{ position: 'absolute', top: 6, right: 6, zIndex: 4 }} onPointerDown={(e) => e.stopPropagation()}>
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label="Opções da imagem"
            onClick={(e) => {
              e.stopPropagation();
              setMenuSid(menuOpen ? null : sid);
            }}
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              border: '1px solid rgba(0,0,0,.08)',
              background: 'rgba(255,255,255,.95)',
              cursor: 'pointer',
              fontSize: 18,
              lineHeight: 1,
              boxShadow: '0 2px 8px rgba(0,0,0,.08)',
            }}
          >
            ⋮
          </button>
          {menuOpen ? (
            <div
              role="menu"
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                right: 0,
                marginTop: 6,
                minWidth: 200,
                background: '#fff',
                border: '1px solid #e2e8e4',
                borderRadius: 10,
                boxShadow: '0 8px 24px rgba(0,0,0,.12)',
                overflow: 'hidden',
              }}
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onEnableMoveMode();
                  setMenuSid(null);
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '12px 14px',
                  border: 'none',
                  background: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                Mover ordem…
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  if (confirm('Remover esta imagem do carrossel?')) onDelete(sid);
                  setMenuSid(null);
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '12px 14px',
                  border: 'none',
                  background: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: 14,
                  color: '#b42318',
                }}
              >
                Excluir
              </button>
            </div>
          ) : null}
        </div>

        {moveMode ? (
          <div
            style={{
              position: 'absolute',
              bottom: 6,
              left: 6,
              right: 6,
              zIndex: 3,
              display: 'flex',
              gap: 6,
              justifyContent: 'space-between',
              pointerEvents: 'auto',
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Mover para a esquerda"
              disabled={index === 0}
              onClick={() => onMoveLeft(sid)}
              style={{
                flex: 1,
                minHeight: 36,
                borderRadius: 8,
                border: '1px solid #e2e8e4',
                background: 'rgba(255,255,255,.95)',
                cursor: index === 0 ? 'not-allowed' : 'pointer',
                fontSize: 16,
              }}
            >
              ←
            </button>
            <button
              type="button"
              aria-label="Mover para a direita"
              disabled={index >= n - 1}
              onClick={() => onMoveRight(sid)}
              style={{
                flex: 1,
                minHeight: 36,
                borderRadius: 8,
                border: '1px solid #e2e8e4',
                background: 'rgba(255,255,255,.95)',
                cursor: index >= n - 1 ? 'not-allowed' : 'pointer',
                fontSize: 16,
              }}
            >
              →
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function AdminApp({ initialData }: { initialData: SiteData }) {
  const router = useRouter();
  const [data, setData] = useState<SiteData>(() => ensureSids(initialData));
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [moveModeCid, setMoveModeCid] = useState<string | null>(null);
  const [menuSid, setMenuSid] = useState<string | null>(null);
  const [dropHighlightCid, setDropHighlightCid] = useState<string | null>(null);
  const [uploading, setUploading] = useState<{ cid: string; done: number; total: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  /** Evita corrida: o clique no input pode correr antes do React aplicar setState do cid. */
  const pendingUploadCidRef = useRef<string | null>(null);
  const dataRef = useRef(data);
  dataRef.current = data;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (!menuSid) return;
    const close = () => setMenuSid(null);
    const id = requestAnimationFrame(() => window.addEventListener('click', close));
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('click', close);
    };
  }, [menuSid]);

  const moveSlide = useCallback((cid: string, sid: string, dir: -1 | 1) => {
    setData((d) => ({
      ...d,
      carrossels: d.carrossels.map((c) => {
        if (c.id !== cid) return c;
        const i = c.slides.findIndex((s) => s.sid === sid);
        if (i < 0) return c;
        const j = i + dir;
        if (j < 0 || j >= c.slides.length) return c;
        const slides = [...c.slides];
        [slides[i], slides[j]] = [slides[j], slides[i]];
        return { ...c, slides };
      }),
    }));
  }, []);

  const deleteSlide = useCallback((cid: string, sid: string) => {
    setData((d) => ({
      ...d,
      carrossels: d.carrossels.map((c) => (c.id !== cid ? c : { ...c, slides: c.slides.filter((s) => s.sid !== sid) })),
    }));
  }, []);

  const uploadFile = async (file: File): Promise<string> => {
    const fd = new FormData();
    fd.set('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(typeof j.error === 'string' ? j.error : 'Upload falhou');
    if (typeof j.url !== 'string') throw new Error('Resposta inválida');
    return j.url;
  };

  const putSiteDataApi = async (payload: SiteData) => {
    const res = await fetch('/api/site-data', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(typeof j.error === 'string' ? j.error : 'Erro ao guardar');
  };

  const appendImagesToCarousel = async (cid: string, files: FileList | File[]) => {
    const list = Array.from(files).filter(isLikelyImageFile);
    if (!list.length) {
      setStatus({
        ok: false,
        msg: 'Nenhuma imagem reconhecida. Use JPEG, PNG, WebP, HEIC… (em alguns telemóveis o tipo vem vazio; o nome do ficheiro tem de parecer imagem).',
      });
      return;
    }

    const block = dataRef.current.carrossels.find((c) => c.id === cid);
    if (!block) return;
    const defLink = block.slides[0]?.link || DEFAULT_LINK;
    const defTexto = block.slides[0]?.texto || DEFAULT_TEXTO;

    setUploading({ cid, done: 0, total: list.length });
    setStatus(null);

    const uploaded: string[] = [];
    const errors: string[] = [];
    for (let i = 0; i < list.length; i++) {
      const f = list[i];
      try {
        uploaded.push(await uploadFile(f));
        setUploading({ cid, done: i + 1, total: list.length });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Upload falhou';
        errors.push(`${f.name}: ${msg}`);
      }
    }
    setUploading(null);

    if (!uploaded.length) {
      setStatus({ ok: false, msg: errors.join(' · ') || 'Nenhum upload concluído.' });
      return;
    }

    const newSlides: Slide[] = uploaded.map((url) => ({
      sid: newSid(),
      img: url,
      imgHover: '',
      link: defLink,
      texto: defTexto,
      destaque: false,
    }));

    const merged = mergeNewSlidesIntoCarousel(dataRef.current, cid, newSlides);
    setData(merged);
    dataRef.current = merged;

    try {
      await putSiteDataApi(merged);
      let msg = `${uploaded.length} imagem(ns) enviada(s) e catálogo guardado no servidor.`;
      if (errors.length) msg += ` Aviso: ${errors.join(' · ')}`;
      setStatus({ ok: true, msg });
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro';
      setStatus({
        ok: false,
        msg: `Imagens enviadas para disco/Blob, mas falhou guardar o catálogo: ${msg}. Use «Guardar no servidor» ou configure KV na Vercel.`,
      });
    }
  };

  const save = async () => {
    setSaving(true);
    setStatus(null);
    try {
      await putSiteDataApi(data);
      setStatus({ ok: true, msg: 'Guardado no servidor.' });
      router.refresh();
    } catch (e) {
      setStatus({ ok: false, msg: e instanceof Error ? e.message : 'Erro' });
    } finally {
      setSaving(false);
    }
  };

  const addCarousel = () => {
    const tit = window.prompt('Título do novo carrossel', 'Novo carrossel');
    if (tit === null) return;
    const t = tit.trim() || 'Novo carrossel';
    const id = slug(t) + '-' + Math.random().toString(36).slice(2, 5);
    setData((d) => ({
      ...d,
      carrossels: [...d.carrossels, { id, titulo: t, reorder: false, slides: [] }],
    }));
  };

  const onDragEnd = (cid: string, ids: string[]) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    setData((d) => ({
      ...d,
      carrossels: d.carrossels.map((c) =>
        c.id !== cid ? c : { ...c, slides: arrayMove(c.slides, oldIndex, newIndex) }
      ),
    }));
  };

  const openFilePicker = (cid: string) => {
    pendingUploadCidRef.current = cid;
    fileRef.current?.click();
  };

  const setCarouselTitulo = useCallback((cid: string, titulo: string) => {
    setData((d) => ({
      ...d,
      carrossels: d.carrossels.map((c) => (c.id === cid ? { ...c, titulo } : c)),
    }));
  }, []);

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/*,.heic,.heif"
        multiple
        className="sr-only"
        aria-hidden
        onChange={async (ev) => {
          const cid = pendingUploadCidRef.current;
          pendingUploadCidRef.current = null;
          const files = ev.target.files;
          ev.target.value = '';
          if (!cid || !files?.length) return;
          await appendImagesToCarousel(cid, files);
        }}
      />

      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'rgba(244,246,244,.95)',
          borderBottom: '1px solid #e2e8e4',
          padding: '0.75rem 1rem',
        }}
      >
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '1.05rem', flex: '1 1 200px' }}>Sweet Garden — painel</h1>
          <Link href="/" style={{ padding: '8px 12px', border: '1px solid #e2e8e4', borderRadius: 8, textDecoration: 'none', color: '#1a2e1f' }}>
            Ver site
          </Link>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: 'none',
              background: '#2d6a4f',
              color: '#fff',
              fontWeight: 600,
              cursor: saving ? 'wait' : 'pointer',
            }}
          >
            {saving ? 'A guardar…' : 'Guardar no servidor'}
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '1rem' }}>
        {status ? (
          <p
            role="status"
            style={{
              padding: '0.65rem 1rem',
              borderRadius: 8,
              background: status.ok ? '#e6f4ea' : '#fdecea',
              color: status.ok ? '#1e4620' : '#611a15',
            }}
          >
            {status.msg}
          </p>
        ) : null}

        {uploading ? (
          <p
            role="status"
            style={{
              padding: '0.65rem 1rem',
              borderRadius: 8,
              background: '#e8f0fc',
              color: '#1a2e4a',
              marginBottom: '1rem',
            }}
          >
            A enviar imagens para o servidor… {uploading.done}/{uploading.total}
          </p>
        ) : null}

        <p style={{ fontSize: '0.875rem', color: '#5c6f62', marginBottom: '1.25rem' }}>
          Ao adicionar imagens (botão ou largar ficheiros), cada ficheiro é enviado para <code>/api/upload</code> e o catálogo é guardado logo a seguir.
          Reordenar: <strong>Mover ordem…</strong>. Em local, ficheiros ficam em <code>public/uploads</code>; na Vercel use Blob + KV.
        </p>

        {data.carrossels.map((block) => {
          const ids = block.slides.map((s) => s.sid!);
          const moveMode = moveModeCid === block.id;
          const previewSlice: SiteData = { version: data.version, carrossels: [block] };

          return (
            <section
              key={block.id}
              style={{
                background: '#fff',
                border: '1px solid #e2e8e4',
                borderRadius: 14,
                marginBottom: 20,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #e2e8e4',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 10,
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#fafcfb',
                }}
              >
                <input
                  type="text"
                  value={block.titulo}
                  onChange={(e) => setCarouselTitulo(block.id, e.target.value)}
                  aria-label="Título do carrossel"
                  style={{
                    flex: '1 1 220px',
                    minWidth: 0,
                    margin: 0,
                    fontSize: '1.15rem',
                    fontWeight: 700,
                    fontFamily: 'inherit',
                    color: 'inherit',
                    border: '1px solid #e2e8e4',
                    borderRadius: 8,
                    padding: '6px 10px',
                    background: '#fff',
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!confirm('Excluir este carrossel inteiro?')) return;
                    setMoveModeCid((c) => (c === block.id ? null : c));
                    setData((d) => ({ ...d, carrossels: d.carrossels.filter((c) => c.id !== block.id) }));
                  }}
                  style={{
                    fontSize: 13,
                    color: '#b42318',
                    border: '1px solid #f5c2c0',
                    background: '#fff5f5',
                    borderRadius: 8,
                    padding: '6px 12px',
                    cursor: 'pointer',
                  }}
                >
                  Excluir carrossel
                </button>
              </div>

              <div
                style={{
                  padding: '12px 0 8px',
                  background: 'var(--sg-bg)',
                  borderBottom: '1px solid #e2e8e4',
                }}
              >
                <p style={{ margin: '0 16px 8px', fontSize: 12, color: '#5c6f62' }}>Pré-visualização (como no site)</p>
                <div style={{ pointerEvents: 'none', userSelect: 'none', maxHeight: 460, overflow: 'hidden' }}>
                  <PublicCarrossels data={previewSlice} />
                </div>
              </div>

              {moveMode ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    flexWrap: 'wrap',
                    padding: '10px 16px',
                    background: '#e8f5ee',
                    borderBottom: '1px solid #b7dfc8',
                    fontSize: 14,
                  }}
                >
                  <span>
                    <strong>Modo reordenar</strong> — arraste os cartões horizontalmente (ou use as setas). Deslize a faixa para ver todas as
                    imagens.
                  </span>
                  <button
                    type="button"
                    onClick={() => setMoveModeCid(null)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 8,
                      border: '1px solid #2d6a4f',
                      background: '#fff',
                      color: '#1a2e1f',
                      fontWeight: 600,
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    Concluir
                  </button>
                </div>
              ) : null}

              <div style={{ padding: '14px 12px 8px' }}>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd(block.id, ids)}>
                  <SortableContext items={ids} strategy={horizontalListSortingStrategy}>
                    <div
                      className="admin-strip-scroll"
                      style={{
                        display: 'flex',
                        gap: 12,
                        overflowX: 'auto',
                        overflowY: 'hidden',
                        paddingBottom: 8,
                        scrollSnapType: 'x proximity',
                        WebkitOverflowScrolling: 'touch',
                        scrollbarGutter: 'stable',
                      }}
                    >
                      {block.slides.map((sl, index) => (
                        <div key={sl.sid} style={{ scrollSnapAlign: 'start' }}>
                          <SortableStripCard
                            slide={sl}
                            block={block}
                            index={index}
                            moveMode={moveMode}
                            menuSid={menuSid}
                            setMenuSid={setMenuSid}
                            onDelete={(sid) => deleteSlide(block.id, sid)}
                            onMoveLeft={(sid) => moveSlide(block.id, sid, -1)}
                            onMoveRight={(sid) => moveSlide(block.id, sid, 1)}
                            onZoom={setLightbox}
                            onEnableMoveMode={() => setMoveModeCid(block.id)}
                          />
                        </div>
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>

                {!block.slides.length ? (
                  <p style={{ color: '#5c6f62', fontSize: 14, margin: '8px 4px 0' }}>Ainda não há imagens neste carrossel.</p>
                ) : null}
              </div>

              <div style={{ padding: '0 12px 16px' }}>
                <div
                  onDragEnter={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (dataTransferHasFiles(e.dataTransfer)) setDropHighlightCid(block.id);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.dataTransfer.dropEffect = 'copy';
                    setDropHighlightCid(block.id);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const rel = e.relatedTarget as Node | null;
                    if (rel && (e.currentTarget as HTMLElement).contains(rel)) return;
                    setDropHighlightCid((c) => (c === block.id ? null : c));
                  }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDropHighlightCid(null);
                    const fl = e.dataTransfer.files;
                    if (fl?.length) await appendImagesToCarousel(block.id, fl);
                  }}
                  style={{
                    borderRadius: 12,
                    border: dropHighlightCid === block.id ? '2px dashed #2d6a4f' : '2px dashed #b7c4bb',
                    background: dropHighlightCid === block.id ? '#f0faf4' : '#fafcfb',
                    padding: '22px 16px',
                    textAlign: 'center',
                    transition: 'border-color .15s, background .15s',
                  }}
                >
                  <p style={{ margin: '0 0 12px', fontSize: 14, color: '#5c6f62' }}>
                    Largue imagens aqui ou use o botão — <strong>{block.titulo}</strong>
                  </p>
                  <button
                    type="button"
                    disabled={!!uploading}
                    onClick={() => openFilePicker(block.id)}
                    style={{
                      minHeight: 48,
                      padding: '0 20px',
                      borderRadius: 10,
                      border: 'none',
                      background: uploading ? '#8aa899' : '#2d6a4f',
                      color: '#fff',
                      fontWeight: 600,
                      fontSize: 15,
                      cursor: uploading ? 'wait' : 'pointer',
                    }}
                  >
                    {uploading && uploading.cid === block.id
                      ? `A enviar… ${uploading.done}/${uploading.total}`
                      : 'Adicionar imagens neste carrossel'}
                  </button>
                </div>
              </div>
            </section>
          );
        })}

        <button
          type="button"
          onClick={addCarousel}
          style={{
            width: '100%',
            minHeight: 48,
            marginTop: 4,
            borderRadius: 10,
            border: '1px dashed #2d6a4f',
            background: '#fff',
            color: '#1a2e1f',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          + Novo carrossel
        </button>
      </div>

      {lightbox ? (
        <dialog open style={{ border: 'none', borderRadius: 12, padding: 0, maxWidth: '96vw', background: '#111' }}>
          <button
            type="button"
            onClick={() => setLightbox(null)}
            style={{ position: 'fixed', top: 12, right: 12, zIndex: 2, padding: '8px 12px', borderRadius: 8, cursor: 'pointer' }}
          >
            Fechar
          </button>
          <img src={lightbox} alt="" style={{ display: 'block', maxWidth: '96vw', maxHeight: '86vh' }} />
        </dialog>
      ) : null}
    </>
  );
}
