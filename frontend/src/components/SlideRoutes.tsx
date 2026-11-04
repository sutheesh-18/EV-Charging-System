import { useLayoutEffect, useRef, type ReactNode } from "react";
import { Routes, useLocation } from "react-router-dom";
import { AnimatePresence, motion, type Variants } from "framer-motion";

/**
 * Slide transition between the public pages.
 *
 * The old page and the new page move together (no blank gap):
 * moving to a page that is later in PUBLIC_ORDER pushes the old page out
 * to the left while the new one slides in from the right, and the other
 * way round when moving back.
 */
const PUBLIC_ORDER = ["/", "/login", "/register"];

const SLIDE = { duration: 0.6, ease: [0.65, 0, 0.35, 1] as const };
const FADE = { duration: 0.25, ease: "easeOut" as const };

type Custom = { dir: 1 | -1; slide: boolean };

const variants: Variants = {
  enter: ({ dir, slide }: Custom) => ({
    x: slide ? `${dir * 100}%` : 0,
    opacity: slide ? 1 : 0,
  }),
  center: ({ slide }: Custom) => ({
    x: 0,
    opacity: 1,
    transition: slide ? SLIDE : FADE,
  }),
  exit: ({ dir, slide }: Custom) => ({
    x: slide ? `${dir * -100}%` : 0,
    opacity: slide ? 1 : 0,
    transition: slide ? SLIDE : FADE,
  }),
};

type LenisLike = { scrollTo: (y: number, o?: { immediate?: boolean }) => void };

export default function SlideRoutes({ children }: { children: ReactNode }) {
  const location = useLocation();
  const path = location.pathname;

  // the page we came from (updated after every navigation)
  const prevPath = useRef(path);
  const from = PUBLIC_ORDER.indexOf(prevPath.current);
  const to = PUBLIC_ORDER.indexOf(path);

  const slide = from !== -1 && to !== -1 && from !== to;
  const dir: 1 | -1 = to >= from ? 1 : -1;
  const custom: Custom = { dir, slide };

  // all non-public pages (dashboard, admin, ...) share one key, so moving
  // between them does not replay the transition
  const key = to !== -1 ? path : "app";

  // start every new page at the top, before it is painted
  useLayoutEffect(() => {
    const lenis = (window as unknown as { __lenis?: LenisLike }).__lenis;
    lenis?.scrollTo(0, { immediate: true });
    window.scrollTo(0, 0);
    prevPath.current = path;
  }, [key, path]);

  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#050A18]">
      <AnimatePresence mode="popLayout" initial={false} custom={custom}>
        <motion.div
          key={key}
          custom={custom}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          className="min-h-screen w-full"
        >
          {/* location is passed so the page that is leaving keeps rendering */}
          <Routes location={location}>{children}</Routes>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}