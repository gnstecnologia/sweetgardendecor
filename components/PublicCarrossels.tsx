'use client';

import type { MutableRefObject } from 'react';
import { useEffect, useId, useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, A11y } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import type { SiteData } from '@/lib/types';
import { publicImageSrc } from '@/lib/images';

const PRICE_ICON_SVG = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" aria-hidden>
    <path d="M256 144C256 108.7 284.7 80 320 80C355.3 80 384 108.7 384 144L384 192L256 192L256 144zM208 192L144 192C117.5 192 96 213.5 96 240L96 448C96 501 139 544 192 544L448 544C501 544 544 501 544 448L544 240C544 213.5 522.5 192 496 192L432 192L432 144C432 82.1 381.9 32 320 32C258.1 32 208 82.1 208 144L208 192zM232 240C245.3 240 256 250.7 256 264C256 277.3 245.3 288 232 288C218.7 288 208 277.3 208 264C208 250.7 218.7 240 232 240zM384 264C384 250.7 394.7 240 408 240C421.3 240 432 250.7 432 264C432 277.3 421.3 288 408 288C394.7 288 384 277.3 384 264z" />
  </svg>
);

function escapeHtmlAttr(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function SlideContent({
  item,
  index,
  total,
  kindLabel,
}: {
  item: SiteData['carrossels'][0]['slides'][0];
  index: number;
  total: number;
  kindLabel: string;
}) {
  const img = publicImageSrc(item.img);
  const imgHover = publicImageSrc(item.imgHover || item.img);
  const textoRaw = escapeHtmlAttr(item.texto || 'Solicitar Orçamento').replace(/&lt;br&gt;/gi, '<br>');
  const num = index + 1;
  const label = escapeHtmlAttr(`${kindLabel} ${num} / ${total}`);
  const alt = escapeHtmlAttr(`${kindLabel} ${num}`);
  const destaque = item.destaque ? (
    <div className="slide-destaque-badge" title="Destaque">
      ★
    </div>
  ) : null;

  return (
    <div className="widget-container" role="group" aria-roledescription="slide" aria-label={label}>
      <div className="image-wrapper">
        {destaque}
        <img decoding="async" src={img} alt={alt} className="widget-image" />
        <div className="price-button">{PRICE_ICON_SVG}</div>
      </div>
      <div className="image-wrapper hidden">
        {destaque}
        <img decoding="async" src={imgHover} alt="" className="widget-image" />
        <a
          href={item.link}
          className="orcamento-button"
          target="_blank"
          rel="noopener noreferrer"
          dangerouslySetInnerHTML={{ __html: textoRaw }}
        />
      </div>
    </div>
  );
}

function swiperLoopOk(n: number) {
  return n >= 4;
}

export default function PublicCarrossels({
  data,
  adminStripElementsRef,
  adminStripBlockId,
  adminScrollLayoutKey,
}: {
  data: SiteData;
  /** Painel admin: mapa id do carrossel → elemento com scroll horizontal das miniaturas. */
  adminStripElementsRef?: MutableRefObject<Record<string, HTMLDivElement | null>>;
  /** Id do bloco em `data.carrossels[0]` a sincronizar com `adminStripElementsRef`. */
  adminStripBlockId?: string;
  /** Quando muda, volta a ligar o listener (ex.: ordem ou nº de slides). */
  adminScrollLayoutKey?: string;
}) {
  const baseId = useId().replace(/:/g, '');
  const swiperRef = useRef<SwiperType | null>(null);

  useEffect(() => {
    if (!adminStripElementsRef || !adminStripBlockId) return;

    let scrollCleanup: (() => void) | undefined;
    let rafId = 0;
    let attempts = 0;
    const maxAttempts = 150;

    const tryAttach = () => {
      const strip = adminStripElementsRef.current[adminStripBlockId] ?? null;
      const sw = swiperRef.current;
      const slides = data.carrossels[0]?.slides ?? [];
      const n = slides.length;
      if (!strip || !sw || n < 1) {
        attempts += 1;
        if (attempts < maxAttempts) rafId = requestAnimationFrame(tryAttach);
        return;
      }

      const syncStripScrollToSwiper = () => {
        if ('destroyed' in sw && sw.destroyed) return;
        const maxScroll = Math.max(0, strip.scrollWidth - strip.clientWidth);
        let index = 0;
        if (maxScroll > 0 && n > 1) {
          index = Math.round((strip.scrollLeft / maxScroll) * (n - 1));
        }
        index = Math.max(0, Math.min(n - 1, index));
        const current = sw.params.loop ? sw.realIndex : sw.activeIndex;
        if (current === index) return;
        if (sw.params.loop) {
          sw.slideToLoop(index, 0);
        } else {
          sw.slideTo(index, 0);
        }
      };

      strip.addEventListener('scroll', syncStripScrollToSwiper, { passive: true });
      syncStripScrollToSwiper();
      scrollCleanup = () => strip.removeEventListener('scroll', syncStripScrollToSwiper);
    };

    tryAttach();

    return () => {
      cancelAnimationFrame(rafId);
      scrollCleanup?.();
    };
  }, [adminStripElementsRef, adminStripBlockId, adminScrollLayoutKey, data]);

  return (
    <>
      {data.carrossels.map((block) => {
        const slides = block.slides || [];
        if (!slides.length) return null;
        const cid = block.id.replace(/[^a-zA-Z0-9_-]/g, '_');
        const wrapId = `wrap-${baseId}-${cid}`;
        const loop = swiperLoopOk(slides.length);

        return (
          <div key={block.id} id={wrapId} className="carrossel-modelos-wrap" data-carrossel-id={cid}>
            <h2 className="carrossel-titulo">{block.titulo}</h2>
            <Swiper
              className="swiper carrossel-dynamic-swiper"
              modules={[Navigation, Pagination, A11y]}
              loop={loop}
              rewind={!loop}
              speed={500}
              spaceBetween={12}
              slidesPerGroup={1}
              slidesPerView={4}
              centeredSlides={false}
              breakpoints={{
                320: { slidesPerView: 1 },
                576: { slidesPerView: 2 },
                992: { slidesPerView: 3 },
                1200: { slidesPerView: 4 },
              }}
              navigation={{
                nextEl: `#${wrapId} .carrossel-nav-next`,
                prevEl: `#${wrapId} .carrossel-nav-prev`,
              }}
              pagination={{
                el: `#${wrapId} .carrossel-dynamic-pagination`,
                clickable: true,
              }}
              a11y={{
                prevSlideMessage: 'Slide anterior',
                nextSlideMessage: 'Próximo slide',
                paginationBulletMessage: 'Ir para o slide {{index}}',
              }}
              onSwiper={(sw) => {
                swiperRef.current = sw;
              }}
            >
              {slides.map((item, i) => (
                <SwiperSlide key={item.sid || `${block.id}-${i}`}>
                  <SlideContent item={item} index={i} total={slides.length} kindLabel={block.titulo} />
                </SwiperSlide>
              ))}
            </Swiper>
            <div className="carrossel-nav-prev" role="button" tabIndex={0} aria-label="Slide anterior">
              <svg viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <path d="M646 125C629 125 613 133 604 142L308 442C296 454 292 471 292 487 292 504 296 521 308 533L604 854C617 867 629 875 646 875 663 875 679 871 692 858 704 846 713 829 713 812 713 796 708 779 692 767L438 487 692 225C700 217 708 204 708 187 708 171 704 154 692 142 675 129 663 125 646 125Z" />
              </svg>
            </div>
            <div className="carrossel-nav-next" role="button" tabIndex={0} aria-label="Próximo slide">
              <svg viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <path d="M696 533C708 521 713 504 713 487 713 471 708 454 696 446L400 146C388 133 375 125 354 125 338 125 325 129 313 142 300 154 292 171 292 187 292 204 296 221 308 233L563 492 304 771C292 783 288 800 288 817 288 833 296 850 308 863 321 871 338 875 354 875 371 875 388 867 400 854L696 533Z" />
              </svg>
            </div>
            <div className="swiper-pagination carrossel-dynamic-pagination" />
          </div>
        );
      })}
    </>
  );
}
