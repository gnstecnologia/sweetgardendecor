'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
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
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
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

function AdminSlideRow({
  slide,
  block,
  index,
  reorder,
  onZoom,
  onPatchSlide,
  onDelete,
  onMoveUp,
  onMoveDown,
  onUploadMain,
  onUploadHover,
}: {
  slide: Slide;
  block: Carrossel;
  index: number;
  reorder: boolean;
  onZoom: (url: string) => void;
  onPatchSlide: (sid: string, patch: Partial<Slide>) => void;
  onDelete: (sid: string) => void;
  onMoveUp: (sid: string) => void;
  onMoveDown: (sid: string) => void;
  onUploadMain: (sid: string, file: File) => void;
  onUploadHover: (sid: string, file: File) => void;
}) {
  const sid = slide.sid!;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sid,
    disabled: !reorder,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
  };
  const thumb = thumbSrc(slide);
  const n = block.slides.length;

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        gap: 10,
        padding: 10,
        marginBottom: 6,
        borderRadius: 10,
        border: reorder ? '1px solid #b7dfc8' : '1px solid transparent',
        background: reorder ? '#f0faf4' : '#fff',
      }}
      {...attributes}
    >
      {reorder ? (
        <button
          type="button"
          aria-label="Arrastar para reordenar"
          style={{
            flex: '0 0 36px',
            cursor: 'grab',
            border: 'none',
            background: 'transparent',
            fontSize: '1.2rem',
            padding: 4,
            color: '#5c6f62',
            touchAction: 'none',
          }}
          {...listeners}
        >
          ⠿
        </button>
      ) : null}

      <div
        className="admin-thumb-wrap"
        style={{
          position: 'relative',
          flex: '0 0 88px',
          width: 88,
          borderRadius: 8,
          overflow: 'hidden',
          aspectRatio: '3/4',
          background: '#e8eee9',
        }}
      >
        {thumb ? (
          <img
            src={thumb}
            alt=""
            onClick={() => thumb && onZoom(thumb)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', cursor: 'zoom-in' }}
          />
        ) : (
          <div style={{ fontSize: 12, color: '#5c6f62', textAlign: 'center', padding: 8 }}>Sem imagem</div>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 6 }}>
          <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input type="checkbox" checked={!!slide.destaque} onChange={(e) => onPatchSlide(sid, { destaque: e.target.checked })} />
            Destaque (estrela amarela no site)
          </label>
          <details className="admin-menu" style={{ position: 'relative' }}>
            <summary
              style={{
                listStyle: 'none',
                cursor: 'pointer',
                padding: '6px 10px',
                border: '1px solid #e2e8e4',
                borderRadius: 8,
                fontSize: 18,
                lineHeight: 1,
              }}
            >
              ⋮
            </summary>
            <div
              style={{
                position: 'absolute',
                right: 0,
                zIndex: 20,
                marginTop: 4,
                background: '#fff',
                border: '1px solid #e2e8e4',
                borderRadius: 8,
                boxShadow: '0 4px 12px rgba(0,0,0,.1)',
                minWidth: 160,
              }}
            >
              <button
                type="button"
                disabled={index === 0}
                onClick={() => onMoveUp(sid)}
                style={{ display: 'block', width: '100%', padding: '10px 12px', border: 'none', background: 'none', textAlign: 'left', cursor: index === 0 ? 'not-allowed' : 'pointer' }}
              >
                Subir
              </button>
              <button
                type="button"
                disabled={index >= n - 1}
                onClick={() => onMoveDown(sid)}
                style={{ display: 'block', width: '100%', padding: '10px 12px', border: 'none', background: 'none', textAlign: 'left', cursor: index >= n - 1 ? 'not-allowed' : 'pointer' }}
              >
                Descer
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm('Remover esta foto do carrossel?')) onDelete(sid);
                }}
                style={{ display: 'block', width: '100%', padding: '10px 12px', border: 'none', background: 'none', textAlign: 'left', color: '#b42318', cursor: 'pointer' }}
              >
                Remover
              </button>
            </div>
          </details>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
          <label style={{ fontSize: 12, padding: '4px 8px', border: '1px solid #e2e8e4', borderRadius: 6, cursor: 'pointer' }}>
            Trocar…
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && onUploadMain(sid, e.target.files[0])} />
          </label>
          <label style={{ fontSize: 12, padding: '4px 8px', border: '1px solid #e2e8e4', borderRadius: 6, cursor: 'pointer' }}>
            Hover…
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && onUploadHover(sid, e.target.files[0])} />
          </label>
        </div>

        <input
          placeholder="URL ou caminho da imagem"
          value={slide.img}
          onChange={(e) => onPatchSlide(sid, { img: e.target.value })}
          style={{ width: '100%', marginBottom: 6, minHeight: 40, padding: '0 8px', borderRadius: 8, border: '1px solid #e2e8e4' }}
        />
        <input
          placeholder="Imagem hover (opcional)"
          value={slide.imgHover || ''}
          onChange={(e) => onPatchSlide(sid, { imgHover: e.target.value })}
          style={{ width: '100%', marginBottom: 6, minHeight: 40, padding: '0 8px', borderRadius: 8, border: '1px solid #e2e8e4' }}
        />
        <input
          placeholder="Link do botão"
          value={slide.link}
          onChange={(e) => onPatchSlide(sid, { link: e.target.value })}
          style={{ width: '100%', marginBottom: 6, minHeight: 40, padding: '0 8px', borderRadius: 8, border: '1px solid #e2e8e4' }}
        />
        <textarea
          placeholder="Texto do botão"
          value={slide.texto}
          onChange={(e) => onPatchSlide(sid, { texto: e.target.value })}
          rows={3}
          style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #e2e8e4', resize: 'vertical' }}
        />

        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button type="button" disabled={index === 0} onClick={() => onMoveUp(sid)} style={{ minHeight: 40, padding: '0 12px', borderRadius: 8, border: '1px solid #e2e8e4', background: '#fff', cursor: index === 0 ? 'not-allowed' : 'pointer' }}>
            Subir
          </button>
          <button type="button" disabled={index >= n - 1} onClick={() => onMoveDown(sid)} style={{ minHeight: 40, padding: '0 12px', borderRadius: 8, border: '1px solid #e2e8e4', background: '#fff', cursor: index >= n - 1 ? 'not-allowed' : 'pointer' }}>
            Descer
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm('Remover esta foto do carrossel?')) onDelete(sid);
            }}
            style={{ minHeight: 40, padding: '0 12px', borderRadius: 8, border: '1px solid #f5c2c0', color: '#b42318', background: '#fff5f5', cursor: 'pointer' }}
          >
            Remover
          </button>
        </div>
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
  const [previewBlockId, setPreviewBlockId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const patchSlide = useCallback((cid: string, sid: string, patch: Partial<Slide>) => {
    setData((d) => ({
      ...d,
      carrossels: d.carrossels.map((c) =>
        c.id !== cid
          ? c
          : {
              ...c,
              slides: c.slides.map((s) => (s.sid === sid ? { ...s, ...patch } : s)),
            }
      ),
    }));
  }, []);

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

  const save = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch('/api/site-data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof j.error === 'string' ? j.error : 'Erro ao guardar');
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

  const previewData = useMemo((): SiteData | null => {
    if (!previewBlockId) return null;
    const b = data.carrossels.find((c) => c.id === previewBlockId);
    if (!b) return null;
    return { version: data.version, carrossels: [b] };
  }, [data, previewBlockId]);

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

  return (
    <>
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
        <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '1.05rem', flex: '1 1 200px' }}>Sweet Garden — painel</h1>
          <Link href="/" style={{ padding: '8px 12px', border: '1px solid #e2e8e4', borderRadius: 8, textDecoration: 'none', color: '#1a2e1f' }}>
            Ver site
          </Link>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#2d6a4f', color: '#fff', fontWeight: 600, cursor: saving ? 'wait' : 'pointer' }}
          >
            {saving ? 'A guardar…' : 'Guardar no servidor'}
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '1rem' }}>
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

        <p style={{ fontSize: '0.875rem', color: '#5c6f62' }}>
          Clique em <strong>Guardar no servidor</strong> para persistir. Uploads vão para a Vercel Blob (produção) ou <code>public/uploads</code> em local.
        </p>

        <button
          type="button"
          onClick={addCarousel}
          style={{ width: '100%', minHeight: 48, marginBottom: 16, borderRadius: 10, border: 'none', background: '#2d6a4f', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
        >
          + Novo carrossel
        </button>

        {data.carrossels.map((block) => {
          const ids = block.slides.map((s) => s.sid!);
          return (
            <section key={block.id} style={{ background: '#fff', border: '1px solid #e2e8e4', borderRadius: 12, marginBottom: 16, overflow: 'hidden' }}>
              <div style={{ padding: '0.85rem 1rem', borderBottom: '1px solid #e2e8e4', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' }}>
                <label style={{ flex: '1 1 200px' }}>
                  <span style={{ fontSize: '0.8rem', color: '#5c6f62', display: 'block' }}>Título</span>
                  <input
                    style={{ width: '100%', minHeight: 44, padding: '0 0.65rem', borderRadius: 8, border: '1px solid #e2e8e4' }}
                    value={block.titulo}
                    onChange={(e) =>
                      setData((d) => ({
                        ...d,
                        carrossels: d.carrossels.map((c) => (c.id === block.id ? { ...c, titulo: e.target.value } : c)),
                      }))
                    }
                  />
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (!confirm('Excluir este carrossel inteiro?')) return;
                    setData((d) => ({ ...d, carrossels: d.carrossels.filter((c) => c.id !== block.id) }));
                  }}
                  style={{ color: '#b42318', border: '1px solid #f5c2c0', background: '#fff5f5', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}
                >
                  Excluir carrossel
                </button>
              </div>
              <div style={{ padding: '0.75rem 1rem', background: '#fafcfb', borderBottom: '1px solid #e2e8e4', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input
                    type="checkbox"
                    checked={!!block.reorder}
                    onChange={(e) =>
                      setData((d) => ({
                        ...d,
                        carrossels: d.carrossels.map((c) => (c.id === block.id ? { ...c, reorder: e.target.checked } : c)),
                      }))
                    }
                  />
                  Modo reordenar (arrastar alça)
                </label>
                <label style={{ padding: '8px 12px', border: '1px solid #e2e8e4', borderRadius: 8, cursor: 'pointer' }}>
                  Adicionar fotos
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    onChange={async (ev) => {
                      const files = ev.target.files;
                      if (!files?.length) return;
                      const defLink = block.slides[0]?.link || DEFAULT_LINK;
                      const defTexto = block.slides[0]?.texto || DEFAULT_TEXTO;
                      const newSlides: Slide[] = [];
                      for (let i = 0; i < files.length; i++) {
                        const f = files[i];
                        if (!f.type.startsWith('image/')) continue;
                        try {
                          const url = await uploadFile(f);
                          newSlides.push({ sid: newSid(), img: url, imgHover: '', link: defLink, texto: defTexto, destaque: false });
                        } catch (err) {
                          setStatus({ ok: false, msg: err instanceof Error ? err.message : 'Upload falhou' });
                        }
                      }
                      if (newSlides.length) {
                        setData((d) => ({
                          ...d,
                          carrossels: d.carrossels.map((c) => (c.id === block.id ? { ...c, slides: [...c.slides, ...newSlides] } : c)),
                        }));
                      }
                      ev.target.value = '';
                    }}
                  />
                </label>
                <button type="button" onClick={() => setPreviewBlockId(block.id)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8e4', background: '#fff', cursor: 'pointer' }}>
                  Pré-visualizar
                </button>
              </div>

              <div style={{ padding: 8 }}>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd(block.id, ids)}>
                  <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                    {block.slides.map((sl, index) => (
                      <AdminSlideRow
                        key={sl.sid}
                        slide={sl}
                        block={block}
                        index={index}
                        reorder={!!block.reorder}
                        onZoom={setLightbox}
                        onPatchSlide={(sid, patch) => patchSlide(block.id, sid, patch)}
                        onDelete={(sid) => deleteSlide(block.id, sid)}
                        onMoveUp={(sid) => moveSlide(block.id, sid, -1)}
                        onMoveDown={(sid) => moveSlide(block.id, sid, 1)}
                        onUploadMain={async (sid, file) => {
                          try {
                            const url = await uploadFile(file);
                            patchSlide(block.id, sid, { img: url });
                          } catch (err) {
                            setStatus({ ok: false, msg: err instanceof Error ? err.message : 'Upload falhou' });
                          }
                        }}
                        onUploadHover={async (sid, file) => {
                          try {
                            const url = await uploadFile(file);
                            patchSlide(block.id, sid, { imgHover: url });
                          } catch (err) {
                            setStatus({ ok: false, msg: err instanceof Error ? err.message : 'Upload falhou' });
                          }
                        }}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
                {!block.slides.length ? <p style={{ color: '#5c6f62', fontSize: '0.9rem' }}>Nenhuma foto. Use «Adicionar fotos».</p> : null}
              </div>
            </section>
          );
        })}
      </div>

      {lightbox ? (
        <dialog open style={{ border: 'none', borderRadius: 12, padding: 0, maxWidth: '96vw', background: '#111' }}>
          <button type="button" onClick={() => setLightbox(null)} style={{ position: 'fixed', top: 12, right: 12, zIndex: 2, padding: '8px 12px', borderRadius: 8, cursor: 'pointer' }}>
            Fechar
          </button>
          <img src={lightbox} alt="" style={{ display: 'block', maxWidth: '96vw', maxHeight: '86vh' }} />
        </dialog>
      ) : null}

      {previewBlockId && previewData ? (
        <dialog open style={{ border: 'none', borderRadius: 12, padding: '1rem', maxWidth: 'min(1100px, 98vw)', maxHeight: '90vh', overflow: 'auto', background: '#f4f6f4' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <strong>Pré-visualização</strong>
            <button type="button" onClick={() => setPreviewBlockId(null)} style={{ padding: '8px 12px', borderRadius: 8, cursor: 'pointer' }}>
              Fechar
            </button>
          </div>
          <PublicCarrossels data={previewData} />
        </dialog>
      ) : null}
    </>
  );
}
